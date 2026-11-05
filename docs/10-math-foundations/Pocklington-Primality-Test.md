# Pocklington Primality Test

*A way to actually **prove** a number prime — not just "probably" — when you can
factor enough of $n - 1$.*

## What it is

Probabilistic tests like [Miller-Rabin](Miller-Rabin-Primality-Test.md) and
[Baillie-PSW](Baillie-PSW-Primality-Test.md) give very high confidence but no
proof. Pocklington's theorem (1914) gives a definitive proof, provided you can
factor a large enough part of $n - 1$. It's the classic tool for proving the
primality of numbers with special structure, where $n - 1$ factors easily.

## The story

- **Who made it:** Henry Cabourn Pocklington, an English physicist and mathematician, 1914; extended by Derrick Lehmer in 1927.
- **What for:** Proving, not just testing, that a number is prime.
- **What it solved:** Probabilistic tests leave a tiny doubt; Pocklington gives a certificate anyone can check.
- **Where it stands:** Used to make provable primes, for example in FIPS 186's Shawe-Taylor method.
- **Incidents:** Not applicable.

## How it works

Write $n - 1 = F \cdot R$ where $F$ is the part you've fully factored. Pocklington's
theorem says **$n$ is prime** if:

- $F > \sqrt{n}$, and
- there's a base $a$ with $a^{n-1} \equiv 1 \pmod{n}$, and for every prime $q$ dividing
  $F$, $\gcd(a^{(n-1)/q} - 1, n) = 1$.

The factored part $F$ only needs to exceed $\sqrt{n}$, not all of $n - 1$ — that's what
makes the test usable. The two conditions force the order of $a$ to pin down $n$
as prime.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 290" role="img" aria-labelledby="sk-c-pock-t"><title id="sk-c-pock-t">A bar for n minus 1 split into a fully factored part F and the rest R, with F much larger than the square root of n</title><defs><filter id="sk-c-pock-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-pock-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-pock-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-pock-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-pock-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="290" filter="url(#sk-c-pock-paper)"/><g filter="url(#sk-c-pock-pen)"><text x="30" y="44" class="h">Factor enough of n − 1, not all of it</text><text x="40" y="96" class="s">example: n = 10,007, so n − 1 = 10,006 = 2 × 5,003</text><path class="p gold" d="M40 130 L521 130 L521 170 L40 170Z" style="fill-opacity:.6"/><text x="280" y="156" text-anchor="middle" class="s">F = 5,003</text><path class="p room" d="M521 130 L560 130 L560 170 L521 170Z"/><text x="540" y="122" text-anchor="middle" class="s">R = 2</text><path class="p red" d="M300 116 L300 184"/><text x="306" y="204" class="s">√n ≈ 100: halfway on this scale</text><text x="40" y="250" class="s">F is far larger than √n. Then one base a with aⁿ⁻¹ ≡ 1 and gcd(a^((n−1)/q) − 1, n) = 1 for each</text><text x="40" y="270" class="s">prime q dividing F proves n prime: a certificate anyone can recheck.</text></g></svg><figcaption>Sketched for this page. Lengths are logarithms, so multiplying becomes adding.</figcaption></figure>

## When to use it

- **Proving primality of structured numbers** — e.g. numbers where $n - 1$ is
  smooth, or proof-with-certificate work in number theory.
- **Not for arbitrary numbers** — if you can't factor enough of $n - 1$, it
  doesn't apply; use a general method (ECPP) or settle for
  [Baillie-PSW](Baillie-PSW-Primality-Test.md).

## Example (Python)

Given $n$, the factored part $F$, the prime factors of $F$, and a base $a$:

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
- The bottleneck is factoring $F$; the test is only as reachable as that
  factorization.
- Repeatedly proving the prime factors of $F$ prime too yields a full primality
  *certificate* anyone can recheck.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: proving 1009 prime"

    $n - 1 = 1008 = 2^4 \cdot 3^2 \cdot 7$. We only need a factored part bigger than $\sqrt{1009} \approx 31.8$, so take
    $F = 2^4 \cdot 7 = 112$ and leave $R = 9$. Its prime factors are $q = 2$ and $q = 7$. Try $a = 11$:

    | Check | Calculation | Result |
    |---|---|---|
    | $F > \sqrt{n}$ | $112 > 31.8$ | yes |
    | Fermat | $11^{1008} \bmod 1009$ | 1 |
    | $q = 2$ | $11^{504} \bmod 1009 = 1008$, $\gcd(1007, 1009)$ | 1 |
    | $q = 7$ | $11^{144} \bmod 1009 = 935$, $\gcd(934, 1009)$ | 1 |

    All conditions hold, so **1009 is prime**: a proof, not a probability. The certificate is just
    ($F$'s factors, $a = 11$), which anyone can recheck in a moment.

??? abstract "The math, with formulas"

    **Pocklington–Lehmer theorem.** Let $n - 1 = F \cdot R$ with $F$'s prime factors known and $\gcd(F, R) = 1$.
    If for some $a$:

    $$
    a^{n-1} \equiv 1 \pmod{n} \quad\text{and}\quad \gcd(a^{(n-1)/q} - 1, n) = 1 \ \text{ for every prime } q \mid F
    $$

    then every prime factor $p$ of $n$ satisfies $p \equiv 1 \pmod{F}$. If also $F > \sqrt{n}$, $n$ is prime.

    **Why:** let $p$ be a prime factor of $n$ and look at $a$'s order modulo $p$. It divides $n - 1$, and the gcd
    condition says it doesn't divide $(n - 1)/q$ for any $q$, so $F$ divides it. The order also divides $p - 1$,
    so $p \ge F + 1 > \sqrt{n}$. A composite $n$ must have a prime factor $\le \sqrt{n}$, so $n$ has no proper factor.

    **Brillhart–Lehmer–Selfridge (1975)** lower the bar to $F \ge n^{1/3}$ with extra checks, and the
    **$n + 1$ methods** (Lucas sequences) do the same with a factored part of $n + 1$.

??? tip "Watch it step by step: 11¹⁴⁴ mod 1009"

    The $q = 7$ check needs $11^{1008/7} = 11^{144} \bmod 1009$. Press Play or Step to build it bit by bit.

    <div class="mars-modexp" data-base="11" data-exp="144" data-mod="1009" data-label="Pocklington check for q = 7: 11¹⁴⁴ mod 1009"></div>

??? info "The math underneath"

    - **Order of an element:** the smallest $k$ with $a^k \equiv 1$; it divides every exponent that gives 1
      (Lagrange's theorem in the group $(\mathbb{Z}/p\mathbb{Z})^*$).
    - **Primality certificates:** Pratt (1975) showed every prime has a short certificate this way, using
      recursion on the factors of $n - 1$; this puts PRIMES in NP.
    - **Proth's theorem** ($k \cdot 2^m + 1$) and **Pépin's test** ([Fermat primes](Fermat-Primes.md)) are special
      cases.
    - **General proofs:** ECPP replaces the group $(\mathbb{Z}/n\mathbb{Z})^*$ with an elliptic curve so that a suitable group
      order can always be found; AKS (2002) proved primality testing is in P.

## See also

- [Miller-Rabin](Miller-Rabin-Primality-Test.md) / [Baillie-PSW](Baillie-PSW-Primality-Test.md) — fast tests without proof
- [Fermat Primes](Fermat-Primes.md) — Pépin's test is a Pocklington-style proof for $2^{2^n} + 1$

## References

- Pocklington, H. C. (1914/1916). Proc. Cambridge Philos. Soc.
- [Pocklington primality test — Wikipedia](https://en.wikipedia.org/wiki/Pocklington_primality_test)
