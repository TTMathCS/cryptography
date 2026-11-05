# Baillie-PSW Primality Test

*Two cheap tests combined into one that has no known false positive — the
high-confidence primality check used by many math libraries.*

## What it is

Baillie-PSW (Baillie, Pomerance, Selfridge, Wagstaff, 1980) runs a strong
Fermat test base 2 followed by a strong Lucas test. Each is a probabilistic test
on its own, but their failure modes don't overlap: no composite is known to pass
both, and none exists below $2^{64}$. That makes it effectively deterministic for any
number you'll meet in practice, which is why it backs the prime checks in tools
like SymPy and many big-integer libraries.

## The story

- **Who made it:** Robert Baillie, Carl Pomerance, John Selfridge and Samuel Wagstaff, 1980.
- **What for:** A prime test with no known false answer.
- **What it solved:** Fermat and Lucas tests fail on different numbers, so together they are much stronger than either.
- **Where it stands:** Used in SymPy, PARI, Mathematica and many libraries. Pomerance, Selfridge and Wagstaff offered $620 for a counterexample, and it is still unclaimed.
- **Incidents:** None.

## How it works

A composite slips past a single [Miller-Rabin](Miller-Rabin-Primality-Test.md)
base with probability up to $1/4$, and past a strong Lucas test with probability up
to $4/15$ (Arnault, 1997). The two tests are built on different structure, so the
same composite fooling both seems not to happen.

1. **Strong Fermat test base 2** — one Miller-Rabin round with $a = 2$.
2. **Strong Lucas test** — pick the Selfridge parameters (the first $D$ in
   $5, -7, 9, -11, \ldots$ with Jacobi symbol $\left(\frac{D}{n}\right) = -1$), then run the Lucas
   sequence test for $n$.

If $n$ passes both, it's declared prime.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 365" role="img" aria-labelledby="sk-c-bpsw-t"><title id="sk-c-bpsw-t">An odd number passes through a strong base-2 test and then a strong Lucas test; failing either marks it composite, passing both marks it prime</title><defs><filter id="sk-c-bpsw-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-bpsw-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-bpsw-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-bpsw-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-bpsw-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="365" filter="url(#sk-c-bpsw-paper)"/><g filter="url(#sk-c-bpsw-pen)"><text x="30" y="44" class="h">Two tests that fail in different places</text><path class="p room" d="M30 150 L140 150 L140 200 L30 200Z"/><text x="85.0" y="181.0" text-anchor="middle" class="s">odd number n</text><path class="p " d="M142 175 L188 175" marker-end="url(#sk-c-bpsw-ah)"/><path class="p gold" d="M190 140 L340 140 L340 210 L190 210Z"/><text x="265.0" y="175.0" text-anchor="middle" class="s">strong test, base 2</text><text x="265.0" y="193.0" text-anchor="middle" class="s">(Miller-Rabin)</text><path class="p " d="M342 175 L388 175" marker-end="url(#sk-c-bpsw-ah)"/><path class="p gold" d="M390 140 L530 140 L530 210 L390 210Z"/><text x="460.0" y="175.0" text-anchor="middle" class="s">strong Lucas test</text><text x="460.0" y="193.0" text-anchor="middle" class="s">Selfridge D</text><path class="p " d="M532 175 L570 175" marker-end="url(#sk-c-bpsw-ah)"/><text x="574" y="180" class="s">prime</text><path class="p " d="M265 212 L265 262" marker-end="url(#sk-c-bpsw-ah)"/><text x="210" y="282" class="s">composite</text><path class="p " d="M460 212 L460 262" marker-end="url(#sk-c-bpsw-ah)"/><text x="405" y="282" class="s">composite</text><text x="30" y="330" class="s">Each test alone lets a few composites through, but different ones. No number below 2⁶⁴ passes both,</text><text x="30" y="350" class="s">and no example of any size has ever been found.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

## When to use it

- **When you want a fast yes/no with no practical error** and don't need a formal
  proof — the usual default in libraries.
- **For a formal proof of primality**, use [Pocklington](Pocklington-Primality-Test.md)
  (special forms) or a general certificate (ECPP).
- **For raw key-generation throughput**, plain
  [Miller-Rabin](Miller-Rabin-Primality-Test.md) with many bases is also fine.

## Example (Python)

Verified against a sieve for every $n$ up to 100,000.

```python
from math import isqrt

def jacobi(a, n):
    a %= n; result = 1
    while a:
        while a % 2 == 0:
            a //= 2
            if n % 8 in (3, 5): result = -result
        a, n = n, a
        if a % 4 == 3 and n % 4 == 3: result = -result
        a %= n
    return result if n == 1 else 0

def _lucas(k, P, Q, D, n):              # U_k, V_k, Q^k mod n
    U, V, Qk = 0, 2, 1
    for bit in bin(k)[2:]:
        U, V, Qk = U * V % n, (V * V - 2 * Qk) % n, Qk * Qk % n
        if bit == '1':
            U, V = P * U + V, D * U + P * V
            if U & 1: U += n
            if V & 1: V += n
            U, V, Qk = U // 2 % n, V // 2 % n, Qk * Q % n
    return U % n, V % n, Qk

def baillie_psw(n):
    if n < 2: return False
    for p in (2,3,5,7,11,13,17,19,23,29,31,37):
        if n % p == 0: return n == p
    if isqrt(n) ** 2 == n: return False
    # strong Fermat test, base 2
    d, r = n - 1, 0
    while d % 2 == 0: d //= 2; r += 1
    x = pow(2, d, n)
    if x != 1 and x != n - 1:
        for _ in range(r - 1):
            x = x * x % n
            if x == n - 1: break
        else: return False
    # strong Lucas test (Selfridge parameters)
    D = 5
    while jacobi(D, n) != -1:
        D = -(D + 2) if D > 0 else -(D - 2)
    P, Q = 1, (1 - D) // 4
    dd, s = n + 1, 0
    while dd % 2 == 0: dd //= 2; s += 1
    U, V, Qk = _lucas(dd, P, Q, D, n)
    if U == 0 or V == 0: return True
    for _ in range(s - 1):
        V, Qk = (V * V - 2 * Qk) % n, Qk * Qk % n
        if V == 0: return True
    return False
```

## Notes

- "No known counterexample" is not a proof — there's no theorem ruling out a huge
  composite that passes. For high-stakes proofs, use a method that produces a
  certificate.
- It's deterministic and exact for all $n < 2^{64}$.

## Going deeper

Each part below starts closed; open the ones you want.

??? example "Sample calculation: 2047 fools base 2 but not Lucas"

    **$2047 = 23 \times 89$** is the smallest number that passes a strong Fermat test base 2:
    $2046 = 1023 \cdot 2^1$, and $2^{1023} \equiv 1 \pmod{2047}$. Step 1 says "probably prime".

    Step 2, the strong Lucas test:

    | Step | Value |
    |---|---|
    | Selfridge $D$: Jacobi symbols for $5, -7, \ldots$ | $\left(\frac{5}{2047}\right) = -1$, so $D = 5$, $P = 1$, $Q = (1 - D)/4 = -1$ |
    | $n + 1 = 2048 = d \cdot 2^s$ | $d = 1$, $s = 11$ |
    | $U_1$ (must be 0 to pass) | 1 |
    | $V_1, V_2, V_4, V_8, \ldots, V_{1024} \bmod 2047$ (one must be 0) | 1, 3, 7, 47, 160, 1034, 620, 1609, 1471, 160, 1034 |

    None is 0, so **2047 is composite**. With $P = 1$ and $Q = -1$ the sequences are the Fibonacci numbers
    $U_k = F_k$ and the Lucas numbers $V_k = L_k$; for a prime $n$ with $\left(\frac{5}{n}\right) = -1$, $F_{n+1}$ would be divisible by
    $n$, but $F_{2048} \bmod 2047 = 1957$.

??? abstract "The math, with formulas"

    **Lucas sequences** with parameters $P$, $Q$ and $D = P^2 - 4Q$:

    $$
    \begin{aligned}
    U_0 &= 0, \; U_1 = 1, \; U_{k+1} = P \cdot U_k - Q \cdot U_{k-1} & V_0 &= 2, \; V_1 = P, \; V_{k+1} = P \cdot V_k - Q \cdot V_{k-1} \\
    U_{2k} &= U_k \cdot V_k & V_{2k} &= V_k^2 - 2Q^k
    \end{aligned}
    $$

    (Doubling takes $\log_2 n$ steps, like square-and-multiply.)

    For a prime $n$ not dividing $2QD$: $U_{n - \left(\frac{D}{n}\right)} \equiv 0 \pmod{n}$. The **strong** version, with
    $n - \left(\frac{D}{n}\right) = d \cdot 2^s$ and $d$ odd: $U_d \equiv 0$ or $V_{d \cdot 2^r} \equiv 0$ for some $0 \le r < s$.

    **Baillie-PSW:** $n$ passes if it is a strong probable prime base 2 **and** a strong Lucas probable prime
    with Selfridge's $D$ (the first of $5, -7, 9, -11, \ldots$ with $\left(\frac{D}{n}\right) = -1$; if $n$ is a perfect square no such $D$
    exists, so check that first).

    - **No counterexample:** none below $2^{64}$ (Gilchrist checked every base-2 strong pseudoprime on Feitsma
      and Galway's list). Pomerance gave a heuristic in 1984 that infinitely many exist; none has been found.

??? tip "Watch it step by step: the two tests"

    <div class="mars-steps" markdown>

    1. Throw out small cases: even numbers, small prime factors, perfect squares.
    2. Strong Fermat base 2 on 2047: $2^{1023} \bmod 2047 = 1$. Passes.
    3. Find $D$: the Jacobi symbol $\left(\frac{5}{2047}\right)$ is $-1$, so $D = 5$, $P = 1$, $Q = -1$.
    4. Compute Lucas numbers modulo 2047 by doubling: $V_1 = 1$, $V_2 = 3$, $V_4 = 7$, $V_8 = 47$, …
    5. None of $U_1, V_1, V_2, \ldots, V_{1024}$ is $0 \bmod 2047$.
    6. Composite. A real prime would have hit 0 somewhere in that list.

    </div>

??? info "The math underneath"

    - **Quadratic fields:** Lucas sequences live in $\mathbb{Z}[\sqrt{D}]$; Fermat's test works in the integers. A
      composite has to fool two different groups at once, which is why they rarely fail together.
    - **Jacobi and Legendre symbols:** whether $D$ is a square modulo $n$, computed by quadratic reciprocity.
    - **Frobenius pseudoprimes** generalise both tests (Grantham, 2001).
    - Where it is used: Go's `ProbablyPrime`, SymPy's `isprime` and PARI/GP's `ispseudoprime` all run it. See [Miller-Rabin](Miller-Rabin-Primality-Test.md).

## See also

- [Miller-Rabin](Miller-Rabin-Primality-Test.md) — the base-2 half of the test
- [Pocklington](Pocklington-Primality-Test.md) — when you need an actual proof

## References

- Baillie, R.; Wagstaff, S. (1980). "Lucas pseudoprimes"
- Arnault, F. (1997). "The Rabin-Monier theorem for Lucas pseudoprimes", Mathematics of Computation 66, 869–881
- [Baillie–PSW primality test — Wikipedia](https://en.wikipedia.org/wiki/Baillie%E2%80%93PSW_primality_test)
