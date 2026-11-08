# 20. The Mathematics of Quantum Algorithms

*A quantum computer is not a faster classical computer. It manipulates a vector of
$2^n$ complex numbers with operations that act on all of them at once, but it can
only read out one random sample, chosen with probabilities given by those numbers. The
art is to arrange the computation so that the wrong answers cancel and the right ones
reinforce. For a few problems with hidden periodic structure, such as factoring and
discrete logarithms, that art gives an exponential speedup, which is why RSA and
elliptic-curve cryptography must be replaced. For unstructured search it gives only a
square root, which is why AES survives. This chapter builds the mathematics from
complex vectors up: qubits, tensor products, unitary gates, measurement and
interference, the quantum Fourier transform, period finding and Shor's algorithm
(simulated in full for $N = 21$), the hidden subgroup problem and why lattices resist
it, Grover's search and its proven limit, and what current resource estimates mean
for key sizes.*

!!! abstract "In this chapter"
    **You will learn:**

    - qubits as unit vectors in $\mathbb{C}^2$, registers as tensor products, gates
      as unitary matrices, and measurement;
    - the Hadamard gate, interference and entanglement, with a small simulator;
    - the Deutsch-Jozsa algorithm, the first exponential separation;
    - the quantum Fourier transform and how it reveals periods;
    - Shor's algorithm: the quantum period finding, simulated for $N = 21$, and the
      classical number theory around it;
    - Shor for discrete logarithms, the hidden subgroup problem, and why lattice
      problems do not fall to the same idea;
    - Grover's search, its $\frac{\pi}{4}\sqrt{N}$ iterations, simulated, and the
      BBBV lower bound;
    - resource estimates, from 20 million qubits in 2019 to under a million in 2025,
      and what they mean for keys.

    **You need:** [Chapter 9](09-Linear-Algebra.md) (vectors and matrices),
    [Chapter 4](04-Powers-and-Primitive-Roots.md) (orders and discrete logarithms),
    [Chapter 11](11-Polynomials-at-Work.md) (the Fourier transform) and complex
    numbers ($e^{i\theta} = \cos\theta + i\sin\theta$).

    **Levels:** §20.1 to §20.3 are for beginners, §20.4 to §20.6 are intermediate,
    §20.7 to §20.9 are expert.

## 20.1 The problem

*Level: beginner.*

In 1994 Peter Shor showed that a quantum computer could factor integers and compute
discrete logarithms in polynomial time. Every public-key system deployed at the time,
RSA, Diffie-Hellman, DSA and elliptic curves, rests on one of those problems. No
quantum computer able to run Shor's algorithm at cryptographic size exists yet, but
data encrypted today can be recorded and decrypted later ("harvest now, decrypt
later"), so the migration to post-quantum cryptography began years before the threat
arrives.

To judge the threat, and to see why lattices, codes and hash functions are believed
safe, one needs the actual mathematics: what a quantum computer computes, what Shor's
algorithm does step by step, and what Grover's algorithm can and cannot do.

## 20.2 Qubits, registers and gates

*Level: beginner.*

A **qubit** is a unit vector in $\mathbb{C}^2$:

$$
|\psi\rangle = \alpha|0\rangle + \beta|1\rangle, \qquad |\alpha|^2 + |\beta|^2 = 1,
$$

where $|0\rangle = (1, 0)$ and $|1\rangle = (0, 1)$ are the basis vectors (the "ket"
notation is Paul Dirac's). **Measuring** it gives 0 with probability $|\alpha|^2$ and
1 with probability $|\beta|^2$, and leaves the qubit in the state observed.

A register of $n$ qubits lives in the **tensor product** $\mathbb{C}^2 \otimes \cdots
\otimes \mathbb{C}^2 = \mathbb{C}^{2^n}$, with basis vectors $|x\rangle$ for the
$2^n$ bit strings $x$:

$$
|\psi\rangle = \sum_{x \in \{0,1\}^n} \alpha_x |x\rangle, \qquad \sum_x |\alpha_x|^2 = 1.
$$

That is the source of the power and of the confusion: describing 300 qubits takes
$2^{300}$ complex numbers, more than there are atoms in the observable universe. But
a measurement returns just one $x$, with probability $|\alpha_x|^2$.

**Gates** are **unitary** matrices $U$ (with $U^\dagger U = I$, where $U^\dagger$ is
the conjugate transpose), which preserve length and are reversible. The essential
ones:

- the **Hadamard** gate $H = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1
  \end{pmatrix}$, which sends $|0\rangle$ to $\frac{1}{\sqrt 2}(|0\rangle +
  |1\rangle)$ and $|1\rangle$ to $\frac{1}{\sqrt 2}(|0\rangle - |1\rangle)$;
- the **phase** gates $\mathrm{diag}(1, e^{i\phi})$;
- the **controlled-NOT**, which flips a target qubit when a control qubit is 1.

These (with one more phase gate) are **universal**: any unitary can be approximated
by circuits of them. A classical function $f$ becomes the reversible unitary
$U_f|x\rangle|y\rangle = |x\rangle|y \oplus f(x)\rangle$; any efficient classical
circuit gives an efficient quantum one.

### By hand: interference and entanglement

- $H|0\rangle = \frac{1}{\sqrt 2}(|0\rangle + |1\rangle)$: measuring gives 0 or 1 with
  probability $\frac{1}{2}$ each.
- $H H|0\rangle = \frac{1}{\sqrt 2}\bigl(H|0\rangle + H|1\rangle\bigr) =
  \frac{1}{2}\bigl(|0\rangle + |1\rangle + |0\rangle - |1\rangle\bigr) = |0\rangle$.
  The two paths to $|1\rangle$ carry amplitudes $+\frac{1}{2}$ and $-\frac{1}{2}$ and
  **cancel**; the paths to $|0\rangle$ add. That is interference, the mechanism of
  every quantum algorithm. A classical random coin flipped twice stays random.
- Apply $H$ to the first of two qubits in $|00\rangle$, then a CNOT: the result is
  $\frac{1}{\sqrt 2}(|00\rangle + |11\rangle)$, a **Bell state**. Its two qubits are
  **entangled**: each alone is a fair coin, but they always agree.

```python
# A tiny state-vector simulator: n qubits are 2^n complex amplitudes; gates are matrices.
import cmath, math, random

def apply_1q(state, gate, target, n):
    """Apply a 2x2 gate to qubit `target` (qubit 0 = least significant bit of the index)."""
    out = state[:]
    step = 1 << target
    for i in range(len(state)):
        if not i & step:
            a, b = state[i], state[i | step]
            out[i] = gate[0][0] * a + gate[0][1] * b
            out[i | step] = gate[1][0] * a + gate[1][1] * b
    return out

def apply_cnot(state, control, target):
    out = state[:]
    for i in range(len(state)):
        if (i >> control) & 1:
            out[i] = state[i ^ (1 << target)]
    return out

s2 = 1 / math.sqrt(2)
Hd = [[s2, s2], [s2, -s2]]
X = [[0, 1], [1, 0]]

def probs(state):
    return [round(abs(a) ** 2, 4) for a in state]

zero = [1, 0]
plus = apply_1q(zero, Hd, 0, 1)
print(probs(plus), probs(apply_1q(plus, Hd, 0, 1)))   # H|0> = |+>, and H H |0> = |0>: interference
bell = apply_cnot(apply_1q([1, 0, 0, 0], Hd, 0, 2), 0, 1)
print([round(a.real if isinstance(a, complex) else a, 4) for a in bell], probs(bell))
```

```text
[0.5, 0.5] [1.0, 0.0]
[0.7071, 0.0, 0.0, 0.7071] [0.5, 0.0, 0.0, 0.5]
```

## 20.3 The first speedup: Deutsch-Jozsa

*Level: beginner.*

A function $f: \{0,1\}^n \to \{0,1\}$ is promised to be either constant or
**balanced** (0 on exactly half the inputs). Classically, a deterministic algorithm
may need $2^{n-1} + 1$ queries to be sure. David Deutsch and Richard Jozsa (1992)
showed that one quantum query suffices:

1. Start with $|0\rangle^{\otimes n}$ and apply $H$ to every qubit: $\frac{1}{\sqrt{N}}
   \sum_x |x\rangle$, with $N = 2^n$.
2. Query $f$ as a **phase oracle**: $|x\rangle \mapsto (-1)^{f(x)}|x\rangle$ (built from
   $U_f$ with the target qubit in the state $H|1\rangle$, a trick called phase
   kickback).
3. Apply $H$ to every qubit again and measure.

The amplitude of $|0\ldots0\rangle$ at the end is $\frac{1}{N}\sum_x (-1)^{f(x)}$:
$\pm 1$ if $f$ is constant, $0$ if it is balanced. So the outcome is all zeros with
certainty in the first case and never in the second.

```python
# Deutsch-Jozsa: is f: {0,1}^n -> {0,1} constant or balanced?  One quantum query decides.
def deutsch_jozsa(f, n):
    N = 2**n
    state = [1 / math.sqrt(N)] * N                # H on every qubit of |0...0>
    state = [(-1) ** f(x) * a for x, a in enumerate(state)]   # phase oracle |x> -> (-1)^f(x) |x>
    for q in range(n):
        state = apply_1q(state, Hd, q, n)
    return round(abs(state[0]) ** 2, 6)           # probability of measuring 0...0

n = 6
constant = lambda x: 1
balanced = lambda x: bin(x & 0b101101).count("1") & 1
print(deutsch_jozsa(constant, n), deutsch_jozsa(balanced, n), 2**(n - 1) + 1)
```

```text
1.0 0.0 33
```

For $n = 6$, one query distinguishes the cases with certainty, against 33 for a
deterministic classical algorithm (a randomized one, allowed a small error, needs only
a few, which is why this is a separation of principle rather than a useful one). The
pattern, Hadamards, an oracle in the phases, a transform, a measurement, is the
template for everything that follows.

## 20.4 The quantum Fourier transform

*Level: intermediate.*

On a register of $t$ qubits, with $Q = 2^t$, the **quantum Fourier transform** is the
discrete Fourier transform of the amplitude vector:

$$
\mathrm{QFT}\,|x\rangle = \frac{1}{\sqrt{Q}} \sum_{y=0}^{Q-1} e^{2\pi i xy/Q}\,|y\rangle.
$$

It is unitary (its columns are orthonormal, exactly as for the FFT of
[Chapter 11](11-Polynomials-at-Work.md)), and, by the same divide-and-conquer
factorization that makes the FFT fast, it can be built from $O(t^2)$ gates: Hadamards
and controlled phase rotations. Don Coppersmith (1994) gave this circuit. A classical
FFT on $Q$ numbers takes $O(Q\log Q) = O(t\,2^t)$ operations; the quantum one takes
$O(t^2)$ gates. The catch: the output is a vector of amplitudes that can only be
sampled.

**What it does to periodic states.** Suppose the register holds an equal
superposition of $x_0, x_0 + r, x_0 + 2r, \ldots$, a state with period $r$. Its
Fourier transform is concentrated near the multiples of $Q/r$: the phases $e^{2\pi i
(x_0 + jr)y/Q}$ add up when $ry/Q$ is close to an integer and cancel otherwise. So a
measurement after the QFT gives a $y$ with $y/Q \approx k/r$ for a random $k$. The
period, invisible in any single sample of the original state, is now readable.

```python
# The quantum Fourier transform on Q = 2^t amplitudes: |x> -> (1/sqrt Q) sum_y e^(2 pi i x y / Q) |y>.
def qft(state):
    Q = len(state)
    w = [cmath.exp(2j * math.pi * k / Q) for k in range(Q)]
    return [sum(state[x] * w[(x * y) % Q] for x in range(Q)) / math.sqrt(Q) for y in range(Q)]

Q, r, x0 = 64, 6, 1
periodic = [0j] * Q
for x in range(x0, Q, r):
    periodic[x] = 1
norm = math.sqrt(sum(abs(a) ** 2 for a in periodic))
periodic = [a / norm for a in periodic]
spectrum = [abs(a) ** 2 for a in qft(periodic)]
peaks = sorted(range(Q), key=lambda y: -spectrum[y])[:6]
print(sorted(peaks), [round(Q * k / r, 2) for k in range(r)], round(sum(spectrum), 6))
```

```text
[0, 11, 21, 32, 43, 53] [0.0, 10.67, 21.33, 32.0, 42.67, 53.33] 1.0
```

A register of 64 amplitudes with period 6: after the transform, the six largest
probabilities sit at 0, 11, 21, 32, 43 and 53, the integers nearest to the multiples
$64k/6$. The total probability is 1, as it must be for a unitary.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Top: a register with equal amplitude on every sixth value out of 64. Bottom: after the quantum Fourier transform, the probability is concentrated in six peaks near multiples of 64 over 6" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="105" y1="100" x2="625" y2="100"/><line x1="105" y1="225" x2="625" y2="225"/></g>
<text x="10" y="40" font-size="12">before</text><text x="10" y="56" font-size="12">amplitude</text>
<text x="10" y="165" font-size="12">after QFT</text><text x="10" y="181" font-size="12">probability</text>
<rect x="117.5" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="165.6" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="213.7" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="261.8" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="309.9" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="358.0" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="406.1" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="454.2" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="502.3" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="550.4" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="598.5" y="47.2" width="5" height="52.8" opacity=".75"/>
<rect x="109.5" y="130.0" width="5" height="95.0" class="acc-fill"/>
<rect x="165.6" y="224.6" width="5" height="0.4" opacity=".55"/>
<rect x="173.6" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="181.6" y="222.9" width="5" height="2.1" opacity=".55"/>
<rect x="189.7" y="210.7" width="5" height="14.3" opacity=".55"/>
<rect x="197.7" y="161.4" width="5" height="63.6" class="acc-fill"/>
<rect x="205.7" y="220.4" width="5" height="4.6" opacity=".55"/>
<rect x="213.7" y="223.2" width="5" height="1.8" opacity=".55"/>
<rect x="221.7" y="223.9" width="5" height="1.1" opacity=".55"/>
<rect x="229.7" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="237.8" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="245.8" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="253.8" y="223.9" width="5" height="1.1" opacity=".55"/>
<rect x="261.8" y="223.2" width="5" height="1.8" opacity=".55"/>
<rect x="269.8" y="220.4" width="5" height="4.6" opacity=".55"/>
<rect x="277.8" y="161.4" width="5" height="63.6" class="acc-fill"/>
<rect x="285.8" y="210.7" width="5" height="14.3" opacity=".55"/>
<rect x="293.9" y="222.9" width="5" height="2.1" opacity=".55"/>
<rect x="301.9" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="309.9" y="224.6" width="5" height="0.4" opacity=".55"/>
<rect x="366.0" y="130.0" width="5" height="95.0" class="acc-fill"/>
<rect x="422.1" y="224.6" width="5" height="0.4" opacity=".55"/>
<rect x="430.1" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="438.2" y="222.9" width="5" height="2.1" opacity=".55"/>
<rect x="446.2" y="210.7" width="5" height="14.3" opacity=".55"/>
<rect x="454.2" y="161.4" width="5" height="63.6" class="acc-fill"/>
<rect x="462.2" y="220.4" width="5" height="4.6" opacity=".55"/>
<rect x="470.2" y="223.2" width="5" height="1.8" opacity=".55"/>
<rect x="478.2" y="223.9" width="5" height="1.1" opacity=".55"/>
<rect x="486.2" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="494.3" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="502.3" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="510.3" y="223.9" width="5" height="1.1" opacity=".55"/>
<rect x="518.3" y="223.2" width="5" height="1.8" opacity=".55"/>
<rect x="526.3" y="220.4" width="5" height="4.6" opacity=".55"/>
<rect x="534.3" y="161.4" width="5" height="63.6" class="acc-fill"/>
<rect x="542.4" y="210.7" width="5" height="14.3" opacity=".55"/>
<rect x="550.4" y="222.9" width="5" height="2.1" opacity=".55"/>
<rect x="558.4" y="224.2" width="5" height="0.8" opacity=".55"/>
<rect x="566.4" y="224.6" width="5" height="0.4" opacity=".55"/>
<text x="112.0" y="242" text-anchor="middle" font-size="12">0</text>
<text x="200.2" y="242" text-anchor="middle" font-size="12">11</text>
<text x="280.3" y="242" text-anchor="middle" font-size="12">21</text>
<text x="368.5" y="242" text-anchor="middle" font-size="12">32</text>
<text x="456.7" y="242" text-anchor="middle" font-size="12">43</text>
<text x="536.8" y="242" text-anchor="middle" font-size="12">53</text>
<text x="120.0" y="116" text-anchor="middle" font-size="11">1</text>
<text x="168.1" y="116" text-anchor="middle" font-size="11">7</text>
<text x="216.2" y="116" text-anchor="middle" font-size="11">13</text>
<text x="601.0" y="116" text-anchor="middle" font-size="11">61</text>
<text x="365" y="257" text-anchor="middle" font-size="12">y (peaks near 64k/6)</text>
</svg>
<figcaption>Figure 20.1. The quantum Fourier transform turns a period into peaks. Top: amplitudes on x = 1, 7, 13, … (period 6) in a register of 64. Bottom: probabilities after the QFT, peaked near multiples of 64/6 ≈ 10.67. Measuring gives one peak at random; continued fractions turn it into the period.</figcaption>
</figure>

## 20.5 Shor's algorithm

*Level: intermediate.*

Shor's algorithm reduces factoring to **order finding** and solves order finding with
the QFT.

**The classical reduction** (number theory from Chapters 2 to 4). To factor an odd
$N$ that is not a prime power, pick a random $a$ coprime to $N$ and find its order
$r$, the smallest $r > 0$ with $a^r \equiv 1 \pmod N$. If $r$ is even and $a^{r/2}
\not\equiv -1$, then $a^{r/2}$ is a square root of 1 other than $\pm 1$, and
$\gcd(a^{r/2} - 1, N)$ is a proper factor, as in [Chapter 19](19-Complexity-and-Reductions.md).
For $N$ with at least two distinct odd prime factors, at least half of all $a$ work.

**The quantum part: order finding.**

1. Prepare two registers, the first of $t$ qubits with $Q = 2^t \ge N^2$, in
   $\frac{1}{\sqrt{Q}}\sum_{x=0}^{Q-1}|x\rangle|0\rangle$.
2. Compute $|x\rangle|0\rangle \mapsto |x\rangle|a^x \bmod N\rangle$ with a reversible
   modular-exponentiation circuit. This is where almost all the gates go.
3. Measure the second register (or simply never look at it again; the mathematics is
   the same). It shows some value $v$, and the first register collapses to the $x$
   with $a^x \equiv v$: an arithmetic progression $x_0, x_0 + r, x_0 + 2r, \ldots$ with
   period $r$.
4. Apply the QFT to the first register and measure: $y$ with $y/Q \approx k/r$.
5. Find $k/r$ from $y/Q$ by **continued fractions**: since $|y/Q - k/r| \le 1/(2Q)
   \le 1/(2N^2)$, the fraction $k/r$ with $r < N$ is the unique such fraction and is a
   convergent of $y/Q$ (a theorem of Legendre). If $\gcd(k, r) = 1$, which happens
   with good probability, its denominator is $r$; otherwise repeat.

The quantum circuit uses about $2n$ to $3n$ logical qubits for an $n$-bit $N$ and
$O(n^3)$ gates (less with fast multiplication): polynomial time, against the
subexponential $L_N[1/3]$ of the number field sieve.

### Code it: Shor for $N = 21$

The whole algorithm on a simulated state vector: $Q = 512 \ge 21^2$, base $a = 2$
(whose order modulo 21 is 6), eight runs.

```python
# Shor's algorithm for N = 21, simulated in full: two registers, modular exponentiation,
# measurement of the second register, the QFT of the first, and classical post-processing.
from fractions import Fraction

def shor_simulated(N, a, t, rng):
    Q = 2**t
    # state sum_x |x>|a^x mod N>; measuring the second register leaves the x with a^x = v
    values = [pow(a, x, N) for x in range(Q)]
    v = values[rng.randrange(Q)]
    first = [1.0 if values[x] == v else 0.0 for x in range(Q)]
    nrm = math.sqrt(sum(first))
    first = [c / nrm for c in first]
    amps = qft(first)
    p = [abs(c) ** 2 for c in amps]
    y = rng.choices(range(Q), weights=p)[0]      # measure the first register
    r = Fraction(y, Q).limit_denominator(N - 1).denominator   # continued fractions
    return y, r

def factor_with_order(N, a, r):
    if r % 2 or pow(a, r // 2, N) == N - 1:
        return None
    return math.gcd(pow(a, r // 2, N) - 1, N), math.gcd(pow(a, r // 2, N) + 1, N)

rng = random.Random(20)
N, a, t = 21, 2, 9                               # 2^9 = 512 >= 21^2
true_r = next(k for k in range(1, N) if pow(a, k, N) == 1)
results = []
for _ in range(8):
    y, r = shor_simulated(N, a, t, rng)
    ok = pow(a, r, N) == 1
    results.append((y, r, ok))
print(true_r, results)
print(factor_with_order(N, a, true_r))
```

```text
6 [(85, 6, True), (427, 6, True), (0, 1, False), (429, 19, False), (0, 1, False), (427, 6, True), (171, 3, False), (86, 6, True)]
(7, 3)
```

Each run prints the measured $y$, the denominator $r$ that continued fractions read
from $y/512$, and whether $2^r \equiv 1$. Four of the eight runs return $r = 6$
directly (for example $y = 85$, with $85/512 \approx 1/6$); the run with $y = 171
\approx 512 \cdot 2/6$ returns $r = 3$, a divisor of the true order, because
$\gcd(k, r) \ne 1$; $y = 0$ carries no information. With $r = 6$: $2^3 = 8$, and
$\gcd(7, 21) = 7$, $\gcd(9, 21) = 3$.

The classical half at a larger size, with the order computed classically (the step
the quantum computer would do):

```python
# The classical half of Shor at a larger size: given the order (which the quantum computer finds),
# the factors follow; and how often a random base works.
def order(a, N):
    k, x = 1, a % N
    while x != 1:
        x, k = x * a % N, k + 1
    return k

N = 1022117                                      # = 1009 * 1013
good = 0
tried = 0
for a in range(2, 200):
    if math.gcd(a, N) != 1:
        continue
    tried += 1
    if factor_with_order(N, a, order(a, N)) is not None:
        good += 1
print(order(2, N), factor_with_order(N, 2, order(2, N)), good, tried)
```

```text
11592 (1013, 1009) 181 198
```

The order of 2 modulo $1022117 = 1009 \times 1013$ is 11,592, which gives both
factors, and 181 of the 198 bases tried below 200 would have worked.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="The structure of Shor's algorithm: classical choice of a, quantum order finding with Hadamards, modular exponentiation and the QFT, then classical continued fractions and a gcd" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<rect x="20" y="70" width="110" height="70" rx="8"/>
<rect x="160" y="40" width="320" height="130" rx="10" class="acc"/>
<rect x="510" y="70" width="110" height="70" rx="8"/>
<rect x="180" y="80" width="80" height="50" rx="5"/><rect x="280" y="80" width="80" height="50" rx="5"/><rect x="380" y="80" width="80" height="50" rx="5"/>
<path d="M130 105 L 158 105 M480 105 L 508 105"/>
</g>
<rect x="160" y="40" width="320" height="130" rx="10" class="acc-fill" fill-opacity=".1"/>
<text x="75" y="100" text-anchor="middle">pick a,</text><text x="75" y="118" text-anchor="middle">check gcd</text>
<text x="320" y="30" text-anchor="middle" class="acc">quantum: order finding</text>
<text x="220" y="102" text-anchor="middle">H on all</text><text x="220" y="120" text-anchor="middle" font-size="11">superpose x</text>
<text x="320" y="102" text-anchor="middle">aˣ mod N</text><text x="320" y="120" text-anchor="middle" font-size="11">most gates</text>
<text x="420" y="102" text-anchor="middle">QFT</text><text x="420" y="120" text-anchor="middle" font-size="11">measure y</text>
<text x="565" y="96" text-anchor="middle">continued</text><text x="565" y="112" text-anchor="middle">fractions,</text><text x="565" y="128" text-anchor="middle">gcd</text>
<text x="320" y="200" text-anchor="middle" font-size="12">classical in, classical out: only the period finding needs a quantum computer</text>
</svg>
<figcaption>Figure 20.2. Shor's algorithm. The quantum computer's only job is to find the order r of a modulo N; everything before and after is ordinary number theory. The modular exponentiation dominates the cost.</figcaption>
</figure>

## 20.6 Discrete logarithms and the hidden subgroup problem

*Level: intermediate.*

For a discrete logarithm $h = g^s$ in a group of order $q$, Shor's second algorithm
uses two registers of exponents and computes $|a\rangle|b\rangle \mapsto
|a\rangle|b\rangle|g^a h^{-b}\rangle$. The function $f(a, b) = g^{a - sb}$ is
constant exactly on the cosets of the subgroup $\{(sb, b)\} \subset \mathbb{Z}_q
\times \mathbb{Z}_q$. A two-dimensional QFT and a measurement give a pair $(u, v)$
with $u s + v \equiv 0 \pmod q$, roughly speaking, and so $s = -v u^{-1}$. The same
algorithm works in any group where the operation can be computed, including
elliptic-curve groups; for a 256-bit curve it needs fewer qubits than factoring
RSA-3072, because the numbers are smaller.

Both are instances of the **hidden subgroup problem** (HSP): given $f$ on a group $G$
that is constant on the cosets of an unknown subgroup $H$ and distinct on different
cosets, find $H$. For **abelian** groups, the QFT over $G$ solves it efficiently
(Alexei Kitaev, 1995, generalizing Shor and Daniel Simon). Factoring is the HSP in
$\mathbb{Z}$ (the hidden subgroup is $r\mathbb{Z}$), discrete logarithms the HSP in
$\mathbb{Z}_q^2$.

**Why lattices resist.** Oded Regev showed in 2002 that solving a version of the
shortest vector problem would follow from solving the HSP in the **dihedral group**,
a non-abelian group. For non-abelian groups the Fourier sampling that works so well in
the abelian case gives far too little information; the best known algorithm for the
dihedral HSP, Greg Kuperberg's (2003), is subexponential, and it does not give a
useful attack on lattice cryptography. In April 2024 a preprint by Yilei Chen claimed a
polynomial-time quantum algorithm for LWE with certain parameters; within days a bug
was found, and the claim was withdrawn. As far as is known, lattice problems, codes and
hash functions offer no hidden abelian structure for a quantum computer to find.

## 20.7 Grover's search

*Level: expert.*

Lov Grover (1996) gave a quantum algorithm that finds a marked item among $N$ with
about $\frac{\pi}{4}\sqrt{N}$ queries to an oracle that recognizes it, against about
$N/2$ classically. Applied to key search, it halves the exponent: a 128-bit key in
about $2^{64}$ iterations.

**How it works.** Start from the uniform superposition $|s\rangle = \frac{1}{\sqrt
N}\sum_x |x\rangle$. Each iteration applies two reflections:

1. the **oracle** flips the sign of the marked item's amplitude;
2. the **diffusion** operator $2|s\rangle\langle s| - I$ reflects every amplitude about
   the mean.

In the two-dimensional plane spanned by the marked state $|w\rangle$ and the rest, two
reflections make a rotation, by the angle $2\theta$ with $\sin\theta = 1/\sqrt N$.
After $k$ iterations the state is at angle $(2k + 1)\theta$ from the unmarked
direction, and the probability of measuring $w$ is $\sin^2((2k+1)\theta)$. It is
close to 1 at $k \approx \frac{\pi}{4\theta} \approx \frac{\pi}{4}\sqrt N$, and then
it falls again: running Grover too long *overshoots*.

```python
# Grover's search over N = 2^10 items with one marked: the success probability after k iterations
# is sin^2((2k+1) theta) with sin theta = 1/sqrt(N); the best k is about (pi/4) sqrt(N).
def grover(n, marked, iterations):
    N = 2**n
    state = [1 / math.sqrt(N)] * N
    history = []
    for _ in range(iterations):
        state[marked] = -state[marked]                     # oracle: flip the phase of the target
        mean = sum(state) / N
        state = [2 * mean - a for a in state]              # diffusion: reflect about the mean
        history.append(state[marked] ** 2)
    return history

n = 10
hist = grover(n, 777, 60)
theta = math.asin(1 / math.sqrt(2**n))
best = max(range(60), key=lambda k: hist[k]) + 1
print(best, round(math.pi / 4 * math.sqrt(2**n), 2), round(hist[best - 1], 4),
      round(math.sin((2 * best + 1) * theta) ** 2, 4), round(hist[2 * best - 1], 4))
```

```text
25 25.13 0.9995 0.9995 0.0002
```

For $N = 1024$, the best number of iterations is 25 ($\frac{\pi}{4}\sqrt{1024}
\approx 25.13$), with success probability 0.9995, matching $\sin^2(51\theta)$; after
50 iterations the probability has fallen to 0.0002.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Success probability of Grover's search over 1024 items against the number of iterations: it rises like a sine squared to nearly 1 at 25 iterations, falls to nearly 0 at 50, and rises again" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="70" y1="210" x2="605" y2="210"/><line x1="70" y1="210" x2="70" y2="20"/></g>
<path fill="none" stroke="currentColor" stroke-width="2" class="acc" d="M70.0 209.8 L70.9 209.7 L71.8 209.7 L72.7 209.6 L73.5 209.4 L74.4 209.3 L75.3 209.2 L76.2 209.0 L77.1 208.8 L78.0 208.6 L78.8 208.4 L79.7 208.2 L80.6 208.0 L81.5 207.7 L82.4 207.5 L83.2 207.2 L84.1 206.9 L85.0 206.6 L85.9 206.3 L86.8 206.0 L87.7 205.6 L88.5 205.3 L89.4 204.9 L90.3 204.5 L91.2 204.1 L92.1 203.7 L93.0 203.3 L93.8 202.9 L94.7 202.4 L95.6 202.0 L96.5 201.5 L97.4 201.0 L98.3 200.5 L99.2 200.0 L100.0 199.5 L100.9 199.0 L101.8 198.4 L102.7 197.9 L103.6 197.3 L104.5 196.7 L105.3 196.1 L106.2 195.5 L107.1 194.9 L108.0 194.3 L108.9 193.6 L109.8 193.0 L110.6 192.3 L111.5 191.6 L112.4 191.0 L113.3 190.3 L114.2 189.5 L115.0 188.8 L115.9 188.1 L116.8 187.4 L117.7 186.6 L118.6 185.8 L119.5 185.1 L120.3 184.3 L121.2 183.5 L122.1 182.7 L123.0 181.9 L123.9 181.1 L124.8 180.2 L125.7 179.4 L126.5 178.5 L127.4 177.7 L128.3 176.8 L129.2 175.9 L130.1 175.0 L130.9 174.2 L131.8 173.3 L132.7 172.3 L133.6 171.4 L134.5 170.5 L135.4 169.6 L136.2 168.6 L137.1 167.7 L138.0 166.7 L138.9 165.7 L139.8 164.8 L140.7 163.8 L141.6 162.8 L142.4 161.8 L143.3 160.8 L144.2 159.8 L145.1 158.8 L146.0 157.8 L146.8 156.7 L147.7 155.7 L148.6 154.7 L149.5 153.6 L150.4 152.6 L151.3 151.5 L152.2 150.5 L153.0 149.4 L153.9 148.4 L154.8 147.3 L155.7 146.2 L156.6 145.1 L157.4 144.1 L158.3 143.0 L159.2 141.9 L160.1 140.8 L161.0 139.7 L161.9 138.6 L162.8 137.5 L163.6 136.4 L164.5 135.3 L165.4 134.2 L166.3 133.1 L167.2 131.9 L168.1 130.8 L168.9 129.7 L169.8 128.6 L170.7 127.5 L171.6 126.3 L172.5 125.2 L173.3 124.1 L174.2 123.0 L175.1 121.8 L176.0 120.7 L176.9 119.6 L177.8 118.5 L178.7 117.3 L179.5 116.2 L180.4 115.1 L181.3 114.0 L182.2 112.9 L183.1 111.7 L183.9 110.6 L184.8 109.5 L185.7 108.4 L186.6 107.3 L187.5 106.2 L188.4 105.0 L189.2 103.9 L190.1 102.8 L191.0 101.7 L191.9 100.6 L192.8 99.5 L193.7 98.4 L194.6 97.3 L195.4 96.3 L196.3 95.2 L197.2 94.1 L198.1 93.0 L199.0 91.9 L199.8 90.9 L200.7 89.8 L201.6 88.8 L202.5 87.7 L203.4 86.7 L204.3 85.6 L205.2 84.6 L206.0 83.5 L206.9 82.5 L207.8 81.5 L208.7 80.5 L209.6 79.5 L210.4 78.5 L211.3 77.5 L212.2 76.5 L213.1 75.5 L214.0 74.5 L214.9 73.6 L215.8 72.6 L216.6 71.7 L217.5 70.7 L218.4 69.8 L219.3 68.8 L220.2 67.9 L221.1 67.0 L221.9 66.1 L222.8 65.2 L223.7 64.3 L224.6 63.4 L225.5 62.6 L226.3 61.7 L227.2 60.9 L228.1 60.0 L229.0 59.2 L229.9 58.4 L230.8 57.5 L231.7 56.7 L232.5 55.9 L233.4 55.2 L234.3 54.4 L235.2 53.6 L236.1 52.9 L236.9 52.1 L237.8 51.4 L238.7 50.7 L239.6 49.9 L240.5 49.2 L241.4 48.6 L242.2 47.9 L243.1 47.2 L244.0 46.6 L244.9 45.9 L245.8 45.3 L246.7 44.7 L247.6 44.0 L248.4 43.4 L249.3 42.9 L250.2 42.3 L251.1 41.7 L252.0 41.2 L252.8 40.6 L253.7 40.1 L254.6 39.6 L255.5 39.1 L256.4 38.6 L257.3 38.1 L258.1 37.7 L259.0 37.2 L259.9 36.8 L260.8 36.4 L261.7 36.0 L262.6 35.6 L263.4 35.2 L264.3 34.8 L265.2 34.5 L266.1 34.1 L267.0 33.8 L267.9 33.5 L268.8 33.2 L269.6 32.9 L270.5 32.6 L271.4 32.3 L272.3 32.1 L273.2 31.9 L274.1 31.6 L274.9 31.4 L275.8 31.2 L276.7 31.1 L277.6 30.9 L278.5 30.7 L279.4 30.6 L280.2 30.5 L281.1 30.4 L282.0 30.3 L282.9 30.2 L283.8 30.1 L284.6 30.1 L285.5 30.0 L286.4 30.0 L287.3 30.0 L288.2 30.0 L289.1 30.0 L289.9 30.1 L290.8 30.1 L291.7 30.2 L292.6 30.2 L293.5 30.3 L294.4 30.4 L295.2 30.5 L296.1 30.7 L297.0 30.8 L297.9 31.0 L298.8 31.1 L299.7 31.3 L300.6 31.5 L301.4 31.7 L302.3 32.0 L303.2 32.2 L304.1 32.5 L305.0 32.7 L305.9 33.0 L306.7 33.3 L307.6 33.6 L308.5 33.9 L309.4 34.3 L310.3 34.6 L311.1 35.0 L312.0 35.3 L312.9 35.7 L313.8 36.1 L314.7 36.6 L315.6 37.0 L316.4 37.4 L317.3 37.9 L318.2 38.3 L319.1 38.8 L320.0 39.3 L320.9 39.8 L321.8 40.3 L322.6 40.9 L323.5 41.4 L324.4 42.0 L325.3 42.5 L326.2 43.1 L327.1 43.7 L327.9 44.3 L328.8 44.9 L329.7 45.5 L330.6 46.2 L331.5 46.8 L332.4 47.5 L333.2 48.2 L334.1 48.8 L335.0 49.5 L335.9 50.2 L336.8 51.0 L337.6 51.7 L338.5 52.4 L339.4 53.2 L340.3 53.9 L341.2 54.7 L342.1 55.5 L342.9 56.3 L343.8 57.1 L344.7 57.9 L345.6 58.7 L346.5 59.5 L347.4 60.4 L348.2 61.2 L349.1 62.1 L350.0 62.9 L350.9 63.8 L351.8 64.7 L352.7 65.6 L353.6 66.5 L354.4 67.4 L355.3 68.3 L356.2 69.2 L357.1 70.2 L358.0 71.1 L358.9 72.1 L359.7 73.0 L360.6 74.0 L361.5 75.0 L362.4 75.9 L363.3 76.9 L364.1 77.9 L365.0 78.9 L365.9 79.9 L366.8 80.9 L367.7 81.9 L368.6 83.0 L369.4 84.0 L370.3 85.0 L371.2 86.1 L372.1 87.1 L373.0 88.2 L373.9 89.2 L374.8 90.3 L375.6 91.3 L376.5 92.4 L377.4 93.5 L378.3 94.6 L379.2 95.6 L380.1 96.7 L380.9 97.8 L381.8 98.9 L382.7 100.0 L383.6 101.1 L384.5 102.2 L385.4 103.3 L386.2 104.4 L387.1 105.5 L388.0 106.6 L388.9 107.7 L389.8 108.9 L390.6 110.0 L391.5 111.1 L392.4 112.2 L393.3 113.3 L394.2 114.5 L395.1 115.6 L395.9 116.7 L396.8 117.8 L397.7 119.0 L398.6 120.1 L399.5 121.2 L400.4 122.3 L401.2 123.5 L402.1 124.6 L403.0 125.7 L403.9 126.8 L404.8 127.9 L405.7 129.1 L406.6 130.2 L407.4 131.3 L408.3 132.4 L409.2 133.5 L410.1 134.6 L411.0 135.8 L411.9 136.9 L412.7 138.0 L413.6 139.1 L414.5 140.2 L415.4 141.3 L416.3 142.3 L417.1 143.4 L418.0 144.5 L418.9 145.6 L419.8 146.7 L420.7 147.7 L421.6 148.8 L422.4 149.9 L423.3 150.9 L424.2 152.0 L425.1 153.0 L426.0 154.1 L426.9 155.1 L427.8 156.2 L428.6 157.2 L429.5 158.2 L430.4 159.2 L431.3 160.2 L432.2 161.2 L433.1 162.2 L433.9 163.2 L434.8 164.2 L435.7 165.2 L436.6 166.2 L437.5 167.1 L438.4 168.1 L439.2 169.0 L440.1 170.0 L441.0 170.9 L441.9 171.8 L442.8 172.7 L443.6 173.6 L444.5 174.5 L445.4 175.4 L446.3 176.3 L447.2 177.2 L448.1 178.0 L448.9 178.9 L449.8 179.7 L450.7 180.6 L451.6 181.4 L452.5 182.2 L453.4 183.0 L454.2 183.8 L455.1 184.6 L456.0 185.4 L456.9 186.2 L457.8 186.9 L458.7 187.7 L459.6 188.4 L460.4 189.1 L461.3 189.9 L462.2 190.6 L463.1 191.2 L464.0 191.9 L464.9 192.6 L465.7 193.3 L466.6 193.9 L467.5 194.5 L468.4 195.2 L469.3 195.8 L470.1 196.4 L471.0 197.0 L471.9 197.6 L472.8 198.1 L473.7 198.7 L474.6 199.2 L475.4 199.7 L476.3 200.3 L477.2 200.8 L478.1 201.2 L479.0 201.7 L479.9 202.2 L480.8 202.6 L481.6 203.1 L482.5 203.5 L483.4 203.9 L484.3 204.3 L485.2 204.7 L486.1 205.1 L486.9 205.4 L487.8 205.8 L488.7 206.1 L489.6 206.4 L490.5 206.7 L491.4 207.0 L492.2 207.3 L493.1 207.6 L494.0 207.8 L494.9 208.1 L495.8 208.3 L496.6 208.5 L497.5 208.7 L498.4 208.9 L499.3 209.1 L500.2 209.2 L501.1 209.4 L501.9 209.5 L502.8 209.6 L503.7 209.7 L504.6 209.8 L505.5 209.9 L506.4 209.9 L507.2 210.0 L508.1 210.0 L509.0 210.0 L509.9 210.0 L510.8 210.0 L511.7 210.0 L512.5 209.9 L513.4 209.9 L514.3 209.8 L515.2 209.7 L516.1 209.6 L517.0 209.5 L517.9 209.4 L518.7 209.2 L519.6 209.1 L520.5 208.9 L521.4 208.7 L522.3 208.5 L523.1 208.3 L524.0 208.1 L524.9 207.9 L525.8 207.6 L526.7 207.4 L527.6 207.1 L528.5 206.8 L529.3 206.5 L530.2 206.2 L531.1 205.8 L532.0 205.5 L532.9 205.1 L533.8 204.8 L534.6 204.4 L535.5 204.0 L536.4 203.6 L537.3 203.1 L538.2 202.7 L539.0 202.3 L539.9 201.8 L540.8 201.3 L541.7 200.8 L542.6 200.3 L543.5 199.8 L544.4 199.3 L545.2 198.7 L546.1 198.2 L547.0 197.6 L547.9 197.1 L548.8 196.5 L549.6 195.9 L550.5 195.3 L551.4 194.6 L552.3 194.0 L553.2 193.4 L554.1 192.7 L555.0 192.0 L555.8 191.3 L556.7 190.7 L557.6 190.0 L558.5 189.2 L559.4 188.5 L560.2 187.8 L561.1 187.0 L562.0 186.3 L562.9 185.5 L563.8 184.7 L564.7 184.0 L565.5 183.2 L566.4 182.3 L567.3 181.5 L568.2 180.7 L569.1 179.9 L570.0 179.0 L570.9 178.2 L571.7 177.3 L572.6 176.4 L573.5 175.6 L574.4 174.7 L575.3 173.8 L576.1 172.9 L577.0 171.9 L577.9 171.0 L578.8 170.1 L579.7 169.2 L580.6 168.2 L581.5 167.3 L582.3 166.3 L583.2 165.3 L584.1 164.4 L585.0 163.4 L585.9 162.4 L586.8 161.4 L587.6 160.4 L588.5 159.4 L589.4 158.4 L590.3 157.3 L591.2 156.3 L592.0 155.3 L592.9 154.2 L593.8 153.2 L594.7 152.1 L595.6 151.1 L596.5 150.0 L597.4 149.0 L598.2 147.9 L599.1 146.8 L600.0 145.8"/>
<circle cx="70.0" cy="209.8" r="2"/>
<circle cx="78.8" cy="208.4" r="2"/>
<circle cx="87.7" cy="205.6" r="2"/>
<circle cx="96.5" cy="201.5" r="2"/>
<circle cx="105.3" cy="196.1" r="2"/>
<circle cx="114.2" cy="189.5" r="2"/>
<circle cx="123.0" cy="181.9" r="2"/>
<circle cx="131.8" cy="173.3" r="2"/>
<circle cx="140.7" cy="163.8" r="2"/>
<circle cx="149.5" cy="153.6" r="2"/>
<circle cx="158.3" cy="143.0" r="2"/>
<circle cx="167.2" cy="131.9" r="2"/>
<circle cx="176.0" cy="120.7" r="2"/>
<circle cx="184.8" cy="109.5" r="2"/>
<circle cx="193.7" cy="98.4" r="2"/>
<circle cx="202.5" cy="87.7" r="2"/>
<circle cx="211.3" cy="77.5" r="2"/>
<circle cx="220.2" cy="67.9" r="2"/>
<circle cx="229.0" cy="59.2" r="2"/>
<circle cx="237.8" cy="51.4" r="2"/>
<circle cx="246.7" cy="44.7" r="2"/>
<circle cx="255.5" cy="39.1" r="2"/>
<circle cx="264.3" cy="34.8" r="2"/>
<circle cx="273.2" cy="31.9" r="2"/>
<circle cx="282.0" cy="30.3" r="2"/>
<circle cx="290.8" cy="30.1" r="2"/>
<circle cx="299.7" cy="31.3" r="2"/>
<circle cx="308.5" cy="33.9" r="2"/>
<circle cx="317.3" cy="37.9" r="2"/>
<circle cx="326.2" cy="43.1" r="2"/>
<circle cx="335.0" cy="49.5" r="2"/>
<circle cx="343.8" cy="57.1" r="2"/>
<circle cx="352.7" cy="65.6" r="2"/>
<circle cx="361.5" cy="75.0" r="2"/>
<circle cx="370.3" cy="85.0" r="2"/>
<circle cx="379.2" cy="95.6" r="2"/>
<circle cx="388.0" cy="106.6" r="2"/>
<circle cx="396.8" cy="117.8" r="2"/>
<circle cx="405.7" cy="129.1" r="2"/>
<circle cx="414.5" cy="140.2" r="2"/>
<circle cx="423.3" cy="150.9" r="2"/>
<circle cx="432.2" cy="161.2" r="2"/>
<circle cx="441.0" cy="170.9" r="2"/>
<circle cx="449.8" cy="179.7" r="2"/>
<circle cx="458.7" cy="187.7" r="2"/>
<circle cx="467.5" cy="194.5" r="2"/>
<circle cx="476.3" cy="200.3" r="2"/>
<circle cx="485.2" cy="204.7" r="2"/>
<circle cx="494.0" cy="207.8" r="2"/>
<circle cx="502.8" cy="209.6" r="2"/>
<circle cx="511.7" cy="210.0" r="2"/>
<circle cx="520.5" cy="208.9" r="2"/>
<circle cx="529.3" cy="206.5" r="2"/>
<circle cx="538.2" cy="202.7" r="2"/>
<circle cx="547.0" cy="197.6" r="2"/>
<circle cx="555.8" cy="191.3" r="2"/>
<circle cx="564.7" cy="184.0" r="2"/>
<circle cx="573.5" cy="175.6" r="2"/>
<circle cx="582.3" cy="166.3" r="2"/>
<circle cx="591.2" cy="156.3" r="2"/>
<circle cx="600.0" cy="145.8" r="2"/>
<line x1="290.8" y1="30" x2="290.8" y2="210" stroke="currentColor" stroke-dasharray="3 4" opacity=".6"/>
<text x="290.8" y="24" text-anchor="middle" font-size="12">25 iterations: 0.9995</text>
<text x="511.7" y="196" text-anchor="middle" font-size="12">50: 0.0002</text>
<text x="70.0" y="228" text-anchor="middle" font-size="12">0</text>
<text x="158.3" y="228" text-anchor="middle" font-size="12">10</text>
<text x="246.7" y="228" text-anchor="middle" font-size="12">20</text>
<text x="335.0" y="228" text-anchor="middle" font-size="12">30</text>
<text x="423.3" y="228" text-anchor="middle" font-size="12">40</text>
<text x="511.7" y="228" text-anchor="middle" font-size="12">50</text>
<text x="600.0" y="228" text-anchor="middle" font-size="12">60</text>
<text x="62" y="214.0" text-anchor="end" font-size="12">0</text>
<text x="62" y="124.0" text-anchor="end" font-size="12">0.5</text>
<text x="62" y="34.0" text-anchor="end" font-size="12">1</text>
<text x="337" y="246" text-anchor="middle" font-size="12">iterations k</text>
</svg>
<figcaption>Figure 20.3. Grover's search over N = 1024 items: the probability of finding the marked item oscillates as sin²((2k + 1)θ), peaking after about (π/4)√N = 25 iterations. More iterations make it worse, not better.</figcaption>
</figure>

**The limit.** Charles Bennett, Ethan Bernstein, Gilles Brassard and Umesh Vazirani
(BBBV, 1997) proved that any quantum algorithm needs $\Omega(\sqrt N)$ oracle queries
to find a marked item: Grover is optimal, and no quantum algorithm searches
unstructured spaces exponentially faster. For collisions, the quantum speedup is
smaller still in realistic cost models.

**What Grover means in practice.** Grover's iterations are sequential: splitting the
search over $P$ machines gives each $\sqrt{N/P}$ iterations, a speedup of only
$\sqrt{P}$. Each iteration is a full AES evaluation as a reversible circuit, with
error correction.

```python
# What Grover means for keys: iterations for exhaustive search, and their depth in time.
for bits in (56, 80, 128, 256):
    it = math.pi / 4 * 2 ** (bits / 2)
    years = it * 1e-6 / (3600 * 24 * 365.25)          # one iteration per microsecond, run sequentially
    print(bits, round(math.log2(it), 1), "%.1e" % years)
```

```text
56 27.7 6.7e-06
80 39.7 2.7e-02
128 63.7 4.6e+05
256 127.7 8.5e+24
```

The columns are the key size, $\log_2$ of the Grover iterations, and the years needed
at a (very optimistic) one iteration per microsecond in sequence. A 56-bit DES key
would fall in minutes, an 80-bit key in about ten days, a 128-bit key would take
460,000 years, and parallelism helps only by the square root of the machine count.
That is why NIST's post-quantum security categories are defined by the cost of
searching for an AES key, with a limit on circuit depth, and why AES-128 is still
considered acceptable while 256-bit keys are recommended for long-term secrets.

## 20.8 Resource estimates

*Level: expert.*

How large a quantum computer breaks RSA-2048? Estimates count **physical qubits**,
the noisy hardware devices, which are combined by quantum error correction (usually
the surface code) into far fewer, reliable **logical qubits**.

| estimate | target | physical qubits | time |
|---|---|---|---|
| Craig Gidney and Martin Ekerå (2019) | RSA-2048 | about 20 million | about 8 hours |
| Craig Gidney (2025) | RSA-2048 | under 1 million | under a week |
| Martin Roetteler, Michael Naehrig, Krysta Svore and Kristin Lauter (2017) | 256-bit elliptic curve | 2,330 logical qubits | (logical estimate) |

All assume gate error rates around $10^{-3}$ and a microsecond-scale cycle time. The
drop from 20 million to under a million came from better arithmetic (approximate
residue arithmetic, cheaper magic-state production) rather than better hardware, and
it is the reason "Q-day" estimates keep moving earlier. Today's largest machines have
on the order of a thousand physical qubits with error rates near those thresholds; the
largest numbers ever factored with a genuinely quantum run of Shor's algorithm are
tiny (15 in 2001, 21 in 2012, each with simplifications that use the known answer).

The *Post-quantum cryptography* book's
[chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md) follows the timelines
and migration deadlines; the mathematics is the same as here.

## 20.9 What it means for key sizes

*Level: expert.*

- **RSA, finite-field and elliptic-curve Diffie-Hellman, DSA, ECDSA, EdDSA**: broken
  completely by Shor; larger keys do not help (the cost is polynomial). Replace them by
  ML-KEM, ML-DSA, SLH-DSA, FN-DSA, HQC, or hybrids during the transition.
- **Symmetric ciphers and MACs**: Grover halves the exponent at best, and less in
  practice. AES-256 keeps a large margin; AES-128 is still considered adequate by NIST
  under realistic depth limits.
- **Hash functions**: preimages via Grover cost about $2^{n/2}$ for an $n$-bit hash;
  collisions see little practical quantum gain. SHA-256 and SHA-3 stay.
- **Lattices, codes, hash-based signatures**: no known quantum algorithm beyond Grover
  and modest sieving speedups (Chapter 14's $2^{0.257\beta}$).

### Break it: harvest now, decrypt later

Any key exchange recorded today with RSA or elliptic curves can be decrypted on the
day a large enough quantum computer exists. Signatures are different: forging needs
the quantum computer *at the time of forgery*, so signature migration can wait longer,
except for long-lived keys such as firmware roots of trust.

### Fix it

- Move key exchange to hybrids (X25519MLKEM768) now; TLS, SSH and Signal already have.
- Inventory where RSA and elliptic curves are used (certificates, firmware, VPNs,
  smart cards) and plan replacements on the published deadlines (NIST's draft schedule
  deprecates them after 2030 and disallows them after 2035).
- Prefer 256-bit symmetric keys for data that must stay secret for decades.

## Going deeper

- *Phase estimation* (Kitaev, 1995): the general tool behind Shor, which estimates an
  eigenvalue $e^{2\pi i\phi}$ of a unitary to $t$ bits with $t$ controlled powers and an
  inverse QFT.
- *Simon's algorithm* (1994) finds a hidden XOR-period exponentially faster than any
  classical algorithm; it breaks some symmetric constructions (Even-Mansour, CBC-MAC)
  in the model where the attacker can query them in superposition (Kaplan, Leurent,
  Leverrier and Naya-Plasencia, 2016).
- *Quantum walks and collision finding*: the Brassard-Høyer-Tapp algorithm finds
  collisions in $N^{1/3}$ queries, but with $N^{1/3}$ memory, which makes it no better
  than classical parallel collision search in realistic cost models (Bernstein, 2009).
- *Error correction*: the surface code, the threshold theorem, and the overheads that
  turn logical qubits into thousands of physical ones.

## Check yourself

??? question "1. A qubit is in state $\frac{1}{2}|0\rangle + \frac{\sqrt 3}{2}|1\rangle$. What are the measurement probabilities?"

    $\frac{1}{4}$ for 0 and $\frac{3}{4}$ for 1.

??? question "2. How many complex amplitudes describe a 50-qubit register, and why can't you read them all?"

    $2^{50} \approx 10^{15}$. A measurement returns one basis state and destroys the
    superposition, so each run yields only $n$ classical bits.

??? question "3. Why is $HH = I$ an example of interference?"

    The two computational paths to $|1\rangle$ carry amplitudes $+\frac{1}{2}$ and
    $-\frac{1}{2}$ and cancel; the paths to $|0\rangle$ add to 1.

??? question "4. In Shor's algorithm with $N = 21$, why must $Q$ be at least $N^2 = 441$?"

    So that $y/Q$ approximates $k/r$ within $1/(2N^2)$, which guarantees that $k/r$ is
    a convergent of the continued fraction of $y/Q$ and can be recovered.

??? question "5. The order of $a = 4$ modulo 15 is 2. Does it give a factor?"

    $4^{1} = 4$, $\gcd(3, 15) = 3$ and $\gcd(5, 15) = 5$. Yes, both factors.

??? question "6. Why doesn't doubling the RSA key size protect against Shor?"

    Shor runs in polynomial time: doubling $n$ multiplies the cost by a constant factor
    (about 8 for $O(n^3)$), not by an exponential.

??? question "7. How many Grover iterations for a 64-bit key, and what is the success probability if you do twice that many?"

    About $\frac{\pi}{4}2^{32} \approx 3.4 \times 10^9$. Twice as many rotate the state
    past the target to angle about $\pi$, and the success probability falls close to 0.

??? question "8. Why does the dihedral hidden subgroup problem matter for lattices?"

    Regev reduced a lattice problem (unique SVP) to it; an efficient quantum algorithm
    for the dihedral HSP would threaten lattice cryptography. None is known: the best,
    Kuperberg's, is subexponential.

??? question "9. Which is more urgent to migrate, key exchange or signatures, and why?"

    Key exchange: recorded traffic can be decrypted later, while forging a signature
    requires the quantum computer at the time of the forgery.

## What you learned

- A register of $n$ qubits is a unit vector in $\mathbb{C}^{2^n}$; gates are unitary;
  measurement samples one basis state with probability $|\alpha_x|^2$.
- Interference (amplitudes adding and cancelling) and entanglement are what quantum
  algorithms exploit; Deutsch-Jozsa shows it with one query.
- The QFT is the Fourier transform on amplitudes, with $O(t^2)$ gates; it turns a
  hidden period into measurable peaks.
- Shor: factoring reduces to order finding; order finding is a QFT on $a^x \bmod N$;
  continued fractions and a gcd finish. Discrete logarithms, including on elliptic
  curves, fall the same way. All are abelian hidden subgroup problems.
- Lattices relate to the non-abelian dihedral HSP, with no efficient algorithm known.
- Grover finds a needle among $N$ in $\frac{\pi}{4}\sqrt N$ iterations, and BBBV
  proves no algorithm does better; parallelism helps only by a square root.
- Estimates for RSA-2048 fell from 20 million physical qubits (2019) to under a
  million (2025); public-key cryptography must migrate, symmetric keys need at most
  doubling.

**Next:** the [Glossary](Glossary.md), every term defined in this book, with the
chapter that defines it.

## Further reading

- Michael Nielsen and Isaac Chuang, *Quantum Computation and Quantum Information*,
  10th anniversary edition (Cambridge, 2010), chapters 4 to 6.
- Peter Shor, "Polynomial-Time Algorithms for Prime Factorization and Discrete
  Logarithms on a Quantum Computer", *SIAM Journal on Computing* 26 (1997); conference
  version FOCS 1994.
- Lov Grover, "A Fast Quantum Mechanical Algorithm for Database Search", STOC 1996.
- Charles Bennett, Ethan Bernstein, Gilles Brassard and Umesh Vazirani, "Strengths
  and Weaknesses of Quantum Computing", *SIAM Journal on Computing* 26 (1997).
- Oded Regev, "Quantum Computation and Lattice Problems", FOCS 2002.
- Craig Gidney and Martin Ekerå, "How to Factor 2048 Bit RSA Integers in 8 Hours Using
  20 Million Noisy Qubits", *Quantum* 5 (2021); Craig Gidney, "How to Factor 2048 Bit
  RSA Integers with Less than a Million Noisy Qubits" (2025).
- Martin Roetteler, Michael Naehrig, Krysta Svore and Kristin Lauter, "Quantum Resource
  Estimates for Computing Elliptic Curve Discrete Logarithms", ASIACRYPT 2017.
- Ronald de Wolf, *Quantum Computing: Lecture Notes* (arXiv 1907.09415, updated
  regularly), free.
- In *The cryptography book*: [Chapter 20](../../book/20-Quantum-Computers.md).
