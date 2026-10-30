# ECIES (Elliptic Curve Integrated Encryption Scheme)

*How to encrypt to an elliptic-curve key: a one-time ECDH key, a KDF, then a
symmetric cipher and a MAC. Several standards, many options, and two
implementations rarely interoperate.*

**Status and standards:** see [Public-key encryption](../index.md#3-public-key-encryption)
in the main table.

## What it is

ECIES is the elliptic-curve form of DHIES, which Abdalla, Bellare and Rogaway
published as DHAES in 1999 and analyzed at CT-RSA 2001. It fixes the problems
of [ElGamal](ElGamal.md): instead of multiplying the message by the
Diffie-Hellman secret, it hashes the secret into keys for a cipher and a MAC.
Messages can be any length, the overhead is one point plus a tag, and the MAC
stops chosen-ciphertext tampering.

It was standardized several times, each with its own menu:

| Standard | Year | Notes |
|---|---|---|
| SEC 1 | 2000, v2.0 2009 | X9.63 or NIST concatenation KDF; XOR, 3DES-CBC, AES-CBC or AES-CTR; HMAC or CMAC |
| ANSI X9.63 | 2001 | US financial standard; defines the X9.63 KDF most profiles use |
| IEEE 1363a | 2004 | amendment to IEEE 1363-2000 |
| ISO/IEC 18033-2 | 2006 | split into ECIES-KEM plus a separate DEM (cipher and MAC) |

## How it works

The recipient has a key pair `(d, Q = d·G)`. To encrypt `M` (SEC 1 form):

1. Pick a fresh ephemeral key `k` and compute `R = k·G`.
2. The shared secret `Z` is the x coordinate of `k·Q`.
3. Run `Z` through the KDF and split the output into an encryption key `EK`
   and a MAC key `MK`.
4. Encrypt `EM = ENC(EK, M)` and compute the tag `D = MAC(MK, EM)`.
5. Send `R ‖ EM ‖ D`.

The recipient computes `d·R`, the same point, derives the same keys, checks
the tag and only then decrypts. Each key encrypts one message, so SEC 1 even
uses a zero IV for CBC and CTR. The extra bytes are one point (32 for
X25519, 33 or 65 for P-256) and a tag, where ElGamal doubles the message.

**Variants.** Every step is an option: KDF, cipher and MAC, plain or
cofactor Diffie-Hellman, compressed points or not, and whether `R` goes into
the KDF. ISO 18033-2 hashes `R` in by default. SEC 1 hashes only `Z` (plus
optional shared info), which leaves what it calls benign malleability:
re-encoding `R`, say compressed instead of uncompressed, gives a second valid
ciphertext of the same message. Newer variants swap the cipher and MAC for
one AEAD such as AES-GCM. Two products that both "do ECIES" usually can't
read each other's messages.

## When to use it

- **New designs: use [HPKE](HPKE.md).** RFC 9180 was written because the
  ECIES variants don't interoperate, and some use outdated primitives, lack a
  chosen-ciphertext proof or have no test vectors.
- **Where a profile already fixes every option,** ECIES is fine:
    - **5G:** the phone encrypts its permanent subscriber ID to the home
      network's key, so it never crosses the air in the clear (the result is
      the SUCI). 3GPP TS 33.501 Annex C fixes Profile A (X25519) and Profile B
      (P-256 with compressed points), both with the X9.63 KDF over SHA-256,
      AES-128-CTR and HMAC-SHA-256 cut to 8 bytes.
    - **Ethereum:** the RLPx handshake between nodes encrypts its first two
      messages with ECIES on secp256k1 (NIST concatenation KDF, AES-128-CTR,
      HMAC-SHA-256).
    - **Apple platforms:** the Security framework has ECIES modes such as
      `eciesEncryptionCofactorVariableIVX963SHA256AESGCM`.
    - **Google Tink** still supports ECIES key types based on ISO 18033-2,
      but marks them no longer recommended and points to HPKE.

## Example (Python)

An ECIES-style scheme in the AEAD shape: X25519, HKDF-SHA256 with `R` and
the recipient key in the info string, and AES-128-GCM. Needs PyCA
`cryptography` (`pip install cryptography`). Run with version 50.0.1 on
Python 3.13, it prints `53 b'hello'`.

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

def kdf(z, R, Q):
    return HKDF(algorithm=hashes.SHA256(), length=16, salt=None, info=R + Q).derive(z)

def encrypt(pub, m):
    e = X25519PrivateKey.generate()                    # fresh for every message
    R = e.public_key().public_bytes_raw()
    key = kdf(e.exchange(pub), R, pub.public_bytes_raw())
    return R + AESGCM(key).encrypt(bytes(12), m, None)  # one key, one message: zero nonce is fine

def decrypt(priv, c):
    R = c[:32]
    key = kdf(priv.exchange(X25519PublicKey.from_public_bytes(R)), R,
              priv.public_key().public_bytes_raw())
    return AESGCM(key).decrypt(bytes(12), c[32:], None)

d = X25519PrivateKey.generate()
c = encrypt(d.public_key(), b"hello")
print(len(c), decrypt(d, c))   # 53 b'hello': 32-byte R + 5 + 16-byte tag
```

Each line is a choice some standard pins down differently. The
[HPKE](HPKE.md) example does the same job in three lines.

## Security notes

- Validate `R`: check it is on the curve, or use X25519 or cofactor
  Diffie-Hellman. An invalid point can leak bits of the private key through
  small-subgroup attacks.
- Hash `R` and the recipient key into the KDF, as ISO 18033-2 and HPKE do.
- Check the tag before decrypting, in constant time.
- No sender authentication: anyone with `Q` can encrypt. Sign the message if
  the sender matters.
- A quantum computer breaks it like all elliptic-curve schemes; see the
  post-quantum part of [HPKE](HPKE.md).

## See also

- [ElGamal](ElGamal.md): the unhashed scheme it replaced
- [HPKE](HPKE.md): the same idea as one spec, and its successor
- [ECDH](../01-key-exchange/ECDH.md): the key agreement inside
- [HKDF](../08-kdf-password-hashing/HKDF.md) / [HMAC](../06-mac/HMAC.md) / [AEAD](../05-modes-aead/AEAD.md): the symmetric parts

## References

- [SEC 1 v2.0: Elliptic Curve Cryptography (2009)](https://www.secg.org/sec1-v2.pdf), Section 5.1 and Appendix B.4.1
- [Shoup (ed.), ISO/IEC 18033-2 final committee draft (2004)](https://shoup.net/iso/std6.pdf), Clauses 9 and 10.2
- [Abdalla, Bellare, Rogaway, "DHAES" (ePrint 1999/007)](https://eprint.iacr.org/1999/007) / ["The Oracle Diffie-Hellman Assumptions and an Analysis of DHIES" (CT-RSA 2001)](https://doi.org/10.1007/3-540-45353-9_12)
- [RFC 9180, Section 1](https://www.rfc-editor.org/rfc/rfc9180#section-1): why HPKE replaced the ECIES variants
- [3GPP TS 33.501, Annex C](https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=3169)
- [devp2p RLPx specification](https://github.com/ethereum/devp2p/blob/master/rlpx.md)
- [Tink hybrid encryption](https://developers.google.com/tink/hybrid) / [Apple SecKeyAlgorithm](https://developer.apple.com/documentation/security/seckeyalgorithm)

*Weaker sources:* the 5G profile parameters, as quoted in excerpts of
TS 33.501 and in [Thales's ECIES-for-5G notes](https://thalesdocs.com/gphsm/luna/7/docs/network/Content/sdk/using/ecies_for_5G.htm).
