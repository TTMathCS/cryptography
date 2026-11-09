# 16. Probability for Cryptographers

*Every security claim in cryptography is a statement about probability. "AES-128
is secure" means that no affordable attack succeeds with more than a tiny
probability. "Use a fresh nonce" is advice about collisions. "This random number is
uniform" is a claim that can be measured, and is often wrong. This chapter builds
the probability that those claims need, from the beginning: events and conditional
probability, Bayes' rule, expectation, the union bound, the birthday problem done
exactly, statistical distance and why it is the right way to compare
distributions, the modulo bias that makes "random mod n" not random, concentration
bounds and how many samples an attack needs, negligible functions, the hybrid
argument worked with real numbers, the Rényi divergence that lattice proofs use in
place of statistical distance, collisions among many lists, and the advantage of an
adversary in a security game. You will compute the bias of real signature nonces,
including the one that broke PuTTY's P-521 keys in 2024, and run Wagner's
four-list collision search.*

!!! abstract "In this chapter"
    **You will learn:**

    - sample spaces, events, conditional probability, independence and Bayes' rule;
    - random variables, expectation and variance, and the geometric distribution;
    - the union bound, and the birthday problem exactly and approximately, with a
      collision hunt on a truncated hash;
    - statistical distance, its meaning as the best distinguishing advantage, and
      modulo bias with its fix, rejection sampling, computed for real curves;
    - how the advantage of a distinguisher grows with the number of samples, and
      why a small bias adds up like $\sqrt{m}$ while a rare event adds up like $m$;
    - Markov, Chebyshev and Chernoff-Hoeffding bounds, checked against exact tails,
      and how to turn them into a sample count for an attack;
    - negligible functions, security games, advantage and the hybrid argument, with
      every hybrid of a stretched generator computed exactly;
    - the Rényi divergence, its three working properties, and why it lets a
      lattice scheme use a binomial, or 53-bit floating point, where a proof wants an
      exact Gaussian;
    - collisions between two lists, Wagner's generalized birthday algorithm, and the
      coupon collector.

    **You need:** fractions, powers and logarithms. Chapters
    [1](01-Mathematics-for-Secrets.md) and [3](03-Modular-Arithmetic.md) help.

    **Levels:** §16.1 to §16.4 are for beginners, §16.5 to §16.7 and §16.12 are
    intermediate, §16.8 to §16.11 and §16.13 are expert.

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

### By hand: where the approximations part ways

Three numbers are in play for $k$ draws from $N$: the exact probability, the union
bound $k(k-1)/2N$, and the estimate $1 - e^{-k(k-1)/2N}$. Work them for birthdays.

- $k = 23$: there are $\binom{23}{2} = 253$ pairs, so the union bound is
  $253/365 = 0.693$ and the estimate is $1 - e^{-0.693} = 0.500$. The exact value is
  $0.507$. The union bound is off by 37%, the estimate by 1%.
- $k = 40$: $780$ pairs, union bound $2.14$, which is not a probability at all;
  estimate $1 - e^{-2.14} = 0.882$; exact $0.891$.
- $k = 60$: union bound $4.85$; estimate $0.9922$; exact $0.9941$.

Two lessons follow. The union bound is the right tool while the answer is small,
which is the only regime a security proof cares about: nobody needs a sharp
estimate of a 50% chance of failure, only a sure ceiling on a $2^{-40}$ one. And the
exponential estimate is always a little *below* the truth: it is the lower bound
proved above, because $1 - i/N \le e^{-i/N}$ makes every factor of the exact
no-collision product a little smaller than its estimate. As $N$ grows the two agree
to more and more digits, as the $N = 2^{32}$ rows of the last listing show.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="The probability of a collision among k random values from N, plotted against k over the square root of N: it rises from 0, passes one half near 1.18 and reaches nearly 1 by 3" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="70" y1="210" x2="610" y2="210"/><line x1="70" y1="210" x2="70" y2="20"/></g>
<line x1="70" y1="120.0" x2="610" y2="120.0" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".6"/>
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M70.0,210.0L71.5,210.0L73.0,210.0L74.5,209.9L76.0,209.9L77.5,209.8L79.0,209.7L80.5,209.6L82.0,209.4L83.5,209.3L85.0,209.1L86.5,208.9L88.0,208.7L89.5,208.5L91.0,208.2L92.5,208.0L94.0,207.7L95.5,207.4L97.0,207.1L98.5,206.8L100.0,206.4L101.5,206.1L103.0,205.7L104.5,205.3L106.0,204.9L107.5,204.5L109.0,204.0L110.5,203.6L112.0,203.1L113.5,202.6L115.0,202.1L116.5,201.6L118.0,201.0L119.5,200.5L121.0,199.9L122.5,199.3L124.0,198.7L125.5,198.1L127.0,197.5L128.5,196.8L130.0,196.2L131.5,195.5L133.0,194.8L134.5,194.1L136.0,193.4L137.5,192.7L139.0,191.9L140.5,191.2L142.0,190.4L143.5,189.6L145.0,188.8L146.5,188.0L148.0,187.2L149.5,186.4L151.0,185.6L152.5,184.7L154.0,183.9L155.5,183.0L157.0,182.1L158.5,181.2L160.0,180.3L161.5,179.4L163.0,178.5L164.5,177.6L166.0,176.7L167.5,175.7L169.0,174.8L170.5,173.8L172.0,172.8L173.5,171.9L175.0,170.9L176.5,169.9L178.0,168.9L179.5,167.9L181.0,166.9L182.5,165.9L184.0,164.8L185.5,163.8L187.0,162.8L188.5,161.8L190.0,160.7L191.5,159.7L193.0,158.6L194.5,157.5L196.0,156.5L197.5,155.4L199.0,154.4L200.5,153.3L202.0,152.2L203.5,151.1L205.0,150.1L206.5,149.0L208.0,147.9L209.5,146.8L211.0,145.7L212.5,144.6L214.0,143.5L215.5,142.4L217.0,141.4L218.5,140.3L220.0,139.2L221.5,138.1L223.0,137.0L224.5,135.9L226.0,134.8L227.5,133.7L229.0,132.6L230.5,131.5L232.0,130.5L233.5,129.4L235.0,128.3L236.5,127.2L238.0,126.1L239.5,125.1L241.0,124.0L242.5,122.9L244.0,121.9L245.5,120.8L247.0,119.7L248.5,118.7L250.0,117.6L251.5,116.6L253.0,115.5L254.5,114.5L256.0,113.4L257.5,112.4L259.0,111.4L260.5,110.4L262.0,109.3L263.5,108.3L265.0,107.3L266.5,106.3L268.0,105.3L269.5,104.3L271.0,103.3L272.5,102.4L274.0,101.4L275.5,100.4L277.0,99.5L278.5,98.5L280.0,97.6L281.5,96.6L283.0,95.7L284.5,94.7L286.0,93.8L287.5,92.9L289.0,92.0L290.5,91.1L292.0,90.2L293.5,89.3L295.0,88.4L296.5,87.6L298.0,86.7L299.5,85.8L301.0,85.0L302.5,84.1L304.0,83.3L305.5,82.5L307.0,81.7L308.5,80.9L310.0,80.0L311.5,79.2L313.0,78.5L314.5,77.7L316.0,76.9L317.5,76.1L319.0,75.4L320.5,74.6L322.0,73.9L323.5,73.2L325.0,72.4L326.5,71.7L328.0,71.0L329.5,70.3L331.0,69.6L332.5,68.9L334.0,68.3L335.5,67.6L337.0,66.9L338.5,66.3L340.0,65.6L341.5,65.0L343.0,64.4L344.5,63.7L346.0,63.1L347.5,62.5L349.0,61.9L350.5,61.3L352.0,60.7L353.5,60.2L355.0,59.6L356.5,59.0L358.0,58.5L359.5,58.0L361.0,57.4L362.5,56.9L364.0,56.4L365.5,55.9L367.0,55.3L368.5,54.9L370.0,54.4L371.5,53.9L373.0,53.4L374.5,52.9L376.0,52.5L377.5,52.0L379.0,51.6L380.5,51.1L382.0,50.7L383.5,50.3L385.0,49.8L386.5,49.4L388.0,49.0L389.5,48.6L391.0,48.2L392.5,47.8L394.0,47.5L395.5,47.1L397.0,46.7L398.5,46.4L400.0,46.0L401.5,45.7L403.0,45.3L404.5,45.0L406.0,44.6L407.5,44.3L409.0,44.0L410.5,43.7L412.0,43.4L413.5,43.1L415.0,42.8L416.5,42.5L418.0,42.2L419.5,41.9L421.0,41.6L422.5,41.4L424.0,41.1L425.5,40.9L427.0,40.6L428.5,40.3L430.0,40.1L431.5,39.9L433.0,39.6L434.5,39.4L436.0,39.2L437.5,39.0L439.0,38.7L440.5,38.5L442.0,38.3L443.5,38.1L445.0,37.9L446.5,37.7L448.0,37.5L449.5,37.3L451.0,37.2L452.5,37.0L454.0,36.8L455.5,36.6L457.0,36.5L458.5,36.3L460.0,36.1L461.5,36.0L463.0,35.8L464.5,35.7L466.0,35.5L467.5,35.4L469.0,35.2L470.5,35.1L472.0,35.0L473.5,34.8L475.0,34.7L476.5,34.6L478.0,34.5L479.5,34.3L481.0,34.2L482.5,34.1L484.0,34.0L485.5,33.9L487.0,33.8L488.5,33.7L490.0,33.6L491.5,33.5L493.0,33.4L494.5,33.3L496.0,33.2L497.5,33.1L499.0,33.0L500.5,32.9L502.0,32.8L503.5,32.8L505.0,32.7L506.5,32.6L508.0,32.5L509.5,32.5L511.0,32.4L512.5,32.3L514.0,32.3L515.5,32.2L517.0,32.1L518.5,32.1L520.0,32.0L521.5,31.9L523.0,31.9L524.5,31.8L526.0,31.8L527.5,31.7L529.0,31.7L530.5,31.6L532.0,31.6L533.5,31.5L535.0,31.5L536.5,31.4L538.0,31.4L539.5,31.3L541.0,31.3L542.5,31.3L544.0,31.2L545.5,31.2L547.0,31.1L548.5,31.1L550.0,31.1L551.5,31.0L553.0,31.0L554.5,31.0L556.0,30.9L557.5,30.9L559.0,30.9L560.5,30.9L562.0,30.8L563.5,30.8L565.0,30.8L566.5,30.8L568.0,30.7L569.5,30.7L571.0,30.7L572.5,30.7L574.0,30.6L575.5,30.6L577.0,30.6L578.5,30.6L580.0,30.6L581.5,30.5L583.0,30.5L584.5,30.5L586.0,30.5L587.5,30.5L589.0,30.5L590.5,30.4L592.0,30.4L593.5,30.4L595.0,30.4L596.5,30.4L598.0,30.4L599.5,30.4L601.0,30.3L602.5,30.3L604.0,30.3L605.5,30.3L607.0,30.3L608.5,30.3L610.0,30.3"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" d="M70.0,210.0L71.5,210.0L73.0,210.0L74.5,209.9L76.0,209.9L77.5,209.8L79.0,209.7L80.5,209.6L82.0,209.4L83.5,209.3L85.0,209.1L86.5,208.9L88.0,208.7L89.5,208.5L91.0,208.2L92.5,208.0L94.0,207.7L95.5,207.4L97.0,207.1L98.5,206.8L100.0,206.4L101.5,206.0L103.0,205.6L104.5,205.2L106.0,204.8L107.5,204.4L109.0,203.9L110.5,203.4L112.0,202.9L113.5,202.4L115.0,201.9L116.5,201.4L118.0,200.8L119.5,200.2L121.0,199.6L122.5,199.0L124.0,198.3L125.5,197.7L127.0,197.0L128.5,196.3L130.0,195.6L131.5,194.9L133.0,194.1L134.5,193.4L136.0,192.6L137.5,191.8L139.0,191.0L140.5,190.1L142.0,189.3L143.5,188.4L145.0,187.5L146.5,186.6L148.0,185.7L149.5,184.7L151.0,183.8L152.5,182.8L154.0,181.8L155.5,180.8L157.0,179.7L158.5,178.7L160.0,177.6L161.5,176.5L163.0,175.4L164.5,174.3L166.0,173.1L167.5,172.0L169.0,170.8L170.5,169.6L172.0,168.4L173.5,167.2L175.0,165.9L176.5,164.6L178.0,163.3L179.5,162.0L181.0,160.7L182.5,159.4L184.0,158.0L185.5,156.6L187.0,155.2L188.5,153.8L190.0,152.4L191.5,151.0L193.0,149.5L194.5,148.0L196.0,146.5L197.5,145.0L199.0,143.4L200.5,141.9L202.0,140.3L203.5,138.7L205.0,137.1L206.5,135.5L208.0,133.8L209.5,132.2L211.0,130.5L212.5,128.8L214.0,127.1L215.5,125.3L217.0,123.6L218.5,121.8L220.0,120.0L221.5,118.2L223.0,116.4L224.5,114.5L226.0,112.7L227.5,110.8L229.0,108.9L230.5,107.0L232.0,105.0L233.5,103.1L235.0,101.1L236.5,99.1L238.0,97.1L239.5,95.1L241.0,93.0L242.5,91.0L244.0,88.9L245.5,86.8L247.0,84.7L248.5,82.6L250.0,80.4L251.5,78.2L253.0,76.0L254.5,73.8L256.0,71.6L257.5,69.4L259.0,67.1L260.5,64.8L262.0,62.5L263.5,60.2L265.0,57.9L266.5,55.6L268.0,53.2L269.5,50.8L271.0,48.4L272.5,46.0L274.0,43.5L275.5,41.1L277.0,38.6L278.5,36.1L280.0,33.6L281.5,31.1"/>
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

### By hand: a distance between two small distributions

Take $P = (\tfrac12, \tfrac14, \tfrac14)$ and $Q$ uniform, $(\tfrac13, \tfrac13,
\tfrac13)$, on three outcomes. The differences are $\tfrac16, -\tfrac1{12},
-\tfrac1{12}$, so $\Delta(P, Q) = \tfrac12(\tfrac16 + \tfrac1{12} + \tfrac1{12}) =
\tfrac16$. The best single-sample test says "P" exactly on the first outcome: it is
right with probability $\tfrac12$ under $P$ and wrong with probability $\tfrac13$
under $Q$, an advantage of $\tfrac12 - \tfrac13 = \tfrac16$, the distance. Another
useful way to read the same number: $1 - \Delta$ is the **overlap**
$\sum_x \min(P(x), Q(x))$, here $\tfrac13 + \tfrac14 + \tfrac14 = \tfrac56$. A coupling
can make samples from $P$ and from $Q$ agree with probability exactly the overlap and
no more, which is why statistical distance is the probability that "something
visibly different happened".

Figure 16.2 draws the picture for two binomials. The shared part is the overlap; the
two kinds of excess have equal area, and each is the distance.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two distributions on 0 to 9 drawn on top of each other: the shared mass is lightly shaded, the places where P is above Q are solid and the places where Q is above P are dashed outlines; each of the two excess parts adds up to the statistical distance, about 0.355" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="60" y1="200" x2="520" y2="200"/></g>
<path d="M74,199.6h36v0.4h-36zM118,195.7h36v4.3h-36zM162,178.8h36v21.2h-36zM206,139.7h36v60.3h-36zM250,89.4h36v110.6h-36zM294,113.0h36v87.0h-36zM338,161.4h36v38.6h-36zM382,189.0h36v11.0h-36zM426,198.2h36v1.8h-36zM470,199.9h36v0.1h-36z" fill-opacity=".22"/>
<path d="M74,194.8h36v4.8h-36zM118,168.6h36v27.1h-36zM162,116.2h36v62.7h-36zM206,69.6h36v70.1h-36zM250,69.6h36v19.8h-36z" fill-opacity=".85"/>
<path d="M295,64.8h34v48.3h-34zM339,89.8h34v71.5h-34zM383,142.3h34v46.7h-34zM427,182.4h34v15.8h-34zM471,197.6h34v2.3h-34z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/>
<text x="92.0" y="218" text-anchor="middle" font-size="12">0</text>
<text x="136.0" y="218" text-anchor="middle" font-size="12">1</text>
<text x="180.0" y="218" text-anchor="middle" font-size="12">2</text>
<text x="224.0" y="218" text-anchor="middle" font-size="12">3</text>
<text x="268.0" y="218" text-anchor="middle" font-size="12">4</text>
<text x="312.0" y="218" text-anchor="middle" font-size="12">5</text>
<text x="356.0" y="218" text-anchor="middle" font-size="12">6</text>
<text x="400.0" y="218" text-anchor="middle" font-size="12">7</text>
<text x="444.0" y="218" text-anchor="middle" font-size="12">8</text>
<text x="488.0" y="218" text-anchor="middle" font-size="12">9</text>
<text x="290" y="238" text-anchor="middle" font-size="12">outcome x</text>
<rect x="420" y="22" width="16" height="12" fill-opacity=".22"/><text x="442" y="33" font-size="12">shared: min(P, Q)</text>
<rect x="420" y="42" width="16" height="12" fill-opacity=".85"/><text x="442" y="53" font-size="12">P above Q: adds to Δ</text>
<rect x="421" y="62" width="14" height="12" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><text x="442" y="73" font-size="12">Q above P: adds to Δ</text>
<text x="70" y="30" font-size="12">P = Binomial(9, 0.40)</text><text x="70" y="48" font-size="12">Q = Binomial(9, 0.55)</text>
<text x="70" y="66" font-size="12">Δ(P, Q) = 0.355</text>
</svg>
<figcaption>Figure 16.2. Statistical distance as area. Two distributions on 0 to 9, drawn on top of each other. The light part is the overlap, the mass they share (0.645 here). Where P is higher, the excess is solid; where Q is higher, it is dashed. The two excesses have the same total, Δ = 0.355, and the best one-sample test says "P" exactly on the solid outcomes.</figcaption>
</figure>

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
<path d="M60.0,55h4v135h-4zM65.4,55h4v135h-4zM70.8,55h4v135h-4zM76.2,55h4v135h-4zM81.6,55h4v135h-4zM87.0,55h4v135h-4zM92.4,55h4v135h-4zM97.8,55h4v135h-4zM103.2,55h4v135h-4zM108.6,55h4v135h-4zM114.0,55h4v135h-4zM119.4,55h4v135h-4zM124.8,55h4v135h-4zM130.2,55h4v135h-4zM135.6,55h4v135h-4zM141.0,55h4v135h-4zM146.4,55h4v135h-4zM151.8,55h4v135h-4zM157.2,55h4v135h-4zM162.6,55h4v135h-4zM168.0,55h4v135h-4zM173.4,55h4v135h-4zM178.8,55h4v135h-4zM184.2,55h4v135h-4zM189.6,55h4v135h-4zM195.0,55h4v135h-4zM200.4,55h4v135h-4zM205.8,55h4v135h-4zM211.2,55h4v135h-4zM216.6,55h4v135h-4zM222.0,55h4v135h-4zM227.4,55h4v135h-4zM232.8,55h4v135h-4zM238.2,55h4v135h-4zM243.6,55h4v135h-4zM249.0,55h4v135h-4zM254.4,55h4v135h-4zM259.8,55h4v135h-4zM265.2,55h4v135h-4zM270.6,55h4v135h-4zM276.0,55h4v135h-4zM281.4,55h4v135h-4zM286.8,55h4v135h-4zM292.2,55h4v135h-4zM297.6,55h4v135h-4zM303.0,55h4v135h-4zM308.4,55h4v135h-4zM313.8,55h4v135h-4zM319.2,55h4v135h-4zM324.6,55h4v135h-4zM330.0,55h4v135h-4zM335.4,55h4v135h-4zM340.8,55h4v135h-4zM346.2,55h4v135h-4zM351.6,55h4v135h-4zM357.0,55h4v135h-4z" class="acc-fill"/>
<path d="M362.4,100h4v90h-4zM367.8,100h4v90h-4zM373.2,100h4v90h-4zM378.6,100h4v90h-4zM384.0,100h4v90h-4zM389.4,100h4v90h-4zM394.8,100h4v90h-4zM400.2,100h4v90h-4zM405.6,100h4v90h-4zM411.0,100h4v90h-4zM416.4,100h4v90h-4zM421.8,100h4v90h-4zM427.2,100h4v90h-4zM432.6,100h4v90h-4zM438.0,100h4v90h-4zM443.4,100h4v90h-4zM448.8,100h4v90h-4zM454.2,100h4v90h-4zM459.6,100h4v90h-4zM465.0,100h4v90h-4zM470.4,100h4v90h-4zM475.8,100h4v90h-4zM481.2,100h4v90h-4zM486.6,100h4v90h-4zM492.0,100h4v90h-4zM497.4,100h4v90h-4zM502.8,100h4v90h-4zM508.2,100h4v90h-4zM513.6,100h4v90h-4zM519.0,100h4v90h-4zM524.4,100h4v90h-4zM529.8,100h4v90h-4zM535.2,100h4v90h-4zM540.6,100h4v90h-4zM546.0,100h4v90h-4zM551.4,100h4v90h-4zM556.8,100h4v90h-4zM562.2,100h4v90h-4zM567.6,100h4v90h-4zM573.0,100h4v90h-4zM578.4,100h4v90h-4zM583.8,100h4v90h-4zM589.2,100h4v90h-4zM594.6,100h4v90h-4z" class="plain" fill-opacity=".45"/>
<text x="62.0" y="208" text-anchor="middle" font-size="12">0</text>
<text x="364.4" y="208" text-anchor="middle" font-size="12">56</text>
<text x="596.6" y="208" text-anchor="middle" font-size="12">99</text>
<text x="60" y="30" font-size="12">3/256</text><text x="430" y="85" font-size="12">2/256</text>
<text x="330" y="226" text-anchor="middle" font-size="12">value of (random byte) mod 100</text>
</svg>
<figcaption>Figure 16.3. Modulo bias. A uniform byte (0 to 255) reduced mod 100: since 256 = 2 · 100 + 56, the values 0 to 55 come up 3 times in 256 and the values 56 to 99 only twice. The statistical distance from uniform is 56 · 44 / (100 · 256) ≈ 0.096.</figcaption>
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

### Real cases: signature nonces on real curves

Modulo bias matters most for signature nonces, because DSA, ECDSA and Schnorr leak
the private key when their nonces are even slightly predictable (§16.13). The
*Cryptanalysis* book works the original DSA case and P-256 in
[chapter 14](../cryptanalysis/14-Attacks-on-Signatures-and-Nonces.md#a-biased-standard).
The listing below does three more curves, and one mistake of a different kind.

```python
# Nonces on real curves: how far "random bits mod n" is from uniform, and the PuTTY mistake.
# Uses Fraction from the listings above.
from math import log2

def reduce_dist(bits, n):
    """Statistical distance from uniform of (a uniform `bits`-bit integer) mod n."""
    if 2**bits < n:                      # no reduction happens: values from 2^bits up never occur
        return 1 - Fraction(2**bits, n)
    r = 2**bits % n
    return Fraction(r * (n - r), n * 2**bits)

P384 = int("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC7634D81F4372DDF"
           "581A0DB248B0A77AECEC196ACCC52973", 16)
P521 = int("01FF" + "FFFFFFFF" * 7 + "FFFFFFFA51868783BF2F966B7FCC0148F709A5D0"
           "3BB5C9B8899C47AEBB6FB71E91386409", 16)
L25519 = 2**252 + 27742317777372353535851937790883648493
for name, bits, n in (("P-384, 384 bits", 384, P384), ("P-521, 521 bits", 521, P521),
                      ("Ed25519, 512 bits", 512, L25519), ("P-521, 512 bits", 512, P521)):
    d = reduce_dist(bits, n)
    print(name.ljust(18), n.bit_length(), "2^%.1f" % log2(d) if d < 0.5 else round(float(d), 4))

known = P521.bit_length() - 512          # top bits of every PuTTY nonce that are always zero
print(known, -(-P521.bit_length() // known))

q = 3329                                 # ML-KEM: 12-bit candidates, keep those below q
accept = Fraction(q, 2**12)
print(round(float(accept), 4), round(256 / accept), round(256 / accept * 1.5))
```

It prints:

```text
P-384, 384 bits    384 2^-194.2
P-521, 521 bits    521 2^-262.5
Ed25519, 512 bits  253 2^-262.5
P-521, 512 bits    521 0.998
9 58
0.8127 315 472
```

The first three lines are the safe cases. A uniform 384-bit number reduced mod the
P-384 group order is within $2^{-194}$ of uniform, because that order is within
about $2^{190}$ of $2^{384}$; P-521's order is within about $2^{259}$ of $2^{521}$. Ed25519
reduces a 512-bit hash modulo $\ell \approx 2^{252}$, so it carries 260 spare bits
and lands, by coincidence, at the same $2^{-262}$. In each case the distance is far
below anything an attacker could ever measure, even with every signature ever made.

The fourth line is PuTTY. From version 0.68 (2017) to 0.80, the PuTTY SSH client
made its ECDSA nonces deterministically: it hashed the private key and the message
with SHA-512 and reduced the 512-bit result modulo the group order. For P-256 and
P-384 that is generous. For P-521 the order has 521 bits, so the "reduction" does
nothing at all, and every nonce lies below $2^{512}$: the top 9 bits are always zero.
The distance from uniform is $1 - 2^{512}/n \approx 0.998$: only one value in 512
of the range can ever occur, though each nonce still looks random on its own. Fabian Bäumer and Marcus Brinkmann of Ruhr University Bochum reported it in April
2024 (CVE-2024-31497). Each signature then gives a hidden-number equation with 9
known bits, and $521/9 \approx 58$ such equations pin down the key, which matches
their report that about 60 signatures suffice with lattice reduction. PuTTY 0.81
switched to RFC 6979 nonces, and every P-521 key used with the affected versions had
to be treated as compromised.

The last line is rejection sampling at work in ML-KEM. FIPS 203 builds its public
matrix from 12-bit candidates and keeps only those below $q = 3329$. The acceptance
rate is $3329/4096 \approx 0.81$, so a polynomial of 256 coefficients needs about
315 candidates, or 472 bytes of SHAKE128 output, on average. The output is exactly
uniform mod $q$, and the price is a variable running time that depends only on public
data (*Post-quantum* [chapter 8](../post-quantum/08-ML-KEM.md)).

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
<path class="acc" fill="none" stroke="currentColor" stroke-width="2.5" d="M70.0,210.0L71.0,195.7L72.1,189.8L73.2,185.2L74.2,181.5L75.2,178.2L76.3,175.2L77.3,172.4L78.4,169.9L79.5,167.6L80.5,165.3L81.5,163.2L82.6,161.2L83.7,159.3L84.7,157.5L85.8,155.7L86.8,154.0L87.8,152.4L88.9,150.8L90.0,149.3L91.0,147.8L92.0,146.4L93.1,145.0L94.2,143.7L95.2,142.4L96.2,141.1L97.3,139.8L98.3,138.6L99.4,137.4L100.5,136.2L101.5,135.1L102.5,134.0L103.6,132.9L104.7,131.8L105.7,130.8L106.8,129.7L107.8,128.7L108.8,127.7L109.9,126.8L111.0,125.8L112.0,124.9L113.0,124.0L114.1,123.0L115.2,122.2L116.2,121.3L117.2,120.4L118.3,119.6L119.3,118.7L120.4,117.9L121.4,117.1L122.5,116.3L123.6,115.5L124.6,114.8L125.7,114.0L126.7,113.2L127.8,112.5L128.8,111.8L129.8,111.0L130.9,110.3L131.9,109.6L133.0,108.9L134.1,108.3L135.1,107.6L136.2,106.9L137.2,106.3L138.2,105.6L139.3,105.0L140.4,104.3L141.4,103.7L142.4,103.1L143.5,102.5L144.6,101.9L145.6,101.3L146.6,100.7L147.7,100.1L148.8,99.6L149.8,99.0L150.9,98.4L151.9,97.9L152.9,97.3L154.0,96.8L155.1,96.3L156.1,95.7L157.1,95.2L158.2,94.7L159.2,94.2L160.3,93.7L161.3,93.2L162.4,92.7L163.4,92.2L164.5,91.7L165.6,91.2L166.6,90.7L167.7,90.3L168.7,89.8L169.8,89.3L170.8,88.9L171.8,88.4L172.9,88.0L173.9,87.6L175.0,87.1L176.1,86.7L177.1,86.3L178.2,85.8L179.2,85.4L180.2,85.0L181.3,84.6L182.4,84.2L183.4,83.8L184.4,83.4L185.5,83.0L186.6,82.6L187.6,82.2L188.6,81.8L189.7,81.4L190.8,81.0L191.8,80.7L192.8,80.3L193.9,79.9L194.9,79.6L196.0,79.2L197.1,78.8L198.1,78.5L199.2,78.1L200.2,77.8L201.2,77.4L202.3,77.1L203.3,76.8L204.4,76.4L205.5,76.1L206.5,75.8L207.6,75.4L208.6,75.1L209.7,74.8L210.7,74.5L211.8,74.2L212.8,73.8L213.9,73.5L214.9,73.2L215.9,72.9L217.0,72.6L218.0,72.3L219.1,72.0L220.2,71.7L221.2,71.4L222.2,71.1L223.3,70.8L224.3,70.6L225.4,70.3L226.4,70.0L227.5,69.7L228.6,69.4L229.6,69.2L230.7,68.9L231.7,68.6L232.8,68.4L233.8,68.1L234.8,67.8L235.9,67.6L237.0,67.3L238.0,67.1L239.1,66.8L240.1,66.6L241.1,66.3L242.2,66.1L243.2,65.8L244.3,65.6L245.3,65.3L246.4,65.1L247.4,64.8L248.5,64.6L249.5,64.4L250.6,64.1L251.7,63.9L252.7,63.7L253.8,63.5L254.8,63.2L255.8,63.0L256.9,62.8L258.0,62.6L259.0,62.3L260.1,62.1L261.1,61.9L262.1,61.7L263.2,61.5L264.2,61.3L265.3,61.1L266.4,60.9L267.4,60.7L268.4,60.5L269.5,60.3L270.5,60.1L271.6,59.9L272.6,59.7L273.7,59.5L274.8,59.3L275.8,59.1L276.9,58.9L277.9,58.7L278.9,58.5L280.0,58.3L281.0,58.1L282.1,57.9L283.1,57.8L284.2,57.6L285.2,57.4L286.3,57.2L287.4,57.0L288.4,56.9L289.4,56.7L290.5,56.5L291.5,56.3L292.6,56.2L293.6,56.0L294.7,55.8L295.8,55.7L296.8,55.5L297.9,55.3L298.9,55.2L299.9,55.0L301.0,54.8L302.0,54.7L303.1,54.5L304.1,54.4L305.2,54.2L306.2,54.1L307.3,53.9L308.4,53.7L309.4,53.6L310.5,53.4L311.5,53.3L312.6,53.1L313.6,53.0L314.6,52.8L315.7,52.7L316.8,52.6L317.8,52.4L318.9,52.3L319.9,52.1L321.0,52.0L322.0,51.8L323.1,51.7L324.1,51.6L325.1,51.4L326.2,51.3L327.2,51.2L328.3,51.0L329.4,50.9L330.4,50.8L331.5,50.6L332.5,50.5L333.5,50.4L334.6,50.2L335.6,50.1L336.7,50.0L337.8,49.9L338.8,49.7L339.8,49.6L340.9,49.5L341.9,49.4L343.0,49.2L344.1,49.1L345.1,49.0L346.1,48.9L347.2,48.8L348.2,48.6L349.3,48.5L350.3,48.4L351.4,48.3L352.4,48.2L353.5,48.1L354.6,47.9L355.6,47.8L356.6,47.7L357.7,47.6L358.8,47.5L359.8,47.4L360.9,47.3L361.9,47.2L362.9,47.1L364.0,47.0L365.1,46.9L366.1,46.8L367.2,46.7L368.2,46.5L369.2,46.4L370.3,46.3L371.4,46.2L372.4,46.1L373.4,46.0L374.5,45.9L375.6,45.8L376.6,45.7L377.7,45.7L378.7,45.6L379.8,45.5L380.8,45.4L381.9,45.3L382.9,45.2L384.0,45.1L385.0,45.0L386.0,44.9L387.1,44.8L388.1,44.7L389.2,44.6L390.2,44.5L391.3,44.4L392.3,44.4L393.4,44.3L394.4,44.2L395.5,44.1L396.6,44.0L397.6,43.9L398.6,43.8L399.7,43.8L400.8,43.7L401.8,43.6L402.8,43.5L403.9,43.4L404.9,43.3L406.0,43.3L407.1,43.2L408.1,43.1L409.1,43.0L410.2,42.9L411.2,42.9L412.3,42.8L413.4,42.7L414.4,42.6L415.4,42.5L416.5,42.5L417.6,42.4L418.6,42.3L419.7,42.2L420.7,42.2L421.8,42.1L422.8,42.0L423.9,42.0L424.9,41.9L425.9,41.8L427.0,41.7L428.1,41.7L429.1,41.6L430.2,41.5L431.2,41.5L432.2,41.4L433.3,41.3L434.4,41.2L435.4,41.2L436.5,41.1L437.5,41.0L438.5,41.0L439.6,40.9L440.6,40.8L441.7,40.8L442.8,40.7L443.8,40.7L444.8,40.6L445.9,40.5L446.9,40.5L448.0,40.4L449.1,40.3L450.1,40.3L451.1,40.2L452.2,40.2L453.2,40.1L454.3,40.0L455.3,40.0L456.4,39.9L457.4,39.9L458.5,39.8L459.6,39.7L460.6,39.7L461.6,39.6L462.7,39.6L463.8,39.5L464.8,39.4L465.9,39.4L466.9,39.3L467.9,39.3L469.0,39.2L470.1,39.2L471.1,39.1L472.2,39.1L473.2,39.0L474.2,39.0L475.3,38.9L476.4,38.8L477.4,38.8L478.4,38.7L479.5,38.7L480.6,38.6L481.6,38.6L482.7,38.5L483.7,38.5L484.8,38.4L485.8,38.4L486.9,38.3L487.9,38.3L489.0,38.2L490.0,38.2L491.0,38.1L492.1,38.1L493.2,38.0L494.2,38.0L495.2,38.0L496.3,37.9L497.4,37.9L498.4,37.8L499.4,37.8L500.5,37.7L501.6,37.7L502.6,37.6L503.6,37.6L504.7,37.5L505.8,37.5L506.8,37.5L507.8,37.4L508.9,37.4L510.0,37.3L511.0,37.3L512.0,37.2L513.1,37.2L514.2,37.1L515.2,37.1L516.2,37.1L517.3,37.0L518.3,37.0L519.4,36.9L520.5,36.9L521.5,36.9L522.5,36.8L523.6,36.8L524.7,36.7L525.7,36.7L526.8,36.7L527.8,36.6L528.9,36.6L529.9,36.5L531.0,36.5L532.0,36.5L533.0,36.4L534.1,36.4L535.1,36.4L536.2,36.3L537.2,36.3L538.3,36.2L539.3,36.2L540.4,36.2L541.5,36.1L542.5,36.1L543.5,36.1L544.6,36.0L545.7,36.0L546.7,36.0L547.8,35.9L548.8,35.9L549.9,35.9L550.9,35.8L552.0,35.8L553.0,35.8L554.0,35.7L555.1,35.7L556.1,35.7L557.2,35.6L558.2,35.6L559.3,35.6L560.3,35.5L561.4,35.5L562.5,35.5L563.5,35.4L564.5,35.4L565.6,35.4L566.7,35.3L567.7,35.3L568.8,35.3L569.8,35.2L570.8,35.2L571.9,35.2L573.0,35.2L574.0,35.1L575.0,35.1L576.1,35.1L577.2,35.0L578.2,35.0L579.2,35.0L580.3,34.9L581.4,34.9L582.4,34.9L583.4,34.9L584.5,34.8L585.6,34.8L586.6,34.8L587.6,34.8L588.7,34.7L589.8,34.7L590.8,34.7L591.9,34.6L592.9,34.6L594.0,34.6L595.0,34.6"/>
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
<figcaption>Figure 16.4. How evidence accumulates. The best advantage for telling a coin with bias ε from a fair one, as the number of samples grows (normal approximation; the dots are the values printed by the code above, for ε = 0.01). Measured in units of 1/ε², the curve is the same for every small ε.</figcaption>
</figure>

### Many samples of a biased residue

The same question for modulo bias: an attacker sees $m$ values, each a random byte
reduced mod 100. How far are $m$ such values from $m$ truly uniform ones? A
shortcut makes this exact. Only one thing about each sample matters to the best
test, namely whether it landed on a "heavy" residue (0 to 55, weight $3/256$ each)
or a light one, because the likelihood ratio depends on nothing else. So the count
of heavy samples is all the evidence, and it is binomial: with success probability
$168/256 = 0.65625$ under the biased source and $56/100 = 0.56$ under the uniform
one. The distance between the two $m$-sample distributions is the distance between
two binomials.

```python
# m samples of a biased distribution: the exact distance from m uniform samples, against the hybrid bound m * delta.
# Uses Fraction, comb and sqrt from the listings above.

def binom_dist(m, p0, p1):
    """Statistical distance between Binomial(m, p0) and Binomial(m, p1)."""
    return sum(abs(comb(m, j) * (p0**j * (1 - p0)**(m - j) - p1**j * (1 - p1)**(m - j)))
               for j in range(m + 1)) / 2

# A random byte mod 100: the 56 "heavy" residues 0..55 have weight 3/256 each, the rest 2/256.
# The number of samples that land on a heavy residue carries all the information, so
# the distance between m biased samples and m uniform samples is a distance between binomials.
p_biased, p_uniform = Fraction(56 * 3, 256), Fraction(56, 100)
delta = float(p_biased - p_uniform)
for m in (1, 2, 5, 10, 20, 50, 100):
    d = binom_dist(m, p_uniform, p_biased)
    print(m, round(float(d), 4), round(min(1, m * delta), 4), round(float(d) / sqrt(m), 4))
```

It prints:

```text
1 0.0963 0.0963 0.0963
2 0.1171 0.1925 0.0828
5 0.1691 0.4813 0.0756
10 0.2432 0.9625 0.0769
20 0.3422 1 0.0765
50 0.5176 1 0.0732
100 0.6768 1 0.0677
```

The columns are $m$, the exact distance, the bound $m\Delta$ that the hybrid argument
of §16.10 would give, and the distance divided by $\sqrt{m}$. The last column is
nearly constant, about 0.07 to 0.08: the evidence grows like $\sqrt{m}$, exactly as
for the biased coin, and the linear bound $m\Delta$ is pessimistic by a factor that
grows like $\sqrt{m}$. That gap between $\sqrt{m}$ and $m$ is worth remembering. When
two distributions differ by many small two-sided wobbles, independent samples add up
like a random walk. When they differ by a rare event that is plainly visible when it
happens, they add up linearly: if $P$ is $Q$ except that with probability $\epsilon$
a sample shows a value $Q$ never produces, then $m$ samples are at distance
$1 - (1 - \epsilon)^m \approx m\epsilon$, and the hybrid bound is tight. §16.11 builds
a tool that captures the first behavior inside a proof.

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
the right exponential shape, as Figure 16.5 shows for $\delta = 0.05$.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="On a logarithmic scale from 1 down to one in a million, the exact chance that a fair coin shows at least 55 percent heads in t flips, and the Hoeffding bound exp(-2 times 0.05 squared times t), for t up to 2000: both fall in straight lines, the bound a constant factor above the truth" fill="currentColor" font-size="13">
<g stroke="currentColor" stroke-width="1" opacity=".5"><line x1="70" y1="210" x2="610" y2="210"/><line x1="70" y1="210" x2="70" y2="30"/></g>
<line x1="70" y1="30" x2="610" y2="30" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".3"/>
<text x="62" y="34" text-anchor="end" font-size="12">1</text>
<line x1="70" y1="60" x2="610" y2="60" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".3"/>
<text x="62" y="64" text-anchor="end" font-size="12">10⁻¹</text>
<line x1="70" y1="90" x2="610" y2="90" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".3"/>
<text x="62" y="94" text-anchor="end" font-size="12">10⁻²</text>
<line x1="70" y1="120" x2="610" y2="120" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".3"/>
<text x="62" y="124" text-anchor="end" font-size="12">10⁻³</text>
<line x1="70" y1="150" x2="610" y2="150" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".3"/>
<text x="62" y="154" text-anchor="end" font-size="12">10⁻⁴</text>
<line x1="70" y1="180" x2="610" y2="180" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".3"/>
<text x="62" y="184" text-anchor="end" font-size="12">10⁻⁵</text>
<line x1="70" y1="210" x2="610" y2="210" stroke="currentColor" stroke-width="1" stroke-dasharray="2 4" opacity=".3"/>
<text x="62" y="214" text-anchor="end" font-size="12">10⁻⁶</text>
<text x="70" y="230" text-anchor="middle" font-size="12">0</text>
<text x="205" y="230" text-anchor="middle" font-size="12">500</text>
<text x="340" y="230" text-anchor="middle" font-size="12">1000</text>
<text x="475" y="230" text-anchor="middle" font-size="12">1500</text>
<text x="610" y="230" text-anchor="middle" font-size="12">2000</text>
<text x="340" y="254" text-anchor="middle" font-size="12">number of fair coin flips t</text>
<path fill="none" stroke="currentColor" stroke-width="2.5" d="M75.4,41.6L80.8,44.9L86.2,47.6L91.6,49.9L97.0,52.0L102.4,54.1L107.8,56.0L113.2,57.9L118.6,59.7L124.0,61.4L129.4,63.2L134.8,64.9L140.2,66.6L145.6,68.2L151.0,69.9L156.4,71.5L161.8,73.1L167.2,74.7L172.6,76.2L178.0,77.8L183.4,79.3L188.8,80.9L194.2,82.4L199.6,83.9L205.0,85.5L210.4,87.0L215.8,88.5L221.2,90.0L226.6,91.5L232.0,93.0L237.4,94.4L242.8,95.9L248.2,97.4L253.6,98.9L259.0,100.3L264.4,101.8L269.8,103.2L275.2,104.7L280.6,106.1L286.0,107.6L291.4,109.0L296.8,110.5L302.2,111.9L307.6,113.3L313.0,114.8L318.4,116.2L323.8,117.6L329.2,119.0L334.6,120.5L340.0,121.9L345.4,123.3L350.8,124.7L356.2,126.1L361.6,127.5L367.0,129.0L372.4,130.4L377.8,131.8L383.2,133.2L388.6,134.6L394.0,136.0L399.4,137.4L404.8,138.8L410.2,140.2L415.6,141.6L421.0,143.0L426.4,144.4L431.8,145.8L437.2,147.2L442.6,148.5L448.0,149.9L453.4,151.3L458.8,152.7L464.2,154.1L469.6,155.5L475.0,156.9L480.4,158.3L485.8,159.6L491.2,161.0L496.6,162.4L502.0,163.8L507.4,165.2L512.8,166.5L518.2,167.9L523.6,169.3L529.0,170.7L534.4,172.0L539.8,173.4L545.2,174.8L550.6,176.2L556.0,177.5L561.4,178.9L566.8,180.3L572.2,181.6L577.6,183.0L583.0,184.4L588.4,185.7L593.8,187.1L599.2,188.5L604.6,189.8L610.0,191.2"/>
<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" d="M70.0,30.0L75.4,31.3L80.8,32.6L86.2,33.9L91.6,35.2L97.0,36.5L102.4,37.8L107.8,39.1L113.2,40.4L118.6,41.7L124.0,43.0L129.4,44.3L134.8,45.6L140.2,46.9L145.6,48.2L151.0,49.5L156.4,50.8L161.8,52.1L167.2,53.5L172.6,54.8L178.0,56.1L183.4,57.4L188.8,58.7L194.2,60.0L199.6,61.3L205.0,62.6L210.4,63.9L215.8,65.2L221.2,66.5L226.6,67.8L232.0,69.1L237.4,70.4L242.8,71.7L248.2,73.0L253.6,74.3L259.0,75.6L264.4,76.9L269.8,78.2L275.2,79.5L280.6,80.8L286.0,82.1L291.4,83.4L296.8,84.7L302.2,86.0L307.6,87.3L313.0,88.6L318.4,89.9L323.8,91.2L329.2,92.5L334.6,93.8L340.0,95.1L345.4,96.4L350.8,97.7L356.2,99.1L361.6,100.4L367.0,101.7L372.4,103.0L377.8,104.3L383.2,105.6L388.6,106.9L394.0,108.2L399.4,109.5L404.8,110.8L410.2,112.1L415.6,113.4L421.0,114.7L426.4,116.0L431.8,117.3L437.2,118.6L442.6,119.9L448.0,121.2L453.4,122.5L458.8,123.8L464.2,125.1L469.6,126.4L475.0,127.7L480.4,129.0L485.8,130.3L491.2,131.6L496.6,132.9L502.0,134.2L507.4,135.5L512.8,136.8L518.2,138.1L523.6,139.4L529.0,140.7L534.4,142.0L539.8,143.4L545.2,144.7L550.6,146.0L556.0,147.3L561.4,148.6L566.8,149.9L572.2,151.2L577.6,152.5L583.0,153.8L588.4,155.1L593.8,156.4L599.2,157.7L604.6,159.0L610.0,160.3"/>
<text x="380" y="95" font-size="12">Hoeffding bound e^(−2δ²t)</text>
<text x="408" y="163" font-size="12">exact Pr[at least 55% heads]</text>
</svg>
<figcaption>Figure 16.5. Exponential tails. The exact chance that t fair coin flips give at least 55% heads (solid) and Hoeffding's bound e^(−2δ²t) with δ = 0.05 (dashed), on a logarithmic scale. Both fall in nearly straight lines: the bound has the right exponential shape and sits above the truth, by a factor of about 10 at t = 2000.</figcaption>
</figure>

### How many samples an attack needs

§16.7 gave the rule of thumb: a bias of $\varepsilon$ takes about $1/\varepsilon^2$
samples to see. Hoeffding's bound turns the rule into a number with a guaranteed
error. Suppose a source gives bits that are 1 with probability either $\frac12$ or
$\frac12 + \varepsilon$, and the attacker wants to know which. The natural test
counts the ones among $t$ samples and says "biased" when the average reaches the
midpoint $\frac12 + \frac{\varepsilon}{2}$. It errs in two ways:

- a **false alarm** on the fair source, when the average climbs $\varepsilon/2$
  above its mean, with probability at most $e^{-2(\varepsilon/2)^2 t} =
  e^{-\varepsilon^2 t/2}$;
- a **miss** on the biased source, when the average falls $\varepsilon/2$ below its
  mean, with the same bound by symmetry (Hoeffding works for both tails).

To push both errors below $\eta$, it is enough that $e^{-\varepsilon^2 t/2} \le
\eta$, that is,

$$
t \ge \frac{2\ln(1/\eta)}{\varepsilon^2}.
$$

**By hand.** With $\varepsilon = 0.01$ and $\eta = 2^{-20}$ (about one in a
million): $\ln 2^{20} = 20 \times 0.693 = 13.86$, so $t \ge 2 \times 13.86 \times
10^4 = 277{,}259$ samples. For a 1% chance of error, $\ln 100 = 4.61$ and
$t \ge 92{,}100$. The shape is what matters: the cost is $1/\varepsilon^2$ times
the logarithm of the confidence you want. Halving the bias quadruples the data;
squaring the confidence only doubles it.

```python
# How many samples a distinguisher needs: Hoeffding's prediction against the exact error of a threshold test.
# Uses exp and log from the listings above.
from math import lgamma, ceil

def log_binom_pmf(t, j, p):
    return lgamma(t + 1) - lgamma(j + 1) - lgamma(t - j + 1) + j * log(p) + (t - j) * log(1 - p)

def tail_at_least(t, p, lo):                 # Pr[Binomial(t, p) >= lo], summed in log space
    return sum(exp(log_binom_pmf(t, j, p)) for j in range(lo, t + 1))

eps, eta = 0.01, 2.0**-20
t_needed = ceil(2 * log(1 / eta) / eps**2)   # Hoeffding: each error <= exp(-eps^2 t / 2)
print(t_needed)
for t in (10_000, 50_000, 100_000, t_needed):
    lo = ceil(t * (0.5 + eps / 2))           # say "biased" when heads >= t (1/2 + eps/2)
    false_alarm = tail_at_least(t, 0.5, lo)
    miss = 1 - tail_at_least(t, 0.5 + eps, lo)
    print(t, "%.2e %.2e %.2e" % (false_alarm, miss, exp(-eps**2 * t / 2)))

# A rare event: a fixed 16-bit pattern in 2^24 random 16-bit samples is expected 256 times.
t, p, mu = 2**24, 2.0**-16, 256
exact = sum(exp(log_binom_pmf(t, j, p)) for j in range(320, 2000))   # 25% above the mean
print("%.2e %.2e %.4f" % (exact, exp(-0.25**2 * mu / 3), exp(-2 * (64 / t)**2 * t)))
```

It prints:

```text
277259
10000 1.61e-01 1.56e-01 6.07e-01
50000 1.28e-02 1.25e-02 8.21e-02
100000 7.91e-04 7.73e-04 6.74e-03
277259 7.03e-08 6.93e-08 9.54e-07
6.42e-05 4.83e-03 0.9995
```

The first line is the Hoeffding sample count. Each row after it gives $t$, the exact
false-alarm and miss probabilities of the midpoint test, and the Hoeffding bound
$e^{-\varepsilon^2 t/2}$. At 10,000 samples ($1/\varepsilon^2$) the test is wrong
about 16% of the time, matching the 0.68 advantage of Figure 16.4; at the Hoeffding
count it is wrong $7 \times 10^{-8}$ of the time, about 14 times better than
promised. The gap is almost exactly the factor $\varepsilon\sqrt{2\pi t} \approx 13$
by which a normal tail sits below $e^{-z^2/2}$; the exponent itself, $\varepsilon^2
t/2$, is the right one for small biases. That is the usual trade: an exact tail
needs the distribution, Hoeffding needs only independence and a range.

### Rare events: the multiplicative form

The last line of the output shows where the additive bound fails. A fixed 16-bit
pattern among $2^{24}$ random 16-bit values is expected $\mu = 256$ times. How
likely is it to appear 320 times or more, 25% above its mean? Hoeffding, measuring
deviations on the scale of the whole range $[0, 1]$, sees a deviation of only
$64/2^{24}$ per sample and gives the useless bound 0.9995. The **multiplicative
Chernoff bound** measures deviations relative to the mean: for independent
$X_i \in \{0, 1\}$ with sum $X$ and $\mathbb{E}X = \mu$, and $0 < \delta \le 1$,

$$
\Pr[X \ge (1 + \delta)\mu] \le e^{-\delta^2\mu/3}, \qquad
\Pr[X \le (1 - \delta)\mu] \le e^{-\delta^2\mu/2}.
$$

With $\delta = 0.25$ and $\mu = 256$, the bound is $e^{-16/3} \approx 0.0048$; the
exact tail is $6.4 \times 10^{-5}$. This is the form to use whenever the events
being counted are rare: collisions in a birthday test, right-key hits in a linear
attack, the number of decryption failures in $2^{64}$ ML-KEM queries, or the
outputs of a statistical test of a random number generator. The rule of thumb that
comes with it: a count with mean $\mu$ wanders by about $\sqrt{\mu}$, so a deviation
of $c\sqrt{\mu}$ has probability around $e^{-c^2/3}$ or less.

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
number of messages. Section 16.10 builds the hybrids and the reduction in full for
two standard cases and computes every hybrid of a small example.

## 16.10 Hybrid arguments with numbers

*Level: expert.*

The hybrid argument of §16.9 is three lines of algebra, and most of the work in a
real proof lies elsewhere: in choosing the hybrids so that neighbors differ in
exactly one use of one primitive, and in turning a distinguisher for a neighbor pair
into an attack on that primitive. This section does both for two standard cases,
counts the loss, and then computes every hybrid of a small example exactly.

### Stretching a generator by iteration

A pseudorandom generator that adds only one bit is easy to imagine and hard to use.
Manuel Blum and Silvio Micali (1982, journal version 1984) built generators by
iterating one step and taking one bit each time, and the general argument, set out in
Oded Goldreich's *Foundations of Cryptography*, shows how to stretch any such step as
far as you like. Let $G$ map an $n$-bit state $s$ to one output bit and a new $n$-bit
state, $G(s) = (b, s')$, and suppose $G(U_n)$ cannot be told from $(U_1, U_n)$, a
uniform bit with a uniform state, with advantage better than $\varepsilon$. Iterate:

$$
s_0 \text{ uniform}, \qquad (b_i, s_i) = G(s_{i-1}) \text{ for } i = 1, \ldots, m,
\qquad \text{output } b_1 b_2 \cdots b_m.
$$

The claim is that the $m$ output bits are indistinguishable from uniform with
advantage at most $m\varepsilon$. Define $m + 1$ hybrids:

- $H_i$: the first $i$ bits are uniform; then a fresh uniform state is drawn and the
  generator produces the remaining $m - i$ bits from it.

$H_0$ is the real output and $H_m$ is $m$ uniform bits. Now the reduction. Given a
distinguisher $D$ for the whole output, build $B_i$, which receives a pair
$(b, s)$ that is either $G(u)$ for a uniform $u$ or a uniform bit and a uniform
state. $B_i$ draws $i$ uniform bits itself, appends $b$, runs the generator from $s$
for the remaining $m - i - 1$ bits, and hands the $m$ bits to $D$. If $(b, s) =
G(u)$, then $u$ played the role of the fresh state after $i$ uniform bits, and $D$
sees exactly $H_i$. If $(b, s)$ is uniform, $D$ sees $i + 1$ uniform bits followed
by the generator from a fresh state: exactly $H_{i+1}$. So

$$
\mathrm{Adv}(B_i) = \bigl|\Pr[D(H_i) = 1] - \Pr[D(H_{i+1}) = 1]\bigr|.
$$

A reduction should be one algorithm, not $m$ of them, so the standard move is to let
$B$ pick $i$ uniformly from $\{0, \ldots, m-1\}$ and then act as $B_i$. Averaging
over $i$, the sum telescopes:

$$
\Pr[B = 1 \mid G] - \Pr[B = 1 \mid U] = \frac{1}{m}\sum_{i=0}^{m-1}\bigl(p_i -
p_{i+1}\bigr) = \frac{p_0 - p_m}{m},
$$

where $p_i = \Pr[D(H_i) = 1]$. So $\mathrm{Adv}(D) = m \cdot \mathrm{Adv}(B) \le
m\varepsilon$. $B$ also runs $D$ once and the generator up to $m$ times, so it is
slightly slower than $D$; a careful theorem states both losses.

**With numbers.** If $G$ is secure to $\varepsilon = 2^{-100}$ against attackers of
the relevant size and we stretch it to $m = 2^{40}$ bits (128 GiB), the output is
secure to $2^{40} \cdot 2^{-100} = 2^{-60}$. Stretching to $2^{64}$ bits leaves
$2^{-36}$, still small; stretching a generator only good to $2^{-64}$ to $2^{64}$ bits
leaves nothing. Every "use this key for at most so much data" rule in a standard has
a calculation of this shape behind it.

### The hybrids of a toy generator, computed

Take a deliberately weak $G$ on 8-bit states: the output bit is 1 when $s < 144$
(so each bit is 1 with probability $144/256 = 0.5625$, a bias of $1/16$), and the
next state is $73s + 41 \bmod 256$, a permutation, so a uniform state stays uniform.
Stretch it to $m = 8$ bits. The distinguisher $D$ is the simplest one: it says
"generator" when it sees five or more ones. Every $p_i$ can be computed exactly by
running all 256 starting states and convolving with a binomial for the uniform
prefix. Figure 16.6 draws the nine hybrids with the numbers the code finds.

```python
# A hybrid argument with exact numbers: a toy generator stretched to m bits, and m + 1 hybrids.
from fractions import Fraction
from math import comb

def G(s):                                    # one step: an 8-bit state gives one output bit and a new state
    return (1 if s < 144 else 0), (73 * s + 41) % 256

def ones_from_generator(steps):
    """Distribution of the number of 1s in `steps` outputs, starting from a uniform state."""
    dist = {}
    for s in range(256):
        ones = 0
        for _ in range(steps):
            bit, s = G(s)
            ones += bit
        dist[ones] = dist.get(ones, 0) + Fraction(1, 256)
    return dist

def accept_prob(i, m, threshold):
    """Pr[D(H_i) = 1]: the first i bits are uniform, the other m - i come from the generator."""
    gen = ones_from_generator(m - i)
    p = Fraction(0)
    for j in range(i + 1):                   # j ones among the i uniform bits
        for g, pg in gen.items():
            if j + g >= threshold:
                p += Fraction(comb(i, j), 2**i) * pg
    return p

m, threshold = 8, 5
p = [accept_prob(i, m, threshold) for i in range(m + 1)]
gaps = [p[i] - p[i + 1] for i in range(m)]
print([round(float(x), 4) for x in p])
print([round(float(g), 4) for g in gaps])
print(round(float(p[0] - p[m]), 4), round(float(sum(abs(g) for g in gaps)), 4),
      round(float(max(abs(g) for g in gaps)), 4), round(float((p[0] - p[m]) / m), 4))
```

It prints:

```text
[0.5312, 0.5059, 0.4805, 0.4536, 0.4316, 0.4139, 0.3975, 0.3804, 0.3633]
[0.0254, 0.0254, 0.0269, 0.022, 0.0177, 0.0165, 0.0171, 0.0171]
0.168 0.168 0.0269 0.021
```

The first line is $p_0, \ldots, p_8$: $D$ accepts the real output with probability
$0.5312$ ($136/256$) and uniform bits with probability $0.3633$ (the chance of five
or more heads in eight fair flips, $93/256$). The second line is the eight gaps
$p_i - p_{i+1}$. The third line gives the total advantage $p_0 - p_8 = 0.168$, the
sum of the absolute gaps (here equal to it, because every gap is positive), the
largest gap, $0.0269$, and the average, $0.168/8 = 0.021$, which is exactly the
advantage of the random-$i$ reduction $B$. As the argument promised, some neighbor
pair is separated by at least the average. (This toy $G$ is no real generator:
anyone who sees the new state can step the permutation back and recompute the bit,
so $G(U)$ is easy to tell from uniform. The hybrid argument does not care. It is an
identity about $D$'s acceptance probabilities, and the security of $G$ enters only
when each gap is bounded by $\varepsilon$.)

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Nine rows H0 to H8, each of eight output bits; in row Hi the first i bits are uniform and the rest come from the generator. Beside each row is the chance that the test accepts, falling from 0.531 to 0.363, and between neighboring rows the gap, each at most 0.027" fill="currentColor" font-size="13">
<text x="40" y="20" font-size="12">hybrid</text><text x="110" y="20" font-size="12">output bits: shaded = generator, open = uniform</text><text x="455" y="20" font-size="12">Pr[D = 1]</text><text x="545" y="20" font-size="12">gap</text>
<path d="M110,34h32v20h-32zM148,34h32v20h-32zM186,34h32v20h-32zM224,34h32v20h-32zM262,34h32v20h-32zM300,34h32v20h-32zM338,34h32v20h-32zM376,34h32v20h-32zM148,63h32v20h-32zM186,63h32v20h-32zM224,63h32v20h-32zM262,63h32v20h-32zM300,63h32v20h-32zM338,63h32v20h-32zM376,63h32v20h-32zM186,92h32v20h-32zM224,92h32v20h-32zM262,92h32v20h-32zM300,92h32v20h-32zM338,92h32v20h-32zM376,92h32v20h-32zM224,121h32v20h-32zM262,121h32v20h-32zM300,121h32v20h-32zM338,121h32v20h-32zM376,121h32v20h-32zM262,150h32v20h-32zM300,150h32v20h-32zM338,150h32v20h-32zM376,150h32v20h-32zM300,179h32v20h-32zM338,179h32v20h-32zM376,179h32v20h-32zM338,208h32v20h-32zM376,208h32v20h-32zM376,237h32v20h-32z" fill-opacity=".55"/>
<path d="M110,63h32v20h-32zM110,92h32v20h-32zM148,92h32v20h-32zM110,121h32v20h-32zM148,121h32v20h-32zM186,121h32v20h-32zM110,150h32v20h-32zM148,150h32v20h-32zM186,150h32v20h-32zM224,150h32v20h-32zM110,179h32v20h-32zM148,179h32v20h-32zM186,179h32v20h-32zM224,179h32v20h-32zM262,179h32v20h-32zM110,208h32v20h-32zM148,208h32v20h-32zM186,208h32v20h-32zM224,208h32v20h-32zM262,208h32v20h-32zM300,208h32v20h-32zM110,237h32v20h-32zM148,237h32v20h-32zM186,237h32v20h-32zM224,237h32v20h-32zM262,237h32v20h-32zM300,237h32v20h-32zM338,237h32v20h-32zM110,266h32v20h-32zM148,266h32v20h-32zM186,266h32v20h-32zM224,266h32v20h-32zM262,266h32v20h-32zM300,266h32v20h-32zM338,266h32v20h-32zM376,266h32v20h-32z" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="40" y="49">H<tspan font-size="10" dy="3">0</tspan></text><text x="470" y="49">0.5312</text><text x="545" y="64" font-size="12" fill-opacity=".75">0.0253</text>
<text x="40" y="78">H<tspan font-size="10" dy="3">1</tspan></text><text x="470" y="78">0.5059</text><text x="545" y="93" font-size="12" fill-opacity=".75">0.0254</text>
<text x="40" y="107">H<tspan font-size="10" dy="3">2</tspan></text><text x="470" y="107">0.4805</text><text x="545" y="122" font-size="12" fill-opacity=".75">0.0269</text>
<text x="40" y="136">H<tspan font-size="10" dy="3">3</tspan></text><text x="470" y="136">0.4536</text><text x="545" y="151" font-size="12" fill-opacity=".75">0.0220</text>
<text x="40" y="165">H<tspan font-size="10" dy="3">4</tspan></text><text x="470" y="165">0.4316</text><text x="545" y="180" font-size="12" fill-opacity=".75">0.0177</text>
<text x="40" y="194">H<tspan font-size="10" dy="3">5</tspan></text><text x="470" y="194">0.4139</text><text x="545" y="209" font-size="12" fill-opacity=".75">0.0164</text>
<text x="40" y="223">H<tspan font-size="10" dy="3">6</tspan></text><text x="470" y="223">0.3975</text><text x="545" y="238" font-size="12" fill-opacity=".75">0.0171</text>
<text x="40" y="252">H<tspan font-size="10" dy="3">7</tspan></text><text x="470" y="252">0.3804</text><text x="545" y="267" font-size="12" fill-opacity=".75">0.0171</text>
<text x="40" y="281">H<tspan font-size="10" dy="3">8</tspan></text><text x="470" y="281">0.3633</text>
</svg>
<figcaption>Figure 16.6. The hybrid chain for the toy generator. Row H<sub>i</sub> has i uniform bits (open, U) followed by 8 − i generator bits (shaded). The chance that the test accepts falls from 0.5312 for the real output to 0.3633 for uniform bits; each step changes one bit from generator to uniform and moves the probability by at most 0.027. The reduction plants its challenge at a random row.</figcaption>
</figure>

### Encrypting many messages

The second standard case is the one §16.9 sketched. A scheme is IND-CPA secure
for one challenge with advantage $\varepsilon$; an attacker now gets $q$
challenges, each an encryption of either the left or the right message of a pair it
chooses, all under the same hidden bit. Hybrid $H_j$ encrypts the right message in
the first $j$ challenges and the left message in the rest. The reduction $B_j$ plays
the one-challenge game: it answers the first $j$ challenges by asking its encryption
oracle for the right messages, the last $q - j - 1$ by asking for the left ones, and
forwards challenge $j + 1$ to its own challenger. This is the reason the definition
gives the attacker an encryption oracle: without it, $B_j$ could not simulate the
other challenges. The loss is a factor $q$, so the multi-message advantage is at most
$q\varepsilon$.

For block-cipher modes a second term joins it. CTR mode with AES is analyzed by
first replacing AES with a truly random permutation (costing the PRP advantage),
then replacing the permutation with a random function. A random function and a
random permutation on $n$-bit blocks differ only when a function would repeat an
output, a birthday event, so the second swap costs at most $q^2/2^{n+1}$ for $q$
blocks: the **PRP/PRF switching lemma**. With $n = 128$ and $q = 2^{48}$ blocks
(4 PiB) that term is $2^{96}/2^{129} = 2^{-33}$. With $n = 64$ and $q = 2^{32}$ blocks
(32 GiB) it is $2^{64}/2^{65} = \frac12$, and the bound says nothing: that is the
Sweet32 regime of §16.13, and the attack shows the bound is not just pessimism.

### When the factor of $m$ is real

By §16.7, the loss is tight for a rare event that betrays itself whenever it
happens (a repeated nonce, a collision, a decryption failure), and pessimistic by
about $\sqrt{m}$ for a bias spread thinly over every sample. Techniques that give tighter bounds, such as Jacques Patarin's H-coefficient
technique (1991, restated in 2008) or the Rényi divergence of §16.11, work by
measuring the whole $m$-sample distributions at once instead of paying for each step
separately.

## 16.11 Rényi divergence

*Level: expert.*

Lattice schemes are proved secure with one distribution and run with another. The
proof wants discrete Gaussian noise, because Gaussians have the clean mathematics
of [Chapter 15](15-Learning-with-Errors.md) and [Chapter 14](14-Lattices.md); the
implementation wants something cheap and constant-time: a centered binomial, a
rounded Gaussian, or a table of probabilities stored to a fixed precision. Bridging
the two with statistical distance is honest but ruinous. If a signature scheme makes
$m = 2^{64}$ samples over its lifetime and the proof needs the real and ideal
worlds within $2^{-128}$ of each other, then each sample must be within about
$2^{-192}$ of ideal, which means probability tables with about 190 bits of
precision.
Shi Bai, Adeline Langlois, Tancrède Lepoint, Damien Stehlé and Ron Steinfeld showed
in 2015 that a different measure, the Rényi divergence, does the same job with a
fraction of the precision, and since then it has been the standard tool for this
step.

### Definition

For distributions $P$ and $Q$ with the support of $P$ inside the support of $Q$,
and an order $a > 1$,

$$
R_a(P \,\|\, Q) = \Bigl(\sum_{x} \frac{P(x)^a}{Q(x)^{a-1}}\Bigr)^{1/(a-1)},
\qquad R_2(P \,\|\, Q) = \sum_x \frac{P(x)^2}{Q(x)},
$$

and $R_\infty(P \,\|\, Q) = \max_x P(x)/Q(x)$. Alfréd Rényi introduced the family in
1961, alongside the entropies of the same name in
[Chapter 17](17-Information-and-Entropy.md); papers often work with the logarithm
$\log R_a$ instead. Unlike statistical distance, the divergence is not symmetric,
and the support condition matters: a binomial $P$ against a Gaussian $Q$ is fine,
because every value the binomial can produce the Gaussian can too; the other way
round, $R_a$ is infinite.

**By hand.** Take $P = (\frac12, \frac14, \frac14)$ and $Q$ uniform on three
outcomes, the pair whose statistical distance was $\frac16$ in §16.6. Then

$$
R_2(P \,\|\, Q) = \frac{(1/2)^2 + (1/4)^2 + (1/4)^2}{1/3} = 3 \cdot \frac{3}{8} =
\frac{9}{8}.
$$

### Three properties that do the work

**1. It is at least 1, and equals 1 only when $P = Q$.** For order 2 this is a
one-line identity: since $\sum P = \sum Q = 1$,

$$
R_2(P \,\|\, Q) - 1 = \sum_x \frac{P(x)^2}{Q(x)} - 2\sum_x P(x) + \sum_x Q(x) =
\sum_x \frac{(P(x) - Q(x))^2}{Q(x)} \ge 0.
$$

The right side is Pearson's $\chi^2$ divergence, the quantity behind the chi-squared
test. For general $a$, Jensen's inequality gives the same conclusion.

**2. It multiplies over independent samples.** For product distributions the sum
factors, $\sum_{x,y} \frac{P_1(x)^a P_2(y)^a}{Q_1(x)^{a-1}Q_2(y)^{a-1}} =
\bigl(\sum_x \cdots\bigr)\bigl(\sum_y \cdots\bigr)$, so

$$
R_a(P_1 \times P_2 \,\|\, Q_1 \times Q_2) = R_a(P_1 \,\|\, Q_1)\cdot R_a(P_2
\,\|\, Q_2), \qquad R_a(P^m \,\|\, Q^m) = R_a(P \,\|\, Q)^m.
$$

No hybrid argument is needed: the $m$-sample divergence is known exactly.

**3. It preserves small probabilities.** For any event $E$,

$$
P(E) \le \bigl(R_a(P \,\|\, Q)\cdot Q(E)\bigr)^{(a-1)/a}, \qquad\text{in particular}
\qquad P(E) \le \sqrt{R_2(P \,\|\, Q)\cdot Q(E)}.
$$

*Proof for $a = 2$.* Write each term as a product and apply the Cauchy-Schwarz
inequality:

$$
P(E) = \sum_{x \in E} \frac{P(x)}{\sqrt{Q(x)}}\cdot\sqrt{Q(x)} \le
\Bigl(\sum_{x \in E}\frac{P(x)^2}{Q(x)}\Bigr)^{1/2}\Bigl(\sum_{x \in E} Q(x)\Bigr)^{1/2}
\le \sqrt{R_2(P \,\|\, Q)\, Q(E)}.
$$

For general $a$ the same argument runs with Hölder's inequality and exponents $a$
and $a/(a-1)$. $\blacksquare$

Check it on the example: for $E$ = the first outcome, $Q(E) = \frac13$ and the bound
is $\sqrt{\frac98 \cdot \frac13} = 0.612$, above the true $P(E) = 0.5$. For ten
samples and the event "all ten are the first outcome", $R_2 = (9/8)^{10} = 3.25$ by
property 2, $Q(E) = 3^{-10} = 1.7 \times 10^{-5}$, and the bound is $\sqrt{3.25
\times 1.7 \times 10^{-5}} = 0.0074$, above the true $2^{-10} = 0.00098$.

Property 3 is how the divergence enters a proof. The real scheme samples from $P$,
the proof is written for $Q$, and the attack is an event $E$, such as "the attacker
outputs a forgery" or "the attacker finds the key", that has probability at most
$2^{-\lambda}$ in the ideal world. Then in the real world it has probability at most
$(R_a(P \,\|\, Q)^m \cdot 2^{-\lambda})^{(a-1)/a}$.

### Why it beats statistical distance

Write the real distribution as a small relative perturbation of the ideal one,
$P(x) = Q(x)(1 + \delta_x)$ with $|\delta_x| \le \delta$. Then

$$
\Delta(P, Q) = \tfrac12\sum_x Q(x)\,|\delta_x| \quad\text{(first order in } \delta),
\qquad R_2(P \,\|\, Q) - 1 = \sum_x Q(x)\,\delta_x^2 \le \delta^2 \quad\text{(second
order)}.
$$

Over $m$ samples, statistical distance can only be bounded by $m\Delta$, which is up
to $m\delta/2$, while the divergence is at most $(1 + \delta^2)^m \le e^{m\delta^2}$.
Put in numbers, with $m = 2^{64}$ samples and an ideal bound of $2^{-128}$:

- **Statistical distance** needs $m\delta/2 \le 2^{-128}$, so $\delta \approx
  2^{-191}$: about 191 bits of precision.
- **Order 2** needs only $m\delta^2 \le 1$, so $\delta \approx 2^{-32}$, and gives
  $P(E) \le \sqrt{e \cdot 2^{-128}} \approx 2^{-63}$. The square root halves the
  security exponent, which is acceptable for some uses and not for others.
- **Higher order** fixes that. For small $\delta$, $R_a - 1 \approx \frac{a}{2}
  \sum_x Q(x)\delta_x^2$, and the exponent $(a-1)/a$ is close to 1. Choosing $a
  \approx \lambda = 128$ and asking $m \cdot \frac{a}{2}\delta^2 \le 1$ gives
  $\delta \le \sqrt{2/(m\lambda)} = 2^{-35}$, and leaves $P(E) \le (e \cdot
  2^{-128})^{127/128} \approx 2^{-125.6}$: two and a half bits lost.

So 35 bits of relative precision replace 191. Thomas Prest sharpened these bounds in
2017, and the same $1/\sqrt{m\lambda}$ shape sets the smoothing parameter of Falcon
(*Post-quantum*
[chapter 10](../post-quantum/10-NTRU-Falcon-and-FN-DSA.md#how-wide-is-wide-enough)).
It is also why IEEE double precision, with 53 bits, is enough for a Gaussian
sampler, provided the precision is *relative*. The listing shows what that proviso
means.

```python
# A sampler that stores its probabilities with b bits: statistical distance against R_2 - 1.
from fractions import Fraction
from math import exp, log2, frexp

def renyi2(P, Q):
    """R_2(P || Q) = sum P(x)^2 / Q(x); needs Q(x) > 0 wherever P(x) > 0."""
    return sum(P[x] ** 2 / Q[x] for x in P if P[x])

def stat_dist(P, Q):
    return sum(abs(P[x] - Q[x]) for x in Q) / 2

def normalize(w):
    total = sum(w.values())
    return {x: w[x] / total for x in w}

sigma, T = 2, 20                                     # a discrete Gaussian on -20..20
Q = normalize({x: Fraction(exp(-x * x / (2 * sigma * sigma))) for x in range(-T, T + 1)})

def fixed_point(p, b):                               # b bits after the binary point
    return Fraction(round(p * 2**b), 2**b)

def floating_point(p, b):                            # b significant bits, any exponent
    e = frexp(float(p))[1]
    return Fraction(round(p * 2**(b - e)), 2**(b - e))

for b in (16, 32, 48):
    for name, rnd in (("fixed", fixed_point), ("float", floating_point)):
        P = normalize({x: rnd(Q[x], b) for x in Q})
        print(b, name, round(log2(stat_dist(P, Q)), 1), round(log2(renyi2(P, Q) - 1), 1))
```

It prints:

```text
16 fixed -14.4 -15.9
16 float -19.2 -35.8
32 fixed -30.3 -32.6
32 float -34.8 -67.3
48 fixed -45.7 -49.9
48 float -50.1 -98.2
```

Each row gives the precision $b$, the rounding style, $\log_2$ of the statistical
distance and $\log_2(R_2 - 1)$. With floating point, every probability keeps $b$
significant bits however small it is, and the divergence behaves as promised:
$R_2 - 1 \approx 2^{-2b}$, about twice as many bits as the statistical distance. With
fixed point, every probability is rounded to a multiple of $2^{-b}$, the far tails
round to zero or to something far from their true value, and the divergence is no
better than the distance. A tail value with $Q(x) = 2^{-60}$ stored as 0 costs only
$2^{-60}$ in statistical distance but contributes $Q(x)$ to $R_2 - 1$, and one stored
as $2^{-b}$ contributes about $2^{-2b}/2^{-60}$, which can be large. Rényi arguments
want tables accurate in ratio, not in absolute terms.

### Binomial noise in place of a Gaussian

The second use is replacing one distribution by a different, cheaper one. The
**centered binomial** $\psi_k$ (add $k$ fair bits, subtract $k$ more) has variance
$k/2$ and costs nothing but random bits and additions. Erdem Alkim, Léo Ducas,
Thomas Pöppelmann and Peter Schwabe's NewHope (2016) used $\psi_{16}$ in place of a
rounded Gaussian of variance 8, and justified it with the Rényi divergence of order 9.
The listing compares $\psi_8$ and $\psi_{16}$ with rounded Gaussians of the same
variance, for $m = 1024$ samples, one polynomial of NewHope's size.

```python
# Replacing a rounded Gaussian by a centered binomial: statistical distance against Renyi divergence.
from math import comb, erf, sqrt, log2

def rounded_gaussian(sigma, T=40):
    Phi = lambda z: (1 + erf(z / sqrt(2))) / 2
    return {x: Phi((x + 0.5) / sigma) - Phi((x - 0.5) / sigma) for x in range(-T, T + 1)}

def centered_binomial(k):                  # sum of k coin flips minus sum of k more: variance k / 2
    return {x: comb(2 * k, k + x) / 4**k for x in range(-k, k + 1)}

def renyi(P, Q, a):                         # R_a(P || Q), for P supported inside Q's support
    return sum(P[x]**a / Q[x]**(a - 1) for x in P) ** (1 / (a - 1))

lam, m = 128, 1024                          # ideal bad-event probability 2^-128; m samples
for k in (8, 16):
    P, Q = centered_binomial(k), rounded_gaussian(sqrt(k / 2))
    delta = sum(abs(P.get(x, 0) - Q[x]) for x in Q) / 2
    print(k, round(delta, 5), round(m * delta, 2))
    for a in (2, 9):
        R = renyi(P, Q, a)
        bits = (a - 1) / a * (lam - m * log2(R))      # -log2 of (R^m * 2^-lam)^((a-1)/a)
        print("   a =", a, round(R, 6), round(bits, 1))
```

It prints:

```text
8 0.00455 4.66
   a = 2 1.000809 63.4
   a = 9 1.001994 111.2
16 0.00246 2.52
   a = 2 1.000208 63.8
   a = 9 1.000636 112.9
```

For each $k$ the first line gives the statistical distance and $m\Delta$; the next
two give $R_a$ and the security left of an ideal $2^{-128}$, in bits, for orders 2
and 9. The statistical distance is a few thousandths per sample, so $m\Delta$ is
2.5 to 4.7: a bound above 1, which says nothing at all. The Rényi argument with
$a = 9$ keeps about 111 to 113 bits. No precision argument is involved here; the
binomial really is a different distribution, and the divergence still prices the
switch at a handful of bits.

ML-KEM uses the same distribution, with $\eta = 2$ or $3$ in FIPS 203's notation, and
goes one step further: its hardness assumption is stated with binomial noise
directly, and the cryptanalytic estimates are run on that distribution, so no
Gaussian ever appears ([Chapter 15](15-Learning-with-Errors.md)).

### What the divergence cannot do

Property 3 bounds the probability of an event that is tiny in the ideal world. A
distinguishing game is different: the ideal probability of guessing the hidden bit
is $\frac12$, and a bound like $\sqrt{R_2 \cdot \frac12}$ is useless. Bai and his
coauthors identified conditions under which decision problems can still be handled,
but the clean uses are search problems: forging a signature, finding a key, solving
LWE in its search form. When a proof needs indistinguishability itself, statistical
distance, with its precision bill, is often still the tool.

## 16.12 Beyond pairs: two lists, many lists, every value

*Level: intermediate.*

The birthday problem asks for a repeat anywhere among $k$ values. Attacks often ask
something more specific: a match between two lists, a combination of several lists
that cancels out, or the moment when every possible value has been seen. Each has
its own count.

### Two lists

Draw $k_1$ values into a list $A$ and $k_2$ into a list $B$, all uniform from $N$.
There are $k_1 k_2$ cross pairs, each equal with probability $1/N$, so the expected
number of matches between the lists is $k_1 k_2/N$, and the chance of at least one
is about $1 - e^{-k_1 k_2/N}$. The balance point is $k_1 = k_2 = \sqrt{N}$, but the
lists need not be the same size: an attacker who can afford a table of $2^{40}$
entries against $N = 2^{64}$ needs $2^{24}$ queries on the other side. This count
is behind meet-in-the-middle attacks, multi-target key search, and the
time-memory trade-offs of *Cryptanalysis*
[chapter 4](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md).

### Many lists: Wagner's generalized birthday problem

Now take four lists $L_1, \ldots, L_4$ of random $n$-bit strings and ask for one
element from each with $x_1 \oplus x_2 \oplus x_3 \oplus x_4 = 0$. With two lists
this is a birthday problem and costs about $2^{n/2}$. With four, David Wagner
showed in 2002 that much less suffices, by solving the problem in stages.

<div class="mars-steps" markdown>

1. Make each list $2^{n/3}$ long.
2. Join $L_1$ with $L_2$: keep every pair whose XOR is zero on the lowest $n/3$
   bits. By the two-list count there are about $2^{n/3}\cdot 2^{n/3}/2^{n/3} =
   2^{n/3}$ such pairs. Do the same for $L_3$ and $L_4$.
3. Join the two new lists on all the remaining bits. Their elements are already zero
   on the low $n/3$ bits, so only $2n/3$ bits are left to match, and the expected
   number of matches is $2^{n/3}\cdot 2^{n/3}/2^{2n/3} = 1$.

</div>

Each join is a hash-table pass, so time and memory are both about $2^{n/3}$. With
$k = 2^j$ lists the tree has $j$ levels, each list has $2^{n/(j+1)}$ elements, and
the cost is about $k \cdot 2^{n/(1 + \log_2 k)}$.

**By hand, for $n = 120$.** Two lists: $2^{60}$. Four lists: $2^{120/3} = 2^{40}$
per list. Sixteen lists: $2^{120/5} = 2^{24}$ per list, about sixteen million
elements each. A problem that looked like $2^{60}$ work falls to a laptop once the
attacker may combine sixteen terms instead of two.

The listing runs the four-list algorithm on 24-bit values from SHA-256, with lists
of $2^9$ instead of the bare $2^8$ to expect several solutions; Figure 16.7 shows
its shape.

```python
# Wagner's four-list algorithm: find x1 ^ x2 ^ x3 ^ x4 = 0 with x_i from four lists of random 24-bit values.
import hashlib

n, size = 24, 2**9                           # n bits; lists of 2^9 (Wagner's n/3 = 8, doubled for margin)
def H(list_no, i):
    d = hashlib.sha256(bytes([list_no]) + i.to_bytes(4, "big")).digest()
    return int.from_bytes(d[:3], "big")

L = [[(H(k, i), i) for i in range(size)] for k in range(4)]
low = 2**(n // 3) - 1                        # the lowest n/3 = 8 bits

def merge(A, B, mask):
    """All pairs (a, b) with a ^ b zero on the bits of mask: join on the masked value."""
    index = {}
    for vb, ib in B:
        index.setdefault(vb & mask, []).append((vb, ib))
    return [(va ^ vb, (ia, ib)) for va, ia in A for vb, ib in index.get(va & mask, [])]

L12 = merge(L[0], L[1], low)                 # about 2^9 * 2^9 / 2^8 = 1024 pairs each
L34 = merge(L[2], L[3], low)
full = 2**n - 1
solutions = merge(L12, L34, full)            # now match on all 24 bits (the low 8 already agree)
print(len(L12), len(L34), len(solutions))
(v, ((a, b), (c, d))) = solutions[0]
print(a, b, c, d, hex(H(0, a) ^ H(1, b) ^ H(2, c) ^ H(3, d)))
```

It prints:

```text
1092 986 18
82 310 224 390 0x0
```

The joins give 1,092 and 986 pairs (about the predicted 1,024), and the final join
gives 18 solutions against a prediction of $1024^2/2^{16} = 16$; the second line
checks one of them. In all, 2,048 hashes were computed. The plain two-list birthday
search for a 24-bit match needs about $2^{12} = 4{,}096$ values per list.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Wagner's tree: four lists of 512 random 24-bit values at the bottom; pairs of lists are joined on their lowest 8 bits, giving about 1024 sums each with those bits zero; the two results are joined on all 24 bits, giving the solutions" fill="currentColor" font-size="13">
<rect x="20" y="190" width="135" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="87" y="213" text-anchor="middle">L1: 2^9 values</text>
<rect x="175" y="190" width="135" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="242" y="213" text-anchor="middle">L2: 2^9 values</text>
<rect x="330" y="190" width="135" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="397" y="213" text-anchor="middle">L3: 2^9 values</text>
<rect x="485" y="190" width="135" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="552" y="213" text-anchor="middle">L4: 2^9 values</text>
<rect x="80" y="105" width="190" height="44" rx="4" fill-opacity=".12" stroke="currentColor" stroke-width="1.5"/><text x="175" y="124" text-anchor="middle" font-size="12">L1 ⊕ L2, low 8 bits = 0</text><text x="175" y="141" text-anchor="middle" font-size="12">≈ 2^9·2^9/2^8 = 1024</text>
<rect x="390" y="105" width="190" height="44" rx="4" fill-opacity=".12" stroke="currentColor" stroke-width="1.5"/><text x="485" y="124" text-anchor="middle" font-size="12">L3 ⊕ L4, low 8 bits = 0</text><text x="485" y="141" text-anchor="middle" font-size="12">≈ 1024</text>
<rect x="210" y="18" width="220" height="44" rx="4" fill-opacity=".25" stroke="currentColor" stroke-width="1.5"/><text x="320" y="37" text-anchor="middle" font-size="12">all 24 bits = 0</text><text x="320" y="54" text-anchor="middle" font-size="12">≈ 1024·1024/2^16 = 16</text>
<line x1="87" y1="190" x2="150" y2="149" stroke="currentColor" stroke-width="1.5"/>
<line x1="242" y1="190" x2="200" y2="149" stroke="currentColor" stroke-width="1.5"/>
<line x1="397" y1="190" x2="460" y2="149" stroke="currentColor" stroke-width="1.5"/>
<line x1="552" y1="190" x2="510" y2="149" stroke="currentColor" stroke-width="1.5"/>
<line x1="175" y1="105" x2="280" y2="62" stroke="currentColor" stroke-width="1.5"/>
<line x1="485" y1="105" x2="360" y2="62" stroke="currentColor" stroke-width="1.5"/>
<text x="20" y="95" font-size="12" fill-opacity=".75">join on 8 bits</text><text x="20" y="40" font-size="12" fill-opacity=".75">join on 24 bits</text>
</svg>
<figcaption>Figure 16.7. Wagner's tree for four lists. Each join keeps only the pairs that cancel on some bits, so the lists stay the same size while the bits left to match shrink: 8 bits at the first level, the remaining 16 at the top.</figcaption>
</figure>

The algorithm matters wherever a scheme adds or XORs several independent random
values and trusts the sum to be hard to steer. Wagner's paper itself applied it to
incremental hash functions built by adding hashes modulo a number, to finding
low-weight parity checks in stream-cipher attacks, and to the ROS problem behind
blind Schnorr signatures, which Fabrice Benhamouda, Tancrède Lepoint, Julian Loss,
Michele Orrù and Mariana Raykova later solved in polynomial time (EUROCRYPT 2021;
*Advanced protocols*
[chapter 14](../advanced/14-Blind-Signatures-and-Anonymous-Credentials.md#blind-schnorr-signatures-and-the-ros-attack)).
It is also used constructively: Alex Biryukov and Dmitry Khovratovich's Equihash
(2016), the proof of work of Zcash, asks the miner to solve a generalized birthday
problem, because the best algorithm needs a lot of memory.

### Every value: the coupon collector

How many uniform draws from $N$ values until every value has appeared? Split the
wait into phases: after $i$ distinct values have been seen, each draw is new with
probability $(N - i)/N$, so the phase lasts $N/(N - i)$ draws on average (§16.4).
Adding the phases by linearity,

$$
\mathbb{E}[T] = \sum_{i=0}^{N-1}\frac{N}{N - i} = N\Bigl(1 + \frac12 + \cdots +
\frac1N\Bigr) = N H_N \approx N\ln N + 0.577\,N.
$$

**By hand.** For a die, $N = 6$: $6(1 + \frac12 + \frac13 + \frac14 + \frac15 +
\frac16) = 6 \times 2.45 = 14.7$ rolls to see every face. For the 256 byte values:
$256 \times H_{256} \approx 256 \times 6.12 = 1{,}568$ bytes.

The tail is a union bound. A particular value is still missing after $x$ draws with
probability $(1 - 1/N)^x \le e^{-x/N}$, so some value is missing with probability at
most $N e^{-x/N}$. Put $x = N\ln N + cN$:

$$
\Pr[T > N\ln N + cN] \le N e^{-\ln N - c} = e^{-c}.
$$

Paul Erdős and Alfréd Rényi showed in 1961 that this is close to the truth: the
probability tends to $1 - e^{-e^{-c}}$, which is about $e^{-c}$ for large $c$.

```python
# The coupon collector: draws until every one of N values has appeared.
import random
from fractions import Fraction
from math import comb, exp, floor, log

def expected_draws(N):                       # N (1 + 1/2 + ... + 1/N)
    return N * sum(Fraction(1, k) for k in range(1, N + 1))

def prob_still_missing(N, x):
    """Exact Pr[some value is still unseen after x draws], by inclusion-exclusion."""
    return Fraction(sum((-1)**(j + 1) * comb(N, j) * (N - j)**x for j in range(1, N + 1)), N**x)

def collect(N, rng):
    seen, draws = set(), 0
    while len(seen) < N:
        seen.add(rng.randrange(N))
        draws += 1
    return draws

rng = random.Random(16)
for N in (6, 256, 1024):
    runs = [collect(N, rng) for _ in range(200)]
    late = prob_still_missing(N, floor(N * log(N) + 3 * N))   # the union bound says <= e^-3
    print(N, round(float(expected_draws(N)), 1), round(N * log(N), 1), sum(runs) / len(runs),
          round(float(late), 4))
print(round(exp(-3), 4))
```

It prints:

```text
6 14.7 10.8 14.285 0.0362
256 1567.8 1419.6 1572.46 0.0479
1024 7689.4 7097.8 7710.535 0.0484
0.0498
```

For each $N$ the columns are the exact expectation $NH_N$, the leading term
$N\ln N$, the average of 200 simulated runs, and the exact probability that some
value is still unseen after $N\ln N + 3N$ draws; the last line is the bound
$e^{-3}$. The exact tails, 0.036, 0.048 and 0.048, sit just under it, and for large
$N$ they approach the Erdős-Rényi limit $1 - e^{-e^{-3}} = 0.0486$.

The coupon collector sets the cost of any task that needs full coverage: checking
that a random number generator can produce every byte, filling a rainbow table
until it covers a password space (where the last few percent cost as much as all
the rest), or a fuzzer reaching every branch. It is the reverse of the birthday
problem. Birthday collisions arrive early, after about $\sqrt{N}$ draws; full
coverage arrives late, after about $N\ln N$.

## 16.13 Break it: biased nonces and birthday-bound modes

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

**Nonces that are short, not biased.** The PuTTY flaw of §16.6 is the extreme
version of the same problem. A bias of $2^{-32}$ needs billions of signatures and a
Fourier method; nonces whose top 9 bits are always zero need about 60 signatures and
a lattice. The probability lesson is the same in both: what leaks is the distance
of the nonce distribution from uniform, accumulated over every signature the
attacker can collect.

!!! note "Life story: the PuTTY P-521 nonces"
    **Born:** PuTTY's own deterministic nonce method, written for DSA before
    RFC 6979 (2013) existed, was carried over to ECDSA keys on NIST curves in PuTTY
    0.68 (2017): a SHA-512 hash of the key and the message, reduced mod the group
    order · **Purpose:** make signatures safe without trusting the Windows random
    number generator, which the author did not · **Helped:** PuTTY, and the tools
    that bundle its code, such as FileZilla, WinSCP and TortoiseGit; the scheme was
    sound on P-256 and P-384 · **Status:** broken for P-521 in April 2024
    (CVE-2024-31497, Fabian Bäumer and Marcus Brinkmann), since 512 hash bits cannot
    cover a 521-bit order; fixed in PuTTY 0.81 by switching to RFC 6979, with every
    affected P-521 key to be replaced.

### Fix it

- Generate integers in a range by rejection sampling, or by reducing at least 64
  extra random bits; use the library function (`secrets.randbelow`).
- Use deterministic nonces (RFC 6979) or hedged ones for signatures.
- Check lengths: whatever is reduced mod the group order must be at least 64 bits
  *longer* than the order. PuTTY reduced 512 bits mod a 521-bit order.
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
- **Rekeying across the Mars link.** Arcadia City's link to Earth has a one-way
  delay of 3 to 22 minutes, so a rekey costs at least one round trip of 6 to 44
  minutes, and during a solar conjunction, when the Sun blocks the link for about two
  weeks every 26 months, it cannot happen at all. A relay sending 1,000 GCM messages
  a second with random 96-bit nonces reaches the $2^{32}$-message limit in about 50
  days, and two weeks of blackout alone is $1.2 \times 10^9 \approx 2^{30.2}$
  messages. The key budget has to cover the longest silence, with margin, before
  the blackout starts; counters as nonces, or a key ratchet that both ends advance
  without talking, remove the birthday term altogether.

## Going deeper

- *The best test, and its error rate.* The Neyman-Pearson lemma says the most
  powerful test between two simple hypotheses thresholds the likelihood ratio. With
  $t$ samples its error falls like $e^{-tC}$, where $C$ is the Chernoff information
  between the two distributions; for a coin of bias $\varepsilon$ it is about
  $\varepsilon^2/2$ (Cover and Thomas, chapter 11).
- *Other divergences.* The Kullback-Leibler divergence is the limit of $\log R_a$ as
  $a \to 1$, and Pinsker's inequality $\Delta \le \sqrt{\mathrm{KL}/2}$ links it to
  statistical distance. Micciancio and Walter's max-log distance (2017) is another
  relative measure, designed for samplers.
- *Computational indistinguishability* (Andrew Yao, 1982; Goldwasser and Micali):
  distributions that are statistically far apart but that no efficient algorithm can
  tell apart. Pseudorandom generators produce them.
- *Exact birthday asymptotics.* The number of draws until the first collision has
  mean $\sqrt{\pi N/2} + O(1)$ and follows the Rayleigh distribution in the limit;
  multicollisions ($r$ equal values) need about $N^{(r-1)/r}$ draws.
- *The H-coefficient technique.* Patarin's method bounds the distance between a real
  construction and an ideal one by comparing, transcript by transcript, the
  probabilities in both worlds; it gives many of the tightest known bounds for
  block-cipher modes and Feistel networks.

## Check yourself

??? question "1. You flip a fair coin until heads. What is the expected number of flips?"

    $1/p = 2$.

??? question "2. Roughly how many random 64-bit identifiers can you issue before the chance of a duplicate reaches 1%?"

    Solve $k^2/2N \approx 0.01$: $k \approx \sqrt{0.02 \cdot 2^{64}} \approx 0.14
    \cdot 2^{32} \approx 6 \times 10^8$.

??? question "3. What is the statistical distance between a fair coin and one with $\Pr[\text{heads}] = 0.6$?"

    $\frac{1}{2}(|0.5 - 0.6| + |0.5 - 0.4|) = 0.1$.

??? question "4. About how many random hex digits do you need to read before you have seen all 16 of them?"

    The coupon collector: $16 H_{16} = 16(1 + \frac12 + \cdots + \frac1{16}) \approx
    16 \times 3.38 \approx 54$. Compare the birthday count: a repeat comes after about
    $1.25\sqrt{16} = 5$ digits.

??? question "5. A uniform 16-bit value is reduced mod 3. Which residue is more likely, and by how much?"

    $65536 = 3 \cdot 21845 + 1$, so residue 0 occurs 21,846 times and 1 and 2 occur
    21,845 times each. The distance is $1 \cdot 2/(3 \cdot 65536) \approx 10^{-5}$.

??? question "6. A source's bits are 1 with probability 1/2 or 0.501. How many samples does the midpoint test need to be wrong less than once in 2^30 tries, by Hoeffding?"

    $t \ge 2\ln(2^{30})/\varepsilon^2 = 2 \times 20.8/10^{-6} \approx 4.2 \times
    10^7$. The rough rule $1/\varepsilon^2 = 10^6$ only gives a test that is right
    about 84% of the time.

??? question "7. An adversary wins an IND-CPA game 51% of the time. What is its advantage?"

    $|2 \cdot 0.51 - 1| = 0.02$.

??? question "8. A scheme has per-message advantage $2^{-100}$. What does the hybrid argument give for $2^{40}$ messages, and when is that factor of $2^{40}$ really paid?"

    At most $2^{40} \cdot 2^{-100} = 2^{-60}$. The loss is real when the difference
    between the worlds is a rare event that is visible whenever it happens, such as a
    nonce repeat; for a small bias spread over every sample the true advantage grows
    more like $\sqrt{m}$.

??? question "9. A 521-bit group order, and nonces taken straight from a 512-bit hash. How far is the nonce from uniform, and roughly how many signatures does a lattice attack need?"

    All nonces lie below $2^{512}$, so the distance is $1 - 2^{512}/n \approx 1 -
    2^{-9} \approx 0.998$. Each signature has 9 known (zero) top bits of nonce, and
    about $521/9 \approx 58$ signatures carry enough information; the PuTTY attack of
    2024 used about 60.

??? question "10. A sampler P has $R_2(P \| Q) = 1 + 2^{-70}$ against the ideal Q. Forging has probability at most $2^{-128}$ under Q. What does the order-2 argument give after $2^{64}$ samples?"

    By multiplicativity, $R_2(P^m \| Q^m) = (1 + 2^{-70})^{2^{64}} \approx
    e^{2^{-6}} \approx 1.016$. Then $P(\text{forge}) \le \sqrt{1.016 \cdot
    2^{-128}} \approx 2^{-64}$. The same sampler could be $2^{-36}$ away from Q in
    statistical distance, and $2^{64} \cdot 2^{-36}$ bounds nothing.

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
- Hoeffding turns a bias into a sample count, $t \ge 2\ln(1/\eta)/\varepsilon^2$; the
  multiplicative Chernoff bound handles rare events, where counts wander by about
  $\sqrt{\mu}$.
- A hybrid proof needs neighbors that differ in one use of one primitive and a
  reduction that plants its challenge at a random position; the factor $m$ is tight
  for rare visible events and pessimistic, by about $\sqrt{m}$, for small biases.
- The Rényi divergence multiplies over samples and preserves small probabilities,
  $P(E) \le \sqrt{R_2 \cdot Q(E)}$; because it is second order in the relative
  error, about 35 bits of relative precision replace about 190.
- Two lists match after $k_1 k_2 \approx N$; four lists cancel in time $2^{n/3}$
  (Wagner); seeing every value takes $N\ln N$ draws.

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
- Herman Chernoff, "A Measure of Asymptotic Efficiency for Tests of a Hypothesis
  Based on the Sum of Observations", *Annals of Mathematical Statistics* 23 (1952);
  Wassily Hoeffding, "Probability Inequalities for Sums of Bounded Random
  Variables", *Journal of the American Statistical Association* 58 (1963).
- Thomas Cover and Joy Thomas, *Elements of Information Theory*, 2nd edition
  (Wiley, 2006), chapter 11: hypothesis testing and Chernoff information.
- Manuel Blum and Silvio Micali, "How to Generate Cryptographically Strong
  Sequences of Pseudo-Random Bits", *SIAM Journal on Computing* 13 (1984); Oded
  Goldreich, *Foundations of Cryptography*, volume 1 (Cambridge, 2001), chapter 3.
- Jacques Patarin, "The 'Coefficients H' Technique", Selected Areas in Cryptography
  2008.
- Alfréd Rényi, "On Measures of Entropy and Information", Fourth Berkeley Symposium
  on Mathematical Statistics and Probability (1961).
- Shi Bai, Adeline Langlois, Tancrède Lepoint, Damien Stehlé and Ron Steinfeld,
  "Improved Security Proofs in Lattice-Based Cryptography: Using the Rényi
  Divergence Rather than the Statistical Distance", ASIACRYPT 2015 (journal version
  in the *Journal of Cryptology*, 2018).
- Thomas Prest, "Sharper Bounds in Lattice-Based Cryptography Using the Rényi
  Divergence", ASIACRYPT 2017.
- Daniele Micciancio and Michael Walter, "Gaussian Sampling over the Integers:
  Efficient, Generic, Constant-Time", CRYPTO 2017.
- Erdem Alkim, Léo Ducas, Thomas Pöppelmann and Peter Schwabe, "Post-Quantum Key
  Exchange: A New Hope", USENIX Security 2016.
- FIPS 203, *Module-Lattice-Based Key-Encapsulation Mechanism Standard* (2024): the
  centered binomial and the rejection sampling of the public matrix.
- David Wagner, "A Generalized Birthday Problem", CRYPTO 2002.
- Alex Biryukov and Dmitry Khovratovich, "Equihash: Asymmetric Proof-of-Work Based on
  the Generalized Birthday Problem", NDSS 2016.
- Fabrice Benhamouda, Tancrède Lepoint, Julian Loss, Michele Orrù and Mariana
  Raykova, "On the (in)security of ROS", EUROCRYPT 2021.
- Paul Erdős and Alfréd Rényi, "On a Classical Problem of Probability Theory",
  *Publications of the Mathematical Institute of the Hungarian Academy of Sciences*
  6 (1961): the coupon collector's limit law.
- Simon Tatham, PuTTY vulnerability page "vuln-p521-bias" and CVE-2024-31497
  (April 2024), reported by Fabian Bäumer and Marcus Brinkmann.
- In *The cryptography book*: [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)
  and [Chapter 17](../../book/17-Defining-Security.md).
