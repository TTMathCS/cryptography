# 20. Quantum computers

*Every public-key system in Part III rests on factoring or discrete logarithms.
In 1994 Peter Shor showed that a quantum computer would solve both quickly. This
chapter explains what a quantum computer is without the hype, works Shor's and
Grover's algorithms by hand, measures how large a machine would have to be, and
follows the world's response: an open competition for new algorithms and the
largest change of cryptography ever made, started before the threat exists.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a qubit is, what superposition and interference mean, and why a quantum computer is not "trying every answer at once";
    - how Shor's algorithm turns factoring into finding a period, with a full run on $N = 21$;
    - what Grover's search does to keys and hashes, and why AES survives;
    - how many qubits it would take to break RSA-2048 and elliptic curves, and how those estimates have moved;
    - why encrypted data recorded today is already at risk, and how the post-quantum migration is being done.

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (modular arithmetic, gcd),
    [Chapter 12](12-Diffie-Hellman.md), [Chapter 13](13-RSA.md) and
    [Chapter 15](15-Elliptic-Curves.md) (what Shor breaks), [Chapter 7](07-AES.md) and
    [Chapter 9](09-Hash-Functions.md) (what Grover weakens).

    **Levels:** 20.1 to 20.3 and 20.7 to 20.9 are for beginners; 20.4 to 20.6 and 20.10 to 20.13
    are intermediate; 20.14 is expert.

## 20.1 The problem

In 1981 the physicist Richard Feynman pointed out that ordinary computers are
hopeless at simulating quantum physics. To describe 300 interacting particles
you need more numbers than there are atoms in the universe, because the
description doubles with every particle you add. Why not, he asked, build a
computer out of quantum parts and let nature do the bookkeeping? Paul Benioff
and Yuri Manin had sketched similar ideas a year earlier, and in 1985 David
Deutsch at Oxford described a universal quantum computer in exact terms.

For almost a decade nobody knew what such a machine would be good for beyond
physics. David Deutsch and Richard Jozsa (1992) and Daniel Simon (1994) found
problems where it was provably faster, but the problems were artificial. Then
in 1994 Peter Shor, a mathematician at AT&T Bell Labs, showed that a quantum
computer could **factor integers and compute discrete logarithms in polynomial
time**. Every public-key algorithm you met in Part III, RSA, Diffie-Hellman,
DSA, ECDH, ECDSA and EdDSA, rests on one of those two problems. Two years
later Lov Grover, also at Bell Labs, found a quantum method for unstructured
search that speeds up the brute-force attack on any key.

No machine big enough to run Shor's algorithm on a real key exists, as of late
2026. But a message recorded today can be decrypted whenever one does. That is
why, for the first time in the history this book has followed, the world is
replacing its main algorithms *before* they are broken. This chapter explains
the threat precisely enough that you can judge the headlines yourself.

<figure class="mars-fig">
<svg viewBox="0 0 640 388" width="640" role="img" aria-label="Timeline of quantum computing and the post-quantum response, 1981 to 2035">
<line x1="84" y1="12" x2="84" y2="376" stroke-width="2" stroke="currentColor" opacity="0.6"/>
<circle cx="84" cy="22" r="5" fill="currentColor"/>
<text x="70" y="27" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1981</text>
<text x="98" y="27" font-size="14" text-anchor="start" fill="currentColor">Feynman: simulate physics with quantum parts</text>
<circle cx="84" cy="50" r="5" fill="currentColor"/>
<text x="70" y="55" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1985</text>
<text x="98" y="55" font-size="14" text-anchor="start" fill="currentColor">Deutsch: the universal quantum computer</text>
<circle cx="84" cy="78" r="5" class="acc-fill"/>
<text x="70" y="83" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">1994</text>
<text x="98" y="83" font-size="14" text-anchor="start" fill="currentColor">Shor: factoring and discrete logs in polynomial time</text>
<circle cx="84" cy="106" r="5" class="acc-fill"/>
<text x="70" y="111" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">1996</text>
<text x="98" y="111" font-size="14" text-anchor="start" fill="currentColor">Grover: search in about √N steps</text>
<circle cx="84" cy="134" r="5" fill="currentColor"/>
<text x="70" y="139" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2001</text>
<text x="98" y="139" font-size="14" text-anchor="start" fill="currentColor">IBM and Stanford factor 15 with 7 nuclear spins</text>
<circle cx="84" cy="162" r="5" fill="currentColor"/>
<text x="70" y="167" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2015</text>
<text x="98" y="167" font-size="14" text-anchor="start" fill="currentColor">NSA announces a move to quantum-resistant algorithms</text>
<circle cx="84" cy="190" r="5" fill="currentColor"/>
<text x="70" y="195" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2016</text>
<text x="98" y="195" font-size="14" text-anchor="start" fill="currentColor">NIST call for proposals; Google tests CECPQ1</text>
<circle cx="84" cy="218" r="5" fill="currentColor"/>
<text x="70" y="223" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2019</text>
<text x="98" y="223" font-size="14" text-anchor="start" fill="currentColor">Sycamore (53 qubits); Gidney and Ekerå: 20 million</text>
<circle cx="84" cy="246" r="5" class="acc-fill"/>
<text x="70" y="251" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">2022</text>
<text x="98" y="251" font-size="14" text-anchor="start" fill="currentColor">Kyber, Dilithium, Falcon, SPHINCS+ chosen; SIKE, Rainbow broken</text>
<circle cx="84" cy="274" r="5" class="acc-fill"/>
<text x="70" y="279" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">2024</text>
<text x="98" y="279" font-size="14" text-anchor="start" fill="currentColor">FIPS 203, 204, 205 published; Willow below threshold</text>
<circle cx="84" cy="302" r="5" fill="currentColor"/>
<text x="70" y="307" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2025</text>
<text x="98" y="307" font-size="14" text-anchor="start" fill="currentColor">HQC chosen as backup; Gidney: under a million qubits</text>
<circle cx="84" cy="330" r="5" fill="currentColor"/>
<text x="70" y="335" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2030</text>
<text x="98" y="335" font-size="14" text-anchor="start" fill="currentColor">NIST IR 8547: RSA and ECC deprecated</text>
<circle cx="84" cy="358" r="5" class="acc-fill"/>
<text x="70" y="363" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">2035</text>
<text x="98" y="363" font-size="14" text-anchor="start" fill="currentColor">…and disallowed; CNSA 2.0 transition complete</text>
</svg>
<figcaption>Figure 20.1. From Feynman's question to the migration deadlines. Accented dots are the turning points: the two algorithms, the 2022 selection, the 2024 standards and the 2035 cut-off.</figcaption>
</figure>

## 20.2 Qubits, plainly

A classical bit is 0 or 1. A **qubit** is described by two numbers called
**amplitudes**, one for 0 and one for 1, written $\alpha$ and $\beta$. (In
general they are complex numbers; real ones are enough to see the ideas.) Two
rules govern it.

**Rule 1: measuring gives one answer at random.** When you look at a qubit you
get 0 with probability $\alpha^2$ and 1 with probability $\beta^2$, and
$\alpha^2 + \beta^2 = 1$. After the measurement the qubit *is* what you saw;
the amplitudes are gone.

**Rule 2: between measurements, amplitudes change by rotations.** A quantum
gate is a fixed linear map that keeps $\alpha^2 + \beta^2 = 1$. The most useful
one, the **Hadamard gate** $H$, does

$$
(\alpha, \beta) \;\mapsto\; \left(\tfrac{\alpha + \beta}{\sqrt 2},\; \tfrac{\alpha - \beta}{\sqrt 2}\right).
$$

<figure class="mars-fig">
<svg viewBox="0 0 420 340" width="420" role="img" aria-label="A qubit&#x27;s two amplitudes drawn as a point on the unit circle, with four example states">
<line x1="25" y1="175" x2="330" y2="175" stroke-width="1" stroke="currentColor" opacity="0.6"/>
<line x1="170" y1="303" x2="170" y2="30" stroke-width="1" stroke="currentColor" opacity="0.6"/>
<circle cx="170" cy="175" r="120" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="334" y="179" font-size="15" text-anchor="start" fill="currentColor" font-style="italic">α</text>
<text x="176" y="27" font-size="15" text-anchor="start" fill="currentColor" font-style="italic">β</text>
<line x1="170" y1="175" x2="282" y2="175" stroke-width="1.5" stroke="currentColor"/>
<polygon points="290,175 282,171.4 282,178.6" fill="currentColor"/>
<circle cx="290" cy="175" r="4" fill="currentColor"/>
<text x="298" y="193" font-size="13" text-anchor="start" fill="currentColor">(1, 0): surely 0</text>
<line x1="170" y1="175" x2="249.2" y2="95.8" stroke-width="2" class="acc"/>
<polygon points="254.8,90.2 246.6,93.3 251.7,98.4" class="acc-fill"/>
<circle cx="254.8" cy="90.2" r="4" class="acc-fill"/>
<text x="262.8" y="82.2" font-size="13" text-anchor="start" fill="currentColor">(0.707, 0.707): H of 0</text>
<line x1="170" y1="175" x2="237.2" y2="85.4" stroke-width="1.5" stroke="currentColor"/>
<polygon points="242,79 234.3,83.2 240.1,87.6" fill="currentColor"/>
<circle cx="242" cy="79" r="4" fill="currentColor"/>
<text x="160" y="73" font-size="13" text-anchor="start" fill="currentColor">(0.6, 0.8)</text>
<line x1="170" y1="175" x2="249.2" y2="254.2" stroke-width="2" class="acc"/>
<polygon points="254.8,259.8 251.7,251.6 246.6,256.7" class="acc-fill"/>
<circle cx="254.8" cy="259.8" r="4" class="acc-fill"/>
<text x="262.8" y="275.8" font-size="13" text-anchor="start" fill="currentColor">(0.707, −0.707): H of 1</text>
<text x="210" y="332" font-size="13" text-anchor="middle" fill="currentColor">measure: P(0) = α², P(1) = β², and α² + β² = 1</text>
</svg>
<figcaption>Figure 20.2. With real amplitudes a qubit is a point on the unit circle. Measuring gives 0 with probability α² and 1 with probability β². The Hadamard gate is a reflection that sends (1, 0) to (0.707, 0.707) and (0, 1) to (0.707, −0.707).</figcaption>
</figure>

**By hand.** Start with a qubit that is surely 0: $(1, 0)$. Apply $H$ and you
get $(0.707, 0.707)$, a **superposition**: measure now and you see 0 or 1 with
probability $0.707^2 = 0.5$ each. That is just a fair coin so far. Now apply $H$
a second time instead of measuring:

$$
\left(\tfrac{0.707 + 0.707}{\sqrt 2},\; \tfrac{0.707 - 0.707}{\sqrt 2}\right) = (1, 0).
$$

The qubit is surely 0 again. A coin flipped twice is still random; a qubit
"flipped" twice is not. The two paths that lead to 1 had amplitudes $+0.5$ and
$-0.5$, and they **cancelled**. That is **interference**, and it is the whole
source of a quantum computer's power: amplitudes can be negative, so wrong
answers can be made to cancel while right ones add up.

<figure class="mars-fig">
<svg viewBox="0 0 600 290" width="600" role="img" aria-label="Two Hadamard gates in a row: the paths to 1 cancel, the paths to 0 add">
<text x="60" y="24" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">start</text>
<text x="270" y="24" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">after one H</text>
<text x="480" y="24" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">after two H</text>
<rect x="15" y="73" width="90" height="44" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="99.5" font-size="13" text-anchor="middle" fill="currentColor">0: +1</text>
<rect x="15" y="193" width="90" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="219.6" font-size="13" text-anchor="middle" fill="currentColor">1: 0</text>
<rect x="215" y="73" width="110" height="44" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="99.5" font-size="13" text-anchor="middle" fill="currentColor">0: +0.707</text>
<rect x="215" y="193" width="110" height="44" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="219.6" font-size="13" text-anchor="middle" fill="currentColor">1: +0.707</text>
<rect x="420" y="73" width="120" height="44" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="480" y="99.5" font-size="13" text-anchor="middle" fill="currentColor">0: +0.5 +0.5 = 1</text>
<rect x="420" y="193" width="120" height="44" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="480" y="219.6" font-size="13" text-anchor="middle" fill="currentColor">1: +0.5 −0.5 = 0</text>
<line x1="105" y1="95" x2="207" y2="91.3" stroke-width="1.5" stroke="currentColor"/>
<polygon points="215,91 206.9,87.7 207.1,94.9" fill="currentColor"/>
<line x1="105" y1="101" x2="209.2" y2="201.4" stroke-width="1.5" stroke="currentColor"/>
<polygon points="215,207 211.7,198.9 206.7,204" fill="currentColor"/>
<text x="165" y="83" font-size="12" text-anchor="middle" fill="currentColor">× 0.707</text>
<text x="150" y="170" font-size="12" text-anchor="middle" fill="currentColor">× 0.707</text>
<line x1="325" y1="89" x2="412" y2="89" stroke-width="1.5" stroke="currentColor"/>
<polygon points="420,89 412,85.4 412,92.6" fill="currentColor"/>
<text x="372" y="81" font-size="12" text-anchor="middle" fill="currentColor">+0.5</text>
<line x1="325" y1="221" x2="412" y2="221" stroke-width="1.5" class="acc"/>
<polygon points="420,221 412,217.4 412,224.6" class="acc-fill"/>
<text x="372" y="239" font-size="12" text-anchor="middle" class="acc-fill" font-weight="bold">−0.5</text>
<line x1="325" y1="103" x2="414.5" y2="199.1" stroke-width="1.5" stroke="currentColor"/>
<polygon points="420,205 417.2,196.7 411.9,201.6" fill="currentColor"/>
<line x1="325" y1="205" x2="414.5" y2="110.8" stroke-width="1.5" stroke="currentColor"/>
<polygon points="420,105 411.9,108.3 417.1,113.3" fill="currentColor"/>
<text x="300" y="280" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">the minus sign on the 1 → 1 path is what makes the 1s cancel</text>
</svg>
<figcaption>Figure 20.3. Interference. Each Hadamard splits every amplitude in two, and the 1 → 1 step carries a minus sign. After two gates the two routes to 1 have amplitudes +0.5 and −0.5 and cancel; the two routes to 0 add up to 1.</figcaption>
</figure>

```python
from math import sqrt

h = 1 / sqrt(2)
def hadamard(state):                    # state = [amplitude of 0, amplitude of 1]
    a, b = state
    return [h * (a + b), h * (a - b)]

zero = [1.0, 0.0]
once = hadamard(zero)
twice = hadamard(once)
print([round(x, 3) for x in once], [round(x * x, 3) for x in once])
print([round(x, 3) for x in twice])
```

Output:

```
[0.707, 0.707] [0.5, 0.5]
[1.0, 0.0]
```

**Many qubits.** A register of $n$ qubits has one amplitude for each of the
$2^n$ bit strings. With $n = 3$ that is 8 amplitudes; with $n = 300$, more
numbers than atoms in the universe. A gate on one qubit changes all $2^n$
amplitudes at once. This is where the phrase "a quantum computer tries every
answer at once" comes from, and why it misleads: you can *prepare* a
superposition of every input and compute a function on all of them in one run,
but measuring gives you **one** random output. Nothing is gained unless the
algorithm first arranges, by interference, for the useful answers to carry
nearly all the probability. Only problems with special structure allow that,
and factoring happens to be one.

**Why it is hard to build.** Amplitudes are fragile. Heat, stray fields and
imperfect gates nudge them, and the cancellations that the algorithm depends
on stop being exact. Today's best qubits make an error roughly once in every
thousand operations. Shor's algorithm on a 2048-bit number needs billions of
operations in a row, so the errors must be corrected as they happen (section
20.8).

## 20.3 Shor's algorithm: factoring is finding a period

The idea is older than quantum computing and needs only
[Chapter 3](03-The-Arithmetic-of-Secrets.md). Pick a number $a$ that shares no
factor with $N$, and look at its powers mod $N$. They must eventually repeat.
The **period** $r$ is the smallest positive number with $a^r \equiv 1 \pmod N$.

**By hand, $N = 15$, $a = 7$.**

$$
7^1 \equiv 7, \quad 7^2 = 49 \equiv 4, \quad 7^3 \equiv 4 \cdot 7 = 28 \equiv 13, \quad 7^4 \equiv 13 \cdot 7 = 91 \equiv 1 \pmod{15}.
$$

So $r = 4$. Now the trick. Since $7^4 - 1 \equiv 0$, the product

$$
(7^2 - 1)(7^2 + 1) = 48 \cdot 50
$$

is a multiple of 15. Neither 48 nor 50 is a multiple of 15 on its own, so each
must share a prime with it: $\gcd(48, 15) = 3$ and $\gcd(50, 15) = 5$. We have
factored 15.

**In general.** If $r$ is even, then $a^r - 1 = (a^{r/2} - 1)(a^{r/2} + 1)$ is a
multiple of $N$. The first factor is not a multiple of $N$ (otherwise the period
would be $r/2$). If the second isn't either, that is, if
$a^{r/2} \not\equiv -1 \pmod N$, then $\gcd(a^{r/2} - 1, N)$ is a proper factor.
For an RSA modulus $N = pq$ a random $a$ works at least half the time; if it
fails, pick another.

<div class="mars-steps" markdown>

1. Choose $N = 21$ and a random $a = 2$. Check $\gcd(2, 21) = 1$.
2. Powers of 2 mod 21: 2, 4, 8, 16, 11, 1. The period is $r = 6$.
3. $r$ is even, so look at $a^{r/2} = 2^3 = 8$. It is not $-1 \equiv 20$, so this $a$ is good.
4. $\gcd(8 - 1, 21) = \gcd(7, 21) = 7$.
5. $\gcd(8 + 1, 21) = \gcd(9, 21) = 3$.
6. $21 = 7 \times 3$. Only step 2 was hard, and only step 2 needs a quantum computer.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 620 350" width="620" role="img" aria-label="Powers of 7 mod 15 repeat every 4 steps; powers of 2 mod 21 repeat every 6 steps">
<text x="160" y="55" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">7ˣ mod 15</text>
<line x1="174.1" y1="114.1" x2="225.2" y2="165.2" stroke-width="1.5" stroke="currentColor"/>
<polygon points="230.9,170.9 227.7,162.7 222.7,167.7" fill="currentColor"/>
<circle cx="160" cy="100" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="105" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<text x="160" y="70" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">7¹</text>
<line x1="230.9" y1="199.1" x2="179.8" y2="250.2" stroke-width="1.5" stroke="currentColor"/>
<polygon points="174.1,255.9 182.3,252.7 177.3,247.7" fill="currentColor"/>
<circle cx="245" cy="185" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="245" y="190" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<text x="279" y="189" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">7²</text>
<line x1="145.9" y1="255.9" x2="94.8" y2="204.8" stroke-width="1.5" stroke="currentColor"/>
<polygon points="89.1,199.1 92.3,207.3 97.3,202.3" fill="currentColor"/>
<circle cx="160" cy="270" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="275" font-size="14" text-anchor="middle" fill="currentColor">13</text>
<text x="160" y="308" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">7³</text>
<line x1="89.1" y1="170.9" x2="140.2" y2="119.8" stroke-width="1.5" class="acc"/>
<polygon points="145.9,114.1 137.7,117.3 142.7,122.3" class="acc-fill"/>
<circle cx="75" cy="185" r="17" fill="none" class="acc" stroke-width="2.5" fill="none"/>
<text x="75" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="41" y="189" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">7⁴</text>
<text x="160" y="190" font-size="15" text-anchor="middle" class="acc-fill" font-weight="bold">r = 4</text>
<text x="450" y="45" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">2ˣ mod 21</text>
<line x1="467.3" y1="100" x2="508" y2="123.5" stroke-width="1.5" stroke="currentColor"/>
<polygon points="515,127.5 509.8,120.4 506.2,126.6" fill="currentColor"/>
<circle cx="450" cy="90" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="95" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<text x="450" y="60" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">2¹</text>
<line x1="532.3" y1="157.5" x2="532.3" y2="204.5" stroke-width="1.5" stroke="currentColor"/>
<polygon points="532.3,212.5 535.9,204.5 528.7,204.5" fill="currentColor"/>
<circle cx="532.3" cy="137.5" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="532.3" y="142.5" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<text x="561.7" y="124.5" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">2²</text>
<line x1="515" y1="242.5" x2="474.2" y2="266" stroke-width="1.5" stroke="currentColor"/>
<polygon points="467.3,270 476,269.1 472.4,262.9" fill="currentColor"/>
<circle cx="532.3" cy="232.5" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="532.3" y="237.5" font-size="14" text-anchor="middle" fill="currentColor">8</text>
<text x="561.7" y="253.5" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">2³</text>
<line x1="432.7" y1="270" x2="392" y2="246.5" stroke-width="1.5" stroke="currentColor"/>
<polygon points="385,242.5 390.2,249.6 393.8,243.4" fill="currentColor"/>
<circle cx="450" cy="280" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="285" font-size="14" text-anchor="middle" fill="currentColor">16</text>
<text x="450" y="318" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">2⁴</text>
<line x1="367.7" y1="212.5" x2="367.7" y2="165.5" stroke-width="1.5" stroke="currentColor"/>
<polygon points="367.7,157.5 364.1,165.5 371.3,165.5" fill="currentColor"/>
<circle cx="367.7" cy="232.5" r="17" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="367.7" y="237.5" font-size="14" text-anchor="middle" fill="currentColor">11</text>
<text x="338.3" y="253.5" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">2⁵</text>
<line x1="385" y1="127.5" x2="425.8" y2="104" stroke-width="1.5" class="acc"/>
<polygon points="432.7,100 424,100.9 427.6,107.1" class="acc-fill"/>
<circle cx="367.7" cy="137.5" r="17" fill="none" class="acc" stroke-width="2.5" fill="none"/>
<text x="367.7" y="142.5" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="338.3" y="124.5" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">2⁶</text>
<text x="450" y="190" font-size="15" text-anchor="middle" class="acc-fill" font-weight="bold">r = 6</text>
</svg>
<figcaption>Figure 20.4. The period is how long the powers take to come back to 1. For 7 mod 15 it is 4, for 2 mod 21 it is 6. From an even period r, gcd(a^(r/2) ± 1, N) gives the factors: gcd(48, 15) = 3 and gcd(50, 15) = 5; gcd(7, 21) = 7 and gcd(9, 21) = 3.</figcaption>
</figure>

Here is the whole method in Python. The function `period` finds $r$ by trying
$a, a^2, a^3, \ldots$ one after another. That loop is the **only** part a
quantum computer replaces:

```python
from math import gcd

def period(a, N):                       # the step a quantum computer does fast; here, the slow way
    r, x = 1, a % N
    while x != 1:
        x, r = x * a % N, r + 1
    return r

def shor_classical(N, a):
    g = gcd(a, N)
    if g > 1:
        return g                        # a lucky guess already shares a factor
    r = period(a, N)
    if r % 2 or pow(a, r // 2, N) == N - 1:
        return None                     # unlucky a: try another
    return gcd(pow(a, r // 2, N) - 1, N)

for N, a in ((15, 7), (21, 2), (3233, 3)):
    print(N, a, period(a, N), shor_classical(N, a))
print(shor_classical(15, 14))
```

Output:

```
15 7 4 3
21 2 6 7
3233 3 260 61
None
```

The third line factors the toy RSA modulus $3233 = 61 \times 53$ from
[Chapter 13](13-RSA.md). The last line shows a bad choice: $14 \equiv -1$, so
its period is 2 and $14^1 \equiv -1$, and the method gives nothing.

For a 2048-bit $N$ the period can have hundreds of digits, and the loop would
outlast the universe. Classically, finding the period is as hard as factoring.
Shor's contribution is a quantum way to find it.

<figure class="mars-fig">
<svg viewBox="0 0 640 225" width="640" role="img" aria-label="Shor&#x27;s algorithm as a flowchart: only period finding is quantum">
<rect x="10" y="60" width="140" height="70" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="80" y="91" font-size="13" text-anchor="middle" fill="currentColor">pick a random a</text>
<text x="80" y="108" font-size="13" text-anchor="middle" fill="currentColor">gcd(a, N) = 1?</text>
<rect x="170" y="60" width="140" height="70" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="240" y="91" font-size="13" text-anchor="middle" fill="currentColor">find the period r</text>
<text x="240" y="108" font-size="13" text-anchor="middle" fill="currentColor">aʳ ≡ 1 (mod N)</text>
<line x1="150" y1="95" x2="160" y2="95" stroke-width="1.5" stroke="currentColor"/>
<polygon points="168,95 160,91.4 160,98.6" fill="currentColor"/>
<rect x="330" y="60" width="140" height="70" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="91" font-size="13" text-anchor="middle" fill="currentColor">r even and</text>
<text x="400" y="108" font-size="13" text-anchor="middle" fill="currentColor">a^(r/2) ≢ −1 ?</text>
<line x1="310" y1="95" x2="320" y2="95" stroke-width="1.5" stroke="currentColor"/>
<polygon points="328,95 320,91.4 320,98.6" fill="currentColor"/>
<rect x="490" y="60" width="140" height="70" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="560" y="91" font-size="13" text-anchor="middle" fill="currentColor">gcd(a^(r/2) − 1, N)</text>
<text x="560" y="108" font-size="13" text-anchor="middle" fill="currentColor">is a factor</text>
<line x1="470" y1="95" x2="480" y2="95" stroke-width="1.5" stroke="currentColor"/>
<polygon points="488,95 480,91.4 480,98.6" fill="currentColor"/>
<text x="240" y="48" font-size="13" text-anchor="middle" class="acc-fill" font-weight="bold">the only quantum step</text>
<path d="M 400 132 C 400 200, 80 200, 80 136" stroke-width="1.5" fill="none" stroke="currentColor" stroke-dasharray="5 4"/>
<line x1="81" y1="150" x2="80.5" y2="141" stroke-width="1.5" stroke="currentColor"/>
<polygon points="80,133 76.9,141.2 84.1,140.8" fill="currentColor"/>
<text x="240" y="210" font-size="13" text-anchor="middle" fill="currentColor">no: try another a (works at least half the time for N = pq)</text>
</svg>
<figcaption>Figure 20.5. The shape of Shor's algorithm. Everything except the accented box is ordinary arithmetic from Chapter 3; a quantum computer is needed only to find the period quickly.</figcaption>
</figure>

## 20.4 Where the quantum computer comes in

*Level: intermediate.* The quantum part of Shor's algorithm has four steps. Let
$Q$ be a power of 2 with $Q \ge N^2$; for $N = 21$, $Q = 512$.

1. **Superpose every exponent.** Put a register of $\log_2 Q = 9$ qubits into
   an even superposition of all $x$ from 0 to 511 (a Hadamard on each qubit
   does it).
2. **Compute $a^x \bmod N$ into a second register, for all $x$ at once.** This
   is ordinary modular exponentiation, the square-and-multiply of
   [Chapter 13](13-RSA.md), built from reversible gates. It is by far the
   most expensive step.
3. **Apply the quantum Fourier transform** to the first register. Like the
   Fourier transform in signal processing, it turns a pattern that repeats every
   $r$ steps into sharp peaks at multiples of $Q/r$. The waves from different
   $x$ interfere: at most places they cancel, and at the peaks they add.
4. **Measure** the first register. You get one number $y$, almost always close
   to $k \cdot Q / r$ for some whole $k$.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The quantum circuit for period finding: Hadamards, modular exponentiation, the quantum Fourier transform, measurement">
<line x1="70" y1="40" x2="600" y2="40" stroke-width="1.2" stroke="currentColor"/>
<line x1="70" y1="62" x2="600" y2="62" stroke-width="1.2" stroke="currentColor"/>
<line x1="70" y1="84" x2="600" y2="84" stroke-width="1.2" stroke="currentColor"/>
<line x1="70" y1="106" x2="600" y2="106" stroke-width="1.2" stroke="currentColor"/>
<line x1="70" y1="160" x2="600" y2="160" stroke-width="1.2" stroke="currentColor"/>
<line x1="70" y1="182" x2="600" y2="182" stroke-width="1.2" stroke="currentColor"/>
<line x1="70" y1="204" x2="600" y2="204" stroke-width="1.2" stroke="currentColor"/>
<text x="62" y="77" font-size="13" text-anchor="end" fill="currentColor">x: 9</text>
<text x="62" y="95" font-size="12" text-anchor="end" fill="currentColor">qubits</text>
<text x="62" y="186" font-size="13" text-anchor="end" fill="currentColor">aˣ mod N</text>
<text x="78" y="34" font-size="12" text-anchor="start" fill="currentColor">|0⟩</text>
<rect x="100" y="31" width="22" height="18" rx="2" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="111" y="45" font-size="12" text-anchor="middle" fill="currentColor">H</text>
<rect x="100" y="53" width="22" height="18" rx="2" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="111" y="67" font-size="12" text-anchor="middle" fill="currentColor">H</text>
<rect x="100" y="75" width="22" height="18" rx="2" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="111" y="89" font-size="12" text-anchor="middle" fill="currentColor">H</text>
<rect x="100" y="97" width="22" height="18" rx="2" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="111" y="111" font-size="12" text-anchor="middle" fill="currentColor">H</text>
<text x="111" y="128" font-size="14" text-anchor="middle" fill="currentColor">⋮</text>
<rect x="170" y="28" width="140" height="190" rx="6" class="soft-acc" stroke="currentColor" stroke-width="1.5"/>
<rect x="170" y="28" width="140" height="190" rx="6" stroke-width="2" class="acc" fill="none"/>
<text x="240" y="112" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">Uƒ</text>
<text x="240" y="132" font-size="12" text-anchor="middle" fill="currentColor">|x⟩|0⟩ → |x⟩|aˣ mod N⟩</text>
<text x="240" y="150" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.8">(most of the gates)</text>
<rect x="350" y="28" width="120" height="92" rx="6" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="410" y="70" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">QFT</text>
<text x="410" y="90" font-size="12" text-anchor="middle" fill="currentColor">≈ (log Q)² gates</text>
<rect x="510" y="30" width="40" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M 518 46 A 12 12 0 0 1 542 46" stroke-width="1.2" fill="none" stroke="currentColor"/>
<line x1="530" y1="46" x2="540" y2="34" stroke-width="1.2" stroke="currentColor"/>
<rect x="510" y="52" width="40" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M 518 68 A 12 12 0 0 1 542 68" stroke-width="1.2" fill="none" stroke="currentColor"/>
<line x1="530" y1="68" x2="540" y2="56" stroke-width="1.2" stroke="currentColor"/>
<rect x="510" y="74" width="40" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M 518 90 A 12 12 0 0 1 542 90" stroke-width="1.2" fill="none" stroke="currentColor"/>
<line x1="530" y1="90" x2="540" y2="78" stroke-width="1.2" stroke="currentColor"/>
<rect x="510" y="96" width="40" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M 518 112 A 12 12 0 0 1 542 112" stroke-width="1.2" fill="none" stroke="currentColor"/>
<line x1="530" y1="112" x2="540" y2="100" stroke-width="1.2" stroke="currentColor"/>
<text x="575" y="78" font-size="15" text-anchor="start" fill="currentColor" font-style="italic">y</text>
<text x="530" y="222" font-size="12" text-anchor="end" fill="currentColor" opacity="0.0">step 1      step 2      step 3      step 4</text>
<text x="111" y="16" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">step 1</text>
<text x="240" y="16" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">step 2</text>
<text x="410" y="16" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">step 3</text>
<text x="530" y="16" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">step 4</text>
</svg>
<figcaption>Figure 20.6. The quantum part of Shor's algorithm as a circuit (time runs left to right). Step 2, modular exponentiation, holds almost all of the gates; the Fourier transform turns the hidden period into peaks, and one measurement reads out y.</figcaption>
</figure>

You can't run a quantum computer here, but for small numbers you can compute
exactly what its measurement would give, by summing the waves directly. This
program does that for $N = 21$, $a = 2$, then recovers $r$ from a few possible
measurements with **continued fractions**: if $y/Q \approx k/r$, the
fraction with the smallest denominator near $y/Q$ reveals $r$.

```python
import cmath
from fractions import Fraction
from math import gcd

def measure_probs(N, a, Q):             # what the quantum measurement would give, computed the slow way
    f = [pow(a, x, N) for x in range(Q)]
    P = [0.0] * Q
    for v in set(f):                    # each value of a^x mod N contributes its own wave
        xs = [x for x in range(Q) if f[x] == v]
        for y in range(Q):
            P[y] += abs(sum(cmath.exp(2j * cmath.pi * x * y / Q) for x in xs)) ** 2 / Q ** 2
    return P

N, a, Q = 21, 2, 512                    # Q is a power of 2 with Q >= N^2
P = measure_probs(N, a, Q)
print([y for y in range(Q) if P[y] > 0.1])
print(round(sum(P[y] for y in range(Q) if P[y] > 0.1), 3))
for y in (85, 171, 427):
    guess = Fraction(y, Q).limit_denominator(N)   # continued fractions: nearest fraction with a small denominator
    r = guess.denominator
    print(y, guess, r, pow(a, r, N) == 1)
r = 6
print(gcd(pow(a, r // 2, N) - 1, N), gcd(pow(a, r // 2, N) + 1, N))
```

Output:

```
[0, 85, 171, 256, 341, 427]
0.789
85 1/6 6 True
171 1/3 3 False
427 5/6 6 True
7 3
```

Read it line by line. Out of 512 possible results, six values carry 79% of the
probability, and they sit at $0, 85.3, 170.7, 256, 341.3, 426.7$: the multiples
of $512/6$, rounded. A measurement of 85 or 427 gives $1/6$ or $5/6$, so
$r = 6$. A measurement of 171 gives $1/3$, which only reveals a divisor of $r$;
$2^3 \not\equiv 1$ shows it is wrong, and you run again (or combine several
runs with a least common multiple). A result of 0 tells you nothing. In
practice a handful of runs is enough.

<figure class="mars-fig">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="Probability of each measurement result y from 0 to 511 for N = 21, a = 2: six sharp peaks at multiples of 512/6">
<line x1="60" y1="250" x2="640" y2="250" stroke-width="1.2" stroke="currentColor"/>
<line x1="60" y1="250" x2="60" y2="30" stroke-width="1.2" stroke="currentColor"/>
<line x1="56" y1="250" x2="60" y2="250" stroke-width="1" stroke="currentColor"/>
<text x="52" y="254" font-size="12" text-anchor="end" fill="currentColor">0.00</text>
<line x1="56" y1="188.9" x2="60" y2="188.9" stroke-width="1" stroke="currentColor"/>
<text x="52" y="192.9" font-size="12" text-anchor="end" fill="currentColor">0.05</text>
<line x1="56" y1="127.8" x2="60" y2="127.8" stroke-width="1" stroke="currentColor"/>
<text x="52" y="131.8" font-size="12" text-anchor="end" fill="currentColor">0.10</text>
<line x1="56" y1="66.7" x2="60" y2="66.7" stroke-width="1" stroke="currentColor"/>
<text x="52" y="70.7" font-size="12" text-anchor="end" fill="currentColor">0.15</text>
<line x1="72" y1="250" x2="72" y2="46.3" stroke-width="2.2" class="acc"/>
<line x1="162" y1="250" x2="162" y2="249.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="163.1" y1="250" x2="163.1" y2="248.6" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="164.3" y1="250" x2="164.3" y2="247.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="165.4" y1="250" x2="165.4" y2="241.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="166.5" y1="250" x2="166.5" y2="110.7" stroke-width="2.2" class="acc"/>
<line x1="167.6" y1="250" x2="167.6" y2="215.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="168.7" y1="250" x2="168.7" y2="244.4" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="169.8" y1="250" x2="169.8" y2="247.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="170.9" y1="250" x2="170.9" y2="248.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="172" y1="250" x2="172" y2="249.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="256.5" y1="250" x2="256.5" y2="249.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="257.6" y1="250" x2="257.6" y2="248.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="258.7" y1="250" x2="258.7" y2="247.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="259.9" y1="250" x2="259.9" y2="244.4" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="261" y1="250" x2="261" y2="215.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="262.1" y1="250" x2="262.1" y2="110.7" stroke-width="2.2" class="acc"/>
<line x1="263.2" y1="250" x2="263.2" y2="241.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="264.3" y1="250" x2="264.3" y2="247.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="265.4" y1="250" x2="265.4" y2="248.6" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="266.5" y1="250" x2="266.5" y2="249.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="356.6" y1="250" x2="356.6" y2="46.3" stroke-width="2.2" class="acc"/>
<line x1="446.6" y1="250" x2="446.6" y2="249.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="447.7" y1="250" x2="447.7" y2="248.6" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="448.8" y1="250" x2="448.8" y2="247.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="449.9" y1="250" x2="449.9" y2="241.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="451" y1="250" x2="451" y2="110.7" stroke-width="2.2" class="acc"/>
<line x1="452.1" y1="250" x2="452.1" y2="215.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="453.3" y1="250" x2="453.3" y2="244.4" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="454.4" y1="250" x2="454.4" y2="247.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="455.5" y1="250" x2="455.5" y2="248.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="456.6" y1="250" x2="456.6" y2="249.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="541.1" y1="250" x2="541.1" y2="249.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="542.2" y1="250" x2="542.2" y2="248.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="543.3" y1="250" x2="543.3" y2="247.8" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="544.4" y1="250" x2="544.4" y2="244.4" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="545.5" y1="250" x2="545.5" y2="215.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="546.6" y1="250" x2="546.6" y2="110.7" stroke-width="2.2" class="acc"/>
<line x1="547.7" y1="250" x2="547.7" y2="241.3" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="548.9" y1="250" x2="548.9" y2="247.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="550" y1="250" x2="550" y2="248.6" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<line x1="551.1" y1="250" x2="551.1" y2="249.2" stroke-width="1.2" stroke="currentColor" opacity="0.6"/>
<text x="72" y="40.3" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<text x="166.5" y="104.7" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">85</text>
<text x="262.1" y="104.7" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">171</text>
<text x="356.6" y="40.3" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">256</text>
<text x="451" y="104.7" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">341</text>
<text x="546.6" y="104.7" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">427</text>
<line x1="72" y1="250" x2="72" y2="254" stroke-width="1" stroke="currentColor"/>
<text x="72" y="268" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<line x1="214.3" y1="250" x2="214.3" y2="254" stroke-width="1" stroke="currentColor"/>
<text x="214.3" y="268" font-size="12" text-anchor="middle" fill="currentColor">128</text>
<line x1="356.6" y1="250" x2="356.6" y2="254" stroke-width="1" stroke="currentColor"/>
<text x="356.6" y="268" font-size="12" text-anchor="middle" fill="currentColor">256</text>
<line x1="498.8" y1="250" x2="498.8" y2="254" stroke-width="1" stroke="currentColor"/>
<text x="498.8" y="268" font-size="12" text-anchor="middle" fill="currentColor">384</text>
<line x1="640" y1="250" x2="640" y2="254" stroke-width="1" stroke="currentColor"/>
<text x="640" y="268" font-size="12" text-anchor="middle" fill="currentColor">511</text>
<text x="356" y="290" font-size="13" text-anchor="middle" fill="currentColor">measured value y</text>
<text x="78" y="20" font-size="13" text-anchor="start" fill="currentColor">probability</text>
</svg>
<figcaption>Figure 20.7. What the measurement would give for N = 21, a = 2, Q = 512, computed by the program above. Six results (0, 85, 171, 256, 341, 427) carry 79% of the probability; they sit at multiples of 512/6, so continued fractions recover the period 6. The faint lines next to 85, 171, 341 and 427 are the probability that leaks to neighbors because 512/6 is not whole.</figcaption>
</figure>

**Why this is fast.** The summing loop above costs about $Q^2$ steps, which is
hopeless for big $N$. A quantum computer does the Fourier transform with about
$(\log_2 Q)^2$ gates, and the modular exponentiation with about $(\log_2 N)^3$
gates using schoolbook multiplication. The whole algorithm grows like the cube
of the key length. Doubling an RSA key from 2048 to 4096 bits makes the attack
about eight times longer and needs about twice the qubits: a nuisance, not a
defense.

**How Shor found it.** In 1994 Peter Shor was a mathematician in the algorithms
group at AT&T Bell Labs in Murray Hill, New Jersey. What caught his eye was Daniel Simon's new result: a problem where a
quantum computer found a hidden pattern exponentially faster than any classical
machine, by a Fourier-like transform. Simon's problem was artificial, but Shor
saw that the same trick finds the period of a function, and that a period is
exactly what discrete logarithms and factoring need. He worked out discrete
logarithms first and factoring soon after, in the spring of 1994. News spread by
word of mouth before the paper was out, and by the time he presented it at the
FOCS conference in Santa Fe that November, physicists who had never cared about
number theory were discussing RSA. The algorithm turned quantum computing from a
curiosity into a field with a goal, and it started post-quantum cryptography.
Shor received the Nevanlinna Prize in 1998 and later moved to MIT.

!!! note "Life story: Shor's algorithm"
    **Born:** 1994, Peter Shor at AT&T Bell Labs · **Purpose:** to show what a quantum
    computer could do that a classical one can't · **Helped:** made quantum computing a serious
    field and started the move to post-quantum cryptography · **Status:** waiting for hardware; as of
    2026 no machine has run it honestly on more than a classroom number, but the resources it needs
    keep falling (section 20.8)

## 20.5 Discrete logarithms and elliptic curves

*Level: intermediate.* Diffie-Hellman, DSA and every elliptic-curve scheme rest
on the discrete logarithm: given $g$ and $h = g^x$ in a group, find $x$.
Shor's paper solved this too. Look at the function of two exponents

$$
f(u, v) = g^u \cdot h^v = g^{u + x v}.
$$

It has the same value whenever $u + xv$ is the same mod the group order $q$, so
it repeats along the direction $(-x, 1)$: $f(u - x, v + 1) = f(u, v)$. That
hidden direction is a period in two dimensions, and a two-dimensional quantum
Fourier transform finds it, giving $x$.

<figure class="mars-fig">
<svg viewBox="0 0 420 400" width="420" role="img" aria-label="Grid of exponent pairs (u, v) mod 11; the pairs where g^u h^v equals 1 lie on a slanted lattice with direction (−3, 1)">
<circle cx="60" cy="350" r="6" class="acc-fill"/>
<circle cx="60" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="60" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="154" r="6" class="acc-fill"/>
<circle cx="88" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="88" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="266" r="6" class="acc-fill"/>
<circle cx="116" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="116" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="144" cy="70" r="6" class="acc-fill"/>
<circle cx="172" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="182" r="6" class="acc-fill"/>
<circle cx="172" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="172" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="294" r="6" class="acc-fill"/>
<circle cx="200" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="200" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="228" cy="98" r="6" class="acc-fill"/>
<circle cx="228" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="210" r="6" class="acc-fill"/>
<circle cx="256" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="256" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="322" r="6" class="acc-fill"/>
<circle cx="284" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="284" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="238" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="126" r="6" class="acc-fill"/>
<circle cx="312" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="312" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="350" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="322" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="294" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="266" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="238" r="6" class="acc-fill"/>
<circle cx="340" cy="210" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="182" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="154" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="126" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="98" r="2.2" fill="currentColor" opacity="0.45"/>
<circle cx="340" cy="70" r="2.2" fill="currentColor" opacity="0.45"/>
<text x="60" y="370" font-size="11" text-anchor="middle" fill="currentColor">0</text>
<text x="88" y="370" font-size="11" text-anchor="middle" fill="currentColor">1</text>
<text x="116" y="370" font-size="11" text-anchor="middle" fill="currentColor">2</text>
<text x="144" y="370" font-size="11" text-anchor="middle" fill="currentColor">3</text>
<text x="172" y="370" font-size="11" text-anchor="middle" fill="currentColor">4</text>
<text x="200" y="370" font-size="11" text-anchor="middle" fill="currentColor">5</text>
<text x="228" y="370" font-size="11" text-anchor="middle" fill="currentColor">6</text>
<text x="256" y="370" font-size="11" text-anchor="middle" fill="currentColor">7</text>
<text x="284" y="370" font-size="11" text-anchor="middle" fill="currentColor">8</text>
<text x="312" y="370" font-size="11" text-anchor="middle" fill="currentColor">9</text>
<text x="340" y="370" font-size="11" text-anchor="middle" fill="currentColor">10</text>
<text x="46" y="354" font-size="11" text-anchor="end" fill="currentColor">0</text>
<text x="46" y="326" font-size="11" text-anchor="end" fill="currentColor">1</text>
<text x="46" y="298" font-size="11" text-anchor="end" fill="currentColor">2</text>
<text x="46" y="270" font-size="11" text-anchor="end" fill="currentColor">3</text>
<text x="46" y="242" font-size="11" text-anchor="end" fill="currentColor">4</text>
<text x="46" y="214" font-size="11" text-anchor="end" fill="currentColor">5</text>
<text x="46" y="186" font-size="11" text-anchor="end" fill="currentColor">6</text>
<text x="46" y="158" font-size="11" text-anchor="end" fill="currentColor">7</text>
<text x="46" y="130" font-size="11" text-anchor="end" fill="currentColor">8</text>
<text x="46" y="102" font-size="11" text-anchor="end" fill="currentColor">9</text>
<text x="46" y="74" font-size="11" text-anchor="end" fill="currentColor">10</text>
<text x="200" y="390" font-size="14" text-anchor="middle" fill="currentColor" font-style="italic">u</text>
<text x="22" y="210" font-size="14" text-anchor="middle" fill="currentColor" font-style="italic">v</text>
<line x1="172" y1="182" x2="101.6" y2="158.5" stroke-width="2" stroke="currentColor"/>
<polygon points="94,156 100.5,161.9 102.7,155.1" fill="currentColor"/>
<text x="149.6" y="148" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">(−3, +1)</text>
</svg>
<figcaption>Figure 20.8. The hidden period of discrete logs, in a toy group of order 11 with secret x = 3. The pairs (u, v) where u + 3v ≡ 0 (mod 11), so that gᵘhᵛ = 1, form a slanted lattice. Stepping by (−3, 1) never changes gᵘhᵛ, and a two-dimensional Fourier transform finds that direction, which reveals x.</figcaption>
</figure>

Nothing in the argument uses what the group is. It works mod $p$ and on
elliptic curves alike. In fact elliptic curves fall *sooner*. A 256-bit curve
key gives the same classical security as 3072-bit RSA because the best
classical attack on curves is so much weaker, but Shor's cost depends only on
the size of the numbers, and 256 is much smaller than 3072. Roetteler, Naehrig,
Svore and Lauter estimated in 2017 that a 256-bit curve needs about 2,330
error-corrected (logical) qubits, against about 4,100 for factoring a 2048-bit
modulus with the standard circuit. The smaller keys that made elliptic curves
attractive in [Chapter 15](15-Elliptic-Curves.md) make them the first target.

## 20.6 Grover's algorithm: search in a square root

*Level: intermediate.* Grover's problem is the dumbest possible one: $N$ boxes,
one holds the prize, and the only way to check a box is to open it. Classically
you open $N/2$ boxes on average. Grover's algorithm needs about
$\frac{\pi}{4} \sqrt{N}$ steps.

**How.** Start with every box at the same amplitude $1/\sqrt N$. Each step does
two things:

1. The **oracle** flips the sign of the right box's amplitude. (The oracle is a
   circuit that runs the check, such as "does this key decrypt the message to
   something sensible?", on every box in superposition.)
2. **Inversion about the mean**: replace each amplitude $x$ by $2m - x$, where $m$
   is the average amplitude.

<figure class="mars-fig">
<svg viewBox="0 0 660 260" width="660" role="img" aria-label="Grover&#x27;s step on 8 boxes: start even, flip the target&#x27;s sign, reflect about the mean">
<text x="115" y="24" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">start: all 0.354</text>
<line x1="20" y1="150" x2="210" y2="150" stroke-width="1" stroke="currentColor"/>
<rect x="28" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="51" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="74" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="97" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="120" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="143" y="111.1" width="16" height="38.9" class="acc-fill"/>
<rect x="166" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="189" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<text x="151" y="105.1" font-size="11" text-anchor="middle" class="acc-fill" font-weight="bold">0.354</text>
<line x1="212" y1="90" x2="224" y2="90" stroke-width="1.5" stroke="currentColor"/>
<polygon points="232,90 224,86.4 224,93.6" fill="currentColor"/>
<text x="330" y="24" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">oracle flips box 5</text>
<line x1="235" y1="150" x2="425" y2="150" stroke-width="1" stroke="currentColor"/>
<rect x="243" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="266" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="289" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="312" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="335" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="358" y="150" width="16" height="38.9" class="acc-fill"/>
<rect x="381" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<rect x="404" y="111.1" width="16" height="38.9" fill="currentColor" fill-opacity="0.45"/>
<text x="366" y="204.9" font-size="11" text-anchor="middle" class="acc-fill" font-weight="bold">-0.354</text>
<line x1="427" y1="90" x2="439" y2="90" stroke-width="1.5" stroke="currentColor"/>
<polygon points="447,90 439,86.4 439,93.6" fill="currentColor"/>
<text x="545" y="24" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">reflect about the mean</text>
<line x1="450" y1="150" x2="640" y2="150" stroke-width="1" stroke="currentColor"/>
<rect x="458" y="130.6" width="16" height="19.4" fill="currentColor" fill-opacity="0.45"/>
<rect x="481" y="130.6" width="16" height="19.4" fill="currentColor" fill-opacity="0.45"/>
<rect x="504" y="130.6" width="16" height="19.4" fill="currentColor" fill-opacity="0.45"/>
<rect x="527" y="130.6" width="16" height="19.4" fill="currentColor" fill-opacity="0.45"/>
<rect x="550" y="130.6" width="16" height="19.4" fill="currentColor" fill-opacity="0.45"/>
<rect x="573" y="52.8" width="16" height="97.2" class="acc-fill"/>
<rect x="596" y="130.6" width="16" height="19.4" fill="currentColor" fill-opacity="0.45"/>
<rect x="619" y="130.6" width="16" height="19.4" fill="currentColor" fill-opacity="0.45"/>
<line x1="450" y1="120.8" x2="640" y2="120.8" stroke-width="1.2" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="452" y="115.8" font-size="11" text-anchor="start" fill="currentColor">mean 0.265</text>
<text x="581" y="46.8" font-size="11" text-anchor="middle" class="acc-fill" font-weight="bold">0.884</text>
<text x="330" y="245" font-size="13" text-anchor="middle" fill="currentColor">after one step box 5 is measured with probability 0.884² = 0.78 (it started at 1/8)</text>
</svg>
<figcaption>Figure 20.9. One Grover step with 8 boxes, the key in box 5. The oracle flips its amplitude below zero, which drags the mean down; reflecting every amplitude about the mean then throws box 5 far above the rest.</figcaption>
</figure>

The flipped box sits far below the mean, so the reflection throws it far above.
Every step adds roughly $2/\sqrt N$ to its amplitude. This simulation uses 64
boxes:

```python
from math import pi, sqrt

N, target = 64, 42                      # 64 boxes; the key is in box 42
amp = [1 / sqrt(N)] * N                 # start with every box equally likely
for step in range(1, 9):
    amp[target] = -amp[target]          # the oracle flips the sign of the right answer
    mean = sum(amp) / N
    amp = [2 * mean - x for x in amp]   # reflect every amplitude about the mean
    print(step, round(amp[target] ** 2, 3))
print(round(pi / 4 * sqrt(N)))
```

Output:

```
1 0.135
2 0.344
3 0.591
4 0.816
5 0.964
6 0.997
7 0.907
8 0.718
6
```

After 6 steps the right box comes up 99.7% of the time, against 32 openings on
average for a classical search. Keep going and the probability falls again: the
amplitude rotates past its peak, so the number of steps must be right.

<figure class="mars-fig">
<svg viewBox="0 0 560 290" width="560" role="img" aria-label="Success probability of Grover&#x27;s search on 64 boxes rises to 0.997 at 6 steps, then falls">
<line x1="60" y1="240" x2="530" y2="240" stroke-width="1.2" stroke="currentColor"/>
<line x1="60" y1="240" x2="60" y2="40" stroke-width="1.2" stroke="currentColor"/>
<text x="52" y="244" font-size="12" text-anchor="end" fill="currentColor">0</text>
<line x1="56" y1="240" x2="530" y2="240" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="52" y="144" font-size="12" text-anchor="end" fill="currentColor">0.5</text>
<line x1="56" y1="140" x2="530" y2="140" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="52" y="44" font-size="12" text-anchor="end" fill="currentColor">1</text>
<line x1="56" y1="40" x2="530" y2="40" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<polyline points="60,236.9 99.2,213 138.3,171.2 177.5,121.7 216.7,76.7 255.8,47.3 295,40.7 334.2,58.5 373.3,96.4 412.5,145 451.7,192.4 490.8,226.9 530,240" stroke-width="2.5" class="acc" fill="none"/>
<circle cx="60" cy="236.9" r="3.5" fill="currentColor"/>
<text x="60" y="258" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<circle cx="99.2" cy="213" r="3.5" fill="currentColor"/>
<text x="99.2" y="258" font-size="12" text-anchor="middle" fill="currentColor">1</text>
<circle cx="138.3" cy="171.2" r="3.5" fill="currentColor"/>
<text x="138.3" y="258" font-size="12" text-anchor="middle" fill="currentColor">2</text>
<circle cx="177.5" cy="121.7" r="3.5" fill="currentColor"/>
<text x="177.5" y="258" font-size="12" text-anchor="middle" fill="currentColor">3</text>
<circle cx="216.7" cy="76.7" r="3.5" fill="currentColor"/>
<text x="216.7" y="258" font-size="12" text-anchor="middle" fill="currentColor">4</text>
<circle cx="255.8" cy="47.3" r="3.5" fill="currentColor"/>
<text x="255.8" y="258" font-size="12" text-anchor="middle" fill="currentColor">5</text>
<circle cx="295" cy="40.7" r="3.5" class="acc-fill"/>
<text x="295" y="258" font-size="12" text-anchor="middle" fill="currentColor">6</text>
<circle cx="334.2" cy="58.5" r="3.5" fill="currentColor"/>
<text x="334.2" y="258" font-size="12" text-anchor="middle" fill="currentColor">7</text>
<circle cx="373.3" cy="96.4" r="3.5" fill="currentColor"/>
<text x="373.3" y="258" font-size="12" text-anchor="middle" fill="currentColor">8</text>
<circle cx="412.5" cy="145" r="3.5" fill="currentColor"/>
<text x="412.5" y="258" font-size="12" text-anchor="middle" fill="currentColor">9</text>
<circle cx="451.7" cy="192.4" r="3.5" fill="currentColor"/>
<text x="451.7" y="258" font-size="12" text-anchor="middle" fill="currentColor">10</text>
<circle cx="490.8" cy="226.9" r="3.5" fill="currentColor"/>
<text x="490.8" y="258" font-size="12" text-anchor="middle" fill="currentColor">11</text>
<circle cx="530" cy="240" r="3.5" fill="currentColor"/>
<text x="530" y="258" font-size="12" text-anchor="middle" fill="currentColor">12</text>
<text x="305" y="36.7" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">0.997 at step 6</text>
<text x="295" y="280" font-size="13" text-anchor="middle" fill="currentColor">Grover steps</text>
<text x="64" y="18" font-size="13" text-anchor="start" fill="currentColor">chance the measurement finds box 42</text>
</svg>
<figcaption>Figure 20.10. Grover's probability from the simulation above, extended to 12 steps. It peaks at round(π/4 · √64) = 6 steps and then falls again, because the amplitude keeps rotating past the target. A classical search needs 32 openings on average.</figcaption>
</figure>

**What it does to keys and hashes.** An $n$-bit key has $2^n$ possibilities, so
Grover needs about $2^{n/2}$ steps. On paper AES-128 drops to 64-bit security
and AES-256 to 128. For a hash preimage the same square root applies. For
collisions, the classical birthday attack already costs only $2^{n/2}$, and the
best quantum collision algorithm (Brassard, Høyer and Tapp, 1998) needs so much
quantum memory that, once that is counted, it does no better than a classical
machine of the same cost.

**Why it is weaker in practice than on paper.** Three reasons.

- **The steps are sequential.** Classical key search splits across a million
  machines for a million-fold speed-up. Split Grover's search across $k$ quantum
  machines and each still needs $\sqrt{N/k}$ steps in a row, so $k$ machines
  gain only $\sqrt k$.
- **Each step is a whole AES circuit**, run fault-tolerantly. $2^{64}$ of those
  in a row is far beyond any foreseeable machine; at a million steps per second
  it would take over half a million years.
- **It is optimal.** Bennett, Bernstein, Brassard and Vazirani proved in 1997
  that no quantum algorithm can search an unstructured space faster than about
  $\sqrt N$ steps. There is no better Grover around the corner.

So symmetric cryptography survives with at most longer keys. NIST still counts
AES-128 as acceptable; users who want a wide margin, such as NSA's CNSA 2.0
suite, choose AES-256 and SHA-384.

**Grover's story.** Lov Grover, born in India and trained as an electrical engineer,
worked at Bell Labs too. After Shor's result everyone wondered
whether quantum computers could speed up problems with no hidden structure at all.
Grover's answer, presented at the STOC conference in Philadelphia in May 1996 as
"a fast quantum mechanical algorithm for database search", was yes, but only by a
square root. Together with the lower bound of Bennett, Bernstein, Brassard and
Vazirani, it settled the question: unstructured search is exactly $\sqrt N$ hard
for a quantum computer. For cryptographers the news was reassuring. It is the
reason post-quantum standards double symmetric key lengths for long-term secrets
and do nothing more.

!!! note "Life story: Grover's algorithm"
    **Born:** 1996, Lov Grover at Bell Labs · **Purpose:** search an unstructured space
    faster than one guess at a time · **Helped:** fixed how much longer symmetric keys must be, which
    is why CNSA 2.0 and long-term systems choose AES-256 · **Status:** proven optimal; under realistic
    limits on circuit depth it is no practical threat to AES-128

## 20.7 What falls and what stands

| Family | Today's security | Against a large quantum computer | What replaces it |
|---|---|---|---|
| RSA, finite-field Diffie-Hellman, DSA | 112 to 128 bits | broken by Shor at every key size | ML-KEM ([Chapter 21](21-Lattice-Cryptography.md)), ML-DSA, SLH-DSA |
| ECDH, ECDSA, EdDSA | 128 bits | broken by Shor, on a smaller machine than RSA | the same, usually as a hybrid |
| AES-128 | 128 bits | 64 on paper (Grover), far more in practice | acceptable; AES-256 for the long term |
| AES-256, ChaCha20 | 256 bits | 128 on paper | nothing needed |
| SHA-256, SHA-3 | 128 collision, 256 preimage | collisions about the same; preimages 128 | nothing needed |
| HMAC, HKDF, Argon2 | as their hash | as their hash | nothing needed |
| Lattices, hash-based, code-based | 128 bits and up | no known large speed-up | they are the replacement |

The pattern is simple. **Public-key cryptography built on factoring or discrete
logs must be replaced. Symmetric cryptography and hashes stay.** Since every
TLS, SSH or Signal session uses public-key cryptography only to agree on a
symmetric key, replacing the key agreement protects everything after it.

<figure class="mars-fig">
<svg viewBox="0 0 620 290" width="620" role="img" aria-label="Security in bits today and against a large quantum computer, on paper">
<text x="180" y="47" font-size="13" text-anchor="end" fill="currentColor">RSA-3072, DH</text>
<rect x="190" y="30" width="200" height="14" fill="currentColor" fill-opacity="0.35"/>
<text x="396" y="42" font-size="12" text-anchor="start" fill="currentColor">128</text>
<text x="196" y="59" font-size="12" text-anchor="start" class="acc-fill" font-weight="bold">broken by Shor</text>
<text x="180" y="93" font-size="13" text-anchor="end" fill="currentColor">ECDH / ECDSA P-256</text>
<rect x="190" y="76" width="200" height="14" fill="currentColor" fill-opacity="0.35"/>
<text x="396" y="88" font-size="12" text-anchor="start" fill="currentColor">128</text>
<text x="196" y="105" font-size="12" text-anchor="start" class="acc-fill" font-weight="bold">broken by Shor</text>
<text x="180" y="139" font-size="13" text-anchor="end" fill="currentColor">AES-128</text>
<rect x="190" y="122" width="200" height="14" fill="currentColor" fill-opacity="0.35"/>
<text x="396" y="134" font-size="12" text-anchor="start" fill="currentColor">128</text>
<rect x="190" y="139" width="100" height="14" class="acc-fill"/>
<text x="296" y="151" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">64</text>
<text x="180" y="185" font-size="13" text-anchor="end" fill="currentColor">AES-256</text>
<rect x="190" y="168" width="400" height="14" fill="currentColor" fill-opacity="0.35"/>
<text x="596" y="180" font-size="12" text-anchor="start" fill="currentColor">256</text>
<rect x="190" y="185" width="200" height="14" class="acc-fill"/>
<text x="396" y="197" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">128</text>
<text x="180" y="231" font-size="13" text-anchor="end" fill="currentColor">SHA-256 preimage</text>
<rect x="190" y="214" width="400" height="14" fill="currentColor" fill-opacity="0.35"/>
<text x="596" y="226" font-size="12" text-anchor="start" fill="currentColor">256</text>
<rect x="190" y="231" width="200" height="14" class="acc-fill"/>
<text x="396" y="243" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">128</text>
<rect x="190" y="272" width="14" height="10" fill="currentColor" fill-opacity="0.35"/>
<text x="210" y="281" font-size="12" text-anchor="start" fill="currentColor">today</text>
<rect x="280" y="272" width="14" height="10" class="acc-fill"/>
<text x="300" y="281" font-size="12" text-anchor="start" fill="currentColor">quantum, on paper</text>
</svg>
<figcaption>Figure 20.11. What a large quantum computer does to each family, in bits of security on paper. Shor's algorithm takes public keys built on factoring and discrete logs to zero; Grover at most halves symmetric keys and hash preimages. The lattice, hash and code-based replacements have no known quantum attack better than such generic speed-ups.</figcaption>
</figure>

**The end of a forty-year run.** Diffie and Hellman published their key exchange in
1976; Rivest, Shamir and Adleman their cryptosystem in 1977; Neal Koblitz and
Victor Miller proposed elliptic curves in 1985. For four decades these three
ideas carried almost every key agreement and signature on the internet. None of
them has been broken by a classical computer at proper key sizes. They are
being retired because of an algorithm that has not yet run on a real key: a rare
case of a whole field acting on a proof instead of a disaster.

!!! note "Life story: RSA, Diffie-Hellman and elliptic curves (the quantum ending)"
    **Born:** 1976 to 1985 (Diffie-Hellman, RSA, ECC) · **Purpose:** public-key
    encryption, key agreement and signatures · **Helped:** made HTTPS, SSH, signed software and secure
    messaging possible ([Chapters 12 to 15](12-Diffie-Hellman.md)) · **Retiring:** NIST IR 8547 deprecates
    them after 2030 and disallows them after 2035, because Shor's algorithm breaks them at every key size ·
    **Replaced by:** ML-KEM, ML-DSA, SLH-DSA, first in hybrids

## 20.8 How big a machine?

*Level: intermediate.* Raw qubit counts in press releases mislead, because
qubits make errors. A useful machine groups many noisy **physical qubits** into
each reliable **logical qubit** with a quantum error-correcting code. The most
studied, the **surface code**, spreads one logical qubit over a square patch of
physical ones and measures their parities constantly to catch errors without
looking at the data. At error rates near one in a thousand, a logical qubit
good enough for billions of operations costs hundreds to a thousand or more
physical qubits.

<figure class="mars-fig">
<svg viewBox="0 0 560 300" width="560" role="img" aria-label="A distance-5 surface code patch: 25 data qubits and 24 measurement qubits make one logical qubit">
<rect x="70" y="40" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<rect x="118" y="40" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="166" y="40" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<rect x="214" y="40" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="70" y="88" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="118" y="88" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<rect x="166" y="88" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="214" y="88" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<rect x="70" y="136" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<rect x="118" y="136" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="166" y="136" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<rect x="214" y="136" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="70" y="184" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="118" y="184" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<rect x="166" y="184" width="48" height="48" rx="0" class="soft" stroke="currentColor" stroke-width="0.8"/>
<rect x="214" y="184" width="48" height="48" rx="0" class="soft-acc" stroke="currentColor" stroke-width="0.8"/>
<path d="M 70 232 A 24.0 24.0 0 0 0 118 232" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="94" cy="244" r="5" class="acc-fill"/>
<path d="M 118 40 A 24.0 24.0 0 0 1 166 40" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="142" cy="28" r="5" class="acc-fill"/>
<path d="M 166 232 A 24.0 24.0 0 0 0 214 232" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="190" cy="244" r="5" class="acc-fill"/>
<path d="M 214 40 A 24.0 24.0 0 0 1 262 40" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="238" cy="28" r="5" class="acc-fill"/>
<path d="M 70 40 A 24.0 24.0 0 0 0 70 88" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="58" cy="64" r="5" class="acc-fill"/>
<path d="M 262 88 A 24.0 24.0 0 0 1 262 136" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="274" cy="112" r="5" class="acc-fill"/>
<path d="M 70 136 A 24.0 24.0 0 0 0 70 184" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="58" cy="160" r="5" class="acc-fill"/>
<path d="M 262 184 A 24.0 24.0 0 0 1 262 232" stroke-width="0.8" fill="none" stroke="currentColor"/>
<circle cx="274" cy="208" r="5" class="acc-fill"/>
<circle cx="94" cy="64" r="5" class="acc-fill"/>
<circle cx="142" cy="64" r="5" class="acc-fill"/>
<circle cx="190" cy="64" r="5" class="acc-fill"/>
<circle cx="238" cy="64" r="5" class="acc-fill"/>
<circle cx="94" cy="112" r="5" class="acc-fill"/>
<circle cx="142" cy="112" r="5" class="acc-fill"/>
<circle cx="190" cy="112" r="5" class="acc-fill"/>
<circle cx="238" cy="112" r="5" class="acc-fill"/>
<circle cx="94" cy="160" r="5" class="acc-fill"/>
<circle cx="142" cy="160" r="5" class="acc-fill"/>
<circle cx="190" cy="160" r="5" class="acc-fill"/>
<circle cx="238" cy="160" r="5" class="acc-fill"/>
<circle cx="94" cy="208" r="5" class="acc-fill"/>
<circle cx="142" cy="208" r="5" class="acc-fill"/>
<circle cx="190" cy="208" r="5" class="acc-fill"/>
<circle cx="238" cy="208" r="5" class="acc-fill"/>
<circle cx="70" cy="40" r="7" fill="currentColor"/>
<circle cx="118" cy="40" r="7" fill="currentColor"/>
<circle cx="166" cy="40" r="7" fill="currentColor"/>
<circle cx="214" cy="40" r="7" fill="currentColor"/>
<circle cx="262" cy="40" r="7" fill="currentColor"/>
<circle cx="70" cy="88" r="7" fill="currentColor"/>
<circle cx="118" cy="88" r="7" fill="currentColor"/>
<circle cx="166" cy="88" r="7" fill="currentColor"/>
<circle cx="214" cy="88" r="7" fill="currentColor"/>
<circle cx="262" cy="88" r="7" fill="currentColor"/>
<circle cx="70" cy="136" r="7" fill="currentColor"/>
<circle cx="118" cy="136" r="7" fill="currentColor"/>
<circle cx="166" cy="136" r="7" fill="currentColor"/>
<circle cx="214" cy="136" r="7" fill="currentColor"/>
<circle cx="262" cy="136" r="7" fill="currentColor"/>
<circle cx="70" cy="184" r="7" fill="currentColor"/>
<circle cx="118" cy="184" r="7" fill="currentColor"/>
<circle cx="166" cy="184" r="7" fill="currentColor"/>
<circle cx="214" cy="184" r="7" fill="currentColor"/>
<circle cx="262" cy="184" r="7" fill="currentColor"/>
<circle cx="70" cy="232" r="7" fill="currentColor"/>
<circle cx="118" cy="232" r="7" fill="currentColor"/>
<circle cx="166" cy="232" r="7" fill="currentColor"/>
<circle cx="214" cy="232" r="7" fill="currentColor"/>
<circle cx="262" cy="232" r="7" fill="currentColor"/>
<circle cx="340" cy="80" r="7" fill="currentColor"/>
<text x="356" y="85" font-size="13" text-anchor="start" fill="currentColor">data qubit (25 = d²)</text>
<circle cx="340" cy="112" r="5" class="acc-fill"/>
<text x="356" y="117" font-size="13" text-anchor="start" fill="currentColor">measurement qubit (24)</text>
<text x="340" y="160" font-size="13" text-anchor="start" fill="currentColor">each square checks the parity</text>
<text x="340" y="178" font-size="13" text-anchor="start" fill="currentColor">of its 4 corners, every cycle</text>
<text x="340" y="220" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">49 physical ≈ 2d² for d = 5</text>
<text x="340" y="240" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">d ≈ 25 needs about 1,250</text>
</svg>
<figcaption>Figure 20.12. One logical qubit in the surface code, at distance d = 5. Data qubits sit on the corners; measurement qubits in the two kinds of squares check parities without reading the data. The patch costs 2d² − 1 physical qubits, so the d ≈ 25 needed for Shor on RSA-2048 means about 1,250 per logical qubit.</figcaption>
</figure>

**The toy factorizations.** In 2001 a team from IBM's Almaden lab and Stanford,
led by Isaac Chuang with Lieven Vandersypen as first author, ran Shor's
algorithm on $N = 15$ using seven nuclear spins in a specially made molecule. A
photonic experiment did 21 in 2012. Both were real experiments, but to fit the
hardware the circuits were simplified using knowledge of the answer. In 2013
John Smolin, Graeme Smith and Alexander Vargo showed that with such shortcuts
you could "factor" enormous numbers with almost no quantum hardware. No
quantum computer has yet run Shor's algorithm without shortcuts on anything
larger than a classroom example.

**The chips.** Google's 53-qubit Sycamore (2019) performed a random sampling
task it estimated would take a supercomputer 10,000 years; later classical
simulations closed much of that gap. IBM's Condor passed 1,000 physical qubits
in 2023. In December 2024 Google's 105-qubit Willow chip showed that its error
rate **fell** as it used more qubits for error correction: the "below
threshold" behavior that large machines need. That was a milestone for
engineering, not for breaking keys.

**The estimates.** What it would take to break real keys has fallen sharply:

| Year | Target | Estimate | Who |
|---|---|---|---|
| 2003 | RSA with an $n$-bit modulus | $2n + 3$ logical qubits (4,099 for 2048 bits) | Beauregard |
| 2017 | 256-bit elliptic curve | about 2,330 logical qubits | Roetteler, Naehrig, Svore, Lauter |
| 2019 | RSA-2048 | about 20 million noisy qubits, 8 hours | Gidney and Ekerå |
| 2025 | RSA-2048 | under a million noisy qubits, under a week | Gidney |

Each estimate assumes about one error per thousand operations and a complete
fault-tolerant design. The largest machines in 2026 have hundreds to a few
thousand physical qubits, so the gap is still a factor of hundreds or more.
But it closes from both sides: hardware improves, and better circuits need less
of it. Newer preprints, which use other error-correcting codes and hardware
that can move qubits around, claim lower numbers still for both RSA and
elliptic curves; those are not yet checked by others. The history appendix's
[quantum chapter](../books/history/19-Hardware-Quantum-and-the-Long-View.md)
lists them with their sources.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Physical qubits needed to break RSA-2048 against the largest machines built, on a logarithmic scale">
<line x1="80" y1="270" x2="610" y2="270" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="274" font-size="12" text-anchor="end" fill="currentColor">10</text>
<line x1="80" y1="235.7" x2="610" y2="235.7" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="239.7" font-size="12" text-anchor="end" fill="currentColor">100</text>
<line x1="80" y1="201.4" x2="610" y2="201.4" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="205.4" font-size="12" text-anchor="end" fill="currentColor">1,000</text>
<line x1="80" y1="167.1" x2="610" y2="167.1" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="171.1" font-size="12" text-anchor="end" fill="currentColor">10⁴</text>
<line x1="80" y1="132.9" x2="610" y2="132.9" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="136.9" font-size="12" text-anchor="end" fill="currentColor">10⁵</text>
<line x1="80" y1="98.6" x2="610" y2="98.6" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="102.6" font-size="12" text-anchor="end" fill="currentColor">1 million</text>
<line x1="80" y1="64.3" x2="610" y2="64.3" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="68.3" font-size="12" text-anchor="end" fill="currentColor">10⁷</text>
<line x1="80" y1="30" x2="610" y2="30" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="72" y="34" font-size="12" text-anchor="end" fill="currentColor">10⁸</text>
<line x1="80" y1="270" x2="610" y2="270" stroke-width="1.2" stroke="currentColor"/>
<text x="80" y="288" font-size="12" text-anchor="middle" fill="currentColor">2017</text>
<text x="186" y="288" font-size="12" text-anchor="middle" fill="currentColor">2019</text>
<text x="292" y="288" font-size="12" text-anchor="middle" fill="currentColor">2021</text>
<text x="398" y="288" font-size="12" text-anchor="middle" fill="currentColor">2023</text>
<text x="504" y="288" font-size="12" text-anchor="middle" fill="currentColor">2025</text>
<text x="610" y="288" font-size="12" text-anchor="middle" fill="currentColor">2027</text>
<polyline points="186,54 504,98.6" stroke-width="2.5" class="acc" fill="none" stroke-dasharray="6 4"/>
<circle cx="186" cy="54" r="5" class="acc-fill"/>
<circle cx="504" cy="98.6" r="5" class="acc-fill"/>
<text x="196" y="46" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">Gidney–Ekerå 2019: 20 million</text>
<text x="494" y="118.6" font-size="12" text-anchor="end" fill="currentColor" font-weight="bold">Gidney 2025: &lt; 1 million</text>
<circle cx="186" cy="245.2" r="5" fill="currentColor"/>
<text x="194" y="261.2" font-size="12" text-anchor="start" fill="currentColor">Sycamore 53</text>
<circle cx="398" cy="199.7" r="5" fill="currentColor"/>
<text x="406" y="215.7" font-size="12" text-anchor="start" fill="currentColor">Condor 1,121</text>
<circle cx="451" cy="235" r="5" fill="currentColor"/>
<text x="459" y="251" font-size="12" text-anchor="start" fill="currentColor">Willow 105</text>
<text x="508" y="144.8" font-size="13" text-anchor="start" class="acc-fill" font-weight="bold">gap: ×500 or more</text>
<line x1="502" y1="106.6" x2="502" y2="191.1" stroke-width="1.2" stroke="currentColor" stroke-dasharray="3 3"/>
</svg>
<figcaption>Figure 20.13. Need against have, in physical qubits (log scale). The estimate to factor RSA-2048 fell twentyfold between 2019 and 2025, while the largest chips hold hundreds to about a thousand noisy qubits. The gap is still a factor of hundreds, and it closes from both sides.</figcaption>
</figure>

**When?** Nobody knows. Serious opinions range from the early 2030s to never.
Surveys of researchers, such as the Global Risk Institute's yearly report, show
a wide spread, with a growing share expecting a cryptographically relevant
quantum computer within fifteen years. For planning, the date matters less than
the next section's argument.

## 20.9 Harvest now, decrypt later

An adversary with access to network links can record encrypted traffic today,
store it, and decrypt it the day a large quantum computer exists. Storage is
cheap, and intelligence agencies are known to keep intercepted traffic for
years. Anything sent today under RSA or elliptic-curve key exchange is only as
secret as that future machine allows.

Michele Mosca of the University of Waterloo turned this into a rule of thumb
(2015). Let

- $x$ = how many years your data must stay secret,
- $y$ = how many years it takes you to move your systems to new algorithms,
- $z$ = how many years until a quantum computer can break your keys.

If $x + y > z$, you are already too late: data sent near the end of your
migration still has to be secret after the machine arrives.

**A worked example.** A hospital's records must stay private for $x = 10$
years. Replacing every system, device and vendor contract takes $y = 5$ years.
If the machine comes in $z = 12$ years, then $x + y = 15 > 12$: records sent
in the last three years before the switch, and some before, are exposed.
Nobody knows $z$, but for medical, diplomatic, financial and industrial
secrets, $x$ alone is often 15 to 25 years.

<figure class="mars-fig">
<svg viewBox="0 0 620 220" width="620" role="img" aria-label="Mosca&#x27;s inequality drawn as bars: migration time plus secrecy time against the time until a quantum computer">
<text x="40" y="30" font-size="13" text-anchor="start" fill="currentColor" opacity="0.8">years from today:</text>
<line x1="40" y1="40" x2="40" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="40" y="192" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<line x1="100" y1="40" x2="100" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="100" y="192" font-size="12" text-anchor="middle" fill="currentColor">2</text>
<line x1="160" y1="40" x2="160" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="160" y="192" font-size="12" text-anchor="middle" fill="currentColor">4</text>
<line x1="220" y1="40" x2="220" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="220" y="192" font-size="12" text-anchor="middle" fill="currentColor">6</text>
<line x1="280" y1="40" x2="280" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="280" y="192" font-size="12" text-anchor="middle" fill="currentColor">8</text>
<line x1="340" y1="40" x2="340" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="340" y="192" font-size="12" text-anchor="middle" fill="currentColor">10</text>
<line x1="400" y1="40" x2="400" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="400" y="192" font-size="12" text-anchor="middle" fill="currentColor">12</text>
<line x1="460" y1="40" x2="460" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="460" y="192" font-size="12" text-anchor="middle" fill="currentColor">14</text>
<line x1="520" y1="40" x2="520" y2="175" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="520" y="192" font-size="12" text-anchor="middle" fill="currentColor">16</text>
<rect x="40" y="60" width="150" height="34" rx="2" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="115" y="82" font-size="13" text-anchor="middle" fill="currentColor">y = 5: migrate</text>
<rect x="190" y="60" width="300" height="34" rx="2" stroke-width="2" class="acc soft-acc"/>
<text x="295" y="82" font-size="13" text-anchor="middle" fill="currentColor">x = 10: must stay secret</text>
<rect x="40" y="120" width="360" height="34" rx="2" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="220" y="142" font-size="13" text-anchor="middle" fill="currentColor">z = 12: until a quantum computer</text>
<line x1="400" y1="50" x2="400" y2="165" stroke-width="2.5" class="acc"/>
<text x="445" y="120" font-size="13" text-anchor="middle" class="acc-fill" font-weight="bold">exposed</text>
<text x="445" y="138" font-size="13" text-anchor="middle" class="acc-fill" font-weight="bold">3+ years</text>
<text x="310" y="215" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">x + y = 15 &gt; z = 12: too late</text>
</svg>
<figcaption>Figure 20.14. The hospital example: if migrating takes 5 years and records must stay secret for 10 more, the secrets need protection until year 15. A quantum computer at year 12 can read everything recorded under the old algorithms that still matters after it arrives.</figcaption>
</figure>

The inequality also explains the order of the migration. **Key exchange first**,
because recorded traffic is the harvest. **Signatures later**, because a
signature can't be forged retroactively: a quantum computer in 2040 can forge
a 2040 signature, not make a 2026 one invalid. But anything that must still be
trusted when the machine arrives, root certificates, firmware keys in cars and
satellites, passports and smart cards built today and used for fifteen years,
needs quantum-safe signatures in its design now.

## 20.10 The NIST competition

*Level: intermediate.* Several families of public-key cryptography were known
long before anyone worried about quantum computers, and none of them uses
factoring or discrete logs:

- **Codes.** Robert McEliece's 1978 system hides a message among deliberate
  errors in an error-correcting code ([Chapter 22](22-Hash-and-Code-Based.md)).
- **Hashes.** Leslie Lamport's and Ralph Merkle's 1979 signatures need only a
  hash function ([Chapter 22](22-Hash-and-Code-Based.md)).
- **Lattices.** Miklós Ajtai's 1996 worst-case guarantee, the NTRU cryptosystem
  of Jeffrey Hoffstein, Jill Pipher and Joseph Silverman (1996), and Oded
  Regev's learning with errors (2005) ([Chapter 21](21-Lattice-Cryptography.md)).
- **Multivariate equations** (from the late 1980s) and **isogenies** between
  elliptic curves (from the 2000s), both with small keys and, as it turned out,
  more risk.

In August 2015 the NSA announced that it planned to move to quantum-resistant
algorithms, a surprise from the agency that had made elliptic curves the center
of its Suite B ten years earlier. In 2016 NIST published a report on the threat
(NIST IR 8105) and, in December, a call for proposals. It avoided the word
"competition" because it might pick several winners, but it ran like the AES
and SHA-3 contests: open submissions, public attacks, several rounds.

NIST defined five **security categories** by the cost of attacks on existing
primitives: category 1 is at least as hard as finding an AES-128 key, 2 a
SHA-256 collision, 3 an AES-192 key, 4 a SHA-384 collision, and 5 an AES-256 key.
Grover is already counted in those yardsticks, so the categories hold against
quantum attackers too.

| Date | Step |
|---|---|
| November 2017 | 82 submissions; 69 complete enough for round 1 |
| January 2019 | 26 go to round 2 |
| July 2020 | round 3: 7 finalists and 8 alternates |
| February 2022 | Ward Beullens breaks the finalist Rainbow in a weekend on a laptop |
| 5 July 2022 | NIST selects Kyber (key encapsulation) and Dilithium, Falcon and SPHINCS+ (signatures); four KEMs go to a fourth round |
| July 2022 | Wouter Castryck and Thomas Decru break the fourth-round KEM SIKE in about an hour on one core |
| August 2023 | draft standards |
| 13 August 2024 | FIPS 203 (ML-KEM), FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA) published |
| 11 March 2025 | HQC, a code-based KEM, chosen as a backup to ML-KEM (NIST IR 8545) |

<figure class="mars-fig">
<svg viewBox="0 0 620 300" width="620" role="img" aria-label="The NIST post-quantum process as a funnel from 82 submissions to 3 standards">
<rect x="25" y="20" width="330" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="41" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">82</text>
<text x="365" y="41" font-size="13" text-anchor="start" fill="currentColor">Nov 2017: submissions</text>
<rect x="39.8" y="64" width="300.5" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">69</text>
<text x="365" y="85" font-size="13" text-anchor="start" fill="currentColor">Dec 2017: complete, round 1</text>
<rect x="99.7" y="108" width="180.6" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="129" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">26</text>
<text x="365" y="129" font-size="13" text-anchor="start" fill="currentColor">Jan 2019: round 2</text>
<rect x="120.9" y="152" width="138.3" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="173" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">15</text>
<text x="365" y="173" font-size="13" text-anchor="start" fill="currentColor">Jul 2020: round 3: 7 finalists + 8 alternates</text>
<rect x="150.5" y="196" width="79" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="217" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<text x="365" y="217" font-size="13" text-anchor="start" fill="currentColor">Jul 2022: selected (+4 KEMs to round 4)</text>
<rect x="154.4" y="240" width="71.2" height="32" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="190" y="261" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<text x="365" y="261" font-size="13" text-anchor="start" fill="currentColor">Aug 2024: FIPS 203, 204, 205</text>
</svg>
<figcaption>Figure 20.15. NIST's process narrowed 82 submissions to three published standards in seven years. Two candidates, Rainbow and SIKE, were broken along the way; HQC was added as a fourth algorithm in March 2025.</figcaption>
</figure>

Falcon, renamed FN-DSA, is to become FIPS 206; it was still in preparation when
this chapter was written. Because nearly every new signature was lattice-based
and large, NIST opened a second call for **additional signatures** in 2022: 40
entered the first round in 2023 and 14 the second in October 2024, most of them
multivariate, code-based or built from symmetric primitives. Other countries
ran their own processes (South Korea's KpqC chose its algorithms in January 2025),
and Germany's BSI and France's ANSSI recommend using the new algorithms only in
hybrid form for now, hash-based signatures excepted.

The two 2022 breaks shaped the outcome. Neither touched lattices or hashes, but
both showed that a problem studied for ten or fifteen years can still collapse.
NIST deliberately kept backups from different families: SLH-DSA (hashes) next to
ML-DSA, HQC (codes) next to ML-KEM. [Chapter 22](22-Hash-and-Code-Based.md)
tells the two breaks in detail.

**Who ran it.** The process was run by a small team in NIST's Computer Security
Division, with Dustin Moody leading the project. It worked the way the AES
contest had in 1997 to 2001: everything public, conferences after each round where
submitters and attackers met, and written reports explaining every cut. That
openness is why Rainbow and SIKE were broken during the competition and not
after deployment, and why the world accepted the winners although NIST is part
of the US government.

!!! note "Life story: the NIST post-quantum process"
    **Born:** December 2016, NIST's call for proposals · **Purpose:** choose public-key
    algorithms that survive quantum computers, in the open · **Helped:** produced FIPS 203, 204 and
    205 (2024) and a model that South Korea and others followed · **Status:** current and still running:
    FN-DSA (FIPS 206), HQC and the additional signatures are in progress

## 20.11 Migrating: hybrids

*Level: intermediate.* Switching the world's key exchange to an algorithm a few
years old is itself a risk: ML-KEM could hide a flaw, as SIKE and Rainbow did.
So the first deployments are **hybrid**. Run a classical key exchange (X25519)
and a post-quantum one (ML-KEM) side by side, and feed **both** shared secrets
into the key derivation. An attacker must break both. A flaw in ML-KEM leaves
you with today's security; a quantum computer leaves you with ML-KEM's.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Message flow of the X25519MLKEM768 hybrid key exchange">
<rect x="50" y="10" width="120" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="31" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Client</text>
<line x1="110" y1="42" x2="110" y2="196" stroke-width="1" stroke="currentColor" stroke-dasharray="4 4"/>
<rect x="470" y="10" width="120" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="31" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Server</text>
<line x1="530" y1="42" x2="530" y2="196" stroke-width="1" stroke="currentColor" stroke-dasharray="4 4"/>
<line x1="110" y1="80" x2="522" y2="80" stroke-width="2" stroke="currentColor"/>
<polygon points="530,80 522,76.4 522,83.6" fill="currentColor"/>
<text x="320" y="64" font-size="13" text-anchor="middle" fill="currentColor">key share: ML-KEM-768 public key + X25519 key</text>
<text x="320" y="98" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1,184 + 32 = 1,216 bytes</text>
<line x1="530" y1="150" x2="118" y2="150" stroke-width="2" stroke="currentColor"/>
<polygon points="110,150 118,153.6 118,146.4" fill="currentColor"/>
<text x="320" y="134" font-size="13" text-anchor="middle" fill="currentColor">ML-KEM ciphertext + X25519 key</text>
<text x="320" y="168" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1,088 + 32 = 1,120 bytes</text>
<rect x="15" y="200" width="190" height="74" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="110" y="224.6" font-size="13" text-anchor="middle" fill="currentColor">ss₁ from ML-KEM</text>
<text x="110" y="241.6" font-size="13" text-anchor="middle" fill="currentColor">ss₂ from X25519</text>
<text x="110" y="258.6" font-size="13" text-anchor="middle" fill="currentColor">key = KDF(ss₁ ‖ ss₂)</text>
<rect x="435" y="200" width="190" height="74" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="530" y="224.6" font-size="13" text-anchor="middle" fill="currentColor">ss₁ from ML-KEM</text>
<text x="530" y="241.6" font-size="13" text-anchor="middle" fill="currentColor">ss₂ from X25519</text>
<text x="530" y="258.6" font-size="13" text-anchor="middle" fill="currentColor">key = KDF(ss₁ ‖ ss₂)</text>
</svg>
<figcaption>Figure 20.16. A hybrid handshake. Each side ends with two 32-byte secrets, one from ML-KEM and one from X25519, and derives the session key from both, so an attacker has to break both. The price is about 2.3 KB on the wire instead of 64 bytes.</figcaption>
</figure>

The TLS hybrid `X25519MLKEM768` does exactly this. The client's key share is an
ML-KEM-768 public key (1,184 bytes) followed by an X25519 public key (32 bytes).
The server encapsulates to the first and does ordinary X25519 with the second,
replying with an ML-KEM ciphertext (1,088 bytes) and its own X25519 key. The
two 32-byte secrets are concatenated and go into TLS's key schedule. This
program does the same with the real algorithms; it needs a recent version of
the `cryptography` package (it was run with version 50), which includes ML-KEM:

```python
# pip install cryptography
import hashlib
from cryptography.hazmat.primitives.asymmetric.mlkem import MLKEM768PrivateKey, MLKEM768PublicKey
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey, X25519PublicKey

# client: one ML-KEM key and one X25519 key, sent together as its key share
kem, ec = MLKEM768PrivateKey.generate(), X25519PrivateKey.generate()
share = kem.public_key().public_bytes_raw() + ec.public_key().public_bytes_raw()

# server: encapsulate to the ML-KEM half, do ordinary X25519 with the other half
ss_kem, ct = MLKEM768PublicKey.from_public_bytes(share[:1184]).encapsulate()
ec2 = X25519PrivateKey.generate()
reply = ct + ec2.public_key().public_bytes_raw()
server = hashlib.sha3_256(ss_kem + ec2.exchange(X25519PublicKey.from_public_bytes(share[1184:]))).hexdigest()

# client: undo both and combine the same way
ss_kem2 = kem.decapsulate(reply[:1088])
client = hashlib.sha3_256(ss_kem2 + ec.exchange(X25519PublicKey.from_public_bytes(reply[1088:]))).hexdigest()
print(len(share), len(reply), client == server)
```

Output:

```
1216 1120 True
```

Compare 1,216 and 1,120 bytes with 32 each way for X25519 alone. The cost of
post-quantum key exchange is about 2 KB per handshake and a fraction of a
millisecond of computing, which the web turned out to absorb easily. Google's
first experiment, CECPQ1 in 2016, paired X25519 with the lattice scheme
NewHope in a test version of Chrome; CECPQ2 with Cloudflare in 2019 tried
NTRU-HRSS. They showed the larger messages mostly worked, and that some old
network equipment broke on unusually large handshakes, which had to be fixed
before a default switch.

**How hybrids grew up.** The first public test was Google's CECPQ1 in 2016: for a
few months a small share of Chrome connections to Google combined X25519 with
the lattice scheme NewHope. CECPQ2, with Cloudflare in 2019, repeated the
experiment with NTRU-HRSS. Both showed that the cryptography was cheap and that
the real obstacles were network devices that choked on large handshakes. When
the standards arrived in 2024, the plumbing was ready, and the switch to
`X25519MLKEM768` took months instead of years.

!!! note "Life story: hybrid post-quantum key exchange"
    **Born:** 2016, Google's CECPQ1 experiment in Chrome · **Purpose:** add post-quantum
    protection without giving up proven classical security · **Helped:** OpenSSH's default since 2022,
    Chrome and Firefox since 2024, Signal's PQXDH and Apple's PQ3 · **Status:** current; the standard way
    to deploy ML-KEM during the transition

**Who switched, and when.**

- **SSH went first.** OpenSSH 9.0 (April 2022) made the hybrid of Streamlined
  NTRU Prime and X25519 its default. OpenSSH 10.0 (April 2025) made
  `mlkem768x25519-sha256` the default.
- **Messaging.** Signal added PQXDH, with Kyber-1024 next to X25519, in
  September 2023. Apple's iMessage followed with PQ3 in iOS 17.4 (March 2024).
- **The web.** Chrome turned on a hybrid of X25519 and draft Kyber for desktop
  users in April 2024 and moved to the standard `X25519MLKEM768` with Chrome 131
  in November 2024. Firefox, Cloudflare and Apple's systems followed, and
  OpenSSL 3.5 (April 2025) ships ML-KEM, ML-DSA and SLH-DSA. By 2026 a large
  share of web traffic used post-quantum key exchange.

**Signatures and certificates are the hard part.** A TLS handshake carries
several signatures and public keys. Swapping a 64-byte Ed25519 signature for a
2,420-byte ML-DSA-44 one, several times over, adds kilobytes and slows
connections on poor networks. Public web certificates were still RSA and ECDSA
in late 2026, and new designs that need fewer signatures per handshake are being
worked out at the IETF. Firmware signing moved faster, with the hash-based LMS
and XMSS ([Chapter 22](22-Hash-and-Code-Based.md)).

**Deadlines.** NSA's CNSA 2.0 suite (September 2022) asks national security
systems to use ML-KEM-1024, ML-DSA-87, LMS or XMSS for firmware, AES-256 and
SHA-384 or SHA-512, with the transition complete by 2035. NIST IR 8547 sets the
same shape for US federal systems: quantum-vulnerable public-key algorithms are
deprecated after 2030 and disallowed after 2035. The UK's NCSC and a European
Union roadmap point to 2035 as well.

**How an organization migrates.** The algorithms are the easy part. The work is:

1. **Inventory.** Find every place that uses RSA or elliptic curves: protocols,
   certificates, code-signing keys, hardware tokens, file formats, partners.
2. **Prioritize** by Mosca's $x$: long-lived secrets and long-lived devices first.
3. **Turn on hybrid key exchange** wherever libraries support it (TLS, SSH,
   VPNs). This is usually a configuration change.
4. **Build crypto agility**: code that names its algorithms in one place and can
   change them without a redesign, so the next migration is cheaper.
5. **Plan signatures** for roots and firmware with long lifetimes, then for the
   rest as standards and certificates arrive.

## 20.12 Break it: myths and mistakes

*Level: intermediate.* Most failures around quantum computing so far are of
judgment, not mathematics.

**"Quantum computer breaks RSA" headlines.** In December 2022 a group of
Chinese researchers claimed that RSA-2048 could be broken with 372 qubits by
combining Schnorr's lattice factoring method with a quantum optimization
routine. Experts showed quickly that the method gives no real speed-up and the
estimate was empty. Factoring "records" on quantum annealers, such as D-Wave
machines, use methods that don't scale like Shor's. A claim deserves attention
only if it runs Shor's algorithm (or a successor) without using the answer to
simplify the circuit.

**"Quantum key distribution will save us."** QKD uses photons to agree on a key,
with security from physics instead of mathematics. It needs special hardware
and dedicated fiber or satellite links, works only point to point over limited
distances, and still needs a classical signature or pre-shared key to know who
is at the other end. Real QKD systems have been attacked through their hardware.
NSA, the UK's NCSC and France's ANSSI advise post-quantum cryptography instead
for nearly all uses.

QKD is older than Shor's algorithm. Stephen Wiesner had the idea of using
quantum states that can't be copied around 1970; Charles Bennett of IBM and
Gilles Brassard of the Université de Montréal turned it into the BB84 key
distribution protocol in 1984. Their first working prototype, in 1989, sent a
key about 32 centimeters across a laboratory bench. Since then it has gone into
fiber networks and, with China's Micius satellite launched in 2016, into space.
Its limits are the ones above: it replaces only the key exchange, needs
authentication from classical cryptography anyway, and needs its own hardware.

!!! note "Life story: Quantum key distribution"
    **Born:** 1984, Charles Bennett and Gilles Brassard (BB84) · **Purpose:** agree on a
    key with security from physics instead of hard problems · **Helped:** a few dedicated links and
    research networks; satellite experiments since 2016 · **Status:** a niche; NSA, NCSC and ANSSI
    recommend post-quantum algorithms instead for nearly every use

**"Use bigger RSA keys."** Shor's cost grows only like the cube of the key size.
A 16,384-bit key buys a factor of a few hundred in time; it costs much more than
that in everyday performance.

**"Our data is boring, so we can wait."** Mosca's inequality is about how long
the data must stay secret, not about how interesting it is today.

**Real implementation bugs in the replacements.** The new algorithms bring new
code, and code fails as it always has. In 2023 and 2024 the **KyberSlash**
timing leaks, a division whose duration depended on secret data, turned up in
many Kyber libraries, including the reference code, and allowed key recovery.
[Chapter 21](21-Lattice-Cryptography.md) returns to it. This is one more reason
for hybrids during the transition.

## 20.13 In the real world

- **Standards.** FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 205 (SLH-DSA), with
  FN-DSA and HQC to follow; SP 800-208 for LMS and XMSS. NIST IR 8547 for the
  transition dates. The reference pages, [ML-KEM](../01-key-exchange/ML-KEM.md),
  [ML-DSA](../02-signatures/ML-DSA.md), [SLH-DSA](../02-signatures/SLH-DSA.md),
  [FN-DSA](../02-signatures/FN-DSA.md) and
  [code-based KEMs](../01-key-exchange/Code-Based-KEMs.md), have the sizes.
- **What to do today.** Turn on hybrid key exchange (`X25519MLKEM768` in TLS,
  `mlkem768x25519-sha256` in SSH); keep AES-256 or ChaCha20 and SHA-256 or
  better; plan post-quantum signatures for anything that must be trusted past
  2035.
- **Status.** The [algorithm table](../index.md) gives every algorithm's NIST IR
  8547 dates. The [FAQ](../FAQ.md#will-quantum-computers-break-all-of-this) has a
  short answer for non-specialists.

## 20.14 Going deeper

*Level: expert.*

??? abstract "The quantum Fourier transform and why the peaks appear"

    After the modular exponentiation, measuring the second register (or just ignoring it) leaves the
    first in an even superposition of the $M \approx Q/r$ exponents with one value of $a^x \bmod N$:

    $$
    \frac{1}{\sqrt M} \sum_{j=0}^{M-1} \lvert x_0 + j r \rangle .
    $$

    The quantum Fourier transform maps $\lvert x \rangle$ to $\frac{1}{\sqrt Q} \sum_y e^{2\pi i x y / Q} \lvert y \rangle$, so the
    amplitude of $y$ becomes

    $$
    \frac{e^{2\pi i x_0 y / Q}}{\sqrt{MQ}} \sum_{j=0}^{M-1} e^{2\pi i j r y / Q} .
    $$

    The sum is a geometric series of unit vectors. When $ry/Q$ is close to a whole number they all point
    the same way and add to about $M$; otherwise they spin around and cancel. So the probability
    concentrates on $y$ with $\lvert y - kQ/r \rvert \le 1/2$, with total probability at least $4/\pi^2 \approx 0.405$ for
    each run (more when $r$ divides $Q$). The QFT itself is a product of $O((\log Q)^2)$ Hadamard and controlled
    phase gates, the quantum version of the FFT's butterfly.

??? abstract "Continued fractions: from a measurement to the period"

    A measurement $y$ satisfies $\lvert y/Q - k/r \rvert \le 1/(2Q)$. With $Q \ge N^2 > r^2$, that gives
    $\lvert y/Q - k/r \rvert < 1/(2r^2)$, and a theorem of Legendre says any fraction that close to $y/Q$ is one of
    its continued-fraction convergents. Expanding $427/512$:

    $$
    \frac{427}{512} = 0 + \cfrac{1}{1 + \cfrac{1}{5 + \cfrac{1}{42 + \cfrac{1}{2}}}}
    $$

    with convergents $0,\ 1,\ 5/6,\ 211/253,\ 427/512$; the last one with denominator below $N = 21$ is $5/6$. If $k$ and $r$
    share a factor, the denominator is a proper divisor of $r$ (the $171 \to 1/3$ case). Taking the least common
    multiple of the denominators from a few runs gives $r$ with high probability. Python's
    `Fraction.limit_denominator` does exactly this search.

??? abstract "Counting the cost: logical qubits, T gates and magic states"

    Resource estimates count two things. **Logical qubits**: Beauregard's circuit uses $2n + 3$ for an $n$-bit
    modulus; Gidney and Ekerå's 2019 design used more qubits but far fewer operations, through windowed
    arithmetic and the Ekerå-Håstad variant that needs fewer runs. **Non-Clifford gates** (T or Toffoli
    gates): the surface code does Clifford gates cheaply, but each T gate consumes a **magic state** that must
    be "distilled" in separate factories of qubits. For RSA-2048 the count is in the billions, and the
    factories dominate the physical qubit count. Gidney's 2025 estimate cut the total mainly through
    approximate residue arithmetic (building on Chevignard, Fouque and Schrottenloher, 2024), which needs far
    fewer qubits at a time, denser storage for idle qubits, and a cheaper way to make magic states. At an error rate of $10^{-3}$ per physical operation and a code distance $d$ around 25, each
    logical qubit costs about $2d^2 \approx 1{,}250$ physical qubits. All such estimates depend heavily on the
    assumed error rates and on the cycle time of the hardware.

??? abstract "Grover's limits and NIST's MAXDEPTH"

    Grover's algorithm is a rotation in the plane spanned by the target and the even superposition: each
    iteration turns the state by about $2/\sqrt N$ radians, so after $\frac{\pi}{4}\sqrt N$ iterations it points at the target.
    Bennett, Bernstein, Brassard and Vazirani (1997) proved that $\Omega(\sqrt N)$ oracle calls are necessary. With $k$
    machines each searching $N/k$ items, the depth is $\sqrt{N/k}$, so the total work is $k \sqrt{N/k} = \sqrt{kN}$:
    parallelism costs extra work. NIST's call for proposals therefore bounded quantum attacks by
    **MAXDEPTH**, the longest circuit an attacker can run in sequence, with plausible values from $2^{40}$ to $2^{96}$
    gates. Under any of those, a Grover attack on AES-128 must be split so widely that its total cost stays far
    above $2^{64}$, which is why NIST keeps AES-128 in category 1.

??? abstract "Which problems a quantum computer helps with"

    Shor's algorithm generalizes to the **hidden subgroup problem** in commutative (abelian) groups: find a
    subgroup $H$ given a function that is constant exactly on its cosets. Factoring, discrete logs in any
    group, and Simon's problem are all of this kind. Lattice problems relate instead to hidden subgroups
    in non-commutative groups (the dihedral group), where the best quantum algorithm, Kuperberg's (2003), still
    takes subexponential time and gives only small gains at cryptographic sizes. Graph isomorphism, NP-complete
    problems and generic search have no known exponential quantum speed-up. Post-quantum cryptography is
    the bet that the hard problems in Chapters 21 and 22 belong to this second group.

## Check yourself

??? question "1. A qubit is in the state (0.6, 0.8). What are the chances of measuring 0 and 1?"

    $0.6^2 = 0.36$ for 0 and $0.8^2 = 0.64$ for 1. They add to 1, as they must.

??? question "2. Apply the Hadamard gate to (0, 1), then again. What do you get each time?"

    First $(0.707, -0.707)$: measuring gives 0 or 1 with probability one half each. Then
    $\left(\frac{0.707 - 0.707}{\sqrt 2}, \frac{0.707 + 0.707}{\sqrt 2}\right) = (0, 1)$. The minus sign is what lets the 0 paths cancel.

??? question "3. Factor 35 by hand with a = 2, using the period."

    Powers of 2 mod 35: 2, 4, 8, 16, 32, 29, 23, 11, 22, 9, 18, 1. So $r = 12$. Then $2^6 = 64 \equiv 29$, which is not
    $-1 \equiv 34$. $\gcd(28, 35) = 7$ and $\gcd(30, 35) = 5$. So $35 = 7 \times 5$.

??? question "4. With N = 15 and a = 4, what goes wrong, and is the run wasted?"

    Powers of 4 mod 15: 4, 1, so $r = 2$ and $4^1 = 4$, which is not $-1 \equiv 14$. $\gcd(3, 15) = 3$ and $\gcd(5, 15) = 5$:
    it works. Now try $a = 14$: $r = 2$ but $14 \equiv -1$, so the method gives only the trivial factors 1 and 15.
    The run is wasted; pick another $a$.

??? question "5. Grover on 1,024 boxes: about how many steps, and how many for a classical search?"

    $\frac{\pi}{4}\sqrt{1024} = \frac{\pi}{4} \cdot 32 \approx 25$ steps, against 512 openings on average classically.

??? question "6. Data must stay secret for 20 years and migration takes 7. When must the quantum computer not yet exist?"

    Mosca's inequality needs $z \ge x + y = 27$ years. If a quantum computer is possible within 27 years, the
    migration should already have started.

??? question "7. Why is an elliptic-curve key at more risk from Shor than an RSA key of the same classical strength?"

    Shor's cost depends on the size of the numbers, not on the best classical attack. A 256-bit curve and
    3072-bit RSA both give 128-bit classical security, but the curve's numbers are twelve times shorter, so
    it needs far fewer logical qubits (about 2,330 against several thousand) and fewer operations.

??? question "8. Why does a hybrid of X25519 and ML-KEM need both secrets in the key derivation, not just one?"

    If the key came from only one of them, breaking that one would be enough. Hashing both together means
    an attacker must know both secrets, so the session is at least as strong as the stronger of the two.

??? question "9. A vendor offers 'quantum-safe' 8192-bit RSA. What do you tell them?"

    Shor's algorithm breaks RSA at any size in polynomial time; 8192 bits needs roughly four times the
    qubits and 64 times the operations of 2048 bits. It is not quantum-safe, and it is slow today. Use ML-KEM
    or ML-DSA, ideally in a hybrid.

??? question "10. In the simulation for N = 21, why do the peaks near 85 and 171 hold less probability than those at 0 and 256?"

    $Q/r = 512/6 \approx 85.33$ is not a whole number, so the multiples $kQ/r$ fall between integers, and the
    probability leaks to neighbors (84, 86, 170, 172 and so on). At $k = 0$ and $k = 3$, $kQ/r$ is exactly 0 and 256,
    so all the waves line up perfectly there.

## What you learned

- A qubit holds two amplitudes; measuring gives one random answer. Quantum
  algorithms work by **interference**, making wrong answers cancel.
- **Shor's algorithm** factors $N$ by finding the period of $a^x \bmod N$ with a
  quantum Fourier transform. The same method solves discrete logs, mod $p$ and
  on elliptic curves. Larger keys don't help.
- **Grover's algorithm** searches in $\sqrt N$ steps, sequentially. It halves
  key and preimage security on paper and much less in practice: AES and SHA-2
  survive.
- Breaking RSA-2048 was estimated in 2025 at under a million noisy qubits;
  today's machines have a few thousand at most. The gap is shrinking from both
  sides.
- **Harvest now, decrypt later** and Mosca's $x + y > z$ explain why key
  exchange is being replaced now.
- NIST's open process (2016 to 2024) produced ML-KEM, ML-DSA and SLH-DSA, with
  FN-DSA and HQC to follow. Deployment is **hybrid**: classical and
  post-quantum together.

**Next:** [Chapter 21](21-Lattice-Cryptography.md) opens up the lattices behind
ML-KEM and ML-DSA.

## Further reading

- Peter W. Shor, "Polynomial-Time Algorithms for Prime Factorization and
  Discrete Logarithms on a Quantum Computer", *SIAM Journal on Computing* 26
  (1997); first version at FOCS 1994.
- Lov K. Grover, "A Fast Quantum Mechanical Algorithm for Database Search",
  STOC 1996.
- Michael A. Nielsen and Isaac L. Chuang, *Quantum Computation and Quantum
  Information* (Cambridge University Press, 2000; 10th anniversary edition
  2010): the standard textbook.
- Scott Aaronson, *Quantum Computing Since Democritus* (Cambridge University
  Press, 2013): a readable tour of what quantum computers can and cannot do.
- Craig Gidney and Martin Ekerå, "How to Factor 2048 Bit RSA Integers in 8
  Hours Using 20 Million Noisy Qubits", *Quantum* 5 (2021);
  [Craig Gidney, "How to Factor 2048 Bit RSA Integers with Less than a Million Noisy Qubits" (2025)](https://arxiv.org/abs/2505.15917).
- Martin Roetteler, Michael Naehrig, Krysta Svore and Kristin Lauter, "Quantum
  Resource Estimates for Computing Elliptic Curve Discrete Logarithms",
  ASIACRYPT 2017.
- Michele Mosca, "Cybersecurity in an Era with Quantum Computers: Will We Be
  Ready?", *IEEE Security & Privacy* 16, no. 5 (2018).
- NIST IR 8105 (2016), NIST IR 8413 (round 3 report, 2022), NIST IR 8547
  (transition), and the [NIST post-quantum project](https://csrc.nist.gov/projects/post-quantum-cryptography).
- The appendix chapter [Quantum and post-quantum](../books/history/19-Hardware-Quantum-and-the-Long-View.md)
  for the full timeline.
