# ML-KEM (Kyber)

*The post-quantum way to agree on a key. One side locks a fresh random secret
to the other's public key; only the matching private key opens it.*

**Status and standards:** see [Key exchange](../index.md#1-key-exchange) in the
main table.

## What it is

Every classical key exchange ([Diffie-Hellman](Diffie-Hellman.md),
[ECDH](ECDH.md)) and [RSA](../02-signatures/RSA.md) falls to Shor's algorithm on
a large quantum computer. ML-KEM is the replacement NIST standardized as
FIPS 203 in August 2024, from the Kyber design (2017). Its security rests on a
lattice problem, Module Learning With Errors, that no quantum algorithm is
known to solve.

**Why now:** nobody can break X25519 today, but an attacker can record traffic
now and decrypt it once the hardware exists ("harvest now, decrypt later").
That is why TLS and SSH have already switched it on, before the quantum
computers arrive.

| Parameter set | Security | Public key | Ciphertext | Shared secret |
|---|---|---|---|---|
| ML-KEM-512 | category 1 (~AES-128) | 800 B | 768 B | 32 B |
| ML-KEM-768 | category 3 (~AES-192) | 1,184 B | 1,088 B | 32 B |
| ML-KEM-1024 | category 5 (~AES-256) | 1,568 B | 1,568 B | 32 B |

For comparison, an X25519 public key is 32 bytes. ML-KEM-768 is the common
choice; NSA's CNSA 2.0 asks for ML-KEM-1024.

## How it works

A KEM (key encapsulation mechanism) works differently from a Diffie-Hellman
exchange:

1. The receiver publishes a public key.
2. The sender **encapsulates**: picks a random secret, locks it to that public
   key, and sends the ciphertext.
3. The receiver **decapsulates** with its private key and gets the same secret.

Inside, everything is polynomials with 256 coefficients modulo q = 3329,
arranged in small vectors and matrices (rank 2, 3 or 4 for the three sizes):

- **Key generation:** pick a matrix **A** from a seed, a small secret vector
  **s** and a small error **e**. The public key is **t** = **A**·**s** + **e**.
  Without the error, solving for **s** would be easy linear algebra; with it,
  that is the hard lattice problem.
- **Encapsulate:** encode a random message into the polynomial noise and
  encrypt it with **t**. The shared secret is a hash of that message.
- **Decapsulate:** use **s** to strip the noise and recover the message, then
  re-encrypt it to check the ciphertext was honest. A forged ciphertext gives a
  random-looking secret instead of an error (the Fujisaki–Okamoto transform,
  which makes it safe against chosen-ciphertext attacks).

SHA-3 and SHAKE do all the hashing and sampling inside.

## When to use it

- **Hybrid, not alone:** pair ML-KEM with X25519 and combine both secrets, as
  TLS (`X25519MLKEM768`) and SSH (`mlkem768x25519-sha256`) do. The session
  stays safe unless *both* break.
- **Anything that must stay secret for years:** VPNs, backups, messaging.
  Signal's PQXDH adds ML-KEM-1024 to its X25519 handshake.
- **Budget for size:** a TLS ClientHello grows by about 1.2 KB.

## Example (Python)

Needs `liboqs-python`; the standard library has no ML-KEM.

```python
import oqs

with oqs.KeyEncapsulation("ML-KEM-768") as receiver:
    public_key = receiver.generate_keypair()

    with oqs.KeyEncapsulation("ML-KEM-768") as sender:
        ciphertext, secret_sender = sender.encap_secret(public_key)

    secret_receiver = receiver.decap_secret(ciphertext)

print(secret_sender == secret_receiver)   # True: 32 shared bytes, run them through HKDF
```

## Security notes

- Module lattices are younger than factoring and discrete log, which is the
  reason for hybrid mode and for the hash-based signature fallback (SLH-DSA).
- Decapsulation must run in constant time; timing leaks (KyberSlash, 2023)
  broke early implementations. Use a vetted library.
- Symmetric crypto carries over: AES-256 and SHA-256 only lose about half their
  strength to Grover's algorithm.

## See also

- [ECDH](ECDH.md): X25519, the classical half of the hybrid
- [ML-DSA](../02-signatures/ML-DSA.md): the post-quantum signature from the same family
- [HKDF](../08-kdf-password-hashing/HKDF.md): what the shared secret goes through next
- [Will quantum computers break all of this?](../FAQ.md)

## References

- [FIPS 203: ML-KEM](https://csrc.nist.gov/pubs/fips/203/final)
- [draft-ietf-tls-ecdhe-mlkem](https://datatracker.ietf.org/doc/draft-ietf-tls-ecdhe-mlkem/)
- [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography)
