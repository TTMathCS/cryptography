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

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 415" role="img" aria-labelledby="sk-c-sieve-t"><title id="sk-c-sieve-t">The numbers 2 to 60 in a grid with the multiples of 2, 3, 5 and 7 crossed out, leaving the 17 primes</title><defs><filter id="sk-c-sieve-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-sieve-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-sieve-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-sieve-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-sieve-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="415" filter="url(#sk-c-sieve-paper)"/><g filter="url(#sk-c-sieve-pen)"><text x="30" y="44" class="h">Cross out the multiples, keep the rest</text><path class="p gold" d="M40 70 L88 70 L88 118 L40 118Z"/><text x="64" y="100" text-anchor="middle" class="s">2</text><path class="p gold" d="M92 70 L140 70 L140 118 L92 118Z"/><text x="116" y="100" text-anchor="middle" class="s">3</text><path class="p room" d="M144 70 L192 70 L192 118 L144 118Z"/><text x="168" y="100" text-anchor="middle" class="s">4</text><path class="p red" d="M152 110 L184 78" opacity=".7"/><path class="p gold" d="M196 70 L244 70 L244 118 L196 118Z"/><text x="220" y="100" text-anchor="middle" class="s">5</text><path class="p room" d="M248 70 L296 70 L296 118 L248 118Z"/><text x="272" y="100" text-anchor="middle" class="s">6</text><path class="p red" d="M256 110 L288 78" opacity=".7"/><path class="p gold" d="M300 70 L348 70 L348 118 L300 118Z"/><text x="324" y="100" text-anchor="middle" class="s">7</text><path class="p room" d="M352 70 L400 70 L400 118 L352 118Z"/><text x="376" y="100" text-anchor="middle" class="s">8</text><path class="p red" d="M360 110 L392 78" opacity=".7"/><path class="p room" d="M404 70 L452 70 L452 118 L404 118Z"/><text x="428" y="100" text-anchor="middle" class="s">9</text><path class="p red" d="M412 110 L444 78" opacity=".7"/><path class="p room" d="M456 70 L504 70 L504 118 L456 118Z"/><text x="480" y="100" text-anchor="middle" class="s">10</text><path class="p red" d="M464 110 L496 78" opacity=".7"/><path class="p gold" d="M508 70 L556 70 L556 118 L508 118Z"/><text x="532" y="100" text-anchor="middle" class="s">11</text><path class="p room" d="M40 122 L88 122 L88 170 L40 170Z"/><text x="64" y="152" text-anchor="middle" class="s">12</text><path class="p red" d="M48 162 L80 130" opacity=".7"/><path class="p gold" d="M92 122 L140 122 L140 170 L92 170Z"/><text x="116" y="152" text-anchor="middle" class="s">13</text><path class="p room" d="M144 122 L192 122 L192 170 L144 170Z"/><text x="168" y="152" text-anchor="middle" class="s">14</text><path class="p red" d="M152 162 L184 130" opacity=".7"/><path class="p room" d="M196 122 L244 122 L244 170 L196 170Z"/><text x="220" y="152" text-anchor="middle" class="s">15</text><path class="p red" d="M204 162 L236 130" opacity=".7"/><path class="p room" d="M248 122 L296 122 L296 170 L248 170Z"/><text x="272" y="152" text-anchor="middle" class="s">16</text><path class="p red" d="M256 162 L288 130" opacity=".7"/><path class="p gold" d="M300 122 L348 122 L348 170 L300 170Z"/><text x="324" y="152" text-anchor="middle" class="s">17</text><path class="p room" d="M352 122 L400 122 L400 170 L352 170Z"/><text x="376" y="152" text-anchor="middle" class="s">18</text><path class="p red" d="M360 162 L392 130" opacity=".7"/><path class="p gold" d="M404 122 L452 122 L452 170 L404 170Z"/><text x="428" y="152" text-anchor="middle" class="s">19</text><path class="p room" d="M456 122 L504 122 L504 170 L456 170Z"/><text x="480" y="152" text-anchor="middle" class="s">20</text><path class="p red" d="M464 162 L496 130" opacity=".7"/><path class="p room" d="M508 122 L556 122 L556 170 L508 170Z"/><text x="532" y="152" text-anchor="middle" class="s">21</text><path class="p red" d="M516 162 L548 130" opacity=".7"/><path class="p room" d="M40 174 L88 174 L88 222 L40 222Z"/><text x="64" y="204" text-anchor="middle" class="s">22</text><path class="p red" d="M48 214 L80 182" opacity=".7"/><path class="p gold" d="M92 174 L140 174 L140 222 L92 222Z"/><text x="116" y="204" text-anchor="middle" class="s">23</text><path class="p room" d="M144 174 L192 174 L192 222 L144 222Z"/><text x="168" y="204" text-anchor="middle" class="s">24</text><path class="p red" d="M152 214 L184 182" opacity=".7"/><path class="p room" d="M196 174 L244 174 L244 222 L196 222Z"/><text x="220" y="204" text-anchor="middle" class="s">25</text><path class="p red" d="M204 214 L236 182" opacity=".7"/><path class="p room" d="M248 174 L296 174 L296 222 L248 222Z"/><text x="272" y="204" text-anchor="middle" class="s">26</text><path class="p red" d="M256 214 L288 182" opacity=".7"/><path class="p room" d="M300 174 L348 174 L348 222 L300 222Z"/><text x="324" y="204" text-anchor="middle" class="s">27</text><path class="p red" d="M308 214 L340 182" opacity=".7"/><path class="p room" d="M352 174 L400 174 L400 222 L352 222Z"/><text x="376" y="204" text-anchor="middle" class="s">28</text><path class="p red" d="M360 214 L392 182" opacity=".7"/><path class="p gold" d="M404 174 L452 174 L452 222 L404 222Z"/><text x="428" y="204" text-anchor="middle" class="s">29</text><path class="p room" d="M456 174 L504 174 L504 222 L456 222Z"/><text x="480" y="204" text-anchor="middle" class="s">30</text><path class="p red" d="M464 214 L496 182" opacity=".7"/><path class="p gold" d="M508 174 L556 174 L556 222 L508 222Z"/><text x="532" y="204" text-anchor="middle" class="s">31</text><path class="p room" d="M40 226 L88 226 L88 274 L40 274Z"/><text x="64" y="256" text-anchor="middle" class="s">32</text><path class="p red" d="M48 266 L80 234" opacity=".7"/><path class="p room" d="M92 226 L140 226 L140 274 L92 274Z"/><text x="116" y="256" text-anchor="middle" class="s">33</text><path class="p red" d="M100 266 L132 234" opacity=".7"/><path class="p room" d="M144 226 L192 226 L192 274 L144 274Z"/><text x="168" y="256" text-anchor="middle" class="s">34</text><path class="p red" d="M152 266 L184 234" opacity=".7"/><path class="p room" d="M196 226 L244 226 L244 274 L196 274Z"/><text x="220" y="256" text-anchor="middle" class="s">35</text><path class="p red" d="M204 266 L236 234" opacity=".7"/><path class="p room" d="M248 226 L296 226 L296 274 L248 274Z"/><text x="272" y="256" text-anchor="middle" class="s">36</text><path class="p red" d="M256 266 L288 234" opacity=".7"/><path class="p gold" d="M300 226 L348 226 L348 274 L300 274Z"/><text x="324" y="256" text-anchor="middle" class="s">37</text><path class="p room" d="M352 226 L400 226 L400 274 L352 274Z"/><text x="376" y="256" text-anchor="middle" class="s">38</text><path class="p red" d="M360 266 L392 234" opacity=".7"/><path class="p room" d="M404 226 L452 226 L452 274 L404 274Z"/><text x="428" y="256" text-anchor="middle" class="s">39</text><path class="p red" d="M412 266 L444 234" opacity=".7"/><path class="p room" d="M456 226 L504 226 L504 274 L456 274Z"/><text x="480" y="256" text-anchor="middle" class="s">40</text><path class="p red" d="M464 266 L496 234" opacity=".7"/><path class="p gold" d="M508 226 L556 226 L556 274 L508 274Z"/><text x="532" y="256" text-anchor="middle" class="s">41</text><path class="p room" d="M40 278 L88 278 L88 326 L40 326Z"/><text x="64" y="308" text-anchor="middle" class="s">42</text><path class="p red" d="M48 318 L80 286" opacity=".7"/><path class="p gold" d="M92 278 L140 278 L140 326 L92 326Z"/><text x="116" y="308" text-anchor="middle" class="s">43</text><path class="p room" d="M144 278 L192 278 L192 326 L144 326Z"/><text x="168" y="308" text-anchor="middle" class="s">44</text><path class="p red" d="M152 318 L184 286" opacity=".7"/><path class="p room" d="M196 278 L244 278 L244 326 L196 326Z"/><text x="220" y="308" text-anchor="middle" class="s">45</text><path class="p red" d="M204 318 L236 286" opacity=".7"/><path class="p room" d="M248 278 L296 278 L296 326 L248 326Z"/><text x="272" y="308" text-anchor="middle" class="s">46</text><path class="p red" d="M256 318 L288 286" opacity=".7"/><path class="p gold" d="M300 278 L348 278 L348 326 L300 326Z"/><text x="324" y="308" text-anchor="middle" class="s">47</text><path class="p room" d="M352 278 L400 278 L400 326 L352 326Z"/><text x="376" y="308" text-anchor="middle" class="s">48</text><path class="p red" d="M360 318 L392 286" opacity=".7"/><path class="p room" d="M404 278 L452 278 L452 326 L404 326Z"/><text x="428" y="308" text-anchor="middle" class="s">49</text><path class="p red" d="M412 318 L444 286" opacity=".7"/><path class="p room" d="M456 278 L504 278 L504 326 L456 326Z"/><text x="480" y="308" text-anchor="middle" class="s">50</text><path class="p red" d="M464 318 L496 286" opacity=".7"/><path class="p room" d="M508 278 L556 278 L556 326 L508 326Z"/><text x="532" y="308" text-anchor="middle" class="s">51</text><path class="p red" d="M516 318 L548 286" opacity=".7"/><path class="p room" d="M40 330 L88 330 L88 378 L40 378Z"/><text x="64" y="360" text-anchor="middle" class="s">52</text><path class="p red" d="M48 370 L80 338" opacity=".7"/><path class="p gold" d="M92 330 L140 330 L140 378 L92 378Z"/><text x="116" y="360" text-anchor="middle" class="s">53</text><path class="p room" d="M144 330 L192 330 L192 378 L144 378Z"/><text x="168" y="360" text-anchor="middle" class="s">54</text><path class="p red" d="M152 370 L184 338" opacity=".7"/><path class="p room" d="M196 330 L244 330 L244 378 L196 378Z"/><text x="220" y="360" text-anchor="middle" class="s">55</text><path class="p red" d="M204 370 L236 338" opacity=".7"/><path class="p room" d="M248 330 L296 330 L296 378 L248 378Z"/><text x="272" y="360" text-anchor="middle" class="s">56</text><path class="p red" d="M256 370 L288 338" opacity=".7"/><path class="p room" d="M300 330 L348 330 L348 378 L300 378Z"/><text x="324" y="360" text-anchor="middle" class="s">57</text><path class="p red" d="M308 370 L340 338" opacity=".7"/><path class="p room" d="M352 330 L400 330 L400 378 L352 378Z"/><text x="376" y="360" text-anchor="middle" class="s">58</text><path class="p red" d="M360 370 L392 338" opacity=".7"/><path class="p gold" d="M404 330 L452 330 L452 378 L404 378Z"/><text x="428" y="360" text-anchor="middle" class="s">59</text><path class="p room" d="M456 330 L504 330 L504 378 L456 378Z"/><text x="480" y="360" text-anchor="middle" class="s">60</text><path class="p red" d="M464 370 L496 338" opacity=".7"/><text x="40" y="400" class="s">Crossing out by 2, 3, 5 and 7 is enough: 7 is the last prime below √60. The 17 gold squares are the primes.</text></g></svg><figcaption>Sketched for this page.</figcaption></figure>

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
