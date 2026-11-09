# 7. SNARKs: Short Proofs About Any Computation

*A proof is usually longer than the thing it proves. A SNARK turns this upside
down: a prover runs a computation of millions of steps and hands over a proof of
a couple of hundred bytes, and a verifier checks it in a few milliseconds without
running the computation at all. This chapter shows how that is possible, with one
small equation, $x^3 + x + 5 = 35$, carried all the way through by hand: from a
program to an arithmetic circuit, from the circuit to a rank-1 constraint system,
from the constraints to a single polynomial identity, and from the identity to a
check at one secret point. You will build each stage in Python, see why one
random point is enough, see why that point must stay hidden, read the
verification equation of Groth16, meet PLONK and its universal setup, and then
break things the way real systems have broken: a flaw in a setup that would have
let anyone print Zcash coins, and circuits that forgot a constraint.*

!!! abstract "In this chapter"
    **You will learn:**

    - what "succinct" and "non-interactive" mean, and why a short proof of a long
      computation is surprising;
    - how a program becomes an arithmetic circuit, a rank-1 constraint system
      (R1CS) and a quadratic arithmetic program (QAP), worked by hand on
      $x^3 + x + 5 = 35$;
    - why checking one polynomial identity at one random point checks every
      constraint at once (the Schwartz-Zippel lemma), and why the point must be
      hidden in a structured reference string;
    - how Pinocchio (2013), Groth16 (2016) and PLONK (2019) turn this into short
      proofs, and what their pairing checks look like;
    - what trusted setup and toxic waste are, how a setup flaw put Zcash at risk
      in 2018, and why under-constrained circuits are the most common real failure.

    **You need:** [Chapter 5](05-Zero-Knowledge-Proofs.md) (what zero knowledge,
    soundness and the simulator mean), [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)
    (Fiat-Shamir), and [Chapter 3](03-Commitments.md) for KZG commitments and setup
    ceremonies. The mathematics book has the two tools this chapter leans on:
    interpolation and the Schwartz-Zippel lemma in
    [Polynomials at work](../mathematics/11-Polynomials-at-Work.md), and pairings in
    [Counting points and pairings](../mathematics/13-Counting-Points-and-Pairings.md).
    Arithmetic modulo a prime ([book 1, Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md))
    is used everywhere. The one-section version of this chapter is in
    [book 1, Chapter 23](../../book/23-Advanced-Protocols.md).

    **Levels:** §7.1 and §7.2 are for beginners; §7.3 to §7.5 and §7.9 to §7.11
    are intermediate; §7.6 to §7.8 and §7.12 are expert.

## 7.1 The problem

*Level: beginner.*

Suppose someone runs a long computation for you and tells you the answer. A
cloud server has processed a day of bank transfers and reports the new balances.
A blockchain node has executed ten thousand transactions and reports the new
state. A hospital has run an analysis over its records and reports a statistic.
How do you know the answer is right?

The obvious method is to do the computation again yourself. That defeats the
point of asking someone else, and it is often impossible: you may not have the
machine, the time, or the inputs. Some inputs are private. The bank will not
show you everyone's transfers; the hospital will not show you its patients.

So you want something stranger. You want the prover to hand you a short string,
a **proof**, such that:

- checking the proof is far cheaper than redoing the computation;
- if the answer is wrong, no prover can make a proof that passes, except with a
  vanishing chance;
- the proof is a single message, which anyone can check later, without talking
  to the prover;
- if you ask for it, the proof reveals nothing about the private inputs beyond
  the fact that the answer is right.

A system with the first three properties is a **SNARK**: a *succinct
non-interactive argument of knowledge*. With the fourth it is a **zk-SNARK**.
Each word in the name carries weight.

**Succinct** means the proof is tiny and quick to check, whatever the size of the
computation. For the systems in this chapter the proof has a fixed size, a few
hundred bytes, and checking it takes a fixed handful of expensive operations plus
time proportional to the length of the public input and output. The computation
itself can have a billion steps; the verifier never looks at them.

**Non-interactive** means one message, from prover to verifier, and no
conversation. The interactive proofs of [Chapter 5](05-Zero-Knowledge-Proofs.md)
needed many rounds of challenge and response; [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)
removed the live verifier from a three-move protocol with Fiat-Shamir. A SNARK is
non-interactive in the same sense: the proof can be posted, stored, forwarded and
checked by anyone, a thousand times, without the prover being online.

**Argument** is a precise word. In a *proof*, even a prover with unlimited
computing power cannot cheat. In an *argument*, soundness holds only against
provers who cannot solve some hard problem, such as a discrete logarithm on an
elliptic curve. Every SNARK is an argument, and there is a reason: complexity
theory gives strong evidence that statistically sound proofs this short cannot
exist for hard problems. The shortness is bought with a computational assumption.

**Of knowledge** means more than "a valid input exists". It means the prover
actually *knows* one, in the sense of [Chapter 5](05-Zero-Knowledge-Proofs.md): an
extractor that could rewind or inspect the prover would pull the input out. That
matters when the statement is "I know a secret key that opens this coin", where a
key always exists and the only question is who has it.

### Why a short proof is surprising

Think about what is being claimed. A computation of $N$ steps has, in general, no
shortcut: to learn its output you must run it. A proof that the output is $y$
would seem to need at least a record of the steps, so that the verifier can
check each one. Yet a SNARK proof is the same size for $N = 100$ as for
$N = 100{,}000{,}000$, and the verifier reads it in less time than it would take
to read the computation's description.

It works because the verifier does not check the steps. It checks one fact about
a polynomial that the prover has built from the steps, and a polynomial has a
property no list of steps has: if it is wrong anywhere, it is wrong almost
everywhere. A single random spot check, made at a point the prover could not
predict, catches a lie with overwhelming probability. Most of this chapter is
about building that polynomial and then hiding the spot from the prover.

### Where the idea came from

The theory came long before the practice. After Goldwasser, Micali and Rackoff
defined zero knowledge in 1985, complexity theorists asked how little a verifier
must read to be convinced. In 1991 László Babai, Lance Fortnow, Leonid Levin and
Mario Szegedy showed that a computation can be checked in time polylogarithmic in
its length if the proof is written in a special, redundant form. The **PCP
theorem** of 1992 (Sanjeev Arora and Shmuel Safra; Arora, Carsten Lund, Rajeev
Motwani, Madhu Sudan and Mario Szegedy) said something astonishing: every NP
statement has a proof that can be checked by reading a constant number of its
bits, chosen at random.

Those PCP proofs were enormous, but in 1992 Joe Kilian saw how to make them
short to send. The prover writes the long proof, commits to it with a Merkle tree
([Chapter 3](03-Commitments.md)), and sends only the root; the verifier asks for a
few random positions, and the prover opens them with Merkle paths. In 1994 Silvio
Micali removed the interaction by deriving the positions from a hash of the root,
the same move as Fiat-Shamir, and called the result **computationally sound
proofs**, CS proofs. In principle, succinct non-interactive arguments for
everything existed in 1994.

In practice they were useless: the provers were astronomically slow. The road to
practical systems went through pairings and polynomials instead. Jens Groth gave
a pairing-based non-interactive argument with a constant-size proof in 2010.
Nir Bitansky, Ran Canetti, Alessandro Chiesa and Eran Tromer gave the object its
name, SNARK, in a 2012 paper. In 2013 Rosario Gennaro, Craig Gentry, Bryan Parno
and Mariana Raykova (GGPR) found the encoding that made everything fast, the
**quadratic arithmetic program** of §7.4, and Parno, Jon Howell, Gentry and
Raykova built **Pinocchio**, which compiled C programs into proofs of 288 bytes.
Three years later a cryptocurrency, Zcash, put SNARKs in the hands of the public,
and Groth published the scheme that still sets the record for proof size.
Figure 7.1 shows the whole road.

<figure class="mars-fig">
<svg viewBox="0 0 640 412" width="640" role="img" aria-label="Timeline of succinct proofs from zero-knowledge in 1985 to the Orchard circuit flaw of 2026" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="404" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1985</text>
<circle cx="92" cy="22" r="3.5" fill="currentColor"/>
<text x="108" y="27">Goldwasser, Micali, Rackoff: zero-knowledge proofs</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1992</text>
<circle cx="92" cy="48" r="3.5" fill="currentColor"/>
<text x="108" y="53">PCP theorem; Kilian's succinct arguments from Merkle trees</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">1994</text>
<circle cx="92" cy="74" r="3.5" fill="currentColor"/>
<text x="108" y="79">Micali's CS proofs: succinct and non-interactive</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="100" r="3.5" fill="currentColor"/>
<text x="108" y="105">Kate, Zaverucha, Goldberg: KZG commitments</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="126" r="3.5" fill="currentColor"/>
<text x="108" y="131">Bitansky, Canetti, Chiesa, Tromer name the SNARK</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="152" r="3.5" fill="currentColor"/>
<text x="108" y="157">GGPR's quadratic programs; Pinocchio compiles C</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="178" r="3.5" fill="currentColor"/>
<text x="108" y="183">BCTV14 and libsnark</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="204" r="3.5" fill="currentColor"/>
<text x="108" y="209">Groth16 (three elements); Zcash launches on BCTV14</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="230" r="3.5" fill="currentColor"/>
<text x="108" y="235">Ethereum adds BN254 pairing checks (EIP-197)</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="256" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="261">Gabizon finds the Sprout flaw; Sapling fixes it</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="282" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="287">Flaw disclosed; Sonic, then PLONK; Tornado Cash bug</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="308" r="3.5" fill="currentColor"/>
<text x="108" y="313">Plookup: lookup tables inside PLONK</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="334" r="3.5" fill="currentColor"/>
<text x="108" y="339">Zcash Orchard moves to Halo 2, no trusted setup</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="360" r="3.5" fill="currentColor"/>
<text x="108" y="365">zkEVM rollups open on Ethereum</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2026</text>
<circle cx="92" cy="386" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="108" y="391">Orchard circuit flaw: soft fork, then NU6.2</text>
</svg>
<figcaption>Figure 7.1. From zero knowledge to deployed SNARKs. Ringed dots mark the failures told in §7.9 and §7.10: a flaw in a setup, a missing constraint, and a circuit that had to be switched off.</figcaption>
</figure>

### The shape of a SNARK

Every SNARK in this chapter has three parts:

1. **Setup.** Once per circuit (Groth16) or once for all circuits up to a size
   (PLONK), someone produces public parameters: a *proving key* for provers and a
   short *verifying key* for verifiers. The setup uses secret random numbers that
   must be destroyed afterward (§7.9).
2. **Prove.** The prover takes the proving key, the public input and output, and
   its private input (the **witness**), runs the computation, and produces the
   proof. This is the expensive part, many times the cost of the computation.
3. **Verify.** The verifier takes the verifying key, the public input and output,
   and the proof, and answers yes or no, quickly.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="A setup sends a proving key to the prover and a verifying key to the verifier; the prover sends a short proof to the verifier" fill="currentColor" font-size="14">
<rect x="220" y="14" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="36" text-anchor="middle" font-weight="bold">Setup (once)</text>
<text x="320" y="55" text-anchor="middle" font-size="13">secret randomness, then destroyed</text>
<rect x="20" y="130" width="230" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="135" y="154" text-anchor="middle" font-weight="bold">Prover</text>
<text x="135" y="178" text-anchor="middle" font-size="13">runs the computation</text>
<text x="135" y="198" text-anchor="middle" font-size="13">(millions of steps)</text>
<text x="135" y="218" text-anchor="middle" font-size="13">knows the private witness</text>
<text x="135" y="238" text-anchor="middle" font-size="13">seconds to minutes of work</text>
<rect x="390" y="130" width="230" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="505" y="154" text-anchor="middle" font-weight="bold">Verifier</text>
<text x="505" y="178" text-anchor="middle" font-size="13">sees public input and output</text>
<text x="505" y="198" text-anchor="middle" font-size="13">never runs the computation</text>
<text x="505" y="218" text-anchor="middle" font-size="13">a few pairings:</text>
<text x="505" y="238" text-anchor="middle" font-size="13">milliseconds</text>
<line x1="250" y1="64" x2="150" y2="126" stroke="currentColor" stroke-width="1.5"/>
<polygon points="150,126 154,117 159,123" fill="currentColor"/>
<text x="24" y="96" font-size="13">proving key (large)</text>
<line x1="390" y1="64" x2="490" y2="126" stroke="currentColor" stroke-width="1.5"/>
<polygon points="490,126 481,123 486,117" fill="currentColor"/>
<text x="458" y="96" font-size="13">verifying key (small)</text>
<line x1="250" y1="190" x2="384" y2="190" stroke="currentColor" stroke-width="1.5"/>
<polygon points="390,190 381,185 381,195" fill="currentColor"/>
<text x="320" y="180" text-anchor="middle" font-size="13">proof</text>
<text x="320" y="210" text-anchor="middle" font-size="13">128 to 192 bytes</text>
</svg>
<figcaption>Figure 7.2. The three parts of a SNARK. The proof that crosses the middle is the same size whether the computation took a hundred steps or a hundred million.</figcaption>
</figure>

### Why non-interaction matters on Mars

Arcadia City, the settlement on Mars that appears throughout this book, rations
water by a formula over thousands of sensor readings a day: reservoir levels,
recycler output, household meters. The settlement's charter gives an oversight
board on Earth the right to check that the published rations follow the formula.
Sending the raw readings is costly on a link shared with medical and engineering
traffic, and some of them are household data the charter keeps private. An
interactive proof would be worse: every round of challenge and response costs a
round trip of 8 to 48 minutes, depending on where the planets are in their orbits.
A SNARK fits the situation exactly. Each night the settlement's computer proves
"these rations are the formula applied to readings whose Merkle root is $R$" and
sends a 192-byte proof with the rations and the root. Earth checks it in
milliseconds, as often as it likes, and never sees a household meter. The proof
cannot say whether the sensors told the truth; it says only that the arithmetic
was done right on whatever the sensors reported. That limit, that a SNARK proves
exactly the computation written down and nothing more, returns in §7.10.

## 7.2 From programs to arithmetic circuits

*Level: beginner.*

A SNARK cannot prove things about a program written in Python or C directly. It
proves things about a much more restricted kind of computation: an **arithmetic
circuit** over a finite field. Turning a program into such a circuit is the first
step, and a surprising amount of real engineering, and most real bugs, live in it.

### The field

All the arithmetic happens in $\mathbb{F}_p$, the integers modulo a prime $p$
([book 1, Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md)). There you can add,
subtract, multiply, and divide by anything except zero, and every result is again
a number from $0$ to $p - 1$. Real systems use a prime of about 254 or 255 bits,
the order of the group of an elliptic curve that supports pairings: for BN254 it
is a 254-bit prime, for BLS12-381 a 255-bit one. This chapter uses $p = 89$ so
that every number fits on a page; nothing about the method changes with the size
of $p$, except the security.

Working modulo $p$ has a consequence that trips up every newcomer. There are no
negative numbers and no "less than": $-1$ is the same element as $p - 1$, a huge
positive number. A circuit that is supposed to check that an amount is positive
must do real work to say so, and §7.10 shows what happens when it does not.

### Gates

An arithmetic circuit is a network of two kinds of gate, addition and
multiplication, joined by wires that carry field elements. Constants can be fed
in anywhere. There are no loops, no branches, no memory: a loop must be unrolled
a fixed number of times, an `if` must become arithmetic (compute both branches
and select with a bit $b$: $b \cdot u + (1 - b) \cdot v$), and an array lookup
becomes a sum over all positions. A circuit computes the same sequence of
operations whatever its inputs, which is also why it leaks nothing through
timing.

Additions are nearly free in the systems of this chapter; the cost of a proof is
counted in multiplication gates, called **constraints**. One SHA-256 compression
takes roughly 25,000 to 30,000 constraints in an optimized R1CS circuit, because every
32-bit word must be split into bits and every bit operation becomes field
arithmetic. A hash built for circuits, such as Poseidon or MiMC, needs a few
hundred, which is why circuit designers prefer them, and why §7.10 meets MiMC
again.

### Flattening the example

Here is the statement this chapter proves: *I know a number $x$ such that
$x^3 + x + 5 = 35$*. The answer is $x = 3$, because $27 + 3 + 5 = 35$. The
example is Vitalik Buterin's, from a 2016 essay that taught a generation of
developers how QAPs work; it is small enough to do by hand and has every feature
of the general case: multiplications, additions, a constant and a public output.

The first step is **flattening**: rewrite the computation as a list of steps, each
of the form $u = v \circ w$ with a single operation $\circ$:

$$
\begin{aligned}
\mathit{sym}_1 &= x \cdot x\\
y &= \mathit{sym}_1 \cdot x\\
\mathit{sym}_2 &= y + x\\
\mathit{out} &= \mathit{sym}_2 + 5
\end{aligned}
$$

The new names $\mathit{sym}_1$, $y$ and $\mathit{sym}_2$ are **intermediate
wires**. With $x = 3$ they carry $9$, $27$ and $30$, and $\mathit{out}$ carries
$35$. The prover knows all of these values; the verifier will know only that
$\mathit{out} = 35$. Figure 7.3 draws the circuit.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Arithmetic circuit for x cubed plus x plus 5: two multiplication gates and two addition gates, with the values for x equal to 3" fill="currentColor" font-size="14">
<rect x="18" y="86" width="64" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="50" y="106" text-anchor="middle">x = 3</text>
<circle cx="170" cy="101" r="22" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="170" y="107" text-anchor="middle" font-size="18">×</text>
<circle cx="300" cy="101" r="22" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="107" text-anchor="middle" font-size="18">×</text>
<circle cx="430" cy="101" r="22" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="107" text-anchor="middle" font-size="18">+</text>
<circle cx="555" cy="101" r="22" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="555" y="107" text-anchor="middle" font-size="18">+</text>
<text x="170" y="66" text-anchor="middle" font-size="13">gate 1</text>
<text x="300" y="66" text-anchor="middle" font-size="13">gate 2</text>
<text x="430" y="66" text-anchor="middle" font-size="13">gate 3</text>
<text x="520" y="66" text-anchor="middle" font-size="13">gate 4</text>
<line x1="82" y1="101" x2="148" y2="101" stroke="currentColor" stroke-width="1.5"/>
<line x1="192" y1="101" x2="278" y2="101" stroke="currentColor" stroke-width="1.5"/>
<text x="235" y="92" text-anchor="middle" font-size="13">sym1 = 9</text>
<line x1="322" y1="101" x2="408" y2="101" stroke="currentColor" stroke-width="1.5"/>
<text x="365" y="92" text-anchor="middle" font-size="13">y = 27</text>
<line x1="452" y1="101" x2="533" y2="101" stroke="currentColor" stroke-width="1.5"/>
<text x="492" y="92" text-anchor="middle" font-size="13">sym2 = 30</text>
<line x1="50" y1="116" x2="50" y2="200" stroke="currentColor" stroke-width="1.5"/>
<line x1="50" y1="200" x2="430" y2="200" stroke="currentColor" stroke-width="1.5"/>
<line x1="170" y1="200" x2="170" y2="123" stroke="currentColor" stroke-width="1.5"/>
<line x1="300" y1="200" x2="300" y2="123" stroke="currentColor" stroke-width="1.5"/>
<line x1="430" y1="200" x2="430" y2="123" stroke="currentColor" stroke-width="1.5"/>
<circle cx="170" cy="200" r="3" fill="currentColor"/>
<circle cx="300" cy="200" r="3" fill="currentColor"/>
<text x="240" y="222" text-anchor="middle" font-size="13">the wire x feeds gates 1, 2 and 3</text>
<text x="608" y="44" text-anchor="middle">5</text>
<line x1="602" y1="52" x2="571" y2="84" stroke="currentColor" stroke-width="1.5"/>
<line x1="555" y1="123" x2="555" y2="170" stroke="currentColor" stroke-width="1.5"/>
<polygon points="555,176 550,167 560,167" fill="currentColor"/>
<text x="555" y="196" text-anchor="middle">out = 35</text>
</svg>
<figcaption>Figure 7.3. The circuit for $x^3 + x + 5$, with the values the prover computes for $x = 3$. Gate 1 multiplies $x$ by itself; gate 2 multiplies the result by $x$ again; gates 3 and 4 add $x$ and the constant 5.</figcaption>
</figure>

### What the verifier will be convinced of

Notice what has happened to the statement. "I know $x$ with $x^3 + x + 5 = 35$"
has become "I know values for the wires $x$, $\mathit{sym}_1$, $y$,
$\mathit{sym}_2$ such that every gate is satisfied and the output wire carries
35". The two are equivalent only if the gates pin down every wire. If a gate is
left out, some wire is free, and the prover may be able to satisfy the remaining
gates with a value of $x$ that does not solve the equation. The circuit, not the
program, is what gets proved. Keep that in mind; it is the theme of §7.10.

Real circuits are written in languages built for the job. Circom and
ZoKrates compile a C-like description into R1CS; Halo 2, Noir and
gnark have their own styles; zkVMs such as RISC Zero and SP1 go further and
prove the execution of an ordinary RISC-V program, so the "circuit" is a CPU
([Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)). Underneath, all of them
produce constraints like the ones in the next section.

The overall plan is drawn in Figure 7.4: each section of the chapter is one box.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="The pipeline from a program to a proof: program, circuit, R1CS, QAP, hidden evaluation, proof" fill="currentColor" font-size="14">
<rect x="20" y="20" width="180" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="45" text-anchor="middle" font-weight="bold">program</text>
<text x="110" y="67" text-anchor="middle" font-size="13">x³ + x + 5 = 35</text>
<rect x="230" y="20" width="180" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="45" text-anchor="middle" font-weight="bold">circuit</text>
<text x="320" y="67" text-anchor="middle" font-size="13">4 gates (§7.2)</text>
<rect x="440" y="20" width="180" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="45" text-anchor="middle" font-weight="bold">R1CS</text>
<text x="530" y="67" text-anchor="middle" font-size="13">A, B, C, witness (§7.3)</text>
<rect x="440" y="148" width="180" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="173" text-anchor="middle" font-weight="bold">QAP</text>
<text x="530" y="195" text-anchor="middle" font-size="13">AB − C = HZ (§7.4, 7.5)</text>
<rect x="230" y="148" width="180" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="173" text-anchor="middle" font-weight="bold">hidden point</text>
<text x="320" y="195" text-anchor="middle" font-size="13">SRS, pairings (§7.6)</text>
<rect x="20" y="148" width="180" height="62" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="173" text-anchor="middle" font-weight="bold">proof</text>
<text x="110" y="195" text-anchor="middle" font-size="13">Groth16, PLONK (§7.7, 7.8)</text>
<line x1="200" y1="51" x2="224" y2="51" stroke="currentColor" stroke-width="1.5"/>
<polygon points="230,51 222,47 222,55" fill="currentColor"/>
<line x1="410" y1="51" x2="434" y2="51" stroke="currentColor" stroke-width="1.5"/>
<polygon points="440,51 432,47 432,55" fill="currentColor"/>
<line x1="530" y1="82" x2="530" y2="142" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,148 526,140 534,140" fill="currentColor"/>
<line x1="440" y1="179" x2="416" y2="179" stroke="currentColor" stroke-width="1.5"/>
<polygon points="410,179 418,175 418,183" fill="currentColor"/>
<line x1="230" y1="179" x2="206" y2="179" stroke="currentColor" stroke-width="1.5"/>
<polygon points="200,179 208,175 208,183" fill="currentColor"/>
</svg>
<figcaption>Figure 7.4. The road from a statement to a proof. The first three boxes only rewrite the statement; the polynomial in the fourth is where the verifier's work collapses to one check; the last two hide that check from the prover.</figcaption>
</figure>

## 7.3 Rank-1 constraint systems, by hand

*Level: intermediate.*

A circuit is a picture. To compute with it we need a uniform algebraic form, and
the one most SNARKs of the 2010s used is the **rank-1 constraint system**, R1CS.

### The witness vector

First collect every value in the circuit into one vector, the **witness vector**
$s$. For our example we fix the order

$$
s = (\,1,\; x,\; \mathit{out},\; \mathit{sym}_1,\; y,\; \mathit{sym}_2\,) = (1,\; 3,\; 35,\; 9,\; 27,\; 30).
$$

The leading 1 is always there; it lets a constraint use constants, since
"5" is just 5 times the first entry. Then come the public values (here only
$\mathit{out}$; often the public inputs too) and then the private ones. The
verifier will know $1$ and $35$; the other four entries are the prover's secret.
In the zero-knowledge vocabulary of [Chapter 5](05-Zero-Knowledge-Proofs.md), the
*statement* is "there exist private entries making the system hold with
$\mathit{out} = 35$", and the private entries are the *witness*. (Usage is loose:
many people call the whole vector the witness.)

### One constraint per gate

An R1CS is a list of constraints of a single shape:

$$
(A_k \cdot s) \times (B_k \cdot s) = (C_k \cdot s), \qquad k = 1, \dots, m,
$$

where $A_k$, $B_k$, $C_k$ are rows of numbers and "$\cdot$" is the dot product.
Each side is a *linear combination* of the wires; the only multiplication is the
one between the two left factors. (The name: the constraint says a quadratic form
of rank one, $(A_k \cdot s)(B_k \cdot s)$, equals a linear one.) Stack the rows
into matrices $A$, $B$, $C$ with $m$ rows and one column per entry of $s$.

Now write each gate in this shape.

- **Gate 1**, $\mathit{sym}_1 = x \cdot x$. The left factor is $x$, so
  $A_1 = (0, 1, 0, 0, 0, 0)$, which picks out the second entry of $s$. The right
  factor is also $x$: $B_1 = (0, 1, 0, 0, 0, 0)$. The result is $\mathit{sym}_1$:
  $C_1 = (0, 0, 0, 1, 0, 0)$.
- **Gate 2**, $y = \mathit{sym}_1 \cdot x$: $A_2 = (0, 0, 0, 1, 0, 0)$,
  $B_2 = (0, 1, 0, 0, 0, 0)$, $C_2 = (0, 0, 0, 0, 1, 0)$.
- **Gate 3**, $\mathit{sym}_2 = y + x$. There is no multiplication, but the shape
  demands one, so multiply by 1: $(x + y) \times 1 = \mathit{sym}_2$. The left row
  has two ones, $A_3 = (0, 1, 0, 0, 1, 0)$; the right row picks out the constant,
  $B_3 = (1, 0, 0, 0, 0, 0)$; and $C_3 = (0, 0, 0, 0, 0, 1)$.
- **Gate 4**, $\mathit{out} = \mathit{sym}_2 + 5$: $(5 + \mathit{sym}_2) \times 1 = \mathit{out}$,
  so $A_4 = (5, 0, 0, 0, 0, 1)$, $B_4 = (1, 0, 0, 0, 0, 0)$,
  $C_4 = (0, 0, 1, 0, 0, 0)$.

The three matrices, with the columns labeled by the entries of $s$:

$$
A = \begin{pmatrix}
0 & 1 & 0 & 0 & 0 & 0\\
0 & 0 & 0 & 1 & 0 & 0\\
0 & 1 & 0 & 0 & 1 & 0\\
5 & 0 & 0 & 0 & 0 & 1
\end{pmatrix},\quad
B = \begin{pmatrix}
0 & 1 & 0 & 0 & 0 & 0\\
0 & 1 & 0 & 0 & 0 & 0\\
1 & 0 & 0 & 0 & 0 & 0\\
1 & 0 & 0 & 0 & 0 & 0
\end{pmatrix},
$$

$$
C = \begin{pmatrix}
0 & 0 & 0 & 1 & 0 & 0\\
0 & 0 & 0 & 0 & 1 & 0\\
0 & 0 & 0 & 0 & 0 & 1\\
0 & 0 & 1 & 0 & 0 & 0
\end{pmatrix},
\qquad \text{columns: } (1,\ x,\ \mathit{out},\ \mathit{sym}_1,\ y,\ \mathit{sym}_2).
$$

### Checking the witness by hand

Multiply each row by $s = (1, 3, 35, 9, 27, 30)$:

| Gate | $A_k \cdot s$ | $B_k \cdot s$ | product | $C_k \cdot s$ |
|---|---|---|---|---|
| 1 | $x = 3$ | $x = 3$ | 9 | $\mathit{sym}_1 = 9$ |
| 2 | $\mathit{sym}_1 = 9$ | $x = 3$ | 27 | $y = 27$ |
| 3 | $x + y = 30$ | $1$ | 30 | $\mathit{sym}_2 = 30$ |
| 4 | $5 + \mathit{sym}_2 = 35$ | $1$ | 35 | $\mathit{out} = 35$ |

Every product equals its right side, so $s$ satisfies the system. Try a wrong
answer, $x = 2$, computed honestly gate by gate: $s = (1, 2, 35, 4, 8, 10)$. Gates 1
to 3 hold ($2 \cdot 2 = 4$, $4 \cdot 2 = 8$, $2 + 8 = 10$), but gate 4 says
$15 \times 1 = 35$, which is false. The prover cannot fix it by changing
$\mathit{sym}_2$ to 30, because then gate 3 fails; every wire is pinned by the
gate that produces it, and the chain runs back to $x$.

### Code it

```python
# R1CS for x^3 + x + 5 = 35. Witness order: [one, x, out, sym1, y, sym2].
A = [[0, 1, 0, 0, 0, 0],    # gate 1:  x    * x = sym1
     [0, 0, 0, 1, 0, 0],    # gate 2:  sym1 * x = y
     [0, 1, 0, 0, 1, 0],    # gate 3: (x + y) * 1 = sym2
     [5, 0, 0, 0, 0, 1]]    # gate 4: (5 + sym2) * 1 = out
B = [[0, 1, 0, 0, 0, 0],
     [0, 1, 0, 0, 0, 0],
     [1, 0, 0, 0, 0, 0],
     [1, 0, 0, 0, 0, 0]]
C = [[0, 0, 0, 1, 0, 0],
     [0, 0, 0, 0, 1, 0],
     [0, 0, 0, 0, 0, 1],
     [0, 0, 1, 0, 0, 0]]

def dot(row, s):
    return sum(r * v for r, v in zip(row, s))

def check(s):
    ok = True
    for k in range(4):
        a, b, c = dot(A[k], s), dot(B[k], s), dot(C[k], s)
        print(f"  gate {k + 1}: {a} * {b} = {a * b}, C gives {c}", "ok" if a * b == c else "FAILS")
        ok = ok and a * b == c
    return ok

def witness(x, out=35):              # what the prover computes, gate by gate
    sym1 = x * x
    y = sym1 * x
    sym2 = x + y
    return [1, x, out, sym1, y, sym2]

print("honest, x = 3:", witness(3))
print(check(witness(3)))
print("false, x = 2 claimed to give 35:", witness(2))
print(check(witness(2)))
```

Output:

```
honest, x = 3: [1, 3, 35, 9, 27, 30]
  gate 1: 3 * 3 = 9, C gives 9 ok
  gate 2: 9 * 3 = 27, C gives 27 ok
  gate 3: 30 * 1 = 30, C gives 30 ok
  gate 4: 35 * 1 = 35, C gives 35 ok
True
false, x = 2 claimed to give 35: [1, 2, 35, 4, 8, 10]
  gate 1: 2 * 2 = 4, C gives 4 ok
  gate 2: 4 * 2 = 8, C gives 8 ok
  gate 3: 10 * 1 = 10, C gives 10 ok
  gate 4: 15 * 1 = 15, C gives 35 FAILS
False
```

Notice the split between the two functions. `witness` is the prover's code: it
computes the wire values, in any way it likes. `check` is all the verifier will
ever test. Nothing forces the prover to run `witness`; a cheating prover may put
any numbers it wants into $s$, and only the constraints stand in its way. That
split is the root of the circuit bugs in §7.10.

### Additions are free

Gates 3 and 4 spend two constraints on additions, which is wasteful. Since a
linear combination can stand on either side, they merge into one constraint,
$(x + y + 5) \times 1 = \mathit{out}$, and even that can be folded into gate 2:
$\mathit{sym}_1 \times x = \mathit{out} - x - 5$. Two constraints suffice for the
whole statement. Real compilers do this automatically, which is why the cost of a
circuit is quoted in multiplications. This chapter keeps four constraints so that
each one matches a gate of Figure 7.3.

### Why R1CS is enough, and why it is not the end

R1CS can express any computation that a circuit can, so any statement in NP: "I
know a preimage of this hash", "I know a signature on this message under one of
these keys", "this batch of transactions takes the ledger from root $R$ to root
$R'$". Deciding whether an R1CS has a solution is NP-complete, just like circuit
satisfiability.

But the R1CS on its own is no help to a verifier. To check it, the verifier
needs the whole witness vector and does work proportional to the number of
constraints, millions in a real circuit. That is exactly the cost we set out to
avoid. The next step compresses all $m$ constraints into a single statement about
polynomials.

## 7.4 Quadratic arithmetic programs

*Level: intermediate.*

The trick, due to GGPR in 2013, is to give every constraint an address on the
number line and to build polynomials that take the right values at those
addresses. Then "all $m$ constraints hold" becomes "one polynomial is divisible by
another", and divisibility can be tested at a single point.

### Addresses for the gates

Assign gate $k$ to the point $x = k$ in $\mathbb{F}_{89}$: gates 1, 2, 3, 4 live at
$x = 1, 2, 3, 4$. (Real systems use the powers of a root of unity instead, so
that the fast Fourier transform applies; see below.)

Now take the column of $A$ that belongs to the wire $x$. Down the four gates it
reads $(1, 0, 1, 0)$: the wire $x$ appears in the left factor of gates 1 and 3.
Make a polynomial $A_x(t)$ that takes exactly those values at $t = 1, 2, 3, 4$. Do
the same for every column of $A$, $B$ and $C$: eighteen polynomials in all, many
of them zero. This is **Lagrange interpolation**, done in
[Polynomials at work](../mathematics/11-Polynomials-at-Work.md) with proofs; here is
what it needs.

### Lagrange interpolation by hand

The **Lagrange basis** for the points $1, 2, 3, 4$ consists of four cubic
polynomials, each equal to 1 at one point and 0 at the other three:

$$
L_j(x) = \prod_{m \ne j} \frac{x - m}{j - m}.
$$

Work out $L_1$ in $\mathbb{F}_{89}$. The numerator is
$(x - 2)(x - 3)(x - 4) = x^3 - 9x^2 + 26x - 24$. The denominator is
$(1 - 2)(1 - 3)(1 - 4) = -6$. Dividing by $-6$ in $\mathbb{F}_{89}$ means
multiplying by its inverse: $6 \cdot 15 = 90 = 89 + 1$, so $6^{-1} = 15$ and
$(-6)^{-1} = -15 = 74$. Multiply each coefficient by 74 and reduce:

$$
\begin{aligned}
-24 \cdot 74 &= -1776 \equiv 4, & 26 \cdot 74 &= 1924 \equiv 55,\\
-9 \cdot 74 &= -666 \equiv 46, & 1 \cdot 74 &= 74,
\end{aligned}
$$

so $L_1(x) = 74x^3 + 46x^2 + 55x + 4$. Check it: at $x = 1$ the sum is
$74 + 46 + 55 + 4 = 179 = 2 \cdot 89 + 1 \equiv 1$. At $x = 2$, 3 or 4 a factor of
the numerator vanishes, so $L_1$ is 0. The other three basis polynomials come the
same way, with denominators $2$, $-2$ and $6$.

With the basis in hand, any column becomes a polynomial by adding up basis
polynomials: the column of $x$ in $A$, with values $(1, 0, 1, 0)$, is
$A_x = L_1 + L_3$.

### The three polynomials of the witness

The prover does not need the eighteen column polynomials separately. It needs
their combinations weighted by the witness:

$$
A(x) = \sum_i s_i A_i(x), \qquad B(x) = \sum_i s_i B_i(x), \qquad C(x) = \sum_i s_i C_i(x).
$$

At the gate point $x = k$ each $A_i(k)$ is the entry of row $k$ of $A$, so
$A(k) = A_k \cdot s$, the left factor of gate $k$. In other words, **$A(x)$ is the
cubic through the left factors of the four gates**, $B(x)$ the cubic through the
right factors, $C(x)$ through the results. From the table of §7.3:

| $x$ | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| $A(x)$ | 3 | 9 | 30 | 35 |
| $B(x)$ | 3 | 3 | 1 | 1 |
| $C(x)$ | 9 | 27 | 30 | 35 |
| $A(x)B(x) - C(x)$ | 0 | 0 | 0 | 0 |

The last row is the whole point. At each of the four gate points,
$A \cdot B - C$ is zero, because that gate is satisfied.

### Divisibility by the target polynomial

Let $P(x) = A(x)B(x) - C(x)$, a polynomial of degree at most 6. It has roots at
1, 2, 3 and 4, so by the factor theorem it is divisible by each of $x - 1$, $x - 2$,
$x - 3$, $x - 4$, and hence by their product, the **target polynomial** (also
called the vanishing polynomial)

$$
Z(x) = (x - 1)(x - 2)(x - 3)(x - 4) = x^4 - 10x^3 + 35x^2 - 50x + 24.
$$

So there is a quotient polynomial $H(x)$, of degree at most $6 - 4 = 2$, with

$$
A(x)\,B(x) - C(x) = H(x)\,Z(x).
$$

The converse holds as well: if such an $H$ exists, then at every gate point the
right side is zero, so the left side is zero, so every gate is satisfied. We have
proved the central equivalence:

$$
s \text{ satisfies the R1CS} \iff Z(x) \text{ divides } A(x)B(x) - C(x).
$$

A list of $m$ separate checks has become one divisibility. That object, the
column polynomials together with $Z$, is a **quadratic arithmetic program**
(QAP). In the papers the column polynomials are written $u_i$, $v_i$, $w_i$ and the
target $t(x)$; Groth16 in §7.7 uses those names.

### Code it

The code builds the Lagrange basis, interpolates every column, combines them with
the witness, and divides $P$ by $Z$. Polynomials are lists of coefficients, lowest
power first.

```python
# From R1CS to QAP over the field F_89, by Lagrange interpolation at x = 1, 2, 3, 4.
p = 89
A = [[0, 1, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0], [0, 1, 0, 0, 1, 0], [5, 0, 0, 0, 0, 1]]
B = [[0, 1, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0]]
C = [[0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1], [0, 0, 1, 0, 0, 0]]
s = [1, 3, 35, 9, 27, 30]                  # the witness from the R1CS
xs = [1, 2, 3, 4]                          # gate k lives at the point x = k

# Polynomials are coefficient lists, lowest power first: [4, 55, 46, 74] is 4 + 55x + 46x^2 + 74x^3.
def padd(f, g):
    n = max(len(f), len(g))
    return [((f[i] if i < len(f) else 0) + (g[i] if i < len(g) else 0)) % p for i in range(n)]

def pmul(f, g):
    out = [0] * (len(f) + len(g) - 1)
    for i, a in enumerate(f):
        for j, b in enumerate(g):
            out[i + j] = (out[i + j] + a * b) % p
    return out

def pscale(f, c):
    return [a * c % p for a in f]

def pdivmod(f, g):                         # long division: f = q*g + r
    f, q = f[:], [0] * (len(f) - len(g) + 1)
    inv = pow(g[-1], p - 2, p)
    for i in range(len(q) - 1, -1, -1):
        q[i] = f[i + len(g) - 1] * inv % p
        for j, b in enumerate(g):
            f[i + j] = (f[i + j] - q[i] * b) % p
    return q, f[:len(g) - 1]

def lagrange(j):                           # L_j: 1 at xs[j], 0 at the other points
    num, den = [1], 1
    for m, xm in enumerate(xs):
        if m != j:
            num = pmul(num, [-xm % p, 1])
            den = den * (xs[j] - xm) % p
    return pscale(num, pow(den, p - 2, p))

L = [lagrange(j) for j in range(4)]
print("L_1 =", L[0])

def column_poly(M, i):                     # interpolate column i of M through the 4 gates
    f = [0]
    for k in range(4):
        f = padd(f, pscale(L[k], M[k][i]))
    return f

def combine(M):                            # A(x) = sum of s_i * A_i(x)
    f = [0]
    for i in range(6):
        f = padd(f, pscale(column_poly(M, i), s[i]))
    return f

print("A_1 (column of x in A) =", column_poly(A, 1))
Ax, Bx, Cx = combine(A), combine(B), combine(C)
print("A(x) =", Ax, " B(x) =", Bx, " C(x) =", Cx)
P = padd(pmul(Ax, Bx), pscale(Cx, p - 1))  # P = A*B - C
Z = [1]
for k in xs:
    Z = pmul(Z, [-k % p, 1])               # Z(x) = (x-1)(x-2)(x-3)(x-4)
H, R = pdivmod(P, Z)
print("P(x) =", P)
print("Z(x) =", Z)
print("H(x) =", H, " remainder =", R)
```

Output:

```
L_1 = [4, 55, 46, 74]
A_1 (column of x in A) = [8, 48, 5, 29]
A(x) = [43, 75, 83, 69]  B(x) = [86, 40, 84, 60]  C(x) = [48, 42, 20, 77]
P(x) = [1, 29, 24, 79, 81, 7, 46]
Z(x) = [24, 39, 35, 79, 1]
H(x) = [26, 22, 46]  remainder = [0, 0, 0, 0]
```

$L_1$ matches the hand computation. $Z(x)$ is $x^4 - 10x^3 + 35x^2 - 50x + 24$ with
$-10 \equiv 79$ and $-50 \equiv 39$. The remainder is zero: the honest witness
gives a polynomial divisible by $Z$, with quotient $H(x) = 46x^2 + 22x + 26$. The
coefficients look random, as numbers in $\mathbb{F}_{89}$ usually do; the
structure is in the values at the gate points, not in the coefficients.

### One more point, by hand

Here is the identity checked at $x = 5$, a point that is not a gate, entirely by
hand. The Lagrange weights at 5 are integers:

$$
L_1(5) = \tfrac{3 \cdot 2 \cdot 1}{-6} = -1,\quad
L_2(5) = \tfrac{4 \cdot 2 \cdot 1}{2} = 4,\quad
L_3(5) = \tfrac{4 \cdot 3 \cdot 1}{-2} = -6,\quad
L_4(5) = \tfrac{4 \cdot 3 \cdot 2}{6} = 4.
$$

(They add up to 1, as Lagrange weights always do.) Apply them to the rows of the
table:

$$
\begin{aligned}
A(5) &= -3 + 36 - 180 + 140 = -7 \equiv 82,\\
B(5) &= -3 + 12 - 6 + 4 = 7,\\
C(5) &= -9 + 108 - 180 + 140 = 59,\\
Z(5) &= 4 \cdot 3 \cdot 2 \cdot 1 = 24,\\
H(5) &= 26 + 22 \cdot 5 + 46 \cdot 25 = 1286 \equiv 40.
\end{aligned}
$$

Left side: $A(5)B(5) - C(5) = 82 \cdot 7 - 59 = 515 \equiv 70$ (since
$515 - 5 \cdot 89 = 70$). Right side: $H(5)Z(5) = 40 \cdot 24 = 960 \equiv 70$ (since
$960 - 10 \cdot 89 = 70$). They agree. That single comparison is, in miniature,
what a SNARK verifier does. The next section explains why it is enough.

### Real sizes and the fast Fourier transform

A real circuit has $m$ in the millions, so the prover interpolates polynomials of
degree in the millions. Done naively that costs $m^2$ operations. Real systems
place the gates at the $m$-th roots of unity $1, \omega, \omega^2, \dots,
\omega^{m-1}$ in $\mathbb{F}_p$ (the field is chosen so that $p - 1$ has a large
power of 2 as a factor). Then interpolation and evaluation are a number-theoretic
transform, the fast Fourier transform over a finite field, at a cost of about
$m \log m$ ([Polynomials at work](../mathematics/11-Polynomials-at-Work.md), §11.6
and §11.7), and the target polynomial becomes simply
$Z(x) = x^m - 1$, which anyone can evaluate with a few squarings.

## 7.5 One random point is enough

*Level: intermediate.*

The QAP says: the witness is good exactly when $A(x)B(x) - C(x) = H(x)Z(x)$ as
polynomials. Checking that identity coefficient by coefficient would cost as much
as the R1CS. Instead, the verifier checks it at a single point $r$, chosen at
random, as we just did by hand at $r = 5$. Why should one point be convincing?

### The Schwartz-Zippel lemma

The answer is an old and simple fact. A nonzero polynomial of degree $d$ over a
field has at most $d$ roots. (Each root $a$ splits off a factor $x - a$, and the
degrees of the factors cannot add up to more than $d$.) So if $r$ is chosen
uniformly from $\mathbb{F}_p$,

$$
\Pr\big[\,R(r) = 0\,\big] \;\le\; \frac{d}{p} \qquad \text{for any nonzero } R \text{ of degree} \le d.
$$

This one-variable case is all we need; the general statement for many variables,
proved by Jacob Schwartz (1980) and Richard Zippel (1979), and earlier by Richard
DeMillo and Richard Lipton (1978), is in
[Polynomials at work, §11.4](../mathematics/11-Polynomials-at-Work.md#114-schwartz-zippel-one-random-point-is-enough).
Two different polynomials of degree at most $d$ differ by a nonzero polynomial of
degree at most $d$, so **two different polynomials agree on at most $d$ points**.
Pick a point at random, and if they agree there, they are almost certainly the
same polynomial.

### Applying it to the QAP

Suppose the prover's witness is false. Then $Z$ does not divide $P = AB - C$, and
for *any* polynomial $H$ the prover might choose, $P - HZ$ is a nonzero polynomial.
Its degree is at most $2(m - 1)$, which is 6 in our example. So the check
$P(r) = H(r)Z(r)$ passes for at most 6 of the 89 values of $r$, a chance of at
most $6/89$, about 7 percent.

That is a poor guarantee, but only because 89 is tiny. In a real system with
$m = 2^{25}$, about 33 million constraints, and a 254-bit field, the chance is at
most $2^{26} / 2^{253} = 2^{-227}$. No one will ever see that happen.

There is a catch, and it is the subject of the rest of the chapter: the argument
assumes the polynomials were fixed *before* $r$ was chosen. Schwartz-Zippel is a
statement about a random $r$ and a fixed $R$. If the prover can choose its
polynomials after seeing $r$, the lemma says nothing.

### Code it

The code checks an honest and a false witness at a random point, counts at how
many of the 89 points each one would pass, and then plays a forger who knows the
point in advance.

```python
# One random point checks the whole computation (Schwartz-Zippel), and a prover who
# knows the point in advance can forge anything. Field F_89; gates at x = 1, 2, 3, 4.
import random
random.seed(7)                     # random is fine for a demo; real challenges use secrets
p = 89
xs = [1, 2, 3, 4]

def padd(f, g):
    n = max(len(f), len(g))
    return [((f[i] if i < len(f) else 0) + (g[i] if i < len(g) else 0)) % p for i in range(n)]

def pmul(f, g):
    out = [0] * (len(f) + len(g) - 1)
    for i, a in enumerate(f):
        for j, b in enumerate(g):
            out[i + j] = (out[i + j] + a * b) % p
    return out

def pdivmod(f, g):
    f, q = f[:], [0] * (len(f) - len(g) + 1)
    for i in range(len(q) - 1, -1, -1):
        q[i] = f[i + len(g) - 1] * pow(g[-1], p - 2, p) % p
        for j, b in enumerate(g):
            f[i + j] = (f[i + j] - q[i] * b) % p
    return q, f[:len(g) - 1]

def ev(f, x):
    return sum(c * pow(x, i, p) for i, c in enumerate(f)) % p

def interpolate(vals):             # the cubic through (1, vals[0]), ..., (4, vals[3])
    f = [0]
    for j, xj in enumerate(xs):
        num, den = [1], 1
        for xm in xs:
            if xm != xj:
                num, den = pmul(num, [-xm % p, 1]), den * (xj - xm) % p
        f = padd(f, [c * vals[j] * pow(den, p - 2, p) % p for c in num])
    return f

def qap(s):                        # gate values A.s, B.s, C.s -> P(x) = A(x)B(x) - C(x)
    one, x, out, sym1, y, sym2 = s
    A = interpolate([x, sym1, x + y, 5 + sym2])
    B = interpolate([x, x, one, one])
    C = interpolate([sym1, y, sym2, out])
    return padd(pmul(A, B), [(-c) % p for c in C])

Z = [24, 39, 35, 79, 1]            # (x-1)(x-2)(x-3)(x-4) mod 89

for name, s in (("honest x = 3", [1, 3, 35, 9, 27, 30]), ("false  x = 2", [1, 2, 35, 4, 8, 10])):
    P = qap(s)
    H, R = pdivmod(P, Z)           # the prover sends H, the best quotient it can find
    r = random.randrange(p)        # the verifier's challenge
    ok = ev(P, r) == ev(H, r) * ev(Z, r) % p
    fooled = [t for t in range(p) if ev(P, t) == ev(H, t) * ev(Z, t) % p]
    where = "" if len(fooled) == p else f": {fooled}"
    print(f"{name}: remainder {R}, check at r = {r}: {ok}, passes at {len(fooled)} of {p} points{where}")

# A forger who knows the secret point t needs no witness at all.
t = 42
a, b, c = 11, 22, 33               # nonsense values claimed for A(t), B(t), C(t)
h = (a * b - c) * pow(ev(Z, t), p - 2, p) % p
print("forger who knows t = 42:", (a * b - c) % p, "==", h * ev(Z, t) % p)
```

Output:

```
honest x = 3: remainder [0, 0, 0, 0], check at r = 41: True, passes at 89 of 89 points
false  x = 2: remainder [20, 82, 20, 56], check at r = 19: False, passes at 3 of 89 points: [1, 2, 3]
forger who knows t = 42: 31 == 31
```

The honest witness passes everywhere: its identity is true as polynomials. The
false witness leaves a remainder $R(x) = 56x^3 + 20x^2 + 82x + 20$, and the check
with the best quotient passes exactly where $R$ vanishes. Those turn out to be the
points 1, 2 and 3, and that is no accident: at a gate point $Z$ is zero, so the
check reduces to "gate $k$ holds", and gates 1 to 3 do hold for $x = 2$. Only
gate 4 fails, and a cubic remainder has room for only three roots. Figure 7.5
shows the two cases side by side. (A verifier would never choose $r$ among the gate
points; in a real field the chance of hitting one is negligible anyway.)

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="The 89 points of the field: the honest identity holds at all of them, the false one at only three" fill="currentColor" font-size="14">
<text x="40" y="34">honest witness: A·B − C = H·Z holds at all 89 points</text>
<circle cx="40.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="46.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="53.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="59.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="66.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="73.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="79.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="86.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="92.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="99.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="105.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="112.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="119.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="125.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="132.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="138.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="145.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="152.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="158.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="165.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="171.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="178.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="185.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="191.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="198.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="204.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="211.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="218.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="224.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="231.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="237.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="244.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="250.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="257.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="264.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="270.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="277.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="283.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="290.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="297.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="303.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="310.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="316.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="323.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="330.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="336.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="343.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="349.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="356.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="363.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="369.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="376.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="382.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="389.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="395.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="402.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="409.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="415.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="422.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="428.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="435.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="442.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="448.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="455.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="461.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="468.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="475.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="481.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="488.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="494.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="501.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="508.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="514.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="521.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="527.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="534.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="540.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="547.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="554.1" cy="56" r="2.6" fill="currentColor"/>
<circle cx="560.7" cy="56" r="2.6" fill="currentColor"/>
<circle cx="567.3" cy="56" r="2.6" fill="currentColor"/>
<circle cx="573.9" cy="56" r="2.6" fill="currentColor"/>
<circle cx="580.5" cy="56" r="2.6" fill="currentColor"/>
<circle cx="587.0" cy="56" r="2.6" fill="currentColor"/>
<circle cx="593.6" cy="56" r="2.6" fill="currentColor"/>
<circle cx="600.2" cy="56" r="2.6" fill="currentColor"/>
<circle cx="606.8" cy="56" r="2.6" fill="currentColor"/>
<circle cx="613.4" cy="56" r="2.6" fill="currentColor"/>
<circle cx="620.0" cy="56" r="2.6" fill="currentColor"/>
<text x="40" y="112">false witness (x = 2): it holds at only 3 of the 89 points</text>
<circle cx="40.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="46.6" cy="134" r="3.4" fill="currentColor"/>
<circle cx="53.2" cy="134" r="3.4" fill="currentColor"/>
<circle cx="59.8" cy="134" r="3.4" fill="currentColor"/>
<circle cx="66.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="73.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="79.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="86.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="92.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="99.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="105.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="112.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="119.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="125.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="132.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="138.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="145.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="152.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="158.6" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="165.2" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="171.8" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="178.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="185.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="191.6" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="198.2" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="204.8" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="211.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="218.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="224.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="231.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="237.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="244.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="250.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="257.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="264.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="270.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="277.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="283.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="290.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="297.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="303.6" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="310.2" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="316.8" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="323.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="330.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="336.6" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="343.2" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="349.8" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="356.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="363.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="369.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="376.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="382.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="389.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="395.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="402.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="409.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="415.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="422.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="428.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="435.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="442.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="448.6" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="455.2" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="461.8" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="468.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="475.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="481.6" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="488.2" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="494.8" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="501.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="508.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="514.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="521.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="527.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="534.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="540.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="547.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="554.1" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="560.7" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="567.3" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="573.9" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="580.5" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="587.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="593.6" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="600.2" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="606.8" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="613.4" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<circle cx="620.0" cy="134" r="2.4" fill="none" stroke="currentColor" stroke-width="0.9" opacity="0.6"/>
<text x="40.0" y="160" text-anchor="middle" font-size="12">0</text>
<text x="53.2" y="160" text-anchor="middle" font-size="12">1 2 3</text>
<text x="620.0" y="160" text-anchor="middle" font-size="12">88</text>
<line x1="66.4" y1="142" x2="96.4" y2="178" stroke="currentColor" stroke-width="1"/>
<text x="100.4" y="190" font-size="13">gate 4 fails, so the check fails here and at 85 other points</text>
</svg>
<figcaption>Figure 7.5. The check $A(r)B(r) - C(r) = H(r)Z(r)$ at every point $r$ of $\mathbb{F}_{89}$. For the honest witness it holds everywhere; for the false one it holds only where the remainder vanishes, 3 points of 89. In a 254-bit field the filled dots would be a few among $2^{254}$.</figcaption>
</figure>

### Break it: the forger who knows the point

The last line of the output is the warning. The forger knows the point $t = 42$
and has no witness at all. It picks three arbitrary numbers $a$, $b$, $c$ to claim
as $A(t)$, $B(t)$, $C(t)$, and then *solves* for the value of $H(t)$ that makes
the check pass: $h = (ab - c)/Z(t)$. The check passes, $31 = 31$, and proves
nothing.

So two things must be true in a real SNARK:

1. The prover must not know the evaluation point. Either it is chosen at random
   *after* the prover is bound to its polynomials (interactively, or by
   Fiat-Shamir from a hash of the prover's commitments), or it is fixed once and
   **hidden** so that the prover can compute with it but never learn it.
2. The values the prover reveals must really be evaluations of polynomials of the
   right form, built from the right columns with one consistent witness, not
   numbers picked to satisfy one equation.

PLONK (§7.8) takes the first route, with polynomial commitments and Fiat-Shamir.
Pinocchio and Groth16 take the second: the point is fixed in a setup ceremony and
then hidden inside elliptic-curve points. That is the next section.

## 7.6 Hiding the point: reference strings and pairings

*Level: expert.*

How can a prover evaluate a polynomial at a point it does not know? With the
same trick that makes Diffie-Hellman work: put the number in the exponent.

### Powers of a secret, in the exponent

Take a group of prime order $q$ with generator $g$, in which discrete logarithms
are hard: in real systems a pairing-friendly elliptic curve, here the order-89
subgroup of $\mathbb{Z}_{179}^*$ (since $179 = 2 \cdot 89 + 1$), with $g = 4$. The
exponents live in $\mathbb{F}_{89}$, the same field as our QAP; that is why this
chapter chose $p = 89$.

A **setup** picks a secret $\tau$ in $\mathbb{F}_q$ and publishes

$$
g,\; g^{\tau},\; g^{\tau^2},\; \dots,\; g^{\tau^d},
$$

then destroys $\tau$. This list is a **structured reference string** (SRS):
"reference string" because everyone uses the same one, "structured" because its
entries are related by a hidden secret, unlike a string of random bits. Elliptic-curve
papers write $g^{a}$ additively as $[a]_1$ (in the first group) or $[a]_2$ (in the
second), and so will §7.7.

Anyone holding the SRS can compute $g^{f(\tau)}$ for any polynomial
$f(x) = f_0 + f_1 x + \dots + f_d x^d$, without knowing $\tau$:

$$
g^{f(\tau)} = \left(g\right)^{f_0} \left(g^{\tau}\right)^{f_1} \cdots \left(g^{\tau^d}\right)^{f_d}.
$$

This is the same computation as a KZG commitment
([Chapter 3](03-Commitments.md)); the SRS here is a KZG setup. Recovering
$\tau$ from $g^\tau$ is a discrete logarithm problem, so the prover learns nothing
about the point. The prover can now commit to $A(\tau)$, $B(\tau)$, $C(\tau)$ and
$H(\tau)$, values at a point it cannot predict and cannot choose. The forger's
trick from §7.5 fails, because the forger would need $Z(\tau)$ as a number to
solve for $H(\tau)$.

### Multiplying in the exponent: pairings

The verifier now holds four group elements and wants to check

$$
A(\tau)\,B(\tau) - C(\tau) = H(\tau)\,Z(\tau),
$$

a relation between the hidden exponents. Additions are easy, since
$g^a \cdot g^b = g^{a+b}$. But the relation contains *products* of hidden
exponents, and computing $g^{ab}$ from $g^a$ and $g^b$ is the computational
Diffie-Hellman problem, believed hard. In an ordinary group the verifier is stuck.

A **pairing** is a map $e: G_1 \times G_2 \to G_T$ between groups of order $q$
with one property:

$$
e(g^a, h^b) = e(g, h)^{ab}.
$$

It lets you multiply two hidden exponents once, landing in the target group
$G_T$, where you can compare. Pairings exist on special elliptic curves; the
mathematics book builds one by hand in
[Counting points and pairings, §13.7](../mathematics/13-Counting-Points-and-Pairings.md#137-pairings),
and book 1 introduces them in [Chapter 15](../../book/15-Elliptic-Curves.md#pairings).
With a pairing, and $h$ a generator of the second group, the check becomes

$$
e\!\left(g^{A(\tau)},\, h^{B(\tau)}\right) = e\!\left(g^{C(\tau)},\, h\right) \cdot e\!\left(g^{H(\tau)},\, h^{Z(\tau)}\right).
$$

Expand with the pairing property and both sides are $e(g, h)$ raised to
$A(\tau)B(\tau)$ and to $C(\tau) + H(\tau)Z(\tau)$. They are equal exactly when the
QAP identity holds at $\tau$. The value $h^{Z(\tau)}$ is published in the setup,
since the verifier does not know $\tau$ either.

### Code it

Python's standard library has no pairings, and a toy pairing would hide the idea
under pages of curve arithmetic (the mathematics book has one, on a tiny curve).
So the code does what can be done in a plain group: it runs the setup, lets the
prover evaluate its QAP polynomials at the hidden point using only the SRS, and
then, because a demo can cheat, checks the result against the secret. The pairing
check the verifier would run is written out in the comments, with Groth16's own
equation below it so that you can see its shape before §7.7 explains it.

```python
# Hiding the point: evaluate polynomials "in the exponent" from a reference string.
# Toy group: the order-89 subgroup of Z_179^* (179 = 2*89 + 1), generator g = 4.
# Real SNARKs use a 255-bit pairing-friendly curve such as BN254 or BLS12-381.
import random
random.seed(2016)                      # demo only; a real setup uses secrets and then forgets t
q, p, g = 89, 179, 4

# --- setup (once): pick t, publish g^(t^i), destroy t -------------------------------
t = random.randrange(1, q)
srs = [pow(g, pow(t, i, q), p) for i in range(7)]      # degrees 0..6
print("reference string:", srs)

# --- prover: has the coefficient lists of the QAP of x^3 + x + 5 = 35, not t ----------
A = [43, 75, 83, 69]
B = [86, 40, 84, 60]
C = [48, 42, 20, 77]
H = [26, 22, 46]

def commit(f):                         # g^f(t) = product of (g^(t^i))^(f_i)
    out = 1
    for i, c in enumerate(f):
        out = out * pow(srs[i], c, p) % p
    return out

proof = [commit(f) for f in (A, B, C, H)]
print("g^A(t), g^B(t), g^C(t), g^H(t) =", proof)

# --- only the demo can do this: it still knows t -----------------------------------
def ev(f, x):
    return sum(c * pow(x, i, q) for i, c in enumerate(f)) % q
print("same as g^(f(t)) computed with t:", [pow(g, ev(f, t), p) for f in (A, B, C, H)])
Zt = (t - 1) * (t - 2) * (t - 3) * (t - 4) % q
print("exponents satisfy A*B - C = H*Z at t:", (ev(A, t) * ev(B, t) - ev(C, t)) % q == ev(H, t) * Zt % q)

# The verifier holds only group elements. Checking A(t)*B(t) = C(t) + H(t)*Z(t) needs a
# product of two hidden exponents, which a group alone cannot do. A pairing e(.,.) can:
#   e(g^A(t), h^B(t)) == e(g^C(t), h) * e(g^H(t), h^Z(t))      (h generates the second group)
# Groth16 (2016) checks one equation of the same shape on its three-element proof (A, B, C):
#   e(A, B) == e([alpha]_1, [beta]_2) * e(sum_i a_i [L_i]_1, [gamma]_2) * e(C, [delta]_2)
# where a_i are the public inputs, [L_i]_1 = [(beta*u_i(x) + alpha*v_i(x) + w_i(x))/gamma]_1
# come from the setup, and e([alpha]_1, [beta]_2) is computed once: three pairings per proof.
```

Output:

```
reference string: [4, 52, 80, 87, 13, 153, 151]
g^A(t), g^B(t), g^C(t), g^H(t) = [126, 36, 48, 125]
same as g^(f(t)) computed with t: [126, 36, 48, 125]
exponents satisfy A*B - C = H*Z at t: True
```

The prover's group elements, computed from the reference string alone, are
exactly $g$ raised to the polynomial values at the secret point. The exponents
satisfy the QAP identity at $t$, which is what the pairing check would confirm.
With $q = 89$ anyone could find $t$ by trying all 88 candidates; with a 255-bit
group no one can.

### What the naive scheme still lacks

The scheme above, "send $g^{A(\tau)}$, $g^{B(\tau)}$, $g^{C(\tau)}$, $g^{H(\tau)}$
and check one pairing equation", is not yet sound. Three holes remain, and the
real systems exist to close them.

**The prover might send polynomials that have nothing to do with the circuit.**
Here is a forgery against the naive scheme. Pick any numbers $a$, $b$, $h$. Send
$g^{a}$, $h^{b}$ and $g^{h}$, and compute $g^{Z(\tau)}$ from the SRS (the target
polynomial is public, so this is allowed). Then send
$g^{C} = g^{ab} \cdot \big(g^{Z(\tau)}\big)^{-h}$. The pairing equation balances,
because both sides are $e(g, h)^{ab}$, and no witness was used. The constant
polynomials $a$ and $b$ are perfectly legal combinations of the SRS; what is wrong
is that they are not $\sum s_i A_i(x)$ and $\sum s_i B_i(x)$ for the circuit's own
columns, and $C$ was not built from a polynomial at all.

The defense has two parts. First, the setup publishes not plain powers of $\tau$
but the circuit's column polynomials evaluated at $\tau$, $g^{A_i(\tau)}$ for each
wire, so the natural thing to compute is a combination of the right columns. Second,
a **knowledge-of-exponent** check forces the prover to use only those elements.
The setup also publishes $g^{\alpha A_i(\tau)}$ for a second secret $\alpha$, and the
prover must send its commitment twice, as $g^{A(\tau)}$ and $g^{\alpha A(\tau)}$; the
verifier checks $e(g^{\alpha A(\tau)}, h) = e(g^{A(\tau)}, h^{\alpha})$. The
assumption (Ivan Damgård stated a version of it in 1991) is that the only way to
produce such a pair without knowing $\alpha$ is to build both halves as the same
combination of the published pairs, so $A$ must be a combination of the columns.

**The prover might use different witnesses in $A$, $B$ and $C$.** Each of the
three must use the *same* coefficients $s_i$. Pinocchio adds one more secret
$\beta$ and publishes $g^{\beta(A_i(\tau) + B_i(\tau) + C_i(\tau))}$ for each wire;
a prover can produce the matching element only by using one set of coefficients
for all three.

**The proof might leak the witness.** The values $A(\tau)$, $B(\tau)$, $C(\tau)$
are fixed functions of the witness, so a verifier who guesses the witness could
test the guess. The fix uses the target polynomial once more: the prover adds a
random multiple of $Z$ to each polynomial,

$$
A'(x) = A(x) + \rho_A Z(x), \quad B'(x) = B(x) + \rho_B Z(x), \quad C'(x) = C(x) + \rho_C Z(x),
$$

and recomputes $H$ to match. Since $Z$ vanishes at every gate point, the values at
the gates, and so the validity of the witness, are untouched; but away from the
gates the values are uniformly random, and the proof says nothing about $s$.

Finally, the **public inputs** are handled by the verifier itself. The verifying
key contains $g^{A_i(\tau)}$ (or a combination) for each public wire, and the
verifier multiplies in the contribution of the public values it knows, so the
prover cannot claim a different output than the one the verifier sees.

Close all of these holes, carefully and with as few group elements as possible,
and you have a SNARK. Pinocchio did it with eight; Groth did it with three.

## 7.7 Pinocchio and Groth16

*Level: expert.*

### Pinocchio: the first practical SNARK

The idea of outsourcing a computation and getting back a cheap-to-check proof
was called **verifiable computation** by Rosario Gennaro, Craig Gentry and Bryan
Parno in 2010, but their scheme leaned on fully homomorphic encryption and was far
from practical. GGPR's quadratic programs, at EUROCRYPT 2013, gave a direct
construction. Within months Parno and Jon Howell at Microsoft Research, with
Gentry at IBM and Mariana Raykova, built it into a working system and presented
it at the IEEE Symposium on Security and Privacy in May 2013 as **Pinocchio:
Nearly Practical Verifiable Computation**.

Pinocchio had every piece of §7.2 to §7.6: a compiler that turned a subset of C
into an arithmetic circuit and a QAP, a setup that published the column
polynomials evaluated at a secret point, with the knowledge-of-exponent and
same-witness checks, and proofs of eight group elements, 288 bytes, whatever the
computation. Checking one took about ten milliseconds. Proving was slow, orders
of magnitude slower than running the C code natively, but for the first
time a general-purpose SNARK ran on real programs. The "nearly" in the title was
honest.

In 2014 Eli Ben-Sasson, Alessandro Chiesa, Eran Tromer and Madars Virza published
a variant of Pinocchio (now called BCTV14) together with **libsnark**, an
optimized C++ library, and a way to prove the execution of a small CPU. libsnark
became the engine of the first SNARK deployment, Zcash, and BCTV14 is the system
whose setup flaw §7.9 tells.

!!! note "Life story: Pinocchio"
    **Born:** 2013, Bryan Parno, Jon Howell (Microsoft Research), Craig Gentry
    (IBM) and Mariana Raykova, building on GGPR's quadratic arithmetic programs
    from the same year · **Purpose:** let a weak client check that a server
    ran a C program correctly, with a short non-interactive proof ·
    **Helped:** proofs of 288 bytes checked in about 10 ms; its variant BCTV14
    and libsnark powered Zcash from 2016 · **Retired:** superseded for new
    systems by Groth16 (2016) and then PLONK-family proofs · **Replaced by:**
    Groth16

### Groth16: three group elements

Jens Groth, at University College London, asked how small a pairing-based proof
could possibly be, and at EUROCRYPT 2016 answered: three group elements. His
scheme, universally called **Groth16**, uses the QAP of §7.4 in the papers'
notation: wire polynomials $u_i$, $v_i$, $w_i$ (our $A_i$, $B_i$, $C_i$), witness
values $a_i$ (our $s_i$) with $a_0 = 1$, public values $a_1, \dots, a_\ell$, and target
$t(x)$ (our $Z$) of degree $n$. Write $U = \sum a_i u_i(x)$, $V = \sum a_i v_i(x)$,
$W = \sum a_i w_i(x)$; a valid witness gives $UV = W + h(x)t(x)$.

**Setup.** Pick secrets $\alpha, \beta, \gamma, \delta, x$ in $\mathbb{F}_q$. (Groth's
$x$ is the secret evaluation point, the $\tau$ of §7.6, not the $x$ of our
example.) Publish, in the first group,

$$
\begin{aligned}
&[\alpha]_1,\ [\beta]_1,\ [\delta]_1,\ \big\{[x^i]_1\big\}_{i<n},\\
&\Big\{\big[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\gamma}\big]_1\Big\}_{i \le \ell},\\
&\Big\{\big[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\delta}\big]_1\Big\}_{i > \ell},\\
&\Big\{\big[\tfrac{x^i t(x)}{\delta}\big]_1\Big\}_{i \le n-2},
\end{aligned}
$$

and in the second group $[\beta]_2$, $[\gamma]_2$, $[\delta]_2$ and $\{[x^i]_2\}_{i<n}$.
Then destroy the five secrets.

**Prove.** Pick fresh random $r$ and $s$, and compute

$$
\begin{aligned}
A &= \alpha + U + r\delta, \qquad B = \beta + V + s\delta,\\
C &= \frac{\sum_{i>\ell} a_i\big(\beta u_i(x) + \alpha v_i(x) + w_i(x)\big) + h(x)t(x)}{\delta}\\
  &\qquad + sA + rB - rs\delta,
\end{aligned}
$$

all "in the exponent" from the published elements, as in §7.6: $[A]_1$ and $[C]_1$
in the first group, $[B]_2$ in the second. The proof is
$\pi = ([A]_1, [B]_2, [C]_1)$.

**Verify.** With the public values $a_1, \dots, a_\ell$ and $a_0 = 1$, compute
$[L]_1 = \sum_{i \le \ell} a_i \big[\tfrac{\beta u_i(x) + \alpha v_i(x) + w_i(x)}{\gamma}\big]_1$ and check

$$
e\big([A]_1, [B]_2\big) = e\big([\alpha]_1, [\beta]_2\big) \cdot e\big([L]_1, [\gamma]_2\big) \cdot e\big([C]_1, [\delta]_2\big).
$$

The first factor on the right is the same for every proof and is computed once,
so verification costs three pairings plus $\ell$ scalar multiplications for the
public inputs.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Groth16: the setup gives a proving key and a verifying key; the prover sends A, B, C; the verifier checks one pairing equation" fill="currentColor" font-size="14">
<rect x="170" y="12" width="300" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="34" text-anchor="middle" font-weight="bold">Setup for this circuit</text>
<text x="320" y="56" text-anchor="middle" font-size="13">secrets α, β, γ, δ, x: toxic waste</text>
<rect x="16" y="130" width="250" height="150" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="141" y="152" text-anchor="middle" font-weight="bold">Prover</text>
<text x="30" y="178" font-size="13">witness a, quotient h(x)</text>
<text x="30" y="200" font-size="13">fresh random r, s</text>
<text x="30" y="222" font-size="13">A = α + U + rδ  (in G1)</text>
<text x="30" y="244" font-size="13">B = β + V + sδ  (in G2)</text>
<text x="30" y="266" font-size="12">C = (priv + ht)/δ + sA + rB − rsδ</text>
<rect x="374" y="130" width="250" height="150" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="499" y="152" text-anchor="middle" font-weight="bold">Verifier</text>
<text x="388" y="178" font-size="13">public inputs a₁ … aℓ</text>
<text x="388" y="200" font-size="13">L = Σ aᵢ·Lᵢ  (from the key)</text>
<text x="388" y="226" font-size="13">e(A, B) = e(α, β)</text>
<text x="420" y="248" font-size="13">· e(L, γ) · e(C, δ)</text>
<text x="388" y="270" font-size="13">three pairings per proof</text>
<line x1="250" y1="68" x2="204" y2="124" stroke="currentColor" stroke-width="1.5"/>
<polygon points="200,128 202,118 208,122" fill="currentColor"/>
<text x="30" y="92" font-size="13">proving key:</text>
<text x="30" y="110" font-size="13">millions of points</text>
<line x1="410" y1="68" x2="480" y2="124" stroke="currentColor" stroke-width="1.5"/>
<polygon points="484,128 475,125 480,119" fill="currentColor"/>
<text x="452" y="100" font-size="13">verifying key: a few</text>
<line x1="266" y1="205" x2="366" y2="205" stroke="currentColor" stroke-width="1.5"/>
<polygon points="372,205 363,200 363,210" fill="currentColor"/>
<text x="320" y="194" text-anchor="middle" font-size="13">π = (A, B, C)</text>
<text x="320" y="224" text-anchor="middle" font-size="13">192 bytes</text>
</svg>
<figcaption>Figure 7.6. Groth16 on one page. The proof is two points of the first group and one of the second; on BLS12-381 that is 48 + 96 + 48 = 192 bytes.</figcaption>
</figure>

### Why the equation balances

Take logarithms base $e([1]_1, [1]_2)$, so that each pairing becomes a product
of exponents and the equation becomes $A \cdot B = \alpha\beta + L\gamma + C\delta$.
Expand the left side:

$$
\begin{aligned}
AB &= (\alpha + U + r\delta)(\beta + V + s\delta)\\
   &= \alpha\beta + \alpha V + \beta U + UV + \delta\big(s(\alpha + U) + r(\beta + V) + rs\delta\big)\\
   &= \alpha\beta + (\beta U + \alpha V + W) + h t\\
   &\qquad + \delta\big(s(\alpha + U) + r(\beta + V) + rs\delta\big),
\end{aligned}
$$

using $UV = W + ht$ in the last step. Now the right side. The term $L\gamma$ is
$\sum_{i \le \ell} a_i(\beta u_i + \alpha v_i + w_i)$, the public part of
$\beta U + \alpha V + W$. The term $C\delta$ is the private part of the same sum,
plus $ht$, plus

$$
\begin{aligned}
\delta(sA + rB - rs\delta) &= \delta\big(s(\alpha + U + r\delta) + r(\beta + V + s\delta) - rs\delta\big)\\
&= \delta\big(s(\alpha + U) + r(\beta + V) + rs\delta\big).
\end{aligned}
$$

Every term on the left appears on the right. The identity holds for an honest
prover.

Why it is *sound* is the hard part, and Groth proved it in the **generic group
model**, where the adversary can only combine group elements by the group
operations and pairings. Roughly: $\alpha$ and $\beta$ appear in $A$ and $B$ so that
the cross terms $\alpha V$ and $\beta U$ can only be cancelled by the published
combinations $\beta u_i + \alpha v_i + w_i$, which ties $A$, $B$ and $C$ to one
witness and to the circuit's own polynomials. Dividing the public part by
$\gamma$ and the private part by $\delta$ keeps a prover from shifting value
between the inputs the verifier sees and the ones it does not. And $r$ and $s$
make $A$ and $B$ uniformly random, which gives perfect zero knowledge: a
simulator who knew the secrets could produce the same distribution of proofs with
no witness at all.

### Sizes and costs

On the curve BN254, which Ethereum supports natively, a first-group point is 32
bytes compressed and a second-group point 64, so a Groth16 proof is 128 bytes (256
bytes in the uncompressed form Ethereum contracts receive). On BLS12-381, chosen
by Zcash in 2017, the proof is 192 bytes. Verification is three pairings, a few
milliseconds on a laptop. Proving is dominated by multi-scalar multiplications:
sums of millions of curve points, each multiplied by a field element, plus
number-theoretic transforms to compute $h(x)$. A circuit of a million constraints
proves in seconds on a good machine; Groth16 remains among the fastest provers for
a fixed circuit, as well as the smallest proof.

Groth also proved, in the same paper, that pairing-based SNARKs of the kind he
studied cannot have proofs of just one group element, so three is close to the
floor. Ten years on, Groth16 is still the default wherever the cost of verifying
on a blockchain matters most.

The price is in the setup. The proving key contains the circuit's own
polynomials, $(\beta u_i(x) + \alpha v_i(x) + w_i(x))/\delta$ for every private wire,
so the setup is **circuit-specific**: change one gate and a new ceremony is
needed. In practice the work splits in two. A universal *phase 1*, the powers of
$x$ in both groups (a "powers of tau" ceremony), can be shared by every circuit up
to a size. A shorter *phase 2* computes the circuit-specific elements, including
the division by $\delta$, from the phase 1 output.

!!! note "Life story: Groth16"
    **Born:** 2016, Jens Groth (University College London), EUROCRYPT 2016,
    "On the Size of Pairing-based Non-interactive Arguments" ·
    **Purpose:** the shortest possible pairing-based SNARK: three group
    elements, three pairings to check · **Helped:** Zcash's Sapling upgrade
    (2018), Filecoin's storage proofs, Tornado Cash, many identity and rollup
    systems on Ethereum, where its 128-byte proofs on BN254 are the cheapest to
    verify · **Status:** current and widely deployed; needs a trusted setup per
    circuit; broken by a quantum computer, like every pairing-based scheme

## 7.8 PLONK, universal setups and custom gates

*Level: expert.*

### One setup for every circuit

A ceremony per circuit is a heavy burden. Every bug fix, every new feature of a
rollup or a wallet means organizing participants, auditing their software and
publishing transcripts again. In 2018 Jens Groth, Markulf Kohlweiss, Mary Maller,
Sarah Meiklejohn and Ian Miers showed that a setup could be **universal** (one
SRS for all circuits up to a size bound) and **updatable** (anyone can add fresh
randomness at any time, and the result is secure if any one contributor was
honest). Their construction was impractical, with a quadratic-size SRS. Sonic
(Maller, Sean Bowe, Kohlweiss and Meiklejohn, 2019) made a universal SNARK with a
linear-size SRS, and then, in August 2019, Ariel Gabizon, Zachary Williamson and
Oana Ciobotaru published **PLONK**, whose name is an acronym that reads
"permutations over Lagrange-bases for oecumenical noninteractive arguments of
knowledge". Marlin, by Alessandro Chiesa and coauthors, appeared at about the same
time with a similar goal.

PLONK's SRS is nothing but powers of a secret, $[1]_1, [\tau]_1, \dots, [\tau^d]_1$ and
$[\tau]_2$: a KZG setup. It contains nothing about any circuit, so one ceremony
serves every PLONK circuit up to degree $d$. Ethereum's 2023 KZG ceremony, with
over 140,000 contributions, produced exactly this kind of string
([Chapter 3](03-Commitments.md) tells it).

### The gate equation

PLONK replaces R1CS with a table. Each row is a gate with three wires, left $a$,
right $b$ and output $c$, and five **selector** constants fixed by the circuit.
Every row must satisfy

$$
q_L\,a + q_R\,b + q_O\,c + q_M\,a b + q_C + \mathit{PI} = 0,
$$

where $\mathit{PI}$ carries a public input into the row. Selectors choose the gate
type: $q_M = 1, q_O = -1$ makes $ab = c$, a multiplication; $q_L = q_R = 1,
q_O = -1$ makes $a + b = c$, an addition; $q_L = 1, q_C = -5$ forces $a = 5$. Our
statement takes five rows:

| Row | $a$ | $b$ | $c$ | $q_L$ | $q_R$ | $q_O$ | $q_M$ | $q_C$ | $\mathit{PI}$ | meaning |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 3 | 3 | 9 | 0 | 0 | −1 | 1 | 0 | 0 | $x \cdot x = v_1$ |
| 1 | 9 | 3 | 27 | 0 | 0 | −1 | 1 | 0 | 0 | $v_1 \cdot x = v_2$ |
| 2 | 3 | 27 | 30 | 1 | 1 | −1 | 0 | 0 | 0 | $x + v_2 = v_3$ |
| 3 | 30 | 0 | 35 | 1 | 0 | −1 | 0 | 5 | 0 | $v_3 + 5 = \mathit{out}$ |
| 4 | 35 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | −35 | $\mathit{out} = 35$ |

### Copy constraints

The gate equation checks each row alone. Nothing in it says that the $x$ in row 0
is the same $x$ as in rows 1 and 2, or that row 1's $a$ is row 0's output. Those
links are **copy constraints**, and they are where PLONK earns its name. Number
the fifteen wire positions and group the ones that must be equal into cycles:
$x$ sits at $a_0, b_0, b_1, a_2$; $v_1$ at $c_0, a_1$; $v_2$ at $c_1, b_2$; $v_3$ at
$c_2, a_3$; $\mathit{out}$ at $c_3, a_4$. A permutation $\sigma$ sends each position
to the next one in its cycle. The values are consistent exactly when the list of
values does not change if each value is moved along $\sigma$.

PLONK checks this with a **grand product**. The verifier picks random $\beta$ and
$\gamma$ (by Fiat-Shamir, in practice) and the prover shows

$$
\prod_{i} \big(w_i + \beta \cdot i + \gamma\big) = \prod_{i} \big(w_i + \beta \cdot \sigma(i) + \gamma\big),
$$

where $w_i$ is the value at position $i$. If every cycle carries one value, the
right side is the left side with its factors reordered. If not, the two sides are
different polynomials in $\beta$ and $\gamma$, and by Schwartz-Zippel they differ at
a random point with overwhelming probability. The prover encodes the running
product as an accumulator polynomial and proves it steps correctly from row to
row.

### Code it

```python
# PLONK's two checks on x^3 + x + 5 = 35: every row obeys the gate equation
#   qL*a + qR*b + qO*c + qM*a*b + qC + PI = 0,
# and wires that must carry the same value do (copy constraints, by a grand product).
import random
random.seed(2019)                      # demo only; in PLONK beta and gamma come from Fiat-Shamir
p = 2**61 - 1                          # a prime; real PLONK uses a 255-bit field

#            qL  qR  qO  qM  qC   PI
selectors = [(0,  0, -1,  1,  0,   0),   # row 0: x * x = v1
             (0,  0, -1,  1,  0,   0),   # row 1: v1 * x = v2
             (1,  1, -1,  0,  0,   0),   # row 2: x + v2 = v3
             (1,  0, -1,  0,  5,   0),   # row 3: v3 + 5 = out
             (1,  0,  0,  0,  0, -35)]   # row 4: out = 35 (the public input)

# The 15 wire positions: a0..a4 are 0..4, b0..b4 are 5..9, c0..c4 are 10..14.
# Copy cycles: x at a0, b0, b1, a2; v1 at c0, a1; v2 at c1, b2; v3 at c2, a3; out at c3, a4.
cycles = [[0, 5, 6, 2], [10, 1], [11, 7], [12, 3], [13, 4]]
sigma = list(range(15))
for cyc in cycles:
    for k, pos in enumerate(cyc):
        sigma[pos] = cyc[(k + 1) % len(cyc)]

def gates_ok(w):
    a, b, c = w[0:5], w[5:10], w[10:15]
    return all((qL * a[i] + qR * b[i] + qO * c[i] + qM * a[i] * b[i] + qC + PI) % p == 0
               for i, (qL, qR, qO, qM, qC, PI) in enumerate(selectors))

def copies_ok(w):                      # prod (w_i + beta*i + gamma) == prod (w_i + beta*sigma(i) + gamma)
    beta, gamma = random.randrange(p), random.randrange(p)
    left = right = 1
    for i in range(15):
        left = left * (w[i] + beta * i + gamma) % p
        right = right * (w[i] + beta * sigma[i] + gamma) % p
    return left == right

honest = [3, 9, 3, 30, 35,   3, 3, 27, 0, 0,   9, 27, 30, 35, 0]
cheat  = [2, 9, 3, 30, 35,   2, 3, 27, 0, 0,   4, 27, 30, 35, 0]   # x = 2 in row 0 only
for name, w in (("honest", honest), ("cheat", cheat)):
    print(name, "gates:", gates_ok(w), " copies:", copies_ok(w))
```

Output:

```
honest gates: True  copies: True
cheat gates: True  copies: False
```

The cheat is instructive. Row by row, every gate holds: $2 \cdot 2 = 4$ in row 0,
and the later rows are copied from the honest table. But the prover has used
$x = 2$ in one gate and $x = 3$ in the others, and fed row 1 a value that row 0
never produced. Only the copy constraints catch it. A PLONK circuit with a missing
copy constraint has exactly this weakness, and it is one form of the
under-constrained bug of §7.10.

### From the table to a proof

The rest of PLONK follows the pattern of §7.4 and §7.5, with KZG commitments
([Chapter 3](03-Commitments.md); the algebra is in
[Polynomials at work, §11.8](../mathematics/11-Polynomials-at-Work.md#118-commitments-and-proofs-polynomials-as-evidence))
in place of a circuit-specific setup:

1. Interpolate each column of the table (the wires $a$, $b$, $c$ and, once and for
   all, the selectors and $\sigma$) into polynomials over the $n$-th roots of unity.
2. The prover commits to its wire polynomials with KZG: $[a(\tau)]_1$ and so on, one
   curve point each.
3. Fiat-Shamir gives $\beta, \gamma$; the prover commits to the accumulator
   polynomial of the grand product.
4. The gate identity and the accumulator's step rule must hold on every row, so
   their combination must be divisible by $Z_H(x) = x^n - 1$. The prover commits to
   the quotient.
5. Fiat-Shamir gives a random point $\zeta$. The prover opens every committed
   polynomial at $\zeta$ (and the accumulator also at the next row, $\zeta\omega$),
   with KZG opening proofs batched together.
6. The verifier recomputes the identity from the opened values, checks it equals
   the quotient times $Z_H(\zeta)$, and checks the openings with two pairings.

The one secret point of §7.6 has become two kinds of point: $\tau$, hidden in the
SRS and used only by KZG to bind the prover to its polynomials, and $\zeta$, a
public random point chosen after the commitments, where Schwartz-Zippel does its
work. Because the commitments come first, the forger of §7.5 has nothing to
adjust. A PLONK proof is about nine curve points and a handful of field elements,
under a kilobyte; verification is two pairings plus some scalar multiplications.
It is larger and slower to check than Groth16, and in return no circuit ever needs
its own ceremony.

### Custom gates and lookups

The gate equation is not sacred. A circuit designer can add selector columns and
terms for operations the circuit uses often. Our whole statement fits in one row
with a custom "cube" selector:

$$
q_K\, a^3 + q_L\, a + q_C = 0 \quad\text{with}\quad q_K = 1,\ q_L = 1,\ q_C = 5 - 35 = -30,
$$

which holds for $a = 3$ because $27 + 3 - 30 = 0$. Real circuits use custom gates
for the $x^5$ step of the Poseidon hash, for elliptic-curve point addition, and
for range checks. Each extra term raises the degree of the identity and so the
prover's cost per row, but it can cut the number of rows many times over.

The other big addition is the **lookup argument**: proving that a wire's value
appears in a fixed table, such as all pairs of bytes with their XOR. Bit
operations, which cost dozens of constraints each in R1CS, become one lookup.
Gabizon and Williamson's **Plookup** (2020) added lookups to PLONK, and today's
proof systems use lookups everywhere. The family of tables with selectors, copy
constraints, custom gates and lookups is now called **PLONKish arithmetization**;
Halo 2, which Zcash adopted in 2022, is PLONKish with a different commitment
scheme that needs no trusted setup at all
([Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md)).

!!! note "Life story: PLONK"
    **Born:** August 2019, Ariel Gabizon, Zachary Williamson (Aztec) and Oana
    Ciobotaru, after Sonic (2019) and the updatable setups of Groth et al.
    (2018) · **Purpose:** a SNARK whose setup is universal and updatable, so
    one ceremony serves every circuit up to a size · **Helped:** custom gates and
    lookups (Plookup, 2020), the PLONKish arithmetization of Halo 2, and many
    zk-rollup provers; KZG-based PLONK runs on the 2023 Ethereum ceremony's
    output · **Status:** current; the basis of most new pairing-based systems,
    usually with lookups and custom gates added

## 7.9 Trusted setup and toxic waste

*Level: intermediate.*

### What the waste can do

The secrets of a setup, $\tau$ for PLONK and $\alpha, \beta, \gamma, \delta, x$ for
Groth16, are called **toxic waste**, and the name is fair. §7.5 showed what
knowledge of the point buys: a forger who knows it can pick any values and solve
for the quotient, producing a proof that checks for a statement that is false.
In a payment system that means minting money. In a rollup it means posting a new
ledger state that steals everyone's balances. In an identity system it means
proving you are anyone you like.

Two things the waste does *not* do are worth knowing. It does not reveal anyone's
witness: for Groth16, Georg Fuchsbauer showed in 2018 that proofs stay
zero-knowledge even if the setup was run by an enemy, provided the prover first
checks that the reference string is well formed. The waste threatens soundness,
not privacy. And it does not leave a trace: a forged proof is indistinguishable from a real
one. If the waste leaked, no one would know.

### Ceremonies

Since no single party can be trusted to destroy its secret, setups are run as
multi-party **ceremonies**. Each participant takes the current reference string,
mixes in a secret of their own, publishes the result with a proof that they did
it correctly, and destroys their secret. The final secret is the product of all
the individual secrets, so it is unknown unless *every* participant kept theirs
and they all pooled them. One honest participant out of hundreds or thousands is
enough. The great ceremonies, Zcash's six-person Sprout ceremony of 2016, the
powers-of-tau ceremonies behind Sapling, and Ethereum's KZG ceremony of 2023, are
told in [Chapter 3](03-Commitments.md). Here is the core step.

By hand first, in the toy group of §7.6 ($g = 4$ in $\mathbb{Z}_{179}^*$) with three
powers. The string starts as $(g, g, g)$, the powers of $t = 1$. A participant with
secret $s = 2$ raises the entries to $s^0, s^1, s^2$: $(4^1, 4^2, 4^4) = (4, 16, 256)$,
and $256 - 179 = 77$, so the string becomes $(4, 16, 77)$, which is
$(g^{1}, g^{2}, g^{4})$, the powers of $t = 2$. A second participant does the same
with their own secret, and so on. The code runs three participants with random
secrets.

```python
# A powers-of-tau ceremony in miniature: each participant mixes in a secret s,
# turning g^(t^i) into g^((t*s)^i). The final t is the product of all the secrets,
# so it stays unknown if even one participant forgets theirs.
import random
random.seed(1)                         # demo only; a participant would use secrets
q, p, g = 89, 179, 4                   # order-89 subgroup of Z_179^*
D = 6                                  # highest power needed

srs = [g] * (D + 1)                    # start from t = 1: every entry is g
secrets_used = []
for name in ("Ana", "Bo", "Chen"):
    s = random.randrange(1, q)
    srs = [pow(srs[i], pow(s, i, q), p) for i in range(D + 1)]
    secrets_used.append(s)
    print(f"{name:5s} mixes in a secret; srs now starts {srs[:4]}")

t = 1
for s in secrets_used:
    t = t * s % q                      # the toxic waste nobody should ever hold whole
print("srs == powers of the product:", srs == [pow(g, pow(t, i, q), p) for i in range(D + 1)])
# A real ceremony also proves each step was done right, with pairings:
#   e(srs[i+1], h) == e(srs[i], h^t)   for every i, so the powers are consistent,
# plus a proof that each participant knew their own s.
```

Output:

```
Ana   mixes in a secret; srs now starts [4, 47, 13, 147]
Bo    mixes in a secret; srs now starts [4, 46, 93, 68]
Chen  mixes in a secret; srs now starts [4, 82, 124, 77]
srs == powers of the product: True
```

Each participant raised the $i$-th entry to the power $s^i$, which turns
$g^{t^i}$ into $g^{(ts)^i}$, so the string is still a list of powers, now of the
product of the three secrets. (The demo keeps the secrets in a list to check the
result; a real participant destroys theirs.) This update is what makes PLONK's
setup "updatable": anyone can run one more step later, and if they are honest the
string is safe from then on, whatever happened before.

The ceremony protects against stolen or kept secrets. It cannot protect against a
string that is wrong by design. That is what happened to Zcash.

### Break it: the Sprout counterfeiting flaw

Zcash launched on 28 October 2016 with shielded payments proved by BCTV14, the
Pinocchio variant of §7.7, through libsnark, over the curve BN254. In a shielded
transaction, called a JoinSplit in that first version (Sprout), amounts and
addresses are hidden, and the SNARK proves that the hidden inputs and outputs
balance. If the proof could be forged, someone could create coins from nothing,
and because the amounts were encrypted, no one could see it happen.

On 1 March 2018, Ariel Gabizon, a cryptographer working for the company behind
Zcash, was preparing a talk about the setup ceremony when he noticed something
wrong. The BCTV14 setup produced elements in the proving key that the original
Pinocchio scheme did not have and that the protocol did not need. Gabizon showed
that with these extra elements a cheating prover could transform a valid proof of
one statement into a valid-looking proof of a different statement: in effect,
change the public part of what was proved. The paper's security proof had
missed it. No toxic waste was needed; the dangerous elements had been published,
correctly computed, in the parameters everyone downloaded in 2016.

The company kept the discovery to a very small group while it worked on a fix.
The next network upgrade, Sapling, was already planned; it introduced a new
circuit with Groth16 over the new curve BLS12-381, and it also moved Sprout's
proofs to Groth16 with fresh parameters, which removed the flaw. Sapling
activated on 28 October 2018, two years to the day after launch. The
vulnerability was disclosed on 5 February 2019, with Gabizon's paper "On the
security of the BCTV Pinocchio zk-SNARK variant" and CVE-2019-7167.

Had anyone exploited it? The company said it had found no evidence of
counterfeiting, while explaining that Sprout's privacy made complete certainty
impossible. What bounds the damage is a separate rule, added after the
disclosure: Zcash tracks the total value in each shielded pool, and since 2019
its consensus rules refuse any block that would make a pool's balance negative
(ZIP 209). Counterfeit coins inside Sprout cannot leave it in excess of the
value honestly put in.

The lesson reaches beyond Zcash. A SNARK's parameters are part of its security
proof, and every element in them must be justified by that proof. An extra
element that "can't hurt" may hand the prover a lever. Auditors of SNARK systems
now check the setup's output against the paper element by element.

!!! note "Life story: the Zcash Sprout counterfeiting flaw"
    **Born:** 2014, in the setup of the BCTV14 variant of Pinocchio, deployed in
    Zcash's launch on 28 October 2016; found by Ariel Gabizon on 1 March 2018 ·
    **Purpose:** none; extra elements in the proving key let a cheating prover
    turn a proof of one statement into a proof of another, enough to mint
    shielded coins unseen · **Helped:** a quiet fix in the Sapling upgrade of 28
    October 2018, disclosure on 5 February 2019 (CVE-2019-7167), and the habit of
    auditing reference strings element by element · **Retired:** fixed by moving
    Sprout's proofs to Groth16 in Sapling; no exploitation was found, though it
    could not be ruled out completely · **Replaced by:** Groth16 (2018), then Halo 2
    with no trusted setup (2022)

## 7.10 Circuit bugs: when the proof is right and the program is wrong

*Level: intermediate.*

Everything so far has been about making the proof system sound: if the
verifier accepts, the prover really knows a witness satisfying the constraints.
But the constraints are written by people, usually in a circuit language, and a
sound proof of the wrong constraints is worthless. Experience since 2016 is clear
on where things go wrong. Cryptographic breaks of Groth16 or PLONK themselves are
rare; mistakes in circuits are common.

### Under-constrained circuits

Recall the split in the R1CS code of §7.3: a `witness` function that the prover
runs, and a `check` function that is all the verifier ever tests. Circuit
languages have the same split. In Circom, `a <== b * c;` both computes `a` and
adds the constraint $a = b \cdot c$; `a <-- b / c;` only computes `a`, for
operations such as division or splitting into bits that are not a single
constraint; and `a * c === b;` only adds a constraint. Code written with `<--` is
a **hint**: it tells an honest prover what value to use, and binds a dishonest
one to nothing. If the author forgets to follow a hint with constraints that pin
the value down, the circuit is **under-constrained**: it accepts witnesses the
author never intended.

The honest prover's tests all pass, because the honest prover runs the hint. The
bug is invisible until someone writes a dishonest prover.

### Break it

Here is the chapter's own circuit with one constraint forgotten, and a range check
with the same kind of hole.

```python
# Under-constrained circuits: the verifier checks only the constraints, never the
# code that computed the witness. Field F_89.
p = 89

def accepts(constraints, w):
    return all(c(w) % p == 0 for c in constraints)

# The cube circuit of this chapter, written by someone who computed sym1 = x*x as a
# hint and forgot to constrain it (gate 1 is missing).
buggy = [lambda w: w["sym1"] * w["x"] - w["y"],
         lambda w: w["x"] + w["y"] - w["sym2"],
         lambda w: w["sym2"] + 5 - w["out"]]
fixed = [lambda w: w["x"] * w["x"] - w["sym1"]] + buggy

def forge(x, out=35):                  # a cheating prover works backwards from out
    sym2 = (out - 5) % p
    y = (sym2 - x) % p
    sym1 = y * pow(x, p - 2, p) % p    # whatever makes sym1 * x = y
    return {"x": x, "sym1": sym1, "y": y, "sym2": sym2, "out": out}

w = forge(1)
print("x = 1 gives x^3 + x + 5 =", (1 + 1 + 5) % p, "but the buggy circuit says", accepts(buggy, w))
print("x values the buggy circuit accepts for out = 35:", sum(accepts(buggy, forge(x)) for x in range(1, p)))
print("x values the fixed circuit accepts for out = 35:",
      [x for x in range(1, p) if accepts(fixed, forge(x))])

# A range check: "the amount v is between 0 and 15" by writing v in four bits.
range_buggy = [lambda w: w["b0"] + 2 * w["b1"] + 4 * w["b2"] + 8 * w["b3"] - w["v"]]
range_fixed = range_buggy + [lambda w, i=i: w[f"b{i}"] * (w[f"b{i}"] - 1) for i in range(4)]
minus_one = {"v": p - 1, "b0": p - 1, "b1": 0, "b2": 0, "b3": 0}   # v = -1, a negative amount
print("amount -1 (= 88) passes the buggy range check:", accepts(range_buggy, minus_one))
print("amount -1 passes the fixed range check:      ", accepts(range_fixed, minus_one))
```

Output:

```
x = 1 gives x^3 + x + 5 = 7 but the buggy circuit says True
x values the buggy circuit accepts for out = 35: 88
x values the fixed circuit accepts for out = 35: [3]
amount -1 (= 88) passes the buggy range check: True
amount -1 passes the fixed range check:       False
```

Without gate 1, $\mathit{sym}_1$ is free. The cheater picks any nonzero $x$, works
backwards from $\mathit{out} = 35$, and chooses $\mathit{sym}_1 = y / x$ to make gate 2
hold. Every one of the 88 nonzero values of $x$ is accepted, so the "proof that I
know a cube root" proves nothing. With the constraint restored, only $x = 3$ works
(the cubic $x^3 + x - 30$ happens to have just that one root in $\mathbb{F}_{89}$).
A SNARK built on the buggy circuit would be perfectly sound, and would soundly
prove a statement nobody meant.

The range check fails the same way and does more damage. The author meant "$v$ is
a 4-bit number" and wrote "$v = b_0 + 2b_1 + 4b_2 + 8b_3$", forgetting that
nothing says the $b_i$ are bits. In $\mathbb{F}_{89}$, $b_0 = 88$ is allowed, and $88$
is $-1$. A payment circuit with this bug accepts a negative amount, which, added
to the other outputs, creates money. The fix is one constraint per bit,
$b_i(b_i - 1) = 0$, which in a field has only the solutions 0 and 1. The bit
decomposition must also be short enough that the sum cannot wrap around $p$; a
"range check" with 254 bits in a 254-bit field can still overflow.

### The usual suspects

The same few mistakes recur across audits:

- **A hint with no constraint**, as in the first example: division, square
  roots, bit splits and comparisons are computed with `<--` and never checked.
- **Missing booleanity or range checks**, as in the second: values meant to be
  bits, bytes or 64-bit amounts that are really arbitrary field elements.
- **Field wrap-around**: forgetting that arithmetic is modulo $p$, so "$a < b$"
  has no meaning until both are decomposed into a bounded number of bits.
- **Public inputs not tied in**: a nullifier, Merkle root or recipient computed
  inside the circuit but never constrained to equal the public value the contract
  checks. In 2019 several Ethereum verifier contracts were found to accept a
  public input $u$ and also $u + r$, where $r$ is the field order, as different
  inputs that verify identically; a "spent" nullifier could then be spent again.
- **Missing copy constraints** in PLONKish circuits, as in the cheat of §7.8: two
  cells meant to hold the same value that nothing links.

### Two incidents

In late 2019 a security researcher found that the MiMC hash template in
**circomlib**, the standard library of Circom circuits, assigned its output
without constraining it: the line used a plain assignment where `<==` was needed.
Tornado Cash, a mixer on Ethereum that uses Groth16 to prove "I am withdrawing a
deposit that is in the Merkle tree, and here is its nullifier", hashed its tree
with that template. A prover could make the circuit's computed Merkle root equal
whatever root it liked, and so prove membership of a deposit that never existed. The Tornado Cash developers used the flaw
themselves to move the funds out of the vulnerable contract into a fixed one
before anyone else could, and explained it afterward in a post titled "Tornado.cash
got hacked. By us."

!!! note "Life story: the circomlib MiMC bug"
    **Born:** 2019, in the MiMC template of circomlib, where one output was
    assigned but not constrained · **Purpose:** none; it left Tornado Cash's
    Merkle-tree hash unconstrained, so a prover could fake membership and drain
    the pool · **Helped:** a small fix (`<==` in place of a plain assignment), a rescue in which the
    developers drained their own contract to save users' funds, and a lasting
    example in every circuit-security course · **Retired:** fixed in circomlib
    in 2019 · **Replaced by:** the rule that every `<--` is followed by explicit
    constraints, checked by tools such as Circomspect (2022)

The second incident is recent, and some details are still settling. On 29 May
2026 a soundness flaw was reported in the circuit for Zcash's Orchard pool, the
Halo 2 circuit in use since 2022. Public accounts describe a missing check in the
Orchard "action" circuit that could have let a prover produce proofs for
transactions the circuit should have rejected, with reports variously describing
the risk as counterfeiting or double-spending. Because a circuit fix changes the
verifying key that every node has built in, it could not be patched in place.
Zcash first disabled Orchard transactions by an emergency soft fork on 2 June
2026, then restored them with a corrected circuit in the NU6.2 network upgrade on
3 June. On 28 July 2026 the NU6.3 upgrade opened a new shielded pool, Ironwood,
and sealed Orchard so that its coins can only leave, through a turnstile that
publishes the amount ([Chapter 18](18-Privacy-on-Ledgers.md), §18.9). At the
time of writing no exploitation has been publicly confirmed; check
the Zcash developers' own reports for the final account.

!!! note "Life story: the Orchard circuit flaw"
    **Born:** 2022, in the Orchard action circuit of Zcash's NU5 upgrade; reported
    29 May 2026 · **Purpose:** none; a missing constraint left a soundness gap in
    a circuit that guards shielded value · **Helped:** showed that removing the
    trusted setup (Halo 2) removes one risk and leaves the circuit risk untouched;
    an emergency soft fork on 2 June 2026 and a fixed circuit in NU6.2 on 3 June ·
    **Status:** fixed; Orchard sealed behind a turnstile and replaced by the
    Ironwood pool in NU6.3 on 28 July 2026; the final public account of its cause and impact was still
    being written at the time of this chapter

### How common is it?

A 2024 study by Stefanos Chaliasos and colleagues collected 141 vulnerabilities
from audit reports, disclosures and bug trackers of SNARK projects between 2018
and 2024 and sorted them by layer. By their count about seven in ten were in the
circuits, and most of those were under-constrained circuits. Bugs in the proof
systems and their implementations, Frozen Heart among them
([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)), and in the setup, like
Zcash's in 2018, were real but far fewer.

### Fix it

No single tool removes the problem, but a few habits catch most of it:

- **Constrain every hint.** After each `<--`, write the constraint that checks
  it, such as `out * in === 1` after computing an inverse, plus whatever extra
  conditions make the result unique.
- **Test with a hostile prover.** Unit tests that run the honest witness
  generator prove only completeness. Mutate witnesses and check that the circuit
  rejects them, or ask a solver whether two different witnesses can give the same
  public output.
- **Use vetted gadgets.** Bit decompositions, comparisons, Merkle paths and
  hashes from audited libraries, rather than new ones written for each project.
- **Run the analyzers.** Static analyzers such as Trail of Bits' Circomspect flag
  `<--` without constraints and similar patterns; newer tools try to prove that a
  circuit's outputs are uniquely determined by its inputs.
- **Write the specification first.** A circuit can be audited only against a
  statement of what it is supposed to prove, written in plain mathematics.

## 7.11 In the real world

*Level: intermediate.*

| System | Since | Proof system | Curve and setup |
|---|---|---|---|
| Zcash Sprout | 2016 | BCTV14 (Pinocchio variant) | BN254; six-person ceremony |
| Ethereum precompiles | 2017 | verifies any BN254 pairing check | BN254 (EIP-196, EIP-197) |
| Zcash Sapling | 2018 | Groth16 | BLS12-381; multi-party ceremony |
| Tornado Cash | 2019 | Groth16 (Circom) | BN254; public ceremony |
| Filecoin | 2020 | Groth16 | BLS12-381 |
| Zcash Orchard | 2022 | Halo 2 (PLONKish) | Pallas and Vesta; no trusted setup |
| zkEVM rollups | 2023 | PLONK-family or STARK, wrapped in Groth16 or PLONK | BN254 for the on-chain check |

**Zcash** was the first large deployment and is still the reference point. Its
three shielded pools trace the history of the field: Pinocchio-style proofs in
2016, Groth16 in 2018, and Halo 2 in 2022, which removed the trusted setup. The
privacy story, and what a shielded pool can and cannot hide, is
[Chapter 18](18-Privacy-on-Ledgers.md).

**Ethereum** made SNARKs practical on a blockchain when the Byzantium upgrade of
October 2017 added precompiled contracts for addition, scalar multiplication and
pairing checks on BN254 (EIP-196 and EIP-197). EIP-1108, in the Istanbul upgrade
of December 2019, cut their prices; a pairing check now costs 45,000 gas plus
34,000 per pair, so a Groth16 verification, done as a check on four pairs, costs
about 181,000 gas for the pairings plus a few thousand per public input. That is
why Groth16 on BN254 remains the format of choice for proofs checked on Ethereum,
even when they are produced by other systems. BN254 was sold as a 128-bit curve
in 2016; better attacks on the discrete logarithm in its extension field have
since lowered the estimate to about 100 bits
([Cryptanalysis, Chapter 12](../cryptanalysis/12-Discrete-Logarithms.md)), which
is why newer systems prefer BLS12-381.

**Rollups.** A zk-rollup runs thousands of transactions off the main chain and
posts the new state with a proof that it follows from the old one by the rules.
Ethereum checks one short proof instead of re-executing every transaction. Several
**zkEVM** rollups, which prove the execution of Ethereum's own virtual machine,
opened to the public in 2023. Their provers typically produce a large proof with a
fast hash-based system, verify that proof inside a small Groth16 or PLONK circuit,
and post the small proof; recursion of this kind is in
[Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md), and the rollup design in
[Chapter 17](17-Consensus-and-Smart-Contracts.md).

**Storage and identity.** Filecoin, launched in 2020, has storage providers prove
with Groth16 that they hold the data they are paid to store, and generates
enormous numbers of proofs. Identity systems use SNARKs to prove something about
a credential without showing it: Semaphore lets a member of a group signal
anonymously on Ethereum; Sui's zkLogin (2023) lets a user prove they hold a valid
login token from an identity provider without revealing which account it names;
and several projects prove facts about the signed chip in an electronic passport,
such as nationality or age over 18. Anonymous credentials without SNARKs are in
[Chapter 14](14-Blind-Signatures-and-Anonymous-Credentials.md).

**What a quantum computer would do.** Every system in this chapter rests on
pairings, which Shor's algorithm breaks. A quantum attacker could compute the
toxic waste from the reference string and forge proofs at will. Proofs already
made would stay zero-knowledge, but soundness would be gone. The hash-based
alternatives, STARKs and FRI, are [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md);
the hard problems behind the post-quantum candidates are surveyed in
[Post-quantum cryptography, Chapter 4](../post-quantum/04-A-Field-Guide-to-Hard-Problems.md).

## 7.12 Going deeper

*Level: expert.*

**Why SNARKs need strong assumptions.** Craig Gentry and Daniel Wichs proved in
2011 that the soundness of a SNARG (a succinct non-interactive argument) for NP
cannot be proved by a black-box reduction to any *falsifiable* assumption, the
kind where a challenger can check whether an adversary has won. So every SNARK's
security rests on something stronger: knowledge-of-exponent assumptions, the
generic group model, the algebraic group model (in which Georg Fuchsbauer, Eike
Kiltz and Julian Loss gave a cleaner proof of Groth16 in 2018), or the random
oracle model. This is a real difference from, say, a Schnorr signature, and one
reason the field values implementations that have survived years of use.

**Linear PCPs and polynomial IOPs.** Groth16 fits a framework set out by Bitansky,
Chiesa, Ishai, Ostrovsky and Paneth (2013): a *linear interactive proof*, in
which the verifier's queries are linear functions of the proof, is compiled into
a SNARK by encoding the queries in the exponent. PLONK and Marlin fit a second
framework: a *polynomial interactive oracle proof* (the prover sends polynomials,
the verifier queries them at random points) combined with a *polynomial
commitment scheme* that makes the oracle concrete. Swap KZG for an inner-product
commitment and you get Halo 2; swap it for FRI over Merkle trees and you get a
STARK. Most modern systems are best understood as one choice from each column.

**Malleability.** A Groth16 proof can be changed without knowing the witness. For
any nonzero $k$, the triple $(kA, k^{-1}B, C)$ also verifies, because
$e(kA, k^{-1}B) = e(A, B)$; more generally a proof can be fully re-randomized.
That is harmless for soundness (the statement is unchanged) but bites systems that
treat the proof bytes as a unique identifier, or that do not bind the context
(the recipient, the chain, a nonce) into the public inputs. Groth and Maller
(2017) built simulation-extractable variants that rule out mauling; the cheaper
practical rule is to put everything that must not change into the public input.

**Where the prover's time goes.** For $m$ constraints the prover performs number
theoretic transforms costing $O(m \log m)$ field operations and multi-scalar
multiplications of length about $m$, which Pippenger's bucket method computes
roughly $\log m$ times faster than one scalar multiplication per point. In practice the
multi-scalar multiplications dominate, which is why proving has moved to GPUs and
specialized hardware, and why systems with linear-time provers and hash-based
commitments are an active line of research.

**Fiat-Shamir in practice.** PLONK is an interactive protocol made
non-interactive by hashing. Every value the verifier would have seen before
choosing a challenge must go into the hash: the circuit description, the public
inputs, all earlier commitments. The 2022 Frozen Heart disclosures found
implementations of PLONK and Bulletproofs that left some of these out, allowing
forged proofs ([Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)).

**Recursion and curve cycles.** A SNARK verifier is itself a computation, so it
can be proved by another SNARK. Doing so efficiently needs the verifier's curve
arithmetic to be native to the outer circuit's field, which leads to pairs of
curves whose group orders and base fields swap (MNT4/MNT6, and the Pasta curves
Pallas and Vesta used by Halo 2), and to folding schemes such as Nova that defer
most of the work. That is the subject of [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md).

**Formal verification of circuits.** Since most failures are in circuits, a
growing body of work checks them mechanically: proving that every output signal
is uniquely determined by the inputs, or that a circuit implements a reference
function written in an ordinary language. It cannot replace a correct
specification, but it turns "did we forget a constraint?" from a question for
auditors into one a machine can sometimes answer.

## Check yourself

??? question "1. What does each word of 'succinct non-interactive argument of knowledge' promise?"

    Succinct: the proof is short and quick to check, independent of the size of
    the computation. Non-interactive: a single message from prover to verifier,
    checkable by anyone later. Argument: soundness holds only against
    computationally bounded provers. Of knowledge: a prover that convinces the
    verifier must actually know a witness, which an extractor could recover.

??? question "2. Flatten $y = x^4 + x$ into gates. How many constraints does it cost?"

    $\mathit{sym}_1 = x \cdot x$, $\mathit{sym}_2 = \mathit{sym}_1 \cdot \mathit{sym}_1$,
    $y = \mathit{sym}_2 + x$. Two multiplications, so two constraints; the
    addition folds into the second one as $\mathit{sym}_1 \times \mathit{sym}_1 = y - x$.

??? question "3. Why does the witness vector begin with the constant 1?"

    So that constraints can use constants. Each side of an R1CS constraint is a
    linear combination of the entries of $s$; the constant 5 is written as 5 times
    the first entry. Without it, gate 4's "$+ 5$" could not be expressed.

??? question "4. Write the rows $A$, $B$, $C$ for the merged constraint $(x + y + 5) \times 1 = \mathit{out}$, with the order $(1, x, \mathit{out}, \mathit{sym}_1, y, \mathit{sym}_2)$."

    $A = (5, 1, 0, 0, 1, 0)$, $B = (1, 0, 0, 0, 0, 0)$, $C = (0, 0, 1, 0, 0, 0)$.
    With $s = (1, 3, 35, 9, 27, 30)$: $A \cdot s = 35$, $B \cdot s = 1$,
    $C \cdot s = 35$, and $35 \times 1 = 35$.

??? question "5. Using Lagrange weights at $x = 6$, compute $A(6)$ in $\mathbb{F}_{89}$ from the gate values $(3, 9, 30, 35)$."

    The weights are $L_1(6) = \tfrac{4 \cdot 3 \cdot 2}{-6} = -4$,
    $L_2(6) = \tfrac{5 \cdot 3 \cdot 2}{2} = 15$, $L_3(6) = \tfrac{5 \cdot 4 \cdot 2}{-2} = -20$,
    $L_4(6) = \tfrac{5 \cdot 4 \cdot 3}{6} = 10$ (they add to 1). Then
    $A(6) = -12 + 135 - 600 + 350 = -127 \equiv 51$, which is what the polynomial
    $69x^3 + 83x^2 + 75x + 43$ gives at 6.

??? question "6. A circuit has 1,000 constraints over a 254-bit field. What are the degrees of $P = AB - C$ and $H$, and what is the chance a false witness passes the check at a random point?"

    $A$, $B$, $C$ have degree at most 999, so $P$ has degree at most 1,998 and $H$
    at most $1{,}998 - 1{,}000 = 998$. A false witness leaves $P - HZ$ nonzero of
    degree at most 1,998, so the chance is at most $1998 / 2^{253} \approx 2^{-242}$.

??? question "7. Why must the prover not know the evaluation point, and how do Groth16 and PLONK keep it hidden?"

    If the prover knows the point $t$, it can choose any values for $A(t)$,
    $B(t)$, $C(t)$ and solve for $H(t) = (A(t)B(t) - C(t))/Z(t)$, passing the check
    with no witness (the forger of §7.5). Groth16 fixes $t$ in a setup and
    publishes only group elements $[t^i]$, so the prover can evaluate in the
    exponent but not learn $t$. PLONK binds the prover to its polynomials with KZG
    commitments first, then derives the random point by Fiat-Shamir from those
    commitments.

??? question "8. Show that if $(A, B, C)$ is a valid Groth16 proof, so is $(kA, k^{-1}B, C)$ for any nonzero $k$. Why might that matter?"

    The verification equation involves $A$ and $B$ only through $e(A, B)$, and
    $e(kA, k^{-1}B) = e(A, B)^{k \cdot k^{-1}} = e(A, B)$. So anyone can make a
    different-looking valid proof of the same statement. A system that uses proof
    bytes as a unique ID, for example to stop replays, can be fooled; bind
    replay-relevant data into the public inputs instead.

??? question "9. In the buggy range check, why is $b_0 = 88$ accepted, and why does $b(b - 1) = 0$ fix it?"

    The only constraint is $v = b_0 + 2b_1 + 4b_2 + 8b_3$, which $v = 88$, $b_0 = 88$
    satisfies; in $\mathbb{F}_{89}$, $88 = -1$, a negative amount. The polynomial
    $b(b - 1)$ has only the roots 0 and 1 in a field (a field has no zero divisors),
    so the constraint forces each $b_i$ to be a bit and then $v \le 15$.

??? question "10. Groth16 divides the public-input part of the setup by $\gamma$ and the private part by $\delta$. What would go wrong if the public elements were divided by $\delta$ too and placed in the proving key?"

    Then the prover would hold $[(\beta u_i + \alpha v_i + w_i)/\delta]_1$ for the
    public wires as well, and could add multiples of them into $C$. That moves
    contributions between the public part, which the verifier computes from the
    inputs it sees, and $C$, which it does not inspect. A prover could make a proof
    for one public input verify against another, the same kind of lever as the
    extra elements in the BCTV14 setup that put Zcash at risk.

## What you learned

- A SNARK is a short, single-message proof that a computation was done
  correctly, checkable in milliseconds whatever the computation's size. It is an
  argument (sound against bounded provers) of knowledge, and can be zero-knowledge.
- A statement is compiled into an arithmetic circuit over a finite field, then
  into an R1CS, one constraint $(A_k \cdot s)(B_k \cdot s) = C_k \cdot s$ per
  multiplication gate. For $x^3 + x + 5 = 35$ the witness is $(1, 3, 35, 9, 27, 30)$.
- Interpolating the columns over the gate points gives a QAP: the witness is valid
  exactly when $A(x)B(x) - C(x) = H(x)Z(x)$ for the target polynomial $Z$.
- By Schwartz-Zippel, checking that identity at one random point catches a false
  witness except with probability about (degree)/$p$, but only if the prover cannot
  choose its polynomials after learning the point.
- Groth16 hides the point in a structured reference string and checks the identity
  with pairings; its proof is three group elements (128 bytes on BN254, 192 on
  BLS12-381) and its check is one pairing equation. Its setup is per circuit.
- PLONK uses a gate table, copy constraints proved by a grand product, and KZG
  commitments over a universal, updatable setup; custom gates and lookups make
  circuits much smaller.
- Setup secrets are toxic waste: whoever holds them can forge. Ceremonies need one
  honest participant, but cannot fix a reference string that is wrong by design, as
  Zcash's Sprout flaw (found 2018, disclosed 2019) showed.
- Most real failures are under-constrained circuits: a hint never checked, a bit
  never forced to be a bit. A sound proof of the wrong circuit proves nothing.

**Next:** [Chapter 8](08-STARKs-Bulletproofs-and-Recursion.md), proofs with no
trusted setup: Bulletproofs, STARKs and the FRI test, and proofs that verify
other proofs.

## Further reading

- László Babai, Lance Fortnow, Leonid Levin and Mario Szegedy, "Checking
  Computations in Polylogarithmic Time" (STOC 1991).
- Sanjeev Arora, Carsten Lund, Rajeev Motwani, Madhu Sudan and Mario Szegedy,
  "Proof Verification and the Hardness of Approximation Problems" (FOCS 1992;
  *Journal of the ACM*, 1998).
- Joe Kilian, "A Note on Efficient Zero-Knowledge Proofs and Arguments" (STOC 1992).
- Silvio Micali, "CS Proofs" (FOCS 1994; *SIAM Journal on Computing*, 2000).
- Rosario Gennaro, Craig Gentry and Bryan Parno, "Non-interactive Verifiable
  Computing" (CRYPTO 2010).
- Jens Groth, "Short Pairing-Based Non-interactive Zero-Knowledge Arguments"
  (ASIACRYPT 2010).
- Aniket Kate, Gregory Zaverucha and Ian Goldberg, "Constant-Size Commitments to
  Polynomials and Their Applications" (ASIACRYPT 2010).
- Craig Gentry and Daniel Wichs, "Separating Succinct Non-Interactive Arguments
  from All Falsifiable Assumptions" (STOC 2011).
- Nir Bitansky, Ran Canetti, Alessandro Chiesa and Eran Tromer, "From Extractable
  Collision Resistance to Succinct Non-Interactive Arguments of Knowledge, and Back
  Again" (ITCS 2012).
- Rosario Gennaro, Craig Gentry, Bryan Parno and Mariana Raykova, "Quadratic Span
  Programs and Succinct NIZKs without PCPs" (EUROCRYPT 2013).
- Bryan Parno, Jon Howell, Craig Gentry and Mariana Raykova, "Pinocchio: Nearly
  Practical Verifiable Computation" (IEEE Symposium on Security and Privacy, 2013).
- Nir Bitansky, Alessandro Chiesa, Yuval Ishai, Rafail Ostrovsky and Omer Paneth,
  "Succinct Non-Interactive Arguments via Linear Interactive Proofs" (TCC 2013).
- Eli Ben-Sasson, Alessandro Chiesa, Eran Tromer and Madars Virza, "Succinct
  Non-Interactive Zero Knowledge for a von Neumann Architecture" (USENIX Security
  2014).
- [Jens Groth, "On the Size of Pairing-based Non-interactive Arguments"
  (EUROCRYPT 2016)](https://eprint.iacr.org/2016/260).
- Vitalik Buterin, "Quadratic Arithmetic Programs: from Zero to Hero" (2016): the
  source of the $x^3 + x + 5 = 35$ example.
- Jens Groth and Mary Maller, "Snarky Signatures: Minimal Signatures of Knowledge
  from Simulation-Extractable SNARKs" (CRYPTO 2017).
- Jens Groth, Markulf Kohlweiss, Mary Maller, Sarah Meiklejohn and Ian Miers,
  "Updatable and Universal Common Reference Strings with Applications to
  zk-SNARKs" (CRYPTO 2018).
- Georg Fuchsbauer, "Subversion-Zero-Knowledge SNARKs" (PKC 2018); Georg
  Fuchsbauer, Eike Kiltz and Julian Loss, "The Algebraic Group Model and its
  Applications" (CRYPTO 2018).
- Mary Maller, Sean Bowe, Markulf Kohlweiss and Sarah Meiklejohn, "Sonic:
  Zero-Knowledge SNARKs from Linear-Size Universal and Updatable Structured
  Reference Strings" (CCS 2019).
- [Ariel Gabizon, Zachary Williamson and Oana Ciobotaru, "PLONK: Permutations over
  Lagrange-bases for Oecumenical Noninteractive arguments of Knowledge"
  (2019)](https://eprint.iacr.org/2019/953).
- [Ariel Gabizon, "On the Security of the BCTV Pinocchio zk-SNARK Variant"
  (2019)](https://eprint.iacr.org/2019/119), with CVE-2019-7167 and the Zcash
  developers' disclosure of 5 February 2019.
- Ariel Gabizon and Zachary Williamson, "plookup: A Simplified Polynomial Protocol
  for Lookup Tables" (2020).
- Alessandro Chiesa, Yuncong Hu, Mary Maller, Pratyush Mishra, Noah Vesely and
  Nicholas Ward, "Marlin: Preprocessing zkSNARKs with Universal and Updatable SRS"
  (EUROCRYPT 2020).
- Stefanos Chaliasos and colleagues, "SoK: What Don't We Know? Understanding
  Security Vulnerabilities in SNARKs" (USENIX Security 2024).
- Justin Thaler, *Proofs, Arguments, and Zero-Knowledge* (2022): the standard text.
- Zcash Protocol Specification and ZIP 209 (shielded pool balances); EIP-196 and
  EIP-197 (2017) and EIP-1108 (2019) for Ethereum's pairing precompiles.
- Trail of Bits, "It Pays to Be Circomspect" (2022), on finding unconstrained
  signals in Circom.
- Reference pages: [Zero-knowledge](../../11-advanced/Zero-Knowledge.md) and
  [Commitments](../../11-advanced/Commitments.md); the one-section overview in
  [book 1, Chapter 23](../../book/23-Advanced-Protocols.md).
