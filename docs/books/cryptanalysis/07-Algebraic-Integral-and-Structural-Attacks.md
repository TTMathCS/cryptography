# 7. Algebraic, Integral and Structural Attacks

*Differential and linear cryptanalysis follow one pair or one equation through
a cipher, and modern ciphers are built so that nothing useful survives enough
rounds of either. This chapter is about everything else an
attacker can grab: whole sets of plaintexts instead of pairs, the polynomial a
cipher computes, the equations it satisfies, rounds that are all alike, and key
schedules that leak. You will break 4-round AES with 768 chosen plaintexts using
an AES you write yourself, recover all five keys of an 80-bit algebraic cipher
from 82 known plaintexts by interpolation, solve a toy cipher with a small SAT
solver, and slide through a 512-round cipher as easily as through one round.
Then you will read the attacks on the full AES (related keys, bicliques,
meet-in-the-middle) for what they are, and finish with a precise answer to the
question every user of AES asks: is it broken?*

!!! abstract "In this chapter"
    **You will learn:**

    - the integral (Square) attack: why a set of 256 plaintexts becomes balanced
      after three rounds of AES, how that recovers the key of 4-round AES, and
      how it stretches to 5 and 6 rounds;
    - interpolation attacks on ciphers whose rounds are simple polynomials;
    - how a cipher becomes a system of equations, what XL and XSL tried to do,
      and what happened to the XSL claim against AES;
    - how SAT solvers attack reduced ciphers, with a small DPLL solver in Python;
    - slide attacks on ciphers whose rounds are all the same;
    - the related-key attacks on AES-192 and AES-256 (2009), the biclique attack
      (2011), and meet-in-the-middle attacks on reduced AES, with what each one
      does and does not mean;
    - what "AES is unbroken" means, precisely.

    **You need:** AES itself, from book 1's [Chapter 7](../../book/07-AES.md)
    (this chapter does not teach the cipher again); block ciphers, Feistel
    networks and SPNs from book 1's [Chapter 6](../../book/06-Block-Ciphers.md);
    attack models and the three costs from [Chapter 1](01-What-Cryptanalysis-Is.md);
    meet-in-the-middle from [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md).
    The sister chapters [Chapter 5](05-Differential-Cryptanalysis.md) and
    [Chapter 6](06-Linear-Cryptanalysis.md) help but are not required.

    **Levels:** §7.1 and §7.10 are for beginners; §7.2, §7.3, §7.4 and §7.6 are
    intermediate; §7.5, §7.7, §7.8, §7.9 and §7.11 are expert.

## 7.1 The problem

*Level: beginner.*

By the middle of the 1990s, cipher designers had learned their two great
lessons. Eli Biham and Adi Shamir's differential cryptanalysis (1990) and
Mitsuru Matsui's linear cryptanalysis (1993) had shown how to break ciphers
whose S-boxes leaked statistics, and the answer was to design against them on
purpose. Joan Daemen and Vincent Rijmen, two young Belgian cryptographers,
went further than anyone: their **wide trail strategy** made it possible to
*prove* that no differential characteristic or linear trail through enough
rounds of their ciphers was useful. Their 1997 cipher **Square**, designed with
Lars Knudsen, came with those proofs, and so did its successor Rijndael, which
became AES in 2001 (FIPS 197).

A proof against two attacks is not a proof against all attacks. In the very
paper that introduced Square, the designers broke six of its eight rounds
themselves, with an attack that used neither differences nor linear
approximations. They chose 256 plaintexts that differed in one byte, took
**all** values in that byte, and watched what the *set* did. Three rounds later
the set still had a property a random set would not have, and that was enough.
The attack is named after the cipher: the **Square attack**. Its general form,
**integral cryptanalysis**, is the first subject of this chapter.

The Square attack is one of a family. Each member looks at the cipher from an
angle that differential and linear cryptanalysis miss:

- **Sets of texts.** Integral attacks follow the sum of a whole set of values,
  not the difference of a pair.
- **Algebra.** Every cipher is a function, and every function on a finite field
  is a polynomial. If the polynomial is small, the attacker can recover it from a
  few known plaintexts (**interpolation**, Thomas Jakobsen and Lars Knudsen,
  1997), or write the cipher as equations and try to solve them (**algebraic
  attacks**, with **SAT solvers** as the general-purpose engine).
- **Self-similarity.** If every round is the same, two encryptions can be
  offset by one round and compared, and the number of rounds stops mattering
  (**slide attacks**, Alex Biryukov and David Wagner, 1999).
- **The key schedule.** An attacker who can get encryptions under keys with a
  known relation can sometimes cancel the differences that would otherwise
  spread (**related-key attacks**, Biham, 1993). A slow key schedule also lets
  the attacker split the key space and meet in the middle (**bicliques**,
  Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger, 2011).

These attacks share a second trait: they are where the headlines about AES come
from. In 2002 an algebraic method called XSL was said, in the press and on some
mailing lists, to threaten AES; it did not work. In 2009 the related-key attacks
on AES-256 produced the line "AES is broken" in technical blogs; in a precise
sense it was, and in the sense anyone cares about it was not. In 2011 the
biclique attack recovered a full AES-128 key "faster than brute force", by a
factor of about four. A reader of this chapter should be able to tell, for any
such claim, what was attacked, in which model, at what cost, and what follows.
Figure 7.1 lays the story out in time.

<figure class="mars-fig">
<svg viewBox="0 0 640 342" width="640" role="img" aria-label="Timeline of structural attacks from Biham's related-key attacks in 1993 to the division property in 2015" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="336" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="31" text-anchor="end" font-weight="bold">1993</text>
<circle cx="92" cy="26" r="3.5"/>
<text x="108" y="31" text-anchor="start">Biham: related-key attacks</text>
<text x="78" y="57" text-anchor="end" font-weight="bold">1997</text>
<circle cx="92" cy="52" r="4.5"/>
<text x="108" y="57" text-anchor="start">Square attack; interpolation attack</text>
<text x="78" y="83" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="78" r="4.5"/>
<text x="108" y="83" text-anchor="start">Biryukov and Wagner: slide attacks</text>
<text x="78" y="109" text-anchor="end" font-weight="bold">2000</text>
<circle cx="92" cy="104" r="4.5"/>
<text x="108" y="109" text-anchor="start">XL; Square attack reaches 6 rounds of Rijndael</text>
<text x="78" y="135" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="130" r="3.5"/>
<text x="108" y="135" text-anchor="start">AES published as FIPS 197</text>
<text x="78" y="161" text-anchor="end" font-weight="bold">2002</text>
<circle cx="92" cy="156" r="4.5"/>
<text x="108" y="161" text-anchor="start">XSL claim; BES; integral cryptanalysis named</text>
<text x="78" y="187" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="182" r="3.5"/>
<text x="108" y="187" text-anchor="start">Cid and Leurent: XSL does not work as claimed</text>
<text x="78" y="213" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="208" r="4.5"/>
<text x="108" y="213" text-anchor="start">Demirci-Selçuk; KeeLoq slid and broken</text>
<text x="78" y="239" text-anchor="end" font-weight="bold">2009</text>
<circle cx="92" cy="234" r="4.5"/>
<text x="108" y="239" text-anchor="start">Related-key attacks on full AES-192 and AES-256</text>
<text x="78" y="265" text-anchor="end" font-weight="bold">2011</text>
<circle cx="92" cy="260" r="4.5"/>
<text x="108" y="265" text-anchor="start">Biclique attack: full AES-128 in 2¹²⁶·¹</text>
<text x="78" y="291" text-anchor="end" font-weight="bold">2013</text>
<circle cx="92" cy="286" r="4.5"/>
<text x="108" y="291" text-anchor="start">Derbez, Fouque, Jean: 7-round AES-128 near 2⁹⁹</text>
<text x="78" y="317" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="312" r="3.5"/>
<text x="108" y="317" text-anchor="start">Todo's division property</text>
</svg>
<figcaption>Figure 7.1. Structural attacks and AES. The larger dots are attacks; the small ones are events around them. Every attack on the full cipher came after it was standardized, and none came close to practical.</figcaption>
</figure>

The attacks here are also harder to state as one recipe than differential and
linear cryptanalysis. Those two are statistical and general: a table, a
characteristic, a count. The attacks in this chapter are structural. Each one
exploits a specific property (byte-oriented rounds, a low algebraic degree,
identical rounds, a key schedule that mixes slowly), and each one teaches
designers to avoid that property. The Square attack set the number of rounds of
AES; interpolation is the reason ciphers built from a single power map need many
rounds; the slide attack is why every round of a modern cipher gets its own round
constant; the related-key attacks are why newer key schedules are designed as
carefully as rounds.

We start where AES itself started: with a set of 256 plaintexts.

## 7.2 Sets instead of pairs: the integral property of AES

*Level: intermediate.*

Recall the shape of AES from [book 1, §7.2](../../book/07-AES.md): a 16-byte
state written as a 4-by-4 grid, filled column by column; each round applies
**SubBytes** (the S-box on every byte), **ShiftRows** (row $r$ rotates left by
$r$ places), **MixColumns** (each column multiplied by a fixed matrix over
$\mathrm{GF}(2^8)$) and **AddRoundKey**. There is a key addition before the
first round, and the last round has no MixColumns. AES-128 has 10 rounds. We
will attack versions cut to 4, 5 and 6 rounds.

### The four kinds of byte

Take a set of 256 states. For one byte position, look at the 256 values it takes
across the set. Daemen, Knudsen and Rijmen marked each position with a letter;
we use the four that matter:

- **C (constant):** the byte has the same value in all 256 states.
- **A (all):** the byte takes each of the 256 possible values exactly once.
- **B (balanced):** the XOR of the 256 values is zero. Every A byte is balanced,
  since $\bigoplus_{v=0}^{255} v = 0$ (each bit position is 1 in exactly 128 of
  the values, an even number). Every C byte is balanced too, since a value XORed
  with itself an even number of times is zero.
- **? (unknown):** none of the above can be said.

The attack starts with a set whose byte 0 is **A** and whose other fifteen bytes
are **C**: 256 chosen plaintexts that agree everywhere except in the first byte,
which runs through all values. Such a set is called a **$\Lambda$-set** (lambda
set) in the Square paper, and a **$\delta$-set** in later work.

### Following the letters, round by round

Work through each step and ask what it does to each kind of byte.

- **AddRoundKey** XORs the same key byte into all 256 states. A constant stays
  constant. An all-values byte stays all-values, since $v \mapsto v \oplus k$ is a
  permutation of the 256 byte values. A balanced byte stays balanced, because the
  key byte is XORed in 256 times, an even number, and cancels.
- **SubBytes** is a permutation of byte values, applied to each byte. C stays C,
  A stays A. **B does not survive**: the S-box is not linear, so the XOR of
  $S(x_i)$ has nothing to do with the XOR of the $x_i$.
- **ShiftRows** moves bytes without changing them. The letters move with them.
- **MixColumns** replaces each byte of a column with a combination
  $2a \oplus 3b \oplus c \oplus d$ of the column's four bytes (with the
  coefficients rotated for each row). This is where letters change.

Now run the $\Lambda$-set through three rounds. The worked argument is short
enough to do completely.

<div class="mars-steps" markdown>

1. **Round 1.** SubBytes and ShiftRows keep byte 0 as A (byte 0 is in row 0,
   which ShiftRows does not move) and the rest as C. MixColumns on column 0
   computes each output byte as $c \cdot a \oplus (\text{constants})$, where $a$ is
   the active byte and $c \in \{1, 2, 3\}$ is nonzero. Multiplying by a nonzero
   field element is a permutation, so all four bytes of column 0 become **A**.
   The other three columns stay C.
2. **Round 2.** ShiftRows sends the four A bytes of column 0 to four different
   columns (row $r$ moves left by $r$). Now **every column holds exactly one A
   byte and three C bytes**, and MixColumns turns each column into four A bytes,
   for the same reason as before. After round 2, **all sixteen bytes are A**.
3. **Round 3.** SubBytes and ShiftRows keep them A. MixColumns now combines four
   A bytes: output byte $y = 2a \oplus 3b \oplus c \oplus d$. The four inputs
   are no longer independent of each other, so $y$ need not take all values. But
   sum $y$ over the set:
   $$\bigoplus_{\text{set}} y = 2 \cdot \bigoplus a \oplus 3 \cdot \bigoplus b
   \oplus \bigoplus c \oplus \bigoplus d = 2 \cdot 0 \oplus 3 \cdot 0 \oplus 0
   \oplus 0 = 0,$$
   because multiplication by a constant distributes over XOR. After round 3
   **all sixteen bytes are B**. AddRoundKey keeps them B.
4. **Round 4.** SubBytes destroys the property, and nothing useful is left.

</div>

This is the **three-round integral distinguisher**: for every key, the XOR of
the 256 states after three rounds is zero in every byte. For a random
permutation, each byte's XOR would be zero with probability $2^{-8}$, so all
sixteen at once with probability $2^{-128}$. Figure 7.2 draws the four stages.

<figure class="mars-fig">
<svg viewBox="0 0 640 182" width="640" role="img" aria-label="Four-by-four byte grids showing one active byte spreading to a column, then the whole state, then becoming balanced, then lost" fill="currentColor" font-size="14">
<rect x="18" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="18" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="29" y="36" text-anchor="middle" font-size="13">A</text>
<rect x="42" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="36" text-anchor="middle" font-size="13">C</text>
<rect x="66" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="77" y="36" text-anchor="middle" font-size="13">C</text>
<rect x="90" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="101" y="36" text-anchor="middle" font-size="13">C</text>
<rect x="18" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="29" y="60" text-anchor="middle" font-size="13">C</text>
<rect x="42" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="60" text-anchor="middle" font-size="13">C</text>
<rect x="66" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="77" y="60" text-anchor="middle" font-size="13">C</text>
<rect x="90" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="101" y="60" text-anchor="middle" font-size="13">C</text>
<rect x="18" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="29" y="84" text-anchor="middle" font-size="13">C</text>
<rect x="42" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="84" text-anchor="middle" font-size="13">C</text>
<rect x="66" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="77" y="84" text-anchor="middle" font-size="13">C</text>
<rect x="90" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="101" y="84" text-anchor="middle" font-size="13">C</text>
<rect x="18" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="29" y="108" text-anchor="middle" font-size="13">C</text>
<rect x="42" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="108" text-anchor="middle" font-size="13">C</text>
<rect x="66" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="77" y="108" text-anchor="middle" font-size="13">C</text>
<rect x="90" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="101" y="108" text-anchor="middle" font-size="13">C</text>
<text x="65" y="140" text-anchor="middle" font-size="13">plaintexts</text>
<line x1="118" y1="68" x2="138" y2="68" stroke="currentColor" stroke-width="1.2"/>
<path d="M138 68 l-7 -4 v8 z"/>
<rect x="144" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="144" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="155" y="36" text-anchor="middle" font-size="13">A</text>
<rect x="168" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="179" y="36" text-anchor="middle" font-size="13">C</text>
<rect x="192" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="203" y="36" text-anchor="middle" font-size="13">C</text>
<rect x="216" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="227" y="36" text-anchor="middle" font-size="13">C</text>
<rect x="144" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="144" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="155" y="60" text-anchor="middle" font-size="13">A</text>
<rect x="168" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="179" y="60" text-anchor="middle" font-size="13">C</text>
<rect x="192" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="203" y="60" text-anchor="middle" font-size="13">C</text>
<rect x="216" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="227" y="60" text-anchor="middle" font-size="13">C</text>
<rect x="144" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="144" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="155" y="84" text-anchor="middle" font-size="13">A</text>
<rect x="168" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="179" y="84" text-anchor="middle" font-size="13">C</text>
<rect x="192" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="203" y="84" text-anchor="middle" font-size="13">C</text>
<rect x="216" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="227" y="84" text-anchor="middle" font-size="13">C</text>
<rect x="144" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="144" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="155" y="108" text-anchor="middle" font-size="13">A</text>
<rect x="168" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="179" y="108" text-anchor="middle" font-size="13">C</text>
<rect x="192" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="203" y="108" text-anchor="middle" font-size="13">C</text>
<rect x="216" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="227" y="108" text-anchor="middle" font-size="13">C</text>
<text x="191" y="140" text-anchor="middle" font-size="13">after round 1</text>
<line x1="244" y1="68" x2="264" y2="68" stroke="currentColor" stroke-width="1.2"/>
<path d="M264 68 l-7 -4 v8 z"/>
<rect x="270" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="270" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="281" y="36" text-anchor="middle" font-size="13">A</text>
<rect x="294" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="294" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="305" y="36" text-anchor="middle" font-size="13">A</text>
<rect x="318" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="318" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="329" y="36" text-anchor="middle" font-size="13">A</text>
<rect x="342" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="342" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="353" y="36" text-anchor="middle" font-size="13">A</text>
<rect x="270" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="270" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="281" y="60" text-anchor="middle" font-size="13">A</text>
<rect x="294" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="294" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="305" y="60" text-anchor="middle" font-size="13">A</text>
<rect x="318" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="318" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="329" y="60" text-anchor="middle" font-size="13">A</text>
<rect x="342" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="342" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="353" y="60" text-anchor="middle" font-size="13">A</text>
<rect x="270" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="270" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="281" y="84" text-anchor="middle" font-size="13">A</text>
<rect x="294" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="294" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="305" y="84" text-anchor="middle" font-size="13">A</text>
<rect x="318" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="318" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="329" y="84" text-anchor="middle" font-size="13">A</text>
<rect x="342" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="342" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="353" y="84" text-anchor="middle" font-size="13">A</text>
<rect x="270" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="270" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="281" y="108" text-anchor="middle" font-size="13">A</text>
<rect x="294" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="294" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="305" y="108" text-anchor="middle" font-size="13">A</text>
<rect x="318" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="318" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="329" y="108" text-anchor="middle" font-size="13">A</text>
<rect x="342" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="342" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="353" y="108" text-anchor="middle" font-size="13">A</text>
<text x="317" y="140" text-anchor="middle" font-size="13">after round 2</text>
<line x1="370" y1="68" x2="390" y2="68" stroke="currentColor" stroke-width="1.2"/>
<path d="M390 68 l-7 -4 v8 z"/>
<rect x="396" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="396" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="407" y="36" text-anchor="middle" font-size="13">B</text>
<rect x="420" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="420" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="431" y="36" text-anchor="middle" font-size="13">B</text>
<rect x="444" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="444" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="455" y="36" text-anchor="middle" font-size="13">B</text>
<rect x="468" y="20" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="468" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="479" y="36" text-anchor="middle" font-size="13">B</text>
<rect x="396" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="396" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="407" y="60" text-anchor="middle" font-size="13">B</text>
<rect x="420" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="420" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="431" y="60" text-anchor="middle" font-size="13">B</text>
<rect x="444" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="444" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="455" y="60" text-anchor="middle" font-size="13">B</text>
<rect x="468" y="44" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="468" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="479" y="60" text-anchor="middle" font-size="13">B</text>
<rect x="396" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="396" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="407" y="84" text-anchor="middle" font-size="13">B</text>
<rect x="420" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="420" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="431" y="84" text-anchor="middle" font-size="13">B</text>
<rect x="444" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="444" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="455" y="84" text-anchor="middle" font-size="13">B</text>
<rect x="468" y="68" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="468" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="479" y="84" text-anchor="middle" font-size="13">B</text>
<rect x="396" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="396" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="407" y="108" text-anchor="middle" font-size="13">B</text>
<rect x="420" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="420" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="431" y="108" text-anchor="middle" font-size="13">B</text>
<rect x="444" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="444" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="455" y="108" text-anchor="middle" font-size="13">B</text>
<rect x="468" y="92" width="22" height="22" rx="4" opacity="0.15"/>
<rect x="468" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="479" y="108" text-anchor="middle" font-size="13">B</text>
<text x="443" y="140" text-anchor="middle" font-size="13">after round 3</text>
<line x1="496" y1="68" x2="516" y2="68" stroke="currentColor" stroke-width="1.2"/>
<path d="M516 68 l-7 -4 v8 z"/>
<rect x="522" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="533" y="36" text-anchor="middle" font-size="13">?</text>
<rect x="546" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="557" y="36" text-anchor="middle" font-size="13">?</text>
<rect x="570" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="36" text-anchor="middle" font-size="13">?</text>
<rect x="594" y="20" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="605" y="36" text-anchor="middle" font-size="13">?</text>
<rect x="522" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="533" y="60" text-anchor="middle" font-size="13">?</text>
<rect x="546" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="557" y="60" text-anchor="middle" font-size="13">?</text>
<rect x="570" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="60" text-anchor="middle" font-size="13">?</text>
<rect x="594" y="44" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="605" y="60" text-anchor="middle" font-size="13">?</text>
<rect x="522" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="533" y="84" text-anchor="middle" font-size="13">?</text>
<rect x="546" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="557" y="84" text-anchor="middle" font-size="13">?</text>
<rect x="570" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="84" text-anchor="middle" font-size="13">?</text>
<rect x="594" y="68" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="605" y="84" text-anchor="middle" font-size="13">?</text>
<rect x="522" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="533" y="108" text-anchor="middle" font-size="13">?</text>
<rect x="546" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="557" y="108" text-anchor="middle" font-size="13">?</text>
<rect x="570" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="108" text-anchor="middle" font-size="13">?</text>
<rect x="594" y="92" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="605" y="108" text-anchor="middle" font-size="13">?</text>
<text x="569" y="140" text-anchor="middle" font-size="13">after round 4</text>
<text x="320" y="170" text-anchor="middle" font-size="13">A: all 256 values · C: constant · B: XOR over the set is 0 · ?: nothing known</text>
</svg>
<figcaption>Figure 7.2. The integral property of AES, as the code in §7.2 prints it. One active byte becomes a column, then the whole state, then sixteen balanced bytes. The fourth round's S-boxes destroy the balance, and that round is where the key is attacked.</figcaption>
</figure>

Notice how little the argument used. It used that the S-box is a permutation,
that MixColumns is linear with nonzero coefficients, that ShiftRows spreads a
column across all four columns, and that keys are added by XOR. It never used
the S-box's table, its differential uniformity or its nonlinearity, the very
properties the wide trail strategy optimizes. That is why the attack slips past
the proofs: a cipher can be perfectly resistant to differential and linear
cryptanalysis and still be integral-weak.

### Code it: an AES you can cut

We need an AES whose number of rounds we choose. The code below builds the
S-box from its definition (inverse in $\mathrm{GF}(2^8)$, then the affine map),
the three other round steps, the AES-128 key schedule, and an encryption with any
number of rounds. Book 1's [§7.8](../../book/07-AES.md) explains each piece;
here they are in compact form. The last line checks the full 10 rounds against
the example in FIPS 197, Appendix C.1.

```python
# A small AES: the four round steps, the key schedule, and encryption cut to any number of rounds.
def xtime(a):                       # multiply by x in GF(2^8)
    a <<= 1
    return a ^ 0x11b if a & 0x100 else a

def mul(a, b):
    p = 0
    while b:
        if b & 1:
            p ^= a
        a, b = xtime(a), b >> 1
    return p

def make_sbox():
    inv = [0] * 256
    for a in range(1, 256):
        inv[a] = next(b for b in range(1, 256) if mul(a, b) == 1)
    box = []
    for a in range(256):
        b, s = inv[a], 0x63
        for i in range(5):          # the affine map: b xor its four left rotations, xor 63
            s ^= ((b << i) | (b >> (8 - i))) & 0xff
        box.append(s)
    return box

SBOX = make_sbox()
INV = [SBOX.index(v) for v in range(256)]

def shift_rows(s):                  # state is 16 bytes, column by column
    return [s[(i + 4 * (i % 4)) % 16] for i in range(16)]

def mix_columns(s):
    out = []
    for c in range(4):
        a = s[4 * c:4 * c + 4]
        for r in range(4):
            out.append(mul(a[r], 2) ^ mul(a[(r + 1) % 4], 3) ^ a[(r + 2) % 4] ^ a[(r + 3) % 4])
    return out

def expand(key, rounds=10):         # AES-128 key schedule: rounds + 1 round keys
    w = [list(key[i:i + 4]) for i in range(0, 16, 4)]
    rcon = 1
    while len(w) < 4 * (rounds + 1):
        t = w[-1]
        if len(w) % 4 == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]
            t[0] ^= rcon
            rcon = xtime(rcon)
        w.append([a ^ b for a, b in zip(w[-4], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(rounds + 1)]

def encrypt(block, ks, rounds):     # the last round has no MixColumns, as in AES
    s = [a ^ b for a, b in zip(block, ks[0])]
    for r in range(1, rounds + 1):
        s = shift_rows([SBOX[b] for b in s])
        if r < rounds:
            s = mix_columns(s)
        s = [a ^ b for a, b in zip(s, ks[r])]
    return bytes(s)

key = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
pt = bytes.fromhex("00112233445566778899aabbccddeeff")
print(encrypt(pt, expand(key), 10).hex())
```

It prints `69c4e0d86a7b0430d8cdb78070b4c55a`, the ciphertext in the standard, so
the pieces are right. The next blocks in this section and the next use these
functions (run them in order, in one file or one session).

Now check the letters. The block below takes one $\Lambda$-set, runs it through
full rounds (with MixColumns, as the argument assumed), and labels each byte
position after each round. It prints the grid row by row, with `|` between rows.

```python
import random

def rounds_on_set(texts, ks, upto):     # full rounds (with MixColumns), to watch the set
    out = []
    for p in texts:
        s = [a ^ b for a, b in zip(p, ks[0])]
        for r in range(1, upto + 1):
            s = mix_columns(shift_rows([SBOX[b] for b in s]))
            s = [a ^ b for a, b in zip(s, ks[r])]
        out.append(s)
    return out

def pattern(states):                    # A: all 256 values, C: constant, B: XOR is zero, ?: none
    marks = []
    for i in range(16):
        col = [s[i] for s in states]
        x = 0
        for v in col:
            x ^= v
        n = len(set(col))
        marks.append("A" if n == 256 else "C" if n == 1 else "B" if x == 0 else "?")
    return marks

random.seed(7)
ks = expand(bytes(random.randrange(256) for _ in range(16)))
rest = [random.randrange(256) for _ in range(15)]
texts = [[v] + rest for v in range(256)]    # byte 0 takes every value, the rest fixed

for r in range(5):
    m = pattern(rounds_on_set(texts, ks, r))
    rows = [" ".join(m[4 * c + row] for c in range(4)) for row in range(4)]
    print("after round", r, " | ".join(rows))
```

```
after round 0 A C C C | C C C C | C C C C | C C C C
after round 1 A C C C | A C C C | A C C C | A C C C
after round 2 A A A A | A A A A | A A A A | A A A A
after round 3 B B B B | B B B B | B B B B | B B B B
after round 4 ? ? ? ? | ? ? ? ? | ? ? ? ? | ? ? ? ?
```

Exactly the picture of Figure 7.2, for a random key. Try other seeds: the rows
for rounds 0 to 3 never change, while the row for round 4 stays all question
marks.

### Why this is a weakness

A distinguisher is not yet an attack, but in a block cipher it almost always
becomes one. If three rounds have a property that holds for every key, the
attacker can add rounds around them, guess the key bytes those extra rounds
need, and use the property as a test: a right guess makes the property appear,
a wrong guess makes it appear only by chance. That is the same plan as the
last-round attacks of [Chapter 5](05-Differential-Cryptanalysis.md) and
[Chapter 6](06-Linear-Cryptanalysis.md), with a set in place of a pair or an
equation. The next section carries it out.

## 7.3 The Square attack on 4-round AES, and beyond

*Level: intermediate.*

### The key recovery, by hand

Encrypt a $\Lambda$-set with 4-round AES. The fourth round is a last round, with
no MixColumns:
$$C = \mathrm{SR}(\mathrm{SB}(X_3)) \oplus K_4,$$
where $X_3$ is the state after round 3, all of whose bytes are balanced. Because
ShiftRows only moves bytes, ciphertext byte $j$ depends on exactly **one** byte of
$X_3$, at position $\pi(j)$, and on exactly one key byte $K_4[j]$:
$$X_3[\pi(j)] = S^{-1}\big(C[j] \oplus K_4[j]\big).$$
So for each ciphertext byte position $j$ and each guess $g$ of $K_4[j]$, compute
$$\sigma_j(g) = \bigoplus_{\text{256 ciphertexts}} S^{-1}\big(C[j] \oplus g\big).$$
For the right guess, $\sigma_j(g) = 0$ always. For a wrong guess, the values
$S^{-1}(C[j] \oplus g)$ behave like random bytes, and their XOR is zero with
probability about $1/256$. One $\Lambda$-set leaves the right byte plus about one
wrong one; a second set, with different constants in the other fifteen bytes,
leaves about $255/256^2 \approx 0.004$ wrong ones. A third set makes a wrong
survivor among the 16 positions very unlikely.

Count the cost. Data: 3 sets of 256, so **768 chosen plaintexts**. Time: 16 byte
positions, 256 guesses each, 256 S-box lookups per guess and set: about
$16 \times 2^8 \times 2^8 \times 3 \approx 2^{21.6}$ lookups, the cost of some
tens of thousands of 4-round encryptions. Compare brute force on the 128-bit key: $2^{127}$
encryptions on average. Four rounds of AES are completely broken.

The recovered bytes form the **round key** $K_4$, not the cipher key. For
AES-128 that is enough: the key schedule is invertible, and any round key
determines all the others ([book 1, §7.6](../../book/07-AES.md)). For AES-192
and AES-256 one round key is only part of the key, and the attacker recovers the
rest by attacking one more round or by a small search.

### Code it: the attack

The block below picks a secret key, encrypts three $\Lambda$-sets with 4-round
AES, and recovers $K_4$ byte by byte. For the first four bytes it also prints how
many guesses survive each set, so you can watch the filter work.

```python
random.seed(2026)
secret = bytes(random.randrange(256) for _ in range(16))
ks4 = expand(secret, 4)

def chosen_set():                       # 256 chosen plaintexts, ciphertexts after 4 rounds
    rest = [random.randrange(256) for _ in range(15)]
    return [encrypt([v] + rest, ks4, 4) for v in range(256)]

def xor_sum(cts, j, g):                 # undo AddRoundKey and SubBytes on byte j with guess g
    x = 0
    for c in cts:
        x ^= INV[c[j] ^ g]
    return x

sets = [chosen_set() for _ in range(3)]
k4 = []
for j in range(16):
    alive = list(range(256))
    trail = [len(alive)]
    for cts in sets:
        alive = [g for g in alive if xor_sum(cts, j, g) == 0]
        trail.append(len(alive))
    k4.append(alive[0])
    if j < 4:
        print("byte", j, "survivors:", trail)
print("round-4 key found:", bytes(k4).hex())
print("round-4 key true: ", bytes(ks4[4]).hex())
```

```
byte 0 survivors: [256, 1, 1, 1]
byte 1 survivors: [256, 3, 1, 1]
byte 2 survivors: [256, 2, 1, 1]
byte 3 survivors: [256, 1, 1, 1]
round-4 key found: 38e5b531ff6d38413890aca8a8e4c69b
round-4 key true:  38e5b531ff6d38413890aca8a8e4c69b
```

One set left 1, 3 and 2 candidates for the first three bytes: the right one plus
chance survivors, just as the estimate said. The second set removed every wrong
guess. Now run the key schedule backwards. Each word of a round key is the XOR of
the word before it and the word four places back, except the first word of each
round key, which also goes through RotWord, SubWord and the round constant. All
of that can be undone from the end:

```python
def key_back(rk, r):                    # from round key r of AES-128 back to the cipher key
    w = [list(rk[i:i + 4]) for i in range(0, 16, 4)]
    rcons = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54]
    for rnd in range(r, 0, -1):
        prev = [None] * 4
        for i in (3, 2, 1):             # w[i] = prev[i] xor w[i-1], so prev[i] = w[i] xor w[i-1]
            prev[i] = [a ^ b for a, b in zip(w[i], w[i - 1])]
        t = [SBOX[b] for b in prev[3][1:] + prev[3][:1]]
        t[0] ^= rcons[rnd - 1]
        prev[0] = [a ^ b for a, b in zip(w[0], t)]
        w = prev
    return bytes(sum(w, []))

found = key_back(k4, 4)
print("cipher key:", found.hex(), found == secret)
```

```
cipher key: 3ca33472d7fbe17a0129389332e605fb True
```

The whole attack, including building the S-box, runs in about a tenth of a
second. Book 1's [§7.9](../../book/07-AES.md) runs the same attack as a short
"Break it"; here we have also watched the set and the filter.

### Five rounds: guess five bytes at the end

Add a fifth round. Now round 4 is a full round with MixColumns, and round 5 is
the last. To reach a byte of $X_3$ from the ciphertext, the attacker must undo:
round 5's AddRoundKey, ShiftRows and SubBytes; then round 4's AddRoundKey and
MixColumns; then round 4's ShiftRows and SubBytes. One byte of $X_3$ lands, after
round 4's SubBytes and ShiftRows, in one column; MixColumns mixes that column
with three other bytes; round 5 then spreads those four bytes to four ciphertext
positions on a diagonal. So computing one byte of $X_3$ needs **four bytes of
$K_5$** and **one byte of $K_4$**: 40 bits of key guess.

There is a small trick for the $K_4$ byte. MixColumns is linear, so
$$\mathrm{MC}^{-1}(Y \oplus K_4) = \mathrm{MC}^{-1}(Y) \oplus \mathrm{MC}^{-1}(K_4).$$
The attacker applies $\mathrm{MC}^{-1}$ to the partially decrypted column and
guesses one byte of the **equivalent key** $\mathrm{MC}^{-1}(K_4)$ instead of
four bytes of $K_4$. That is why the guess is 4 + 1 bytes and not 4 + 4.

Each set of 256 texts filters the $2^{40}$ guesses by a factor of 256, so about
six sets ($6 \times 2^8 \approx 2^{10.6}$ chosen plaintexts) leave the right
guess alone. The naive work is $2^{40}$ guesses times $2^8$ texts per set, about
$2^{48}$ partial decryptions per diagonal of the key, and it repeats for each of
the four diagonals. Expensive for a laptop in Python, cheap for a cluster: five
rounds of AES are broken in practice.

### Six rounds: one round at the front for free

The designers extended the attack to six rounds by also guessing four bytes of
the first round key. In 2000 Niels Ferguson, John Kelsey, Stefan Lucks, Bruce
Schneier, Mike Stay, David Wagner and Doug Whiting found two improvements that
made the six-round attack far cheaper.

The first is a **free round at the front.** Choose $2^{32}$ plaintexts in which
the four bytes of one diagonal (positions 0, 5, 10, 15) take all $2^{32}$
values and the other twelve bytes are constant. After round 1's SubBytes and
ShiftRows, that diagonal lands in column 0; MixColumns is a permutation of a
column, so after round 1 column 0 takes all $2^{32}$ values and the rest is
constant. Split those $2^{32}$ states by the values of bytes 1, 2 and 3 of the
column: each part is a $\Lambda$-set, $2^{24}$ of them. Each is balanced after
three more rounds, so the whole structure is balanced after **round 4**, and
the attacker never needs to know the first round key. The last two rounds are
then attacked exactly as in the five-round attack.

The second is **partial sums**. Instead of recomputing the 40-bit guess's effect
on $2^{32}$ ciphertexts each time, the attacker guesses the five key bytes one
at a time and, after each guess, replaces the list of texts by a table of how
often each partial value occurs, keeping only the parity. Each step shrinks the
work, and the six-round attack drops to about $2^{44}$ simple operations with
$6 \cdot 2^{32}$ chosen plaintexts, as Ferguson and his colleagues reported.

The same paper added a seventh round to the end for AES-192 and AES-256, whose
longer keys pay for the extra guessing, and showed a seven-round attack on
AES-128 that needs nearly the whole codebook ($2^{128} - 2^{119}$ chosen
plaintexts): an attack in the formal sense only. Figure 7.3 shows how the guessed
key bytes grow as rounds are added.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Three rows of round boxes: 4, 5 and 6 rounds, with the three balanced rounds shaded and the guessed rounds marked" fill="currentColor" font-size="14">
<text x="10" y="42" text-anchor="start" font-weight="bold">4 rounds</text>
<rect x="90" y="18" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="90" y="18" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="115" y="40" text-anchor="middle" font-size="13">R1</text>
<rect x="148" y="18" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="148" y="18" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="173" y="40" text-anchor="middle" font-size="13">R2</text>
<rect x="206" y="18" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="206" y="18" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="231" y="40" text-anchor="middle" font-size="13">R3</text>
<rect x="264" y="18" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="289" y="40" text-anchor="middle" font-size="13">R4</text>
<text x="289" y="68" text-anchor="middle" font-size="12">guess</text>
<text x="328" y="40" text-anchor="start" font-size="13">1 byte of K4 · 768 texts</text>
<text x="10" y="104" text-anchor="start" font-weight="bold">5 rounds</text>
<rect x="90" y="80" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="90" y="80" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="115" y="102" text-anchor="middle" font-size="13">R1</text>
<rect x="148" y="80" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="148" y="80" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="173" y="102" text-anchor="middle" font-size="13">R2</text>
<rect x="206" y="80" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="206" y="80" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="231" y="102" text-anchor="middle" font-size="13">R3</text>
<rect x="264" y="80" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="289" y="102" text-anchor="middle" font-size="13">R4</text>
<text x="289" y="130" text-anchor="middle" font-size="12">guess</text>
<rect x="322" y="80" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="347" y="102" text-anchor="middle" font-size="13">R5</text>
<text x="347" y="130" text-anchor="middle" font-size="12">guess</text>
<text x="386" y="102" text-anchor="start" font-size="13">1 + 4 bytes · about 2¹¹ texts</text>
<text x="10" y="166" text-anchor="start" font-weight="bold">6 rounds</text>
<rect x="90" y="142" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="115" y="164" text-anchor="middle" font-size="13">R1</text>
<text x="115" y="192" text-anchor="middle" font-size="12">free</text>
<rect x="148" y="142" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="148" y="142" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="173" y="164" text-anchor="middle" font-size="13">R2</text>
<rect x="206" y="142" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="206" y="142" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="231" y="164" text-anchor="middle" font-size="13">R3</text>
<rect x="264" y="142" width="50" height="34" rx="4" opacity="0.15"/>
<rect x="264" y="142" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="289" y="164" text-anchor="middle" font-size="13">R4</text>
<rect x="322" y="142" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="347" y="164" text-anchor="middle" font-size="13">R5</text>
<text x="347" y="192" text-anchor="middle" font-size="12">guess</text>
<rect x="380" y="142" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="405" y="164" text-anchor="middle" font-size="13">R6</text>
<text x="405" y="192" text-anchor="middle" font-size="12">guess</text>
<text x="444" y="164" text-anchor="start" font-size="13">1 + 4 bytes · 6·2³² texts</text>
<rect x="90" y="206" width="24" height="14" rx="3" opacity="0.15"/>
<text x="122" y="218" text-anchor="start" font-size="13">the rounds the balanced property crosses</text>
</svg>
<figcaption>Figure 7.3. How the Square attack grows. Shaded rounds are covered by the integral property; rounds marked "guess" are undone by guessing key bytes; in the six-round attack a structure of 2³² plaintexts covers round 1 for free.</figcaption>
</figure>

### Why AES has ten rounds

When Daemen and Rijmen submitted Rijndael in 1998, the best attack they knew on
their own design was this one, reaching six rounds. They added four rounds of
margin to get ten for 128-bit keys, and one more round for each additional 32
bits of key, because a longer key lets the attacker guess more key bytes at the
edges (12 rounds for AES-192, 14 for AES-256). The integral attack, more than
any other, set the round counts of the cipher in FIPS 197.

!!! note "Life story: the Square (integral) attack"
    **Born:** 1997, Joan Daemen, Lars Knudsen and Vincent Rijmen, in the paper
    introducing the cipher Square, as an attack on 6 of its 8 rounds; extended
    by Ferguson and colleagues in 2000 (partial sums); generalized as
    **integral cryptanalysis** by Lars Knudsen and David Wagner in 2002, with
    Stefan Lucks's **saturation attack** (2001) and Alex Biryukov and Adi
    Shamir's **multiset** attacks (2001) as close relatives · **Purpose:** follow
    the sum of a set of texts, not the difference of a pair · **Helped:** fix the
    round counts of AES, break reduced versions of many byte-oriented ciphers,
    and grow in 2015 into Yosuke Todo's **division property**, a general tool
    for finding integral properties by computer · **Status:** current; among the
    best attacks on reduced AES a quarter century later

## 7.4 Interpolation: when the cipher is a small polynomial

*Level: intermediate.*

### The idea

Every function from a finite field to itself is a polynomial. If a cipher works
on elements of a field $\mathrm{GF}(q)$, then for a fixed key the encryption
$x \mapsto E_K(x)$ is some polynomial $p(x)$ of degree less than $q$. For a good
cipher that polynomial is huge and dense, with degree close to $q - 1$, and
writing it down means knowing the whole codebook. But if the rounds are simple
algebraic maps, the degree may be small, and a polynomial of degree $d$ is fixed
by any $d + 1$ of its values. That is **Lagrange interpolation**, taught in
school for a straight line through two points and a parabola through three.

Thomas Jakobsen and Lars Knudsen turned this into an attack in 1997. Their
targets were ciphers built to be provably resistant to differential
cryptanalysis by using power maps like $x \mapsto x^3$ in a finite field as
round functions, among them a Feistel cipher of Knudsen and Kaisa Nyberg and a
toy Feistel cipher, with cubing in $\mathrm{GF}(2^{32})$, which they named PURE.
The power map has excellent differential properties, which is why it was
chosen. It also has degree 3, and that was its downfall.

The attack has two forms:

- **Global deduction.** With $d + 1$ known plaintexts, interpolate $p(x)$. Now the
  attacker can encrypt anything, without ever learning the key. (If the
  polynomial for decryption is also small, the attacker can decrypt too.)
- **Key recovery.** Guess the last round key, peel off the last round, and test
  whether the values before it fit a polynomial of the expected lower degree.
  Wrong guesses give values that fit no low-degree polynomial.

### A worked example

Take the prime $p = 65537$ and work modulo $p$. Because $p \equiv 2 \pmod 3$,
the map $x \mapsto x^3$ is a permutation (3 has an inverse modulo $p - 1$, so
cube roots exist and are unique). Build a cipher from four rounds of
$$x \mapsto (x + k_i)^3 \bmod p,$$
followed by a final key addition $+k_5$. Five independent 16-bit keys: 80 bits
of key, so brute force costs about $2^{79}$ trials.

Count the degree. One round gives a polynomial of degree 3, two rounds degree
$3^2 = 9$, four rounds degree $3^4 = 81$. So $82$ known plaintexts determine the
whole cipher.

Better, the coefficients give the keys away. Each round's polynomial is
**monic** (its top coefficient is 1), so the four-round polynomial is
$$E(x) = (x + k_1)^{81} + (\text{terms of degree} \le 78).$$
Why at most 78? The rest of the cipher is a monic polynomial $f$ of degree 27 in
$u = (x + k_1)^3$, and the second-highest power of $u$ it contains is at most
$u^{26}$, of degree 78 in $x$. So the coefficient of $x^{80}$ comes from
$(x + k_1)^{81}$ alone, and by the binomial theorem it is $81 k_1$:
$$k_1 = \frac{\text{coefficient of } x^{80}}{81} \bmod p.$$
Knowing $k_1$, the attacker computes $u = (x + k_1)^3$ for each known plaintext,
and the ciphertexts are now values of a three-round cipher of degree 27 in $u$.
Its coefficient of $u^{26}$ is $27 k_2$. Peel again, and again, until a
polynomial of degree 1 is left, $u + k_5$, whose constant term is the last key.

### Code it

```python
import random

P = 65537                               # a prime with P % 3 == 2, so cubing is a permutation

def toy_encrypt(x, keys):               # r rounds of x -> (x + k)^3, then a final key
    for k in keys[:-1]:
        x = pow(x + k, 3, P)
    return (x + keys[-1]) % P

def interpolate(xs, ys):                # coefficients (lowest first) of the polynomial through the points
    n = len(xs)
    coef = list(ys)                     # Newton's divided differences
    for j in range(1, n):
        for i in range(n - 1, j - 1, -1):
            coef[i] = (coef[i] - coef[i - 1]) * pow(xs[i] - xs[i - j], -1, P) % P
    poly = [0] * n                      # expand the Newton form into ordinary coefficients
    for i in range(n - 1, -1, -1):
        poly = [(a - xs[i] * b) % P for a, b in zip([0] + poly[:-1], poly)]
        poly[0] = (poly[0] + coef[i]) % P
    return poly

def evaluate(poly, x):
    y = 0
    for c in reversed(poly):
        y = (y * x + c) % P
    return y

random.seed(3)
keys = [random.randrange(P) for _ in range(5)]  # 4 rounds, 5 keys: 80 bits of key
xs = random.sample(range(P), 3 ** 4 + 1)        # 82 known plaintexts
ys = [toy_encrypt(x, keys) for x in xs]
poly = interpolate(xs, ys)
print("degree:", max(i for i, c in enumerate(poly) if c))
x = 12345                                       # a plaintext the attacker never saw
print("predicted:", evaluate(poly, x), " real:", toy_encrypt(x, keys))

found = []                                      # peel the rounds off one at a time
for r in range(4, 0, -1):
    d = 3 ** r
    k = poly[d - 1] * pow(d, -1, P) % P         # top terms come from (x + k)^d
    found.append(k)
    xs = [pow(x + k, 3, P) for x in xs]         # the inputs to the next round
    xs, ys = xs[:3 ** (r - 1) + 1], ys[:3 ** (r - 1) + 1]
    poly = interpolate(xs, ys)
found.append(poly[0])                           # what is left is y = x + k_last
print("keys found:", found)
print("keys real: ", keys)
```

```
degree: 81
predicted: 11902  real: 11902
keys found: [31190, 17094, 48490, 62135, 8588]
keys real:  [31190, 17094, 48490, 62135, 8588]
```

Eighty-two known plaintexts and a few hundred thousand multiplications recover
an 80-bit key. (`pow(a, -1, P)`, the modular inverse, needs Python 3.8.)

### How many rounds are enough?

The defense is degree. Each round multiplies the degree by 3, and the degree of
a polynomial modulo $p$ can never exceed $p - 1$. With $p = 65537$, ten rounds
give degree $3^{10} = 59{,}049$, still below $p$, so 59,050 known plaintexts
interpolate it: the attacker needs most of the codebook, but not all. Eleven
rounds give $3^{11} = 177{,}147 > p$, and the polynomial can be as dense as a
random one's. The rule for an $n$-bit field is about
$$r \ge \frac{n}{\log_2 3} \approx 0.63\, n \text{ rounds}$$
just to stop the simplest interpolation, and real designs add a margin for
the cleverer forms (interpolating $E^{-1}$, meeting in the middle with two
polynomials, or using rational functions).

This is not history. Since 2016 a new kind of cipher has appeared, designed to be
cheap inside zero-knowledge proofs and multiparty computation, where
multiplications cost much more than additions. **MiMC** (Martin Albrecht,
Lorenzo Grassi, Christian Rechberger, Arnab Roy and Tyge Tiessen, 2016) is
exactly our toy cipher, $x \mapsto (x + k + c_i)^3$ with a different round
constant $c_i$ each round, over a large field, and it takes its round count from
the rule above: $\lceil n / \log_2 3 \rceil$ rounds, 82 for a 129-bit field. Its
cousins (GMiMC, Jarvis and Friday, Poseidon, Rescue, Griffin, Anemoi) are
attacked with exactly the tools of this section and the next, and some, such as
Jarvis and Friday, fell to Gröbner-basis attacks in 2019 (Albrecht and
colleagues).

### The link to integrals

Interpolation and the Square attack are two faces of one fact. If a function has
degree $d$ over $\mathrm{GF}(2)$ (as a polynomial in the input bits), then
summing it over any set of inputs that forms a vector space of dimension $d + 1$
gives zero. That is the **higher-order differential** (Xuejia Lai, 1994; Knudsen,
1994): a $(d+1)$-th derivative of a degree-$d$ polynomial vanishes. The Square
property is a version of it on bytes, and the **cube attacks** on stream ciphers
of [Chapter 8](08-Attacks-on-Stream-Ciphers.md) are another. Todo's division
property (§7.11) is the modern machine for tracking which sums vanish.

!!! note "Life story: the interpolation attack"
    **Born:** 1997, Thomas Jakobsen and Lars Knudsen (FSE 1997), against
    ciphers built from power maps for provable resistance to differential
    attacks · **Purpose:** recover the polynomial a cipher computes, or test key
    guesses by the degree of what is left · **Helped:** kill the idea that
    resistance to differential and linear attacks is enough; set round counts
    for MiMC and the other "arithmetization-oriented" ciphers of zero-knowledge
    systems · **Status:** current; one of the first checks every algebraic
    cipher design must pass

## 7.5 Algebraic attacks: the cipher as equations

*Level: expert.*

### Shannon's warning

In 1949 Claude Shannon wrote that breaking a good cipher should require "as
much work as solving a system of simultaneous equations in a large number of
unknowns of a complex type". It is a design goal and an attack plan at once.
Write the cipher's operations as equations over $\mathrm{GF}(2)$, with the key
bits and the intermediate state bits as unknowns; put in the known plaintexts
and ciphertexts; solve. Linear parts (XOR with the key, bit permutations,
MixColumns) give linear equations, which are easy. All the difficulty is in the
S-boxes.

How small can the S-box equations be? Every S-box satisfies some quadratic
equations in its input bits $x$ and output bits $y$, simply because there are
more quadratic monomials than inputs. For the AES S-box, which is inversion in
$\mathrm{GF}(2^8)$ followed by an affine map, the relation $x \cdot y = 1$ (for
$x \ne 0$) makes the quadratic equations unusually plentiful. The code below
counts them: it evaluates every monomial of degree at most 2 on every input-output
pair of the S-box and finds how many independent combinations vanish
everywhere.

```python
from itertools import combinations

def gf_mul(a, b):                       # multiplication in AES's field GF(2^8)
    p = 0
    while b:
        if b & 1:
            p ^= a
        a = (a << 1) ^ (0x11b if a & 0x80 else 0)
        b >>= 1
    return p

def rotl(b, i):
    return (b << i | b >> (8 - i)) & 255

inv = [0] + [next(b for b in range(1, 256) if gf_mul(a, b) == 1) for a in range(1, 256)]
AES = [inv[a] ^ rotl(inv[a], 1) ^ rotl(inv[a], 2) ^ rotl(inv[a], 3) ^ rotl(inv[a], 4) ^ 0x63
       for a in range(256)]
PRESENT = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]

def quadratic_equations(sbox, n):
    # Every polynomial of degree <= 2 in the n input bits x and n output bits y is a sum of
    # monomials: 1, each bit, each product of two bits. Evaluate all of them on every
    # (x, S(x)); each independent combination that is zero on all points is an equation.
    bits = 2 * n
    monos = [()] + [(i,) for i in range(bits)] + list(combinations(range(bits), 2))
    columns = []                        # one column per monomial, as a bit mask over the inputs
    for m in monos:
        col = 0
        for x in range(2 ** n):
            v = x | sbox[x] << n
            if all(v >> i & 1 for i in m):
                col |= 1 << x
        columns.append(col)
    basis = {}                          # Gaussian elimination over GF(2) on the columns
    for col in columns:
        while col:
            top = col.bit_length() - 1
            if top not in basis:
                basis[top] = col
                break
            col ^= basis[top]
    return len(monos), len(monos) - len(basis)

print("AES S-box:     %d monomials, %d quadratic equations" % quadratic_equations(AES, 8))
print("PRESENT S-box: %d monomials, %d quadratic equations" % quadratic_equations(PRESENT, 4))
```

```
AES S-box:     137 monomials, 39 quadratic equations
PRESENT S-box: 37 monomials, 21 quadratic equations
```

For a random 8-bit S-box, 137 monomials evaluated on 256 points would almost
surely be independent and give no quadratic equations at all. The AES S-box
gives 39. (Every 4-bit S-box gives at least 21; exercise 6 asks why.) Nicolas Courtois and Josef Pieprzyk counted
the same 39 equations in 2002 (23 of them "bi-affine", using only products
$x_i y_j$) and wrote the whole of AES-128 as about 8,000 quadratic equations in
1,600 unknowns. The system is **overdefined** (more equations than unknowns) and
**sparse** (each equation touches few unknowns). Nobody knows how to solve
general quadratic systems efficiently (the problem is NP-hard), but overdefined
sparse systems were thought to be easier.

### Linearization, XL and XSL

The simplest method is **linearization**: give every monomial that appears its
own new variable ($z_{12} = x_1 x_2$ and so on) and solve the resulting linear
system by Gaussian elimination. It works when there are at least as many
independent equations as monomials. Usually there are far fewer.

**XL** (eXtended Linearization; Courtois, Alexander Klimov, Jacques Patarin and
Adi Shamir, EUROCRYPT 2000) manufactures more equations: multiply every
equation by every monomial of degree up to $D - 2$, so the new equations have
degree $D$, and linearize. The number of equations grows faster with $D$ than
the number of monomials, and at some degree $D$ there are enough. The cost is
Gaussian elimination on a matrix whose size is the number of monomials of
degree $D$, roughly $\binom{n}{D}$ for $n$ unknowns, which grows very fast. XL
is a weaker relative of the **Gröbner basis** algorithms (Bruno Buchberger,
1965; Jean-Charles Faugère's F4 in 1999 and F5 in 2002), which became the
standard tool; Faugère and Antoine Joux used them to solve Jacques Patarin's
first HFE challenge in 2002.

**XSL** (eXtended Sparse Linearization; Courtois and Pieprzyk, ASIACRYPT 2002)
was XL adapted to the structure of a block cipher: multiply equations only by
monomials that occur in other S-boxes' equations, to keep the system sparse, and
hope for enough independent equations. The paper's estimates suggested that
AES-256 and Serpent-256 might be broken faster than exhaustive search, by
margins the estimates could not pin down. In the same year Sean Murphy and
Matthew Robshaw showed that AES embeds in a larger cipher, **BES**, that works
entirely in $\mathrm{GF}(2^8)$, where the equations become even simpler and
sparser.

### What happened to the XSL claim

AES had been a standard for less than a year, and the idea that a few pages of
algebra might undo it was widely discussed, including in Bruce Schneier's
Crypto-Gram newsletter. But XSL had never been run on anything, and its estimate
rested on a count of how many of the manufactured equations would be linearly
independent. That count was the weak point, and T. T. Moh and Don Coppersmith
were among those who doubted it within months.

The careful answers took several years. Carlos Cid and Gaëtan Leurent (ASIACRYPT
2005) showed that XSL as specified cannot solve the AES system and that at heart
it is a variant of XL. Chu-Wee Lim and Khoongming Khoo (FSE 2007) found that XSL
applied to BES is slower than exhaustive search. Experiments on the small-scale
variants of AES that Cid, Murphy and Robshaw defined in 2005, so that algebraic
methods could be tested on something real, solved only a few rounds of the
smallest versions.

The verdict: **no algebraic attack threatens AES**, and XSL does not work. Whether
some other algebraic method could exploit AES's structure is open, which is why
"AES is unbroken" describes the public record, not a proof (§7.10). The episode
left a habit of testing algebraic claims on toy versions first, and better
solvers, which now break real targets such as the multivariate signature
candidates of [Chapter 16](16-Breaking-Post-Quantum-Candidates.md).

!!! note "Life story: the XSL claim"
    **Born:** 2002, Nicolas Courtois and Josef Pieprzyk (ASIACRYPT 2002),
    building on XL (2000) · **Purpose:** solve the sparse, overdefined quadratic
    system that describes AES and Serpent faster than exhaustive search ·
    **Helped:** start the field of algebraic cryptanalysis of block ciphers;
    prompted the BES representation (Murphy and Robshaw, 2002) and the
    small-scale AES variants (Cid, Murphy and Robshaw, 2005) · **Status:**
    refuted as an attack on AES; Cid and Leurent (2005) and Lim and Khoo (2007)
    showed it does not work as claimed. No algebraic attack on full AES is known

### SAT solvers: the general-purpose equation solver

There is a different way to solve equations over $\mathrm{GF}(2)$: write them
as a Boolean formula and hand it to a **SAT solver**, a program that finds an
assignment making a formula in conjunctive normal form (CNF, an AND of ORs)
true, or proves there is none. SAT is NP-complete, but modern solvers, built on
the **DPLL** algorithm of Martin Davis, George Logemann and Donald Loveland
(1962) with clause learning added in the 1990s, solve industrial problems with
millions of variables. Fabio Massacci and Laura Marraro encoded DES as SAT in
1999 to 2000 ("logical cryptanalysis") and solved three rounds. Ilya Mironov and
Lintao Zhang used solvers to find MD4 and MD5 collisions in 2006. In 2009 Mate
Soos, Karsten Nohl and Claude Castelluccia built **CryptoMiniSat**, a solver that
handles XOR clauses natively, and used it against the stream ciphers Bivium and
Crypto-1, the cipher of MIFARE Classic cards.

Encoding a cipher is mechanical:

- Each key bit and each intermediate bit is a variable.
- A known plaintext or ciphertext bit is a constant, and XOR with a known bit
  just flips a literal, so no new variable is needed.
- $t = s \oplus k$ becomes four clauses: $(\lnot t \lor s \lor k)$,
  $(\lnot t \lor \lnot s \lor \lnot k)$, $(t \lor \lnot s \lor k)$,
  $(t \lor s \lor \lnot k)$. Each forbids one of the four wrong combinations.
- A 4-bit S-box $y = S(a)$ becomes, for each of the 16 inputs $v$ and each output
  bit $j$, the clause "$a \ne v$ or $y_j = S(v)_j$": 64 clauses of five literals.
- A bit permutation costs nothing: it only renames variables.

### Code it: a toy cipher, encoded and solved

The toy is a 16-bit SPN: two rounds of key addition, four PRESENT S-boxes and a
bit permutation (no permutation after the last S-box layer), then a final key
addition. The three round keys are the low 16 bits of a 24-bit master key rotated
left by 0, 5 and 10 places. The attacker has three known plaintext-ciphertext
pairs.

```python
import random

SB = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]   # PRESENT's 4-bit S-box
ROUNDS, KBITS, MASK = 2, 24, 2 ** 24 - 1

def shift(i):                           # round key i is the key rotated left by 5i, low 16 bits
    return 5 * i % KBITS

def perm(x):                            # bit i of nibble j goes to bit j of nibble i
    return sum(1 << (4 * (b % 4) + b // 4) for b in range(16) if x >> b & 1)

def toy(p, key):
    x = p
    for i in range(ROUNDS + 1):
        s = shift(i)
        x ^= ((key << s) | (key >> (KBITS - s))) & MASK & 0xFFFF
        if i == ROUNDS:
            return x
        x = sum(SB[x >> 4 * j & 15] << 4 * j for j in range(4))
        if i < ROUNDS - 1:
            x = perm(x)

random.seed(1)
key = random.randrange(2 ** KBITS)
pairs = [(p, toy(p, key)) for p in (0x0123, 0xBEEF, 0x7777)]
print(hex(key), [(hex(a), hex(b)) for a, b in pairs])
```

```
0x44cb63 [('0x123', '0xd872'), ('0xbeef', '0x9d85'), ('0x7777', '0xa2bb')]
```

Now the clauses. Variables 1 to 24 are the master key bits; a negative number
means "not". Plaintext and ciphertext bits never become variables: they flip key
literals.

```python
# Write the toy cipher as clauses. Variables 1..24 are the key bits; a literal -v means "not v".
clauses, nvars = [], KBITS

def new_var():
    global nvars
    nvars += 1
    return nvars

def add(clause):
    c = set(clause)
    if not any(-l in c for l in c):     # skip clauses that are always true
        clauses.append(sorted(c))

def key_lit(i, b, bit=0):               # bit b of round key i, flipped if XORed with a known 1
    v = (b - shift(i)) % KBITS + 1
    return -v if bit else v

def sbox_clauses(a, y):                 # y = S(a), for 4 input and 4 output literals
    for v in range(16):
        differ = [a[i] if not v >> i & 1 else -a[i] for i in range(4)]
        for j in range(4):
            add(differ + [y[j] if SB[v] >> j & 1 else -y[j]])

for p, c in pairs:
    x = [key_lit(0, b, p >> b & 1) for b in range(16)]       # p xor k0: no new variables
    for i in range(ROUNDS):
        if i == ROUNDS - 1:                                    # S-box output = c xor k_last
            out = [key_lit(ROUNDS, b, c >> b & 1) for b in range(16)]
        else:
            out = [new_var() for _ in range(16)]
        for j in range(4):
            sbox_clauses(x[4 * j:4 * j + 4], out[4 * j:4 * j + 4])
        if i == ROUNDS - 1:
            break
        moved = [0] * 16
        for b in range(16):                                    # the bit permutation renames
            moved[4 * (b % 4) + b // 4] = out[b]
        x = []
        for b in range(16):                                    # t = s xor k: four clauses
            s, k, t = moved[b], key_lit(i + 1, b), new_var()
            add([-t, s, k]); add([-t, -s, -k]); add([t, -s, k]); add([t, s, -k])
            x.append(t)
print(nvars, "variables,", len(clauses), "clauses")
```

```
120 variables, 1728 clauses
```

And a solver. This is DPLL in its plainest form: propagate **unit clauses**
(a clause with one unassigned literal left forces that literal), detect
conflicts (a clause with every literal false), and otherwise pick a variable,
try both values, and back up on failure. It branches on key bits first, since
once the key is fixed, propagation computes everything else.

```python
def dpll(clauses, assign, stats):
    while True:                         # unit propagation, one sweep at a time
        units, live = {}, []
        for c in clauses:
            if any(assign.get(abs(l)) == (l > 0) for l in c):
                continue                # this clause is already true
            free = [l for l in c if abs(l) not in assign]
            if not free:
                return None             # every literal false: a conflict, back up
            if len(free) == 1:
                l = free[0]
                if units.get(abs(l), l > 0) != (l > 0):
                    return None         # two clauses force opposite values
                units[abs(l)] = l > 0
            live.append(free)
        if not units:
            break
        assign = {**assign, **units}
    if not live:
        return assign
    free_vars = {abs(l) for c in live for l in c}
    v = min(free_vars)                  # branch on a key bit first: they have the lowest numbers
    for value in (False, True):
        stats[0] += 1
        result = dpll(live, {**assign, v: value}, stats)
        if result:
            return result
    return None

stats = [0]
sol = dpll(clauses, {}, stats)
found = sum(1 << (v - 1) for v in range(1, KBITS + 1) if sol.get(v))
print("key found:", hex(found), "decisions:", stats[0], "correct:", found == key)
```

```
key found: 0x44cb63 decisions: 6385 correct: True
```

The solver tried 6,385 branches instead of $2^{24} \approx 16.8$ million keys,
because propagation and conflicts prune whole subtrees: once the bits feeding one
S-box are set, its outputs are forced, and a contradiction with a ciphertext bit
kills every key that shares those bits. It takes a few seconds in plain Python;
a real solver does it in milliseconds. Be honest about what this shows. Add a
third round to the toy and this little solver bogs down, while a good solver
with clause learning goes several rounds further and then hits the same wall.
SAT solvers are excellent at small or heavily structured problems: reduced
rounds, ciphers with tiny S-boxes or simple key schedules, key recovery when
many bits are already known (from a side channel, say), and the search for
differential and linear characteristics, where they and mixed-integer linear
programming (Nicky Mouha and colleagues, 2011) are now standard tools. Against
full modern ciphers they have never come close.

### In the real world

Algebraic attacks have broken real systems where the cipher was small. KeeLoq,
the cipher in many car and garage remotes, fell partly to SAT solving (Courtois,
Gregory Bard and Wagner, 2008; more in §7.6), and the Hitag2 car-key cipher to
SAT solvers in the hands of Courtois, Sean O'Neil and Jean-Jacques Quisquater
(2009). Against AES the result is still the one from 2005: the equations are
easy to write, and nobody can solve them.

## 7.6 Slide attacks: when every round is the same

*Level: intermediate.*

### The problem with adding rounds

The usual defense against every attack so far is to add rounds. Differential
probabilities multiply, linear biases shrink, degrees grow, integral properties
die. It is natural to think that a cipher with 500 rounds is safe whatever its
round function looks like. Alex Biryukov and David Wagner showed in 1999 that
this is false when **every round is the same**, including its key.

Suppose a cipher is $E = F^r$: the same keyed round function $F$, applied $r$
times. Take two plaintexts $P$ and $P'$ with
$$P' = F(P).$$
Such a pair is called a **slid pair**. Then
$$C' = E(P') = F^r(F(P)) = F(F^r(P)) = F(C).$$
Draw the two encryptions one above the other, the second shifted right by one
round (Figure 7.4): every round of the top line lines up with the same round of
the bottom line, and the whole cipher drops out. What is left is one round, in
two places: $P' = F(P)$ and $C' = F(C)$. If one round is weak (if one
input-output pair of $F$ reveals much of the key, as it usually does), the
attacker gets two such pairs for free, whatever $r$ is.

<figure class="mars-fig">
<svg viewBox="0 0 640 196" width="640" role="img" aria-label="Two chains of identical round boxes, the second shifted right by one round, with P prime equal to F of P and C prime equal to F of C" fill="currentColor" font-size="14">
<text x="62" y="52" text-anchor="end" font-weight="bold">P</text>
<rect x="70" y="30" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="95" y="52" text-anchor="middle">F</text>
<line x1="120" y1="47" x2="140" y2="47" stroke="currentColor" stroke-width="1.2"/>
<path d="M140 47 l-7 -4 v8 z"/>
<rect x="140" y="30" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="165" y="52" text-anchor="middle">F</text>
<line x1="190" y1="47" x2="210" y2="47" stroke="currentColor" stroke-width="1.2"/>
<path d="M210 47 l-7 -4 v8 z"/>
<rect x="210" y="30" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="235" y="52" text-anchor="middle">F</text>
<line x1="260" y1="47" x2="280" y2="47" stroke="currentColor" stroke-width="1.2"/>
<path d="M280 47 l-7 -4 v8 z"/>
<rect x="280" y="30" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="305" y="52" text-anchor="middle">F</text>
<line x1="330" y1="47" x2="350" y2="47" stroke="currentColor" stroke-width="1.2"/>
<path d="M350 47 l-7 -4 v8 z"/>
<rect x="350" y="30" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="375" y="52" text-anchor="middle">F</text>
<line x1="400" y1="47" x2="420" y2="47" stroke="currentColor" stroke-width="1.2"/>
<path d="M420 47 l-7 -4 v8 z"/>
<rect x="420" y="30" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="445" y="52" text-anchor="middle">F</text>
<line x1="470" y1="47" x2="490" y2="47" stroke="currentColor" stroke-width="1.2"/>
<path d="M490 47 l-7 -4 v8 z"/>
<rect x="490" y="30" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="515" y="52" text-anchor="middle">F</text>
<text x="548" y="52" text-anchor="start" font-weight="bold">C</text>
<text x="132" y="132" text-anchor="end" font-weight="bold">P′</text>
<rect x="140" y="110" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="165" y="132" text-anchor="middle">F</text>
<line x1="190" y1="127" x2="210" y2="127" stroke="currentColor" stroke-width="1.2"/>
<path d="M210 127 l-7 -4 v8 z"/>
<rect x="210" y="110" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="235" y="132" text-anchor="middle">F</text>
<line x1="260" y1="127" x2="280" y2="127" stroke="currentColor" stroke-width="1.2"/>
<path d="M280 127 l-7 -4 v8 z"/>
<rect x="280" y="110" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="305" y="132" text-anchor="middle">F</text>
<line x1="330" y1="127" x2="350" y2="127" stroke="currentColor" stroke-width="1.2"/>
<path d="M350 127 l-7 -4 v8 z"/>
<rect x="350" y="110" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="375" y="132" text-anchor="middle">F</text>
<line x1="400" y1="127" x2="420" y2="127" stroke="currentColor" stroke-width="1.2"/>
<path d="M420 127 l-7 -4 v8 z"/>
<rect x="420" y="110" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="445" y="132" text-anchor="middle">F</text>
<line x1="470" y1="127" x2="490" y2="127" stroke="currentColor" stroke-width="1.2"/>
<path d="M490 127 l-7 -4 v8 z"/>
<rect x="490" y="110" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="515" y="132" text-anchor="middle">F</text>
<line x1="540" y1="127" x2="560" y2="127" stroke="currentColor" stroke-width="1.2"/>
<path d="M560 127 l-7 -4 v8 z"/>
<rect x="560" y="110" width="50" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="585" y="132" text-anchor="middle">F</text>
<text x="618" y="132" text-anchor="start" font-weight="bold">C′</text>
<line x1="118" y1="64" x2="150" y2="110" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<line x1="556" y1="46" x2="585" y2="110" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="70" y="100" text-anchor="start" font-size="13">P′ = F(P)</text>
<text x="460" y="100" text-anchor="end" font-size="13">C′ = F(C)</text>
<line x1="165" y1="66" x2="165" y2="108" stroke="currentColor" stroke-width="0.8" stroke-dasharray="5 4" opacity="0.5"/>
<line x1="235" y1="66" x2="235" y2="108" stroke="currentColor" stroke-width="0.8" stroke-dasharray="5 4" opacity="0.5"/>
<line x1="305" y1="66" x2="305" y2="108" stroke="currentColor" stroke-width="0.8" stroke-dasharray="5 4" opacity="0.5"/>
<line x1="375" y1="66" x2="375" y2="108" stroke="currentColor" stroke-width="0.8" stroke-dasharray="5 4" opacity="0.5"/>
<line x1="445" y1="66" x2="445" y2="108" stroke="currentColor" stroke-width="0.8" stroke-dasharray="5 4" opacity="0.5"/>
<line x1="515" y1="66" x2="515" y2="108" stroke="currentColor" stroke-width="0.8" stroke-dasharray="5 4" opacity="0.5"/>
<text x="320" y="182" text-anchor="middle" font-size="13">every F in the top line sits over an identical F in the bottom line</text>
</svg>
<figcaption>Figure 7.4. A slid pair. Shift the second encryption one round to the right: if P′ = F(P), the two lines carry the same values from then on, so C′ = F(C). The number of rounds cancels out.</figcaption>
</figure>

How does the attacker find a slid pair without knowing $F$? By the birthday
bound of [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md). Among $N$
known plaintexts on $n$-bit blocks, each $F(P)$ lands in the set with probability
$N / 2^n$, so about $N^2 / 2^n$ slid pairs exist. With $N = 2^{n/2}$ known
plaintexts, about one does. To spot it, the attacker uses whatever $F$ leaves
visible. For a **Feistel** round, $F(L, R) = (R, L \oplus f(R))$, the left half
of $F(P)$ is the right half of $P$, and the same for $C$. So a slid pair must
satisfy two $n/2$-bit conditions that any random pair meets with probability
$2^{-n}$:
$$P'_L = P_R, \qquad C'_L = C_R.$$
Sort the texts by $(P_L, C_L)$, look each one up by $(P_R, C_R)$, and the slid
pairs fall out together with a few false alarms, which the key recovery
discards.

### Code it: a 512-round cipher, slid

The toy is a 24-bit Feistel cipher with 12-bit halves and 512 identical rounds.
The round function XORs a 12-bit key $k_1$, applies three 4-bit S-boxes,
rotates, and XORs a second 12-bit key $k_2$. That is 24 bits of key, and any
single input-output pair of one round gives one 12-bit equation in it, so two
pairs (from the plaintexts and from the ciphertexts of a slid pair) pin it down.
The attacker has $2^{13} = 8192$ known plaintexts.

```python
import random

SB = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
ROUNDS = 512                            # the attack does not care how many

def F(r, k1, k2):                       # the round function on a 12-bit half
    x = r ^ k1
    x = SB[x & 15] | SB[x >> 4 & 15] << 4 | SB[x >> 8] << 8
    return ((x << 3 | x >> 9) & 0xFFF) ^ k2

def encrypt(p, k1, k2, cache={}):       # a 24-bit Feistel cipher, every round the same
    if (k1, k2) not in cache:
        cache[(k1, k2)] = [F(r, k1, k2) for r in range(4096)]
    table = cache[(k1, k2)]
    L, R = p >> 12, p & 0xFFF
    for _ in range(ROUNDS):
        L, R = R, L ^ table[R]
    return L << 12 | R

random.seed(99)
k1, k2 = random.randrange(4096), random.randrange(4096)    # 24 bits of key
texts = random.sample(range(2 ** 24), 2 ** 13)             # 8192 known plaintexts
pairs = [(p, encrypt(p, k1, k2)) for p in texts]

# A slid pair (P, P') has P' = one round of P and C' = one round of C,
# so the left half of P' is the right half of P, and the same for C' and C.
index = {}
for p, c in pairs:
    index.setdefault((p >> 12, c >> 12), []).append((p, c))
candidates = [(a, b) for a in pairs for b in index.get((a[0] & 0xFFF, a[1] & 0xFFF), [])]
print("candidate slid pairs:", len(candidates))

for (p, c), (q, d) in candidates:
    for g1 in range(4096):              # guess k1; the first equation then gives k2
        g2 = F(p & 0xFFF, g1, 0) ^ (p >> 12) ^ (q & 0xFFF)
        if F(c & 0xFFF, g1, g2) == (c >> 12) ^ (d & 0xFFF):
            if encrypt(pairs[0][0], g1, g2) == pairs[0][1]:
                print("key found:", hex(g1), hex(g2), " real:", hex(k1), hex(k2))
                break
    else:
        continue
    break
```

```
candidate slid pairs: 5
key found: 0xced 0xc2f  real: 0xced 0xc2f
```

Two equations do the work. From $P' = F(P)$: $P'_R = P_L \oplus f(P_R)$, so
$f(P_R) = P_L \oplus P'_R$; from $C' = F(C)$: $f(C_R) = C_L \oplus C'_R$. For each
guess of $k_1$ the first equation gives $k_2$ outright (it is XORed at the end of
$f$), and the second checks it. The work is $2^{12}$ cheap steps per candidate
pair, plus one trial encryption to confirm, against $2^{24}$ encryptions of 512
rounds for brute force. Change `ROUNDS` to 5 or to 50,000: the attack is the same.

### Variations

Biryukov and Wagner's **advanced slide attacks** (EUROCRYPT 2000) handled
ciphers whose rounds alternate between two keys, by sliding by two rounds, and
added two tricks: the **complementation slide**, which slides with a known
difference between the two lines, and **sliding with a twist**, which slides an
encryption against a decryption, useful for Feistel ciphers whose keys run
symmetrically. Slides combine with other attacks: once a slid pair is found, the
"one round" can be replaced by any few rounds the attacker can break. Related-key
slides are older still; Biham's 1993 related-key paper had the germ, and Edna
Grossman and Bryant Tuckerman of IBM attacked a weakened Feistel-like cipher
without a rotating key, in the late 1970s, with an idea of the same kind.

### Fix it

Self-similarity is cheap to remove. Make the rounds different: round constants
in the key schedule (AES's Rcon, which also breaks symmetry inside a round key),
a key schedule that does not repeat with a short period, or different round
functions in different parts of the cipher. Every modern design does at least one
of these, and the slide attack is a standard item on the list of checks a new
cipher must pass. The danger survives in places where structure repeats by
design: ciphers built for tiny hardware with a key that simply cycles, and
constructions like Even-Mansour with one key used twice, which Orr Dunkelman,
Nathan Keller and Adi Shamir attacked with a "slidex" attack in 2012.

### In the real world

The most famous victim is **KeeLoq**, a 32-bit block cipher with a 64-bit key,
designed in the 1980s and used in remote keyless entry for cars and garage
doors. It runs 528 rounds of a nonlinear shift register, and its key schedule
just cycles through the 64 key bits, so the cipher is nearly a 64-round function
applied over and over: slide-vulnerable by construction. Andrey Bogdanov
published slide-based attacks in 2007, Courtois, Bard and Wagner combined
slides with algebraic solving, and Sebastiaan Indesteege, Nathan Keller, Orr
Dunkelman, Eli Biham and Bart Preneel (EUROCRYPT 2008) recovered keys from
$2^{16}$ known plaintexts with about $2^{44.5}$ encryptions. The practical
blow came the same year from a side channel: a team at Ruhr-University Bochum
extracted manufacturers' master keys by power analysis (Thomas Eisenbarth and
colleagues, CRYPTO 2008), which let them clone remotes after eavesdropping on
a single transmission or two.

!!! note "Life story: the slide attack"
    **Born:** 1999, Alex Biryukov and David Wagner (FSE 1999); advanced forms
    (complementation slide, slide with a twist) at EUROCRYPT 2000 ·
    **Purpose:** break ciphers with identical rounds independently of the number
    of rounds, by aligning two encryptions offset by one round · **Helped:**
    break TREYFER, variants of Blowfish and DES-like ciphers with periodic key
    schedules, and KeeLoq (2007 to 2008); made round constants a routine part of
    every key schedule; in 2016 Marc Kaplan and colleagues showed that a quantum
    attacker with superposition access finds slid pairs exponentially faster ·
    **Status:** current; rarely applicable to modern designs because they are
    built against it

## 7.7 Related-key attacks on AES-192 and AES-256

*Level: expert.*

### The model

In a **related-key attack** ([Chapter 1](01-What-Cryptanalysis-Is.md)) the
attacker does not know the key $K$, but can ask for encryptions under $K$ and
under keys $K \oplus \Delta_1$, $K \oplus \Delta_2$, and so on, for differences
the attacker chooses. It sounds like a model no real system offers, and for
encryption with random, independent keys it is. But some systems do derive keys
in related ways: WEP put a public counter next to a secret key, and hash
functions built from block ciphers (Davies-Meyer and its relatives, book 1's
[Chapter 9](../../book/09-Hash-Functions.md)) feed message blocks into the key
input, where the attacker chooses them freely. A cipher meant as a general
building block should therefore resist related keys too, and AES's designers
said they intended it to.

### Why AES's key schedule is the weak point

Differential attacks on AES fail because of the wide trail: a difference
injected into the state activates at least 25 S-boxes over four rounds, each
passing it with probability at most $2^{-6}$. In the related-key model the
attacker can inject differences through the **round keys** as well. If the
difference in round key $i$ is chosen to cancel a difference in the state,
the state difference disappears, and the trail is quiet for a round or two before
the key schedule injects it again. Such a cancellation is a **local collision**,
the same tool that broke the SHA-1 hash ([Chapter 9](09-Breaking-Hash-Functions.md)).

The key schedule of AES is light: for AES-256 it applies the S-box to only four
bytes of every 16 key bytes produced, and the rest is XOR. A key difference can
therefore travel through the key schedule for many rounds while passing few
S-boxes, and the trails it makes in the cipher pass few S-boxes too. AES-128's
schedule gets a nonlinear step every round key; AES-256's alternates between the
two halves of its 32-byte key, so each half changes only every other round, and
differences survive longer. That is the main reason the longer keys are the
weaker ones in this model.

### The attacks

In 2009 Alex Biryukov, Dmitry Khovratovich and Ivica Nikolić (CRYPTO 2009) found
related-key differential trails through the full 14 rounds of AES-256. They used
them for a distinguisher of a new kind, **differential $q$-multicollisions**,
which matters when AES-256 is used as a hash function's compression function,
and for a key recovery on the full AES-256 that works for one key in $2^{35}$
related keys at a cost of about $2^{131}$. A few months later Biryukov and
Khovratovich (ASIACRYPT 2009) used a **related-key boomerang**, two short
trails glued as in [Chapter 5](05-Differential-Cryptanalysis.md), to reach:

| Target | Related keys | Data | Time | Memory |
|---|---|---|---|---|
| AES-256 (14 rounds) | 4 | $2^{99.5}$ | $2^{99.5}$ | $2^{77}$ |
| AES-192 (12 rounds) | 4 | $2^{123}$ | $2^{176}$ | $2^{152}$ |

The AES-256 attack is far faster than the $2^{255}$ average of brute force: a
break by the strict definition of [Chapter 1](01-What-Cryptanalysis-Is.md). In
2010 Biryukov, Dunkelman, Keller, Khovratovich and Shamir showed the model's
power on reduced versions: key recovery on 9-round AES-256 with two related keys
in about $2^{39}$ time, within reach of a single PC, and on 10 rounds in about
$2^{45}$ with a stronger form of the model ("related subkeys").

### What they mean, and what they do not

- **They do not affect AES used normally.** A protocol that draws keys at random,
  or derives them with a proper key derivation function
  ([book 1, Chapter 11](../../book/11-Passwords-and-Key-Derivation.md)), never
  gives an attacker encryptions under four keys with chosen differences. TLS,
  disk encryption, SSH and every other standard use of AES are unaffected, and
  no standard changed in response.
- **They do say AES-256's key schedule is weak for its size.** In the related-key
  model AES-256 is now weaker than AES-128, which has no known related-key
  attack on all ten rounds. Bruce Schneier wrote on his blog in July 2009 that
  for new applications he suggested AES-128 over AES-256, on these grounds;
  others pointed out that AES-256 still gives a larger margin against brute
  force and against quantum search ([Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)).
  Both views are still held; the related-key results matter only to the first.
- **They matter where keys are inputs.** Using AES-256 as the core of a hash
  function, or in a tweakable construction where an attacker influences the key,
  needs a cipher secure in the related-key model, and AES-256 is not.
- **They taught designers to treat the key schedule as part of the cipher.**
  Later block ciphers and the tweakable designs used in authenticated encryption
  analyze key-schedule trails as carefully as round trails.

!!! note "Life story: the related-key attacks on AES"
    **Born:** 2009, Alex Biryukov, Dmitry Khovratovich and Ivica Nikolić
    (CRYPTO 2009, AES-256 with $2^{35}$ related keys), then Biryukov and
    Khovratovich (ASIACRYPT 2009, AES-256 in $2^{99.5}$ and AES-192 in $2^{176}$
    with four related keys); practical attacks on 9 and 10 rounds of AES-256
    followed in 2010 · **Purpose:** exploit the slow, mostly linear key schedule
    of the larger AES variants through local collisions · **Helped:** show that
    AES-256 is weaker than AES-128 in the related-key model, and make key
    schedules a first-class target in design · **Status:** valid and unimproved
    in substance; no effect on AES used with independent keys

## 7.8 Bicliques: the 2¹²⁶·¹ attack on full AES

*Level: expert.*

### Meet in the middle, over the key

Meet-in-the-middle ([Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md))
breaks double encryption because the key splits into two halves, one used only
in the first half of the computation and one only in the second. AES's key is
not split that way: every key bit influences every round. But the key schedule
of AES mixes slowly, so over a few rounds the influence of some key bits is
small. Dmitry Khovratovich, Christian Rechberger and Alexandra Savelieva turned
this into a tool for hash-function preimages (FSE 2012, first circulated in
2011), and Andrey Bogdanov, Khovratovich and Rechberger applied it to AES at
ASIACRYPT 2011. It became the first key-recovery attack on the full AES, all
three key sizes, faster than exhaustive search.

### The structure

Split the $2^{128}$ AES-128 keys into $2^{112}$ groups of $2^{16}$ keys. Within
a group, a key is named $K[i, j]$ with $i, j \in \{0, \dots, 255\}$: a base key
plus a difference $\Delta_i$ plus a difference $\nabla_j$, both applied to one
round key and spread through the key schedule from there. The attack treats
each group in three steps (Figure 7.5).

<div class="mars-steps" markdown>

1. **Build a biclique over the last three rounds.** Find 256 internal states
   $S_j$ (before round 8) and 256 ciphertexts $C_i$ such that, for all $i$ and
   $j$, the last three rounds under key $K[i, j]$ map $S_j$ to $C_i$. That is
   $2^{16}$ facts at once, a complete bipartite graph, hence the name
   **biclique**. It is cheap because the $\Delta$ differential and the $\nabla$
   differential are chosen not to share any active S-box over those three
   rounds; then one computation for each $i$ and one for each $j$, about
   $2^9$ partial computations in all, yield all $2^{16}$ connections.
2. **Get the plaintexts.** Ask the decryption oracle for $P_i = D_K(C_i)$ for
   the 256 ciphertexts. (These are chosen ciphertexts; over all groups they
   come from a set of about $2^{88}$ values, which is the attack's data cost.)
3. **Match in the middle over the first seven rounds.** For each $i$, compute
   forward from $P_i$ to one byte $v$ of the state after round 3, under the
   keys $K[i, j]$; for each $j$, compute backward from $S_j$ to the same byte.
   A key $K[i, j]$ is a candidate if the two values of $v$ agree, which happens
   by chance for $2^{-8}$ of the wrong keys; candidates are checked in full.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 640 234" width="640" role="img" aria-label="Biclique attack layout: plaintexts, a meet-in-the-middle box over seven rounds, and a complete bipartite graph between states and ciphertexts over the last three rounds" fill="currentColor" font-size="14">
<text x="20" y="26" text-anchor="start" font-size="13" font-weight="bold">plaintexts</text>
<text x="52" y="62" text-anchor="middle">P₀</text>
<text x="52" y="96" text-anchor="middle">P₁</text>
<text x="52" y="130" text-anchor="middle">P₂</text>
<text x="52" y="164" text-anchor="middle">P₃</text>
<rect x="90" y="40" width="300" height="130" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="240" y="70" text-anchor="middle" font-weight="bold">rounds 1 to 7</text>
<text x="240" y="96" text-anchor="middle" font-size="13">forward from Pᵢ, backward from Sⱼ,</text>
<text x="240" y="116" text-anchor="middle" font-size="13">both to one byte v after round 3;</text>
<text x="240" y="136" text-anchor="middle" font-size="13">keys where they agree are candidates</text>
<rect x="420" y="40" width="200" height="130" rx="4" opacity="0.15"/>
<rect x="420" y="40" width="200" height="130" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="520" y="30" text-anchor="middle" font-size="13" font-weight="bold">rounds 8 to 10: biclique</text>
<line x1="450" y1="60" x2="590" y2="60" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="60" x2="590" y2="90" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="60" x2="590" y2="120" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="60" x2="590" y2="150" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="90" x2="590" y2="60" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="90" x2="590" y2="90" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="90" x2="590" y2="120" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="90" x2="590" y2="150" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="120" x2="590" y2="60" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="120" x2="590" y2="90" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="120" x2="590" y2="120" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="120" x2="590" y2="150" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="150" x2="590" y2="60" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="150" x2="590" y2="90" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="150" x2="590" y2="120" stroke="currentColor" stroke-width="0.8"/>
<line x1="450" y1="150" x2="590" y2="150" stroke="currentColor" stroke-width="0.8"/>
<circle cx="450" cy="60" r="4"/>
<circle cx="590" cy="60" r="4"/>
<text x="440" y="65" text-anchor="end" font-size="12">S₀</text>
<text x="600" y="65" text-anchor="start" font-size="12">C₀</text>
<circle cx="450" cy="90" r="4"/>
<circle cx="590" cy="90" r="4"/>
<text x="440" y="95" text-anchor="end" font-size="12">S₁</text>
<text x="600" y="95" text-anchor="start" font-size="12">C₁</text>
<circle cx="450" cy="120" r="4"/>
<circle cx="590" cy="120" r="4"/>
<text x="440" y="125" text-anchor="end" font-size="12">S₂</text>
<text x="600" y="125" text-anchor="start" font-size="12">C₂</text>
<circle cx="450" cy="150" r="4"/>
<circle cx="590" cy="150" r="4"/>
<text x="440" y="155" text-anchor="end" font-size="12">S₃</text>
<text x="600" y="155" text-anchor="start" font-size="12">C₃</text>
<line x1="66" y1="105" x2="88" y2="105" stroke="currentColor" stroke-width="1.2"/>
<path d="M88 105 l-7 -4 v8 z"/>
<text x="320" y="200" text-anchor="middle" font-size="13">each line from Sⱼ to Cᵢ is the last three rounds under key K[i, j];</text>
<text x="320" y="220" text-anchor="middle" font-size="13">256 + 256 computations give all 2¹⁶ lines; Pᵢ comes from asking to decrypt Cᵢ</text>
</svg>
<figcaption>Figure 7.5. The biclique attack on AES-128, for one group of 2¹⁶ keys (drawn with 4 states and 4 ciphertexts instead of 256). The biclique links every state Sⱼ to every ciphertext Cᵢ; the meet in the middle tests all keys of the group at a bit more than a quarter of the cost of trying them one by one.</figcaption>
</figure>

### Where 2¹²⁶·¹ comes from

The matching step is where the time goes, and it is not a true meet in the
middle: the attacker must still compute $v$ for all $2^{16}$ keys of the group,
forward and backward, because the forward computation depends on $j$ as well as
$i$. What saves time is that most of that computation does not change when only
$j$ changes, or only $i$. The attacker computes the parts that depend on one
index once and **recomputes only the S-boxes** that the other index's
difference reaches. Bogdanov, Khovratovich and Rechberger counted, S-box by
S-box, how many must be recomputed per key, and found that testing a key costs
on average a bit more than a quarter of a full AES encryption. Adding the cost of
the bicliques and of checking candidates gives
$$2^{112} \text{ groups} \times 2^{16} \text{ keys} \times 2^{-1.9} \approx 2^{126.1}$$
AES-encryption equivalents for AES-128, against $2^{128}$ for trying every key
(or $2^{127}$ on average). The same paper gave $2^{189.7}$ for AES-192 and
$2^{254.4}$ for AES-256, with data $2^{80}$ and $2^{40}$.

### What the number means

It is an honest key recovery on the unmodified cipher, in the standard
single-key model, and it is faster than brute force: by the definitions of
[Chapter 1](01-What-Cryptanalysis-Is.md), AES is "broken". It is also about
four times faster than a search no one can run, it needs $2^{88}$ chosen texts
(about five million billion terabytes of ciphertext) under one key, and its gain comes from
counting work more cleverly, not from any statistical weakness of the rounds.
Several authors noted that exhaustive search, too, can share work between
similar keys and stop early, so the true distance between bicliques and the best
possible brute force is smaller than the headline. Later papers shaved the
exponent by fractions of a bit and reduced the data a great deal, at the price of
more time.

The lasting value of bicliques is as a measuring stick. Applied to almost any
cipher, they give some speedup over brute force, so a biclique "break" says
little about a cipher's quality. When a paper reports one, read it as "the full
cipher has no shortcut beyond about two bits", which for AES is reassuring.

!!! note "Life story: the biclique attack"
    **Born:** 2011, Andrey Bogdanov, Dmitry Khovratovich and Christian
    Rechberger (ASIACRYPT 2011), from Khovratovich, Rechberger and Savelieva's
    bicliques for hash preimages · **Purpose:** a key recovery on the full
    cipher in the single-key model, by meet-in-the-middle over groups of keys
    with shared computation · **Helped:** the first such result for all three
    sizes of AES ($2^{126.1}$, $2^{189.7}$, $2^{254.4}$); later applied to IDEA,
    PRESENT and many lightweight ciphers · **Status:** the best key recovery on
    full AES; a certificational result that changed no recommendation

## 7.9 Meet-in-the-middle attacks on reduced AES

*Level: expert.*

The biclique attack touches all ten rounds of AES-128 but gains almost nothing.
The attacks that gain a lot reach fewer rounds, and since about 2008 the
strongest single-key attacks on 7 rounds of AES-128 have been
meet-in-the-middle attacks built on one observation about $\Lambda$-sets.

### The Demirci-Selçuk property

Return to the $\Lambda$-set of §7.2: 256 plaintexts differing in byte 0, which
takes all values. Now keep track not of a sum but of the whole **ordered
sequence**: number the texts by the value $x$ of their active byte, and look at
byte 0 of the state after four full rounds as a function of $x$. That is a list
of 256 bytes, 2,048 bits. Henri Gilbert and Marine Minier (2000) had noticed
that over a few rounds such functions depend on few parameters. Hüseyin Demirci
and Ali Aydın Selçuk (FSE 2008) showed that for four rounds the whole list is
determined by just **25 bytes** of unknowns (bytes of the state and of round
keys), whatever the key and the plaintext constants. So instead of $2^{2048}$
possible lists there are at most $2^{200}$.

That is a distinguisher with a twist: it is useful only if the attacker can store
the possible lists. The attack therefore has an **offline phase**, building a
table of every list the 25 parameters can produce, and an **online phase**: ask
for $\Lambda$-sets, guess the key bytes of the rounds added before and after the
four-round core, compute the list, and look it up. A wrong guess gives a list in
the table with probability about $2^{200} / 2^{2048}$, effectively never. The
meet happens in the table, between what the key guesses predict from the outside
and what the four-round core allows from the inside.

### Shrinking the table

With 25 parameters the table is far too big except against long keys, where
brute force is costlier still: Demirci and Selçuk's attacks on 8-round AES-256
and 7-round AES-192 came in just under exhaustive search. The progress since
has been in cutting the parameters.

- **Orr Dunkelman, Nathan Keller and Adi Shamir (ASIACRYPT 2010)** stored
  **multisets** (the values without their order) instead of ordered lists, which
  frees the attack from guessing some bytes, and used **differential
  enumeration**: if the attacker considers only $\Lambda$-sets that contain a pair
  following a fixed truncated differential through the core, most parameters are
  determined by that pair, and the table shrinks to about $2^{80}$ entries.
- **Patrick Derbez, Pierre-Alain Fouque and Jérémy Jean (EUROCRYPT 2013)** found
  that the parameters are linked by the AES round function, cut the table again,
  and gave a 7-round attack on AES-128 with time, data and memory each around
  $2^{99}$. Derbez and Fouque then built tools that search for such attacks
  automatically.

These attacks matter for the measure of AES's margin, not for its use. A
seven-round attack at $2^{99}$ is far from practical, and it does not extend to
eight rounds of AES-128. They also show the craft of modern symmetric
cryptanalysis: the structure of §7.2, the meet-in-the-middle of
[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md), the truncated
differentials of [Chapter 5](05-Differential-Cryptanalysis.md), and a great deal
of careful counting, combined, often by a computer search.

!!! note "Life story: the Demirci-Selçuk meet-in-the-middle attack"
    **Born:** 2008, Hüseyin Demirci and Ali Aydın Selçuk (FSE 2008), from
    Gilbert and Minier's 2000 observation · **Purpose:** turn the fact that
    four AES rounds map a $\Lambda$-set to one of comparatively few byte
    sequences into a key recovery on 7 and 8 rounds · **Helped:** with
    multisets and differential enumeration (Dunkelman, Keller and Shamir, 2010)
    and the improvements of Derbez, Fouque and Jean (2013), give the best
    single-key attacks on 7-round AES-128 and on reduced AES-192 and AES-256 ·
    **Status:** current; the family that sets AES's measured margin

## 7.10 What "AES is unbroken" means

*Level: beginner.*

You can now read every claim about the security of AES and place it. Here is the
precise meaning of the sentence cryptographers use, part by part.

**No attack on the full cipher does much better than brute force.** In the
standard model (one secret key, chosen at random; the attacker may choose
plaintexts or ciphertexts), the best known key recovery on full AES-128 costs
about $2^{126.1}$ operations (bicliques, §7.8), against $2^{127}$ on average for
exhaustive search, and needs $2^{88}$ chosen texts. No distinguisher, no
shortcut, and no weakness in the outputs of the full cipher has been found. All
three key sizes stand in the same place.

**Reduced versions are broken, and the margin is known.** The best single-key
attacks that gain substantially over brute force reach 7 of the 10 rounds of
AES-128 (Demirci-Selçuk style meet-in-the-middle and impossible differentials,
§7.9 and [Chapter 5](05-Differential-Cryptanalysis.md)), and leave margins of
several rounds for AES-192 and AES-256 as well. In 1998 the best attack reached
6 rounds; a quarter century of public work has added one. Figure 7.6 shows the
margins.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Bars for AES-128, AES-192 and AES-256 showing rounds reached by the best single-key attacks: 7 of 10, 8 of 12, 9 of 14" fill="currentColor" font-size="14">
<text x="10" y="46" text-anchor="start" font-weight="bold">AES-128</text>
<rect x="100" y="26" width="210" height="28" opacity="0.35"/>
<rect x="100" y="26" width="300" height="28" fill="none" stroke="currentColor" stroke-width="1.2"/>
<line x1="130" y1="26" x2="130" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="160" y1="26" x2="160" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="190" y1="26" x2="190" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="220" y1="26" x2="220" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="250" y1="26" x2="250" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="280" y1="26" x2="280" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="310" y1="26" x2="310" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="340" y1="26" x2="340" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="370" y1="26" x2="370" y2="54" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<text x="304" y="45" text-anchor="end" font-size="13" font-weight="bold">7</text>
<text x="408" y="45" text-anchor="start" font-size="13">of 10</text>
<text x="100" y="72" text-anchor="start" font-size="12">full rounds only by bicliques (2¹²⁶·¹)</text>
<text x="10" y="110" text-anchor="start" font-weight="bold">AES-192</text>
<rect x="100" y="90" width="240" height="28" opacity="0.35"/>
<rect x="100" y="90" width="360" height="28" fill="none" stroke="currentColor" stroke-width="1.2"/>
<line x1="130" y1="90" x2="130" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="160" y1="90" x2="160" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="190" y1="90" x2="190" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="220" y1="90" x2="220" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="250" y1="90" x2="250" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="280" y1="90" x2="280" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="310" y1="90" x2="310" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="340" y1="90" x2="340" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="370" y1="90" x2="370" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="400" y1="90" x2="400" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="430" y1="90" x2="430" y2="118" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<text x="334" y="109" text-anchor="end" font-size="13" font-weight="bold">8</text>
<text x="468" y="109" text-anchor="start" font-size="13">of 12</text>
<text x="100" y="136" text-anchor="start" font-size="12">related keys: full; bicliques: 2¹⁸⁹·⁷</text>
<text x="10" y="174" text-anchor="start" font-weight="bold">AES-256</text>
<rect x="100" y="154" width="270" height="28" opacity="0.35"/>
<rect x="100" y="154" width="420" height="28" fill="none" stroke="currentColor" stroke-width="1.2"/>
<line x1="130" y1="154" x2="130" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="160" y1="154" x2="160" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="190" y1="154" x2="190" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="220" y1="154" x2="220" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="250" y1="154" x2="250" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="280" y1="154" x2="280" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="310" y1="154" x2="310" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="340" y1="154" x2="340" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="370" y1="154" x2="370" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="400" y1="154" x2="400" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="430" y1="154" x2="430" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="460" y1="154" x2="460" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<line x1="490" y1="154" x2="490" y2="182" stroke="currentColor" stroke-width="0.6" opacity="0.5"/>
<text x="364" y="173" text-anchor="end" font-size="13" font-weight="bold">9</text>
<text x="528" y="173" text-anchor="start" font-size="13">of 14</text>
<text x="100" y="200" text-anchor="start" font-size="12">related keys: full; bicliques: 2²⁵⁴·⁴</text>
<rect x="100" y="216" width="24" height="14" opacity="0.35"/>
<text x="132" y="228" text-anchor="start" font-size="13">rounds reached by the best single-key attacks with a real gain</text>
</svg>
<figcaption>Figure 7.6. The security margin of AES. Shaded: rounds reached by the best single-key attacks that gain clearly over brute force (integral, impossible differential and meet-in-the-middle). The full ciphers fall only to bicliques, by about two bits, and, for the longer keys, to related-key attacks.</figcaption>
</figure>

**Related-key attacks exist on AES-192 and AES-256, in a model that proper use
never offers.** They show a weakness of the key schedule (§7.7). They matter
for designs that use AES as a hash function's compression function or let an
attacker influence the key; they do not matter for encryption with keys drawn at
random.

**Algebraic attacks do not work against AES.** AES can be written as a system
of quadratic equations; nobody can solve it, and the XSL claim of 2002 was
refuted (§7.5).

**Quantum computers halve the exponent, at best.** Grover's algorithm searches
$2^{128}$ keys in about $2^{64}$ sequential quantum steps, each a full AES
circuit, and it parallelizes badly; that is why long-term guidance prefers
AES-256, whose quantum cost stays near $2^{128}$
([Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)). Superposition-query
attacks such as quantum slides (§7.6) do not apply to AES, whose rounds differ.

**Implementations have been broken many times.** Cache-timing attacks on table
lookups, power analysis of smart cards, fault attacks: these recover AES keys in
practice ([Chapter 17](17-Side-Channels-the-Attackers-View.md), and book 1's
[Chapter 18](../../book/18-Side-Channels.md)). They are attacks on the way AES is
computed, not on the cipher, and constant-time code or hardware instructions stop
most of them.

**Misuse breaks systems that use AES.** Reused nonces in GCM, ECB mode,
unauthenticated CBC with a padding oracle: [Chapter 10](10-Attacks-on-Modes-and-MACs.md)
covers them. None is a weakness of AES.

**And "unbroken" is a statement about the public record, not a theorem.** There
is no proof that AES is secure; there is no proof that any practical cipher is.
What there is: an open design, chosen in public over three years from fifteen
candidates; a structure that makes resistance to differential and linear
attacks provable; and more than 25 years of attack by the best people in the
field, with the results above. The NSA has approved AES for classified
information since 2003 (AES-256 for TOP SECRET), which is a judgment from the one
organization whose own cryptanalysis is secret. Whether anyone knows more than
the public does is, by its nature, unknown, and should be said so.

The plain conclusion: if your AES is used with random keys, in a sound mode, in
constant-time code, the cipher is not where your system will fail.

## 7.11 Going deeper

*Level: expert.*

**The division property.** The letters A, C and B of §7.2 track properties by
hand. In 2015 Yosuke Todo generalized them into the **division property**, which
tracks, for a set of texts, which monomials of the output bits are guaranteed to
sum to zero, and propagates that knowledge through S-boxes using their algebraic
normal form. It found a six-round integral distinguisher for MISTY1 that led to
the first attack on the full MISTY1 (CRYPTO 2015), and, encoded as a
mixed-integer linear program (Zejun Xiang and colleagues, 2016) or a SAT
problem, it is now how integral properties are searched for. It is also the
engine behind modern cube attacks on stream ciphers
([Chapter 8](08-Attacks-on-Stream-Ciphers.md)).

**Five-round AES distinguishers.** Lorenzo Grassi, Christian Rechberger and
Sondre Rønjom (EUROCRYPT 2017) found that for certain structured sets of
plaintexts, the number of pairs whose ciphertexts after five rounds of AES
lie in a given subspace is always a **multiple of 8**: the first secret-key
distinguisher on five rounds independent of the key. Rønjom, Navid Ghaedi Bardeh
and Tor Helleseth's **yoyo** attacks (ASIACRYPT 2017) and Bardeh and Rønjom's
**exchange** attacks (2019) build on the same subspace view. None of them
reaches further than the older attacks, but they show that AES's structure still
yields new properties.

**Gröbner bases and complexity.** For a system of quadratic equations over
$\mathrm{GF}(2)$ in $n$ variables, the cost of F4 or F5 is governed by the
**degree of regularity**, the degree at which the linear algebra first finds the
solution. For random overdetermined systems it can be estimated, and for
structured systems, such as those from ciphers, it can be much lower. Estimating
it reliably for a given cipher is hard, which is why algebraic claims should be
tested on scaled-down versions, as Cid, Murphy and Robshaw's small-scale AES
family allows.

**The related-key model, carefully.** Mihir Bellare and Tadayoshi Kohno
formalized related-key security in 2003 and showed which classes of key
relations can be defended against at all: some relations (for example, ones
that let the attacker set key bits to chosen values) break any cipher. The
attacks of §7.7 use XOR differences, the class a good cipher can and should
resist.

**Bicliques with less data.** The biclique attack's $2^{88}$ chosen texts are a
consequence of putting the biclique near the ciphertext. Later work by Bogdanov
and colleagues moved it and accepted a slightly worse time to bring the data down
to a handful of texts, which shows that the "four times faster" result is a
property of the counting, not of the data.

**Quantum structural attacks.** If an attacker may query a cipher in quantum
superposition, Simon's algorithm finds hidden periods in polynomial time. Hidetaka
Kuwakado and Masakatu Morii used it in 2010 and 2012 to break the three-round
Feistel construction and the Even-Mansour cipher in that model, and Marc Kaplan,
Gaëtan Leurent, Anthony Leverrier and María Naya-Plasencia (CRYPTO 2016) turned
slide attacks and several MAC and mode attacks into polynomial-time quantum
attacks. The model is strong (a real attacker rarely gets superposition access
to someone else's key), but it is another reason modern designs avoid exact
self-similarity.

**Arithmetization-oriented ciphers.** Ciphers and hashes for zero-knowledge
proofs (MiMC, Poseidon, Rescue, Griffin, Anemoi and others) work over large prime
fields with power maps, exactly the setting of §7.4. For them, algebraic attacks
(interpolation, Gröbner bases, resultants) are the main threat, not differential
and linear cryptanalysis, and several designs lost rounds or were withdrawn
between 2019 and 2023 as the attacks improved. The Ethereum Foundation ran a
public prize program for such attacks in 2021 and 2022.

## Check yourself

??? question "1. In the Square attack, why is a byte that takes all 256 values balanced?"

    The XOR of all byte values from 0 to 255 is zero: each of the 8 bit positions
    is 1 in exactly 128 of them, an even number. So a byte that takes each value
    once has XOR sum zero over the set.

??? question "2. Which step of an AES round destroys the balanced property, and why?"

    SubBytes. XOR with a key and MixColumns are linear (over XOR), so they keep a
    zero sum zero. The S-box is nonlinear: knowing that $\bigoplus x_i = 0$ says
    nothing about $\bigoplus S(x_i)$.

??? question "3. With one $\Lambda$-set, a wrong key-byte guess in the 4-round attack survives with probability about 1/256. How many wrong guesses survive one set, over all 16 bytes? Two sets?"

    Each byte has 255 wrong guesses, so about $255/256 \approx 1$ per byte, about
    16 in total, after one set. After two sets each wrong guess survives with
    probability $2^{-16}$, so about $16 \times 255 / 65536 \approx 0.06$ in total.
    The run in §7.3 left 0, 2 and 1 wrong guesses for three bytes after one set and
    none after two.

??? question "4. Why does the 5-round Square attack guess one byte of MC⁻¹(K₄) instead of four bytes of K₄?"

    MixColumns is linear, so $\mathrm{MC}^{-1}(Y \oplus K_4) = \mathrm{MC}^{-1}(Y)
    \oplus \mathrm{MC}^{-1}(K_4)$. The attacker needs only one byte of the result
    to undo SubBytes on the target byte, and that byte depends on $Y$ (known
    after guessing four bytes of $K_5$) and on one byte of the equivalent key
    $\mathrm{MC}^{-1}(K_4)$. So 40 bits are guessed, not 64.

??? question "5. A cipher has 6 rounds of x ↦ (x + kᵢ)³ modulo the prime 65537, then a final key. How many known plaintexts does interpolation need?"

    The degree is $3^6 = 729$, so $730$ known plaintexts determine the
    polynomial. Seven independent 16-bit keys (112 bits) make no difference.

??? question "6. Why does a 4-bit S-box always satisfy at least 21 independent quadratic equations?"

    There are 37 monomials of degree at most 2 in 8 bits (1, the 8 bits, and the
    28 products of two). Evaluated on the 16 input-output pairs they give 37
    vectors of length 16, which span at most 16 dimensions, so at least
    $37 - 16 = 21$ independent combinations vanish on every pair.

??? question "7. In the slide attack on a Feistel cipher with 24-bit blocks, about how many known plaintexts are needed to expect four slid pairs?"

    About $N^2 / 2^{24}$ slid pairs exist among $N$ texts, so $N^2 = 4 \cdot 2^{24}$
    gives $N = 2^{13} = 8192$, the number used in §7.6.

??? question "8. A cipher adds a different round constant to the state in every round, but is otherwise exactly the toy of §7.6. Does the slide attack still work?"

    No. A slid pair needs round $i$ of one encryption to equal round $i + 1$ of
    the other, and with different constants they are different functions, so
    $P' = F(P)$ no longer implies $C' = F(C)$. That is why round constants are
    the standard fix.

??? question "9. The biclique attack on AES-128 costs about $2^{126.1}$. How many times faster than the average cost of brute force is it, and why does nobody care?"

    The average brute-force cost is $2^{127}$, so the ratio is $2^{0.9} \approx
    1.9$; against the full $2^{128}$ it is $2^{1.9} \approx 3.7$. Both numbers
    are far beyond any computation possible, and the attack needs $2^{88}$
    chosen texts under one key.

??? question "10. Explain in two sentences why the related-key attack on AES-256 does not threaten TLS."

    The attack needs encryptions under four keys with differences the attacker
    chooses, and TLS derives its keys with HKDF from a secret the attacker does
    not control, so no such keys exist. Even then it costs $2^{99.5}$ time and
    data, far beyond reach.

## What you learned

- Integral (Square) attacks follow the sum of a set of texts. A $\Lambda$-set
  becomes balanced in every byte after three rounds of AES; guessing one key byte
  per ciphertext byte then breaks 4-round AES with 768 chosen plaintexts, and
  guessing five bytes (plus a free round at the front) reaches 5 and 6 rounds.
  That attack set AES's round counts.
- Interpolation recovers a cipher whose rounds are low-degree polynomials from a
  few known plaintexts, and can peel its keys off one round at a time. Degree
  must grow beyond the field size, which is why MiMC-style ciphers need many
  rounds.
- Any cipher can be written as equations. The AES S-box satisfies 39 quadratic
  equations, but XL, XSL and Gröbner bases do not solve full AES, and the XSL
  claim of 2002 was refuted. SAT solvers break small and reduced ciphers and find
  characteristics; they do not threaten full modern ciphers.
- Slide attacks break ciphers with identical rounds regardless of the number of
  rounds, using about $2^{n/2}$ known plaintexts; round constants stop them.
  KeeLoq was their best-known victim.
- Related-key attacks break full AES-192 and AES-256 in a model proper use
  never offers; bicliques break full AES-128 by a factor of about four; the best
  single-key attacks with real gains reach 7 of 10 rounds of AES-128.
- "AES is unbroken" means: no practical or near-practical attack on the full
  cipher in the standard model after 25 years of public effort, a known margin of
  three rounds, and failures only in implementations and misuse.

**Next:** [Chapter 8](08-Attacks-on-Stream-Ciphers.md), where correlation,
algebraic and cube attacks meet LFSRs, RC4 and the ciphers of phones and Wi-Fi.

## Further reading

- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949).
- Martin Davis, George Logemann and Donald Loveland, "A Machine Program for
  Theorem-Proving", *Communications of the ACM* 5 (1962).
- Eli Biham, "New Types of Cryptanalytic Attacks Using Related Keys"
  (EUROCRYPT 1993; *Journal of Cryptology* 7, 1994).
- Xuejia Lai, "Higher Order Derivatives and Differential Cryptanalysis" (1994),
  and Lars Knudsen, "Truncated and Higher Order Differentials" (FSE 1994).
- Joan Daemen, Lars Knudsen and Vincent Rijmen, "The Block Cipher Square"
  (FSE 1997).
- Thomas Jakobsen and Lars Knudsen, "The Interpolation Attack on Block Ciphers"
  (FSE 1997).
- Alex Biryukov and David Wagner, "Slide Attacks" (FSE 1999) and "Advanced Slide
  Attacks" (EUROCRYPT 2000).
- Nicolas Courtois, Alexander Klimov, Jacques Patarin and Adi Shamir, "Efficient
  Algorithms for Solving Overdefined Systems of Multivariate Polynomial
  Equations" (EUROCRYPT 2000): XL.
- Fabio Massacci and Laura Marraro, "Logical Cryptanalysis as a SAT Problem",
  *Journal of Automated Reasoning* 24 (2000).
- Niels Ferguson, John Kelsey, Stefan Lucks, Bruce Schneier, Mike Stay, David
  Wagner and Doug Whiting, "Improved Cryptanalysis of Rijndael" (FSE 2000).
- Henri Gilbert and Marine Minier, "A Collision Attack on 7 Rounds of Rijndael"
  (Third AES Candidate Conference, 2000).
- FIPS 197, Advanced Encryption Standard (2001, updated 2023).
- Lars Knudsen and David Wagner, "Integral Cryptanalysis" (FSE 2002).
- Nicolas Courtois and Josef Pieprzyk, "Cryptanalysis of Block Ciphers with
  Overdefined Systems of Equations" (ASIACRYPT 2002): XSL.
- Sean Murphy and Matthew Robshaw, "Essential Algebraic Structure within the
  AES" (CRYPTO 2002): BES.
- Jean-Charles Faugère, "A New Efficient Algorithm for Computing Gröbner Bases
  without Reduction to Zero (F5)" (ISSAC 2002).
- Mihir Bellare and Tadayoshi Kohno, "A Theoretical Treatment of Related-Key
  Attacks" (EUROCRYPT 2003).
- Carlos Cid, Sean Murphy and Matthew Robshaw, "Small Scale Variants of the AES"
  (FSE 2005).
- Carlos Cid and Gaëtan Leurent, "An Analysis of the XSL Algorithm" (ASIACRYPT
  2005).
- Ilya Mironov and Lintao Zhang, "Applications of SAT Solvers to Cryptanalysis of
  Hash Functions" (SAT 2006).
- Chu-Wee Lim and Khoongming Khoo, "An Analysis of XSL Applied to BES" (FSE
  2007).
- Hüseyin Demirci and Ali Aydın Selçuk, "A Meet-in-the-Middle Attack on 8-Round
  AES" (FSE 2008).
- Nicolas Courtois, Gregory Bard and David Wagner, "Algebraic and Slide Attacks
  on KeeLoq" (FSE 2008).
- Sebastiaan Indesteege, Nathan Keller, Orr Dunkelman, Eli Biham and Bart
  Preneel, "A Practical Attack on KeeLoq" (EUROCRYPT 2008).
- Thomas Eisenbarth, Timo Kasper, Amir Moradi, Christof Paar, Mahmoud
  Salmasizadeh and Mohammad T. Manzuri Shalmani, "On the Power of Power
  Analysis in the Real World: A Complete Break of the KeeLoq Code Hopping
  Scheme" (CRYPTO 2008).
- Alex Biryukov, Dmitry Khovratovich and Ivica Nikolić, "Distinguisher and
  Related-Key Attack on the Full AES-256" (CRYPTO 2009).
- Alex Biryukov and Dmitry Khovratovich, "Related-Key Cryptanalysis of the Full
  AES-192 and AES-256" (ASIACRYPT 2009).
- Mate Soos, Karsten Nohl and Claude Castelluccia, "Extending SAT Solvers to
  Cryptographic Problems" (SAT 2009).
- Alex Biryukov, Orr Dunkelman, Nathan Keller, Dmitry Khovratovich and Adi
  Shamir, "Key Recovery Attacks of Practical Complexity on AES-256 Variants with
  up to 10 Rounds" (EUROCRYPT 2010).
- Orr Dunkelman, Nathan Keller and Adi Shamir, "Improved Single-Key Attacks on
  8-Round AES-192 and AES-256" (ASIACRYPT 2010).
- Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger, "Biclique
  Cryptanalysis of the Full AES" (ASIACRYPT 2011).
- Patrick Derbez, Pierre-Alain Fouque and Jérémy Jean, "Improved Key Recovery
  Attacks on Reduced-Round AES in the Single-Key Setting" (EUROCRYPT 2013).
- Yosuke Todo, "Structural Evaluation by Generalized Integral Property"
  (EUROCRYPT 2015) and "Integral Cryptanalysis on Full MISTY1" (CRYPTO 2015).
- Martin Albrecht, Lorenzo Grassi, Christian Rechberger, Arnab Roy and Tyge
  Tiessen, "MiMC: Efficient Encryption and Cryptographic Hashing with Minimal
  Multiplicative Complexity" (ASIACRYPT 2016).
- Marc Kaplan, Gaëtan Leurent, Anthony Leverrier and María Naya-Plasencia,
  "Breaking Symmetric Cryptosystems Using Quantum Period Finding" (CRYPTO 2016).
- Lorenzo Grassi, Christian Rechberger and Sondre Rønjom, "A New Structural-
  Differential Property of 5-Round AES" (EUROCRYPT 2017).
- Joan Daemen and Vincent Rijmen, *The Design of Rijndael*, 2nd edition
  (Springer, 2020).
