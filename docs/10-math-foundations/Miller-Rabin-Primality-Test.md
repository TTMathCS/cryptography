# Miller-Rabin Primality Test

*The practical workhorse for checking whether a big number is prime — fast,
probabilistic, and what generates the primes inside [RSA](../02-signatures/RSA.md) and
[DSA](../02-signatures/DSA.md).*

## What it is

Given a number $n$ with hundreds of digits, you can't trial-divide it.
Miller-Rabin answers "is $n$ prime?" quickly by testing it against random
*witnesses*. Each round either proves $n$ composite or adds confidence it's
prime. It can't prove primality outright, but the chance of a wrong "prime"
answer drops to $4^{-k}$ after $k$ rounds — run 40 rounds and that's negligible.

It never gives a false "composite": a composite verdict is always correct.

## The story

- **Who made it:** Gary Miller (1976, a deterministic test that assumes the generalized Riemann hypothesis) and Michael Rabin (1980, who made it probabilistic and proved it unconditionally). It builds on Fermat's little theorem (1640).
- **What for:** Telling quickly whether a huge number is prime.
- **What it solved:** RSA and DH need primes of hundreds of digits; trial division can't handle them.
- **Where it stands:** Used in every crypto library, usually with a Lucas test as well (Baillie-PSW).
- **Incidents:** **Prime and Prejudice (2018):** Albrecht, Massimo, Paterson and Somorovsky built composite numbers that passed the fixed or too-few Miller-Rabin rounds in several libraries. Where an attacker can supply the number, for example DH parameters, use random bases and enough rounds.

## How it works

It refines Fermat's little theorem ($a^{n-1} \equiv 1 \pmod{n}$ for prime $n$) with one
extra fact — a prime has no nontrivial square root of 1.

1. Write $n - 1 = d \cdot 2^r$ with $d$ odd.
2. For a random base $a$, compute $x = a^d \bmod n$. If $x$ is $1$ or $n-1$, the
   round passes.
3. Otherwise square $x$ up to $r-1$ times; if it ever hits $n-1$, the round passes.
4. If it never does, $n$ is **composite** and $a$ is a witness.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 290" role="img" aria-labelledby="sk-c-mr561-t"><title id="sk-c-mr561-t">Miller-Rabin on 561 with base 2: the values 263, 166, 67 and 1 by repeated squaring; reaching 1 from 67 instead of from minus 1 proves 561 composite</title><defs><filter id="sk-c-mr561-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-mr561-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-mr561-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-mr561-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-mr561-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="290" filter="url(#sk-c-mr561-paper)"/><g filter="url(#sk-c-mr561-pen)"><text x="30" y="44" class="h">561 caught by a square root of 1</text><text x="30" y="90" class="s">n − 1 = 560 = 35 × 2⁴. Base a = 2. Start with 2³⁵ mod 561, then keep squaring:</text><circle cx="60" cy="170" r="30" class="p room"/><text x="60" y="177" text-anchor="middle" class="l">263</text><path class="p " d="M92 170 L166 170" marker-end="url(#sk-c-mr561-ah)"/><text x="130" y="160" text-anchor="middle" class="s">square</text><circle cx="200" cy="170" r="30" class="p room"/><text x="200" y="177" text-anchor="middle" class="l">166</text><path class="p " d="M232 170 L306 170" marker-end="url(#sk-c-mr561-ah)"/><text x="270" y="160" text-anchor="middle" class="s">square</text><circle cx="340" cy="170" r="30" class="p red" style="fill:#a03a2a;fill-opacity:.25"/><text x="340" y="177" text-anchor="middle" class="l">67</text><path class="p " d="M372 170 L446 170" marker-end="url(#sk-c-mr561-ah)"/><text x="410" y="160" text-anchor="middle" class="s">square</text><circle cx="480" cy="170" r="30" class="p gold"/><text x="480" y="177" text-anchor="middle" class="l">1</text><text x="30" y="250" class="s">67 squared is 1, yet 67 is neither 1 nor 560 (that is, −1). A prime has no such square root of 1,</text><text x="30" y="270" class="s">so 561 is composite, and 2 is the witness. (561 = 3 × 11 × 17 fools the plain Fermat test.)</text></g></svg><figcaption>Sketched for this page. Computed.</figcaption></figure>

<figure class="play" data-play="mrwitness"><span class="ai-tag">AI-created</span><figcaption>Try it: every base from 2 up, tested by Miller-Rabin. Gold bases say probably prime, red ones prove n composite. Carmichael numbers like 561 and 1105 no longer fool it.</figcaption></figure>

## When to use it

- **Generating cryptographic primes** — the standard step in RSA/DSA key
  generation. See [RSA](../02-signatures/RSA.md).
- **Quickly screening large candidates** before any heavier work.
- For a no-known-false-positive answer at similar speed, use
  [Baillie-PSW](Baillie-PSW-Primality-Test.md); for a deterministic *proof* on
  special forms, see [Pocklington](Pocklington-Primality-Test.md).

## Example (Python)

Verified against a sieve for every $n$ up to 100,000.

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
- For $n$ below fixed bounds, specific small base sets make the test
  *deterministic* — e.g. bases $\{2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37\}$ are exact for
  $n$ below $3.18 \times 10^{23}$, and adding 41 makes it $3.3 \times 10^{24}$ (Sorenson and Webster,
  2017). 318665857834031151167461 passes all twelve bases yet is
  $399165290221 \times 798330580441$.
- "Strong pseudoprimes" that fool one base exist, which is why multiple random
  bases matter — see [why randomness matters](../FAQ.md).

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: catching 561, passing 97"

    **$n = 561$**, the smallest Carmichael number: it passes the plain Fermat test for every base coprime to
    it. Miller-Rabin with base 2: $560 = 35 \cdot 2^4$, so $d = 35$ and $r = 4$.

    | Step | Calculation | Value mod 561 |
    |---|---|---|
    | Start | $2^{35}$ | 263 |
    | Square 1 | $263^2$ | 166 |
    | Square 2 | $166^2$ | 67 |
    | Square 3 | $67^2$ | 1 |

    The run reached 1 without passing through 560 (that is, $-1$). So 67 is a square root of 1 that is
    neither $1$ nor $-1$, which a prime can't have: **561 is composite**. As a bonus,
    $\gcd(67 - 1, 561) = 33$ and $\gcd(67 + 1, 561) = 17$ split it ($561 = 3 \cdot 11 \cdot 17$).

    **$n = 97$**, base 5: $96 = 3 \cdot 2^5$. The run is 28, 8, 64, 22, 96, and $96 \equiv -1 \pmod{97}$, so the round
    passes. 97 is prime.

??? abstract "The math, with formulas"

    Write $n - 1 = d \cdot 2^r$ with $d$ odd. For a prime $n$ and any base $a$ not divisible by $n$,
    Fermat gives $a^{n-1} \equiv 1$, and since the only square roots of $1$ modulo a prime are $\pm 1$,
    the sequence

    $$
    a^{d},\; a^{2d},\; a^{4d},\; \ldots,\; a^{2^{r-1} d} \pmod{n}
    $$

    either starts at $1$ or contains $-1$. $n$ is a **strong probable prime to base $a$** if

    $$
    a^{d} \equiv 1 \pmod{n} \quad\text{or}\quad a^{2^{j} d} \equiv -1 \pmod{n} \ \text{ for some } 0 \le j < r
    $$

    - **Error bound (Rabin, Monier, 1980):** for odd composite $n > 9$, at most $\varphi(n)/4$ bases in $1, \ldots, n-1$
      pass ($n = 9$ has 2 of 8, still a quarter), so $k$ random bases leave an error of at most $4^{-k}$. For random large candidates the real error is far smaller.
    - **Fixed bases:** the first 13 primes as bases (2 through 41) give a correct answer for every
      $n < 3.3 \cdot 10^{24}$ (Sorenson and Webster, 2017).
    - **Cost:** one modular exponentiation per round, about $\log_2 n$ squarings.

??? tip "Watch it step by step: 2³⁵ mod 561"

    Press Play or Step to see the first number of the run, $2^{35} \bmod 561 = 263$, built by
    square-and-multiply. Squaring 263 three more times gives 166, 67 and then 1.

    <div class="mars-modexp" data-base="2" data-exp="35" data-mod="561" data-label="Miller-Rabin start: 2³⁵ mod 561"></div>

??? info "The math underneath"

    - **Fermat's little theorem:** $a^{p-1} \equiv 1 \pmod{p}$ for prime $p$.
    - **Square roots of 1:** modulo a prime, $x^2 \equiv 1$ forces $x \equiv \pm 1$, because $p$ divides $(x - 1)(x + 1)$.
      Modulo a composite with two odd prime factors there are at least four roots.
    - **Carmichael numbers** (Korselt's criterion: $n$ is squarefree and $(p - 1) \mid (n - 1)$ for every
      prime $p$ dividing $n$) fool Fermat for every coprime base but not Miller-Rabin.
    - **Under the generalized Riemann hypothesis**, testing every base up to $2 (\ln n)^2$ would be a proof
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
