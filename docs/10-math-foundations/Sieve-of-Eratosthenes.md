# Sieve of Eratosthenes

*The classic way to list every prime up to some limit — cross out the multiples
and whatever's left is prime.*

## What it is

An algorithm from ancient Greece (Eratosthenes, ~250 BCE) that finds all primes
up to `n`. Instead of testing each number on its own, it marks the multiples of
each prime as composite and collects what remains. It's the right tool when you
want *many* small primes at once; for testing a single huge number, use
[Miller-Rabin](Miller-Rabin-Primality-Test.md) instead.

## How it works

Start with every number from 2 to `n` assumed prime, then:

- Take the next number still marked prime (start at 2).
- Cross out all its multiples, beginning at its square (smaller multiples were
  already crossed out by smaller primes).
- Repeat up to `√n` — past that, every remaining composite is already crossed out.

It runs in `O(n log log n)` time, close to linear, using one bit (or byte) per
number for `O(n)` space.

## When to use it

- **Listing all primes below a limit** — trial-division tables, number-theory
  experiments, project-Euler-style problems.
- **A range of primes too big to hold at once** — a *segmented sieve* sieves
  `[lo, hi]` in `O(√hi)` memory.
- **Not** for deciding whether one large number is prime — sieving up to it is
  hopeless. That's [Miller-Rabin](Miller-Rabin-Primality-Test.md)'s job.

## Example (Python)

```python
from math import isqrt

def sieve(n):
    is_p = bytearray([1]) * (n + 1)
    is_p[0] = is_p[1] = 0
    for i in range(2, isqrt(n) + 1):
        if is_p[i]:
            is_p[i*i::i] = bytearray(len(is_p[i*i::i]))   # cross out multiples
    return [i for i in range(n + 1) if is_p[i]]
```

`sieve(30)` returns `[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]`.

## Notes

- Start crossing out at `i*i`, not `2*i` — multiples below `i²` already have a
  smaller prime factor.
- Sieving only odd numbers halves the memory; a wheel that also skips multiples
  of 3 and 5 trims it further.
- The sieve is often the first stage that feeds candidates into stronger tests.

## See also

- [Miller-Rabin](Miller-Rabin-Primality-Test.md) — for individual large numbers
- [Mersenne Primes](Mersenne-Primes.md) / [Fermat Primes](Fermat-Primes.md) — special prime forms

## References

- [Sieve of Eratosthenes — Wikipedia](https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)
