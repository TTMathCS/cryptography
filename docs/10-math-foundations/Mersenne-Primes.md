# Mersenne Primes

*Primes of the form `2^p − 1`. They have a uniquely fast primality test, which is
why the largest known primes are almost always Mersenne primes.*

## What it is

A Mersenne number is `Mₚ = 2^p − 1`. When it's prime, it's a Mersenne prime,
named after Marin Mersenne (1588–1648). For `Mₚ` to be prime, the exponent `p`
must itself be prime — but that's not enough (e.g. `M₁₁ = 2047 = 23 × 89` is
composite). They matter here because the [Lucas-Lehmer test](#how-its-tested)
checks them far faster than any general method, making them the perennial
record-holders for "largest known prime."

## Why p must be prime

If `p = a·b` with `a, b > 1`, then `2ᵃ − 1` divides `2^p − 1`, so `Mₚ` is
composite. Hence a prime `Mₚ` forces a prime exponent `p`.

## How it's tested

The **Lucas-Lehmer test** is specific to Mersenne numbers and very efficient. For
odd prime `p`, `Mₚ` is prime iff the sequence `s₀ = 4`, `sᵢ₊₁ = sᵢ² − 2`
satisfies `s_{p−2} ≡ 0 (mod Mₚ)`:

```python
def lucas_lehmer(p):
    if p == 2: return True
    m = (1 << p) - 1
    s = 4
    for _ in range(p - 2):
        s = (s * s - 2) % m
    return s == 0
```

Verified: returns `True` for `p ∈ {2,3,5,7,13,17,19,31,61,89}` and `False` for
`{11,23,29,37,41,43}`.

## When they come up

- **Largest-known-prime records and the GIMPS distributed search** — fast testing
  makes record hunts practical.
- **Perfect numbers** — every even perfect number is `2^(p−1)(2^p − 1)` for a
  Mersenne prime `2^p − 1` (Euclid–Euler).
- They are mathematical landmarks; they aren't directly used as cryptographic keys
  (RSA needs *random* primes — see [RSA](../02-signatures/RSA.md)).

## Status

As of 2024, **52 Mersenne primes are known**. The largest, `2^136,279,841 − 1`
(about 41 million digits), was found by GIMPS in October 2024 and is the largest
known prime of any kind. The first few exponents are `p = 2, 3, 5, 7, 13, 17, 19`.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Lucas-Lehmer on M₇ and M₁₁"

    | i | `sᵢ` mod 127 (p = 7) | `sᵢ` mod 2047 (p = 11) |
    |---|---|---|
    | 0 | 4 | 4 |
    | 1 | 14 | 14 |
    | 2 | 67 | 194 |
    | 3 | 42 | 788 |
    | 4 | 111 | 701 |
    | 5 | **0** | 119 |
    | 6 | | 1877 |
    | 7 | | 240 |
    | 8 | | 282 |
    | 9 | | **1736** |

    `s₅ ≡ 0 (mod 127)`, so 127 is prime. `s₉ ≢ 0 (mod 2047)`, so 2047 is composite, and its factors fit
    the rule below: `23 = 1 · 22 + 1` and `89 = 4 · 22 + 1`.

??? abstract "The math, with formulas"

    - **Lucas-Lehmer:** for an odd prime p, `Mₚ = 2ᵖ − 1` is prime if and only if
      `s_(p−2) ≡ 0 (mod Mₚ)`, where `s₀ = 4` and `sᵢ₊₁ = sᵢ² − 2`.
    - **Closed form:** `sᵢ = ω^(2ⁱ) + ω̄^(2ⁱ)` with `ω = 2 + √3`, `ω̄ = 2 − √3`. The test is really asking
      whether ω has the right order in a field with `Mₚ²` elements.
    - **Factor form:** any prime factor q of `Mₚ` (p odd) has `q ≡ 1 (mod 2p)` and `q ≡ ±1 (mod 8)`.
    - **Cheap reduction:** `x mod (2ᵖ − 1) = (x & Mₚ) + (x ≫ p)`, repeated: just shifts and adds. GIMPS also
      squares the numbers with FFT multiplication.
    - **Perfect numbers (Euclid–Euler):** `2^(p−1) · Mₚ` is perfect exactly when `Mₚ` is prime.

??? tip "Watch it step by step: testing M₇ = 127"

    <div class="mars-steps" markdown>

    1. p = 7, so M₇ = 2⁷ − 1 = 127, and we need p − 2 = 5 steps.
    2. s₀ = 4. s₁ = 4² − 2 = 14.
    3. s₂ = 14² − 2 = 194, which is 67 mod 127.
    4. s₃ = 67² − 2 = 4,487, which is 42 mod 127. s₄ = 42² − 2 = 1,762, which is 111.
    5. s₅ = 111² − 2 = 12,319 = 97 × 127. That is 0 mod 127.
    6. Zero after p − 2 steps: 127 is prime.

    </div>

??? info "The math underneath"

    - **Finite fields** `GF(q²)` and element orders: the group behind Lucas-Lehmer.
    - **Mersenne primes in cryptography:** the field of the NIST curve P-521 is `2⁵²¹ − 1`, a Mersenne prime,
      chosen for that cheap reduction; Curve25519 uses the nearby `2²⁵⁵ − 19`. See
      [elliptic curves](Elliptic-Curves.md).
    - **Mersenne Twister**'s period `2¹⁹⁹³⁷ − 1` is a Mersenne prime too ([retired generators](../09-random/Retired.md)).

## See also

- [Fermat Primes](Fermat-Primes.md) — the other famous structured-prime family
- [Miller-Rabin](Miller-Rabin-Primality-Test.md) — the general test for arbitrary numbers
- [RSA](../02-signatures/RSA.md) — why cryptography wants random primes, not these

## References

- [Great Internet Mersenne Prime Search (GIMPS)](https://www.mersenne.org/)
- [Mersenne prime — Wikipedia](https://en.wikipedia.org/wiki/Mersenne_prime)
