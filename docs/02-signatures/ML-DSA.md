# ML-DSA (Dilithium)

*The post-quantum signature for everyday use. Same job as ECDSA or Ed25519,
with keys and signatures a few kilobytes long.*

**Status and standards:** see [Digital signatures](../index.md#2-digital-signatures)
in the main table.

## What it is

[RSA](RSA.md), [ECDSA](ECDSA.md) and [Ed25519](EdDSA.md) all fall to Shor's
algorithm on a large quantum computer. ML-DSA is NIST's main replacement,
standardized as FIPS 204 in August 2024 from the Dilithium design (2017). Like
[ML-KEM](../01-key-exchange/ML-KEM.md), it rests on module lattices.

Signatures face less urgency than key exchange: a recorded signature can't be
"decrypted later". What matters is having quantum-safe keys in place before
someone can forge with the old ones. Certificates and firmware live for years,
so the switch starts now.

| Parameter set | Security | Public key | Signature |
|---|---|---|---|
| ML-DSA-44 | category 2 | 1,312 B | 2,420 B |
| ML-DSA-65 | category 3 | 1,952 B | 3,309 B |
| ML-DSA-87 | category 5 | 2,592 B | 4,627 B |

For comparison, Ed25519 uses a 32-byte public key and a 64-byte signature.
NSA's CNSA 2.0 asks for ML-DSA-87.

## How it works

ML-DSA is "Fiat–Shamir with aborts" over polynomials modulo q = 8,380,417:

- **Key generation:** pick a matrix **A** from a seed and two small secret
  vectors **s1**, **s2**. The public key is **t** = **A**·**s1** + **s2**.
- **Sign:** pick a random masking vector **y**, compute **w** = **A**·**y**,
  and hash the message with the high bits of **w** into a small challenge
  **c**. The signature is **z** = **y** + **c**·**s1**.
- **Abort and retry:** if **z** would leak anything about **s1** (a
  coefficient too large), throw it away and start again with a new **y**. It
  takes a few tries on average.
- **Verify:** recompute **A**·**z** − **c**·**t**, which is close to **w**,
  and check that hashing it gives the same challenge.

Signing is "hedged" by default: it mixes fresh randomness with the key, so a
bad random generator can't leak the key the way it can with ECDSA. A fully
deterministic mode is also allowed.

## When to use it

- **New long-lived keys:** code signing, firmware, roots and intermediate CAs.
- **Hybrid or composite** while trust builds: sign with ML-DSA and Ed25519 or
  ECDSA together. OpenSSH 10.4 added an experimental
  `ssh-mldsa44-ed25519@openssh.com` key type that does exactly this.
- **Where size hurts** (a TLS chain carries several signatures), expect
  kilobytes more per handshake. That cost is the main reason web PKI moves
  slowly.

## Example (Python)

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing). The standard
library has no ML-DSA. liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

```python
import oqs

message = b"release v2.1"

with oqs.Signature("ML-DSA-65") as signer:
    public_key = signer.generate_keypair()
    signature = signer.sign(message)

with oqs.Signature("ML-DSA-65") as verifier:
    print(verifier.verify(message, signature, public_key))   # True
```

## Security notes

- Lattice signatures are younger than ECC; SLH-DSA (FIPS 205, hash-based) exists
  as the conservative fallback, at the cost of much bigger signatures.
- FIPS 204 also defines HashML-DSA (sign a hash of the message); use it only
  when a protocol needs pre-hashing.
- Implementations must not leak timing or rejected attempts; use a vetted
  library.

## See also

- [ML-KEM](../01-key-exchange/ML-KEM.md): the key exchange side
- [Ed25519](EdDSA.md) / [ECDSA](ECDSA.md): what ML-DSA replaces
- [FN-DSA](FN-DSA.md) / [SLH-DSA](SLH-DSA.md): the other two NIST post-quantum signatures
- [Will quantum computers break all of this?](../FAQ.md)

## References

- [FIPS 204: ML-DSA](https://csrc.nist.gov/pubs/fips/204/final)
- [FIPS 205: SLH-DSA](https://csrc.nist.gov/pubs/fips/205/final)
- [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography)
