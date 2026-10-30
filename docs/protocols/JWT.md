# JOSE and JWT (JSON Web Tokens)

*Signed or encrypted JSON small enough for a URL or an HTTP header: OpenID
Connect ID tokens, OAuth access tokens, ACME requests. There is no handshake.
Each token names its own algorithm in a small header, so the receiver, not
the sender, has to decide what it accepts.*

**Standard:** JWS (RFC 7515), JWE (RFC 7516), JWK (RFC 7517), JWA (RFC 7518)
and JWT (RFC 7519), all May 2015; Ed25519 and X25519 keys in RFC 8037 (2017);
best practices in RFC 8725 (2020); fully specified names such as `Ed25519` in
RFC 9864 (2025); ML-DSA in RFC 9964 (2026). **Implementations:** panva's
`jose` and Auth0's `jsonwebtoken` (JavaScript), PyJWT, joserfc and jwcrypto
(Python), Nimbus JOSE+JWT (Java), go-jose (Go), `jsonwebtoken` (Rust),
Microsoft.IdentityModel (.NET).

## One token, one algorithm per category

Real output from `jose` 13, latchset's C tool (the Ubuntu 24.04 package), in a
Linux container, Oct 2026. The inputs are the RFCs' own examples, with the keys
the RFCs print: the signed JWT of RFC 7519 §3.1 (the same token as RFC 7515
Appendix A.1) and the encrypted message of RFC 7516 Appendix A.1.

```
$ cut -d. -f1 rfc7519.jwt | jose b64 dec -i-
{"typ":"JWT",
 "alg":"HS256"}
$ jose jws ver -i rfc7519.jwt -k rfc7515-a1.jwk -O-
{"iss":"joe",
 "exp":1300819380,
 "http://example.com/is_root":true}
$ cut -d. -f1 rfc7516-a1.jwe | jose b64 dec -i-
{"alg":"RSA-OAEP","enc":"A256GCM"}
$ jose jwe dec -i rfc7516-a1.jwe -k rfc7516-a1.jwk
The true sign of intelligence is not knowledge but imagination.
```

| JOSE name | Category | Algorithm inside |
|---|---|---|
| `HS256` | [MAC](../index.md#6-mac) | [HMAC](../06-mac/HMAC.md)-SHA-256 over `header.payload` as sent (still base64url); the 32-byte tag is the third part |
| `RS256`, `PS256` | [Signature](../index.md#2-digital-signatures) | [RSA](../02-signatures/RSA.md) PKCS#1 v1.5 or PSS with SHA-256; RS256 is the OpenID Connect default |
| `ES256` | [Signature](../index.md#2-digital-signatures) | [ECDSA](../02-signatures/ECDSA.md) on P-256 with SHA-256, sent as 64 bytes: r then s |
| `Ed25519` (was `EdDSA`) | [Signature](../index.md#2-digital-signatures) | [Ed25519](../02-signatures/EdDSA.md) with an `OKP` key (RFC 8037) |
| `RSA-OAEP` | [Public-key encryption](../index.md#3-public-key-encryption) | [RSA](../02-signatures/RSA.md)-OAEP with SHA-1 and MGF1-SHA-1 encrypts the random content key (CEK), 256 bits for `A256GCM` |
| `ECDH-ES` | [Key exchange](../index.md#1-key-exchange) | [ECDH](../01-key-exchange/ECDH.md#ecdh-on-the-nist-curves) between a fresh sender key (`epk` in the header) and the recipient's P-256, P-384, P-521 or X25519 key |
| `A256KW`, `dir` | [Key wrap](../index.md#5-cipher-modes-and-aead) | [AES key wrap](../05-modes-aead/Key-Wrap.md) of the CEK under a shared key; `dir` uses the shared key as the CEK |
| `A256GCM` | [Cipher](../index.md#5-cipher-modes-and-aead) | [AES](../04-symmetric-ciphers/AES.md)-256 in [GCM](../05-modes-aead/AEAD.md#aes-gcm), 96-bit IV, 128-bit tag; the encoded header is the AAD |
| `A128CBC-HS256` | [Cipher](../index.md#5-cipher-modes-and-aead) and [MAC](../index.md#6-mac) | AES-128 in [CBC](../05-modes-aead/Classic-Modes.md#cbc), then HMAC-SHA-256 cut to 16 bytes; the 32-byte key is half MAC key, half AES key |
| Concat KDF | [KDF](../index.md#8-key-derivation-and-password-hashing) | the [one-step KDF](../08-kdf-password-hashing/NIST-KDFs.md#one-step-kdf-sp-800-56c) with SHA-256 turns the ECDH secret into a key |
| `PBES2-HS256+A128KW` | [KDF](../index.md#8-key-derivation-and-password-hashing) | [PBKDF2](../08-kdf-password-hashing/PBKDF2.md)-HMAC-SHA-256 from a password (salt `p2s`, count `p2c`), then AES key wrap |
| `256` in the names, `kid` | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md); a JWK thumbprint (RFC 7638) is the SHA-256 of a key's required fields, often used as its `kid` |

**Who picks the algorithm?** In SSH and TLS the two sides negotiate. A token
can't: the issuer writes `alg` (and `enc` for JWE) into the header, and the
receiver reads it before anything is verified. The header is a claim, not an
instruction. The verifier must know which algorithm each key is for and refuse
the rest (RFC 7515 §5.2, RFC 8725 §3.1). The best-known JWT bugs come from
libraries that let the header decide.

## How a token is made and checked

1. **Keys.** The issuer publishes its public keys as a JWK Set (RFC 7517),
   usually at a `jwks_uri`. Each key has a type (`RSA`, `EC`, `oct`, `OKP`,
   and `AKP` for ML-DSA), a `kid` and ideally an `alg`.
2. **Header and claims.** The issuer writes a header (`alg`, `kid`, `typ`)
   and the claims: `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`
   (RFC 7519 §4.1). Both are JSON, base64url-encoded without padding.
3. **Signing (JWS).** The signature or MAC covers the two encoded parts joined
   by a dot and becomes the third part: `header.payload.signature`. Anyone can
   still read the claims; the signature only stops changes.
4. **Encryption (JWE).** A random CEK encrypts the payload under `enc`, with
   the encoded header as associated data (RFC 7516 §5.1); `alg` gets the CEK to
   the recipient. Five parts: `header.key.iv.ciphertext.tag`. For both, sign
   first, then encrypt the signed JWT (`"cty":"JWT"`, RFC 7519 §11.2).
5. **Verifying.** The receiver finds the key by `kid`, checks that `alg` is
   allowed for that key, checks the signature or decrypts, and only then reads
   the claims: `exp` and `nbf` against its clock, `iss` and `aud` against what
   it expects (RFC 7519 §7.2, RFC 8725 §3.8–3.9).

**Where it runs.** OpenID Connect providers MUST support RS256 for ID tokens
(OIDC Core §15.1), and it is the default when a client names nothing (OIDC
Registration §2). OAuth access tokens as JWTs (RFC 9068, 2021) must be signed,
never with `none`, and servers must support RS256. ACME (RFC 8555, 2019), the
protocol Let's Encrypt speaks, wraps each request body in a JWS; servers MUST
implement ES256 and SHOULD implement EdDSA with Ed25519 (§6.2).

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Key management (JWE `alg`) | `ECDH-ES`, `ECDH-ES+A128KW` / `+A256KW` (P-256, X25519), `RSA-OAEP-256`, `RSA-OAEP`, `A128KW`, `A256KW`, `dir` | RFC 7518 §4, RFC 8037 | `RSA1_5`: RFC 8725 says avoid; a JOSE draft deprecates it |
| Key management, new | `HPKE-0` to `HPKE-7` and their `-KE` forms, DH-based KEMs only | IETF draft (jose-hpke-encrypt-22, July 2026) | — |
| Signature | `RS256`, `ES256`, `PS256`, `Ed25519`, `ES384`, `ES512`, `ES256K` | RFC 7518 §3, RFC 9864, RFC 8812 | `EdDSA` (deprecated by RFC 9864); `none` (being deprecated) |
| Signature, post-quantum | `ML-DSA-44`, `ML-DSA-65`, `ML-DSA-87`, key type `AKP` | RFC 9964 (2026) | — |
| Content encryption (`enc`) | `A256GCM`, `A128GCM`, `A128CBC-HS256`, `A256CBC-HS512` | RFC 7518 §5 | — |
| MAC | `HS256`, `HS384`, `HS512`; HMAC inside the CBC modes | RFC 7518 §3.2, §5.2 | keys shorter than the hash (MUST NOT, RFC 7518 §3.2); passwords as keys |
| Hash | SHA-256/384/512 named in each `alg`; SHA-256 thumbprints | FIPS 180-4, RFC 7638 | SHA-1 inside `RSA-OAEP` padding; `RSA-OAEP-256` uses SHA-256 |
| KDF | Concat KDF with SHA-256 for ECDH-ES; PBKDF2 for `PBES2-*` | SP 800-56A, RFC 8018 | small `p2c` (RFC 7518 recommends at least 1,000) |

RFC 7519 §8 made `HS256` and `none` mandatory to implement, and `RSA1_5` for
encryption; two of the three are now on the way out. RFC 9864 deprecated the
polymorphic `EdDSA` (the key's `crv` picks the curve) for `Ed25519` and
`Ed448`. panva's `jose` takes both names; PyJWT 2.15.1 knows only `EdDSA`.

**Post-quantum.** RFC 9964 adds ML-DSA with a new key type, `AKP`, whose
private part is just the 32-byte seed; panva's `jose` has had it since 6.1.0
(August 2025). An ML-DSA-44 signature is 2,420 bytes (3,227 base64url
characters, against 86 for ES256) in every request that carries the token.
SLH-DSA and composite signatures are drafts. JWE has no post-quantum key
management yet.

## Known attacks

Mostly library mistakes, not broken algorithms. RFC 8725 lists them; "bis"
marks additions in its replacement, draft-ietf-oauth-rfc8725bis (-10, 2026).

| Attack | What goes wrong | Fix |
|---|---|---|
| `alg: none` | an unsigned token passes because its header says so; bis adds `"noNE"` getting past a blocklist in a library that read `alg` case-insensitively | never by default (RFC 7518 §3.6, RFC 8725 §3.2); an allowlist |
| RS256 to HS256 | the attacker MACs a token with the server's public RSA key as the HMAC secret (McLean, 2015; CVE-2015-9235) | one key, one algorithm (RFC 8725 §3.1) |
| weak HS256 secret | one captured token allows offline guessing | a random key at least as long as the hash (RFC 8725 §3.5) |
| ECDSA encoding | JWS wants r and s at fixed width, 64 bytes for ES256, not the DER that OpenSSL and Java produce | reject any other length (RFC 7518 §3.4); deterministic ECDSA (RFC 8725 §3.2) |
| `RSA1_5` | PKCS#1 v1.5 padding errors let an attacker decrypt the CEK (Bleichenbacher, 1998) | RSA-OAEP (RFC 8725 §3.2); panva's `jose` dropped `RSA1_5` in 6.0.0 (February 2025) |
| invalid curve | JWEs with `epk` points off the curve, and what they decrypt to, reveal the private key (Sanso, 2017) | validate every point (RFC 8725 §2.5, §3.4) |
| PBES2 `p2c` | the sender picks the PBKDF2 count, and a huge one stalls the receiver | bis: reject above 1,200,000, twice OWASP's 600,000; panva's `jose` stops at 10,000 |

## Seeing it on your machine

On Debian or Ubuntu, `apt install jose` gives the tool used above:

```
jose alg                                       # every alg and enc value it knows
jose jwk gen -i '{"alg":"ES256"}' -o ec.jwk    # new P-256 key pair as a JWK
jose jwk pub -i ec.jwk -o ec.pub.jwk           # public half, for verifiers
printf '{"sub":"alice"}' | jose jws sig -I- -k ec.jwk -c -o es256.jwt
jose jws ver -i es256.jwt -k ec.pub.jwk -O-    # prints the payload if it verifies
jose jwk thp -i ec.pub.jwk                     # RFC 7638 thumbprint, a good kid
jose jwk gen -i '{"alg":"ECDH-ES+A128KW"}' -o ecdh.jwk
printf 'hello' | jose jwe enc -I- -k ecdh.jwk -c -o msg.jwe
jose jwe dec -i msg.jwe -k ecdh.jwk            # enc defaulted to A128CBC-HS256
```

- **Python:** paste a token, or press Enter twice for the RFC 7519 example and
  the key from RFC 7515 Appendix A.1. For a JWE it prints the part sizes.

```python
import base64, hashlib, hmac, json

def b64(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

tok = input("JWT: ").strip() or (
    "eyJ0eXAiOiJKV1QiLA0KICJhbGciOiJIUzI1NiJ9."
    "eyJpc3MiOiJqb2UiLA0KICJleHAiOjEzMDA4MTkzODAsDQogImh0dHA6Ly9leGFtcGxlLmNvbS9pc19yb290Ijp0cnVlfQ."
    "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
parts = tok.split(".")
head = json.loads(b64(parts[0]))
print("header   ", json.dumps(head))
if len(parts) == 5:                      # JWE: header.key.iv.ciphertext.tag
    print("sizes    ", [len(b64(x)) for x in parts[1:]])
else:                                    # JWS: header.payload.signature
    print("claims   ", json.dumps(json.loads(b64(parts[1]))))
    sig = b64(parts[2])
    print("signature", len(sig), "bytes")
    if head["alg"] == "HS256":
        k = b64(input("key (JWK k): ").strip() or
                "AyM1SysPpbyDfgZld3umj1qzKObwVMkoqQ-EstJQLr_T-1qS0gZH75aKtMN3Yj0iPS4hcgUuTwjAzZr1Z9CAow")
        mac = hmac.new(k, (parts[0] + "." + parts[1]).encode(), hashlib.sha256).digest()
        print("computed ", base64.urlsafe_b64encode(mac).rstrip(b"=").decode())
        print("valid    ", hmac.compare_digest(mac, sig))
```

```
header    {"typ": "JWT", "alg": "HS256"}
claims    {"iss": "joe", "exp": 1300819380, "http://example.com/is_root": true}
signature 32 bytes
computed  dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
valid     True
```

The MAC matches RFC 7515 Appendix A.1, yet a real verifier would reject the
token: `exp` 1300819380 is 22 March 2011. The RFC 7516 example gives `sizes
[256, 12, 63, 16]`: one 2048-bit RSA block, GCM's IV, 63 bytes for 63 of text,
and the tag. The ES256 token from `jose` has a 64-byte signature.

## See also

- [TLS 1.3](TLS-1.3.md) / [SSH](SSH.md): protocols that negotiate algorithms; a JWT can only announce one
- [PKI](PKI.md): X.509 certificates; a JWK is a bare key, though `x5c` can carry a chain
- [FIDO2](FIDO2.md): passkeys name their algorithms in COSE, JOSE's CBOR sibling, with the same ES256 and EdDSA names
- [HMAC](../06-mac/HMAC.md) / [ECDSA](../02-signatures/ECDSA.md) / [Key wrap](../05-modes-aead/Key-Wrap.md) / [ML-DSA](../02-signatures/ML-DSA.md): the algorithms in depth
- [NIST KDFs](../08-kdf-password-hashing/NIST-KDFs.md): computes RFC 7518's ECDH-ES key derivation example

## References

- [RFC 7515: JSON Web Signature](https://www.rfc-editor.org/rfc/rfc7515) (Section 5.2, Appendix A.1) / [RFC 7516: JSON Web Encryption](https://www.rfc-editor.org/rfc/rfc7516) (Section 5.1, Appendix A.1) / [RFC 7517: JSON Web Key](https://www.rfc-editor.org/rfc/rfc7517)
- [RFC 7518: JSON Web Algorithms](https://www.rfc-editor.org/rfc/rfc7518) (Sections 3–5) / [RFC 7519: JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519) (Sections 3.1, 4.1, 7.2, 8, 11.2)
- [RFC 7520: JOSE examples](https://www.rfc-editor.org/rfc/rfc7520) / [RFC 7638: JWK Thumbprint](https://www.rfc-editor.org/rfc/rfc7638) / [RFC 8037: EdDSA and X25519 in JOSE](https://www.rfc-editor.org/rfc/rfc8037) / [RFC 8812: ES256K](https://www.rfc-editor.org/rfc/rfc8812)
- [RFC 8725: JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725) / [draft-ietf-oauth-rfc8725bis](https://datatracker.ietf.org/doc/draft-ietf-oauth-rfc8725bis/) ([source, -10](https://github.com/oauth-wg/draft-ietf-oauth-rfc8725bis)) / [draft-ietf-jose-deprecate-none-rsa15](https://datatracker.ietf.org/doc/draft-ietf-jose-deprecate-none-rsa15/)
- [RFC 9864: Fully-Specified Algorithms for JOSE and COSE](https://www.rfc-editor.org/rfc/rfc9864) / [RFC 9964: ML-DSA for JOSE and COSE](https://www.rfc-editor.org/rfc/rfc9964) / [draft-ietf-jose-hpke-encrypt](https://datatracker.ietf.org/doc/draft-ietf-jose-hpke-encrypt/) / [draft-ietf-cose-sphincs-plus](https://datatracker.ietf.org/doc/draft-ietf-cose-sphincs-plus/) / [draft-ietf-jose-pq-composite-sigs](https://datatracker.ietf.org/doc/draft-ietf-jose-pq-composite-sigs/) / [draft-ietf-jose-pqc-kem](https://datatracker.ietf.org/doc/draft-ietf-jose-pqc-kem/)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) (Section 15.1) / [OpenID Connect Registration 1.0](https://openid.net/specs/openid-connect-registration-1_0.html) (Section 2) / [RFC 9068: JWT access tokens](https://www.rfc-editor.org/rfc/rfc9068) / [RFC 8555: ACME](https://www.rfc-editor.org/rfc/rfc8555) (Section 6.2)
- [panva/jose](https://github.com/panva/jose) (`src/lib/jws_algorithms.ts`, `src/types.d.ts`, `CHANGELOG.md` 6.0.0 and 6.1.0) / [PyJWT `jwt/algorithms.py`](https://github.com/jpadilla/pyjwt/blob/master/jwt/algorithms.py) / [latchset jose](https://github.com/latchset/jose)

*Weaker sources:* web search results for the year of RFC 9964 (2026) and for
the state of draft-ietf-jose-pqc-kem.
