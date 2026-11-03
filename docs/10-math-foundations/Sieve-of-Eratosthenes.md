# Sieve of Eratosthenes

*The classic way to list every prime up to some limit — cross out the multiples
and whatever's left is prime.*

## What it is

An algorithm from ancient Greece (Eratosthenes, ~250 BCE) that finds all primes
up to $n$. Instead of testing each number on its own, it marks the multiples of
each prime as composite and collects what remains. It's the right tool when you
want *many* small primes at once; for testing a single huge number, use
[Miller-Rabin](Miller-Rabin-Primality-Test.md) instead.

## The story

- **Who made it:** Eratosthenes of Cyrene (about 276 to 194 BC), head of the Library of Alexandria, who also measured the size of the Earth. Our earliest written account is in Nicomachus of Gerasa's *Introduction to Arithmetic* (about AD 100).
- **What for:** Listing all primes up to a limit.
- **What it solved:** Testing numbers one by one is slow; the sieve crosses out multiples so each composite is handled by its smallest primes.
- **Where it stands:** Still the way to list small primes. Key generators use a sieve to throw away candidates with small factors before running Miller-Rabin.
- **Incidents:** Not applicable.

## How it works

Start with every number from 2 to $n$ assumed prime, then:

- Take the next number still marked prime (start at 2).
- Cross out all its multiples, beginning at its square (smaller multiples were
  already crossed out by smaller primes).
- Repeat up to $\sqrt{n}$ — past that, every remaining composite is already crossed out.

It runs in $O(n \log \log n)$ time, close to linear, using one bit (or byte) per
number for $O(n)$ space.

## When to use it

- **Listing all primes below a limit** — trial-division tables, number-theory
  experiments, project-Euler-style problems.
- **A range of primes too big to hold at once** — a *segmented sieve* sieves
  $[\mathit{lo}, \mathit{hi}]$ in $O(\sqrt{\mathit{hi}})$ memory.
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

- Start crossing out at `i*i`, not `2*i` — multiples below $i^2$ already have a
  smaller prime factor.
- Sieving only odd numbers halves the memory; a wheel that also skips multiples
  of 3 and 5 trims it further.
- The sieve is often the first stage that feeds candidates into stronger tests.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: the primes up to 100"

    Sieving 2 … 100 needs only the primes up to $\sqrt{100} = 10$:

    | Prime | Start crossing at | Numbers newly crossed out |
    |---|---|---|
    | 2 | 4 | 49 (4, 6, 8, …, 100) |
    | 3 | 9 | 16 (9, 15, 21, …, 99: odd multiples only, the even ones are gone) |
    | 5 | 25 | 6 (25, 35, 55, 65, 85, 95) |
    | 7 | 49 | 3 (49, 77, 91) |
    | 11 | $121 > 100$ | stop |

    99 numbers − 74 crossed out = **25 primes** below 100, which matches $\pi(100) = 25$. To a million the same
    method leaves 78,498.

??? abstract "The math, with formulas"

    - **Work:** each prime $p \le \sqrt{n}$ crosses out about $n/p$ numbers, so the total is
      $n \cdot \sum 1/p \approx n \cdot \ln \ln n$ (Mertens' second theorem). For $n = 10^9$ that is under $3n$.
    - **How many primes survive:** $\pi(n) \approx n / \ln n$ (the prime number theorem), more precisely $\operatorname{Li}(n)$.
    - **Why stop at $\sqrt{n}$:** a composite $m \le n$ has a prime factor $\le \sqrt{m} \le \sqrt{n}$, so it was already crossed out.
    - **Segmented sieve:** sieve $[\mathit{lo}, \mathit{hi})$ with the base primes $\le \sqrt{\mathit{hi}}$; each prime starts at
      $\max(p^2, \lceil \mathit{lo}/p \rceil \cdot p)$. Memory is $O(\sqrt{\mathit{hi}} + (\mathit{hi} - \mathit{lo}))$.
    - **Density in key generation:** a random odd 1024-bit number is prime with probability about
      $2 / \ln(2^{1024}) \approx 1/355$; sieving out small factors first skips most candidates before any
      [Miller-Rabin](Miller-Rabin-Primality-Test.md) round.

??? tip "Watch it step by step: sieving to 30"

    <div class="mars-steps" markdown>

    1. Write 2 to 30. Nothing is crossed out yet.
    2. 2 is prime. Cross out 4, 6, 8, …, 30.
    3. 3 is prime. Cross out 9, 15, 21, 27 (6, 12, … are gone already).
    4. 5 is prime. Cross out 25. ($5 \times 7 = 35$ is past 30.)
    5. The next survivor is 7, and $7^2 = 49 > 30$. Stop.
    6. What is left is prime: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29.

    </div>

??? info "The math underneath"

    - **Fundamental theorem of arithmetic:** every integer above 1 factors into primes in one way, so
      crossing out multiples of primes removes every composite.
    - **The prime number theorem** (Hadamard and de la Vallée Poussin, 1896) and **Mertens' theorems** (1874)
      give the counts and the running time.
    - **Wheel factorization** and the **sieve of Atkin** cut the constant factor; the **quadratic and
      number field sieves** borrow the crossing-out idea to factor RSA moduli, see
      [hard problems](Hard-Problems.md).

## See also

- [Miller-Rabin](Miller-Rabin-Primality-Test.md) — for individual large numbers
- [Mersenne Primes](Mersenne-Primes.md) / [Fermat Primes](Fermat-Primes.md) — special prime forms

## References

- [Sieve of Eratosthenes — Wikipedia](https://en.wikipedia.org/wiki/Sieve_of_Eratosthenes)
