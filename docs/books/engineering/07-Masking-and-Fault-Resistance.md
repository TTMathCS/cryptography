# 7. Hardware attacks, the defender's view: masking and fault resistance

*Constant-time code stops the stopwatch, but it does nothing about the oscilloscope. A chip
that computes the AES S-box draws a little more current for every 1 bit it writes, and an
attacker who holds the chip can turn a few hundred measurements into the key. The
attacks are told in the Cryptanalysis book; this chapter is the side of the person who
builds the chip or writes its firmware. You will mask AES's first round with a
recomputed table and check it against FIPS 197, then attack your own code with the
attacker's tool: a correlation attack that takes the key byte from the unmasked
version in 200 simulated traces, finds nothing in 20,000 traces of the masked one, and
gets the key back with a second-order attack at about twenty times the cost. You will
break your own masking with one "saved" random byte, check two masking schemes for
leaks by exhaustive enumeration, fault a toy cipher and defend it with redundancy and
infective computation, run a leakage test as a release gate, and protect a key in
memory against the bit flips that radiation causes on Mars.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a chip gives away (Hamming weight and Hamming distance) and how to measure
      your own signal-to-noise ratio;
    - how Boolean masking works, and how to mask AES's AddRoundKey and SubBytes with a
      recomputed table;
    - why a first-order correlation attack fails on masked code, how a second-order
      attack recovers the key, and what masking costs the attacker in traces;
    - how one shared mask, or a register that leaks Hamming distance, undoes masking;
    - what shuffling and hiding buy, measured, and why they are added to masking, not
      used instead of it;
    - the probing model, the ISW multiplication (2003) and threshold implementations
      (2006), and why glitches in hardware need the second;
    - fault models, and the countermeasures that hold: redundancy, inverse checks,
      hardened status words, infective computation, verify after compute;
    - how designs are judged: TVLA, ISO/IEC 17825, Common Criteria with AVA_VAN, and
      the non-invasive requirements of FIPS 140-3 and ISO/IEC 19790;
    - what is inside a smart card or a secure element, and how to choose one;
    - why radiation on Mars is a natural fault injector, and how error-correcting memory
      and fault-resistant cryptography work together there.

    **You need:** [Chapter 18 of the cryptography book](../../book/18-Side-Channels.md),
    especially §18.4 (power analysis, with a first correlation attack) and §18.7 (fault
    attacks, with the Bellcore attack on RSA-CRT), and
    [Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md),
    the attacker's view of the same leaks. [Chapter 5](05-Constant-Time-Programming.md)
    of this book (constant time) and the RSA fault check of
    [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md) come just before this one. AES
    itself is in [Chapter 7 of the cryptography book](../../book/07-AES.md).

    **Levels:** §7.1 and §7.2 are for beginners; §7.3, §7.4, §7.6 and §7.8 to §7.13
    are intermediate; §7.5, §7.7 and §7.14 are expert.

## 7.1 The problem

*Level: beginner.*

On 3 September 2024 Thomas Roche of NinjaLab, a small hardware security firm in
Montpellier, published a paper called "EUCLEAK". It showed how to take the ECDSA
private key out of a YubiKey 5, the security key that millions of people use to log in
to their email and their employers' networks. The attack needed the key in hand for a
few minutes, an opened case, an electromagnetic probe held over the chip, and some
offline analysis afterwards. The leak was in a cryptographic library from Infineon,
the chip's maker: the modular inversion that ECDSA performs on its secret nonce used
the extended Euclidean algorithm, whose number of steps depends on the value being
inverted, and the steps showed up in the electromagnetic field above the chip. Yubico
released firmware 5.7 without the flaw; keys already sold could not be updated.

The part of the story that matters for this chapter is in the paper's abstract: the
weakness had gone unnoticed for about fourteen years and through about eighty
Common Criteria evaluations at the highest level. The chips had masking, shuffling,
fault sensors and metal shields. They had been attacked, professionally and on
purpose, by laboratories paid to find exactly this kind of leak. One operation had been
left unprotected, and that was enough.

That is the defender's problem in hardware. The attacker owns the device. They can
power it from a bench supply, run it a million times, measure its current through a
small resistor, hold a probe over it, cool it, heat it, flash a laser at it, or glitch
its clock. Everything the chip does with the key leaves some physical trace, and the
attacker needs only one trace that depends on the key in a way they can predict. The
defender has to cover every one.

The attacks come in two families, and the defenses differ.

- **Passive attacks** watch. Power analysis and electromagnetic analysis record the
  chip while it works and use statistics to match the measurements with predictions
  made from guesses of a key byte. Book 1 §18.4 shows the idea and
  [Cryptanalysis, Chapter 17](../cryptanalysis/17-Side-Channels-the-Attackers-View.md)
  codes the attacks in full: simple power analysis, differential and correlation power
  analysis, templates. The defender's answers are **hiding** (make the measurement
  carry less signal) and **masking** (make the value the attacker predicts never
  appear on the chip).
- **Active attacks** disturb. A glitch, a laser or a particle changes one value in the
  computation, and the wrong output reveals the key, as in the Bellcore attack on
  RSA-CRT (book 1 §18.7) and differential fault analysis of AES (Cryptanalysis §17.9).
  The defender's answers are **detection** (notice the fault and output nothing) and
  **infection** (make a faulty output useless).

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The defender's map: where hiding, masking and fault countermeasures cut the attacker's chain" fill="currentColor" font-size="14">
<rect x="10" y="30" width="120" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="70" y="52" text-anchor="middle">secret key k</text>
<text x="70" y="70" text-anchor="middle" font-size="12">in the chip</text>
<rect x="170" y="30" width="130" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="235" y="52" text-anchor="middle">chip computes</text>
<text x="235" y="70" text-anchor="middle" font-size="12">S(p ⊕ k)</text>
<rect x="340" y="30" width="120" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="400" y="52" text-anchor="middle">trace</text>
<text x="400" y="70" text-anchor="middle" font-size="12">power, EM</text>
<rect x="500" y="30" width="130" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="565" y="52" text-anchor="middle">attacker</text>
<text x="565" y="70" text-anchor="middle" font-size="12">correlates a guess</text>
<line x1="130" y1="55" x2="164" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="170,55 163,51 163,59"/>
<line x1="300" y1="55" x2="334" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="340,55 333,51 333,59"/>
<line x1="460" y1="55" x2="494" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="500,55 493,51 493,59"/>
<line x1="320" y1="62" x2="320" y2="112" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<rect x="230" y="112" width="180" height="46" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="230" y="112" width="180" height="46" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="320" y="131" text-anchor="middle" font-size="13" font-weight="bold">hiding (§7.6)</text>
<text x="320" y="149" text-anchor="middle" font-size="12">less signal, more noise</text>
<line x1="480" y1="62" x2="480" y2="112" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<rect x="430" y="112" width="200" height="46" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="430" y="112" width="200" height="46" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="530" y="131" text-anchor="middle" font-size="13" font-weight="bold">masking (§7.3 to §7.7)</text>
<text x="530" y="149" text-anchor="middle" font-size="12">nothing left to predict</text>
<rect x="10" y="210" width="150" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="232" text-anchor="middle">glitch, laser,</text>
<text x="85" y="250" text-anchor="middle">particle</text>
<line x1="160" y1="225" x2="226" y2="86" stroke="currentColor" stroke-width="1.4"/>
<polygon points="229,80 222.5,85 229.5,88.5"/>
<rect x="250" y="210" width="130" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="232" text-anchor="middle">faulty output</text>
<text x="315" y="250" text-anchor="middle" font-size="12">reveals the key</text>
<line x1="250" y1="86" x2="300" y2="204" stroke="currentColor" stroke-width="1.4"/>
<polygon points="302,210 297.5,203 304.5,201"/>
<line x1="380" y1="235" x2="424" y2="235" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<rect x="430" y="210" width="200" height="50" rx="6" fill="currentColor" opacity="0.12"/>
<rect x="430" y="210" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="530" y="231" text-anchor="middle" font-size="13" font-weight="bold">detect or infect (§7.9)</text>
<text x="530" y="249" text-anchor="middle" font-size="12">no useful faulty output</text>
<text x="320" y="290" text-anchor="middle" font-size="12">evaluation (§7.10) checks all three: does anything still depend on the key?</text>
</svg>
<figcaption>Figure 7.1. The defender's map. A passive attack needs a measurable trace and a value it can predict from a key guess: hiding attacks the first, masking the second. An active attack needs a faulty output: detection withholds it, infection makes it worthless.</figcaption>
</figure>

None of these defenses is a matter of writing the algorithm correctly. AES, ECDSA and
RSA are not broken by any of this. What breaks is the physical computation, which the
mathematics never mentions, and that is why this is an engineering chapter. The rest
of it builds each defense in turn and then attacks it, because the only way a defender
knows a countermeasure works is to run the attack against it.

Two facts frame everything below. First, no countermeasure removes the leak; each one
raises the number of measurements the attacker needs, and the defender's job is to
push that number beyond what an attacker can collect. A smart card that signs once per
payment, and that locks after a few thousand operations, is safe at a number that would
be ruinous for a chip that encrypts a video stream. Second, faults are not only an
attacker's tool. Bad hardware, overheated servers and cosmic rays cause them too, and
Florian Weimer's 2015 scan of TLS servers that leaked their RSA keys through faulty
signatures (see [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md)) involved no attacker
at all. On Mars, where the radiation reaching the ground is about a hundred times what
reaches us on Earth, natural faults are a design input (§7.12).

!!! note "Life story: EUCLEAK"
    **Born:** 3 September 2024, Thomas Roche of NinjaLab, "EUCLEAK" (IACR ePrint
    2024/1380), with Yubico's advisory YSA-2024-03 the same day · **Purpose:** to show
    that the ECDSA implementation in Infineon's cryptographic library for its secure
    elements leaked the nonce through a non-constant-time modular inversion, visible to
    an electromagnetic probe; the paper demonstrated key extraction from a YubiKey 5Ci
    · **Helped:** a reminder that certification is a sample of attacks, not a proof: the
    flaw had survived about fourteen years and about eighty top-level Common Criteria
    evaluations; Yubico shipped firmware 5.7, with its own cryptographic library, in
    May 2024 · **Status:** affected keys (YubiKey 5 Series below firmware 5.7, YubiKey
    Bio below 5.7.2) stay vulnerable, because their firmware cannot be updated; an
    attacker needs physical access and specialist equipment

## 7.2 What the chip gives away: power models

*Level: beginner.*

A CMOS gate draws current mostly when its output changes. Charging a wire from 0 to 1
takes charge from the supply; discharging it from 1 to 0 dumps charge to ground. A
processor writing a byte to a register or a bus therefore draws a current that
depends on the bits it writes and on the bits that were there before. Two simple
models capture most of this.

- The **Hamming weight** model says the leak is proportional to the number of 1 bits
  in the value $v$ being handled: $\mathrm{HW}(v)$. It fits buses and memories that are
  **precharged** to a fixed state (all zeros) before each transfer, and it is the model
  that the simulated attacks in book 1 and in Cryptanalysis use.
- The **Hamming distance** model says the leak is proportional to the number of bits
  that change when a register goes from $v_{\text{old}}$ to $v_{\text{new}}$:
  $\mathrm{HD}(v_{\text{old}}, v_{\text{new}}) = \mathrm{HW}(v_{\text{old}} \oplus
  v_{\text{new}})$. It fits registers in hardware and in software on most
  microcontrollers.

The measured sample is then modeled as $t = a \cdot L(v) + n$, where $L$ is the
weight or the distance, $a$ is how strongly this particular moment of this particular
chip responds, and $n$ is noise from everything else: other parts of the chip,
the measurement equipment, the power supply.

**By hand.** Take the first byte of the FIPS 197 example: plaintext byte $p = $ `0x32`,
key byte $k = $ `0x2b`. AddRoundKey gives $x = p \oplus k = $ `0x19`
($00011001_2$, weight 3), and the S-box gives $S(x) = $ `0xd4` ($11010100_2$,
weight 4). If the chip writes $S(x)$ into the register that held $x$, the Hamming
distance is

$$
\mathrm{HD}(\texttt{0x19}, \texttt{0xd4}) = \mathrm{HW}(\texttt{0x19} \oplus \texttt{0xd4})
= \mathrm{HW}(\texttt{0xcd}) = \mathrm{HW}(11001101_2) = 5 .
$$

A Hamming weight attacker predicts 4 for this trace; a Hamming distance attacker
predicts 5. Both predictions depend on the key byte, through $x$, and that is all an
attacker needs. The defender should notice something sharper: a Hamming distance
depends on **two** values at once, and a pair of values can leak something neither
leaks alone. That fact will break a masked implementation in §7.5.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Hamming weight and Hamming distance of the register value going from 0x19 to 0xd4" fill="currentColor" font-size="14">
<text x="20" y="30" font-weight="bold">register before:</text>
<text x="20" y="80" font-weight="bold">register after:</text>
<text x="20" y="130" font-weight="bold">bits that flip:</text>
<g style="font-family:var(--md-code-font-family,monospace)">
<rect x="180" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="196" y="32" text-anchor="middle">0</text>
<rect x="212" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="228" y="32" text-anchor="middle">0</text>
<rect x="244" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="260" y="32" text-anchor="middle">0</text>
<rect x="276" y="12" width="32" height="28" fill="currentColor" opacity="0.15"/><rect x="276" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="292" y="32" text-anchor="middle">1</text>
<rect x="308" y="12" width="32" height="28" fill="currentColor" opacity="0.15"/><rect x="308" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="324" y="32" text-anchor="middle">1</text>
<rect x="340" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="356" y="32" text-anchor="middle">0</text>
<rect x="372" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="388" y="32" text-anchor="middle">0</text>
<rect x="404" y="12" width="32" height="28" fill="currentColor" opacity="0.15"/><rect x="404" y="12" width="32" height="28" fill="none" stroke="currentColor"/><text x="420" y="32" text-anchor="middle">1</text>
<rect x="180" y="62" width="32" height="28" fill="currentColor" opacity="0.15"/><rect x="180" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="196" y="82" text-anchor="middle">1</text>
<rect x="212" y="62" width="32" height="28" fill="currentColor" opacity="0.15"/><rect x="212" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="228" y="82" text-anchor="middle">1</text>
<rect x="244" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="260" y="82" text-anchor="middle">0</text>
<rect x="276" y="62" width="32" height="28" fill="currentColor" opacity="0.15"/><rect x="276" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="292" y="82" text-anchor="middle">1</text>
<rect x="308" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="324" y="82" text-anchor="middle">0</text>
<rect x="340" y="62" width="32" height="28" fill="currentColor" opacity="0.15"/><rect x="340" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="356" y="82" text-anchor="middle">1</text>
<rect x="372" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="388" y="82" text-anchor="middle">0</text>
<rect x="404" y="62" width="32" height="28" fill="none" stroke="currentColor"/><text x="420" y="82" text-anchor="middle">0</text>
<text x="196" y="132" text-anchor="middle">↑</text><text x="228" y="132" text-anchor="middle">↑</text>
<text x="260" y="132" text-anchor="middle">·</text><text x="292" y="132" text-anchor="middle">·</text>
<text x="324" y="132" text-anchor="middle">↓</text><text x="356" y="132" text-anchor="middle">↑</text>
<text x="388" y="132" text-anchor="middle">·</text><text x="420" y="132" text-anchor="middle">↓</text>
</g>
<text x="450" y="32">0x19, weight 3</text>
<text x="450" y="82">0xd4, weight 4</text>
<text x="450" y="132">distance 5</text>
<line x1="20" y1="160" x2="620" y2="160" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="20" y="188" font-size="13">Hamming weight model (precharged bus): the leak follows the 1 bits of the new value: 4.</text>
<text x="20" y="212" font-size="13">Hamming distance model (register): the leak follows the bits that change: 5.</text>
</svg>
<figcaption>Figure 7.2. One register write, two models. The S-box output 0xd4 overwrites its input 0x19. A precharged bus leaks the weight of the new value; a register leaks the number of flipped bits, which depends on both values.</figcaption>
</figure>

**The defender's first number: signal-to-noise ratio.** The attacker's success depends
on one quantity, the **signal-to-noise ratio** of the moment they attack:

$$
\mathrm{SNR} = \frac{\operatorname{Var}\big(\mathbb{E}[t \mid v]\big)}{\mathbb{E}\big[\operatorname{Var}(t \mid v)\big]} ,
$$

the variance that the value $v$ causes, divided by the variance of everything else.
Cryptanalysis §17.7 shows that the correlation a perfect model reaches is
$\rho = 1/\sqrt{1 + 1/\mathrm{SNR}}$ and that an attack needs about $28/\rho^2$ traces
to pick the right key byte out of 256 with high confidence. A defender can measure the
SNR of their own chip, and should, because unlike the attacker they know the key and
can log every intermediate value. Group the traces by the value $v$ at one sample,
compute the mean and variance of each group, and divide. The code below does this for
a simulated sample with Hamming weight leakage and noise of standard deviation 2, as
in book 1 and Cryptanalysis, first for an unprotected value, then for a value masked
with a fresh random byte (the subject of §7.3), grouped once by the secret and once by
the masked share the chip actually handles:

```python
import random

rng = random.Random(42)
HW = [bin(v).count("1") for v in range(256)]

def snr(values, samples):
    """Variance of the class means over the mean of the class variances."""
    groups = {}
    for v, t in zip(values, samples):
        groups.setdefault(v, []).append(t)
    means = [sum(g) / len(g) for g in groups.values()]
    noise = [sum((x - m) ** 2 for x in g) / len(g) for g, m in zip(groups.values(), means)]
    mu = sum(means) / len(means)
    return sum((m - mu) ** 2 for m in means) / len(means) / (sum(noise) / len(noise))

N = 50000
secret = [rng.randrange(256) for _ in range(N)]       # the value we want to protect
mask = [rng.randrange(256) for _ in range(N)]
plain = [HW[v] + rng.gauss(0, 2) for v in secret]
masked = [HW[v ^ m] + rng.gauss(0, 2) for v, m in zip(secret, mask)]
print("unmasked, grouped by secret:  ", round(snr(secret, plain), 3))
print("masked, grouped by secret:    ", round(snr(secret, masked), 3))
print("masked, grouped by the share: ", round(snr([v ^ m for v, m in zip(secret, mask)], masked), 3))
```

It prints:

```
unmasked, grouped by secret:   0.514
masked, grouped by secret:     0.005
masked, grouped by the share:  0.5
```

The unprotected value has an SNR of about $2/4 = 0.5$: the Hamming weight of a random
byte has variance 2 and the noise has variance 4. The masked value, grouped by the
secret, measures 0.005, and that is not a small leak: with 256 groups of about 195
traces each, every group mean carries sampling noise of variance $6/195$, and
$0.03/6 \approx 0.005$ is exactly what pure noise produces. The last line is the lesson.
Grouped by the share the chip really handles, the SNR is 0.5 again. **Masking does
not make the chip leak less.** Every share still leaks fully; masking only cuts the
connection between what leaks and the secret. That is why masking is always measured
by attacking it (§7.4), never by measuring a smaller signal.

**The defender's levers.** The traces an attacker needs grow like $1/\rho^2$, and
$\rho$ depends on three things the designer controls: the signal $a$ (small
transistors, balanced logic, low supply voltage), the noise $\sigma$ (other activity,
deliberate noise sources, shuffling), and the **order** of the leak, which masking
raises (§7.5). The first two buy constant factors. The third buys exponents, and it is
the reason masking is the backbone of every certified secure chip.

**What to do.**

1. Decide which values are secret, and which moments of the computation handle them,
   before choosing countermeasures; a key schedule, a nonce inversion and a CRC over a
   key all count.
2. Know your leakage model. Software on a microcontroller leaks Hamming distance
   between consecutive register values and bus transfers; design for that, not for
   the textbook Hamming weight.
3. Measure the SNR of your own device with known keys and logged intermediates. If you
   cannot measure, assume the attacker's SNR is better than yours.
4. Turn the SNR into a trace count with $N \approx 28/\rho^2$, and compare it with how
   many operations an attacker can make the device perform under one key.

## 7.3 Boolean masking of AES's first round

*Level: intermediate.*

The idea of masking was published twice in 1999, independently. Louis Goubin and
Jacques Patarin, at Bull's smart-card division in France, described a "duplication
method" for DES that split each variable in two; Suresh Chari, Charanjit Jutla, Josyula
Rao and Pankaj Rohatgi, at IBM, gave the general idea a statistical argument at CRYPTO
1999: if every intermediate value is split into $d + 1$ random shares, and each
measurement is noisy, the number of traces an attacker needs grows exponentially in
$d$. The smart-card industry had been hit by Kocher's differential power analysis in
1998 and adopted masking at once.

**The shares.** A **first-order Boolean masking** replaces each secret byte $x$ with a
pair $(x \oplus m, m)$, where $m$ is a fresh random byte for every execution. Either
share alone is a uniformly random byte, whatever $x$ is: for a fixed $x$, as $m$ runs
over all 256 values, so does $x \oplus m$. So any single intermediate value, and any
single sample of a trace, is independent of the secret. The secret exists only in the
pair.

**Linear steps are free.** XOR commutes with masking:
$(x \oplus m) \oplus k = (x \oplus k) \oplus m$. AddRoundKey can be applied to the
masked byte without ever removing the mask, and the mask comes through unchanged.
ShiftRows moves bytes, and their masks move with them. MixColumns is linear over XOR,
so $\mathrm{MC}(s \oplus m) = \mathrm{MC}(s) \oplus \mathrm{MC}(m)$: apply it to the
masked state and, separately, to the mask state, and the pair stays a valid sharing.
Every step of AES except one is linear in this sense.

**The S-box is not.** $S(x \oplus m) \ne S(x) \oplus S(m)$, so the S-box cannot be
applied share by share. The oldest answer, described for the AES candidates by Thomas
Messerges in 2000, is to **recompute the table**. At the start of each encryption,
choose two random bytes, an input mask $m_{\text{in}}$ and an output mask
$m_{\text{out}}$, and build a masked table $T$ with

$$
T[x \oplus m_{\text{in}}] = S[x] \oplus m_{\text{out}} \qquad \text{for all } x .
$$

Then a byte masked with $m_{\text{in}}$ goes in and comes out masked with
$m_{\text{out}}$: $T[x \oplus m_{\text{in}}] = S(x) \oplus m_{\text{out}}$. The
unmasked $x$ and $S(x)$ are never computed. The table loop handles only $S[x]$, which is
public, and the masks.

**By hand,** with the FIPS 197 byte from §7.2 ($p = $ `0x32`, $k = $ `0x2b`) and
masks $m_{\text{in}} = $ `0x5a`, $m_{\text{out}} = $ `0xc3`:

$$
\begin{aligned}
p \oplus m_{\text{in}} &= \texttt{0x32} \oplus \texttt{0x5a} = \texttt{0x68} \\
(p \oplus m_{\text{in}}) \oplus k &= \texttt{0x68} \oplus \texttt{0x2b} = \texttt{0x43}
\qquad (= \texttt{0x19} \oplus \texttt{0x5a}) \\
T[\texttt{0x43}] &= S[\texttt{0x43} \oplus \texttt{0x5a}] \oplus \texttt{0xc3}
= S[\texttt{0x19}] \oplus \texttt{0xc3} = \texttt{0xd4} \oplus \texttt{0xc3} = \texttt{0x17} \\
\texttt{0x17} \oplus m_{\text{out}} &= \texttt{0xd4} = S(p \oplus k) .
\end{aligned}
$$

The values the chip writes are `0x68`, `0x43` and `0x17`, with weights 3, 3 and 4. The
next encryption has different masks and writes different values, with no relation to
`0x19` or `0xd4` that can be seen one value at a time.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Masked table recomputation: the masked byte passes through AddRoundKey and the masked table without ever being unmasked" fill="currentColor" font-size="14">
<rect x="10" y="20" width="100" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="45" text-anchor="middle">p</text>
<rect x="170" y="20" width="110" height="40" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="170" y="20" width="110" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="225" y="45" text-anchor="middle">p ⊕ m_in</text>
<rect x="330" y="20" width="130" height="40" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="330" y="20" width="130" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="395" y="45" text-anchor="middle">x ⊕ m_in</text>
<rect x="510" y="20" width="120" height="40" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="510" y="20" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="570" y="45" text-anchor="middle">S(x) ⊕ m_out</text>
<line x1="110" y1="40" x2="164" y2="40" stroke="currentColor" stroke-width="1.4"/>
<polygon points="170,40 163,36 163,44"/>
<text x="138" y="32" text-anchor="middle" font-size="12">⊕ m_in</text>
<line x1="280" y1="40" x2="324" y2="40" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,40 323,36 323,44"/>
<text x="305" y="32" text-anchor="middle" font-size="12">⊕ k</text>
<line x1="460" y1="40" x2="504" y2="40" stroke="currentColor" stroke-width="1.4"/>
<polygon points="510,40 503,36 503,44"/>
<text x="485" y="32" text-anchor="middle" font-size="12">T[·]</text>
<rect x="330" y="120" width="300" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="480" y="145" text-anchor="middle">masked table T, rebuilt per encryption</text>
<text x="480" y="170" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T[x ⊕ m_in] = S[x] ⊕ m_out</text>
<line x1="485" y1="120" x2="485" y2="66" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<polygon points="485,60 481,67 489,67"/>
<rect x="10" y="130" width="130" height="50" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="152" text-anchor="middle">fresh random</text>
<text x="75" y="170" text-anchor="middle">m_in, m_out</text>
<line x1="140" y1="155" x2="324" y2="155" stroke="currentColor" stroke-width="1.2"/>
<polygon points="330,155 323,151 323,159"/>
<line x1="75" y1="130" x2="200" y2="66" stroke="currentColor" stroke-width="1.2"/>
<polygon points="205,62 197,63 201,70"/>
<text x="20" y="230" font-size="13">Shaded: every value the chip writes. Each one alone is a uniformly random byte;</text>
<text x="20" y="250" font-size="13">x = p ⊕ k and S(x) never appear. The caller keeps S(x) ⊕ m_out together with m_out.</text>
</svg>
<figcaption>Figure 7.3. Masked table recomputation. Two fresh masks per encryption; the table maps input-masked bytes to output-masked S-box values, so the round runs on shares from start to end.</figcaption>
</figure>

**Code it.** The masked first round (AddRoundKey and SubBytes) for all sixteen bytes,
with the S-box generated from the inverse in $\mathrm{GF}(2^8)$ and the affine map, as
in book 1 Chapter 7. The masks come from `secrets`, as on a real device; the test
runs the masked round 1,000 times with different masks and checks every result
against the plain round and against the value FIPS 197 gives for its Appendix C.1
example (round 1, after SubBytes):

```python
import secrets

def gmul(a, b):                       # multiply in GF(2^8) modulo x^8+x^4+x^3+x+1
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):                  # the S-box: inverse (0 maps to 0), then the affine map
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)

def first_round(p, k):                # AddRoundKey, then SubBytes, the plain way
    return bytes(S[a ^ b] for a, b in zip(p, k))

def masked_first_round(p, k):
    m_in, m_out = secrets.randbelow(256), secrets.randbelow(256)    # fresh every call
    T = [0] * 256
    for x in range(256):              # the masked table: T[x ^ m_in] = S[x] ^ m_out
        T[x ^ m_in] = S[x] ^ m_out
    share = [a ^ m_in for a in p]     # mask the plaintext before the key touches it
    share = [a ^ b for a, b in zip(share, k)]          # AddRoundKey on masked bytes
    share = [T[a] for a in share]     # SubBytes: still masked, now by m_out
    return bytes(share), m_out        # the result stays split in two shares

p = bytes.fromhex("00112233445566778899aabbccddeeff")    # FIPS 197, Appendix C.1
k = bytes.fromhex("000102030405060708090a0b0c0d0e0f")
print(first_round(p, k).hex())
ok = True
for _ in range(1000):
    share, m = masked_first_round(p, k)
    ok &= bytes(a ^ m for a in share) == first_round(p, k)
print("1000 masked runs, all correct:", ok)
```

It prints:

```
63cab7040953d051cd60e0e7ba70e18c
1000 masked runs, all correct: True
```

The first line is the `round[ 1].s_box` value of FIPS 197's AES-128 example. A real
implementation goes on: ShiftRows on both shares, MixColumns on the masked state and
on the mask state, the next round key, and a new input mask for the next round's table
(or a remasking step that converts $m_{\text{out}}$-masked bytes into
$m_{\text{in}}$-masked ones without ever exposing them, by XORing in
$m_{\text{in}} \oplus m_{\text{out}}$). The mask is removed once, at the very end,
when the ciphertext is public anyway.

**What it costs.** Building $T$ is 256 table writes per encryption, about as much work
as the ten rounds of byte-oriented AES itself, plus 256 bytes of RAM, which on the
smart cards of 2000 was a real price. It also needs two fresh random bytes per
encryption (more with one mask per byte or per round), and the randomness must be
good: a mask from a weak generator is a mask the attacker can predict. Faster schemes
mask the S-box algebraically instead: the S-box is an inversion in $\mathrm{GF}(2^8)$
followed by an affine map, the affine map is linear, and the inversion can be computed
on shares with masked multiplications (§7.7).

!!! note "Life story: Boolean masking"
    **Born:** 1999, independently by Louis Goubin and Jacques Patarin (Bull CP8, the
    "duplication method" for DES, CHES 1999) and by Suresh Chari, Charanjit Jutla,
    Josyula Rao and Pankaj Rohatgi (IBM, "Towards Sound Approaches to Counteract
    Power-Analysis Attacks", CRYPTO 1999); masked tables for the AES candidates by
    Thomas Messerges (FSE 2000) · **Purpose:** to make every intermediate value of a
    cipher independent of the key by splitting it into random shares · **Helped:** the
    standard countermeasure in smart cards, secure elements and certified hardware;
    given proofs by Ishai, Sahai and Wagner (2003) and by the noisy-leakage results of
    2013 and 2014 · **Status:** current; extended to arithmetic masking for
    post-quantum schemes, and still broken in practice whenever two shares meet
    (§7.5, §7.7)

**What to do.**

1. Mask from the first operation that touches the key or the plaintext to the last.
   A masked round with an unmasked key schedule, or with an unmasked final round,
   protects nothing.
2. Draw masks from a real random generator, fresh for every execution. A mask that is
   constant, reused or predictable is not a mask.
3. Keep masked values and their masks apart: in different registers, written at
   different times, never XORed together until the result is public (§7.5 shows why).
4. Test the masked code for correctness against standard vectors with many different
   masks; a masking bug that appears for one mask in 256 is easy to miss.

## 7.4 Attacking your own masked code

*Level: intermediate.*

A defender who claims "masked" has made a statement about the statistics of millions
of traces, and the only honest test of it is to run the attacks. This section does so
on a simulated chip, in the same style as Cryptanalysis §17.7: every value the code
writes leaks its Hamming weight plus Gaussian noise of standard deviation 2, and the
noise generator has a fixed seed so the output below is exactly what you will get.
The difference is that here the trace is produced by the defender's code itself. The
simulated chip runs the first round, unmasked or masked as in §7.3, and records one
sample for each value it writes: for each of the sixteen bytes, the loaded plaintext
byte, the byte after AddRoundKey and the S-box output, and, in the masked version, the
two masks at the start. (The 256 writes of the table loop depend only on the masks and
on the public S-box, so they are left out to keep the traces short; §7.10 comes back to
them.)

The attack is the attacker's correlation power analysis from Cryptanalysis §17.7, with
one engineering change that makes 20,000 traces cheap in Python: the prediction
$\mathrm{HW}(S(p_0 \oplus g))$ depends on the trace only through the plaintext byte
$p_0$, so the traces are first summed into 256 groups by $p_0$, and the correlation for
each guess is computed from the group sums. Evaluation labs do the same thing with
running sums, so that a correlation over a hundred million traces needs one pass. The
attack scans every sample of the trace and keeps, for each guess, its largest
correlation anywhere:

```python
import random

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):                  # the AES S-box: inverse, then the affine map
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)
HW = [bin(v).count("1") for v in range(256)]

rng = random.Random(3)                # the lab's random source, seeded so runs repeat
KEY = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")   # FIPS 197's example key
SIGMA = 2.0                           # noise, as in the attacker's chapter

def run(p, masked):
    """One first round on the simulated chip. Returns the trace: one noisy
    Hamming weight for every value the code writes, in order."""
    seen = []
    if masked:
        m_in, m_out = rng.randrange(256), rng.randrange(256)
        seen += [m_in, m_out]         # the masks are loaded into registers
        T = [0] * 256
        for x in range(256):          # table writes depend only on the masks
            T[x ^ m_in] = S[x] ^ m_out    # (left out of the trace to keep it short)
        for a, b in zip(p, KEY):
            seen += [a ^ m_in, a ^ m_in ^ b, T[a ^ m_in ^ b]]
    else:
        for a, b in zip(p, KEY):
            seen += [a, a ^ b, S[a ^ b]]
    return [HW[v] + rng.gauss(0, SIGMA) for v in seen]

def collect(n, masked):
    plains = [bytes(rng.randrange(256) for _ in range(16)) for _ in range(n)]
    return [p[0] for p in plains], [run(p, masked) for p in plains]

def cpa(p0, leak):
    """Correlation of HW(S[p0 ^ g]) with one column of samples, for all 256 g.
    Traces are grouped by p0 first, so each guess costs 256 steps, not N."""
    n, cnt, tot = len(leak), [0] * 256, [0.0] * 256
    for p, t in zip(p0, leak):
        cnt[p] += 1
        tot[p] += t
    st, stt = sum(leak), sum(t * t for t in leak)
    vt = stt - st * st / n
    out = []
    for g in range(256):
        h = [HW[S[v ^ g]] for v in range(256)]
        sh = sum(c * x for c, x in zip(cnt, h))
        shh = sum(c * x * x for c, x in zip(cnt, h))
        sht = sum(x * t for x, t in zip(h, tot))
        out.append((sht - sh * st / n) / ((shh - sh * sh / n) * vt) ** 0.5)
    return out

def attack(p0, traces):               # scan every sample, keep each guess's best
    best = [0.0] * 256
    where = [0] * 256
    for j in range(len(traces[0])):
        for g, r in enumerate(cpa(p0, [t[j] for t in traces])):
            if abs(r) > best[g]:
                best[g], where[g] = abs(r), j
    order = sorted(range(256), key=lambda g: -best[g])
    return order, best, where

for masked, n in ((False, 200), (True, 20000)):
    p0, traces = collect(n, masked)
    order, best, where = attack(p0, traces)
    print("masked" if masked else "plain", n, "traces of", len(traces[0]), "samples")
    print("  best guess", hex(order[0]), "corr", round(best[order[0]], 3), "at sample", where[order[0]])
    print("  true key", hex(KEY[0]), "ranks", order.index(KEY[0]) + 1, "of 256")
```

It prints:

```
plain 200 traces of 48 samples
  best guess 0x2b corr 0.548 at sample 2
  true key 0x2b ranks 1 of 256
masked 20000 traces of 50 samples
  best guess 0x6a corr 0.025 at sample 14
  true key 0x2b ranks 229 of 256
```

**Unmasked,** the attack works as the attacker's chapter says it should. The right key
byte `0x2b` wins with a correlation of 0.548, close to the theoretical
$\sqrt{2/(2+4)} \approx 0.577$, at sample 2, the S-box output of byte 0. (Samples 0 and 1
leak too, the plaintext byte and the byte after AddRoundKey, but they do not
correlate with an S-box prediction for a wrong key, and only weakly for the right one.)
Two hundred traces are far more than enough: the next section measures that about 50
suffice.

**Masked,** with a hundred times as many traces, nothing. The best guess, `0x6a`, scores
0.025 at sample 14, which belongs to a different byte altogether; the true key ranks
229th of 256. Is 0.025 significant? With $N = 20{,}000$, a correlation between
independent variables has standard deviation $1/\sqrt{N} \approx 0.0071$, and the
attack took the largest of $256 \times 50 = 12{,}800$ such values. The largest of that
many normal values is about $\sqrt{2 \ln 12{,}800} \approx 4.35$ standard deviations,
or 0.031. The best score is noise. Run the code with other seeds and the true key's
rank wanders anywhere from 1 to 256, as it should when the traces carry no
first-order information about it.

This is what masking promises, and it is exactly as strong as its precondition: every
**single** sample is independent of the key. The precondition says nothing about two
samples taken together.

## 7.5 The second-order attack, and what masking really buys

*Level: expert.*

The masked trace still contains the secret. Sample 1 leaks $\mathrm{HW}(m_{\text{out}})$
and sample 4 leaks $\mathrm{HW}(z \oplus m_{\text{out}})$ with $z = S(p_0 \oplus k_0)$.
Neither alone depends on $z$, but they share $m_{\text{out}}$, and their joint
distribution does. Thomas Messerges showed in 2000 how to exploit this in practice
with a **second-order** attack: combine the two samples into one value that depends on
$z$, then run the ordinary attack on the combination. The usual combination is the
**centered product**

$$
c = \big(t_1 - \bar t_1\big)\big(t_4 - \bar t_4\big) .
$$

Cryptanalysis §17.12 works out its expectation bit by bit: for Hamming weight leakage,
$\mathbb{E}[c \mid z] = 2 - \tfrac12 \mathrm{HW}(z)$. The product depends on the
S-box output again, linearly, with a negative sign. A correlation attack on $c$ with
the usual model then finds the key, with a negative correlation.

**What it costs the attacker.** The defender wants this as a number. Write $V = 2 +
\sigma^2$ for the variance of one sample (2 from the Hamming weight of a random byte,
$\sigma^2$ from the noise). The unmasked attack reaches

$$
\rho_1 = \frac{\operatorname{Cov}(\mathrm{HW}(z),\, \mathrm{HW}(z) + n)}{\sqrt{2 V}} = \sqrt{\frac{2}{V}} .
$$

For the product, $\operatorname{Cov}(c, \mathrm{HW}(z)) = -\tfrac12
\operatorname{Var}(\mathrm{HW}(z)) = -1$, and the variance of the product of two
centered, nearly independent samples is about $V^2$, so

$$
\rho_2 \approx \frac{-1}{\sqrt 2 \, V} , \qquad
\frac{N_2}{N_1} = \frac{\rho_1^2}{\rho_2^2} \approx 4V = 4(2 + \sigma^2) .
$$

With $\sigma = 2$ the second-order attack should reach $|\rho_2| \approx 0.118$ and need
about 24 times as many traces as the unmasked one. The ratio grows with the noise
variance: at $\sigma = 10$ it is about 400. That is Chari, Jutla, Rao and Rohatgi's 1999
argument in one line. Masking turns noise from an additive nuisance into a
multiplicative one, and each further share multiplies the cost again by a factor of
the order of the noise variance. Masking without noise is worthless (a noiseless
product reveals $z$ in a handful of traces); masking with a lot of noise is the
strongest countermeasure known.

**Code it.** The same chip, 40,000 masked traces, a second-order attack on the
centered product of samples 1 and 4, and then the success rate as a function of the
number of traces, over disjoint slices of the traces: first for the unmasked chip and
the first-order attack, then for the masked chip and the second-order attack. The
attacker is given the two sample positions here; a real attacker without a profiling
device must search pairs of samples, which costs computation but not traces.

```python
import random

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):                  # the AES S-box: inverse, then the affine map
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)
HW = [bin(v).count("1") for v in range(256)]

rng = random.Random(2000)                # the lab's random source, seeded so runs repeat
KEY = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")   # FIPS 197's example key
SIGMA = 2.0                           # noise, as in the attacker's chapter

def run(p, masked):
    """One first round on the simulated chip. Returns the trace: one noisy
    Hamming weight for every value the code writes, in order."""
    seen = []
    if masked:
        m_in, m_out = rng.randrange(256), rng.randrange(256)
        seen += [m_in, m_out]         # the masks are loaded into registers
        T = [0] * 256
        for x in range(256):          # table writes depend only on the masks
            T[x ^ m_in] = S[x] ^ m_out    # (left out of the trace to keep it short)
        for a, b in zip(p, KEY):
            seen += [a ^ m_in, a ^ m_in ^ b, T[a ^ m_in ^ b]]
    else:
        for a, b in zip(p, KEY):
            seen += [a, a ^ b, S[a ^ b]]
    return [HW[v] + rng.gauss(0, SIGMA) for v in seen]

def collect(n, masked):
    plains = [bytes(rng.randrange(256) for _ in range(16)) for _ in range(n)]
    return [p[0] for p in plains], [run(p, masked) for p in plains]

def cpa(p0, leak):                    # as before: group by p0, then correlate
    n, cnt, tot = len(leak), [0] * 256, [0.0] * 256
    for p, t in zip(p0, leak):
        cnt[p] += 1
        tot[p] += t
    st, stt = sum(leak), sum(t * t for t in leak)
    out = []
    for g in range(256):
        h = [HW[S[v ^ g]] for v in range(256)]
        sh = sum(c * x for c, x in zip(cnt, h))
        shh = sum(c * x * x for c, x in zip(cnt, h))
        sht = sum(x * t for x, t in zip(h, tot))
        out.append((sht - sh * st / n) / ((shh - sh * sh / n) * (stt - st * st / n)) ** 0.5)
    return out

def best_guess(p0, leak):
    r = cpa(p0, leak)
    return max(range(256), key=lambda g: abs(r[g])), r

def centered_product(traces, j0, j1):
    a, b = [t[j0] for t in traces], [t[j1] for t in traces]
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    return [(x - ma) * (y - mb) for x, y in zip(a, b)]

p0, traces = collect(40000, True)     # masked: sample 1 is m_out, sample 4 is S[p0^k0]^m_out
g, r = best_guess(p0, centered_product(traces, 1, 4))
print("second order, 40000 traces: best", hex(g), "corr", round(r[g], 3),
      "| next best", round(sorted(abs(x) for x in r)[-2], 3))

def success(p0, traces, n, leak_of, runs=20):
    runs = min(runs, len(traces) // n)            # disjoint slices of the traces
    wins = sum(best_guess(p0[i * n:(i + 1) * n], leak_of(traces[i * n:(i + 1) * n]))[0] == KEY[0]
               for i in range(runs))
    return f"{wins}/{runs}"

q0, plain = collect(2000, False)      # unmasked: the S-box output is sample 2
print("unmasked, first order: ", {n: success(q0, plain, n, lambda ts: [t[2] for t in ts])
                                  for n in (10, 25, 50, 100)})
print("masked, second order:  ", {n: success(p0, traces, n, lambda ts: centered_product(ts, 1, 4))
                                  for n in (250, 500, 1000, 2000, 4000)})
```

It prints:

```
second order, 40000 traces: best 0x2b corr -0.114 | next best 0.03
unmasked, first order:  {10: '1/20', 25: '8/20', 50: '18/20', 100: '20/20'}
masked, second order:   {250: '0/20', 500: '5/20', 1000: '15/20', 2000: '19/20', 4000: '10/10'}
```

The key is back, with a correlation of $-0.114$ against the predicted $-0.118$, and
the best wrong guess is at 0.03. The success rates show the price. Unmasked, 50 traces
find the key 18 times in 20 and 100 always do; masked, it takes 1,000 traces for 15 in
20, 2,000 for 19 in 20, and 4,000 for certainty. The ratio at matching success rates
is 20 to 40, around the predicted 24.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Success rate of the attack against the number of traces, unmasked with first-order CPA and masked with second-order CPA" fill="currentColor" font-size="14">
<line x1="50" y1="200" x2="610" y2="200" stroke="currentColor" stroke-width="1.4"/>
<line x1="50" y1="200" x2="50" y2="30" stroke="currentColor" stroke-width="1.4"/>
<text x="44" y="204" text-anchor="end" font-size="12">0</text>
<text x="44" y="124" text-anchor="end" font-size="12">50%</text>
<text x="44" y="44" text-anchor="end" font-size="12">100%</text>
<line x1="50" y1="120" x2="610" y2="120" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.6"/>
<line x1="50" y1="40" x2="610" y2="40" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" opacity="0.6"/>
<rect x="70" y="192" width="40" height="8" fill="currentColor" opacity="0.85"/>
<rect x="125" y="136" width="40" height="64" fill="currentColor" opacity="0.85"/>
<rect x="180" y="56" width="40" height="144" fill="currentColor" opacity="0.85"/>
<rect x="235" y="40" width="40" height="160" fill="currentColor" opacity="0.85"/>
<rect x="330" y="198" width="40" height="2" fill="currentColor" opacity="0.4"/>
<rect x="385" y="160" width="40" height="40" fill="currentColor" opacity="0.4"/>
<rect x="440" y="80" width="40" height="120" fill="currentColor" opacity="0.4"/>
<rect x="495" y="48" width="40" height="152" fill="currentColor" opacity="0.4"/>
<rect x="550" y="40" width="40" height="160" fill="currentColor" opacity="0.4"/>
<text x="90" y="218" text-anchor="middle" font-size="12">10</text>
<text x="145" y="218" text-anchor="middle" font-size="12">25</text>
<text x="200" y="218" text-anchor="middle" font-size="12">50</text>
<text x="255" y="218" text-anchor="middle" font-size="12">100</text>
<text x="350" y="218" text-anchor="middle" font-size="12">250</text>
<text x="405" y="218" text-anchor="middle" font-size="12">500</text>
<text x="460" y="218" text-anchor="middle" font-size="12">1000</text>
<text x="515" y="218" text-anchor="middle" font-size="12">2000</text>
<text x="570" y="218" text-anchor="middle" font-size="12">4000</text>
<text x="172" y="242" text-anchor="middle" font-size="13">unmasked, first order</text>
<text x="460" y="242" text-anchor="middle" font-size="13">masked, second order</text>
<text x="330" y="264" text-anchor="middle" font-size="12">traces per attack (note the different scales of the two groups)</text>
</svg>
<figcaption>Figure 7.4. How often the attack finds the right key byte, from the code's output (20 runs per bar, 10 for the last). With noise of standard deviation 2, first-order masking moves the attack from about 50 traces to about 2,000.</figcaption>
</figure>

A factor of 24 is not security. It is the floor that masking sets in a simulation with
modest noise, and it tells the designer what to add. Real devices add noise from the
rest of the chip, so $\sigma$ is much larger relative to one byte's signal; and real
designs use more shares in hardware ($d = 2$ or 3), so that the attacker must combine
three or four samples, each adding a factor.

**Break it: one mask for both sides of the table.** A designer short of random bits
notices that §7.3 draws two masks per encryption, and uses one: $m_{\text{out}} =
m_{\text{in}} = m$. Every value is still masked; every single sample is still uniform
under a Hamming weight model. But on a microcontroller the register that held
$x \oplus m$ is overwritten with $S(x) \oplus m$, and the register leaks the Hamming
distance between them:

$$
\mathrm{HW}\big((x \oplus m) \oplus (S(x) \oplus m)\big) = \mathrm{HW}\big(x \oplus S(x)\big) .
$$

The mask cancels. With the numbers of §7.2 and $m = $ `0x5a`: the register goes from
`0x43` to $\texttt{0xd4} \oplus \texttt{0x5a} = \texttt{0x8e}$, and
$\mathrm{HW}(\texttt{0x43} \oplus \texttt{0x8e}) = \mathrm{HW}(\texttt{0xcd}) = 5$,
the same distance as the unmasked chip of Figure 7.2. A first-order attack with the
model $\mathrm{HW}(x \oplus S(x))$, $x = p_0 \oplus g$, takes the key as easily as from
an unmasked chip:

```python
import random

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)
HW = [bin(v).count("1") for v in range(256)]
rng = random.Random(6)
KEY = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")

def run(p, one_mask):
    """The masked first round on a chip whose register leaks the Hamming
    distance between its old and new contents."""
    m_in = rng.randrange(256)
    m_out = m_in if one_mask else rng.randrange(256)   # the "saving" in the broken version
    T = [0] * 256
    for x in range(256):
        T[x ^ m_in] = S[x] ^ m_out
    trace, reg = [], 0
    for a, b in zip(p, KEY):
        for new in (a ^ m_in, a ^ m_in ^ b):
            trace.append(HW[reg ^ new] + rng.gauss(0, 2))
            reg = new
        new = T[reg]
        trace.append(HW[reg ^ new] + rng.gauss(0, 2))
        reg = new
    return trace

def cpa(p0, leak, model):
    n, cnt, tot = len(leak), [0] * 256, [0.0] * 256
    for p, t in zip(p0, leak):
        cnt[p] += 1
        tot[p] += t
    st, stt = sum(leak), sum(t * t for t in leak)
    out = []
    for g in range(256):
        h = [model(v ^ g) for v in range(256)]
        sh = sum(c * x for c, x in zip(cnt, h))
        shh = sum(c * x * x for c, x in zip(cnt, h))
        sht = sum(x * t for x, t in zip(h, tot))
        out.append((sht - sh * st / n) / ((shh - sh * sh / n) * (stt - st * st / n)) ** 0.5)
    return out

distance = lambda x: HW[x ^ S[x]]     # the attacker's new model: x -> S[x] in one register
for one_mask, n in ((True, 300), (False, 20000)):
    plains = [bytes(rng.randrange(256) for _ in range(16)) for _ in range(n)]
    traces = [run(p, one_mask) for p in plains]
    r = cpa([p[0] for p in plains], [t[2] for t in traces], distance)
    order = sorted(range(256), key=lambda g: -abs(r[g]))
    print("one mask " if one_mask else "two masks", n, "traces: top", hex(order[0]), round(r[order[0]], 3),
          "| key", hex(KEY[0]), "rank", order.index(KEY[0]) + 1)
```

It prints:

```
one mask  300 traces: top 0x2b 0.618 | key 0x2b rank 1
two masks 20000 traces: top 0xde -0.022 | key 0x2b rank 163
```

Three hundred traces give the key with a correlation of 0.618, as strong as no masking
at all.

**Fix it.** With two independent masks the same transition leaks
$\mathrm{HW}(x \oplus S(x) \oplus m_{\text{in}} \oplus m_{\text{out}})$, and
$m_{\text{in}} \oplus m_{\text{out}}$ is a uniformly random byte: 20,000 traces give
nothing. More generally, a masked implementation must be designed for the leakage
model of the hardware it runs on. In software that means: never let two shares of the
same value, or two values masked with the same mask, meet in one register, one bus
transfer or one memory write one after the other. Clear registers between them, or
write a random value in between (both cost cycles), and check the compiled code,
because a compiler that reuses a register for two variables can create the transition
the source code avoided. Bus and memory transfers leak transitions too, and so do
pipelined processors that keep the previous operand on an internal bus. Several
published breaks of masked software on Arm Cortex-M cores came from exactly this, and
the cure is always the same: test the binary on the target, not the source in a model
(§7.10).

**What to do.**

1. Estimate the attack cost from the noise: first-order masking multiplies the traces
   by about $4(2 + \sigma^2)$ in units where one bit leaks 1. If your noise is small,
   add noise or shares.
2. Use independent masks for independent purposes, and never save randomness by
   reusing one.
3. Assume Hamming distance leakage between consecutive values in every register and on
   every bus, and order the code so that no transition combines two shares of one
   value.
4. Test the second-order attack yourself. A design that passes first-order tests has
   only shown that the leak moved; how far it moved is the security.

## 7.6 Shuffling and hiding

*Level: intermediate.*

Masking attacks the attacker's prediction. **Hiding** attacks their measurement: it
lowers the signal, raises the noise, or moves the interesting moment around so that it
is not at the same sample in every trace. It has no security proof and it never
removes a leak, but it is cheap, it multiplies with masking, and certified chips use
several kinds at once.

**Shuffling** performs independent operations in a random order. AES's sixteen S-box
lookups in a round can run in any order, so a fresh random permutation per encryption
puts the lookup of byte 0 at any of sixteen positions. At a fixed sample, the target
leaks only one time in sixteen, and the covariance between the prediction and the
sample falls by 16. That looks like a factor of $16^2 = 256$ in traces. It is not,
because the attacker can **integrate**: add up the sixteen samples where an S-box might
be, and the target leaks in the sum every time, at the price of the noise of fifteen
other bytes. The code shows all three cases, with noise of standard deviation 2 and
3,000 traces:

```python
import random

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)
HW = [bin(v).count("1") for v in range(256)]
rng = random.Random(16)
KEY = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")

def run(p, shuffle):                  # 16 S-box outputs, one sample each
    order = list(range(16))
    if shuffle:
        rng.shuffle(order)            # a fresh random order for every encryption
    return [HW[S[p[i] ^ KEY[i]]] + rng.gauss(0, 2) for i in order]

def corr(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return sxy / (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** 0.5

def rank(p0, leak):
    score = [abs(corr([HW[S[p ^ g]] for p in p0], leak)) for g in range(256)]
    return sorted(range(256), key=lambda g: -score[g]).index(KEY[0]) + 1, round(score[KEY[0]], 3)

N = 3000
plains = [bytes(rng.randrange(256) for _ in range(16)) for _ in range(N)]
p0 = [p[0] for p in plains]
plain = [run(p, False) for p in plains]
mixed = [run(p, True) for p in plains]
print("in order, sample 0:     ", rank(p0, [t[0] for t in plain]))
print("shuffled, sample 0:     ", rank(p0, [t[0] for t in mixed]))
print("shuffled, sum of all 16:", rank(p0, [sum(t) for t in mixed]))
```

It prints (rank of the true key, its correlation):

```
in order, sample 0:      (1, 0.575)
shuffled, sample 0:      (235, 0.002)
shuffled, sum of all 16: (1, 0.155)
```

The theory predicts each number. In order, $\rho = \sqrt{2/6} = 0.577$. Shuffled, at one
sample, the covariance is $2/16$ and $\rho = (2/16)/\sqrt{2 \cdot 6} = 0.036$, too small
to find with 3,000 traces (the attack needs about $28/\rho^2 \approx 21{,}600$).
Integrated, the covariance is back to 2 but the sum has variance $16 \cdot 6 = 96$, so
$\rho = 2/\sqrt{2 \cdot 96} = 0.144$, which needs about 1,350 traces. Shuffling over
sixteen positions bought a factor of 16 in traces against a competent attacker, not
256. The general rule: shuffling over $n$ positions costs an integrating attacker about
a factor $n$, and a naive one $n^2$.

The same arithmetic applies to the other hiding techniques.

- **Random delays** and dummy instructions move the target in time. Christophe
  Clavier, Jean-Sébastien Coron and Nora Dabbous showed in 2000 that integrating over
  a window defeats them in the same way, and Coron and Ilya Kizhvatov's "floating mean"
  method (CHES 2009) chooses delays so that their sum varies as much as possible, which
  makes integration and realignment harder. Attackers realign traces by pattern
  matching, and since about 2017 convolutional neural networks trained on profiling
  traces tolerate misalignment by design (Cryptanalysis §17.15).
- **Dummy operations and dummy rounds** add computations on random data, in random
  positions, that the attacker cannot tell apart from the real ones.
- **Noise generators** on the chip, switched on during cryptographic operations, raise
  $\sigma$ directly; every factor of 2 in $\sigma$ is a factor of 4 in traces for an
  unmasked chip and of up to 16 for a first-order masked one.
- **Balanced logic** draws the same current whatever the data. Kris Tiri and Ingrid
  Verbauwhede's wave dynamic differential logic (WDDL, 2004) computes every signal on
  two wires, one true and one complemented, precharged each cycle, so that exactly one
  of each pair switches. In practice the two wires never balance exactly, and the
  residual leak is small but present.
- **Clock jitter and frequency changes** move the whole computation in time, which
  hardware attackers handle with the same realignment.

Hiding and masking combine multiplicatively. A first-order masked AES whose sixteen
S-boxes are also shuffled forces the attacker to combine two samples, each spread over
sixteen positions; the second-order product then integrates over $16 \times 16$ pairs,
or a more clever pair of windows, and loses a factor of 16 or more on top of masking.
This is how smart cards reach trace counts in the millions with first-order masking
only.

**What to do.**

1. Shuffle every set of independent operations (S-boxes, columns, limbs), with a fresh
   permutation per execution from a real random source.
2. Count shuffling's gain as $n$, not $n^2$, against an attacker who integrates.
3. Use hiding to multiply masking, never instead of it; a hiding-only design is a
   matter of how many traces the attacker can afford.
4. Do not rely on noise you did not measure. The attacker can average, filter and
   choose a quieter moment; you can only count on the noise left after they do.

## 7.7 Masking with proofs: ISW and threshold implementations

*Level: expert.*

Table recomputation masks one S-box at a time with one pair of masks, and it was
designed by intuition: list the intermediate values, check that each is masked. In
2003 Yuval Ishai, Amit Sahai and David Wagner replaced intuition with a model and a
proof. Their **probing model** gives the adversary $d$ probes, each of which reads the
exact value of one wire of the circuit during one execution. A circuit is
**$d$-probing secure** if any $d$ wires, taken together, have a distribution that does
not depend on the secrets. That is the precise form of "every single sample is
independent of the key" ($d = 1$), and of its higher-order versions.

**The ISW multiplication.** Linear operations are easy on shares, as in §7.3. ISW
showed how to multiply. For bits shared as $a = a_0 \oplus a_1$ and
$b = b_0 \oplus b_1$, the product $ab = (a_0 \oplus a_1)(b_0 \oplus b_1)$ expands into
four partial products $a_i b_j$. Computing $a$ itself, or any value that combines both
shares of $a$, would leak. ISW distributes the cross terms between the output shares
and protects them with a fresh random bit $r$:

$$
c_0 = a_0 b_0 \oplus r, \qquad
c_1 = a_1 b_1 \oplus \big((r \oplus a_0 b_1) \oplus a_1 b_0\big),
$$

and $c_0 \oplus c_1 = ab$. With $d + 1$ shares the scheme needs $d(d+1)/2$ random bits
per multiplication and is $d$-probing secure. The brackets are not decoration:
$r \oplus a_0 b_1$ must be computed first. Bracket the other way, computing
$a_0 b_1 \oplus a_1 b_0$ first, and that intermediate is always 0 when $a = b = 0$
(then $a_0 = a_1$ and $b_0 = b_1$, so the two terms are equal), but uniform when
$a = b = 1$. One probe on it tells the secrets apart.

**Code it.** For one bit and two shares the model is small enough to check by brute
force: run the gadget for every secret and every value of the shares and the random
bit, and for each wire compare its distribution across the four secrets. The second
half checks a three-share threshold implementation of AND (below) in the stronger
sense that matters for hardware:

```python
from itertools import product

def isw_and(a, b, r, careless=False):
    """ISW multiplication of two 2-share bits, a = a0^a1 and b = b0^b1, with one
    random bit r. Returns the output shares and every intermediate wire."""
    (a0, a1), (b0, b1) = a, b
    w = {"a0b0": a0 & b0, "a1b1": a1 & b1, "a0b1": a0 & b1, "a1b0": a1 & b0}
    if careless:                      # same result, other bracketing
        w["cross"] = w["a0b1"] ^ w["a1b0"]
        w["r10"] = r ^ w["cross"]
    else:                             # ISW's order: add the random bit first
        w["r^a0b1"] = r ^ w["a0b1"]
        w["r10"] = w["r^a0b1"] ^ w["a1b0"]
    w["c0"] = w["a0b0"] ^ r
    w["c1"] = w["a1b1"] ^ w["r10"]
    return (w["c0"], w["c1"]), w

def leaks(careless):
    """For every wire, the distribution over all masks and randomness, for each
    secret (a, b). A wire is safe if the distribution is the same for all four."""
    dist = {}
    for a, b in product((0, 1), repeat=2):
        for a0, b0, r in product((0, 1), repeat=3):
            (c0, c1), w = isw_and((a0, a ^ a0), (b0, b ^ b0), r, careless)
            assert c0 ^ c1 == a & b
            for name, v in w.items():
                dist.setdefault(name, {}).setdefault((a, b), [0, 0])[v] += 1
    return [n for n, d in dist.items() if len({tuple(x) for x in d.values()}) > 1]

print("ISW order, leaky wires:", leaks(False))
print("careless order, leaky wires:", leaks(True))

def ti_and(x, y):                     # three shares; each output misses one index
    (x0, x1, x2), (y0, y1, y2) = x, y
    z0 = (x1 & y1) ^ (x1 & y2) ^ (x2 & y1)      # uses shares 1 and 2 only
    z1 = (x2 & y2) ^ (x2 & y0) ^ (x0 & y2)      # uses shares 2 and 0 only
    z2 = (x0 & y0) ^ (x0 & y1) ^ (x1 & y0)      # uses shares 0 and 1 only
    return z0, z1, z2

def depends_on(i):
    """Which share indices can change output share i? Flip each input and see."""
    used = set()
    for bits in product((0, 1), repeat=6):
        for j in range(3):
            for which in (0, 1):                # flip x_j or y_j
                b = list(bits)
                b[3 * which + j] ^= 1
                if ti_and(bits[:3], bits[3:])[i] != ti_and(b[:3], b[3:])[i]:
                    used.add(j)
    return sorted(used)

for i in range(3):                    # a glitch at output i sees all of its inputs
    idx = depends_on(i)
    views = {}
    for x, y in product((0, 1), repeat=2):
        for x0, x1, y0, y1 in product((0, 1), repeat=4):
            xs, ys = (x0, x1, x ^ x0 ^ x1), (y0, y1, y ^ y0 ^ y1)
            assert ti_and(xs, ys)[0] ^ ti_and(xs, ys)[1] ^ ti_and(xs, ys)[2] == x & y
            views.setdefault((x, y), []).append(tuple(xs[j] for j in idx) + tuple(ys[j] for j in idx))
    same = len({tuple(sorted(v)) for v in views.values()}) == 1
    print(f"TI output {i} uses shares {idx}; its inputs are independent of x, y: {same}")
```

It prints:

```
ISW order, leaky wires: []
careless order, leaky wires: ['cross']
TI output 0 uses shares [1, 2]; its inputs are independent of x, y: True
TI output 1 uses shares [0, 2]; its inputs are independent of x, y: True
TI output 2 uses shares [0, 1]; its inputs are independent of x, y: True
```

ISW's order has no wire that leaks; the careless bracketing has one, `cross`, exactly
as the algebra said. This style of check, enumerating the distribution of every
wire or every set of $d$ wires, is what tools such as maskVerif (Gilles Barthe and
colleagues, 2015) do symbolically for real gadgets at higher orders, and what a
designer should run on any gadget before it goes into silicon.

**Glitches.** The probing model reads stable values of wires. Real CMOS logic is not
stable during a clock cycle: signals arrive at different times, and a gate's output
can switch several times before settling, depending on the order of its inputs. A
probe on the wire $c_1$ in hardware sees, for a moment, a function of all the inputs of
the logic that computes it: $a_0, a_1, b_0, b_1$ and $r$. That is every share, and the
proof says nothing. In 2005 Stefan Mangard, Norbert Pramstaller and Elisabeth Oswald
broke masked AES hardware in exactly this way, with first-order attacks on a design
that was masked by the book.

**Threshold implementations.** Svetla Nikova, Christian Rechberger and Vincent Rijmen
answered in 2006 with a design rule that survives glitches. Split each input into at
least three shares, and compute each output share with a component function that
never sees all the shares of any input: **non-completeness**. For AND with three
shares,

$$
\begin{aligned}
z_0 &= x_1 y_1 \oplus x_1 y_2 \oplus x_2 y_1, \\
z_1 &= x_2 y_2 \oplus x_2 y_0 \oplus x_0 y_2, \\
z_2 &= x_0 y_0 \oplus x_0 y_1 \oplus x_1 y_0,
\end{aligned}
$$

and $z_0 \oplus z_1 \oplus z_2 = xy$, because the nine partial products each appear
once. Each $z_i$ misses index $i$. Whatever glitches happen inside the logic for $z_i$,
they can only combine two of the three shares of $x$ and of $y$, and any two shares
of a three-share Boolean sharing are uniform and independent of the secret. The code
above confirms both halves: it finds by flipping inputs that each component depends
on only two share indices, and that the view of those inputs, which is everything a
glitch at that component could expose, has the same distribution for every secret.
A register after each component stops glitches from spreading to the next layer.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Threshold implementation of AND: three component functions, each fed by two of the three share indices" fill="currentColor" font-size="14">
<rect x="60" y="20" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="120" y="45" text-anchor="middle">x₀, y₀</text>
<rect x="260" y="20" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="45" text-anchor="middle">x₁, y₁</text>
<rect x="460" y="20" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="45" text-anchor="middle">x₂, y₂</text>
<rect x="60" y="150" width="120" height="44" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="60" y="150" width="120" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="120" y="177" text-anchor="middle">z₀ = f(1, 2)</text>
<rect x="260" y="150" width="120" height="44" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="260" y="150" width="120" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="177" text-anchor="middle">z₁ = f(2, 0)</text>
<rect x="460" y="150" width="120" height="44" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="460" y="150" width="120" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="520" y="177" text-anchor="middle">z₂ = f(0, 1)</text>
<line x1="320" y1="60" x2="130" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="520" y1="60" x2="150" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="520" y1="60" x2="330" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="120" y1="60" x2="310" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="120" y1="60" x2="510" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="60" x2="530" y2="150" stroke="currentColor" stroke-width="1.2"/>
<text x="320" y="225" text-anchor="middle" font-size="13">Each component misses one share index, so no glitch inside it can combine all three shares.</text>
</svg>
<figcaption>Figure 7.5. Non-completeness, the rule of threshold implementations. Output share i is computed without share i of any input; a register after each component keeps glitches from crossing into the next stage.</figcaption>
</figure>

Two more properties make threshold implementations work in a full cipher. The outputs
must again be a **uniform** sharing, or the next stage's inputs are biased; the
three-share AND above is not uniform, and real designs restore uniformity with fresh
randomness or with more shares. And the nonlinear parts must be split into small
pieces: AES's S-box, of algebraic degree 7, is decomposed into stages of degree 2 or
3 with registers between them. Threshold implementations of PRESENT, Keccak and AES
were published from 2011 on, typically a few times larger than the unprotected
circuit. Later schemes reduce the cost: Hannes Gross, Stefan Mangard and Thomas Korak's
**domain-oriented masking** (2016) needs only $d + 1$ shares for order $d$ and uses
registers to stop glitches at the points where shares meet. Composition was solved
too: Gilles Barthe and colleagues' **strong non-interference** (2016) is a property
of gadgets that guarantees that any circuit built from them is secure, so a designer
can verify small pieces and combine them.

**In software**, ISW-style masking is usually implemented bitsliced: thirty-two or
sixty-four independent bit-level circuits in parallel in one machine word, each
operation a share-wise XOR or an ISW AND. It is slow (masked AES in software on a
microcontroller costs tens of times the unmasked cipher at higher orders), and it
inherits every transition leak of §7.5: two shares of one bit in the same register,
one after the other, are $d = 1$ for the attacker whatever $d$ the proof assumed.
Post-quantum schemes need **arithmetic masking**, $x = x_0 + x_1 \bmod q$, and
conversions between arithmetic and Boolean shares, which are the expensive and
error-prone part; [Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md)
covers masked ML-KEM and ML-DSA.

!!! note "Life story: ISW private circuits"
    **Born:** 2003, Yuval Ishai, Amit Sahai and David Wagner, "Private Circuits:
    Securing Hardware against Probing Attacks" (CRYPTO 2003) · **Purpose:** a model
    (the $d$-probing adversary) and a construction (share every wire $d+1$ ways, with
    randomized multiplication gadgets) that makes a whole circuit provably secure
    against an adversary who reads $d$ wires · **Helped:** became the foundation of
    provable masking: higher-order masked AES (Matthieu Rivain and Emmanuel Prouff,
    CHES 2010), the noisy-leakage reductions of 2013 and 2014, the strong
    non-interference of 2016, verification tools such as maskVerif · **Status:**
    current; the model is extended for glitches and transitions (the robust probing
    model) because hardware does not behave like its wires

!!! note "Life story: threshold implementations"
    **Born:** 2006, Svetla Nikova, Christian Rechberger and Vincent Rijmen,
    "Threshold Implementations Against Side-Channel Attacks and Glitches" (ICICS
    2006); the full version, with Martin Schläffer, in the *Journal of Cryptology*
    (2011) · **Purpose:** masking for hardware that stays first-order secure when
    glitches combine signals, by non-completeness, correctness and uniformity ·
    **Helped:** threshold implementations of PRESENT, Keccak and AES from 2011 on;
    higher-order versions (Begül Bilgin and colleagues, 2014); domain-oriented masking
    and the glitch-robust designs that followed · **Status:** current; the standard
    starting point for masked hardware

**What to do.**

1. In hardware, use a glitch-robust scheme (threshold implementations, domain-oriented
   masking, or gadgets proven in the robust probing model) with registers where the
   scheme requires them. Plain ISW in combinational logic is not enough.
2. Verify gadgets formally with a masking verifier, at the order you claim, before
   synthesis, and again on the netlist, because synthesis tools can merge or
   reorder logic.
3. In software, prefer proven gadgets and bitsliced code, then test the binary on
   the target for transition leaks.
4. Count the randomness: higher-order masking needs many fresh bits per cycle, and a
   weak or stalled random source silently removes the protection.

## 7.8 Faults: what a defender has to assume

*Level: intermediate.*

A passive attacker reads; an active one writes. The physical ways to disturb a chip are
well known: **clock glitches** (one cycle much shorter than the rest, so a register
latches a value before it has settled), **voltage glitches** (a brief drop in supply,
which slows logic the same way), **electromagnetic pulses** from a small coil held
over the die, **laser pulses** on a decapsulated chip, which can target one region or
one memory cell, and slower stresses such as heat or underpowering. Since 2014 software
has done the same from a distance: Rowhammer flips DRAM bits from user programs,
CLKSCREW (2017) and Plundervolt (2019) drove phone and PC processors outside their
safe voltage and frequency from software (Cryptanalysis §17.9 and §17.10). And nature
does it with no attacker at all, through particle strikes and failing hardware (§7.12).

For design, what matters is not the source but the **fault model**: what the fault does
to the computation, and how precisely the attacker controls it.

- **Bit flip** of one or a few bits in a register or memory word, at a random or a
  chosen bit position.
- **Stuck-at or reset**: a register or byte forced to 0 (or to all ones); laser and
  power faults often do this.
- **Random byte**: the value becomes unknown but different.
- **Instruction skip** or corruption: the processor fails to execute one instruction,
  or executes a different one. A skipped branch or a skipped store is the most useful
  fault an attacker can get against software, because it turns "if the check fails,
  stop" into "continue".
- **Repeatability**: can the attacker produce the same fault at the same moment on
  every run? With a timed glitch and a fixed input, often yes, which matters for
  redundancy.

The attacks built on these models are in book 1 §18.7 (the Bellcore attack on
RSA-CRT, a single wrong half of a signature) and Cryptanalysis §17.9 (differential
fault analysis of AES, which needs a byte fault in round 8 or 9). For a defender, a toy
example shows everything at once. Take a one-byte cipher with two key bytes,
$c = S(p \oplus k_1) \oplus k_2$, and a fault that resets the register holding
$p \oplus k_1$ to zero. Then $c' = S(0) \oplus k_2 = \texttt{0x63} \oplus k_2$, so one
faulty output gives $k_2$, and any correct pair then gives
$k_1 = S^{-1}(c \oplus k_2) \oplus p$. The code mounts that attack and then tries the
two obvious kinds of redundancy:

```python
def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)
S_INV = [S.index(y) for y in range(256)]

K1, K2 = 0x2B, 0x7E                   # the device's secret key bytes

def enc(p, fault=None):               # a toy cipher: one key addition, S-box, key addition
    x = p ^ K1
    if fault == "zero":               # a glitch clears the register before the S-box
        x = 0
    return S[x] ^ K2

def dec(c, fault=None):
    y = S_INV[c ^ K2]
    return y ^ K1

# The attack: one faulty output gives K2, one correct pair then gives K1.
p = 0x32
c, bad = enc(p), enc(p, "zero")
k2 = bad ^ S[0]
k1 = S_INV[c ^ k2] ^ p
print("recovered", hex(k1), hex(k2))

def enc_twice(p, fault=None, both=False):     # duplicate and compare
    c1 = enc(p, fault)
    c2 = enc(p, fault if both else None)
    return c1 if c1 == c2 else None

def enc_check(p, fault=None):                 # encrypt, then decrypt and compare
    c = enc(p, fault)
    return c if dec(c) == p else None

print("duplicate, fault in one run:  ", enc_twice(p, "zero"))
print("duplicate, same fault twice:  ", hex(enc_twice(p, "zero", both=True)))
print("inverse check, fault:         ", enc_check(p, "zero"))
```

It prints:

```
recovered 0x2b 0x7e
duplicate, fault in one run:   None
duplicate, same fault twice:   0x1d
inverse check, fault:          None
```

The attack recovers both key bytes from one fault. **Duplication** (compute twice and
compare) catches a fault that hits one of the two runs, which is the right defense
against a random natural fault. But a deliberate, repeatable glitch, timed at the same
point in both runs, makes the two faulty results agree, and the check releases the
faulty value `0x1d` $= \texttt{0x63} \oplus \texttt{0x7e}$, from which the attacker reads
$k_2$. The **inverse check** (encrypt, then decrypt with the inverse cipher and compare
with the input) catches it, because the decryption is a different computation and the
same glitch does not turn it into a matching wrong answer. In hardware, the same idea
appears as **spatial redundancy** (two copies of the circuit, or one copy computing on
complemented data), **temporal redundancy** with a different representation the
second time, and **error-detecting codes** on the datapath: parity per byte or a
stronger linear code, predicted through each linear step and checked after the
nonlinear ones.

## 7.9 Fault countermeasures that hold

*Level: intermediate.*

A check has three weak points: the attacker can fault both computations the same way
(handled above by making them different), fault the comparison itself, or fault the
decision that follows it. The last two are where software countermeasures usually
fail, and where [Chapter 6](06-Big-Numbers-and-Public-Key-Code.md)'s RSA signer, which
verifies each signature before release, still needs help on a smart card.

**Break it: a Boolean status.** The usual C code keeps the result of a check in an
`int` or a `bool` and tests it with `if (ok)`. A failed check stores 0. Any single bit
flip of that variable, from a laser on its RAM cell or a glitch on the bus, makes it
nonzero, which C treats as true. And an instruction skip on the conditional branch
skips the failure path whatever the variable holds.

**Fix it: hardened decisions.** Encode PASS and FAIL as two multi-bit constants far
apart in Hamming distance (for example `0x3CA5965A` and its complement), test for
exact equality with PASS, and test twice, with independent code, a random delay in
between and the second test reversed (once "equals PASS", once "not equal to FAIL").
Put the failure path first and the success path at the end of a chain of checks, so
that a skipped instruction falls into failure. On failure, do more than return an
error: erase or lock the key, increment a persistent fault counter, and stop working
after a small number of detected faults. Smart cards do exactly this, and it turns an
attack that needs a thousand faults into one that needs to avoid detection a thousand
times.

**Infective computation** removes the decision. Instead of "if the result is wrong,
output nothing", the code computes the difference $\delta$ between the result and its
check, and mixes $\delta$ into the output through a random value, so that a faulty
result comes out as noise and a correct one comes out unchanged. There is no branch to
skip. The idea goes back to Sung-Ming Yen, Seungjoo Kim, Seongan Lim and Sangjae Moon's
infective RSA-CRT of 2001, and to block ciphers with Benedikt Gierlichs, Jörn-Marc
Schmidt and Michael Tunstall's infective computation with dummy rounds (2012). Both
were later broken by better fault models (Alberto Battistello and Christophe Giraud,
2013), and the code below shows the kind of detail that decides it:

```python
import random

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)
S_INV = [S.index(y) for y in range(256)]
K1, K2 = 0x2B, 0x7E
trng = random.Random(1)               # stands in for the chip's hardware generator

def enc(p, fault=False):
    x = 0 if fault else p ^ K1
    return S[x] ^ K2

def dec(c):
    return S_INV[c ^ K2] ^ K1

# Break it: one status byte, tested the C way ("if (ok)"), any nonzero is true.
FAIL = 0
print("bit flips that turn FAIL into pass:", sum(bool(FAIL ^ (1 << i)) for i in range(8)), "of 8")

# Fix it: two 32-bit constants far apart; only an exact match passes.
PASS32, FAIL32 = 0x3CA5965A, 0xC35A69A5
print("bit flips that turn FAIL32 into PASS32:",
      sum((FAIL32 ^ (1 << i)) == PASS32 for i in range(32)), "of 32")

def enc_infective(p, fault=False, r_can_be_zero=True):
    """No branch to skip: a wrong result is mixed with a random byte."""
    c = enc(p, fault)
    diff = dec(c) ^ p                 # 0 if nothing went wrong
    bad = (diff + 255) >> 8           # 1 if diff != 0, computed without an if
    r = trng.randrange(256) if r_can_be_zero else 1 + trng.randrange(255)
    return c ^ (r & -bad & 0xFF)

p = 0x32
print("no fault, same as enc:", enc_infective(p) == enc(p))
for zero_ok in (False, True):
    seen = {enc_infective(p, True, zero_ok) for _ in range(3000)}
    missing = [v for v in range(256) if v not in seen]
    print("r may be 0:", zero_ok, "| outputs never seen:", [hex(v) for v in missing],
          "| K2 guess:", [hex(v ^ S[0]) for v in missing])
```

It prints:

```
bit flips that turn FAIL into pass: 8 of 8
bit flips that turn FAIL32 into PASS32: 0 of 32
no fault, same as enc: True
r may be 0: False | outputs never seen: ['0x1d'] | K2 guess: ['0x7e']
r may be 0: True | outputs never seen: [] | K2 guess: []
```

The first two lines are the status-word argument: every single flip turns a zero
status into "true", none turns the 32-bit FAIL into PASS. The infective cipher returns
the right answer when nothing goes wrong. Under the fault, the first version mixes in a
random byte that is never zero, so that a faulty result is never released as it is.
That sounds safer, and it is the bug: the output then takes every value except
$c' = \texttt{0x63} \oplus k_2$, and after 3,000 faulty runs the one missing value is
`0x1d`, which gives the key byte `0x7e`. Letting the random byte be zero (so the raw
faulty value is released one time in 256, indistinguishable from the rest) makes the
faulty outputs uniform, and nothing is missing. The published breaks of infective
schemes turned on details of this kind: how the random value is drawn, and what the
faulty outputs still reveal when the attacker collects many of them. Victor Lomné,
Thomas Roche and Adrian Thillard's 2012 paper "On the Need of Randomness in Fault
Attack Countermeasures" made the general point.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Detection versus infection: a check that withholds a faulty result, and an infective computation that randomizes it" fill="currentColor" font-size="14">
<text x="20" y="24" font-weight="bold">detection</text>
<rect x="20" y="36" width="110" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="61" text-anchor="middle">c = E(p)</text>
<rect x="170" y="36" width="140" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="240" y="61" text-anchor="middle">D(c) = p ?</text>
<rect x="350" y="36" width="120" height="40" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="350" y="36" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="410" y="61" text-anchor="middle">status word</text>
<rect x="510" y="36" width="110" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="565" y="61" text-anchor="middle">c or nothing</text>
<line x1="130" y1="56" x2="164" y2="56" stroke="currentColor" stroke-width="1.4"/><polygon points="170,56 163,52 163,60"/>
<line x1="310" y1="56" x2="344" y2="56" stroke="currentColor" stroke-width="1.4"/><polygon points="350,56 343,52 343,60"/>
<line x1="470" y1="56" x2="504" y2="56" stroke="currentColor" stroke-width="1.4"/><polygon points="510,56 503,52 503,60"/>
<text x="410" y="100" text-anchor="middle" font-size="12">weak point: a flipped status or a skipped branch</text>
<text x="20" y="144" font-weight="bold">infection</text>
<rect x="20" y="156" width="110" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="181" text-anchor="middle">c = E(p)</text>
<rect x="170" y="156" width="140" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="240" y="181" text-anchor="middle">δ = D(c) ⊕ p</text>
<rect x="350" y="156" width="120" height="40" rx="5" fill="currentColor" opacity="0.12"/>
<rect x="350" y="156" width="120" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="410" y="181" text-anchor="middle">r if δ ≠ 0, else 0</text>
<rect x="510" y="156" width="110" height="40" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="565" y="181" text-anchor="middle">c ⊕ that</text>
<line x1="130" y1="176" x2="164" y2="176" stroke="currentColor" stroke-width="1.4"/><polygon points="170,176 163,172 163,180"/>
<line x1="310" y1="176" x2="344" y2="176" stroke="currentColor" stroke-width="1.4"/><polygon points="350,176 343,172 343,180"/>
<line x1="470" y1="176" x2="504" y2="176" stroke="currentColor" stroke-width="1.4"/><polygon points="510,176 503,172 503,180"/>
<text x="410" y="220" text-anchor="middle" font-size="12">no branch; r must be uniform, zero included, or the outputs leak</text>
</svg>
<figcaption>Figure 7.6. Two ways to stop a faulty result from helping the attacker. Detection withholds it and must protect its own decision; infection releases a random value instead, with no decision to attack, and must make that value truly uniform.</figcaption>
</figure>

**Verify after compute** is the cheapest countermeasure where the operation has a
cheap inverse. Verify an RSA signature with the public exponent before releasing it
(book 1 §18.7, Chapter 6 here); verify an ECDSA or EdDSA signature with the public key;
decrypt and compare after encrypting; check that a computed elliptic-curve point is
on the curve after a scalar multiplication. Check with data that the fault could not
have corrupted at the same time: the public key as stored, not recomputed. For
deterministic signatures (Ed25519, deterministic ECDSA), a fault that changes the
computation once gives two different signatures with the same nonce and so the key;
**hedged** signing, which mixes fresh randomness into the nonce derivation, removes the
attack, as [Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md)
shows for ML-DSA and Cryptanalysis Chapter 14 for EdDSA.

**Sensors and shields** are the physical layer. Secure chips carry voltage, clock
frequency, temperature and light sensors that reset the chip or erase keys when
anything looks wrong, and an **active shield**, a mesh of wires over the top metal layer
whose signals are checked continuously, so that cutting through it to reach the logic
below is detected. Sensors and shields are much of the reason that a fault attack on a
modern secure element is a job for a specialist laboratory with opened samples, while
the same attack on an ordinary microcontroller can be done with a cheap glitcher
(§7.11).

**The attacker's reply: ineffective faults.** Statistical ineffective fault analysis
(SIFA, Christoph Dobraunig and colleagues, CHES 2018; Cryptanalysis §17.15) uses only
the runs where the fault did **not** change the result. A stuck-at-zero fault on a byte
that was already zero is ineffective, so the correct, released outputs are biased
toward inputs that made that byte zero. Detection and infection release exactly those
outputs, because they are correct. The defense combines countermeasures: masking, so
that whether a fault is ineffective does not depend on the unmasked value, together
with error correction rather than detection. Designs that resist side channels and
faults at once (CAPA, 2018; M&M, 2019) are an active research area, and no single
countermeasure covers both.

!!! note "Life story: infective computation"
    **Born:** 2001, Sung-Ming Yen, Seungjoo Kim, Seongan Lim and Sangjae Moon, for
    RSA with the Chinese remainder theorem (ICISC 2001); for block ciphers, Benedikt
    Gierlichs, Jörn-Marc Schmidt and Michael Tunstall, "Infective Computation and
    Dummy Rounds" (LATINCRYPT 2012) · **Purpose:** to make a faulty result useless
    instead of withholding it, so that there is no check-and-branch for a second fault
    to skip · **Helped:** a line of improved schemes after each break (Battistello and
    Giraud, FDTC 2013, broke both original schemes; Tupsamudre, Bisht and Mukhopadhyay
    proposed a repaired AES version in 2014) · **Status:** used alongside detection in
    secure chips; its security depends on uniform randomness and on the fault model,
    and SIFA defeats it unless it is combined with masking

**What to do.**

1. Verify every result that has a cheap inverse before it leaves the device, with
   public data stored independently of the computation.
2. Make redundant computations different (inverse, complemented data, another
   representation), so that one repeatable fault cannot hit both the same way.
3. Harden every security decision: multi-bit status constants, double checks with
   independent code, failure as the default path, and a fault counter that erases or
   locks the key.
4. Use hedged signatures on any device that can be faulted, deliberately or by nature.
5. If you use infection, make the injected randomness uniform, zero included, and
   check the distribution of faulty outputs, not just that they differ.

## 7.10 Evaluation: TVLA, ISO/IEC 17825, Common Criteria and FIPS 140-3

*Level: intermediate.*

Nobody, including the designer, can run every attack with every model. Evaluation is
how the industry turns "we masked it" into a claim someone else will sign. There are
two philosophies, and a serious product meets both.

**Leakage testing** asks whether anything at all depends on the data, without attacking.
Its standard form is the fixed-versus-random **TVLA** test of Gilbert Goodwill,
Benjamin Jun, Josh Jaffe and Pankaj Rohatgi (2011): collect traces with one fixed
input and with random inputs, interleaved, compute Welch's $t$ at every sample, and fail
the device if $|t| > 4.5$ anywhere. Cryptanalysis §17.13 derives it and codes it on one
sample. For a defender its best use is as a **regression test**: run it on every build
of the firmware, on the real target, and fail the build if a leak appears. The code
below is that gate, run on three builds of the round of §7.4 on a chip that leaks
Hamming distance between consecutive register values (§7.5): unmasked, masked with two
masks, and masked with one shared mask:

```python
import random

def gmul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def rotl(b, i):
    return ((b << i) | (b >> (8 - i))) & 0xFF

S = []
for x in range(256):
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    S.append(inv ^ rotl(inv, 1) ^ rotl(inv, 2) ^ rotl(inv, 3) ^ rotl(inv, 4) ^ 0x63)
HW = [bin(v).count("1") for v in range(256)]
rng = random.Random(17825)
KEY = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")

def run(p, build):
    """One first round. The register leaks Hamming distance (old ^ new)."""
    if build == "plain":
        m_in = m_out = 0
    else:
        m_in = rng.randrange(256)
        m_out = m_in if build == "one mask" else rng.randrange(256)
    trace, reg = [], 0
    for a, b in zip(p, KEY):
        x = a ^ m_in ^ b
        for new in (a ^ m_in, x, S[x ^ m_in] ^ m_out):   # load, add key, look up
            trace.append(HW[reg ^ new] + rng.gauss(0, 2))
            reg = new
    return trace

def welch(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    va = sum((x - ma) ** 2 for x in a) / (len(a) - 1)
    vb = sum((x - mb) ** 2 for x in b) / (len(b) - 1)
    return (ma - mb) / (va / len(a) + vb / len(b)) ** 0.5

FIXED = bytes(16)                     # the fixed plaintext: all zero
def tvla(build, n=4000):
    fixed, rand = [], []
    for _ in range(n):                # interleave the two sets at random
        if rng.random() < 0.5:
            fixed.append(run(FIXED, build))
        else:
            rand.append(run(bytes(rng.randrange(256) for _ in range(16)), build))
    t = [welch([f[j] for f in fixed], [r[j] for r in rand]) for j in range(len(fixed[0]))]
    worst = max(range(len(t)), key=lambda j: abs(t[j]))
    return round(t[worst], 1), worst, sum(abs(x) > 4.5 for x in t)

for build in ("plain", "masked", "one mask"):
    t, j, fails = tvla(build)
    print(f"{build:9s} max |t| = {abs(t):5.1f} at sample {j:2d}, samples over 4.5: {fails:2d} ->",
          "FAIL" if fails else "pass")
```

It prints:

```
plain     max |t| =  56.0 at sample  0, samples over 4.5: 26 -> FAIL
masked    max |t| =   3.1 at sample  8, samples over 4.5:  0 -> pass
one mask  max |t| =  44.0 at sample 38, samples over 4.5: 25 -> FAIL
```

The unmasked build fails at 26 of its 48 samples. (Its worst sample, 0, is the load of
the first plaintext byte, which is public; TVLA flags leaks of public data too, and an
evaluator then checks what each failing sample handles. That is a known limit of the
test, not a reason to ignore a failure.) The two-mask build passes everywhere. The
one-mask build fails at 25 samples, including every load: the register goes from the
previous byte's $S(x) \oplus m$ to the next $p \oplus m$, and the distance between them is
unmasked. This is the value of the gate: the broken build looks fine in a code review
and in a Hamming weight model, and fails at once on a test of the right leakage model.
A passing first-order test says only that the leak has moved to a higher order; run the
second-order test (centered and squared samples, Cryptanalysis §17.13) too, and keep
in mind that a pass at $N$ traces says nothing about $10N$.

**ISO/IEC 17825** standardizes this kind of testing for cryptographic modules. The
first edition appeared in 2016 and the second in January 2024. It defines
non-invasive attack mitigation test metrics, with trace counts and pass criteria, for
the security levels 3 and 4 of ISO/IEC 19790, and it is meant to be used with the test
methods of ISO/IEC 24759. Its design goal is a "push-button" test: repeatable,
moderately priced, and runnable by a laboratory without a team of attack specialists.

**Common Criteria** (ISO/IEC 15408) takes the other approach: laboratories attack. A
product's developer writes a **security target** that says what the product (the
"target of evaluation") protects and against whom, usually by claiming conformance to
a **protection profile**; smart-card chips use the Security IC Platform Protection
Profile. The evaluation assurance level (EAL1 to EAL7) sets how much design evidence
the lab examines, and the vulnerability analysis component **AVA_VAN** sets how hard
the lab attacks: AVA_VAN.1 is a search of public vulnerabilities, AVA_VAN.5 is
"advanced methodical vulnerability analysis" against an attacker with **high attack
potential**. Smart cards and secure elements are typically certified at EAL4+ to EAL6+
with AVA_VAN.5. The lab rates each attack it finds by the effort it took (elapsed time,
expertise, knowledge of the design, access to samples, equipment) using a scoring
method that the European smart-card evaluators (the Joint Interpretation Library)
adapted for chips, and the product passes AVA_VAN.5 if every attack the lab found or
considered needs more than "high" potential. The method is honest about what it
measures: the attacks a skilled laboratory found in the time it had. EUCLEAK (§7.1) is
the counterexample everyone now quotes.

**FIPS 140-3**, the US and Canadian standard for cryptographic modules (approved in
March 2019, effective that September, with [Chapter 11](11-Hardware-for-Keys.md)
covering its levels), is built on ISO/IEC 19790:2012 and its test standard ISO/IEC
24759. ISO/IEC 19790 has an area called **non-invasive security**: a module that
claims to mitigate timing, power or EM attacks must document how, and at levels 3 and 4
the mitigation is to be tested against approved metrics. NIST's SP 800-140F (March
2020) sets out which non-invasive test metrics the CMVP approves, replacing the annex
of ISO/IEC 19790 that would have listed them; a revision has been in draft since August
2021, and NIST said in January 2025 that it was still developing it. A third edition of
ISO/IEC 19790 was published in February 2025. The practical advice: do not read a FIPS
140-3 certificate, at any level, as evidence that a module was tested against power or
electromagnetic analysis unless its security policy says so. Common Criteria at
AVA_VAN.5 is still the evaluation that attacks the hardware.

!!! note "Life story: the Common Criteria"
    **Born:** the 1990s, from the US "Orange Book" (TCSEC, 1985), the European ITSEC
    (1991) and the Canadian CTCPEC; version 1.0 in 1996, adopted as ISO/IEC 15408 in
    1999, with a mutual recognition arrangement among national schemes from 1998 ·
    **Purpose:** one framework in which a developer states security claims and an
    accredited laboratory checks them, at a chosen depth (EAL) and attack strength
    (AVA_VAN) · **Helped:** made attack-based evaluation of smart cards, secure
    elements, TPMs and passports routine, and gave buyers a document to read (the
    security target) as well as a certificate · **Status:** current; revised as
    CC:2022; criticized for cost and slowness, and reminded by EUCLEAK (2024) that a
    certificate records the attacks that were tried

**What to do.**

1. Put a leakage test on the real target in your build pipeline, with the leakage model
   of that target, and make it a release gate.
2. Run higher-order tests on masked code, and record the trace count behind every pass.
3. When you rely on a certified part, read its security target: what is inside the
   evaluated boundary (is the crypto library you call?), against which attack
   potential, and when.
4. Read FIPS 140-3 security policies for what they claim about non-invasive attacks,
   and do not assume more.

## 7.11 Smart cards and secure elements

*Level: intermediate.*

Every countermeasure in this chapter meets in one kind of chip. The smart card began
with Roland Moreno's French patents of 1974 on a card carrying memory; Michel Ugon at
Bull added a microprocessor in the late 1970s (the CP8 card), and French bank cards
carried chips by the early 1990s. The GSM SIM card (1991), the EMV payment
specifications of the mid-1990s, Java Card (1996) and electronic passports made the
secure microcontroller one of the most produced computers on Earth. The same design,
packaged differently, is the **secure element** in a phone's payment system, a
security key such as a YubiKey or Titan, a hardware wallet, a TPM, or an embedded SIM.

What makes a chip "secure" is the list of everything in this chapter, built in:

- a CPU and coprocessors for AES and for big-number arithmetic, with masked and
  shuffled datapaths and a vendor library written to use them;
- a true random number generator with health tests, because masking, shuffling and
  infection all run on fresh randomness;
- voltage, frequency, temperature and light sensors, an active shield, and glue logic
  synthesized to make reverse engineering slow;
- encrypted and scrambled memories and buses, with error detection on the stored keys;
- firmware that hardens every decision as in §7.9, counts faults and locks itself;
- a certificate, usually Common Criteria EAL5+ or EAL6+ with AVA_VAN.5, for the chip and
  its cryptographic library, on which the product maker's own certificate builds as a
  **composite** evaluation.

The contrast with an ordinary microcontroller is large and well documented. In January
2020 Kraken Security Labs showed that the Trezor One and Model T hardware wallets,
built on a general-purpose microcontroller, gave up their encrypted seeds to a voltage
glitch during boot: the glitch enabled the chip's factory bootloader to read out its
flash, with about fifteen minutes of physical access. The microcontroller's own
read-out protection was the only barrier, and it was never designed against glitching.
Trezor's advice was to set a BIP 39 passphrase, which the glitch cannot read; later
Trezor models added a secure element. Against a certified secure element, the
comparable published attacks (the Titan key in 2021, Cryptanalysis §17.8; EUCLEAK in
2024) took weeks of expert work, opened devices and lab equipment, and found one leaky
operation rather than a missing defense.

!!! note "Life story: the Trezor voltage glitch"
    **Born:** January 2020, Kraken Security Labs, against the Trezor One and Trezor
    Model T; similar glitches on hardware wallets had been shown at the 35C3 conference
    (wallet.fail, December 2018) and by Ledger's Donjon team · **Purpose:** to show that
    a wallet whose security rests on a general-purpose microcontroller's read-out
    protection can be emptied by anyone who holds it for a few minutes with a glitcher
    · **Helped:** made "has a secure element" a buying criterion for hardware wallets;
    BIP 39 passphrases, which the device does not store, became the standard
    mitigation for existing devices · **Status:** unfixable in software on the affected
    hardware; the flaw is in the chip

**Choosing and using a secure part.**

1. Use a certified secure element, not a general-purpose microcontroller, for any key
   an attacker can hold in their hand: payment, identity, signing, wallets, firmware
   keys in the field.
2. Use the vendor's certified cryptographic library for the operations it covers, and
   check that the library version you ship is the certified one.
3. Decide in advance how a flaw would be fixed. EUCLEAK's keys could not be updated;
   an updatable part needs a signed, authenticated update path, which is itself an
   attack surface (Chapter 16).
4. Keep secrets that the device does not need off it (a passphrase, a server-side
   factor), so that a physical break yields less.

## 7.12 Mars: radiation as a fault injector

*Level: intermediate.*

Mars has no global magnetic field and an atmosphere about one hundredth as thick as
Earth's, so galactic cosmic rays and solar energetic particles reach the ground. The
Radiation Assessment Detector (RAD) on the Curiosity rover measured it. On the way to
Mars, inside the spacecraft, the dose equivalent averaged about 1.8 millisieverts per
day (Cary Zeitlin and colleagues, *Science*, 2013). On the floor of Gale Crater, over
roughly 300 sols from August 2012, it was 0.21 milligray per day absorbed, or
0.64 millisievert per day dose equivalent (Donald Hassler and colleagues, *Science*,
2014). The world average natural background on Earth is about 2.4 millisieverts per
year, so the surface of Mars gets about a hundred times as much. Those are doses to
human tissue; what flips bits in electronics is mostly the rarer heavy ions, whose
rate the dose does not measure directly, but the direction is the same.

When a heavy ion passes through a transistor it leaves a trail of charge, and if
enough charge collects at a sensitive node, a memory cell or a flip-flop changes state:
a **single-event upset** (SEU). Several adjacent cells can flip at once (a multiple-bit
upset); a control register can flip and hang the chip (a functional interrupt); and some
strikes trigger a latch-up that destroys the part unless power is cut. Spacecraft are
built for this. Curiosity and Perseverance each carry two computers built around BAE
Systems' RAD750 processor, made in a radiation-hardened process; its data sheet
specifies fewer than $1.6 \times 10^{-10}$ upsets per bit per day in a worst-case
geostationary orbit, and immunity to latch-up. Each computer has 256 MB of DRAM and
2 GB of flash with error detection and correction. Memories are **scrubbed**: read,
corrected and rewritten on a schedule, so that single upsets are removed before a second
one lands in the same word. FPGAs use **triple modular redundancy**, three copies of
each circuit and a voter.

It does not always suffice. On 27 February 2013, six months after landing, Curiosity's
A-side computer showed corrupted flash memory, in the directory structure of its file
system, and the team switched the rover to its B-side computer. A cosmic-ray strike was
considered a possible cause; the project manager called the odds remote but noted that
similar events had happened before. Earth has its stories too. In the Belgian federal
election of 18 May 2003, an electronic voting machine in Schaerbeek gave one candidate
exactly 4,096 extra votes, $2^{12}$, caught only because the total was impossible; the
most widely accepted explanation is a single flipped bit, possibly from a cosmic ray.

!!! note "Life story: Curiosity's A-side memory fault"
    **Born:** 27 February 2013, Gale Crater, sol 200 of the mission or thereabouts:
    corrupted flash memory on the rover's A-side computer · **Purpose:** none; an
    accident, attributed possibly to a particle strike in a sensitive location, with
    the root cause not confirmed in public reports · **Helped:** showed the value of a
    fully redundant second computer, to which the rover switched within a day, and of
    software that can rebuild its memory tables · **Status:** the rover ran on the
    B side for years and returned to the A side in 2018 after memory problems on the
    B side

**What this means for cryptography.** A natural fault is an unaimed fault attack. The
attacker's chapters already draw two consequences: a signer that releases one faulty
RSA-CRT signature gives away its key to anyone who records the downlink (Cryptanalysis
§17.9), and a deterministic signer that retries after a fault does the same
(Cryptanalysis Chapter 14). Both are prevented by the countermeasures of §7.9,
verification before release and hedged signing, which cost a few percent of the
signing time. On Earth these are defenses against a rare attacker; on Mars they are
also defenses against the weather.

Keys at rest need the same care. A flipped bit in a stored AES key is silent: the
device keeps encrypting, under a key the other side does not have, until someone
notices that nothing decrypts. A flipped bit in a stored RSA CRT exponent produces
faulty signatures, which verification catches. A defender stores keys in memory with
error correction, scrubs it, keeps a **key check value** beside each key (a short MAC
or hash of the key under a fixed label, as banks have long done for key management), and
checks it at boot and before use. The code shows the layers with a SECDED code
(single error correction, double error detection) on each byte of a 32-byte key, the
way ECC memory protects each 64-bit word with 8 check bits:

```python
import hashlib, random

DATA_POS = [3, 5, 6, 7, 9, 10, 11, 12]   # positions 1..12 that are not powers of two

def encode(byte):
    """Hamming(12,8) plus an overall parity bit: a 13-bit SECDED codeword."""
    w = [0] * 13                      # w[1..12] Hamming code, w[0] overall parity
    for i, pos in enumerate(DATA_POS):
        w[pos] = byte >> i & 1
    for p in (1, 2, 4, 8):            # parity bit p covers positions with bit p set
        w[p] = sum(w[i] for i in range(1, 13) if i & p) % 2
    w[0] = sum(w) % 2
    return w

def decode(w):
    """Returns (byte, status): 'ok', 'corrected' or 'uncorrectable'."""
    syndrome = sum(p for p in (1, 2, 4, 8) if sum(w[i] for i in range(1, 13) if i & p) % 2)
    parity_ok = sum(w) % 2 == 0
    w = list(w)
    if syndrome and parity_ok:        # two flips: the syndrome points nowhere useful
        return None, "uncorrectable"
    if not parity_ok:                 # one flip, at position `syndrome` (0 = the parity bit)
        w[syndrome] ^= 1
    byte = sum(w[pos] << i for i, pos in enumerate(DATA_POS))
    return byte, "corrected" if not parity_ok else "ok"

rng = random.Random(2012)             # 2012: Curiosity lands
key = bytes(rng.randrange(256) for _ in range(32))
check = hashlib.sha256(b"key check" + key).digest()[:4]   # stored beside the key
memory = [encode(b) for b in key]

memory[5][rng.randrange(13)] ^= 1     # one particle, one bit
memory[9][3] ^= 1                     # two bits in the same word
memory[9][11] ^= 1
out = [decode(w) for w in memory]
print([(i, s) for i, (b, s) in enumerate(out) if s != "ok"])

memory = [encode(b) for b in key]     # a fresh copy: now 3 flips in one word
for pos in (2, 6, 7):
    memory[20][pos] ^= 1
read = bytes(decode(w)[0] for w in memory)
print("decoder says:", decode(memory[20])[1], "| key check passes:",
      hashlib.sha256(b"key check" + read).digest()[:4] == check)
```

It prints:

```
[(5, 'corrected'), (9, 'uncorrectable')]
decoder says: corrected | key check passes: False
```

One upset is corrected; two in the same word are detected and reported. Three in one
word fool the code: the decoder "corrects" the wrong bit and reports success, and only
the key check value notices. That is the reason for the layering. The memory's code
handles the common case quietly; scrubbing keeps double upsets rare (two upsets in one
13-bit word between scrubs have probability about $\binom{13}{2}(\lambda T)^2$ for an
upset rate $\lambda$ per bit and scrub interval $T$); and the cryptographic check catches
whatever is left, so that a damaged key is refused and restored from a second copy
instead of being used. On Earth, the largest field study of server memory (Bianca
Schroeder, Eduardo Pinheiro and Wolf-Dietrich Weber at Google, 2009) found more than 8
percent of DIMMs with at least one error per year, most of them from hard faults rather
than particles; error correction is not only a space technology.

**What to do on a spacecraft, and on Earth.**

1. Verify every signature before release, and sign with hedged nonces.
2. Store keys in error-corrected memory that is scrubbed, with a key check value, two
   copies in separate memories, and a policy for a key that fails its check.
3. Treat a detected fault as an event to log and count, not only to retry; a rising
   count is a failing part, or an attacker.
4. Remember that the radiation-tolerant processor protects its own registers, not the
   commercial chips around it; a crypto coprocessor or a commercial flash part needs
   its own error handling.

## 7.13 In the real world

*Level: intermediate.*

The record shows the same pattern from both sides: each attack class reached the field
within a few years of its publication, and each defense that held was the one that was
tested by attacking it.

| Year | Event | What failed | What fixed it |
| --- | --- | --- | --- |
| 1990s | Pay-TV and phone-card piracy | glitches, probing, then DPA (1998) | masking, sensors, Common Criteria testing |
| 2003 | Schaerbeek election, 4,096 extra votes | a single bit flip, no error detection | a recount; error detection was missing |
| 2005 | Masked AES hardware broken | glitches combined shares | threshold implementations (2006) |
| 2013 | Curiosity A-side flash fault | memory corruption on Mars | a redundant computer |
| 2015 | TLS servers leak RSA keys | faulty CRT signatures from bad hardware | verify before release |
| 2017 | Philips Hue firmware key | CPA on an unprotected AES-CCM key | key diversification, protected parts |
| 2019 | Plundervolt | software undervolting of SGX | microcode locking the voltage interface |
| 2020 | Trezor seed extraction | glitch on a general-purpose microcontroller | passphrases; secure elements |
| 2021 | Google Titan key cloned | EM leak in a certified secure element | new chip generation |
| 2023 | 189 SSH host keys recovered | faulty RSA signatures in scan data | verify before release |
| 2024 | EUCLEAK | one non-constant-time inversion | Yubico firmware 5.7, own library |

The Hue, Titan and Plundervolt stories are told in Cryptanalysis Chapter 17; the faulty
TLS and SSH signatures in Cryptanalysis Chapter 13 and in
[Chapter 6](06-Big-Numbers-and-Public-Key-Code.md) here. Two lessons stand out for
defenders. The cheap software defenses (verify before release, hedged nonces) would
have prevented every natural-fault key leak in the table, and they are still missing
from many libraries' default paths. And the expensive hardware defenses fail at the
operation nobody listed: the nonce inversion in EUCLEAK, the key load in the Hue lamp.
The inventory of secret operations (§7.2, step 1 of what to do) is the first line of
defense, not a formality.

## 7.14 Going deeper

*Level: expert.*

**Higher orders and refreshing.** With $d + 1$ shares, ISW multiplication costs
$O(d^2)$ operations and $d(d+1)/2$ random values. Masks must be **refreshed** between
operations that reuse a shared value, or two gadgets can together leak what each alone
hides. Matthieu Rivain and Emmanuel Prouff's provably secure higher-order AES (CHES
2010) masked the inversion with ISW-style multiplications; Jean-Sébastien Coron,
Emmanuel Prouff, Matthieu Rivain and Thomas Roche found in 2013 that its refresh step
was not secure at higher orders, a flaw that composition notions such as strong
non-interference (2016) and probe-isolating non-interference (PINI, 2020) were designed
to rule out. The noisy-leakage results of Prouff and Rivain (2013) and of Duc,
Dziembowski and Faust (2014), summarized in Cryptanalysis §17.15, are what connect these
probing proofs to the trace counts of §7.5.

**Beyond Boolean.** Multiplicative masking ($x \cdot m$ in $\mathrm{GF}(2^8)$) makes the
inversion easy but cannot mask zero, which Jovan Golić and Christophe Tymen exploited
in 2002. Inner-product and code-based masking share a value with a linear code and
can trade shares for noise. Arithmetic masking modulo $q$ for lattice schemes, and its
conversions to Boolean masking, are the current frontier
([Post-quantum, Chapter 17](../post-quantum/17-Implementing-Post-Quantum-Safely.md)).

**Leakage resilience at the protocol level.** If the attacker needs $N$ traces under
one key, a mode that never uses a key more than a few times defeats them whatever the
implementation leaks. **Fresh re-keying** (Marcel Medwed, François-Xavier Standaert,
Johann Großschädl and Francesco Regazzoni, 2010) derives a new session key per message
from a master key with a function that is easy to protect, and leakage-resilient
authenticated encryption, such as ISAP among the NIST lightweight-cryptography
finalists, is built so that the expensive protection is needed only in a small part.

**Verification of hardware and of processors.** Tools now check masking properties on
gate-level netlists (SILVER, by David Knichel, Pascal Sasdrich and Amir Moradi, 2020)
and on the netlist of a whole processor running masked software (coco, by Barbara
Gigerl, Vedad Hadžić, Robert Primas, Stefan Mangard and Roderick Bloem, 2021), which
catches the register and pipeline transitions of §7.5 that source-level proofs miss.

**Combined attacks.** An attacker can fault a masked implementation to remove a mask
(force a random value to zero) and then attack its leakage at first order, or use the
leakage to time a fault. Defenses that resist both at once, with provable statements in
a combined model (CAPA, 2018; M&M, 2019; and later work on combined private circuits),
are where the field is now.

## Check yourself

??? question "1. A register goes from 0x00 to 0xff. What does the Hamming weight model predict, and what does the Hamming distance model predict?"

    Weight: $\mathrm{HW}(\texttt{0xff}) = 8$. Distance:
    $\mathrm{HW}(\texttt{0x00} \oplus \texttt{0xff}) = 8$. They agree here because the
    old value is zero, which is exactly the situation of a precharged bus. From any
    other starting value the predictions differ.

??? question "2. Why does masking not reduce the SNR of the values the chip handles, and why does it still work?"

    Each share is a real value on a real wire and leaks fully: grouped by the share,
    the SNR is unchanged (0.5 in the code of §7.2). But each share alone is
    independent of the secret, so grouped by the secret the SNR is zero, and the
    attacker's prediction from a key guess has nothing to correlate with.

??? question "3. Compute the masked table entry T[0x43] for m_in = 0x5a and m_out = 0xc3, given S(0x19) = 0xd4."

    $T[x \oplus m_{\text{in}}] = S(x) \oplus m_{\text{out}}$ with
    $x = \texttt{0x43} \oplus \texttt{0x5a} = \texttt{0x19}$, so
    $T[\texttt{0x43}] = \texttt{0xd4} \oplus \texttt{0xc3} = \texttt{0x17}$.

??? question "4. In the experiment of §7.4, the best guess against the masked traces scored 0.025 with 20,000 traces over 50 samples. Why is that not evidence of a leak?"

    Pure noise gives correlations of standard deviation $1/\sqrt{20{,}000} \approx
    0.0071$. The attack took the maximum over $256 \times 50 = 12{,}800$ such values,
    which is about $\sqrt{2 \ln 12{,}800} \approx 4.35$ standard deviations, or 0.031.
    A best score of 0.025 is what noise alone produces, and the true key ranked 229th.

??? question "5. Noise has standard deviation 4 instead of 2. Roughly how many more traces does the second-order attack need than the first-order one?"

    $4(2 + \sigma^2) = 4 \cdot 18 = 72$ times as many, against 24 times at
    $\sigma = 2$. The first-order attack itself also gets more expensive, so the
    absolute trace count grows faster still.

??? question "6. Why does using the same mask for the input and output of the masked S-box table break the implementation on a microcontroller, even though every value is masked?"

    The register that held $x \oplus m$ is overwritten by $S(x) \oplus m$, and the
    register leaks the Hamming distance, $\mathrm{HW}(x \oplus S(x))$, in which the
    mask cancels. A first-order attack with that model recovers the key (in 300 traces
    in §7.5). With independent masks the distance stays masked by
    $m_{\text{in}} \oplus m_{\text{out}}$.

??? question "7. Shuffling over 16 positions reduces the correlation at one sample by a factor of 16. Why does it cost an attacker only about a factor of 16 in traces, not 256?"

    The attacker sums the 16 candidate samples. The target leaks in the sum every
    time, so the covariance is restored, and the variance grows only by 16, so the
    correlation drops by $\sqrt{16} = 4$ and the trace count by $4^2 = 16$.

??? question "8. Show that computing a0b1 XOR a1b0 before adding the random bit in the ISW multiplication leaks at first order."

    If $a = b = 0$ then $a_1 = a_0$ and $b_1 = b_0$, so $a_0 b_1 \oplus a_1 b_0 =
    a_0 b_0 \oplus a_0 b_0 = 0$ always. If $a = b = 1$ then $a_1 = \bar a_0$ and
    $b_1 = \bar b_0$, and the value is $a_0 \oplus b_0$, uniform. One probe on that
    wire distinguishes the two cases.

??? question "9. A device duplicates its computation and compares the results. Which faults does this stop, and which not?"

    It stops a fault that hits one run only, such as a random particle strike. It does
    not stop a repeatable fault applied at the same point of both runs, which gives
    two equal wrong results, nor a fault on the comparison or the branch after it.
    Make the second computation different (an inverse or complemented data) and
    harden the decision.

??? question "10. An infective countermeasure XORs a random nonzero byte into a faulty output. How does an attacker recover the key anyway, and what is the fix?"

    The faulty outputs take every value except the raw faulty result
    $c' = S(0) \oplus k_2$. After a few thousand faults the one value never seen is
    $c'$, which gives $k_2$. Draw the random byte uniformly from all 256 values, zero
    included, so that the faulty outputs are uniform and reveal nothing.

## What you learned

- Chips leak the Hamming weight of what they write or the Hamming distance of what they
  overwrite; the defender measures the SNR with known keys and turns it into a trace
  count with $N \approx 28/\rho^2$.
- Boolean masking splits each secret into random shares; linear steps work share by
  share, and AES's S-box is handled by a masked table rebuilt for each encryption.
- Masking defeats first-order attacks completely in the model, and a second-order
  attack on the centered product of two samples recovers the key at about
  $4(2 + \sigma^2)$ times the cost: masking multiplies noise, so it needs noise.
- Masking breaks when two shares meet: one shared mask plus a register's Hamming
  distance gave the key back in 300 traces. Design for the target's real leakage model
  and test the binary.
- Shuffling over $n$ positions costs an integrating attacker a factor of about $n$;
  hiding multiplies masking and never replaces it.
- ISW gives provable probing security, but glitches in hardware need threshold
  implementations (non-completeness) or other glitch-robust schemes; brute-force
  checks of small gadgets catch real mistakes.
- Faults are stopped by different redundant computations, inverse checks, hardened
  status words and fault counters, verify-after-compute and hedged signatures;
  infective computation removes the decision but needs uniform randomness; SIFA
  needs masking and correction as well.
- Evaluations combine leakage tests (TVLA, ISO/IEC 17825) with attack-based ratings
  (Common Criteria, AVA_VAN.5); FIPS 140-3 non-invasive testing is narrower than its
  name suggests.
- On Mars, radiation makes faults routine: error-corrected, scrubbed memory, key check
  values and fault-resistant signing work in layers.

**Next:** [Chapter 8](08-Hostile-Input.md), where the attacker sends bytes instead of
glitches: memory safety, parsers and denial of service.

## Further reading

- Paul Kocher, Joshua Jaffe and Benjamin Jun, "Differential Power Analysis" (CRYPTO
  1999); Éric Brier, Christophe Clavier and Francis Olivier, "Correlation Power
  Analysis with a Leakage Model" (CHES 2004).
- Stefan Mangard, Elisabeth Oswald and Thomas Popp, *Power Analysis Attacks: Revealing
  the Secrets of Smart Cards* (Springer, 2007): leakage models, SNR, masking and hiding.
- Louis Goubin and Jacques Patarin, "DES and Differential Power Analysis: the
  'Duplication' Method" (CHES 1999); Suresh Chari, Charanjit Jutla, Josyula Rao and
  Pankaj Rohatgi, "Towards Sound Approaches to Counteract Power-Analysis Attacks"
  (CRYPTO 1999).
- Thomas Messerges, "Securing the AES Finalists Against Power Analysis Attacks" (FSE
  2000) and "Using Second-Order Power Analysis to Attack DPA Resistant Software" (CHES
  2000).
- FIPS 197, Advanced Encryption Standard (2001, updated 2023): the S-box and the
  example vectors of Appendices B and C.1.
- Yuval Ishai, Amit Sahai and David Wagner, "Private Circuits: Securing Hardware
  against Probing Attacks" (CRYPTO 2003).
- Stefan Mangard, Norbert Pramstaller and Elisabeth Oswald, "Successfully Attacking
  Masked AES Hardware Implementations" (CHES 2005).
- Svetla Nikova, Christian Rechberger and Vincent Rijmen, "Threshold Implementations
  Against Side-Channel Attacks and Glitches" (ICICS 2006); Svetla Nikova, Vincent
  Rijmen and Martin Schläffer, "Secure Hardware Implementation of Nonlinear Functions
  in the Presence of Glitches" (*Journal of Cryptology*, 2011).
- Hannes Gross, Stefan Mangard and Thomas Korak, "Domain-Oriented Masking" (ACM TIS
  2016); Gilles Barthe et al., "Verified Proofs of Higher-Order Masking" (EUROCRYPT
  2015, maskVerif) and "Strong Non-Interference and Type-Directed Higher-Order
  Masking" (ACM CCS 2016).
- Matthieu Rivain and Emmanuel Prouff, "Provably Secure Higher-Order Masking of AES"
  (CHES 2010); Jean-Sébastien Coron, Emmanuel Prouff, Matthieu Rivain and Thomas
  Roche, "Higher-Order Side Channel Security and Mask Refreshing" (FSE 2013).
- Christophe Clavier, Jean-Sébastien Coron and Nora Dabbous, "Differential Power
  Analysis in the Presence of Hardware Countermeasures" (CHES 2000); Jean-Sébastien
  Coron and Ilya Kizhvatov, "An Efficient Method for Random Delay Generation in
  Embedded Software" (CHES 2009); Kris Tiri and Ingrid Verbauwhede, "A Logic Level
  Design Methodology for a Secure DPA Resistant ASIC or FPGA Implementation" (DATE
  2004).
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of Checking
  Cryptographic Protocols for Faults" (EUROCRYPT 1997).
- Sung-Ming Yen, Seungjoo Kim, Seongan Lim and Sangjae Moon, "RSA Speedup with
  Residue Number System Immune against Hardware Fault Cryptanalysis" (ICISC 2001);
  Benedikt Gierlichs, Jörn-Marc Schmidt and Michael Tunstall, "Infective Computation
  and Dummy Rounds" (LATINCRYPT 2012); Alberto Battistello and Christophe Giraud,
  "Fault Analysis of Infective AES Computations" (FDTC 2013); Victor Lomné, Thomas
  Roche and Adrian Thillard, "On the Need of Randomness in Fault Attack
  Countermeasures" (FDTC 2012).
- Christoph Dobraunig, Maria Eichlseder, Thomas Korak, Stefan Mangard, Florian Mendel
  and Robert Primas, "SIFA: Exploiting Ineffective Fault Inductions on Symmetric
  Cryptography" (TCHES 2018); Oscar Reparaz et al., "CAPA" (CRYPTO 2018); Lauren De
  Meyer et al., "M&M: Masks and Macs against Physical Attacks" (TCHES 2019).
- Gilbert Goodwill, Benjamin Jun, Josh Jaffe and Pankaj Rohatgi, "A Testing
  Methodology for Side-Channel Resistance Validation" (NIST Non-Invasive Attack
  Testing Workshop, 2011).
- ISO/IEC 17825:2024, testing methods for the mitigation of non-invasive attack
  classes against cryptographic modules (first edition 2016); ISO/IEC 19790:2012 and
  ISO/IEC 19790:2025, security requirements for cryptographic modules; ISO/IEC
  24759, test requirements; ISO/IEC 15408 (Common Criteria) and its evaluation
  methodology, ISO/IEC 18045.
- FIPS 140-3, Security Requirements for Cryptographic Modules (2019); SP 800-140F,
  CMVP Approved Non-Invasive Attack Mitigation Test Metrics (2020; Revision 1 draft,
  2021).
- Joint Interpretation Library, "Application of Attack Potential to Smartcards and
  Similar Devices"; Security IC Platform Protection Profile with Augmentation Packages
  (BSI-CC-PP-0084, 2014).
- Thomas Roche, "EUCLEAK: Side-Channel Attack on the YubiKey 5 Series" (IACR ePrint
  2024/1380); Yubico Security Advisory YSA-2024-03 (3 September 2024).
- Kraken Security Labs, "Kraken Identifies Critical Flaw in Trezor Hardware Wallets"
  (31 January 2020).
- Cary Zeitlin et al., "Measurements of Energetic Particle Radiation in Transit to Mars
  on the Mars Science Laboratory" (*Science* 340, 2013); Donald Hassler et al., "Mars'
  Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity
  Rover" (*Science* 343, 2014).
- BAE Systems, RAD750 radiation-hardened processor data sheets; NASA/JPL mission
  updates on Curiosity's computer swap (February and March 2013).
- Bianca Schroeder, Eduardo Pinheiro and Wolf-Dietrich Weber, "DRAM Errors in the
  Wild: A Large-Scale Field Study" (SIGMETRICS 2009).
- Florian Weimer, "Factoring RSA Keys With TLS Perfect Forward Secrecy" (Red Hat,
  2015); Keegan Ryan, Kaiwen He, George Arnold Sullivan and Nadia Heninger, "Passive
  SSH Key Compromise via Lattices" (ACM CCS 2023).
- David Knichel, Pascal Sasdrich and Amir Moradi, "SILVER: Statistical Independence and
  Leakage Verification" (ASIACRYPT 2020); Barbara Gigerl et al., "Coco: Co-Design and
  Co-Verification of Masked Software Implementations on CPUs" (USENIX Security 2021).
- Marcel Medwed, François-Xavier Standaert, Johann Großschädl and Francesco Regazzoni,
  "Fresh Re-Keying: Security against Side-Channel and Fault Attacks for Low-Cost
  Devices" (AFRICACRYPT 2010).
