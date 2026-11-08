# 17. Information and Entropy

*How much secret is there in a secret? A 128-bit key has 128 bits if it was chosen
uniformly, and far fewer if it came from a clock, a process number or a person. In
1948 and 1949 Claude Shannon gave the tools to measure it: entropy, conditional
entropy and mutual information. With them he defined perfect secrecy, proved that
the one-time pad achieves it and that nothing cheaper can, and computed how much
ciphertext pins down a classical key. This chapter builds those ideas with proofs,
then turns to the measure that modern practice actually uses, min-entropy, because
an attacker guesses the most likely value first. It ends with extractors, which turn
weak randomness into strong keys, and with how operating systems gather and
estimate entropy.*

!!! abstract "In this chapter"
    **You will learn:**

    - Shannon entropy, with a proof that the uniform distribution maximizes it;
    - joint and conditional entropy, the chain rule and mutual information;
    - perfect secrecy, and Shannon's theorem that it needs a key as long as the
      message, with proof;
    - the redundancy of English and the unicity distance of classical ciphers;
    - min-entropy and guessing entropy, and why passwords have so little of either;
    - randomness extractors: von Neumann's trick, the leftover hash lemma (measured
      exactly) and HKDF;
    - how the Linux kernel and NIST SP 800-90B gather and estimate entropy.

    **You need:** [Chapter 16](16-Probability.md) (probability, expectation,
    statistical distance) and logarithms base 2.

    **Levels:** §17.1 to §17.3 are for beginners, §17.4 to §17.6 are intermediate,
    §17.7 to §17.9 are expert.

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
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M80.0 33.2 L81.4 33.9 L82.8 34.5 L84.2 35.2 L85.6 35.8 L87.0 36.4 L88.4 37.1 L89.8 37.7 L91.2 38.4 L92.6 39.0 L94.0 39.6 L95.4 40.3 L96.8 40.9 L98.2 41.6 L99.6 42.2 L101.0 42.8 L102.4 43.5 L103.8 44.1 L105.2 44.8 L106.6 45.4 L108.0 46.0 L109.4 46.7 L110.8 47.3 L112.2 48.0 L113.6 48.6 L115.0 49.2 L116.4 49.9 L117.8 50.5 L119.2 51.2 L120.6 51.8 L122.0 52.4 L123.4 53.1 L124.8 53.7 L126.2 54.4 L127.6 55.0 L129.0 55.6 L130.4 56.3 L131.8 56.9 L133.2 57.6 L134.6 58.2 L136.0 58.8 L137.4 59.5 L138.8 60.1 L140.2 60.8 L141.6 61.4 L143.0 62.0 L144.4 62.7 L145.8 63.3 L147.2 64.0 L148.6 64.6 L150.0 65.2 L151.4 65.9 L152.8 66.5 L154.2 67.2 L155.6 67.8 L157.0 68.4 L158.4 69.1 L159.8 69.7 L161.2 70.4 L162.6 71.0 L164.0 71.6 L165.4 72.3 L166.8 72.9 L168.2 73.6 L169.6 74.2 L171.0 74.8 L172.4 75.5 L173.8 76.1 L175.2 76.8 L176.6 77.4 L178.0 78.0 L179.4 78.7 L180.8 79.3 L182.2 80.0 L183.6 80.6 L185.0 81.2 L186.4 81.9 L187.8 82.5 L189.2 83.2 L190.6 83.8 L192.0 84.4 L193.4 85.1 L194.8 85.7 L196.2 86.4 L197.6 87.0 L199.0 87.6 L200.4 88.3 L201.8 88.9 L203.2 89.6 L204.6 90.2 L206.0 90.8 L207.4 91.5 L208.8 92.1 L210.2 92.8 L211.6 93.4 L213.0 94.0 L214.4 94.7 L215.8 95.3 L217.2 96.0 L218.6 96.6 L220.0 97.2 L221.4 97.9 L222.8 98.5 L224.2 99.2 L225.6 99.8 L227.0 100.4 L228.4 101.1 L229.8 101.7 L231.2 102.4 L232.6 103.0 L234.0 103.6 L235.4 104.3 L236.8 104.9 L238.2 105.6 L239.6 106.2 L241.0 106.8 L242.4 107.5 L243.8 108.1 L245.2 108.8 L246.6 109.4 L248.0 110.0 L249.4 110.7 L250.8 111.3 L252.2 112.0 L253.6 112.6 L255.0 113.2 L256.4 113.9 L257.8 114.5 L259.2 115.2 L260.6 115.8 L262.0 116.4 L263.4 117.1 L264.8 117.7 L266.2 118.4 L267.6 119.0 L269.0 119.6 L270.4 120.3 L271.8 120.9 L273.2 121.6 L274.6 122.2 L276.0 122.8 L277.4 123.5 L278.8 124.1 L280.2 124.8 L281.6 125.4 L283.0 126.0 L284.4 126.7 L285.8 127.3 L287.2 128.0 L288.6 128.6 L290.0 129.2 L291.4 129.9 L292.8 130.5 L294.2 131.2 L295.6 131.8 L297.0 132.4 L298.4 133.1 L299.8 133.7 L301.2 134.4 L302.6 135.0 L304.0 135.7 L305.4 136.3 L306.8 136.9 L308.2 137.6 L309.6 138.2 L311.0 138.9 L312.4 139.5 L313.8 140.1 L315.2 140.8 L316.6 141.4 L318.0 142.1 L319.4 142.7 L320.8 143.3 L322.2 144.0 L323.6 144.6 L325.0 145.3 L326.4 145.9 L327.8 146.5 L329.2 147.2 L330.6 147.8 L332.0 148.5 L333.4 149.1 L334.8 149.7 L336.2 150.4 L337.6 151.0 L339.0 151.7 L340.4 152.3 L341.8 152.9 L343.2 153.6 L344.6 154.2 L346.0 154.9 L347.4 155.5 L348.8 156.1 L350.2 156.8 L351.6 157.4 L353.0 158.1 L354.4 158.7 L355.8 159.3 L357.2 160.0 L358.6 160.6 L360.0 161.3 L361.4 161.9 L362.8 162.5 L364.2 163.2 L365.6 163.8 L367.0 164.5 L368.4 165.1 L369.8 165.7 L371.2 166.4 L372.6 167.0 L374.0 167.7 L375.4 168.3 L376.8 168.9 L378.2 169.6 L379.6 170.2 L381.0 170.9 L382.4 171.5 L383.8 172.1 L385.2 172.8 L386.6 173.4 L388.0 174.1 L389.4 174.7 L390.8 175.3 L392.2 176.0 L393.6 176.6 L395.0 177.3 L396.4 177.9 L397.8 178.5 L399.2 179.2 L400.6 179.8 L402.0 180.5 L403.4 181.1 L404.8 181.7 L406.2 182.4 L407.6 183.0 L409.0 183.7 L410.4 184.3 L411.8 184.9 L413.2 185.6 L414.6 186.2 L416.0 186.9 L417.4 187.5 L418.8 188.1 L420.2 188.8 L421.6 189.4 L423.0 190.1 L424.4 190.7 L425.8 191.3 L427.2 192.0 L428.6 192.6 L430.0 193.3 L431.4 193.9 L432.8 194.5 L434.2 195.2 L435.6 195.8 L437.0 196.5 L438.4 197.1 L439.8 197.7 L441.2 198.4 L442.6 199.0 L444.0 199.7 L445.4 200.3 L446.8 200.9 L448.2 201.6 L449.6 202.2 L451.0 202.9 L452.4 203.5 L453.8 204.1 L455.2 204.8 L456.6 205.4 L458.0 206.1 L459.4 206.7 L460.8 207.3 L462.2 208.0 L463.6 208.6 L465.0 209.3 L466.4 209.9 L467.8 210.0 L469.2 210.0 L470.6 210.0 L472.0 210.0 L473.4 210.0 L474.8 210.0 L476.2 210.0 L477.6 210.0 L479.0 210.0 L480.4 210.0 L481.8 210.0 L483.2 210.0 L484.6 210.0 L486.0 210.0 L487.4 210.0 L488.8 210.0 L490.2 210.0 L491.6 210.0 L493.0 210.0 L494.4 210.0 L495.8 210.0 L497.2 210.0 L498.6 210.0 L500.0 210.0 L501.4 210.0 L502.8 210.0 L504.2 210.0 L505.6 210.0 L507.0 210.0 L508.4 210.0 L509.8 210.0 L511.2 210.0 L512.6 210.0 L514.0 210.0 L515.4 210.0 L516.8 210.0 L518.2 210.0 L519.6 210.0 L521.0 210.0 L522.4 210.0 L523.8 210.0 L525.2 210.0 L526.6 210.0 L528.0 210.0 L529.4 210.0 L530.8 210.0 L532.2 210.0 L533.6 210.0 L535.0 210.0 L536.4 210.0 L537.8 210.0 L539.2 210.0 L540.6 210.0 L542.0 210.0 L543.4 210.0 L544.8 210.0 L546.2 210.0 L547.6 210.0 L549.0 210.0 L550.4 210.0 L551.8 210.0 L553.2 210.0 L554.6 210.0 L556.0 210.0 L557.4 210.0 L558.8 210.0 L560.2 210.0 L561.6 210.0 L563.0 210.0 L564.4 210.0 L565.8 210.0 L567.2 210.0 L568.6 210.0 L570.0 210.0"/>
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
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M80.0 195.1 L110.1 187.7 L127.7 182.7 L140.2 179.0 L149.9 176.0 L157.8 173.5 L164.5 171.4 L170.3 169.5 L175.4 167.9 L180.0 166.4 L184.1 165.0 L187.9 163.8 L191.4 162.7 L194.6 161.6 L197.6 160.6 L200.4 159.7 L203.0 158.8 L205.5 158.0 L207.9 157.2 L212.2 155.7 L214.2 155.1 L216.2 154.4 L219.8 153.2 L221.5 152.6 L224.7 151.5 L226.2 151.0 L229.1 150.0 L231.9 149.1 L234.4 148.3 L236.8 147.4 L239.1 146.7 L242.3 145.6 L244.3 144.9 L247.2 143.9 L249.9 143.0 L252.4 142.2 L254.8 141.3 L257.1 140.6 L259.9 139.6 L262.0 138.9 L264.5 138.0 L266.9 137.2 L269.8 136.3 L272.4 135.4 L274.9 134.5 L277.3 133.7 L280.0 132.8 L282.1 132.0 L284.9 131.1 L287.2 130.3 L289.7 129.5 L292.4 128.5 L294.9 127.7 L297.3 126.9 L299.9 126.0 L302.3 125.2 L304.8 124.3 L307.4 123.4 L309.9 122.6 L312.4 121.7 L314.8 120.9 L317.5 120.0 L320.0 119.1 L322.5 118.3 L324.9 117.4 L327.4 116.6 L330.0 115.7 L332.4 114.9 L334.9 114.0 L337.4 113.1 L340.0 112.3 L342.4 111.4 L344.9 110.6 L347.5 109.7 L350.0 108.8 L352.4 108.0 L355.0 107.1 L357.5 106.3 L359.9 105.4 L362.5 104.6 L364.9 103.7 L367.4 102.9 L370.0 102.0 L372.5 101.1 L375.0 100.3 L377.5 99.4 L380.0 98.6 L382.5 97.7 L385.0 96.8 L387.5 96.0 L390.0 95.1 L392.5 94.3 L395.0 93.4 L397.5 92.6 L400.0 91.7 L402.5 90.9 L405.0 90.0 L407.5 89.1 L410.0 88.3 L412.5 87.4 L415.0 86.6 L417.5 85.7 L420.0 84.9 L422.5 84.0 L425.0 83.1 L427.5 82.3 L430.0 81.4 L432.5 80.6 L435.0 79.7 L437.5 78.9 L440.0 78.0 L442.5 77.1 L445.0 76.3 L447.5 75.4 L450.0 74.6 L452.5 73.7 L455.0 72.9 L457.5 72.0 L460.0 71.1 L462.5 70.3 L465.0 69.4 L467.5 68.6 L470.0 67.7 L472.5 66.9 L475.0 66.0 L477.5 65.1 L480.0 64.3 L482.5 63.4 L485.0 62.6 L487.5 61.7 L490.0 60.9 L492.5 60.0 L495.0 59.1 L497.5 58.3 L500.0 57.4 L502.5 56.6 L505.0 55.7 L507.5 54.9 L510.0 54.0 L512.5 53.1 L515.0 52.3 L517.5 51.4 L520.0 50.6 L522.5 49.7 L525.0 48.9 L527.5 48.0 L530.0 47.1 L532.5 46.3 L535.0 45.4 L537.5 44.6 L540.0 43.7 L542.5 42.9 L545.0 42.0 L547.5 41.1 L550.0 40.3 L552.5 39.4 L555.0 38.6 L557.5 37.7 L560.0 36.9 L562.5 36.0 L565.0 35.1 L567.5 34.3 L570.0 33.4 L572.5 32.6 L575.0 31.7 L577.5 30.9 L580.0 30.0"/>
<path fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" d="M80.0 210.0 L110.1 210.0 L127.7 210.0 L140.2 210.0 L149.9 210.0 L157.8 210.0 L164.5 210.0 L170.3 210.0 L175.4 210.0 L180.0 210.0 L184.1 210.0 L187.9 210.0 L191.4 210.0 L194.6 210.0 L197.6 210.0 L200.4 210.0 L203.0 210.0 L205.5 210.0 L207.9 210.0 L212.2 210.0 L214.2 210.0 L216.2 210.0 L219.8 210.0 L221.5 210.0 L224.7 209.9 L226.2 209.9 L229.1 209.9 L231.9 209.9 L234.4 209.9 L236.8 209.9 L239.1 209.9 L242.3 209.9 L244.3 209.9 L247.2 209.9 L249.9 209.9 L252.4 209.9 L254.8 209.9 L257.1 209.9 L259.9 209.9 L262.0 209.9 L264.5 209.9 L266.9 209.9 L269.8 209.9 L272.4 209.8 L274.9 209.8 L277.3 209.8 L280.0 209.8 L282.1 209.8 L284.9 209.8 L287.2 209.8 L289.7 209.8 L292.4 209.8 L294.9 209.7 L297.3 209.7 L299.9 209.7 L302.3 209.7 L304.8 209.7 L307.4 209.7 L309.9 209.6 L312.4 209.6 L314.8 209.6 L317.5 209.6 L320.0 209.5 L322.5 209.5 L324.9 209.5 L327.4 209.5 L330.0 209.4 L332.4 209.4 L334.9 209.4 L337.4 209.3 L340.0 209.3 L342.4 209.2 L344.9 209.2 L347.5 209.1 L350.0 209.1 L352.4 209.0 L355.0 209.0 L357.5 208.9 L359.9 208.9 L362.5 208.8 L364.9 208.7 L367.4 208.7 L370.0 208.6 L372.5 208.5 L375.0 208.4 L377.5 208.3 L380.0 208.2 L382.5 208.1 L385.0 208.0 L387.5 207.9 L390.0 207.7 L392.5 207.6 L395.0 207.5 L397.5 207.3 L400.0 207.1 L402.5 207.0 L405.0 206.8 L407.5 206.6 L410.0 206.4 L412.5 206.2 L415.0 206.0 L417.5 205.7 L420.0 205.5 L422.5 205.2 L425.0 204.9 L427.5 204.6 L430.0 204.3 L432.5 204.0 L435.0 203.6 L437.5 203.2 L440.0 202.8 L442.5 202.4 L445.0 202.0 L447.5 201.5 L450.0 201.0 L452.5 200.4 L455.0 199.9 L457.5 199.3 L460.0 198.6 L462.5 198.0 L465.0 197.3 L467.5 196.5 L470.0 195.7 L472.5 194.9 L475.0 194.0 L477.5 193.0 L480.0 192.0 L482.5 190.9 L485.0 189.8 L487.5 188.6 L490.0 187.3 L492.5 186.0 L495.0 184.6 L497.5 183.1 L500.0 181.5 L502.5 179.8 L505.0 178.0 L507.5 176.1 L510.0 174.1 L512.5 172.0 L515.0 169.7 L517.5 167.3 L520.0 164.8 L522.5 162.1 L525.0 159.3 L527.5 156.3 L530.0 153.1 L532.5 149.7 L535.0 146.1 L537.5 142.4 L540.0 138.3 L542.5 134.1 L545.0 129.6 L547.5 124.8 L550.0 119.8 L552.5 114.4 L555.0 108.8 L557.5 102.8 L560.0 96.4 L562.5 89.7 L565.0 82.6 L567.5 75.0 L570.0 67.0 L572.5 58.5 L575.0 49.6 L577.5 40.1 L580.0 30.0"/>
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

## 17.7 Extractors

*Level: expert.*

Physical sources (clock jitter, disk timings, thermal noise) give bits that are
biased and correlated. An **extractor** turns such a source into nearly uniform bits.

**Von Neumann's trick** (1951). For independent coin flips with an unknown bias $p$,
read the flips in pairs and output 0 for "01", 1 for "10", nothing for "00" or "11".
Since $\Pr[01] = \Pr[10] = p(1 - p)$, every output bit is exactly unbiased. The cost
is the rate: $p(1-p)$ output bits per input bit.

```python
# Extractors.  Von Neumann (1951): from independent coins with unknown bias p, read pairs:
# 01 -> 0, 10 -> 1, 00 and 11 -> nothing.  The output is exactly unbiased.
import random
rng = random.Random(17)
p = 0.8
raw = [int(rng.random() < p) for _ in range(200_000)]
out = [a for a, b in zip(raw[::2], raw[1::2]) if a != b]
print(round(sum(raw) / len(raw), 4), len(out), round(sum(out) / len(out), 4), round(len(out) / len(raw), 4), p * (1 - p))
```

```text
0.8001 32002 0.5018 0.16 0.15999999999999998
```

From 200,000 flips with bias 0.8, the extractor produced 32,002 bits with 50.18%
ones, a rate of 0.16 output bits per input bit, as predicted.

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

In practice, the "extract" step of HKDF (Hugo Krawczyk, 2010; RFC 5869) uses
HMAC with a salt as a computational extractor, which works under assumptions about
HMAC and loses far fewer bits than the lemma's $2\log_2(1/\epsilon)$.

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
when it starts to repeat itself.

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

## 17.9 Break it: too little entropy at the wrong moment

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

- *Rényi entropies* $H_\alpha = \frac{1}{1-\alpha}\log_2 \sum p^\alpha$ interpolate:
  $H_1$ is Shannon, $H_2$ is collision entropy (the one in the leftover hash lemma's
  proof), $H_\infty$ is min-entropy.
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

??? question "2. A source outputs A with probability 1/2, B and C with 1/4 each. Compute its Shannon entropy and min-entropy."

    $H = \frac{1}{2} \cdot 1 + 2 \cdot \frac{1}{4} \cdot 2 = 1.5$ bits; $H_\infty = 1$
    bit.

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

??? question "7. A source has min-entropy 200 bits per sample. How many nearly uniform bits can the leftover hash lemma extract with error $2^{-64}$?"

    $m = 200 - 2 \cdot 64 = 72$ bits.

??? question "8. Von Neumann's extractor is applied to a fair coin. What is its output rate?"

    $p(1 - p) = 1/4$ output bits per input bit.

??? question "9. Why does Linux's `/dev/urandom` not need to block once seeded?"

    A cryptographic generator seeded with 256 bits of entropy produces output that no
    feasible computation distinguishes from random; reading it does not use up the
    seed's secrecy, so there is nothing to "run out of".

## What you learned

- Shannon entropy $H(X) = \mathbb{E}[\log_2 1/p(X)]$ measures average uncertainty; it
  is at most $\log_2 n$, reached by the uniform distribution.
- The chain rule $H(X, Y) = H(X) + H(Y \mid X)$ and the mutual information
  $I(X; Y)$ measure what one variable tells about another.
- Perfect secrecy is $I(M; C) = 0$; the one-time pad achieves it, and Shannon's
  theorem shows that any perfectly secret cipher needs $H(K) \ge H(M)$.
- English is about 70% redundant; the unicity distance $H(K)/D$ is the ciphertext
  length at which a key is determined in principle.
- Min-entropy $-\log_2 \max p$ is what a guessing attacker faces; for passwords it is
  tiny.
- Extractors (von Neumann, universal hashing via the leftover hash lemma, HKDF) turn
  weak randomness into keys; operating systems gather noise, estimate min-entropy
  conservatively (SP 800-90B) and seed a cryptographic generator.

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
- In *The cryptography book*: [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md).
