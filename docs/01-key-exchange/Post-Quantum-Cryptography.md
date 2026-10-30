# Post-Quantum Cryptography (PQC)

*Public-key algorithms built to survive a large quantum computer — the
replacements for RSA, ECC, and Diffie-Hellman.*

## What it is

Today's public-key crypto rests on factoring ([RSA](../02-signatures/RSA.md)) and discrete logs
([ECDSA](../02-signatures/ECDSA.md), [Diffie-Hellman](Diffie-Hellman.md), [X25519](ECDH.md)).
Shor's algorithm solves both efficiently on a large quantum computer, so all of
them break the day such a machine exists. Post-quantum cryptography is the set of
algorithms based on different hard problems — mostly structured lattices — that a
quantum computer is not known to crack.

Symmetric crypto is mostly fine: [AES](../04-symmetric-ciphers/AES.md)-256 and [SHA](../07-hash/SHA.md)-256 only
lose about half their strength to Grover's algorithm, so larger sizes are enough.
PQC is specifically about replacing the *public-key* layer.

## Why now

No quantum computer can break RSA or ECC yet, but the threat is already real
because of **"harvest now, decrypt later"**: an attacker can record encrypted
traffic today and decrypt it once the hardware arrives. Anything that must stay
secret for a decade or more needs protecting now, which is why TLS deployments
have already started switching on PQC.

## The NIST standards (2024)

NIST finalized the first PQC standards in August 2024:

| Standard | Algorithm (was) | Job | Replaces |
|----------|-----------------|-----|----------|
| FIPS 203 | ML-KEM (Kyber) | key encapsulation | ECDH / RSA key transport |
| FIPS 204 | ML-DSA (Dilithium) | signatures | ECDSA / RSA signatures |
| FIPS 205 | SLH-DSA (SPHINCS+) | signatures (hash-based) | conservative signature backup |

ML-KEM and ML-DSA are lattice-based and are the everyday choices. SLH-DSA is
slower with bigger signatures but rests only on hash security, so it's the
fallback if lattice problems are ever weakened.

## How a KEM differs from key exchange

PQC does key establishment with a **KEM** (key encapsulation mechanism) rather
than a Diffie-Hellman-style exchange:

- The receiver publishes a public key.
- The sender *encapsulates*: generates a random shared secret, wraps it for that
  public key, and sends the resulting ciphertext.
- The receiver *decapsulates* with its private key to recover the same secret.

```
public_key, secret_key      = ml_kem.keygen()           # receiver
ciphertext, shared_secret   = ml_kem.encapsulate(public_key)   # sender
shared_secret               = ml_kem.decapsulate(ciphertext, secret_key)  # receiver
# both sides now hold shared_secret -> run through HKDF before use
```

*(API shape via liboqs / python-oqs; exact names vary by library.)*

## When to use it

- **For long-lived secrets, start now** — VPNs, backups, anything with a long
  confidentiality horizon.
- **Deploy hybrid, not standalone** — pair a PQC KEM with a classical exchange
  (e.g. **X25519 + ML-KEM**, already in TLS 1.3) so you're no worse off if either
  one has a flaw. The session is safe unless *both* break.
- **Expect bigger keys and signatures** — ML-KEM public keys and ML-DSA
  signatures are kilobytes, versus tens of bytes for ECC. Budget for the size in
  protocols and storage.
- **Use a vetted library** — these algorithms are new and easy to implement
  wrong; don't hand-roll them.

## Security notes

- Hybrid mode is the conservative default while PQC implementations mature.
- The hard problems (module lattices) are younger than factoring and discrete
  log, so the SLH-DSA hash-based fallback exists on purpose.
- Migration is mostly a public-key concern; your AES-256 and SHA-256 usage
  carries over unchanged.

## See also

- [Will quantum computers break all of this?](../FAQ.md) — the short version
- [X25519](ECDH.md) — the classical half of a hybrid exchange
- [RSA](../02-signatures/RSA.md) / [ECDSA](../02-signatures/ECDSA.md) — what PQC replaces

## References

- FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM)
- FIPS 204: Module-Lattice-Based Digital Signature Standard (ML-DSA)
- FIPS 205: Stateless Hash-Based Digital Signature Standard (SLH-DSA)
- [NIST Post-Quantum Cryptography Project](https://csrc.nist.gov/projects/post-quantum-cryptography)
