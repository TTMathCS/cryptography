# ChaCha20-Poly1305

*A fast stream cipher (ChaCha20) bolted to a one-time authenticator (Poly1305),
giving authenticated encryption — the usual alternative to AES-GCM.*

## What it is

ChaCha20-Poly1305 is an AEAD cipher: it encrypts data for confidentiality and
attaches a tag that detects any tampering, in one step. ChaCha20, designed by
Daniel J. Bernstein, produces a keystream that is XORed with the plaintext.
Poly1305 computes a 16-byte authentication tag over the ciphertext.

It exists because AES is only fast when the CPU has AES hardware instructions.
ChaCha20 is fast in plain software and naturally constant-time, so it wins on
phones, embedded devices, and older servers. TLS 1.3, WireGuard, and OpenSSH all
offer it.

## How it works

- **Key:** 256 bits. **Nonce:** 96 bits (the IETF variant). **Counter:** 32 bits.
- ChaCha20 runs 20 rounds of add-rotate-XOR on a 512-bit block built from the
  key, nonce, and a block counter, producing keystream blocks. Ciphertext is
  `plaintext ⊕ keystream`.
- Poly1305 takes a one-time key (derived from the cipher key and nonce) and
  produces a tag over the ciphertext plus any associated data.
- **AEAD** means you can also feed in *associated data* — headers or routing
  info that must be authentic but stay in the clear. It's covered by the tag but
  not encrypted.

## When to use it

- **Default choice when there's no AES hardware acceleration** — mobile,
  IoT, or any pure-software stack.
- **Anywhere you'd reach for AES-GCM** — the two are interchangeable in TLS 1.3
  and modern protocols. See [AES](../04-symmetric-ciphers/AES.md) for the block-cipher side.
- **Use the AEAD interface, never raw ChaCha20 alone** — encryption without the
  Poly1305 tag leaves you open to tampering.

## Example (Python)

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305

key = ChaCha20Poly1305.generate_key()   # 32 bytes
aead = ChaCha20Poly1305(key)

nonce = os.urandom(12)                   # 96-bit, unique for every message
header = b"v1|message-id-42"             # associated data: authenticated, not encrypted

ct = aead.encrypt(nonce, b"secret data", header)
pt = aead.decrypt(nonce, ct, header)     # raises if the tag or header don't match
```

## Security notes

- **Never reuse a nonce with the same key.** Two messages under the same
  key+nonce expose the XOR of their plaintexts and break Poly1305's
  authentication. Use a random 96-bit nonce per message, or a counter you are
  certain never repeats. See [Why does randomness matter](../FAQ.md).
- The nonce is not secret — send it alongside the ciphertext.
- Decryption either returns the plaintext or fails; never use data from a message
  whose tag didn't verify.
- For very high message volumes, XChaCha20-Poly1305 uses a 192-bit nonce so
  random nonces effectively never collide.

## See also

- [AES](../04-symmetric-ciphers/AES.md) — the block-cipher AEAD it competes with (AES-GCM)
- [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md) — the stream cipher on its own: quarter-round, nonce sizes, XChaCha20
- [X25519](../01-key-exchange/ECDH.md) — commonly paired to agree on the key
- [Universal hash MACs](../06-mac/Universal-Hash-MACs.md) — Poly1305 on its own: one-time keys and its forgery bound
- [Classic modes](Classic-Modes.md) / [Disk encryption](Disk-Encryption.md) / [Key wrap](Key-Wrap.md) — the other cipher modes: CBC and CTR, XTS, AES Key Wrap
- [Cryptography FAQ](../FAQ.md) — symmetric vs. asymmetric

## References

- RFC 8439: ChaCha20 and Poly1305 for IETF Protocols
- [ChaCha, a variant of Salsa20 — D. J. Bernstein](https://cr.yp.to/chacha/chacha-20080128.pdf)
