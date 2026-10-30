# HMAC (Hash-based Message Authentication Code)

*A keyed hash that proves a message came from someone who knows the secret and
wasn't changed on the way.*

## What it is

A plain hash like SHA-256 tells you whether data changed, but anyone can compute
it, so it proves nothing about who sent the data. HMAC mixes a shared secret key
into the hash. Only someone with the key can produce a matching tag, so a correct
tag means two things at once: the message is intact, and it came from a holder of
the key.

It is a MAC (message authentication code), not encryption — it does not hide the
message, it vouches for it.

## How it works

HMAC wraps an ordinary hash `H` with the key on both ends:

```
HMAC(K, m) = H( (K ⊕ opad) || H( (K ⊕ ipad) || m ) )
```

- `ipad` is the byte `0x36` repeated to the hash's block size, `opad` is `0x5c`.
- The key is hashed first if it's longer than a block, or zero-padded if shorter.

The nested structure is what makes HMAC safe against length-extension attacks,
which is why you use HMAC instead of just hashing `K || m` yourself.

## When to use it

- **Verifying a message between parties that share a secret** — API request
  signing, webhook signatures, session cookies, JWT (the `HS256` algorithm).
- **As a building block** — HKDF key derivation and PBKDF2 are both built on
  HMAC. See [HKDF](../08-kdf-password-hashing/HKDF.md) and [PBKDF2](../08-kdf-password-hashing/PBKDF2.md).
- **Not for passwords.** A password is low-entropy; use a slow password hash
  instead.
- **Not when the two sides don't share a secret.** Use a signature
  ([Ed25519](../02-signatures/EdDSA.md), [ECDSA](../02-signatures/ECDSA.md)) so a public key can verify.

## Example (Python)

```python
import hmac, hashlib

key = b"shared secret"
message = b"transfer $100 to Bob"

tag = hmac.new(key, message, hashlib.sha256).digest()

# The receiver recomputes the tag and compares in constant time.
ok = hmac.compare_digest(tag, hmac.new(key, message, hashlib.sha256).digest())
```

Always compare tags with `compare_digest`, not `==`. A normal compare returns
early on the first wrong byte, and that timing difference can leak the right tag.

## Security notes

- HMAC is only as secret as the key — store and share it like any other secret.
- Strength tracks the hash: HMAC-SHA256 gives ~256-bit security and is the safe
  default. HMAC-SHA1 is still unbroken (the SHA-1 collision attacks don't apply
  to HMAC), but new systems should use SHA-256.
- HMAC proves authenticity, not freshness — add a timestamp or nonce if you need
  to stop replay of an old, validly-tagged message.

## See also

- [SHA-2](../07-hash/SHA-2.md) — the hash HMAC is built on
- [HKDF](../08-kdf-password-hashing/HKDF.md) / [PBKDF2](../08-kdf-password-hashing/PBKDF2.md) — both built on HMAC
- [Block-cipher MACs](Block-Cipher-MACs.md) / [Universal hash MACs](Universal-Hash-MACs.md) — CMAC, GMAC, Poly1305 and UMAC, the other MAC families
- [KMAC](KMAC.md) / [SipHash](SipHash.md) — SHA-3's own MAC, which needs no HMAC wrapper, and a keyed hash for hash tables
- [Cryptography FAQ](../FAQ.md) — encrypt vs. sign vs. hash

## References

- RFC 2104: HMAC: Keyed-Hashing for Message Authentication
- FIPS 198-1: The Keyed-Hash Message Authentication Code (HMAC)
