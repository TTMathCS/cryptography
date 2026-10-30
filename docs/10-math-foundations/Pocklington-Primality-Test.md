# Pocklington Primality Test

*A way to actually **prove** a number prime — not just "probably" — when you can
factor enough of `n − 1`.*

## What it is

Probabilistic tests like [Miller-Rabin](Miller-Rabin-Primality-Test.md) and
[Baillie-PSW](Baillie-PSW-Primality-Test.md) give very high confidence but no
proof. Pocklington's theorem (1914) gives a definitive proof, provided you can
factor a large enough part of `n − 1`. It's the classic tool for proving the
primality of numbers with special structure, where `n − 1` factors easily.

## How it works

Write `n − 1 = F · R` where `F` is the part you've fully factored. Pocklington's
theorem says **`n` is prime** if:

- `F > √n`, and
- there's a base `a` with `aⁿ⁻¹ ≡ 1 (mod n)`, and for every prime `q` dividing
  `F`, `gcd(a^((n−1)/q) − 1, n) = 1`.

The factored part `F` only needs to exceed `√n`, not all of `n − 1` — that's what
makes the test usable. The two conditions force the order of `a` to pin down `n`
as prime.

## When to use it

- **Proving primality of structured numbers** — e.g. numbers where `n − 1` is
  smooth, or proof-with-certificate work in number theory.
- **Not for arbitrary numbers** — if you can't factor enough of `n − 1`, it
  doesn't apply; use a general method (ECPP) or settle for
  [Baillie-PSW](Baillie-PSW-Primality-Test.md).

## Example (Python)

Given `n`, the factored part `F`, the prime factors of `F`, and a base `a`:

```python
from math import gcd, isqrt

def pocklington(n, F, prime_factors_F, a):
    if pow(a, n - 1, n) != 1:                       # Fermat condition
        return False
    for q in prime_factors_F:
        if gcd(pow(a, (n - 1) // q, n) - 1, n) != 1:
            return False
    return F > isqrt(n)                             # factored part must exceed sqrt(n)

# n = 65537, n-1 = 2^16, so F = 65536 (prime factor {2}), base a = 3
assert pocklington(65537, 65536, [2], 3) is True
```

## Notes

- A `True` result is a **proof**, not a probability — the value of the test.
- The bottleneck is factoring `F`; the test is only as reachable as that
  factorization.
- Repeatedly proving the prime factors of `F` prime too yields a full primality
  *certificate* anyone can recheck.

## See also

- [Miller-Rabin](Miller-Rabin-Primality-Test.md) / [Baillie-PSW](Baillie-PSW-Primality-Test.md) — fast tests without proof
- [Fermat Primes](Fermat-Primes.md) — Pépin's test is a Pocklington-style proof for `2^(2^n)+1`

## References

- Pocklington, H. C. (1914/1916). Proc. Cambridge Philos. Soc.
- [Pocklington primality test — Wikipedia](https://en.wikipedia.org/wiki/Pocklington_primality_test)
