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
scores the best values known for an 8-bit permutation.*

!!! abstract "In this chapter"
    **You will learn:**

    - Boolean functions as truth tables and as polynomials (the algebraic normal
      form), and their degree;
    - the Walsh-Hadamard transform, how to compute it in $n 2^n$ steps, and
      Parseval's identity;
    - nonlinearity, its upper bound, and the bent functions that reach it;
    - balance, correlation immunity and resiliency, and Siegenthaler's trade-off
      between them and degree;
    - the difference distribution table (DDT) and linear approximation table
      (LAT) of an S-box, differential uniformity and linearity;
    - APN functions and the open problems around them;
    - why the AES S-box, inversion in $\mathrm{GF}(2^8)$, scores so well, and
      what the DES S-box criteria were.

    **You need:** [Chapter 8](08-Rings-Fields-and-Polynomials.md)
    ($\mathrm{GF}(2^8)$ and the AES S-box) and
    [Chapter 9](09-Linear-Algebra.md) (vectors over $\mathbb{F}_2$, LFSRs,
    branch number).

    **Levels:** §10.1 to §10.4 are for beginners, §10.5 to §10.8 are
    intermediate, §10.9 and §10.10 are expert.

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
```

```text
4 4
[16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
[0, 0, 0, 4, 0, 0, 0, 4, 0, 4, 0, 0, 0, 4, 0, 0]
[0, 0, 0, 2, 0, 4, 2, 0, 0, 0, 2, 0, 2, 2, 2, 0]
[0, 2, 0, 2, 2, 0, 4, 2, 0, 0, 2, 2, 0, 0, 0, 0]
```

Differential uniformity 4 (best difference probability $4/16 = 1/4$) and a largest
LAT entry of 4 (best bias $4/16 = 1/4$, correlation $1/2$). For 4-bit
permutations these are the best possible values: Gregor Leander and Axel
Poschmann (2007) sorted all 4-bit S-boxes into equivalence classes and found that
the optimal ones fall into 16 classes. PRESENT's box also has the extra property
that a single-bit input difference never gives a single-bit output difference, which
the designers used to count active S-boxes across the bit permutation.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The 16 by 16 difference distribution table of the PRESENT S-box drawn as a grid: one full cell at the top left, and in the other rows only entries 0, 2 and 4, with no row having a large entry" fill="currentColor" font-size="12">
<rect x="149" y="29" width="209" height="209" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="150" y="30" width="12" height="12" fill-opacity="0.6"/>
<rect x="189" y="43" width="12" height="12" class="acc-fill"/>
<rect x="241" y="43" width="12" height="12" class="acc-fill"/>
<rect x="267" y="43" width="12" height="12" class="acc-fill"/>
<rect x="319" y="43" width="12" height="12" class="acc-fill"/>
<rect x="189" y="56" width="12" height="12" class="soft-acc"/>
<rect x="215" y="56" width="12" height="12" class="acc-fill"/>
<rect x="228" y="56" width="12" height="12" class="soft-acc"/>
<rect x="280" y="56" width="12" height="12" class="soft-acc"/>
<rect x="306" y="56" width="12" height="12" class="soft-acc"/>
<rect x="319" y="56" width="12" height="12" class="soft-acc"/>
<rect x="332" y="56" width="12" height="12" class="soft-acc"/>
<rect x="163" y="69" width="12" height="12" class="soft-acc"/>
<rect x="189" y="69" width="12" height="12" class="soft-acc"/>
<rect x="202" y="69" width="12" height="12" class="soft-acc"/>
<rect x="228" y="69" width="12" height="12" class="acc-fill"/>
<rect x="241" y="69" width="12" height="12" class="soft-acc"/>
<rect x="280" y="69" width="12" height="12" class="soft-acc"/>
<rect x="293" y="69" width="12" height="12" class="soft-acc"/>
<rect x="215" y="82" width="12" height="12" class="acc-fill"/>
<rect x="228" y="82" width="12" height="12" class="soft-acc"/>
<rect x="241" y="82" width="12" height="12" class="soft-acc"/>
<rect x="267" y="82" width="12" height="12" class="soft-acc"/>
<rect x="280" y="82" width="12" height="12" class="soft-acc"/>
<rect x="306" y="82" width="12" height="12" class="soft-acc"/>
<rect x="332" y="82" width="12" height="12" class="soft-acc"/>
<rect x="163" y="95" width="12" height="12" class="soft-acc"/>
<rect x="202" y="95" width="12" height="12" class="soft-acc"/>
<rect x="267" y="95" width="12" height="12" class="soft-acc"/>
<rect x="280" y="95" width="12" height="12" class="soft-acc"/>
<rect x="293" y="95" width="12" height="12" class="soft-acc"/>
<rect x="306" y="95" width="12" height="12" class="acc-fill"/>
<rect x="319" y="95" width="12" height="12" class="soft-acc"/>
<rect x="176" y="108" width="12" height="12" class="soft-acc"/>
<rect x="228" y="108" width="12" height="12" class="soft-acc"/>
<rect x="254" y="108" width="12" height="12" class="soft-acc"/>
<rect x="293" y="108" width="12" height="12" class="acc-fill"/>
<rect x="306" y="108" width="12" height="12" class="soft-acc"/>
<rect x="345" y="108" width="12" height="12" class="acc-fill"/>
<rect x="163" y="121" width="12" height="12" class="acc-fill"/>
<rect x="176" y="121" width="12" height="12" class="soft-acc"/>
<rect x="228" y="121" width="12" height="12" class="soft-acc"/>
<rect x="254" y="121" width="12" height="12" class="soft-acc"/>
<rect x="306" y="121" width="12" height="12" class="soft-acc"/>
<rect x="345" y="121" width="12" height="12" class="acc-fill"/>
<rect x="189" y="134" width="12" height="12" class="soft-acc"/>
<rect x="241" y="134" width="12" height="12" class="soft-acc"/>
<rect x="267" y="134" width="12" height="12" class="soft-acc"/>
<rect x="293" y="134" width="12" height="12" class="acc-fill"/>
<rect x="319" y="134" width="12" height="12" class="soft-acc"/>
<rect x="345" y="134" width="12" height="12" class="acc-fill"/>
<rect x="176" y="147" width="12" height="12" class="soft-acc"/>
<rect x="202" y="147" width="12" height="12" class="acc-fill"/>
<rect x="228" y="147" width="12" height="12" class="soft-acc"/>
<rect x="254" y="147" width="12" height="12" class="soft-acc"/>
<rect x="306" y="147" width="12" height="12" class="soft-acc"/>
<rect x="332" y="147" width="12" height="12" class="acc-fill"/>
<rect x="176" y="160" width="12" height="12" class="soft-acc"/>
<rect x="189" y="160" width="12" height="12" class="soft-acc"/>
<rect x="215" y="160" width="12" height="12" class="acc-fill"/>
<rect x="254" y="160" width="12" height="12" class="soft-acc"/>
<rect x="280" y="160" width="12" height="12" class="soft-acc"/>
<rect x="319" y="160" width="12" height="12" class="soft-acc"/>
<rect x="332" y="160" width="12" height="12" class="soft-acc"/>
<rect x="163" y="173" width="12" height="12" class="soft-acc"/>
<rect x="202" y="173" width="12" height="12" class="soft-acc"/>
<rect x="254" y="173" width="12" height="12" class="acc-fill"/>
<rect x="267" y="173" width="12" height="12" class="soft-acc"/>
<rect x="280" y="173" width="12" height="12" class="soft-acc"/>
<rect x="293" y="173" width="12" height="12" class="soft-acc"/>
<rect x="319" y="173" width="12" height="12" class="soft-acc"/>
<rect x="176" y="186" width="12" height="12" class="soft-acc"/>
<rect x="215" y="186" width="12" height="12" class="acc-fill"/>
<rect x="241" y="186" width="12" height="12" class="soft-acc"/>
<rect x="254" y="186" width="12" height="12" class="soft-acc"/>
<rect x="267" y="186" width="12" height="12" class="soft-acc"/>
<rect x="280" y="186" width="12" height="12" class="soft-acc"/>
<rect x="332" y="186" width="12" height="12" class="soft-acc"/>
<rect x="163" y="199" width="12" height="12" class="soft-acc"/>
<rect x="176" y="199" width="12" height="12" class="acc-fill"/>
<rect x="189" y="199" width="12" height="12" class="soft-acc"/>
<rect x="202" y="199" width="12" height="12" class="soft-acc"/>
<rect x="241" y="199" width="12" height="12" class="soft-acc"/>
<rect x="280" y="199" width="12" height="12" class="soft-acc"/>
<rect x="293" y="199" width="12" height="12" class="soft-acc"/>
<rect x="176" y="212" width="12" height="12" class="soft-acc"/>
<rect x="189" y="212" width="12" height="12" class="soft-acc"/>
<rect x="228" y="212" width="12" height="12" class="soft-acc"/>
<rect x="241" y="212" width="12" height="12" class="soft-acc"/>
<rect x="254" y="212" width="12" height="12" class="soft-acc"/>
<rect x="267" y="212" width="12" height="12" class="soft-acc"/>
<rect x="306" y="212" width="12" height="12" class="soft-acc"/>
<rect x="319" y="212" width="12" height="12" class="soft-acc"/>
<rect x="163" y="225" width="12" height="12" class="acc-fill"/>
<rect x="202" y="225" width="12" height="12" class="acc-fill"/>
<rect x="332" y="225" width="12" height="12" class="acc-fill"/>
<rect x="345" y="225" width="12" height="12" class="acc-fill"/>
<text x="254" y="22" text-anchor="middle">output difference b →</text>
<text x="140" y="140" text-anchor="end">input</text>
<text x="140" y="156" text-anchor="end">difference a ↓</text>
<rect x="400" y="60" width="12" height="12" fill-opacity="0.6"/><text x="420" y="70">16 (a = 0)</text>
<rect x="400" y="90" width="12" height="12" class="acc-fill"/><text x="420" y="100">4: probability 1/4 (24 entries)</text>
<rect x="400" y="120" width="12" height="12" class="soft-acc"/><text x="420" y="130">2: probability 1/8 (72 entries)</text>
<rect x="400" y="150" width="12" height="12" fill="none" stroke="currentColor" stroke-width="0.6"/><text x="420" y="160">0 (144 entries)</text>
<text x="400" y="200">no entry above 4:</text>
<text x="400" y="218">differential uniformity 4,</text>
<text x="400" y="236">optimal for 4 bits</text>
</svg>
<figcaption>Figure 10.2. The difference distribution table of PRESENT's S-box. Each row shows where one input difference goes. A strong S-box has no tall entry in any row except the trivial one at the top left; here the largest is 4 of 16.</figcaption>
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
<figcaption>Figure 10.3. Three 8-bit maps measured. A random permutation is mediocre on both attack measures. The cube is best for differences but has degree 2 and repeats values. Inversion with the affine map, the AES S-box, is near the best on every measure at once.</figcaption>
</figure>

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

**Going deeper.**

- *Equivalence.* Two S-boxes are affine equivalent if $S_2 = A \circ S_1 \circ B$
  for affine permutations $A$ and $B$; DDT and LAT values are invariant. The wider
  CCZ equivalence (Claude Carlet, Pascale Charpin and Victor Zinoviev, 1998)
  preserves differential uniformity and nonlinearity too and is the right notion
  for classifying APN functions.
- *Boomerang and other tables.* The boomerang connectivity table (Carlos Cid and
  colleagues, 2018) refines the DDT for boomerang attacks; the AES S-box scores
  well there too.
- *Algebraic immunity.* Against algebraic attacks on stream ciphers, a Boolean
  function should have no low-degree annihilator; the **algebraic immunity** is at
  most $\lceil n/2 \rceil$ (Courtois and Meier, 2003; Meier, Pasalic and Carlet,
  2004).
- *Claude Carlet's book* (Further reading) covers all of this and much more.

## Check yourself

??? question "1. Find the ANF of $f(x_1, x_2) = $ OR."

    OR is 1 unless both inputs are 0: $x_1 \oplus x_2 \oplus x_1x_2$. Check at
    $(1, 1)$: $1 \oplus 1 \oplus 1 = 1$.

??? question "2. What is the degree of $f(x) = x_1x_2x_3 \oplus x_1$, and is it balanced?"

    Degree 3. If $x_1 = 0$ the value is 0. If $x_1 = 1$ it is $x_2x_3 \oplus 1$,
    which is 1 for three of the four choices of $x_2, x_3$. So it is 1 on 3 of
    the 8 inputs: not balanced.

??? question "3. Compute the Walsh spectrum of $f(x_1, x_2) = x_1x_2$."

    Truth table $0, 0, 0, 1$. $W(00) = 1 + 1 + 1 - 1 = 2$; $W(01) = 1 - 1 + 1 +
    1 = 2$; $W(10) = 2$; $W(11) = 1 - 1 - 1 - 1 = -2$. All $\pm 2 = 2^{n/2}$: it
    is bent, with nonlinearity 1.

??? question "4. Why do bent functions not exist for odd $n$?"

    Bent means $|W_f(a)| = 2^{n/2}$ for every $a$, but $W_f(a)$ is an integer and
    $2^{n/2}$ is not when $n$ is odd.

??? question "5. What does Siegenthaler's trade-off say about a balanced 2-resilient function of 6 variables?"

    $d + m \le n - 1$ gives $d \le 6 - 1 - 2 = 3$: its degree is at most 3.

??? question "6. Why is every entry of a DDT even?"

    If $x$ satisfies $S(x) \oplus S(x \oplus a) = b$, so does $x' = x \oplus a$,
    and $x' \ne x$ when $a \ne 0$; solutions come in pairs.

??? question "7. A 4-bit S-box has a DDT entry of 8 for some nonzero $a$. What is the probability that this difference passes, and is that good?"

    $8/16 = 1/2$. Bad: the best 4-bit S-boxes have at most 4, probability 1/4.

??? question "8. What is the nonlinearity of an 8-bit S-box whose linearity is 32?"

    $2^7 - 32/2 = 128 - 16 = 112$.

??? question "9. Why can't AES use the APN cube map instead of inversion?"

    $x^3$ is not a permutation of $\mathrm{GF}(2^8)$ (3 divides 255, so cubing is
    three-to-one on nonzero elements), and its degree is only 2.

??? question "10. Which DES S-box criterion protects against differential cryptanalysis most directly?"

    The last: for any nonzero input difference, no output difference occurs for
    more than 8 of the 32 input pairs, which caps every DDT entry and so the
    probability of each step of a differential.

## What you learned

- A Boolean function is a truth table and a unique polynomial over
  $\mathbb{F}_2$, its ANF; the Möbius transform converts between them in $n2^n$
  steps. Degree 1 means affine, which means broken.
- The Walsh-Hadamard transform measures correlation with every linear function;
  Parseval fixes the total; the fast transform takes $n2^n$ steps.
- Nonlinearity is at most $2^{n-1} - 2^{n/2-1}$; bent functions reach it but are
  never balanced.
- Correlation immunity (Walsh zeros at low weight) resists correlation attacks,
  but trades off against degree (Siegenthaler).
- The DDT and LAT of an S-box are what differential and linear cryptanalysis use;
  differential uniformity and linearity summarize them.
- PRESENT's 4-bit S-box is optimal (4 and 4). AES's S-box, inversion in
  $\mathrm{GF}(2^8)$ plus an affine map, has differential uniformity 4,
  nonlinearity 112 and degree 7, the best known for 8 bits.
- APN functions have differential uniformity 2; an 8-bit APN permutation is an
  open problem. The DES S-boxes were designed against a differential attack kept
  secret for twenty years.

**Next:** [Chapter 11](11-Polynomials-at-Work.md), polynomials at work:
interpolation, secret sharing, the fast Fourier and number-theoretic transforms,
and why zero-knowledge proofs are polynomial tricks.

## Further reading

- Claude Carlet, *Boolean Functions for Cryptography and Coding Theory*
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
- In *The cryptography book*: [Chapter 6](../../book/06-Block-Ciphers.md) and
  [Chapter 7](../../book/07-AES.md).
