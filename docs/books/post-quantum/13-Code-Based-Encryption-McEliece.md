# 13. Code-Based Encryption: McEliece

*In 1978, a year after RSA, Robert McEliece proposed a public-key system built on
error-correcting codes. RSA fell to Shor's algorithm on paper in 1994; McEliece's system,
with its original kind of code, has never been broken in nearly fifty years of attack. Its
drawback has always been the key: hundreds of kilobytes to over a megabyte. This chapter is
about that trade. You will build a working McEliece system with a binary Goppa code over
GF(2^8), decrypt by decoding errors with the Berlekamp-Massey algorithm, break the toy with
Prange's 1962 information-set decoding, and compute how far the same attack is from the real
parameter sets. The chapter ends with where Classic McEliece stands: not chosen by NIST,
recommended by some European agencies, and on its way through ISO.*

!!! abstract "In this chapter"
    **You will learn:**

    - how McEliece and Niederreiter encryption hide a message as errors in a codeword;
    - binary Goppa codes, and how their secret structure allows decoding;
    - a complete toy Classic McEliece, from key generation to decoding;
    - information-set decoding, the best known attack, and its cost;
    - why other codes failed where Goppa codes have held;
    - Classic McEliece's parameters, its status, and where its huge keys are acceptable.

    **You need:** [Chapter 3](03-KEMs-and-Signatures.md) (KEMs) and
    [Chapter 4](04-A-Field-Guide-to-Hard-Problems.md) (decoding as a hard problem); linear
    algebra over GF(2). The theory of linear codes, finite fields and Goppa codes is in
    Chapter 18 of the mathematics book; this
    chapter uses it.

    **Levels:** §13.1 to §13.3 are for beginners, §13.4 to §13.8 are intermediate, §13.9 and
    §13.10 are expert.

## 13.1 The problem

*Level: beginner.*

Every network adds noise. Error-correcting codes fight it by adding structured redundancy: a
$k$-bit message becomes an $n$-bit **codeword**, and as long as no more than $t$ bits are
flipped on the way, the receiver can find and undo the flips. Mars rovers and the Deep Space
Network have relied on such codes since the 1970s; McEliece himself worked at the Jet
Propulsion Laboratory on coding for deep-space links.

McEliece turned the problem around. Decoding a *random-looking* linear code with $t$ errors
is hard: no known algorithm, classical or quantum, does much better than guessing where the
errors are. Decoding a code *with a known structure* is easy. So publish a code that looks
random, keep its structure secret, and encrypt by deliberately adding $t$ errors. Only the
holder of the structure can remove them.

The general decoding problem is NP-hard (Berlekamp, McEliece and van Tilborg, 1978), and
quantum computers give only a Grover-type speed-up on the best known attacks. The question
for fifty years has been whether the hidden structure can be found from the public key. For
binary Goppa codes, McEliece's original choice, the answer so far is no.

!!! note "Life story: the McEliece cryptosystem"
    **Born:** 1978, Robert J. McEliece, "A Public-Key Cryptosystem Based on Algebraic Coding
    Theory", JPL DSN Progress Report 42-44 · **Purpose:** public-key encryption from the
    hardness of decoding · **Helped:** the whole field of code-based cryptography;
    Niederreiter's 1986 variant; Classic McEliece (2017 onward) · **Status:** unbroken with
    binary Goppa codes; Classic McEliece was a finalist in NIST's third round and went on to the
    fourth, but NIST did not select it in March 2025 (NIST IR 8545), noting that it is under
    consideration for ISO standardization.

## 13.2 Codes in one page

*Level: beginner.*

A binary linear code of length $n$ and dimension $k$ is a set of $2^k$ codewords in
$\{0,1\}^n$, closed under XOR. It can be described in two ways:

- by a **generator matrix** $G$ ($k \times n$): the codewords are $mG$ for all messages $m$;
- by a **parity-check matrix** $H$ ($(n-k) \times n$): the codewords are the vectors $x$ with
  $Hx = 0$.

If a codeword $x$ arrives with errors $e$, the receiver sees $y = x + e$ and can compute the
**syndrome** $Hy = He$, which depends only on the errors. Decoding means finding the
lowest-weight $e$ with a given syndrome. For a random code that is the **syndrome decoding
problem**, and it is hard.

<div class="mars-steps" markdown>

**Syndrome decoding with the [7, 4] Hamming code** (corrects one error).

1. The parity-check matrix has as columns the numbers 1 to 7 in binary:
   $H = \begin{pmatrix} 0&0&0&1&1&1&1 \\ 0&1&1&0&0&1&1 \\ 1&0&1&0&1&0&1 \end{pmatrix}$.
2. A codeword $x = 0110011$ has $Hx = 0$. Flip bit 5: $y = 0110111$.
3. $Hy$ = column 5 = $101$, the binary for 5.
4. The syndrome names the error position. Flip bit 5 back.

</div>

The Hamming code's structure is obvious from $H$. McEliece's idea is to use a code with a
powerful decoder, and publish a parity-check (or generator) matrix that hides it.

## 13.3 McEliece and Niederreiter

*Level: beginner.*

**McEliece (1978).** The private key is a code with an efficient decoder for $t$ errors, given
by a generator matrix $G$, plus a random invertible matrix $S$ and a permutation $P$. The public
key is $\hat G = S G P$, which generates an equivalent code that looks random. To encrypt
$m$, pick a random $e$ of weight exactly $t$ and send $c = m\hat G + e$. To decrypt, undo $P$,
decode to remove the errors, and undo $S$.

**Niederreiter (1986)** is the parity-check version: the public key is a scrambled
parity-check matrix $\hat H$, the message is encoded as the error vector $e$ itself, and the
ciphertext is the syndrome $c = \hat H e$. Decrypting means finding the weight-$t$ vector with
that syndrome, which only the key holder can do. The ciphertext is just $n - k$ bits: for the
smallest Classic McEliece set, 96 bytes, the shortest of any post-quantum KEM.

Classic McEliece is a KEM built on Niederreiter: encapsulation picks a random weight-$t$ vector
$e$, sends $c = He$, and both sides derive the key by hashing $e$ (and $c$). The public key is
put in **systematic form** $H = [I_{n-k} \mid T]$, so only $T$ needs to be published, and the
secret scrambling is replaced by the elimination that produces that form.

| | McEliece | Niederreiter / Classic McEliece |
|---|---|---|
| public key | generator matrix $\hat G$ | parity-check matrix $H = [I \mid T]$ |
| message | $m$, errors random | the error vector $e$ itself |
| ciphertext | $m\hat G + e$ ($n$ bits) | $He$ ($n - k$ bits) |
| decryption | decode $c$ | find $e$ from its syndrome |

*Table 13.1. The two forms are equally secure; Niederreiter's gives much shorter ciphertexts.*

## 13.4 Binary Goppa codes

*Level: intermediate.*

Valery Goppa described his codes in 1970. Choose:

- a finite field $\mathrm{GF}(2^m)$;
- a **support** $L = (\alpha_1, \dots, \alpha_n)$ of $n$ distinct field elements;
- a **Goppa polynomial** $g(x)$ of degree $t$ over $\mathrm{GF}(2^m)$ with no roots in $L$.

The code is the set of binary vectors $c$ with

$$\sum_{j=1}^{n} \frac{c_j}{x - \alpha_j} \equiv 0 \pmod{g(x)}.$$

Equivalently, its parity checks are the rows $i = 0, \dots, t - 1$ of the matrix with entries
$\alpha_j^{\,i} / g(\alpha_j)$, each field element written as $m$ bits. That gives $mt$ binary
checks, so the code has dimension at least $n - mt$.

The useful fact: if $g$ is squarefree (Classic McEliece uses an irreducible $g$, which is), the
binary Goppa code for $g$ is the same as the one for $g^2$, and the $g^2$ description has $2t$
checks over $\mathrm{GF}(2^m)$. With $2t$ syndromes, standard algebraic decoding corrects $t$
errors. That is twice what the $mt$ binary checks would suggest, and it is why binary Goppa
codes give such good parameters. Without $L$ and $g$, though, the public matrix is just a
binary matrix, and no one has found an efficient way to tell it from a random one at the sizes
used.

Classic McEliece's parameter sets use $m = 12$ or $13$, $n$ from 3,488 to 8,192, and $t$ from 64
to 128.

## 13.5 A toy Classic McEliece

*Level: intermediate.*

**Code it.** A complete toy with $\mathrm{GF}(2^8)$, $n = 128$ and $t = 8$: 64 parity checks,
an 8-kilobit public key and a 64-bit ciphertext. Key generation draws a random support and a
random squarefree Goppa polynomial, builds the $64 \times 128$ binary parity-check matrix,
and brings it to systematic form $[I \mid T]$. Encryption picks 8 random error positions and
outputs their syndrome. Decryption treats the ciphertext as a received word (the syndrome
padded with zeros, which has the same syndrome under $[I \mid T]$), computes the $2t$ syndromes
of the $g^2$ code, finds the error-locator polynomial with the Berlekamp-Massey algorithm, and
finds its roots.

```python
# A toy Classic McEliece (Niederreiter form) with a binary Goppa code over GF(2^8).
import random
random.seed(1978)
M, N, T = 8, 128, 8                      # field GF(2^8), code length 128, corrects 8 errors

EXP, LOG = [0] * 512, [0] * 256          # GF(2^8) with the polynomial x^8 + x^4 + x^3 + x^2 + 1
x = 1
for i in range(255):
    EXP[i] = EXP[i + 255] = x
    LOG[x] = i
    x <<= 1
    if x & 0x100:
        x ^= 0x11D
def mul(a, b):  return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]
def inv(a):     return EXP[255 - LOG[a]]
def peval(p, x):                         # p[0] + p[1] x + ..., by Horner's rule
    r = 0
    for c in reversed(p):
        r = mul(r, x) ^ c
    return r

def keygen():
    while True:
        L = random.sample(range(1, 256), N)                  # the support: N distinct points
        g = [random.randrange(256) for _ in range(T)] + [1]  # monic Goppa polynomial, degree T
        if any(peval(g, a) == 0 for a in L) or not squarefree(g):
            continue
        # Private parity checks: row i, column j is L_j^i / g(L_j), as M bits each.
        rows = []
        for i in range(T):
            vals = [mul(pow_gf(a, i), inv(peval(g, a))) for a in L]
            for bit in range(M):
                rows.append(sum(((v >> bit) & 1) << j for j, v in enumerate(vals)))
        H = systematic(rows)
        if H:
            return (L, g), H                                 # H = [I | T], as row bitmasks

def pow_gf(a, e):
    return 1 if e == 0 else EXP[(LOG[a] * e) % 255]

def squarefree(g):                       # gcd(g, g') = 1; in characteristic 2, g' keeps odd terms
    d = [g[i] if i % 2 else 0 for i in range(1, len(g))]
    while d and d[-1] == 0:
        d.pop()
    a, b = g[:], d
    while b:
        while len(a) >= len(b):
            if a[-1]:
                c = mul(a[-1], inv(b[-1]))
                for k in range(len(b)):
                    a[len(a) - len(b) + k] ^= mul(c, b[k])
            a.pop()
        a, b = b, a
        while b and b[-1] == 0:
            b.pop()
    return len(a) == 1

def systematic(rows):
    """Gaussian elimination over GF(2) to H = [I | T]; None if the left block is singular."""
    rows = rows[:]
    for c in range(len(rows)):
        p = next((r for r in range(c, len(rows)) if rows[r] >> c & 1), None)
        if p is None:
            return None
        rows[c], rows[p] = rows[p], rows[c]
        for r in range(len(rows)):
            if r != c and rows[r] >> c & 1:
                rows[r] ^= rows[c]
    return rows

def encrypt(H):                          # a random weight-T error vector e; ciphertext = H e
    e = sum(1 << j for j in random.sample(range(N), T))
    return e, sum((bin(row & e).count("1") & 1) << i for i, row in enumerate(H))

def decrypt(priv, c):
    L, g = priv
    v = c                                # (c, 0, ..., 0) has syndrome c under H = [I | T]
    # Syndromes for the Goppa code with g^2 (the same binary code, but now 2T checks).
    S = []
    for i in range(2 * T):
        s = 0
        for j, a in enumerate(L):
            if v >> j & 1:
                s ^= mul(pow_gf(a, i), inv(mul(peval(g, a), peval(g, a))))
        S.append(s)
    sigma = berlekamp_massey(S)
    e = 0
    for j, a in enumerate(L):            # error at j exactly when sigma(1 / L_j) = 0
        if peval(sigma, inv(a)) == 0:
            e |= 1 << j
    return e

def berlekamp_massey(S):
    C, B, l, m, b = [1], [1], 0, 1, 1
    for n_ in range(len(S)):
        d = S[n_]
        for i in range(1, l + 1):
            if i < len(C):
                d ^= mul(C[i], S[n_ - i])
        if d == 0:
            m += 1
            continue
        coef = mul(d, inv(b))
        newC = C[:] + [0] * max(0, len(B) + m - len(C))
        for i, x in enumerate(B):
            newC[i + m] ^= mul(coef, x)
        if 2 * l <= n_:
            B, l, b, m = C, n_ + 1 - l, d, 1
        else:
            m += 1
        C = newC
    return C

priv, H = keygen()
e, c = encrypt(H)
print("public key:", len(H), "x", N, "bits; ciphertext:", len(H), "bits")
print("decrypted error vector correct:", decrypt(priv, c) == e)
```

It prints:

```
public key: 64 x 128 bits; ciphertext: 64 bits
decrypted error vector correct: True
```

The decoder recovers the exact 8 error positions. The real scheme has the same steps with $m =
12$ or $13$ and a careful constant-time implementation of each: field arithmetic, the
Berlekamp-Massey algorithm, and root finding by evaluating the locator at every support
element (Classic McEliece uses an additive FFT for that).

## 13.6 Why decoding works

*Level: intermediate.*

The decoder in the listing has three steps, each standard coding theory.

1. **Syndromes.** For a received word $v$ with errors in a set $E$, the $g^2$-syndromes are
   $S_i = \sum_{j \in E} \alpha_j^{\,i} / g(\alpha_j)^2$ for $i = 0, \dots, 2t - 1$ (the
   codeword part contributes nothing). These are $2t$ "power sums" of the unknown error
   positions, with weights.
2. **The error locator.** The polynomial $\sigma(x) = \prod_{j \in E} (1 - \alpha_j x)$ has
   degree $|E| \le t$ and satisfies a linear recurrence with the $S_i$. The Berlekamp-Massey
   algorithm (Berlekamp 1968, Massey 1969) finds the shortest such recurrence from $2t$ terms.
   This is the step that needs $2t$ syndromes for $t$ errors, and the $g^2$ trick supplies them.
3. **Roots.** $\sigma(1/\alpha_j) = 0$ exactly when $j$ is an error position. Test every
   support element.

The same machinery decodes Reed-Solomon codes in CDs, QR codes and deep-space links. Goppa codes
are subfield subcodes of generalized Reed-Solomon codes, binary codes cut out of a code over
$\mathrm{GF}(2^m)$, and that cutting is what hides the algebraic structure from an attacker
(§13.8).

## 13.7 Break it: information-set decoding

*Level: intermediate.*

The attacker sees $H$ and $c = He$ and wants $e$, a vector of weight $t$. In 1962 Eugene Prange
proposed the simplest strategy that still underlies every serious attack. Pick $n - k$ columns
of $H$ at random and hope all $t$ errors fall among them. If they do, $c$ is a combination of
those columns only, and Gaussian elimination finds which ones. Check that the answer has weight
$t$; if not, pick again.

**Break it.** Prange's algorithm on the toy key.

```python
# Uses keygen() and encrypt() from the listing above.
# Break the toy with Prange's information-set decoding (1962): guess that all errors sit in
# a random set of columns, solve the linear system there, and check the weight.
R = len(H)                                # 64 parity checks
cols = [sum((H[i] >> j & 1) << i for i in range(R)) for j in range(N)]   # columns as bitmasks
def prange(c):
    tries = 0
    while True:
        tries += 1
        pick = random.sample(range(N), R)
        # Solve: which subset of the picked columns adds up to c? (elimination over GF(2))
        basis = []                        # pairs (vector, which picked columns make it)
        for k, j in enumerate(pick):
            v, mask = cols[j], 1 << k
            for bv, bm in basis:
                if v ^ bv < v:
                    v, mask = v ^ bv, mask ^ bm
            if v:
                basis.append((v, mask))
                basis.sort(reverse=True)
        v, mask = c, 0
        for bv, bm in basis:
            if v ^ bv < v:
                v, mask = v ^ bv, mask ^ bm
        if v == 0 and bin(mask).count("1") == T:
            return sum(1 << pick[k] for k in range(R) if mask >> k & 1), tries
random.seed(62)
e, c = encrypt(H)
found, tries = prange(c)
print("Prange recovered the error vector:", found == e, "after", tries, "guesses")
```

It prints:

```
Prange recovered the error vector: True after 522 guesses
```

Each guess succeeds with probability $\binom{n-k}{t} / \binom{n}{t}$, which for the toy is about
$2^{-8.3}$, so a few hundred guesses are expected, as observed. **Fix it** with size: the same
formula for the real parameter sets.

```python
# How many Prange guesses would the real Classic McEliece parameter sets need?
from math import comb, log2
SETS = [("mceliece348864", 12, 3488, 64), ("mceliece460896", 13, 4608, 96),
        ("mceliece6688128", 13, 6688, 128), ("mceliece6960119", 13, 6960, 119),
        ("mceliece8192128", 13, 8192, 128)]
print("toy (n=128, t=8): Prange guesses about 2^%.1f" % log2(comb(128, 8) / comb(64, 8)))
for name, m, n, t in SETS:
    r = m * t                                     # parity checks
    guesses = comb(n, t) / comb(r, t)             # a guess works if all t errors fall in its r columns
    pk = r * -(-(n - r) // 8)                     # the T part of H = [I | T], rows padded to bytes
    print(f"{name}: public key {pk:9,d} B, ciphertext {-(-r // 8):3d} B, Prange guesses about 2^{log2(guesses):.0f}")
```

It prints:

```
toy (n=128, t=8): Prange guesses about 2^8.3
mceliece348864: public key   261,120 B, ciphertext  96 B, Prange guesses about 2^143
mceliece460896: public key   524,160 B, ciphertext 156 B, Prange guesses about 2^185
mceliece6688128: public key 1,044,992 B, ciphertext 208 B, Prange guesses about 2^262
mceliece6960119: public key 1,047,319 B, ciphertext 194 B, Prange guesses about 2^263
mceliece8192128: public key 1,357,824 B, ciphertext 208 B, Prange guesses about 2^300
```

Prange's plain algorithm needs about $2^{143}$ guesses for the smallest set, each a large
Gaussian elimination. Better ISD algorithms have been found over sixty years: Lee and Brickell
(1988), Stern (1989), and the "representation" techniques of May, Meurer and Thomae (2011) and
Becker, Joux, May and Meurer (2012), with later refinements. Each allows a few errors outside
the chosen set and uses collision search to find them, and together they cut tens of bits from
Prange's figures. They also teach a striking lesson: in half a century, the best attacks on
binary Goppa McEliece have improved only by small factors in the exponent, and the parameter
sets are chosen with the best of them counted. Quantum computers help ISD only through Grover's
algorithm applied inside the search (Bernstein, 2010), roughly halving the exponent of the
guessing part, and the larger parameter sets are chosen to absorb that.

## 13.8 Codes that failed

*Level: intermediate.*

McEliece with Goppa codes has survived; McEliece with many other codes has not. The pattern is
instructive: every code chosen for smaller keys had more visible structure, and the structure
leaked.

- **Generalized Reed-Solomon codes** (Niederreiter's original choice, 1986): broken in 1992 by
  Sidelnikov and Shestakov, who recovered the secret structure from the public key in
  polynomial time.
- **Reed-Muller codes** (Sidelnikov's own proposal, 1994): broken by Minder and Shokrollahi
  (2007) and later more efficiently by Chizhov and Borodin.
- **Quasi-cyclic and quasi-dyadic Goppa or alternant codes**, used to shrink keys: several
  were broken by algebraic attacks (Faugère, Otmani, Perret and Tillich, EUROCRYPT 2010).
- **High-rate Goppa codes**: Faugère, Gauthier-Umaña, Otmani, Perret and Tillich (2011) showed
  that when $n - k$ is very small, the public matrix *can* be told apart from random. The
  rates used in Classic McEliece are far from that regime, and the distinguisher does not
  give a key-recovery attack even where it works.

Binary Goppa codes owe their resilience to being binary subfield subcodes: the structure that
an algebraic attack would need lives over $\mathrm{GF}(2^m)$, and the public key only shows its
binary shadow. Chapter 14 covers the other road to small keys: codes with no algebraic decoder
at all, decoded probabilistically.

## 13.9 Classic McEliece in the world

*Level: expert.*

Classic McEliece (Bernstein, Chou, Lange, von Maurich, Misoczki, Niederhagen, Persichetti,
Peters, Schwabe, Sendrier, Szefer, Wang and others) is the conservative Niederreiter KEM with
binary Goppa codes.

| set | $m$ | $n$ | $t$ | public key | private key | ciphertext | category |
|---|---|---|---|---|---|---|---|
| mceliece348864 | 12 | 3,488 | 64 | 261,120 B | 6,492 B | 96 B | 1 |
| mceliece460896 | 13 | 4,608 | 96 | 524,160 B | 13,608 B | 156 B | 3 |
| mceliece6688128 | 13 | 6,688 | 128 | 1,044,992 B | 13,932 B | 208 B | 5 |
| mceliece6960119 | 13 | 6,960 | 119 | 1,047,319 B | 13,948 B | 194 B | 5 |
| mceliece8192128 | 13 | 8,192 | 128 | 1,357,824 B | 14,120 B | 208 B | 5 |

*Table 13.2. Classic McEliece parameter sets (round 4 submission, 2022). Public key and
ciphertext sizes follow from $m$, $n$ and $t$, as the code in §13.7 computes; private-key
sizes are from the submission.*

The shape is the opposite of ML-KEM's: a public key hundreds of times bigger (ML-KEM-768's is
1,184 bytes), a ciphertext several times smaller (1,088 bytes for ML-KEM-768). Key generation
is slow (it must find a systematic form of a large matrix), encapsulation and decapsulation
are fast.

**Where it fits.** Wherever a public key is sent once and used many times: long-term static
keys, VPN peers configured in advance, or devices that store a server's key at installation.
Rosenpass, a post-quantum key exchange that runs alongside WireGuard, uses Classic McEliece for
its static keys and ML-KEM for ephemeral ones, and Mullvad's VPN uses Classic McEliece in its
quantum-resistant tunnels. It does not fit TLS, where a fresh key would have to cross the
network in every handshake.

**Status.** NIST did not select Classic McEliece in March 2025, pointing to its ongoing
standardization at ISO (as an addition to ISO/IEC 18033-2); as of November 2026 that ISO work
had not been published as far as checked here. Germany's BSI recommends Classic McEliece, with
FrodoKEM, as a conservative choice alongside ML-KEM.

**Mars.** For Arcadia City's link to Earth, the key size matters once and the ciphertext size
matters forever. The ground station's Classic McEliece public key, about a megabyte, crosses the
link once and is stored in every habitat's control computer. After that, every session starts
with a 208-byte ciphertext, smaller than the ML-KEM-1024 ciphertext the city would otherwise
send, and its security rests on a problem that has resisted attack since before the first
Viking lander reached Mars.

## 13.10 Going deeper

*Level: expert.*

- **The specification.** *Classic McEliece: conservative code-based cryptography*, round 4
  submission (2022), with its "Guide for security reviewers" and the parameter rationale.
- **ISD.** Becker, Joux, May and Meurer, "Decoding Random Binary Linear Codes in 2^(n/20)"
  (EUROCRYPT 2012); Esser and Bellini's syndrome-decoding estimator for concrete costs.
- **Quantum ISD.** Bernstein, "Grover vs. McEliece" (PQCrypto 2010); Kachigar and Tillich on
  quantum ISD with representations (2017).
- **Implementation.** Chou, "McBits revisited" (CHES 2017), for constant-time Goppa decoding
  with additive FFTs; the round 4 submission's notes on side channels.
- **History.** Bernstein, Lange and Peters, "Attacking and defending the McEliece
  cryptosystem" (PQCrypto 2008), broke McEliece's original 1978 parameters ($n = 1024$, $t = 50$)
  in practice, about $2^{60}$ operations, while the scheme itself stood; they also proposed the
  larger parameters that Classic McEliece grew from.

## Check yourself

??? question "1. In the [7, 4] Hamming code example, the codeword 0110011 arrives with bit 2 flipped. What is the syndrome?"

    Column 2 of $H$, which is $010$: the binary for 2.

??? question "2. What does a Niederreiter ciphertext consist of, and how long is it for mceliece348864?"

    The syndrome $He$ of a weight-$t$ error vector: $mt = 12 \times 64 = 768$ bits, 96 bytes.

??? question "3. Why can a binary Goppa code with a squarefree g of degree t correct t errors, when it has only mt binary parity checks?"

    For squarefree $g$, the code defined by $g$ equals the code defined by $g^2$, which gives
    $2t$ syndromes over $\mathrm{GF}(2^m)$, enough for algebraic decoding of $t$ errors.

??? question "4. What does the Berlekamp-Massey algorithm find in the decoder?"

    The error-locator polynomial $\sigma(x) = \prod_{j \in E} (1 - \alpha_j x)$, as the shortest
    linear recurrence satisfied by the $2t$ syndromes.

??? question "5. In Prange's algorithm, what is the chance one guess succeeds?"

    That all $t$ errors fall in the $n - k$ chosen columns: $\binom{n-k}{t} / \binom{n}{t}$.

??? question "6. Why does a systematic public key H = [I | T] lose nothing compared with a scrambled one?"

    Any parity-check matrix of the code can be brought to that form by row operations, which
    anyone can do; publishing it reveals nothing new, and it saves space since $I$ need not
    be sent.

??? question "7. Name a code family that failed in McEliece, and why."

    Generalized Reed-Solomon codes: Sidelnikov and Shestakov (1992) recovered their structure
    from the public key in polynomial time. (Reed-Muller codes and several quasi-cyclic
    alternant codes also fell to structural attacks.)

??? question "8. Compare mceliece348864 and ML-KEM-768 on public key and ciphertext."

    Public key 261,120 bytes against 1,184; ciphertext 96 bytes against 1,088.

??? question "9. Where does Classic McEliece fit well, and where badly?"

    Well: static keys sent once and used many times (VPN peers, stored server keys). Badly:
    protocols that send a fresh public key in every handshake, such as TLS.

??? question "10. How does a quantum computer change the cost of information-set decoding?"

    Grover's algorithm speeds up the guessing, roughly halving its exponent; no exponential
    speed-up is known, and the parameter sets account for this.

## What you learned

- McEliece (1978) hides a message as errors in a codeword of a disguised code; Niederreiter
  (1986) sends only the syndrome.
- Binary Goppa codes decode $t$ errors with $2t$ syndromes from the $g^2$ trick and the
  Berlekamp-Massey algorithm.
- A working toy fits in about 120 lines; Prange's ISD breaks it in a few hundred guesses but
  needs about $2^{143}$ for the smallest real set.
- Codes with more visible structure (GRS, Reed-Muller, some quasi-cyclic codes) were broken;
  binary Goppa codes have held for fifty years.
- Classic McEliece has public keys of 261 kilobytes to 1.36 megabytes and ciphertexts of 96 to
  208 bytes; it suits static keys, not TLS.
- NIST did not select it in 2025; ISO standardization is under way, and BSI recommends it.

**Next:** [Chapter 14](14-HQC-and-BIKE.md), HQC and BIKE, code-based KEMs with small keys, one of which NIST chose.

## Further reading

- Robert J. McEliece, "A Public-Key Cryptosystem Based on Algebraic Coding Theory", JPL DSN
  Progress Report 42-44 (1978).
- Harald Niederreiter, "Knapsack-type cryptosystems and algebraic coding theory", *Problems of
  Control and Information Theory* 15 (1986).
- Elwyn Berlekamp, Robert McEliece and Henk van Tilborg, "On the inherent intractability of
  certain coding problems", *IEEE Transactions on Information Theory* 24 (1978).
- Eugene Prange, "The use of information sets in decoding cyclic codes", *IRE Transactions on
  Information Theory* 8 (1962).
- V. M. Sidelnikov and S. O. Shestakov, "On insecurity of cryptosystems based on generalized
  Reed-Solomon codes", *Discrete Mathematics and Applications* 2 (1992).
- Daniel J. Bernstein, Tanja Lange and Christiane Peters, "Attacking and defending the McEliece
  cryptosystem" (PQCrypto 2008).
- Anja Becker, Antoine Joux, Alexander May and Alexander Meurer, "Decoding Random Binary Linear
  Codes in 2^(n/20): How 1 + 1 = 0 Improves Information Set Decoding" (EUROCRYPT 2012).
- Daniel J. Bernstein and others, *Classic McEliece: conservative code-based cryptography*,
  round 4 submission (2022).
- NIST IR 8545, *Status Report on the Fourth Round of the NIST Post-Quantum Cryptography
  Standardization Process* (March 2025).
