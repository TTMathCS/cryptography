# HKDF (HMAC-based Key Derivation)

*Turns a strong but lumpy secret, such as a Diffie-Hellman output, into as many
clean keys as you need. Fast on purpose: the input is already unguessable.*

**Status and standards:** see [Key derivation and password hashing](../index.md#8-key-derivation-and-password-hashing)
in the main table.

## What it is

A key exchange gives both sides a shared secret, but that secret isn't a key
yet: an [X25519](../01-key-exchange/ECDH.md) output is a curve point coordinate
with structure, not 32 uniform random bytes, and one secret has to feed several
keys (one per direction, plus IVs). HKDF, from Hugo Krawczyk (2010, RFC 5869),
is the standard fix. It is built entirely on [HMAC](../06-mac/HMAC.md).

It runs in TLS 1.3's key schedule, Signal, HPKE, MLS, and (with BLAKE2s in
place of SHA-256) WireGuard.

Don't use it for passwords. A password is guessable, and HKDF is fast, so every
guess is cheap. Use [Argon2](Argon2.md) or [scrypt](scrypt.md) for those.

## How it works

Two steps:

1. **Extract:** `PRK = HMAC(salt, input)`. This concentrates whatever entropy
   the input has into one uniform key. The salt is optional (zeros by default)
   but helps when you have one.
2. **Expand:** chain HMAC with that key until there are enough bytes:
   `T1 = HMAC(PRK, info ‖ 1)`, `T2 = HMAC(PRK, T1 ‖ info ‖ 2)`, and so on. The
   output is `T1 ‖ T2 ‖ …`, cut to length.

The `info` string names what the key is for (`"client write key"`,
`"app v1 session"`). Same secret plus different `info` gives unrelated keys.

## When to use it

- **After any key exchange:** DH, ECDH, ML-KEM, before the secret touches a
  cipher.
- **Splitting one master key** into separate keys for encryption, MAC, and each
  direction.
- **Not for passwords**, and not as a hash.

## Example (Python)

HKDF is small enough to write with the standard library. This matches test
case 1 of RFC 5869:

```python
import hmac, hashlib

def hkdf(ikm, salt, info, n):
    prk = hmac.new(salt or bytes(32), ikm, hashlib.sha256).digest()   # extract
    out, t, i = b"", b"", 1
    while len(out) < n:                                              # expand
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out += t
        i += 1
    return out[:n]

okm = hkdf(bytes([0x0b] * 22), bytes(range(13)), bytes(range(0xf0, 0xfa)), 42)
print(okm.hex())
# 3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865
```

In real code use a library version, such as `HKDF` from PyCA `cryptography`
(`cryptography.hazmat.primitives.kdf.hkdf`).

## Security notes

- Never feed a raw DH or X25519 output straight into a cipher; run it through
  HKDF first.
- Give every derived key its own `info` label so one secret never produces the
  same key for two jobs.
- Output is limited to 255 hash lengths (8,160 bytes for SHA-256), far more
  than anyone needs.

## See also

- [HMAC](../06-mac/HMAC.md): the only building block HKDF uses
- [TLS 1.3](../protocols/TLS-1.3.md): the key schedule is HKDF all the way down
- [Argon2](Argon2.md): the slow function for passwords

## References

- [RFC 5869: HKDF](https://www.rfc-editor.org/rfc/rfc5869)
- [Krawczyk, "Cryptographic Extraction and Key Derivation: The HKDF Scheme" (2010)](https://eprint.iacr.org/2010/264)
- NIST SP 800-56C: the same extract-then-expand idea in NIST form
