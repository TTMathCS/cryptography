# 17. Information and Entropy

*How much secret is there in a secret? A 128-bit key has 128 bits if it was chosen
uniformly, and far fewer if it came from a clock, a process number or a person. In
1948 and 1949 Claude Shannon gave the tools to measure it: entropy, conditional
entropy and mutual information. With them he defined perfect secrecy, proved that
the one-time pad achieves it and that nothing cheaper can, and computed how much
ciphertext pins down a classical key. This chapter builds those ideas with proofs,
then turns to the measure that modern practice actually uses, min-entropy, because
an attacker guesses the most likely value first, and to the whole Rényi family of
entropies around it. It ends with extractors, which turn weak randomness into strong
keys (HKDF among them), with how operating systems gather, estimate and watch
entropy, and with how to measure a password honestly.*

!!! abstract "In this chapter"
    **You will learn:**

    - Shannon entropy, with a proof that the uniform distribution maximizes it and
      Shannon's own argument that no other formula will do;
    - joint and conditional entropy, the chain rule and mutual information;
    - perfect secrecy, and Shannon's theorem that it needs a key as long as the
      message, with proof, and his characterization of the ciphers that achieve it;
    - the redundancy of English and the unicity distance of classical ciphers,
      derived from the random-cipher model and tested on real text;
    - min-entropy, collision entropy and the Rényi family, guessing entropy, and the
      bounds of Massey and Arıkan that tie guesswork to entropy;
    - randomness extractors: von Neumann's trick, the leftover hash lemma (proved,
      then measured exactly) and HKDF's extract-then-expand, with the bits counted;
    - how the Linux kernel and NIST SP 800-90B gather and estimate entropy, and the
      statistics of the two health tests that watch a source in the field;
    - how to measure passwords with guessing curves instead of "bits" meters.

    **You need:** [Chapter 16](16-Probability.md) (probability, expectation,
    statistical distance) and logarithms base 2.

    **Levels:** §17.1 to §17.3 are for beginners, §17.4 to §17.6 and §17.10 are
    intermediate, §17.7 to §17.9 and §17.11 are expert.

## 17.1 The problem

*Level: beginner.*

In May 2008, Luciano Bello found that for almost two years, Debian's version of
OpenSSL had seeded its random number generator with little more than the process
number, which on Linux was at most 32,768. Every SSH and TLS key made on Debian and
Ubuntu systems in that time was one of only 32,767 possibilities for each key type,
size and processor architecture, and complete lists were published within days.
The keys were 1024 or 2048 bits long; the secret in them was about 15 bits.

The length of a key is not the amount of secret in it. That amount is measured by
entropy, and the right kind of entropy depends on the attack. This chapter defines
them and shows how to compute them.

## 17.2 Shannon entropy

*Level: beginner.*

A random variable $X$ taking value $x$ with probability $p(x)$ has **Shannon
entropy**

$$
H(X) = -\sum_x p(x) \log_2 p(x) = \mathbb{E}\left[\log_2 \frac{1}{p(X)}\right]
$$

bits (with $0 \log 0 = 0$). The quantity $\log_2(1/p(x))$ is the **surprise** of seeing
$x$: one bit for a fair coin landing heads, 10 bits for a one-in-1024 event. Entropy is
the average surprise, and Shannon's source coding theorem gives it a concrete
meaning: it is the minimum average number of bits per symbol needed to encode a long
stream of independent copies of $X$.

Basic facts:

- $H(X) \ge 0$, with equality only when $X$ is constant.
- If $X$ takes $n$ values, $H(X) \le \log_2 n$, with equality only for the uniform
  distribution.

**Proof of the bound.** By Jensen's inequality for the concave function $\log_2$,

$$
H(X) = \sum_x p(x) \log_2 \frac{1}{p(x)} \le \log_2 \sum_x p(x) \cdot \frac{1}{p(x)}
= \log_2 n,
$$

where the sum runs over the $n$ values with $p(x) > 0$. Equality in Jensen holds only
when $1/p(x)$ is constant, that is, for the uniform distribution. $\blacksquare$

### By hand

- A fair coin: $H = \frac{1}{2} \cdot 1 + \frac{1}{2} \cdot 1 = 1$ bit.
- A coin with $p = 0.9$: $H = 0.9 \log_2 \frac{1}{0.9} + 0.1 \log_2 10 \approx 0.9
  \cdot 0.152 + 0.1 \cdot 3.322 \approx 0.469$ bits.
- A fair die: $\log_2 6 \approx 2.585$ bits.
- A uniform 128-bit key: 128 bits.

### Code it

```python
# Shannon entropy H(X) = -sum p log2 p: fair and biased coins, a die, and English letters.
from math import log2, comb, sqrt, factorial
from fractions import Fraction

def H(probs):
    return -sum(p * log2(p) for p in probs if p > 0)

print(H([0.5, 0.5]), round(H([0.9, 0.1]), 4), round(H([1 / 6] * 6), 4))
english = {  # letter frequencies in percent (the widely used table derived from Lewand, 2000)
    'e': 12.70, 't': 9.06, 'a': 8.17, 'o': 7.51, 'i': 6.97, 'n': 6.75, 's': 6.33, 'h': 6.09,
    'r': 5.99, 'd': 4.25, 'l': 4.03, 'c': 2.78, 'u': 2.76, 'm': 2.41, 'w': 2.36, 'f': 2.23,
    'g': 2.02, 'y': 1.97, 'p': 1.93, 'b': 1.29, 'v': 0.98, 'k': 0.77, 'j': 0.15, 'x': 0.15,
    'q': 0.10, 'z': 0.07}
tot = sum(english.values())
pe = {c: v / tot for c, v in english.items()}
print(round(tot, 2), round(H(pe.values()), 3), round(log2(26), 3))
```

```text
1.0 0.469 2.585
99.82 4.172 4.7
```

The letters of English, taken one at a time with their usual frequencies (the table
sums to 99.82% because of rounding), have entropy about 4.17 bits, against 4.70 bits
for 26 equally likely letters. Single-letter frequencies are only the start of
English's predictability, as §17.5 shows.

### Where the formula comes from

Shannon published "A Mathematical Theory of Communication" in two parts, in the July
and October 1948 issues of the *Bell System Technical Journal*. He had worked on
secrecy systems at Bell Labs during the war, and his classified report of September
1945, "A Mathematical Theory of Cryptography", already used the same measure; the
communication theory and the secrecy theory grew up together, and he said later that
he could not separate them. The 1948 paper introduced the word **bit**, short for
binary digit, crediting it to John Tukey. The name *entropy* came from the formula of
the same shape in statistical mechanics (Boltzmann, Gibbs). The story that John von
Neumann urged the name on him, because nobody really knows what entropy is and so
in a debate you will always have the advantage, was told years later by Myron
Tribus; it may have been polished in the retelling.

Shannon did not simply choose the formula. He asked what a measure of uncertainty
$H(p_1, \dots, p_n)$ ought to satisfy and showed that three plain requirements force
it:

1. $H$ is continuous in the $p_i$.
2. For $n$ equally likely outcomes, $H$ grows with $n$: more equally likely choices
   means more uncertainty.
3. **Grouping.** If a choice is split into two successive choices, the original $H$
   is the first choice's $H$ plus the weighted $H$ of the second.

Theorem 2 of the 1948 paper: the only functions with all three properties are
$H = -K \sum_i p_i \log p_i$ with $K > 0$. Choosing logarithms base 2 and $K = 1$
gives bits.

**Grouping by hand.** Shannon's own example has probabilities $\frac12, \frac13,
\frac16$. Choose in two steps: first "the first outcome or not" (a fair coin), then,
half the time, one of the other two with probabilities $\frac23$ and $\frac13$.
Grouping says

$$
H\left(\tfrac12, \tfrac13, \tfrac16\right) = H\left(\tfrac12, \tfrac12\right)
+ \tfrac12 H\left(\tfrac23, \tfrac13\right).
$$

On the left, $0.5 + \frac13 \log_2 3 + \frac16 \log_2 6 = 0.5 + 0.5283 + 0.4308 =
1.4591$ bits. On the right, $H(\frac23, \frac13) = \frac23 \log_2 1.5 + \frac13
\log_2 3 = 0.3900 + 0.5283 = 0.9183$, so $1 + 0.4591 = 1.4591$ bits. The two agree, as
they must.

**Why only this formula (sketch).** Write $A(n)$ for the entropy of $n$ equally likely
outcomes. Choosing one of $st$ outcomes is the same as choosing one of $s$ groups and
then one of $t$ members, so grouping gives $A(st) = A(s) + A(t)$, and a growing
function with that property is $A(n) = K \log n$. Now take rational probabilities
$p_i = n_i / N$: choose one of $N$ equally likely outcomes, grouped in blocks of
sizes $n_i$. Grouping says $A(N) = H(p_1, \dots, p_n) + \sum_i p_i A(n_i)$, so

$$
H(p_1, \dots, p_n) = K \log N - \sum_i p_i K \log n_i = -K \sum_i p_i \log \frac{n_i}{N}.
$$

Continuity carries the formula from rational probabilities to all of them.
$\blacksquare$

The grouping rule is the one cryptography uses most, though it rarely goes by that
name: it is the chain rule of the next section, $H(X, Y) = H(X) + H(Y \mid X)$, for
the case where $X$ is the first choice and $Y$ the second.

## 17.3 Joint, conditional and mutual information

*Level: beginner.*

For two random variables, the **joint entropy** $H(X, Y)$ is the entropy of the pair.
The **conditional entropy** $H(Y \mid X) = \sum_x p(x) H(Y \mid X = x)$ is the average
uncertainty about $Y$ that remains after learning $X$. They fit together by the
**chain rule**:

$$
H(X, Y) = H(X) + H(Y \mid X).
$$

(Take logarithms in $p(x, y) = p(x)\,p(y \mid x)$ and average.) Conditioning never
increases entropy, $H(Y \mid X) \le H(Y)$, with equality exactly when $X$ and $Y$ are
independent.

The **mutual information** is how much one variable tells about the other:

$$
I(X; Y) = H(X) - H(X \mid Y) = H(Y) - H(Y \mid X) = H(X) + H(Y) - H(X, Y).
$$

It is symmetric, never negative, and zero exactly for independent variables. In
cryptography, $I(\text{message}; \text{ciphertext})$ is "how much the ciphertext
leaks".

### Code it

Let $X$ be the first of two dice and $Y$ the total.

```python
# Joint and conditional entropy, and mutual information, for two dice and their sum.
from collections import defaultdict
joint = defaultdict(Fraction)
for a in range(1, 7):
    for b in range(1, 7):
        joint[(a, a + b)] += Fraction(1, 36)       # X = first die, Y = the sum

def marginal(j, idx):
    m = defaultdict(Fraction)
    for k, p in j.items():
        m[k[idx]] += p
    return m

HX = H([float(p) for p in marginal(joint, 0).values()])
HY = H([float(p) for p in marginal(joint, 1).values()])
HXY = H([float(p) for p in joint.values()])
print(round(HX, 4), round(HY, 4), round(HXY, 4), round(HXY - HX, 4), round(HX + HY - HXY, 4))
```

```text
2.585 3.2744 5.1699 2.585 0.6894
```

$H(X) = 2.585$, $H(Y) = 3.274$ (the total ranges over 11 values, unevenly), $H(X, Y)
= 5.170$ (the pair determines both dice), $H(Y \mid X) = 2.585$ (given the first die,
the total is as uncertain as the second die), and $I(X; Y) = 0.689$ bits: knowing the
total tells you about seven tenths of a bit about the first die.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Two overlapping circles for H of X and H of Y: the left part is H of X given Y, the overlap is the mutual information, the right part is H of Y given X, and the whole is the joint entropy" fill="currentColor" font-size="13">
<circle cx="260" cy="110" r="90" class="soft-acc" fill="currentColor" fill-opacity=".15" stroke="currentColor" stroke-width="1.5"/>
<circle cx="380" cy="110" r="90" class="acc-fill" fill-opacity=".2" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="115" text-anchor="middle">H(X | Y)</text>
<text x="320" y="115" text-anchor="middle" class="acc">I(X; Y)</text>
<text x="425" y="115" text-anchor="middle">H(Y | X)</text>
<text x="190" y="20" text-anchor="middle">H(X)</text>
<text x="450" y="20" text-anchor="middle">H(Y)</text>
<text x="320" y="222" text-anchor="middle">the whole: H(X, Y) = H(X) + H(Y | X)</text>
</svg>
<figcaption>Figure 17.1. The entropies of two variables as areas. The overlap is the mutual information, what one variable says about the other. Perfect secrecy is the statement that the circles for the message and the ciphertext do not overlap at all.</figcaption>
</figure>

## 17.4 Perfect secrecy and Shannon's theorem

*Level: intermediate.*

Shannon's "Communication Theory of Secrecy Systems" (1949, from a classified report
of 1945) defined a cipher to be **perfectly secret** if the ciphertext tells nothing
about the message:

$$
\Pr[M = m \mid C = c] = \Pr[M = m] \quad\text{for all } m, c,
$$

equivalently $I(M; C) = 0$, or $H(M \mid C) = H(M)$.

**The one-time pad is perfectly secret.** Take messages, keys and ciphertexts in a
group $G$ (bits under XOR, letters under addition mod 26), the key $K$ uniform on $G$
and independent of $M$, and $C = M + K$. For any $m$ and $c$, $C = c$ given $M = m$
happens exactly when $K = c - m$, with probability $1/|G|$, whatever $m$ is. So $C$ is
independent of $M$. $\blacksquare$

!!! tip "Shannon's theorem"
    If a cipher is perfectly secret, then $H(K) \ge H(M)$. In particular, with a
    uniform key, the key must have at least as many bits as the message has
    entropy, and there must be at least as many keys as possible messages.

**Proof.** Decryption means that the key and the ciphertext determine the message:
$H(M \mid K, C) = 0$. Then

$$
H(M) = H(M \mid C) \le H(M, K \mid C) = H(K \mid C) + H(M \mid K, C) = H(K \mid C)
\le H(K).
$$

The first equality is perfect secrecy; the inequalities say that adding a variable
cannot reduce uncertainty and that conditioning cannot increase it; the middle step
is the chain rule. $\blacksquare$

So perfect secrecy is possible but expensive: as much key as message, used once.
Every practical cipher gives it up and settles for computational security, a small
key stretched by an algorithm that no feasible computation can tell from random.

### Code it

One English letter under a shift cipher with a fresh uniform key: the mutual
information is exactly 0. Two letters under the *same* key: the ciphertext leaks
the difference between the letters.

```python
# Perfect secrecy: the shift cipher with a fresh uniform key per letter leaks nothing (I(M;C) = 0);
# reuse one key for two letters and the ciphertext reveals the difference of the letters.
def mutual_info(pairs):
    j = defaultdict(Fraction)
    for (m, c), p in pairs.items():
        j[(m, c)] += p
    HM = H([float(p) for p in marginal(j, 0).values()])
    HC = H([float(p) for p in marginal(j, 1).values()])
    return HM + HC - H([float(p) for p in j.values()])

letters = list(pe)
one = defaultdict(Fraction)
for m in letters:
    pm = Fraction(english[m]).limit_denominator(10**6) / Fraction(tot).limit_denominator(10**6)
    for k in range(26):
        c = (ord(m) - 97 + k) % 26
        one[(m, c)] += pm / 26
print(round(mutual_info(one), 10))

two = defaultdict(Fraction)
for m1 in letters:
    for m2 in letters:
        pm = Fraction(pe[m1]).limit_denominator(10**5) * Fraction(pe[m2]).limit_denominator(10**5)
        for k in range(26):
            c = ((ord(m1) - 97 + k) % 26, (ord(m2) - 97 + k) % 26)
            two[((m1, m2), c)] += pm / 26
print(round(mutual_info(two), 3), round(H([float(p) for p in marginal(two, 0).values()]), 3))
```

```text
0.0
4.68 8.343
```

With a reused key, the ciphertext pair leaks 4.68 of the 8.34 bits in a pair of
English letters: more than half. That is the two-time pad, and it is what the US
Army's Venona project exploited from 1943 on, when it found that Soviet one-time pad
pages had been printed more than once (*Cryptanalysis*
[chapter 3](../cryptanalysis/03-Machines-and-the-War.md) tells the story).

### Shannon's characterization

Shannon proved more for the tightest case, where there are exactly as many keys as
messages and as ciphertexts. Suppose $|\mathcal{M}| = |\mathcal{K}| = |\mathcal{C}|$,
every message has positive probability and every ciphertext can occur. Then the
cipher is perfectly secret if and only if

1. every key is used with probability $1/|\mathcal{K}|$, and
2. for every message $m$ and ciphertext $c$ there is exactly one key that encrypts
   $m$ to $c$.

**Proof.** Suppose the cipher is perfectly secret, and fix $m$. For every ciphertext
$c$, $\Pr[C = c \mid M = m] = \Pr[C = c] > 0$, so some key sends $m$ to $c$. A key
sends $m$ to only one ciphertext, so the keys sending $m$ to the $|\mathcal{C}|$
different ciphertexts are all different; with $|\mathcal{K}| = |\mathcal{C}|$, each
$c$ gets exactly one key, which is condition 2. Now fix $c$ and write $k_m$ for the
key sending $m$ to $c$. Different messages need different keys here (one key cannot
decrypt $c$ two ways), so as $m$ runs over all messages, $k_m$ runs over all keys.
Then $\Pr[K = k_m] = \Pr[C = c \mid M = m] = \Pr[C = c]$ is the same for every key,
which is condition 1. The converse is the one-time pad argument above.
$\blacksquare$

A table with one key per (message, ciphertext) pair is a **Latin square**: every row
and every column contains each symbol once. The one-time pad is the Latin square of
a group's addition table, and the theorem says that every perfectly secret cipher of
this size is a Latin square used with uniform keys; most Latin squares are not group
tables, but they all work.

**By hand: a Latin square with a bad key.** Three messages $a, b, c$, three
ciphertexts $x, y, z$, three keys:

| key | $a$ | $b$ | $c$ |
|---|---|---|---|
| 1 | $x$ | $y$ | $z$ |
| 2 | $y$ | $z$ | $x$ |
| 3 | $z$ | $x$ | $y$ |

Condition 2 holds. Let the messages have probabilities $\frac12, \frac14, \frac14$
and suppose a careless key generator picks key 1 half the time and keys 2 and 3 a
quarter of the time each. Ciphertext $x$ comes from $a$ under key 1, from $b$ under
key 3 and from $c$ under key 2, so

$$
\Pr[C = x] = \tfrac12 \cdot \tfrac12 + \tfrac14 \cdot \tfrac14 + \tfrac14 \cdot
\tfrac14 = \tfrac38, \qquad \Pr[M = a \mid C = x] = \frac{\frac12 \cdot
\frac12}{\frac38} = \frac23.
$$

Seeing $x$ raises the chance of $a$ from $\frac12$ to $\frac23$: a leak, from
condition 1 alone. With uniform keys every term is $\frac13 \cdot \Pr[M = m]$, the
sum is $\frac13$, and the posterior is back to $\frac12$.

### What perfect secrecy does not promise

Perfect secrecy is a statement about what the ciphertext *reveals*, and nothing
else. The one-time pad is **malleable**: flipping bit $i$ of the ciphertext flips
bit $i$ of the plaintext. An attacker who knows that a message has the form
`PAY 0100` and where the amount sits can turn it into `PAY 9100` by adding the
difference of the two strings into the ciphertext, without learning anything about
the key and without contradicting Shannon's definition. The pad also shows the
length of the message, which is why the definition fixes a message space of one
length. Integrity needs a separate tool. It too can be had unconditionally: Mark
Wegman and Larry Carter showed in 1981 that a key used once for a universal hash
gives a one-time MAC that no one, however powerful, forges with probability above
$1/q$ when the hash family is strongly universal with $q$ possible tags. The same universal hash families
come back in §17.7 as extractors.

## 17.5 Redundancy and the unicity distance

*Level: intermediate.*

Real messages are predictable. Shannon estimated in 1951, by asking people to guess
the next letter of a text, that English carries roughly 0.6 to 1.3 bits per letter
once all context is used, against $\log_2 26 \approx 4.70$ for random letters. The
difference is the **redundancy** per letter, $D = \log_2 26 - H_L$, about 3.2 bits
if we take $H_L = 1.5$.

Redundancy is what lets a cryptanalyst recognize the right key. Shannon argued that a
ciphertext of $n$ letters is consistent with about $2^{H(K) - nD}$ keys besides the
true one, so the ambiguity disappears around the **unicity distance**

$$
U = \frac{H(K)}{D}.
$$

```python
# Unicity distance U = H(K) / D, where D is the redundancy per letter of the language.
H_L = 1.5                                       # a common estimate of English entropy, bits/letter
D = log2(26) - H_L
for name, keybits in (("shift (Caesar)", log2(26)), ("Vigenere, key length 10", 10 * log2(26)),
                      ("simple substitution", log2(factorial(26))), ("AES-128", 128), ("AES-256", 256)):
    print(name, round(keybits, 1), round(keybits / D, 1))
```

```text
shift (Caesar) 4.7 1.5
Vigenere, key length 10 47.0 14.7
simple substitution 88.4 27.6
AES-128 128 40.0
AES-256 256 80.0
```

A shift cipher is determined by about 1.5 letters (in practice a few more); a
Vigenère cipher with a 10-letter key by about 15; a simple substitution, with
$\log_2 26! \approx 88.4$ bits of key, by about 28 letters, matching the experience of
puzzle solvers. For AES-128 the formula gives 40 letters of English: in principle, 40
letters of ciphertext determine the key. That is *information*, not *computation*: the
key is determined, but finding it still takes $2^{128}$ work. Unicity distance
explains why every classical cipher could be broken given enough text, and why
modern security had to be defined computationally.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The expected number of wrong keys consistent with a ciphertext, on a log scale, falling linearly with the ciphertext length for simple substitution, reaching one near 28 letters" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="80" y1="210" x2="610" y2="210"/><line x1="80" y1="210" x2="80" y2="20"/></g>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M80.0 33.2 L466.4 209.9 L570.0 210.0"/>
<circle cx="466.6" cy="210" r="5" class="acc-fill"/>
<text x="474.6" y="196" font-size="12">U ≈ 28 letters</text>
<text x="72" y="214.0" text-anchor="end" font-size="12">2⁰</text>
<text x="72" y="174.0" text-anchor="end" font-size="12">2²⁰</text>
<text x="72" y="134.0" text-anchor="end" font-size="12">2⁴⁰</text>
<text x="72" y="94.0" text-anchor="end" font-size="12">2⁶⁰</text>
<text x="72" y="54.0" text-anchor="end" font-size="12">2⁸⁰</text>
<text x="80.0" y="230" text-anchor="middle">0</text>
<text x="220.0" y="230" text-anchor="middle">10</text>
<text x="360.0" y="230" text-anchor="middle">20</text>
<text x="500.0" y="230" text-anchor="middle">30</text>
<text x="318.0" y="248" text-anchor="middle" font-size="12">letters of ciphertext n</text>
<text x="96" y="30" font-size="12">wrong keys still consistent (log scale)</text>
</svg>
<figcaption>Figure 17.2. Shannon's spurious keys for simple substitution: about 2^(H(K) − nD) wrong keys remain consistent with n letters of English ciphertext, with H(K) ≈ 88.4 bits and D ≈ 3.2 bits per letter. The count falls by a factor of about 9 per letter and reaches 1 near 28 letters, the unicity distance.</figcaption>
</figure>

### Where the formula comes from: the random cipher

Shannon's estimate, and Martin Hellman's sharper treatment of 1977, rest on a model:
pretend that each wrong key decrypts the ciphertext to a uniformly random string of
$n$ letters. Of the $26^n$ strings of length $n$, only about $2^{n H_L}$ read as
English; that is what "$H_L$ bits per letter" means, and the source coding theorem of
§17.2 makes it precise (these are the *typical* strings). So a wrong key produces
plausible English with probability

$$
\frac{2^{n H_L}}{26^n} = 2^{-n(\log_2 26 - H_L)} = 2^{-nD},
$$

and the expected number of **spurious keys**, wrong keys whose decryption still reads
as English, is

$$
s_n \approx (|\mathcal{K}| - 1)\, 2^{-nD}.
$$

Setting $s_n = 1$ gives $n = \log_2 |\mathcal{K}| / D$, the unicity distance, for a
uniform key.

**By hand for simple substitution.** $|\mathcal{K}| = 26! \approx 4.03 \times
10^{26} \approx 2^{88.4}$, and $D = 4.70 - 1.5 = 3.2$ bits per letter. Then:

| letters $n$ | $88.4 - 3.2n$ | spurious keys $s_n$ |
|---|---|---|
| 10 | 56.4 | $2^{56.4} \approx 10^{17}$ |
| 20 | 24.4 | $2^{24.4} \approx 2.2 \times 10^{7}$ |
| 25 | 8.4 | $2^{8.4} \approx 340$ |
| 28 | $-1.2$ | $2^{-1.2} \approx 0.44$ |
| 30 | $-7.6$ | $2^{-7.6} \approx 0.005$ |

Twenty letters of a newspaper cryptogram still fit some twenty million keys that give
English; between 25 and 30 letters the count collapses through 1. That is the 28 of
the table above, and it matches what puzzle solvers know: very short cryptograms have
several good answers, long ones have one.

Three cautions keep the formula honest. First, $U$ says when the answer becomes
*unique*, not when a solver *finds* it; finding it is a search, and a human or a
program may need more text to steer that search. Second, the random-cipher model
fits a substitution cipher reasonably and a Vigenère cipher of known period less
well, so the number is a guide, not a theorem. Third, and most useful, $D$ is the
redundancy *the attacker can exploit*. Compressing a message before encrypting it
removes redundancy and raises $U$, which is why Shannon recommended it, and an
attacker who models the language poorly works with a smaller $D$ and needs more
text. The next listing measures that last effect.

### Code it: the redundancy an attacker can use

A solver who scores candidate decryptions only by single-letter frequencies uses
the redundancy of the letter table of §17.2 and nothing more: $D_1 = \log_2 26 -
4.17 \approx 0.53$ bits per letter. For a shift cipher, with $\log_2 26 \approx 4.70$
bits of key, that predicts a unicity distance of about $4.70 / 0.53 \approx 8.9$
letters. The listing slides a window of $n$ letters along a short English passage,
tries all 26 shifts of each window, and counts how often the true one scores best.

```python
# Unicity with a weaker model: a solver who scores a shift-cipher decryption only by
# single-letter frequencies.  How often is the true shift the best-scoring one?
text = """the colony keeps its oldest records in a vault cut into the rock below the main
dome where the temperature hardly changes from one season to the next the first
settlers wrote their notes by hand and the archivists who came later copied every page
twice once onto film and once into the library so that a fire or a fault in the power
would not take the only copy with it visitors are welcome on the first day of each
month when the doors open at noon and a guide walks them through the long hall of maps"""
plain = [ord(c) - 97 for c in text if c.isalpha()]
logp = [log2(pe[chr(97 + i)]) for i in range(26)]
D1 = log2(26) - H(pe.values())
print(len(plain), round(D1, 3), round(log2(26) / D1, 1))
for n in (2, 4, 6, 9, 12, 16, 24, 32):
    wins = trials = 0
    for start in range(len(plain) - n + 1):
        window = plain[start:start + n]
        scores = [sum(logp[(x + s) % 26] for x in window) for s in range(26)]
        wins += scores[0] > max(scores[1:])          # shift 0 is the true decryption
        trials += 1
    print(n, round(wins / trials, 3))
```

It prints the passage length, $D_1$, the predicted distance, then the success rate for each window length:

```text
404 0.529 8.9
2 0.211
4 0.446
6 0.632
9 0.841
12 0.944
16 0.987
24 1.0
32 1.0
```

With two letters the single-letter scorer picks the right shift a fifth of the time;
at 9 letters, the predicted unicity distance, it is right 84% of the time; by 16
letters, 99%; at 24, always. The crossover sits where the formula puts it, for this
attacker's model. A solver who also uses pairs and common words has a larger $D$
and needs fewer letters, which is why a trained eye reads a Caesar cipher off three
or four letters of ciphertext.

## 17.6 Min-entropy and guessing

*Level: intermediate.*

Shannon entropy is an average, and an attacker does not care about averages. Suppose
a key generator outputs the all-zero key half the time and a uniform 100-bit key
otherwise. Its Shannon entropy is $\frac{1}{2} \cdot 1 + \frac{1}{2}(1 + 100) = 51$
bits, which sounds respectable; but one guess succeeds half the time.

The measure for a single guess is **min-entropy**:

$$
H_\infty(X) = -\log_2 \max_x p(x).
$$

An attacker's best single guess succeeds with probability exactly $2^{-H_\infty}$.
Always $H_\infty(X) \le H(X)$, with equality for uniform distributions. The skewed
generator has $H_\infty = 1$ bit. For many guesses, the **guessing entropy** (James
Massey, 1994), the expected number of guesses when trying values from most to least
likely, is the right measure.

### Passwords

Human passwords follow something like Zipf's law: the $r$-th most popular password
has probability roughly proportional to $1/r$. In the RockYou leak of 2009, about
32 million plaintext passwords, the most common one, `123456`, was used by about
290,000 accounts, close to 1%: a min-entropy near 7 bits for the whole population,
whatever the length rules.

```python
# Min-entropy H_inf = -log2 max p: the measure for guessing.  Shannon entropy can hide a weak point.
def H_min(probs):
    return -log2(max(probs))

def guessing_entropy(probs):
    """Expected number of guesses, trying values in decreasing order of probability (Massey 1994)."""
    ps = sorted(probs, reverse=True)
    return sum((i + 1) * p for i, p in enumerate(ps))

skewed_shannon = 0.5 * 1 + 0.5 * (1 + 100)      # p = 1/2 for one value, 1/2 spread over 2^100 others
print(skewed_shannon, H_min([0.5]))
zipf_n, s_exp = 10**5, 1.0                      # a Zipf model of human passwords
weights = [1 / (r ** s_exp) for r in range(1, zipf_n + 1)]
Z = sum(weights)
zipf = [w / Z for w in weights]
print(round(H(zipf), 2), round(H_min(zipf), 2), round(log2(guessing_entropy(zipf)), 2), round(log2(zipf_n), 2))
for k in (1, 10, 100, 1000):
    print(k, round(sum(zipf[:k]), 3))
```

```text
51.0 1.0
11.5 3.6 13.01 16.61
1 0.083
10 0.242
100 0.429
1000 0.619
```

For a Zipf model with 100,000 passwords, the Shannon entropy is 11.5 bits, the
min-entropy only 3.6 bits, and the expected number of guesses about $2^{13}$; the top
10 passwords cover 24% of users, the top 1,000 cover 62%. Uniform choice over the same
100,000 values would give 16.6 bits on every measure. This is why NIST's SP 800-63B
(2017) dropped composition rules ("one digit, one symbol") in favor of checking new
passwords against lists of common and breached ones, and why passwords must be
stretched by slow hashing before they are used as keys.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The fraction of accounts broken against the number of guesses on a log scale, for a Zipf-like password distribution and for uniform choice: the Zipf curve rises quickly to 62 percent at 1000 guesses while the uniform line stays near 1 percent" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="80" y1="210" x2="610" y2="210"/><line x1="80" y1="210" x2="80" y2="20"/></g>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M80.0 195.1 L110.1 187.7 L127.7 182.7 L191.4 162.7 L269.8 136.3 L580.0 30.0"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" d="M80.0 210.0 L292.4 209.8 L370.0 208.6 L402.5 207.0 L432.5 204.0 L455.0 199.9 L472.5 194.9 L485.0 189.8 L492.5 186.0 L500.0 181.5 L510.0 174.1 L517.5 167.3 L525.0 159.3 L530.0 153.1 L537.5 142.4 L545.0 129.6 L550.0 119.8 L560.0 96.4 L570.0 67.0 L580.0 30.0"/>
<text x="80.0" y="230" text-anchor="middle" font-size="12">1</text>
<text x="180.0" y="230" text-anchor="middle" font-size="12">10</text>
<text x="280.0" y="230" text-anchor="middle" font-size="12">100</text>
<text x="380.0" y="230" text-anchor="middle" font-size="12">1,000</text>
<text x="480.0" y="230" text-anchor="middle" font-size="12">10,000</text>
<text x="580.0" y="230" text-anchor="middle" font-size="12">100,000</text>
<text x="72" y="214.0" text-anchor="end" font-size="12">0%</text>
<text x="72" y="124.0" text-anchor="end" font-size="12">50%</text>
<text x="72" y="34.0" text-anchor="end" font-size="12">100%</text>
<circle cx="380.0" cy="98.6" r="5" class="acc-fill"/>
<text x="240.0" y="84.6" font-size="12">1,000 guesses: 62%</text>
<text x="190.0" y="192.0" font-size="12">dashed: uniform choice, 1% at 1,000</text>
<text x="330.0" y="248" text-anchor="middle" font-size="12">number of guesses (log scale)</text>
</svg>
<figcaption>Figure 17.3. Guessing human-chosen secrets. With a Zipf-like distribution over 100,000 passwords, 1,000 guesses break 62% of accounts; with uniform choice over the same 100,000 values they break 1%. Min-entropy and guessing entropy see the difference; Shannon entropy hides much of it.</figcaption>
</figure>

### The Rényi family

Shannon entropy and min-entropy are two members of one family. Alfréd Rényi defined
in 1961, for $\alpha \ge 0$ and $\alpha \ne 1$, the **Rényi entropy of order
$\alpha$**

$$
H_\alpha(X) = \frac{1}{1 - \alpha} \log_2 \sum_x p(x)^\alpha .
$$

Four orders matter in cryptography:

- $H_0 = \log_2 |\{x : p(x) > 0\}|$, the **Hartley entropy**: the logarithm of the
  number of possible values, which is all a "key length" says.
- $H_1 = \lim_{\alpha \to 1} H_\alpha$ is Shannon entropy (l'Hôpital's rule on the
  formula gives $-\sum p \log_2 p$).
- $H_2 = -\log_2 \sum_x p(x)^2$, the **collision entropy**. The sum is the chance
  that two independent draws are equal, so $2^{-H_2}$ is the probability that two
  users chosen at random have the same password, or that two devices booted from the
  same image generate the same key.
- $H_\infty = \lim_{\alpha \to \infty} H_\alpha = -\log_2 \max_x p(x)$, min-entropy.

$H_\alpha$ never increases with $\alpha$, so $H_0 \ge H_1 \ge H_2 \ge H_\infty$,
with equality throughout exactly for uniform distributions. Larger orders weight the
most likely values more, which is why min-entropy, the largest order, is the
pessimist of the family.

Collision entropy and min-entropy are never far apart:

$$
H_\infty(X) \le H_2(X) \le 2 H_\infty(X).
$$

**Proof.** Write $p_{\max}$ for the largest probability. On one side, $\sum p(x)^2
\le \sum p(x)\, p_{\max} = p_{\max}$; on the other, $\sum p(x)^2 \ge p_{\max}^2$.
Take $-\log_2$ of $p_{\max}^2 \le \sum p(x)^2 \le p_{\max}$. $\blacksquare$

No such sandwich holds for Shannon entropy: the skewed generator at the start of this
section has $H_1 = 51$ bits but $H_2 \approx 2$ bits and $H_\infty = 1$ bit. Shannon
entropy can be large while the others are tiny, and only the others bound an
attacker's chances.

**By hand.** For the source A, B, C with probabilities $\frac12, \frac14, \frac14$:
$H_0 = \log_2 3 \approx 1.585$, $H_1 = 1.5$, $H_2 = -\log_2(\frac14 + \frac1{16} +
\frac1{16}) = -\log_2 \frac38 \approx 1.415$ and $H_\infty = 1$ bits. The order holds,
and $1 \le 1.415 \le 2$.

### Code it: the family on the password model

The same Zipf model of 100,000 passwords as above, against uniform choice over the
same set:

```python
# Uses H, H_min, zipf and zipf_n from the listings above.
# The Renyi family H_a = log2(sum p^a) / (1 - a), on the Zipf password model and on uniform choice.
def renyi(probs, a):
    if a == 1:
        return H(probs)
    if a == "inf":
        return H_min(probs)
    return log2(sum(q ** a for q in probs if q > 0)) / (1 - a)

uniform = [1 / zipf_n] * zipf_n
print("alpha    Zipf   uniform")
for a in (0, 0.5, 1, 2, "inf"):
    print(str(a).ljust(6), round(renyi(zipf, a), 2), round(renyi(uniform, a), 2))
coll = sum(q * q for q in zipf)                  # chance that two random users share a password
print(round(coll, 5), round(1 / coll), H_min(zipf) <= renyi(zipf, 2) <= 2 * H_min(zipf))
```

It prints:

```text
alpha    Zipf   uniform
0      16.61 16.61
0.5    15.01 16.61
1      11.5 16.61
2      6.47 16.61
inf    3.6 16.61
0.01125 89 True
```

The uniform distribution scores 16.61 bits at every order. The Zipf model falls from
16.61 bits (there are 100,000 passwords) through 15.0, 11.5 and 6.5 to 3.6 bits as the
order rises. Two random users of this population share a password with probability
about 1.1%, one pair in 89, and the sandwich $H_\infty \le H_2 \le 2H_\infty$ holds.
A key-length-style statement ("16.6 bits") and the attacker's view ("3.6 bits for one
guess") differ by a factor of 8,000 in success probability.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Renyi entropy of the Zipf password model against the order alpha: it starts at 16.6 bits at alpha 0, falls to 15.0 at one half, 11.5 at 1 and 6.5 at 2, and levels off toward the min-entropy of 3.6 bits; uniform choice stays at 16.6 bits for every order" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="80" y1="210" x2="610" y2="210"/><line x1="80" y1="210" x2="80" y2="20"/></g>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" d="M80 43.9 L600 43.9"/>
<path fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" d="M80 174.0 L600 174.0"/>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M80.0 43.9 L88.7 46.2 L97.3 48.9 L106.0 52.0 L114.7 55.6 L123.3 59.9 L132.0 65.1 L140.7 71.2 L149.3 78.3 L158.0 86.4 L166.7 95.0 L175.3 103.7 L184.0 111.7 L192.7 118.7 L201.3 124.7 L210.0 129.8 L218.7 134.0 L227.3 137.5 L236.0 140.5 L244.7 143.1 L253.3 145.3 L275.0 149.6 L296.7 152.9 L318.3 155.4 L340.0 157.4 L361.7 159.0 L383.3 160.3 L405.0 161.5 L426.7 162.4 L448.3 163.3 L470.0 164.0 L491.7 164.6 L513.3 165.2 L535.0 165.7 L556.7 166.1 L578.3 166.5 L600.0 166.9"/>
<circle cx="80.0" cy="43.9" r="4.5" class="acc-fill"/>
<circle cx="123.3" cy="59.9" r="4.5" class="acc-fill"/>
<circle cx="166.7" cy="95.0" r="4.5" class="acc-fill"/>
<circle cx="253.3" cy="145.3" r="4.5" class="acc-fill"/>
<text x="131" y="56" font-size="12">H½ = 15.0</text>
<text x="174" y="92" font-size="12">H₁ = 11.5 (Shannon)</text>
<text x="261" y="140" font-size="12">H₂ = 6.5 (collision)</text>
<text x="596" y="192" text-anchor="end" font-size="12">H∞ = 3.6 (min-entropy)</text>
<text x="596" y="36" text-anchor="end" font-size="12">uniform over 100,000: 16.6 at every order</text>
<text x="72" y="214" text-anchor="end" font-size="12">0</text>
<text x="72" y="134" text-anchor="end" font-size="12">8</text>
<text x="72" y="54" text-anchor="end" font-size="12">16</text>
<text x="80" y="230" text-anchor="middle" font-size="12">0</text>
<text x="166.7" y="230" text-anchor="middle" font-size="12">1</text>
<text x="253.3" y="230" text-anchor="middle" font-size="12">2</text>
<text x="340" y="230" text-anchor="middle" font-size="12">3</text>
<text x="426.7" y="230" text-anchor="middle" font-size="12">4</text>
<text x="513.3" y="230" text-anchor="middle" font-size="12">5</text>
<text x="600" y="230" text-anchor="middle" font-size="12">6</text>
<text x="340" y="248" text-anchor="middle" font-size="12">order α</text>
<text x="88" y="20" font-size="12">bits</text>
</svg>
<figcaption>Figure 17.4. The Rényi entropies of the Zipf password model. Order 0 counts the possible values, order 1 is Shannon entropy, order 2 is collision entropy, and as the order grows the curve sinks to the min-entropy, the only one that bounds a single guess. A uniform choice would be a flat line.</figcaption>
</figure>

### Guesswork is not entropy

An attacker who may guess many times wants the **guesswork** $G(X)$, the expected
number of guesses when values are tried from most to least likely; it is the
"guessing entropy" of the listing above. James Massey asked in 1994 how $G$ relates
to Shannon entropy, because textbooks of the time treated $2^{H}$ as the work of a
brute-force search. His answer was half encouraging. There is a lower bound:

$$
G(X) \ge 2^{H(X) - 2} + 1 \quad\text{whenever } H(X) \ge 2 \text{ bits},
$$

but there is no useful upper bound: a distribution can have tiny Shannon entropy and
enormous guesswork, if a small probability is spread over a huge number of values.

Erdal Arıkan found in 1996 the entropy that does pin guesswork down, and it is the
Rényi entropy of order $\frac12$:

$$
\frac{2^{H_{1/2}(X)}}{1 + \ln N} \;\le\; G(X) \;\le\; 2^{H_{1/2}(X)}
= \Big(\sum_x \sqrt{p(x)}\Big)^2 ,
$$

where $N$ is the number of possible values. The upper bound has a two-line proof.
Number the values in decreasing order of probability. The value $x$ in position
$G(x)$ is preceded only by values $x'$ at least as likely, each with $\sqrt{p(x') /
p(x)} \ge 1$, so $G(x) \le \sum_{x'} \sqrt{p(x')/p(x)}$. Average over $x$:

$$
G(X) = \sum_x p(x)\, G(x) \le \sum_x p(x) \sum_{x'} \frac{\sqrt{p(x')}}{\sqrt{p(x)}}
= \sum_x \sqrt{p(x)} \sum_{x'} \sqrt{p(x')} = \Big(\sum_x \sqrt{p(x)}\Big)^2 .
\;\blacksquare
$$

Arıkan's bounds are sharper than they look for long strings: for $n$ independent
symbols, $\log_2 G$ grows like $n H_{1/2}$ per symbol, not $n H_1$. Guessing a
sequence of biased bits is harder than its Shannon entropy suggests, but easier
than its length suggests.

John Pliam made the last point in 2000. Expected guesswork answers "how long, on
average, until this one secret falls?" An attacker against many accounts asks
instead "how many guesses until a fraction $\alpha$ of them falls?", the
**marginal guesswork** $w_\alpha$. Pliam showed that these and entropy are
incomparable: none bounds the others in general. The skewed key generator of this
section is the extreme case. Its guesswork is about $2^{98}$, because half the time
the key is uniform over $2^{100}$ values; its marginal guesswork for $\alpha =
\frac12$ is one guess; its Shannon entropy is 51 bits. Three honest numbers, three
different questions.

### Code it: the bounds on the password model

```python
# Uses H, guessing_entropy, renyi, zipf and zipf_n from the listings above.
# Guesswork against entropy: Massey's lower bound, Arikan's bounds from H_1/2,
# and Pliam's point that "how long on average" and "how likely after w guesses" differ.
from math import log
G = guessing_entropy(zipf)
massey = 2 ** (H(zipf) - 2) + 1                  # Massey 1994, valid when H >= 2 bits
arikan_up = 2 ** renyi(zipf, 0.5)                # (sum sqrt p)^2, an upper bound on E[G]
arikan_low = arikan_up / (1 + log(zipf_n))       # Arikan 1996 lower bound
print(round(massey), round(arikan_low), round(G), round(arikan_up))

# The skewed key generator of this section: the zero key half the time, else uniform on 2^100.
EG_skewed = 0.5 * 1 + 0.5 * (1 + (2**100 + 1) / 2)   # guess the zero key, then all the others
print(round(log2(EG_skewed), 2), "bits of guesswork; one guess wins with probability", 0.5)
```

It prints:

```text
723 2632 8271 32932
98.0 bits of guesswork; one guess wins with probability 0.5
```

For the Zipf model, Massey's bound promises at least 723 guesses on average, Arıkan's
bounds put the true value between 2,632 and 32,932, and it is 8,271 (the $2^{13}$ of
the earlier listing). The skewed generator needs about $2^{98}$ guesses on average,
and half the time it needs one. §17.10 turns these ideas into the curves that
password researchers draw.

## 17.7 Extractors

*Level: expert.*

Physical sources (clock jitter, disk timings, thermal noise) give bits that are
biased and correlated. An **extractor** turns such a source into nearly uniform bits.

**Von Neumann's trick** (1951). For independent coin flips with an unknown bias $p$,
read the flips in pairs and output 0 for "01", 1 for "10", nothing for "00" or "11".
Since $\Pr[01] = \Pr[10] = p(1 - p)$, every output bit is exactly unbiased. The cost
is the rate: $p(1-p)$ output bits per input bit.

```python
# Uses H from the first listing.
# Extractors.  Von Neumann (1951): from independent coins with unknown bias p, read pairs:
# 01 -> 0, 10 -> 1, 00 and 11 -> nothing.  The output is exactly unbiased.
import random
rng = random.Random(17)
p = 0.8
raw = [int(rng.random() < p) for _ in range(200_000)]
out = [a for a, b in zip(raw[::2], raw[1::2]) if a != b]
print(round(sum(raw) / len(raw), 4), len(out), round(sum(out) / len(out), 4), round(len(out) / len(raw), 4), p * (1 - p), round(H([p, 1 - p]), 3))
```

```text
0.8001 32002 0.5018 0.16 0.15999999999999998 0.722
```

From 200,000 flips with bias 0.8, the extractor produced 32,002 bits with 50.18%
ones, a rate of 0.16 output bits per input bit, as predicted. The last number is the
Shannon entropy of one input flip, 0.722 bits: von Neumann's method keeps less than a
quarter of what is there. Peter Elias (1972) and Yuval Peres (1992) showed how to
reuse the discarded pairs, and Peres's iterated version approaches the full 0.722
bits per flip.

Von Neumann's method needs independence. For a general source with min-entropy $k$,
no single deterministic function works: Miklos Santha and Umesh Vazirani showed in
1986 that for every deterministic extractor there are sources it fails on. The way
out is a short public random **seed**.

!!! tip "The leftover hash lemma (Impagliazzo, Levin and Luby, 1989)"
    Let $X$ have min-entropy at least $k$, and let $h$ be chosen at random from a
    universal family of hash functions to $m$ bits (for $x \ne y$, $\Pr_h[h(x) =
    h(y)] \le 2^{-m}$). Then the pair $(h, h(X))$ is within statistical distance
    $\frac{1}{2}\sqrt{2^{m-k}}$ of $(h, U_m)$, with $U_m$ uniform.

So from $k$ bits of min-entropy one can extract $m = k - 2\log_2(1/\epsilon)$ nearly
uniform bits, with error $\epsilon$. The proof bounds the *collision probability*
of $(h, h(X))$, which is at most $\frac{1}{|\mathcal{H}|}(2^{-k} + 2^{-m})$, and turns
that into a distance from uniform with the Cauchy-Schwarz inequality.

### Code it: the leftover hash lemma, measured

A source uniform on 256 of the 4,096 12-bit strings ($k = 8$), hashed by random
$GF(2)$-linear maps (a universal family) to $m$ bits. For each $m$ we average the
exact statistical distance over 200 random hashes and compare it with the bound.

```python
# The leftover hash lemma, measured exactly: a source uniform on 2^k of the 2^n strings,
# hashed to m bits by a random GF(2)-linear map, is within (1/2) sqrt(2^m / 2^k) of uniform on average.
n_bits, k_bits = 12, 8
source = rng.sample(range(2**n_bits), 2**k_bits)

def random_linear_hash(m):
    rows = [rng.getrandbits(n_bits) for _ in range(m)]
    return lambda x: sum(((bin(r & x).count("1") & 1) << i) for i, r in enumerate(rows))

for m in (2, 4, 6, 8):
    dists = []
    for _ in range(200):
        h = random_linear_hash(m)
        counts = defaultdict(int)
        for x in source:
            counts[h(x)] += 1
        d = sum(abs(counts.get(y, 0) / 2**k_bits - 1 / 2**m) for y in range(2**m)) / 2
        dists.append(d)
    print(m, round(sum(dists) / len(dists), 4), round(0.5 * sqrt(2**m / 2**k_bits), 4))
```

```text
2 0.0411 0.0625
4 0.0956 0.125
6 0.1918 0.25
8 0.3694 0.5
```

The measured distances (0.04, 0.10, 0.19, 0.37) stay under the bounds (0.06, 0.125,
0.25, 0.5), and both grow by about $\sqrt{2}$ per extra output bit: extracting all 8
bits of min-entropy leaves the output far from uniform, extracting 2 leaves it close.

### Why the lemma holds

The proof is short enough to give in full, and it shows that the lemma needs less
than it asks for: collision entropy is enough.

Let $X$ take values in $\{0, 1\}^n$, let $h$ be uniform on a universal family
$\mathcal{H}$ of functions to $\{0, 1\}^m$, and let $Z = (h, h(X))$, which takes
values in a set of size $N = |\mathcal{H}| \cdot 2^m$. Take an independent copy
$Z' = (h', h'(X'))$.

**Step 1: collision probability.** $Z = Z'$ needs $h = h'$, which happens with
probability $1/|\mathcal{H}|$, and then $h(X) = h(X')$. That second event happens
either because $X = X'$, with probability $\sum_x p(x)^2 = 2^{-H_2(X)}$, or because
$X \ne X'$ and the hash collides, with probability at most $2^{-m}$ by universality.
So

$$
\mathrm{CP}(Z) = \Pr[Z = Z'] \le \frac{1}{|\mathcal{H}|}\left(2^{-H_2(X)} + 2^{-m}\right).
$$

**Step 2: from collisions to distance.** Let $q(z)$ be the distribution of $Z$ and
$u = 1/N$ the uniform one. By the Cauchy-Schwarz inequality, $\sum_z |q(z) - u| \le
\sqrt{N} \sqrt{\sum_z (q(z) - u)^2}$, and expanding the square gives $\sum_z (q(z) -
u)^2 = \mathrm{CP}(Z) - 1/N$. So

$$
\Delta(Z, U) = \frac12 \sum_z |q(z) - u| \le \frac12 \sqrt{N \cdot \mathrm{CP}(Z) - 1}
\le \frac12 \sqrt{2^m \left(2^{-H_2(X)} + 2^{-m}\right) - 1} = \frac12 \sqrt{2^{m - H_2(X)}}.
$$

Since $H_2 \ge H_\infty \ge k$ (§17.6), this is the lemma. $\blacksquare$

**The budget.** Set the distance to $\epsilon/2$: $2^{m-k} = \epsilon^2$, so $m = k -
2 \log_2(1/\epsilon)$. Every halving of the error costs two bits of output. For
$\epsilon = 2^{-64}$ the **entropy loss** is 128 bits, which is a great deal: a
source with exactly 128 bits of min-entropy yields *nothing* usable at that error, and
a 128-bit key needs 256 bits in. Jaikumar Radhakrishnan and Amnon Ta-Shma proved in 2000
that a loss of $2\log_2(1/\epsilon)$, up to an additive constant, is unavoidable for
any seeded extractor, so this is not a weakness of the proof. It is the price of a statistical guarantee, and the reason
practice turned to computational ones.

### HKDF: extract, then expand

Keys are rarely born uniform. A Diffie-Hellman shared secret is a group element with
structure (an X25519 output is the x-coordinate of a curve point; a finite-field one
is a number below $p$ in a subgroup); a noise pool is a hash of timings; a quantum
key exchange leaves a string an eavesdropper knows something about. A protocol
needs several uniform keys from one such input: one for each direction, one for
each purpose. Hugo Krawczyk's **HKDF** (CRYPTO 2010, RFC 5869) splits the job into
the two halves this chapter has been building toward.

- **Extract**: $\mathrm{PRK} = \mathrm{HMAC}(\mathit{salt}, \mathit{IKM})$. The input
  keying material IKM goes in as the HMAC *message*; the salt is the HMAC *key*.
  The salt plays the part of the seed $h$ in the leftover hash lemma: public, ideally
  random, and independent of the source. The output PRK is one hash length (32 bytes
  for SHA-256) that should be close to uniform.
- **Expand**: $T(1) = \mathrm{HMAC}(\mathrm{PRK}, \mathit{info} \parallel 1)$, $T(i) =
  \mathrm{HMAC}(\mathrm{PRK}, T(i-1) \parallel \mathit{info} \parallel i)$, and the
  output is the first $L$ bytes of $T(1) \parallel T(2) \parallel \cdots$, with $L \le
  255$ hash lengths (8,160 bytes for SHA-256). The *info* string names the purpose
  ("client key", "server iv"), so keys for different jobs are independent even
  though they come from the same PRK.

Expand is a pseudorandom function used as a stream; it creates no entropy and needs
none beyond the PRK's. Extract is where the entropy accounting happens.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="HKDF in two stages: input keying material with k bits of min-entropy and a public salt go into HMAC to make a 32-byte pseudorandom key; the key then drives HMAC in a chain with an info label and a counter, producing blocks T1, T2, T3 that are cut to L bytes of output keys" fill="currentColor" font-size="13">
<rect x="20" y="30" width="150" height="46" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="50" text-anchor="middle">IKM</text>
<text x="95" y="67" text-anchor="middle" font-size="11" fill-opacity=".7">k bits of min-entropy</text>
<rect x="20" y="100" width="150" height="46" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="120" text-anchor="middle">salt</text>
<text x="95" y="137" text-anchor="middle" font-size="11" fill-opacity=".7">public, random seed</text>
<rect x="210" y="62" width="100" height="50" rx="6" class="acc-fill" fill-opacity=".15" stroke="currentColor" stroke-width="1.5"/>
<text x="260" y="84" text-anchor="middle">HMAC</text>
<text x="260" y="101" text-anchor="middle" font-size="11" fill-opacity=".7">extract</text>
<g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M170 53 L210 78"/><path d="M170 123 L210 98"/><path d="M310 87 L350 87"/></g>
<text x="190" y="140" font-size="11" fill-opacity=".7">salt is the HMAC key</text>
<rect x="350" y="64" width="80" height="46" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="390" y="84" text-anchor="middle">PRK</text>
<text x="390" y="100" text-anchor="middle" font-size="11" fill-opacity=".7">32 bytes</text>
<g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M430 87 L460 87 L460 40 L480 40"/><path d="M460 87 L480 87"/><path d="M460 87 L460 134 L480 134"/></g>
<rect x="480" y="22" width="140" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="45" text-anchor="middle" font-size="12">T(1) = HMAC(info‖1)</text>
<rect x="480" y="69" width="140" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="92" text-anchor="middle" font-size="12">T(2): T(1)‖info‖2</text>
<rect x="480" y="116" width="140" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="139" text-anchor="middle" font-size="12">T(3): T(2)‖info‖3</text>
<g stroke="currentColor" stroke-width="1" fill="none" stroke-dasharray="3 3"><path d="M550 58 L550 69"/><path d="M550 105 L550 116"/></g>
<rect x="480" y="172" width="140" height="36" rx="6" class="acc-fill" fill-opacity=".15" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="195" text-anchor="middle" font-size="12">OKM: first L bytes</text>
<path d="M550 152 L550 172" stroke="currentColor" stroke-width="1.5" fill="none"/>
<text x="250" y="190" text-anchor="middle" font-size="12">entropy is counted here</text>
<text x="250" y="207" text-anchor="middle" font-size="12" fill-opacity=".7">(leftover hash lemma, or HMAC as a computational extractor)</text>
<text x="390" y="150" text-anchor="middle" font-size="11" fill-opacity=".7">expand: PRK keys</text>
<text x="390" y="164" text-anchor="middle" font-size="11" fill-opacity=".7">every HMAC</text>
</svg>
<figcaption>Figure 17.5. HKDF. Extract concentrates whatever min-entropy the input has into one pseudorandom key, using the public salt as its seed; expand stretches that key into as many labeled output keys as the protocol needs. Only the first stage has anything to do with entropy.</figcaption>
</figure>

**The bits, counted.** Three cases show what the lemma does and does not cover.

1. *A noise source.* An entropy source assessed by SP 800-90B at 0.5 bits of
   min-entropy per byte is read for 512 bytes: $k = 256$ bits. If HMAC with a random
   salt behaved like a universal hash, the lemma would give $m = 256 - 2 \cdot 64 =
   128$ bits within $2^{-65}$ of uniform. The PRK is 256 bits long, but only about
   128 of them are backed by the statistical guarantee, which is exactly enough for
   an AES-128 key.
2. *A short input.* The same source read for 256 bytes gives $k = 128$, and the
   lemma gives nothing at $\epsilon = 2^{-64}$. Anyone who wants a 128-bit key from
   it is relying on HMAC being a good *computational* extractor, which is a
   reasonable assumption (Krawczyk's paper analyzes it, and in the random-oracle
   model it holds with almost no loss) but a different kind of statement.
3. *A Diffie-Hellman secret.* An X25519 shared secret is one of about $2^{251}$
   possible x-coordinates (the prime-order subgroup has about $2^{252}$ points, and
   $P$ and $-P$ share one). Even at face value the lemma would give $251 - 128 = 123$
   bits at $\epsilon = 2^{-64}$, a little short of 128. Worse, to an eavesdropper who
   has seen both public keys the secret has no min-entropy at all: it is determined
   by them. Its randomness is computational, by the Diffie-Hellman assumption, and
   the "Going deeper" section names the entropy that describes it. This is why RFC
   5869 says the extract step should not be skipped for Diffie-Hellman values, and
   why TLS 1.3 (RFC 8446) runs every shared secret through HKDF-Extract before using
   it.

HKDF is for inputs with real entropy. A password with 20 bits of guessing resistance
gives a PRK with 20 bits of guessing resistance, because an attacker simply runs
HKDF on each guess; passwords need the slow, salted functions of *Engineering*
[chapter 13](../engineering/13-Passwords-on-the-Server.md).

### Code it: HKDF from HMAC, checked against the RFC

```python
# Uses sqrt and log2 from the first listing.
# HKDF (RFC 5869): extract with HMAC keyed by the salt, then expand with HMAC keyed by the PRK.
import hmac, hashlib

def hkdf_extract(salt, ikm):
    return hmac.new(salt or bytes(32), ikm, hashlib.sha256).digest()

def hkdf_expand(prk, info, length):
    assert length <= 255 * 32
    out, t, i = b"", b"", 1
    while len(out) < length:
        t = hmac.new(prk, t + info + bytes([i]), hashlib.sha256).digest()
        out, i = out + t, i + 1
    return out[:length]

# RFC 5869, Appendix A.1 (test case 1)
prk = hkdf_extract(bytes(range(13)), bytes([0x0b] * 22))
okm = hkdf_expand(prk, bytes(range(0xf0, 0xfa)), 42)
print(prk.hex()[:16], okm.hex()[:16])
print(prk.hex() == "077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5",
      okm.hex().endswith("34007208d5b887185865"))

# The leftover hash lemma's budget: m = k - 2 log2(1/eps) uniform bits from k bits of min-entropy.
for k in (128, 192, 256, 384):
    m = k - 2 * 64                                  # output bits at eps = 2^-64
    dist = 0.5 * sqrt(2.0 ** (m - k))               # the lemma's bound on the distance from uniform
    print(k, "bits in ->", m, "bits out, distance <= 2^%d;" % log2(dist), k - 2 * 32, "at eps = 2^-32")
```

It prints:

```text
077709362c2e32df 3cb25f25faacd57a
True True
128 bits in -> 0 bits out, distance <= 2^-65; 64 at eps = 2^-32
192 bits in -> 64 bits out, distance <= 2^-65; 128 at eps = 2^-32
256 bits in -> 128 bits out, distance <= 2^-65; 192 at eps = 2^-32
384 bits in -> 256 bits out, distance <= 2^-65; 320 at eps = 2^-32
```

The first line shows the start of the PRK and of the 42-byte output; the second
confirms that both match RFC 5869's first test case. The table is the lemma's
budget: at $\epsilon = 2^{-64}$, twice 64 bits are lost, so 256 bits of min-entropy
are needed for a 128-bit key; at a looser $2^{-32}$, 192 suffice.

## 17.8 How systems gather and estimate entropy

*Level: expert.*

**The Linux kernel** collects timing noise from interrupts, disk and input events,
and on modern processors also mixes in hardware sources such as RDRAND and the CPU
jitter of a busy loop. It hashes everything into an entropy pool (with BLAKE2s since
the 2022 rewrite by Jason Donenfeld, kernel 5.17 and 5.18), and once the pool is
judged to hold enough entropy (256 bits in current kernels), seeds a ChaCha20-based generator (since kernel 4.8, 2016)
from it, reseeding periodically. Programs read it through the `getrandom` system call
(kernel 3.17, 2014) or `/dev/urandom`. Since kernel 5.6 (2020), `/dev/random` blocks
only until the first initialization, and then behaves like `/dev/urandom`: once
seeded, a cryptographic generator does not "run out" of entropy.

**NIST's three-part model**: SP 800-90B (2018) for the **entropy source** and its
estimation, SP 800-90A for the **deterministic generators** (Hash_DRBG, HMAC_DRBG,
CTR_DRBG) that stretch the seed, and SP 800-90C for putting them together. SP 800-90B
asks the designer for raw noise samples, runs about ten estimators on them (most
common value, collision, Markov, compression, several predictors) and takes the
*smallest* min-entropy estimate. It also requires continuous health tests, the
repetition count test and the adaptive proportion test, which shut the source down
when it starts to repeat itself; §17.9 works out their statistics.

### Code it: the most-common-value estimate

SP 800-90B's simplest estimator: take the frequency $\hat{p}$ of the most common
sample, raise it to an upper 99% confidence bound $p_u = \hat{p} + 2.576
\sqrt{\hat{p}(1 - \hat{p})/(L - 1)}$, and report $-\log_2 p_u$ bits per sample.

```python
# SP 800-90B's most-common-value estimate: min-entropy from an upper confidence bound on max p.
def mcv_estimate(samples):
    L = len(samples)
    counts = defaultdict(int)
    for s in samples:
        counts[s] += 1
    p_hat = max(counts.values()) / L
    p_u = min(1.0, p_hat + 2.576 * sqrt(p_hat * (1 - p_hat) / (L - 1)))
    return -log2(p_u)

def noisy_source(L):
    """A byte source that favors 0x00: probability 1/64, the other 255 values share the rest."""
    out = []
    for _ in range(L):
        out.append(0 if rng.random() < 1 / 64 else rng.randrange(1, 256))
    return out

true_pmax = 1 / 64
for L in (1000, 10_000, 1_000_000):
    print(L, round(mcv_estimate(noisy_source(L)), 3), round(-log2(true_pmax), 3))
```

```text
1000 5.787 6.0
10000 5.612 6.0
1000000 5.976 6.0
```

A byte source that emits 0 with probability $1/64$ has true min-entropy exactly 6
bits per byte, although its Shannon entropy is close to 8. The estimator, being
conservative, reports a little less (5.6 to 5.8 bits from 1,000 or 10,000 samples)
and approaches 6 with a million.

## 17.9 Health tests: watching a source in the field

*Level: expert.*

The estimators of §17.8 run once, in a laboratory, on a large sample. Then the
source runs for years: a ring oscillator locks onto a harmonic of the system clock, a
noise diode ages, a device sits in the cold. SP 800-90B requires two **continuous
health tests** on the raw samples, so that a source that stops delivering its claimed
min-entropy is caught while it runs. *Engineering*
[§4.7](../engineering/04-Randomness-in-Practice.md#47-entropy-sources-and-health-tests)
gives the firmware and what an alarm must do; this section does the statistics: where
the cutoffs come from, how often a good source is wrongly stopped, and how quickly a
bad one is caught.

Each test is a **hypothesis test**. The null hypothesis is that the source still has
at least $H$ bits of min-entropy per sample: no value has probability above
$2^{-H}$. The designer picks the **false alarm probability** $\alpha$ (a type I
error); SP 800-90B works its examples with $\alpha = 2^{-20}$ and recommends values
between $2^{-20}$ and $2^{-40}$. What the standard leaves to the designer to work
out is the **power**: the probability that a failing source is caught, and how many
samples that takes.

### The repetition count test

The test counts how many consecutive samples are identical and alarms when the count
reaches $C$. Under the null hypothesis, after any sample the chance that the next
$C - 1$ samples all equal it is at most $(2^{-H})^{C-1}$. Requiring that to be at most
$\alpha$ gives $(C - 1) H \ge \log_2(1/\alpha)$, so

$$
C_{\mathrm{RCT}} = 1 + \left\lceil \frac{\log_2 (1/\alpha)}{H} \right\rceil .
$$

**By hand**, with $\alpha = 2^{-20}$: a binary source claimed at $H = 1$ bit per
sample gets $C = 1 + 20 = 21$; the byte source of §17.8, at $H = 6$ bits, gets $C = 1 +
\lceil 20/6 \rceil = 5$; the standard's own example, $H = 2$, gets 11.

The test is built for sources that get *stuck*, and its power against anything
milder is low. For a binary source whose majority value has probability $q$, the
expected number of samples before $C$ copies of that value in a row is $(1 - q^C) / ((1 - q)
q^C)$, the classical waiting time for a run. With $C = 21$: about 81 samples at $q =
0.9$, 1,678 at $q = 0.75$, 113,960 at $q = 0.6$ and 629,752 at $q = 0.55$ (runs of
the minority value shorten these a little). A source that has lost between a seventh
and a quarter of its min-entropy can run for hundreds of thousands of samples before
this test notices.

### The adaptive proportion test

The second test catches drift. It takes the first sample $A$ of a window of $W$
samples ($W = 1024$ for a binary source, 512 otherwise), counts how many of the $W$
samples equal $A$, and alarms when the count $B$ reaches $C$. Under the null
hypothesis each of the other $W - 1$ samples equals $A$ with probability at most
$2^{-H}$, so $B - 1$ is at most a binomial variable $\mathrm{Bin}(W - 1, 2^{-H})$, and
the cutoff is set in its upper tail. SP 800-90B writes it with the spreadsheet
function CRITBINOM:

$$
C_{\mathrm{APT}} = 1 + \mathrm{CRITBINOM}(W, 2^{-H}, 1 - \alpha),
$$

the smallest $k$ with $\Pr[\mathrm{Bin}(W, 2^{-H}) \le k] \ge 1 - \alpha$, plus one.

**By hand with the normal approximation.** Binary source, $H = 1$, $W = 1024$: $B -
1 \sim \mathrm{Bin}(1023, \frac12)$ has mean 511.5 and standard deviation
$\sqrt{1023/4} \approx 16.0$. A one-sided tail of $2^{-20} \approx 9.5 \times 10^{-7}$
lies about 4.76 standard deviations out. So $C \approx 1 + 511.5 + 4.76 \cdot 16.0
\approx 588.7$, and rounding up gives 589, the value in the standard's table of
cutoffs. A good binary source puts about 512 of its 1,024 samples on the first
value; the alarm sounds at 589.

### Code it: cutoffs, power and a failing source

The listing computes both cutoffs exactly, checks the honest false alarm rate per
window, works out the per-window power of the proportion test against sources whose
1s have probability $q$, and then runs both tests on a deliberately failing
oscillator whose bias creeps from 0.5 to 0.8 over 300,000 samples.

```python
# Uses log2 and random from the listings above.
# SP 800-90B's two health tests as hypothesis tests, for a binary source claimed at H = 1 bit
# per sample, with false alarm probability alpha = 2^-20.  Exact binomial tails, then a failing source.
from math import ceil, comb
from fractions import Fraction as Fr

def tail(n, q, c):
    """Pr[Binomial(n, q) >= c], exactly, for a rational q."""
    return sum(comb(n, j) * q**j * (1 - q)**(n - j) for j in range(max(c, 0), n + 1))

W, a_bits, Hc = 1024, 20, 1
C_rct = 1 + ceil(a_bits / Hc)

def critbinom(n, q, alpha):           # smallest k with Pr[Binomial(n, q) > k] <= alpha
    above = 0                         # Pr[X > k], built up from the top
    for k in range(n, -1, -1):
        pk = comb(n, k) * q**k * (1 - q)**(n - k)
        if above + pk > alpha:
            return k
        above += pk

C_apt = 1 + critbinom(W, Fr(1, 2), Fr(1, 2**a_bits))
print("cutoffs:", C_rct, C_apt)
print("false alarm per window: %.2e" % float(tail(W - 1, Fr(1, 2), C_apt - 1)))

def apt_power(q):                     # chance one window alarms when a 1 has probability q
    return float(q * tail(W - 1, q, C_apt - 1) + (1 - q) * tail(W - 1, 1 - q, C_apt - 1))

for q in (Fr(55, 100), Fr(58, 100), Fr(60, 100), Fr(65, 100), Fr(75, 100)):
    pw = apt_power(q)
    print(float(q), round(-log2(float(q)), 3), "%.4f" % pw, round(W / pw))

# A deliberately failing source: a ring oscillator whose bias creeps from 0.5 to 0.8.
src_rng = random.Random(90)
N = 300_000
run, last, first, count, alarms = 0, None, None, 0, {}
for i in range(N):
    q = 0.5 + 0.3 * i / N
    x = int(src_rng.random() < q)
    run = run + 1 if x == last else 1
    last = x
    if run >= C_rct and "RCT" not in alarms:
        alarms["RCT"] = (i, round(q, 3))
    if i % W == 0:
        first, count = x, 1
    elif x == first:
        count += 1
        if count >= C_apt and "APT" not in alarms:
            alarms["APT"] = (i, round(q, 3))
print(alarms)
```

It prints:

```text
cutoffs: 21 589
false alarm per window: 9.64e-07
0.55 0.862 0.0324 31568
0.58 0.786 0.3740 2738
0.6 0.737 0.5718 1791
0.65 0.621 0.6500 1575
0.75 0.415 0.7500 1365
{'APT': (53246, 0.553), 'RCT': (135545, 0.636)}
```

Four things stand out. The cutoffs are the standard's 21 and 589. The honest false
alarm rate per window is $9.6 \times 10^{-7}$, a hair *above* $2^{-20} \approx 9.54
\times 10^{-7}$: the CRITBINOM formula counts $W$ trials where the test really has
$W - 1$, so the true rate overshoots slightly, one of the points Joshua Hill made in a
2024 critique of the standard's cutoffs. The power climbs steeply: a source with $q =
0.55$, which has lost 14% of its claimed entropy (0.862 bits per sample instead of
1), is caught in 3% of windows, so after about 31,600 samples on average; at $q =
0.6$, in 57% of windows. And the power never exceeds $q$, because the test counts
only matches with the window's *first* sample: a window that happens to start with
the minority value cannot alarm. SP 800-90B allows binary sources to test $W - B \ge
C$ as well, which removes that ceiling. On the drifting oscillator, the proportion
test fired first, at sample 53,246, when the bias had reached 0.553; the
repetition test needed until sample 135,545 and a bias of 0.636.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Probability that one 1024-sample window of the adaptive proportion test alarms, against the probability q of a 1: near zero up to q = 0.55, rising steeply to 0.57 at q = 0.6, then following the ceiling line equal to q up to 0.8" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="80" y1="210" x2="610" y2="210"/><line x1="80" y1="210" x2="80" y2="20"/></g>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" d="M80 120 L600 66"/>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M80.0 210.0 L97.3 210.0 L114.7 210.0 L132.0 209.8 L149.3 208.7 L166.7 204.2 L184.0 192.0 L201.3 169.8 L218.7 142.7 L236.0 120.1 L253.3 107.1 L270.7 101.3 L288.0 98.6 L305.3 96.6 L322.7 94.8 L340.0 93.0 L357.3 91.2 L374.7 89.4 L392.0 87.6 L409.3 85.8 L426.7 84.0 L444.0 82.2 L461.3 80.4 L478.7 78.6 L496.0 76.8 L513.3 75.0 L530.7 73.2 L548.0 71.4 L565.3 69.6 L582.7 67.8 L600.0 66.0"/>
<circle cx="166.7" cy="204.2" r="4.5" class="acc-fill"/>
<circle cx="253.3" cy="107.1" r="4.5" class="acc-fill"/>
<text x="158" y="198" text-anchor="end" font-size="12">q = 0.55: 3%</text>
<text x="262" y="124" font-size="12">q = 0.60: 57%</text>
<text x="420" y="74" font-size="12">ceiling: power ≤ q</text>
<text x="72" y="214" text-anchor="end" font-size="12">0</text>
<text x="72" y="124" text-anchor="end" font-size="12">0.5</text>
<text x="72" y="34" text-anchor="end" font-size="12">1</text>
<text x="80" y="230" text-anchor="middle" font-size="12">0.50</text>
<text x="253.3" y="230" text-anchor="middle" font-size="12">0.60</text>
<text x="426.7" y="230" text-anchor="middle" font-size="12">0.70</text>
<text x="600" y="230" text-anchor="middle" font-size="12">0.80</text>
<text x="340" y="248" text-anchor="middle" font-size="12">probability q of a 1 (the source claims q = 0.5)</text>
<text x="88" y="20" font-size="12">chance one window alarms</text>
</svg>
<figcaption>Figure 17.6. The power of the adaptive proportion test for a binary source claimed at 1 bit per sample (W = 1,024, cutoff 589). An honest source alarms in about one window in a million; a source biased to 0.6 alarms in more than half. The dashed line is the ceiling q: the test watches only the value that opens each window.</figcaption>
</figure>

### Choosing the false alarm rate far from help

A false alarm stops the generator until the source passes its start-up tests again.
On a server in a data center that is a log line; on a device in Arcadia City whose
designers are on Earth, 6 to 44 minutes away by round trip, nobody can look at it
in time, so the device must decide alone. The arithmetic of this section is then
the whole design. At $10^5$ samples a second and $\alpha = 2^{-20}$, the repetition
test alone would raise a false alarm about every ten seconds; at $\alpha = 2^{-40}$
about once in four months. A smaller $\alpha$ raises the cutoffs (to 41 and 625 for
the binary source here) and slows detection, so the honest answer is to claim a
conservative $H$, pick $\alpha$ near $2^{-40}$, and accept that only gross failures
are caught quickly. *Engineering*
[§4.9](../engineering/04-Randomness-in-Practice.md#49-mars-a-rovers-first-boot)
follows a rover's source through a cold first boot.

## 17.10 Passwords measured properly

*Level: intermediate.*

A password field with a colored bar that says "strong, 65 bits" is making a claim
about entropy. The claim is almost always wrong, and the reason is in §17.2: entropy
belongs to a *distribution*, the process that chose the password, not to the string.
The string `Password1!` does not have an entropy. The process "take the most common
password word, capitalize it, append a digit and a symbol" has very little, and
an attacker's guessing tool tries that process early.

### Why "bits" meters mislead

Two kinds of meter were common for twenty years.

- The **character-set meter** multiplies length by $\log_2$ of the alphabet size.
  For `Password1!` (10 characters from the 94 printable ASCII symbols) it reports
  $10 \log_2 94 \approx 65.5$ bits. For `correct horse battery staple` (28
  characters from lowercase letters and space) it reports $28 \log_2 27 \approx 133$
  bits.
- The **NIST heuristic** of the original SP 800-63 guideline gave 4 bits for the
  first character, 2 bits each for the next seven, 1.5 bits each for the 9th to 20th
  and 1 bit for each after that, plus up to 6 bits for composition rules and up to 6
  for a dictionary check. For `Password1!` that is $4 + 7 \cdot 2 + 2 \cdot 1.5 + 6 =
  27$ bits.

Both numbers would be correct for some process; neither is correct for the process
that produced the string. The character-set meter is right only if every character
was chosen uniformly and independently, which a person never does. The passphrase,
if its four words were picked by rolling dice on the 7,776-word Diceware list,
has exactly $4 \log_2 7776 \approx 51.7$ bits on every Rényi order, because that
process is uniform; the meter's 133 overstates it by 81 bits, and a passphrase that a
person picked from memory has far less than 51.7. Matt Weir, Sudhir Aggarwal,
Michael Collins and Henry Stern tested the NIST heuristic in 2010 against tens of
millions of leaked passwords and found that it did not predict how quickly real
cracking tools broke the passwords. The heuristic was dropped when SP 800-63B
replaced it in 2017 (its rules are in *Engineering*
[chapter 13](../engineering/13-Passwords-on-the-Server.md)).

The honest measure of one password is its **guess number**: its position in the
guessing order of a realistic attacker. Researchers at Carnegie Mellon (Patrick
Kelley and colleagues, 2012) measured passwords that way by running real cracking
tools, and Daniel Lowe Wheeler's **zxcvbn** estimator (2016) approximates the guess
number by matching a password against dictionaries, keyboard patterns, dates and
common substitutions. Its output is a count of guesses, not a count of bits.

### Guessing curves

The honest measure of a *population* of passwords is a curve. Sort the passwords by
probability, $p_1 \ge p_2 \ge \cdots$, and let $\lambda_\beta = p_1 + \cdots +
p_\beta$ be the fraction of accounts broken by $\beta$ guesses each. Figure 17.3
plotted exactly that. Joseph Bonneau, in his 2012 study of 70 million Yahoo!
passwords, turned it into bits that can be compared with key lengths. For a
target success rate $\alpha$, let $\mu_\alpha$ be the number of guesses needed to
reach it and

$$
G_\alpha = (1 - \lambda_{\mu_\alpha})\, \mu_\alpha + \sum_{i=1}^{\mu_\alpha} i\, p_i
$$

the expected number of guesses per account for an attacker who gives up after
$\mu_\alpha$. Converted to bits,

$$
\tilde{\mu}_\alpha = \log_2 \frac{\mu_\alpha}{\lambda_{\mu_\alpha}}, \qquad
\tilde{G}_\alpha = \log_2\left(\frac{2 G_\alpha}{\lambda_{\mu_\alpha}} - 1\right)
+ \log_2 \frac{1}{2 - \lambda_{\mu_\alpha}} .
$$

The conversions are chosen so that a uniform distribution over $2^k$ values gives
exactly $k$ bits at every $\alpha$; check it with $\mu_\alpha = \alpha 2^k$ and
$\lambda_{\mu_\alpha} = \alpha$. At small $\alpha$ the curve starts at the
min-entropy, and at $\alpha = 1$ it measures the guesswork of §17.6. In between it
answers the question an attacker actually asks: how hard is it to break a given
fraction of these accounts? Bonneau's answer for Yahoo!'s users was fewer than 10
bits against an online attacker limited to a few guesses per account, and about 20
bits against an optimal offline attacker.

### Code it: two populations, one entropy

The listing computes $\tilde{\mu}_\alpha$ and $\tilde{G}_\alpha$ for the Zipf model of
§17.6, and for a mixed population: half the users choose as the Zipf model does, the
other half use a password manager's random 64-bit strings. A distribution is kept as
groups of equally likely values, so the $2^{64}$ random strings cost one line.

```python
# Uses H, zipf, ceil and log2 from the listings above.
# Guessing curves in bits (Bonneau 2012).  A distribution is a list of groups (prob, how many),
# most likely first.  mu = guesses needed to break a fraction alpha; G = alpha-guesswork.
def curve_bits(groups, alpha):
    done, lam, G = 0, 0.0, 0.0
    for q, cnt in groups:
        t = min(cnt, ceil((alpha - lam) / q - 1e-9))
        G += q * (t * done + t * (t + 1) / 2)       # sum of i * p_i over these t guesses
        done, lam = done + t, lam + q * t
        if lam >= alpha - 1e-12:
            break
    G += (1 - lam) * done
    mu_bits = log2(done / lam)
    G_bits = log2(2 * G / lam - 1) + log2(1 / (2 - lam))
    return mu_bits, G_bits

zipf_groups = [(q, 1) for q in zipf]
mixed = [(q / 2, 1) for q in zipf] + [(0.5 / 2**64, 2**64)]   # half the users use random 64-bit strings
H_mixed = 1 + 0.5 * H(zipf) + 0.5 * 64
print("Shannon entropy: Zipf", round(H(zipf), 2), " mixed", round(H_mixed, 2))
for alpha in (0.1, 0.25, 0.5, 0.75, 0.9):
    zm, zg = curve_bits(zipf_groups, alpha)
    mm, mg = curve_bits(mixed, alpha)
    print(alpha, round(zm, 1), round(zg, 1), round(mm, 1), round(mg, 1))
```

It prints:

```text
Shannon entropy: Zipf 11.5  mixed 38.75
0.1 4.0 4.0 5.9 5.9
0.25 5.5 5.5 9.9 9.7
0.5 8.9 8.5 17.6 17.1
0.75 12.7 11.8 63.4 62.7
0.9 15.0 13.4 63.8 63.0
```

The mixed population has a Shannon entropy of 38.75 bits, a number that describes
none of its users. Half of them fall almost as easily as the Zipf population: 6 to
18 bits for the first half of the accounts, a little more than for the Zipf curve
because each weak password now covers half as many accounts. The other half sit
behind 63 or 64 bits. The guessing curve shows
both facts; any single number hides one of them.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Guessing curves in bits against the fraction of accounts an attacker wants: the Zipf population rises slowly from 3.6 to 14 bits; the mixed population follows a similar slow rise to 17 bits until half the accounts, then jumps to about 63 bits; its Shannon entropy of 38.75 bits is a dashed line that matches neither part" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="80" y1="210" x2="610" y2="210"/><line x1="80" y1="210" x2="80" y2="20"/></g>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" d="M80 110.4 L600 110.4"/>
<path fill="none" stroke="currentColor" stroke-width="2" d="M90.4 200.8 L106.0 200.8 L132.0 199.7 L158.0 199.0 L184.0 197.6 L210.0 196.0 L236.0 194.6 L262.0 193.0 L288.0 191.4 L314.0 189.8 L340.0 188.1 L366.0 186.4 L392.0 184.7 L418.0 183.0 L444.0 181.4 L470.0 179.8 L496.0 178.2 L522.0 176.8 L548.0 175.5 L574.0 174.4 L589.6 174.1"/>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M90.4 198.2 L106.0 197.1 L132.0 194.9 L158.0 191.8 L184.0 188.5 L210.0 184.9 L236.0 181.3 L262.0 177.5 L288.0 173.7 L314.0 169.8 L339.5 166.0 L340.5 67.4 L350.4 56.5 L366.0 53.3 L392.0 51.1 L418.0 50.0 L444.0 49.3 L470.0 48.8 L496.0 48.5 L522.0 48.3 L548.0 48.1 L574.0 48.0 L589.6 48.0"/>
<text x="596" y="40" text-anchor="end" font-size="12">mixed: half random 64-bit strings</text>
<text x="596" y="104" text-anchor="end" font-size="12">Shannon entropy (mixed): 38.75</text>
<text x="596" y="168" text-anchor="end" font-size="12">Zipf population</text>
<text x="72" y="214" text-anchor="end" font-size="12">0</text>
<text x="72" y="162.6" text-anchor="end" font-size="12">20</text>
<text x="72" y="111.1" text-anchor="end" font-size="12">40</text>
<text x="72" y="59.7" text-anchor="end" font-size="12">60</text>
<text x="80" y="230" text-anchor="middle" font-size="12">0</text>
<text x="210" y="230" text-anchor="middle" font-size="12">0.25</text>
<text x="340" y="230" text-anchor="middle" font-size="12">0.5</text>
<text x="470" y="230" text-anchor="middle" font-size="12">0.75</text>
<text x="600" y="230" text-anchor="middle" font-size="12">1</text>
<text x="340" y="248" text-anchor="middle" font-size="12">fraction α of accounts the attacker wants to break</text>
<text x="88" y="20" font-size="12">α-guesswork in bits</text>
</svg>
<figcaption>Figure 17.7. Guessing curves (Bonneau's α-guesswork, in bits) for the Zipf password model and for a population where half the users have random 64-bit passwords. A uniform 2^k distribution would be a flat line at k. The mixed population's Shannon entropy, 38.75 bits, is the dashed line: it matches no part of the curve.</figcaption>
</figure>

What follows for practice is a short list, all of it from the mathematics. A server
cannot raise the entropy of its users' choices, but it can cut off the top of the
distribution by refusing the most common passwords, which raises the start of the
curve; and it can make each guess expensive with a slow hash, which adds the base-2
logarithm of the cost to every point of the curve against an offline attacker (a
hash that costs $2^{20}$ times a single SHA-256 adds 20 bits). The user who wants to
leave the curve behind altogether lets a machine choose: a password manager's random
string has the same entropy on every order, and there the "bits" on the meter are
finally true.

## 17.11 Break it: too little entropy at the wrong moment

*Level: expert.*

- **Debian OpenSSL** (2006 to 2008): a well-meant patch removed the mixing of
  uninitialized memory and, with it, almost every source except the process number;
  about 15 bits remained.
- **Boot-time keys**: Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex
  Halderman (2012) found that 0.5% of TLS hosts and 0.03% of SSH hosts on the
  internet had RSA keys sharing a prime factor with another key, mostly embedded
  devices that generated keys right after the first boot, before the kernel pool had
  any entropy. A batch gcd computation across all
  the collected keys factored them.

*Cryptanalysis* [chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md) tells
these and other stories in full.

### Fix it

- Use the operating system's generator (`getrandom`, `BCryptGenRandom`,
  `SecRandomCopyBytes`), which blocks until it is seeded; never build your own from
  timestamps or process numbers.
- On devices, generate long-term keys late, or provision a seed at manufacture, and
  check that the kernel reports itself initialized.
- Measure entropy with min-entropy, not Shannon entropy, and keep a margin: SP
  800-90B estimates are lower bounds only if the noise model is right.

## Going deeper

- *Computational entropy.* A Diffie-Hellman secret $g^{ab}$ has no min-entropy at
  all given $g^a$ and $g^b$, since they determine it; yet HKDF extracts good keys
  from it. The notion that explains this is **HILL entropy**, after Johan Håstad,
  Russell Impagliazzo, Leonid Levin and Michael Luby (1999), who used it to build a
  pseudorandom generator from any one-way function: $X$ has HILL entropy at least $k$
  if no efficient test can tell $X$ from some distribution $Y$ with $H_\infty(Y) \ge
  k$. Under the decisional Diffie-Hellman assumption, $g^{ab}$ given $(g^a, g^b)$ has
  HILL entropy close to the logarithm of the group order. An extractor applied to $X$
  then gives what it would give on $Y$, up to the indistinguishability error, because
  any test that told the two outputs apart would tell $X$ from $Y$. Boaz Barak, Ronen
  Shaltiel and Avi Wigderson (2003) compared HILL entropy with other computational
  analogues (Yao's, based on compression, and "metric" entropy), and the literature on leakage
  resilience has since made these the working tools of key derivation proofs.
- *Smooth min-entropy* (Renato Renner and Stefan Wolf, 2004) is the min-entropy of
  the best distribution within distance $\epsilon$ of $X$. It ignores rare bad events
  and is the quantity in which quantum key distribution security proofs count the
  key that privacy amplification, an application of the leftover hash lemma, can
  extract.
- *Conditional min-entropy* $\tilde{H}_\infty(X \mid Y)$ (Dodis, Ostrovsky, Reyzin and
  Smith, 2004) handles leakage: how much of a key is left when an attacker has seen
  side information.
- *Fuzzy extractors* turn noisy readings (biometrics, physical unclonable functions)
  into stable keys, using error-correcting codes (next chapter).
- *Kolmogorov complexity* measures the information in a single string rather than a
  distribution; it is not computable, which is one reason cryptography works with
  distributions.

## Check yourself

??? question "1. What is the entropy of a uniformly random 6-digit PIN?"

    $\log_2 10^6 \approx 19.9$ bits.

??? question "2. A source outputs A with probability 1/2, B and C with 1/4 each. Compute its Shannon entropy, collision entropy and min-entropy."

    $H = \frac{1}{2} \cdot 1 + 2 \cdot \frac{1}{4} \cdot 2 = 1.5$ bits; $H_2 =
    -\log_2(\frac14 + \frac1{16} + \frac1{16}) = \log_2 \frac83 \approx 1.415$ bits;
    $H_\infty = 1$ bit. They fall in the order $H_1 \ge H_2 \ge H_\infty$, and $H_2 \le
    2H_\infty$ as §17.6 proves.

??? question "3. Why is the one-time pad not perfectly secret if the key is reused?"

    Two ciphertexts give $C_1 - C_2 = M_1 - M_2$, which depends on the messages; so
    the pair of ciphertexts is not independent of the pair of messages.

??? question "4. A cipher has $2^{40}$ keys and encrypts 64-bit messages. Can it be perfectly secret for uniformly random messages?"

    No: $H(K) = 40 < 64 = H(M)$, and Shannon's theorem requires $H(K) \ge H(M)$.

??? question "5. Estimate the unicity distance of a Vigenère cipher with a 20-letter key, with $D = 3.2$."

    $H(K) = 20 \log_2 26 \approx 94$ bits, so $U \approx 94/3.2 \approx 29$ letters.

??? question "6. A password policy forces 8 characters with a digit and a symbol. Why can min-entropy still be tiny?"

    Because people choose the same few patterns (`Password1!`); the policy changes the
    set of allowed strings, not the probability that the most popular one is chosen.

??? question "7. Four values have probabilities 1/2, 1/4, 1/8 and 1/8. Compute the guesswork G and Arıkan's upper bound on it."

    Guessing in order, $G = 1 \cdot \frac12 + 2 \cdot \frac14 + 3 \cdot \frac18 + 4
    \cdot \frac18 = 1.875$. The bound is $(\sum \sqrt{p})^2 = (0.707 + 0.5 + 0.354 +
    0.354)^2 \approx 1.914^2 \approx 3.66$, comfortably above. (Massey's lower bound
    needs $H \ge 2$ bits; here $H = 1.75$, so it does not apply.)

??? question "8. A noise source is assessed at 0.5 bits of min-entropy per byte. How many bytes must go into the extractor for the leftover hash lemma to guarantee a 128-bit key within 2^-64 of uniform? Why does the same arithmetic not apply to a Diffie-Hellman secret?"

    The lemma needs $k = m + 2\log_2(1/\epsilon) = 128 + 128 = 256$ bits of
    min-entropy, so 512 bytes. A Diffie-Hellman secret is determined by the two public
    keys, so given what the eavesdropper sees it has no min-entropy at all; its
    randomness is computational (HILL entropy), and HKDF-Extract on it relies on
    computational assumptions about HMAC and Diffie-Hellman, not on the lemma.

??? question "9. Why does Linux's `/dev/urandom` not need to block once seeded?"

    A cryptographic generator seeded with 256 bits of entropy produces output that no
    feasible computation distinguishes from random; reading it does not use up the
    seed's secrecy, so there is nothing to "run out of".

??? question "10. A source is claimed at 4 bits of min-entropy per sample, with alpha = 2^-20. What is the repetition count cutoff? If the source silently drops to 3 bits per sample, roughly how often will that test alarm?"

    $C = 1 + \lceil 20/4 \rceil = 6$. At 3 bits per sample the most likely value can
    have probability $\frac18$, so a given sample starts an alarming run (five more
    equal samples) with probability up to $2^{-15}$: about one alarm in 30,000 samples.
    The test is meant for stuck sources; the adaptive proportion test is the one built
    to catch this kind of drift, and §17.9 computes how quickly it does.

## What you learned

- Shannon entropy $H(X) = \mathbb{E}[\log_2 1/p(X)]$ measures average uncertainty; it
  is at most $\log_2 n$, reached by the uniform distribution.
- The chain rule $H(X, Y) = H(X) + H(Y \mid X)$ and the mutual information
  $I(X; Y)$ measure what one variable tells about another.
- Perfect secrecy is $I(M; C) = 0$; the one-time pad achieves it, and Shannon's
  theorem shows that any perfectly secret cipher needs $H(K) \ge H(M)$.
- English is about 70% redundant; the unicity distance $H(K)/D$ is the ciphertext
  length at which a key is determined in principle.
- Shannon's three conditions (continuity, growth, grouping) force the formula
  $-\sum p \log p$; grouping is the chain rule in disguise.
- With as many keys as messages and ciphertexts, a cipher is perfectly secret exactly
  when its keys are uniform and its table is a Latin square; even then it is
  malleable, and integrity needs a separate one-time MAC.
- In the random-cipher model a wrong key survives $n$ letters with probability
  $2^{-nD}$; for simple substitution the spurious keys run out between 25 and 30
  letters, and an attacker with a weaker language model needs more.
- Min-entropy $-\log_2 \max p$ is what a guessing attacker faces; for passwords it is
  tiny. The Rényi entropies $H_0 \ge H_1 \ge H_2 \ge H_\infty$ form one family, with
  $H_\infty \le H_2 \le 2H_\infty$; guesswork lies between $2^{H_{1/2}}/(1 + \ln N)$
  and $2^{H_{1/2}}$ (Arıkan), and no single number answers every attacker (Pliam).
- Extractors (von Neumann, universal hashing via the leftover hash lemma, HKDF) turn
  weak randomness into keys. The lemma needs only collision entropy and costs
  $2\log_2(1/\epsilon)$ bits, unavoidably; HKDF extracts once and expands with labels,
  and for Diffie-Hellman inputs its guarantee is computational.
- Operating systems gather noise, estimate min-entropy conservatively (SP 800-90B)
  and seed a cryptographic generator; the repetition count and adaptive proportion
  tests are hypothesis tests whose cutoffs come from a geometric bound and a binomial
  tail, and whose power against mild drift is low.
- Password strength is a guessing curve, not a meter's "bits": entropy belongs to the
  process, and a population's curve can hide very different users behind one
  average.

**Next:** [Chapter 18](18-Error-Correcting-Codes.md), error-correcting codes: the
mathematics of Hamming, Reed-Solomon and Goppa codes, and of code-based cryptography.

## Further reading

- Claude Shannon, "A Mathematical Theory of Communication", *Bell System Technical
  Journal* 27 (1948); "Communication Theory of Secrecy Systems", *Bell System Technical
  Journal* 28 (1949); "Prediction and Entropy of Printed English", *Bell System
  Technical Journal* 30 (1951).
- Thomas Cover and Joy Thomas, *Elements of Information Theory*, 2nd edition (Wiley,
  2006).
- James Massey, "Guessing and Entropy", IEEE International Symposium on Information
  Theory, 1994.
- Joseph Bonneau, "The Science of Guessing: Analyzing an Anonymized Corpus of 70
  Million Passwords", IEEE Symposium on Security and Privacy, 2012.
- Salil Vadhan, *Pseudorandomness* (Foundations and Trends in Theoretical Computer
  Science, 2012), chapter 6 on extractors.
- Hugo Krawczyk, "Cryptographic Extraction and Key Derivation: The HKDF Scheme",
  CRYPTO 2010; RFC 5869.
- NIST SP 800-90A Rev. 1 (2015), SP 800-90B (2018) and SP 800-90C.
- Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman, "Mining Your
  Ps and Qs: Detection of Widespread Weak Keys in Network Devices", USENIX Security
  2012.
- Alfréd Rényi, "On Measures of Entropy and Information", *Proceedings of the Fourth
  Berkeley Symposium on Mathematical Statistics and Probability*, vol. 1 (1961).
- Martin Hellman, "An Extension of the Shannon Theory Approach to Cryptography",
  *IEEE Transactions on Information Theory* 23 (1977).
- Mark Wegman and Larry Carter, "New Hash Functions and Their Use in Authentication
  and Set Equality", *Journal of Computer and System Sciences* 22 (1981).
- Erdal Arıkan, "An Inequality on Guessing and Its Application to Sequential
  Decoding", *IEEE Transactions on Information Theory* 42 (1996).
- John O. Pliam, "On the Incomparability of Entropy and Marginal Guesswork in
  Brute-Force Attacks", INDOCRYPT 2000.
- Peter Elias, "The Efficient Construction of an Unbiased Random Sequence", *Annals
  of Mathematical Statistics* 43 (1972); Yuval Peres, "Iterating von Neumann's
  Procedure for Extracting Random Bits", *Annals of Statistics* 20 (1992).
- Russell Impagliazzo, Leonid Levin and Michael Luby, "Pseudo-random Generation from
  One-way Functions", STOC 1989; Johan Håstad, Russell Impagliazzo, Leonid Levin and
  Michael Luby, "A Pseudorandom Generator from any One-way Function", *SIAM Journal
  on Computing* 28 (1999).
- Jaikumar Radhakrishnan and Amnon Ta-Shma, "Bounds for Dispersers, Extractors, and
  Depth-Two Superconcentrators", *SIAM Journal on Discrete Mathematics* 13 (2000).
- Boaz Barak, Ronen Shaltiel and Avi Wigderson, "Computational Analogues of
  Entropy", RANDOM-APPROX 2003.
- Renato Renner and Stefan Wolf, "Smooth Rényi Entropy and Applications", IEEE
  International Symposium on Information Theory, 2004.
- RFC 8446 (TLS 1.3, 2018), for HKDF's place in a real key schedule.
- Joshua E. Hill, "The SP 800-90B Approved Health Tests and Their Cutoffs"
  (presentation, 2024).
- Matt Weir, Sudhir Aggarwal, Michael Collins and Henry Stern, "Testing Metrics for
  Password Creation Policies by Attacking Large Sets of Revealed Passwords", ACM CCS
  2010.
- Patrick Gage Kelley and others, "Guess Again (and Again and Again): Measuring
  Password Strength by Simulating Password-Cracking Algorithms", IEEE Symposium on
  Security and Privacy, 2012.
- Daniel Lowe Wheeler, "zxcvbn: Low-Budget Password Strength Estimation", USENIX
  Security 2016.
- NIST SP 800-63B (2017), which replaced the entropy heuristic of the original SP
  800-63.
- In *The cryptography book*: [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md).
- In the other books: *Engineering*
  [chapter 4](../engineering/04-Randomness-in-Practice.md) (randomness in practice,
  health tests in firmware) and [chapter 13](../engineering/13-Passwords-on-the-Server.md)
  (passwords on the server); *Cryptanalysis*
  [chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md) (generator failures).
