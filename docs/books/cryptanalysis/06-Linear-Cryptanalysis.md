# 6. Linear Cryptanalysis and Its Relatives

*Differential cryptanalysis needs chosen plaintexts: the attacker must ask the
cipher to encrypt pairs of messages of the attacker's design. Linear
cryptanalysis asks for less. It needs only plaintexts and ciphertexts that an
eavesdropper happens to collect, and from them it pulls out key bits by
counting how often one XOR of bits equals another. This chapter builds the
method from a single S-box up: the linear approximation table, bias and
correlation, the piling-up lemma with its proof, a trail found by search through a 16-bit
toy cipher of the same shape as [Chapter 5](05-Differential-Cryptanalysis.md)'s
Toy16, and
both of Mitsuru Matsui's algorithms in code with the counts printed. You will
measure how much data an attack needs and see where the textbook estimate goes
wrong, follow Matsui to the 1994 experimental break of DES, and then go past the
single trail to linear hulls, many approximations at once, approximations whose
correlation is exactly zero, and the hybrid of differences and linear
approximations that still sets records on ARX ciphers today.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a linear approximation of an S-box is, how the linear approximation
      table is built, and the difference between bias and correlation;
    - the piling-up lemma, with a proof, and the independence it quietly assumes;
    - how to find a linear trail through a toy SPN by search, and how to turn it
      into key bits with Matsui's Algorithm 1 and Algorithm 2;
    - how much data an attack needs, where $1/\varepsilon^2$ comes from, and why
      real success rates fall below the formula;
    - how Matsui broke DES: $2^{47}$ known plaintexts on paper in 1993, $2^{43}$ in
      a 1994 experiment on twelve workstations;
    - linear hulls, multiple and multidimensional linear attacks, zero-correlation
      attacks and differential-linear attacks, each run on the toy cipher;
    - how designers bound linear trails with the wide trail strategy and branch
      numbers, and what the best linear attacks on AES, PRESENT and SIMON reach.

    **You need:** [Chapter 5](05-Differential-Cryptanalysis.md) (Toy16, the
    last-round attack and the habit of following something through rounds), book 1's
    [Chapter 6](../../book/06-Block-Ciphers.md), whose §6.9 runs a first linear
    attack on the toy cipher that this chapter builds on rather than repeats, and
    [Chapter 7](../../book/07-AES.md) of book 1 for the structure of AES. XOR,
    binary numbers, and the normal distribution's bell curve.

    **Levels:** §6.1 to §6.3 are for beginners, §6.4 to §6.8, §6.12 and §6.13
    are intermediate, §6.9 to §6.11 and §6.14 are expert.

## 6.1 The problem

*Level: beginner.*

In 1990 Eli Biham and Adi Shamir showed that a block cipher could be attacked by
following differences between pairs of plaintexts (Chapter 5). The attack was
powerful, but it had a practical weakness: it needed **chosen** plaintexts. To
break DES that way an attacker had to persuade the victim's machine to encrypt
$2^{47}$ messages of the attacker's choosing. A bank does not do that for
strangers.

What an attacker can usually get is much plainer. Messages have headers, dates,
greetings and padding. A disk sector that is mostly zeros, a file format that
always starts the same way, a terminal that sends the same command every morning:
each gives a block of **known** plaintext together with its ciphertext. The
question that Mitsuru Matsui of Mitsubishi Electric answered in 1993 is whether
enough such pairs, none of them chosen, are enough to recover the key.

His answer starts from a simple observation. Every bit of a ciphertext is some
complicated function of the plaintext and key bits. No bit of the ciphertext is
a linear function of the plaintext, or the cipher would be broken by solving a
system of equations. But some XOR of plaintext bits, ciphertext bits and key bits
might be equal to zero a little more often than half the time. If

$$
P_{i_1} \oplus \cdots \oplus P_{i_a} \oplus C_{j_1} \oplus \cdots \oplus C_{j_b}
= K_{k_1} \oplus \cdots \oplus K_{k_c}
$$

holds with probability $\frac12 + \varepsilon$ for some small $\varepsilon$, then
an attacker who collects many plaintext-ciphertext pairs can count how often the
left side is 0. If it is 0 more than half the time, the key bits on the right
probably XOR to 0 (for positive $\varepsilon$); if less, to 1. That is one bit of
key information from nothing but eavesdropping. A cleverer version peels off the
last round by guessing a few key bits, and the right guess makes the count stand
out from all the wrong ones.

This is **linear cryptanalysis**. It had a history before it had a name. In 1985
Adi Shamir had remarked on unexpected regularities in the S-boxes of DES, but no
one turned them into an attack. In 1991 Anne Tardy-Corfdir and Henri Gilbert
attacked the Japanese cipher FEAL with known plaintexts, and in 1992 Matsui and
Atsuhiro Yamagishi published a sharper linear-style attack on FEAL. Matsui then
made the method general, gave it its tools (the linear approximation table, the
piling-up lemma, and two algorithms for using an approximation) and aimed it at
DES. His paper at EUROCRYPT 1993 estimated that full 16-round DES would fall to
$2^{47}$ known plaintexts. A year later he refined the attack to $2^{43}$ and
ran it: in about fifty days of computing on twelve workstations he recovered a
DES key. It was the first experimental break of full DES faster than searching
every key.

Book 1's [§6.9](../../book/06-Block-Ciphers.md) already ran a first linear
attack on the toy cipher, using a trail from Howard Heys's tutorial and a
straightforward count over 256 guesses. This chapter goes further in every
direction. It derives the tools instead of quoting them, finds trails by search
instead of by hand, runs both of Matsui's algorithms with the data cost
measured, and then asks what the single-trail picture leaves out. That last
question has kept cryptanalysts busy for thirty years: the correlation of an
approximation depends on the key, many trails add up or cancel, many
approximations can be used together, an approximation that holds with
probability *exactly* one half is also useful, and differences and linear
approximations can be glued together. Figure 6.1 places these ideas in time.

<figure class="mars-fig">
<svg viewBox="0 0 640 367" width="640" role="img" aria-label="Timeline of linear cryptanalysis from 1985 to 2020" fill="currentColor" font-size="14">
<line x1="82" y1="8" x2="82" y2="359" stroke="currentColor" stroke-width="1.6"/>
<text x="68" y="27" text-anchor="end" font-weight="bold">1985</text>
<circle cx="82" cy="22" r="4" fill="currentColor"/>
<text x="98" y="27">Shamir notices odd regularities in the DES S-boxes</text>
<text x="68" y="54" text-anchor="end" font-weight="bold">1991</text>
<circle cx="82" cy="49" r="4" fill="currentColor"/>
<text x="98" y="54">Tardy-Corfdir and Gilbert: known-plaintext attacks on FEAL</text>
<text x="68" y="81" text-anchor="end" font-weight="bold">1992</text>
<circle cx="82" cy="76" r="4" fill="currentColor"/>
<text x="98" y="81">Matsui and Yamagishi: a linear attack on FEAL</text>
<text x="68" y="108" text-anchor="end" font-weight="bold">1993</text>
<circle cx="82" cy="103" r="4" fill="currentColor"/>
<text x="98" y="108">Matsui: linear cryptanalysis; full DES in theory, 2⁴⁷ texts</text>
<text x="68" y="135" text-anchor="end" font-weight="bold">1994</text>
<circle cx="82" cy="130" r="4" fill="currentColor"/>
<text x="98" y="135">Matsui breaks DES with 2⁴³ texts on twelve workstations</text>
<text x="68" y="162" text-anchor="end" font-weight="bold">1994</text>
<circle cx="82" cy="157" r="4" fill="currentColor"/>
<text x="98" y="162">Langford and Hellman: differential-linear; Nyberg: linear hulls</text>
<text x="68" y="189" text-anchor="end" font-weight="bold">1994</text>
<circle cx="82" cy="184" r="4" fill="currentColor"/>
<text x="98" y="189">Kaliski and Robshaw: several approximations at once</text>
<text x="68" y="216" text-anchor="end" font-weight="bold">2001</text>
<circle cx="82" cy="211" r="4" fill="currentColor"/>
<text x="98" y="216">AES published, designed by the wide trail strategy</text>
<text x="68" y="243" text-anchor="end" font-weight="bold">2004</text>
<circle cx="82" cy="238" r="4" fill="currentColor"/>
<text x="98" y="243">Biryukov, De Cannière and Quisquater: multiple linear</text>
<text x="68" y="270" text-anchor="end" font-weight="bold">2009</text>
<circle cx="82" cy="265" r="4" fill="currentColor"/>
<text x="98" y="270">Hermelin, Cho and Nyberg: multidimensional Algorithm 2</text>
<text x="68" y="297" text-anchor="end" font-weight="bold">2011</text>
<circle cx="82" cy="292" r="4" fill="currentColor"/>
<text x="98" y="297">Bogdanov and Rijmen: zero-correlation attacks</text>
<text x="68" y="324" text-anchor="end" font-weight="bold">2019</text>
<circle cx="82" cy="319" r="4" fill="currentColor"/>
<text x="98" y="324">The differential-linear connectivity table</text>
<text x="68" y="351" text-anchor="end" font-weight="bold">2020</text>
<circle cx="82" cy="346" r="4" fill="currentColor"/>
<text x="98" y="351">Linear key recovery on 28 of PRESENT's 31 rounds</text>
</svg>
<figcaption>Figure 6.1. Linear cryptanalysis in time. The basic method was complete by 1994; the thirty years since have been spent on what a single trail misses (hulls, many approximations, zero correlation) and on combining it with differences.</figcaption>
</figure>

The attacker's model throughout is **known plaintext**: random plaintexts the
attacker did not choose, with their ciphertexts, all under one unknown key. The
costs are the three of [Chapter 1](01-What-Cryptanalysis-Is.md): data (how many
pairs), time (how much work to process them and finish the key), and memory. For
linear attacks the data cost is the hard limit. Time can be bought; known
plaintexts under one key cannot, and for a 64-bit block cipher there are only
$2^{64}$ of them in all.

## 6.2 Linear approximations of an S-box

*Level: beginner.*

A cipher is built from small nonlinear pieces, the S-boxes, and large linear
pieces: XOR with key bits, bit permutations, mixing layers. The linear pieces
pass linear relations through without loss. So the place to look for an
approximate linear relation is the S-box.

The toy cipher's S-box is the 4-bit box from Howard Heys's tutorial, the one
book 1 uses. ([Chapter 5](05-Differential-Cryptanalysis.md)'s Toy16 uses
PRESENT's S-box instead; §6.4 runs the same trail search on it for comparison.)

| $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $S(x)$ | E | 4 | D | 1 | 2 | F | B | 8 | 3 | A | 6 | C | 5 | 9 | 0 | 7 |

Write the input as bits $X_1X_2X_3X_4$ and the output as $Y_1Y_2Y_3Y_4$, with
$X_1$ the leftmost (most significant) bit. A **linear approximation** of the
S-box picks some input bits and some output bits and claims that their XOR is
zero:

$$
X_3 \oplus X_4 \oplus Y_1 \oplus Y_4 = 0 .
$$

We describe the choice by two **masks**, 4-bit numbers with a 1 wherever a bit is
picked. Here the input mask is $a = 0011_2 = 3$ and the output mask is
$b = 1001_2 = 9$. With the dot product of bit strings,
$a \cdot x = a_1x_1 \oplus a_2x_2 \oplus a_3x_3 \oplus a_4x_4$ (the parity of
$a$ AND $x$), the approximation is

$$
a \cdot x = b \cdot S(x).
$$

### One entry by hand

Check this approximation on all sixteen inputs. For each $x$ write the parity of
bits 3 and 4 of $x$, then the parity of bits 1 and 4 of $S(x)$:

| $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $X_3 \oplus X_4$ | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 |
| $S(x)$ | E | 4 | D | 1 | 2 | F | B | 8 | 3 | A | 6 | C | 5 | 9 | 0 | 7 |
| $Y_1 \oplus Y_4$ | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 1 |
| equal? | | | | | ✓ | | | | | ✓ | | | | | | |

Take $x = 4 = 0100_2$: bits 3 and 4 are 0 and 0, parity 0. $S(4) = 2 = 0010_2$:
bits 1 and 4 are 0 and 0, parity 0. Equal. Take $x = 0$: parity 0 on the input
side, but $S(0) = \mathrm{E} = 1110_2$ has bits 1 and 4 equal to 1 and 0, parity
1. Not equal. Going across the row, the two sides agree for only two inputs,
$x = 4$ and $x = 9$. The approximation is a bad one, which makes it a very good
one: its opposite,

$$
X_3 \oplus X_4 \oplus Y_1 \oplus Y_4 = 1,
$$

holds for 14 of the 16 inputs. For an attacker, a relation that is almost always
false is as useful as one that is almost always true. Figure 6.2 draws it.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The toy S-box with input bits X3 and X4 and output bits Y1 and Y4 selected; the XOR of the four agrees in only 2 of 16 inputs" fill="currentColor" font-size="14">
<rect x="230" y="95" width="180" height="60" fill="currentColor" opacity="0.08" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="130" text-anchor="middle" font-weight="bold">S</text>
<line x1="260" y1="45" x2="260" y2="95" stroke="currentColor" stroke-width="1" opacity="0.45"/>
<text x="260" y="38" text-anchor="middle" opacity="0.55">X1</text>
<line x1="260" y1="155" x2="260" y2="205" stroke="currentColor" stroke-width="3" opacity="1"/>
<text x="260" y="222" text-anchor="middle" opacity="1">Y1</text>
<line x1="300" y1="45" x2="300" y2="95" stroke="currentColor" stroke-width="1" opacity="0.45"/>
<text x="300" y="38" text-anchor="middle" opacity="0.55">X2</text>
<line x1="300" y1="155" x2="300" y2="205" stroke="currentColor" stroke-width="1" opacity="0.45"/>
<text x="300" y="222" text-anchor="middle" opacity="0.55">Y2</text>
<line x1="340" y1="45" x2="340" y2="95" stroke="currentColor" stroke-width="3" opacity="1"/>
<text x="340" y="38" text-anchor="middle" opacity="1">X3</text>
<line x1="340" y1="155" x2="340" y2="205" stroke="currentColor" stroke-width="1" opacity="0.45"/>
<text x="340" y="222" text-anchor="middle" opacity="0.55">Y3</text>
<line x1="380" y1="45" x2="380" y2="95" stroke="currentColor" stroke-width="3" opacity="1"/>
<text x="380" y="38" text-anchor="middle" opacity="1">X4</text>
<line x1="380" y1="155" x2="380" y2="205" stroke="currentColor" stroke-width="3" opacity="1"/>
<text x="380" y="222" text-anchor="middle" opacity="1">Y4</text>
<text x="20" y="60">input mask 3 = 0011</text>
<text x="20" y="80" font-size="13">picks X3 and X4</text>
<text x="20" y="180">output mask 9 = 1001</text>
<text x="20" y="200" font-size="13">picks Y1 and Y4</text>
<text x="440" y="110">X3 ⊕ X4 ⊕ Y1 ⊕ Y4 = 0</text>
<text x="440" y="132">holds for 2 of 16 inputs</text>
<text x="440" y="154">bias −6/16, correlation −3/4</text>
<text x="440" y="176" font-size="13">(so X3 ⊕ X4 ⊕ Y1 ⊕ Y4 = 1</text>
<text x="440" y="194" font-size="13">holds 14 times in 16)</text>
</svg>
<figcaption>Figure 6.2. One linear approximation of the toy S-box. The thick wires are the bits the masks pick. A random 4-bit function would make the four bits' XOR zero about 8 times in 16; this S-box makes it zero only twice.</figcaption>
</figure>

### Bias and correlation

There are two common ways to say how far an approximation is from a coin toss,
and the literature uses both, so it is worth being exact. If the approximation
holds with probability $p$, its **bias** is

$$
\varepsilon = p - \tfrac12 ,
$$

a number between $-\frac12$ and $+\frac12$. Its **correlation** is

$$
c = \Pr[\text{holds}] - \Pr[\text{fails}] = 2p - 1 = 2\varepsilon ,
$$

between $-1$ and $+1$. Matsui wrote biases. Most papers since the late 1990s
write correlations, because correlations multiply cleanly (§6.3) and because the
correlation is an average of signs:

$$
c = \mathbb{E}_x\left[(-1)^{a \cdot x \,\oplus\, b \cdot S(x)}\right].
$$

For our example $p = 2/16$, so $\varepsilon = -6/16 = -0.375$ and
$c = -12/16 = -0.75$. This chapter uses both, always named.

### The linear approximation table

Doing that by hand for every pair of masks gives the **linear approximation
table** (LAT). Entry $(a, b)$ is the number of inputs for which
$a \cdot x = b \cdot S(x)$, minus 8. Dividing an entry by 16 gives the bias;
dividing by 8 gives the correlation.

**Code it.**

```python
SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]

def parity(x):                          # XOR of the bits of x
    return bin(x).count("1") & 1

# LAT[a][b] = (number of x with a.x = b.S(x)) - 8
LAT = [[sum(parity(x & a) == parity(SBOX[x] & b) for x in range(16)) - 8
        for b in range(16)] for a in range(16)]

print("a\\b " + " ".join("%2X" % b for b in range(16)))
for a in range(16):
    print(" %X  " % a + " ".join("%2d" % LAT[a][b] for b in range(16)))

print("input mask 3, output mask 9: holds", LAT[3][9] + 8, "times in 16,",
      "bias", LAT[3][9], "/ 16, correlation", LAT[3][9], "/ 8")
print("largest entry:", max(abs(LAT[a][b]) for a in range(1, 16) for b in range(16)))
print("each row's squares add to 64:", {sum(v * v for v in row) for row in LAT})
```

It prints:

```text
a\b  0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
 0   8  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0
 1   0  0 -2 -2  0  0 -2  6  2  2  0  0  2  2  0  0
 2   0  0 -2 -2  0  0 -2 -2  0  0  2  2  0  0 -6  2
 3   0  0  0  0  0  0  0  0  2 -6 -2 -2  2  2 -2 -2
 4   0  2  0 -2 -2 -4 -2  0  0 -2  0  2  2 -4  2  0
 5   0 -2 -2  0 -2  0  4  2 -2  0 -4  2  0 -2 -2  0
 6   0  2 -2  4  2  0  0  2  0 -2  2  4 -2  0  0 -2
 7   0 -2  0  2  2 -4  2  0 -2  0  2  0  4  2  0  2
 8   0  0  0  0  0  0  0  0 -2  2  2 -2  2 -2 -2 -6
 9   0  0 -2 -2  0  0 -2 -2 -4  0 -2  2  0  4  2 -2
 A   0  4 -2  2 -4  0  2 -2  2  2  0  0  2  2  0  0
 B   0  4  0 -4  4  0  4  0  0  0  0  0  0  0  0  0
 C   0 -2  4 -2 -2  0  2  0  2  0  2  4  0  2  0 -2
 D   0  2  2  0 -2  4  0  2 -4 -2  2  0  2  0  0  2
 E   0  2  2  0 -2 -4  0  2 -2  0  0 -2 -4  2 -2  0
 F   0 -2 -4 -2 -2  0  2  0  0 -2  4 -2 -2  0  2  0
input mask 3, output mask 9: holds 2 times in 16, bias -6 / 16, correlation -6 / 8
largest entry: 6
each row's squares add to 64: {64}
```

Some features are worth reading off.

- Row 0 and column 0 are zero except for the corner. Mask $a = 0$ with $b \neq 0$
  says $b \cdot S(x)$ is 0, which is true for exactly half the inputs because the
  S-box is a permutation: every output bit combination is balanced.
- Every entry is even. That holds for every 4-bit permutation, not only this
  one: each output combination $b \cdot S(x)$ of a 4-bit permutation has
  algebraic degree at most 3, and such a function agrees with a linear function
  an even number of times.
- The largest entry is $\pm 6$, a bias of $\pm\frac38$ and a correlation of
  $\pm\frac34$. There are four of them: $(1, 7)$, $(2, \mathrm{E})$, $(3, 9)$ and
  $(8, \mathrm{F})$. For a designer these are flaws; the best 4-bit S-boxes have
  no entry beyond $\pm 4$. PRESENT's S-box (§6.13) is one of them.
- The squares in each row add up to 64. This is **Parseval's relation**: for a
  fixed input mask, the squared correlations over all output masks add up to 1.
  An S-box cannot make every approximation weak; if it weakens some, others must
  grow. The designer can only spread the total evenly.

The sign-average formula above is a Walsh-Hadamard transform: the LAT is the
Walsh spectrum of the S-box's component functions $x \mapsto b \cdot S(x)$. That
view matters in §6.14, where it gives the fast transform that real attacks use to
count key guesses. For a 4-bit box, counting is fine.

### Why linear approximations pass through the rest of the cipher

The other layers of an SPN keep masks exact. XOR with a key: if the state going
in is $x$, the state coming out is $x \oplus k$, and
$a \cdot (x \oplus k) = a \cdot x \oplus a \cdot k$. The mask passes through
unchanged, and the key contributes the fixed bit $a \cdot k$, the same for every
message. A bit permutation moves bits, so it moves the mask bits the same way. A
general linear map $y = Mx$ sends mask $b$ on the output to mask $M^{\mathsf T} b$
on the input, because $b \cdot Mx = (M^{\mathsf T} b) \cdot x$. Only the S-boxes
cost anything. Every attack in this chapter follows from that.

## 6.3 Bias, correlation and the piling-up lemma

*Level: beginner.*

An approximation across one S-box is easy. An approximation across a whole cipher
is a chain of them: the output bits picked in round 1 are the input bits of the
approximations in round 2, and so on. If each link holds with some probability,
how likely is the whole chain?

### The lemma

Matsui's answer is the **piling-up lemma**. Let $X_1, \ldots, X_n$ be
independent random bits, with $\Pr[X_i = 0] = \frac12 + \varepsilon_i$. Then

$$
\Pr[X_1 \oplus X_2 \oplus \cdots \oplus X_n = 0]
= \tfrac12 + 2^{n-1} \prod_{i=1}^{n} \varepsilon_i .
$$

In correlations it is even shorter. If $c_i = 2\varepsilon_i$ is the correlation
of $X_i$ (that is, $\mathbb{E}[(-1)^{X_i}]$), then the XOR has correlation

$$
c = c_1 c_2 \cdots c_n .
$$

### Proof

The correlation form proves itself. Since $(-1)^{u \oplus v} = (-1)^u (-1)^v$
for bits,

$$
\mathbb{E}\left[(-1)^{X_1 \oplus \cdots \oplus X_n}\right]
= \mathbb{E}\left[(-1)^{X_1} \cdots (-1)^{X_n}\right]
= \mathbb{E}\left[(-1)^{X_1}\right] \cdots \mathbb{E}\left[(-1)^{X_n}\right],
$$

and the last step, the expectation of a product equals the product of
expectations, is exactly where independence is used. Translating back,
$\Pr[\text{XOR} = 0] = \frac12 + \frac12 \prod c_i = \frac12 + \frac12 \prod
2\varepsilon_i = \frac12 + 2^{n-1}\prod \varepsilon_i$.

For readers who prefer to see the probabilities, here is the case $n = 2$ by
hand, which gives the general case by induction. $X_1 \oplus X_2 = 0$ when both
are 0 or both are 1:

$$
\begin{aligned}
\Pr[X_1 \oplus X_2 = 0]
&= (\tfrac12 + \varepsilon_1)(\tfrac12 + \varepsilon_2)
 + (\tfrac12 - \varepsilon_1)(\tfrac12 - \varepsilon_2) \\
&= \tfrac14 + \tfrac12\varepsilon_2 + \tfrac12\varepsilon_1 + \varepsilon_1\varepsilon_2
 + \tfrac14 - \tfrac12\varepsilon_2 - \tfrac12\varepsilon_1 + \varepsilon_1\varepsilon_2 \\
&= \tfrac12 + 2\varepsilon_1\varepsilon_2 .
\end{aligned}
$$

Now suppose the lemma holds for $n - 1$ bits, so $Z = X_1 \oplus \cdots \oplus
X_{n-1}$ has bias $2^{n-2}\prod_{i<n}\varepsilon_i$. $Z$ depends only on the first
$n-1$ bits, so it is independent of $X_n$, and the two-bit case gives bias
$2 \cdot 2^{n-2}\prod_{i<n}\varepsilon_i \cdot \varepsilon_n = 2^{n-1}\prod
\varepsilon_i$. $\square$

Two consequences are worth stating. If any one $\varepsilon_i$ is 0, the whole
chain has bias 0: one perfectly balanced link destroys the approximation. And
because every $|c_i| < 1$ in a real cipher, the correlation shrinks
geometrically with the number of links. Four links of correlation $\frac12$ give
$\frac1{16}$; eight give $\frac1{256}$. That shrinking is what a designer
counts on.

### Where independence fails

In a cipher the links are not independent random bits. They are functions of
the same plaintext and of each other. Matsui's own justification was heuristic:
with independent, uniformly random round keys, the inputs of each round's S-boxes
are uniformly distributed and independent of the previous rounds, and the lemma
then holds on average over the keys. That is good enough to *design* an attack,
and §6.9 will show what it hides. Inside one round it can fail completely, as the
second half of the next program shows.

**Code it.**

```python
from itertools import product

def exact(probs):                       # P(X1 xor ... xor Xn = 0), by listing every outcome
    total = 0
    for bits in product((0, 1), repeat=len(probs)):
        weight = 1
        for b, p in zip(bits, probs):
            weight *= p if b == 0 else 1 - p
        if sum(bits) % 2 == 0:
            total += weight
    return total

probs = [0.75, 0.25, 0.25, 0.25]        # each Xi = 0 with this probability
eps = [p - 0.5 for p in probs]
lemma = 0.5 + 2 ** (len(eps) - 1) * eps[0] * eps[1] * eps[2] * eps[3]
print("exact %.5f  lemma %.5f" % (exact(probs), lemma))

# Two approximations of the SAME S-box are not independent.
SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]
def parity(x):
    return bin(x).count("1") & 1
def bias(a, b):
    return sum(parity(x & a) == parity(SBOX[x] & b) for x in range(16)) / 16 - 0.5
e1, e2 = bias(0xA, 4), bias(0xB, 3)
print("biases", e1, e2, " lemma says", 2 * e1 * e2, " truth is", bias(0xA ^ 0xB, 4 ^ 3))
```

It prints:

```text
exact 0.46875  lemma 0.46875
biases -0.25 -0.25  lemma says 0.125  truth is 0.375
```

The first line takes four independent bits with biases $+\frac14, -\frac14,
-\frac14, -\frac14$ (the shape of Heys's trail in book 1), lists every one of the
16 outcomes, and gets the lemma's $\frac12 - \frac1{32}$ exactly. The second line
takes two approximations of the *same* S-box, $\mathrm{A} \to 4$ and
$\mathrm{B} \to 3$, each with bias $-\frac14$. The lemma would predict that
their XOR has bias $2 \cdot \frac14 \cdot \frac14 = \frac18$. But the XOR of the
two approximations is itself an approximation of the same S-box: its masks are
$\mathrm{A} \oplus \mathrm{B} = 1$ and $4 \oplus 3 = 7$, and the table says
$\mathrm{LAT}[1][7] = 6$, a bias of $\frac38$, three times the prediction. The
two events were not independent, because they were computed from the same $x$.
Attacks therefore never pile up two approximations of one S-box; they read the
combined approximation straight from the table.

## 6.4 A linear trail through the toy cipher

*Level: intermediate.*

The toy cipher has the shape of [Chapter 5](05-Differential-Cryptanalysis.md)'s
Toy16, with the S-box and permutation of book 1's toy cipher, so that book 1's
first linear attack carries straight over. It is defined again here so that this
chapter stands on its own. The block is 16
bits, split into four 4-bit pieces (nibbles), numbered 1 to 4 from the left; bits
are numbered 1 to 16 from the left. There are five independent 16-bit round keys
$K_1, \ldots, K_5$, 80 key bits in all. Rounds 1 to 3 each XOR the round key,
apply the S-box to each nibble, and permute the bits: bit $i$ of nibble $j$ moves
to bit $j$ of nibble $i$, a transpose of the $4 \times 4$ array of bits. Round 4
XORs $K_4$, applies the S-boxes, and XORs $K_5$, with no permutation. Write
$U_r$ for the 16-bit state entering round $r$'s S-boxes (after the key XOR); a
mask on $U_r$ is written in hex, so $\texttt{0033}$ picks bits 11, 12, 15 and 16.

### A trail by hand

A **linear trail** (Matsui said "characteristic") is a list of masks, one at the
input of each round's S-boxes, together with the output masks each active S-box
uses. Here is the trail this chapter attacks with, found by the search below and
drawn in Figure 6.3:

$$
\texttt{0033} \xrightarrow{\ \text{round 1}\ } \texttt{3003}
\xrightarrow{\ \text{round 2}\ } \texttt{9009}
\xrightarrow{\ \text{round 3}\ } \texttt{9000}.
$$

<div class="mars-steps" markdown>

1. **Round 1.** The plaintext mask $\texttt{0033}$ makes S-boxes 3 and 4 active,
   each with input mask 3. Use the table's strongest entry in that row,
   $\mathrm{LAT}[3][9] = -6$: output mask 9, correlation $-\frac34$ each. The
   output mask of the S-layer is $\texttt{0099}$. The permutation sends bits 1
   and 4 of nibble 3 to bit 3 of nibbles 1 and 4, and bits 1 and 4 of nibble 4
   to bit 4 of nibbles 1 and 4. The mask entering round 2 is $\texttt{3003}$.
2. **Round 2.** S-boxes 1 and 4 are active, again with input mask 3. Use
   $3 \to 9$ again, correlation $-\frac34$ each. Output $\texttt{9009}$, which the
   permutation maps to itself: nibble 1's bits 1 and 4 go to bit 1 of nibbles 1
   and 4, and nibble 4's go to bit 4 of the same two nibbles.
3. **Round 3.** S-boxes 1 and 4 have input mask 9. Of the two best entries in
   that row take $\mathrm{LAT}[9][8] = -4$, whose output mask 8 is a single bit: correlation $-\frac12$ each. Output
   $\texttt{8008}$, permuted to $\texttt{9000}$.
4. **Total.** Six active S-boxes, so by the piling-up lemma the correlation is
   $(-\frac34)^4 (-\frac12)^2 = \frac{81}{1024} \approx 0.079$, a bias of
   $\frac{81}{2048} \approx 0.040$.

</div>

Book 1's trail (Heys's) has bias $\frac1{32} \approx 0.031$ and ends on two
S-boxes of round 4; this one is a little stronger and ends on only one, so the
attack in §6.6 has 4 key bits to guess instead of 8. Each step uses an S-box
twice in the same round on the same input mask, which is why the trail is so
regular.

Written out with every key bit, the trail says that

$$
P \cdot \texttt{0033} \;\oplus\; U_4 \cdot \texttt{9000}
\;=\; K_1 \cdot \texttt{0033} \oplus K_2 \cdot \texttt{3003} \oplus K_3 \cdot \texttt{9009}
\oplus K_4 \cdot \texttt{9000}
$$

holds with correlation about $\frac{81}{1024}$. Each key term appears because
the mask passes a key XOR on its way: $U_1 = P \oplus K_1$, and each later $U_r$
is the permuted S-box output XOR $K_r$. The right side is one fixed bit, unknown
to the attacker but the same for every message. So the left side is either biased toward 0 or toward 1, by about
4 percent, depending on the key.

<figure class="mars-fig">
<svg viewBox="0 0 640 470" width="640" role="img" aria-label="The linear trail 0033, 3003, 9009, 9000 drawn through the four rounds of the toy cipher, with the active S-boxes shaded" fill="currentColor" font-size="13">
<rect x="70" y="40" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="120.0" y="62" text-anchor="middle" opacity="0.5">S</text>
<rect x="210" y="40" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="260.0" y="62" text-anchor="middle" opacity="0.5">S</text>
<rect x="350" y="40" width="100" height="34" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.8"/>
<text x="400.0" y="62" text-anchor="middle" font-weight="bold">3 → 9</text>
<rect x="490" y="40" width="100" height="34" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.8"/>
<text x="540.0" y="62" text-anchor="middle" font-weight="bold">3 → 9</text>
<text x="8" y="62" font-size="12">round 1</text>
<text x="632" y="34" text-anchor="end" font-size="12">U1 = 0033</text>
<line x1="412" y1="26" x2="412" y2="40" stroke="currentColor" stroke-width="2.6"/>
<line x1="436" y1="26" x2="436" y2="40" stroke="currentColor" stroke-width="2.6"/>
<line x1="552" y1="26" x2="552" y2="40" stroke="currentColor" stroke-width="2.6"/>
<line x1="576" y1="26" x2="576" y2="40" stroke="currentColor" stroke-width="2.6"/>
<line x1="364" y1="74" x2="132" y2="136" stroke="currentColor" stroke-width="2.6"/>
<line x1="436" y1="74" x2="552" y2="136" stroke="currentColor" stroke-width="2.6"/>
<line x1="504" y1="74" x2="156" y2="136" stroke="currentColor" stroke-width="2.6"/>
<line x1="576" y1="74" x2="576" y2="136" stroke="currentColor" stroke-width="2.6"/>
<rect x="70" y="150" width="100" height="34" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.8"/>
<text x="120.0" y="172" text-anchor="middle" font-weight="bold">3 → 9</text>
<rect x="210" y="150" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="260.0" y="172" text-anchor="middle" opacity="0.5">S</text>
<rect x="350" y="150" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="400.0" y="172" text-anchor="middle" opacity="0.5">S</text>
<rect x="490" y="150" width="100" height="34" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.8"/>
<text x="540.0" y="172" text-anchor="middle" font-weight="bold">3 → 9</text>
<text x="8" y="172" font-size="12">round 2</text>
<text x="632" y="144" text-anchor="end" font-size="12">U2 = 3003</text>
<line x1="132" y1="136" x2="132" y2="150" stroke="currentColor" stroke-width="2.6"/>
<line x1="156" y1="136" x2="156" y2="150" stroke="currentColor" stroke-width="2.6"/>
<line x1="552" y1="136" x2="552" y2="150" stroke="currentColor" stroke-width="2.6"/>
<line x1="576" y1="136" x2="576" y2="150" stroke="currentColor" stroke-width="2.6"/>
<line x1="84" y1="184" x2="84" y2="246" stroke="currentColor" stroke-width="2.6"/>
<line x1="156" y1="184" x2="504" y2="246" stroke="currentColor" stroke-width="2.6"/>
<line x1="504" y1="184" x2="156" y2="246" stroke="currentColor" stroke-width="2.6"/>
<line x1="576" y1="184" x2="576" y2="246" stroke="currentColor" stroke-width="2.6"/>
<rect x="70" y="260" width="100" height="34" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.8"/>
<text x="120.0" y="282" text-anchor="middle" font-weight="bold">9 → 8</text>
<rect x="210" y="260" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="260.0" y="282" text-anchor="middle" opacity="0.5">S</text>
<rect x="350" y="260" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="400.0" y="282" text-anchor="middle" opacity="0.5">S</text>
<rect x="490" y="260" width="100" height="34" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.8"/>
<text x="540.0" y="282" text-anchor="middle" font-weight="bold">9 → 8</text>
<text x="8" y="282" font-size="12">round 3</text>
<text x="632" y="254" text-anchor="end" font-size="12">U3 = 9009</text>
<line x1="84" y1="246" x2="84" y2="260" stroke="currentColor" stroke-width="2.6"/>
<line x1="156" y1="246" x2="156" y2="260" stroke="currentColor" stroke-width="2.6"/>
<line x1="504" y1="246" x2="504" y2="260" stroke="currentColor" stroke-width="2.6"/>
<line x1="576" y1="246" x2="576" y2="260" stroke="currentColor" stroke-width="2.6"/>
<line x1="84" y1="294" x2="84" y2="356" stroke="currentColor" stroke-width="2.6"/>
<line x1="504" y1="294" x2="156" y2="356" stroke="currentColor" stroke-width="2.6"/>
<rect x="70" y="370" width="100" height="34" fill="currentColor" opacity="0.18" stroke="currentColor" stroke-width="1.8"/>
<text x="120.0" y="392" text-anchor="middle" font-weight="bold">9 → 8</text>
<rect x="210" y="370" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="260.0" y="392" text-anchor="middle" opacity="0.5">S</text>
<rect x="350" y="370" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="400.0" y="392" text-anchor="middle" opacity="0.5">S</text>
<rect x="490" y="370" width="100" height="34" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="540.0" y="392" text-anchor="middle" opacity="0.5">S</text>
<text x="8" y="392" font-size="12">round 4</text>
<text x="632" y="364" text-anchor="end" font-size="12">U4 = 9000</text>
<line x1="84" y1="356" x2="84" y2="370" stroke="currentColor" stroke-width="2.6"/>
<line x1="156" y1="356" x2="156" y2="370" stroke="currentColor" stroke-width="2.6"/>
<line x1="84" y1="404" x2="84" y2="434" stroke="currentColor" stroke-width="2.6" stroke-dasharray="4 3"/>
<text x="96" y="430" font-size="12">C bit 1 (Algorithm 1 only)</text>
<text x="320" y="462" text-anchor="middle" font-size="13">S-boxes 3 → 9 have correlation −3/4, 9 → 8 have −1/2: three rounds give (3/4)⁴(1/2)² = 81/1024</text>
</svg>
<figcaption>Figure 6.3. The trail 0033, 3003, 9009, 9000 through the toy cipher. Shaded boxes are active S-boxes, labeled with their input and output masks; thick lines are the mask bits. Algorithm 1 (§6.5) continues through the last S-box to ciphertext bit 1; Algorithm 2 (§6.6) stops at U4 and guesses the four bits of K5 over S-box 1.</figcaption>
</figure>

### Finding trails by search

By hand one picks good-looking entries and hopes. A program can try them all.
The search below keeps, for every 16-bit mask, the strongest trail found so far
that ends there, and extends all of them one round at a time. That is dynamic
programming, and it is exact for the best trail because correlations multiply:
the best three-round trail ending at a mask is the best two-round trail to some
mask, extended by the best single round. To keep the search small it only
follows masks with at most two active S-boxes, which is where good trails live in
a cipher this size.

**Code it.**

```python
from itertools import product

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]

def parity(x):
    return bin(x).count("1") & 1

def perm(x):                            # bit i of piece j moves to bit j of piece i
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

LAT = [[sum(parity(x & a) == parity(SBOX[x] & b) for x in range(16)) - 8
        for b in range(16)] for a in range(16)]

def pieces(m):
    return [m >> s & 15 for s in (12, 8, 4, 0)]

def active(m):
    return sum(p != 0 for p in pieces(m))

def one_round(u):                       # every way a mask can pass the S-boxes, then perm
    choices = [[(0, 1)] if a == 0 else [(b, LAT[a][b] / 8) for b in range(1, 16) if LAT[a][b]]
               for a in pieces(u)]
    for combo in product(*choices):
        v, c = 0, 1
        for b, cb in combo:
            v, c = v << 4 | b, c * cb
        yield perm(v), c

# best[u] = (correlation, path): the strongest trail found that ends in mask u
best = {m: (1, [m]) for m in range(1, 1 << 16) if active(m) <= 2}
for r in range(3):
    nxt = {}
    for u, (c, path) in best.items():
        for u2, c2 in one_round(u):
            if active(u2) <= 2 and abs(c * c2) > abs(nxt.get(u2, (0,))[0]):
                nxt[u2] = (c * c2, path + [u2])
    best = nxt

top = sorted(best.values(), key=lambda t: -abs(t[0]))
for c, path in top[:4]:
    print(" -> ".join("%04X" % m for m in path), " correlation %+.4f" % c)
```

It prints:

```text
0033 -> 3003 -> 9009 -> 9000  correlation +0.0791
0066 -> 0033 -> 3003 -> 9009  correlation +0.0791
3300 -> C00C -> 0090 -> 2000  correlation -0.0703
3003 -> 9009 -> 9000 -> 8000  correlation -0.0703
```

The first line is our trail. The second is the same trail started one round
earlier: from $\texttt{0066}$, two S-boxes use $\mathrm{LAT}[6][3] = 4$
(correlation $\frac12$ each) to reach $\texttt{0033}$, and the trail then stops
at $\texttt{9009}$, with the same total $\frac14 \cdot (\frac34)^4 =
\frac{81}{1024}$ but two active S-boxes in round 4. The other two are slightly
weaker trails that also end on a single S-box.

For comparison, change the two definitions at the top to Chapter 5's Toy16
(PRESENT's S-box, `SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]`,
and its permutation, bit $b$ of nibble $n$ to bit $n$ of nibble $(n + b) \bmod 4$)
and run it again. The best trail it finds has correlation $\frac1{16}$, for
example $\texttt{000B} \to \texttt{0001} \to \texttt{1010} \to \texttt{0A0A}$:
weaker than our $\frac{81}{1024}$, because PRESENT's S-box has no table entry
beyond $\pm 4$, so every active S-box costs at least a factor of $\frac12$. The
same S-box is why the three-round differential that Chapter 5's attack uses
holds only about once in 186 pairs.

Matsui faced the same problem for DES, with 32-bit halves and eight 6-bit
S-boxes, and in 1994 he published a branch-and-bound algorithm that finds the
best linear and differential trails of DES for any number of rounds. It works
round by round like the code above, but prunes any partial trail that cannot beat
the best one already known. Modern tools hand the same problem to a mixed-integer
linear program or a SAT solver (§6.14).

### The approximation is not the trail

One trail is one way for the masks to get from $\texttt{0033}$ to
$\texttt{9000}$. The approximation is the pair of end masks; it does not care how
the masks travel in between. Other trails connect the same two masks, through
other S-box entries, and each adds its own signed contribution. Treating the
trail's correlation as the approximation's correlation is the central heuristic
of linear cryptanalysis. It is good enough to start an attack, and §6.9 measures
how wrong it is.

## 6.5 Matsui's Algorithm 1

*Level: intermediate.*

Matsui's first algorithm uses an approximation that runs across the *whole*
cipher, from plaintext to ciphertext, and recovers one bit: the XOR of the key
bits on its right side.

### The approximation

Continue the trail through round 4. $U_4$'s mask $\texttt{9000}$ enters S-box 1
with input mask 9; take $\mathrm{LAT}[9][8] = -4$ again, correlation $-\frac12$,
output mask $\texttt{8000}$. Then $K_5$ is XORed. The result is

$$
P \cdot \texttt{0033} \;\oplus\; C \cdot \texttt{8000}
\;=\; K_1 \cdot \texttt{0033} \oplus K_2 \cdot \texttt{3003} \oplus K_3 \cdot \texttt{9009}
\oplus K_4 \cdot \texttt{9000} \oplus K_5 \cdot \texttt{8000},
$$

with estimated correlation $\frac{81}{1024} \cdot (-\frac12) = -\frac{81}{2048}
\approx -0.0396$. Call the right side $\kappa$, one unknown bit.

### The algorithm

<div class="mars-steps" markdown>

1. Collect $N$ known plaintext-ciphertext pairs.
2. Count $T$, the number of pairs for which $P \cdot \alpha \oplus C \cdot
   \beta = 0$.
3. The left side equals $\kappa$ with correlation $c$, so it equals 0 with
   correlation $c$ if $\kappa = 0$ and with correlation $-c$ if $\kappa = 1$. With
   $c < 0$: if $T < N/2$, guess $\kappa = 0$; if $T > N/2$, guess $\kappa = 1$.
   (With $c > 0$ the other way round.)

</div>

That is the whole algorithm: one counter and a comparison. It reads a single
key bit out of the noise.

**Code it.**

```python
import random
from math import erf, sqrt

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]

def parity(x):
    return bin(x).count("1") & 1

def sub(x):
    return SBOX[x >> 12] << 12 | SBOX[x >> 8 & 15] << 8 | SBOX[x >> 4 & 15] << 4 | SBOX[x & 15]

def perm(x):
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

SP = [perm(sub(x)) for x in range(1 << 16)]          # one full round, as a table

def encrypt(p, k):                                   # k: five 16-bit round keys
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return sub(x ^ k[3]) ^ k[4]

ALPHA, BETA = 0x0033, 0x8000                         # plaintext mask, ciphertext mask
MASKS = [0x0033, 0x3003, 0x9009, 0x9000, 0x8000]     # the key mask in each round
CORR = -81 / 2048                                    # the trail's estimate

def algorithm1(texts):
    t = sum(parity(p & ALPHA) ^ parity(c & BETA) == 0 for p, c in texts)
    guess = 0 if (t > len(texts) / 2) == (CORR > 0) else 1
    return t, guess

random.seed(1993)
key = [random.getrandbits(16) for _ in range(5)]
truth = sum(parity(m & k) for m, k in zip(MASKS, key)) & 1
texts = [(p, encrypt(p, key)) for p in (random.getrandbits(16) for _ in range(2000))]
t, guess = algorithm1(texts)
print("T =", t, "of", len(texts), " guessed parity", guess, " true parity", truth)

phi = lambda z: (1 + erf(z / sqrt(2))) / 2
for mult in (1, 2, 4):
    n = round(mult / CORR ** 2)
    wins = 0
    for trial in range(100):
        key = [random.getrandbits(16) for _ in range(5)]
        truth = sum(parity(m & k) for m, k in zip(MASKS, key)) & 1
        texts = [(p, encrypt(p, key)) for p in (random.getrandbits(16) for _ in range(n))]
        wins += algorithm1(texts)[1] == truth
    print("N = %d/c^2 = %4d: right in %3d of 100 keys; theory %.1f%%" % (mult, n, wins, 100 * phi(sqrt(mult))))
```

It prints:

```text
T = 964 of 2000  guessed parity 0  true parity 0
N = 1/c^2 =  639: right in  78 of 100 keys; theory 84.1%
N = 2/c^2 = 1279: right in  91 of 100 keys; theory 92.1%
N = 4/c^2 = 2557: right in  93 of 100 keys; theory 97.7%
```

The first line is one attack with 2,000 known plaintexts. The approximation held
964 times, 36 short of half; the expected shortfall was about
$2000 \cdot 0.0198 \approx 40$, and the sign was right. The remaining lines run
the attack against 100 random keys at each of three data sizes and count how
often the bit comes out right.

### How often it should work

$T$ is a sum of $N$ independent bits, each 0 with probability $\frac12 +
\varepsilon$, where $\varepsilon = \pm c/2$. Its mean is $N(\frac12 + \varepsilon)$
and its standard deviation almost exactly $\frac12\sqrt N$. The decision goes
wrong when $T$ lands on the wrong side of $N/2$, which is $N|\varepsilon|$ away
from the mean, or $2|\varepsilon|\sqrt N = |c|\sqrt N$ standard deviations. By the
normal approximation the success probability is

$$
P_S = \Phi\left(|c|\sqrt N\right) = \Phi\left(2|\varepsilon|\sqrt N\right),
$$

where $\Phi$ is the standard normal distribution function. With $N = 1/c^2$
(that is, $1/(4\varepsilon^2)$) the argument is 1 and $P_S = 84.1\%$; with
$N = 2/c^2$ it is $92.1\%$; with $4/c^2$, $97.7\%$. These are the numbers in
Matsui's 1993 paper, written there as $N = \frac14|\varepsilon|^{-2},
\frac12|\varepsilon|^{-2}, |\varepsilon|^{-2}$.

The measured rates, 78, 91 and 93 out of 100, follow the formula at first and
then fall behind it. With 100 trials each, a few points either way is noise, but
93 against 97.7 at the largest size is more than noise. The formula assumes the
true correlation is the trail's $-\frac{81}{2048}$ for every key. It is not, and
for some keys it is much closer to zero. Section 6.9 measures it.

!!! note "Life story: Matsui's Algorithm 1"
    **Born:** 1993, in Mitsuru Matsui's EUROCRYPT paper "Linear Cryptanalysis
    Method for DES Cipher" · **Purpose:** read one key-bit parity from a
    full-cipher linear approximation with a single counter · **Helped:** showed
    that known plaintexts alone leak key information from DES; the model for
    every distinguisher built on a biased linear relation, in block and stream
    ciphers alike · **Status:** rarely used alone, because Algorithm 2 gets more
    key bits from shorter, stronger approximations; still the clearest way to
    explain the method

## 6.6 Matsui's Algorithm 2

*Level: intermediate.*

Algorithm 1 wastes the last round. A full-cipher approximation must pass through
every round's S-boxes, and the last S-layer costs a factor of $\frac12$ in
correlation here, which is four times as much data. Algorithm 2 skips it. It uses
an approximation of all rounds but the last, and gets past the last round by
**guessing the key bits** that sit between it and the ciphertext.

### The idea

Our trail ends at $U_4 \cdot \texttt{9000}$: bits 1 and 4 of the input to S-box 1
of round 4. The attacker sees $C$. If they knew the 4 bits of $K_5$ over S-box 1,
they could XOR them off the top nibble of $C$ and run it backward through the
S-box to get the top nibble of $U_4$ exactly. So:

<div class="mars-steps" markdown>

1. For each of the 16 values $g$ of those key bits, compute for every pair the
   top nibble $u = S^{-1}(C_{\text{top}} \oplus g)$.
2. Count how often $P \cdot \texttt{0033} = u \cdot 9$.
3. For the right $g$ the count is off from $N/2$ by about $N|c|/2$. For a wrong
   $g$, $u$ is a scrambled version of the true value, the relation is broken,
   and the count stays near $N/2$.
4. Rank the guesses by $|T_g - N/2|$; the top one is the key candidate.

</div>

Step 3 rests on the **wrong-key randomization hypothesis**: a wrong guess makes
the approximation behave like a random one. It is a hypothesis, not a theorem,
and the S-box can break it, as we are about to see.

### Matsui's counter trick

A literal implementation does $2^k \cdot N$ S-box inversions for $k$ guessed bits.
Matsui noticed that each pair matters only through a few bits: the plaintext
parity $P \cdot \alpha$ (1 bit) and the ciphertext bits under the guessed key (4
bits here). So first count the pairs into $2^{1+4} = 32$ cells, in one pass over
the data, and then run the 16 guesses over the 32 cells instead of over the $N$
pairs. The cost becomes $N + 2^k \cdot 2^{k+1}$, and $N$ no longer multiplies the
guess count. For DES, with $2^{43}$ pairs and 12 guessed key bits, that difference
is everything.

### Recovering all of $K_5$

The search also found trails that end on the other S-boxes of round 4. Taking
three of them,

| trail | plaintext mask | $U_4$ mask | correlation | S-boxes of round 4 |
| --- | --- | --- | --- | --- |
| A | $\texttt{0033}$ | $\texttt{9000}$ | $+\frac{81}{1024}$ | 1 |
| B | $\texttt{000A}$ | $\texttt{0202}$ | $-\frac1{16}$ | 2 and 4 |
| C | $\texttt{3300}$ | $\texttt{0020}$ | $-\frac9{256}$ | 3 |

covers all four nibbles of $K_5$: 4 bits from A, 8 from B, 4 from C. The program
runs all three on the same 8,000 known plaintexts.

**Code it.**

```python
import random

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]
INV = [SBOX.index(i) for i in range(16)]

def parity(x):
    return bin(x).count("1") & 1

def sub(x):
    return SBOX[x >> 12] << 12 | SBOX[x >> 8 & 15] << 8 | SBOX[x >> 4 & 15] << 4 | SBOX[x & 15]

def perm(x):
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

SP = [perm(sub(x)) for x in range(1 << 16)]

def encrypt(p, k):
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return sub(x ^ k[3]) ^ k[4]

# Three trails from the search; each ends on different S-boxes of the last round.
TRAILS = [("A", 0x0033, 0x9000, +81 / 1024),
          ("B", 0x000A, 0x0202, -1 / 16),
          ("C", 0x3300, 0x0020, -9 / 256)]

def algorithm2(texts, alpha, u4mask):
    shifts = [s for s in (12, 8, 4, 0) if u4mask >> s & 15]     # the S-boxes we must undo
    counter = {}                        # Matsui's trick: count (plaintext parity, cipher bits)
    for p, c in texts:
        key = (parity(p & alpha), tuple(c >> s & 15 for s in shifts))
        counter[key] = counter.get(key, 0) + 1
    scores = {}
    for g in range(16 ** len(shifts)):  # every value of the key bits on those S-boxes
        gs = [g >> 4 * i & 15 for i in reversed(range(len(shifts)))]
        hold = 0
        for (pp, cs), n in counter.items():
            u = sum(INV[cv ^ gv] << s for cv, gv, s in zip(cs, gs, shifts))
            if pp == parity(u & u4mask):
                hold += n
        scores[g] = hold - len(texts) / 2
    return sorted(scores.items(), key=lambda kv: -abs(kv[1])), len(counter)

random.seed(1994)
key = [random.getrandbits(16) for _ in range(5)]
texts = [(p, encrypt(p, key)) for p in (random.getrandbits(16) for _ in range(8000))]
for name, alpha, u4mask, corr in TRAILS:
    ranked, cells = algorithm2(texts, alpha, u4mask)
    shifts = [s for s in (12, 8, 4, 0) if u4mask >> s & 15]
    real = 0
    for s in shifts:
        real = real << 4 | key[4] >> s & 15
    (g1, d1), (g2, d2) = ranked[0], ranked[1]
    d_real = dict(ranked)[real]
    rank = 1 + sum(abs(d) >= abs(d_real) for g, d in ranked if g != real)   # ties count against
    print("trail %s: %3d counters; top %0*X (%+d), then %0*X (%+d); true %0*X ranks %d; expect about %d"
          % (name, cells, len(shifts), g1, d1, len(shifts), g2, d2, len(shifts), real, rank,
             abs(corr) / 2 * 8000))
print("last round key %04X" % key[4])
```

It prints:

```text
trail A:  32 counters; top B (+227), then C (+206); true B ranks 1; expect about 316
trail B: 512 counters; top 48 (-200), then 4A (+200); true 48 ranks 4; expect about 250
trail C:  32 counters; top C (-151), then E (+151); true C ranks 2; expect about 140
last round key B4C8
```

Trail A finds the top nibble of $K_5$, $\mathrm{B}$, in first place, with a
deviation of 227 against 206 for the runner-up. The margin is thin: the expected
deviation was 316, and the right key fell short of it, for the reason §6.9 gives.
Trail B's winner is $\texttt{48}$, which is right, but three other guesses tie it
exactly, so a careful ranking puts the truth fourth. Trail C has the right
nibble, $\mathrm{C}$, tied with $\mathrm{E}$.

The ties are not bad luck. Trails B and C both end with output mask 2 on the
S-box being undone, and the inverse S-box has a **linear structure** there:

$$
2 \cdot S^{-1}(y \oplus 2) = 2 \cdot S^{-1}(y) \oplus 1 \quad \text{for every } y .
$$

So the guesses $g$ and $g \oplus 2$ produce exactly complementary bits, and the
counts $N/2 + d$ and $N/2 - d$: the same $|d|$. No amount of data separates them.
Trail B has two such nibbles, so four guesses tie; trail C has one, so two tie.
This is a clean failure of the wrong-key randomization hypothesis: some wrong
keys are not random at all. The attacker lives with it. The three trails leave
$1 \times 4 \times 2 = 8$ candidates for $K_5$. Approximations whose last masks
avoid the troublesome bit can split them, and on a real cipher the leftover
candidates, together with the key bits no approximation reached, are searched by
brute force once the linear attack has cut the space down.

### The bonus bit

Algorithm 2 gives one more bit for free. The *sign* of the winning deviation is
the sign of $c \cdot (-1)^{\kappa}$, where $\kappa$ is the XOR of the round-key
bits on the trail. Trail A's winning deviation, $+227$, has the same sign as its
correlation $+\frac{81}{1024}$, so $\kappa = 0$. Matsui used exactly this to get
13 bits rather than 12 from each of his DES approximations.

!!! note "Life story: Matsui's Algorithm 2"
    **Born:** 1993, in the same EUROCRYPT paper, and refined for the 1994 DES
    experiment · **Purpose:** recover the key bits of the outer rounds by
    guessing them, ranking each guess by how strongly an inner approximation
    holds · **Helped:** the 1994 break of DES; nearly every linear key-recovery
    attack since, with Matsui's counter trick and later the fast Walsh transform
    (Collard, Standaert and Quisquater, 2007) to make the guessing cheap ·
    **Status:** current; the standard way to turn a linear distinguisher into an
    attack

## 6.7 How much data

*Level: intermediate.*

Every linear attack is a statistics problem. The attacker has one number per key
guess, a count, and must decide which count was produced by the right key. Data
is the price of making the right count stand out.

### The rule of thumb and where it comes from

The deviation of a count from $N/2$ has standard deviation $\frac12\sqrt N$ for
any guess. For the right guess its mean is $N|c|/2$. The signal-to-noise ratio is
therefore

$$
\frac{N|c|/2}{\sqrt N/2} = |c|\sqrt N = 2|\varepsilon|\sqrt N ,
$$

and the attack begins to work when this reaches a small constant. Setting it to 1
gives the famous estimate

$$
N \approx \frac{1}{c^2} = \frac{1}{4\varepsilon^2},
$$

and every attack paper states its data as some constant times that. In bias terms
it is often written $N \approx \varepsilon^{-2}$, which is four times larger; the
factor of four is just the difference between bias and correlation, and it is
the most common source of confusion when two papers' numbers are compared. Our
trail A has $c = \frac{81}{1024}$, so $1/c^2 \approx 160$.

### Algorithm 2 and the advantage

Algorithm 1 has two outcomes. Algorithm 2 has $2^k$ guesses, and the right one
must beat all the wrong ones, so more data is needed the more key bits are
guessed. Ali Aydın Selçuk (2008) put this in its standard form. Say the attack
succeeds with **advantage** $a$ bits if the right key ranks among the top
$2^{k-a}$ of the $2^k$ guesses; ranking first means $a = k$. Under the normal
approximation, and assuming wrong keys behave like random ones,

$$
P_S = \Phi\left(|c|\sqrt N - \Phi^{-1}\left(1 - 2^{-a-1}\right)\right).
$$

The second term is the threshold set by the wrong keys: with $2^a$ times as many
wrong keys as places at the top, the right key must clear the
$1 - 2^{-a-1}$ quantile of the noise. For $a = 4$ the threshold is
$\Phi^{-1}(1 - 2^{-5}) \approx 1.86$ standard deviations. Matsui's 1993 table
for Algorithm 2 on DES gives success rates of about 48.6, 78.5, 96.7 and 99.9
percent for $N = 2, 4, 8$ and $16$ times $|\varepsilon|^{-2}$; the jump from
"barely" to "certain" over a factor of eight in data is typical.

### Measured on the toy cipher

**Code it.** The program below runs Algorithm 2 with trail A against 200 random
keys for each data size from $1/c^2$ to $16/c^2$, and records whether the true
nibble ranks first and whether it is in the top four.

```python
import random
from math import sqrt
from statistics import NormalDist

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]
INV = [SBOX.index(i) for i in range(16)]

def parity(x):
    return bin(x).count("1") & 1

def sub(x):
    return SBOX[x >> 12] << 12 | SBOX[x >> 8 & 15] << 8 | SBOX[x >> 4 & 15] << 4 | SBOX[x & 15]

def perm(x):
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

SP = [perm(sub(x)) for x in range(1 << 16)]

def encrypt(p, k):
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return sub(x ^ k[3]) ^ k[4]

C = 81 / 1024                           # trail A: 0033 -> ... -> 9000, one last S-box

def rank_of_true_key(n, key):
    counter = [0] * 32                  # (plaintext parity, top 4 ciphertext bits)
    for _ in range(n):
        p = random.getrandbits(16)
        counter[parity(p & 0x0033) << 4 | encrypt(p, key) >> 12] += 1
    score = []
    for g in range(16):
        hold = sum(counter[pp << 4 | cv] for pp in (0, 1) for cv in range(16)
                   if pp == parity(INV[cv ^ g] & 9))
        score.append(abs(hold - n / 2))
    true = key[4] >> 12                 # rank of the true guess; a tie counts against us
    return sum(s >= score[true] for g, s in enumerate(score) if g != true) + 1

nd = NormalDist()
random.seed(2001)
print("  N    rank 1   top 4   theory rank 1")
for mult in (1, 2, 4, 8, 16):
    n = round(mult / C ** 2)
    ranks = [rank_of_true_key(n, [random.getrandbits(16) for _ in range(5)]) for _ in range(200)]
    first = sum(r == 1 for r in ranks) / 2
    top4 = sum(r <= 4 for r in ranks) / 2
    theory = 100 * nd.cdf(sqrt(n) * C - nd.inv_cdf(1 - 2 ** -5))
    print("%5d   %5.1f%%  %5.1f%%   %5.1f%%" % (n, first, top4, theory))
```

It prints:

```text
  N    rank 1   top 4   theory rank 1
  160    11.5%   39.0%    19.4%
  320    28.5%   57.0%    32.7%
  639    41.0%   73.0%    55.4%
 1279    59.5%   87.0%    83.3%
 2557    77.5%   93.5%    98.4%
```

<figure class="mars-fig">
<svg viewBox="0 0 640 362" width="640" role="img" aria-label="Success rate of Algorithm 2 against the number of known plaintexts: measured rank 1, measured top 4, and the theoretical curve" fill="currentColor" font-size="14">
<line x1="90" y1="250" x2="600" y2="250" stroke="currentColor" stroke-width="1.2"/>
<line x1="90" y1="250" x2="90" y2="20" stroke="currentColor" stroke-width="1.2"/>
<line x1="85" y1="250.0" x2="600" y2="250.0" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="81" y="255.0" text-anchor="end" font-size="12">0%</text>
<line x1="85" y1="195.0" x2="600" y2="195.0" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="81" y="200.0" text-anchor="end" font-size="12">25%</text>
<line x1="85" y1="140.0" x2="600" y2="140.0" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="81" y="145.0" text-anchor="end" font-size="12">50%</text>
<line x1="85" y1="85.0" x2="600" y2="85.0" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="81" y="90.0" text-anchor="end" font-size="12">75%</text>
<line x1="85" y1="30.0" x2="600" y2="30.0" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
<text x="81" y="35.0" text-anchor="end" font-size="12">100%</text>
<text x="90.0" y="270" text-anchor="middle" font-size="12">160</text>
<text x="217.6" y="270" text-anchor="middle" font-size="12">320</text>
<text x="344.8" y="270" text-anchor="middle" font-size="12">639</text>
<text x="472.5" y="270" text-anchor="middle" font-size="12">1279</text>
<text x="600.0" y="270" text-anchor="middle" font-size="12">2557</text>
<text x="345.0" y="292" text-anchor="middle" font-size="13">known plaintexts N (1, 2, 4, 8 and 16 times 1/c²; log scale)</text>
<polyline points="90.0,207.3 217.6,178.1 344.8,128.1 472.5,66.7 600.0,33.5" fill="none" stroke="currentColor" stroke-width="2" opacity="0.6" stroke-dasharray="6 4"/>
<rect x="86.0" y="203.3" width="8" height="8" fill="currentColor" opacity="0.6"/>
<rect x="213.6" y="174.1" width="8" height="8" fill="currentColor" opacity="0.6"/>
<rect x="340.8" y="124.1" width="8" height="8" fill="currentColor" opacity="0.6"/>
<rect x="468.5" y="62.7" width="8" height="8" fill="currentColor" opacity="0.6"/>
<rect x="596.0" y="29.5" width="8" height="8" fill="currentColor" opacity="0.6"/>
<polyline points="90.0,164.2 217.6,124.6 344.8,89.4 472.5,58.6 600.0,44.3" fill="none" stroke="currentColor" stroke-width="2" opacity="0.45"/>
<rect x="86.0" y="160.2" width="8" height="8" fill="currentColor" opacity="0.45"/>
<rect x="213.6" y="120.6" width="8" height="8" fill="currentColor" opacity="0.45"/>
<rect x="340.8" y="85.4" width="8" height="8" fill="currentColor" opacity="0.45"/>
<rect x="468.5" y="54.6" width="8" height="8" fill="currentColor" opacity="0.45"/>
<rect x="596.0" y="40.3" width="8" height="8" fill="currentColor" opacity="0.45"/>
<polyline points="90.0,224.7 217.6,187.3 344.8,159.8 472.5,119.1 600.0,79.5" fill="none" stroke="currentColor" stroke-width="2" opacity="1"/>
<circle cx="90.0" cy="224.7" r="4" fill="currentColor" opacity="1"/>
<circle cx="217.6" cy="187.3" r="4" fill="currentColor" opacity="1"/>
<circle cx="344.8" cy="159.8" r="4" fill="currentColor" opacity="1"/>
<circle cx="472.5" cy="119.1" r="4" fill="currentColor" opacity="1"/>
<circle cx="600.0" cy="79.5" r="4" fill="currentColor" opacity="1"/>
<circle cx="110" cy="320" r="4" fill="currentColor"/><text x="120" y="325" font-size="13">measured: true key ranked first</text>
<rect x="356" y="316" width="8" height="8" fill="currentColor" opacity="0.45"/><text x="370" y="325" font-size="13">measured: in the top 4 of 16</text>
<line x1="104" y1="344" x2="116" y2="344" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" opacity="0.6"/><text x="120" y="349" font-size="13">Selçuk's formula for rank 1, with the trail's correlation</text>
</svg>
<figcaption>Figure 6.4. Algorithm 2 with trail A on the toy cipher, 200 random keys per point. At small N the measured rate (circles) roughly tracks Selçuk's formula (dashed); at large N it falls well short, because for some keys the true correlation is much smaller than the trail's. The top-4 rate (advantage 2 bits) is what an attack that finishes by brute force actually needs.</figcaption>
</figure>

The formula and the measurement agree at the low end and part company at the
high end: at $N = 16/c^2$ the formula promises 98 percent and the cipher gives
78. Nothing is wrong with the statistics. The formula was fed the trail's
correlation, $\frac{81}{1024}$, as if every key had it. The keys do not. For some
keys the approximation is stronger, for others it is nearly balanced, and no
amount of data at the trail's rate will find a key whose approximation barely
exists. Figure 6.5 in §6.9 shows the spread. This is the main practical reason
attack papers now quote success probabilities from experiments or from models of
the key-dependent correlation, not from the single-trail formula alone.

### Two more corrections

Two refinements come up in modern papers, and both make attacks a little more
expensive than the plain formula says.

The wrong keys are not perfectly random. Even for a truly random permutation, the
correlation of a fixed approximation is not zero: over all $2^n$ inputs it is
itself random, roughly normal with variance $2^{-n}$. Andrey Bogdanov and Elmar
Tischhauser (2013) showed that once $N$ is a noticeable fraction of the
codebook, this spread of the wrong keys must be counted, and success rates drop.
Sampling plaintexts *without* repetition, so that the attacker's $N$ texts are
distinct, helps against it, and the analyses for distinct known plaintexts are
now standard.

And the right key is not unique in its behavior, as §6.6's ties showed: S-box
structure can make some wrong guesses behave like the right one, and an attack
that ignores this overstates its advantage.

### The cost in a sentence

A linear attack on a cipher with block size $n$ is possible only if some
approximation has $|c| \gtrsim 2^{-n/2}$, because the attacker cannot collect
more than $2^n$ known plaintexts. For a 64-bit block that is $|c| \gtrsim
2^{-32}$; for AES's 128-bit block, $|c| \gtrsim 2^{-64}$. A designer who can prove
that every trail is below that line, with a margin, has a cipher that the basic
attack cannot touch. Section 6.13 shows how that proof is made, and §6.9 why it
is not quite a proof.

## 6.8 Matsui and DES

*Level: intermediate.*

DES is a Feistel cipher (book 1, [§6.4](../../book/06-Block-Ciphers.md)): 64-bit
blocks split into two 32-bit halves, 16 rounds, and a round function $F$ that
expands the right half to 48 bits, XORs 48 key bits, and feeds eight 6-bit
S-boxes that each output 4 bits, followed by a fixed permutation. In a Feistel
cipher a linear approximation of $F$ becomes an approximation of a round, because
the round only XORs $F$'s output into the other half.

### The S-box that gave DES away

Matsui computed the linear approximation tables of the eight DES S-boxes, each
$64 \times 16$ entries. The most biased entry in all of them belongs to S5: input
mask $\texttt{10}_{16}$ (the second of the six input bits) against output mask
$\texttt{F}$ (all four output bits). Of the 64 inputs, only 12 satisfy it, a bias
of $12/64 - \frac12 = -\frac{20}{64} \approx -0.31$. Through the expansion and the
permutation, this becomes a relation of one round of DES that Matsui wrote as

$$
X[15] \oplus F(X, K)[7, 18, 24, 29] = K[22],
$$

bit 15 of the round input, four bits of $F$'s output, and one key bit, holding
with probability $\frac{12}{64}$. Chaining such one-round relations through the
rounds, alternating them so that the Feistel structure lets them link up, gave
approximations of many rounds. The piling-up lemma priced them.

### 1993: on paper

At EUROCRYPT 1993 Matsui showed how to break 8-round DES with $2^{21}$ known
plaintexts, 12-round DES with $2^{33}$, and full 16-round DES with $2^{47}$. He
also pointed out a ciphertext-only version: if the plaintexts are English text in
ASCII, whose top bits are predictable, 8-round DES falls to about $2^{29}$
ciphertexts alone. For full DES, $2^{47}$ known plaintexts matched the $2^{47}$
*chosen* plaintexts of Biham and Shamir's differential attack. Known plaintexts
are far easier to come by than chosen ones, so on paper this was the stronger
result.

### 1994: in the machine room

Matsui then improved the attack and ran it. The refinements were the ones of
§6.6, carried to DES's scale. He used two approximations over 14 of the 16
rounds, one in the encryption direction and one in the decryption direction,
each with bias about $1.19 \times 2^{-21}$, and guessed the key bits of the
outer rounds with Algorithm 2. Each approximation gave 13 key bits (12 by
guessing, plus the parity bit of §6.6), 26 in all, and the remaining 30 bits
were found by exhaustive search over the most likely candidates. The data was
$2^{43}$ known plaintexts. He generated them himself, encrypting random blocks
under a random key on twelve HP workstations; making the pairs took about 40
days, and the analysis about 10 more. The key came out. His paper "The First
Experimental Cryptanalysis of the Data Encryption Standard" appeared at CRYPTO
1994, with an estimated success rate of about 85 percent for $2^{43}$ pairs.

It is worth being clear about what this did and did not show. It did not make DES
users unsafe overnight: $2^{43}$ blocks is 64 terabytes of known plaintext under
a single key, far more than any real system would ever encrypt for an attacker to
watch. What it showed was that DES's strength against analysis, as opposed to its
56-bit key, was not what its users had assumed: an attack that needed only
eavesdropping cost less than brute force, and it had been run, not just
estimated. When Don Coppersmith published the DES design criteria in 1994, they
showed that IBM had designed the S-boxes against differential cryptanalysis,
which it had known since 1974 under another name. Nothing in them targeted linear
approximations, and DES's linear margin is visibly thinner: $2^{43}$ known
plaintexts against $2^{47}$ chosen ones.

!!! note "Life story: Matsui's 1994 DES experiment"
    **Born:** 1994, Mitsuru Matsui at Mitsubishi Electric, reported at CRYPTO
    1994 · **Purpose:** show that linear cryptanalysis of full 16-round DES works
    in practice, not only on paper · **Helped:** recovered a DES key from
    $2^{43}$ known plaintexts in about 50 days on twelve workstations (about 40
    to make the pairs, 10 to analyze them), the first experimental
    cryptanalysis of DES faster than exhaustive search; made linear resistance
    a requirement for every new cipher · **Status:** a landmark; still the
    basis of the best known-plaintext attacks on DES, which later work improved
    only to about $2^{41}$ to $2^{42}$ texts

### What came after

Others kept improving the DES attack, each by a small factor. Lars Knudsen and
John Erik Mathiassen (2000) gave a chosen-plaintext variant needing somewhat
fewer texts. Pascal Junod (2001) repeated Matsui's experiment many times and
found its real time complexity lower than Matsui's own estimate. Alex Biryukov,
Christophe De Cannière and Michaël Quisquater (2004) used several approximations
at once (§6.10) to bring the data down a little further. Andrey Bogdanov and
Philip Vejre (2017) exploited asymmetries in the distribution of the key-guess
statistic and reported an attack with a little over $2^{41}$ known plaintexts.
Thirty years on, linear cryptanalysis is still the best known-plaintext attack on
DES, and the full key search is still cheaper in practice, because it needs only
one known block.

## 6.9 Linear hulls

*Level: expert.*

The success-rate shortfall in §6.5 and §6.7 had one cause: the approximation's
correlation is not the trail's. This section measures the difference and explains
it.

### The exact formula

Fix the end masks $\alpha$ (on the plaintext) and $\beta$ (on the ciphertext).
There are many trails $U = (u_1 = \alpha, u_2, \ldots, u_{r+1} = \beta)$ connecting
them. In a **key-alternating** cipher, one whose rounds are a fixed permutation
followed by XOR of a round key, as in our toy cipher and in AES, the correlation
of the approximation under a fixed key $K$ is exactly

$$
c_K(\alpha, \beta) \;=\; \sum_{U} (-1)^{U \cdot K}\, c_U ,
$$

where $c_U$ is the product of the S-box correlations along the trail (the
piling-up value, with no independence assumption needed) and $U \cdot K$ is the
XOR of the round-key bits that the trail's masks pick. Joan Daemen, René Govaerts
and Joos Vandewalle (1994) proved it by writing each layer as a **correlation
matrix**, whose $(u, v)$ entry is the correlation of input mask $u$ with output
mask $v$. The matrix of a composition is the product of the matrices, and
multiplying matrices sums over every path through the middle, which is the sum
over trails. The key XOR has a diagonal matrix with entries $(-1)^{u \cdot k}$,
which is where the signs come from.

So the trail correlation is one term of a signed sum. The other terms are other
trails between the same end masks, and their signs depend on the key. For one key
they reinforce the main trail; for another they cancel it.

Average over keys, with all round keys independent and uniform. The sign of each
trail is a different linear function of the key, so the cross terms average to
zero and only the squares survive:

$$
\mathrm{ELP}(\alpha, \beta) \;=\; \mathbb{E}_K\left[c_K(\alpha, \beta)^2\right]
\;=\; \sum_U c_U^2 .
$$

This is Kaisa Nyberg's **linear hull** theorem (1994); the set of all trails
between $\alpha$ and $\beta$ is the hull, and ELP stands for expected linear
probability (some papers call it the linear potential). It says that on average
the approximation is at least as strong as its best trail, often stronger. It
does not say what happens for a particular key.

### Measured on the toy cipher

With a 16-bit block the exact correlation can be computed by encrypting all 65,536
plaintexts. The program below does it for 64 random keys, for the Algorithm 1
approximation of §6.5, and then adds up the squared correlations of every trail
with at most two active S-boxes per round that joins the same masks.

**Code it.**

```python
import random
from itertools import product

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]

def parity(x):
    return bin(x).count("1") & 1

def sub(x):
    return SBOX[x >> 12] << 12 | SBOX[x >> 8 & 15] << 8 | SBOX[x >> 4 & 15] << 4 | SBOX[x & 15]

def perm(x):
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

SP = [perm(sub(x)) for x in range(1 << 16)]
LAT = [[sum(parity(x & a) == parity(SBOX[x] & b) for x in range(16)) - 8
        for b in range(16)] for a in range(16)]

def encrypt(p, k):
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return sub(x ^ k[3]) ^ k[4]

def correlation(alpha, beta, key):      # exact: run all 65,536 plaintexts
    s = sum(1 - 2 * (parity(p & alpha) ^ parity(encrypt(p, key) & beta)) for p in range(1 << 16))
    return s / 65536

ALPHA, BETA = 0x0033, 0x8000
random.seed(94)
cs = []
for t in range(64):
    key = [random.getrandbits(16) for _ in range(5)]
    cs.append(correlation(ALPHA, BETA, key))
print("first eight keys, correlation x 2048:", [round(c * 2048) for c in cs[:8]])
print("trail estimate x 2048: +-81")
print("average c^2 over 64 keys: %.6f   trail c^2: %.6f" % (sum(c * c for c in cs) / 64, (81 / 2048) ** 2))

# Now add up the squared correlations of every trail from ALPHA to BETA
def pieces(m):
    return [m >> s & 15 for s in (12, 8, 4, 0)]

def through_sboxes(u):                  # (output mask, squared correlation) pairs
    choices = [[(0, 1)] if a == 0 else [(b, (LAT[a][b] / 8) ** 2) for b in range(16) if LAT[a][b]]
               for a in pieces(u)]
    for combo in product(*choices):
        v, w = 0, 1
        for b, wb in combo:
            v, w = v << 4 | b, w * wb
        yield v, w

def active(m):
    return sum(p != 0 for p in pieces(m))

layer, count = {ALPHA: 1.0}, {ALPHA: 1}  # only trails with at most two S-boxes per round
for r in range(4):
    nxt, ncount = {}, {}
    for u, w in layer.items():
        for v, wv in through_sboxes(u):
            v = perm(v) if r < 3 else v
            if active(v) <= 2:
                nxt[v] = nxt.get(v, 0) + w * wv
                ncount[v] = ncount.get(v, 0) + count[u]
    layer, count = nxt, ncount
print("trails from 0033 to 8000 found:", count[BETA], "  sum of their c^2: %.6f" % layer[BETA])
```

It prints:

```text
first eight keys, correlation x 2048: [-82, -158, 31, -103, -130, 111, -40, 67]
trail estimate x 2048: +-81
average c^2 over 64 keys: 0.001979   trail c^2: 0.001564
trails from 0033 to 8000 found: 60   sum of their c^2: 0.001720
```

<figure class="mars-fig">
<svg viewBox="0 0 640 336" width="640" role="img" aria-label="Exact correlation of one approximation of the toy cipher under eight random keys, ranging from minus 158 to plus 111 in units of 1/2048, against the trail estimate of plus or minus 81" fill="currentColor" font-size="14">
<line x1="70" y1="160" x2="620" y2="160" stroke="currentColor" stroke-width="1.2"/>
<line x1="70" y1="103.3" x2="620" y2="103.3" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4" opacity="0.6"/>
<text x="64" y="108.3" text-anchor="end" font-size="12">+81</text>
<line x1="70" y1="216.7" x2="620" y2="216.7" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4" opacity="0.6"/>
<text x="64" y="221.7" text-anchor="end" font-size="12">-81</text>
<text x="64" y="165" text-anchor="end" font-size="12">0</text>
<rect x="95" y="160.0" width="40" height="57.4" fill="currentColor" opacity="0.55"/>
<text x="115" y="234.4" text-anchor="middle" font-size="12">-82</text>
<text x="115" y="154" text-anchor="middle" font-size="11" opacity="0.7">key 1</text>
<rect x="160" y="160.0" width="40" height="110.6" fill="currentColor" opacity="0.55"/>
<text x="180" y="287.6" text-anchor="middle" font-size="12">-158</text>
<text x="180" y="154" text-anchor="middle" font-size="11" opacity="0.7">key 2</text>
<rect x="225" y="138.3" width="40" height="21.7" fill="currentColor" opacity="0.55"/>
<text x="245" y="132.3" text-anchor="middle" font-size="12">+31</text>
<text x="245" y="174" text-anchor="middle" font-size="11" opacity="0.7">key 3</text>
<rect x="290" y="160.0" width="40" height="72.1" fill="currentColor" opacity="0.55"/>
<text x="310" y="249.1" text-anchor="middle" font-size="12">-103</text>
<text x="310" y="154" text-anchor="middle" font-size="11" opacity="0.7">key 4</text>
<rect x="355" y="160.0" width="40" height="91.0" fill="currentColor" opacity="0.55"/>
<text x="375" y="268.0" text-anchor="middle" font-size="12">-130</text>
<text x="375" y="154" text-anchor="middle" font-size="11" opacity="0.7">key 5</text>
<rect x="420" y="82.3" width="40" height="77.7" fill="currentColor" opacity="0.55"/>
<text x="440" y="76.3" text-anchor="middle" font-size="12">+111</text>
<text x="440" y="174" text-anchor="middle" font-size="11" opacity="0.7">key 6</text>
<rect x="485" y="160.0" width="40" height="28.0" fill="currentColor" opacity="0.55"/>
<text x="505" y="205.0" text-anchor="middle" font-size="12">-40</text>
<text x="505" y="154" text-anchor="middle" font-size="11" opacity="0.7">key 7</text>
<rect x="550" y="113.1" width="40" height="46.9" fill="currentColor" opacity="0.55"/>
<text x="570" y="107.1" text-anchor="middle" font-size="12">+67</text>
<text x="570" y="174" text-anchor="middle" font-size="11" opacity="0.7">key 8</text>
<text x="345" y="326" text-anchor="middle" font-size="13">correlation of P·0033 ⊕ C·8000, in units of 1/2048; dashed: the single trail's ±81</text>
</svg>
<figcaption>Figure 6.5. The exact correlation of P · 0033 ⊕ C · 8000 under eight random keys, against the single trail's ±81/2048 (dashed). The sign flips with the key parity, as expected; the size does not stay put. Key 3 has less than half the trail's value and would need about seven times the data; key 2 has almost twice the trail's value.</figcaption>
</figure>

Three things show. The correlation varies by a factor of five between keys, from
31 to 158 in units of $\frac1{2048}$. The average square, $0.00198$, is larger
than the trail's $0.00156$: the hull makes the approximation stronger on average,
as Nyberg's theorem promises. And 60 trails with at most two active S-boxes per
round already account for $0.00172$; the rest of the gap is trails with more
active S-boxes, each tiny, and the sampling error of 64 keys.

The success rates of §6.7 now make sense. The attack's data was set by the
trail's $c^2$, but the keys whose correlation is far below the trail's (keys 3
and 7 here) need several times more. In a real cipher the distribution of
$c_K$ over keys matters as much as its mean square; Joan Daemen and Vincent
Rijmen (2007) showed that when many trails of similar size contribute, $c_K$ is
close to normally distributed with mean zero and variance ELP. Then a sizable
fraction of keys always has a correlation well below the average, and an attack
can only promise a success probability over keys, never for each one.

### Hulls for and against the attacker

For DES, Matsui's approximations were dominated by one trail, and his estimates
held up. In ciphers with small S-boxes and bit permutations the hull matters a
great deal. In PRESENT (§6.13) the best approximations run through single-bit
masks, and many such single-bit trails connect the same input and output bits.
Kenji Ohkuma (2009) used this to find classes of weak keys for which reduced
PRESENT is especially weak, and Gregor Leander (2011) showed that for PRESENT
the hull can be computed and the attack priced accurately by tracking all
single-bit trails at once. For a designer the moral is uncomfortable: a bound on
every single trail is not a bound on the approximation. Section 6.13 returns to
this.

!!! note "Life story: the linear hull"
    **Born:** 1994, Kaisa Nyberg (EUROCRYPT 1994), with the correlation-matrix
    view of Joan Daemen, René Govaerts and Joos Vandewalle the same year ·
    **Purpose:** describe an approximation by all the trails between its end
    masks, not by one · **Helped:** explained why single-trail estimates
    mislead, gave designers the quantity to bound (the expected linear
    probability), and powered the attacks on PRESENT and SIMON · **Status:**
    current; bounding hulls over many rounds is still an open problem

## 6.10 Many approximations at once

*Level: expert.*

A cipher has many approximations, not one. If several of them involve the same
guessed key bits, their counts can be combined, and each adds evidence. The
question is how to add them.

### Multiple approximations

Burton Kaliski and Matt Robshaw (1994) were first: they combined several
approximations of DES that shared the same key bits and showed that the data
needed falls roughly in proportion to the sum of their squared correlations.
Biryukov, De Cannière and Quisquater (2004) made this general, with
approximations that may involve different key bits, and named the sum the
**capacity**:

$$
C = \sum_{j=1}^{m} c_j^2 .
$$

For independent approximations, the data needed for a given success rate is
roughly the single-approximation estimate with $c^2$ replaced by $C$. Ten
approximations as strong as the best one would cut the data by ten.

The obstacle is that we do not know the signs. The key-parity bit $\kappa_j$ of
each approximation is unknown, so the observed correlation of approximation $j$
under the right guess is $\pm c_j$ with an unknown sign. Adding signed counts
would let them cancel. Adding squares does not care about signs: score each key
guess by

$$
\Sigma(g) = \sum_j \hat c_j(g)^2 ,
$$

where $\hat c_j(g) = 2T_j(g)/N - 1$ is the observed correlation of approximation
$j$ under guess $g$. For a wrong guess each $\hat c_j$ is noise of variance
$1/N$, so $\Sigma(g) \approx m/N$; for the right guess it is about $m/N + C$.

### Measured on the toy cipher

On the toy cipher, plaintext masks that pick bits 3 and 4 of each nibble kept
showing up in strong approximations to S-box 1 of round 4. The program below takes
ten approximations, all from the four plaintext parities "bit 3 XOR bit 4 of
nibble $j$" to some mask on the top nibble of $U_4$, all depending on the same 4
guessed bits of $K_5$, and compares Algorithm 2 with the best single one
(trail A's) against the sum-of-squares score.

**Code it.**

```python
import random

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]
INV = [SBOX.index(i) for i in range(16)]

def parity(x):
    return bin(x).count("1") & 1

def sub(x):
    return SBOX[x >> 12] << 12 | SBOX[x >> 8 & 15] << 8 | SBOX[x >> 4 & 15] << 4 | SBOX[x & 15]

def perm(x):
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

SP = [perm(sub(x)) for x in range(1 << 16)]

def encrypt(p, k):
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return sub(x ^ k[3]) ^ k[4]

def pbits(p):                           # four plaintext parities: bits 3 xor 4 of each nibble
    return sum(parity(p >> s & 3) << s // 4 for s in (12, 8, 4, 0))

# (plaintext parities, output mask on U4). pbits keeps one parity per nibble, top
# nibble first, so 0b0011 stands for plaintext mask 0033 and 0b1001 for 3003.
APPROX = [(0b0011, 9), (0b1001, 8), (0b1100, 2), (0b0010, 0xE), (0b1101, 8),
          (0b1010, 4), (0b1010, 1), (0b0001, 7), (0b0100, 5), (0b0101, 6)]

def rank(score, true):                 # a tie counts against us
    return sum(s >= score[true] for g, s in enumerate(score) if g != true) + 1

def attack(n, key):
    table = [0] * 256                   # 4 plaintext parities x the top ciphertext nibble
    for _ in range(n):
        p = random.getrandbits(16)
        table[pbits(p) << 4 | encrypt(p, key) >> 12] += 1
    one, multi = [], []
    for g in range(16):
        cells = [0] * 256               # undo the last S-box under guess g
        for i, t in enumerate(table):
            cells[i & 0xF0 | INV[(i & 15) ^ g]] += t
        cors = []
        for a, b in APPROX:             # observed correlation of each approximation
            hold = sum(t for i, t in enumerate(cells) if parity(i >> 4 & a) == parity(i & b))
            cors.append(2 * hold / n - 1)
        one.append(abs(cors[0]))
        multi.append(sum(c * c for c in cors))
    true = key[4] >> 12
    return rank(one, true), rank(multi, true)

random.seed(2008)
cap1 = capn = 0                         # capacity: the sum of squared correlations, over 8 keys
for trial in range(8):
    key = [random.getrandbits(16) for _ in range(5)]
    cells = [0] * 256
    for p in range(1 << 16):
        x = p
        for r in range(3):
            x = SP[x ^ key[r]]
        cells[pbits(p) << 4 | (x ^ key[3]) >> 12] += 1
    cs = [sum(t for i, t in enumerate(cells) if parity(i >> 4 & a) == parity(i & b)) / 32768 - 1
          for a, b in APPROX]
    cap1 += cs[0] ** 2 / 8
    capn += sum(c * c for c in cs) / 8
print("capacity: one approximation %.4f, all ten %.4f" % (cap1, capn))
print("   N   one approximation   ten approximations")
for n in (80, 160, 320, 640, 1280):
    results = [attack(n, [random.getrandbits(16) for _ in range(5)]) for _ in range(200)]
    print("%4d        %5.1f%%             %5.1f%%"
          % (n, sum(a == 1 for a, b in results) / 2, sum(b == 1 for a, b in results) / 2))
```

It prints:

```text
capacity: one approximation 0.0070, all ten 0.0427
   N   one approximation   ten approximations
  80         17.5%              16.0%
 160         19.5%              25.0%
 320         22.5%              55.0%
 640         45.0%              81.0%
1280         57.0%              97.0%
```

The capacity of the ten together is about six times that of the one, and the
attack gets most of that: the ten-approximation score reaches 81 percent at 640
known plaintexts, where the single approximation needs about four times as much
data to do as well. It does not get all of it, because the ten are not
independent (they share plaintext bits and a nibble of $U_4$), and because the
squared score also adds the noise of every approximation.

### Multidimensional linear cryptanalysis

Independence is the weak spot of the multiple method. Miia Hermelin, Joo Yeon
Cho and Kaisa Nyberg (2008 and 2009) removed it. Instead of a list of
approximations, take a whole **linear space** of them: choose $m$ base
approximations, and consider all $2^m - 1$ of their nonzero XOR combinations.
Equivalently, look at the joint distribution of the $m$-bit vector of their
left-hand sides. For a random permutation that vector is uniform. For the cipher
it is not, and the distance from uniform is exactly the capacity of the space:

$$
2^m \sum_{z} \left(p_z - 2^{-m}\right)^2 \;=\; \sum_{\gamma \neq 0} c_\gamma^2 ,
$$

where $p_z$ is the probability of value $z$ and $c_\gamma$ ranges over the
correlations of all combinations. The attack counts the $2^m$ values under each key
guess and scores the guess by a $\chi^2$ statistic or a log-likelihood ratio.
No independence is assumed, because the joint distribution contains all the
dependence there is. This also makes the method the natural home for Baignères,
Junod and Vaudenay's (2004) observation that the optimal distinguisher looks at
distributions, not single biases.

There is a trap, and the toy cipher shows it plainly. Take the four plaintext
parities and *all four* bits of the top nibble of $U_4$, an 8-dimensional space.
Its joint distribution is far from uniform. But a wrong key guess on that nibble
just applies a fixed permutation to the four $U_4$ bits, $u \mapsto
S^{-1}(S(u) \oplus \delta)$, which relabels the cells without changing their
contents, so every guess gets exactly the same $\chi^2$ score. The space must be
chosen so that the guess *changes* the distribution, typically by keeping only
some output bits of the S-box being undone. Hermelin, Cho and Nyberg's
multidimensional Algorithm 2 handles this by construction.

Multidimensional attacks hold several records. Cho (2010) used them on PRESENT;
the 28-round attack of §6.13 builds on them; and the zero-correlation attacks of
the next section are multidimensional at heart.

!!! note "Life story: multiple and multidimensional linear cryptanalysis"
    **Born:** 1994, Burton Kaliski and Matt Robshaw (several approximations of
    DES); generalized by Biryukov, De Cannière and Quisquater in 2004; made
    multidimensional by Miia Hermelin, Joo Yeon Cho and Kaisa Nyberg in 2008
    and 2009 · **Purpose:** use many approximations at once, adding their
    squared correlations · **Helped:** small improvements on DES; many of the
    best attacks on Serpent and PRESENT; the statistical framework for
    zero-correlation attacks · **Status:** current; the default form of a
    serious linear attack

## 6.11 Zero-correlation attacks

*Level: expert.*

Everything so far hunted for approximations with large correlation. Andrey
Bogdanov and Vincent Rijmen (2011) turned the idea over: an approximation whose
correlation is **exactly zero**, for every key, is also a property no random
permutation has. A random permutation's approximations have small correlations,
spread around zero with variance about $2^{-n}$, but almost never exactly zero.
If the cipher has a family of approximations that are exactly balanced, an
attacker who guesses the outer key bits correctly sees them balanced, and a wrong
guess does not.

### Finding them: miss in the middle

How can one know that a correlation is exactly zero without running all the
plaintexts? By §6.9, the correlation is a signed sum over trails. If there are
*no* trails from $\alpha$ to $\beta$, the sum is empty and the correlation is zero
for every key. To show that there are none, propagate masks from both ends:

<div class="mars-steps" markdown>

1. Forward from $\alpha$: through each S-box, an input mask $a$ can become any
   output mask $b$ with $\mathrm{LAT}[a][b] \neq 0$; through the permutation, masks
   move with the bits. Collect every mask $\alpha$ can reach after a few rounds.
2. Backward from $\beta$: collect every mask that can lead to $\beta$.
3. If the two sets do not meet, no trail exists, and $c_K(\alpha, \beta) = 0$ for
   all keys.

</div>

Figure 6.6 in the next section draws the idea on its left.

It is the linear twin of the impossible differential of
[Chapter 5](05-Differential-Cryptanalysis.md), found by the same
miss-in-the-middle reasoning, and like it, its strength is that it uses the
*zeros* of the table, not its large entries. The toy S-box's table has 89 zeros
among its 225 nonzero-mask entries, so masks are more constrained than one might
guess.

### The attack

One zero-correlation approximation gives a weak test, because a wrong key's
correlation is small too. The answer, from Bogdanov and Meiqin Wang (2012), is to
use many of them and the statistic of §6.10:

$$
T(g) = N \sum_{j=1}^{\ell} \hat c_j(g)^2 .
$$

For the right guess each $\hat c_j$ is pure sampling noise around zero, and with
$N$ distinct plaintexts out of $2^n$ its variance is about $(1 - N/2^n)/N$, so
$T \approx \ell(1 - N/2^n)$. For a wrong guess $T$ is about $\ell$ or more. With
the full codebook, $N = 2^n$, the right key gives exactly $T = 0$.

**Code it.** The program finds every zero-correlation pair from a one-nibble
plaintext mask, through three rounds, to a mask on the top nibble entering round
4, checks one by brute force over all plaintexts, and then uses all of them to
rank the 16 guesses of the top nibble of $K_5$.

```python
import random
from itertools import product

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]
INV = [SBOX.index(i) for i in range(16)]

def parity(x):
    return bin(x).count("1") & 1

def sub(x):
    return SBOX[x >> 12] << 12 | SBOX[x >> 8 & 15] << 8 | SBOX[x >> 4 & 15] << 4 | SBOX[x & 15]

def perm(x):
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

SP = [perm(sub(x)) for x in range(1 << 16)]

def encrypt(p, k):
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return sub(x ^ k[3]) ^ k[4]

LAT = [[sum(parity(x & a) == parity(SBOX[x] & b) for x in range(16)) - 8
        for b in range(16)] for a in range(16)]
FWD = [[b for b in range(16) if LAT[a][b]] for a in range(16)]   # masks an S-box can pass on
BWD = [[a for a in range(16) if LAT[a][b]] for b in range(16)]   # masks it can come from

def through(masks, table):              # every mask the S-layer can turn these into
    out = set()
    for m in masks:
        for ps in product(*[table[m >> s & 15] for s in (12, 8, 4, 0)]):
            out.add(ps[0] << 12 | ps[1] << 8 | ps[2] << 4 | ps[3])
    return out

# Forward two rounds from each one-nibble plaintext mask, backward one S-layer from
# each mask on the top nibble entering round 4. If the two sets never meet, no trail
# connects the masks, and the correlation is zero for every key.
singles = [a << s for s in (12, 8, 4, 0) for a in range(1, 16)]
zero = []
for alpha in singles:
    mid = {perm(v) for v in through({perm(v) for v in through({alpha}, FWD)}, FWD)}
    for b in range(1, 16):
        if not mid & through({perm(b << 12)}, BWD):
            zero.append((alpha, b))
print(len(zero), "zero-correlation pairs, for example", ["%04X->%X000" % z for z in zero[:4]])

random.seed(2011)
key = [random.getrandbits(16) for _ in range(5)]
def u4(p):                              # the true input to round 4's S-boxes, minus k4
    x = p
    for r in range(3):
        x = SP[x ^ key[r]]
    return x
alpha, b = zero[0]
s = sum(1 - 2 * (parity(p & alpha) ^ parity(u4(p) >> 12 & b)) for p in range(1 << 16))
print("check over all 65,536 plaintexts: sum of +-1 =", s)

def attack(n):                          # rank the 16 guesses of the top nibble of k5
    tables = {sh: [0] * 256 for sh in (12, 8, 4, 0)}
    for p in random.sample(range(1 << 16), n):
        c = encrypt(p, key) >> 12
        for sh in tables:
            tables[sh][(p >> sh & 15) << 4 | c] += 1
    stat = []
    for g in range(16):
        t = 0
        for alpha, b in zero:
            sh = [s for s in (12, 8, 4, 0) if alpha >> s & 15][0]
            a = alpha >> sh
            hold = sum(cnt for i, cnt in enumerate(tables[sh])
                       if parity(i >> 4 & a) == parity(INV[(i & 15) ^ g] & b))
            t += (2 * hold / n - 1) ** 2
        stat.append(t * n)
    return sorted(range(16), key=stat.__getitem__), stat

for n in (4096, 16384, 65536):
    order, stat = attack(n)
    print("N = %5d: smallest statistic for guess %X (%.1f), next %X (%.1f); true %X"
          % (n, order[0], stat[order[0]], order[1], stat[order[1]], key[4] >> 12))
```

It prints:

```text
306 zero-correlation pairs, for example ['1000->1000', '1000->2000', '1000->3000', '1000->4000']
check over all 65,536 plaintexts: sum of +-1 = 0
N =  4096: smallest statistic for guess 3 (306.8), next 2 (383.0); true 3
N = 16384: smallest statistic for guess 3 (245.3), next 6 (559.1); true 3
N = 65536: smallest statistic for guess 3 (0.0), next 6 (1481.8); true 3
```

The search finds 306 pairs. A full check of one of them gives a sum of exactly 0
over all 65,536 plaintexts, as the theory says it must, for any key. With 4,096
known plaintexts, one sixteenth of the codebook, the right nibble already has the
smallest statistic, 306.8 against 383.0, close to the $\ell = 306$ the formula
predicts; with a quarter of the codebook the gap is wide; with all of it the right
key scores 0.0. The data cost is the price of the method. Zero-correlation
attacks typically need a large fraction of the codebook, which is why they are
used on lightweight ciphers with small blocks and in settings where the attacker
reaches more rounds than any other attack does, not to save data.

### Three properties, one statement

Bogdanov, Gregor Leander, Nyberg and Wang (2012) proved that a zero-correlation
linear hull and an integral property are two views of one fact. If a function's
output, restricted to some bits, is balanced over every coset of a linear
subspace of inputs, then certain approximations have correlation zero, and
conversely. So the Square attack's balanced bytes on AES
([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)) are
zero-correlation hulls in disguise, and a search for one is a search for the
other. They also showed the multidimensional form, with the $\ell$
approximations forming a linear space, avoids the independence assumption of
the multiple form, just as in §6.10.

!!! note "Life story: zero-correlation linear cryptanalysis"
    **Born:** 2011, Andrey Bogdanov and Vincent Rijmen; multiple and
    multidimensional forms with Meiqin Wang, Gregor Leander and Kaisa Nyberg in
    2012 · **Purpose:** use approximations whose correlation is exactly zero for
    every key, found by miss in the middle · **Helped:** attacks reaching more
    rounds than any other on several lightweight ciphers and on CAST-256 and
    HIGHT; showed that integral and zero-correlation properties are the same
    thing · **Status:** current; usually needs a large part of the codebook

## 6.12 Differential-linear attacks

*Level: intermediate.*

A long differential is weak and a long linear approximation is weak, because each
round multiplies in another factor less than one. But a short differential can be
very strong, and so can a short linear approximation. Susan Langford and Martin
Hellman (1994) asked whether the two could be glued: run a differential through
the first part of the cipher and a linear approximation through the second.

### The construction

Split the cipher as $E = E_1 \circ E_0$. Encrypt pairs $(P, P \oplus \Delta)$ and
look at the XOR of one mask $\beta$ applied to both ciphertexts,
$\beta \cdot C \oplus \beta \cdot C'$.

<div class="mars-steps" markdown>

1. Through $E_0$, the input difference $\Delta$ leads to an output difference that
   satisfies $\gamma \cdot (X \oplus X') = 0$ with correlation $p$. (In Langford
   and Hellman's attack on DES, the differential held with probability 1, so
   $p = 1$.)
2. Through $E_1$, the approximation $\gamma \cdot X \approx \beta \cdot C$ has
   correlation $q$, and so does $\gamma \cdot X' \approx \beta \cdot C'$.
3. XOR the three relations: $\beta \cdot (C \oplus C')$ equals
   $\gamma \cdot (X \oplus X')$ with correlation about $q^2$ (piling-up, with the
   two texts treated as independent), so it is 0 with correlation about $p\,q^2$.

</div>

The data cost is about $1/(p\,q^2)^2$ pairs. The win comes when $p$ is large and
the approximation is short: Langford and Hellman attacked 8-round DES with a
3-round differential of probability 1 and a 3-round linear approximation, and
recovered 10 key bits from 512 chosen plaintexts with about 80 percent success,
far fewer than either attack alone needed for 8 rounds.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Left: a zero-correlation hull, where the masks reachable forward from alpha and backward from beta never meet. Right: a differential-linear attack, a difference through the first part and a linear approximation through the second" fill="currentColor" font-size="14">
<text x="150" y="22" text-anchor="middle" font-weight="bold">zero correlation</text>
<rect x="60" y="40" width="180" height="26" fill="none" stroke="currentColor"/><text x="150" y="58" text-anchor="middle">mask α (plaintext)</text>
<path d="M150 66 L95 150 L205 150 Z" fill="currentColor" opacity="0.15" stroke="currentColor"/>
<text x="150" y="128" text-anchor="middle" font-size="12">forward:</text><text x="150" y="143" text-anchor="middle" font-size="12">every mask α can reach</text>
<path d="M150 254 L95 170 L205 170 Z" fill="currentColor" opacity="0.15" stroke="currentColor"/>
<text x="150" y="190" text-anchor="middle" font-size="12">backward: every mask</text><text x="150" y="205" text-anchor="middle" font-size="12">that can lead to β</text>
<rect x="60" y="254" width="180" height="26" fill="none" stroke="currentColor"/><text x="150" y="272" text-anchor="middle">mask β (round 4 input)</text>
<text x="250" y="165" font-size="12">no overlap:</text><text x="250" y="180" font-size="12">no trail, c = 0</text>
<text x="480" y="22" text-anchor="middle" font-weight="bold">differential-linear</text>
<rect x="380" y="40" width="200" height="26" fill="none" stroke="currentColor"/><text x="480" y="58" text-anchor="middle">P and P ⊕ Δ</text>
<rect x="380" y="86" width="200" height="40" fill="currentColor" opacity="0.15" stroke="currentColor"/><text x="480" y="104" text-anchor="middle" font-size="13">E₀: round 1, the difference</text><text x="480" y="120" text-anchor="middle" font-size="13">keeps γ · difference = 0</text>
<rect x="380" y="146" width="200" height="40" fill="currentColor" opacity="0.15" stroke="currentColor"/><text x="480" y="164" text-anchor="middle" font-size="13">E₁: rounds 2 and 3, γ → β</text><text x="480" y="180" text-anchor="middle" font-size="13">correlation q on each text</text>
<rect x="380" y="206" width="200" height="26" fill="none" stroke="currentColor" stroke-dasharray="5 3"/><text x="480" y="224" text-anchor="middle" font-size="13">round 4: guess key, undo</text>
<text x="480" y="256" text-anchor="middle" font-size="13">β · (U₄ ⊕ U₄′) has correlation</text><text x="480" y="274" text-anchor="middle" font-size="13">about p · q²</text>
<line x1="480" y1="66" x2="480" y2="86" stroke="currentColor" stroke-width="1.5"/>
<line x1="480" y1="126" x2="480" y2="146" stroke="currentColor" stroke-width="1.5"/>
<line x1="480" y1="186" x2="480" y2="206" stroke="currentColor" stroke-width="1.5"/>
<line x1="330" y1="30" x2="330" y2="290" stroke="currentColor" opacity="0.3"/>
</svg>
<figcaption>Figure 6.6. Two relatives of linear cryptanalysis. Left: a zero-correlation hull (§6.11), where the masks reachable forward from α and backward from β never meet, so no trail exists and the correlation is zero for every key. Right: a differential-linear attack, with a difference through E₀ and a linear approximation through E₁ on each text of the pair.</figcaption>
</figure>

### On the toy cipher

A difference in the first nibble passes S-box 1 of round 1 and is then spread by
the permutation, but only to **bit 1** of each nibble. The mask
$\gamma = \texttt{3003}$ looks only at bits 3 and 4. So $\gamma \cdot (X \oplus
X') = 0$ always: $p = 1$, for every key, with no luck needed. Rounds 2 and 3 then
carry $\gamma = \texttt{3003}$ to $\beta = \texttt{9000}$ by the trail of §6.4,
with $q = (\frac34)^2(\frac12)^2 = \frac9{64}$. The prediction is
$p\,q^2 = (\frac9{64})^2 \approx 0.0198$. Round 4 is handled as in Algorithm 2:
guess the top nibble of $K_5$ and undo the S-box on both ciphertexts.

**Code it.**

```python
import random

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]
INV = [SBOX.index(i) for i in range(16)]

def parity(x):
    return bin(x).count("1") & 1

def sub(x):
    return SBOX[x >> 12] << 12 | SBOX[x >> 8 & 15] << 8 | SBOX[x >> 4 & 15] << 4 | SBOX[x & 15]

def perm(x):
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

SP = [perm(sub(x)) for x in range(1 << 16)]

def encrypt(p, k):
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return sub(x ^ k[3]) ^ k[4]

DELTA, GAMMA, BETA = 0xF000, 0x3003, 0x9000

# Round 1: a difference in the first nibble. Where can it be after the permutation?
diffs = {perm((SBOX[x] ^ SBOX[x ^ 0xF]) << 12) for x in range(16)}
print("differences after round 1:", sorted("%04X" % d for d in diffs))
print("GAMMA . difference:", {parity(d & GAMMA) for d in diffs})

random.seed(1994)
def u4(p, k):                           # state entering round 4's S-boxes (k4 not yet added)
    x = p
    for r in range(3):
        x = SP[x ^ k[r]]
    return x

found = []                              # the exact differential-linear correlation, per key
for t in range(4):
    k = [random.getrandbits(16) for _ in range(5)]
    s = sum(1 - 2 * parity((u4(p, k) ^ u4(p ^ DELTA, k)) & BETA) for p in range(1 << 16))
    found.append("%.4f" % (s / 65536))
print("correlation under four keys:", ", ".join(found))
print("prediction p * q^2 = 1 * (9/64)^2 = %.4f" % ((9 / 64) ** 2))

key = [random.getrandbits(16) for _ in range(5)]
n = 4000
pairs = [(encrypt(p, key) >> 12, encrypt(p ^ DELTA, key) >> 12)
         for p in (random.getrandbits(16) for _ in range(n))]
score = []
for g in range(16):                     # guess the top nibble of k5, undo the last S-box
    hold = sum(parity((INV[c ^ g] ^ INV[d ^ g]) & 9) == 0 for c, d in pairs)
    score.append(hold - n / 2)
order = sorted(range(16), key=lambda g: -score[g])
print("best guesses:", ["%X (%+d)" % (g, score[g]) for g in order[:3]], " true %X" % (key[4] >> 12))
```

It prints:

```text
differences after round 1: ['0008', '0800', '8008', '8088', '8880']
GAMMA . difference: {0}
correlation under four keys: 0.0974, 0.0679, 0.0923, 0.0876
prediction p * q^2 = 1 * (9/64)^2 = 0.0198
best guesses: ['E (+226)', 'D (+128)', '9 (+112)']  true E
```

The attack works: 4,000 pairs put the right nibble first, $+226$ against $+128$.
But the measured correlation, 0.07 to 0.10 depending on the key, is four or five
times the prediction. The prediction counted one $\gamma$. In truth *every* mask
$\gamma$ that avoids the bit-1 positions has $\gamma \cdot (X \oplus X') = 0$
with certainty, and each one contributes its own $q_\gamma^2$, a positive amount,
whatever the key. Céline Blondeau, Gregor Leander and Kaisa Nyberg (2017) gave
the exact formula under the usual independence assumptions:

$$
c_{DL} \;=\; \sum_{\gamma} c_{E_0}(\Delta, \gamma)\; c_{E_1}(\gamma, \beta)^2 ,
$$

where $c_{E_0}(\Delta, \gamma)$ is the correlation of $\gamma \cdot (X \oplus X')$
over pairs with input difference $\Delta$. It is the differential-linear version
of the linear hull: many paths, and here they mostly add.

### The modern differential-linear attack

The idea has had a second life. Eli Biham, Orr Dunkelman and Nathan Keller (2002)
extended it to differentials of probability below one. Achiya Bar-On, Dunkelman,
Keller and Ariel Weizman (2019) introduced the **differential-linear
connectivity table** (DLCT), the S-box table of $c_{E_0}$ for one S-box, so that
the middle round where the two parts meet can be computed exactly instead of
assumed. For ARX ciphers, built from addition, rotation and XOR, the method is
now among the strongest available: Gaëtan Leurent (2016) used it on the MAC
Chaskey, and Christof Beierle, Leander and Yosuke Todo (2020) on ChaCha, where
the best attacks on 7 of its 20 rounds are differential-linear, at a cost around
$2^{230}$, far from practical and far from the full cipher. The pattern is the
one Langford and Hellman found: a few rounds of near-certain difference, a few
rounds of strong correlation, and a careful seam.

!!! note "Life story: differential-linear cryptanalysis"
    **Born:** 1994, Susan Langford and Martin Hellman (CRYPTO 1994), on 8-round
    DES · **Purpose:** glue a short, strong differential to a short, strong
    linear approximation · **Helped:** 8-round DES with 512 chosen plaintexts;
    later extended to probabilistic differentials (2002), given the DLCT (2019)
    and an exact correlation formula (2017); the best attacks on reduced ChaCha
    and Chaskey · **Status:** current, especially against ARX designs

## 6.13 How designers bound linear trails

*Level: intermediate.*

A designer cannot run an attack on every key. What they can do is prove that every
linear trail through enough rounds has correlation far below $2^{-n/2}$. The
proof has two ingredients: S-boxes with no strong approximation, and a linear
layer that forces many S-boxes to be active.

### The S-box: linearity

The **linearity** of an S-box is its largest absolute correlation over nonzero
masks, $\max |c|$. Our toy S-box has $\frac34$. The best 4-bit S-boxes reach
$\frac12$ (LAT entries at most $\pm 4$), and that is the lower limit for 4 bits.
AES's 8-bit S-box, the inverse in $\mathrm{GF}(2^8)$ followed by an affine map,
has largest LAT entry 16 out of 256, a bias of $2^{-4}$ and a correlation of
$2^{-3}$, about the best possible for 8 bits.

### The linear layer: branch number

How many S-boxes must a trail touch? For a linear layer $\theta$, define the
**linear branch number** as the minimum, over all nonzero masks, of the number
of active S-boxes on its input side plus the number on its output side, with the
mask carried through $\theta$ by its transpose. If the branch number is $\mathcal
B$, any two consecutive rounds have at least $\mathcal B$ active S-boxes between
them.

The toy cipher's bit permutation has branch number 2: one active S-box with a
one-bit output mask lights up exactly one S-box in the next round. That is the
weakest possible, and it is why a 16-bit toy breaks so easily.

AES's MixColumns is a maximum distance separable map on four bytes, with branch
number 5: a column with one active byte going in has four going out, two in three
out, and so on. Then ShiftRows spreads each column's bytes over four different
columns of the next round. Joan Daemen and Vincent Rijmen's **wide trail
strategy** builds on these two facts and proves that any four rounds of AES have
at least $\mathcal B^2 = 25$ active S-boxes. Each costs at least a factor of
$2^{-3}$ in correlation, so every four-round trail has

$$
|c_U| \le \left(2^{-3}\right)^{25} = 2^{-75},
$$

and every eight-round trail at most $2^{-150}$. With a 128-bit block an attacker
needs $|c| \gtrsim 2^{-64}$. Every trail through four rounds is already below
the line.

### What the bound does not cover

The wide trail bound is about trails. Section 6.9 says the attacker sees hulls.
For AES the gap has been studied directly: the exact maximum expected linear
probability of two-round AES was computed by Liam Keliher and Jiayuan Sui
(about $1.64 \times 2^{-28}$), and bounds on four rounds have been proved as
well. They are weaker than the trail bound but still out of an attacker's reach.
The best attacks on reduced AES are not linear at all; they are integral,
impossible-differential and meet-in-the-middle attacks on 7 of AES-128's 10
rounds ([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)), and the
integral ones, as §6.11 said, are zero-correlation attacks under another name.

### Lightweight ciphers: where the margins are thin

Lightweight ciphers save hardware by using small S-boxes, bit permutations or no
S-boxes at all, and the hull is where they are attacked.

**PRESENT** (Andrey Bogdanov and colleagues, CHES 2007; ISO/IEC 29192-2) has a
64-bit block, 31 rounds, a 4-bit S-box of linearity $\frac12$ and a bit
permutation. Its designers proved that any four-round linear approximation has
bias at most $2^{-7}$, and by piling up seven such blocks, that 28 rounds have
bias at most $2^6 \cdot (2^{-7})^7 = 2^{-43}$, below the $2^{-32}$ that $2^{64}$
known plaintexts could detect. The bound is on trails. PRESENT's strongest
approximations use single-bit masks, and many single-bit trails connect the same
two bits, so the hull is far stronger than any trail in it. Ohkuma (2009), Cho
(2010) and others pushed linear attacks round by round, and Antonio
Flórez-Gutiérrez and María Naya-Plasencia (2020) reached **28 of the 31 rounds**
with a linear attack that needs nearly the full codebook. PRESENT is not broken,
but its security margin against linear attacks is three rounds.

**SIMON** (NSA, 2013) has no S-box: its only nonlinear operation is a bitwise
AND of two rotated copies of the state. Each AND gate of a trail costs a factor of
$\frac12$ in correlation, and the rotations create very many trails between the
same masks. Stefan Kölbl, Leander and Tyge Tiessen (2015) computed optimal trails
and large parts of the hulls with SAT solvers, and showed that the hull
correlation can be many times the best trail's. The best linear-hull attacks,
like the best differential ones, reach roughly two-thirds to three-quarters of the
rounds of each SIMON variant. Again, not broken; again, the margin is set by the
hull, not the trail.

### In the real world

- **DES** (1977): broken by linear cryptanalysis in 1994 with $2^{43}$ known
  plaintexts, the first experimental break of DES faster than brute force; never
  practical, because the data is enormous. Retired for its 56-bit key.
- **FEAL** (1987): broken by linear attacks with very few known plaintexts for
  four rounds (1991 to 1992). Retired.
- **MISTY1** (1995): designed by Matsui with provable bounds against both linear
  and differential cryptanalysis; its relative KASUMI became the 3G mobile cipher.
  MISTY1 was later broken in theory by integral (division property) attacks, not
  linear ones.
- **AES** (2001): wide trail; no linear attack comes near the full cipher.
- **PRESENT** (2007): 28 of 31 rounds by linear attacks, with nearly all
  $2^{64}$ texts.
- **ChaCha** (2008): differential-linear attacks on 7 of 20 rounds, at
  impractical cost.

## 6.14 Going deeper

*Level: expert.*

### The fast Walsh transform in Algorithm 2

The count for key guess $g$ in Algorithm 2 is a sum over the cells of the
counter table of $(-1)^{\text{relation}}$, and the relation depends on $g$ only
through $c \oplus g$. Such a sum is a convolution over $\mathbb{F}_2^k$, which the
Walsh-Hadamard transform turns into a pointwise product. Baudoin Collard,
François-Xavier Standaert and Jean-Jacques Quisquater (2007) used this to bring
the key-guessing time from $2^{2k}$ to about $3k\,2^k$ operations, which is what
makes modern attacks that guess 40 or more key bits feasible. Flórez-Gutiérrez
and Naya-Plasencia's 2020 PRESENT attack extends it to the case where several
rounds of key are guessed at once.

### Correlation matrices and the key-alternating theorem

The hull formula of §6.9 is exact for key-alternating ciphers, where the round
keys enter only by XOR between fixed rounds. For a Feistel cipher like DES the
same holds per round function, but the trail's key parity involves round-key bits
that the key schedule ties together, so the cross terms need not average out,
and Nyberg's ELP formula holds only for independent round keys. Real key
schedules can make the hull worse or better for specific keys. Sean Murphy (2006)
pointed out that the ELP, an average over keys, can overstate what an attacker
facing one key can do, and much later work models the distribution of $c_K$
rather than its mean square.

### Automatic search

Matsui's branch-and-bound algorithm (1994) searched DES's trails. Today the usual
tools are mixed-integer linear programming (Nicky Mouha and colleagues, 2011,
for counting active S-boxes; Siwei Sun and colleagues, 2014, at bit level), SAT
and SMT solvers (as in Kölbl, Leander and Tiessen's SIMON work), and constraint
programming. They return the best trail, bounds on all trails, or, with more
effort, the many trails of a hull. Zero-correlation and impossible-differential
distinguishers are found with the same tools by asking for an empty solution set.

### Modular addition

ARX ciphers have no S-boxes; their nonlinear part is addition modulo $2^n$.
Johan Wallén (2003) showed how to compute the correlation of any linear
approximation of addition in time linear in $n$, and how to enumerate the strong
ones. That made linear and differential-linear analysis of ARX designs such as
ChaCha, Speck and Chaskey systematic.

### Stream ciphers and other relatives

The same mathematics attacks stream ciphers. A correlation attack on an LFSR
combiner ([Chapter 8](08-Attacks-on-Stream-Ciphers.md)) is a linear
approximation of the combining function, with the LFSR's linear recurrence
playing the role of the key schedule; fast correlation attacks are a decoding
problem in which Walsh transforms again do the counting. Linear cryptanalysis of
block ciphers and correlation attacks on stream ciphers grew up separately and
met in the 1990s.

### Quantum attackers

Marc Kaplan, Gaëtan Leurent, Anthony Leverrier and María Naya-Plasencia (2016)
studied quantum versions of differential and linear attacks. Grover-style
amplitude amplification can speed up the key guessing, and quantum counting can
estimate a bias with fewer queries in some models. The gains are at most
quadratic, and a linear attack that is worse than brute force classically is not
always better than Grover's search quantumly. Doubling key lengths, as for
generic attacks, covers it.

### Open problems

There is still no good general way to bound linear hulls, rather than trails,
for many rounds of a real cipher. The distribution of key-dependent correlations
is understood for idealized models, not for specific key schedules. And the line
between "many approximations" and "the whole distribution" keeps moving: the
best attacks increasingly treat the cipher's output as a distribution to be
tested, which is linear cryptanalysis growing into general statistical
cryptanalysis.

## Check yourself

??? question "1. An approximation holds for 44 of 64 inputs of a 6-bit S-box. Give its bias and its correlation."

    $p = 44/64 = 0.6875$, so the bias is $\varepsilon = 0.6875 - 0.5 = 0.1875$
    (that is, $12/64$) and the correlation is $c = 2\varepsilon = 0.375$.

??? question "2. Why is row 0 of every bijective S-box's LAT zero except at column 0?"

    Row 0 is the approximation $0 = b \cdot S(x)$. For a permutation, $S(x)$ runs
    over all 16 values as $x$ does, and for any nonzero $b$ exactly half of them
    have $b \cdot y = 0$. So the count is 8 and the entry $8 - 8 = 0$.

??? question "3. Three independent approximations have biases 1/4, −1/4 and 3/8. What does the piling-up lemma give for their XOR, as a bias and as a correlation?"

    Bias $2^{2} \cdot \frac14 \cdot (-\frac14) \cdot \frac38 = -\frac{3}{32}$.
    Correlation $\frac12 \cdot (-\frac12) \cdot \frac34 = -\frac{3}{16}$, which is
    twice the bias, as it should be.

??? question "4. Trail A has correlation 81/1024. About how many known plaintexts does Algorithm 1 need for 84 percent success with the full-cipher version (correlation −81/2048)?"

    $N = 1/c^2 = (2048/81)^2 \approx 639$. At $N = 1/c^2$ the formula gives
    $\Phi(1) = 84.1\%$. (The measured rate in §6.5 was 78 of 100, a little lower,
    because the true correlation varies with the key.)

??? question "5. In Algorithm 2 for trail B, four key guesses tie exactly at every data size. Why, and what does the attacker do about it?"

    Trail B ends with output mask 2 on two S-boxes, and the inverse S-box
    satisfies $2 \cdot S^{-1}(y \oplus 2) = 2 \cdot S^{-1}(y) \oplus 1$ for all
    $y$. So flipping the guess by 2 on either nibble flips the computed bit for
    every text, and the count changes from $N/2 + d$ to $N/2 - d$, with the same
    $|d|$. Data cannot separate them. The attacker keeps all four candidates and
    resolves them with another approximation, by peeling the round, or by brute
    force on the rest of the key.

??? question "6. Why did Matsui's 1994 attack not make DES users unsafe in practice, and what did it change?"

    It needed $2^{43}$ known plaintext-ciphertext pairs under one key, about 64
    terabytes, which no real deployment would hand to an attacker. It showed,
    with an experiment rather than an estimate, that DES's resistance to
    analysis was below its key length, and it made resistance to linear
    cryptanalysis a design requirement from then on (MISTY1, AES).

??? question "7. State Nyberg's linear hull theorem and explain how it can be true that the hull makes an approximation stronger on average but weaker for some keys."

    For a key-alternating cipher with independent round keys,
    $\mathbb{E}_K[c_K^2] = \sum_U c_U^2$ over all trails between the masks. The
    average of the square is at least the best trail's square. But for a fixed
    key $c_K = \sum_U (-1)^{U \cdot K} c_U$, and the signs can make the trails
    cancel; in the toy cipher one key's correlation was 31/2048 against the
    trail's 81/2048. A large mean square and a wide spread are compatible.

??? question "8. Why does a zero-correlation attack need so much data, and why is the right key's statistic exactly zero with the full codebook?"

    A wrong key's approximations are also nearly balanced (correlation of order
    $2^{-n/2}$), so the right key's exact zero is distinguishable only once the
    sampling noise, of order $1/\sqrt N$, is small compared with that, which
    needs $N$ near $2^n$. With all $2^n$ plaintexts there is no sampling at all:
    the observed correlation is the true one, which is zero.

??? question "9. In the toy differential-linear attack the prediction was 0.0198 and the measurement about 0.09. Where does the rest come from?"

    The prediction used one mask $\gamma$. Every mask $\gamma$ that avoids the
    bit-1 positions sees no difference after round 1, so each one has
    $c_{E_0}(\Delta, \gamma) = 1$ and contributes $c_{E_1}(\gamma, \beta)^2 \ge 0$
    to $c_{DL} = \sum_\gamma c_{E_0} c_{E_1}^2$. The terms are squares, so they
    add instead of cancelling, and the total is several times the single term.

??? question "10. AES's S-box has linearity 2⁻³ and its four-round trails have at least 25 active S-boxes. How many rounds of trail-based linear cryptanalysis does this rule out, and what does the argument leave open?"

    Any four-round trail has $|c| \le 2^{-75}$, below the $2^{-64}$ that
    $2^{128}$ texts could detect, so no single trail through four or more rounds is
    usable. It leaves open the hull (many trails could add up), which is why
    separate bounds on the expected linear probability were proved, and it says
    nothing about non-linear attacks such as integral and impossible-differential
    attacks.

## What you learned

- A linear approximation of an S-box is a pair of masks; its quality is the bias
  $\varepsilon = p - \frac12$ or the correlation $c = 2\varepsilon$, read from the
  linear approximation table. Parseval's relation stops an S-box from making all
  approximations weak at once.
- The piling-up lemma multiplies correlations of independent links; it is exact
  for independent bits and fails for two approximations of the same S-box.
- A trail chains S-box approximations through the rounds; a dynamic-programming
  search finds the best ones. Key XORs and linear layers only move masks.
- Algorithm 1 reads one key parity bit from a full-cipher approximation;
  Algorithm 2 guesses the outer round's key bits, counts with Matsui's table
  trick, and ranks the guesses. Linear structures in the S-box can make some
  wrong keys tie with the right one.
- Data is about $1/c^2$ times a constant that grows with the number of key bits
  guessed (Selçuk's formula); key-dependent correlation makes real success rates
  fall below the formula.
- Matsui priced full DES at $2^{47}$ known plaintexts in 1993 and broke it with
  $2^{43}$ in 1994, the first experimental break of DES faster than brute force.
- The correlation of an approximation is a signed sum over the trails of its
  hull; its average square is the sum of the trails' squares; for a given key it
  can be much smaller or larger than the main trail.
- Several approximations together add their squared correlations (capacity);
  the multidimensional method uses a whole linear space and makes no
  independence assumption.
- Approximations with exactly zero correlation, found by miss in the middle,
  give zero-correlation attacks; they are equivalent to integral properties.
- Differential-linear attacks combine a short differential with a short linear
  approximation; their correlation is itself a sum over the masks in the middle.
- Designers bound trails with low-linearity S-boxes and linear layers of high
  branch number (the wide trail strategy); hull effects are why PRESENT and
  SIMON have thin margins and AES does not.

## Further reading

- Anne Tardy-Corfdir and Henri Gilbert, "A Known Plaintext Attack of FEAL-4 and
  FEAL-6" (CRYPTO 1991).
- Mitsuru Matsui and Atsuhiro Yamagishi, "A New Method for Known Plaintext Attack
  of FEAL Cipher" (EUROCRYPT 1992).
- Mitsuru Matsui, "Linear Cryptanalysis Method for DES Cipher" (EUROCRYPT 1993).
- Mitsuru Matsui, "The First Experimental Cryptanalysis of the Data Encryption
  Standard" (CRYPTO 1994).
- Mitsuru Matsui, "On Correlation Between the Order of S-boxes and the Strength
  of DES" (EUROCRYPT 1994): the branch-and-bound trail search.
- Kaisa Nyberg, "Linear Approximation of Block Ciphers" (EUROCRYPT 1994).
- Joan Daemen, René Govaerts and Joos Vandewalle, "Correlation Matrices" (FSE
  1994).
- Burton Kaliski and Matthew Robshaw, "Linear Cryptanalysis Using Multiple
  Approximations" (CRYPTO 1994).
- Susan Langford and Martin Hellman, "Differential-Linear Cryptanalysis" (CRYPTO
  1994).
- Don Coppersmith, "The Data Encryption Standard (DES) and Its Strength Against
  Attacks", *IBM Journal of Research and Development* 38 (1994).
- Mitsuru Matsui, "New Block Encryption Algorithm MISTY" (FSE 1997).
- Lars Knudsen and John Erik Mathiassen, "A Chosen-Plaintext Linear Attack on
  DES" (FSE 2000).
- Pascal Junod, "On the Complexity of Matsui's Attack" (SAC 2001).
- Howard Heys, "A Tutorial on Linear and Differential Cryptanalysis",
  *Cryptologia* 26 (2002): the toy cipher used here.
- Joan Daemen and Vincent Rijmen, *The Design of Rijndael* (Springer, 2002; 2nd
  edition 2020): the wide trail strategy.
- Eli Biham, Orr Dunkelman and Nathan Keller, "Enhancing Differential-Linear
  Cryptanalysis" (ASIACRYPT 2002).
- Johan Wallén, "Linear Approximations of Addition Modulo $2^n$" (FSE 2003).
- Alex Biryukov, Christophe De Cannière and Michaël Quisquater, "On Multiple
  Linear Approximations" (CRYPTO 2004).
- Thomas Baignères, Pascal Junod and Serge Vaudenay, "How Far Can We Go Beyond
  Linear Cryptanalysis?" (ASIACRYPT 2004).
- Sean Murphy, "The Effectiveness of the Linear Hull Effect" (technical report,
  Royal Holloway, 2006).
- Andrey Bogdanov and colleagues, "PRESENT: An Ultra-Lightweight Block Cipher"
  (CHES 2007).
- Liam Keliher and Jiayuan Sui, "Exact Maximum Expected Differential and Linear
  Probability for Two-Round Advanced Encryption Standard", *IET Information
  Security* 1 (2007).
- Joan Daemen and Vincent Rijmen, "Probability Distributions of Correlation and
  Differentials in Block Ciphers", *Journal of Mathematical Cryptology* 1
  (2007).
- Baudoin Collard, François-Xavier Standaert and Jean-Jacques Quisquater,
  "Improving the Time Complexity of Matsui's Linear Cryptanalysis" (ICISC 2007).
- Ali Aydın Selçuk, "On Probability of Success in Linear and Differential
  Cryptanalysis", *Journal of Cryptology* 21 (2008).
- Miia Hermelin, Joo Yeon Cho and Kaisa Nyberg, "Multidimensional Linear
  Cryptanalysis of Reduced Round Serpent" (ACISP 2008) and "Multidimensional
  Extension of Matsui's Algorithm 2" (FSE 2009).
- Kenji Ohkuma, "Weak Keys of Reduced-Round PRESENT for Linear Cryptanalysis"
  (SAC 2009).
- Joo Yeon Cho, "Linear Cryptanalysis of Reduced-Round PRESENT" (CT-RSA 2010).
- Gregor Leander, "On Linear Hulls, Statistical Saturation Attacks, PRESENT and
  a Cryptanalysis of PUFFIN" (EUROCRYPT 2011).
- Nicky Mouha, Qingju Wang, Dawu Gu and Bart Preneel, "Differential and Linear
  Cryptanalysis Using Mixed-Integer Linear Programming" (Inscrypt 2011).
- Andrey Bogdanov and Vincent Rijmen, "Linear Hulls with Correlation Zero and
  Linear Cryptanalysis of Block Ciphers" (2011; *Designs, Codes and
  Cryptography* 70, 2014).
- Andrey Bogdanov and Meiqin Wang, "Zero Correlation Linear Cryptanalysis with
  Reduced Data Complexity" (FSE 2012).
- Andrey Bogdanov, Gregor Leander, Kaisa Nyberg and Meiqin Wang, "Integral and
  Multidimensional Linear Distinguishers with Correlation Zero" (ASIACRYPT
  2012).
- Andrey Bogdanov and Elmar Tischhauser, "On the Wrong Key Randomisation and Key
  Equivalence Hypotheses in Matsui's Algorithm 2" (FSE 2013).
- Stefan Kölbl, Gregor Leander and Tyge Tiessen, "Observations on the SIMON
  Block Cipher Family" (CRYPTO 2015).
- Gaëtan Leurent, "Improved Differential-Linear Cryptanalysis of 7-Round Chaskey
  with Partitioning" (EUROCRYPT 2016).
- Marc Kaplan, Gaëtan Leurent, Anthony Leverrier and María Naya-Plasencia,
  "Quantum Differential and Linear Cryptanalysis" (FSE 2017).
- Céline Blondeau, Gregor Leander and Kaisa Nyberg, "Differential-Linear
  Cryptanalysis Revisited", *Journal of Cryptology* 30 (2017).
- Andrey Bogdanov and Philip S. Vejre, "Linear Cryptanalysis of DES with
  Asymmetries" (ASIACRYPT 2017).
- Achiya Bar-On, Orr Dunkelman, Nathan Keller and Ariel Weizman, "DLCT: A New
  Tool for Differential-Linear Cryptanalysis" (EUROCRYPT 2019).
- Antonio Flórez-Gutiérrez and María Naya-Plasencia, "Improving Key-Recovery in
  Linear Attacks: Application to 28-Round PRESENT" (EUROCRYPT 2020).
- Christof Beierle, Gregor Leander and Yosuke Todo, "Improved Differential-Linear
  Attacks with Applications to ARX Ciphers" (CRYPTO 2020).
- Standards: FIPS 46-3 (DES, withdrawn 2005), FIPS 197 (AES), ISO/IEC 29192-2
  (PRESENT).
