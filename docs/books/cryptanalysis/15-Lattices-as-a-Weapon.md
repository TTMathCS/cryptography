# 15. Lattices as a Weapon

*A surprising number of secrets are small numbers hiding inside big ones: a
message made of zeros and ones behind a sum, the last few bytes of an RSA
plaintext, a signing nonce that is a little shorter than it should be. Lattice
reduction finds small numbers. Give it a list of linear relations that hold
modulo something, arrange them as the rows of a matrix, and it hands back the
short combination the designer thought nobody could see. This chapter turns the
reduction algorithms into tools and uses them: you will break a Merkle-Hellman
knapsack two ways, find a small root of a polynomial modulo a composite with
Coppersmith's method, recover a hidden number from a few noisy multiples (the
problem behind every short-nonce attack on DSA and ECDSA), watch the first
lattice cryptosystems fall to the same tools, and finally run the attacks forward, as an estimate, to see how
they set the sizes of ML-KEM and ML-DSA.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a lattice, a basis, the shortest vector problem and the closest
      vector problem are, by hand in two dimensions;
    - what LLL and BKZ deliver, as numbers: approximation factors, the root
      Hermite factor, running times and the cost of a block size;
    - how the Merkle-Hellman knapsack worked, how Shamir broke it in 1982, and
      how the Lagarias-Odlyzko lattice attack breaks any low-density knapsack
      (coded on a 24-item instance);
    - Coppersmith's method for small roots, through Howgrave-Graham's lemma,
      coded on a small example that the simplest lattice cannot solve;
    - the hidden number problem, solved by a lattice on a toy prime, and
      why slightly short signing nonces are an instance of it;
    - how GGH, Ajtai-Dwork and the early NTRU parameters were attacked;
    - how lattice estimators, core-SVP and the BKZ cost models set the
      parameters of ML-KEM and ML-DSA, what the margins mean, and what the
      2022 to 2023 argument about dual attacks was about.

    **You need:** [Chapter 13](13-Attacks-on-RSA.md) and
    [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md) of this book, which
    set up the RSA and nonce problems this chapter finishes. From the
    cryptography book, [Chapter 21](../../book/21-Lattice-Cryptography.md)
    (lattices, LWE, ML-KEM, ML-DSA) and [Chapter 13](../../book/13-RSA.md).
    The algorithms themselves, LLL with full code and BKZ in outline, are
    taught in [The mathematics of cryptography, chapter 14](../mathematics/index.md);
    this chapter states what they do and uses them. Vectors, dot products and
    modular arithmetic.

    **Levels:** §15.1, §15.2 and §15.4 are for beginners; §15.3, §15.5,
    §15.6, §15.8 and §15.9 are intermediate; §15.7, §15.10, §15.11 and §15.12
    are expert.

## 15.1 The problem

*Level: beginner.*

In 1978 public-key cryptography was two years old and had exactly one working
scheme anyone trusted, RSA, which was slow on the computers of the day. Ralph
Merkle and Martin Hellman at Stanford offered a second. It was built on the
**knapsack problem**, or more exactly the subset-sum problem: given a list of
numbers and a target, which of the numbers add up to the target? The general
problem is NP-complete, one of the problems computer scientists had just
learned to call hopeless. Encryption in their scheme was nothing but addition.
It was fast, it rested on a famous hard problem, and Merkle was sure enough of
it to offer a \$100 prize to anyone who could break it.

Four years later Adi Shamir collected the prize. His attack did not solve
subset sum in general; nobody has done that. It noticed that the particular
lists Merkle-Hellman published were not general at all. They were easy lists
in disguise, and the disguise, a multiplication modulo a secret number, left a
pattern that a clever search could find in polynomial time. In the same year,
1982, Arjen Lenstra, Hendrik Lenstra and László Lovász published an algorithm
for **lattice basis reduction**, now called LLL after their initials, written
to factor polynomials with rational coefficients. Within a year cryptographers
had noticed that LLL was a better tool for Shamir's job than the one he had
used, and that it could do much more: Jeffrey Lagarias and Andrew Odlyzko
showed that almost any knapsack with numbers large compared with its length
could be solved directly. By the end of the decade nearly every knapsack
cryptosystem had fallen, most to some form of lattice reduction.

That was the first lesson, and it kept being taught. Lattice reduction finds
**short vectors**. Any secret that can be written as a small integer solution
to a set of linear equations, exactly or modulo some number, is a short vector
in a lattice you can write down. In 1996 Don Coppersmith showed how to find
small roots of polynomial equations modulo an RSA modulus this way, which
broke RSA used with small exponents and partly known messages or keys. The
same year Dan Boneh and Ramarathnam Venkatesan defined the **hidden number
problem**: recover a secret from approximations of many multiples of it. When
DSA and ECDSA signers leak a few bits of each nonce, through a timing channel
or a careless random number generator, the private key is the hidden number,
and a lattice finds it. That attack, from the 1990s, was still emptying keys
out of smart cards and TPM chips in 2019.

Then the weapon was turned around. Miklós Ajtai proved in 1996 that some
lattice problems are hard on average if they are hard in the worst case, and
cryptographers started building systems whose security rested on lattice
reduction failing. The first generation (Ajtai-Dwork, GGH, NTRU's early
parameters) was attacked with the very same algorithms, and some of it fell.
The second generation, built on learning with errors, survived and became
FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA) in 2024. Its parameters are chosen by
running the attacks forward: estimate how much lattice reduction an attacker
needs, estimate what that costs, and make the numbers big enough. Cryptanalysis
is no longer something that happens to these schemes after they are deployed.
It is how they are sized.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="Timeline of lattice attacks from the Merkle-Hellman knapsack in 1978 to the publication of FIPS 203 and FIPS 204 in 2024" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="412" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1978</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Merkle and Hellman publish the knapsack cryptosystem</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1982</text>
<circle cx="92" cy="48" r="4.5"/>
<text x="108" y="53">Shamir breaks the basic knapsack; LLL is published</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">1983</text>
<circle cx="92" cy="74" r="4.5"/>
<text x="108" y="79">Lagarias and Odlyzko solve low-density subset sums</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">1984</text>
<circle cx="92" cy="100" r="4.5"/>
<text x="108" y="105">Brickell breaks the iterated knapsack</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">1987</text>
<circle cx="92" cy="126" r="3.5"/>
<text x="108" y="131">Schnorr's block reduction, the ancestor of BKZ</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">1996</text>
<circle cx="92" cy="152" r="4.5"/>
<text x="108" y="157">Coppersmith's small roots; the hidden number problem; Ajtai</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">1997</text>
<circle cx="92" cy="178" r="3.5"/>
<text x="108" y="183">Howgrave-Graham's lemma; GGH and Ajtai-Dwork proposed</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">1998</text>
<circle cx="92" cy="204" r="4.5"/>
<text x="108" y="209">Nguyen and Stern: Ajtai-Dwork is impractical to secure</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="230" r="4.5"/>
<text x="108" y="235">Nguyen breaks the GGH challenges; Boneh-Durfee on RSA</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2003</text>
<circle cx="92" cy="256" r="4.5"/>
<text x="108" y="261">Decryption failures shown to leak NTRU keys</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="282" r="3.5"/>
<text x="108" y="287">The LWE estimator (Albrecht, Player, Scott)</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="308" r="3.5"/>
<text x="108" y="313">Core-SVP: the cost model behind Kyber and Dilithium</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="334" r="4.5"/>
<text x="108" y="339">Minerva, TPM-Fail, LadderLeak: leaky nonces, lattice keys</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="360" r="4.5"/>
<text x="108" y="365">MATZOV's dual attack; 2023: Ducas and Pulles question it</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">FIPS 203 (ML-KEM) and FIPS 204 (ML-DSA) published</text>
</svg>
<figcaption>Figure 15.1. Forty years of lattices as a weapon. Larger dots mark attacks; the rest are the tools and the schemes the attacks shaped.</figcaption>
</figure>

This chapter is about the weapon, not the theory behind it. The theory has its
own home: [The mathematics of cryptography, chapter 14](../mathematics/index.md)
proves what a reduced basis is, derives LLL, codes it in full and sketches BKZ.
Here we take those algorithms as given, state what they guarantee, and spend
the pages on the pattern every lattice attack follows:

<div class="mars-steps" markdown>
1. Write the secret as a vector of small integers.
2. Find linear relations the secret satisfies, exactly or modulo a known number.
3. Build a lattice that contains the secret vector, usually as a combination
   of a few rows of a matrix you can write from public data.
4. Check, with the Gaussian heuristic, that the secret vector is unusually
   short in that lattice, shorter than its neighbors by a clear factor.
5. Reduce the basis, read the secret off a short row, and verify it against
   something public.
</div>

Every attack in the chapter, from the 1982 knapsack to the 2024 parameter
estimates, is those five steps with different numbers in the matrix. The
only thing that changes is how hard step 5 is: LLL, which runs in seconds, or
BKZ with a block size so large that nobody can run it, which is exactly where
a designer wants to be.

## 15.2 Lattices, SVP and CVP in brief

*Level: beginner.*

A **lattice** is the set of all integer combinations of some linearly
independent vectors $\mathbf{b}_1, \dots, \mathbf{b}_n$ in $\mathbb{R}^m$:

$$
L = \{\, x_1 \mathbf{b}_1 + x_2 \mathbf{b}_2 + \dots + x_n \mathbf{b}_n : x_i \in \mathbb{Z} \,\}.
$$

The vectors $\mathbf{b}_i$ are a **basis**. Write them as the rows of a matrix
$B$ and every lattice point is $\mathbf{x} B$ for an integer row vector
$\mathbf{x}$. In this book the vectors always have integer entries, so the
lattice is a regular grid of integer points, perhaps tilted and sheared.

A lattice has many bases. Multiply $B$ on the left by any integer matrix $U$
with determinant $\pm 1$ (a **unimodular** matrix, whose inverse is also an
integer matrix) and $UB$ generates the same points. Take the two vectors

$$
\mathbf{g}_1 = (4, 1), \qquad \mathbf{g}_2 = (1, 3),
$$

and the unimodular matrix $U = \begin{pmatrix} 3 & 2 \\ 4 & 3 \end{pmatrix}$
(determinant $9 - 8 = 1$). The new basis is

$$
\mathbf{h}_1 = 3\mathbf{g}_1 + 2\mathbf{g}_2 = (14, 9), \qquad
\mathbf{h}_2 = 4\mathbf{g}_1 + 3\mathbf{g}_2 = (19, 13).
$$

Both bases make the same grid of points. The first is a **good basis**: short
vectors, nearly at right angles. The second is a **bad basis**: long vectors
pointing almost the same way. What never changes is the area of the
parallelogram the basis spans, the **determinant** (or volume) of the lattice:
$|4 \cdot 3 - 1 \cdot 1| = 11$ and $|14 \cdot 13 - 9 \cdot 19| = |182 - 171| = 11$.
On average there is one lattice point per 11 units of area, whatever basis
you use to describe it.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="The lattice generated by (4,1) and (1,3), with the long bad basis (14,9), (19,13) and the short reduced basis (-1,-3), (3,-2) drawn from the origin" fill="currentColor" font-size="14">
<defs><marker id="ah15" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<circle cx="24" cy="312" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="24" cy="114" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="42" cy="258" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="42" cy="60" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="60" cy="402" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="60" cy="204" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="78" cy="348" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="78" cy="150" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="96" cy="294" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="96" cy="96" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="114" cy="240" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="114" cy="42" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="132" cy="384" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="132" cy="186" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="150" cy="330" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="150" cy="132" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="168" cy="276" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="168" cy="78" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="186" cy="222" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="186" cy="24" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="204" cy="366" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="204" cy="168" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="222" cy="312" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="222" cy="114" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="240" cy="258" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="240" cy="60" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="258" cy="402" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="258" cy="204" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="276" cy="348" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="276" cy="150" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="294" cy="294" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="294" cy="96" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="312" cy="240" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="312" cy="42" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="330" cy="384" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="330" cy="186" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="348" cy="330" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="348" cy="132" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="366" cy="276" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="366" cy="78" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="384" cy="222" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="384" cy="24" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="402" cy="366" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="402" cy="168" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="420" cy="312" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="420" cy="114" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="438" cy="258" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="438" cy="60" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="456" cy="402" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="456" cy="204" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="474" cy="348" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="474" cy="150" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="492" cy="294" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="492" cy="96" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="510" cy="240" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="510" cy="42" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="528" cy="384" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="528" cy="186" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="546" cy="330" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="546" cy="132" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="564" cy="276" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="564" cy="78" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="582" cy="222" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="582" cy="24" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="600" cy="366" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="600" cy="168" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="618" cy="312" r="2.6" fill="currentColor" opacity="0.55"/>
<circle cx="618" cy="114" r="2.6" fill="currentColor" opacity="0.55"/>
<line x1="150" y1="330" x2="402" y2="168" stroke="currentColor" stroke-width="1.6" marker-end="url(#ah15)"/>
<text x="408" y="174" font-size="14">(14, 9)</text>
<line x1="150" y1="330" x2="492" y2="96" stroke="currentColor" stroke-width="1.6" marker-end="url(#ah15)"/>
<text x="498" y="102" font-size="14">(19, 13)</text>
<line x1="150" y1="330" x2="132" y2="384" stroke="currentColor" stroke-width="2.6" marker-end="url(#ah15)"/>
<text x="70" y="396" font-size="14">(−1, −3)</text>
<line x1="150" y1="330" x2="204" y2="366" stroke="currentColor" stroke-width="2.6" marker-end="url(#ah15)"/>
<text x="210" y="380" font-size="14">(3, −2)</text>
<text x="24" y="20" font-size="14">thin arrows: the bad basis (14, 9), (19, 13)</text>
<text x="24" y="40" font-size="14">thick arrows: what reduction returns, (−1, −3), (3, −2)</text>
</svg>
<figcaption>Figure 15.2. One lattice, two bases. Every dot is an integer combination of either pair of arrows. The thin pair is what a public key looks like; the thick pair is what lattice reduction gives back.</figcaption>
</figure>

**Reduction by hand.** In two dimensions the reduction algorithm is old:
Lagrange knew it in 1773 and Gauss wrote it down in 1801. Repeat two moves:
subtract the nearest integer multiple of the shorter vector from the longer,
and swap if the result is now shorter. Start from $(14, 9)$ and $(19, 13)$.

- $(19, 13) \cdot (14, 9) / |(14,9)|^2 = 383 / 277 \approx 1.38$, nearest
  integer 1: $(19, 13) - (14, 9) = (5, 4)$. Now $(5, 4)$ is the shorter
  vector, length squared 41.
- $(14, 9) \cdot (5, 4) / 41 = 106 / 41 \approx 2.59$, nearest integer 3:
  $(14, 9) - 3(5, 4) = (-1, -3)$, length squared 10. Swap again.
- $(5, 4) \cdot (-1, -3) / 10 = -17/10 = -1.7$, nearest integer $-2$:
  $(5, 4) + 2(-1, -3) = (3, -2)$, length squared 13.
- $(3, -2) \cdot (-1, -3) / 10 = 3/10$, nearest integer 0. Stop.

The result, $(-1, -3)$ and $(3, -2)$, has determinant $(-1)(-2) - (-3)(3) =
11$, as it must, and its first vector has length $\sqrt{10}$. That is the
shortest nonzero vector in the lattice; in two dimensions the procedure
always finds it. It is a sign-flipped $\mathbf{g}_2$, the short vector the
bad basis had hidden.

**The two problems.** Everything in the chapter is one of two questions.

- The **shortest vector problem** (SVP): given a basis, find a nonzero
  lattice vector of the smallest length, $\lambda_1(L)$. Its relaxed form,
  **approximate SVP** with factor $\gamma$, asks for a nonzero vector no longer
  than $\gamma \lambda_1(L)$.
- The **closest vector problem** (CVP): given a basis and a target point
  $\mathbf{t}$ that need not be in the lattice, find the lattice vector
  nearest to $\mathbf{t}$. When the target is promised to be very close to
  the lattice, much closer than $\lambda_1/2$, the problem is called
  **bounded distance decoding** (BDD), and that is the case attacks usually
  meet.

With a good basis CVP is easy: write $\mathbf{t}$ in the basis, round each
coordinate, and you land on or near the closest point (Babai's rounding,
1986). With a bad basis the same rounding lands far away. That one
observation is the GGH cryptosystem of §15.9, and the reason a lattice attack
is mostly a fight to turn a bad basis into a good one.

Attacks also turn CVP into SVP. If $\mathbf{t} = \mathbf{v} + \mathbf{e}$ with
$\mathbf{v}$ in the lattice and $\mathbf{e}$ short, add $\mathbf{t}$ to the
basis as an extra row with one extra coordinate $M$:

$$
B' = \begin{pmatrix} B & \mathbf{0} \\ \mathbf{t} & M \end{pmatrix}.
$$

The new lattice contains $(\mathbf{t} - \mathbf{v}, M) = (\mathbf{e}, M)$,
which is short if $\mathbf{e}$ and $M$ are. This is **Kannan's embedding**
(1987), and the knapsack attack, the hidden number attack and the primal
attack on LWE all use it.

**How short is unusually short?** An attack works when the secret vector is
much shorter than anything else in the lattice. For a "random" lattice of
dimension $n$ and determinant $\det L$, the **Gaussian heuristic** predicts the
length of the shortest vector by asking how big a ball must be to hold, on
average, one lattice point:

$$
\lambda_1(L) \approx \sqrt{\frac{n}{2\pi e}}\, (\det L)^{1/n}.
$$

It is a heuristic, good for the lattices attacks build in dimensions above
about 40 and bad in small ones, but it is the measuring stick of every attack
in this chapter. If the secret vector has length well below this number,
reduction will probably find it; if it is around this length, it is lost
among the crowd of other short vectors. Minkowski's theorem gives a proved
version of the upper bound, $\lambda_1(L) \le \sqrt{n}\,(\det L)^{1/n}$, and
[the mathematics book](../mathematics/index.md) proves it.

## 15.3 What LLL and BKZ deliver

*Level: intermediate.*

An attacker needs to know two things about a reduction algorithm: how short a
vector it finds, and how long it takes. Here are the answers, stated without
proof. The derivations are in [chapter 14 of the mathematics
book](../mathematics/index.md).

**LLL.** The 1982 algorithm takes any basis of a lattice of dimension $n$ and
returns a basis whose first vector satisfies, with the usual parameter
$\delta = 3/4$,

$$
\|\mathbf{b}_1\| \le 2^{(n-1)/2}\, \lambda_1(L), \qquad
\|\mathbf{b}_1\| \le 2^{(n-1)/4}\, (\det L)^{1/n}.
$$

So LLL solves approximate SVP with a factor exponential in $n$. That sounds
terrible, and in theory it is. It runs in polynomial time: the original
analysis gives about $n^6 \log^3 B$ bit operations for $n$ vectors in
$\mathbb{Z}^n$ with entries below $B$, and floating-point versions such as
Nguyen and Stehlé's $L^2$ (2005) bring it close to $n^5 \log B (n + \log B)$.
In practice LLL reduces a basis of dimension 100 with 1,000-bit entries in
seconds to minutes.

The surprise, which made LLL a weapon, is that it does far better than its
guarantee. Nicolas Gama and Phong Nguyen measured it in 2008: on random
lattices LLL behaves as if the factor were $\delta_0^{\,n}$ with a **root
Hermite factor** $\delta_0 \approx 1.0219$, where

$$
\|\mathbf{b}_1\| \approx \delta_0^{\,n}\, (\det L)^{1/n}.
$$

Compare $1.0219^n$ with the proved $2^{(n-1)/4} \approx 1.19^n$. In dimension
100, LLL's worst case is a factor of about $2^{25}$, and its typical result a
factor of about $1.0219^{100} \approx 8.7$. For small dimensions this means
LLL often finds the shortest vector outright, which is why every toy attack in
this chapter needs nothing else.

**BKZ.** Claus-Peter Schnorr's block Korkine-Zolotarev reduction (1987, made
practical by Schnorr and Euchner in 1991) trades time for quality. It slides a
window of $\beta$ consecutive basis vectors along the basis and, inside each
window, finds the truly shortest vector with an exact SVP solver, then
LLL-reduces around it. $\beta = 2$ is about LLL; $\beta = n$ is exact SVP. The
quality it reaches is predicted, for large $\beta$, by the root Hermite factor

$$
\delta_\beta \approx \left( \frac{\beta}{2\pi e} (\pi \beta)^{1/\beta} \right)^{\frac{1}{2(\beta - 1)}},
$$

a formula derived from the Gaussian heuristic and checked against
experiments by Yuanmi Chen and Phong Nguyen (2011). A few values:

| block size $\beta$ | 50 | 100 | 200 | 406 | 623 | 873 |
| --- | --- | --- | --- | --- | --- | --- |
| $\delta_\beta$ | 1.0121 | 1.0093 | 1.0063 | 1.0039 | 1.0029 | 1.0023 |

The odd block sizes at the end are not random; §15.10 explains where they
come from.

The cost of BKZ is the cost of its SVP calls in dimension $\beta$ times a
modest number of calls. Two families of SVP solvers compete:

- **Enumeration** searches a tree of candidate vectors with pruning. It needs
  little memory and its time grows like $2^{c\,\beta \log \beta}$, very fast.
  A fit often quoted for the best enumeration is about
  $2^{0.187\beta\log_2\beta - 1.019\beta + 16.1}$ operations.
- **Sieving** keeps a huge list of lattice vectors and combines pairs into
  shorter ones. The best classical sieve (Becker, Ducas, Gama and Laarhoven,
  2016) takes about $2^{0.292\beta + o(\beta)}$ operations and
  $2^{0.2075\beta + o(\beta)}$ vectors of memory; quantum search improves the
  exponent to about $0.257\beta$ (Chailloux and Loyer, 2021).

Sieving wins above block sizes of roughly 70 to 90 in today's
implementations. At the sizes that matter for post-quantum parameters,
$\beta$ in the hundreds, nothing else is close.

The practical meaning for an attacker is this. LLL is free: if your secret
vector is shorter than everything else by a factor of about $1.02^n$, LLL
finds it in seconds. BKZ-20 or so (root Hermite factor about $1.013$) costs
minutes to hours in dimensions of a few hundred. Block sizes past about 100
are computations measured in core-years; the public record for exact SVP on
the Darmstadt challenge lattices, set in 2021 with GPU sieving, is in
dimension 180. Block sizes of 400 and more are far beyond anything that will
ever be run classically.

**A small LLL for the examples.** The attacks below need a reduction routine
to run. Here is the shortest honest one: exact rational arithmetic with
Python's `fractions`, the textbook algorithm with $\delta = 3/4$, slow but
correct. It recomputes the Gram-Schmidt data after every swap, so it is fine
for the dimensions of this chapter (up to 25) and hopeless above that. The
mathematics book explains each line and gives a faster version; real attacks
use fplll or the G6K sieving library.

```python
from fractions import Fraction

def lll(rows, delta=Fraction(3, 4)):
    """Reduce a lattice basis (a list of integer rows). Exact, slow, small."""
    b = [list(r) for r in rows]
    n = len(b)
    dot = lambda u, v: sum(x * y for x, y in zip(u, v))

    def gram_schmidt():
        star, mu = [], [[Fraction(0)] * n for _ in range(n)]
        for i in range(n):
            v = [Fraction(x) for x in b[i]]
            for j in range(i):
                mu[i][j] = dot(b[i], star[j]) / dot(star[j], star[j])
                v = [x - mu[i][j] * y for x, y in zip(v, star[j])]
            star.append(v)
        return [dot(v, v) for v in star], mu

    norm, mu = gram_schmidt()
    k = 1
    while k < n:
        for j in range(k - 1, -1, -1):          # size-reduce b[k]
            q = round(mu[k][j])
            if q:
                b[k] = [x - q * y for x, y in zip(b[k], b[j])]
                for i in range(j):
                    mu[k][i] -= q * mu[j][i]
                mu[k][j] -= q
        if norm[k] >= (delta - mu[k][k - 1] ** 2) * norm[k - 1]:
            k += 1                               # Lovasz condition holds
        else:
            b[k], b[k - 1] = b[k - 1], b[k]      # swap and step back
            norm, mu = gram_schmidt()
            k = max(k - 1, 1)
    return b

print(lll([[14, 9], [19, 13]]))
```

It prints the basis we found by hand:

```
[[-1, -3], [3, -2]]
```

The programs in the rest of the chapter call `lll`, and some call helpers
defined in an earlier block of the same section; run them in one file or one
interactive session, in order.

## 15.4 The knapsack that was supposed to be hard

*Level: beginner.*

The subset-sum problem is easy to state. You are given a list of positive
integers $a_1, \dots, a_n$ and a target $c$, and told that $c$ is the sum of
some of them. Which ones? Writing the choice as bits $m_i \in \{0, 1\}$, you
want

$$
m_1 a_1 + m_2 a_2 + \dots + m_n a_n = c.
$$

Trying every subset takes $2^n$ sums; a meet-in-the-middle split (the trick
of [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)) brings that down
to about $2^{n/2}$, and cleverer algorithms of the 2010s to about $2^{0.29n}$.
No general method does much better, and in 1972 Richard Karp put the problem
on his list of NP-complete problems. That was the attraction. A public-key
scheme whose encryption is a subset sum looks as if it inherits the hardness
of a famous problem.

But some lists are easy. Call a list **superincreasing** if each number is
bigger than all the earlier ones added together, like 1, 2, 4, 8, or

$$
w = (7, 8, 17, 38, 78, 149, 299, 601).
$$

Given a target, work from the largest number down: if the target is at least
601, then 601 must be in the sum, because all the others together make only
596; subtract it and continue. One pass, no search. Merkle and Hellman's idea
was to hide such an easy list behind a disguise only the owner can remove.

**Key generation.** Choose a superincreasing list $w$ (the one above sums to
1,197). Choose a modulus $q$ bigger than that sum, here $q = 1209$, and a
multiplier $r$ with no factor in common with $q$, here $r = 241$. The public
key is the scrambled list

$$
a_i = r\, w_i \bmod q,
$$

which gives

$$
a = (478, 719, 470, 695, 663, 848, 728, 970).
$$

For instance $241 \cdot 7 = 1687 = 1209 + 478$. The scrambled list looks
nothing like a superincreasing one: it is not even in increasing order.

**Encryption** of an 8-bit message is a subset sum. The message
$m = 10110010$ picks the first, third, fourth and seventh numbers:

$$
c = 478 + 470 + 695 + 728 = 2371.
$$

**Decryption** removes the disguise. The owner knows $U = r^{-1} \bmod q$,
here $U = 301$ (check: $241 \cdot 301 = 72541 = 60 \cdot 1209 + 1$).
Multiplying by $U$ turns every $a_i$ back into $w_i$ modulo $q$, so

$$
c\,U \bmod q = \sum m_i w_i \bmod q = \sum m_i w_i,
$$

the last step because the sum of the $w_i$ is below $q$. Here
$2371 \cdot 301 = 713671$ and $713671 \bmod 1209 = 361$. Now the greedy pass:
361 is below 601 (bit 8 is 0), at least 299 (bit 7 is 1, leaving 62), below
149 and 78 (bits 6 and 5 are 0), at least 38 (bit 4 is 1, leaving 24), at
least 17 (bit 3 is 1, leaving 7), below 8 (bit 2 is 0), and at least 7 (bit 1
is 1, leaving 0). Reading from bit 1: $10110010$, the message.

```python
import random
from math import gcd

def keygen(n, rng):
    w, total = [], 0
    for _ in range(n):                 # each weight beats the sum of all before it
        x = total + rng.randint(1, 2 ** 4)
        w.append(x)
        total += x
    q = total + rng.randint(1, 2 ** 4)  # the modulus beats the whole sum
    while True:
        r = rng.randrange(2, q)
        if gcd(r, q) == 1:
            break
    a = [r * x % q for x in w]          # the public key
    return a, (w, q, r)

def encrypt(bits, a):
    return sum(x for bit, x in zip(bits, a) if bit)

def decrypt(c, key):
    w, q, r = key
    t = c * pow(r, -1, q) % q           # undo the scrambling
    bits = []
    for x in reversed(w):               # greedy works on a superincreasing list
        bits.append(1 if t >= x else 0)
        t -= x * bits[-1]
    return bits[::-1]

rng = random.Random(15)
a, key = keygen(8, rng)
print("private w:", key[0], " q =", key[1], " r =", key[2])
print("public  a:", a)
m = [1, 0, 1, 1, 0, 0, 1, 0]
c = encrypt(m, a)
print("message", m, "-> ciphertext", c, "-> decrypts to", decrypt(c, key))
```

```
private w: [7, 8, 17, 38, 78, 149, 299, 601]  q = 1209  r = 241
public  a: [478, 719, 470, 695, 663, 848, 728, 970]
message [1, 0, 1, 1, 0, 0, 1, 0] -> ciphertext 2371 -> decrypts to [1, 0, 1, 1, 0, 0, 1, 0]
```

The real proposal used about 100 items, with the private weights growing from
about 100 bits to about 200 and a modulus of about 200 bits, so the public
numbers were around 200 bits each. Merkle and Hellman also proposed
**iterating** the disguise, multiplying by a second secret pair $(r', q')$
and then a third, on the theory that each layer would make the list look
more random. And they described signatures, though the knapsack is awkward
for signing and the signature variant was never much used.

For four years it was taken seriously. It was one of only two public-key
encryption schemes anyone had, its encryption was hundreds of times faster
than RSA's, and its security rested, so it seemed, on a problem complexity
theory had certified as hard. The flaw in that argument is one this book will
point at again: NP-completeness is a statement about the *hardest* instances.
A cryptosystem uses instances that its own key generation produces, and those
can be special in ways the theory does not see.

!!! note "Life story: the Merkle-Hellman knapsack"
    **Born:** 1978, Ralph Merkle and Martin Hellman, Stanford, in "Hiding
    Information and Signatures in Trapdoor Knapsacks" · **Purpose:** fast
    public-key encryption from the NP-complete subset-sum problem, with a
    superincreasing list disguised by modular multiplication · **Helped:** as
    the second public-key cipher after RSA it was taken seriously for four
    years, and its fall taught cryptographers that a hard problem in general
    does not make a hard cryptosystem · **Status:** the single-iteration
    version broken by Shamir in 1982 and Merkle's \$100 paid; the iterated
    version broken by Brickell in 1984; low-density instances of every kind
    broken by lattice reduction (§15.6)

## 15.5 Shamir's attack: any trapdoor will do

*Level: intermediate.*

Shamir did not try to find the owner's secret. He asked what the secret had
to look like, and found that a whole family of fake secrets would decrypt
just as well.

Start from what the owner knows: $w_i = a_i U \bmod q$ with the $w_i$
superincreasing and their sum below $q$. Write the reduction explicitly as
$a_i U - k_i q = w_i$ for some integers $k_i$, and divide by $q$:

$$
a_i \frac{U}{q} - k_i = \frac{w_i}{q}.
$$

Because the list is superincreasing, the first weights are tiny compared with
$q$: $w_1 < q / 2^{n-1}$, $w_2 < q / 2^{n-2}$, and so on. In the real
proposal, with $n = 100$, $w_1/q$ is around $2^{-100}$. So the unknown ratio
$U/q$ is extraordinarily close to $k_1/a_1$, and to $k_2/a_2$, and to
$k_3/a_3$: all the fractions $k_i/a_i$ for the first few $i$ cluster around
the same point.

Picture it as in Figure 15.3. For each public number draw the sawtooth
$u \mapsto a_i u \bmod 1$, for $u$ between 0 and 1 (think of $u$ as a
candidate for $U/q$). Each saw drops to zero at the points $k/a_i$ and climbs
again. A correct trapdoor is a point where the first few saws are all close
to zero *at the same time*. For a random list of numbers such points would be
rare and scattered. For a disguised superincreasing list they exist by
construction, and they are not points but small intervals.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Sawtooth graphs of 478u, 719u and 470u modulo 1 for u from 0.2465 to 0.2515; all three drop to zero together only near u = 0.24897, the trapdoor 301/1209" fill="currentColor" font-size="14">
<line x1="70" y1="250" x2="610" y2="250" stroke="currentColor" stroke-width="1.2"/>
<line x1="70" y1="30" x2="70" y2="250" stroke="currentColor" stroke-width="1.2"/>
<text x="62" y="255" text-anchor="end">0</text>
<text x="62" y="35" text-anchor="end">1</text>
<text x="124" y="270" text-anchor="middle">0.247</text>
<text x="232" y="270" text-anchor="middle">0.248</text>
<text x="340" y="270" text-anchor="middle">0.249</text>
<text x="448" y="270" text-anchor="middle">0.250</text>
<text x="556" y="270" text-anchor="middle">0.251</text>
<text x="340" y="290" text-anchor="middle">candidate u for U/q</text>
<line x1="70.0" y1="68.1" x2="109.1" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="1"/>
<line x1="109.1" y1="250.0" x2="335.0" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="1"/>
<line x1="335.0" y1="250.0" x2="561.0" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="1"/>
<line x1="561.0" y1="250.0" x2="610.0" y2="202.3" stroke="currentColor" stroke-width="1.6" opacity="1"/>
<line x1="70.0" y1="198.6" x2="185.1" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="0.7" stroke-dasharray="6 4"/>
<line x1="185.1" y1="250.0" x2="335.3" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="0.7" stroke-dasharray="6 4"/>
<line x1="335.3" y1="250.0" x2="485.6" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="0.7" stroke-dasharray="6 4"/>
<line x1="485.6" y1="250.0" x2="610.0" y2="67.7" stroke="currentColor" stroke-width="1.6" opacity="0.7" stroke-dasharray="6 4"/>
<line x1="70.0" y1="61.9" x2="103.3" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="0.45" stroke-dasharray="2 3"/>
<line x1="103.3" y1="250.0" x2="333.1" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="0.45" stroke-dasharray="2 3"/>
<line x1="333.1" y1="250.0" x2="562.9" y2="30.0" stroke="currentColor" stroke-width="1.6" opacity="0.45" stroke-dasharray="2 3"/>
<line x1="562.9" y1="250.0" x2="610.0" y2="204.9" stroke="currentColor" stroke-width="1.6" opacity="0.45" stroke-dasharray="2 3"/>
<line x1="336.3" y1="22" x2="336.3" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="342" y="18">U/q = 301/1209</text>
<line x1="80" y1="308" x2="110" y2="308" stroke="currentColor" stroke-width="1.6"/>
<text x="116" y="313">478u</text>
<line x1="180" y1="308" x2="210" y2="308" stroke="currentColor" stroke-width="1.6" opacity="0.7" stroke-dasharray="6 4"/>
<text x="216" y="313">719u</text>
<line x1="280" y1="308" x2="310" y2="308" stroke="currentColor" stroke-width="1.6" opacity="0.45" stroke-dasharray="2 3"/>
<text x="316" y="313">470u (all mod 1)</text>
</svg>
<figcaption>Figure 15.3. Shamir's picture, for the first three numbers of our public key. Each saw drops to zero at a multiple of 1/478, 1/719 or 1/470. Near 0.2468 two of them nearly agree by chance; only near 0.24897 do all three drop together, and just to the right of that drop lies the trapdoor.</figcaption>
</figure>

Finding the cluster is a small integer problem. From $a_i U - k_i q = w_i$
for $i = 1$ and some other $i$, eliminate $U$:

$$
a_1 k_i - a_i k_1 = \frac{a_i w_1 - a_1 w_i}{q},
$$

and the right-hand side is small, because $w_1$ and $w_i$ are small compared
with $q$. So the attacker looks for small integers $k_1, k_2, \dots, k_s$, for
some fixed small $s$ like 4 or 5, that make all the $a_1 k_i - a_i k_1$
small. That is an integer linear program in a fixed number of variables, and
Hendrik Lenstra had just shown (1981 preprint, published 1983) that such
programs can be solved in polynomial time; the core of his method was the
same basis reduction that became LLL. Once $k_1$ is known, $U/q$ is pinned to
a narrow interval to the right of $k_1/a_1$. Any pair $(U', M')$ with
$U'/M'$ inside that interval, and the right size, turns the public list into
*some* superincreasing list $w'$ whose sum is below $M'$. That list is not
the owner's, but it decrypts every ciphertext, because

$$
c\,U' \bmod M' = \sum m_i (a_i U' \bmod M') = \sum m_i w'_i
$$

whenever $\sum w'_i < M'$.

We can see the family of fake trapdoors on the toy key by brute force, which
is honest at this size and nothing like Shamir's polynomial-time search:

```python
a = [478, 719, 470, 695, 663, 848, 728, 970]       # the public key from above

def superincreasing(w):
    total = 0
    for x in w:
        if x <= total:
            return False
        total += x
    return True

found = []
for M in range(2, 1500):                           # every modulus below 1500 ...
    for U in range(1, M):                          # ... and every multiplier
        w = [x * U % M for x in a]
        if superincreasing(w) and sum(w) < M:
            found.append((U, M, w))
for U, M, w in found:
    print(f"U = {U}, M = {M}, U/M = {U / M:.6f}, w = {w}")
    print("   decrypts 2371 to remainder", 2371 * U % M)
```

```
U = 301, M = 1209, U/M = 0.248966, w = [7, 8, 17, 38, 78, 149, 299, 601]
   decrypts 2371 to remainder 361
U = 361, M = 1450, U/M = 0.248966, w = [8, 9, 20, 45, 93, 178, 358, 720]
   decrypts 2371 to remainder 431
```

The second line is a key the owner never made. Run the greedy pass on 431
with $w' = (8, 9, 20, 45, 93, 178, 358, 720)$: below 720, at least 358
(leaving 73), below 178 and 93, at least 45 (leaving 28), at least 20
(leaving 8), below 9, at least 8. The bits are again $10110010$. Both
trapdoors have the same ratio to six decimal places, the point where the saws
of Figure 15.3 drop together. With larger keys the interval contains many
more such pairs, and the attacker needs only one.

Shamir presented the attack at CRYPTO '82 and the paper appeared in 1984.
Merkle paid the \$100. The iterated knapsack lasted a little longer, because
each layer of disguise had to be peeled separately; Ernest Brickell broke it
in 1984, again with lattice reduction at the core, and Merkle's larger prize
for that version went to him. Leonard Adleman meanwhile showed that LLL could
do the work of Lenstra's integer programming step, and broke the
Graham-Shamir variant the same way; Odlyzko's survey of 1990 tells the
details of who broke what. A long line of repaired knapsacks followed through
the 1980s. Nearly all fell, most to lattices. The longest-lived, the
Chor-Rivest scheme of 1984, survived until Serge Vaudenay broke it in 1998,
with algebra rather than lattice reduction.

!!! note "Life story: Shamir's attack on the knapsack"
    **Born:** 1982, Adi Shamir, presented at CRYPTO '82; journal version in
    *IEEE Transactions on Information Theory*, 1984 · **Purpose:** to find, in
    polynomial time, a multiplier and modulus that turn the public knapsack
    back into a superincreasing list, using Lenstra's integer programming in
    fixed dimension · **Helped:** ended the basic Merkle-Hellman scheme four
    years after its birth, and showed that a cryptosystem needs a trapdoor
    whose structure is invisible, not just a hard problem underneath; its key
    step was quickly redone with LLL · **Status:** a classic; the template for
    "the attacker need not find your key, only a key that works"

## 15.6 The Lagarias-Odlyzko attack: subset sum as a short vector

*Level: intermediate.*

Shamir's attack used the structure of the trapdoor. The next attack ignored
it. Lagarias and Odlyzko, presented in 1983 and published in 1985, solved the
subset sum directly, for any list of numbers that are large compared with
their count, whether or not a trapdoor hides behind them.

Their idea is step 1 of the recipe in §15.1. The secret is the bit vector
$m$. It satisfies one linear equation, $\sum m_i a_i = c$, and it is short:
its entries are 0 or 1. Build a lattice that contains it. The version used
today is the one improved in 1992 by Matthijs Coster, Antoine Joux, Brian
LaMacchia, Andrew Odlyzko, Claus Schnorr and Jacques Stern (often called
CJLOSS), which centers the bits so that the target has entries $\pm 1$. Take
the $n + 1$ rows

$$
\begin{aligned}
\mathbf{r}_i &= (0, \dots, 0, 2, 0, \dots, 0,\; N a_i) && (\text{the 2 in place } i), \\
\mathbf{r}_{n+1} &= (1, 1, \dots, 1,\; N c),
\end{aligned}
$$

with $N$ a large weight. The combination $\sum m_i \mathbf{r}_i - \mathbf{r}_{n+1}$
is

$$
(2m_1 - 1, \dots, 2m_n - 1,\; N(\textstyle\sum m_i a_i - c)) = (\pm 1, \dots, \pm 1,\; 0),
$$

a vector of length $\sqrt{n}$. Any lattice vector with a nonzero last entry
has length at least $N$, so with $N$ large the short vectors all end in 0 and
the reduction is forced to work on the subset-sum equation.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The knapsack lattice: n rows with 2 on the diagonal and N times a_i in the last column, a last row of ones with N times c, and the short target vector of plus and minus ones ending in zero" fill="currentColor" font-size="14">
<text x="40" y="22" font-weight="bold">basis (rows)</text>
<line x1="40" y1="32" x2="40" y2="172" stroke="currentColor" stroke-width="1.4"/>
<line x1="40" y1="32" x2="48" y2="32" stroke="currentColor" stroke-width="1.4"/>
<line x1="40" y1="172" x2="48" y2="172" stroke="currentColor" stroke-width="1.4"/>
<line x1="330" y1="32" x2="330" y2="172" stroke="currentColor" stroke-width="1.4"/>
<line x1="322" y1="32" x2="330" y2="32" stroke="currentColor" stroke-width="1.4"/>
<line x1="322" y1="172" x2="330" y2="172" stroke="currentColor" stroke-width="1.4"/>
<text x="62" y="54">2</text><text x="96" y="54">0</text><text x="130" y="54">⋯</text><text x="168" y="54">0</text><text x="250" y="54">N·a₁</text>
<text x="62" y="82">0</text><text x="96" y="82">2</text><text x="130" y="82">⋯</text><text x="168" y="82">0</text><text x="250" y="82">N·a₂</text>
<text x="62" y="110">⋮</text><text x="96" y="110">⋮</text><text x="130" y="110">⋱</text><text x="168" y="110">⋮</text><text x="258" y="110">⋮</text>
<text x="62" y="138">0</text><text x="96" y="138">0</text><text x="130" y="138">⋯</text><text x="168" y="138">2</text><text x="250" y="138">N·aₙ</text>
<line x1="52" y1="148" x2="318" y2="148" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="62" y="166">1</text><text x="96" y="166">1</text><text x="130" y="166">⋯</text><text x="168" y="166">1</text><text x="250" y="166">N·c</text>
<line x1="226" y1="40" x2="226" y2="170" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="360" y="54">m₁ × row 1</text>
<text x="360" y="82">m₂ × row 2</text>
<text x="360" y="138">mₙ × row n</text>
<text x="360" y="166">−1 × last row</text>
<line x1="60" y1="196" x2="600" y2="196" stroke="currentColor" stroke-width="1"/>
<text x="40" y="222" font-weight="bold">sum</text>
<text x="96" y="222">(±1, ±1, …, ±1,  0)</text>
<text x="360" y="222">length √n; everything else is longer</text>
</svg>
<figcaption>Figure 15.4. The knapsack lattice in the improved (CJLOSS) form. The message bits pick rows; subtracting the last row turns 0 and 1 into −1 and +1 and cancels the large last column exactly.</figcaption>
</figure>

**When is the target unusually short?** Steps 4 and 5 of the recipe need a
number to compare against. Lagarias and Odlyzko measured a knapsack by its
**density**

$$
d = \frac{n}{\log_2 \max_i a_i},
$$

the number of items divided by the bit length of the numbers. A knapsack of
100 items with 200-bit numbers has density 0.5. Low density means the numbers
are large, so few subsets share a sum, and the right one is unusually short.

A heuristic count shows where the line falls. The lattice vectors that end in
0 form a lattice of dimension $n$ whose determinant is about
$2^n \cdot \max a_i$, so $(\det)^{1/n} \approx 2 \cdot 2^{1/d}$. By the
Gaussian heuristic, its shortest vectors have length about
$\sqrt{n / (2\pi e)} \cdot 2^{1 + 1/d}$. The target has length $\sqrt{n}$. It
stands out when

$$
\sqrt{n} < \sqrt{\frac{n}{2\pi e}}\, 2^{1 + 1/d}
\quad\Longleftrightarrow\quad
2^{1/d} > \frac{\sqrt{2\pi e}}{2} \approx 2.07
\quad\Longleftrightarrow\quad
d \lesssim 0.96.
$$

The careful argument, with the CJLOSS lattice and an SVP oracle, gives
$d < 0.9408$. The same count for Lagarias and Odlyzko's original lattice,
whose target has 0 and 1 entries and length about $\sqrt{n/2}$, gives
$2^{1/d} > \sqrt{\pi e} \approx 2.92$, that is $d \lesssim 0.65$, and their
proved bound is $d < 0.6463$. Below those densities, almost every subset-sum
instance is solved by one shortest-vector computation.

The Merkle-Hellman construction cannot get its density up to 1. The
superincreasing weights at least double at each step, so the modulus has at
least about $n$ bits and the public numbers have more; the real proposals
landed near density 0.5. The knapsack was dead whichever attack you chose.
The one assumption is the SVP oracle, and in the 1980s LLL was a weak
substitute for one in dimension 100. In practice it was enough for the sizes
that were proposed, and today BKZ makes it more than enough.

**Code it.** A 24-item instance from the key generator of §15.4, attacked
with `lll`. The weight $N = 2^{20}$ is large enough that no short vector can
afford a nonzero last entry.

```python
def knapsack_attack(a, c):
    n, N = len(a), 2 ** 20                 # N makes the last column count heavily
    rows = [[2 if j == i else 0 for j in range(n)] + [N * a[i]] for i in range(n)]
    rows.append([1] * n + [N * c])
    for v in lll(rows):
        if v[-1] == 0 and all(x in (-1, 1) for x in v[:-1]):
            for s in (1, -1):              # the vector or its negative
                bits = [(1 + s * x) // 2 for x in v[:-1]]
                if encrypt(bits, a) == c:
                    return v, bits
    return None, None

from math import log2
rng = random.Random(1982)
a, key = keygen(24, rng)
m = [rng.randint(0, 1) for _ in range(24)]
c = encrypt(m, a)
print("density:", round(24 / log2(max(a)), 3))
v, bits = knapsack_attack(a, c)
print("short vector:", v)
print("recovered the message:", bits == m)
```

```
density: 0.927
short vector: [-1, 1, -1, -1, -1, -1, -1, 1, -1, -1, -1, 1, 1, -1, -1, 1, -1, 1, -1, -1, -1, 1, -1, 1, 0]
recovered the message: True
```

It runs in a few seconds, never looks at the private key, and would work the
same on a list of random numbers with a planted subset. Note the density.
Our toy key generator adds only a few bits per weight, so its density, 0.927,
is higher than the real proposals' and just below the 0.9408 line; LLL in
dimension 25 found the vector anyway. Try `keygen` with larger steps and the
density drops and the attack gets easier, not harder.

**Fix it?** Two repairs were tried. One raised the density to 1 or above,
where many subsets share a sum and the right one is no longer the shortest;
but a trapdoor with density above 1 is hard to build, and the attempts mostly
leaked structure elsewhere. The other made $n$ large enough that lattice
reduction would fail; the keys grew past any advantage over RSA. Subset sum
at density near 1 with large $n$ is still considered hard, and later
theoretical work (Impagliazzo and Naor, 1989; Lyubashevsky, Palacio and
Segev, 2010) built pseudorandom generators and encryption on it. But public
key knapsacks, the 1980s kind with a hidden easy instance, did not come back.

!!! note "Life story: the Lagarias-Odlyzko attack"
    **Born:** 1983, Jeffrey Lagarias and Andrew Odlyzko, Bell Labs, presented
    at FOCS and published in the *Journal of the ACM* in 1985; improved in
    1992 by Coster, Joux, LaMacchia, Odlyzko, Schnorr and Stern · **Purpose:**
    to solve subset-sum problems of low density directly, as a shortest-vector
    problem, with no knowledge of any trapdoor · **Helped:** finished off
    knapsack cryptography, gave the density thresholds 0.6463 and 0.9408 that
    every later knapsack design had to beat, and taught the embedding pattern
    that every lattice attack in this chapter follows · **Status:** a standard
    tool; the density bounds assume an exact SVP oracle, so in high dimension
    the practical reach depends on BKZ

## 15.7 Coppersmith's method through lattices

*Level: expert.*

The knapsack attack found a short vector whose entries *were* the secret.
Coppersmith's method uses the lattice in a subtler way: the short vector it
finds is a polynomial, and the secret is that polynomial's root.

The problem is this. A monic polynomial $f(x)$ of degree $\delta$ and a
modulus $N$ are known, and $f(x_0) \equiv 0 \pmod N$ for some unknown integer
$x_0$ with $|x_0| < X$. Find $x_0$. If $N$ were prime this would be easy;
modulo a composite of unknown factorization it is in general as hard as
factoring, since even $x^2 - a$ has roots that factor $N$. Don Coppersmith
showed in 1996 that the problem is easy anyway when $x_0$ is **small**, up to
$X \approx N^{1/\delta}$. [Chapter 13](13-Attacks-on-RSA.md) (§13.6) gave the
idea and ran the smallest lattice, three rows, on a quadratic. This section
states the lemma that makes it work, proves it, and builds the full lattice,
the one with powers of $f$, that reaches past where three rows give up.

**Howgrave-Graham's lemma.** For a polynomial $h(x) = \sum_{i=0}^{\omega-1} h_i x^i$
write $h(xX)$ for the polynomial with coefficients $h_i X^i$, and
$\|h(xX)\|$ for the Euclidean length of that coefficient vector.

> Let $h$ have integer coefficients and at most $\omega$ terms, let
> $h(x_0) \equiv 0 \pmod M$ with $|x_0| < X$, and let
> $\|h(xX)\| < M / \sqrt{\omega}$. Then $h(x_0) = 0$ over the integers.

*Proof.* By the triangle inequality and then Cauchy-Schwarz,

$$
|h(x_0)| \le \sum_i |h_i|\,|x_0|^i < \sum_i |h_i| X^i
\le \sqrt{\omega}\, \Big(\sum_i h_i^2 X^{2i}\Big)^{1/2}
= \sqrt{\omega}\, \|h(xX)\| < M.
$$

So $h(x_0)$ is a multiple of $M$ whose absolute value is below $M$, and the
only such multiple is 0. $\square$

The lemma turns a hard question into an easy one. A root modulo $M$ is hard
to find; an integer root of an integer polynomial is easy (factor it over the
rationals, or use Newton's method on the real line). All we need is a
polynomial that shares the root modulo $M$ and has **small coefficients**,
measured with the weights $X^i$. Short vectors in a lattice are exactly that.

**The polynomials.** Pick a parameter $m \ge 1$ and take $M = N^m$. Every
polynomial

$$
g_{i,j}(x) = N^{m-j}\, x^i\, f(x)^j \qquad (0 \le j < m,\ 0 \le i < \delta),
$$

together with $f(x)^m$, vanishes at $x_0$ modulo $N^m$: the factor $f(x_0)^j$
brings $N^j$ and the coefficient brings the rest. So does every integer
combination of them. Order them by degree, $g_{0,0}, g_{1,0}, \dots$, and
$g_{i,j}$ has degree $\delta j + i$ with leading coefficient $N^{m-j}$,
because $f$ is monic. Written as coefficient vectors of $g(xX)$, they form a
lower-triangular matrix of dimension $\omega = \delta m + 1$, whose diagonal
is $N^{m-j} X^{\delta j + i}$. Its determinant is the product of the
diagonal:

$$
\det L = N^{\delta m(m+1)/2}\; X^{\omega(\omega-1)/2}.
$$

**The bound.** LLL returns a first vector of length at most
$2^{(\omega-1)/4} (\det L)^{1/\omega}$. If that is below $N^m/\sqrt{\omega}$,
the lemma applies. The factors $2^{(\omega-1)/4}$ and $\sqrt{\omega}$ depend
only on the dimension, so ignore them and ask for $(\det L)^{1/\omega} < N^m$.
Taking logarithms base $N$ and solving for $X$ gives

$$
X < N^{\frac{\delta(m-1) + 2}{\delta(\delta m + 1)}}.
$$

For $m = 1$ that is $N^{2/(\delta(\delta+1))}$, the three-row bound of
Chapter 13. As $m$ grows it climbs towards $N^{1/\delta}$:

| degree $\delta$ | $m = 1$ | $m = 2$ | $m = 3$ | $m = 5$ | limit |
| --- | --- | --- | --- | --- | --- |
| 2 | $N^{0.333}$ | $N^{0.400}$ | $N^{0.429}$ | $N^{0.455}$ | $N^{0.5}$ |
| 3 | $N^{0.167}$ | $N^{0.238}$ | $N^{0.267}$ | $N^{0.294}$ | $N^{0.333}$ |

Coppersmith's own construction also adds the shifts $x^i f(x)^m$ for
$i < \delta$, which helps a little; the shape of the argument is the same.
The price is the dimension: reaching $N^{1/\delta - \varepsilon}$ takes
$m$ around $1/(\delta \varepsilon)$ and a lattice of dimension around
$1/\varepsilon$, and the last few bits up to $N^{1/\delta}$ are bought by
brute force over the top bits of $x_0$.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The Coppersmith lattice for a quadratic with m = 2 as a five by five lower triangular matrix: rows N squared, N squared x, N f, N x f and f squared; columns 1, x, x squared, x cubed, x to the fourth; diagonal N squared, N squared X, N X squared, N X cubed, X to the fourth" fill="currentColor" font-size="14">
<text x="170" y="40" text-anchor="middle">1</text>
<text x="250" y="40" text-anchor="middle">x·X</text>
<text x="330" y="40" text-anchor="middle">x²·X²</text>
<text x="410" y="40" text-anchor="middle">x³·X³</text>
<text x="490" y="40" text-anchor="middle">x⁴·X⁴</text>
<text x="120" y="80" text-anchor="end">N²</text>
<text x="120" y="120" text-anchor="end">N²·x</text>
<text x="120" y="160" text-anchor="end">N·f</text>
<text x="120" y="200" text-anchor="end">N·x·f</text>
<text x="120" y="240" text-anchor="end">f²</text>
<line x1="130" y1="55" x2="130" y2="255" stroke="currentColor" stroke-width="1.4"/>
<line x1="130" y1="55" x2="138" y2="55" stroke="currentColor" stroke-width="1.4"/>
<line x1="130" y1="255" x2="138" y2="255" stroke="currentColor" stroke-width="1.4"/>
<line x1="530" y1="55" x2="530" y2="255" stroke="currentColor" stroke-width="1.4"/>
<line x1="522" y1="55" x2="530" y2="55" stroke="currentColor" stroke-width="1.4"/>
<line x1="522" y1="255" x2="530" y2="255" stroke="currentColor" stroke-width="1.4"/>
<rect x="134" y="60" width="72" height="32" fill="currentColor" opacity="0.13"/>
<rect x="214" y="100" width="72" height="32" fill="currentColor" opacity="0.13"/>
<rect x="294" y="140" width="72" height="32" fill="currentColor" opacity="0.13"/>
<rect x="374" y="180" width="72" height="32" fill="currentColor" opacity="0.13"/>
<rect x="454" y="220" width="72" height="32" fill="currentColor" opacity="0.13"/>
<text x="170" y="81" text-anchor="middle" font-weight="bold">N²</text>
<text x="250" y="121" text-anchor="middle" font-weight="bold">N²X</text>
<text x="330" y="161" text-anchor="middle" font-weight="bold">NX²</text>
<text x="410" y="201" text-anchor="middle" font-weight="bold">NX³</text>
<text x="490" y="241" text-anchor="middle" font-weight="bold">X⁴</text>
<text x="250" y="81" text-anchor="middle" opacity="0.45">0</text><text x="330" y="81" text-anchor="middle" opacity="0.45">0</text><text x="410" y="81" text-anchor="middle" opacity="0.45">0</text><text x="490" y="81" text-anchor="middle" opacity="0.45">0</text>
<text x="330" y="121" text-anchor="middle" opacity="0.45">0</text><text x="410" y="121" text-anchor="middle" opacity="0.45">0</text><text x="490" y="121" text-anchor="middle" opacity="0.45">0</text>
<text x="410" y="161" text-anchor="middle" opacity="0.45">0</text><text x="490" y="161" text-anchor="middle" opacity="0.45">0</text>
<text x="490" y="201" text-anchor="middle" opacity="0.45">0</text>
<text x="170" y="121" text-anchor="middle" opacity="0.45">0</text>
<text x="170" y="161" text-anchor="middle">∗</text><text x="250" y="161" text-anchor="middle">∗</text>
<text x="170" y="201" text-anchor="middle" opacity="0.45">0</text><text x="250" y="201" text-anchor="middle">∗</text><text x="330" y="201" text-anchor="middle">∗</text>
<text x="170" y="241" text-anchor="middle">∗</text><text x="250" y="241" text-anchor="middle">∗</text><text x="330" y="241" text-anchor="middle">∗</text><text x="410" y="241" text-anchor="middle">∗</text>
<text x="545" y="125">every row</text>
<text x="545" y="145">vanishes at</text>
<text x="545" y="165">x₀ mod N²</text>
<text x="20" y="290">det = N²·N²X·NX²·NX³·X⁴ = N⁶X¹⁰; a short row h(xX) with ‖h(xX)‖ &lt; N²/√5</text>
<text x="20" y="312">is a polynomial whose root x₀ holds over the integers, not just modulo N².</text>
</svg>
<figcaption>Figure 15.5. Coppersmith's lattice for a monic quadratic with m = 2. Ordering the polynomials by degree makes the basis triangular, so the determinant is the product of the shaded diagonal, and the bound on X falls out of one inequality.</figcaption>
</figure>

**A small example.** Take $N = 10{,}403 = 101 \cdot 103$ and the monic
quadratic

$$
f(x) = x^2 + 5874x + 4090,
$$

which has the root $x_0 = 24$ modulo $N$: $576 + 140{,}976 + 4{,}090 =
145{,}642 = 14 \cdot 10{,}403$. The attacker knows $N$, $f$ and that
$|x_0| \le X = 33$, and nothing about the factors of $N$.

The three-row lattice of Chapter 13 cannot do it. Its bound is
$N^{1/3} \approx 21.8$, below 33, and the arithmetic agrees: its determinant
is $N^2 X^3$, so $(\det)^{1/3} \approx 15{,}700$, while the lemma wants a
vector shorter than $N/\sqrt 3 \approx 6{,}000$. The Gaussian heuristic puts
the shortest vector near $6{,}600$. There is nothing short enough to find.

With $m = 2$ the bound is $N^{0.4} \approx 40$, and 33 is inside it. The five
polynomials are $N^2$, $N^2 x$, $N f$, $N x f$ and $f^2$, all vanishing at 24
modulo $N^2 = 108{,}222{,}409$. Their scaled coefficient vectors, the rows
of the basis, are:

| row | $1$ | $x \cdot X$ | $x^2 \cdot X^2$ | $x^3 \cdot X^3$ | $x^4 \cdot X^4$ |
| --- | ---: | ---: | ---: | ---: | ---: |
| $N^2$ | 108,222,409 | 0 | 0 | 0 | 0 |
| $N^2 x$ | 0 | 3,571,339,497 | 0 | 0 | 0 |
| $N f$ | 42,548,270 | 2,016,538,326 | 11,328,867 | 0 | 0 |
| $N x f$ | 0 | 1,404,092,910 | 66,545,764,758 | 373,852,611 | 0 |
| $f^2$ | 16,728,100 | 1,585,627,560 | 37,583,628,984 | 422,187,876 | 1,185,921 |

The determinant is $N^6 X^{10}$, so $(\det)^{1/5} \approx 7.2 \times 10^7$,
and the lemma's threshold is $N^2/\sqrt5 \approx 4.84 \times 10^7$. The
proved LLL guarantee, a factor $2^{(5-1)/4} = 2$ above the determinant root,
does not promise success here. But §15.3 said LLL does better than its
guarantee in small dimensions, and the Gaussian heuristic puts the shortest
vector near $3.9 \times 10^7$, under the threshold. LLL returns, as its first
row,

$$
(-291{,}816,\ -18{,}731{,}097,\ 4{,}875{,}453,\ 35{,}505{,}756,\ -8{,}301{,}447),
$$

of length about $4.13 \times 10^7$. Dividing the $i$-th entry by $X^i$ gives

$$
h(x) = -7x^4 + 988x^3 + 4477x^2 - 567{,}609x - 291{,}816,
$$

which is the combination $h = 9346\,N^2 + 13{,}421\,N^2 x - 23{,}769\,Nf +
8\,Nxf - 7f^2$, so $h(24) \equiv 0 \pmod{N^2}$. Its scaled length is below
$N^2/\sqrt 5$, so by the lemma $h(24) = 0$ over the integers. It is: the
integer polynomial $h$ has the factor $x - 24$, and 24 is its only integer
root of size at most 33. The root has been read off a polynomial that LLL
built from public data, without factoring $N$.

```python
def poly_mul(f, g):
    out = [0] * (len(f) + len(g) - 1)
    for i, x in enumerate(f):
        for j, y in enumerate(g):
            out[i + j] += x * y
    return out

def value(h, x):
    return sum(c * x ** i for i, c in enumerate(h))

def small_roots(polys, X):
    """Coefficient rows of g(xX), LLL, then integer roots of the first row."""
    w = max(len(p) for p in polys)
    rows = [[(p[i] if i < len(p) else 0) * X ** i for i in range(w)] for p in polys]
    g = lll(rows)[0]
    h = [c // X ** i for i, c in enumerate(g)]     # undo the scaling
    return h, [x for x in range(-X, X + 1) if value(h, x) == 0]

N, X = 10403, 33                                   # N = 101 * 103, roots up to 33
f = [4090, 5874, 1]                                # f(x) = x^2 + 5874x + 4090
print("f(24) mod N =", value(f, 24) % N)

h, roots = small_roots([[N], [0, N], f], X)        # three rows: N, Nx, f
print("3 rows:", h, "integer roots", roots)

Nf = [N * c for c in f]
h, roots = small_roots([[N * N], [0, N * N], Nf, [0] + Nf, poly_mul(f, f)], X)
print("5 rows:", h, "integer roots", roots)
```

```
f(24) mod N = 0
3 rows: [10403, 0, 0] integer roots []
5 rows: [-291816, -567609, 4477, 988, -7] integer roots [24]
```

The three-row lattice returns the constant polynomial $N$, which has no
roots: nothing shorter existed. The five-row lattice returns $h$, coefficients
listed from the constant term up, and its root. The program finds integer
roots by trying every candidate, which is honest only at toy size; with a
real $X$ of hundreds of bits you would factor $h$ over the integers, which
takes polynomial time.

**What it does to RSA.** Every use in RSA writes an unknown as a small root.
A message encrypted with $e = 3$ whose unknown part is under a third of the
bits of $N$ is a root of $(B + x)^3 - c$ modulo $N$; Håstad's broadcast
attack needs fewer recipients; the short-pad attack recovers random padding;
a root modulo an unknown divisor $p$ factors $N$ from half the bits of $p$;
Boneh and Durfee (1999) broke private exponents below $N^{0.292}$; and ROCA
(2017) factored keys from millions of Infineon smart cards and Estonian
identity cards. [Chapter 13](13-Attacks-on-RSA.md) tells each story with its
numbers. The defenses are the same throughout: OAEP padding, $e = 65537$,
and primes with no pattern.

!!! note "Life story: Coppersmith's method"
    **Born:** 1996, Don Coppersmith, IBM Thomas J. Watson Research Center, in
    two EUROCRYPT 1996 papers, collected in the *Journal of Cryptology* in
    1997; recast in its lattice-of-polynomials form by Nick Howgrave-Graham
    in 1997 · **Purpose:** to find small roots of a polynomial modulo a
    composite of unknown factorization, and small roots of two-variable
    integer polynomials, in polynomial time · **Helped:** broke
    low-exponent RSA with stereotyped or short-padded messages, factored $N$
    from half the bits of $p$, and underlies Boneh-Durfee, partial key
    exposure and ROCA (2017) · **Status:** a standard tool, with proved bounds
    for one variable and heuristic ones for several; Alexander May's 2003
    bound $N^{\beta^2/\delta}$ for roots modulo an unknown divisor is the
    usual reference point

## 15.8 The hidden number problem

*Level: intermediate.*

In 1996 Dan Boneh and Ramarathnam Venkatesan wanted to prove something about
Diffie-Hellman: that the top bits of a shared secret $g^{ab}$ are as hard to
compute as the whole secret. Their proof needed a way to turn an oracle for a
few top bits into the full value, and they set it up as a puzzle of its own.

**The problem.** A prime $p$ and a hidden number $\alpha$ in
$\{1, \dots, p - 1\}$. You are given random multipliers $t_1, \dots, t_n$
and, for each, the $\ell$ most significant bits of $\alpha t_i \bmod p$.
Find $\alpha$.

Knowing the top $\ell$ bits of a number below $p$ means knowing an
approximation $a_i$ with

$$
\alpha t_i \equiv a_i + e_i \pmod p, \qquad |e_i| \le \frac{p}{2^{\ell + 1}}.
$$

Each sample is a linear relation modulo $p$ with a small unknown error. That
is the shape the recipe of §15.1 wants. Boneh and Venkatesan showed that
about $\sqrt{\log_2 p}$ bits from each of about $2\sqrt{\log_2 p}$ samples
suffice, using LLL and Babai's nearest-plane algorithm. In practice, with
stronger reduction, far fewer bits per sample are enough.

**The lattice.** Rewrite the relation without the modulus:
$e_i = \alpha t_i - a_i - c_i p$ for some integer $c_i$. The vector of errors
is an integer combination of known vectors: $\alpha$ times $(t_1, \dots, t_n)$,
minus $(a_1, \dots, a_n)$, minus multiples of $p$ in each coordinate. Kannan's
embedding (§15.2) makes it a short vector. With a weight $W = 2^{\ell+1}$ that
scales each error up to about the size of $p$, take the $n + 2$ rows

$$
B = \begin{pmatrix}
pW & & & & 0 & 0\\
 & pW & & & 0 & 0\\
 & & \ddots & & \vdots & \vdots\\
 & & & pW & 0 & 0\\
W t_1 & W t_2 & \cdots & W t_n & 1 & 0\\
-W a_1 & -W a_2 & \cdots & -W a_n & 0 & p
\end{pmatrix}.
$$

$\alpha$ times the $t$-row, plus the $a$-row once, minus $c_i$ times row $i$,
is

$$
\mathbf{v} = (W e_1,\ W e_2,\ \dots,\ W e_n,\ \alpha,\ p).
$$

Every entry is at most $p$ in absolute value, so $\|\mathbf{v}\| \le p\sqrt{n+2}$,
and $\alpha$ sits in the second-last place. (A lattice vector can carry
$\alpha - p$ there instead of $\alpha$; reduce it modulo $p$.) The
determinant is $(pW)^n p$, so the Gaussian heuristic expects the shortest
vectors near

$$
\sqrt{\frac{n+2}{2\pi e}}\; p^{\frac{n+1}{n+2}}\; W^{\frac{n}{n+2}}.
$$

For $\mathbf{v}$ to stand out, $W^{n/(n+2)}$ has to beat the small factor
by which $\mathbf{v}$ is longer than $p$. Roughly: the samples must carry,
between them, noticeably more bits than $p$ has, $n\ell > \log_2 p$ with
some room to spare.

**A toy example.** Take the 14-bit prime $p = 10{,}007$, samples with
$\ell = 4$ known bits, so errors up to $p/32 \approx 312$, and $n = 5$
samples, 20 known bits in all against a 13.3-bit secret. With the hidden
$\alpha$ drawn at random, the public data are

$$
t = (9151,\ 7452,\ 6863,\ 9189,\ 4957), \qquad
a = (4918,\ 5528,\ 1216,\ 9581,\ 1270).
$$

With $W = 32$ the basis, seven rows, is:

| row | 1 | 2 | 3 | 4 | 5 | $\alpha$ | embed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| $pW e_1$ | 320,224 | 0 | 0 | 0 | 0 | 0 | 0 |
| $pW e_2$ | 0 | 320,224 | 0 | 0 | 0 | 0 | 0 |
| $pW e_3$ | 0 | 0 | 320,224 | 0 | 0 | 0 | 0 |
| $pW e_4$ | 0 | 0 | 0 | 320,224 | 0 | 0 | 0 |
| $pW e_5$ | 0 | 0 | 0 | 0 | 320,224 | 0 | 0 |
| $t$ | 292,832 | 238,464 | 219,616 | 294,048 | 158,624 | 1 | 0 |
| $a$ | −157,376 | −176,896 | −38,912 | −306,592 | −40,640 | 0 | 10,007 |

LLL returns, among its rows,

$$
(-2720,\ 7520,\ 2400,\ -8416,\ -1376,\ -672,\ 10{,}007),
$$

of length about 15,600, against a Gaussian-heuristic length of about 20,400
for the lattice. Its last entry is $p$, so it used the $a$-row exactly once,
which is the sign of the target. Divide the first five entries by 32: the
errors are $(-85, 235, 75, -263, -43)$, all inside $\pm 312$. The
second-last entry gives $\alpha \equiv -672 \equiv 9335 \pmod{10{,}007}$.
Check one sample: $9335 \cdot 9151 \bmod 10{,}007 = 4833 = 4918 - 85$.

```python
import random

def hnp_lattice(p, t, a, W):
    n = len(t)
    rows = [[p * W if j == i else 0 for j in range(n)] + [0, 0] for i in range(n)]
    rows.append([W * ti for ti in t] + [1, 0])       # alpha times this row ...
    rows.append([-W * ai for ai in a] + [0, p])      # ... plus this one, once
    return rows

def solve_hnp(p, t, a, W):
    for v in lll(hnp_lattice(p, t, a, W)):
        if abs(v[-1]) == p:                          # used the a-row exactly once
            v = v if v[-1] > 0 else [-x for x in v]
            guess = v[-2] % p
            near = all(abs((guess * ti - ai + p // 2) % p - p // 2) <= p // W
                       for ti, ai in zip(t, a))      # check against public data
            return v, guess if near else None
    return None, None

p, n, l = 10007, 5, 4               # a 14-bit prime, 5 samples, 4 bits each
W = 2 ** (l + 1)                    # errors are below p/W; weighting makes them ~p
rng = random.Random(1996)
alpha = rng.randrange(1, p)         # the hidden number
t = [rng.randrange(1, p) for _ in range(n)]
a = [(alpha * ti - rng.randint(-(p // W), p // W)) % p for ti in t]
print("t =", t)
print("a =", a)
v, guess = solve_hnp(p, t, a, W)
print("short vector:", v)
print("hidden number:", guess, " right:", guess == alpha)
```

```
t = [9151, 7452, 6863, 9189, 4957]
a = [4918, 5528, 1216, 9581, 1270]
short vector: [-2720, 7520, 2400, -8416, -1376, -672, 10007]
hidden number: 9335  right: True
```

The program checks its answer the way an attacker would, against the public
samples: every $\alpha t_i - a_i$ must land within $p/W$ of a multiple of
$p$. How many known bits does the lattice need? Run it on fresh random
instances with five samples and fewer bits each:

```python
for l in range(1, 6):               # how many known bits does the lattice need?
    W, wins = 2 ** (l + 1), 0
    for trial in range(20):
        alpha = rng.randrange(1, p)
        t = [rng.randrange(1, p) for _ in range(n)]
        a = [(alpha * ti - rng.randint(-(p // W), p // W)) % p for ti in t]
        wins += solve_hnp(p, t, a, W)[1] == alpha
    print(f"known bits per sample: {l}, in all: {n * l:2}, solved {wins} of 20")
```

```
known bits per sample: 1, in all:  5, solved 0 of 20
known bits per sample: 2, in all: 10, solved 3 of 20
known bits per sample: 3, in all: 15, solved 17 of 20
known bits per sample: 4, in all: 20, solved 20 of 20
known bits per sample: 5, in all: 25, solved 20 of 20
```

The threshold is where the information count says it should be. With 10
known bits against a 13.3-bit secret, many values of $\alpha$ fit the data
and the lattice usually picks a wrong short vector (which the check then
rejects); with 15 bits it nearly always works.

**From signatures to hidden numbers.** A DSA signature $(r, s)$ on a message
with hash $H$ satisfies $s \equiv k^{-1}(H + x r) \pmod q$, where $x$ is the
private key and $k$ the nonce. Solve for $k$:

$$
k \equiv s^{-1} r \cdot x + s^{-1} H \pmod q.
$$

If the signer's nonces are short, say every $k_i < q/2^{\ell}$, put
$t_i = s_i^{-1} r_i$ and $u_i = s_i^{-1} H_i$. Then
$x\, t_i \equiv -u_i + k_i \pmod q$ with $k_i$ small: an instance of the
hidden number problem with the private key as the hidden number, the public
values $-u_i$ as the approximations, and the nonces as the errors (shift
each by half its range to center them). Known top bits of $k$, known low bits, or
a nonce from a biased generator all reduce to the same form, and ECDSA and
Schnorr signatures behave identically. This is the lattice at the heart of
every partial-nonce attack: Howgrave-Graham and Smart applied it to DSA in
2001, Nguyen and Shparlinski proved how many bits suffice (2002 for DSA,
2003 for ECDSA), and it has since recovered keys from timing leaks in smart
cards, TPM chips and libraries. Below about two bits per signature the
lattice runs out of room, and Bleichenbacher's Fourier-analysis method,
presented in 2000, takes over: it needs many more signatures but can use a
bias of a fraction of a bit. [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md)
owns those stories (Minerva, TPM-Fail, LadderLeak, the blockchain scans),
how to size an attack in signatures against leaked bits, and the fix,
nonces that are uniform and computed in constant time.

!!! note "Life story: the hidden number problem"
    **Born:** 1996, Dan Boneh and Ramarathnam Venkatesan, CRYPTO '96, in a
    paper proving that the most significant bits of Diffie-Hellman secrets
    are as hard to compute as the whole secret · **Purpose:** to recover a
    secret $\alpha$ modulo $p$ from approximations of many random multiples
    $\alpha t_i$, solved as a closest-vector problem with LLL and Babai's
    algorithm · **Helped:** became the standard attack on DSA, ECDSA and
    Schnorr signatures with partially known or biased nonces (Howgrave-Graham
    and Smart, 2001; Nguyen and Shparlinski, 2002 and 2003), and a tool in
    proofs of bit security · **Status:** in active use, both as an attack and
    as a research problem; Albrecht and Heninger (2021) pushed the lattice
    version below the old limits, and Fourier methods handle leaks of under
    one bit

## 15.9 Early lattice schemes that fell

*Level: intermediate.*

In 1996 Miklós Ajtai, at IBM Almaden, proved a theorem that changed what
lattices were for. He built a family of random lattice problems (what is now
called the short integer solution problem, SIS) and showed that solving a
random instance, on average, would let you approximate shortest vectors in
*every* lattice of a related dimension, in the worst case. No cryptographic
assumption had ever had a guarantee like that: the instances a key generator
produces could not be easy unless the hardest lattices were easy too. Within
a year there were three public-key cryptosystems built on lattices.
The attacks of this chapter went straight at all three.

**Ajtai-Dwork (1997).** Ajtai and Cynthia Dwork, presented at STOC in 1997,
gave the first encryption scheme whose security rested on a worst-case
lattice problem, a version of unique SVP. It encrypted one bit at a time,
its public key was a long list of high-dimensional vectors, and it made
occasional decryption errors (Goldreich, Goldwasser and Halevi removed them
the same year). In 1998 Phong Nguyen and Jacques Stern took it apart at
CRYPTO. They did not refute the theorem; they could not, it is a theorem.
They showed that the theorem is asymptotic, and that at any dimension where
the keys fit in a computer the lattice behind them was within reach of
reduction: they recovered the secret of practical-size instances with a
heuristic lattice attack, and estimated that resisting it would take public
keys of about a gigabyte. The lesson has stayed: a worst-case reduction tells
you the *shape* of a problem is right, not that your *parameters* are big
enough.

**GGH (1997).** Oded Goldreich, Shafi Goldwasser and Shai Halevi, at CRYPTO
'97, turned the good-basis, bad-basis picture of §15.2 into a cryptosystem.
The private key is a good basis $R$, nearly orthogonal, of a lattice of
dimension $n$; the public key is a bad basis $B = UR$ of the same lattice,
for a random unimodular $U$. To encrypt an integer vector $\mathbf{m}$,
send

$$
\mathbf{c} = \mathbf{m} B + \mathbf{e},
$$

a lattice point pushed off the lattice by a small error $\mathbf{e}$, whose
entries were all $\pm\sigma$ with $\sigma = 3$. The owner rounds
$\mathbf{c}$ in the good basis (Babai's method) and lands on $\mathbf{m}B$;
anyone else, rounding in the bad basis, lands somewhere else. The designers
published five challenge ciphertexts in dimensions 200, 250, 300, 350 and
400, expecting the larger ones to stand for a long time.

Phong Nguyen broke them in 1999, with two observations. First, every entry of
$\mathbf{e}$ was $+3$ or $-3$, so $\mathbf{e} + 3\cdot(1, \dots, 1)$ is
$0$ or $6$ in every place, and

$$
\mathbf{c} + 3\cdot(1, \dots, 1) \equiv \mathbf{m} B \pmod 6 .
$$

That is a linear system modulo 6 (modulo 2 and modulo 3 separately), which
gives $\mathbf{m} \bmod 6$ by linear algebra, when $B$ is invertible modulo 2
and 3 or nearly so. Second, with $\mathbf{m}_6 = \mathbf{m} \bmod 6$ known,

$$
\frac{\mathbf{c} - \mathbf{m}_6 B}{6} = \frac{\mathbf{m} - \mathbf{m}_6}{6}\, B + \frac{\mathbf{e}}{6},
$$

a new closest-vector problem in the same lattice with an error of
$\pm 1/2$ in each place instead of $\pm 3$: six times closer. The
leaked residue had turned a hard instance into an easy one. With this and
embedding, Nguyen decrypted the challenges in dimensions 200 to 350, leaving
only the largest; that one was reported broken in 2010 by Moon Sung Lee and
Sang Geun Hahn, using a different weakness. Nguyen's conclusion was that
GGH could be secure only in dimensions where its keys, a full $n \times n$
basis, reach megabytes, and then it was no longer practical. Daniele
Micciancio's 2001 variant, publishing the basis in Hermite normal form,
shrank the keys but did not change the dimensions needed.

The signature side fared no better. GGH signatures, and NTRUSign built on
the same idea, sign by rounding a hash to a nearby lattice point with the
good basis. The difference between hash and signature then lies inside the
parallelepiped spanned by the secret basis, uniformly. Nguyen and Oded Regev
showed in 2006 ("Learning a Parallelepiped") that a few hundred such
differences reveal the parallelepiped, and so the secret basis, by a simple
moment computation: they recovered NTRUSign keys from about 400 signatures.
The repair, sampling signatures from a discrete Gaussian that leaks nothing
about the basis (Gentry, Peikert and Vaikuntanathan, 2008), is what the
signature scheme Falcon uses today.

**NTRU's early parameters (1996 to 2003).** Jeffrey Hoffstein, Jill Pipher
and Joseph Silverman presented NTRU at the CRYPTO '96 rump session and
published it in 1998. It works in the ring $\mathbb{Z}[x]/(x^N - 1)$: the
private key is a pair of polynomials $f, g$ with tiny coefficients, the public
key is $h = g/f$ modulo $q$, and encryption and decryption are polynomial
multiplications, far faster than RSA. Don Coppersmith and Adi Shamir pointed
out in 1997 that $(f, g)$ is an unusually short vector in a lattice of
dimension $2N$ built from $h$ and $q$, so key recovery is an SVP problem.
That is not a break; it is the reason NTRU is a lattice scheme. What
mattered was the size. The first parameter sets used $N = 107$ (labeled for
moderate security), 167, 263 and 503. Alexander May recovered $N = 107$
keys with lattice reduction in 1999, using a smaller sublattice that still
contained the key, and the recommended sets were raised.

The more instructive attacks went after decryption itself. NTRU decryption
can fail, rarely, when an intermediate polynomial's coefficients wrap around
modulo $q$, and whether it fails depends on the private key. Éliane Jaulmes
and Antoine Joux showed in 2000 that chosen ciphertexts recover the key. Then
in 2003 Nick Howgrave-Graham, Phong Nguyen, David Pointcheval, John Proos,
Joseph Silverman, Ari Singer and William Whyte showed that even *valid*
ciphertexts are enough: with the parameters then in use, failures happened
often enough to be observed, each one is correlated with the private key,
and an attacker who learns which honestly encrypted messages failed can
reconstruct it. The repair was to make failures astronomically rare and to
add a padding that makes modified ciphertexts useless. Both lessons carried straight into ML-KEM,
whose stated failure probabilities are about $2^{-139}$, $2^{-164}$ and
$2^{-174}$ for its three sizes, and whose Fujisaki-Okamoto transform rejects
modified ciphertexts. NTRU itself, with modern parameters, was never broken:
it reached the third round of the NIST competition as a finalist in 2020 and
was not chosen mainly because Kyber, now ML-KEM, did the same job.

!!! note "Life story: GGH"
    **Born:** 1997, Oded Goldreich, Shafi Goldwasser and Shai Halevi, CRYPTO
    '97, with challenges in dimensions 200 to 400 · **Purpose:** public-key
    encryption and signatures from the closest vector problem, with a good
    basis as the private key and a bad basis of the same lattice as the
    public key · **Helped:** made the good-basis trapdoor concrete; its
    failures led to Micciancio's normal-form keys and to Gaussian sampling
    (GPV, 2008), the basis of Falcon · **Status:** encryption broken in
    practice by Nguyen in 1999 (the $\pm 3$ errors leaked the message modulo
    6); signatures, and NTRUSign, broken by Nguyen and Regev in 2006

!!! note "Life story: NTRU's early parameters"
    **Born:** 1996, Jeffrey Hoffstein, Jill Pipher and Joseph Silverman,
    CRYPTO '96 rump session, published at ANTS-III in 1998, with parameter
    sets from $N = 107$ to $N = 503$ · **Purpose:** fast public-key
    encryption from short polynomials in a ring · **Helped:** the first
    practical lattice cryptosystem, and the attacks on it (Coppersmith and
    Shamir 1997, May 1999, Jaulmes and Joux 2000, the decryption-failure
    attack of 2003, Howgrave-Graham's hybrid attack 2007) taught the field
    how to size lattices and why decryption must essentially never fail ·
    **Status:** the scheme survived with larger parameters and became a NIST
    round 3 finalist; the early sets and the NTRUSign signatures did
    not

## 15.10 How estimators set post-quantum parameters

*Level: expert.*

The second generation of lattice schemes rests on **learning with errors**
(LWE), introduced by Oded Regev in 2005. A secret vector
$\mathbf{s} \in \mathbb{Z}_q^n$ with small entries; a public random
$m \times n$ matrix $A$ modulo $q$; and the public vector

$$
\mathbf{b} = A\mathbf{s} + \mathbf{e} \pmod q,
$$

with an error $\mathbf{e}$ of small entries of standard deviation $\sigma$.
Recover $\mathbf{s}$. ML-KEM (FIPS 203) uses the module version: $\mathbf{s}$
is $k$ polynomials of degree 256 with $q = 3329$, which as plain LWE means
$n = 256k$, with $k = 2, 3, 4$ for ML-KEM-512, 768 and 1024. Secrets and
errors come from a centered binomial distribution with parameter $\eta$:
$\eta = 3$ (standard deviation $\sqrt{3/2}$) for ML-KEM-512's secret, and
$\eta = 2$ (standard deviation 1) for the others.
[Chapter 21 of the cryptography book](../../book/21-Lattice-Cryptography.md)
builds these schemes. Here we attack them, on paper, to see how big they must
be.

Nobody can run these attacks. The point of the exercise is to compute,
for each attack, the smallest BKZ block size that would succeed, and turn
that into a cost. The designers then pick the smallest parameters whose cost
clears the target. That calculation is what an **estimator** does.

**The primal attack.** It is the embedding of §15.2 again. The vector
$(\mathbf{e}, \mathbf{s}, 1)$ lies in a lattice of dimension $d = m + n + 1$
built from $A$, $\mathbf{b}$ and $q$, whose volume is $q^m$ (the attacker
chooses $m$, how many samples to use, up to what the scheme publishes). Its
length is about $\sigma\sqrt{m + n}$, far below the Gaussian heuristic, so it
is the unique shortest vector, and BKZ will find it once the block size is
large enough. How large? After BKZ-$\beta$ the lengths of the Gram-Schmidt
vectors fall off geometrically (the *geometric series assumption*):

$$
\|\mathbf{b}^*_i\| \approx \delta_\beta^{\,d - 2(i-1)}\, q^{m/d}.
$$

The target's projection onto the last $\beta$ Gram-Schmidt directions has
length about $\sigma\sqrt\beta$. Alkim, Ducas, Pöppelmann and Schwabe, in the
NewHope paper of 2016, argued that the last SVP call of BKZ finds the target
as soon as that projection is shorter than the Gram-Schmidt vector at the
start of the last block:

$$
\sigma\sqrt{\beta} \;\le\; \delta_\beta^{\,2\beta - d}\; q^{m/d}.
$$

Experiments by Albrecht, Göpfert, Virdia and Wunderer (2017) confirmed that
BKZ succeeds close to the block size this predicts. Figure 15.6 shows the
condition as a picture.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="The primal attack condition: the falling line of Gram-Schmidt log-lengths after BKZ, the last beta positions shaded, and a dashed horizontal level for the secret's projected length; the attack succeeds when the line at the start of the last block is above the dashed level" fill="currentColor" font-size="14">
<line x1="70" y1="30" x2="70" y2="250" stroke="currentColor" stroke-width="1.2"/>
<line x1="70" y1="250" x2="610" y2="250" stroke="currentColor" stroke-width="1.2"/>
<text x="20" y="140" transform="rotate(-90 20 140)" text-anchor="middle">log ‖b*ᵢ‖</text>
<text x="74" y="270" text-anchor="middle">1</text>
<text x="606" y="270" text-anchor="middle">d</text>
<text x="340" y="295" text-anchor="middle">index i of the reduced basis</text>
<rect x="430" y="30" width="180" height="220" fill="currentColor" opacity="0.09"/>
<text x="520" y="48" text-anchor="middle">last β positions</text>
<line x1="70" y1="50" x2="610" y2="240" stroke="currentColor" stroke-width="2"/>
<text x="120" y="56">slope set by δ_β</text>
<line x1="70" y1="198" x2="610" y2="198" stroke="currentColor" stroke-width="1.4" stroke-dasharray="6 4"/>
<text x="90" y="222">σ√β: the secret's projection onto the last block</text>
<line x1="430" y1="30" x2="430" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<text x="430" y="270" text-anchor="middle">d − β + 1</text>
<circle cx="430" cy="176.7" r="5"/>
<text x="440" y="168">‖b*_(d−β+1)‖</text>
</svg>
<figcaption>Figure 15.6. The primal attack's success condition. BKZ-β leaves the Gram-Schmidt lengths on a falling line; the attack works when the line, at the start of the last block, is still above the secret's projected length. A bigger β flattens the line and raises that point; the designer picks parameters so that only an enormous β does it.</figcaption>
</figure>

**Core-SVP.** A cost for BKZ-$\beta$ is still needed. The NewHope paper
proposed a deliberately simple one, now called **core-SVP**: the cost of a
single SVP call in dimension $\beta$ by the best sieve, $2^{0.292\beta}$
classically and $2^{0.265\beta}$ with the quantum sieve then known, ignoring
the number of calls, the $o(\beta)$ terms and the cost of memory. It
undercounts on purpose. Its value is that it is easy to compute, stable as
implementations improve, and the same for every scheme, so schemes can be
compared.

**Code it.** Here is the 2016 primal estimate, with the root Hermite factor
formula of §15.3: for each block size from 50 up, try numbers of samples $m$
and stop at the first $\beta$ that satisfies the condition. The parameters
are the plain-LWE views of the three ML-KEM sets, and, for comparison, the
key-recovery problem of the three ML-DSA sets (FIPS 204), with $q = 8{,}380{,}417$.

```python
from math import pi, e, log2, sqrt

def delta(beta):                      # root Hermite factor reached by BKZ-beta
    return ((pi * beta) ** (1 / beta) * beta / (2 * pi * e)) ** (1 / (2 * (beta - 1)))

def primal_beta(n, m_max, q, sigma):
    """Smallest BKZ block size for which the primal attack succeeds (2016 estimate)."""
    for beta in range(50, 2000):
        for m in range(max(1, beta - n), m_max + 1, 8):   # try how many samples to use
            d = n + m + 1
            if beta > d:
                continue
            lhs = log2(sigma * sqrt(beta))
            rhs = (2 * beta - d) * log2(delta(beta)) + m / d * log2(q)
            if lhs <= rhs:
                return beta
    return None

sets = [("ML-KEM-512", 512, 512, 3329, sqrt(3 / 2)),
        ("ML-KEM-768", 768, 768, 3329, 1.0),
        ("ML-KEM-1024", 1024, 1024, 3329, 1.0),
        ("ML-DSA-44", 1024, 1024, 8380417, sqrt(2)),
        ("ML-DSA-65", 1280, 1536, 8380417, sqrt(80 / 12)),
        ("ML-DSA-87", 1792, 2048, 8380417, sqrt(2))]
print(f"{'set':12} {'beta':>5} {'classical 0.292b':>17} {'quantum 0.257b':>15}")
for name, n, m, q, s in sets:
    b = primal_beta(n, m, q, s)
    print(f"{name:12} {b:5} {0.292 * b:17.1f} {0.257 * b:15.1f}")
```

```
set           beta  classical 0.292b  quantum 0.257b
ML-KEM-512     406             118.6           104.3
ML-KEM-768     623             181.9           160.1
ML-KEM-1024    873             254.9           224.4
ML-DSA-44      424             123.8           109.0
ML-DSA-65      624             182.2           160.4
ML-DSA-87      863             252.0           221.8
```

Twenty lines reproduce the published analysis. The block sizes 406, 623 and
873 for ML-KEM are the ones the Kyber team reported for the primal attack in
its third-round documentation, with core-SVP 118, 182 and 254 or so; the
ML-DSA numbers land within a unit or two of the Dilithium team's for key
recovery (forging an ML-DSA signature is a different lattice problem, SIS,
with its own estimate). The program uses the 2021 quantum exponent $0.257$
of §15.3; the original documents used $0.265$, which gives 107 for
ML-KEM-512. These are the odd numbers in the table of §15.3: BKZ-406 needs a
root Hermite factor of 1.0039, and nothing short of a sieve in dimension
about 400 delivers it.

**From core-SVP to "category 1".** NIST defined its security categories by
comparison with breaking AES: category 1 means at least as hard as a key
search on AES-128, which NIST costs at about $2^{143}$ classical gates;
categories 3 and 5 compare with AES-192 and AES-256. ML-KEM-512, 768 and 1024
are claimed for categories 1, 3 and 5. A core-SVP of 118 is far below 143,
and that is not a contradiction. Core-SVP counts one SVP call as
$2^{0.292\beta}$ abstract operations. A real attack makes many calls; each
sieve operation is an inner product of 400-dimensional vectors costing
hundreds or thousands of gates; and the sieve needs about $2^{0.2075\beta}$
vectors of memory, around $2^{84}$ for $\beta = 406$, which is far more than
any machine will hold and must be paid for in access time. The Kyber team's
round-3 analysis estimated the full gate count for Kyber-512 somewhat above
the AES-128 figure, while listing open questions that could move it by more
than ten bits either way. The margin of ML-KEM-512 over category 1 is thin,
and everyone involved said so; that is why the next section matters.

**The dual attack.** The other classical approach looks for a short vector
$\mathbf{w}$ with $\mathbf{w} A \equiv 0 \pmod q$. Then

$$
\langle \mathbf{w}, \mathbf{b} \rangle \equiv \langle \mathbf{w}, \mathbf{e} \rangle \pmod q,
$$

which is small if $\mathbf{w}$ and $\mathbf{e}$ are, while for a random
$\mathbf{b}$ it would be uniform. One short $\mathbf{w}$ gives a test with a
tiny advantage, about $\exp(-2\pi^2 (\sigma\|\mathbf{w}\|/q)^2)$; many
vectors combine into a distinguisher, and guessing part of the secret turns
the distinguisher into key recovery. In the 2016 analyses it cost a few
bits more than the primal attack; its modern versions, which reuse the many
short vectors one sieve produces, are the subject of §15.11.

**The estimator.** In 2015 Martin Albrecht, Rachel Player and Sam Scott
collected every known attack on LWE (primal, dual, combinatorial BKW,
algebraic Arora-Ge, and hybrids) into one program, the **LWE estimator**.
Its successor, the lattice estimator, is the common yardstick: NIST
submissions quoted it, and the homomorphic encryption community's 2018
security standard took its parameter tables from it. Its numbers are
estimates in cost models, not running times; the models disagree by a few
bits, and the estimator lets you switch between them.
For the post-quantum side of the same question, how these margins compare
with those of hash-based and code-based schemes and how NIST weighed them,
see [the Post-quantum cryptography book](../post-quantum/index.md).

!!! note "Life story: the LWE estimator"
    **Born:** 2015, Martin Albrecht, Rachel Player and Sam Scott, "On the
    concrete hardness of Learning with Errors" (*Journal of Mathematical
    Cryptology*), with open-source Sage code; succeeded by the lattice
    estimator, maintained by Albrecht and others · **Purpose:** to compute,
    for any LWE parameters, the cost of every known attack under a choice of
    cost models, so that designers and attackers argue from the same numbers
    · **Helped:** sized or checked the parameters of the NIST lattice
    submissions, Kyber and Dilithium among them, and of homomorphic
    encryption libraries · **Status:** in active use and updated as attacks
    and models change (the dual attacks of 2021 and 2022 were added, then
    argued over); its outputs are estimates, and its documentation says so

## 15.11 The dual attack controversy

*Level: expert.*

In April 2022 MATZOV, a cryptography unit of the Israel Defense Forces,
published a report titled "Report on the Security of LWE: Improved Dual
Lattice Attack". It combined the sieve-based dual attack of Qian Guo and
Thomas Johansson (2021) with modulus switching and a fast Fourier transform
over guessed parts of the secret, and it lowered the estimated cost of
attacking Kyber, Saber and Dilithium by several bits. For Kyber-512 its
estimate came out slightly under the $2^{143}$ gates of category 1, in its own
cost model, which is a few bits below where the earlier estimates had placed
it. Coming in the middle of NIST's final choice, this was news. NIST's
answer, on its public forum, was that the margin was within the uncertainty
of the models, that the memory such an attack needs was not being charged
for, and that it still considered Kyber-512 to meet category 1. The lattice
estimator added the MATZOV attack, and for a year it was part of the
accepted picture.

Then Léo Ducas and Ludo Pulles asked a plain question in the title of their
CRYPTO 2023 paper: "Does the dual-sieve attack on learning with errors even
work?" The dual attack, in its modern form, scores every guess of part of the
secret by summing over many short dual vectors, and keeps the guess with the
best score. The analysis assumed that the scores of the wrong guesses behave
like independent random variables. Ducas and Pulles showed, with experiments
and a supporting argument, that they do not: when the dual vectors all come
from the same sieve, the wrong guesses' scores are correlated, and in the
regime the improved attacks relied on, the analysis predicted success in
cases where, by a counting argument, even a random target with no secret
behind it would score as well as the true one. The predicted distinguisher
could not be telling the real secret from noise. The claimed costs were
therefore not supported by the analysis behind them.

That did not prove the attack fails, and nobody claimed it did. It showed
that the heuristic had been used outside the range where it holds. Several
groups responded in 2023 and 2024: some gave dual attacks with analyses that
avoid the faulty assumption, a few with proofs; others refined how scores
should be predicted. Where it stands, as best it can be summarized: the
modern dual attack is a real attack whose exact cost at ML-KEM sizes is still
being argued over; the estimates under discussion move ML-KEM by a few bits,
not by tens; and the primal estimate, which nobody disputes, still sets
ML-KEM-512 near the line it was designed for. A related argument, raised in
public in 2022 and 2023, was over how NIST had combined the various cost
estimates for Kyber-512; it was about accounting, not a new attack, and NIST
kept the parameter set in FIPS 203.

The lesson is about lattice parameters in general. They are set by
estimates, the estimates rest on heuristics, and a wrong heuristic can move a
number in either direction. The defense is margin, which is why the Kyber
team recommended ML-KEM-768 as the default and most deployments use it: a
few bits lost there leave it far beyond any computation anyone can run.

!!! note "Life story: the MATZOV dual attack"
    **Born:** April 2022, MATZOV (Israel Defense Forces), building on Guo and
    Johansson's dual attack of 2021 · **Purpose:** to distinguish LWE
    samples, and then recover the secret, using many short dual vectors from
    one sieve and a fast Fourier transform over secret guesses · **Helped:**
    lowered the published estimates for Kyber, Saber and Dilithium by a few
    bits, and forced a closer look at the heuristics every estimator used ·
    **Status:** its analysis was questioned by Ducas and Pulles (CRYPTO 2023),
    who showed its independence assumption fails in the regime it used;
    later work repaired parts of the analysis, and the true cost at ML-KEM
    sizes is still debated

## 15.12 Going deeper

*Level: expert.*

**Better reduction.** Real attacks run BKZ 2.0 (Chen and Nguyen, 2011), with
extreme pruning and early aborts, or progressive BKZ, which raises the
block size step by step. The open-source fplll library and the G6K sieving
kernel (Albrecht, Ducas, Herold, Kirshanova, Postlethwaite and Stevens, 2019)
are the tools everyone uses; the GPU version of G6K solved the Darmstadt SVP
challenge in dimension 180 in 2021. Simulators predict BKZ's output profile
without running it, and they, not the simple geometric series assumption,
sit inside the more careful estimates.

**Hybrid attacks.** Howgrave-Graham's 2007 attack on NTRU combines
meet-in-the-middle guessing on part of the secret with lattice reduction on
the rest, and it is the strongest attack when secrets are sparse or have
entries in $\{-1, 0, 1\}$, as in many homomorphic encryption schemes. The
estimator includes it; designs with small secrets must check it.

**Side information.** Dana Dachman-Soled, Léo Ducas, Huijing Gong and Mélissa
Rossi (2020) showed how to fold partial knowledge of an LWE secret, such as
a few coefficients leaked by a side channel or a decryption failure, into the
lattice as "hints", and estimate the remaining cost. It is the lattice
counterpart of the hidden number problem, and it is how side-channel attacks
on ML-KEM implementations are now measured.

**More Coppersmith, more HNP.** Multivariate versions of Coppersmith's method
(Jochemsz and May, 2006) drive the strongest partial-key-exposure attacks on
RSA, at the price of heuristic assumptions. For the hidden number problem,
Albrecht and Heninger (EUROCRYPT 2021) used sieving with a predicate to
solve instances with less leakage than the lattice was thought to need.

**Quantum.** No quantum algorithm is known that solves the lattice problems
behind ML-KEM much faster than classical sieving: the best quantum sieves
improve the exponent from 0.292 to about 0.257. In April 2024 Yilei Chen
posted a claimed polynomial-time quantum algorithm for LWE with certain
parameters; within about ten days Hongxun Wu and Thomas Vidick found a bug,
and Chen withdrew the claim. The episode was a reminder that the assumption
is young compared with factoring, and that it is watched.

## Check yourself

??? question "1. A knapsack has 60 items of 80 bits each. Is it within reach of the lattice attacks of §15.6?"

    Its density is $60/80 = 0.75$. That is above the 0.6463 bound of
    Lagarias and Odlyzko's original lattice but below the 0.9408 bound of
    the improved (CJLOSS) lattice, so the improved lattice solves it given
    an SVP oracle. In dimension 61, LLL or a modest BKZ is a good enough
    oracle in practice.

??? question "2. Shamir's attack does not recover the owner's multiplier and modulus. Why is that enough?"

    Any pair $(U', M')$ that turns the public list into a superincreasing
    list whose sum is below $M'$ decrypts every ciphertext, because
    $cU' \bmod M' = \sum m_i w'_i$ and the greedy pass then reads the bits.
    The attacker needs a working trapdoor, not the original one; §15.5
    found the fake pair $(361, 1450)$ for the toy key.

??? question "3. State Howgrave-Graham's lemma, and say which step of its proof uses Cauchy-Schwarz."

    If $h$ has integer coefficients and at most $\omega$ terms,
    $h(x_0) \equiv 0 \pmod M$, $|x_0| < X$ and $\|h(xX)\| < M/\sqrt\omega$,
    then $h(x_0) = 0$. Cauchy-Schwarz bounds $\sum |h_i| X^i$ by
    $\sqrt\omega$ times the Euclidean length of the vector
    $(h_i X^i)$; the rest is the triangle inequality and the remark that
    the only multiple of $M$ smaller than $M$ in size is 0.

??? question "4. In the example of §15.7, why did the three-row lattice fail for X = 33 when the five-row one worked?"

    The three-row lattice has determinant $N^2X^3$, so its shortest
    vectors are around $6{,}600$ by the Gaussian heuristic, while the lemma
    needs a vector shorter than $N/\sqrt3 \approx 6{,}000$ (modulus
    $M = N$). Its bound is $X < N^{1/3} \approx 21.8$. With $m = 2$ the
    modulus is $N^2$, the bound rises to $N^{0.4} \approx 40$, and LLL finds
    a vector below $N^2/\sqrt5$.

??? question "5. For a monic cubic and m = 2, how large can X be, ignoring constants?"

    $X < N^{(\delta(m-1)+2)/(\delta(\delta m+1))}$ with $\delta = 3$,
    $m = 2$ gives $N^{5/21} \approx N^{0.238}$. The lattice has dimension
    $\delta m + 1 = 7$. With $m = 1$ it would be $N^{1/6}$, and the limit as
    $m$ grows is $N^{1/3}$.

??? question "6. Rewrite a DSA signature with a short nonce as a hidden number problem sample."

    From $s \equiv k^{-1}(H + xr) \pmod q$, $k \equiv s^{-1}r\,x + s^{-1}H$.
    Put $t = s^{-1} r \bmod q$ and $u = s^{-1}H \bmod q$. Then
    $x t \equiv -u + k \pmod q$: the private key $x$ is the hidden number,
    $-u$ is the approximation of $xt$, and the nonce $k$ is the error,
    small if the nonce is short.

??? question "7. A 256-bit ECDSA signer leaks the top 4 bits of each nonce (they are zero). About how many signatures does the lattice need, at least?"

    The count of §15.8 says the signatures must carry more bits than the
    key: $4n > 256$, so more than 64 signatures, and in practice somewhat
    more to leave room for the lattice's overhead, with BKZ rather than
    LLL in that dimension. Chapter 14 sizes real attacks; the point here is
    that the information count sets the floor.

??? question "8. Why did GGH's choice of errors, every entry ±3, break it?"

    Adding 3 to every entry makes each error 0 or 6, so
    $\mathbf{c} + 3\cdot(1,\dots,1) \equiv \mathbf{m}B \pmod 6$, and linear
    algebra modulo 2 and 3 gives $\mathbf{m} \bmod 6$. Subtracting
    $\mathbf{m}_6 B$ and dividing by 6 leaves a closest-vector problem in
    the same lattice with errors of $\pm 1/2$, six times smaller, which
    lattice reduction solves in the challenge dimensions.

??? question "9. In the primal condition, what happens to the block size if q grows and n, m and σ stay the same? Why does ML-KEM use q = 3329?"

    The right side contains $q^{m/d}$, so a larger $q$ raises the
    Gram-Schmidt line of Figure 15.6 relative to the fixed error, and a
    smaller $\beta$ suffices: the attack gets easier. Designers keep $q$ as
    small as correct decryption allows, with error and secret as large as
    it allows; 3329 is a prime just big enough for the ring arithmetic and
    for failure probabilities near $2^{-139}$ and below.

??? question "10. ML-KEM-512 has a core-SVP of about 118, and AES-128 key search costs about 2^143 gates. Why is ML-KEM-512 still claimed for category 1?"

    Core-SVP counts one SVP call in dimension $\beta$ as $2^{0.292\beta}$
    abstract operations. A real attack makes many calls, each operation
    costs many gates, and the sieve needs about $2^{84}$ vectors of memory
    at $\beta = 406$, whose access cost core-SVP ignores. The full estimates
    land near or somewhat above $2^{143}$, with uncertainty of several
    bits, which is why the margin is called thin and ML-KEM-768 is the
    usual recommendation.

## What you learned

- A lattice attack writes the secret as a short vector in a lattice built
  from public data, checks with the Gaussian heuristic that it is unusually
  short, reduces, and verifies what it reads off.
- LLL is polynomial and in practice reaches a root Hermite factor near
  1.02; BKZ-$\beta$ reaches $\delta_\beta$ at a cost dominated by sieving in
  dimension $\beta$, about $2^{0.292\beta}$.
- Merkle-Hellman fell to Shamir's search for a working trapdoor (1982) and,
  with every low-density knapsack, to the Lagarias-Odlyzko and CJLOSS
  lattices.
- Coppersmith's method finds roots below about $N^{1/\delta}$ of a monic
  polynomial modulo $N$ by building a triangular lattice of polynomials that
  share the root modulo $N^m$; Howgrave-Graham's lemma turns a short vector
  into a root over the integers.
- The hidden number problem recovers a secret from approximations of its
  multiples, and every partial-nonce attack on DSA, ECDSA and Schnorr is an
  instance of it; the samples must carry more bits than the secret.
- The first lattice cryptosystems (Ajtai-Dwork, GGH, early NTRU, NTRUSign)
  fell to reduction, leaked residues, decryption failures and statistical
  leaks; their lessons are built into ML-KEM and Falcon.
- Post-quantum parameters are set by running the attacks forward: the 2016
  primal estimate gives block sizes 406, 623 and 873 for ML-KEM, core-SVP
  118.6, 181.9 and 254.9, and the dual attack argument of 2022 to 2023 shows
  how much those numbers depend on heuristics.

## Further reading

- Arjen Lenstra, Hendrik Lenstra and László Lovász, "Factoring Polynomials
  with Rational Coefficients" (*Mathematische Annalen*, 1982).
- Adi Shamir, "A Polynomial-Time Algorithm for Breaking the Basic
  Merkle-Hellman Cryptosystem" (CRYPTO '82; *IEEE Transactions on
  Information Theory*, 1984).
- Jeffrey Lagarias and Andrew Odlyzko, "Solving Low-Density Subset Sum
  Problems" (*Journal of the ACM*, 1985); Matthijs Coster, Antoine Joux,
  Brian LaMacchia, Andrew Odlyzko, Claus Schnorr and Jacques Stern,
  "Improved Low-Density Subset Sum Algorithms" (*Computational Complexity*,
  1992).
- Andrew Odlyzko, "The Rise and Fall of Knapsack Cryptosystems" (in
  *Cryptology and Computational Number Theory*, AMS, 1990).
- Don Coppersmith, "Small Solutions to Polynomial Equations, and Low Exponent
  RSA Vulnerabilities" (*Journal of Cryptology*, 1997); Nick Howgrave-Graham,
  "Finding Small Roots of Univariate Modular Equations Revisited" (IMA
  Cryptography and Coding, 1997); Alexander May, "Using LLL-Reduction for
  Solving RSA and Factorization Problems" (in *The LLL Algorithm*, Springer,
  2010).
- Dan Boneh and Ramarathnam Venkatesan, "Hardness of Computing the Most
  Significant Bits of Secret Keys in Diffie-Hellman and Related Schemes"
  (CRYPTO '96); Nick Howgrave-Graham and Nigel Smart, "Lattice Attacks on
  Digital Signature Schemes" (*Designs, Codes and Cryptography*, 2001); Phong
  Nguyen and Igor Shparlinski, "The Insecurity of the Digital Signature
  Algorithm with Partially Known Nonces" (*Journal of Cryptology*, 2002);
  Martin Albrecht and Nadia Heninger, "On Bounded Distance Decoding with
  Predicate" (EUROCRYPT 2021).
- Miklós Ajtai, "Generating Hard Instances of Lattice Problems" (STOC 1996);
  Miklós Ajtai and Cynthia Dwork, "A Public-Key Cryptosystem with
  Worst-Case/Average-Case Equivalence" (STOC 1997); Phong Nguyen and Jacques
  Stern, "Cryptanalysis of the Ajtai-Dwork Cryptosystem" (CRYPTO '98).
- Oded Goldreich, Shafi Goldwasser and Shai Halevi, "Public-Key
  Cryptosystems from Lattice Reduction Problems" (CRYPTO '97); Phong Nguyen,
  "Cryptanalysis of the Goldreich-Goldwasser-Halevi Cryptosystem from
  Crypto '97" (CRYPTO '99); Phong Nguyen and Oded Regev, "Learning a
  Parallelepiped" (EUROCRYPT 2006).
- Jeffrey Hoffstein, Jill Pipher and Joseph Silverman, "NTRU: A Ring-Based
  Public Key Cryptosystem" (ANTS-III, 1998); Don Coppersmith and Adi Shamir,
  "Lattice Attacks on NTRU" (EUROCRYPT '97); Nick Howgrave-Graham and
  others, "The Impact of Decryption Failures on the Security of NTRU
  Encryption" (CRYPTO 2003); Nick Howgrave-Graham, "A Hybrid
  Lattice-Reduction and Meet-in-the-Middle Attack Against NTRU" (CRYPTO
  2007).
- Erdem Alkim, Léo Ducas, Thomas Pöppelmann and Peter Schwabe, "Post-Quantum
  Key Exchange: A New Hope" (USENIX Security 2016), the source of core-SVP
  and the 2016 primal estimate; Martin Albrecht, Florian Göpfert, Fernando
  Virdia and Thomas Wunderer, "Revisiting the Expected Cost of Solving
  uSVP and Applications to LWE" (ASIACRYPT 2017).
- Martin Albrecht, Rachel Player and Sam Scott, "On the Concrete Hardness of
  Learning with Errors" (*Journal of Mathematical Cryptology*, 2015), and the
  lattice estimator's documentation.
- The CRYSTALS-Kyber and CRYSTALS-Dilithium round-3 specifications (2020 and
  2021), with their security analyses; FIPS 203 and FIPS 204 (2024);
  NIST IR 8413 (2022), the third-round report.
- MATZOV, "Report on the Security of LWE: Improved Dual Lattice Attack"
  (2022); Léo Ducas and Ludo Pulles, "Does the Dual-Sieve Attack on Learning
  with Errors Even Work?" (CRYPTO 2023).
- Martin Albrecht, Léo Ducas, Gottfried Herold, Elena Kirshanova, Eamonn
  Postlethwaite and Marc Stevens, "The General Sieve Kernel and New Records
  in Lattice Reduction" (EUROCRYPT 2019); Dana Dachman-Soled, Léo Ducas,
  Huijing Gong and Mélissa Rossi, "LWE with Side Information" (CRYPTO 2020).
