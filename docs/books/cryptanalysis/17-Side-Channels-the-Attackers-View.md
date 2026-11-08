# 17. Side channels, the attacker's view

*A cipher is a piece of mathematics, but a key lives in a machine, and the
machine gives things away: how long it takes, how much current it draws, which
memory it touches, what it does when it is shaken. Book 1 tours these leaks.
This chapter is about how an attacker turns them into a key. You will recover an
RSA exponent bit by bit from nothing but total running times, as Paul Kocher
did in 1996; read an exponent off a shared cache line and four key bits off a
cache-line number; recover an AES key byte from three hundred simulated power
traces with a correlation curve; solve the equations a single faulty byte gives
you in AES's ninth round until the whole key falls out; see how Rowhammer and
Spectre became tools; and, from the other side of the bench, mask an S-box,
break the mask with a second-order attack, and run the t-test that labs use to
decide whether a chip leaks. All the measurements here are simulated.*

!!! abstract "In this chapter"
    **You will learn:**

    - the attacker's recipe common to every side-channel attack: a leakage
      model, a prediction for each key guess, and a statistic that picks the
      guess whose prediction fits;
    - Kocher's timing attack, worked through on square and multiply with the
      variance test, and recovering a 32-bit exponent from 2,000 timings;
    - how Prime+Probe and Flush+Reload work at the level of cache sets and
      lines, how Flush+Reload read GnuPG's exponent in 2014, and why AES
      T-tables leak the top four bits of every key byte;
    - simple power analysis, Kocher-Jaffe-Jun differential power analysis and
      the correlation power attack, done on simulated Hamming-weight traces,
      with the statistics that say how many traces an attack needs;
    - electromagnetic analysis in brief;
    - differential fault analysis on AES: the equations of a one-byte fault
      in round 9, solved in code to recover the full key;
    - Rowhammer and Spectre as the attacker uses them;
    - the fixes (constant time, masking and its orders, hiding, fault
      detection) and how a lab tests for leakage with Welch's t-test.

    **You need:** the side-channel tour in book 1,
    [Chapter 18](../../book/18-Side-Channels.md), which this chapter does not
    repeat; AES from book 1 [Chapter 7](../../book/07-AES.md) for §17.5,
    §17.7 and §17.9; square and multiply from book 1
    [Chapter 3](../../book/03-The-Arithmetic-of-Secrets.md). The CRT fault attack on RSA is done in
    full in [Chapter 13](13-Attacks-on-RSA.md); nonce leaks in signatures are
    in [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md). Some statistics
    helps: mean, variance, correlation.

    **Levels:** §17.1, §17.2 and §17.8 are for beginners; §17.3 to §17.6 and
    §17.10 to §17.14 are intermediate; §17.7, §17.9 and §17.15 are expert.

## 17.1 The problem

*Level: beginner.*

Every attack in this book so far has treated a cipher as a black box with an
input and an output. The attacker chooses plaintexts, collects ciphertexts,
and looks for structure in the pairs. For AES with a 128-bit key the best such
attacks are barely better than trying all $2^{128}$ keys
([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)), so the box
holds.

But nobody runs a black box. They run a smart card with a chip that draws
current from a reader, a server whose answers arrive over a network a few
microseconds earlier or later, a laptop process that shares a processor cache
with a stranger's virtual machine. Each of these gives the attacker a second
output besides the ciphertext: a **side channel**. It is not designed, not
documented and not covered by any security proof. And it has one property
that makes it deadly: it usually depends on small pieces of the key at a time.

That last point is the whole game. A ciphertext depends on all 128 key bits at
once, which is why the black box holds. The current drawn while the chip
computes the first S-box of AES depends on one plaintext byte and one key byte.
Eight bits can be searched in 256 guesses. If the attacker can tell the right
guess from the wrong ones, sixteen searches of 256 replace one search of
$2^{128}$. Every side-channel attack in this chapter is a version of this
**divide and conquer**: find a moment where the leak depends on a few key
bits, guess them, test the guess against the measurements, move on.

The history of the field is short and runs through a few people. Paul Kocher,
a young consultant in California who had studied biology at Stanford before
turning to cryptography, announced in December 1995 that he could recover
RSA and Diffie-Hellman keys from the time the computation took; the paper
appeared at CRYPTO 1996. Within months Dan Boneh, Richard DeMillo and Richard
Lipton at Bellcore showed that a computation made to go wrong leaks even more.
Kocher, with Joshua Jaffe and Benjamin Jun at his company Cryptography Research,
then showed in 1998 that a smart card's power consumption gives the key away to
anyone with an oscilloscope and statistics; the industry that made pay-TV
cards and bank cards had to redesign its chips. In the 2000s the attacks moved
into software: caches (2005), then shared caches across virtual machines,
then the processor's own speculation (2018). The attacks were always simple at
heart. What changed is where the attacker could stand.

This chapter takes the attacker's side throughout. For each channel it asks
three questions: what leaks, how to predict the leak for a key guess, and what
statistic separates the right guess from the wrong. The last sections turn
around and ask what stops it.

## 17.2 The attacker's recipe

*Level: beginner.*

Strip the hardware away and every attack in this chapter has the same four
parts, shown in Figure 17.1.

1. **A target intermediate value** $v = f(x, k)$ that the device computes,
   depending on known data $x$ (a plaintext, a ciphertext, a base) and a
   small piece $k$ of the key. In AES's first round, $v = S(x \oplus k)$ for
   one byte. In square and multiply, $v$ is the running value after the next
   bit.
2. **A leakage model** $L(v)$: what the measurement should look like as a
   function of $v$. The time of an operation; the number of 1 bits in $v$
   (its **Hamming weight**), because each 1 on a bus or register draws a
   little more current; the number of bits that changed between $v$ and the
   value before it (the **Hamming distance**); whether $v$ indexes a cache line
   that is now present.
3. **Predictions.** For each guess $g$ of $k$, compute
   $h_{g,i} = L(f(x_i, g))$ for every measurement $i$.
4. **A distinguisher**: a statistic that compares the predictions with the
   real measurements $t_i$ and scores each guess. A variance (Kocher's timing
   attack), a difference of means (differential power analysis), a
   correlation (the correlation power attack), a count of hits (cache
   attacks), a set intersection (fault attacks).

The right guess wins because its predictions really are what the device
computed. A wrong guess makes predictions that, if $f$ mixes well, are
nearly independent of the real ones, and its score looks like noise. This is
why the AES S-box, which exists to scramble its input, is the attacker's
favorite target: the scrambling that defeats differential cryptanalysis also
makes the wrong guesses look unrelated to the right one.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The side-channel attack recipe: known inputs go into the device, which leaks measurements; the same inputs and each key guess go into a model, which makes predictions; a distinguisher compares measurements with predictions and ranks the guesses" fill="currentColor" font-size="14">
<rect x="20" y="40" width="130" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="62" text-anchor="middle">known inputs</text>
<text x="85" y="80" text-anchor="middle" font-size="12">x₁, x₂, …, xₙ</text>
<rect x="230" y="20" width="160" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="310" y="45" text-anchor="middle" font-weight="bold">device</text>
<text x="310" y="65" text-anchor="middle" font-size="12">computes f(xᵢ, k), key k secret</text>
<rect x="230" y="170" width="160" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="310" y="195" text-anchor="middle" font-weight="bold">model</text>
<text x="310" y="215" text-anchor="middle" font-size="12">hᵢ = L(f(xᵢ, g))</text>
<rect x="20" y="180" width="130" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="205" text-anchor="middle">guess g = 0 … 255</text>
<line x1="150" y1="65" x2="230" y2="50" stroke="currentColor" stroke-width="1.4"/>
<polygon points="222,46 232,50 224,56"/>
<line x1="120" y1="90" x2="240" y2="170" stroke="currentColor" stroke-width="1.4"/>
<polygon points="231,169 241,171 236,162"/>
<line x1="150" y1="200" x2="230" y2="200" stroke="currentColor" stroke-width="1.4"/>
<polygon points="222,195 232,200 222,205"/>
<line x1="390" y1="50" x2="470" y2="110" stroke="currentColor" stroke-width="1.4"/>
<polygon points="462,110 472,112 467,103"/>
<text x="440" y="62" font-size="12">measurements tᵢ</text>
<line x1="390" y1="200" x2="470" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="462,148 472,148 467,157"/>
<text x="430" y="200" font-size="12">predictions</text>
<rect x="470" y="100" width="150" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="545" y="125" text-anchor="middle" font-weight="bold">distinguisher</text>
<text x="545" y="145" text-anchor="middle" font-size="12">variance, mean, ρ, count</text>
<line x1="545" y1="160" x2="545" y2="230" stroke="currentColor" stroke-width="1.4"/>
<polygon points="540,222 545,232 550,222"/>
<text x="545" y="252" text-anchor="middle">guesses ranked:</text>
<text x="545" y="272" text-anchor="middle" font-size="12">the right one scores highest</text>
<text x="20" y="285" font-size="12" opacity="0.8">Repeat for each piece of the key: 16 searches of 256, not one of 2¹²⁸.</text>
</svg>
<figcaption>Figure 17.1. The recipe behind every attack in this chapter. Only the boxes change: the model may be a time, a Hamming weight or a cache line; the distinguisher a variance, a difference of means, a correlation or a count.</figcaption>
</figure>

Three costs measure a side-channel attack, much as time, data and memory
measure a classical one ([Chapter 1](01-What-Cryptanalysis-Is.md)): the
**number of measurements** (traces, timings, faults), the **computation**
(usually trivial: $256 \times N$ predictions per key byte), and the
**access** needed (a probe on the chip, a process on the same machine, a
network path). The last is what separates a laboratory curiosity from an
incident. A thousand traces from a smart card on the attacker's bench are
easy; a thousand from a server in someone else's data center may be
impossible, or may take a weekend.

Two families should be kept apart. In a **passive** attack the attacker only
watches: timing, power, electromagnetic and cache attacks. In an **active**
attack the attacker disturbs the computation: fault attacks, Rowhammer. A
third distinction is between **non-profiled** attacks, where the attacker
knows only a generic model such as the Hamming weight, and **profiled**
attacks, where the attacker owns an identical device, learns its exact leakage
first and then attacks the target with that knowledge (§17.15). The attacks
worked through below are non-profiled; they are the ones that need least.

## 17.3 Kocher's timing attack

*Level: intermediate.*

Book 1 shows the leak in square and multiply: a 1 bit costs a squaring and a
multiplication, a 0 bit only a squaring. If the attacker could see each
operation, the key would be written in the trace. Kocher's attacker sees only
one number per decryption: the **total** time. The total says roughly how many
1 bits the exponent has and nothing more, if every multiplication took the
same time. Kocher's observation was that they do not. A modular
multiplication's time depends a little on its operands; the classic cause is
a final conditional subtraction, done when an intermediate result exceeds the
modulus. The attacker cannot see that per-operation variation, but can
**compute** it, for any operation whose inputs are known.

**The setting.** The victim computes $y = x^d \bmod N$ for inputs $x$ the
attacker knows (ciphertexts sent to it, or signatures it is asked to make),
with a secret $d$ of $w$ bits, and returns the time $T(x)$. Write the total as
a sum over the operations:

$$
T(x) = \sum_{j} t_j(x) + e ,
$$

where $t_j(x)$ is the time of the $j$-th modular multiplication or squaring
and $e$ is noise from everything else in the machine. Suppose the top $i$ bits
of $d$ are known. Then the attacker can run the first $i$ steps of square and
multiply on each $x$ and knows exactly what the victim's running value was at
that point, and exactly how long those steps took.

**The variance test.** Now guess bit $i + 1$. For each guess $b \in \{0, 1\}$,
simulate step $i + 1$ (a square, and a multiply if $b = 1$) and subtract the
time of everything simulated so far from the measured total:

$$
R_b(x) = T(x) - \sum_{j \le \text{step } i+1 \text{ under } b} t_j(x).
$$

If the guess is right, the subtraction removes real terms of the sum, and what
is left is the time of the remaining operations plus noise. If the per-operation
times behave like independent random variables with variance $v$, then with
$n_r$ operations remaining,

$$
\operatorname{Var}(R_{\text{right}}) = n_r v + \sigma_e^2 .
$$

If the guess is wrong, the simulation computes a different running value from
step $i + 1$ on. The operation times it subtracts are then unrelated to the
ones the victim performed, and subtracting an independent random variable
**adds** its variance. Each mis-predicted operation costs $v$ more instead of
$v$ less, so

$$
\operatorname{Var}(R_{\text{wrong}}) \approx \operatorname{Var}(R_{\text{right}}) + 2v \quad\text{or more}.
$$

Choose the guess with the smaller variance, fix that bit, repeat. That is the
whole attack. It needs no model of the victim's internals beyond the timing of
one multiplication, which the attacker learns on a copy of the same software.

**By hand.** Take the toy model of the code below: each multiplication or
squaring takes 100 cycles, or 130 when its result lands in the upper half of
the modulus, which happens about half the time. One operation then has
variance $v = 30^2 \cdot \tfrac14 = 225$. The secret 32-bit exponent has 12
one bits, so the victim does $32 + 12 = 44$ operations, and the noise has
$\sigma_e = 30$, variance 900. Before any bit is known, the variance of the
totals should be about $44 \times 225 + 900 = 10{,}800$. The first squaring is
of the number 1, which always takes 100 cycles and has no variance, so the
first useful test is the first multiplication:

- guess 0: subtract only the squaring (constant); the variance stays about
  $10{,}800$;
- guess 1: subtract the squaring and the multiplication $1 \cdot x$, whose
  time is known for each $x$; the variance drops by $v$ to about $10{,}575$.

The code below measured $10{,}815$ and $10{,}551$: the bit is 1. At the third
bit, which is 0, the variances measured were $9{,}785$ for guess 0 and
$10{,}013$ for guess 1. The wrong guess subtracted a multiplication that never
happened, and the variance rose by about $v$, as predicted.

**Code it.** The victim is a 64-bit modular exponentiation with a toy timing
model and Gaussian noise; the attacker gets 2,000 pairs of input and total
time, and nothing else.

```python
import random

N = 0xC5A1B2E3F40917D3            # the victim's 64-bit modulus

def mulmod(a, b):                 # a modular multiply, and how long it took
    r = a * b % N
    return r, 130 if r > N // 2 else 100   # data-dependent: 30 cycles extra

def step(r, x, bit):              # one bit of square and multiply, with its time
    r, t = mulmod(r, r)
    if bit == "1":
        r, t2 = mulmod(r, x)
        t += t2
    return r, t

rng = random.Random(1996)
SECRET = bin(rng.getrandbits(31) | 1 << 31)[2:]     # 32-bit private exponent

def victim(x):                    # the device: only its total time gets out
    r, total = 1, 0
    for bit in SECRET:
        r, t = step(r, x, bit)
        total += t
    return total + rng.gauss(0, 30)                 # the rest of the system's noise

inputs = [rng.randrange(2, N) for _ in range(2000)]
times = [victim(x) for x in inputs]

def var(v):
    m = sum(v) / len(v)
    return sum((a - m) ** 2 for a in v) / len(v)

# For each input: the value r after the bits found so far, and their time.
state = [(x, 1, 0) for x in inputs]
found = ""
while len(found) < len(SECRET):
    trials = {}
    for g in "01":
        new, rest = [], []
        for (x, r, spent), T in zip(state, times):
            r1, t1 = step(r, x, g)
            new.append((x, r1, spent + t1))
            rest.append(T - spent - t1)
        trials[g] = (var(rest), new)
    g = min(trials, key=lambda k: trials[k][0])
    if len(found) < 5:
        print(len(found) + 1, "var if 0:", round(trials["0"][0]),
              " var if 1:", round(trials["1"][0]), " ->", g)
    found += g
    state = trials[g][1]
print("found ", found)
print("secret", SECRET)
```

It prints:

```
1 var if 0: 10815  var if 1: 10551  -> 1
2 var if 0: 10286  var if 1: 10032  -> 1
3 var if 0: 9785  var if 1: 10013  -> 0
4 var if 0: 9565  var if 1: 9836  -> 0
5 var if 0: 9330  var if 1: 9042  -> 1
found  11001000111011010000001000100100
secret 11001000111011010000001000100100
```

All 32 bits, from 2,000 timings whose noise is as large as the signal of a
single operation. Watch the variances fall as the bits are found: each right
guess explains a little more of the total, which is a useful check. Kocher
pointed out that a wrong bit is self-correcting in the same way. After a
mistake every later prediction is wrong, the variances stop falling, and the
attacker backs up to the last bit where the two guesses were close.

**How many timings?** The gap between right and wrong is about $2v$, while
each variance is estimated from $n$ samples of a quantity with variance about
$W = n_{\text{ops}} v + \sigma_e^2$. A rough estimate in the spirit of Kocher's
analysis: the number of samples needed grows with the exponent length and
with $W / v$, the ratio of total variance to the variance of one operation. Make
the per-operation leak small relative to the noise and the attack needs
millions of samples instead of thousands; make it zero and it needs infinitely
many. That is the only real defense, and §17.12 comes back to it.

**A caution about the model.** In this simulation the extra 30 cycles depend
on the result of each multiplication, which makes different operations behave
like independent coins. In real Montgomery multiplication the extra
subtraction depends on the operands in a structured way: multiplications by
the same base $x$ are more likely to need it when $x$ is large. Werner
Schindler showed in 2000 that this makes a much stronger attack on RSA with
the Chinese remainder theorem, which Kocher's method could not touch, and it
is the attack David Brumley and Dan Boneh ran across a network against OpenSSL
in 2003 (book 1, §18.3). An attacker uses the model that fits the
implementation, and the variance test is only the first.

!!! note "Life story: Kocher's timing attack"
    **Born:** announced December 1995 by Paul Kocher, published at CRYPTO
    1996 as "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS,
    and Other Systems" · **Purpose:** to recover a secret exponent from the
    total running time of many exponentiations, one bit at a time, by a
    variance test · **Helped:** RSA blinding and constant-time arithmetic;
    Schindler's attack on CRT (2000), Brumley and Boneh's remote attack
    (2003) and every timing attack since descend from it · **Status:** the
    method is current; implementations that blind and run in constant time
    defeat it

## 17.4 Cache attacks: Prime+Probe and Flush+Reload

*Level: intermediate.*

Timing the whole computation averages away almost everything. A cache attack
times something much smaller: one memory line. To build one, the attacker needs
the memory picture.

**The memory picture.** A processor's data cache holds copies of recently
used memory in **lines** of 64 bytes. A line from address $a$ can go only into
one **set**, chosen by some middle bits of $a$; a set has a few **ways**
(slots), typically 8 to 16 in a modern last-level cache, which is shared by
all the cores of a chip. When a set is full and a new line arrives, an old one
is evicted. Reading a line that is in the cache takes tens of cycles; reading
one that is not, a few hundred, because it has to come from main memory. The
difference is large and easy to measure with the processor's cycle counter.

The attacker and the victim are two processes on the same machine, perhaps
two virtual machines rented from the same cloud provider. They share no
memory that either can read. They do share the cache. There are two ways to
use it.

**Prime+Probe.** The attacker picks a cache set that the victim's secret
access might use and fills all its ways with lines of the attacker's own
memory (prime). It waits while the victim runs. Then it reads its own lines
again and times each one (probe). If they are all fast, the victim did not
touch that set. If one is slow, the victim's access evicted it. The attacker
learns **which sets** the victim used, without any shared memory at all.
Prime+Probe was named and used against AES by Dag Arne Osvik, Adi Shamir and
Eran Tromer in 2005; Colin Percival used the same idea against RSA in OpenSSL
the same year, and in 2015 Fangfei Liu, Yuval Yarom, Qian Ge, Gernot Heiser
and Ruby Lee made it work on the shared last-level cache across virtual
machines.

**Flush+Reload.** Operating systems save memory by sharing identical pages
between processes: two programs that use the same library get the same
physical copy of its code, read-only. The attacker cannot change that code but
can do two things with it. The `clflush` instruction on x86 evicts a given
line from every level of cache, and the attacker can time its own read of the
line. So: flush the line holding, say, the victim's multiplication routine;
wait a short slot; reload it and time the reload. A fast reload means someone,
the victim, ran that code during the slot. This is much finer than Prime+Probe
(one line instead of a whole set, and no false hits from unrelated data that
maps to the same set), and it is nearly noise-free. David Gullasch, Endre
Bangerter and Stephan Krenn used a version of it against AES in 2011; Yuval
Yarom and Katrina Falkner at the University of Adelaide turned it into the
general, cross-core attack they named Flush+Reload in 2014.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Prime+Probe and Flush+Reload compared. Left: a cache set with four ways is filled with attacker lines; the victim's access evicts one; the probe finds one slow line. Right: a shared code line is flushed, the victim may run it, and the attacker's reload is fast if it did" fill="currentColor" font-size="14">
<text x="150" y="22" text-anchor="middle" font-weight="bold">Prime+Probe (one cache set)</text>
<text x="20" y="55" font-size="12">1 prime</text>
<rect x="90" y="40" width="50" height="26" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="115" y="58" text-anchor="middle">A</text>
<rect x="140" y="40" width="50" height="26" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="165" y="58" text-anchor="middle">A</text>
<rect x="190" y="40" width="50" height="26" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="215" y="58" text-anchor="middle">A</text>
<rect x="240" y="40" width="50" height="26" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="265" y="58" text-anchor="middle">A</text>
<text x="20" y="115" font-size="12">2 victim</text>
<rect x="90" y="100" width="50" height="26" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="115" y="118" text-anchor="middle">A</text>
<rect x="140" y="100" width="50" height="26" fill="currentColor" opacity="0.25" stroke="currentColor"/><text x="165" y="118" text-anchor="middle" font-weight="bold">V</text>
<rect x="190" y="100" width="50" height="26" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="215" y="118" text-anchor="middle">A</text>
<rect x="240" y="100" width="50" height="26" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="265" y="118" text-anchor="middle">A</text>
<text x="20" y="175" font-size="12">3 probe</text>
<text x="115" y="178" text-anchor="middle" font-size="12">fast</text>
<text x="165" y="178" text-anchor="middle" font-size="12" font-weight="bold">slow</text>
<text x="215" y="178" text-anchor="middle" font-size="12">fast</text>
<text x="265" y="178" text-anchor="middle" font-size="12">fast</text>
<text x="20" y="215" font-size="12">The victim used this set: one of the attacker's</text>
<text x="20" y="233" font-size="12">lines was evicted. No shared memory needed.</text>
<line x1="320" y1="15" x2="320" y2="300" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="480" y="22" text-anchor="middle" font-weight="bold">Flush+Reload (one shared line)</text>
<text x="340" y="55" font-size="12">1 flush</text>
<rect x="410" y="40" width="200" height="26" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><text x="510" y="58" text-anchor="middle" font-size="12">multiply() code: not cached</text>
<text x="340" y="115" font-size="12">2 victim</text>
<rect x="410" y="100" width="200" height="26" fill="currentColor" opacity="0.25" stroke="currentColor"/><text x="510" y="118" text-anchor="middle" font-size="12" font-weight="bold">runs multiply(): line cached</text>
<text x="340" y="175" font-size="12">3 reload</text>
<text x="510" y="168" text-anchor="middle" font-size="12">about 80 cycles: victim ran it</text>
<text x="510" y="186" text-anchor="middle" font-size="12">about 280 cycles: it did not</text>
<text x="340" y="215" font-size="12">Repeat every slot of a few thousand cycles;</text>
<text x="340" y="233" font-size="12">the hits spell out the victim's code path.</text>
<text x="20" y="285" font-size="12" opacity="0.85">A = attacker's line, V = victim's line. Cycle counts are those of the simulation in this section.</text>
</svg>
<figcaption>Figure 17.2. The two basic cache attacks. Prime+Probe learns which cache set the victim touched by finding one of its own lines evicted; Flush+Reload learns whether the victim ran one particular line of shared code by timing a reload.</figcaption>
</figure>

**Flush+Reload against GnuPG.** GnuPG 1.4.13, in 2013, decrypted and signed
with RSA using plain square and multiply over its multiprecision library, with
separate functions for squaring, for multiplication and for modular reduction.
Yarom and Falkner's spy ran on another core of the same machine and probed
three lines, one inside each of these functions, every 2,500 cycles. A
squaring followed by a reduction, then a multiplication followed by a
reduction, is a 1 bit; a squaring and reduction followed by another squaring
is a 0. One decryption gave them, on average, 96.7 percent of the bits of the
secret exponent; the missing bits sit in known places, where two operations
merged in one slot or a hit was lost, and a few traces or a short search fill
them in. The fix, in GnuPG 1.4.14 (July 2013, CVE-2013-4242), was to always
perform the multiplication and discard the result when the bit is 0, a
"square and always multiply".

**Code it.** A simulation of the spy's view: the victim's code path through
the three lines, slot by slot; a reload time per line per slot, fast if the
line was used, with 3 percent of hits lost to interrupts; and the decoding.

```python
import random

rng = random.Random(2014)
SECRET = bin(rng.getrandbits(63) | 1 << 63)[2:]     # a 64-bit exponent

# The victim runs square and multiply. Each step keeps one code line busy
# for a few time slots: square "S", multiply "M", and reduce "R" after each.
timeline = []
for bit in SECRET:
    timeline += ["S"] * rng.randint(2, 4) + ["R"] * rng.randint(2, 3)
    if bit == "1":
        timeline += ["M"] * rng.randint(2, 4) + ["R"] * rng.randint(2, 3)

def reload_time(cached):          # what the spy's timer reads, in cycles
    if cached and rng.random() > 0.03:     # 3% of hits are lost (interrupts)
        return rng.gauss(80, 15)
    return rng.gauss(280, 40)

# The spy, every slot: reload each of the three lines, time it, flush it.
seen = ""
for op in timeline:
    hits = [line for line in "SMR" if reload_time(op == line) < 160]
    seen += hits[0] if hits else "."
print(seen[:60])

# Read it: drop empty slots, merge repeats, then SRMR is a 1 and a lone SR a 0.
ops = ""
for c in seen.replace(".", ""):
    if not ops or ops[-1] != c:
        ops += c
bits = ops.replace("R", "").replace("SM", "1").replace("S", "0")
print("recovered", bits)
print("secret   ", SECRET)
print("bits right:", sum(a == b for a, b in zip(bits, SECRET)), "of", len(SECRET))
```

It prints:

```
SSSRRMMMRRSS.RRRMMMMRRRSSRRRSSSRRSSSSRRRMMRRRSSRRRSSRRMMRRSS
recovered 1100101010111101111101001110001011010000101110101111110001011M010
secret    1100101010111101111101001110001001010000101110101111110001011010
bits right: 60 of 64
```

The first line is the spy's raw view of the first sixty slots, with one lost
hit (the dot). The recovered string agrees with the secret except in two
places. Near position 33 a reduction was missed between two operations, so
two steps merged and one bit was read wrong; that also shifts the count, which
is why only 60 of 64 positions line up. Near the end a lone `M` survived where
the reduction after a squaring was lost. Both mistakes are visible to the
attacker, because the pattern breaks; a second trace of the same key fixes
them. Against a 2048-bit or 4096-bit exponent the same few errors per
thousand bits remain, and they cost almost nothing.

!!! note "Life story: Flush+Reload"
    **Born:** 2014, Yuval Yarom and Katrina Falkner, University of Adelaide,
    "FLUSH+RELOAD: a High Resolution, Low Noise, L3 Cache Side-Channel Attack"
    (USENIX Security 2014), building on Gullasch, Bangerter and Krenn (2011)
    · **Purpose:** to watch which lines of shared code another process runs,
    across cores, with almost no noise · **Helped:** GnuPG's fix
    (CVE-2013-4242), attacks on ECDSA nonces in OpenSSL, and the "reload" step
    of Spectre and Meltdown; several hypervisors turned off sharing of
    identical memory pages between virtual machines by default · **Status:** current wherever memory is shared;
    the defense is code whose path and addresses do not depend on secrets

## 17.5 AES T-tables: the index leak

*Level: intermediate.*

Square and multiply leaks through its **control flow**: which code runs. AES
leaks through its **data flow**: which memory is read. Fast software AES
before 2010 used four lookup tables, the T-tables, each of 256 entries of four
bytes, that combine SubBytes, ShiftRows and MixColumns into four lookups and
three XORs per column (book 1, §7.9). In the first round, the lookup for state
byte $i$ uses the index

$$
x_i = p_i \oplus k_i ,
$$

the plaintext byte XOR the key byte. The attacker knows $p_i$. If the attacker
learns anything about $x_i$, it learns the same thing about $k_i$.

**What the cache reveals.** A table of $256 \times 4 = 1{,}024$ bytes fills 16
cache lines of 64 bytes, and each line holds 16 consecutive entries. So the
line that the lookup touches is

$$
\ell_i = \left\lfloor \frac{x_i}{16} \right\rfloor = (p_i \gg 4) \oplus (k_i \gg 4) ,
$$

the top four bits of the index. A cache attack sees the line and never the
position inside it, so it learns $k_i \gg 4$, the **top four bits of each key
byte**: 64 of the 128 key bits from the first round. Figure 17.3 shows the
arithmetic. The bottom four bits need a second step. Osvik, Shamir and Tromer
used lookups of the second round, whose indices are expressions such as

$$
x^{(2)}_2 = S(p_0 \oplus k_0) \oplus S(p_5 \oplus k_5) \oplus 2\,S(p_{10} \oplus k_{10}) \oplus 3\,S(p_{15} \oplus k_{15}) \oplus S(k_{15}) \oplus k_2
$$

(row 2 of the first column after MixColumns, plus byte 2 of round key 1,
which the key schedule makes from $k_2$ and $S(k_{15})$). With the top nibbles known, each such
equation involves only a few unknown low nibbles, and testing line predictions
for all $2^{16}$ or so values of them is quick.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The T-table index leak: plaintext byte 0x3F XOR key byte 0x6B gives index 0x54; the table's 16 cache lines each hold 16 entries; line 5 is touched, revealing the top nibble of the index and so of the key" fill="currentColor" font-size="14">
<text x="20" y="30">p₀ = 0011 1111 (0x3F)</text>
<text x="20" y="55">k₀ = 0110 1011 (0x6B, secret)</text>
<line x1="20" y1="64" x2="240" y2="64" stroke="currentColor" stroke-width="1.2"/>
<text x="20" y="85">x₀ = <tspan font-weight="bold">0101</tspan> 0100 (0x54)</text>
<text x="20" y="115" font-size="12">top nibble 0101 = line 5;</text>
<text x="20" y="133" font-size="12">bottom nibble 0100 = entry 4 in the line</text>
<text x="20" y="165" font-size="12">The spy sees only line 5, so it learns</text>
<text x="20" y="183" font-size="12">k₀ ≫ 4 = 5 ⊕ (p₀ ≫ 4) = 5 ⊕ 3 = 6:</text>
<text x="20" y="201" font-size="12">four key bits per byte, 64 bits in all.</text>
<text x="440" y="22" text-anchor="middle" font-weight="bold">T0: 16 lines × 64 bytes</text>
<rect x="320" y="32" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="43" font-size="11">0</text>
<rect x="320" y="45" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="56" font-size="11">1</text>
<rect x="320" y="58" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="69" font-size="11">2</text>
<rect x="320" y="71" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="82" font-size="11">3</text>
<rect x="320" y="84" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="95" font-size="11">4</text>
<rect x="320" y="97" width="240" height="13" fill="currentColor" opacity="0.3" stroke="currentColor"/><text x="572" y="108" font-size="11" font-weight="bold">5 ← touched</text>
<rect x="320" y="110" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="121" font-size="11">6</text>
<rect x="320" y="123" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="134" font-size="11">7</text>
<rect x="320" y="136" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="147" font-size="11">8</text>
<rect x="320" y="149" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="160" font-size="11">9</text>
<rect x="320" y="162" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="173" font-size="11">10</text>
<rect x="320" y="175" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="186" font-size="11">11</text>
<rect x="320" y="188" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="199" font-size="11">12</text>
<rect x="320" y="201" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="212" font-size="11">13</text>
<rect x="320" y="214" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="225" font-size="11">14</text>
<rect x="320" y="227" width="240" height="13" fill="none" stroke="currentColor"/><text x="572" y="238" font-size="11">15</text>
<line x1="245" y1="85" x2="316" y2="103" stroke="currentColor" stroke-width="1.4"/>
<polygon points="308,98 318,104 307,106"/>
<text x="320" y="260" font-size="12">each line: 16 entries of 4 bytes, indistinguishable to the spy</text>
</svg>
<figcaption>Figure 17.3. Why a T-table lookup leaks half of each key byte. The cache line number is the top nibble of p ⊕ k; the attacker knows p, so the line gives the top nibble of k.</figcaption>
</figure>

**Noise from the other lookups.** One encryption makes 160 T-table lookups,
about 36 of them in table T0 (OpenSSL's last round used a separate table).
The spy cannot tell which lookup touched a line, only that some lookup did.
The other 35 lookups touch effectively random lines, so a given line escapes
all of them with probability

$$
\left(\tfrac{15}{16}\right)^{35} \approx 0.105 .
$$

So a wrong guess for $k_0 \gg 4$ predicts a line that was touched about 90
percent of the time anyway, while the right guess predicts a line touched
every time. The gap is ten percentage points per encryption. A few hundred
encryptions separate them clearly.

**Code it.** A simulated Prime+Probe on T0's sixteen lines, with 5 percent of
readings wrong, scoring the 16 guesses for the top nibble of $k_0$:

```python
import random

rng = random.Random(2005)
K0 = 0x6B                     # the victim's first key byte (secret)
ACCESSES = 36                 # other lookups in table T0 during one encryption

def encrypt_and_probe(p0):
    """Prime+Probe on T0's 16 cache lines: which lines did one encryption use?"""
    touched = {(p0 ^ K0) >> 4}                 # round 1: index p0 xor k0
    for _ in range(ACCESSES - 1):              # rounds 1 to 10: other lookups,
        touched.add(rng.randrange(16))         # which look random to the spy
    seen = set()
    for line in range(16):                     # the spy times its own lines
        if (line in touched) != (rng.random() < 0.05):   # 5% wrong readings
            seen.add(line)
    return seen

# For each guess of the key's high nibble, how often was the predicted line used?
hits = [0] * 16
RUNS = 1000
for _ in range(RUNS):
    p0 = rng.randrange(256)
    seen = encrypt_and_probe(p0)
    for guess in range(16):
        if (p0 >> 4) ^ guess in seen:
            hits[guess] += 1
for guess in sorted(range(16), key=lambda g: -hits[g])[:4]:
    print("high nibble", hex(guess), "line used in", hits[guess], "of", RUNS)
print("true high nibble", hex(K0 >> 4))
```

It prints:

```
high nibble 0x6 line used in 954 of 1000
high nibble 0x3 line used in 877 of 1000
high nibble 0xc line used in 865 of 1000
high nibble 0x8 line used in 864 of 1000
true high nibble 0x6
```

The right nibble scores 954, near the 95 percent that the error rate allows;
the wrong ones cluster around 86 percent, near the predicted
$0.95 \times 0.895 + 0.05 \times 0.105 \approx 0.86$. The same loop for each
of the 16 bytes (with T1, T2, T3 for the other rows) gives 64 key bits.

**Bernstein's version: no spy process at all.** In April 2005 Daniel J.
Bernstein published an attack that needed only the time of each encryption,
measured over a network. The T-table lookups make the total time depend
slightly on which lines were already cached, and so on each $x_i = p_i \oplus
k_i$. Bernstein first ran a copy of the server with a key he knew, $k'$, and
for each byte position $i$ and each byte value $u$ recorded the average time
$\tau_i(u)$ of encryptions with $p_i = u$. Against the target he recorded
$\tau^*_i(u)$ the same way. If the timing depends only on the index $x_i$,
then

$$
\tau^*_i(u) \approx \tau_i(u \oplus k_i \oplus k'_i) ,
$$

the same profile shifted by $k_i \oplus k'_i$. He tried all 256 shifts
$\delta$, kept those for which $\sum_u \tau^*_i(u)\, \tau_i(u \oplus \delta)$
was largest, and so narrowed each key byte to a few candidates. It took a very
large number of timed packets (the paper reports runs of many millions) on a
quiet local network, and it worked against OpenSSL's AES. The paper's lesson
was blunter than the attack: a table lookup indexed by a secret is a leak,
whatever the cache does, and software had to stop doing it.

Osvik, Shamir and Tromer's paper, presented at the RSA conference's
cryptographers' track in February 2006, did the same with a spy process and
far less data: against Linux's disk encryption (dm-crypt) they recovered a
full AES key from 800 write operations, 65 milliseconds of measurement,
followed by a few seconds of analysis.

!!! note "Life story: the T-table cache attacks"
    **Born:** 2005, Daniel J. Bernstein ("Cache-timing attacks on AES") and
    Dag Arne Osvik, Adi Shamir and Eran Tromer ("Cache Attacks and
    Countermeasures: the Case of AES", CT-RSA 2006) · **Purpose:** to recover
    AES keys from the cache lines that secret-indexed table lookups touch ·
    **Helped:** AES-NI instructions (Intel, 2010), bitsliced and
    constant-time software AES, and the rule that secrets never become memory
    addresses · **Status:** fixed where hardware AES or constant-time code is
    used; table-based AES still turns up in embedded libraries

## 17.6 Power: from one trace to differential power analysis

*Level: intermediate.*

A chip draws its current from outside. Put a small resistor, ten ohms or so,
in the supply line, connect an oscilloscope across it, and every clock cycle
of the computation becomes a few samples of voltage: a **trace**. A smart
card running AES gives a trace of tens of thousands of samples, and the
attacker can record one per encryption for as long as the card keeps
answering. Book 1 shows the bench (§18.4). Here is how the attacker reads
what comes off it.

**Simple power analysis (SPA)** reads one trace by eye, or by pattern
matching. It works when the sequence of operations depends on the key and the
operations look different. Square and multiply is the textbook case
(Figure 17.4): a squaring and a multiplication take different times and use
different parts of the chip, so their shapes differ, and the exponent can be
read off left to right. Kocher, Jaffe and Jun showed DES key-schedule rotations
and RSA exponents read this way in 1998, and SPA is still how an evaluator
starts on a new chip: find the rounds, find the loops, find anything whose
shape depends on a secret.

The attacker's skill in SPA is alignment and interpretation. Real traces are
not cartoons. The attacker first finds the repeated structure (sixteen DES
rounds, ten AES rounds, 2,048 iterations of an exponent loop) by looking for
a pattern that repeats, then cuts the trace into iterations and classifies
each by its shape, often by correlating it with a template of a known
squaring and a known multiplication. A key-dependent branch that changes the
length of an iteration by a single clock cycle is enough.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="A drawn power trace of square and multiply: low single humps are squarings, taller notched humps are multiplications; reading S M as 1 and a lone S as 0 gives the bits 1101001" fill="currentColor" font-size="14">
<polyline points="20,150 30,150 35,131 40,115 45,104 50,100 55,104 60,115 65,131 70,150 72,150 76,150 81,126 86,104 91,88 96,93 101,90 106,81 111,94 116,112 121,135 126,150 130,150 135,131 140,115 145,104 150,100 155,104 160,115 165,131 170,150 172,150 176,150 181,126 186,104 191,88 196,93 201,90 206,81 211,94 216,112 221,135 226,150 230,150 235,131 240,115 245,104 250,100 255,104 260,115 265,131 270,150 272,150 276,150 281,131 286,115 291,104 296,100 301,104 306,115 311,131 316,150 318,150 322,150 327,126 332,104 337,88 342,93 347,90 352,81 357,94 362,112 367,135 372,150 376,150 381,131 386,115 391,104 396,100 401,104 406,115 411,131 416,150 418,150 422,150 427,131 432,115 437,104 442,100 447,104 452,115 457,131 462,150 464,150 468,150 473,131 478,115 483,104 488,100 493,104 498,115 503,131 508,150 510,150 514,150 519,126 524,104 529,88 534,93 539,90 544,81 549,94 554,112 559,135 564,150 578,150" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="50" y="178" text-anchor="middle" font-size="13">S</text>
<text x="100" y="178" text-anchor="middle" font-size="13" font-weight="bold">M</text>
<text x="150" y="178" text-anchor="middle" font-size="13">S</text>
<text x="200" y="178" text-anchor="middle" font-size="13" font-weight="bold">M</text>
<text x="250" y="178" text-anchor="middle" font-size="13">S</text>
<text x="296" y="178" text-anchor="middle" font-size="13">S</text>
<text x="346" y="178" text-anchor="middle" font-size="13" font-weight="bold">M</text>
<text x="396" y="178" text-anchor="middle" font-size="13">S</text>
<text x="442" y="178" text-anchor="middle" font-size="13">S</text>
<text x="488" y="178" text-anchor="middle" font-size="13">S</text>
<text x="538" y="178" text-anchor="middle" font-size="13" font-weight="bold">M</text>
<line x1="30" y1="192" x2="124" y2="192" stroke="currentColor" stroke-width="1"/>
<text x="77" y="212" text-anchor="middle" font-weight="bold">1</text>
<line x1="130" y1="192" x2="224" y2="192" stroke="currentColor" stroke-width="1"/>
<text x="177" y="212" text-anchor="middle" font-weight="bold">1</text>
<line x1="230" y1="192" x2="270" y2="192" stroke="currentColor" stroke-width="1"/>
<text x="250" y="212" text-anchor="middle" font-weight="bold">0</text>
<line x1="276" y1="192" x2="370" y2="192" stroke="currentColor" stroke-width="1"/>
<text x="323" y="212" text-anchor="middle" font-weight="bold">1</text>
<line x1="376" y1="192" x2="416" y2="192" stroke="currentColor" stroke-width="1"/>
<text x="396" y="212" text-anchor="middle" font-weight="bold">0</text>
<line x1="422" y1="192" x2="462" y2="192" stroke="currentColor" stroke-width="1"/>
<text x="442" y="212" text-anchor="middle" font-weight="bold">0</text>
<line x1="468" y1="192" x2="562" y2="192" stroke="currentColor" stroke-width="1"/>
<text x="515" y="212" text-anchor="middle" font-weight="bold">1</text>
<text x="20" y="30" font-size="12">power</text>
<text x="20" y="245" font-size="12" opacity="0.85">Drawn, not measured: a squaring (S) and a multiplication (M) leave different shapes; SM is a 1 bit, a lone S a 0 bit.</text>
</svg>
<figcaption>Figure 17.4. Simple power analysis reads a single trace. Once the attacker knows which shape is which operation, the exponent 1101001 is written on the screen; no statistics needed.</figcaption>
</figure>

SPA fails once every iteration does the same thing: a Montgomery ladder, a
"square and always multiply", or AES, whose operations never depend on the
key at all. The key bytes still pass through the chip, though, and they still
change the current a little. That small change is invisible in one trace,
buried in noise thousands of times larger. Statistics digs it out.

**Differential power analysis (DPA).** Paul Kocher, Joshua Jaffe and Benjamin
Jun, at Cryptography Research in San Francisco, described it in 1998 and
published it at CRYPTO 1999. Their attack on DES used one bit of the output
of one S-box in the first round, which depends on six key bits. Here is the
same idea on AES, as an attacker would do it today.

<div class="mars-steps" markdown>

1. Record $N$ traces $t_1, \dots, t_N$ of the first round with known random plaintexts. Let $p_i$ be the first plaintext byte of encryption $i$; the target is $v_i = S(p_i \oplus k)$ for the first key byte $k$.
2. For a guess $g$, compute the **selection bit** $b_i(g) = $ the lowest bit of $S(p_i \oplus g)$.
3. Split the traces in two piles by $b_i(g)$ and take the mean trace of each pile, sample by sample.
4. Subtract: $\Delta_g(j) = \overline{t(j)}\,\big|_{b=1} - \overline{t(j)}\,\big|_{b=0}$ at every time sample $j$.
5. Do it for all 256 guesses. The right guess has a spike where the chip handles $v$; the wrong guesses stay flat.

</div>

**Why it works.** Under the right guess, the piles really do differ in one bit
of the value the chip computed at sample $j^*$. If the power there is the
Hamming weight of $v$ plus noise, the pile with bit 1 has a mean higher by
exactly 1 (one more 1 bit on average, the other seven bits averaging the same
in both piles). Under a wrong guess $g$, the bit of $S(p \oplus g)$ is nearly
independent of the bit of $S(p \oplus k)$, because the S-box scrambles, so the
piles are random halves and their means agree up to noise:

$$
\Delta_k(j^*) \approx \varepsilon, \qquad \Delta_g(j^*) \approx 0 \pm \sigma \sqrt{4/N},
$$

where $\varepsilon$ is the leak of one bit and $\sigma$ the standard deviation
of a sample. Everything outside $j^*$ is noise for every guess. The
difference of means grows like a constant while its noise shrinks like
$1/\sqrt N$, so with enough traces the right guess always wins.

**Code it.** A simulated device: each trace has 24 samples of Gaussian noise
with standard deviation 2; at sample 6 the chip loads the plaintext byte
(power $\mathrm{HW}(p)$), at sample 11 it XORs the key in
($\mathrm{HW}(p \oplus k)$), at sample 17 it computes the S-box
($\mathrm{HW}(S(p \oplus k))$). The AES S-box is built from its definition, as
in book 1 [Chapter 7](../../book/07-AES.md), and checked against two entries of
FIPS 197.

```python
import random

def xtime(a):                       # multiply by x in GF(2^8)
    return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

def build_sbox():                   # the AES S-box: inverse, then the affine map
    exp, log, a = [0] * 255, [0] * 256, 1
    for i in range(255):
        exp[i], log[a] = a, i
        a ^= xtime(a)               # multiply by 3, a generator
    box = []
    for x in range(256):
        b = exp[(255 - log[x]) % 255] if x else 0
        s = b
        for i in range(1, 5):
            s ^= ((b << i) | (b >> (8 - i))) & 0xFF
        box.append(s ^ 0x63)
    return box

S = build_sbox()
HW = [bin(v).count("1") for v in range(256)]
print(hex(S[0x00]), hex(S[0x53]))   # 0x63 0xed, as in FIPS 197

rng = random.Random(1999)
KEY, TRACES, SAMPLES = 0xA7, 1000, 24

def trace(p):                       # one simulated power trace of 24 samples
    t = [rng.gauss(0, 2) for _ in range(SAMPLES)]
    t[6] += HW[p]                   # the plaintext byte is loaded
    t[11] += HW[p ^ KEY]            # AddRoundKey
    t[17] += HW[S[p ^ KEY]]         # SubBytes: the point DPA aims at
    return t

plain = [rng.randrange(256) for _ in range(TRACES)]
traces = [trace(p) for p in plain]

def dpa(g):                         # Kocher's difference of means, bit 0
    ones = [t for p, t in zip(plain, traces) if S[p ^ g] & 1]
    zeros = [t for p, t in zip(plain, traces) if not S[p ^ g] & 1]
    return [sum(t[j] for t in ones) / len(ones) - sum(t[j] for t in zeros) / len(zeros)
            for j in range(SAMPLES)]

peaks = sorted(((max(abs(d) for d in dpa(g)), g) for g in range(256)), reverse=True)
for height, g in peaks[:4]:
    print(hex(g), round(height, 2))
best = dpa(peaks[0][1])
print("peak at sample", max(range(SAMPLES), key=lambda j: abs(best[j])))
```

It prints:

```
0x63 0xed
0xa7 0.98
0xcc 0.75
0xb8 0.69
0x3e 0.68
peak at sample 17
```

The right byte wins with a peak of 0.98, close to the predicted 1, at sample
17, the S-box. But the margin over the best wrong guess is not large, and
with 400 traces instead of 1,000 the same program ranks a wrong guess first.
Two things are wasted. The selection bit uses one bit of $v$ and treats the
other seven as noise; and the 255 wrong guesses each get 24 chances to show a
large chance difference, so the largest of them, $255 \times 24$ draws from
the noise, sits well above a typical one. A better distinguisher uses all
eight bits.

!!! note "Life story: differential power analysis"
    **Born:** 1998, Paul Kocher, Joshua Jaffe and Benjamin Jun, Cryptography
    Research, San Francisco; published at CRYPTO 1999 · **Purpose:** to
    extract keys from devices whose single traces show nothing, by averaging
    many traces split by a predicted bit · **Helped:** made power analysis
    a required part of smart-card certification, created the countermeasure
    industry (masking, hiding) and, through Cryptography Research's patents,
    a licensing business that Rambus bought in 2011 · **Status:** the
    difference of means is the ancestor of every statistical side-channel
    attack; correlation and profiled attacks have replaced it in practice

## 17.7 The correlation power attack

*Level: expert.*

In 2004 Éric Brier, Christophe Clavier and Francis Olivier, at the smart-card
maker Gemplus, replaced the one-bit selection with a full leakage model and
the difference of means with Pearson's correlation coefficient. Their
**correlation power analysis** (CPA) is the attack most evaluators run first
today.

**The statistic.** For a guess $g$ the model predicts
$h_i(g) = \mathrm{HW}(S(p_i \oplus g))$ for each trace. At each time sample
$j$, compute the sample correlation between the predictions and the
measurements:

$$
\hat\rho_g(j) = \frac{\sum_i \big(h_i(g) - \bar h(g)\big)\big(t_i(j) - \bar t(j)\big)}
{\sqrt{\sum_i \big(h_i(g) - \bar h(g)\big)^2 \;\sum_i \big(t_i(j) - \bar t(j)\big)^2}} .
$$

The guess with the largest $|\hat\rho_g(j)|$ over all $j$ is the key byte, and
the $j$ where it peaks is when the chip computes the S-box.

**What the right guess should score.** Suppose the sample at $j^*$ is
$t = a\,\mathrm{HW}(v) + n$ with noise $n$ of variance $\sigma^2$
independent of $v$. For uniformly random $v$, $\mathrm{HW}(v)$ has mean 4 and
variance $8 \cdot \tfrac14 = 2$. Then, for the right guess,

$$
\rho = \frac{a \operatorname{Var}(\mathrm{HW})}{\sqrt{\operatorname{Var}(\mathrm{HW}) \,\big(a^2 \operatorname{Var}(\mathrm{HW}) + \sigma^2\big)}}
= \frac{1}{\sqrt{1 + 1/\mathrm{SNR}}},
\qquad \mathrm{SNR} = \frac{2a^2}{\sigma^2}.
$$

The **signal-to-noise ratio** is the variance the key-dependent value causes
divided by the variance of everything else. In the simulation, $a = 1$ and
$\sigma = 2$, so $\mathrm{SNR} = 0.5$ and $\rho = 1/\sqrt 3 \approx 0.577$.
For a wrong guess the predictions are nearly independent of the
measurements and $\hat\rho$ is about normal with mean 0 and standard deviation
$1/\sqrt N$. Real chips are worse: the model is approximate, so $a$ is
smaller than the full leak, and other activity adds to $\sigma$. Correlations
of 0.01 to 0.1 are typical for a protected chip, and the arithmetic below
shows what that costs.

**Code it.** The same simulated device as for DPA, now with 300 traces. The
program ranks all 256 guesses, prints the correlation curve of the winner
across the 24 samples, and then asks how many traces the attack really needs.

```python
import random

def xtime(a):                       # multiply by x in GF(2^8)
    return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

def build_sbox():                   # the AES S-box: inverse, then the affine map
    exp, log, a = [0] * 255, [0] * 256, 1
    for i in range(255):
        exp[i], log[a] = a, i
        a ^= xtime(a)
    box = []
    for x in range(256):
        b = exp[(255 - log[x]) % 255] if x else 0
        s = b
        for i in range(1, 5):
            s ^= ((b << i) | (b >> (8 - i))) & 0xFF
        box.append(s ^ 0x63)
    return box

S = build_sbox()
HW = [bin(v).count("1") for v in range(256)]
rng = random.Random(2004)
KEY, TRACES, SAMPLES = 0xA7, 300, 24

def trace(p):                       # the same simulated device as for DPA
    t = [rng.gauss(0, 2) for _ in range(SAMPLES)]
    t[6] += HW[p]
    t[11] += HW[p ^ KEY]
    t[17] += HW[S[p ^ KEY]]
    return t

plain = [rng.randrange(256) for _ in range(TRACES)]
traces = [trace(p) for p in plain]

def pearson(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return sxy / (sxx * syy) ** 0.5

columns = [[t[j] for t in traces] for j in range(SAMPLES)]

def curve(g):                       # correlation of the model with every sample
    model = [HW[S[p ^ g]] for p in plain]
    return [pearson(model, col) for col in columns]

results = sorted(((max(abs(r) for r in curve(g)), g) for g in range(256)), reverse=True)
for height, g in results[:4]:
    print(hex(g), round(height, 3))
print("correlation curve for", hex(results[0][1]))
for j, r in enumerate(curve(results[0][1])):
    print(f"{j:2d} {r:+.2f} " + "#" * round(abs(r) * 40))

# How many traces? Repeat the attack on fresh traces, at the known sample 17.
for n in (20, 40, 80, 160):
    wins = 0
    for run in range(25):
        ps = [rng.randrange(256) for _ in range(n)]
        leak = [HW[S[p ^ KEY]] + rng.gauss(0, 2) for p in ps]
        best = max(range(256), key=lambda g: pearson([HW[S[p ^ g]] for p in ps], leak))
        wins += best == KEY
    print(n, "traces: right key in", wins, "of 25 runs")
```

It prints:

```
0xa7 0.569
0x53 0.247
0x32 0.23
0x24 0.224
correlation curve for 0xa7
 0 -0.08 ###
 1 +0.00 
 2 -0.06 ##
 3 -0.01 
 4 +0.00 
 5 -0.00 
 6 -0.08 ###
 7 -0.06 ###
 8 -0.01 #
 9 -0.01 
10 -0.02 #
11 -0.02 #
12 +0.01 
13 +0.01 
14 +0.05 ##
15 -0.01 #
16 +0.01 
17 +0.57 #######################
18 +0.05 ##
19 +0.01 #
20 -0.02 #
21 -0.05 ##
22 +0.00 
23 +0.10 ####
```

and then:

```
20 traces: right key in 8 of 25 runs
40 traces: right key in 23 of 25 runs
80 traces: right key in 25 of 25 runs
160 traces: right key in 25 of 25 runs
```

With fewer than a third of DPA's traces, the right guess scores 0.569, the
theory's 0.577 within noise, and the best wrong guess 0.247. The curve is
flat to within about $\pm 2/\sqrt{300} \approx \pm 0.12$ everywhere except
sample 17. Notice what is **not** there: the plaintext load at sample 6 and
the key addition at sample 11 leak just as strongly as the S-box, but they do
not correlate with the S-box model, so the curve ignores them. The model picks
both the key and the moment.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Correlation curve for the right key guess 0xA7 across 24 time samples: near zero everywhere except a spike of 0.57 at sample 17, where the S-box output is computed; dashed lines mark the noise band for 300 traces" fill="currentColor" font-size="14">
<line x1="60" y1="170" x2="603" y2="170" stroke="currentColor" stroke-width="1.2"/>
<line x1="60" y1="30" x2="60" y2="230" stroke="currentColor" stroke-width="1.2"/>
<line x1="56" y1="60" x2="60" y2="60" stroke="currentColor"/><text x="52" y="64" text-anchor="end" font-size="12">+0.5</text>
<line x1="56" y1="115" x2="60" y2="115" stroke="currentColor"/><text x="52" y="119" text-anchor="end" font-size="12">+0.25</text>
<line x1="56" y1="225" x2="60" y2="225" stroke="currentColor"/><text x="52" y="229" text-anchor="end" font-size="12">−0.25</text>
<text x="52" y="174" text-anchor="end" font-size="12">0</text>
<line x1="60" y1="145" x2="598" y2="145" stroke="currentColor" stroke-dasharray="4 3" opacity="0.6"/>
<line x1="60" y1="195" x2="598" y2="195" stroke="currentColor" stroke-dasharray="4 3" opacity="0.6"/>
<rect x="73" y="170.0" width="16" height="17.6" opacity="0.55"/>
<rect x="95" y="170.0" width="16" height="0.8" opacity="0.55"/>
<rect x="117" y="170.0" width="16" height="13.2" opacity="0.55"/>
<rect x="139" y="170.0" width="16" height="2.2" opacity="0.55"/>
<rect x="161" y="170.0" width="16" height="0.8" opacity="0.55"/>
<rect x="183" y="170.0" width="16" height="0.8" opacity="0.55"/>
<rect x="205" y="170.0" width="16" height="17.6" opacity="0.55"/>
<rect x="227" y="170.0" width="16" height="13.2" opacity="0.55"/>
<rect x="249" y="170.0" width="16" height="2.2" opacity="0.55"/>
<rect x="271" y="170.0" width="16" height="2.2" opacity="0.55"/>
<rect x="293" y="170.0" width="16" height="4.4" opacity="0.55"/>
<rect x="315" y="170.0" width="16" height="4.4" opacity="0.55"/>
<rect x="337" y="167.8" width="16" height="2.2" opacity="0.55"/>
<rect x="359" y="167.8" width="16" height="2.2" opacity="0.55"/>
<rect x="381" y="159.0" width="16" height="11.0" opacity="0.55"/>
<rect x="403" y="170.0" width="16" height="2.2" opacity="0.55"/>
<rect x="425" y="167.8" width="16" height="2.2" opacity="0.55"/>
<rect x="447" y="44.6" width="16" height="125.4"/>
<rect x="469" y="159.0" width="16" height="11.0" opacity="0.55"/>
<rect x="491" y="167.8" width="16" height="2.2" opacity="0.55"/>
<rect x="513" y="170.0" width="16" height="4.4" opacity="0.55"/>
<rect x="535" y="170.0" width="16" height="11.0" opacity="0.55"/>
<rect x="557" y="170.0" width="16" height="0.8" opacity="0.55"/>
<rect x="579" y="148.0" width="16" height="22.0" opacity="0.55"/>
<text x="81" y="250" text-anchor="middle" font-size="11">0</text>
<text x="125" y="250" text-anchor="middle" font-size="11">2</text>
<text x="169" y="250" text-anchor="middle" font-size="11">4</text>
<text x="213" y="250" text-anchor="middle" font-size="11">6</text>
<text x="257" y="250" text-anchor="middle" font-size="11">8</text>
<text x="301" y="250" text-anchor="middle" font-size="11">10</text>
<text x="345" y="250" text-anchor="middle" font-size="11">12</text>
<text x="389" y="250" text-anchor="middle" font-size="11">14</text>
<text x="433" y="250" text-anchor="middle" font-size="11">16</text>
<text x="477" y="250" text-anchor="middle" font-size="11">18</text>
<text x="521" y="250" text-anchor="middle" font-size="11">20</text>
<text x="565" y="250" text-anchor="middle" font-size="11">22</text>
<text x="455" y="250" text-anchor="middle" font-size="11" font-weight="bold">17</text>
<text x="455" y="37" text-anchor="middle" font-size="12" font-weight="bold">0.57</text>
<text x="334" y="270" text-anchor="middle" font-size="12">time sample</text>
<text x="202" y="208" font-size="11" opacity="0.8">plaintext load (6) and AddRoundKey (11) do not fit this model</text>
<text x="610" y="141" font-size="11">±2/√300</text>
</svg>
<figcaption>Figure 17.5. The correlation curve the code prints for the right guess, 0xA7. The spike says both which key byte is right and when the chip computes the S-box; the dashed band, ±2/√N, is where pure noise falls about 95 percent of the time.</figcaption>
</figure>

**How many traces, in theory.** For the right guess the sample correlation
$\hat\rho$ is not normal for small $N$, but Fisher's transformation
$z = \tfrac12 \ln\frac{1 + \hat\rho}{1 - \hat\rho}$ is close to normal with
standard deviation $1/\sqrt{N - 3}$. To tell a true correlation $\rho$ from 0
with error probability $\alpha$ (one-sided quantile $z_{1-\alpha}$), the two
must be about $2 z_{1-\alpha}$ standard deviations apart in $z$-space, which
gives the rule of thumb of Stefan Mangard and his coauthors:

$$
N \approx 3 + 8\,\frac{z_{1-\alpha}^2}{\ln^2 \dfrac{1 + \rho}{1 - \rho}} .
$$

For $\rho \approx 0.577$ and $\alpha = 10^{-4}$ ($z = 3.72$), $N \approx 3 +
8 \cdot 13.8 / 1.73 \approx 67$, which matches the experiment: 40 traces win
most of the time, 80 always. For small $\rho$, $\ln\frac{1+\rho}{1-\rho}
\approx 2\rho$ and

$$
N \approx \frac{2 z_{1-\alpha}^2}{\rho^2} \approx \frac{28}{\rho^2} .
$$

The number of traces goes as $1/\rho^2$, and for small SNR,
$\rho^2 \approx \mathrm{SNR}$. Halve the signal or double the noise's standard
deviation and the attacker needs four times the traces. A chip with
$\rho = 0.01$ costs about 280,000 traces per byte; with $\rho = 0.001$, 28
million. Those are the numbers countermeasures are designed to move.

**Ghost peaks and better models.** The second-best guesses are not random:
some wrong guesses $g$ give $S(p \oplus g)$ whose Hamming weight correlates
with that of $S(p \oplus k)$ a little more than chance. These **ghost peaks**
are a property of the S-box and the key, and for a weak signal they can win.
The fix is more traces, or a better model. Hardware that holds the S-box
output in a register leaks the **Hamming distance** between the old and new
contents, $\mathrm{HW}(v_{\text{old}} \oplus v_{\text{new}})$, not the weight,
and a CPA with the weight model then finds little. Brier, Clavier and Olivier's
paper was, above all, a paper about choosing the model: the correlation
coefficient is only as good as the prediction it is given. Attacks on AES
hardware often target the last round, where the register goes from the
round-9 state to the ciphertext and the distance between them depends on one
byte of the last round key.

**Sixteen bytes, then done.** The same program on each of the sixteen
plaintext bytes recovers all sixteen key bytes, each from the same traces.
If a few bytes stay ambiguous, the attacker keeps the top few guesses for
each and searches their combinations against one known plaintext and
ciphertext pair; **key enumeration** and **rank estimation** algorithms do
this efficiently and tell the evaluator how far from the top the real key
sits (§17.15).

!!! note "Life story: the correlation power attack"
    **Born:** 2004, Éric Brier, Christophe Clavier and Francis Olivier at
    Gemplus, "Correlation Power Analysis with a Leakage Model" (CHES 2004) ·
    **Purpose:** to use the whole leakage of a value, through a Hamming weight
    or Hamming distance model and Pearson's correlation, instead of one
    selected bit · **Helped:** became the standard first attack in
    evaluation labs; in 2017 Eyal Ronen, Adi Shamir, Achi-Or Weingarten and
    Colin O'Flynn used correlation power analysis to extract the global
    AES-CCM key Philips used to protect firmware updates for its Hue smart
    lamps · **Status:** current; profiled and machine-learning attacks
    outperform it on well-protected chips

## 17.8 Electromagnetic leakage

*Level: beginner.*

Every current makes a magnetic field. A small loop of wire held a millimeter
above a chip picks up the field of the currents beneath it, and an amplifier
and the same oscilloscope turn it into traces. In 2001 two groups published
the first such attacks on smart cards: Jean-Jacques Quisquater and David
Samyde in Louvain, and Karine Gandolfi, Christophe Mourtel and Francis Olivier
at Gemplus. Everything in §17.6 and §17.7 works unchanged on the traces.

Electromagnetic (EM) analysis differs from power analysis in where the
attacker can stand:

- **Locality.** A power trace sums the current of the whole chip. A small
  probe sees mostly the part of the die under it: the AES coprocessor and not
  the CPU next to it. Moving the probe across the chip and running a CPA at
  each spot finds the hottest place, and the SNR there can be far higher than
  the power line's.
- **No electrical contact.** The power line of a phone or a security key is
  buried in the board; the field is not. Some attacks need the package opened
  or the plastic ground away; others work through the case.
- **Distance.** At lower frequencies the leak can be picked up from
  centimeters or meters away. Daniel Genkin, Lev Pachmanov, Itamar Pipman and
  Eran Tromer showed in 2015 that a cheap software-defined radio, hidden in a
  piece of pita bread in their demonstration, could pick up enough from a
  laptop to extract a GnuPG key; later work did it through a wall.

The best-known EM attack of recent years is NinjaLab's on the Google Titan
security key, by Thomas Roche, Victor Lomné, Camille Mutschler and Laurent
Imbert (published January 2021, USENIX Security 2021). They opened the key,
placed a probe over its secure element, an NXP A700X chip, recorded EM traces
of several thousand ECDSA signatures, found a nonce-dependent leak in the
scalar multiplication, and recovered the private key with a lattice attack of
the kind in [Chapter 14](14-Attacks-on-Signatures-and-Nonces.md). The attack
needed hours of physical access and expensive equipment, so a stolen key had
to be returned to its owner unnoticed to matter, but the chip was certified,
and the leak was in its cryptographic library.

The old name for this field is TEMPEST, the Cold War program of shielding
equipment against compromising emanations (book 1, §18.1). The new name for
the method is just "side-channel analysis": the statistics do not care where
the trace came from.

!!! note "Life story: electromagnetic analysis"
    **Born:** 2001, Jean-Jacques Quisquater and David Samyde (E-smart 2001)
    and Karine Gandolfi, Christophe Mourtel and Francis Olivier (CHES 2001),
    with roots in the TEMPEST work of the 1950s onward · **Purpose:** to
    measure a chip's leakage from its electromagnetic field, locally and
    without contact · **Helped:** local EM probes and scanning tables are
    standard lab equipment; it extracted the ECDSA key of Google's Titan
    security key in 2021 · **Status:** current; defenses are the same as for
    power (masking, hiding) plus shielding

## 17.9 Differential fault analysis on AES

*Level: expert.*

Watching a chip gives the attacker a noisy view of intermediate values. Making
the chip **compute wrongly** can give an exact one. A fault attack disturbs
the computation at a chosen moment, with a spike or dip in the supply voltage,
a shortened clock cycle, a laser pulse on the die, or an electromagnetic pulse
from a coil, and then compares the faulty output with a correct one. The
Bellcore attack of 1996 needed one wrong RSA-CRT signature to factor the
modulus; it is done in full in [Chapter 13](13-Attacks-on-RSA.md), §13.12, and
book 1 tells its story (§18.7). Within weeks of Bellcore's announcement, Eli Biham
and Adi Shamir asked what faults do to a block cipher (the paper appeared at
CRYPTO 1997), and called the answer
**differential fault analysis** (DFA): the attacker gets pairs of a correct
and a faulty ciphertext of the same plaintext, and the difference between them
is a differential whose input the attacker controls, very close to the end of
the cipher. For AES the cleanest version is Gilles Piret and Jean-Jacques
Quisquater's, presented at CHES 2003.

**The fault model.** The attacker encrypts the same plaintext twice, once
normally and once with a glitch that changes **one byte** of the state
somewhere between the MixColumns of round 8 and the MixColumns of round 9.
Which byte and to what value are unknown; only "one byte" is assumed. In the
code below the glitch hits the state as round 9 begins.

**Following the fault.** Figure 17.6 traces it. Say the fault changes the byte
in row 2, column 0 by $e$. SubBytes turns this into an unknown difference $f$
in the same byte (the S-box is applied to both the right and the wrong value,
and their outputs differ by something that depends on the value). ShiftRows
moves row 2 two places left, into column 2. MixColumns multiplies column 2 by
its matrix, so the single difference becomes four:

$$
\begin{pmatrix} 2&3&1&1\\1&2&3&1\\1&1&2&3\\3&1&1&2 \end{pmatrix}
\begin{pmatrix} 0\\0\\f\\0 \end{pmatrix}
= \begin{pmatrix} f\\3f\\2f\\f \end{pmatrix}
\quad\text{in } \mathrm{GF}(2^8).
$$

AddRoundKey of round 9 leaves differences alone. Round 10 has SubBytes,
ShiftRows and AddRoundKey but no MixColumns, so these four bytes go through
one more S-box each and land, unmixed, in four ciphertext bytes: positions 8,
5, 2 and 15 (column-major numbering). The other twelve ciphertext bytes are
identical in the two runs.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="How a one-byte fault entering round 9 of AES spreads: one byte at row 2 column 0; after SubBytes and ShiftRows it sits in column 2; MixColumns spreads it to the whole column as f, 3f, 2f, f; round 10 SubBytes and ShiftRows send those four bytes to ciphertext positions 8, 5, 2 and 15" fill="currentColor" font-size="14">
<text x="68" y="34" text-anchor="middle" font-size="13" font-weight="bold">round 9 input</text>
<text x="68" y="50" text-anchor="middle" font-size="11">one byte faulty</text>
<rect x="20" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="44" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="68" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="92" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="20" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="44" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="68" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="92" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="20" y="108" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="32.0" y="124" text-anchor="middle" font-size="10" font-weight="bold">e</text>
<rect x="44" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="68" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="92" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="20" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="44" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="68" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="92" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<text x="228" y="34" text-anchor="middle" font-size="13" font-weight="bold">SubBytes, ShiftRows</text>
<text x="228" y="50" text-anchor="middle" font-size="11">moved to column 2</text>
<rect x="180" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="204" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="228" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="252" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="180" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="204" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="228" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="252" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="180" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="204" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="228" y="108" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="240.0" y="124" text-anchor="middle" font-size="10" font-weight="bold">f</text>
<rect x="252" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="180" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="204" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="228" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="252" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<text x="388" y="34" text-anchor="middle" font-size="13" font-weight="bold">MixColumns</text>
<text x="388" y="50" text-anchor="middle" font-size="11">whole column</text>
<rect x="340" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="364" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="388" y="60" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="400.0" y="76" text-anchor="middle" font-size="10" font-weight="bold">f</text>
<rect x="412" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="340" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="364" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="388" y="84" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="400.0" y="100" text-anchor="middle" font-size="10" font-weight="bold">3f</text>
<rect x="412" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="340" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="364" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="388" y="108" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="400.0" y="124" text-anchor="middle" font-size="10" font-weight="bold">2f</text>
<rect x="412" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="340" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="364" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="388" y="132" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="400.0" y="148" text-anchor="middle" font-size="10" font-weight="bold">f</text>
<rect x="412" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<text x="548" y="34" text-anchor="middle" font-size="13" font-weight="bold">ciphertext</text>
<text x="548" y="50" text-anchor="middle" font-size="11">bytes 8, 5, 2, 15</text>
<rect x="500" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="524" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="548" y="60" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="560.0" y="76" text-anchor="middle" font-size="10" font-weight="bold">?</text>
<rect x="572" y="60" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="500" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="524" y="84" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="536.0" y="100" text-anchor="middle" font-size="10" font-weight="bold">?</text>
<rect x="548" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="572" y="84" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="500" y="108" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="512.0" y="124" text-anchor="middle" font-size="10" font-weight="bold">?</text>
<rect x="524" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="548" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="572" y="108" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="500" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="524" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="548" y="132" width="24" height="24" fill="none" stroke="currentColor" opacity="0.6"/>
<rect x="572" y="132" width="24" height="24" fill="currentColor" opacity="0.3" stroke="currentColor"/>
<text x="584.0" y="148" text-anchor="middle" font-size="10" font-weight="bold">?</text>
<line x1="124" y1="108" x2="170" y2="108" stroke="currentColor" stroke-width="1.4"/><polygon points="162,103 170,108 162,113"/>
<line x1="284" y1="108" x2="330" y2="108" stroke="currentColor" stroke-width="1.4"/><polygon points="322,103 330,108 322,113"/>
<line x1="444" y1="108" x2="490" y2="108" stroke="currentColor" stroke-width="1.4"/><polygon points="482,103 490,108 482,113"/>
<text x="20" y="190" font-size="12">Each ciphertext difference is an S-box output difference whose input difference is known up to f:</text>
<text x="20" y="212" font-size="12">S⁻¹(Cⱼ ⊕ Kⱼ) ⊕ S⁻¹(C*ⱼ ⊕ Kⱼ) = mⱼ · f, with (m) = (1, 3, 2, 1) for bytes 8, 5, 2, 15.</text>
<text x="20" y="234" font-size="12" opacity="0.85">Round 10 has no MixColumns, so four bytes of the last round key appear in four independent equations.</text>
</svg>
<figcaption>Figure 17.6. The path of a one-byte fault through the last two rounds of AES, as in the code. The fault value e becomes an unknown difference f after the S-box, and MixColumns multiplies it by the column of its matrix.</figcaption>
</figure>

**The equations.** Let $C$ and $C^*$ be the correct and faulty ciphertexts and
$K$ the last round key. Byte $j$ of the state before the last SubBytes is
$S^{-1}(C_j \oplus K_j)$ in the correct run and $S^{-1}(C^*_j \oplus K_j)$ in
the faulty one, and their difference is the MixColumns output difference:

$$
S^{-1}(C_8 \oplus K_8) \oplus S^{-1}(C^*_8 \oplus K_8) = f, \qquad
S^{-1}(C_5 \oplus K_5) \oplus S^{-1}(C^*_5 \oplus K_5) = 3f,
$$
$$
S^{-1}(C_2 \oplus K_2) \oplus S^{-1}(C^*_2 \oplus K_2) = 2f, \qquad
S^{-1}(C_{15} \oplus K_{15}) \oplus S^{-1}(C^*_{15} \oplus K_{15}) = f.
$$

Five unknowns: four key bytes and $f$. The attacker sees which four
ciphertext bytes changed, which tells it the column after MixColumns but not
the row the fault came from, so the coefficients are one of the four columns
of the matrix: $(2,1,1,3)$, $(3,2,1,1)$, $(1,3,2,1)$ or $(1,1,3,2)$.

**Counting the solutions.** For one byte with known $C_j$ and $C^*_j$, as
$K_j$ runs through its 256 values the left side takes 127 distinct values: 126
of them for exactly two keys each, one for four. This is the AES S-box's
difference table at work, the same table differential cryptanalysis uses
([Chapter 5](05-Differential-Cryptanalysis.md)), with its maximum entry of 4.
So for a given right-hand side, an equation has no solution about half the
time and otherwise two (rarely four), about one on average. For each of the
$4 \times 255$ choices of row and $f$, the four bytes then have about one
joint solution on average. One fault leaves about a thousand candidates for
four key bytes, down from $2^{32}$. A second fault in the same column leaves
another independent set of about a thousand, and a wrong 4-tuple lands in both
with probability about $1000/2^{32}$; the intersection is the key. Two faults
per column, eight in all, give the whole last round key, and the AES key
schedule runs backwards from any round key to the cipher key.

**By hand, one byte.** In the run below the first fault changes byte 2 of the
round-9 input by $e = \texttt{08}$. The ciphertext bytes at position 8 are
$C_8 = \texttt{e0}$ and $C^*_8 = \texttt{6d}$. The true $f$ is $\texttt{f9}$
(the attacker does not know this; it tries all 255). The keys with
$S^{-1}(\texttt{e0} \oplus K_8) \oplus S^{-1}(\texttt{6d} \oplus K_8) =
\texttt{f9}$ are exactly two, $K_8 \in \{\texttt{6c}, \texttt{e1}\}$, and
the real last-round key byte is $\texttt{e1}$. The other three equations, with
$3f = \texttt{10}$, $2f = \texttt{e9}$ and $f = \texttt{f9}$, likewise have
two solutions each, so for the right row and the right $f$ there are
$2^4 = 16$ candidates; over all rows and values of $f$ the code counts 1,232.

**Code it.** A plain AES-128, checked against the FIPS 197 example; a victim
whose round 9 can be glitched; the attack, using pairs of correct and faulty
ciphertexts until each column has a single survivor; and the key schedule run
backwards.

```python
import random

def xtime(a):
    return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

def mul(a, b):                      # multiply in GF(2^8)
    r = 0
    while b:
        if b & 1:
            r ^= a
        a, b = xtime(a), b >> 1
    return r

def build_sbox():
    exp, log, a = [0] * 255, [0] * 256, 1
    for i in range(255):
        exp[i], log[a] = a, i
        a ^= xtime(a)
    box = []
    for x in range(256):
        b = exp[(255 - log[x]) % 255] if x else 0
        s = b
        for i in range(1, 5):
            s ^= ((b << i) | (b >> (8 - i))) & 0xFF
        box.append(s ^ 0x63)
    return box

S = build_sbox()
INV = [0] * 256
for x in range(256):
    INV[S[x]] = x

def expand(key):                    # AES-128 key schedule: 11 round keys
    w = [list(key[4 * i:4 * i + 4]) for i in range(4)]
    rc = 1
    for i in range(4, 44):
        t = w[i - 1][:]
        if i % 4 == 0:
            t = [S[b] for b in t[1:] + t[:1]]
            t[0] ^= rc
            rc = xtime(rc)
        w.append([a ^ b for a, b in zip(w[i - 4], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(11)]

def shift_rows(s):                  # state is column by column: s[row + 4*col]
    return [s[r + 4 * ((c + r) % 4)] for c in range(4) for r in range(4)]

def mix_columns(s):
    out = []
    for c in range(4):
        a = s[4 * c:4 * c + 4]
        for r in range(4):
            out.append(mul(a[r], 2) ^ mul(a[(r + 1) % 4], 3) ^ a[(r + 2) % 4] ^ a[(r + 3) % 4])
    return out

def encrypt(block, keys, fault=None):
    s = [b ^ k for b, k in zip(block, keys[0])]
    for rnd in range(1, 11):
        if rnd == 9 and fault:          # a glitch changes one byte entering round 9
            pos, value = fault
            s[pos] ^= value
        s = shift_rows([S[b] for b in s])
        if rnd < 10:
            s = mix_columns(s)
        s = [b ^ k for b, k in zip(s, keys[rnd])]
    return s

keys = expand(bytes(range(16)))
print(bytes(encrypt(bytes.fromhex("00112233445566778899aabbccddeeff"), keys)).hex())

# The victim: a device with a secret key, which we can glitch.
SECRET = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
rk = expand(SECRET)
rng = random.Random(2003)
MIX = [[2, 1, 1, 3], [3, 2, 1, 1], [1, 3, 2, 1], [1, 1, 3, 2]]   # columns of MixColumns

def candidates(c, cf):
    """Last-round key bytes consistent with one faulty ciphertext."""
    pos = [i for i in range(16) if c[i] != cf[i]]      # the four bytes that differ
    # for each byte: the key values k that give each input difference
    table = []
    for p in pos:
        d = {}
        for k in range(256):
            d.setdefault(INV[c[p] ^ k] ^ INV[cf[p] ^ k], []).append(k)
        table.append(d)
    rows = [p % 4 for p in pos]                        # row of each differing byte
    found = set()
    for col in MIX:                                    # the faulty row is unknown
        for f in range(1, 256):                        # so is the fault's value
            options = [table[i].get(mul(col[rows[i]], f), []) for i in range(4)]
            for k0 in options[0]:
                for k1 in options[1]:
                    for k2 in options[2]:
                        for k3 in options[3]:
                            found.add((k0, k1, k2, k3))
    return tuple(pos), found

plain = bytes(rng.randrange(256) for _ in range(16))
good = encrypt(plain, rk)
survivors = {}
faults = 0
while len(survivors) < 4 or any(len(v) > 1 for v in survivors.values()):
    bad = encrypt(plain, rk, fault=(rng.randrange(16), rng.randrange(1, 256)))
    faults += 1
    pos, found = candidates(good, bad)
    survivors[pos] = survivors[pos] & found if pos in survivors else found
    if faults == 1:
        print("first fault: bytes", pos, "leave", len(found), "candidates")

k10 = [0] * 16
for pos, (keyset,) in ((p, tuple(v)) for p, v in survivors.items()):
    for p, k in zip(pos, keyset):
        k10[p] = k
print("faults used:", faults)
print("round-10 key:", bytes(k10).hex(), bytes(k10) == bytes(rk[10]))

# Run the key schedule backwards from round 10 to round 0.
w = [k10[4 * i:4 * i + 4] for i in range(4)]
rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54]
for rnd in range(10, 0, -1):
    prev = [None] * 4
    for i in (3, 2, 1):
        prev[i] = [a ^ b for a, b in zip(w[i], w[i - 1])]
    t = [S[b] for b in prev[3][1:] + prev[3][:1]]
    t[0] ^= rcon[rnd - 1]
    prev[0] = [a ^ b for a, b in zip(w[0], t)]
    w = prev
print("master key:  ", bytes(sum(w, [])).hex())
```

It prints:

```
69c4e0d86a7b0430d8cdb78070b4c55a
first fault: bytes (2, 5, 8, 15) leave 1232 candidates
faults used: 17
round-10 key: d014f9a8c9ee2589e13f0cc8b6630ca6 True
master key:   2b7e151628aed2a6abf7158809cf4f3c
```

The first line is the FIPS 197 test vector, so the AES is right. The key
comes back from 17 glitched encryptions. The ideal is 8, but the glitches here
land on random bytes, and the last column to be hit twice takes a while, the
coupon collector's problem. An attacker with a laser aimed at one region of
the chip, or a precisely timed clock glitch, does better.

**Fewer faults.** Move the fault one round earlier, between the MixColumns of
rounds 7 and 8, and it spreads to a whole column after round 8 and to all
sixteen bytes after round 9. Then one faulty ciphertext gives equations for
all four columns at once, linked through the round-9 MixColumns. Piret and
Quisquater's paper broke AES-128 with two such faulty ciphertexts, and in 2011
Michael Tunstall, Debdeep Mukhopadhyay and Subidh Ali showed that a single
fault, followed by an exhaustive search of about $2^8$ keys, is enough.

**Bigger faults, weaker models.** DFA needs the fault in a window of one
round. Attackers have also used looser models: a fault that sets a byte to
zero, a skipped instruction (skip the last round's key addition, or the loop
counter's check, and the cipher runs fewer rounds), or a fault on the key
schedule. And faults need not come from a probe. In 2017 Adrian Tang, Simha
Sethumadhavan and Salvatore Stolfo (CLKSCREW) pushed an ARM phone's
frequency and voltage controls from software beyond their safe range and
used DFA to take an AES key out of TrustZone; in 2019 Kit Murdock and
coauthors (Plundervolt) undervolted Intel processors from software and faulted
AES-NI and RSA-CRT inside SGX enclaves. The physical attacker's tools had
become software.

**The Mars thread.** A lander on Mars gets fault injection for free. Mars has
no global magnetic field and a thin atmosphere, so galactic cosmic rays and
solar particles reach the surface, and a heavy ion passing through a memory
cell or a register can flip a bit: a **single-event upset**. Spacecraft are
built for this with radiation-hardened parts, error-correcting memory and
redundant computers, because the alternative is a crash. For cryptography the
lesson is sharper than "expect errors". DFA on AES needs a fault in one round
and is unlikely to come from a random particle. The Bellcore attack needs a
fault anywhere in half of an RSA-CRT signature, and a signer that signs
thousands of telemetry packets a day will, over years, sign one wrongly. If
it sends that signature down the link to Earth, anyone who records the link
can factor the key. Verify every signature before it leaves (one cheap
exponentiation with $e = 65537$), and a cosmic ray costs only a retry.

!!! note "Life story: differential fault analysis of AES"
    **Born:** 1997, Eli Biham and Adi Shamir's differential fault analysis of
    DES (CRYPTO 1997); for AES, Gilles Piret and Jean-Jacques Quisquater (CHES
    2003), among several attacks of 2002 and 2003 · **Purpose:** to recover a
    block cipher's key from pairs of correct and faulty ciphertexts, by
    solving the difference equations of the last rounds · **Helped:**
    redundant computation and fault sensors in smart cards; single-fault
    attacks (Tunstall, Mukhopadhyay and Ali, 2011); software-induced versions
    (CLKSCREW 2017, Plundervolt 2019) · **Status:** current; any AES
    implementation that can be glitched and returns faulty ciphertexts is
    exposed

## 17.10 Rowhammer as a weapon

*Level: intermediate.*

A fault attack needs a way to make the hardware compute wrongly. In 2014
Yoongu Kim and colleagues at Carnegie Mellon and Intel showed that ordinary
memory does it to itself. A DRAM chip stores each bit as charge in a tiny
capacitor, arranged in rows; reading a row means activating it, and the cells
leak a little charge each time a neighboring row is activated. The memory
controller refreshes every row every 64 milliseconds, normally in time. But
activate one row hundreds of thousands of times within one refresh window,
and some cells in the rows next to it lose enough charge to flip. Their paper,
"Flipping Bits in Memory Without Accessing Them" (ISCA 2014), found such
**disturbance errors** in most of the DRAM modules they tested, 110 of 129,
from all three major makers.

A fault on demand, from software, is a weapon. The attacker's toolkit:

- **Hammering.** Read two addresses in **aggressor** rows on either side of
  the **victim** row in a tight loop, flushing them from the cache with
  `clflush` after each read so every read reaches DRAM. "Double-sided"
  hammering, from both sides, flips far more bits than one side.
- **Finding the rows.** The attacker needs physical addresses, which the
  operating system hides. Early attacks read Linux's `/proc/self/pagemap`
  (since restricted); later ones infer row adjacency from timing, or simply
  hammer a large buffer and look for flips.
- **Memory massaging.** A flip in the attacker's own memory is useless. The
  craft is to get the victim's data placed into a vulnerable row. Mark Seaborn
  and Thomas Dullien of Google Project Zero did it in March 2015 by spraying
  page tables until one landed in a vulnerable row, then flipping a bit in a
  page-table entry so that it pointed to a page table the attacker could
  write: kernel privileges from an unprivileged process.

**Against cryptography.** Kaveh Razavi and colleagues at the Vrije
Universiteit Amsterdam (Flip Feng Shui, USENIX Security 2016) used memory
deduplication, the same page sharing that Flush+Reload exploits, to make a
co-hosted virtual machine's page share physical memory with a page the
attacker had prepared in a vulnerable spot. They then flipped a chosen bit in
the victim's copy of an **RSA public key**: the `authorized_keys` file of an
SSH server, or the GPG key a package manager trusts for updates. The
mathematics after the flip is short. The victim now holds

$$
N' = N \oplus 2^j ,
$$

an ordinary random-looking odd or even number of the same size, not a product
of two large primes. Some such numbers have only small and medium factors,
and the attacker tries flips until one gives an $N'$ it can factor with the
elliptic-curve method ([Chapter 11](11-Factoring.md)), say
$N' = \prod p_i^{a_i}$. Then it computes $\varphi(N') = \prod p_i^{a_i - 1}(p_i - 1)$,
a private exponent $d' = e^{-1} \bmod \varphi(N')$ (when $\gcd(e,
\varphi(N')) = 1$), and signs whatever it likes. The victim checks signatures
against the corrupted key and accepts them. The cryptography did not fail; the
attacker changed which key it was checking against.

Rowhammer can also **read**. Andrew Kwong, Daniel Genkin, Daniel Gruss and
Yuval Yarom's RAMBleed (IEEE S&P 2020) observed that whether a cell in the
attacker's row flips depends on the values of the cells next to it in the
victim's rows, so the attacker's flips leak the victim's bits. They read bits
of an RSA-2048 key out of an OpenSSH server's memory, enough to reconstruct
the key.

**The arms race.** Error-correcting memory turns most single flips into
corrected errors, but enough flips in one word defeat it (ECCploit, 2019).
Manufacturers added "target row refresh" to DRAM chips, which refreshes rows
next to heavily used ones; TRRespass (2020) found access patterns with many
aggressor rows that slip past it. Google's Half-Double (2021) flipped bits two
rows away. For the cryptographer, the defense that does not depend on the
memory is the one from §17.9: check results before releasing them, and keep
trusted keys under an integrity check, a hash pinned somewhere the attacker
cannot flip.

!!! note "Life story: Rowhammer"
    **Born:** 2014, Yoongu Kim, Ross Daly, Jeremie Kim, Chris Fallin, Ji Hye
    Lee, Donghyuk Lee, Chris Wilkerson, Konrad Lai and Onur Mutlu, "Flipping
    Bits in Memory Without Accessing Them" (ISCA 2014) · **Purpose:** first
    a reliability finding about DRAM; from 2015 a software fault-injection
    tool · **Helped:** kernel exploits (Project Zero, 2015), key corruption
    across virtual machines (Flip Feng Shui, 2016), key reading (RAMBleed,
    2019); DRAM makers added target row refresh and newer standards add
    on-chip countermeasures · **Status:** current; each new mitigation has
    been followed by a new access pattern

## 17.11 Spectre as a weapon

*Level: intermediate.*

Cache attacks read which memory the victim touched. Spectre makes the victim
touch memory **the attacker chooses**, including memory the victim's own code
would never read. Book 1 (§18.6) describes the processor's speculation and the
January 2018 disclosure. Here are the attacker's four steps for variant 1,
"bounds check bypass", as Paul Kocher, Jann Horn, Anders Fogh, Daniel Genkin,
Daniel Gruss, Werner Haas, Mike Hamburg, Moritz Lipp, Stefan Mangard, Thomas Prescher,
Michael Schwarz and Yuval Yarom wrote them up.

The attacker needs a **gadget** in the victim's code, a pattern such as:

```c
if (x < array1_size)                  /* the bounds check */
    y = array2[array1[x] * 4096];     /* a load whose address depends on data */
```

where `x` comes from the attacker (an argument to a system call, a field in a
request) and `array2` is memory the attacker can also time, by Flush+Reload
on shared memory or Prime+Probe otherwise.

<div class="mars-steps" markdown>

1. **Train.** Call the code many times with valid `x`. The branch predictor learns that the bounds check is true.
2. **Prepare.** Flush `array2` from the cache, and flush `array1_size` too, so the bounds check must wait for memory.
3. **Trigger.** Call with a malicious `x`, chosen so that `array1 + x` is the address of a secret byte $s$ anywhere in the victim's address space. While `array1_size` is still loading, the processor predicts "in bounds" and runs ahead: it reads $s$ and loads `array2[s * 4096]` into the cache. When the check resolves, the work is thrown away, but the cache line stays.
4. **Reload.** Time a read of `array2[i * 4096]` for each $i$ from 0 to 255. The one fast line is $i = s$.

</div>

The 4096 multiplier spaces the 256 possible lines a page apart, so that the
processor's prefetcher, which guesses neighboring lines, does not cache the
wrong ones. One secret byte per round; repeat for the next address. Variant 2
does the same through an indirect jump whose target prediction the attacker
has poisoned, so the "gadget" can be any code anywhere in the victim. Later
variants trained other predictors: the return stack, store-to-load forwarding.

**Why it matters to cryptographers.** A constant-time library has no secret
branches and no secret addresses; Spectre does not need it to have any. The
gadget can be in other code in the same process, such as a JavaScript engine
running a web page next to a password manager, or a kernel that holds a disk
key. The secret is read by the attacker's choice of `x`, not by the
cryptographic code's own behavior. The attacks on Intel's SGX enclaves in
2018 (SgxPectre, Foreshadow) read keys that the enclave was designed to keep
from the operating system. So the defenses are of a different kind: keep
secrets in a separate process or address space (browser site isolation),
stop speculation at sensitive branches (fences, masking indices so an
out-of-bounds `x` cannot form a wild address), and newer hardware that tags
predictor state by privilege. Research on **speculative constant time**
(Sunjay Cauligi and colleagues, 2020) asks what it means for code to be safe
when the processor may run paths it never takes.

!!! note "Life story: Spectre (the attacker's tool)"
    **Born:** found independently in 2017 by Jann Horn of Google Project Zero
    and by Paul Kocher with collaborators at Graz, Pennsylvania, Maryland,
    Adelaide and elsewhere; disclosed 3 January 2018; paper at IEEE S&P 2019
    · **Purpose:** to make a victim's processor read attacker-chosen memory
    during speculation and leave the value in the cache · **Helped:** site
    isolation in browsers, speculation barriers in compilers and kernels, a
    decade of processor redesign, and the study of speculative constant time
    · **Status:** a family still growing; variant 1 has no general hardware
    fix and is handled case by case in software

## 17.12 The fixes, and how attackers get around them

*Level: intermediate.*

Every attack above had the same weak point: a quantity the attacker could
predict from a key guess showed up in something the attacker could measure.
The fixes attack one half or the other. Either the measurement stops
depending on secrets (constant time, hiding), or the attacker can no longer
predict the intermediate values (masking, blinding). Fault attacks need a
third fix: noticing the fault.

**Constant time.** For timing, cache and branch-predictor channels, the rule
is mechanical: no branch on a secret, no memory address computed from a
secret, and no instruction whose time depends on its operands applied to a
secret. Square and multiply becomes a Montgomery ladder with a conditional
swap (book 1, §18.3); table-based AES becomes AES-NI or bitsliced code; a
comparison of MACs becomes an OR of XORs. The third rule is the one that
keeps biting: integer division takes data-dependent time on many processors,
which is how KyberSlash (2023) recovered ML-KEM keys from reference code
that divided a secret by $q$ ([Chapter 16](16-Breaking-Post-Quantum-Candidates.md)).
Compilers can also turn branch-free source into branches. Tools check the
binary: Adam Langley's ctgrind (2010) runs code under Valgrind with secrets
marked as uninitialized memory and reports any branch or address that depends
on them, and Oscar Reparaz, Josep Balasch and Ingrid Verbauwhede's dudect
(2017) runs the code on two classes of inputs and applies the t-test of
§17.13 to the timings.

Constant time defeats Kocher, Flush+Reload on code paths, and T-table
attacks. It does not touch power or EM attacks on AES, which leak through the
**values** computed, not the control flow, nor Spectre.

**Hiding** makes the leak smaller relative to the noise, lowering the SNR:
random delays and dummy operations so the target moment moves from trace to
trace; **shuffling**, doing the sixteen S-box lookups in a random order each
time, so the one the attacker targets is at a given sample only one time in
sixteen; noise generators on the chip; and logic styles (dual-rail
precharge) that draw the same current whatever the data. Hiding costs the
attacker traces, by the $1/\rho^2$ rule of §17.7: shuffling over 16 positions
divides the correlation at any one sample by 16 and multiplies the traces by
about 256, unless the attacker realigns or combines samples, which good
attackers do.

**Masking** is the countermeasure with a security argument. Split every
secret-dependent value $x$ into $d + 1$ random **shares**

$$
x = x_0 \oplus x_1 \oplus \dots \oplus x_d ,
$$

where $x_1, \dots, x_d$ are fresh random bytes for each encryption and $x_0$
is whatever makes the sum right. Compute on the shares so that no
intermediate value ever depends on fewer than all $d + 1$ of them. Linear
steps (ShiftRows, MixColumns, AddRoundKey) work share by share. The S-box is
the hard part: a masked S-box either recomputes a masked table for each
encryption ($S'(y \oplus m) = S(y) \oplus m'$) or computes the field inversion
on shares with masked multiplications (Yuval Ishai, Amit Sahai and David
Wagner's scheme, 2003).

**What masking does to the attacker.** With first-order masking ($d = 1$),
each single sample depends on $S(p \oplus k) \oplus m$ or on $m$, and each of
these alone is uniformly random whatever the key: a CPA on any one sample
finds nothing. The secret is in the **joint** distribution of two samples.
The attacker combines them, most simply by the centered product

$$
c_i = \big(t_i(j_0) - \overline{t(j_0)}\big)\big(t_i(j_1) - \overline{t(j_1)}\big),
$$

where $j_0$ and $j_1$ are the moments the two shares leak. For Hamming-weight
leakage of $m$ and $z \oplus m$ with $z = S(p \oplus k)$, each bit of $m$
contributes $(m_b - \tfrac12)(z_b \oplus m_b - \tfrac12)$, which is
$+\tfrac14$ when $z_b = 0$ and $-\tfrac14$ when $z_b = 1$. Summing over bits,

$$
\mathbb{E}[c \mid z] = 2 - \tfrac12\,\mathrm{HW}(z) ,
$$

a function of the secret-dependent value again. A CPA on $c$ with the usual
model works, with the sign flipped. This is a **second-order** attack,
introduced in practice by Thomas Messerges in 2000. The cost is in the noise:
the product multiplies two noisy samples, so its SNR is roughly the product of
theirs. Suresh Chari, Charanjit Jutla, Josyula Rao and Pankaj Rohatgi showed
in 1999 that, under a noise model, the traces needed grow exponentially with
the number of shares: about $\sigma^{2(d+1)}$ for noise variance $\sigma^2$
per sample. Masking only works with noise, and it works much better with a lot.

**Code it.** A first-order masked S-box output leaks at one sample, its mask
at another. First-order CPA on the masked sample, then second-order CPA on the
centered product:

```python
import random

def xtime(a):
    return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

def build_sbox():                   # the AES S-box, as in the DPA code
    exp, log, a = [0] * 255, [0] * 256, 1
    for i in range(255):
        exp[i], log[a] = a, i
        a ^= xtime(a)
    box = []
    for x in range(256):
        b = exp[(255 - log[x]) % 255] if x else 0
        s = b
        for i in range(1, 5):
            s ^= ((b << i) | (b >> (8 - i))) & 0xFF
        box.append(s ^ 0x63)
    return box

S = build_sbox()
HW = [bin(v).count("1") for v in range(256)]
rng = random.Random(2006)
KEY, N = 0xA7, 3000

# A first-order masked S-box: the chip never holds S[p^k] itself, only the
# share S[p^k]^m (sample 1) and, at another moment, the random mask m (sample 0).
plain, t0, t1 = [], [], []
for _ in range(N):
    p, m = rng.randrange(256), rng.randrange(256)
    plain.append(p)
    t0.append(HW[m] + rng.gauss(0, 1))
    t1.append(HW[S[p ^ KEY] ^ m] + rng.gauss(0, 1))

def pearson(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return sxy / (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** 0.5

def rank_of_key(leak):
    score = {g: abs(pearson([HW[S[p ^ g]] for p in plain], leak)) for g in range(256)}
    order = sorted(score, key=score.get, reverse=True)
    return order.index(KEY) + 1, round(score[KEY], 3), round(score[order[0]], 3)

print("first order, sample 1:", rank_of_key(t1))
# Second order: multiply the two centered samples, so the mask cancels out.
m0, m1 = sum(t0) / N, sum(t1) / N
combined = [(a - m0) * (b - m1) for a, b in zip(t0, t1)]
print("second order, product:", rank_of_key(combined))
```

It prints (rank of the true key, its score, the best score):

```
first order, sample 1: (61, 0.021, 0.056)
second order, product: (1, 0.253, 0.253)
```

With 3,000 traces and noise smaller than in §17.7, the first-order attack
puts the right key 61st of 256, where chance would; the second-order attack
puts it first. Masking moved the attack from first order to second, which
here cost a few times more traces. With realistic noise, and with $d = 2$ or
3 shares in hardware, the factor becomes millions.

**Where masking breaks in practice.** The proofs assume each share leaks
independently. Hardware has **glitches**: signals settle at different times,
and for a moment a gate may combine two shares; Stefan Mangard, Norbert
Pramstaller and Elisabeth Oswald broke masked AES hardware this way in 2005.
Svetla Nikova, Christian Rechberger and Vincent Rijmen's **threshold
implementations** (2006) are built to stay secure even with glitches. In
software, two shares in the same register one after the other leak their
XOR through the Hamming distance, and a compiler can undo a mask that it
thinks is pointless. Masking is designed by people who think like the
attacker, and checked by labs that act like one (§17.13).

**Fault detection.** Against faults the fix is to notice the error before any
output leaves: verify an RSA signature before releasing it; compute AES twice,
or encrypt and then decrypt, and compare; add parity or other codes to the
datapath; put light, voltage and clock sensors on the chip; and on a
mismatch, output nothing, or random bytes (**infective** countermeasures,
which make a faulty result useless rather than withholding it). Attackers have
replies: a fault in both redundant computations, or a fault on the comparison
itself, and statistical ineffective fault analysis (SIFA, 2018), which uses
only the encryptions where the fault had **no** effect, and which redundancy
does not stop, because those outputs are correct and released.

## 17.13 Testing for leakage: TVLA and the t-test

*Level: intermediate.*

An evaluation lab cannot run every attack with every model. It wants a test
that says "this device leaks" or "no leak found at this many traces",
whatever model an attacker might use. In 2011 Gilbert Goodwill, Benjamin Jun,
Josh Jaffe and Pankaj Rohatgi of Cryptography Research proposed one at a NIST
workshop on non-invasive attack testing: **test vector leakage assessment**
(TVLA). Its most used form is **fixed versus random**.

<div class="mars-steps" markdown>

1. Choose a fixed input. Collect traces in two sets, interleaved in random order so that drifts in temperature or equipment affect both equally: set A with the fixed input, set B with random inputs. The key is the same and known to the lab.
2. At every time sample $j$, compute **Welch's t-statistic** between the two sets: $t(j) = \dfrac{\bar A(j) - \bar B(j)}{\sqrt{s_A^2(j)/n_A + s_B^2(j)/n_B}}$, where $s^2$ are the sample variances.
3. If $|t(j)| > 4.5$ at any sample, in two independent runs, the device **fails**: something in it depends on the data at that moment.

</div>

Why it works: if the device leaked nothing about its data, the fixed and
random traces would have the same distribution, and $t$ would be close to a
standard normal; $|t| > 4.5$ happens by chance about once in 150,000 samples.
A device that leaks any function of the data, under any model, shifts the
mean of the fixed set away from the average over random inputs. The test does
not recover a key or say how hard an attack would be; it says whether a
first-order leak is there to find. Dimensions of the test are tuned by
choosing the fixed input (one that makes some intermediate value extreme) and
by **higher-order** tests for masked designs: center each sample and square
it (or multiply two samples, as in §17.12), then run the same t-test. Tobias
Schneider and Amir Moradi worked out how to compute these efficiently in one
pass in 2015.

**Code it.** A fixed-versus-random test on one sample of a simulated chip,
unprotected and then with first-order masking where both shares leak at the
same moment:

```python
import random

def xtime(a):
    return ((a << 1) ^ 0x1B) & 0xFF if a & 0x80 else a << 1

def build_sbox():                   # the AES S-box, as in the DPA code
    exp, log, a = [0] * 255, [0] * 256, 1
    for i in range(255):
        exp[i], log[a] = a, i
        a ^= xtime(a)
    box = []
    for x in range(256):
        b = exp[(255 - log[x]) % 255] if x else 0
        s = b
        for i in range(1, 5):
            s ^= ((b << i) | (b >> (8 - i))) & 0xFF
        box.append(s ^ 0x63)
    return box

S = build_sbox()
HW = [bin(v).count("1") for v in range(256)]
rng = random.Random(2011)
KEY, FIXED, N = 0xA7, 0x18, 4000

def leak(p, masked):                # one sample at the S-box output
    z = S[p ^ KEY]
    if not masked:
        return HW[z] + rng.gauss(0, 2)
    m = rng.randrange(256)          # both shares handled at the same moment
    return HW[m] + HW[z ^ m] + rng.gauss(0, 2)

def welch_t(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a) / (len(a) - 1)
    vb = sum((x - mb) ** 2 for x in b) / (len(b) - 1)
    return (ma - mb) / (va / len(a) + vb / len(b)) ** 0.5

def tvla(masked):
    fixed, rand = [], []
    for _ in range(N):              # the lab interleaves the two sets at random
        if rng.random() < 0.5:
            fixed.append(leak(FIXED, masked))
        else:
            rand.append(leak(rng.randrange(256), masked))
    t1 = welch_t(fixed, rand)
    mf, mr = sum(fixed) / len(fixed), sum(rand) / len(rand)
    t2 = welch_t([(x - mf) ** 2 for x in fixed], [(x - mr) ** 2 for x in rand])
    return round(t1, 1), round(t2, 1)

print("fixed S-box output has weight", HW[S[FIXED ^ KEY]])
print("unprotected: t1, t2 =", tvla(False))
print("masked:      t1, t2 =", tvla(True))
```

It prints:

```
fixed S-box output has weight 1
unprotected: t1, t2 = (-41.4, -8.7)
masked:      t1, t2 = (0.5, 7.0)
```

The unprotected chip fails at once: the fixed input's S-box output has weight
1 against an average of 4, and the first-order $t$ is $-41.4$. (Its
second-order $t$ fails too, because a fixed input has less variance than
random ones.) The masked chip passes the first-order test, $0.5$, and fails
the second-order one, $7.0$: for a fixed $z$ the sum
$\mathrm{HW}(m) + \mathrm{HW}(z \oplus m)$ always has mean 8, but its variance
is $8 - \mathrm{HW}(z)$, here 7, against 4 on average over random $z$. That is
exactly the leak the attack of §17.12 used. A designer who sees this result
knows the design is first-order secure and that its second-order security
rests on the noise.

**Where the test sits in standards.** ISO/IEC 17825, first published in 2016,
specifies TVLA-style testing for cryptographic modules, with test levels and
trace counts. FIPS 140-3, the standard for US and Canadian validation of
cryptographic modules since 2019, includes non-invasive attacks (timing, power, EM) among the areas a module at the higher security
levels must address, with ISO/IEC 17825 as the test method; how much of that
testing the validation program actually requires has changed over time, so
check the current program guidance rather than assume. Smart cards and
secure elements are evaluated under Common Criteria, where labs mount real
attacks (CPA, templates, faults) and score them by the time, expertise,
equipment and samples they needed. The two philosophies complement each
other: a t-test says whether anything leaks; an attack says what the leak
costs.

!!! note "Life story: TVLA, the leakage t-test"
    **Born:** 2011, Gilbert Goodwill, Benjamin Jun, Josh Jaffe and Pankaj
    Rohatgi, "A testing methodology for side-channel resistance validation"
    (NIST Non-Invasive Attack Testing Workshop) · **Purpose:** a pass/fail
    leakage test that needs no attack and no leakage model, by comparing
    fixed and random inputs with Welch's t-test · **Helped:** ISO/IEC 17825
    (2016), dudect's timing tests (2017), and routine leakage checks in chip
    design flows · **Status:** current; its limits (a pass at $N$ traces says
    nothing about $10N$; false positives from leaks of public data) are well
    understood and handled by the choice of inputs and higher-order tests

## 17.14 In the real world

*Level: intermediate.*

The attacks of this chapter left the laboratory at different speeds, and the
pattern is worth seeing whole.

**Smart cards first.** Pay-TV cards in the 1990s were the first targets with
real money behind them; pirates attacked them with glitches and probing long
before the academic papers. After DPA was published, every card maker
redesigned, and by the mid-2000s certified cards came with masking, shuffling,
noise and fault sensors. The evaluation regime (Common Criteria with
attack-based ratings) grew up around them. Breaks of certified secure
elements still happen, the Titan key of §17.8 being one, but they need
physical possession, opened packages and expensive equipment.

**Then remote timing.** David Brumley and Dan Boneh's 2003 attack on OpenSSL
over a local network showed that timing survives a network. Lucky Thirteen
(2013) turned a few microseconds in TLS's CBC decryption into a plaintext
oracle ([Chapter 10](10-Attacks-on-Modes-and-MACs.md)). Minerva and TPM-Fail
(2019) found that ECDSA implementations, including Trusted Platform Modules
certified to resist exactly this, leaked the bit length of their nonces
through timing, and a lattice turned thousands of signatures into the key
([Chapter 14](14-Attacks-on-Signatures-and-Nonces.md)). Each was found in a
library that its authors believed constant time.

**Then shared hardware.** Cache attacks moved from AES T-tables (2005) to
cross-core Flush+Reload (2014), to the cloud, and to the processor's
speculation (2018). The response was structural: AES-NI and constant-time
libraries; hypervisors that stopped sharing memory pages between tenants;
browsers that put each site in its own process and blurred their timers.
Hertzbleed (2022) showed that even power is visible from software, through
the CPU's frequency scaling, and Platypus (2020) read power directly through
Intel's energy-reporting interface until access to it was restricted.

**Then faults from software.** Rowhammer (2014 onward), CLKSCREW (2017) and
Plundervolt (2019) gave remote attackers fault injection, which until then
needed a probe. After Plundervolt, Intel shipped updates that lock the software voltage
interface on systems that use SGX.

**And post-quantum.** The new standards inherit all of it. ML-KEM's reference
code leaked through a division (KyberSlash, 2023), and power and EM attacks on
ML-KEM and ML-DSA implementations, some with a single trace, are a busy
research topic ([Chapter 16](16-Breaking-Post-Quantum-Candidates.md)). The
algorithms are new; the attacker's recipe is the one in Figure 17.1.

The lesson the incidents teach is the one this book keeps returning to: the
mathematics was rarely the weak point. Kocher's 32-bit exponent fell to a
variance, AES to a correlation and a cache line, RSA to one wrong bit. In each
case the designers had proved or tested what the algorithm does, and the
attacker measured how the machine did it.

## 17.15 Going deeper

*Level: expert.*

**Profiled attacks.** An attacker who owns a copy of the target device can
learn its leakage exactly before attacking. Suresh Chari, Josyula Rao and
Pankaj Rohatgi's **template attacks** (CHES 2002) model the trace at the
relevant samples, for each value of the target byte, as a multivariate
normal distribution with its own mean and covariance, estimated from
profiling traces with known keys. Against the target, the attacker computes
the likelihood of its traces under each key guess and multiplies across
traces. This is the optimal distinguisher when the model is right, and it can
need a handful of traces where CPA needs thousands. Werner Schindler,
Kerstin Lemke and Christof Paar's **stochastic models** (2005) fit a linear
model in the bits of the target value, needing fewer profiling traces.

**Deep learning.** Since about 2016, convolutional neural networks trained on
profiling traces have replaced templates in many labs. They tolerate
misaligned traces, so they defeat random delays and jitter without manual
realignment, and they learn which samples to combine, so they mount
higher-order attacks on masked implementations without being told where the
shares leak. The public ASCAD database (Ryad Benadjila, Emmanuel Prouff,
Rémi Strullu, Eleonora Cagli and Cécile Dumas, 2018), traces of a masked AES
on an 8-bit microcontroller, became the benchmark. Machine learning has not
changed what leaks; it has lowered the expertise needed to exploit it.

**Distinguishers and metrics.** Besides difference of means, correlation and
likelihood, **mutual information analysis** (Benedikt Gierlichs, Lejla Batina,
Pim Tuyls and Bart Preneel, 2008) estimates the mutual information between
predictions and traces and works for any leakage function, at the cost of
estimating distributions. François-Xavier Standaert, Tal Malkin and Moti
Yung's framework (EUROCRYPT 2009) separates **information** (how much a
device leaks, measured independently of any attack) from **security**
(how well a given attack uses it), measured by the **success rate** (the
probability the right key ranks first after $N$ traces) and the **guessing
entropy** (the expected rank of the right key). Rank estimation algorithms
(Veyrat-Charvillon, Gérard and Standaert, 2013, and later work) bound the
position of the full 128-bit key among all keys from the per-byte scores
without enumerating them, so an evaluator can say "the key is within the top
$2^{40}$" even when no attack recovers it.

**Leakage models with proofs.** Ishai, Sahai and Wagner's **probing model**
(2003) lets the adversary read the exact values of up to $d$ wires; a
circuit masked with $d + 1$ shares by their method is secure against it.
Emmanuel Prouff and Matthieu Rivain's **noisy leakage model** (EUROCRYPT 2013)
lets the adversary see a noisy function of every wire, which is closer to a
real trace, and Alexandre Duc, Stefan Dziembowski and Sebastian Faust showed in
2014 that security in the probing model implies security in the noisy model.
Together they justify the $\sigma^{2(d+1)}$ rule of §17.12: masking amplifies
noise exponentially in the order. The **robust probing model** adds glitches
and transitions, the physical effects that broke early masked hardware.
**Leakage-resilient cryptography** goes further and designs modes (for
example, re-keying after every few blocks) so that the attacker never sees
enough traces under one key to complete a DPA.

**Horizontal and single-trace attacks.** A 2048-bit exponentiation has
thousands of multiplications. Instead of averaging across traces, a
**horizontal** attack combines the leakage of many operations within one trace
that all involve the same secret operand, which defeats exponent blinding,
since each trace is attacked alone. The same idea, with belief propagation
through the structure of the number-theoretic transform, gives single-trace
attacks on lattice schemes.

**Faults, formally.** Statistical ineffective fault analysis (Christoph
Dobraunig, Maria Eichlseder, Thomas Korak, Stefan Mangard, Florian Mendel and
Robert Primas, CHES 2018) uses the fact that whether a fault is ineffective
depends on the value it hit: if a fault sets a byte to zero, it is ineffective
exactly when the byte was already zero, so the correct outputs that survive
detection are biased, and a statistical test on them (the same idea as
§17.13) recovers key bytes. It defeats detection and infection
countermeasures, and the defenses combine masking with error correction.

**Constant time, formally.** Tools now verify constant-time properties on
compiled code (ct-verif, Binsec/Rel and others), and the speculative extension
of §17.11 defines constant time against an adversary who also controls the
branch predictor. Cryptographic libraries such as those generated by
HACL\* and Fiat Cryptography are verified constant time by construction, at
the level of the code they emit.

## Check yourself

??? question "1. Why does a side-channel attack on AES need only about 16 × 256 guesses when a black-box attack needs about 2¹²⁸?"

    Because the leak depends on one key byte at a time. The power at the
    moment the first-round S-box processes byte $i$ depends on $p_i$ and
    $k_i$ only, so each byte can be guessed and tested on its own: sixteen
    independent searches of 256 values, about $2^{12}$ in all. The
    ciphertext, by contrast, depends on all 128 bits at once.

??? question "2. In Kocher's attack, why does subtracting the time of a multiplication that did not happen increase the variance?"

    The simulated time of the non-existent multiplication is a random
    variable independent of the real total. For independent $X$ and $Y$,
    $\operatorname{Var}(X - Y) = \operatorname{Var}(X) + \operatorname{Var}(Y)$,
    so subtracting it adds its variance. Subtracting a real term of the sum,
    by contrast, removes it, and the variance falls.

??? question "3. A T-table has 256 four-byte entries and cache lines are 64 bytes. How many key bits does the first round leak per byte? What if the lines were 32 bytes?"

    A 64-byte line holds 16 entries, so the line number is the top 4 bits of
    the 8-bit index $p \oplus k$: 4 key bits per byte, 64 in all. With 32-byte
    lines, a line holds 8 entries and the line number is the top 5 bits: 5 bits
    per byte, 80 in all. Smaller lines leak more.

??? question "4. Flush+Reload needs shared memory. What does Prime+Probe need instead, and what does it lose?"

    Only a shared cache: the attacker fills a cache set with its own lines
    and detects evictions. It loses resolution: it learns which set was used,
    not which line, so any of the victim's (or anyone's) data mapping to that
    set causes a hit, and it is noisier and slower.

??? question "5. In DPA with one selection bit, the right guess gives a peak of about 1 and the noise has standard deviation 2. Roughly how many traces make the peak five standard errors above zero?"

    The difference of two means of $N/2$ traces each has standard error
    $\sqrt{\sigma^2/(N/2) + \sigma^2/(N/2)} = 2\sigma/\sqrt N$. The total
    variance at the sample is about $4 + 1.75$ (noise plus the other seven
    bits), so $\sigma \approx 2.4$ and the error is about $4.8/\sqrt N$.
    Five standard errors below 1 means $4.8 \cdot 5/\sqrt N \le 1$, or
    $N \approx 580$. The program needed about a thousand because it also has
    to beat 255 wrong guesses at 24 samples each.

??? question "6. A chip's best CPA correlation for the right key byte is 0.05. About how many traces does the attack need? And if shuffling over 16 positions is added?"

    With $N \approx 28/\rho^2$: $28 / 0.0025 \approx 11{,}000$ traces. Shuffling
    divides the correlation at a fixed sample by 16, to about 0.003, and
    $N \approx 28 / 0.003^2$ rises by $16^2 = 256$, to about 2.9 million,
    unless the attacker combines the 16 possible samples.

??? question "7. Why can't a CPA with the Hamming-weight model on one sample find the key in a first-order masked implementation?"

    Each sample depends on one share, $m$ or $z \oplus m$, and with $m$
    uniformly random each share is uniformly random whatever $z$ is. So the
    distribution of any single sample is the same for every key, and no
    single-sample statistic can tell keys apart. Only the joint distribution
    of two samples depends on $z$, which is what the centered product uses.

??? question "8. In DFA on AES, why is a fault before round 9's MixColumns useful, while a fault in round 10 is not?"

    A fault entering round 9 passes through one MixColumns, which spreads it
    to four bytes with known coefficients (1, 2, 3 multiples of one unknown
    $f$), then through one S-box layer to the ciphertext. That gives four
    linked equations in four key bytes. A fault in round 10 after SubBytes
    simply XORs into the ciphertext and says nothing about the key. An
    arbitrary byte fault just before round 10's SubBytes gives one equation
    per byte with an unknown difference, and almost every key byte fits some
    difference, so it says little. (If the fault is known to flip a single
    bit, the equation does constrain the key; that is Christophe Giraud's
    attack.)

??? question "9. A Rowhammer flip turns the RSA modulus N into N' = N ⊕ 2ʲ. Why can the attacker forge signatures that the victim accepts, and what single defense stops it?"

    The victim now verifies with $(N', e)$. If $N'$ factors easily (it is
    a random-looking number, not a product of two large primes),
    the attacker computes $\varphi(N')$ and $d' = e^{-1} \bmod
    \varphi(N')$ and signs anything; the victim's check $s^e \bmod N'$
    passes. Checking the public key's integrity (a pinned hash or a signature
    on it) before use stops it.

??? question "10. A masked chip gives |t| = 0.5 in a first-order fixed-versus-random test and |t| = 7.0 in a second-order test. What should the designer conclude?"

    The masking works at first order: no sample's mean depends on the data.
    The second-order test shows the variance does, so the chip is exposed to
    second-order attacks like the centered product of §17.12. Its security
    rests on how many traces those need, which depends on the noise; the
    designer can add noise or hiding, or move to a higher masking order.

## What you learned

- Every side-channel attack is divide and conquer: a target value depending
  on a few key bits, a leakage model, predictions for each guess, and a
  distinguisher that picks the guess whose predictions fit.
- Kocher's timing attack recovers an exponent bit by bit: the right guess
  removes the variance of real operations from the total time, a wrong guess
  adds the variance of imaginary ones.
- Prime+Probe finds the cache sets a victim uses; Flush+Reload finds the
  lines of shared code it runs, precisely enough to read GnuPG's
  square-and-multiply in one decryption.
- A secret-indexed table lookup leaks the cache-line number: for AES
  T-tables, the top four bits of each key byte in the first round.
- SPA reads key-dependent operations from one trace; DPA and CPA average
  many traces against predictions of an S-box output. CPA's correlation for
  the right guess is $1/\sqrt{1 + 1/\mathrm{SNR}}$, and the traces needed
  grow as $1/\rho^2$.
- EM probes give the same traces locally and without contact.
- A one-byte fault before round 9's MixColumns gives four equations in four
  last-round key bytes; two faults per column recover AES-128's key.
- Rowhammer is fault injection from software; Spectre makes a processor read
  attacker-chosen secrets into the cache.
- The fixes: constant-time code (timing, cache), hiding (lower SNR),
  masking (pushes attacks to higher order, at a cost exponential in the
  order and the noise), and fault detection (verify before release).
- TVLA's fixed-versus-random Welch t-test with threshold 4.5 decides whether
  a device leaks, at first and higher order.

**Next:** [Chapter 18](18-Random-Numbers-Gone-Wrong.md) turns from leaks in
how keys are used to flaws in how they are made.

## Further reading

- Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA,
  DSS, and Other Systems" (CRYPTO 1996).
- Werner Schindler, "A Timing Attack against RSA with the Chinese Remainder
  Theorem" (CHES 2000).
- David Brumley and Dan Boneh, "Remote Timing Attacks Are Practical"
  (USENIX Security 2003).
- Paul Kocher, Joshua Jaffe and Benjamin Jun, "Differential Power Analysis"
  (CRYPTO 1999).
- Éric Brier, Christophe Clavier and Francis Olivier, "Correlation Power
  Analysis with a Leakage Model" (CHES 2004).
- Stefan Mangard, Elisabeth Oswald and Thomas Popp, *Power Analysis Attacks:
  Revealing the Secrets of Smart Cards* (Springer, 2007). The standard
  textbook; the source of the trace-count rule in §17.7.
- Daniel J. Bernstein, "Cache-timing attacks on AES" (2005).
- Dag Arne Osvik, Adi Shamir and Eran Tromer, "Cache Attacks and
  Countermeasures: the Case of AES" (CT-RSA 2006; full version in *Journal of
  Cryptology*, 2010).
- Colin Percival, "Cache Missing for Fun and Profit" (BSDCan 2005).
- Yuval Yarom and Katrina Falkner, "FLUSH+RELOAD: a High Resolution, Low
  Noise, L3 Cache Side-Channel Attack" (USENIX Security 2014).
- Fangfei Liu, Yuval Yarom, Qian Ge, Gernot Heiser and Ruby Lee,
  "Last-Level Cache Side-Channel Attacks are Practical" (IEEE S&P 2015).
- Jean-Jacques Quisquater and David Samyde, "ElectroMagnetic Analysis
  (EMA): Measures and Counter-Measures for Smart Cards" (E-smart 2001);
  Karine Gandolfi, Christophe Mourtel and Francis Olivier,
  "Electromagnetic Analysis: Concrete Results" (CHES 2001).
- Daniel Genkin, Lev Pachmanov, Itamar Pipman and Eran Tromer, "Stealing
  Keys from PCs using a Radio" (CHES 2015).
- Thomas Roche, Victor Lomné, Camille Mutschler and Laurent Imbert, "A Side
  Journey to Titan" (USENIX Security 2021).
- Eyal Ronen, Adi Shamir, Achi-Or Weingarten and Colin O'Flynn, "IoT Goes
  Nuclear: Creating a ZigBee Chain Reaction" (IEEE S&P 2017).
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of
  Checking Cryptographic Protocols for Faults" (EUROCRYPT 1997).
- Eli Biham and Adi Shamir, "Differential Fault Analysis of Secret Key
  Cryptosystems" (CRYPTO 1997).
- Gilles Piret and Jean-Jacques Quisquater, "A Differential Fault Attack
  Technique against SPN Structures, with Application to the AES and KHAZAD"
  (CHES 2003).
- Christophe Giraud, "DFA on AES" (Advanced Encryption Standard: 4th
  International Conference, AES 2004; LNCS 3373, 2005).
- Michael Tunstall, Debdeep Mukhopadhyay and Subidh Ali, "Differential Fault
  Analysis of the Advanced Encryption Standard Using a Single Fault" (WISTP
  2011).
- Adrian Tang, Simha Sethumadhavan and Salvatore Stolfo, "CLKSCREW: Exposing
  the Perils of Security-Oblivious Energy Management" (USENIX Security 2017).
- Kit Murdock, David Oswald, Flavio Garcia, Jo Van Bulck, Daniel Gruss and
  Frank Piessens, "Plundervolt: Software-based Fault Injection Attacks
  against Intel SGX" (IEEE S&P 2020).
- Christoph Dobraunig, Maria Eichlseder, Thomas Korak, Stefan Mangard,
  Florian Mendel and Robert Primas, "SIFA: Exploiting Ineffective Fault
  Inductions on Symmetric Cryptography" (CHES 2018).
- Yoongu Kim and others, "Flipping Bits in Memory Without Accessing Them: An
  Experimental Study of DRAM Disturbance Errors" (ISCA 2014).
- Mark Seaborn and Thomas Dullien, "Exploiting the DRAM rowhammer bug to
  gain kernel privileges" (Google Project Zero blog, March 2015).
- Kaveh Razavi, Ben Gras, Erik Bosman, Bart Preneel, Cristiano Giuffrida and
  Herbert Bos, "Flip Feng Shui: Hammering a Needle in the Software Stack"
  (USENIX Security 2016).
- Andrew Kwong, Daniel Genkin, Daniel Gruss and Yuval Yarom, "RAMBleed:
  Reading Bits in Memory Without Accessing Them" (IEEE S&P 2020).
- Paul Kocher and others, "Spectre Attacks: Exploiting Speculative
  Execution" (IEEE S&P 2019).
- Sunjay Cauligi and others, "Constant-Time Foundations for the New Spectre
  Era" (PLDI 2020).
- Suresh Chari, Charanjit Jutla, Josyula Rao and Pankaj Rohatgi, "Towards
  Sound Approaches to Counteract Power-Analysis Attacks" (CRYPTO 1999).
- Thomas Messerges, "Using Second-Order Power Analysis to Attack DPA
  Resistant Software" (CHES 2000).
- Yuval Ishai, Amit Sahai and David Wagner, "Private Circuits: Securing
  Hardware against Probing Attacks" (CRYPTO 2003).
- Stefan Mangard, Norbert Pramstaller and Elisabeth Oswald, "Successfully
  Attacking Masked AES Hardware Implementations" (CHES 2005).
- Svetla Nikova, Christian Rechberger and Vincent Rijmen, "Threshold
  Implementations Against Side-Channel Attacks and Glitches" (ICICS 2006).
- Emmanuel Prouff and Matthieu Rivain, "Masking against Side-Channel
  Attacks: A Formal Security Proof" (EUROCRYPT 2013).
- Suresh Chari, Josyula Rao and Pankaj Rohatgi, "Template Attacks" (CHES
  2002).
- Benedikt Gierlichs, Lejla Batina, Pim Tuyls and Bart Preneel, "Mutual
  Information Analysis" (CHES 2008).
- François-Xavier Standaert, Tal Malkin and Moti Yung, "A Unified Framework
  for the Analysis of Side-Channel Key Recovery Attacks" (EUROCRYPT 2009).
- Ryad Benadjila, Emmanuel Prouff, Rémi Strullu, Eleonora Cagli and Cécile
  Dumas, "Deep learning for side-channel analysis and introduction to ASCAD
  database" (*Journal of Cryptographic Engineering*, 2020; first released
  2018).
- Gilbert Goodwill, Benjamin Jun, Josh Jaffe and Pankaj Rohatgi, "A Testing
  Methodology for Side-Channel Resistance Validation" (NIST Non-Invasive
  Attack Testing Workshop, 2011).
- Tobias Schneider and Amir Moradi, "Leakage Assessment Methodology" (CHES
  2015).
- Oscar Reparaz, Josep Balasch and Ingrid Verbauwhede, "Dude, is my code
  constant time?" (DATE 2017).
- ISO/IEC 17825, *Testing methods for the mitigation of non-invasive attack
  classes against cryptographic modules* (2016); FIPS 140-3 (2019); FIPS 197
  (2001, updated 2023).
