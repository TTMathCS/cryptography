# AES (Advanced Encryption Standard)

*The standard symmetric cipher: one shared key encrypts and decrypts, fast enough
for bulk data. The default for "encrypt this."*

## What it is

AES is a symmetric block cipher, standardized by NIST in 2001 (originally the
Rijndael design by Joan Daemen and Vincent Rijmen). Both sides use the *same*
secret key, which is what makes it fast — but it leaves open the question of how
they got that shared key, usually answered by a key exchange like
[X25519](../01-key-exchange/ECDH.md). It replaced the old DES and is now everywhere: TLS, disk
encryption, VPNs.

It works on fixed 128-bit blocks with a 128-, 192-, or 256-bit key (10, 12, or 14
rounds respectively).

## How it works

AES arranges each 16-byte block as a 4×4 byte matrix (the *state*) and runs it
through several rounds of four steps:

- **SubBytes** — replace each byte using a fixed lookup table (the S-box). Adds
  non-linearity.
- **ShiftRows** — rotate the rows by 0, 1, 2, 3 bytes. Spreads bytes across columns.
- **MixColumns** — mix each column with a matrix multiply in GF(2⁸). Spreads
  within columns.
- **AddRoundKey** — XOR in a round key derived from the main key.

Together these give *confusion and diffusion*: one input bit flips changes the
whole block. Decryption runs the inverse steps with the round keys in reverse.

## When to use it

- **Default symmetric cipher**, especially where the CPU has AES hardware
  instructions (almost all modern servers and laptops).
- On hardware without that acceleration, [ChaCha20-Poly1305](../05-modes-aead/AEAD.md)
  is the faster, equally safe alternative.
- **Use an authenticated mode (AES-GCM).** A raw block cipher only encrypts one
  block; the mode is what turns it into safe encryption for real messages.

## Modes of operation

| Mode | Notes |
|------|-------|
| **GCM** | Authenticated (AEAD) — encrypts *and* detects tampering. The right default. |
| **CTR** | Turns AES into a stream cipher, parallelizable, but no built-in authentication. |
| **CBC** | Chains blocks with an IV; needs separate authentication and padding. Legacy. |
| **ECB** | Never use. Identical plaintext blocks produce identical ciphertext, leaking patterns. |

## Example (Python)

From-scratch AES means shipping the full S-box and round logic, so the concise
*and* correct approach is a vetted library:

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key = AESGCM.generate_key(bit_length=256)   # AES-256
aead = AESGCM(key)

nonce = os.urandom(12)                       # 96-bit, unique per message
header = b"v1|msg-42"                        # associated data: authenticated, not encrypted
ct = aead.encrypt(nonce, b"secret data", header)
pt = aead.decrypt(nonce, ct, header)         # raises if tampered
```

## Security notes

- **Never reuse a nonce/IV with the same key** — with GCM and CTR this is
  catastrophic, exposing plaintext and breaking authentication.
- Prefer AES-256, and always pick an authenticated mode (GCM), not ECB/CBC alone.
- Side-channel safety matters: use the library's hardware-backed, constant-time
  implementation rather than rolling your own.
- AES-256 stays strong even against quantum computers (Grover only halves it) —
  see [Will quantum break this](../FAQ.md).

## See also

- [ChaCha20-Poly1305](../05-modes-aead/AEAD.md) — the software-speed alternative
- [Retired ciphers](Retired.md) / [National ciphers](National-Ciphers.md) — DES and 3DES before AES, and the national ciphers used beside it
- [X25519](../01-key-exchange/ECDH.md) / [HKDF](../08-kdf-password-hashing/HKDF.md) — how both sides get the shared key
- [Cryptography FAQ](../FAQ.md) — symmetric vs. asymmetric

## References

- FIPS 197: Advanced Encryption Standard (AES)
- NIST SP 800-38A / 800-38D: Block Cipher Modes (CBC/CTR, GCM)
