# 6. Block Ciphers

*A stream cipher encrypts bit by bit. A block cipher takes a fixed-size block,
say 64 or 128 bits, and scrambles all of it at once under a key, so that every
output bit depends on every input bit. This chapter explains how such a thing is
built from small, weak pieces, using the cipher that taught the world how: DES,
the US Data Encryption Standard of 1977. You will build DES and run it on the
classic test vector, see why its 56-bit key fell to a \$250,000 machine, why
doubling it does not double its strength, and how differential and linear
cryptanalysis, the two great attacks on block ciphers, work on a cipher small
enough to break on a laptop.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a block cipher is, and Shannon's two principles of confusion and diffusion;
    - how substitution-permutation networks and Feistel networks are built, and
      why a Feistel network decrypts even when its round function can't be undone;
    - how DES works, round by round, with real numbers;
    - why the 56-bit key fell, why double DES is no better, and how triple DES works;
    - how differential and linear cryptanalysis recover key bits, by doing both on
      a toy cipher.

    **You need:** [Chapter 5](05-Stream-Ciphers.md) (XOR, keystreams, the
    birthday bound from [Chapter 4](04-Randomness-and-Perfect-Secrecy.md)), and
    binary numbers.

    **Levels:** §6.1 to §6.3 are for beginners, §6.4 to §6.10 are intermediate,
    §6.11 is expert.

## 6.1 The problem

In the late 1960s computers began to hold things worth stealing: payrolls, bank
balances, medical records. Banks wanted to connect cash machines to central
computers over ordinary telephone lines and to send money between branches.
Every cipher strong enough for the job belonged to a government, and none was
for sale. Outside the military there was no public, tested cipher at all.

At IBM's research laboratory in Yorktown Heights, New York, Horst Feistel set out
to make one. Feistel had left Germany for the United States in 1934 and had worked
on identification systems for the US Air Force. At IBM in the late 1960s and early
1970s he led work on a family of ciphers called **Lucifer**. In 1973 the US
National Bureau of Standards (NBS, today NIST) asked for a cipher that could become
a public federal standard. Nothing suitable arrived. A second call went out in
August 1974, and IBM submitted a cipher developed from Lucifer. In January 1977 it
became Federal Information Processing Standard 46, the **Data Encryption
Standard**, or DES. For the next twenty years it was the most widely used cipher
in the world.

The name Lucifer has a small story of its own. As it is usually told, the
project's programs were first called "Demonstration", the computer system IBM
used limited the length of names, "Demonstration" was cut to "Demon", and Demon
became Lucifer. Feistel described his ideas to the public in *Scientific
American* in May 1973, at a time when almost nothing about cipher design was
published outside governments. Banks adopted DES quickly: the American banking
standards body accepted it in 1981 as ANSI X3.92, and for two decades it
protected the PINs typed into cash machines and the messages between banks.
Figure 6.1 shows the whole life of the cipher, from Shannon's paper to the
retirement of triple DES.

<figure class="mars-fig">
<svg viewBox="0 0 640 420" width="640" role="img" aria-label="Timeline of DES from Shannon's 1949 paper to the retirement of triple DES in 2023" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="412" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" font-size="14" text-anchor="end" font-weight="bold">1949</text>
<circle cx="92" cy="22" r="3.5" fill="currentColor"/>
<text x="108" y="27" font-size="14" text-anchor="start">Shannon names confusion and diffusion</text>
<text x="78" y="53" font-size="14" text-anchor="end" font-weight="bold">1973</text>
<circle cx="92" cy="48" r="3.5" fill="currentColor"/>
<text x="108" y="53" font-size="14" text-anchor="start">NBS asks for a public cipher; Feistel describes Lucifer</text>
<text x="78" y="79" font-size="14" text-anchor="end" font-weight="bold">1974</text>
<circle cx="92" cy="74" r="3.5" fill="currentColor"/>
<text x="108" y="79" font-size="14" text-anchor="start">IBM submits its cipher; finds the 'T-attack' in secret</text>
<text x="78" y="105" font-size="14" text-anchor="end" font-weight="bold">1977</text>
<circle cx="92" cy="100" r="3.5" fill="currentColor"/>
<text x="108" y="105" font-size="14" text-anchor="start">DES becomes FIPS 46; Diffie-Hellman cost the key search</text>
<text x="78" y="131" font-size="14" text-anchor="end" font-weight="bold">1981</text>
<circle cx="92" cy="126" r="3.5" fill="currentColor"/>
<text x="108" y="131" font-size="14" text-anchor="start">Banks adopt DES (ANSI X3.92)</text>
<text x="78" y="157" font-size="14" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="152" r="3.5" fill="currentColor"/>
<text x="108" y="157" font-size="14" text-anchor="start">Luby and Rackoff prove the Feistel structure sound</text>
<text x="78" y="183" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1990</text>
<circle cx="92" cy="178" r="4.5" class="acc-fill"/>
<text x="108" y="183" font-size="14" text-anchor="start" class="acc-fill">Biham and Shamir publish differential cryptanalysis</text>
<text x="78" y="209" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1993</text>
<circle cx="92" cy="204" r="4.5" class="acc-fill"/>
<text x="108" y="209" font-size="14" text-anchor="start" class="acc-fill">Matsui publishes linear cryptanalysis</text>
<text x="78" y="235" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1994</text>
<circle cx="92" cy="230" r="4.5" class="acc-fill"/>
<text x="108" y="235" font-size="14" text-anchor="start" class="acc-fill">Matsui breaks DES with 2⁴³ known texts; Coppersmith</text>
<text x="78" y="261" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1997</text>
<circle cx="92" cy="256" r="4.5" class="acc-fill"/>
<text x="108" y="261" font-size="14" text-anchor="start" class="acc-fill">DESCHALL volunteers find a DES key in 96 days</text>
<text x="78" y="287" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1998</text>
<circle cx="92" cy="282" r="4.5" class="acc-fill"/>
<text x="108" y="287" font-size="14" text-anchor="start" class="acc-fill">EFF's Deep Crack: 56 hours; triple DES in ANSI X9.52</text>
<text x="78" y="313" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1999</text>
<circle cx="92" cy="308" r="4.5" class="acc-fill"/>
<text x="108" y="313" font-size="14" text-anchor="start" class="acc-fill">22 hours with distributed.net; FIPS 46-3 (triple DES)</text>
<text x="78" y="339" font-size="14" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="334" r="3.5" fill="currentColor"/>
<text x="108" y="339" font-size="14" text-anchor="start">NIST withdraws DES</text>
<text x="78" y="365" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2016</text>
<circle cx="92" cy="360" r="4.5" class="acc-fill"/>
<text x="108" y="365" font-size="14" text-anchor="start" class="acc-fill">Sweet32 reads cookies through 64-bit blocks</text>
<text x="78" y="391" font-size="14" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="386" r="3.5" fill="currentColor"/>
<text x="108" y="391" font-size="14" text-anchor="start">Triple DES disallowed for encryption</text>
</svg>
<figcaption>Figure 6.1. The life of DES. Accent marks the attacks: the clever ones (differential, linear) never broke it in practice; brute force and the small block did.</figcaption>
</figure>

What was IBM trying to build? Think of the simplest possible version: a
**codebook**. For each key, write down a table that gives, for every possible
64-bit block, a different 64-bit block. Encrypting looks up the table; decrypting
looks it up backwards. Mathematically, each key picks a **permutation** of the
$2^{64}$ blocks, and the ideal cipher would pick it at random.

<figure class="mars-fig">
<svg viewBox="0 0 620 250" width="620" role="img" aria-label="Two keys pick two different permutations of the eight 3-bit blocks" fill="currentColor" font-size="13">
<text x="150" y="20" font-size="13" text-anchor="middle" font-weight="bold">key K₁</text>
<rect x="40" y="32" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="46.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">000</text>
<rect x="212" y="182" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="196.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">110</text>
<line x1="88" y1="42" x2="212" y2="192" stroke="currentColor" stroke-width="1.1"/>
<polygon points="212,192 205.8,188.8 210,185.3" fill="currentColor"/>
<rect x="40" y="57" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="71.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">001</text>
<rect x="212" y="107" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="121.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">011</text>
<line x1="88" y1="67" x2="212" y2="117" stroke="currentColor" stroke-width="1.1"/>
<polygon points="212,117 205,117.1 207,112.1" fill="currentColor"/>
<rect x="40" y="82" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="96.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">010</text>
<rect x="212" y="57" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="71.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">001</text>
<line x1="88" y1="92" x2="212" y2="67" stroke="currentColor" stroke-width="1.1"/>
<polygon points="212,67 206.2,70.9 205.1,65.6" fill="currentColor"/>
<rect x="40" y="107" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="121.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">011</text>
<rect x="212" y="32" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="46.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">000</text>
<line x1="88" y1="117" x2="212" y2="42" class="acc" stroke-width="1.1"/>
<polygon points="212,42 207.9,47.7 205.1,43" class="acc-fill"/>
<rect x="40" y="132" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="146.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">100</text>
<rect x="212" y="207" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="221.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">111</text>
<line x1="88" y1="142" x2="212" y2="217" stroke="currentColor" stroke-width="1.1"/>
<polygon points="212,217 205.1,216 207.9,211.3" fill="currentColor"/>
<rect x="40" y="157" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="171.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">101</text>
<rect x="212" y="82" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="96.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">010</text>
<line x1="88" y1="167" x2="212" y2="92" stroke="currentColor" stroke-width="1.1"/>
<polygon points="212,92 207.9,97.7 205.1,93" fill="currentColor"/>
<rect x="40" y="182" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="196.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">110</text>
<rect x="212" y="157" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="171.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">101</text>
<line x1="88" y1="192" x2="212" y2="167" stroke="currentColor" stroke-width="1.1"/>
<polygon points="212,167 206.2,170.9 205.1,165.6" fill="currentColor"/>
<rect x="40" y="207" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="64" y="221.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">111</text>
<rect x="212" y="132" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="236" y="146.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">100</text>
<line x1="88" y1="217" x2="212" y2="142" stroke="currentColor" stroke-width="1.1"/>
<polygon points="212,142 207.9,147.7 205.1,143" fill="currentColor"/>
<text x="470" y="20" font-size="13" text-anchor="middle" font-weight="bold">key K₂</text>
<rect x="360" y="32" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="46.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">000</text>
<rect x="532" y="132" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="146.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">100</text>
<line x1="408" y1="42" x2="532" y2="142" stroke="currentColor" stroke-width="1.1"/>
<polygon points="532,142 525.3,140.1 528.7,135.8" fill="currentColor"/>
<rect x="360" y="57" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="71.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">001</text>
<rect x="532" y="182" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="196.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">110</text>
<line x1="408" y1="67" x2="532" y2="192" stroke="currentColor" stroke-width="1.1"/>
<polygon points="532,192 525.5,189.3 529.4,185.5" fill="currentColor"/>
<rect x="360" y="82" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="96.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">010</text>
<rect x="532" y="157" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="171.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">101</text>
<line x1="408" y1="92" x2="532" y2="167" stroke="currentColor" stroke-width="1.1"/>
<polygon points="532,167 525.1,166 527.9,161.3" fill="currentColor"/>
<rect x="360" y="107" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="121.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">011</text>
<rect x="532" y="107" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="121.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">011</text>
<line x1="408" y1="117" x2="532" y2="117" class="acc" stroke-width="1.1"/>
<polygon points="532,117 525.6,119.7 525.6,114.3" class="acc-fill"/>
<rect x="360" y="132" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="146.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">100</text>
<rect x="532" y="82" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="96.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">010</text>
<line x1="408" y1="142" x2="532" y2="92" stroke="currentColor" stroke-width="1.1"/>
<polygon points="532,92 527,96.9 525,91.9" fill="currentColor"/>
<rect x="360" y="157" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="171.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">101</text>
<rect x="532" y="207" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="221.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">111</text>
<line x1="408" y1="167" x2="532" y2="217" stroke="currentColor" stroke-width="1.1"/>
<polygon points="532,217 525,217.1 527,212.1" fill="currentColor"/>
<rect x="360" y="182" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="196.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">110</text>
<rect x="532" y="57" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="71.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">001</text>
<line x1="408" y1="192" x2="532" y2="67" stroke="currentColor" stroke-width="1.1"/>
<polygon points="532,67 529.4,73.5 525.5,69.7" fill="currentColor"/>
<rect x="360" y="207" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="384" y="221.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">111</text>
<rect x="532" y="32" width="48" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="556" y="46.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">000</text>
<line x1="408" y1="217" x2="532" y2="42" stroke="currentColor" stroke-width="1.1"/>
<polygon points="532,42 530.5,48.8 526,45.7" fill="currentColor"/>
<text x="310" y="245" font-size="13" text-anchor="middle">every block goes to a different block, so the table can be read backwards</text>
</svg>
<figcaption>Figure 6.2. A block cipher in miniature: with 3-bit blocks, each key chooses one of the 8! = 40,320 ways to shuffle the 8 blocks. DES does the same with 2⁶⁴ blocks, and only 2⁵⁶ of the possible shuffles are reachable by a key.</figcaption>
</figure>

That ideal is impossible to store: one table has $2^{64}$ entries of 8 bytes, far
more than all the storage on Earth. A **block cipher** is a short program that
behaves like such a table. Formally, it is a pair of functions

$$
E: \{0,1\}^k \times \{0,1\}^b \to \{0,1\}^b, \qquad D: \{0,1\}^k \times \{0,1\}^b \to \{0,1\}^b,
$$

with a $k$-bit key and a $b$-bit block, such that $D_K(E_K(P)) = P$ for every key
$K$ and block $P$. For DES, $k = 56$ and $b = 64$. For AES, the subject of
[Chapter 7](07-AES.md), $k$ is 128, 192 or 256 and $b = 128$.

The goal is a program that nobody without the key can tell apart from a randomly
chosen permutation. Nobody knows how to prove that a given design achieves it.
What we have instead is a recipe that has held up for fifty years, and a list of
attacks every design must beat. This chapter is about both.

## 6.2 Confusion and diffusion

In his 1949 paper "Communication Theory of Secrecy Systems", Claude Shannon named
the two properties a cipher needs.

- **Confusion:** the relation between the key and the ciphertext should be as
  complicated as possible. In practice this comes from small lookup tables,
  **S-boxes** (substitution boxes), whose output is a highly nonlinear function of
  their input.
- **Diffusion:** each bit of plaintext should affect many bits of ciphertext, so
  that patterns in the plaintext are spread thin. In practice this comes from
  moving bits around and mixing them linearly.

Each property alone is weak. A substitution cipher is all confusion and
transposition is all diffusion, and [Chapter 2](02-Classical-Ciphers.md) broke
both. Shannon's idea was the **product cipher**: alternate a confusion step and a
diffusion step, and repeat. Each repetition is a **round**, and each round mixes in
its own **round key** made from the main key by a **key schedule**. Weak steps,
repeated enough times, become strong.

### By hand: one round of a toy cipher

Here is a cipher small enough to do on paper, from Howard Heys's well-known
tutorial on block cipher attacks. The block is 16 bits, seen as four 4-bit pieces.
One round does three things:

1. **Key mixing:** XOR the 16-bit round key.
2. **Substitution:** send each 4-bit piece through the same S-box:

    | $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
    |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
    | $S(x)$ | E | 4 | D | 1 | 2 | F | B | 8 | 3 | A | 6 | C | 5 | 9 | 0 | 7 |

3. **Permutation:** write the four pieces as the rows of a $4 \times 4$ grid of
   bits and read it out by columns. Bit $i$ of piece $j$ becomes bit $j$ of piece
   $i$, so each piece's four output bits go to four different pieces.

Encrypt the block `26B7` with the round key `3A94`:

| Step | Bits | Hex |
|---|---|---|
| Plaintext | `0010 0110 1011 0111` | `26B7` |
| XOR round key `3A94` | `0001 1100 0010 0011` | `1C23` |
| S-box on each piece: $1 \to 4$, $C \to 5$, $2 \to D$, $3 \to 1$ | `0100 0101 1101 0001` | `45D1` |
| Read the grid by columns | `0010 1110 0000 0111` | `2E07` |

For the last step, the grid is

$$
\begin{matrix}
0 & 1 & 0 & 0 \\
0 & 1 & 0 & 1 \\
1 & 1 & 0 & 1 \\
0 & 0 & 0 & 1
\end{matrix}
$$

and its columns, top to bottom, are `0010`, `1110`, `0000`, `0111`.

<figure class="mars-fig">
<svg viewBox="0 0 680 330" width="680" role="img" aria-label="One round of the toy SPN on 26B7 with key 3A94: key XOR, four S-boxes, then the bit permutation gives 2E07" fill="currentColor" font-size="13">
<text x="40" y="34" font-size="13" text-anchor="end" font-style="italic">P</text>
<text x="40" y="84" font-size="13" text-anchor="end" font-style="italic">⊕ K</text>
<text x="80" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<line x1="80" y1="40" x2="80" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="80" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="74" y1="75" x2="86" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="80" y1="69" x2="80" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="80" y1="81" x2="80" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="89" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="110" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<line x1="110" y1="40" x2="110" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="110" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="104" y1="75" x2="116" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="110" y1="69" x2="110" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="110" y1="81" x2="110" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="119" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="140" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="140" y1="40" x2="140" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="140" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="134" y1="75" x2="146" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="140" y1="69" x2="140" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="140" y1="81" x2="140" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="149" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="170" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<line x1="170" y1="40" x2="170" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="170" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="164" y1="75" x2="176" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="170" y1="69" x2="170" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="170" y1="81" x2="170" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="179" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="68" y="100" width="114" height="32" rx="4" class="soft"/>
<rect x="68" y="100" width="114" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125" y="120.5" font-size="13" text-anchor="middle" font-weight="bold">S</text>
<text x="80" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="110" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="140" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="170" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="230" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<line x1="230" y1="40" x2="230" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="230" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="224" y1="75" x2="236" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="230" y1="69" x2="230" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="230" y1="81" x2="230" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="239" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="260" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="260" y1="40" x2="260" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="260" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="254" y1="75" x2="266" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="260" y1="69" x2="260" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="260" y1="81" x2="260" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="269" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="290" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="290" y1="40" x2="290" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="290" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="284" y1="75" x2="296" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="290" y1="69" x2="290" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="290" y1="81" x2="290" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="299" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="320" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<line x1="320" y1="40" x2="320" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="320" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="314" y1="75" x2="326" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="320" y1="69" x2="320" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="320" y1="81" x2="320" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="329" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="218" y="100" width="114" height="32" rx="4" class="soft-acc"/>
<rect x="218" y="100" width="114" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="275" y="120.5" font-size="13" text-anchor="middle" font-weight="bold">S</text>
<text x="230" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="260" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="290" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="320" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="380" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="380" y1="40" x2="380" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="380" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="374" y1="75" x2="386" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="380" y1="69" x2="380" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="380" y1="81" x2="380" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="389" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="410" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<line x1="410" y1="40" x2="410" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="410" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="404" y1="75" x2="416" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="410" y1="69" x2="410" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="410" y1="81" x2="410" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="419" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="440" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="440" y1="40" x2="440" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="440" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="434" y1="75" x2="446" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="440" y1="69" x2="440" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="440" y1="81" x2="440" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="449" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="470" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="470" y1="40" x2="470" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="470" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="464" y1="75" x2="476" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="470" y1="69" x2="470" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="470" y1="81" x2="470" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="479" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="368" y="100" width="114" height="32" rx="4" class="soft"/>
<rect x="368" y="100" width="114" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="425" y="120.5" font-size="13" text-anchor="middle" font-weight="bold">S</text>
<text x="380" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="410" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="440" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="470" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="530" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<line x1="530" y1="40" x2="530" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="530" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="524" y1="75" x2="536" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="530" y1="69" x2="530" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="530" y1="81" x2="530" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="539" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="560" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="560" y1="40" x2="560" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="560" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="554" y1="75" x2="566" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="560" y1="69" x2="560" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="560" y1="81" x2="560" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="569" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="590" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="590" y1="40" x2="590" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="590" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="584" y1="75" x2="596" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="590" y1="69" x2="590" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="590" y1="81" x2="590" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="599" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="620" y="34" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<line x1="620" y1="40" x2="620" y2="66" stroke="currentColor" stroke-width="1"/>
<circle cx="620" cy="75" r="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="614" y1="75" x2="626" y2="75" stroke="currentColor" stroke-width="1.4"/>
<line x1="620" y1="69" x2="620" y2="81" stroke="currentColor" stroke-width="1.4"/>
<line x1="620" y1="81" x2="620" y2="100" stroke="currentColor" stroke-width="1"/>
<text x="629" y="96" font-size="12" text-anchor="start" fill-opacity="0.85" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="518" y="100" width="114" height="32" rx="4" class="soft"/>
<rect x="518" y="100" width="114" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="575" y="120.5" font-size="13" text-anchor="middle" font-weight="bold">S</text>
<text x="530" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="560" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="590" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="620" y="150" font-size="13" text-anchor="middle" fill-opacity="0.9" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="40" y="150" font-size="13" text-anchor="end" font-style="italic">S</text>
<line x1="80" y1="156" x2="80" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="80" y1="166" x2="80" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="80" y1="256" x2="80" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="110" y1="156" x2="110" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="110" y1="166" x2="230" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="230" y1="256" x2="230" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="140" y1="156" x2="140" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="140" y1="166" x2="380" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="380" y1="256" x2="380" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="170" y1="156" x2="170" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="170" y1="166" x2="530" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="530" y1="256" x2="530" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="230" y1="156" x2="230" y2="166" class="acc" stroke-width="1"/>
<line x1="230" y1="166" x2="110" y2="256" class="acc" stroke-width="1.1"/>
<line x1="110" y1="256" x2="110" y2="266" class="acc" stroke-width="1"/>
<line x1="260" y1="156" x2="260" y2="166" class="acc" stroke-width="1"/>
<line x1="260" y1="166" x2="260" y2="256" class="acc" stroke-width="1.1"/>
<line x1="260" y1="256" x2="260" y2="266" class="acc" stroke-width="1"/>
<line x1="290" y1="156" x2="290" y2="166" class="acc" stroke-width="1"/>
<line x1="290" y1="166" x2="410" y2="256" class="acc" stroke-width="1.1"/>
<line x1="410" y1="256" x2="410" y2="266" class="acc" stroke-width="1"/>
<line x1="320" y1="156" x2="320" y2="166" class="acc" stroke-width="1"/>
<line x1="320" y1="166" x2="560" y2="256" class="acc" stroke-width="1.1"/>
<line x1="560" y1="256" x2="560" y2="266" class="acc" stroke-width="1"/>
<line x1="380" y1="156" x2="380" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="380" y1="166" x2="140" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="140" y1="256" x2="140" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="410" y1="156" x2="410" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="410" y1="166" x2="290" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="290" y1="256" x2="290" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="440" y1="156" x2="440" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="440" y1="166" x2="440" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="440" y1="256" x2="440" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="470" y1="156" x2="470" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="470" y1="166" x2="590" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="590" y1="256" x2="590" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="530" y1="156" x2="530" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="530" y1="166" x2="170" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="170" y1="256" x2="170" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="560" y1="156" x2="560" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="560" y1="166" x2="320" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="320" y1="256" x2="320" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="590" y1="156" x2="590" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="590" y1="166" x2="470" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="470" y1="256" x2="470" y2="266" stroke="currentColor" stroke-width="1"/>
<line x1="620" y1="156" x2="620" y2="166" stroke="currentColor" stroke-width="1"/>
<line x1="620" y1="166" x2="620" y2="256" stroke="currentColor" stroke-width="0.9"/>
<line x1="620" y1="256" x2="620" y2="266" stroke="currentColor" stroke-width="1"/>
<text x="80" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="110" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="140" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="170" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="230" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="260" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="290" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="320" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="380" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="410" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="440" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="470" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="530" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="560" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="590" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="620" y="284" font-size="14" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="40" y="284" font-size="13" text-anchor="end" font-style="italic">out</text>
<text x="340" y="318" font-size="13.5" text-anchor="middle">26B7 ⊕ 3A94 = 1C23 → S-boxes → 45D1 → permute → 2E07</text>
<text x="660" y="214" font-size="12.5" text-anchor="end" fill-opacity="0.85">bit i of piece j</text>
<text x="660" y="230" font-size="12.5" text-anchor="end" fill-opacity="0.85">→ bit j of piece i</text>
</svg>
<figcaption>Figure 6.3. The toy cipher's round on the example of the text. The accent wires follow the outputs of the second S-box: the permutation sends its four bits to four different S-boxes of the next round. That is diffusion.</figcaption>
</figure>

After one round, a change to one plaintext bit changes the input of one S-box,
which changes some of its four output bits, which the permutation sends to
different pieces. In the next round those pieces' S-boxes all change. That
spreading is diffusion, and the S-boxes' unpredictability is confusion.

**The avalanche test.** A good cipher shows the **avalanche effect**: flip one
bit of the plaintext or the key, and after a few rounds about half of the output
bits flip, with no visible pattern in which ones. Designers measure this first,
because a cipher that fails it is certainly weak. Passing it, as the end of this
chapter shows, is far from enough.

## 6.3 Two ways to build a round

There are two families of designs, and almost every block cipher belongs to one.

### Substitution-permutation networks

The toy cipher above is a **substitution-permutation network** (SPN): every round
transforms the whole block through S-boxes and a mixing layer. To decrypt, run
every step backwards in reverse order, so every step must be invertible: the
S-box must be a permutation of its inputs, and the mixing layer must be
reversible. AES is an SPN, and [Chapter 7](07-AES.md) builds it.

### Feistel networks

Feistel's structure, the one inside DES, is different. Split the block into a left
half $L$ and a right half $R$. Each round computes

$$
L_{i+1} = R_i, \qquad R_{i+1} = L_i \oplus F(K_i, R_i),
$$

where $F$ is a **round function** of the right half and the round key. Only half
the block changes per round, so a Feistel cipher needs more rounds than an SPN,
but it has a remarkable property.

**Why it decrypts.** Given the output $(L_{i+1}, R_{i+1})$ of a round, you
already have $R_i$, because $R_i = L_{i+1}$. So you can recompute $F(K_i, R_i)$
yourself and XOR it away:

$$
R_i = L_{i+1}, \qquad L_i = R_{i+1} \oplus F(K_i, L_{i+1}).
$$

<figure class="mars-fig">
<svg viewBox="0 0 680 300" width="680" role="img" aria-label="A Feistel round, and decryption with the same circuit" fill="currentColor" font-size="13">
<text x="150" y="18" font-size="13" text-anchor="middle" font-weight="bold">encrypt one round</text>
<rect x="30" y="30" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80" y="49.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Lᵢ</text>
<rect x="170" y="30" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="220" y="49.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Rᵢ</text>
<line x1="80" y1="60" x2="80" y2="106" stroke="currentColor" stroke-width="1.4"/>
<circle cx="80" cy="115" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="71" y1="115" x2="89" y2="115" class="acc" stroke-width="1.4"/>
<line x1="80" y1="106" x2="80" y2="124" class="acc" stroke-width="1.4"/>
<line x1="220" y1="60" x2="220" y2="170" stroke="currentColor" stroke-width="1.4"/>
<circle cx="220" cy="115" r="3" fill="currentColor"/>
<line x1="220" y1="115" x2="175" y2="115" stroke="currentColor" stroke-width="1.4"/>
<polygon points="175,115 181.4,112.3 181.4,117.7" fill="currentColor"/>
<rect x="115" y="100" width="60" height="30" rx="4" class="soft-acc"/>
<rect x="115" y="100" width="60" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="145" y="119.5" font-size="13" text-anchor="middle" font-weight="bold">F</text>
<line x1="115" y1="115" x2="89" y2="115" class="acc" stroke-width="1.4"/>
<polygon points="89,115 95.4,112.3 95.4,117.7" class="acc-fill"/>
<line x1="145" y1="82" x2="145" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="145,100 142.3,93.6 147.7,93.6" fill="currentColor"/>
<text x="145" y="77" font-size="13" text-anchor="middle">Kᵢ</text>
<line x1="80" y1="124" x2="80" y2="170" stroke="currentColor" stroke-width="1.4"/>
<line x1="80" y1="170" x2="220" y2="225" stroke="currentColor" stroke-width="1.4"/>
<line x1="220" y1="170" x2="80" y2="225" stroke="currentColor" stroke-width="1.4"/>
<line x1="80" y1="225" x2="80" y2="240" stroke="currentColor" stroke-width="1.4"/>
<polygon points="80,240 77.3,233.6 82.7,233.6" fill="currentColor"/>
<line x1="220" y1="225" x2="220" y2="240" stroke="currentColor" stroke-width="1.4"/>
<polygon points="220,240 217.3,233.6 222.7,233.6" fill="currentColor"/>
<rect x="30" y="240" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80" y="259.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Lᵢ₊₁ = Rᵢ</text>
<rect x="170" y="240" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="220" y="259.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Rᵢ₊₁</text>
<text x="520" y="18" font-size="13" text-anchor="middle" font-weight="bold">decrypt: same circuit</text>
<rect x="400" y="30" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="450" y="49.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Rᵢ₊₁</text>
<rect x="540" y="30" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="590" y="49.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Lᵢ₊₁</text>
<line x1="450" y1="60" x2="450" y2="106" stroke="currentColor" stroke-width="1.4"/>
<circle cx="450" cy="115" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="441" y1="115" x2="459" y2="115" class="acc" stroke-width="1.4"/>
<line x1="450" y1="106" x2="450" y2="124" class="acc" stroke-width="1.4"/>
<line x1="590" y1="60" x2="590" y2="170" stroke="currentColor" stroke-width="1.4"/>
<circle cx="590" cy="115" r="3" fill="currentColor"/>
<line x1="590" y1="115" x2="545" y2="115" stroke="currentColor" stroke-width="1.4"/>
<polygon points="545,115 551.4,112.3 551.4,117.7" fill="currentColor"/>
<rect x="485" y="100" width="60" height="30" rx="4" class="soft-acc"/>
<rect x="485" y="100" width="60" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="515" y="119.5" font-size="13" text-anchor="middle" font-weight="bold">F</text>
<line x1="485" y1="115" x2="459" y2="115" class="acc" stroke-width="1.4"/>
<polygon points="459,115 465.4,112.3 465.4,117.7" class="acc-fill"/>
<line x1="515" y1="82" x2="515" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="515,100 512.3,93.6 517.7,93.6" fill="currentColor"/>
<text x="515" y="77" font-size="13" text-anchor="middle">Kᵢ</text>
<line x1="450" y1="124" x2="450" y2="170" stroke="currentColor" stroke-width="1.4"/>
<line x1="450" y1="170" x2="590" y2="225" stroke="currentColor" stroke-width="1.4"/>
<line x1="590" y1="170" x2="450" y2="225" stroke="currentColor" stroke-width="1.4"/>
<line x1="450" y1="225" x2="450" y2="240" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,240 447.3,233.6 452.7,233.6" fill="currentColor"/>
<line x1="590" y1="225" x2="590" y2="240" stroke="currentColor" stroke-width="1.4"/>
<polygon points="590,240 587.3,233.6 592.7,233.6" fill="currentColor"/>
<rect x="400" y="240" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="450" y="259.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Rᵢ</text>
<rect x="540" y="240" width="100" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="590" y="259.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Lᵢ</text>
<text x="340" y="292" font-size="13" text-anchor="middle">F only ever runs forwards, so it need not be invertible</text>
</svg>
<figcaption>Figure 6.4. Left: one Feistel round. Right: feed the output halves in swapped and the same circuit, with the same round key, returns the input halves (swapped back at the end). Decryption runs the rounds with the keys in reverse order.</figcaption>
</figure>

$F$ is only ever computed forwards. It never has to be inverted, so it can be any
function at all, even a one-way hash. Decryption is the same circuit as
encryption with the round keys taken in reverse order, which halved the cost of
hardware in the 1970s.

Here is a Feistel cipher whose round function is SHA-256, a hash with no inverse
([Chapter 9](09-Hash-Functions.md)). It still decrypts:

```python
import hashlib

def F(k, i, x):                     # any function works here: it is never inverted
    return int.from_bytes(hashlib.sha256(k + bytes([i]) + x.to_bytes(4, "big")).digest()[:4], "big")

def enc(k, b, rounds=8):            # b is a 64-bit block: two 32-bit halves
    L, R = b >> 32, b & 0xffffffff
    for i in range(rounds):
        L, R = R, L ^ F(k, i, R)
    return L << 32 | R

def dec(k, b, rounds=8):            # the same steps, round keys in reverse order
    L, R = b >> 32, b & 0xffffffff
    for i in reversed(range(rounds)):
        L, R = R ^ F(k, i, L), L
    return L << 32 | R

k = b"secret key"
c = enc(k, 0x0123456789abcdef)
print(hex(c), hex(dec(k, c)))       # 0x9c699dda3e1d47c8 0x123456789abcdef

for r in range(1, 7):               # flip one plaintext bit: how many output bits change?
    print(r, bin(enc(k, 0, r) ^ enc(k, 1, r)).count("1"))
```

After one round, 17 of 64 bits differ: only one half has been touched. From the
second round on the counts are 35, 31, 26, 34 and 35, about half of 64, which is
the avalanche you want. (The leading zero of the decrypted block is not printed
by `hex`.)

<figure class="mars-fig">
<svg viewBox="0 0 600 250" width="600" role="img" aria-label="Number of the 64 output bits that change when one plaintext bit is flipped, after 1 to 6 Feistel rounds" fill="currentColor" font-size="13">
<line x1="60" y1="210" x2="520" y2="210" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="210" x2="60" y2="20" stroke="currentColor" stroke-width="1.4"/>
<line x1="55" y1="210" x2="60" y2="210" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="214" font-size="12.5" text-anchor="end">0</text>
<line x1="55" y1="152.4" x2="60" y2="152.4" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="156.4" font-size="12.5" text-anchor="end">16</text>
<line x1="55" y1="94.8" x2="60" y2="94.8" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="98.8" font-size="12.5" text-anchor="end">32</text>
<line x1="55" y1="37.2" x2="60" y2="37.2" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="41.2" font-size="12.5" text-anchor="end">48</text>
<line x1="60" y1="94.8" x2="520" y2="94.8" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="526" y="98.8" font-size="12.5" text-anchor="start">half: 32</text>
<rect x="85" y="148.8" width="44" height="61.2" rx="2" class="acc-fill" fill-opacity="0.8"/>
<text x="107" y="142.8" font-size="13" text-anchor="middle" font-weight="bold">17</text>
<text x="107" y="228" font-size="13" text-anchor="middle">1</text>
<rect x="157" y="84" width="44" height="126" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="179" y="78" font-size="13" text-anchor="middle" font-weight="bold">35</text>
<text x="179" y="228" font-size="13" text-anchor="middle">2</text>
<rect x="229" y="98.4" width="44" height="111.6" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="251" y="92.4" font-size="13" text-anchor="middle" font-weight="bold">31</text>
<text x="251" y="228" font-size="13" text-anchor="middle">3</text>
<rect x="301" y="116.4" width="44" height="93.6" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="323" y="110.4" font-size="13" text-anchor="middle" font-weight="bold">26</text>
<text x="323" y="228" font-size="13" text-anchor="middle">4</text>
<rect x="373" y="87.6" width="44" height="122.4" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="395" y="81.6" font-size="13" text-anchor="middle" font-weight="bold">34</text>
<text x="395" y="228" font-size="13" text-anchor="middle">5</text>
<rect x="445" y="84" width="44" height="126" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="467" y="78" font-size="13" text-anchor="middle" font-weight="bold">35</text>
<text x="467" y="228" font-size="13" text-anchor="middle">6</text>
<text x="290" y="246" font-size="13" text-anchor="middle">rounds</text>
</svg>
<figcaption>Figure 6.5. The avalanche in the SHA-256 Feistel cipher of the code. After one round only the half that was touched has changed; from the second round on, about half of all 64 bits flip.</figcaption>
</figure>

In 1988 Michael Luby and Charles Rackoff proved that three Feistel rounds with
truly random round functions are indistinguishable from a random permutation,
and four rounds are enough even against an attacker who can also decrypt (§6.11).
Real ciphers use many more rounds, because a real $F$ is not truly random.

!!! note "Life story: the Feistel network"
    **Born:** early 1970s, Horst Feistel and his team at IBM's Yorktown Heights
    laboratory, in the Lucifer ciphers; described in *Scientific American* in
    1973 · **Purpose:** a cipher whose decryption is the same circuit as its
    encryption, whatever the round function · **Helped:** DES and triple DES,
    then GOST, Blowfish, Twofish, Camellia, SM4, and the format-preserving
    modes of [Chapter 8](08-Modes-of-Operation.md); Luby and Rackoff's 1988
    proof gave it a theory · **Status:** current; one of the two basic shapes
    of a block cipher

## 6.4 DES

*Level: intermediate.*

### The structure

DES is a Feistel cipher with a 64-bit block, 16 rounds and a 56-bit key.

- **Initial and final permutations.** The block's bits are first rearranged by a
  fixed permutation IP, and at the end by its inverse. They add no security; they
  suited the 8-bit hardware of the 1970s.
- **16 rounds** of $L_{i+1} = R_i$, $R_{i+1} = L_i \oplus f(R_i, K_i)$, with a 48-bit
  round key $K_i$. After the last round the halves are swapped back.
- **The key.** A DES key is written as 64 bits, but every eighth bit is a parity
  bit and is thrown away. 56 bits remain.

<figure class="mars-fig">
<svg viewBox="0 0 620 470" width="620" role="img" aria-label="Structure of DES: initial permutation, 16 Feistel rounds with round keys from the key schedule, final permutation" fill="currentColor" font-size="13">
<rect x="60" y="20" width="260" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="190" y="39.5" font-size="13" text-anchor="middle">plaintext (64 bits)</text>
<line x1="190" y1="50" x2="190" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="190,66 187.3,59.6 192.7,59.6" fill="currentColor"/>
<rect x="60" y="66" width="260" height="28" rx="4" class="soft"/>
<rect x="60" y="66" width="260" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="190" y="84.5" font-size="13" text-anchor="middle">IP (initial permutation)</text>
<line x1="120" y1="94" x2="120" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="120,110 117.3,103.6 122.7,103.6" fill="currentColor"/>
<line x1="260" y1="94" x2="260" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="260,110 257.3,103.6 262.7,103.6" fill="currentColor"/>
<rect x="70" y="110" width="100" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="120" y="127.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L0</text>
<rect x="210" y="110" width="100" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="260" y="127.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R0</text>
<rect x="205" y="144" width="50" height="22" rx="4" class="soft-acc"/>
<rect x="205" y="144" width="50" height="22" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="230" y="159.6" font-size="13" text-anchor="middle" font-weight="bold">f</text>
<line x1="260" y1="136" x2="260" y2="155" stroke="currentColor" stroke-width="1.4"/>
<circle cx="260" cy="155" r="2.5" fill="currentColor"/>
<circle cx="120" cy="155" r="7" fill="none" class="acc" stroke-width="1.4"/>
<line x1="113" y1="155" x2="127" y2="155" class="acc" stroke-width="1.4"/>
<line x1="120" y1="148" x2="120" y2="162" class="acc" stroke-width="1.4"/>
<line x1="120" y1="136" x2="120" y2="148" stroke="currentColor" stroke-width="1.4"/>
<line x1="205" y1="155" x2="128" y2="155" class="acc" stroke-width="1.4"/>
<polygon points="128,155 134.4,152.3 134.4,157.7" class="acc-fill"/>
<line x1="120" y1="162" x2="120" y2="170" stroke="currentColor" stroke-width="1.4"/>
<line x1="260" y1="155" x2="260" y2="170" stroke="currentColor" stroke-width="1.4"/>
<line x1="120" y1="170" x2="260" y2="190" stroke="currentColor" stroke-width="1.4"/>
<line x1="260" y1="170" x2="120" y2="190" stroke="currentColor" stroke-width="1.4"/>
<line x1="380" y1="155" x2="256" y2="155" stroke="currentColor" stroke-width="1.4"/>
<polygon points="256,155 262.4,152.3 262.4,157.7" fill="currentColor"/>
<text x="410" y="160" font-size="13" text-anchor="start">K1 (48 bits)</text>
<rect x="70" y="190" width="100" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="120" y="207.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L1</text>
<rect x="210" y="190" width="100" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="260" y="207.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R1</text>
<rect x="205" y="224" width="50" height="22" rx="4" class="soft-acc"/>
<rect x="205" y="224" width="50" height="22" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="230" y="239.6" font-size="13" text-anchor="middle" font-weight="bold">f</text>
<line x1="260" y1="216" x2="260" y2="235" stroke="currentColor" stroke-width="1.4"/>
<circle cx="260" cy="235" r="2.5" fill="currentColor"/>
<circle cx="120" cy="235" r="7" fill="none" class="acc" stroke-width="1.4"/>
<line x1="113" y1="235" x2="127" y2="235" class="acc" stroke-width="1.4"/>
<line x1="120" y1="228" x2="120" y2="242" class="acc" stroke-width="1.4"/>
<line x1="120" y1="216" x2="120" y2="228" stroke="currentColor" stroke-width="1.4"/>
<line x1="205" y1="235" x2="128" y2="235" class="acc" stroke-width="1.4"/>
<polygon points="128,235 134.4,232.3 134.4,237.7" class="acc-fill"/>
<line x1="120" y1="242" x2="120" y2="250" stroke="currentColor" stroke-width="1.4"/>
<line x1="260" y1="235" x2="260" y2="250" stroke="currentColor" stroke-width="1.4"/>
<line x1="120" y1="250" x2="260" y2="270" stroke="currentColor" stroke-width="1.4"/>
<line x1="260" y1="250" x2="120" y2="270" stroke="currentColor" stroke-width="1.4"/>
<line x1="380" y1="235" x2="256" y2="235" stroke="currentColor" stroke-width="1.4"/>
<polygon points="256,235 262.4,232.3 262.4,237.7" fill="currentColor"/>
<text x="410" y="240" font-size="13" text-anchor="start">K2 (48 bits)</text>
<text x="190" y="290" font-size="14" text-anchor="middle">⋮   14 more rounds   ⋮</text>
<rect x="70" y="306" width="100" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="120" y="323.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L16</text>
<rect x="210" y="306" width="100" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="260" y="323.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R16</text>
<text x="190" y="350" font-size="13" text-anchor="middle">swap the halves back</text>
<line x1="190" y1="356" x2="190" y2="370" stroke="currentColor" stroke-width="1.4"/>
<polygon points="190,370 187.3,363.6 192.7,363.6" fill="currentColor"/>
<rect x="60" y="370" width="260" height="28" rx="4" class="soft"/>
<rect x="60" y="370" width="260" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="190" y="388.6" font-size="13" text-anchor="middle">FP = IP⁻¹ (final permutation)</text>
<line x1="190" y1="398" x2="190" y2="414" stroke="currentColor" stroke-width="1.4"/>
<polygon points="190,414 187.3,407.6 192.7,407.6" fill="currentColor"/>
<rect x="60" y="414" width="260" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="190" y="433.6" font-size="13" text-anchor="middle">ciphertext (64 bits)</text>
<rect x="400" y="20" width="190" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="495" y="39.5" font-size="13" text-anchor="middle">key (64 bits)</text>
<rect x="400" y="66" width="190" height="28" rx="4" class="soft"/>
<rect x="400" y="66" width="190" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="495" y="84.4" font-size="12.5" text-anchor="middle">PC-1: drop parity → 56</text>
<line x1="495" y1="50" x2="495" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="495,66 492.3,59.6 497.7,59.6" fill="currentColor"/>
<rect x="400" y="110" width="190" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="495" y="127.4" font-size="12.5" text-anchor="middle">C, D: two 28-bit halves</text>
<line x1="495" y1="94" x2="495" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="495,110 492.3,103.6 497.7,103.6" fill="currentColor"/>
<text x="495" y="290" font-size="12.5" text-anchor="middle">rotate C and D; PC-2 picks 48</text>
<text x="495" y="306" font-size="12.5" text-anchor="middle">bits for each round key</text>
<line x1="495" y1="136" x2="495" y2="270" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
</svg>
<figcaption>Figure 6.6. DES at a glance. The left column is the data path, a 16-round Feistel network; the right column is the key schedule, which makes a different 48-bit round key for every round.</figcaption>
</figure>

### The round function $f$

$f$ takes the 32-bit right half and a 48-bit round key:

1. **Expansion E.** Copy the 32 bits into 48, by repeating the two edge bits of
   each 4-bit group. Each S-box will then see six bits, two of which it shares
   with its neighbours.
2. **Key mixing.** XOR the 48-bit round key.
3. **Substitution.** Cut the 48 bits into eight 6-bit pieces. S-box $S_j$ turns
   piece $j$ into 4 bits. Each S-box is a table of 4 rows and 16 columns: the
   **outer** two bits (first and last) pick the row, the **inner** four pick the
   column.
4. **Permutation P.** Shuffle the 32 output bits so that each S-box's outputs
   feed four different S-boxes in the next round.

The S-boxes are the only nonlinear part of DES. Everything else is XOR and
moving bits around, so the whole security of DES rests on those eight small
tables.

<figure class="mars-fig">
<svg viewBox="0 0 660 360" width="660" role="img" aria-label="The DES round function: expand 32 bits to 48, XOR the round key, eight S-boxes of 6 to 4 bits, permutation P" fill="currentColor" font-size="13">
<rect x="230" y="15" width="200" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="34.5" font-size="13" text-anchor="middle">R (32 bits)</text>
<line x1="330" y1="45" x2="330" y2="62" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,62 327.3,55.6 332.7,55.6" fill="currentColor"/>
<rect x="180" y="62" width="300" height="30" rx="4" class="soft"/>
<rect x="180" y="62" width="300" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="81.5" font-size="13" text-anchor="middle">E: expand to 48 bits</text>
<line x1="330" y1="92" x2="330" y2="112" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,112 327.3,105.6 332.7,105.6" fill="currentColor"/>
<circle cx="330" cy="121" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="321" y1="121" x2="339" y2="121" class="acc" stroke-width="1.4"/>
<line x1="330" y1="112" x2="330" y2="130" class="acc" stroke-width="1.4"/>
<line x1="560" y1="121" x2="339" y2="121" class="acc" stroke-width="1.4"/>
<polygon points="339,121 345.4,118.3 345.4,123.7" class="acc-fill"/>
<text x="565" y="126" font-size="13" text-anchor="start" class="acc-fill">Kᵢ (48 bits)</text>
<line x1="330" y1="130" x2="330" y2="142" stroke="currentColor" stroke-width="1.4"/>
<line x1="50" y1="142" x2="610" y2="142" stroke="currentColor" stroke-width="1.4"/>
<line x1="58" y1="142" x2="58" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="66.8" y1="142" x2="66.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="75.6" y1="142" x2="75.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="84.4" y1="142" x2="84.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="93.2" y1="142" x2="93.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="102" y1="142" x2="102" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="54" y="172" width="52" height="36" rx="4" class="soft-acc"/>
<rect x="54" y="172" width="52" height="36" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="80" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S1</text>
<line x1="64" y1="208" x2="64" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="75" y1="208" x2="75" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="86" y1="208" x2="86" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="97" y1="208" x2="97" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="128" y1="142" x2="128" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="136.8" y1="142" x2="136.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="145.6" y1="142" x2="145.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="154.4" y1="142" x2="154.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="163.2" y1="142" x2="163.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="172" y1="142" x2="172" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="124" y="172" width="52" height="36" rx="4" class="soft"/>
<rect x="124" y="172" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="150" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S2</text>
<line x1="134" y1="208" x2="134" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="145" y1="208" x2="145" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="156" y1="208" x2="156" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="167" y1="208" x2="167" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="198" y1="142" x2="198" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="206.8" y1="142" x2="206.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="215.6" y1="142" x2="215.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="224.4" y1="142" x2="224.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="233.2" y1="142" x2="233.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="242" y1="142" x2="242" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="194" y="172" width="52" height="36" rx="4" class="soft"/>
<rect x="194" y="172" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="220" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S3</text>
<line x1="204" y1="208" x2="204" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="215" y1="208" x2="215" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="226" y1="208" x2="226" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="237" y1="208" x2="237" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="268" y1="142" x2="268" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="276.8" y1="142" x2="276.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="285.6" y1="142" x2="285.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="294.4" y1="142" x2="294.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="303.2" y1="142" x2="303.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="312" y1="142" x2="312" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="264" y="172" width="52" height="36" rx="4" class="soft"/>
<rect x="264" y="172" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="290" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S4</text>
<line x1="274" y1="208" x2="274" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="285" y1="208" x2="285" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="296" y1="208" x2="296" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="307" y1="208" x2="307" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="338" y1="142" x2="338" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="346.8" y1="142" x2="346.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="355.6" y1="142" x2="355.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="364.4" y1="142" x2="364.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="373.2" y1="142" x2="373.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="382" y1="142" x2="382" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="334" y="172" width="52" height="36" rx="4" class="soft"/>
<rect x="334" y="172" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S5</text>
<line x1="344" y1="208" x2="344" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="355" y1="208" x2="355" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="366" y1="208" x2="366" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="377" y1="208" x2="377" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="408" y1="142" x2="408" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="416.8" y1="142" x2="416.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="425.6" y1="142" x2="425.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="434.4" y1="142" x2="434.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="443.2" y1="142" x2="443.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="452" y1="142" x2="452" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="404" y="172" width="52" height="36" rx="4" class="soft"/>
<rect x="404" y="172" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="430" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S6</text>
<line x1="414" y1="208" x2="414" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="425" y1="208" x2="425" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="436" y1="208" x2="436" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="447" y1="208" x2="447" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="478" y1="142" x2="478" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="486.8" y1="142" x2="486.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="495.6" y1="142" x2="495.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="504.4" y1="142" x2="504.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="513.2" y1="142" x2="513.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="522" y1="142" x2="522" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="474" y="172" width="52" height="36" rx="4" class="soft"/>
<rect x="474" y="172" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="500" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S7</text>
<line x1="484" y1="208" x2="484" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="495" y1="208" x2="495" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="506" y1="208" x2="506" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="517" y1="208" x2="517" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="548" y1="142" x2="548" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="556.8" y1="142" x2="556.8" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="565.6" y1="142" x2="565.6" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="574.4" y1="142" x2="574.4" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="583.2" y1="142" x2="583.2" y2="172" stroke="currentColor" stroke-width="0.9"/>
<line x1="592" y1="142" x2="592" y2="172" stroke="currentColor" stroke-width="0.9"/>
<rect x="544" y="172" width="52" height="36" rx="4" class="soft"/>
<rect x="544" y="172" width="52" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="570" y="194.6" font-size="13" text-anchor="middle" font-weight="bold">S8</text>
<line x1="554" y1="208" x2="554" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="565" y1="208" x2="565" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="576" y1="208" x2="576" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="587" y1="208" x2="587" y2="232" stroke="currentColor" stroke-width="0.9"/>
<line x1="50" y1="232" x2="610" y2="232" stroke="currentColor" stroke-width="1.4"/>
<text x="20" y="162" font-size="12.5" text-anchor="middle" fill-opacity="0.8">6</text>
<text x="20" y="226" font-size="12.5" text-anchor="middle" fill-opacity="0.8">4</text>
<line x1="330" y1="232" x2="330" y2="252" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,252 327.3,245.6 332.7,245.6" fill="currentColor"/>
<rect x="180" y="252" width="300" height="30" rx="4" class="soft"/>
<rect x="180" y="252" width="300" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="271.6" font-size="13" text-anchor="middle">P: permute the 32 bits</text>
<line x1="330" y1="282" x2="330" y2="302" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,302 327.3,295.6 332.7,295.6" fill="currentColor"/>
<rect x="230" y="302" width="200" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="330" y="321.6" font-size="13" text-anchor="middle">f(R, Kᵢ) (32 bits)</text>
<text x="330" y="354" font-size="13" text-anchor="middle">the S-boxes are the only nonlinear part of DES</text>
</svg>
<figcaption>Figure 6.7. Inside the round function f. Each S-box takes six bits, two of them shared with its neighbours by the expansion E, and returns four.</figcaption>
</figure>

**By hand: one S-box lookup.** Here is the first S-box:

| Row | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 14 | 4 | 13 | 1 | 2 | 15 | 11 | 8 | 3 | 10 | 6 | 12 | 5 | 9 | 0 | 7 |
| 1 | 0 | 15 | 7 | 4 | 14 | 2 | 13 | 1 | 10 | 6 | 12 | 11 | 9 | 5 | 3 | 8 |
| 2 | 4 | 1 | 14 | 8 | 13 | 6 | 2 | 11 | 15 | 12 | 9 | 7 | 3 | 10 | 5 | 0 |
| 3 | 15 | 12 | 8 | 2 | 4 | 9 | 1 | 7 | 5 | 11 | 3 | 14 | 10 | 0 | 6 | 13 |

Input `011000`: the outer bits `0` and `0` give row 0; the inner bits `1100` give
column 12. $S_1$ gives 5, which is `0101`. Each row is a permutation of 0 to 15,
so for a fixed pair of outer bits the box is a 4-bit permutation.

<figure class="mars-fig">
<svg viewBox="0 0 680 250" width="680" role="img" aria-label="Looking up 011000 in DES S-box S1: outer bits 00 pick row 0, inner bits 1100 pick column 12, giving 5" fill="currentColor" font-size="13">
<rect x="220" y="12" width="36" height="30" rx="4" class="soft-acc"/>
<rect x="220" y="12" width="36" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="238" y="32.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="260" y="12" width="36" height="30" rx="4" class="soft"/>
<rect x="260" y="12" width="36" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="278" y="32.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="300" y="12" width="36" height="30" rx="4" class="soft"/>
<rect x="300" y="12" width="36" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="318" y="32.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="340" y="12" width="36" height="30" rx="4" class="soft"/>
<rect x="340" y="12" width="36" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="358" y="32.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="380" y="12" width="36" height="30" rx="4" class="soft"/>
<rect x="380" y="12" width="36" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="398" y="32.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="420" y="12" width="36" height="30" rx="4" class="soft-acc"/>
<rect x="420" y="12" width="36" height="30" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="438" y="32.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="200" y="32" font-size="13" text-anchor="end">input</text>
<text x="470" y="24" font-size="13" text-anchor="start" class="acc-fill">outer bits 0…0 → row 0</text>
<text x="470" y="42" font-size="13" text-anchor="start">inner bits 1100 → column 12</text>
<text x="78" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">0</text>
<text x="114" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">1</text>
<text x="150" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">2</text>
<text x="186" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">3</text>
<text x="222" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">4</text>
<text x="258" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">5</text>
<text x="294" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">6</text>
<text x="330" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">7</text>
<text x="366" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">8</text>
<text x="402" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">9</text>
<text x="438" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">10</text>
<text x="474" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">11</text>
<text x="510" y="72" font-size="12" text-anchor="middle" font-weight="bold" fill-opacity="0.75">12</text>
<text x="546" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">13</text>
<text x="582" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">14</text>
<text x="618" y="72" font-size="12" text-anchor="middle" fill-opacity="0.75">15</text>
<text x="50" y="98" font-size="12" text-anchor="end" font-weight="bold" fill-opacity="0.75">0</text>
<rect x="60" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="60" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="78" y="98" font-size="13" text-anchor="middle">14</text>
<rect x="96" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="96" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="114" y="98" font-size="13" text-anchor="middle">4</text>
<rect x="132" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="132" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="150" y="98" font-size="13" text-anchor="middle">13</text>
<rect x="168" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="168" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="186" y="98" font-size="13" text-anchor="middle">1</text>
<rect x="204" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="204" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="222" y="98" font-size="13" text-anchor="middle">2</text>
<rect x="240" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="240" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="258" y="98" font-size="13" text-anchor="middle">15</text>
<rect x="276" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="276" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="294" y="98" font-size="13" text-anchor="middle">11</text>
<rect x="312" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="312" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="330" y="98" font-size="13" text-anchor="middle">8</text>
<rect x="348" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="348" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="366" y="98" font-size="13" text-anchor="middle">3</text>
<rect x="384" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="384" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="402" y="98" font-size="13" text-anchor="middle">10</text>
<rect x="420" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="420" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="438" y="98" font-size="13" text-anchor="middle">6</text>
<rect x="456" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="456" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="474" y="98" font-size="13" text-anchor="middle">12</text>
<rect x="492" y="80" width="36" height="26" rx="0" class="soft-acc"/>
<rect x="492" y="80" width="36" height="26" rx="0" fill="none" class="acc" stroke-width="2.2"/>
<text x="510" y="98" font-size="13" text-anchor="middle" font-weight="bold" class="acc-fill">5</text>
<rect x="528" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="528" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546" y="98" font-size="13" text-anchor="middle">9</text>
<rect x="564" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="564" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="582" y="98" font-size="13" text-anchor="middle">0</text>
<rect x="600" y="80" width="36" height="26" rx="0" class="soft"/>
<rect x="600" y="80" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="618" y="98" font-size="13" text-anchor="middle">7</text>
<text x="50" y="124" font-size="12" text-anchor="end" fill-opacity="0.75">1</text>
<rect x="60" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="78" y="124" font-size="13" text-anchor="middle">0</text>
<rect x="96" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="114" y="124" font-size="13" text-anchor="middle">15</text>
<rect x="132" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="150" y="124" font-size="13" text-anchor="middle">7</text>
<rect x="168" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="186" y="124" font-size="13" text-anchor="middle">4</text>
<rect x="204" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="222" y="124" font-size="13" text-anchor="middle">14</text>
<rect x="240" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="258" y="124" font-size="13" text-anchor="middle">2</text>
<rect x="276" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="294" y="124" font-size="13" text-anchor="middle">13</text>
<rect x="312" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="330" y="124" font-size="13" text-anchor="middle">1</text>
<rect x="348" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="366" y="124" font-size="13" text-anchor="middle">10</text>
<rect x="384" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="402" y="124" font-size="13" text-anchor="middle">6</text>
<rect x="420" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="438" y="124" font-size="13" text-anchor="middle">12</text>
<rect x="456" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="474" y="124" font-size="13" text-anchor="middle">11</text>
<rect x="492" y="106" width="36" height="26" rx="0" class="soft"/>
<rect x="492" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="510" y="124" font-size="13" text-anchor="middle">9</text>
<rect x="528" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546" y="124" font-size="13" text-anchor="middle">5</text>
<rect x="564" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="582" y="124" font-size="13" text-anchor="middle">3</text>
<rect x="600" y="106" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="618" y="124" font-size="13" text-anchor="middle">8</text>
<text x="50" y="150" font-size="12" text-anchor="end" fill-opacity="0.75">2</text>
<rect x="60" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="78" y="150" font-size="13" text-anchor="middle">4</text>
<rect x="96" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="114" y="150" font-size="13" text-anchor="middle">1</text>
<rect x="132" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="150" y="150" font-size="13" text-anchor="middle">14</text>
<rect x="168" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="186" y="150" font-size="13" text-anchor="middle">8</text>
<rect x="204" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="222" y="150" font-size="13" text-anchor="middle">13</text>
<rect x="240" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="258" y="150" font-size="13" text-anchor="middle">6</text>
<rect x="276" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="294" y="150" font-size="13" text-anchor="middle">2</text>
<rect x="312" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="330" y="150" font-size="13" text-anchor="middle">11</text>
<rect x="348" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="366" y="150" font-size="13" text-anchor="middle">15</text>
<rect x="384" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="402" y="150" font-size="13" text-anchor="middle">12</text>
<rect x="420" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="438" y="150" font-size="13" text-anchor="middle">9</text>
<rect x="456" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="474" y="150" font-size="13" text-anchor="middle">7</text>
<rect x="492" y="132" width="36" height="26" rx="0" class="soft"/>
<rect x="492" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="510" y="150" font-size="13" text-anchor="middle">3</text>
<rect x="528" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546" y="150" font-size="13" text-anchor="middle">10</text>
<rect x="564" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="582" y="150" font-size="13" text-anchor="middle">5</text>
<rect x="600" y="132" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="618" y="150" font-size="13" text-anchor="middle">0</text>
<text x="50" y="176" font-size="12" text-anchor="end" fill-opacity="0.75">3</text>
<rect x="60" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="78" y="176" font-size="13" text-anchor="middle">15</text>
<rect x="96" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="114" y="176" font-size="13" text-anchor="middle">12</text>
<rect x="132" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="150" y="176" font-size="13" text-anchor="middle">8</text>
<rect x="168" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="186" y="176" font-size="13" text-anchor="middle">2</text>
<rect x="204" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="222" y="176" font-size="13" text-anchor="middle">4</text>
<rect x="240" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="258" y="176" font-size="13" text-anchor="middle">9</text>
<rect x="276" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="294" y="176" font-size="13" text-anchor="middle">1</text>
<rect x="312" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="330" y="176" font-size="13" text-anchor="middle">7</text>
<rect x="348" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="366" y="176" font-size="13" text-anchor="middle">5</text>
<rect x="384" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="402" y="176" font-size="13" text-anchor="middle">11</text>
<rect x="420" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="438" y="176" font-size="13" text-anchor="middle">3</text>
<rect x="456" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="474" y="176" font-size="13" text-anchor="middle">14</text>
<rect x="492" y="158" width="36" height="26" rx="0" class="soft"/>
<rect x="492" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="510" y="176" font-size="13" text-anchor="middle">10</text>
<rect x="528" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="546" y="176" font-size="13" text-anchor="middle">0</text>
<rect x="564" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="582" y="176" font-size="13" text-anchor="middle">6</text>
<rect x="600" y="158" width="36" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="618" y="176" font-size="13" text-anchor="middle">13</text>
<text x="340" y="218" font-size="14" text-anchor="middle" font-weight="bold" class="acc-fill">S1(011000) = 5 = 0101</text>
<text x="340" y="240" font-size="13" text-anchor="middle">each row is a permutation of 0 to 15</text>
</svg>
<figcaption>Figure 6.8. One lookup in S1, the first of the eight DES S-boxes, as in the worked example.</figcaption>
</figure>

### Round 1 with real numbers

A classic worked example (J. Orlin Grabbe's "The DES Algorithm Illustrated")
encrypts the block `0123456789ABCDEF` under the key `133457799BBCDFF1`. Every
value below was recomputed with the code that follows:

<div class="mars-steps" markdown>

1. The key schedule drops the parity bits, splits the 56 bits into two 28-bit halves, rotates each left by one place, and picks 48 of the 56 bits: $K_1$ = `1B02EFFC7072`.
2. The initial permutation splits the block into $L_0$ = `CC00CCFF` and $R_0$ = `F0AAF0AA`.
3. Expansion: $E(R_0)$ = `7A15557A1555`. XOR $K_1$: `6117BA866527`.
4. In binary that is `011000 010001 011110 111010 100001 100110 010100 100111`. The first piece, `011000`, goes through $S_1$ and gives `0101`, as in the lookup above. The other seven S-boxes do the same.
5. After the S-boxes and the permutation P: $f(R_0, K_1)$ = `234AA9BB`.
6. $R_1 = L_0 \oplus f(R_0, K_1)$ = `EF4A6544`, and $L_1 = R_0$ = `F0AAF0AA`. Fifteen more rounds follow.
7. After round 16 and the final permutation, the ciphertext is `85E813540F0AB405`.

</div>

### Code it

The whole cipher in Python, with the tables from FIPS 46-3. The function `perm`
applies a bit-selection table the way the standard writes them: output bit $i$
is input bit `table[i]`, counting from 1 at the left.

```python
IP = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
      62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
      57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
      61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
FP = [IP.index(i) + 1 for i in range(1, 65)]            # the inverse of IP
E = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
     16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1]
P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
     2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25]
PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3,
       60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37,
       29, 21, 13, 5, 28, 20, 12, 4]
PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
       41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32]
SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
S = [[int(c, 16) for c in s] for s in (               # the eight S-boxes: 4 rows of 16, row by row
    "e4d12fb83a6c5907" "0f74e2d1a6cb9538" "41e8d62bfc973a50" "fc8249175b3ea06d",
    "f18e6b34972dc05a" "3d47f28ec01a69b5" "0e7ba4d158c6932f" "d8a13f42b67c05e9",
    "a09e63f51dc7b428" "d709346a285ecbf1" "d6498f30b12c5ae7" "1ad069874fe3b52c",
    "7de3069a1285bc4f" "d8b56f03472c1ae9" "a690cb7df13e5284" "3f06a1d8945bc72e",
    "2c417ab6853fd0e9" "eb2c47d150fa3986" "421bad78f9c5630e" "b8c71e2d6f09a453",
    "c1af92680d34e75b" "af427c9561de0b38" "9ef528c3704a1db6" "432c95fabe17608d",
    "4b2ef08d3c975a61" "d0b7491ae35c2f86" "14bdc37eaf680592" "6bd814a7950fe23c",
    "d2846fb1a93e50c7" "1fd8a374c56b0e92" "7b419ce206adf358" "21e74a8dfc90356b")]

def perm(x, table, n):                  # output bit i is bit table[i] of the n-bit input
    return sum((x >> (n - t) & 1) << (len(table) - 1 - i) for i, t in enumerate(table))

def subkeys(key):                       # 16 round keys of 48 bits
    k = perm(key, PC1, 64)              # drop the 8 parity bits: 56 left
    c, d, out = k >> 28, k & 0xfffffff, []
    for s in SHIFTS:
        c = (c << s | c >> (28 - s)) & 0xfffffff
        d = (d << s | d >> (28 - s)) & 0xfffffff
        out.append(perm(c << 28 | d, PC2, 56))
    return out

def f(r, k):                            # the round function
    x = perm(r, E, 32) ^ k              # expand 32 bits to 48, mix in the key
    y = 0
    for i in range(8):                  # eight S-boxes, 6 bits in, 4 bits out
        b = x >> (42 - 6 * i) & 63
        y = y << 4 | S[i][(b >> 4 & 2 | b & 1) * 16 + (b >> 1 & 15)]   # outer bits: row; inner: column
    return perm(y, P, 32)

def des(block, key, decrypt=False):
    ks = subkeys(key)
    if decrypt:
        ks = ks[::-1]                   # decryption: the same rounds, keys reversed
    x = perm(block, IP, 64)
    L, R = x >> 32, x & 0xffffffff
    for k in ks:
        L, R = R, L ^ f(R, k)
    return perm(R << 32 | L, FP, 64)    # undo the last swap, then the final permutation

c = des(0x0123456789ABCDEF, 0x133457799BBCDFF1)
print("%016X" % c)                                          # 85E813540F0AB405
print("%016X" % des(c, 0x133457799BBCDFF1, decrypt=True))  # 0123456789ABCDEF
```

This version was also checked against the DES in the `cryptography` library on
500 random keys and blocks. It runs a few thousand blocks a second, slow but
fine for learning.

### Two odd properties

DES has two quirks worth knowing, both easy to check with the code above.

**Complementation.** Flip every bit of the key and every bit of the plaintext,
and every bit of the ciphertext flips: $E_{\bar K}(\bar P) = \overline{E_K(P)}$.
The reason is that the complemented key and the complemented half-block cancel in
the XOR before the S-boxes. An attacker with chosen plaintexts can use it to test
two keys with one encryption, which cuts brute force from $2^{56}$ to $2^{55}$.

```python
M = (1 << 64) - 1
k, p = 0x133457799BBCDFF1, 0x0123456789ABCDEF
print("%016X %016X" % (des(p ^ M, k ^ M), des(p, k) ^ M))   # 7A17ECABF0F54BFA twice
```

**Weak keys.** For four keys, such as `0101010101010101`, all 16 round keys are
equal, so encrypting twice gives back the plaintext:

```python
w = 0x0101010101010101
print("%016X" % des(des(p, w), w))      # 0123456789ABCDEF
```

Neither property is dangerous in normal use, but they show how structure in a
key schedule leaks into the cipher.

## 6.5 The 56-bit key

*Level: intermediate.*

DES drew two suspicions from the day it was published.

**The key was short.** One version of Lucifer had a 128-bit key; DES had 56. In
1977 Whitfield Diffie and Martin Hellman described a machine with a million
special chips, each testing a million keys a second, that would find a DES key in
about a day and cost around \$20 million: affordable for a government, not for
anyone else. The National Security Agency's own internal history, declassified
much later, says the NSA had pressed IBM to cut the key from 64 bits to 48, and
that they settled on 56.

**The S-boxes were unexplained.** The NSA had reviewed the design, and the
S-boxes came back with no explanation of how they were chosen. Many suspected a
hidden weakness. A 1978 US Senate inquiry concluded that the NSA had "convinced
IBM that a reduced key size was sufficient" and "indirectly assisted in the
development of the S-box structures", but had not tampered with the design. The
truth about the S-boxes came out in 1994 and is told in §6.8: they were made
**stronger**, not weaker.

The key was another matter. The arithmetic is short:

```python
keys = 2 ** 56
print(f"{keys:,} DES keys")
print(f"{keys / 10 ** 12 / 3600:.0f} hours at a million chips x a million keys/s (1977 design)")
print(f"{keys / 90e9 / 86400:.1f} days at 90 billion keys/s (Deep Crack, 1998)")
print(f"{2 ** 128 / 90e9 / 86400 / 365.25:.1e} years for a 128-bit key at the same speed")
```

```
72,057,594,037,927,936 DES keys
20 hours at a million chips x a million keys/s (1977 design)
9.3 days at 90 billion keys/s (Deep Crack, 1998)
1.2e+20 years for a 128-bit key at the same speed
```

Those are times to try **every** key; on average the right one turns up halfway.
Hardware caught up with the arithmetic. RSA Data Security ran public DES
challenges from 1997. The first was solved in 96 days by thousands of volunteers'
computers (the DESCHALL project). In July 1998 the Electronic Frontier
Foundation's **Deep Crack**, a purpose-built machine of 1,856 custom chips that
cost under \$250,000, found a key in 56 hours. In January 1999, working with the
volunteers of distributed.net, it took 22 hours and 15 minutes. Each extra key bit
doubles the work, so the 72 extra bits of a 128-bit key put it out of reach of
any such machine forever (the last line above).

<figure class="mars-fig">
<svg viewBox="0 0 680 300" width="680" role="img" aria-label="Time to find a key, on a log scale from one hour to beyond the age of the universe" fill="currentColor" font-size="13">
<text x="240" y="47" font-size="13" text-anchor="end">1977 design (never built)</text>
<rect x="250" y="34" width="20.8" height="20" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="240" y="87" font-size="13" text-anchor="end">DESCHALL, 1997</text>
<rect x="250" y="74" width="53.8" height="20" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="240" y="127" font-size="13" text-anchor="end">Deep Crack, 1998</text>
<rect x="250" y="114" width="28" height="20" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="240" y="167" font-size="13" text-anchor="end">Deep Crack + volunteers, 1999</text>
<rect x="250" y="154" width="21.6" height="20" rx="2" fill="currentColor" fill-opacity="0.5"/>
<text x="240" y="207" font-size="13" text-anchor="end" class="acc-fill">128-bit key, Deep Crack speed</text>
<rect x="250" y="194" width="384.4" height="20" rx="2" class="acc-fill" fill-opacity="0.8"/>
<line x1="250" y1="230" x2="250" y2="236" stroke="currentColor" stroke-width="1.4"/>
<line x1="250" y1="26" x2="250" y2="230" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3" stroke-opacity="0.45"/>
<line x1="272.1" y1="230" x2="272.1" y2="236" stroke="currentColor" stroke-width="1.4"/>
<line x1="272.1" y1="26" x2="272.1" y2="230" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3" stroke-opacity="0.45"/>
<line x1="313.1" y1="230" x2="313.1" y2="236" stroke="currentColor" stroke-width="1.4"/>
<line x1="313.1" y1="26" x2="313.1" y2="230" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3" stroke-opacity="0.45"/>
<line x1="409.1" y1="230" x2="409.1" y2="236" stroke="currentColor" stroke-width="1.4"/>
<line x1="409.1" y1="26" x2="409.1" y2="230" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3" stroke-opacity="0.45"/>
<line x1="475.3" y1="230" x2="475.3" y2="236" stroke="currentColor" stroke-width="1.4"/>
<line x1="475.3" y1="26" x2="475.3" y2="230" stroke="currentColor" stroke-width="0.7" stroke-dasharray="4 3" stroke-opacity="0.45"/>
<line x1="250" y1="230" x2="650" y2="230" stroke="currentColor" stroke-width="1.4"/>
<text x="250" y="252" font-size="12.5" text-anchor="middle">1 hour</text>
<text x="278.1" y="270" font-size="12.5" text-anchor="middle">1 day</text>
<text x="313.1" y="252" font-size="12.5" text-anchor="middle">1 year</text>
<text x="409.1" y="252" font-size="12.5" text-anchor="middle">10⁶ years</text>
<text x="471.3" y="270" font-size="12.5" text-anchor="middle">age of the universe</text>
<text x="440" y="296" font-size="13" text-anchor="middle">time to try every key (log scale)</text>
</svg>
<figcaption>Figure 6.9. How long a full DES key search took, and the same machine against a 128-bit key. The four DES bars are all within a few days; each extra key bit doubles the time, and 72 more bits push the last bar past the age of the universe by a factor of about ten billion.</figcaption>
</figure>

The volunteers came first. In 1997 Rocke Verser, a programmer in Colorado,
organized DESCHALL, which ran a key-search client on thousands of computers
across the internet; it found the key in June 1997, and the hidden message read
"Strong cryptography makes the world a safer place". The US government still
argued that cracking DES was hard and expensive. The Electronic Frontier
Foundation, led on this project by John Gilmore and working with Paul Kocher's
Cryptography Research and Advanced Wireless Technologies, answered by building
Deep Crack in the open and publishing its full design as the book *Cracking DES*
(1998). Because the export of cryptographic source code was still restricted,
the book printed the source code on paper, in a format meant to be scanned back
in, which made it legal to export. After its record runs, Deep Crack was retired
and is now kept at the Computer History Museum in California.

!!! note "Life story: Deep Crack and the DES key search"
    **Born:** 1998, the Electronic Frontier Foundation with Cryptography
    Research and Advanced Wireless Technologies; 1,856 custom chips, under
    \$250,000 · **Purpose:** to prove in public that a 56-bit key could be
    found quickly, against official claims · **Helped:** found DES keys in 56
    hours (1998) and, with distributed.net, in 22 hours (1999), settling the
    argument and speeding the move to AES · **Status:** retired; the lesson,
    that key length must outrun hardware for decades, is now a design rule

NIST withdrew DES as a standard on 19 May 2005. Its successor was chosen by an
open competition, and that is [Chapter 7](07-AES.md).

!!! note "Life story: DES"
    **Born:** 1973 to 1977, at IBM (Horst Feistel's Lucifer, developed by a team
    including Walter Tuchman, Carl Meyer and Don Coppersmith, and revised with
    the NSA); FIPS 46 in January 1977 · **Purpose:** the first public standard
    cipher, for unclassified government data and for banks · **Helped:** ATM
    PINs and bank transfers (ANSI X3.92, 1981), Unix passwords, and most
    commercial encryption for twenty years; it also created public
    cryptanalysis, since everyone could study it · **Retired:** NIST withdrew
    FIPS 46-3 on 19 May 2005, because 56-bit keys fell to brute force (Deep
    Crack, 1998) · **Replaced by:** triple DES as a stopgap, then AES

## 6.6 Double DES, triple DES and the meet in the middle

*Level: intermediate.* If one DES key is too short, why not encrypt twice with
two keys? $C = E_{K_2}(E_{K_1}(P))$ has 112 key bits. Brute force over both would
take $2^{112}$ tries.

It doesn't, because of the **meet-in-the-middle attack**, which Diffie and
Hellman pointed out in 1977. Take one known pair $(P, C)$. The value in the middle,
$X = E_{K_1}(P)$, is also $X = D_{K_2}(C)$. So:

1. Encrypt $P$ under all $2^{56}$ choices of $K_1$ and store each result in a
   table.
2. Decrypt $C$ under all $2^{56}$ choices of $K_2$, and look each result up.
3. Every match is a candidate pair $(K_1, K_2)$. Check it on a second known
   pair.

That is $2 \cdot 2^{56} = 2^{57}$ operations and a big table, not $2^{112}$. Double
encryption buys one bit.

<figure class="mars-fig">
<svg viewBox="0 0 680 250" width="680" role="img" aria-label="Meet in the middle on double encryption: encrypt P under all first keys, decrypt C under all second keys, and look for equal middle values" fill="currentColor" font-size="13">
<rect x="20" y="40" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="61.5" font-size="13" text-anchor="middle" font-weight="bold">P</text>
<line x1="80" y1="57" x2="120" y2="57" stroke="currentColor" stroke-width="1.4"/>
<polygon points="120,57 113.6,59.7 113.6,54.3" fill="currentColor"/>
<rect x="120" y="40" width="100" height="34" rx="4" class="soft"/>
<rect x="120" y="40" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="170" y="61.5" font-size="13" text-anchor="middle">E with K₁</text>
<line x1="220" y1="57" x2="300" y2="57" class="acc" stroke-width="1.4"/>
<polygon points="300,57 293.6,59.7 293.6,54.3" class="acc-fill"/>
<rect x="300" y="40" width="80" height="34" rx="4" class="soft-acc"/>
<rect x="300" y="40" width="80" height="34" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="340" y="61.5" font-size="13" text-anchor="middle" font-weight="bold">X</text>
<line x1="460" y1="57" x2="380" y2="57" class="acc" stroke-width="1.4"/>
<polygon points="380,57 386.4,54.3 386.4,59.7" class="acc-fill"/>
<rect x="460" y="40" width="100" height="34" rx="4" class="soft"/>
<rect x="460" y="40" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="510" y="61.5" font-size="13" text-anchor="middle">D with K₂</text>
<line x1="600" y1="57" x2="560" y2="57" stroke="currentColor" stroke-width="1.4"/>
<polygon points="560,57 566.4,54.3 566.4,59.7" fill="currentColor"/>
<rect x="600" y="40" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="630" y="61.5" font-size="13" text-anchor="middle" font-weight="bold">C</text>
<text x="340" y="26" font-size="13" text-anchor="middle" class="acc-fill">the middle value</text>
<text x="160" y="110" font-size="13" text-anchor="middle" font-weight="bold">table 1: E_K₁(P)</text>
<text x="160" y="126" font-size="12.5" text-anchor="middle">for all 2⁵⁶ keys K₁</text>
<rect x="100" y="138" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<rect x="100" y="158" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<rect x="100" y="178" width="120" height="20" rx="0" class="soft-acc"/>
<rect x="100" y="178" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<rect x="100" y="198" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<text x="160" y="233" font-size="14" text-anchor="middle">⋮</text>
<text x="520" y="110" font-size="13" text-anchor="middle" font-weight="bold">table 2: D_K₂(C)</text>
<text x="520" y="126" font-size="12.5" text-anchor="middle">for all 2⁵⁶ keys K₂</text>
<rect x="460" y="138" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<rect x="460" y="158" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<rect x="460" y="178" width="120" height="20" rx="0" class="soft-acc"/>
<rect x="460" y="178" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<rect x="460" y="198" width="120" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="0.9"/>
<text x="520" y="233" font-size="14" text-anchor="middle">⋮</text>
<line x1="220" y1="188" x2="460" y2="188" class="acc" stroke-width="1.6"/>
<text x="340" y="182" font-size="13" text-anchor="middle" class="acc-fill">equal: candidate (K₁, K₂)</text>
</svg>
<figcaption>Figure 6.10. The meet-in-the-middle attack. The work is about 2 × 2⁵⁶ = 2⁵⁷ operations plus a big table, not 2¹¹², so double DES is barely stronger than single DES. A second known pair rules out the chance matches.</figcaption>
</figure>

The same attack on a toy cipher with 16-bit keys, so the whole thing runs in a
second: a double encryption with 32 key bits falls in $2 \times 65{,}536$ trials.

```python
import hashlib

def F(k, i, x):                         # round function: a hash of key, round and half-block
    return int.from_bytes(hashlib.sha256(bytes([k >> 8, k & 255, i]) + x.to_bytes(2, "big")).digest()[:2], "big")

def enc(k, b):                          # a toy cipher: 32-bit blocks, 16-bit keys, 4 Feistel rounds
    L, R = b >> 16, b & 0xffff
    for i in range(4):
        L, R = R, L ^ F(k, i, R)
    return L << 16 | R

def dec(k, b):
    L, R = b >> 16, b & 0xffff
    for i in (3, 2, 1, 0):
        L, R = R ^ F(k, i, L), L
    return L << 16 | R

k1, k2 = 0x3A7C, 0xE015                 # double encryption: 32 key bits in all
p1, p2 = 0x01234567, 0x89ABCDEF         # two known plaintexts
c1, c2 = enc(k2, enc(k1, p1)), enc(k2, enc(k1, p2))

middle = {}
for a in range(1 << 16):                # encrypt p1 under every first key
    middle.setdefault(enc(a, p1), []).append(a)
found = []
for b in range(1 << 16):                # decrypt c1 under every second key, look for a match
    for a in middle.get(dec(b, c1), []):
        if enc(b, enc(a, p2)) == c2:    # a second pair weeds out chance matches
            found.append((hex(a), hex(b)))
print(found)                            # [('0x3a7c', '0xe015')]
```

With one pair, four key pairs matched in the middle (about $2^{32} / 2^{32} = 1$
chance match is expected, plus the right one, and a few more by luck). The
second pair left only the real one.

!!! note "Life story: the meet-in-the-middle attack"
    **Born:** 1977, Whitfield Diffie and Martin Hellman, in their critique of
    the DES key length · **Purpose:** to show that encrypting twice with two
    keys is barely stronger than once · **Helped:** made triple DES, not double
    DES, the standard upgrade; became a general tool, used against any cipher
    built from independent parts, against reduced AES, and against hash
    functions · **Status:** current; it is why no one proposes double
    encryption

### Triple DES

Walter Tuchman's team at IBM proposed the fix in the late 1970s: three passes,
encrypt-decrypt-encrypt,

$$
C = E_{K_3}\big(D_{K_2}(E_{K_1}(P))\big).
$$

<figure class="mars-fig">
<svg viewBox="0 0 660 140" width="660" role="img" aria-label="Triple DES: encrypt with K1, decrypt with K2, encrypt with K3" fill="currentColor" font-size="13">
<rect x="20" y="30" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="51.5" font-size="13" text-anchor="middle" font-weight="bold">P</text>
<line x1="80" y1="47" x2="120" y2="47" stroke="currentColor" stroke-width="1.4"/>
<polygon points="120,47 113.6,49.7 113.6,44.3" fill="currentColor"/>
<rect x="120" y="30" width="100" height="34" rx="4" class="soft"/>
<rect x="120" y="30" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="170" y="51.5" font-size="13" text-anchor="middle">DES with K₁</text>
<line x1="220" y1="47" x2="260" y2="47" stroke="currentColor" stroke-width="1.4"/>
<polygon points="260,47 253.6,49.7 253.6,44.3" fill="currentColor"/>
<rect x="260" y="30" width="100" height="34" rx="4" class="soft-acc"/>
<rect x="260" y="30" width="100" height="34" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="310" y="51.5" font-size="13" text-anchor="middle">DES⁻¹ with K₂</text>
<line x1="360" y1="47" x2="400" y2="47" stroke="currentColor" stroke-width="1.4"/>
<polygon points="400,47 393.6,49.7 393.6,44.3" fill="currentColor"/>
<rect x="400" y="30" width="100" height="34" rx="4" class="soft"/>
<rect x="400" y="30" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="450" y="51.5" font-size="13" text-anchor="middle">DES with K₃</text>
<line x1="500" y1="47" x2="580" y2="47" stroke="currentColor" stroke-width="1.4"/>
<polygon points="580,47 573.6,49.7 573.6,44.3" fill="currentColor"/>
<rect x="580" y="30" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="610" y="51.5" font-size="13" text-anchor="middle" font-weight="bold">C</text>
<text x="330" y="100" font-size="13" text-anchor="middle">K₁ = K₂ = K₃ gives single DES, so new and old equipment can talk</text>
<text x="330" y="122" font-size="13" text-anchor="middle">three keys: 168 bits, about 112-bit security; two keys (K₃ = K₁): about 80</text>
</svg>
<figcaption>Figure 6.11. Triple DES in its encrypt-decrypt-encrypt form. It costs three DES operations per block and keeps DES's 64-bit block.</figcaption>
</figure>

The middle step is a decryption so that setting $K_1 = K_2 = K_3$ gives single
DES, which let new equipment talk to old. A meet in the middle now has to cover
two of the three keys on one side, so three independent keys (168 bits) give
about 112 bits of security. The two-key version, $K_3 = K_1$, has attacks that
NIST rates at about 80 bits. Triple DES (also called TDEA) was standardized in
ANSI X9.52 (1998) and FIPS 46-3 (1999), and it carried the banking and payment
card industries for two decades. It costs three DES operations per block, which
was one reason the world wanted a new cipher.

!!! note "Life story: triple DES"
    **Born:** late 1970s at IBM (Walter Tuchman's encrypt-decrypt-encrypt);
    standardized in ANSI X9.52 (1998) and FIPS 46-3 (1999) · **Purpose:** a
    longer key for DES that worked on existing DES hardware · **Helped:** carried
    banking, payment cards and PIN processing for about twenty years after DES
    fell · **Retired:** the two-key version was disallowed for encryption after
    2015 and the three-key version after 2023 (SP 800-131A), because of its
    64-bit block (Sweet32) and its slowness · **Replaced by:** AES

## 6.7 The block size matters too

*Level: intermediate.* The key length stops brute force. The **block length**
stops a quieter attack. A block cipher under one key is a permutation, so two
different input blocks never give the same output. When a mode such as CBC
([Chapter 8](08-Modes-of-Operation.md)) feeds it inputs that look random, the
outputs look random too, and by the birthday bound of
[Chapter 4](04-Randomness-and-Perfect-Secrecy.md), after about $2^{b/2}$ blocks
two outputs collide. In CBC a collision gives away the XOR of two plaintext
blocks.

For DES and triple DES, $b = 64$, so collisions are likely after about $2^{32}$
blocks, a 50% chance at about 37.7 GiB. In 1977 nobody encrypted that much under
one key. In 2016 Karthikeyan Bhargavan and Gaëtan Leurent showed with **Sweet32**
that a browser kept on a malicious page can be made to send that much over one
long HTTPS connection, and recovered a secure cookie from triple DES after about
785 GB of traffic, in under two days. They did the same to Blowfish in OpenVPN.
A 128-bit block puts the bound at $2^{64}$ blocks, 256 EiB, and that is why every
modern block cipher has one.

<figure class="mars-fig">
<svg viewBox="0 0 680 320" width="680" role="img" aria-label="Probability of a block collision against data encrypted under one key, for 64-bit and 128-bit blocks" fill="currentColor" font-size="13">
<line x1="70" y1="250" x2="630" y2="250" stroke="currentColor" stroke-width="1.4"/>
<line x1="70" y1="250" x2="70" y2="30" stroke="currentColor" stroke-width="1.4"/>
<line x1="65" y1="250" x2="70" y2="250" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="254" font-size="12.5" text-anchor="end">0</text>
<line x1="65" y1="145" x2="70" y2="145" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="149" font-size="12.5" text-anchor="end">0.5</text>
<line x1="65" y1="40" x2="70" y2="40" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="44" font-size="12.5" text-anchor="end">1</text>
<line x1="70" y1="250" x2="70" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="70" y="270" font-size="12.5" text-anchor="middle">1 MiB</text>
<line x1="177.7" y1="250" x2="177.7" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="177.7" y="270" font-size="12.5" text-anchor="middle">1 GiB</text>
<line x1="285.4" y1="250" x2="285.4" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="285.4" y="270" font-size="12.5" text-anchor="middle">1 TiB</text>
<line x1="393.1" y1="250" x2="393.1" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="393.1" y="270" font-size="12.5" text-anchor="middle">1 PiB</text>
<line x1="500.8" y1="250" x2="500.8" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="500.8" y="270" font-size="12.5" text-anchor="middle">1 EiB</text>
<line x1="608.5" y1="250" x2="608.5" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="608.5" y="270" font-size="12.5" text-anchor="middle">1 ZiB</text>
<line x1="70" y1="145" x2="630" y2="145" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.5"/>
<polyline points="70,250 72.7,250 75.4,250 78.1,250 80.8,250 83.5,250 86.2,250 88.8,250 91.5,250 94.2,250 96.9,250 99.6,250 102.3,250 105,250 107.7,250 110.4,250 113.1,250 115.8,250 118.5,250 121.2,250 123.8,250 126.5,250 129.2,250 131.9,250 134.6,250 137.3,250 140,250 142.7,250 145.4,250 148.1,250 150.8,250 153.5,250 156.2,250 158.8,250 161.5,250 164.2,250 166.9,250 169.6,250 172.3,249.9 175,249.9 177.7,249.9 180.4,249.9 183.1,249.8 185.8,249.7 188.5,249.6 191.2,249.4 193.8,249.2 196.5,248.8 199.2,248.4 201.9,247.7 204.6,246.7 207.3,245.4 210,243.5 212.7,240.9 215.4,237.3 218.1,232.2 220.8,225.3 223.5,216 226.2,203.5 228.8,187.5 231.5,167.4 234.2,143.5 236.9,117.3 239.6,91.1 242.3,68.4 245,52.4 247.7,43.8 250.4,40.7 253.1,40.1 255.8,40 258.5,40 261.2,40 263.8,40 266.5,40 269.2,40 271.9,40 274.6,40 277.3,40 280,40 282.7,40 285.4,40 288.1,40 290.8,40 293.5,40 296.2,40 298.8,40 301.5,40 304.2,40 306.9,40 309.6,40 312.3,40 315,40 317.7,40 320.4,40 323.1,40 325.8,40 328.5,40 331.2,40 333.8,40 336.5,40 339.2,40 341.9,40 344.6,40 347.3,40 350,40 352.7,40 355.4,40 358.1,40 360.8,40 363.5,40 366.2,40 368.8,40 371.5,40 374.2,40 376.9,40 379.6,40 382.3,40 385,40 387.7,40 390.4,40 393.1,40 395.8,40 398.5,40 401.2,40 403.8,40 406.5,40 409.2,40 411.9,40 414.6,40 417.3,40 420,40 422.7,40 425.4,40 428.1,40 430.8,40 433.5,40 436.2,40 438.8,40 441.5,40 444.2,40 446.9,40 449.6,40 452.3,40 455,40 457.7,40 460.4,40 463.1,40 465.8,40 468.5,40 471.2,40 473.8,40 476.5,40 479.2,40 481.9,40 484.6,40 487.3,40 490,40 492.7,40 495.4,40 498.1,40 500.8,40 503.5,40 506.2,40 508.8,40 511.5,40 514.2,40 516.9,40 519.6,40 522.3,40 525,40 527.7,40 530.4,40 533.1,40 535.8,40 538.5,40 541.2,40 543.8,40 546.5,40 549.2,40 551.9,40 554.6,40 557.3,40 560,40 562.7,40 565.4,40 568.1,40 570.8,40 573.5,40 576.2,40 578.8,40 581.5,40 584.2,40 586.9,40 589.6,40 592.3,40 595,40 597.7,40 600.4,40 603.1,40 605.8,40 608.5,40 611.2,40 613.8,40 616.5,40 619.2,40 621.9,40 624.6,40 627.3,40 630,40" fill="none" class="acc" stroke-width="2.2"/>
<polyline points="70,250 72.7,250 75.4,250 78.1,250 80.8,250 83.5,250 86.2,250 88.8,250 91.5,250 94.2,250 96.9,250 99.6,250 102.3,250 105,250 107.7,250 110.4,250 113.1,250 115.8,250 118.5,250 121.2,250 123.8,250 126.5,250 129.2,250 131.9,250 134.6,250 137.3,250 140,250 142.7,250 145.4,250 148.1,250 150.8,250 153.5,250 156.2,250 158.8,250 161.5,250 164.2,250 166.9,250 169.6,250 172.3,250 175,250 177.7,250 180.4,250 183.1,250 185.8,250 188.5,250 191.2,250 193.8,250 196.5,250 199.2,250 201.9,250 204.6,250 207.3,250 210,250 212.7,250 215.4,250 218.1,250 220.8,250 223.5,250 226.2,250 228.8,250 231.5,250 234.2,250 236.9,250 239.6,250 242.3,250 245,250 247.7,250 250.4,250 253.1,250 255.8,250 258.5,250 261.2,250 263.8,250 266.5,250 269.2,250 271.9,250 274.6,250 277.3,250 280,250 282.7,250 285.4,250 288.1,250 290.8,250 293.5,250 296.2,250 298.8,250 301.5,250 304.2,250 306.9,250 309.6,250 312.3,250 315,250 317.7,250 320.4,250 323.1,250 325.8,250 328.5,250 331.2,250 333.8,250 336.5,250 339.2,250 341.9,250 344.6,250 347.3,250 350,250 352.7,250 355.4,250 358.1,250 360.8,250 363.5,250 366.2,250 368.8,250 371.5,250 374.2,250 376.9,250 379.6,250 382.3,250 385,250 387.7,250 390.4,250 393.1,250 395.8,250 398.5,250 401.2,250 403.8,250 406.5,250 409.2,250 411.9,250 414.6,250 417.3,250 420,250 422.7,250 425.4,250 428.1,250 430.8,250 433.5,250 436.2,250 438.8,250 441.5,250 444.2,250 446.9,250 449.6,250 452.3,250 455,250 457.7,250 460.4,250 463.1,250 465.8,250 468.5,250 471.2,250 473.8,250 476.5,250 479.2,250 481.9,250 484.6,250 487.3,250 490,250 492.7,250 495.4,250 498.1,250 500.8,250 503.5,250 506.2,250 508.8,250 511.5,250 514.2,250 516.9,250 519.6,250 522.3,250 525,250 527.7,249.9 530.4,249.9 533.1,249.9 535.8,249.9 538.5,249.8 541.2,249.7 543.8,249.6 546.5,249.4 549.2,249.2 551.9,248.8 554.6,248.4 557.3,247.7 560,246.7 562.7,245.4 565.4,243.5 568.1,240.9 570.8,237.3 573.5,232.2 576.2,225.3 578.8,216 581.5,203.5 584.2,187.5 586.9,167.4 589.6,143.5 592.3,117.3 595,91.1 597.7,68.4 600.4,52.4 603.1,43.8 605.8,40.7 608.5,40.1 611.2,40 613.8,40 616.5,40 619.2,40 621.9,40 624.6,40 627.3,40 630,40" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="237.5" y="56.8" font-size="13" text-anchor="end" font-weight="bold" class="acc-fill">64-bit block</text>
<text x="585.4" y="56.8" font-size="13" text-anchor="end" font-weight="bold">128-bit block</text>
<circle cx="234.1" cy="145" r="4" class="acc-fill"/>
<text x="224.1" y="135" font-size="12.5" text-anchor="end" class="acc-fill">50% at 37.7 GiB</text>
<line x1="280.1" y1="250" x2="280.1" y2="40" class="acc" stroke-width="1" stroke-dasharray="4 3"/>
<text x="286.1" y="197.5" font-size="12.5" text-anchor="start" class="acc-fill">Sweet32 used 785 GB</text>
<text x="350" y="300" font-size="13" text-anchor="middle">data encrypted under one key (log scale)</text>
<text x="18" y="140" font-size="13" text-anchor="middle" font-style="italic">P</text>
</svg>
<figcaption>Figure 6.12. The birthday bound for both block sizes. A 64-bit block is used up after tens of gigabytes, an afternoon on a fast link; a 128-bit block lasts about 2⁶⁴ times as long.</figcaption>
</figure>

!!! note "Life story: Sweet32"
    **Born:** 2016, Karthikeyan Bhargavan and Gaëtan Leurent at Inria in Paris
    · **Purpose:** to show that the birthday bound of a 64-bit block, long
    thought theoretical, can be reached on a real HTTPS or VPN connection ·
    **Helped:** browsers and OpenSSL demoted triple DES; NIST limited one triple
    DES key to $2^{20}$ blocks in 2017 and then retired the cipher for
    encryption · **Status:** the attack applies to every 64-bit block cipher;
    the cure is a 128-bit block

## 6.8 Differential cryptanalysis

*Level: intermediate.* In 1990 Eli Biham and Adi Shamir, in Israel, published a
general attack on block ciphers. It broke many designs of the time, among them
Japan's FEAL, built by NTT in 1987 as a fast alternative to DES. Against DES it was
oddly weak: the full 16 rounds needed $2^{47}$ chosen plaintexts, more than any
real attacker could get. In 1994 Don Coppersmith of IBM explained why. The IBM
team had found the same attack in 1974, called it the "T-attack", and designed
the S-boxes to resist it, and at the NSA's request kept the technique secret for
sixteen years.

Biham had been Shamir's doctoral student at the Weizmann Institute of Science,
and the attack grew out of their work there; Shamir was already famous as the
S of RSA. Their paper turned cryptanalysis from a collection of tricks for each
cipher into a method that could be applied to any design, and it explained, at
last, the strange S-boxes of DES that people had distrusted since 1977.

### The idea

Encrypt **pairs** of plaintexts that differ by a chosen XOR difference
$\Delta P = P \oplus P'$, and watch the difference as it moves through the cipher.

- Key mixing does not change a difference: $(x \oplus k) \oplus (x' \oplus k) = x \oplus x'$.
  The key, the attacker's unknown, drops out.
- Permutations and linear mixing move a difference around predictably.
- Only the S-boxes do something uncertain. For an S-box, an input difference $a$
  leads to output difference $b$ with some probability, and for a good S-box no
  pair $(a, b)$ is much likelier than the others.

The attacker counts, for every $a$ and $b$, how many of the 16 inputs $x$ give
$S(x) \oplus S(x \oplus a) = b$. This is the **difference distribution table**.
For the toy cipher's S-box, input difference `B` gives output difference `2` for
8 of the 16 inputs: probability $1/2$, a large bias.

Chaining such S-box steps through the rounds gives a **differential
characteristic**. For the toy cipher, Heys's tutorial uses one through three
rounds:

| Round | Input difference | Active S-boxes | Probability |
|---|---|---|---|
| 1 | `0B00` | piece 2: $B \to 2$ | $8/16$ |
| 2 | `0040` | piece 3: $4 \to 6$ | $6/16$ |
| 3 | `0220` | pieces 2 and 3: $2 \to 5$ | $6/16 \cdot 6/16$ |
| 4 (before the S-boxes) | `0606` | | |

<figure class="mars-fig">
<svg viewBox="0 0 720 470" width="720" role="img" aria-label="The differential characteristic of the toy cipher: active S-boxes and nonzero difference bits through three rounds" fill="currentColor" font-size="13">
<text x="20" y="34" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">ΔP = 0B00</text>
<line x1="110" y1="40" x2="110" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="134" y1="40" x2="134" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="158" y1="40" x2="158" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="182" y1="40" x2="182" y2="64" stroke="currentColor" stroke-width="0.8"/>
<rect x="100" y="64" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="146" y="82.5" font-size="13" text-anchor="middle">S</text>
<line x1="240" y1="40" x2="240" y2="64" class="acc" stroke-width="2.2"/>
<line x1="264" y1="40" x2="264" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="288" y1="40" x2="288" y2="64" class="acc" stroke-width="2.2"/>
<line x1="312" y1="40" x2="312" y2="64" class="acc" stroke-width="2.2"/>
<rect x="230" y="64" width="92" height="28" rx="4" class="soft-acc"/>
<rect x="230" y="64" width="92" height="28" rx="4" fill="none" class="acc" stroke-width="2"/>
<text x="276" y="82.5" font-size="13" text-anchor="middle">S</text>
<line x1="370" y1="40" x2="370" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="394" y1="40" x2="394" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="418" y1="40" x2="418" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="442" y1="40" x2="442" y2="64" stroke="currentColor" stroke-width="0.8"/>
<rect x="360" y="64" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="406" y="82.5" font-size="13" text-anchor="middle">S</text>
<line x1="500" y1="40" x2="500" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="524" y1="40" x2="524" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="548" y1="40" x2="548" y2="64" stroke="currentColor" stroke-width="0.8"/>
<line x1="572" y1="40" x2="572" y2="64" stroke="currentColor" stroke-width="0.8"/>
<rect x="490" y="64" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="536" y="82.5" font-size="13" text-anchor="middle">S</text>
<text x="712" y="82" font-size="12.5" text-anchor="end">B → 2: 8/16</text>
<line x1="110" y1="92" x2="110" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="134" y1="92" x2="240" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="158" y1="92" x2="370" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="182" y1="92" x2="500" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="240" y1="92" x2="134" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="264" y1="92" x2="264" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="288" y1="92" x2="394" y2="145" class="acc" stroke-width="2.2"/>
<line x1="312" y1="92" x2="524" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="370" y1="92" x2="158" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="394" y1="92" x2="288" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="418" y1="92" x2="418" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="442" y1="92" x2="548" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="500" y1="92" x2="182" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="524" y1="92" x2="312" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="548" y1="92" x2="442" y2="145" stroke="currentColor" stroke-width="0.6"/>
<line x1="572" y1="92" x2="572" y2="145" stroke="currentColor" stroke-width="0.6"/>
<text x="20" y="139" font-size="13" text-anchor="start" font-weight="bold">0040</text>
<line x1="110" y1="145" x2="110" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="134" y1="145" x2="134" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="158" y1="145" x2="158" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="182" y1="145" x2="182" y2="169" stroke="currentColor" stroke-width="0.8"/>
<rect x="100" y="169" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="146" y="187.6" font-size="13" text-anchor="middle">S</text>
<line x1="240" y1="145" x2="240" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="264" y1="145" x2="264" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="288" y1="145" x2="288" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="312" y1="145" x2="312" y2="169" stroke="currentColor" stroke-width="0.8"/>
<rect x="230" y="169" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="276" y="187.6" font-size="13" text-anchor="middle">S</text>
<line x1="370" y1="145" x2="370" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="394" y1="145" x2="394" y2="169" class="acc" stroke-width="2.2"/>
<line x1="418" y1="145" x2="418" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="442" y1="145" x2="442" y2="169" stroke="currentColor" stroke-width="0.8"/>
<rect x="360" y="169" width="92" height="28" rx="4" class="soft-acc"/>
<rect x="360" y="169" width="92" height="28" rx="4" fill="none" class="acc" stroke-width="2"/>
<text x="406" y="187.6" font-size="13" text-anchor="middle">S</text>
<line x1="500" y1="145" x2="500" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="524" y1="145" x2="524" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="548" y1="145" x2="548" y2="169" stroke="currentColor" stroke-width="0.8"/>
<line x1="572" y1="145" x2="572" y2="169" stroke="currentColor" stroke-width="0.8"/>
<rect x="490" y="169" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="536" y="187.6" font-size="13" text-anchor="middle">S</text>
<text x="712" y="187" font-size="12.5" text-anchor="end">4 → 6: 6/16</text>
<line x1="110" y1="197" x2="110" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="134" y1="197" x2="240" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="158" y1="197" x2="370" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="182" y1="197" x2="500" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="240" y1="197" x2="134" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="264" y1="197" x2="264" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="288" y1="197" x2="394" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="312" y1="197" x2="524" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="370" y1="197" x2="158" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="394" y1="197" x2="288" y2="250" class="acc" stroke-width="2.2"/>
<line x1="418" y1="197" x2="418" y2="250" class="acc" stroke-width="2.2"/>
<line x1="442" y1="197" x2="548" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="500" y1="197" x2="182" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="524" y1="197" x2="312" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="548" y1="197" x2="442" y2="250" stroke="currentColor" stroke-width="0.6"/>
<line x1="572" y1="197" x2="572" y2="250" stroke="currentColor" stroke-width="0.6"/>
<text x="20" y="244" font-size="13" text-anchor="start" font-weight="bold">0220</text>
<line x1="110" y1="250" x2="110" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="134" y1="250" x2="134" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="158" y1="250" x2="158" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="182" y1="250" x2="182" y2="274" stroke="currentColor" stroke-width="0.8"/>
<rect x="100" y="274" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="146" y="292.6" font-size="13" text-anchor="middle">S</text>
<line x1="240" y1="250" x2="240" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="264" y1="250" x2="264" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="288" y1="250" x2="288" y2="274" class="acc" stroke-width="2.2"/>
<line x1="312" y1="250" x2="312" y2="274" stroke="currentColor" stroke-width="0.8"/>
<rect x="230" y="274" width="92" height="28" rx="4" class="soft-acc"/>
<rect x="230" y="274" width="92" height="28" rx="4" fill="none" class="acc" stroke-width="2"/>
<text x="276" y="292.6" font-size="13" text-anchor="middle">S</text>
<line x1="370" y1="250" x2="370" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="394" y1="250" x2="394" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="418" y1="250" x2="418" y2="274" class="acc" stroke-width="2.2"/>
<line x1="442" y1="250" x2="442" y2="274" stroke="currentColor" stroke-width="0.8"/>
<rect x="360" y="274" width="92" height="28" rx="4" class="soft-acc"/>
<rect x="360" y="274" width="92" height="28" rx="4" fill="none" class="acc" stroke-width="2"/>
<text x="406" y="292.6" font-size="13" text-anchor="middle">S</text>
<line x1="500" y1="250" x2="500" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="524" y1="250" x2="524" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="548" y1="250" x2="548" y2="274" stroke="currentColor" stroke-width="0.8"/>
<line x1="572" y1="250" x2="572" y2="274" stroke="currentColor" stroke-width="0.8"/>
<rect x="490" y="274" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="536" y="292.6" font-size="13" text-anchor="middle">S</text>
<text x="712" y="292" font-size="12.5" text-anchor="end">2 → 5: (6/16)²</text>
<line x1="110" y1="302" x2="110" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="134" y1="302" x2="240" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="158" y1="302" x2="370" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="182" y1="302" x2="500" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="240" y1="302" x2="134" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="264" y1="302" x2="264" y2="355" class="acc" stroke-width="2.2"/>
<line x1="288" y1="302" x2="394" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="312" y1="302" x2="524" y2="355" class="acc" stroke-width="2.2"/>
<line x1="370" y1="302" x2="158" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="394" y1="302" x2="288" y2="355" class="acc" stroke-width="2.2"/>
<line x1="418" y1="302" x2="418" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="442" y1="302" x2="548" y2="355" class="acc" stroke-width="2.2"/>
<line x1="500" y1="302" x2="182" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="524" y1="302" x2="312" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="548" y1="302" x2="442" y2="355" stroke="currentColor" stroke-width="0.6"/>
<line x1="572" y1="302" x2="572" y2="355" stroke="currentColor" stroke-width="0.6"/>
<text x="20" y="349" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">0606</text>
<line x1="110" y1="355" x2="110" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="134" y1="355" x2="134" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="158" y1="355" x2="158" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="182" y1="355" x2="182" y2="379" stroke="currentColor" stroke-width="0.8"/>
<rect x="100" y="379" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="146" y="397.6" font-size="13" text-anchor="middle">S</text>
<line x1="240" y1="355" x2="240" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="264" y1="355" x2="264" y2="379" class="acc" stroke-width="2.2"/>
<line x1="288" y1="355" x2="288" y2="379" class="acc" stroke-width="2.2"/>
<line x1="312" y1="355" x2="312" y2="379" stroke="currentColor" stroke-width="0.8"/>
<rect x="230" y="379" width="92" height="28" rx="4" class="soft-acc"/>
<rect x="230" y="379" width="92" height="28" rx="4" fill="none" class="acc" stroke-width="2"/>
<text x="276" y="397.6" font-size="13" text-anchor="middle">S</text>
<line x1="370" y1="355" x2="370" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="394" y1="355" x2="394" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="418" y1="355" x2="418" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="442" y1="355" x2="442" y2="379" stroke="currentColor" stroke-width="0.8"/>
<rect x="360" y="379" width="92" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="406" y="397.6" font-size="13" text-anchor="middle">S</text>
<line x1="500" y1="355" x2="500" y2="379" stroke="currentColor" stroke-width="0.8"/>
<line x1="524" y1="355" x2="524" y2="379" class="acc" stroke-width="2.2"/>
<line x1="548" y1="355" x2="548" y2="379" class="acc" stroke-width="2.2"/>
<line x1="572" y1="355" x2="572" y2="379" stroke="currentColor" stroke-width="0.8"/>
<rect x="490" y="379" width="92" height="28" rx="4" class="soft-acc"/>
<rect x="490" y="379" width="92" height="28" rx="4" fill="none" class="acc" stroke-width="2"/>
<text x="536" y="397.6" font-size="13" text-anchor="middle">S</text>
<text x="712" y="397" font-size="12.5" text-anchor="end"></text>
<text x="330" y="429" font-size="13" text-anchor="middle">last round: undo these two S-boxes with each key guess</text>
</svg>
<figcaption>Figure 6.13. Heys's characteristic, followed through the toy cipher. Only the accent S-boxes see a nonzero difference; the probabilities on the right multiply to 27/1024, about 1 in 38. A random 16-bit difference would be 0606 once in 65,536.</figcaption>
</figure>

Multiplying, a pair with plaintext difference `0B00` reaches the last round with
difference `0606` with probability

$$
\frac{8}{16} \cdot \frac{6}{16} \cdot \left(\frac{6}{16}\right)^2 = \frac{27}{1024} \approx \frac{1}{38}.
$$

A random difference would be `0606` with probability $1/65536$. That gap is the
attack.

### The attack

The difference `0606` touches only pieces 2 and 4 of the last round. Guess the 8
bits of the last round key that sit over those pieces, undo the last S-boxes for
both ciphertexts of each pair, and count how often the difference comes out as
`0606`. The right guess hits it about once in 38 pairs. A wrong guess undoes the
S-boxes with the wrong key, and the result is close to random.

```python
import random

SBOX = [0xE, 4, 0xD, 1, 2, 0xF, 0xB, 8, 3, 0xA, 6, 0xC, 5, 9, 0, 7]   # the toy cipher's S-box
INV = [SBOX.index(i) for i in range(16)]

def sub(x, box):                        # the S-box on each of the four 4-bit pieces
    return sum(box[x >> s & 15] << s for s in (12, 8, 4, 0))

def perm(x):                            # bit i of piece j moves to bit j of piece i
    y = 0
    for i in range(16):
        if x >> (15 - i) & 1:
            y |= 1 << (15 - (i % 4 * 4 + i // 4))
    return y

def encrypt(p, k):                      # k: five 16-bit round keys; 4 rounds, the last without perm
    x = p
    for r in range(3):
        x = perm(sub(x ^ k[r], SBOX))
    return sub(x ^ k[3], SBOX) ^ k[4]

ddt = [[0] * 16 for _ in range(16)]     # difference distribution table
for x in range(16):
    for a in range(16):
        ddt[a][SBOX[x] ^ SBOX[x ^ a]] += 1
print(ddt[0xB][2], ddt[4][6], ddt[2][5])        # 8 6 6

random.seed(2024)
key = [random.getrandbits(16) for _ in range(5)]
pairs = []
for _ in range(5000):                   # chosen plaintext pairs with difference 0B00
    p = random.getrandbits(16)
    pairs.append((encrypt(p, key), encrypt(p ^ 0x0B00, key)))

count = [0] * 256
for g in range(256):                    # guess 8 bits of the last key, over pieces 2 and 4
    k5 = (g >> 4) << 8 | (g & 15)
    for c1, c2 in pairs:
        if (c1 ^ c2) & 0xF0F0:          # pieces 1 and 3 must not differ
            continue
        u = sub(c1 ^ k5, INV) ^ sub(c2 ^ k5, INV)    # undo the last S-boxes
        if u & 0x0F0F == 0x0606:        # the difference the characteristic predicts
            count[g] += 1
best = max(range(256), key=count.__getitem__)
print(hex(best), count[best], sorted(count)[-2])               # 0xd2 145 87
print(hex((key[4] >> 8 & 15) << 4 | key[4] & 15))              # 0xd2: the real key bits
```

The right guess was hit 145 times, close to the expected $5000 \cdot 27/1024 \approx 132$;
the best wrong guess, 87. Eight key bits are found, and the rest follow by
peeling off the last round and repeating, or by brute force on what remains.

<figure class="mars-fig">
<svg viewBox="0 0 620 260" width="620" role="img" aria-label="Differential attack counts for each of 256 key guesses; the right guess d2 scores 145" fill="currentColor" font-size="13">
<line x1="58" y1="215" x2="576" y2="215" stroke="currentColor" stroke-width="1.4"/>
<line x1="58" y1="215" x2="58" y2="20" stroke="currentColor" stroke-width="1.4"/>
<line x1="53" y1="215" x2="58" y2="215" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="219" font-size="12.5" text-anchor="end">0</text>
<line x1="53" y1="168.8" x2="58" y2="168.8" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="172.8" font-size="12.5" text-anchor="end">40</text>
<line x1="53" y1="122.5" x2="58" y2="122.5" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="126.5" font-size="12.5" text-anchor="end">80</text>
<line x1="53" y1="76.2" x2="58" y2="76.2" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="80.2" font-size="12.5" text-anchor="end">120</text>
<line x1="53" y1="30" x2="58" y2="30" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="34" font-size="12.5" text-anchor="end">160</text>
<text x="61" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">00</text>
<text x="189" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">40</text>
<text x="317" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">80</text>
<text x="445" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">c0</text>
<text x="571" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">ff</text>
<rect x="60" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="62" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="64" y="188.4" width="1.6" height="26.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="68" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="70" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="74" y="196.5" width="1.6" height="18.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="78" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="82" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="84" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="86" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="88" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="92" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="94" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="96" y="193" width="1.6" height="22" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="98" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="100" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="102" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="106" y="202.3" width="1.6" height="12.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="108" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="110" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="114" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="116" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="118" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="120" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="122" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="124" y="203.4" width="1.6" height="11.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="126" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="128" y="189.6" width="1.6" height="25.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="132" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="134" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="138" y="195.3" width="1.6" height="19.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="150" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="152" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="154" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="156" y="201.1" width="1.6" height="13.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="158" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="160" y="190.7" width="1.6" height="24.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="162" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="164" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="166" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="168" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="170" y="200" width="1.6" height="15" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="174" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="178" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="180" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="182" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="184" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="186" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="188" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="206" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="210" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="212" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="216" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="218" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="220" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="222" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="224" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="228" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="230" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="234" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="248" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="252" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="254" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="256" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="260" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="266" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="270" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="274" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="276" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="280" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="282" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="284" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="286" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="288" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="292" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="294" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="298" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="300" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="316" y="187.2" width="1.6" height="27.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="318" y="201.1" width="1.6" height="13.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="320" y="136.4" width="1.6" height="78.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="324" y="201.1" width="1.6" height="13.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="326" y="187.2" width="1.6" height="27.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="330" y="173.4" width="1.6" height="41.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="340" y="206.9" width="1.6" height="8.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="342" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="344" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="346" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="350" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="354" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="372" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="376" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="380" y="196.5" width="1.6" height="18.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="382" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="384" y="169.9" width="1.6" height="45.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="388" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="390" y="195.3" width="1.6" height="19.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="394" y="187.2" width="1.6" height="27.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="396" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="404" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="406" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="408" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="410" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="412" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="414" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="416" y="181.5" width="1.6" height="33.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="418" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="420" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="422" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="426" y="201.1" width="1.6" height="13.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="436" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="438" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="440" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="442" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="444" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="446" y="212.7" width="1.6" height="2.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="450" y="210.4" width="1.6" height="4.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="454" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="460" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="468" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="472" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="476" y="152.6" width="1.6" height="62.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="478" y="176.8" width="1.6" height="38.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="480" y="47.3" width="1.6" height="167.7" rx="0" class="acc-fill" fill-opacity="1"/>
<rect x="484" y="176.8" width="1.6" height="38.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="486" y="152.6" width="1.6" height="62.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="490" y="114.4" width="1.6" height="100.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="500" y="198.8" width="1.6" height="16.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="502" y="194.2" width="1.6" height="20.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="504" y="200" width="1.6" height="15" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="506" y="200" width="1.6" height="15" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="508" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="510" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="512" y="181.5" width="1.6" height="33.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="514" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="516" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="518" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="520" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="522" y="201.1" width="1.6" height="13.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="532" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="534" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="536" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="538" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="540" y="193" width="1.6" height="22" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="542" y="203.4" width="1.6" height="11.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="544" y="169.9" width="1.6" height="45.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="546" y="211.5" width="1.6" height="3.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="548" y="205.8" width="1.6" height="9.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="550" y="196.5" width="1.6" height="18.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="554" y="187.2" width="1.6" height="27.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="558" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="562" y="213.8" width="1.6" height="1.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="564" y="204.6" width="1.6" height="10.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="566" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="568" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="570" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<text x="488" y="53.3" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">d2: 145</text>
<text x="318" y="254" font-size="13" text-anchor="middle">guess for 8 bits of the last round key</text>
</svg>
<figcaption>Figure 6.14. The differential attack of the code: for each of the 256 guesses, the number of the 5,000 pairs that show the predicted difference 0606. The right guess, d2, scores 145; the best wrong guess 87.</figcaption>
</figure>

**What this means for design.** The defense is S-boxes with no large entries in
their difference table, and enough rounds that every characteristic passes
through many S-boxes, so its probability is far below $2^{-b}$. DES's S-boxes
were chosen with exactly this in mind. AES's S-box has a largest entry of 4 in
256 (probability $2^{-6}$), and [Chapter 7](07-AES.md) shows how its designers
proved a bound on whole characteristics.

!!! note "Life story: differential cryptanalysis"
    **Born:** found in secret at IBM in 1974 (the "T-attack"); rediscovered and
    published in 1990 by Eli Biham and Adi Shamir at the Weizmann Institute ·
    **Purpose:** a general way to recover key bits by following XOR differences
    through a cipher · **Helped:** broke FEAL and many ciphers of its time,
    explained the DES S-boxes, and gave designers a measurable target ·
    **Status:** current; every block cipher, hash function and stream cipher is
    now designed and checked against it

## 6.9 Linear cryptanalysis

*Level: intermediate.* In 1993 Mitsuru Matsui of Mitsubishi Electric in Japan
published the second great general attack, growing out of his work on FEAL. In
1994 he used it to recover a full DES key from $2^{43}$ known plaintexts, in about
50 days on twelve workstations: the first experimental break of DES faster than
brute force. DES had not been designed against it, and it shows: it is the best
known attack on DES that uses only known, not chosen, plaintexts.

### The idea

Look for a **linear approximation**: an XOR of some plaintext bits, some bits
before the last round, and so implicitly some key bits, that holds with
probability $\frac12 + \varepsilon$ instead of exactly $\frac12$. The number
$\varepsilon$ is the **bias**.

For one S-box, count for every input mask $a$ and output mask $b$ how many of
the 16 inputs satisfy $a \cdot x = b \cdot S(x)$ (each side is an XOR of the
selected bits), minus 8. This is the **linear approximation table**. For the toy
S-box, the bits $X_1 \oplus X_3 \oplus X_4 = Y_2$ (mask `B` in, `4` out) hold for
12 of 16 inputs: bias $+\frac14$.

To chain approximations through several S-boxes, Matsui's **piling-up lemma**
says that for $n$ independent approximations with biases $\varepsilon_i$, their
XOR has bias

$$
\varepsilon = 2^{n-1} \prod_{i=1}^{n} \varepsilon_i .
$$

Heys's characteristic for the toy cipher uses four S-boxes, one with bias
$\frac14$ and three with bias $-\frac14$, so

$$
\varepsilon = 2^{3} \cdot \tfrac14 \cdot \left(-\tfrac14\right)^3 = -\tfrac{1}{32}.
$$

It relates plaintext bits 5, 7 and 8 to bits 6, 8, 14 and 16 entering the last
S-boxes. With about $1/\varepsilon^2 = 1024$ known plaintexts the bias starts to
show; a few times that makes it reliable.

### The attack

Guess the same 8 last-round key bits, undo the last S-boxes, and count how often
the approximation holds. For the right guess the count is far from half; for
wrong guesses it is near half.

```python
def bit(x, i):                          # bit i of a 16-bit word, numbered 1 to 16 from the left
    return x >> (16 - i) & 1

lat = [[sum(bin(x & a).count("1") % 2 == bin(SBOX[x] & b).count("1") % 2 for x in range(16)) - 8
        for b in range(16)] for a in range(16)]
print(lat[0xB][4], lat[4][5])           # 4 -4: X1+X3+X4 = Y2 holds 12 times in 16

random.seed(7)
key = [random.getrandbits(16) for _ in range(5)]
known = [(p, encrypt(p, key)) for p in (random.getrandbits(16) for _ in range(10000))]
bias = [0] * 256
for g in range(256):
    k5 = (g >> 4) << 8 | (g & 15)
    n = 0
    for p, c in known:
        u = sub(c ^ k5, INV)
        n += bit(u, 6) ^ bit(u, 8) ^ bit(u, 14) ^ bit(u, 16) ^ bit(p, 5) ^ bit(p, 7) ^ bit(p, 8) == 0
    bias[g] = abs(n - len(known) // 2)
best = max(range(256), key=bias.__getitem__)
print(hex(best), bias[best], sorted(bias)[-2], hex((key[4] >> 8 & 15) << 4 | key[4] & 15))
# 0x63 332 275 0x63
```

The right key bits stand out with a count 332 away from half (about
$10000/32 = 312$ expected) against 275 for the best wrong guess.

<figure class="mars-fig">
<svg viewBox="0 0 620 260" width="620" role="img" aria-label="Linear attack bias for each of 256 key guesses; the right guess 63 is 332 away from half" fill="currentColor" font-size="13">
<line x1="58" y1="215" x2="576" y2="215" stroke="currentColor" stroke-width="1.4"/>
<line x1="58" y1="215" x2="58" y2="20" stroke="currentColor" stroke-width="1.4"/>
<line x1="53" y1="215" x2="58" y2="215" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="219" font-size="12.5" text-anchor="end">0</text>
<line x1="53" y1="188.6" x2="58" y2="188.6" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="192.6" font-size="12.5" text-anchor="end">50</text>
<line x1="53" y1="162.1" x2="58" y2="162.1" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="166.1" font-size="12.5" text-anchor="end">100</text>
<line x1="53" y1="135.7" x2="58" y2="135.7" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="139.7" font-size="12.5" text-anchor="end">150</text>
<line x1="53" y1="109.3" x2="58" y2="109.3" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="113.3" font-size="12.5" text-anchor="end">200</text>
<line x1="53" y1="82.9" x2="58" y2="82.9" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="86.9" font-size="12.5" text-anchor="end">250</text>
<line x1="53" y1="56.4" x2="58" y2="56.4" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="60.4" font-size="12.5" text-anchor="end">300</text>
<line x1="53" y1="30" x2="58" y2="30" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="34" font-size="12.5" text-anchor="end">350</text>
<text x="61" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">00</text>
<text x="189" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">40</text>
<text x="317" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">80</text>
<text x="445" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">c0</text>
<text x="571" y="233" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">ff</text>
<rect x="60" y="203.9" width="1.6" height="11.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="62" y="213.9" width="1.6" height="1.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="64" y="169" width="1.6" height="46" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="66" y="143.1" width="1.6" height="71.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="68" y="151" width="1.6" height="64" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="70" y="137.3" width="1.6" height="77.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="72" y="155.3" width="1.6" height="59.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="74" y="173.2" width="1.6" height="41.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="76" y="168" width="1.6" height="47" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="78" y="185.9" width="1.6" height="29.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="80" y="203.9" width="1.6" height="11.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="82" y="190.2" width="1.6" height="24.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="84" y="178" width="1.6" height="37" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="86" y="203.9" width="1.6" height="11.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="88" y="179.1" width="1.6" height="35.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="90" y="191.2" width="1.6" height="23.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="92" y="183.3" width="1.6" height="31.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="94" y="129.9" width="1.6" height="85.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="96" y="141" width="1.6" height="74" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="98" y="152.1" width="1.6" height="62.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="100" y="144.2" width="1.6" height="70.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="102" y="213.9" width="1.6" height="1.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="104" y="130.4" width="1.6" height="84.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="106" y="204.4" width="1.6" height="10.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="108" y="118.8" width="1.6" height="96.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="110" y="213.9" width="1.6" height="1.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="112" y="128.3" width="1.6" height="86.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="114" y="200.2" width="1.6" height="14.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="116" y="194.4" width="1.6" height="20.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="118" y="205.5" width="1.6" height="9.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="120" y="213.4" width="1.6" height="1.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="122" y="163.2" width="1.6" height="51.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="124" y="211.3" width="1.6" height="3.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="126" y="200.2" width="1.6" height="14.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="128" y="211.3" width="1.6" height="3.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="130" y="208.7" width="1.6" height="6.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="132" y="132" width="1.6" height="83" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="134" y="174.3" width="1.6" height="40.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="136" y="168" width="1.6" height="47" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="138" y="137.3" width="1.6" height="77.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="140" y="201.8" width="1.6" height="13.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="142" y="197.6" width="1.6" height="17.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="144" y="191.2" width="1.6" height="23.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="146" y="196.5" width="1.6" height="18.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="148" y="198.1" width="1.6" height="16.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="150" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="152" y="210.8" width="1.6" height="4.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="154" y="200.7" width="1.6" height="14.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="156" y="175.9" width="1.6" height="39.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="158" y="159.5" width="1.6" height="55.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="160" y="171.7" width="1.6" height="43.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="162" y="114" width="1.6" height="101" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="164" y="102.9" width="1.6" height="112.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="166" y="146.3" width="1.6" height="68.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="168" y="109.3" width="1.6" height="105.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="170" y="159" width="1.6" height="56" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="172" y="157.9" width="1.6" height="57.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="174" y="207.6" width="1.6" height="7.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="176" y="170.6" width="1.6" height="44.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="178" y="213.9" width="1.6" height="1.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="180" y="176.4" width="1.6" height="38.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="182" y="196" width="1.6" height="19" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="184" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="186" y="191.7" width="1.6" height="23.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="188" y="152.1" width="1.6" height="62.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="190" y="115.6" width="1.6" height="99.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="192" y="102.4" width="1.6" height="112.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="194" y="100.8" width="1.6" height="114.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="196" y="182.8" width="1.6" height="32.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="198" y="148.9" width="1.6" height="66.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="200" y="214.5" width="1.6" height="0.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="202" y="191.2" width="1.6" height="23.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="204" y="198.6" width="1.6" height="16.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="206" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="208" y="141.5" width="1.6" height="73.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="210" y="190.2" width="1.6" height="24.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="214" y="213.4" width="1.6" height="1.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="216" y="200.2" width="1.6" height="14.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="218" y="163.7" width="1.6" height="51.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="220" y="168" width="1.6" height="47" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="222" y="175.9" width="1.6" height="39.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="224" y="131" width="1.6" height="84" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="226" y="151.6" width="1.6" height="63.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="228" y="177.5" width="1.6" height="37.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="230" y="210.2" width="1.6" height="4.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="232" y="168" width="1.6" height="47" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="234" y="145.8" width="1.6" height="69.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="236" y="212.4" width="1.6" height="2.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="238" y="190.2" width="1.6" height="24.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="240" y="147.9" width="1.6" height="67.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="242" y="180.6" width="1.6" height="34.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="244" y="188.6" width="1.6" height="26.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="246" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="248" y="164.3" width="1.6" height="50.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="250" y="172.2" width="1.6" height="42.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="252" y="114" width="1.6" height="101" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="254" y="71.2" width="1.6" height="143.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="256" y="69.6" width="1.6" height="145.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="258" y="39.5" width="1.6" height="175.5" rx="0" class="acc-fill" fill-opacity="1"/>
<rect x="260" y="151" width="1.6" height="64" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="262" y="214.5" width="1.6" height="0.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="264" y="161.6" width="1.6" height="53.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="266" y="185.9" width="1.6" height="29.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="268" y="161.6" width="1.6" height="53.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="270" y="185.9" width="1.6" height="29.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="272" y="132" width="1.6" height="83" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="274" y="196.5" width="1.6" height="18.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="276" y="190.7" width="1.6" height="24.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="278" y="160.6" width="1.6" height="54.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="280" y="159" width="1.6" height="56" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="282" y="116.2" width="1.6" height="98.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="284" y="169" width="1.6" height="46" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="286" y="186.5" width="1.6" height="28.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="288" y="150" width="1.6" height="65" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="290" y="161.1" width="1.6" height="53.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="292" y="168" width="1.6" height="47" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="294" y="207.1" width="1.6" height="7.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="296" y="157.4" width="1.6" height="57.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="298" y="150" width="1.6" height="65" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="300" y="172.2" width="1.6" height="42.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="302" y="164.8" width="1.6" height="50.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="304" y="115.1" width="1.6" height="99.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="306" y="154.2" width="1.6" height="60.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="308" y="202.3" width="1.6" height="12.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="310" y="213.4" width="1.6" height="1.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="312" y="176.9" width="1.6" height="38.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="314" y="194.4" width="1.6" height="20.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="316" y="139.4" width="1.6" height="75.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="318" y="134.7" width="1.6" height="80.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="320" y="95" width="1.6" height="120" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="322" y="108.2" width="1.6" height="106.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="324" y="172.2" width="1.6" height="42.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="326" y="205" width="1.6" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="328" y="207.1" width="1.6" height="7.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="330" y="190.2" width="1.6" height="24.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="332" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="334" y="192.3" width="1.6" height="22.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="336" y="194.4" width="1.6" height="20.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="338" y="202.8" width="1.6" height="12.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="340" y="188.6" width="1.6" height="26.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="342" y="201.8" width="1.6" height="13.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="344" y="162.1" width="1.6" height="52.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="346" y="157.4" width="1.6" height="57.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="348" y="194.4" width="1.6" height="20.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="350" y="180.1" width="1.6" height="34.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="352" y="175.4" width="1.6" height="39.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="354" y="200.2" width="1.6" height="14.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="356" y="189.1" width="1.6" height="25.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="358" y="196.5" width="1.6" height="18.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="360" y="202.8" width="1.6" height="12.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="362" y="154.2" width="1.6" height="60.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="364" y="210.2" width="1.6" height="4.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="366" y="171.1" width="1.6" height="43.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="368" y="177.5" width="1.6" height="37.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="370" y="184.9" width="1.6" height="30.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="372" y="200.2" width="1.6" height="14.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="374" y="175.4" width="1.6" height="39.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="376" y="180.1" width="1.6" height="34.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="378" y="194.4" width="1.6" height="20.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="380" y="140.5" width="1.6" height="74.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="382" y="145.2" width="1.6" height="69.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="384" y="114" width="1.6" height="101" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="386" y="117.7" width="1.6" height="97.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="388" y="162.7" width="1.6" height="52.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="390" y="201.8" width="1.6" height="13.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="392" y="196.5" width="1.6" height="18.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="394" y="194.4" width="1.6" height="20.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="396" y="169" width="1.6" height="46" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="398" y="166.9" width="1.6" height="48.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="400" y="161.6" width="1.6" height="53.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="402" y="200.7" width="1.6" height="14.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="404" y="202.3" width="1.6" height="12.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="406" y="206" width="1.6" height="9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="408" y="174.8" width="1.6" height="40.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="410" y="179.6" width="1.6" height="35.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="412" y="156.3" width="1.6" height="58.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="414" y="205.5" width="1.6" height="9.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="416" y="142.6" width="1.6" height="72.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="418" y="168.5" width="1.6" height="46.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="420" y="157.4" width="1.6" height="57.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="422" y="131" width="1.6" height="84" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="424" y="150" width="1.6" height="65" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="426" y="148.9" width="1.6" height="66.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="428" y="150" width="1.6" height="65" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="430" y="148.9" width="1.6" height="66.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="432" y="168" width="1.6" height="47" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="434" y="141.5" width="1.6" height="73.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="436" y="175.9" width="1.6" height="39.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="438" y="201.8" width="1.6" height="13.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="440" y="138.9" width="1.6" height="76.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="442" y="188" width="1.6" height="27" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="444" y="194.9" width="1.6" height="20.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="446" y="207.1" width="1.6" height="7.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="448" y="207.6" width="1.6" height="7.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="450" y="173.2" width="1.6" height="41.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="452" y="200.2" width="1.6" height="14.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="454" y="211.8" width="1.6" height="3.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="456" y="199.1" width="1.6" height="15.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="458" y="207.6" width="1.6" height="7.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="460" y="184.3" width="1.6" height="30.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="462" y="207.6" width="1.6" height="7.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="464" y="188.6" width="1.6" height="26.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="466" y="206.5" width="1.6" height="8.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="468" y="175.4" width="1.6" height="39.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="470" y="209.7" width="1.6" height="5.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="472" y="209.2" width="1.6" height="5.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="474" y="197" width="1.6" height="18" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="476" y="192.3" width="1.6" height="22.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="478" y="182.2" width="1.6" height="32.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="480" y="182.8" width="1.6" height="32.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="482" y="149.5" width="1.6" height="65.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="484" y="171.1" width="1.6" height="43.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="486" y="190.2" width="1.6" height="24.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="488" y="140.5" width="1.6" height="74.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="490" y="185.9" width="1.6" height="29.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="492" y="114" width="1.6" height="101" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="494" y="212.4" width="1.6" height="2.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="496" y="168" width="1.6" height="47" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="498" y="187" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="500" y="199.1" width="1.6" height="15.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="502" y="197.6" width="1.6" height="17.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="504" y="198.1" width="1.6" height="16.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="506" y="188" width="1.6" height="27" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="508" y="202.3" width="1.6" height="12.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="510" y="177.5" width="1.6" height="37.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="512" y="176.9" width="1.6" height="38.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="514" y="211.3" width="1.6" height="3.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="516" y="159" width="1.6" height="56" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="518" y="148.4" width="1.6" height="66.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="520" y="178" width="1.6" height="37" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="522" y="155.8" width="1.6" height="59.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="524" y="206.5" width="1.6" height="8.5" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="526" y="201.3" width="1.6" height="13.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="528" y="199.1" width="1.6" height="15.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="530" y="209.7" width="1.6" height="5.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="532" y="195.4" width="1.6" height="19.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="534" y="200.2" width="1.6" height="14.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="536" y="200.7" width="1.6" height="14.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="538" y="204.4" width="1.6" height="10.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="540" y="207.1" width="1.6" height="7.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="542" y="166.4" width="1.6" height="48.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="544" y="205" width="1.6" height="10" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="546" y="202.3" width="1.6" height="12.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="548" y="152.1" width="1.6" height="62.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="550" y="202.8" width="1.6" height="12.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="552" y="153.2" width="1.6" height="61.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="554" y="208.1" width="1.6" height="6.9" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="556" y="174.3" width="1.6" height="40.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="558" y="200.7" width="1.6" height="14.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="560" y="155.3" width="1.6" height="59.7" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="562" y="199.7" width="1.6" height="15.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="564" y="176.9" width="1.6" height="38.1" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="566" y="179.6" width="1.6" height="35.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="568" y="191.7" width="1.6" height="23.3" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="570" y="197.6" width="1.6" height="17.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<text x="266" y="45.5" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">63: 332</text>
<text x="318" y="254" font-size="13" text-anchor="middle">guess for 8 bits of the last round key</text>
</svg>
<figcaption>Figure 6.15. The linear attack of the code: for each guess, how far the count of the approximation holding is from half of 10,000. The right guess, 63, stands at 332; the best wrong guess at 275, a narrower win that more texts would widen.</figcaption>
</figure>

The defense is the same as before: S-boxes whose approximation table has only
small entries, and enough rounds that every linear trail is spread over many
S-boxes. Since 1994 no serious block cipher has been published without arguments
against both attacks.

Matsui put his own lesson into practice. His cipher MISTY1, published in the
mid-1990s, was built so
that its resistance to both attacks could be proved, and its variant KASUMI
became the cipher of 3G mobile phones.

!!! note "Life story: linear cryptanalysis"
    **Born:** 1993, Mitsuru Matsui at Mitsubishi Electric, growing out of
    attacks on FEAL · **Purpose:** a known-plaintext attack that turns small
    biases of linear equations into key bits · **Helped:** the first
    experimental break of full DES faster than brute force (1994, $2^{43}$
    known plaintexts), and the design of ciphers with provable bounds, from
    MISTY1 to AES · **Status:** current; with differential cryptanalysis, one
    of the two tests every design must pass

### Other attacks to know by name

- **Integral (square) attacks** (Daemen, Knudsen and Rijmen, 1997) follow a set of
  plaintexts that run through all values of one byte. They matter most for AES.
- **Related-key attacks** use encryptions under keys with a known relation. They
  break some ciphers in theory and almost never apply in practice, but the 3G
  cipher KASUMI, a variant of Matsui's MISTY1, falls to one in under two hours on
  a PC (Dunkelman, Keller and Shamir, 2010), though not in the way 3G uses it.
- **Slide attacks** (Biryukov and Wagner, 1999) break ciphers whose rounds are all
  identical, however many rounds there are. Round constants in the key schedule
  stop them.

## 6.10 In the real world

*Level: intermediate.*

| | Block | Key | Status |
|---|---|---|---|
| DES (FIPS 46, 1977) | 64 | 56 | broken by brute force; withdrawn 2005 |
| Triple DES, 2 keys | 64 | 112 (about 80-bit security) | disallowed for encryption after 2015 |
| Triple DES, 3 keys | 64 | 168 (112-bit security) | disallowed for encryption after 2023 (SP 800-131A) |
| AES | 128 | 128, 192, 256 | recommended ([Chapter 7](07-AES.md)) |

**Where DES still lives.** In old 13-character Unix `crypt` password hashes, in
the MS-CHAPv2 authentication of old VPNs (which reduces to cracking DES keys, and
was broken that way in 2012), and inside triple DES in payment systems and old
PKCS#12 files. Decrypting old data is still allowed; encrypting new data is not.
Full details: [Retired ciphers](../04-symmetric-ciphers/Retired.md).

**Feistel ciphers around the world.** The structure spread far beyond IBM. The
Soviet Union standardized GOST 28147-89, a 32-round Feistel cipher with a 64-bit
block and a 256-bit key, whose S-boxes were supplied separately; Russia keeps a
revised version as Magma. Japan produced FEAL (broken) and later Matsui's
MISTY1, whose variant KASUMI protected 3G calls, and Camellia (NTT and
Mitsubishi, 2000). Korea's SEED (1998) and China's SM4 (2006) use Feistel
variants. Bruce Schneier's free Blowfish (1993) and the Swiss IDEA (Lai and
Massey, 1991, built on a different structure) were the popular alternatives to
DES in the 1990s. The national
128-bit ciphers are compared in [Chapter 7](07-AES.md) and on the
[National ciphers](../04-symmetric-ciphers/National-Ciphers.md) page.

**How a block cipher is used.** A block cipher alone encrypts one block. To
encrypt a file or a network stream it is run in a **mode of operation**, and the
mode decides most of the real-world security: whether patterns leak, whether
nonces matter, whether tampering is detected. That is
[Chapter 8](08-Modes-of-Operation.md).

## 6.11 Going deeper

*Level: expert.*

**Pseudorandom permutations.** The precise goal for a block cipher is to be a
**pseudorandom permutation** (PRP): an attacker who may query an oracle that is
either $E_K$ for a random key or a truly random permutation, and must say which,
has negligible advantage. If the attacker may also query the inverse, the goal is
a **strong PRP**. Security proofs of modes ([Chapter 8](08-Modes-of-Operation.md))
and MACs ([Chapter 10](10-Message-Authentication.md)) assume the block cipher is a
PRP and nothing more, which is why a cipher with any distinguisher at all is
retired.

**Luby and Rackoff (1988).** If each round function of a Feistel network is an
independent random function, then three rounds give a PRP and four a strong PRP,
with the advantage bounded by roughly $q^2 / 2^{b/2}$ for $q$ queries. Two rounds
are not enough: for inputs $(L, R)$ and $(L', R)$ with the same right half, the
left halves of the outputs differ by exactly $L \oplus L'$, which a random
permutation would almost never do. (Exercise 6 asks you to check it.) The
theorem explains the shape of the structure; it says nothing about DES, whose
round functions are far from random.

**How the DES S-boxes were chosen.** Coppersmith's 1994 paper listed the design
criteria. Among them: each S-box has 6 input bits and 4 output bits (the most that
fit on one chip in 1974); no output bit is close to a linear function of the
input bits; changing one input bit changes at least two output bits; inputs that
differ in the two middle bits change at least two output bits; and for any
nonzero input difference, no output difference occurs for more than 8 of the 32
input pairs. The last criteria are exactly a bound on the difference
distribution table.

**The best attacks on DES.** All need far more data than any real attacker gets
from one key, which is why brute force was the threat that mattered:

| Attack | Year | Data | Time |
|---|---|---|---|
| Brute force | | 1 known pair | $2^{55}$ on average |
| Differential (Biham, Shamir) | 1992 | $2^{47}$ chosen plaintexts | $2^{37}$ |
| Linear (Matsui) | 1994 | $2^{43}$ known plaintexts | $2^{43}$ |
| Davies' attack, improved (Biham, Biryukov) | 1997 | $2^{50}$ known plaintexts | $2^{50}$ |

**Key whitening.** Ron Rivest's **DESX** (1984) adds two 64-bit keys around DES:
$C = K_2 \oplus \mathrm{DES}_K(P \oplus K_1)$. It costs almost nothing, and Joe
Kilian and Phillip Rogaway proved in 1996 that it raises the cost of key search
to about $2^{119}/m$, where $m$ is the number of plaintext-ciphertext pairs the
attacker has. The same trick, XOR
a key before and after, is part of AES (its first and last AddRoundKey) and of
the XEX and XTS modes in [Chapter 8](08-Modes-of-Operation.md).

**Why the double-encryption bound is generic.** Meet in the middle works for any
cipher, since it never looks inside $E$. So $n$-fold encryption with independent
keys gives at most about $\lceil n/2 \rceil$ keys' worth of security against it.
That is why triple, not double, encryption became the standard, and why nobody
proposed quadruple.

## Check yourself

??? question "1. A Feistel network's round function always returns 0. What does the cipher do?"

    Each round just swaps the halves: $L_{i+1} = R_i$, $R_{i+1} = L_i$. After an
    even number of rounds the output equals the input. The structure is only as
    good as its round function.

??? question "2. Why must every step of an SPN be invertible, but not the round function of a Feistel network?"

    An SPN decrypts by undoing each step, so each needs an inverse. A Feistel
    network decrypts by recomputing $F$ on a half it already has and XORing it
    away, so $F$ is only ever run forwards.

??? question "3. Look up the input `101101` in DES's $S_1$ (the table in §6.4)."

    Outer bits `1` and `1` give row 3; inner bits `0110` give column 6.
    $S_1$ row 3, column 6 is 1, so the output is `0001`.

??? question "4. Why does key mixing not change an XOR difference, and why does that matter for differential cryptanalysis?"

    $(x \oplus k) \oplus (x' \oplus k) = x \oplus x'$: the key cancels. So the
    attacker can follow differences through the cipher without knowing the key,
    and only the S-boxes introduce uncertainty.

??? question "5. Double encryption with two independent 64-bit keys is attacked by meet in the middle. Roughly how much work and memory does it take?"

    About $2^{65}$ encryptions ($2^{64}$ for each side) and a table of $2^{64}$
    entries. The effective strength is about 64 bits plus one, not 128.

??? question "6. Show that a two-round Feistel network is not a pseudorandom permutation."

    Encrypt $(L, R)$ and $(L', R)$. After round 1 the right halves are
    $L \oplus F_1(R)$ and $L' \oplus F_1(R)$, and the left halves are both $R$.
    After round 2 the left halves are those right halves, and their XOR is
    $L \oplus L'$. A random permutation gives that with probability about
    $2^{-b/2}$, so two queries distinguish it.

??? question "7. A cipher with a 64-bit block is used in CBC mode at 1 Gbit/s under one key. After how long is a block collision likely?"

    After about $2^{32}$ blocks of 8 bytes. A 50% chance comes at about 37.7 GiB,
    which at 125 MB/s takes about 5.4 minutes. Rekey long before that.

??? question "8. In the toy differential attack, why are pairs whose ciphertexts differ in pieces 1 or 3 thrown away?"

    The characteristic predicts that pieces 1 and 3 have zero difference entering
    the last S-boxes, and an S-box with zero input difference has zero output
    difference. A pair that differs there cannot have followed the
    characteristic, so it only adds noise to the counts.

??? question "9. Linear cryptanalysis needs about $1/\varepsilon^2$ known plaintexts. Matsui's best approximation for 14 rounds of DES has bias about $1.19 \times 2^{-21}$. How many plaintexts is that?"

    $1/\varepsilon^2 \approx 2^{42} / 1.42 \approx 2^{41.5}$. Matsui used $2^{43}$
    to make the attack reliable and recover more key bits.

??? question "10. Why does the complementation property let a chosen-plaintext attacker halve a DES key search?"

    Ask for $C_1 = E_K(P)$ and $C_2 = E_K(\bar P)$. For each trial key $T$,
    compute $E_T(P)$. If it equals $C_1$, $T$ is a candidate. If it equals
    $\overline{C_2}$, then $E_{\bar T}(\bar P) = C_2$ and $\bar T$ is a candidate.
    One encryption tests two keys, so trying half the key space suffices.

## What you learned

- A block cipher is a keyed permutation of fixed-size blocks, meant to be
  indistinguishable from a random permutation. It is built from rounds that
  alternate confusion (S-boxes) and diffusion (mixing).
- An SPN transforms the whole block each round and needs invertible steps. A
  Feistel network transforms half, and decrypts with any round function at all.
- DES is a 16-round Feistel cipher with eight 6-to-4-bit S-boxes. Its design held
  up well; its 56-bit key did not, and Deep Crack found keys in days in 1998.
- Meet in the middle makes double encryption almost useless. Triple DES gives
  112-bit security, but its 64-bit block wears out after about 32 GiB (Sweet32).
- Differential cryptanalysis follows XOR differences through the S-boxes;
  linear cryptanalysis follows biased linear equations. Both recover key bits
  from many plaintexts, and every modern cipher is designed to resist both.

**Next:** [Chapter 7](07-AES.md), the open competition that replaced DES, and the
cipher that won it.

## Further reading

- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949).
- Horst Feistel, "Cryptography and Computer Privacy", *Scientific American* 228
  (May 1973).
- FIPS 46-3, Data Encryption Standard (1999, withdrawn 2005).
- Whitfield Diffie and Martin Hellman, "Exhaustive Cryptanalysis of the NBS Data
  Encryption Standard", *Computer* 10 (1977).
- Michael Luby and Charles Rackoff, "How to Construct Pseudorandom Permutations
  from Pseudorandom Functions", *SIAM Journal on Computing* 17 (1988).
- Eli Biham and Adi Shamir, *Differential Cryptanalysis of the Data Encryption
  Standard* (Springer, 1993).
- Mitsuru Matsui, "Linear Cryptanalysis Method for DES Cipher" (EUROCRYPT 1993).
- Don Coppersmith, "The Data Encryption Standard (DES) and its strength against
  attacks", *IBM Journal of Research and Development* 38 (1994).
- Howard Heys, "A Tutorial on Linear and Differential Cryptanalysis",
  *Cryptologia* 26 (2002): the toy cipher of §6.2, §6.8 and §6.9.
- Electronic Frontier Foundation, *Cracking DES* (O'Reilly, 1998).
- [Karthikeyan Bhargavan and Gaëtan Leurent, "On the Practical (In-)Security of
  64-bit Block Ciphers" (CCS 2016)](https://sweet32.info/).
- Reference pages: [Retired ciphers](../04-symmetric-ciphers/Retired.md),
  [National ciphers](../04-symmetric-ciphers/National-Ciphers.md), and the history
  appendix [From Shannon to DES](../books/history/15-Shannon-and-the-Agencies.md).
