# Ed25519 (Edwards-curve Digital Signature Algorithm)

*The modern default for signatures: fast, small, deterministic, and hard to
misuse. EdDSA on Curve25519.*

## What it is

Ed25519 is the EdDSA signature scheme over the Edwards form of Curve25519,
designed by Daniel J. Bernstein and team. It does the same job as
[ECDSA](ECDSA.md) — sign with a private key, verify with the public one — but
fixes ECDSA's sharp edges. It's now the preferred signature in OpenSSH, TLS 1.3,
Git commit signing, and age.

Its key-exchange sibling on the same curve family is [X25519](../01-key-exchange/ECDH.md).

## How it works

- A 32-byte private seed is hashed with SHA-512; part of that becomes the secret
  scalar `s`, and the public key is `A = s·B` for the curve's base point `B`.
- **Sign** message `M`: derive a nonce `r` *deterministically* from the message
  and a secret half of the hash, compute `R = r·B`, then
  `S = (r + Hash(R‖A‖M)·s) mod ℓ`. Signature is `(R, S)`, 64 bytes.
- **Verify:** check `S·B == R + Hash(R‖A‖M)·A`.

The crucial difference from ECDSA: the nonce is computed from the message, never
randomly generated, so the nonce-reuse attack that breaks DSA/ECDSA simply can't
happen.

## When to use it

- **Default for new signatures** — SSH keys, software signing, tokens.
- When you need **deterministic, reproducible** signatures.
- For signatures only — to agree on a shared key, use [X25519](../01-key-exchange/ECDH.md); to
  encrypt, use [AES](../04-symmetric-ciphers/AES.md)/[ChaCha20-Poly1305](../05-modes-aead/AEAD.md).

## Comparison

| Property | Ed25519 | ECDSA P-256 | RSA-2048 |
|----------|---------|-------------|----------|
| Signature size | 64 B | ~70 B | 256 B |
| Public key size | 32 B | ~65 B | 256 B |
| Security level | ~128-bit | ~128-bit | ~112-bit |
| Deterministic | Yes | Only with RFC 6979 | No |
| Nonce-reuse risk | None | Yes | n/a |
| Speed | Fast | Medium | Slow |

## Example (Python)

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

priv = Ed25519PrivateKey.generate()
sig = priv.sign(b"message")                 # 64-byte signature
priv.public_key().verify(sig, b"message")   # raises if invalid
```

## Security notes

- No random nonce, so no nonce-reuse footgun — its biggest practical advantage
  over [ECDSA](ECDSA.md).
- Curve25519 is twist-secure and avoids the point-validation traps of NIST curves.
- ~128-bit security; uses SHA-512 internally.
- Quantum computers break it like all ECC — see
  [ML-DSA](ML-DSA.md).

## See also

- [X25519](../01-key-exchange/ECDH.md) — key exchange on the same curve family
- [ECDSA](ECDSA.md) — the curve signature scheme it improves on
- [Cryptography FAQ](../FAQ.md) — why randomness (and its absence here) matters

## References

- RFC 8032: Edwards-Curve Digital Signature Algorithm (EdDSA)
- [Ed25519 — Bernstein et al.](https://ed25519.cr.yp.to/)
