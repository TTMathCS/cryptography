# Mersenne Primes

*Primes of the form $2^p - 1$. They have a uniquely fast primality test, which is
why the largest known primes are almost always Mersenne primes.*

## What it is

A Mersenne number is $M_p = 2^p - 1$. When it's prime, it's a Mersenne prime,
named after Marin Mersenne (1588–1648). For $M_p$ to be prime, the exponent $p$
must itself be prime — but that's not enough (e.g. $M_{11} = 2047 = 23 \times 89$ is
composite). They matter here because the [Lucas-Lehmer test](#how-its-tested)
checks them far faster than any general method, making them the perennial
record-holders for "largest known prime."

## The story

- **Who made it:** Named after Marin Mersenne, a French friar, who listed exponents in 1644 (with mistakes). Édouard Lucas found the test in 1876 and proved $M_{127}$ prime; Derrick Lehmer completed it in 1930. George Woltman started GIMPS, the volunteer search, in 1996.
- **What for:** Finding record primes.
- **What it solved:** The Lucas-Lehmer test makes them much faster to check than any other number of the same size.
- **Where it stands:** The largest known prime, $M_{136279841}$ with over 41 million digits, was found in October 2024 by Luke Durant using cloud GPUs. Mersenne-like primes are used in elliptic curves ($2^{255} - 19$, $2^{521} - 1$).
- **Incidents:** Not applicable.

## Why p must be prime

If $p = a \cdot b$ with $a, b > 1$, then $2^a - 1$ divides $2^p - 1$, so $M_p$ is
composite. Hence a prime $M_p$ forces a prime exponent $p$.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 290" role="img" aria-labelledby="sk-c-mersenne-t"><title id="sk-c-mersenne-t">Sixty-three, written in binary as six ones, splits into three blocks of 11 or two blocks of 111, showing it is divisible by 3 and by 7</title><defs><filter id="sk-c-mersenne-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-mersenne-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-mersenne-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-mersenne-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-mersenne-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="290" filter="url(#sk-c-mersenne-paper)"/><g filter="url(#sk-c-mersenne-pen)"><text x="30" y="44" class="h">A run of 6 ones splits into blocks</text><text x="40" y="110" style="font-family:'IBM Plex Mono',monospace;font-size:15px;fill:#3a2a1e">2⁶ − 1 = 111111 (binary) = 63</text><text x="40" y="160" style="font-family:'IBM Plex Mono',monospace;font-size:15px;fill:#3a2a1e">111111 = 11 × 010101   (3 × 21)</text><text x="40" y="200" style="font-family:'IBM Plex Mono',monospace;font-size:15px;fill:#3a2a1e">111111 = 111 × 001001  (7 × 9)</text><text x="40" y="250" class="s">A run of ab ones is always a run of a ones repeated b times, so 2ᵃ − 1 divides 2^(ab) − 1.</text><text x="40" y="270" class="s">Only a prime p can give a Mersenne prime 2ᵖ − 1, and even then it often does not: 2¹¹ − 1 = 23 × 89.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## How it's tested

The **Lucas-Lehmer test** is specific to Mersenne numbers and very efficient. For
odd prime $p$, $M_p$ is prime iff the sequence $s_0 = 4$, $s_{i+1} = s_i^2 - 2$
satisfies $s_{p-2} \equiv 0 \pmod{M_p}$:

```python
def lucas_lehmer(p):
    if p == 2: return True
    m = (1 << p) - 1
    s = 4
    for _ in range(p - 2):
        s = (s * s - 2) % m
    return s == 0
```

Verified: returns `True` for $p \in \{2, 3, 5, 7, 13, 17, 19, 31, 61, 89\}$ and `False` for
$\{11, 23, 29, 37, 41, 43\}$.

## When they come up

- **Largest-known-prime records and the GIMPS distributed search** — fast testing
  makes record hunts practical.
- **Perfect numbers** — every even perfect number is $2^{p-1}(2^p - 1)$ for a
  Mersenne prime $2^p - 1$ (Euclid–Euler).
- They are mathematical landmarks; they aren't directly used as cryptographic keys
  (RSA needs *random* primes — see [RSA](../02-signatures/RSA.md)).

## Status

As of 2024, **52 Mersenne primes are known**. The largest, $2^{136{,}279{,}841} - 1$
(about 41 million digits), was found by GIMPS in October 2024 and is the largest
known prime of any kind. The first few exponents are $p = 2, 3, 5, 7, 13, 17, 19$.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Lucas-Lehmer on M₇ and M₁₁"

    | $i$ | $s_i \bmod 127$ ($p = 7$) | $s_i \bmod 2047$ ($p = 11$) |
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

    $s_5 \equiv 0 \pmod{127}$, so 127 is prime. $s_9 \not\equiv 0 \pmod{2047}$, so 2047 is composite, and its factors fit
    the rule below: $23 = 1 \cdot 22 + 1$ and $89 = 4 \cdot 22 + 1$.

??? abstract "The math, with formulas"

    - **Lucas-Lehmer:** for an odd prime $p$, $M_p = 2^p - 1$ is prime if and only if
      $s_{p-2} \equiv 0 \pmod{M_p}$, where $s_0 = 4$ and $s_{i+1} = s_i^2 - 2$.
    - **Closed form:** $s_i = \omega^{2^i} + \bar{\omega}^{2^i}$ with $\omega = 2 + \sqrt{3}$, $\bar{\omega} = 2 - \sqrt{3}$. The test is really asking
      whether $\omega$ has the right order in a field with $M_p^2$ elements.
    - **Factor form:** any prime factor $q$ of $M_p$ ($p$ odd) has $q \equiv 1 \pmod{2p}$ and $q \equiv \pm 1 \pmod{8}$.
    - **Cheap reduction:** $x \bmod (2^p - 1) = (x \mathbin{\&} M_p) + (x \gg p)$, repeated: just shifts and adds. GIMPS also
      squares the numbers with FFT multiplication.
    - **Perfect numbers (Euclid–Euler):** $2^{p-1} \cdot M_p$ is perfect exactly when $M_p$ is prime.

??? tip "Watch it step by step: testing M₇ = 127"

    <div class="mars-steps" markdown>

    1. $p = 7$, so $M_7 = 2^7 - 1 = 127$, and we need $p - 2 = 5$ steps.
    2. $s_0 = 4$. $s_1 = 4^2 - 2 = 14$.
    3. $s_2 = 14^2 - 2 = 194$, which is $67 \bmod 127$.
    4. $s_3 = 67^2 - 2 = 4{,}487$, which is $42 \bmod 127$. $s_4 = 42^2 - 2 = 1{,}762$, which is 111.
    5. $s_5 = 111^2 - 2 = 12{,}319 = 97 \times 127$. That is $0 \bmod 127$.
    6. Zero after $p - 2$ steps: 127 is prime.

    </div>

??? info "The math underneath"

    - **Finite fields** $\mathrm{GF}(q^2)$ and element orders: the group behind Lucas-Lehmer.
    - **Mersenne primes in cryptography:** the field of the NIST curve P-521 is $2^{521} - 1$, a Mersenne prime,
      chosen for that cheap reduction; Curve25519 uses the nearby $2^{255} - 19$. See
      [elliptic curves](Elliptic-Curves.md).
    - **Mersenne Twister**'s period $2^{19937} - 1$ is a Mersenne prime too ([retired generators](../09-random/Retired.md)).

## See also

- [Fermat Primes](Fermat-Primes.md) — the other famous structured-prime family
- [Miller-Rabin](Miller-Rabin-Primality-Test.md) — the general test for arbitrary numbers
- [RSA](../02-signatures/RSA.md) — why cryptography wants random primes, not these

## References

- [Great Internet Mersenne Prime Search (GIMPS)](https://www.mersenne.org/)
- [Mersenne prime — Wikipedia](https://en.wikipedia.org/wiki/Mersenne_prime)
