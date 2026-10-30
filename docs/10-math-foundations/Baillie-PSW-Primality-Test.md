# Baillie-PSW Primality Test

*Two cheap tests combined into one that has no known false positive — the
high-confidence primality check used by many math libraries.*

## What it is

Baillie-PSW (Baillie, Pomerance, Selfridge, Wagstaff, 1980) runs a strong
Fermat test base 2 followed by a strong Lucas test. Each is a probabilistic test
on its own, but their failure modes don't overlap: no composite is known to pass
both, and none exists below 2⁶⁴. That makes it effectively deterministic for any
number you'll meet in practice, which is why it backs the prime checks in tools
like SymPy and many big-integer libraries.

## How it works

A composite slips past a single [Miller-Rabin](Miller-Rabin-Primality-Test.md)
base with probability up to ¼, and likewise past a Lucas test — but the two tests
are built on different structure, so the same composite fooling both seems not to
happen.

1. **Strong Fermat test base 2** — one Miller-Rabin round with `a = 2`.
2. **Strong Lucas test** — pick the Selfridge parameters (the first `D` in
   `5, −7, 9, −11, …` with Jacobi symbol `(D/n) = −1`), then run the Lucas
   sequence test for `n`.

If `n` passes both, it's declared prime.

## When to use it

- **When you want a fast yes/no with no practical error** and don't need a formal
  proof — the usual default in libraries.
- **For a formal proof of primality**, use [Pocklington](Pocklington-Primality-Test.md)
  (special forms) or a general certificate (ECPP).
- **For raw key-generation throughput**, plain
  [Miller-Rabin](Miller-Rabin-Primality-Test.md) with many bases is also fine.

## Example (Python)

Verified against a sieve for every `n` up to 100,000.

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
- It's deterministic and exact for all `n < 2⁶⁴`.

## See also

- [Miller-Rabin](Miller-Rabin-Primality-Test.md) — the base-2 half of the test
- [Pocklington](Pocklington-Primality-Test.md) — when you need an actual proof

## References

- Baillie, R.; Wagstaff, S. (1980). "Lucas pseudoprimes"
- [Baillie–PSW primality test — Wikipedia](https://en.wikipedia.org/wiki/Baillie%E2%80%93PSW_primality_test)
