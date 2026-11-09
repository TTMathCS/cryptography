# 10. Boolean Functions and S-Boxes

*Chapter 9 showed that anything linear is broken. A block cipher therefore needs
parts that are not linear, and it needs them to be as far from linear as
possible, in a sense that can be measured exactly. Those parts are S-boxes:
small lookup tables, 4 or 8 bits in and out, built from Boolean functions. This
chapter gives the tools for measuring them: the algebraic normal form and degree,
the Walsh-Hadamard transform (with a fast algorithm), nonlinearity, bent and
correlation-immune functions, and for whole S-boxes the difference distribution
table and the linear approximation table that differential and linear
cryptanalysis read. Then it measures real S-boxes: PRESENT's optimal 4-bit box,
the DES boxes and the secret criteria behind them, and the AES S-box, which
scores the best values known for an 8-bit permutation, with the proofs of why.
Along the way it runs a cube attack on a toy cipher, computes the full tables of
the AES S-box, and masks an AND gate to show why the number of multiplications
in an S-box sets the price of protecting it.*

!!! abstract "In this chapter"
    **You will learn:**

    - Boolean functions as truth tables and as polynomials (the algebraic normal
      form), and their degree; why every ANF coefficient is a cube sum, and the
      cube attack that follows;
    - the Walsh-Hadamard transform, how to compute it in $n 2^n$ steps, and
      Parseval's identity;
    - nonlinearity, its upper bound, and the bent functions that reach it (all
      896 of them in four variables, and why their derivatives are balanced);
    - balance, correlation immunity and resiliency, and Siegenthaler's trade-off
      between them and degree;
    - the difference distribution table (DDT) and linear approximation table
      (LAT) of an S-box, differential uniformity and linearity;
    - APN functions and the open problems around them;
    - why the AES S-box, inversion in $\mathrm{GF}(2^8)$, scores so well: its full
      DDT and LAT, the proof that its uniformity is 4, its degree, and the
      Kloosterman sums behind its nonlinearity;
    - what the DES S-box criteria were, read as statements about the tables;
    - masking on shares, the ISW AND gate, and why multiplicative complexity
      sets the cost of a masked S-box.

    **You need:** [Chapter 8](08-Rings-Fields-and-Polynomials.md)
    ($\mathrm{GF}(2^8)$ and the AES S-box) and
    [Chapter 9](09-Linear-Algebra.md) (vectors over $\mathbb{F}_2$, LFSRs,
    branch number).

    **Levels:** §10.1 to §10.4 are for beginners (the cube attack in §10.2 is
    intermediate), §10.5 to §10.8 are intermediate, §10.9 and §10.10 are
    expert.

## 10.1 The problem

*Level: beginner.*

The Arcadia City engineering school wants a lightweight block cipher for the
sensor tags on its greenhouse racks. The design is a classic
substitution-permutation network: xor a round key, pass each 4-bit nibble through
a small substitution table (an **S-box**), shuffle the bits, repeat. The linear
parts (the key xor and the bit shuffle) are fixed by the hardware. Everything the
cipher has against the attacks of Chapter 9 comes from the S-box: sixteen nibbles
in a table.

There are $16! \approx 2 \times 10^{13}$ possible 4-bit S-boxes. Most are good;
some are disastrously weak. An S-box whose output bit agrees with the xor of two
input bits 14 times out of 16 would let an attacker approximate the whole cipher
by a linear one, and Chapter 9 already broke linear ciphers. An S-box in which
input difference 1 produces output difference 1 for 8 of the 16 inputs would let
differences sail through round after round with probability 1/2. We need numbers
that capture these weaknesses, and a way to compute them quickly. That is the
subject of this chapter.

## 10.2 Boolean functions and their algebraic normal form

*Level: beginner.*

A **Boolean function** of $n$ variables maps $\{0, 1\}^n$ to $\{0, 1\}$. It is
given by its **truth table**, the list of its $2^n$ output bits; we index the
table by the input read as a binary number, with $x_1$ the lowest bit. There are
$2^{2^n}$ Boolean functions of $n$ variables: 16 for $n = 2$, about $10^{77}$ for
$n = 8$.

Every Boolean function is also a polynomial over $\mathbb{F}_2$. Since $x^2 = x$
for bits, no variable needs a power above 1, and the polynomial is a xor of
products of distinct variables:

$$f(x_1, \dots, x_n) = \bigoplus_{S \subseteq \{1, \dots, n\}} a_S \prod_{i \in S}
x_i.$$

This is the **algebraic normal form** (ANF), and it is unique. The **degree** of
$f$ is the size of the largest product with $a_S = 1$. Degree 1 (or 0) means
**affine**: a xor of some variables, possibly plus 1. The affine functions are
exactly the ones Chapter 9 breaks.

### By hand

The majority function of three bits outputs 1 when at least two inputs are 1. Its
truth table, for inputs 0 to 7, is $0, 0, 0, 1, 0, 1, 1, 1$. To find its ANF,
note that $x_1x_2 \oplus x_1x_3 \oplus x_2x_3$ is 1 exactly when one or three of
the products are 1: one product is 1 when exactly two inputs are 1, and all three
are 1 when all inputs are 1. That is majority. Degree 2.

### Code it: the Möbius transform

The coefficients are found from the truth table by a "butterfly" that runs over
each variable in turn, xoring each entry into the entry with that variable set.
It takes $n 2^n$ steps, and applying it twice gives back the original (over
$\mathbb{F}_2$ the transform is its own inverse).

```python
def anf(tt):
    """Truth table (list of 0/1, index = input) -> ANF coefficients, by the Moebius transform."""
    a = list(tt)
    n = len(a).bit_length() - 1
    for i in range(n):
        step = 1 << i
        for x in range(len(a)):
            if x & step:
                a[x] ^= a[x ^ step]
    return a

def anf_str(coeffs, names="x1 x2 x3 x4 x5 x6 x7 x8".split()):
    terms = []
    for m, c in enumerate(coeffs):
        if c:
            mon = "".join(names[i] for i in range(8) if m >> i & 1) or "1"
            terms.append(mon)
    return " + ".join(terms) or "0"

def degree(coeffs):
    return max((bin(m).count("1") for m, c in enumerate(coeffs) if c), default=0)

maj = [int(bin(x).count("1") >= 2) for x in range(8)]       # majority of three bits
print(maj, anf_str(anf(maj)), degree(anf(maj)))
print(anf(anf(maj)) == maj)
```

```text
[0, 0, 0, 1, 0, 1, 1, 1] x1x2 + x1x3 + x2x3 2
True
```

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="The Moebius transform as a butterfly diagram on 8 entries: in three stages, each entry with a given bit set is xored with the entry without it, turning the truth table of majority into its ANF coefficients" fill="currentColor" font-size="12">
<g text-anchor="middle">
<text x="60" y="20">truth table</text><text x="580" y="20">ANF coefficients</text>
<text x="60" y="44">0</text><text x="60" y="68">0</text><text x="60" y="92">0</text><text x="60" y="116">1</text><text x="60" y="140">0</text><text x="60" y="164">1</text><text x="60" y="188">1</text><text x="60" y="212">1</text>
<text x="580" y="44">0</text><text x="580" y="68">0</text><text x="580" y="92">0</text><text x="580" y="116" class="acc-fill">1  x₁x₂</text><text x="580" y="140">0</text><text x="580" y="164" class="acc-fill">1  x₁x₃</text><text x="580" y="188" class="acc-fill">1  x₂x₃</text><text x="580" y="212">0</text>
<text x="30" y="44" font-size="11">000</text><text x="30" y="68" font-size="11">001</text><text x="30" y="92" font-size="11">010</text><text x="30" y="116" font-size="11">011</text><text x="30" y="140" font-size="11">100</text><text x="30" y="164" font-size="11">101</text><text x="30" y="188" font-size="11">110</text><text x="30" y="212" font-size="11">111</text>
<text x="200" y="232">stage 1: bit x₁</text><text x="330" y="232">stage 2: bit x₂</text><text x="460" y="232">stage 3: bit x₃</text>
</g>
<g stroke="currentColor" stroke-width="1" fill="none" opacity="0.7">
<path d="M90 40 L300 40"/><path d="M90 64 L300 64"/><path d="M90 88 L300 88"/><path d="M90 112 L300 112"/><path d="M90 136 L300 136"/><path d="M90 160 L300 160"/><path d="M90 184 L300 184"/><path d="M90 208 L300 208"/>
<path d="M300 40 L540 40"/><path d="M300 64 L540 64"/><path d="M300 88 L540 88"/><path d="M300 112 L540 112"/><path d="M300 136 L540 136"/><path d="M300 160 L540 160"/><path d="M300 184 L540 184"/><path d="M300 208 L540 208"/>
</g>
<g stroke="currentColor" stroke-width="1.3" fill="none" class="acc">
<path d="M180 40 L210 64"/><path d="M180 88 L210 112"/><path d="M180 136 L210 160"/><path d="M180 184 L210 208"/>
<path d="M310 40 L340 88"/><path d="M310 64 L340 112"/><path d="M310 136 L340 184"/><path d="M310 160 L340 208"/>
<path d="M440 40 L470 136"/><path d="M440 64 L470 160"/><path d="M440 88 L470 184"/><path d="M440 112 L470 208"/>
</g>
</svg>
<figcaption>Figure 10.1. The Möbius transform. At each stage, every entry whose index has the stage's bit set is xored with the entry that differs only in that bit. Three stages turn the truth table of majority into its ANF, x₁x₂ + x₁x₃ + x₂x₃. The same butterfly shape, with + and − instead of xor, gives the Walsh-Hadamard transform.</figcaption>
</figure>

**Why degree matters.** A function of degree $d$ becomes affine after $d - 1$
"derivatives" $f(x) \oplus f(x \oplus a)$, each of which lowers the degree by at
least 1. So low degree helps higher-order differential attacks (Lars Knudsen,
1994) and cube attacks (Itai Dinur and Adi Shamir, 2009), and algebraic attacks
that write the cipher as equations of low degree. The degree of an $n$-bit
permutation is at most $n - 1$, since a permutation's component functions are
balanced and a balanced function of $n$ variables has degree below $n$.


### The Möbius transform by hand

Take a function that is less symmetric than majority. Its truth table, for
inputs 0 to 7 (with $x_1$ the lowest bit), is

$$f = 0, 1, 1, 1, 0, 0, 1, 0.$$

Run the butterfly of Figure 10.1 on it. In stage 1 every entry with an odd index
(that is, with $x_1 = 1$) is xored with its left neighbor: entries 1, 3, 5, 7
become $1 \oplus 0 = 1$, $1 \oplus 1 = 0$, $0 \oplus 0 = 0$ and $0 \oplus 1 = 1$.
The table is now $0, 1, 1, 0, 0, 0, 1, 1$. In stage 2 the entries with $x_2 = 1$
(indices 2, 3, 6, 7) take in the entries two places back: $1 \oplus 0 = 1$,
$0 \oplus 1 = 1$, $1 \oplus 0 = 1$, $1 \oplus 0 = 1$, giving
$0, 1, 1, 1, 0, 0, 1, 1$. In stage 3 the entries with $x_3 = 1$ (indices 4 to 7)
take in the entries four places back: $0 \oplus 0 = 0$, $0 \oplus 1 = 1$,
$1 \oplus 1 = 0$, $1 \oplus 1 = 0$. The result is

$$a = 0, 1, 1, 1, 0, 1, 0, 0.$$

The ones sit at indices 1, 2, 3 and 5, which in binary are the monomials $x_1$,
$x_2$, $x_1x_2$ and $x_1x_3$. So

$$f = x_1 \oplus x_2 \oplus x_1x_2 \oplus x_1x_3,$$

of degree 2. Check one input: at $x = 7$ (all three bits 1) the four terms are
all 1 and their xor is 0, which is entry 7 of the truth table. The butterfly
used twelve xors, $n 2^{n-1}$ for $n = 3$.

### Coefficients are cube sums

Why does the butterfly work? Write $y \preceq x$ when every bit set in $y$ is
also set in $x$. A monomial $\prod_{i \in T} x_i$ is 1 at the point $x$ exactly
when $T \preceq x$ (reading the set $T$ as a bit vector), so evaluating the ANF
gives

$$f(x) = \bigoplus_{T \preceq x} a_T .$$

The inverse formula is the one the butterfly computes:

$$a_S = \bigoplus_{x \preceq S} f(x).$$

*Proof.* Substitute the first formula into the second:
$\bigoplus_{x \preceq S} f(x) = \bigoplus_{T} a_T \cdot \#\{x : T \preceq x
\preceq S\}$, counted mod 2. If $T \preceq S$ the points between $T$ and $S$ are
the $2^{|S| - |T|}$ ways of choosing the bits of $S$ outside $T$, an even number
unless $T = S$. If $T \not\preceq S$ there are none. Only $a_S$ survives.
$\blacksquare$

The points $x \preceq S$ form a **cube**: the bits in $S$ run over all $2^{|S|}$
values and the others are held at 0. So every ANF coefficient is the xor of $f$
over one cube. For the function above, the coefficient of $x_1x_3$ is
$f(000) \oplus f(100) \oplus f(001) \oplus f(101) = 0 \oplus 1 \oplus 0 \oplus 0
= 1$, and the coefficient of $x_1x_2x_3$ is the xor of all eight values, 0.
Figure 10.2 draws both.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="A three-dimensional cube whose eight corners are the inputs of a three-variable function, labeled with its values; the four corners with x2 equal to 0 form a shaded face whose values xor to 1, the coefficient of x1x3, while all eight values xor to 0, the coefficient of x1x2x3" fill="currentColor" font-size="13">
<polygon points="70,200 210,200 210,80 70,80" fill-opacity=".15" stroke="none"/>
<g stroke="currentColor" stroke-width="1.2" fill="none">
<path d="M70,200L210,200M70,200L70,80M210,200L210,80M70,80L210,80"/>
<path d="M70,200L140,150M210,200L280,150M140,150L280,150M140,150L140,30M280,150L280,30M70,80L140,30M210,80L280,30M140,30L280,30" stroke-dasharray="4 3" stroke-opacity=".6"/>
</g>
<circle cx="70" cy="200" r="4"/>
<text x="62" y="216" text-anchor="end" font-size="12">000: 0</text>
<circle cx="210" cy="200" r="4"/>
<text x="218" y="216" text-anchor="start" font-size="12">100: 1</text>
<circle cx="140" cy="150" r="4"/>
<text x="132" y="142" text-anchor="end" font-size="12">010: 1</text>
<circle cx="280" cy="150" r="4"/>
<text x="288" y="142" text-anchor="start" font-size="12">110: 1</text>
<circle cx="70" cy="80" r="4"/>
<text x="62" y="96" text-anchor="end" font-size="12">001: 0</text>
<circle cx="210" cy="80" r="4"/>
<text x="218" y="96" text-anchor="start" font-size="12">101: 0</text>
<circle cx="140" cy="30" r="4"/>
<text x="132" y="22" text-anchor="end" font-size="12">011: 1</text>
<circle cx="280" cy="30" r="4"/>
<text x="288" y="22" text-anchor="start" font-size="12">111: 0</text>
<text x="40" y="250" font-size="12" fill-opacity=".7">corner x₁x₂x₃ : f(x)</text>
<text x="350" y="36">f = x₁ + x₂ + x₁x₂ + x₁x₃</text>
<text x="350" y="72">shaded face (x₂ = 0):</text>
<text x="350" y="90">f(000) + f(100) + f(001) + f(101)</text>
<text x="350" y="108">= 0 + 1 + 0 + 0 = 1,</text>
<text x="350" y="126">the coefficient of x₁x₃</text>
<text x="350" y="162">whole cube: all 8 values sum to 0,</text>
<text x="350" y="180">the coefficient of x₁x₂x₃ (degree 2)</text>
</svg>
<figcaption>Figure 10.2. Coefficients as cube sums. The corners of the cube are the eight inputs of f, labeled by their bits x₁x₂x₃ and the value of f. The xor of f over the shaded face, where x₂ = 0, is the ANF coefficient of x₁x₃; the xor over all eight corners is the coefficient of x₁x₂x₃, which is 0 because f has degree 2.</figcaption>
</figure>

A cube sum is also a repeated derivative. The xor over a one-dimensional cube in
direction $e_i$ is $f(x) \oplus f(x \oplus e_i)$, the derivative $D_{e_i} f$;
the xor over a $k$-dimensional cube is $k$ derivatives in a row. Each derivative
lowers the degree by at least 1, which is the fact behind the next subsection.

### Break it: a cube attack on a toy cipher

*This subsection is intermediate.*

Now let some of the variables be secret. A stream cipher's first output bit is a
Boolean function $z(v, k)$ of public IV bits $v$ and key bits $k$. Group its ANF
by the IV monomials: for a set $I$ of IV bits,

$$z(v, k) = \Big(\prod_{i \in I} v_i\Big) \cdot p_I(v, k) \oplus q(v, k),$$

where no term of $q$ contains all the variables in $I$. The cube-sum formula,
applied to the IV bits only, says that the xor of $z$ over the $2^{|I|}$ IVs
that use only bits in $I$ equals $p_I(0, k)$, the **superpoly**: a polynomial in
the key alone. If $z$ has total degree $d$, every term of $p_I$ has degree at most
$d - |I|$, so a cube of $d - 1$ IV bits gives a superpoly of degree at most 1, a
linear equation in the key. The attacker chooses the IVs, asks the device for
$2^{|I|}$ output bits, xors them, and reads off one linear equation per cube.
This is the **cube attack** of Itai Dinur and Adi Shamir (EUROCRYPT 2009), which
grew out of Xuejia Lai's higher-order derivatives (1994) and Michael Vielhaber's
AIDA attack (2007). Its use against Trivium is told in
[Cryptanalysis, Chapter 8](../cryptanalysis/08-Attacks-on-Stream-Ciphers.md#813-cube-attacks-on-reduced-trivium);
here is the mathematics on something small enough to see whole.

The toy cipher takes an 8-bit IV and an 8-bit key. It xors the low halves,
applies PRESENT's 4-bit S-box (§10.6), xors in the high halves of IV and key,
applies the S-box again and outputs the lowest bit. Its ANF in all 16 variables
has degree 4, so every cube of three IV bits gives a superpoly of degree at most
1. In the **preprocessing** phase the attacker, who knows the design but not the
key, computes each superpoly's truth table over all 256 keys and turns it into
an ANF with the Möbius transform. In the **online** phase the device's key is
fixed and only cube sums are available.

```python
# Uses anf(), anf_str() and degree() from the listing above.
from itertools import combinations
P = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]

def toy(v, k):
    """Toy cipher: 8-bit IV v, 8-bit key k, two S-box layers, one output bit."""
    x = P[(v ^ k) & 15]
    return P[x ^ (v >> 4) ^ (k >> 4)] & 1

def cube_sum(cube, k):
    """XOR of toy(v, k) over every v that uses only the IV bits in cube."""
    s = 0
    for m in range(1 << len(cube)):
        v = sum(1 << c for i, c in enumerate(cube) if m >> i & 1)
        s ^= toy(v, k)
    return s

K = "k0 k1 k2 k3 k4 k5 k6 k7".split()
found = []                                   # preprocessing: the attacker picks keys
for cube in combinations(range(8), 3):
    sup = anf([cube_sum(cube, k) for k in range(256)])   # superpoly's ANF
    if degree(sup) == 1:
        found.append((cube, sup))
print(len(found), "linear superpolys, for example:")
for cube, sup in found[:3]:
    print("  cube", cube, "->", anf_str(sup, K))

secret = 0xB7                                # online: the device's key
rows = []
for cube, sup in found:
    bits = sum(1 << i for i in range(8) if sup[1 << i])
    rows.append(bits << 1 | cube_sum(cube, secret) ^ sup[0])   # equation: bits.k = rhs
basis = []                                   # Gaussian elimination mod 2
for r in rows:
    for b in basis:
        r = min(r, r ^ b)                    # clear b's leading bit from r
    if r > 1:
        basis = sorted(basis + [r], reverse=True)
print("rank", len(basis), "of 8")
left = [k for k in range(256) if all(bin(r >> 1 & k).count("1") % 2 == r & 1 for r in basis)]
print("keys left", [hex(k) for k in left])
print("same output on all 256 IVs:", [hex(k) for k in left if all(toy(v, k) == toy(v, secret) for v in range(256))])
```

It prints:

```text
14 linear superpolys, for example:
  cube (0, 1, 2) -> k6
  cube (0, 1, 3) -> 1 + k5 + k6
  cube (0, 1, 5) -> 1 + k3
rank 6 of 8
keys left ['0x27', '0x37', '0xa7', '0xb7']
same output on all 256 IVs: ['0x27', '0xb7']
```

Fourteen of the 56 cubes give a nonconstant linear superpoly; the other 42 give
constants and are useless. The fourteen equations have rank 6, so 6 of the 8 key
bits fall to $14 \times 8 = 112$ chosen-IV queries, and four candidates remain
for a final search. Two of them, 0x27 and 0xB7, give the same output bit for
every IV: for this one-bit cipher they are the same key, and no attack can tell
them apart. Against a real cipher the superpolys cannot be tabulated over all
keys, so the attacker tests candidate cubes for linearity with random keys; that
search belongs to the attacker's book.

## 10.3 The Walsh-Hadamard transform

*Level: beginner.*

To measure how close $f$ is to each affine function, compare them on all inputs.
For a vector $a \in \{0, 1\}^n$ let $a \cdot x = a_1x_1 \oplus \dots \oplus
a_nx_n$, a linear function. Define

$$W_f(a) = \sum_{x} (-1)^{f(x) \oplus a \cdot x}.$$

Each term is $+1$ when $f(x)$ and $a \cdot x$ agree and $-1$ when they differ, so

$$W_f(a) = (\text{agreements}) - (\text{disagreements}) = 2^n - 2\,d(f, a \cdot
x),$$

where $d$ counts the inputs on which they differ (the Hamming distance between
truth tables). $W_f(a) = 2^n$ means $f = a \cdot x$; $W_f(a) = -2^n$ means $f = a
\cdot x \oplus 1$; and $W_f(a) = 0$ means $f$ agrees with $a \cdot x$ exactly half
the time, as a random function would. The list of all $2^n$ values is the
**Walsh spectrum**. The **correlation** of $f$ with $a \cdot x$ is $W_f(a)/2^n$,
between $-1$ and $1$.

**Parseval's identity.** For every Boolean function,

$$\sum_a W_f(a)^2 = 2^{2n}.$$

*Proof.* Expand the square: $\sum_a W_f(a)^2 = \sum_{x, y} (-1)^{f(x) \oplus f(y)}
\sum_a (-1)^{a \cdot (x \oplus y)}$. The inner sum is $2^n$ if $x = y$ and 0
otherwise (half of all $a$ have $a \cdot z = 1$ for any $z \neq 0$). So only the
$2^n$ terms with $x = y$ survive, each contributing $2^n$. $\blacksquare$

Parseval says the total "correlation energy" is fixed. A function cannot be
uncorrelated with every linear function: if it is less correlated with some, it
must be more with others.

### The fast transform

Computing all $2^n$ values directly takes $4^n$ steps. The **fast Walsh-Hadamard
transform** uses the same butterfly as the Möbius transform, with $(u, v) \mapsto
(u + v, u - v)$ in place of xor, and takes $n 2^n$ steps. It is the binary
cousin of the fast Fourier transform (Chapter 11).

```python
def walsh(tt):
    """Fast Walsh-Hadamard transform of (-1)^f: W(a) = sum_x (-1)^(f(x) + a.x)."""
    w = [1 - 2 * b for b in tt]
    h = 1
    while h < len(w):
        for i in range(0, len(w), 2 * h):
            for j in range(i, i + h):
                w[j], w[j + h] = w[j] + w[j + h], w[j] - w[j + h]
        h *= 2
    return w

def nonlinearity(tt):
    return len(tt) // 2 - max(abs(v) for v in walsh(tt)) // 2

W = walsh(maj)
print(W, sum(v * v for v in W), nonlinearity(maj))
```

```text
[0, 4, 4, 0, 4, 0, 0, -4] 64 2
```

Majority is balanced ($W(0) = 0$), agrees with each single input $x_i$ six times
out of eight ($W = 4$, correlation 1/2), and is at distance 2 from the nearest
affine function. The squares sum to $64 = 2^6$, as Parseval promises.


### By hand: a spectrum, stage by stage

Take the function of §10.2 again, $f = x_1 \oplus x_2 \oplus x_1x_2 \oplus
x_1x_3$ with truth table $0, 1, 1, 1, 0, 0, 1, 0$. First replace each bit $b$ by
$(-1)^b$:

$$1, -1, -1, -1, 1, 1, -1, 1.$$

**Stage 1** pairs neighbors (indices 0 and 1, 2 and 3, and so on) and writes
their sum and difference: $(1, -1) \to (0, 2)$, $(-1, -1) \to (-2, 0)$,
$(1, 1) \to (2, 0)$, $(-1, 1) \to (0, -2)$. The list is $0, 2, -2, 0, 2, 0, 0,
-2$.

**Stage 2** pairs entries two apart (0 with 2, 1 with 3, 4 with 6, 5 with 7):
$(0, -2) \to (-2, 2)$, $(2, 0) \to (2, 2)$, $(2, 0) \to (2, 2)$, $(0, -2) \to
(-2, 2)$. The list is $-2, 2, 2, 2, 2, -2, 2, 2$.

**Stage 3** pairs entries four apart: $(-2, 2) \to (0, -4)$, $(2, -2) \to (0,
4)$, $(2, 2) \to (4, 0)$, $(2, 2) \to (4, 0)$. Putting each result back in its
place:

$$W_f = 0, 0, 4, 4, -4, 4, 0, 0.$$

Check one value against the definition. $W_f(4)$ compares $f$ with $a \cdot x =
x_3$, whose truth table is $0, 0, 0, 0, 1, 1, 1, 1$. They agree only at inputs 0
and 6, so $W_f(4) = 2 - 6 = -4$: $f$ disagrees with $x_3$ six times out of eight,
which means it agrees with $x_3 \oplus 1$ six times out of eight. The other
nonzero values say the same about $x_2$, $x_1 \oplus x_2$ and $x_1 \oplus x_3$.
$W_f(0) = 0$ says $f$ is balanced. The largest $|W_f|$ is 4, so the nonlinearity
is $4 - 2 = 2$: changing two of the eight outputs turns $f$ into an affine
function (for example $x_2$). And $4 \cdot 4^2 = 64 = 2^{2 \cdot 3}$, as
Parseval requires.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Bar chart of the Walsh spectrum of f = x1 + x2 + x1x2 + x1x3: zero at a = 000, 100, 011 and 111 in the order shown, plus 4 at x2, x1+x2 and x1+x3, and minus 4 at x3; dashed lines at plus and minus 8 mark a perfect match" fill="currentColor" font-size="12">
<line x1="70" y1="125" x2="620" y2="125" stroke="currentColor"/>
<line x1="70" y1="29" x2="620" y2="29" stroke="currentColor" stroke-dasharray="4 4" stroke-opacity=".5"/>
<line x1="70" y1="221" x2="620" y2="221" stroke="currentColor" stroke-dasharray="4 4" stroke-opacity=".5"/>
<text x="62" y="33" text-anchor="end">+8</text><text x="62" y="129" text-anchor="end">0</text><text x="62" y="225" text-anchor="end">−8</text>
<text x="62" y="81" text-anchor="end">+4</text><text x="62" y="177" text-anchor="end">−4</text>
<text x="105" y="119" text-anchor="middle">0</text>
<text x="105" y="242" text-anchor="middle" font-size="11">0</text>
<text x="105" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 000</text>
<text x="172" y="119" text-anchor="middle">0</text>
<text x="172" y="242" text-anchor="middle" font-size="11">x₁</text>
<text x="172" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 001</text>
<rect x="219" y="77" width="40" height="48" fill-opacity=".55"/>
<text x="239" y="71" text-anchor="middle">+4</text>
<text x="239" y="242" text-anchor="middle" font-size="11">x₂</text>
<text x="239" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 010</text>
<rect x="286" y="77" width="40" height="48" fill-opacity=".55"/>
<text x="306" y="71" text-anchor="middle">+4</text>
<text x="306" y="242" text-anchor="middle" font-size="11">x₁+x₂</text>
<text x="306" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 011</text>
<rect x="353" y="125" width="40" height="48" fill-opacity=".55"/>
<text x="373" y="189" text-anchor="middle">-4</text>
<text x="373" y="242" text-anchor="middle" font-size="11">x₃</text>
<text x="373" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 100</text>
<rect x="420" y="77" width="40" height="48" fill-opacity=".55"/>
<text x="440" y="71" text-anchor="middle">+4</text>
<text x="440" y="242" text-anchor="middle" font-size="11">x₁+x₃</text>
<text x="440" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 101</text>
<text x="507" y="119" text-anchor="middle">0</text>
<text x="507" y="242" text-anchor="middle" font-size="11">x₂+x₃</text>
<text x="507" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 110</text>
<text x="574" y="119" text-anchor="middle">0</text>
<text x="574" y="242" text-anchor="middle" font-size="11">x₁+x₂+x₃</text>
<text x="574" y="258" text-anchor="middle" font-size="11" fill-opacity=".7">a = 111</text>
<text x="345" y="18" text-anchor="middle">W_f(a): +8 means f = a·x, −8 means f = a·x + 1, 0 means a coin toss</text>
</svg>
<figcaption>Figure 10.3. The Walsh spectrum of f = x₁ + x₂ + x₁x₂ + x₁x₃, one bar per linear function a·x. Four of the eight linear functions are coin tosses against f; the other four agree or disagree with it six times in eight. A bar reaching the dashed line at ±8 would mean f is that linear function or its complement.</figcaption>
</figure>

The code agrees, and also checks the fast transform against the definition summed
term by term:

```python
# Uses anf(), anf_str() and walsh() from the listings above.
f = [0, 1, 1, 1, 0, 0, 1, 0]
print(anf_str(anf(f)), walsh(f), nonlinearity(f))
direct = [sum((-1) ** (f[x] ^ bin(a & x).count("1") % 2) for x in range(8)) for a in range(8)]
print(direct == walsh(f))
```

```text
x1 + x2 + x1x2 + x1x3 [0, 0, 4, 4, -4, 4, 0, 0] 2
True
```

## 10.4 Nonlinearity and bent functions

*Level: beginner.*

The **nonlinearity** of $f$ is its distance to the nearest affine function:

$$NL(f) = \min_{a, c}\, d(f, a \cdot x \oplus c) = 2^{n-1} - \tfrac12 \max_a
|W_f(a)|.$$

Large nonlinearity means no linear approximation is much better than a coin toss.
How large can it be? By Parseval, the average of $W_f(a)^2$ over the $2^n$ values
of $a$ is $2^n$, so the largest $|W_f(a)|$ is at least $2^{n/2}$. Hence

$$NL(f) \le 2^{n-1} - 2^{n/2 - 1}.$$

Functions that reach this bound have $|W_f(a)| = 2^{n/2}$ for *every* $a$: a
perfectly flat spectrum. Oscar Rothaus named them **bent functions** (in a paper
written in 1966 and published in 1976). Since $W_f(a)$ is an integer, they exist
only for even $n$. The simplest is

$$f(x_1, x_2, x_3, x_4) = x_1x_2 \oplus x_3x_4,$$

and in general $x_1x_2 \oplus x_3x_4 \oplus \dots \oplus x_{n-1}x_n$.

```python
bent = [((x & 1) & (x >> 1 & 1)) ^ ((x >> 2 & 1) & (x >> 3 & 1)) for x in range(16)]   # x1x2 + x3x4
print(walsh(bent), nonlinearity(bent), sum(bent))
```

```text
[4, 4, 4, -4, 4, 4, 4, -4, 4, 4, 4, -4, -4, -4, -4, 4] 6 6
```

Every Walsh value is $\pm 4$: the function is equally (and weakly) correlated with
all sixteen linear functions, and its nonlinearity 6 is the maximum for $n = 4$.
But it has 6 ones out of 16, so it is not **balanced** (a balanced function has
$2^{n-1}$ ones, equivalently $W_f(0) = 0$). A bent function can never be balanced,
since $W_f(0) = \pm 2^{n/2} \ne 0$. And an S-box that is a permutation has only
balanced component functions. So S-box designers cannot use bent functions
directly, and settle for the best balanced nonlinearity they can find.


### Every function of four variables, measured

Four variables are few enough to look at all $2^{16} = 65{,}536$ Boolean
functions at once: compute each one's Walsh spectrum, record its nonlinearity,
and keep the bent ones.

```python
# Uses walsh(), anf() and degree() from the listings above.
from collections import Counter
nl, bents = Counter(), []
for t in range(1 << 16):                     # every Boolean function of 4 variables
    tt = [t >> x & 1 for x in range(16)]
    w = walsh(tt)
    nl[8 - max(abs(v) for v in w) // 2] += 1
    if all(abs(v) == 4 for v in w):
        bents.append(tt)
print(sorted(nl.items()))
print(len(bents), Counter(sum(b) for b in bents), Counter(degree(anf(b)) for b in bents))

def derivative_balanced(tt, a):
    return sum(tt[x] ^ tt[x ^ a] for x in range(len(tt))) == len(tt) // 2
print(all(derivative_balanced(b, a) for b in bents for a in range(1, 16)))
```

It prints:

```text
[(0, 32), (1, 512), (2, 3840), (3, 17920), (4, 28000), (5, 14336), (6, 896)]
896 Counter({6: 448, 10: 448}) Counter({2: 896})
True
```

The first line is the whole distribution of nonlinearity. Exactly 32 functions
have nonlinearity 0: the 16 linear functions and their complements, the affine
functions. Only 896 reach the bound 6, and those are the bent functions. Half of
them have weight 6 and half weight 10 (the complements), never 8, as balance
forbids. All 896 have degree 2. The last line checks a characterization proved
next: every one of them has all its derivatives balanced.

### Bent means every derivative is balanced

The **autocorrelation** of $f$ in direction $u$ is
$C_f(u) = \sum_x (-1)^{f(x) \oplus f(x \oplus u)}$, which is 0 exactly when the
derivative $D_u f(x) = f(x) \oplus f(x \oplus u)$ is balanced. Expanding a
square, as in the proof of Parseval, gives

$$\sum_a W_f(a)^2 (-1)^{a \cdot u} = 2^n C_f(u).$$

If $f$ is bent, $W_f(a)^2 = 2^n$ for every $a$, the left side is $2^n \sum_a
(-1)^{a \cdot u}$, which is 0 for $u \ne 0$; so every derivative in a nonzero
direction is balanced. Conversely, if every such derivative is balanced, the
right side is $2^{2n}$ at $u = 0$ and 0 elsewhere, and inverting the transform
(it is its own inverse up to the factor $2^n$) gives $W_f(a)^2 = 2^n$ for every
$a$. So: **$f$ is bent exactly when $f(x) \oplus f(x \oplus u)$ is balanced for
every $u \ne 0$.** A bent function is a perfect differential object: whatever
difference you put in, the output difference is a fair coin. That is why
Kaisa Nyberg called vectorial bent functions **perfect nonlinear**.

By hand, for $f = x_1x_2 \oplus x_3x_4$ and $u = (u_1, u_2, u_3, u_4) \ne 0$:

$$D_u f = u_1x_2 \oplus u_2x_1 \oplus u_1u_2 \oplus u_3x_4 \oplus u_4x_3 \oplus
u_3u_4,$$

because the quadratic terms cancel. This is an affine function with at least one
variable present (some $u_i$ is 1), so it is balanced. The function is bent, with
no Walsh transform computed.

### Where the 896 come from

Every degree-2 function of four variables is $Q(x) \oplus (\text{affine})$ for a
quadratic part $Q$, and its derivatives are affine: $D_uQ$ is $B(u, x)$ plus a
constant, where $B(u, x) = Q(x \oplus u) \oplus Q(x) \oplus Q(u) \oplus Q(0)$ is
a bilinear form. The derivative is balanced for every $u \ne 0$ exactly when the
form $B$ is nondegenerate (no $u \ne 0$ has $B(u, x) = 0$ for all $x$). Count
the quadratic parts: there are $2^6 = 64$ choices of the six coefficients of
$x_ix_j$, and 28 of them give a nondegenerate form (the classical count of
nondegenerate alternating forms on $\mathbb{F}_2^4$ is $2^2 (2 - 1)(2^3 - 1) =
28$). Each can be combined with any of the 32 affine functions, and $28 \times 32
= 896$. Every bent function of four variables is quadratic, by a theorem of
Rothaus: a bent function of $n \ge 4$ variables has degree at most $n/2$.

For larger $n$ there are many more, and many kinds. The **Maiorana-McFarland**
construction splits the input into halves $x, y \in \mathbb{F}_2^{n/2}$ and sets

$$f(x, y) = x \cdot \pi(y) \oplus g(y)$$

for any permutation $\pi$ of $\mathbb{F}_2^{n/2}$ and any function $g$. Its
derivative in a direction that moves $y$ involves $x \cdot (\pi(y) \oplus
\pi(y \oplus u))$, which is balanced in $x$ because $\pi$ is a permutation; a
direction that moves only $x$ gives $u \cdot \pi(y)$, balanced in $y$. Bart
Preneel counted 5,425,430,528 bent functions of six variables (1993); Philippe
Langevin and Gregor Leander counted those of eight variables in 2011, about
$2^{106}$. Beyond that nobody knows the number, and classifying bent functions
is open.

## 10.5 Correlation immunity and the combining generator

*Level: intermediate.*

Back to the stream ciphers of Chapter 9. A **combining generator** runs $n$
LFSRs in parallel and outputs $f(x_1, \dots, x_n)$ of their current bits. If $f$
agrees with $x_1$ more often than half the time, then the keystream agrees with
LFSR 1's output more often than half the time, and Thomas Siegenthaler's
**correlation attack** (1985) recovers LFSR 1's state alone by trying all its
initial states and counting agreements, then moves on to the others. Instead of
the product of all the state spaces, the attacker pays their sum.

Siegenthaler (1984) defined the defense: $f$ is **correlation-immune of order
$m$** if its output is statistically independent of every set of at most $m$
inputs. Guo-Zhen Xiao and James Massey (1988) gave a spectral test: $f$ is
correlation-immune of order $m$ exactly when $W_f(a) = 0$ for every $a$ with
$1 \le \operatorname{wt}(a) \le m$. If $f$ is also balanced, it is **$m$-resilient**.

```python
def correlation_immunity(tt):
    """Largest m such that W(a) = 0 for every a with 1 <= weight(a) <= m (Xiao-Massey)."""
    W = walsh(tt)
    n = len(tt).bit_length() - 1
    m = 0
    while m < n and all(W[a] == 0 for a in range(1, len(tt)) if bin(a).count("1") == m + 1):
        m += 1
    return m

xor3 = [bin(x).count("1") % 2 for x in range(8)]
geffe = [((x & 1) & (x >> 1 & 1)) ^ ((x >> 1 & 1) & (x >> 2 & 1)) ^ (x >> 2 & 1) for x in range(8)]
for name, f in (("majority", maj), ("x1+x2+x3", xor3), ("Geffe", geffe)):
    agree = [sum(f[x] == (x >> i & 1) for x in range(8)) / 8 for i in range(3)]
    print(name, correlation_immunity(f), degree(anf(f)), agree)
```

```text
majority 0 2 [0.75, 0.75, 0.75]
x1+x2+x3 2 1 [0.5, 0.5, 0.5]
Geffe 0 2 [0.75, 0.5, 0.75]
```

The **Geffe generator** (Philip Geffe, 1973) uses $x_2$ to choose between $x_1$
and $x_3$: $f = x_1x_2 \oplus x_2x_3 \oplus x_3$. Its output agrees with $x_1$
and with $x_3$ three times in four, so a correlation attack breaks it register by
register. The xor $x_1 \oplus x_2 \oplus x_3$ is 2-resilient, perfectly immune,
and linear: Berlekamp-Massey breaks it at once.

That is not bad luck. **Siegenthaler's trade-off**: if $f$ has $n$ variables,
degree $d$ and correlation immunity $m$, then $d + m \le n$, and $d + m \le n - 1$
if $f$ is balanced. High immunity forces low degree. Willi Meier and Othmar
Staffelbach's fast correlation attacks (1988) and later algebraic attacks
(Nicolas Courtois and Meier, 2003) squeezed the remaining room, and designers
moved away from pure combining generators.

!!! note "Life story: the Walsh-Hadamard transform"
    **Born:** 1923, Joseph Walsh's complete set of $\pm 1$-valued functions;
    Jacques Hadamard's matrices (1893) with entries $\pm 1$ and orthogonal rows
    · **Purpose:** decompose a function into its correlations with every linear
    function, as the Fourier transform decomposes a signal into waves
    · **Helped:** linear cryptanalysis, correlation attacks, S-box evaluation,
    the Hadamard code that sent Mariner 9's pictures of Mars in 1971, the
    spreading codes of CDMA phones, and the proof of the PCP theorem in
    complexity theory · **Status:** the standard tool; every S-box paper
    prints a Walsh spectrum

## 10.6 S-boxes: the difference and linear tables

*Level: intermediate.*

An $n \times m$ **S-box** $S$ maps $n$ bits to $m$ bits. Its **component
functions** are the Boolean functions $b \cdot S(x)$ for nonzero $b \in \{0,
1\}^m$: every xor of output bits. An S-box is as weak as its weakest component,
and as weak as its weakest *pair* of input and output patterns.

### The difference distribution table

Differential cryptanalysis (Eli Biham and Adi Shamir, 1990) follows a fixed input
**difference** $a = x \oplus x'$ through the cipher. Key additions do not change
differences, and linear layers change them predictably; only S-boxes do something
random. The **difference distribution table** (DDT) counts

$$\mathrm{DDT}[a][b] = \#\{x : S(x) \oplus S(x \oplus a) = b\}.$$

The row $a = 0$ is all in column 0. Every entry is even ($x$ and $x \oplus a$ count
together). The probability that difference $a$ becomes $b$ is $\mathrm{DDT}[a][b] /
2^n$. The S-box's **differential uniformity** is the largest entry with $a \ne 0$;
the attacker wants it large, the designer small. It is at least 2.

### The linear approximation table

Linear cryptanalysis (Mitsuru Matsui, 1993) looks for **masks** $a$, $b$ such that
$a \cdot x = b \cdot S(x)$ holds noticeably more or less often than half the time.
The **linear approximation table** (LAT) records the bias:

$$\mathrm{LAT}[a][b] = \#\{x : a \cdot x = b \cdot S(x)\} - 2^{n-1} = \tfrac12
W_{b \cdot S}(a).$$

So the LAT is the Walsh spectra of all components, side by side. The S-box's
**linearity** is $\max_{a,\, b \ne 0} |W_{b\cdot S}(a)|$, and its nonlinearity is
$2^{n-1}$ minus half the linearity.

### By hand

Take a 2-bit S-box $S = [0, 1, 3, 2]$ (that is, $S(0) = 0$, $S(1) = 1$, $S(2) =
3$, $S(3) = 2$). For input difference $a = 1$: $S(0) \oplus S(1) = 1$, $S(1)
\oplus S(0) = 1$, $S(2) \oplus S(3) = 1$, $S(3) \oplus S(2) = 1$. All four inputs
give output difference 1: $\mathrm{DDT}[1][1] = 4$, probability 1. This S-box is
linear (it is $x \mapsto (x_1 \oplus x_2, x_2)$ in some bit order), so its
differences are deterministic. A good S-box spreads every row of the DDT as
evenly as possible.

### PRESENT's S-box

PRESENT (Andrey Bogdanov and colleagues, CHES 2007; ISO/IEC 29192-2) is a
lightweight block cipher whose only nonlinear part is one 4-bit S-box,
`C56B90AD3EF84712` in hexadecimal.

```python
# Uses walsh() and nonlinearity() from the listings above.
PRESENT = [0xC, 0x5, 0x6, 0xB, 0x9, 0x0, 0xA, 0xD, 0x3, 0xE, 0xF, 0x8, 0x4, 0x7, 0x1, 0x2]

def ddt(S):
    n = len(S)
    T = [[0] * n for _ in range(n)]
    for x in range(n):
        for a in range(n):
            T[a][S[x] ^ S[x ^ a]] += 1
    return T

def lat(S):
    """LAT[a][b] = #{x : a.x = b.S(x)} - n/2."""
    n = len(S)
    dot = lambda u, v: bin(u & v).count("1") & 1
    return [[sum(dot(a, x) == dot(b, S[x]) for x in range(n)) - n // 2 for b in range(n)] for a in range(n)]

D, Lt = ddt(PRESENT), lat(PRESENT)
print(max(D[a][b] for a in range(1, 16) for b in range(16)),
      max(abs(Lt[a][b]) for a in range(16) for b in range(1, 16)))
for row in D[:4]:
    print(row)
print(min(nonlinearity([bin(b & PRESENT[x]).count("1") & 1 for x in range(16)]) for b in range(1, 16)))
```

```text
4 4
[16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
[0, 0, 0, 4, 0, 0, 0, 4, 0, 4, 0, 0, 0, 4, 0, 0]
[0, 0, 0, 2, 0, 4, 2, 0, 0, 0, 2, 0, 2, 2, 2, 0]
[0, 2, 0, 2, 2, 0, 4, 2, 0, 0, 2, 2, 0, 0, 0, 0]
4
```

Differential uniformity 4 (best difference probability $4/16 = 1/4$) and a largest
LAT entry of 4 (best bias $4/16 = 1/4$, correlation $1/2$). The last line says
the same thing per component: all fifteen functions $b \cdot S$ have
nonlinearity 4, the most a balanced function of four variables can have (§10.4
showed that 6 needs a bent function, and bent functions are never balanced). For 4-bit
permutations these are the best possible values: Gregor Leander and Axel
Poschmann (2007) sorted all 4-bit S-boxes into equivalence classes and found that
the optimal ones fall into 16 classes. PRESENT's box also has the extra property
that a single-bit input difference never gives a single-bit output difference, which
the designers used to count active S-boxes across the bit permutation.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The 16 by 16 difference distribution table of the PRESENT S-box drawn as a grid: one full cell at the top left, and in the other rows only entries 0, 2 and 4, with no row having a large entry" fill="currentColor" font-size="12">
<rect x="149" y="29" width="209" height="209" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="150" y="30" width="12" height="12" fill-opacity="0.6"/>
<path d="M189,43h12v12h-12zM241,43h12v12h-12zM267,43h12v12h-12zM319,43h12v12h-12zM215,56h12v12h-12zM228,69h12v12h-12zM215,82h12v12h-12zM306,95h12v12h-12zM293,108h12v12h-12zM345,108h12v12h-12zM163,121h12v12h-12zM345,121h12v12h-12zM293,134h12v12h-12zM345,134h12v12h-12zM202,147h12v12h-12zM332,147h12v12h-12zM215,160h12v12h-12zM254,173h12v12h-12zM215,186h12v12h-12zM176,199h12v12h-12zM163,225h12v12h-12zM202,225h12v12h-12zM332,225h12v12h-12zM345,225h12v12h-12zM400,90h12v12h-12z" class="acc-fill"/>
<path d="M189,56h12v12h-12zM228,56h12v12h-12zM280,56h12v12h-12zM306,56h12v12h-12zM319,56h12v12h-12zM332,56h12v12h-12zM163,69h12v12h-12zM189,69h12v12h-12zM202,69h12v12h-12zM241,69h12v12h-12zM280,69h12v12h-12zM293,69h12v12h-12zM228,82h12v12h-12zM241,82h12v12h-12zM267,82h12v12h-12zM280,82h12v12h-12zM306,82h12v12h-12zM332,82h12v12h-12zM163,95h12v12h-12zM202,95h12v12h-12zM267,95h12v12h-12zM280,95h12v12h-12zM293,95h12v12h-12zM319,95h12v12h-12zM176,108h12v12h-12zM228,108h12v12h-12zM254,108h12v12h-12zM306,108h12v12h-12zM176,121h12v12h-12zM228,121h12v12h-12zM254,121h12v12h-12zM306,121h12v12h-12zM189,134h12v12h-12zM241,134h12v12h-12zM267,134h12v12h-12zM319,134h12v12h-12zM176,147h12v12h-12zM228,147h12v12h-12zM254,147h12v12h-12zM306,147h12v12h-12zM176,160h12v12h-12zM189,160h12v12h-12zM254,160h12v12h-12zM280,160h12v12h-12zM319,160h12v12h-12zM332,160h12v12h-12zM163,173h12v12h-12zM202,173h12v12h-12zM267,173h12v12h-12zM280,173h12v12h-12zM293,173h12v12h-12zM319,173h12v12h-12zM176,186h12v12h-12zM241,186h12v12h-12zM254,186h12v12h-12zM267,186h12v12h-12zM280,186h12v12h-12zM332,186h12v12h-12zM163,199h12v12h-12zM189,199h12v12h-12zM202,199h12v12h-12zM241,199h12v12h-12zM280,199h12v12h-12zM293,199h12v12h-12zM176,212h12v12h-12zM189,212h12v12h-12zM228,212h12v12h-12zM241,212h12v12h-12zM254,212h12v12h-12zM267,212h12v12h-12zM306,212h12v12h-12zM319,212h12v12h-12zM400,120h12v12h-12z" class="soft-acc"/>
<text x="254" y="22" text-anchor="middle">output difference b →</text>
<text x="140" y="140" text-anchor="end">input</text>
<text x="140" y="156" text-anchor="end">difference a ↓</text>
<rect x="400" y="60" width="12" height="12" fill-opacity="0.6"/><text x="420" y="70">16 (a = 0)</text>
<text x="420" y="100">4: probability 1/4 (24 entries)</text>
<text x="420" y="130">2: probability 1/8 (72 entries)</text>
<rect x="400" y="150" width="12" height="12" fill="none" stroke="currentColor" stroke-width="0.6"/><text x="420" y="160">0 (144 entries)</text>
<text x="400" y="200">no entry above 4:</text>
<text x="400" y="218">differential uniformity 4,</text>
<text x="400" y="236">optimal for 4 bits</text>
</svg>
<figcaption>Figure 10.4. The difference distribution table of PRESENT's S-box. Each row shows where one input difference goes. A strong S-box has no tall entry in any row except the trivial one at the top left; here the largest is 4 of 16.</figcaption>
</figure>

## 10.7 The AES S-box

*Level: intermediate.*

Kaisa Nyberg proposed in 1993 to build S-boxes from the inverse in a finite
field, $x \mapsto x^{-1}$ in $\mathrm{GF}(2^n)$ (with $0 \mapsto 0$), and proved
its properties: for even $n$ its differential uniformity is 4 and its nonlinearity
is $2^{n-1} - 2^{n/2}$, and its degree is $n - 1$. AES (Chapter 8) composes it with
an affine map, which changes none of these numbers (affine maps preserve them).
Measure it, together with a random permutation for comparison:

```python
def xtime(a):
    a <<= 1
    return a ^ 0x11B if a & 0x100 else a

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a, b = xtime(a), b >> 1
    return r

def ginv(a):
    r, e = 1, 254
    while e:
        if e & 1:
            r = gmul(r, a)
        a, e = gmul(a, a), e >> 1
    return r if a else 0

def rotl8(x, k):
    return ((x << k) | (x >> (8 - k))) & 0xFF

AES = []
for a in range(256):
    b = ginv(a) if a else 0
    AES.append(b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ 0x63)

def sbox_profile(S):
    n = len(S)
    nbits = n.bit_length() - 1
    du = max(max(row) for row in ddt_rows(S))
    comps = [[bin(b & S[x]).count("1") & 1 for x in range(n)] for b in range(1, n)]
    walsh_max = max(max(abs(v) for v in walsh(c)) for c in comps)
    deg = max(degree(anf(c)) for c in comps)
    return du, walsh_max, n // 2 - walsh_max // 2, deg

def ddt_rows(S):
    n = len(S)
    for a in range(1, n):
        row = [0] * n
        for x in range(n):
            row[S[x] ^ S[x ^ a]] += 1
        yield row

print(hex(AES[0x53]), sbox_profile(AES))
```

```text
0xed (4, 32, 112, 7)
```

The four numbers are the differential uniformity, the linearity, the nonlinearity
and the degree.

- **Differential uniformity 4.** The best difference passes with probability $4/256
  = 2^{-6}$.
- **Linearity 32, nonlinearity 112.** The best linear approximation has
  correlation $32/256 = 1/8$, so "linear probability" $(1/8)^2 = 2^{-6}$.
- **Degree 7**, the maximum for an 8-bit permutation.

With the wide trail bound of Chapter 9 (at least 25 active S-boxes in four
rounds), any four-round differential characteristic has probability at most
$2^{-6 \cdot 25} = 2^{-150}$, and any linear trail a squared correlation at most
$2^{-150}$. No 8-bit permutation with nonlinearity above 112 is known, and whether
one exists is open; differential uniformity 2 is impossible for the inverse and
for every other known 8-bit permutation (§10.8). In both measures, AES's S-box is
the best anyone knows how to build.

Compare a random permutation, and the cube map $x \mapsto x^3$ in the same field:

```python
import random
rng = random.Random(10)
rand = list(range(256))
rng.shuffle(rand)
print(sbox_profile(rand))
cube = [gmul(gmul(x, x), x) for x in range(256)]
print(sbox_profile(cube), len(set(cube)))
```

```text
(10, 80, 88, 7)
(2, 32, 112, 2) 86
```

The random permutation has differential uniformity 10 and nonlinearity 88: usable
with more rounds, clearly worse. The cube has differential uniformity 2 (the best
possible) and nonlinearity 112, but degree 2, and it is not a permutation: it
takes only 86 values, because 3 divides 255. A degree-2 S-box invites algebraic
and higher-order differential attacks. Inversion balances everything.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Bar chart comparing three 8-bit maps: a random permutation has nonlinearity 88, differential uniformity 10 and degree 7; the cube map has 112, 2 and 2 but is not a permutation; the AES S-box has 112, 4 and 7" fill="currentColor" font-size="12">
<text x="140" y="20" text-anchor="middle">nonlinearity (higher is better)</text>
<text x="340" y="20" text-anchor="middle">differential uniformity (lower)</text>
<text x="540" y="20" text-anchor="middle">degree (higher)</text>
<g stroke="currentColor" stroke-width="1"><line x1="40" y1="200" x2="240" y2="200"/><line x1="260" y1="200" x2="420" y2="200"/><line x1="460" y1="200" x2="620" y2="200"/></g>
<g fill-opacity="0.45"><rect x="60" y="112" width="40" height="88"/><rect x="280" y="100" width="40" height="100"/><rect x="480" y="130" width="40" height="70"/></g>
<rect x="110" y="88" width="40" height="112" class="soft-acc"/><rect x="330" y="180" width="40" height="20" class="soft-acc"/><rect x="530" y="180" width="40" height="20" class="soft-acc"/>
<rect x="160" y="88" width="40" height="112" class="acc-fill"/><rect x="380" y="160" width="40" height="40" class="acc-fill"/><rect x="580" y="130" width="40" height="70" class="acc-fill"/>
<g text-anchor="middle">
<text x="80" y="106">88</text><text x="130" y="82">112</text><text x="180" y="82">112</text>
<text x="300" y="94">10</text><text x="350" y="174">2</text><text x="400" y="154">4</text>
<text x="500" y="124">7</text><text x="550" y="174">2</text><text x="600" y="124">7</text>
</g>
<rect x="120" y="222" width="12" height="12" fill-opacity="0.45"/><text x="138" y="233">random permutation</text>
<rect x="290" y="222" width="12" height="12" class="soft-acc"/><text x="308" y="233">cube x³ (not a permutation)</text>
<rect x="490" y="222" width="12" height="12" class="acc-fill"/><text x="508" y="233">AES S-box</text>
</svg>
<figcaption>Figure 10.5. Three 8-bit maps measured. A random permutation is mediocre on both attack measures. The cube is best for differences but has degree 2 and repeats values. Inversion with the affine map, the AES S-box, is near the best on every measure at once.</figcaption>
</figure>


### The full tables of the AES S-box

The full DDT of the AES S-box has $256 \times 256 = 65{,}536$ entries, and so
does the LAT. Here is how they are distributed, beside the random permutation
from above. The function `tables` counts every DDT entry with $a \ne 0$ and every LAT entry with $a \ne 0$
and $b \ne 0$, using the fast Walsh transform for the LAT (one transform per
output mask $b$, so 255 transforms of length 256 instead of $2^{24}$ separate
counts).

```python
# Uses AES, rand and walsh() from the listings above.
from collections import Counter

def tables(S):
    """How often each DDT entry and each |LAT| entry occurs, for a != 0 and b != 0."""
    d, l = Counter(), Counter()
    for a in range(1, 256):
        row = [0] * 256
        for x in range(256):
            row[S[x] ^ S[x ^ a]] += 1
        d.update(row)
    for b in range(1, 256):
        w = walsh([bin(b & S[x]).count("1") & 1 for x in range(256)])
        l.update(abs(v) // 2 for v in w[1:])
    return sorted(d.items()), sorted(l.items())

for name, S in (("AES", AES), ("random", rand)):
    d, l = tables(S)
    print(name, "DDT", d)
    print(name, "|LAT|", l)
print(all(sum(AES[x] ^ AES[x ^ a] == AES[a] ^ 0x63 for x in range(256)) == 4 for a in range(1, 256)))
print("fixed points", [x for x in range(256) if AES[x] in (x, x ^ 0xFF)])
```

It prints:

```text
AES DDT [(0, 32895), (2, 32130), (4, 255)]
AES |LAT| [(0, 4080), (2, 12240), (4, 9180), (6, 10200), (8, 8670), (10, 6120), (12, 9180), (14, 4080), (16, 1275)]
random DDT [(0, 39735), (2, 19586), (4, 4957), (6, 879), (8, 112), (10, 11)]
random |LAT| [(0, 6394), (2, 12492), (4, 11560), (6, 9771), (8, 7924), (10, 5868), (12, 4330), (14, 2748), (16, 1832), (18, 987), (20, 528), (22, 299), (24, 167), (26, 74), (28, 29), (30, 16), (32, 3), (34, 1), (36, 1), (40, 1)]
True
fixed points []
```

The 255 nonzero rows of the DDT hold 255 entries
equal to 4, $32{,}130 = 255 \times 126$ entries equal to 2, and the rest 0: every
row is the same, one 4, 126 twos and 129 zeros. The maximum is 4 of 256, a
probability of $2^{-6}$, and it is reached exactly once per row. The `True` line
says where: in row $a$ the 4 sits in column $S(a) \oplus \texttt{63}$, the
image of $a^{-1}$ under the linear part $L$ of the affine map. The pair $\{0,
a\}$ always lands there, since $S(0) \oplus S(a) = L(0^{-1}) \oplus L(a^{-1})$
and $0^{-1}$ is defined as 0; §10.8 shows where the other two come from.

The LAT is just as regular. Every entry is even (the Walsh values of inversion
are multiples of 4, as §10.8 explains). The largest bias is $16/256 = 1/16$, a
correlation of $1/8$, and every component $b \cdot S$ has the same multiset of
absolute values, with five entries of $\pm 16$ among its 255. The reason is that
every component of inversion is a trace function $\mathrm{Tr}(c\,x^{-1})$, and
substituting $x = c y$ turns one into another.

The random permutation has DDT entries up to 10 and LAT entries up to 40 (a
correlation of 0.31), and over 2,000 of its LAT entries exceed AES's worst. Its
typical entries look like those of AES; the difference is in the tails, which is
where an attacker looks.
Figure 10.6 shows the tails on a logarithmic scale, and Figure 10.7 draws where
the 4s of the AES DDT sit.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two histograms on a logarithmic scale. Left, DDT entries for nonzero input differences: the AES S-box has only 0, 2 and 4, while a random permutation reaches 10. Right, absolute LAT entries: the AES S-box stops at 16, while a random permutation has a long tail reaching 40" fill="currentColor" font-size="12">
<line x1="50" y1="250" x2="630" y2="250" stroke="currentColor" stroke-opacity=".15"/>
<text x="44" y="254" text-anchor="end" font-size="11">1</text>
<line x1="50" y1="208" x2="630" y2="208" stroke="currentColor" stroke-opacity=".15"/>
<text x="44" y="212" text-anchor="end" font-size="11">10</text>
<line x1="50" y1="166" x2="630" y2="166" stroke="currentColor" stroke-opacity=".15"/>
<text x="44" y="170" text-anchor="end" font-size="11">100</text>
<line x1="50" y1="124" x2="630" y2="124" stroke="currentColor" stroke-opacity=".15"/>
<text x="44" y="128" text-anchor="end" font-size="11">1k</text>
<line x1="50" y1="82" x2="630" y2="82" stroke="currentColor" stroke-opacity=".15"/>
<text x="44" y="86" text-anchor="end" font-size="11">10k</text>
<line x1="50" y1="40" x2="630" y2="40" stroke="currentColor" stroke-opacity=".15"/>
<text x="44" y="44" text-anchor="end" font-size="11">100k</text>
<line x1="50" y1="250" x2="630" y2="250" stroke="currentColor"/>
<text x="140" y="24" text-anchor="middle">DDT entries (a ≠ 0)</text>
<text x="72" y="266" text-anchor="middle" font-size="11">0</text>
<text x="100" y="266" text-anchor="middle" font-size="11">2</text>
<text x="128" y="266" text-anchor="middle" font-size="11">4</text>
<text x="156" y="266" text-anchor="middle" font-size="11">6</text>
<text x="184" y="266" text-anchor="middle" font-size="11">8</text>
<text x="212" y="266" text-anchor="middle" font-size="11">10</text>
<text x="140" y="284" text-anchor="middle" font-size="11">entry value</text>
<text x="440" y="24" text-anchor="middle">|LAT| entries (a, b ≠ 0)</text>
<text x="257" y="266" text-anchor="middle" font-size="11">0</text>
<text x="293" y="266" text-anchor="middle" font-size="11">4</text>
<text x="329" y="266" text-anchor="middle" font-size="11">8</text>
<text x="365" y="266" text-anchor="middle" font-size="11">12</text>
<text x="401" y="266" text-anchor="middle" font-size="11">16</text>
<text x="437" y="266" text-anchor="middle" font-size="11">20</text>
<text x="473" y="266" text-anchor="middle" font-size="11">24</text>
<text x="509" y="266" text-anchor="middle" font-size="11">28</text>
<text x="545" y="266" text-anchor="middle" font-size="11">32</text>
<text x="581" y="266" text-anchor="middle" font-size="11">36</text>
<text x="617" y="266" text-anchor="middle" font-size="11">40</text>
<line x1="240" y1="40" x2="240" y2="250" stroke="currentColor" stroke-opacity=".4"/>
<line x1="411" y1="52" x2="411" y2="250" stroke="currentColor" stroke-dasharray="3 3"/><text x="415" y="62" font-size="11">AES stops at 16</text>
<text x="440" y="284" text-anchor="middle" font-size="11">|entry| (bias out of 256)</text>
<text x="488" y="91">AES S-box</text>
<text x="488" y="111">random permutation</text>
<path d="M62,60.3h10v189.7h-10zM90,60.7h10v189.3h-10zM118,148.9h10v101.1h-10zM250,98.4h7v151.6h-7zM268,78.3h7v171.7h-7zM286,83.6h7v166.4h-7zM304,81.6h7v168.4h-7zM322,84.6h7v165.4h-7zM340,91.0h7v159.0h-7zM358,83.6h7v166.4h-7zM376,98.4h7v151.6h-7zM394,119.6h7v130.4h-7zM470,80h12v12h-12z" fill-opacity=".85"/>
<path d="M73,56.8h10v193.2h-10zM101,69.7h10v180.3h-10zM129,94.8h10v155.2h-10zM157,126.4h10v123.6h-10zM185,163.9h10v86.1h-10zM213,206.3h10v43.7h-10zM258,90.2h7v159.8h-7zM276,77.9h7v172.1h-7zM294,79.4h7v170.6h-7zM312,82.4h7v167.6h-7zM330,86.2h7v163.8h-7zM348,91.7h7v158.3h-7zM366,97.3h7v152.7h-7zM384,105.6h7v144.4h-7zM402,113.0h7v137.0h-7zM420,124.2h7v125.8h-7zM438,135.6h7v114.4h-7zM456,146.0h7v104.0h-7zM474,156.6h7v93.4h-7zM492,171.5h7v78.5h-7zM510,188.6h7v61.4h-7zM528,199.4h7v50.6h-7zM546,230.0h7v20.0h-7zM564,250.0h7v0.0h-7zM582,250.0h7v0.0h-7zM618,250.0h7v0.0h-7zM470,100h12v12h-12z" fill-opacity=".3"/>
</svg>
<figcaption>Figure 10.6. How the entries of the DDT (left) and LAT (right) are distributed, for the AES S-box and for a random 8-bit permutation, on a logarithmic count scale. The bulk is similar; the tails are not. AES has no DDT entry above 4 and no |LAT| entry above 16, while the random permutation reaches 10 and 40.</figcaption>
</figure>

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="The 256 by 256 difference distribution table of the AES S-box drawn as a square in which only the 255 entries equal to 4 are marked; they scatter over the whole square with exactly one in each row and one in each column" fill="currentColor" font-size="12">
<rect x="39" y="29" width="258" height="258" fill="none" stroke="currentColor"/>
<path d="M71,31h2v2h-2zM60,32h2v2h-2zM64,33h2v2h-2zM185,34h2v2h-2zM48,35h2v2h-2zM52,36h2v2h-2zM206,37h2v2h-2zM123,38h2v2h-2zM138,39h2v2h-2zM44,40h2v2h-2zM112,41h2v2h-2zM197,42h2v2h-2zM220,43h2v2h-2zM240,44h2v2h-2zM61,45h2v2h-2zM209,46h2v2h-2zM265,47h2v2h-2zM210,48h2v2h-2zM70,49h2v2h-2zM193,50h2v2h-2zM98,51h2v2h-2zM76,52h2v2h-2zM187,53h2v2h-2zM246,54h2v2h-2zM223,55h2v2h-2zM233,56h2v2h-2zM244,57h2v2h-2zM295,58h2v2h-2zM239,59h2v2h-2zM57,60h2v2h-2zM203,61h2v2h-2zM252,62h2v2h-2zM198,63h2v2h-2zM280,64h2v2h-2zM109,65h2v2h-2zM125,66h2v2h-2zM132,67h2v2h-2zM188,68h2v2h-2zM215,69h2v2h-2zM127,70h2v2h-2zM238,71h2v2h-2zM174,72h2v2h-2zM186,73h2v2h-2zM58,74h2v2h-2zM227,75h2v2h-2zM122,76h2v2h-2zM158,77h2v2h-2zM143,78h2v2h-2zM204,79h2v2h-2zM104,80h2v2h-2zM200,81h2v2h-2zM163,82h2v2h-2zM285,83h2v2h-2zM142,84h2v2h-2zM289,85h2v2h-2zM140,86h2v2h-2zM153,87h2v2h-2zM267,88h2v2h-2zM169,89h2v2h-2zM176,90h2v2h-2zM108,91h2v2h-2zM249,92h2v2h-2zM62,93h2v2h-2zM146,94h2v2h-2zM264,95h2v2h-2zM119,96h2v2h-2zM161,97h2v2h-2zM160,98h2v2h-2zM53,99h2v2h-2zM97,100h2v2h-2zM235,101h2v2h-2zM89,102h2v2h-2zM128,103h2v2h-2zM221,104h2v2h-2zM248,105h2v2h-2zM114,106h2v2h-2zM168,107h2v2h-2zM116,108h2v2h-2zM271,109h2v2h-2zM88,110h2v2h-2zM218,111h2v2h-2zM139,112h2v2h-2zM182,113h2v2h-2zM107,114h2v2h-2zM199,115h2v2h-2zM250,116h2v2h-2zM96,117h2v2h-2zM49,118h2v2h-2zM208,119h2v2h-2zM261,120h2v2h-2zM130,121h2v2h-2zM81,122h2v2h-2zM87,123h2v2h-2zM99,124h2v2h-2zM212,125h2v2h-2zM219,126h2v2h-2zM180,127h2v2h-2zM241,128h2v2h-2zM192,129h2v2h-2zM72,130h2v2h-2zM86,131h2v2h-2zM120,132h2v2h-2zM270,133h2v2h-2zM78,134h2v2h-2zM194,135h2v2h-2zM137,136h2v2h-2zM68,137h2v2h-2zM91,138h2v2h-2zM135,139h2v2h-2zM292,140h2v2h-2zM243,141h2v2h-2zM90,142h2v2h-2zM232,143h2v2h-2zM75,144h2v2h-2zM276,145h2v2h-2zM281,146h2v2h-2zM294,147h2v2h-2zM131,148h2v2h-2zM190,149h2v2h-2zM263,150h2v2h-2zM253,151h2v2h-2zM225,152h2v2h-2zM106,153h2v2h-2zM155,154h2v2h-2zM196,155h2v2h-2zM184,156h2v2h-2zM217,157h2v2h-2zM214,158h2v2h-2zM151,159h2v2h-2zM152,160h2v2h-2zM183,161h2v2h-2zM100,162h2v2h-2zM284,163h2v2h-2zM79,164h2v2h-2zM156,165h2v2h-2zM207,166h2v2h-2zM236,167h2v2h-2zM69,168h2v2h-2zM134,169h2v2h-2zM47,170h2v2h-2zM102,171h2v2h-2zM162,172h2v2h-2zM56,173h2v2h-2zM43,174h2v2h-2zM266,175h2v2h-2zM84,176h2v2h-2zM231,177h2v2h-2zM105,178h2v2h-2zM113,179h2v2h-2zM283,180h2v2h-2zM275,181h2v2h-2zM77,182h2v2h-2zM181,183h2v2h-2zM259,184h2v2h-2zM159,185h2v2h-2zM229,186h2v2h-2zM101,187h2v2h-2zM144,188h2v2h-2zM224,189h2v2h-2zM171,190h2v2h-2zM121,191h2v2h-2zM129,192h2v2h-2zM145,193h2v2h-2zM82,194h2v2h-2zM141,195h2v2h-2zM111,196h2v2h-2zM103,197h2v2h-2zM201,198h2v2h-2zM216,199h2v2h-2zM247,200h2v2h-2zM41,201h2v2h-2zM282,202h2v2h-2zM286,203h2v2h-2zM175,204h2v2h-2zM66,205h2v2h-2zM172,206h2v2h-2zM211,207h2v2h-2zM124,208h2v2h-2zM54,209h2v2h-2zM278,210h2v2h-2zM222,211h2v2h-2zM85,212h2v2h-2zM242,213h2v2h-2zM55,214h2v2h-2zM93,215h2v2h-2zM191,216h2v2h-2zM177,217h2v2h-2zM46,218h2v2h-2zM65,219h2v2h-2zM245,220h2v2h-2zM147,221h2v2h-2zM257,222h2v2h-2zM67,223h2v2h-2zM110,224h2v2h-2zM117,225h2v2h-2zM167,226h2v2h-2zM237,227h2v2h-2zM255,228h2v2h-2zM205,229h2v2h-2zM179,230h2v2h-2zM230,231h2v2h-2zM63,232h2v2h-2zM164,233h2v2h-2zM80,234h2v2h-2zM262,235h2v2h-2zM272,236h2v2h-2zM273,237h2v2h-2zM59,238h2v2h-2zM133,239h2v2h-2zM254,240h2v2h-2zM45,241h2v2h-2zM83,242h2v2h-2zM136,243h2v2h-2zM189,244h2v2h-2zM149,245h2v2h-2zM42,246h2v2h-2zM126,247h2v2h-2zM92,248h2v2h-2zM258,249h2v2h-2zM269,250h2v2h-2zM202,251h2v2h-2zM166,252h2v2h-2zM293,253h2v2h-2zM170,254h2v2h-2zM195,255h2v2h-2zM291,256h2v2h-2zM154,257h2v2h-2zM50,258h2v2h-2zM226,259h2v2h-2zM277,260h2v2h-2zM287,261h2v2h-2zM288,262h2v2h-2zM165,263h2v2h-2zM268,264h2v2h-2zM178,265h2v2h-2zM213,266h2v2h-2zM94,267h2v2h-2zM115,268h2v2h-2zM228,269h2v2h-2zM279,270h2v2h-2zM234,271h2v2h-2zM274,272h2v2h-2zM150,273h2v2h-2zM260,274h2v2h-2zM173,275h2v2h-2zM73,276h2v2h-2zM51,277h2v2h-2zM74,278h2v2h-2zM290,279h2v2h-2zM118,280h2v2h-2zM148,281h2v2h-2zM251,282h2v2h-2zM95,283h2v2h-2zM256,284h2v2h-2zM157,285h2v2h-2z"/>
<rect x="40" y="30" width="2" height="2" fill-opacity=".5"/>
<text x="168" y="20" text-anchor="middle">output difference b →</text>
<text x="168" y="308" text-anchor="middle" font-size="11">input difference a runs down, 0 to 255</text>
<text x="330" y="60">each dot is a DDT entry equal to 4:</text>
<text x="330" y="78">one per row, one per column, 255 in all</text>
<text x="330" y="114">in row a it sits at b = L(a⁻¹), where L is</text>
<text x="330" y="132">the linear part of the affine map: the pair</text>
<text x="330" y="150">{0, a} always lands there</text>
<text x="330" y="186">every other nonzero entry is 2 (126 per row)</text>
<text x="330" y="204">and the rest, 129 per row, are 0</text>
<text x="330" y="240">no row has a favorite: the best difference</text>
<text x="330" y="258">passes with probability 4/256 = 2⁻⁶</text>
</svg>
<figcaption>Figure 10.7. The 255 entries equal to 4 in the AES S-box's 256 × 256 DDT, each drawn as a dot. There is exactly one in every row and every column: a permutation, b = L(a⁻¹), spread over the whole table. A heat map of the full table at this size would be a uniform gray, which is the point.</figcaption>
</figure>

**No fixed points.** The last line printed checks a detail of the design. Inversion
alone fixes 0 and 1. Joan Daemen and Vincent Rijmen chose the affine map, and in
particular its constant $\texttt{63}$, so that the S-box has no **fixed points**
($S(x) = x$) and no **opposite fixed points** ($S(x) = x \oplus \texttt{FF}$).
A fixed point does not by itself give an attack, but a cipher whose rounds share
fixed points can leak structure across rounds; removing them costs nothing, since
the affine map leaves every number in the tables unchanged.

**The price of algebra.** Inversion has a very short description: $x \cdot S(x) =
1$ for $x \ne 0$, which is a quadratic equation in input and output bits. Courtois
and Josef Pieprzyk (2002) built on this to write AES as a large system of quadratic
equations and proposed solving it (XSL); it did not work (Chapter 9). Two decades
of algebraic attacks have not come close to AES. But the worry is the reason
some designers prefer S-boxes with no short algebraic description, at the cost of
slightly worse DDT and LAT values.

## 10.8 APN functions and open problems

*Level: intermediate.*

An S-box with differential uniformity 2 (every row of the DDT holds only 0s and
2s) is **almost perfect nonlinear** (APN). It is the best possible for differential
attacks. Known families:

- **Gold functions** $x^{2^k + 1}$ with $\gcd(k, n) = 1$ (Robert Gold, 1968), the
  cube being $k = 1$: APN for every $n$, but of degree 2.
- **Inversion** $x^{-1}$: APN when $n$ is odd, differential uniformity 4 when $n$
  is even.
- **Kasami** and a handful of other power and non-power families.

```python
# GF(2^5) with x^5 + x^2 + 1: inversion there is APN (n odd).
def g5mul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a <<= 1
        if a & 0x20:
            a ^= 0x25
        b >>= 1
    return r

inv5 = [0] + [next(y for y in range(1, 32) if g5mul(x, y) == 1) for x in range(1, 32)]
print(sbox_profile(inv5))
```

```text
(2, 12, 10, 4)
```

In $\mathrm{GF}(2^5)$, inversion is an APN permutation of degree 4.


### Why inversion has uniformity 2 or 4: the proof

Nyberg's bound is short enough to prove in full. Write $I(x) = x^{-1}$ in
$\mathrm{GF}(2^n)$, with $I(0) = 0$, and fix $a \ne 0$ and $b$. We count the
solutions $x$ of

$$I(x) \oplus I(x \oplus a) = b.$$

(In $\mathrm{GF}(2^n)$ addition is xor, so we write $+$ from here on.)

*The points 0 and $a$.* If $x = 0$ or $x = a$ the left side is $a^{-1}$. So
these two are solutions exactly when $b = a^{-1}$.

*Every other point.* If $x \notin \{0, a\}$, both inverses are true inverses and

$$\frac{1}{x} + \frac{1}{x + a} = \frac{a}{x(x + a)} = b .$$

So $b \ne 0$ and $b x^2 + ab x + a = 0$, a quadratic equation in $x$. A
polynomial of degree 2 over a field has at most 2 roots, so at most 2 solutions
come from here.

That gives at most $2 + 2 = 4$, and 4 needs both: $b = a^{-1}$, and the quadratic
with $b = a^{-1}$, which is $x^2 + ax + a^2 = 0$, must have roots outside $\{0,
a\}$. Put $x = a t$: the equation becomes $a^2(t^2 + t + 1) = 0$, so we need a
root of $t^2 + t + 1$ in $\mathrm{GF}(2^n)$. Its roots are the two elements of
$\mathrm{GF}(4)$ outside $\mathrm{GF}(2)$, and $\mathrm{GF}(4)$ sits inside
$\mathrm{GF}(2^n)$ exactly when $2$ divides $n$ (Chapter 8). So:

- **$n$ odd:** no row has a 4; every entry is 0 or 2; inversion is APN.
- **$n$ even:** every row $a$ has exactly one 4, in column $a^{-1}$, from the
  four solutions $x = 0,\ a,\ a\omega,\ a\omega^2$, where $\omega^2 = \omega + 1$.

This is the 4 per row that the last section counted, now explained. In the AES
field the two roots of $t^2 + t + 1$ are $\texttt{BC}$ and $\texttt{BD}$. By
hand: they are inverses of each other (their product is $\omega^3 = 1$) and they
differ by 1 (their sum is $\omega + \omega^2 = 1$). So for $a = 1$, the
solutions of $x^{-1} + (x + 1)^{-1} = 1$ are $0$, $1$, $\texttt{BC}$ and
$\texttt{BD}$: the last two give $\texttt{BD} + \texttt{BC} = 1$. The code
checks this, and the next claim.

### The degree of a power map

The degree of $x \mapsto x^d$, as a map on bit vectors, is the number of 1s in
the binary expansion of $d$. The reason is the Frobenius map of Chapter 8:
squaring is linear over $\mathbb{F}_2$, since $(x + y)^2 = x^2 + y^2$. So each
$x^{2^i}$ is a linear map of the bits of $x$, and

$$x^d = \prod_{i : d_i = 1} x^{2^i}$$

is a product of $\mathrm{wt}(d)$ linear maps, of degree at most $\mathrm{wt}(d)$.
(That it is exactly $\mathrm{wt}(d)$ takes a little more work.) For
$d = 254 = 11111110_2$ the weight is 7, the most a permutation of 8 bits allows;
for the cube, $d = 3 = 11_2$, it is 2, which is why the cube is quadratic. All the
Gold functions $x^{2^k + 1}$ have weight 2 and degree 2.

```python
# Uses gmul(), ginv(), anf() and degree() from the listings above.
roots = [x for x in range(256) if gmul(x, x) == x ^ 1]          # x^2 + x + 1 = 0
print([hex(x) for x in roots], [hex(ginv(x)) for x in roots])
print([hex(x) for x in range(256) if ginv(x) ^ ginv(x ^ 1) == 1])

def gpow(x, d):
    r = 1
    while d:
        if d & 1:
            r = gmul(r, x)
        x, d = gmul(x, x), d >> 1
    return r

def map_degree(S):
    return max(degree(anf([S[x] >> i & 1 for x in range(256)])) for i in range(8))

for d in (2, 3, 5, 7, 127, 254):
    print(d, bin(d).count("1"), map_degree([gpow(x, d) for x in range(256)]))
```

It prints:

```text
['0xbc', '0xbd'] ['0xbd', '0xbc']
['0x0', '0x1', '0xbc', '0xbd']
2 1 1
3 2 2
5 2 2
7 3 3
127 7 7
254 7 7
```

Each line of the table is an exponent, its binary weight and the measured degree
of the power map: they agree. Squaring ($d = 2$) has degree 1: it is linear, a
fact §10.10 will put to work.

### The nonlinearity: Kloosterman sums

The LAT side of Nyberg's theorem needs deeper mathematics. The Walsh value of the
component $\mathrm{Tr}(c\,x^{-1})$ at $a$ is, after the substitution above, an
exponential sum

$$K(\lambda) = \sum_{x \in \mathrm{GF}(2^n)} (-1)^{\mathrm{Tr}(x^{-1} + \lambda
x)},$$

a (slightly extended) **Kloosterman sum**, named after Hendrik Kloosterman, who
studied their analogues mod $p$ in 1926. André Weil's bound for exponential sums
over curves (1948), applied in characteristic 2 by Leonard Carlitz and Saburo
Uchiyama (1957), gives $|K(\lambda) - 1| \le 2^{n/2 + 1}$. Gilles Lachaud and
Jacques Wolfmann (1990) found exactly which values occur: every multiple of 4 in
the range $[-2^{n/2+1} + 1,\ 2^{n/2+1} + 1]$. For $n = 8$ the largest multiple of
4 in that range is 32, so the linearity of inversion is exactly 32 and its
nonlinearity is $128 - 16 = 112$, the number the program printed.

So AES uses $x^{-1}$ for three proved properties, all kept by the affine map
around it: uniformity 4, nonlinearity 112 and degree 7. Inversion also has a
short description, $x \cdot x^{-1} = 1$, that makes it cheap to build in
hardware from smaller fields (David Canright's compact S-box, 2005, computes it
in a tower of fields, $\mathrm{GF}(2^8)$ over $\mathrm{GF}(2^4)$ over
$\mathrm{GF}(2^2)$) and to mask (§10.10). The price is the algebraic simplicity
discussed in §10.7.

Why not use APN permutations in 8 bits? Because no one knows one. The **big APN
problem** asks whether an APN permutation exists in even dimension $n \ge 8$. For
$n = 4$ there is none (Leander and Poschmann's classification). For $n = 6$, K. A.
Browning, John Dillon, Michael McQuistan and Andrew Wolfe found one in 2009, still
the only one known in any even dimension. For $n = 8$ the question is open, and so
is whether any 8-bit permutation beats nonlinearity 112. These are among the most
studied open problems in the mathematics of symmetric cryptography.

## 10.9 The DES S-boxes and their secret criteria

*Level: expert.*

DES (1977) has eight S-boxes, each mapping 6 bits to 4: the outer two input bits
choose one of four rows, the middle four choose a column, and each row is a
permutation of 0 to 15. IBM designed them, with advice from the NSA, and published
the tables but not the reasons. For fifteen years people suspected a trapdoor.

In 1990 Biham and Shamir published differential cryptanalysis, and found that the
DES S-boxes were unusually resistant to it: random S-boxes would have made DES much
weaker. In 1994 Don Coppersmith, one of the IBM designers, published the criteria.
IBM had found differential cryptanalysis themselves in 1974 (calling it the "T
attack"), and the NSA had asked them to keep it secret. Among the published
criteria:

- each row is a permutation of 0 to 15;
- no output bit is too close to a linear function of the input bits;
- changing one input bit changes at least two output bits;
- $S(x)$ and $S(x \oplus 001100)$ differ in at least two bits;
- $S(x) \ne S(x \oplus 11ef00)$ for any bits $e, f$;
- for any nonzero input difference, at most 8 of the 32 pairs with that
  difference give the same output difference.

Check them on S1:

```python
# DES S-box S1: row from the outer bits, column from the middle four.
S1 = [[14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7],
      [0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8],
      [4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0],
      [15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13]]

def s1(x):                          # x is 6 bits b5..b0
    row = ((x >> 4) & 2) | (x & 1)
    col = (x >> 1) & 0xF
    return S1[row][col]

hd = lambda u, v: bin(u ^ v).count("1")
rows_are_perms = all(sorted(r) == list(range(16)) for r in S1)
one_bit = all(hd(s1(x), s1(x ^ (1 << i))) >= 2 for x in range(64) for i in range(6))
middle = all(hd(s1(x), s1(x ^ 0b001100)) >= 2 for x in range(64))
ends = all(s1(x) != s1(x ^ (0b110000 | e << 3 | f << 2)) for x in range(64) for e in (0, 1) for f in (0, 1))
T = [[0] * 16 for _ in range(64)]
for x in range(64):
    for a in range(64):
        T[a][s1(x) ^ s1(x ^ a)] += 1
print(rows_are_perms, one_bit, middle, ends, max(T[a][b] for a in range(1, 64) for b in range(16)))
```

```text
True True True True 16
```

Every criterion holds. The largest DDT entry is 16 of 64 (counting ordered pairs,
that is 8 of the 32 unordered pairs), exactly the limit in the last criterion.
Matsui's linear cryptanalysis (1993), which IBM had *not* anticipated, did better
than differential attacks against DES: $2^{43}$ known plaintexts against
$2^{47}$ chosen ones. The S-box criteria had included a condition against
linearity of single output bits, but not against linear combinations across S-boxes
and rounds.


### The criteria as mathematics

Coppersmith's paper lists eight criteria for the S-boxes, S-1 to S-8, and a
shorter list for the permutation P that follows them. Read with this chapter's
tools, each S-box criterion is a statement about one of the tables:

- **S-1, the size.** Six bits in, four out. Coppersmith explained that this was
  the largest size that let the whole of DES fit on one chip with 1974
  technology. A $6 \times 4$ box cannot be a permutation, so balance is imposed
  row by row instead (S-3: each row is a permutation of 0 to 15).
- **S-2, single output bits.** No output bit is too close to a linear function of
  the input: a bound on the LAT entries in the four columns $b = 1, 2, 4, 8$.
- **S-4 to S-6, avalanche.** The rules on one-bit, middle-two-bit and $11ef00$
  input differences listed above say which DDT entries must be 0: for example
  $\mathrm{DDT}[a][b] = 0$ whenever $\mathrm{wt}(a) = 1$ and $\mathrm{wt}(b) \le 1$.
- **S-7 and S-8, the differential bound.** No DDT entry in a nonzero row exceeds
  16 of 64 (S-7), with a stronger rule of the same kind for the patterns in which
  three neighboring S-boxes are active at once (S-8).

The bit-level criteria make differences spread to several S-boxes in the next
round, so every characteristic through many rounds has many active S-boxes, each
paying at most $16/64 = 1/4$: the counting argument that the wide trail strategy
later made exact for AES (Chapter 9).
[Cryptanalysis, Chapter 5](../cryptanalysis/05-Differential-Cryptanalysis.md#56-des-and-the-t-attack)
follows the resulting characteristics through DES.

### The criterion that looked at single bits

S-2 is the one that failed. It bounds the four columns of the LAT that test a
single output bit. Matsui's attack used the column $b = \texttt{F}$, the xor of
all four. Compute both for S1 and for S5:

```python
# Uses S1 from the listing above.
S5 = [[2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9],
      [14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6],
      [4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14],
      [11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3]]

def lat_extremes(T):
    s = lambda x: T[((x >> 4) & 2) | (x & 1)][(x >> 1) & 0xF]
    par = lambda u: bin(u).count("1") & 1
    L = {(a, b): sum(par(a & x) == par(b & s(x)) for x in range(64)) - 32
         for a in range(64) for b in range(1, 16)}
    one_bit = max(abs(L[a, b]) for a in range(64) for b in (1, 2, 4, 8))
    worst = max(L, key=lambda ab: abs(L[ab]))
    return one_bit, worst, L[worst]

print("S1", lat_extremes(S1))
print("S5", lat_extremes(S5))
```

It prints:

```text
S1 (14, (16, 15), -18)
S5 (14, (16, 15), -20)
```

For both S-boxes the worst single-output-bit entry is 14 (an approximation that
holds 18 or 46 times out of 64). The worst entry overall is in the same place in
both, input mask $\texttt{10}$ (the second input bit) against output mask
$\texttt{F}$, and it is larger: $-18$ for S1 and $-20$ for S5, the famous 12 of
64 that
[Cryptanalysis, Chapter 6](../cryptanalysis/06-Linear-Cryptanalysis.md#the-s-box-that-gave-des-away)
builds Matsui's attack on. A criterion stated on four of the fifteen nonzero
output masks says nothing about the other eleven. The lesson that designers took
from it is the definition of §10.6: an S-box is measured by its worst component
$b \cdot S$ over **all** $b \ne 0$, never by its coordinates alone.

!!! note "Life story: the DES S-boxes"
    **Born:** 1974 to 1976, IBM's Lucifer team (Horst Feistel's design
    philosophy, Don Coppersmith, Walter Tuchman and others), with NSA review;
    published in FIPS 46 (1977) without the design reasons · **Purpose:**
    the only nonlinear part of DES, chosen to resist the then-secret
    differential attack · **Helped:** two decades of banking, ATM and
    government encryption; the S-box criteria became the template for
    designing S-boxes · **Status:** DES's 56-bit key fell to brute force in
    1998 (the EFF's Deep Crack, 56 hours); triple DES was withdrawn by NIST
    for new use after 2023; the S-boxes were never the weak point

## 10.10 In the real world and going deeper

*Level: expert.*

**A hidden structure.** Russia's 2015 block cipher Kuznyechik (GOST R 34.12-2015)
and hash function Streebog share an 8-bit S-box that the designers described as
chosen at random under constraints. In 2016 Alex Biryukov, Léo Perrin and Aleksei
Udovenko showed that it has a compact hidden structure, a decomposition that a
random permutation would have with negligible probability; Perrin later found
an even simpler one tied to a finite-field construction. No attack follows, but
the episode shows how much structure DDT and LAT values alone can hide, and why
standards now ask designers to publish how their constants were chosen.

**Bitslicing and S-box circuits.** An S-box can be computed as a circuit of AND
and XOR gates on 8 bits, running on many blocks in parallel in the bits of machine
words. This avoids table lookups, whose cache timing leaks keys (Chapter 8). The
cost of the circuit, measured in AND gates (the **multiplicative complexity**),
also matters for masking against power analysis and for zero-knowledge proofs and
multiparty computation, where AND gates are expensive and XOR gates free. The
AES S-box needs 32 AND gates (Joan Boyar and René Peralta, 2010); ciphers for
these new settings (LowMC, MiMC, Poseidon) are designed with as few
multiplications as possible.


### Masking: the algebra of shares

A chip leaks its intermediate values through power draw and electromagnetic
emanation. **Masking** splits
every secret bit $x$ into $d + 1$ random **shares** with $x = x_0 \oplus x_1
\oplus \dots \oplus x_d$, chosen so that any $d$ of them are uniformly random and
independent of $x$. An attacker who can observe $d$ wires (the **probing model**
of Yuval Ishai, Amit Sahai and David Wagner, CRYPTO 2003) then learns nothing.
How a chip is masked, tested and attacked is in
[Engineering, Chapter 7](../engineering/07-Masking-and-Fault-Resistance.md#77-masking-with-proofs-isw-and-threshold-implementations);
the question here is why the cost is set by the mathematics of the S-box.

Linear operations are free. If $L$ is linear over $\mathbb{F}_2$, then $L(x) =
L(x_0) \oplus \dots \oplus L(x_d)$, so applying $L$ to each share separately
gives shares of $L(x)$, and no wire ever holds anything that depends on more than
one share. Xor gates, bit permutations, MixColumns, and squaring in
$\mathrm{GF}(2^8)$ all cost $d + 1$ times their unmasked price and need no
randomness.

Multiplication is not linear. With $a = \bigoplus_i a_i$ and $b = \bigoplus_j
b_j$, the product is

$$ab = \bigoplus_{i, j} a_i b_j,$$

a sum of $(d + 1)^2$ partial products, and each off-diagonal $a_i b_j$ mixes two
shares. The naive way to regroup them, $c_i = a_i \cdot b = \bigoplus_j a_i b_j$,
is correct but fatal: if $b = 0$ every $c_i$ is 0, whatever the masks. ISW
instead gives each pair $\{i, j\}$ a fresh random bit $r_{ij}$, adds it to share
$i$, and adds $r_{ij} \oplus a_i b_j \oplus a_j b_i$ (in that order) to share $j$.
Figure 10.8 shows the bookkeeping for three shares.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="A three by three grid of the partial products a_i b_j of two 3-share bits. The diagonal products stay in output share i; each pair of off-diagonal products a_i b_j and a_j b_i is split between shares i and j with a fresh random bit r_ij added to both" fill="currentColor" font-size="13">
<text x="48" y="86.0" text-anchor="end">a₀</text>
<text x="91.0" y="40" text-anchor="middle">b₀</text>
<rect x="60" y="50" width="62" height="62" fill-opacity=".25" stroke="currentColor"/>
<text x="91.0" y="86.0" text-anchor="middle">a₀b₀</text>
<rect x="122" y="50" width="62" height="62" fill-opacity=".1" stroke="currentColor"/>
<text x="153.0" y="86.0" text-anchor="middle">a₀b₁</text>
<rect x="184" y="50" width="62" height="62" fill-opacity=".1" stroke="currentColor"/>
<text x="215.0" y="86.0" text-anchor="middle">a₀b₂</text>
<text x="48" y="148.0" text-anchor="end">a₁</text>
<text x="153.0" y="40" text-anchor="middle">b₁</text>
<rect x="60" y="112" width="62" height="62" fill-opacity=".1" stroke="currentColor"/>
<text x="91.0" y="148.0" text-anchor="middle">a₁b₀</text>
<rect x="122" y="112" width="62" height="62" fill-opacity=".25" stroke="currentColor"/>
<text x="153.0" y="148.0" text-anchor="middle">a₁b₁</text>
<rect x="184" y="112" width="62" height="62" fill-opacity=".1" stroke="currentColor"/>
<text x="215.0" y="148.0" text-anchor="middle">a₁b₂</text>
<text x="48" y="210.0" text-anchor="end">a₂</text>
<text x="215.0" y="40" text-anchor="middle">b₂</text>
<rect x="60" y="174" width="62" height="62" fill-opacity=".1" stroke="currentColor"/>
<text x="91.0" y="210.0" text-anchor="middle">a₂b₀</text>
<rect x="122" y="174" width="62" height="62" fill-opacity=".1" stroke="currentColor"/>
<text x="153.0" y="210.0" text-anchor="middle">a₂b₁</text>
<rect x="184" y="174" width="62" height="62" fill-opacity=".25" stroke="currentColor"/>
<text x="215.0" y="210.0" text-anchor="middle">a₂b₂</text>
<text x="153" y="260" text-anchor="middle" font-size="12">all 9 partial products: ab = their sum</text>
<text x="270" y="70" font-size="12">c₀ = a₀b₀ + r₀₁ + r₀₂</text>
<text x="270" y="100" font-size="12">c₁ = a₁b₁ + (r₀₁ + a₀b₁ + a₁b₀) + r₁₂</text>
<text x="270" y="130" font-size="12">c₂ = a₂b₂ + (r₀₂ + a₀b₂ + a₂b₀) + (r₁₂ + a₁b₂ + a₂b₁)</text>
<text x="270" y="170" font-size="12" fill-opacity=".8">diagonal (dark): stays in its own share</text>
<text x="270" y="187" font-size="12" fill-opacity=".8">off-diagonal pair (light): masked by a fresh r_ij</text>
<text x="270" y="204" font-size="12" fill-opacity=".8">before it is added; each r_ij appears twice,</text>
<text x="270" y="221" font-size="12" fill-opacity=".8">so c₀ + c₁ + c₂ = ab</text>
</svg>
<figcaption>Figure 10.8. The ISW AND gate with three shares. The nine partial products a_ib_j sum to ab. Each diagonal product stays in its own output share; each off-diagonal pair is added to a share only after a fresh random bit r_ij has been added to it, and r_ij is also added to the other share, so the random bits cancel in the total.</figcaption>
</figure>

**Code it.** With three shares ($d = 2$) all input sharings and random bits can be
enumerated, 128 runs per secret pair $(a, b)$. The program checks that the
output shares xor to $ab$, and counts how often each share, and each pair of
shares, takes each value. It does the same for the naive gadget.

```python
from itertools import product

def isw_and(a, b, r):
    """ISW AND on share lists a and b (d + 1 shares each); r gives the random bits."""
    n = len(a)
    c = [a[i] & b[i] for i in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            rij = next(r)
            c[i] ^= rij
            c[j] ^= (rij ^ (a[i] & b[j])) ^ (a[j] & b[i])
    return c

def naive_and(a, b, r):
    """Share i times the whole of b: correct, but c_i = a_i * b."""
    return [a[i] & (b[0] ^ b[1] ^ b[2]) for i in range(3)]

def census(gadget):
    """For each secret (a, b), how often each output share is 1, and how often
    each pair of output shares takes each of its 4 values, over all 128 runs."""
    out = {}
    for a, b in product((0, 1), repeat=2):
        ones, pairs = [0, 0, 0], {}
        for a0, a1, b0, b1, *rs in product((0, 1), repeat=7):
            c = gadget([a0, a1, a ^ a0 ^ a1], [b0, b1, b ^ b0 ^ b1], iter(rs))
            assert c[0] ^ c[1] ^ c[2] == a & b
            for i in range(3):
                ones[i] += c[i]
            for i, j in ((0, 1), (0, 2), (1, 2)):
                pairs.setdefault((i, j), [0] * 4)[2 * c[i] + c[j]] += 1
        out[a, b] = ones, sorted({tuple(p) for p in pairs.values()})
    return out

for name, g in (("ISW", isw_and), ("naive", naive_and)):
    c = census(g)
    print(name, "ones per share:", {s: ones for s, (ones, _) in c.items()})
    print("  every pair uniform:", all(p == [(32, 32, 32, 32)] for _, p in c.values()))
```

It prints:

```text
ISW ones per share: {(0, 0): [64, 64, 64], (0, 1): [64, 64, 64], (1, 0): [64, 64, 64], (1, 1): [64, 64, 64]}
  every pair uniform: True
naive ones per share: {(0, 0): [0, 0, 0], (0, 1): [64, 64, 64], (1, 0): [0, 0, 0], (1, 1): [64, 64, 64]}
  every pair uniform: False
```

For ISW the counts are the same for all four secrets: no single output share, and
no pair of them, says anything about $a$ or $b$. The naive gadget's shares are uniform when
$b = 1$ and constantly 0 when $b = 0$, so one probe reads $b$. (Full $d$-probing
security also covers the wires inside the gadget; ISW's proof does that, and
Engineering, Chapter 7 checks it wire by wire for two shares.)

### Multiplicative complexity sets the price

Count the cost. A masked AND gate with $d + 1$ shares takes $(d + 1)^2$ AND
gates and $d(d + 1)/2$ random bits; a masked XOR takes $d + 1$ XORs and no
randomness. So the cost of masking a circuit, and above all its appetite for fresh
randomness, is governed by one number: the count of AND gates, the
**multiplicative complexity**. For the AES S-box the best circuit known has 32
(Boyar and Peralta, 115 gates in all). Keccak's only nonlinear step $\chi$
computes $a_i \oplus (\lnot a_{i+1} \wedge a_{i+2})$ along rows of five bits, one
AND per state bit, 1,600 per round of Keccak-f[1600]. The same accounting works
one level up, in $\mathrm{GF}(2^8)$: since squaring is linear, $x^{254}$ costs
only its true multiplications. Matthieu Rivain and Emmanuel Prouff (CHES 2010)
found a chain with four, and masked AES at any order with it.

```python
def gmul(a, b):                       # GF(2^8) with the AES polynomial
    r = 0
    while b:
        if b & 1:
            r ^= a
        a <<= 1
        if a & 0x100:
            a ^= 0x11B
        b >>= 1
    return r

def sq(x, k=1):                       # k squarings: linear over GF(2), free on shares
    for _ in range(k):
        x = gmul(x, x)
    return x

def inverse_chain(x):
    """x^254 with 4 true multiplications (Rivain and Prouff, 2010)."""
    x2 = sq(x)
    x3 = gmul(x2, x)                  # 1
    x12 = sq(x3, 2)
    x15 = gmul(x12, x3)               # 2
    x240 = sq(x15, 4)
    x252 = gmul(x240, x12)            # 3
    return gmul(x252, x2)             # 4

print(all(gmul(x, inverse_chain(x)) == 1 for x in range(1, 256)), inverse_chain(0))
print(all(sq(x ^ y) == sq(x) ^ sq(y) for x in range(256) for y in range(256)))
for d in (1, 2, 3):                    # one AES round: 16 S-boxes of 32 ANDs
    ands, rnd = (d + 1) ** 2, d * (d + 1) // 2
    print(f"order {d}: AES round {512 * ands} ANDs, {512 * rnd} random bits;",
          f"Keccak-f round {1600 * ands} ANDs, {1600 * rnd} random bits")
```

It prints:

```text
True 0
True
order 1: AES round 2048 ANDs, 512 random bits; Keccak-f round 6400 ANDs, 1600 random bits
order 2: AES round 4608 ANDs, 1536 random bits; Keccak-f round 14400 ANDs, 4800 random bits
order 3: AES round 8192 ANDs, 3072 random bits; Keccak-f round 25600 ANDs, 9600 random bits
```

The chain is $x \to x^2 \to x^3 \to x^{12} \to x^{15} \to x^{240} \to x^{252}
\to x^{254}$: seven squarings, free, and four multiplications, masked. The
second line confirms that squaring is linear on all $2^{16}$ pairs. The last
three lines compare a round of AES (16 S-boxes over 128 bits of state) with a
round of Keccak-f (1,600 bits): per bit of state, AES's S-box layer needs four
AND gates and Keccak's $\chi$ one. The cost grows with $(d + 1)^2$ for both,
which is why ciphers meant for masking, zero-knowledge proofs and multiparty
computation are designed around few, low-degree multiplications. Degree matters
too. A **threshold implementation** (Svetla Nikova, Christian Rechberger and
Vincent Rijmen, 2006) shares a function of degree $t$ into at least $t + 1$
pieces, each output share computed without one of the input shares, and needs
little or no fresh randomness. A degree-2 map such as $\chi$ fits with three or
four shares; inversion, of degree 7, has to be split into quadratic or cubic
pieces first, which is what hardware designs for AES do.

**Going deeper.**

- *Equivalence.* Two S-boxes are affine equivalent if $S_2 = A \circ S_1 \circ B$
  for affine permutations $A$ and $B$; DDT and LAT values are invariant. The wider
  CCZ equivalence (Carlet, Pascale Charpin and Victor Zinoviev, 1998)
  preserves differential uniformity and nonlinearity too and is the right notion
  for classifying APN functions.
- *Boomerang and other tables.* The boomerang connectivity table (Carlos Cid and
  colleagues, 2018) refines the DDT for boomerang attacks; the AES S-box scores
  well there too.
- *Algebraic immunity.* Against algebraic attacks on stream ciphers, a Boolean
  function should have no low-degree annihilator; the **algebraic immunity** is at
  most $\lceil n/2 \rceil$ (Courtois and Meier, 2003; Meier, Pasalic and Carlet,
  2004).
- *Carlet's book* (Further reading) covers all of this and much more, including
  the vectorial functions, the APN classification and the bent-function
  constructions only touched on here.

## Check yourself

??? question "1. Find the ANF of $f(x_1, x_2) = $ OR."

    OR is 1 unless both inputs are 0: $x_1 \oplus x_2 \oplus x_1x_2$. Check at
    $(1, 1)$: $1 \oplus 1 \oplus 1 = 1$.

??? question "2. For $f = x_1 \oplus x_2x_3 \oplus x_1x_2x_3$, xor $f$ over the cube $\{x_2, x_3\}$ with $x_1 = 0$, then with $x_1 = 1$. Which polynomial in $x_1$ have you found?"

    With $x_1 = 0$, $f = x_2x_3$, and its four values over the cube are $0, 0, 0,
    1$: the xor is 1. With $x_1 = 1$, $f = 1 \oplus x_2x_3 \oplus x_2x_3 = 1$ at
    all four points: the xor is 0. The cube sum is the coefficient of $x_2x_3$ as
    a polynomial in the remaining variable, the superpoly $1 \oplus x_1$, which is
    1 at $x_1 = 0$ and 0 at $x_1 = 1$.

??? question "3. Compute the Walsh spectrum of $f(x_1, x_2) = x_1x_2$."

    Truth table $0, 0, 0, 1$. $W(00) = 1 + 1 + 1 - 1 = 2$; $W(01) = 1 - 1 + 1 +
    1 = 2$; $W(10) = 2$; $W(11) = 1 - 1 - 1 - 1 = -2$. All $\pm 2 = 2^{n/2}$: it
    is bent, with nonlinearity 1.

??? question "4. Why do bent functions not exist for odd $n$?"

    Bent means $|W_f(a)| = 2^{n/2}$ for every $a$, but $W_f(a)$ is an integer and
    $2^{n/2}$ is not when $n$ is odd.

??? question "5. Show that $f = x_1x_3 \oplus x_2x_4$ is bent without computing a Walsh transform."

    Its derivative in direction $u$ is $u_1x_3 \oplus u_3x_1 \oplus u_2x_4 \oplus
    u_4x_2$ plus a constant: the quadratic terms cancel. For $u \ne 0$ some
    variable appears, so the derivative is a nonconstant affine function and is
    balanced. A function whose derivatives in all nonzero directions are balanced
    is bent (§10.4).

??? question "6. What does Siegenthaler's trade-off say about a balanced 2-resilient function of 6 variables?"

    $d + m \le n - 1$ gives $d \le 6 - 1 - 2 = 3$: its degree is at most 3.

??? question "7. Why is every entry of a DDT even, and what is the nonlinearity of an 8-bit S-box whose linearity is 32?"

    If $x$ satisfies $S(x) \oplus S(x \oplus a) = b$, so does $x' = x \oplus a$,
    and $x' \ne x$ when $a \ne 0$; solutions come in pairs. The nonlinearity is
    $2^7 - 32/2 = 128 - 16 = 112$.

??? question "8. Why can't AES use the APN cube map instead of inversion?"

    $x^3$ is not a permutation of $\mathrm{GF}(2^8)$ (3 divides 255, so cubing is
    three-to-one on nonzero elements), and its degree is only 2, the binary weight
    of 3.

??? question "9. In which column does row $a$ of the DDT of $x \mapsto x^{-1}$ on $\mathrm{GF}(2^8)$ hold its 4, and why would there be no 4 in $\mathrm{GF}(2^7)$?"

    In column $b = a^{-1}$. The inputs $0$ and $a$ always give $a^{-1}$, and the
    quadratic $x^2 + ax + a^2 = 0$ adds two more, $a\omega$ and $a\omega^2$,
    where $\omega$ is a root of $t^2 + t + 1$. Such a root lies in
    $\mathrm{GF}(4)$, which is a subfield of $\mathrm{GF}(2^n)$ only for even
    $n$. In $\mathrm{GF}(2^7)$ the quadratic has no roots, every entry is 0 or 2,
    and inversion is APN.

??? question "10. With Boyar and Peralta's 32-AND circuit, what does a second-order (three-share) ISW masking of one AES S-box cost, and why does Rivain and Prouff's method count only 4 multiplications for $x^{254}$?"

    Each AND becomes $(d + 1)^2 = 9$ ANDs and needs $d(d + 1)/2 = 3$ random
    bits: 288 ANDs and 96 random bits per S-box. Rivain and Prouff work in
    $\mathrm{GF}(2^8)$, where squaring is linear over $\mathbb{F}_2$ and so is
    applied to each share separately at no extra cost; the chain to $x^{254}$
    needs only four multiplications of two different values.

## What you learned

- A Boolean function is a truth table and a unique polynomial over
  $\mathbb{F}_2$, its ANF; the Möbius transform converts between them in $n2^n$
  steps. Degree 1 means affine, which means broken.
- Every ANF coefficient is the xor of $f$ over a cube. With key and IV bits as
  variables, a cube of IV bits one smaller than the degree yields a linear
  equation in the key: the cube attack.
- The Walsh-Hadamard transform measures correlation with every linear function;
  Parseval fixes the total; the fast transform takes $n2^n$ steps.
- Nonlinearity is at most $2^{n-1} - 2^{n/2-1}$; bent functions reach it but are
  never balanced. A function is bent exactly when all its derivatives are
  balanced; in four variables there are 896, all quadratic.
- Correlation immunity (Walsh zeros at low weight) resists correlation attacks,
  but trades off against degree (Siegenthaler).
- The DDT and LAT of an S-box are what differential and linear cryptanalysis use;
  differential uniformity and linearity summarize them.
- PRESENT's 4-bit S-box is optimal (4 and 4). AES's S-box, inversion in
  $\mathrm{GF}(2^8)$ plus an affine map, has differential uniformity 4,
  nonlinearity 112 and degree 7, the best known for 8 bits. Every DDT row holds
  one 4 and 126 twos; every |LAT| entry is at most 16. The 4 comes from
  $\mathrm{GF}(4) \subset \mathrm{GF}(2^8)$, the degree from the binary weight of
  254, and the 112 from Kloosterman sums.
- APN functions have differential uniformity 2; an 8-bit APN permutation is an
  open problem. The DES S-boxes were designed against a differential attack kept
  secret for twenty years; their linear criterion looked only at single output
  bits, and Matsui's attack used the xor of all four.
- Masking splits secrets into shares. Linear maps (including squaring in
  $\mathrm{GF}(2^8)$) are free on shares; each AND costs $(d + 1)^2$ ANDs and
  $d(d + 1)/2$ random bits, so the multiplicative complexity of an S-box (32 for
  AES, one per bit for Keccak's $\chi$) sets the price.

**Next:** [Chapter 11](11-Polynomials-at-Work.md), polynomials at work:
interpolation, secret sharing, the fast Fourier and number-theoretic transforms,
and why zero-knowledge proofs are polynomial tricks.

## Further reading

- C. Carlet, *Boolean Functions for Cryptography and Coding Theory*
  (Cambridge, 2021): the reference for this chapter.
- Kaisa Nyberg, "Differentially Uniform Mappings for Cryptography", EUROCRYPT 1993.
- Oscar Rothaus, "On 'Bent' Functions", *Journal of Combinatorial Theory A* 20
  (1976).
- Thomas Siegenthaler, "Correlation-Immunity of Nonlinear Combining Functions for
  Cryptographic Applications", *IEEE Transactions on Information Theory* 30
  (1984).
- Guo-Zhen Xiao and James Massey, "A Spectral Characterization of
  Correlation-Immune Combining Functions", *IEEE Transactions on Information
  Theory* 34 (1988).
- Eli Biham and Adi Shamir, *Differential Cryptanalysis of the Data Encryption
  Standard* (Springer, 1993).
- Mitsuru Matsui, "Linear Cryptanalysis Method for DES Cipher", EUROCRYPT 1993.
- Don Coppersmith, "The Data Encryption Standard (DES) and Its Strength Against
  Attacks", *IBM Journal of Research and Development* 38 (1994).
- Andrey Bogdanov and others, "PRESENT: An Ultra-Lightweight Block Cipher",
  CHES 2007.
- Gregor Leander and Axel Poschmann, "On the Classification of 4 Bit S-Boxes",
  WAIFI 2007.
- K. A. Browning, J. F. Dillon, M. T. McQuistan and A. J. Wolfe, "An APN
  Permutation in Dimension Six", *Contemporary Mathematics* 518 (2010).
- Alex Biryukov, Léo Perrin and Aleksei Udovenko, "Reverse-Engineering the S-Box
  of Streebog, Kuznyechik and STRIBOBr1", EUROCRYPT 2016.
- Xuejia Lai, "Higher Order Derivatives and Differential Cryptanalysis", in
  *Communications and Cryptography* (Kluwer, 1994).
- Itai Dinur and Adi Shamir, "Cube Attacks on Tweakable Black Box Polynomials",
  EUROCRYPT 2009.
- Bart Preneel, *Analysis and Design of Cryptographic Hash Functions*, PhD
  thesis, KU Leuven (1993), for the count of bent functions of six variables.
- Philippe Langevin and Gregor Leander, "Counting All Bent Functions in Dimension
  Eight 99270589265934370305785861242880", *Designs, Codes and Cryptography* 59
  (2011).
- Kaisa Nyberg, "Perfect Nonlinear S-Boxes", EUROCRYPT 1991.
- Leonard Carlitz and Saburo Uchiyama, "Bounds for Exponential Sums", *Duke
  Mathematical Journal* 24 (1957).
- Gilles Lachaud and Jacques Wolfmann, "The Weights of the Orthogonals of the
  Extended Quadratic Binary Goppa Codes", *IEEE Transactions on Information
  Theory* 36 (1990): the exact values of binary Kloosterman sums.
- Joan Daemen and Vincent Rijmen, *The Design of Rijndael* (Springer, 2002;
  second edition 2020): the S-box rationale, including the fixed points.
- David Canright, "A Very Compact S-Box for AES", CHES 2005.
- Joan Boyar and René Peralta, "A New Combinational Logic Minimization Technique
  with Applications to Cryptology", SEA 2010 (IACR ePrint 2009/191).
- Yuval Ishai, Amit Sahai and David Wagner, "Private Circuits: Securing Hardware
  against Probing Attacks", CRYPTO 2003.
- Matthieu Rivain and Emmanuel Prouff, "Provably Secure Higher-Order Masking of
  AES", CHES 2010.
- Svetla Nikova, Christian Rechberger and Vincent Rijmen, "Threshold
  Implementations Against Side-Channel Attacks and Glitches", ICICS 2006.
- Guido Bertoni, Joan Daemen, Michaël Peeters and Gilles Van Assche, *The Keccak
  Reference* (2011), for $\chi$.
- In *The cryptography book*: [Chapter 6](../../book/06-Block-Ciphers.md),
  [Chapter 7](../../book/07-AES.md) and
  [Chapter 18](../../book/18-Side-Channels.md). In the sibling books:
  [Cryptanalysis, Chapters 5 to 8](../cryptanalysis/05-Differential-Cryptanalysis.md)
  for the attacks, and
  [Engineering, Chapter 7](../engineering/07-Masking-and-Fault-Resistance.md) for
  masking in practice.
