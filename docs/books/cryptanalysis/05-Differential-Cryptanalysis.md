# 5. Differential Cryptanalysis

*A modern block cipher is built so that no single equation ties its key to its
input and output. Differential cryptanalysis does not look for one. It sends
the cipher pairs of plaintexts that differ in a chosen way and watches how that
difference survives the rounds, because a difference is something the key
cannot hide. This chapter takes the method apart and puts it back together on a
16-bit cipher of our own: you will build its difference tables, find its best
characteristics by machine, and recover all 80 bits of its key from about nine
thousand chosen plaintexts. Then you will break a four-round FEAL with sixteen,
see why DES needed $2^{47}$, follow the attack's descendants (truncated,
impossible and boomerang differentials), and see how AES was designed so that
the whole family runs out of road.*

!!! abstract "In this chapter"
    **You will learn:**

    - why an XOR difference passes through key mixing untouched, and what an
      S-box does to it, read from its difference distribution table;
    - what a characteristic and a differential are, why their probabilities
      differ, and how to search for good ones by machine;
    - the last-round key-recovery attack, how its counters work, what the
      signal-to-noise ratio says, and how much data it needs;
    - how FEAL fell to a handful of chosen plaintexts, and how to do it in code;
    - why DES needed $2^{47}$ chosen plaintexts, and why IBM's 1974 S-boxes
      already resisted an attack the public learned of in 1990;
    - truncated and impossible differentials, the miss in the middle, and the
      boomerang and rectangle attacks;
    - the wide trail strategy: branch numbers, active S-boxes, and why AES is
      out of reach.

    **You need:** [Chapter 1](01-What-Cryptanalysis-Is.md) of this book (attack
    models, chosen plaintext, how an attack's cost is counted). From the
    cryptography book, [Chapter 6](../../book/06-Block-Ciphers.md) (S-boxes,
    substitution-permutation and Feistel networks, DES; its §6.8 runs a first,
    small differential attack) and [Chapter 7](../../book/07-AES.md) (the AES
    round, MixColumns and its branch number). XOR and hexadecimal.

    **Levels:** §5.1 and §5.2 are for beginners, §5.3 to §5.6 are
    intermediate, §5.7 to §5.9 are expert.

## 5.1 The problem

*Level: beginner.*

By the late 1980s the people who attacked block ciphers in public had a
problem. DES had been a federal standard since 1977. Its design was public,
every bit of it: the S-boxes, the permutations, the key schedule. Yet ten years
of open study had produced almost nothing better than trying every key. The
attacks that did exist were particular: a clever observation about one cipher,
useless on the next. A designer who wanted to know whether a new cipher was
strong had no test to run except to wait and see whether anyone broke it.

Meanwhile new ciphers kept arriving, because DES was slow in software and its
56-bit key was already looking short. In 1987 Akihiro Shimizu and Shoji
Miyaguchi of NTT, Japan's telephone company, published FEAL, the Fast data
Encipherment ALgorithm, designed to run quickly on the 8-bit processors of the
day. It had four rounds where DES had sixteen. Within a year it was broken; NTT
raised it to eight rounds, and that was broken too. Each break was its own
piece of work.

In 1990 Eli Biham and Adi Shamir, at the Weizmann Institute of Science in
Israel, changed that. Biham was Shamir's doctoral student, and their paper at
the CRYPTO conference that August gave the field a general method. It broke
DES reduced to fewer rounds, and it gave a way to measure the strength of any
number of DES rounds. Over the next year the same method broke FEAL in its
versions, the ciphers Khafre, REDOC-II, LOKI and Lucifer, and the hash
functions N-Hash and Snefru. In 1992 they pushed it to the full 16-round DES. The method was **differential
cryptanalysis**, and with linear cryptanalysis (the next chapter) it became the
yardstick every block cipher has been measured with since.

The attacker's position is the chosen-plaintext model of
[Chapter 1](01-What-Cryptanalysis-Is.md#13-attack-models): there is a device
that encrypts under a fixed, secret key, and the attacker may give it
plaintexts and read the ciphertexts. They know the cipher's design completely.
They want the key. Brute force tries every key and costs $2^{n}$ encryptions for
an $n$-bit key. Differential cryptanalysis trades that time for data: it needs
many chosen plaintexts, but its work is far smaller.

The idea fits in one sentence. **Do not look at single plaintexts; look at
pairs, and at how the two members of a pair differ.** The key does something
unknown to each plaintext, but it does the same unknown thing to both, and much
of it cancels when you compare them. What does not cancel is the effect of the
S-boxes, and an S-box, as you will see, is a predictable thing when you only
ask how it treats differences.

Book 1 ran a first differential attack in
[§6.8](../../book/06-Block-Ciphers.md#68-differential-cryptanalysis): one
characteristic, eight key bits. This chapter does the whole job: where
characteristics come from, why the probability you compute is not quite the one
you get, how many pairs an attack needs, and how to get from eight key bits to
all of them.

## 5.2 Differences through a cipher

*Level: beginner.*

Take two plaintexts $P$ and $P'$. Their **difference** is their XOR,

$$
\Delta P = P \oplus P',
$$

a string with a 1 wherever the two disagree. If $P$ = `0110` and $P'$ = `0011`
then $\Delta P$ = `0101`. Any operation in the cipher turns the pair
$(P, P')$ into a new pair, and the new pair has its own difference. The
question differential cryptanalysis asks of every part of a cipher is: **given
the difference going in, what is the difference coming out?** For the three
kinds of part a block cipher is built from, the answers are very different.

**Key mixing.** XOR the same round key $K$ into both members:

$$
(x \oplus K) \oplus (x' \oplus K) = x \oplus x'.
$$

The two copies of $K$ cancel. The difference comes out exactly as it went in,
whatever the key. This is the whole reason the method works: the part of the
cipher the attacker does not know is transparent to differences.

**Linear mixing.** A bit permutation moves each bit of the difference to its
new place, so the output difference is the permuted input difference. The same
holds for any map that is linear over XOR, like AES's MixColumns:
$M(x) \oplus M(x') = M(x \oplus x')$. The output difference is fixed by the
input difference, with probability 1.

**S-boxes.** Here the answer is uncertain, and it depends on the actual values,
not only on their difference. Take the 4-bit S-box this chapter uses, the one
from the lightweight cipher PRESENT (2007):

| $x$ | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | A | B | C | D | E | F |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| $S(x)$ | C | 5 | 6 | B | 9 | 0 | A | D | 3 | E | F | 8 | 4 | 7 | 1 | 2 |

Fix the input difference at $a$ = `B` (binary `1011`) and run through all 16
inputs $x$, pairing each with $x \oplus \texttt{B}$:

| $x$ | $x \oplus$ B | $S(x)$ | $S(x \oplus$ B$)$ | output difference |
|---|---|---|---|---|
| 0 | B | C | 8 | 4 |
| 1 | A | 5 | F | A |
| 2 | 9 | 6 | E | 8 |
| 3 | 8 | B | 3 | 8 |
| 4 | F | 9 | 2 | B |
| 5 | E | 0 | 1 | 1 |
| 6 | D | A | 7 | D |
| 7 | C | D | 4 | 9 |
| 8 | 3 | 3 | B | 8 |
| 9 | 2 | E | 6 | 8 |
| A | 1 | F | 5 | A |
| B | 0 | 8 | C | 4 |
| C | 7 | 4 | D | 9 |
| D | 6 | 7 | A | D |
| E | 5 | 1 | 0 | 1 |
| F | 4 | 2 | 9 | B |

Count the last column. Output difference `8` appears 4 times, and `1`, `4`,
`9`, `A`, `B` and `D` twice each. The other nine values never appear. So if a
pair enters this S-box with difference `B`, it leaves with difference `8` with
probability $4/16 = 1/4$, with difference `1` with probability $1/8$, and
never with difference `2`. The attacker does not know $x$; the key hides it.
But they do know these odds, since they hold for a random $x$, and a random $x$
is exactly what a random key produces.

Notice that the rows come in twins: $x$ = 0 and $x$ = B give the same pair the
other way round. That is why every count is even.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A difference passes through key mixing unchanged, is moved by a bit permutation, and is changed with some probability by an S-box" fill="currentColor" font-size="14">
<text x="110" y="24" text-anchor="middle" font-weight="bold">Key mixing</text>
<text x="320" y="24" text-anchor="middle" font-weight="bold">Bit permutation</text>
<text x="530" y="24" text-anchor="middle" font-weight="bold">S-box</text>
<text x="110" y="56" text-anchor="middle">Δ = 1011</text>
<text x="320" y="56" text-anchor="middle">Δ = 1011 0000</text>
<text x="530" y="56" text-anchor="middle">Δ = B</text>
<line x1="110" y1="64" x2="110" y2="92" stroke="currentColor" stroke-width="1.5"/>
<line x1="320" y1="64" x2="320" y2="92" stroke="currentColor" stroke-width="1.5"/>
<line x1="530" y1="64" x2="530" y2="92" stroke="currentColor" stroke-width="1.5"/>
<rect x="60" y="92" width="100" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="117" text-anchor="middle">⊕ K</text>
<rect x="270" y="92" width="100" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="117" text-anchor="middle">P</text>
<rect x="480" y="92" width="100" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="117" text-anchor="middle">S</text>
<line x1="110" y1="132" x2="110" y2="160" stroke="currentColor" stroke-width="1.5"/>
<line x1="320" y1="132" x2="320" y2="160" stroke="currentColor" stroke-width="1.5"/>
<line x1="530" y1="132" x2="530" y2="160" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="180" text-anchor="middle">Δ = 1011</text>
<text x="320" y="180" text-anchor="middle">bits moved</text>
<text x="530" y="180" text-anchor="middle">8 (p = 1/4), 1 (1/8), ...</text>
<text x="110" y="210" text-anchor="middle" opacity="0.7">always, any key</text>
<text x="320" y="210" text-anchor="middle" opacity="0.7">always</text>
<text x="530" y="210" text-anchor="middle" opacity="0.7">it depends on the values</text>
</svg>
<figcaption>Figure 5.1. What each part of a round does to a difference. Key mixing leaves it alone, so the unknown key drops out; a permutation or linear map moves it in a fixed way; only the S-box is uncertain, and its odds can be tabulated.</figcaption>
</figure>

### The difference distribution table

Do the count for every input difference $a$ and every output difference $b$
and you have the S-box's **difference distribution table** (DDT):

$$
\mathrm{DDT}[a][b] = \#\{\, x : S(x) \oplus S(x \oplus a) = b \,\},
\qquad
\Pr[a \to b] = \frac{\mathrm{DDT}[a][b]}{2^m}
$$

for an $m$-bit S-box. Row `B` is the one just worked out by hand.

```python
SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]

DDT = [[0] * 16 for _ in range(16)]
for x in range(16):
    for a in range(16):
        DDT[a][SBOX[x] ^ SBOX[x ^ a]] += 1

print("    " + " ".join(f"{b:x}" for b in range(16)))
for a in range(16):
    print(f"{a:x} | " + " ".join(str(n) if n else "." for n in DDT[a]))
print("largest entry for a nonzero input:", max(max(row) for row in DDT[1:]))
print("every entry even:", all(n % 2 == 0 for row in DDT for n in row))
print("possible outputs per input difference:", sorted({sum(1 for n in row if n) for row in DDT[1:]}))
```

It prints (input difference down the side, output across the top, dots for
zeros):

```
    0 1 2 3 4 5 6 7 8 9 a b c d e f
0 | 16 . . . . . . . . . . . . . . .
1 | . . . 4 . . . 4 . 4 . . . 4 . .
2 | . . . 2 . 4 2 . . . 2 . 2 2 2 .
3 | . 2 . 2 2 . 4 2 . . 2 2 . . . .
4 | . . . . . 4 2 2 . 2 2 . 2 . 2 .
5 | . 2 . . 2 . . . . 2 2 2 4 2 . .
6 | . . 2 . . . 2 . 2 . . 4 2 . . 4
7 | . 4 2 . . . 2 . 2 . . . 2 . . 4
8 | . . . 2 . . . 2 . 2 . 4 . 2 . 4
9 | . . 2 . 4 . 2 . 2 . . . 2 . 4 .
a | . . 2 2 . 4 . . 2 . 2 . . 2 2 .
b | . 2 . . 2 . . . 4 2 2 2 . 2 . .
c | . . 2 . . 4 . 2 2 2 2 . . . 2 .
d | . 2 4 2 2 . . 2 . . 2 2 . . . .
e | . . 2 2 . . 2 2 2 2 . . 2 2 . .
f | . 4 . . 4 . . . . . . . . . 4 4
largest entry for a nonzero input: 4
every entry even: True
possible outputs per input difference: [4, 6, 7, 8]
```

Everything about the S-box that matters to a differential attacker is in
this table. Some facts hold for every S-box:

- **Row 0 is 16 then zeros.** Equal inputs give equal outputs. A pair with no
  difference stays that way, with probability 1, through any S-box. An S-box
  with zero input difference is called **inactive**; one with a nonzero input
  difference is **active**. Only active S-boxes cost the attacker probability.
- **Each row sums to $2^m$**, since every $x$ lands somewhere.
- **Every entry is even**, because $x$ and $x \oplus a$ make the same pair.
- **Column 0 is zero outside row 0** when the S-box is a permutation: two
  different inputs cannot give the same output.

What varies between S-boxes is how lumpy the table is. The largest entry
outside row 0 is the S-box's **differential uniformity**, written $\delta$, and
the best probability any single S-box step can have is $\delta / 2^m$. For a
4-bit permutation the smallest possible $\delta$ is 4, and the PRESENT S-box
reaches it: no transition is better than $1/4$. Kaisa Nyberg, in 1993, named
the property and showed how to build S-boxes that achieve the minimum in larger
sizes; the AES S-box, $x \mapsto x^{-1}$ in $\mathrm{GF}(2^8)$ followed by an
affine map, has $\delta = 4$ out of 256, so no AES S-box step is better than
$2^{-6}$. The S-box of book 1's toy cipher, the first row of DES's S1, has an
entry of 8, a $1/2$ transition (it is in [§6.8](../../book/06-Block-Ciphers.md#68-differential-cryptanalysis)),
and that is why a single characteristic could break it so quickly.

The table also lists what is **impossible**. In row `B` nine output
differences have count zero. A pair with difference `B` going in can never
come out with difference `2`. Those zeros will matter in §5.7.

PRESENT's S-box has one more property its designers chose on purpose: look at
the rows and columns for the one-bit differences 1, 2, 4 and 8. Wherever both
input and output are a single bit, the table has a zero. A one-bit difference
in always leaves as two or more bits, and since the bit permutation sends the
bits of one S-box to different S-boxes, it then wakes at least two S-boxes in
the next round. A difference can never thread through the cipher one bit at a
time.

## 5.3 Characteristics and differentials

*Level: intermediate.*

To attack a whole cipher we have to follow differences through many rounds, so
we need a cipher. Here is the one this chapter breaks. Call it **Toy16**.

- **Block:** 16 bits, read as four 4-bit **nibbles**, numbered 0 to 3 from the
  left. In hexadecimal, `00B0` has `B` in nibble 2 and zeros elsewhere.
- **S-layer:** the PRESENT S-box above, applied to each nibble.
- **Permutation:** number the bits of nibble $n$ as $b = 0, 1, 2, 3$ from the
  left. Bit $b$ of nibble $n$ moves to bit $n$ of nibble $(n + b) \bmod 4$.
  Each output nibble gets exactly one bit from each input nibble, so one active
  S-box can reach every S-box of the next round.
- **Rounds:** four. Rounds 1 to 3 are: XOR a round key, S-layer, permutation.
  Round 4 is: XOR a round key, S-layer, XOR a final key. (The last permutation
  is left off because it would add nothing; anyone can undo it.)
- **Key:** five independent 16-bit round keys $K_0, \dots, K_4$, 80 bits in
  all. There is no key schedule; that makes the cipher a little easier to
  analyze and does not make the attack any easier.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="The Toy16 cipher: four rounds of key XOR, four 4-bit S-boxes and a bit permutation, with a final key XOR" fill="currentColor" font-size="14">
<text x="320" y="22" text-anchor="middle">plaintext P (16 bits)</text>
<line x1="320" y1="30" x2="320" y2="44" stroke="currentColor" stroke-width="1.5"/>
<rect x="180" y="44" width="280" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="61" text-anchor="middle">⊕ K0</text>
<rect x="180" y="76" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="252" y="76" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="324" y="76" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="396" y="76" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="212" y="94" text-anchor="middle">S</text><text x="284" y="94" text-anchor="middle">S</text><text x="356" y="94" text-anchor="middle">S</text><text x="428" y="94" text-anchor="middle">S</text>
<rect x="180" y="110" width="280" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 3"/>
<text x="320" y="127" text-anchor="middle">bit permutation</text>
<text x="490" y="94" opacity="0.7">round 1</text>
<rect x="180" y="146" width="280" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="163" text-anchor="middle">⊕ K1, S-layer, permutation</text>
<text x="490" y="163" opacity="0.7">round 2</text>
<rect x="180" y="180" width="280" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="197" text-anchor="middle">⊕ K2, S-layer, permutation</text>
<text x="490" y="197" opacity="0.7">round 3</text>
<line x1="320" y1="134" x2="320" y2="146" stroke="currentColor" stroke-width="1.5"/>
<line x1="320" y1="170" x2="320" y2="180" stroke="currentColor" stroke-width="1.5"/>
<line x1="320" y1="204" x2="320" y2="218" stroke="currentColor" stroke-width="1.5"/>
<text x="40" y="214" opacity="0.7">U: the difference here</text>
<text x="40" y="232" opacity="0.7">is what a 3-round</text>
<text x="40" y="250" opacity="0.7">characteristic predicts</text>
<line x1="176" y1="218" x2="464" y2="218" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3"/>
<rect x="180" y="218" width="280" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="235" text-anchor="middle">⊕ K3</text>
<rect x="180" y="250" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="252" y="250" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="324" y="250" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="396" y="250" width="64" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="212" y="268" text-anchor="middle">S</text><text x="284" y="268" text-anchor="middle">S</text><text x="356" y="268" text-anchor="middle">S</text><text x="428" y="268" text-anchor="middle">S</text>
<text x="490" y="268" opacity="0.7">round 4</text>
<rect x="180" y="284" width="280" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="301" text-anchor="middle">⊕ K4</text>
<line x1="320" y1="308" x2="320" y2="326" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="344" text-anchor="middle">ciphertext C</text>
<text x="320" y="380" text-anchor="middle" opacity="0.7">the attack guesses parts of K4, undoes the last S-boxes, and checks U</text>
</svg>
<figcaption>Figure 5.2. Toy16. Three full rounds, then a last round of key, S-boxes and key. A characteristic covers the first three rounds and predicts the difference U entering the last S-layer; the attack in §5.4 reaches U from the ciphertext side by guessing key bits.</figcaption>
</figure>

### A characteristic, by hand

A **differential characteristic** (or **trail**) is a list of differences, one
at each round boundary, together with the claim that a pair follows it. Its
probability is the product of the S-box transition probabilities along the way.
Here is one through the first three rounds of Toy16, starting from a plaintext
difference of `00B0`.

- **Round 1.** Only nibble 2 differs, by `B`. One active S-box. Take the
  transition $\texttt{B} \to \texttt{8}$, probability $4/16$. The S-layer output
  difference is `0080`: one bit, bit 0 of nibble 2. The permutation sends bit 0
  of nibble 2 to bit 2 of nibble 2, so the difference becomes `0020`.
- **Round 2.** Nibble 2 differs by `2`. Take $\texttt{2} \to \texttt{5}$,
  probability $4/16$. The S-layer output is `0050`, bits 1 and 3 of nibble 2,
  which the permutation sends to nibbles 3 and 1: `0202`.
- **Round 3.** Two active S-boxes, each with difference `2`. Take
  $\texttt{2} \to \texttt{5}$ in both, $(4/16)^2$. The output `0505` permutes
  to `5050`.

So the characteristic is

$$
\texttt{00B0} \xrightarrow{\;1/4\;} \texttt{0020} \xrightarrow{\;1/4\;} \texttt{0202}
\xrightarrow{\;1/16\;} \texttt{5050},
\qquad p = \frac{1}{4}\cdot\frac{1}{4}\cdot\frac{1}{16} = \frac{1}{256}.
$$

A random 16-bit difference would be `5050` with probability $1/65535$. The
characteristic says a plaintext pair with difference `00B0` reaches the input
of round 4 with difference `5050` 256 times more often than chance. A pair that
follows the characteristic is called a **right pair**; any other is a **wrong
pair**.

### Why multiply? Markov ciphers

The product rule hides an assumption. The probability of the round-2
transition was worked out for a random input to the S-box. But the input to
round 2 is not random; it is what round 1 produced. Is the round-2 transition
still $1/4$ for those pairs that survived round 1?

It is, on average over the keys, and the reason is the round key. Round 2 XORs
a fresh key $K_1$ into both members of the pair before its S-boxes. Whatever
values round 1 produced, the XOR with a uniformly random $K_1$ makes the S-box
input uniform, while leaving the difference alone. Xuejia Lai, James Massey and
Sean Murphy made this precise in 1991: a cipher is a **Markov cipher** if the
probability of each round's difference transition does not depend on the
plaintext, given a random round key. Toy16 with independent round keys is one,
and so is any substitution-permutation network keyed this way. For a Markov
cipher, averaged over independent random round keys, the probability of a
characteristic is exactly the product of its round probabilities.

For one fixed key, the real probability can differ, sometimes a lot. The
attacker is attacking one key, so the analysis rests on the **hypothesis of
stochastic equivalence** (the phrase is Lai's): for almost all keys, the
probability is close to the average. For Toy16 this is roughly true. Measured
over all 65,536 plaintexts for one random key, the differential from `0B00`
used below held for 288 of them where the average predicts 336; for ten other
random keys the count ranged from 320 to 416. That spread is why the attack in §5.4
asks for more data than the bare average says it needs.

### Differentials: many trails, one prediction

The attack in §5.4 will not check the middle differences `0020` and `0202`. It
cannot see them. It checks only that the pair entered with `00B0` and arrived
at round 4 with `5050`. Any trail with those two ends counts. The probability
that matters is therefore that of the **differential**, the pair of end
differences, which is the sum over all characteristics that share them:

$$
\Pr[\texttt{00B0} \to \texttt{5050}]
= \sum_{\text{trails } \Delta_0 = \texttt{00B0},\ \Delta_3 = \texttt{5050}}
\ \prod_{r=1}^{3} \Pr[\Delta_{r-1} \to \Delta_r].
$$

The program below lists every characteristic through three rounds of Toy16
from `00B0`, keeps those that end at `5050`, and adds them up, in exact
fractions.

```python
from fractions import Fraction
from itertools import product

SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
PERM = [4 * ((n + b) % 4) + n for n in range(4) for b in range(4)]

def perm(x):
    return sum(1 << 15 - PERM[p] for p in range(16) if x >> 15 - p & 1)

DDT = [[0] * 16 for _ in range(16)]
for x in range(16):
    for a in range(16):
        DDT[a][SBOX[x] ^ SBOX[x ^ a]] += 1

def one_round(d):                       # every (next difference, probability) after one round
    choices = []
    for s in (12, 8, 4, 0):
        a = d >> s & 15
        choices.append([(b << s, Fraction(DDT[a][b], 16)) for b in range(16) if DDT[a][b]])
    for pick in product(*choices):
        out, pr = 0, Fraction(1)
        for b, q in pick:
            out |= b
            pr *= q
        yield perm(out), pr

def trails(d, rounds):                  # every characteristic of the given length
    if rounds == 0:
        yield [d], Fraction(1)
        return
    for e, pr in one_round(d):
        for rest, q in trails(e, rounds - 1):
            yield [d] + rest, pr * q

hits = [(pr, path) for path, pr in trails(0x00B0, 3) if path[-1] == 0x5050]
hits.sort(reverse=True)
total = sum(pr for pr, _ in hits)
print("characteristics from 00b0 to 5050:", len(hits))
for pr, path in hits[:4]:
    print(" -> ".join(f"{d:04x}" for d in path), f" p = 1/{1 / pr}")
print("differential probability:", total, f"= 1/{float(1 / total):.1f}")
```

```
characteristics from 00b0 to 5050: 3
00b0 -> 0020 -> 0202 -> 5050  p = 1/256
00b0 -> 0200 -> 0404 -> 5050  p = 1/1024
00b0 -> 2020 -> 0a0a -> 5050  p = 1/2048
differential probability: 11/2048 = 1/186.2
```

The trail found by hand is the best of three. The other two take
$\texttt{B} \to \texttt{1}$ or $\texttt{B} \to \texttt{A}$ in round 1, each with
probability $1/8$, and reach the same end by other roads. Together they lift
the probability from $1/256$ to $11/2048$, about $1/186$: 38 percent more right
pairs than the single trail promises, for free. This effect is called
**clustering**, and in real ciphers it can be large. It also cuts the other
way for a defender: a bound on the best characteristic is not a bound on the
best differential, a gap that §5.8 comes back to.

### Searching by machine

Enumerating trails one by one explodes as the rounds grow. A better way to
get the differential probability is to carry a whole probability distribution
over differences through the cipher: start with all the weight on the input
difference, push it through each S-box with the DDT and through the
permutation, and after $r$ rounds read off the probability of every output
difference at once. Because each S-box acts on its own nibble, the update can
be done one nibble at a time.

The attack in §5.4 needs differentials of a particular shape: the output
difference (at the input of the last S-layer) must touch only two nibbles,
because the attacker will guess the key bits over those nibbles, and it must
touch both, or the guess of the untouched nibble cannot be tested. The program
tries every input difference with one active S-box and keeps the best for each
pair of nibbles, $\{0, 2\}$ and $\{1, 3\}$, over 3, 2 and 1 rounds. (It takes
about ten seconds.)

```python
SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
PERM = [4 * ((n + b) % 4) + n for n in range(4) for b in range(4)]

def perm(x):
    return sum(1 << 15 - PERM[p] for p in range(16) if x >> 15 - p & 1)

DDT = [[0] * 16 for _ in range(16)]
for x in range(16):
    for a in range(16):
        DDT[a][SBOX[x] ^ SBOX[x ^ a]] += 1

def differential(din, rounds):          # probability of each difference after some rounds
    v = {din: 1.0}
    for _ in range(rounds):
        for s in (12, 8, 4, 0):         # one S-box at a time
            w = {}
            for d, pr in v.items():
                a = d >> s & 15
                for b in range(16):
                    if DDT[a][b]:
                        e = d & ~(15 << s) | b << s
                        w[e] = w.get(e, 0) + pr * DDT[a][b] / 16
            v = w
        v = {perm(d): pr for d, pr in v.items()}
    return v

for rounds in (3, 2, 1):
    best = {0xF0F0: (0, 0, 0), 0x0F0F: (0, 0, 0)}
    for n in range(4):                  # inputs with one active S-box
        for a in range(1, 16):
            din = a << 12 - 4 * n
            for dout, pr in differential(din, rounds).items():
                for mask in best:       # output in exactly the two nibbles of the mask
                    hit = all((dout >> s & 15) != 0 for s in (0, 4, 8, 12) if mask >> s & 15)
                    if dout & ~mask == 0 and hit and pr > best[mask][0]:
                        best[mask] = (pr, din, dout)
    for mask, (pr, din, dout) in best.items():
        print(f"{rounds} rounds, nibbles {mask:04x}: {din:04x} -> {dout:04x}, p = 1/{1 / pr:.1f}")
```

```
3 rounds, nibbles f0f0: 00b0 -> 5050, p = 1/186.2
3 rounds, nibbles 0f0f: 0b00 -> 0a0a, p = 1/195.0
2 rounds, nibbles f0f0: 0b00 -> 4040, p = 1/16.0
2 rounds, nibbles 0f0f: 0700 -> 0808, p = 1/16.0
1 rounds, nibbles f0f0: 0200 -> 4040, p = 1/4.0
1 rounds, nibbles 0f0f: 2000 -> 0808, p = 1/4.0
```

The first line is our differential. The second covers the other two nibbles,
so together they will reveal all 16 bits of the last round key. The shorter
ones will be needed once the last round is peeled off.

This is a small instance of a big business. For DES, Mitsuru Matsui gave a
branch-and-bound search in 1994 that finds the best characteristic for any
number of rounds, and modern tools hand the search to mixed-integer linear
programming or SAT solvers (§5.9). The question is always the same as here:
which input difference, which output difference, and how likely.

## 5.4 The last-round attack

*Level: intermediate.*

A characteristic is a distinguisher: it says that ciphertext pairs from Toy16
behave in a way they would not if the cipher were a random permutation. The
attack turns that into key bits. The differential `00B0` $\to$ `5050` covers
rounds 1 to 3 and makes a prediction about the difference $\Delta U$ entering
the last S-layer. The attacker cannot see $U$, but they can reach it from the
other side:

$$
U = S^{-1}(C \oplus K_4) \oplus K_3 ,
\qquad
\Delta U = S^{-1}(C \oplus K_4) \oplus S^{-1}(C' \oplus K_4).
$$

$K_3$ cancels in the difference, as keys do. $K_4$ does not, because it sits
on the far side of an S-box. So guess the bits of $K_4$ that matter, compute
$\Delta U$ for each pair under that guess, and count how often it equals the
predicted `5050`. Only nibbles 0 and 2 of $\Delta U$ are nonzero, so only
nibbles 0 and 2 of $K_4$ need guessing: 8 bits, 256 guesses. For the right
guess, every right pair gives `5050`, and a right pair turns up about once in
186. For a wrong guess the S-box is undone with the wrong key and the result
is close to random. Counting separates them.

### Filtering

Most pairs can be thrown away before any guessing. In a right pair, nibbles 1
and 3 of $\Delta U$ are zero, so those last-round S-boxes are inactive, and the
ciphertext difference in nibbles 1 and 3 is zero too: an inactive S-box gives
equal outputs, and $K_4$ cancels. A pair whose ciphertexts differ in nibble 1
or 3 cannot be right. That one test keeps only $1/256$ of the wrong pairs.

A second test uses the DDT. Nibble 0 of a right pair entered its last S-box
with difference 5, so it left with one of the differences in row 5 of the
table: `1`, `4`, `9`, `A`, `B`, `C` or `D`. A pair whose ciphertext differs in
nibble 0 by, say, `2` is wrong. This keeps $7/16$ of what is left in each of
the two nibbles.

### Counting, by hand

Take one surviving pair whose nibble-0 ciphertext values are `3` and `F`, a
difference of `C`. Which values $k$ of nibble 0 of $K_4$ make
$S^{-1}(\texttt{3} \oplus k) \oplus S^{-1}(\texttt{F} \oplus k) = \texttt{5}$?
Try them: $k$ = `3` gives $S^{-1}(\texttt{0}) \oplus S^{-1}(\texttt{C}) =
\texttt{5} \oplus \texttt{0} = \texttt{5}$. Yes. Going through all 16, the ones
that work are `3`, `6`, `A` and `F`: four of them, which is
$\mathrm{DDT}[5][\texttt{C}]$, as it must be. Each pair **suggests** a small
set of keys for each nibble, and the counter of every 8-bit guess in the
product of the two sets goes up by one. A right pair always suggests the right
key, among others. A wrong pair suggests a handful of keys that have nothing to
do with the real one. After enough pairs, the right key has been suggested by
every right pair and stands out of the noise.

### Signal to noise

How many pairs are enough? Biham and Shamir measured it with a
**signal-to-noise ratio**: the number of times the right key is counted,
divided by the average number of times a wrong key is counted. With $N$ pairs:

- the right key is counted about $N p$ times, one for each right pair, where
  $p$ is the differential's probability;
- the pairs that survive the filters number about $N \beta$, where $\beta$ is
  the fraction a filter lets through, and each suggests on average $\alpha$ of
  the $2^k$ guesses for $k$ key bits, so an average key is counted
  $N \beta \alpha / 2^k$ times.

Dividing,

$$
S/N = \frac{N p}{N \alpha \beta / 2^{k}} = \frac{2^{k}\, p}{\alpha\, \beta}.
$$

$N$ cancels: the ratio is a property of the attack, not of how much data it
has. For our first step, $k = 8$, $p = 11/2048$, and with both filters
$\beta = 2^{-8}\,(7/16)^2$, while a kept pair suggests on average
$\alpha = (16/7)^2$ keys (each of the seven allowed nibble differences has an
average DDT entry of $16/7$). So

$$
S/N = \frac{2^{8} \cdot 11/2048}{(16/7)^2 \cdot 2^{-8} (7/16)^2}
= 2^{16} \cdot \frac{11}{2048} \approx 352 .
$$

(The filters change $\alpha$ and $\beta$ in opposite directions and leave the
ratio alone. They save work, not data.) When the ratio is large, a few right
pairs are enough, because wrong keys almost never collect more than one or two
counts. Biham and Shamir's rule of thumb was that with $S/N$ well above 1,
about three or four right pairs suffice, which here means $N \approx 4/p
\approx 750$ pairs. When the ratio is near or below 1, the right key drowns,
and far more data is needed, if the attack works at all.

The cost of the attack is then:

- **Data:** $N \approx c/p$ chosen-plaintext pairs, with $c$ a small constant
  that grows as $S/N$ falls. The probability $p$ of the differential is the
  whole story: halve it and the data doubles.
- **Time:** for each kept pair, try $2^k$ guesses. With good filters this is
  far less than $N \cdot 2^k$.
- **Memory:** $2^k$ counters.

### Code it: all 80 bits

The program below does the complete attack. It holds a secret key in an
oracle, asks it for chosen plaintexts only, and recovers all five round keys.

1. With the two 3-round differentials from §5.3, it counts guesses for nibbles
   0 and 2, then 1 and 3, of $K_4$: 16 bits.
2. Knowing $K_4$, it **peels** the last round off: it undoes $K_4$ and the last
   S-layer on every ciphertext, and undoes the permutation as well, which
   leaves a 3-round cipher of the same shape whose last key is $P^{-1}(K_3)$.
   It attacks that with the 2-round differentials.
3. Again, with the 1-round differentials, for $P^{-1}(K_2)$.
4. One round is left: $c = S(p \oplus K_0) \oplus P^{-1}(K_1)$. It encrypts
   `0000`, `1111`, ..., `FFFF` and, nibble by nibble, finds the one value of
   $K_0$ for which $S(p \oplus K_0) \oplus c$ comes out the same for all 16.

```python
import random

SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
INV = [SBOX.index(v) for v in range(16)]
PERM = [4 * ((n + b) % 4) + n for n in range(4) for b in range(4)]
PINV = [PERM.index(p) for p in range(16)]

def sub(x, box=SBOX):
    return sum(box[x >> s & 15] << s for s in (12, 8, 4, 0))

def perm(x, table=PERM):
    return sum(1 << 15 - table[p] for p in range(16) if x >> 15 - p & 1)

def encrypt(p, k):                      # len(k) - 1 rounds; the last has no perm
    x = p
    for r in range(len(k) - 2):
        x = perm(sub(x ^ k[r]))
    return sub(x ^ k[-2]) ^ k[-1]

# The differentials found by the search in section 5.3: rounds covered, input, output
TABLE = {3: [(0x00B0, 0x5050), (0x0B00, 0x0A0A)],
         2: [(0x0B00, 0x4040), (0x0700, 0x0808)],
         1: [(0x0200, 0x4040), (0x2000, 0x0808)]}

def last_key(oracle, rounds, npairs, rng):
    key = 0
    for nibbles, (din, dout) in zip(((0, 2), (1, 3)), TABLE[rounds - 1]):
        shifts = [12 - 4 * n for n in nibbles]
        count = [0] * 256
        for _ in range(npairs):
            p = rng.getrandbits(16)
            c1, c2 = oracle(p), oracle(p ^ din)
            if (c1 ^ c2) & ~sum(15 << s for s in shifts) & 0xFFFF:
                continue                # a nibble that should not differ does: wrong pair
            for g in range(256):
                kg = (g >> 4) << shifts[0] | (g & 15) << shifts[1]
                if sub(c1 ^ kg, INV) ^ sub(c2 ^ kg, INV) == dout:
                    count[g] += 1
        g = max(range(256), key=count.__getitem__)
        print(f"{rounds} rounds, {din:04x} -> {dout:04x}: best guess {g:02x}"
              f" counted {count[g]}, next best {sorted(count)[-2]}")
        key |= (g >> 4) << shifts[0] | (g & 15) << shifts[1]
    return key

rng = random.Random(5)
k = [rng.getrandbits(16) for _ in range(5)]
queries = 0
def oracle(p):
    global queries
    queries += 1
    return encrypt(p, k)

peel = []                               # last keys found so far, outermost first
def reduced(p):                         # the cipher with the found rounds taken off
    c = oracle(p)
    for kl in peel:
        c = perm(sub(c ^ kl, INV), PINV)
    return c
for rounds, npairs in ((4, 2000), (3, 200), (2, 50)):
    kl = last_key(reduced, rounds, npairs, rng)
    peel.append(kl)
# one round left: c = S(p ^ k0) ^ k1'. Encrypt 0000, 1111, ..., FFFF; the right
# nibble of k0 makes S(p ^ k0) ^ c the same for all sixteen
cs = [reduced(0x1111 * v) for v in range(16)]
k0 = 0
for s in (12, 8, 4, 0):
    for g in range(16):
        if len({SBOX[v ^ g] ^ (c >> s & 15) for v, c in enumerate(cs)}) == 1:
            k0 |= g << s
k1 = cs[0] ^ sub(k0)
# turn the peeled keys back into the real round keys
rec = [k0, perm(k1), perm(peel[2]), perm(peel[1]), peel[0]]
print("found :", " ".join(f"{x:04x}" for x in rec))
print("actual:", " ".join(f"{x:04x}" for x in k))
print("chosen plaintexts used:", queries)
```

```
4 rounds, 00b0 -> 5050: best guess c9 counted 18, next best 6
4 rounds, 0b00 -> 0a0a: best guess b1 counted 10, next best 6
3 rounds, 0b00 -> 4040: best guess 71 counted 16, next best 8
3 rounds, 0700 -> 0808: best guess 56 counted 11, next best 5
2 rounds, 0200 -> 4040: best guess ea counted 9, next best 4
2 rounds, 2000 -> 0808: best guess ee counted 13, next best 7
found : 9f76 4164 bde5 5bc8 cb91
actual: 9f76 4164 bde5 5bc8 cb91
chosen plaintexts used: 9016
```

All 80 bits, from 9,016 chosen plaintexts and a few hundred thousand S-box
lookups, where brute force would try up to $2^{80}$ keys. Look at the counts.
In the first step the right guess `c9` was counted 18 times, against an
expectation of $2000 \cdot 11/2048 \approx 10.7$ (this key happens to favor the
differential); the best wrong guess, 6. In the second, the margin is thinner,
10 against 6: this key gives the `0B00` differential only 288 chances in
65,536, below the average 336, which is why the program asks for 2,000 pairs
and not the 750 the rule of thumb suggests. The later steps are cheap because
shorter differentials are far more likely: $1/16$ over two rounds, $1/4$ over
one.

A word on scale. Toy16 has a 16-bit block, so its whole codebook is 65,536
entries, and an attacker who could ask for all of them would not need any
cleverness to decrypt. The attack is interesting because it recovers the
**key**, and because its cost, $c/p$ pairs and $2^k$ counters, grows with the
cipher's resistance and not with its block or key size. On DES, those same
quantities are $2^{47}$ and a few million counters, against a key space of
$2^{56}$ and a codebook of $2^{64}$.

### How much data, measured

The rule "a few right pairs" can be tested. The next program runs only the
first step, 8 bits of $K_4$, a hundred times for each amount of data, with a
fresh random key each time, and counts how often the right key comes out alone
on top.

```python
import random

SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
INV = [SBOX.index(v) for v in range(16)]
PERM = [4 * ((n + b) % 4) + n for n in range(4) for b in range(4)]

def sub(x, box=SBOX):
    return sum(box[x >> s & 15] << s for s in (12, 8, 4, 0))

def perm(x):
    return sum(1 << 15 - PERM[p] for p in range(16) if x >> 15 - p & 1)

def encrypt(p, k):
    for r in range(3):
        p = perm(sub(p ^ k[r]))
    return sub(p ^ k[3]) ^ k[4]

DIN, DOUT = 0x00B0, 0x5050              # 3-round differential, p = 11/2048
GOOD = {SBOX[x] ^ SBOX[x ^ 5] for x in range(16)}   # what difference 5 can become

def trial(npairs, rng):
    k = [rng.getrandbits(16) for _ in range(5)]
    count = [0] * 256
    kept = 0
    for _ in range(npairs):
        p = rng.getrandbits(16)
        c1, c2 = encrypt(p, k), encrypt(p ^ DIN, k)
        d = c1 ^ c2
        if d & 0x0F0F or (d >> 12) not in GOOD or (d >> 4 & 15) not in GOOD:
            continue                    # cannot be a right pair
        kept += 1
        for g in range(256):
            kg = (g >> 4) << 12 | (g & 15) << 4
            if sub(c1 ^ kg, INV) ^ sub(c2 ^ kg, INV) == DOUT:
                count[g] += 1
    right = (k[4] >> 12) << 4 | k[4] >> 4 & 15
    best = max(count)                   # a win: the right key alone on top
    return count[right] == best and count.count(best) == 1, kept

rng = random.Random(42)
for npairs in (50, 100, 200, 400, 800, 1600):
    results = [trial(npairs, rng) for _ in range(100)]
    wins = sum(w for w, _ in results)
    kept = sum(n for _, n in results) / 100
    print(f"{npairs:5} pairs: right pairs expected {npairs * 11 / 2048:4.1f},"
          f" pairs kept {kept:5.1f}, key found {wins}/100")
```

```
   50 pairs: right pairs expected  0.3, pairs kept   0.2, key found 1/100
  100 pairs: right pairs expected  0.5, pairs kept   0.6, key found 7/100
  200 pairs: right pairs expected  1.1, pairs kept   1.5, key found 19/100
  400 pairs: right pairs expected  2.1, pairs kept   2.7, key found 43/100
  800 pairs: right pairs expected  4.3, pairs kept   5.5, key found 84/100
 1600 pairs: right pairs expected  8.6, pairs kept  10.6, key found 96/100
```

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Bar chart: the attack's success rate rises from 1 percent with 50 pairs to 96 percent with 1600 pairs" fill="currentColor" font-size="14">
<line x1="70" y1="220" x2="610" y2="220" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="40" x2="70" y2="220" stroke="currentColor" stroke-width="1.5"/>
<text x="62" y="224" text-anchor="end">0</text>
<text x="62" y="134" text-anchor="end">50</text>
<text x="62" y="44" text-anchor="end">100</text>
<line x1="70" y1="130" x2="610" y2="130" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
<line x1="70" y1="40" x2="610" y2="40" stroke="currentColor" stroke-width="0.5" opacity="0.4"/>
<rect x="95" y="218.2" width="56" height="1.8"/>
<rect x="183" y="207.4" width="56" height="12.6"/>
<rect x="271" y="185.8" width="56" height="34.2"/>
<rect x="359" y="142.6" width="56" height="77.4"/>
<rect x="447" y="68.8" width="56" height="151.2"/>
<rect x="535" y="47.2" width="56" height="172.8"/>
<text x="123" y="210" text-anchor="middle">1</text>
<text x="211" y="200" text-anchor="middle">7</text>
<text x="299" y="178" text-anchor="middle">19</text>
<text x="387" y="135" text-anchor="middle">43</text>
<text x="475" y="62" text-anchor="middle">84</text>
<text x="563" y="41" text-anchor="middle">96</text>
<text x="123" y="240" text-anchor="middle">50</text>
<text x="211" y="240" text-anchor="middle">100</text>
<text x="299" y="240" text-anchor="middle">200</text>
<text x="387" y="240" text-anchor="middle">400</text>
<text x="475" y="240" text-anchor="middle">800</text>
<text x="563" y="240" text-anchor="middle">1600</text>
<text x="340" y="268" text-anchor="middle">chosen-plaintext pairs (right pairs expected: N × 11/2048)</text>
<text x="20" y="130" text-anchor="middle" transform="rotate(-90 20 130)">keys found, of 100</text>
</svg>
<figcaption>Figure 5.3. The first step of the attack on Toy16, run 100 times at each amount of data. Success climbs steeply once the expected number of right pairs passes two or three: data needed is a small multiple of 1/p.</figcaption>
</figure>

With about one right pair expected, the attack mostly fails: one right pair
suggests about five keys, the right one among them, and they tie. With two,
it works less than half the time; with four, 84 times in 100; with eight, 96.
This is the shape Biham and Shamir's rule describes, and it is the shape of
every statistical attack in this book: success is a function of the expected
number of right pairs, $Np$, and of the signal-to-noise ratio, and once $S/N$
is large it is $Np$ alone that matters. Ali Aydın Selçuk turned this into a
formula in 2008 (§5.9).

Two refinements are worth knowing. **Structures**: a set of plaintexts can
supply many pairs at once. Encrypt all 16 values of nibble 2 with the rest
fixed and you have 120 pairs, with every input difference that has only nibble
2 active, for 16 encryptions; eight of those pairs have difference `00B0`
exactly. Biham and Shamir used structures to cut the data of the DES attack
by a large factor. **Several differentials at once**: pairs that fail one
differential may serve another, and counts from differentials that share key
bits can be added.

## 5.5 FEAL's fall

*Level: intermediate.*

FEAL was born to be fast. Akihiro Shimizu and Shoji Miyaguchi of NTT presented
it at EUROCRYPT 1987 as a cipher for the small 8-bit processors in terminals
and smart cards, where DES's bit permutations were painful. Like DES it had a
64-bit block, a 64-bit key and a Feistel structure, but its round function used
only byte additions, XORs and 2-bit rotations, and it had just four rounds.

It did not last. Bert den Boer showed a chosen-plaintext attack on the
four-round version at EUROCRYPT 1988. NTT doubled the rounds to make FEAL-8;
Henri Gilbert and Guy Chassé attacked FEAL-8 with a statistical
chosen-plaintext method at CRYPTO 1990. In 1990 Sean Murphy, at Royal Holloway,
published "The cryptanalysis of FEAL-4 with 20 chosen plaintexts", and then
Biham and Shamir, applying their new method, broke FEAL-4 with 8 chosen
plaintexts and FEAL-8 with about 2,000. NTT answered with FEAL-N, any number of
rounds, and FEAL-NX, with a 128-bit key; Biham and Shamir showed that
differential cryptanalysis beat brute force on FEAL-N for any number of rounds
up to 31. In 1992 Matsui and Atsuhiro Yamagishi broke FEAL-4 with only 5
**known** plaintexts, a result that led straight to linear cryptanalysis
(the next chapter). FEAL became the cipher every cryptanalysis student breaks.
Here is why it fell so easily.

### The round function

FEAL's only nonlinear step is an 8-bit addition followed by a rotation:

$$
G_d(a, b) = \mathrm{ROL}_2\big( (a + b + d) \bmod 256 \big), \qquad d \in \{0, 1\}.
$$

The round function $F$ takes four bytes $x_0 x_1 x_2 x_3$ and computes

$$
\begin{aligned}
f_1 &= G_1(x_0 \oplus x_1,\ x_2 \oplus x_3), &
f_2 &= G_0(x_2 \oplus x_3,\ f_1), \\
f_0 &= G_0(x_0,\ f_1), &
f_3 &= G_1(x_3,\ f_2).
\end{aligned}
$$

Addition looks nonlinear, and for most differences it is: a difference in a
low bit may or may not carry into the bits above it. But the **top** bit is
special. Flipping bit 7 of one input of an 8-bit addition flips bit 7 of the
sum, always, since any carry out of bit 7 is thrown away. So an input
difference of `80` gives an output difference of `80`, with probability 1, and
after the rotation, `02`.

Now feed $F$ the difference `80800000`: bytes $x_0$ and $x_1$ both differ by
`80`. Then $x_0 \oplus x_1$ does not differ at all, $x_2 \oplus x_3$ does not
either, so $f_1$ and $f_2$ are identical for the two inputs. Only $f_0 =
G_0(x_0, f_1)$ sees a difference, the `80` in $x_0$, and turns it into `02`.
And $f_3$ sees none. So

$$
F(x) \oplus F(x \oplus \texttt{80800000}) = \texttt{02000000}
\quad\text{for every } x .
$$

A differential with probability 1. Compare the best S-box step of Toy16, $1/4$.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="FEAL's round function with input difference 80 80 00 00: the two differences cancel in the middle, and only the left output byte differs, by 02" fill="currentColor" font-size="14">
<text x="110" y="24" text-anchor="middle">x0: Δ 80</text>
<text x="250" y="24" text-anchor="middle">x1: Δ 80</text>
<text x="390" y="24" text-anchor="middle">x2: Δ 00</text>
<text x="530" y="24" text-anchor="middle">x3: Δ 00</text>
<line x1="110" y1="32" x2="110" y2="216" stroke="currentColor" stroke-width="1.5"/>
<line x1="530" y1="32" x2="530" y2="216" stroke="currentColor" stroke-width="1.5"/>
<line x1="250" y1="32" x2="250" y2="60" stroke="currentColor" stroke-width="1.5"/>
<line x1="390" y1="32" x2="390" y2="60" stroke="currentColor" stroke-width="1.5"/>
<line x1="110" y1="74" x2="236" y2="74" stroke="currentColor" stroke-width="1"/>
<line x1="530" y1="74" x2="404" y2="74" stroke="currentColor" stroke-width="1"/>
<circle cx="250" cy="74" r="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="250" y="79" text-anchor="middle">⊕</text>
<circle cx="390" cy="74" r="12" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="79" text-anchor="middle">⊕</text>
<text x="250" y="106" text-anchor="middle" opacity="0.7">Δ 00</text>
<text x="390" y="106" text-anchor="middle" opacity="0.7">Δ 00</text>
<line x1="250" y1="86" x2="250" y2="120" stroke="currentColor" stroke-width="1.5"/>
<line x1="390" y1="86" x2="390" y2="120" stroke="currentColor" stroke-width="1.5"/>
<rect x="210" y="120" width="80" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="250" y="141" text-anchor="middle">G1 → f1</text>
<rect x="350" y="120" width="80" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="141" text-anchor="middle">G0 → f2</text>
<line x1="290" y1="136" x2="350" y2="136" stroke="currentColor" stroke-width="1"/>
<line x1="250" y1="152" x2="250" y2="270" stroke="currentColor" stroke-width="1.5"/>
<line x1="390" y1="152" x2="390" y2="270" stroke="currentColor" stroke-width="1.5"/>
<line x1="250" y1="200" x2="150" y2="230" stroke="currentColor" stroke-width="1"/>
<line x1="390" y1="200" x2="490" y2="230" stroke="currentColor" stroke-width="1"/>
<rect x="70" y="216" width="80" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="237" text-anchor="middle">G0 → f0</text>
<rect x="490" y="216" width="80" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="237" text-anchor="middle">G1 → f3</text>
<line x1="110" y1="248" x2="110" y2="270" stroke="currentColor" stroke-width="1.5"/>
<line x1="530" y1="248" x2="530" y2="270" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="290" text-anchor="middle" font-weight="bold">Δ 02</text>
<text x="250" y="290" text-anchor="middle">Δ 00</text>
<text x="390" y="290" text-anchor="middle">Δ 00</text>
<text x="530" y="290" text-anchor="middle">Δ 00</text>
</svg>
<figcaption>Figure 5.4. FEAL's F with input difference 80 80 00 00. The two top-bit differences cancel in x0 ⊕ x1, so the middle bytes see nothing; only f0 = G0(x0, f1) sees the 80, which an addition passes on unchanged and the rotation turns into 02. Probability 1.</figcaption>
</figure>

### The attack, round by round

We attack a four-round FEAL in the form many courses use: FEAL's real $F$, its
input mixing, and six independent 32-bit subkeys $K_0, \dots, K_5$ in place of
FEAL's key schedule (the real cipher feeds 16-bit subkeys into $F$ in a slightly
different place and has an output transformation as well; neither changes the
attack). Encryption is

$$
L_0 = P_L \oplus K_4,\quad R_0 = P_L \oplus P_R \oplus K_4 \oplus K_5,\qquad
L_{i+1} = R_i,\quad R_{i+1} = L_i \oplus F(R_i \oplus K_i),
$$

for $i = 0, \dots, 3$, and the ciphertext is $(L_4, R_4)$.

Choose plaintext pairs with difference $\Delta P$ = `80800000 80800000`. Then
$\Delta L_0$ = `80800000` and $\Delta R_0 = \Delta P_L \oplus \Delta P_R = 0$.
Follow it down:

| After round | $\Delta L$ | $\Delta R$ | Why |
|---|---|---|---|
| 0 (input) | `80800000` | `00000000` | the input mixing |
| 1 | `00000000` | `80800000` | $F$ sees no difference |
| 2 | `80800000` | `02000000` | $F$: `80800000` $\to$ `02000000`, probability 1 |
| 3 | `02000000` | ? | $F$ sees `02000000`: output unknown |
| 4 | ? | ? | |

Three rounds in, $\Delta L_3$ = `02000000` is known for certain. In round 4,
$R_4 = L_3 \oplus F(R_3 \oplus K_3)$ and $R_3 = L_4$, which is in the
ciphertext. So for the right $K_3$, every pair satisfies

$$
F(L_4 \oplus K_3) \oplus F(L_4' \oplus K_3) = \Delta R_4 \oplus \texttt{02000000}.
$$

Every pair is a right pair; the attack only needs enough of them to pin $K_3$
down. Guessing 32 bits at once would be slow in Python, but $F$'s shape lets us
split it. The middle bytes $f_1, f_2$ depend on $x_0 \oplus x_1$ and $x_2 \oplus
x_3$ only, so they depend on the key only through $K_3$'s bytes
$k_0 \oplus k_1$ and $k_2 \oplus k_3$: guess those 16 bits and test the middle
16 bits of the equation. For each survivor, $f_0$ depends on one more key byte,
$k_0$, and $f_3$ on $k_3$: 256 guesses each, tested on one output byte each.
That is $2^{16} + 2 \cdot 2^{8}$ trials instead of $2^{32}$.

Once $K_3$ is known, peel round 4 off every ciphertext and repeat one round up.
For $K_2$ a different plaintext difference is needed, `80800000 00000000`, which
gives $\Delta L_0 = \Delta R_0 =$ `80800000`, so round 1's $F$ outputs
`02000000` and $\Delta L_2 = \Delta R_1$ = `82800000` is known. For $K_1$ no
special difference is needed at all: $\Delta L_1 = \Delta R_0 = \Delta P_L
\oplus \Delta P_R$ for any pair, so the texts already gathered serve. For $K_0$,
$R_1 = P_L \oplus K_4 \oplus F(L_1 \oplus K_0)$, and XORing two texts removes
$K_4$. Then $K_4$ and $K_5$ fall out of one plaintext and its peeled state.

```python
import random

def G(a, b, d):                         # FEAL's only nonlinear step: add, then rotate left 2
    s = (a + b + d) & 0xFF
    return (s << 2 | s >> 6) & 0xFF

def F(x):
    x0, x1, x2, x3 = x >> 24, x >> 16 & 0xFF, x >> 8 & 0xFF, x & 0xFF
    f1 = G(x0 ^ x1, x2 ^ x3, 1)
    f2 = G(x2 ^ x3, f1, 0)
    return G(x0, f1, 0) << 24 | f1 << 16 | f2 << 8 | G(x3, f2, 1)

def encrypt(p, k):                      # k: six 32-bit subkeys, k[0..3] for the rounds
    L, R = p >> 32 ^ k[4], p & 0xFFFFFFFF ^ k[5]
    R ^= L
    for i in range(4):
        L, R = R, L ^ F(R ^ k[i])
    return L << 32 | R

rng = random.Random(1987)
xs = [rng.getrandbits(32) for _ in range(10000)]
print("F difference for input difference 80800000:",
      {f"{F(x) ^ F(x ^ 0x80800000):08x}" for x in xs})

def middle(a, b):                       # bytes 1 and 2 of F, from x0^x1 and x2^x3 alone
    f1 = G(a, b, 1)
    return f1 << 8 | G(b, f1, 0)

def round_keys(pairs):
    """Every k with F(x ^ k) ^ F(y ^ k) == t for all (x, y, t) in pairs."""
    found = []
    for ab in range(1 << 16):           # k0^k1 and k2^k3 first: 16 bits, checked on 16 bits
        a, b = ab >> 8, ab & 0xFF
        mids = []
        for x, y, t in pairs:
            mx = middle((x >> 24 ^ x >> 16) & 0xFF ^ a, (x >> 8 ^ x) & 0xFF ^ b)
            my = middle((y >> 24 ^ y >> 16) & 0xFF ^ a, (y >> 8 ^ y) & 0xFF ^ b)
            if mx ^ my != t >> 8 & 0xFFFF:
                break
            mids.append((mx, my))
        else:                           # every pair agreed: now k0 and k3, a byte each
            k0s = [k0 for k0 in range(256) if all(
                G(x >> 24 ^ k0, mx >> 8, 0) ^ G(y >> 24 ^ k0, my >> 8, 0) == t >> 24
                for (x, y, t), (mx, my) in zip(pairs, mids))]
            k3s = [k3 for k3 in range(256) if all(
                G(x & 0xFF ^ k3, mx & 0xFF, 1) ^ G(y & 0xFF ^ k3, my & 0xFF, 1) == t & 0xFF
                for (x, y, t), (mx, my) in zip(pairs, mids))]
            found += [k0 << 24 | (k0 ^ a) << 16 | (k3 ^ b) << 8 | k3 for k0 in k0s for k3 in k3s]
    return found

def back(c, k):                         # undo the last round: (L, R) -> (R ^ F(L ^ k), L)
    L, R = c >> 32, c & 0xFFFFFFFF
    return (R ^ F(L ^ k)) << 32 | L

key = [rng.getrandbits(32) for _ in range(6)]
used = 0
def chosen(dp, n):                      # n chosen pairs with plaintext difference dp
    global used
    used += 2 * n
    out = []
    for _ in range(n):
        p = rng.getrandbits(64)
        out.append((p, encrypt(p, key), p ^ dp, encrypt(p ^ dp, key)))
    return out

A = chosen(0x8080000080800000, 4)       # round 4 sees a known difference 02000000
B = chosen(0x8080000000000000, 4)       # round 3 sees a known difference 82800000
texts = [(p, c) for p, c, _, _ in A + B] + [(q, d) for _, _, q, d in A + B]
H = 0xFFFFFFFF
check = []                              # a few known plaintexts, only to test a finished key
for _ in range(8):
    p = rng.getrandbits(64)
    check.append((p, encrypt(p, key)))

def peel(c, found):
    for k in found:
        c = back(c, k)
    return c

def search(found):
    if len(found) < 2:                  # k3, then k2: chosen pairs, known difference
        data, known = (A, 0x02000000) if not found else (B, 0x82800000)
        pairs = []
        for _, c, _, d in data:
            c, d = peel(c, found), peel(d, found)
            pairs.append((c >> 32, d >> 32, (c ^ d) & H ^ known))
    else:                               # k1, then k0: any two texts will do
        (p, c), rest = texts[0], texts[1:5]
        c = peel(c, found)
        pairs = []
        for q, d in rest:
            d = peel(d, found)
            dp = (p ^ q) >> 32
            if len(found) == 2:         # L1 = PL ^ PR ^ k4 ^ k5: its difference is known
                dp ^= (p ^ q) & H
            pairs.append((c >> 32, d >> 32, (c ^ d) & H ^ dp))
    for k in round_keys(pairs):
        if len(found) < 3:
            if search(found + [k]):
                return True
            continue
        p, c = texts[0]                 # last: k0 found; k4 and k5 follow from one text
        c = peel(c, found)
        L1, R1 = c >> 32, c & H
        k4 = R1 ^ (p >> 32) ^ F(L1 ^ k)     # R1 = PL ^ k4 ^ F(L1 ^ k0)
        k5 = L1 ^ (p >> 32) ^ (p & H) ^ k4  # L1 = PL ^ PR ^ k4 ^ k5
        full = [k] + found[::-1] + [k4, k5]
        if all(encrypt(p, full) == c for p, c in texts + check):
            keys.append(full)
            return True
    return False

keys = []
search([])
print("chosen plaintexts:", used)
print("found :", " ".join(f"{k:08x}" for k in keys[0]))
print("actual:", " ".join(f"{k:08x}" for k in key))
tests = [rng.getrandbits(64) for _ in range(1000)]
print("same on 1000 new plaintexts:", all(encrypt(p, keys[0]) == encrypt(p, key) for p in tests))
```

```
F difference for input difference 80800000: {'02000000'}
chosen plaintexts: 16
found : 344f7f69 764fb661 60e90069 52bb4155 6a6898d7 385134e3
actual: 344f7f69 744fb663 e06980e9 52bb4155 686898d5 3a5134e1
same on 1000 new plaintexts: True
```

Sixteen chosen plaintexts (plus eight known ones to confirm the answer), about
a second of Python, and a key that encrypts exactly as the real one. Notice
that the key found is not the key set. $K_0$ and $K_3$ match; $K_1$, $K_2$, $K_4$
and $K_5$ differ from the real ones in a few top bits of their bytes. That is
not a failure. Flipping the top bits of key bytes 0 and 1 in a round key flips
the top bits of $x_0$ and $x_1$, which, as Figure 5.4 showed, changes $F$'s
output only by the constant `02000000`, and a constant XORed into one round can
be absorbed by changing the keys after it. With independent subkeys, this
FEAL has many equivalent keys, and an attacker needs any one of them. (With
FEAL's real key schedule, most such subkey sets correspond to no 64-bit key;
the attacker still does not care, since the subkeys are what encrypt.)

The attack needed no statistics at all. Every pair was a right pair, so there
was no noise to beat, and each pair gave 32 bits of conditions on the guessed
round key. That is what a probability-1 differential does. Biham and Shamir's
8-plaintext version shares texts between the steps more cleverly; Murphy's
20-plaintext attack, independently, rested on the same property of the
addition.

For **FEAL-8** the probability-1 trick runs out after a few rounds, and the
attack becomes a statistical one like §5.4. Biham and Shamir built a
characteristic through most of the eight rounds from FEAL's few good
transitions and counted key candidates over about 2,000 chosen plaintexts. As
FEAL-N grew, the characteristic grew with it, one round of probability loss at
a time, and the attack stayed faster than brute force well past any number of
rounds NTT recommended. The lesson designers took was not "add rounds". It was
that a round function whose differences pass with probability 1, or close to
it, is not worth stacking: the whole of FEAL's nonlinearity was carry
propagation, and the top bit has none.

!!! note "Life story: FEAL"
    **Born:** 1987, NTT (Akihiro Shimizu and Shoji Miyaguchi), as a fast
    software alternative to DES for 8-bit processors · **Purpose:** 64-bit
    block encryption for terminals and smart cards, with four
    rounds of byte additions and rotations · **Helped:** as a target, more than
    as a cipher: FEAL-4 fell to den Boer (1988), Murphy (20 chosen plaintexts,
    1990), Biham and Shamir (8 chosen plaintexts) and Matsui and Yamagishi (5
    known plaintexts, 1992); FEAL-8, FEAL-N and FEAL-NX followed. It pushed the
    invention of both differential and linear cryptanalysis · **Status:**
    broken in every version; today a teaching example

## 5.6 DES and the T-attack

*Level: intermediate.*

DES is the cipher differential cryptanalysis was invented to break, and the
one it broke worst, in the sense that it barely broke it at all. The book 1
chapter shows the cipher in full ([§6.4](../../book/06-Block-Ciphers.md#64-des));
here only its round function matters. $F$ expands the 32-bit right half to 48
bits (expansion E), XORs the 48-bit round key, passes six-bit pieces through
eight S-boxes $S_1, \dots, S_8$ that each return four bits, and permutes the 32
result bits (permutation P). E and P are linear, so they move differences in a
fixed way; the round key cancels; everything is in the eight S-boxes, each a
$6 \to 4$ table with a $64 \times 16$ DDT.

```python
S1 = [[14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
      [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
      [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
      [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13]]

def s1(x):                              # 6 bits in: outer bits pick the row, middle four the column
    return S1[(x >> 4 & 2) | (x & 1)][x >> 1 & 15]

ddt = [[0] * 16 for _ in range(64)]
for x in range(64):
    for a in range(64):
        ddt[a][s1(x) ^ s1(x ^ a)] += 1

worst = max(max(row) for row in ddt[1:])
print("largest entry for a nonzero input difference:", worst, "of 64")
print("where:", [(f"{a:02x}", f"{b:x}") for a in range(1, 64) for b in range(16) if ddt[a][b] == worst])
print("zeros in the table:", sum(row.count(0) for row in ddt[1:]), "of", 63 * 16)
# Coppersmith's criteria, checked on S1
print("one input bit changed -> at least two output bits:",
      all(bin(s1(x) ^ s1(x ^ (1 << i))).count("1") >= 2 for x in range(64) for i in range(6)))
print("middle two bits changed (001100) -> at least two output bits:",
      all(bin(s1(x) ^ s1(x ^ 0b001100)).count("1") >= 2 for x in range(64)))
print("difference 11xy00 never gives output difference 0:",
      all(ddt[0b110000 | e << 2][0] == 0 for e in range(4)))
print("input difference 03 -> output 0:", ddt[0x03][0], "of 64")
```

```
largest entry for a nonzero input difference: 16 of 64
where: [('34', '2')]
zeros in the table: 195 of 1008
one input bit changed -> at least two output bits: True
middle two bits changed (001100) -> at least two output bits: True
difference 11xy00 never gives output difference 0: True
input difference 03 -> output 0: 14 of 64
```

S1's best transition is `34` $\to$ `2` with probability $16/64 = 1/4$. Fine on
its own; the question is whether the transitions chain.

### The characteristic that iterates

A Feistel cipher offers a special shape of characteristic. Suppose the right
half has difference $X$ and the round function, with some probability, outputs
difference 0. Then after the round the halves have swapped and nothing new has
been added. If the next round's $F$ sees difference 0 (probability 1), the
pair is back where it started: a **two-round iterative characteristic**,
which can be repeated as often as its probability allows.

For DES, Biham and Shamir found the best such $X$ to be `19600000`. After the
expansion, it makes S-boxes 1, 2 and 3 active with input differences `03`,
`32` and `2C`, and all three can output 0 at once:

$$
\Pr[F: \texttt{19600000} \to 0]
= \frac{14}{64} \cdot \frac{8}{64} \cdot \frac{10}{64}
= \frac{1120}{262144} \approx \frac{1}{234}.
$$

The program confirms the first factor, 14 of 64. Iterate it: every two rounds
cost a factor of about 234, or $2^{-7.87}$. A characteristic through 13 rounds
uses six of these steps and one free round, for a probability of about
$234^{-6} \approx 2^{-47.2}$.

### Sixteen rounds for $2^{47}$

Biham and Shamir's 1990 paper broke DES reduced to 6 and 8 rounds quickly
(eight rounds took minutes on a personal computer) and showed that up to 15
rounds the attack beat exhaustive search. The full 16 rounds held out until
CRYPTO 1992. That attack used the 13-round iterative characteristic for rounds
2 to 14, chose plaintexts in **structures** so that round 1 could be bypassed
rather than paid for, and counted key candidates over the last two rounds. It
needed $2^{47}$ chosen plaintexts and about $2^{37}$ DES-equivalent operations
of analysis; a variant worked from $2^{55}$ known plaintexts.

$2^{47}$ chosen plaintexts is about 140 trillion blocks, a pebibyte of chosen data,
all encrypted under one key by a device that does whatever the attacker asks.
No real system gives an attacker that, and brute force, which needs one known
pair and $2^{55}$ trials on average, was the more practical threat; it is the
threat that eventually ended DES (in [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)).
As a measurement, though, the result was striking. Biham and Shamir found that
DES was close to optimal against their attack: changing the order of the
S-boxes, or replacing them with random ones, or changing the expansion,
made the attack much cheaper. Sixteen rounds was about the fewest that kept it
above the cost of brute force. That could hardly be a coincidence.

### Coppersmith, 1994

It was not. In May 1994 Don Coppersmith, one of the IBM team that designed
DES, published "The Data Encryption Standard (DES) and its strength against
attacks" in the *IBM Journal of Research and Development*. IBM, he wrote, had
known differential cryptanalysis in 1974. They called it the **T-attack**, for
"tickle", and designed the S-boxes and the permutation P against it. At the
NSA's request the criteria had been kept secret, because publishing them would
have revealed the technique, which was a powerful tool against many other
ciphers. Coppersmith listed the criteria: among them, each S-box has 6 input
and 4 output bits; changing one input bit changes at least two output bits;
inputs differing in the two middle bits change at least two output bits;
inputs differing in the first two bits and equal in the last two never give
equal outputs; and for any nonzero input difference, no output difference
occurs for more than 8 of the 32 input pairs. The program above checks the
second, third and fourth on S1 (the last is the largest DDT entry, 16 of 64
ordered pairs, met exactly). The rules on the permutation P made sure that
the outputs of each S-box spread to six different S-boxes in the next round.

Each criterion is a constraint on the DDT or on how differences spread, and
together they explain why the best iterative characteristic costs $1/234$ per
two rounds and not $1/16$. For seventeen years people had suspected the
unexplained S-boxes of hiding a trapdoor. They were hiding a defense.

One thing the criteria did not include. Linear cryptanalysis, the next
chapter, broke DES with $2^{43}$ known plaintexts in 1994, fewer than any
differential attack, and DES's S-boxes are not especially good against it.
Most people read that as evidence that IBM did not know the linear attack in
1974. The record does not say for certain.

!!! note "Life story: the T-attack"
    **Born:** 1974 at IBM, found by the DES design team, among them Don
    Coppersmith; kept secret at the NSA's request · **Purpose:** to measure and
    defeat differential attacks on the DES S-boxes and permutation while the
    cipher was being designed · **Helped:** made DES resist differential
    cryptanalysis when it was published openly by Biham and Shamir in 1990: the
    full 16 rounds needed $2^{47}$ chosen plaintexts, more than brute force
    in practice · **Status:** made public in Coppersmith's paper of 1994; the
    clearest known case of a secret technique, found again in the open, that
    the designers had already defended against

## 5.7 Truncated, impossible and boomerang differentials

*Level: expert.*

The attack of §5.4 predicts one exact difference with a small probability.
After 1990, attackers found that this was only one corner of the idea. One can
predict less than a whole difference; one can predict that a difference
**never** happens; and one can join two short differentials that do not join
in the ordinary way. Each of these has broken ciphers the plain attack could
not.

### Truncated differentials

Lars Knudsen, in 1994, pointed out that an attacker rarely needs the exact
difference. In §5.4 the filter only asked that nibbles 1 and 3 of the
ciphertext difference be zero; what mattered was the **pattern** of zero and
nonzero nibbles. A **truncated differential** predicts such a pattern: "nibble
2 active in, nibbles 0 and 2 active out", without the values. Many exact
differentials share one pattern, so its probability is their sum, often far
higher than any one of them. In ciphers built on bytes, with byte-level mixing
like AES's MixColumns, patterns of active bytes are the natural thing to
follow, and some patterns pass a round with certainty: one active byte in a
column of AES always becomes four. Truncated differentials drive many attacks
on reduced AES and its relatives, and they lead straight to the next idea.

### Impossible differentials and the miss in the middle

The DDT's zeros say what cannot happen in one S-box. Chain that across rounds.
Start from an input difference and push forward $r_1$ rounds, keeping the
**set** of differences that can occur at all. Start from an output difference
and pull it back $r_2$ rounds through the inverse cipher, keeping the set of
differences that could have led to it. If the two sets do not meet, no pair
can go from the input difference to the output difference through $r_1 + r_2$
rounds, for any key. The differential has probability exactly zero. Eli
Biham, Alex Biryukov and Adi Shamir called this the **miss in the middle**:
two certainties, one from each end, that contradict each other.

Knudsen used an impossible differential against his own AES candidate DEAL in
1998. Biham, Biryukov and Shamir made it a general method in 1999 and broke 31
of the 32 rounds of Skipjack, the NSA cipher declassified in June 1998, faster
than brute force.

The program runs the miss in the middle on four full rounds of Toy16 (key, S,
permutation, four times), for every input and output difference with one
active nibble, and then checks one of the impossible differentials on the
cipher itself.

```python
SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
PERM = [4 * ((n + b) % 4) + n for n in range(4) for b in range(4)]
PINV = [PERM.index(p) for p in range(16)]
def perm(x, t=PERM):
    return sum(1 << 15 - t[p] for p in range(16) if x >> 15 - p & 1)
OUT = [set() for _ in range(16)]
for x in range(16):
    for a in range(16):
        OUT[a].add(SBOX[x] ^ SBOX[x ^ a])
IN = [{a for a in range(16) if b in OUT[a]} for b in range(16)]   # backward through the S-box
def slayer(ds, table):
    for s in (12, 8, 4, 0):
        ds = {d & ~(15 << s) | b << s for d in ds for b in table[d >> s & 15]}
    return ds
def forward(d, r):
    ds = {d}
    for _ in range(r):
        ds = {perm(x) for x in slayer(ds, OUT)}
    return ds
def backward(d, r):            # differences before r rounds that could lead to d
    ds = {d}
    for _ in range(r):
        ds = slayer({perm(x, PINV) for x in ds}, IN)
    return ds
singles = [a << s for s in (12, 8, 4, 0) for a in range(1, 16)]
fw = {d: forward(d, 2) for d in singles}
bw = {d: backward(d, 2) for d in singles}
imp = [(a, b) for a in singles for b in singles if not fw[a] & bw[b]]
print("impossible over 4 rounds:", len(imp), "of", len(singles) ** 2)
a, b = imp[0]
print(f"for example {a:04x} -> {b:04x}")

# check it on the real thing: four keyed rounds, every input, a few random keys
import random
def sub(x):
    return sum(SBOX[x >> s & 15] << s for s in (12, 8, 4, 0))
rng = random.Random(3)
seen = 0
for _ in range(4):
    k = [rng.getrandbits(16) for _ in range(4)]
    def four(x):
        for r in range(4):
            x = perm(sub(x ^ k[r]))
        return x
    seen += sum(four(x) ^ four(x ^ a) == b for x in range(65536))
print("times seen in 4 x 65536 tries:", seen)
```

```
impossible over 4 rounds: 182 of 3600
for example 1000 -> 2000
times seen in 4 x 65536 tries: 0
```

Two rounds forward from one active nibble reach only about a hundred of the
65,535 differences, and so do two rounds back, so the sets often miss. With
three rounds on one side, the forward set already holds tens of thousands of
differences, and (running the same search) none of the one-nibble pairs is
impossible over five rounds.

To recover a key, put the impossible differential in the middle and guess key
bits at the edges, as in §5.4, but turn the counting around. Collect pairs
that could have the right input and output difference; for each guess of the
outer key bits, check whether some pair, decrypted under the guess, would
satisfy the impossible differential. If so, the guess is wrong: the right key
never produces an impossible event. Each pair crosses off a fraction of the
guesses, and enough pairs leave only one. The signal is not a count that is a
little too high; it is a count that is exactly zero. That makes impossible
differential attacks robust, and they hold several records on reduced AES:
seven rounds of AES-128 (of ten) fall to impossible differentials, though at a
cost far beyond any real attack.

!!! note "Life story: impossible differential cryptanalysis"
    **Born:** 1998, Lars Knudsen, against DEAL; generalized in 1999 by Eli
    Biham, Alex Biryukov and Adi Shamir as the "miss in the middle" ·
    **Purpose:** to sieve out wrong keys with differentials of probability
    exactly zero · **Helped:** broke 31 of 32 rounds of Skipjack (1999), and
    gave some of the deepest attacks on reduced IDEA, Camellia and AES ·
    **Status:** current; designers now search for impossible differentials,
    often with automated tools, before publishing a cipher

### The boomerang

Long characteristics have low probability because the probabilities multiply
round after round. David Wagner asked in 1999: what if we only ever need short
ones? Split the cipher into two halves, $E = E_1 \circ E_0$. Suppose $E_0$ has
a good differential $\alpha \to \beta$ with probability $p$, and $E_1$ has a
good one $\gamma \to \delta$ with probability $q$, but the two do not join
($\beta \ne \gamma$). The **boomerang** uses both, with chosen plaintexts and
chosen ciphertexts:

<div class="mars-steps" markdown>

1. Choose $P_1$ and $P_2 = P_1 \oplus \alpha$. Encrypt them to $C_1, C_2$.
2. Set $C_3 = C_1 \oplus \delta$ and $C_4 = C_2 \oplus \delta$. Decrypt them to
   $P_3, P_4$.
3. Check whether $P_3 \oplus P_4 = \alpha$. If so, the boomerang came back.

</div>

Why should it? Write $X_i$ for the middle values, between $E_0$ and $E_1$.
With probability $p$, $X_1 \oplus X_2 = \beta$. Going back through $E_1$, the
pairs $(C_1, C_3)$ and $(C_2, C_4)$ each have difference $\delta$, so each has
middle difference $\gamma$ with probability $q$, giving $q^2$ for both. If all
three hold, then

$$
X_3 \oplus X_4 = (X_1 \oplus \gamma) \oplus (X_2 \oplus \gamma) = X_1 \oplus X_2 = \beta,
$$

and back through $E_0$ the pair $(X_3, X_4)$ goes to $\alpha$ with probability
$p$. In total about $p^2 q^2$, and summing over every middle $\beta$ and
$\gamma$ that work, $\hat p^2 \hat q^2$ with $\hat p^2 = \sum_\beta
\Pr[\alpha \to \beta]^2$. For a random permutation the chance is $2^{-n}$.
The boomerang wins when $p q$ is well above $2^{-n/2}$, even when no single
differential through the whole cipher is any good.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="The boomerang quartet: two plaintexts with difference alpha go down, their ciphertexts are shifted by delta and come back up, and the returning plaintexts again differ by alpha" fill="currentColor" font-size="14">
<text x="100" y="30" text-anchor="middle">P1</text>
<text x="230" y="30" text-anchor="middle">P2</text>
<text x="410" y="30" text-anchor="middle">P3</text>
<text x="540" y="30" text-anchor="middle">P4</text>
<text x="165" y="22" text-anchor="middle" font-weight="bold">α</text>
<text x="475" y="22" text-anchor="middle" font-weight="bold">α ?</text>
<line x1="118" y1="26" x2="212" y2="26" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="428" y1="26" x2="522" y2="26" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="70" y="50" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="100" y="75" text-anchor="middle">E0</text>
<rect x="200" y="50" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="230" y="75" text-anchor="middle">E0</text>
<rect x="380" y="50" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="410" y="75" text-anchor="middle">E0</text>
<rect x="510" y="50" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="540" y="75" text-anchor="middle">E0</text>
<line x1="100" y1="36" x2="100" y2="50" stroke="currentColor" stroke-width="1.5"/>
<line x1="230" y1="36" x2="230" y2="50" stroke="currentColor" stroke-width="1.5"/>
<line x1="410" y1="36" x2="410" y2="50" stroke="currentColor" stroke-width="1.5"/>
<line x1="540" y1="36" x2="540" y2="50" stroke="currentColor" stroke-width="1.5"/>
<line x1="100" y1="90" x2="100" y2="170" stroke="currentColor" stroke-width="1.5"/>
<line x1="230" y1="90" x2="230" y2="170" stroke="currentColor" stroke-width="1.5"/>
<line x1="410" y1="90" x2="410" y2="170" stroke="currentColor" stroke-width="1.5"/>
<line x1="540" y1="90" x2="540" y2="170" stroke="currentColor" stroke-width="1.5"/>
<text x="165" y="124" text-anchor="middle">β (p)</text>
<text x="475" y="124" text-anchor="middle">β (p)</text>
<text x="255" y="146" text-anchor="middle" opacity="0.7">γ (q)</text>
<text x="385" y="146" text-anchor="middle" opacity="0.7">γ (q)</text>
<path d="M 100 150 Q 255 170 410 150" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<path d="M 230 160 Q 385 180 540 160" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<rect x="70" y="180" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="100" y="205" text-anchor="middle">E1</text>
<rect x="200" y="180" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="230" y="205" text-anchor="middle">E1</text>
<rect x="380" y="180" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="410" y="205" text-anchor="middle">E1</text>
<rect x="510" y="180" width="60" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="540" y="205" text-anchor="middle">E1</text>
<line x1="100" y1="170" x2="100" y2="180" stroke="currentColor" stroke-width="1.5"/>
<line x1="230" y1="170" x2="230" y2="180" stroke="currentColor" stroke-width="1.5"/>
<line x1="410" y1="170" x2="410" y2="180" stroke="currentColor" stroke-width="1.5"/>
<line x1="540" y1="170" x2="540" y2="180" stroke="currentColor" stroke-width="1.5"/>
<line x1="100" y1="220" x2="100" y2="240" stroke="currentColor" stroke-width="1.5"/>
<line x1="230" y1="220" x2="230" y2="240" stroke="currentColor" stroke-width="1.5"/>
<line x1="410" y1="220" x2="410" y2="240" stroke="currentColor" stroke-width="1.5"/>
<line x1="540" y1="220" x2="540" y2="240" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="258" text-anchor="middle">C1</text>
<text x="230" y="258" text-anchor="middle">C2</text>
<text x="410" y="258" text-anchor="middle">C3</text>
<text x="540" y="258" text-anchor="middle">C4</text>
<path d="M 100 266 Q 255 296 410 266" fill="none" stroke="currentColor" stroke-width="1"/>
<path d="M 230 266 Q 385 300 540 266" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="320" y="300" text-anchor="middle" font-weight="bold">δ</text>
<text x="20" y="75" opacity="0.7">down</text>
<text x="590" y="75" opacity="0.7">up</text>
</svg>
<figcaption>Figure 5.5. A boomerang quartet. P1 and P2 differ by α and go down; their ciphertexts, each shifted by δ, come back up as P3 and P4. The top half's differential is used twice (once per pair), the bottom half's twice (once per side), so the quartet returns with probability about p²q².</figcaption>
</figure>

On Toy16 the effect is plain. Take $\alpha$ = `0B00` and $\delta$ = `0030`,
throw 20,000 boomerangs, and compare with the plain differential from $\alpha$
to $\delta$ over all 65,536 plaintexts.

```python
import random
SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
INV = [SBOX.index(v) for v in range(16)]
PERM = [4 * ((n + b) % 4) + n for n in range(4) for b in range(4)]
PINV = [PERM.index(p) for p in range(16)]
def sub(x, box=SBOX):
    return sum(box[x >> s & 15] << s for s in (12, 8, 4, 0))
def perm(x, t=PERM):
    return sum(1 << 15 - t[p] for p in range(16) if x >> 15 - p & 1)
def enc(p, k):
    for r in range(len(k) - 2):
        p = perm(sub(p ^ k[r]))
    return sub(p ^ k[-2]) ^ k[-1]
def dec(c, k):
    c = sub(c ^ k[-1], INV) ^ k[-2]
    for r in range(len(k) - 3, -1, -1):
        c = sub(perm(c, PINV), INV) ^ k[r]
    return c
rng = random.Random(7)
k = [rng.getrandbits(16) for _ in range(5)]
assert all(dec(enc(p, k), k) == p for p in range(0, 65536, 97))
alpha, delta = 0x0B00, 0x0030
N = 20000
back = 0
for _ in range(N):                      # one boomerang: two encryptions, two decryptions
    p1 = rng.getrandbits(16)
    c1, c2 = enc(p1, k), enc(p1 ^ alpha, k)
    if dec(c1 ^ delta, k) ^ dec(c2 ^ delta, k) == alpha:
        back += 1
print(f"boomerangs that came back: {back} of {N}, about 1 in {N / back:.0f}")
print(f"a random permutation: about {N / 65535:.1f} of {N}")
same = sum(enc(p, k) ^ enc(p ^ alpha, k) == delta for p in range(65536))
print(f"plain differential {alpha:04x} -> {delta:04x}: {same} of 65536 plaintexts")
```

```
boomerangs that came back: 71 of 20000, about 1 in 282
a random permutation: about 0.3 of 20000
plain differential 0b00 -> 0030: 2 of 65536 plaintexts
```

The plain differential through all four rounds is no better than chance, 2 in
65,536. The boomerang, built from two 2-round halves, comes back once in about
282 tries, over 200 times more often than it would for a random permutation.
(Measured on the same key, the best four-round differential from `0B00` of any
output holds for 30 plaintexts in 65,536, about 1 in 2,200: the boomerang beats
every one of them.)

Wagner's paper broke COCONUT98, a cipher with a proof of security against
ordinary differential attacks, and that was the point: a bound on
differentials through the whole cipher says nothing about boomerangs. The
boomerang needs adaptively chosen ciphertexts. John Kelsey, Tadayoshi Kohno and
Bruce Schneier removed that need in 2000 with the **amplified boomerang**:
encrypt many pairs with difference $\alpha$ and wait for two of them to meet
the middle condition by the birthday paradox. Biham, Orr Dunkelman and Nathan
Keller sharpened it into the **rectangle attack** in 2001, which counts over
all middle differences at once. Both trade the chosen ciphertexts for more
chosen plaintexts, about $2^{n/2}/(\hat p \hat q)$ of them.

The quartet argument assumes the two halves are independent, and they are not:
at the boundary, the same S-box layer serves both characteristics. Sean Murphy
showed in 2011 that this can make published boomerangs impossible, and in other
cases the dependency helps. Dunkelman, Keller and Shamir handled the boundary
explicitly in the **sandwich attack** of 2010, which broke the full KASUMI used
in 3G mobile phones in the related-key model in under two hours on a PC; and in
2018 Carlos Cid and colleagues gave the boundary its own table, the
**boomerang connectivity table**, which plays the role of the DDT for the
middle S-box layer. The most famous boomerang is the related-key boomerang of
Alex Biryukov and Dmitry Khovratovich on AES-256 (2009), told in
[Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md).

!!! note "Life story: the boomerang attack"
    **Born:** 1999, David Wagner (FSE 1999); amplified boomerang by Kelsey,
    Kohno and Schneier (2000); rectangle attack by Biham, Dunkelman and Keller
    (2001) · **Purpose:** to join two short, likely differentials into an
    attack on a cipher with no good long one · **Helped:** broke COCONUT98, and
    led to the sandwich attack on KASUMI (2010) and the related-key attacks on
    AES-192 and AES-256 (2009) · **Status:** current; the boomerang
    connectivity table (2018) is now a standard design check for S-boxes

## 5.8 The wide trail: why AES resists

*Level: expert.*

After 1990 a designer could no longer hope a cipher resisted differential
attacks; they had to show it. The simplest way to show it is to count. A
characteristic's probability is a product over its **active** S-boxes, each
factor at most $\delta / 2^m$. So if every characteristic through $r$ rounds
has at least $A_r$ active S-boxes,

$$
\Pr[\text{any } r\text{-round characteristic}] \le \left(\frac{\delta}{2^m}\right)^{A_r}.
$$

Two levers set the bound: a good S-box (small $\delta$) and a linear layer
that forces many S-boxes to be active. For Toy16, the program finds $A_r$ by
a shortest-path search over all 65,536 differences, with the cost of a round
equal to its number of active S-boxes.

```python
SBOX = [0xC, 5, 6, 0xB, 9, 0, 0xA, 0xD, 3, 0xE, 0xF, 8, 4, 7, 1, 2]
PERM = [4 * ((n + b) % 4) + n for n in range(4) for b in range(4)]
def perm(x):
    return sum(1 << 15 - PERM[p] for p in range(16) if x >> 15 - p & 1)
OK = [[False] * 16 for _ in range(16)]  # OK[a][b]: can input difference a give b?
for x in range(16):
    for a in range(16):
        OK[a][SBOX[x] ^ SBOX[x ^ a]] = True

# Fewest active S-boxes in any characteristic of r rounds of the toy cipher
BIG = 99
v = [0] * 65536
v[0] = BIG                              # the zero difference is not a characteristic
for r in range(1, 5):
    for s in (12, 8, 4, 0):
        w = [BIG] * 65536
        for d in range(65536):
            if v[d] == BIG:
                continue
            a = d >> s & 15
            base = d & ~(15 << s)
            cost = v[d] + (a != 0)
            for b in range(16):
                e = base | b << s
                if OK[a][b] and cost < w[e]:
                    w[e] = cost
        v = w
    nxt = [BIG] * 65536
    for d in range(65536):
        nxt[perm(d)] = v[d]
    v = nxt
    print(f"{r} rounds: at least {min(v)} active S-boxes, so p <= 2^-{2 * min(v)}")
```

```
1 rounds: at least 1 active S-boxes, so p <= 2^-2
2 rounds: at least 2 active S-boxes, so p <= 2^-4
3 rounds: at least 4 active S-boxes, so p <= 2^-8
4 rounds: at least 6 active S-boxes, so p <= 2^-12
```

The bound for three rounds, $2^{-8}$, is met exactly by the trail we found by
hand in §5.3. Four rounds give only $2^{-12}$, nowhere near the $2^{-16}$ a
16-bit block needs, so Toy16 would need about six rounds to be safe from
characteristics, and more for differentials. The reason is its linear layer:
one S-box with a one-bit output wakes one S-box in the next round. The measure
of a linear layer's spreading power is its **branch number**,

$$
\mathcal{B}(\theta) = \min_{a \ne 0} \big( w(a) + w(\theta(a)) \big),
$$

where $w$ counts the active S-boxes (nonzero nibbles or bytes). For any bit
permutation of Toy16's kind, $\mathcal{B} = 2$. Over two rounds, the S-boxes
active before and after the linear layer number at least $\mathcal{B}$, since
an S-box is active exactly when its input difference is nonzero, and S-boxes
map nonzero to nonzero.

### The wide trail strategy

Joan Daemen, in his 1995 doctoral thesis at Leuven, turned this into a design
method he and Vincent Rijmen called the **wide trail strategy**: spend the
cipher's effort on a linear layer with the highest possible branch number, so
that every trail is wide, and keep the S-box small and simple. AES is the
result. Its MixColumns acts on columns of four bytes with branch number 5, the
largest possible for a $4 \to 4$ byte map, because its matrix is **MDS**: every
square submatrix is invertible. Book 1 states this
([§7.5](../../book/07-AES.md#75-shiftrows-and-mixcolumns)); here is the check.

```python
from itertools import combinations, permutations

def mul(a, b):                          # multiply in GF(2^8) modulo x^8 + x^4 + x^3 + x + 1
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def det(m):                             # determinant by expansion; in GF(2^8), minus is plus
    n = len(m)
    total = 0
    for p in permutations(range(n)):
        term = 1
        for i in range(n):
            term = mul(term, m[i][p[i]])
        total ^= term
    return total

MC = [[2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]]
checked = singular = 0
for k in range(1, 5):
    for rows in combinations(range(4), k):
        for cols in combinations(range(4), k):
            checked += 1
            if det([[MC[r][c] for c in cols] for r in rows]) == 0:
                singular += 1
print(f"square submatrices: {checked}, singular: {singular}")
print("MDS, so branch number 5" if singular == 0 else "not MDS")
```

```
square submatrices: 69, singular: 0
MDS, so branch number 5
```

Why does "every square submatrix invertible" give branch number 5? If an
input column had $i$ nonzero bytes and the output had $j$ with $i + j \le 4$,
then $4 - j \ge i$ output bytes would be zero; the $(4-j) \times i$ block of
the matrix that maps the $i$ nonzero inputs to those zero outputs would send a
nonzero vector to zero, so some $i \times i$ submatrix of it would be singular.

Branch number 5 gives at least 5 active S-boxes in any two rounds. ShiftRows
adds the second half of the argument. Split four rounds into two pairs of
rounds. Within a pair, each column that is active at the MixColumns between the
two rounds brings at least 5 active S-boxes, by the branch number. And because
ShiftRows sends the four bytes of a column to four different columns, the same
branch-number argument works one level up, on whole columns: the active
columns in the middle of the first pair and in the middle of the second pair
add up to at least 5. So

$$
A_4 \ge 5 \times 5 = 25, \qquad
\Pr[\text{4-round characteristic}] \le (2^{-6})^{25} = 2^{-150},
$$

and $2^{-300}$ for eight rounds. A differential attack on AES needs a
characteristic over at least $r - 2$ or so rounds with probability above
$2^{-128}$; none exists past three rounds.

Two cautions keep this honest. The bound is on **characteristics**, and the
attack in §5.4 used a **differential**, which sums trails. Bounding the
differential needs more work: Sangwoo Park and colleagues proved in 2003 that
no four-round AES differential, averaged over keys, exceeds about $2^{-96}$,
and later work tightened that. Either way, ordinary differential cryptanalysis
is far out of reach. And the bound says nothing about the variants of §5.7,
or about attacks that use the key schedule; the best attacks on reduced AES
are impossible-differential, boomerang, integral and meet-in-the-middle
attacks, not plain differential ones, and they stop at seven of ten rounds for
AES-128. [Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md) takes up
what "AES is unbroken" means.

!!! note "Life story: the wide trail strategy"
    **Born:** 1995, Joan Daemen's doctoral thesis at KU Leuven; developed with
    Vincent Rijmen in the ciphers SHARK, Square and Rijndael · **Purpose:** to
    make resistance to differential and linear cryptanalysis provable by
    counting active S-boxes, using linear layers with high branch number ·
    **Helped:** AES (FIPS 197, 2001), and through it most block ciphers and
    many hash and permutation designs since, including Keccak's own trail
    bounds · **Status:** current; the standard way to argue a new design
    resists differential and linear attacks

## 5.9 Going deeper

*Level: expert.*

**How likely is the attack to succeed?** Ali Aydın Selçuk (2008) modeled the
counters as normal variables. With $\mu = pN$ right pairs expected, a
signal-to-noise ratio $S_N$, and a demanded advantage of $a$ bits (the right
key must rank in the top $2^{-a}$ of the $2^k$ guesses), the success
probability is about

$$
P_S \approx \Phi\!\left( \frac{\sqrt{\mu S_N} - \Phi^{-1}(1 - 2^{-a})}{\sqrt{S_N + 1}} \right),
$$

with $\Phi$ the standard normal distribution function. For large $S_N$ the
formula depends on $\mu$ almost alone, which is what Figure 5.3 shows. Asking
only for a small advantage, and finishing with brute force over the remaining
candidates, is how real attacks trade data for time.

**Finding trails by machine.** The searches in this chapter were exhaustive
over a 16-bit state. For real ciphers the state is too large. Matsui's
branch-and-bound algorithm (1994) found the best DES characteristics by
pruning any partial trail that could not beat the best found so far. Since
2011 (Nicky Mouha and colleagues), the standard method writes the trail
conditions as a mixed-integer linear program or a SAT problem and lets a solver
find the minimum number of active S-boxes, or the best trail outright. Most
new designs publish such bounds.

**Beyond the Markov model.** For one fixed key the true probability can be far
from the average (§5.3); with a real key schedule, round keys are not
independent, and some trails hold for a fraction of keys only, with higher
probability for those. Attacks on SHA-1 and on lightweight ciphers exploit
exactly this. **Higher-order differentials** (Lai and Knudsen, 1994) take
differences of differences: the $d$-th derivative of a function of algebraic
degree $d$ is constant, which leads to the integral and cube attacks of
[Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md) and
[Chapter 8](08-Attacks-on-Stream-Ciphers.md). **Differential-linear**
attacks (Langford and Hellman, 1994) join a short differential to a short
linear approximation, in the spirit of the boomerang; they belong to
[Chapter 6](06-Linear-Cryptanalysis.md). **Related-key differentials** put a
difference in the key as well as the plaintext, so that key-schedule
differences cancel state differences; that is how AES-192 and AES-256 lost
their ideal security on paper (Chapter 7). And in hash functions, where the
attacker controls every input and needs only one right pair, differential
paths become collision recipes: Wang's attacks on MD5 and SHA-1 are
differential cryptanalysis with message modification, in
[Chapter 9](09-Breaking-Hash-Functions.md). The same method run backwards on a
faulty chip, comparing a correct and a corrupted ciphertext, is differential
fault analysis ([Chapter 17](17-Side-Channels-the-Attackers-View.md)).

**Provable security, and its limit.** Kaisa Nyberg and Lars Knudsen proved in
1992 that a Feistel cipher with an almost perfect nonlinear round function has
a provable bound on every differential, not only on characteristics, and they
built a cipher (KN) to show it. In 1997 Thomas Jakobsen and Knudsen broke KN
with an interpolation attack, because the function that made it provably
resistant had very low algebraic degree. A proof against one attack is a proof
against one attack, a lesson the boomerang taught COCONUT98 the same way.

**Machine learning.** In 2019 Aron Gohr trained neural networks to tell
ciphertext pairs of round-reduced Speck32/64 from random pairs, and they beat
the best classical differential distinguisher he compared against, then
recovered keys for 11 rounds. Later work explained what the networks learned
in terms of differentials and their dependencies. It is the subject of
[Chapter 20](20-Where-Cryptanalysis-Goes.md); the target is still a difference
between two encryptions.

## Check yourself

??? question "1. Why does XORing a round key into both members of a pair not change their difference, and why is that the foundation of the whole method?"
    Because $(x \oplus K) \oplus (x' \oplus K) = x \oplus x'$: the key appears
    twice and cancels. The key is the attacker's only unknown, so its
    disappearance means the attacker can predict how differences pass through
    every part of the cipher except the S-boxes, and those they can tabulate.

??? question "2. Using the DDT of §5.2, what is the probability that difference F becomes difference E through the PRESENT S-box? That 1 becomes 2? Why must every entry be even?"
    $\mathrm{DDT}[\texttt{F}][\texttt{E}] = 4$, so $4/16 = 1/4$.
    $\mathrm{DDT}[1][2] = 0$: impossible (one-bit to one-bit transitions are
    all zero in this S-box). Every entry is even because $x$ and $x \oplus a$
    form the same pair: if $x$ is counted, so is $x \oplus a$, and they are
    different values when $a \ne 0$.

??? question "3. The best characteristic from 00B0 to 5050 has probability 1/256, but the differential has 11/2048. Explain the difference, and which one the attack actually uses."
    The characteristic fixes every intermediate difference; the differential
    fixes only the two ends and adds the probabilities of all characteristics
    between them, here three, with $1/256 + 1/1024 + 1/2048 = 11/2048$. The
    attack sees only the plaintext difference and the guessed difference before
    the last S-layer, so any trail that connects them yields a right pair: the
    attack uses the differential.

??? question "4. In the last-round attack with output difference 5050, why can every pair whose ciphertexts differ in nibble 1 or nibble 3 be thrown away?"
    In a right pair, nibbles 1 and 3 have zero difference entering the last
    S-layer. Those S-boxes are inactive, so their outputs are equal, and the
    final key $K_4$ XORs the same value into both. The ciphertexts must
    therefore agree in nibbles 1 and 3. A pair that differs there is wrong, and
    no key guess needs to be tried on it.

??? question "5. Compute the signal-to-noise ratio for the 2-round differential 0B00 -> 4040 (p = 1/16) when guessing 8 key bits, filtering only on the two zero nibbles. About how many pairs does the attack need?"
    $k = 8$, $\beta = 2^{-8}$ (two nibbles must be zero), and a surviving pair
    suggests about $\alpha = 1$ key on average (the average DDT entry over all
    16 output differences is 1 per nibble). $S/N = 2^8 \cdot 2^{-4} / 2^{-8} =
    2^{12} \approx 4096$. That is very high, so three or four right pairs
    suffice: about $4 \times 16 = 64$ pairs. The program used 200, which also
    covers unlucky keys.

??? question "6. Why does FEAL's F map input difference 80800000 to 02000000 with probability 1? Which property of addition is responsible?"
    Bytes $x_0$ and $x_1$ both differ by `80`, so $x_0 \oplus x_1$ does not
    differ, and neither does $x_2 \oplus x_3$; hence $f_1$ and $f_2$ are the
    same for both inputs. Only $f_0 = G_0(x_0, f_1)$ sees a difference. In
    addition modulo 256, flipping the top bit of an input flips the top bit of
    the sum and nothing else, because the carry out of the top bit is
    discarded. So the sum differs by `80`, and the rotation by 2 makes it `02`.

??? question "7. The DES iterative characteristic costs 1/234 per two rounds. Estimate the probability of the 13-round version and the order of the number of chosen plaintexts the 16-round attack needs."
    Thirteen rounds use six two-round steps plus one free round:
    $234^{-6} = 2^{-6 \times 7.87} \approx 2^{-47.2}$. The attack needs a few
    right pairs, so on the order of $2^{47}$ pairs; Biham and Shamir's use of
    structures brought the total to $2^{47}$ chosen plaintexts.

??? question "8. In an impossible differential attack, a pair 'crosses off' key guesses. Explain why a single pair can prove a guess wrong, while in an ordinary differential attack no single pair can prove anything."
    An impossible differential has probability exactly 0 for every key. If a
    guess of the outer key bits makes some pair satisfy it, that guess must be
    wrong: the real key could never produce it. An ordinary differential has
    small positive probability for the right key and also for wrong ones, so a
    single pair is only weak evidence; the right key emerges from counts over
    many pairs.

??? question "9. A 64-bit cipher splits into halves with differentials of probability 2^-12 (top) and 2^-14 (bottom), while no differential through the whole cipher beats 2^-64. What is the boomerang probability, and is it a distinguisher?"
    About $p^2 q^2 = 2^{-24} \cdot 2^{-28} = 2^{-52}$ (more if other middle
    differences help). A random permutation returns with probability $2^{-64}$.
    So about $2^{52}$ quartets, a few times over, distinguish the cipher, even
    though every ordinary differential is useless. Whether $2^{54}$ or so
    adaptive queries are practical is another matter.

??? question "10. AES has at least 25 active S-boxes in any 4-round characteristic. Why does that not, by itself, prove AES secure against every differential-style attack?"
    The bound is on single characteristics. Differentials sum many of them
    (bounds exist, near $2^{-96}$ for four rounds, but need separate proofs).
    It also says nothing about boomerangs, which use two short differentials;
    impossible differentials, which use probability 0; truncated and integral
    properties; or related-key attacks, which put differences in the key
    schedule. The best attacks on reduced AES are of exactly those kinds.

## What you learned

- A difference passes key mixing unchanged and linear layers predictably; only
  S-boxes are uncertain, and their behavior is the difference distribution
  table. Its largest entry, the differential uniformity, is the S-box's
  weakness.
- A characteristic chains S-box transitions round by round; under the Markov
  assumption its probability is the product. A differential sums all
  characteristics with the same ends, and is what an attack actually uses.
- The last-round attack guesses the key bits after the differential, undoes the
  last S-boxes, and counts. The data needed is a small multiple of $1/p$; the
  signal-to-noise ratio $2^k p / (\alpha\beta)$ says how small. Peeling round
  after round recovers the whole key: 80 bits of Toy16 from 9,016 chosen
  plaintexts.
- FEAL fell because its additions pass the top bit with probability 1: FEAL-4
  to a handful of chosen plaintexts, FEAL-8 to about 2,000.
- DES needed $2^{47}$ chosen plaintexts because IBM had designed its S-boxes
  against the same attack in 1974, as Coppersmith revealed in 1994.
- Truncated differentials follow patterns; impossible differentials sieve keys
  with events of probability 0 (miss in the middle); boomerangs and rectangles
  join two short differentials into a long distinguisher.
- The wide trail strategy bounds every trail by counting active S-boxes, using
  linear layers of high branch number; AES's MDS MixColumns and ShiftRows give
  25 active S-boxes in 4 rounds, a characteristic bound of $2^{-150}$.

## Further reading

- Eli Biham and Adi Shamir, "Differential Cryptanalysis of DES-like
  Cryptosystems", *Journal of Cryptology* 4(1), 1991 (CRYPTO 1990). The
  founding paper.
- Eli Biham and Adi Shamir, *Differential Cryptanalysis of the Data Encryption
  Standard*, Springer, 1993. The book, including the full 16-round attack
  (CRYPTO 1992) and the attacks on FEAL and N-Hash (EUROCRYPT 1991).
- Don Coppersmith, "The Data Encryption Standard (DES) and its strength against
  attacks", *IBM Journal of Research and Development* 38(3), 1994. The T-attack
  and the S-box criteria.
- Akihiro Shimizu and Shoji Miyaguchi, "Fast Data Encipherment Algorithm FEAL",
  EUROCRYPT 1987. Sean Murphy, "The Cryptanalysis of FEAL-4 with 20 Chosen
  Plaintexts", *Journal of Cryptology* 2(3), 1990. Henri Gilbert and Guy
  Chassé, "A Statistical Attack of the FEAL-8 Cryptosystem", CRYPTO 1990.
- Xuejia Lai, James Massey and Sean Murphy, "Markov Ciphers and Differential
  Cryptanalysis", EUROCRYPT 1991.
- Kaisa Nyberg, "Differentially Uniform Mappings for Cryptography", EUROCRYPT
  1993. Kaisa Nyberg and Lars Knudsen, "Provable Security Against a
  Differential Attack", *Journal of Cryptology* 8(1), 1995.
- Howard Heys, "A Tutorial on Linear and Differential Cryptanalysis",
  *Cryptologia* 26(3), 2002. The toy-cipher tutorial behind book 1's §6.8.
- Andrey Bogdanov and others, "PRESENT: An Ultra-Lightweight Block Cipher",
  CHES 2007. The source of this chapter's S-box.
- Lars Knudsen, "Truncated and Higher Order Differentials", FSE 1994 (published
  1995). Lars Knudsen, "DEAL: A 128-bit Block Cipher", 1998.
- Eli Biham, Alex Biryukov and Adi Shamir, "Cryptanalysis of Skipjack Reduced
  to 31 Rounds Using Impossible Differentials", EUROCRYPT 1999.
- David Wagner, "The Boomerang Attack", FSE 1999. John Kelsey, Tadayoshi Kohno
  and Bruce Schneier, "Amplified Boomerang Attacks Against Reduced-Round MARS
  and Serpent", FSE 2000. Eli Biham, Orr Dunkelman and Nathan Keller, "The
  Rectangle Attack: Rectangling the Serpent", EUROCRYPT 2001.
- Sean Murphy, "The Return of the Cryptographic Boomerang", *IEEE Transactions
  on Information Theory* 57(4), 2011. Carlos Cid, Tao Huang, Thomas Peyrin, Yu
  Sasaki and Ling Song, "Boomerang Connectivity Table", EUROCRYPT 2018.
- Orr Dunkelman, Nathan Keller and Adi Shamir, "A Practical-Time Related-Key
  Attack on the KASUMI Cryptosystem Used in GSM and 3G Telephony", CRYPTO 2010.
- Joan Daemen, *Cipher and Hash Function Design: Strategies Based on Linear and
  Differential Cryptanalysis*, PhD thesis, KU Leuven, 1995. Joan Daemen and
  Vincent Rijmen, *The Design of Rijndael*, Springer, 2002 (2nd ed. 2020).
  FIPS 197, the AES standard (2001).
- Sangwoo Park, Soo Hak Sung, Sangjin Lee and Jongin Lim, "Improving the Upper
  Bound on the Maximum Differential and the Maximum Linear Hull Probability for
  SPN Structures and AES", FSE 2003.
- Ali Aydın Selçuk, "On Probability of Success in Linear and Differential
  Cryptanalysis", *Journal of Cryptology* 21(1), 2008.
- Mitsuru Matsui, "On Correlation Between the Order of S-boxes and the Strength
  of DES", EUROCRYPT 1994. Nicky Mouha, Qingju Wang, Dawu Gu and Bart Preneel,
  "Differential and Linear Cryptanalysis Using Mixed-Integer Linear
  Programming", Inscrypt 2011.
- Aron Gohr, "Improving Attacks on Round-Reduced Speck32/64 Using Deep
  Learning", CRYPTO 2019.
