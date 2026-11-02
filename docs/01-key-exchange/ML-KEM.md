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

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing). The standard
library has no ML-KEM. liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: the idea of ML-KEM with one number"

    ML-KEM works with polynomials of 256 coefficients in vectors of 2 to 4. The same idea fits in single
    numbers mod `q = 3329` (ML-KEM's own modulus). This toy is not secure; it only shows why noise does not
    stop decryption. Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Public `a`, secret `s`, small error `e` | `a = 1234`, `s = 2`, `e = 1` | |
    | Public key | `t = a·s + e = 2468 + 1` | `t = 2469` |
    | Sender: random small `r`, errors `e₁`, `e₂`; bit `m = 1` | `r = 3`, `e₁ = −1`, `e₂ = 1` | |
    | Ciphertext part 1 | `u = a·r + e₁ = 3702 − 1 mod 3329` | `u = 372` |
    | Ciphertext part 2 | `v = t·r + e₂ + m·1665 = 7407 + 1 + 1665 mod 3329` | `v = 2415` |
    | Receiver | `w = v − s·u = 2415 − 744` | `w = 1671` |
    | Round | 1671 is 6 away from 1665 and 1658 away from 0 | `m = 1` |

    The leftover `w − m·1665 = e·r + e₂ − s·e₁ = 3 + 1 + 2 = 6` is small because every secret and error is
    small. Without `s`, `u` and `v` look like random numbers mod 3329.

??? abstract "The math, with formulas"

    **The ring.** Polynomials with 256 coefficients modulo `x²⁵⁶ + 1` and modulo `q = 3329`. Multiplying by `x`
    shifts the coefficients and the top one comes back negated.

    **Key generation (FIPS 203, K-PKE).** From a seed, expand a `k × k` matrix **A** of random polynomials.
    Sample small **s** and **e** (coefficients from −η to η). Publish `t = A·s + e`.

    **Encryption** of a 32-byte message `m`: sample small **r**, **e₁**, `e₂`;
    `u = Aᵀ·r + e₁`, `v = tᵀ·r + e₂ + ⌈q/2⌉·m` (each bit of `m` becomes 0 or 1665 in one coefficient).
    Then compress: `u` to `d_u` bits a coefficient, `v` to `d_v` bits.

    **Decryption:** `v − sᵀ·u = eᵀ·r + e₂ − sᵀ·e₁ + ⌈q/2⌉·m`. Each coefficient is near 0 or near 1665;
    round to get `m`. Decryption fails only if the noise passes `q/4 ≈ 832`: FIPS 203 puts the chance at about
    2⁻¹³⁹ for ML-KEM-512, 2⁻¹⁶⁵ for ML-KEM-768 and 2⁻¹⁷⁵ for ML-KEM-1024.

    | | k | η₁ | d_u | d_v | Public key | Ciphertext | Security |
    |---|---|---|---|---|---|---|---|
    | ML-KEM-512 | 2 | 3 | 10 | 4 | 800 B | 768 B | category 1 (AES-128) |
    | ML-KEM-768 | 3 | 2 | 10 | 4 | 1,184 B | 1,088 B | category 3 (AES-192) |
    | ML-KEM-1024 | 4 | 2 | 11 | 5 | 1,568 B | 1,568 B | category 5 (AES-256) |

    **Fast multiplication (NTT).** 3329 = 13·256 + 1, so mod 3329 there is a 256th root of unity (17). The
    number-theoretic transform turns a polynomial product into 128 small products, like a Fourier transform.

    **Fujisaki–Okamoto.** Decapsulation re-encrypts the recovered `m` and compares; on a mismatch it returns
    a pseudorandom key derived from a secret value `z`, so an attacker learns nothing from forged ciphertexts.

??? tip "Watch it step by step: one bit through the noise"

    <div class="mars-steps" markdown>

    1. Bob publishes `a = 1234` and `t = 2469`. Only he knows `t = 1234·2 + 1`.
    2. Alice wants to send the bit 1. She picks small `r = 3`, `e₁ = −1`, `e₂ = 1`.
    3. She sends `u = 1234·3 − 1 ≡ 372`.
    4. She sends `v = 2469·3 + 1 + 1665 ≡ 2415` (the 1665 carries the bit).
    5. Bob computes `v − 2·u = 2415 − 744 = 1671`.
    6. 1671 is close to 1665 (the bit 1), far from 0 (the bit 0). Bob reads 1.
    7. In ML-KEM this happens for 256 bits at once; the 32-byte message is hashed into the shared key.

    </div>

??? info "The math underneath"

    - **Learning with errors (LWE)** and its module form (MLWE): solving `t = A·s + e` for small `s` is hard
      because of the small `e`. See [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Lattices:** recovering `s` means finding a short vector in a lattice of dimension about `256·k`. The
      best attacks (BKZ lattice reduction, sieving) take time exponential in the dimension, on classical and
      quantum computers alike.
    - **Polynomial rings** `Z_q[x]/(x²⁵⁶ + 1)` and the **number-theoretic transform**, the integer cousin of
      the FFT.
    - **Centered binomial distribution:** the small coefficients are sums of coin flips, cheap to sample in
      constant time.
    - **SHA-3 and SHAKE** ([SHA-3](../07-hash/SHA-3.md)) expand the seed into **A** and derive the keys.

## See also

- [ECDH](ECDH.md): X25519, the classical half of the hybrid
- [NTRU Prime](NTRU-Prime.md) / [Code-based KEMs](Code-Based-KEMs.md): the other post-quantum KEMs
- [ML-DSA](../02-signatures/ML-DSA.md): the post-quantum signature from the same family
- [HKDF](../08-kdf-password-hashing/HKDF.md): what the shared secret goes through next
- [Hard problems](../10-math-foundations/Hard-Problems.md): Module-LWE and the other problems post-quantum schemes rest on
- [Will quantum computers break all of this?](../FAQ.md)

## References

- [FIPS 203: ML-KEM](https://csrc.nist.gov/pubs/fips/203/final)
- [RFC 10024: hybrid ML-KEM key agreement for TLS 1.3](https://www.rfc-editor.org/rfc/rfc10024) (2026) / [RFC 10042: hybrid ML-KEM key exchange for SSH](https://www.rfc-editor.org/rfc/rfc10042) (2026)
- [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography)
