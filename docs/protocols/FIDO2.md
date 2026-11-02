# FIDO2, WebAuthn and passkeys

*Logging in with a key pair instead of a password. The private key stays in an
authenticator (a security key, or the phone or laptop itself), and every
signature covers the site's domain as the browser saw it, so a signature a
phishing page collects is no use on the real site.*

**Standard:** W3C Web Authentication (WebAuthn) Level 1 (March 2019), Level 2
(April 2021) and Level 3 (Recommendation, August 2026); FIDO Alliance Client to
Authenticator Protocol (CTAP) 2.0 (2017), 2.1 (2021), 2.2 (2025) and 2.3
(February 2026). FIDO2 is the pair; FIDO U2F (2014) lives on as CTAP1.
Algorithms are COSE numbers (RFC 9053, 2022, after RFC 8152; RS256 in RFC 8812).
**Implementations:** Chrome 67, Firefox 60, Edge 18, Safari 13 and later;
Windows Hello, iCloud Keychain, Google Password Manager; YubiKey and other
security keys; libfido2 and python-fido2 (Yubico), SimpleWebAuthn, webauthn4j.

## One login, one algorithm per category

Real output from Chromium 153.0.8010.12 (Playwright 1.63's headless build) on
Ubuntu 24.04 in a container, Oct 2026, with the DevTools Protocol's virtual
authenticator (CTAP2, USB, discoverable credentials) instead of a real key. A
page on `http://localhost:8080`, a secure context, called
`navigator.credentials.create()` (RP ID `localhost`, `attestation: "direct"`),
then `get()`, with fixed, readable challenges. The virtual key reports the user
verified without a PIN, so the PIN/UV rows below don't run. Decoded and trimmed:

```
create: fmt packed, attStmt alg -7, x5c C=US, O=Chromium, OU=Authenticator Attestation, CN=Batch Certificate
  alg -7, credentialPublicKey {1: 2, 3: -7, -1: 1, -2: 32 bytes, -3: 32 bytes}
  flags 0x45, signCount 1, AAGUID 01020304050607080102030405060708, credential ID 32 bytes
  clientDataJSON {"type":"webauthn.create","challenge":"cmVnaXN0ZXItY2hhbGxlbmdlLTAwMDE","origin":"http://localhost:8080","crossOrigin":false}
get:    flags 0x05, signCount 2, userHandle alice-0001, signature 72 bytes (DER)
  clientDataJSON {"type":"webauthn.get","challenge":"bG9naW4tY2hhbGxlbmdlLTAwMDE","origin":"http://localhost:8080","crossOrigin":false}
```

| WebAuthn / CTAP name | Category | Algorithm inside |
|---|---|---|
| `alg -7` (ES256) | [Signature](../index.md#2-digital-signatures) | [ECDSA](../02-signatures/ECDSA.md) on P-256 (`1: 2`, `-1: 1` in the COSE key) with SHA-256 over the authenticator data and the client data hash; DER-encoded, usually 70 to 72 bytes, not JOSE's fixed 64 |
| `fmt packed`, `x5c` | [Signature](../index.md#2-digital-signatures) | attestation: a key shared by a batch of one model signs the new authenticator data and client data hash, and sends its certificate |
| `rpIdHash`, client data hash | [Hash](../index.md#7-hash-functions) | [SHA-256](../07-hash/SHA-2.md) of the RP ID opens the authenticator data; SHA-256 of `clientDataJSON` is signed with it |
| PIN/UV auth protocol | [Key exchange](../index.md#1-key-exchange) | [ECDH](../01-key-exchange/ECDH.md#ecdh-on-the-nist-curves) P-256 between a fresh browser key and the authenticator's key |
| PIN/UV auth protocol 2 | [KDF](../index.md#8-key-derivation-and-password-hashing) | [HKDF](../08-kdf-password-hashing/HKDF.md)-SHA-256 (zero salt, info `CTAP2 HMAC key` and `CTAP2 AES key`); protocol 1 takes SHA-256 of the shared x |
| PIN/UV auth protocol | [Cipher](../index.md#4-symmetric-ciphers) | [AES](../04-symmetric-ciphers/AES.md)-256 in [CBC](../05-modes-aead/Classic-Modes.md#cbc) for the PIN hash and secrets; random IV in protocol 2, all-zero IV in protocol 1 |
| `pinUvAuthParam` | [MAC](../index.md#6-mac) | [HMAC](../06-mac/HMAC.md)-SHA-256 under the PIN token, cut to 16 bytes in protocol 1 |
| `hmac-secret`, `prf` | [MAC](../index.md#6-mac) | HMAC-SHA-256 with a random 32-byte secret kept per credential, over a salt; `prf` (Level 3) makes the salt the SHA-256 of `WebAuthn PRF`, a zero byte and the site's input; the output can unlock encrypted data |

**Why -7 and not -9?** RFC 9864 (October 2025) marked COSE's ES256 (-7) and
EdDSA (-8) Deprecated, as the key, not the number, names the curve, and added
ESP256 (-9) and Ed25519 (-19). WebAuthn already ties -7 to P-256 and -8 to
Ed25519 (§5.8.5) and calls -9 and -19 NOT RECOMMENDED, as many authenticators
don't know them; Chromium 153 refused a request offering only one of them.
JOSE's `ES256` always meant P-256, so there only `EdDSA` went ([JWT](JWT.md)).

## How a login works

1. **Options.** The site (the relying party) sends a random challenge (at
   least 16 bytes, §13.5.3), its RP ID (a domain), a user handle (an opaque
   ID, at most 64 bytes) and the algorithms it takes, best first.
2. **New key pair.** After a touch (UP) and, if asked, a PIN or biometric
   (UV), the authenticator makes a key pair for that RP ID and returns
   authenticator data: rpIdHash, flags, counter, AAGUID (the model), credential
   ID and COSE public key, signed by a model key if attestation was asked for.
3. **Client data.** The browser writes `clientDataJSON`: type, challenge and
   the origin it loaded. The site checks these, the rpIdHash and the flags,
   then stores the credential ID, key and counter (§7.1).
4. **Login.** For a new challenge the authenticator signs authenticator data
   `||` SHA-256(`clientDataJSON`); the site checks fields and signature (§7.2).
   A discoverable credential (a passkey, in the spec's words too) also returns
   the user handle, so nobody types a user name.
5. **Counter.** `signCount` should rise with each signature; one that goes
   backwards hints at a clone (§6.1.1). A credential on several devices can't
   keep one counter, and Apple's and Google's synced passkeys send 0.

**Why passkeys resist phishing.** The browser, not the page, writes the origin,
and refuses an RP ID that isn't the page's domain or a parent short of a public
suffix. A credential only answers for its rpIdHash, so a look-alike domain gets
nothing, and an assertion relayed from it names the wrong origin.

**Synced or device-bound.** Level 3 added the BE (may be backed up) and BS (is
backed up) flags; a security key's credentials are device-bound. Apple, Google,
Microsoft (Edge, since late 2025), 1Password and Bitwarden sync passkeys. FIDO's
Credential Exchange Format (CXF 1.0, August 2025) moves them between providers,
its protocol still a draft; iOS 26 added passkey import and export.

## Algorithms by category

| Category | In use | Standard | Legacy or retired |
|---|---|---|---|
| Signature (credential) | ES256 (-7) nearly everywhere; EdDSA (-8, Ed25519) on some security keys; RS256 (-257) from some Windows Hello TPM keys | WebAuthn §5.8.5, RFC 9053, RFC 8812 | — |
| Signature, fully specified | ESP256 (-9), Ed25519 (-19): NOT RECOMMENDED by WebAuthn, which keeps -7 and -8 though COSE now marks them Deprecated | RFC 9864 | — |
| Signature, post-quantum | ML-DSA-44, -65, -87 (-48, -49, -50): no browser or security key ships them | RFC 9964 | — |
| Attestation | **None:** `none` (default)<br>**Device formats:** `packed`, `tpm`, `apple`, `android-key`<br>**Several at once:** `compound` (Level 3) | WebAuthn §8 | `fido-u2f`; `android-safetynet` (deprecated in Level 3) |
| Key exchange | ECDH P-256 (PIN/UV protocols, `hmac-secret`) | CTAP | — |
| Phone as authenticator (hybrid) | Noise NKpsk0 or KNpsk0 with P-256, AES-256-GCM, SHA-256 (Chromium) | CTAP 2.2 | — |
| Cipher | AES-256-CBC, random IV (protocol 2) | CTAP | all-zero IV (protocol 1) |
| MAC | HMAC-SHA-256: PIN token, `hmac-secret`, PRF | CTAP, WebAuthn §10.1.4 | HMAC-SHA-256 cut to 16 bytes (protocol 1) |
| Hash | SHA-256: rpIdHash, client data hash, PIN hash | FIPS 180-4 | — |
| KDF | HKDF-SHA-256 (protocol 2) | RFC 5869 | SHA-256 of the ECDH x (protocol 1) |
| U2F / CTAP1 | ECDSA P-256 only, an AppID instead of an RP ID; WebAuthn's `appid` extension still accepts these keys | FIDO U2F 1.2 (2017) | — |

**Post-quantum.** Not yet. RFC 9964 (May 2026) gave ML-DSA COSE numbers, but
WebAuthn Level 3 doesn't mention them and Chromium 153 refused -48 and -49 (its
main branch has them in the virtual authenticator). 1Password announced ML-DSA
passkeys in October 2026. An ML-DSA-44 signature is 2,420 bytes; ES256's is about 70.

## Seeing it on your machine

With a security key and libfido2's tools (`apt install fido2-tools`); without
one, the WebAuthn tab in Chrome's DevTools adds a virtual authenticator:

```
fido2-token -L                                 # FIDO devices the OS sees (none in a container)
fido2-token -I /dev/hidraw0                    # CTAP versions, algorithms, extensions, PIN protocols
fido2-token -L -r /dev/hidraw0                 # sites with passkeys on the key (asks for the PIN)
fido2-cred -M -r -i cred_param /dev/hidraw0 | fido2-cred -V -o cred   # new passkey; input format in fido2-cred(1)
fido2-assert -G -i assert_param /dev/hidraw0 | fido2-assert -V pubkey es256
ssh-keygen -t ed25519-sk                       # an SSH key held by the security key
```

- **Python:** a server's first checks on a login, then the exact bytes the
  authenticator signed. Press Enter three times for the run above.

```python
import base64, hashlib, json

def decode(s):                          # hex, as in the spec's test vectors, or base64url
    try:
        return bytes.fromhex(s)
    except ValueError:
        return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

rp_id = input("RP ID: ") or "localhost"
auth = decode(input("authenticatorData: ") or "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAg")
cdj = decode(input("clientDataJSON: ") or
             "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiYkc5bmFXNHRZMmhoYkd4bGJtZGxMVEF3TURFIiwi"
             "b3JpZ2luIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwIiwiY3Jvc3NPcmlnaW4iOmZhbHNlfQ")
print("rpIdHash ", auth[:32].hex()[:16] + "...", auth[:32] == hashlib.sha256(rp_id.encode()).digest())
names = {0: "UP", 2: "UV", 3: "BE", 4: "BS", 6: "AT", 7: "ED"}   # flag bits, WebAuthn section 6.1
print("flags    ", hex(auth[32]), [n for bit, n in names.items() if auth[32] >> bit & 1])
print("signCount", int.from_bytes(auth[33:37], "big"))
cd = json.loads(cdj)
print("client   ", cd["type"], cd["origin"], decode(cd["challenge"]))
signed = auth + hashlib.sha256(cdj).digest()                   # the bytes ES256 signs
print("signed   ", len(signed), "bytes, SHA-256", hashlib.sha256(signed).hexdigest())
```

```
rpIdHash  49960de5880e8c68... True
flags     0x5 ['UP', 'UV']
signCount 2
client    webauthn.get http://localhost:8080 b'login-challenge-0001'
signed    69 bytes, SHA-256 fae2b91eddb2860fdd2e777eb4d6e479a1b0507590401de1a19bc91340702ed7
```

The ECDSA check itself needs `pip install cryptography`. Given `example.org` and
the hex values of WebAuthn Level 3 §16.2, the script prints flags 0x19 (UP, BE,
BS) and signCount 0, as a synced passkey would, and the spec's signature
verifies over those 69 bytes with the key from its registration.

## See also

- [SSH](SSH.md): `sk-ssh-ed25519@openssh.com` keys, a FIDO credential used for SSH logins
- [Disk encryption](Disk-Encryption.md): `hmac-secret` unlocking LUKS2 through systemd-cryptenroll
- [JOSE / JWT](JWT.md): the same algorithms with JSON names; RFC 9864 and RFC 9964 cover both
- [TOTP](TOTP.md): one-time codes, which a phishing page can relay; a passkey login it can't
- [ECDSA](../02-signatures/ECDSA.md) / [ECDH](../01-key-exchange/ECDH.md#ecdh-on-the-nist-curves) / [HKDF](../08-kdf-password-hashing/HKDF.md) / [ML-DSA](../02-signatures/ML-DSA.md): the algorithms in depth

## References

- [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/) (Sections 5.8.5, 6.1, 6.1.1, 6.1.3, 7.1, 7.2, 8, 10.1.4, 13.5.3, 16) / [spec source, `index.bs`](https://github.com/w3c/webauthn) / [Level 2](https://www.w3.org/TR/2021/REC-webauthn-2-20210408/) / [Level 1](https://www.w3.org/TR/2019/REC-webauthn-1-20190304/)
- [FIDO CTAP 2.3](https://fidoalliance.org/specs/fido-v2.3-ps-20260226/fido-client-to-authenticator-protocol-v2.3-ps-20260226.html) / [CTAP 2.2](https://fidoalliance.org/specs/fido-v2.2-ps-20250228/fido-client-to-authenticator-protocol-v2.2-ps-20250228.html) / [CTAP 2.1](https://fidoalliance.org/specs/fido-v2.1-ps-20210615/fido-client-to-authenticator-protocol-v2.1-ps-20210615.html) / [CTAP 2.0](https://fidoalliance.org/specs/fido-v2.0-ps-20170927/fido-client-to-authenticator-protocol-v2.0-ps-20170927.html) / [U2F 1.2 JavaScript API](https://fidoalliance.org/specs/fido-u2f-v1.2-ps-20170411/fido-u2f-javascript-api-v1.2-ps-20170411.html) / [U2F raw message formats](https://fidoalliance.org/specs/fido-u2f-v1.1-id-20160915/fido-u2f-raw-message-formats-v1.1-id-20160915.html) / [CXF 1.0](https://fidoalliance.org/specs/cx/cxf-v1.0-ps-20250814.html)
- [RFC 9052: COSE structures](https://www.rfc-editor.org/rfc/rfc9052) / [RFC 9053: COSE algorithms](https://www.rfc-editor.org/rfc/rfc9053) / [RFC 8152](https://www.rfc-editor.org/rfc/rfc8152) / [RFC 8812: RS256 and ES256K](https://www.rfc-editor.org/rfc/rfc8812) / [RFC 9864: fully specified algorithms](https://www.rfc-editor.org/rfc/rfc9864) / [RFC 9964: ML-DSA for JOSE and COSE](https://www.rfc-editor.org/rfc/rfc9964)
- [python-fido2](https://github.com/Yubico/python-fido2) (`fido2/ctap2/pin.py`, `fido2/ctap2/extensions.py`, `NEWS`) / [libfido2](https://github.com/Yubico/libfido2) (`src/ecdh.c`, `man/fido2-cred.1`, `man/fido2-token.1`, `NEWS`)
- [Chromium `device/fido`](https://github.com/chromium/chromium/tree/main/device/fido) (`cable/noise.cc`, `virtual_fido_device.cc`, `public/fido_constants.h`) / [DevTools Protocol WebAuthn domain](https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/) / [MDN browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/api/PublicKeyCredential.json)

*Weaker sources:* web search summaries for Apple's and Google's signCount 0
(developer blogs), Microsoft's passkey sync in Edge (Neowin, Paubox), RS256
from Windows Hello (an archived Microsoft guide, a WebAuthn list post), iOS 26
passkey export (9to5Mac), 1Password's ML-DSA passkeys (its blog, unreachable
here), the CXF 1.0 date (an EU wallet GitHub issue) and U2F's 2014 date.
