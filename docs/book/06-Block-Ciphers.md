# 6. Block Ciphers

*A stream cipher encrypts bit by bit. A block cipher takes a fixed-size block,
say 64 or 128 bits, and scrambles all of it at once under a key, so that every
output bit depends on every input bit. This chapter explains how such a thing is
built from small, weak pieces, using the cipher that taught the world how: DES,
the US Data Encryption Standard of 1977. You will build DES and run it on the
classic test vector, see why its 56-bit key fell to a $250,000 machine, why
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

What was IBM trying to build? Think of the simplest possible version: a
**codebook**. For each key, write down a table that gives, for every possible
64-bit block, a different 64-bit block. Encrypting looks up the table; decrypting
looks it up backwards. Mathematically, each key picks a **permutation** of the
$2^{64}$ blocks, and the ideal cipher would pick it at random.

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

In 1988 Michael Luby and Charles Rackoff proved that three Feistel rounds with
truly random round functions are indistinguishable from a random permutation,
and four rounds are enough even against an attacker who can also decrypt (§6.11).
Real ciphers use many more rounds, because a real $F$ is not truly random.

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

NIST withdrew DES as a standard on 19 May 2005. Its successor was chosen by an
open competition, and that is [Chapter 7](07-AES.md).

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

### Triple DES

Walter Tuchman's team at IBM proposed the fix in the late 1970s: three passes,
encrypt-decrypt-encrypt,

$$
C = E_{K_3}\big(D_{K_2}(E_{K_1}(P))\big).
$$

The middle step is a decryption so that setting $K_1 = K_2 = K_3$ gives single
DES, which let new equipment talk to old. A meet in the middle now has to cover
two of the three keys on one side, so three independent keys (168 bits) give
about 112 bits of security. The two-key version, $K_3 = K_1$, has attacks that
NIST rates at about 80 bits. Triple DES (also called TDEA) was standardized in
ANSI X9.52 (1998) and FIPS 46-3 (1999), and it carried the banking and payment
card industries for two decades. It costs three DES operations per block, which
was one reason the world wanted a new cipher.

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

## 6.8 Differential cryptanalysis

*Level: intermediate.* In 1990 Eli Biham and Adi Shamir, in Israel, published a
general attack on block ciphers. It broke many designs of the time, among them
Japan's FEAL, built by NTT in 1987 as a fast alternative to DES. Against DES it was
oddly weak: the full 16 rounds needed $2^{47}$ chosen plaintexts, more than any
real attacker could get. In 1994 Don Coppersmith of IBM explained why. The IBM
team had found the same attack in 1974, called it the "T-attack", and designed
the S-boxes to resist it, and at the NSA's request kept the technique secret for
sixteen years.

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

**What this means for design.** The defense is S-boxes with no large entries in
their difference table, and enough rounds that every characteristic passes
through many S-boxes, so its probability is far below $2^{-b}$. DES's S-boxes
were chosen with exactly this in mind. AES's S-box has a largest entry of 4 in
256 (probability $2^{-6}$), and [Chapter 7](07-AES.md) shows how its designers
proved a bound on whole characteristics.

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

The defense is the same as before: S-boxes whose approximation table has only
small entries, and enough rounds that every linear trail is spread over many
S-boxes. Since 1994 no serious block cipher has been published without arguments
against both attacks.

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
  appendix [From Shannon to DES](../history/06-Shannon-to-DES.md).
