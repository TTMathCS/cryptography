# Fermat Primes

*Primes of the form $2^{2^n} + 1$. Only five are known, and one of them — 65537 —
is the standard RSA public exponent.*

## What it is

A Fermat number is $F_n = 2^{2^n} + 1$, named after Pierre de Fermat
(1601–1665). Fermat conjectured all of them were prime; he was wrong. Only five
Fermat primes are known, and it's conjectured there are no others.

## The known Fermat primes

| $n$ | $F_n = 2^{2^n} + 1$ | Value | Status |
|-----|--------------------|-------|--------|
| 0 | $2^1 + 1$ | 3 | prime |
| 1 | $2^2 + 1$ | 5 | prime |
| 2 | $2^4 + 1$ | 17 | prime |
| 3 | $2^8 + 1$ | 257 | prime |
| 4 | $2^{16} + 1$ | 65537 | prime |
| 5 | $2^{32} + 1$ | $4294967297 = 641 \times 6700417$ | **composite** |

Every Fermat number from $F_5$ through $F_{32}$ checked so far is composite, so the
five above may be the only Fermat primes that exist.

## How they're tested

**Pépin's test** is a clean primality proof specific to Fermat numbers: for
$n \ge 1$, $F_n$ is prime iff $3^{(F_n - 1)/2} \equiv -1 \pmod{F_n}$. It's a
[Pocklington](Pocklington-Primality-Test.md)-style proof, since $F_n - 1$ is a
pure power of two and so trivially factored.

```python
def pepin(n):                       # tests F_n for n >= 1
    F = (1 << (1 << n)) + 1
    return pow(3, (F - 1) // 2, F) == F - 1
```

Verified: `True` for $n \in \{1, 2, 3, 4\}$ and `False` for $n = 5$.

## Where they show up

- **RSA's public exponent $e = 65537 = F_4$** — its binary form `10000000000000001`
  has just two set bits, so $m^e$ is fast to compute, while being large enough to
  avoid small-exponent pitfalls. See [RSA](../02-signatures/RSA.md).
- **Constructible polygons (Gauss–Wantzel)** — a regular polygon is
  straightedge-and-compass constructible iff its side count is a power of two times
  distinct Fermat primes. So the 3-, 5-, 17-, 257-, and 65537-gons are constructible.
- **Pairwise coprime** — no two Fermat numbers share a factor, which gives a neat
  proof that there are infinitely many primes.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: Pépin's test on F₃ = 257 and F₅"

    | $n$ | $F_n$ | $3^{(F_n - 1)/2} \bmod F_n$ | Verdict |
    |---|---|---|---|
    | 3 | 257 | $3^{128} \bmod 257 = 256 \equiv -1$ | prime |
    | 5 | 4,294,967,297 | $3^{2^{31}} \bmod F_5 = 10{,}324{,}303 \not\equiv -1$ | composite |

    For $F_5$ the test proves it composite without finding a factor. The factor itself fits the rule below:
    $641 = 5 \cdot 2^7 + 1$ (Euler, 1732).

??? abstract "The math, with formulas"

    - **Pépin's test (1877):** for $n \ge 1$, $F_n$ is prime if and only if $3^{(F_n-1)/2} \equiv -1 \pmod{F_n}$.
      The exponent is $2^{2^n - 1}$, so the test is $2^n - 1$ squarings in a row.
    - **Factor form (Euler, refined by Lucas):** every prime factor of $F_n$ ($n \ge 2$) is $k \cdot 2^{n+2} + 1$.
    - **Pairwise coprime:** $F_0 \cdot F_1 \cdots F_{n-1} = F_n - 2$, so a common factor of two Fermat numbers would divide 2,
      but they are odd.
    - **Why only powers of 2 in the exponent:** if $m$ has an odd factor $b > 1$, $2^{m/b} + 1$ divides $2^m + 1$.
    - **$e = 65537$ in RSA:** $m^{65537}$ is 16 squarings and 1 multiplication: 17 steps instead of about 24
      on average for a random 17-bit exponent.

??? tip "Watch it step by step: Pépin's test on 257"

    $3^{128} \bmod 257$. The exponent 128 is `10000000` in binary, so it is seven squarings after the first
    step. Press Play or Step; the answer 256 is $-1 \bmod 257$, so 257 is prime.

    <div class="mars-modexp" data-base="3" data-exp="128" data-mod="257" data-label="Pépin's test: 3¹²⁸ mod 257"></div>

??? info "The math underneath"

    - **Quadratic residues and Euler's criterion:** $a^{(p-1)/2} \equiv \left(\frac{a}{p}\right)$; for a prime $F_n$, 3 is not a square,
      so the answer is $-1$.
    - **Proth and Pocklington:** $F_n - 1$ is a power of 2, fully factored, so a single base proves
      primality ([Pocklington](Pocklington-Primality-Test.md)).
    - **Gauss–Wantzel theorem:** constructible regular polygons.
    - **Number-theoretic transforms:** arithmetic modulo Fermat primes (like 257 and 65537) makes fast exact
      convolutions; Schönhage–Strassen multiplication works modulo numbers of the form $2^k + 1$.

## See also

- [RSA](../02-signatures/RSA.md) — uses $F_4 = 65537$ as the public exponent
- [Mersenne Primes](Mersenne-Primes.md) — the other structured-prime family
- [Pocklington](Pocklington-Primality-Test.md) — the proof technique behind Pépin's test

## References

- [Fermat number — Wikipedia](https://en.wikipedia.org/wiki/Fermat_number)
- [Pépin's test — Wikipedia](https://en.wikipedia.org/wiki/P%C3%A9pin%27s_test)
