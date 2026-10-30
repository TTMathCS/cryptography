# SHA (Secure Hash Algorithm)

*A family of hash functions that turn any input into a fixed-size fingerprint —
one-way, and different for any changed input.*

## What it is

A cryptographic hash maps data of any length to a fixed-size value (a digest). It
has no key. Good hashes are:

- **One-way** — you can't recover the input from the digest.
- **Collision-resistant** — you can't find two inputs with the same digest.
- **Avalanche** — flipping one input bit changes about half the output bits.

SHA is the standard family, designed by the NSA and published by NIST. It backs
signatures, integrity checks, Git commit IDs, and blockchains.

## The family

| Variant | Output | Status |
|---------|--------|--------|
| SHA-1 | 160-bit | **Broken** — practical collisions (Google's SHAttered, 2017). Don't use. |
| SHA-2 (SHA-256, SHA-512) | 256/512-bit | Current default, no practical attacks. |
| SHA-3 (Keccak) | variable | Newest, different internal design (sponge), length-extension safe. |

SHA-2 and SHA-3 are both fine today; SHA-256 is the everyday choice.

## How it works

SHA-2 uses the Merkle–Damgård construction: pad the message, split it into
blocks, and feed each block through a compression function that updates a running
internal state. The final state is the digest. SHA-256 does 64 rounds of
add/rotate/XOR mixing per 512-bit block.

SHA-3 instead uses a *sponge*: absorb the message into a large state, then squeeze
out the digest. That structure makes it immune to the length-extension weakness
of Merkle–Damgård hashes.

## When to use it

- **Integrity / fingerprints** — checksums, content addressing, signature digests.
- **Authenticating a message with a shared secret** — don't hash `key‖message`
  yourself (length-extension risk); use [HMAC](../06-mac/HMAC.md).
- **Storing passwords** — *not* with plain SHA. Passwords need a slow, salted
  function; see [Key Derivation and Password Hashing](../08-kdf-password-hashing/Key-Derivation-and-Password-Hashing.md).

## Example (Python)

```python
import hashlib

digest = hashlib.sha256(b"hello world").hexdigest()
# incremental, for streaming large inputs:
h = hashlib.sha256()
h.update(b"hello ")
h.update(b"world")
assert h.hexdigest() == digest
```

## Security notes

- Drop SHA-1 and MD5 for anything security-related; use SHA-256 or SHA-3.
- SHA-256 gives ~128-bit collision resistance and ~256-bit preimage resistance.
- SHA-2 is vulnerable to length-extension attacks — reach for HMAC or SHA-3 when
  that matters.
- A plain hash proves *integrity*, not *origin* — anyone can recompute it. For
  origin you need a key ([HMAC](../06-mac/HMAC.md)) or a signature ([Ed25519](../02-signatures/EdDSA.md)).

## See also

- [HMAC](../06-mac/HMAC.md) — keyed authentication built on SHA
- [Key Derivation and Password Hashing](../08-kdf-password-hashing/Key-Derivation-and-Password-Hashing.md) — why passwords need more than SHA
- [Cryptography FAQ](../FAQ.md) — encrypt vs. sign vs. hash

## References

- FIPS 180-4: Secure Hash Standard (SHA-1, SHA-2)
- FIPS 202: SHA-3 Standard (Keccak)
