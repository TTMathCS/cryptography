# 8. STARKs, Bulletproofs and Recursion

*Chapter 7 built short proofs on pairings and paid for them with a trusted
setup: a ceremony whose leftover secret could forge proofs, and a group that a
quantum computer would break. This chapter removes both. You will shrink two
vectors by hand until a proof of their inner product fits in a few group
elements (Bulletproofs, 2018), prove a number lies in a range the way Monero
has done since 2018, turn a computation into a table and the table into
polynomials, test that a function is a low-degree polynomial by folding it in
half (FRI, inside every STARK), and commit to it with nothing but a hash
function. Then you will make proofs that check other proofs, and fold two
claims into one (Halo, 2019; Nova, 2021), which is how zero-knowledge virtual
machines and rollups prove millions of steps today.*

!!! abstract "In this chapter"
    **You will learn:**

    - what "transparent" means for a proof system, and what you give up to get it;
    - the inner-product argument: how one halving step keeps the claim true while
      the vectors shrink, and why Bulletproofs are small but slow to verify;
    - how a range proof shows that a hidden amount is not negative, and why
      Monero's fees fell by about 90 percent when it adopted one;
    - execution traces and algebraic intermediate representations (AIR), in plain
      words, and why a STARK reduces everything to one question: is this function
      close to a low-degree polynomial?
    - Reed-Solomon codes, Merkle commitments and the FRI folding test, worked by
      hand over the field of 17 elements;
    - why STARKs rest on hash functions alone, why that makes them plausibly
      post-quantum, and what it costs in proof size;
    - recursion: proofs that verify proofs, Halo's accumulation trick and Nova's
      folding of two claims into one;
    - how to choose between Groth16, PLONK, Bulletproofs and STARKs.

    **You need:** [Chapter 7](07-SNARKs.md) (circuits, R1CS, polynomial
    commitments, the Schwartz-Zippel test), [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md)
    (Fiat-Shamir), [Chapter 3](03-Commitments.md) (Pedersen commitments and Merkle
    trees), and arithmetic modulo a prime. Polynomials and Reed-Solomon codes are
    in [Mathematics, chapter 11](../mathematics/11-Polynomials-at-Work.md) and
    [chapter 18](../mathematics/18-Error-Correcting-Codes.md).

    **Levels:** §8.1 is for beginners; §8.2 to §8.7 and §8.10 are
    intermediate; §8.8, §8.9 and §8.11 are expert.

## 8.1 The problem

*Level: beginner.*

[Chapter 7](07-SNARKs.md) ended with a remarkable object. A Groth16 proof is
three group elements, under 200 bytes, and it convinces anyone in a few
milliseconds that a computation with millions of steps was done correctly. The
price was written in the setup. Before the first proof, someone has to pick
secret numbers, publish group elements built from them, and destroy the
secrets. Whoever keeps a copy can forge proofs that look perfect. Zcash ran its
first ceremony in 2016 with six participants in different places, who
destroyed their computers afterward, and the whole cryptocurrency rested on the
hope that at least one of the six had really deleted their share.

There were three further worries. First, the setup is tied to one circuit
(Groth16) or to circuits up to one size (PLONK); a new program can mean a new
ceremony. Second, the verification equation uses **pairings**, and pairings
live on elliptic curves, whose discrete logarithm Shor's algorithm would solve
on a large quantum computer. A proof system that is meant to protect records
for decades should not have an expiry date built in. Third, pairing-friendly
curves are a narrow family, and the field you compute in is fixed by the curve,
which makes some computations awkward and slow.

So researchers asked a sharper question: **can a proof be short and checkable
when all the verifier's randomness is public, and nothing secret ever existed?**
A proof system with no secret setup is called **transparent**. The only shared
parameters are ones anyone can derive, for example by hashing a public string
into group generators, so nobody can know a trapdoor.

This chapter tells three answers, each with a different trade:

- **Bulletproofs** (2018) need only the discrete logarithm problem in an
  ordinary group, no pairings and no setup. Proofs are small, a few hundred
  bytes, and grow with the logarithm of the statement's size. The verifier,
  though, does work linear in the size of the statement.
- **STARKs** (2018) need only a hash function. Proofs are much larger, tens to
  hundreds of kilobytes, but the prover is fast, the verifier is fast, and no
  known quantum algorithm breaks the assumption.
- **Recursion** (Halo in 2019, Nova in 2021) is less a proof system than a way
  of using one: a proof that says "I checked the previous proof, and also one
  more step". It lets a long computation be proved in pieces, keeps the final
  proof small, and with Halo it removed the trusted setup from Zcash.

The history runs through a small number of groups. Jonathan Bootle, Andrea
Cerulli, Pyrros Chaidos, Jens Groth and Christophe Petit, at University College
London, published an inner-product argument in 2016. Benedikt Bünz, a Stanford
PhD student working with Dan Boneh, and Andrew Poelstra, Pieter Wuille and Greg
Maxwell, from the Bitcoin company Blockstream, made it shorter and aimed it at a
concrete need: proving that hidden amounts in a transaction are not negative.
That became Bulletproofs. In Israel, Eli Ben-Sasson and his colleagues at the
Technion had spent a decade on probabilistically checkable proofs, an area of
complexity theory many thought would never be practical. With Iddo Bentov, Yinon
Horesh and Michael Riabzev he built FRI in 2017 and STARKs in 2018, and the four
founded the company StarkWare to deploy them. Sean Bowe, Jack Grigg and Daira
Hopwood, at the Electric Coin Company behind Zcash, found a way to make
recursive proofs without any setup in 2019. Abhiram Kothapalli, Srinath Setty
and Ioanna Tzialla, at Carnegie Mellon and Microsoft Research, found in 2021
that you do not even need to verify a proof inside a proof: you can fold two
claims into one. Figure 8.1 puts these events in order.

<figure class="mars-fig">
<svg viewBox="0 0 640 448" width="640" role="img" aria-label="Timeline from Valiant's incrementally verifiable computation in 2008 to the 2025 result on Reed-Solomon conjectures" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="440" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Valiant: incrementally verifiable computation</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">2014</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">Recursive SNARKs on a cycle of curves (BCTV)</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="74" r="3.5"/>
<text x="108" y="79">Bootle et al.: inner-product argument; IOPs (BCS)</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">FRI low-degree test; Bulletproofs preprint</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="126" r="3.5"/>
<text x="108" y="131">STARK paper; Bulletproofs at IEEE S&amp;P</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="152" r="4.5"/>
<text x="108" y="157">18 Oct: Monero switches on Bulletproofs</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="178" r="3.5"/>
<text x="108" y="183">Halo: recursion with no trusted setup</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">StarkEx in production; accumulation schemes</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="230" r="3.5"/>
<text x="108" y="235">Nova folding; Starknet alpha on Ethereum</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="256" r="4.5"/>
<text x="108" y="261">Zcash Orchard on Halo 2; Monero Bulletproofs+</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="282" r="3.5"/>
<text x="108" y="287">Plonky2: fast recursion over a 64-bit field</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="308" r="4.5"/>
<text x="108" y="313">Flaw found in Nova's cycle-of-curves code; fixed</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="334" r="3.5"/>
<text x="108" y="339">Circle STARKs over Mersenne-31; general zkVMs</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2025</text>
<circle cx="92" cy="360" r="4.5"/>
<text x="108" y="365">Strongest Reed-Solomon conjectures shown false</text>
<text x="108" y="400" opacity="0.75">Larger dots: events where a deployed system</text>
<text x="108" y="420" opacity="0.75">changed or a weakness was found.</text>
</svg>
<figcaption>Figure 8.1. Transparent proofs and recursion, from theory to deployment. The ideas are older than the systems: incrementally verifiable computation waited eleven years for a practical setup-free construction.</figcaption>
</figure>

### What "small" and "fast" mean here

Every proof system in this book has three costs, and it helps to name them now,
for a statement whose circuit has $n$ gates:

- **proof size**: how many bytes the prover sends;
- **prover time**: how long it takes to make the proof, usually at least
  proportional to $n$, since the prover must at least run the computation;
- **verifier time**: how long checking takes.

A system is called **succinct** when proof size and verifier time are both much
smaller than $n$, say proportional to $\log n$ or $\log^2 n$, or constant.
Groth16 is succinct with constant size and constant verification. STARKs are
succinct with $\log^2 n$ size and verification. Bulletproofs have $\log n$ size
but linear verification, so strictly they are not succinct, and that one fact
explains both where they are used (short statements, such as a 64-bit range)
and why Halo was invented.

There is a fourth cost that is easy to forget: **assumptions**. Groth16 rests
on pairing assumptions in the "generic group" model and on the setup. PLONK
with KZG rests on a pairing assumption and a universal setup. Bulletproofs rest
on the discrete logarithm problem alone. STARKs rest on a hash function behaving
like a random function. The fewer and older the assumptions, the more people
trust the system to last.

## 8.2 The inner-product argument

*Level: intermediate.*

### The claim

Many statements about hidden numbers can be rewritten as one **inner product**.
For two vectors $\mathbf{a} = (a_1, \ldots, a_n)$ and
$\mathbf{b} = (b_1, \ldots, b_n)$ of numbers modulo a prime $q$, the inner
product is

$$
\langle \mathbf{a}, \mathbf{b} \rangle = a_1 b_1 + a_2 b_2 + \cdots + a_n b_n \bmod q .
$$

A range proof, as §8.3 shows, comes down to proving that two hidden vectors
have a given inner product. So does checking a whole arithmetic circuit,
after more algebra. The inner-product argument is the engine.

The vectors are hidden inside a **Pedersen vector commitment**, the
many-number version of the commitment of [Chapter 3](03-Commitments.md). Take a
group of prime order $q$ in which discrete logarithms are hard, and $2n + 1$
generators $g_1, \ldots, g_n$, $h_1, \ldots, h_n$ and $u$, chosen by hashing a
public string so nobody knows any relation between them. The prover publishes

$$
P = g_1^{a_1} \cdots g_n^{a_n} \cdot h_1^{b_1} \cdots h_n^{b_n} \cdot u^{\langle \mathbf{a}, \mathbf{b} \rangle} .
$$

Write $\mathbf{g}^{\mathbf{a}}$ for $g_1^{a_1} \cdots g_n^{a_n}$, so
$P = \mathbf{g}^{\mathbf{a}} \mathbf{h}^{\mathbf{b}} u^{\langle \mathbf{a}, \mathbf{b} \rangle}$.
The claim is: **I know $\mathbf{a}$ and $\mathbf{b}$ such that $P$ has this
form.** Because nobody knows a relation among the generators, a prover who can
open $P$ in this shape is bound to one pair of vectors (opening it two ways
would reveal a relation, which is a discrete logarithm).

The obvious proof is to send $\mathbf{a}$ and $\mathbf{b}$: $2n$ numbers. The
verifier recomputes $P$ and compares. That is linear in size, and it reveals
everything. The inner-product argument sends about $2 \log_2 n$ group elements
instead.

### One halving step

Split each vector into a left half and a right half:
$\mathbf{a} = (\mathbf{a}_L, \mathbf{a}_R)$, $\mathbf{b} = (\mathbf{b}_L, \mathbf{b}_R)$,
$\mathbf{g} = (\mathbf{g}_L, \mathbf{g}_R)$, $\mathbf{h} = (\mathbf{h}_L, \mathbf{h}_R)$,
each half of length $n/2$. The goal is a new claim of the same shape, about
vectors of half the length, that is true if and only if the old one was (with
overwhelming probability over a random challenge).

The natural idea is to add the halves with a random weight. Pick a challenge
$x$ and set

$$
\begin{aligned}
\mathbf{a}' &= x\,\mathbf{a}_L + x^{-1} \mathbf{a}_R, \\
\mathbf{b}' &= x^{-1} \mathbf{b}_L + x\,\mathbf{b}_R .
\end{aligned}
$$

The weights are opposite on purpose. Multiply out the new inner product:

$$
\begin{aligned}
\langle \mathbf{a}', \mathbf{b}' \rangle
 &= \langle \mathbf{a}_L, \mathbf{b}_L \rangle + \langle \mathbf{a}_R, \mathbf{b}_R \rangle \\
 &\quad + x^2 \langle \mathbf{a}_L, \mathbf{b}_R \rangle + x^{-2} \langle \mathbf{a}_R, \mathbf{b}_L \rangle .
\end{aligned}
$$

The first line is exactly the old inner product $\langle \mathbf{a}, \mathbf{b} \rangle$.
The second line is junk: two **cross terms**, $c_L = \langle \mathbf{a}_L, \mathbf{b}_R \rangle$
and $c_R = \langle \mathbf{a}_R, \mathbf{b}_L \rangle$, multiplied by $x^2$ and
$x^{-2}$. The trick of the protocol is that the prover commits to the cross
terms **before** seeing $x$. It sends two group elements,

$$
\begin{aligned}
L &= \mathbf{g}_R^{\mathbf{a}_L} \, \mathbf{h}_L^{\mathbf{b}_R} \, u^{c_L}, \\
R &= \mathbf{g}_L^{\mathbf{a}_R} \, \mathbf{h}_R^{\mathbf{b}_L} \, u^{c_R},
\end{aligned}
$$

then receives $x$. Both sides now compute new generators of half the length,

$$
\mathbf{g}' = \mathbf{g}_L^{x^{-1}} \circ \mathbf{g}_R^{x}, \qquad
\mathbf{h}' = \mathbf{h}_L^{x} \circ \mathbf{h}_R^{x^{-1}},
$$

where $\circ$ means entry by entry (the $i$-th new generator is
$g_{L,i}^{x^{-1}} g_{R,i}^{x}$), and a new commitment

$$
P' = L^{x^2} \cdot P \cdot R^{x^{-2}} .
$$

The claim is that $P' = \mathbf{g}'^{\mathbf{a}'} \mathbf{h}'^{\mathbf{b}'} u^{\langle \mathbf{a}', \mathbf{b}' \rangle}$,
a commitment of the same shape to the half-length vectors. Check the $g$ part:

$$
\mathbf{g}'^{\mathbf{a}'} = \mathbf{g}_L^{x^{-1}(x \mathbf{a}_L + x^{-1}\mathbf{a}_R)}
\mathbf{g}_R^{x(x \mathbf{a}_L + x^{-1}\mathbf{a}_R)}
= \mathbf{g}_L^{\mathbf{a}_L} \mathbf{g}_R^{\mathbf{a}_R} \cdot \mathbf{g}_R^{x^2 \mathbf{a}_L} \cdot \mathbf{g}_L^{x^{-2} \mathbf{a}_R} .
$$

The first two factors are the $g$ part of $P$. The third is the $g$ part of
$L^{x^2}$, the fourth the $g$ part of $R^{x^{-2}}$. The $h$ part works the same
way with the weights swapped, and the $u$ part is the inner-product identity
above: $u^{\langle \mathbf{a}, \mathbf{b} \rangle}$ from $P$, $u^{x^2 c_L}$
from $L^{x^2}$, $u^{x^{-2} c_R}$ from $R^{x^{-2}}$. Everything matches.

Why can the prover not cheat? If it chose $L$ and $R$ to make a false claim
look true, the new claim would hold for at most a few values of $x$ (the
relation is a polynomial identity in $x$ of low degree), and $x$ is chosen after
$L$ and $R$ are fixed. More precisely, the protocol has an **extractor** in the
sense of [Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md): from answers to
four different challenges with the same $L$ and $R$, one can solve for the
original $\mathbf{a}$ and $\mathbf{b}$. So a prover who can answer most
challenges must know a valid opening.

Repeat the step. After $\log_2 n$ halvings the vectors have length 1: single
numbers $a$ and $b$. The prover sends them, and the verifier checks
$P^{(\text{final})} = g^{a} h^{b} u^{ab}$ directly. The proof is the list of
$(L, R)$ pairs and the two final numbers: $2 \log_2 n$ group elements plus 2
numbers. For $n = 64$, that is 12 group elements and 2 numbers instead of 128
numbers. Figure 8.2 shows the shape.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Vectors of length 8 halve to 4, 2 and 1; at each step the prover sends L and R and receives a challenge" fill="currentColor" font-size="14">
<text x="20" y="28" font-weight="bold">prover's vectors</text>
<text x="430" y="28" font-weight="bold">sent to verifier</text>
<rect x="20" y="44" width="320" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="180" y1="44" x2="180" y2="74" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="100" y="64" text-anchor="middle">a_L (4)</text>
<text x="260" y="64" text-anchor="middle">a_R (4)</text>
<text x="350" y="64">n = 8</text>
<text x="430" y="64">L₁, R₁ → ← x₁</text>
<line x1="180" y1="78" x2="180" y2="100" stroke="currentColor" stroke-width="1.2"/>
<polygon points="180,106 175,97 185,97"/>
<rect x="100" y="108" width="160" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="180" y1="108" x2="180" y2="138" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="140" y="128" text-anchor="middle">2</text>
<text x="220" y="128" text-anchor="middle">2</text>
<text x="350" y="128">n = 4</text>
<text x="430" y="128">L₂, R₂ → ← x₂</text>
<line x1="180" y1="142" x2="180" y2="164" stroke="currentColor" stroke-width="1.2"/>
<polygon points="180,170 175,161 185,161"/>
<rect x="140" y="172" width="80" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="180" y1="172" x2="180" y2="202" stroke="currentColor" stroke-dasharray="4 3"/>
<text x="160" y="192" text-anchor="middle">1</text>
<text x="200" y="192" text-anchor="middle">1</text>
<text x="350" y="192">n = 2</text>
<text x="430" y="192">L₃, R₃ → ← x₃</text>
<line x1="180" y1="206" x2="180" y2="228" stroke="currentColor" stroke-width="1.2"/>
<polygon points="180,234 175,225 185,225"/>
<rect x="160" y="236" width="40" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="256" text-anchor="middle">a</text>
<text x="350" y="256">n = 1</text>
<text x="430" y="256">a, b → check</text>
<text x="20" y="290" opacity="0.8">Each step: new a = x·a_L + x⁻¹·a_R; the claim keeps its shape.</text>
</svg>
<figcaption>Figure 8.2. The inner-product argument on vectors of length 8. Three rounds of two group elements each, then two numbers: the proof grows by two elements each time the vector length doubles.</figcaption>
</figure>

### By hand, with $n = 2$

A group small enough to follow: the squares modulo $p = 23$ form a group of
prime order $q = 11$ (they are 1, 2, 3, 4, 6, 8, 9, 12, 13, 16, 18), so
exponents are taken modulo 11. Take generators $\mathbf{g} = (3, 2)$,
$\mathbf{h} = (4, 6)$, $u = 9$. In a group this small anyone can find the
discrete logarithm of 2 to the base 3, so the toy has no security at all; it is
here to check the arithmetic. Real systems use a 256-bit elliptic curve such as
Ristretto255 (Curve25519) or secp256k1.

The prover's vectors are $\mathbf{a} = (2, 6)$ and $\mathbf{b} = (6, 3)$.

1. The inner product is $2 \cdot 6 + 6 \cdot 3 = 30 \equiv 8 \pmod{11}$.
2. The commitment is
   $P = 3^2 \cdot 2^6 \cdot 4^6 \cdot 6^3 \cdot 9^8 = 9 \cdot 18 \cdot 2 \cdot 9 \cdot 13 \equiv 4 \pmod{23}$.
3. The cross terms are $c_L = a_1 b_2 = 2 \cdot 3 = 6$ and
   $c_R = a_2 b_1 = 6 \cdot 6 = 36 \equiv 3$.
4. The prover sends $L = g_2^{a_1} h_1^{b_2} u^{c_L} = 2^2 \cdot 4^3 \cdot 9^6 = 4 \cdot 18 \cdot 3 \equiv 9$
   and $R = g_1^{a_2} h_2^{b_1} u^{c_R} = 3^6 \cdot 6^6 \cdot 9^3 = 16 \cdot 12 \cdot 16 \equiv 13$.
5. The verifier picks $x = 2$. Then $x^{-1} = 6$ (since $2 \cdot 6 = 12 \equiv 1$),
   $x^2 = 4$ and $x^{-2} = 36 \equiv 3$.
6. The prover folds its vectors: $a' = 2 \cdot 2 + 6 \cdot 6 = 40 \equiv 7$ and
   $b' = 6 \cdot 6 + 3 \cdot 2 = 42 \equiv 9$. Their product is
   $63 \equiv 8$. As promised, $\langle \mathbf{a}, \mathbf{b} \rangle + x^2 c_L + x^{-2} c_R = 8 + 24 + 9 = 41 \equiv 8$.
7. Both sides fold the generators: $g' = 3^6 \cdot 2^2 = 16 \cdot 4 \equiv 18$ and
   $h' = 4^2 \cdot 6^6 = 16 \cdot 12 \equiv 8$.
8. The verifier computes $P' = L^4 \cdot P \cdot R^3 = 6 \cdot 4 \cdot 12 = 288 \equiv 12$.
9. The prover sends $a' = 7$, $b' = 9$. The verifier checks
   $g'^{7} h'^{9} u^{8} = 6 \cdot 9 \cdot 13 = 702 \equiv 12$. It matches $P'$.

With $n = 2$ the proof ($L$, $R$, $a'$, $b'$) is no shorter than the vectors.
The saving begins at $n = 4$ and grows quickly: at $n = 2^{20}$ the vectors are
two million numbers and the proof is 40 group elements and 2 numbers.

### Code it

The code builds a group of prime order $q = 1019$ inside $\mathbb{Z}_{2039}^*$
(with $p = 2q + 1$), derives generators by hashing, commits to two vectors of
length 8, and runs the halving step until the vectors have length 1. The
challenges come from hashing the transcript (Fiat-Shamir), so the proof is
non-interactive. It prints the vector length and checks the claim after every
step, which a real verifier cannot do (it does not know the vectors); the
printout is there to show the relation surviving.

```python
import hashlib

p, q = 2039, 1019                      # q prime, p = 2q + 1: a toy group of order q

def H(*parts):                         # hash anything to a number mod q
    data = "|".join(str(x) for x in parts).encode()
    return int.from_bytes(hashlib.sha256(data).digest(), "big") % q

def gen(label):                        # a generator nobody knows the log of
    return pow(H("gen", label) % (p - 3) + 2, 2, p)   # squaring lands in the order-q group

def multiexp(gs, es):                  # g1^e1 * g2^e2 * ...
    out = 1
    for g, e in zip(gs, es):
        out = out * pow(g, e % q, p) % p
    return out

def ip(a, b):
    return sum(x * y for x, y in zip(a, b)) % q

def commit(g, h, u, a, b):
    return multiexp(g, a) * multiexp(h, b) * pow(u, ip(a, b), p) % p

n = 8
g = [gen("g%d" % i) for i in range(n)]
h = [gen("h%d" % i) for i in range(n)]
u = gen("u")
a = [3, 1, 4, 1, 5, 9, 2, 6]
b = [2, 7, 1, 8, 2, 8, 1, 8]
P = commit(g, h, u, a, b)
print("n =", n, " <a,b> =", ip(a, b), " P =", P)

proof = []
while len(a) > 1:
    m = len(a) // 2
    aL, aR, bL, bR = a[:m], a[m:], b[:m], b[m:]
    gL, gR, hL, hR = g[:m], g[m:], h[:m], h[m:]
    L = multiexp(gR, aL) * multiexp(hL, bR) * pow(u, ip(aL, bR), p) % p
    R = multiexp(gL, aR) * multiexp(hR, bL) * pow(u, ip(aR, bL), p) % p
    x = H(P, L, R)                     # Fiat-Shamir: the challenge depends on L and R
    xi = pow(x, -1, q)
    a = [(x * l + xi * r) % q for l, r in zip(aL, aR)]
    b = [(xi * l + x * r) % q for l, r in zip(bL, bR)]
    g = [pow(gl, xi, p) * pow(gr, x, p) % p for gl, gr in zip(gL, gR)]
    h = [pow(hl, x, p) * pow(hr, xi, p) % p for hl, hr in zip(hL, hR)]
    P = pow(L, x * x % q, p) * P * pow(R, xi * xi % q, p) % p
    proof.append((L, R))
    print("n =", len(a), " claim holds:", P == commit(g, h, u, a, b))

print("proof:", len(proof), "pairs (L, R) and two numbers", a[0], b[0])
```

It prints:

```
n = 8  <a,b> = 157  P = 284
n = 4  claim holds: True
n = 2  claim holds: True
n = 1  claim holds: True
proof: 3 pairs (L, R) and two numbers 975 1004
```

The vectors went from 8 to 4 to 2 to 1, and at every step the folded
commitment still opened to the folded vectors. The verifier's side is the same
loop without the vectors: it recomputes each challenge from the transcript,
folds the generators and $P$, and at the end checks $P = g^{a} h^{b} u^{ab}$
with the two numbers it received.

`pow(x, -1, q)` needs Python 3.8 or later. The group here has 1019 elements; a
real deployment uses a group of about $2^{252}$ elements, where the same code
would take the same number of steps with much bigger numbers.

### Small proof, slow check

Look again at what the verifier does. To fold the generators it computes $n/2$
new generators in the first round, $n/4$ in the second, and so on: about $n$
exponentiations in all. Bulletproofs speed this up by noticing that the final
generator $g$ is a product $\prod_i g_i^{s_i}$ where each exponent $s_i$ is a
product of challenges or their inverses, chosen by the bits of $i$. So the
verifier can skip the rounds and compute one big **multi-exponentiation** of
$2n$ terms at the end, which clever algorithms (Pippenger's) do in roughly
$2n / \log n$ group operations. Many proofs can also be checked in one batch
with random weights.

None of that changes the shape: the verifier's work is linear in $n$. For a
64-bit range proof, $n = 64$, and checking takes about a millisecond on a
laptop, which is fine. For a circuit with a million gates it is not. Remember
this, because the fix (§8.8) is the idea behind Halo: someone has to compute
that big product, but it does not have to be done now, and many of them can be
merged into one.

!!! note "Life story: Bulletproofs"
    **Born:** 2017 (preprint), IEEE Symposium on Security and Privacy 2018;
    Benedikt Bünz, Jonathan Bootle, Dan Boneh, Andrew Poelstra, Pieter Wuille
    and Greg Maxwell, improving the 2016 inner-product argument of Bootle,
    Cerulli, Chaidos, Groth and Petit · **Purpose:** short range proofs and
    circuit proofs with no trusted setup, from discrete logarithms alone ·
    **Helped:** Monero (2018), Mimblewimble chains such as Grin (2019),
    confidential assets, the inner-product commitment inside Halo 2 ·
    **Status:** current; in Monero replaced in 2022 by its shorter variant
    Bulletproofs+; like every discrete-log system, breakable by a large
    quantum computer

## 8.3 Range proofs and Monero

*Level: intermediate.*

### Why a hidden amount must be proved non-negative

A **confidential transaction**, proposed by Greg Maxwell for Bitcoin-like
systems in 2015, hides every amount inside a Pedersen commitment
$C = g^{v} h^{r}$, where $v$ is the amount and $r$ a random blinding number.
Commitments multiply the way amounts add:
$g^{v_1} h^{r_1} \cdot g^{v_2} h^{r_2} = g^{v_1 + v_2} h^{r_1 + r_2}$. So the
network can check that the inputs of a transaction equal its outputs (plus a
public fee) without seeing any amount: it multiplies the commitments and
compares, and the sender supplies the blinding numbers so that they balance.

There is a hole, and it is arithmetic. Exponents live modulo the group order
$q$, and modulo $q$ the number $-5$ is the same as $q - 5$. Spend an input of 10
coins and create two outputs, 15 coins to yourself and $-5$ coins to nowhere.
The commitments balance, nobody can see the amounts, and five coins have been
printed. To close the hole, every output must carry a **range proof**: a proof
that the committed $v$ lies in $[0, 2^{n})$ for some $n$ small enough that a
handful of outputs can never add up past $q$. With $q \approx 2^{252}$ and
$n = 64$, there is room for an astronomically large number of outputs.

### Break it: printing money

Here is the attack in the toy group of §8.2. The balance check passes; only a
range check catches it. Notice the range: in this toy the group has only 1019
elements, so the range must be tiny (8 bits) for sums of outputs not to wrap;
with an 11-bit range, $-5 \equiv 1014$ would have a valid bit decomposition.

```python
p, q = 2039, 1019
g, h = 4, 9                            # two elements of the order-q group (toy: logs are easy here)

def C(v, r):                           # Pedersen commitment to amount v with blinding r
    return pow(g, v % q, p) * pow(h, r % q, p) % p

r_in, r1 = 777, 123
r2 = (r_in - r1) % q                   # blindings chosen so the commitments balance
inp = C(10, r_in)
out1, out2 = C(15, r1), C(-5, r2)
print("balance check passes:", inp == out1 * out2 % p)
print("-5 is really", -5 % q, "in the exponent")

def in_range(v, bits):                 # what a range proof establishes about v
    return 0 <= v % q < 2 ** bits
print("15 in 8-bit range:", in_range(15, 8), " -5 in 8-bit range:", in_range(-5, 8))
print("-5 in 11-bit range:", in_range(-5, 11), "(range too big for this group)")
```

It prints:

```
balance check passes: True
-5 is really 1014 in the exponent
15 in 8-bit range: True  -5 in 8-bit range: False
-5 in 11-bit range: True (range too big for this group)
```

The last line is the second lesson: the range and the group order must be
chosen together. In a real system with a 252-bit group and 64-bit amounts, the
margin is enormous.

### Bits as vectors

How do you prove $0 \le v < 2^{n}$ about a number you will not show? Write it in
binary. Let $\mathbf{a}_L = (a_0, \ldots, a_{n-1})$ be the bits of $v$, lowest
first, and $\mathbf{2}^n = (1, 2, 4, \ldots, 2^{n-1})$. Then three facts hold
exactly when $v$ is in range:

1. $\langle \mathbf{a}_L, \mathbf{2}^n \rangle = v$ (the bits add up to $v$);
2. $\mathbf{a}_R = \mathbf{a}_L - \mathbf{1}$ (define a second vector, each
   entry one less);
3. $\mathbf{a}_L \circ \mathbf{a}_R = \mathbf{0}$ (entry by entry, $a_i (a_i - 1) = 0$,
   which forces every $a_i$ to be 0 or 1).

By hand with $v = 5$ and $n = 3$: $\mathbf{a}_L = (1, 0, 1)$, since
$1 + 0 \cdot 2 + 1 \cdot 4 = 5$. Then $\mathbf{a}_R = (0, -1, 0)$ and
$\mathbf{a}_L \circ \mathbf{a}_R = (0, 0, 0)$. All three facts hold.

A cheater who wants to claim $v = 9$ with $n = 3$ cannot find three bits that
sum to 9, because the largest is $1 + 2 + 4 = 7$. It could try
$\mathbf{a}_L = (1, 0, 2)$, since $1 + 2 \cdot 4 = 9$; then
$\mathbf{a}_R = (0, -1, 1)$ and $\mathbf{a}_L \circ \mathbf{a}_R = (0, 0, 2)$,
which is not zero. The third fact catches the "bit" that is not a bit.

That is $2n + 1$ equations. Bulletproofs squash them into **one** inner product
using two random challenges $y$ and $z$ from the verifier. Write
$\mathbf{y}^n = (1, y, y^2, \ldots, y^{n-1})$. A random linear combination of
$n$ equations is zero (with high probability) only if every equation is zero,
the same Schwartz-Zippel reasoning as in [Chapter 7](07-SNARKs.md). After the
algebra, which the paper does in a page, the single equation is

$$
\begin{aligned}
&\big\langle \mathbf{a}_L - z \mathbf{1},\; \mathbf{y}^n \circ (\mathbf{a}_R + z \mathbf{1}) + z^2 \mathbf{2}^n \big\rangle \\
&\qquad = z^2 v + \delta(y, z),
\end{aligned}
$$

where $\delta(y, z) = (z - z^2) \langle \mathbf{1}, \mathbf{y}^n \rangle - z^3 \langle \mathbf{1}, \mathbf{2}^n \rangle$
is a number both sides can compute. The left side is an inner product of two
vectors the prover knows; the right side involves $v$ only through the
commitment, as $z^2 v$ in the exponent. So the range proof becomes: commit to
the bit vectors, receive $y$ and $z$, and run the inner-product argument of
§8.2 on the two vectors in that equation.

By hand modulo 97, with $v = 5$, $n = 3$, $y = 3$, $z = 5$: $\mathbf{y}^3 = (1, 3, 9)$.
The left vector is $\mathbf{a}_L - 5 = (-4, -5, -4) \equiv (93, 92, 93)$. The
right vector is $(1 \cdot 5 + 25, \; 3 \cdot 4 + 50, \; 9 \cdot 5 + 100) = (30, 62, 145) \equiv (30, 62, 48)$.
Their inner product is $93 \cdot 30 + 92 \cdot 62 + 93 \cdot 48 = 12958 \equiv 57$.
On the right, $z^2 v = 125 \equiv 28$ and
$\delta = (5 - 25) \cdot 13 - 125 \cdot 7 = -1135 \equiv 29$, and
$28 + 29 = 57$. They agree.

Two details make it zero-knowledge. The prover adds random **blinding vectors**
$\mathbf{s}_L, \mathbf{s}_R$, so that the two vectors become polynomials
$\mathbf{l}(X) = \mathbf{a}_L - z\mathbf{1} + \mathbf{s}_L X$ and a matching
$\mathbf{r}(X)$; their inner product is a quadratic
$t(X) = t_0 + t_1 X + t_2 X^2$ whose constant term is the equation above. The
prover commits to $t_1$ and $t_2$, the verifier picks a point $X$, and the
inner-product argument runs on $\mathbf{l}(X)$ and $\mathbf{r}(X)$, which look
random. The details are in the paper; the shape is the one you have just
worked.

### Code it: the range equation

The code checks the combined equation for an honest $v$, then tries an
out-of-range claim with a vector of "bits" that is not all 0s and 1s, over many
random challenges. A real prover never reveals the vectors; here we compute
both sides openly to watch the algebra.

```python
import random
random.seed(8)                         # random is fine for a demo; real challenges come from hashing

q = 2**61 - 1                          # a prime; real systems use the order of a 252-bit group

def ip(a, b):
    return sum(x * y for x, y in zip(a, b)) % q

def range_equation_holds(aL, v, n, y, z):
    aR = [(a - 1) % q for a in aL]
    yn = [pow(y, i, q) for i in range(n)]
    two = [2**i for i in range(n)]
    left = [(a - z) % q for a in aL]
    right = [(yi * (ar + z) + z * z * t) % q for yi, ar, t in zip(yn, aR, two)]
    delta = ((z - z * z) * sum(yn) - z**3 * sum(two)) % q
    return ip(left, right) == (z * z * v + delta) % q

n = 8
v = 200
bits = [(v >> i) & 1 for i in range(n)]
print("honest v = 200:", all(range_equation_holds(bits, v, n, random.randrange(q),
                                                  random.randrange(q)) for _ in range(1000)))

v_bad = 300                            # does not fit in 8 bits
fake = [0, 0, 1, 1, 0, 1, 0, 2]        # 4 + 8 + 32 + 2*128 = 300, but 2 is not a bit
print("sum of fake bits:", sum(b << i for i, b in enumerate(fake)))
wins = sum(range_equation_holds(fake, v_bad, n, random.randrange(q), random.randrange(q))
           for _ in range(1000))
print("cheater passes", wins, "of 1000 challenges")
```

It prints:

```
honest v = 200: True
sum of fake bits: 300
cheater passes 0 of 1000 challenges
```

The cheater's equation is a nonzero polynomial in $y$ and $z$ of low degree, so
it can hold for only a tiny fraction of the $2^{61}$ possible challenges.

### Monero adopts Bulletproofs

Monero, the privacy coin of [Chapter 18](18-Privacy-on-Ledgers.md), switched on
confidential amounts (RingCT) in January 2017. Its range proofs were built from
Borromean ring signatures: one small ring signature per bit, about 6 kilobytes
for each output. With two outputs per typical transaction, range proofs were
most of every transaction and most of every fee.

Bulletproofs fit the problem exactly. A 64-bit range proof is
$2 \log_2 64 + 9 = 21$ elements of 32 bytes, **672 bytes**, about a tenth of
the old size. Better still, $m$ range proofs can be **aggregated** into one of
$2 \log_2(64 m) + 9$ elements: proving two outputs costs only two more elements
than proving one. The Monero developers had the code audited by outside
firms, paid for by community donations, and on **18 October 2018**, at block
1,685,555, the network upgrade "Beryllium Bullet" (version 0.13) made
Bulletproofs mandatory.

The effect showed up in days. Average transaction size fell by about 80
percent. Fees, which in Monero are charged per byte, fell from tens of US cents
to around two cents; published estimates of the drop range from about 90 to 97
percent, depending on the data source and which days are compared. Exchanges
cut their Monero withdrawal fees within a week.

!!! note "Life story: Bulletproofs in Monero"
    **Born:** 18 October 2018, Monero 0.13 "Beryllium Bullet", replacing the
    Borromean range proofs used since RingCT (January 2017) · **Purpose:**
    prove every hidden output amount lies in $[0, 2^{64})$ so nobody can print
    coins · **Helped:** cut transaction size by about 80 percent and fees by
    roughly 90 to 97 percent (estimates vary) · **Retired:** August 2022 ·
    **Replaced by:** Bulletproofs+

In 2020 Heewon Chung, Kyoohyung Han, Chanyang Ju, Myungsun Kim and Jae Hong
Seo published **Bulletproofs+**, which replaces the inner-product argument with
a "weighted" inner-product argument and folds part of the range-proof algebra
into it. A 64-bit range proof shrinks from 672 to 576 bytes, about 86 percent of
the size, with similar computation. Monero adopted it in the network upgrade of
**13 August 2022** (version 0.18, "Fluorine Fermi"), together with larger rings
of 16 members and "view tags" for faster wallet scanning. Later work, such as
Bulletproofs++ (Liam Eagen, Sanket Kanjalkar, Tim Ruffing and Jonas Nick, 2022), shrinks range
proofs further using different encodings of the bits.

!!! note "Life story: Bulletproofs+"
    **Born:** 2020, Chung, Han, Ju, Kim and Seo · **Purpose:** a shorter
    range proof with the same discrete-log assumption and no setup · **Helped:**
    Monero since 13 August 2022 (576 instead of 672 bytes per 64-bit proof) ·
    **Status:** current in Monero; quantum-vulnerable like all discrete-log
    proofs

**Fiat-Shamir, again.** The interactive Bulletproofs protocol is turned
non-interactive with a hash, and the hash must cover everything: the
commitments, the statement, every earlier message. In April 2022 the security
firm Trail of Bits disclosed "Frozen Heart", a family of bugs in which
implementations of several proof systems, Bulletproofs among them, left
something out of the hash and so let a prover choose the statement after seeing
the challenge. The story and the mechanics are in
[Chapter 6](06-Sigma-Protocols-and-Fiat-Shamir.md); the rule for every system in
this chapter is the same: hash the whole transcript, including the public
inputs.

## 8.4 STARKs: from a computation to a polynomial

*Level: intermediate.*

Bulletproofs avoid a trusted setup but keep two things a cautious designer
might still want to drop: a group where discrete logarithms are hard (which a
quantum computer would break), and verification time linear in the statement.
STARKs drop both. The letters stand for **Scalable Transparent ARguments of
Knowledge**: scalable means the prover's time is close to linear and the
verifier's time is polylogarithmic in the computation's length; transparent
means no setup; and the only cryptography inside is a hash function.

The idea was assembled from complexity theory. In the early 1990s, the
**PCP theorem** showed that any proof can be rewritten so that a verifier
reading only a few random places can check it. Joe Kilian (1992) showed how to
make that efficient with a Merkle tree: the prover commits to the long proof
with one root and opens only the places the verifier asks for. Silvio Micali
(1994, published in full in 2000) removed the interaction with a hash, the same
step as Fiat-Shamir. These "CS proofs" were theory; the PCPs involved were far
too big to build. In 2016 Eli Ben-Sasson, Alessandro Chiesa and Nicholas
Spooner defined **interactive oracle proofs** (IOPs), where the prover sends
several long messages that the verifier only samples, and showed the same
Merkle-and-hash recipe turns any IOP into a non-interactive argument. IOPs can
be far smaller than PCPs, and that made STARKs practical.

A STARK proves a statement of the form: "I ran this program for $T$ steps
from this starting state, and it ended in this final state." It does so in
three moves: write the run as a table, turn the table into polynomials, and
prove the polynomials have low degree.

### The execution trace

Run the program and record its state at every step in a table, one row per
step and one column per register. This table is the **execution trace**. For a
small example, take the Fibonacci rule modulo 17: start with 1 and 1, and each
new number is the sum of the two before it. Eight steps give

| Step $i$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| $a_i$ | 1 | 1 | 2 | 3 | 5 | 8 | 13 | 4 |

(the last entry is $21 \bmod 17 = 4$). The claim to prove is: "starting from 1
and 1, the Fibonacci rule gives 4 at step 7." For this toy anyone could check
by rerunning; the point of a STARK is that the verifier's work stays tiny even
when $T$ is a billion steps.

### AIR: the rules as equations

An **algebraic intermediate representation** (AIR) writes the program's rules
as polynomial equations between neighboring rows. There are two kinds:

- **Transition constraints** must hold between every row and the next ones.
  Here: $a_{i+2} - a_{i+1} - a_i = 0$ for $i = 0, \ldots, 5$.
- **Boundary constraints** pin particular cells: $a_0 = 1$, $a_1 = 1$,
  $a_7 = 4$.

A real program, such as a virtual machine, has dozens or hundreds of columns
(registers, program counter, memory pointers) and constraints such as "if this
row's opcode column says ADD, then the next row's register equals the sum of
these two". The constraints are the same for every row, which is what makes
the AIR short even for a long computation. That uniformity is the difference
from the circuits of [Chapter 7](07-SNARKs.md), where every gate is written out
separately.

### From the table to a polynomial

Now the algebra. Choose a field with a subgroup of the right size: in
$\mathbb{F}_{17}$, the number $\omega = 9$ has order 8, since its powers are

$$
1,\ 9,\ 13,\ 15,\ 16,\ 8,\ 4,\ 2,\ \text{then } 9^8 \equiv 1 .
$$

Put step $i$ of the trace at the point $\omega^i$, and let $T(x)$ be the unique
polynomial of degree below 8 with $T(\omega^i) = a_i$ (interpolation, as in
Shamir's scheme of [Chapter 2](02-Secret-Sharing.md)). "The next row" becomes
"multiply the input by $\omega$": $T(\omega \cdot \omega^i) = a_{i+1}$. So the
transition constraint becomes one polynomial,

$$
C(x) = T(\omega^2 x) - T(\omega x) - T(x),
$$

which must be zero at $x = \omega^0, \ldots, \omega^5$ (rows 0 to 5; the last two
rows have no successors). A polynomial that is zero at those six points is
divisible by

$$
Z(x) = (x - \omega^0)(x - \omega^1) \cdots (x - \omega^5) .
$$

So the whole claim "every step followed the rule" becomes: **$C(x) / Z(x)$ is a
polynomial**, of degree at most $7 - 6 = 1$ here. If even one step is wrong,
$C$ is not zero at that point, the division leaves a remainder, and the
"quotient" is not a polynomial at all. The boundary constraints work the same
way: $T(x) - 1$ divided by $(x - 1)$, and so on.

### Code it: one wrong step

The code interpolates the trace, builds $C$, divides by $Z$, and prints the
quotient and the remainder. Then it changes one step of the trace (5 becomes
6, and the later rows are honest sums from there on) and divides again.

```python
p, w, N = 17, 9, 8                     # the field F_17; w = 9 has order 8
D = [pow(w, i, p) for i in range(N)]   # the trace domain 1, 9, 13, 15, 16, 8, 4, 2

def pmul(f, g):                        # polynomials as coefficient lists, lowest first
    out = [0] * (len(f) + len(g) - 1)
    for i, x in enumerate(f):
        for j, y in enumerate(g):
            out[i + j] = (out[i + j] + x * y) % p
    return out

def interpolate(xs, ys):               # Lagrange: the polynomial through the points
    poly = [0] * len(xs)
    for i, (xi, yi) in enumerate(zip(xs, ys)):
        term, den = [1], 1
        for j, xj in enumerate(xs):
            if j != i:
                term = pmul(term, [-xj % p, 1])
                den = den * (xi - xj) % p
        c = yi * pow(den, -1, p) % p
        poly = [(a + c * b) % p for a, b in zip(poly, term)]
    return poly

def shift(f, s):                       # the polynomial x -> f(s * x)
    return [c * pow(s, i, p) % p for i, c in enumerate(f)]

def divide(f, g):                      # long division: quotient and remainder
    f, q = f[:], [0] * max(1, len(f) - len(g) + 1)
    for i in range(len(f) - len(g), -1, -1):
        c = f[i + len(g) - 1] * pow(g[-1], -1, p) % p
        q[i] = c
        for j, gj in enumerate(g):
            f[i + j] = (f[i + j] - c * gj) % p
    return q, f[:len(g) - 1]

Z = [1]                                # vanishes where the rule must hold: rows 0 to 5
for x in D[:6]:
    Z = pmul(Z, [-x % p, 1])

def check(trace):
    T = interpolate(D, trace)
    C = [(a - b - c) % p for a, b, c in zip(shift(T, w * w), shift(T, w), T)]
    Q, rem = divide(C, Z)
    print(trace, "quotient", Q, "remainder", rem)

check([1, 1, 2, 3, 5, 8, 13, 4])       # Fibonacci mod 17: the rule holds
check([1, 1, 2, 3, 6, 9, 15, 7])       # one wrong step (5 -> 6), then honest sums
```

It prints:

```
[1, 1, 2, 3, 5, 8, 13, 4] quotient [3, 8] remainder [0, 0, 0, 0, 0, 0]
[1, 1, 2, 3, 6, 9, 15, 7] quotient [16, 0] remainder [5, 11, 9, 13, 3, 10]
```

The honest trace gives the quotient $Q(x) = 3 + 8x$ with nothing left over. The
trace with one bad step leaves a remainder: no polynomial $Q$ satisfies
$C = Q \cdot Z$.

The verifier, of course, never sees $T$ or does this division. The prover
**commits** to the values of $T$ and $Q$, and the verifier checks
$C(x) = Q(x) Z(x)$ at a few random points, reading the committed values there.
A cheating prover can commit to any values it likes, including values of some
function that makes the check pass at the queried points; what it cannot easily
do is make that function a **polynomial of low degree**. Everything now rests on
one question: are the committed values close to those of a low-degree
polynomial? The next two sections answer it.

## 8.5 Reed-Solomon codes and Merkle commitments

*Level: intermediate.*

### Why evaluate on more points than you need

A polynomial of degree below $k$ is fixed by its values at any $k$ points. Two
different such polynomials can agree on at most $k - 1$ points, because their
difference has degree below $k$ and so at most $k - 1$ roots. Now evaluate a
polynomial of degree below $k$ at $N$ points, with $N$ several times $k$. The
list of $N$ values is a **Reed-Solomon codeword**, the same code that protects
CDs, QR codes and deep-space radio (the mathematics is in
[Mathematics, chapter 18](../mathematics/18-Error-Correcting-Codes.md)). The
ratio $\rho = k / N$ is the **rate**, and $1/\rho$ the **blowup factor**. Two
different codewords differ in at least $N - k + 1$ of their $N$ places: more
than three quarters of them if the blowup is 4.

That distance is what makes spot checks work. Suppose a cheating prover commits
to a list of $N$ values that is **not** a codeword. Either it is close to one
codeword (it differs from one low-degree polynomial in a few places), or it is
**far** from every codeword: to turn it into any low-degree polynomial you would
have to change a large fraction $\delta$ of the places. A cheater who started
from a false trace has no low-degree polynomial to be close to, because the
honest quotient $C/Z$ does not exist; whatever it commits to is far from the
code. And a list that is far from the code fails a random consistency test with
probability roughly $\delta$ per test. A few dozen tests leave a cheater a
negligible chance.

In a STARK the prover therefore evaluates its polynomials on a domain much
larger than the trace, typically 4 to 16 times larger. This is the
**low-degree extension**. The larger domain is usually a shifted copy (a coset)
of a subgroup, disjoint from the trace domain, so that the values the verifier
reads are not the trace values themselves; with a little added randomness this
makes the proof zero-knowledge, though many deployed STARKs care only about
correctness and skip that step.

**By hand.** Over $\mathbb{F}_{17}$, take $f(x) = 3 + 2x + 5x^2 + x^3$, degree 3,
so $k = 4$. Evaluate it at the $N = 8$ points $1, 9, 13, 15, 16, 8, 4, 2$
(rate 1/2, blowup 2). For example $f(1) = 3 + 2 + 5 + 1 = 11$ and
$f(16) = f(-1) = 3 - 2 + 5 - 1 = 5$. All eight values are

| $x$ | 1 | 9 | 13 | 15 | 16 | 8 | 4 | 2 |
|---|---|---|---|---|---|---|---|---|
| $f(x)$ | 11 | 16 | 11 | 11 | 5 | 1 | 2 | 1 |

Any 4 of these values determine the other 4. If a cheater changes one value,
say $f(9)$ from 16 to 0, the list is no longer a codeword; to make it a
codeword of a different cubic, at least 5 of the 8 values would have to change.

### Committing with a Merkle tree

The prover cannot send millions of values; it sends one hash. Hash each value
into a leaf, hash leaves in pairs, pairs of pairs, and so on to a single
**Merkle root** ([Chapter 3](03-Commitments.md) builds the tree;
[Protocols, chapter 19](../protocols/index.md) shows the same
structure in Bitcoin blocks). To reveal the value at position $i$, the prover
sends the value and the $\log_2 N$ sibling hashes on the path to the root, and
the verifier rehashes up the path. If the hash function is collision resistant,
the prover cannot open one position to two different values. This is the only
commitment in a STARK, and it needs no algebra at all: no group, no pairing, no
setup.

The cost is size. A KZG commitment opens a polynomial at a point with one group
element. A Merkle opening is a path of $\log_2 N$ hashes, about 32 bytes each,
and it opens one value, not a polynomial. That difference is most of the
difference between a 200-byte SNARK and a 100-kilobyte STARK. Figure 8.3 shows
the whole pipeline from trace to root.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Four stages: an execution trace table, an interpolated polynomial, a longer Reed-Solomon codeword, and a Merkle root sent to the verifier" fill="currentColor" font-size="14">
<rect x="10" y="40" width="130" height="110" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="30" text-anchor="middle" font-weight="bold">trace</text>
<text x="75" y="66" text-anchor="middle">1 1 2 3</text>
<text x="75" y="90" text-anchor="middle">5 8 13 4</text>
<text x="75" y="120" text-anchor="middle" opacity="0.8">8 rows</text>
<line x1="142" y1="95" x2="168" y2="95" stroke="currentColor" stroke-width="1.4"/>
<polygon points="174,95 165,90 165,100"/>
<rect x="176" y="40" width="130" height="110" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="241" y="30" text-anchor="middle" font-weight="bold">polynomial</text>
<text x="241" y="78" text-anchor="middle">T(x), degree &lt; 8</text>
<text x="241" y="104" text-anchor="middle">T(ωⁱ) = aᵢ</text>
<text x="241" y="130" text-anchor="middle" opacity="0.8">and Q = C / Z</text>
<line x1="308" y1="95" x2="334" y2="95" stroke="currentColor" stroke-width="1.4"/>
<polygon points="340,95 331,90 331,100"/>
<rect x="342" y="40" width="140" height="110" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="412" y="30" text-anchor="middle" font-weight="bold">codeword</text>
<text x="412" y="78" text-anchor="middle">values on a</text>
<text x="412" y="100" text-anchor="middle">domain 4 to 16</text>
<text x="412" y="122" text-anchor="middle">times larger</text>
<line x1="484" y1="95" x2="510" y2="95" stroke="currentColor" stroke-width="1.4"/>
<polygon points="516,95 507,90 507,100"/>
<polygon points="572,40 518,150 626,150" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="572" y="30" text-anchor="middle" font-weight="bold">Merkle root</text>
<text x="572" y="120" text-anchor="middle">32 bytes</text>
<text x="20" y="190">Interpolate, extend, hash. The verifier later asks for a few positions</text>
<text x="20" y="212">of the codeword and gets each value with its path of sibling hashes.</text>
</svg>
<figcaption>Figure 8.3. From a computation to a commitment. Only the root travels at first; values come out of the tree one Merkle path at a time.</figcaption>
</figure>

There is still a gap. A Merkle root commits to a list, but it says nothing about
whether the list is a codeword. The obvious test, read $k$ values, interpolate
and compare with one more, reads $k$ values, which is as long as the
computation. What is needed is a test that reads a logarithmic number of
values and still catches a list that is far from every low-degree polynomial.
That test is FRI.

## 8.6 FRI: folding a polynomial in half

*Level: intermediate.*

FRI stands for **Fast Reed-Solomon Interactive Oracle Proof of Proximity**. Eli
Ben-Sasson, Iddo Bentov, Yinon Horesh and Michael Riabzev posted it in 2017 and
presented it at the ICALP conference in 2018. The idea is the same halving
trick as the inner-product argument, applied to a polynomial instead of a pair
of vectors.

### The split

Any polynomial can be split into its even and odd powers. For
$f(x) = 3 + 2x + 5x^2 + x^3$,

$$
f(x) = \underbrace{(3 + 5x^2)}_{\text{even powers}} + x \cdot \underbrace{(2 + x^2)}_{\text{odd powers}} .
$$

Write $f_e(y) = 3 + 5y$ and $f_o(y) = 2 + y$, so $f(x) = f_e(x^2) + x f_o(x^2)$.
Both halves have degree below half of $f$'s bound: $f$ had degree below 4,
$f_e$ and $f_o$ have degree below 2. In general,

$$
f(x) = f_e(x^2) + x\, f_o(x^2) .
$$

Now take a random challenge $\alpha$ from the verifier and **fold**:

$$
f'(y) = f_e(y) + \alpha\, f_o(y) .
$$

If $f$ had degree below $d$, then $f'$ has degree below $d/2$. And its domain
also halves: $f'$ is evaluated at the squares of the old points, and $x$ and
$-x$ have the same square. On our domain the squares of
$1, 9, 13, 15, 16, 8, 4, 2$ are $1, 13, 16, 4, 1, 13, 16, 4$: four distinct
points, the subgroup generated by $\omega^2 = 13$.

The essential step is that the verifier can compute $f'$ at a point from two
values of $f$, with no need to know the coefficients. Adding and subtracting
$f(x) = f_e(x^2) + x f_o(x^2)$ and $f(-x) = f_e(x^2) - x f_o(x^2)$ gives

$$
f_e(x^2) = \frac{f(x) + f(-x)}{2}, \qquad
f_o(x^2) = \frac{f(x) - f(-x)}{2x},
$$

so

$$
f'(x^2) = \frac{f(x) + f(-x)}{2} + \alpha\, \frac{f(x) - f(-x)}{2x} .
$$

### One folding round by hand

Take the codeword of §8.5 and the query point $x = 9$. Its partner is
$-9 \equiv 8$, and the table says $f(9) = 16$, $f(8) = 1$.

1. Even part: $f_e(81) = (16 + 1)/2 = 17/2 \equiv 0$. Check: $81 \equiv 13$ and
   $f_e(13) = 3 + 5 \cdot 13 = 68 = 4 \cdot 17 \equiv 0$. Correct.
2. Odd part: $f_o(13) = (16 - 1)/(2 \cdot 9) = 15/18 \equiv 15/1 = 15$. Check:
   $f_o(13) = 2 + 13 = 15$. Correct.
3. Fold with $\alpha = 10$: $f'(13) = 0 + 10 \cdot 15 = 150 \equiv 14$.
4. Check against the folded polynomial directly:
   $f'(y) = (3 + 5y) + 10(2 + y) = 23 + 15y \equiv 6 + 15y$, and
   $f'(13) = 6 + 195 = 201 \equiv 14$. The same.

One more round finishes it. $f'$ has degree below 2, on the domain
$\{1, 13, 16, 4\}$. At the query point $13$ its partner is $-13 \equiv 4$, with
$f'(4) = 6 + 60 = 66 \equiv 15$. Folding with a new challenge $\beta = 2$:

$$
f''(13^2) = \frac{14 + 15}{2} + 2 \cdot \frac{14 - 15}{2 \cdot 13}
\equiv 6 + 2 \cdot 15 = 36 \equiv 2 .
$$

(Here $29/2 \equiv 12/2 = 6$, and $-1/26 \equiv -1/9 \equiv -2 \equiv 15$, since
$9 \cdot 2 = 18 \equiv 1$.) The polynomial $f''$ has degree below 1: it is the
constant 2, and indeed $f''(z) = 6 + 2 \cdot 15 = 36 \equiv 2$ from the
coefficients. Three layers: 8 values, 4 values, 2 equal values.

### The protocol

<div class="mars-steps" markdown>

1. **Commit.** The prover Merkle-commits to the values of $f$ on the big domain
   and sends the root.
2. **Fold.** The verifier sends $\alpha_0$ (in practice, the hash of the root).
   The prover computes $f_1$, the fold, on the half-size domain, commits to it,
   and sends that root. Repeat with $\alpha_1, \alpha_2, \ldots$ until the
   polynomial is a constant (or small enough to send whole), and send it.
3. **Query.** The verifier picks a random position $x$ in the first domain. The
   prover opens $f_0(x)$ and $f_0(-x)$ from the first tree, $f_1(x^2)$ and
   $f_1(-x^2)$ from the second, and so on down, each with its Merkle path.
4. **Check.** At every layer the verifier computes the fold from the two opened
   values and checks it equals the opened value one layer down; at the bottom,
   that it equals the constant. Repeat step 3 for many independent positions.

</div>

Figure 8.4 shows the layers and one query path through them.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Three FRI layers of 8, 4 and 2 values; a query opens a pair in each layer and checks that each pair folds to the value below" fill="currentColor" font-size="14">
<text x="10" y="40" font-weight="bold">f₀</text>
<text x="10" y="120" font-weight="bold">f₁</text>
<text x="10" y="200" font-weight="bold">f₂</text>
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="60" y="20" width="56" height="30" rx="3"/><rect x="122" y="20" width="56" height="30" rx="3" stroke-width="2.6"/>
<rect x="184" y="20" width="56" height="30" rx="3"/><rect x="246" y="20" width="56" height="30" rx="3"/>
<rect x="308" y="20" width="56" height="30" rx="3"/><rect x="370" y="20" width="56" height="30" rx="3" stroke-width="2.6"/>
<rect x="432" y="20" width="56" height="30" rx="3"/><rect x="494" y="20" width="56" height="30" rx="3"/>
<rect x="122" y="100" width="56" height="30" rx="3"/><rect x="184" y="100" width="56" height="30" rx="3" stroke-width="2.6"/>
<rect x="246" y="100" width="56" height="30" rx="3"/><rect x="308" y="100" width="56" height="30" rx="3" stroke-width="2.6"/>
<rect x="184" y="180" width="56" height="30" rx="3"/><rect x="246" y="180" width="56" height="30" rx="3" stroke-width="2.6"/>
</g>
<text x="88" y="40" text-anchor="middle">11</text><text x="150" y="40" text-anchor="middle">16</text>
<text x="212" y="40" text-anchor="middle">11</text><text x="274" y="40" text-anchor="middle">11</text>
<text x="336" y="40" text-anchor="middle">5</text><text x="398" y="40" text-anchor="middle">1</text>
<text x="460" y="40" text-anchor="middle">2</text><text x="522" y="40" text-anchor="middle">1</text>
<text x="150" y="68" text-anchor="middle" opacity="0.75">x = 9</text>
<text x="398" y="68" text-anchor="middle" opacity="0.75">−x = 8</text>
<text x="150" y="120" text-anchor="middle">4</text><text x="212" y="120" text-anchor="middle">14</text>
<text x="274" y="120" text-anchor="middle">8</text><text x="336" y="120" text-anchor="middle">15</text>
<text x="212" y="148" text-anchor="middle" opacity="0.75">13</text>
<text x="336" y="148" text-anchor="middle" opacity="0.75">−13 = 4</text>
<text x="212" y="200" text-anchor="middle">2</text><text x="274" y="200" text-anchor="middle">2</text>
<line x1="150" y1="52" x2="205" y2="96" stroke="currentColor" stroke-width="1.2"/>
<line x1="398" y1="52" x2="220" y2="96" stroke="currentColor" stroke-width="1.2"/>
<line x1="212" y1="152" x2="266" y2="176" stroke="currentColor" stroke-width="1.2"/>
<line x1="336" y1="152" x2="282" y2="176" stroke="currentColor" stroke-width="1.2"/>
<text x="400" y="120">fold with α = 10</text>
<text x="400" y="200">fold with β = 2: constant</text>
<text x="10" y="250">Bold boxes: the values one query opens, each with a Merkle path.</text>
<text x="10" y="272">The verifier checks each pair folds to the bold value one layer down.</text>
</svg>
<figcaption>Figure 8.4. FRI on the codeword of §8.5. Each layer halves the domain and the degree; a query follows one path from top to bottom and checks every fold.</figcaption>
</figure>

Why does it work? An honest prover's layers are folds of one low-degree
polynomial, so every check passes. For a cheater, the key lemma (proved in the
FRI paper and sharpened since) is that folding a function that is $\delta$-far
from the code, with a random $\alpha$, gives a function that is still about
$\delta$-far from the smaller code, except with small probability over
$\alpha$. The cheater can choose its later layers freely, but then they are
inconsistent with the earlier layers at about a $\delta$ fraction of positions,
and each query lands on such a position with probability about $\delta$. After
$s$ queries the cheater survives with probability about $(1 - \delta)^s$.

The costs: $\log_2 N$ layers, each needing a Merkle root in the proof; each
query opens two values per layer with their paths. So a proof is about
$s \cdot \log_2 N$ Merkle paths of $\log_2 N$ hashes: $O(\log^2 N)$ hashes in
all, and the verifier's work is the same. The prover's work is dominated by
evaluating the polynomial on the big domain (a fast Fourier transform,
$O(N \log N)$) and hashing everything once.

### Code it: one FRI round, Merkle commitments included

The code evaluates $f$ on the 8 points, Merkle-commits to the values, derives
each challenge by hashing the latest root (so the challenges differ from the
$\alpha = 10$ and $\beta = 2$ used by hand), folds down to a constant, and then
plays the verifier: for every query position it checks three Merkle paths and
one fold per layer. The last line reproduces the hand computation. Then a
cheater commits to a function of degree 6, too high, and lies about the last
layer.

```python
import hashlib

p, w, N = 17, 9, 8                     # F_17; w = 9 has order 8; 8 evaluation points
inv2 = pow(2, -1, p)

def h(*parts):
    return hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()

def merkle_tree(values):               # list of levels, leaves first; root is levels[-1][0]
    level = [h("leaf", v) for v in values]
    levels = [level]
    while len(level) > 1:
        level = [h(level[i], level[i + 1]) for i in range(0, len(level), 2)]
        levels.append(level)
    return levels

def merkle_path(levels, i):            # the sibling hashes from leaf i up to the root
    path = []
    for level in levels[:-1]:
        path.append(level[i ^ 1])
        i //= 2
    return path

def merkle_check(root, i, value, path):
    node = h("leaf", value)
    for sib in path:
        node = h(node, sib) if i % 2 == 0 else h(sib, node)
        i //= 2
    return node == root

def evaluate(coeffs, x):
    return sum(c * pow(x, k, p) for k, c in enumerate(coeffs)) % p

def fold(values, domain, alpha):       # f'(x^2) = (f(x)+f(-x))/2 + alpha*(f(x)-f(-x))/(2x)
    half = len(values) // 2            # -domain[i] is domain[i + half]
    return [((values[i] + values[i + half]) * inv2
             + alpha * (values[i] - values[i + half]) * inv2 * pow(domain[i], -1, p)) % p
            for i in range(half)]

def commit_phase(values):              # Merkle-commit each layer, fold with a hashed challenge
    domain = [pow(w, i, p) for i in range(N)]
    layers, trees, alphas = [values], [merkle_tree(values)], []
    while len(values) > 2:
        alpha = int(h("alpha", trees[-1][-1][0]), 16) % p    # Fiat-Shamir from the root
        values = fold(values, domain, alpha)
        domain = [d * d % p for d in domain[:len(domain) // 2]]
        layers.append(values); trees.append(merkle_tree(values)); alphas.append(alpha)
    return layers, trees, alphas

def query(layers, trees, alphas, i):   # the verifier opens pairs and checks every fold
    domain = [pow(w, k, p) for k in range(N)]
    for layer, tree, nxt, nxt_tree, alpha in zip(layers, trees, layers[1:], trees[1:], alphas):
        half = len(layer) // 2
        i = i % half
        a, b, c = layer[i], layer[i + half], nxt[i]
        ok = (merkle_check(tree[-1][0], i, a, merkle_path(tree, i)) and
              merkle_check(tree[-1][0], i + half, b, merkle_path(tree, i + half)) and
              merkle_check(nxt_tree[-1][0], i, c, merkle_path(nxt_tree, i)))
        if not ok or fold([a, b], [domain[i], domain[i + half]], alpha)[0] != c:
            return False
        domain = [d * d % p for d in domain[:half]]
    last = layers[-1]
    return last[0] == last[1]          # the final layer must be a constant

f = [3, 2, 5, 1]                       # f(x) = 3 + 2x + 5x^2 + x^3, degree 3 < 4 = N/2
values = [evaluate(f, pow(w, i, p)) for i in range(N)]
print("evaluations on 1, 9, 13, 15, 16, 8, 4, 2:", values)
layers, trees, alphas = commit_phase(values)
print("challenges:", alphas, " layers:", layers)
print("root of layer 0:", trees[0][-1][0][:16], "...")
print("all queries pass:", all(query(layers, trees, alphas, i) for i in range(N)))
print("hand example, x = 9, alpha = 10:", fold([values[1], values[5]], [9, 8], 10))

# Break it: a cheater commits to a degree-6 function and fakes a constant last layer
g = [3, 2, 5, 1, 0, 0, 7]              # g(x) = f(x) + 7x^6: degree 6, too high
bad = [evaluate(g, pow(w, i, p)) for i in range(N)]
layers, trees, alphas = commit_phase(bad)
print("honest folding of the cheat ends in", layers[-1], "(not a constant)")
layers[-1] = [layers[-1][0]] * 2       # the lie: claim the last layer is constant
trees[-1] = merkle_tree(layers[-1])
passed = [i for i in range(N) if query(layers, trees, alphas, i)]
print("queries that pass:", passed, "of", list(range(N)))
```

It prints:

```
evaluations on 1, 9, 13, 15, 16, 8, 4, 2: [11, 16, 11, 11, 5, 1, 2, 1]
challenges: [5, 11]  layers: [[11, 16, 11, 11, 5, 1, 2, 1], [6, 7, 3, 2], [4, 4]]
root of layer 0: 74270087d4bf7464 ...
all queries pass: True
hand example, x = 9, alpha = 10: [14]
honest folding of the cheat ends in [13, 7] (not a constant)
queries that pass: [0, 2, 4, 6] of [0, 1, 2, 3, 4, 5, 6, 7]
```

With the hashed challenges 5 and 11, the honest polynomial folds to
$f_1(y) = 13 + 10y$ and then to the constant 4. The cheater's function folds to
two different values, so it cannot honestly end in a constant; when it lies,
half the query positions catch it. With 40 independent queries, it would pass
with probability $2^{-40}$. In a real STARK the field has $2^{64}$ elements or
more, so the challenges cannot be guessed, and the parameters are set so that
each query is worth a known number of bits of security.

!!! note "Life story: FRI"
    **Born:** 2017 (ECCC report), ICALP 2018; Eli Ben-Sasson, Iddo Bentov,
    Yinon Horesh and Michael Riabzev · **Purpose:** test, by reading a
    logarithmic number of positions, that a committed function is close to a
    low-degree polynomial · **Helped:** every STARK; Plonky2 and Plonky3,
    RISC Zero, SP1, Starknet's Stone and Stwo provers; also used as a
    polynomial commitment inside PLONK-style systems · **Status:** current;
    refined by DEEP-FRI (2019), and challenged by newer tests such as STIR
    (2024) and WHIR (2024) that need fewer queries

## 8.7 Hashes only: post-quantum, and the size bill

*Level: intermediate.*

### Putting the STARK together

A full STARK is the last three sections in sequence. The prover runs the
program and writes the trace; interpolates each column; evaluates the columns
on a domain 4 to 16 times larger and Merkle-commits to them. The verifier's
challenge (a hash of the roots) picks a random combination of all the
constraints, so they can be checked together; the prover forms the quotient by
the vanishing polynomial and commits to it too. The verifier then picks a random
point and asks for the trace and quotient values there, and checks the
constraint equation $C = Q \cdot Z$ at that point. Finally FRI shows that the
committed functions are close to polynomials of the right degrees (in practice
FRI is run once, on a random combination of all of them). Every challenge comes
from hashing the transcript so far, which turns the interactive oracle proof
into a single message, by the Ben-Sasson, Chiesa and Spooner transform of 2016.

Ben-Sasson, Bentov, Horesh and Riabzev posted "Scalable, transparent, and
post-quantum secure computational integrity" in early 2018. Its example was a
police force proving that a presidential candidate's DNA profile is not in a
forensic database, without revealing the database, faster than checking the
database naively. That year the four founded StarkWare. Its first product, StarkEx, began proving
batches of trades for exchanges on Ethereum in June 2020, and its general
network, Starknet, went live on Ethereum mainnet as an "alpha" in November 2021.

!!! note "Life story: STARKs"
    **Born:** 2018, Eli Ben-Sasson, Iddo Bentov, Yinon Horesh and Michael
    Riabzev, building on PCPs (1990s), Kilian (1992), Micali (1994) and
    interactive oracle proofs (2016) · **Purpose:** proofs of long computations
    with no setup, fast proving and polylogarithmic verification, from hash
    functions only · **Helped:** StarkEx (2020), Starknet (2021), RISC Zero,
    SP1, Polygon's provers, and most zero-knowledge virtual machines ·
    **Status:** current and the main proof family for large computations;
    plausibly post-quantum; proofs are often wrapped in a SNARK to save space

### Why hashes, and why that is plausibly post-quantum

Look at what the security of a STARK depends on. The Merkle trees bind the
prover to its values if the hash is **collision resistant**. The Fiat-Shamir
challenges are unpredictable if the hash behaves like a **random oracle**. The
rest is information theory: the distance of Reed-Solomon codes and the
probability that random queries hit a bad position. There is no group, no
discrete logarithm, no factoring, nothing with hidden algebraic structure.

That is why STARKs are called **plausibly post-quantum**. Shor's algorithm, the
quantum algorithm that breaks RSA, discrete logarithms and pairings, needs a
hidden periodic structure, and a good hash function has none. The known quantum
attacks on hash functions are generic: Grover's search finds a preimage of an
$n$-bit hash in about $2^{n/2}$ steps instead of $2^n$, and quantum collision
search is at best somewhat faster than the classical $2^{n/2}$. So hash-based
systems keep their security with a larger output, typically 256 bits for a
128-bit target. The same reasoning underlies the hash-based signatures SLH-DSA
and XMSS; [Post-quantum, chapter 4](../post-quantum/04-A-Field-Guide-to-Hard-Problems.md)
compares this family with lattices, codes and isogenies, and
[chapter 12](../post-quantum/12-SLH-DSA.md) builds the signatures. In 2019
Alessandro Chiesa, Peter Manohar and Nicholas Spooner proved that the
hash-based compilation of interactive oracle proofs stays sound against quantum
attackers in the quantum random oracle model, which put the claim on firmer
ground. "Plausibly" stays in the sentence because nobody can prove that a
concrete hash function such as SHA-256 or Poseidon has no structure a future
algorithm could exploit.

Contrast the rest of this book. Groth16, PLONK with KZG and Bulletproofs all
fall to a quantum computer that can compute discrete logarithms: such a machine
could forge proofs, and in Bulletproofs and Pedersen commitments it could even
open a commitment to a different value. For a payment made today that may not
matter. For a system meant to keep its integrity for decades, it does.

**In Arcadia City.** The settlement's water-rights registry records how much of
the shared ice each district may draw, and every season it publishes a proof
that the new balances follow from the old ones and that season's metered use.
The registry is meant to outlast its founders, and anyone in the city, or on
Earth 3 to 22 minutes away, should be able to check it on a tablet. The
council chose a STARK: no ceremony to trust, and no algebra that a future
quantum computer would undo. The proofs are about a hundred kilobytes each,
which the settlement's archive barely notices.

### The size bill

The price is size. A rough estimate shows where it comes from. Take a trace of
$2^{20}$ rows, a blowup of 8, so the commitment domain has $2^{23}$ points, and
FRI layers from $2^{23}$ down to a small constant: about 20 layers. One query
opens two values in each layer, each with a Merkle path whose length falls from
23 hashes to a few: about 250 hashes, or 8 kilobytes, per query.

How many queries? With rate $\rho = 1/8$, each query is conjectured to be worth
about $\log_2 8 = 3$ bits of security, so a 128-bit target needs about 43
queries. Proven bounds (up to the "Johnson bound", $1 - \sqrt{\rho}$) give
about 1.5 bits per query and so about 85 queries. That is a third to two thirds
of a megabyte before any tricks. Engineers then fold by 8 or 16 at a time
instead of 2, store sibling values in one leaf, cut the trees a few levels
below the root, share path segments between queries, and add a small
proof-of-work ("grinding") that buys a few bits of security without more
queries. Deployed proofs end up at **tens to a few hundred kilobytes**, roughly
a thousand times a Groth16 proof. These are orders of magnitude, and they move
every year.

In late 2025 Elizabeth Crites and Alistair Stewart showed that the strongest
"up to capacity" conjectures about Reed-Solomon codes, which some deployed
systems had used to choose their query counts, are false in general. Systems
that relied on them had to re-examine their parameters; systems set from the
proven bounds were not affected. The episode is a reminder that "hash-based"
does not mean "assumption-free": the soundness analysis matters as much as the
hash.

Two answers to the size bill are common. One is to make each proof cover more:
a proof for a billion steps is not much bigger than one for a million, since
size grows only with $\log^2$ of the length. The other is **wrapping**: prove,
with a Groth16 or PLONK proof, that "I verified this STARK". Ethereum then
stores a 200-byte proof instead of a 100-kilobyte one. The cost is that the
outer proof brings back pairings and, for Groth16, a trusted setup, so the
post-quantum property holds only for the inner layers. That idea, a proof about
a proof, is the subject of the next section.

## 8.8 Recursion: proofs that verify proofs

*Level: expert.*

### The idea

A verifier is a program. A proof system can prove the correct running of any
program. So it can prove the running of its own verifier: "I checked proof
$\pi_{i-1}$, and it was valid, and I also did step $i$ of the computation." Call
the new proof $\pi_i$. It is no bigger than $\pi_{i-1}$, yet it vouches for
everything $\pi_{i-1}$ vouched for, plus one more step. Repeat a million times
and you have a single small proof for a million steps, made one step at a time,
with the prover never holding more than one step's worth of state.

Paul Valiant described this in 2008 as **incrementally verifiable computation**
(IVC). Alessandro Chiesa and Eran Tromer generalized it in 2010 to
**proof-carrying data** (PCD), where proofs flow along any graph of
computations, merging at each node; think of each party in a distributed system
attaching a proof that its output came from correctly computed inputs. Figure
8.5 shows the chain form.

<figure class="mars-fig">
<svg viewBox="0 0 640 220" width="640" role="img" aria-label="A chain of steps: each step takes the previous state and proof, does one step, verifies the old proof inside its circuit, and outputs a new state and proof" fill="currentColor" font-size="14">
<g stroke="currentColor" stroke-width="1.4" fill="none">
<rect x="20" y="60" width="130" height="80" rx="4"/>
<rect x="250" y="60" width="130" height="80" rx="4"/>
<rect x="480" y="60" width="130" height="80" rx="4"/>
</g>
<text x="85" y="88" text-anchor="middle" font-weight="bold">step 1</text>
<text x="85" y="112" text-anchor="middle">do F once</text>
<text x="315" y="88" text-anchor="middle" font-weight="bold">step 2</text>
<text x="315" y="108" text-anchor="middle">check π₁,</text>
<text x="315" y="128" text-anchor="middle">do F once</text>
<text x="545" y="88" text-anchor="middle" font-weight="bold">step 3</text>
<text x="545" y="108" text-anchor="middle">check π₂,</text>
<text x="545" y="128" text-anchor="middle">do F once</text>
<line x1="152" y1="100" x2="242" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="248,100 239,95 239,105"/>
<line x1="382" y1="100" x2="472" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="478,100 469,95 469,105"/>
<text x="200" y="90" text-anchor="middle">s₁, π₁</text>
<text x="430" y="90" text-anchor="middle">s₂, π₂</text>
<text x="20" y="40">s₀</text>
<text x="545" y="170" text-anchor="middle">s₃, π₃</text>
<text x="20" y="200" opacity="0.85">π₃ alone convinces a verifier that s₃ = F(F(F(s₀))). Its size does not grow.</text>
</svg>
<figcaption>Figure 8.5. Incrementally verifiable computation. Each proof attests to one more step and to the previous proof, so the last proof covers the whole chain.</figcaption>
</figure>

The difficulty is cost. The verifier must be written as a circuit, and the
prover pays for every gate. A Groth16 verifier computes pairings on an elliptic
curve, which needs arithmetic in the curve's **base field**, while the circuit
itself works in the curve's **scalar field**, a different prime. Simulating one
field inside the other costs hundreds of gates per multiplication. In 2014 Eli
Ben-Sasson, Alessandro Chiesa, Eran Tromer and Madars Virza found the way out: a
**cycle** of two curves, each one's scalar field equal to the other's base
field. Proofs on curve A are verified in circuits over curve B, and vice versa,
alternating. Their MNT4/MNT6 cycle worked but was slow and needed two trusted
setups. The cryptocurrency Coda, renamed Mina, used this kind of recursion to
keep its whole blockchain represented by one proof of about 22 kilobytes
(launched March 2021).

### Halo: recursion with no setup

Sean Bowe, Jack Grigg and Daira Hopwood published Halo in September 2019. It
uses the inner-product argument of §8.2, which needs no setup, and it attacks
the one expensive part of that argument: the verifier's linear-time computation
of the folded generator $G = \prod_i g_i^{s_i}$.

Their observation has two parts. First, the exponents $s_i$ are the
coefficients of a polynomial with a short product form,
$s(X) = \prod_{j} (x_j^{-1} + x_j X^{2^j})$, built from the round challenges.
So "$G$ is correct" is the same as "$G$ is a commitment to the polynomial
$s(X)$", which can be checked by opening $G$ at a random point: itself an
inner-product claim. Second, two claims of the form "$G_1$ commits to $s_1$" and
"$G_2$ commits to $s_2$" can be merged with a random weight into a single claim
about $G_1 G_2^{c}$. Merging is cheap; only checking is expensive.

So the recursive circuit does not check $G$. It does the cheap parts of
verification (hashing, a few scalar multiplications) and **accumulates** the
expensive claim into a running claim it carries forward. The expensive check
is done once, at the very end, by whoever wants to be convinced, with one
linear-time multi-exponentiation for the whole chain. The circuit stays small,
no setup is needed anywhere, and a cycle of ordinary (not pairing-friendly)
curves is enough. Halo used the "Tweedledum and Tweedledee" cycle; Halo 2 uses
the Pasta curves, Pallas and Vesta.

Benedikt Bünz, Alessandro Chiesa, Pratyush Mishra and Nicholas Spooner turned
the trick into a general theory in 2020: an **accumulation scheme** for a proof
system lets you replace "verify the proof" with "fold the proof into an
accumulator", and any accumulation scheme gives proof-carrying data.

Halo 2, which combines PLONK-style circuits with the inner-product commitment,
went into production in Zcash's Network Upgrade 5 on **31 May 2022**: the new
Orchard shielded pool needs no trusted setup at all, six years after the Sprout
ceremony. The story of Zcash's pools is in [Chapter 18](18-Privacy-on-Ledgers.md).

!!! note "Life story: Halo"
    **Born:** September 2019, Sean Bowe, Jack Grigg and Daira Hopwood at the
    Electric Coin Company · **Purpose:** recursive proof composition without a
    trusted setup, by deferring the inner-product argument's expensive check
    and accumulating it · **Helped:** Halo 2 in Zcash's Orchard pool (May
    2022), Mina's Pickles recursion, accumulation schemes (2020) and the
    folding schemes that followed · **Status:** current; discrete-log based,
    so not post-quantum

## 8.9 Folding: Nova

*Level: expert.*

Halo still verifies most of a proof inside each step. In 2021 Abhiram
Kothapalli, Srinath Setty and Ioanna Tzialla asked whether the step circuit
needs to verify a proof at all. Their system, **Nova** (CRYPTO 2022), never
makes a proof until the end. Each step **folds** two claims, "this instance is
satisfied" and "that instance is satisfied", into one claim of the same size
that is true only if both were (with overwhelming probability). The step
circuit only has to check that the folding was done right, which costs a few
scalar multiplications, a constant far smaller than any verifier.

### Relaxed R1CS

Recall from [Chapter 7](07-SNARKs.md) that an R1CS is three matrices $A, B, C$,
and a vector $z$ satisfies it when $Az \circ Bz = Cz$ (entry-by-entry product).
Try to fold two solutions $z_1, z_2$ into $z = z_1 + r z_2$:

$$
Az \circ Bz = Az_1 \circ Bz_1 + r\,(Az_1 \circ Bz_2 + Az_2 \circ Bz_1) + r^2\, Az_2 \circ Bz_2 .
$$

The squared term breaks the equation: the cross terms in the middle appear, and
the constant 1 inside $z$ becomes $1 + r$. Nova's fix is to make the relation
loose enough to absorb both. A **relaxed R1CS** instance has an extra scalar $u$
(standing where the constant 1 was) and an **error vector** $E$:

$$
Az \circ Bz = u \cdot Cz + E .
$$

An ordinary solution is a relaxed one with $u = 1$ and $E = 0$. To fold two
relaxed instances, the prover computes the cross term

$$
T = Az_1 \circ Bz_2 + Az_2 \circ Bz_1 - u_1 Cz_2 - u_2 Cz_1,
$$

commits to it, receives $r$, and both sides set

$$
z = z_1 + r z_2, \qquad u = u_1 + r u_2, \qquad E = E_1 + r T + r^2 E_2 .
$$

Expand $Az \circ Bz - u\,Cz$ and the result is exactly $E$: the cross term
absorbs the middle, $E_2$ the squared term, $E_1$ the constant term. It is the
inner-product argument's trick once more: commit to the junk before the
challenge.

In Nova the vectors are hidden behind Pedersen commitments, which add. The
verifier, which is the step circuit, never sees $z$ or $E$; it folds the
commitments, $\overline{E} = \overline{E_1} \cdot \overline{T}^{\,r} \cdot \overline{E_2}^{\,r^2}$
and likewise for $z$, at the cost of a couple of scalar multiplications. At the
end of the chain, one SNARK (Nova uses Spartan, which also needs no setup)
proves knowledge of a solution of the final folded instance.

### By hand

Use the R1CS of [Chapter 7](07-SNARKs.md) for $x^3 + x + 5 = \text{out}$, with
the variables $z = (u, \text{out}, x, x^2, x^3, x^3 + x)$ and four constraints:
$x \cdot x = x^2$; $x^2 \cdot x = x^3$; $(x^3 + x) \cdot u = (x^3 + x)$; and
$(5u + (x^3 + x)) \cdot u = \text{out}$. Two true instances, modulo 97:
$z_1 = (1, 35, 3, 9, 27, 30)$ for $x = 3$ and $z_2 = (1, 15, 2, 4, 8, 10)$ for
$x = 2$.

Look at the first constraint only. The cross term is
$T_1 = x_1 x_2 + x_2 x_1 - u_1 (x^2)_2 - u_2 (x^2)_1 = 6 + 6 - 4 - 9 = -1 \equiv 96$.
With $r = 7$, the folded vector has $u = 1 + 7 = 8$, $x = 3 + 14 = 17$ and
$x^2$-entry $9 + 28 = 37$, and $E_1 = 0 + 7 \cdot 96 + 49 \cdot 0 = 672 \equiv 90$.
Check: $17 \cdot 17 = 289 \equiv 95$ on the left; $u \cdot 37 + E_1 = 296 + 90 = 386 \equiv 95$
on the right. The folded vector is not a solution of the original circuit (17
is neither 3 nor 2) but it satisfies the relaxed equation, and a prover who can
produce it must know solutions for both originals.

### Code it, and break it

The code folds the two instances, checks the relaxed equation for all four
constraints, and then shows why $T$ must be committed before $r$ is chosen: a
prover who knows $r$ first can fold a **false** instance (claiming
$2^3 + 2 + 5 = 16$) and pass, by putting the false instance's error into $T$.

```python
q = 97                                 # a small prime field; real Nova uses a 255-bit curve order
# R1CS for x^3 + x + 5 = out, variables z = (u, out, x, x*x, x*x*x, x^3 + x)
A = [[0,0,1,0,0,0], [0,0,0,1,0,0], [0,0,1,0,1,0], [5,0,0,0,0,1]]
B = [[0,0,1,0,0,0], [0,0,1,0,0,0], [1,0,0,0,0,0], [1,0,0,0,0,0]]
C = [[0,0,0,1,0,0], [0,0,0,0,1,0], [0,0,0,0,0,1], [0,1,0,0,0,0]]

def mv(M, z):                          # matrix times vector, mod q
    return [sum(m * v for m, v in zip(row, z)) % q for row in M]

def satisfied(z, E):                   # relaxed R1CS: Az o Bz = u*Cz + E, with u = z[0]
    return all((a * b - z[0] * c - e) % q == 0
               for a, b, c, e in zip(mv(A, z), mv(B, z), mv(C, z), E))

def cross_term(z1, z2):                # T = Az1 o Bz2 + Az2 o Bz1 - u1*Cz2 - u2*Cz1
    A1, B1, C1, A2, B2, C2 = mv(A, z1), mv(B, z1), mv(C, z1), mv(A, z2), mv(B, z2), mv(C, z2)
    return [(a1 * b2 + a2 * b1 - z1[0] * c2 - z2[0] * c1) % q
            for a1, b1, c1, a2, b2, c2 in zip(A1, B1, C1, A2, B2, C2)]

def fold(z1, E1, z2, E2, T, r):
    z = [(x + r * y) % q for x, y in zip(z1, z2)]
    E = [(e1 + r * t + r * r * e2) % q for e1, t, e2 in zip(E1, T, E2)]
    return z, E

zero = [0, 0, 0, 0]
z1 = [1, 35, 3, 9, 27, 30]             # x = 3: 27 + 3 + 5 = 35
z2 = [1, 15, 2, 4, 8, 10]              # x = 2: 8 + 2 + 5 = 15
print("instance 1:", satisfied(z1, zero), " instance 2:", satisfied(z2, zero))
T = cross_term(z1, z2)                 # the prover commits to T before seeing r
r = 7                                  # the verifier's challenge (a hash, in practice)
z, E = fold(z1, zero, z2, zero, T, r)
print("T =", T, " folded z =", z, " E =", E)
print("folded instance satisfied:", satisfied(z, E))

# Break it: if the prover learns r before fixing T, it can fold in a false instance
z_bad = [1, 16, 2, 4, 8, 10]           # claims 2^3 + 2 + 5 = 16: false
print("false instance alone:", satisfied(z_bad, zero))
err = [(a * b - z_bad[0] * c) % q for a, b, c in zip(mv(A, z_bad), mv(B, z_bad), mv(C, z_bad))]
T_cheat = [(t + r * e) % q for t, e in zip(cross_term(z1, z_bad), err)]
z, E = fold(z1, zero, z_bad, zero, T_cheat, r)
print("folded with a T chosen after r:", satisfied(z, E))
```

It prints:

```
instance 1: True  instance 2: True
T = [96, 92, 0, 0]  folded z = [8, 43, 17, 37, 83, 3]  E = [90, 62, 0, 0]
folded instance satisfied: True
false instance alone: False
folded with a T chosen after r: True
```

The last line is the attack: with $r$ known in advance, the cross term can hide
the error of a false instance, $r \cdot (\text{error})$, and the folded claim
checks out. In the real protocol $r$ is the hash of the instances and the
commitment to $T$, so $T$ is fixed first, and the false instance's error would
have to vanish for a random $r$, which happens with probability about
$2/q$. Real Nova works over a field of about $2^{255}$ elements.

### Break it: the 2023 cycle-of-curves flaw

Nova's paper proved security for a construction over one group. Its
implementation, for speed, ran the recursion over a cycle of two curves, and
that variant had never been proved. In 2023 Wilson Nguyen, Dan Boneh and Srinath
Setty (one of Nova's own authors) found that it was unsound: they produced a
proof that passed verification for the claim that $2^{75}$ rounds of the MinRoot
function had been computed, made in 1.46 seconds, which no honest prover could
do. They also showed that Nova's folding proofs were malleable. They gave a
modified two-curve construction with a security proof, which also turned out to
be a little faster, and the implementation was fixed. The lesson repeats the
one of [Chapter 7](07-SNARKs.md): the proof of security covers the scheme on
paper, and every optimization that changes the scheme needs its own proof.

!!! note "Life story: Nova"
    **Born:** 2021 (preprint), CRYPTO 2022; Abhiram Kothapalli, Srinath Setty
    and Ioanna Tzialla · **Purpose:** incrementally verifiable computation by
    folding relaxed R1CS instances, with a step circuit of only a few scalar
    multiplications and no trusted setup · **Helped:** SuperNova (2022,
    different step functions), HyperNova (2023), CycleFold (2023), ProtoStar
    (2023) and lattice-based folding such as LatticeFold (2024) ·
    **Status:** current and actively developed; the two-curve implementation
    flaw found in 2023 was fixed with a proved construction

## 8.10 Choosing a proof system, and who uses them

*Level: intermediate.*

### The comparison

The table compares the four families for a statement of $n$ gates or trace
cells. The figures are **approximate orders of magnitude** for typical
parameters at about 128-bit security; they depend on the curve or field, the
hash, the implementation and the hardware, and they improve every year.

| | Groth16 | PLONK with KZG | Bulletproofs | STARK (FRI) |
|---|---|---|---|---|
| Proof size | about 0.13 to 0.2 KB, constant | about 0.5 to 1 KB, constant | about 0.6 to 0.7 KB for a 64-bit range; $2 \log_2 n$ elements, 1 to 2 KB for circuits | about 50 to 200 KB; grows as $\log^2 n$ |
| Prover time | $n \log n$, heavy elliptic-curve work | $n \log n$, heavy elliptic-curve work | about $n$ exponentiations: slowest per gate | $n \log n$, hashing and small-field FFTs: fastest per gate |
| Verifier time | milliseconds, constant (3 pairings) | milliseconds, constant (2 pairings) | linear in $n$: about a millisecond for a range proof, seconds for big circuits | $\log^2 n$: milliseconds to tens of milliseconds |
| Setup | trusted, per circuit | trusted, universal and updatable | none | none |
| Assumptions | pairings, a knowledge assumption (generic group model) | pairings, algebraic group model | discrete logarithm | collision-resistant hash, random oracle |
| Quantum computer | breaks it | breaks it | breaks it | plausibly safe |

Reading the table as a designer:

- **The proof goes on a blockchain and gas is paid per byte:** Groth16 or
  PLONK, often as the outer wrapper of a STARK.
- **Short statements, no setup, small proofs:** Bulletproofs. Range proofs,
  proofs about a few commitments, confidential amounts.
- **Huge computations, fast proving, no setup, long-lived integrity:** STARKs,
  with recursion to keep the final proof small.
- **A long or unbounded sequence of steps:** recursion or folding (Halo 2,
  Nova and successors), with a single compressed proof at the end.

### In the real world

**Zero-knowledge virtual machines.** The biggest change since 2022 is that few
teams now write circuits by hand. A **zkVM** proves the execution of an
ordinary instruction set, so a program written in Rust and compiled for RISC-V
can be proved without the programmer knowing any algebra. RISC Zero (released
2022) and Succinct's SP1 (2024) prove RISC-V programs with STARKs over 31-bit
fields, split long runs into segments, prove each segment, and combine the
segment proofs recursively, ending with an optional Groth16 wrapper for
Ethereum. StarkWare's Cairo is a virtual machine designed for proving, and its
newer prover, Stwo, uses Circle STARKs over the Mersenne prime $2^{31} - 1$
(Ulrich Haböck, David Levit and Shahar Papini, 2024). Polygon's Plonky2 (2022)
showed that FRI over the 64-bit "Goldilocks" field $2^{64} - 2^{32} + 1$ could
verify its own proofs in a fraction of a second, which made fast recursion
practical. Correctness of a zkVM now depends on thousands of constraints
describing the instruction set, and missing constraints, as in [Chapter
7](07-SNARKs.md), are the main source of serious bugs.

**Rollups.** The largest users by value are **zero-knowledge rollups**: systems
that execute many Ethereum-style transactions off the chain and post a proof
that the new state follows from the old one, so Ethereum checks one proof
instead of re-running every transaction. StarkEx has run since 2020 (it
powered version 3 of the dYdX exchange and Immutable X), Starknet since 2021, and
ZKsync Era, Polygon zkEVM, Scroll and Linea since 2023. How rollups fit into
consensus, and the data-availability problem they leave open, belong to
[Chapter 17](17-Consensus-and-Smart-Contracts.md). In 2025 several zkVM teams
reported proving most Ethereum mainnet blocks within the 12-second slot time on
clusters of graphics cards, and the Ethereum Foundation began planning for
clients that check a block's proof instead of re-executing it; the hardware and
timings in those reports vary and are moving quickly.

**Privacy coins.** Monero runs Bulletproofs+ on every output; Grin and other
Mimblewimble chains use Bulletproofs; Zcash's Orchard pool uses Halo 2; Mina
uses Halo-style accumulation to keep its chain at one small proof.
[Chapter 18](18-Privacy-on-Ledgers.md) tells what these systems hide and what
they cannot.

**Incidents.** The failures in this chapter's systems were not broken hash
functions or solved discrete logarithms. They were Fiat-Shamir transcripts that
left something out (Frozen Heart, 2022), an implementation that changed the
proved construction (Nova's cycle of curves, 2023), soundness parameters set
from a conjecture that turned out false (Reed-Solomon proximity, 2025), and,
above all, circuits and zkVM constraint sets that did not say what their
authors meant.

## 8.11 Going deeper

*Level: expert.*

**From PCPs to IOPs.** The PCP theorem (Arora and Safra; Arora, Lund, Motwani,
Sudan and Szegedy, 1992) says every NP statement has a proof checkable by
reading a constant number of bits. Kilian's 1992 argument commits to such a
proof with a Merkle tree, and Micali's CS proofs remove interaction with a
random oracle. Interactive oracle proofs (Ben-Sasson, Chiesa and Spooner,
2016; independently Reingold, Rothblum and Rothblum) allow several rounds of
oracle messages, which permits linear-size proofs where PCPs are much longer;
the "BCS transform" is the Kilian-Micali compiler for IOPs.

**Proximity and its parameters.** FRI's soundness rests on "proximity gaps":
a random linear combination of functions is far from the code unless all of
them are close to it in a correlated way. Ben-Sasson, Carmon, Ishai, Kopparty
and Saraf proved such gaps up to the Johnson bound $1 - \sqrt{\rho}$ (2020;
journal 2023). DEEP-FRI (Ben-Sasson, Goldberg, Kopparty and Saraf, 2019)
samples outside the domain to improve soundness. STIR (Arnon, Chiesa, Fenzi and
Yogev, 2024) lowers the rate as it folds, needing fewer queries, and WHIR
(2024) extends the approach to multilinear polynomials. The 2025 result of
Crites and Stewart showed the "up to capacity" forms of these conjectures false,
and proposed weaker versions that stop at the list-decoding bound.

**Fields.** Prover speed comes from small fields: Goldilocks (64 bits), BabyBear
($2^{31} - 2^{27} + 1$), Mersenne-31 with Circle STARKs, and binary towers
(Binius, Diamond and Posen, 2023). Challenges are drawn from an extension field
of 128 bits or more, so that a small base field does not mean guessable
challenges.

**Inner products as polynomial commitments.** Evaluating a polynomial
$f(X) = \sum a_i X^i$ at a point $z$ is the inner product of its coefficients
with $(1, z, z^2, \ldots)$. So the inner-product argument is also a polynomial
commitment scheme with no setup, $O(\log n)$ openings and $O(n)$ verification;
Halo 2 uses it in place of KZG, and Halo's accumulation defers exactly the
$O(n)$ part.

**Recursion and knowledge.** Recursive proofs rely on extracting a witness from
a prover that itself ran a verifier on an extracted witness, and so on. Naive
extraction blows up exponentially with depth, so the security of long
recursive chains is usually argued in idealized models or with
"straight-line" extractors; this is an active area, and one reason
implementations of recursion and folding keep needing fresh proofs, as in 2023.

**Post-quantum succinct arguments beyond hashes.** Lattice-based
constructions (for example LaBRADOR, 2023, and the lattice folding schemes
LatticeFold and its successors, 2024) aim for smaller proofs than STARKs with
post-quantum assumptions; the lattice problems are in
[Post-quantum, chapter 5](../post-quantum/05-Lattices-and-Their-Hard-Problems.md).

## Check yourself

??? question "1. What does it mean for a proof system to be transparent, and which of Groth16, PLONK-KZG, Bulletproofs and STARKs are?"

    Transparent means the public parameters contain no secret: anyone can
    derive them (for example by hashing a string), so no trapdoor exists.
    Bulletproofs and STARKs are transparent. Groth16 and PLONK with KZG need a
    setup whose secret ("toxic waste") must be destroyed.

??? question "2. In one inner-product halving step, why must the prover send L and R before it learns the challenge x?"

    $\langle \mathbf{a}', \mathbf{b}' \rangle$ equals the old inner product plus
    $x^2 c_L + x^{-2} c_R$. $L$ and $R$ carry those cross terms. If the prover
    could choose them after seeing $x$, it could pick values that make a false
    claim balance; fixed in advance, a false claim survives only for a few
    values of $x$.

??? question "3. A Bulletproofs range proof for 64 bits has 2·log₂(64) + 9 elements. How many bytes is that with 32-byte elements, and how big is an aggregated proof for 8 outputs?"

    $2 \cdot 6 + 9 = 21$ elements, 672 bytes. For 8 outputs the vector length
    is $512 = 2^9$, so $2 \cdot 9 + 9 = 27$ elements, 864 bytes, against
    $8 \cdot 672 = 5376$ bytes for separate proofs.

??? question "4. Why would a confidential-transaction system without range proofs let someone print money?"

    Amounts live modulo the group order $q$. An output of $-5$ is a commitment
    to $q - 5$, and outputs of 15 and $-5$ balance an input of 10. Nobody can
    see the amounts, so the balance check passes and 5 coins appear. A range
    proof shows each amount is in $[0, 2^{64})$, far too small to wrap around
    $q \approx 2^{252}$.

??? question "5. In the Fibonacci trace of §8.4, why is the vanishing polynomial Z built from only six of the eight points?"

    The transition rule $a_{i+2} = a_{i+1} + a_i$ applies only where row $i+2$
    exists: rows 0 to 5. At rows 6 and 7 the polynomial $T(\omega^2 x)$ wraps
    around to rows 0 and 1, where the rule does not hold, so those points
    must be left out of $Z$.

??? question "6. Over F₁₇, f(x) = 1 + 4x + 2x² + 3x³ and α = 5. What is the folded polynomial f′, and what is f′(13)?"

    $f_e(y) = 1 + 2y$, $f_o(y) = 4 + 3y$, so
    $f'(y) = 1 + 2y + 5(4 + 3y) = 21 + 17y \equiv 4 + 0 \cdot y = 4$. It is the
    constant 4, so $f'(13) = 4$. (A fold can lower the degree more than half;
    the test only needs it not to rise.)

??? question "7. A STARK uses blowup 16. Under the conjecture of log₂(blowup) bits per query, and under the proven Johnson-bound estimate, about how many queries give 100 bits of security?"

    Conjectured: 4 bits per query, so 25 queries. Proven (Johnson bound): each
    query is worth about $-\log_2 \sqrt{1/16} = 2$ bits, so 50 queries. Grinding
    can replace a few of either.

??? question "8. Why are STARKs called plausibly post-quantum but not provably?"

    Their only assumption is a hash function behaving like a random oracle
    (collision resistance for the Merkle trees). Shor's algorithm needs
    algebraic structure that hashes lack, and the generic quantum attacks
    (Grover, quantum collision search) are handled by longer outputs. But
    nobody can prove that SHA-256, Poseidon or any concrete hash has no
    exploitable structure, so the claim stays "plausibly".

??? question "9. What does Halo accumulate instead of checking, and why is that enough?"

    The linear-time part of the inner-product verifier: checking that the
    folded generator $G$ is the commitment to the challenge polynomial $s(X)$.
    Such claims can be merged with a random weight into one claim of the same
    size, so each step merges and moves on, and a single linear-time check at
    the end settles all of them at once. A false claim anywhere makes the
    merged claim false except with negligible probability.

??? question "10. In Nova, what goes wrong if the folding challenge r is chosen before the prover commits to the cross term T? Show the algebra."

    For a false instance with error $e = Az_2 \circ Bz_2 - u_2 Cz_2 \ne 0$, the
    folded vector gives $Az \circ Bz - u Cz = E_1 + r T_{\text{true}} + r^2 e$.
    The verifier expects $E_1 + r T + r^2 \cdot 0$. Knowing $r$, the prover sends
    $T = T_{\text{true}} + r e$ and the equation balances. With $T$ committed
    first and $r$ a hash of it, $r^2 e = r(T - T_{\text{true}})$ must hold for a
    random $r$, which fails except with probability about $2/q$.

## What you learned

- A transparent proof system has no secret setup. Bulletproofs get there with
  discrete logarithms; STARKs with hash functions alone.
- The inner-product argument halves two vectors per round while keeping the
  claim's shape, sending two group elements per round: proofs of $2 \log_2 n$
  elements, but verification linear in $n$.
- A range proof writes a hidden amount in bits and squeezes the bit conditions
  into one inner product with random challenges. Monero adopted Bulletproofs on
  18 October 2018, shrinking transactions by about 80 percent and fees by
  roughly 90 to 97 percent, and Bulletproofs+ in August 2022.
- A STARK writes a computation as an execution trace, its rules as an AIR, and
  the whole claim as "this quotient is a low-degree polynomial". Reed-Solomon
  distance makes cheating visible to random spot checks.
- FRI tests low degree by splitting a polynomial into even and odd parts and
  folding them with a random challenge, layer by layer, with every layer
  committed in a Merkle tree; the verifier checks a few folds per query.
- Hash-only security makes STARKs plausibly post-quantum, at the price of
  proofs of tens to hundreds of kilobytes, often wrapped in a small SNARK.
- Recursion lets a proof vouch for a previous proof. Halo removed the trusted
  setup by accumulating the expensive check; Nova folds two relaxed R1CS
  claims into one and never verifies a proof inside a step.
- zkVMs and zero-knowledge rollups are the largest users today, and the real
  failures have been transcripts, implementation shortcuts, parameters and
  circuits, not broken assumptions.

**Next:** [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md) leaves
proofs for secure computation, starting with oblivious transfer and Yao's
garbled circuits.

## Further reading

- Jonathan Bootle, Andrea Cerulli, Pyrros Chaidos, Jens Groth and Christophe
  Petit, "Efficient Zero-Knowledge Arguments for Arithmetic Circuits in the
  Discrete Log Setting", EUROCRYPT 2016.
- [Benedikt Bünz, Jonathan Bootle, Dan Boneh, Andrew Poelstra, Pieter Wuille and
  Greg Maxwell, "Bulletproofs: Short Proofs for Confidential Transactions and
  More", IEEE Symposium on Security and Privacy 2018](https://eprint.iacr.org/2017/1066).
- [Heewon Chung, Kyoohyung Han, Chanyang Ju, Myungsun Kim and Jae Hong Seo,
  "Bulletproofs+: Shorter Proofs for a Privacy-Enhanced Distributed Ledger"
  (2020)](https://eprint.iacr.org/2020/735).
- Greg Maxwell, "Confidential Transactions" (2015).
- [Monero 0.13.0 "Beryllium Bullet" release notes (October 2018)](https://getmonero.org/2018/10/11/monero-0.13.0-released.html)
  and [Monero 0.18.0.0 "Fluorine Fermi" (July 2022)](https://getmonero.org/2022/07/19/monero-0.18.0.0-released.html).
- Eli Ben-Sasson, Iddo Bentov, Yinon Horesh and Michael Riabzev, "Fast
  Reed-Solomon Interactive Oracle Proofs of Proximity", ICALP 2018.
- [Eli Ben-Sasson, Iddo Bentov, Yinon Horesh and Michael Riabzev, "Scalable,
  Transparent, and Post-Quantum Secure Computational Integrity"
  (2018)](https://eprint.iacr.org/2018/046).
- Eli Ben-Sasson, Alessandro Chiesa and Nicholas Spooner, "Interactive Oracle
  Proofs", TCC 2016.
- Joe Kilian, "A Note on Efficient Zero-Knowledge Proofs and Arguments", STOC
  1992; Silvio Micali, "Computationally Sound Proofs", *SIAM Journal on
  Computing* (2000).
- Alessandro Chiesa, Peter Manohar and Nicholas Spooner, "Succinct Arguments in
  the Quantum Random Oracle Model", TCC 2019.
- Eli Ben-Sasson, Dan Carmon, Yuval Ishai, Swastik Kopparty and Shubhangi Saraf,
  "Proximity Gaps for Reed-Solomon Codes", FOCS 2020 (*Journal of the ACM*,
  2023).
- [Elizabeth Crites and Alistair Stewart, "On Reed-Solomon Proximity Gaps
  Conjectures" (2025)](https://eprint.iacr.org/2025/2046).
- Ulrich Haböck, David Levit and Shahar Papini, "Circle STARKs" (2024).
- Paul Valiant, "Incrementally Verifiable Computation or Proofs of Knowledge
  Imply Time/Space Efficiency", TCC 2008.
- Alessandro Chiesa and Eran Tromer, "Proof-Carrying Data and Hearsay
  Arguments from Signature Cards", ICS 2010.
- Eli Ben-Sasson, Alessandro Chiesa, Eran Tromer and Madars Virza, "Scalable
  Zero Knowledge via Cycles of Elliptic Curves", CRYPTO 2014.
- [Sean Bowe, Jack Grigg and Daira Hopwood, "Recursive Proof Composition
  without a Trusted Setup" (2019)](https://eprint.iacr.org/2019/1021).
- Benedikt Bünz, Alessandro Chiesa, Pratyush Mishra and Nicholas Spooner,
  "Recursive Proof Composition from Accumulation Schemes", TCC 2020.
- [Abhiram Kothapalli, Srinath Setty and Ioanna Tzialla, "Nova: Recursive
  Zero-Knowledge Arguments from Folding Schemes", CRYPTO 2022](https://eprint.iacr.org/2021/370).
- [Wilson Nguyen, Dan Boneh and Srinath Setty, "Revisiting the Nova Proof
  System on a Cycle of Curves" (2023)](https://eprint.iacr.org/2023/969).
- Justin Thaler, *Proofs, Arguments, and Zero-Knowledge* (2022): the standard
  textbook for everything in this chapter.
- Book 1's short version: [Advanced protocols](../../book/23-Advanced-Protocols.md),
  and the reference page [Zero-knowledge proofs](../../11-advanced/Zero-Knowledge.md).
