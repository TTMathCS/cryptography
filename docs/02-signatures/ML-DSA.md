# ML-DSA (Dilithium)

*The post-quantum signature for everyday use. Same job as ECDSA or Ed25519,
with keys and signatures a few kilobytes long.*

**Status and standards:** see [Digital signatures](../algorithms/table.md#2-digital-signatures)
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

## The story

- **Who made it:** The CRYSTALS team (Léo Ducas, Eike Kiltz, Tancrède Lepoint, Vadim Lyubashevsky, Peter Schwabe, Gregor Seiler and Damien Stehlé), who submitted Dilithium in 2017. It builds on Lyubashevsky's "Fiat-Shamir with aborts" (2009, 2012).
- **What for:** A signature that survives quantum computers, for certificates, software updates and everything RSA and ECDSA sign today.
- **What it solved:** A drop-in quantum-safe signature with keys and signatures of a few kilobytes and fast signing, using only integer arithmetic.
- **Where it stands:** Recommended. NIST picked it in July 2022 and published FIPS 204 in August 2024. Certificate authorities, HSM makers and operating systems are adding it now.
- **Incidents:** No break. Researchers have recovered keys from unprotected chips by measuring power use or injecting faults, so hardware needs masking.

## How it works

ML-DSA is "Fiat–Shamir with aborts" over polynomials modulo $q = 8{,}380{,}417$:

- **Key generation:** pick a matrix $\mathbf{A}$ from a seed and two small secret
  vectors $\mathbf{s}_1$, $\mathbf{s}_2$. The public key is $\mathbf{t} = \mathbf{A} \cdot \mathbf{s}_1 + \mathbf{s}_2$.
- **Sign:** pick a random masking vector $\mathbf{y}$, compute $\mathbf{w} = \mathbf{A} \cdot \mathbf{y}$,
  and hash the message with the high bits of $\mathbf{w}$ into a small challenge
  $c$. The signature is $\mathbf{z} = \mathbf{y} + c \cdot \mathbf{s}_1$.
- **Abort and retry:** if $\mathbf{z}$ would leak anything about $\mathbf{s}_1$ (a
  coefficient too large), throw it away and start again with a new $\mathbf{y}$. It
  takes a few tries on average.
- **Verify:** recompute $\mathbf{A} \cdot \mathbf{z} - c \cdot \mathbf{t}$, which is close to $\mathbf{w}$,
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

    ML-DSA works with vectors of polynomials mod $q = 8{,}380{,}417$. The same steps fit in single numbers mod
    $q = 97$. This toy is not secure; it shows how a signature can be checked using only rounded values.
    Checked with Python:

    | Step | Calculation | Value |
    |---|---|---|
    | Public $a$, small secrets $s_1$, $s_2$ | $a = 33$, $s_1 = 2$, $s_2 = 1$ | |
    | Public key | $t = a \cdot s_1 + s_2 = 66 + 1$ | $t = 67$ |
    | Random mask | $y = 20$, $w = a \cdot y = 660 \bmod 97$ | $w = 78$ |
    | High bits of $w$ | the tens digit (rounding to steps of 10) | $7$ |
    | Challenge | $c = H(7, \text{message})$, a small number; say | $c = 1$ |
    | Response | $z = y + c \cdot s_1 = 20 + 2$ | $z = 22$ |
    | Reject if too big | is $\lvert z \rvert$ below the bound, say 30? | yes, keep it |
    | Verify | $a \cdot z - c \cdot t = 726 - 67 = 659 \bmod 97 = 77$, high bits $7$ | matches: valid |

    The verifier gets 77 instead of 78 because the small $s_2$ was folded in; rounding to high bits hides the
    difference.

??? abstract "The math, with formulas"

    **Key generation (FIPS 204):** expand matrix $\mathbf{A}$ ($k \times l$ polynomials) from a seed; sample short
    $\mathbf{s}_1$, $\mathbf{s}_2$; $\mathbf{t} = \mathbf{A} \cdot \mathbf{s}_1 + \mathbf{s}_2$, split into high part $\mathbf{t}_1$ (published) and low part $\mathbf{t}_0$ (kept).

    **Signing ("Fiat–Shamir with aborts"):**

    $$
    \begin{aligned}
    \mathbf{y} &\leftarrow \text{random with coefficients below } \gamma_1 \\
    \mathbf{w} &= \mathbf{A} \cdot \mathbf{y}, \qquad \mathbf{w}_1 = \mathrm{HighBits}(\mathbf{w}) \\
    c &= \mathrm{SampleInBall}(H(\mu \,\Vert\, \mathbf{w}_1)) && (\tau \text{ coefficients } \pm 1\text{, the rest } 0) \\
    \mathbf{z} &= \mathbf{y} + c \cdot \mathbf{s}_1 \\
    &\text{restart if } \Vert \mathbf{z} \Vert_\infty \ge \gamma_1 - \beta \ \text{ or } \ \Vert \mathrm{LowBits}(\mathbf{w} - c \cdot \mathbf{s}_2) \Vert_\infty \ge \gamma_2 - \beta
    \end{aligned}
    $$

    The restart (rejection sampling) makes $\mathbf{z}$ independent of $\mathbf{s}_1$; without it, many signatures would reveal
    the key. On average a signature takes 4.25, 5.1 or 3.85 tries for the three sizes.

    **Verifying:** $\mathbf{w}_1' = \mathrm{UseHint}(\mathbf{h}, \mathbf{A} \cdot \mathbf{z} - c \cdot \mathbf{t}_1 \cdot 2^d)$ and accept if $c = H(\mu \,\Vert\, \mathbf{w}_1')$ and $\mathbf{z}$ is short. It works
    because $\mathbf{A} \cdot \mathbf{z} - c \cdot \mathbf{t} = \mathbf{A} \cdot \mathbf{y} - c \cdot \mathbf{s}_2 = \mathbf{w} - c \cdot \mathbf{s}_2$, which has the same high bits as $\mathbf{w}$.

    | | $(k, l)$ | $\eta$ | $\tau$ | $\gamma_1$ | Public key | Signature | Category |
    |---|---|---|---|---|---|---|---|
    | ML-DSA-44 | (4, 4) | 2 | 39 | $2^{17}$ | 1,312 B | 2,420 B | 2 |
    | ML-DSA-65 | (6, 5) | 4 | 49 | $2^{19}$ | 1,952 B | 3,309 B | 3 |
    | ML-DSA-87 | (8, 7) | 2 | 60 | $2^{19}$ | 2,592 B | 4,627 B | 5 |

??? tip "Watch it step by step: sign with a mask, check with rounding"

    <div class="mars-steps" markdown>

    1. Public: $a = 33$ and $t = 67$. Secret: the small $s_1 = 2$ and $s_2 = 1$, with $t = 33 \cdot 2 + 1$.
    2. The signer picks a random mask $y = 20$ and computes $w = 33 \cdot 20 \bmod 97 = 78$; its high part is 7.
    3. The hash of 7 and the message gives the small challenge $c = 1$.
    4. The response is $z = 20 + 1 \cdot 2 = 22$. It is under the bound, so it is safe to publish (else restart).
    5. The verifier computes $33 \cdot 22 - 1 \cdot 67 \bmod 97 = 77$; its high part is 7.
    6. Hashing 7 with the message gives back $c = 1$, so the signature is valid.

    </div>

??? info "The math underneath"

    - **Module lattices:** Module-LWE (key recovery) and Module-SIS (forgery) are the hard problems; see
      [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **The ring** $\mathbb{Z}_q[x]/(x^{256} + 1)$ with $q = 2^{23} - 2^{13} + 1$, chosen so the number-theoretic transform works
      (512th roots of unity exist mod $q$).
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
