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

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: proving 1009 prime"

    `n − 1 = 1008 = 2⁴ · 3² · 7`. We only need a factored part bigger than `√1009 ≈ 31.8`, so take
    `F = 2⁴ · 7 = 112` and leave `R = 9`. Its prime factors are q = 2 and q = 7. Try a = 11:

    | Check | Calculation | Result |
    |---|---|---|
    | F > √n | 112 > 31.8 | yes |
    | Fermat | `11¹⁰⁰⁸ mod 1009` | 1 |
    | q = 2 | `11⁵⁰⁴ mod 1009 = 1008`, `gcd(1007, 1009)` | 1 |
    | q = 7 | `11¹⁴⁴ mod 1009 = 935`, `gcd(934, 1009)` | 1 |

    All conditions hold, so **1009 is prime**: a proof, not a probability. The certificate is just
    (F's factors, a = 11), which anyone can recheck in a moment.

??? abstract "The math, with formulas"

    **Pocklington–Lehmer theorem.** Let `n − 1 = F · R` with F's prime factors known and `gcd(F, R) = 1`.
    If for some a:

    ```
    a^(n−1) ≡ 1 (mod n)    and    gcd(a^((n−1)/q) − 1, n) = 1  for every prime q | F
    ```

    then every prime factor p of n satisfies `p ≡ 1 (mod F)`. If also `F > √n`, n is prime.

    **Why:** let p be a prime factor of n and look at a's order modulo p. It divides `n − 1`, and the gcd
    condition says it doesn't divide `(n − 1)/q` for any q, so F divides it. The order also divides `p − 1`,
    so `p ≥ F + 1 > √n`. A composite n must have a prime factor `≤ √n`, so n has no proper factor.

    **Brillhart–Lehmer–Selfridge (1975)** lower the bar to `F ≥ n^(1/3)` with extra checks, and the
    **n + 1 methods** (Lucas sequences) do the same with a factored part of `n + 1`.

??? tip "Watch it step by step: 11¹⁴⁴ mod 1009"

    The q = 7 check needs `11^(1008/7) = 11¹⁴⁴ mod 1009`. Press Play or Step to build it bit by bit.

    <div class="mars-modexp" data-base="11" data-exp="144" data-mod="1009" data-label="Pocklington check for q = 7: 11¹⁴⁴ mod 1009"></div>

??? info "The math underneath"

    - **Order of an element:** the smallest k with `aᵏ ≡ 1`; it divides every exponent that gives 1
      (Lagrange's theorem in the group `(Z/pZ)*`).
    - **Primality certificates:** Pratt (1975) showed every prime has a short certificate this way, using
      recursion on the factors of `n − 1`; this puts PRIMES in NP.
    - **Proth's theorem** (`k · 2ᵐ + 1`) and **Pépin's test** ([Fermat primes](Fermat-Primes.md)) are special
      cases.
    - **General proofs:** ECPP replaces the group `(Z/nZ)*` with an elliptic curve so that a suitable group
      order can always be found; AKS (2002) proved primality testing is in P.

## See also

- [Miller-Rabin](Miller-Rabin-Primality-Test.md) / [Baillie-PSW](Baillie-PSW-Primality-Test.md) — fast tests without proof
- [Fermat Primes](Fermat-Primes.md) — Pépin's test is a Pocklington-style proof for `2^(2^n)+1`

## References

- Pocklington, H. C. (1914/1916). Proc. Cambridge Philos. Soc.
- [Pocklington primality test — Wikipedia](https://en.wikipedia.org/wiki/Pocklington_primality_test)
