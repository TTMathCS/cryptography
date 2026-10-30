# X25519 (Curve25519 Key Exchange)

*The modern default for agreeing on a shared secret. Diffie-Hellman done on
Curve25519 — small keys, fast, and hard to misuse.*

## What it is

X25519 is an Elliptic Curve Diffie-Hellman (ECDH) function over Curve25519, the
curve designed by Daniel J. Bernstein. Two parties each generate a key pair,
swap public keys, and independently compute the same 32-byte shared secret. An
eavesdropper who sees both public keys still can't recover it.

It does one thing — key agreement. For signatures on the same curve family, see
its sibling [Ed25519](../02-signatures/EdDSA.md). X25519 has largely replaced classic
[Diffie-Hellman](Diffie-Hellman.md) and the NIST P-256 curve for new key
exchange, and it's the workhorse of TLS 1.3, SSH, WireGuard, Signal, and age.

## How it works

Curve25519 is a Montgomery curve where every computation uses only the
x-coordinate, which makes the math simple and constant-time.

- Each side has a private scalar `d` and a public point `Q = d·G` (the base
  point `G` multiplied by `d`).
- Alice computes `d_A · Q_B`, Bob computes `d_B · Q_A`. Both equal
  `d_A · d_B · G` — the shared secret.
- Security rests on the elliptic-curve discrete log problem: recovering `d` from
  `Q` is infeasible.

The result is uniform-looking but not a finished key — always run it through a
KDF before use.

## When to use it

- **Default for key agreement** in any new protocol or application.
- **With ephemeral keys for forward secrecy** — generate a fresh pair per
  session so a later key compromise can't decrypt past traffic (this is the
  "ECDHE" in TLS cipher suites).
- **Paired with a signature** for authentication — X25519 agrees on a key but
  doesn't prove who you're talking to; combine with [Ed25519](../02-signatures/EdDSA.md) or a
  certificate to stop a man-in-the-middle.
- **In hybrid post-quantum exchanges** — TLS now pairs X25519 with ML-KEM so the
  secret stays safe even against a future quantum attacker. See
  [Post-Quantum Cryptography](Post-Quantum-Cryptography.md).

## Example (Python)

```python
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

alice = X25519PrivateKey.generate()
bob = X25519PrivateKey.generate()

# Each side computes the same raw secret from its own private key + peer's public key.
alice_secret = alice.exchange(bob.public_key())
bob_secret = bob.exchange(alice.public_key())
assert alice_secret == bob_secret

# Never use the raw secret directly — derive a key from it first.
session_key = HKDF(algorithm=hashes.SHA256(), length=32,
                   salt=None, info=b"handshake v1").derive(alice_secret)
```

## Security notes

- **Derive, don't use raw.** Feed the exchange output through HKDF (see
  [Key Derivation and Password Hashing](../08-kdf-password-hashing/Key-Derivation-and-Password-Hashing.md))
  before it becomes a cipher key.
- **Authenticate the public keys.** Plain X25519 has no identity; without
  signatures or certificates it's open to man-in-the-middle.
- **~128-bit security**, on par with [Ed25519](../02-signatures/EdDSA.md) and AES-128. Curve
  design rules out the weak-curve and validation traps that bite P-256.
- Quantum computers break it like all ECC — pair with a PQC KEM if long-term
  secrecy matters.

## See also

- [Ed25519](../02-signatures/EdDSA.md) — signatures on the same curve family
- [Diffie-Hellman](Diffie-Hellman.md) — the classic ECDH/finite-field version
- [Post-Quantum Cryptography](Post-Quantum-Cryptography.md) — hybrid key exchange

## References

- RFC 7748: Elliptic Curves for Security
- [Curve25519: new Diffie-Hellman speed records — D. J. Bernstein](https://cr.yp.to/ecdh/curve25519-20060209.pdf)
