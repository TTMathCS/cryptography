# Miller-Rabin Primality Test

*The practical workhorse for checking whether a big number is prime — fast,
probabilistic, and what generates the primes inside [RSA](../02-signatures/RSA.md) and
[DSA](../02-signatures/DSA.md).*

## What it is

Given a number `n` with hundreds of digits, you can't trial-divide it.
Miller-Rabin answers "is `n` prime?" quickly by testing it against random
*witnesses*. Each round either proves `n` composite or adds confidence it's
prime. It can't prove primality outright, but the chance of a wrong "prime"
answer drops to 4⁻ᵏ after `k` rounds — run 40 rounds and that's negligible.

It never gives a false "composite": a composite verdict is always correct.

## How it works

It refines Fermat's little theorem (`aⁿ⁻¹ ≡ 1 mod n` for prime `n`) with one
extra fact — a prime has no nontrivial square root of 1.

1. Write `n − 1 = d·2ʳ` with `d` odd.
2. For a random base `a`, compute `x = aᵈ mod n`. If `x` is `1` or `n−1`, the
   round passes.
3. Otherwise square `x` up to `r−1` times; if it ever hits `n−1`, the round passes.
4. If it never does, `n` is **composite** and `a` is a witness.

## When to use it

- **Generating cryptographic primes** — the standard step in RSA/DSA key
  generation. See [RSA](../02-signatures/RSA.md).
- **Quickly screening large candidates** before any heavier work.
- For a no-known-false-positive answer at similar speed, use
  [Baillie-PSW](Baillie-PSW-Primality-Test.md); for a deterministic *proof* on
  special forms, see [Pocklington](Pocklington-Primality-Test.md).

## Example (Python)

Verified against a sieve for every `n` up to 100,000.

```python
from secrets import randbelow

def is_probable_prime(n, rounds=40):
    if n < 2: return False
    for p in (2,3,5,7,11,13,17,19,23,29,31,37):
        if n % p == 0: return n == p
    d, r = n - 1, 0
    while d % 2 == 0: d //= 2; r += 1
    for _ in range(rounds):
        a = 2 + randbelow(n - 3)
        x = pow(a, d, n)
        if x == 1 or x == n - 1: continue
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1: break
        else:
            return False        # a is a witness: n is composite
    return True
```

## Security notes

- Use a cryptographic RNG for the bases and enough rounds (≥40 for key generation).
- For `n` below fixed bounds, specific small base sets make the test
  *deterministic* — e.g. bases {2,3,5,7,11,13,17,19,23,29,31,37} are exact for
  `n` below 3.3×10²⁴.
- "Strong pseudoprimes" that fool one base exist, which is why multiple random
  bases matter — see [why randomness matters](../FAQ.md).

## See also

- [Baillie-PSW](Baillie-PSW-Primality-Test.md) — Miller-Rabin plus a Lucas test
- [Sieve of Eratosthenes](Sieve-of-Eratosthenes.md) — for listing many small primes
- [RSA](../02-signatures/RSA.md) — the main consumer of this test

## References

- Rabin, M. O. (1980). "Probabilistic algorithm for testing primality"
- [Miller–Rabin primality test — Wikipedia](https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test)
