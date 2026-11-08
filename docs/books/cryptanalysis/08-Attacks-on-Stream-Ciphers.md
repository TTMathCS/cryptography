# 8. Attacks on Stream Ciphers

*A stream cipher stands or falls on one thing: whether its keystream can be told
apart from coin flips. This chapter is about the many ways it can. You will
recover a shift register from 40 of its bits, take apart a three-register
combiner one register at a time, solve a degree-4 filter generator with
equations of degree 2, measure the key leaking out of RC4's key schedule, break
a simulated WEP network from its traffic, read a secret byte out of thousands of
RC4 sessions, and run a cube attack on a small black-box polynomial. Then come
the real casualties, A5/1, A5/2, Bluetooth's E0 and reduced Trivium, and the
lesson modern designs such as ChaCha20 took from them.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a bare linear feedback shift register (LFSR) gives itself away, and what
      linear complexity measures;
    - how nonlinear combiners and filters are built, and the properties of a
      Boolean function that decide whether they survive: degree, nonlinearity,
      correlation immunity and algebraic immunity;
    - Siegenthaler's correlation attack, done in full on a Geffe generator, and
      the idea behind fast correlation attacks;
    - algebraic attacks with low-degree annihilators, guess-and-determine attacks
      and distinguishing attacks;
    - RC4's weaknesses in order: the Roos biases, the FMS, Klein and PTW attacks
      on WEP, and the biases that ended RC4 in TLS;
    - how GSM's A5/1 and A5/2 and Bluetooth's E0 were broken, and how cube attacks
      reach into reduced Trivium;
    - what modern designs do with all of this.

    **You need:** book 1's [Chapter 5](../../book/05-Stream-Ciphers.md), which
    builds LFSRs, RC4 and ChaCha20 and tells their stories in brief; the attack
    models and costs of [Chapter 1](01-What-Cryptanalysis-Is.md); the
    time-memory trade-offs of [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)
    for §8.11; and arithmetic modulo 2 (XOR and AND).

    **Levels:** §8.1 and §8.2 are for beginners, and so is the story of WEP in
    §8.9. §8.3 to §8.5 and §8.7 to §8.11 are intermediate, as is §8.14. §8.6,
    §8.12, §8.13 and §8.15 are expert.

## 8.1 The problem

*Level: beginner.*

Picture a settlement on Mars a few decades after the first landings. The newest
domes have fiber in the walls and modern radios, but the first habitat module,
the one that came down on the second cargo flight, still has the wireless access
point it was built with. It runs the air-quality sensors and the old door locks,
nobody has wanted to touch it since it worked, and it still speaks the first
Wi-Fi security standard, WEP, with a 40-bit key typed in by an engineer long
since rotated home. Anyone with a laptop in the corridor can record its traffic.
The question of this chapter is how much they can learn from that recording,
and the answer for WEP is: the key, within minutes.

WEP is the most famous broken stream cipher, but it is one of many. A stream
cipher turns a short key, and usually a public nonce or initialization vector
(IV), into a long **keystream** $z_0, z_1, z_2, \ldots$ and encrypts by XOR:
$c_t = m_t \oplus z_t$. Book 1's [Chapter 5](../../book/05-Stream-Ciphers.md)
builds the main designs. From the attacker's side, the setting is almost always
**known plaintext**: packet headers, file formats and protocol messages are
predictable, so a stretch of ciphertext gives a stretch of keystream for free.
The attacker then wants one of three things.

1. **Key recovery**: find the key, and with it every message under it.
2. **State recovery**: find the generator's internal state at some moment. That
   is often as good as the key, because the generator can be run forward to
   decrypt everything after that moment, and in many designs backward to the key.
3. **Distinguishing**: tell the keystream from random with better than even
   odds. That sounds weak, but a keystream that is not random leaks plaintext
   when the same message is encrypted often enough, and §8.10 shows it ending a
   cipher in the world's most used protocol.

Every stream cipher attack in this chapter exploits a structure the designer
hoped would stay hidden. The oldest structure is linearity: shift registers are
fast because they are linear, and linear things are easy to solve. The next is
**correlation**: a nonlinear combining function that still agrees with one of its
inputs more often than half the time. Then come **low-degree equations**, hidden
inside high-degree functions; **guessable** pieces of state that determine the
rest; **biases** in the output, which RC4 had in abundance; and, in the most
modern attacks, **low-degree behavior in the public IV**, found by summing
outputs over many chosen IVs.

Figure 8.1 lays out the half century the chapter covers. It starts in 1969 with
an algorithm from coding theory and ends with RC4 banned from TLS and
Bluetooth's key negotiation broken.

<figure class="mars-fig">
<svg viewBox="0 0 640 392" width="640" role="img" aria-label="Timeline of attacks on stream ciphers from Berlekamp-Massey in 1969 to the ban on RC4 in TLS in 2015" fill="currentColor" font-size="14">
<line x1="82" y1="8" x2="82" y2="384" stroke="currentColor" stroke-width="1.6"/>
<text x="68" y="27" text-anchor="end" font-weight="bold">1969</text>
<circle cx="82" cy="22" r="4" fill="currentColor"/>
<text x="98" y="27">Massey: Berlekamp's algorithm finds the shortest LFSR</text>
<text x="68" y="50" text-anchor="end" font-weight="bold">1973</text>
<circle cx="82" cy="45" r="4" fill="currentColor"/>
<text x="98" y="50">Geffe's three-register generator</text>
<text x="68" y="73" text-anchor="end" font-weight="bold">1985</text>
<circle cx="82" cy="68" r="4" fill="currentColor"/>
<text x="98" y="73">Siegenthaler's correlation attack</text>
<text x="68" y="96" text-anchor="end" font-weight="bold">1988</text>
<circle cx="82" cy="91" r="4" fill="currentColor"/>
<text x="98" y="96">Meier and Staffelbach: fast correlation attacks</text>
<text x="68" y="119" text-anchor="end" font-weight="bold">1995</text>
<circle cx="82" cy="114" r="4" fill="currentColor"/>
<text x="98" y="119">Roos: a class of weak keys in RC4</text>
<text x="68" y="142" text-anchor="end" font-weight="bold">1999</text>
<circle cx="82" cy="137" r="4" fill="currentColor"/>
<text x="98" y="142">A5/1 and A5/2 reverse-engineered; A5/2 broken at once</text>
<text x="68" y="165" text-anchor="end" font-weight="bold">2000</text>
<circle cx="82" cy="160" r="4" fill="currentColor"/>
<text x="98" y="165">Biryukov, Shamir and Wagner: A5/1 in seconds after precomputation</text>
<text x="68" y="188" text-anchor="end" font-weight="bold">2001</text>
<circle cx="82" cy="183" r="4" fill="currentColor"/>
<text x="98" y="188">Fluhrer, Mantin and Shamir: WEP keys recovered</text>
<text x="68" y="211" text-anchor="end" font-weight="bold">2003</text>
<circle cx="82" cy="206" r="4" fill="currentColor"/>
<text x="98" y="211">Courtois and Meier: algebraic attacks; A5/2 ciphertext-only</text>
<text x="68" y="234" text-anchor="end" font-weight="bold">2005</text>
<circle cx="82" cy="229" r="4" fill="currentColor"/>
<text x="98" y="234">Lu, Meier and Vaudenay: Bluetooth's E0 in practice</text>
<text x="68" y="257" text-anchor="end" font-weight="bold">2007</text>
<circle cx="82" cy="252" r="4" fill="currentColor"/>
<text x="98" y="257">Tews, Weinmann and Pyshkin: 104-bit WEP in a minute</text>
<text x="68" y="280" text-anchor="end" font-weight="bold">2008</text>
<circle cx="82" cy="275" r="4" fill="currentColor"/>
<text x="98" y="280">eSTREAM portfolio: Trivium, Grain, Salsa20/12 and others</text>
<text x="68" y="303" text-anchor="end" font-weight="bold">2009</text>
<circle cx="82" cy="298" r="4" fill="currentColor"/>
<text x="98" y="303">Dinur and Shamir: cube attacks; public A5/1 tables</text>
<text x="68" y="326" text-anchor="end" font-weight="bold">2013</text>
<circle cx="82" cy="321" r="4" fill="currentColor"/>
<text x="98" y="326">AlFardan and others: RC4 biases recover plaintext from TLS</text>
<text x="68" y="349" text-anchor="end" font-weight="bold">2015</text>
<circle cx="82" cy="344" r="4" fill="currentColor"/>
<text x="98" y="349">Bar Mitzvah and RC4 NOMORE; RFC 7465 bans RC4 in TLS</text>
<text x="68" y="372" text-anchor="end" font-weight="bold">2019</text>
<circle cx="82" cy="367" r="4" fill="currentColor"/>
<text x="98" y="372">KNOB: Bluetooth keys negotiated down to one byte</text>
</svg>
<figcaption>Figure 8.1. Fifty years of attacks on stream ciphers. The methods arrive in the 1980s (correlation) and 2000s (algebraic, cube); the casualties are the ciphers deployed in billions of devices: RC4, A5/1, A5/2, E0.</figcaption>
</figure>

Sections 8.2 to 8.7 are the methods, each done on a cipher small enough to
break on a laptop; §8.8 to §8.13 are the cases (RC4 three times over, GSM,
Bluetooth, Trivium); §8.14 asks what designers learned. Throughout, a $k$-bit
cipher is broken in the sense of [Chapter 1](01-What-Cryptanalysis-Is.md) by
anything cheaper than $2^k$, and broken in practice when the attack fits the
keystream a real attacker can collect, which for stream ciphers is often a lot:
a Wi-Fi network sends thousands of packets a second.

## 8.2 Linear complexity: why a bare LFSR is useless

*Level: beginner.*

A linear feedback shift register of length $L$ holds $L$ bits. At each tick it
outputs its oldest bit and appends a new one, the XOR of some fixed cells, the
**taps**. In symbols, with the output sequence $s_0, s_1, \ldots$,

$$
s_{t+L} = c_1 s_{t+L-1} \oplus c_2 s_{t+L-2} \oplus \cdots \oplus c_L s_t ,
$$

where each $c_i$ is 0 or 1. With the right taps the sequence repeats only after
$2^L - 1$ bits and passes most statistical tests for randomness. Book 1's
[§5.3](../../book/05-Stream-Ciphers.md) builds one and shows its cycle.

### By hand: 8 bits give away a 4-cell register

Suppose an attacker has 8 bits of keystream from a 4-cell register whose taps are
secret:

$$
s = 1\ 0\ 0\ 0\ 1\ 0\ 0\ 1 .
$$

The rule must be $s_{t+4} = c_4 s_t \oplus c_3 s_{t+1} \oplus c_2 s_{t+2} \oplus c_1 s_{t+3}$
for some unknown bits. Write it out for $t = 0, 1, 2, 3$, using the bits seen:

| $t$ | Equation | Gives |
|---|---|---|
| 0 | $s_4 = 1 = c_4 \cdot 1 \oplus c_3 \cdot 0 \oplus c_2 \cdot 0 \oplus c_1 \cdot 0$ | $c_4 = 1$ |
| 1 | $s_5 = 0 = c_4 \cdot 0 \oplus c_3 \cdot 0 \oplus c_2 \cdot 0 \oplus c_1 \cdot 1$ | $c_1 = 0$ |
| 2 | $s_6 = 0 = c_4 \cdot 0 \oplus c_3 \cdot 0 \oplus c_2 \cdot 1 \oplus c_1 \cdot 0$ | $c_2 = 0$ |
| 3 | $s_7 = 1 = c_4 \cdot 0 \oplus c_3 \cdot 1 \oplus c_2 \cdot 0 \oplus c_1 \cdot 0$ | $c_3 = 1$ |

So $s_{t+4} = s_t \oplus s_{t+1}$, and the attacker can now write down the rest
of the keystream forever: 1, 0, 1, 0, 1, 1, 1, 1, and so on. Four bits fixed the
state (the first four bits *are* the state) and four more fixed the taps. In
general $2L$ bits fix both, because the taps are $L$ unknowns of a linear system
whose rows come from the keystream.

### Linear complexity

Solving the system takes about $L^3$ steps by Gaussian elimination. In 1969
James Massey showed that an algorithm Elwyn Berlekamp had published the year
before for decoding BCH codes does better: it reads the sequence one bit at a
time, keeps the shortest LFSR that explains everything so far, and corrects it
whenever a new bit disagrees, in about $L^2$ steps. That is the
**Berlekamp-Massey algorithm**. The length it settles on is the sequence's
**linear complexity**: the length of the shortest LFSR that generates it.

Linear complexity turns the attack into a measure. Any sequence of linear
complexity $\Lambda$ is predicted completely from $2\Lambda$ consecutive bits, so a
keystream is only as strong as its linear complexity is large. A truly random
sequence of $n$ bits has linear complexity close to $n/2$, and its **linear
complexity profile**, the complexity of the first $k$ bits plotted against $k$,
follows the line $k/2$. A generator must reach a complexity far beyond any amount
of keystream an attacker can ever see.

Combining registers raises it, in a way Edwin Key worked out in 1976. If
registers of pairwise distinct lengths $L_1, L_2, \ldots$ with primitive feedback
are combined by a Boolean function written as an XOR of products (its algebraic
normal form, §8.3), the linear complexity of the output is that same expression
evaluated on the lengths as ordinary integers. The **Geffe generator** of 1973
outputs register 1 when register 2 is 1, and register 3 otherwise:

$$
z = x_1 x_2 \oplus x_2 x_3 \oplus x_3 ,
\qquad
\Lambda(z) = L_1 L_2 + L_2 L_3 + L_3 .
$$

### Code it

The program below codes Berlekamp-Massey, gives it 40 bits of a 20-cell
register with secret taps, and checks that the recovered register predicts all
1,000 bits. Then it runs the same algorithm on a Geffe generator built from
registers of 3, 4 and 5 cells, to check Key's formula.

```python
def lfsr(state, taps, n):
    # state[0] is the oldest bit; each new bit is the XOR of the tapped cells
    s, out = list(state), []
    for _ in range(n):
        out.append(s[0])
        s = s[1:] + [sum(s[t] for t in taps) % 2]
    return out

def berlekamp_massey(z):
    # returns L and the connection polynomial C (C[0] = 1): z[n] = C[1]z[n-1] + ... + C[L]z[n-L]
    C, B = [1], [1]
    L, shift = 0, 1
    for n in range(len(z)):
        d = z[n]
        for i in range(1, L + 1):
            d ^= C[i] & z[n - i]
        if d:
            T = C[:]
            C = C + [0] * (len(B) + shift - len(C))
            for i, b in enumerate(B):
                C[i + shift] ^= b
            if 2 * L <= n:
                L, B, shift = n + 1 - L, T, 0
        shift += 1
    return L, C[:L + 1]

# a bare 20-cell LFSR: 40 bits give it away
secret = [1,0,1,1,0,0,1,0,1,1,1,0,0,0,1,0,1,0,0,1]
z = lfsr(secret, [0, 3], 1000)
L, C = berlekamp_massey(z[:40])
guess = z[:L]
while len(guess) < 1000:
    guess.append(sum(C[i] & guess[-i] for i in range(1, L + 1)) % 2)
print("bare LFSR: L =", L, " predicted all 1000 bits:", guess == z)

# three small registers through the Geffe function
x1 = lfsr([1,0,0], [0, 1], 400)            # 3 cells
x2 = lfsr([1,0,0,0], [0, 1], 400)          # 4 cells
x3 = lfsr([1,0,0,0,0], [0, 2], 400)        # 5 cells
g = [a if b else c for a, b, c in zip(x1, x2, x3)]
print("Geffe: L =", berlekamp_massey(g)[0], " formula 3*4 + 4*5 + 5 =", 3*4 + 4*5 + 5)
```

It prints

```
bare LFSR: L = 20  predicted all 1000 bits: True
Geffe: L = 37  formula 3*4 + 4*5 + 5 = 37
```

The variable `d` is the **discrepancy**: the XOR of the bit the current register
predicts and the bit that actually came. When it is 1 the algorithm adds a
shifted copy of an older register, `B`, the one in use just before the last
time the length grew; that cancels the error at position $n$ without spoiling
the earlier predictions. The length grows only when the old register was too
short to be fixed in place, and it grows to $n + 1 - L$. Massey's proof that
the result is always a *shortest* register rests on one lemma: if a register of
length $L$ generates $s_0 \ldots s_{n-1}$ but not $s_n$, then every register that
generates $s_0 \ldots s_n$ has length at least $n + 1 - L$.

So a bare LFSR is useless as a cipher, whatever its length and taps: a
1,000-cell register falls to 2,000 bits and a million steps. The Geffe line
shows the hope of the 1970s: 12 bits of state with linear complexity 37, and
registers of 100 cells would give about 20,000. The next sections show that
linear complexity is necessary, but nowhere near sufficient.

## 8.3 Nonlinear combiners and filters

*Level: intermediate.*

There are two classic ways to put nonlinearity into LFSRs, shown in Figure 8.2.
A **combination generator** runs several registers side by side and feeds one
bit from each into a Boolean function $f$; the Geffe generator is one. A
**filter generator** runs one long register and feeds several of its cells into
$f$. Both are cheap in hardware, both have huge periods, and both can reach huge
linear complexity. Variants add memory to the function (Bluetooth's E0, §8.12),
make the clocking irregular (A5/1, §8.11), or let one register decide how often
another steps (the shrinking generator of Coppersmith, Krawczyk and Mansour,
1993).

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Left: a combination generator, three LFSRs each feeding one bit into a function f that outputs z. Right: a filter generator, one LFSR with several cells feeding f" fill="currentColor" font-size="14">
<text x="150" y="20" text-anchor="middle" font-weight="bold">combination generator</text>
<rect x="20" y="40" width="130" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="63" text-anchor="middle">LFSR 1</text>
<rect x="20" y="100" width="130" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="123" text-anchor="middle">LFSR 2</text>
<rect x="20" y="160" width="130" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="183" text-anchor="middle">LFSR 3</text>
<line x1="150" y1="58" x2="200" y2="105" stroke="currentColor" stroke-width="1.4"/>
<line x1="150" y1="118" x2="200" y2="118" stroke="currentColor" stroke-width="1.4"/>
<line x1="150" y1="178" x2="200" y2="131" stroke="currentColor" stroke-width="1.4"/>
<rect x="200" y="94" width="50" height="48" rx="4" fill="currentColor" opacity="0.12"/>
<rect x="200" y="94" width="50" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="225" y="123" text-anchor="middle" font-style="italic">f</text>
<line x1="250" y1="118" x2="285" y2="118" stroke="currentColor" stroke-width="1.4"/>
<polygon points="292,118 284,114 284,122" fill="currentColor"/>
<text x="298" y="123">z</text>
<text x="85" y="226" text-anchor="middle">x1, x2, x3: one bit each</text>
<line x1="320" y1="20" x2="320" y2="230" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<text x="480" y="20" text-anchor="middle" font-weight="bold">filter generator</text>
<rect x="345" y="60" width="280" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="380" y1="60" x2="380" y2="96" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="415" y1="60" x2="415" y2="96" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="450" y1="60" x2="450" y2="96" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="485" y1="60" x2="485" y2="96" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="520" y1="60" x2="520" y2="96" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="555" y1="60" x2="555" y2="96" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="590" y1="60" x2="590" y2="96" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="485" y="50" text-anchor="middle">one LFSR, L cells</text>
<line x1="362" y1="96" x2="455" y2="150" stroke="currentColor" stroke-width="1.4"/>
<line x1="432" y1="96" x2="468" y2="150" stroke="currentColor" stroke-width="1.4"/>
<line x1="502" y1="96" x2="485" y2="150" stroke="currentColor" stroke-width="1.4"/>
<line x1="572" y1="96" x2="500" y2="150" stroke="currentColor" stroke-width="1.4"/>
<line x1="607" y1="96" x2="512" y2="150" stroke="currentColor" stroke-width="1.4"/>
<rect x="450" y="150" width="70" height="44" rx="4" fill="currentColor" opacity="0.12"/>
<rect x="450" y="150" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="485" y="177" text-anchor="middle" font-style="italic">f</text>
<line x1="520" y1="172" x2="565" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="572,172 564,168 564,176" fill="currentColor"/>
<text x="578" y="177">z</text>
<text x="485" y="226" text-anchor="middle">several cells of the same register</text>
</svg>
<figcaption>Figure 8.2. The two classic LFSR designs. A combination generator (left) can be attacked one register at a time if f leaks any single input; a filter generator (right) has one state, but every output bit is f of linear functions of it, which algebraic attacks exploit.</figcaption>
</figure>

### The vocabulary of Boolean functions

Every attack in §8.4 to §8.6 targets a property of $f$, so it is worth naming
them. A Boolean function of $n$ inputs is a table of $2^n$ output bits. It can
always be written uniquely as an XOR of products of its inputs, its **algebraic
normal form** (ANF). The Geffe function's ANF is $x_1 x_2 \oplus x_2 x_3 \oplus x_3$.

- **Degree** is the size of the largest product in the ANF. Degree 1 means
  linear (or affine), which Berlekamp-Massey eats. For a filter generator, the
  degree $d$ bounds the linear complexity by $\sum_{i \le d} \binom{L}{i}$, so
  designers want it high.
- **Balance**: $f$ outputs 0 and 1 equally often. An unbalanced $f$ makes a
  keystream with a bias, which §8.7 turns into a distinguisher.
- **Nonlinearity** is the distance (number of differing table entries) from $f$
  to the nearest affine function. Low nonlinearity means $f$ agrees with some
  XOR of its inputs much more than half the time, which is exactly what
  correlation attacks need. It is computed from the **Walsh transform**
  $$
  W_f(a) = \sum_{x \in \{0,1\}^n} (-1)^{f(x) \oplus a \cdot x},
  \qquad
  \mathrm{NL}(f) = 2^{n-1} - \tfrac12 \max_a |W_f(a)| ,
  $$
  where $a \cdot x$ is the XOR of the inputs selected by $a$. The correlation
  between $f$ and the linear function $a \cdot x$ is $W_f(a)/2^n$.
- **Correlation immunity** of order $t$: the output is statistically independent
  of every set of $t$ inputs, which is the same as $W_f(a) = 0$ for every nonzero
  $a$ with at most $t$ ones. A balanced function with this property is called
  **$t$-resilient**. Thomas Siegenthaler defined it in 1984, and proved the
  trade-off that has haunted designers since: for $n$ inputs, correlation
  immunity of order $t$ forces the degree down to at most $n - t$ (to $n - t - 1$
  if $f$ is also balanced).
- **Algebraic immunity**, defined in 2004, is the smallest degree of a nonzero
  function $g$ with $g \cdot f = 0$ or $g \cdot (1 \oplus f) = 0$. Section 8.6
  explains why it matters; it is never more than $\lceil n/2 \rceil$.

These pull against each other, and with few inputs no function does well on
all of them; that is one reason modern designs abandoned the pure LFSR combiner
(§8.14).

### What the Geffe function gets wrong

Count, in the Geffe table, how often the output agrees with each input:

| $x_1$ | $x_2$ | $x_3$ | $z$ | $z = x_1$? | $z = x_2$? | $z = x_3$? |
|---|---|---|---|---|---|---|
| 0 | 0 | 0 | 0 | yes | yes | yes |
| 0 | 0 | 1 | 1 | no | no | yes |
| 0 | 1 | 0 | 0 | yes | no | yes |
| 0 | 1 | 1 | 0 | yes | no | no |
| 1 | 0 | 0 | 0 | no | yes | yes |
| 1 | 0 | 1 | 1 | yes | no | yes |
| 1 | 1 | 0 | 1 | yes | yes | no |
| 1 | 1 | 1 | 1 | yes | yes | yes |
| | | | | **6 of 8** | **4 of 8** | **6 of 8** |

The output agrees with $x_1$ and with $x_3$ three times in four: the function is
not even correlation immune of order 1. Its degree is 2, its nonlinearity is 2
(the most a 3-input function can have), and it is balanced. Looked at by degree
and balance alone it is a respectable function; looked at by correlation it
leaks two of its three inputs. The next section turns that leak into an attack.

## 8.4 Siegenthaler's correlation attack

*Level: intermediate.*

Thomas Siegenthaler, working on his doctorate at ETH Zurich under James Massey,
published the attack in 1985 in the *IEEE Transactions on Computers*, a year
after his paper defining correlation immunity. The idea is **divide and
conquer**. A Geffe generator with registers of 13, 17 and 14 cells has 44 bits of
key, about $1.8 \times 10^{13}$ start states. But the output agrees with register 1
75% of the time *whatever registers 2 and 3 are doing*. So guess register 1 on
its own: for each of its $2^{13}$ possible start states, run it forward and count
how many keystream bits it matches. A wrong guess produces a sequence unrelated
to the keystream and matches about half; the right guess matches about three
quarters. Do the same for register 3. The work is the **sum** of the register
sizes' powers of two, not their product.

### How much keystream

Let the correct register agree with the keystream with probability
$p = \tfrac12 + \varepsilon$ (here $\varepsilon = \tfrac14$), and let the attacker
use $N$ bits. A wrong guess scores a binomial count with mean $N/2$ and standard
deviation $\sqrt{N}/2$. The right guess scores about $N(\tfrac12 + \varepsilon)$.
With $2^L$ wrong guesses, the largest wrong score is about
$\sqrt{2 L \ln 2}$ standard deviations above the mean, so the right guess stands
out once

$$
N \varepsilon \gtrsim \sqrt{2 L \ln 2}\cdot \frac{\sqrt N}{2}
\quad\Longleftrightarrow\quad
N \gtrsim \frac{L \ln 2}{2 \varepsilon^2} .
$$

For $L = 14$ and $\varepsilon = \tfrac14$ that is about 78 bits; a few times more
gives a safe margin, and the code uses 300. The formula is the reason designers
care about tiny correlations: halve $\varepsilon$ and the data quadruples, but a
correlation of $2^{-20}$ is still exploitable with about $2^{40} L$ bits of
keystream, which a fast link produces in a day.

### Code it

The registers are written so that each output bit is the parity of the start
state ANDed with a mask; the masks are computed once, by running the register on
symbols instead of bits. Then a guess is scored with a few integer operations per
bit.

Register 2, the selector, is never guessed. Once registers 1 and 3 are known,
every position where they disagree tells the attacker which one the selector
picked, so it gives one linear equation in register 2's start bits. About half
of the 300 positions qualify, far more than the 17 needed, and Gaussian
elimination over GF(2) finishes the job.

```python
import random

def masks(L, taps, n):
    # cell i starts as key bit i; every later bit is an XOR of key bits, kept as a bitmask
    cells, out = [1 << i for i in range(L)], []
    for _ in range(n):
        out.append(cells[0])
        new = 0
        for t in taps:
            new ^= cells[t]
        cells = cells[1:] + [new]
    return out

def run(state, M):
    # output bit t = parity of (state AND mask t)
    return [bin(state & m).count("1") & 1 for m in M]

N = 300
R1, R2, R3 = (13, [0, 1, 3, 4]), (17, [0, 3]), (14, [0, 1, 6, 10])
M1, M2, M3 = masks(*R1, N), masks(*R2, N), masks(*R3, N)

rng = random.Random(2026)
k1, k2, k3 = rng.randrange(1, 2**13), rng.randrange(1, 2**17), rng.randrange(1, 2**14)
x1, x2, x3 = run(k1, M1), run(k2, M2), run(k3, M3)
z = [a if s else c for a, s, c in zip(x1, x2, x3)]      # the Geffe keystream

def correlate(L, M):
    # score every start state by how many keystream bits it matches
    scores = {k: sum(a == b for a, b in zip(run(k, M), z)) for k in range(1, 2**L)}
    best = max(scores, key=scores.get)
    second = max(v for k, v in scores.items() if k != best)
    return best, scores[best], second

g1, s1, w1 = correlate(13, M1)
g3, s3, w3 = correlate(14, M3)
print("register 1:", g1, "matches", s1, "of", N, "(best wrong guess", w1, ")", g1 == k1)
print("register 3:", g3, "matches", s3, "of", N, "(best wrong guess", w3, ")", g3 == k3)

# register 2 is never searched: where x1 and x3 differ, z says which one was chosen
y1, y3 = run(g1, M1), run(g3, M3)
eqs = [(M2[t], 1 if z[t] == y1[t] else 0) for t in range(N) if y1[t] != y3[t]]

def solve(eqs, nvars):
    # Gaussian elimination over GF(2); each equation is (bitmask, right-hand bit)
    rows = []
    for m, b in eqs:
        for rm, rb in rows:
            if m & (rm & -rm):
                m, b = m ^ rm, b ^ rb
        if m:
            rows = [(rm ^ m, rb ^ b) if rm & (m & -m) else (rm, rb) for rm, rb in rows]
            rows.append((m, b))
    x = 0
    for m, b in rows:
        if b:
            x |= m & -m
    return x if len(rows) == nvars else None

g2 = solve(eqs, 17)
print("register 2:", g2, "from", len(eqs), "equations", g2 == k2)
print("guesses:", 2**13 + 2**14, "instead of about 2^44")
```

It prints

```
register 1: 976 matches 220 of 300 (best wrong guess 181 ) True
register 3: 8234 matches 228 of 300 (best wrong guess 184 ) True
register 2: 41876 from 152 equations True
guesses: 24576 instead of about 2^44
```

and runs in about a second. Figure 8.3 shows what the attacker sees for
register 1: a bell curve of wrong guesses centered on 150, and one guess far to
the right of it.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Histogram of match scores for the 8,190 wrong guesses of register 1, clustered around 150 of 300, with the right guess alone at 220" fill="currentColor" font-size="14">
<path d="M60,20V240H620" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M100.2,240v-0.9h3.6V240ZM114.2,240v-0.5h3.6V240ZM118.9,240v-2.3h3.6V240ZM123.5,240v-3.3h3.6V240ZM128.2,240v-2.8h3.6V240ZM132.9,240v-2.8h3.6V240ZM137.5,240v-5.1h3.6V240ZM142.2,240v-8.8h3.6V240ZM146.9,240v-6.5h3.6V240ZM151.5,240v-13.0h3.6V240ZM156.2,240v-17.2h3.6V240ZM160.9,240v-16.3h3.6V240ZM165.5,240v-25.6h3.6V240ZM170.2,240v-26.0h3.6V240ZM174.9,240v-45.5h3.6V240ZM179.5,240v-53.0h3.6V240ZM184.2,240v-55.7h3.6V240ZM188.9,240v-64.6h3.6V240ZM193.5,240v-83.2h3.6V240ZM198.2,240v-93.4h3.6V240ZM202.9,240v-98.5h3.6V240ZM207.5,240v-112.4h3.6V240ZM212.2,240v-125.9h3.6V240ZM216.9,240v-141.7h3.6V240ZM221.5,240v-146.3h3.6V240ZM226.2,240v-153.8h3.6V240ZM230.9,240v-156.6h3.6V240ZM235.5,240v-176.1h3.6V240ZM240.2,240v-167.7h3.6V240ZM244.9,240v-161.2h3.6V240ZM249.5,240v-160.7h3.6V240ZM254.2,240v-190.0h3.6V240ZM258.9,240v-182.6h3.6V240ZM263.5,240v-167.2h3.6V240ZM268.2,240v-157.9h3.6V240ZM272.9,240v-130.1h3.6V240ZM277.5,240v-126.4h3.6V240ZM282.2,240v-109.2h3.6V240ZM286.9,240v-105.0h3.6V240ZM291.5,240v-86.4h3.6V240ZM296.2,240v-76.2h3.6V240ZM300.9,240v-64.6h3.6V240ZM305.5,240v-58.1h3.6V240ZM310.2,240v-53.0h3.6V240ZM314.9,240v-38.1h3.6V240ZM319.5,240v-30.7h3.6V240ZM324.2,240v-20.9h3.6V240ZM328.9,240v-21.4h3.6V240ZM333.5,240v-16.7h3.6V240ZM338.2,240v-12.1h3.6V240ZM342.9,240v-8.8h3.6V240ZM347.5,240v-4.6h3.6V240ZM352.2,240v-7.0h3.6V240ZM356.9,240v-1.9h3.6V240ZM361.5,240v-2.3h3.6V240ZM366.2,240v-2.3h3.6V240ZM370.9,240v-0.9h3.6V240ZM375.5,240v-1.4h3.6V240ZM380.2,240v-0.9h3.6V240ZM384.9,240v-0.5h3.6V240ZM389.5,240v-0.5h3.6V240Z" fill="currentColor" opacity="0.55"/>
<line x1="60.0" y1="240" x2="60.0" y2="245" stroke="currentColor"/><text x="60.0" y="261" text-anchor="middle">110</text>
<line x1="153.3" y1="240" x2="153.3" y2="245" stroke="currentColor"/><text x="153.3" y="261" text-anchor="middle">130</text>
<line x1="246.7" y1="240" x2="246.7" y2="245" stroke="currentColor"/><text x="246.7" y="261" text-anchor="middle">150</text>
<line x1="340.0" y1="240" x2="340.0" y2="245" stroke="currentColor"/><text x="340.0" y="261" text-anchor="middle">170</text>
<line x1="433.3" y1="240" x2="433.3" y2="245" stroke="currentColor"/><text x="433.3" y="261" text-anchor="middle">190</text>
<line x1="526.7" y1="240" x2="526.7" y2="245" stroke="currentColor"/><text x="526.7" y="261" text-anchor="middle">210</text>
<line x1="620.0" y1="240" x2="620.0" y2="245" stroke="currentColor"/><text x="620.0" y="261" text-anchor="middle">230</text>
<line x1="55" y1="240.0" x2="60" y2="240.0" stroke="currentColor"/><text x="50" y="245.0" text-anchor="end">0</text>
<line x1="55" y1="147.1" x2="60" y2="147.1" stroke="currentColor"/><text x="50" y="152.1" text-anchor="end">200</text>
<line x1="55" y1="54.2" x2="60" y2="54.2" stroke="currentColor"/><text x="50" y="59.2" text-anchor="end">400</text>
<rect x="570.8" y="200" width="5" height="40" fill="currentColor"/>
<text x="573.3" y="190" text-anchor="middle" font-weight="bold">right guess: 220</text>
<text x="246.7" y="16" text-anchor="middle">8,190 wrong guesses (best 181)</text>
<text x="340" y="288" text-anchor="middle">keystream bits matched, out of 300</text>
</svg>
<figcaption>Figure 8.3. Siegenthaler's attack on register 1 of the code's Geffe generator. Each bar counts the wrong start states that matched a given number of the 300 keystream bits; they cluster around half. The right start state matches 220, 39 more than the best wrong one.</figcaption>
</figure>

### Why it works, and what defends against it

The proof is the counting above: the attack needs only that some single input,
or a small set of inputs, is correlated with the output. If $f$ is correlation
immune of order $t$, no set of $t$ registers is correlated, and the attacker must
guess $t + 1$ registers together, paying the product of their key spaces. That is
Siegenthaler's own defense, and his trade-off says what it costs in degree.

A second defense is to make every register long. A correlation attack on a
register of 80 cells costs $2^{80}$ guesses, no better than brute force on the
key. Siegenthaler's attack is exhaustive over each register, so it only wins when
the registers are short. The fast correlation attacks of the next section remove
that limit.

!!! note "Life story: Siegenthaler's correlation attack"
    **Born:** 1985, Thomas Siegenthaler at ETH Zurich, "Decrypting a Class of
    Stream Ciphers Using Ciphertext Only", after his 1984 paper on correlation
    immunity · **Purpose:** to recover the registers of a nonlinear combiner one
    at a time from the statistical leak of its combining function ·
    **Helped:** ended the Geffe generator and the naive combiners of the 1970s;
    gave designers correlation immunity and resiliency as design criteria ·
    **Status:** current, as the base case of every correlation attack; any new
    LFSR-based design is checked against it first

## 8.5 Fast correlation attacks

*Level: intermediate.*

In 1988 Willi Meier and Othmar Staffelbach, then at the HTL Brugg-Windisch and at
Gretag in Switzerland, presented a way to use a correlation without guessing the
register at all. Their paper at EUROCRYPT '88, published in full in the *Journal
of Cryptology* in 1989, is called "Fast Correlation Attacks on Certain Stream
Ciphers", and for registers with few taps it runs in time roughly linear in the
register's length instead of exponential.

### The attack as decoding

Change the point of view. The register's output $x_0, x_1, \ldots$ is a sequence
the attacker does not see. The keystream $z$ is that sequence with noise: each bit
is flipped with probability $p = \tfrac12 - \varepsilon$, as if $x$ had been sent
over a noisy channel. And $x$ is not just any sequence: it obeys the register's
linear recurrence, so it is a **codeword** of a linear code. Recovering the
register from $z$ is **decoding** that code, and coding theory has fast ways to
decode when the code has many low-weight parity checks.

The recurrence itself is a parity check. If the feedback polynomial is
$1 + x + x^4$, then

$$
x_t \oplus x_{t+1} \oplus x_{t+4} = 0 \quad \text{for every } t .
$$

Squaring a polynomial over GF(2) just doubles its exponents, so
$1 + x^2 + x^8$, $1 + x^4 + x^{16}$ and so on are also multiples of the
feedback polynomial, and give more checks of the same weight. Each bit $x_t$ sits
in several of them: in the check for $1 + x + x^4$ at three positions, and the
same again for each square. With $N$ bits of keystream, a bit gets about
$m \approx 3 \log_2(N / 2L)$ checks of weight 3.

### By hand: what a check says about a bit

Suppose each keystream bit is wrong with probability $p = \tfrac14$, and take one
check of weight 3 that contains $z_t$. The check $z_t \oplus z_u \oplus z_v = 0$ holds
when an even number of its three bits are wrong. If $z_t$ is right, the check
holds when $z_u$ and $z_v$ are both right or both wrong:

$$
\Pr[\text{holds} \mid z_t \text{ right}] = \left(\tfrac34\right)^2 + \left(\tfrac14\right)^2 = \tfrac{10}{16} = 0.625 .
$$

If $z_t$ is wrong, the check holds when exactly one of the others is wrong:
$2 \cdot \tfrac34 \cdot \tfrac14 = 0.375$. So a bit with 12 checks, of which 10
fail, is very probably wrong, and a bit whose checks almost all hold is very
probably right. Bayes's rule makes this exact: from the prior $p$ and the count of
satisfied checks, compute for each bit the probability that it is in error.

### Meier and Staffelbach's two algorithms

**Algorithm A** picks the $L$ or so bits with the most satisfied checks,
assumes they are correct, solves for the register by linear algebra, and tests
the result against the keystream, trying small corrections if needed. **Algorithm
B** is iterative: compute every bit's error probability, flip the bits that are
probably wrong, recompute, and repeat until all checks hold. It is the ancestor
of the iterative decoding used today for LDPC codes, which had been invented by
Robert Gallager in 1962 and then largely forgotten until the 1990s.

Both work when the feedback polynomial has few taps (Meier and Staffelbach
suggested fewer than about 10) and the correlation is strong enough. Their
paper gave a precise rule: the number of checks per bit must exceed a threshold
set by $p$, so a register with many taps, or a weak correlation, defeats them.
Designers took the hint: dense feedback polynomials, and no single input of $f$
correlated with the output.

### What came after

Fast correlation attacks became a field. Thomas Johansson and Fredrik Jönsson
(1999) decoded with convolutional codes; Anne Canteaut and Michaël Trabbia (2000)
used checks of weight 4 and 5 found by a birthday search, which works even for
dense feedback; Philippe Chose, Antoine Joux and Michel Mitton (2002) let a fast
Walsh-Hadamard transform score many partial guesses at once (run on §8.4, it
would score all $2^{14}$ start states of register 3 in about $14 \cdot 2^{14}$
additions). Bin Zhang, Chao Xu and Willi Meier (2015) moved the method to
correlations over $\mathrm{GF}(2^n)$ against SNOW 2.0, and Yosuke Todo, Takanori
Isobe, Willi Meier, Kazumaro Aoki and Bin Zhang (2018) turned it into the first
key-recovery attacks below brute force on the full Grain v1, Grain-128 and
Grain-128a, at costs far beyond practice.

!!! note "Life story: fast correlation attacks"
    **Born:** 1988, Willi Meier and Othmar Staffelbach (EUROCRYPT '88; *Journal
    of Cryptology*, 1989) · **Purpose:** to recover a long LFSR from a noisy
    copy of its output by decoding, without guessing its state · **Helped:**
    broke many combiners and filter generators of the 1980s and 1990s; the
    Bluetooth E0 attacks of §8.12; attacks on SNOW 2.0 and, below brute force,
    on full Grain v1 and Grain-128a (2018) · **Status:** current; the main
    statistical tool against LFSR-based ciphers, with improvements every few
    years

## 8.6 Algebraic attacks and algebraic immunity

*Level: expert.*

A filter generator with a register of $L$ cells and a filter $f$ of degree $d$
produces bits that are polynomials of degree $d$ in the $L$ unknown start bits:
the register is linear, so each filter input is a known linear function of the
start state, and $f$ of linear functions has degree at most $d$. One keystream
bit, one equation. If there are enough of them, the attacker can treat each
monomial of degree up to $d$ as a new unknown (**linearization**) and solve a
linear system with

$$
D = \sum_{i=1}^{d} \binom{L}{i}
$$

unknowns. For $L = 128$ and $d = 3$ that is about 350,000 unknowns: large, but
Gaussian elimination at $D^3 \approx 2^{55}$ steps is within reach of a big
computer, and far below $2^{128}$. The defense seems obvious: a filter of high
degree. That is where Nicolas Courtois and Willi Meier came in, at EUROCRYPT 2003.

### Low-degree multiples

Their observation: even if $f$ has high degree, there may be a function $g$ of
low degree such that $g \cdot f$ also has low degree, or is zero. Take the zero
case. If $g \cdot f = 0$ (written $g$ is an **annihilator** of $f$), then
wherever $f(x) = 1$, $g(x)$ must be 0. So every keystream bit equal to 1 gives
the equation $g(\text{state}) = 0$, of degree $\deg g$ instead of $\deg f$.
Annihilators of $1 \oplus f$ do the same for the keystream bits equal to 0.

A dramatic small case: $f = x_0 (x_1 x_2 x_3 \oplus x_4)$ has degree 4, but
$(1 \oplus x_0) \cdot f = 0$, because $x_0 (1 \oplus x_0) = 0$. Every 1 in the
keystream says $x_0 = 1$, a *linear* equation in the start state, and the cipher
falls to Gaussian elimination as quickly as a bare LFSR. The **algebraic
immunity** $\mathrm{AI}(f)$, the smallest degree of a nonzero annihilator of $f$
or of $1 \oplus f$, measures how low the attacker can go. Courtois and Meier
proved that it is never more than $\lceil n/2 \rceil$ for $n$ inputs, so a filter
with few inputs is always open to equations of low degree, whatever its degree.
Willi Meier, Enes Pasalic and Claude Carlet named the quantity in 2004.

### Code it: a report card

This program computes, for a few small functions, the four numbers of §8.3:
degree, nonlinearity, correlation immunity and algebraic immunity. The degree
comes from the ANF, computed by the Möbius transform; nonlinearity and
correlation immunity from the fast Walsh transform; and an annihilator of degree
$d$ exists exactly when a linear system, one equation per input where $f = 1$
and one unknown per monomial of degree at most $d$, has a nonzero solution.

```python
def truth_table(f, n):
    return [f([x >> i & 1 for i in range(n)]) for x in range(2**n)]

def anf(tt):
    # Moebius transform: coefficient of each monomial (monomial = bitmask of variables)
    a = tt[:]
    n = len(a).bit_length() - 1
    for i in range(n):
        for x in range(len(a)):
            if x >> i & 1:
                a[x] ^= a[x ^ (1 << i)]
    return a

def degree(tt):
    return max((bin(m).count("1") for m, c in enumerate(anf(tt)) if c), default=0)

def walsh(tt):
    # W(a) = sum over x of (-1)^(f(x) + a.x)
    w = [1 - 2 * b for b in tt]
    h = 1
    while h < len(w):
        for x in range(len(w)):
            if not x & h:
                w[x], w[x | h] = w[x] + w[x | h], w[x] - w[x | h]
        h *= 2
    return w

def nonlinearity(tt):
    return len(tt) // 2 - max(abs(v) for v in walsh(tt)) // 2

def correlation_immunity(tt):
    # largest t such that W(a) = 0 for every nonzero a of weight <= t
    w, n, t = walsh(tt), len(tt).bit_length() - 1, 0
    while t < n and all(w[a] == 0 for a in range(1, len(tt)) if bin(a).count("1") == t + 1):
        t += 1
    return t

def has_annihilator(tt, d):
    # is there a nonzero g of degree <= d with g(x) = 0 wherever tt is 1?
    # g's coefficients are unknowns; each such x gives one linear equation in them
    n = len(tt).bit_length() - 1
    mons = [m for m in range(2**n) if bin(m).count("1") <= d]
    basis = {}                              # independent equations, keyed by top bit
    for x in range(2**n):
        if tt[x]:
            r = sum(1 << i for i, m in enumerate(mons) if x & m == m)
            while r and r.bit_length() in basis:
                r ^= basis[r.bit_length()]
            if r:
                basis[r.bit_length()] = r
    return len(basis) < len(mons)           # fewer independent equations than unknowns

def algebraic_immunity(tt):
    n = len(tt).bit_length() - 1
    for d in range(1, n + 1):
        if has_annihilator(tt, d) or has_annihilator([1 - b for b in tt], d):
            return d

functions = {
    "Geffe":        (3, lambda x: x[0] if x[1] else x[2]),
    "majority":     (3, lambda x: int(x[0] + x[1] + x[2] >= 2)),
    "x0 + x1 + x2x3": (4, lambda x: x[0] ^ x[1] ^ x[2] & x[3]),
    "x0(x1x2x3 + x4)": (5, lambda x: x[0] & (x[1] & x[2] & x[3] ^ x[4])),
    "majority of 5": (5, lambda x: int(sum(x) >= 3)),
    "filter F":     (5, lambda x: x[0] ^ x[1] & x[2] ^ x[0] & x[3] & x[4] ^ x[1] & x[2] & x[3] & x[4]),
}
print(f"{'function':15} deg  NL  CI  AI")
for name, (n, f) in functions.items():
    tt = truth_table(f, n)
    print(f"{name:15} {degree(tt):3} {nonlinearity(tt):3} {correlation_immunity(tt):3} {algebraic_immunity(tt):3}")
```

It prints

```
function        deg  NL  CI  AI
Geffe             2   2   0   2
majority          2   2   0   2
x0 + x1 + x2x3    2   4   1   2
x0(x1x2x3 + x4)   4   8   0   1
majority of 5     4  10   0   3
filter F          4  10   0   2
```

Read the rows as a lesson in trade-offs. $x_0 \oplus x_1 \oplus x_2 x_3$ is
correlation immune (no single input tells you anything about the output) but has
degree 2. $x_0(x_1 x_2 x_3 \oplus x_4)$ has degree 4 and an algebraic immunity of
1: the worst possible. The majority of five inputs reaches the maximum algebraic
immunity, 3, which is why majority functions became a standard example of
optimal AI (Dalai, Maitra and Sarkar studied them in 2005), but it is not
correlation immune. The last row, filter $F$, looks strong by degree and
nonlinearity, and has annihilators of degree 2.

### Code it: the attack

Now put $F$ on a 20-cell register, read its five inputs from cells 1, 6, 9, 14
and 19, and attack. Linearizing $F$ directly would need
$\binom{20}{1} + \binom{20}{2} + \binom{20}{3} + \binom{20}{4} = 6{,}195$ unknowns
and about as many keystream bits. With the degree-2 annihilators, each keystream
bit equal to 1 gives equations of degree 2, and there are only
$20 + 190 = 210$ unknowns.

```python
import random
from itertools import combinations

def F(x):                                   # the filter: degree 4, five inputs
    return x[0] ^ x[1] & x[2] ^ x[0] & x[3] & x[4] ^ x[1] & x[2] & x[3] & x[4]

L, TAPS, INPUTS = 20, [0, 3], [1, 6, 9, 14, 19]

def state_masks(n):
    # cell i of the register at time t, as a bitmask of the 20 unknown start bits
    cells, out = [1 << i for i in range(L)], []
    for _ in range(n):
        out.append(cells[:])
        new = 0
        for t in TAPS:
            new ^= cells[t]
        cells = cells[1:] + [new]
    return out

# low-degree annihilators, found by trying every g of degree <= 2 in 5 variables
mons = [()] + [(i,) for i in range(5)] + list(combinations(range(5), 2))
def value(g, x):
    return sum(all(x[i] for i in m) for m in g) & 1
points = [[v >> i & 1 for i in range(5)] for v in range(32)]
ann = {1: [], 0: []}                        # ann[b]: g with g(x) = 0 whenever F(x) = b
for pick in range(1, 2**len(mons)):
    g = [m for i, m in enumerate(mons) if pick >> i & 1]
    for b in (0, 1):
        if all(value(g, x) == 0 for x in points if F(x) == b):
            ann[b].append(g)
print("annihilators of degree <= 2:", len(ann[1]), "for F,", len(ann[0]), "for 1 + F")

# the cipher: a secret start state, a filtered keystream
key = random.Random(8).getrandbits(L)
masks = state_masks(400)
bit = lambda m: bin(key & m).count("1") & 1
z = [F([bit(cells[p]) for p in INPUTS]) for cells in masks]

# each keystream bit gives equations of degree 2 in the start bits: linearize them
col = {}
def column(i, j):                           # one unknown per monomial x_i x_j (i = j means x_i)
    return col.setdefault((min(i, j), max(i, j)), len(col))

def equation(g, cells):
    lin = [cells[p] for p in INPUTS]        # the 5 filter inputs as linear forms
    row, const = 0, 0
    for m in g:
        if not m:
            const ^= 1
        elif len(m) == 1:
            for i in range(L):
                if lin[m[0]] >> i & 1:
                    row ^= 1 << column(i, i)
        else:
            for i in range(L):
                for j in range(L):
                    if lin[m[0]] >> i & 1 and lin[m[1]] >> j & 1:
                        row ^= 1 << column(i, j)
    return row, const

rows, used = [], 0                          # Gaussian elimination, one equation at a time
for t in range(400):
    for g in ann[z[t]]:
        m, b = equation(g, masks[t])
        for rm, rb in rows:
            if m & (rm & -rm):
                m, b = m ^ rm, b ^ rb
        if m:
            rows = [(rm ^ m, rb ^ b) if rm & (m & -m) else (rm, rb) for rm, rb in rows]
            rows.append((m, b))
    used = t + 1
    if len(rows) == L + L * (L - 1) // 2:
        break

found = 0
for m, b in rows:
    i, j = next(k for k, c in col.items() if c == (m & -m).bit_length() - 1)
    if i == j and b:
        found |= 1 << i
print("unknowns:", len(rows), " keystream bits used:", used)
print("start state recovered:", found == key)
```

It prints

```
annihilators of degree <= 2: 15 for F, 0 for 1 + F
unknowns: 210  keystream bits used: 157
start state recovered: True
```

The 15 annihilators of $F$ are the nonzero members of a 4-dimensional space, so
each 1 in the keystream gives up to four independent equations; the 0s give
none, since $1 \oplus F$ has no annihilator of degree 2. One hundred and
fifty-seven keystream bits did what direct linearization needs over 6,000 for,
and what Berlekamp-Massey, facing a linear complexity of up to 6,195, would need
over 12,000 for. The products $x_i x_j$ expand into the 210 monomials because
$x_i x_i = x_i$ over GF(2), which is why `column(i, i)` doubles as the linear
term.

### The real targets

Courtois and Meier's paper broke two real designs. **Toyocrypt**, a 128-bit
filter generator submitted to Japan's CRYPTREC evaluation, has a filter of high
degree with low-degree multiples; they reported recovering its key in about
$2^{49}$ CPU clocks from about 20 kilobytes of keystream. **LILI-128**, a
NESSIE candidate from Queensland University of Technology that clocks one
register irregularly under the control of another, fell to a related attack at
about $2^{57}$ clocks, though with far more keystream. The figures are those
stated in their paper.

At CRYPTO 2003 Courtois added **fast algebraic attacks**: find $g$ of low degree
$e$ and $h$ of higher degree $d$ with $f \cdot g = h$, and arrange the equations
so that the high-degree parts cancel across consecutive keystream bits, leaving
equations of degree $e$. Frederik Armknecht and Matthias Krause the same year
extended algebraic attacks to **combiners with memory** such as E0 (§8.12). The
defense became a design rule: filter and combining functions must have high
algebraic immunity *and* resist fast algebraic attacks, which in practice means
more inputs than the cipher designers of the 1990s used, and is one reason
modern designs add nonlinear feedback (Grain, Trivium) instead of relying on a
filter alone.

!!! note "Life story: algebraic attacks on stream ciphers"
    **Born:** 2003, Nicolas Courtois and Willi Meier (EUROCRYPT 2003), with
    Courtois's fast algebraic attacks at CRYPTO 2003 · **Purpose:** to write
    the keystream as low-degree equations in the key by multiplying the
    filter by a well-chosen function, then solve by linearization ·
    **Helped:** broke Toyocrypt and LILI-128, gave attacks on E0, and created
    algebraic immunity (2004) as a design criterion · **Status:** current; a
    required check for every LFSR-based design, and the parent of the cube
    attacks of §8.13

## 8.7 Guess-and-determine and distinguishing attacks

*Level: intermediate.*

Two more general methods complete the toolkit. Neither needs an LFSR; both work
on any cipher with the right weakness.

### Guess-and-determine

Many stream ciphers have a large state, but the relations between state and
output let a few known values force many others. A **guess-and-determine
attack** guesses a small part of the state and then **determines** the rest from
the keystream, one relation at a time; a wrong guess shows up as a
contradiction with later keystream.

A toy makes the pattern plain. Take five 8-bit words $s_0, \ldots, s_4$ (40 bits
of state), the word recurrence $s_{t+5} = s_t \oplus s_{t+2}$, and the output
$z_t = s_t + s_{t+4} \bmod 256$, which mixes XOR with ordinary addition, as
SNOW and many word-oriented designs do. By hand:

1. Guess $s_0$ and $s_1$ (16 bits).
2. $z_0 = s_0 + s_4$ gives $s_4 = z_0 - s_0$.
3. $z_1 = s_1 + s_5$ gives $s_5 = z_1 - s_1$; and $s_5 = s_0 \oplus s_2$ gives $s_2 = s_5 \oplus s_0$.
4. $z_2 = s_2 + s_6$ gives $s_6$; and $s_6 = s_1 \oplus s_3$ gives $s_3 = s_6 \oplus s_1$.
5. The whole state is known. Check it against $z_3, z_4, \ldots$.

The attack costs $2^{16}$ guesses instead of $2^{40}$. A wrong guess passes
$z_0$, $z_1$ and $z_2$ by construction, since they were used to build it, but
then fails $z_3, z_4, \ldots$, each of which it matches only by a 1-in-256
chance; a dozen keystream bytes leave only the right state standing.

The art in a real attack is choosing what to guess so that the determined part
spreads as far as possible. Jovan Golić's 1997 attack on A5/1 guessed the
contents of the registers near their clocking bits and determined the rest from
the output, for about $2^{40}$ steps against a 64-bit key. Philip Hawkes and
Gregory Rose (2002) did the same to SNOW 1.0, a word-oriented design of Patrik
Ekdahl and Thomas Johansson submitted to NESSIE, at about $2^{224}$ against a
256-bit key; Don Coppersmith, Shai Halevi and Charanjit Jutla found a
distinguisher for it the same year. Ekdahl and Johansson answered with SNOW 2.0
(2002), from which ETSI's SNOW 3G, used in 3G, 4G and 5G mobile networks, was
derived.

!!! note "Life story: SNOW 1.0"
    **Born:** 2000, Patrik Ekdahl and Thomas Johansson at Lund University, for
    the European NESSIE project · **Purpose:** a fast word-oriented stream
    cipher: an LFSR over $\mathrm{GF}(2^{32})$ feeding a small finite-state
    machine · **Broken:** 2002, by Hawkes and Rose's guess-and-determine attack
    and by Coppersmith, Halevi and Jutla's distinguisher; NESSIE chose no stream
    cipher at all · **Replaced by:** SNOW 2.0 (2002), SNOW 3G (3GPP, 2006) and
    SNOW-V (2019, for 5G)

### Distinguishing attacks

A **distinguisher** decides whether a sequence came from the cipher or from a
true random source, with an advantage clearly above zero. The usual way is to
find an event whose probability in the keystream differs from the random one.
If an event has probability $q$ for random data and $q(1 + \delta)$ in the
keystream, then after $N$ samples the counts differ by about $Nq\delta$ while the
random fluctuation is about $\sqrt{Nq}$, so the distinguisher needs

$$
N \approx \frac{c}{q\,\delta^2}
$$

samples, with $c$ a small constant (a few units) setting the error rate. For a bit
that equals 0 with probability $\tfrac12 + \varepsilon$ this is the familiar
$N \approx 1/\varepsilon^2$ (up to the constant).

Three distinguishers on RC4 show the range. Scott Fluhrer and David McGrew
(FSE 2000) found that certain pairs of consecutive output bytes appear slightly
too often, and distinguished RC4 from about $2^{30.6}$ bytes. Itsik Mantin and Adi
Shamir (FSE 2001) found that the second output byte is 0 with probability about
$2/256$ instead of $1/256$: here $q = 1/256$ and $\delta = 1$, so a few hundred
keys suffice, and book 1's [§5.5](../../book/05-Stream-Ciphers.md) measures it.
Jovan Golić (EUROCRYPT 1997) had found a weaker linear correlation in RC4's
output bits years before.

Why care about a distinguisher, when it recovers no key? Because a bias in the
keystream at a fixed position is a bias in the ciphertext whenever the
plaintext at that position is fixed. If the same secret is encrypted under many
keys, as a browser cookie is, the ciphertext values pile up on the secret. That
step from distinguisher to plaintext recovery is §8.10. In theory the step is
built into the definitions: book 1's [Chapter 17](../../book/17-Defining-Security.md)
shows that a stream cipher is secure exactly when no efficient distinguisher
exists.

## 8.8 RC4's key schedule: the Roos biases

*Level: intermediate.*

RC4, Ron Rivest's 1987 design, keeps a permutation $S$ of the 256 byte values.
Its key schedule (KSA) starts from the identity and, for $i = 0, 1, \ldots, 255$,
sets $j \leftarrow j + S[i] + K[i \bmod \ell]$ and swaps $S[i]$ and $S[j]$; the
output generator (PRGA) keeps stepping and swapping and outputs one byte per
step. Book 1's [§5.5](../../book/05-Stream-Ciphers.md) runs it by hand on 8
entries. What matters here is that one pass of 256 swaps does not mix enough,
and the key shows through the permutation it leaves behind.

In September 1995, a year after RC4's code leaked, Andrew Roos posted "A Class of
Weak Keys in the RC4 Stream Cipher" to the newsgroup sci.crypt. He made two
observations, both of which can be checked by hand.

### The permutation remembers the key

Follow the KSA for small $i$. At step $i$, the cell $S[i]$ still holds $i$ unless
an earlier swap happened to land on it, which for small $i$ is unlikely. Then

$$
j_{i+1} = j_i + S[i] + K[i] = j_i + i + K[i] ,
\qquad\text{so}\qquad
j_{i+1} = \sum_{x=0}^{i} K[x] + \frac{i(i+1)}{2} .
$$

The swap puts the old $S[j_{i+1}]$ into cell $i$, and that is likely still
$j_{i+1}$ itself, since cell $j_{i+1}$ was probably not touched before either.
Later steps move cell $i$ again only if some later $j$ lands on it, which each
of the remaining steps does with probability about $1/256$. Putting it together,

$$
\Pr\Big[S[i] = \sum_{x=0}^{i} K[x] + \tfrac{i(i+1)}{2}\Big]
\approx \left(1 - \tfrac{1}{256}\right)^{256 + i(i+1)/2} ,
$$

which is about $e^{-1} \approx 0.37$ for the first cells, falling as $i$ grows.
With the key $K = (2, 5, 1, \ldots)$ the first cells after the KSA are probably
$S[0] = 2$, $S[1] = 2 + 5 + 1 = 8$ and $S[2] = 8 + 1 + 2 = 11$. A permutation
that leaks sums of key bytes is a disaster if anything about it ever leaks into
the output.

### Weak keys

It does leak. Suppose $K[0] + K[1] \equiv 0 \pmod{256}$. Step 0 sets $j = K[0]$
and swaps $S[0]$ with $S[K[0]]$. Step 1 sets $j = K[0] + S[1] + K[1] = 1$
(provided $K[0] \ne 1$, so that $S[1]$ is still 1), and swaps $S[1]$ with itself.
Step 2 sets $j = 1 + 2 + K[2]$ and puts the value $K[2] + 3$ into $S[2]$. If cells
1 and 2 survive the rest of the KSA, the first output step has $i = 1$,
$j = S[1] = 1$, and outputs $S[S[1] + S[1]] = S[2] = K[2] + 3$. The first
keystream byte reveals a key byte, for about one key in $e^2 \approx 7$ of this
class.

### Code it

The program measures both: how often $S[i]$ equals Roos's predicted value over
20,000 random 16-byte keys, and how often a weak key's first output is
$K[2] + 3$.

```python
import random

def ksa(key):
    S, j = list(range(256)), 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    return S

def first_byte(S):
    # the first output byte: i = 1, j = S[1], swap, output S[S[1] + S[j]]
    S = S[:]
    j = S[1]
    S[1], S[j] = S[j], S[1]
    return S[(S[1] + S[j]) % 256]

rng = random.Random(1995)
trials = 20000
hits = [0] * 48
weak = weak_hits = 0
for _ in range(trials):
    key = [rng.randrange(256) for _ in range(16)]
    S = ksa(key)
    total = 0
    for i in range(48):
        total += key[i % 16]
        if S[i] == (total + i * (i + 1) // 2) % 256:
            hits[i] += 1
    # Roos's weak keys: K[0] + K[1] = 0 makes the first byte K[2] + 3 often
    key[1] = (-key[0]) % 256
    weak += 1
    weak_hits += first_byte(ksa(key)) == (key[2] + 3) % 256

for i in (0, 1, 2, 8, 16, 32, 47):
    print(f"S[{i:2}] = sum of key bytes + i(i+1)/2: {hits[i] / trials:.3f}")
print(f"random chance: {1 / 256:.3f}")
print(f"weak keys, first byte = K[2] + 3: {weak_hits / weak:.3f}")
```

It prints

```
S[ 0] = sum of key bytes + i(i+1)/2: 0.372
S[ 1] = sum of key bytes + i(i+1)/2: 0.365
S[ 2] = sum of key bytes + i(i+1)/2: 0.364
S[ 8] = sum of key bytes + i(i+1)/2: 0.307
S[16] = sum of key bytes + i(i+1)/2: 0.199
S[32] = sum of key bytes + i(i+1)/2: 0.040
S[47] = sum of key bytes + i(i+1)/2: 0.006
random chance: 0.004
weak keys, first byte = K[2] + 3: 0.131
```

The first cells match their prediction more than a third of the time, 95 times
more often than chance, and the bias has nearly faded by cell 48. Roos estimated this
probability for weak keys at about 13.8%; this run measures 13.1%, close to
it. Goutam Paul and Subhamoy Maitra proved the general form of these biases
in 2007 and showed how to reconstruct the key from the permutation the KSA
leaves.

### What it meant, and the patch that never quite came

With a random key used once, the Roos biases hurt little: the attacker never
sees $S$, and a weak key is rare. Roos himself pointed at the real danger, and
recommended discarding the first output bytes. Two later facts made the advice
urgent. First, systems that build the RC4 key by **concatenating a public value
with a secret**, so that the first key bytes are known and change from message
to message, give the attacker exactly the control the weak-key analysis needs;
that is WEP, next. Second, biases in the early output persist well beyond the
first byte, which matters wherever the same plaintext is encrypted under many
keys; that is TLS, in §8.10. Ilya Mironov's 2002 analysis of RC4 as a card
shuffle suggested discarding at least the first 512 bytes ("RC4-drop[n]").
Hardly any deployed protocol did.

## 8.9 The WEP break: FMS, Klein and PTW

*Level: intermediate.* The story, told first, is for beginners too; the method
starts at "FMS, by hand".

Go back to the old access point in the first habitat module. Each packet it
sends starts with a 24-bit IV in the clear, then the RC4 encryption of the
packet and a CRC-32 checksum under the key

$$
K = \mathit{IV}_0\ \mathit{IV}_1\ \mathit{IV}_2\ \Vert\ \mathit{secret} .
$$

Book 1's [§5.6](../../book/05-Stream-Ciphers.md) tells the story of WEP's three
mistakes: the short IV that repeats, the linear checksum that can be forged, and
the related-key weakness of RC4. This section is the third mistake in full. Its
shape is already in §8.8: the first three key bytes are known to the attacker and
different in every packet, so the attacker watches the key schedule run on
thousands of related keys whose start is public, and only the secret tail is
unknown. And the first bytes of plaintext are known too: every IP packet over
Wi-Fi begins with the same 8-byte link-layer header (`AA AA 03 00 00 00` and a
two-byte type), and the short ARP packets that every network sends have a fixed
header after it. The air-quality sensors in the habitat send small packets every
few seconds; a laptop in the corridor reads off the first bytes of keystream of
every one.

### FMS, by hand

Scott Fluhrer, Itsik Mantin and Adi Shamir presented the attack at Selected
Areas in Cryptography in Toronto in August 2001. It recovers the secret one
byte at a time. Suppose the attacker knows the key bytes before position $p$
(the three IV bytes, plus any secret bytes already found) and wants $K[p]$. For
each packet the attacker can run the first $p$ steps of the KSA, since they use
only known bytes. Take $p = 3$ and the IV $(3, 255, 7)$:

| Step $i$ | $j \leftarrow j + S[i] + K[i]$ | Effect |
|---|---|---|
| 0 | $0 + 0 + 3 = 3$ | swap $S[0], S[3]$: $S = 3, 1, 2, 0, \ldots$ |
| 1 | $3 + 1 + 255 = 259 \to 3$ | swap $S[1], S[3]$: $S = 3, 0, 2, 1, \ldots$ |
| 2 | $3 + 2 + 7 = 12$ | swap $S[2], S[12]$: $S = 3, 0, 12, 1, \ldots$ |
| 3 | $12 + S[3] + K[3] = 13 + K[3]$ | swap $S[3]$ with $S[13 + K[3]]$ |

Step 3 puts into $S[3]$ the value $S[13 + K[3]]$, which (as the cells beyond 12
are still untouched) is $13 + K[3]$ itself. Now suppose the cells 0, 1 and 3
are not disturbed by the remaining 252 steps of the KSA, which happens with
probability about $(253/256)^{252} \approx e^{-3} \approx 5\%$. The first output step
has $i = 1$, $j = S[1] = 0$, swaps $S[1]$ and $S[0]$, and outputs
$S[S[1] + S[0]] = S[3 + 0] = S[3]$. So the first keystream byte $z_1$ satisfies

$$
z_1 = 13 + K[3] \quad\Longrightarrow\quad K[3] = z_1 - 13 = S^{-1}[z_1] - j_3 - S_3[3],
$$

where the right-hand form, with $j_3 = 12$ and $S_3[3] = 1$ taken from the
partial KSA, is the general rule. The IV is useful because after step $p - 1$,
$S[1] < p$ and $S[1] + S[S[1]] = p$: FMS call such a state **resolved**. Each
resolved packet votes for one value of $K[p]$; the vote is right about 5% of
the time and spread at random otherwise, so after about 60 resolved packets the
right value has a clear lead. Then on to $K[4]$, and so on. IVs of the form
$(p, 255, x)$ are almost always resolved; many others are resolved by chance.

The trouble for the attacker is that resolved packets are rare: about one in
ten thousand random IVs, as the code below shows. The tools of 2001, AirSnort
and WEPCrack, needed millions of packets for a 104-bit key. Adam Stubblefield,
then an undergraduate intern at AT&T Labs, John Ioannidis and Aviel Rubin
implemented the attack within weeks of the paper and reported recovering a real
network's key. Many vendors then filtered out the IVs of the
form $(p, 255, x)$, which slowed FMS but not what followed.

### Klein: every packet votes

Around 2005 Andreas Klein found a correlation in RC4 that needs no special IV. In his formulation, for every key, the $i$-th output
byte $z_i$ and the value in cell $i$ are linked: $S[j] = i - z_i$ happens with
probability about $2/256$ at the moment $z_i$ is produced. Combined with the
KSA argument above, it gives the vote

$$
K[i] = S_i^{-1}[\,i - z_i\,] - j_i - S_i[i] ,
$$

computed from the partial KSA of the first $i$ steps, which is right with
probability about $1.36/256$ instead of $1/256$. A tiny edge, but every packet
votes, and it needs output byte $z_i$ for key position $i$; for a 104-bit key
that means the first 15 keystream bytes, which ARP packets supply. Klein's
paper circulated from 2006 and appeared in *Designs, Codes and Cryptography* in
2008.

### PTW: a minute for 104 bits

In April 2007 Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin at the
Technical University of Darmstadt turned Klein's correlation into "Breaking 104
bit WEP in less than 60 seconds". Two changes made the difference. First,
instead of recovering $K[3], K[4], \ldots$ in sequence, where one wrong byte ruins
everything after it, they voted directly for the sums
$\sigma_i = K[3] + K[4] + \cdots + K[3 + i]$, each of which can be attacked
independently; the key bytes are differences of the sums. Second, they ranked
candidates instead of taking only the winner, and tested the most likely keys
against a captured packet. They reported success with probability 50% from about
40,000 packets and 95% from 85,000. Since an attacker can replay a captured ARP
request and make the access point answer it over and over, those packets take
about a minute to collect. The aircrack-ng suite adopted PTW the same year, and
WEP's last excuse, that cracking it needed patience, was gone.

### Code it: the corridor laptop

The simulation below plays the access point: a 40-bit secret, a fresh random
IV per packet, ARP packets whose first 16 bytes are known. It captures 40,000
packets and runs both FMS (with the resolved test) and Klein's vote, recovering
the key one byte at a time.

```python
import random

def rc4(key, n):
    S, j = list(range(256)), 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    out, i, j = [], 0, 0
    for _ in range(n):
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(S[(S[i] + S[j]) % 256])
    return out

# the settlement's old access point: one 40-bit key, a fresh random IV per packet
rng = random.Random(1997)
secret = [rng.randrange(256) for _ in range(5)]
ARP = [0xAA, 0xAA, 0x03, 0, 0, 0, 0x08, 0x06, 0, 1, 0x08, 0, 6, 4, 0, 1]

def packet():
    iv = [rng.randrange(256) for _ in range(3)]
    body = ARP + [rng.randrange(256) for _ in range(28)]
    cipher = [p ^ k for p, k in zip(body, rc4(iv + secret, len(body)))]
    return iv, cipher

def partial(key, steps):
    # the key schedule run as far as the attacker knows the key
    S, j = list(range(256)), 0
    for i in range(steps):
        j = (j + S[i] + key[i]) % 256
        S[i], S[j] = S[j], S[i]
    return S, j

def fms(capture, known):
    p = len(known) + 3                      # key position being attacked
    votes = [0] * 256
    for iv, c in capture:
        S, j = partial(iv + known, p)
        if S[1] < p and (S[1] + S[S[1]]) % 256 == p:      # FMS "resolved" condition
            z1 = c[0] ^ ARP[0]
            votes[(S.index(z1) - j - S[p]) % 256] += 1
    return votes

def klein(capture, known):
    p = len(known) + 3
    votes = [0] * 256
    for iv, c in capture:
        S, j = partial(iv + known, p)
        zp = c[p - 1] ^ ARP[p - 1]          # output byte number p
        votes[(S.index((p - zp) % 256) - j - S[p]) % 256] += 1
    return votes

capture = [packet() for _ in range(40000)]
for name, attack in (("FMS", fms), ("Klein", klein)):
    known = []
    for _ in range(5):
        v = attack(capture, known)
        best = max(range(256), key=v.__getitem__)
        print(f"{name:5} byte {len(known)}: {sum(v):5} votes, best guess {best:3} with {v[best]:3},"
              f" true byte {secret[len(known)]:3} with {v[secret[len(known)]]:3}")
        known.append(best)
    print(name, "key:", bytes(known).hex(), "correct" if known == secret else "wrong")
```

It prints

```
FMS   byte 0:     1 votes, best guess 155 with   1, true byte 120 with   0
FMS   byte 1:     0 votes, best guess   0 with   0, true byte  34 with   0
FMS   byte 2:     3 votes, best guess  85 with   1, true byte 113 with   0
FMS   byte 3:     2 votes, best guess  43 with   1, true byte  64 with   0
FMS   byte 4:    13 votes, best guess 244 with   2, true byte 113 with   0
FMS key: 9b00552bf4 wrong
Klein byte 0: 40000 votes, best guess 120 with 206, true byte 120 with 206
Klein byte 1: 40000 votes, best guess  34 with 203, true byte  34 with 203
Klein byte 2: 40000 votes, best guess 113 with 211, true byte 113 with 211
Klein byte 3: 40000 votes, best guess  64 with 197, true byte  64 with 197
Klein byte 4: 40000 votes, best guess 113 with 225, true byte 113 with 225
Klein key: 7822714071 correct
```

Forty thousand packets gave FMS 19 resolved packets in all, a handful per key
byte where it needs dozens; it fails. Klein's vote uses every packet, and its
1.36-in-256 edge wins each byte. Figure 8.4 shows the vote for the first byte.
Once a byte is wrong, every later vote is computed with a wrong key prefix and
is noise, as in FMS's run. That error propagation is why PTW's sums matter: with
fewer packets this sequential version of Klein fails too (in trial runs, about
half the time at 30,000 packets), while PTW's ranking recovers from a weak byte.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Klein votes for the first secret WEP key byte from 40,000 packets: every wrong value gets between 123 and 192 votes, the right one, 120, gets 206" fill="currentColor" font-size="14">
<path d="M60,20V230H620" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M62.0,230V109.7h1.6V230ZM64.2,230V128.7h1.6V230ZM66.3,230V163.5h1.6V230ZM68.5,230V138.2h1.6V230ZM70.7,230V169.8h1.6V230ZM72.8,230V154.0h1.6V230ZM75.0,230V141.3h1.6V230ZM77.2,230V169.8h1.6V230ZM79.4,230V184.1h1.6V230ZM81.5,230V174.6h1.6V230ZM83.7,230V147.7h1.6V230ZM85.9,230V123.9h1.6V230ZM88.0,230V120.8h1.6V230ZM90.2,230V141.3h1.6V230ZM92.4,230V147.7h1.6V230ZM94.5,230V135.0h1.6V230ZM96.7,230V130.2h1.6V230ZM98.9,230V135.0h1.6V230ZM101.1,230V166.7h1.6V230ZM103.2,230V122.3h1.6V230ZM105.4,230V155.6h1.6V230ZM107.6,230V160.3h1.6V230ZM109.7,230V114.4h1.6V230ZM111.9,230V117.6h1.6V230ZM114.1,230V150.8h1.6V230ZM116.2,230V146.1h1.6V230ZM118.4,230V152.4h1.6V230ZM120.6,230V119.2h1.6V230ZM122.8,230V108.1h1.6V230ZM124.9,230V120.8h1.6V230ZM127.1,230V161.9h1.6V230ZM129.3,230V120.8h1.6V230ZM131.4,230V104.9h1.6V230ZM133.6,230V177.8h1.6V230ZM135.8,230V109.7h1.6V230ZM137.9,230V149.2h1.6V230ZM140.1,230V144.5h1.6V230ZM142.3,230V155.6h1.6V230ZM144.5,230V133.4h1.6V230ZM146.6,230V125.5h1.6V230ZM148.8,230V180.9h1.6V230ZM151.0,230V120.8h1.6V230ZM153.1,230V158.8h1.6V230ZM155.3,230V131.8h1.6V230ZM157.5,230V146.1h1.6V230ZM159.6,230V150.8h1.6V230ZM161.8,230V123.9h1.6V230ZM164.0,230V139.8h1.6V230ZM166.2,230V136.6h1.6V230ZM168.3,230V154.0h1.6V230ZM170.5,230V149.2h1.6V230ZM172.7,230V152.4h1.6V230ZM174.8,230V138.2h1.6V230ZM177.0,230V157.2h1.6V230ZM179.2,230V131.8h1.6V230ZM181.3,230V154.0h1.6V230ZM183.5,230V112.8h1.6V230ZM185.7,230V168.2h1.6V230ZM187.9,230V139.8h1.6V230ZM190.0,230V120.8h1.6V230ZM192.2,230V141.3h1.6V230ZM194.4,230V193.6h1.6V230ZM196.5,230V117.6h1.6V230ZM198.7,230V152.4h1.6V230ZM200.9,230V154.0h1.6V230ZM203.0,230V154.0h1.6V230ZM205.2,230V182.5h1.6V230ZM207.4,230V116.0h1.6V230ZM209.6,230V133.4h1.6V230ZM211.7,230V128.7h1.6V230ZM213.9,230V111.2h1.6V230ZM216.1,230V136.6h1.6V230ZM218.2,230V149.2h1.6V230ZM220.4,230V142.9h1.6V230ZM222.6,230V112.8h1.6V230ZM224.8,230V142.9h1.6V230ZM226.9,230V133.4h1.6V230ZM229.1,230V176.2h1.6V230ZM231.3,230V146.1h1.6V230ZM233.4,230V135.0h1.6V230ZM235.6,230V150.8h1.6V230ZM237.8,230V139.8h1.6V230ZM239.9,230V109.7h1.6V230ZM242.1,230V165.1h1.6V230ZM244.3,230V158.8h1.6V230ZM246.4,230V139.8h1.6V230ZM248.6,230V89.1h1.6V230ZM250.8,230V149.2h1.6V230ZM253.0,230V112.8h1.6V230ZM255.1,230V154.0h1.6V230ZM257.3,230V176.2h1.6V230ZM259.5,230V163.5h1.6V230ZM261.6,230V89.1h1.6V230ZM263.8,230V193.6h1.6V230ZM266.0,230V171.4h1.6V230ZM268.1,230V135.0h1.6V230ZM270.3,230V146.1h1.6V230ZM272.5,230V154.0h1.6V230ZM274.7,230V114.4h1.6V230ZM276.8,230V123.9h1.6V230ZM279.0,230V147.7h1.6V230ZM281.2,230V142.9h1.6V230ZM283.3,230V154.0h1.6V230ZM285.5,230V144.5h1.6V230ZM287.7,230V139.8h1.6V230ZM289.9,230V133.4h1.6V230ZM292.0,230V136.6h1.6V230ZM294.2,230V190.4h1.6V230ZM296.4,230V131.8h1.6V230ZM298.5,230V146.1h1.6V230ZM300.7,230V142.9h1.6V230ZM302.9,230V131.8h1.6V230ZM305.0,230V154.0h1.6V230ZM307.2,230V133.4h1.6V230ZM309.4,230V135.0h1.6V230ZM311.5,230V131.8h1.6V230ZM313.7,230V147.7h1.6V230ZM315.9,230V146.1h1.6V230ZM318.1,230V157.2h1.6V230ZM320.2,230V166.7h1.6V230ZM324.6,230V147.7h1.6V230ZM326.7,230V182.5h1.6V230ZM328.9,230V150.8h1.6V230ZM331.1,230V152.4h1.6V230ZM333.2,230V146.1h1.6V230ZM335.4,230V161.9h1.6V230ZM337.6,230V92.2h1.6V230ZM339.8,230V149.2h1.6V230ZM341.9,230V95.4h1.6V230ZM344.1,230V182.5h1.6V230ZM346.3,230V173.0h1.6V230ZM348.4,230V89.1h1.6V230ZM350.6,230V130.2h1.6V230ZM352.8,230V173.0h1.6V230ZM354.9,230V139.8h1.6V230ZM357.1,230V136.6h1.6V230ZM359.3,230V106.5h1.6V230ZM361.5,230V117.6h1.6V230ZM363.6,230V171.4h1.6V230ZM365.8,230V122.3h1.6V230ZM368.0,230V169.8h1.6V230ZM370.1,230V139.8h1.6V230ZM372.3,230V136.6h1.6V230ZM374.5,230V112.8h1.6V230ZM376.6,230V139.8h1.6V230ZM378.8,230V135.0h1.6V230ZM381.0,230V108.1h1.6V230ZM383.2,230V84.3h1.6V230ZM385.3,230V127.1h1.6V230ZM387.5,230V154.0h1.6V230ZM389.7,230V125.5h1.6V230ZM391.8,230V139.8h1.6V230ZM394.0,230V179.3h1.6V230ZM396.2,230V123.9h1.6V230ZM398.3,230V136.6h1.6V230ZM400.5,230V144.5h1.6V230ZM402.7,230V154.0h1.6V230ZM404.9,230V147.7h1.6V230ZM407.0,230V130.2h1.6V230ZM409.2,230V139.8h1.6V230ZM411.4,230V141.3h1.6V230ZM413.5,230V120.8h1.6V230ZM415.7,230V154.0h1.6V230ZM417.9,230V165.1h1.6V230ZM420.1,230V135.0h1.6V230ZM422.2,230V184.1h1.6V230ZM424.4,230V161.9h1.6V230ZM426.6,230V146.1h1.6V230ZM428.7,230V163.5h1.6V230ZM430.9,230V114.4h1.6V230ZM433.1,230V100.2h1.6V230ZM435.2,230V160.3h1.6V230ZM437.4,230V146.1h1.6V230ZM439.6,230V158.8h1.6V230ZM441.8,230V139.8h1.6V230ZM443.9,230V95.4h1.6V230ZM446.1,230V160.3h1.6V230ZM448.3,230V152.4h1.6V230ZM450.4,230V111.2h1.6V230ZM452.6,230V135.0h1.6V230ZM454.8,230V133.4h1.6V230ZM456.9,230V92.2h1.6V230ZM459.1,230V163.5h1.6V230ZM461.3,230V128.7h1.6V230ZM463.4,230V163.5h1.6V230ZM465.6,230V139.8h1.6V230ZM467.8,230V176.2h1.6V230ZM470.0,230V119.2h1.6V230ZM472.1,230V179.3h1.6V230ZM474.3,230V141.3h1.6V230ZM476.5,230V127.1h1.6V230ZM478.6,230V155.6h1.6V230ZM480.8,230V179.3h1.6V230ZM483.0,230V149.2h1.6V230ZM485.1,230V136.6h1.6V230ZM487.3,230V130.2h1.6V230ZM489.5,230V135.0h1.6V230ZM491.7,230V117.6h1.6V230ZM493.8,230V136.6h1.6V230ZM496.0,230V128.7h1.6V230ZM498.2,230V138.2h1.6V230ZM500.3,230V160.3h1.6V230ZM502.5,230V157.2h1.6V230ZM504.7,230V171.4h1.6V230ZM506.8,230V119.2h1.6V230ZM509.0,230V138.2h1.6V230ZM511.2,230V158.8h1.6V230ZM513.4,230V155.6h1.6V230ZM515.5,230V160.3h1.6V230ZM517.7,230V120.8h1.6V230ZM519.9,230V122.3h1.6V230ZM522.0,230V111.2h1.6V230ZM524.2,230V119.2h1.6V230ZM526.4,230V116.0h1.6V230ZM528.5,230V112.8h1.6V230ZM530.7,230V154.0h1.6V230ZM532.9,230V169.8h1.6V230ZM535.1,230V135.0h1.6V230ZM537.2,230V174.6h1.6V230ZM539.4,230V141.3h1.6V230ZM541.6,230V160.3h1.6V230ZM543.7,230V114.4h1.6V230ZM545.9,230V146.1h1.6V230ZM548.1,230V166.7h1.6V230ZM550.2,230V125.5h1.6V230ZM552.4,230V168.2h1.6V230ZM554.6,230V176.2h1.6V230ZM556.8,230V131.8h1.6V230ZM558.9,230V157.2h1.6V230ZM561.1,230V139.8h1.6V230ZM563.3,230V144.5h1.6V230ZM565.4,230V136.6h1.6V230ZM567.6,230V142.9h1.6V230ZM569.8,230V147.7h1.6V230ZM572.0,230V114.4h1.6V230ZM574.1,230V133.4h1.6V230ZM576.3,230V104.9h1.6V230ZM578.5,230V169.8h1.6V230ZM580.6,230V150.8h1.6V230ZM582.8,230V100.2h1.6V230ZM585.0,230V139.8h1.6V230ZM587.1,230V127.1h1.6V230ZM589.3,230V104.9h1.6V230ZM591.5,230V138.2h1.6V230ZM593.6,230V147.7h1.6V230ZM595.8,230V130.2h1.6V230ZM598.0,230V161.9h1.6V230ZM600.2,230V147.7h1.6V230ZM602.3,230V123.9h1.6V230ZM604.5,230V154.0h1.6V230ZM606.7,230V93.8h1.6V230ZM608.8,230V139.8h1.6V230ZM611.0,230V125.5h1.6V230ZM613.2,230V146.1h1.6V230ZM615.4,230V131.8h1.6V230Z" fill="currentColor" opacity="0.45"/>
<rect x="322.4" y="62.2" width="1.8" height="167.8" fill="currentColor"/>
<line x1="55" y1="230.0" x2="60" y2="230.0" stroke="currentColor"/><text x="50" y="235.0" text-anchor="end">100</text>
<line x1="55" y1="166.7" x2="60" y2="166.7" stroke="currentColor"/><text x="50" y="171.7" text-anchor="end">140</text>
<line x1="55" y1="103.3" x2="60" y2="103.3" stroke="currentColor"/><text x="50" y="108.3" text-anchor="end">180</text>
<line x1="55" y1="40.0" x2="60" y2="40.0" stroke="currentColor"/><text x="50" y="45.0" text-anchor="end">220</text>
<text x="62.8" y="250" text-anchor="middle">0</text>
<text x="201.7" y="250" text-anchor="middle">64</text>
<text x="340.6" y="250" text-anchor="middle">128</text>
<text x="479.4" y="250" text-anchor="middle">192</text>
<text x="616.1" y="250" text-anchor="middle">255</text>
<line x1="323.3" y1="58.2" x2="323.3" y2="40" stroke="currentColor"/>
<text x="329.4" y="44" font-weight="bold">120, the right byte: 206 votes</text>
<line x1="60" y1="140.9" x2="620" y2="140.9" stroke="currentColor" stroke-dasharray="4 4" opacity="0.7"/>
<text x="618" y="134.9" text-anchor="end">random level, 156</text>
<text x="340" y="274" text-anchor="middle">candidate value of the first secret key byte</text>
</svg>
<figcaption>Figure 8.4. Klein's vote for the first secret byte of the simulated WEP key, from 40,000 packets. Every wrong value collects between 123 and 192 votes around the random level of 156; the right value, 120, collects 206. More packets widen the gap.</figcaption>
</figure>

### In the real world

The theory came in a rush in 2001: Nikita Borisov, Ian Goldberg and David
Wagner's IV-reuse and checksum-forgery attacks early in the year, William
Arbaugh's keystream dictionary built by injecting packets in the spring, FMS in
August. The IEEE answered with WPA's TKIP (2003), which kept RC4 for old hardware
but mixed a fresh key for every packet, and WPA2 (2004), which uses AES. A
pseudonymous researcher, KoreK, posted further statistical attacks and the
"chopchop" packet-decryption trick in 2004, and the aircrack tools absorbed them.

The cost was real: the theft of about 45 million payment card numbers from the
retailer TJX, disclosed in 2007, began on the WEP network of a store in
Minnesota. The IEEE declared WEP deprecated in 2004, but old devices kept it:
printers, cash registers, industrial sensors and, on our imaginary Mars, the
habitat's access point. The fix there is the one used on Earth: replace the box,
or wall it off on a network of its own behind something that speaks WPA2 or
WPA3.

!!! note "Life story: the FMS attack"
    **Born:** August 2001, Scott Fluhrer (Cisco), Itsik Mantin and Adi Shamir
    (Weizmann Institute), "Weaknesses in the Key Scheduling Algorithm of RC4"
    (SAC 2001) · **Purpose:** to recover an RC4 key built as public IV plus
    secret, from the first output byte of many packets · **Helped:** made WEP a
    broken standard within weeks (Stubblefield, Ioannidis and Rubin's working
    attack; AirSnort and WEPCrack) · **Status:** superseded by Klein and PTW;
    its lesson, never derive related keys by concatenating a nonce, is part of
    every design guide

!!! note "Life story: the PTW attack"
    **Born:** 2007, Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin (TU
    Darmstadt), building on Andreas Klein's correlation (2005 to 2006) ·
    **Purpose:** to recover a 104-bit WEP key from as few packets as possible ·
    **Helped:** 50% success from about 40,000 packets, collected in about a
    minute by replaying ARP requests; in aircrack-ng from 2007 · **Status:**
    the standard WEP attack; later refinements (Sepehrdad, Vaudenay and
    Vuagnoux, 2011) lowered the packet count further

## 8.10 RC4 in TLS: from biases to plaintext

*Level: intermediate.*

TLS gives every connection a fresh, unrelated RC4 key from its key derivation,
so neither the Roos weak keys nor FMS apply. Yet RC4's early output is biased
whatever the key, and that is enough when the attacker can make the victim
encrypt the *same* secret many times. A browser does this naturally: a script on
any page the attacker controls can make it send request after request to a
target site, each over a new connection or at a fixed position in the stream,
and each carrying the same cookie. This is the **broadcast setting** that Mantin
and Shamir described in 2001.

### The idea, with the second byte

The second keystream byte is 0 with probability $2/256$. If the plaintext byte at
position 2 is the same secret $P$ in every session, the ciphertext byte is
$P \oplus z_2$, and it equals $P$ twice as often as any other value. Count the
ciphertext bytes across sessions and the most common one is the secret. By the
distinguisher formula of §8.7 with $q = 1/256$ and $\delta = 1$, a few thousand
sessions suffice.

```python
import random

def rc4(key, n):
    S, j = list(range(256)), 0
    for i in range(256):
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    out, i, j = [], 0, 0
    for _ in range(n):
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(S[(S[i] + S[j]) % 256])
    return out

# a browser sends the same request over and over, each time under a fresh 128-bit key;
# the secret cookie byte sits at position 2 of the stream
rng = random.Random(2013)
secret = ord("k")
for sessions in (1024, 4096, 16384):
    counts = [0] * 256
    for _ in range(sessions):
        key = [rng.randrange(256) for _ in range(16)]
        z = rc4(key, 2)
        counts[secret ^ z[1]] += 1          # the attacker sees only this ciphertext byte
    guess = max(range(256), key=counts.__getitem__)
    runner = sorted(counts)[-2]
    print(f"{sessions:6} sessions: most common byte {bytes([guess])} seen {counts[guess]} times"
          f" (next {runner}, expected {sessions / 256:.0f})")
```

It prints

```
  1024 sessions: most common byte b'\xa2' seen 11 times (next 10, expected 4)
  4096 sessions: most common byte b'k' seen 34 times (next 26, expected 16)
 16384 sessions: most common byte b'k' seen 144 times (next 95, expected 64)
```

At a thousand sessions the doubled count (about 8 expected) is lost among the
256 random counts; at four thousand it wins, and at sixteen thousand it wins by a
wide margin.

### The real attacks

The second byte is the strongest bias, but not the only one. In 2013 Nadhem
AlFardan, Daniel J. Bernstein, Kenneth Paterson, Bertram Poettering and Jacob
Schuldt ran RC4 on about $2^{44}$ random keys to measure the distribution of each
of the first 256 output bytes, and found biases at every position, most much
weaker than the second byte's. Their attack combines the counts at each
position with the measured distributions in a maximum-likelihood estimate. They
reported recovering bytes at the early positions reliably from about $2^{24}$ to
$2^{32}$ encryptions of the same plaintext, depending on the position and the
success rate wanted, and gave a second attack using biases between consecutive
bytes that works at any position in a long stream. A Japanese team, Takanori
Isobe, Toshihiro Ohigashi, Yuhei Watanabe and Masakatu Morii, published
broadcast attacks on RC4 independently at FSE 2013. Neither attack was fast:
they needed millions to billions of connections. But at the time about half of
all TLS traffic used RC4, partly because sites had switched to it in 2011 and
2012 to avoid the BEAST attack on CBC mode
([Chapter 10](10-Attacks-on-Modes-and-MACs.md)).

The attacks only got better, which was the title of one of them. In March 2015
Itsik Mantin, now at the security company Imperva, presented the **Bar
Mitzvah** attack at Black Hat Asia, named because it used a weakness then
thirteen years old: the "invariance weakness" from the FMS paper, a class of weak
keys (about one in $2^{24}$) under which the least significant bits of the
early state pass straight into the output. A passive attacker who sees enough
connections catches some weak keys and reads the low bits of the first 100 or so
plaintext bytes. Christina Garman, Kenneth Paterson and Thyla van der Merwe
showed the same year how to recover passwords sent early in a connection, with
about $2^{26}$ encryptions. And Mathy Vanhoef and Frank Piessens's **RC4 NOMORE**
(USENIX Security 2015) used the consecutive-byte biases of Fluhrer and McGrew
and of Mantin to recover a secure website cookie in 75 hours.

The IETF had already decided. RFC 7465, by Andrei Popov, published in
February 2015, says that TLS clients and servers must not offer or accept RC4
cipher suites. Chrome, Firefox and Microsoft's browsers turned RC4 off in early
2016. It was the end of the most widely used stream cipher of all time, by a
death of a thousand biases, none of which recovered a key.

!!! note "Life story: RC4 in TLS"
    **Born:** 1995, RC4 in Netscape's SSL, then in TLS from 1999 · **Purpose:**
    a fast cipher for the web, and from 2011 the recommended escape from BEAST
    · **Broken:** 2013, AlFardan, Bernstein, Paterson, Poettering and Schuldt,
    and Isobe and others: plaintext recovery from repeated encryptions; 2015,
    Bar Mitzvah, password recovery and RC4 NOMORE · **Retired:** RFC 7465
    (February 2015); removed from browsers in 2016 · **Replaced by:** AES-GCM
    and ChaCha20-Poly1305

## 8.11 A5/1 and A5/2: the GSM ciphers

*Level: intermediate.*

GSM, the second-generation mobile standard that by the 2000s carried the calls
of billions of people, encrypted the radio link between phone and base station
with a stream cipher chosen in the late 1980s and kept secret. The strong
version, **A5/1**, was for Europe and allied countries; a weaker export version,
**A5/2**, for the rest. Each call frame of 4.6 milliseconds gets 114 bits of
keystream in each direction, generated from the 64-bit session key $K_c$ and
the 22-bit public frame number. Book 1's [§5.4](../../book/05-Stream-Ciphers.md)
draws A5/1 and summarizes its fall. Here is the fall in detail.

### A5/1

A5/1 has three LFSRs of 19, 22 and 23 cells, 64 bits in all. Each has one
**clocking bit** near its middle; at each step the majority of the three clocking
bits is computed, and only the registers whose clocking bit agrees with the
majority step, so two or three registers move each time. The output is the XOR
of the three registers' last bits. Setup XORs $K_c$ into the registers bit by bit
with regular clocking, then the frame number the same way, then runs 100
majority-clocked steps with no output, and then produces 228 bits.

Ross Anderson posted a near-correct description to Usenet in 1994; Marc
Briceno, Ian Goldberg and David Wagner reverse-engineered the exact algorithms
from a phone in 1999. The attacks on A5/1 came in three waves.

**Guess-and-determine and trade-offs (1997 to 2000).** Jovan Golić's 1997 attack
(§8.7) guessed enough bits of the registers to determine the clocking, and solved
the rest as linear equations, at around $2^{40}$ steps. He also observed that the
64-bit state makes a time-memory trade-off possible. Alex Biryukov, Adi Shamir and
David Wagner made it real at FSE 2000 in "Real Time Cryptanalysis of A5/1 on a
PC". Their attack looks for keystream windows that start with a particular 16-bit
pattern, precomputes only the states that produce such windows (the irregular
clocking lets those states be enumerated directly), and stores them on disk.
With a $2^{48}$-step precomputation and about 150 gigabytes of storage (two 73 GB
disks, in 2000), one version found the key in about one second from the
keystream of two minutes of conversation; another needed only two seconds of
keystream and took several minutes. Eli Biham and Orr Dunkelman gave another
trade-off the same year.

**Correlation attacks (2003 to 2005).** Because the key and frame number are
loaded linearly, different frames' states are linearly related; Patrik Ekdahl
and Thomas Johansson (2003) built a correlation attack on that, needing a few
minutes of known keystream, later improved by Alexander Maximov, Johansson and
Steve Babbage (2004) and by Elad Barkan and Eli Biham (2005).

**Public tables (2009 to 2010).** The trade-offs needed precomputation nobody
outside a government had done in public. In August 2009 Karsten Nohl announced
the A5/1 Security Project, which computed the tables with graphics cards and
volunteers' machines and released them in 2010, about two terabytes in all, with
Frank Stevenson's Kraken program to search them. They combined distinguished
points with rainbow-style round functions, the methods of
[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md). GSM sends predictable
control messages at the start of a call, encrypted, so a few frames of known
keystream are always available, and with the tables a PC recovers $K_c$ in
minutes. Documents published by journalists in 2013 reported that the US
National Security Agency could process A5/1-encrypted calls routinely; how it
did so has not been made public.

### A5/2: weak by design

A5/2 adds a fourth register, R4 of 17 cells, whose bits decide how the other
three step, and makes each register's output nonlinear: a majority function of
three of its cells. It looks more complex than A5/1. It is far weaker, and
the weakness has exactly the shape of §8.6. Guess R4's 16 unknown bits (one bit
is forced to 1 at setup). Now the clocking of the other three registers is known
for every step, so every output bit is a quadratic function of their 61 unknown
start bits (three are forced). Linearize: about 650 unknowns, one equation per
keystream bit. Ian Goldberg, David Wagner and Lucky Green announced a real-time
attack at the CRYPTO '99 rump session, about a month after the algorithms were
published, at a cost of about $2^{16}$ operations.

In 2003 Elad Barkan, Eli Biham and Nathan Keller made it worse. GSM applies
error-correcting coding **before** encryption, so the plaintext has known linear
redundancy; XOR in the keystream and the ciphertext still satisfies linear
relations that involve only keystream. That makes the attack **ciphertext-only**:
A5/2 fell in under a second on a PC from a few dozen milliseconds of an encrypted
call. And because GSM uses the same $K_c$ whichever cipher the network asks for,
an active attacker posing as a base station could ask the phone to use A5/2, read
off $K_c$, and then decrypt the user's A5/1 calls under that same key. That
mattered for everyone, not only the users of A5/2. The standards bodies withdrew
A5/2 from 2006, and handsets dropped it from about 2007.

A5/2 is the clearest example of a cipher deliberately weakened for export, in
this case by the designers working to export rules of the time; the details of
who decided what remain unpublished. It has a sibling: in 2021 Christof Beierle
and colleagues showed that GEA-1, the GPRS data cipher of the same era, has a
64-bit key but an initialization that leaves only $2^{40}$ joint states for two
of its registers, a property they judged very unlikely to occur by chance.

!!! note "Life story: A5/2"
    **Born:** late 1980s to early 1990s, for GSM handsets sold outside the
    countries allowed A5/1 · **Purpose:** an export-grade cipher for mobile
    calls · **Broken:** 1999, at once (Goldberg, Wagner and Green, about
    $2^{16}$ work); 2003, ciphertext-only and in under a second (Barkan, Biham
    and Keller), with an active attack that also exposed A5/1 keys ·
    **Retired:** withdrawn by the standards bodies from 2006 · **Replaced
    by:** A5/1 for a time, then A5/3 (KASUMI) and the 3G and 4G ciphers

!!! note "Life story: the A5/1 tables"
    **Born:** 2009, the A5/1 Security Project led by Karsten Nohl, after the
    trade-offs of Golić (1997) and Biryukov, Shamir and Wagner (2000) ·
    **Purpose:** to show in public that GSM calls could be decrypted with
    ordinary equipment · **Helped:** about two terabytes of tables released in
    2010, searched by Frank Stevenson's Kraken; with cheap open-source phone
    software, made passive GSM interception a hobbyist's project ·
    **Status:** A5/1 remains on 2G networks where they still run; 3G and later
    networks use KASUMI, SNOW 3G, AES and ZUC

## 8.12 Bluetooth's E0 and conditional correlation

*Level: expert.*

Bluetooth Classic, from its first specification in 1999, encrypts with **E0**:
four LFSRs of 25, 31, 33 and 39 cells (128 bits in all) combined by a
**summation combiner with memory**. At each step the four output bits are added
as integers, giving 0 to 4; the sum, together with a 4-bit memory, sets the next
memory value; and the keystream bit is the XOR of the four register bits with
one bit of the memory. The design descends from Rainer Rueppel's summation
generator of 1985, which adds sequences with carry precisely to defeat
Siegenthaler: a combiner with memory can be correlation immune of the highest
order and still have high degree, escaping the trade-off of §8.3.

It does not escape correlation altogether. Willi Meier and Othmar Staffelbach
(1992) and Jovan Golić (1996) showed that a combiner with $k$ bits of memory
has correlations between the output and **linear combinations of input bits at
several consecutive times**, because the memory cannot hide everything for long.
For E0, the XOR of the keystream bits at five consecutive times is correlated
with the XOR of corresponding register bits, with a bias of about $2^{-4}$ or so
for the best combinations. That opens fast correlation attacks on the
combination of all four registers.

E0 is used in two levels. The first level runs from the link key, the device
address and the clock, and its output reloads the registers for the second
level, which encrypts one frame of at most 2,745 bits. Each frame starts afresh,
so the attacker has many short keystreams instead of one long one. The attacks
grew to fit:

- Scott Fluhrer and Stefan Lucks (2001) gave a guess-and-determine attack,
  Frederik Armknecht and Matthias Krause (2003) an algebraic one, and Yi Lu and
  Serge Vaudenay (2004) faster correlation attacks, all far from practical.
- Yi Lu, Willi Meier and Serge Vaudenay (CRYPTO 2005) introduced the
  **conditional correlation attack**: the correlation of the output with the
  inputs is much stronger when conditioned on certain known patterns of the
  output or of public values, so the attacker sorts the data by condition and
  uses only the strong part. They reported recovering the encryption key from
  the first 24 bits of about $2^{23.8}$ frames with about $2^{38}$ computations,
  the first practical attack on E0 as used.

The phrase "as used" matters. $2^{23.8}$ frames is many hours of a link's traffic,
with known plaintext, so the attack was never a tool for eavesdropping on a
headset. The practical blow to Bluetooth Classic came instead from its
protocol. In 2019 Daniele Antonioli, Nils Ole Tippenhauer and Kasper Rasmussen
published **KNOB** (Key Negotiation of Bluetooth): the specification let the two
devices agree on an encryption key with as little as one byte of entropy, the
negotiation was neither authenticated nor encrypted, and an attacker in radio
range could force one byte and then search all 256 keys. The Bluetooth SIG
responded by recommending a minimum of seven bytes. Bluetooth's "Secure
Connections" mode, added for Classic in version 4.1 (2013), replaces E0 with
AES-CCM, and Bluetooth Low Energy has always used AES-CCM.

!!! note "Life story: the conditional correlation attack on E0"
    **Born:** 2005, Yi Lu, Willi Meier and Serge Vaudenay (CRYPTO 2005), after
    Lu and Vaudenay's 2004 correlation attacks · **Purpose:** to break E0 as
    Bluetooth uses it, with short frames and frequent reinitialization ·
    **Helped:** key recovery from about $2^{23.8}$ frames and $2^{38}$ work, the
    first practical attack on two-level E0; the idea of conditioning a
    correlation on observable events spread to other ciphers · **Status:**
    E0 remains in legacy Bluetooth Classic links; new links use AES-CCM

## 8.13 Cube attacks on reduced Trivium

*Level: expert.*

The newest family of attacks in this chapter treats the cipher as a black box
that the attacker can query with chosen IVs. Fix the key. The first keystream bit
is some polynomial $p(v, x)$ over GF(2) in the public IV bits $v$ and the secret
key bits $x$. Nobody can write it down for a real cipher: after enough
initialization rounds it has astronomically many terms. But the attacker can
**evaluate** it, for the secret key and any IV, by asking for the first keystream
bit. Itai Dinur and Adi Shamir showed at EUROCRYPT 2009 that sums of these
evaluations reveal low-degree pieces of $p$.

### Cubes and superpolys

Pick a set $I$ of IV bits, a **cube**, and write $t_I$ for their product. Any
polynomial can be split as

$$
p(v, x) = t_I \cdot p_{S(I)}(v, x) \oplus q(v, x),
$$

where no term of $q$ contains all the variables of $I$ and $p_{S(I)}$, the
**superpoly**, does not contain them at all. Now sum $p$ over all $2^{|I|}$
settings of the cube's variables, with the other IV bits fixed (say to 0). Each
term of $q$ misses some cube variable, so it appears an even number of times and
cancels. The term $t_I \cdot p_{S(I)}$ is nonzero only when every cube variable is 1,
which happens once. So

$$
\bigoplus_{v_I \in \{0,1\}^{|I|}} p(v, x) = p_{S(I)}(x) .
$$

If the cube's size is just one less than the degree of $p$, the superpoly is
**linear** in the key. Such a cube is a **maxterm**, and each one turns $2^{|I|}$
chosen-IV queries into one linear equation in the key bits.

The attack has two phases. In **preprocessing**, the attacker, who knows the
cipher's specification, picks candidate cubes, computes their superpolys with
keys of his own choosing, and keeps the ones that pass a linearity test:
$p_S(a) \oplus p_S(b) = p_S(a \oplus b) \oplus p_S(0)$ for random $a, b$. The
coefficients of a linear superpoly come from its value at 0 and at each unit
vector. In the **online** phase, the attacker queries the real device over each
kept cube, gets one bit per cube, and solves the linear system for the key.

### By hand, then in code

The toy cipher's first output bit is this polynomial in IV bits
$v_0 \ldots v_3$ and key bits $x_0 \ldots x_3$, of degree 4:

$$
\begin{aligned}
p ={}& v_0 v_1 (x_0 \oplus x_2 \oplus 1) \oplus v_0 v_2 (x_1 \oplus x_3) \oplus v_1 v_2 (x_0 \oplus x_1)
\oplus v_1 v_3 x_2 \oplus v_2 v_3 x_0 x_1 \\
&\oplus v_0 x_1 x_2 x_3 \oplus v_3 x_0 x_3 \oplus x_0 x_2 \oplus v_1 \oplus x_3 .
\end{aligned}
$$

Take the cube $\{v_0, v_1\}$ with $v_2 = v_3 = 0$, and write $A = x_0 x_2 \oplus x_3$.
The four corners are

| $(v_0, v_1)$ | $p$ |
|---|---|
| (0, 0) | $A$ |
| (1, 0) | $x_1 x_2 x_3 \oplus A$ |
| (0, 1) | $1 \oplus A$ |
| (1, 1) | $(x_0 \oplus x_2 \oplus 1) \oplus x_1 x_2 x_3 \oplus 1 \oplus A$ |

The XOR of the four: $A$ appears four times, $x_1 x_2 x_3$ twice and $1$ twice,
all cancel, and what is left is $x_0 \oplus x_2 \oplus 1$, the superpoly, exactly
as the formula says. Figure 8.5 draws it.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The cube v0 v1 drawn as a square with four corners; the XOR of p at the four corners cancels every term except the superpoly x0 + x2 + 1" fill="currentColor" font-size="14">
<rect x="80" y="50" width="160" height="140" fill="currentColor" opacity="0.08"/>
<rect x="80" y="50" width="160" height="140" fill="none" stroke="currentColor" stroke-width="1.4"/>
<circle cx="80" cy="190" r="5" fill="currentColor"/>
<circle cx="240" cy="190" r="5" fill="currentColor"/>
<circle cx="80" cy="50" r="5" fill="currentColor"/>
<circle cx="240" cy="50" r="5" fill="currentColor"/>
<text x="70" y="215" text-anchor="middle">(0,0)</text>
<text x="250" y="215" text-anchor="middle">(1,0)</text>
<text x="70" y="35" text-anchor="middle">(0,1)</text>
<text x="250" y="35" text-anchor="middle">(1,1)</text>
<text x="160" y="240" text-anchor="middle">v0 →</text>
<text x="40" y="125" text-anchor="middle">v1 ↑</text>
<text x="160" y="116" text-anchor="middle">query p at</text>
<text x="160" y="134" text-anchor="middle">all 4 corners</text>
<line x1="270" y1="120" x2="350" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="358,120 350,116 350,124" fill="currentColor"/>
<text x="314" y="108" text-anchor="middle">XOR</text>
<rect x="370" y="60" width="250" height="120" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="495" y="88" text-anchor="middle" opacity="0.7">A four times: cancels</text>
<text x="495" y="108" text-anchor="middle" opacity="0.7">x1x2x3 twice, 1 twice: cancel</text>
<text x="495" y="140" text-anchor="middle" font-weight="bold">superpoly: x0 + x2 + 1</text>
<text x="495" y="162" text-anchor="middle">one linear equation in the key</text>
</svg>
<figcaption>Figure 8.5. The cube {v0, v1} of the toy polynomial. Summing the cipher's output over the four corners, with the key fixed and the other IV bits 0, cancels every term that lacks v0 or v1 and leaves the superpoly, here linear in the key.</figcaption>
</figure>

The code plays both phases. The attacker's preprocessing tries every cube of
size 1 to 3, keeps the linear superpolys that involve the key, and prints them;
the online phase then queries the "device" with its secret key and solves.

```python
import random
from itertools import combinations, product

def p(v, x):
    # the toy cipher's first output bit: public IV bits v, secret key bits x (degree 4)
    return (v[0] & v[1] & (x[0] ^ x[2] ^ 1) ^ v[0] & v[2] & (x[1] ^ x[3])
            ^ v[1] & v[2] & (x[0] ^ x[1]) ^ v[1] & v[3] & x[2] ^ v[2] & v[3] & x[0] & x[1]
            ^ v[0] & x[1] & x[2] & x[3] ^ v[3] & x[0] & x[3] ^ x[0] & x[2] ^ v[1] ^ x[3])

def cube_sum(cube, x):
    # XOR of p over all 2^k settings of the cube's IV bits, the other IV bits 0
    total = 0
    for bits in product((0, 1), repeat=len(cube)):
        v = [0, 0, 0, 0]
        for i, b in zip(cube, bits):
            v[i] = b
        total ^= p(v, x)
    return total

# preprocessing: the attacker knows the cipher and may choose keys
rng = random.Random(9)
equations = []
for k in (1, 2, 3):
    for cube in combinations(range(4), k):
        sp = lambda x: cube_sum(cube, x)
        zero = [0, 0, 0, 0]
        rand = lambda: [rng.randrange(2) for _ in range(4)]
        linear = True
        for _ in range(20):                 # linearity test: sp(a) + sp(b) = sp(a + b) + sp(0)
            a, b = rand(), rand()
            if sp(a) ^ sp(b) ^ sp([s ^ t for s, t in zip(a, b)]) ^ sp(zero):
                linear = False
        if not linear:
            continue
        const = sp(zero)
        coef = [sp([int(i == j) for i in range(4)]) ^ const for j in range(4)]
        if any(coef):
            terms = " + ".join(f"x{j}" for j in range(4) if coef[j]) + (" + 1" if const else "")
            print("cube", ["v%d" % i for i in cube], "superpoly", terms)
            equations.append((cube, coef, const))

# online: the key is secret; the attacker only chooses IVs and sees the output bit
secret = [1, 0, 1, 1]
rows = []
for cube, coef, const in equations:
    rows.append((coef, cube_sum(cube, secret) ^ const))   # coef . x = observed sum + const
queries = sum(2 ** len(c) for c, _, _ in equations)
key = [x for x in product((0, 1), repeat=4)
       if all(sum(c * b for c, b in zip(coef, x)) % 2 == rhs for coef, rhs in rows)]
print("keys that fit:", key, "after", queries, "chosen-IV queries")
```

It prints

```
cube ['v0', 'v1'] superpoly x0 + x2 + 1
cube ['v0', 'v2'] superpoly x1 + x3
cube ['v1', 'v2'] superpoly x0 + x1
cube ['v1', 'v3'] superpoly x2
keys that fit: [(1, 0, 1, 1)] after 16 chosen-IV queries
```

The cubes $\{v_0\}$ and $\{v_3\}$ were thrown out because their superpolys
($x_1 x_2 x_3$ and $x_0 x_3$) failed the linearity test, $\{v_2, v_3\}$ because
its superpoly is $x_0 x_1$, and $\{v_1\}$ because its superpoly is the constant 1,
which says nothing about the key. Four linear equations in four unknowns leave
one key; with four unknowns the code simply tries all 16 keys, where a real
attack would use Gaussian elimination. The attacker never looked at the formula
for $p$: the preprocessing used only the ability to run the cipher.

### Trivium

**Trivium**, designed by Christophe De Cannière and Bart Preneel in 2005 and
chosen for eSTREAM's hardware portfolio, has an 80-bit key, an 80-bit IV and 288
bits of state in three nonlinear shift registers of 93, 84 and 111 cells. Each
step uses only XORs and three ANDs, so the degree of the state bits in the key
and IV grows slowly, and the designers run 1,152 initialization steps before any output. Cube attacks ask how much of
that is needed.

Dinur and Shamir's 2009 paper recovered the key of Trivium reduced to 672
initialization rounds with about $2^{19}$ bit operations, to 735 rounds with about
$2^{30}$, and to 767 rounds with about $2^{45}$.
Michael Vielhaber had published a closely related method, which he called AIDA,
in 2007, and the two sides disputed how much the cube attack added; the
generality of the black-box formulation and its preprocessing is Dinur and
Shamir's. Cube testers (Aumasson, Dinur, Meier and Shamir, 2009) use the same
sums to find nonrandom behavior without recovering a key, and dynamic cube
attacks (Dinur and Shamir, 2011) set some IV bits as functions of others to kill
troublesome terms; with dedicated hardware they broke full Grain-128 for a
fraction of the keys.

From 2017, Yosuke Todo, Takanori Isobe, Yonglin Hao and Willi Meier used the
**division property**, a way of tracking which monomials can appear, with
mixed-integer linear programming to find cubes whose superpolys are provably
small, and pushed key recovery on Trivium to 832 rounds and, in later papers by
several groups, to around 840 to 850 rounds; the exact record depends on how
one counts attacks that recover only part of the key. Some superpolys claimed in
earlier papers turned out on exact computation to be constant, which is why the
recent work computes them exactly. Full Trivium, with 1,152 rounds, is unbroken:
a margin of about 300 rounds, a quarter of the total.

!!! note "Life story: the cube attack"
    **Born:** 2008 to 2009, Itai Dinur and Adi Shamir (Weizmann Institute),
    "Cube Attacks on Tweakable Black Box Polynomials" (EUROCRYPT 2009), with
    Michael Vielhaber's AIDA (2007) as a disputed precursor · **Purpose:** to
    find linear equations in the key by summing a cipher's output over chosen
    IVs, without knowing its polynomial · **Helped:** key recovery on Trivium
    reduced to 767 rounds (2009) and, with the division property, to about 840
    rounds and more; cube testers and dynamic cube attacks on Grain-128 ·
    **Status:** current; the standard measure of how many initialization
    rounds a low-degree stream cipher needs

## 8.14 The lesson for modern design

*Level: intermediate.*

By 2004 the record was bleak. Of the six stream ciphers submitted to the
European NESSIE project (2000 to 2003), every one showed a weakness, and NESSIE
recommended none. RC4 was everywhere and visibly biased; A5/1, A5/2 and E0 were
broken; LFSR combiners and filters had lost to correlation and algebra. The
ECRYPT network answered with **eSTREAM**, an open competition announced in
November 2004 that received 34 designs. After three phases of public analysis,
in April 2008 it chose a portfolio of eight in two profiles: for software,
HC-128, Rabbit, Salsa20/12 and SOSEMANUK; for hardware, Grain v1, MICKEY 2.0,
Trivium and F-FCSR-H. Within months Martin Hell and Thomas Johansson broke
F-FCSR-H, and the September 2008 revision removed it, leaving seven. The
competition worked as intended: the analysis came before the deployment.

What the survivors, and the ciphers that came after, have in common is a list
of rules written by the attacks of this chapter.

- **No bare linearity.** Berlekamp-Massey and algebraic attacks punish any
  output that is a low-degree function of a linear state. Grain and Trivium use
  **nonlinear** feedback; SNOW 3G and ZUC put a nonlinear finite-state machine
  between their word-oriented LFSRs and the output; Salsa20 and ChaCha20 have
  no LFSR at all, only additions, rotations and XORs (ARX).
- **A big state.** The trade-offs that broke A5/1 work on any generator whose
  state is not much larger than its key. Since Babbage and Golić, the rule is a
  state at least twice the security level: Trivium has 288 bits for an 80-bit
  key, ChaCha20 512 for a 256-bit key.
- **A real key and IV setup.** WEP showed what happens when the nonce is glued
  onto the key; cube attacks showed that too few initialization rounds leave
  low-degree dependence on the IV. Modern ciphers mix key and IV thoroughly
  before the first output (Trivium's 1,152 steps; ChaCha20's 20 rounds per
  block), and treat each (key, nonce) pair as a fresh instance.
- **No output before mixing.** RC4's biases sit in its first bytes. Every
  modern design produces nothing until the state is mixed, and is analyzed for
  biases at every output position.
- **A margin, measured.** A design is published with an account of the best
  attacks on reduced versions, and the full version must be well beyond them.

**ChaCha20's margin** is the clearest example. Daniel J. Bernstein designed
Salsa20 in 2005 and ChaCha in 2008. The main tool against them is a
differential-linear method: flip a bit of the nonce or counter, find an output
bit after a few rounds that is still biased, and guess part of the key while
treating the bits that hardly matter as "probabilistic neutral". Jean-Philippe
Aumasson, Simon Fischer, Shahram Khazaei, Willi Meier and Christian Rechberger
(FSE 2008) used it on 8 rounds of Salsa20 and 7 rounds of ChaCha, and later
papers have lowered the cost on 7 rounds of ChaCha step by step, from about
$2^{248}$ in 2008 to about $2^{207}$ in 2023, with a 2025 paper claiming a much
larger drop (papers differ in
what they count, so the exact record should be checked against the current
literature). No attack reaches 8 rounds. ChaCha20 runs 20, so the margin is 13
rounds, nearly two thirds of the cipher. Aumasson argued in 2019, in "Too Much
Crypto", that this is more than needed and that 8 rounds would be safe; the
standards (RFC 8439 for ChaCha20-Poly1305, and TLS 1.3 in RFC 8446) keep 20.

The comparison with RC4 is the moral. RC4 spread before any public analysis,
had no margin and no rounds to add; when the biases came, the only fix was to
remove it. ChaCha20 arrived with a public analysis and a margin two decades of
attacks have barely touched. AES in counter mode, the other way to make a
keystream ([Chapter 10](10-Attacks-on-Modes-and-MACs.md) attacks the modes),
follows the same pattern: 10 rounds against a best attack on 7. The habitat's
replacement access point will most likely speak WPA3 and encrypt with AES; the
stream ciphers in wide use today are ChaCha20 in software and SNOW 3G and ZUC
in phones.

!!! note "Life story: eSTREAM"
    **Born:** November 2004, the ECRYPT Network of Excellence, after NESSIE
    found no stream cipher to recommend · **Purpose:** to find stream ciphers
    for fast software and for small hardware through open competition and
    analysis · **Helped:** a portfolio of eight in April 2008 (seven after
    F-FCSR-H fell that year): HC-128, Rabbit, Salsa20/12 and SOSEMANUK;
    Grain v1, MICKEY 2.0 and Trivium; through Salsa20, the path to ChaCha20 ·
    **Status:** finished in 2008, with portfolio reviews afterwards; Trivium
    and Grain went into ISO/IEC 29192-3, and Grain-128AEAD was a finalist of
    NIST's lightweight cryptography competition

## 8.15 Going deeper

*Level: expert.*

**Data, time and memory.** For a stream cipher the attacker usually has many
windows of keystream, and any one of them that matches a precomputed state is
enough. Steve Babbage (1995) and Jovan Golić (1997) gave the trade-off
$TM = N$, $P = M$, $D = T$ for a state space of size $N$, with $D$ the number of
data windows; Alex Biryukov and Adi Shamir (ASIACRYPT 2000) combined it with
Hellman's tables to get the curve $T M^2 D^2 = N^2$ for $D^2 \le T$. With
$N = 2^{64}$, as in A5/1, the point $T = M = 2^{32}$ with $D = 2^{16}$ windows
lies on the curve, which is why a 64-bit state would be fatal even behind a
longer key.
[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md)
derives the Hellman and rainbow costs that sit underneath.

**Correlation attacks as decoding, with a bound.** Recovering an $L$-bit
register from $N$ bits seen through a binary symmetric channel with error
probability $p$ is decoding a random-looking linear code of rate $L/N$. Shannon's
channel coding theorem says it is possible only if $L/N$ is below the channel's
capacity $1 - h(p)$, with $h$ the binary entropy, and with maximum-likelihood
decoding (the exhaustive search of §8.4) that is achievable. For small
correlations $\varepsilon$, $1 - h(\tfrac12 - \varepsilon) \approx 2\varepsilon^2/\ln 2$, so
$N \gtrsim L \ln 2 / (2 \varepsilon^2)$: the same formula as §8.4, from a
different direction. Fast correlation attacks pay more data, or more
precomputation of checks, to avoid the $2^L$ decoding cost.

**Algebraic attacks without linearization.** Linearization needs as many
equations as monomials. When there are fewer, the attacker can multiply the
equations by monomials to make more (the XL algorithm of Courtois, Klimov,
Patarin and Shamir, 2000), compute a Gröbner basis (Faugère's F4 and F5), or
hand the equations to a SAT solver. Mate Soos, Karsten Nohl and Claude
Castelluccia's CryptoMiniSat (2009) solved reduced Trivium and Bivium instances
this way, and SAT-based attacks were part of the 2008 break of Crypto-1, the
48-bit LFSR filter generator in NXP's MIFARE Classic transport cards, by Flavio
Garcia, Gerhard de Koning Gans, Ruben Muijrers, Peter van Rossum, Roel Verdult,
Ronny Wichers Schreur and Bart Jacobs at Nijmegen, after Karsten Nohl, David
Evans, Starbug and Henryk Plötz reverse-engineered the chip. Crypto-1's filter
had inputs from only 20 cells and the card's random numbers had only 16 bits of
entropy: a museum of the mistakes of this chapter in one product.

**What is still open.** No known method recovers the key of full Trivium, Grain
v1, Grain-128AEAD, SNOW 3G, ZUC or ChaCha20 faster than brute force in a way that
matters (the 2018 fast correlation attacks on full Grain v1 and Grain-128a stay
far above practical costs, and Grain-128AEAD was redesigned against them).
The interesting open questions are about margins: how far division-property cube
attacks can go on Trivium, whether SNOW-V and ZUC-256 for 5G and 6G networks
hold their 256-bit claims, and whether ChaCha's 8-round wall moves.

## Check yourself

??? question "1. An attacker sees 100 bits of keystream from a single LFSR of unknown length and taps, at most 40 cells. Can they predict the rest?"

    Yes. Berlekamp-Massey needs $2L = 80$ bits to find any register of up to 40
    cells; 100 bits are more than enough. It returns the taps and the state, and
    the register runs forward from there.

??? question "2. Three LFSRs of 7, 11 and 13 cells (primitive feedback) are combined as $z = x_1 x_2 \oplus x_2 x_3 \oplus x_3$. What is the linear complexity, and is the generator secure?"

    By Key's formula, $7 \cdot 11 + 11 \cdot 13 + 13 = 77 + 143 + 13 = 233$, so
    Berlekamp-Massey needs 466 bits. It is still insecure: the output agrees with
    $x_1$ and $x_3$ three times in four, so Siegenthaler's attack recovers them
    with $2^7 + 2^{13}$ guesses, and register 2 follows by linear algebra.

??? question "3. A combining function agrees with input $x_2$ with probability 0.53. Roughly how many keystream bits does a correlation attack on a 30-cell register 2 need?"

    $\varepsilon = 0.03$, so $N \approx L \ln 2 / (2\varepsilon^2) = 30 \cdot 0.693 / 0.0018 \approx 11{,}600$
    bits, a few times that for a safe margin, so a few tens of thousands of bits,
    plus the work of $2^{30}$ guesses, or far less with a fast correlation
    attack if the feedback has few taps.

??? question "4. In a fast correlation attack with error probability $p = 0.1$, what is the probability that a weight-3 parity check containing a correct bit holds? And one containing a wrong bit?"

    The check holds if the other two bits are both right or both wrong. For a
    correct bit: $0.9^2 + 0.1^2 = 0.82$. For a wrong bit: the other two must have
    exactly one error, $2 \cdot 0.9 \cdot 0.1 = 0.18$.

??? question "5. Why does $f = x_0 (x_1 x_2 x_3 \oplus x_4)$ make a filter generator as weak as a bare LFSR, despite having degree 4?"

    $(1 \oplus x_0) \cdot f = 0$, so $1 \oplus x_0$ is an annihilator of degree 1.
    Every keystream bit equal to 1 tells the attacker that the filter input
    $x_0$, a known linear function of the start state, is 1. Enough such linear
    equations give the state by Gaussian elimination. The algebraic immunity is
    1, whatever the degree.

??? question "6. In the guess-and-determine toy of §8.7, why does a wrong guess of $s_0, s_1$ survive the first three keystream bytes, and how many more bytes rule it out?"

    The guess is completed using $z_0$, $z_1$ and $z_2$, so the state it builds
    matches those three bytes by construction. Each later byte matches by chance
    with probability $1/256$, so with $2^{16}$ guesses, three or four more bytes
    already make a false survivor unlikely ($2^{16} \cdot 2^{-32}$), and nine
    make it essentially impossible.

??? question "7. Why does the FMS attack need IVs that leave the state 'resolved', while Klein's attack uses every packet?"

    FMS relies on three cells, 0, 1 and $p$, surviving the rest of the key
    schedule so that the first output byte is the value placed at step $p$; that
    needs $S[1] < p$ and $S[1] + S[S[1]] = p$ after the known steps, which only a
    few IVs give. Klein's correlation between $z_i$ and $S[i]$ holds, with a
    smaller edge (about 1.36/256 instead of 5%), for any key, so every packet
    votes.

??? question "8. In the broadcast attack on RC4, about how many sessions are needed to read the byte at position 2, and why does position 1 need far more?"

    The second byte has $q = 1/256$ and $\delta = 1$ (zero appears twice as
    often), so $N \approx c \cdot 256$ with $c$ around 10 to 20 to beat 255 rivals: a
    few thousand, as the code found. Position 1's biases are much smaller (relative
    deviations of a few percent), and $N$ grows as $1/\delta^2$, so it needs
    millions of sessions.

??? question "9. A5/2 has four registers and nonlinear outputs, A5/1 three linear registers. Why is A5/2 much weaker?"

    Guessing the 16 free bits of the clock-control register R4 fixes the
    clocking of the other three for the whole frame. The output is then a
    quadratic function of their 61 free start bits, and linearization solves it
    with about 650 unknowns. That is about $2^{16}$ small linear systems. A5/1's
    clocking depends on the very registers being attacked, so no small guess
    makes it linear.

??? question "10. A designer proposes a stream cipher with an 80-bit key, an 80-bit state, and 64 initialization rounds after which cube testers already find no bias. What would you object to?"

    The state is too small: a data-time-memory trade-off on an 80-bit state
    costs far less than $2^{80}$ when many windows of keystream are available,
    so the state should be at least 160 bits. And "cube testers find no bias at
    64 rounds" is not a margin: the designer should show the most rounds any
    known attack reaches and run well beyond it, as Trivium (1,152 against about
    850) and ChaCha20 (20 against 7) do.

## What you learned

- A bare LFSR is predicted from $2L$ bits by Berlekamp-Massey; linear complexity
  measures how far any generator is from that, and is necessary but not
  sufficient.
- Combination and filter generators are judged by their Boolean function:
  degree, balance, nonlinearity, correlation immunity and algebraic immunity,
  which pull against each other.
- Siegenthaler's correlation attack recovers the registers of a combiner one at
  a time, at the sum of their costs; it needs about $L \ln 2 / (2\varepsilon^2)$
  bits. Fast correlation attacks decode instead of guessing.
- Algebraic attacks use low-degree annihilators to write the keystream as
  low-degree equations, solved by linearization; algebraic immunity is at most
  $\lceil n/2 \rceil$.
- Guess-and-determine attacks guess a small part of the state and derive the
  rest; distinguishers need about $1/(q\delta^2)$ samples and become plaintext
  recovery when the same secret is encrypted many times.
- RC4's key schedule leaks key sums (Roos); with the IV prepended to the key,
  FMS, Klein and PTW recovered WEP keys, the last from about 40,000 packets in a
  minute; RC4's output biases recovered cookies and passwords from TLS, and RFC
  7465 banned it.
- A5/1 fell to trade-offs on its 64-bit state and to public tables; A5/2 was
  weak by design and was broken ciphertext-only; E0 fell to conditional
  correlation attacks, and Bluetooth Classic more practically to KNOB.
- Cube attacks sum the output over chosen IVs to find linear superpolys, and
  have reached about 840 to 850 of Trivium's 1,152 initialization rounds.
- Modern designs answer all of this with nonlinear update, a state twice the
  key, thorough key and IV setup, and a published, measured margin, as eSTREAM's
  portfolio and ChaCha20 show.

## Further reading

- James L. Massey, "Shift-Register Synthesis and BCH Decoding", *IEEE
  Transactions on Information Theory* 15 (1969).
- P. R. Geffe, "How to Protect Data with Ciphers That Are Really Hard to Break",
  *Electronics* 46 (January 1973).
- Edwin L. Key, "An Analysis of the Structure and Complexity of Nonlinear Binary
  Sequence Generators", *IEEE Transactions on Information Theory* 22 (1976).
- Thomas Siegenthaler, "Correlation-Immunity of Nonlinear Combining Functions
  for Cryptographic Applications", *IEEE Transactions on Information Theory* 30
  (1984), and "Decrypting a Class of Stream Ciphers Using Ciphertext Only",
  *IEEE Transactions on Computers* 34 (1985).
- Rainer A. Rueppel, *Analysis and Design of Stream Ciphers* (Springer, 1986).
- Willi Meier and Othmar Staffelbach, "Fast Correlation Attacks on Certain
  Stream Ciphers", *Journal of Cryptology* 1 (1989; EUROCRYPT '88).
- Andrew Roos, "A Class of Weak Keys in the RC4 Stream Cipher", sci.crypt
  (September 1995).
- Jovan Dj. Golić, "Cryptanalysis of Alleged A5 Stream Cipher" (EUROCRYPT 1997),
  and "Linear Statistical Weakness of Alleged RC4 Keystream Generator"
  (EUROCRYPT 1997).
- Alex Biryukov, Adi Shamir and David Wagner, "Real Time Cryptanalysis of A5/1
  on a PC" (FSE 2000).
- Alex Biryukov and Adi Shamir, "Cryptanalytic Time/Memory/Data Tradeoffs for
  Stream Ciphers" (ASIACRYPT 2000).
- Scott Fluhrer and David McGrew, "Statistical Analysis of the Alleged RC4
  Keystream Generator" (FSE 2000).
- Itsik Mantin and Adi Shamir, "A Practical Attack on Broadcast RC4" (FSE 2001).
- Scott Fluhrer, Itsik Mantin and Adi Shamir, "Weaknesses in the Key Scheduling
  Algorithm of RC4" (SAC 2001).
- Nikita Borisov, Ian Goldberg and David Wagner, "Intercepting Mobile
  Communications: The Insecurity of 802.11" (MobiCom 2001).
- Adam Stubblefield, John Ioannidis and Aviel D. Rubin, "Using the
  Fluhrer, Mantin, and Shamir Attack to Break WEP" (NDSS 2002).
- Ilya Mironov, "(Not So) Random Shuffles of RC4" (CRYPTO 2002).
- Nicolas T. Courtois and Willi Meier, "Algebraic Attacks on Stream Ciphers with
  Linear Feedback" (EUROCRYPT 2003); Nicolas T. Courtois, "Fast Algebraic
  Attacks on Stream Ciphers with Linear Feedback" (CRYPTO 2003).
- Frederik Armknecht and Matthias Krause, "Algebraic Attacks on Combiners with
  Memory" (CRYPTO 2003).
- Elad Barkan, Eli Biham and Nathan Keller, "Instant Ciphertext-Only
  Cryptanalysis of GSM Encrypted Communication" (CRYPTO 2003; *Journal of
  Cryptology* 21, 2008).
- Willi Meier, Enes Pasalic and Claude Carlet, "Algebraic Attacks and
  Decomposition of Boolean Functions" (EUROCRYPT 2004).
- Yi Lu, Willi Meier and Serge Vaudenay, "The Conditional Correlation Attack: A
  Practical Attack on Bluetooth Encryption" (CRYPTO 2005).
- Christophe De Cannière and Bart Preneel, "Trivium Specifications" (eSTREAM,
  2005).
- Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin, "Breaking 104 Bit WEP in
  Less Than 60 Seconds" (WISA 2007).
- Goutam Paul and Subhamoy Maitra, "Permutation after RC4 Key Scheduling Reveals
  the Secret Key" (SAC 2007).
- Andreas Klein, "Attacks on the RC4 Stream Cipher", *Designs, Codes and
  Cryptography* 48 (2008).
- Jean-Philippe Aumasson, Simon Fischer, Shahram Khazaei, Willi Meier and
  Christian Rechberger, "New Features of Latin Dances: Analysis of Salsa,
  ChaCha, and Rumba" (FSE 2008).
- Itai Dinur and Adi Shamir, "Cube Attacks on Tweakable Black Box Polynomials"
  (EUROCRYPT 2009).
- Nadhem J. AlFardan, Daniel J. Bernstein, Kenneth G. Paterson, Bertram
  Poettering and Jacob C. N. Schuldt, "On the Security of RC4 in TLS" (USENIX
  Security 2013).
- Itsik Mantin, "Bar Mitzvah Attack: Breaking SSL with a 13-Year-Old RC4
  Weakness" (Black Hat Asia, 2015).
- Mathy Vanhoef and Frank Piessens, "All Your Biases Belong to Us: Breaking RC4
  in WPA-TKIP and TLS" (USENIX Security 2015).
- Yosuke Todo, Takanori Isobe, Yonglin Hao and Willi Meier, "Cube Attacks on
  Non-Blackbox Polynomials Based on Division Property" (CRYPTO 2017).
- Yosuke Todo, Takanori Isobe, Willi Meier, Kazumaro Aoki and Bin Zhang, "Fast
  Correlation Attack Revisited: Cryptanalysis of Full Grain-128a, Grain-128 and
  Grain-v1" (CRYPTO 2018).
- Daniele Antonioli, Nils Ole Tippenhauer and Kasper Rasmussen, "The KNOB is
  Broken: Exploiting Low Entropy in the Encryption Key Negotiation of Bluetooth
  BR/EDR" (USENIX Security 2019).
- Jean-Philippe Aumasson, "Too Much Crypto" (Real World Crypto 2020; ePrint
  2019/1492).
- Christof Beierle and others, "Cryptanalysis of the GPRS Encryption Algorithms
  GEA-1 and GEA-2" (EUROCRYPT 2021).
- Standards: RFC 7465 (prohibiting RC4 cipher suites in TLS, 2015), RFC 8439
  (ChaCha20 and Poly1305, 2018), RFC 8446 (TLS 1.3), IEEE 802.11i (2004, the
  replacement for WEP), ISO/IEC 29192-3 (lightweight stream ciphers, including
  Trivium and Enocoro).
