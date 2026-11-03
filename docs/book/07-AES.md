# 7. AES

*DES's key was too short and triple DES was slow, so in 1997 the US government
did something no government had done before: it asked the whole world to design
its next cipher, in public. The winner, Rijndael from Belgium, became the
Advanced Encryption Standard, and today it encrypts most of the data on Earth.
This chapter builds AES completely. First you learn the arithmetic it runs on,
the finite field $\mathrm{GF}(2^8)$, then each of its four steps by hand, then
one full round with the numbers from the standard, then the whole cipher in
Python, checked against FIPS 197. Last, you break a 4-round version with 768
chosen plaintexts, and see why the full 10 rounds stand after 25 years.*

!!! abstract "In this chapter"
    **You will learn:**

    - how the AES competition worked and why its openness mattered;
    - arithmetic in $\mathrm{GF}(2^8)$: adding and multiplying bytes as polynomials,
      and finding inverses;
    - the four steps of an AES round (SubBytes, ShiftRows, MixColumns,
      AddRoundKey) and the key schedule, each worked by hand;
    - how to code AES-128, -192 and -256 from scratch and test it;
    - the square attack on reduced AES, the best attacks on full AES, and why its
      real-world failures were side channels.

    **You need:** [Chapter 6](06-Block-Ciphers.md) (block ciphers, SPNs,
    differential and linear cryptanalysis) and modular arithmetic from
    [Chapter 3](03-The-Arithmetic-of-Secrets.md).

    **Levels:** §7.1 and §7.2 are for beginners, §7.3 to §7.10 are intermediate,
    §7.11 is expert.

## 7.1 The problem: replacing DES

By the mid-1990s DES was finished. Its 56-bit key was within reach of a
purpose-built machine (Deep Crack would prove it in 1998), and triple DES, the
stopgap, ran three times slower and still had DES's 64-bit block. The world needed
a new standard cipher, and it had learned something from DES: a cipher designed
behind closed doors, with an intelligence agency's unexplained changes, would be
suspected for decades whatever its merits.

So in January 1997 the US National Institute of Standards and Technology (NIST)
announced a different process. Anyone, anywhere, could submit a cipher. The rules
were a 128-bit block and keys of 128, 192 and 256 bits, free worldwide use if
chosen, and full publication. Every submission would be attacked in public, at
open conferences, by anyone who wanted to try.

Fifteen candidates from twelve countries arrived in August 1998: from Korea
(CRYPTON), Japan (E2, from NTT), France (DFC), Germany (MAGENTA), Australia
(LOKI97), Costa Rica (FROG), Canada (CAST-256), the US and Europe. Some fell
quickly to public cryptanalysis, which was the point. In August 1999 NIST named
five finalists:

| Finalist | Designers | Structure |
|---|---|---|
| MARS | IBM | heterogeneous Feistel |
| RC6 | Ron Rivest and colleagues, RSA Laboratories | Feistel with data-dependent rotations |
| Rijndael | Joan Daemen and Vincent Rijmen, Belgium | substitution-permutation network |
| Serpent | Ross Anderson, Eli Biham and Lars Knudsen (UK, Israel, Norway) | substitution-permutation network |
| Twofish | Bruce Schneier and colleagues, Counterpane | Feistel |

None of the five was broken. On 2 October 2000 NIST chose **Rijndael** (a blend of
its designers' names) for its speed on everything from 8-bit smart cards to
servers, its simple structure, and its comfortable security margin. FIPS 197 was
published on 26 November 2001. Rijndael itself allows blocks of 128, 192 and 256
bits; AES is Rijndael with the 128-bit block only.

The open process worked. In 2003 the NSA approved AES for classified information
(128-bit keys up to SECRET, 192 and 256 up to TOP SECRET), the first time a public
cipher was trusted that way, and NIST has run its big choices since (SHA-3, the
post-quantum standards) the same way.

## 7.2 The plan of AES

AES is a substitution-permutation network
([§6.3](06-Block-Ciphers.md#63-two-ways-to-build-a-round)). It holds the 16-byte block as a $4 \times 4$ grid
of bytes, the **state**, filled column by column:

$$
\begin{bmatrix}
s_{0} & s_{4} & s_{8} & s_{12} \\
s_{1} & s_{5} & s_{9} & s_{13} \\
s_{2} & s_{6} & s_{10} & s_{14} \\
s_{3} & s_{7} & s_{11} & s_{15}
\end{bmatrix}
$$

It first XORs the key into the state, then runs 10 rounds (for a 128-bit key; 12
for 192 bits, 14 for 256). Each round has four steps:

1. **SubBytes:** replace each byte with its entry in a fixed 256-entry table, the
   S-box. This is the confusion.
2. **ShiftRows:** rotate row $r$ of the grid left by $r$ places.
3. **MixColumns:** replace each column by a fixed mixture of its four bytes, so
   every output byte depends on every input byte of the column.
4. **AddRoundKey:** XOR a 16-byte round key, made from the key by the key schedule.

The last round skips MixColumns (§7.6 explains why that costs nothing). ShiftRows
spreads bytes across columns, and MixColumns spreads them within a column, so
after two rounds every output byte depends on every input byte. That is the
diffusion.

Three of the four steps are easy. SubBytes and MixColumns need arithmetic on
bytes that is not ordinary arithmetic, and that is the next section.

## 7.3 Arithmetic on bytes: the field $\mathrm{GF}(2^8)$

*Level: intermediate.* AES treats a byte as an element of a **finite field**: a
set with addition, subtraction, multiplication and division (except by zero)
that obey the usual rules. In [Chapter 3](03-The-Arithmetic-of-Secrets.md) you
met the integers mod a prime $p$, which form a field with $p$ elements. A field
with 256 elements cannot be the integers mod 256: there $2 \times 128 = 0$, so 2
has no inverse. It has to be built another way.

### Bytes as polynomials

Read the eight bits of a byte $b_7 b_6 \ldots b_0$ as the coefficients of a
polynomial in $x$:

$$
b_7 x^7 + b_6 x^6 + \cdots + b_1 x + b_0 .
$$

The byte `57` is `0101 0111` in binary, so it is $x^6 + x^4 + x^2 + x + 1$. The
coefficients are bits, and bits are added mod 2: $1 + 1 = 0$.

**Adding** two bytes adds the polynomials coefficient by coefficient, mod 2. That
is XOR, bit by bit:

$$
\mathtt{57} + \mathtt{83} = (x^6 + x^4 + x^2 + x + 1) + (x^7 + x + 1) = x^7 + x^6 + x^4 + x^2 = \mathtt{d4}.
$$

Check: `0101 0111` XOR `1000 0011` = `1101 0100` = `d4`. Subtraction is the same
as addition, since $-1 = 1$ mod 2.

**Multiplying** two bytes multiplies the polynomials. The product can reach degree
14, too big for a byte, so it is reduced **modulo** a fixed polynomial of degree 8,
just as integers are reduced mod $n$. AES uses

$$
m(x) = x^8 + x^4 + x^3 + x + 1 \qquad (\text{the 9-bit number } \mathtt{11b}).
$$

$m(x)$ is **irreducible**: it is not the product of two smaller polynomials with
bit coefficients, the polynomial version of a prime. That is what makes every
nonzero byte invertible, exactly as a prime modulus does for integers.

**By hand: $\mathtt{57} \cdot \mathtt{83}$.** This is the example in FIPS 197.

$$
(x^6 + x^4 + x^2 + x + 1)(x^7 + x + 1) = x^{13} + x^{11} + x^9 + x^8 + x^6 + x^5 + x^4 + x^3 + 1
$$

(multiply out, and every term that appears twice cancels). Dividing by $m(x)$
leaves the remainder

$$
x^{13} + x^{11} + x^9 + x^8 + x^6 + x^5 + x^4 + x^3 + 1 \equiv x^7 + x^6 + 1 \pmod{m(x)},
$$

so $\mathtt{57} \cdot \mathtt{83} = \mathtt{c1}$.

### The fast way: multiply by $x$, again and again

Long division of polynomials is slow. There is a better route. Multiplying by $x$
(the byte `02`) shifts every bit up one place. If a bit falls off the top (a term
$x^8$ appears), replace $x^8$ by $x^4 + x^3 + x + 1$, since $x^8 \equiv x^4 + x^3 + x + 1$
modulo $m(x)$: that is, XOR with `1b`. This operation is called **xtime**:

$$
\mathtt{xtime}(b) = \begin{cases} b \ll 1 & \text{if the top bit of } b \text{ is } 0 \\ (b \ll 1) \oplus \mathtt{1b} & \text{if it is } 1 \end{cases}
$$

(keeping 8 bits). Any product is then a sum of doublings, exactly like
multiplying integers by shifting and adding. Again from FIPS 197,
$\mathtt{57} \cdot \mathtt{13}$:

| | Value | How |
|---|---|---|
| $\mathtt{57} \cdot \mathtt{01}$ | `57` | |
| $\mathtt{57} \cdot \mathtt{02}$ | `ae` | shift; top bit was 0 |
| $\mathtt{57} \cdot \mathtt{04}$ | `47` | shift `ae` to `15c`; drop the top bit, XOR `1b` |
| $\mathtt{57} \cdot \mathtt{08}$ | `8e` | shift; top bit was 0 |
| $\mathtt{57} \cdot \mathtt{10}$ | `07` | shift `8e` to `11c`; drop the top bit, XOR `1b` |

Since $\mathtt{13} = \mathtt{10} + \mathtt{02} + \mathtt{01}$,

$$
\mathtt{57} \cdot \mathtt{13} = \mathtt{07} \oplus \mathtt{ae} \oplus \mathtt{57} = \mathtt{fe}.
$$

### Inverses

Every nonzero byte $a$ has an inverse $a^{-1}$ with $a \cdot a^{-1} = \mathtt{01}$.
The 255 nonzero bytes form a group under multiplication, so, as in Fermat's little
theorem, $a^{255} = 1$, and therefore

$$
a^{-1} = a^{254}.
$$

The extended Euclidean algorithm on polynomials works too, and is faster by hand.
For example $\mathtt{53}^{-1} = \mathtt{ca}$: multiply them with xtime and you get
`01`. By convention, AES maps `00` to `00`.

In code, all of this is a few lines:

```python
def xtime(a):                           # multiply by x (that is, by 02) in GF(2^8)
    a <<= 1
    return a ^ 0x11b if a & 0x100 else a

def gmul(a, b):                         # multiply two bytes: shift and add
    r = 0
    while b:
        if b & 1:
            r ^= a
        a, b = xtime(a), b >> 1
    return r

def ginv(a):                            # inverse: a^254, since a^255 = 1 for a != 0
    r = 1
    for _ in range(254):
        r = gmul(r, a)
    return r

print(hex(gmul(0x57, 0x83)), hex(gmul(0x57, 0x13)), hex(ginv(0x53)), hex(gmul(0x53, 0xca)))
# 0xc1 0xfe 0xca 0x1
```

## 7.4 SubBytes: the S-box

*Level: intermediate.* The S-box is the only nonlinear step in AES, and unlike
the DES S-boxes it is not a table of mysterious numbers. It is defined by a
formula in two parts:

1. **Invert** the byte in $\mathrm{GF}(2^8)$: $b = a^{-1}$ (with `00` going to `00`).
2. Apply a fixed **affine** transformation over bits: XOR $b$ with four left
   rotations of itself and with the constant `63`:

$$
S(a) = b \oplus (b \lll 1) \oplus (b \lll 2) \oplus (b \lll 3) \oplus (b \lll 4) \oplus \mathtt{63}, \qquad b = a^{-1}.
$$

**By hand: $S(\mathtt{53})$.** The inverse of `53` is `ca` = `11001010`. Write
the rotations under each other and XOR the columns:

| | Bits |
|---|---|
| $b$ | `11001010` |
| $b \lll 1$ | `10010101` |
| $b \lll 2$ | `00101011` |
| $b \lll 3$ | `01010110` |
| $b \lll 4$ | `10101100` |
| `63` | `01100011` |
| XOR of all six | `11101101` = `ed` |

So $S(\mathtt{53}) = \mathtt{ed}$, which is what the table in FIPS 197 says.

**Why the inverse?** In 1993 Kaisa Nyberg, in Finland, showed that the inversion
map in a finite field is about as nonlinear as a function on bytes can be. For
the AES S-box, the measures of [Chapter 6](06-Block-Ciphers.md) come out as:

- **Differential:** for any nonzero input difference, no output difference occurs
  for more than 4 of the 256 inputs, a probability of at most $2^{-6}$.
- **Linear:** no linear approximation holds with a bias of more than
  $16/256 = 2^{-4}$, a correlation of at most $2^{-3}$.

Both are the best possible for an invertible 8-bit S-box, as far as anyone knows.

**Why the affine step?** Inversion alone is a clean algebraic function, and clean
algebra is what attackers exploit. The affine step breaks that structure. It also
makes sure the S-box has no fixed points ($S(a) \ne a$ for every $a$) and no
"opposite" fixed points ($S(a) \ne \bar a$), both checked easily by computer.

Because the S-box has a formula, nobody has to trust that its designers hid
nothing in it. That openness is a direct answer to the DES S-box controversy.

## 7.5 ShiftRows and MixColumns

*Level: intermediate.*

### ShiftRows

Row 0 stays, row 1 moves one place left, row 2 two places, row 3 three, wrapping
around:

$$
\begin{bmatrix}
s_{0} & s_{4} & s_{8} & s_{12} \\
s_{1} & s_{5} & s_{9} & s_{13} \\
s_{2} & s_{6} & s_{10} & s_{14} \\
s_{3} & s_{7} & s_{11} & s_{15}
\end{bmatrix}
\longrightarrow
\begin{bmatrix}
s_{0} & s_{4} & s_{8} & s_{12} \\
s_{5} & s_{9} & s_{13} & s_{1} \\
s_{10} & s_{14} & s_{2} & s_{6} \\
s_{15} & s_{3} & s_{7} & s_{11}
\end{bmatrix}
$$

After it, the four bytes of each column came from four different columns.

### MixColumns

Each column $(a_0, a_1, a_2, a_3)$ is multiplied by a fixed matrix, with all
arithmetic in $\mathrm{GF}(2^8)$:

$$
\begin{bmatrix} b_0 \\ b_1 \\ b_2 \\ b_3 \end{bmatrix}
=
\begin{bmatrix}
\mathtt{02} & \mathtt{03} & \mathtt{01} & \mathtt{01} \\
\mathtt{01} & \mathtt{02} & \mathtt{03} & \mathtt{01} \\
\mathtt{01} & \mathtt{01} & \mathtt{02} & \mathtt{03} \\
\mathtt{03} & \mathtt{01} & \mathtt{01} & \mathtt{02}
\end{bmatrix}
\begin{bmatrix} a_0 \\ a_1 \\ a_2 \\ a_3 \end{bmatrix}.
$$

Multiplying by `01` is nothing, by `02` is xtime, and by `03` is xtime plus the
byte itself, so the whole step costs a few shifts and XORs.

**By hand: one column.** In the first round of the FIPS 197 example (§7.7), the
first column entering MixColumns is `d4 bf 5d 30`. The first output byte is

$$
b_0 = \mathtt{02} \cdot \mathtt{d4} \oplus \mathtt{03} \cdot \mathtt{bf} \oplus \mathtt{5d} \oplus \mathtt{30}.
$$

- $\mathtt{02} \cdot \mathtt{d4}$: `d4` shifted is `1a8`; the top bit fell off, so
  drop it and XOR `1b`: `a8` $\oplus$ `1b` = `b3`.
- $\mathtt{03} \cdot \mathtt{bf} = \mathtt{02} \cdot \mathtt{bf} \oplus \mathtt{bf}$:
  `bf` shifted is `17e`, so `7e` $\oplus$ `1b` = `65`, and `65` $\oplus$ `bf` = `da`.
- `b3` $\oplus$ `da` $\oplus$ `5d` $\oplus$ `30` = `04`.

The other three rows give `66`, `81` and `e5`, so the column becomes
`04 66 81 e5`.

**Why this matrix?** Its rows are rotations of one another, so the same small
circuit serves for all four bytes, and its entries are tiny (`01`, `02`, `03`), so
it is cheap. Above all, it is **MDS** (maximum distance separable, a term from
error-correcting codes): if an input column has $k$ nonzero bytes, the output has
at least $5 - k$. Together, at least 5 bytes are nonzero, the most possible for a
4-byte map. This **branch number** of 5 is what lets the designers prove bounds on
attacks (§7.11). Decryption multiplies by the inverse matrix, whose entries are
`0e`, `0b`, `0d` and `09`.

## 7.6 AddRoundKey and the key schedule

*Level: intermediate.* AddRoundKey XORs a 16-byte round key into the state. It is
the only step that involves the key; without it, everything else is public and
could simply be undone.

The **key schedule** stretches the key into $N_r + 1$ round keys (11 for AES-128).
It works in 4-byte words $w_0, w_1, \ldots$. The first $N_k$ words are the key
itself ($N_k = 4$, 6 or 8 for 128, 192 or 256 bits). Each later word is

$$
w_i = w_{i - N_k} \oplus \begin{cases}
\mathrm{SubWord}(\mathrm{RotWord}(w_{i-1})) \oplus \mathrm{Rcon}_{i/N_k} & \text{if } N_k \text{ divides } i \\
\mathrm{SubWord}(w_{i-1}) & \text{if } N_k = 8 \text{ and } i \bmod 8 = 4 \\
w_{i-1} & \text{otherwise.}
\end{cases}
$$

RotWord rotates a word's four bytes left by one, SubWord applies the S-box to each
byte, and $\mathrm{Rcon}_j$ is the word $(x^{j-1}, 0, 0, 0)$: `01`, `02`, `04`,
`08`, `10`, `20`, `40`, `80`, `1b`, `36`. The round constants make every round
different, which stops the slide attacks of [Chapter 6](06-Block-Ciphers.md).

**By hand: the first new word.** FIPS 197 Appendix A uses the key
`2b7e1516 28aed2a6 abf71588 09cf4f3c`, so $w_0$ = `2b7e1516` and $w_3$ = `09cf4f3c`.

<div class="mars-steps" markdown>

1. RotWord($w_3$): `09cf4f3c` becomes `cf4f3c09`.
2. SubWord: the S-box on each byte gives `8a84eb01`.
3. XOR $\mathrm{Rcon}_1$ = `01000000`: `8b84eb01`.
4. XOR $w_0$ = `2b7e1516`: $w_4$ = `a0fafe17`.
5. Then $w_5 = w_1 \oplus w_4$ = `88542cb1`, $w_6$ = `23a33939`, $w_7$ = `2a6c7605`: the round-1 key is `a0fafe17 88542cb1 23a33939 2a6c7605`.

</div>

**Why no MixColumns in the last round?** In the last round, MixColumns would be
followed only by the key XOR. Both are linear, so an attacker could swap their
order (using a modified key) and strip the MixColumns off for free. It adds no
security there, and leaving it out makes decryption mirror encryption.

## 7.7 One round by hand

*Level: intermediate.* FIPS 197 Appendix B encrypts the block
`3243f6a8 885a308d 313198a2 e0370734` with the key of §7.6. Here is the start, as
the 16 bytes column by column. Every value was recomputed with the code in §7.8.

| Step | State |
|---|---|
| Input | `32 43 f6 a8` `88 5a 30 8d` `31 31 98 a2` `e0 37 07 34` |
| AddRoundKey (the key itself) | `19 3d e3 be` `a0 f4 e2 2b` `9a c6 8d 2a` `e9 f8 48 08` |
| Round 1: SubBytes | `d4 27 11 ae` `e0 bf 98 f1` `b8 b4 5d e5` `1e 41 52 30` |
| ShiftRows | `d4 bf 5d 30` `e0 b4 52 ae` `b8 41 11 f1` `1e 27 98 e5` |
| MixColumns | `04 66 81 e5` `e0 cb 19 9a` `48 f8 d3 7a` `28 06 26 4c` |
| AddRoundKey (round-1 key) | `a4 9c 7f f2` `68 9f 35 2b` `6b 5b ea 43` `02 6a 50 49` |
| ... rounds 2 to 10 ... | |
| Ciphertext | `39 25 84 1d` `02 dc 09 fb` `dc 11 85 97` `19 6a 0b 32` |

Trace a few bytes yourself: `32` XOR `2b` = `19`; $S(\mathtt{19}) = \mathtt{d4}$;
row 1 of the grid after SubBytes is `27 bf b4 41`, which ShiftRows turns into
`bf b4 41 27`, so the first column becomes `d4 bf 5d 30`, the column you mixed by
hand in §7.5.

## 7.8 Code it

*Level: intermediate.* The whole cipher, for all three key sizes, building on the
field functions of §7.3. The S-box is computed from its formula instead of being
typed in.

```python
def affine(b):                          # the S-box's fixed bit transformation
    r = 0x63
    for s in range(5):
        r ^= (b << s | b >> (8 - s)) & 0xff
    return r

SBOX = [affine(ginv(a)) for a in range(256)]     # ginv(0) = 0, as the standard says
INV = [SBOX.index(i) for i in range(256)]

def expand(key):                        # the key schedule: (rounds + 1) round keys of 16 bytes
    nk = len(key) // 4
    nr = nk + 6
    w = [list(key[4 * i:4 * i + 4]) for i in range(nk)]
    rcon = 1
    for i in range(nk, 4 * (nr + 1)):
        t = w[i - 1][:]
        if i % nk == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]     # RotWord, SubWord
            t[0] ^= rcon
            rcon = xtime(rcon)
        elif nk > 6 and i % nk == 4:
            t = [SBOX[b] for b in t]
        w.append([a ^ b for a, b in zip(w[i - nk], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(nr + 1)]

def shift_rows(s):                      # s[r + 4c] is row r, column c
    return [s[(r + 4 * (c + r)) % 16] for c in range(4) for r in range(4)]

def inv_shift_rows(s):
    return [s[(r + 4 * (c - r)) % 16] for c in range(4) for r in range(4)]

def mix_columns(s, m=(2, 3, 1, 1)):
    out = []
    for c in range(4):
        col = s[4 * c:4 * c + 4]
        for r in range(4):
            x = 0
            for i in range(4):
                x ^= gmul(m[(i - r) % 4], col[i])
            out.append(x)
    return out

def encrypt(block, key):
    ks = expand(key)
    s = [a ^ b for a, b in zip(block, ks[0])]
    for r in range(1, len(ks)):
        s = shift_rows([SBOX[b] for b in s])
        if r < len(ks) - 1:             # the last round has no MixColumns
            s = mix_columns(s)
        s = [a ^ b for a, b in zip(s, ks[r])]
    return bytes(s)

def decrypt(block, key):
    ks = expand(key)
    s = list(block)
    for r in range(len(ks) - 1, 0, -1):
        s = [a ^ b for a, b in zip(s, ks[r])]
        if r < len(ks) - 1:
            s = mix_columns(s, (14, 11, 13, 9))     # the inverse matrix
        s = [INV[b] for b in inv_shift_rows(s)]
    return bytes(a ^ b for a, b in zip(s, ks[0]))

print(hex(SBOX[0x53]), bytes(expand(bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c"))[1]).hex())
# 0xed a0fafe1788542cb123a339392a6c7605

pt = bytes.fromhex("00112233445566778899aabbccddeeff")    # FIPS 197, Appendix C
for n in (16, 24, 32):
    ct = encrypt(pt, bytes(range(n)))
    print(8 * n, ct.hex(), decrypt(ct, bytes(range(n))) == pt)
```

```
128 69c4e0d86a7b0430d8cdb78070b4c55a True
192 dda97ca4864cdfe06eaf70a0ec0d7191 True
256 8ea2b7ca516745bfeafc49904b496089 True
```

All three match Appendix C of FIPS 197, and the code was also checked against the
`cryptography` library on 300 random keys and blocks. ShiftRows here is written
as an index formula: the byte at row $r$, column $c$ comes from column $c + r$.

This is a teaching copy: it is slow and its table lookups leak timing (§7.9). For
real work, use a library, which uses the processor's AES instructions:

```python
# pip install cryptography
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

k = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
one_block = Cipher(algorithms.AES(k), modes.ECB()).encryptor()   # ECB: one block only, see Chapter 8
print(one_block.update(bytes.fromhex("3243f6a8885a308d313198a2e0370734")).hex())
# 3925841d02dc09fbdc118597196a0b32
```

And never use a block cipher alone on real data: [Chapter 8](08-Modes-of-Operation.md)
shows why, and [Chapter 10](10-Message-Authentication.md) gives the mode to use,
AES-GCM.

## 7.9 Break it

*Level: intermediate.*

### The square attack on 4 rounds

Daemen and Rijmen found the best early attack on their own design while working
on its ancestor, the cipher **Square** (1997, with Lars Knudsen). Take 256
plaintexts that are equal except in one byte, which runs through all 256 values.

- After round 1, that byte has become four bytes of one column (by MixColumns),
  each still running through all 256 values: a permutation of byte values,
  passed through the S-box and a fixed linear map.
- After round 2, each byte of the whole state runs through all 256 values.
- After round 3, the bytes no longer run through all values, but each byte,
  XORed over the 256 texts, still sums to **zero**. Such a set is called
  **balanced**.

So three rounds of AES, under any key, have a property a random permutation does
not. Add a fourth round and guess one byte of its round key: undo that byte's
AddRoundKey and S-box for all 256 ciphertexts and XOR the results. The right
guess always gives zero; a wrong one gives zero by chance, 1 time in 256. Three
sets of 256 plaintexts leave only the right guess. Repeat for each of the 16
bytes, then run the key schedule backwards to the key.

```python
import random

def encrypt4(block, ks):                # AES-128 cut to 4 rounds (the last has no MixColumns)
    s = [a ^ b for a, b in zip(block, ks[0])]
    for r in range(1, 5):
        s = shift_rows([SBOX[b] for b in s])
        if r < 4:
            s = mix_columns(s)
        s = [a ^ b for a, b in zip(s, ks[r])]
    return bytes(s)

random.seed(11)
secret = bytes(random.randrange(256) for _ in range(16))
ks = expand(secret)

sets = []                               # three sets of 256 chosen plaintexts:
for _ in range(3):                      # byte 0 takes every value, the rest stay fixed
    rest = bytes(random.randrange(256) for _ in range(15))
    sets.append([encrypt4(bytes([x]) + rest, ks) for x in range(256)])

def balanced(texts, j, g):              # undo the last S-box on byte j with guess g; XOR is 0?
    x = 0
    for c in texts:
        x ^= INV[c[j] ^ g]
    return x == 0

k4 = [next(g for g in range(256) if all(balanced(t, j, g) for t in sets)) for j in range(16)]

def unexpand(k, rounds):                # run the AES-128 key schedule backwards
    w = [k[i:i + 4] for i in range(0, 16, 4)]
    rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54]
    for r in range(rounds, 0, -1):
        old = [None, *[[a ^ b for a, b in zip(w[i], w[i - 1])] for i in (1, 2, 3)]]
        t = [SBOX[b] for b in old[3][1:] + old[3][:1]]
        t[0] ^= rcon[r - 1]
        old[0] = [a ^ b for a, b in zip(w[0], t)]
        w = old
    return bytes(sum(w, []))

print(unexpand(k4, 4).hex(), secret.hex())
# e7eee7615ef35f30e49b482e15cae750 e7eee7615ef35f30e49b482e15cae750
```

768 chosen plaintexts and a fraction of a second. ShiftRows only moves bytes, so
each ciphertext byte depends on exactly one byte of the state before the last
round, which is why the bytes can be attacked one at a time. With more guessing,
the same idea reaches 6 rounds: the designers described it themselves, and Niels
Ferguson and colleagues improved it in 2000. That is why AES has 10.

### How far the attacks reach

Twenty-five years of public attacks on full AES amount to this:

| Attack | Target | Cost | Meaning |
|---|---|---|---|
| Biclique (Bogdanov, Khovratovich, Rechberger, 2011) | full AES-128 | about $2^{126.1}$ operations | 4 times faster than brute force; no practical effect |
| Biclique, same paper | AES-256 | about $2^{254.4}$ | the same |
| Related-key (Biryukov, Khovratovich, 2009) | AES-256 | $2^{99.5}$, with 4 related keys | needs keys with chosen relations, which proper systems never produce |
| Best single-key attacks on reduced AES-128 | 7 of 10 rounds | impractical | a security margin of 3 rounds |

The related-key results do say something: AES-256's key schedule is weaker than
its rounds. It matters only in constructions that use AES with related keys,
such as some hash function designs.

### Where AES has actually failed: side channels

No real system has lost data because of the mathematics of AES. It has lost keys
through **side channels**, information leaked by the way the computation runs.

Fast software AES uses **T-tables**: four tables of 256 four-byte words that
combine SubBytes and MixColumns into lookups. Which table entry is read depends on
key and data bytes, and the processor's cache remembers which entries were read
recently. In 2005 Daniel J. Bernstein recovered a full AES key from a server
running OpenSSL just by timing its responses over a network, and Dag Arne Osvik,
Adi Shamir and Eran Tromer recovered keys from another process on the same
machine by watching the cache.

The fixes were constant-time software, which computes the S-box without
secret-dependent memory access (bitslicing), and above all **hardware**. Intel
announced the AES-NI instructions in 2008 and shipped them in 2010; ARMv8
processors have equivalent instructions. They run a whole AES round in one
instruction, with no tables, many times faster than software. Power analysis and
fault injection against smart cards and embedded chips are a separate story,
told with the general methods in [Chapter 18](18-Side-Channels.md).

## 7.10 In the real world

*Level: intermediate.*

**Where it runs.** AES encrypts most of the world's protected data: TLS (as
AES-GCM), Wi-Fi (WPA2 and WPA3), disk encryption (BitLocker, FileVault, LUKS,
Android and iOS, in the XTS mode of [Chapter 8](08-Modes-of-Operation.md)), VPNs,
SSH, and ZIP and 7-Zip archives. Nearly every laptop,
server and phone processor sold since about 2010 has AES instructions.

**Which key size.** AES-128 is secure today. AES-256 is the usual choice for data
that must stay secret for decades or against an attacker with a quantum computer:
Grover's algorithm ([Chapter 20](20-Quantum-Computers.md)) would search a 128-bit
key space in about $2^{64}$ quantum steps, though those steps run in series and
are very expensive. The NSA's CNSA 2.0 suite requires AES-256 for classified
systems.

**The standard.** FIPS 197 (2001, updated in 2023 with editorial changes). The
modes are in the NIST SP 800-38 series. In December 2024 NIST proposed
standardizing a wider variant, Rijndael with a 256-bit block, for systems that
encrypt very large amounts of data under one key; it is not a standard yet. Full
details: [AES reference](../04-symmetric-ciphers/AES.md).

**National ciphers.** Several governments certify their own 128-bit block ciphers
for national use, usually alongside AES:

| Cipher | Country | Year | Structure | Notes |
|---|---|---|---|---|
| Camellia | Japan (NTT, Mitsubishi Electric) | 2000 | Feistel | on Japan's CRYPTREC list; RFC 3713 |
| ARIA | Korea | 2003 | SPN, uses the AES S-box | Korean standard KS X 1213; RFC 5794 |
| SM4 | China | 2006 | unbalanced Feistel, 32 rounds | GB/T 32907-2016; mandatory in parts of Chinese commerce |
| Kuznyechik | Russia | 2015 | SPN, 9 rounds | GOST R 34.12-2015; its S-box has an unexplained hidden structure |

None has a known practical attack. Use them when a regulator or partner requires
it; otherwise AES has more review and better tooling. Full details:
[National ciphers](../04-symmetric-ciphers/National-Ciphers.md).

## 7.11 Going deeper

*Level: expert.*

**The wide trail strategy.** Daemen and Rijmen designed AES so that its
resistance to differential and linear cryptanalysis could be **proved**, not just
hoped for. Call an S-box *active* in a trail if its input difference (or mask) is
nonzero. Because MixColumns has branch number 5 and ShiftRows sends the four bytes
of a column to four different columns, any trail through two rounds has at least
5 active S-boxes and any trail through four rounds at least $5 \times 5 = 25$.
With a maximum differential probability of $2^{-6}$ per S-box, any 4-round
characteristic has probability at most $2^{-150}$; with maximum correlation
$2^{-3}$, any 4-round linear trail has correlation at most $2^{-75}$. Both are far
beyond what $2^{128}$ plaintexts could detect, so classical differential and
linear attacks cannot work on 8 rounds, let alone 10. (The bound is on single
trails; clustering of trails into differentials and hulls has been studied
closely and does not change the picture for full AES.)

**Why 10 rounds.** When AES was designed, the best shortcut attacks reached 6
rounds. The designers added 4 rounds of margin, giving 10 for 128-bit keys and one
more for each extra 32 bits of key, since a longer key gives an attacker more
room to guess key bytes at the edges. The best single-key attacks today reach 7
rounds of AES-128, so the margin has shrunk from 4 rounds to 3 in 25 years.

**The S-box's algebra, and the XSL claim.** The S-box is $x \mapsto x^{-1}$ plus an
affine map, so AES can be written as a large system of simple quadratic equations
over $\mathrm{GF}(2)$ or $\mathrm{GF}(2^8)$. In 2002 Nicolas Courtois and Josef
Pieprzyk proposed the XSL method, claiming it might solve such systems faster
than brute force. Later analysis found the method does not work as claimed, and
no algebraic attack threatens AES. The episode is a reminder that the clean
structure that makes AES analyzable could, in principle, be a lever for attack,
and why designers kept the affine step and the round constants.

**The field is a choice, not a necessity.** All irreducible polynomials of degree
8 give isomorphic fields, so the choice of $x^8 + x^4 + x^3 + x + 1$ is about
efficiency. Hardware designers use this freedom: an S-box can be computed in a
**composite field** $\mathrm{GF}((2^4)^2)$, where inversion reduces to arithmetic
on 4-bit pieces, giving the smallest AES circuits (David Canright, 2005) and the
basis of masked, side-channel resistant implementations.

**AES as a building block.** Much modern cryptography uses AES not as a cipher but
as a component. AES-GCM and AES-CCM build authenticated encryption from it
([Chapter 10](10-Message-Authentication.md)); CMAC builds a MAC; CTR_DRBG builds a
random generator (NIST SP 800-90A); and the round function alone, one AES-NI
instruction, is used in fast designs such as AEGIS and in hash functions.

??? info "The equivalent inverse cipher"

    Decryption as written in §7.8 runs the inverse steps in reverse order, a
    different sequence from encryption. FIPS 197 also gives an *equivalent
    inverse cipher*: because InvSubBytes and InvShiftRows commute, and
    InvMixColumns is linear, decryption can be rearranged into the same order of
    steps as encryption, with InvMixColumns applied to the round keys in advance.
    Hardware and table-based software use it so that one structure serves both
    directions.

## Check yourself

??? question "1. Compute $\mathtt{0f} + \mathtt{f0}$ and $\mathtt{0f} + \mathtt{0f}$ in $\mathrm{GF}(2^8)$."

    Addition is XOR: `0f` $\oplus$ `f0` = `ff`, and `0f` $\oplus$ `0f` = `00`.
    Every byte is its own negative.

??? question "2. Compute $\mathtt{02} \cdot \mathtt{80}$ and $\mathtt{03} \cdot \mathtt{80}$."

    `80` shifted is `100`; the top bit fell off, so drop it and XOR `1b`:
    $\mathtt{02} \cdot \mathtt{80} = \mathtt{1b}$. Then
    $\mathtt{03} \cdot \mathtt{80} = \mathtt{1b} \oplus \mathtt{80} = \mathtt{9b}$.

??? question "3. Why can't the field with 256 elements be the integers mod 256?"

    256 is not prime: $2 \times 128 = 256 \equiv 0$, so 2 has no inverse, and
    neither has any even number. A field needs every nonzero element invertible.

??? question "4. What is $S(\mathtt{00})$, and why?"

    `00` has no inverse; AES maps it to `00`, and the affine step then gives
    `00` $\oplus$ `63` = `63`. The S-box table starts with `63`.

??? question "5. Using the matrix of §7.5, compute $b_1$ for the column `d4 bf 5d 30`."

    $b_1 = \mathtt{d4} \oplus \mathtt{02} \cdot \mathtt{bf} \oplus \mathtt{03} \cdot \mathtt{5d} \oplus \mathtt{30}$.
    $\mathtt{02} \cdot \mathtt{bf} = \mathtt{65}$; $\mathtt{03} \cdot \mathtt{5d} = \mathtt{ba} \oplus \mathtt{5d} = \mathtt{e7}$.
    Then `d4` $\oplus$ `65` $\oplus$ `e7` $\oplus$ `30` = `66`, as in §7.5.

??? question "6. A column entering MixColumns has exactly one nonzero byte. How many nonzero bytes can come out?"

    All four: the branch number is 5, so at least $5 - 1 = 4$ output bytes are
    nonzero. One changed byte spreads to the whole column.

??? question "7. Why does the key schedule use round constants?"

    Without them, every round would be identical in structure and a key whose
    words repeat could give identical round keys, opening the cipher to slide
    attacks and to symmetries between rounds. The constants make each round
    different.

??? question "8. In the square attack, a wrong guess passes one set's test with probability $1/256$. With three sets, how many wrong guesses for the 16 key bytes do you expect to survive?"

    $16 \times 255 \times 256^{-3} \approx 0.0002$. Almost surely none. With one
    set, about $16 \times 255 / 256 \approx 16$ would survive.

??? question "9. A 4-round differential characteristic of AES must have at least 25 active S-boxes. Bound its probability, and compare with the number of plaintext pairs available."

    At most $(2^{-6})^{25} = 2^{-150}$. To see it happen once you would need
    about $2^{150}$ pairs with its input difference, but among all $2^{128}$
    plaintexts only $2^{127}$ such pairs exist. The characteristic can't be used.

??? question "10. Why did table-based AES leak keys through the cache, while ChaCha20 (Chapter 5) does not have this problem?"

    T-table AES reads table entries whose addresses depend on key XOR data, and
    the cache's state reveals which addresses were read. ChaCha20 uses only
    additions, rotations and XORs on registers, with no secret-dependent memory
    addresses.

## What you learned

- AES was chosen in an open, worldwide competition (1997 to 2000); Rijndael, by
  Daemen and Rijmen, won on speed, simplicity and margin.
- AES works in $\mathrm{GF}(2^8)$: addition is XOR, multiplication is polynomial
  multiplication modulo $x^8 + x^4 + x^3 + x + 1$, done with xtime.
- A round is SubBytes (inverse plus affine map), ShiftRows, MixColumns (an MDS
  matrix with branch number 5) and AddRoundKey; AES-128 has 10 rounds.
- The wide trail strategy proves that no 4-round differential or linear trail is
  useful, and the best attack on full AES is only 4 times faster than brute force.
- The square attack breaks 4 rounds with 768 chosen plaintexts; the margin of full
  AES over the best attacks is 3 rounds.
- AES's real failures were side channels in table-based software; use hardware
  AES instructions or constant-time code through a tested library.

**Next:** [Chapter 8](08-Modes-of-Operation.md): AES encrypts 16 bytes. How do you
use it for a whole file, a disk, or a credit card number?

## Further reading

- FIPS 197, Advanced Encryption Standard (2001, updated 2023).
- Joan Daemen and Vincent Rijmen, *The Design of Rijndael: AES, the Advanced
  Encryption Standard* (Springer, 2002; second edition 2020).
- NIST, *Report on the Development of the Advanced Encryption Standard (AES)*
  (October 2000).
- Kaisa Nyberg, "Differentially uniform mappings for cryptography" (EUROCRYPT
  1993).
- Joan Daemen, Lars Knudsen and Vincent Rijmen, "The Block Cipher Square" (FSE
  1997).
- Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger, "Biclique
  Cryptanalysis of the Full AES" (ASIACRYPT 2011).
- Alex Biryukov and Dmitry Khovratovich, "Related-Key Cryptanalysis of the Full
  AES-192 and AES-256" (ASIACRYPT 2009).
- [Daniel J. Bernstein, "Cache-timing attacks on AES" (2005)](https://cr.yp.to/antiforgery/cachetiming-20050414.pdf).
- Dag Arne Osvik, Adi Shamir and Eran Tromer, "Cache Attacks and
  Countermeasures: the Case of AES" (CT-RSA 2006).
- Reference pages: [AES](../04-symmetric-ciphers/AES.md),
  [National ciphers](../04-symmetric-ciphers/National-Ciphers.md), the
  [Groups and fields](../learn/Groups-and-Fields.md) lesson, and the history
  appendix [The Internet era](../history/08-Internet-Era.md).
