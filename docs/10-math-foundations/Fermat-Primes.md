# Fermat Primes

*Primes of the form `2^(2^n) + 1`. Only five are known, and one of them — 65537 —
is the standard RSA public exponent.*

## What it is

A Fermat number is `Fₙ = 2^(2^n) + 1`, named after Pierre de Fermat
(1601–1665). Fermat conjectured all of them were prime; he was wrong. Only five
Fermat primes are known, and it's conjectured there are no others.

## The known Fermat primes

| `n` | `Fₙ = 2^(2^n) + 1` | Value | Status |
|-----|--------------------|-------|--------|
| 0 | `2¹ + 1` | 3 | prime |
| 1 | `2² + 1` | 5 | prime |
| 2 | `2⁴ + 1` | 17 | prime |
| 3 | `2⁸ + 1` | 257 | prime |
| 4 | `2¹⁶ + 1` | 65537 | prime |
| 5 | `2³² + 1` | 4294967297 = 641 × 6700417 | **composite** |

Every Fermat number from `F₅` through `F₃₂` checked so far is composite, so the
five above may be the only Fermat primes that exist.

## How they're tested

**Pépin's test** is a clean primality proof specific to Fermat numbers: for
`n ≥ 1`, `Fₙ` is prime iff `3^((Fₙ − 1)/2) ≡ −1 (mod Fₙ)`. It's a
[Pocklington](Pocklington-Primality-Test.md)-style proof, since `Fₙ − 1` is a
pure power of two and so trivially factored.

```python
def pepin(n):                       # tests F_n for n >= 1
    F = (1 << (1 << n)) + 1
    return pow(3, (F - 1) // 2, F) == F - 1
```

Verified: `True` for `n ∈ {1,2,3,4}` and `False` for `n = 5`.

## Where they show up

- **RSA's public exponent `e = 65537 = F₄`** — its binary form `10000000000000001`
  has just two set bits, so `mᵉ` is fast to compute, while being large enough to
  avoid small-exponent pitfalls. See [RSA](../02-signatures/RSA.md).
- **Constructible polygons (Gauss–Wantzel)** — a regular polygon is
  straightedge-and-compass constructible iff its side count is a power of two times
  distinct Fermat primes. So the 3-, 5-, 17-, 257-, and 65537-gons are constructible.
- **Pairwise coprime** — no two Fermat numbers share a factor, which gives a neat
  proof that there are infinitely many primes.

## See also

- [RSA](../02-signatures/RSA.md) — uses `F₄ = 65537` as the public exponent
- [Mersenne Primes](Mersenne-Primes.md) — the other structured-prime family
- [Pocklington](Pocklington-Primality-Test.md) — the proof technique behind Pépin's test

## References

- [Fermat number — Wikipedia](https://en.wikipedia.org/wiki/Fermat_number)
- [Pépin's test — Wikipedia](https://en.wikipedia.org/wiki/P%C3%A9pin%27s_test)
