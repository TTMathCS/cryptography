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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: the idea of ML-DSA with one number"

    ML-DSA works with vectors of polynomials mod `q = 8,380,417`. The same steps fit in single numbers mod
    `q = 97`. This toy is not secure; it shows how a signature can be checked using only rounded values.
    Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Public `a`, small secrets `s₁`, `s₂` | `a = 33`, `s₁ = 2`, `s₂ = 1` | |
    | Public key | `t = a·s₁ + s₂ = 66 + 1` | `t = 67` |
    | Random mask | `y = 20`, `w = a·y = 660 mod 97` | `w = 78` |
    | High bits of `w` | the tens digit (rounding to steps of 10) | `7` |
    | Challenge | `c = H(7, message)`, a small number; say | `c = 1` |
    | Response | `z = y + c·s₁ = 20 + 2` | `z = 22` |
    | Reject if too big | is `|z|` below the bound, say 30? | yes, keep it |
    | Verify | `a·z − c·t = 726 − 67 = 659 mod 97 = 77`, high bits `7` | matches: valid |

    The verifier gets 77 instead of 78 because the small `s₂` was folded in; rounding to high bits hides the
    difference.

??? abstract "The math, with formulas"

    **Key generation (FIPS 204):** expand matrix **A** (`k × l` polynomials) from a seed; sample short
    **s₁**, **s₂**; `t = A·s₁ + s₂`, split into high part `t₁` (published) and low part `t₀` (kept).

    **Signing ("Fiat–Shamir with aborts"):**

    ```
    y  ← random with coefficients below γ₁
    w  = A·y,   w₁ = HighBits(w)
    c  = SampleInBall(H(μ ‖ w₁))          (τ coefficients ±1, the rest 0)
    z  = y + c·s₁
    restart if ‖z‖∞ ≥ γ₁ − β  or  ‖LowBits(w − c·s₂)‖∞ ≥ γ₂ − β
    ```

    The restart (rejection sampling) makes `z` independent of `s₁`; without it, many signatures would reveal
    the key. On average a signature takes 4.25, 5.1 or 3.85 tries for the three sizes.

    **Verifying:** `w₁′ = UseHint(h, A·z − c·t₁·2ᵈ)` and accept if `c = H(μ ‖ w₁′)` and `z` is short. It works
    because `A·z − c·t = A·y − c·s₂ = w − c·s₂`, which has the same high bits as `w`.

    | | (k, l) | η | τ | γ₁ | Public key | Signature | Category |
    |---|---|---|---|---|---|---|---|
    | ML-DSA-44 | (4, 4) | 2 | 39 | 2¹⁷ | 1,312 B | 2,420 B | 2 |
    | ML-DSA-65 | (6, 5) | 4 | 49 | 2¹⁹ | 1,952 B | 3,309 B | 3 |
    | ML-DSA-87 | (8, 7) | 2 | 60 | 2¹⁹ | 2,592 B | 4,627 B | 5 |

??? tip "Watch it step by step: sign with a mask, check with rounding"

    <div class="mars-steps" markdown>

    1. Public: `a = 33` and `t = 67`. Secret: the small `s₁ = 2` and `s₂ = 1`, with `t = 33·2 + 1`.
    2. The signer picks a random mask `y = 20` and computes `w = 33·20 mod 97 = 78`; its high part is 7.
    3. The hash of 7 and the message gives the small challenge `c = 1`.
    4. The response is `z = 20 + 1·2 = 22`. It is under the bound, so it is safe to publish (else restart).
    5. The verifier computes `33·22 − 1·67 mod 97 = 77`; its high part is 7.
    6. Hashing 7 with the message gives back `c = 1`, so the signature is valid.

    </div>

??? info "The math underneath"

    - **Module lattices:** Module-LWE (key recovery) and Module-SIS (forgery) are the hard problems; see
      [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **The ring** `Z_q[x]/(x²⁵⁶ + 1)` with `q = 2²³ − 2¹³ + 1`, chosen so the number-theoretic transform works
      (512th roots of unity exist mod q).
    - **Rejection sampling:** throwing away results to make the output distribution independent of the
      secret.
    - **The Fiat–Shamir transform** (as in [Schnorr](Schnorr.md)), here proven secure in the quantum
      random-oracle model.
    - **SHAKE256** ([SHA-3](../07-hash/SHA-3.md)) for the hashes and sampling.

## See also

- [ML-KEM](../01-key-exchange/ML-KEM.md): the key exchange side
- [Ed25519](EdDSA.md) / [ECDSA](ECDSA.md): what ML-DSA replaces
- [FN-DSA](FN-DSA.md) / [SLH-DSA](SLH-DSA.md): the other two NIST post-quantum signatures
- [Will quantum computers break all of this?](../FAQ.md)

## References

- [FIPS 204: ML-DSA](https://csrc.nist.gov/pubs/fips/204/final)
- [FIPS 205: SLH-DSA](https://csrc.nist.gov/pubs/fips/205/final)
- [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography)
