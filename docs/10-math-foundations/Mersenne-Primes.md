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

## See also

- [Fermat Primes](Fermat-Primes.md) — the other famous structured-prime family
- [Miller-Rabin](Miller-Rabin-Primality-Test.md) — the general test for arbitrary numbers
- [RSA](../02-signatures/RSA.md) — why cryptography wants random primes, not these

## References

- [Great Internet Mersenne Prime Search (GIMPS)](https://www.mersenne.org/)
- [Mersenne prime — Wikipedia](https://en.wikipedia.org/wiki/Mersenne_prime)
