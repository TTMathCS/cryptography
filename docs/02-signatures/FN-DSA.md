# FN-DSA (Falcon)

*The most compact NIST post-quantum signature, and the hardest to implement.
Falcon, renamed FN-DSA, is still waiting for its standard.*

**Status and standards:** see [Digital signatures](../index.md#2-digital-signatures)
in the main table.

## What it is

Falcon was submitted to NIST in 2017 by a team of ten, including Thomas
Pornin and Thomas Prest. NIST picked it in July 2022 (NIST IR 8413) for its
size: some protocols need a signature and its data in one network packet,
and ML-DSA's signatures don't fit. It will become FIPS 206 under the name
FN-DSA (FFT over NTRU-Lattice-Based Digital Signature Algorithm).

As of October 2026, FIPS 206 is not out, not even as a public draft. NIST
previewed the draft in September 2025 and revised the plan in September 2026.

| Parameter set | Security | Public key | Signature |
|---|---|---|---|
| FN-DSA-512 (Falcon-512) | category 1 | 897 B | 666 B |
| FN-DSA-1024 (Falcon-1024) | category 5 | 1,793 B | 1,280 B |
| [ML-DSA-44](ML-DSA.md), for comparison | category 2 | 1,312 B | 2,420 B |

Sizes are from the round-3 Falcon specification, with signatures padded to a
fixed length. Private keys are 1,281 and 2,305 bytes. There is no middle size:
the ring needs n to be a power of two.

## How it works

Falcon is "hash-and-sign" over an NTRU lattice, after Gentry, Peikert and
Vaikuntanathan (2008). Everything is a polynomial modulo xⁿ + 1 (n = 512 or
1024) with coefficients modulo q = 12,289.

- **Key generation:** pick small random polynomials f and g, then solve
  f·G − g·F = q for F and G. The public key is h = g/f mod q. The four small
  polynomials are a short basis of the lattice; h only gives a long one.
- **Sign:** hash a random 40-byte salt and the message to a polynomial c. Use
  the short basis to find a lattice point close to (c, 0). The difference is a
  short pair (s₁, s₂) with s₁ + s₂·h = c mod q. The signature is the salt and
  a compressed s₂.
- **Verify:** compute s₁ = c − s₂·h mod q and check that (s₁, s₂) is short.

The lattice point must follow a discrete Gaussian distribution, drawn by a
"fast Fourier sampler" over a tree built from the private key. Otherwise each
signature leaks a little of the secret basis, which is how NTRUSign was
broken (Nguyen and Regev, 2006).

**Why it is hard to implement.** NIST's 2022 report named floating point as
its worry about Falcon. Verification is plain integer math; signing is not.

- Signing runs the FFT and the sampler on IEEE 754 doubles. Many
  microcontrollers have no FPU for doubles, and emulating them is slower.
- Floating point is hard to make constant time, and here it touches secrets.
  Electromagnetic traces of signing on an ARM Cortex-M4 were enough to recover
  the key (Karabulut and Aysu, 2021).
- Tiny rounding differences are dangerous. If the sampler runs twice on the
  same input and the results differ slightly, the two outputs can reveal the
  key (Lin, Tibouchi, Yu and Zhang, 2025). So NIST plans to allow only
  randomized signing.
- Testing needs exact answers. NIST's 2025 preview fixed the floating-point
  details (order of operations, no fused multiply-add) so implementations
  match known-answer tests. Its September 2026 plan switches to fixed-point
  numbers: 32.32 bits for key generation, 64.64 for signing.

## When to use it

- **Not yet** where you need a FIPS standard. Use [ML-DSA](ML-DSA.md) now.
- **Once FIPS 206 is out:** where bytes matter most, such as certificate
  chains and DNSSEC.
- **Verify-only devices** are easy. Signing on a small device needs a
  vetted, constant-time library.

## Example (Python)

Needs `pip install liboqs-python` (its first import builds the liboqs C library if it is missing). liboqs ships
Falcon as submitted in round 3. FIPS 206 is set to change details (such as
hashing the public key into each signature), so these signatures won't
verify as FN-DSA. liboqs-python 0.16 first prints `liboqs-python faulthandler is disabled`.

```python
import oqs

message = b"release v2.1"

with oqs.Signature("Falcon-padded-512") as signer:
    public_key = signer.generate_keypair()
    signature = signer.sign(message)

with oqs.Signature("Falcon-padded-512") as verifier:
    print(len(public_key), len(signature), verifier.verify(message, signature, public_key))   # 897 666 True
```

## Security notes

- Security rests on the hardness of finding short vectors in NTRU lattices,
  studied since NTRU appeared in the mid-1990s.
- Use a vetted implementation that keeps secret floating-point work constant
  time on your CPU, or one that avoids the FPU entirely.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: hash-and-sign with a short answer"

    Falcon's signature is a short pair `(s₁, s₂)` with `s₁ + s₂·h ≡ c (mod q)`, where `h` is the public key and
    `c` the hash of the message. With single numbers mod `q = 97` (Falcon uses polynomials of 512 or 1,024
    coefficients mod 12,289), and `h = 40`, `c = 55`. Checked with Python:

    | Candidate `s₂` | `s₁ = c − s₂·h mod 97` (centered) | Size `s₁² + s₂²` | Valid? |
    |---|---|---|---|
    | `30` | `19` | 1,261 | equation holds, but too long |
    | `4` | `−8` | 80 | equation holds, short |
    | `−1` | `−2` | 5 | equation holds, the shortest |

    Check the best one: `−2 + (−1)·40 = −42 ≡ 55 (mod 97)`. Any `s₂` gives *some* `s₁`; the hard part is
    making both short. Here 97 choices can be tried by hand. In Falcon-512 the search space is about 12,289⁵¹²,
    and only the holder of the secret short basis can find a short pair.

??? abstract "The math, with formulas"

    **The NTRU lattice.** With small secret polynomials `f`, `g` and public `h = g·f⁻¹ mod q` (in
    `Z_q[x]/(xⁿ + 1)`), the pairs `(s₁, s₂)` with `s₁ + s₂·h ≡ 0 (mod q)` form a lattice. Its basis from `h`
    is long; the secret basis `[[g, −f], [G, −F]]` with `f·G − g·F = q` is short.

    **Signing (GPV, 2008):** `c = H(salt ‖ m)`. Find any `(t₁, t₂)` with `t₁ + t₂·h = c`, then use the short
    basis and the fast Fourier sampler to find a lattice vector `v` close to it, drawn from a discrete
    Gaussian. The signature is `s = t − v`, short and with `s₁ + s₂·h = c`.

    **Verifying:** recompute `c`, set `s₁ = c − s₂·h mod q`, accept if `‖(s₁, s₂)‖² ≤ ⌊β²⌋` (34,034,726 for
    Falcon-512, 70,265,242 for Falcon-1024).

    | | n | q | Public key | Signature | Category |
    |---|---|---|---|---|---|
    | FN-DSA-512 (Falcon-512) | 512 | 12,289 | 897 B | 666 B | 1 |
    | FN-DSA-1024 (Falcon-1024) | 1,024 | 12,289 | 1,793 B | 1,280 B | 5 |

    **Why the Gaussian.** If the sampler simply rounded, every signature would point slightly along the
    secret basis, and averaging many signatures would reveal its shape (the attack on NTRUSign). A
    Gaussian over the lattice coset is the same whichever basis drew it.

??? tip "Watch it step by step: why only the key holder can sign"

    <div class="mars-steps" markdown>

    1. Public: `q = 97` and `h = 40`. The message hashes to `c = 55`.
    2. A forger can pick any `s₂`, say 30, and solve `s₁ = 55 − 30·40 mod 97 = 19`. The equation holds.
    3. But `(19, 30)` is long, and the verifier rejects any pair whose length is above the bound.
    4. The key holder's short basis leads straight to a short pair: `(−2, −1)`.
    5. The verifier checks `−2 + (−1)·40 = −42 ≡ 55 (mod 97)` and that the pair is short. Valid.
    6. With 512 coefficients mod 12,289, trying candidates is hopeless; finding a short pair without the
       basis is the hard lattice problem.

    </div>

??? info "The math underneath"

    - **Lattices and short bases:** a lattice has many bases; a short, nearly orthogonal one lets you find
      nearby lattice points (Babai's nearest-plane idea).
    - **The short integer solution (SIS) problem** over NTRU lattices: forging means finding a short vector;
      see [Hard problems](../10-math-foundations/Hard-Problems.md).
    - **Discrete Gaussian sampling** and the **FFT** over `Z[x]/(xⁿ + 1)` (Falcon's "fast Fourier sampling").
    - **The NTRU equation** `fG − gF = q`, solved with field norms and the extended Euclidean algorithm.
    - Compare [ML-DSA](ML-DSA.md) (Fiat–Shamir, larger, easier to implement) and
      [NTRU Prime](../01-key-exchange/NTRU-Prime.md).

## See also

- [ML-DSA](ML-DSA.md): the lattice signature to use today
- [SLH-DSA](SLH-DSA.md): the hash-based fallback
- [NTRU Prime](../01-key-exchange/NTRU-Prime.md): another NTRU lattice scheme,
  for key exchange

## References

- [Falcon site and round-3 specification](https://falcon-sign.info/)
- [NIST IR 8413: status report on round 3](https://nvlpubs.nist.gov/nistpubs/ir/2022/NIST.IR.8413-upd1.pdf)
- [Perlner, "FIPS 206 Status Update", NIST 6th PQC Standardization Conference (Sep 2025)](https://csrc.nist.gov/presentations/2025/fips-206-fn-dsa-falcon)
- [NIST FIPS 206 team, "New plan for FN-DSA", pqc-forum (Sep 2026)](https://groups.google.com/a/list.nist.gov/g/pqc-forum/c/7z-y5qp-W2Y)
- [NIST Post-Quantum Cryptography project](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [Lin, Tibouchi, Yu, Zhang, "Do Not Disturb a Sleeping Falcon" (Eurocrypt 2025)](https://eprint.iacr.org/2024/1709)
- [Karabulut, Aysu, "Falcon Down" (DAC 2021)](https://eprint.iacr.org/2021/772)

*Weaker sources:* [NIST news release, August 2024](https://www.nist.gov/news-events/news/2024/08/nist-releases-first-3-finalized-post-quantum-encryption-standards) for the FN-DSA name and its expansion.
