# 16. Probability for Cryptographers

*Every security claim in cryptography is a statement about probability. "AES-128
is secure" means that no affordable attack succeeds with more than a tiny
probability. "Use a fresh nonce" is advice about collisions. "This random number is
uniform" is a claim that can be measured, and is often wrong. This chapter builds
the probability that those claims need, from the beginning: events and conditional
probability, Bayes' rule, expectation, the union bound, the birthday problem done
exactly, statistical distance and why it is the right way to compare
distributions, the modulo bias that makes "random mod n" not random, concentration
bounds, negligible functions, the hybrid argument, and the advantage of an
adversary in a security game.*

!!! abstract "In this chapter"
    **You will learn:**

    - sample spaces, events, conditional probability, independence and Bayes' rule;
    - random variables, expectation and variance, and the geometric distribution;
    - the union bound, and the birthday problem exactly and approximately, with a
      collision hunt on a truncated hash;
    - statistical distance, its meaning as the best distinguishing advantage, and
      modulo bias with its fix, rejection sampling;
    - how the advantage of a distinguisher grows with the number of samples;
    - Markov, Chebyshev and Chernoff-Hoeffding bounds, checked against exact tails;
    - negligible functions, security games, advantage and the hybrid argument.

    **You need:** fractions, powers and logarithms. Chapters
    [1](01-Mathematics-for-Secrets.md) and [3](03-Modular-Arithmetic.md) help.

    **Levels:** §16.1 to §16.4 are for beginners, §16.5 to §16.7 are intermediate,
    §16.8 to §16.10 are expert.

## 16.1 The problem

*Level: beginner.*

A 128-bit key can be guessed. The chance that one guess is right is $2^{-128}$, and
that number, not the impossibility of guessing, is what security means. Every
standard speaks this way. NIST says that AES-GCM with random 96-bit nonces must not
be used for more than $2^{32}$ messages under one key, because past that point the
probability of a repeated nonce, which is catastrophic for GCM, stops being
negligible. A protocol proof ends with a bound like

$$
\mathrm{Adv}(\mathcal{A}) \le \frac{q^2}{2^{n+1}} + \mathrm{Adv}^{\text{prf}}(\mathcal{B}),
$$

and reading it requires knowing what an advantage is, where the $q^2$ came from, and
when $2^{-n}$ is small enough. That is this chapter.

## 16.2 Events and probabilities

*Level: beginner.*

A **sample space** $\Omega$ lists every possible outcome of an experiment; an
**event** is a set of outcomes; a **probability** assigns each event a number in
$[0, 1]$, with $\Pr[\Omega] = 1$ and $\Pr[A \cup B] = \Pr[A] + \Pr[B]$ when $A$ and
$B$ are disjoint. In cryptography the space is almost always finite and the outcomes
equally likely, so

$$
\Pr[A] = \frac{|A|}{|\Omega|}.
$$

Useful consequences: $\Pr[\text{not } A] = 1 - \Pr[A]$, and for any events
$\Pr[A \cup B] = \Pr[A] + \Pr[B] - \Pr[A \cap B]$.

### By hand

- A 4-digit PIN chosen uniformly: $\Omega$ has $10^4$ outcomes. Three guesses at a
  bank machine succeed with probability $3/10^4 = 0.03\%$. (Real PINs are far from
  uniform: in one widely cited analysis of 3.4 million leaked PINs, by DataGenetics
  in 2012, 1234 alone made up about 11%.)
- Two fair dice: the event "total 7" has 6 of 36 outcomes, probability $1/6$.
- A uniformly random 128-bit key starts with 20 zero bits with probability
  $2^{108}/2^{128} = 2^{-20}$, about one in a million.

## 16.3 Conditional probability, independence and Bayes

*Level: beginner.*

The probability of $A$ **given** $B$ (with $\Pr[B] > 0$) is

$$
\Pr[A \mid B] = \frac{\Pr[A \cap B]}{\Pr[B]}.
$$

$A$ and $B$ are **independent** when $\Pr[A \cap B] = \Pr[A]\Pr[B]$, that is, when
learning $B$ does not change the probability of $A$. The bits of a good key are
independent; the characters of a human password are not.

Writing $\Pr[A \cap B]$ two ways gives **Bayes' rule**:

$$
\Pr[A \mid B] = \frac{\Pr[B \mid A]\,\Pr[A]}{\Pr[B]}, \qquad \Pr[B] = \Pr[B \mid
A]\Pr[A] + \Pr[B \mid \text{not } A]\Pr[\text{not } A].
$$

Bayes is the arithmetic of evidence. An intrusion detector that catches 99% of
attacks and false-alarms on 1% of normal events sounds excellent. But if only one
event in 10,000 is an attack, then out of a million events, 100 are attacks (99
alarms) and 999,900 are not (9,999 alarms). An alarm means an attack with probability
$99/10098 \approx 1\%$. This is the **base-rate fallacy**, and it is why alert fatigue
is real.

```python
# Bayes' rule: a detector that is right 99% of the time, and an event that is rare.
from fractions import Fraction

def posterior(prior, hit_rate, false_alarm):
    """P(event | alarm) = P(alarm | event) P(event) / P(alarm)."""
    p_alarm = hit_rate * prior + false_alarm * (1 - prior)
    return hit_rate * prior / p_alarm

for prior in (Fraction(1, 2), Fraction(1, 100), Fraction(1, 10000)):
    print(prior, round(float(posterior(prior, Fraction(99, 100), Fraction(1, 100))), 4))
```

```text
1/2 0.99
1/100 0.5
1/10000 0.0098
```

The same detector gives a 99% reliable alarm when attacks are as common as normal
events, 50% when they are 1 in 100, and under 1% when they are 1 in 10,000.

Side-channel attacks are Bayes in action: each power trace is weak evidence about a
key byte, and the attacker multiplies the likelihoods of 256 hypotheses until one
dominates (*Cryptanalysis*
[chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)).

## 16.4 Random variables and expectation

*Level: beginner.*

A **random variable** $X$ is a number determined by the outcome. Its **expectation**
is the probability-weighted average,

$$
\mathbb{E}[X] = \sum_x x \Pr[X = x].
$$

The most useful fact in the subject is **linearity**: $\mathbb{E}[X + Y] =
\mathbb{E}[X] + \mathbb{E}[Y]$ always, even when $X$ and $Y$ are dependent. The
**variance** $\mathrm{Var}[X] = \mathbb{E}[(X - \mathbb{E}X)^2] = \mathbb{E}[X^2] -
(\mathbb{E}X)^2$ measures spread; for independent variables variances add.

Three examples that recur:

- **Exhaustive search.** Trying the $N$ keys in random order, the right one is found
  at a uniformly random position, so the expected number of trials is
  $\frac{1}{N}(1 + 2 + \cdots + N) = \frac{N+1}{2}$. "Brute force takes $2^{127}$
  tries on average" for a 128-bit key.
- **Counting pairs.** Among $k$ random values from $N$, the number of colliding pairs
  is a sum of $\binom{k}{2}$ indicator variables, each with expectation $1/N$. By
  linearity, the expected number of collisions is $\binom{k}{2}/N \approx k^2/2N$,
  with no need to handle the dependencies.
- **Geometric trials.** If each try succeeds independently with probability $p$, the
  number of tries until the first success has $\Pr[T = t] = (1 - p)^{t-1}p$ and
  $\mathbb{E}[T] = 1/p$. Rejection sampling (§16.6), generating random primes
  (Chapter 6) and finding a curve of prime order (Chapter 13) all cost $1/p$ tries.

## 16.5 The union bound and the birthday problem

*Level: intermediate.*

**The union bound**: for any events, $\Pr[A_1 \cup \cdots \cup A_m] \le \sum_i
\Pr[A_i]$. It ignores overlaps, so it is only an upper bound, but it needs no
independence, and most security proofs are built from it.

### The birthday problem, exactly

Draw $k$ values independently and uniformly from a set of size $N$. The probability
that all are different is

$$
\Pr[\text{no collision}] = \frac{N}{N} \cdot \frac{N-1}{N} \cdots \frac{N-k+1}{N} =
\prod_{i=0}^{k-1}\left(1 - \frac{i}{N}\right).
$$

For birthdays ($N = 365$) the probability of a shared birthday passes one half at
$k = 23$.

```python
# The birthday problem, exactly: the chance that k values drawn uniformly from N are all different.
from fractions import Fraction
from math import exp, log, sqrt, pi, comb

def p_distinct(k, N):
    p = 1.0
    for i in range(k):
        p *= (N - i) / N
    return p

def p_distinct_exact(k, N):
    p = Fraction(1)
    for i in range(k):
        p *= Fraction(N - i, N)
    return p

print([round(1 - p_distinct(k, 365), 4) for k in (10, 20, 22, 23, 30, 50, 70)])
print(float(1 - p_distinct_exact(23, 365)), next(k for k in range(1, 400) if p_distinct(k, 365) < 0.5))
for bits in (32, 64, 128):
    N = 2**bits
    k_half = sqrt(2 * log(2) * N)
    print(bits, round(log(k_half, 2), 3), round(log(sqrt(pi * N / 2), 2), 3))
```

```text
[0.1169, 0.4114, 0.4757, 0.5073, 0.7063, 0.9704, 0.9992]
0.5072972343239854 23
32 16.236 16.326
64 32.236 32.326
128 64.236 64.326
```

The second line gives the exact value at 23 people, $0.50730\ldots$, and confirms 23
as the threshold. The table below it gives, for $N = 2^{32}, 2^{64}, 2^{128}$, the
$\log_2$ of the number of draws for a 50% chance of a collision, and the $\log_2$ of
the expected number of draws until the first collision: both are about $\sqrt{N}$,
that is, half the bits.

**Bounds.** The union bound over the $\binom{k}{2}$ pairs gives the upper bound

$$
\Pr[\text{collision}] \le \binom{k}{2}\frac{1}{N} \le \frac{k^2}{2N}.
$$

For a lower bound, use $1 - x \le e^{-x}$ (true for all real $x$, since $e^{-x}$ is
convex and $1 - x$ is its tangent line at 0):

$$
\Pr[\text{no collision}] \le \prod_{i<k} e^{-i/N} = e^{-k(k-1)/2N}, \quad\text{so}\quad
\Pr[\text{collision}] \ge 1 - e^{-k(k-1)/2N}.
$$

When $k(k-1)/2N \le 1$, the right side is at least $(1 - e^{-1})\frac{k(k-1)}{2N}
\approx 0.63\,\frac{k(k-1)}{2N}$. So the collision probability is $\Theta(k^2/N)$, and
a 50% chance needs $k \approx \sqrt{2 \ln 2 \cdot N} \approx 1.18\sqrt{N}$. The
expected number of draws until the first collision is $\sqrt{\pi N/2} \approx
1.25\sqrt{N}$.

### Code it: a real collision hunt

The approximation against the exact product for $N = 2^{32}$, and then eight
collision hunts on SHA-256 cut down to 32 bits.

```python
# The approximation 1 - exp(-k(k-1)/2N) against the exact value, and a real collision hunt
# on SHA-256 truncated to 32 bits.
import hashlib
N = 2**32
for k in (10_000, 50_000, 77_163, 100_000, 200_000):
    approx = 1 - exp(-k * (k - 1) / (2 * N))
    print(k, round(1 - p_distinct(k, N), 6), round(approx, 6))

def first_collision(tag, bits=32):
    seen = {}
    i = 0
    while True:
        h = int.from_bytes(hashlib.sha256(tag + i.to_bytes(8, "big")).digest()[:bits // 8], "big")
        if h in seen:
            return i + 1, seen[h], i
        seen[h] = i
        i += 1

trials = [first_collision(bytes([t]))[0] for t in range(8)]
print(trials, round(sum(trials) / len(trials)), round(sqrt(pi * N / 2)))
```

```text
10000 0.011573 0.011573
50000 0.252509 0.252509
77163 0.5 0.499998
100000 0.687812 0.687809
200000 0.990502 0.990501
[76021, 50615, 88355, 82513, 32721, 87726, 76746, 76451] 71394 82137
```

The approximation agrees to five decimals. The eight hunts took between about 33,000
and 88,000 hashes, averaging 71,394, against the predicted $\sqrt{\pi N/2} \approx
82{,}137$: the first collision is a random variable with a wide spread (its standard
deviation is about half its mean), and eight samples give a rough average.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The probability of a collision among k random values from N, plotted against k over the square root of N: it rises from 0, passes one half near 1.18 and reaches nearly 1 by 3" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="70" y1="210" x2="610" y2="210"/><line x1="70" y1="210" x2="70" y2="20"/></g>
<line x1="70" y1="120.0" x2="610" y2="120.0" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".6"/>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M70.0 210.0 L71.5 210.0 L73.0 210.0 L74.5 209.9 L76.0 209.9 L77.5 209.8 L79.0 209.7 L80.5 209.6 L82.0 209.4 L83.5 209.3 L85.0 209.1 L86.5 208.9 L88.0 208.7 L89.5 208.5 L91.0 208.2 L92.5 208.0 L94.0 207.7 L95.5 207.4 L97.0 207.1 L98.5 206.8 L100.0 206.4 L101.5 206.1 L103.0 205.7 L104.5 205.3 L106.0 204.9 L107.5 204.5 L109.0 204.0 L110.5 203.6 L112.0 203.1 L113.5 202.6 L115.0 202.1 L116.5 201.6 L118.0 201.0 L119.5 200.5 L121.0 199.9 L122.5 199.3 L124.0 198.7 L125.5 198.1 L127.0 197.5 L128.5 196.8 L130.0 196.2 L131.5 195.5 L133.0 194.8 L134.5 194.1 L136.0 193.4 L137.5 192.7 L139.0 191.9 L140.5 191.2 L142.0 190.4 L143.5 189.6 L145.0 188.8 L146.5 188.0 L148.0 187.2 L149.5 186.4 L151.0 185.6 L152.5 184.7 L154.0 183.9 L155.5 183.0 L157.0 182.1 L158.5 181.2 L160.0 180.3 L161.5 179.4 L163.0 178.5 L164.5 177.6 L166.0 176.7 L167.5 175.7 L169.0 174.8 L170.5 173.8 L172.0 172.8 L173.5 171.9 L175.0 170.9 L176.5 169.9 L178.0 168.9 L179.5 167.9 L181.0 166.9 L182.5 165.9 L184.0 164.8 L185.5 163.8 L187.0 162.8 L188.5 161.8 L190.0 160.7 L191.5 159.7 L193.0 158.6 L194.5 157.5 L196.0 156.5 L197.5 155.4 L199.0 154.4 L200.5 153.3 L202.0 152.2 L203.5 151.1 L205.0 150.1 L206.5 149.0 L208.0 147.9 L209.5 146.8 L211.0 145.7 L212.5 144.6 L214.0 143.5 L215.5 142.4 L217.0 141.4 L218.5 140.3 L220.0 139.2 L221.5 138.1 L223.0 137.0 L224.5 135.9 L226.0 134.8 L227.5 133.7 L229.0 132.6 L230.5 131.5 L232.0 130.5 L233.5 129.4 L235.0 128.3 L236.5 127.2 L238.0 126.1 L239.5 125.1 L241.0 124.0 L242.5 122.9 L244.0 121.9 L245.5 120.8 L247.0 119.7 L248.5 118.7 L250.0 117.6 L251.5 116.6 L253.0 115.5 L254.5 114.5 L256.0 113.4 L257.5 112.4 L259.0 111.4 L260.5 110.4 L262.0 109.3 L263.5 108.3 L265.0 107.3 L266.5 106.3 L268.0 105.3 L269.5 104.3 L271.0 103.3 L272.5 102.4 L274.0 101.4 L275.5 100.4 L277.0 99.5 L278.5 98.5 L280.0 97.6 L281.5 96.6 L283.0 95.7 L284.5 94.7 L286.0 93.8 L287.5 92.9 L289.0 92.0 L290.5 91.1 L292.0 90.2 L293.5 89.3 L295.0 88.4 L296.5 87.6 L298.0 86.7 L299.5 85.8 L301.0 85.0 L302.5 84.1 L304.0 83.3 L305.5 82.5 L307.0 81.7 L308.5 80.9 L310.0 80.0 L311.5 79.2 L313.0 78.5 L314.5 77.7 L316.0 76.9 L317.5 76.1 L319.0 75.4 L320.5 74.6 L322.0 73.9 L323.5 73.2 L325.0 72.4 L326.5 71.7 L328.0 71.0 L329.5 70.3 L331.0 69.6 L332.5 68.9 L334.0 68.3 L335.5 67.6 L337.0 66.9 L338.5 66.3 L340.0 65.6 L341.5 65.0 L343.0 64.4 L344.5 63.7 L346.0 63.1 L347.5 62.5 L349.0 61.9 L350.5 61.3 L352.0 60.7 L353.5 60.2 L355.0 59.6 L356.5 59.0 L358.0 58.5 L359.5 58.0 L361.0 57.4 L362.5 56.9 L364.0 56.4 L365.5 55.9 L367.0 55.3 L368.5 54.9 L370.0 54.4 L371.5 53.9 L373.0 53.4 L374.5 52.9 L376.0 52.5 L377.5 52.0 L379.0 51.6 L380.5 51.1 L382.0 50.7 L383.5 50.3 L385.0 49.8 L386.5 49.4 L388.0 49.0 L389.5 48.6 L391.0 48.2 L392.5 47.8 L394.0 47.5 L395.5 47.1 L397.0 46.7 L398.5 46.4 L400.0 46.0 L401.5 45.7 L403.0 45.3 L404.5 45.0 L406.0 44.6 L407.5 44.3 L409.0 44.0 L410.5 43.7 L412.0 43.4 L413.5 43.1 L415.0 42.8 L416.5 42.5 L418.0 42.2 L419.5 41.9 L421.0 41.6 L422.5 41.4 L424.0 41.1 L425.5 40.9 L427.0 40.6 L428.5 40.3 L430.0 40.1 L431.5 39.9 L433.0 39.6 L434.5 39.4 L436.0 39.2 L437.5 39.0 L439.0 38.7 L440.5 38.5 L442.0 38.3 L443.5 38.1 L445.0 37.9 L446.5 37.7 L448.0 37.5 L449.5 37.3 L451.0 37.2 L452.5 37.0 L454.0 36.8 L455.5 36.6 L457.0 36.5 L458.5 36.3 L460.0 36.1 L461.5 36.0 L463.0 35.8 L464.5 35.7 L466.0 35.5 L467.5 35.4 L469.0 35.2 L470.5 35.1 L472.0 35.0 L473.5 34.8 L475.0 34.7 L476.5 34.6 L478.0 34.5 L479.5 34.3 L481.0 34.2 L482.5 34.1 L484.0 34.0 L485.5 33.9 L487.0 33.8 L488.5 33.7 L490.0 33.6 L491.5 33.5 L493.0 33.4 L494.5 33.3 L496.0 33.2 L497.5 33.1 L499.0 33.0 L500.5 32.9 L502.0 32.8 L503.5 32.8 L505.0 32.7 L506.5 32.6 L508.0 32.5 L509.5 32.5 L511.0 32.4 L512.5 32.3 L514.0 32.3 L515.5 32.2 L517.0 32.1 L518.5 32.1 L520.0 32.0 L521.5 31.9 L523.0 31.9 L524.5 31.8 L526.0 31.8 L527.5 31.7 L529.0 31.7 L530.5 31.6 L532.0 31.6 L533.5 31.5 L535.0 31.5 L536.5 31.4 L538.0 31.4 L539.5 31.3 L541.0 31.3 L542.5 31.3 L544.0 31.2 L545.5 31.2 L547.0 31.1 L548.5 31.1 L550.0 31.1 L551.5 31.0 L553.0 31.0 L554.5 31.0 L556.0 30.9 L557.5 30.9 L559.0 30.9 L560.5 30.9 L562.0 30.8 L563.5 30.8 L565.0 30.8 L566.5 30.8 L568.0 30.7 L569.5 30.7 L571.0 30.7 L572.5 30.7 L574.0 30.6 L575.5 30.6 L577.0 30.6 L578.5 30.6 L580.0 30.6 L581.5 30.5 L583.0 30.5 L584.5 30.5 L586.0 30.5 L587.5 30.5 L589.0 30.5 L590.5 30.4 L592.0 30.4 L593.5 30.4 L595.0 30.4 L596.5 30.4 L598.0 30.4 L599.5 30.4 L601.0 30.3 L602.5 30.3 L604.0 30.3 L605.5 30.3 L607.0 30.3 L608.5 30.3 L610.0 30.3"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" d="M70.0 210.0 L71.5 210.0 L73.0 210.0 L74.5 209.9 L76.0 209.9 L77.5 209.8 L79.0 209.7 L80.5 209.6 L82.0 209.4 L83.5 209.3 L85.0 209.1 L86.5 208.9 L88.0 208.7 L89.5 208.5 L91.0 208.2 L92.5 208.0 L94.0 207.7 L95.5 207.4 L97.0 207.1 L98.5 206.8 L100.0 206.4 L101.5 206.0 L103.0 205.6 L104.5 205.2 L106.0 204.8 L107.5 204.4 L109.0 203.9 L110.5 203.4 L112.0 202.9 L113.5 202.4 L115.0 201.9 L116.5 201.4 L118.0 200.8 L119.5 200.2 L121.0 199.6 L122.5 199.0 L124.0 198.3 L125.5 197.7 L127.0 197.0 L128.5 196.3 L130.0 195.6 L131.5 194.9 L133.0 194.1 L134.5 193.4 L136.0 192.6 L137.5 191.8 L139.0 191.0 L140.5 190.1 L142.0 189.3 L143.5 188.4 L145.0 187.5 L146.5 186.6 L148.0 185.7 L149.5 184.7 L151.0 183.8 L152.5 182.8 L154.0 181.8 L155.5 180.8 L157.0 179.7 L158.5 178.7 L160.0 177.6 L161.5 176.5 L163.0 175.4 L164.5 174.3 L166.0 173.1 L167.5 172.0 L169.0 170.8 L170.5 169.6 L172.0 168.4 L173.5 167.2 L175.0 165.9 L176.5 164.6 L178.0 163.3 L179.5 162.0 L181.0 160.7 L182.5 159.4 L184.0 158.0 L185.5 156.6 L187.0 155.2 L188.5 153.8 L190.0 152.4 L191.5 151.0 L193.0 149.5 L194.5 148.0 L196.0 146.5 L197.5 145.0 L199.0 143.4 L200.5 141.9 L202.0 140.3 L203.5 138.7 L205.0 137.1 L206.5 135.5 L208.0 133.8 L209.5 132.2 L211.0 130.5 L212.5 128.8 L214.0 127.1 L215.5 125.3 L217.0 123.6 L218.5 121.8 L220.0 120.0 L221.5 118.2 L223.0 116.4 L224.5 114.5 L226.0 112.7 L227.5 110.8 L229.0 108.9 L230.5 107.0 L232.0 105.0 L233.5 103.1 L235.0 101.1 L236.5 99.1 L238.0 97.1 L239.5 95.1 L241.0 93.0 L242.5 91.0 L244.0 88.9 L245.5 86.8 L247.0 84.7 L248.5 82.6 L250.0 80.4 L251.5 78.2 L253.0 76.0 L254.5 73.8 L256.0 71.6 L257.5 69.4 L259.0 67.1 L260.5 64.8 L262.0 62.5 L263.5 60.2 L265.0 57.9 L266.5 55.6 L268.0 53.2 L269.5 50.8 L271.0 48.4 L272.5 46.0 L274.0 43.5 L275.5 41.1 L277.0 38.6 L278.5 36.1 L280.0 33.6 L281.5 31.1"/>
<circle cx="246.6" cy="120.0" r="5" class="acc-fill"/>
<text x="256.6" y="138.0">1.18√N: 50%</text>
<text x="70.0" y="230" text-anchor="middle">0</text>
<text x="220.0" y="230" text-anchor="middle">1</text>
<text x="370.0" y="230" text-anchor="middle">2</text>
<text x="520.0" y="230" text-anchor="middle">3</text>
<text x="332.5" y="252" text-anchor="middle" font-size="12">k / √N</text>
<text x="62" y="214.0" text-anchor="end" font-size="12">0</text>
<text x="62" y="124.0" text-anchor="end" font-size="12">0.5</text>
<text x="62" y="34.0" text-anchor="end" font-size="12">1</text>
<text x="289.0" y="34.0" font-size="12">union bound k²/2N</text>
<text x="460.0" y="27.4" class="acc" font-size="12">Pr[collision]</text>
</svg>
<figcaption>Figure 16.1. The birthday curve. The chance of a collision among k random values from a set of size N depends only on k/√N: one half at about 1.18√N, near certainty by 3√N. The dashed line is the union bound k²/2N, accurate while it is small.</figcaption>
</figure>

## 16.6 Statistical distance and modulo bias

*Level: intermediate.*

How different are two distributions $P$ and $Q$ on the same set? The cryptographic
answer is the **statistical distance** (total variation distance)

$$
\Delta(P, Q) = \frac{1}{2}\sum_x |P(x) - Q(x)| = \max_{S}\,\bigl(P(S) - Q(S)\bigr).
$$

The two forms are equal: the maximum is reached by $S = \{x : P(x) > Q(x)\}$, and on
that set $P(S) - Q(S)$ is half the total absolute difference, because the positive
and negative differences sum to zero.

**Why this is the right measure.** A **distinguisher** sees one sample and outputs
a guess, "P" or "Q". Its advantage is $|\Pr[\text{says P} \mid P] - \Pr[\text{says
P} \mid Q]|$. For any distinguisher, with $S$ the set of samples on which it says
"P", the advantage is $|P(S) - Q(S)| \le \Delta(P, Q)$; and the distinguisher with
$S = \{x : P(x) > Q(x)\}$ achieves it. So $\Delta(P, Q)$ is *exactly* the best
possible advantage from one sample, whatever the computing power. $\blacksquare$

Two more properties make it practical:

- **Triangle inequality**: $\Delta(P, R) \le \Delta(P, Q) + \Delta(Q, R)$.
- **Processing cannot increase it**: for any function $f$ (even randomized),
  $\Delta(f(P), f(Q)) \le \Delta(P, Q)$. So if a key is within $2^{-64}$ of uniform,
  anything computed from it is too.

### Modulo bias

The classic way to get a random number below $n$ is `random_bytes() % n`. If the
random value is uniform on $[0, 2^b)$ and $n$ does not divide $2^b$, the result is
**not** uniform: writing $2^b = an + r$ with $0 \le r < n$, the values $0, \ldots,
r - 1$ occur $a + 1$ times and the others $a$ times. The distance from uniform is

$$
\Delta = \frac{r(n - r)}{n\,2^b}.
$$

```python
# Statistical distance, and modulo bias: a random byte reduced mod n is not uniform.
def stat_dist(P, Q):
    keys = set(P) | set(Q)
    return sum(abs(P.get(x, 0) - Q.get(x, 0)) for x in keys) / 2

def mod_reduce_dist(bits, n):
    counts = {}
    for v in range(2**bits):
        counts[v % n] = counts.get(v % n, 0) + 1
    return {x: Fraction(c, 2**bits) for x, c in counts.items()}

uniform = lambda n: {x: Fraction(1, n) for x in range(n)}
for bits, n in ((8, 10), (8, 100), (8, 255), (16, 10), (16, 1000), (32, 1000)):
    d = stat_dist(mod_reduce_dist(bits, n), uniform(n)) if bits <= 16 else None
    if d is None:                              # closed form: (2^b mod n)(n - 2^b mod n) / (n 2^b)
        r = 2**bits % n
        d = Fraction(r * (n - r), n * 2**bits)
    print(bits, n, float(d))
```

```text
8 10 0.009375
8 100 0.09625
8 255 0.0038909313725490197
16 10 3.662109375e-05
16 1000 0.003794921875
32 1000 4.8518180847167966e-08
```

A random byte modulo 10 is about 0.9% away from uniform; modulo 100 almost 10%.
With 32 bits and $n = 1000$ the distance is about $5 \times 10^{-8}$: small, but a
signature nonce with this much bias, used thousands of times, can leak a private key
(Break it, below).

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Bar chart of a random byte reduced modulo 100: the values 0 to 55 occur 3 times out of 256, the values 56 to 99 only twice" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="60" y1="190" x2="600" y2="190"/></g>
<rect x="60.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="65.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="70.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="76.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="81.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="87.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="92.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="97.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="103.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="108.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="114.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="119.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="124.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="130.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="135.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="141.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="146.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="151.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="157.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="162.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="168.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="173.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="178.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="184.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="189.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="195.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="200.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="205.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="211.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="216.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="222.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="227.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="232.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="238.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="243.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="249.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="254.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="259.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="265.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="270.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="276.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="281.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="286.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="292.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="297.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="303.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="308.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="313.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="319.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="324.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="330.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="335.4" y="55" width="4" height="135" class="acc-fill"/>
<rect x="340.8" y="55" width="4" height="135" class="acc-fill"/>
<rect x="346.2" y="55" width="4" height="135" class="acc-fill"/>
<rect x="351.6" y="55" width="4" height="135" class="acc-fill"/>
<rect x="357.0" y="55" width="4" height="135" class="acc-fill"/>
<rect x="362.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="367.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="373.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="378.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="384.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="389.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="394.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="400.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="405.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="411.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="416.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="421.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="427.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="432.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="438.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="443.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="448.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="454.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="459.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="465.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="470.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="475.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="481.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="486.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="492.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="497.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="502.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="508.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="513.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="519.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="524.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="529.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="535.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="540.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="546.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="551.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="556.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="562.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="567.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="573.0" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="578.4" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="583.8" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="589.2" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<rect x="594.6" y="100" width="4" height="90" class="plain" fill-opacity=".45"/>
<text x="62.0" y="208" text-anchor="middle" font-size="12">0</text>
<text x="364.4" y="208" text-anchor="middle" font-size="12">56</text>
<text x="596.6" y="208" text-anchor="middle" font-size="12">99</text>
<text x="60" y="30" font-size="12">3/256</text><text x="430" y="85" font-size="12">2/256</text>
<text x="330" y="226" text-anchor="middle" font-size="12">value of (random byte) mod 100</text>
</svg>
<figcaption>Figure 16.2. Modulo bias. A uniform byte (0 to 255) reduced mod 100: since 256 = 2 · 100 + 56, the values 0 to 55 come up 3 times in 256 and the values 56 to 99 only twice. The statistical distance from uniform is 56 · 44 / (100 · 256) ≈ 0.096.</figcaption>
</figure>

### The fix: rejection sampling

Draw $b = \lceil \log_2 n \rceil$ random bits, and if the value is $n$ or more, throw
it away and draw again. Every accepted value is equally likely, so the output is
exactly uniform. Each round succeeds with probability $n/2^b > 1/2$, so by the
geometric distribution the expected number of rounds is $2^b/n < 2$. Python's
`secrets.randbelow` works this way.

```python
# The fix: rejection sampling.  Draw b random bits; accept only values below the largest multiple of n.
import secrets
def randbelow(n, rng_bits=secrets.randbits):
    b = n.bit_length()
    while True:
        v = rng_bits(b)
        if v < n:
            return v

import random
rr = random.Random(16)
draws = [randbelow(10, rr.getrandbits) for _ in range(100_000)]
counts = [draws.count(x) for x in range(10)]
print(counts, max(counts) - min(counts))
n = 10
b = n.bit_length()
print(b, Fraction(2**b, n), float(Fraction(2**b, n)))   # expected number of draws: 2^b / n
```

```text
[9873, 10127, 9969, 9916, 9833, 10080, 10040, 9987, 9998, 10177] 344
4 8/5 1.6
```

Each of the ten digits appears close to 10,000 times in 100,000 draws (the spread is
ordinary sampling noise), and the expected cost is $16/10 = 1.6$ draws of 4 bits.

The other standard fix is to **reduce a much longer value**: FIPS 186-5 generates
DSA and ECDSA nonces from 64 more random bits than the group order has, then reduces,
which leaves a bias below $2^{-64}$.

### Shuffling

The same mistake hides in shuffles. The tempting loop "for each position $i$, swap
card $i$ with a card at a uniformly random position $j$ among all $n$" makes $n^n$
equally likely choice sequences, and they must be shared among the $n!$ orderings.
For $n \ge 3$ that cannot be even: $n - 1$ divides $n!$ but shares no factor with
$n^n$, so $n!$ does not divide $n^n$. Some orderings must be more likely than
others. The **Fisher-Yates shuffle** (Ronald Fisher and Frank Yates, 1938; the
in-place version by Richard Durstenfeld, 1964) swaps position $i$, counting down, with
a random position $j \le i$. Its $n \cdot (n-1) \cdots 2 = n!$ choice sequences map
one to one onto the orderings, so every ordering is exactly equally likely.

```python
# Shuffling: the naive "swap each card with any card" is biased; Fisher-Yates is exact.
from itertools import product, permutations
from collections import Counter

def naive_shuffle(choices, n):
    a = list(range(n))
    for i, j in enumerate(choices):            # j ranges over all n positions every time
        a[i], a[j] = a[j], a[i]
    return tuple(a)

def fisher_yates(choices, n):
    a = list(range(n))
    for i, j in zip(range(n - 1, 0, -1), choices):   # j ranges over 0..i only
        a[i], a[j] = a[j], a[i]
    return tuple(a)

n = 3
naive = Counter(naive_shuffle(c, n) for c in product(range(n), repeat=n))
fy = Counter(fisher_yates(c, n) for c in product(*[range(i + 1) for i in range(n - 1, 0, -1)]))
print(sorted(naive.values()), sum(naive.values()), sorted(fy.values()), sum(fy.values()))
for n in (3, 4, 5, 6):
    naive = Counter(naive_shuffle(c, n) for c in product(range(n), repeat=n))
    P = {p: Fraction(c, n**n) for p, c in naive.items()}
    U = {p: Fraction(1, len(list(permutations(range(n))))) for p in permutations(range(n))}
    print(n, round(float(stat_dist(P, U)), 4))
```

```text
[4, 4, 4, 5, 5, 5] 27 [1, 1, 1, 1, 1, 1] 6
3 0.0556
4 0.0651
5 0.0842
6 0.098
```

For three cards the naive loop makes 27 sequences, so three orderings get 5 of them
and three get 4; Fisher-Yates makes 6 sequences, one per ordering. The naive
shuffle's distance from uniform grows with $n$: about 10% for six cards. An online
poker site that shuffled with a flawed algorithm and a weak seed is one of the
stories in *Cryptanalysis* [chapter 18](../cryptanalysis/18-Random-Numbers-Gone-Wrong.md).

## 16.7 Distinguishing with many samples

*Level: intermediate.*

One sample from a coin with bias $\frac{1}{2} + \varepsilon$ gives advantage
$\varepsilon$ over a fair coin. With $t$ independent samples, the statistical
distance between the two product distributions grows, roughly like $\varepsilon
\sqrt{t}$ while that is small: the number of heads differs in mean by $\varepsilon t$
and has standard deviation $\frac{1}{2}\sqrt{t}$, so the two cases become separable
when $\varepsilon t \gtrsim \sqrt{t}$, that is, after about $1/\varepsilon^2$ samples.

```python
# Distinguishing a biased coin: the best single-sample advantage is the statistical distance,
# and t samples help roughly like sqrt(t) until the advantage saturates.
def binom_pmf(t, p):
    return [comb(t, j) * p**j * (1 - p)**(t - j) for j in range(t + 1)]

from math import erf
eps = 0.01
for t in (1, 100, 1_000, 10_000, 40_000):
    if t <= 2000:                              # exact: total variation between two binomials
        P, Q = binom_pmf(t, 0.5 + eps), binom_pmf(t, 0.5)
        adv = sum(abs(a - b) for a, b in zip(P, Q)) / 2
    else:                                      # normal approximation: 2 Phi(z/2) - 1, z = eps sqrt(t) / (1/2)
        z = eps * sqrt(t) / 0.5
        adv = erf(z / 2 / sqrt(2))
    print(t, round(adv, 4))
```

```text
1 0.01
100 0.0799
1000 0.2481
10000 0.6827
40000 0.9545
```

With $\varepsilon = 0.01$: one sample gives advantage 0.01; a hundred give 0.08; ten
thousand ($= 1/\varepsilon^2$) give 0.68; forty thousand give 0.95. The rule of thumb
"a bias of $\varepsilon$ needs about $1/\varepsilon^2$ samples to detect" is the
basis of every statistical attack: linear cryptanalysis with bias $\varepsilon$ needs
about $\varepsilon^{-2}$ known plaintexts, and the RC4 biases of *Cryptanalysis*
[chapter 8](../cryptanalysis/08-Attacks-on-Stream-Ciphers.md) needed millions to billions of ciphertexts for exactly
this reason.


<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The best advantage in telling a coin with bias epsilon from a fair coin, against the number of samples in units of 1 over epsilon squared: it rises like a square root at first, reaches 0.68 at 1 over epsilon squared and 0.95 at 4 over epsilon squared" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="70" y1="210" x2="610" y2="210"/><line x1="70" y1="210" x2="70" y2="20"/></g>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M70.0 210.0 L71.0 195.7 L72.1 189.8 L73.2 185.2 L74.2 181.5 L75.2 178.2 L76.3 175.2 L77.3 172.4 L78.4 169.9 L79.5 167.6 L80.5 165.3 L81.5 163.2 L82.6 161.2 L83.7 159.3 L84.7 157.5 L85.8 155.7 L86.8 154.0 L87.8 152.4 L88.9 150.8 L90.0 149.3 L91.0 147.8 L92.0 146.4 L93.1 145.0 L94.2 143.7 L95.2 142.4 L96.2 141.1 L97.3 139.8 L98.3 138.6 L99.4 137.4 L100.5 136.2 L101.5 135.1 L102.5 134.0 L103.6 132.9 L104.7 131.8 L105.7 130.8 L106.8 129.7 L107.8 128.7 L108.8 127.7 L109.9 126.8 L111.0 125.8 L112.0 124.9 L113.0 124.0 L114.1 123.0 L115.2 122.2 L116.2 121.3 L117.2 120.4 L118.3 119.6 L119.3 118.7 L120.4 117.9 L121.4 117.1 L122.5 116.3 L123.6 115.5 L124.6 114.8 L125.7 114.0 L126.7 113.2 L127.8 112.5 L128.8 111.8 L129.8 111.0 L130.9 110.3 L131.9 109.6 L133.0 108.9 L134.1 108.3 L135.1 107.6 L136.2 106.9 L137.2 106.3 L138.2 105.6 L139.3 105.0 L140.4 104.3 L141.4 103.7 L142.4 103.1 L143.5 102.5 L144.6 101.9 L145.6 101.3 L146.6 100.7 L147.7 100.1 L148.8 99.6 L149.8 99.0 L150.9 98.4 L151.9 97.9 L152.9 97.3 L154.0 96.8 L155.1 96.3 L156.1 95.7 L157.1 95.2 L158.2 94.7 L159.2 94.2 L160.3 93.7 L161.3 93.2 L162.4 92.7 L163.4 92.2 L164.5 91.7 L165.6 91.2 L166.6 90.7 L167.7 90.3 L168.7 89.8 L169.8 89.3 L170.8 88.9 L171.8 88.4 L172.9 88.0 L173.9 87.6 L175.0 87.1 L176.1 86.7 L177.1 86.3 L178.2 85.8 L179.2 85.4 L180.2 85.0 L181.3 84.6 L182.4 84.2 L183.4 83.8 L184.4 83.4 L185.5 83.0 L186.6 82.6 L187.6 82.2 L188.6 81.8 L189.7 81.4 L190.8 81.0 L191.8 80.7 L192.8 80.3 L193.9 79.9 L194.9 79.6 L196.0 79.2 L197.1 78.8 L198.1 78.5 L199.2 78.1 L200.2 77.8 L201.2 77.4 L202.3 77.1 L203.3 76.8 L204.4 76.4 L205.5 76.1 L206.5 75.8 L207.6 75.4 L208.6 75.1 L209.7 74.8 L210.7 74.5 L211.8 74.2 L212.8 73.8 L213.9 73.5 L214.9 73.2 L215.9 72.9 L217.0 72.6 L218.0 72.3 L219.1 72.0 L220.2 71.7 L221.2 71.4 L222.2 71.1 L223.3 70.8 L224.3 70.6 L225.4 70.3 L226.4 70.0 L227.5 69.7 L228.6 69.4 L229.6 69.2 L230.7 68.9 L231.7 68.6 L232.8 68.4 L233.8 68.1 L234.8 67.8 L235.9 67.6 L237.0 67.3 L238.0 67.1 L239.1 66.8 L240.1 66.6 L241.1 66.3 L242.2 66.1 L243.2 65.8 L244.3 65.6 L245.3 65.3 L246.4 65.1 L247.4 64.8 L248.5 64.6 L249.5 64.4 L250.6 64.1 L251.7 63.9 L252.7 63.7 L253.8 63.5 L254.8 63.2 L255.8 63.0 L256.9 62.8 L258.0 62.6 L259.0 62.3 L260.1 62.1 L261.1 61.9 L262.1 61.7 L263.2 61.5 L264.2 61.3 L265.3 61.1 L266.4 60.9 L267.4 60.7 L268.4 60.5 L269.5 60.3 L270.5 60.1 L271.6 59.9 L272.6 59.7 L273.7 59.5 L274.8 59.3 L275.8 59.1 L276.9 58.9 L277.9 58.7 L278.9 58.5 L280.0 58.3 L281.0 58.1 L282.1 57.9 L283.1 57.8 L284.2 57.6 L285.2 57.4 L286.3 57.2 L287.4 57.0 L288.4 56.9 L289.4 56.7 L290.5 56.5 L291.5 56.3 L292.6 56.2 L293.6 56.0 L294.7 55.8 L295.8 55.7 L296.8 55.5 L297.9 55.3 L298.9 55.2 L299.9 55.0 L301.0 54.8 L302.0 54.7 L303.1 54.5 L304.1 54.4 L305.2 54.2 L306.2 54.1 L307.3 53.9 L308.4 53.7 L309.4 53.6 L310.5 53.4 L311.5 53.3 L312.6 53.1 L313.6 53.0 L314.6 52.8 L315.7 52.7 L316.8 52.6 L317.8 52.4 L318.9 52.3 L319.9 52.1 L321.0 52.0 L322.0 51.8 L323.1 51.7 L324.1 51.6 L325.1 51.4 L326.2 51.3 L327.2 51.2 L328.3 51.0 L329.4 50.9 L330.4 50.8 L331.5 50.6 L332.5 50.5 L333.5 50.4 L334.6 50.2 L335.6 50.1 L336.7 50.0 L337.8 49.9 L338.8 49.7 L339.8 49.6 L340.9 49.5 L341.9 49.4 L343.0 49.2 L344.1 49.1 L345.1 49.0 L346.1 48.9 L347.2 48.8 L348.2 48.6 L349.3 48.5 L350.3 48.4 L351.4 48.3 L352.4 48.2 L353.5 48.1 L354.6 47.9 L355.6 47.8 L356.6 47.7 L357.7 47.6 L358.8 47.5 L359.8 47.4 L360.9 47.3 L361.9 47.2 L362.9 47.1 L364.0 47.0 L365.1 46.9 L366.1 46.8 L367.2 46.7 L368.2 46.5 L369.2 46.4 L370.3 46.3 L371.4 46.2 L372.4 46.1 L373.4 46.0 L374.5 45.9 L375.6 45.8 L376.6 45.7 L377.7 45.7 L378.7 45.6 L379.8 45.5 L380.8 45.4 L381.9 45.3 L382.9 45.2 L384.0 45.1 L385.0 45.0 L386.0 44.9 L387.1 44.8 L388.1 44.7 L389.2 44.6 L390.2 44.5 L391.3 44.4 L392.3 44.4 L393.4 44.3 L394.4 44.2 L395.5 44.1 L396.6 44.0 L397.6 43.9 L398.6 43.8 L399.7 43.8 L400.8 43.7 L401.8 43.6 L402.8 43.5 L403.9 43.4 L404.9 43.3 L406.0 43.3 L407.1 43.2 L408.1 43.1 L409.1 43.0 L410.2 42.9 L411.2 42.9 L412.3 42.8 L413.4 42.7 L414.4 42.6 L415.4 42.5 L416.5 42.5 L417.6 42.4 L418.6 42.3 L419.7 42.2 L420.7 42.2 L421.8 42.1 L422.8 42.0 L423.9 42.0 L424.9 41.9 L425.9 41.8 L427.0 41.7 L428.1 41.7 L429.1 41.6 L430.2 41.5 L431.2 41.5 L432.2 41.4 L433.3 41.3 L434.4 41.2 L435.4 41.2 L436.5 41.1 L437.5 41.0 L438.5 41.0 L439.6 40.9 L440.6 40.8 L441.7 40.8 L442.8 40.7 L443.8 40.7 L444.8 40.6 L445.9 40.5 L446.9 40.5 L448.0 40.4 L449.1 40.3 L450.1 40.3 L451.1 40.2 L452.2 40.2 L453.2 40.1 L454.3 40.0 L455.3 40.0 L456.4 39.9 L457.4 39.9 L458.5 39.8 L459.6 39.7 L460.6 39.7 L461.6 39.6 L462.7 39.6 L463.8 39.5 L464.8 39.4 L465.9 39.4 L466.9 39.3 L467.9 39.3 L469.0 39.2 L470.1 39.2 L471.1 39.1 L472.2 39.1 L473.2 39.0 L474.2 39.0 L475.3 38.9 L476.4 38.8 L477.4 38.8 L478.4 38.7 L479.5 38.7 L480.6 38.6 L481.6 38.6 L482.7 38.5 L483.7 38.5 L484.8 38.4 L485.8 38.4 L486.9 38.3 L487.9 38.3 L489.0 38.2 L490.0 38.2 L491.0 38.1 L492.1 38.1 L493.2 38.0 L494.2 38.0 L495.2 38.0 L496.3 37.9 L497.4 37.9 L498.4 37.8 L499.4 37.8 L500.5 37.7 L501.6 37.7 L502.6 37.6 L503.6 37.6 L504.7 37.5 L505.8 37.5 L506.8 37.5 L507.8 37.4 L508.9 37.4 L510.0 37.3 L511.0 37.3 L512.0 37.2 L513.1 37.2 L514.2 37.1 L515.2 37.1 L516.2 37.1 L517.3 37.0 L518.3 37.0 L519.4 36.9 L520.5 36.9 L521.5 36.9 L522.5 36.8 L523.6 36.8 L524.7 36.7 L525.7 36.7 L526.8 36.7 L527.8 36.6 L528.9 36.6 L529.9 36.5 L531.0 36.5 L532.0 36.5 L533.0 36.4 L534.1 36.4 L535.1 36.4 L536.2 36.3 L537.2 36.3 L538.3 36.2 L539.3 36.2 L540.4 36.2 L541.5 36.1 L542.5 36.1 L543.5 36.1 L544.6 36.0 L545.7 36.0 L546.7 36.0 L547.8 35.9 L548.8 35.9 L549.9 35.9 L550.9 35.8 L552.0 35.8 L553.0 35.8 L554.0 35.7 L555.1 35.7 L556.1 35.7 L557.2 35.6 L558.2 35.6 L559.3 35.6 L560.3 35.5 L561.4 35.5 L562.5 35.5 L563.5 35.4 L564.5 35.4 L565.6 35.4 L566.7 35.3 L567.7 35.3 L568.8 35.3 L569.8 35.2 L570.8 35.2 L571.9 35.2 L573.0 35.2 L574.0 35.1 L575.0 35.1 L576.1 35.1 L577.2 35.0 L578.2 35.0 L579.2 35.0 L580.3 34.9 L581.4 34.9 L582.4 34.9 L583.4 34.9 L584.5 34.8 L585.6 34.8 L586.6 34.8 L587.6 34.8 L588.7 34.7 L589.8 34.7 L590.8 34.7 L591.9 34.6 L592.9 34.6 L594.0 34.6 L595.0 34.6"/>
<circle cx="71.0" cy="195.6" r="5"/>
<circle cx="80.5" cy="165.3" r="5"/>
<circle cx="175.0" cy="87.1" r="5"/>
<circle cx="490.0" cy="38.2" r="5"/>
<text x="185.0" y="103.1" font-size="12">t = 1/ε²: 0.68</text>
<text x="480.0" y="60.2" font-size="12">t = 4/ε²: 0.95</text>
<text x="70.0" y="230" text-anchor="middle">0</text>
<text x="175.0" y="230" text-anchor="middle">1</text>
<text x="280.0" y="230" text-anchor="middle">2</text>
<text x="385.0" y="230" text-anchor="middle">3</text>
<text x="490.0" y="230" text-anchor="middle">4</text>
<text x="595.0" y="230" text-anchor="middle">5</text>
<text x="332.5" y="252" text-anchor="middle" font-size="12">number of samples t, in units of 1/ε²</text>
<text x="62" y="214.0" text-anchor="end" font-size="12">0</text>
<text x="62" y="124.0" text-anchor="end" font-size="12">0.5</text>
<text x="62" y="34.0" text-anchor="end" font-size="12">1</text>
<text x="80" y="30" font-size="12">best advantage</text>
</svg>
<figcaption>Figure 16.3. How evidence accumulates. The best advantage for telling a coin with bias ε from a fair one, as the number of samples grows (normal approximation; the dots are the values printed by the code above, for ε = 0.01). Measured in units of 1/ε², the curve is the same for every small ε.</figcaption>
</figure>

## 16.8 Concentration bounds

*Level: expert.*

How far can a random variable stray from its mean? Three bounds, from crude to
sharp.

**Markov.** If $X \ge 0$, then $\Pr[X \ge a] \le \mathbb{E}[X]/a$. *Proof*:
$\mathbb{E}[X] \ge \mathbb{E}[X \cdot \mathbf{1}_{X \ge a}] \ge a\Pr[X \ge a]$.
$\blacksquare$

**Chebyshev.** $\Pr[|X - \mathbb{E}X| \ge a] \le \mathrm{Var}[X]/a^2$. *Proof*:
Markov applied to $(X - \mathbb{E}X)^2 \ge a^2$. $\blacksquare$

**Chernoff-Hoeffding.** If $X_1, \ldots, X_t$ are independent with values in
$[0, 1]$ and $\bar{X}$ is their average, then

$$
\Pr\bigl[\bar{X} \ge \mathbb{E}\bar{X} + \delta\bigr] \le e^{-2\delta^2 t}.
$$

*Proof idea* (Herman Chernoff 1952, Wassily Hoeffding 1963): apply Markov to
$e^{\lambda \sum X_i}$, use independence to split the expectation into a product, bound
each factor by $e^{\lambda \mathbb{E}X_i + \lambda^2/8}$ (Hoeffding's lemma), and
choose $\lambda = 4\delta$.

The point is the exponential decay: averaging $t$ samples makes deviations of size
$\delta$ exponentially unlikely in $\delta^2 t$. Amplification relies on it: a test
that is right with probability $\frac{1}{2} + \varepsilon$, repeated
$O(\log(1/\eta)/\varepsilon^2)$ times with a majority vote, is wrong with probability
at most $\eta$. That is why Miller-Rabin's $\frac{1}{4}$ error per round is
harmless (Chapter 6), and why a statistical attack with a small bias still succeeds
with enough data.

```python
# Chernoff-Hoeffding against the exact tail: P(at least (1/2 + d) t heads in t fair flips) <= exp(-2 d^2 t).
for t, d in ((100, 0.1), (1000, 0.05), (1000, 0.1), (10000, 0.02)):
    lo = int((0.5 + d) * t + 0.999999)
    exact = sum(comb(t, j) for j in range(lo, t + 1)) / 2**t
    print(t, d, "%.3e" % exact, "%.3e" % exp(-2 * d * d * t))
```

```text
100 0.1 2.844e-02 1.353e-01
1000 0.05 8.653e-04 6.738e-03
1000 0.1 1.364e-10 2.061e-09
10000 0.02 3.297e-05 3.355e-04
```

The columns are $t$, $\delta$, the exact tail of the binomial, and the Hoeffding
bound. The bound is always above the truth, by a factor of 5 to 15 here, and it has
the right exponential shape.

## 16.9 Negligible functions, games and advantage

*Level: expert.*

Modern definitions of security (Shafi Goldwasser and Silvio Micali, 1982 to 1984)
describe a **game** between a challenger and an adversary $\mathcal{A}$. For
encryption, the IND-CPA game is:

1. The challenger picks a key $K$ and a secret bit $b$.
2. $\mathcal{A}$ may ask for encryptions of messages of its choice.
3. $\mathcal{A}$ submits two messages $m_0, m_1$ of the same length and receives
   $\mathrm{Enc}_K(m_b)$.
4. $\mathcal{A}$ outputs a guess $b'$.

Guessing at random wins half the time, so the measure is the **advantage**

$$
\mathrm{Adv}(\mathcal{A}) = \bigl|\,2\Pr[b' = b] - 1\,\bigr| = \bigl|\Pr[b' = 1 \mid
b = 1] - \Pr[b' = 1 \mid b = 0]\bigr|.
$$

A function $\nu(\lambda)$ of the security parameter is **negligible** if it
eventually falls below $1/\lambda^c$ for every constant $c$; $2^{-\lambda}$ is the
typical example. A scheme is secure if every efficient adversary has negligible
advantage. In practice, standards replace asymptotics by concrete numbers: "128-bit
security" means that an adversary running in time $t$ has advantage at most about
$t/2^{128}$.

### Code it: a cipher that leaks one bit

A stream cipher that, by mistake, sends the lowest bit of the first plaintext byte
in the clear. The adversary chooses $m_0$ and $m_1$ that differ exactly in that bit.

```python
# The IND-CPA game against a cipher that leaks one bit (the parity of the plaintext's first byte).
game_rng = random.Random(8)

def leaky_encrypt(key, msg):
    stream = hashlib.sha256(key + game_rng.getrandbits(128).to_bytes(16, "big")).digest()
    body = bytes(a ^ b for a, b in zip(msg, stream))
    return bytes([msg[0] & 1]) + body          # the bug: a plaintext bit in the clear

def play(adversary, trials=2000):
    wins = 0
    for _ in range(trials):
        key = game_rng.getrandbits(128).to_bytes(16, "big")
        m0, m1, guess_rule = adversary()
        b = game_rng.getrandbits(1)
        c = leaky_encrypt(key, [m0, m1][b])
        wins += guess_rule(c) == b
    return wins / trials

def parity_adversary():
    m0, m1 = b"\x00" * 16, b"\x01" + b"\x00" * 15
    return m0, m1, lambda c: c[0]

def blind_adversary():
    return b"\x00" * 16, b"\x01" * 16, lambda c: game_rng.getrandbits(1)

for adv in (parity_adversary, blind_adversary):
    w = play(adv)
    print(adv.__name__, w, round(abs(2 * w - 1), 3))
```

```text
parity_adversary 1.0 1.0
blind_adversary 0.5075 0.015
```

The parity adversary wins every one of 2,000 games: advantage 1. An adversary that
ignores the ciphertext wins 50.75% of the time, an empirical advantage of 0.015,
which is sampling noise around the true value 0. (With 2,000 trials the noise has
standard deviation about $1/\sqrt{2000} \approx 0.022$, so no advantage below about
0.05 could be measured reliably this way; small advantages are proved, not measured.)

### The hybrid argument

To show that two distributions $H_0$ and $H_m$ are hard to tell apart, connect them
by a chain $H_0, H_1, \ldots, H_m$ in which each neighbor pair differs in one small
step. If a distinguisher $D$ has advantage $\epsilon$ between $H_0$ and $H_m$, then
by the triangle inequality

$$
\epsilon = \bigl|\Pr[D(H_0) = 1] - \Pr[D(H_m) = 1]\bigr| \le \sum_{i=1}^{m}
\bigl|\Pr[D(H_{i-1}) = 1] - \Pr[D(H_i) = 1]\bigr|,
$$

so some neighboring pair is distinguished with advantage at least $\epsilon/m$.
$\blacksquare$

Example: if one encryption is indistinguishable with advantage at most $\epsilon$,
then $m$ encryptions are indistinguishable with advantage at most $m\epsilon$. The
hybrids replace the encryptions of $m_0$ by those of $m_1$ one at a time. The factor
$m$ is the price of the argument; it is why bounds in standards grow with the
number of messages.

## 16.10 Break it: biased nonces and birthday-bound modes

*Level: expert.*

**Biased signature nonces.** A DSA or ECDSA signature uses a secret nonce $k$, and
each signature gives a linear equation in $k$ and the private key. If the nonces are
slightly non-uniform, for example because they were generated as `random % q` with a
random value only a little longer than $q$, then many signatures together give a
hidden-number problem that lattice reduction or Fourier methods solve. Daniel
Bleichenbacher showed around 2000 that the modulo bias of the original DSA nonce
generation could be exploited this way, which is why FIPS 186 changed its method, and
attacks since then have recovered keys from nonce biases of a single bit or less
(*Cryptanalysis* [chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md)).

**Birthday-bound modes.** A block cipher with $n$-bit blocks used in CBC or CTR mode
starts to leak once about $2^{n/2}$ blocks are encrypted under one key, because
collisions among the cipher's inputs or outputs appear. For the 64-bit blocks of 3DES
and Blowfish that is only $2^{32}$ blocks, 32 GiB. Karthikeyan Bhargavan and Gaëtan
Leurent's Sweet32 attack (2016) captured about 785 GB of HTTPS traffic encrypted with
3DES and recovered a secret cookie from the collisions.

### Fix it

- Generate integers in a range by rejection sampling, or by reducing at least 64
  extra random bits; use the library function (`secrets.randbelow`).
- Use deterministic nonces (RFC 6979) or hedged ones for signatures.
- Count: rotate keys long before $2^{n/2}$ blocks, use 128-bit block ciphers, and
  respect the $2^{32}$-message limit for random 96-bit GCM nonces.

## In the real world

- **Key and nonce sizes** are birthday arithmetic: 256-bit hashes for 128-bit
  collision resistance, 96-bit random nonces good for $2^{32}$ messages (a collision
  chance around $2^{-33}$), 122 random bits in a version-4 UUID.
- **Randomness APIs** (`secrets`, `getrandom`, `crypto.getRandomValues`) return
  uniform bytes; turning them into a number in a range is where bias creeps in.
- **Proof bounds** in standards and papers, such as the GCM bound or the ML-KEM
  failure probability, are concrete advantages with explicit $q^2/2^n$ terms.

## Going deeper

- *Rényi divergence* replaces statistical distance in many lattice proofs, because
  it composes multiplicatively and tolerates larger differences.
- *Computational indistinguishability* (Andrew Yao, 1982; Goldwasser and Micali):
  distributions that are statistically far apart but that no efficient algorithm can
  tell apart. Pseudorandom generators produce them.
- *Exact birthday asymptotics.* The number of draws until the first collision has
  mean $\sqrt{\pi N/2} + O(1)$ and follows the Rayleigh distribution in the limit;
  multicollisions ($r$ equal values) need about $N^{(r-1)/r}$ draws.
- *Coupon collector.* Seeing all $N$ values takes about $N \ln N$ draws, the reason
  exhaustive coverage tests are slow.

## Check yourself

??? question "1. A 6-digit code is uniform. What is the chance that 5 guesses fail?"

    $1 - 5/10^6 = 0.999995$.

??? question "2. You flip a fair coin until heads. What is the expected number of flips?"

    $1/p = 2$.

??? question "3. Roughly how many random 64-bit identifiers can you issue before the chance of a duplicate reaches 1%?"

    Solve $k^2/2N \approx 0.01$: $k \approx \sqrt{0.02 \cdot 2^{64}} \approx 0.14
    \cdot 2^{32} \approx 6 \times 10^8$.

??? question "4. What is the statistical distance between a fair coin and one with $\Pr[\text{heads}] = 0.6$?"

    $\frac{1}{2}(|0.5 - 0.6| + |0.5 - 0.4|) = 0.1$.

??? question "5. A uniform 16-bit value is reduced mod 3. Which residue is more likely, and by how much?"

    $65536 = 3 \cdot 21845 + 1$, so residue 0 occurs 21,846 times and 1 and 2 occur
    21,845 times each. The distance is $1 \cdot 2/(3 \cdot 65536) \approx 10^{-5}$.

??? question "6. A distinguisher has advantage 0.001 per sample. About how many samples does it need?"

    About $1/\varepsilon^2 = 10^6$.

??? question "7. Why does linearity of expectation not need independence?"

    $\mathbb{E}[X + Y] = \sum_\omega (X(\omega) + Y(\omega))\Pr[\omega]$, which splits
    into the two sums whatever the joint distribution.

??? question "8. An adversary wins an IND-CPA game 51% of the time. What is its advantage?"

    $|2 \cdot 0.51 - 1| = 0.02$.

??? question "9. A scheme has per-message advantage $2^{-100}$. What does the hybrid argument give for $2^{40}$ messages?"

    At most $2^{40} \cdot 2^{-100} = 2^{-60}$.

## What you learned

- Probabilities in cryptography are mostly counts over uniform spaces; conditional
  probability and Bayes turn evidence into belief, and base rates matter.
- Expectation is linear; geometric trials cost $1/p$; exhaustive search costs
  $(N+1)/2$ on average.
- Union bound: $\Pr[\cup A_i] \le \sum \Pr[A_i]$. Birthday: collisions appear after
  about $\sqrt{N}$ draws, between $0.63\,k^2/2N$ and $k^2/2N$ while small.
- Statistical distance is the best one-sample distinguishing advantage; it obeys the
  triangle inequality and cannot grow under processing.
- `x % n` is biased unless $n$ divides $2^b$; rejection sampling (expected under 2
  rounds) or 64 extra bits fixes it.
- A bias $\varepsilon$ takes about $1/\varepsilon^2$ samples to detect; Chernoff-
  Hoeffding makes averages concentrate exponentially.
- Security is a game; advantage is $|2\Pr[\text{win}] - 1|$; hybrids lose a factor of
  the number of steps.

**Next:** [Chapter 17](17-Information-and-Entropy.md), information and entropy:
how much a secret really contains, and why min-entropy is the measure that matters.

## Further reading

- William Feller, *An Introduction to Probability Theory and Its Applications*,
  volume 1, 3rd edition (Wiley, 1968): the classic, with the birthday problem.
- Michael Mitzenmacher and Eli Upfal, *Probability and Computing*, 2nd edition
  (Cambridge, 2017): Chernoff bounds and their uses.
- Mihir Bellare and Phillip Rogaway, *Introduction to Modern Cryptography* (lecture
  notes, UCSD), appendix on the birthday problem; and their "Code-Based
  Game-Playing Proofs" (EUROCRYPT 2006).
- Dan Boneh and Victor Shoup, *A Graduate Course in Applied Cryptography* (free
  online), chapter 2 and appendix B.
- Karthikeyan Bhargavan and Gaëtan Leurent, "On the Practical (In-)Security of 64-bit
  Block Ciphers", ACM CCS 2016.
- NIST SP 800-38D (GCM) section 8.3, and FIPS 186-5 appendix A (generating nonces).
- In *The cryptography book*: [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)
  and [Chapter 17](../../book/17-Defining-Security.md).
