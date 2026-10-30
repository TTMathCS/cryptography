# Key wrap

*AES Key Wrap (KW) and Key Wrap with Padding (KWP): encrypt one key under
another, with no nonce and a 64-bit check that the key came back intact.*

**Status and standards:** see [Cipher modes and AEAD](../index.md#5-cipher-modes-and-aead)
in the main table.

## What it is

Wrapping a key means encrypting it under a key-encryption key (KEK) so it
can be stored or sent, and checking on unwrap that the same key came back.
Keys are short and random, so the mode needs no nonce: the same key under
the same KEK always wraps to the same bytes. What it does need is
integrity, so a damaged or forged blob fails instead of loading as a wrong
key.

NIST published the AES Key Wrap Specification in November 2001, and
RFC 3394 (Schaad and Housley, 2002) is the usual reference. RFC 5649
(Housley and Dworkin, 2009) adds padding for keys whose length isn't a
multiple of 8 bytes. SP 800-38F (2012) approves both, as KW and KWP, plus
TKW, a Triple DES version for old systems. In May 2026 NIST asked for
comments on revising SP 800-38F and proposed removing TKW.

## How it works

- Split the key into 64-bit halves of a block ("semiblocks") R[1..n], with
  n ≥ 2, and set A = A6A6A6A6A6A6A6A6.
- Six passes over the key: for each R[i], B = AES(KEK, A ‖ R[i]), A = the
  top 64 bits of B XOR a step counter t, R[i] = the bottom 64 bits. t runs
  from 1 to 6n.
- The output is A ‖ R[1..n], 8 bytes longer than the key, after 6n AES
  calls (12 for a 128-bit key).
- Unwrap runs the steps backwards and checks that A came out as A6A6...
  That is the 64-bit integrity check: a random blob of the right length
  passes with probability exactly 1 in 2⁶⁴ (SP 800-38F).
- **KWP** starts A as A65959A6 followed by the key length in bytes (32
  bits), and pads the key with zero bytes to a multiple of 8. Unwrap checks
  the constant, that the length fits, and that the padding is zero. A key
  of 8 bytes or less takes a single AES call on A ‖ P.
- Limits: KW keys are 2 to 2⁵⁴ − 1 semiblocks, KWP keys up to 2³² − 1
  bytes.

Rogaway and Shrimpton (EUROCRYPT 2006) named the goal deterministic
authenticated encryption. They pointed out that KW has no security proof,
though they expected it to hold, and offered SIV (RFC 5297), which does
the job in two passes with a proof.

## Where it's used

- **CMS / S/MIME:** `id-aes128-wrap`, `id-aes192-wrap`, `id-aes256-wrap`
  (RFC 3565) for KEK, password and key-agreement recipients.
- **JWE:** `A128KW`, `A192KW`, `A256KW` (RFC 7518, Section 4.4), also inside
  `ECDH-ES+A128KW` and `PBES2-HS256+A128KW`.
- **PKCS#11:** `CKM_AES_KEY_WRAP` (KW) and `CKM_AES_KEY_WRAP_KWP` (KWP) in
  v3.1. The older `CKM_AES_KEY_WRAP_PAD` is deprecated.
- **Key import into a KMS:** Google Cloud KMS has you wrap the key with a
  one-time AES-256 key using KWP, then wrap that key with the import job's
  RSA key using RSA-OAEP. This pair is PKCS#11's `CKM_RSA_AES_KEY_WRAP`.

## When to use it

- **Storing or sending a key under another key,** when a standard or
  device expects KW or KWP: HSMs, KMS import, CMS, JWE.
- **KWP** when the key isn't a multiple of 8 bytes, such as an RSA private
  key. **KW** for AES keys.
- **In a new design,** an AEAD with a random nonce, or a SIV mode
  (AES-SIV, AES-GCM-SIV), does the same job with a 128-bit tag.

## Example (Python)

KW is built on AES, which Python's standard library doesn't have, so a toy
16-byte block cipher, four Feistel rounds over HMAC-SHA256, stands in.
With a real AES in place of `E` and `D`, `wrap()` gives the RFC 3394 test
vectors.

```python
import hmac, os

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def F(k, r, x):                          # round function: HMAC-SHA256 cut to 8 bytes
    return hmac.digest(k, bytes([r]) + x, "sha256")[:8]

def E(k, b):                             # toy 16-byte block cipher in place of AES
    L, R = b[:8], b[8:]
    for r in range(4):
        L, R = R, xor(L, F(k, r, R))
    return L + R

def D(k, b):
    L, R = b[:8], b[8:]
    for r in (3, 2, 1, 0):
        L, R = xor(R, F(k, r, L)), L
    return L + R

IV = bytes.fromhex("a6a6a6a6a6a6a6a6")

def wrap(kek, key):                      # RFC 3394, section 2.2.1
    n = len(key) // 8
    a, r = IV, [key[i:i + 8] for i in range(0, len(key), 8)]
    for j in range(6):
        for i in range(n):
            b = E(kek, a + r[i])
            a, r[i] = xor(b[:8], (n * j + i + 1).to_bytes(8, "big")), b[8:]
    return a + b"".join(r)

def unwrap(kek, c):                      # the same steps backwards, then the check
    n = len(c) // 8 - 1
    a, r = c[:8], [c[i:i + 8] for i in range(8, len(c), 8)]
    for j in range(5, -1, -1):
        for i in range(n - 1, -1, -1):
            b = D(kek, xor(a, (n * j + i + 1).to_bytes(8, "big")) + r[i])
            a, r[i] = b[:8], b[8:]
    if a != IV:
        raise ValueError("integrity check failed")
    return b"".join(r)

kek, key = os.urandom(16), os.urandom(32)       # wrap a 256-bit key
w = wrap(kek, key)
print(len(w), unwrap(kek, w) == key)            # 40 True
try:
    unwrap(kek, w[:-1] + bytes([w[-1] ^ 1]))    # flip one bit
except ValueError as e:
    print(e)                                    # integrity check failed
```

In real code, PyCA `cryptography` has `aes_key_wrap(kek, key)` and
`aes_key_unwrap(kek, wrapped)`, plus `aes_key_wrap_with_padding` for KWP.
A failed unwrap raises `InvalidUnwrap`. Those calls need the library and
weren't run for this page.

## Security notes

- The check is only 64 bits. A forger who keeps trying has better odds
  with every attempt, so SP 800-38F says to watch and limit failed unwraps
  per key.
- It is deterministic: wrapping the same key twice under one KEK gives the
  same output, which shows the key repeated. Wrap each key once.
- Use it for keys, not general data. Equal plaintexts show as equal
  ciphertexts, which matters for anything that isn't random.

## See also

- [Classic modes](Classic-Modes.md): what the plain modes leak without a check
- [AES](../04-symmetric-ciphers/AES.md): the block cipher inside
- [HKDF](../08-kdf-password-hashing/HKDF.md): deriving a KEK from a shared secret, as ECDH-ES+A128KW does
- [PBKDF2](../08-kdf-password-hashing/PBKDF2.md): deriving a KEK from a password, as PBES2 in JWE does
- [Disk encryption](Disk-Encryption.md): the other mode with no room for a nonce

## References

- NIST, *AES Key Wrap Specification* (17 November 2001), cited in RFC 3394
- [RFC 3394: AES Key Wrap Algorithm](https://www.rfc-editor.org/rfc/rfc3394) (Sections 2.2, 4) / [RFC 5649: AES Key Wrap with Padding](https://www.rfc-editor.org/rfc/rfc5649)
- [NIST SP 800-38F: Methods for Key Wrapping (2012)](https://csrc.nist.gov/pubs/sp/800/38/f/final) (Section 6, Appendix A) / [NIST, "Techniques for Key Wrapping: Pre-Draft Call for Comments" (2026)](https://csrc.nist.gov/news/2026/techniques-for-key-wrapping)
- Rogaway and Shrimpton, "Deterministic Authenticated-Encryption: A Provable-Security Treatment of the Key-Wrap Problem" (EUROCRYPT 2006) / [RFC 5297: SIV](https://www.rfc-editor.org/rfc/rfc5297)
- [RFC 3565: AES in CMS](https://www.rfc-editor.org/rfc/rfc3565) / [RFC 7518: JSON Web Algorithms](https://www.rfc-editor.org/rfc/rfc7518) (Sections 4.4, 4.6, 4.8)
- [OASIS PKCS #11 v3.1 (2023)](https://docs.oasis-open.org/pkcs11/pkcs11-spec/v3.1/os/pkcs11-spec-v3.1-os.html) (Section 6.16) / [Google Cloud KMS, Key wrapping](https://docs.cloud.google.com/kms/docs/key-wrapping)
- [NIST IR 8459 (2024)](https://csrc.nist.gov/pubs/ir/8459/final) (Section 9) / [PyCA `cryptography`: Key wrapping](https://cryptography.io/en/latest/hazmat/primitives/keywrap/)
