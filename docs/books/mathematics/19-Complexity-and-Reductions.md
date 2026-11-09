# 19. Complexity, Reductions and Hard Problems

*Cryptography rests on problems that are believed hard: factoring, discrete
logarithms, learning with errors. Nobody has proved any of them hard, and proving
it would settle the most famous open question in computer science. What
cryptographers can do is measure cost precisely, relate problems by reductions, and
build everything from as few assumptions as possible. This chapter covers running time,
P and NP with one NP-completeness reduction worked by hand, why cryptography needs
average-case hardness, one-way functions, hard-core bits, random self-reducibility and
the map of assumptions. Its center is the security reduction: ElGamal proved from DDH
game by game, Schnorr signatures proved with the forking lemma and its costly square
root, the random-oracle model and its limits, and "128-bit security" priced in gates,
joules and memory. Along the way we turn 3-SAT into subset sum, factor an RSA modulus
from its private exponent, decrypt RSA through a one-bit leak, break DDH where it is
false, pull a key out of a rewound forger, and invert a hash with a rainbow table.*

!!! abstract "In this chapter"
    **You will learn:**

    - running time measured in bits, and polynomial, subexponential and exponential
      cost, with the numbers behind key sizes;
    - P, NP and NP-completeness, with 3-SAT reduced to subset sum;
    - why cryptography needs average-case hardness, and Ajtai's worst-case bridge;
    - one-way functions and the primitives equivalent to them, and Impagliazzo's
      five worlds;
    - hard-core bits, and a working attack that decrypts RSA from a parity leak;
    - reductions read carefully: advantage, running time, tightness and bit
      security, with the reduction from the RSA private key to factoring;
    - a complete game-by-game proof that ElGamal is IND-CPA secure if DDH holds;
    - random self-reducibility of the discrete logarithm, demonstrated;
    - the map of assumptions, from factoring to LWE and syndrome decoding, and a
      group in which DDH fails;
    - the forking lemma for Schnorr signatures, proved and simulated, and its cost;
    - the random-oracle model and the Canetti-Goldreich-Halevi separation;
    - concrete security in gates, time, energy and memory, time-memory trade-offs,
      and the debate over defining bit security.

    **You need:** [Chapter 16](16-Probability.md) (advantage, negligible functions,
    hybrid arguments), [Chapter 4](04-Powers-and-Primitive-Roots.md) (discrete
    logarithms), [Chapter 7](07-Groups.md) (groups, DDH, the generic group model),
    [Chapter 2](02-Divisibility-Primes-and-Factoring.md) (RSA's arithmetic) and, for
    §19.4, [Chapter 14](14-Lattices.md) (lattices and the knapsack).

    **Levels:** §19.1 to §19.3 are for beginners, §19.4 to §19.6 are intermediate,
    §19.7 to §19.12 are expert.

## 19.1 The problem

*Level: beginner.*

Is RSA as hard as factoring? After almost fifty years, nobody knows. Breaking RSA
would follow from factoring, but an attacker might be able to take $e$-th roots
modulo $N$ without factoring $N$; no such method is known, and none has been ruled
out. The same uncertainty runs through the whole field. The security of every
public-key system in use depends on a conjecture, and the most we can prove is
relative: *if* this problem is hard, *then* this scheme is secure.

To say that precisely we need a way to measure cost, a vocabulary of problems, and a
discipline for comparing them. That is complexity theory, as cryptographers use it.

## 19.2 Running time

*Level: beginner.*

The cost of an algorithm is counted in basic operations as a function of the
**input size in bits**, not of the numbers themselves. Trial division of $N$ takes up
to $\sqrt{N} = 2^{n/2}$ steps for an $n$-bit $N$: exponential in the size, though it
sounds modest as "square root of $N$".

Three growth rates matter:

- **Polynomial**, $n^c$: multiplication ($n^2$ or less), modular exponentiation
  ($n^3$), primality testing (Chapter 6). Feasible for honest users.
- **Exponential**, $2^{cn}$: exhaustive key search, Pollard's rho on a curve
  ($2^{n/2}$), lattice sieving ($2^{0.292n}$). Infeasible for large $n$.
- **Subexponential**, written with the **L-notation**
  $$L_N[\alpha, c] = \exp\bigl((c + o(1))(\ln N)^{\alpha}(\ln \ln N)^{1 - \alpha}\bigr),$$
  between polynomial ($\alpha = 0$) and exponential ($\alpha = 1$). The number field
  sieve factors $N$ in $L_N[1/3, 1.923]$ (*Cryptanalysis*
  [chapter 11](../cryptanalysis/11-Factoring.md)).

```python
# Polynomial, subexponential and exponential growth: the cost exponents behind key sizes.
from math import log, log2, exp
for bits in (64, 128, 256, 512, 1024, 2048, 3072):
    lnN = bits * log(2)
    nfs = (64 / 9) ** (1 / 3) * lnN ** (1 / 3) * log(lnN) ** (2 / 3)      # L_N[1/3, 1.923]
    print(bits, round(3 * log2(bits), 1), round(nfs / log(2), 1), bits // 2, bits)
```

```text
64 18.0 23.9 32 64
128 21.0 33.7 64 128
256 24.0 46.7 128 256
512 27.0 63.9 256 512
1024 30.0 86.8 512 1024
2048 33.0 116.9 1024 2048
3072 34.8 138.7 1536 3072
```

The columns are the size $n$ in bits, $\log_2$ of $n^3$ (a polynomial cost), $\log_2$
of the number field sieve's $L_N[1/3, 1.923]$ without its $o(1)$, $n/2$ (generic
attacks on an $n$-bit group) and $n$ (exhaustive search). For RSA-2048 the formula
gives about $2^{117}$, which is why NIST rates it at 112 bits of security, and
RSA-3072 about $2^{139}$, rated 128; the published ratings fold in the $o(1)$ and
practical constants. Subexponential is the reason RSA keys are ten times longer than
elliptic-curve keys of the same strength.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Log of cost against key size for three growth rates: polynomial n cubed stays near the bottom, the number field sieve curve rises like the cube root, and exhaustive search rises linearly" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="70" y1="220" x2="600" y2="220"/><line x1="70" y1="220" x2="70" y2="20"/></g>
<path fill="none" stroke="currentColor" stroke-width="2" d="M72.6 208.6 L85.5 201.3 L98.5 198.8 L111.4 197.2 L124.3 196.1 L137.3 195.2 L150.2 194.5 L163.1 193.9 L176.1 193.4 L189.0 192.9 L201.9 192.5 L214.9 192.1 L227.8 191.7 L240.8 191.4 L253.7 191.1 L266.6 190.8 L279.6 190.6 L292.5 190.3 L305.4 190.1 L318.4 189.9 L331.3 189.6 L344.2 189.4 L357.2 189.3 L370.1 189.1 L383.0 188.9 L396.0 188.7 L408.9 188.6 L421.8 188.4 L434.8 188.3 L447.7 188.1 L460.6 188.0 L473.6 187.9 L486.5 187.7 L499.5 187.6 L512.4 187.5 L525.3 187.4 L538.3 187.2 L551.2 187.1 L564.1 187.0 L577.1 186.9 L590.0 186.8"/>
<path fill="none" stroke="currentColor" stroke-width="2" class="acc" d="M80.4 197.3 L93.1 186.3 L105.9 178.6 L118.6 172.4 L131.4 167.0 L144.1 162.3 L156.8 158.1 L169.6 154.2 L182.3 150.6 L195.1 147.2 L207.8 144.1 L220.5 141.1 L233.3 138.2 L246.0 135.5 L258.8 132.9 L271.5 130.4 L284.2 128.0 L297.0 125.7 L309.7 123.5 L322.5 121.3 L335.2 119.2 L347.9 117.2 L360.7 115.2 L373.4 113.2 L386.2 111.4 L398.9 109.5 L411.6 107.7 L424.4 106.0 L437.1 104.2 L449.9 102.5 L462.6 100.9 L475.3 99.3 L488.1 97.7 L500.8 96.1 L513.6 94.6 L526.3 93.1 L539.0 91.6 L551.8 90.2 L564.5 88.7 L577.3 87.3 L590.0 85.9"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" d="M70.2 219.5 L83.2 181.5 L96.2 143.5 L109.2 105.6 L122.1 67.6 L133.5 34.3"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 4" d="M70.2 219.1 L71.8 209.6 L73.4 200.1 L75.0 190.6 L76.7 181.1 L78.3 171.6 L79.9 162.1 L81.5 152.6 L83.2 143.1 L84.8 133.6 L86.4 124.1 L88.0 114.6 L89.7 105.1 L91.3 95.6 L92.9 86.1 L94.5 76.6 L96.2 67.1 L97.8 57.6 L99.4 48.1 L101.0 38.6"/>
<circle cx="569.2" cy="98.4" r="5" class="acc-fill"/>
<circle cx="111.6" cy="98.4" r="5" class="acc-fill"/>
<line x1="70" y1="98.4" x2="600" y2="98.4" stroke="currentColor" stroke-width="1" stroke-dasharray="2 5" opacity=".5"/>
<text x="121.6" y="90.4" font-size="12">256-bit curve</text>
<text x="561.2" y="88.4" font-size="12" text-anchor="end">RSA-3072</text>
<text x="313.8" y="140.8" font-size="12" class="acc">number field sieve</text>
<text x="427.5" y="180.4" font-size="12">n³ (honest use)</text>
<text x="72.5" y="30" font-size="12">2ⁿ</text>
<text x="141.0" y="30" font-size="12">2^(n/2)</text>
<text x="70.0" y="238" text-anchor="middle" font-size="12">0</text>
<text x="236.4" y="238" text-anchor="middle" font-size="12">1024</text>
<text x="402.8" y="238" text-anchor="middle" font-size="12">2048</text>
<text x="569.2" y="238" text-anchor="middle" font-size="12">3072</text>
<text x="62" y="224.0" text-anchor="end" font-size="12">2⁰</text>
<text x="62" y="163.2" text-anchor="end" font-size="12">2⁶⁴</text>
<text x="62" y="102.4" text-anchor="end" font-size="12">2¹²⁸</text>
<text x="62" y="41.6" text-anchor="end" font-size="12">2¹⁹²</text>
<text x="335" y="256" text-anchor="middle" font-size="12">input size n in bits</text>
</svg>
<figcaption>Figure 19.1. Three kinds of cost, as log₂ of the work against the input size in bits. Honest operations are polynomial (bottom); generic attacks are exponential (straight lines); the number field sieve is subexponential, which is why RSA needs 3,072 bits where a curve needs 256 for the same 128-bit level (dots).</figcaption>
</figure>

## 19.3 P, NP and NP-completeness

*Level: beginner.*

A **decision problem** asks a yes-or-no question about an input. **P** is the class of
problems decidable in polynomial time. **NP** is the class whose "yes" answers have a
**certificate** checkable in polynomial time: "is $N$ composite?" (certificate: a
factor), "is this Boolean formula satisfiable?" (certificate: an assignment), "does
this code have a codeword of weight at most $w$ with syndrome $s$?" (certificate: the
word).

A problem is **NP-complete** if it is in NP and every NP problem reduces to it in
polynomial time. Stephen Cook (1971) and Leonid Levin (1973) proved that
satisfiability is NP-complete; Richard Karp (1972) added 21 more, including subset
sum; thousands followed, among them syndrome decoding (1978) and, under randomized
reductions, the shortest vector problem (1998). An efficient algorithm for any
NP-complete problem would give one for all of NP.

Whether P = NP is open, and one of the Clay Mathematics Institute's seven Millennium
Prize Problems (2000). If P = NP, then every cipher could be broken efficiently:
"is there a key, starting with these bits, that decrypts this ciphertext to
something with a valid checksum?" is an NP question, and answering it bit by bit
recovers the key. So P ≠ NP is *necessary* for cryptography. It is far from
*sufficient*.

### What a reduction between problems is

A **Karp reduction** (a polynomial-time many-one reduction) from problem $A$ to
problem $B$ is an efficient map $\rho$ from instances of $A$ to instances of $B$
that sends "yes" to "yes" and "no" to "no":

$$
x \in A \iff \rho(x) \in B .
$$

It is written $A \le_p B$, and it says that $B$ is *at least as hard as* $A$: an
algorithm for $B$, run on $\rho(x)$, decides $A$. The direction is the classic place
to slip. To show that $B$ is hard, reduce a known hard problem *to* $B$; reducing $B$
to something hard proves nothing, since every NP problem, the easy ones included,
reduces to satisfiability. Security proofs (§19.7) follow the same rule, and they use
the more generous **Cook reduction**, which may call the $B$-algorithm many times,
usually with randomness.

NP-completeness spreads along chains of Karp reductions: Cook and Levin start with
satisfiability, splitting long clauses reduces it to **3-SAT** (three literals per
clause), and Karp's 1972 list carries it to subset sum. The textbook construction
below is small enough to do by hand.

### Worked by hand: 3-SAT to subset sum

Take three variables and three clauses:

$$
\varphi = (x_1 \vee x_2 \vee \neg x_3) \wedge (\neg x_1 \vee x_2 \vee x_3) \wedge
(\neg x_1 \vee \neg x_2 \vee \neg x_3) .
$$

Build decimal numbers with one digit per variable followed by one digit per clause,
here $3 + 3 = 6$ digits.

- For each variable $x_i$, two numbers: $y_i$ ("$x_i$ is true") has a 1 in digit
  $x_i$ and a 1 in the digit of every clause that contains the literal $x_i$; $z_i$
  ("$x_i$ is false") has a 1 in digit $x_i$ and a 1 in the digit of every clause that
  contains $\neg x_i$.
- For each clause $C_j$, two **slack** numbers $g_j$ and $h_j$, each with a single 1
  in digit $C_j$.
- The target is $T = 111\,333$: a 1 under every variable, a 3 under every clause.

For $\varphi$: $x_1$ occurs in $C_1$, so $y_1 = 100\,100$; $\neg x_1$ occurs in
$C_2$ and $C_3$, so $z_1 = 100\,011$; $x_2$ occurs in $C_1$ and $C_2$, so $y_2 =
010\,110$; and so on. Figure 19.2 shows all twelve.

Why a subset summing to $T$ is the same thing as a satisfying assignment:

1. **No carries.** A column holds at most three literal 1s and two slack 1s, so its sum
   is at most 5; digits add independently, and "the sum is $T$" means "each column
   matches $T$".
2. **Variable columns.** Column $x_i$ has two 1s, in $y_i$ and $z_i$, and target 1, so
   a solution takes exactly one of the pair: an assignment.
3. **Clause columns.** The chosen literal numbers contribute one 1 per true literal of
   $C_j$; the slacks add 0, 1 or 2. Reaching 3 is possible exactly when at least one
   literal is true.

Try $x_1 = 1, x_2 = 1, x_3 = 0$, so pick $y_1, y_2, z_3$:

$$
100\,100 + 010\,110 + 001\,101 = 111\,311 .
$$

The clause digits read 3, 1, 1: $C_1$ has three true literals ($x_1$, $x_2$,
$\neg x_3$), $C_2$ has one ($x_2$), $C_3$ has one ($\neg x_3$). Add both slacks of
$C_2$ and both of $C_3$, $000\,020 + 000\,002$, and the total is $111\,333 = T$.

Now try $x_1 = 1, x_2 = 0, x_3 = 0$, picking $y_1, z_2, z_3$:
$100\,100 + 010\,001 + 001\,101 = 111\,202$. The digit of $C_2$ is 0, because $C_2 =
\neg x_1 \vee x_2 \vee x_3$ is false under this assignment, and two slacks can only
raise it to 2. No subset containing these three numbers reaches $T$.

The construction makes $2n + 2k$ numbers of $n + k$ digits for $n$ variables and $k$
clauses, so its size is polynomial: a Karp reduction.

<figure class="mars-fig">
<svg viewBox="0 0 640 372" width="640" role="img" aria-label="The subset-sum instance built from a three-variable, three-clause formula: twelve six-digit numbers, one pair per variable and two slack numbers per clause, the target 111333, and the seven numbers picked by the assignment x1 true, x2 true, x3 false" fill="currentColor" font-size="14">
<g font-weight="600"><text x="80" y="28" text-anchor="middle">number</text><text x="187" y="28">x₁</text><text x="227" y="28">x₂</text><text x="267" y="28">x₃</text><text x="347" y="28">C₁</text><text x="387" y="28">C₂</text><text x="427" y="28">C₃</text><text x="530" y="28" text-anchor="middle">picked for 1, 1, 0</text></g>
<line x1="310" y1="12" x2="310" y2="350" stroke="currentColor" stroke-dasharray="3 3" opacity=".6"/>
<line x1="20" y1="38" x2="620" y2="38" stroke="currentColor" opacity=".6"/>
<rect x="20" y="43" width="600" height="20" rx="3" fill-opacity=".12"/><text x="530" y="58" text-anchor="middle">✓</text>
<text x="50" y="58">y₁</text><text x="80" y="58" font-size="12" fill-opacity=".7">x₁ true</text><text x="190 230 270 350 390 430" y="58">100100</text>
<text x="50" y="80">z₁</text><text x="80" y="80" font-size="12" fill-opacity=".7">x₁ false</text><text x="190 230 270 350 390 430" y="80">100011</text>
<rect x="20" y="87" width="600" height="20" rx="3" fill-opacity=".12"/><text x="530" y="102" text-anchor="middle">✓</text>
<text x="50" y="102">y₂</text><text x="80" y="102" font-size="12" fill-opacity=".7">x₂ true</text><text x="190 230 270 350 390 430" y="102">010110</text>
<text x="50" y="124">z₂</text><text x="80" y="124" font-size="12" fill-opacity=".7">x₂ false</text><text x="190 230 270 350 390 430" y="124">010001</text>
<text x="50" y="146">y₃</text><text x="80" y="146" font-size="12" fill-opacity=".7">x₃ true</text><text x="190 230 270 350 390 430" y="146">001010</text>
<rect x="20" y="153" width="600" height="20" rx="3" fill-opacity=".12"/><text x="530" y="168" text-anchor="middle">✓</text>
<text x="50" y="168">z₃</text><text x="80" y="168" font-size="12" fill-opacity=".7">x₃ false</text><text x="190 230 270 350 390 430" y="168">001101</text>
<text x="50" y="190">g₁</text><text x="80" y="190" font-size="12" fill-opacity=".7">slack C₁</text><text x="190 230 270 350 390 430" y="190">000100</text>
<text x="50" y="212">h₁</text><text x="80" y="212" font-size="12" fill-opacity=".7">slack C₁</text><text x="190 230 270 350 390 430" y="212">000100</text>
<rect x="20" y="219" width="600" height="20" rx="3" fill-opacity=".12"/><text x="530" y="234" text-anchor="middle">✓</text>
<text x="50" y="234">g₂</text><text x="80" y="234" font-size="12" fill-opacity=".7">slack C₂</text><text x="190 230 270 350 390 430" y="234">000010</text>
<rect x="20" y="241" width="600" height="20" rx="3" fill-opacity=".12"/><text x="530" y="256" text-anchor="middle">✓</text>
<text x="50" y="256">h₂</text><text x="80" y="256" font-size="12" fill-opacity=".7">slack C₂</text><text x="190 230 270 350 390 430" y="256">000010</text>
<rect x="20" y="263" width="600" height="20" rx="3" fill-opacity=".12"/><text x="530" y="278" text-anchor="middle">✓</text>
<text x="50" y="278">g₃</text><text x="80" y="278" font-size="12" fill-opacity=".7">slack C₃</text><text x="190 230 270 350 390 430" y="278">000001</text>
<rect x="20" y="285" width="600" height="20" rx="3" fill-opacity=".12"/><text x="530" y="300" text-anchor="middle">✓</text>
<text x="50" y="300">h₃</text><text x="80" y="300" font-size="12" fill-opacity=".7">slack C₃</text><text x="190 230 270 350 390 430" y="300">000001</text>
<line x1="20" y1="310" x2="620" y2="310" stroke="currentColor" stroke-width="1.5"/>
<g font-weight="600"><text x="50" y="330">target T</text><text x="190 230 270 350 390 430" y="330">111333</text></g><text x="530" y="330" text-anchor="middle">sum = 111333</text>
<g font-size="12" fill-opacity=".7" text-anchor="middle"><text x="230" y="352">exactly one of each pair</text><text x="390" y="352">true literals + slack = 3</text></g>
</svg>
<figcaption>Figure 19.2. 3-SAT to subset sum. Each row is one six-digit number; the dashed line separates the variable digits from the clause digits. The shaded rows are the subset chosen by the assignment x₁ = 1, x₂ = 1, x₃ = 0: one number from each variable pair, then slack to bring every clause column up to 3.</figcaption>
</figure>

### Code it: the reduction, and back

The program builds the instance, tries all $2^{12} = 4{,}096$ subsets, reads an
assignment back from each solution, and compares with a direct check of the formula.

```python
# Karp's chain in miniature: a 3-SAT formula becomes a subset-sum instance, and back.
from itertools import product
from math import log2

clauses = [(1, 2, -3), (-1, 2, 3), (-1, -2, -3)]      # i means x_i, -i means NOT x_i
n, k = 3, len(clauses)

def digits_to_int(ds):
    return int("".join(str(d) for d in ds))

numbers = []                                         # (label, value)
for i in range(1, n + 1):
    for sign, name in ((1, "y"), (-1, "z")):         # y_i: x_i true, z_i: x_i false
        ds = [int(j == i) for j in range(1, n + 1)]
        ds += [int(sign * i in c) for c in clauses]
        numbers.append((name + str(i), digits_to_int(ds)))
for j in range(1, k + 1):                            # two slack numbers per clause
    ds = [0] * n + [int(c == j) for c in range(1, k + 1)]
    numbers += [("g" + str(j), digits_to_int(ds)), ("h" + str(j), digits_to_int(ds))]
target = digits_to_int([1] * n + [3] * k)

solutions = []
for pick in product((0, 1), repeat=len(numbers)):    # 2^12 = 4096 subsets
    if sum(p * v for p, (_, v) in zip(pick, numbers)) == target:
        solutions.append({lab for p, (lab, _) in zip(pick, numbers) if p})
assignments = sorted({tuple(int("y%d" % i in s) for i in range(1, n + 1)) for s in solutions})
sat = [a for a in product((0, 1), repeat=n)
       if all(any((a[abs(l) - 1] == 1) == (l > 0) for l in c) for c in clauses)]
print(len(solutions), "subsets;", assignments == sorted(sat), assignments)
print("density", round(len(numbers) / log2(max(v for _, v in numbers)), 3))
```

It prints:

```text
12 subsets; True [(0, 0, 0), (0, 1, 0), (0, 1, 1), (1, 0, 1), (1, 1, 0)]
density 0.722
```

The subset-sum solutions give back exactly the five satisfying assignments. There are
12 subsets because a clause with two true literals takes one slack, $g_j$ or $h_j$:
$(0, 1, 0)$ gives every clause two true literals and accounts for $2^3 = 8$ subsets.

### What the reduction says, and what it does not

Two lessons from this small table run through the rest of the chapter.

First, **measure in bits.** Subset sum has a dynamic-programming algorithm whose time is
the number of weights times $T$, which sounds polynomial. But $T$ has $n + k$ digits,
so it is exponential in the length of the input. Such **pseudo-polynomial** algorithms
are fast only when the numbers are small, and the reduction makes them large.

Second, **NP-completeness is about the worst case.** The instance has density $0.722$,
below the $0.9408$ threshold of the low-density lattice attack in
[Chapter 14](14-Lattices.md#1411-break-it-the-knapsack). That is no contradiction: the
attack's guarantee is for *random* weights, and reduction outputs are a thin, rigid
family of 0-and-1 digits with every slack number repeated. If lattice reduction solved
every low-density instance, it would solve 3-SAT through this table. The knapsack
cryptosystems drew their keys from the random-looking part of the problem, which
turned out to be easy; the hard instances sit in corners like this one, where nobody
knows how to sample them with a trapdoor.

## 19.4 Why NP-hard is not what cryptography needs

*Level: intermediate.*

NP-completeness is about the **worst case**: some instances are hard. A cipher needs
**average-case** hardness: the instances it actually generates, at random, must be
hard almost always. Many NP-complete problems are easy on typical instances; the
Merkle-Hellman knapsack (Chapter 14) was built on an NP-complete problem, and its
instances fell to lattice reduction.

There is a deeper obstacle. Public-key cryptography needs a **trapdoor**: hard
problems whose instances come with a secret that makes them easy. The problems with
that structure tend to lie in $\mathrm{NP} \cap \mathrm{coNP}$: for factoring, a
claimed factorization *and* a claim that a number has no factor below some bound can
both be verified (with primality certificates). If such a problem were NP-complete,
then NP would equal coNP, which is believed false. Gilles Brassard (1979) made this
kind of argument precise for a class of one-way functions. So cryptographic problems
are believed to be hard but *not* NP-hard: they sit in the middle ground, outside P
but below NP-completeness.

### Hard on average, with the answer in hand

Leonid Levin (1986) gave average-case complexity its own theory: a **distributional
problem** is a problem together with a distribution on its instances, and it is hard
on average if every efficient algorithm fails on a noticeable fraction of samples.
Whether any NP problem is hard on average is open (Impagliazzo's Heuristica, §19.5).

Cryptography asks for more: the honest user must *sample an instance together with
its solution*, pick $x$ and publish $f(x)$. Random 3-SAT formulas near the
satisfiability threshold seem hard, but nobody knows how to generate one with a
hidden satisfying assignment without leaving a trace. The obvious way, fixing $\sigma$
and drawing only clauses that $\sigma$ satisfies, leaks by counting: of the 8 sign
patterns of a clause, $\sigma$ rules out only the all-false one, and in the other 7
each literal agrees with $\sigma$ four times and disagrees three. A majority vote over
a long formula reads $\sigma$ back. Planted secrets in NP-complete problems have a
long record of such leaks, the knapsack included.

### Ajtai's bridge from the worst case to the average case

In 1996 Miklós Ajtai proved the theorem that lattice cryptography stands on. The
problem is **SIS** (short integer solution): given a uniformly random matrix
$A \in \mathbb{Z}_q^{n \times m}$, find a nonzero integer vector $z$ with

$$
A z \equiv 0 \pmod q, \qquad \lVert z \rVert \le \beta .
$$

Ajtai showed that for suitable polynomial relations between $n$, $m$, $q$ and $\beta$,
an algorithm that solves SIS for a noticeable fraction of random $A$ can be used to
approximate the shortest vector problem, within a polynomial factor, in *every*
$n$-dimensional lattice. The random instances are as hard as the worst instances.

The proof is a Cook reduction whose outline fits in a paragraph. Start with any
lattice $L$ and $n$ independent lattice vectors of length $\ell$. Add wide random noise
to lattice points; modulo the lattice the noisy points are almost uniform over a
fundamental region, and rounding each to a grid of $q^n$ cells gives a nearly uniform
$a_i \in \mathbb{Z}_q^n$. Feed $A = (a_1, \ldots, a_m)$ to the SIS solver. Its short
$z$ with $\sum z_i a_i \equiv 0$ makes the same combination of grid points a lattice
point, and since $z$, the noise and the rounding are all small, the combination of the
noisy samples is a lattice vector shorter than $\ell$ by a constant factor. Repeat
until the lengths reach the approximation factor the parameters allow. (Daniele
Micciancio and Oded Regev's 2004 version, with Gaussian noise, is the one usually
taught.)

SIS gives a hash function directly. Let $f_A(x) = A x \bmod q$ for bit vectors $x$.
Two inputs $x \ne x'$ with the same hash give $z = x - x'$, with entries in
$\{-1, 0, 1\}$ and $A z \equiv 0$: an SIS solution. By hand, with one row,
$q = 7$ and $A = (3, 5, 6, 2)$:

$$
f_A(1, 1, 0, 0) = 3 + 5 = 8 \equiv 1, \qquad f_A(0, 0, 1, 1) = 6 + 2 = 8 \equiv 1 \pmod 7,
$$

so $z = (1, 1, -1, -1)$ and indeed $3 + 5 - 6 - 2 = 0$. At real sizes that is a
collision-resistant hash with a worst-case proof behind it, and the module form of
SIS is one of the two assumptions behind ML-DSA (the other is Module-LWE). Oded
Regev's 2005 reduction does the same for LWE, at the price of a quantum step
([Chapter 15](15-Learning-with-Errors.md)).

Two remarks keep this in proportion. The approximation factors are polynomial, and
there the lattice problems are not known to be NP-hard: Dorit Aharonov and Oded Regev
(2004) put GapSVP within $\sqrt{n}$ in $\mathrm{NP} \cap \mathrm{coNP}$, the same
middle ground as factoring, while NP-hardness is known only for much smaller factors
(below $\sqrt 2$ for SVP, Daniele Micciancio 2001, under randomized reductions). And
real ML-KEM and ML-DSA parameters come from the cost of the best known attacks, not
from the reduction, whose losses are large. Still, no other family has anything like
it: factoring has no worst-case-to-average-case theorem, and the discrete logarithm has
one only within a fixed group (§19.8).

## 19.5 One-way functions

*Level: intermediate.*

A **one-way function** $f$ is easy to compute and hard to invert on random inputs:
for every efficient algorithm $\mathcal{A}$,

$$
\Pr_{x}\bigl[f(\mathcal{A}(f(x))) = f(x)\bigr] \text{ is negligible}.
$$

Candidates: multiplication of two random primes (inverting is factoring), modular
exponentiation $x \mapsto g^x$ (discrete logarithm), $x \mapsto \mathrm{SHA\text{-}256}(x)$,
$(A, s, e) \mapsto (A, As + e)$ (LWE).

Their existence is unproved (it implies P ≠ NP), but once one exists, a remarkable
amount follows:

- **pseudorandom generators** (Johan Håstad, Russell Impagliazzo, Leonid Levin and
  Michael Luby, 1999), and conversely;
- **pseudorandom functions** (Oded Goldreich, Shafi Goldwasser and Silvio Micali,
  1986) and pseudorandom permutations (Michael Luby and Charles Rackoff, 1988);
- symmetric encryption, message authentication codes, commitments;
- **digital signatures** (John Rompel, 1990, after Moni Naor and Moti Yung).

Every one of these also implies a one-way function, so they are all equivalent: the
whole of symmetric cryptography, and signatures, stand or fall together. **Public-key
encryption** is different: Russell Impagliazzo and Steven Rudich (1989) showed that it
cannot be built from a one-way function in a "black-box" way. It needs more
structure, a trapdoor.

Impagliazzo (1995) described **five worlds** we might live in: *Algorithmica* (P =
NP), *Heuristica* (NP hard in the worst case but easy on average), *Pessiland* (hard
problems but no one-way functions), *Minicrypt* (one-way functions but no public-key
encryption) and *Cryptomania* (public-key cryptography exists). Practice bets on
Cryptomania; theory has not ruled out the others.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The map of primitives: one-way functions are equivalent to pseudorandom generators, pseudorandom functions, symmetric encryption, MACs and signatures; public-key encryption and key exchange need trapdoor functions, which are a stronger assumption" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1.5" fill="none">
<rect x="20" y="40" width="360" height="170" rx="10"/>
<rect x="420" y="40" width="200" height="170" rx="10" class="acc"/>
</g>
<rect x="420" y="40" width="200" height="170" rx="10" class="acc-fill" fill-opacity=".12"/>
<text x="200" y="30" text-anchor="middle">Minicrypt: from any one-way function</text>
<text x="520" y="30" text-anchor="middle" class="acc">Cryptomania: needs a trapdoor</text>
<g font-size="12" text-anchor="middle">
<text x="110" y="75">one-way functions</text>
<text x="290" y="75">pseudorandom generators</text>
<text x="110" y="115">pseudorandom functions</text>
<text x="290" y="115">symmetric encryption</text>
<text x="110" y="155">MACs, commitments</text>
<text x="290" y="155">digital signatures</text>
<text x="200" y="195">all equivalent to each other</text>
<text x="520" y="85">public-key encryption</text>
<text x="520" y="115">key exchange</text>
<text x="520" y="145">(factoring, DL, LWE,</text>
<text x="520" y="162">syndrome decoding)</text>
</g>
<path d="M385 125 L 415 125" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="240" text-anchor="middle" font-size="12">no black-box construction from left to right (Impagliazzo and Rudich, 1989)</text>
</svg>
<figcaption>Figure 19.3. What follows from what. A single one-way function gives all of symmetric cryptography and signatures, and each of those gives back a one-way function. Public-key encryption needs more: a trapdoor, which every known construction gets from algebraic structure.</figcaption>
</figure>

## 19.6 Hard-core bits

*Level: intermediate.*

A one-way function can leak a lot: if $f$ is one-way, so is $f'(x, y) = (f(x), y)$,
which reveals half its input. Which parts of $x$ are truly hidden? A **hard-core
predicate** $b(x)$ is a bit that is easy to compute from $x$ but cannot be guessed from
$f(x)$ with probability noticeably above $\frac{1}{2}$.

**Goldreich-Levin theorem** (Oded Goldreich and Leonid Levin, 1989). For any one-way
function $f$, the inner product $\langle x, r \rangle \bmod 2$ is hard-core for
$g(x, r) = (f(x), r)$. *Idea*: an algorithm that predicts $\langle x, r \rangle$ for
random $r$ with advantage $\varepsilon$ can be queried at $r$ and $r \oplus e_i$; the
two answers' XOR is $x_i$ when both are right, and pairwise-independent sampling with
a majority vote makes "both right" likely enough, recovering $x$ in time polynomial in
$n/\varepsilon$. This is list decoding of the Hadamard code in disguise.

For specific functions, specific bits are hard-core. For RSA, the least significant
bit of the plaintext is as hard to compute as the whole plaintext (Werner Alexi, Benny
Chor, Oded Goldreich and Claus-Peter Schnorr, 1988). The proof is an algorithm, and it
works as an attack if any system leaks that bit.

### Code it: decryption from a parity leak

Given $c = m^e \bmod N$, multiplying by $2^e$ gives the encryption of $2m \bmod N$.
Since $N$ is odd, $2m \bmod N$ is even exactly when $2m < N$, that is, when
$m < N/2$. So the parity of the plaintext of $c \cdot 2^e$ tells which half of
$[0, N)$ holds $m$; the parity of $c \cdot 4^e$ splits that half again; and $\log_2 N$
queries pin $m$ down.

```python
# An RSA key, and an oracle that reveals only the LAST BIT of a plaintext: it decrypts everything.
import random
from math import gcd

def is_probable_prime(n, rng=random.Random(0)):
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29):
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d, s = d // 2, s + 1
    for _ in range(25):
        x = pow(rng.randrange(2, n - 1), d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True

def random_prime(bits, rng):
    while True:
        p = rng.getrandbits(bits) | (1 << (bits - 1)) | 1
        if is_probable_prime(p):
            return p

rng = random.Random(19)
p, q = random_prime(256, rng), random_prime(256, rng)
N, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))

def parity_oracle(c):
    return pow(c, d, N) & 1                     # the leak: one bit per query

def decrypt_with_parity(c):
    """Multiply the plaintext by 2 (c * 2^e).  2m mod N is even iff 2m < N (N is odd),
    so each answer halves the interval that holds m."""
    from fractions import Fraction
    lo, hi = Fraction(0), Fraction(N)
    two_e = pow(2, e, N)
    cc = c
    for _ in range(N.bit_length()):
        cc = cc * two_e % N
        if parity_oracle(cc) == 0:
            hi = (lo + hi) / 2
        else:
            lo = (lo + hi) / 2
    return int(hi)

m = rng.randrange(N)
print(decrypt_with_parity(pow(m, e, N)) == m, N.bit_length())
```

```text
True 512
```

All 512 bits of the plaintext, from 512 one-bit answers. The same idea, with a
"does this decrypt to valid padding?" oracle instead of parity, is Daniel
Bleichenbacher's 1998 attack on RSA encryption in TLS, told in *Protocols*.

## 19.7 Reductions, read carefully

*Level: expert.*

A security proof is a **reduction**: an algorithm $\mathcal{B}$ that uses any
adversary $\mathcal{A}$ against the scheme as a subroutine to solve the hard problem.
The theorem reads: *if $\mathcal{A}$ runs in time $t$ and has advantage $\varepsilon$,
then $\mathcal{B}$ runs in time $t'$ and solves the problem with probability
$\varepsilon'$*. If the problem cannot be solved with $(t', \varepsilon')$, the scheme
cannot be broken with $(t, \varepsilon)$.

### Example: the private key gives the factors

Knowing $\varphi(N)$ gives the factors at once ($p + q = N - \varphi(N) + 1$, then a
quadratic). Knowing $d$ is less direct but also enough. Since $ed - 1$ is a multiple
of $\lambda(N)$, write $ed - 1 = 2^s r$ with $r$ odd. For a random $a$, the sequence
$a^r, a^{2r}, a^{4r}, \ldots, a^{2^s r} = 1$ ends at 1. The last element before the
first 1 is a square root of 1 modulo $N$. Modulo $N = pq$ there are four square roots
of 1, $\pm 1$ and two others, and for at least half of all $a$ the sequence passes
through one of the others, $x$. Then $x^2 \equiv 1$ but $x \not\equiv \pm 1$, so
$\gcd(x - 1, N)$ is $p$ or $q$. $\blacksquare$

```python
# A reduction done carefully: anyone who knows the RSA private exponent d can factor N.
def factor_from_d(N, e, d, rng):
    """ed - 1 = 2^s r with r odd.  For random a, the sequence a^r, a^(2r), ... ends at 1;
    the last value before 1, if not -1, is a square root of 1 other than +-1, and gcd reveals p."""
    k = e * d - 1
    s, r = 0, k
    while r % 2 == 0:
        r, s = r // 2, s + 1
    tries = 0
    while True:
        tries += 1
        a = rng.randrange(2, N - 1)
        x = pow(a, r, N)
        for _ in range(s):
            y = x * x % N
            if y == 1 and x not in (1, N - 1):
                return gcd(x - 1, N), tries
            x = y

f, tries = factor_from_d(N, e, d, rng)
print(f in (p, q), tries, N.bit_length())
```

```text
True 1 512
```

A 512-bit modulus, factored on the first try. So "recover the RSA private key" is exactly as
hard as factoring; "decrypt RSA ciphertexts" is not known to be.

### Tightness and concrete security

The quality of a reduction is in its losses. If $t' \approx t$ and $\varepsilon'
\approx \varepsilon$, it is **tight**: breaking the scheme is as hard as the problem.
Many proofs lose a factor: $\varepsilon' = \varepsilon/q$, where $q$ is the number
of queries, users or messages, because the reduction must guess where to plant its
challenge. With a 128-bit problem and a loss of $2^{30}$, the theorem guarantees only
about 98 bits.

```python
# Tightness: what a reduction's loss does to concrete security.
def bits_left(problem_bits, loss_log2, time_ratio_log2=0):
    """If adversary advantage eps in time t gives a solver with eps / L in time T * t,
    an adversary is only guaranteed to need about 2^(bits - log L - log T) work."""
    return problem_bits - loss_log2 - time_ratio_log2

for name, loss in (("tight reduction", 0), ("loss = number of users, 2^30", 30),
                   ("loss = queries squared, 2^64", 64)):
    print(name, bits_left(128, loss))
```

```text
tight reduction 128
loss = number of users, 2^30 98
loss = queries squared, 2^64 64
```

This is not a pedantic point. Multi-user settings with billions of keys, and proofs
with quadratic losses in the number of queries, can make a "128-bit" proof guarantee
much less, and some standards (TLS 1.3's analyses, for example) were revisited to get
tighter bounds. Daniele Micciancio and Michael Walter (2018) gave a definition of
**bit security** that handles decision problems properly: roughly, a primitive has
$k$ bits of security if every adversary with running time $t$ and advantage
$\varepsilon$ has $t/\varepsilon^2 \ge 2^k$ for decision games.

### A full reduction: ElGamal from DDH, game by game

Here is one security proof done completely, with every loss counted.

**The scheme.** A group $G$ of prime order $q$ with generator $g$ (for instance the
quadratic residues modulo a safe prime, Chapter 7). The secret key is a random $x$, the
public key $h = g^x$. To encrypt a message $m \in G$, pick a random $r$ and send

$$
(c_1, c_2) = (g^r,\; h^r \cdot m) .
$$

Decryption computes $c_2 / c_1^{\,x} = m$.

**The goal: IND-CPA.** The adversary $\mathcal{A}$ receives $h$, chooses two messages
$m_0, m_1$, receives an encryption of $m_b$ for a hidden random bit $b$, and outputs a
guess $b'$. Its advantage is

$$
\mathrm{Adv}^{\mathrm{cpa}}(\mathcal{A}) = \bigl|\, 2 \Pr[b' = b] - 1 \,\bigr| ,
$$

zero for blind guessing, one for a perfect attack.

**The assumption: DDH.** A distinguisher $\mathcal{D}$ receives $(g^a, g^b, Z)$ where
either $Z = g^{ab}$ (a real triple) or $Z = g^c$ for an independent random $c$, and
outputs a bit. Its advantage is
$\mathrm{Adv}^{\mathrm{ddh}}(\mathcal{D}) = |\Pr[\mathcal{D} = 1 \mid \text{real}] -
\Pr[\mathcal{D} = 1 \mid \text{random}]|$.

**Theorem.** For every $\mathcal{A}$ running in time $t$ there is a distinguisher
$\mathcal{B}$ running in time $t$ plus one group multiplication and one coin flip, with

$$
\mathrm{Adv}^{\mathrm{cpa}}(\mathcal{A}) = 2 \cdot \mathrm{Adv}^{\mathrm{ddh}}(\mathcal{B}) .
$$

**The reduction** (Figure 19.4). $\mathcal{B}$ gets $(A, B, Z) = (g^a, g^b, Z)$. It
hands $\mathcal{A}$ the public key $h = A$, receives $m_0, m_1$, flips its own coin
$\beta$, and hands back the ciphertext $(B,\; Z \cdot m_\beta)$. When $\mathcal{A}$
answers $b'$, $\mathcal{B}$ outputs 1 if $b' = \beta$ and 0 otherwise. It never needs
the exponents $a$ or $b$: it plants the challenge triple inside a ciphertext.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The reduction B as a box around the adversary A: B receives a DDH triple, gives A the public key g to the a, receives two messages, returns the ciphertext g to the b and Z times m beta, and outputs 1 if A guesses beta" fill="currentColor" font-size="14">
<rect x="10" y="95" width="100" height="80" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="130" text-anchor="middle">DDH</text>
<text x="60" y="148" text-anchor="middle">challenger</text>
<rect x="200" y="20" width="430" height="230" rx="12" fill="currentColor" fill-opacity=".06" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<text x="220" y="42" font-weight="600">reduction B</text>
<rect x="470" y="60" width="140" height="150" rx="8" fill="currentColor" fill-opacity=".12" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="128" text-anchor="middle" font-weight="600">adversary A</text>
<text x="540" y="148" text-anchor="middle" font-size="12" fill-opacity=".7">any IND-CPA attack,</text>
<text x="540" y="164" text-anchor="middle" font-size="12" fill-opacity=".7">used as a black box</text>
<g stroke="currentColor" stroke-width="1.5">
<line x1="110" y1="115" x2="196" y2="115"/><line x1="200" y1="155" x2="114" y2="155"/>
<line x1="300" y1="80" x2="466" y2="80"/><line x1="470" y1="110" x2="304" y2="110"/>
<line x1="300" y1="160" x2="466" y2="160"/><line x1="470" y1="190" x2="304" y2="190"/>
</g>
<polygon points="200,115 192,111 192,119"/><polygon points="110,155 118,151 118,159"/>
<polygon points="470,80 462,76 462,84"/><polygon points="300,110 308,106 308,114"/>
<polygon points="470,160 462,156 462,164"/><polygon points="300,190 308,186 308,194"/>
<text x="114" y="108" font-size="11">(g^a, g^b, Z)</text>
<text x="140" y="172" font-size="12">bit</text>
<text x="385" y="73" text-anchor="middle" font-size="13">public key h = g^a</text>
<text x="385" y="103" text-anchor="middle" font-size="13">m₀, m₁</text>
<text x="385" y="153" text-anchor="middle" font-size="13">(g^b, Z · m_β)</text>
<text x="385" y="183" text-anchor="middle" font-size="13">guess b′</text>
<text x="220" y="138" font-size="12">flip β</text>
<text x="220" y="230" font-size="13">output 1 if b′ = β, else 0</text>
</svg>
<figcaption>Figure 19.4. The reduction as a box. B talks to the DDH challenger on the left and plays the IND-CPA challenger for A on the right. It never learns a secret exponent; it plants the challenge Z in the ciphertext and lets A's success tell it whether Z was real.</figcaption>
</figure>

**The proof, as a sequence of games** (Figure 19.5). Victor Shoup's 2004 tutorial made this style
standard: change one thing at a time and bound each change. Let $W_i$ be the event "$b' = b$" in
Game $i$.

- **Game 0** is the real game, with ciphertext $(g^r, g^{xr} m_b)$. By definition, $\Pr[W_0] = \frac{1}{2} + \frac{1}{2}\mathrm{Adv}^{\mathrm{cpa}}(\mathcal{A})$.
- **Game 1** is the same, except that the mask $g^{xr}$ is replaced by $g^c$ for a fresh
  random $c$: the triple $(g^x, g^r, \text{mask})$ goes from real to random. And
  $\mathcal{B}$ *is* Game 0 on a real input and Game 1 on a random one, with $\beta$
  as $b$, outputting 1 exactly when $W$ happens. So $|\Pr[W_0] - \Pr[W_1]| =
  \mathrm{Adv}^{\mathrm{ddh}}(\mathcal{B})$, an equality.
- **Game 2** replaces $c_2 = g^c m_b$ by a uniformly random group element $u$. This
  changes nothing, since multiplying by $m_b$ is a bijection of $G$: a one-time pad in
  the group. Now nothing $\mathcal{A}$ sees depends on $b$, so $\Pr[W_2] = \Pr[W_1] = \frac{1}{2}$.

Putting the three lines together,

$$
\tfrac{1}{2}\mathrm{Adv}^{\mathrm{cpa}}(\mathcal{A}) = \bigl|\Pr[W_0] - \tfrac{1}{2}\bigr|
= \bigl|\Pr[W_0] - \Pr[W_1]\bigr| = \mathrm{Adv}^{\mathrm{ddh}}(\mathcal{B}) . \qquad \blacksquare
$$

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Three games in a row: the real game with mask g to the xr, a game with a random mask g to the c, and a game where the second ciphertext part is uniform; the first hop costs the DDH advantage, the second costs nothing, and in the last game the adversary wins with probability one half" fill="currentColor" font-size="14">
<g fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="10" y="40" width="170" height="90" rx="8"/>
<rect x="235" y="40" width="170" height="90" rx="8"/>
<rect x="460" y="40" width="170" height="90" rx="8"/>
</g>
<rect x="460" y="40" width="170" height="90" rx="8" fill="currentColor" fill-opacity=".12"/>
<text x="95" y="30" text-anchor="middle" font-weight="600">Game 0: real</text>
<text x="320" y="30" text-anchor="middle" font-weight="600">Game 1</text>
<text x="545" y="30" text-anchor="middle" font-weight="600">Game 2</text>
<text x="95" y="80" text-anchor="middle">(g^r, g^(xr) · m_b)</text>
<text x="320" y="80" text-anchor="middle">(g^r, g^c · m_b)</text>
<text x="545" y="80" text-anchor="middle">(g^r, u)</text>
<text x="95" y="108" text-anchor="middle" font-size="12" fill-opacity=".7">Pr[W₀] = ½ + ε/2</text>
<text x="320" y="108" text-anchor="middle" font-size="12" fill-opacity=".7">Pr[W₁] = Pr[W₂]</text>
<text x="545" y="108" text-anchor="middle" font-size="12" fill-opacity=".7">Pr[W₂] = ½</text>
<g stroke="currentColor" stroke-width="1.5"><line x1="182" y1="85" x2="229" y2="85"/><line x1="407" y1="85" x2="454" y2="85"/></g>
<polygon points="233,85 225,81 225,89"/><polygon points="458,85 450,81 450,89"/>
<text x="207" y="160" text-anchor="middle" font-size="12">difference</text>
<text x="207" y="176" text-anchor="middle" font-size="12">= Adv_DDH(B)</text>
<text x="432" y="160" text-anchor="middle" font-size="12">difference = 0</text>
<text x="432" y="176" text-anchor="middle" font-size="12">(one-time pad in G)</text>
<text x="320" y="215" text-anchor="middle" font-weight="600">ε = Adv_CPA(A) = 2 · Adv_DDH(B)</text>
</svg>
<figcaption>Figure 19.5. The proof as game hops. Each hop changes one thing and is charged for it: the first hop costs exactly B's DDH advantage, the second costs nothing because a uniform mask hides the message perfectly. In the last game A can only guess.</figcaption>
</figure>

### Counting the losses

- **Advantage:** a factor of 2, from the convention $|2\Pr[\text{win}] - 1|$; the
  "real or random" form of the definition removes it. That is one bit under the
  $t/\varepsilon$ measure, two under $t/\varepsilon^2$ (§19.12).
- **Time:** $\mathcal{A}$'s time plus one multiplication and one coin flip.
- **Queries:** none. A CPA adversary has no oracle, and the reduction guesses nothing.

The reduction is tight: 128-bit DDH gives 128-bit IND-CPA, to within a bit or two. It
says nothing about chosen-ciphertext attacks, rightly: $(c_1, 2c_2)$ decrypts to $2m$,
so a decryption oracle breaks ElGamal at once (Cramer-Shoup or the Fujisaki-Okamoto
transform answer that game).

### The proof, run backwards

In the full group $\mathbb{Z}_p^*$, where §19.9 shows DDH is false, ElGamal falls too:
choose $m_0$ a quadratic residue and $m_1$ a non-residue, work out from $h$ and $c_1$
whether the mask $g^{xr}$ is a residue (exactly when $x$ or $r$ is even), and read off
which message was sent: advantage 1. Wrapped in $\mathcal{B}$, which knows nothing
about Legendre symbols, it becomes a DDH distinguisher right on every real triple and
half the random ones: advantage $\frac{1}{2}$, as the theorem says.

### Many users and many messages

Real systems encrypt many messages to many keys. A hybrid argument
([Chapter 16](16-Probability.md#the-hybrid-argument)) switches the $\ell$ ciphertexts
from real to random one at a time and loses a factor $\ell$: 40 bits for $2^{40}$
ciphertexts. Mihir Bellare, Alexandra Boldyreva and Silvio Micali (2000)
removed the loss with the random self-reducibility of DDH (§19.8). From one triple $(A, B, C) =
(g^a, g^b, C)$, pick random $s, t$ and form

$$
(A,\; B^s g^t,\; C^s A^t) .
$$

If $C = g^{ab}$, the new triple is $(g^a, g^{bs+t}, g^{a(bs+t)})$, a real triple with
a fresh random second exponent. If $C = g^c$ with $c \ne ab$, write the new exponents
as $(bs + t,\; cs + at)$: the map $(s, t) \mapsto (bs + t, cs + at)$ has determinant
$ab - c \ne 0$ modulo $q$, so the pair is uniform and independent, a fresh random
triple. One challenge becomes as many as the reduction needs, all real or all random
together, and the bound stays $2\,\mathrm{Adv}^{\mathrm{ddh}}$ plus a term of order
$1/q$, whatever the numbers of messages and users. Tightness belongs to a proof, and a
better proof can restore what a cruder one lost.

## 19.8 Random self-reducibility

*Level: expert.*

For some problems, the average case is exactly as hard as the worst case. In a cyclic
group of order $n$ with generator $g$, to solve $h = g^x$, pick a random $r$ and ask
for the logarithm of $h' = h g^r$, which is a *uniformly random* group element
whatever $h$ was. If the answer is $x'$, then $x = x' - r \bmod n$. So an algorithm
that solves even 1% of random instances solves every instance, with about 100 tries.
This is **random self-reducibility** (Martín Abadi, Joan Feigenbaum and Joe Kilian,
1989), and it is why the discrete logarithm in a fixed group has no weak instances:
once the group is chosen well, every key is as safe as any other.

```python
# Random self-reducibility: an oracle that solves discrete logs for only 1% of inputs
# solves them for every input, after about 100 queries on average.
import random
rng = random.Random(1989)
P = 1_000_003                                   # prime; 2 generates Z_P^*
g = 2
order = P - 1
print(all(pow(g, order // f, P) != 1 for f in (2, 3, 166667)))   # P - 1 = 2 * 3 * 166667
table = {}
x = 1
for i in range(order):                          # a full log table, to build the weak oracle
    table[x] = i
    x = x * g % P

def weak_oracle(h):
    """Answers only when h mod 100 == 7 (about 1% of inputs); otherwise gives up."""
    return table[h] if h % 100 == 7 else None

def strong_dlog(h, rng):
    queries = 0
    while True:
        r = rng.randrange(order)
        queries += 1
        ans = weak_oracle(h * pow(g, r, P) % P)   # a uniformly random group element
        if ans is not None:
            return (ans - r) % order, queries

qs = []
for _ in range(200):
    secret = rng.randrange(order)
    found, qn = strong_dlog(pow(g, secret, P), rng)
    assert found == secret
    qs.append(qn)
print(sum(qs) / len(qs))
```

```text
True
109.7
```

The oracle answers only when the input ends in the digits 07, about one time in 100;
200 random instances in a group of order 1,000,002 were all solved, with about 110
queries on average. The expected number is about 100; the number of tries until the
first success has a geometric distribution, whose spread is as large as its mean.

Factoring has no known random self-reduction: the hardness of a random 2048-bit RSA
modulus is an average-case assumption about how moduli are generated, and special
moduli (with $p - 1$ smooth, $p$ and $q$ close, or ROCA's structure) are weak.

## 19.9 The map of assumptions

*Level: expert.*

Here is what is known about the main assumptions. An arrow "A ⇒ B" means that an
algorithm for problem A gives one for problem B, so B is no harder than A.

- **Factoring ⇒ RSA** (computing $e$-th roots). The converse is open, and Dan Boneh and
  Ramarathnam Venkatesan (1998) gave evidence that for small $e$ it might be false.
- **Factoring ⇔ Rabin** (computing square roots modulo $N$; Michael Rabin, 1979): two
  different square roots of the same number give a factor, exactly as in §19.7.
- **Factoring ⇔ RSA key recovery** (§19.7).
- **DL ⇒ CDH ⇒ DDH**. For many groups CDH and DL are equivalent (Ueli Maurer and
  Stefan Wolf, 1999, given auxiliary information). DDH is strictly weaker in some
  groups: it is *false* in $\mathbb{Z}_p^*$ itself, and in groups with a computable
  pairing (Chapter 13), while CDH can still hold there.
- **Gap problems**: CDH may be hard even when a DDH oracle is available; pairing-based
  signatures such as BLS rely on exactly that.
- **Lattices**: average-case **SIS** ⇒ worst-case approximate SIVP and GapSVP
  (Miklós Ajtai, 1996): an algorithm for random SIS instances would solve the
  hardest lattice instances. **LWE** ⇒ the same worst-case problems by a quantum
  reduction (Oded Regev, 2005). Their module and ring versions are behind ML-KEM and
  ML-DSA (Chapter 15).
- **Syndrome decoding** of random codes (Chapter 18): NP-hard in the worst case,
  assumed hard on average; no worst-case-to-average-case reduction is known.
- **Quantum computers**: Shor's algorithm (Chapter 20) breaks factoring, RSA, DL,
  CDH and DDH in every group used in practice; it does not touch LWE, SIS or syndrome
  decoding.

### Code it: DDH fails in $\mathbb{Z}_p^*$

Let $g$ generate all of $\mathbb{Z}_p^*$. Then $g^x$ is a quadratic residue exactly
when $x$ is even, and the Legendre symbol (Chapter 5) computes that in polynomial
time. $ab$ is even when $a$ or $b$ is, so in a real Diffie-Hellman triple the residue
status of $g^{ab}$ is determined by those of $g^a$ and $g^b$; in a random triple it
is a coin flip.

```python
# DDH is false in the full group Z_p^*: the Legendre symbol of g^(ab) is determined by those of g^a, g^b.
def legendre(x, p):
    return pow(x, (p - 1) // 2, p)

def ddh_distinguisher(A, B, C):
    """g is a non-residue; g^x is a residue iff x is even.  ab is even iff a or b is even."""
    qa, qb, qc = legendre(A, P) == 1, legendre(B, P) == 1, legendre(C, P) == 1
    return int(qc == (qa or qb))                # 1 = "looks like a real DH triple"

real = rand = 0
trials = 4000
for _ in range(trials):
    a, b, c = rng.randrange(order), rng.randrange(order), rng.randrange(order)
    real += ddh_distinguisher(pow(g, a, P), pow(g, b, P), pow(g, a * b, P))
    rand += ddh_distinguisher(pow(g, a, P), pow(g, b, P), pow(g, c, P))
print(real / trials, rand / trials, round(real / trials - rand / trials, 3))
```

```text
1.0 0.49725 0.503
```

The test accepts every real triple and half of the random ones: advantage $1/2$. The
fix is to work in a subgroup of prime order $q$ (Chapter 7), such as the quadratic
residues modulo a safe prime $p = 2q + 1$, where no such character exists.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A map of assumptions with arrows: factoring implies RSA and is equivalent to Rabin; discrete log implies CDH which implies DDH; SIS and LWE imply worst-case lattice problems; Shor's quantum algorithm breaks the factoring and discrete log families but not lattices or codes" fill="currentColor" font-size="12">
<g stroke="currentColor" stroke-width="1.3" fill="none">
<rect x="20" y="40" width="120" height="34" rx="6"/><rect x="20" y="110" width="120" height="34" rx="6"/><rect x="20" y="180" width="120" height="34" rx="6"/>
<rect x="190" y="40" width="100" height="34" rx="6"/><rect x="190" y="110" width="100" height="34" rx="6"/><rect x="190" y="180" width="100" height="34" rx="6"/>
<rect x="340" y="40" width="150" height="34" rx="6" class="acc"/><rect x="340" y="110" width="150" height="34" rx="6" class="acc"/>
<rect x="502" y="110" width="128" height="34" rx="6" class="acc"/>
<path d="M80 74 V 108 M80 144 V 178"/>
<path d="M240 74 V 108 M240 144 V 178"/>
<path d="M415 74 V 108"/>
</g>
<g text-anchor="middle">
<text x="80" y="62">Rabin</text><text x="80" y="132">factoring</text><text x="80" y="202">RSA</text>
<text x="240" y="62">DL</text><text x="240" y="132">CDH</text><text x="240" y="202">DDH</text>
<text x="415" y="62" class="acc">SIS, LWE</text><text x="415" y="132" class="acc">worst-case SVP, SIVP</text><text x="430" y="98" font-size="11" text-anchor="start">⇒ (quantum for LWE)</text>
<text x="566" y="132" class="acc">syndrome decoding</text>
<text x="80" y="98" font-size="11">⇔</text><text x="80" y="168" font-size="11">⇒</text>
<text x="240" y="98" font-size="11">⇒</text><text x="240" y="168" font-size="11">⇒</text>
</g>
<path d="M14 235 H 296" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/>
<text x="155" y="256" text-anchor="middle">broken by Shor's algorithm</text>
<path d="M344 235 H 626" stroke="currentColor" stroke-width="2" class="acc"/>
<text x="485" y="256" text-anchor="middle" class="acc">no known quantum attack</text>
<text x="320" y="282" text-anchor="middle" font-size="11">A ⇒ B: an algorithm for A solves B, so B is no harder than A</text>
</svg>
<figcaption>Figure 19.6. The map of assumptions. Left: the factoring family; middle: the discrete-logarithm family; right: the post-quantum assumptions. Reading down, each problem is no harder than the one above it. Shor's algorithm breaks the left two columns completely.</figcaption>
</figure>

## 19.10 Schnorr signatures and the forking lemma

*Level: expert.*

ElGamal's proof was tight because the reduction planted its challenge without
guessing. To extract a discrete logarithm from a forger, a reduction needs *two*
related signatures, gets them by running the forger twice, and pays the most famous
loss in provable security.

### The scheme, and two signatures by hand

Schnorr signatures (Claus-Peter Schnorr, 1989) live in a group of prime order $q$
with generator $g$. The secret key is $x$, the public key $y = g^x$. To sign $m$:

$$
k \leftarrow \mathbb{Z}_q \text{ at random}, \quad R = g^k, \quad c = H(R, m), \quad
s = k + c\,x \bmod q ,
$$

and the signature is $(R, s)$, or the shorter $(c, s)$. Verification checks
$g^s = R \cdot y^c$. EdDSA and Bitcoin's BIP 340 are this scheme with particular
encodings, and *Advanced protocols*
[chapter 6](../advanced/06-Sigma-Protocols-and-Fiat-Shamir.md) treats it as the
Fiat-Shamir transform of an identification protocol. Here we need only its algebra.

By hand, with $p = 23$, $q = 11$ and $g = 2$ (which has order 11 modulo 23, since
$2^{11} = 2048 = 89 \cdot 23 + 1$). Take $x = 7$, so $y = 2^7 = 128 \equiv 13$. Sign
with $k = 5$: $R = 2^5 = 32 \equiv 9$. Suppose the hash gives $c = 3$; then
$s = 5 + 3 \cdot 7 = 26 \equiv 4 \pmod{11}$. Check: $g^s = 2^4 = 16$ and
$R\,y^c = 9 \cdot 13^3 \equiv 9 \cdot 12 = 108 \equiv 16 \pmod{23}$.

Now suppose the *same* $R = 9$ is signed under a different hash value $c' = 8$:
$s' = 5 + 8 \cdot 7 = 61 \equiv 6$. Subtracting the two equations $s = k + cx$ and
$s' = k + c'x$ removes $k$:

$$
x = \frac{s - s'}{c - c'} = \frac{4 - 6}{3 - 8} = \frac{-2}{-5} = 2 \cdot 5^{-1}
\equiv 2 \cdot 9 = 18 \equiv 7 \pmod{11} .
$$

The secret key falls out. This **special soundness** is the property the proof uses:
two valid signatures with the same $R$ and different challenges give $x$. It is also
why a signer who repeats a nonce $k$ gives away the key (*Advanced protocols*
[§6.10](../advanced/06-Sigma-Protocols-and-Fiat-Shamir.md#610-a-repeated-nonce-gives-away-the-key)).

### What the reduction must do

In the random-oracle model (§19.11) the reduction $\mathcal{B}$ gives the forger the
discrete-log challenge $y$ as its public key and answers its questions itself.

- **Hash queries** get fresh random answers, recorded in a table.
- **Signing queries** are answered without $x$, backwards: pick $c$ and $s$, set
  $R = g^s y^{-c}$, and *program* $H(R, m) = c$. The result has exactly the
  distribution of a real signature, and the programming fails (because $H(R, m)$ was
  already set) with probability at most $q_S(q_S + q_H)/q$.
- **The forgery** $(R, s)$ must use the answer $c = H(R, m)$; a forger that never
  asked guesses $c$ with probability $1/q$.

So the forgery is tied to one of the $q_H$ hash queries, say query $J$. The reduction
cannot know $J$ in advance. Its move is to **fork**: rerun the forger from the start
with the *same* random tape and the *same* answers to queries $1, \ldots, J - 1$, and
fresh random answers from query $J$ on (Figure 19.7). Up to query $J$ the forger
cannot tell the runs apart, so it asks the same query $J$, about the same $R$. If it
forges again at the same index, the reduction holds two signatures with the same $R$
and (almost surely) different challenges, and computes $x$ as above.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The forking lemma as a tree: one run of the forger shares its random tape and its first J minus one hash answers with a second run; at query J the runs split, one answered c and the other c prime, and both end in forgeries on the same commitment R, which give the secret key" fill="currentColor" font-size="14">
<g fill="currentColor"><circle cx="40" cy="125" r="6"/><circle cx="100" cy="125" r="5"/><circle cx="160" cy="125" r="5"/><circle cx="220" cy="125" r="5"/><circle cx="280" cy="125" r="7"/></g>
<g stroke="currentColor" stroke-width="2"><line x1="40" y1="125" x2="280" y2="125"/></g>
<text x="40" y="155" text-anchor="middle" font-size="12">tape ρ</text>
<text x="100" y="110" text-anchor="middle" font-size="12">c₁</text>
<text x="160" y="110" text-anchor="middle" font-size="12">c₂</text>
<text x="220" y="110" text-anchor="middle" font-size="12">…</text>
<text x="160" y="155" text-anchor="middle" font-size="12" fill-opacity=".7">shared by both runs</text>
<text x="280" y="155" text-anchor="middle" font-size="12">query J: H(R, m)?</text>
<g stroke="currentColor" stroke-width="2" fill="none">
<path d="M280 125 L 360 60 L 480 60"/>
<path d="M280 125 L 360 190 L 480 190" stroke-dasharray="7 4"/>
</g>
<text x="330" y="78" font-size="13">c</text>
<text x="330" y="184" font-size="13">c′</text>
<text x="420" y="50" text-anchor="middle" font-size="12" fill-opacity=".7">first run</text>
<text x="420" y="212" text-anchor="middle" font-size="12" fill-opacity=".7">rewound run, fresh answers</text>
<g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="485" y="40" width="140" height="40" rx="6"/><rect x="485" y="170" width="140" height="40" rx="6"/></g>
<text x="555" y="65" text-anchor="middle">forgery (R, s)</text>
<text x="555" y="195" text-anchor="middle">forgery (R, s′)</text>
<rect x="470" y="100" width="165" height="50" rx="8" fill="currentColor" fill-opacity=".12"/>
<text x="552" y="122" text-anchor="middle" font-size="13">x = (s − s′) / (c − c′)</text>
<text x="552" y="140" text-anchor="middle" font-size="12" fill-opacity=".7">if both forge at J</text>
</svg>
<figcaption>Figure 19.7. Forking. The two runs share the forger's random tape and the answers to the first J − 1 hash queries, so they reach query J in the same state and ask about the same R. From there the answers differ. If both runs forge at index J, special soundness gives the key.</figcaption>
</figure>

### The forking lemma, with its proof

David Pointcheval and Jacques Stern proved the first version in 1996; Mihir Bellare
and Gregory Neven's 2006 **general forking lemma** is pure probability, with a short
proof.

**Lemma.** Let $F$ take a random tape $\rho$ and answers $h_1, \ldots, h_Q$ uniform in
a set of size $q$, and output an index $J \in \{0, \ldots, Q\}$ ($J = 0$ is
failure); let $\mathrm{acc} = \Pr[J \ge 1]$. Let $\mathrm{frk}$ be the probability
that a first run gives $J \ge 1$ and a second run with the same $\rho$ and
$h_1, \ldots, h_{J-1}$ but fresh $h'_J, \ldots, h'_Q$ gives the same $J$ with
$h'_J \ne h_J$. Then

$$
\mathrm{frk} \;\ge\; \mathrm{acc}\left(\frac{\mathrm{acc}}{Q} - \frac{1}{q}\right) .
$$

*Proof.* Fix an index $i$ and call $\pi = (\rho, h_1, \ldots, h_{i-1})$ the prefix.
Let $X_i(\pi)$ be the probability, over the remaining answers, that $J = i$. Given the
prefix, the two runs use independent remaining answers, so both output $i$ with
probability $X_i(\pi)^2$. Averaging over prefixes and using $\mathbb{E}[X^2] \ge
(\mathbb{E}[X])^2$,

$$
\Pr[J = i \text{ and } J' = i] = \mathbb{E}_\pi\bigl[X_i(\pi)^2\bigr] \ge
\bigl(\mathbb{E}_\pi X_i(\pi)\bigr)^2 = a_i^2, \qquad a_i = \Pr[J = i].
$$

The event $h'_i = h_i$ has probability $1/q$, so excluding it costs at most
$a_i / q$. Summing over $i$ and using the Cauchy-Schwarz inequality
$\sum_i a_i^2 \ge (\sum_i a_i)^2 / Q$,

$$
\mathrm{frk} \ge \sum_{i=1}^{Q} a_i^2 - \sum_{i=1}^{Q} \frac{a_i}{q} \ge
\frac{\mathrm{acc}^2}{Q} - \frac{\mathrm{acc}}{q} . \qquad \blacksquare
$$

The two inequalities are where the loss lives. Jensen's step squares the success
probability: the second run must succeed *too*. The Cauchy-Schwarz step divides by
$Q$: the second run must succeed *at the same index*, and a forger whose success is
spread evenly over the $Q$ queries makes that a $1/Q$ event.

### Code it: forking a forger

The forger below has the secret key built in, as a black box would; the reduction only
sees $y = g^x$ and the forger's outputs. The forger makes $Q = 16$ hash queries on
commitments from its tape and forges on the first query whose answer happens to be
"lucky" (in the bottom 1/25 of the range). Its success therefore depends on the hash
answers, which is exactly what makes forking lossy. The reduction forks it and checks
every extracted key.

```python
# The forking lemma on a toy Schnorr group: run a forger, rewind it to the hash query its
# forgery used, answer that query afresh, and read the secret key off two forgeries.
import random
rng = random.Random(1996)
p, q, g = 2147483579, 1073741789, 4      # g = 2^2 has prime order q modulo p = 2q + 1
Q = 16                                   # hash queries the forger makes
LUCKY = q // 25                          # it can forge only after a challenge below this

def make_forger(x):
    """A black box with the key x built in.  It hashes Q commitments R_i = g^k_i
    (k_i from its random tape) and forges on the FIRST query whose answer is lucky."""
    def forger(tape, answer):
        for i in range(Q):
            R = pow(g, tape[i], p)
            c = answer(i, R)
            if c < LUCKY:
                return i, R, c, (tape[i] + c * x) % q
        return None
    return forger

def fork(forger, y):
    """The reduction: it sees only y = g^x and the forger's outputs."""
    tape = [rng.randrange(q) for _ in range(Q)]
    first = [rng.randrange(q) for _ in range(Q)]
    out1 = forger(tape, lambda i, R: first[i])
    if out1 is None:
        return "no forgery", None
    J, R, c, s = out1
    assert pow(g, s, p) == R * pow(y, c, p) % p              # a valid Schnorr signature
    second = first[:J] + [rng.randrange(q) for _ in range(Q - J)]
    out2 = forger(tape, lambda i, R: second[i])              # same tape, same past
    if out2 is None or out2[0] != J or out2[2] == c:
        return "fork failed", None
    _, _, c2, s2 = out2
    return "fork", (s - s2) * pow(c - c2, -1, q) % q         # two answers, one secret

trials, acc, frk = 20000, 0, 0
for _ in range(trials):
    x = rng.randrange(1, q)
    result, found = fork(make_forger(x), pow(g, x, p))
    acc += result != "no forgery"
    if result == "fork":
        frk += 1
        assert found == x
acc, frk = acc / trials, frk / trials
print("forger succeeds:", acc, " fork succeeds:", frk)
print("forking lemma bound acc*(acc/Q - 1/q):", round(acc * (acc / Q - 1 / q), 4))
```

It prints:

```text
forger succeeds: 0.48495  fork succeeds: 0.01965
forking lemma bound acc*(acc/Q - 1/q): 0.0147
```

The forger succeeds about half the time; forking succeeds in about 2% of runs, every
one recovering the right key, against the lemma's promise of $1.47\%$. For this forger
the exact value is $\mathrm{acc} \times \frac{1}{25}$: the rewound run reaches query
$J$ exactly as before and forges there only if the fresh answer is lucky too. Since
$\mathrm{acc} \approx Q/25$ when luck is rare, that is about $\mathrm{acc}^2/Q$, the
lemma's shape.

### What the square root costs

Put the pieces together. A forger running in time $t$ with success $\varepsilon$
and $q_H$ hash queries gives a discrete-log solver running in time about $2t$ with
success about $\varepsilon^2 / q_H$. Turn that into bits. In a group of $b$ bits
the best discrete-log algorithm, Pollard's rho, needs time about $2^{b/2}$, so assume
every solver has $t'/\varepsilon' \ge 2^{b/2}$. Then

$$
\frac{2t \cdot q_H}{\varepsilon^2} \ge 2^{b/2} .
$$

A forger cannot make more hash queries than it has time for, so $q_H \le t$, and in
the worst case $q_H \approx t$:

$$
\frac{t^2}{\varepsilon^2} \ge 2^{b/2 - 1} \quad\Longrightarrow\quad
\frac{t}{\varepsilon} \ge 2^{b/4 - 1/2} .
$$

The proof guarantees only about a *quarter* of the group size in bits, half of what
the discrete logarithm offers:

| Group size $b$ | Discrete log (rho) | Proven for Schnorr | Example |
| --- | --- | --- | --- |
| 256 bits | 128 bits | about 63.5 bits | Ed25519, BIP 340 |
| 384 bits | 192 bits | about 95.5 bits | |
| 512 bits | 256 bits | about 127.5 bits | |

Taken literally, the theorem asks for a 512-bit group to back a 128-bit claim. Nobody
deploys Schnorr that way: Ed25519's 128-bit rating rests on the best *known* attack,
generic discrete-log search at about $2^{126}$ operations in its 252-bit group. The
gap looks like an artifact of the proof technique. Yannick Seurin (2012) showed the
loss is essentially optimal for **algebraic reductions** (which build every group
element they output from those they were given), assuming the one-more discrete-log
problem is hard. And Georg Fuchsbauer, Antoine Plouviez and Yannick Seurin (2020)
proved Schnorr signatures *tightly* secure from the discrete logarithm in the
**algebraic group model**, a stronger idealization in which the adversary must explain
each group element it outputs. The claim thus rests on a tight proof in a strong
model, a loose one in a weaker model, and over thirty-five years without a better than
generic attack.

A Mars example shows why the loss sits in $q_H$, not $q_S$. Firmware for Arcadia
City's life-support controllers is signed on Earth and verified on Mars, where a round
trip of 6 to 44 minutes rules out asking the signer anything at install time. Signing
queries come only as fast as the key signs, a few updates a year; hash queries are
offline computation that no light delay limits, so $q_H$ grows with the attacker's
budget, as the analysis above assumes.

!!! note "Life story: the forking lemma"
    **Born:** 1996, David Pointcheval and Jacques Stern, "Security Proofs for Signature
    Schemes" (EUROCRYPT 1996) · **Purpose:** to prove that Fiat-Shamir signatures such
    as Schnorr's are unforgeable in the random-oracle model, by rewinding the forger ·
    **Helped:** proofs for Schnorr signatures, EdDSA, many identity-based and
    multisignature schemes; generalized by Bellare and Neven (2006) into a lemma about
    any algorithm · **Status:** the standard tool, with its $\varepsilon^2/q_H$ loss
    shown near-optimal for algebraic reductions (Seurin, 2012); rewinding a quantum
    adversary needs different techniques (Don, Fehr, Majenz and Schaffner, 2019)

## 19.11 The random-oracle model and its limits

*Level: expert.*

The Schnorr proof needed its hash to behave like a **random oracle**: a function chosen
uniformly from all functions, which everyone, adversary included, can only query.
Mihir Bellare and Phillip Rogaway made this a method in 1993: prove the scheme with an
oracle, then deploy it with a real hash. Book 1's
[Chapter 17](../../book/17-Defining-Security.md) introduces the model; here we look at
what it lets a proof do, and at the theorem that says it can fail.

### What the model gives a reduction

Because the reduction answers the queries, it gains three powers no real hash grants:

1. **It sees every query**, so a secret the adversary must hash is revealed (the proofs
   of OAEP and of the Fujisaki-Okamoto transform extract decryptions this way).
2. **It can program answers**, as the Schnorr signing simulation did.
3. **It can rewind with fresh answers**, as forking does. Against a fixed function like
   SHA-256, "the same forger with a different hash" is a different forger.

### Canetti, Goldreich and Halevi, in plain words

In 1998 Ran Canetti, Oded Goldreich and Shai Halevi showed that the method can fail:
some schemes are secure in the model and insecure with *every* real hash function.
Take any good signature scheme and change the signer: it first reads the message $m$
as a program $P$ and checks whether $P$ predicts the hash function, say whether $P$'s
output on some input equals the hash of that input. If so, it prints its secret key;
otherwise it signs as usual.

- **With a random oracle** the check essentially never passes. The program in the
  message was fixed before the oracle answered, and a fixed program agrees with a
  random function's $n$-bit output with probability $2^{-n}$. The modified scheme is
  as secure as the original.
- **With any real hash function** $h$, the attacker sends, as the message, the source
  code of $h$ itself. That program predicts $h$ perfectly, the check passes, and the
  key comes out.

The technical work goes into running the check in the signer's fixed time when the
program is long or slow (they use Silvio Micali's computationally sound proofs), but
the idea is the one above: a random oracle has no short description, and every real
hash function does.

Later results found the same gap elsewhere: Jesper Buus Nielsen (2002) for
non-interactive non-committing encryption, and Shafi Goldwasser and Yael Tauman Kalai
(2003) for the Fiat-Shamir transform, a story *Advanced protocols*
[chapter 6](../advanced/06-Sigma-Protocols-and-Fiat-Shamir.md) tells together with the
real Fiat-Shamir failures that came from hashing the wrong inputs.

### Why practice still uses it

Every counterexample is built to fail, with a trap that fires only when the hash
function is handed a description of itself, and no scheme designed for use has been
broken this way. A random-oracle proof is therefore read as a precise statement: *any
attack must use some property of the concrete hash function*. Generic attacks, which
treat the hash as a black box, are ruled out.

The alternatives cost a lot. Cramer-Shoup encryption (1998) is CCA-secure without
random oracles at about twice ElGamal's cost; RSA signatures without random oracles
(Ronald Cramer and Victor Shoup, 2000, under the strong RSA assumption) are slower and
rarely used. The schemes in daily use are proved in the model: RSA-PSS, RSA-OAEP,
EdDSA, and the Fujisaki-Okamoto transform that makes ML-KEM (FIPS 203) secure against
chosen ciphertexts.

Two refinements make the heuristic sharper. **Indifferentiability** (Ueli Maurer,
Renato Renner and Clemens Holenstein, 2004) says when a hash built from a smaller ideal
part can stand in for a random oracle; plain Merkle-Damgård, the design of SHA-256,
does not qualify because of length extension (Jean-Sébastien Coron and coauthors,
2005), while the sponge of SHA-3 does when its permutation is ideal (Guido Bertoni,
Joan Daemen, Michaël Peeters and Gilles Van Assche, 2008). The **quantum random-oracle
model** (Dan Boneh and coauthors, 2011) lets the adversary query the hash in
superposition, as a quantum computer could; seeing queries and rewinding both become
hard, and the Fujisaki-Okamoto variant in ML-KEM was chosen from those with proofs in
this model (Dennis Hofheinz, Kathrin Hövelmanns and Eike Kiltz, 2017, and later work).

The working rule: a random-oracle proof is much better than none, a standard-model
proof is better still, and the hash must be one no known attack exploits, fed inputs
encoded without
ambiguity.

## 19.12 Concrete security: what 128 bits costs

*Level: expert.*

"128-bit security" is the phrase every standard uses and few define. This section
prices it in gates, time, energy and memory, shows how memory can be traded for time,
and explains why defining a "bit of security" is a research problem of its own.

### Counting gates

The reference is exhaustive search for an AES-128 key, and a trial encryption is not
one operation. NIST's 2016 call for post-quantum proposals fixed its security
categories by gate counts, estimating AES-128 key search at about $2^{143}$ classical
gates, about $2^{15}$ per trial key:

| Category | Reference attack | Classical gates |
| --- | --- | --- |
| 1 | key search on AES-128 | $2^{143}$ |
| 2 | collision search on a 256-bit hash | $2^{146}$ |
| 3 | key search on AES-192 | $2^{207}$ |
| 4 | collision search on a 384-bit hash | $2^{210}$ |
| 5 | key search on AES-256 | $2^{272}$ |

A scheme's parameters must make its best known attack, in the same gates, cost at
least the reference. The call also bounded the *depth* of a quantum attack (MAXDEPTH,
$2^{40}$ to $2^{96}$ sequential gates): a search that must run for a millennium is no
threat.

### The size of $2^{128}$

At $10^{18}$ trials a second, far beyond any machine's rate for AES today, $2^{64}$
takes 18 seconds, $2^{80}$ two weeks, and $2^{128}$ about $10^{13}$ years, some 800
times the age of the universe. Bitcoin mining, probably the largest computation humans run,
passed $10^{21}$ double SHA-256 hashes a second in 2025; a year of it is about $2^{95}$
hashes, a factor of $2^{33}$ short of $2^{128}$.

Physics gives a floor too. By Landauer's principle, erasing a bit at temperature $T$
costs at least $kT \ln 2$, about $2.9 \times 10^{-21}$ J at room temperature. If each
of NIST's $2^{143}$ gates erased one bit, the search would need $3.2 \times 10^{22}$
J, about 53 years of the world's energy use (about $6 \times 10^{20}$ J a year).
Reversible computing could in principle sidestep the bound, so this is an
illustration, not a theorem. It also shows why 256-bit keys are not "twice as safe" in
practice: both sizes are out of reach of brute force, and the larger buys margin
against Grover's algorithm and analytic surprises.

### Memory is not free

Counting operations treats a memory access like an addition. For large attacks that
is false, and Michael Wiener (2004) proposed counting the **full cost**: the hardware
an attack occupies multiplied by the time it occupies it. Pollard's rho passes that
test, since parallel collision search with distinguished points (Paul van Oorschot and
Michael Wiener, 1999) needs almost no memory; the $2^{128}$ estimate for a 256-bit
curve is honest. Lattice sieves do not pass so easily: they run in time about
$2^{0.292\beta}$ for block size $\beta$ but need memory about $2^{0.2075\beta}$, and
how that memory is charged moves the security estimates of ML-KEM and ML-DSA by
several bits.

### Trading memory for time: Hellman's tables

Memory can also be *bought* to save time. Martin Hellman (1980) showed how to invert
any function $f$ on a space of size $N$, such as "encrypt a fixed plaintext under key
$k$", faster than exhaustive search after a one-time precomputation. Build **chains**:
from a random $x_0$, apply $f$, map the output back to the input space with a
reduction function $R$, and repeat $t$ times, storing only the two ends. To invert $y$,
apply $R$, then "$f$ then $R$" until a stored end appears, and rebuild that chain from
its start. Chains start to merge once $mt^2$ nears $N$, so Hellman uses $t$ tables of
$m$ chains with $mt^2 = N$, each with its own $R$. Memory is $M = mt$, online time
$T = t^2$, and

$$
T M^2 = t^2 \cdot m^2 t^2 = (m t^2)^2 = N^2 .
$$

At the balanced point $T = M = N^{2/3}$. For a 56-bit DES key that is about $2^{37}$
memory and $2^{37}$ time per key, after a $2^{56}$ precomputation; for $N = 2^{128}$
it is $2^{85.3}$ of each.

Philippe Oechslin's **rainbow tables** (2003) use a different reduction function in
every column of one table (Figure 19.8), so two chains merge only if they collide in
the *same* column, and one table does the work of Hellman's $t$. Oechslin's own
demonstration cracked almost every alphanumeric LAN Manager hash (the old, unsalted
Windows format) in seconds. Rainbow tables are why password hashing adds a random
**salt**: with a salt, one precomputation no longer serves all users.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="A rainbow table: three chains, each starting from a stored start point, alternating the function f with a reduction function that differs in every column, and ending at a stored end point; only the two ends of each chain are kept" fill="currentColor" font-size="14">
<g font-size="12" text-anchor="middle"><text x="50" y="22" font-weight="600">start (stored)</text><text x="590" y="22" font-weight="600">end (stored)</text><text x="200" y="22" fill-opacity=".7">column 1</text><text x="320" y="22" fill-opacity=".7">column 2</text><text x="460" y="22" fill-opacity=".7">column t</text></g>
<g id="rainbow-chain-19">
<rect x="20" y="40" width="60" height="30" rx="5" fill-opacity=".14" stroke="currentColor" stroke-width="1.5"/><rect x="560" y="40" width="60" height="30" rx="5" fill-opacity=".14" stroke="currentColor" stroke-width="1.5"/>
<circle cx="200" cy="55" r="14" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><circle cx="320" cy="55" r="14" fill="none" stroke="currentColor" stroke-dasharray="4 3"/>
<path d="M80 55 H182 M214 55 H302 M334 55 H390 M430 55 H556" stroke="currentColor" stroke-width="1.5"/>
<g font-size="12" text-anchor="middle"><text x="130" y="48">f, R₁</text><text x="258" y="48">f, R₂</text><text x="410" y="59">…</text><text x="495" y="48">f, Rₜ</text></g>
</g>
<use href="#rainbow-chain-19" y="60"/><use href="#rainbow-chain-19" y="120"/>
<g font-size="12" text-anchor="middle"><text x="50" y="60">x₀</text><text x="50" y="120">x₀′</text><text x="50" y="180">x₀″</text><text x="590" y="60">end</text><text x="590" y="120">end′</text><text x="590" y="180">end″</text>
<text x="320" y="218">middle points (dashed) are recomputed, never stored: memory m, coverage about m·t</text>
<text x="320" y="238" fill-opacity=".7">lookup of y: try each column j, apply R_j, run to the end, compare with stored ends</text></g>
</svg>
<figcaption>Figure 19.8. A rainbow table. Each chain alternates the target function f with a reduction function R that changes from column to column, so two chains merge only if they collide in the same column. Only the two ends of each chain are stored; everything in between is recomputed when a lookup hits.</figcaption>
</figure>

### Code it: a rainbow table

The function to invert is the first 20 bits of SHA-256 on a 20-bit input, so
$N = 2^{20}$. The table has $m = 8{,}000$ chains of length $t = 200$; the program then
inverts 100 random targets and compares the success rate with Oechslin's estimate
of the table's coverage.

```python
# A rainbow table (Oechslin, 2003) for a toy one-way function on 20-bit inputs.
import hashlib, random
from math import exp
rng = random.Random(1980)
N = 2 ** 20                                # the search space
t, m = 200, 8000                           # chain length and number of chains

def f(x):                                  # the function to invert: 20 bits of SHA-256
    return int.from_bytes(hashlib.sha256(x.to_bytes(3, "big")).digest()[:3], "big") % N

def R(i, y):                               # a different reduction in every column
    return (y + i) % N

table = {}
for _ in range(m):                         # precomputation: m * t evaluations of f
    start = x = rng.randrange(N)
    for i in range(t):
        x = R(i, f(x))
    table[x] = start                       # keep only (end, start)

def invert(y):
    work = 0
    for col in range(t - 1, -1, -1):       # guess y's column, latest first
        x = R(col, y)
        for i in range(col + 1, t):
            x, work = R(i, f(x)), work + 1
        if x in table:                     # rebuild that chain from its start
            z = table[x]
            for i in range(col):
                z, work = R(i, f(z)), work + 1
            if f(z) == y:
                return z, work + 1
    return None, work

found, works = 0, []
for _ in range(100):
    y = f(rng.randrange(N))
    z, w = invert(y)
    found += z is not None
    works.append(w)
mi, miss = m, 1.0
for i in range(t):                         # Oechslin's coverage estimate
    miss *= 1 - mi / N
    mi = N * (1 - exp(-mi / N))
print("stored", len(table), "of", N, "| found", found, "of 100 | predicted",
      round(100 * (1 - miss)), "| average work", sum(works) // len(works))
```

It prints:

```text
stored 4505 of 1048576 | found 70 of 100 | predicted 68 | average work 12064
```

Merging cut the 8,000 chains to 4,505 distinct endpoints, under half a percent of
the $2^{20}$ inputs, yet the table inverts 70 targets in 100, in line with the
predicted 68, at an average cost of about 12,000 evaluations of $f$ instead of the
half million that exhaustive search would average. The precomputation cost 1.6
million evaluations, more than one exhaustive search. That is the bargain: pay once,
then invert many targets cheaply.

### Free precomputation and other catches

The bargain has an awkward consequence. Security is usually defined as "every
algorithm of size $t$ has advantage at most $\varepsilon$", and an algorithm's size
counts its code, not the cost of writing it. A Hellman table for AES-128 *exists*, so
an algorithm of size and time about $2^{85}$ that finds AES keys exists, although
nobody can afford the $2^{128}$ precomputation that would write it down. Daniel J.
Bernstein and Tanja Lange (2013) collected such **non-uniform** attacks, on AES, NIST
P-256 and others, showing that under the textbook definition many "128-bit" claims are
false. The remedies, none universal, are to count precomputation, to require uniform
algorithms, or to say which cost a claim measures.

**Many targets** are another catch. Searching for *one* of $2^{k}$ keys that encrypt
a known block takes about $2^{128 - k}$ trials, comparing each guess against all
targets: with $2^{40}$ AES-128 users, about 88 bits. This is the multi-user loss of
§19.7 in its plainest form, and one reason AES-256 appears in designs with very many
keys.

### What is a bit of security?

The tightness discussion in §19.7 assumed that "$k$ bits of security" means that
every adversary has $t/\varepsilon \ge 2^k$. For search problems, such as recovering a
key, that works well: an attacker can trade success for time by guessing, and
$t/\varepsilon$ measures the expected cost of one success after repetition.

For decision problems it fails badly. Take a pseudorandom generator with an $n$-bit
seed and a parity of some output bits. Over the $2^n$ seeds it is a sum of $2^n$
values $\pm 1$, typically of size $2^{n/2}$, so some fixed parity has bias about
$2^{-n/2}$, and checking it is a constant-time distinguisher with that advantage. Under $t/\varepsilon$, every PRG with an $n$-bit
seed would have at most $n/2$ bits of security, which nobody believes: the attack
cannot be amplified into anything useful, and recovering the seed costs $2^n$.

Daniele Micciancio and Michael Walter (2018) proposed a definition that treats both
kinds alike: the adversary may answer "I don't know", and security measures how much
information about the secret its answers carry. The result is roughly $t/\varepsilon$
for search primitives and $t/\varepsilon^2$ for decision primitives, and the PRG gets
the $n$ bits it deserves, since $1/(2^{-n/2})^2 = 2^n$. The question is not settled;
later proposals measure the cost of winning with high probability and do not always
agree on the losses of standard reductions. Standards meanwhile state levels by the
best known attack on the primitive, and knowing which accounting a paper uses is part
of reading it.

## In the real world

- **Key sizes** are set from the best known algorithms' cost formulas, with margins
  (NIST SP 800-57, ECRYPT and BSI recommendations).
- **Security proofs** come with every modern standard: TLS 1.3, Signal's protocols,
  ML-KEM's Fujisaki-Okamoto transform. Their tightness, and the models they assume
  (random oracles, generic or algebraic groups), are part of what reviewers check.
  Ed25519's 128-bit rating rests on the best known attack, not on its loose
  forking-lemma proof (§19.10).
- **Salts** in every password-hashing standard exist to defeat Hellman-style
  precomputation (§19.12).
- **Assumption diversity** is policy: NIST chose HQC (codes) alongside ML-KEM
  (lattices) so that one mathematical surprise does not leave the world without a
  key-exchange standard.

## Going deeper

- *Fine-grained complexity* asks for exact exponents. The Strong Exponential Time
  Hypothesis (Russell Impagliazzo and Ramamohan Paturi, 2001) conjectures that $k$-SAT
  needs time close to $2^n$ as $k$ grows, and fine-grained cryptography (Marshall Ball,
  Alon Rosen, Manuel Sabin and Prashant Nalini Vasudevan, 2017) builds proofs of work
  on such bounds.
- *The generic group model* (Victor Shoup, 1997) proves lower bounds like $\sqrt{q}$
  for algorithms that use only group operations
  ([Chapter 7](07-Groups.md#78-the-generic-group-model-and-shoups-bound)). The
  *algebraic group model* (Georg Fuchsbauer, Eike Kiltz and Julian Loss, 2018) sits
  between it and the standard model, and is where Schnorr's tight proof lives.
- *Indistinguishability obfuscation* (Aayush Jain, Huijia Lin and Amit Sahai, 2021,
  from well-studied assumptions) would imply most of Cryptomania from a single
  primitive.
- *Interactive proofs and zero knowledge*: every NP statement has a zero-knowledge
  proof if one-way functions exist (Goldreich, Micali and Wigderson, 1986). See *Advanced protocols*
  [chapter 5](../advanced/05-Zero-Knowledge-Proofs.md).
- *Machine-checked proofs*: tools such as EasyCrypt and CryptoVerif check game-based
  proofs; *Protocols* [chapter 20](../protocols/20-Designing-and-Verifying-Protocols.md)
  covers protocol verification.

## Check yourself

??? question "1. Is an algorithm that runs in time $N$ to factor $N$ polynomial?"

    No: polynomial means polynomial in the number of bits $n = \log_2 N$, and $N =
    2^n$ is exponential in $n$.

??? question "2. Why would P = NP break every block cipher?"

    "Is there a key starting with these bits that maps these known plaintexts to these
    ciphertexts?" is an NP question; answering it for each bit in turn recovers the
    key in polynomial time.

??? question "3. In the 3-SAT to subset-sum table, why can a clause column with no true literal never reach its target digit, and why does the construction never carry?"

    The target digit is 3, and with no true literal only the two slacks add to that
    column, giving at most 2. A column holds at most five 1s, so its sum stays below
    10 and never carries.

??? question "4. Why is factoring unlikely to be NP-complete?"

    It is in NP ∩ coNP (factorizations and primality certificates can be verified),
    and an NP-complete problem in coNP would make NP = coNP.

??? question "5. In the parity-oracle attack, why does an even $2m \bmod N$ mean $m < N/2$?"

    If $m < N/2$, then $2m < N$ and $2m \bmod N = 2m$ is even. If $m > N/2$, then
    $2m \bmod N = 2m - N$, which is odd because $N$ is odd.

??? question "6. Why does random self-reducibility mean that a discrete-log group has no weak keys?"

    Any instance can be turned into a uniformly random one; if a fraction of random
    instances were easy, every instance would be easy. So either almost all keys are
    weak or none is.

??? question "7. In the ElGamal proof, where does the factor 2 come from, and why is there no factor for the number of hash queries or users?"

    From the convention $\mathrm{Adv} = |2\Pr[\text{win}] - 1|$: $\mathcal{B}$'s DDH
    advantage is $\Pr[W_0] - \frac12$, half the CPA advantage. There is no oracle to
    count and nothing to guess; for many users, re-randomizing one DDH triple into many
    keeps the bound free of those factors too.

??? question "8. The forking lemma gives a discrete-log solver with success about $\varepsilon^2/q_H$ in time $2t$. Why does that guarantee only about 64 bits for a 256-bit group?"

    Rho gives every solver $t'/\varepsilon' \ge 2^{128}$, so $2t\,q_H/\varepsilon^2 \ge
    2^{128}$. With $q_H$ as large as $t$, $t^2/\varepsilon^2 \ge 2^{127}$, that is
    $t/\varepsilon \ge 2^{63.5}$. The square from rerunning the forger halves the
    exponent.

??? question "9. In plain words, why is the Canetti-Goldreich-Halevi scheme secure with a random oracle but broken with every real hash function?"

    The signer gives away its key if the message is a program that predicts the hash.
    No short program predicts a random oracle except by luck; every real hash function
    is a short program, which the attacker sends as the message.

??? question "10. Hellman's trade-off satisfies $TM^2 = N^2$. What does it give for $N = 2^{128}$, and why is AES-128 still rated at 128 bits?"

    $T = M = N^{2/3} \approx 2^{85}$. But building the table costs about $2^{128}$,
    more than one exhaustive search, so it pays only when reused against many targets.
    The rating counts attacking one key from scratch, a choice that, as Bernstein and
    Lange showed, must be stated.

## What you learned

- Cost is measured in the bit length; polynomial is feasible, exponential is not,
  and subexponential $L_N[1/3]$ is why RSA keys are long.
- P ≠ NP is necessary for cryptography. A Karp reduction such as 3-SAT to subset sum
  transfers worst-case hardness, but its instances are special, not random.
- Cryptography needs average-case hardness with sampleable solutions; Ajtai's theorem
  gives lattices a worst-case bridge that factoring lacks.
- One-way functions give all of symmetric cryptography and signatures; public-key
  encryption needs trapdoors.
- Hard-core bits are as hard as the whole secret; one leaked RSA plaintext bit per
  query decrypts everything.
- Reductions have costs; tight ones preserve security, loose ones lose bits. ElGamal
  from DDH is tight, even for many users.
- The forking lemma proves Schnorr signatures with an $\varepsilon^2/q_H$ loss that
  halves a curve's proven bits; the deployed rating rests on the best known attack.
- Random-oracle proofs rule out generic attacks; only contrived schemes fail them.
- "128 bits" means about $2^{143}$ gates for AES-128; memory, precomputation and many
  targets change the price.
- The discrete log is random self-reducible; factoring is not known to be.
- The assumptions form families; Shor's algorithm breaks the number-theoretic ones,
  not lattices or codes.

**Next:** [Chapter 20](20-Quantum-Algorithms.md), the mathematics of quantum
algorithms: qubits, the quantum Fourier transform, Shor and Grover.

## Further reading

- Sanjeev Arora and Boaz Barak, *Computational Complexity: A Modern Approach*
  (Cambridge, 2009), chapters 1, 2 and 9.
- Stephen Cook, "The Complexity of Theorem-Proving Procedures", STOC 1971; Richard
  Karp, "Reducibility Among Combinatorial Problems", in *Complexity of Computer
  Computations* (Plenum, 1972).
- Leonid Levin, "Average Case Complete Problems", *SIAM Journal on Computing* 15
  (1986).
- Oded Goldreich, *Foundations of Cryptography*, volume 1 (Cambridge, 2001): one-way
  functions, hard-core predicates, pseudorandomness.
- Russell Impagliazzo, "A Personal View of Average-Case Complexity", IEEE Structure in
  Complexity Theory, 1995.
- Russell Impagliazzo and Steven Rudich, "Limits on the Provable Consequences of
  One-Way Permutations", STOC 1989.
- Miklós Ajtai, "Generating Hard Instances of Lattice Problems", STOC 1996; Daniele
  Micciancio and Oded Regev, "Worst-Case to Average-Case Reductions Based on Gaussian
  Measures", FOCS 2004.
- Dorit Aharonov and Oded Regev, "Lattice Problems in NP ∩ coNP", FOCS 2004;
  Daniele Micciancio, "The Shortest Vector Problem Is NP-Hard to Approximate to Within
  Some Constant", *SIAM Journal on Computing* 30 (2001).
- Oded Goldreich and Leonid Levin, "A Hard-Core Predicate for All One-Way Functions",
  STOC 1989.
- Werner Alexi, Benny Chor, Oded Goldreich and Claus-Peter Schnorr, "RSA and Rabin
  Functions: Certain Parts Are as Hard as the Whole", *SIAM Journal on Computing* 17
  (1988).
- Victor Shoup, "Sequences of Games: A Tool for Taming Complexity in Security Proofs",
  IACR ePrint 2004/332.
- Mihir Bellare, Alexandra Boldyreva and Silvio Micali, "Public-Key Encryption in a
  Multi-User Setting: Security Proofs and Improvements", EUROCRYPT 2000.
- Claus-Peter Schnorr, "Efficient Identification and Signatures for Smart Cards",
  CRYPTO 1989.
- David Pointcheval and Jacques Stern, "Security Proofs for Signature Schemes",
  EUROCRYPT 1996, and "Security Arguments for Digital Signatures and Blind
  Signatures", *Journal of Cryptology* 13 (2000).
- Mihir Bellare and Gregory Neven, "Multi-Signatures in the Plain Public-Key Model and
  a General Forking Lemma", ACM CCS 2006.
- Yannick Seurin, "On the Exact Security of Schnorr-Type Signatures in the Random
  Oracle Model", EUROCRYPT 2012.
- Georg Fuchsbauer, Eike Kiltz and Julian Loss, "The Algebraic Group Model and Its
  Applications", CRYPTO 2018; Georg Fuchsbauer, Antoine Plouviez and Yannick Seurin,
  "Blind Schnorr Signatures and Signed ElGamal Encryption in the Algebraic Group
  Model", EUROCRYPT 2020.
- Mihir Bellare and Phillip Rogaway, "Random Oracles Are Practical: A Paradigm for
  Designing Efficient Protocols", ACM CCS 1993.
- Ran Canetti, Oded Goldreich and Shai Halevi, "The Random Oracle Methodology,
  Revisited", STOC 1998 (*Journal of the ACM* 51, 2004).
- Jesper Buus Nielsen, "Separating Random Oracle Proofs from Complexity Theoretic
  Proofs: The Non-Committing Encryption Case", CRYPTO 2002.
- Ueli Maurer, Renato Renner and Clemens Holenstein, "Indifferentiability,
  Impossibility Results on Reductions, and Applications to the Random Oracle
  Methodology", TCC 2004; Jean-Sébastien Coron, Yevgeniy Dodis, Cécile Malinaud and
  Prashant Puniya, "Merkle-Damgård Revisited: How to Construct a Hash Function",
  CRYPTO 2005.
- Dan Boneh, Özgür Dagdelen, Marc Fischlin, Anja Lehmann, Christian Schaffner and Mark
  Zhandry, "Random Oracles in a Quantum World", ASIACRYPT 2011; Dennis Hofheinz,
  Kathrin Hövelmanns and Eike Kiltz, "A Modular Analysis of the Fujisaki-Okamoto
  Transformation", TCC 2017; Jelle Don, Serge Fehr, Christian Majenz and Christian
  Schaffner, "Security of the Fiat-Shamir Transformation in the Quantum
  Random-Oracle Model", CRYPTO 2019.
- NIST, "Submission Requirements and Evaluation Criteria for the Post-Quantum
  Cryptography Standardization Process" (call for proposals, 2016), section 4.A:
  the security categories and gate counts.
- Martin Hellman, "A Cryptanalytic Time-Memory Trade-Off", *IEEE Transactions on
  Information Theory* 26 (1980); Philippe Oechslin, "Making a Faster Cryptanalytic
  Time-Memory Trade-Off", CRYPTO 2003.
- Michael Wiener, "The Full Cost of Cryptanalytic Attacks", *Journal of Cryptology* 17
  (2004); Paul van Oorschot and Michael Wiener, "Parallel Collision Search with
  Cryptanalytic Applications", *Journal of Cryptology* 12 (1999).
- Daniel J. Bernstein and Tanja Lange, "Non-Uniform Cracks in the Concrete: The Power
  of Free Precomputation", ASIACRYPT 2013.
- Neal Koblitz and Alfred Menezes, "Another Look at 'Provable Security'", *Journal of
  Cryptology* 20 (2007), on reading reductions critically.
- Daniele Micciancio and Michael Walter, "On the Bit Security of Cryptographic
  Primitives", EUROCRYPT 2018.
- In *The cryptography book*: [Chapter 17](../../book/17-Defining-Security.md).
