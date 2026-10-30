# Diffie-Hellman Key Exchange

*How two parties agree on a shared secret over a channel everyone can listen to —
the idea that started public-key cryptography.*

## What it is

Published in 1976 by Whitfield Diffie and Martin Hellman, this was the first
method letting two people who have never met derive a shared secret in the open,
with an eavesdropper unable to recover it. That shared secret then keys a fast
symmetric cipher like [AES](../04-symmetric-ciphers/AES.md). Its security rests on the discrete logarithm
problem.

The classic version below works over integers mod a prime. The modern, faster
version is the elliptic-curve form — see [X25519](ECDH.md), which has largely
replaced it.

## How it works

Both sides agree on public parameters: a large prime `p` and a generator `g`.

1. Alice picks secret `a`, sends `A = gᵃ mod p`. Bob picks secret `b`, sends `B = g^b mod p`.
2. Alice computes `Bᵃ mod p`, Bob computes `A^b mod p`.
3. Both equal `g^(ab) mod p` — the shared secret.

An eavesdropper sees `p, g, A, B` but can't get `g^(ab)` without solving the
discrete log to recover `a` or `b`.

## When to use it

- **Establishing a session key** before symmetric encryption — this is what the
  handshake in TLS, SSH, and VPNs does.
- **Use ephemeral keys (DHE/ECDHE) for forward secrecy** — a fresh key pair per
  session means a later key compromise can't decrypt past traffic.
- **Prefer [X25519](ECDH.md)** for new systems: smaller, faster, harder to
  misuse than classic mod-`p` DH.

## Example (Python)

```python
from secrets import randbelow

p = 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A63A3620FFFFFFFFFFFFFFFF
g = 2

a, A = randbelow(p - 2) + 2, None
b, B = randbelow(p - 2) + 2, None
A, B = pow(g, a, p), pow(g, b, p)            # exchanged in the open

assert pow(B, a, p) == pow(A, b, p)          # shared secret g^(ab) mod p
# then run the shared secret through HKDF before using it as a key
```

## Security notes

- **Plain DH has no authentication** — it's wide open to a man-in-the-middle who
  swaps the public values. Combine it with a signature
  ([Ed25519](../02-signatures/EdDSA.md)) or certificate.
- **Derive, don't use raw.** Feed `g^(ab)` through a KDF
  ([HKDF](../08-kdf-password-hashing/Key-Derivation-and-Password-Hashing.md)) before it becomes a cipher key.
- Use ephemeral keys for forward secrecy; use ≥2048-bit `p` for classic DH.
- Quantum computers break the discrete log — see
  [ML-KEM](ML-KEM.md).

## See also

- [X25519](ECDH.md) — the modern elliptic-curve version
- [Key Derivation and Password Hashing](../08-kdf-password-hashing/Key-Derivation-and-Password-Hashing.md) — turning the shared secret into keys
- [AES](../04-symmetric-ciphers/AES.md) / [ChaCha20-Poly1305](../05-modes-aead/AEAD.md) — what the key feeds

## References

- Diffie, W.; Hellman, M. (1976). "New Directions in Cryptography"
- RFC 7748: Elliptic Curves for Security (X25519)
