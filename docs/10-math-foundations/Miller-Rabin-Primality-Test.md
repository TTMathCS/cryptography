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
  `n` below 3.18×10²³, and adding 41 makes it 3.3×10²⁴ (Sorenson and Webster,
  2017). 318665857834031151167461 passes all twelve bases yet is
  399165290221 × 798330580441.
- "Strong pseudoprimes" that fool one base exist, which is why multiple random
  bases matter — see [why randomness matters](../FAQ.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: catching 561, passing 97"

    **n = 561**, the smallest Carmichael number: it passes the plain Fermat test for every base coprime to
    it. Miller-Rabin with base 2: `560 = 35 · 2⁴`, so d = 35 and r = 4.

    | Step | Calculation | Value mod 561 |
    |---|---|---|
    | Start | `2³⁵` | 263 |
    | Square 1 | `263²` | 166 |
    | Square 2 | `166²` | 67 |
    | Square 3 | `67²` | 1 |

    The run reached 1 without passing through 560 (that is, −1). So 67 is a square root of 1 that is
    neither 1 nor −1, which a prime can't have: **561 is composite**. As a bonus,
    `gcd(67 − 1, 561) = 33` and `gcd(67 + 1, 561) = 17` split it (561 = 3 · 11 · 17).

    **n = 97**, base 5: `96 = 3 · 2⁵`. The run is 28, 8, 64, 22, 96, and 96 is −1 mod 97, so the round
    passes. 97 is prime.

??? abstract "The math, with formulas"

    Write `n − 1 = d · 2ʳ` with d odd. For a prime n and any base a not divisible by n, Fermat gives
    `a^(n−1) ≡ 1`, and since the only square roots of 1 modulo a prime are ±1, the sequence

    ```
    a^d,  a^(2d),  a^(4d),  …,  a^(2^(r−1)·d)        (mod n)
    ```

    either starts at 1 or contains −1. n is a **strong probable prime to base a** if

    ```
    a^d ≡ 1 (mod n)    or    a^(2^j · d) ≡ −1 (mod n)  for some 0 ≤ j < r
    ```

    - **Error bound (Rabin, Monier, 1980):** for odd composite n, at most φ(n)/4 bases in 1 … n−1 pass, so
      k random bases leave an error of at most 4⁻ᵏ. For random large candidates the real error is far smaller.
    - **Fixed bases:** the first 13 primes as bases (2 through 41) give a correct answer for every
      n < 3.3 · 10²⁴ (Sorenson and Webster, 2015).
    - **Cost:** one modular exponentiation per round, about `log₂ n` squarings.

??? tip "Watch it step by step: 2³⁵ mod 561"

    Press Play or Step to see the first number of the run, `2³⁵ mod 561 = 263`, built by
    square-and-multiply. Squaring 263 three more times gives 166, 67 and then 1.

    <div class="mars-modexp" data-base="2" data-exp="35" data-mod="561" data-label="Miller-Rabin start: 2³⁵ mod 561"></div>

??? info "The math underneath"

    - **Fermat's little theorem:** `a^(p−1) ≡ 1 (mod p)` for prime p.
    - **Square roots of 1:** modulo a prime, `x² ≡ 1` forces `x ≡ ±1`, because p divides `(x − 1)(x + 1)`.
      Modulo a composite with two odd prime factors there are at least four roots.
    - **Carmichael numbers** (Korselt's criterion: n is squarefree and `p − 1 | n − 1` for every prime p
      dividing n) fool Fermat for every coprime base but not Miller-Rabin.
    - **Under the generalized Riemann hypothesis**, testing every base up to `2(ln n)²` would be a proof
      (Miller 1976, Bach 1990).
    - Used in: [RSA](../02-signatures/RSA.md) and [DSA](../02-signatures/DSA.md) key generation (FIPS 186-5).

## See also

- [Baillie-PSW](Baillie-PSW-Primality-Test.md) — Miller-Rabin plus a Lucas test
- [Sieve of Eratosthenes](Sieve-of-Eratosthenes.md) — for listing many small primes
- [RSA](../02-signatures/RSA.md) — the main consumer of this test

## References

- [Sorenson and Webster, "Strong pseudoprimes to twelve prime bases", Mathematics of Computation 86 (2017)](https://arxiv.org/abs/1509.00864)
- Rabin, M. O. (1980). "Probabilistic algorithm for testing primality"
- [Miller–Rabin primality test — Wikipedia](https://en.wikipedia.org/wiki/Miller%E2%80%93Rabin_primality_test)
