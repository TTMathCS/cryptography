# 21. Lattice cryptography

*Chapter 20 showed that a quantum computer would break every public-key system
built on factoring or discrete logs. This chapter builds the replacements that
NIST chose: ML-KEM for key exchange, and ML-DSA and FN-DSA for signatures. They
rest on lattices, regular grids of points in hundreds of dimensions, and on one
idea, learning with errors: linear equations made hard by a little noise. You
will solve a lattice problem by hand, encrypt with LWE using numbers small
enough to check on paper, build a working toy of ML-KEM in 60 lines, and see
how the parameters are chosen against the best known attacks.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a lattice is, why a good basis is a trapdoor and a bad one is a lock;
    - learning with errors (LWE), worked by hand with $q = 23$, and Regev's encryption built on it;
    - how rings and modules shrink keys 256-fold, and how ML-KEM is put together, with a working toy;
    - how ML-DSA signs with "Fiat-Shamir with aborts", and how FN-DSA signs with an NTRU trapdoor;
    - the best attacks on lattices and how ML-KEM's and ML-DSA's parameters are chosen.

    **You need:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) (modular arithmetic),
    [Chapter 14](14-Discrete-Log-Systems.md) (Schnorr signatures and Fiat-Shamir),
    [Chapter 17](17-Defining-Security.md) (IND-CPA and IND-CCA),
    [Chapter 20](20-Quantum-Computers.md) (why we need this). Vectors and matrices help.

    **Levels:** 21.1 to 21.6 are intermediate; 21.7 to 21.11 are intermediate to advanced; 21.12 and
    21.14 are expert.

## 21.1 The problem

We need a new trapdoor: a calculation that is easy to do, hard to undo, and easy
again with a secret, where "hard" holds against quantum computers too. Shor's
algorithm wins by finding hidden periods in a group. So the new problem should
have no group structure of that kind for it to grab.

Lattices had a long history before anyone used them for secrets. Joseph-Louis
Lagrange (1773) and Carl Friedrich Gauss (1801) studied two-dimensional
lattices through quadratic forms, and Hermann Minkowski's *Geometry of Numbers*
(1896) made them a field of mathematics. In cryptography they first appeared
as a **weapon**. Ralph Merkle and Martin Hellman's knapsack cryptosystem (1978)
was one of the first public-key schemes; in 1982 Adi Shamir broke it, and the
lattice reduction algorithm of Arjen Lenstra, Hendrik Lenstra and László
Lovász, published that same year, then broke almost every knapsack variant.

**The knapsack's short life.** Merkle and Hellman hid an easy subset-sum problem
(a "superincreasing" list, where each number is bigger than all the earlier ones
put together) behind a modular multiplication, and published the scrambled list
as the public key. It was much faster than RSA, and for a few years it looked like
a serious rival. Merkle was confident enough to offer 100 dollars to anyone who
could break it. In 1982 Shamir did, and collected; Merkle's larger prize for the
version with several layers of scrambling was claimed by Ernest Brickell a few
years later. By the end of the decade nearly every knapsack variant had fallen to
lattice reduction, and for a generation of cryptographers "lattice" meant
"attack".

!!! note "Life story: the Merkle-Hellman knapsack"
    **Born:** 1978, Ralph Merkle and Martin Hellman at Stanford · **Purpose:** fast public-key
    encryption from the subset-sum problem · **Helped:** an early alternative to RSA; its fall made lattice
    reduction a standard weapon · **Broken:** 1982 by Shamir, and its variants through the 1980s, because the
    trapdoor's structure shows up as an unusually short lattice vector · **Replaced by:** RSA at the time;
    lattices came back as a foundation only after Ajtai's 1996 proof

The turn came in 1996. Miklós Ajtai at IBM proved that some *random* lattice
problems are as hard as the *hardest* instances of a related problem, a
guarantee nothing in factoring offers. The same year Jeffrey Hoffstein, Jill
Pipher and Joseph Silverman of Brown University presented **NTRU**, a fast
lattice cryptosystem that is still standing. In 2005 Oded Regev defined
**learning with errors** and proved it as hard as worst-case lattice problems,
even for quantum computers; he received the Gödel Prize for it in 2018. Faster
structured versions followed (ring LWE in 2010, module LWE in 2015), and in 2017
the CRYSTALS team submitted Kyber and Dilithium to NIST. In August 2024 they
became FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA).

<figure class="mars-fig">
<svg viewBox="0 0 600 416" width="600" role="img" aria-label="Timeline of lattices in cryptography from 1773 to 2024">
<line x1="84" y1="12" x2="84" y2="404" stroke-width="2" stroke="currentColor" opacity="0.6"/>
<circle cx="84" cy="22" r="5" fill="currentColor"/>
<text x="70" y="27" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1773</text>
<text x="98" y="27" font-size="14" text-anchor="start" fill="currentColor">Lagrange: reducing two-dimensional lattices</text>
<circle cx="84" cy="50" r="5" fill="currentColor"/>
<text x="70" y="55" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1896</text>
<text x="98" y="55" font-size="14" text-anchor="start" fill="currentColor">Minkowski: Geometry of Numbers</text>
<circle cx="84" cy="78" r="5" fill="currentColor"/>
<text x="70" y="83" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1978</text>
<text x="98" y="83" font-size="14" text-anchor="start" fill="currentColor">Merkle and Hellman: the knapsack cryptosystem</text>
<circle cx="84" cy="106" r="5" class="acc-fill"/>
<text x="70" y="111" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">1982</text>
<text x="98" y="111" font-size="14" text-anchor="start" fill="currentColor">Shamir breaks the knapsack; LLL published</text>
<circle cx="84" cy="134" r="5" fill="currentColor"/>
<text x="70" y="139" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1994</text>
<text x="98" y="139" font-size="14" text-anchor="start" fill="currentColor">Schnorr and Euchner: BKZ</text>
<circle cx="84" cy="162" r="5" class="acc-fill"/>
<text x="70" y="167" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">1996</text>
<text x="98" y="167" font-size="14" text-anchor="start" fill="currentColor">Ajtai's worst-case guarantee; NTRU presented</text>
<circle cx="84" cy="190" r="5" fill="currentColor"/>
<text x="70" y="195" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">1997</text>
<text x="98" y="195" font-size="14" text-anchor="start" fill="currentColor">GGH: good basis, bad basis (broken 1999)</text>
<circle cx="84" cy="218" r="5" class="acc-fill"/>
<text x="70" y="223" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">2005</text>
<text x="98" y="223" font-size="14" text-anchor="start" fill="currentColor">Regev: learning with errors</text>
<circle cx="84" cy="246" r="5" fill="currentColor"/>
<text x="70" y="251" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2006</text>
<text x="98" y="251" font-size="14" text-anchor="start" fill="currentColor">Nguyen and Regev break NTRUSign</text>
<circle cx="84" cy="274" r="5" fill="currentColor"/>
<text x="70" y="279" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2010</text>
<text x="98" y="279" font-size="14" text-anchor="start" fill="currentColor">Ring LWE (Lyubashevsky, Peikert, Regev)</text>
<circle cx="84" cy="302" r="5" fill="currentColor"/>
<text x="70" y="307" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2015</text>
<text x="98" y="307" font-size="14" text-anchor="start" fill="currentColor">Module LWE (Langlois and Stehlé)</text>
<circle cx="84" cy="330" r="5" fill="currentColor"/>
<text x="70" y="335" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2017</text>
<text x="98" y="335" font-size="14" text-anchor="start" fill="currentColor">Kyber, Dilithium, Falcon submitted to NIST</text>
<circle cx="84" cy="358" r="5" fill="currentColor"/>
<text x="70" y="363" font-size="14" text-anchor="end" fill="currentColor" font-weight="bold">2022</text>
<text x="98" y="363" font-size="14" text-anchor="start" fill="currentColor">NIST selects all three</text>
<circle cx="84" cy="386" r="5" class="acc-fill"/>
<text x="70" y="391" font-size="14" text-anchor="end" class="acc-fill" font-weight="bold">2024</text>
<text x="98" y="391" font-size="14" text-anchor="start" fill="currentColor">FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA)</text>
</svg>
<figcaption>Figure 21.1. Lattices went from number theory to codebreaking tool to the foundation of the new standards. Accented dots mark the turning points.</figcaption>
</figure>

## 21.2 Lattices

*Level: intermediate.* Take two vectors $b_1, b_2$ in the plane that don't point
the same way. The **lattice** they generate is every whole-number combination:

$$
\mathcal{L} = \{\, x_1 b_1 + x_2 b_2 \;:\; x_1, x_2 \in \mathbb{Z} \,\}.
$$

It is a grid of points, perhaps slanted. The same idea works with $n$ vectors in
$n$ dimensions. The vectors $b_i$ are a **basis**, and a lattice has infinitely
many bases.

**By hand.** These two bases generate exactly the same lattice:

$$
\begin{aligned}
\text{good: } & b_1 = (1, 32),\ b_2 = (40, 1) \\
\text{bad: } & b_1' = (201, 37),\ b_2' = (1648, 297).
\end{aligned}
$$

You can check it two ways. Each bad vector is a whole-number combination of the
good ones ($(201, 37) = 1 \cdot (1, 32) + 5 \cdot (40, 1)$, and you can find the
other), and the **determinant**, the area of the parallelogram the basis spans,
is the same for both:

$$
1 \cdot 1 - 32 \cdot 40 = -1279, \qquad 201 \cdot 297 - 37 \cdot 1648 = 59697 - 60976 = -1279.
$$

Same area, same lattice. But the good basis has short vectors (lengths 32.0 and
40.0) nearly at right angles. The bad one has long vectors (204 and 1,675)
pointing almost the same way.

<figure class="mars-fig">
<svg viewBox="0 0 680 360" width="680" role="img" aria-label="The same lattice drawn twice: with a short, nearly square basis and with a long, nearly parallel basis">
<rect x="30" y="27.6" width="302.4" height="302.4" rx="2" class="soft" stroke="currentColor" stroke-width="0.8"/>
<text x="181.2" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">good basis</text>
<circle cx="52.4" cy="307.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="97.2" cy="306.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="142" cy="305.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="186.8" cy="304.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="231.6" cy="303.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="276.4" cy="302" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="321.2" cy="300.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="53.5" cy="271.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="98.3" cy="270.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="143.1" cy="269.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="187.9" cy="268.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="232.7" cy="267.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="277.5" cy="266.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="322.3" cy="265" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="54.6" cy="235.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="99.4" cy="234.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="144.2" cy="233.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="189" cy="232.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="233.8" cy="231.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="278.6" cy="230.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="323.4" cy="229.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="55.8" cy="200.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="100.6" cy="199" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="145.4" cy="197.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="190.2" cy="196.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="235" cy="195.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="279.8" cy="194.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="324.6" cy="193.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="56.9" cy="164.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="101.7" cy="163.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="146.5" cy="162" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="191.3" cy="160.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="236.1" cy="159.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="280.9" cy="158.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="325.7" cy="157.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="58" cy="128.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="102.8" cy="127.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="147.6" cy="126.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="192.4" cy="125" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="237.2" cy="123.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="282" cy="122.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="326.8" cy="121.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="59.1" cy="92.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="103.9" cy="91.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="148.7" cy="90.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="193.5" cy="89.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="238.3" cy="88.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="283.1" cy="87" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="327.9" cy="85.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="60.2" cy="56.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="105" cy="55.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="149.8" cy="54.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="194.6" cy="53.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="239.4" cy="52.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="284.2" cy="51.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="329" cy="50" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="52.4" cy="307.6" r="4" class="acc-fill"/>
<line x1="52.4" y1="307.6" x2="53.2" y2="281.8" stroke-width="2.5" class="acc"/>
<polygon points="53.5,271.8 48.7,281.6 57.7,281.9" class="acc-fill"/>
<text x="59.5" y="267.8" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">(1, 32)</text>
<line x1="52.4" y1="307.6" x2="87.2" y2="306.7" stroke-width="2.5" class="acc"/>
<polygon points="97.2,306.5 87.1,302.2 87.3,311.2" class="acc-fill"/>
<text x="93.2" y="324.5" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">(40, 1)</text>
<rect x="375" y="27.6" width="302.4" height="302.4" rx="2" class="soft" stroke="currentColor" stroke-width="0.8"/>
<text x="526.2" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">bad basis</text>
<circle cx="397.4" cy="307.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="442.2" cy="306.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="487" cy="305.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="531.8" cy="304.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="576.6" cy="303.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="621.4" cy="302" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="666.2" cy="300.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="398.5" cy="271.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="443.3" cy="270.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="488.1" cy="269.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="532.9" cy="268.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="577.7" cy="267.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="622.5" cy="266.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="667.3" cy="265" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="399.6" cy="235.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="444.4" cy="234.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="489.2" cy="233.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="534" cy="232.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="578.8" cy="231.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="623.6" cy="230.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="668.4" cy="229.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="400.8" cy="200.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="445.6" cy="199" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="490.4" cy="197.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="535.2" cy="196.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="580" cy="195.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="624.8" cy="194.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="669.6" cy="193.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="401.9" cy="164.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="446.7" cy="163.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="491.5" cy="162" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="536.3" cy="160.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="581.1" cy="159.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="625.9" cy="158.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="670.7" cy="157.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="403" cy="128.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="447.8" cy="127.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="492.6" cy="126.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="537.4" cy="125" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="582.2" cy="123.9" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="627" cy="122.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="671.8" cy="121.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="404.1" cy="92.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="448.9" cy="91.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="493.7" cy="90.3" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="538.5" cy="89.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="583.3" cy="88.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="628.1" cy="87" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="672.9" cy="85.8" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="405.2" cy="56.7" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="450" cy="55.6" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="494.8" cy="54.5" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="539.6" cy="53.4" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="584.4" cy="52.2" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="629.2" cy="51.1" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="674" cy="50" r="2.6" fill="currentColor" opacity="0.75"/>
<circle cx="397.4" cy="307.6" r="4" class="acc-fill"/>
<line x1="397.4" y1="307.6" x2="612.7" y2="268" stroke-width="2.5" class="acc"/>
<polygon points="622.5,266.2 611.9,263.5 613.5,272.4" class="acc-fill"/>
<text x="612.5" y="256.2" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">(201, 37), length 204</text>
<line x1="397.4" y1="307.6" x2="662" y2="259.9" stroke-width="2.5" class="acc"/>
<polygon points="671.8,258.1 661.2,255.5 662.8,264.4" class="acc-fill"/>
<text x="665.8" y="292.1" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">(1648, 297), length 1,675 →</text>
</svg>
<figcaption>Figure 21.2. One lattice, two bases. Left: (1, 32) and (40, 1), short and nearly at right angles. Right: (201, 37) and (1648, 297), which run off the page almost in the same direction. Both span parallelograms of area 1,279 and generate exactly the same points.</figcaption>
</figure>

## 21.3 The hard problems

*Level: intermediate.* Two questions about a lattice are the basis of everything
in this chapter.

- **Shortest vector problem (SVP):** find the shortest nonzero lattice point.
- **Closest vector problem (CVP):** given a point $t$ that is not on the lattice,
  find the lattice point nearest to it.

With a good basis CVP is easy, at least approximately: write $t$ in terms of
the basis, round the coefficients to whole numbers, and multiply back. This is
**Babai's rounding** method (1986).

**By hand.** Find the lattice point closest to $t = (100, 200)$.

With the good basis, $t = 6.177 \cdot (1, 32) + 2.346 \cdot (40, 1)$. Round to
$6$ and $2$: the point $6 \cdot (1, 32) + 2 \cdot (40, 1) = (86, 194)$, at
distance 15.2. A search over thousands of nearby points confirms it is the
closest.

With the bad basis, $t = 234.48 \cdot (201, 37) - 28.538 \cdot (1648, 297)$.
Round to $234$ and $-29$: the point $(-758, 45)$, at distance **872**. Same
lattice, same target, same method, and an answer 57 times too far away.
Because the bad vectors are long and almost parallel, a tiny rounding error in
the coefficients turns into a huge error in the plane.

<figure class="mars-fig">
<svg viewBox="0 0 680 360" width="680" role="img" aria-label="Babai rounding with the bad basis lands at (−758, 45), 872 away from the target, because the basis cell is a long thin sliver">
<circle cx="618" cy="190" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="631.7" cy="189.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="645.4" cy="189.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="659.1" cy="189" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="180.6" cy="190" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="194.3" cy="189.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="208" cy="189.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="221.7" cy="189" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="235.4" cy="188.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="249" cy="188.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="262.7" cy="187.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="276.4" cy="187.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="290.1" cy="187.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="303.8" cy="186.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="317.4" cy="186.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="331.1" cy="186.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="344.8" cy="185.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="358.5" cy="185.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="372.1" cy="185.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="385.8" cy="184.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="399.5" cy="184.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="413.2" cy="184.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="426.9" cy="183.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="440.5" cy="183.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="454.2" cy="183.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="467.9" cy="182.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="481.6" cy="182.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="495.3" cy="182.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="508.9" cy="181.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="522.6" cy="181.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="536.3" cy="181.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="550" cy="180.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="563.6" cy="180.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="577.3" cy="180.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="591" cy="179.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="604.7" cy="179.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="618.4" cy="179.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="632" cy="178.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="645.7" cy="178.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="659.4" cy="178" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="16.8" cy="183.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="30.5" cy="182.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="44.2" cy="182.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="57.9" cy="182.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="71.6" cy="181.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="85.2" cy="181.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="98.9" cy="181.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="112.6" cy="180.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="126.3" cy="180.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="139.9" cy="180.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="153.6" cy="179.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="167.3" cy="179.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="181" cy="179.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="194.7" cy="178.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="208.3" cy="178.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="222" cy="178" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="235.7" cy="177.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="249.4" cy="177.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="263.1" cy="177" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="276.7" cy="176.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="290.4" cy="176.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="304.1" cy="176" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="317.8" cy="175.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="331.5" cy="175.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="345.1" cy="175" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="358.8" cy="174.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="372.5" cy="174.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="386.2" cy="173.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="399.8" cy="173.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="413.5" cy="173.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="427.2" cy="172.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="440.9" cy="172.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="454.6" cy="172.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="468.2" cy="171.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="481.9" cy="171.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="495.6" cy="171.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="509.3" cy="170.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="523" cy="170.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="536.6" cy="170.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="550.3" cy="169.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="564" cy="169.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="577.7" cy="169.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="591.3" cy="168.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="605" cy="168.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="618.7" cy="168.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="632.4" cy="167.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="646.1" cy="167.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="659.7" cy="167.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="17.2" cy="172.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="30.9" cy="171.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="44.5" cy="171.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="58.2" cy="171.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="71.9" cy="170.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="85.6" cy="170.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="99.3" cy="170.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="112.9" cy="169.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="126.6" cy="169.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="140.3" cy="169.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="154" cy="168.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="167.6" cy="168.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="181.3" cy="168.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="195" cy="167.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="208.7" cy="167.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="222.4" cy="167.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="236" cy="166.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="249.7" cy="166.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="263.4" cy="166.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="277.1" cy="165.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="290.8" cy="165.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="304.4" cy="165" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="318.1" cy="164.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="331.8" cy="164.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="345.5" cy="164" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="359.2" cy="163.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="372.8" cy="163.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="386.5" cy="163" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="400.2" cy="162.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="413.9" cy="162.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="427.5" cy="162" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="441.2" cy="161.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="454.9" cy="161.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="468.6" cy="160.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="482.3" cy="160.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="495.9" cy="160.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="509.6" cy="159.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="523.3" cy="159.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="537" cy="159.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="550.7" cy="158.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="564.3" cy="158.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="578" cy="158.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="591.7" cy="157.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="605.4" cy="157.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="619" cy="157.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="632.7" cy="156.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="646.4" cy="156.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="660.1" cy="156.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="17.5" cy="161.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="31.2" cy="160.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="44.9" cy="160.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="58.6" cy="160.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="72.2" cy="159.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="85.9" cy="159.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="99.6" cy="159.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="113.3" cy="158.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="127" cy="158.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="140.6" cy="158.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="154.3" cy="157.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="168" cy="157.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="181.7" cy="157.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="195.3" cy="156.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="209" cy="156.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="222.7" cy="156.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="236.4" cy="155.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="250.1" cy="155.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="263.7" cy="155.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="277.4" cy="154.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="291.1" cy="154.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="304.8" cy="154.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="318.5" cy="153.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="332.1" cy="153.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="345.8" cy="153.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="359.5" cy="152.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="373.2" cy="152.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="386.8" cy="152" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="400.5" cy="151.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="414.2" cy="151.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="427.9" cy="151" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="441.6" cy="150.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="455.2" cy="150.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="468.9" cy="150" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="482.6" cy="149.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="496.3" cy="149.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="510" cy="149" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="523.6" cy="148.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="537.3" cy="148.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="551" cy="147.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="564.7" cy="147.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="578.4" cy="147.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="592" cy="146.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="605.7" cy="146.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="619.4" cy="146.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="633.1" cy="145.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="646.7" cy="145.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="660.4" cy="145.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="17.9" cy="150.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="31.5" cy="150" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="45.2" cy="149.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="58.9" cy="149.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="72.6" cy="149" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="86.3" cy="148.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="99.9" cy="148.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="113.6" cy="147.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="127.3" cy="147.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="141" cy="147.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="154.7" cy="146.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="168.3" cy="146.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="182" cy="146.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="195.7" cy="145.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="209.4" cy="145.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="223" cy="145.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="236.7" cy="144.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="250.4" cy="144.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="264.1" cy="144.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="277.8" cy="143.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="291.4" cy="143.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="305.1" cy="143.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="318.8" cy="142.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="332.5" cy="142.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="346.2" cy="142.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="359.8" cy="141.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="373.5" cy="141.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="387.2" cy="141.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="400.9" cy="140.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="414.5" cy="140.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="428.2" cy="140.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="441.9" cy="139.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="455.6" cy="139.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="469.3" cy="139" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="482.9" cy="138.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="496.6" cy="138.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="510.3" cy="138" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="524" cy="137.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="537.7" cy="137.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="551.3" cy="137" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="565" cy="136.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="578.7" cy="136.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="592.4" cy="136" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="606.1" cy="135.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="619.7" cy="135.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="633.4" cy="134.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="647.1" cy="134.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="660.8" cy="134.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="18.2" cy="139.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="31.9" cy="139" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="45.6" cy="138.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="59.2" cy="138.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="72.9" cy="138" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="86.6" cy="137.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="100.3" cy="137.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="114" cy="137" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="127.6" cy="136.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="141.3" cy="136.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="155" cy="136" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="168.7" cy="135.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="182.4" cy="135.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="196" cy="134.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="209.7" cy="134.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="223.4" cy="134.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="237.1" cy="133.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="250.7" cy="133.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="264.4" cy="133.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="278.1" cy="132.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="291.8" cy="132.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="305.5" cy="132.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="319.1" cy="131.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="332.8" cy="131.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="346.5" cy="131.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="360.2" cy="130.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="373.9" cy="130.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="387.5" cy="130.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="401.2" cy="129.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="414.9" cy="129.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="428.6" cy="129.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="442.2" cy="128.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="455.9" cy="128.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="469.6" cy="128.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="483.3" cy="127.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="497" cy="127.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="510.6" cy="127.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="524.3" cy="126.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="538" cy="126.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="551.7" cy="126.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="565.4" cy="125.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="579" cy="125.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="592.7" cy="125" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="606.4" cy="124.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="620.1" cy="124.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="633.8" cy="124" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="647.4" cy="123.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="661.1" cy="123.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="18.5" cy="128.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="32.2" cy="128.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="45.9" cy="127.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="59.6" cy="127.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="73.3" cy="127.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="86.9" cy="126.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="100.6" cy="126.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="114.3" cy="126.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="128" cy="125.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="141.7" cy="125.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="155.3" cy="125" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="169" cy="124.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="182.7" cy="124.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="196.4" cy="124" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="210.1" cy="123.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="223.7" cy="123.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="237.4" cy="123" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="251.1" cy="122.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="264.8" cy="122.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="278.4" cy="121.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="292.1" cy="121.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="305.8" cy="121.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="319.5" cy="120.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="333.2" cy="120.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="346.8" cy="120.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="360.5" cy="119.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="374.2" cy="119.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="387.9" cy="119.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="401.6" cy="118.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="415.2" cy="118.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="428.9" cy="118.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="442.6" cy="117.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="456.3" cy="117.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="469.9" cy="117.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="483.6" cy="116.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="497.3" cy="116.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="511" cy="116.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="524.7" cy="115.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="538.3" cy="115.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="552" cy="115.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="565.7" cy="114.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="579.4" cy="114.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="593.1" cy="114.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="606.7" cy="113.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="620.4" cy="113.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="634.1" cy="113.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="647.8" cy="112.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="661.5" cy="112.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="18.9" cy="117.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="32.6" cy="117.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="46.2" cy="116.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="59.9" cy="116.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="73.6" cy="116.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="87.3" cy="115.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="101" cy="115.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="114.6" cy="115.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="128.3" cy="114.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="142" cy="114.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="155.7" cy="114.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="169.4" cy="113.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="183" cy="113.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="196.7" cy="113.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="210.4" cy="112.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="224.1" cy="112.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="237.8" cy="112" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="251.4" cy="111.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="265.1" cy="111.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="278.8" cy="111" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="292.5" cy="110.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="306.1" cy="110.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="319.8" cy="110" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="333.5" cy="109.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="347.2" cy="109.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="360.9" cy="109" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="374.5" cy="108.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="388.2" cy="108.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="401.9" cy="107.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="415.6" cy="107.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="429.3" cy="107.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="442.9" cy="106.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="456.6" cy="106.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="470.3" cy="106.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="484" cy="105.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="497.6" cy="105.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="511.3" cy="105.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="525" cy="104.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="538.7" cy="104.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="552.4" cy="104.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="566" cy="103.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="579.7" cy="103.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="593.4" cy="103.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="607.1" cy="102.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="620.8" cy="102.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="634.4" cy="102.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="648.1" cy="101.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="661.8" cy="101.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="19.2" cy="106.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="32.9" cy="106.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="46.6" cy="105.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="60.3" cy="105.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="73.9" cy="105.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="87.6" cy="104.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="101.3" cy="104.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="115" cy="104.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="128.7" cy="103.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="142.3" cy="103.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="156" cy="103.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="169.7" cy="102.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="183.4" cy="102.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="197.1" cy="102.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="210.7" cy="101.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="224.4" cy="101.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="238.1" cy="101.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="251.8" cy="100.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="265.5" cy="100.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="279.1" cy="100.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="292.8" cy="99.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="306.5" cy="99.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="320.2" cy="99" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="333.8" cy="98.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="347.5" cy="98.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="361.2" cy="98" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="374.9" cy="97.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="388.6" cy="97.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="402.2" cy="97" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="415.9" cy="96.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="429.6" cy="96.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="443.3" cy="96" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="457" cy="95.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="470.6" cy="95.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="484.3" cy="94.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="498" cy="94.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="511.7" cy="94.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="525.3" cy="93.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="539" cy="93.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="552.7" cy="93.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="566.4" cy="92.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="580.1" cy="92.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="593.7" cy="92.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="607.4" cy="91.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="621.1" cy="91.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="634.8" cy="91.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="648.5" cy="90.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="662.1" cy="90.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="19.6" cy="95.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="33.3" cy="95.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="46.9" cy="94.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="60.6" cy="94.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="74.3" cy="94.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="88" cy="93.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="101.6" cy="93.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="115.3" cy="93.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="129" cy="92.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="142.7" cy="92.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="156.4" cy="92.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="170" cy="91.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="183.7" cy="91.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="197.4" cy="91.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="211.1" cy="90.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="224.8" cy="90.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="238.4" cy="90.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="252.1" cy="89.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="265.8" cy="89.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="279.5" cy="89.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="293.2" cy="88.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="306.8" cy="88.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="320.5" cy="88.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="334.2" cy="87.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="347.9" cy="87.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="361.5" cy="87.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="375.2" cy="86.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="388.9" cy="86.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="402.6" cy="86" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="416.3" cy="85.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="429.9" cy="85.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="443.6" cy="85" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="457.3" cy="84.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="471" cy="84.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="484.7" cy="84" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="498.3" cy="83.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="512" cy="83.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="525.7" cy="83" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="539.4" cy="82.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="553" cy="82.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="566.7" cy="81.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="580.4" cy="81.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="594.1" cy="81.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="607.8" cy="80.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="621.4" cy="80.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="635.1" cy="80.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="648.8" cy="79.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="662.5" cy="79.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="19.9" cy="84.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="33.6" cy="84.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="47.3" cy="84" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="61" cy="83.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="74.6" cy="83.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="88.3" cy="83" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="102" cy="82.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="115.7" cy="82.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="129.3" cy="81.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="143" cy="81.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="156.7" cy="81.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="170.4" cy="80.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="184.1" cy="80.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="197.7" cy="80.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="211.4" cy="79.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="225.1" cy="79.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="238.8" cy="79.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="252.5" cy="78.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="266.1" cy="78.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="279.8" cy="78.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="293.5" cy="77.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="307.2" cy="77.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="320.8" cy="77.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="334.5" cy="76.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="348.2" cy="76.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="361.9" cy="76.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="375.6" cy="75.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="389.2" cy="75.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="402.9" cy="75.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="416.6" cy="74.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="430.3" cy="74.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="444" cy="74.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="457.6" cy="73.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="471.3" cy="73.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="485" cy="73" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="498.7" cy="72.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="512.4" cy="72.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="526" cy="72" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="539.7" cy="71.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="553.4" cy="71.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="567.1" cy="71" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="580.7" cy="70.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="594.4" cy="70.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="608.1" cy="70" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="621.8" cy="69.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="635.5" cy="69.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="649.1" cy="68.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="662.8" cy="68.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="20.3" cy="73.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="33.9" cy="73.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="47.6" cy="73" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="61.3" cy="72.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="75" cy="72.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="88.7" cy="72" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="102.3" cy="71.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="116" cy="71.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="129.7" cy="71" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="143.4" cy="70.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="157" cy="70.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="170.7" cy="70" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="184.4" cy="69.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="198.1" cy="69.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="211.8" cy="68.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="225.4" cy="68.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="239.1" cy="68.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="252.8" cy="67.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="266.5" cy="67.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="280.2" cy="67.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="293.8" cy="66.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="307.5" cy="66.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="321.2" cy="66.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="334.9" cy="65.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="348.5" cy="65.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="362.2" cy="65.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="375.9" cy="64.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="389.6" cy="64.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="403.3" cy="64.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="416.9" cy="63.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="430.6" cy="63.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="444.3" cy="63.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="458" cy="62.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="471.7" cy="62.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="485.3" cy="62.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="499" cy="61.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="512.7" cy="61.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="526.4" cy="61.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="540.1" cy="60.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="553.7" cy="60.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="567.4" cy="60.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="581.1" cy="59.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="594.8" cy="59.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="608.4" cy="59" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="622.1" cy="58.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="635.8" cy="58.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="649.5" cy="58" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="663.2" cy="57.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="20.6" cy="62.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="34.3" cy="62.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="48" cy="62.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="61.6" cy="61.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="75.3" cy="61.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="89" cy="61.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="102.7" cy="60.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="116.4" cy="60.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="130" cy="60.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="143.7" cy="59.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="157.4" cy="59.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="171.1" cy="59" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="184.7" cy="58.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="198.4" cy="58.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="212.1" cy="58" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="225.8" cy="57.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="239.5" cy="57.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="253.1" cy="57" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="266.8" cy="56.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="280.5" cy="56.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="294.2" cy="55.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="307.9" cy="55.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="321.5" cy="55.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="335.2" cy="54.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="348.9" cy="54.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="362.6" cy="54.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="376.2" cy="53.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="389.9" cy="53.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="403.6" cy="53.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="417.3" cy="52.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="431" cy="52.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="444.6" cy="52.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="458.3" cy="51.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="472" cy="51.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="485.7" cy="51.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="499.4" cy="50.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="513" cy="50.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="526.7" cy="50.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="540.4" cy="49.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="554.1" cy="49.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="567.8" cy="49.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="581.4" cy="48.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="595.1" cy="48.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="608.8" cy="48.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="622.5" cy="47.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="636.1" cy="47.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="649.8" cy="47.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="663.5" cy="46.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="20.9" cy="51.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="34.6" cy="51.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="48.3" cy="51.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="62" cy="50.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="75.7" cy="50.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="89.3" cy="50.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="103" cy="49.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="116.7" cy="49.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="130.4" cy="49.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="144.1" cy="48.8" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="157.7" cy="48.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="171.4" cy="48.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="185.1" cy="47.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="198.8" cy="47.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="212.4" cy="47.1" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="226.1" cy="46.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="239.8" cy="46.4" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="253.5" cy="46" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="267.2" cy="45.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="280.8" cy="45.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="294.5" cy="45" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="308.2" cy="44.7" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="321.9" cy="44.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="335.6" cy="44" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="349.2" cy="43.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="362.9" cy="43.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="376.6" cy="43" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="390.3" cy="42.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="403.9" cy="42.3" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="417.6" cy="41.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="431.3" cy="41.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="445" cy="41.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="458.7" cy="40.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="472.3" cy="40.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="486" cy="40.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="499.7" cy="39.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="513.4" cy="39.5" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="21.3" cy="40.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="35" cy="40.6" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="48.6" cy="40.2" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="62.3" cy="39.9" r="1.4" fill="currentColor" opacity="0.3"/>
<circle cx="76" cy="39.5" r="1.4" fill="currentColor" opacity="0.3"/>
<polygon points="31.2,160.9 99.9,148.3 663.5,46.7 594.8,59.4" stroke-width="1.5" class="acc soft-acc" fill="none"/>
<circle cx="324.6" cy="107.9" r="6" fill="none" class="acc" stroke-width="2.5" fill="none"/>
<line x1="324.6" y1="100.9" x2="324.6" y2="22" stroke-width="1" stroke="currentColor" opacity="0.7"/>
<text x="324.6" y="16" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">target t = (100, 200)</text>
<circle cx="319.8" cy="110" r="4.5" fill="currentColor"/>
<line x1="319.8" y1="115" x2="470" y2="262" stroke-width="1" stroke="currentColor" opacity="0.7"/>
<text x="470" y="278" font-size="13" text-anchor="middle" fill="currentColor">(86, 194): good basis, 15.2 away</text>
<circle cx="31.2" cy="160.9" r="6" class="acc-fill"/>
<line x1="31.2" y1="166.9" x2="130" y2="262" stroke-width="1" stroke="currentColor" opacity="0.7"/>
<text x="130" y="278" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">(−758, 45): bad basis, 872 away</text>
<text x="340" y="315" font-size="13" text-anchor="middle" class="acc-fill">accented line: the bad basis cell that contains t,</text>
<text x="340" y="333" font-size="13" text-anchor="middle" class="acc-fill">a parallelogram 0.76 units wide and 1,675 long</text>
</svg>
<figcaption>Figure 21.3. Why the bad basis fails. Babai's method rounds t to a corner of the basis cell it lies in. The good basis's cells are 32 by 40 squares, so a corner is close. The bad basis's cell (the accented line) has the same area but is a sliver less than a unit wide and 1,675 long, so its nearest corner can be 872 away.</figcaption>
</figure>

That asymmetry is the trapdoor. **The private key is a good basis; the public
key is a bad basis of the same lattice.** In two dimensions anyone can turn a
bad basis into a good one (next section). In 500 or 1,000 dimensions nobody
knows how, on any computer.

## 21.4 Lattice reduction: turning bad bases into good

*Level: intermediate.* In two dimensions, Lagrange and Gauss's method is a kind
of Euclid's algorithm for vectors: subtract the right multiple of the shorter
vector from the longer, swap, repeat.

```python
def reduce2(u, v):                      # Lagrange-Gauss reduction of a 2-D lattice basis
    dot = lambda a, b: a[0] * b[0] + a[1] * b[1]
    if dot(u, u) > dot(v, v):
        u, v = v, u
    while True:
        k = round(dot(u, v) / dot(u, u))
        v = (v[0] - k * u[0], v[1] - k * u[1])
        if dot(v, v) >= dot(u, u):
            return u, v
        u, v = v, u

print(reduce2((201, 37), (1648, 297)))
```

Output:

```
((1, 32), (40, 1))
```

Two steps do it: $(1648, 297) - 8 \cdot (201, 37) = (40, 1)$, then
$(201, 37) - 5 \cdot (40, 1) = (1, 32)$. The trapdoor in two dimensions lasts
two subtractions.

<figure class="mars-fig">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="Lagrange-Gauss reduction in two steps turns the bad basis into the good one">
<line x1="30" y1="180" x2="39.2" y2="178.3" stroke-width="2.5" stroke="currentColor"/>
<polygon points="48,176.7 38.4,174.3 39.9,182.3" fill="currentColor"/>
<line x1="30" y1="180" x2="168.8" y2="155" stroke-width="2.5" stroke="currentColor"/>
<polygon points="177.6,153.4 168,151 169.5,159" fill="currentColor"/>
<text x="110" y="30" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">start</text>
<text x="110" y="210" font-size="12" text-anchor="middle" fill="currentColor">(201, 37), (1648, 297)</text>
<text x="110" y="228" font-size="12" text-anchor="middle" fill="currentColor">lengths 204 and 1,675</text>
<line x1="198" y1="120" x2="222" y2="120" stroke-width="1.5" stroke="currentColor"/>
<polygon points="230,120 222,116.4 222,123.6" fill="currentColor"/>
<line x1="250" y1="180" x2="388.7" y2="154.5" stroke-width="2.5" stroke="currentColor"/>
<polygon points="397.5,152.8 387.9,150.5 389.4,158.5" fill="currentColor"/>
<line x1="250" y1="180" x2="270.4" y2="179.5" stroke-width="2.5" class="acc"/>
<polygon points="279.4,179.3 270.3,175.4 270.5,183.5" class="acc-fill"/>
<text x="330" y="30" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">step 1</text>
<text x="330" y="210" font-size="12" text-anchor="middle" fill="currentColor">(201, 37), (40, 1)</text>
<text x="330" y="228" font-size="12" text-anchor="middle" fill="currentColor">lengths 204 and 40</text>
<text x="330" y="48" font-size="12" text-anchor="middle" class="acc-fill">(1648, 297) − 8·(201, 37)</text>
<line x1="418" y1="120" x2="442" y2="120" stroke-width="1.5" stroke="currentColor"/>
<polygon points="450,120 442,116.4 442,123.6" fill="currentColor"/>
<line x1="470" y1="180" x2="473.5" y2="69" stroke-width="2.5" class="acc"/>
<polygon points="473.7,60 469.4,68.9 477.5,69.2" class="acc-fill"/>
<line x1="470" y1="180" x2="611" y2="176.5" stroke-width="2.5" class="acc"/>
<polygon points="620,176.3 610.9,172.4 611.1,180.5" class="acc-fill"/>
<text x="550" y="30" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">step 2</text>
<text x="550" y="210" font-size="12" text-anchor="middle" fill="currentColor">(1, 32), (40, 1)</text>
<text x="550" y="228" font-size="12" text-anchor="middle" fill="currentColor">lengths 32 and 40</text>
<text x="550" y="48" font-size="12" text-anchor="middle" class="acc-fill">(201, 37) − 5·(40, 1)</text>
</svg>
<figcaption>Figure 21.4. The two subtractions of the program above, drawn to scale in each panel. Each step replaces the longer vector by its difference with a multiple of the shorter one, like Euclid's algorithm, until both are short and nearly perpendicular.</figcaption>
</figure>

In 1982 Lenstra, Lenstra and Lovász gave **LLL**, which does this in any
dimension in polynomial time, but only promises a vector within a factor of
about $2^{n/2}$ of the shortest. In practice it does better, about $1.02^n$,
which is enough to break knapsacks and many badly designed schemes, but useless
against a well-chosen lattice in dimension 500. Claus-Peter Schnorr and M.
Euchner's **BKZ** (1994) trades time for quality: it solves exact SVP in
blocks of $\beta$ dimensions at a time, sliding along the basis. Bigger blocks
give shorter vectors at a cost that grows exponentially in $\beta$. Every
serious attack on the schemes in this chapter is BKZ with a large block size,
and their parameters are set so the needed $\beta$ is out of reach (section 21.12).

**A tool made for something else.** LLL was not invented to break anything. Hendrik
Lenstra needed short lattice vectors for a problem in integer programming; László
Lovász found a way to reduce a basis in polynomial time; and Arjen Lenstra,
Hendrik's brother, used it in their joint 1982 paper to factor polynomials with
rational coefficients. Cryptographers noticed at once that it broke knapsacks.
Since then it has become the most used tool in public-key cryptanalysis: it
recovers RSA keys when part of the key is known (Coppersmith's method, 1996),
ECDSA and DSA keys from slightly biased nonces, and broken parameters of nearly
every lattice scheme. BKZ is its stronger descendant.

!!! note "Life story: LLL lattice reduction"
    **Born:** 1982, Arjen Lenstra, Hendrik Lenstra and László Lovász · **Purpose:** factoring
    polynomials with rational coefficients · **Helped:** broke the knapsacks; powers Coppersmith's attacks on
    RSA and the biased-nonce attacks on (EC)DSA; the first step of every lattice attack · **Status:** current;
    BKZ (1994) and lattice sieving (2016) are what set today's parameters

## 21.5 Learning with errors, by hand

*Level: intermediate.* Here is the problem ML-KEM and ML-DSA rest on. Pick a
secret vector $s$ with entries mod $q$. You are given many random vectors $a_i$
and the numbers

$$
b_i = \langle a_i, s \rangle + e_i \bmod q,
$$

where each **error** $e_i$ is small, say $-1$, $0$ or $1$. Find $s$.

**By hand, with $q = 23$ and a secret of two numbers, $s = (3, 15)$.** Six
samples:

| $i$ | $a_i$ | $\langle a_i, s \rangle \bmod 23$ | $e_i$ | $b_i$ |
|---|---|---|---|---|
| 1 | (4, 9) | $12 + 135 = 147 \equiv 9$ | $+1$ | 10 |
| 2 | (13, 2) | $39 + 30 = 69 \equiv 0$ | $-1$ | 22 |
| 3 | (7, 20) | $21 + 300 = 321 \equiv 22$ | 0 | 22 |
| 4 | (18, 11) | $54 + 165 = 219 \equiv 12$ | $+1$ | 13 |
| 5 | (10, 5) | $30 + 75 = 105 \equiv 13$ | $-1$ | 12 |
| 6 | (2, 16) | $6 + 240 = 246 \equiv 16$ | $+1$ | 17 |

The public sees only the columns $a_i$ and $b_i$.

**Without errors it is school algebra.** Two equations, two unknowns: solve the
first two rows by elimination (mod 23) and you get $s = (3, 15)$ at once.

**With errors, elimination lies.** Solve rows 1 and 2 as if they were exact and
you get $s = (1, 16)$. It fits those two rows perfectly, and it is wrong. Test
it on the others: the leftovers $b_i - \langle a_i, (1, 16) \rangle$ are
$-6, 3, -9, -11$, not small. The true secret leaves $1, -1, 0, 1, -1, 1$.
Every time elimination combines equations it adds their errors, and after a few
steps the accumulated error is as large as $q$: noise.

<figure class="mars-fig">
<svg viewBox="0 0 600 300" width="600" role="img" aria-label="Leftovers b minus a·s for the six samples, for the true secret and for the wrong answer from elimination">
<text x="160" y="24" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">true secret (3, 15)</text>
<line x1="40" y1="120" x2="290" y2="120" stroke-width="1" stroke="currentColor"/>
<rect x="40" y="111" width="250" height="18" rx="0" class="soft-acc"/>
<rect x="55" y="112.5" width="22" height="7.5" fill="currentColor" fill-opacity="0.45"/>
<text x="66" y="106.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="66" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 1</text>
<rect x="95" y="120" width="22" height="7.5" fill="currentColor" fill-opacity="0.45"/>
<text x="106" y="143.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">−1</text>
<text x="106" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 2</text>
<rect x="135" y="120" width="22" height="1.5" fill="currentColor" fill-opacity="0.45"/>
<text x="146" y="114" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<text x="146" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 3</text>
<rect x="175" y="112.5" width="22" height="7.5" fill="currentColor" fill-opacity="0.45"/>
<text x="186" y="106.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="186" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 4</text>
<rect x="215" y="120" width="22" height="7.5" fill="currentColor" fill-opacity="0.45"/>
<text x="226" y="143.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">−1</text>
<text x="226" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 5</text>
<rect x="255" y="112.5" width="22" height="7.5" fill="currentColor" fill-opacity="0.45"/>
<text x="266" y="106.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="266" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 6</text>
<text x="450" y="24" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">elimination's (1, 16)</text>
<line x1="330" y1="120" x2="580" y2="120" stroke-width="1" stroke="currentColor"/>
<rect x="330" y="111" width="250" height="18" rx="0" class="soft-acc"/>
<rect x="345" y="120" width="22" height="1.5" fill="currentColor" fill-opacity="0.45"/>
<text x="356" y="114" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<text x="356" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 1</text>
<rect x="385" y="120" width="22" height="1.5" fill="currentColor" fill-opacity="0.45"/>
<text x="396" y="114" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<text x="396" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 2</text>
<rect x="425" y="120" width="22" height="45" class="acc-fill"/>
<text x="436" y="181" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">−6</text>
<text x="436" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 3</text>
<rect x="465" y="97.5" width="22" height="22.5" class="acc-fill"/>
<text x="476" y="91.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<text x="476" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 4</text>
<rect x="505" y="120" width="22" height="67.5" class="acc-fill"/>
<text x="516" y="203.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">−9</text>
<text x="516" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 5</text>
<rect x="545" y="120" width="22" height="82.5" class="acc-fill"/>
<text x="556" y="218.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">−11</text>
<text x="556" y="270" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.7">row 6</text>
<text x="300" y="294" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.8">shaded band: allowed errors −1, 0, +1</text>
</svg>
<figcaption>Figure 21.5. The test that tells the true secret from a fake. With (3, 15) every leftover b − ⟨a, s⟩ is −1, 0 or +1. Elimination's answer (1, 16) fits rows 1 and 2 exactly, but leaves −6, 3, −9 and −11 on the others: noise as big as q itself.</figcaption>
</figure>

**What works at this size is brute force.** Try all $23^2 = 529$ candidates and
keep those that leave every leftover in $\{-1, 0, 1\}$. With all six samples
only $(3, 15)$ survives; with the first three, two candidates do. At real size
the secret has 768 coefficients (ML-KEM-768), each between $-2$ and $2$, so
there are $5^{768} \approx 2^{1783}$ candidates. The best attacks do far better
than brute force, by turning the problem into a closest-vector problem in a
lattice, but still need about $2^{180}$ operations for those parameters.

<figure class="mars-fig">
<svg viewBox="0 0 420 460" width="420" role="img" aria-label="All 529 candidate secrets mod 23; 2 survive three samples and only (3, 15) survives six">
<circle cx="60" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="60" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="138" r="3.2" fill="currentColor" opacity="0.85"/>
<circle cx="74.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="74.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="89" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="152.5" r="6.5" class="acc-fill"/>
<circle cx="103.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="103.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="118" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="132.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="283" r="3.2" fill="currentColor" opacity="0.85"/>
<circle cx="147" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="147" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="161.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="176" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="225" r="3.2" fill="currentColor" opacity="0.85"/>
<circle cx="190.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="190.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="205" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="239.5" r="3.2" fill="currentColor" opacity="0.85"/>
<circle cx="219.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="219.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="234" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="248.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="370" r="3.2" fill="currentColor" opacity="0.85"/>
<circle cx="263" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="263" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="277.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="292" cy="51" r="6" fill="none" class="acc" stroke-width="2.5" fill="none"/>
<circle cx="306.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="306.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="321" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="326.5" r="3.2" fill="currentColor" opacity="0.85"/>
<circle cx="335.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="335.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="350" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="123.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="364.5" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="370" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="355.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="341" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="326.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="312" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="297.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="283" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="268.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="254" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="239.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="225" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="210.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="196" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="181.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="167" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="152.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="138" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="123.5" r="3.2" fill="currentColor" opacity="0.85"/>
<circle cx="379" cy="109" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="94.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="80" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="65.5" r="1.5" fill="currentColor" opacity="0.35"/>
<circle cx="379" cy="51" r="1.5" fill="currentColor" opacity="0.35"/>
<text x="60" y="388" font-size="11" text-anchor="middle" fill="currentColor">0</text>
<text x="50" y="374" font-size="11" text-anchor="end" fill="currentColor">0</text>
<text x="132.5" y="388" font-size="11" text-anchor="middle" fill="currentColor">5</text>
<text x="50" y="301.5" font-size="11" text-anchor="end" fill="currentColor">5</text>
<text x="205" y="388" font-size="11" text-anchor="middle" fill="currentColor">10</text>
<text x="50" y="229" font-size="11" text-anchor="end" fill="currentColor">10</text>
<text x="277.5" y="388" font-size="11" text-anchor="middle" fill="currentColor">15</text>
<text x="50" y="156.5" font-size="11" text-anchor="end" fill="currentColor">15</text>
<text x="350" y="388" font-size="11" text-anchor="middle" fill="currentColor">20</text>
<text x="50" y="84" font-size="11" text-anchor="end" fill="currentColor">20</text>
<text x="379" y="388" font-size="11" text-anchor="middle" fill="currentColor">22</text>
<text x="50" y="55" font-size="11" text-anchor="end" fill="currentColor">22</text>
<text x="219.5" y="406" font-size="12" text-anchor="middle" fill="currentColor">first coordinate of the candidate</text>
<text x="115.5" y="142.5" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">(3, 15)</text>
<text x="302" y="65" font-size="13" text-anchor="start" fill="currentColor">(16, 22)</text>
<text x="30" y="440" font-size="12" text-anchor="start" fill="currentColor">faint: fails sample 1 or 2 · dot: fits 2 (9) · ring: fits 3 · filled: all 6</text>
<text x="30" y="190.5" font-size="11" text-anchor="middle" fill="currentColor" opacity="0.8">second</text>
</svg>
<figcaption>Figure 21.6. Brute force on the toy LWE problem. Of the 529 candidates, 9 fit the first two samples with small errors, 2 fit the first three (rings), and only the true secret (3, 15) fits all six (filled). At real size there are about 2¹⁷⁸³ candidates.</figcaption>
</figure>

Why is it a lattice problem? The vectors $(\langle a_1, x \rangle, \ldots,
\langle a_m, x \rangle) \bmod q$ for all $x$ form a lattice, and $b$ is a point
just off it, displaced by the small error $e$. Finding $s$ means finding the
lattice point closest to $b$: CVP with a bad basis.

## 21.6 Encrypting with LWE

*Level: intermediate.* Regev's 2005 encryption follows straight from the
problem. To see every step, shrink it to single numbers. This toy is not
secure; it shows why noise does not stop decryption. Work mod $q = 3329$, the
modulus of ML-KEM.

<div class="mars-steps" markdown>

1. Bob picks a public random $a = 1234$, a small secret $s = 2$ and a small error $e = 1$. He publishes $t = a s + e = 2469$.
2. Alice wants to send the bit 1. She picks small random $r = 3$, $e_1 = -1$, $e_2 = 1$.
3. She sends $u = a r + e_1 = 3702 - 1 \equiv 372 \pmod{3329}$.
4. She sends $v = t r + e_2 + 1665 \cdot \text{bit} = 7407 + 1 + 1665 \equiv 2415$. The 1665, about $q/2$, carries the bit.
5. Bob computes $w = v - s u = 2415 - 744 = 1671$.
6. 1671 is 6 away from 1665 and far from 0, so the bit is 1.

</div>

**Why it works.** Expand: $v - s u = (as + e) r + e_2 + 1665 \cdot \text{bit} - s(ar + e_1) =
1665 \cdot \text{bit} + (e r + e_2 - s e_1)$. The $a s r$ terms cancel exactly, and
what's left is the bit times $q/2$ plus $1 \cdot 3 + 1 - 2 \cdot (-1) = 6$.
Every secret and error is small, so their products are small, and the noise
stays far below $q/4 \approx 832$. To anyone without $s$, $u$ and $v$ look like
random numbers mod 3329.

<figure class="mars-fig">
<svg viewBox="0 0 560 340" width="560" role="img" aria-label="The numbers mod 3329 as a wheel: values near 0 decode as bit 0, values near 1665 as bit 1">
<path d="M 45.0 169.9 A 125 125 0 0 1 295.0 169.9" stroke-width="22" fill="none" stroke="currentColor" opacity="0.18"/>
<path d="M 295.0 169.9 A 125 125 0 1 1 45.0 169.9" stroke-width="22" fill="none" class="acc" opacity="0.45"/>
<circle cx="170" cy="170" r="125" fill="none" stroke="currentColor" stroke-width="1"/>
<circle cx="170" cy="45" r="3" fill="currentColor"/>
<text x="170" y="27" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<circle cx="295" cy="169.9" r="3" fill="currentColor"/>
<text x="321" y="173.9" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">832</text>
<circle cx="169.9" cy="295" r="3" fill="currentColor"/>
<text x="169.9" y="331" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">1665 ≈ q/2</text>
<circle cx="45" cy="169.9" r="3" fill="currentColor"/>
<text x="15" y="173.9" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">2497</text>
<circle cx="171.4" cy="45" r="7" fill="currentColor"/>
<line x1="231.4" y1="85" x2="185.1" y2="54.4" stroke-width="1.5" stroke="currentColor"/>
<polygon points="178.4,50 183.1,57.4 187.1,51.4" fill="currentColor"/>
<text x="235.4" y="97" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">w = 6 → bit 0</text>
<circle cx="168.5" cy="295" r="7" class="acc-fill"/>
<line x1="238.5" y1="265" x2="183.8" y2="288.8" stroke-width="1.5" class="acc"/>
<polygon points="176.5,292 185.2,292.1 182.4,285.5" class="acc-fill"/>
<text x="242.5" y="261" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">w = 1671 → bit 1</text>
<text x="370" y="120" font-size="13" text-anchor="start" fill="currentColor">gray arc: decode 0</text>
<text x="370" y="140" font-size="13" text-anchor="start" fill="currentColor">accent arc: decode 1</text>
<text x="370" y="175" font-size="13" text-anchor="start" fill="currentColor">noise moved each value</text>
<text x="370" y="193" font-size="13" text-anchor="start" fill="currentColor">only 6 steps; it would</text>
<text x="370" y="211" font-size="13" text-anchor="start" fill="currentColor">need 832 to flip a bit</text>
</svg>
<figcaption>Figure 21.7. Decryption in Regev-style encryption, with ML-KEM's modulus 3329. The bit is encoded as 0 or about q/2, and the noise only nudges it around the wheel. In the worked example Bob gets 1671 for the bit 1 and 6 for the bit 0 (exercise 4): both 6 steps from home.</figcaption>
</figure>

In Regev's actual scheme the numbers are vectors: the public key is a random
matrix $A$ and $b = As + e$, and to encrypt Alice adds up a random subset of the
rows. Here it is with $n = 10$, $q = 97$ and 20 rows:

```python
import random

n, q, m = 10, 97, 20                    # toy sizes; ML-KEM works with 256 coefficients per polynomial, q = 3329

def keygen():
    s = [random.randrange(q) for _ in range(n)]
    A = [[random.randrange(q) for _ in range(n)] for _ in range(m)]
    b = [(sum(a * x for a, x in zip(row, s)) + random.choice([-1, 0, 1])) % q for row in A]
    return s, (A, b)                    # private s; public A and b = A s + e

def enc(pub, bit):
    A, b = pub
    S = [i for i in range(m) if random.random() < 0.5]       # a random subset of the rows
    u = [sum(A[i][j] for i in S) % q for j in range(n)]
    v = (sum(b[i] for i in S) + bit * (q // 2)) % q
    return u, v

def dec(s, c):
    u, v = c
    d = (v - sum(a * x for a, x in zip(u, s))) % q           # bit * 48 plus a small error
    return 1 if q // 4 < d < 3 * q // 4 else 0

s, pub = keygen()
bits = [random.randrange(2) for _ in range(1000)]
print(all(dec(s, enc(pub, x)) == x for x in bits))
```

Output:

```
True
```

Decryption leaves the bit times 48 plus the sum of at most 20 errors of size 1,
so at most 20 away, less than $q/4 \approx 24$. It can never cross the line.
(The toy uses `random`; real keys need `secrets`. At these sizes it is breakable
in a moment anyway.)

**Why it is secure.** Regev showed that if LWE is hard, $(A, b)$ looks
uniformly random. Then a random subset sum of random-looking rows looks random
too, so $(u, v)$ hides the bit. This is **IND-CPA** security
([Chapter 17](17-Defining-Security.md)).

**Regev's problem.** Oded Regev, then at Tel Aviv University, presented learning
with errors at the STOC conference in 2005. Learning theorists had long studied
a binary version, "learning parity with noise", as a problem that seemed hard.
Regev's contribution was a proof, with an unusual quantum step in it, that
solving LWE on random instances would solve worst-case lattice problems, plus an
encryption scheme simple enough to fit in a paragraph. LWE turned out to be the
most flexible hard problem cryptography has found: within six years it gave
identity-based encryption, fully homomorphic encryption
([Chapter 23](23-Advanced-Protocols.md)) and, through its ring and module forms,
the schemes in this chapter. Regev received the Gödel Prize for it in 2018.

!!! note "Life story: learning with errors"
    **Born:** 2005, Oded Regev · **Purpose:** an encryption problem with a worst-case hardness
    guarantee that also holds against quantum computers · **Helped:** the basis of ML-KEM and ML-DSA (as module
    LWE), FrodoKEM and modern homomorphic encryption · **Status:** current; the most widely relied-on
    post-quantum assumption

## 21.7 Rings and modules: small and fast

*Level: intermediate to advanced.* Regev's scheme is slow and its keys are huge:
a full $m \times n$ matrix per key. The practical schemes replace numbers with
**polynomials** in the ring

$$
R_q = \mathbb{Z}_q[x] / (x^n + 1).
$$

Elements are polynomials with $n$ coefficients mod $q$. You multiply as usual,
then replace $x^n$ by $-1$ wherever it appears. The ring is called
**negacyclic**: multiplying by $x$ shifts the coefficients up one place, and the
top one wraps around to the bottom with its sign flipped.

<figure class="mars-fig">
<svg viewBox="0 0 660 200" width="660" role="img" aria-label="Multiplying a polynomial by x in Z_17[x]/(x^4+1) shifts the coefficients up and wraps the top one to the bottom with its sign flipped">
<text x="20" y="56" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">a</text>
<rect x="200" y="30" width="70" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="235" y="56" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="235" y="24" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">1</text>
<rect x="290" y="30" width="70" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="56" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<text x="325" y="24" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">x</text>
<rect x="380" y="30" width="70" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="415" y="56" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<text x="415" y="24" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">x²</text>
<rect x="470" y="30" width="70" height="40" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="505" y="56" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">4</text>
<text x="505" y="24" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">x³</text>
<text x="20" y="156" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">a · x</text>
<rect x="200" y="130" width="70" height="40" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="235" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">−4 ≡ 13</text>
<text x="235" y="124" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">1</text>
<rect x="290" y="130" width="70" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<text x="325" y="124" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">x</text>
<rect x="380" y="130" width="70" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="415" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<text x="415" y="124" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">x²</text>
<rect x="470" y="130" width="70" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<text x="505" y="124" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.75">x³</text>
<line x1="235" y1="72" x2="308.4" y2="121.5" stroke-width="1.5" stroke="currentColor"/>
<polygon points="315,126 310.4,118.5 306.4,124.5" fill="currentColor"/>
<line x1="325" y1="72" x2="398.4" y2="121.5" stroke-width="1.5" stroke="currentColor"/>
<polygon points="405,126 400.4,118.5 396.4,124.5" fill="currentColor"/>
<line x1="415" y1="72" x2="488.4" y2="121.5" stroke-width="1.5" stroke="currentColor"/>
<polygon points="495,126 490.4,118.5 486.4,124.5" fill="currentColor"/>
<path d="M 540 30 C 540 4, 178 4, 178 60 L 178 132" stroke-width="2" fill="none" class="acc"/>
<line x1="178" y1="132" x2="191.8" y2="143" stroke-width="1.5" class="acc"/>
<polygon points="198,148 194,140.2 189.5,145.8" class="acc-fill"/>
<text x="586" y="55" font-size="13" text-anchor="start" class="acc-fill" font-weight="bold">x⁴ = −1</text>
</svg>
<figcaption>Figure 21.8. Negacyclic multiplication by x, with the chapter's example a = 1 + 2x + 3x² + 4x³ mod 17. Every coefficient moves up one place; the top one wraps around to the bottom and changes sign, because x⁴ = −1. So 4 becomes −4 ≡ 13.</figcaption>
</figure>

**By hand, with $n = 4$ and $q = 17$.** Take $a = 1 + 2x + 3x^2 + 4x^3$.

$$
a \cdot x = x + 2x^2 + 3x^3 + 4x^4 = -4 + x + 2x^2 + 3x^3 \equiv 13 + x + 2x^2 + 3x^3 .
$$

And $a \cdot (2 + x^3)$: $2a = 2 + 4x + 6x^2 + 8x^3$, while
$a \cdot x^3 = x^3 + 2x^4 + 3x^5 + 4x^6 = x^3 - 2 - 3x - 4x^2$. Adding gives
$0 + x + 2x^2 + 9x^3$.

Multiplying by a fixed $a$ is a linear map, so it is a $4 \times 4$ matrix,
each column the previous one shifted with a sign flip:

$$
\begin{pmatrix} 1 & -4 & -3 & -2 \\ 2 & 1 & -4 & -3 \\ 3 & 2 & 1 & -4 \\ 4 & 3 & 2 & 1 \end{pmatrix}.
$$

So **one polynomial stands for a whole structured matrix**. With $n = 256$, a
public key that was a $256 \times 256$ matrix of numbers becomes a single
polynomial: 256 numbers instead of 65,536. That is **ring LWE** (Lyubashevsky,
Peikert and Regev, 2010).

**Modules** sit in between. ML-KEM uses a small $k \times k$ matrix whose entries
are polynomials in $R_q$ with $n = 256$, and secrets that are vectors of $k$
small polynomials. This is **module LWE** (Langlois and Stehlé, 2015). Raising
$k$ from 2 to 3 to 4 raises the lattice dimension from 512 to 768 to 1,024 and
gives the three security levels, while the arithmetic underneath, polynomials of
degree 256 mod 3329, stays the same. Keeping $k$ small also keeps less algebraic
structure than a single huge ring would, which is part of why the designers
chose modules.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="ML-KEM&#x27;s public matrix for k = 2, 3, 4: a k by k grid of polynomials of 256 coefficients each">
<rect x="30" y="70" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="43.5" y="89" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="60" y="70" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="73.5" y="89" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="30" y="100" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="43.5" y="119" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="60" y="100" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="73.5" y="119" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<text x="60" y="190" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">ML-KEM-512</text>
<text x="60" y="208" font-size="12" text-anchor="middle" fill="currentColor">k = 2: dimension 512</text>
<rect x="180" y="55" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="193.5" y="74" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="210" y="55" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="223.5" y="74" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="240" y="55" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="253.5" y="74" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="180" y="85" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="193.5" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="210" y="85" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="223.5" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="240" y="85" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="253.5" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="180" y="115" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="193.5" y="134" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="210" y="115" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="223.5" y="134" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="240" y="115" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="253.5" y="134" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<text x="225" y="190" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">ML-KEM-768</text>
<text x="225" y="208" font-size="12" text-anchor="middle" fill="currentColor">k = 3: dimension 768</text>
<rect x="360" y="40" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="373.5" y="59" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="390" y="40" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="403.5" y="59" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="420" y="40" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="433.5" y="59" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="450" y="40" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="463.5" y="59" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="360" y="70" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="373.5" y="89" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="390" y="70" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="403.5" y="89" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="420" y="70" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="433.5" y="89" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="450" y="70" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="463.5" y="89" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="360" y="100" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="373.5" y="119" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="390" y="100" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="403.5" y="119" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="420" y="100" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="433.5" y="119" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="450" y="100" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="463.5" y="119" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="360" y="130" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="373.5" y="149" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="390" y="130" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="403.5" y="149" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="420" y="130" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="433.5" y="149" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<rect x="450" y="130" width="27" height="27" rx="2" class="soft-acc" stroke="currentColor" stroke-width="1"/>
<text x="463.5" y="149" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" opacity="0.8">f</text>
<text x="420" y="190" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">ML-KEM-1024</text>
<text x="420" y="208" font-size="12" text-anchor="middle" fill="currentColor">k = 4: dimension 1024</text>
<text x="620" y="80" font-size="12" text-anchor="end" fill="currentColor">each square is one</text>
<text x="620" y="96" font-size="12" text-anchor="end" fill="currentColor">polynomial: 256</text>
<text x="620" y="112" font-size="12" text-anchor="end" fill="currentColor">numbers mod 3329</text>
</svg>
<figcaption>Figure 21.9. Module LWE in pictures. The matrix A is k × k, but each entry is a whole polynomial in Z₃₃₂₉[x]/(x²⁵⁶ + 1), which stands for a 256 × 256 negacyclic block. Raising k from 2 to 4 raises the lattice dimension from 512 to 1,024 with the same arithmetic underneath.</figcaption>
</figure>

**Fast multiplication.** Multiplying two polynomials the schoolbook way costs
$n^2$ products. ML-KEM's modulus was picked so a faster way works:
$3329 = 13 \cdot 256 + 1$, so mod 3329 there is a 256th root of unity, $\zeta = 17$
($17^{128} \equiv -1$ and $17^{256} \equiv 1 \pmod{3329}$). That makes the
**number-theoretic transform** possible: a Fourier transform with whole numbers
mod $q$, which turns one polynomial product into 128 tiny ones, about
$n \log n$ work.

## 21.8 ML-KEM

*Level: intermediate to advanced.* ML-KEM (FIPS 203) is the module version of
section 21.6, plus three engineering steps.

**The core encryption (K-PKE).** Everything is polynomials in $R_{3329}$ with
$n = 256$; bold letters are vectors or matrices of them.

$$
\begin{aligned}
\text{Key:}\quad & \mathbf{A} \text{ random } k \times k,\quad \mathbf{s}, \mathbf{e} \text{ small},\quad \mathbf{t} = \mathbf{A}\mathbf{s} + \mathbf{e} \\
\text{Encrypt } m:\quad & \mathbf{r}, \mathbf{e}_1, e_2 \text{ small},\quad \mathbf{u} = \mathbf{A}^\mathsf{T}\mathbf{r} + \mathbf{e}_1,\quad v = \mathbf{t}^\mathsf{T}\mathbf{r} + e_2 + 1665 \cdot m \\
\text{Decrypt:}\quad & v - \mathbf{s}^\mathsf{T}\mathbf{u} = 1665 \cdot m + (\mathbf{e}^\mathsf{T}\mathbf{r} + e_2 - \mathbf{s}^\mathsf{T}\mathbf{e}_1)
\end{aligned}
$$

The message $m$ is 256 bits, one per coefficient of $v$. "Small" means
coefficients from $-2$ to $2$ (or $-3$ to $3$ for the key in ML-KEM-512),
drawn from a **centered binomial distribution**: add two coin flips, subtract
two others. It is cheap to sample in constant time.

**Code it.** This is that core with ML-KEM-768's sizes ($k = 3$) but without
the compression and the fast transform:

```python
import hashlib, random, secrets

n, q, k = 256, 3329, 3                  # ML-KEM-768's ring and rank; no compression, no NTT

def mul(a, b):                          # multiply in Z_q[x]/(x^256 + 1): x^256 wraps around to -1
    c = [0] * n
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            if i + j < n: c[i + j] += ai * bj
            else: c[i + j - n] -= ai * bj
    return [x % q for x in c]

def add(*ps): return [sum(cs) % q for cs in zip(*ps)]
def dot(u, v): return add(*[mul(a, b) for a, b in zip(u, v)])
def ones(x): return bin(x).count("1")
def small(rng): return [ones(rng.getrandbits(2)) - ones(rng.getrandbits(2)) for _ in range(n)]   # -2..2

def keygen(rng):
    A = [[[rng.randrange(q) for _ in range(n)] for _ in range(k)] for _ in range(k)]
    s = [small(rng) for _ in range(k)]
    t = [add(dot(row, s), small(rng)) for row in A]                                 # t = A s + e
    return (A, t), s

def encrypt(pk, m, rng):                # m is a list of 256 bits; rng supplies r, e1, e2
    A, t = pk
    r = [small(rng) for _ in range(k)]
    u = [add(dot([A[i][j] for i in range(k)], r), small(rng)) for j in range(k)]   # A^T r + e1
    v = add(dot(t, r), small(rng), [b * 1665 for b in m])                           # t.r + e2 + bit * q/2
    return u, v

def decrypt(s, c):
    u, v = c
    w = add(v, [-x for x in dot(s, u)]) # bit * 1665 plus small noise
    return [int(832 < x < 2497) for x in w], w

rng = random.Random(2024)               # fixed seed so the run repeats; real keys need secrets
pk, sk = keygen(rng)
m = [rng.getrandbits(1) for _ in range(n)]
got, w = decrypt(sk, encrypt(pk, m, rng))
noise = [(x - b * 1665 + q // 2) % q - q // 2 for x, b in zip(w, m)]
print(got == m, max(map(abs, noise)))
```

Output:

```
True 143
```

All 256 bits come back, and the largest noise in any coefficient is 143,
far below the 832 that would flip a bit.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Histogram of the 256 noise values in the toy ML-KEM run, all within ±143, against the decryption limit of ±832">
<rect x="324.4" y="73.3" width="5.1" height="116.7" class="acc-fill"/>
<rect x="330" y="50" width="5.1" height="140" class="acc-fill"/>
<rect x="335.6" y="123.6" width="5.1" height="66.4" class="acc-fill"/>
<rect x="346.7" y="182.8" width="5.1" height="7.2" class="acc-fill"/>
<rect x="318.8" y="111" width="5.1" height="79" class="acc-fill"/>
<rect x="313.3" y="163.1" width="5.1" height="26.9" class="acc-fill"/>
<rect x="341.2" y="172.1" width="5.1" height="17.9" class="acc-fill"/>
<rect x="302.1" y="188.2" width="5.1" height="1.8" class="acc-fill"/>
<rect x="352.3" y="186.4" width="5.1" height="3.6" class="acc-fill"/>
<line x1="40" y1="190" x2="620" y2="190" stroke-width="1.2" stroke="currentColor"/>
<line x1="40" y1="190" x2="40" y2="195" stroke-width="1" stroke="currentColor"/>
<text x="40" y="210" font-size="12" text-anchor="middle" fill="currentColor">−1,664</text>
<line x1="185" y1="190" x2="185" y2="195" stroke-width="1" stroke="currentColor"/>
<text x="185" y="210" font-size="12" text-anchor="middle" fill="currentColor">−832</text>
<line x1="330" y1="190" x2="330" y2="195" stroke-width="1" stroke="currentColor"/>
<text x="330" y="210" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<line x1="475" y1="190" x2="475" y2="195" stroke-width="1" stroke="currentColor"/>
<text x="475" y="210" font-size="12" text-anchor="middle" fill="currentColor">832</text>
<line x1="620" y1="190" x2="620" y2="195" stroke-width="1" stroke="currentColor"/>
<text x="620" y="210" font-size="12" text-anchor="middle" fill="currentColor">1,664</text>
<line x1="185" y1="30" x2="185" y2="190" stroke-width="1.5" stroke="currentColor" stroke-dasharray="5 4"/>
<line x1="475" y1="30" x2="475" y2="190" stroke-width="1.5" stroke="currentColor" stroke-dasharray="5 4"/>
<text x="179" y="44" font-size="12" text-anchor="end" fill="currentColor">a bit flips past here</text>
<text x="481" y="44" font-size="12" text-anchor="start" fill="currentColor">and past here</text>
<text x="330" y="30" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">all 256 values: −143 to 132</text>
<text x="330" y="240" font-size="12" text-anchor="middle" fill="currentColor" opacity="0.8">noise in each coefficient after decryption (toy ML-KEM-768, seed 2024)</text>
</svg>
<figcaption>Figure 21.10. The safety margin in the toy ML-KEM run above. After decryption each of the 256 coefficients carries noise; here all of it lies between −143 and 132, while a bit would only flip beyond ±832. The real scheme's rounding adds noise, and FIPS 203 puts the failure chance at 2⁻¹⁶⁵ for ML-KEM-768.</figcaption>
</figure>

**Engineering step 1: the matrix from a seed.** $\mathbf{A}$ is $k^2 \cdot 256$
random numbers. ML-KEM doesn't send it; it sends a 32-byte seed and both sides
expand it with SHAKE128. That also means nobody chose $\mathbf{A}$ with a
hidden structure.

**Engineering step 2: compression.** The low bits of $\mathbf{t}$'s and the
ciphertext's coefficients are mostly noise anyway, so ML-KEM rounds them off:
$\mathbf{u}$ keeps 10 bits per coefficient and $v$ keeps 4 (for ML-KEM-768).
The rounding adds a little more noise, which the parameters allow for. Now the
sizes follow by arithmetic. A public key is $k$ polynomials of 256 coefficients
at 12 bits each, plus the 32-byte seed:
$3 \cdot 256 \cdot 12 / 8 + 32 = 1{,}184$ bytes. A ciphertext is
$3 \cdot 256 \cdot 10/8 + 256 \cdot 4/8 = 960 + 128 = 1{,}088$ bytes.

**Engineering step 3: the Fujisaki-Okamoto transform.** K-PKE is only IND-CPA.
An attacker who can send modified ciphertexts and watch whether decryption
"works" can learn the secret bit by bit; that is exactly the kind of
chosen-ciphertext attack [Chapter 17](17-Defining-Security.md) defines. The fix
(Fujisaki and Okamoto, 1999; adapted to KEMs by Hofheinz, Hövelmanns and Kiltz,
2017) makes encryption deterministic from a hash of the message, and makes the
receiver **re-encrypt** what it decrypted and compare:

```python
def G(*xs):                             # one hash gives the key and the encryption's coins
    d = hashlib.sha3_512(repr(xs).encode()).digest()
    return d[:32], d[32:]

def bits(m): return [m[i // 8] >> i % 8 & 1 for i in range(256)]

def encaps(pk):
    m = secrets.token_bytes(32)
    key, coins = G(m, pk)
    return key, encrypt(pk, bits(m), random.Random(coins))   # encryption made deterministic by the coins

def decaps(pk, s, z, c):
    got, _ = decrypt(s, c)
    m = bytes(sum(b << j for j, b in enumerate(got[i:i + 8])) for i in range(0, 256, 8))
    key, coins = G(m, pk)
    if encrypt(pk, got, random.Random(coins)) == c:          # re-encrypt and compare
        return key
    return G(z, c)[0]                                        # wrong ciphertext: a random-looking key

pk, s = keygen(random.Random(secrets.randbits(128)))
z = secrets.token_bytes(32)
key, c = encaps(pk)
print(decaps(pk, s, z, c) == key)
u, v = c
bad = (u, [v[0] + 1] + v[1:])                                # nudge one coefficient
print(decaps(pk, s, z, bad) == key, decrypt(s, bad)[0] == decrypt(s, c)[0])
```

Added to the end of the program above, it prints two more lines:

```
True
False True
```

The last line is the point. Nudging one coefficient still decrypts to the same
message (the noise absorbs it), so plain K-PKE would accept the tampered
ciphertext and give the attacker a signal. The re-encryption doesn't match, so
`decaps` returns a key derived from the secret $z$ instead: random-looking, and
the same whether the tampering was detected early or late. This "implicit
rejection" gives the attacker nothing to measure. ML-KEM also hashes the public
key into $G$, and must compare in constant time.

<figure class="mars-fig">
<svg viewBox="0 0 660 240" width="660" role="img" aria-label="The Fujisaki-Okamoto decapsulation: decrypt, re-derive the coins, re-encrypt and compare">
<rect x="10" y="40" width="110" height="56" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="65" y="72.2" font-size="12" text-anchor="middle" fill="currentColor">ciphertext c</text>
<rect x="140" y="40" width="120" height="56" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="200" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">decrypt with s:</text>
<text x="200" y="80.2" font-size="12" text-anchor="middle" fill="currentColor">m′</text>
<line x1="122" y1="68" x2="130" y2="68" stroke-width="1.5" stroke="currentColor"/>
<polygon points="138,68 130,64.4 130,71.6" fill="currentColor"/>
<rect x="275" y="40" width="120" height="56" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="335" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">G(m′, H(ek)):</text>
<text x="335" y="80.2" font-size="12" text-anchor="middle" fill="currentColor">K′ and coins r′</text>
<line x1="257" y1="68" x2="265" y2="68" stroke-width="1.5" stroke="currentColor"/>
<polygon points="273,68 265,64.4 265,71.6" fill="currentColor"/>
<rect x="420" y="40" width="120" height="56" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="480" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">re-encrypt m′</text>
<text x="480" y="80.2" font-size="12" text-anchor="middle" fill="currentColor">with r′ → c′</text>
<line x1="402" y1="68" x2="410" y2="68" stroke-width="1.5" stroke="currentColor"/>
<polygon points="418,68 410,64.4 410,71.6" fill="currentColor"/>
<line x1="480" y1="98" x2="480" y2="122" stroke-width="1.5" stroke="currentColor"/>
<polygon points="480,130 483.6,122 476.4,122" fill="currentColor"/>
<rect x="420" y="132" width="120" height="40" rx="4" stroke-width="2" class="acc soft-acc"/>
<text x="480" y="156.6" font-size="13" text-anchor="middle" fill="currentColor">c′ = c ?</text>
<line x1="540" y1="140" x2="592.8" y2="115.4" stroke-width="1.5" class="acc"/>
<polygon points="600,112 591.2,112.1 594.3,118.6" class="acc-fill"/>
<text x="612" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">yes:</text>
<text x="612" y="120" font-size="14" text-anchor="middle" class="acc-fill" font-weight="bold">K′</text>
<line x1="540" y1="164" x2="592.9" y2="192.2" stroke-width="1.5" stroke="currentColor"/>
<polygon points="600,196 594.6,189.1 591.2,195.4" fill="currentColor"/>
<text x="612" y="196" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">no:</text>
<text x="612" y="214" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">J(z, c)</text>
<text x="210" y="160" font-size="12" text-anchor="middle" fill="currentColor">a tampered c decrypts to the same m′</text>
<text x="210" y="178" font-size="12" text-anchor="middle" fill="currentColor">but re-encrypts to a different c′,</text>
<text x="210" y="196" font-size="12" text-anchor="middle" fill="currentColor">so it gets a random-looking key</text>
</svg>
<figcaption>Figure 21.11. Implicit rejection. The receiver never says "invalid": a ciphertext that doesn't re-encrypt to itself gets a key derived from the secret z, which looks just as random as the real one. That is what turns the IND-CPA core into an IND-CCA KEM.</figcaption>
</figure>

**The real thing.** A recent `cryptography` package (version 50 was used here)
includes ML-KEM and ML-DSA:

```python
# pip install cryptography
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.mldsa import MLDSA65PrivateKey
from cryptography.hazmat.primitives.asymmetric.mlkem import MLKEM768PrivateKey

kem = MLKEM768PrivateKey.generate()
secret, ct = kem.public_key().encapsulate()
print(len(kem.public_key().public_bytes_raw()), len(ct), kem.decapsulate(ct) == secret)

key = MLDSA65PrivateKey.generate()
sig = key.sign(b"release v2.1")
print(len(key.public_key().public_bytes_raw()), len(sig), key.sign(b"release v2.1") == sig)
key.public_key().verify(sig, b"release v2.1")          # returns quietly when valid
try:
    key.public_key().verify(sig, b"release v2.2")
except InvalidSignature:
    print("forgery rejected")
```

Output:

```
1184 1088 True
1952 3309 False
forgery rejected
```

The 1,184 and 1,088 bytes match the arithmetic above. The `False` on the
second line is not an error: ML-DSA signing mixes in fresh randomness by
default, so two signatures of the same message differ (section 21.9).

| Parameter set | $k$ | Security category | Public key | Ciphertext | Failure chance |
|---|---|---|---|---|---|
| ML-KEM-512 | 2 | 1 (like AES-128) | 800 B | 768 B | $2^{-139}$ |
| ML-KEM-768 | 3 | 3 (like AES-192) | 1,184 B | 1,088 B | $2^{-165}$ |
| ML-KEM-1024 | 4 | 5 (like AES-256) | 1,568 B | 1,568 B | $2^{-175}$ |

The shared secret is always 32 bytes. The **failure chance** is the probability
that the noise crosses $q/4$ and decryption gives the wrong message; FIPS 203
puts it far below anything that will ever happen. Full details:
[ML-KEM reference](../01-key-exchange/ML-KEM.md).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="ML-KEM message flow: key generation, encapsulation and decapsulation, with ML-KEM-768 sizes">
<rect x="45" y="10" width="150" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="31" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Alice (sender)</text>
<rect x="445" y="10" width="150" height="32" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="31" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Bob (receiver)</text>
<line x1="120" y1="42" x2="120" y2="160" stroke-width="1" stroke="currentColor" stroke-dasharray="4 4"/>
<line x1="120" y1="204" x2="120" y2="290" stroke-width="1" stroke="currentColor" stroke-dasharray="4 4"/>
<line x1="520" y1="42" x2="520" y2="55" stroke-width="1" stroke="currentColor" stroke-dasharray="4 4"/>
<line x1="520" y1="99" x2="520" y2="250" stroke-width="1" stroke="currentColor" stroke-dasharray="4 4"/>
<rect x="420" y="55" width="200" height="44" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="73.2" font-size="12" text-anchor="middle" fill="currentColor">KeyGen: s, e small</text>
<text x="520" y="89.2" font-size="12" text-anchor="middle" fill="currentColor">t = As + e</text>
<line x1="420" y1="125" x2="128" y2="125" stroke-width="2" stroke="currentColor"/>
<polygon points="120,125 128,128.6 128,121.4" fill="currentColor"/>
<text x="320" y="118" font-size="13" text-anchor="middle" fill="currentColor">encapsulation key: seed + t</text>
<text x="320" y="142" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1,184 bytes</text>
<rect x="20" y="160" width="200" height="44" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="178.2" font-size="12" text-anchor="middle" fill="currentColor">Encaps: pick m</text>
<text x="120" y="194.2" font-size="12" text-anchor="middle" fill="currentColor">(K, coins) = G(m, H(ek))</text>
<line x1="220" y1="225" x2="512" y2="225" stroke-width="2" class="acc"/>
<polygon points="520,225 512,221.4 512,228.6" class="acc-fill"/>
<text x="320" y="218" font-size="13" text-anchor="middle" fill="currentColor">ciphertext (u, v)</text>
<text x="320" y="242" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1,088 bytes</text>
<rect x="420" y="250" width="200" height="40" rx="4" class="soft" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="274.2" font-size="12" text-anchor="middle" fill="currentColor">Decaps: decrypt, re-encrypt, K</text>
<text x="112" y="226" font-size="12" text-anchor="end" class="acc-fill" font-weight="bold">keeps K (32 B)</text>
</svg>
<figcaption>Figure 21.12. One ML-KEM-768 exchange. Bob publishes 1,184 bytes once; Alice answers with 1,088 bytes; both end with the same 32-byte key K. In TLS this sits inside the hybrid of Chapter 20.</figcaption>
</figure>

**Where ML-KEM came from.** Kyber and Dilithium came from one team, CRYSTALS
("Cryptographic Suite for Algebraic Lattices"), whose members included Joppe Bos,
Léo Ducas, Eike Kiltz, Vadim Lyubashevsky, Peter Schwabe and Damien Stehlé. They
named the two schemes after fictional crystals: kyber crystals power the
lightsabers of *Star Wars*, dilithium crystals the starships of *Star Trek*.
Kyber was posted in 2017, submitted to NIST that November, and tuned through
three rounds. In July 2022 it was the only key-encapsulation scheme NIST
selected; in August 2024 it became FIPS 203 under the descriptive name ML-KEM,
with small changes such as the domain separation in the key generation. Within
a year it was protecting a large share of the world's web traffic.

!!! note "Life story: Kyber / ML-KEM"
    **Born:** 2017, the CRYSTALS team · **Purpose:** a fast, compact key encapsulation from
    module LWE · **Helped:** Signal's PQXDH (2023), Apple's PQ3 (2024), X25519MLKEM768 in Chrome, Firefox and
    Cloudflare, OpenSSH 10's default · **Status:** current; FIPS 203 (2024), the main post-quantum key exchange,
    with HQC as its backup

## 21.9 ML-DSA: Fiat-Shamir with aborts

*Level: intermediate to advanced.* Recall Schnorr's signature from
[Chapter 14](14-Discrete-Log-Systems.md): commit to a random $k$, get a challenge
$c$ from a hash, answer $z = k + c x$. The random $k$ hides the secret $x$
perfectly because everything is mod the group order. ML-DSA (FIPS 204, from
Dilithium) does the same with lattices, and runs into one new problem.

**The scheme in outline.** Work in $R_q$ with $q = 8{,}380{,}417 = 2^{23} - 2^{13} + 1$
and $n = 256$.

- **Key:** a public matrix $\mathbf{A}$ (from a seed), small secrets
  $\mathbf{s}_1, \mathbf{s}_2$, public $\mathbf{t} = \mathbf{A}\mathbf{s}_1 + \mathbf{s}_2$.
- **Sign:** pick a random mask $\mathbf{y}$ with coefficients below $\gamma_1$;
  compute $\mathbf{w} = \mathbf{A}\mathbf{y}$ and keep only its high bits
  $\mathbf{w}_1$. Hash the message with $\mathbf{w}_1$ into a sparse challenge
  $c$ (a polynomial with a few dozen coefficients $\pm 1$). Answer
  $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$.
- **Verify:** compute $\mathbf{A}\mathbf{z} - c\,\mathbf{t} = \mathbf{A}\mathbf{y} - c\,\mathbf{s}_2$.
  That differs from $\mathbf{w}$ only by the small $c\,\mathbf{s}_2$, so its high
  bits are $\mathbf{w}_1$ again. Rehash and compare $c$; check $\mathbf{z}$ is short.

**By hand, with single numbers mod 97.** Public $a = 33$, small secrets
$s_1 = 2$, $s_2 = 1$, so $t = 33 \cdot 2 + 1 = 67$. To sign: mask $y = 20$,
$w = 33 \cdot 20 = 660 \equiv 78 \pmod{97}$; its "high bits" (the tens digit) are 7.
Say the hash of 7 and the message gives $c = 1$. Then $z = 20 + 1 \cdot 2 = 22$.
To verify: $33 \cdot 22 - 1 \cdot 67 = 659 \equiv 77$, high bits 7. It matches,
even though $77 \ne 78$: the rounding to high bits hides the small $s_2$.

**The new problem: the answer leaks.** In Schnorr, $z$ is uniform mod $q$
whatever $x$ is. Here $\mathbf{z}$ must be *short*, or verification can't
distinguish it from a forgery, so $\mathbf{y}$ can't be uniform over everything,
and $\mathbf{z} = \mathbf{y} + c\,\mathbf{s}_1$ is shifted toward $c\,\mathbf{s}_1$. Collect
enough signatures and the shift gives away the secret. Vadim Lyubashevsky's fix
(2009, 2012) is **rejection sampling**: if any coefficient of $\mathbf{z}$ falls
outside a slightly smaller range, throw the attempt away and start again with a
new $\mathbf{y}$. What survives is uniform on that range, independent of the
secret. This simulation shows one coefficient, with $y$ from $-20$ to $20$ and a
secret $s = \pm 2$:

```python
import random

rng = random.Random(7)                  # fixed seed so the run repeats
gamma, beta = 20, 2                     # mask range, and the largest c*s can be

def respond(s, reject):                 # one coefficient of z = y + c*s, with the challenge c = 1
    while True:
        z = rng.randint(-gamma, gamma) + s
        if not reject or abs(z) <= gamma - beta:
            return z

for reject in (False, True):
    for s in (2, -2):
        zs = [respond(s, reject) for _ in range(100000)]
        print("reject" if reject else "keep all", s, min(zs), max(zs), round(sum(zs) / len(zs)))
```

Output:

```
keep all 2 -18 22 2
keep all -2 -22 18 -2
reject 2 -18 18 0
reject -2 -18 18 0
```

Without rejection, the range and the average of $z$ both reveal $s$: a single
$z = 22$ proves $s = 2$. With rejection, both secrets give the same
distribution. Here 37 of 41 attempts survive. In ML-DSA all coefficients must
pass at once, so a signature takes about 4 tries on average (4.25, 5.1 and 3.85
for the three sizes).

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Distribution of z = y + s for s = 2 and s = −2, without and with rejection sampling">
<text x="140" y="48" font-size="13" text-anchor="end" fill="currentColor">keep all, s = 2</text>
<rect x="203.9" y="34" width="362.3" height="20" fill="currentColor" fill-opacity="0.35"/>
<rect x="566.1" y="34" width="39.2" height="20" class="acc-fill"/>
<text x="140" y="96" font-size="13" text-anchor="end" fill="currentColor">keep all, s = −2</text>
<rect x="203.9" y="82" width="362.3" height="20" fill="currentColor" fill-opacity="0.35"/>
<rect x="164.7" y="82" width="39.2" height="20" class="acc-fill"/>
<text x="140" y="156" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">reject, s = 2</text>
<rect x="203.9" y="142" width="362.3" height="20" fill="currentColor" fill-opacity="0.35"/>
<text x="140" y="204" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">reject, s = −2</text>
<rect x="203.9" y="190" width="362.3" height="20" fill="currentColor" fill-opacity="0.35"/>
<line x1="150" y1="236" x2="620" y2="236" stroke-width="1" stroke="currentColor"/>
<line x1="169.6" y1="236" x2="169.6" y2="241" stroke-width="1" stroke="currentColor"/>
<text x="169.6" y="256" font-size="12" text-anchor="middle" fill="currentColor">−22</text>
<line x1="208.8" y1="236" x2="208.8" y2="241" stroke-width="1" stroke="currentColor"/>
<text x="208.8" y="256" font-size="12" text-anchor="middle" fill="currentColor">−18</text>
<line x1="385" y1="236" x2="385" y2="241" stroke-width="1" stroke="currentColor"/>
<text x="385" y="256" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<line x1="561.2" y1="236" x2="561.2" y2="241" stroke-width="1" stroke="currentColor"/>
<text x="561.2" y="256" font-size="12" text-anchor="middle" fill="currentColor">18</text>
<line x1="600.4" y1="236" x2="600.4" y2="241" stroke-width="1" stroke="currentColor"/>
<text x="600.4" y="256" font-size="12" text-anchor="middle" fill="currentColor">22</text>
<text x="582.8" y="22" font-size="12" text-anchor="middle" class="acc-fill" font-weight="bold">giveaway</text>
<line x1="10" y1="132" x2="620" y2="132" stroke-width="0.6" stroke="currentColor" stroke-dasharray="3 3" opacity="0.35"/>
</svg>
<figcaption>Figure 21.13. Rejection sampling in one coefficient, from the simulation above. Without it, z ranges over −18 to 22 when s = 2 and −22 to 18 when s = −2, so any z in the accented tails gives the secret away. Keeping only |z| ≤ 18 makes both cases the same uniform band.</figcaption>
</figure>

**Randomness.** By default ML-DSA is **hedged**: the mask comes from a hash of
the key, the message and fresh random bytes. A broken random generator then
can't leak the key the way it does with ECDSA's nonce (Chapter 14), and two
signatures of the same message differ, as the output above showed.

| Parameter set | $(k, l)$ | Category | Public key | Signature |
|---|---|---|---|---|
| ML-DSA-44 | (4, 4) | 2 | 1,312 B | 2,420 B |
| ML-DSA-65 | (6, 5) | 3 | 1,952 B | 3,309 B |
| ML-DSA-87 | (8, 7) | 5 | 2,592 B | 4,627 B |

Compare Ed25519's 32-byte key and 64-byte signature. Security rests on module
LWE (recovering the key) and on **module SIS**, the short integer solution
problem (finding short $\mathbf{z}$ that satisfy the equations without the key,
which is forging). Full details: [ML-DSA reference](../02-signatures/ML-DSA.md).

**The signature's story.** Lyubashevsky introduced "Fiat-Shamir with aborts" in
2009, while working on lattice identification schemes, and refined it in 2012.
The idea of throwing away an answer that might leak, and simply trying again,
sounded wasteful, but it made lattice signatures as simple as Schnorr's.
Dilithium (2017) packaged it with module LWE, uniform sampling that is easy to
make constant-time, and the high-bits trick. NIST chose it in 2022 as its
primary signature, and FIPS 204 named it ML-DSA in 2024. NSA's CNSA 2.0 asks for
ML-DSA-87 in national security systems.

!!! note "Life story: Dilithium / ML-DSA"
    **Born:** 2017 (rejection sampling from 2009 to 2012), the CRYSTALS team · **Purpose:** a
    general-purpose post-quantum signature that is easy to implement safely · **Helped:** NIST's primary
    signature since 2022; HSMs, code signing, composite certificates · **Status:** current; FIPS 204 (2024)

## 21.10 NTRU and FN-DSA

*Level: intermediate to advanced.* NTRU is the other branch of lattice
cryptography, older than LWE and built differently: the trapdoor is a pair of
short polynomials, and there is no separate error term. Hoffstein, Pipher and
Silverman presented it at the CRYPTO '96 rump session and published it in 1998.
It was patented until 2017, which kept it out of many products.

**NTRU encryption by hand** (their textbook example). Work with polynomials of
7 coefficients mod $x^7 - 1$, a small modulus $p = 3$ and a big one $q = 41$.
Coefficients are listed from $x^0$ up.

| Step | Value |
|---|---|
| Secret $f$ (small, invertible) | $[-1, 0, 1, 1, -1, 0, 1]$ |
| Secret $g$ (small) | $[0, -1, -1, 0, 1, 0, 1]$ |
| $f^{-1} \bmod 41$ | $[37, 2, 40, 21, 31, 26, 8]$ |
| $f^{-1} \bmod 3$ | $[1, 1, 1, 1, 0, -1, 1]$ |
| Public $h = 3 \cdot f^{-1} \cdot g \bmod 41$ | $[8, 37, 24, 32, 6, 38, 19]$ |
| Message $m$, random small $r$ | $m = [1, 0, 0, -1, 1, 0, -1]$, $r = [-1, 1, 0, 0, 0, -1, 1]$ |
| Ciphertext $e = r \cdot h + m \bmod 41$ | $[25, 4, 39, 0, 5, 20, 30]$ |
| Bob: $a = f \cdot e \bmod 41$, centered | $[4, -2, -4, 4, -8, 4, 2]$ |
| Bob: $f^{-1} \cdot a \bmod 3$ | $[1, 0, 0, -1, 1, 0, -1] = m$ |

**Why it works.** $f \cdot e = 3 \cdot r \cdot g + f \cdot m$, since
$f \cdot h = 3g$. Both terms on the right have small coefficients, so the true
integer result is below $q/2$ in size and reducing mod 41 changes nothing.
Reducing mod 3 then kills $3 r g$, and multiplying by $f^{-1} \bmod 3$ leaves
$m$. The secret $(f, g)$ is an unusually short vector in the lattice of pairs
$(x, y)$ with $y \equiv x h \pmod q$; finding it from $h$ is a shortest-vector
problem. **Streamlined NTRU Prime**, the version OpenSSH used as its first
post-quantum default, uses the same idea in the ring $\mathbb{Z}_{4591}[x]/(x^{761} - x - 1)$,
chosen to have as little extra structure as possible
([NTRU Prime reference](../01-key-exchange/NTRU-Prime.md)).

**NTRU's story.** NTRU came from three mathematicians in Brown University's
mathematics department: Jeffrey Hoffstein, Jill Pipher and Joseph Silverman. They
presented it at the CRYPTO '96 rump session, published it in 1998, and founded a
company, NTRU Cryptosystems, to sell it. The name is usually read as "Nth degree
truncated polynomial ring". It was standardized as IEEE 1363.1 in 2008, but the
patents kept it out of most open-source software until they were released in
2017. NTRU itself was a NIST finalist and was not chosen; its descendants did
better. NTRU-HRSS ran in Google and Cloudflare's 2019 experiment, Streamlined NTRU
Prime was OpenSSH's first post-quantum default, and the NTRU lattice is the one
Falcon signs with. It has stood for almost thirty years.

!!! note "Life story: NTRU"
    **Born:** 1996, Jeffrey Hoffstein, Jill Pipher and Joseph Silverman (Brown University) ·
    **Purpose:** fast public-key encryption from polynomial rings · **Helped:** the first practical lattice
    scheme; NTRU Prime in OpenSSH 9.0 (2022); the lattice inside FN-DSA · **Status:** unbroken; not chosen by
    NIST, but alive through NTRU Prime and Falcon

**FN-DSA (Falcon): hash and sign.** Falcon, submitted in 2017 by a team of ten
including Thomas Pornin and Thomas Prest and selected by NIST in 2022, signs the
way RSA does: hash the message to a target, then use the trapdoor to find a
**short** solution. It follows Gentry, Peikert and Vaikuntanathan (2008), over
an NTRU lattice with $q = 12{,}289$ and $n = 512$ or 1,024. The public key is
$h = g/f$; a signature is a short pair $(s_1, s_2)$ with
$s_1 + s_2 h \equiv c \pmod q$, where $c$ is the hash of a salt and the message.

**By hand, mod 97.** With $h = 40$ and $c = 55$, anyone can pick an $s_2$ and
solve for $s_1$: $s_2 = 30$ gives $s_1 = 19$ (size $19^2 + 30^2 = 1{,}261$),
$s_2 = 4$ gives $s_1 = -8$ (size 80), and $s_2 = -1$ gives $s_1 = -2$ (size 5,
the shortest). Check: $-2 + (-1) \cdot 40 = -42 \equiv 55$. Every $s_2$ satisfies
the equation; only the holder of the short basis can find a *short* pair when
there are $12{,}289^{512}$ candidates. The verifier checks the equation and
the length.

<figure class="mars-fig">
<svg viewBox="0 0 420 420" width="420" role="img" aria-label="Solutions (s1, s2) of s1 + 40 s2 ≡ 55 mod 97 in a window around the origin; the shortest is (−2, −1)">
<line x1="15" y1="210" x2="405" y2="210" stroke-width="1" stroke="currentColor" opacity="0.5"/>
<line x1="210" y1="15" x2="210" y2="405" stroke-width="1" stroke="currentColor" opacity="0.5"/>
<circle cx="210" cy="210" r="14.1" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35"/>
<circle cx="210" cy="210" r="56.3" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35"/>
<circle cx="21" cy="273" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="27.3" cy="380.1" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="46.2" cy="90.3" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="52.5" cy="197.4" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="58.8" cy="304.5" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="84" cy="121.8" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="90.3" cy="228.9" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="96.6" cy="336" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="115.5" cy="46.2" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="121.8" cy="153.3" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="128.1" cy="260.4" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="134.4" cy="367.5" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="153.3" cy="77.7" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="159.6" cy="184.8" r="5" fill="currentColor"/>
<circle cx="165.9" cy="291.9" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="172.2" cy="399" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="191.1" cy="109.2" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="197.4" cy="216.3" r="5" class="acc-fill"/>
<circle cx="203.7" cy="323.4" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="222.6" cy="33.6" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="228.9" cy="140.7" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="235.2" cy="247.8" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="241.5" cy="354.9" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="260.4" cy="65.1" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="266.7" cy="172.2" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="273" cy="279.3" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="279.3" cy="386.4" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="298.2" cy="96.6" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="304.5" cy="203.7" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="310.8" cy="310.8" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="329.7" cy="21" r="5" fill="currentColor"/>
<circle cx="336" cy="128.1" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="342.3" cy="235.2" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="348.6" cy="342.3" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="367.5" cy="52.5" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="373.8" cy="159.6" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="380.1" cy="266.7" r="3" fill="currentColor" opacity="0.6"/>
<circle cx="386.4" cy="373.8" r="3" fill="currentColor" opacity="0.6"/>
<text x="187.4" y="236.3" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">(−2, −1): size 5</text>
<text x="151.6" y="176.8" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">(−8, 4): 80</text>
<text x="321.7" y="25" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">(19, 30): 1,261</text>
<text x="399" y="204" font-size="14" text-anchor="end" fill="currentColor" font-style="italic">s₁</text>
<text x="202" y="29" font-size="14" text-anchor="end" fill="currentColor" font-style="italic">s₂</text>
</svg>
<figcaption>Figure 21.14. Falcon's job in miniature. Every dot satisfies s₁ + 40·s₂ ≡ 55 (mod 97), so every dot passes the equation check; together they form a shifted lattice. The verifier also demands a short one, and only the trapdoor holder can find dots like (−2, −1) near the center when the lattice has 1,024 dimensions.</figcaption>
</figure>

**Why Falcon is hard to implement.** The short pair must be drawn from a
discrete Gaussian distribution, or each signature leaks a little of the secret
basis. That is exactly how **NTRUSign** (2003) was broken: Phong Nguyen and
Oded Regev showed in 2006 that a few hundred signatures reveal the shape of the
secret basis ("learning a parallelepiped"). Falcon's "fast Fourier sampler"
gets the distribution right, but it runs on floating-point numbers, which are
hard to make constant-time and differ subtly between processors.

| Parameter set | Category | Public key | Signature |
|---|---|---|---|
| FN-DSA-512 (Falcon-512) | 1 | 897 B | 666 B |
| FN-DSA-1024 (Falcon-1024) | 5 | 1,793 B | 1,280 B |

Falcon's signatures are a quarter of ML-DSA's, which matters for certificate
chains. Its standard, FIPS 206, was still in preparation when this chapter was
written. Full details: [FN-DSA reference](../02-signatures/FN-DSA.md).

<figure class="mars-fig">
<svg viewBox="0 0 640 370" width="640" role="img" aria-label="Public key and signature or ciphertext sizes in bytes, log scale, for classical and lattice schemes">
<line x1="150" y1="20" x2="150" y2="325" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="150" y="342" font-size="12" text-anchor="middle" fill="currentColor">10</text>
<line x1="300" y1="20" x2="300" y2="325" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="300" y="342" font-size="12" text-anchor="middle" fill="currentColor">100</text>
<line x1="450" y1="20" x2="450" y2="325" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="450" y="342" font-size="12" text-anchor="middle" fill="currentColor">1,000</text>
<line x1="600" y1="20" x2="600" y2="325" stroke-width="0.6" stroke="currentColor" opacity="0.3"/>
<text x="600" y="342" font-size="12" text-anchor="middle" fill="currentColor">10,000</text>
<text x="140" y="44" font-size="13" text-anchor="end" fill="currentColor">X25519</text>
<rect x="150" y="26" width="75.8" height="14" fill="currentColor" fill-opacity="0.4"/>
<text x="230.8" y="37" font-size="11" text-anchor="start" fill="currentColor">32</text>
<rect x="150" y="43" width="75.8" height="14" class="acc-fill"/>
<text x="230.8" y="54" font-size="11" text-anchor="start" fill="currentColor" font-weight="bold">32</text>
<text x="140" y="87" font-size="13" text-anchor="end" fill="currentColor">Ed25519</text>
<rect x="150" y="69" width="75.8" height="14" fill="currentColor" fill-opacity="0.4"/>
<text x="230.8" y="80" font-size="11" text-anchor="start" fill="currentColor">32</text>
<rect x="150" y="86" width="120.9" height="14" class="acc-fill"/>
<text x="275.9" y="97" font-size="11" text-anchor="start" fill="currentColor" font-weight="bold">64</text>
<text x="140" y="130" font-size="13" text-anchor="end" fill="currentColor">RSA-2048</text>
<rect x="150" y="112" width="211.2" height="14" fill="currentColor" fill-opacity="0.4"/>
<text x="366.2" y="123" font-size="11" text-anchor="start" fill="currentColor">256</text>
<rect x="150" y="129" width="211.2" height="14" class="acc-fill"/>
<text x="366.2" y="140" font-size="11" text-anchor="start" fill="currentColor" font-weight="bold">256</text>
<text x="140" y="173" font-size="13" text-anchor="end" fill="currentColor">ML-KEM-768</text>
<rect x="150" y="155" width="311" height="14" fill="currentColor" fill-opacity="0.4"/>
<text x="466" y="166" font-size="11" text-anchor="start" fill="currentColor">1,184</text>
<rect x="150" y="172" width="305.5" height="14" class="acc-fill"/>
<text x="460.5" y="183" font-size="11" text-anchor="start" fill="currentColor" font-weight="bold">1,088</text>
<text x="140" y="216" font-size="13" text-anchor="end" fill="currentColor">FN-DSA-512</text>
<rect x="150" y="198" width="292.9" height="14" fill="currentColor" fill-opacity="0.4"/>
<text x="447.9" y="209" font-size="11" text-anchor="start" fill="currentColor">897</text>
<rect x="150" y="215" width="273.5" height="14" class="acc-fill"/>
<text x="428.5" y="226" font-size="11" text-anchor="start" fill="currentColor" font-weight="bold">666</text>
<text x="140" y="259" font-size="13" text-anchor="end" fill="currentColor">ML-DSA-44</text>
<rect x="150" y="241" width="317.7" height="14" fill="currentColor" fill-opacity="0.4"/>
<text x="472.7" y="252" font-size="11" text-anchor="start" fill="currentColor">1,312</text>
<rect x="150" y="258" width="357.6" height="14" class="acc-fill"/>
<text x="512.6" y="269" font-size="11" text-anchor="start" fill="currentColor" font-weight="bold">2,420</text>
<text x="140" y="302" font-size="13" text-anchor="end" fill="currentColor">ML-DSA-65</text>
<rect x="150" y="284" width="343.6" height="14" fill="currentColor" fill-opacity="0.4"/>
<text x="498.6" y="295" font-size="11" text-anchor="start" fill="currentColor">1,952</text>
<rect x="150" y="301" width="378" height="14" class="acc-fill"/>
<text x="533" y="312" font-size="11" text-anchor="start" fill="currentColor" font-weight="bold">3,309</text>
<rect x="150" y="352" width="14" height="10" fill="currentColor" fill-opacity="0.4"/>
<text x="170" y="361" font-size="12" text-anchor="start" fill="currentColor">public key</text>
<rect x="260" y="352" width="14" height="10" class="acc-fill"/>
<text x="280" y="361" font-size="12" text-anchor="start" fill="currentColor">signature (ciphertext for KEMs)</text>
</svg>
<figcaption>Figure 21.15. The price of lattices is size. On a log scale, ML-KEM and ML-DSA keys and outputs are 10 to 50 times larger than elliptic-curve ones (X25519 sends 32 bytes each way; Ed25519 signs in 64). Falcon's 666-byte signatures are why it is wanted despite its difficulty.</figcaption>
</figure>

**Falcon's story.** The signature's name stands for "fast-Fourier lattice-based
compact signatures over NTRU". Its design joins three earlier ideas: the
hash-and-sign framework of Gentry, Peikert and Vaikuntanathan (2008), which
fixed NTRUSign's leak with Gaussian sampling; the NTRU lattice, for compact keys;
and the fast Fourier sampler of Léo Ducas and Thomas Prest (2016), which made
the sampling fast. It was submitted to NIST in 2017 and selected in 2022 for its
small signatures, with a warning about how hard it is to implement.

!!! note "Life story: Falcon / FN-DSA"
    **Born:** 2017, a team including Pierre-Alain Fouque, Thomas Pornin and Thomas Prest ·
    **Purpose:** the smallest practical lattice signatures · **Helped:** a candidate for certificate chains,
    where every byte is sent in every handshake · **Status:** selected by NIST in 2022; FIPS 206 (FN-DSA)
    still in preparation in 2026

## 21.11 Break it

*Level: intermediate to advanced.* Lattice cryptography has a long list of
casualties, and each taught something.

- **Knapsacks (1982 onward).** Merkle-Hellman and its variants hid a trapdoor
  in a subset-sum problem with a low-density structure. Shamir's attack and
  LLL found short vectors that exposed it. Lesson: structure added for the
  trapdoor is what the attacker hunts.
- **GGH (1997).** Goldreich, Goldwasser and Halevi's scheme used the "good basis,
  bad basis" idea of section 21.3 directly. Nguyen broke the proposed
  parameters in 1999: the errors were too small and the dimension too low.
- **NTRUSign (2003 to 2006).** Signatures leaked the secret basis, as described
  above. Lesson: a signature's distribution must not depend on the key.
  Rejection sampling (ML-DSA) and Gaussian sampling (Falcon) are the two fixes.
- **Errors too small or too structured.** Arora and Ge (2011) showed that if
  the errors come from a tiny set and there are many samples, LWE can be turned
  into a large system of linear equations and solved. Real schemes give few
  samples per key and wide enough errors.
- **Decryption failures.** If decryption fails occasionally, an attacker who
  can submit many ciphertexts and notice failures learns about the secret. The
  FO transform and failure rates around $2^{-140}$ or lower close this.
- **KyberSlash (2023 to 2024).** Several Kyber implementations, the reference
  code among them, computed a division whose operands depended on secret data.
  On many processors division time depends on the value, and researchers
  recovered keys from timing measurements. It was patched quickly. Lesson: the
  code fails before the mathematics, as in [Chapter 18](18-Side-Channels.md).
- **Side channels on Falcon and ML-DSA.** "Falcon Down" (Karabulut and Aysu,
  2021) recovered Falcon keys from the electromagnetic emissions of an
  unprotected chip; power and fault attacks on unprotected Dilithium hardware
  followed. Masking (splitting secrets into random shares during computation)
  is the defense.
- **A false alarm.** In April 2024 Yilei Chen posted a quantum algorithm for
  LWE that, if correct, would have threatened lattice schemes (though not
  ML-KEM's parameters directly). Within about ten days other researchers found
  a bug, and the claim was withdrawn. The episode showed both the worry about
  young assumptions and how fast the field checks claims.

!!! note "Life story: GGH"
    **Born:** 1997, Oded Goldreich, Shafi Goldwasser and Shai Halevi · **Purpose:** encryption
    and signatures directly from "good basis, bad basis" · **Broken:** 1999, by Phong Nguyen, at the proposed
    sizes · **Legacy:** its idea survives in Falcon, with a proper Gaussian sampler

!!! note "Life story: NTRUSign"
    **Born:** 2003, the NTRU team · **Purpose:** fast hash-and-sign signatures on NTRU lattices ·
    **Broken:** 2006, by Phong Nguyen and Oded Regev: a few hundred signatures outline the secret basis ·
    **Replaced by:** Falcon (Gaussian sampling) and ML-DSA (rejection sampling)

!!! note "Life story: KyberSlash"
    **Found:** December 2023, by several research teams, in the reference code and many libraries
    · **What it broke:** a division by the modulus whose timing depended on secret data, enough to recover
    keys · **Fixed by:** replacing the division with constant-time multiplications, within weeks · **Lesson:**
    the same as in [Chapter 18](18-Side-Channels.md): the code fails before the mathematics

**The attacks that set the parameters** are not breaks but costs. The **primal
attack** embeds an LWE instance into a lattice where $(\mathbf{s}, \mathbf{e})$
becomes an unusually short vector, and runs BKZ until it shows up. The **dual
attack** finds short vectors in a related lattice and uses them to tell LWE
samples from random. Both need BKZ with a block size $\beta$ in the several
hundreds for ML-KEM.

## 21.12 Choosing parameters

*Level: expert.* Every lattice scheme balances three numbers: the dimension
($n k$), the modulus $q$, and the size of the secrets and errors.

- **Bigger errors** make the lattice problem harder, but the noise in
  decryption grows, so $q$ must grow, and a bigger $q$ relative to the errors
  makes the problem easier again. The scheme is a tightrope between
  "decryption fails" and "the attacker wins".
- **Bigger dimension** makes attacks harder and keys longer, in direct
  proportion.

The cost model starts from the best way to solve SVP inside BKZ, **lattice
sieving**: about $2^{0.292\beta}$ operations classically (Becker, Ducas, Gama and
Laarhoven, 2016) and about $2^{0.257\beta}$ on a quantum computer (Chailloux and
Loyer, 2021). Counting a single sieve call in dimension $\beta$ is the **core-SVP**
measure. For Kyber the round-3 designers estimated $\beta$ values that give
core-SVP hardness of about $2^{118}$ for the smallest set and over $2^{180}$ and
$2^{250}$ for the larger two. The first is below 128. The designers and NIST argued that the real cost of a
sieve, with its enormous memory and the gates each step needs, adds many bits,
putting ML-KEM-512 above AES-128 key search; Daniel Bernstein disputed NIST's
arithmetic in 2023, and NIST kept the parameter set. That argument is why many
deployments use ML-KEM-768, and why NSA's CNSA 2.0 asks for ML-KEM-1024.

The open-source **lattice estimator** (begun by Martin Albrecht, Rachel Player
and Sam Scott in 2015) computes the cost of every known attack for given $n$,
$q$ and error distribution; designers pick parameters where the cheapest attack
still clears the target. NIST also wanted a backup that needs less trust in
structure: **FrodoKEM** uses plain, unstructured LWE with public keys of about 10 to
21 KB and is recommended by Germany's BSI and France's ANSSI, though NIST did
not standardize it.

## 21.13 In the real world

- **Key exchange.** ML-KEM-768 in the TLS hybrid `X25519MLKEM768` (Chrome,
  Firefox, Cloudflare, Apple, OpenSSL 3.5) and the SSH hybrid
  `mlkem768x25519-sha256` (OpenSSH 10.0's default); Kyber-1024 in Signal's
  PQXDH and Apple's PQ3. [Chapter 20](20-Quantum-Computers.md) tells the
  deployment story; [Chapter 19](19-Protocols.md) the protocols.
- **Signatures.** ML-DSA in HSMs, code signing, operating systems and private
  certificate authorities; composite certificates pairing ML-DSA with ECDSA or
  Ed25519 are being standardized. FN-DSA waits for FIPS 206.
- **Standards.** FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), FIPS 206 to come
  (FN-DSA). Status and NIST IR 8547 dates in the [algorithm table](../index.md).
- **Use a vetted library.** Constant-time code, masked hardware where attackers
  have physical access, and hybrids while confidence builds.
- **Beyond KEMs and signatures.** Lattices also give fully homomorphic
  encryption ([Chapter 23](23-Advanced-Protocols.md)), because LWE noise can be
  added and multiplied as long as it stays small.

## 21.14 Going deeper

*Level: expert.*

??? abstract "Worst case to average case: what Ajtai and Regev proved"

    For most cryptography, a random instance might be much easier than the hardest one: some numbers are
    easy to factor. Ajtai (1996) showed that finding short vectors in random lattices of a certain form (the
    SIS problem: short nonzero $x$ with $Ax \equiv 0 \pmod q$) is at least as hard as approximating SVP to within a
    polynomial factor in **every** lattice of a related dimension. Regev (2005) proved the same for LWE, through
    a quantum reduction: an algorithm for random LWE would give a quantum algorithm for worst-case
    approximate SVP and related problems (Peikert gave a classical reduction for some parameters in 2009).
    Caveats: the approximation factors in the proofs are polynomial, while cryptographic parameters are
    set from concrete attacks, not from the reductions; and the ring and module versions reduce only from
    ideal and module lattices, which have extra structure.

??? abstract "Search, decision, and why the public key looks random"

    **Search LWE** asks for $s$; **decision LWE** asks only to tell $(A, As + e)$ from uniform $(A, b)$. For prime $q$
    of polynomial size they are equivalent: guess one coordinate of $s$ at a time and use a decision oracle to
    check each guess. Encryption proofs need the decision version: if $(A, b)$ is indistinguishable from uniform,
    replace it by uniform in the proof, and then the ciphertext is a leftover-hash or a fresh LWE sample that
    hides the message. Secrets can be taken from the error distribution instead of uniform mod $q$ without
    losing security (Applebaum, Cash, Peikert and Sahai, 2009), which is why ML-KEM's $\mathbf{s}$ is small.

??? abstract "The number-theoretic transform in ML-KEM"

    Over $\mathbb{Z}_{3329}$, $x^{256} + 1$ factors into 128 quadratics $x^2 - \zeta^{2\,\mathrm{br}(i) + 1}$, where $\zeta = 17$ is a primitive
    256th root of unity and $\mathrm{br}$ reverses 7-bit numbers. (There is no 512th root of unity mod 3329, so
    the factorization stops at degree 2.) The NTT maps a polynomial to its 128 residues, computed by a
    Cooley-Tukey butterfly network in $7 \cdot 128$ multiplications; a product becomes 128 multiplications of
    degree-1 polynomials. ML-KEM generates $\mathbf{A}$ directly in the NTT domain, so it never transforms it. ML-DSA's
    $q = 8{,}380{,}417$ has a 512th root of unity (1753), so its ring splits all the way into linear factors.

??? abstract "Fujisaki-Okamoto with implicit rejection"

    FIPS 203's ML-KEM.Decaps computes $m' = \mathrm{Dec}(c)$, $(K', r') = G(m' \,\Vert\, H(\mathit{ek}))$, $\bar K = J(z \,\Vert\, c)$ and
    $c' = \mathrm{Enc}(\mathit{ek}, m'; r')$, and returns $K'$ if $c = c'$ and $\bar K$ otherwise. In the random-oracle model this turns an
    IND-CPA scheme with negligible decryption-failure probability into an IND-CCA2 KEM; proofs in the quantum
    random-oracle model exist with somewhat looser bounds (Hofheinz, Hövelmanns and Kiltz, 2017, and later
    work). Hashing $H(\mathit{ek})$ in prevents multi-target attacks across many public keys. The comparison $c = c'$
    must be constant-time, and so must the choice between $K'$ and $\bar K$, or the rejection is no longer implicit.

??? abstract "Why ML-DSA publishes only the high bits of t"

    ML-DSA splits $\mathbf{t} = \mathbf{t}_1 2^d + \mathbf{t}_0$ with $d = 13$ and publishes only $\mathbf{t}_1$, cutting the public key nearly in half. The
    verifier then computes $\mathbf{A}\mathbf{z} - c\,\mathbf{t}_1 2^d$, which differs from $\mathbf{w}$ by $c\,\mathbf{s}_2 - c\,\mathbf{t}_0$, sometimes enough to change a high
    bit. The signer, who knows $\mathbf{t}_0$, includes a short **hint** vector $\mathbf{h}$ that marks the coefficients where a
    carry happens, and `UseHint` fixes them. The second rejection condition (on the low bits of $\mathbf{w} - c\,\mathbf{s}_2$)
    makes sure the hint is valid and leaks nothing. Forgery reduces to module SIS, and also to the
    "SelfTargetMSIS" problem that arises from Fiat-Shamir in the quantum random-oracle model.

## Check yourself

??? question "1. Are (2, 0), (0, 3) and (2, 3), (2, 6) bases of the same lattice?"

    Compare determinants: $2 \cdot 3 - 0 = 6$ and $2 \cdot 6 - 3 \cdot 2 = 6$. Same area. And $(2, 3) = 1 \cdot (2, 0) + 1 \cdot (0, 3)$,
    $(2, 6) = 1 \cdot (2, 0) + 2 \cdot (0, 3)$, with an integer change of basis of determinant 1. So yes.

??? question "2. Reduce the basis (5, 8), (7, 11) with the Lagrange-Gauss method."

    $(7, 11) - 1 \cdot (5, 8) = (2, 3)$. Swap: now reduce $(5, 8)$ by $(2, 3)$: $\mathrm{round}(34/13) = 3$, giving $(5, 8) - 3 \cdot (2, 3) = (-1, -1)$.
    Swap again: reduce $(2, 3)$ by $(-1, -1)$: $\mathrm{round}(-5/2) = -2$ (Python rounds half to even), giving $(0, 1)$.
    Then $(-1, -1)$ reduced by $(0, 1)$: round$(-1) = -1$, giving $(-1, 0)$, the same length, so stop. The lattice is all of
    $\mathbb{Z}^2$ (determinant $5 \cdot 11 - 8 \cdot 7 = -1$), with basis $(0, 1)$, $(-1, 0)$.

??? question "3. In the q = 23 LWE example, check sample 4 by hand."

    $\langle (18, 11), (3, 15) \rangle = 54 + 165 = 219 = 9 \cdot 23 + 12$, so 12; plus the error 1 gives $b_4 = 13$.

??? question "4. In the single-number encryption of section 21.6, encrypt the bit 0 with the same r, e1, e2. What does Bob get?"

    $u = 372$ as before, $v = 7407 + 1 \equiv 750 \pmod{3329}$, and $w = 750 - 2 \cdot 372 = 6$. That is near 0, so the bit is 0.
    The noise is 6 in both cases: it doesn't depend on the bit.

??? question "5. Multiply x^3 by x^2 in Z_17[x]/(x^4 + 1)."

    $x^5 = x \cdot x^4 = -x$, which is $16x$ mod 17.

??? question "6. Check the ML-KEM-1024 sizes: k = 4, 11 bits for u, 5 for v."

    Public key: $4 \cdot 256 \cdot 12/8 + 32 = 1{,}536 + 32 = 1{,}568$ bytes. Ciphertext: $4 \cdot 256 \cdot 11/8 + 256 \cdot 5/8 = 1{,}408 + 160 = 1{,}568$ bytes.

??? question "7. In the toy ML-DSA of section 21.9, what goes wrong if the signer uses the same mask y for two messages that get challenges c = 1 and c = 2?"

    $z = 20 + 1 \cdot 2 = 22$ and $z' = 20 + 2 \cdot 2 = 24$, so $z' - z = (c' - c)\, s_1$ gives $s_1 = 2$ at once. The same mistake
    that breaks Schnorr and ECDSA with a reused nonce. ML-DSA derives $\mathbf{y}$ from the message and randomness so
    it never repeats.

??? question "8. Why can't the toy Regev scheme use errors up to plus or minus 5 with q = 97 and 20 rows?"

    The decryption noise is a sum of up to 20 errors, so it can reach 100, far more than $q/4 \approx 24$. Decryption would
    often return the wrong bit. Larger errors need a larger $q$ or fewer rows in the sum: the trade-off every lattice scheme
    tunes.

??? question "9. Why does nudging a ciphertext coefficient by 1 still decrypt to the same message, and why is that dangerous without the FO transform?"

    The noise budget is about 832 and the real noise is a few hundred at most, so a change of 1 doesn't cross the line.
    An attacker can nudge by larger and larger amounts and watch where decryption starts to fail; the point where it
    fails reveals the size of the noise in that coefficient, which depends on the secret. With FO, any change is
    rejected and answered with a pseudorandom key, so there is nothing to watch.

??? question "10. ML-KEM-512's core-SVP estimate is about 2^118. Why does NIST still put it in category 1?"

    Core-SVP counts only the operations of one sieve call and ignores memory and the cost of each operation. A
    sieve in dimension around 400 needs about $2^{80}$ or more stored vectors and many gates per operation; counting
    those, NIST and the designers estimated the attack at more than AES-128 key search. Critics argued the
    accounting; the margin is thinner than for the larger sets, which is why many choose ML-KEM-768.

## What you learned

- A **lattice** is all whole-number combinations of a basis. A short,
  nearly orthogonal basis makes closest-vector problems easy; a long, skewed
  one makes them hard. That is the trapdoor.
- **Learning with errors** is linear algebra made hard by small noise. Without
  noise, elimination solves it; with noise, it is a closest-vector problem in
  hundreds of dimensions.
- **Rings and modules** replace matrices with polynomials in
  $\mathbb{Z}_q[x]/(x^{256} + 1)$, cutting key sizes by 256 and allowing the fast NTT.
- **ML-KEM** is module-LWE encryption, plus a seed for the matrix,
  compression, and the Fujisaki-Okamoto transform for CCA security.
- **ML-DSA** is Schnorr-style Fiat-Shamir with **rejection sampling** so
  signatures don't leak the key; **FN-DSA** is hash-and-sign over NTRU lattices,
  smaller but hard to implement.
- Parameters come from the cost of BKZ with lattice sieving; the code (KyberSlash,
  side channels) has failed more often than the mathematics.

**Next:** [Chapter 22](22-Hash-and-Code-Based.md) builds post-quantum schemes on
two other foundations, hash functions and error-correcting codes, and tells how
two newer families were broken.

## Further reading

- Oded Regev, "On Lattices, Learning with Errors, Random Linear Codes, and
  Cryptography", STOC 2005; *Journal of the ACM* 56 (2009).
- Chris Peikert, "A Decade of Lattice Cryptography", *Foundations and Trends in
  Theoretical Computer Science* 10 (2016): the standard survey.
- Daniele Micciancio and Shafi Goldwasser, *Complexity of Lattice Problems: A
  Cryptographic Perspective* (Kluwer, 2002).
- Jeffrey Hoffstein, Jill Pipher and Joseph H. Silverman, *An Introduction to
  Mathematical Cryptography* (Springer, 2nd edition 2014): chapter 7 covers
  lattices, NTRU, GGH and LLL with worked examples.
- Joppe Bos et al., "CRYSTALS-Kyber: A CCA-Secure Module-Lattice-Based KEM"
  (EuroS&P 2018); Léo Ducas et al., "CRYSTALS-Dilithium: A Lattice-Based
  Digital Signature Scheme" (TCHES 2018); the
  [Falcon specification](https://falcon-sign.info/).
- FIPS 203 and FIPS 204 (August 2024).
- Martin Albrecht, Rachel Player and Sam Scott, "On the Concrete Hardness of
  Learning with Errors", *Journal of Mathematical Cryptology* 9 (2015).
- The reference pages: [ML-KEM](../01-key-exchange/ML-KEM.md),
  [ML-DSA](../02-signatures/ML-DSA.md), [FN-DSA](../02-signatures/FN-DSA.md),
  [NTRU Prime](../01-key-exchange/NTRU-Prime.md),
  and [Hard problems](../10-math-foundations/Hard-Problems.md).
