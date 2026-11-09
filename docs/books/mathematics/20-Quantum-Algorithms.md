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
it, Grover's search and its proven limit, quantum error correction and what current
resource estimates mean for key sizes. It also builds Simon's algorithm, which breaks
some symmetric constructions in the right model, and phase estimation, of which Shor's
algorithm is one case.*

!!! abstract "In this chapter"
    **You will learn:**

    - qubits as unit vectors in $\mathbb{C}^2$, registers as tensor products, gates
      as unitary matrices, and measurement;
    - the Hadamard gate, interference and entanglement, with a small simulator;
    - the Deutsch-Jozsa algorithm, and Simon's algorithm for a hidden XOR period;
    - the quantum Fourier transform, and phase estimation as a circuit;
    - Shor's algorithm: period finding simulated for $N = 21$, order finding as phase
      estimation for $N = 15$, and continued fractions by hand;
    - Shor for discrete logarithms, the hidden subgroup problem, and why lattice
      problems do not fall to the same idea;
    - Grover's search, its $\frac{\pi}{4}\sqrt{N}$ iterations, simulated, and why the
      BBBV lower bound says nothing does better;
    - quantum error correction, from the three-qubit codes to the surface code, and
      why RSA-2048 needs about a million physical qubits;
    - Simon's attacks on Even-Mansour and CBC-MAC, and why the query model matters;
    - what all of this means for key sizes.

    **You need:** [Chapter 9](09-Linear-Algebra.md) (vectors and matrices),
    [Chapter 2](02-Divisibility-Primes-and-Factoring.md) (continued fractions),
    [Chapter 4](04-Powers-and-Primitive-Roots.md) (orders and discrete logarithms),
    [Chapter 11](11-Polynomials-at-Work.md) (the Fourier transform) and complex
    numbers ($e^{i\theta} = \cos\theta + i\sin\theta$).

    **Levels:** §20.1 to §20.3 are for beginners (Simon's algorithm at the end of §20.3
    is intermediate), §20.4 to §20.6 are intermediate, §20.7 to §20.10 are expert.

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

### Simon's problem

*This subsection and the next are intermediate.*

Deutsch-Jozsa beats only deterministic algorithms. In 1994 Daniel Simon found a
problem where the gap survives randomness; Shor's paper, a few months later, follows
the same pattern with a Fourier transform over a cyclic group in place of the
Hadamards.

**Simon's problem.** A function $f: \{0,1\}^n \to \{0,1\}^m$ is promised to have a
hidden **XOR period** $s \ne 0$: $f(x) = f(x')$ exactly when $x' = x$ or $x' = x
\oplus s$. So $f$ is two-to-one, and each output is shared by a pair $\{x, x \oplus
s\}$. Find $s$.

Classically, the only way to learn anything about $s$ is to find two inputs with the
same output, and then $s$ is their XOR. That is a collision search, and by the
birthday bound of [Chapter 16](16-Probability.md) it needs about $2^{n/2}$ queries;
Simon proved that every classical algorithm, randomized or not, needs exponentially
many. The quantum algorithm needs about $n$ queries:

1. Start with $|0^n\rangle|0^m\rangle$ and apply $H$ to every qubit of the first
   register: $\frac{1}{\sqrt{2^n}}\sum_x |x\rangle|0^m\rangle$.
2. Query the oracle once: $\frac{1}{\sqrt{2^n}}\sum_x |x\rangle|f(x)\rangle$.
3. Measure the second register (or never look at it again; the result is the same). It
   shows some value $f(x_0)$, and the first register collapses to the two inputs with
   that value: $\frac{1}{\sqrt 2}\bigl(|x_0\rangle + |x_0 \oplus s\rangle\bigr)$.
4. Apply $H$ to every qubit of the first register and measure.

To see what step 4 gives, use the formula for $n$ Hadamards on a basis state, which
follows from $H|b\rangle = \frac{1}{\sqrt 2}\sum_{c}(-1)^{bc}|c\rangle$ applied to each
bit:

$$
H^{\otimes n}|x\rangle = \frac{1}{\sqrt{2^n}} \sum_{y} (-1)^{x \cdot y}\,|y\rangle,
\qquad x \cdot y = x_1y_1 \oplus \cdots \oplus x_ny_n .
$$

The amplitude of $|y\rangle$ after step 4 is therefore

$$
\frac{(-1)^{x_0 \cdot y} + (-1)^{(x_0 \oplus s)\cdot y}}{\sqrt{2^{n+1}}}
= \frac{(-1)^{x_0 \cdot y}\bigl(1 + (-1)^{s \cdot y}\bigr)}{\sqrt{2^{n+1}}} .
$$

If $s \cdot y = 1$ the two paths cancel and the amplitude is 0. If $s \cdot y = 0$ they
add, and the probability is $4/2^{n+1} = 1/2^{n-1}$. So each run returns a uniformly
random $y$ from the $2^{n-1}$ vectors **orthogonal** to $s$ modulo 2, and the unknown
$x_0$ has vanished into a sign that measurement cannot see. Each run is one linear
equation $y \cdot s = 0$ over $\mathrm{GF}(2)$. Once $n - 1$ independent equations are
in hand, Gaussian elimination from [Chapter 9](09-Linear-Algebra.md) leaves exactly
one nonzero solution, and that is $s$. Random vectors from an $(n-1)$-dimensional
space span it after fewer than $n + 1$ draws on average, so the total cost is about
$n$ queries and $O(n^3)$ classical work. For $n = 128$, that is roughly 130 quantum
queries against about $2^{64}$ classical ones.

### By hand: Simon with $n = 3$

Take $s = 110$ and pair the inputs as $\{000, 110\}$, $\{001, 111\}$, $\{010, 100\}$,
$\{011, 101\}$, giving each pair its own output. Suppose step 3 leaves
$\frac{1}{\sqrt 2}(|001\rangle + |111\rangle)$. The two dot products are $001 \cdot y =
y_0$ and $111 \cdot y = y_2 \oplus y_1 \oplus y_0$ (bits written $y_2y_1y_0$), and the
normalization is $\frac{1}{\sqrt 2}\cdot\frac{1}{\sqrt 8} = \frac14$. For $y = 000$
the signs are $+1, +1$ and the amplitude is $+\frac12$; for $001$ they are $-1, -1$,
giving $-\frac12$; for $010$ they are $+1, -1$ and cancel. Going through all eight, the
amplitude is $\pm\frac12$ (probability $\frac14$) for 000, 001, 110 and 111, and 0 for
010, 011, 100 and 101. The four survivors are exactly the $y$ with $y \cdot 110 = 0$.
Two runs that return 001 and 110 give the equations $s_0 = 0$ and $s_2 \oplus s_1 = 0$;
the only nonzero solution is $s = 110$. A run that returns 000 is wasted, and one that
returns 111 adds nothing new once the other two are known.

```python
# Simon's algorithm: f(x) = f(x XOR s) for a hidden s. The input x sits in the low n qubits,
# the output f(x) in the m qubits above them.
def simon_run(f, n, m, rng):
    """One run: H on the input, the oracle |x>|0> -> |x>|f(x)>, H again, measure the input."""
    state = [0j] * 2 ** (n + m)
    state[0] = 1
    for q in range(n):
        state = apply_1q(state, Hd, q, n + m)
    out = [0j] * len(state)
    for i, a in enumerate(state):                  # the oracle permutes basis states
        out[i ^ (f(i % 2**n) << n)] += a
    for q in range(n):
        out = apply_1q(out, Hd, q, n + m)
    p = [0.0] * 2**n
    for i, a in enumerate(out):
        p[i % 2**n] += abs(a) ** 2                 # probability of each input-register outcome
    return rng.choices(range(2**n), weights=p)[0], p

def dot(a, b):
    return bin(a & b).count("1") % 2

def candidates(ys, n):
    """Every nonzero s with y . s = 0 for all measured y (Gaussian elimination does this faster)."""
    return [s for s in range(1, 2**n) if all(dot(y, s) == 0 for y in ys)]

rng = random.Random(1994)
s = 0b110
y, p = simon_run(lambda x: min(x, x ^ s), 3, 3, rng)
print([round(v, 3) for v in p])
s = 0b1011
ys = []
while len(candidates(ys, 4)) > 1:
    ys.append(simon_run(lambda x: min(x, x ^ s), 4, 4, rng)[0])
print([format(y, "04b") for y in ys], [format(c, "04b") for c in candidates(ys, 4)])
```

```text
[0.25, 0.25, 0.0, 0.0, 0.0, 0.0, 0.25, 0.25]
['1010', '1010', '0100', '0011'] ['1011']
```

The first line is the hand computation, done by the simulator ($\min(x, x \oplus s)$
is an easy oracle with period $s$). The second is a run for $n = 4$ and $s = 1011$:
four queries, one a repeat, give three independent equations whose only nonzero
solution is 1011. Section 20.9 turns this against real symmetric constructions.

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
<path opacity=".75" d="M117.5 47.2h5v52.8h-5zM165.6 47.2h5v52.8h-5zM213.7 47.2h5v52.8h-5zM261.8 47.2h5v52.8h-5zM309.9 47.2h5v52.8h-5zM358.0 47.2h5v52.8h-5zM406.1 47.2h5v52.8h-5zM454.2 47.2h5v52.8h-5zM502.3 47.2h5v52.8h-5zM550.4 47.2h5v52.8h-5zM598.5 47.2h5v52.8h-5z"/>
<path class="acc-fill" d="M109.5 130.0h5v95.0h-5zM197.7 161.4h5v63.6h-5zM277.8 161.4h5v63.6h-5zM366.0 130.0h5v95.0h-5zM454.2 161.4h5v63.6h-5zM534.3 161.4h5v63.6h-5z"/>
<path opacity=".55" d="M165.6 224.6h5v0.4h-5zM173.6 224.2h5v0.8h-5zM181.6 222.9h5v2.1h-5zM189.7 210.7h5v14.3h-5zM205.7 220.4h5v4.6h-5zM213.7 223.2h5v1.8h-5zM221.7 223.9h5v1.1h-5zM229.7 224.2h5v0.8h-5zM237.8 224.2h5v0.8h-5zM245.8 224.2h5v0.8h-5zM253.8 223.9h5v1.1h-5zM261.8 223.2h5v1.8h-5zM269.8 220.4h5v4.6h-5zM285.8 210.7h5v14.3h-5zM293.9 222.9h5v2.1h-5zM301.9 224.2h5v0.8h-5zM309.9 224.6h5v0.4h-5zM422.1 224.6h5v0.4h-5zM430.1 224.2h5v0.8h-5zM438.2 222.9h5v2.1h-5zM446.2 210.7h5v14.3h-5zM462.2 220.4h5v4.6h-5zM470.2 223.2h5v1.8h-5zM478.2 223.9h5v1.1h-5zM486.2 224.2h5v0.8h-5zM494.3 224.2h5v0.8h-5zM502.3 224.2h5v0.8h-5zM510.3 223.9h5v1.1h-5zM518.3 223.2h5v1.8h-5zM526.3 220.4h5v4.6h-5zM542.4 210.7h5v14.3h-5zM550.4 222.9h5v2.1h-5zM558.4 224.2h5v0.8h-5zM566.4 224.6h5v0.4h-5z"/>
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

### Phase estimation

The QFT does more than find periods. Its most general use is **phase estimation**,
due to Alexei Kitaev (1995): given a unitary $U$ and one of its eigenvectors
$|u\rangle$, with

$$
U|u\rangle = e^{2\pi i \varphi}|u\rangle, \qquad 0 \le \varphi < 1,
$$

estimate the phase $\varphi$. Shor's algorithm is phase estimation for one particular
$U$.

**The circuit** (Figure 20.2) has $t$ counting qubits and a target register holding
$|u\rangle$.

1. Apply $H$ to each counting qubit.
2. For $j = 0, 1, \ldots, t-1$, let counting qubit $j$ control $U^{2^j}$ on the target.
3. Apply the inverse QFT to the counting register and measure it, giving an integer
   $m$ with $0 \le m < 2^t$. The estimate is $\varphi \approx m/2^t$.

**Why it works: phase kickback.** A controlled $U$ acting on $\frac{1}{\sqrt
2}(|0\rangle + |1\rangle)|u\rangle$ leaves the $|0\rangle$ half alone and multiplies
the $|1\rangle$ half by the eigenvalue:

$$
\tfrac{1}{\sqrt 2}\bigl(|0\rangle|u\rangle + |1\rangle\, e^{2\pi i\varphi}|u\rangle\bigr)
= \tfrac{1}{\sqrt 2}\bigl(|0\rangle + e^{2\pi i\varphi}|1\rangle\bigr)|u\rangle .
$$

The target is unchanged; the phase has moved onto the control qubit. With $U^{2^j}$
the phase is $e^{2\pi i \varphi 2^j}$. Write $Q = 2^t$ and $x = \sum_j x_j 2^j$; the
phases multiply, and the counting register ends step 2 as

$$
\bigotimes_{j=0}^{t-1} \tfrac{1}{\sqrt 2}\bigl(|0\rangle + e^{2\pi i \varphi 2^j}|1\rangle\bigr)
= \frac{1}{\sqrt Q}\sum_{x=0}^{Q-1} e^{2\pi i \varphi x}\,|x\rangle .
$$

If $\varphi = m/Q$ exactly, this is $\mathrm{QFT}|m\rangle$, and the inverse QFT returns
$m$ with certainty. Otherwise write $\delta = \varphi - m/Q$; summing a geometric
series gives the probability of outcome $m$:

$$
\Pr[m] = \left|\frac{1}{Q}\sum_{x=0}^{Q-1} e^{2\pi i \delta x}\right|^2
= \frac{\sin^2(\pi Q \delta)}{Q^2 \sin^2(\pi \delta)} .
$$

For the integer $m$ nearest to $\varphi Q$, $|\delta| \le 1/(2Q)$, and this is at least
$4/\pi^2 \approx 0.405$; the two nearest integers together get at least $8/\pi^2
\approx 0.81$. To learn $\varphi$ to $n$ bits with failure probability at most
$\varepsilon$, Nielsen and Chuang show that $t = n + \lceil \log_2(2 +
\frac{1}{2\varepsilon}) \rceil$ counting qubits suffice.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Phase estimation circuit: three counting qubits start in zero and get a Hadamard each; counting qubit j controls U to the power 2 to the j on a target register holding the eigenvector u; the phases kick back onto the counting qubits; an inverse quantum Fourier transform and measurements read out m, about 8 phi" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.2"><line x1="55" y1="55" x2="95" y2="55"/><line x1="125" y1="55" x2="405" y2="55"/><line x1="475" y1="55" x2="500" y2="55"/><line x1="55" y1="100" x2="95" y2="100"/><line x1="125" y1="100" x2="405" y2="100"/><line x1="475" y1="100" x2="500" y2="100"/><line x1="55" y1="145" x2="95" y2="145"/><line x1="125" y1="145" x2="405" y2="145"/><line x1="475" y1="145" x2="500" y2="145"/><line x1="55" y1="205" x2="175" y2="205"/><line x1="215" y1="205" x2="255" y2="205"/><line x1="295" y1="205" x2="335" y2="205"/><line x1="375" y1="205" x2="600" y2="205"/></g>
<g stroke="currentColor" stroke-width="1.5" fill="none"><rect x="95" y="40" width="30" height="30" rx="3"/><rect x="500" y="41" width="32" height="28" rx="3"/><path d="M506 62 A10 10 0 0 1 526 62 M516 62 L524 47"/><rect x="95" y="85" width="30" height="30" rx="3"/><rect x="500" y="86" width="32" height="28" rx="3"/><path d="M506 107 A10 10 0 0 1 526 107 M516 107 L524 92"/><rect x="95" y="130" width="30" height="30" rx="3"/><rect x="500" y="131" width="32" height="28" rx="3"/><path d="M506 152 A10 10 0 0 1 526 152 M516 152 L524 137"/><line x1="195" y1="55" x2="195" y2="190"/><rect x="175" y="190" width="40" height="30" rx="3"/><line x1="275" y1="100" x2="275" y2="190"/><rect x="255" y="190" width="40" height="30" rx="3"/><line x1="355" y1="145" x2="355" y2="190"/><rect x="335" y="190" width="40" height="30" rx="3"/><rect x="405" y="38" width="70" height="124" rx="3"/></g>
<circle cx="195" cy="55" r="4.5"/><circle cx="275" cy="100" r="4.5"/><circle cx="355" cy="145" r="4.5"/>
<text x="20" y="60">|0⟩</text><text x="110" y="60" text-anchor="middle">H</text><text x="545" y="60">m₀</text><text x="20" y="105">|0⟩</text><text x="110" y="105" text-anchor="middle">H</text><text x="545" y="105">m₁</text><text x="20" y="150">|0⟩</text><text x="110" y="150" text-anchor="middle">H</text><text x="545" y="150">m₂</text><text x="20" y="210">|u⟩</text><text x="195" y="210" text-anchor="middle">U</text><text x="275" y="210" text-anchor="middle">U²</text><text x="355" y="210" text-anchor="middle">U⁴</text><text x="440" y="105" text-anchor="middle">QFT⁻¹</text>
<g font-size="12"><text x="203" y="45" fill-opacity=".75">turn φ</text><text x="283" y="90" fill-opacity=".75">turn 2φ</text><text x="363" y="135" fill-opacity=".75">turn 4φ</text><text x="520" y="190" text-anchor="middle">m = m₂m₁m₀ ≈ 8φ</text><text x="320" y="248" text-anchor="middle">the target never changes; each controlled power kicks a phase back onto its control qubit</text></g>
</svg>
<figcaption>Figure 20.2. Phase estimation with three counting qubits. Counting qubit j controls U to the power 2^j; each controlled power leaves the eigenvector |u⟩ alone and adds a turn of 2^j·φ to its control. The inverse QFT turns those phases into the binary digits of φ.</figcaption>
</figure>

**By hand: $t = 2$ and the phase gate $S$.** Take $U = S = \mathrm{diag}(1, i)$, whose
eigenvector $|1\rangle$ has eigenvalue $i = e^{2\pi i \cdot 1/4}$, so $\varphi =
\frac14$. Counting qubit 0 controls $S$ and picks up the phase $i$; counting qubit 1
controls $S^2 = \mathrm{diag}(1, -1)$ and picks up $-1$. The counting register is

$$
\tfrac{1}{\sqrt 2}(|0\rangle - |1\rangle)_{\text{qubit }1} \otimes
\tfrac{1}{\sqrt 2}(|0\rangle + i|1\rangle)_{\text{qubit }0}
= \tfrac12\bigl(|0\rangle + i|1\rangle - |2\rangle - i|3\rangle\bigr)
= \tfrac12 \sum_{x=0}^{3} i^x |x\rangle .
$$

The inverse QFT with $Q = 4$ gives outcome $m$ the amplitude $\frac14 \sum_x i^x
(-i)^{xm}$. For $m = 1$ every term is $i^x(-i)^x = 1$, so the amplitude is 1: the
measurement returns $m = 1$ with certainty, and $m/Q = \frac14 = \varphi$.

**By hand: a phase that does not fit.** Now let $\varphi = \frac13$, with $t = 3$
counting qubits. The nearest multiple of $\frac18$ is $\frac38$, so the best outcome is
$m = 3$ with $\delta = \frac13 - \frac38 = -\frac{1}{24}$. Then $\sin^2(\pi Q\delta) =
\sin^2(\pi/3) = 0.75$ and $Q^2 \sin^2(\pi\delta) = 64 \sin^2(7.5^\circ) = 64 \times
0.017037 = 1.0904$, so $\Pr[3] = 0.75 / 1.0904 = 0.688$. The next nearest, $m = 2$,
has $\delta = \frac{1}{12}$ and probability $0.75/(64 \sin^2 15^\circ) = 0.175$. The
listing builds the circuit gate by gate and checks these numbers.

```python
# Phase estimation as a circuit: t counting qubits (0 .. t-1) and one target qubit t holding
# the eigenvector |1> of U = diag(1, e^(2 pi i phi)). Then the inverse QFT on the counting qubits.
def iqft(state):
    Q = len(state)
    w = [cmath.exp(-2j * math.pi * k / Q) for k in range(Q)]
    return [sum(state[x] * w[(x * y) % Q] for x in range(Q)) / math.sqrt(Q) for y in range(Q)]

def phase_estimation(phi, t):
    state = [0j] * 2 ** (t + 1)
    state[1 << t] = 1                              # counting register |0...0>, target |1>
    for j in range(t):
        state = apply_1q(state, Hd, j, t + 1)
    for j in range(t):                             # controlled-U^(2^j), control j, target t
        kick = cmath.exp(2j * math.pi * phi * 2**j)
        state = [a * kick if (i >> j) & 1 and (i >> t) & 1 else a for i, a in enumerate(state)]
    counting = state[1 << t:]                      # the target stays |1>: keep that half
    return [round(abs(a) ** 2, 4) for a in iqft(counting)]

print(phase_estimation(1 / 8, 3))
print(phase_estimation(1 / 3, 3))
p6 = phase_estimation(1 / 3, 6)
best = max(range(64), key=lambda m: p6[m])
print(best, p6[best], round(sum(p6[best - 1:best + 2]), 4), round(4 / math.pi**2, 4))
```

```text
[0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
[0.0156, 0.0316, 0.1749, 0.6878, 0.0469, 0.0186, 0.0126, 0.0119]
21 0.684 0.8978 0.4053
```

A phase of $\frac18$ fits three bits and comes back as $m = 1$ every time. For
$\frac13$, three counting qubits give the hand-computed 0.688 and 0.175; six give $m =
21$ ($\frac{21}{64} = 0.328$, within $\frac{1}{128}$ of $\frac13$) with probability
0.684, and one of 20, 21, 22 with 0.898, well above the guaranteed 0.405.

**The catch, and why Shor escapes it.** Step 2 needs $U^{2^j}$ for $j$ up to $t - 1$;
applying a general $U$ $2^{t-1}$ times would take exponential time. Phase estimation
is efficient only when high powers of $U$ are cheap. For multiplication by $a$ modulo
$N$ they are: $U^{2^j}$ is
multiplication by $a^{2^j} \bmod N$, a number the classical computer finds by repeated
squaring ([Chapter 4](04-Powers-and-Primitive-Roots.md)) before the circuit is built.

**One counting qubit is enough.** Robert Griffiths and Chi-Sheng Niu (1996) showed that
the inverse QFT and measurement can be done one qubit at a time, with classically
controlled phase corrections, so a single recycled counting qubit suffices. Stéphane
Beauregard (2003) built Shor's algorithm this way with $2n + 3$ qubits for an $n$-bit
modulus, the source of the "about $2n$" in §20.5.

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
<figcaption>Figure 20.3. Shor's algorithm. The quantum computer's only job is to find the order r of a modulo N; everything before and after is ordinary number theory. The modular exponentiation dominates the cost.</figcaption>
</figure>

### Order finding as phase estimation: $N = 15$

Shor's quantum step is phase estimation for the unitary that multiplies by $a$:

$$
U_a|y\rangle = |a y \bmod N\rangle \quad (0 \le y < N), \qquad U_a|y\rangle = |y\rangle \quad (y \ge N).
$$

Because $a$ is invertible modulo $N$, $U_a$ permutes the basis states, and a
permutation matrix is unitary. If $r$ is the order of $a$, then for each $k = 0, 1,
\ldots, r-1$ the vector

$$
|u_k\rangle = \frac{1}{\sqrt r}\sum_{j=0}^{r-1} e^{-2\pi i kj/r}\,|a^j \bmod N\rangle
$$

is an eigenvector with eigenvalue $e^{2\pi i k/r}$. The proof is one line: $U_a$
moves $|a^j\rangle$ to $|a^{j+1}\rangle$, and shifting the index of the sum by one
pulls out a factor $e^{2\pi i k/r}$, with the end of the cycle wrapping around because
$a^r \equiv 1$. So the phases are $\varphi = k/r$.

We cannot prepare $|u_k\rangle$ without knowing $r$. We do not need to: the sum of all
of them is

$$
\frac{1}{\sqrt r}\sum_{k=0}^{r-1} |u_k\rangle
= \frac{1}{r}\sum_{j}\Bigl(\sum_{k} e^{-2\pi i kj/r}\Bigr)|a^j\rangle = |1\rangle ,
$$

because the inner sum of roots of unity is $r$ when $j = 0$ and 0 otherwise. Starting
the target register in $|1\rangle$, which anyone can prepare, runs phase estimation on
an equal mixture of all the eigenvectors, and the outcome is $m/Q \approx k/r$ for a
uniformly random $k$. The controlled powers $U_a^{2^j}$ applied to $|1\rangle$ compute
exactly $|x\rangle|a^x \bmod N\rangle$: the circuit is the one in the Shor listing
above, seen from a different side.

**By hand, $N = 15$, $a = 7$.** The powers of 7 modulo 15 are $7, 49 \equiv 4, 28
\equiv 13, 91 \equiv 1$, so $r = 4$ and $U_7$ cycles $1 \to 7 \to 4 \to 13 \to 1$. For
$k = 1$:

$$
|u_1\rangle = \tfrac12\bigl(|1\rangle - i|7\rangle - |4\rangle + i|13\rangle\bigr),
\qquad
U_7|u_1\rangle = \tfrac12\bigl(|7\rangle - i|4\rangle - |13\rangle + i|1\rangle\bigr) = i\,|u_1\rangle ,
$$

eigenvalue $i = e^{2\pi i \cdot 1/4}$. With $t = 8$ counting qubits ($Q = 256 \ge 15^2 =
225$) and $r = 4$ dividing $Q$ exactly, the outcomes are $m = 0, 64, 128, 192$ with
probability $\frac14$ each. Then $192/256 = \frac34$ gives $r = 4$; $64/256 = \frac14$
gives $r = 4$; $128/256 = \frac12$ gives only $r = 2$, and the check $7^2 = 49 \equiv 4
\not\equiv 1$ shows it is a proper divisor of the order (here $k = 2$ shared a factor
with $r$). Small multiples of a failed candidate, or the least common multiple of two runs'
denominators, recover $r = 4$. Finally $7^{2} \equiv 4$,
and $\gcd(4 - 1, 15) = 3$, $\gcd(4 + 1, 15) = 5$. The first experimental run of
Shor's algorithm, on a seven-qubit nuclear magnetic resonance machine in 2001, factored
15 with $a = 11$ and with this harder case, $a = 7$.

```python
# Order finding for N = 15, a = 7, as phase estimation of U|y> = |7y mod 15>.
N, a, t = 15, 7, 8                                 # Q = 256 >= 15^2 = 225

# Phase estimation on |1> (an equal mix of the four eigenvectors): controlled U^(2^j) turns
# |x>|1> into |x>|7^x mod 15>; then the inverse QFT on the counting register.
Q = 2**t
rows = {}
for x in range(Q):
    rows.setdefault(pow(a, x, N), [0j] * Q)[x] = 1 / math.sqrt(Q)
p = [0.0] * Q
for row in rows.values():
    for m, amp in enumerate(iqft(row)):
        p[m] += abs(amp) ** 2
for m in range(Q):
    if p[m] > 1e-9:
        frac = Fraction(m, Q).limit_denominator(N - 1)
        print(m, round(p[m], 4), frac, frac.denominator)
print(pow(a, 2, N), math.gcd(pow(a, 2, N) - 1, N), math.gcd(pow(a, 2, N) + 1, N))
```

```text
0 0.25 0 1
64 0.25 1/4 4
128 0.25 1/2 2
192 0.25 3/4 4
4 3 5
```

The outcomes are the four multiples of 64, each with probability $\frac14$; the last
line is $7^2 \bmod 15$ and the two factors.

### By hand: the continued-fraction step

When $r$ does not divide $Q$, the measured $m$ is only close to $kQ/r$, and the
fraction $k/r$ has to be dug out of $m/Q$. Take the run $y = 427$ from the $N = 21$
listing, with $Q = 512$. Euclid's algorithm on 427 and 512 gives the partial
quotients ([Chapter 2](02-Divisibility-Primes-and-Factoring.md) introduces continued
fractions):

$$
512 = 1 \cdot 427 + 85, \quad 427 = 5 \cdot 85 + 2, \quad 85 = 42 \cdot 2 + 1, \quad 2 = 2 \cdot 1 ,
$$

so $\frac{427}{512} = [0; 1, 5, 42, 2] = \cfrac{1}{1 + \cfrac{1}{5 + \cfrac{1}{42 +
\cfrac{1}{2}}}}$. The convergents $h_i/k_i$ follow from $h_i = a_i h_{i-1} + h_{i-2}$
and $k_i = a_i k_{i-1} + k_{i-2}$:

| $a_i$ | 0 | 1 | 5 | 42 | 2 |
|---|---|---|---|---|---|
| $h_i$ | 0 | 1 | 5 | 211 | 427 |
| $k_i$ | 1 | 1 | 6 | 253 | 512 |

The last convergent with denominator below $N = 21$ is $\frac56$, so $r = 6$, and indeed
$2^6 = 64 \equiv 1 \pmod{21}$. Legendre's theorem says why this works: if
$|m/Q - k/r| < 1/(2r^2)$, then $k/r$ is a convergent of $m/Q$. The nearest peak is
within $1/(2Q)$ of $k/r$, and $Q \ge N^2 > r^2$ makes that small enough.

Now $y = 429$, two steps from the peak at $426.67$. Here $512 = 1 \cdot 429 +
83$, $429 = 5 \cdot 83 + 14$, $83 = 5 \cdot 14 + 13$, $14 = 1 \cdot 13 + 1$, $13 = 13
\cdot 1$, so $\frac{429}{512} = [0; 1, 5, 5, 1, 13]$ with convergents $1, \frac56,
\frac{26}{31}, \ldots$. Since $|429/512 - 5/6| = 14/3072 \approx 0.0046$ is below $1/(2 \cdot 6^2)$,
$\frac56$ is still a convergent. Yet the listing returned 19, because
`limit_denominator(20)` returns the closest fraction with denominator at most 20:
$\frac{16}{19}$
(distance $41/9728 \approx 0.0042$), not a convergent but a **semiconvergent**
$\frac{1 + 3 \cdot 5}{1 + 3 \cdot 6}$ lying between $\frac56$ and $\frac{26}{31}$. The
fix is to do what the theory says: list the convergents, and test each denominator
below $N$.

```python
# Continued fractions done properly: list the convergents of y/Q, and test each denominator.
# Uses factor_with_order() from the Shor listing above.
def convergents(num, den):
    h_prev, h, k_prev, k = 0, 1, 1, 0              # h/k runs through the convergents
    out = []
    while den:
        q = num // den
        num, den = den, num - q * den
        h_prev, h = h, q * h + h_prev
        k_prev, k = k, q * k + k_prev
        out.append((h, k))
    return out

def order_from(y, Q, N, a):
    for h, k in convergents(y, Q):
        if 0 < k < N and pow(a, k, N) == 1:
            return k
    return None

print(convergents(427, 512))
print(convergents(429, 512))
print(order_from(427, 512, 21, 2), order_from(429, 512, 21, 2), order_from(171, 512, 21, 2))
print(factor_with_order(21, 2, order_from(429, 512, 21, 2)))
```

```text
[(0, 1), (1, 1), (5, 6), (211, 253), (427, 512)]
[(0, 1), (1, 1), (5, 6), (26, 31), (31, 37), (429, 512)]
6 6 None
(7, 3)
```

Both runs now give the order 6, and the factors 7 and 3. The run $y = 171$ still fails,
for a different reason: its fraction is $\frac{1}{3} = \frac{2}{6}$ in lowest terms, so
the denominator is only a divisor of $r$; the cure there is another run, or the
least common multiple of two denominators.

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
<path fill="none" stroke="currentColor" stroke-width="2" class="acc" d="M70.0 209.8 L74.4 209.3 L78.8 208.4 L83.2 207.2 L87.7 205.6 L92.1 203.7 L96.5 201.5 L100.9 199.0 L105.3 196.1 L109.8 193.0 L114.2 189.5 L118.6 185.8 L123.0 181.9 L127.4 177.7 L131.8 173.3 L136.2 168.6 L140.7 163.8 L145.1 158.8 L149.5 153.6 L153.9 148.4 L158.3 143.0 L162.8 137.5 L167.2 131.9 L171.6 126.3 L176.0 120.7 L180.4 115.1 L184.8 109.5 L189.2 103.9 L193.7 98.4 L198.1 93.0 L202.5 87.7 L206.9 82.5 L211.3 77.5 L215.8 72.6 L220.2 67.9 L224.6 63.4 L229.0 59.2 L233.4 55.2 L237.8 51.4 L242.2 47.9 L246.7 44.7 L251.1 41.7 L255.5 39.1 L259.9 36.8 L264.3 34.8 L268.8 33.2 L273.2 31.9 L277.6 30.9 L282.0 30.3 L286.4 30.0 L290.8 30.1 L295.2 30.5 L299.7 31.3 L304.1 32.5 L308.5 33.9 L312.9 35.7 L317.3 37.9 L321.8 40.3 L326.2 43.1 L330.6 46.2 L335.0 49.5 L339.4 53.2 L343.8 57.1 L348.2 61.2 L352.7 65.6 L357.1 70.2 L361.5 75.0 L365.9 79.9 L370.3 85.0 L374.8 90.3 L379.2 95.6 L383.6 101.1 L388.0 106.6 L392.4 112.2 L396.8 117.8 L401.2 123.5 L405.7 129.1 L410.1 134.6 L414.5 140.2 L418.9 145.6 L423.3 150.9 L427.8 156.2 L432.2 161.2 L436.6 166.2 L441.0 170.9 L445.4 175.4 L449.8 179.7 L454.2 183.8 L458.7 187.7 L463.1 191.2 L467.5 194.5 L471.9 197.6 L476.3 200.3 L480.8 202.6 L485.2 204.7 L489.6 206.4 L494.0 207.8 L498.4 208.9 L502.8 209.6 L507.2 210.0 L511.7 210.0 L516.1 209.6 L520.5 208.9 L524.9 207.9 L529.3 206.5 L533.8 204.8 L538.2 202.7 L542.6 200.3 L547.0 197.6 L551.4 194.6 L555.8 191.3 L560.2 187.8 L564.7 184.0 L569.1 179.9 L573.5 175.6 L577.9 171.0 L582.3 166.3 L586.8 161.4 L591.2 156.3 L595.6 151.1 L600.0 145.8"/>
<path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M70.0 209.8h0M78.8 208.4h0M87.7 205.6h0M96.5 201.5h0M105.3 196.1h0M114.2 189.5h0M123.0 181.9h0M131.8 173.3h0M140.7 163.8h0M149.5 153.6h0M158.3 143.0h0M167.2 131.9h0M176.0 120.7h0M184.8 109.5h0M193.7 98.4h0M202.5 87.7h0M211.3 77.5h0M220.2 67.9h0M229.0 59.2h0M237.8 51.4h0M246.7 44.7h0M255.5 39.1h0M264.3 34.8h0M273.2 31.9h0M282.0 30.3h0M290.8 30.1h0M299.7 31.3h0M308.5 33.9h0M317.3 37.9h0M326.2 43.1h0M335.0 49.5h0M343.8 57.1h0M352.7 65.6h0M361.5 75.0h0M370.3 85.0h0M379.2 95.6h0M388.0 106.6h0M396.8 117.8h0M405.7 129.1h0M414.5 140.2h0M423.3 150.9h0M432.2 161.2h0M441.0 170.9h0M449.8 179.7h0M458.7 187.7h0M467.5 194.5h0M476.3 200.3h0M485.2 204.7h0M494.0 207.8h0M502.8 209.6h0M511.7 210.0h0M520.5 208.9h0M529.3 206.5h0M538.2 202.7h0M547.0 197.6h0M555.8 191.3h0M564.7 184.0h0M573.5 175.6h0M582.3 166.3h0M591.2 156.3h0M600.0 145.8h0"/>
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
<figcaption>Figure 20.4. Grover's search over N = 1024 items: the probability of finding the marked item oscillates as sin²((2k + 1)θ), peaking after about (π/4)√N = 25 iterations. More iterations make it worse, not better.</figcaption>
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

### Why nothing beats Grover: the BBBV argument in plain words

The lower bound of Bennett, Bernstein, Brassard and Vazirani is why symmetric
cryptography survives. It is a hybrid argument ([Chapter 16](16-Probability.md))
applied to quantum states.

Run any quantum algorithm that makes $T$ queries, but give it an oracle that marks
**nothing**. Before each query $t$, the state spreads some probability $q_w(t)$ over
each item $w$: the squared amplitude on the basis states that ask about $w$. These add
up to at most 1 at each step, so over all $T$ queries

$$
\sum_{w} \sum_{t=1}^{T} q_w(t) \le T .
$$

There are $N$ items, so on average an item receives total "query weight" at most
$T/N$, and most items receive about that much or less. Pick such an item $w$.

Now run the same algorithm with $w$ marked. The two oracles differ only on $w$, so query
$t$ can pull the two runs apart by at most $2\sqrt{q_w(t)}$: flipping the sign of an
amplitude $\alpha$ moves the state by $|2\alpha|$. Distances add (the triangle
inequality), so the final states differ by at most

$$
2\sum_{t=1}^{T} \sqrt{q_w(t)} \le 2\sqrt{T \sum_t q_w(t)} \le 2\sqrt{T \cdot \frac{T}{N}}
= \frac{2T}{\sqrt N},
$$

using the Cauchy-Schwarz inequality in the middle. To find $w$ with good probability,
the algorithm must end in a state measurably different from the one it would reach if
nothing were marked, which needs that distance to be at least a constant $c$. So $2T /
\sqrt N \ge c$, and $T \ge \frac{c}{2}\sqrt N$.

In words: a query looks at every item at once, but with total weight 1 spread over $N$
items, and evidence about one item grows only like the square root of its weight.
Christof Zalka (1999) showed that Grover's $\frac{\pi}{4}\sqrt N$ is optimal up to
lower-order terms. Two consequences matter for cryptography:

- **Brute force on a good cipher stays exponential:** about $2^{64}$ sequential AES
  evaluations for a 128-bit key. A faster quantum attack must use structure, as
  Simon's algorithm does in §20.9.
- **Quantum computers are not believed to solve NP-complete problems quickly.** BBBV
  shows that, relative to a random oracle, search alone cannot do it. That is not a
  proof about real problems, but it fits the picture of
  [Chapter 19](19-Complexity-and-Reductions.md): the quantum threat comes from hidden
  structure such as periods, not from raw search power.

The *Post-quantum cryptography* book's
[chapter 2](../post-quantum/02-Security-Levels.md) shows how NIST turned the
sequential nature of Grover into its "MAXDEPTH" security categories.

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

All three assume gate error rates around $10^{-3}$ and a microsecond-scale cycle time.
The drop from 20 million to under a million came from better arithmetic (approximate
residue arithmetic, cheaper magic-state production, denser storage of idle qubits)
rather than better hardware, and it is the reason "Q-day" estimates keep moving
earlier. The rest of this section explains where "a million" comes from.

### Why noisy qubits need a code

A physical qubit with a gate error of $10^{-3}$ survives about a thousand operations;
Shor's algorithm for RSA-2048 needs billions. Classical computers would store each bit
three times and vote. For qubits three things seem to forbid that: no unitary copies an
unknown state (the **no-cloning** theorem: copying $|0\rangle$ and $|1\rangle$ forces
the wrong answer on their sum, by linearity); measuring the data destroys the
superposition; and errors are continuous, small drifts rather than clean flips.

All three have answers. A code spreads one qubit over several by **entangling**, not
copying. The checks measure only **parities** of several qubits, which reveal the
error but nothing about the data. And measuring the parities **discretizes** the error:
any one-qubit error is a combination of the identity, a bit flip $X$, a phase flip $Z =
\mathrm{diag}(1, -1)$ and their product, and the measurement collapses it onto one of
these, which is then undone. Correcting $X$ and $Z$ on any one qubit corrects every
error on it.

### The three-qubit bit-flip code

Encode $\alpha|0\rangle + \beta|1\rangle$ as

$$
\alpha|000\rangle + \beta|111\rangle ,
$$

with two CNOTs from the data qubit onto two fresh qubits in $|0\rangle$ (Figure 20.5).
This is not three copies, $(\alpha|0\rangle + \beta|1\rangle)^{\otimes 3}$, but one
logical qubit with **codewords** $|0_L\rangle = |000\rangle$ and $|1_L\rangle =
|111\rangle$.

Two parity checks find a single bit flip: $q_0 \oplus q_1$ and $q_1 \oplus q_2$, each
computed onto an extra **ancilla** qubit with two CNOTs and then measured. In operator
language these are the **stabilizers** $Z_0Z_1$ and $Z_1Z_2$: both codewords are
eigenvectors with eigenvalue $+1$, and a flipped qubit changes the sign of the checks
it touches. The two measured bits form the **syndrome**:

| error | state | $q_0 \oplus q_1$ | $q_1 \oplus q_2$ | correction |
|---|---|---|---|---|
| none | $\alpha\lvert 000\rangle + \beta\lvert 111\rangle$ | 0 | 0 | none |
| $X$ on $q_0$ | $\alpha\lvert 001\rangle + \beta\lvert 110\rangle$ | 1 | 0 | $X$ on $q_0$ |
| $X$ on $q_1$ | $\alpha\lvert 010\rangle + \beta\lvert 101\rangle$ | 1 | 1 | $X$ on $q_1$ |
| $X$ on $q_2$ | $\alpha\lvert 100\rangle + \beta\lvert 011\rangle$ | 0 | 1 | $X$ on $q_2$ |

(Bit strings are written $q_2q_1q_0$.) **By hand**, take the third row. Both terms,
$|010\rangle$ and $|101\rangle$, have $q_0 \oplus q_1 = 1$ and $q_1 \oplus q_2 = 1$, so
the ancillas come out $(1, 1)$ with certainty, and measuring them does not disturb
$\alpha$ and $\beta$ at all. The syndrome points at $q_1$; flipping it back restores
$\alpha|000\rangle + \beta|111\rangle$. The decoder never learns $\alpha$ or $\beta$,
and never needs to.

<figure class="mars-fig">
<svg viewBox="0 0 640 275" width="640" role="img" aria-label="The three-qubit bit-flip code as a circuit: two CNOTs copy the basis value of the first qubit onto two fresh qubits, noise may flip one data qubit, four CNOTs compute the parities of qubits 0 and 1 and of qubits 1 and 2 onto two ancillas, the ancillas are measured, and the syndrome selects which qubit to flip back" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.2"><line x1="110" y1="55" x2="235" y2="55"/><line x1="275" y1="55" x2="545" y2="55"/><line x1="595" y1="55" x2="620" y2="55"/><line x1="110" y1="95" x2="235" y2="95"/><line x1="275" y1="95" x2="545" y2="95"/><line x1="595" y1="95" x2="620" y2="95"/><line x1="110" y1="135" x2="235" y2="135"/><line x1="275" y1="135" x2="545" y2="135"/><line x1="595" y1="135" x2="620" y2="135"/><line x1="110" y1="190" x2="470" y2="190"/><line x1="110" y1="230" x2="470" y2="230"/></g>
<g stroke="currentColor" stroke-width="1.5" fill="none"><line x1="150" y1="55" x2="150" y2="104"/><circle cx="150" cy="95" r="9"/><path d="M141 95H159M150 86V104"/><line x1="190" y1="55" x2="190" y2="144"/><circle cx="190" cy="135" r="9"/><path d="M181 135H199M190 126V144"/><line x1="310" y1="55" x2="310" y2="199"/><circle cx="310" cy="190" r="9"/><path d="M301 190H319M310 181V199"/><line x1="345" y1="95" x2="345" y2="199"/><circle cx="345" cy="190" r="9"/><path d="M336 190H354M345 181V199"/><line x1="395" y1="95" x2="395" y2="239"/><circle cx="395" cy="230" r="9"/><path d="M386 230H404M395 221V239"/><line x1="430" y1="135" x2="430" y2="239"/><circle cx="430" cy="230" r="9"/><path d="M421 230H439M430 221V239"/><rect x="470" y="176" width="32" height="28" rx="3"/><path d="M476 197 A10 10 0 0 1 496 197 M486 197 L494 182"/><rect x="470" y="216" width="32" height="28" rx="3"/><path d="M476 237 A10 10 0 0 1 496 237 M486 237 L494 222"/><rect x="545" y="38" width="50" height="114" rx="3"/><path stroke-width="1" d="M502 188H560V152M502 192H564V152M502 228H572V152M502 232H576V152"/></g>
<circle cx="150" cy="55" r="4.5"/><circle cx="190" cy="55" r="4.5"/><circle cx="310" cy="55" r="4.5"/><circle cx="345" cy="95" r="4.5"/><circle cx="395" cy="95" r="4.5"/><circle cx="430" cy="135" r="4.5"/>
<rect x="235" y="38" width="40" height="114" rx="4" fill-opacity=".08" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="10" y="60">α|0⟩+β|1⟩</text><text x="84" y="100">|0⟩</text><text x="84" y="140">|0⟩</text><text x="84" y="195">|0⟩</text><text x="84" y="235">|0⟩</text>
<g font-size="12"><text x="255" y="100" text-anchor="middle">X?</text><text x="570" y="100" text-anchor="middle">fix</text><text x="10" y="195">q0⊕q1</text><text x="10" y="235">q1⊕q2</text><text x="170" y="20" text-anchor="middle">encode</text><text x="255" y="20" text-anchor="middle">noise</text><text x="370" y="20" text-anchor="middle">measure two parities</text><text x="570" y="20" text-anchor="middle">correct</text><text x="320" y="266" text-anchor="middle">the parities reveal where a flip happened, never whether the data is 0 or 1</text></g>
</svg>
<figcaption>Figure 20.5. The three-qubit bit-flip code. Two CNOTs encode, noise may flip one data qubit, four CNOTs copy two parities onto ancillas, and the measured syndrome says which qubit to flip back. The phase-flip code is the same circuit with a Hadamard on each data qubit after encoding and before the checks.</figcaption>
</figure>

If each qubit flips independently with probability $p$, the code fails only when two
or three flip: $p_L = 3p^2(1 - p) + p^3 = 3p^2 - 2p^3$. For $p = 0.01$, that is
$0.000298$, about 34 times better than an unprotected qubit.

### The phase-flip code

A phase flip $Z$ leaves $|000\rangle$ and $|111\rangle$ where they are and changes the
sign of $\beta$, which no $Z$-parity check can see. But the Hadamard gate swaps the two
kinds of error, $HZH = X$, because $H$ maps $|0\rangle, |1\rangle$ to $|{+}\rangle,
|{-}\rangle$ and $Z$ swaps $|{+}\rangle$ and $|{-}\rangle$. So the **phase-flip code**
is the bit-flip code in the other basis:

$$
\alpha|{+}{+}{+}\rangle + \beta|{-}{-}{-}\rangle ,
$$

with stabilizers $X_0X_1$ and $X_1X_2$. Decoding applies $H$ to each qubit, runs the
same parity checks, and applies $H$ again. Peter Shor's nine-qubit code (1995), the
first quantum error-correcting code, nests the two (a phase-flip code whose qubits are
each bit-flip encoded) and corrects any error on any one of its nine qubits. Andrew Steane's seven-qubit code (1996) does the same
with seven qubits by borrowing the classical Hamming code of
[Chapter 18](18-Error-Correcting-Codes.md).

```python
# The three-qubit bit-flip code: data on qubits 0, 1, 2; syndrome ancillas on qubits 3 and 4.
Z = [[1, 0], [0, -1]]

def encode(alpha, beta, phase_code=False):
    state = [0j] * 32
    state[0], state[1] = alpha, beta               # qubit 0 holds alpha|0> + beta|1>
    state = apply_cnot(apply_cnot(state, 0, 1), 0, 2)   # alpha|000> + beta|111>
    if phase_code:                                 # alpha|+++> + beta|--->
        for q in range(3):
            state = apply_1q(state, Hd, q, 5)
    return state

def correct(state, phase_code=False):
    if phase_code:                                 # back to the bit-flip basis
        for q in range(3):
            state = apply_1q(state, Hd, q, 5)
    state = apply_cnot(apply_cnot(state, 0, 3), 1, 3)   # ancilla 3 = q0 XOR q1
    state = apply_cnot(apply_cnot(state, 1, 4), 2, 4)   # ancilla 4 = q1 XOR q2
    i = next(i for i, amp in enumerate(state) if abs(amp) > 1e-9)
    syndrome = ((i >> 3) & 1, (i >> 4) & 1)        # measuring the ancillas: one definite answer
    flip = {(1, 0): 0, (1, 1): 1, (0, 1): 2}.get(syndrome)
    if flip is not None:
        state = apply_1q(state, X, flip, 5)
    if phase_code:
        for q in range(3):
            state = apply_1q(state, Hd, q, 5)
    return state, syndrome

def fidelity(state, good, syndrome):
    shift = syndrome[0] << 3 | syndrome[1] << 4    # the ancillas keep the syndrome bits
    return round(abs(sum(good[i].conjugate() * state[i | shift] for i in range(8))) ** 2, 6)

for phase_code, err in ((False, X), (True, Z)):
    good = encode(0.6, 0.8, phase_code)
    for where in (None, 0, 1, 2):
        state = good if where is None else apply_1q(good, err, where, 5)
        fixed, syn = correct(state, phase_code)
        print("phase" if phase_code else "bit  ", where, syn, fidelity(fixed, good, syn))

good = encode(0.6, 0.8)
two = apply_1q(apply_1q(good, X, 0, 5), X, 1, 5)    # two bit flips: too many for this code
fixed, syn = correct(two)
print("two flips", syn, fidelity(fixed, good, syn))
fixed, syn = correct(apply_1q(good, Z, 0, 5))       # a phase flip: invisible to the bit-flip code
print("phase flip on bit code", syn, fidelity(fixed, good, syn))
```

```text
bit   None (0, 0) 1.0
bit   0 (1, 0) 1.0
bit   1 (1, 1) 1.0
bit   2 (0, 1) 1.0
phase None (0, 0) 1.0
phase 0 (1, 0) 1.0
phase 1 (1, 1) 1.0
phase 2 (0, 1) 1.0
two flips (0, 1) 0.9216
phase flip on bit code (0, 0) 0.0784
```

The state is $0.6|0\rangle + 0.8|1\rangle$. Every single error of the kind each code is
built for gives its own syndrome and is undone exactly (fidelity 1). Two bit flips are
"corrected" into a logical flip, $0.8|0_L\rangle + 0.6|1_L\rangle$, with overlap $(2
\times 0.6 \times 0.8)^2 = 0.9216$: close, but wrong. A phase flip passes the bit-flip
checks with syndrome $(0, 0)$ and leaves $0.6|0_L\rangle - 0.8|1_L\rangle$, overlap
$(0.36 - 0.64)^2 = 0.0784$. A real code must catch both kinds, over and over, with
checks that are themselves noisy.

### The surface code

The **surface code**, from Alexei Kitaev's toric code (1997) and its planar form by
Sergey Bravyi and Kitaev (1998), is what nearly every estimate for superconducting
machines assumes. It needs only a square grid of qubits with nearest-neighbor
couplings, and it tolerates physical error rates up to about 1%, among the highest of
any practical code.

A patch of **distance** $d$ (Figure 20.6) has $d^2$ data qubits on a grid and $d^2 - 1$
measure qubits, one in each square, $2d^2 - 1$ in all. Each measure qubit repeatedly
checks a parity of its two or four neighbors: half the squares check $Z$-parities (they
catch bit flips) and half check $X$-parities (they catch phase flips), the two codes of
the last section woven into one grid. One round of all the checks is a **cycle**, about
a microsecond on superconducting chips. The data are never measured; a classical
**decoder** watches the stream of syndromes and infers the most likely errors.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A distance-3 surface code patch: nine data qubits on a 3 by 3 grid, four square plaquettes and four half-disk plaquettes on the boundary, each with a measure qubit at its center, shaded by type X or Z; seventeen qubits in all" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.2" fill-opacity=".28"><rect x="90" y="70" width="75" height="75"/><rect x="165" y="145" width="75" height="75"/><path d="M90 220A37.5 37.5 0 0 1 90 145Z"/><path d="M240 70A37.5 37.5 0 0 1 240 145Z"/><rect x="321" y="128" width="18" height="18"/></g>
<g stroke="currentColor" stroke-width="1.2" fill-opacity=".08"><rect x="165" y="70" width="75" height="75"/><rect x="90" y="145" width="75" height="75"/><path d="M90 70A37.5 37.5 0 0 1 165 70Z"/><path d="M240 220A37.5 37.5 0 0 1 165 220Z"/><rect x="321" y="160" width="18" height="18"/></g>
<g stroke="currentColor" stroke-width="1.5" fill="none"><circle cx="127.5" cy="107.5" r="7"/><circle cx="127.5" cy="182.5" r="7"/><circle cx="202.5" cy="107.5" r="7"/><circle cx="202.5" cy="182.5" r="7"/><circle cx="127.5" cy="53.125" r="7"/><circle cx="202.5" cy="236.875" r="7"/><circle cx="73.125" cy="182.5" r="7"/><circle cx="256.875" cy="107.5" r="7"/><circle cx="330" cy="105" r="7"/></g>
<circle cx="90" cy="70" r="8"/><circle cx="90" cy="145" r="8"/><circle cx="90" cy="220" r="8"/><circle cx="165" cy="70" r="8"/><circle cx="165" cy="145" r="8"/><circle cx="165" cy="220" r="8"/><circle cx="240" cy="70" r="8"/><circle cx="240" cy="145" r="8"/><circle cx="240" cy="220" r="8"/><circle cx="330" cy="70" r="8"/>
<g font-size="11"><text x="138.5" y="99.5">Z</text><text x="213.5" y="99.5">X</text><text x="138.5" y="174.5">X</text><text x="213.5" y="174.5">Z</text></g>
<text x="348" y="75">data qubit (d² = 9)</text><text x="348" y="110">measure qubit (d² − 1 = 8)</text><text x="348" y="142">Z parity of its corners</text><text x="348" y="174">X parity of its corners</text>
<g font-size="13"><text x="321" y="215">d = 3: 17 qubits, any 1 error corrected</text><text x="321" y="237">d = 27: 1,457 qubits, any 13 corrected</text><text x="321" y="259">a logical error needs a chain of d flips</text><text x="321" y="281">from one edge of the patch to the other</text></g>
</svg>
<figcaption>Figure 20.6. A distance-3 surface code patch: 9 data qubits, 8 measure qubits, 17 in all. Shaded squares check Z-parities and catch bit flips; light squares check X-parities and catch phase flips. A logical error needs a chain of errors stretching across the patch, so its probability falls like p^((d+1)/2).</figcaption>
</figure>

**Where the formula comes from.** A logical error on the patch is a chain of physical
errors running from one edge to the opposite edge, at least $d$ long. The decoder,
seeing only the endpoints of error chains, matches them up by the shortest
explanation. It makes a mistake when more than half of some crossing chain has gone
wrong, that is, when about $(d+1)/2$ errors line up. The number of ways to choose
those positions grows only exponentially in $d$, with a base around $1/p_{th}$, so
the logical error rate per cycle behaves like

$$
p_L \approx A \left(\frac{p}{p_{th}}\right)^{(d+1)/2},
$$

with $p_{th} \approx 10^{-2}$ and $A \approx 0.1$, the rule of thumb Gidney and Ekerå
used in 2019 (Austin Fowler and colleagues' 2012 review fits a similar formula). Below
threshold each step $d \to d + 2$ divides $p_L$ by $\Lambda = p_{th}/p$; above it, a
bigger patch only gives errors more room. The listing shows the same behavior exactly
for the repetition code, and turns the surface formula into the estimate below.

```python
# Majority vote over d copies fails when more than half flip; the surface code behaves alike.
def repetition_failure(p, d):
    return sum(math.comb(d, k) * p**k * (1 - p) ** (d - k) for k in range((d + 1) // 2, d + 1))

for p in (0.01, 0.1, 0.6):
    print(p, ["%.1e" % repetition_failure(p, d) for d in (1, 3, 5, 7, 9)])

def surface_distance(p, target, p_th=0.01):
    d = 3
    while 0.1 * (p / p_th) ** ((d + 1) / 2) > target:
        d += 2
    return d

rounds = 1400 * 5 * 24 * 3600 * 10**6              # 1,400 logical qubits for five days of 1-microsecond rounds
d = surface_distance(1e-3, 1 / rounds)
print("%.1e" % rounds, d, 2 * d * d, 1400 * 2 * d * d)
```

```text
0.01 ['1.0e-02', '3.0e-04', '9.9e-06', '3.4e-07', '1.2e-08']
0.1 ['1.0e-01', '2.8e-02', '8.6e-03', '2.7e-03', '8.9e-04']
0.6 ['6.0e-01', '6.5e-01', '6.8e-01', '7.1e-01', '7.3e-01']
6.0e+14 27 1458 2041200
```

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Logical failure rate of a distance-d repetition code against d, on a logarithmic scale: for a physical flip rate of 0.01 it falls from 1e-2 to about 1e-8 at d = 9; for 0.1 it falls more slowly to about 1e-3; for 0.6, above the threshold, it rises" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1" opacity=".5" fill="none"><path d="M110 30V222.0H470"/></g>
<g stroke="currentColor" stroke-width=".5" opacity=".25"><line x1="110" y1="30.0" x2="470" y2="30.0"/><line x1="110" y1="78.0" x2="470" y2="78.0"/><line x1="110" y1="126.0" x2="470" y2="126.0"/><line x1="110" y1="174.0" x2="470" y2="174.0"/></g>
<g text-anchor="end"><text x="102" y="34.0">1</text><text x="102" y="82.0">10⁻²</text><text x="102" y="130.0">10⁻⁴</text><text x="102" y="178.0">10⁻⁶</text><text x="102" y="226.0">10⁻⁸</text></g>
<g text-anchor="middle"><text x="110.0" y="240.0">1</text><text x="200.0" y="240.0">3</text><text x="290.0" y="240.0">5</text><text x="380.0" y="240.0">7</text><text x="470.0" y="240.0">9</text><text x="290.0" y="258.0">distance d (copies)</text></g>
<g stroke="currentColor" stroke-width="2" fill="none"><path d="M110 35.3L200 34.5L290 34.0L380 33.6L470 33.2" stroke-dasharray="2 4"/><path d="M110 54.0L200 67.3L290 79.6L380 91.5L470 103.2" stroke-dasharray="7 4"/><path d="M110 78.0L200 114.6L290 150.2L380 185.2L470 219.9"/></g>
<circle cx="110" cy="35.3" r="3"/><circle cx="200" cy="34.5" r="3"/><circle cx="290" cy="34.0" r="3"/><circle cx="380" cy="33.6" r="3"/><circle cx="470" cy="33.2" r="3"/><circle cx="110" cy="54.0" r="3"/><circle cx="200" cy="67.3" r="3"/><circle cx="290" cy="79.6" r="3"/><circle cx="380" cy="91.5" r="3"/><circle cx="470" cy="103.2" r="3"/><circle cx="110" cy="78.0" r="3"/><circle cx="200" cy="114.6" r="3"/><circle cx="290" cy="150.2" r="3"/><circle cx="380" cy="185.2" r="3"/><circle cx="470" cy="219.9" r="3"/><text x="480" y="37.2">p = 0.6 (above threshold)</text><text x="480" y="107.2">p = 0.1</text><text x="480" y="223.9">p = 0.01</text>
</svg>
<figcaption>Figure 20.7. Threshold behavior, computed exactly for the repetition code (majority vote over d copies, threshold 1/2). Below threshold every step in distance multiplies the failure rate by a constant factor less than 1; above it, more copies make things worse. The surface code does the same with a threshold near 1%.</figcaption>
</figure>

At $p = 0.01$ each step $d \to d + 2$ divides the failure rate by about 30, at $p =
0.1$ by about 3, and at $p = 0.6$ it climbs. In December 2024 Google showed this for
the surface code on its 105-qubit Willow chip: distance 3, 5 and 7 memories each beat
the last, with $\Lambda = 2.14$ and 0.143% logical error per cycle at distance 7.
Below threshold, but with $\Lambda$ near 2, not the 10 the estimates assume.

### A worked estimate: why about a million

Put numbers in, as the last line of the listing does. Gidney's 2025 design uses about
1,400 logical qubits and runs for under a week; call it five days, or about $5 \times 86{,}400 \times 10^6
\approx 4.3 \times 10^{11}$ cycles of one microsecond. That is $1{,}400 \times 4.3
\times 10^{11} \approx 6 \times 10^{14}$ logical-qubit-cycles, and for a good chance
that **none** of them fails, each must fail with probability below about $1/(6 \times
10^{14}) \approx 1.7 \times 10^{-15}$.

With $p = 10^{-3}$, $p/p_{th} = 0.1$, so we need $0.1 \times 0.1^{(d+1)/2} \le 1.7
\times 10^{-15}$: $(d+1)/2 \ge 14$, $d = 27$. A distance-27 patch has $2 \cdot 27^2 - 1
= 1{,}457$ qubits, call it 1,458. Then

$$
1{,}400 \times 1{,}458 \approx 2.0 \text{ million physical qubits},
$$

before counting the space for routing and for making magic states: the order of a
million, not a thousand and not a billion. Gidney's design gets below a million mainly
by storing idle logical qubits in a denser "yoked" encoding and by **magic state
cultivation** (Gidney, Shutty and Jones, 2024), which grows the states needed for
Toffoli gates in a small patch instead of large distillation factories.

The lever is $p/p_{th}$: at $p = 10^{-4}$ the same calculation gives $d = 13$ and under
half a million qubits; at $p = 5 \times 10^{-3}$ it needs $d$ above 90. The
*Post-quantum cryptography* book's
[chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md), sections 1.5 and 1.6,
adds the factories and running time and tabulates the estimates since 2019.

### Hardware status, November 2026

As of November 2026:

- **Below threshold, at small distance.** Google's Willow result (December 2024, in
  *Nature*) is the clearest demonstration that surface-code errors fall as the distance
  grows, for one logical qubit up to distance 7.
- **Better physical qubits.** Quantinuum's Helios trapped-ion machine (November 2025)
  has 98 qubits with a reported two-qubit gate fidelity of 99.92%. Neutral-atom and
  trapped-ion groups have reported tens of logical qubits in 2025 and 2026, with small
  codes and limited sets of operations.
- **No cryptographic factoring.** The largest numbers factored by a genuine run of
  Shor's algorithm are still 15 (2001) and 21 (2012), each with simplifications.

The gaps: about $10^{-3}$ logical error per cycle against the $10^{-15}$ needed; tens
of logical qubits against 1,400; machines of a hundred to a few thousand physical
qubits against a million. The *Post-quantum cryptography* book's
[chapter 1](../post-quantum/01-The-Quantum-Threat-Measured.md), section 1.7, follows
the machines and the claims about them.

## 20.9 Simon's algorithm against symmetric cryptography

*Level: expert.*

Section 20.7 suggests a comfortable rule: a symmetric primitive loses half its bits to
a quantum computer and no more. BBBV makes that right for a cipher used as a black box.
It is wrong for some **constructions** whose algebra hides an XOR period: Simon's
algorithm then takes all the bits, in polynomial time, provided the attacker can ask
the right kind of question.

### Even-Mansour

The **Even-Mansour** cipher (Shimon Even and Yishay Mansour, 1991) is the simplest
block cipher with a security proof (for a random $P$): take a fixed, public permutation $P$
of $n$-bit blocks and two secret keys, and set

$$
E(x) = P(x \oplus k_1) \oplus k_2 .
$$

Classically, any attack that makes $D$ queries to $E$ and $T$ evaluations of $P$ needs
$D \cdot T \approx 2^n$, so about $2^{n/2}$ work at best. Even-Mansour matters beyond
itself because it is the skeleton of key-alternating ciphers: AES is a long sequence
of round keys XORed between fixed public permutations.

Hidenori Kuwakado and Masakatu Morii saw in 2012 that a quantum attacker can build a
function with period $k_1$ out of things it can compute:

$$
f(x) = E(x) \oplus P(x) = P(x \oplus k_1) \oplus k_2 \oplus P(x),
$$

$$
f(x \oplus k_1) = P(x) \oplus k_2 \oplus P(x \oplus k_1) = f(x) .
$$

Simon's algorithm finds $k_1$ from about $n$ queries to $f$, each needing one query to
$E$ and one to $P$, and then $k_2 = E(0) \oplus P(k_1)$. Polynomial time, for any
block size (Figure 20.8). In 2010 the same authors had used Simon's algorithm to tell
three Feistel rounds from a random permutation, its first use in cryptanalysis.

Unlike §20.3, $f$ is not exactly two-to-one: unrelated inputs can collide by chance,
and a run may then return a $y$ not orthogonal to $k_1$. Marc Kaplan, Gaëtan Leurent,
Anthony Leverrier and María Naya-Plasencia (2016) proved that unless some other period
holds for a large fraction of inputs, a small multiple of $n$ runs still pins down
$k_1$, and a few classical queries confirm it.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Even-Mansour: x is XORed with k1, passed through the public permutation P, and XORed with k2 to give E(x). The attacker forms f(x) = E(x) XOR P(x), which satisfies f(x XOR k1) = f(x); Simon's algorithm finds the period k1 from about n superposition queries, and then k2 = E(0) XOR P(k1)" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<path d="M50 60H100M130 60H230M310 60H410M440 60H520M100 60H130M115 45V75M410 60H440M425 45V75M115 20V45M425 20V45M290 158H348"/>
<circle cx="115" cy="60" r="15"/><circle cx="425" cy="60" r="15"/>
<rect x="230" y="35" width="80" height="50" rx="6"/><rect x="60" y="130" width="230" height="56" rx="8"/><rect x="350" y="130" width="250" height="56" rx="8"/>
</g>
<path d="M520 55L530 60L520 65ZM342 153L350 158L342 163ZM110 40L115 46L120 40ZM420 40L425 46L430 40Z"/>
<text x="30" y="65">x</text><text x="536" y="65">E(x)</text>
<g text-anchor="middle"><text x="270" y="66">P</text><text x="175" y="153">f(x) = E(x) ⊕ P(x)</text><text x="475" y="153">Simon: about n queries</text>
<g font-size="13"><text x="115" y="14">k₁</text><text x="425" y="14">k₂</text><text x="175" y="175">f(x ⊕ k₁) = f(x)</text><text x="475" y="175">→ k₁, then k₂ = E(0) ⊕ P(k₁)</text></g>
<g font-size="12"><text x="270" y="105" fill-opacity=".75">P is public; only k₁ and k₂ are secret</text><text x="320" y="225">superposition queries to E: polynomial time. Classical queries only: about 2^(n/3) at best (offline Simon).</text></g></g>
</svg>
<figcaption>Figure 20.8. Even-Mansour and its quantum break. The attacker XORs the cipher with the public permutation; the result has period k1, which Simon's algorithm finds with about n superposition queries. With classical queries only, the best known quantum attack takes about 2^(n/3).</figcaption>
</figure>

### CBC-MAC and its relatives

Kaplan, Leurent, Leverrier and Naya-Plasencia went further in 2016 and found hidden
periods in the modes of operation everyone uses. Take CBC-MAC ([book 1, chapter 10](../../book/10-Message-Authentication.md); classical
attacks in [Cryptanalysis chapter 10](../cryptanalysis/10-Attacks-on-Modes-and-MACs.md))
on two-block messages:
$T(m_1, m_2) = E_K(E_K(m_1) \oplus m_2)$. Fix two different first blocks $\alpha_0,
\alpha_1$ and define, for a bit $b$ and a block $x$,

$$
g(b, x) = T(\alpha_b, x) = E_K\bigl(E_K(\alpha_b) \oplus x\bigr).
$$

Since $E_K$ is a permutation, $g(b, x) = g(b', x')$ exactly when $E_K(\alpha_b) \oplus x =
E_K(\alpha_{b'}) \oplus x'$, so $g$ has the period

$$
s = \bigl(1,\; \Delta\bigr), \qquad \Delta = E_K(\alpha_0) \oplus E_K(\alpha_1),
$$

and here $g$ is exactly two-to-one, with no chance collisions at all. Simon's
algorithm finds $\Delta$ with about $n$ superposition queries to the MAC. Then every
classical tag gives a forgery for free: $T(\alpha_0, m) = T(\alpha_1, m \oplus \Delta)$
for every $m$, so the attacker asks for the tag of $(\alpha_0, m)$ and outputs the
same tag for $(\alpha_1, m \oplus \Delta)$, a message it never asked about. Their
paper applied the same idea to PMAC, GMAC, GCM and OCB, and used it to speed up slide
attacks, which find related pairs in ciphers whose rounds all look alike.

### Code it: both breaks on 4-bit toys

The listing reuses `simon_run` and `candidates` from §20.3, with random permutations
of the sixteen 4-bit blocks as cipher and permutation, and simulates superposition
access to $E$ and to the MAC, the assumption the attacks need.

```python
# Even-Mansour on 4-bit blocks, E(x) = P(x XOR k1) XOR k2, attacked with superposition queries.
rng = random.Random(2012)
P = list(range(16))
rng.shuffle(P)                                     # the public permutation
k1, k2 = 0b1101, 0b0110                            # the secret keys
E = lambda x: P[x ^ k1] ^ k2                       # the attacker may query E in superposition
f = lambda x: E(x) ^ P[x]                          # f(x XOR k1) = f(x): the period is k1
ys = []
while len(candidates(ys, 4)) > 1:
    ys.append(simon_run(f, 4, 4, rng)[0])
for c in candidates(ys, 4):                        # check each candidate with classical queries
    c2 = E(0) ^ P[c]                               # k2 = E(0) XOR P(k1)
    if all(E(x) == P[x ^ c] ^ c2 for x in range(16)):
        print("runs", len(ys), "k1 =", format(c, "04b"), "k2 =", format(c2, "04b"))

# CBC-MAC of two blocks: T(a, x) = E_K(E_K(a) XOR x). Put a one-bit choice b in front of x:
# g(b, x) = T(alpha_b, x) has period (1, E_K(alpha_0) XOR E_K(alpha_1)).
K = list(range(16))
rng.shuffle(K)                                     # a secret 4-bit block cipher E_K
T = lambda a, x: K[K[a] ^ x]
alpha = (0b0000, 0b0001)
g = lambda i: T(alpha[i >> 4], i % 16)             # 5 input bits: x low, b on top
ys = []
while len(candidates(ys, 5)) > 1:
    ys.append(simon_run(g, 5, 4, rng)[0])
delta = candidates(ys, 5)[0] % 16
m = 0b1001
tag = T(alpha[0], m)                               # one classical query
print("runs", len(ys), "delta =", format(delta, "04b"), "true", format(K[0] ^ K[1], "04b"))
print("tag of (0000, 1001):", tag, "| forged for (0001, %s):" % format(m ^ delta, "04b"), tag,
      "| real:", T(alpha[1], m ^ delta))
```

```text
runs 3 k1 = 1101 k2 = 0110
runs 5 delta = 1111 true 1111
tag of (0000, 1001): 14 | forged for (0001, 0110): 14 | real: 14
```

Three runs recover both Even-Mansour keys; five recover $\Delta$, and the forged tag
for $(0001, 0110)$, never queried, is correct. At $n = 128$ the attacks take a few
hundred quantum queries, against about $2^{64}$ classically.

### Why the model matters

Both attacks need **superposition queries**: the attacker sends the keyed device a
superposition $\sum_x |x\rangle|0\rangle$ and gets back $\sum_x |x\rangle|E(x)\rangle$.
This is the **Q2** model. In the **Q1** model the attacker has a quantum computer but
the keyed device answers only classical questions, as deployed systems do:

| model | Even-Mansour key recovery | source |
|---|---|---|
| classical | about $2^{n/2}$ | Even and Mansour (1991); Daemen (1991) |
| Q1: classical queries, quantum computer offline | about $2^{n/3}$ time, $2^{n/3}$ classical queries | Bonnetain and others (2019) |
| Q2: superposition queries | about $n$ queries, polynomial time | Kuwakado and Morii (2012) |

The Q1 line is the **offline Simon** algorithm of Xavier Bonnetain, Akinori Hosoyamada,
María Naya-Plasencia, Yu Sasaki and André Schrottenloher (2019), which combines Simon
with Grover and needs $O(n^2)$ qubits. For $n = 128$: about $2^{43}$ against $2^{64}$,
a gain but not a break.

Whether Q2 is realistic depends on where the key lives. A MAC computed on a server
answers classically: the wire and the radio measure every query. Arcadia City's
telemetry to Earth is the extreme case: each tag crosses 3 to 22 light-minutes of radio
as ordinary bits, and no one on Earth can make the city's MAC unit answer a
superposition. Q2 bites when the attacker can run the keyed function on its own quantum
computer (a white-box or obfuscated implementation, a key inside a circuit someone else
executes, future quantum networks), and inside proofs, where a reduction may have to
answer quantum queries.

The conservative practice is to prefer designs secure even in Q2. Dan Boneh and Mark
Zhandry (2013) defined MACs secure against superposition queries and built them from
pseudorandom functions secure against quantum queries, which Zhandry (2012) showed
exist under standard assumptions. For today's systems, which answer classically, this
section is a warning about structure, not a reason to replace AES-GCM.

## 20.10 What it means for key sizes

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
- **Constructions with an XOR period** (Even-Mansour, CBC-MAC, PMAC, GMAC, GCM, OCB):
  broken in polynomial time only if the attacker can query the keyed function in
  superposition (§20.9). With classical queries, which is how deployed systems answer,
  the best quantum attacks gain only polynomially, as for Even-Mansour's $2^{n/3}$.

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

- *Regev's factoring algorithm* (Oded Regev, 2023) replaces Shor's one-dimensional
  period finding with a lattice of several small bases: each run uses about $n^{3/2}$
  gates instead of about $n^2$, at the price of about $\sqrt n$ runs and a classical
  lattice reduction ([Chapter 14](14-Lattices.md)) to combine them; whether that helps
  in practice is still being settled.
- *Quantum walks and collision finding*: the Brassard-Høyer-Tapp algorithm finds
  collisions in $N^{1/3}$ queries, but with $N^{1/3}$ memory, which makes it no better
  than classical parallel collision search in realistic cost models (Bernstein, 2009).
- *Beyond the surface code*: quantum low-density parity-check codes, such as the
  "bivariate bicycle" codes of Bravyi and colleagues (2024), encode many logical qubits
  in one block with several times fewer physical qubits than surface-code patches, but
  need longer-range connections; the 2026 estimates with far fewer physical qubits for
  RSA-2048 mostly rest on such codes.
- *Dihedral hidden subgroups and isogenies*: Kuperberg's subexponential algorithm is
  the basis of quantum attacks on CSIDH; see the *Post-quantum cryptography* book's
  [chapter 16](../post-quantum/16-Isogenies.md).

## Check yourself

??? question "1. A qubit is in state $\frac{1}{2}|0\rangle + \frac{\sqrt 3}{2}|1\rangle$. What are the measurement probabilities?"

    $\frac{1}{4}$ for 0 and $\frac{3}{4}$ for 1.

??? question "2. How many complex amplitudes describe a 50-qubit register, and why can't you read them all?"

    $2^{50} \approx 10^{15}$. A measurement returns one basis state and destroys the
    superposition, so each run yields only $n$ classical bits.

??? question "3. In Simon's algorithm with $n = 3$ and hidden period $s = 101$, which outcomes $y$ can appear, and with what probability?"

    Exactly the $y$ with $y \cdot 101 = 0$, that is $y_2 \oplus y_0 = 0$: 000, 010, 101
    and 111, each with probability $\frac14$. Two independent ones, such as 010 and
    101, leave $s = 101$ as the only nonzero solution.

??? question "4. In Shor's algorithm with $N = 21$, why must $Q$ be at least $N^2 = 441$?"

    So that $y/Q$ approximates $k/r$ within $1/(2Q) \le 1/(2N^2) < 1/(2r^2)$, which by
    Legendre's theorem makes $k/r$ a convergent of the continued fraction of $y/Q$, so
    it can be recovered.

??? question "5. The order of $a = 4$ modulo 15 is 2. Does it give a factor?"

    $4^{1} = 4$, $\gcd(3, 15) = 3$ and $\gcd(5, 15) = 5$. Yes, both factors.

??? question "6. Phase estimation with $t = 3$ counting qubits runs on an eigenvector with $\varphi = \frac58$. What does it return? And for order finding with $Q = 512$, what does $y = 85$ give?"

    $\frac58 = 0.101$ in binary fits three bits, so the outcome is $m = 5$ with
    certainty. For $y = 85$: $512 = 6 \cdot 85 + 2$, $85 = 42 \cdot 2 + 1$, so
    $\frac{85}{512} = [0; 6, 42, 2]$ with convergents $\frac16, \frac{42}{253}, \ldots$;
    the denominator below 21 is 6, the order of 2 modulo 21.

??? question "7. Why doesn't doubling the RSA key size protect against Shor?"

    Shor runs in polynomial time: doubling $n$ multiplies the cost by a constant factor
    (about 8 for $O(n^3)$), not by an exponential.

??? question "8. How many Grover iterations for a 64-bit key, and what is the success probability if you do twice that many?"

    About $\frac{\pi}{4}2^{32} \approx 3.4 \times 10^9$. Twice as many rotate the state
    past the target to angle about $\pi$, and the success probability falls close to 0.

??? question "9. In the bit-flip code, an error gives the syndrome $(q_0 \oplus q_1, q_1 \oplus q_2) = (0, 1)$. What does the decoder do, and why can a physical error rate of $5 \times 10^{-3}$ make a surface code almost useless for Shor?"

    It flips $q_2$ back. At $p = 5 \times 10^{-3}$, each step $d \to d + 2$ only halves
    the logical error rate, so $10^{-15}$ needs $d$ above 90: some 17,000 physical
    qubits per logical one, against about 1,500 at $p = 10^{-3}$.

??? question "10. Simon's algorithm breaks Even-Mansour in polynomial time. Why is a MAC computed by a server on the network not in danger from it?"

    The attack needs superposition queries to the keyed function (the Q2 model). A server
    answering over a network answers classical questions: the channel measures every
    query. With classical queries only, the best known quantum attack on Even-Mansour,
    offline Simon, takes about $2^{n/3}$, a polynomial gain rather than a break.

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
- Simon's algorithm finds a hidden XOR period with about $n$ queries and linear
  algebra mod 2, where classical algorithms need about $2^{n/2}$.
- Phase estimation reads an eigenvalue $e^{2\pi i\varphi}$ with controlled powers and an
  inverse QFT; order finding is phase estimation of multiplication by $a$, and the
  convergents of $m/Q$ recover $r$.
- Grover finds a needle among $N$ in $\frac{\pi}{4}\sqrt N$ iterations, and BBBV
  proves no algorithm does better, because a query spreads only weight 1 over $N$ items;
  parallelism helps only by a square root.
- Error correction measures parities, never data. The surface code weaves bit-flip and
  phase-flip checks into a grid of $2d^2 - 1$ qubits per logical qubit, with logical
  errors falling like $(p/p_{th})^{(d+1)/2}$; at $p = 10^{-3}$ RSA-2048 needs $d \approx
  27$ and on the order of a million physical qubits.
- With superposition queries, Simon breaks Even-Mansour and CBC-MAC outright; with
  classical queries, the gain is only polynomial.
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
- Daniel Simon, "On the Power of Quantum Computation", *SIAM Journal on Computing* 26
  (1997); conference version FOCS 1994.
- Alexei Kitaev, "Quantum Measurements and the Abelian Stabilizer Problem" (1995,
  arXiv quant-ph/9511026).
- Robert Griffiths and Chi-Sheng Niu, "Semiclassical Fourier Transform for Quantum
  Computation", *Physical Review Letters* 76 (1996); Stéphane Beauregard, "Circuit for
  Shor's Algorithm Using 2n+3 Qubits", *Quantum Information and Computation* 3 (2003).
- Lieven Vandersypen and others, "Experimental Realization of Shor's Quantum Factoring
  Algorithm Using Nuclear Magnetic Resonance", *Nature* 414 (2001).
- Christof Zalka, "Grover's Quantum Searching Algorithm Is Optimal", *Physical Review
  A* 60 (1999).
- Peter Shor, "Scheme for Reducing Decoherence in Quantum Computer Memory", *Physical
  Review A* 52 (1995); Andrew Steane, "Error Correcting Codes in Quantum Theory",
  *Physical Review Letters* 77 (1996).
- Sergey Bravyi and Alexei Kitaev, "Quantum Codes on a Lattice with Boundary" (1998,
  arXiv quant-ph/9811052); Austin Fowler, Matteo Mariantoni, John Martinis and Andrew
  Cleland, "Surface Codes: Towards Practical Large-Scale Quantum Computation",
  *Physical Review A* 86 (2012).
- Google Quantum AI and collaborators, "Quantum Error Correction below the Surface Code
  Threshold", *Nature* (published December 2024).
- Craig Gidney, Noah Shutty and Cody Jones, "Magic State Cultivation: Growing T States
  as Cheap as CNOT Gates" (2024, arXiv 2409.17595).
- Sergey Bravyi and others, "High-Threshold and Low-Overhead Fault-Tolerant Quantum
  Memory", *Nature* 627 (2024).
- Shimon Even and Yishay Mansour, "A Construction of a Cipher from a Single
  Pseudorandom Permutation", ASIACRYPT 1991; *Journal of Cryptology* 10 (1997).
- Hidenori Kuwakado and Masakatu Morii, "Quantum Distinguisher between the 3-Round
  Feistel Cipher and the Random Permutation", ISIT 2010; "Security on the Quantum-Type
  Even-Mansour Cipher", ISITA 2012.
- Marc Kaplan, Gaëtan Leurent, Anthony Leverrier and María Naya-Plasencia, "Breaking
  Symmetric Cryptosystems Using Quantum Period Finding", CRYPTO 2016.
- Xavier Bonnetain, Akinori Hosoyamada, María Naya-Plasencia, Yu Sasaki and André
  Schrottenloher, "Quantum Attacks without Superposition Queries: The Offline Simon's
  Algorithm", ASIACRYPT 2019.
- Mark Zhandry, "How to Construct Quantum Random Functions", FOCS 2012; Dan Boneh and
  Mark Zhandry, "Quantum-Secure Message Authentication Codes", EUROCRYPT 2013.
- Oded Regev, "An Efficient Quantum Factoring Algorithm" (2023, arXiv 2308.06572).
- Ronald de Wolf, *Quantum Computing: Lecture Notes* (arXiv 1907.09415, updated
  regularly), free.
- In *The cryptography book*: [Chapter 20](../../book/20-Quantum-Computers.md).
