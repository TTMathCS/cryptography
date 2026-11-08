# 2. Secret Sharing

*Some keys are too important for one person to hold and too important to lose.
This chapter shows how to split a key into pieces so that any $t$ of $n$ holders
can rebuild it and any smaller group learns nothing at all, not one bit, however
much computing power it has. You will split secrets by hand with additive
sharing and with Adi Shamir's polynomials over the field of 97 elements, meet
George Blakley's geometric version, catch a cheating dealer with Feldman's
public checks, refresh and repair shares without ever rebuilding the key, look
inside SLIP-39 wallet backups and the recovery plan of the DNS root key, and
then break careless implementations that reuse randomness, pick the wrong
polynomial or do arithmetic in the wrong place.*

!!! abstract "In this chapter"
    **You will learn:**

    - why copying a key or cutting it into pieces both fail, and what a
      threshold scheme promises instead;
    - additive and XOR sharing, where everyone is needed, and how to build any
      threshold out of them;
    - Shamir's scheme worked by hand over GF(97), and a counting proof that
      $t - 1$ shares say nothing;
    - Blakley's scheme of planes meeting at a point;
    - verifiable secret sharing (Feldman 1987, Pedersen 1991), which lets every
      holder check its own share and exposes a dealer who cheats;
    - proactive refresh and share repair, which keep a sharing healthy for years;
    - how SLIP-39 wallet backups and the DNS root key's recovery shares use all
      of this, and the quiet ways real deployments go wrong.

    **You need:** [Chapter 1](01-Computing-With-Secrets.md) (trust models),
    modular arithmetic and inverses from
    [book 1, Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md), the one-time pad
    from [book 1, Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md),
    and discrete logarithms from
    [book 1, Chapter 12](../../book/12-Diffie-Hellman.md) for §2.5 and §2.6.
    The interpolation mathematics, with proofs, is in
    [Mathematics, Chapter 11](../mathematics/11-Polynomials-at-Work.md); the
    one-section version of this chapter is
    [book 1, §23.2](../../book/23-Advanced-Protocols.md).

    **Levels:** §2.1 to §2.3 are for beginners, §2.4 to §2.11 are intermediate,
    §2.12 is expert.

## 2.1 The problem

*Level: beginner.*

A key that unlocks everything has two enemies. The first is loss: the laptop
that held it burns, the one administrator who knew it retires, the safe
deposit box is in a flooded basement. The second is misuse: whoever holds the
key can use it alone, at night, for reasons of their own, or under threat. The
obvious defenses work against one enemy and feed the other.

**Copies** defeat loss. Give the root key to five trusted people and it
survives the loss of four of them. But now any one of the five can misuse it,
and a thief has five targets instead of one. Every copy multiplies the risk of
theft.

**Cutting the key into pieces** seems to defeat misuse. Split a 128-bit key
into four 32-bit quarters and give one to each of four officers; nobody can use
it alone. But each quarter gives away a quarter of the key. Three officers who
collude are left with a 32-bit search, which a laptop finishes in seconds. And
if one officer loses a quarter, the key is gone for everyone.

The same mistake is common with cryptocurrency recovery phrases. A 24-word
BIP-39 phrase encodes 256 random bits plus an 8-bit checksum, 11 bits per word.
A popular piece of advice is to write it on three cards, each with 16 of the 24
words, so that any two cards hold all 24. One card alone is missing only 8
words: 88 bits, of which 8 are pinned down by the checksum, so about 80 bits
remain to guess. That is a lot of work today, but it is a far cry from 256 bits,
and each card gives away two thirds of the secret to whoever finds it.

What people want is stated easily:

- Choose a number of holders $n$ and a **threshold** $t$.
- Any $t$ holders together can rebuild the secret.
- Any $t - 1$ holders together learn **nothing** about it: every possible
  secret stays exactly as likely as it was before they met.

A scheme with these two properties is a **$(t, n)$ threshold secret sharing
scheme**. The person who splits the secret is the **dealer**, and each holder
receives a **share**. The second property is much stronger than "hard to
compute": it says the shares of a small group carry zero information, so no
amount of computing power, classical or quantum, can extract the secret from
them. Cryptographers call this **perfect** or **information-theoretic**
security, the same kind the one-time pad enjoys.

The idea was found twice in 1979. Adi Shamir, two years after co-inventing RSA
at MIT, published "How to Share a Secret" in the November issue of
*Communications of the ACM*: two pages, built on the fact that $t$ points fix a
polynomial of degree $t - 1$. Earlier that year George Blakley, a
mathematician at Texas A&M, presented "Safeguarding Cryptographic Keys" at the
National Computer Conference, with geometry: the secret is a point, and each
share is a plane through it. Both were answering the same worry: keys that
must survive lost copies and disloyal insiders.

Today the idea guards the root key of the domain name system, corporate secret
stores and the paper backups of hardware wallets. It is also the foundation of
much of this book: threshold signatures ([Chapter 4](04-Threshold-Cryptography.md)), secure
multi-party computation (Chapter 10)
and electronic voting (Chapter 16) all start by
secret-sharing something. Figure 2.1 shows the main steps.

<figure class="mars-fig">
<svg viewBox="0 0 640 400" width="640" role="img" aria-label="Timeline of secret sharing from Shamir and Blakley in 1979 to Ledger Recover in 2023" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="392" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="29" text-anchor="end" font-weight="bold">1979</text>
<circle cx="92" cy="24" r="4.5"/>
<text x="108" y="29">Shamir (polynomials) and Blakley (planes)</text>
<text x="78" y="57" text-anchor="end" font-weight="bold">1981</text>
<circle cx="92" cy="52" r="3.5"/>
<text x="108" y="57">McEliece and Sarwate: shares are a Reed-Solomon code</text>
<text x="78" y="85" text-anchor="end" font-weight="bold">1985</text>
<circle cx="92" cy="80" r="3.5"/>
<text x="108" y="85">Chor, Goldwasser, Micali, Awerbuch define VSS</text>
<text x="78" y="113" text-anchor="end" font-weight="bold">1987</text>
<circle cx="92" cy="108" r="4.5"/>
<text x="108" y="113">Feldman's public checks; any access structure (Ito et al.)</text>
<text x="78" y="141" text-anchor="end" font-weight="bold">1988</text>
<circle cx="92" cy="136" r="3.5"/>
<text x="108" y="141">Tompa and Woll: cheaters at reconstruction</text>
<text x="78" y="169" text-anchor="end" font-weight="bold">1991</text>
<circle cx="92" cy="164" r="4.5"/>
<text x="108" y="169">Pedersen's hiding VSS; Ostrovsky-Yung mobile attacker</text>
<text x="78" y="197" text-anchor="end" font-weight="bold">1995</text>
<circle cx="92" cy="192" r="3.5"/>
<text x="108" y="197">Herzberg et al.: proactive refresh of shares</text>
<text x="78" y="225" text-anchor="end" font-weight="bold">2010</text>
<circle cx="92" cy="220" r="4.5"/>
<text x="108" y="225">DNS root signed; seven recovery share holders</text>
<text x="78" y="253" text-anchor="end" font-weight="bold">2017</text>
<circle cx="92" cy="248" r="3.5"/>
<text x="108" y="253">SLIP-39 drafted by SatoshiLabs</text>
<text x="78" y="281" text-anchor="end" font-weight="bold">2019</text>
<circle cx="92" cy="276" r="3.5"/>
<text x="108" y="281">Trezor ships Shamir backups of wallet seeds</text>
<text x="78" y="309" text-anchor="end" font-weight="bold">2021</text>
<circle cx="92" cy="304" r="4.5" opacity="0.6"/>
<text x="108" y="309" opacity="0.8">Trail of Bits: share at x = 0 mod q in tss-lib</text>
<text x="78" y="337" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="332" r="4.5" opacity="0.6"/>
<text x="108" y="337" opacity="0.8">Ledger Recover: who runs the splitting code?</text>
<text x="108" y="375" font-size="13" opacity="0.8">Faded marks are failures; none of them broke the mathematics.</text>
</svg>
<figcaption>Figure 2.1. Secret sharing from 1979 to today. The mathematics has not changed since Shamir's two pages; the work since then has been about cheaters, time and the machines that run the code.</figcaption>
</figure>

**A word on what is shared.** Secret sharing protects a secret at rest. To use
the key, $t$ holders bring their shares to one place, and at that moment the
whole secret exists again on one machine. Where a key is *used* often, the
holders should compute with their shares and never rebuild it: that is
threshold cryptography, [Chapter 4](04-Threshold-Cryptography.md), built on the
sharing of this chapter.

## 2.2 Everyone needed: additive and XOR sharing

*Level: beginner.*

Start with the strictest threshold: all $n$ holders must agree, so $t = n$.
There is a scheme for this that fits on one line.

### By hand

Work modulo the prime 97, so the secret $s$ is a number from 0 to 96. To share
$s = 42$ among three holders, pick two random numbers, say 23 and 71, and give
the third holder whatever makes the sum come out right:

$$
s_3 = s - s_1 - s_2 = 42 - 23 - 71 = -52 \equiv 45 \pmod{97}.
$$

The shares are 23, 71 and 45. All three together add up to
$23 + 71 + 45 = 139 \equiv 42$. Any two of them, say 23 and 45, are two numbers
that could equally well be shares of any secret: for each candidate $s'$ there
is exactly one third share, $s' - 23 - 45$, that would make the sum $s'$, and
that third share was as likely as any other because $s_1$ and $s_2$ were chosen
uniformly. The missing share acts like a one-time pad on the secret
([book 1, Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)).

In general, an **additive sharing** of $s$ modulo $m$ among $n$ holders is
$n - 1$ uniform random numbers $s_1, \dots, s_{n-1}$ together with

$$
s_n = s - (s_1 + \cdots + s_{n-1}) \bmod m .
$$

**Why it is secure.** Look at any $n - 1$ of the shares. If $s_n$ is missing,
the others are uniform by construction. If some $s_i$ with $i < n$ is missing,
then $s_n = s - s_i - (\text{the rest})$ is uniform too, because $s_i$ is
uniform and unseen. Either way the visible shares are uniform random numbers,
whatever the secret was.

**XOR sharing** is the same idea with bit strings, where addition is XOR. To
split a 16-byte key, draw 16 random bytes as share 1 and set share 2 to the key
XOR share 1. Two shares give back the key; one share is a uniformly random
string. For three or more holders, draw $n - 1$ random strings and XOR them all
into the key to make the last.

### Code it

```python
import secrets

def xor_bytes(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

def xor_split(secret, n):                     # all n shares are needed
    shares = [secrets.token_bytes(len(secret)) for _ in range(n - 1)]
    last = secret
    for sh in shares:
        last = xor_bytes(last, sh)
    return shares + [last]

def xor_join(shares):
    out = shares[0]
    for sh in shares[1:]:
        out = xor_bytes(out, sh)
    return out

def add_split(secret, n, m):                  # the same idea modulo m
    shares = [secrets.randbelow(m) for _ in range(n - 1)]
    return shares + [(secret - sum(shares)) % m]

key = bytes.fromhex("00112233445566778899aabbccddeeff")
parts = xor_split(key, 3)
print(xor_join(parts) == key)                 # True
print(xor_join(parts[:2]) == key)             # False: two of three is a random string
sh = add_split(42, 3, 97)
print(sum(sh) % 97)                           # 42
```

Output:

```
True
False
42
```

The `secrets` module draws from the operating system's secure generator. Use it
(or `os.urandom`) for every random number in a real sharing; the `random`
module, which appears later in this chapter when output must be repeatable, is
for demonstrations only.

### Linearity: computing on shares

Additive shares have a property that matters far more than their simplicity.
If holder $i$ has $a_i$, a share of $a$, and $b_i$, a share of $b$, then $a_i +
b_i$ is a share of $a + b$: just add up the sums. Multiplying every share by a
public constant $c$ gives shares of $ca$. So the holders can compute any linear
function of shared secrets, each working only on its own shares, without
talking to each other and without anyone seeing $a$ or $b$. Multiplying two
shared secrets needs interaction, the subject of
Chapter 10. Linearity is also
behind secure aggregation (Chapter 19) and the
refresh trick of §2.7.

### Any threshold from additive pieces

Additive sharing only does "everyone". Can it do 2 of 3? Yes, with a trick
called **replicated secret sharing** (Mitsuru Ito, Akira Saito and Takao
Nishizeki, 1987). Split $s$ additively into three pieces $r_1 + r_2 + r_3$.
Give each holder every piece except one:

| Holder | Receives | Missing |
|---|---|---|
| A | $r_2, r_3$ | $r_1$ |
| B | $r_1, r_3$ | $r_2$ |
| C | $r_1, r_2$ | $r_3$ |

Any two holders between them have all three pieces and add them up. One holder
is missing a piece, which acts as a one-time pad, so it learns nothing.

The general rule: make one additive piece for every group of $t - 1$ holders
that must learn nothing, and give each piece to everyone *outside* that group.
Then each such group misses exactly its own piece, and any $t$ holders together
hold every piece. Figure 2.2 draws the 2-of-3 case.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Replicated sharing: the secret is split into three additive pieces and each of three holders gets two of them" fill="currentColor" font-size="14">
<rect x="250" y="12" width="140" height="38" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="36" text-anchor="middle" font-weight="bold">s = r1 + r2 + r3</text>
<rect x="60" y="100" width="100" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="110" y="122" text-anchor="middle">r1</text>
<rect x="270" y="100" width="100" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="122" text-anchor="middle">r2</text>
<rect x="480" y="100" width="100" height="34" rx="5" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="530" y="122" text-anchor="middle">r3</text>
<line x1="290" y1="50" x2="130" y2="100" stroke="currentColor" stroke-width="1.1"/>
<line x1="320" y1="50" x2="320" y2="100" stroke="currentColor" stroke-width="1.1"/>
<line x1="350" y1="50" x2="510" y2="100" stroke="currentColor" stroke-width="1.1"/>
<rect x="60" y="190" width="140" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="210" text-anchor="middle" font-weight="bold">holder A</text>
<text x="130" y="227" text-anchor="middle" font-size="13">r2, r3</text>
<rect x="250" y="190" width="140" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="210" text-anchor="middle" font-weight="bold">holder B</text>
<text x="320" y="227" text-anchor="middle" font-size="13">r1, r3</text>
<rect x="440" y="190" width="140" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="210" text-anchor="middle" font-weight="bold">holder C</text>
<text x="510" y="227" text-anchor="middle" font-size="13">r1, r2</text>
<g stroke="currentColor" stroke-width="1" opacity="0.6">
<line x1="110" y1="134" x2="300" y2="190"/><line x1="110" y1="134" x2="490" y2="190"/>
<line x1="320" y1="134" x2="150" y2="190"/><line x1="320" y1="134" x2="520" y2="190"/>
<line x1="530" y1="134" x2="160" y2="190"/><line x1="530" y1="134" x2="340" y2="190"/>
</g>
</svg>
<figcaption>Figure 2.2. Replicated 2-of-3 sharing. Each piece goes to everyone except one holder, so any two holders have all three pieces and a single holder is always missing one.</figcaption>
</figure>

The catch is size. The number of groups of $t - 1$ out of $n$ is
$\binom{n}{t-1}$, and each holder stores $\binom{n-1}{t-1}$ pieces. For 2 of 3
that is 2 pieces each, fine. For the Mars example of §2.10, 4 of 6, it is
$\binom{6}{3} = 20$ pieces with 10 per holder. For 11 of 21 it is 352,716
pieces, 184,756 for each holder. Replicated sharing is used only for small
groups, typically three servers in multi-party computation. For anything
larger we need shares as small as the secret whatever $t$ and $n$ are. That is
Shamir's scheme.

## 2.3 Shamir's scheme by hand over GF(97)

*Level: beginner.*

Two points fix a line. Three points fix a parabola. In general, $t$ points with
different $x$-coordinates fix exactly one polynomial of degree at most $t - 1$,
and fewer points leave it completely free. Shamir's idea is to hide the secret
as the value of a random polynomial at $x = 0$ and to hand out other points on
it as shares.

Everything happens in a finite field, so that division works and no share
grows. Here the field is GF(97): the numbers 0 to 96 with addition and
multiplication modulo the prime 97 (§2.11 shows what goes wrong modulo 256).
That $t$ points determine a unique polynomial of degree below $t$, and that
Lagrange's formula finds it, is proved in
[Mathematics, §11.2](../mathematics/11-Polynomials-at-Work.md); here we use it.

### Split: 3 of 5, secret 42

The secret is $s = 42$, the threshold is $t = 3$ and there are $n = 5$ holders.
A threshold of 3 needs a polynomial of degree 2, which has three coefficients.
The constant term is the secret; the other two are chosen at random. Say the
dealer draws 17 and 5:

$$
f(x) = 42 + 17x + 5x^2 \pmod{97}.
$$

Holder $i$ receives the point $(i, f(i))$:

| Holder | Calculation | Share |
|---|---|---|
| 1 | $42 + 17 + 5 = 64$ | (1, 64) |
| 2 | $42 + 34 + 20 = 96$ | (2, 96) |
| 3 | $42 + 51 + 45 = 138 \equiv 41$ | (3, 41) |
| 4 | $42 + 68 + 80 = 190 \equiv 93$ | (4, 93) |
| 5 | $42 + 85 + 125 = 252 \equiv 58$ | (5, 58) |

Then the dealer forgets $f$. Each share is a single number below 97, the same
size as the secret, plus the holder's public index.

### Rebuild: holders 1, 3 and 5

Holders 1, 3 and 5 meet with (1, 64), (3, 41) and (5, 58). They do not need to
find the whole polynomial, only its value at 0. Lagrange's formula gives it
directly as a weighted sum of their shares:

$$
s = f(0) = \lambda_1 y_1 + \lambda_3 y_3 + \lambda_5 y_5,
\qquad
\lambda_i = \prod_{j \ne i} \frac{0 - x_j}{x_i - x_j} = \prod_{j \ne i} \frac{x_j}{x_j - x_i}.
$$

The weights depend only on *which* holders are present, never on their shares,
so they can be worked out before anyone opens an envelope:

$$
\begin{aligned}
\lambda_1 &= \frac{3}{3-1}\cdot\frac{5}{5-1} = \frac{15}{8}, \\
\lambda_3 &= \frac{1}{1-3}\cdot\frac{5}{5-3} = \frac{5}{-4}, \\
\lambda_5 &= \frac{1}{1-5}\cdot\frac{3}{3-5} = \frac{3}{8}.
\end{aligned}
$$

Division means multiplying by an inverse modulo 97. Euclid's algorithm finds
them in one step each: $97 = 12 \cdot 8 + 1$, so $1 = 97 - 12 \cdot 8$ and
$8^{-1} \equiv -12 \equiv 85$; and $97 = 24 \cdot 4 + 1$, so $4^{-1} \equiv -24
\equiv 73$ and $(-4)^{-1} \equiv 24$. Then

$$
\begin{aligned}
\lambda_1 &= 15 \cdot 85 = 1275 \equiv 14, \\
\lambda_3 &= 5 \cdot 24 = 120 \equiv 23, \\
\lambda_5 &= 3 \cdot 85 = 255 \equiv 61 \pmod{97}.
\end{aligned}
$$

A quick check: the weights always add up to 1 (interpolate the constant
polynomial 1), and indeed $14 + 23 + 61 = 98 \equiv 1$. Now the secret:

$$
\begin{aligned}
s &= 14 \cdot 64 + 23 \cdot 41 + 61 \cdot 58 \\
  &= 896 + 943 + 3538 = 5377 = 55 \cdot 97 + 42 \equiv 42 .
\end{aligned}
$$

Any other three holders get 42 the same way with their own weights. That is
the whole scheme: the dealer evaluates a polynomial, the holders interpolate.

**Why it is correct.** The three shares are three points on $f$, a polynomial
of degree 2. Lagrange's formula builds the unique polynomial of degree at most
2 through those three points; since $f$ is such a polynomial, the formula
builds $f$ itself, and its value at 0 is $f(0) = s$.

### Two shares say nothing: count them

Now the other half of the promise. Holders 1 and 3 know (1, 64) and (3, 41).
Pick any candidate secret $s'$. The three points $(0, s')$, (1, 64) and (3, 41)
have different $x$-coordinates, so exactly one polynomial of degree at most 2
passes through all three: for every possible secret there is exactly one
choice of the two random coefficients that would have produced these shares.
The coefficients were uniform, so every secret stays exactly as likely as
before. This is the theorem proved in
[Mathematics, §11.3](../mathematics/11-Polynomials-at-Work.md); in GF(97) we can
also simply count, by trying every polynomial there is.

```python
# Two shares of a 3-of-n sharing over GF(97): which secrets are still possible?
P = 97
seen = [(1, 64), (3, 41)]                    # the shares of holders 1 and 3
count = [0] * P                              # count[s] = polynomials through both shares with f(0) = s
for s in range(P):
    for a1 in range(P):
        for a2 in range(P):
            if all((s + a1 * x + a2 * x * x) % P == y for x, y in seen):
                count[s] += 1
print(min(count), max(count), sum(count))
seen.append((5, 58))                         # a third share
alive = [s for s in range(P)
         for a1 in range(P) for a2 in range(P)
         if all((s + a1 * x + a2 * x * x) % P == y for x, y in seen)]
print(alive)
```

Output:

```
1 1 97
[42]
```

Of the $97^3 = 912{,}673$ polynomials of degree at most 2, exactly 97 pass
through both shares, one for each secret from 0 to 96. Add the third share and
only one polynomial survives, the one with $f(0) = 42$. Two shares give zero
information, three give everything, whatever the field size.

### Code it

```python
import secrets
from itertools import combinations

P = 97                                       # the field GF(97); real systems use 128 to 256 bits

def evaluate(coeffs, x):                     # Horner's rule: a0 + a1 x + a2 x^2 + ... mod P
    y = 0
    for c in reversed(coeffs):
        y = (y * x + c) % P
    return y

def split(secret, t, n, coeffs=None):
    if coeffs is None:                       # t - 1 fresh random coefficients
        coeffs = [secrets.randbelow(P) for _ in range(t - 1)]
    poly = [secret] + coeffs
    return [(x, evaluate(poly, x)) for x in range(1, n + 1)]

def weights(xs, at=0):                       # Lagrange weights for evaluating at x = at
    lam = []
    for i in xs:
        num = den = 1
        for j in xs:
            if j != i:
                num = num * (at - j) % P
                den = den * (i - j) % P
        lam.append(num * pow(den, -1, P) % P)
    return lam

def rebuild(shares, at=0):
    xs = [x for x, _ in shares]
    return sum(l * y for l, (_, y) in zip(weights(xs, at), shares)) % P

shares = split(42, 3, 5, coeffs=[17, 5])     # the worked example: f(x) = 42 + 17x + 5x^2
print(shares)
print(weights([1, 3, 5]))
print(rebuild([shares[0], shares[2], shares[4]]))
print(all(rebuild(list(c)) == 42 for c in combinations(shares, 3)))
fresh = split(42, 3, 5)                      # a new random polynomial, same secret
print(all(rebuild(list(c)) == 42 for c in combinations(fresh, 3)))
```

Output:

```
[(1, 64), (2, 96), (3, 41), (4, 93), (5, 58)]
[14, 23, 61]
42
True
True
```

The shares and weights match the hand calculation, and all ten groups of three
rebuild 42, both for the worked polynomial and for a fresh random one. The
function `rebuild` takes an optional point `at`, because evaluating at a point
other than 0 is exactly how a lost share is recomputed (§2.7). Python's
`pow(den, -1, P)` computes a modular inverse and needs Python 3.8 or later.

### The rules around the formula

The scheme itself is two lines of algebra. The rules that make it safe are
where implementations differ, and most of §2.11 is about breaking one of them.

- **The field must have more than $n$ elements,** so that each holder gets a
  distinct nonzero $x$. GF(97) allows at most 96 holders.
- **No share at $x = 0$, ever,** and that means $x \not\equiv 0$ modulo the
  field size, not just $x \ne 0$ as an integer. The value at 0 *is* the secret.
- **All $x$-coordinates distinct.** Two shares at the same $x$ are one share.
- **Fresh, uniform, secret coefficients for every sharing,** from a secure
  generator, and exactly $t - 1$ of them. Each rule has a matching break.
- **The secret must be an element of the field.** A 256-bit key does not fit in
  GF(97). Real implementations either use a prime larger than the secret (such
  as $2^{127} - 1$ or a 256-bit prime) or share a byte string one byte at a time
  over GF($2^8$), the field AES uses, with the same $x$-coordinates for every
  byte. HashiCorp Vault and SLIP-39 (§2.8) do the latter: each share is as long
  as the secret, plus a small header.

Shamir's scheme is as efficient as a perfect scheme can be: Ehud Karnin,
Jonathan Greene and Martin Hellman proved in 1983 that each share of a perfect
scheme is at least as large as the secret. It is **linear**: if $f$ shares $a$
and $g$ shares $b$, each holder adds its two shares to get a share of $a + b$.
New holders can be added at any time with a share $(6, f(6))$. And a list of
shares is a **Reed-Solomon codeword** (Robert McEliece and Dilip Sarwate,
1981), so with $m$ shares up to $\lfloor (m - t)/2 \rfloor$ false ones can be
found and ignored ([Mathematics, §11.5](../mathematics/11-Polynomials-at-Work.md)).

!!! note "Life story: Shamir secret sharing"
    **Born:** November 1979, Adi Shamir at MIT, "How to Share a Secret",
    *Communications of the ACM* · **Purpose:** split a secret so that any $t$ of
    $n$ holders can rebuild it and $t - 1$ learn nothing, with shares no larger
    than the secret · **Helped:** the DNS root key's backup, Vault unseal keys,
    SLIP-39 wallet backups, hardware security module card sets, and as the
    common base of threshold signatures, multi-party computation and voting ·
    **Status:** current and unbroken; its security needs no assumption at all,
    so quantum computers do not touch it

## 2.4 Blakley's planes

*Level: intermediate.*

George Blakley's 1979 scheme reaches the same goal with geometry. In two
dimensions the secret is a point and each share is a line through it: one line
says nothing about where on it the secret lies, and two lines meet in exactly
one point. For a threshold of three, use planes in three dimensions: two meet
in a line, three in a point. In general each share is a hyperplane through a
point in $t$ dimensions.

### By hand: 2 of 3 over GF(97)

Put the secret in the first coordinate of the point $(42, 30)$; the second
coordinate, 30, is random. Each share is a line $a x + b y = d$ through the
point, with $a$ and $b$ chosen at random and $d$ computed:

| Holder | Line | $d$ |
|---|---|---|
| 1 | $3x + y = d_1$ | $3 \cdot 42 + 30 = 156 \equiv 59$ |
| 2 | $5x + y = d_2$ | $5 \cdot 42 + 30 = 240 \equiv 46$ |
| 3 | $7x + 2y = d_3$ | $7 \cdot 42 + 60 = 354 \equiv 63$ |

Holders 1 and 2 meet. Subtract the first line from the second: $2x = 46 - 59 =
-13 \equiv 84$, so $x = 42$. Back in the first line, $y = 59 - 3 \cdot 42 =
-67 \equiv 30$. The secret is the first coordinate, 42.

Holder 1 alone knows $3x + y = 59$. For every value of $x$ from 0 to 96 there
is exactly one $y$ on that line, namely $y = 59 - 3x$, so every secret is still
possible and, since the hidden coordinate was random, equally likely.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Three lines through one point: each line is a share, any two meet at the secret point" fill="currentColor" font-size="14">
<line x1="60" y1="270" x2="400" y2="270" stroke="currentColor" stroke-width="1.2"/>
<line x1="60" y1="270" x2="60" y2="20" stroke="currentColor" stroke-width="1.2"/>
<text x="400" y="290" text-anchor="end" font-size="13">x (the secret coordinate)</text>
<text x="66" y="30" font-size="13">y (random)</text>
<line x1="90" y1="40" x2="330" y2="250" stroke="currentColor" stroke-width="1.6"/>
<line x1="70" y1="215" x2="390" y2="85" stroke="currentColor" stroke-width="1.6"/>
<line x1="230" y1="25" x2="190" y2="260" stroke="currentColor" stroke-width="1.6"/>
<circle cx="210" cy="145" r="7"/>
<line x1="210" y1="152" x2="210" y2="270" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<text x="210" y="288" text-anchor="middle" font-size="13">s</text>
<text x="334" y="246">share 1</text>
<text x="394" y="88">share 2</text>
<text x="236" y="32">share 3</text>
<text x="430" y="150">any two lines meet</text>
<text x="430" y="170">at the secret point;</text>
<text x="430" y="200">one line passes over</text>
<text x="430" y="220">every possible x</text>
</svg>
<figcaption>Figure 2.3. Blakley's 2-of-3 scheme, drawn over the real numbers. Each share is a line through the secret point; two shares meet there, while a single line passes above every possible value of the secret coordinate.</figcaption>
</figure>

### Code it

The rebuild step is solving a system of $t$ linear equations in $t$ unknowns,
done here by Gauss-Jordan elimination modulo 97.

```python
import random

P = 97
random.seed(1979)                            # repeatable demo; use secrets for real shares

def solve(rows):                             # Gauss-Jordan elimination mod P; rows are [a, b, c, d]
    rows = [r[:] for r in rows]
    n = len(rows)
    for col in range(n):
        piv = next(r for r in range(col, n) if rows[r][col] % P)
        rows[col], rows[piv] = rows[piv], rows[col]
        inv = pow(rows[col][col], -1, P)
        rows[col] = [v * inv % P for v in rows[col]]
        for r in range(n):
            if r != col and rows[r][col]:
                f = rows[r][col]
                rows[r] = [(v - f * w) % P for v, w in zip(rows[r], rows[col])]
    return [r[-1] for r in rows]

def blakley_split(secret, t, n):
    point = [secret] + [random.randrange(P) for _ in range(t - 1)]
    shares = []
    for _ in range(n):                       # a random hyperplane through the point
        a = [random.randrange(1, P) for _ in range(t)]
        shares.append(a + [sum(x * y for x, y in zip(a, point)) % P])
    return shares

print(solve([[3, 1, 59], [5, 1, 46]]))       # the 2-D example by hand: [42, 30]
print(solve([[3, 1, 59], [7, 2, 63]]))       # another pair of lines, same point
shares = blakley_split(42, 3, 5)
print(shares[0])
print(solve(shares[:3])[0], solve(shares[2:])[0])
# Two planes alone: which first coordinates are still possible?
(a1, b1, c1, d1), (a2, b2, c2, d2) = shares[:2]
possible = {x for x in range(P) for y in range(P) for z in range(P)
            if (a1*x + b1*y + c1*z - d1) % P == 0 and (a2*x + b2*y + c2*z - d2) % P == 0}
print(len(possible))
```

Output:

```
[42, 30]
[42, 30]
[20, 3, 94, 90]
42 42
97
```

In three dimensions, holder 1's share is the plane $20x + 3y + 94z = 90$. Any
three planes rebuild 42, and two planes together still allow all 97 values of
the secret coordinate: they meet in a line, and the line runs across every
value of $x$.

### Why Shamir won

Blakley's scheme works, but it lost to Shamir's for three plain reasons.

- **Shares are $t$ times bigger.** A Blakley share is a whole hyperplane: $t$
  coefficients and a right-hand side, against Shamir's single number.
- **Not every set of planes works.** The dealer must make sure that every $t$
  of the $n$ hyperplanes are independent, and that no $t - 1$ of them meet in
  a line along which the secret coordinate never changes; otherwise some
  groups cannot rebuild, or a small group reads the secret off its line. Random planes
  almost always behave over a large field, and the demo above relies on that;
  a careful dealer checks. In Shamir's scheme any distinct nonzero
  $x$-coordinates are automatically fine.
- **Shamir's arithmetic is the arithmetic of the rest of cryptography.**
  Polynomials over fields connect directly to Reed-Solomon codes, to discrete
  logarithm commitments (§2.5) and to threshold signatures.

The two are closer than they look. A Shamir share $(i, f(i))$ is the linear
equation $a_0 + a_1 i + a_2 i^2 = f(i)$ in the unknown coefficients: a
hyperplane in the space of polynomials, with the special coefficient vector
$(1, i, i^2)$. Shamir's scheme is a Blakley scheme whose planes are chosen so
cleverly that they are always independent (the Vandermonde matrix of distinct
points is invertible) and so compactly that the holder only needs to store the
right-hand side. Both are **linear secret sharing schemes**, the family studied
in §2.12.

!!! note "Life story: Blakley's geometric scheme"
    **Born:** 1979, George Blakley at Texas A&M University, "Safeguarding
    Cryptographic Keys", presented at the AFIPS National Computer Conference,
    independently of Shamir ·
    **Purpose:** keep a key safe from both loss and betrayal by hiding it as a
    point where hyperplanes meet · **Helped:** the theory of threshold and
    ramp schemes (Blakley and Meadows, 1984) · **Status:** correct but rarely
    deployed; shares are $t$ times larger than Shamir's

## 2.5 Catching a cheating dealer: Feldman's checks

*Level: intermediate.*

Everything so far trusted the dealer. Plain Shamir gives each holder a number
and no way to tell whether that number is a point on the same polynomial as
everyone else's. A dealer who is careless, compromised or dishonest can hand out
shares that do not fit together. Nothing looks wrong until the day the shares
are needed, possibly years later, and then different groups of holders rebuild
different "secrets", or none of them rebuilds the right one. The same holds for
the holders: at reconstruction, any of them can hand in a false number.

Benny Chor, Shafi Goldwasser, Silvio Micali and
Baruch Awerbuch named the fix in 1985: **verifiable secret sharing** (VSS), in
which every holder can check that its share is consistent with one
well-defined secret, without learning that secret. Their protocol needed
several rounds of interaction. In 1987 Paul Feldman, then a graduate student
at MIT, found a non-interactive one that is still the most widely used.

### The idea

Work in a group where discrete logarithms are hard: a subgroup of prime order
$q$ of the integers modulo a prime $p$, with generator $g$. Shamir's
polynomial now lives over GF($q$), the integers modulo the group order. The
dealer publishes, alongside the private shares, a **commitment** to each
coefficient:

$$
C_k = g^{a_k} \bmod p, \qquad k = 0, 1, \dots, t - 1,
$$

where $a_0 = s$ is the secret. Because $g$ has order $q$, exponents can be
reduced modulo $q$, and so $g$ turns a polynomial over GF($q$) into a product.
Holder $i$, with share $y_i = f(i)$, checks

$$
g^{y_i} \stackrel{?}{=} \prod_{k=0}^{t-1} C_k^{\,i^k} \pmod p .
$$

**Why it is correct.** The right-hand side is $\prod_k g^{a_k i^k} = g^{\sum_k
a_k i^k} = g^{f(i)}$, which equals the left-hand side exactly when $y_i = f(i)
\bmod q$. Since the commitments fix the coefficients (each $C_k$ determines
$a_k$ modulo $q$, even if nobody can compute it), they fix one polynomial $f$
of degree at most $t - 1$; every share that passes the check is a point on that
$f$, so every group of $t$ holders who pass rebuilds the same $f(0)$. The
number of commitments matters too: exactly $t$ of them, so a dealer cannot
slip in a polynomial of higher degree.

### By hand in a group of order 97

To keep the polynomial of §2.3, the group order must be $q = 97$. The prime
$p = 4 \cdot 97 + 1 = 389$ works: the integers modulo 389 under multiplication
form a group of 388 elements, and 97 divides 388, so there is a subgroup of
order 97. Raising any element to the power $388/97 = 4$ lands in it; $2^4 = 16
\ne 1$, so $g = 16$ generates it. (Real systems use a 256-bit elliptic curve
group, [book 1, Chapter 15](../../book/15-Elliptic-Curves.md), or a prime $p$
of 2048 bits or more.)

The dealer shares $f(x) = 42 + 17x + 5x^2$ as before and publishes

$$
\begin{aligned}
C_0 &= 16^{42} \equiv 25, \qquad C_1 = 16^{17} \equiv 370, \\
C_2 &= 16^{5} \equiv 221 \pmod{389}.
\end{aligned}
$$

Holder 3 received $y_3 = 41$. It computes the left side, $16^{41} \equiv 269$,
and the right side, $C_0 \cdot C_1^{3} \cdot C_2^{9}$, since $3^0 = 1$, $3^1 =
3$ and $3^2 = 9$:

$$
\begin{aligned}
C_1^{3} &= 370^3 \equiv 143, \qquad C_2^{9} = 221^9 \equiv 93, \\
25 \cdot 143 &= 3575 \equiv 74, \qquad 74 \cdot 93 = 6882 \equiv 269 \pmod{389}.
\end{aligned}
$$

Both sides are 269: the share is good. Had the dealer given holder 3 the value
40 instead, the left side would be $16^{40}$, a different element (16 has order
97, so $16^{40} \ne 16^{41}$), and the check would fail.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Feldman verifiable secret sharing: the dealer posts commitments publicly, sends shares privately, each holder checks its share against the commitments and complains if the check fails" fill="currentColor" font-size="14">
<rect x="20" y="130" width="120" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="80" y="152" text-anchor="middle" font-weight="bold">dealer</text>
<text x="80" y="170" text-anchor="middle" font-size="12">f(x), secret f(0)</text>
<rect x="210" y="14" width="250" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 3"/>
<text x="335" y="36" text-anchor="middle" font-weight="bold">public board</text>
<text x="335" y="56" text-anchor="middle" font-size="13">C0 = g^a0, C1 = g^a1, C2 = g^a2</text>
<line x1="110" y1="130" x2="210" y2="58" stroke="currentColor" stroke-width="1.3"/>
<polygon points="210,58 200,60 205,67"/>
<text x="120" y="88" font-size="12">1. broadcast</text>
<g stroke="currentColor" stroke-width="1.3">
<line x1="140" y1="150" x2="420" y2="110"/><line x1="140" y1="155" x2="420" y2="160"/><line x1="140" y1="162" x2="420" y2="210"/><line x1="140" y1="170" x2="420" y2="260"/>
</g>
<polygon points="420,110 410,108 412,116"/><polygon points="420,160 410,156 410,164"/><polygon points="420,210 410,204 409,212"/><polygon points="420,260 411,253 408,260"/>
<text x="150" y="288" font-size="12">2. private channels: share f(i)</text>
<rect x="420" y="92" width="130" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="485" y="112" text-anchor="middle" font-size="13">holder 1: ok</text>
<rect x="420" y="145" width="130" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="485" y="165" text-anchor="middle" font-size="13">holder 2: ok</text>
<rect x="420" y="195" width="130" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="485" y="215" text-anchor="middle" font-size="13">holder 3: ok</text>
<rect x="420" y="245" width="130" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="485" y="265" text-anchor="middle" font-size="13" font-weight="bold">holder 4: FAIL</text>
<line x1="560" y1="250" x2="560" y2="60" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3"/>
<line x1="560" y1="60" x2="462" y2="45" stroke="currentColor" stroke-width="1.3" stroke-dasharray="4 3"/>
<polygon points="462,45 471,41 470,50"/>
<text x="552" y="86" font-size="12" text-anchor="end">3. complaint</text>
<text x="20" y="310" font-size="13">Each holder checks g^f(i) = C0 · C1^i · C2^(i·i). The dealer must answer a complaint</text>
<text x="20" y="326" font-size="13">by posting the share in public; a bad answer or too many complaints disqualifies it.</text>
</svg>
<figcaption>Figure 2.4. Feldman's verifiable secret sharing. The commitments are public, the shares private; every holder can check its own share, and a complaint forces the dealer to show the disputed share to everyone.</figcaption>
</figure>

### Code it: a cheating dealer caught

```python
p, q, g = 389, 97, 16                        # g has prime order q = 97 in Z_389*; real groups are 256-bit

def evaluate(coeffs, x):
    return sum(c * pow(x, k, q) for k, c in enumerate(coeffs)) % q

def commit(coeffs):                          # the dealer's public broadcast: g^(a_k) for each coefficient
    return [pow(g, a, p) for a in coeffs]

def verify(x, y, C):                         # holder x checks g^y == product of C_k^(x^k)
    rhs = 1
    for k, c in enumerate(C):
        rhs = rhs * pow(c, pow(x, k), p) % p
    return pow(g, y, p) == rhs

def rebuild(shares):
    s = 0
    for xi, yi in shares:
        num = den = 1
        for xj, _ in shares:
            if xj != xi:
                num, den = num * xj % q, den * (xj - xi) % q
        s = (s + yi * num * pow(den, -1, q)) % q
    return s

coeffs = [42, 17, 5]                         # secret 42, the same polynomial as in section 2.3
C = commit(coeffs)
shares = [(x, evaluate(coeffs, x)) for x in range(1, 6)]
print("commitments", C)
print("honest:", [verify(x, y, C) for x, y in shares])

# A cheating dealer gives holder 4 a share that is off by one.
bad = shares[:3] + [(4, (shares[3][1] + 1) % q)] + shares[4:]
print("cheat: ", [verify(x, y, C) for x, y in bad])
print("without checks:", rebuild(bad[:3]), rebuild(bad[2:]))   # two groups, two "secrets"

# The price of Feldman's checks: C_0 = g^s is public. In a tiny group, just search.
print("s from C_0:", next(s for s in range(q) if pow(g, s, p) == C[0]))
```

Output:

```
commitments [25, 370, 221]
honest: [True, True, True, True, True]
cheat:  [True, True, True, False, True]
without checks: 42 27
s from C_0: 42
```

Holder 4's check fails on the day of the sharing, not on the day of need.
Without the checks, holders 1, 2 and 3 rebuild 42, holders 3, 4 and 5 rebuild
27, and neither group can tell which is right. With them, holder 4 broadcasts a complaint, and the dealer must
post holder 4's correct share for everyone to check. A dealer who cannot, or
who draws more than $t - 1$ complaints, is disqualified and the sharing starts
again. The same check works at reconstruction time against false shares handed
in by holders: each submitted share is tested against the public commitments
before it is used, which stops the cheating shareholder of
[Mathematics, §11.9](../mathematics/11-Polynomials-at-Work.md) cold.

### What Feldman gives away

The last line of the program is the price. $C_0 = g^s$ is public, so the secret
is protected only by the discrete logarithm problem, not perfectly: in a group
of order 97 a loop finds it, in a 256-bit curve group nobody can. Feldman's
scheme is **computationally hiding**, and $g^s$ tells anyone whether a guess
is right.

When the secret is a signing key, $g^s$ is its public key and is published
anyway, which is why Feldman's scheme is the default in threshold signing
libraries. When the secret is a password, a low-entropy key or a vote, $g^s$ is
an oracle for testing guesses. Then use Pedersen's scheme.

!!! note "Life story: Feldman's verifiable secret sharing"
    **Born:** 1987, Paul Feldman, "A Practical Scheme for Non-interactive
    Verifiable Secret Sharing", 28th IEEE Symposium on Foundations of Computer
    Science (FOCS) · **Purpose:** let every holder check its own share against
    public commitments, with no interaction beyond one broadcast ·
    **Helped:** distributed key generation, threshold Schnorr, ECDSA and BLS
    libraries, proactive refresh, and the share checks of electronic voting
    systems · **Status:** current; hides the secret only computationally,
    since $g^s$ is public

## 2.6 Hiding everything: Pedersen's scheme

*Level: intermediate.*

Torben Pedersen, at Aarhus University, published the fix at CRYPTO '91. Add a
second generator $h$ of the same group, chosen so that nobody knows the
discrete logarithm of $h$ to base $g$. The dealer picks a second random
polynomial $b(x) = b_0 + b_1 x + \cdots + b_{t-1} x^{t-1}$ and publishes, in
place of Feldman's commitments,

$$
E_k = g^{a_k} h^{b_k} \bmod p, \qquad k = 0, \dots, t - 1 .
$$

Holder $i$ receives two numbers, $y_i = a(i)$ and $z_i = b(i)$, and checks

$$
g^{y_i} h^{z_i} \stackrel{?}{=} \prod_{k=0}^{t-1} E_k^{\,i^k} \pmod p ,
$$

which holds for the same reason as Feldman's: the right-hand side is $g^{a(i)}
h^{b(i)}$. Reconstruction uses only the $y_i$; the $z_i$ exist so the
commitments can be checked.

Each $E_k$ is a **Pedersen commitment**, the subject of
[Chapter 3](03-Commitments.md). Its two properties trade places with
Feldman's:

- **Perfectly hiding.** For every possible secret $s'$ there is exactly one
  $b_0'$ with $g^{s'} h^{b_0'} = E_0$, namely the one with $s' + w b_0' = s +
  w b_0$ in the exponent, where $w = \log_g h$. Since $b_0$ was uniform, $E_0$
  is a uniform group element whatever the secret, and the same holds for every
  $E_k$. The public board says nothing about $s$, even to an unbounded
  attacker. Together with Shamir's own perfect secrecy, $t - 1$ holders plus
  the board learn nothing.
- **Computationally binding.** A dealer who could open $E_0$ two ways, as $(s,
  b_0)$ and $(s', b_0')$, would have $g^{s - s'} = h^{b_0' - b_0}$ and could
  compute $w = (s - s')/(b_0' - b_0) \bmod q$. So as long as nobody knows
  $\log_g h$, the commitments fix one polynomial and the shares are as
  trustworthy as Feldman's.

With $b(x) = 11 + 60x + 23x^2$, holder 1 receives $y_1 = 64$ and $z_1 = 94$. With $h = 5$ (made below by hashing),
the check reads $16^{64} \cdot 5^{94} \equiv 55 \cdot 361 \equiv 16$, and the
product of the three published commitments $119 \cdot 169 \cdot 206$ is also
$\equiv 16 \pmod{389}$.

### Code it: the commitments fit every secret

```python
import hashlib

p, q, g = 389, 97, 16

def hash_to_group(label):                    # an element of the order-q subgroup whose log nobody chose
    v = int.from_bytes(hashlib.sha256(label).digest(), "big") % p
    return pow(v, (p - 1) // q, p)           # raising to the cofactor 4 lands in the subgroup

h = hash_to_group(b"Arcadia City VSS generator h")
print("h =", h, pow(h, q, p) == 1 and h != 1)

def evaluate(coeffs, x):
    return sum(c * pow(x, k, q) for k, c in enumerate(coeffs)) % q

a = [42, 17, 5]                              # the secret polynomial
b = [11, 60, 23]                             # a second random polynomial, the blinding
E = [pow(g, ak, p) * pow(h, bk, p) % p for ak, bk in zip(a, b)]
print("commitments", E)

def verify(x, y, z, E):                      # holder x got y = a(x) and z = b(x)
    rhs = 1
    for k, e in enumerate(E):
        rhs = rhs * pow(e, pow(x, k), p) % p
    return pow(g, y, p) * pow(h, z, p) % p == rhs

print([verify(x, evaluate(a, x), evaluate(b, x), E) for x in range(1, 6)])
print(verify(4, (evaluate(a, 4) + 1) % q, evaluate(b, 4), E))

# Hiding: E_0 fits every secret. Find log_g(h) by search (possible only in a toy group)...
w = next(k for k in range(q) if pow(g, k, p) == h)
for s2 in (0, 7, 96):                        # ...and open E_0 as some other secret s2
    b2 = (b[0] + (42 - s2) * pow(w, -1, q)) % q
    print(s2, b2, pow(g, s2, p) * pow(h, b2, p) % p == E[0])
```

Output:

```
h = 5 True
commitments [119, 169, 206]
[True, True, True, True, True]
False
0 13 True
7 45 True
96 50 True
```

The last three lines show both properties at once. $E_0 = 119$ is consistent
with the secret 0, 7 or 96 just as well as with 42, each with its own blinding
value: that is perfect hiding. And whoever knows $w = \log_g h$ can *produce*
those openings, so binding, and with it the whole verification, collapses if
the dealer knows $w$. Here the program found $w$ by trying 97 exponents; in a
256-bit group nobody can.

**Fix it: make $h$ in public.** The second generator must come from a process
that visibly gives nobody its logarithm. Hashing a public label into the group,
as `hash_to_group` does, is the standard way ("nothing up my sleeve"); on
elliptic curves the hash-to-curve methods of RFC 9380 do the same job. Letting
the dealer pick $h$ is a classic mistake: a dealer who picks $h = g^w$ can
publish commitments, hand out shares that pass every check, and later open the
sharing to a different secret.

**Feldman or Pedersen?** Pedersen's scheme costs twice the shares and
commitments. In distributed key generation, where every participant deals,
the two are combined: Rosario Gennaro, Stanisław Jarecki, Hugo Krawczyk and Tal
Rabin showed in 1999 that a careless combination lets one participant bias the
key, and their fix runs Pedersen first and Feldman second
([Chapter 4](04-Threshold-Cryptography.md)). For a secret that must stay hidden
even from unlimited computing power, use Pedersen.

!!! note "Life story: Pedersen's verifiable secret sharing"
    **Born:** 1991, Torben Pryds Pedersen at Aarhus University,
    "Non-Interactive and Information-Theoretic Secure Verifiable Secret
    Sharing", CRYPTO '91 · **Purpose:** verifiable shares whose public
    commitments reveal nothing about the secret, even to unlimited computing
    power · **Helped:** distributed key generation (with Gennaro et al.'s
    1999 repair), electronic voting, Pedersen commitments throughout
    zero-knowledge proofs and confidential transactions · **Status:**
    current; hiding is perfect, binding rests on the discrete logarithm, so a
    large quantum computer could let a dealer cheat but could not reveal a
    secret already shared

## 2.7 Keeping shares healthy: refresh and repair

*Level: intermediate.*

A key split in 2010 may need to be rebuilt in 2030. Shamir's guarantee is
about any $t - 1$ shares *at once*; it says nothing about an attacker who
steals one share this year, another next year, and a third the year after.
Rafail Ostrovsky and Moti Yung described this **mobile adversary** in 1991: it
can break into any machine, but only a few at a time, and moves on. Against
it, a sharing that never changes is lost the day the $t$-th share is stolen.

### Proactive refresh

The answer, from Amir Herzberg, Stanisław Jarecki, Hugo Krawczyk and Moti Yung
at CRYPTO '95, is to change all the shares at regular intervals while keeping
the secret the same, so that shares stolen in different periods do not fit
together. It uses the linearity of §2.3.

Each holder deals a random sharing of **zero**: a random polynomial
$\delta_j(x)$ of degree $t - 1$ with $\delta_j(0) = 0$. Every holder adds
everything it receives to its share:

$$
f_{\text{new}}(i) = f(i) + \sum_j \delta_j(i) .
$$

The new shares are points on $f + \sum_j \delta_j$, a polynomial of degree
$t - 1$ whose value at 0 is still $s + 0 = s$. But its other coefficients are
fresh random numbers, so old and new shares lie on different polynomials and
do not combine. The holders erase their old shares. As long as at least one
holder dealt an honest random $\delta_j$, the new polynomial is random, so even
a group who knows its own old *and* new shares learns nothing more than before.
With Feldman commitments on every $\delta_j$ (and $C_0 = g^0 = 1$, which
everyone checks), nobody can sneak in a sharing of a nonzero value.

**By hand.** Suppose the five zero-sharings of one refresh add up to $\delta(x)
= 33x + 70x^2$. Its values at 1 to 5 are 6, 55, 50, 88 and 72 modulo 97, and the
new shares are

| Holder | Old | $+\delta(i)$ | New |
|---|---|---|---|
| 1 | 64 | 6 | 70 |
| 2 | 96 | 55 | $151 \equiv 54$ |
| 3 | 41 | 50 | 91 |
| 4 | 93 | 88 | $181 \equiv 84$ |
| 5 | 58 | 72 | $130 \equiv 33$ |

Holders 1, 3 and 5 use the same weights 14, 23 and 61 as before, since the
weights depend only on the $x$-coordinates: $14 \cdot 70 + 23 \cdot 91 + 61
\cdot 33 = 980 + 2093 + 2013 = 5086 \equiv 42$. The secret survived. An attacker
who stole holder 1's *old* share (64) and holders 3 and 5's *new* shares gets
$14 \cdot 64 + 2093 + 2013 = 5002 \equiv 55$, which is just a random number.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Proactive refresh: the secret stays the same across periods while all shares change, so shares stolen in different periods do not combine" fill="currentColor" font-size="14">
<line x1="30" y1="40" x2="610" y2="40" stroke="currentColor" stroke-width="1.6"/>
<polygon points="610,40 600,35 600,45"/>
<text x="40" y="28" font-size="13">secret s = 42 stays the same in every period</text>
<rect x="30" y="70" width="170" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="92" text-anchor="middle" font-weight="bold">period 1</text>
<text x="115" y="114" text-anchor="middle" font-size="13">shares on f</text>
<text x="115" y="140" text-anchor="middle" font-size="13">64 96 41 93 58</text>
<text x="115" y="170" text-anchor="middle" font-size="13">thief takes share 1</text>
<rect x="235" y="70" width="170" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="92" text-anchor="middle" font-weight="bold">period 2</text>
<text x="320" y="114" text-anchor="middle" font-size="13">shares on f + δ</text>
<text x="320" y="140" text-anchor="middle" font-size="13">70 54 91 84 33</text>
<text x="320" y="170" text-anchor="middle" font-size="13">thief takes 3 and 5</text>
<rect x="440" y="70" width="170" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525" y="92" text-anchor="middle" font-weight="bold">period 3</text>
<text x="525" y="114" text-anchor="middle" font-size="13">shares on f + δ + δ'</text>
<text x="525" y="140" text-anchor="middle" font-size="13">all new again</text>
<text x="525" y="170" text-anchor="middle" font-size="13">old shares erased</text>
<line x1="200" y1="130" x2="235" y2="130" stroke="currentColor" stroke-width="1.3"/>
<polygon points="235,130 227,126 227,134"/>
<line x1="405" y1="130" x2="440" y2="130" stroke="currentColor" stroke-width="1.3"/>
<polygon points="440,130 432,126 432,134"/>
<text x="30" y="222" font-size="13">The thief's three shares come from two different polynomials:</text>
<text x="30" y="242" font-size="13">14·64 + 23·91 + 61·33 ≡ 55, not 42. Each refresh adds a sharing of zero.</text>
</svg>
<figcaption>Figure 2.5. Proactive refresh. The secret never changes, but every period moves all shares to a new random polynomial through the same point at x = 0, so shares stolen in different periods are worthless together.</figcaption>
</figure>

### Share repair

Holder 2's share is lost in a fire. The obvious repair, rebuilding the secret
and dealing holder 2 a new share, puts the whole secret on one machine. There
is a better way. Holder 2's share is $f(2)$, and Lagrange interpolation can
evaluate $f$ at 2 just as well as at 0. For helpers 1, 3 and 5, the weights for
the point $x = 2$ are

$$
\begin{aligned}
\lambda_1(2) &= \frac{(2-3)(2-5)}{(1-3)(1-5)} = \frac{3}{8} \equiv 61, \\
\lambda_3(2) &= \frac{(2-1)(2-5)}{(3-1)(3-5)} = \frac{3}{4} \equiv 25, \\
\lambda_5(2) &= \frac{(2-1)(2-3)}{(5-1)(5-3)} = \frac{-1}{8} \equiv 12,
\end{aligned}
$$

and with the original shares, $61 \cdot 64 + 25 \cdot 41 + 12 \cdot 58 = 5625
\equiv 96 = f(2)$. If each helper simply sent its term $\lambda_i(2) y_i$ to
holder 2, though, holder 2 could divide by the public weight and recover the
helper's share. So each helper first splits its term additively (§2.2) into
three random pieces, one for each helper; each helper adds up the pieces it
receives and sends only that sum to holder 2. The three sums add up to $f(2)$,
and each one alone is a uniformly random number.

### Code it: refresh and repair

```python
import random

P = 97
random.seed(2026)                            # repeatable demo; real refreshes use secrets

def evaluate(coeffs, x):
    return sum(c * pow(x, k, P) for k, c in enumerate(coeffs)) % P

def weights(xs, at=0):
    out = []
    for i in xs:
        num = den = 1
        for j in xs:
            if j != i:
                num, den = num * (at - j) % P, den * (i - j) % P
        out.append(num * pow(den, -1, P) % P)
    return out

def rebuild(shares, at=0):
    xs = [x for x, _ in shares]
    return sum(l * y for l, (_, y) in zip(weights(xs, at), shares)) % P

old = {x: evaluate([42, 17, 5], x) for x in range(1, 6)}       # the shares of section 2.3

# Refresh: every holder deals a random sharing of ZERO; everyone adds what it receives.
new = dict(old)
for dealer in range(1, 6):
    zero = [0, random.randrange(P), random.randrange(P)]       # constant term 0
    for x in new:
        new[x] = (new[x] + evaluate(zero, x)) % P
print("old", old)
print("new", new)
print(rebuild([(x, new[x]) for x in (1, 3, 5)]), rebuild([(x, new[x]) for x in (2, 3, 4)]))
print("mixed:", rebuild([(1, old[1]), (3, new[3]), (5, new[5])]))

# Repair: holder 2 lost its share. Holders 1, 3, 5 rebuild f(2) without showing their shares.
helpers = [1, 3, 5]
lam = weights(helpers, at=2)                 # weights for evaluating at x = 2, not at 0
print("weights at 2:", lam)
pieces = {}                                  # helper i splits lam_i * y_i into 3 random pieces
for i, l in zip(helpers, lam):
    term = l * new[i] % P
    r = [random.randrange(P) for _ in range(2)]
    pieces[i] = r + [(term - sum(r)) % P]    # piece k goes to helper helpers[k]
sums = [sum(pieces[i][k] for i in helpers) % P for k in range(3)]   # each helper adds what it got
print("sent to holder 2:", sums, "repaired:", sum(sums) % P, "true:", new[2])
```

Output:

```
old {1: 64, 2: 96, 3: 41, 4: 93, 5: 58}
new {1: 15, 2: 43, 3: 29, 4: 70, 5: 69}
42 42
mixed: 49
weights at 2: [61, 25, 12]
sent to holder 2: [88, 68, 81] repaired: 43 true: 43
```

The program refreshed with five random zero-sharings, so its new shares differ
from the hand example, but the pattern is the same: the secret is still 42, a
mixture of old and new shares gives garbage (49), and holder 2 gets its current
share, 43, back from three numbers that each look random. The repair can also
issue a share to a *new* holder at a new point, say $x = 6$, which is how
members join a sharing without a dealer.

### Changing the group itself

To change the holders or the threshold, **resharing** has each of $t$ old
holders deal a fresh sharing of its own share to the new group, with the new
threshold; each new holder combines what it receives with the old group's
Lagrange weights (Yvo Desmedt and Sushil Jajodia, 1997; made verifiable by
Theodore Wong, Chenxi Wang and Jeannette Wing, 2002; CHURP, 2019, does it for
committees that change while running).

Two warnings. **Erasure is a promise, not a proof**: a holder who keeps its old
share keeps its old power, and the scheme cannot tell. And refresh protects the
shares, not the secret; if the secret may have leaked, replace it.

## 2.8 SLIP-39: seed shares on paper

*Level: intermediate.*

A hardware wallet's whole value hangs on one random number, the master secret
from which every key is derived. The usual backup is a list of 12 or 24 words
(BIP-39) on paper. A single paper is a single point of failure in both
directions: lose it and the funds are gone, let someone photograph it and the
funds are theirs. In December 2017 Pavol Rusnak, Andrew Kozlik and four
colleagues at SatoshiLabs, the company behind Trezor, wrote up a proper answer
as SLIP-39, "Shamir's Secret-Sharing for Mnemonic Codes".

**The arithmetic.** SLIP-39 shares byte strings one byte at a time over
GF($2^8$), with the same reduction polynomial as AES, $x^8 + x^4 + x^3 + x + 1$.
Addition is XOR and every nonzero byte has an inverse, so Lagrange
interpolation works as over GF(97). Two choices are unusual:

- **The secret sits at $x = 255$, not at $x = 0$,** and a **digest share** sits
  at $x = 254$. Members get the points $x = 0, 1, \dots, 15$. So in SLIP-39 the
  share at $x = 0$ is an ordinary share; what matters is that no member's
  point is the secret's point. To split with threshold $t$, the dealer picks
  $t - 2$ member shares at random, computes the digest share, and interpolates
  the polynomial through those $t - 2$ points, the digest and the secret; the
  remaining member shares are points on it.
- **The digest share checks the result.** Its first 4 bytes are the first 4
  bytes of HMAC-SHA256 of the secret, keyed with the other $n - 4$ bytes, which
  are random. At recovery, after interpolating both the secret and the digest,
  the wallet recomputes the HMAC. A wrong or mistyped share almost surely
  produces a mismatch, so plain Shamir's silent failure becomes a loud one. It
  is not verifiable secret sharing, since the dealer is your own wallet.

**The words.** Shares are written with a list of 1,024 words, 10 bits each.
A share of a 128-bit secret is 20 words: 4 of header (an identifier, the
indices and thresholds), 13 of share value and 3 of checksum; a 256-bit secret
takes 33. The checksum, RS1024, is a Reed-Solomon code over GF(1024) that
detects any error in up to three words.

**Two levels.** SLIP-39 shares twice. The master secret is first split into up
to 16 **group shares** with a group threshold; each group share is split again
among up to 16 **members** with its own threshold. A typical setup is a group
threshold of 2 out of three groups: "me" (one share in my safe), "family" (2 of
3 relatives) and "friends" (3 of 5). I alone cannot recover, nor can my family
alone, but I plus any two relatives can, and so can any two relatives plus any
three friends (Figure 2.6). A threshold of 1 is allowed only for a group of
one member, whose "share" is a copy of the group secret.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="SLIP-39 two-level sharing: master secret split 2 of 3 into groups me, family and friends, which are split 1 of 1, 2 of 3 and 3 of 5 among members" fill="currentColor" font-size="14">
<rect x="230" y="12" width="180" height="48" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="320" y="33" text-anchor="middle" font-weight="bold">master secret</text>
<text x="320" y="51" text-anchor="middle" font-size="12">(passphrase-encrypted)</text>
<text x="430" y="40" font-size="13">group threshold 2 of 3</text>
<g stroke="currentColor" stroke-width="1.3">
<line x1="290" y1="60" x2="100" y2="110"/><line x1="320" y1="60" x2="320" y2="110"/><line x1="350" y1="60" x2="540" y2="110"/>
</g>
<rect x="40" y="110" width="120" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="100" y="130" text-anchor="middle" font-weight="bold">me</text>
<text x="100" y="147" text-anchor="middle" font-size="12">1 of 1</text>
<rect x="260" y="110" width="120" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="130" text-anchor="middle" font-weight="bold">family</text>
<text x="320" y="147" text-anchor="middle" font-size="12">2 of 3</text>
<rect x="480" y="110" width="120" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="130" text-anchor="middle" font-weight="bold">friends</text>
<text x="540" y="147" text-anchor="middle" font-size="12">3 of 5</text>
<g stroke="currentColor" stroke-width="1" opacity="0.8">
<line x1="100" y1="154" x2="100" y2="200"/>
<line x1="320" y1="154" x2="270" y2="200"/><line x1="320" y1="154" x2="320" y2="200"/><line x1="320" y1="154" x2="370" y2="200"/>
<line x1="540" y1="154" x2="460" y2="200"/><line x1="540" y1="154" x2="500" y2="200"/><line x1="540" y1="154" x2="540" y2="200"/><line x1="540" y1="154" x2="580" y2="200"/><line x1="540" y1="154" x2="620" y2="200"/>
</g>
<g fill="none" stroke="currentColor" stroke-width="1.2">
<rect x="86" y="200" width="28" height="22" rx="3"/>
<rect x="256" y="200" width="28" height="22" rx="3"/><rect x="306" y="200" width="28" height="22" rx="3"/><rect x="356" y="200" width="28" height="22" rx="3"/>
<rect x="446" y="200" width="28" height="22" rx="3"/><rect x="486" y="200" width="28" height="22" rx="3"/><rect x="526" y="200" width="28" height="22" rx="3"/><rect x="566" y="200" width="28" height="22" rx="3"/><rect x="606" y="200" width="28" height="22" rx="3"/>
</g>
<text x="20" y="252" font-size="13">Each small box is one 20-word share. Recovery needs 2 groups, each meeting its own</text>
<text x="20" y="270" font-size="13">threshold: me + 2 relatives, me + 3 friends, or 2 relatives + 3 friends.</text>
</svg>
<figcaption>Figure 2.6. A SLIP-39 backup with two levels. The master secret is shared 2 of 3 among groups, and each group's share is shared again among its members.</figcaption>
</figure>

**The passphrase.** Before splitting, the master secret can be encrypted with
a passphrase by a four-round Feistel network
([book 1, Chapter 6](../../book/06-Block-Ciphers.md)) whose round function is
PBKDF2-HMAC-SHA256. Every passphrase decrypts to *some* valid-looking master
secret, so a coerced owner can reveal a passphrase that opens a decoy wallet.

### Code it: the core of SLIP-39

The program below implements SLIP-39's split and recovery for one group, with
the secret at 255 and the digest at 254; it leaves out the words, the header
and the passphrase.

```python
import hashlib, hmac, random
from itertools import combinations

random.seed(39)                              # repeatable demo; SLIP-39 itself needs a secure generator

def gmul(a, b):                              # multiply in GF(2^8) mod x^8 + x^4 + x^3 + x + 1, as AES does
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def ginv(a):                                 # a^254 = a^-1, since the nonzero elements form a group of 255
    r = 1
    for _ in range(254):
        r = gmul(r, a)
    return r

def interpolate(points, x):                  # Lagrange at x, byte by byte; in GF(2^8), minus is XOR
    out = bytearray(len(points[0][1]))
    for xi, yi in points:
        w = 1
        for xj, _ in points:
            if xj != xi:
                w = gmul(w, gmul(x ^ xj, ginv(xi ^ xj)))
        for k in range(len(out)):
            out[k] ^= gmul(w, yi[k])
    return bytes(out)

SECRET_X, DIGEST_X = 255, 254

def split(secret, t, n):                     # SLIP-39's SplitSecret, with t >= 2
    pts = [(x, bytes(random.randrange(256) for _ in secret)) for x in range(t - 2)]
    r = bytes(random.randrange(256) for _ in range(len(secret) - 4))
    digest = hmac.new(r, secret, hashlib.sha256).digest()[:4] + r
    pts += [(DIGEST_X, digest), (SECRET_X, secret)]
    return pts[:t - 2] + [(x, interpolate(pts, x)) for x in range(t - 2, n)]

def recover(shares):
    s, d = interpolate(shares, SECRET_X), interpolate(shares, DIGEST_X)
    if hmac.new(d[4:], s, hashlib.sha256).digest()[:4] != d[:4]:
        raise ValueError("digest mismatch: a share is wrong")
    return s

master = bytes.fromhex("bb54aac4b89dc868ba37d9cc21b2cece")
shares = split(master, 3, 5)
print([x for x, _ in shares], shares[0][1].hex())
print(all(recover(list(c)) == master for c in combinations(shares, 3)))
x, y = shares[1]
try:
    recover([shares[0], (x, bytes([y[0] ^ 1]) + y[1:]), shares[2]])
except ValueError as e:
    print(e)
```

Output:

```
[0, 1, 2, 3, 4] 6b84c50d6370ca0282b65b0d9625bb04
True
digest mismatch: a share is wrong
```

All ten groups of three recover the 16-byte secret, and flipping one bit of
one share is caught by the digest instead of silently producing a wrong
wallet.

!!! note "Life story: SLIP-39"
    **Born:** December 2017, SatoshiLabs (Pavol Rusnak, Andrew Kozlik and
    colleagues), as a SatoshiLabs Improvement Proposal · **Purpose:** back up
    a wallet's master secret as Shamir shares written in words, with
    checksums, a digest check, two levels of groups and an optional
    passphrase · **Helped:** Trezor's Shamir Backup (2019) and Multi-share
    Backup, and other wallets and tools that implement the published
    specification · **Status:** final and in use; its weak points are human
    ones, such as storing shares together or losing track of who holds which

## 2.9 The DNS root key's recovery shares

*Level: intermediate.*

Every DNSSEC validation ends at the root zone's key-signing key (KSK)
([Protocols, Chapter 10](../protocols/10-DNSSEC-and-Private-DNS.md)). Its
private half lives inside hardware security modules (HSMs) in two
facilities in the United States, in Culpeper, Virginia and El Segundo,
California, operated by Public Technical Identifiers (PTI), an affiliate of
ICANN, as the Root Zone KSK Operator. The root was first signed with it on
15 July 2010.

The design uses secret sharing twice, for the two enemies of §2.1.

**Against misuse: the crypto officers.** The HSMs can be activated only in a
public key-signing ceremony, held several times a year and streamed online, in
which a quorum of **crypto officers** each insert a smart card. These are
volunteers from the Internet community around the world, Trusted Community
Representatives, unaffiliated with ICANN; seven are assigned to each facility,
and three of them are needed to activate its HSM.

**Against loss: the recovery key share holders.** If both facilities were
destroyed, the KSK must still be recoverable. Encrypted backups of the KSK
exist, protected under the HSMs' **storage master key** (SMK). The SMK in turn
is split with a **5-of-7 threshold secret sharing scheme** among seven
**Recovery Key Share Holders** (RKSHs), people from organizations separate from
PTI and ICANN, in different countries. Each keeps a smart card holding a share,
sealed in a tamper-evident bag. In a disaster,
five of the seven would travel to a new facility, restore the SMK into a new
HSM, and with it decrypt the backup of the KSK. As far as the public record
shows, this has never had to happen.

Some details are worth noticing, because they are the parts most deployments
get wrong:

- **What is shared is a key-encryption key,** not the KSK itself. The backups
  can be copied freely and stored in several places because they are
  encrypted; only the small SMK needs the threshold scheme. This keeps
  rebuilding rare and the shared secret small.
- **The holders are independent of the operator** and of each other, so an
  attacker must suborn five of them, in different jurisdictions, unnoticed.
- **The numbers are a trade-off.** 5 of 7 tolerates two lost shares. The
  crypto officers' 3 of 7 is lower because ceremonies happen several times a
  year and must not fail when a few volunteers cannot travel.
- **The public documents describe the scheme but not its algorithm.** The
  Root Zone KSK Operator's key management policy and DNSSEC practice
  statement give the 5-of-7 threshold, the holders' duties and the recovery
  procedure; the sharing itself is done by the HSM's own backup feature, and
  the documents consulted for this chapter do not name the exact scheme.

The KSK has been replaced twice since 2010, in the rollovers of 2018 (to
KSK-2017) and 2026 (to KSK-2024), and the same structure has carried over:
secret sharing as an institution, where the policy around the shares is where
the security lives.

!!! note "Life story: the root KSK's recovery shares"
    **Born:** 2010, with the signing of the DNS root zone; seven Recovery Key
    Share Holders appointed from the Internet community · **Purpose:** let the
    root key be rebuilt if both key management facilities were lost, without
    letting any small group rebuild it · **Helped:** DNSSEC's trust anchor
    through two key rollovers (2018 and 2026) · **Status:** in service, as
    described in the operator's key management policy (v3.8, 2025)

## 2.10 Mars: six wardens, any four

*Level: intermediate.*

Arcadia City, the settlement on Mars that runs through this book, has one key
above all others: the **city master key**, which decrypts the archive of
deeds, medical records and the council's sealed decisions, and which can
re-issue every other key in the city after a disaster. The council's question
is who should hold it. Its answer: the six district wardens, any four of whom
together can rebuild it.

Why four of six? The council looked at the two enemies.

- **Loss.** A dust storm can cut a district off for days, a warden can be ill,
  a card can burn. Four of six works with two wardens unavailable.
- **Misuse.** Three wardens together learn nothing at all; an attacker must
  win over or rob four.
- **Earth cannot help.** Earth is 4 to 24 minutes away by light, and around
  solar conjunction, every 26 months, the link goes quiet for about two weeks.
  An Earth agency could hold a seventh share as a last resort, but no routine
  procedure may depend on it. All shares that matter stay on Mars.

The archive must stay secret for decades, perhaps past the day a quantum
computer solves discrete logarithms, so Feldman's public $g^s$ is not
acceptable; the city uses **Pedersen's VSS**. The dealing is done
once, in public, in the council hall: an offline machine generates the key,
deals the six shares on smart cards, posts the Pedersen commitments on the
city's public board, and is then destroyed. Each warden checks its card
against the board before signing for it. Every year, when new wardens take
office, the six run a **proactive refresh** (§2.7) and the outgoing warden's
card is destroyed in front of the council. When a card is lost, four others
**repair** it without rebuilding the key. And the key is rebuilt only for
emergencies, on an offline machine in the hall; day-to-day decryption is done
by threshold decryption, where four wardens each compute a partial result and
the key is never assembled ([Chapter 4](04-Threshold-Cryptography.md)).

```python
import hashlib, secrets
from itertools import combinations

p, q, g = 389, 97, 16                        # toy group; the city would use a 256-bit curve
h = pow(int.from_bytes(hashlib.sha256(b"Arcadia h").digest(), "big") % p, 4, p)

def evaluate(c, x):
    return sum(a * pow(x, k, q) for k, a in enumerate(c)) % q

def rebuild(sh):
    s = 0
    for xi, yi in sh:
        num = den = 1
        for xj, _ in sh:
            if xj != xi:
                num, den = num * xj % q, den * (xj - xi) % q
        s = (s + yi * num * pow(den, -1, q)) % q
    return s

key = secrets.randbelow(q)                   # one "digit" of the city master key
a = [key] + [secrets.randbelow(q) for _ in range(3)]   # degree 3: any four wardens
b = [secrets.randbelow(q) for _ in range(4)]
board = [pow(g, x, p) * pow(h, y, p) % p for x, y in zip(a, b)]   # posted in the council hall
wardens = {d: (evaluate(a, d), evaluate(b, d)) for d in range(1, 7)}

def check(d, y, z):
    rhs = 1
    for k, e in enumerate(board):
        rhs = rhs * pow(e, d ** k, p) % p
    return pow(g, y, p) * pow(h, z, p) % p == rhs

print("all six wardens accept:", all(check(d, *wardens[d]) for d in wardens))
fours = [c for c in combinations(wardens, 4)]
print(len(fours), "groups of four, all rebuild:",
      all(rebuild([(d, wardens[d][0]) for d in c]) == key for c in fours))
```

Output:

```
all six wardens accept: True
15 groups of four, all rebuild: True
```

The real master key is 256 bits, shared over a 256-bit prime field with the
commitments on an elliptic curve; the arithmetic is the same.

## 2.11 Where secret sharing quietly fails

*Level: intermediate.*

Shamir's theorem is a counting argument; it cannot be attacked. Real failures
are in the code and procedures around it, and most are quiet: the shares look
fine, the rebuild works, and the secret has been leaking all along.

### Break it: randomness, polynomials and rings

```python
import secrets

P = 97

def evaluate(coeffs, x):
    return sum(c * pow(x, k, P) for k, c in enumerate(coeffs)) % P

def rebuild(shares):
    s = 0
    for xi, yi in shares:
        num = den = 1
        for xj, _ in shares:
            if xj != xi:
                num, den = num * xj % P, den * (xj - xi) % P
        s = (s + yi * num * pow(den, -1, P)) % P
    return s

# 1. Reused randomness: two secrets shared with the same coefficients.
coeffs = [secrets.randbelow(P) for _ in range(2)]
s_old, s_new = 42, 77                        # last year's key and this year's
y_old = evaluate([s_old] + coeffs, 4)        # holder 4's two shares
y_new = evaluate([s_new] + coeffs, 4)
print("holder 4 learns s_new - s_old =", (y_new - y_old) % P, "true:", (s_new - s_old) % P)

# 2. A bad polynomial: a 3-of-5 sharing whose top coefficient is missing (or zero).
bad = [42, secrets.randbelow(P)]             # degree 1, not 2
shares = [(x, evaluate(bad, x)) for x in range(1, 6)]
print("two holders rebuild:", rebuild(shares[:2]), rebuild(shares[3:]))

# 3. The wrong ring: "Shamir" over the integers mod 256, which is not a field.
s = 0b10110110
a1, a2 = secrets.randbelow(256), secrets.randbelow(256)
y16 = (s + a1 * 16 + a2 * 256) % 256         # the share at x = 16
print("share at x = 16:", bin(y16 % 16), "secret's low 4 bits:", bin(s % 16))
```

Output (the same on every run):

```
holder 4 learns s_new - s_old = 35 true: 35
two holders rebuild: 42 42
share at x = 16: 0b110 secret's low 4 bits: 0b110
```

1. **Reused randomness.** If two secrets are shared with the same
   coefficients, every holder's two shares differ by exactly the difference of
   the secrets: $f_{\text{new}}(i) - f_{\text{old}}(i) = s_{\text{new}} -
   s_{\text{old}}$. One holder alone learns that difference, and the day the
   old key is retired and published, the new one is exposed. It happens when
   code caches a polynomial, seeds a generator with a constant, or "re-splits"
   by changing only the constant term.
2. **A bad polynomial.** An off-by-one that draws $t - 2$ random coefficients
   instead of $t - 1$, or a generator that happens to return 0 for the top
   coefficient, gives a polynomial of lower degree. Every share still looks
   random and every group of $t$ still rebuilds correctly, so no test that
   only checks reconstruction will ever notice; but now $t - 1$ holders
   suffice. Test that $t - 1$ shares fail, and use VSS, whose commitment count
   fixes the degree.
3. **The wrong ring.** Arithmetic modulo 256 is not a field: 2 has no inverse,
   so Lagrange interpolation breaks, and worse, a share at an even $x$ leaks.
   At $x = 16$ every term but the secret is a multiple of 16, so one share
   gives away the secret's low four bits. Byte-wise sharing must use
   GF($2^8$) with its polynomial arithmetic (§2.8), never integers mod 256.

### Break it: predictable coefficients

Coefficients drawn from a weak generator are as bad as no coefficients. A tool
that takes its secret from a good source but seeds `random` with the clock
gives an attacker with **one** share a short search, if it also knows anything
that confirms a guess, such as the key's published fingerprint or public key:

```python
import hashlib, random

P = 2**127 - 1                               # a large prime field, as a real tool would use

def evaluate(coeffs, x):
    return sum(c * pow(x, k, P) for k, c in enumerate(coeffs)) % P

# A tool takes its secret from a good source but seeds its coefficients with the time.
secret = int.from_bytes(hashlib.sha256(b"vault master key").digest()[:15], "big")
fingerprint = hashlib.sha256(secret.to_bytes(16, "big")).hexdigest()   # published key ID
moment = 1_790_000_000 + 31_337              # the second the sharing was made
random.seed(moment)
coeffs = [random.randrange(P) for _ in range(2)]
x, y = 3, evaluate([secret] + coeffs, 3)     # the attacker steals ONE share of a 3-of-5

for guess in range(1_790_000_000, 1_790_000_000 + 86_400):   # every second of one day
    random.seed(guess)
    a1, a2 = random.randrange(P), random.randrange(P)
    s = (y - a1 * x - a2 * x * x) % P
    if hashlib.sha256(s.to_bytes(16, "big")).hexdigest() == fingerprint:
        print("seed", guess, "secret recovered:", s == secret)
        break
```

Output:

```
seed 1790031337 secret recovered: True
```

A fraction of a second. The theorem of §2.3 assumed uniformly random
coefficients; with a seed from one day of clock values there are only 86,400
polynomials, and one share plus the fingerprint picks out the right one. Use
`secrets` or `os.urandom` for every coefficient, always.

### Break it: a share at zero in disguise

Binance's tss-lib, a widely forked threshold-signature library, let a
participant choose its own index, checked only that it was not 0 as an
integer, and did the arithmetic modulo the group order $q$. An index of $q$ is
0 modulo $q$, so that participant was dealt $f(q) = f(0)$: the secret.
Feldman's check does not catch it, because the share *is* a correct point on
the polynomial:

```python
p, q, g = 389, 97, 16

def evaluate(coeffs, x):
    return sum(c * pow(x, k, q) for k, c in enumerate(coeffs)) % q

def verify(x, y, C):
    rhs = 1
    for k, c in enumerate(C):
        rhs = rhs * pow(c, x ** k, p) % p
    return pow(g, y, p) == rhs

coeffs = [42, 17, 5]
C = [pow(g, a, p) for a in coeffs]
evil_x = q                                   # a "participant ID" of 97: nonzero as an integer
assert evil_x != 0                           # the library's only check
y = evaluate(coeffs, evil_x)
print("share for x = 97:", y, "| passes Feldman:", verify(evil_x, y, C))
```

Output:

```
share for x = 97: 42 | passes Feldman: True
```

**Fix it.** Reduce every index modulo the field size first, then reject 0 and
duplicates. Better, never let participants choose their indices.

!!! note "Life story: the tss-lib zero-index bug"
    **Born:** found by Trail of Bits in October 2021 in Binance's tss-lib and
    several of its forks; disclosed on 21 December 2021 after a coordinated
    embargo · **Purpose:** a malicious participant picks the index $q$ and is
    dealt the secret itself as its share · **Helped:** fixes across the
    affected libraries, and Trail of Bits' ZKDocs guidance on validating
    indices · **Status:** fixed; "nonzero and distinct modulo $q$" is now
    standard advice

### The other quiet failures

- **Cheaters at reconstruction.** A holder who hands in a false share learns
  the secret while everyone else gets garbage (Martin Tompa and Heather Woll,
  1988; coded in [Mathematics, §11.9](../mathematics/11-Polynomials-at-Work.md)).
  Fix: check submitted shares against VSS commitments, or a digest as SLIP-39
  does.
- **The machine that splits or rebuilds.** Secret sharing protects shares; it
  cannot protect a secret from the program that holds it whole, before
  splitting or after rebuilding. Ledger Recover (card below) is the best-known
  reminder.
- **Shares that live together.** All the shares in one safe, one cloud account
  or one password manager are one share. The threshold counts independent
  places and people, not pieces of paper.
- **Shares that never expire.** A holder who leaves keeps working power for
  as long as the secret lives. Refresh (§2.7), or rotate the secret.
- **Forgotten holders.** Years later nobody remembers who holds which share.
  A sharing needs a register and a regular check that each share still
  exists.

!!! note "Life story: Ledger Recover"
    **Born:** announced by Ledger in May 2023, with Coincover and EscrowTech
    as custodians · **Purpose:** an optional paid backup in which the wallet
    encrypts its seed, splits it into three shards with Shamir's scheme and
    sends one to each custodian; any two rebuild it after an identity check
    · **Helped:** a public argument about trust: the outcry was not about the
    sharing but that the firmware could export the seed at all; Ledger
    published a protocol white paper in June 2023 · **Status:** launched as an
    optional service later in 2023

### In the real world

| Deployment | Scheme | Threshold |
|---|---|---|
| DNS root KSK backup (since 2010) | HSM storage master key shared among recovery key share holders | 5 of 7 |
| DNS root HSM activation | crypto officers' smart cards | 3 of 7 per facility |
| HashiCorp Vault unseal key | Shamir over GF($2^8$) | 3 of 5 by default |
| SLIP-39 (Trezor and others) | Shamir over GF($2^8$), two levels, digest check | chosen by owner, up to 16 of 16 |
| HSM card sets (for example nShield, Luna) | vendor quorum schemes | K of N, chosen by owner |
| Ledger Recover (2023) | Shamir, encrypted shards at three custodians | 2 of 3 |
| Threshold signing wallets | Feldman VSS, refresh | varies ([Chapter 4](04-Threshold-Cryptography.md)) |

## 2.12 Going deeper

*Level: expert.*

**Computational sharing.** By the Karnin-Greene-Hellman bound, sharing a 1 GB
file perfectly costs every holder 1 GB. Hugo Krawczyk's
"Secret sharing made short" (1993) escapes the bound by giving up perfection:
encrypt the file under a random key, share the key with Shamir, and split the
ciphertext with Michael Rabin's information dispersal (1989), an erasure code
where any $t$ of $n$ pieces of size $|F|/t$ rebuild it. Security then rests on
the cipher.

**Ramp and packed schemes.** If $t - 1$ holders may learn *something*, shares
can be smaller than the secret. A **ramp scheme** (Blakley and Meadows, 1984)
has a privacy threshold below the recovery threshold; **packed** sharing
(Franklin and Yung, 1992) hides $k$ secrets at $k$ points of one polynomial, so
one share carries a piece of each. Packed sharing is how large multi-party
computations amortize their cost.

**General access structures.** One might want "the president and any two
vice-presidents, or any four directors". Ito, Saito and Nishizeki (1987) showed that every monotone access structure has
a perfect scheme (replicated sharing, §2.2, is their construction), and Josh
Benaloh and Jerry Leichter (1988) built schemes from monotone formulas. The
efficient general tool is a **linear secret sharing scheme** given by a
monotone span program (Karchmer and Wigderson, 1993). How large shares must be
for the worst access structures is a famous open problem: the best schemes
known need exponentially long shares, and the best lower bounds are far from
that.

**VSS without hard problems.** With private channels and fewer than a third
of holders dishonest, Ben-Or, Goldwasser and Wigderson (1988) built perfectly
secure verifiable sharing, using Reed-Solomon decoding instead of commitments;
Rabin and Ben-Or (1989) reached an honest majority with a tiny error
probability. These underlie the information-theoretic multi-party computation
of Chapter 10.

**Other algebra and asynchrony.** Maurice Mignotte (1982) and Charles Asmuth
and John Bloom (1983) built threshold schemes from the Chinese remainder
theorem; they are not perfect in the strict sense and rarely used. The VSS of
this chapter assumes a synchronous broadcast channel; asynchronous VSS (Cachin,
Kursawe, Lysyanskaya and Strobl, 2002) underlies many randomness beacons and
consensus systems (Chapter 17).

**Quantum computers.** Shamir, Blakley, additive and replicated sharing are
unconditionally secure: nothing changes. Feldman's commitments fall to a large
quantum computer, which would compute $s$ from $g^s$. Pedersen's commitments
stay hiding forever, but their binding falls. Post-quantum verifiable sharing
uses hash-based or lattice-based commitments
([Post-quantum, Chapter 4](../post-quantum/04-A-Field-Guide-to-Hard-Problems.md)).

## Check yourself

??? question "1. A secret is shared additively mod 97 among three people as 23, 71, 45. One share is lost. Can the other two rebuild it?"

    No. Additive sharing is $n$ of $n$: the two remaining shares are
    consistent with every secret. That is why additive sharing alone is
    dangerous for backups; it protects against misuse but not against loss.

??? question "2. In the 3-of-5 example, holders 2, 3 and 4 meet. Compute their Lagrange weights at 0 and rebuild the secret from (2, 96), (3, 41), (4, 93)."

    $\lambda_2 = \frac{3 \cdot 4}{(3-2)(4-2)} = 6$, $\lambda_3 =
    \frac{2 \cdot 4}{(2-3)(4-3)} = -8 \equiv 89$, $\lambda_4 = \frac{2 \cdot
    3}{(2-4)(3-4)} = 3$. They add to $98 \equiv 1$. Then $6 \cdot 96 + 89
    \cdot 41 + 3 \cdot 93 = 576 + 3649 + 279 = 4504 = 46 \cdot 97 + 42$, so
    the secret is 42.

??? question "3. Why must the field have more than n elements, and why must no share sit at x = 0?"

    Each holder needs a distinct nonzero $x$, and a field of size $m$ has only
    $m - 1$ of them. The value at $x = 0$ is $f(0)$, the secret itself, so a
    "share" there is the secret; and the test must be $x \not\equiv 0$ modulo
    the field size, since $x = m$ is 0 too.

??? question "4. Shares of a 1 KB secret are 1 KB each. Could a cleverer perfect scheme make them 100 bytes?"

    No (Karnin, Greene and Hellman, 1983). Smaller shares mean giving up
    perfection: a ramp scheme, or Krawczyk's computational scheme.

??? question "5. A dealer's Feldman commitments are C0 = 25, C1 = 370, C2 = 221 in the group of §2.5. Holder 1 receives 64. Check it."

    $16^{64} \bmod 389$ must equal $C_0 C_1 C_2 = 25 \cdot 370 \cdot 221 \bmod
    389$. Both are 55, so the share is good. (The code in §2.5 prints the
    same.)

??? question "6. Why is Feldman's scheme fine for sharing an ECDSA signing key but a poor choice for sharing a 6-digit PIN?"

    Feldman publishes $g^s$. For a signing key that is the public key, already
    public. For a PIN, $g^s$ lets anyone test all one million PINs offline in
    a moment. Pedersen's commitments reveal nothing about $s$.

??? question "7. During a refresh, one holder deals a sharing of 5 instead of 0. What happens, and how do Feldman commitments stop it?"

    The shared secret silently becomes $s + 5$, and the old secret is lost. The
    commitments to a sharing of zero must have $C_0 = g^0 = 1$; everyone
    checks that, and that each received piece verifies.

??? question "8. A library draws t - 2 random coefficients instead of t - 1. Why do its tests, which check that any t shares rebuild the secret, still pass?"

    The polynomial has degree $t - 2$, and any $t$ points on it still
    interpolate to it (a polynomial of degree below $t$ is found exactly).
    Reconstruction works perfectly. The flaw is that $t - 1$ shares also
    rebuild it, which only a negative test catches.

??? question "9. A sharing was made with coefficients from Python's random module seeded with the Unix time to the second, during a known week. You hold one share and the public key g^s. How much work is the attack?"

    $7 \cdot 86{,}400 = 604{,}800$ seeds. For each, regenerate the
    coefficients, solve for $s$ from your share, and compare $g^s$ to the
    public key: about $6 \times 10^5$ exponentiations, seconds on a laptop.

??? question "10. A thief steals one share a year from a 3-of-5 sharing that is refreshed every year. Why are its three shares useless, and what changes if holders do not erase old shares?"

    Shares from different years lie on different polynomials through the
    same $f(0)$, so they do not interpolate to the secret (§2.7 gets 55, not
    42). If old shares are kept, they are still there to steal: the thief can
    later collect three shares of the *same* old polynomial from machines
    that kept them, and the refresh has protected nothing.

## What you learned

- In a $(t, n)$ threshold scheme any $t$ holders rebuild the secret and
  $t - 1$ learn nothing, by counting, not by hard problems.
- Additive and XOR sharing do $n$ of $n$; replicated sharing builds any
  threshold from them at a cost that grows fast.
- Shamir hides the secret at $f(0)$ of a random polynomial of degree $t - 1$;
  Lagrange weights rebuild it, and for $t - 1$ shares every secret has exactly
  one consistent polynomial. Blakley does the same with hyperplanes, with
  shares $t$ times larger.
- Feldman's commitments $g^{a_k}$ let holders check shares and catch a
  cheating dealer, but publish $g^s$; Pedersen's $g^{a_k} h^{b_k}$ hide the
  secret perfectly as long as nobody knows $\log_g h$.
- Proactive refresh adds sharings of zero so old and new shares never mix;
  share repair evaluates the polynomial at a lost holder's point.
- In practice (SLIP-39, the DNS root) the work is in digests, groups,
  key-encryption keys and independent holders; the failures are in weak or
  reused randomness, the wrong degree or ring, unchecked indices and the
  machine that splits or rebuilds.

**Next:** [Chapter 3](03-Commitments.md), sealing a choice now and opening it
later, which makes Pedersen's commitments a tool of their own.

## Further reading

- Adi Shamir, "How to Share a Secret", *Communications of the ACM* 22(11)
  (1979).
- George R. Blakley, "Safeguarding Cryptographic Keys", *Proceedings of the
  AFIPS National Computer Conference* 48 (1979).
- Robert J. McEliece and Dilip V. Sarwate, "On Sharing Secrets and
  Reed-Solomon Codes", *Communications of the ACM* 24(9) (1981).
- Ehud D. Karnin, Jonathan W. Greene and Martin E. Hellman, "On Secret Sharing
  Systems", *IEEE Transactions on Information Theory* 29(1) (1983).
- Benny Chor, Shafi Goldwasser, Silvio Micali and Baruch Awerbuch, "Verifiable
  Secret Sharing and Achieving Simultaneity in the Presence of Faults", FOCS
  1985.
- Paul Feldman, "A Practical Scheme for Non-interactive Verifiable Secret
  Sharing", FOCS 1987.
- Mitsuru Ito, Akira Saito and Takao Nishizeki, "Secret Sharing Scheme
  Realizing General Access Structure", Globecom 1987.
- Martin Tompa and Heather Woll, "How to Share a Secret with Cheaters",
  *Journal of Cryptology* 1(2) (1988).
- Torben P. Pedersen, "Non-Interactive and Information-Theoretic Secure
  Verifiable Secret Sharing", CRYPTO '91 (1992).
- Rafail Ostrovsky and Moti Yung, "How to Withstand Mobile Virus Attacks",
  PODC 1991.
- Amir Herzberg, Stanisław Jarecki, Hugo Krawczyk and Moti Yung, "Proactive
  Secret Sharing, or: How to Cope with Perpetual Leakage", CRYPTO '95.
- Hugo Krawczyk, "Secret Sharing Made Short", CRYPTO '93.
- Rosario Gennaro, Stanisław Jarecki, Hugo Krawczyk and Tal Rabin, "Secure
  Distributed Key Generation for Discrete-Log Based Cryptosystems",
  EUROCRYPT '99.
- Sai Krishna Deepak Maram et al., "CHURP: Dynamic-Committee Proactive Secret
  Sharing", ACM CCS 2019.
- SatoshiLabs, SLIP-0039, "Shamir's Secret-Sharing for Mnemonic Codes"
  (2017, final).
- Root Zone KSK Operator, *KSK Key Management Policy* v3.8 (2025) and
  *DNSSEC Practice Statement for the Root Zone KSK Operator* (IANA, current
  edition).
- Trail of Bits, "Disclosing Shamir's Secret Sharing vulnerabilities and
  announcing ZKDocs" (21 December 2021).
- RFC 9380, Hashing to Elliptic Curves (2023).
- Amos Beimel, "Secret-Sharing Schemes: A Survey", IWCC 2011: the best
  overview of general access structures and share size.
- In this shelf: [Mathematics, Chapter 11](../mathematics/11-Polynomials-at-Work.md)
  (interpolation, proofs, Reed-Solomon), [book 1, §23.2](../../book/23-Advanced-Protocols.md),
  and the reference page [Secret sharing](../../11-advanced/Secret-Sharing.md).
