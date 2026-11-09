# 10. Multi-Party Computation in Practice

*Chapter 9 let two parties compute any function of their secrets with
oblivious transfer and garbled circuits. This chapter goes from two parties to
many, and from theory to systems that have run on real farmers' bids, real
payrolls and real tax records. You will compute on XOR shares the way
Goldreich, Micali and Wigderson did in 1987, multiply Shamir shares and bring
the polynomial's degree back down as in BGW (1988), multiply additive shares by
hand with a Beaver triple, and catch a cheating party with the
information-theoretic MACs of SPDZ (2012). Then you will meet the deployments, the
frameworks people actually use and what they cost, and the shortcut many teams
take instead, trusted hardware, with the attacks that broke it. At the end,
three children's clinics, two on Earth and one in Arcadia City, compute the
average and the spread of their patients' heights without any clinic seeing
another's records.*

!!! abstract "In this chapter"
    **You will learn:**

    - why adding shared numbers is free and multiplying them is the whole
      difficulty of secure computation;
    - the GMW protocol: Boolean circuits on XOR shares, with oblivious transfer
      for every AND gate;
    - the BGW protocol: Shamir shares, free addition, and multiplication with
      degree reduction, secure with no hardness assumption when a majority is
      honest;
    - Beaver triples and the preprocessing model, worked by hand among three
      parties, and why a triple must never be used twice;
    - SPDZ and information-theoretic MACs, which catch a party who changes a
      share, even when all the other parties are dishonest;
    - the sugar beet auction, the Boston wage-gap study, Estonia's tax study,
      Private Join and Compute, threshold wallets and private measurement;
    - what the frameworks cost, and why trusted hardware such as Intel SGX is
      a shortcut with a long list of breaks.

    **You need:** [Chapter 1](01-Computing-With-Secrets.md) (trust models and
    the ideal-versus-real definition), [Chapter 2](02-Secret-Sharing.md)
    (additive and Shamir sharing, Lagrange interpolation), and
    [Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md) (oblivious
    transfer). Commitments from [Chapter 3](03-Commitments.md) appear in §10.6.
    Modular arithmetic and inverses are in
    [book 1, Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md); the
    one-section version of this chapter is
    [book 1, §23.6](../../book/23-Advanced-Protocols.md).

    **Levels:** §10.1 and §10.2 are for beginners, §10.3 to §10.10 are
    intermediate, §10.11 is expert.

## 10.1 The problem

*Level: beginner.*

Three children's hospitals want to know whether a new feeding program changes
how fast children grow. Each hospital has a few hundred records: age, height,
weight, the date the program started. Together they have enough children for a
clear answer; alone, none of them does. The obvious solution is to send all the
records to one place, a university or a government statistics office, and let
it compute. The obvious solution is also what the law, the ethics boards and
the parents forbid. Health records may leave a hospital only under strict
agreements, often not across borders at all, and every copy is one more place
from which they can leak. What the hospitals want is the answer, not each
other's data.

[Chapter 1](01-Computing-With-Secrets.md) gave this wish a precise form. Imagine
a perfectly trustworthy party, Trent, who takes everyone's inputs, computes the
function, hands out the answer and forgets everything. A protocol is secure if
whatever an attacker can learn or do against the real protocol, it could also
learn or do against Trent. Secure **multi-party computation** (MPC) is the art
of building protocols that meet this definition with no Trent at all: the
parties exchange messages among themselves, and at the end each holds the
output and nothing more.

[Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md) solved the problem
for two parties. Andrew Yao's garbled circuits let one party encrypt a whole
circuit, gate by gate, and the other evaluate it on labels it fetched by
oblivious transfer. Garbled circuits take a constant number of rounds, which is
their great strength. But they are built for two, and many real problems have
three, ten or a thousand parties. Going from two to many changes the problem in
two ways. It makes it harder, because every party may hold a piece of every
intermediate value and they all have to cooperate on every step. And it makes
it easier, because with many parties we can ask that only a minority be
dishonest, and under that assumption secure computation needs no hard problem
at all: no factoring, no discrete logarithms, nothing a quantum computer could
break.

The history has three acts. The first is theory. Yao posed the millionaires'
problem in 1982. In 1987 Oded Goldreich, Silvio Micali and Avi Wigderson showed
that *any* function of *any* number of parties' inputs can be computed
securely, assuming oblivious transfer exists, even if all but one party
conspire. A year later two papers at the same conference, one by Michael
Ben-Or, Shafi Goldwasser and Avi Wigderson (BGW), the other by David Chaum,
Claude Crépeau and Ivan Damgård (CCD), showed that if fewer than a third of the
parties cheat, every function can be computed with **perfect** security, using
nothing but polynomials over a finite field. In 1991 Donald Beaver showed that
most of the work can be done before the inputs even exist, with random
"multiplication triples". For the next fifteen years the field was rich in
theorems and poor in users: the protocols were believed to be thousands of
times too slow.

The second act is engineering. In the 2000s two research groups set out to
prove the skeptics wrong. At Aarhus University in Denmark, the SIMAP project
built a system for three servers holding Shamir shares, and in January 2008 it
cleared a national auction of contracts to grow sugar beets. In Estonia, Dan
Bogdanov and colleagues at the company Cybernetica built **Sharemind**, three
servers computing on additive shares, and used it for statistics on government
data. In 2012 Damgård, Valerio Pastro, Nigel Smart and Sarah Zakarias published
**SPDZ** (said "speedz"), which made computation secure against a dishonest
majority fast enough for real use by combining Beaver triples with message
authentication codes. Since then the protocols have improved by orders of
magnitude every few years, and open-source frameworks let a programmer write
the function in something like Python and choose the trust model as a
command-line switch.

The third act is deployment, and it is still going on: the Boston wage-gap
study (from 2015), Google's Private Join and Compute (2019), the analytics
behind COVID-19 exposure notifications (2020), the key custody of
cryptocurrency firms, and private advertising measurement. Alongside it runs a
competing story: instead of spreading trust among parties, put the computation
inside a sealed region of a processor and trust the chip maker. Intel shipped
that idea as SGX in 2015, and researchers spent the next five years showing how
to open the seal. Figure 10.1 shows the whole line.

<figure class="mars-fig">
<svg viewBox="0 0 640 418" width="640" role="img" aria-label="Timeline of multi-party computation from Yao's problem in 1982 to the ISO standard in 2024" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="410" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" text-anchor="end" font-weight="bold">1982</text>
<circle cx="92" cy="22" r="3.5"/>
<text x="108" y="27">Yao poses the millionaires' problem</text>
<text x="78" y="53" text-anchor="end" font-weight="bold">1987</text>
<circle cx="92" cy="48" r="3.5"/>
<text x="108" y="53">GMW: any function, any number of parties</text>
<text x="78" y="79" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="74" r="3.5"/>
<text x="108" y="79">BGW and CCD: perfect security, honest majority</text>
<text x="78" y="105" text-anchor="end" font-weight="bold">1991</text>
<circle cx="92" cy="100" r="3.5"/>
<text x="108" y="105">Beaver: multiplication triples made in advance</text>
<text x="78" y="131" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="126" r="5"/>
<text x="108" y="131">Danish sugar beet auction; Sharemind</text>
<text x="78" y="157" text-anchor="end" font-weight="bold">2012</text>
<circle cx="92" cy="152" r="3.5"/>
<text x="108" y="157">SPDZ: triples plus MACs, dishonest majority</text>
<text x="78" y="183" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="178" r="5"/>
<text x="108" y="183">Boston wage-gap data; Intel ships SGX</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="204" r="5"/>
<text x="108" y="209">Estonia's students-and-taxes study published</text>
<text x="78" y="235" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="230" r="3.5"/>
<text x="108" y="235">Prio: private statistics from two servers</text>
<text x="78" y="261" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="256" r="3.5" opacity="0.6"/>
<text x="108" y="261" opacity="0.75">Foreshadow reads SGX enclave memory</text>
<text x="78" y="287" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="282" r="5"/>
<text x="108" y="287">Private Join and Compute; Plundervolt</text>
<text x="78" y="313" text-anchor="end" font-weight="bold">2020</text>
<circle cx="92" cy="308" r="5"/>
<text x="108" y="313">Exposure-notification analytics; SGAxe</text>
<text x="78" y="339" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="334" r="3.5" opacity="0.6"/>
<text x="108" y="339" opacity="0.75">SGX deprecated on Intel's client processors</text>
<text x="78" y="365" text-anchor="end" font-weight="bold">2022</text>
<circle cx="92" cy="360" r="3.5"/>
<text x="108" y="365">Meta and Mozilla propose MPC ad measurement</text>
<text x="78" y="391" text-anchor="end" font-weight="bold">2024</text>
<circle cx="92" cy="386" r="3.5"/>
<text x="108" y="391">ISO/IEC 4922-2 standardizes MPC on shares</text>
</svg>
<figcaption>Figure 10.1. Multi-party computation from theorem to deployment. Large dots mark real deployments; faded entries mark the trusted-hardware shortcut and its breaks.</figcaption>
</figure>

This chapter follows the same order. §10.2 shows the one operation that makes
secure computation hard. §10.3 to §10.6 are four answers to it, each still in
use: GMW, BGW, Beaver triples and SPDZ. §10.7 is about cost and the frameworks,
§10.8 about the deployments, §10.9 about trusted hardware, and §10.10 is the
Mars example. The definitions of semi-honest and malicious parties, honest and
dishonest majorities, and security with abort are in
[§1.4](01-Computing-With-Secrets.md) and are used here without repeating them.

## 10.2 Computing on shares: the one hard gate

*Level: beginner.*

Every protocol in this chapter follows the same plan. Each party splits its
input into **shares** and sends one share to each party, so that no small
group of parties learns anything about any input
([Chapter 2](02-Secret-Sharing.md)). The function to compute is written as a
**circuit**: a network of addition and multiplication gates over a finite
field $\mathbb{F}_p$, or of XOR and AND gates over bits, which is the same thing
with $p = 2$. The parties walk through the circuit gate by gate. For every wire
they hold shares of the value on that wire, never the value itself. At the end
they open the shares of the output wires, and only those.

So everything comes down to two questions: given shares of $x$ and $y$, how do
the parties get shares of $x + y$, and how do they get shares of $x \cdot y$?

### Addition is free

Take three parties and additive sharing modulo the prime $p = 101$. A value
$x$ is shared as three numbers $x_1, x_2, x_3$ with
$x_1 + x_2 + x_3 \equiv x \pmod{101}$, party $i$ holding $x_i$. Let

| | Party 1 | Party 2 | Party 3 | Sum mod 101 |
|---|---|---|---|---|
| $x$ | 40 | 75 | 9 | 124 ≡ **23** |
| $y$ | 60 | 50 | 10 | 120 ≡ **19** |

Suppose the circuit asks for $3x + 2y + 7$. Each party computes
$3x_i + 2y_i$ on its own, and party 1 alone adds the public 7:

- party 1: $3 \cdot 40 + 2 \cdot 60 + 7 = 247 \equiv 45$;
- party 2: $3 \cdot 75 + 2 \cdot 50 = 325 \equiv 22$;
- party 3: $3 \cdot 9 + 2 \cdot 10 = 47$.

The new shares add to $45 + 22 + 47 = 114 \equiv 13$, and indeed
$3 \cdot 23 + 2 \cdot 19 + 7 = 114 \equiv 13$. No party sent a single message.
The reason is that sharing is **linear**: the sum of the shares of a linear
combination is the same linear combination of the sums. Any number of
additions, subtractions and multiplications by public constants costs nothing
but local arithmetic. ([§2.2](02-Secret-Sharing.md) made the same observation;
here it is the engine.) Shamir shares, which are values of a polynomial, are
linear in the same way: adding two polynomials adds their values at every
point.

### Multiplication is not

Now the circuit asks for $x \cdot y$. Write the product of the sums out:

$$
\begin{aligned}
x \cdot y &= (x_1 + x_2 + x_3)(y_1 + y_2 + y_3) \\
&= x_1y_1 + x_2y_2 + x_3y_3 \\
&\quad + x_1y_2 + x_2y_1 + x_1y_3 + x_3y_1 + x_2y_3 + x_3y_2 .
\end{aligned}
$$

There are nine terms. Party 1 can compute $x_1 y_1 = 40 \cdot 60$, party 2 can
compute $x_2 y_2$, party 3 can compute $x_3 y_3$. The other six **cross terms**
each mix two parties' shares, and nobody holds both. If party 1 simply sent
$x_1$ to party 2, party 2 would hold two of the three shares of $x$, which is
fine against party 2 alone but fatal if party 2 and party 3 collude: they would
then hold all three. With $n$ parties there are $n^2$ terms and only $n$ are
local.

Every protocol in this chapter is, at bottom, a way of computing those cross
terms, or a way around them, without anyone seeing a share that is not theirs.
There are three classic answers.

1. **Oblivious transfer** (GMW, §10.3). Party 1 offers party 2 a small table of
   masked answers, one for each value party 2's share could take, and party 2
   picks its row by oblivious transfer, so neither learns the other's share.
2. **Polynomial degree** (BGW, §10.4). With Shamir shares, each party
   multiplies its two shares locally. The result is a share of the product on
   a polynomial of twice the degree, and one round of resharing brings the
   degree back down. This needs an honest majority.
3. **Correlated randomness** (Beaver, §10.5). Before the computation, the
   parties obtain shares of random $a$, $b$ and $c = ab$. During the computation
   a multiplication costs only opening two masked values. SPDZ (§10.6) adds MACs
   so that a cheater is caught.

Two numbers describe the cost of any of them. **Communication** is how many
bits each multiplication makes the parties send. **Rounds** are how many times
the parties must wait for each other. Additions cost neither, and
multiplications on the same layer of the circuit can share a round, so the
number of rounds is the circuit's **multiplicative depth**: the largest number
of multiplication gates on any path from an input to an output. On a fast
local network the bits matter most; between data centers on different
continents, or between Earth and Mars, the rounds do.

## 10.3 GMW: Boolean circuits on XOR shares

*Level: intermediate.*

In 1987 Goldreich, Micali and Wigderson published "How to Play Any Mental
Game". Its first half answers the question of this chapter for parties who
follow the rules: any function, written as a Boolean circuit, can be computed
on XOR shares, with oblivious transfer for the AND gates. Its second half is
the compiler of [Chapter 5](05-Zero-Knowledge-Proofs.md), which forces cheaters
to follow the rules by making them prove every message in zero knowledge. The
first half is what people still run.

### XOR is free, AND needs a table

Each bit $x$ is split into XOR shares: $x = x_1 \oplus x_2 \oplus \cdots \oplus x_n$,
all but one share random. XOR is addition modulo 2, so an XOR gate is free:
each party XORs its own two shares. NOT is free too: one party flips its share.
AND is multiplication modulo 2, and the cross terms of §10.2 are back.

Take two parties, Alice and Bob. Alice holds shares $x_A$ and $y_A$, Bob holds
$x_B$ and $y_B$, and they want shares of

$$
z = x \wedge y = (x_A \oplus x_B) \wedge (y_A \oplus y_B).
$$

Bob's two share bits can take only four values. So Alice, who does not know
them, prepares the answer for all four. She picks a fresh random bit $r$, which
will be her own share of $z$, and fills a table with four rows, one for each
possible pair $(x_B, y_B)$:

$$
T[x_B, y_B] = r \oplus \big( (x_A \oplus x_B) \wedge (y_A \oplus y_B) \big).
$$

Bob fetches the one row that matches his real shares by **1-out-of-4
oblivious transfer** ([Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md)),
and the row he gets is his share of $z$. By construction $r \oplus T[x_B, y_B] = z$.

### By hand: one AND gate

Let $x = 1$, shared as $x_A = 0$, $x_B = 1$, and $y = 1$, shared as $y_A = 1$,
$y_B = 0$. Alice picks $r = 1$ and fills her table:

| Bob's $(x_B, y_B)$ | $x_A \oplus x_B$ | $y_A \oplus y_B$ | AND | row $= r \oplus$ AND |
|---|---|---|---|---|
| (0, 0) | 0 | 1 | 0 | 1 |
| (0, 1) | 0 | 0 | 0 | 1 |
| (1, 0) | 1 | 1 | 1 | **0** |
| (1, 1) | 1 | 0 | 0 | 1 |

Bob's real shares are $(1, 0)$, so he obtains the third row, 0. Alice's share
is $r = 1$ and Bob's is 0, and $1 \oplus 0 = 1 = x \wedge y$. Figure 10.2 shows
the exchange.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A GMW AND gate: Alice builds a four-row table masked with r, Bob picks one row by oblivious transfer" fill="currentColor" font-size="14">
<rect x="10" y="20" width="230" height="200" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="125" y="44" text-anchor="middle" font-weight="bold">Alice</text>
<text x="125" y="66" text-anchor="middle">shares 0 and 1, mask r = 1</text>
<text x="40" y="96">Bob's (xB, yB)</text>
<text x="200" y="96" text-anchor="middle">row</text>
<line x1="30" y1="104" x2="220" y2="104" stroke="currentColor" stroke-width="1"/>
<text x="70" y="126" text-anchor="middle">0 0</text>
<text x="200" y="126" text-anchor="middle">1</text>
<text x="70" y="150" text-anchor="middle">0 1</text>
<text x="200" y="150" text-anchor="middle">1</text>
<rect x="30" y="158" width="190" height="24" rx="3" fill="currentColor" opacity="0.15"/>
<text x="70" y="175" text-anchor="middle" font-weight="bold">1 0</text>
<text x="200" y="175" text-anchor="middle" font-weight="bold">0</text>
<text x="70" y="200" text-anchor="middle">1 1</text>
<text x="200" y="200" text-anchor="middle">1</text>
<rect x="270" y="90" width="100" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="120" text-anchor="middle">1-of-4</text>
<text x="320" y="140" text-anchor="middle">OT</text>
<line x1="240" y1="125" x2="264" y2="125" stroke="currentColor" stroke-width="1.5"/>
<polygon points="270,125 262,121 262,129"/>
<rect x="400" y="20" width="230" height="200" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="515" y="44" text-anchor="middle" font-weight="bold">Bob</text>
<text x="515" y="66" text-anchor="middle">shares xB = 1, yB = 0</text>
<text x="515" y="110" text-anchor="middle">asks for row (1, 0)</text>
<text x="515" y="170" text-anchor="middle">receives 0</text>
<line x1="400" y1="105" x2="376" y2="105" stroke="currentColor" stroke-width="1.5"/>
<polygon points="370,105 378,101 378,109"/>
<line x1="370" y1="148" x2="394" y2="160" stroke="currentColor" stroke-width="1.5"/>
<polygon points="400,163 391,163 395,156"/>
<text x="320" y="256" text-anchor="middle">Alice's share of z: r = 1     Bob's share of z: 0</text>
<text x="320" y="282" text-anchor="middle">z = 1 XOR 0 = 1 = x AND y; Alice never learns which row Bob took</text>
</svg>
<figcaption>Figure 10.2. One AND gate in GMW. Alice prepares the answer for every value Bob's shares could have, masked with her random share r; oblivious transfer gives Bob exactly one row and tells Alice nothing.</figcaption>
</figure>

**Why it is secure.** Alice learns nothing, because oblivious transfer hides
Bob's choice. Bob learns one row, which is the true $z$ XORed with Alice's
random $r$: a uniformly random bit, whatever $x$ and $y$ are. The other three
rows, which would tell him about Alice's shares, stay hidden by the oblivious
transfer. And the output shares are again a fresh XOR sharing of $z$, ready for
the next gate.

### Many parties

With $n$ parties the local terms $x_i \wedge y_i$ are computed alone, and every
pair of parties $i < j$ handles its two cross terms
$x_i y_j \oplus x_j y_i$ with the same trick: party $i$ picks a mask $r$ and
offers a four-row table indexed by party $j$'s two share bits. So an AND gate
costs $n(n-1)/2$ oblivious transfers. With OT extension
([Chapter 9](09-Oblivious-Transfer-and-Garbled-Circuits.md)) a transfer costs a
few hash calls and a few bytes, so an AND gate is cheap in computation. What
it is not is fast in rounds: an AND gate needs the shares of its inputs, so
gates must be evaluated layer by layer, and the number of rounds is the circuit's
AND depth. A 64-bit comparison done bit by bit has an AND depth of about 64; a
tree-shaped circuit brings it down to about $\log_2 64 = 6$.

### Code it

Three parties each hold one vote, 0 or 1, and want the majority without
revealing any vote. The majority of three bits is
$ab \oplus ac \oplus bc$: three AND gates and two XOR gates. The oblivious
transfer is an ideal function here, a stand-in for the Diffie-Hellman
transfer coded in Chapter 9.

```python
import random

random.seed(10)                      # random is for the demo; real shares use secrets
N = 3                                # three parties
ot_calls = 0

def share(bit):
    """Split a bit into N XOR shares."""
    s = [random.randrange(2) for _ in range(N - 1)]
    last = bit
    for b in s:
        last ^= b
    return s + [last]

def reveal(shares):
    out = 0
    for b in shares:
        out ^= b
    return out

def ot4(table, choice):
    """Ideal 1-out-of-4 oblivious transfer (Chapter 9 builds a real one)."""
    global ot_calls
    ot_calls += 1
    return table[choice]

def xor_gate(x, y):                  # free: each party works alone
    return [a ^ b for a, b in zip(x, y)]

def and_gate(x, y):
    z = [x[i] & y[i] for i in range(N)]          # the x_i y_i terms, local
    for i in range(N):
        for j in range(i + 1, N):
            r = random.randrange(2)               # party i's fresh mask
            # party i fills a table for every possible (x_j, y_j) of party j
            table = [r ^ (x[i] & yj) ^ (xj & y[i]) for xj in (0, 1) for yj in (0, 1)]
            got = ot4(table, 2 * x[j] + y[j])    # party j picks its row, learns one bit
            z[i] ^= r
            z[j] ^= got
    return z

def majority(a, b, c):               # maj = ab xor ac xor bc
    return xor_gate(xor_gate(and_gate(a, b), and_gate(a, c)), and_gate(b, c))

for votes in [(0, 0, 1), (1, 0, 1), (1, 1, 1)]:
    ot_calls = 0
    shared = [share(v) for v in votes]           # each party shares its own vote
    out = majority(*shared)
    print(votes, "-> majority", reveal(out), " output shares", out, " OTs:", ot_calls)
```

Output:

```
(0, 0, 1) -> majority 0  output shares [1, 0, 1]  OTs: 9
(1, 0, 1) -> majority 1  output shares [0, 0, 1]  OTs: 9
(1, 1, 1) -> majority 1  output shares [0, 1, 0]  OTs: 9
```

The output shares look random and differ from run to run; only their XOR is the
answer. Each party saw nothing but random bits: its own shares, the masks it
chose, and the masked rows it fetched.

### Where GMW is used, and its limits

Against a semi-honest adversary GMW is secure even if $n - 1$ of the $n$
parties collude, because every cross term is protected by oblivious transfer,
not by a majority. That makes it the natural choice for two parties or for a
dishonest majority of a few parties on a fast network. The ABY framework
(Daniel Demmler, Thomas Schneider and Michael Zohner, 2015) mixes GMW-style
Boolean sharing with arithmetic sharing and garbled circuits, converting
between them so that additions run on arithmetic shares and comparisons on
Boolean ones; its successor MOTION extends the idea to many parties. When the
parties are far apart, garbled circuits, with their constant number of rounds,
usually win.

Against a malicious adversary, plain GMW fails silently: a party can send a
wrong table and flip any AND gate it likes. The compiler in the second half of
the paper fixes that in principle; in practice, the MAC technique of §10.6,
applied to bits (TinyOT, by Jesper Buus Nielsen and colleagues, 2012), is what
people use.

!!! note "Life story: the GMW protocol"
    **Born:** 1987, Oded Goldreich, Silvio Micali and Avi Wigderson, "How to
    Play Any Mental Game" (STOC 1987) · **Purpose:** to show that every
    function of every number of parties can be computed securely, given
    oblivious transfer, even if all but one party conspire · **Helped:** the
    founding theorem of the field; the GMW compiler from semi-honest to
    malicious security; Boolean sharing in ABY and MOTION · **Status:**
    current, as a protocol for Boolean circuits on fast networks and as the theoretical baseline

## 10.4 BGW: honest majority and Shamir shares

*Level: intermediate.*

GMW pays for its strong protection with public-key machinery: oblivious
transfer cannot be built from nothing. In 1988 two teams asked what happens if
the adversary controls only a minority of the parties. Ben-Or, Goldwasser and
Wigderson, and independently Chaum, Crépeau and Damgård, found that the answer
is remarkable: with private channels between the parties, every function can
be computed with **perfect** security, against an adversary with unlimited
computing power, using only Shamir's polynomials. Against semi-honest parties
the protocol needs $t < n/2$ corrupted parties; against malicious ones,
$t < n/3$.

### Addition on Shamir shares

A value $x$ is shared with a random polynomial $f$ of degree $t$ over
$\mathbb{F}_p$ with $f(0) = x$; party $i$ holds $f(i)$
([§2.3](02-Secret-Sharing.md)). Any $t + 1$ parties can interpolate $f$ and read
$x$; any $t$ learn nothing. If $y$ is shared with $g$, then party $i$'s
$f(i) + g(i)$ is the value at $i$ of $f + g$, which has degree $t$ and constant
term $x + y$. Addition is free, as promised.

### Multiplication doubles the degree

Party $i$ can also multiply: $f(i) \cdot g(i)$ is the value at $i$ of
$h = f \cdot g$, and $h(0) = x \cdot y$. So after one local multiplication the
parties hold shares of the product. But $h$ has degree $2t$, so it takes
$2t + 1$ parties to interpolate it, and after a second multiplication the
degree would be $4t$. Two things must be fixed. The degree must come back down
to $t$, and the new polynomial must be random apart from its constant term,
because $h = fg$ is not a random polynomial (it factors, which can leak).

The fix, in the form Rosario Gennaro, Michael Rabin and Tal Rabin gave it in
1998, takes one round. Because $h$ has degree $2t$ and $n \ge 2t + 1$, the
secret is a fixed linear combination of the parties' products:

$$
x y = h(0) = \sum_{i=1}^{2t+1} \lambda_i \, h(i),
$$

where the $\lambda_i$ are the Lagrange coefficients for evaluating at 0. So:

1. Each party $i$ computes $h_i = f(i) g(i)$ and **reshares** it: it picks a
   fresh random polynomial $q_i$ of degree $t$ with $q_i(0) = h_i$ and sends
   $q_i(j)$ to each party $j$.
2. Each party $j$ computes its new share $z_j = \sum_i \lambda_i \, q_i(j)$.

The new shares lie on $Q = \sum_i \lambda_i q_i$, a polynomial of degree $t$
(a combination of degree-$t$ polynomials) with
$Q(0) = \sum_i \lambda_i h_i = xy$. And $Q$ is random apart from that constant
term, because each $q_i$ was. Privacy holds because every message is a share
of a degree-$t$ sharing, and any $t$ parties see only $t$ points of each, which
say nothing ([§2.3](02-Secret-Sharing.md)). Every step needs $2t + 1$ honest
evaluations of $h$, which is where the honest majority comes in.

### By hand: three parties over GF(13)

Take $n = 3$, $t = 1$ and $p = 13$. For the points 1, 2, 3, the Lagrange
coefficients at zero are

$$
\lambda_1 = \frac{(0-2)(0-3)}{(1-2)(1-3)} = 3, \quad
\lambda_2 = \frac{(0-1)(0-3)}{(2-1)(2-3)} = -3, \quad
\lambda_3 = \frac{(0-1)(0-2)}{(3-1)(3-2)} = 1,
$$

so $h(0) = 3h(1) - 3h(2) + h(3)$ for every polynomial of degree at most 2, in
any field. Share $x = 4$ with $f(z) = 4 + 2z$ and $y = 5$ with $g(z) = 5 + 3z$:

| | Party 1 | Party 2 | Party 3 |
|---|---|---|---|
| $f(i)$, shares of $x = 4$ | 6 | 8 | 10 |
| $g(i)$, shares of $y = 5$ | 8 | 11 | 14 ≡ 1 |
| $h_i = f(i)g(i) \bmod 13$ | 48 ≡ 9 | 88 ≡ 10 | 10 |

Check: $3 \cdot 9 - 3 \cdot 10 + 10 = 7$, and $4 \cdot 5 = 20 \equiv 7$. The
product is there, but on a parabola, $h(z) = 7 + 9z + 6z^2$. Two parties alone
would draw the wrong line through their two points and get a wrong answer.

Now each party reshares its $h_i$ on a fresh line. Party 1 uses
$q_1(z) = 9 + 5z$, party 2 uses $q_2(z) = 10 + z$, party 3 uses
$q_3(z) = 10 + 8z$:

| Sent to | Party 1 | Party 2 | Party 3 |
|---|---|---|---|
| from party 1: $q_1(j)$ | 14 ≡ 1 | 19 ≡ 6 | 24 ≡ 11 |
| from party 2: $q_2(j)$ | 11 | 12 | 13 ≡ 0 |
| from party 3: $q_3(j)$ | 18 ≡ 5 | 26 ≡ 0 | 34 ≡ 8 |
| new share $3q_1 - 3q_2 + q_3$ | $3 - 33 + 5 \equiv 1$ | $18 - 36 + 0 \equiv 8$ | $33 - 0 + 8 \equiv 2$ |

The new shares 1, 8, 2 lie on the line $7 + 7z$: from $(1, 1)$ and $(2, 8)$ the
slope is 7 and the intercept $1 - 7 \equiv 7$, and at $z = 3$ the line gives
$7 + 21 = 28 \equiv 2$. Any two parties now recover $7 = 20 \bmod 13$, and the
sharing is ready for the next multiplication. Figure 10.3 shows the three
stages.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="BGW multiplication: degree-1 shares, local products of degree 2, resharing back to degree 1" fill="currentColor" font-size="14">
<rect x="8" y="20" width="190" height="130" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="103" y="44" text-anchor="middle" font-weight="bold">inputs: degree 1</text>
<text x="103" y="74" text-anchor="middle">x = 4: 6, 8, 10</text>
<text x="103" y="98" text-anchor="middle">y = 5: 8, 11, 1</text>
<text x="103" y="130" text-anchor="middle" opacity="0.75">any 2 parties rebuild</text>
<line x1="198" y1="85" x2="216" y2="85" stroke="currentColor" stroke-width="1.5"/>
<polygon points="223,85 215,81 215,89"/>
<rect x="225" y="20" width="190" height="130" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="44" text-anchor="middle" font-weight="bold">products: degree 2</text>
<text x="320" y="74" text-anchor="middle">h: 9, 10, 10</text>
<text x="320" y="98" text-anchor="middle">h(0) = 7 = 20 mod 13</text>
<text x="320" y="130" text-anchor="middle" opacity="0.75">needs all 3 parties</text>
<line x1="415" y1="85" x2="433" y2="85" stroke="currentColor" stroke-width="1.5"/>
<polygon points="440,85 432,81 432,89"/>
<rect x="442" y="20" width="190" height="130" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="537" y="44" text-anchor="middle" font-weight="bold">reduced: degree 1</text>
<text x="537" y="74" text-anchor="middle">z: 1, 8, 2</text>
<text x="537" y="98" text-anchor="middle">on the line 7 + 7z</text>
<text x="537" y="130" text-anchor="middle" opacity="0.75">any 2 parties rebuild</text>
<text x="210" y="182" text-anchor="middle">multiply locally</text>
<text x="210" y="202" text-anchor="middle" opacity="0.75">no messages</text>
<text x="430" y="182" text-anchor="middle">reshare, combine with (3, -3, 1)</text>
<text x="430" y="202" text-anchor="middle" opacity="0.75">one round of messages</text>
</svg>
<figcaption>Figure 10.3. Multiplication in BGW with three parties over GF(13). The local products sit on a parabola that only all three parties together can read; one round of resharing puts the product back on a fresh random line.</figcaption>
</figure>

### Code it

The same protocol with random polynomials, checked by rebuilding from every
pair of parties and by running a second multiplication on the result.

```python
import random

random.seed(4)                       # random is for the demo; real shares use secrets
P = 13                               # a tiny prime field; real systems use 61 to 128 bits
N, T = 3, 1                          # three parties, any one may be corrupted

def share(secret, t=T):
    """Shamir: a random polynomial of degree t with f(0) = secret; party i gets f(i)."""
    coeffs = [secret] + [random.randrange(P) for _ in range(t)]
    return [sum(c * i**k for k, c in enumerate(coeffs)) % P for i in range(1, N + 1)]

def lagrange_at_zero(points):
    """Coefficients l_i with f(0) = sum l_i f(i) for any f of degree < len(points)."""
    lams = []
    for i in points:
        num = den = 1
        for j in points:
            if j != i:
                num = num * (-j) % P
                den = den * (i - j) % P
        lams.append(num * pow(den, P - 2, P) % P)
    return lams

def reconstruct(shares, who):
    lams = lagrange_at_zero(who)
    return sum(l * shares[i - 1] for l, i in zip(lams, who)) % P

def multiply(x, y):
    h = [a * b % P for a, b in zip(x, y)]      # local: degree 2t shares of x*y
    sub = [share(hi) for hi in h]              # party i reshares h_i at degree t
    lam = lagrange_at_zero(range(1, N + 1))    # (3, -3, 1) for points 1, 2, 3
    return [sum(lam[i] * sub[i][j] for i in range(N)) % P for j in range(N)], h

print("Lagrange coefficients at 0 for 1,2,3:", lagrange_at_zero([1, 2, 3]))
x, y = share(4), share(5)
print("shares of x = 4:", x, " shares of y = 5:", y)
z, h = multiply(x, y)
print("local products h_i:", h, "-> all three give", reconstruct(h, [1, 2, 3]),
      "but parties 1,2 alone give", reconstruct(h, [1, 2]))
print("after degree reduction:", z)
for pair in ([1, 2], [1, 3], [2, 3]):
    print("  parties", pair, "rebuild", reconstruct(z, pair))
w = share(6)
v, _ = multiply(z, w)                          # a second multiplication on the result
print("(4*5)*6 mod 13 =", 4 * 5 * 6 % P, " BGW gives", reconstruct(v, [2, 3]))
```

Output:

```
Lagrange coefficients at 0 for 1,2,3: [3, 10, 1]
shares of x = 4: [7, 10, 0]  shares of y = 5: [9, 0, 4]
local products h_i: [11, 0, 0] -> all three give 7 but parties 1,2 alone give 9
after degree reduction: [9, 11, 0]
  parties [1, 2] rebuild 7
  parties [1, 3] rebuild 7
  parties [2, 3] rebuild 7
(4*5)*6 mod 13 = 3  BGW gives 3
```

The coefficient 10 is $-3$ modulo 13. A real deployment uses a prime of 61 bits
or more, so that the values being computed fit without wrapping around.

### Against cheaters: a third, not a half

If a corrupted party sends wrong subshares, the honest parties compute garbage.
To stop that, BGW for malicious parties uses verifiable secret sharing without
hard problems ([§2.12](02-Secret-Sharing.md)) and treats the vector of shares as
a **Reed-Solomon codeword**: $n$ values of a polynomial of degree $t$ can be
corrected even if up to $(n - t - 1)/2$ of them are wrong
([Mathematics, Chapter 18](../mathematics/18-Error-Correcting-Codes.md)). With
$n \ge 3t + 1$ the honest parties can always decode around the liars, so the
computation finishes with the right answer: not just security with abort, but
**guaranteed output delivery**. Tal Rabin and Ben-Or reached $t < n/2$ in 1989
with a broadcast channel and a tiny error probability.

The original 1988 paper sketched its proofs. In 2011 Gilad Asharov and Yehuda
Lindell published a full proof of the BGW protocol, a long paper, and found that
against malicious parties with $n/4 \le t < n/3$ the multiplication step
seemed to need a new subprotocol that the sketch had not given. Simple
protocols are not always simple to prove.

**What BGW buys.** No computational assumption at all, so no quantum computer
can break the privacy of a run, today or decades later. Each multiplication
sends $n$ field elements from each party, and additions are free. The cost is
the assumption itself: if a majority colludes, they can rebuild every input,
and nothing in the protocol will notice. Honest-majority protocols based on
Shamir sharing ran the Danish sugar beet auction (§10.8), and the same Aarhus
group's Python framework VIFF and Berry Schoenmakers's MPyC let students run
them today.

!!! note "Life story: BGW and CCD"
    **Born:** 1988, Michael Ben-Or, Shafi Goldwasser and Avi Wigderson, and
    independently David Chaum, Claude Crépeau and Ivan Damgård, both at STOC
    1988 · **Purpose:** to compute any function securely with no hardness
    assumption, given private channels and an honest majority (a two-thirds
    majority against active cheaters) · **Helped:** the sugar beet auction and
    most honest-majority systems since; the simplified degree reduction of
    Gennaro, Rabin and Rabin (1998); a full proof by Asharov and Lindell
    (2011) · **Status:** current; the reference protocol for perfect,
    quantum-proof secure computation

## 10.5 Beaver triples and the preprocessing model

*Level: intermediate.*

In 1991 Donald Beaver noticed that the expensive part of a multiplication does
not depend on the inputs at all. The parties can prepare, long before anyone
knows what will be multiplied, a stock of random **multiplication triples**:
shares of random $a$ and $b$ and of their product $c = ab$. During the
computation, each multiplication consumes one triple and costs only the
opening of two masked numbers.

### The trick

To multiply shared $x$ and $y$ with a triple $[a], [b], [c]$ (square brackets
mean "shared among the parties"):

1. Each party computes its share of $x - a$ and of $y - b$, locally.
2. The parties open both: everyone learns $d = x - a$ and $e = y - b$.
3. Each party computes its share of
   $$
   z = c + d\,b + e\,a + d\,e,
   $$
   with only one party adding the public term $de$.

It is correct because $x = d + a$ and $y = e + b$, so

$$
\begin{aligned}
x y &= (d + a)(e + b) \\
&= de + d\,b + e\,a + ab \\
&= de + d\,b + e\,a + c .
\end{aligned}
$$

Every term on the right is either public ($de$), a public number times a
shared value ($d\,b$ and $e\,a$, free by linearity) or shared already ($c$).
It is private because $a$ and $b$ are uniformly random and used once: $d = x - a$
is $x$ encrypted with a one-time pad modulo $p$, and says nothing about $x$.

### By hand: three parties, mod 101

Use the shares of $x = 23$ and $y = 19$ from §10.2 and a triple with $a = 31$,
$b = 8$, $c = 248 \bmod 101 = 46$:

| | Party 1 | Party 2 | Party 3 | Sum mod 101 |
|---|---|---|---|---|
| $x$ | 40 | 75 | 9 | 23 |
| $y$ | 60 | 50 | 10 | 19 |
| $a$ | 10 | 90 | 32 | 31 |
| $b$ | 70 | 20 | 19 | 8 |
| $c$ | 5 | 30 | 11 | 46 |
| $x_i - a_i$, broadcast | 30 | $-15 \equiv 86$ | $-23 \equiv 78$ | $d = 93 \equiv -8$ |
| $y_i - b_i$, broadcast | $-10 \equiv 91$ | 30 | $-9 \equiv 92$ | $e = 11$ |

Indeed $d = 23 - 31 = -8$ and $e = 19 - 8 = 11$. The public term is
$de = 93 \cdot 11 = 1023 \equiv 13$. Now each party works alone:

- party 1: $c_1 + d\,b_1 + e\,a_1 + de = 5 + 93 \cdot 70 + 11 \cdot 10 + 13
  \equiv 5 + 46 + 9 + 13 = 73$;
- party 2: $c_2 + d\,b_2 + e\,a_2 = 30 + 93 \cdot 20 + 11 \cdot 90
  \equiv 30 + 42 + 81 = 153 \equiv 52$;
- party 3: $c_3 + d\,b_3 + e\,a_3 = 11 + 93 \cdot 19 + 11 \cdot 32
  \equiv 11 + 50 + 49 = 110 \equiv 9$.

The shares add to $73 + 52 + 9 = 134 \equiv 33$, and
$23 \cdot 19 = 437 = 4 \cdot 101 + 33$. Nobody saw 23, 19 or 33; everybody saw
$-8$ and 11, which, with $a$ and $b$ unknown, are just random numbers.

### The preprocessing model

Beaver's observation splits every computation into two phases, and Figure 10.4
shows them.

- The **offline phase** (preprocessing) produces triples, as many as the
  circuit has multiplications. It needs no inputs, so it can run overnight,
  or weeks in advance, and it holds all the expensive cryptography.
- The **online phase** runs when the inputs arrive. It uses only additions and
  openings. It is information-theoretically secure, needs no public-key
  operations, and costs each party two field elements broadcast per
  multiplication, with one round per layer of the circuit.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The preprocessing model: a dealer or offline protocol hands out triples before the inputs exist; online, the parties broadcast masked values and finish locally" fill="currentColor" font-size="14">
<text x="150" y="22" text-anchor="middle" font-weight="bold">offline: no inputs yet</text>
<text x="470" y="22" text-anchor="middle" font-weight="bold">online: inputs x, y</text>
<line x1="315" y1="10" x2="315" y2="290" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="70" y="40" width="160" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="62" text-anchor="middle">dealer, or OT, or</text>
<text x="150" y="80" text-anchor="middle">homomorphic encryption</text>
<rect x="20" y="170" width="80" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="197" text-anchor="middle">party 1</text>
<rect x="110" y="170" width="80" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="197" text-anchor="middle">party 2</text>
<rect x="200" y="170" width="80" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="240" y="197" text-anchor="middle">party 3</text>
<line x1="120" y1="90" x2="66" y2="164" stroke="currentColor" stroke-width="1.3"/>
<polygon points="62,170 64,161 70,165"/>
<line x1="150" y1="90" x2="150" y2="162" stroke="currentColor" stroke-width="1.3"/>
<polygon points="150,170 146,162 154,162"/>
<line x1="180" y1="90" x2="234" y2="164" stroke="currentColor" stroke-width="1.3"/>
<polygon points="238,170 230,165 236,161"/>
<text x="150" y="140" text-anchor="middle" opacity="0.8">shares of a, b, c = ab</text>
<text x="150" y="248" text-anchor="middle">expensive, done in advance</text>
<text x="150" y="268" text-anchor="middle" opacity="0.75">one triple per multiplication</text>
<rect x="345" y="50" width="250" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="470" y="75" text-anchor="middle">1. local: x - a and y - b</text>
<rect x="345" y="110" width="250" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="470" y="135" text-anchor="middle">2. broadcast: open d and e</text>
<rect x="345" y="170" width="250" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="470" y="195" text-anchor="middle">3. local: c + d b + e a + d e</text>
<line x1="470" y1="90" x2="470" y2="104" stroke="currentColor" stroke-width="1.3"/>
<polygon points="470,110 466,102 474,102"/>
<line x1="470" y1="150" x2="470" y2="164" stroke="currentColor" stroke-width="1.3"/>
<polygon points="470,170 466,162 474,162"/>
<text x="470" y="248" text-anchor="middle">cheap: additions and one round</text>
<text x="470" y="268" text-anchor="middle" opacity="0.75">no public-key operations at all</text>
</svg>
<figcaption>Figure 10.4. The preprocessing model. All the heavy cryptography moves to an offline phase that makes random triples; the online phase, when the inputs exist, is a round of openings and local arithmetic.</figcaption>
</figure>

Where do the triples come from? There are four answers, in increasing order
of what they ask you to trust.

- **A trusted dealer**, a separate party who generates triples and hands out
  shares. It never sees an input, but if it colludes with the parties it can
  undo every mask: knowing $a$ and seeing $d = x - a$ gives $x$. This is the
  model of the code below and of some deployments with a neutral operator.
- **The parties themselves, with an honest majority.** BGW multiplication, or
  the cheaper protocol of Ivan Damgård and Jesper Buus Nielsen (2007), makes
  shared triples from shared random values.
- **Oblivious transfer**, with a dishonest majority. Niv Gilboa (1999) showed
  how two parties can multiply secrets with one OT per bit. MASCOT (Marcel
  Keller, Emmanuela Orsini and Peter Scholl, 2016) builds malicious-secure
  triples this way, using OT extension.
- **Homomorphic encryption**, with a dishonest majority. SPDZ (§10.6) encrypts
  shares under a lattice-based scheme ([Chapter 12](12-Homomorphic-Encryption.md))
  and multiplies them inside the ciphertexts; Overdrive (Keller, Pastro and
  Dragos Rotaru, 2018) made this several times faster.

A newer idea, **pseudorandom correlation generators** (Elette Boyle, Geoffroy
Couteau, Niv Gilboa, Yuval Ishai, Lisa Kohl, Peter Scholl and others, from
2019), lets the parties exchange a short seed once and then expand it locally
into millions of correlated values, such as OTs or triples. This "silent"
preprocessing has made the offline phase far cheaper in communication.

### Code it

Three parties, a dealer who makes two triples before the inputs exist, and a
computation of $(xy + w) \cdot x$ that uses both.

```python
import random

random.seed(91)                      # random is for the demo; real shares use secrets
P = 101                              # real systems use a 64- or 128-bit prime
N = 3

def share(v):
    s = [random.randrange(P) for _ in range(N - 1)]
    return s + [(v - sum(s)) % P]

def open_(shares):                   # every party broadcasts its share
    return sum(shares) % P

def dealer_triple():
    """Offline phase: a dealer who never sees any input hands out [a], [b], [c = ab]."""
    a, b = random.randrange(P), random.randrange(P)
    return share(a), share(b), share(a * b % P)

def add(x, y):
    return [(u + v) % P for u, v in zip(x, y)]

def mul(x, y, triple):
    a, b, c = triple
    d = open_([(xi - ai) % P for xi, ai in zip(x, a)])   # public: x - a
    e = open_([(yi - bi) % P for yi, bi in zip(y, b)])   # public: y - b
    z = [(ci + d * bi + e * ai) % P for ai, bi, ci in zip(a, b, c)]
    z[0] = (z[0] + d * e) % P                            # one party adds d*e
    return z, (d, e)

triples = [dealer_triple() for _ in range(2)]            # made before the inputs exist

x, y, w = share(23), share(19), share(40)                # three private inputs
xy, opened = mul(x, y, triples[0])
print("opened d, e:", opened, "(uniform: they say nothing about 23 or 19)")
result, _ = mul(add(xy, w), x, triples[1])               # (x*y + w) * x
print("(23*19 + 40) * 23 mod 101 =", (23 * 19 + 40) * 23 % P, " shares give", open_(result))
```

Output:

```
opened d, e: (13, 45) (uniform: they say nothing about 23 or 19)
(23*19 + 40) * 23 mod 101 = 63  shares give 63
```

### Break it: one triple, two multiplications

A triple is a one-time pad, and a one-time pad used twice is not a pad. Suppose
a careless implementation runs two multiplications with the same triple, the
first on Alice's input $x$ and the second on Bob's input $x'$. The opened
values are $d = x - a$ and $d' = x' - a$, so everyone can compute
$d' - d = x' - x$. If anyone knows one of the inputs, they learn the other.

```python
import random

random.seed(7)                       # random is for the demo; real shares use secrets
P = 101
N = 3

def share(v):
    s = [random.randrange(P) for _ in range(N - 1)]
    return s + [(v - sum(s)) % P]

def open_(shares):
    return sum(shares) % P

a, b = 31, 8
triple = share(a), share(b), share(a * b % P)            # ONE triple ...

def opened_d(x):                                         # ... used twice
    return open_([(xi - ai) % P for xi, ai in zip(x, triple[0])])

alice_salary = 57                    # secret input of party 1, first multiplication
bob_salary = 64                      # secret input of party 2, second multiplication
d1 = opened_d(share(alice_salary))
d2 = opened_d(share(bob_salary))
print("public d values:", d1, d2)
print("anyone learns bob - alice =", (d2 - d1) % P)
print("so Alice, who knows 57, learns Bob's input:", (alice_salary + d2 - d1) % P)
```

Output:

```
public d values: 26 33
anyone learns bob - alice = 7
so Alice, who knows 57, learns Bob's input: 64
```

**Fix it.** Treat triples as consumables: give each one an index, delete it
after use, and abort if the stock runs out instead of recycling. Frameworks
such as MP-SPDZ count the triples a program needs at compile time and refuse
to run without enough.

!!! note "Life story: Beaver triples"
    **Born:** 1991, Donald Beaver, "Efficient Multiparty Protocols Using
    Circuit Randomization" (CRYPTO '91) · **Purpose:** to move the cost of
    multiplication into a phase that runs before the inputs exist, leaving an
    online phase of openings and local arithmetic · **Helped:** SPDZ, MASCOT,
    Overdrive, Sharemind-style and ABY-style systems, threshold signing
    protocols, and the whole preprocessing model; silent preprocessing (from
    2019) makes the triples cheaply · **Status:** current; almost every
    practical MPC system based on secret sharing uses them

## 10.6 SPDZ: catching cheaters with MACs

*Level: intermediate.*

Everything so far assumed the parties follow the protocol. Look again at the
Beaver multiplication. Suppose party 2 broadcasts its share of $d$ plus some
error $\delta$. The parties open $d + \delta$ instead of $d$ and compute

$$
z' = c + (d + \delta)\,b + e\,a + (d + \delta)\,e = xy + \delta\,(b + e) = xy + \delta\, y .
$$

The output is wrong, nobody notices, and the error even depends on the secret
$y$: if the cheater later sees whether the result "looks right", it learns
something about $y$. In an auction, a server could move the clearing price.
With an honest majority, the error-correcting codes of §10.4 handle such
cheats. With a **dishonest majority**, where any party may be facing a
coalition of all the others, something else is needed. In 2012 Ivan Damgård,
Valerio Pastro, Nigel Smart and Sarah Zakarias found it, and called the
protocol SPDZ after their initials.

### Shares that carry a MAC

SPDZ fixes a secret **MAC key** $\alpha \in \mathbb{F}_p$ for the whole
computation. Nobody knows $\alpha$: it is itself additively shared, party $i$
holding $\alpha_i$. Every shared value $x$ comes with a second sharing, of
$\alpha x$:

$$
[\![x]\!] = \big( (x_1, \ldots, x_n),\ (m_1, \ldots, m_n) \big), \qquad
\sum_i x_i = x, \quad \sum_i m_i = \alpha \cdot x .
$$

The tag $\alpha x$ is a **message authentication code** of the simplest
possible kind, a one-time linear MAC, and it is information-theoretic: its
security does not depend on any hard problem.

The MACs survive every operation the online phase needs, because they are
linear too.

- **Adding** two values: add the shares and add the MAC shares;
  $\alpha x + \alpha y = \alpha(x + y)$.
- **Multiplying by a public constant** $k$: multiply both; $k \cdot \alpha x = \alpha(kx)$.
- **Adding a public constant** $k$: party 1 adds $k$ to its value share, and
  every party $i$ adds $\alpha_i k$ to its MAC share, so the MACs sum to
  $\alpha x + \alpha k$. No one needs to know $\alpha$.

So a Beaver multiplication, which uses only these operations, turns MAC'd
triples and MAC'd inputs into a MAC'd product. The preprocessing must now
produce triples with MACs, and inputs must enter with MACs too (each party
masks its input with a MAC'd random value from preprocessing).

### Opening, and the check

When a value is opened, each party broadcasts its share $x_i$ and everyone
computes $v = \sum_i x_i$. A cheater may have shifted its share, so $v$ may be
$x + \delta$. Before anyone trusts $v$, the parties check it against the MAC:
each party computes

$$
\sigma_i = m_i - \alpha_i \, v .
$$

If $v$ is correct, $\sum_i \sigma_i = \alpha x - \alpha x = 0$. If $v = x + \delta$,
then

$$
\sum_i \sigma_i = \alpha x - \alpha (x + \delta) = -\alpha\,\delta \ne 0 .
$$

To pass, the cheater would have to shift its own MAC share by exactly
$\alpha \delta$, and it does not know $\alpha$. Whatever it adds, it is right
only if it guessed $\alpha$, which happens with probability $1/p$. With a
64-bit or 128-bit prime, that is never.

One detail matters. If the parties simply announced their $\sigma_i$ one after
another, the last to speak could choose its $\sigma$ to make the sum zero. So
each party first **commits** to $\sigma_i$ ([Chapter 3](03-Commitments.md)),
and only when all commitments are in do they open them. Figure 10.5 shows the
check.

### By hand: a cheat caught, mod 101

Let $\alpha = 7$, shared as $2, 4, 1$, and let $x = 23$ be shared as 40, 75, 9
with MAC shares 20, 30, 10, which sum to $60 \equiv 7 \cdot 23 = 161$.

Honest opening: $v = 23$.

- $\sigma_1 = 20 - 2 \cdot 23 = -26 \equiv 75$;
- $\sigma_2 = 30 - 4 \cdot 23 = -62 \equiv 39$;
- $\sigma_3 = 10 - 1 \cdot 23 = -13 \equiv 88$.

Sum: $75 + 39 + 88 = 202 \equiv 0$. The value is accepted.

Now party 2 broadcasts $75 + 5$ instead of 75, so $v = 28$:

- $\sigma_1 = 20 - 56 \equiv 65$, $\sigma_2 = 30 - 112 \equiv 19$, $\sigma_3 = 10 - 28 \equiv 83$.

Sum: $65 + 19 + 83 = 167 \equiv 66$, and $66 \equiv -35 = -7 \cdot 5 = -\alpha\delta$,
exactly as the algebra says. The parties abort.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="The SPDZ MAC check: open the value, each party computes sigma, commits, opens, and the sum must be zero" fill="currentColor" font-size="14">
<rect x="20" y="20" width="180" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="44" text-anchor="middle">party i holds</text>
<text x="110" y="64" text-anchor="middle">x_i, m_i, alpha_i</text>
<line x1="200" y1="48" x2="234" y2="48" stroke="currentColor" stroke-width="1.5"/>
<polygon points="240,48 232,44 232,52"/>
<rect x="240" y="20" width="160" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="44" text-anchor="middle">1. broadcast x_i</text>
<text x="320" y="64" text-anchor="middle">v = sum of x_i</text>
<line x1="400" y1="48" x2="434" y2="48" stroke="currentColor" stroke-width="1.5"/>
<polygon points="440,48 432,44 432,52"/>
<rect x="440" y="20" width="180" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="44" text-anchor="middle">2. compute</text>
<text x="530" y="64" text-anchor="middle">sigma_i = m_i - alpha_i v</text>
<line x1="530" y1="76" x2="530" y2="110" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,116 526,108 534,108"/>
<rect x="440" y="116" width="180" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="140" text-anchor="middle">3. commit to sigma_i</text>
<text x="530" y="160" text-anchor="middle">(all before any opens)</text>
<line x1="440" y1="144" x2="406" y2="144" stroke="currentColor" stroke-width="1.5"/>
<polygon points="400,144 408,140 408,148"/>
<rect x="240" y="116" width="160" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="140" text-anchor="middle">4. open all</text>
<text x="320" y="160" text-anchor="middle">commitments</text>
<line x1="240" y1="144" x2="206" y2="144" stroke="currentColor" stroke-width="1.5"/>
<polygon points="200,144 208,140 208,148"/>
<rect x="20" y="116" width="180" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="140" text-anchor="middle">5. sum of sigma_i</text>
<text x="110" y="160" text-anchor="middle">= 0 ? accept : abort</text>
<text x="320" y="216" text-anchor="middle">honest: sum = alpha x - alpha x = 0</text>
<text x="320" y="240" text-anchor="middle">a share shifted by delta: sum = - alpha delta, nonzero</text>
<text x="320" y="264" text-anchor="middle" opacity="0.75">to hide it the cheater must guess alpha: chance 1/p</text>
</svg>
<figcaption>Figure 10.5. The SPDZ MAC check. The commitments stop the last party from choosing its sigma to cancel the others; the MAC key alpha is never revealed, so a shifted share is caught except with probability 1/p.</figcaption>
</figure>

### Code it: a cheat caught

Three parties multiply MAC'd values with a MAC'd Beaver triple from the dealer,
open the product and check every opened value. In the second run, the party
with index 1 (the second of the three) adds 5 to every share it broadcasts. (In a real system the check runs once, at the
end, on a random linear combination of all opened values; here each value is
checked on its own, and the commitments of step 3 are left out to keep the
code short.)

```python
import random

random.seed(2012)                    # random is for the demo; real shares use secrets
P = 2**61 - 1                        # a 61-bit prime: a cheat survives with chance 1/P
N = 3

def split(v):
    s = [random.randrange(P) for _ in range(N - 1)]
    return s + [(v - sum(s)) % P]

ALPHA = random.randrange(1, P)       # the global MAC key: nobody ever learns it
alpha = split(ALPHA)                 # party i holds alpha[i]

class Shared:
    """A SPDZ value: shares x_i and MAC shares m_i with sum(m_i) = ALPHA * x."""
    def __init__(self, xs, ms):
        self.x, self.m = xs, ms
    def __add__(self, o):
        return Shared([(a + b) % P for a, b in zip(self.x, o.x)],
                      [(a + b) % P for a, b in zip(self.m, o.m)])
    def __sub__(self, o):
        return Shared([(a - b) % P for a, b in zip(self.x, o.x)],
                      [(a - b) % P for a, b in zip(self.m, o.m)])
    def scale(self, k):
        return Shared([k * a % P for a in self.x], [k * a % P for a in self.m])
    def plus_public(self, k):        # party 0 adds k; everyone adds alpha_i * k to its MAC
        xs = self.x[:]
        xs[0] = (xs[0] + k) % P
        return Shared(xs, [(m + a * k) % P for m, a in zip(self.m, alpha)])

def dealer(v):                       # preprocessing: shares and MACs from a dealer
    return Shared(split(v), split(ALPHA * v % P))

opened = []                          # every value opened, kept for the final check
cheat = {"party": None, "error": 0}

def open_(s):
    xs = s.x[:]
    if cheat["party"] is not None:   # a malicious party broadcasts a wrong share
        xs[cheat["party"]] = (xs[cheat["party"]] + cheat["error"]) % P
    v = sum(xs) % P
    opened.append((v, s.m))
    return v

def mac_check():
    """Each party commits to sigma_i = m_i - alpha_i * v, then all open; sum must be 0."""
    for v, ms in opened:
        sigma = [(m - a * v) % P for m, a in zip(ms, alpha)]
        if sum(sigma) % P != 0:
            return "ABORT: MAC check failed, someone cheated"
    return "MAC check passed"

def mul(x, y):
    a, b = random.randrange(P), random.randrange(P)
    A, B, C = dealer(a), dealer(b), dealer(a * b % P)
    d, e = open_(x - A), open_(y - B)
    return (C + B.scale(d) + A.scale(e)).plus_public(d * e % P)

for who in (None, 1):
    opened.clear()
    cheat["party"], cheat["error"] = who, 5
    x, y = dealer(23), dealer(19)
    z = mul(x, y)
    result = open_(z)
    print("cheater:", who, " result:", result, " ->", mac_check())
```

Output:

```
cheater: None  result: 437  -> MAC check passed
cheater: 1  result: 677  -> ABORT: MAC check failed, someone cheated
```

The cheater moved the result from 437 to 677, and in a protocol without MACs
the parties would have accepted it. Here they refuse it.

### Break it: a field too small

The whole guarantee is the $1/p$ chance of guessing $\alpha$. In the program
below the field has only 11 elements, and a cheater who shifts its share and
adds its guess of $\alpha$ times the shift to its MAC share gets through about
one time in eleven.

```python
import random

random.seed(1)                       # random is for the demo; real keys use secrets
P = 11                               # deliberately tiny, so the cheat sometimes works
N = 3
trials, fooled = 11000, 0

def split(v):
    s = [random.randrange(P) for _ in range(N - 1)]
    return s + [(v - sum(s)) % P]

for _ in range(trials):
    alpha_key = random.randrange(P)
    alpha = split(alpha_key)
    x = random.randrange(P)
    xs, ms = split(x), split(alpha_key * x)
    err, guess = random.randrange(1, P), random.randrange(P)
    xs[1] = (xs[1] + err) % P        # party 1 shifts its share ...
    ms[1] = (ms[1] + guess * err) % P   # ... and its MAC share by its guess of alpha
    v = sum(xs) % P
    if sum((m - a * v) % P for m, a in zip(ms, alpha)) % P == 0:
        fooled += 1
print("cheats that passed:", fooled, "of", trials, "=", round(fooled / trials, 4),
      " (1/P =", round(1 / P, 4), ")")
```

Output:

```
cheats that passed: 959 of 11000 = 0.0872  (1/P = 0.0909 )
```

**Fix it.** Use a large field, at least 64 bits, or, when the computation must
run in a small field or on bits, use several independent MAC keys or a larger
MAC field. SPDZ$_{2^k}$ (Ronald Cramer, Ivan Damgård, Daniel Escudero, Peter
Scholl and Chaoping Xing, 2018) does this for arithmetic modulo $2^{64}$,
which is what computer hardware does natively, by computing modulo
$2^{64 + s}$ and checking the extra $s$ bits.

### The rest of SPDZ

The online phase above is cheap. The work is in the offline phase, which must
produce MAC'd triples even though every party but one may be lying. The
original SPDZ did it with a **somewhat homomorphic** encryption scheme, a
lattice scheme of the BGV family ([Chapter 12](12-Homomorphic-Encryption.md)),
under which the parties can add and multiply encrypted shares once, plus
zero-knowledge proofs that each party's ciphertexts are well formed. Triples
are checked by **sacrifice**: one triple is used to test another, and the
tester is thrown away. A follow-up in 2013 (Damgård, Keller, Enrique Larraia,
Pastro, Scholl and Smart) gave the MAC check its modern form, which never
reveals $\alpha$, so one key can serve many computations; the original
revealed $\alpha$ at the end of each run. MASCOT replaced the homomorphic
encryption with oblivious transfer in 2016, and Overdrive returned to
lattices with a faster scheme in 2018.

What SPDZ does not give is just as important. It gives **security with
abort**: a cheater cannot change the result or learn anything extra, but it
can make the computation fail, and the honest parties learn that someone
cheated, not who. With a dishonest majority that is the best possible
([§1.4](01-Computing-With-Secrets.md)). Variants with **identifiable abort**
name the cheater, at a higher cost.

!!! note "Life story: SPDZ"
    **Born:** 2012, Ivan Damgård, Valerio Pastro, Nigel Smart and Sarah
    Zakarias, "Multiparty Computation from Somewhat Homomorphic Encryption"
    (CRYPTO 2012), at Aarhus and Bristol · **Purpose:** practical secure
    computation against a dishonest majority of malicious parties, with an
    information-theoretic online phase and MACs that catch cheaters ·
    **Helped:** the "SPDZ family" (SPDZ-2, MASCOT, Overdrive, SPDZ$_{2^k}$),
    the SCALE-MAMBA and MP-SPDZ frameworks · **Status:** current; the standard design for
    dishonest-majority computation on secret shares

## 10.7 Choosing a protocol, and what it costs

*Level: intermediate.*

A team that wants to compute on joint secrets today does not implement BGW or
SPDZ from a paper. It picks a framework, writes the function in that
framework's language, and chooses a protocol to match its trust model. The
choice has three questions, and the answers set the price.

1. **How many parties may collude?** If a majority can be trusted not to
   collude (three hospitals, two of which would have to conspire),
   honest-majority protocols such as BGW or three-party replicated sharing are
   the cheapest. If every party must be protected against all the others,
   only dishonest-majority protocols (GMW, SPDZ, garbled circuits) will do.
2. **Will anyone cheat?** Semi-honest protocols are much cheaper. They are
   right when the parties are audited institutions running agreed software,
   and wrong when one party has a motive and the skill to change its code.
3. **What does the function look like?** Sums, averages and matrix
   arithmetic belong in arithmetic sharing modulo a prime or $2^{64}$.
   Comparisons, sorting and anything with many branches belong in Boolean
   sharing or garbled circuits. Many frameworks convert between the two in
   the middle of a computation, because real functions mix them.

### Frameworks

| Framework | From | What it offers |
|---|---|---|
| MP-SPDZ | Marcel Keller, 2020 (from the SPDZ-2 code) | over thirty protocols behind one Python-like language: semi-honest and malicious, honest and dishonest majority, arithmetic, binary and garbled |
| Sharemind | Cybernetica, Estonia, 2008 | three servers, additive sharing; a commercial platform with its own language, SecreC; the Estonian tax study |
| MPyC | Berry Schoenmakers, Eindhoven | pure Python, Shamir sharing, honest majority; good for teaching and prototypes |
| EMP-toolkit | Xiao Wang, Alex Malozemoff and Jonathan Katz, 2016 | garbled circuits and OT extension, including malicious two-party and many-party versions |
| ABY, MOTION | TU Darmstadt, 2015 and about 2020 | mixed arithmetic, Boolean and garbled sharing with conversions |
| CrypTen | Meta, 2021 | machine learning in PyTorch on arithmetic shares, semi-honest |
| JIFF | Boston University | JavaScript, so that parties can take part from a web browser |

MP-SPDZ deserves a word, because it is where most researchers now compare
protocols. A program is written once, compiled to a circuit, and run with any
of the protocols, from three-party replicated sharing to SPDZ with homomorphic
preprocessing, by choosing a different binary. It counts the triples a
program will need and reports the rounds and bytes, which makes the costs in
this section visible before anything runs.

!!! note "Life story: MP-SPDZ"
    **Born:** 2018 to 2020, Marcel Keller, then at CSIRO's Data61, as a fork
    and extension of the SPDZ-2 software from Bristol; paper at ACM CCS 2020 ·
    **Purpose:** one framework and one language for dozens of MPC protocols,
    so that protocols can be compared fairly and programs moved between trust
    models · **Helped:** a large share of MPC research benchmarks since, and
    teaching · **Status:** current, open source and actively maintained

### What it costs

The figures below are **approximate**. They come from papers that ran on
particular machines and networks, they change by factors of ten with the
hardware, the network and the function, and they improve every year. Treat
them as orders of magnitude.

| Setting | Representative result | Source |
|---|---|---|
| 3 parties, semi-honest, honest majority, LAN | over 7 billion AND gates per second; over 1.3 million AES evaluations per second on three 20-core servers with 10 Gbit/s links | Araki et al., 2016 |
| 3 parties, malicious, honest majority, LAN | over 1 billion AND gates per second in the same setting | same team, journal version |
| 2 or more parties, malicious, dishonest majority | roughly thousands to tens of thousands of triples per second per party in the offline phase on a LAN; the online phase is far faster | MASCOT (2016), Overdrive (2018), approximate |
| any protocol, across continents | round trips of about 100 milliseconds dominate: a circuit of depth 1,000 needs at least 100 seconds, whatever the bandwidth | arithmetic |

Three lessons follow. First, honest majority with semi-honest parties can run
close to the speed of the network: Araki and colleagues reported a login
service built on it handling more than 35,000 logins per second. Second,
malicious security against a dishonest majority is still one to three orders
of magnitude slower, and almost all of that is in making triples. Third, even
the fastest MPC is far slower than computing in the clear, often a thousand
times or more for general code; it pays when the alternative is not computing
at all. Systems therefore keep the function inside MPC as small as possible:
sums and counts in arithmetic shares, a few comparisons, and everything else
outside on the opened results.

## 10.8 MPC in the world

*Level: intermediate.*

### The sugar beet auction, 2008

Denmark's sugar beets were grown under contracts with one buyer, Danisco, and
the contracts, which set how many tons each farmer could deliver, were
traded among farmers. Economists at Aarhus wanted a **double auction**: each
farmer states, for each of about 4,000 possible prices, how much they would
buy or sell at that price, and the market clears at the price where supply
meets demand. A farmer's bids reveal their costs and their finances, and
farmers did not want Danisco, which also negotiated with them, or their
association, DKS, to see them.

The SIMAP team built a system in which each bid was split into Shamir shares
held by three servers, run by Danisco, DKS and the research project. The
servers searched for the clearing price with comparisons computed on the
shares, an honest-majority, semi-honest protocol in the BGW family of §10.4. On
14 January 2008 the auction ran with 1,229 bidders, the computation took about
half an hour, and about 25,000 tons of production rights changed hands at the
price it found. No party saw any bid. The Life story card is in
[Chapter 1](01-Computing-With-Secrets.md); what matters here is the design
choice: three organizations with opposed interests, each trusted not to collude
with the other two, is exactly the honest-majority model, and the cheapest
protocols fit it.

### The Boston gender wage-gap study, from 2015

In 2013 the City of Boston and the Boston Women's Workforce Council, a
partnership of the city and employers, set out to measure the wage gap between
men and women in Greater Boston. Employers signed a compact to share payroll
data, but would not hand salary tables to the city, to the council or to each
other: the data were confidential. In 2014 the city
asked for a mechanism, and researchers at Boston University's Hariri Institute,
led by Azer Bestavros with Andrei Lapets and Mayank Varia, built one.

Each employer's HR staff opened a web page and entered aggregate counts and
salary totals by gender, race and job category. The page split every number
into additive shares in the browser and sent them to two separate parties,
so that neither ever saw an employer's figures; the parties then added the
shares across employers and opened only the totals. The function is just a
sum, which is the point: the hard parts were not the cryptography but a web
page that HR staff could use, and an agreement about who held the shares.
Data were collected in 2015 and 2016. The report published in January 2017
covered 69 employers, about 112,600 employees and about 11% of the area's
workforce, and found that women earned about 77 cents for each dollar earned
by men. The collections continued in later years, and in 2025 a BU platform
built on this work produced Massachusetts's statewide workforce data report.
(Which collection year each published figure belongs to differs between
sources; the figures here are those of the January 2017 report.)

!!! note "Life story: the Boston wage-gap study"
    **Born:** 2015, Boston University's Hariri Institute (Azer Bestavros,
    Andrei Lapets, Mayank Varia and colleagues) for the Boston Women's
    Workforce Council · **Purpose:** to measure pay gaps across many
    employers' payrolls without any employer revealing its own figures ·
    **Helped:** reports from 2016 on, the January 2017 one covering 69
    employers and about 112,600 employees; the JIFF framework; a model for
    statewide reporting in Massachusetts · **Status:** current; repeated and
    extended since

### Students and taxes in Estonia, 2015

Estonia has unusually complete government databases, and unusually strict
rules about joining them. In 2015 statisticians at the Estonian Center of
Applied Research (CentAR) asked whether students who work during their studies
are more likely to fail to graduate on time. Answering needed the tax
records of the Estonian Tax and Customs Board, about ten million rows of
individual tax payments, joined with more than half a million records of higher
education events from the Ministry of Education and Research. Neither
agency could legally hand its data to the other, or to the researchers.

Dan Bogdanov and colleagues at Cybernetica ran the study on Sharemind. Each
agency split its records into additive shares and sent them to three servers;
the servers joined the two tables on shares, which needs oblivious sorting
and shuffling rather than just sums, and computed the statistics; only the
aggregate results were opened. The paper, published in 2016, called it the
largest cryptographically private statistical study then run on real data.
It showed that MPC could do more than add: joins, sorts and filters over
millions of rows, in hours rather than years.

!!! note "Life story: Sharemind and the students-and-taxes study"
    **Born:** Sharemind in 2008 (Dan Bogdanov, Sven Laur and Jan Willemson,
    Cybernetica and the University of Tartu); the study in 2015, published
    as "Students and Taxes" (PoPETs 2016) · **Purpose:** statistics across
    government databases that may not be joined in the clear · **Helped:**
    joined ten million tax records with over half a million education records;
    a model for later studies on government data · **Status:** current; Sharemind is a commercial platform

### Private Join and Compute, 2019

Advertisers want to know whether ads lead to purchases. The ad platform knows
who saw an ad; the merchant knows who bought what. Joining the two lists in
the clear tells each side far too much about the other's customers. On 19 June
2019 Google released **Private Join and Compute**, the protocol it had used
internally for this kind of measurement. One party holds a list of
identifiers, the other a list of identifiers with numbers attached (say,
purchase amounts). Together they learn how many identifiers the lists share
and the **sum** of the numbers over the shared ones, and nothing else.

The protocol blinds identifiers with a commutative, Diffie-Hellman-style
encryption, so that the two sides can find matches without seeing each other's
entries (this is private set intersection, the subject of
[Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)), and carries the
numbers under an additively homomorphic encryption, Paillier in the
open-source code ([Chapter 12](12-Homomorphic-Encryption.md)), so that the sum
can be formed without anyone seeing an individual amount. It is a two-party,
semi-honest protocol, chosen because the parties are large companies bound by
contracts and audits.

!!! note "Life story: Private Join and Compute"
    **Born:** described by Mihaela Ion, Ben Kreuter, Mariana Raykova, Moti
    Yung and colleagues at Google; open-sourced on 19 June 2019; paper at
    IEEE EuroS&P 2020 · **Purpose:** the size of the intersection of two
    lists and the sum of values over it, without revealing the lists ·
    **Helped:** advertising conversion measurement between companies; a
    widely studied template for "intersection-sum" · **Status:** current;
    open source

### Keys that never exist in one place

A threshold signature ([Chapter 4](04-Threshold-Cryptography.md)) is MPC for
one function: sign a message with a key that exists only as shares. From
about 2018 cryptocurrency custody firms (Fireblocks, Unbound, which Coinbase
agreed to buy in late 2021, ZenGo and others) built their products on it, and
"MPC wallet" became a product category. A typical consumer wallet splits the
key between the user's phone and the provider's server, so that a stolen phone
or a breached server alone cannot move funds; institutional custody spreads
shares across several machines and people. This is the most widely deployed
form of MPC by value protected, and also where its failures have been most
expensive: the 2023 TSSHOCK and BitForge attacks on threshold ECDSA libraries,
told in [Chapter 4](04-Threshold-Cryptography.md), came from implementations
that skipped proofs the security analysis relied on against malicious
parties.

### Private measurement: Prio and its descendants

Browsers and phones collect statistics: how often a feature crashes, which
pages break, how many people received an exposure alert. In 2017 Henry
Corrigan-Gibbs and Dan Boneh published **Prio**: each client splits its
report into additive shares, one per server, and attaches a short proof that
the shares add up to a valid report (a 0 or 1, a number in range), which the
servers check on the shares without reconstructing the report. The servers
add up the shares and open only the totals. Privacy holds if any one server is
honest; the proof stops a client from adding 1,000,000 to a counter.

Mozilla tested Prio in Firefox in 2018 and 2019. In 2020 Apple and Google's
COVID-19 Exposure Notifications Express used it for Exposure Notification
Private Analytics: each phone's metrics were split into two shares, encrypted
to the Internet Security Research Group (ISRG) and to the US National
Institutes of Health, which each summed their shares, and a server run by
MITRE combined the partial sums for public-health authorities. ISRG reports
having aggregated over two billion device metrics this way. The IETF's
Privacy Preserving Measurement working group has since written the
Distributed Aggregation Protocol (DAP) and the "verifiable distributed
aggregation functions" behind it, as drafts.

Advertising is the next frontier. In 2022 Meta and Mozilla proposed
**Interoperable Private Attribution** (IPA), in which three "helper"
parties, an honest-majority, malicious-secure setting, match ad views to
purchases on secret shares and release only aggregate counts with added
noise. In July 2024 Firefox 128 included a related experiment,
Privacy-Preserving Attribution, built on DAP with two aggregators, one run by Mozilla
and one by ISRG's Divvi Up. It was on by default, drew a complaint by the
privacy group noyb to the Austrian data protection authority, and was later
removed; Mozilla said the experiment, meant for a couple of its own test sites,
was never actually activated. The
episode shows that people judge these systems by who runs the servers and
whether they were asked, not by the protocol. Two ideas from this section
continue in later chapters: the private matching in
[Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md) and the added
noise, differential privacy, in [Chapter 19](19-Differential-Privacy.md).

!!! note "Life story: Prio"
    **Born:** 2017, Henry Corrigan-Gibbs and Dan Boneh, Stanford (NSDI 2017)
    · **Purpose:** aggregate statistics from many clients, with each report
    secret-shared between servers and proved valid on its shares ·
    **Helped:** Firefox trials (2018 to 2019); Exposure Notification Private
    Analytics (2020, ISRG, NIH and MITRE); the IETF's DAP drafts and ISRG's
    Divvi Up service · **Status:** current; the basis of standardized private
    measurement

### Standards

ISO/IEC 4922-2 (2024) specifies multi-party computation on the secret sharing
of ISO/IEC 19592-2, and a third part, on garbled circuits, is in draft. These
give procurement officers something to point to; they do not choose a trust
model for anyone.

## 10.9 The shortcut: trusted hardware

*Level: intermediate.*

Every protocol so far spreads trust across parties and pays for it in rounds
and bytes. There is a cheaper-looking alternative: build a computer that even
its owner cannot look inside, have everyone send their inputs there, and let
it compute in the clear at full speed. In 2015 Intel shipped this idea in its
Skylake processors as **Software Guard Extensions** (SGX).

### How an enclave works

An SGX **enclave** is a region of memory that the processor encrypts and
integrity-protects whenever it leaves the chip. Code outside the enclave,
including the operating system and the hypervisor, cannot read it or change
it. When an enclave starts, the processor **measures** it, hashing the code it
loads. Through **remote attestation**, the processor then signs a report,
with a key rooted in Intel's manufacturing, saying "an enclave with this
measurement is running on a genuine, up-to-date Intel chip". A hospital that
wants to send data checks the signature and the measurement, sets up an
encrypted channel that ends inside the enclave, and sends its records.

For secure computation this is very attractive. There are no rounds, no
triples and no circuits; any program runs at nearly native speed; and the
parties need only check one report. Signal used SGX for private contact
discovery from 2017 ([Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md)),
cloud providers sell "confidential computing" built on enclaves, and
Ultra HD Blu-ray players on PCs used SGX to protect video keys.

But the trust has moved, not disappeared. Everyone now trusts Intel's design,
Intel's manufacturing, Intel's attestation service and keys, and, the hardest
part, the absence of any side channel by which the untrusted operating system
next to the enclave can learn what happens inside. The enclave shares caches,
branch predictors and power supply with the attacker. From 2017 on,
researchers showed one leak after another.

### The breaks

- **Cache attacks (2017).** Several teams showed that classic cache-timing
  attacks ([Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md))
  work even better against enclaves, because the attacker controls the
  operating system and can interrupt the enclave at will.
- **Foreshadow (2018).** Jo Van Bulck of KU Leuven and colleagues from
  Technion, Michigan and Adelaide used speculative execution, the mechanism
  behind Spectre and Meltdown, to read enclave memory from the L1 cache.
  They extracted the attestation keys of Intel's own quoting enclave, which
  let them forge attestation reports. Disclosed 14 August 2018; Intel calls
  the flaw L1 Terminal Fault.
- **Plundervolt (2019).** Kit Murdock, David Oswald, Flavio Garcia, Jo Van
  Bulck, Daniel Gruss and Frank Piessens used the software interface for
  lowering a processor's voltage to make multiplications and AES-NI
  instructions inside an enclave give wrong answers, and recovered keys from
  the faulty results. Disclosed in December 2019; Intel's fix lets SGX
  systems lock the voltage interface.
- **SGAxe (2020).** Stephan van Schaik, Andrew Kwong, Daniel Genkin and Yuval
  Yarom used an earlier leak, CacheOut, to recover the sealing keys of
  Intel's production quoting enclave, unsealed its stored attestation key,
  and could then sign attestation reports as a genuine machine. Disclosed in
  June 2020; Intel answered with microcode and a "TCB recovery" that revoked
  old attestation keys.

Each break was patched with microcode updates, and attestation was updated
to refuse unpatched machines. But a patch protects future data. Records sent
to an enclave before the patch, on a machine an attacker controlled, are
gone, and the hospital that sent them cannot tell.

!!! note "Life story: Intel SGX"
    **Born:** announced in 2013, shipped in 2015 with Intel's Skylake
    processors · **Purpose:** enclaves whose memory the operating system
    cannot read, with remote attestation so that outsiders can trust them ·
    **Helped:** Signal's contact discovery (2017), confidential cloud
    computing, Ultra HD Blu-ray playback on PCs · **Status:** listed as
    deprecated on Intel's 11th and 12th generation client processors
    (datasheets of 2021, widely noticed in January 2022); continued on Xeon
    server processors, with whole-machine enclaves (Intel TDX) as the
    successor

!!! note "Life story: Foreshadow"
    **Born:** found independently in January 2018 by a KU Leuven team led by
    Jo Van Bulck and by a team from Technion, the University of Michigan and
    the University of Adelaide, who published together; disclosed 14 August 2018 (USENIX Security 2018)
    · **Purpose:** to read SGX enclave memory through speculative execution
    and the L1 cache · **Helped:** extracted the quoting enclave's
    attestation keys; led to the Foreshadow-NG variants against operating
    systems and hypervisors and to L1 cache flushing on enclave exit ·
    **Status:** fixed by microcode and software updates

!!! note "Life story: Plundervolt"
    **Born:** 2019, Kit Murdock, David Oswald, Flavio Garcia (Birmingham),
    Jo Van Bulck, Frank Piessens (KU Leuven) and Daniel Gruss (Graz);
    disclosed December 2019, paper at IEEE S&P 2020 · **Purpose:** to fault
    computations inside SGX enclaves by undervolting from software ·
    **Helped:** showed that fault injection no longer needs physical access;
    Intel shipped microcode that locks voltage control on SGX systems ·
    **Status:** fixed on patched systems

!!! note "Life story: SGAxe"
    **Born:** June 2020, Stephan van Schaik, Andrew Kwong, Daniel Genkin and
    Yuval Yarom · **Purpose:** to take the attestation key out of Intel's
    quoting enclave, using the CacheOut leak · **Helped:** showed that one
    leaked key breaks attestation for every party relying on it; forced a
    revocation of attestation keys · **Status:** fixed by microcode and a TCB
    recovery

In 2021 Intel listed SGX as deprecated on its 11th and 12th generation Core
client processors; the change was widely noticed in January 2022, when PCs
with new chips could no longer play Ultra HD Blu-ray discs. SGX continues on
Xeon server chips, and the industry has moved toward enclaves that hold whole
virtual machines: Intel TDX, AMD SEV-SNP and Arm's Confidential Compute
Architecture. These have their own growing list of attacks.

### Break it: one stolen key

Attestation is a chain of trust that ends in a key inside the chip. The toy
below uses an HMAC key as the platform's attestation key (real SGX uses EPID or
ECDSA signatures with Intel's certificates). An honest enclave is accepted, an
enclave running different code is refused, and then the key is stolen, as
Foreshadow and SGAxe stole it, and a forged report for the spy code passes.

```python
import hashlib
import hmac
import secrets

# A toy of remote attestation. The CPU holds a platform key from the maker and signs
# a report: "this enclave, with this code hash, is running on a genuine chip".
# Real SGX signs with EPID or ECDSA keys certified by Intel; HMAC stands in here.
PLATFORM_KEY = secrets.token_bytes(32)          # fused into the chip, never exported
VERIFIER_COPY = PLATFORM_KEY                   # the maker's service can check reports

def measure(code):
    return hashlib.sha256(code).hexdigest()

def cpu_attest(code, key=PLATFORM_KEY):
    m = measure(code)                          # the CPU hashes what it actually loaded
    return m, hmac.new(key, m.encode(), "sha256").hexdigest()

def clinic_will_send(report, expected):
    m, tag = report
    good = hmac.compare_digest(tag, hmac.new(VERIFIER_COPY, m.encode(), "sha256").hexdigest())
    return good and m == expected

honest_code = b"compute average height; output only the average"
spy_code = b"compute average height; also copy every record to the operator"
expected = measure(honest_code)

print("honest enclave accepted:", clinic_will_send(cpu_attest(honest_code), expected))
print("spy enclave accepted:   ", clinic_will_send(cpu_attest(spy_code), expected))

# SGAxe-style break: the attestation key is extracted from the chip. The attacker
# now signs whatever measurement the clinic expects, while running the spy code.
stolen = PLATFORM_KEY
forged = (expected, hmac.new(stolen, expected.encode(), "sha256").hexdigest())
print("forged report accepted: ", clinic_will_send(forged, expected), "(spy code runs)")
```

Output:

```
honest enclave accepted: True
spy enclave accepted:    False
forged report accepted:  True (spy code runs)
```

**Fix it, as far as it can be fixed.** Revoke the leaked keys and refuse
reports from unpatched machines (Intel's TCB recovery); do not let one
enclave hold everything, but combine enclaves from different vendors or
split the data between an enclave and MPC; and decide in advance what a
break would cost. MPC's guarantee rests on mathematics and on a stated number
of honest parties; an enclave's rests on a product whose attack surface
changes with every microcode update. Many teams still choose the enclave,
because it is fast and simple. They should choose it knowing that this is
the trade.

## 10.10 Mars: three clinics and the children's heights

*Level: intermediate.*

Arcadia City's children grow up at 0.38 g. Its pediatric clinic measures
them every year, and its doctors want to know whether their growth follows
Earth's charts or drifts away from them. Twelve six-year-olds are far too few
to answer alone. Two children's clinics on Earth, one in Toronto and one in
Nairobi, have agreed to pool their numbers. None of the three may send
records: the Earth clinics are bound by their countries' health-privacy laws,
and Arcadia's settlement charter ([Chapter 19](19-Differential-Privacy.md))
forbids exporting residents' medical files. The link between them is 4 to 24
minutes of light delay each way, depending on where the two planets are in
their orbits, and nobody fully trusts the relays in between.

### What to compute

The study wants the pooled mean height and its variance. For $N$ children with
heights $h_1, \ldots, h_N$:

$$
\bar h = \frac{S}{N}, \qquad
s^2 = \frac{N Q - S^2}{N (N - 1)}, \qquad
\text{where } S = \sum_k h_k, \quad Q = \sum_k h_k^2 .
$$

So the whole study needs three numbers: $N$, $S$ and $Q$. And each of them is a
**sum over clinics**. Clinic $j$ computes its own $n_j$, $S_j$ and $Q_j$ from
its records, and the pooled values are $N = n_1 + n_2 + n_3$ and so on. No
multiplication of shared values is needed at all: the squares are taken
locally, by each clinic, on its own data.

Opening $N$, $S$ and $Q$ reveals nothing beyond what the study publishes
anyway, because the count, mean and variance determine them and are
determined by them. This is the first lesson of real MPC: design the
function so that the expensive gates disappear. Most deployed systems,
Boston's included, are sums.

### The protocol

Each clinic is both an input party and a computing party.

1. Each clinic splits each of its three numbers into three additive shares
   modulo $p = 2^{61} - 1$, keeps one and sends one to each other clinic,
   encrypted on the way (heights are whole millimeters, so all values are
   integers and $p$ is far larger than any sum).
2. Each clinic adds up the three shares it holds of each number and publishes
   the three sums.
3. Everyone adds the published sums and computes $\bar h$ and $s^2$.

A clinic's numbers stay hidden unless both other clinics pool their shares
against it: additive sharing among three needs all three shares. Figure 10.6
shows the flow.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Three clinics, two on Earth and one in Arcadia City, exchange shares in one round and publish sums in a second" fill="currentColor" font-size="14">
<text x="130" y="22" text-anchor="middle" font-weight="bold">Earth</text>
<text x="530" y="22" text-anchor="middle" font-weight="bold">Mars</text>
<line x1="330" y1="10" x2="330" y2="200" stroke="currentColor" stroke-width="1" stroke-dasharray="5 4"/>
<rect x="40" y="40" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="62" text-anchor="middle">Toronto clinic</text>
<text x="130" y="80" text-anchor="middle" opacity="0.75">n, S, Q of 40 children</text>
<rect x="40" y="140" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="162" text-anchor="middle">Nairobi clinic</text>
<text x="130" y="180" text-anchor="middle" opacity="0.75">n, S, Q of 55 children</text>
<rect x="440" y="90" width="180" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="112" text-anchor="middle">Arcadia City clinic</text>
<text x="530" y="130" text-anchor="middle" opacity="0.75">n, S, Q of 12 children</text>
<line x1="130" y1="90" x2="130" y2="134" stroke="currentColor" stroke-width="1.3"/>
<polygon points="130,140 126,132 134,132"/>
<polygon points="130,90 126,98 134,98"/>
<text x="140" y="120" opacity="0.75">milliseconds</text>
<line x1="220" y1="65" x2="434" y2="108" stroke="currentColor" stroke-width="1.3"/>
<polygon points="440,109 431,104 430,112"/>
<polygon points="220,65 228,63 227,71"/>
<line x1="220" y1="165" x2="434" y2="122" stroke="currentColor" stroke-width="1.3"/>
<polygon points="440,121 430,118 431,126"/>
<polygon points="220,165 227,159 228,167"/>
<text x="330" y="78" text-anchor="middle" opacity="0.75">4 to 24 min</text>
<text x="330" y="174" text-anchor="middle" opacity="0.75">4 to 24 min</text>
<text x="320" y="230" text-anchor="middle">round 1: every clinic sends a share of n, S, Q to each other clinic</text>
<text x="320" y="254" text-anchor="middle">round 2: every clinic publishes the sums of the shares it holds</text>
<text x="320" y="276" text-anchor="middle" opacity="0.75">total: two one-way delays, 8 to 48 minutes; no record leaves a clinic</text>
</svg>
<figcaption>Figure 10.6. The three-clinic study. The Earth clinics talk to each other in milliseconds and to Arcadia City in minutes; because the function is a sum, the whole protocol is two rounds, so the light delay costs two one-way trips and no more.</figcaption>
</figure>

### Code it

The records are made up, with Arcadia's children drawn slightly taller, a
guess about growth in low gravity, not a finding. The last line computes the
same statistics on the pooled records, which no real clinic could do, to show
that the protocol gives the right answer.

```python
import random
import statistics
from fractions import Fraction

random.seed(2071)                    # random is for the demo; real shares use secrets
P = 2**61 - 1                        # big enough that sums of squares never wrap
CLINICS = ["Toronto", "Nairobi", "Arcadia City"]

# Each clinic's private records: heights of six-year-olds in millimeters (made up).
records = {
    "Toronto": [round(random.gauss(1160, 50)) for _ in range(40)],
    "Nairobi": [round(random.gauss(1150, 48)) for _ in range(55)],
    "Arcadia City": [round(random.gauss(1185, 52)) for _ in range(12)],
}

def split(v):
    s = [random.randrange(P) for _ in range(len(CLINICS) - 1)]
    return s + [(v - sum(s)) % P]

# Round 1: each clinic computes three local numbers and sends one share of each
# to every clinic (itself included). Nothing else ever leaves the building.
inbox = {c: [] for c in CLINICS}
for c in CLINICS:
    xs = records[c]
    local = (len(xs), sum(xs), sum(v * v for v in xs))   # n, sum, sum of squares
    pieces = [split(v) for v in local]
    for k, dest in enumerate(CLINICS):
        inbox[dest].append(tuple(p[k] for p in pieces))

print("Arcadia City receives from Toronto:", inbox["Arcadia City"][0])

# Round 2: each clinic adds the shares it holds and publishes three sums.
published = []
for c in CLINICS:
    published.append(tuple(sum(m[i] for m in inbox[c]) % P for i in range(3)))
n, s, q = (sum(p[i] for p in published) % P for i in range(3))

mean = Fraction(s, n)
var = Fraction(q * n - s * s, n * (n - 1))               # sample variance
print("children:", n, " mean height: %.1f mm" % float(mean),
      " variance: %.1f mm^2" % float(var), " sd: %.1f mm" % float(var) ** 0.5)

everyone = [v for c in CLINICS for v in records[c]]      # only to check the demo
print("check on pooled data: mean %.1f, variance %.1f"
      % (statistics.mean(everyone), statistics.variance(everyone)))
```

Output:

```
Arcadia City receives from Toronto: (230826378049288819, 1653970031253648787, 2205136613879115688)
children: 107  mean height: 1157.5 mm  variance: 2678.4 mm^2  sd: 51.8 mm
check on pooled data: mean 1157.5, variance 2678.4
```

What Arcadia City received from Toronto is three random-looking 61-bit
numbers. Toronto's count, sum and sum of squares are in there, but only
together with the shares that Nairobi and Toronto itself hold.

### Rounds against light

The protocol above takes two rounds, so it costs two one-way light delays:
between 8 and 48 minutes, however much data there is. Suppose the doctors
then ask for the **median** height instead. A median needs comparisons, and
comparisons on shares need Boolean circuits of some depth: a secure sort of a
hundred values by GMW or SPDZ could need hundreds of rounds, and at up to 24
minutes a round, days of waiting. Three better plans exist: garbled circuits
(Chapter 9), whose rounds do not grow with the circuit; letting the two Earth
clinics, a millisecond apart, do the deep part with a dishonest-majority
two-party protocol on data that Arcadia secret-shared between them; or asking
whether the median is really needed. Over an interplanetary link, the
number of rounds is the cost that matters.

### Break it: what the protocol does not protect

- **The output.** Suppose that after the joint study, Toronto and Nairobi
  run the same protocol between the two of them "for an Earth-only
  baseline". Subtracting their joint $N$, $S$ and $Q$ from the three-clinic
  ones gives Arcadia's $n$, $S$ and $Q$ exactly: the mean and spread of twelve
  named children. Each run was secure; the combination of outputs leaks. This
  differencing attack, and the noise that defeats it, are the subject of
  [Chapter 19](19-Differential-Privacy.md).
- **A lying clinic.** A clinic can enter heights of 9 meters, and no MPC
  protocol can tell, because the ideal Trent would accept them too
  ([§1.4](01-Computing-With-Secrets.md)). Range proofs on the shares, as Prio
  attaches to every report (§10.8), can at least refuse impossible values.
- **A cheating clinic.** In round 2 a clinic can publish a wrong sum and
  skew the result. With SPDZ-style MACs (§10.6), each clinic's shares carry
  MACs from a preprocessing phase run beforehand, and a wrong sum is caught;
  the price is the preprocessing and one more round for the check.

## 10.11 Going deeper

*Level: expert.*

**Replicated sharing.** The fastest honest-majority protocols for three
parties use a different sharing. Write $x = x_1 + x_2 + x_3$ and give party
$i$ the pair $(x_i, x_{i+1})$, indices modulo 3. Any two parties together hold
all three pieces; any one holds two of them, which is still a uniformly random
pair. Now party $i$ can compute $x_i y_i + x_i y_{i+1} + x_{i+1} y_i$ locally,
and the three parties' results add up to $xy$: every one of the nine terms of
§10.2 is covered exactly once. Each party then sends one masked element to
its neighbor to restore the replicated form. One field element per party per
multiplication is the protocol of Araki, Furukawa, Lindell, Nof and Ohara
(2016) whose figures appear in §10.7. Malicious security at an honest
majority can then be added for a small constant factor (Furukawa, Lindell,
Nof and Weinstein, 2017; Chida, Genkin, Hamada, Ikarashi, Kikuchi, Lindell and
Nof, 2018), often by checking the computation on random linear combinations.

**Proofs on shares.** Prio's validity proofs grew into a general tool: Boneh,
Boyle, Corrigan-Gibbs, Gilboa and Ishai (2019) showed how a client can prove,
in zero knowledge, that secret-shared data satisfy a public predicate, with
proofs much shorter than the data, using "fully linear" probabilistically
checkable proofs. The same paper gives honest-majority MPC with malicious
security whose cost is dominated by the semi-honest protocol.

**Function secret sharing.** Boyle, Gilboa and Ishai (2015) showed how to
share a *function* rather than a value: two servers each get a key, and for
any input $x$ their outputs add up to $f(x)$, where $f$ is, for instance, a
point function that is zero everywhere but at one secret point. This gives
two-server private counting and heavy-hitter detection (the Poplar system,
2021) and fast comparisons in preprocessing-model MPC.

**MPC in the head.** Ishai, Kushilevitz, Ostrovsky and Sahai (2007) turned MPC
into zero-knowledge proofs: the prover simulates an MPC protocol among
imaginary parties that compute "is this witness valid?", commits to every
party's view, and opens a few views of the verifier's choosing. Because the
proof uses only commitments and symmetric primitives, it gives signatures
believed to resist quantum computers; several candidates in NIST's
additional signature process are built this way
([Post-quantum, Chapter 15](../post-quantum/15-Multivariate-Signatures-and-the-On-Ramp.md)).

**Which of this survives a quantum computer?** BGW and other
honest-majority protocols on Shamir or replicated shares are perfectly or
statistically secure, so a quantum computer changes nothing. SPDZ's online
phase is information-theoretic; its offline phase uses lattice-based
encryption, believed post-quantum, or oblivious transfer, which is
post-quantum only if the OT is built from post-quantum assumptions.
Garbled circuits and GMW inherit the status of their oblivious transfer: the
Diffie-Hellman transfers of Chapter 9 are not post-quantum, and recorded
transcripts could be decrypted later.

**Fewer rounds with homomorphic encryption.** Instead of interacting per
layer, the parties can encrypt their inputs under a threshold fully
homomorphic scheme whose decryption key is shared among them, let anyone
compute on the ciphertexts, and decrypt the result jointly. Asharov, Jain,
López-Alt, Tromer, Vaikuntanathan and Wichs (2012) showed this gives MPC in
a constant number of rounds. Today it is far more computation than secret
sharing, but for parties separated by minutes of light, it may be the right
trade ([Chapter 12](12-Homomorphic-Encryption.md)).

**Composition.** A protocol proved secure on its own may fail when run
alongside others or inside a larger system. Ran Canetti's universal
composability framework (2001) defines security so that it survives such
composition, and the SPDZ family and most modern frameworks are proved in
it, which is why their pieces can be combined like library functions. The
fairness limits of a dishonest majority, Cleve's theorem among them, are in
[§1.4](01-Computing-With-Secrets.md).

## Check yourself

??? question "1. Three parties hold additive shares of $x$ and $y$. How do they get shares of $5x - y + 2$, and how many messages does it take?"

    Each party computes $5x_i - y_i$, and one party (say party 1) adds 2. The
    new shares sum to $5x - y + 2$ because sharing is linear. No messages at
    all.

??? question "2. In GMW with four parties, how many oblivious transfers does one AND gate need?"

    One for every pair of parties, to handle the pair's two cross terms:
    $4 \cdot 3 / 2 = 6$. The four terms $x_i y_i$ are computed locally.

??? question "3. Two parties work modulo 11 with $x = 3$, $y = 4$ and a triple $a = 5$, $b = 2$, $c = 10$. What are $d$ and $e$, and what does the Beaver formula give?"

    $d = x - a = -2 \equiv 9$ and $e = y - b = 2$. Then
    $z = c + db + ea + de = 10 + 18 + 10 + 18 = 56 \equiv 1$, and indeed
    $3 \cdot 4 = 12 \equiv 1 \pmod{11}$. (In a real run each party computes its
    share of $c + db + ea$ and one adds $de$.)

??? question "4. Why does semi-honest BGW need $n \ge 2t + 1$ parties?"

    The local products lie on a polynomial of degree $2t$, and the degree
    reduction uses $2t + 1$ of its values to recover the constant term. With
    fewer parties, the product cannot be reconstructed, so the degree cannot
    be brought down. Equivalently, $t < n/2$: an honest majority.

??? question "5. A dealer hands out a faulty triple with $c = ab + 1$. What happens to the product, and how does SPDZ notice?"

    The output becomes $xy + 1$: the Beaver formula passes the error in $c$
    straight through. SPDZ's preprocessing checks triples by sacrifice: it
    uses a second triple to test the first in a way that opens a value that
    must be zero for correct triples, and discards the second. A faulty triple
    fails the test except with probability about $1/p$.

??? question "6. In the SPDZ MAC check, why must every party commit to its $\sigma_i$ before anyone opens?"

    Otherwise the last party to speak can see the others' $\sigma_j$ and
    choose its own as minus their sum, so that the total is zero whatever
    value was opened. Commitments fix every $\sigma_i$ before any is seen.

??? question "7. Why does the three-clinic study lose nothing by opening $N$, $S$ and $Q$ instead of computing the mean and variance on shares?"

    The published results are $N$, $\bar h = S/N$ and
    $s^2 = (NQ - S^2)/(N(N-1))$. From these anyone can solve for $S = N\bar h$
    and $Q = (s^2 N(N-1) + S^2)/N$. The two triples carry exactly the same
    information, so computing the division on shares would only add rounds.

??? question "8. A protocol needs 200 rounds. Roughly how long does it take between Earth and Mars at the farthest, and between two data centers 100 ms apart (round trip)?"

    Each round needs at least one one-way trip, up to 24 minutes to Mars:
    about $200 \times 24 = 4{,}800$ minutes, more than three days. Between
    data centers, with about 50 ms one way, at least 10 seconds, and twice
    that if each round needs a reply.

??? question "9. Intel revokes an attestation key after SGAxe and patches the microcode. Which data are protected again, and which are not?"

    New data are protected once clients refuse reports from unpatched
    machines or old keys. Data that were sent before, to an enclave on a
    machine the attacker controlled, may already have been read or copied,
    and nothing afterwards can undo that. A protocol whose security rests on
    mathematics and an honest-party assumption does not have this failure
    mode.

??? question "10. With two parties running SPDZ, one party aborts right after it sees the output. Can a better protocol prevent this? What does SPDZ guarantee instead?"

    Not in general. With a dishonest majority (and with two parties, one
    corrupted party is half of them), Cleve's theorem shows that complete
    fairness is impossible even for a coin flip: someone always learns the
    result first and can stop. SPDZ gives security with abort: the cheater
    cannot learn anything beyond the output or change it undetected, but it
    can deny the output to the honest party, who learns that the run failed.

## What you learned

- On shared values, addition and multiplication by constants are free;
  multiplying two shared values needs the cross terms of other parties'
  shares, and every MPC protocol is a way to get them safely.
- GMW computes Boolean circuits on XOR shares, with one 1-out-of-4 oblivious
  transfer per pair of parties per AND gate; it protects against any number
  of semi-honest colluders, and costs one round per layer of AND gates.
- BGW computes on Shamir shares: multiplying shares doubles the degree, and
  one round of resharing with Lagrange coefficients brings it back. It needs
  an honest majority (two-thirds against active cheaters) and no hardness
  assumption at all.
- Beaver triples move the cost of multiplication into an offline phase; the
  online phase opens $x - a$ and $y - b$ and finishes locally. A triple used
  twice leaks the difference of two inputs.
- SPDZ attaches an information-theoretic MAC $\alpha x$ to every shared
  value under a key nobody knows; a party who changes a share is caught with
  probability $1 - 1/p$, giving security with abort against a dishonest
  majority.
- Real deployments (the sugar beet auction, the Boston wage-gap study,
  Estonia's tax study, Private Join and Compute, threshold wallets, Prio)
  mostly compute sums and a few comparisons, and choose the trust model to fit
  the organizations involved.
- Trusted hardware is fast and simple but moves trust to one vendor; SGX's
  attestation and memory were broken by Foreshadow, Plundervolt and SGAxe,
  and Intel deprecated it on client processors in 2021.
- Over a link with minutes of delay, rounds cost more than bits: design the
  function so the expensive gates vanish, as the three clinics did.

**Next:** [Chapter 11](11-Private-Set-Intersection-OPRFs-and-PIR.md), the
special-purpose protocols that find what two lists share, evaluate a function
under someone else's key, and fetch a record without saying which.

## Further reading

- Andrew Yao, "Protocols for Secure Computations" (FOCS 1982).
- Oded Goldreich, Silvio Micali and Avi Wigderson, "How to Play Any Mental
  Game" (STOC 1987).
- Michael Ben-Or, Shafi Goldwasser and Avi Wigderson, "Completeness Theorems
  for Non-Cryptographic Fault-Tolerant Distributed Computation" (STOC 1988).
- David Chaum, Claude Crépeau and Ivan Damgård, "Multiparty Unconditionally
  Secure Protocols" (STOC 1988).
- Tal Rabin and Michael Ben-Or, "Verifiable Secret Sharing and Multiparty
  Protocols with Honest Majority" (STOC 1989).
- Donald Beaver, "Efficient Multiparty Protocols Using Circuit Randomization"
  (CRYPTO 1991).
- Rosario Gennaro, Michael Rabin and Tal Rabin, "Simplified VSS and
  Fast-Track Multiparty Computations with Applications to Threshold
  Cryptography" (PODC 1998).
- Gilad Asharov and Yehuda Lindell, "A Full Proof of the BGW Protocol for
  Perfectly Secure Multiparty Computation" (Journal of Cryptology, 2017;
  preprint 2011).
- Ivan Damgård, Valerio Pastro, Nigel Smart and Sarah Zakarias, "Multiparty
  Computation from Somewhat Homomorphic Encryption" (CRYPTO 2012).
- Ivan Damgård, Marcel Keller, Enrique Larraia, Valerio Pastro, Peter Scholl
  and Nigel Smart, "Practical Covertly Secure MPC for Dishonest Majority, or:
  Breaking the SPDZ Limits" (ESORICS 2013).
- Marcel Keller, Emmanuela Orsini and Peter Scholl, "MASCOT: Faster Malicious
  Arithmetic Secure Computation with Oblivious Transfer" (CCS 2016).
- Toshinori Araki, Jun Furukawa, Yehuda Lindell, Ariel Nof and Kazuma Ohara,
  "High-Throughput Semi-Honest Secure Three-Party Computation with an Honest
  Majority" (CCS 2016).
- Ronald Cramer, Ivan Damgård, Daniel Escudero, Peter Scholl and Chaoping
  Xing, "SPDZ$_{2^k}$: Efficient MPC mod $2^k$ for Dishonest Majority" (CRYPTO 2018).
- Marcel Keller, "MP-SPDZ: A Versatile Framework for Multi-Party
  Computation" (CCS 2020).
- Daniel Demmler, Thomas Schneider and Michael Zohner, "ABY: A Framework for
  Efficient Mixed-Protocol Secure Two-Party Computation" (NDSS 2015).
- Peter Bogetoft et al., "Secure Multiparty Computation Goes Live" (Financial
  Cryptography 2009): the sugar beet auction.
- Dan Bogdanov, Sven Laur and Jan Willemson, "Sharemind: A Framework for Fast
  Privacy-Preserving Computations" (ESORICS 2008).
- Dan Bogdanov, Liina Kamm, Baldur Kubo, Reimo Rebane, Ville Sokk and Riivo
  Talviste, "Students and Taxes: a Privacy-Preserving Study Using Secure
  Computation" (PoPETs 2016).
- Andrei Lapets, Frederick Jansen, Kinan Dak Albab, Rawane Issa, Lucy Qin,
  Mayank Varia and Azer Bestavros, "Accessible Privacy-Preserving Web-Based
  Data Analysis for Assessing and Addressing Economic Inequalities" (ACM
  COMPASS 2018): the Boston study.
- Mihaela Ion et al., "On Deploying Secure Computing: Private
  Intersection-Sum-with-Cardinality" (IEEE EuroS&P 2020).
- Henry Corrigan-Gibbs and Dan Boneh, "Prio: Private, Robust, and Scalable
  Computation of Aggregate Statistics" (NSDI 2017).
- Apple and Google, "Exposure Notification Privacy-preserving Analytics (ENPA)
  White Paper" (2021).
- Benjamin Case et al., "Interoperable Private Attribution: A Distributed
  Attribution and Aggregation Protocol" (2023 preprint; first proposed 2022).
- Jo Van Bulck et al., "Foreshadow: Extracting the Keys to the Intel SGX
  Kingdom with Transient Out-of-Order Execution" (USENIX Security 2018).
- Kit Murdock, David Oswald, Flavio Garcia, Jo Van Bulck, Daniel Gruss and
  Frank Piessens, "Plundervolt: Software-based Fault Injection Attacks
  against Intel SGX" (IEEE S&P 2020).
- Stephan van Schaik, Andrew Kwong, Daniel Genkin and Yuval Yarom, "SGAxe: How
  SGX Fails in Practice" (2020).
- Dan Boneh, Elette Boyle, Henry Corrigan-Gibbs, Niv Gilboa and Yuval Ishai,
  "Zero-Knowledge Proofs on Secret-Shared Data via Fully Linear PCPs" (CRYPTO
  2019).
- Yuval Ishai, Eyal Kushilevitz, Rafail Ostrovsky and Amit Sahai,
  "Zero-Knowledge from Secure Multiparty Computation" (STOC 2007).
- David Evans, Vladimir Kolesnikov and Mike Rosulek, *A Pragmatic
  Introduction to Secure Multi-Party Computation* (Now Publishers, 2018), free
  online: the best survey of the practical protocols.
- Ronald Cramer, Ivan Damgård and Jesper Buus Nielsen, *Secure Multiparty
  Computation and Secret Sharing* (Cambridge University Press, 2015).
- ISO/IEC 4922-2:2024, Secure multiparty computation, Part 2: Mechanisms
  based on secret sharing.
- Reference page: [Multi-party computation](../../11-advanced/MPC.md); the
  short version: [book 1, §23.6](../../book/23-Advanced-Protocols.md).
