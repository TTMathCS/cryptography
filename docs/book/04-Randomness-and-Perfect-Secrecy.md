# 4. Randomness and Perfect Secrecy

*Every key, nonce and salt in this book must be unpredictable, and "unpredictable"
can be measured. This chapter teaches the probability cryptographers use:
entropy, the birthday bound and security levels. Then it builds the one cipher
that is provably unbreakable, the one-time pad, proves Shannon's theorem about
it, and shows the one mistake that has broken it again and again. It ends with
where random numbers actually come from, and the long list of systems that fell
because theirs weren't random enough.*

!!! abstract "In this chapter"

    **You will learn:**

    - the probability you need: uniform choices, independence and expected search time
    - entropy and min-entropy: how many bits of real uncertainty a key or password has
    - the birthday bound, and why it halves the security of hashes, nonces and 64-bit blocks
    - XOR, the one-time pad, and Shannon's proof of perfect secrecy and of its price
    - the two-time pad, Tunny and Venona
    - how operating systems and DRBGs make random numbers, and how Netscape, Debian, Android and Dual_EC got it wrong

    **You need:** [Chapter 1](01-What-Cryptography-Is-For.md) (security levels),
    [Chapter 2](02-Classical-Ciphers.md) (the Vigenère cipher and unicity
    distance) and a little of [Chapter 3](03-The-Arithmetic-of-Secrets.md).

    **Levels:** sections 4.1 to 4.6 are for beginners, 4.7 to 4.11 are
    intermediate, and 4.12 is expert.

## 4.1 The problem

In September 1995 two Berkeley graduate students, Ian Goldberg and David
Wagner, looked at how Netscape Navigator, the most popular browser of the day,
chose the secret keys that protected credit card numbers on the web. The cipher
was fine. The key was not. Netscape seeded its random generator with the time
of day, its own process ID and its parent's process ID. An attacker who knew
roughly when a connection was made could try the few possible seeds and recover
the key, often in under a minute. A 128-bit key had a few tens of bits of real
uncertainty.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Time of day and two process IDs feed a mixing step that outputs a 128-bit key with only a few tens of bits of real uncertainty" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="20" width="170" height="48" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="20" width="170" height="48" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="41" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">time of day</text>
<text x="95" y="56" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">seconds + microseconds</text>
<line x1="180" y1="44" x2="244.7" y2="99.4" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,104 241.6,101.5 246.3,96.1" fill="currentColor"/>
<rect x="10" y="82" width="170" height="48" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="82" width="170" height="48" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="103" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">process ID</text>
<text x="95" y="118" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">a small number</text>
<line x1="180" y1="106" x2="243" y2="104.2" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,104 242.1,107.8 241.9,100.6" fill="currentColor"/>
<rect x="10" y="144" width="170" height="48" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="144" width="170" height="48" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="165" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">parent's process ID</text>
<text x="95" y="180" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">a small number</text>
<line x1="180" y1="168" x2="244.8" y2="108.7" stroke="currentColor" stroke-width="1.5"/>
<polygon points="250,104 246.5,112.1 241.7,106.7" fill="currentColor"/>
<rect x="250" y="80" width="110" height="48" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="250" y="80" width="110" height="48" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="305" y="108.5" font-size="13" text-anchor="middle" fill="currentColor">MD5 mixing</text>
<line x1="360" y1="104" x2="413" y2="104" stroke="currentColor" stroke-width="1.5"/>
<polygon points="420,104 412,107.6 412,100.4" fill="currentColor"/>
<rect x="420" y="74" width="210" height="60" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="420" y="74" width="210" height="60" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="420" y="74" width="210" height="60" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="525" y="108.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">128-bit session key</text>
<text x="525" y="160" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">looks like 128 bits</text>
<text x="525" y="178" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">but only a few tens of bits</text>
<text x="525" y="196" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">were really unknown</text>
</svg>
<figcaption>Figure 4.1. Netscape's 1995 key generator. However well the inputs are mixed, the key can't be less predictable than the inputs, and an eavesdropper could guess these.</figcaption>
</figure>

That is the lesson of this chapter in one story. Every security level in
[Chapter 1](01-What-Cryptography-Is-For.md) assumes the key was chosen
**uniformly at random** from all possible keys. If it wasn't, the key length
means nothing.

People have needed randomness for a long time: astragali (knucklebones) and
dice in the ancient Mediterranean, yarrow stalks for divination in China, lots
drawn to choose officials in Athens. Machines came late. In 1955 the RAND
Corporation published *A Million Random Digits with 100,000 Normal Deviates*, a
book of random numbers made from an electronic noise source, for scientists who
needed them. In 1957 Britain's Premium Bonds lottery began drawing winners
with ERNIE, a machine built by Tommy Flowers and Harry Fensom, who had built
Colossus at Bletchley Park; it used noise in neon tubes. John von Neumann, who
used random numbers in the first computer simulations, warned in 1949:
"Anyone who considers arithmetical methods of producing random digits is, of
course, in a state of sin." Computers are deterministic machines, and turning
them into sources of secrets is harder than it looks.

<figure class="mars-fig">
<svg viewBox="0 0 560 590" width="560" role="img" aria-label="Timeline from Frank Miller's pad of 1882 to Sweet32 and Linux's ChaCha20 generator in 2016" xmlns="http://www.w3.org/2000/svg">
<text x="280" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Pads, randomness and their failures</text>
<line x1="104" y1="36" x2="104" y2="558" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="49" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1882</text>
<circle cx="104" cy="44" r="4" fill="currentColor"/>
<text x="118" y="49" font-size="13" text-anchor="start" fill="currentColor">Frank Miller's one-time pad for telegrams</text>
<text x="90" y="79" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1917</text>
<circle cx="104" cy="74" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="79" font-size="13" text-anchor="start" fill="currentColor">Vernam's XOR tape machine</text>
<text x="90" y="109" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1941</text>
<circle cx="104" cy="104" r="4" fill="currentColor"/>
<text x="118" y="109" font-size="13" text-anchor="start" fill="currentColor">Tunny: a Lorenz key setting used twice</text>
<text x="90" y="139" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1943</text>
<circle cx="104" cy="134" r="4" fill="currentColor"/>
<text x="118" y="139" font-size="13" text-anchor="start" fill="currentColor">Venona: Grabeel starts on reused pads</text>
<text x="90" y="169" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1948–49</text>
<circle cx="104" cy="164" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="169" font-size="13" text-anchor="start" fill="currentColor">Shannon: entropy; perfect secrecy proved</text>
<text x="90" y="199" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1955</text>
<circle cx="104" cy="194" r="4" fill="currentColor"/>
<text x="118" y="199" font-size="13" text-anchor="start" fill="currentColor">RAND's book of a million random digits</text>
<text x="90" y="229" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1957</text>
<circle cx="104" cy="224" r="4" fill="currentColor"/>
<text x="118" y="229" font-size="13" text-anchor="start" fill="currentColor">ERNIE draws Premium Bond winners</text>
<text x="90" y="259" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1963</text>
<circle cx="104" cy="254" r="4" fill="currentColor"/>
<text x="118" y="259" font-size="13" text-anchor="start" fill="currentColor">Moscow–Washington hotline on one-time tape</text>
<text x="90" y="289" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1994</text>
<circle cx="104" cy="284" r="4" fill="currentColor"/>
<text x="118" y="289" font-size="13" text-anchor="start" fill="currentColor">Linux /dev/random</text>
<text x="90" y="319" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1995</text>
<circle cx="104" cy="314" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="319" font-size="13" text-anchor="start" fill="currentColor">Netscape's guessable seed</text>
<text x="90" y="349" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2006</text>
<circle cx="104" cy="344" r="4" fill="currentColor"/>
<text x="118" y="349" font-size="13" text-anchor="start" fill="currentColor">Debian's two deleted lines; Dual_EC standard</text>
<text x="90" y="379" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2008</text>
<circle cx="104" cy="374" r="4" fill="currentColor"/>
<text x="118" y="379" font-size="13" text-anchor="start" fill="currentColor">Debian flaw found</text>
<text x="90" y="409" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2010</text>
<circle cx="104" cy="404" r="4" fill="currentColor"/>
<text x="118" y="409" font-size="13" text-anchor="start" fill="currentColor">PlayStation 3 signing key extracted</text>
<text x="90" y="439" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2012</text>
<circle cx="104" cy="434" r="4" fill="currentColor"/>
<text x="118" y="439" font-size="13" text-anchor="start" fill="currentColor">Mining your Ps and Qs</text>
<text x="90" y="469" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2013</text>
<circle cx="104" cy="464" r="4" fill="currentColor"/>
<text x="118" y="469" font-size="13" text-anchor="start" fill="currentColor">Android wallets; Snowden on Dual_EC</text>
<text x="90" y="499" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2014</text>
<circle cx="104" cy="494" r="4" fill="currentColor"/>
<text x="118" y="499" font-size="13" text-anchor="start" fill="currentColor">Linux getrandom()</text>
<text x="90" y="529" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2015</text>
<circle cx="104" cy="524" r="4" fill="currentColor"/>
<text x="118" y="529" font-size="13" text-anchor="start" fill="currentColor">Juniper's replaced Q</text>
<text x="90" y="559" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">2016</text>
<circle cx="104" cy="554" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="559" font-size="13" text-anchor="start" fill="currentColor">Sweet32; Linux moves to ChaCha20</text>
</svg>
<figcaption>Figure 4.2. The chapter's story in dates: a perfect cipher found early, proved perfect in 1949, and broken in practice only by people reusing pads; then fifty years of real systems failing for want of good random numbers.</figcaption>
</figure>

## 4.2 The probability you need

A **random experiment** has outcomes, each with a probability between 0 and 1,
adding up to 1. A choice is **uniform** if every one of $N$ outcomes has
probability $1/N$: a fair die, a fair coin, a properly made 128-bit key
($N = 2^{128}$).

Three rules do almost all the work in this book:

- **Independent events multiply.** Two fair coins both land heads with
  probability $\frac12 \cdot \frac12 = \frac14$; $n$ random bits all match a
  guess with probability $2^{-n}$.
- **The complement.** $\Pr[\text{at least one}] = 1 - \Pr[\text{none}]$. The
  chance that a 6 turns up in 4 rolls of a die is
  $1 - (5/6)^4 \approx 0.518$.
- **The union bound.** $\Pr[A \text{ or } B] \le \Pr[A] + \Pr[B]$. If an attacker
  makes $q$ guesses, each right with probability $2^{-n}$, the chance any is
  right is at most $q \cdot 2^{-n}$.

**Searching for a key.** A uniform $n$-bit key, searched in any order, is found
after $2^{n-1}$ tries on average and $2^n$ at worst. Cryptographers just say
"about $2^n$ work". After $q$ tries the chance of success is $q / 2^n$, which
is the union bound again.

**Many targets.** If an attacker wants *any one* of $T$ keys (say a million
users' keys) and each try can be checked against all of them, each try succeeds
with probability $T / 2^n$, and the work drops by a factor of $T$: a million
targets cost about 20 bits. That is why password hashes need salts
([Chapter 11](11-Passwords-and-Key-Derivation.md)) and why standards size some
keys with a margin.

## 4.3 Entropy: measuring uncertainty

Claude Shannon defined **entropy** in "A Mathematical Theory of Communication"
(1948): the average number of bits of genuine surprise in a value. For a value
$X$ that takes outcome $x$ with probability $p_x$,

$$
H(X) = -\sum_x p_x \log_2 p_x \quad \text{bits}.
$$

For a uniform choice among $N$ outcomes every $p_x = 1/N$, and $H = \log_2 N$:
a fair coin is 1 bit, a fair die is $\log_2 6 \approx 2.58$ bits, a uniform
128-bit key is 128 bits. Any bias lowers it. A coin that lands heads 90% of the
time has only 0.47 bits.

```python
from math import log2

def entropy(ps):                     # Shannon entropy in bits
    return -sum(p * log2(p) for p in ps if p > 0)

F = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
     6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074]   # English letters, per cent
print(entropy([0.5, 0.5]), round(entropy([1/6] * 6), 3), round(entropy([0.9, 0.1]), 3))   # 1.0 2.585 0.469
print(round(entropy([f / sum(F) for f in F]), 2), round(log2(26), 2))                     # 4.18 4.7
```

A single English letter, judged only by its frequency, carries 4.18 bits, not
the 4.7 a uniform letter would. Taking context into account (after TH, an E is
very likely) Shannon estimated in 1951 that English carries only about 1 bit
per letter. The gap is the **redundancy** that made frequency analysis and the
unicity distance of [Chapter 2](02-Classical-Ciphers.md) work.

**Min-entropy.** Average surprise is not the right measure for an attacker, who
guesses the most likely value first. **Min-entropy** looks only at that:

$$
H_\infty(X) = -\log_2 \max_x p_x .
$$

For the 90% coin it is $-\log_2 0.9 \approx 0.15$ bits. For a uniform value it
equals the ordinary entropy. NIST's rules for entropy sources (SP 800-90B) are
stated in min-entropy, and so is the rule for keys: **a $k$-bit key needs $k$
bits of min-entropy.**

<figure class="mars-fig">
<svg viewBox="0 0 560 320" width="560" role="img" aria-label="Entropy and min-entropy of a biased coin against the probability of heads; both are 1 bit at p = 0.5 and fall to 0 at the ends" xmlns="http://www.w3.org/2000/svg">
<line x1="60" y1="260" x2="540" y2="260" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="264" font-size="12" text-anchor="end" fill="currentColor">0</text>
<line x1="60" y1="140" x2="540" y2="140" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="144" font-size="12" text-anchor="end" fill="currentColor">0.5</text>
<line x1="60" y1="20" x2="540" y2="20" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="24" font-size="12" text-anchor="end" fill="currentColor">1</text>
<text x="60" y="278" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<text x="180" y="278" font-size="12" text-anchor="middle" fill="currentColor">0.25</text>
<text x="300" y="278" font-size="12" text-anchor="middle" fill="currentColor">0.5</text>
<text x="420" y="278" font-size="12" text-anchor="middle" fill="currentColor">0.75</text>
<text x="540" y="278" font-size="12" text-anchor="middle" fill="currentColor">1</text>
<path d="M60.0 260.0 L62.4 249.1 L64.8 240.6 L67.2 233.0 L69.6 226.1 L72.0 219.5 L74.4 213.3 L76.8 207.5 L79.2 201.8 L81.6 196.5 L84.0 191.3 L86.4 186.3 L88.8 181.4 L91.2 176.7 L93.6 172.2 L96.0 167.8 L98.4 163.5 L100.8 159.3 L103.2 155.2 L105.6 151.3 L108.0 147.4 L110.4 143.7 L112.8 140.0 L115.2 136.4 L117.6 133.0 L120.0 129.5 L122.4 126.2 L124.8 123.0 L127.2 119.8 L129.6 116.7 L132.0 113.6 L134.4 110.7 L136.8 107.8 L139.2 104.9 L141.6 102.2 L144.0 99.4 L146.4 96.8 L148.8 94.2 L151.2 91.6 L153.6 89.2 L156.0 86.7 L158.4 84.4 L160.8 82.0 L163.2 79.8 L165.6 77.6 L168.0 75.4 L170.4 73.3 L172.8 71.2 L175.2 69.2 L177.6 67.2 L180.0 65.3 L182.4 63.4 L184.8 61.6 L187.2 59.8 L189.6 58.0 L192.0 56.3 L194.4 54.7 L196.8 53.1 L199.2 51.5 L201.6 50.0 L204.0 48.5 L206.4 47.0 L208.8 45.6 L211.2 44.3 L213.6 42.9 L216.0 41.7 L218.4 40.4 L220.8 39.2 L223.2 38.0 L225.6 36.9 L228.0 35.8 L230.4 34.8 L232.8 33.8 L235.2 32.8 L237.6 31.8 L240.0 30.9 L242.4 30.1 L244.8 29.2 L247.2 28.4 L249.6 27.7 L252.0 27.0 L254.4 26.3 L256.8 25.6 L259.2 25.0 L261.6 24.5 L264.0 23.9 L266.4 23.4 L268.8 22.9 L271.2 22.5 L273.6 22.1 L276.0 21.7 L278.4 21.4 L280.8 21.1 L283.2 20.8 L285.6 20.6 L288.0 20.4 L290.4 20.3 L292.8 20.2 L295.2 20.1 L297.6 20.0 L300.0 20.0 L302.4 20.0 L304.8 20.1 L307.2 20.2 L309.6 20.3 L312.0 20.4 L314.4 20.6 L316.8 20.8 L319.2 21.1 L321.6 21.4 L324.0 21.7 L326.4 22.1 L328.8 22.5 L331.2 22.9 L333.6 23.4 L336.0 23.9 L338.4 24.5 L340.8 25.0 L343.2 25.6 L345.6 26.3 L348.0 27.0 L350.4 27.7 L352.8 28.4 L355.2 29.2 L357.6 30.1 L360.0 30.9 L362.4 31.8 L364.8 32.8 L367.2 33.8 L369.6 34.8 L372.0 35.8 L374.4 36.9 L376.8 38.0 L379.2 39.2 L381.6 40.4 L384.0 41.7 L386.4 42.9 L388.8 44.3 L391.2 45.6 L393.6 47.0 L396.0 48.5 L398.4 50.0 L400.8 51.5 L403.2 53.1 L405.6 54.7 L408.0 56.3 L410.4 58.0 L412.8 59.8 L415.2 61.6 L417.6 63.4 L420.0 65.3 L422.4 67.2 L424.8 69.2 L427.2 71.2 L429.6 73.3 L432.0 75.4 L434.4 77.6 L436.8 79.8 L439.2 82.0 L441.6 84.4 L444.0 86.7 L446.4 89.2 L448.8 91.6 L451.2 94.2 L453.6 96.8 L456.0 99.4 L458.4 102.2 L460.8 104.9 L463.2 107.8 L465.6 110.7 L468.0 113.6 L470.4 116.7 L472.8 119.8 L475.2 123.0 L477.6 126.2 L480.0 129.5 L482.4 133.0 L484.8 136.4 L487.2 140.0 L489.6 143.7 L492.0 147.4 L494.4 151.3 L496.8 155.2 L499.2 159.3 L501.6 163.5 L504.0 167.8 L506.4 172.2 L508.8 176.7 L511.2 181.4 L513.6 186.3 L516.0 191.3 L518.4 196.5 L520.8 201.8 L523.2 207.5 L525.6 213.3 L528.0 219.5 L530.4 226.1 L532.8 233.0 L535.2 240.6 L537.6 249.1 L540.0 260.0" stroke="currentColor" stroke-width="2.5" fill="none" class="acc"/>
<path d="M60.0 260.0 L62.4 258.3 L64.8 256.5 L67.2 254.8 L69.6 253.0 L72.0 251.2 L74.4 249.5 L76.8 247.7 L79.2 245.9 L81.6 244.1 L84.0 242.2 L86.4 240.4 L88.8 238.6 L91.2 236.7 L93.6 234.9 L96.0 233.0 L98.4 231.1 L100.8 229.2 L103.2 227.3 L105.6 225.4 L108.0 223.5 L110.4 221.6 L112.8 219.7 L115.2 217.7 L117.6 215.7 L120.0 213.8 L122.4 211.8 L124.8 209.8 L127.2 207.8 L129.6 205.8 L132.0 203.7 L134.4 201.7 L136.8 199.6 L139.2 197.6 L141.6 195.5 L144.0 193.4 L146.4 191.3 L148.8 189.2 L151.2 187.0 L153.6 184.9 L156.0 182.7 L158.4 180.6 L160.8 178.4 L163.2 176.2 L165.6 174.0 L168.0 171.7 L170.4 169.5 L172.8 167.2 L175.2 165.0 L177.6 162.7 L180.0 160.4 L182.4 158.1 L184.8 155.7 L187.2 153.4 L189.6 151.0 L192.0 148.7 L194.4 146.3 L196.8 143.8 L199.2 141.4 L201.6 139.0 L204.0 136.5 L206.4 134.0 L208.8 131.5 L211.2 129.0 L213.6 126.5 L216.0 123.9 L218.4 121.3 L220.8 118.7 L223.2 116.1 L225.6 113.5 L228.0 110.8 L230.4 108.2 L232.8 105.5 L235.2 102.8 L237.6 100.0 L240.0 97.3 L242.4 94.5 L244.8 91.7 L247.2 88.9 L249.6 86.0 L252.0 83.1 L254.4 80.2 L256.8 77.3 L259.2 74.4 L261.6 71.4 L264.0 68.4 L266.4 65.4 L268.8 62.3 L271.2 59.2 L273.6 56.1 L276.0 53.0 L278.4 49.8 L280.8 46.6 L283.2 43.4 L285.6 40.2 L288.0 36.9 L290.4 33.6 L292.8 30.2 L295.2 26.9 L297.6 23.4 L300.0 20.0 L302.4 23.4 L304.8 26.9 L307.2 30.2 L309.6 33.6 L312.0 36.9 L314.4 40.2 L316.8 43.4 L319.2 46.6 L321.6 49.8 L324.0 53.0 L326.4 56.1 L328.8 59.2 L331.2 62.3 L333.6 65.4 L336.0 68.4 L338.4 71.4 L340.8 74.4 L343.2 77.3 L345.6 80.2 L348.0 83.1 L350.4 86.0 L352.8 88.9 L355.2 91.7 L357.6 94.5 L360.0 97.3 L362.4 100.0 L364.8 102.8 L367.2 105.5 L369.6 108.2 L372.0 110.8 L374.4 113.5 L376.8 116.1 L379.2 118.7 L381.6 121.3 L384.0 123.9 L386.4 126.5 L388.8 129.0 L391.2 131.5 L393.6 134.0 L396.0 136.5 L398.4 139.0 L400.8 141.4 L403.2 143.8 L405.6 146.3 L408.0 148.7 L410.4 151.0 L412.8 153.4 L415.2 155.7 L417.6 158.1 L420.0 160.4 L422.4 162.7 L424.8 165.0 L427.2 167.2 L429.6 169.5 L432.0 171.7 L434.4 174.0 L436.8 176.2 L439.2 178.4 L441.6 180.6 L444.0 182.7 L446.4 184.9 L448.8 187.0 L451.2 189.2 L453.6 191.3 L456.0 193.4 L458.4 195.5 L460.8 197.6 L463.2 199.6 L465.6 201.7 L468.0 203.7 L470.4 205.8 L472.8 207.8 L475.2 209.8 L477.6 211.8 L480.0 213.8 L482.4 215.7 L484.8 217.7 L487.2 219.7 L489.6 221.6 L492.0 223.5 L494.4 225.4 L496.8 227.3 L499.2 229.2 L501.6 231.1 L504.0 233.0 L506.4 234.9 L508.8 236.7 L511.2 238.6 L513.6 240.4 L516.0 242.2 L518.4 244.1 L520.8 245.9 L523.2 247.7 L525.6 249.5 L528.0 251.2 L530.4 253.0 L532.8 254.8 L535.2 256.5 L537.6 258.3 L540.0 260.0" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="6 4"/>
<line x1="492" y1="260" x2="492" y2="147.4" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2"/>
<circle cx="492" cy="147.4" r="4.5" fill="currentColor" class="acc-fill"/>
<circle cx="492" cy="223.5" r="4.5" fill="currentColor"/>
<text x="484" y="141.4" font-size="12" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">0.47</text>
<text x="484" y="217.5" font-size="12" text-anchor="end" fill="currentColor" font-weight="bold">0.15</text>
<text x="300" y="14" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">Shannon entropy</text>
<rect x="254.1" y="98.8" width="91.8" height="16.9" style="fill: var(--md-default-bg-color)"/>
<text x="300" y="111.2" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">min-entropy</text>
<text x="300" y="306" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">probability of heads, p</text>
<text x="16" y="140" font-size="12" text-anchor="middle" fill="currentColor" transform="rotate(-90 16 140)">bits</text>
</svg>
<figcaption>Figure 4.3. A coin's uncertainty in bits. Both measures peak at a fair coin. At p = 0.9 the average surprise is 0.47 bits, but an attacker who always guesses heads is right 90% of the time, which min-entropy (0.15 bits) captures.</figcaption>
</figure>

**The story.** Claude Shannon was a mathematician at Bell Labs who had spent
the war on fire-control systems and secret telephony. Bell Labs wanted to know
how much information a telephone line or a radio channel could carry, and
Shannon's answer, published in two parts in the *Bell System Technical
Journal* in 1948, created information theory in one stroke. He borrowed the
word "entropy" from physics; the formula itself had the same shape as one in
statistical mechanics. In the same paper he used the word "bit", which he
credited to his colleague John Tukey.

!!! note "Life story: entropy"
    **Born:** 1948, Claude Shannon, "A Mathematical Theory of Communication", Bell Labs · **Purpose:** measure
    information, to know how much a channel can carry · **Helped:** the basis of compression, coding and
    cryptography; Shannon's own 1949 secrecy paper and every key-strength estimate since · **Status:** current;
    for keys, the stricter min-entropy is the standard (NIST SP 800-90B)

**What passwords are worth.** If a password is chosen uniformly from $N$
possibilities, its entropy is $\log_2 N$:

| Password | Choices | Entropy |
|---|---|---|
| 8 random printable characters | $95^8$ | 52.6 bits |
| 12 random lowercase letters | $26^{12}$ | 56.4 bits |
| 6 random words from a 7,776-word list (Diceware) | $7776^6$ | 77.5 bits |
| 12 random words from 2,048 (a BIP-39 wallet phrase) | $2048^{12}$ | 132 bits, of which 128 are entropy and 4 a checksum |
| one common English word | about 20,000 | 14.3 bits |

<figure class="mars-fig">
<svg viewBox="0 0 620 250" width="620" role="img" aria-label="Bars of password entropy: a common word 14.3 bits, 8 random characters 52.6, 12 lowercase 56.4, 6 Diceware words 77.5, a BIP-39 phrase 128" xmlns="http://www.w3.org/2000/svg">
<line x1="200" y1="14" x2="200" y2="200" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="200" y="218" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<line x1="296" y1="14" x2="296" y2="200" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="296" y="218" font-size="12" text-anchor="middle" fill="currentColor">32</text>
<line x1="392" y1="14" x2="392" y2="200" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="392" y="218" font-size="12" text-anchor="middle" fill="currentColor">64</text>
<line x1="488" y1="14" x2="488" y2="200" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="488" y="218" font-size="12" text-anchor="middle" fill="currentColor">96</text>
<line x1="584" y1="14" x2="584" y2="200" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="584" y="218" font-size="12" text-anchor="middle" fill="currentColor">128</text>
<text x="190" y="38" font-size="13" text-anchor="end" fill="currentColor">one common word</text>
<rect x="200" y="24" width="42.9" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="245.9" y="28.6" width="70.8" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="248.9" y="40" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">14.3 bits</text>
<text x="190" y="74" font-size="13" text-anchor="end" fill="currentColor">8 random printable chars</text>
<rect x="200" y="60" width="157.8" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="360.8" y="64.6" width="70.8" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="363.8" y="76" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">52.6 bits</text>
<text x="190" y="110" font-size="13" text-anchor="end" fill="currentColor">12 random lowercase</text>
<rect x="200" y="96" width="169.2" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="372.2" y="100.6" width="70.8" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="375.2" y="112" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">56.4 bits</text>
<text x="190" y="146" font-size="13" text-anchor="end" fill="currentColor">6 Diceware words</text>
<rect x="200" y="132" width="232.5" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="435.5" y="136.6" width="70.8" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="438.5" y="148" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">77.5 bits</text>
<text x="190" y="182" font-size="13" text-anchor="end" fill="currentColor">12-word BIP-39 phrase</text>
<rect x="200" y="168" width="384" height="22" rx="2" class="soft-acc" fill="currentColor"/>
<rect x="200" y="168" width="384" height="22" rx="2" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="578" y="184" font-size="12" text-anchor="end" fill="currentColor" font-weight="bold">128 bits</text>
<text x="395" y="242" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">entropy in bits, if chosen uniformly at random</text>
</svg>
<figcaption>Figure 4.4. What passwords are worth, from the table above. Only random choices earn these numbers; a person picking their own password usually lands near the top bar.</figcaption>
</figure>

These numbers hold only if the choice is **truly random**. People choosing for
themselves are predictable, and leaked password lists show the same favorites
year after year. A password picked by a person might have 20 or 30 bits of
min-entropy however long it looks. That gap is why passwords are stored with
deliberately slow functions ([Chapter 11](11-Passwords-and-Key-Derivation.md)).

## 4.4 The birthday bound

How many people do you need in a room for a better-than-even chance that two
share a birthday? Not 183, but **23**. With 70 people the chance is 99.9%.

The reason: what matters is the number of **pairs**, and $k$ people make
$k(k-1)/2$ pairs. With 23 people that is 253 pairs, each with a 1-in-365
chance. Exactly, using the complement rule, the chance that all $k$ birthdays
differ is

$$
\Pr[\text{no repeat}] = \frac{N}{N} \cdot \frac{N-1}{N} \cdots \frac{N-k+1}{N}
= \prod_{i=0}^{k-1} \left(1 - \frac{i}{N}\right) \approx e^{-k(k-1)/2N},
$$

using $1 - x \approx e^{-x}$ for small $x$.

```python
def p_clash(k, N):                  # chance that k random values out of N are not all different
    q = 1.0
    for i in range(k):
        q *= (N - i) / N
    return 1 - q

print(round(p_clash(23, 365), 3), round(p_clash(70, 365), 4))   # 0.507 0.9992
```

<figure class="mars-fig">
<svg viewBox="0 0 580 320" width="580" role="img" aria-label="The probability of a shared birthday rises steeply with group size, passing 50% at 23 people and 99.9% at 70" xmlns="http://www.w3.org/2000/svg">
<line x1="60" y1="260" x2="560" y2="260" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="264" font-size="12" text-anchor="end" fill="currentColor">0%</text>
<line x1="60" y1="200" x2="560" y2="200" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="204" font-size="12" text-anchor="end" fill="currentColor">25%</text>
<line x1="60" y1="140" x2="560" y2="140" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="144" font-size="12" text-anchor="end" fill="currentColor">50%</text>
<line x1="60" y1="80" x2="560" y2="80" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="84" font-size="12" text-anchor="end" fill="currentColor">75%</text>
<line x1="60" y1="20" x2="560" y2="20" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="24" font-size="12" text-anchor="end" fill="currentColor">100%</text>
<text x="60" y="278" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<text x="185" y="278" font-size="12" text-anchor="middle" fill="currentColor">20</text>
<text x="310" y="278" font-size="12" text-anchor="middle" fill="currentColor">40</text>
<text x="435" y="278" font-size="12" text-anchor="middle" fill="currentColor">60</text>
<text x="560" y="278" font-size="12" text-anchor="middle" fill="currentColor">80</text>
<path d="M60.0 260.0 L66.2 260.0 L72.5 259.3 L78.8 258.0 L85.0 256.1 L91.2 253.5 L97.5 250.3 L103.8 246.5 L110.0 242.2 L116.2 237.3 L122.5 231.9 L128.8 226.1 L135.0 219.9 L141.2 213.3 L147.5 206.5 L153.8 199.3 L160.0 191.9 L166.2 184.4 L172.5 176.7 L178.8 169.0 L185.0 161.3 L191.2 153.5 L197.5 145.8 L203.8 138.2 L210.0 130.8 L216.2 123.5 L222.5 116.4 L228.8 109.6 L235.0 102.9 L241.2 96.6 L247.5 90.5 L253.8 84.7 L260.0 79.2 L266.2 74.0 L272.5 69.1 L278.8 64.5 L285.0 60.3 L291.2 56.3 L297.5 52.6 L303.8 49.2 L310.0 46.1 L316.2 43.2 L322.5 40.6 L328.8 38.3 L335.0 36.1 L341.2 34.2 L347.5 32.4 L353.8 30.9 L360.0 29.5 L366.2 28.2 L372.5 27.1 L378.8 26.1 L385.0 25.3 L391.2 24.5 L397.5 23.9 L403.8 23.3 L410.0 22.8 L416.2 22.4 L422.5 22.0 L428.8 21.7 L435.0 21.4 L441.2 21.2 L447.5 21.0 L453.8 20.8 L460.0 20.7 L466.2 20.6 L472.5 20.5 L478.8 20.4 L485.0 20.3 L491.2 20.2 L497.5 20.2 L503.8 20.2 L510.0 20.1 L516.2 20.1 L522.5 20.1 L528.8 20.1 L535.0 20.1 L541.2 20.0 L547.5 20.0 L553.8 20.0 L560.0 20.0" stroke="currentColor" stroke-width="2.5" fill="none" class="acc"/>
<line x1="203.8" y1="260" x2="203.8" y2="138.2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<circle cx="203.8" cy="138.2" r="5" fill="currentColor" class="acc-fill"/>
<rect x="208.8" y="143.9" width="130.8" height="16.9" style="fill: var(--md-default-bg-color)"/>
<text x="211.8" y="156.2" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">23 people: 50.7%</text>
<line x1="497.5" y1="260" x2="497.5" y2="20.2" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/>
<circle cx="497.5" cy="20.2" r="5" fill="currentColor" class="acc-fill"/>
<rect x="502.5" y="29.9" width="130.8" height="16.9" style="fill: var(--md-default-bg-color)"/>
<text x="505.5" y="42.2" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">70 people: 99.9%</text>
<text x="310" y="308" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">number of people in the room</text>
</svg>
<figcaption>Figure 4.5. The birthday curve for 365 days. A repeat becomes likely at about 1.18 × √365 ≈ 23 people, long before the room is anywhere near 365.</figcaption>
</figure>

Setting $e^{-k^2/2N} = \frac12$ gives $k \approx 1.18\sqrt{N}$ for a 50% chance,
and the expected number of draws until the first repeat is
$\sqrt{\pi N / 2} \approx 1.25\sqrt{N}$. With $N = 2^n$ that is about $2^{n/2}$.
**Repeats appear after the square root.**

**Hashes.** Finding *two* inputs with the same $n$-bit hash (a collision) needs
only about $2^{n/2}$ tries, so a 128-bit security level needs a 256-bit hash.
MD5's 128-bit output gives at best 64-bit collision security, which is one
reason it was doomed ([Chapter 9](09-Hash-Functions.md)). You can watch it
happen by cutting SHA-256 down to 32 bits; a collision turns up after a little
over $2^{16}$ tries, usually in well under a second:

```python
import hashlib, os

seen = {}
while True:
    m = os.urandom(8)
    h = hashlib.sha256(m).digest()[:4]      # only 32 bits of the hash
    if h in seen and seen[h] != m:
        print(len(seen), "tries:", seen[h].hex(), m.hex(), "both hash to", h.hex())
        break
    seen[h] = m
```

The values change every run. The number of tries is around 80,000 on average,
and nine runs in ten land between about 20,000 and 160,000.

**Nonces and IDs.** A random 32-bit session ID repeats after about
$1.25 \cdot 2^{16} \approx 82{,}000$ sessions. GCM's 96-bit random nonces must not
be used for more than about $2^{32}$ messages under one key
([Chapter 8](08-Modes-of-Operation.md)).

**Block ciphers.** A cipher with $b$-bit blocks starts showing repeated
ciphertext blocks after about $2^{b/2}$ blocks under one key, and in common modes
a repeat leaks information about the plaintext. For the 64-bit blocks of 3DES
and Blowfish that is $2^{32}$ blocks, 32 GiB, which a busy HTTPS connection sends
in hours. Karthikeyan Bhargavan and Gaëtan Leurent demonstrated it in 2016 as
the **Sweet32** attack, and 64-bit ciphers were retired. AES's 128-bit blocks
push the limit to $2^{64}$ blocks, about $3 \times 10^{20}$ bytes.

**The story.** The birthday problem is a classroom favorite from the first
half of the 20th century; it became an attack in 1979, when Gideon Yuval
published "How to Swindle Rabin" in *Cryptologia*. His swindler prepares many
harmless variants of a contract and many variants of a harmful one (changing
spaces, commas and wording that don't matter), until one of each has the same
hash; the victim signs the harmless version, and the signature also fits the
harmful one. Yuval's point was that a hash meant to resist $2^n$ work gives
only $2^{n/2}$ against this attack, which is why hash outputs doubled in size.

!!! note "Life story: the birthday attack"
    **Born:** as a probability puzzle in the early 20th century; as an attack in 1979 (Gideon Yuval, "How to
    Swindle Rabin") · **Purpose:** find collisions in about the square root of the brute-force work ·
    **Helped (attackers):** sank 64-bit hashes, then MD5 and SHA-1 with cleverer methods, and 64-bit block
    ciphers (Sweet32, 2016) · **Status:** current, and the reason hashes have 256-bit outputs and block
    ciphers 128-bit blocks

## 4.5 Security levels

Put [§4.2](#42-the-probability-you-need) to [§4.4](#44-the-birthday-bound) together and you get the security levels of this book. A
scheme has **$n$-bit security** if every known attack needs about $2^n$
operations (or succeeds with probability about $t / 2^n$ after $t$ operations).
Generic attacks fix the minimum sizes:

| To get $n$-bit security against | you need | because |
|---|---|---|
| key search on a cipher | an $n$-bit key | [§4.2](#42-the-probability-you-need): $2^n$ tries |
| collisions in a hash | a $2n$-bit output | [§4.4](#44-the-birthday-bound): the birthday bound |
| repeats among random nonces | a nonce well over $2n$ bits, or a counter | [§4.4](#44-the-birthday-bound) |
| key search by a quantum computer (Grover) | a $2n$-bit key | [Chapter 20](20-Quantum-Computers.md) |
| attacks on RSA or discrete logs | far larger numbers | [Chapter 13](13-RSA.md), [Chapter 15](15-Elliptic-Curves.md) |

NIST allows 112-bit security as the minimum today and recommends 128 bits; for
data that must stay secret for decades, or against future quantum computers,
256-bit keys for symmetric ciphers are common. The main
[algorithm table](../index.md) lists the level of every algorithm on this site.

Security proofs don't say "impossible". They say an attacker running for time
$t$ succeeds with probability about $t / 2^n$. With $n = 128$, even $2^{64}$
operations give a chance of $2^{-64}$, smaller than the chance of a cosmic ray
flipping a bit in the attacker's computer during the run.

## 4.6 Bits, XOR and the one-time pad

Computers store everything as **bits**, 0 or 1; eight make a **byte**, a number
from 0 to 255. The letter `A` is byte 65, `01000001` in binary, written `41` in
hexadecimal, where each hex digit is four bits.

**XOR.** Almost every cipher in this book uses one operation over and over:
**exclusive or**, written $\oplus$. It gives 1 if two bits differ and 0 if they
are the same:

| $a$ | $b$ | $a \oplus b$ |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |

For longer values XOR each pair of bits: `1010` $\oplus$ `0110` = `1100`. XOR is
addition mod 2 without carries, and doing it twice undoes it:

$$
a \oplus a = 0, \qquad a \oplus 0 = a, \qquad \text{so} \qquad (m \oplus k) \oplus k = m.
$$

It is the Vigenère cipher of [Chapter 2](02-Classical-Ciphers.md) with an
alphabet of two letters.

<figure class="mars-fig">
<svg viewBox="0 0 560 230" width="560" role="img" aria-label="The byte for A, 01000001, XORed with key byte 01011100 gives 00011101; XORing again with the key gives back 01000001" xmlns="http://www.w3.org/2000/svg">
<text x="148" y="30" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">message  'A'  41</text>
<rect x="160" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="175" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="190" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="205" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="220" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="235" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="250" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="265" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="280" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="295" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="310" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="325" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="340" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="355" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="370" y="10" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="385" y="30" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<text x="148" y="72" font-size="13" text-anchor="end" fill="currentColor">⊕ key byte  5c</text>
<rect x="160" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="175" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="190" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="205" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="220" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="235" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="250" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="265" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="280" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="295" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="310" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="325" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="340" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="355" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="370" y="52" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="385" y="72" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="148" y="114" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">= ciphertext  1d</text>
<rect x="160" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="175" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="190" y="94" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="190" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="205" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="220" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="235" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="250" y="94" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="250" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="265" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="280" y="94" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="280" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="295" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="310" y="94" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="310" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="325" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="340" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="355" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="370" y="94" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="385" y="114" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<line x1="160" y1="90" x2="400" y2="90" stroke="currentColor" stroke-width="1.5"/>
<text x="148" y="156" font-size="13" text-anchor="end" fill="currentColor">⊕ key byte  5c</text>
<rect x="160" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="175" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="190" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="205" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="220" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="235" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="250" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="265" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="280" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="295" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="310" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="325" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="340" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="355" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="370" y="136" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="385" y="156" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<text x="148" y="198" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">= message  41</text>
<rect x="160" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="175" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="190" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="205" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<rect x="220" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="235" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="250" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="265" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="280" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="295" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="310" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="325" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="340" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="355" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0</text>
<rect x="370" y="178" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="385" y="198" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">1</text>
<line x1="160" y1="174" x2="400" y2="174" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="70" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">a key bit 1 flips</text>
<text x="490" y="88" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">the message bit</text>
<text x="490" y="170" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">XOR with the same key</text>
<text x="490" y="188" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">flips them back</text>
</svg>
<figcaption>Figure 4.6. XOR bit by bit. Wherever the key has a 1, the message bit flips (highlighted); doing it again flips the same bits back. Encryption and decryption are the same operation.</figcaption>
</figure>

**The one-time pad.** Take the Vigenère cipher and remove its weakness, the
repeating key. The key is a string of truly random bits, as long as the
message, used only once. Encrypt with $c = m \oplus k$; decrypt with
$m = c \oplus k$.

```python
import secrets

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

m = b"ATTACK AT DAWN"
k = secrets.token_bytes(len(m))          # truly random, as long as the message, used once
c = xor(m, k)
print(c.hex(), xor(c, k))                # random-looking hex, then b'ATTACK AT DAWN'
```

**The story.** A Sacramento banker, Frank Miller, described a pad of random
numbers for telegraph codes in 1882; his booklet was forgotten until Steven
Bellovin found it in 2011. In 1917 Gilbert Vernam at AT&T built the electrical
version, XORing teleprinter tape with a key tape (US patent 1,310,719, 1919).
Joseph Mauborgne of the US Army saw that the key tape must be random and never
reused. In the 1920s the German Foreign Office used pads of random digits, and
in the Second World War and after, Soviet agents carried pads printed on tiny
sheets. In 1963 the new Moscow-Washington hotline ran on one-time tape.

Vernam was a 26-year-old engineer at AT&T when he built his machine, and his
problem was a practical one: the US government wanted teleprinter messages
that a wiretapper couldn't read. His first design looped a short key tape,
which made it a Vigenère cipher in electrical form and just as breakable;
Mauborgne's insistence on a random, never-repeated tape is what turned it into
the one-time pad. The price showed at once: the key tape had to be as long as
all the traffic, made in advance and carried to every station.

!!! note "Life story: the one-time pad"
    **Born:** 1882 (Frank Miller, on paper), 1917 to 1919 (Gilbert Vernam and Joseph Mauborgne, on teleprinter
    tape) · **Purpose:** unbreakable encryption for telegraph and teleprinter traffic · **Helped:** diplomats,
    spies and the Moscow-Washington hotline; Shannon proved it perfect in 1949 · **Broken:** never in itself, only
    when pads were reused (Venona) or keys weren't random · **Status:** current in tiny niches; for everything
    else **replaced by** stream ciphers, which stretch a short key ([Chapter 5](05-Stream-Ciphers.md))

## 4.7 Perfect secrecy

*Level: intermediate.* Shannon wrote a classified report in 1945, published in
1949 as "Communication Theory of Secrecy Systems", that turned "unbreakable"
into a theorem.

**The definition.** A cipher has **perfect secrecy** if the ciphertext tells
the attacker nothing about the message: for every message $m$ and every
ciphertext $c$,

$$
\Pr[M = m \mid C = c] = \Pr[M = m] .
$$

Whatever the attacker believed about the message before seeing $c$ (say, 70%
"attack", 30% "retreat"), they believe exactly the same after. An equivalent
form, easier to check: the distribution of the ciphertext is the same whatever
the message,

$$
\Pr[C = c \mid M = m] = \Pr[C = c \mid M = m'] \quad \text{for all } m, m', c .
$$

**The one-time pad has it.** Fix an $n$-bit ciphertext $c$. For **every**
$n$-bit message $m$ there is exactly one key that turns $m$ into $c$, namely
$k = m \oplus c$. Keys are uniform, so

$$
\Pr[C = c \mid M = m] = \Pr[K = m \oplus c] = 2^{-n} \quad \text{for every } m .
$$

The ciphertext is equally likely whatever the message was. Intercept 14 bytes
and they could be ATTACK AT DAWN, RETREAT AT TEN or any other 14 characters, each
under exactly one key. This holds against unlimited computing power, quantum
computers included; there is nothing to search, because every answer is
equally consistent with what you see.

<figure class="mars-fig">
<svg viewBox="0 0 460 430" width="460" role="img" aria-label="An 8 by 8 table of 3-bit messages against ciphertexts; each cell holds the key m XOR c, and every key appears once in each row and column" xmlns="http://www.w3.org/2000/svg">
<text x="250" y="22" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">ciphertext c</text>
<text x="26" y="230" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" transform="rotate(-90 26 230)">message m</text>
<text x="110" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">000</text>
<text x="150" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">001</text>
<text x="190" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">010</text>
<text x="230" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">011</text>
<text x="270" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">100</text>
<text x="310" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">101</text>
<text x="350" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">110</text>
<text x="390" y="60" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">111</text>
<text x="82" y="94" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">000</text>
<rect x="90" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="95" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<rect x="130" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="95" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="170" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="95" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="210" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="95" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<rect x="250" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="95" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<rect x="290" y="70" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="95" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="330" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="95" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<rect x="370" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="95" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<text x="82" y="134" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">001</text>
<rect x="90" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="135" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="130" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="135" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<rect x="170" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="135" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<rect x="210" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="135" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="250" y="110" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="135" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="290" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="135" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<rect x="330" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="135" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="370" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="135" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<text x="82" y="174" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">010</text>
<rect x="90" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="175" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="130" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="175" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<rect x="170" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="175" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<rect x="210" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="175" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="250" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="175" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<rect x="290" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="175" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="330" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="175" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<rect x="370" y="150" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="175" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<text x="82" y="214" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">011</text>
<rect x="90" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="215" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<rect x="130" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="215" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="170" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="215" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="210" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="215" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<rect x="250" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="215" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="290" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="215" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<rect x="330" y="190" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="215" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="370" y="190" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="215" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<text x="82" y="254" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">100</text>
<rect x="90" y="230" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="255" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<rect x="130" y="230" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="255" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="170" y="230" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="255" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<rect x="210" y="230" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="255" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="250" y="230" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="255" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<rect x="290" y="230" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="255" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="330" y="230" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="255" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="370" y="230" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="255" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<text x="82" y="294" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">101</text>
<rect x="90" y="270" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="295" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="130" y="270" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="295" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<rect x="170" y="270" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="295" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="210" y="270" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="295" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<rect x="250" y="270" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="295" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="290" y="270" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="295" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<rect x="330" y="270" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="295" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<rect x="370" y="270" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="295" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<text x="82" y="334" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">110</text>
<rect x="90" y="310" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="335" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<rect x="130" y="310" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="335" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="170" y="310" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="335" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<rect x="210" y="310" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="335" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="250" y="310" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="335" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="290" y="310" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="335" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<rect x="330" y="310" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="335" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<rect x="370" y="310" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="335" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<text x="82" y="374" font-size="12" text-anchor="end" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">111</text>
<rect x="90" y="350" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="110" y="375" font-size="14" text-anchor="middle" fill="currentColor">7</text>
<rect x="130" y="350" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="150" y="375" font-size="14" text-anchor="middle" fill="currentColor">6</text>
<rect x="170" y="350" width="40" height="40" rx="0" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="375" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="210" y="350" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="230" y="375" font-size="14" text-anchor="middle" fill="currentColor">4</text>
<rect x="250" y="350" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270" y="375" font-size="14" text-anchor="middle" fill="currentColor">3</text>
<rect x="290" y="350" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="310" y="375" font-size="14" text-anchor="middle" fill="currentColor">2</text>
<rect x="330" y="350" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="350" y="375" font-size="14" text-anchor="middle" fill="currentColor">1</text>
<rect x="370" y="350" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="390" y="375" font-size="14" text-anchor="middle" fill="currentColor">0</text>
<text x="230" y="418" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">entry = the one key that turns m into c (k = m ⊕ c); key 5 highlighted</text>
</svg>
<figcaption>Figure 4.7. Perfect secrecy for 3-bit messages. Pick any column (a ciphertext you intercepted): every message appears in it, each under exactly one key. With all keys equally likely, the ciphertext favors no message.</figcaption>
</figure>

**By hand, and by computer.** Take 3-bit messages. With a uniform 3-bit key,
XOR sends any message to each of the 8 ciphertexts with probability $1/8$:
the same table for every message. Now weaken the cipher: add the key mod 8, but
choose the key from only 4 values. Message 0 can then only become 0, 1, 2 or 3,
and message 5 only 5, 6, 7 or 0. Seeing ciphertext 2 rules out message 5
entirely: information has leaked.

```python
from collections import Counter
from fractions import Fraction

def dist(enc, keys, m):              # Pr[C = c | M = m] for every c, keys uniform
    cnt = Counter(enc(m, k) for k in keys)
    return {c: Fraction(n, len(keys)) for c, n in sorted(cnt.items())}

otp = lambda m, k: m ^ k             # 3-bit messages, 3-bit keys
short = lambda m, k: (m + k) % 8     # 3-bit messages, but only 4 keys
print(dist(otp, range(8), 0) == dist(otp, range(8), 5))   # True: the same for every message
print(dist(short, range(4), 0))      # ciphertexts 0, 1, 2, 3, each with probability 1/4
print(dist(short, range(4), 5))      # ciphertexts 5, 6, 7, 0: a different set
```

<figure class="mars-fig">
<svg viewBox="0 0 600 262" width="600" role="img" aria-label="With only four keys, message 0 can reach ciphertexts 0 to 3 and message 5 only 5, 6, 7 and 0" xmlns="http://www.w3.org/2000/svg">
<text x="150" y="20" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">message 0</text>
<text x="450" y="20" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">message 5</text>
<circle cx="150" cy="60" r="20" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="150" y="66" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<line x1="150" y1="80" x2="30" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<line x1="150" y1="80" x2="64.3" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<line x1="150" y1="80" x2="98.6" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<line x1="150" y1="80" x2="132.9" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<circle cx="30" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="30" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<circle cx="64.3" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="64.3" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">1</text>
<circle cx="98.6" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="98.6" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">2</text>
<circle cx="132.9" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="132.9" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">3</text>
<circle cx="167.2" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="167.2" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">4</text>
<circle cx="201.5" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="201.5" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">5</text>
<circle cx="235.8" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="235.8" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">6</text>
<circle cx="270.1" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="270.1" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">7</text>
<circle cx="450" cy="60" r="20" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="66" font-size="16" text-anchor="middle" fill="currentColor" font-weight="bold">5</text>
<line x1="450" y1="80" x2="501.5" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<line x1="450" y1="80" x2="535.8" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<line x1="450" y1="80" x2="570.1" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<line x1="450" y1="80" x2="330" y2="175" stroke="currentColor" stroke-width="1.3" class="acc"/>
<circle cx="330" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="330" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">0</text>
<circle cx="364.3" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="364.3" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">1</text>
<circle cx="398.6" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="398.6" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">2</text>
<circle cx="432.9" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="432.9" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">3</text>
<circle cx="467.2" cy="190" r="13" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="467.2" y="195" font-size="13" text-anchor="middle" fill="currentColor" fill-opacity="0.4">4</text>
<circle cx="501.5" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="501.5" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">5</text>
<circle cx="535.8" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="535.8" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">6</text>
<circle cx="570.1" cy="190" r="13" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="570.1" y="195" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">7</text>
<text x="300" y="228" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">each message: 4 keys, so only 4 of the 8 ciphertexts</text>
<text x="300" y="250" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">seeing ciphertext 2 rules out message 5 entirely</text>
</svg>
<figcaption>Figure 4.8. A cipher with fewer keys than messages. Each message reaches only half the ciphertexts, so the ciphertext tells the attacker which messages are possible. Shannon's theorem says this always happens when keys run short.</figcaption>
</figure>

Notice that a one-letter Caesar cipher with a uniformly random shift is also
perfectly secret: 26 keys for 26 messages. What broke Caesar in
[Chapter 2](02-Classical-Ciphers.md) was reusing the key for every letter.

**Shannon's theorem: the price.** Any cipher with perfect secrecy needs at
least as many keys as messages: $\lvert \mathcal{K} \rvert \ge \lvert \mathcal{M} \rvert$.

*Proof.* Fix a ciphertext $c$ that can occur. If there were fewer keys than
messages, then decrypting $c$ under every key would give fewer than
$\lvert \mathcal{M} \rvert$ messages, so some message $m'$ could never produce
$c$: $\Pr[C = c \mid M = m'] = 0$. But some other message does produce $c$ with
positive probability, so the two conditional distributions differ, and the
cipher is not perfectly secret. $\square$

In bits: to send $n$ bits with perfect secrecy you need $n$ bits of key, used
once. You can't do better than the pad, and every perfectly secret cipher is,
in effect, a one-time pad.

Shannon worked on cryptography at Bell Labs during the war, and in 1943 he met
Alan Turing, who was visiting to study the American speech-scrambling system;
the two talked over lunch about machines that might think, though neither could
discuss his secret work. Shannon's 1945 report was classified; the published
version of 1949 is the paper that made cryptography a branch of mathematics.

!!! note "Life story: perfect secrecy"
    **Born:** 1945 (classified report) and 1949 ("Communication Theory of Secrecy Systems"), Claude Shannon ·
    **Purpose:** say exactly what "unbreakable" means and what it costs · **Helped:** proved the one-time pad
    perfect and showed that nothing cheaper can be; introduced unicity distance, confusion and diffusion ·
    **Status:** current as the gold standard; practice uses its relaxed form, computational security
    ([§4.12](#412-going-deeper))

## 4.8 Break it: the two-time pad and malleability

*Level: intermediate.* The pad's proof says nothing about using the key
**twice**. Do that and the key cancels out:

$$
c_1 \oplus c_2 = (m_1 \oplus k) \oplus (m_2 \oplus k) = m_1 \oplus m_2 .
$$

The attacker now holds the XOR of two messages with no key in it. Guess a word
that might be in one message ("ATTACK", "THE ", "Dear") at some position, XOR it
in, and if the guess is right, readable text from the other message appears at
the same spot. This is called **crib dragging**, and every right guess reveals
more of both.

```python
m1, m2 = b"ATTACK AT DAWN", b"RETREAT AT TEN"
c1, c2 = xor(m1, k), xor(m2, k)
print(xor(c1, c2) == xor(m1, m2))            # True: the key cancels out
print(xor(xor(c1, c2), b"ATTACK"))           # b'RETREA': guess six letters of one, read six of the other
```

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The XOR of two ciphertexts under the same pad equals the XOR of the messages; XORing in the guess ATTACK reveals RETREA" xmlns="http://www.w3.org/2000/svg">
<text x="158" y="51" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c₁ ⊕ c₂ = m₁ ⊕ m₂</text>
<rect x="170" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="185" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">13</text>
<rect x="200" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="215" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">11</text>
<rect x="230" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="245" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">00</text>
<rect x="260" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="275" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">13</text>
<rect x="290" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="305" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">06</text>
<rect x="320" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="335" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">0a</text>
<rect x="350" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="365" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">74</text>
<rect x="380" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="395" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">61</text>
<rect x="410" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="425" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">15</text>
<rect x="440" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="455" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">74</text>
<rect x="470" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="485" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">64</text>
<rect x="500" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="515" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">15</text>
<rect x="530" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="545" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">12</text>
<rect x="560" y="30" width="30" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<text x="575" y="50" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">00</text>
<text x="158" y="103" font-size="13" text-anchor="end" fill="currentColor">guess: ATTACK</text>
<rect x="170" y="82" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="185" y="102" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="200" y="82" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="215" y="102" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="230" y="82" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="245" y="102" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="260" y="82" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="275" y="102" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="290" y="82" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="305" y="102" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="320" y="82" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="335" y="102" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<text x="158" y="155" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">result</text>
<rect x="170" y="134" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="170" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="0.8"/>
<text x="185" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="200" y="134" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="200" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="0.8"/>
<text x="215" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="230" y="134" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="230" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="0.8"/>
<text x="245" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="260" y="134" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="260" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="0.8"/>
<text x="275" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="290" y="134" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="290" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="0.8"/>
<text x="305" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="320" y="134" width="30" height="30" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="320" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="0.8"/>
<text x="335" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="350" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="365" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<rect x="380" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="395" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<rect x="410" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="425" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<rect x="440" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="455" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<rect x="470" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="485" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<rect x="500" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="515" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<rect x="530" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="545" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<rect x="560" y="134" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="0.8"/>
<text x="575" y="154" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">?</text>
<text x="158" y="200" font-size="1" text-anchor="middle" fill="currentColor"></text>
<text x="320" y="200" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">the key has cancelled out: no key appears anywhere above</text>
<text x="320" y="222" font-size="13" text-anchor="middle" fill="currentColor" font-style="italic">a right guess in one message reveals the other at the same place</text>
<text x="320" y="250" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">slide the guess along, keep what reads as language: crib dragging</text>
</svg>
<figcaption>Figure 4.9. The two-time pad, with the bytes from the code above. Guessing six letters of one message reads six letters of the other, without ever touching the key.</figcaption>
</figure>

**Tunny, 1941.** On 30 August 1941 a German operator sent a message of about
4,000 characters on the Lorenz teleprinter cipher, a machine that XORed each
character with a machine-made key stream. The receiver asked for it again, and
the operator re-sent it with the same key setting, with small changes in the
text. At Bletchley Park John Tiltman recovered both messages and the key
stream. From that key stream alone, Bill Tutte worked out the structure of the
whole machine, which nobody at Bletchley had seen.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Sequence chart: a German Lorenz operator sends a long message, is asked to repeat it, resends with the same key; Bletchley hears both and recovers the key stream" xmlns="http://www.w3.org/2000/svg">
<rect x="25" y="10" width="150" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="25" y="10" width="150" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="100" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">German sender</text>
<line x1="100" y1="40" x2="100" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="245" y="10" width="150" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="245" y="10" width="150" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">German receiver</text>
<line x1="320" y1="40" x2="320" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<rect x="465" y="10" width="150" height="30" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="465" y="10" width="150" height="30" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="29.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Bletchley Park</text>
<line x1="540" y1="40" x2="540" y2="250" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4"/>
<line x1="100" y1="80" x2="313" y2="80" stroke="currentColor" stroke-width="1.5"/>
<polygon points="320,80 312,83.6 312,76.4" fill="currentColor"/>
<rect x="134.4" y="58.6" width="151.2" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="210" y="70" font-size="12" text-anchor="middle" fill="currentColor">about 4,000 characters</text>
<line x1="320" y1="120" x2="107" y2="120" stroke="currentColor" stroke-width="1.5"/>
<polygon points="100,120 108,116.4 108,123.6" fill="currentColor"/>
<rect x="117.9" y="98.6" width="184.2" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="210" y="110" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">“didn't get it, send again”</text>
<line x1="100" y1="160" x2="313" y2="160" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="320,160 312,163.6 312,156.4" fill="currentColor" class="acc-fill"/>
<rect x="104.7" y="138.6" width="210.6" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="210" y="150" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">same key setting, small changes</text>
<line x1="100" y1="80" x2="540" y2="80" stroke="currentColor" stroke-width="1" stroke-dasharray="1 4"/>
<line x1="100" y1="160" x2="540" y2="160" stroke="currentColor" stroke-width="1" stroke-dasharray="1 4"/>
<circle cx="540" cy="80" r="4" fill="currentColor"/>
<circle cx="540" cy="160" r="4" fill="currentColor" class="acc-fill"/>
<rect x="470.7" y="177.7" width="138.6" height="16.9" style="fill: var(--md-default-bg-color)"/>
<text x="540" y="190" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">c₁ ⊕ c₂ = m₁ ⊕ m₂</text>
<rect x="450" y="210" width="180" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="450" y="210" width="180" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="450" y="210" width="180" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="540" y="234.2" font-size="12" text-anchor="middle" fill="currentColor">Tiltman: both texts</text>
<rect x="450" y="262" width="180" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="450" y="262" width="180" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="450" y="262" width="180" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="540" y="286.2" font-size="12" text-anchor="middle" fill="currentColor">and the key stream</text>
<line x1="450" y1="282" x2="267" y2="282" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="260,282 268,278.4 268,285.6" fill="currentColor" class="acc-fill"/>
<rect x="25" y="258" width="235" height="48" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="25" y="258" width="235" height="48" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="142.5" y="279" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">Tutte: the machine's design</text>
<text x="142.5" y="293" font-size="10" text-anchor="middle" fill="currentColor" font-style="italic">from the key stream alone</text>
</svg>
<figcaption>Figure 4.10. Tunny, 30 August 1941. One repeated key setting gave Bletchley Park two messages under the same key stream, and from that, the design of a machine no one there had ever seen.</figcaption>
</figure>

**Venona, 1943 to 1980.** Under wartime pressure in 1942, the Soviet office
that printed one-time pads printed some pages twice. In February 1943 Gene
Grabeel began studying Soviet diplomatic traffic for the US Army at Arlington
Hall; she and her colleagues found the reused pages, and Meredith Gardner and
others went on to read parts of about 3,000 messages. They exposed Soviet
agents including Klaus Fuchs, Julius Rosenberg and Donald Maclean. The pad was
mathematically perfect; the pad factory was not.

!!! note "Life story: the two-time pad attack"
    **Born:** as soon as pads were reused; its great successes were Tunny (August 1941, Tiltman and Tutte) and
    Venona (1943 onward, Grabeel, Gardner and colleagues) · **Purpose:** cancel the key by combining two
    ciphertexts made with the same pad · **Helped (codebreakers):** opened the Lorenz machine and exposed
    Soviet spies; the same algebra broke WEP Wi-Fi and an early Microsoft VPN (PPTP) ·
    **Status:** current: every reuse of a key and nonce in a stream cipher or GCM invites it

**Malleability.** The pad hides; it doesn't protect. Flip a bit of $c$ and the
same bit of $m$ flips, and nobody can tell. If Mallory knows (or guesses) that
the message starts with ATTACK, she can XOR the ciphertext with
ATTACK $\oplus$ RETIRE without knowing the key, and Bob reads RETIRE:

```python
c = xor(b"ATTACK AT DAWN", k)
forged = xor(c, xor(b"ATTACK", b"RETIRE") + bytes(8))   # Mallory never sees k
print(xor(forged, k))                                   # b'RETIRE AT DAWN'
```

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Mallory XORs the ciphertext with the difference between ATTACK and RETIRE, and Bob decrypts RETIRE AT DAWN" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="30" width="170" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="30" width="170" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="95" y="54.5" font-size="13" text-anchor="middle" fill="currentColor">ATTACK AT DAWN</text>
<text x="95" y="20" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">Alice's message</text>
<line x1="180" y1="50" x2="223" y2="50" stroke="currentColor" stroke-width="1.5"/>
<polygon points="230,50 222,53.6 222,46.4" fill="currentColor"/>
<text x="205" y="40" font-size="12" text-anchor="middle" fill="currentColor">⊕ k</text>
<rect x="230" y="30" width="140" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="230" y="30" width="140" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="54.5" font-size="13" text-anchor="middle" fill="currentColor">ciphertext c</text>
<line x1="370" y1="50" x2="423" y2="50" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="430,50 422,53.6 422,46.4" fill="currentColor" class="acc-fill"/>
<text x="400" y="40" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">⊕ Δ</text>
<rect x="430" y="30" width="200" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="430" y="30" width="200" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="430" y="30" width="200" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="530" y="54.5" font-size="13" text-anchor="middle" fill="currentColor">forged c ⊕ Δ</text>
<line x1="530" y1="70" x2="530" y2="113" stroke="currentColor" stroke-width="1.5"/>
<polygon points="530,120 526.4,112 533.6,112" fill="currentColor"/>
<text x="546" y="100" font-size="12" text-anchor="start" fill="currentColor">Bob: ⊕ k</text>
<rect x="430" y="120" width="200" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="430" y="120" width="200" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="430" y="120" width="200" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="530" y="144.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">RETIRE AT DAWN</text>
<text x="300" y="105" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">Δ = ATTACK ⊕ RETIRE</text>
<text x="300" y="125" font-size="12" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">= 13 11 00 08 11 0e, then zeros</text>
<text x="300" y="190" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">Mallory never sees k, and Bob can't tell anything happened</text>
</svg>
<figcaption>Figure 4.11. Malleability. Flipping ciphertext bits flips the same plaintext bits, so anyone who can guess part of the message can rewrite it. Perfect secrecy says nothing about integrity.</figcaption>
</figure>

Perfect secrecy and integrity are different jobs ([§1.2](01-What-Cryptography-Is-For.md#12-four-jobs)). This is why every
modern cipher in this book is paired with a MAC
([Chapter 10](10-Message-Authentication.md)).

**Why almost nobody uses the pad.** The key is as long as everything you will
ever send, must be truly random, must reach the other side secretly in advance,
and must be destroyed after use. To encrypt a 4 GB film you need 4 GB of key
delivered by courier, and if you have a secure courier you could have sent the
film. The pad survives where volume is tiny and keys can be carried by hand:
spies' number stations, some diplomatic and military links, and in the late
1980s the ANC's Operation Vula, which carried long random keys into South
Africa on floppy disks.

**What replaced it.** A **stream cipher** keeps the XOR and replaces the giant
random key with a short key (say 256 bits) and a nonce, stretched into a long
keystream that only *looks* random:

$$
c = m \oplus \mathrm{Keystream}(k, \text{nonce}).
$$

It gives up perfect secrecy, since in principle someone could try all $2^{256}$
keys, in exchange for a key you can actually manage.
[Chapter 5](05-Stream-Ciphers.md) builds them. The two-time-pad rule lives on
as the **nonce rule**: never use the same key and nonce twice. Breaking it has
broken WEP Wi-Fi and WPA2 (the KRACK attack of 2017), among many others.

## 4.9 Where random numbers come from

*Level: intermediate.* There are two kinds of generator, and real systems use
both.

**True random generators** measure something physically unpredictable: thermal
noise in a resistor, jitter in the timing of a free-running oscillator, the
exact moments of disk and network interrupts, radioactive decay. They are slow,
and their output is biased and correlated, so it has fewer bits of min-entropy
than bits. They are used to make **seeds**.

**Pseudorandom generators** are deterministic algorithms that stretch a short
seed into a long output. A **cryptographically secure** one has two properties:
nobody who doesn't know the state can predict the next output better than by
guessing, and nobody who steals today's state can work out yesterday's output
(forward secrecy). Statistical randomness is not enough; Python's `random`
passes many statistical tests and is completely predictable ([§4.10](#410-famous-failures)).

**The operating system does both.** Every major OS collects entropy from
hardware events, hashes it into a seed, and runs a fast cipher-based generator:

| System | Ask for bytes with | Generator behind it |
|---|---|---|
| Linux | `getrandom()`, `/dev/urandom` | ChaCha20 since 4.8 (2016); the pool is hashed with BLAKE2s since 5.17 (2022) |
| OpenBSD, FreeBSD, macOS | `arc4random()`, `getentropy()` | ChaCha20 on the BSDs; AES on macOS |
| Windows | `BCryptGenRandom` | CTR_DRBG from NIST SP 800-90A |

Once such a generator holds 256 bits of secret seed, reading more output
doesn't "use up" its entropy, any more than encrypting more data with AES uses up
a key. The one dangerous moment is right after boot, before the seed has
collected enough entropy, and `getrandom()` waits through it.

<figure class="mars-fig">
<svg viewBox="0 0 680 270" width="680" role="img" aria-label="Entropy sources feed a hashed input pool that seeds a ChaCha20 generator, which serves getrandom and /dev/urandom to programs" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="14" width="150" height="38" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="14" width="150" height="38" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="37.2" font-size="12" text-anchor="middle" fill="currentColor">interrupt timing</text>
<line x1="160" y1="33" x2="196.7" y2="101.8" stroke="currentColor" stroke-width="1.5"/>
<polygon points="200,108 193.1,102.6 199.4,99.2" fill="currentColor"/>
<rect x="10" y="64" width="150" height="38" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="64" width="150" height="38" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="87.2" font-size="12" text-anchor="middle" fill="currentColor">CPU timing jitter</text>
<line x1="160" y1="83" x2="194.1" y2="104.3" stroke="currentColor" stroke-width="1.5"/>
<polygon points="200,108 191.3,106.8 195.1,100.7" fill="currentColor"/>
<rect x="10" y="114" width="150" height="38" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="114" width="150" height="38" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="137.2" font-size="12" text-anchor="middle" fill="currentColor">RDRAND / RDSEED</text>
<line x1="160" y1="133" x2="194.1" y2="111.7" stroke="currentColor" stroke-width="1.5"/>
<polygon points="200,108 195.1,115.3 191.3,109.2" fill="currentColor"/>
<rect x="10" y="164" width="150" height="38" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="164" width="150" height="38" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="85" y="187.2" font-size="12" text-anchor="middle" fill="currentColor">boot seed, VM ID</text>
<line x1="160" y1="183" x2="196.7" y2="114.2" stroke="currentColor" stroke-width="1.5"/>
<polygon points="200,108 199.4,116.8 193.1,113.4" fill="currentColor"/>
<rect x="200" y="80" width="110" height="56" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="200" y="80" width="110" height="56" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="105" font-size="13" text-anchor="middle" fill="currentColor">input pool</text>
<text x="255" y="120" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">hashed (BLAKE2s)</text>
<line x1="310" y1="108" x2="343" y2="108" stroke="currentColor" stroke-width="1.5"/>
<polygon points="350,108 342,111.6 342,104.4" fill="currentColor"/>
<text x="330" y="98" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">seed</text>
<rect x="350" y="80" width="120" height="56" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="350" y="80" width="120" height="56" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="350" y="80" width="120" height="56" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="410" y="105" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">ChaCha20</text>
<text x="410" y="120" font-size="11" text-anchor="middle" fill="currentColor" font-style="italic">generator</text>
<line x1="470" y1="108" x2="503" y2="108" stroke="currentColor" stroke-width="1.5"/>
<polygon points="510,108 502,111.6 502,104.4" fill="currentColor"/>
<rect x="510" y="60" width="160" height="44" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="510" y="60" width="160" height="44" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="590" y="86.2" font-size="12" text-anchor="middle" fill="currentColor">getrandom()</text>
<rect x="510" y="112" width="160" height="44" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="510" y="112" width="160" height="44" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="590" y="138.2" font-size="12" text-anchor="middle" fill="currentColor">/dev/urandom</text>
<line x1="590" y1="156" x2="590" y2="189" stroke="currentColor" stroke-width="1.5"/>
<polygon points="590,196 586.4,188 593.6,188" fill="currentColor"/>
<rect x="500" y="196" width="180" height="44" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="500" y="196" width="180" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="590" y="222.2" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">secrets, os.urandom</text>
<path d="M255 136 Q250 180 300 180 Q410 180 410 144" stroke="currentColor" stroke-width="1.5" fill="none" class="acc" stroke-dasharray="5 4"/>
<polygon points="410,137 413.6,145 406.4,145" fill="currentColor" class="acc-fill"/>
<text x="330" y="200" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">reseeded from the pool</text>
<text x="330" y="216" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">regularly, and the old state erased</text>
</svg>
<figcaption>Figure 4.12. How Linux makes random bytes, simplified. Many noisy sources are mixed into a pool; a hash of the pool seeds a fast stream-cipher generator; programs read from it through one interface.</figcaption>
</figure>

**The story.** Theodore Ts'o wrote Linux's `/dev/random` in 1994, so that
programs no longer had to gather randomness themselves, as PGP did by timing
the user's keystrokes. Its design followed the ideas the BSDs and later Windows also
adopted: gather noise from the hardware, estimate how much is real, hash it,
and run a generator from the result. Over the years it changed from
SHA-1 to ChaCha20 and BLAKE2s. In 2020 `/dev/random` stopped blocking once the
generator had been seeded, ending an old quarrel about which device to use,
and in 2022 Jason Donenfeld rewrote much of the code.

!!! note "Life story: operating-system random generators"
    **Born:** 1994, Theodore Ts'o's `/dev/random` for Linux; similar designs in the BSDs, macOS and Windows ·
    **Purpose:** give every program good random numbers without each one gathering its own entropy ·
    **Helped:** ended the era of guessable seeds like Netscape's; `getrandom()` (2014) fixed the early-boot gap ·
    **Status:** current, and the right source for every key, nonce and token

Details: [OS random number generators](../09-random/OS-RNG.md).

**In Python, use `secrets`** (3.6 and later), which reads the OS generator:

```python
import secrets, string

key = secrets.token_bytes(32)             # 256-bit key
token = secrets.token_urlsafe(32)         # password-reset link token, 32 random bytes
pin = f"{secrets.randbelow(10**6):06d}"   # 6-digit code, with no bias
abc = string.ascii_letters + string.digits
pw = "".join(secrets.choice(abc) for _ in range(16))
print(len(key), len(token), len(pin), len(pw))   # 32 43 6 16
```

**Modulo bias.** Why `randbelow(10**6)` and not `random_number % 10**6`? Take a
random byte (0 to 255) mod 10. The 256 values don't split evenly into 10 groups:

```python
from collections import Counter
print(sorted(Counter(b % 10 for b in range(256)).items()))
# [(0, 26), (1, 26), (2, 26), (3, 26), (4, 26), (5, 26), (6, 25), (7, 25), (8, 25), (9, 25)]
```

Digits 0 to 5 come up 26 times in 256, the others 25. Small biases like this
have broken real systems: ECDSA signatures with nonces biased by a fraction of a
bit leak the private key through lattice attacks
([Chapter 14](14-Discrete-Log-Systems.md)). `randbelow` throws away values
beyond the last full group and tries again.

<figure class="mars-fig">
<svg viewBox="0 0 520 260" width="520" role="img" aria-label="Bar chart of how many of the 256 byte values give each digit mod 10: 26 for digits 0 to 5, 25 for 6 to 9" xmlns="http://www.w3.org/2000/svg">
<line x1="60" y1="210" x2="500" y2="210" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="214" font-size="12" text-anchor="end" fill="currentColor">0</text>
<line x1="60" y1="176.8" x2="500" y2="176.8" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="180.8" font-size="12" text-anchor="end" fill="currentColor">5</text>
<line x1="60" y1="143.6" x2="500" y2="143.6" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="147.6" font-size="12" text-anchor="end" fill="currentColor">10</text>
<line x1="60" y1="110.4" x2="500" y2="110.4" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="114.4" font-size="12" text-anchor="end" fill="currentColor">15</text>
<line x1="60" y1="77.1" x2="500" y2="77.1" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="81.1" font-size="12" text-anchor="end" fill="currentColor">20</text>
<line x1="60" y1="43.9" x2="500" y2="43.9" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="47.9" font-size="12" text-anchor="end" fill="currentColor">25</text>
<rect x="66.6" y="37.3" width="30.8" height="172.7" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="82" y="226" font-size="12" text-anchor="middle" fill="currentColor">0</text>
<rect x="110.6" y="37.3" width="30.8" height="172.7" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="126" y="226" font-size="12" text-anchor="middle" fill="currentColor">1</text>
<rect x="154.6" y="37.3" width="30.8" height="172.7" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="170" y="226" font-size="12" text-anchor="middle" fill="currentColor">2</text>
<rect x="198.6" y="37.3" width="30.8" height="172.7" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="214" y="226" font-size="12" text-anchor="middle" fill="currentColor">3</text>
<rect x="242.6" y="37.3" width="30.8" height="172.7" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="258" y="226" font-size="12" text-anchor="middle" fill="currentColor">4</text>
<rect x="286.6" y="37.3" width="30.8" height="172.7" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="302" y="226" font-size="12" text-anchor="middle" fill="currentColor">5</text>
<rect x="330.6" y="43.9" width="30.8" height="166.1" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="346" y="226" font-size="12" text-anchor="middle" fill="currentColor">6</text>
<rect x="374.6" y="43.9" width="30.8" height="166.1" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="390" y="226" font-size="12" text-anchor="middle" fill="currentColor">7</text>
<rect x="418.6" y="43.9" width="30.8" height="166.1" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="434" y="226" font-size="12" text-anchor="middle" fill="currentColor">8</text>
<rect x="462.6" y="43.9" width="30.8" height="166.1" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="478" y="226" font-size="12" text-anchor="middle" fill="currentColor">9</text>
<line x1="60" y1="210" x2="500" y2="210" stroke="currentColor" stroke-width="1.5"/>
<text x="16" y="117" font-size="12" text-anchor="middle" fill="currentColor" transform="rotate(-90 16 117)">how many bytes give it</text>
<text x="280" y="250" font-size="12" text-anchor="middle" fill="currentColor">digit = byte mod 10</text>
<text x="260" y="18" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">0–5: 26 bytes each · 6–9: 25 bytes each</text>
</svg>
<figcaption>Figure 4.13. Modulo bias. 256 = 25 × 10 + 6, so the six leftover values 250 to 255 fall on digits 0 to 5 and make them a little more likely. The bars barely differ, which is exactly why the bias goes unnoticed.</figcaption>
</figure>

**DRBGs.** NIST's SP 800-90A defines three **deterministic random bit
generators**: Hash_DRBG, HMAC_DRBG and CTR_DRBG, which certified products must
use, seeded from an entropy source tested under SP 800-90B. HMAC_DRBG is the
simplest. It keeps a key $K$ and a value $V$; output is $V$ HMACed again and
again under $K$; after every request both are replaced, so a stolen state can't
rebuild earlier output. Here it is, checked against the first SHA-256 test
vector from NIST's validation program:

```python
import hmac, hashlib

def H(K, data):
    return hmac.new(K, data, hashlib.sha256).digest()

def update(K, V, data=b""):
    K = H(K, V + b"\x00" + data)
    V = H(K, V)
    if data:
        K = H(K, V + b"\x01" + data)
        V = H(K, V)
    return K, V

def instantiate(entropy, nonce, pers=b""):
    return update(bytes(32), b"\x01" * 32, entropy + nonce + pers)

def generate(K, V, n):
    out = b""
    while len(out) < n:
        V = H(K, V)
        out += V
    K, V = update(K, V)                  # move on, so old output can't be rebuilt
    return out[:n], K, V

e = bytes.fromhex("ca851911349384bffe89de1cbdc46e6831e44d34a4fb935ee285dd14b71a7488")
nonce = bytes.fromhex("659ba96c601dc69fc902940805ec0ca8")
K, V = instantiate(e, nonce)
_, K, V = generate(K, V, 128)            # the test throws the first call away
out, K, V = generate(K, V, 128)
print(out[:16].hex())                    # e528e9abf2dece54d47c7e75e5fe3021
print(out[-16:].hex())                   # 1f50d476aa0458bdaba806f48be9dcb8
```

<figure class="mars-fig">
<svg viewBox="0 0 660 280" width="660" role="img" aria-label="HMAC_DRBG: repeated HMAC of V under K produces output blocks, then K and V are replaced by fresh HMAC values" xmlns="http://www.w3.org/2000/svg">
<text x="150" y="20" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">generate</text>
<rect x="20" y="40" width="80" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="20" y="40" width="80" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="60" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">K, V</text>
<rect x="140" y="40" width="140" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="140" y="40" width="140" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="210" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">V = HMAC(K, V)</text>
<line x1="280" y1="60" x2="313" y2="60" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="320,60 312,63.6 312,56.4" fill="currentColor" class="acc-fill"/>
<text x="330" y="65" font-size="12" text-anchor="start" fill="currentColor" class="acc-fill">output block 1</text>
<line x1="210" y1="80" x2="210" y2="89" stroke="currentColor" stroke-width="1.5"/>
<polygon points="210,96 206.4,88 213.6,88" fill="currentColor"/>
<rect x="140" y="96" width="140" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="140" y="96" width="140" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="210" y="120.2" font-size="12" text-anchor="middle" fill="currentColor">V = HMAC(K, V)</text>
<line x1="280" y1="116" x2="313" y2="116" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="320,116 312,119.6 312,112.4" fill="currentColor" class="acc-fill"/>
<text x="330" y="121" font-size="12" text-anchor="start" fill="currentColor" class="acc-fill">output block 2</text>
<line x1="210" y1="136" x2="210" y2="145" stroke="currentColor" stroke-width="1.5"/>
<polygon points="210,152 206.4,144 213.6,144" fill="currentColor"/>
<rect x="140" y="152" width="140" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="140" y="152" width="140" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="210" y="176.2" font-size="12" text-anchor="middle" fill="currentColor">V = HMAC(K, V)</text>
<line x1="280" y1="172" x2="313" y2="172" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="320,172 312,175.6 312,168.4" fill="currentColor" class="acc-fill"/>
<text x="330" y="177" font-size="12" text-anchor="start" fill="currentColor" class="acc-fill">output block 3</text>
<line x1="100" y1="60" x2="133" y2="60" stroke="currentColor" stroke-width="1.5"/>
<polygon points="140,60 132,63.6 132,56.4" fill="currentColor"/>
<text x="210" y="222" font-size="14" text-anchor="middle" fill="currentColor">⋮</text>
<line x1="470" y1="20" x2="470" y2="270" stroke="currentColor" stroke-width="0.6" stroke-dasharray="3 4"/>
<text x="570" y="20" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">then update</text>
<rect x="490" y="40" width="160" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="490" y="40" width="160" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="570" y="64.2" font-size="12" text-anchor="middle" fill="currentColor">K = HMAC(K, V‖00)</text>
<line x1="570" y1="80" x2="570" y2="97" stroke="currentColor" stroke-width="1.5"/>
<polygon points="570,104 566.4,96 573.6,96" fill="currentColor"/>
<rect x="490" y="104" width="160" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="490" y="104" width="160" height="40" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="570" y="128.2" font-size="12" text-anchor="middle" fill="currentColor">V = HMAC(K, V)</text>
<line x1="570" y1="144" x2="570" y2="161" stroke="currentColor" stroke-width="1.5"/>
<polygon points="570,168 566.4,160 573.6,160" fill="currentColor"/>
<rect x="490" y="168" width="160" height="40" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="490" y="168" width="160" height="40" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<rect x="490" y="168" width="160" height="40" rx="6" fill="none" stroke="currentColor" class="acc" stroke-width="2"/>
<text x="570" y="192.6" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">new K, V</text>
<text x="570" y="234" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">old K and V are gone, so</text>
<text x="570" y="250" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">a thief who steals the new state</text>
<text x="570" y="266" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">can't rebuild earlier output</text>
</svg>
<figcaption>Figure 4.14. HMAC_DRBG as in the code above (no extra input). Output comes from re-hashing V; afterwards both K and V are replaced, which gives forward secrecy.</figcaption>
</figure>

This is for learning how it works. In real code call the OS generator, which is
already a well-seeded generator of this kind. Full details:
[NIST DRBGs](../09-random/NIST-DRBG.md).

!!! note "Life story: HMAC_DRBG"
    **Born:** 2006, NIST SP 800-90 (Elaine Barker and John Kelsey), revised as SP 800-90A · **Purpose:** a
    certified generator built from a well-studied primitive (HMAC) · **Helped:** used in FIPS-validated
    libraries, and by RFC 6979 to make ECDSA nonces deterministic · **Status:** current, alongside Hash_DRBG and
    CTR_DRBG; its sibling Dual_EC_DRBG was withdrawn (§4.10)

## 4.10 Famous failures

*Level: intermediate.* More real systems have been broken through their random
numbers than through their ciphers. The pattern is always one of four: a
generator whose output reveals its state, a sound generator with a guessable
seed, a seed that never got any entropy, or a generator someone holds a key to.

**A generator that reveals its state: Mersenne Twister.** Python's `random`
uses MT19937 (Makoto Matsumoto and Takuji Nishimura, 1997), an excellent
generator for simulations. Its state is 624 words of 32 bits; each output is
one state word passed through a few shift-and-XOR steps that are easy to undo.
So 624 outputs give away the whole state, and from it every future output:

```python
import random

def unshift_right(y, s):
    x = y
    for _ in range(32 // s):
        x = y ^ (x >> s)
    return x

def unshift_left(y, s, mask):
    x = y
    for _ in range(32 // s):
        x = y ^ ((x << s) & mask)
    return x

def untemper(y):                     # MT19937's output step, backwards
    y = unshift_right(y, 18)
    y = unshift_left(y, 15, 0xefc60000)
    y = unshift_left(y, 7, 0x9d2c5680)
    return unshift_right(y, 11)

victim = random.Random()             # seeded from the OS; we never see the seed
seen = [victim.getrandbits(32) for _ in range(624)]
clone = random.Random()
clone.setstate((3, tuple(untemper(y) for y in seen) + (624,), None))
print(clone.getrandbits(32) == victim.getrandbits(32))     # True: the next output
print(clone.getrandbits(128) == victim.getrandbits(128))   # True: a 128-bit "token"
```

Web applications that made password-reset tokens this way (PHP's `mt_rand` was
a common culprit) let attackers predict them. Never use `random` for secrets.

!!! note "Life story: the Mersenne Twister"
    **Born:** 1997, Makoto Matsumoto and Takuji Nishimura (published 1998); named for its period, the Mersenne
    prime $2^{19937} - 1$ · **Purpose:** fast, high-quality random numbers for simulations · **Helped:** the
    default generator of Python, Ruby, R, MATLAB and PHP's `mt_rand` · **Status:** current for simulations;
    never for secrets, because 624 outputs reveal its state

**A guessable seed: Netscape (1995).** Section 4.1. Fixing it meant gathering
real entropy, which is what operating systems took over. Linux's `/dev/random`,
written by Theodore Ts'o, had appeared in 1994.

**A seed with no entropy: Debian (2006 to 2008).** In September 2006 a Debian
maintainer commented out two lines in OpenSSL to silence warnings from a
memory-checking tool. One of them mixed the seed into the generator. For the
next twenty months OpenSSL on Debian and Ubuntu was seeded by little more than
the process ID, at most 32,768 values, so every SSH, TLS and VPN key it made
came from a list small enough to precompute. Luciano Bello found it in May 2008.

**A seed that came too early: Mining your Ps and Qs (2012).** Routers and other
small devices generated their keys at first boot, before the kernel had
collected entropy; different devices sometimes chose the same prime, and one
gcd broke both keys ([Chapter 3](03-The-Arithmetic-of-Secrets.md)). The same
survey found DSA keys exposed by repeated signature nonces. `getrandom()`,
added to Linux in 2014, waits until the generator is seeded.

**A nonce that wasn't random: PlayStation 3 (2010) and Android (2013).** An ECDSA
signature needs a fresh random number for each signature; two signatures with
the same one reveal the private key by simple algebra
([Chapter 14](14-Discrete-Log-Systems.md)). Sony signed PlayStation 3 software
with the same number every time, and the fail0verflow group extracted the
signing key in December 2010. In August 2013 Android's Java `SecureRandom`
turned out to be badly seeded; Bitcoin wallets on Android repeated nonces and
coins were stolen.

**A generator with a back door: Dual_EC_DRBG (2006 to 2015).** One of the four
generators in NIST's 2006 standard was built on elliptic curves, with a fixed
point $Q$ given without explanation. In 2007 Dan Shumow and Niels Ferguson of
Microsoft showed that whoever knew a secret number linking $Q$ to the curve's
generator could predict all its output from about 32 bytes. The Snowden
documents of 2013 indicated that the NSA had promoted it; NIST withdrew it. In
2015 Juniper found that someone had replaced $Q$ in its firewalls, which let
them decrypt VPN traffic. A random generator is the most valuable place to hide
a back door, because its output looks random either way.

!!! note "Life story: Dual_EC_DRBG"
    **Born:** standardized 2006 in NIST SP 800-90 (and ANSI X9.82, ISO 18031) · **Purpose,** officially: a
    generator with security based on elliptic curves · **Helped:** almost no one: it was far slower than its
    siblings, yet RSA Security's BSAFE library made it the default · **Retired:** NIST
    told users to stop in 2013 and removed it from the standard in 2015, after Shumow and Ferguson's warning (2007) and the
    Snowden documents · **Replaced by:** the hash, HMAC and CTR generators

The fix in every case is the same: **ask the operating system, through your
language's secure API, for every secret value**, and never invent your own
generator. More cases are on [Retired generators](../09-random/Retired.md).

## 4.11 In the real world

- **Keys, nonces, IVs, salts, tokens:** from the OS generator (`secrets`,
  `os.urandom`, `getrandom()`, `crypto/rand` in Go, `randombytes_buf` in
  libsodium).
- **FIPS 140-3 products:** an SP 800-90A DRBG seeded from an SP 800-90B entropy
  source, often with a hardware source such as Intel's RDRAND/RDSEED mixed in.
  Operating systems mix hardware sources with others rather than trusting any
  one of them.
- **Virtual machines and containers:** a snapshot restored twice runs twice with
  the same generator state. Hypervisors expose a "VM generation ID", and Linux
  reseeds when it changes (since 5.18).
- **The one-time pad today:** diplomatic and military links with tiny volume and
  couriers, and quantum key distribution, which uses physics to deliver pad-like
  keys and is covered with the rest of the frontier in
  [Chapter 20](20-Quantum-Computers.md).
- **Everything else:** stream ciphers and block ciphers in Part II, which are the
  pad's practical descendants.

## 4.12 Going deeper

*Level: expert.* Four ideas that connect this chapter to the theory of Part IV.

**From perfect to computational secrecy.** Shannon's theorem says perfect
secrecy is impractical. Modern cryptography relaxes "the ciphertext tells you
nothing" to "no *efficient* attacker can tell the ciphertext from random". A
**pseudorandom generator** $G$ stretches an $s$-bit seed to $\ell > s$ bits such
that for every attacker $\mathcal{D}$ running in reasonable time,

$$
\left\lvert \Pr[\mathcal{D}(G(\text{seed})) = 1] - \Pr[\mathcal{D}(\text{uniform}) = 1] \right\rvert
$$

is negligible. Encrypting with $m \oplus G(k)$ is then secure in the
indistinguishability sense of [§1.11](01-What-Cryptography-Is-For.md#111-going-deeper): an attacker who could tell two
encryptions apart would be a distinguisher for $G$. This **reduction** is the
pattern of every security proof in [Chapter 17](17-Defining-Security.md). The
existence of PRGs can't be proved outright (it would imply P $\ne$ NP), so
practice relies on concrete designs like ChaCha20 that have survived years of
attack.

**Extracting randomness.** Physical sources are biased. John von Neumann gave
the simplest fix in 1951: read bits in pairs, output 0 for "01", 1 for "10", and
discard "00" and "11". If the bits are independent with any fixed bias $p$, the
two kept pairs each have probability $p(1-p)$, so the output is exactly
unbiased, at the cost of throwing most bits away.

```python
import random

def von_neumann(bits):
    return [a for a, b in zip(bits[0::2], bits[1::2]) if a != b]

rnd = random.Random(2026)                                # a simulated biased source, not for secrets
raw = [1 if rnd.random() < 0.7 else 0 for _ in range(100000)]
out = von_neumann(raw)
print(sum(raw) / len(raw), len(out), round(sum(out) / len(out), 3))   # 0.70082 21084 0.499
```

With $p = 0.7$ you keep $2 \cdot 0.7 \cdot 0.3 = 42\%$ of the pairs, 21% of the
bits. Von Neumann's trick fails if the bits are correlated. The general tool is a
**randomness extractor**: the **leftover hash lemma** (Impagliazzo, Levin and
Luby, 1989) shows that hashing a source with $k$ bits of min-entropy through a
randomly chosen universal hash gives nearly $k - 2\log_2(1/\varepsilon)$ bits
that are within $\varepsilon$ of uniform. In practice systems use a cryptographic
hash or HKDF as a "computational extractor": Linux hashes its input pool with
BLAKE2s ([Chapter 11](11-Passwords-and-Key-Derivation.md) covers HKDF).

!!! note "Life story: von Neumann's extractor"
    **Born:** 1951, John von Neumann, "Various techniques used in connection with random digits" ·
    **Purpose:** turn a biased coin into a fair one · **Helped:** a first step in hardware random generators; the
    model for the theory of extractors (leftover hash lemma, 1989) · **Status:** current as a teaching example
    and in simple hardware; real systems use hash-based extractors because physical bits are correlated

**Statistical tests don't prove randomness.** Test suites such as NIST SP 800-22
and TestU01 catch broken generators, but every deterministic generator,
including a back-doored one, can pass them. Dual_EC_DRBG's output passed. Only
an argument about the design, its seed and its source can show that output is
unpredictable to an attacker.

**How big is $2^{128}$, physically?** Landauer's principle says erasing one
bit of information costs at least $kT \ln 2$ of energy, where $k$ is
Boltzmann's constant and $T$ the temperature. At 3.2 kelvin, a little above the
background temperature of the universe, that is about $3.1 \times 10^{-23}$
joules. Merely stepping a counter through $2^{128}$ states, with one bit erased
per step, would need about $10^{16}$ joules: a lot, but not impossible. For
$2^{192}$ it is about $1.9 \times 10^{35}$ joules, sixteen years of the Sun's
entire output (about $1.2 \times 10^{34}$ joules a year). For $2^{256}$ it is
about $3.5 \times 10^{54}$ joules, far more than the Sun will emit in its whole
life. So 128-bit keys are safe because of time, cost and engineering; 256-bit
keys are safe against brute force by physics, at least for computers that
erase bits as they go. (Bruce Schneier made this argument in *Applied
Cryptography* in 1996. Reversible computing would escape Landauer's bound in
principle, and quantum search changes the count; see
[Chapter 20](20-Quantum-Computers.md).)

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Log-scale bars of energy: counting to 2^128 needs 10^16 joules, less than a year of world energy; 2^192 needs more than the Sun's yearly output; 2^256 vastly more" xmlns="http://www.w3.org/2000/svg">
<line x1="200" y1="14" x2="200" y2="196" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="200" y="214" font-size="12" text-anchor="middle" fill="currentColor">10¹⁰</text>
<line x1="289.1" y1="14" x2="289.1" y2="196" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="289.1" y="214" font-size="12" text-anchor="middle" fill="currentColor">10²⁰</text>
<line x1="378.3" y1="14" x2="378.3" y2="196" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="378.3" y="214" font-size="12" text-anchor="middle" fill="currentColor">10³⁰</text>
<line x1="467.4" y1="14" x2="467.4" y2="196" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="467.4" y="214" font-size="12" text-anchor="middle" fill="currentColor">10⁴⁰</text>
<line x1="556.5" y1="14" x2="556.5" y2="196" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="556.5" y="214" font-size="12" text-anchor="middle" fill="currentColor">10⁵⁰</text>
<text x="190" y="36" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">count to 2¹²⁸</text>
<rect x="200" y="22" width="53.6" height="22" rx="2" class="soft-acc" fill="currentColor"/>
<rect x="200" y="22" width="53.6" height="22" rx="2" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="256.6" y="26.6" width="78" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="259.6" y="38" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">1 × 10¹⁶ J</text>
<text x="190" y="72" font-size="13" text-anchor="end" fill="currentColor">world energy use, 1 year</text>
<rect x="200" y="58" width="96.1" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="299.1" y="62.6" width="78" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="302.1" y="74" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">6 × 10²⁰ J</text>
<text x="190" y="108" font-size="13" text-anchor="end" fill="currentColor">the Sun, 1 year</text>
<rect x="200" y="94" width="214.6" height="22" rx="2" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="417.6" y="98.6" width="92.4" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="420.6" y="110" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">1.2 × 10³⁴ J</text>
<text x="190" y="144" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">count to 2¹⁹²</text>
<rect x="200" y="130" width="225.4" height="22" rx="2" class="soft-acc" fill="currentColor"/>
<rect x="200" y="130" width="225.4" height="22" rx="2" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<rect x="428.4" y="134.6" width="92.4" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="431.4" y="146" font-size="12" text-anchor="start" fill="currentColor" font-weight="bold">1.9 × 10³⁵ J</text>
<text x="190" y="180" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">count to 2²⁵⁶</text>
<rect x="200" y="166" width="397" height="22" rx="2" class="soft-acc" fill="currentColor"/>
<rect x="200" y="166" width="397" height="22" rx="2" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="591" y="182" font-size="12" text-anchor="end" fill="currentColor" font-weight="bold">3.5 × 10⁵⁴ J</text>
<text x="405" y="246" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">joules, log scale; counting uses Landauer's limit at 3.2 K</text>
</svg>
<figcaption>Figure 4.15. The physics of brute force. Merely counting through 2¹²⁸ states costs less than humanity's yearly energy use; 2¹⁹² costs sixteen years of the Sun's output; 2²⁵⁶ is beyond any star.</figcaption>
</figure>

## Exercises

??? question "1. What is 11001010 XOR 10101010?"

    `01100000`. Write them one above the other; a 1 wherever the bits differ.

??? question "2. A 4-digit PIN is chosen uniformly at random. What is its entropy? An attacker gets 3 guesses: what is the chance of success?"

    $\log_2 10^4 \approx 13.3$ bits. Three guesses succeed with probability $3/10{,}000 = 0.03\%$.
    If people choose their own PINs the min-entropy is far lower: "1234" alone is
    chosen by a large share of people.

??? question "3. A website gives each session a random 40-bit ID. After how many sessions is a repeat likely?"

    About $1.25 \sqrt{2^{40}} = 1.25 \cdot 2^{20} \approx 1.3$ million sessions. Session IDs need
    at least 128 bits.

??? question "4. A hash has 384-bit output. What collision security does it give?"

    About 192 bits, half the output length. That is SHA-384's level.

??? question "5. Which is stronger: a random 10-character password from 62 letters and digits, or 5 random Diceware words?"

    $10 \log_2 62 \approx 59.5$ bits against $5 \log_2 7776 \approx 64.6$ bits. The five words, and
    they are easier to remember.

??? question "6. A spy uses dice to make a one-time pad of decimal digits, rolling one die for each key digit 0 to 9. Is it still perfectly secret?"

    No. A die gives only six values, so some key digits never appear and some
    plaintext digits become impossible for a given ciphertext digit. Perfect secrecy
    needs every key value to be equally likely.

??? question "7. Two messages were encrypted with the same one-time pad. You guess that one of them contains \" the \" somewhere. How do you use that?"

    XOR the two ciphertexts to get $m_1 \oplus m_2$. Slide `" the "` along it, XORing at each
    position. Where the guess is right, the result is five readable characters of the
    other message; elsewhere it is mostly gibberish. Extend from there by guessing
    the words around it (crib dragging).

??? question "8. Why doesn't the two-time pad attack work on two messages encrypted with ChaCha20 under the same key but different nonces?"

    The keystreams are different, so they don't cancel: $c_1 \oplus c_2 = m_1 \oplus m_2
    \oplus s_1 \oplus s_2$, and $s_1 \oplus s_2$ looks random to anyone without the key.

??? question "9. Prove that a cipher whose keys are 100 bits long can't have perfect secrecy for 101-bit messages."

    There are $2^{100}$ keys and $2^{101}$ messages. Fix a possible ciphertext $c$.
    Decrypting it under all keys gives at most $2^{100}$ messages, so at least half
    the messages can never produce $c$. For such an $m'$, $\Pr[C = c \mid M = m'] = 0$,
    while for the message that did produce it the probability is positive, so the
    ciphertext carries information about the message. This is Shannon's theorem.

??? question "10. A device makes its RSA key at first boot from a generator seeded with the time in seconds and a 16-bit counter. The attacker knows the boot happened within one day. How many keys must they try?"

    $86{,}400 \cdot 65{,}536 \approx 5.7 \times 10^{9}$, about $2^{32.4}$. That is a few hours on
    one computer, whatever the size of the RSA key. The seed's entropy, not the key's
    length, sets the security.

## What you learned

- Security levels assume uniformly random keys; $n$-bit keys take about $2^n$
  tries, and many targets lower the cost.
- Entropy measures uncertainty in bits; min-entropy, set by the most likely
  value, is what matters against a guessing attacker. Human choices have little
  of it.
- The birthday bound: repeats appear after about $\sqrt{N}$ draws, so hashes
  need twice the bits, and 64-bit blocks and short random nonces wear out.
- The one-time pad is perfectly secret, and Shannon proved that any perfectly
  secret cipher needs as much key as message.
- Reusing a pad cancels the key (Tunny, Venona), and the pad alone gives no
  integrity.
- Use the OS generator through `secrets` or your library for every secret;
  bad randomness broke Netscape, Debian, routers, the PlayStation 3 and
  Android wallets, and Dual_EC_DRBG hid a back door.

**Next:** Part II begins with [Chapter 5](05-Stream-Ciphers.md), which turns the
one-time pad into practical stream ciphers, from RC4 and its failure to
ChaCha20.

## Further reading

- Claude Shannon, "A Mathematical Theory of Communication", *Bell System
  Technical Journal* 27 (1948), and "Communication Theory of Secrecy Systems",
  *Bell System Technical Journal* 28 (1949).
- Jonathan Katz and Yehuda Lindell, *Introduction to Modern Cryptography* (3rd
  edition, 2020), chapters 2 and 3: perfect secrecy and pseudorandomness.
- Steven M. Bellovin, "Frank Miller: Inventor of the One-Time Pad",
  *Cryptologia* 35 (2011).
- Robert L. Benson, *The Venona Story*, NSA Center for Cryptologic History.
- Ian Goldberg and David Wagner, "Randomness and the Netscape Browser",
  *Dr. Dobb's Journal* (January 1996).
- Nadia Heninger, Zakir Durumeric, Eric Wustrow and J. Alex Halderman, "Mining
  Your Ps and Qs", USENIX Security 2012.
- NIST SP 800-90A Rev. 1, SP 800-90B and SP 800-90C.
- On this site: [OS random number generators](../09-random/OS-RNG.md),
  [NIST DRBGs](../09-random/NIST-DRBG.md),
  [Retired generators](../09-random/Retired.md) and the
  [FAQ on randomness](../FAQ.md#why-does-randomness-matter-so-much).
