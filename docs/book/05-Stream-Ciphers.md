# 5. Stream Ciphers

*The one-time pad of [Chapter 4](04-Randomness-and-Perfect-Secrecy.md) is
perfect and almost useless, because its key is as long as the message. A stream
cipher keeps the pad's XOR and replaces the giant key with a short one,
stretched into a long keystream. This chapter builds that idea three times: with
linear shift registers, which are fast and fatally predictable; with RC4, which
was everywhere for twenty years and then failed in Wi-Fi and the web; and with
ChaCha20, the design that replaced it. Along the way you will break each of the
first two with a few lines of Python, and learn the one rule every stream cipher
user must follow.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a keystream generator is, and what "looks random" has to mean for one;
    - how linear feedback shift registers work, and how Berlekamp-Massey and
      correlation attacks break them;
    - how RC4 works, why its output is biased, and how WEP Wi-Fi was broken in minutes;
    - how ChaCha20 is built from add, rotate and XOR, and how to code it from RFC 8439;
    - why reusing a key and nonce is fatal, and why a stream cipher alone never
      protects a message from being changed.

    **You need:** [Chapter 4](04-Randomness-and-Perfect-Secrecy.md) (XOR, the
    one-time pad, randomness) and the bit operations from
    [Chapter 3](03-The-Arithmetic-of-Secrets.md).

    **Levels:** §5.1 to §5.3 are for beginners, §5.4 to §5.9 are intermediate,
    §5.10 is expert.

## 5.1 The problem

In 1917 Gilbert Vernam, an engineer at AT&T, built a teleprinter that XORed each
5-bit character of a message with a character from a paper tape of key. The
receiver's machine XORed the same tape again and the message came back. Joseph
Mauborgne of the US Army Signal Corps saw that if the key tape was random and
never used twice, nobody could read the traffic. That is the one-time pad, and
Claude Shannon proved in 1949 that it is perfectly secret.

It also has a cost that no cleverness removes: the key is as long as everything
you will ever send, and it has to reach the other side in secret beforehand.
Armies and embassies did this with couriers and pads of paper. For a phone call,
a video stream or a disk, it is hopeless.

So engineers asked a different question. What if the key tape were not random,
but **generated** by a machine from a short secret setting? Both ends set their
machines the same way, both produce the same long tape, and only the short
setting has to be shared. The tape is no longer perfectly random, so the
security is no longer perfect. The hope is that it is random-looking enough that
nobody can tell.

The German army tried exactly this in the Second World War. The Lorenz SZ40 and
SZ42 machines, used for teleprinter traffic between Hitler's high command and
army groups, produced their key from twelve wheels with cams around their rims.
Britain called the traffic "Tunny". On 30 August 1941 a German operator sent a
message of about 4,000 characters, was asked to repeat it, and sent it again with
the same wheel settings and small changes to the text. The two ciphertexts used
the same key. John Tiltman at Bletchley Park recovered both texts and the key,
and from that key alone the young mathematician Bill Tutte worked out how the
machine must be wired, without ever seeing one. By 1944 Tommy Flowers's Colossus
computers were finding the wheel settings by machine.

Two lessons from Tunny run through this chapter. A generated key can be attacked
through its **structure**, since the machine that makes it has far fewer states
than a truly random tape. And using the same key twice is fatal however good the
generator is.

!!! note "Life story: the Lorenz cipher (Tunny)"
    **Born:** about 1940, at C. Lorenz AG in Berlin · **Purpose:** automatic
    encryption of teleprinter links between the German high command and its
    army groups · **Helped:** carried strategic traffic that Enigma's Morse
    links could not, at teleprinter speed · **Broken:** from 1941 to 1945 at
    Bletchley Park, by Tiltman's reading of a repeated key, Tutte's
    reconstruction of the machine and, from 1944, Flowers's Colossus ·
    **Retired:** with the end of the war in 1945 · **Lesson:** a generated key
    has structure, and a key used twice is no key at all.

The rest of this chapter follows the idea from those German wheels to the
cipher in your phone. Figure 5.1 lays out the century of inventions and
breaks you are about to meet.

<figure class="mars-fig">
<svg viewBox="0 0 600 498" width="600" role="img" aria-label="Timeline of stream ciphers from Vernam in 1917 to RFC 8439 in 2018" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="490" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" font-size="14" text-anchor="end" font-weight="bold">1917</text>
<circle cx="92" cy="22" r="3.5" fill="currentColor"/>
<text x="108" y="27" font-size="14" text-anchor="start">Vernam's teleprinter XORs a key tape (AT&amp;T)</text>
<text x="78" y="53" font-size="14" text-anchor="end" font-weight="bold">1941</text>
<circle cx="92" cy="48" r="3.5" fill="currentColor"/>
<text x="108" y="53" font-size="14" text-anchor="start">A repeated Lorenz key lets Bletchley read Tunny</text>
<text x="78" y="79" font-size="14" text-anchor="end" font-weight="bold">1949</text>
<circle cx="92" cy="74" r="3.5" fill="currentColor"/>
<text x="108" y="79" font-size="14" text-anchor="start">Shannon proves the one-time pad perfectly secret</text>
<text x="78" y="105" font-size="14" text-anchor="end" font-weight="bold">1967</text>
<circle cx="92" cy="100" r="3.5" fill="currentColor"/>
<text x="108" y="105" font-size="14" text-anchor="start">Golomb's book Shift Register Sequences</text>
<text x="78" y="131" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1969</text>
<circle cx="92" cy="126" r="4.5" class="acc-fill"/>
<text x="108" y="131" font-size="14" text-anchor="start" class="acc-fill">Massey: Berlekamp's algorithm finds any LFSR</text>
<text x="78" y="157" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1985</text>
<circle cx="92" cy="152" r="4.5" class="acc-fill"/>
<text x="108" y="157" font-size="14" text-anchor="start" class="acc-fill">Siegenthaler's correlation attack</text>
<text x="78" y="183" font-size="14" text-anchor="end" font-weight="bold">1987</text>
<circle cx="92" cy="178" r="3.5" fill="currentColor"/>
<text x="108" y="183" font-size="14" text-anchor="start">Ron Rivest designs RC4 for RSA Data Security</text>
<text x="78" y="209" font-size="14" text-anchor="end" font-weight="bold">1994</text>
<circle cx="92" cy="204" r="3.5" fill="currentColor"/>
<text x="108" y="209" font-size="14" text-anchor="start">RC4's source code leaks to the Cypherpunks list</text>
<text x="78" y="235" font-size="14" text-anchor="end" font-weight="bold">1997</text>
<circle cx="92" cy="230" r="3.5" fill="currentColor"/>
<text x="108" y="235" font-size="14" text-anchor="start">Wi-Fi's WEP is built on RC4</text>
<text x="78" y="261" font-size="14" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="256" r="3.5" fill="currentColor"/>
<text x="108" y="261" font-size="14" text-anchor="start">GSM's A5/1 and A5/2 reverse-engineered</text>
<text x="78" y="287" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2001</text>
<circle cx="92" cy="282" r="4.5" class="acc-fill"/>
<text x="108" y="287" font-size="14" text-anchor="start" class="acc-fill">Fluhrer, Mantin, Shamir: WEP keys recovered</text>
<text x="78" y="313" font-size="14" text-anchor="end" font-weight="bold">2005</text>
<circle cx="92" cy="308" r="3.5" fill="currentColor"/>
<text x="108" y="313" font-size="14" text-anchor="start">Bernstein's Salsa20 entered in eSTREAM</text>
<text x="78" y="339" font-size="14" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="334" r="3.5" fill="currentColor"/>
<text x="108" y="339" font-size="14" text-anchor="start">ChaCha published; eSTREAM portfolio chosen</text>
<text x="78" y="365" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2013</text>
<circle cx="92" cy="360" r="4.5" class="acc-fill"/>
<text x="108" y="365" font-size="14" text-anchor="start" class="acc-fill">RC4 biases recover plaintext from TLS</text>
<text x="78" y="391" font-size="14" text-anchor="end" font-weight="bold">2015</text>
<circle cx="92" cy="386" r="3.5" fill="currentColor"/>
<text x="108" y="391" font-size="14" text-anchor="start">RFC 7465 bans RC4 in TLS; RFC 7539 ChaCha20</text>
<text x="78" y="417" font-size="14" text-anchor="end" font-weight="bold">2016</text>
<circle cx="92" cy="412" r="3.5" fill="currentColor"/>
<text x="108" y="417" font-size="14" text-anchor="start">Linux's random generator switches to ChaCha20</text>
<text x="78" y="443" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2017</text>
<circle cx="92" cy="438" r="4.5" class="acc-fill"/>
<text x="108" y="443" font-size="14" text-anchor="start" class="acc-fill">KRACK forces nonce reuse in WPA2</text>
<text x="78" y="469" font-size="14" text-anchor="end" font-weight="bold">2018</text>
<circle cx="92" cy="464" r="3.5" fill="currentColor"/>
<text x="108" y="469" font-size="14" text-anchor="start">RFC 8439; ChaCha20-Poly1305 in TLS 1.3</text>
</svg>
<figcaption>Figure 5.1. A century of stream ciphers. Accent marks the attacks; each one retired a design or a way of using one.</figcaption>
</figure>

## 5.2 The idea: a keystream generator

A **stream cipher** has two parts:

1. A **keystream generator** $G$: from a short key $k$ (today 128 or 256 bits)
   and a **nonce** $n$ (a "number used once", public), it produces a long string
   of bits $G(k, n)$.
2. The pad's XOR: encrypt with $c = m \oplus G(k, n)$, decrypt with
   $m = c \oplus G(k, n)$.

$$
c_i = m_i \oplus z_i, \qquad z = z_1 z_2 z_3 \ldots = G(k, n).
$$

Decryption is the same operation as encryption, because XORing the same bit
twice cancels it: $(m_i \oplus z_i) \oplus z_i = m_i$.

<figure class="mars-fig">
<svg viewBox="0 0 680 230" width="680" role="img" aria-label="Stream cipher: key and nonce feed a generator whose keystream is XORed with the message; the receiver does the same" fill="currentColor" font-size="13">
<text x="160" y="22" font-size="13" text-anchor="middle" font-weight="bold">Sender</text>
<rect x="30" y="40" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65" y="59.5" font-size="13" text-anchor="middle">key k</text>
<rect x="115" y="40" width="80" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155" y="59.5" font-size="13" text-anchor="middle">nonce n</text>
<rect x="75" y="100" width="110" height="36" rx="4" class="soft"/>
<rect x="75" y="100" width="110" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="130" y="122.5" font-size="13" text-anchor="middle">generator G</text>
<line x1="65" y1="70" x2="105" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="105,100 98.2,98.3 101.5,94" fill="currentColor"/>
<line x1="155" y1="70" x2="145" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="145,100 144.5,93 149.6,94.7" fill="currentColor"/>
<line x1="130" y1="136" x2="130" y2="171" stroke="currentColor" stroke-width="1.4"/>
<polygon points="130,171 127.3,164.6 132.7,164.6" fill="currentColor"/>
<text x="148" y="158" font-size="13" text-anchor="start" font-style="italic">z</text>
<text x="520" y="22" font-size="13" text-anchor="middle" font-weight="bold">Receiver</text>
<rect x="390" y="40" width="70" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="425" y="59.5" font-size="13" text-anchor="middle">key k</text>
<rect x="475" y="40" width="80" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515" y="59.5" font-size="13" text-anchor="middle">nonce n</text>
<rect x="435" y="100" width="110" height="36" rx="4" class="soft"/>
<rect x="435" y="100" width="110" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="490" y="122.5" font-size="13" text-anchor="middle">generator G</text>
<line x1="425" y1="70" x2="465" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="465,100 458.2,98.3 461.5,94" fill="currentColor"/>
<line x1="515" y1="70" x2="505" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="505,100 504.5,93 509.6,94.7" fill="currentColor"/>
<line x1="490" y1="136" x2="490" y2="171" stroke="currentColor" stroke-width="1.4"/>
<polygon points="490,171 487.3,164.6 492.7,164.6" fill="currentColor"/>
<text x="508" y="158" font-size="13" text-anchor="start" font-style="italic">z</text>
<text x="40" y="185" font-size="13" text-anchor="middle" font-weight="bold" font-style="italic">m</text>
<line x1="50" y1="180" x2="120" y2="180" stroke="currentColor" stroke-width="1.4"/>
<polygon points="120,180 113.6,182.7 113.6,177.3" fill="currentColor"/>
<circle cx="130" cy="180" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="121" y1="180" x2="139" y2="180" class="acc" stroke-width="1.4"/>
<line x1="130" y1="171" x2="130" y2="189" class="acc" stroke-width="1.4"/>
<line x1="139" y1="180" x2="481" y2="180" class="acc" stroke-width="1.4"/>
<polygon points="481,180 474.6,182.7 474.6,177.3" class="acc-fill"/>
<text x="270" y="172" font-size="13" text-anchor="middle" class="acc-fill">ciphertext c (sent with n)</text>
<circle cx="490" cy="180" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="481" y1="180" x2="499" y2="180" class="acc" stroke-width="1.4"/>
<line x1="490" y1="171" x2="490" y2="189" class="acc" stroke-width="1.4"/>
<line x1="499" y1="180" x2="600" y2="180" stroke="currentColor" stroke-width="1.4"/>
<polygon points="600,180 593.6,182.7 593.6,177.3" fill="currentColor"/>
<text x="615" y="185" font-size="13" text-anchor="middle" font-weight="bold" font-style="italic">m</text>
<text x="340" y="220" font-size="13" text-anchor="middle">c = m ⊕ z   and   c ⊕ z = m: the same keystream undoes itself</text>
</svg>
<figcaption>Figure 5.2. A stream cipher. Only the short key is secret; the nonce travels in the clear and makes each message's keystream different.</figcaption>
</figure>

Why the nonce? The key is meant to last a long time, for many messages. If the
generator took only the key, every message would get the same keystream, and
that is the two-time pad that broke Tunny. The nonce makes each message's
keystream different, and since it does not have to be secret, it is sent in the
clear next to the ciphertext.

What must the generator achieve? Three things, in rising order of difficulty:

- **A long period.** A generator has a finite number of internal states, so it
  must eventually repeat. The cycle must be far longer than any message.
- **Good statistics.** Zeros and ones equally often, pairs and runs as often as
  chance predicts.
- **Unpredictability.** Someone who has seen any amount of keystream must not be
  able to predict the next bit, or say anything about the key, better than by
  guessing.

The third is the real requirement, and the first two do not imply it. A
generator can pass every statistical test in a textbook and still be predicted
perfectly, as the next section shows. In [Chapter 17](17-Defining-Security.md)
this becomes a precise definition: a **pseudorandom generator** is one whose
output no efficient algorithm can tell apart from truly random bits.

## 5.3 Linear feedback shift registers

The simplest keystream generator in hardware is a **linear feedback shift
register** (LFSR): a row of bit cells. At each clock tick the leftmost bit comes
out as keystream, every bit moves one place left, and a new bit enters on the
right. The new bit is the XOR of a few fixed cells, called the **taps**.

**By hand.** Take four cells $s_0 s_1 s_2 s_3$ and the rule "the new bit is
$s_0 \oplus s_1$", which as a recurrence is

$$
s_{n+4} = s_{n+1} \oplus s_n .
$$

<figure class="mars-fig">
<svg viewBox="0 0 560 200" width="560" role="img" aria-label="A 4-cell LFSR: the leftmost bit is output, bits shift left, and the XOR of cells 0 and 1 enters on the right" fill="currentColor" font-size="13">
<rect x="170" y="56" width="56" height="44" rx="4" class="soft-acc"/>
<rect x="170" y="56" width="56" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="198" y="84.3" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="198" y="48" font-size="13" text-anchor="middle" font-style="italic">s0</text>
<rect x="226" y="56" width="56" height="44" rx="4" class="soft-acc"/>
<rect x="226" y="56" width="56" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="254" y="84.3" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="254" y="48" font-size="13" text-anchor="middle" font-style="italic">s1</text>
<rect x="282" y="56" width="56" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="310" y="84.3" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="310" y="48" font-size="13" text-anchor="middle" font-style="italic">s2</text>
<rect x="338" y="56" width="56" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="366" y="84.3" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="366" y="48" font-size="13" text-anchor="middle" font-style="italic">s3</text>
<text x="282" y="22" font-size="13" text-anchor="middle">each tick: every bit moves one place left</text>
<line x1="330" y1="30" x2="230" y2="30" stroke="currentColor" stroke-width="1.4"/>
<polygon points="230,30 236.4,27.3 236.4,32.7" fill="currentColor"/>
<line x1="170" y1="78" x2="92" y2="78" class="acc" stroke-width="1.4"/>
<polygon points="92,78 98.4,75.3 98.4,80.7" class="acc-fill"/>
<text x="70" y="66" font-size="13" text-anchor="middle" class="acc-fill">output</text>
<text x="70" y="98" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1,0,0,0,1,…</text>
<circle cx="254" cy="150" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="245" y1="150" x2="263" y2="150" stroke="currentColor" stroke-width="1.4"/>
<line x1="254" y1="141" x2="254" y2="159" stroke="currentColor" stroke-width="1.4"/>
<line x1="254" y1="100" x2="254" y2="141" stroke="currentColor" stroke-width="1.4"/>
<polygon points="254,141 251.3,134.6 256.7,134.6" fill="currentColor"/>
<polyline points="198,100 198,150 245,150" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="245,150 238.6,152.7 238.6,147.3" fill="currentColor"/>
<polyline points="263,150 440,150 440,78 394,78" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="394,78 400.4,75.3 400.4,80.7" fill="currentColor"/>
<text x="254" y="185" font-size="13" text-anchor="middle">new bit = s0 ⊕ s1   (taps: cells 0 and 1)</text>
</svg>
<figcaption>Figure 5.3. The 4-cell register of the worked example, in its starting state <code>1000</code>. The two tap cells (shaded) are XORed to make the bit that enters on the right.</figcaption>
</figure>

Start from the state `1000`. Each line shows the register, the bit that comes
out, and the new bit computed from the first two cells:

| Step | Register $s_n \ldots s_{n+3}$ | Output | New bit $s_n \oplus s_{n+1}$ |
|---|---|---|---|
| 0 | `1000` | 1 | $1 \oplus 0 = 1$ |
| 1 | `0001` | 0 | $0 \oplus 0 = 0$ |
| 2 | `0010` | 0 | $0 \oplus 0 = 0$ |
| 3 | `0100` | 0 | $0 \oplus 1 = 1$ |
| 4 | `1001` | 1 | $1 \oplus 0 = 1$ |
| 5 | `0011` | 0 | $0 \oplus 0 = 0$ |
| 6 | `0110` | 0 | $0 \oplus 1 = 1$ |

Carry on and the output is

$$
\underbrace{1\,0\,0\,0\,1\,0\,0\,1\,1\,0\,1\,0\,1\,1\,1}_{15 \text{ bits}}\;1\,0\,0\,0\,1\,0\,0\,1 \ldots
$$

It repeats after 15 bits. A 4-bit register has 16 states, and the all-zero state
is useless (it only ever produces zeros), so 15 is the longest cycle possible.
Every nonzero 4-bit state appears exactly once in it. Within one period there are
eight ones and seven zeros, and runs of each length appear as often as in a fair
coin's flips. Statistically, it is a fine-looking random sequence.

<figure class="mars-fig">
<svg viewBox="0 0 600 440" width="600" role="img" aria-label="The 15 nonzero states of the 4-bit LFSR form a single cycle" fill="currentColor" font-size="13">
<line x1="322.3" y1="44.5" x2="349" y2="50.1" stroke="currentColor" stroke-width="1.1"/>
<polygon points="349,50.1 342.1,51.5 343.3,46.1" fill="currentColor"/>
<line x1="389.7" y1="68.3" x2="411.8" y2="84.3" stroke="currentColor" stroke-width="1.1"/>
<polygon points="411.8,84.3 405,82.7 408.2,78.3" fill="currentColor"/>
<line x1="441.7" y1="117.5" x2="455.3" y2="141.1" stroke="currentColor" stroke-width="1.1"/>
<polygon points="455.3,141.1 449.7,136.9 454.4,134.1" fill="currentColor"/>
<line x1="469.1" y1="183.5" x2="471.9" y2="210.7" stroke="currentColor" stroke-width="1.1"/>
<polygon points="471.9,210.7 468.6,204.5 474,204" fill="currentColor"/>
<line x1="467.3" y1="255" x2="458.8" y2="281" stroke="currentColor" stroke-width="1.1"/>
<polygon points="458.8,281 458.2,274 463.4,275.7" fill="currentColor"/>
<line x1="436.6" y1="319.6" x2="418.3" y2="339.9" stroke="currentColor" stroke-width="1.1"/>
<polygon points="418.3,339.9 420.6,333.3 424.6,336.9" fill="currentColor"/>
<line x1="382.2" y1="366.1" x2="357.3" y2="377.2" stroke="currentColor" stroke-width="1.1"/>
<polygon points="357.3,377.2 362.1,372.1 364.3,377.1" fill="currentColor"/>
<line x1="313.6" y1="386.5" x2="286.4" y2="386.5" stroke="currentColor" stroke-width="1.1"/>
<polygon points="286.4,386.5 292.8,383.7 292.8,389.2" fill="currentColor"/>
<line x1="242.7" y1="377.2" x2="217.8" y2="366.1" stroke="currentColor" stroke-width="1.1"/>
<polygon points="217.8,366.1 224.8,366.2 222.6,371.2" fill="currentColor"/>
<line x1="181.7" y1="339.9" x2="163.4" y2="319.6" stroke="currentColor" stroke-width="1.1"/>
<polygon points="163.4,319.6 169.8,322.6 165.7,326.2" fill="currentColor"/>
<line x1="141.2" y1="281" x2="132.7" y2="255" stroke="currentColor" stroke-width="1.1"/>
<polygon points="132.7,255 137.3,260.3 132.1,262" fill="currentColor"/>
<line x1="128.1" y1="210.7" x2="130.9" y2="183.5" stroke="currentColor" stroke-width="1.1"/>
<polygon points="130.9,183.5 132.9,190.2 127.5,189.6" fill="currentColor"/>
<line x1="144.7" y1="141.1" x2="158.3" y2="117.5" stroke="currentColor" stroke-width="1.1"/>
<polygon points="158.3,117.5 157.5,124.4 152.8,121.7" fill="currentColor"/>
<line x1="188.2" y1="84.3" x2="210.3" y2="68.3" stroke="currentColor" stroke-width="1.1"/>
<polygon points="210.3,68.3 206.6,74.3 203.4,69.8" fill="currentColor"/>
<line x1="251" y1="50.1" x2="277.7" y2="44.5" stroke="currentColor" stroke-width="1.1"/>
<polygon points="277.7,44.5 272,48.5 270.8,43.1" fill="currentColor"/>
<rect x="274" y="31" width="52" height="24" rx="5" class="soft-acc"/>
<rect x="274" y="31" width="52" height="24" rx="5" fill="none" class="acc" stroke-width="1.4"/>
<text x="300" y="48" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1000</text>
<rect x="344" y="45.9" width="52" height="24" rx="5" class="soft"/>
<rect x="344" y="45.9" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="370" y="62.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0001</text>
<rect x="401.8" y="87.9" width="52" height="24" rx="5" class="soft"/>
<rect x="401.8" y="87.9" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="427.8" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0010</text>
<rect x="437.6" y="149.8" width="52" height="24" rx="5" class="soft"/>
<rect x="437.6" y="149.8" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="463.6" y="166.8" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0100</text>
<rect x="445.1" y="221" width="52" height="24" rx="5" class="soft"/>
<rect x="445.1" y="221" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="471.1" y="238" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1001</text>
<rect x="423" y="289" width="52" height="24" rx="5" class="soft"/>
<rect x="423" y="289" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="449" y="306" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0011</text>
<rect x="375.1" y="342.2" width="52" height="24" rx="5" class="soft"/>
<rect x="375.1" y="342.2" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="401.1" y="359.2" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0110</text>
<rect x="309.8" y="371.2" width="52" height="24" rx="5" class="soft"/>
<rect x="309.8" y="371.2" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="335.8" y="388.2" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1101</text>
<rect x="238.2" y="371.2" width="52" height="24" rx="5" class="soft"/>
<rect x="238.2" y="371.2" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="264.2" y="388.2" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1010</text>
<rect x="172.9" y="342.2" width="52" height="24" rx="5" class="soft"/>
<rect x="172.9" y="342.2" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="198.9" y="359.2" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0101</text>
<rect x="125" y="289" width="52" height="24" rx="5" class="soft"/>
<rect x="125" y="289" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="151" y="306" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1011</text>
<rect x="102.9" y="221" width="52" height="24" rx="5" class="soft"/>
<rect x="102.9" y="221" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="128.9" y="238" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0111</text>
<rect x="110.4" y="149.8" width="52" height="24" rx="5" class="soft"/>
<rect x="110.4" y="149.8" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="136.4" y="166.8" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1111</text>
<rect x="146.2" y="87.9" width="52" height="24" rx="5" class="soft"/>
<rect x="146.2" y="87.9" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="172.2" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1110</text>
<rect x="204" y="45.9" width="52" height="24" rx="5" class="soft"/>
<rect x="204" y="45.9" width="52" height="24" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="230" y="62.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1100</text>
<text x="300" y="207" font-size="15" text-anchor="middle" font-weight="bold">period 15 = 2⁴ − 1</text>
<text x="300" y="229" font-size="13" text-anchor="middle">every nonzero state, once</text>
<rect x="505" y="392" width="70" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="540" y="409.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0000</text>
<text x="540" y="435" font-size="12.5" text-anchor="middle">stuck at zero</text>
<path d="M 561 392 C 595 360, 595 430, 575 412" fill="none" stroke="currentColor" stroke-width="1.1"/>
</svg>
<figcaption>Figure 5.4. Starting from <code>1000</code> (accent), the register visits all 15 nonzero states and returns. The leftmost bit of each state is the output, which is why the keystream repeats after 15 bits.</figcaption>
</figure>

**How long can the period be?** Write the recurrence as a polynomial over bits:
$s_{n+4} = s_{n+1} + s_n$ becomes $x^4 = x + 1$, that is, $x^4 + x + 1$. An
$L$-cell LFSR reaches the maximum period $2^L - 1$ exactly when this polynomial
is **primitive**, a property from the theory of finite fields that
[Chapter 7](07-AES.md) begins to explain. Primitive polynomials exist for every
length (two for $L = 4$, about 67 million for $L = 32$) and tables of them have
been published since Solomon Golomb's book *Shift Register Sequences* (1967). So
a 64-cell register gives a period of $2^{64} - 1$ with a handful of XOR gates.

That made LFSRs the stream cipher of choice wherever hardware was small:
military radios, the GSM phone cipher A5/1 (three LFSRs of 19, 22 and 23 cells),
Bluetooth's E0, and the DVD's Content Scramble System. Every one of them was
broken, for a reason the next section makes concrete.

The LFSR's story begins outside cryptography. In the mid-1950s Solomon Golomb, a
young mathematician working for the Glenn L. Martin Company and then at the Jet
Propulsion Laboratory in California, studied these registers because they gave
long, balanced, noise-like sequences from almost no hardware, just what radar
ranging and space communication needed. His theory of which tap patterns give
the full period $2^L - 1$ became the standard reference, and the same circuits
went on to make GPS spreading codes, the scramblers in modems and Ethernet, and
CRC checksums. Military radio designers saw the same virtues and used them to
make keystreams, and for that one job the virtues turned out to be a trap.

!!! note "Life story: the LFSR as a keystream generator"
    **Born:** 1950s, from Solomon Golomb's work on shift register sequences
    (book, 1967) · **Purpose:** long, statistically balanced bit streams from a
    few gates · **Helped:** radar, spread spectrum, GPS codes and CRCs; as a
    cipher, cheap military radios, GSM's A5/1, Bluetooth's E0 and the DVD's CSS
    · **Retired as a cipher on its own:** 1969, when Berlekamp-Massey made a
    lone LFSR predictable from $2L$ bits; combined designs fell to correlation
    attacks from 1985 and to time-memory trade-offs · **Status:** current
    everywhere secrecy is not the goal, and inside SNOW 3G and ZUC, wrapped in
    nonlinear parts

## 5.4 Why linear fails

*Level: intermediate.* An LFSR's output is **linear**: every output bit is an XOR
of bits of the starting state. Linear equations are easy to solve. If you know
the taps and see $L$ output bits of an $L$-cell register, you have $L$ linear
equations in the $L$ unknown state bits, and Gaussian elimination solves them.
The output bits are in fact the starting state, shifted out one at a time.

Hiding the taps does not help. In 1968 Elwyn Berlekamp published an algorithm for
decoding BCH error-correcting codes, and in 1969 James Massey showed it finds the
**shortest LFSR that produces any given sequence**. Give the
**Berlekamp-Massey algorithm** $2L$ bits from an unknown $L$-cell LFSR and it
returns the taps, after which the attacker runs the register forward and
predicts everything. The length of that shortest LFSR is called the sequence's
**linear complexity**, and a good keystream must have a huge one.

Here a 32-bit LFSR with secret taps and a secret start state produces 1,000 bits.
The attacker sees the first 64:

```python
def lfsr(state, taps, n):              # state: list of bits; taps: cells XORed into the new bit
    s, out = state[:], []
    for _ in range(n):
        out.append(s[0])
        s = s[1:] + [sum(s[t] for t in taps) % 2]
    return out

def berlekamp_massey(bits):            # shortest LFSR that makes these bits
    c, b = [1], [1]                    # connection polynomials, lowest degree first
    L, m = 0, 1
    for n in range(len(bits)):
        d = bits[n]                    # does the current LFSR predict bit n?
        for i in range(1, L + 1):
            d ^= c[i] & bits[n - i]
        if d == 0:
            m += 1
            continue
        t = c[:]                       # no: correct c with a shifted copy of b
        c += [0] * (len(b) + m - len(c))
        for i, x in enumerate(b):
            c[i + m] ^= x
        if 2 * L <= n:
            L, b, m = n + 1 - L, t, 1
        else:
            m += 1
    return L, c[:L + 1]

def predict(bits, c, n):               # run the recovered LFSR forward
    s = bits[:]
    while len(s) < n:
        s.append(sum(c[i] & s[-i] for i in range(1, len(c))) % 2)
    return s

key = [int(b) for b in format(0xC0FFEE42, "032b")]   # the secret start state
taps = [0, 1, 2, 22]                                   # s[n+32] = s[n] + s[n+1] + s[n+2] + s[n+22]
stream = lfsr(key, taps, 1000)

L, c = berlekamp_massey(stream[:64])   # the attacker sees 64 bits
print(L, [i for i in range(len(c)) if c[i]])
print(predict(stream[:64], c, 1000) == stream)
```

It prints

```
32 [0, 10, 30, 31, 32]
True
```

The attacker found a 32-cell register with the rule
$s_n = s_{n-10} \oplus s_{n-30} \oplus s_{n-31} \oplus s_{n-32}$, which is the
secret rule written backwards, and predicted all 936 bits it had not seen.

Figure 5.5 shows the algorithm at work. Each time a new bit contradicts the
current register, it lengthens the register just enough to explain it, and the
length grows along the line $L = n/2$ until it reaches 32. After that no bit ever
contradicts it again.

<figure class="mars-fig">
<svg viewBox="0 0 600 300" width="600" role="img" aria-label="Linear complexity found by Berlekamp-Massey as more keystream bits are seen, reaching 32" fill="currentColor" font-size="13">
<line x1="60" y1="250" x2="560" y2="250" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="250" x2="60" y2="30" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="250" x2="60" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="270" font-size="12.5" text-anchor="middle">0</text>
<line x1="180" y1="250" x2="180" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="180" y="270" font-size="12.5" text-anchor="middle">16</text>
<line x1="300" y1="250" x2="300" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="300" y="270" font-size="12.5" text-anchor="middle">32</text>
<line x1="420" y1="250" x2="420" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="420" y="270" font-size="12.5" text-anchor="middle">48</text>
<line x1="540" y1="250" x2="540" y2="255" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="270" font-size="12.5" text-anchor="middle">64</text>
<line x1="55" y1="250" x2="60" y2="250" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="254" font-size="12.5" text-anchor="end">0</text>
<line x1="55" y1="198" x2="60" y2="198" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="202" font-size="12.5" text-anchor="end">8</text>
<line x1="55" y1="146" x2="60" y2="146" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="150" font-size="12.5" text-anchor="end">16</text>
<line x1="55" y1="94" x2="60" y2="94" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="98" font-size="12.5" text-anchor="end">24</text>
<line x1="55" y1="42" x2="60" y2="42" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="46" font-size="12.5" text-anchor="end">32</text>
<text x="310" y="292" font-size="13" text-anchor="middle">keystream bits seen by the attacker</text>
<text x="20" y="140" font-size="14" text-anchor="middle" font-style="italic">L</text>
<line x1="60" y1="250" x2="540" y2="42" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="364" y="142" font-size="12.5" text-anchor="start" fill-opacity="0.8">L = n/2</text>
<polyline points="60,250 60,250 60,243.5 67.5,243.5 67.5,243.5 75,243.5 75,237 82.5,237 82.5,237 90,237 90,237 97.5,237 97.5,237 105,237 105,237 112.5,237 112.5,237 120,237 120,204.5 127.5,204.5 127.5,204.5 135,204.5 135,204.5 142.5,204.5 142.5,204.5 150,204.5 150,204.5 157.5,204.5 157.5,204.5 165,204.5 165,198 172.5,198 172.5,198 180,198 180,191.5 187.5,191.5 187.5,191.5 195,191.5 195,191.5 202.5,191.5 202.5,178.5 210,178.5 210,178.5 217.5,178.5 217.5,178.5 225,178.5 225,172 232.5,172 232.5,172 240,172 240,172 247.5,172 247.5,159 255,159 255,159 262.5,159 262.5,159 270,159 270,152.5 277.5,152.5 277.5,152.5 285,152.5 285,152.5 292.5,152.5 292.5,152.5 300,152.5 300,152.5 307.5,152.5 307.5,126.5 315,126.5 315,126.5 322.5,126.5 322.5,126.5 330,126.5 330,126.5 337.5,126.5 337.5,126.5 345,126.5 345,126.5 352.5,126.5 352.5,113.5 360,113.5 360,113.5 367.5,113.5 367.5,113.5 375,113.5 375,107 382.5,107 382.5,107 390,107 390,100.5 397.5,100.5 397.5,100.5 405,100.5 405,100.5 412.5,100.5 412.5,100.5 420,100.5 420,100.5 427.5,100.5 427.5,100.5 435,100.5 435,100.5 442.5,100.5 442.5,100.5 450,100.5 450,55 457.5,55 457.5,55 465,55 465,55 472.5,55 472.5,55 480,55 480,55 487.5,55 487.5,55 495,55 495,55 502.5,55 502.5,55 510,55 510,55 517.5,55 517.5,42 525,42 525,42 532.5,42 532.5,42 540,42" fill="none" class="acc" stroke-width="2"/>
<line x1="60" y1="42" x2="540" y2="42" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.5"/>
<text x="525" y="32" font-size="13" text-anchor="end" class="acc-fill">L = 32 after 62 bits</text>
</svg>
<figcaption>Figure 5.5. Berlekamp-Massey run on the secret 32-bit register's output. The length L of the shortest register that explains the bits seen so far climbs in steps, roughly along n/2, and settles at 32: from then on every bit is predicted.</figcaption>
</figure>

The algorithm was not invented to break ciphers. Elwyn Berlekamp found it while
designing decoders for BCH codes, the error-correcting codes that let data
survive a noisy channel; his book *Algebraic Coding Theory* (1968) gave the
method. James Massey, then a professor at the University of Notre Dame,
recognized in 1969 that the decoder was really solving a more general problem,
"which shortest shift register produced these symbols?", and published it in
that form. Coding engineers have used it ever since in Reed-Solomon decoders,
from space probes to QR codes. For cryptographers it became the first test any
keystream must pass: its linear complexity must be enormous.

!!! note "Life story: the Berlekamp-Massey algorithm"
    **Born:** 1968 (Elwyn Berlekamp, decoding BCH codes) and 1969 (James Massey,
    shift-register synthesis) · **Purpose:** correcting errors in transmitted
    data · **Helped:** fast decoders for BCH and Reed-Solomon codes; for
    cryptanalysts, a way to recover any LFSR from $2L$ bits and to measure a
    keystream's linear complexity · **Status:** current, a standard tool of
    both fields

### Adding nonlinearity, and the correlation attack

Designers responded by combining several LFSRs through a **nonlinear** function.
A classic example is the Geffe generator (1973): three registers, where the
second one chooses which of the other two to output,

$$
z = \begin{cases} x_1 & \text{if } x_2 = 1 \\ x_3 & \text{if } x_2 = 0 \end{cases}
\qquad\text{that is}\qquad z = x_1 x_2 \oplus (1 \oplus x_2)\, x_3 .
$$

<figure class="mars-fig">
<svg viewBox="0 0 600 240" width="600" role="img" aria-label="Geffe generator: three LFSRs; the middle one selects which of the other two is output" fill="currentColor" font-size="13">
<rect x="30" y="30" width="150" height="40" rx="4" class="soft-acc"/>
<rect x="30" y="30" width="150" height="40" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="105" y="54.5" font-size="13" text-anchor="middle">LFSR 1 (7 cells)</text>
<rect x="30" y="100" width="150" height="40" rx="4" class="soft"/>
<rect x="30" y="100" width="150" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="124.5" font-size="13" text-anchor="middle">LFSR 2 (9 cells)</text>
<rect x="30" y="170" width="150" height="40" rx="4" class="soft"/>
<rect x="30" y="170" width="150" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="194.6" font-size="13" text-anchor="middle">LFSR 3 (11 cells)</text>
<polygon points="330,40 400,70 400,170 330,200" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="365" y="140" font-size="13" text-anchor="middle">pick</text>
<text x="365" y="156" font-size="13" text-anchor="middle">x1 or x3</text>
<line x1="180" y1="50" x2="330" y2="70" class="acc" stroke-width="1.4"/>
<polygon points="330,70 323.2,71.8 324,66.4" class="acc-fill"/>
<text x="250" y="50" font-size="13" text-anchor="middle" font-style="italic" class="acc-fill">x1</text>
<line x1="180" y1="190" x2="330" y2="170" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,170 324,173.6 323.2,168.2" fill="currentColor"/>
<text x="250" y="196" font-size="13" text-anchor="middle" font-style="italic">x3</text>
<line x1="180" y1="120" x2="330" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="330,120 323.6,122.7 323.6,117.3" fill="currentColor"/>
<text x="255" y="112" font-size="13" text-anchor="middle">x2 selects</text>
<line x1="400" y1="120" x2="470" y2="120" stroke="currentColor" stroke-width="1.4"/>
<polygon points="470,120 463.6,122.7 463.6,117.3" fill="currentColor"/>
<text x="490" y="125" font-size="15" text-anchor="start" font-weight="bold" font-style="italic">z</text>
<text x="470" y="40" font-size="13" text-anchor="start">z = x1 when x2 = 1,</text>
<text x="470" y="58" font-size="13" text-anchor="start">and by chance half</text>
<text x="470" y="76" font-size="13" text-anchor="start" class="acc-fill">the rest: 75% in all</text>
</svg>
<figcaption>Figure 5.6. The Geffe generator. Its output agrees with register 1 three times in four, and that leak lets an attacker guess register 1 on its own.</figcaption>
</figure>

Its linear complexity is large, so Berlekamp-Massey no longer works. But look at
how often $z$ agrees with $x_1$: whenever $x_2 = 1$ (half the time), and by
chance half of the remaining time. So $z = x_1$ about 75% of the time. In 1985
Thomas Siegenthaler turned that into the **correlation attack**: guess the start
state of register 1 alone, and keep the guess whose output agrees with the
keystream far more than half the time. The registers fall one at a time, so the
work is the **sum** of their sizes, not the product.

```python
def bits(x, k):
    return [x >> i & 1 for i in range(k)]

R = [(7, [0, 1]), (9, [0, 4]), (11, [0, 2])]   # lengths and taps of the three registers
N = 200

def geffe(keys, n):
    x1, x2, x3 = (lfsr(bits(k, L), t, n) for k, (L, t) in zip(keys, R))
    return [a if b else c for a, b, c in zip(x1, x2, x3)]   # x2 picks x1 or x3

secret = [80, 131, 1520]               # 7 + 9 + 11 = 27 key bits
z = geffe(secret, N)

def best(L, taps):                     # the start state whose output agrees with z most often
    score = lambda k: sum(a == b for a, b in zip(lfsr(bits(k, L), taps, N), z))
    return max(range(1, 2 ** L), key=score)

k1, k3 = best(*R[0]), best(*R[2])      # 2^7 + 2^11 guesses instead of 2^27
k2 = next(k for k in range(1, 2 ** 9) if geffe([k1, k, k3], N) == z)
print([k1, k2, k3])                    # [80, 131, 1520]
```

About 2,700 guesses replace 134 million. Real ciphers are bigger, but the same
idea, improved into "fast correlation attacks" and algebraic attacks, broke most
LFSR-based designs.

<figure class="mars-fig">
<svg viewBox="0 0 680 280" width="680" role="img" aria-label="Agreement with the keystream for each of the 127 guesses of register 1; the right guess stands out" fill="currentColor" font-size="13">
<line x1="60" y1="240" x2="560" y2="240" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="240" x2="60" y2="20" stroke="currentColor" stroke-width="1.4"/>
<line x1="55" y1="218" x2="60" y2="218" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="222" font-size="12.5" text-anchor="end">80</text>
<line x1="55" y1="174" x2="60" y2="174" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="178" font-size="12.5" text-anchor="end">100</text>
<line x1="55" y1="130" x2="60" y2="130" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="134" font-size="12.5" text-anchor="end">120</text>
<line x1="55" y1="86" x2="60" y2="86" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="90" font-size="12.5" text-anchor="end">140</text>
<line x1="55" y1="42" x2="60" y2="42" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="46" font-size="12.5" text-anchor="end">160</text>
<line x1="60" y1="240" x2="60" y2="245" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="260" font-size="12.5" text-anchor="middle">1</text>
<line x1="180.9" y1="240" x2="180.9" y2="245" stroke="currentColor" stroke-width="1.4"/>
<text x="180.9" y="260" font-size="12.5" text-anchor="middle">32</text>
<line x1="305.7" y1="240" x2="305.7" y2="245" stroke="currentColor" stroke-width="1.4"/>
<text x="305.7" y="260" font-size="12.5" text-anchor="middle">64</text>
<line x1="430.5" y1="240" x2="430.5" y2="245" stroke="currentColor" stroke-width="1.4"/>
<text x="430.5" y="260" font-size="12.5" text-anchor="middle">96</text>
<line x1="551.4" y1="240" x2="551.4" y2="245" stroke="currentColor" stroke-width="1.4"/>
<text x="551.4" y="260" font-size="12.5" text-anchor="middle">127</text>
<line x1="60" y1="174" x2="560" y2="174" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="566" y="178" font-size="12.5" text-anchor="start" fill-opacity="0.85">chance</text>
<line x1="60" y1="64" x2="560" y2="64" stroke="currentColor" stroke-width="0.8" stroke-dasharray="4 3" stroke-opacity="0.5"/>
<text x="566" y="68" font-size="12.5" text-anchor="start" fill-opacity="0.85">75%</text>
<circle cx="60" cy="165.2" r="2.6" fill="currentColor"/>
<circle cx="63.9" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="67.8" cy="176.2" r="2.6" fill="currentColor"/>
<circle cx="71.7" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="75.6" cy="163" r="2.6" fill="currentColor"/>
<circle cx="79.5" cy="178.4" r="2.6" fill="currentColor"/>
<circle cx="83.4" cy="204.8" r="2.6" fill="currentColor"/>
<circle cx="87.3" cy="169.6" r="2.6" fill="currentColor"/>
<circle cx="91.2" cy="174" r="2.6" fill="currentColor"/>
<circle cx="95.1" cy="176.2" r="2.6" fill="currentColor"/>
<circle cx="99" cy="198.2" r="2.6" fill="currentColor"/>
<circle cx="102.9" cy="193.8" r="2.6" fill="currentColor"/>
<circle cx="106.8" cy="193.8" r="2.6" fill="currentColor"/>
<circle cx="110.7" cy="196" r="2.6" fill="currentColor"/>
<circle cx="114.6" cy="169.6" r="2.6" fill="currentColor"/>
<circle cx="118.5" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="122.4" cy="154.2" r="2.6" fill="currentColor"/>
<circle cx="126.3" cy="169.6" r="2.6" fill="currentColor"/>
<circle cx="130.2" cy="160.8" r="2.6" fill="currentColor"/>
<circle cx="134.1" cy="169.6" r="2.6" fill="currentColor"/>
<circle cx="138" cy="165.2" r="2.6" fill="currentColor"/>
<circle cx="141.9" cy="163" r="2.6" fill="currentColor"/>
<circle cx="145.8" cy="193.8" r="2.6" fill="currentColor"/>
<circle cx="149.7" cy="189.4" r="2.6" fill="currentColor"/>
<circle cx="153.6" cy="198.2" r="2.6" fill="currentColor"/>
<circle cx="157.5" cy="174" r="2.6" fill="currentColor"/>
<circle cx="161.4" cy="165.2" r="2.6" fill="currentColor"/>
<circle cx="165.3" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="169.2" cy="187.2" r="2.6" fill="currentColor"/>
<circle cx="173.1" cy="189.4" r="2.6" fill="currentColor"/>
<circle cx="177" cy="185" r="2.6" fill="currentColor"/>
<circle cx="180.9" cy="176.2" r="2.6" fill="currentColor"/>
<circle cx="184.8" cy="189.4" r="2.6" fill="currentColor"/>
<circle cx="188.7" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="192.6" cy="178.4" r="2.6" fill="currentColor"/>
<circle cx="196.5" cy="165.2" r="2.6" fill="currentColor"/>
<circle cx="200.4" cy="165.2" r="2.6" fill="currentColor"/>
<circle cx="204.3" cy="185" r="2.6" fill="currentColor"/>
<circle cx="208.2" cy="193.8" r="2.6" fill="currentColor"/>
<circle cx="212.1" cy="163" r="2.6" fill="currentColor"/>
<circle cx="216" cy="202.6" r="2.6" fill="currentColor"/>
<circle cx="219.9" cy="174" r="2.6" fill="currentColor"/>
<circle cx="223.8" cy="152" r="2.6" fill="currentColor"/>
<circle cx="227.7" cy="165.2" r="2.6" fill="currentColor"/>
<circle cx="231.6" cy="174" r="2.6" fill="currentColor"/>
<circle cx="235.5" cy="180.6" r="2.6" fill="currentColor"/>
<circle cx="239.4" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="243.3" cy="169.6" r="2.6" fill="currentColor"/>
<circle cx="247.2" cy="187.2" r="2.6" fill="currentColor"/>
<circle cx="251.1" cy="154.2" r="2.6" fill="currentColor"/>
<circle cx="255" cy="154.2" r="2.6" fill="currentColor"/>
<circle cx="258.9" cy="154.2" r="2.6" fill="currentColor"/>
<circle cx="262.8" cy="176.2" r="2.6" fill="currentColor"/>
<circle cx="266.7" cy="196" r="2.6" fill="currentColor"/>
<circle cx="270.6" cy="174" r="2.6" fill="currentColor"/>
<circle cx="274.5" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="278.4" cy="174" r="2.6" fill="currentColor"/>
<circle cx="282.3" cy="154.2" r="2.6" fill="currentColor"/>
<circle cx="286.2" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="290.1" cy="189.4" r="2.6" fill="currentColor"/>
<circle cx="294" cy="167.4" r="2.6" fill="currentColor"/>
<circle cx="297.9" cy="156.4" r="2.6" fill="currentColor"/>
<circle cx="301.8" cy="187.2" r="2.6" fill="currentColor"/>
<circle cx="305.7" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="309.6" cy="174" r="2.6" fill="currentColor"/>
<circle cx="313.5" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="317.4" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="321.3" cy="180.6" r="2.6" fill="currentColor"/>
<circle cx="325.2" cy="193.8" r="2.6" fill="currentColor"/>
<circle cx="329.1" cy="174" r="2.6" fill="currentColor"/>
<circle cx="333" cy="187.2" r="2.6" fill="currentColor"/>
<circle cx="336.9" cy="156.4" r="2.6" fill="currentColor"/>
<circle cx="340.8" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="344.7" cy="185" r="2.6" fill="currentColor"/>
<circle cx="348.6" cy="158.6" r="2.6" fill="currentColor"/>
<circle cx="352.5" cy="167.4" r="2.6" fill="currentColor"/>
<circle cx="356.4" cy="145.4" r="2.6" fill="currentColor"/>
<circle cx="360.3" cy="174" r="2.6" fill="currentColor"/>
<circle cx="364.2" cy="143.2" r="2.6" fill="currentColor"/>
<circle cx="368.1" cy="53" r="4.5" class="acc-fill"/>
<circle cx="372" cy="163" r="2.6" fill="currentColor"/>
<circle cx="375.9" cy="152" r="2.6" fill="currentColor"/>
<circle cx="379.8" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="383.7" cy="187.2" r="2.6" fill="currentColor"/>
<circle cx="387.6" cy="178.4" r="2.6" fill="currentColor"/>
<circle cx="391.5" cy="193.8" r="2.6" fill="currentColor"/>
<circle cx="395.4" cy="185" r="2.6" fill="currentColor"/>
<circle cx="399.3" cy="167.4" r="2.6" fill="currentColor"/>
<circle cx="403.2" cy="189.4" r="2.6" fill="currentColor"/>
<circle cx="407.1" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="411" cy="152" r="2.6" fill="currentColor"/>
<circle cx="414.9" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="418.8" cy="156.4" r="2.6" fill="currentColor"/>
<circle cx="422.7" cy="202.6" r="2.6" fill="currentColor"/>
<circle cx="426.6" cy="149.8" r="2.6" fill="currentColor"/>
<circle cx="430.5" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="434.4" cy="171.8" r="2.6" fill="currentColor"/>
<circle cx="438.3" cy="174" r="2.6" fill="currentColor"/>
<circle cx="442.2" cy="174" r="2.6" fill="currentColor"/>
<circle cx="446.1" cy="174" r="2.6" fill="currentColor"/>
<circle cx="450" cy="169.6" r="2.6" fill="currentColor"/>
<circle cx="453.9" cy="189.4" r="2.6" fill="currentColor"/>
<circle cx="457.8" cy="193.8" r="2.6" fill="currentColor"/>
<circle cx="461.7" cy="167.4" r="2.6" fill="currentColor"/>
<circle cx="465.6" cy="185" r="2.6" fill="currentColor"/>
<circle cx="469.5" cy="191.6" r="2.6" fill="currentColor"/>
<circle cx="473.4" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="477.3" cy="156.4" r="2.6" fill="currentColor"/>
<circle cx="481.2" cy="169.6" r="2.6" fill="currentColor"/>
<circle cx="485.1" cy="185" r="2.6" fill="currentColor"/>
<circle cx="489" cy="163" r="2.6" fill="currentColor"/>
<circle cx="492.9" cy="182.8" r="2.6" fill="currentColor"/>
<circle cx="496.8" cy="178.4" r="2.6" fill="currentColor"/>
<circle cx="500.7" cy="189.4" r="2.6" fill="currentColor"/>
<circle cx="504.6" cy="185" r="2.6" fill="currentColor"/>
<circle cx="508.5" cy="180.6" r="2.6" fill="currentColor"/>
<circle cx="512.4" cy="154.2" r="2.6" fill="currentColor"/>
<circle cx="516.3" cy="174" r="2.6" fill="currentColor"/>
<circle cx="520.2" cy="174" r="2.6" fill="currentColor"/>
<circle cx="524.1" cy="152" r="2.6" fill="currentColor"/>
<circle cx="528" cy="165.2" r="2.6" fill="currentColor"/>
<circle cx="531.9" cy="180.6" r="2.6" fill="currentColor"/>
<circle cx="535.8" cy="149.8" r="2.6" fill="currentColor"/>
<circle cx="539.7" cy="163" r="2.6" fill="currentColor"/>
<circle cx="543.6" cy="154.2" r="2.6" fill="currentColor"/>
<circle cx="547.5" cy="187.2" r="2.6" fill="currentColor"/>
<circle cx="551.4" cy="178.4" r="2.6" fill="currentColor"/>
<text x="378.1" y="57" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">guess 80: 155</text>
<text x="310" y="278" font-size="13" text-anchor="middle">guess for register 1's start state</text>
</svg>
<figcaption>Figure 5.7. The correlation attack on the Geffe generator of the code. Each dot is one guess of register 1, scored by how many of the 200 keystream bits it matches. The wrong guesses scatter around 100 (best 114); the right one, 80, scores 155.</figcaption>
</figure>

!!! note "Life story: the correlation attack"
    **Born:** 1984 to 1985, Thomas Siegenthaler at ETH Zurich, who also defined
    correlation immunity · **Purpose:** to show that a nonlinear combiner still
    leaks each register through statistics · **Helped:** became, with Willi
    Meier and Othmar Staffelbach's fast correlation attacks (1988), the main
    method against LFSR ciphers, and forced designers to measure correlation
    immunity · **Status:** current; every new stream cipher is checked against
    its descendants

### A5/1 and the GSM phone

The best-known casualty is **A5/1**, the cipher that protected GSM mobile calls
in Europe and much of the world from the early 1990s. It was kept secret, and a
weaker export version, A5/2, was used in other markets. In 1999 Marc Briceno, Ian
Goldberg and David Wagner reverse-engineered both from a phone. A5/2 was broken
almost at once. For A5/1, Alex Biryukov, Adi Shamir and David Wagner showed in
2000 how to find the key from a few minutes of conversation after a large
precomputation, and in 2009 Karsten Nohl and his collaborators computed public
tables that made the attack practical with ordinary equipment. A5/1 has only 64
bits of state, the same as its key, and §5.10 explains why a state that small
lets an attacker trade memory for time. Later phone networks moved to block
ciphers and to newer stream ciphers designed with these attacks in mind (see
§5.9).

<figure class="mars-fig">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="A5/1: three LFSRs of 19, 22 and 23 cells, clocked by majority, outputs XORed" fill="currentColor" font-size="13">
<text x="36" y="65" font-size="13" text-anchor="middle" font-weight="bold">R1</text>
<text x="36" y="83" font-size="12" text-anchor="middle" fill-opacity="0.8">19 cells</text>
<rect x="80" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="94" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="108" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="122" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="136" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="150" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="164" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="178" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="192" y="50" width="14" height="20" rx="0" class="soft-acc"/>
<rect x="192" y="50" width="14" height="20" rx="0" fill="none" class="acc" stroke-width="1"/>
<rect x="206" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="220" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="234" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="248" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="262" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="276" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="290" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="304" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="318" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="332" y="50" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<line x1="269" y1="50" x2="269" y2="36" stroke="currentColor" stroke-width="1"/>
<circle cx="269" cy="36" r="2.2" fill="currentColor"/>
<line x1="311" y1="50" x2="311" y2="36" stroke="currentColor" stroke-width="1"/>
<circle cx="311" cy="36" r="2.2" fill="currentColor"/>
<line x1="325" y1="50" x2="325" y2="36" stroke="currentColor" stroke-width="1"/>
<circle cx="325" cy="36" r="2.2" fill="currentColor"/>
<line x1="339" y1="50" x2="339" y2="36" stroke="currentColor" stroke-width="1"/>
<circle cx="339" cy="36" r="2.2" fill="currentColor"/>
<line x1="269" y1="36" x2="339" y2="36" stroke="currentColor" stroke-width="1"/>
<polyline points="269,36 66,36 66,60 80,60" fill="none" stroke="currentColor" stroke-width="1"/>
<polygon points="80,60 73.6,62.7 73.6,57.3" fill="currentColor"/>
<text x="60" y="40" font-size="13" text-anchor="end">⊕</text>
<text x="36" y="140" font-size="13" text-anchor="middle" font-weight="bold">R2</text>
<text x="36" y="158" font-size="12" text-anchor="middle" fill-opacity="0.8">22 cells</text>
<rect x="80" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="94" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="108" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="122" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="136" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="150" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="164" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="178" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="192" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="206" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="220" y="125" width="14" height="20" rx="0" class="soft-acc"/>
<rect x="220" y="125" width="14" height="20" rx="0" fill="none" class="acc" stroke-width="1"/>
<rect x="234" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="248" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="262" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="276" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="290" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="304" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="318" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="332" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="346" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="360" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="374" y="125" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<line x1="367" y1="125" x2="367" y2="111" stroke="currentColor" stroke-width="1"/>
<circle cx="367" cy="111" r="2.2" fill="currentColor"/>
<line x1="381" y1="125" x2="381" y2="111" stroke="currentColor" stroke-width="1"/>
<circle cx="381" cy="111" r="2.2" fill="currentColor"/>
<line x1="367" y1="111" x2="381" y2="111" stroke="currentColor" stroke-width="1"/>
<polyline points="367,111 66,111 66,135 80,135" fill="none" stroke="currentColor" stroke-width="1"/>
<polygon points="80,135 73.6,137.7 73.6,132.3" fill="currentColor"/>
<text x="60" y="115" font-size="13" text-anchor="end">⊕</text>
<text x="36" y="215" font-size="13" text-anchor="middle" font-weight="bold">R3</text>
<text x="36" y="233" font-size="12" text-anchor="middle" fill-opacity="0.8">23 cells</text>
<rect x="80" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="94" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="108" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="122" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="136" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="150" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="164" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="178" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="192" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="206" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="220" y="200" width="14" height="20" rx="0" class="soft-acc"/>
<rect x="220" y="200" width="14" height="20" rx="0" fill="none" class="acc" stroke-width="1"/>
<rect x="234" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="248" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="262" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="276" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="290" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="304" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="318" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="332" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="346" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="360" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="374" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="388" y="200" width="14" height="20" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<line x1="185" y1="200" x2="185" y2="186" stroke="currentColor" stroke-width="1"/>
<circle cx="185" cy="186" r="2.2" fill="currentColor"/>
<line x1="367" y1="200" x2="367" y2="186" stroke="currentColor" stroke-width="1"/>
<circle cx="367" cy="186" r="2.2" fill="currentColor"/>
<line x1="381" y1="200" x2="381" y2="186" stroke="currentColor" stroke-width="1"/>
<circle cx="381" cy="186" r="2.2" fill="currentColor"/>
<line x1="395" y1="200" x2="395" y2="186" stroke="currentColor" stroke-width="1"/>
<circle cx="395" cy="186" r="2.2" fill="currentColor"/>
<line x1="185" y1="186" x2="395" y2="186" stroke="currentColor" stroke-width="1"/>
<polyline points="185,186 66,186 66,210 80,210" fill="none" stroke="currentColor" stroke-width="1"/>
<polygon points="80,210 73.6,212.7 73.6,207.3" fill="currentColor"/>
<text x="60" y="190" font-size="13" text-anchor="end">⊕</text>
<polyline points="346,60 430,60 462,135" fill="none" stroke="currentColor" stroke-width="1.1"/>
<polyline points="388,135 430,135 462,135" fill="none" stroke="currentColor" stroke-width="1.1"/>
<polyline points="402,210 430,210 462,135" fill="none" stroke="currentColor" stroke-width="1.1"/>
<circle cx="470" cy="135" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="461" y1="135" x2="479" y2="135" class="acc" stroke-width="1.4"/>
<line x1="470" y1="126" x2="470" y2="144" class="acc" stroke-width="1.4"/>
<line x1="479" y1="135" x2="540" y2="135" class="acc" stroke-width="1.4"/>
<polygon points="540,135 533.6,137.7 533.6,132.3" class="acc-fill"/>
<text x="548" y="140" font-size="13" text-anchor="start" class="acc-fill">keystream</text>
<rect x="470" y="220" width="170" height="50" rx="4" class="soft"/>
<rect x="470" y="220" width="170" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="241.6" font-size="13" text-anchor="middle">majority of the 3</text>
<text x="555" y="257.6" font-size="13" text-anchor="middle">clocking bits</text>
<text x="300" y="285" font-size="13" text-anchor="middle">a register steps only if its accent bit agrees with the majority</text>
</svg>
<figcaption>Figure 5.8. A5/1, the GSM cipher. Each register's tap cells (dots) are XORed back into cell 0; the accent cells decide, by majority vote, which registers step. With 64 bits of state in all, it fell to time-memory trade-offs.</figcaption>
</figure>

!!! note "Life story: A5/1"
    **Born:** late 1980s, for the European GSM mobile standard, and kept secret
    · **Purpose:** encrypt calls over the air between a phone and the base
    station · **Helped:** protected the calls of the first digital mobile
    networks, used by billions of people · **Broken:** reverse-engineered in 1999;
    attacks in 2000; public rainbow tables in 2009 · **Status:** still met on
    old 2G networks; replaced by KASUMI-based A5/3 and then by the 3G and 4G
    ciphers of §5.9

## 5.5 RC4: fast, simple and biased

*Level: intermediate.* In 1987 Ron Rivest designed a stream cipher for RSA Data
Security with no shift registers at all. **RC4** ("Rivest Cipher 4") keeps a
permutation of the 256 byte values, shuffles it with the key, and then keeps
shuffling while it reads out bytes. It was a trade secret until September 1994,
when its source code was posted anonymously to the Cypherpunks mailing list. It
went into Lotus Notes, Netscape's SSL, Wi-Fi (WEP and
WPA's TKIP), Microsoft's Kerberos and Office, PDF encryption, and TLS. Its appeal
is that it fits in ten lines and runs fast on any processor, with no special
hardware.

**The algorithm.** The state is a permutation $S$ of $0, 1, \ldots, 255$ and two
indexes $i, j$.

$$
\begin{aligned}
&\textbf{Key schedule (KSA):} && S = [0, 1, \ldots, 255],\ j = 0; \text{ for } i = 0 \ldots 255:\ j \leftarrow j + S[i] + K[i \bmod \ell],\ \text{swap } S[i], S[j] \\
&\textbf{Output (PRGA):} && i \leftarrow i + 1,\ j \leftarrow j + S[i],\ \text{swap } S[i], S[j],\ \text{output } S[S[i] + S[j]]
\end{aligned}
$$

All additions are $\bmod 256$, and $\ell$ is the key length in bytes (5 to 256).

**By hand, with 8 entries.** Shrink everything from 256 to 8 (all arithmetic
$\bmod 8$) and use the key $K = [2, 5, 1]$. The key schedule:

| $i$ | $j \leftarrow j + S[i] + K[i \bmod 3]$ | $S$ after the swap |
|---|---|---|
| 0 | $0 + 0 + 2 = 2$ | `2 1 0 3 4 5 6 7` |
| 1 | $2 + 1 + 5 = 8 \to 0$ | `1 2 0 3 4 5 6 7` |
| 2 | $0 + 0 + 1 = 1$ | `1 0 2 3 4 5 6 7` |
| 3 | $1 + 3 + 2 = 6$ | `1 0 2 6 4 5 3 7` |
| 4 | $6 + 4 + 5 = 15 \to 7$ | `1 0 2 6 7 5 3 4` |
| 5 | $7 + 5 + 1 = 13 \to 5$ | `1 0 2 6 7 5 3 4` |
| 6 | $5 + 3 + 2 = 10 \to 2$ | `1 0 3 6 7 5 2 4` |
| 7 | $2 + 4 + 5 = 11 \to 3$ | `1 0 3 4 7 5 2 6` |

Then output, starting again from $i = j = 0$:

| $i$ | $j \leftarrow j + S[i]$ | $S$ after the swap | $t = S[i] + S[j]$ | Output $S[t]$ |
|---|---|---|---|---|
| 1 | $0 + 0 = 0$ | `0 1 3 4 7 5 2 6` | $1 + 0 = 1$ | 1 |
| 2 | $0 + 3 = 3$ | `0 1 4 3 7 5 2 6` | $4 + 3 = 7$ | 6 |
| 3 | $3 + 3 = 6$ | `0 1 4 2 7 5 3 6` | $2 + 3 = 5$ | 5 |

The keystream starts 1, 6, 5, 5, 7. Real RC4 is the same with 256 entries and
whole bytes.

<figure class="mars-fig">
<svg viewBox="0 0 620 300" width="620" role="img" aria-label="One RC4 output step with 8 entries: i and j move, S[i] and S[j] swap, and S[S[i]+S[j]] is output" fill="currentColor" font-size="13">
<text x="310" y="14" font-size="13.5" text-anchor="middle">this step:  i = 1 + 1 = 2,   j = 0 + S[2] = 0 + 3 = 3</text>
<text x="147" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">0</text>
<text x="201" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">1</text>
<text x="255" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">2</text>
<text x="309" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">3</text>
<text x="363" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">4</text>
<text x="417" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">5</text>
<text x="471" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">6</text>
<text x="525" y="42" font-size="12.5" text-anchor="middle" fill-opacity="0.75">7</text>
<text x="106" y="42" font-size="12.5" text-anchor="end" fill-opacity="0.75">index</text>
<text x="106" y="76" font-size="13" text-anchor="end">S before</text>
<rect x="120" y="50" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="147" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="174" y="50" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="201" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="228" y="50" width="54" height="40" rx="4" class="soft-acc"/>
<rect x="228" y="50" width="54" height="40" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="255" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">3</text>
<rect x="282" y="50" width="54" height="40" rx="4" class="soft-acc"/>
<rect x="282" y="50" width="54" height="40" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="309" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">4</text>
<rect x="336" y="50" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="363" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">7</text>
<rect x="390" y="50" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="417" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">5</text>
<rect x="444" y="50" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="471" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">2</text>
<rect x="498" y="50" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525" y="76" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">6</text>
<text x="255" y="108" font-size="13" text-anchor="middle" class="acc-fill">i = 2</text>
<text x="313" y="108" font-size="13" text-anchor="middle" class="acc-fill">j = 3</text>
<path d="M 255 116 C 255 134, 309 134, 309 156" fill="none" stroke="currentColor" stroke-width="1.2"/>
<path d="M 309 116 C 309 134, 255 134, 255 156" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="390" y="140" font-size="13" text-anchor="middle">swap</text>
<text x="106" y="184" font-size="13" text-anchor="end">S after</text>
<rect x="120" y="158" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="147" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="174" y="158" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="201" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="228" y="158" width="54" height="40" rx="4" class="soft-acc"/>
<rect x="228" y="158" width="54" height="40" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="255" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">4</text>
<rect x="282" y="158" width="54" height="40" rx="4" class="soft-acc"/>
<rect x="282" y="158" width="54" height="40" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="309" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">3</text>
<rect x="336" y="158" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="363" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">7</text>
<rect x="390" y="158" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="417" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">5</text>
<rect x="444" y="158" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="471" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">2</text>
<rect x="498" y="158" width="54" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525" y="183.9" font-size="17" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">6</text>
<rect x="498" y="158" width="54" height="40" rx="3" fill="none" class="acc" stroke-width="3"/>
<text x="300" y="230" font-size="14" text-anchor="middle">t = S[2] + S[3] = 4 + 3 = 7</text>
<polyline points="525,198 525,262" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="525,262 522.3,255.6 527.7,255.6" class="acc-fill"/>
<text x="515" y="280" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">output S[7] = 6</text>
</svg>
<figcaption>Figure 5.9. The second output step of the 8-entry RC4 worked by hand. Every step makes exactly one swap, so the table stays a permutation while it drifts.</figcaption>
</figure>

**Code it.** This version is checked against the test vectors of RFC 6229, then
used to count how often the **second** output byte is zero over 65,536 different
keys. A fair byte would be zero $65536 / 256 = 256$ times.

```python
import hashlib

def rc4(key, n):
    S, j = list(range(256)), 0
    for i in range(256):                  # key schedule: shuffle S with the key
        j = (j + S[i] + key[i % len(key)]) % 256
        S[i], S[j] = S[j], S[i]
    i = j = 0
    out = []
    for _ in range(n):                    # keystream: one swap, one byte out
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        out.append(S[(S[i] + S[j]) % 256])
    return bytes(out)

print(rc4(bytes([1, 2, 3, 4, 5]), 8).hex())   # b2396305f03dc027, as in RFC 6229

N = 65536
keys = (hashlib.sha256(i.to_bytes(4, "big")).digest()[:16] for i in range(N))
print(sum(rc4(k, 2)[1] == 0 for k in keys), N // 256)   # 480 256
```

The second byte is zero almost twice as often as it should be. Itsik Mantin and
Adi Shamir proved in 2001 that the probability is about $2/256$, not $1/256$. That
one bias is enough to tell RC4 from random after a few hundred keys, and it is
far from the only one: the first 256 bytes are full of smaller biases, and some
pairs of bytes appear together too often throughout the stream.

<figure class="mars-fig">
<svg viewBox="0 0 620 290" width="620" role="img" aria-label="How often each value 0 to 255 is RC4's second output byte over 65,536 keys; zero appears 480 times instead of about 256" fill="currentColor" font-size="13">
<line x1="58" y1="240" x2="576" y2="240" stroke="currentColor" stroke-width="1.4"/>
<line x1="58" y1="240" x2="58" y2="20" stroke="currentColor" stroke-width="1.4"/>
<line x1="53" y1="240" x2="58" y2="240" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="244" font-size="12.5" text-anchor="end">0</text>
<line x1="53" y1="200" x2="58" y2="200" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="204" font-size="12.5" text-anchor="end">100</text>
<line x1="53" y1="160" x2="58" y2="160" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="164" font-size="12.5" text-anchor="end">200</text>
<line x1="53" y1="120" x2="58" y2="120" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="124" font-size="12.5" text-anchor="end">300</text>
<line x1="53" y1="80" x2="58" y2="80" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="84" font-size="12.5" text-anchor="end">400</text>
<line x1="53" y1="40" x2="58" y2="40" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="44" font-size="12.5" text-anchor="end">500</text>
<text x="61" y="258" font-size="12.5" text-anchor="middle">0</text>
<text x="189" y="258" font-size="12.5" text-anchor="middle">64</text>
<text x="317" y="258" font-size="12.5" text-anchor="middle">128</text>
<text x="445" y="258" font-size="12.5" text-anchor="middle">192</text>
<text x="571" y="258" font-size="12.5" text-anchor="middle">255</text>
<rect x="60" y="48" width="1.6" height="192" rx="0" class="acc-fill" fill-opacity="1"/>
<rect x="62" y="146.8" width="1.6" height="93.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="64" y="148.4" width="1.6" height="91.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="66" y="140" width="1.6" height="100" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="68" y="131.2" width="1.6" height="108.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="70" y="144.8" width="1.6" height="95.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="72" y="127.2" width="1.6" height="112.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="74" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="76" y="140" width="1.6" height="100" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="78" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="80" y="131.6" width="1.6" height="108.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="82" y="131.6" width="1.6" height="108.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="84" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="86" y="136" width="1.6" height="104" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="88" y="131.6" width="1.6" height="108.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="90" y="131.2" width="1.6" height="108.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="92" y="141.6" width="1.6" height="98.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="94" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="96" y="131.6" width="1.6" height="108.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="98" y="136.4" width="1.6" height="103.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="100" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="102" y="148.8" width="1.6" height="91.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="104" y="126.4" width="1.6" height="113.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="106" y="122" width="1.6" height="118" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="108" y="131.2" width="1.6" height="108.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="110" y="132.8" width="1.6" height="107.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="112" y="136.8" width="1.6" height="103.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="114" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="116" y="137.6" width="1.6" height="102.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="118" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="120" y="133.2" width="1.6" height="106.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="122" y="143.2" width="1.6" height="96.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="124" y="128.8" width="1.6" height="111.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="126" y="133.2" width="1.6" height="106.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="128" y="128.4" width="1.6" height="111.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="130" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="132" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="134" y="132.4" width="1.6" height="107.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="136" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="138" y="132.4" width="1.6" height="107.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="140" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="142" y="148.8" width="1.6" height="91.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="144" y="147.6" width="1.6" height="92.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="146" y="136.8" width="1.6" height="103.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="148" y="131.6" width="1.6" height="108.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="150" y="142.4" width="1.6" height="97.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="152" y="141.2" width="1.6" height="98.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="154" y="145.2" width="1.6" height="94.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="156" y="136.8" width="1.6" height="103.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="158" y="144" width="1.6" height="96" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="160" y="144.4" width="1.6" height="95.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="162" y="144.4" width="1.6" height="95.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="164" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="166" y="146" width="1.6" height="94" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="168" y="145.6" width="1.6" height="94.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="170" y="133.6" width="1.6" height="106.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="172" y="136" width="1.6" height="104" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="174" y="132.4" width="1.6" height="107.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="176" y="138.8" width="1.6" height="101.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="178" y="137.6" width="1.6" height="102.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="180" y="142.4" width="1.6" height="97.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="182" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="184" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="186" y="133.6" width="1.6" height="106.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="188" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="190" y="139.2" width="1.6" height="100.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="192" y="133.2" width="1.6" height="106.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="194" y="122.8" width="1.6" height="117.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="196" y="135.6" width="1.6" height="104.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="198" y="148" width="1.6" height="92" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="200" y="141.6" width="1.6" height="98.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="202" y="140" width="1.6" height="100" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="204" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="206" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="208" y="145.6" width="1.6" height="94.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="210" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="212" y="124" width="1.6" height="116" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="214" y="137.6" width="1.6" height="102.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="216" y="142.4" width="1.6" height="97.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="218" y="136" width="1.6" height="104" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="220" y="152.8" width="1.6" height="87.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="222" y="138.4" width="1.6" height="101.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="224" y="127.6" width="1.6" height="112.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="226" y="149.2" width="1.6" height="90.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="228" y="127.2" width="1.6" height="112.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="230" y="142" width="1.6" height="98" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="232" y="130.8" width="1.6" height="109.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="234" y="124" width="1.6" height="116" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="236" y="153.6" width="1.6" height="86.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="238" y="141.6" width="1.6" height="98.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="240" y="136" width="1.6" height="104" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="242" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="244" y="146.4" width="1.6" height="93.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="246" y="144" width="1.6" height="96" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="248" y="128.4" width="1.6" height="111.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="250" y="152.8" width="1.6" height="87.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="252" y="140.8" width="1.6" height="99.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="254" y="142.8" width="1.6" height="97.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="256" y="128.4" width="1.6" height="111.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="258" y="132.8" width="1.6" height="107.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="260" y="131.2" width="1.6" height="108.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="262" y="133.6" width="1.6" height="106.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="264" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="266" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="268" y="137.6" width="1.6" height="102.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="270" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="272" y="145.2" width="1.6" height="94.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="274" y="139.6" width="1.6" height="100.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="276" y="144.8" width="1.6" height="95.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="278" y="142" width="1.6" height="98" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="280" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="282" y="131.2" width="1.6" height="108.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="284" y="145.2" width="1.6" height="94.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="286" y="124.8" width="1.6" height="115.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="288" y="133.2" width="1.6" height="106.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="290" y="146.8" width="1.6" height="93.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="292" y="135.6" width="1.6" height="104.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="294" y="145.6" width="1.6" height="94.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="296" y="144" width="1.6" height="96" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="298" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="300" y="144.8" width="1.6" height="95.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="302" y="125.6" width="1.6" height="114.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="304" y="127.2" width="1.6" height="112.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="306" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="308" y="141.2" width="1.6" height="98.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="310" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="312" y="145.6" width="1.6" height="94.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="314" y="135.6" width="1.6" height="104.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="316" y="138.4" width="1.6" height="101.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="318" y="138.4" width="1.6" height="101.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="320" y="139.2" width="1.6" height="100.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="322" y="148.8" width="1.6" height="91.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="324" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="326" y="124.4" width="1.6" height="115.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="328" y="150.8" width="1.6" height="89.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="330" y="123.2" width="1.6" height="116.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="332" y="144" width="1.6" height="96" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="334" y="144" width="1.6" height="96" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="336" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="338" y="138.8" width="1.6" height="101.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="340" y="131.6" width="1.6" height="108.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="342" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="344" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="346" y="141.2" width="1.6" height="98.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="348" y="145.6" width="1.6" height="94.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="350" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="352" y="128.8" width="1.6" height="111.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="354" y="129.2" width="1.6" height="110.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="356" y="143.2" width="1.6" height="96.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="358" y="128.4" width="1.6" height="111.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="360" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="362" y="147.2" width="1.6" height="92.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="364" y="126.4" width="1.6" height="113.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="366" y="143.2" width="1.6" height="96.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="368" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="370" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="372" y="148" width="1.6" height="92" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="374" y="134" width="1.6" height="106" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="376" y="133.2" width="1.6" height="106.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="378" y="138.4" width="1.6" height="101.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="380" y="142.4" width="1.6" height="97.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="382" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="384" y="136.8" width="1.6" height="103.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="386" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="388" y="136.4" width="1.6" height="103.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="390" y="146" width="1.6" height="94" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="392" y="144.8" width="1.6" height="95.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="394" y="136" width="1.6" height="104" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="396" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="398" y="128" width="1.6" height="112" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="400" y="151.2" width="1.6" height="88.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="402" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="404" y="136.8" width="1.6" height="103.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="406" y="130.8" width="1.6" height="109.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="408" y="136.8" width="1.6" height="103.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="410" y="139.2" width="1.6" height="100.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="412" y="140" width="1.6" height="100" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="414" y="132.8" width="1.6" height="107.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="416" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="418" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="420" y="141.2" width="1.6" height="98.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="422" y="124.4" width="1.6" height="115.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="424" y="138.8" width="1.6" height="101.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="426" y="124" width="1.6" height="116" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="428" y="134" width="1.6" height="106" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="430" y="136" width="1.6" height="104" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="432" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="434" y="137.6" width="1.6" height="102.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="436" y="134.4" width="1.6" height="105.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="438" y="131.6" width="1.6" height="108.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="440" y="142.4" width="1.6" height="97.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="442" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="444" y="138.8" width="1.6" height="101.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="446" y="140.8" width="1.6" height="99.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="448" y="134.4" width="1.6" height="105.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="450" y="125.6" width="1.6" height="114.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="452" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="454" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="456" y="136" width="1.6" height="104" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="458" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="460" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="462" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="464" y="129.2" width="1.6" height="110.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="466" y="132" width="1.6" height="108" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="468" y="136.4" width="1.6" height="103.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="470" y="128.8" width="1.6" height="111.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="472" y="141.2" width="1.6" height="98.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="474" y="155.6" width="1.6" height="84.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="476" y="132" width="1.6" height="108" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="478" y="136.4" width="1.6" height="103.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="480" y="133.6" width="1.6" height="106.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="482" y="134" width="1.6" height="106" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="484" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="486" y="140" width="1.6" height="100" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="488" y="144.4" width="1.6" height="95.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="490" y="144.4" width="1.6" height="95.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="492" y="151.2" width="1.6" height="88.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="494" y="126.8" width="1.6" height="113.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="496" y="149.2" width="1.6" height="90.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="498" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="500" y="142.4" width="1.6" height="97.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="502" y="132" width="1.6" height="108" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="504" y="133.6" width="1.6" height="106.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="506" y="142" width="1.6" height="98" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="508" y="132.4" width="1.6" height="107.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="510" y="151.6" width="1.6" height="88.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="512" y="150.4" width="1.6" height="89.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="514" y="137.6" width="1.6" height="102.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="516" y="142" width="1.6" height="98" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="518" y="154.8" width="1.6" height="85.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="520" y="132" width="1.6" height="108" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="522" y="135.2" width="1.6" height="104.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="524" y="134.8" width="1.6" height="105.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="526" y="140.4" width="1.6" height="99.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="528" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="530" y="147.6" width="1.6" height="92.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="532" y="134.4" width="1.6" height="105.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="534" y="139.2" width="1.6" height="100.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="536" y="140" width="1.6" height="100" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="538" y="142.4" width="1.6" height="97.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="540" y="138.4" width="1.6" height="101.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="542" y="130" width="1.6" height="110" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="544" y="138" width="1.6" height="102" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="546" y="148.4" width="1.6" height="91.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="548" y="139.2" width="1.6" height="100.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="550" y="133.6" width="1.6" height="106.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="552" y="146.8" width="1.6" height="93.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="554" y="137.2" width="1.6" height="102.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="556" y="139.2" width="1.6" height="100.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="558" y="132.4" width="1.6" height="107.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="560" y="133.2" width="1.6" height="106.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="562" y="134" width="1.6" height="106" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="564" y="143.6" width="1.6" height="96.4" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="566" y="140.8" width="1.6" height="99.2" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="568" y="136.4" width="1.6" height="103.6" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="570" y="141.2" width="1.6" height="98.8" rx="0" fill="currentColor" fill-opacity="0.5"/>
<line x1="58" y1="137.6" x2="576" y2="137.6" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="574" y="131.6" font-size="12.5" text-anchor="end">fair: 256</text>
<text x="70" y="53" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">value 0: 480</text>
<text x="318" y="282" font-size="13" text-anchor="middle">value of the second output byte</text>
</svg>
<figcaption>Figure 5.10. The Mantin-Shamir bias, measured with the code above. Every other value sits within the normal random spread (211 to 295); zero comes up almost twice as often as it should.</figcaption>
</figure>

The leak in 1994 is an odd moment in the cipher's life. RSA Data Security had
licensed RC4 to companies under strict secrecy, and the anonymous posting was
checked against licensed products and found to give the same output. Because
"RC4" was RSA's trademark, the leaked algorithm circulated under the name
"alleged RC4", or ARCFOUR, which is why the OpenBSD function is called
`arc4random`. From then on anyone could use it, and its ten lines spread into
almost everything.

## 5.6 How RC4 failed: WEP and TLS

*Level: intermediate.*

### WEP

The first Wi-Fi standard, IEEE 802.11 (1997), protected wireless traffic with
**WEP**, "Wired Equivalent Privacy". Every device on a network shared one secret
key, 40 bits (later 104). For each packet, the sender picked a 24-bit
**initialization vector** (IV), sent it in the clear, and used the RC4 key

$$
K = \mathit{IV} \,\Vert\, \mathit{secret}.
$$

That is a nonce, so far so good. It went wrong in three ways.

1. **The IV was too short.** With $2^{24}$ possible IVs, a busy network repeats
   one after about 5,000 packets by the birthday bound ($\sqrt{2 \ln 2 \cdot 2^{24}} \approx 4{,}823$),
   and every repeat is a two-time pad.
2. **The integrity check was linear.** WEP appended a CRC-32 checksum, which is
   linear in the message, so an attacker could flip message bits and fix the
   checksum without knowing anything.
3. **RC4's key schedule leaks related keys.** In 2001 Scott Fluhrer, Itsik Mantin
   and Adi Shamir found that when the first key bytes are public and follow a
   pattern, the first output byte depends on the first secret key byte far more
   than it should. Every WEP packet begins with the same header byte, `0xAA`, so
   its first keystream byte is known.

<figure class="mars-fig">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="WEP: the 24-bit IV is sent in the clear and prepended to the shared secret to form the RC4 key" fill="currentColor" font-size="13">
<rect x="30" y="30" width="110" height="34" rx="4" class="soft-acc"/>
<rect x="30" y="30" width="110" height="34" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="85" y="51.5" font-size="13" text-anchor="middle">IV (24 bits)</text>
<rect x="140" y="30" width="170" height="34" rx="4" class="soft"/>
<rect x="140" y="30" width="170" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="225" y="51.5" font-size="13" text-anchor="middle">shared secret (40 or 104)</text>
<text x="170" y="20" font-size="13" text-anchor="middle">RC4 key = IV ‖ secret</text>
<line x1="140" y1="64" x2="140" y2="92" stroke="currentColor" stroke-width="1.4"/>
<polygon points="140,92 137.3,85.6 142.7,85.6" fill="currentColor"/>
<rect x="90" y="92" width="100" height="34" rx="4" class="soft"/>
<rect x="90" y="92" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="113.5" font-size="13" text-anchor="middle">RC4</text>
<line x1="190" y1="109" x2="300" y2="109" stroke="currentColor" stroke-width="1.4"/>
<polygon points="300,109 293.6,111.7 293.6,106.3" fill="currentColor"/>
<text x="245" y="101" font-size="12.5" text-anchor="middle">keystream</text>
<circle cx="310" cy="109" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="301" y1="109" x2="319" y2="109" stroke="currentColor" stroke-width="1.4"/>
<line x1="310" y1="100" x2="310" y2="118" stroke="currentColor" stroke-width="1.4"/>
<rect x="380" y="30" width="140" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="450" y="51.5" font-size="13" text-anchor="middle">data</text>
<rect x="520" y="30" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="570" y="51.5" font-size="13" text-anchor="middle">CRC-32</text>
<text x="500" y="20" font-size="13" text-anchor="middle">plaintext + linear checksum</text>
<polyline points="450,64 450,80 310,80 310,100" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="310,100 307.3,93.6 312.7,93.6" fill="currentColor"/>
<line x1="310" y1="118" x2="310" y2="160" stroke="currentColor" stroke-width="1.4"/>
<polygon points="310,160 307.3,153.6 312.7,153.6" fill="currentColor"/>
<rect x="30" y="165" width="110" height="34" rx="4" class="soft-acc"/>
<rect x="30" y="165" width="110" height="34" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="85" y="186.6" font-size="13" text-anchor="middle">IV</text>
<rect x="140" y="165" width="480" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="380" y="186.6" font-size="13" text-anchor="middle">ciphertext of data + CRC-32</text>
<text x="330" y="225" font-size="13" text-anchor="middle">the packet on the air: the IV is in the clear, and the first</text>
<text x="330" y="243" font-size="13" text-anchor="middle">plaintext byte is always 0xAA, so the first keystream byte is known</text>
</svg>
<figcaption>Figure 5.11. How WEP encrypted a packet. Three weaknesses are visible: a 24-bit IV that soon repeats, a related RC4 key for every packet, and a linear checksum.</figcaption>
</figure>

The **FMS attack** works like this. Take IVs of the form $(A + 3, 255, x)$. The
attacker knows the first $A + 3$ key bytes (the IV plus the secret bytes already
found), so it can run the first $A + 3$ steps of the key schedule itself. In
about 5% of cases, the rest of the key schedule leaves those entries alone, and
then the first output byte gives away the next key byte directly. Each IV casts
a vote; the right byte gets about 5% of the votes and the others share the rest.

```python
secret = b"\x1f\x9a\x42\xc3\x07"          # the network's 40-bit WEP key

def sniff(iv):                            # one packet: the IV, and its first keystream byte
    return rc4(iv + secret, 1)[0]         # (known, because every packet starts with 0xAA)

known = []
for A in range(len(secret)):              # recover key byte A
    votes = [0] * 256
    for x in range(256):
        iv = bytes([A + 3, 255, x])       # a "weak" IV
        K = iv + bytes(known)
        S, j = list(range(256)), 0
        for i in range(A + 3):            # run the key schedule as far as we know the key
            j = (j + S[i] + K[i]) % 256
            S[i], S[j] = S[j], S[i]
        votes[(S.index(sniff(iv)) - j - S[A + 3]) % 256] += 1
    known.append(max(range(256), key=votes.__getitem__))
print(bytes(known).hex(), bytes(known) == secret)   # 1f9a42c307 True
```

Here 256 packets per key byte were enough (for the second byte, by 7 votes to 6,
a narrow win; a real attacker collects more weak IVs and tries the runners-up).
Adam Stubblefield, John Ioannidis and Aviel Rubin carried out the attack against
a real network within weeks of the paper. In 2007 Erik Tews, Ralf-Philipp
Weinmann and Andrei Pyshkin used more of RC4's biases to recover a 104-bit key
from about 40,000 packets, collected in about a minute, with probability one
half.

<figure class="mars-fig">
<svg viewBox="0 0 620 250" width="620" role="img" aria-label="FMS votes for the first secret key byte from 256 weak IVs; the right value 0x1f gets 11 votes" fill="currentColor" font-size="13">
<line x1="58" y1="210" x2="576" y2="210" stroke="currentColor" stroke-width="1.4"/>
<line x1="58" y1="210" x2="58" y2="25" stroke="currentColor" stroke-width="1.4"/>
<line x1="53" y1="210" x2="58" y2="210" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="214" font-size="12.5" text-anchor="end">0</text>
<line x1="53" y1="154" x2="58" y2="154" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="158" font-size="12.5" text-anchor="end">4</text>
<line x1="53" y1="98" x2="58" y2="98" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="102" font-size="12.5" text-anchor="end">8</text>
<line x1="53" y1="42" x2="58" y2="42" stroke="currentColor" stroke-width="1.4"/>
<text x="48" y="46" font-size="12.5" text-anchor="end">12</text>
<text x="61" y="228" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">00</text>
<text x="189" y="228" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">40</text>
<text x="317" y="228" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">80</text>
<text x="445" y="228" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">c0</text>
<text x="571" y="228" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">ff</text>
<rect x="66" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="68" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="72" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="74" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="76" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="78" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="80" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="82" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="84" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="86" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="88" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="90" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="96" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="102" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="104" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="110" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="112" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="114" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="122" y="56" width="1.6" height="154" rx="0" class="acc-fill" fill-opacity="1"/>
<rect x="124" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="130" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="132" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="136" y="140" width="1.6" height="70" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="140" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="142" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="144" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="154" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="156" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="158" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="162" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="168" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="170" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="174" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="176" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="180" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="184" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="190" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="192" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="194" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="198" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="202" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="206" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="208" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="210" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="212" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="216" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="220" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="222" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="224" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="226" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="228" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="232" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="238" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="248" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="250" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="254" y="126" width="1.6" height="84" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="256" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="258" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="260" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="266" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="268" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="272" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="280" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="282" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="284" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="286" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="290" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="298" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="300" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="304" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="306" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="308" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="312" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="316" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="318" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="322" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="324" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="326" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="328" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="330" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="336" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="338" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="340" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="342" y="154" width="1.6" height="56" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="344" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="348" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="350" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="356" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="362" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="366" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="370" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="372" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="374" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="376" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="388" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="392" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="394" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="398" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="404" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="408" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="410" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="412" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="414" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="416" y="154" width="1.6" height="56" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="418" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="428" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="430" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="434" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="440" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="442" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="444" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="448" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="450" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="452" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="454" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="456" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="466" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="468" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="472" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="476" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="480" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="482" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="486" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="488" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="490" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="492" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="494" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="498" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="502" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="504" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="506" y="154" width="1.6" height="56" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="508" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="512" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="514" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="516" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="518" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="528" y="154" width="1.6" height="56" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="530" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="532" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="534" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="538" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="546" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="548" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="554" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="556" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="564" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="566" y="196" width="1.6" height="14" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="568" y="182" width="1.6" height="28" rx="0" fill="currentColor" fill-opacity="0.5"/>
<rect x="570" y="168" width="1.6" height="42" rx="0" fill="currentColor" fill-opacity="0.5"/>
<text x="130" y="60" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">0x1f: 11 votes</text>
<text x="318" y="247" font-size="13" text-anchor="middle">candidate value of secret key byte 0</text>
</svg>
<figcaption>Figure 5.12. The FMS attack's vote for the first byte of the WEP key in the code above. The right value wins 11 to 6; real attackers gathered thousands of weak IVs, which made the gap overwhelming.</figcaption>
</figure>

The FMS paper came from three people at two places: Scott Fluhrer worked at
Cisco Systems, and Itsik Mantin was Adi Shamir's student at the Weizmann
Institute in Israel. The first working attack came from Adam Stubblefield, a
Rice University undergraduate on a summer internship at AT&T Labs, with John
Ioannidis and Aviel Rubin. Free tools such as AirSnort followed within weeks,
and "WEP cracking" became a party trick.

It had real victims. The breach of the American retailer TJX, disclosed in 2007,
began with attackers breaking the WEP network of one of its stores, and ended
with about 45 million payment card numbers stolen. Wi-Fi moved first to **WPA**
(2003), which kept RC4 but mixed a fresh key for every packet (TKIP) as a stopgap
for old hardware, and then to **WPA2** (2004), which uses AES in a mode you will
meet in [Chapter 8](08-Modes-of-Operation.md).

!!! note "Life story: WEP"
    **Born:** 1997, in the first IEEE 802.11 Wi-Fi standard · **Purpose:**
    "wired equivalent privacy", making a radio network as private as a cable
    · **Helped:** the first security of millions of home and office networks
    · **Broken:** 2001 (FMS, then Stubblefield's working attack); by 2007 a
    104-bit key fell in about a minute · **Replaced by:** WPA with TKIP (2003)
    as a stopgap, then WPA2 with AES (2004)

### TLS

RC4 did not depend on WEP's mistakes to fail. In TLS each connection gets a
fresh, unrelated key, so the FMS attack does not apply. But the browser sends
the same secret, a cookie or a password, in many connections, and RC4's biases
in the first 256 bytes pull each encrypted copy slightly toward particular
values. In 2013 Nadhem AlFardan, Daniel J. Bernstein, Kenneth Paterson, Bertram
Poettering and Jacob Schuldt showed that with enough copies, on the order of
$2^{24}$ to $2^{32}$ connections, the plaintext can be recovered byte by byte. In
2015 Mathy Vanhoef and Frank Piessens ("RC4 NOMORE") recovered a website cookie
in 75 hours. RFC 7465 (2015) forbade RC4 in TLS, and the major browsers removed it
in early 2016.

The lesson: a stream cipher whose output can be told from random, even slightly,
will eventually leak plaintext when the same secret is encrypted often enough.

Rivest himself returned to the design in 2014: with Jacob Schuldt he proposed
Spritz, an RC4-like cipher repaired with the lessons of the attacks. By then the
world had moved on to ChaCha20 and AES.

!!! note "Life story: RC4"
    **Born:** 1987, Ron Rivest at RSA Data Security (a trade secret until the
    1994 leak) · **Purpose:** a tiny, fast software stream cipher that needed no
    special hardware · **Helped:** SSL and TLS, WEP and WPA, Lotus Notes,
    Microsoft Office, PDF and Kerberos; for twenty years the most used stream
    cipher in the world · **Retired:** RFC 7465 banned it in TLS in 2015 and
    browsers removed it in 2016, after biases found from 2001 (Mantin and
    Shamir) to 2015 (RC4 NOMORE) recovered real plaintext · **Replaced by:**
    AES-GCM and ChaCha20-Poly1305

## 5.7 ChaCha20: a modern stream cipher

*Level: intermediate.* From 2004 to 2008 the European network ECRYPT ran
**eSTREAM**, a competition for new stream ciphers. Its final portfolio had
two lists: for software, HC-128, Rabbit, Salsa20/12 and SOSEMANUK; for small
hardware, Grain, MICKEY and Trivium. The design that went furthest was Daniel J.
Bernstein's **Salsa20** (2005), and its refinement **ChaCha** (2008).

Bernstein was already famous before he designed a cipher. As a graduate student
at the University of California, Berkeley, in 1995 he sued the US government
over export rules that treated his encryption program, Snuffle, as a weapon, and
the courts ruled that source code is protected speech. He designed Salsa20 for
speed in plain software and for simplicity: no tables, no secret-dependent
branches, only operations that every processor does in constant time. ChaCha,
three years later, changed the order of the operations so that each step spreads
its changes faster, and the same number of rounds buys more mixing.

Salsa20 and ChaCha are not shift registers and do not keep a changing state at
all. They are **counter-based**: a function takes the key, the nonce and a block
number, and returns 64 bytes of keystream for that block. Block 7 can be
computed without computing blocks 1 to 6, which makes the cipher parallel and
lets a receiver decrypt any part of a stream directly.

### The state

ChaCha20 (as specified in RFC 8439) arranges sixteen 32-bit words in a
$4 \times 4$ grid:

$$
\begin{bmatrix}
\text{"expa"} & \text{"nd 3"} & \text{"2-by"} & \text{"te k"} \\
k_0 & k_1 & k_2 & k_3 \\
k_4 & k_5 & k_6 & k_7 \\
\mathit{counter} & n_0 & n_1 & n_2
\end{bmatrix}
$$

The first row is the constant text "expand 32-byte k", then the 256-bit key in
eight words, then a 32-bit block counter and a 96-bit nonce.

<figure class="mars-fig">
<svg viewBox="0 0 660 270" width="660" role="img" aria-label="ChaCha20 state as a 4 by 4 grid; a column round mixes columns, a diagonal round mixes diagonals" fill="currentColor" font-size="13">
<text x="150" y="24" font-size="13" text-anchor="middle" font-weight="bold">column round</text>
<rect x="20" y="40" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="20" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="52" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">expa</text>
<text x="52" y="82" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<rect x="85" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="117" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">nd 3</text>
<text x="117" y="82" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="150" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="182" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">2-by</text>
<text x="182" y="82" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="215" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="247" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">te k</text>
<text x="247" y="82" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<rect x="20" y="90" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="20" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="52" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k0</text>
<text x="52" y="132" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<rect x="85" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="117" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k1</text>
<text x="117" y="132" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="150" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="182" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k2</text>
<text x="182" y="132" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="215" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="247" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k3</text>
<text x="247" y="132" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<rect x="20" y="140" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="20" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="52" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k4</text>
<text x="52" y="182" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<rect x="85" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="117" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k5</text>
<text x="117" y="182" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="150" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="182" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k6</text>
<text x="182" y="182" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="215" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="247" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k7</text>
<text x="247" y="182" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<rect x="20" y="190" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="20" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="52" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">ctr</text>
<text x="52" y="232" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<rect x="85" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="117" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">n0</text>
<text x="117" y="232" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="150" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="182" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">n1</text>
<text x="182" y="232" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="215" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="247" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">n2</text>
<text x="247" y="232" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<text x="510" y="24" font-size="13" text-anchor="middle" font-weight="bold">diagonal round</text>
<rect x="380" y="40" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="380" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="412" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">expa</text>
<text x="412" y="82" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<rect x="445" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="477" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">nd 3</text>
<text x="477" y="82" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="510" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="542" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">2-by</text>
<text x="542" y="82" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="575" y="40" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="607" y="63" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">te k</text>
<text x="607" y="82" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<rect x="380" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="412" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k0</text>
<text x="412" y="132" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<rect x="445" y="90" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="445" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="477" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k1</text>
<text x="477" y="132" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<rect x="510" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="542" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k2</text>
<text x="542" y="132" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="575" y="90" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="607" y="113" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k3</text>
<text x="607" y="132" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="380" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="412" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k4</text>
<text x="412" y="182" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="445" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="477" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k5</text>
<text x="477" y="182" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<rect x="510" y="140" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="510" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="542" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k6</text>
<text x="542" y="182" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<rect x="575" y="140" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="607" y="163" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">k7</text>
<text x="607" y="182" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="380" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="412" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">ctr</text>
<text x="412" y="232" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 2</text>
<rect x="445" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="477" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">n0</text>
<text x="477" y="232" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 3</text>
<rect x="510" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="542" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">n1</text>
<text x="542" y="232" font-size="12" text-anchor="middle" fill-opacity="0.7">QR 4</text>
<rect x="575" y="190" width="65" height="50" rx="0" class="soft-acc"/>
<rect x="575" y="190" width="65" height="50" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="607" y="213" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">n2</text>
<text x="607" y="232" font-size="12" text-anchor="middle" class="acc-fill">QR 1</text>
<text x="330" y="262" font-size="13" text-anchor="middle">10 column rounds alternate with 10 diagonal rounds: 20 in all</text>
</svg>
<figcaption>Figure 5.13. The ChaCha20 state. Each round runs four quarter rounds (QR) at once; the shaded cells are the words that quarter round 1 mixes. Columns, then diagonals, so every word soon touches every other.</figcaption>
</figure>

### The quarter round

All the mixing is done by one small function on four words $a, b, c, d$. It uses
only three operations: **A**ddition $\bmod 2^{32}$, **R**otation of the bits of
a word, and **X**OR. Designs built this way are called **ARX**.

$$
\begin{aligned}
a &\leftarrow a + b, & d &\leftarrow (d \oplus a) \lll 16 \\
c &\leftarrow c + d, & b &\leftarrow (b \oplus c) \lll 12 \\
a &\leftarrow a + b, & d &\leftarrow (d \oplus a) \lll 8 \\
c &\leftarrow c + d, & b &\leftarrow (b \oplus c) \lll 7
\end{aligned}
$$

Why these three? XOR and rotation are linear over bits, and addition is not: the
carries make each output bit depend on all lower input bits in a nonlinear way.
Alternating them destroys the linear structure that killed LFSRs, and it costs
only a few instructions with no table lookups, so no secret-dependent memory
access for an attacker to time (see [Chapter 18](18-Side-Channels.md)).

<figure class="mars-fig">
<svg viewBox="0 0 520 470" width="520" role="img" aria-label="ChaCha quarter round: four lanes a b c d with additions, XORs and rotations by 16, 12, 8 and 7" fill="currentColor" font-size="13">
<text x="90" y="22" font-size="16" text-anchor="middle" font-weight="bold" font-style="italic">a</text>
<line x1="90" y1="30" x2="90" y2="440" stroke="currentColor" stroke-width="1.4"/>
<line x1="90" y1="430" x2="90" y2="455" stroke="currentColor" stroke-width="1.4"/>
<polygon points="90,455 87.3,448.6 92.7,448.6" fill="currentColor"/>
<text x="190" y="22" font-size="16" text-anchor="middle" font-weight="bold" font-style="italic">b</text>
<line x1="190" y1="30" x2="190" y2="440" stroke="currentColor" stroke-width="1.4"/>
<line x1="190" y1="430" x2="190" y2="455" stroke="currentColor" stroke-width="1.4"/>
<polygon points="190,455 187.3,448.6 192.7,448.6" fill="currentColor"/>
<text x="290" y="22" font-size="16" text-anchor="middle" font-weight="bold" font-style="italic">c</text>
<line x1="290" y1="30" x2="290" y2="440" stroke="currentColor" stroke-width="1.4"/>
<line x1="290" y1="430" x2="290" y2="455" stroke="currentColor" stroke-width="1.4"/>
<polygon points="290,455 287.3,448.6 292.7,448.6" fill="currentColor"/>
<text x="390" y="22" font-size="16" text-anchor="middle" font-weight="bold" font-style="italic">d</text>
<line x1="390" y1="30" x2="390" y2="440" stroke="currentColor" stroke-width="1.4"/>
<line x1="390" y1="430" x2="390" y2="455" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,455 387.3,448.6 392.7,448.6" fill="currentColor"/>
<rect x="81" y="51" width="18" height="18" rx="2" class="soft-acc"/>
<rect x="81" y="51" width="18" height="18" rx="2" fill="none" class="acc" stroke-width="1.4"/>
<line x1="84" y1="60" x2="96" y2="60" class="acc" stroke-width="1.4"/>
<line x1="90" y1="54" x2="90" y2="66" class="acc" stroke-width="1.4"/>
<circle cx="190" cy="60" r="3" fill="currentColor"/>
<line x1="190" y1="60" x2="99" y2="60" class="acc" stroke-width="1.4"/>
<polygon points="99,60 105.4,57.3 105.4,62.7" class="acc-fill"/>
<circle cx="390" cy="90" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="381" y1="90" x2="399" y2="90" stroke="currentColor" stroke-width="1.4"/>
<line x1="390" y1="81" x2="390" y2="99" stroke="currentColor" stroke-width="1.4"/>
<circle cx="90" cy="90" r="3" fill="currentColor"/>
<line x1="90" y1="90" x2="381" y2="90" stroke="currentColor" stroke-width="1.4"/>
<polygon points="381,90 374.6,92.7 374.6,87.3" fill="currentColor"/>
<rect x="364" y="106" width="52" height="24" rx="4" class="soft"/>
<rect x="364" y="106" width="52" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="122.5" font-size="13" text-anchor="middle">&lt;&lt;&lt; 16</text>
<rect x="281" y="146" width="18" height="18" rx="2" class="soft-acc"/>
<rect x="281" y="146" width="18" height="18" rx="2" fill="none" class="acc" stroke-width="1.4"/>
<line x1="284" y1="155" x2="296" y2="155" class="acc" stroke-width="1.4"/>
<line x1="290" y1="149" x2="290" y2="161" class="acc" stroke-width="1.4"/>
<circle cx="390" cy="155" r="3" fill="currentColor"/>
<line x1="390" y1="155" x2="299" y2="155" class="acc" stroke-width="1.4"/>
<polygon points="299,155 305.4,152.3 305.4,157.7" class="acc-fill"/>
<circle cx="190" cy="185" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="181" y1="185" x2="199" y2="185" stroke="currentColor" stroke-width="1.4"/>
<line x1="190" y1="176" x2="190" y2="194" stroke="currentColor" stroke-width="1.4"/>
<circle cx="290" cy="185" r="3" fill="currentColor"/>
<line x1="290" y1="185" x2="199" y2="185" stroke="currentColor" stroke-width="1.4"/>
<polygon points="199,185 205.4,182.3 205.4,187.7" fill="currentColor"/>
<rect x="164" y="201" width="52" height="24" rx="4" class="soft"/>
<rect x="164" y="201" width="52" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="190" y="217.6" font-size="13" text-anchor="middle">&lt;&lt;&lt; 12</text>
<rect x="81" y="241" width="18" height="18" rx="2" class="soft-acc"/>
<rect x="81" y="241" width="18" height="18" rx="2" fill="none" class="acc" stroke-width="1.4"/>
<line x1="84" y1="250" x2="96" y2="250" class="acc" stroke-width="1.4"/>
<line x1="90" y1="244" x2="90" y2="256" class="acc" stroke-width="1.4"/>
<circle cx="190" cy="250" r="3" fill="currentColor"/>
<line x1="190" y1="250" x2="99" y2="250" class="acc" stroke-width="1.4"/>
<polygon points="99,250 105.4,247.3 105.4,252.7" class="acc-fill"/>
<circle cx="390" cy="280" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="381" y1="280" x2="399" y2="280" stroke="currentColor" stroke-width="1.4"/>
<line x1="390" y1="271" x2="390" y2="289" stroke="currentColor" stroke-width="1.4"/>
<circle cx="90" cy="280" r="3" fill="currentColor"/>
<line x1="90" y1="280" x2="381" y2="280" stroke="currentColor" stroke-width="1.4"/>
<polygon points="381,280 374.6,282.7 374.6,277.3" fill="currentColor"/>
<rect x="364" y="296" width="52" height="24" rx="4" class="soft"/>
<rect x="364" y="296" width="52" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="312.6" font-size="13" text-anchor="middle">&lt;&lt;&lt; 8</text>
<rect x="281" y="336" width="18" height="18" rx="2" class="soft-acc"/>
<rect x="281" y="336" width="18" height="18" rx="2" fill="none" class="acc" stroke-width="1.4"/>
<line x1="284" y1="345" x2="296" y2="345" class="acc" stroke-width="1.4"/>
<line x1="290" y1="339" x2="290" y2="351" class="acc" stroke-width="1.4"/>
<circle cx="390" cy="345" r="3" fill="currentColor"/>
<line x1="390" y1="345" x2="299" y2="345" class="acc" stroke-width="1.4"/>
<polygon points="299,345 305.4,342.3 305.4,347.7" class="acc-fill"/>
<circle cx="190" cy="375" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="181" y1="375" x2="199" y2="375" stroke="currentColor" stroke-width="1.4"/>
<line x1="190" y1="366" x2="190" y2="384" stroke="currentColor" stroke-width="1.4"/>
<circle cx="290" cy="375" r="3" fill="currentColor"/>
<line x1="290" y1="375" x2="199" y2="375" stroke="currentColor" stroke-width="1.4"/>
<polygon points="199,375 205.4,372.3 205.4,377.7" fill="currentColor"/>
<rect x="164" y="391" width="52" height="24" rx="4" class="soft"/>
<rect x="164" y="391" width="52" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="190" y="407.6" font-size="13" text-anchor="middle">&lt;&lt;&lt; 7</text>
<text x="470" y="64" font-size="13" text-anchor="start" class="acc-fill">add</text>
<text x="470" y="96" font-size="13" text-anchor="start">XOR</text>
<text x="470" y="124" font-size="13" text-anchor="start">rotate</text>
</svg>
<figcaption>Figure 5.14. The quarter round: Add, Rotate, XOR. The additions (accent) are the only nonlinear part, because of their carries; the XORs and rotations spread their effect across all 32 bits.</figcaption>
</figure>

**By hand: one quarter round.** RFC 8439 §2.1.1 gives a test. All values are
hexadecimal.

<div class="mars-steps" markdown>

1. Start with $a$ = `11111111`, $b$ = `01020304`, $c$ = `9b8d6f43`, $d$ = `01234567`.
2. $a \leftarrow a + b$ = `12131415`. Then $d \oplus a$ = `13305172`, rotated left 16 bits: $d$ = `51721330`.
3. $c \leftarrow c + d$ = `ecff8273` (the carry out of the top is dropped). Then $b \oplus c$ rotated left 12: $b$ = `d8177edf`.
4. $a \leftarrow a + b$ = `ea2a92f4`. Then $d \oplus a$ rotated left 8: $d$ = `5881c4bb`.
5. $c \leftarrow c + d$ = `4581472e`. Then $b \oplus c$ rotated left 7: $b$ = `cb1cf8ce`.
6. Result: $a, b, c, d$ = `ea2a92f4`, `cb1cf8ce`, `4581472e`, `5881c4bb`.

</div>

### Rounds and the final addition

A **round** applies four quarter rounds. ChaCha20 alternates **column rounds**
(the four columns of the grid) and **diagonal rounds** (the four diagonals),
ten of each, 20 rounds in all. After two rounds every word depends on every
input word.

Then the original input grid is **added** back, word by word. Without that step
every operation could be run backwards, and the keystream block would lead
straight back to the key. With it, an attacker who knows the output still needs
the input to undo the addition, and the input contains the key.

### Code it

```python
import struct

M = 0xffffffff

def rotl(x, n):
    return (x << n | x >> (32 - n)) & M

def qr(s, a, b, c, d):                    # the quarter round, RFC 8439 section 2.1
    s[a] = (s[a] + s[b]) & M; s[d] = rotl(s[d] ^ s[a], 16)
    s[c] = (s[c] + s[d]) & M; s[b] = rotl(s[b] ^ s[c], 12)
    s[a] = (s[a] + s[b]) & M; s[d] = rotl(s[d] ^ s[a], 8)
    s[c] = (s[c] + s[d]) & M; s[b] = rotl(s[b] ^ s[c], 7)

def block(key, counter, nonce):           # 32-byte key, 12-byte nonce -> 64 bytes of keystream
    init = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]   # "expand 32-byte k"
    init += [*struct.unpack("<8I", key), counter, *struct.unpack("<3I", nonce)]
    s = init[:]
    for _ in range(10):                   # 10 double rounds = 20 rounds
        qr(s, 0, 4, 8, 12); qr(s, 1, 5, 9, 13); qr(s, 2, 6, 10, 14); qr(s, 3, 7, 11, 15)   # columns
        qr(s, 0, 5, 10, 15); qr(s, 1, 6, 11, 12); qr(s, 2, 7, 8, 13); qr(s, 3, 4, 9, 14)   # diagonals
    return struct.pack("<16I", *[(x + y) & M for x, y in zip(s, init)])

def chacha20(key, counter, nonce, data):  # encrypting and decrypting are the same
    out = bytearray()
    for i in range(0, len(data), 64):
        ks = block(key, counter + i // 64, nonce)
        out += bytes(a ^ b for a, b in zip(data[i:i + 64], ks))
    return bytes(out)

s = [0x11111111, 0x01020304, 0x9b8d6f43, 0x01234567]
qr(s, 0, 1, 2, 3)
print(" ".join("%08x" % x for x in s))    # ea2a92f4 cb1cf8ce 4581472e 5881c4bb

key = bytes(range(32))                    # the test vector in RFC 8439 section 2.3.2
nonce = bytes.fromhex("000000090000004a00000000")
print(block(key, 1, nonce)[:16].hex())    # 10f1e7e4d13b5915500fdd1fa32071c4

ct = chacha20(key, 1, nonce, b"see you at noon")
print(ct.hex())                           # 639482c4a8542c35317bfd71cc4f1f
print(chacha20(key, 1, nonce, ct))        # b'see you at noon'
```

The ciphertext was also checked against the ChaCha20 in the `cryptography`
library. Change one bit of the key and about half of the 512 keystream bits in
a block change (255 of them, in a quick test): the avalanche you want from a
generator whose output must look unrelated for related inputs.

This is a teaching copy. Python's integers give no promise of constant time, and
a real implementation processes several blocks at once with vector instructions.

!!! note "Life story: Salsa20 and ChaCha20"
    **Born:** Salsa20 in 2005 for the eSTREAM competition, ChaCha in 2008, both
    by Daniel J. Bernstein (then at the University of Illinois at Chicago) ·
    **Purpose:** a fast, simple software cipher with no table lookups, so no
    timing leaks · **Helped:** made phones without AES hardware fast and safe in
    TLS (Google, 2013 to 2014); now in TLS 1.3, SSH, WireGuard, and the Linux
    and BSD random number generators · **Status:** current and recommended; the
    best attacks reach 7 of its 20 rounds

## 5.8 Break it: nonce reuse and malleability

*Level: intermediate.* ChaCha20 has no known weakness. Systems that use it, and
every other stream cipher, still fail in two ways that have nothing to do with
the cipher.

### Using a nonce twice

If two messages are encrypted under the same key **and** the same nonce, they
get the same keystream $z$, and

$$
c_1 \oplus c_2 = (m_1 \oplus z) \oplus (m_2 \oplus z) = m_1 \oplus m_2 .
$$

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="Nonce reuse: two ciphertexts made with the same keystream XOR to the XOR of the two plaintexts" fill="currentColor" font-size="13">
<rect x="20" y="20" width="60" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="40.5" font-size="13" text-anchor="middle">c1</text>
<text x="100" y="42" font-size="13" text-anchor="middle">=</text>
<rect x="120" y="20" width="190" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="215" y="40.5" font-size="13" text-anchor="middle">m1  “Meet at the…”</text>
<text x="330" y="42" font-size="13" text-anchor="middle">⊕</text>
<rect x="350" y="20" width="150" height="32" rx="4" class="soft-acc"/>
<rect x="350" y="20" width="150" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="425" y="40.5" font-size="13" text-anchor="middle">z</text>
<rect x="20" y="70" width="60" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="90.5" font-size="13" text-anchor="middle">c2</text>
<text x="100" y="92" font-size="13" text-anchor="middle">=</text>
<rect x="120" y="70" width="190" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="215" y="90.5" font-size="13" text-anchor="middle">m2  “Transfer 5000…”</text>
<text x="330" y="92" font-size="13" text-anchor="middle">⊕</text>
<rect x="350" y="70" width="150" height="32" rx="4" class="soft-acc"/>
<rect x="350" y="70" width="150" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="425" y="90.5" font-size="13" text-anchor="middle">z (the same)</text>
<line x1="20" y1="120" x2="620" y2="120" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="135" width="100" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="70" y="155.6" font-size="13" text-anchor="middle">c1 ⊕ c2</text>
<text x="140" y="157" font-size="13" text-anchor="middle">=</text>
<rect x="160" y="135" width="150" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="235" y="155.6" font-size="13" text-anchor="middle">m1 ⊕ m2</text>
<text x="330" y="157" font-size="13" text-anchor="middle">⊕</text>
<rect x="350" y="135" width="150" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="425" y="155.6" font-size="13" text-anchor="middle">z ⊕ z = 0</text>
<text x="565" y="145" font-size="13" text-anchor="middle" class="acc-fill">the key is</text>
<text x="565" y="163" font-size="13" text-anchor="middle" class="acc-fill">gone</text>
<text x="320" y="200" font-size="13" text-anchor="middle">slide a guessed word along m1 ⊕ m2 and watch for readable text</text>
</svg>
<figcaption>Figure 5.15. Why a repeated key and nonce is fatal. The keystream cancels and what is left, the XOR of two texts, is full of structure: this is how Tunny fell in 1941 and how KRACK read Wi-Fi in 2017.</figcaption>
</figure>

The key is gone. What is left is the XOR of two texts, and text has so much
structure that both usually come out. The classic method is **crib dragging**:
guess a common word, XOR it in at every position, and look for positions where
the other message turns into readable text.

```python
def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

key = bytes.fromhex("8f" * 32)            # one key, and one nonce used twice: the mistake
nonce = bytes(12)
m1 = b"Meet at the north gate at nine. Do bring the documents."
m2 = b"Transfer 5000 dollars to account 4471-2209 on Friday."
c1, c2 = chacha20(key, 1, nonce, m1), chacha20(key, 1, nonce, m2)

x = xor(c1, c2)                           # the key cancels: this is m1 XOR m2
for i in range(len(x) - 4):               # slide the guess " the " along it
    piece = xor(x[i:i + 5], b" the ")
    if all(ch == 32 or chr(ch).isalnum() for ch in piece):
        print(i, piece)
print(xor(x, m1))                         # know one message, read the other
```

Among the eight positions that look like letters and digits, two are right.
Position 7 shows `b'r 500'` and position 40 shows `b'09 on'`, real pieces of the
second message, and extending those guesses a few characters at a time reads
both. Knowing one message outright gives the other at once:

```
4 b'ssy7t'
7 b'r 500'
13 b'obsal'
21 b'e f1a'
25 b'aybd0'
36 b'c0400'
40 b'09 on'
47 b'1haa7'
b'Transfer 5000 dollars to account 4471-2209 on Friday.'
```

This is how Tunny fell in 1941 and how the Soviet one-time pads reused in the
1940s were read in the Venona project. It returned in 2017 as **KRACK**: Mathy
Vanhoef and Frank Piessens found that by replaying one handshake message, an
attacker could make WPA2 devices install the same key again and reset the
packet counter used as the nonce, so packets were encrypted with keystream
already used.

Vanhoef was a researcher at KU Leuven in Belgium, and the flaw he found was not
in one product but in the WPA2 standard itself, so nearly every Wi-Fi device was
affected. The
disclosure in October 2017 was coordinated with vendors, and patches for
Windows, Android, Linux, macOS and router firmware came out within weeks.

!!! note "Life story: KRACK"
    **Born:** 2017, Mathy Vanhoef and Frank Piessens (KU Leuven) · **Purpose:**
    to show that a correct cipher in a correct mode can still be made to reuse
    a nonce by replaying protocol messages · **Helped:** patches for almost
    every Wi-Fi device, and a lasting reminder to analyze the protocol around
    a cipher · **Status:** fixed by software patches from October 2017

The rules that follow:

- Never encrypt two messages with the same key and nonce. Use a counter as the
  nonce if you can keep one; RFC 8439's 96-bit nonce leaves room for it.
- A **random** 96-bit nonce is safe for about $2^{32}$ messages per key; after
  that the chance of a repeat stops being negligible. For random nonces with no
  limit to worry about, **XChaCha20** stretches the nonce to 192 bits.
- One nonce covers at most $2^{32}$ blocks of 64 bytes, 256 GiB, before the
  32-bit counter wraps.

### Changing a message without the key

A stream cipher hides the message but does nothing to protect it. Flip a bit of
the ciphertext and the same bit of the plaintext flips when it is decrypted, and
nothing tells the receiver. An attacker who knows or guesses what a message says
can change it to anything of the same length:

```python
c2 = bytearray(c2)
pos = m2.index(b"5000")                   # the attacker guesses where the amount is
c2[pos] ^= ord("5") ^ ord("9")            # turn "5" into "9" without the key
print(chacha20(key, 1, nonce, bytes(c2)))
# b'Transfer 9000 dollars to account 4471-2209 on Friday.'
```

<figure class="mars-fig">
<svg viewBox="0 0 660 230" width="660" role="img" aria-label="Flipping bits of a ChaCha20 ciphertext byte flips the same bits of the plaintext: 5 becomes 9" fill="currentColor" font-size="13">
<rect x="60" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="88" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">9b</text>
<rect x="60" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="88" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">f</text>
<rect x="122" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="150" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">6b</text>
<rect x="122" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="150" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">e</text>
<rect x="184" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="212" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">3a</text>
<rect x="184" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="212" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">r</text>
<rect x="246" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="274" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">db</text>
<rect x="246" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="274" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">␣</text>
<rect x="308" y="40" width="56" height="32" rx="4" class="soft-acc"/>
<rect x="308" y="40" width="56" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="336" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">51</text>
<rect x="308" y="160" width="56" height="32" rx="4" class="soft-acc"/>
<rect x="308" y="160" width="56" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="336" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">9</text>
<rect x="370" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="398" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">cc</text>
<rect x="370" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="398" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="432" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="460" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">fe</text>
<rect x="432" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="460" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="494" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="522" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">90</text>
<rect x="494" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="522" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="556" y="40" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="584" y="60.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">66</text>
<rect x="556" y="160" width="56" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="584" y="181.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">␣</text>
<text x="48" y="61" font-size="13" text-anchor="end" font-style="italic">c′</text>
<text x="48" y="181" font-size="13" text-anchor="end" font-style="italic">m′</text>
<text x="336" y="26" font-size="13" text-anchor="middle" class="acc-fill">was 5d, now 5d ⊕ 0c = 51</text>
<line x1="336" y1="72" x2="336" y2="156" class="acc" stroke-width="1.4"/>
<polygon points="336,156 333.3,149.6 338.7,149.6" class="acc-fill"/>
<text x="346" y="110" font-size="13" text-anchor="start">decrypt</text>
<text x="346" y="128" font-size="13" text-anchor="start" class="acc-fill">“5” ⊕ 0c = “9”</text>
<text x="330" y="220" font-size="13" text-anchor="middle">0c = ord('5') ⊕ ord('9'): the attacker never needs the key</text>
</svg>
<figcaption>Figure 5.16. Malleability in the code's example. The attacker XORs <code>0c</code> into one ciphertext byte, and the receiver decrypts 9000 dollars instead of 5000. Nothing in a stream cipher notices.</figcaption>
</figure>

This property is called **malleability**, and every cipher in this chapter has
it, the one-time pad included. The cure is a **message authentication code**,
a keyed checksum the receiver verifies before trusting anything.
[Chapter 10](10-Message-Authentication.md) builds one, Poly1305, and joins it
with ChaCha20 into **ChaCha20-Poly1305**, the form in which ChaCha20 is almost
always used.

## 5.9 In the real world

*Level: intermediate.*

**ChaCha20.** Google's Adam Langley moved Chrome and Android connections to
ChaCha20-Poly1305 in TLS from 2013 to 2014, because phones of the time had no
AES instructions and software AES was slow and leaked timing. RFC 7539 (2015)
standardized the cipher, and RFC 8439 (2018) replaced it; RFC 7905 (2016) added
it to TLS 1.2, and it is one of the cipher suites of TLS 1.3 (RFC 8446). OpenSSH
has offered `chacha20-poly1305@openssh.com` since version 6.5 (2014), and the
WireGuard VPN uses it for all traffic. Since Linux 4.8 (2016) the kernel random
number generator produces its output with ChaCha20, and OpenBSD replaced RC4 in
its `arc4random` with ChaCha20 in 2014. Full details: [ChaCha
reference](../04-symmetric-ciphers/ChaCha.md).

**Mobile networks.** After A5/1, 3G and 4G networks use the block ciphers
KASUMI and AES and two stream ciphers designed for the job: **SNOW 3G**, ETSI's
adaptation of SNOW 2.0 by Patrik Ekdahl and Thomas Johansson of Lund University
in Sweden, and **ZUC**, designed at the Chinese Academy of Sciences and named
after the fifth-century mathematician Zu Chongzhi, which 3GPP adopted for LTE in
2011. Both use word-oriented LFSRs, but feed them through nonlinear finite-state machines built to resist
the attacks of §5.4.

**Small hardware.** Trivium and Grain, from the eSTREAM hardware portfolio, need
only a few thousand logic gates. Grain-128AEAD was one of the ten finalists in
NIST's lightweight cryptography competition, which chose Ascon in 2023.

**RC4.** Banned in TLS (RFC 7465, 2015), Kerberos (RFC 8429, 2018) and SSH
(RFC 8758, 2020). It lingers in old Windows Kerberos settings and old PDF files.
Full details: [Retired ciphers](../04-symmetric-ciphers/Retired.md#rc4).

**Block ciphers as stream ciphers.** Most stream encryption today does not use a
dedicated stream cipher at all. It runs a block cipher such as AES in
**counter mode**, which turns it into a keystream generator exactly like
ChaCha20's block function. That is [Chapter 8](08-Modes-of-Operation.md).

| | Key | Nonce | Status |
|---|---|---|---|
| One-time pad | as long as the data | none | perfect, impractical |
| A5/1 | 64 bits | 22-bit frame number | broken |
| RC4 | 40 to 2048 bits | none (WEP glued one on) | broken, banned |
| ChaCha20 (RFC 8439) | 256 bits | 96 bits | recommended |
| XChaCha20 | 256 bits | 192 bits | recommended, no RFC |

## 5.10 Going deeper

*Level: expert.*

**What "pseudorandom" means.** A generator $G: \{0,1\}^k \to \{0,1\}^\ell$ with
$\ell > k$ is a **pseudorandom generator** (PRG) if no efficient algorithm,
given a string, can tell whether it came from $G$ on a random seed or is truly
random, with advantage better than negligible. Andrew Yao showed in 1982 that
this is equivalent to the **next-bit test**: no efficient algorithm, shown the
first $i$ bits, predicts bit $i + 1$ with probability noticeably above $1/2$.
Berlekamp-Massey is a next-bit predictor for any LFSR; the RC4 biases are
distinguishers. A stream cipher whose keystream is pseudorandom gives
**semantic security** for one message per key and nonce, by a short reduction:
an attacker who learns anything about $m$ from $m \oplus G(k)$ can be turned
into a distinguisher for $G$. [Chapter 17](17-Defining-Security.md) does this
properly.

**Why the state must be twice the key.** Steve Babbage (1995) and Jovan Golić
(1997) independently described a time-memory trade-off against any generator with
an $S$-bit state. Precompute the first output bits of $M$ random states and
store them sorted. Observe $D$ windows of keystream. If $M \cdot D \approx 2^S$,
one window probably matches a stored state, and the cipher runs on from there.
With $S = 64$, as in A5/1, $M = D = 2^{32}$ is within reach; that is what the 2009
A5/1 tables did, with refinements. The rule since then: the state should be at
least twice the security level. ChaCha20's state is 512 bits, Trivium's 288 for
an 80-bit key.

**Correlation immunity.** Siegenthaler (1984) defined a combining function to be
$t$-th order **correlation immune** if its output is statistically independent of
every set of $t$ inputs. The Geffe function is not even first-order immune. He
also proved the trade-off that makes design hard: for $n$ inputs, correlation
immunity of order $t$ forces the algebraic degree down to at most $n - t$, and
low degree invites **algebraic attacks** (Courtois and Meier, 2003), which write
the keystream as low-degree equations in the key and solve them.

**The state of ChaCha and Salsa20 cryptanalysis.** The main tool is
differential: flip a bit of the nonce or counter, run a few rounds forward, and
look for an output bit that still depends on the input difference with a bias;
then guess some key bits and run backwards from the output to meet the bias.
Aumasson, Fischer, Khazaei, Meier and Rechberger (2008) used this to attack
Salsa20 with 8 rounds and ChaCha with 7. Later work has lowered the costs, but
the best published attacks still reach 7 rounds of ChaCha at a cost far above
any practical budget, and nobody has an attack on 8. ChaCha20 runs 20. The
security margin is the reason ChaCha8 and ChaCha12 are sometimes proposed for
speed, and the reason standards stay with 20.

??? info "Why the nonce is 96 bits in RFC 8439 but 64 in the original"

    Bernstein's ChaCha has a 64-bit nonce and a 64-bit block counter, so one key
    and nonce can produce $2^{64}$ blocks. The IETF version moved 32 bits from the
    counter to the nonce, because protocols such as TLS build the nonce from a
    per-connection value and a sequence number and wanted more room for it. The
    price is 256 GiB per nonce, plenty for one packet or one TLS record. The two
    versions produce different keystreams for the same inputs, so check which
    one a library means.

??? info "XChaCha20 in one paragraph"

    HChaCha20 runs the 20 rounds on the key and the first 16 bytes of a 24-byte
    nonce, skips the final addition, and outputs 8 of the 16 words as a new key.
    ChaCha20 then runs under that key with the last 8 nonce bytes. A random
    192-bit nonce can be drawn $2^{80}$ times before the chance of a repeat
    reaches $2^{-32}$. libsodium, WireGuard's cookie messages and Go's x/crypto
    ship it, but the IETF draft expired without becoming an RFC.

## Check yourself

??? question "1. A stream cipher encrypts $m$ = `1011` with keystream $z$ = `0110`. What is the ciphertext, and how do you decrypt it?"

    $c = m \oplus z$ = `1101`. Decrypt by XORing the same keystream again:
    `1101` $\oplus$ `0110` = `1011`.

??? question "2. Run the LFSR $s_{n+3} = s_{n+1} \oplus s_n$ from the state `100`. What is its period?"

    The output is `1001011` and then it repeats: period 7, the maximum $2^3 - 1$.
    Its polynomial $x^3 + x + 1$ is primitive.

??? question "3. Why can't an LFSR's all-zero state be used?"

    Every new bit is an XOR of zeros, so the register stays all zero and outputs
    only zeros forever.

??? question "4. An LFSR has 128 cells and secret taps. How many output bits does Berlekamp-Massey need to recover it, and what does that cost?"

    $2L = 256$ bits. The algorithm runs in about $L^2$ simple steps, a fraction
    of a second. A long register does not help: the weakness is the linearity.

??? question "5. In the Geffe generator, the attacker guesses register 1 and checks agreement with the keystream. Why does the wrong guess agree only about half the time?"

    A wrong start state produces a sequence unrelated to $x_1$, so where $z = x_1$
    it matches $z$ only by chance, half the time, and where $z = x_3$ also half the
    time. The right guess agrees about 75% of the time, which stands out after a
    few hundred bits.

??? question "6. A WEP network sends 1,000 packets a second. Roughly how long until an IV repeats, and why is that bad?"

    With $2^{24}$ IVs, the birthday bound gives a 50% chance of a repeat after
    about 4,800 packets, under five seconds. Two packets with the same IV use the
    same RC4 key and keystream, so their XOR is the XOR of the two plaintexts.

??? question "7. Why does ChaCha20 add the input state to the output at the end?"

    Every round step is invertible. Without the addition, anyone who saw a
    keystream block could run the rounds backwards to the input, which contains
    the key. The addition mixes in the unknown input, so the output alone is not
    enough.

??? question "8. Two ChaCha20 messages were sent with the same key and nonce. You know the first is a standard 40-byte header followed by text. What can you read of the second?"

    Its first 40 bytes, at once: $c_1 \oplus c_2 \oplus \text{header}$. The rest
    falls to crib dragging, since you then have the XOR of two texts.

??? question "9. A protocol encrypts with ChaCha20 and puts a CRC-32 checksum of the plaintext inside the encryption. Does that stop the bit-flipping attack?"

    No. CRC-32 is linear up to a constant: for strings of equal length,
    $\mathrm{CRC}(m \oplus \Delta) = \mathrm{CRC}(m) \oplus \mathrm{CRC}(\Delta) \oplus \mathrm{CRC}(0)$,
    where $0$ is the all-zero string. The attacker flips $\Delta$
    in the message and $\mathrm{CRC}(\Delta)$ in the encrypted checksum, which is
    exactly what broke WEP's integrity. A keyed MAC is needed.

??? question "10. A design has a 128-bit key and a 128-bit internal state. Explain why that is a problem even if no other weakness is known."

    The Babbage-Golić trade-off: store $2^{64}$ states with their outputs,
    observe $2^{64}$ keystream windows, and expect a match, recovering the state
    in about $2^{64}$ time and memory, far below the $2^{128}$ the key promises.
    The state should be at least 256 bits.

## What you learned

- A stream cipher XORs the message with a keystream generated from a short key
  and a public nonce. It is the one-time pad with the key made small, and it is
  only as good as the keystream is unpredictable.
- LFSRs give long periods and good statistics, but they are linear:
  Berlekamp-Massey recovers one from $2L$ bits, and correlation attacks split
  nonlinear combinations into their parts.
- RC4 is simple and fast but biased. The biases and WEP's key construction let
  attackers recover Wi-Fi keys in about a minute and, later, TLS cookies.
- ChaCha20 mixes a $4 \times 4$ grid of words with 20 rounds of add, rotate and
  XOR, adds the input back, and is counter-based. It is fast in software, has no
  timing leaks from tables, and no attack reaches more than 7 of its rounds.
- Never reuse a key and nonce pair: the keystream cancels and the plaintexts
  leak. KRACK showed that the protocol around a cipher can force this.
- A stream cipher is malleable. Real systems always pair it with a MAC, as
  ChaCha20-Poly1305 does.

**Next:** [Chapter 6](06-Block-Ciphers.md) turns to the other kind of symmetric
cipher, which encrypts fixed-size blocks, through the story of DES.

## Further reading

- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949).
- Solomon Golomb, *Shift Register Sequences* (Holden-Day, 1967).
- James Massey, "Shift-Register Synthesis and BCH Decoding", *IEEE Transactions
  on Information Theory* 15 (1969).
- Thomas Siegenthaler, "Decrypting a Class of Stream Ciphers Using Ciphertext
  Only", *IEEE Transactions on Computers* 34 (1985).
- Scott Fluhrer, Itsik Mantin and Adi Shamir, "Weaknesses in the Key Scheduling
  Algorithm of RC4" (SAC 2001); Itsik Mantin and Adi Shamir, "A Practical Attack
  on Broadcast RC4" (FSE 2001).
- Erik Tews, Ralf-Philipp Weinmann and Andrei Pyshkin, "Breaking 104 bit WEP in
  less than 60 seconds" (WISA 2007).
- Nadhem AlFardan, Daniel J. Bernstein, Kenneth Paterson, Bertram Poettering and
  Jacob Schuldt, "On the Security of RC4 in TLS" (USENIX Security 2013).
- [Daniel J. Bernstein, "ChaCha, a variant of Salsa20" (2008)](https://cr.yp.to/chacha/chacha-20080128.pdf).
- RFC 8439, ChaCha20 and Poly1305 for IETF Protocols.
- Mathy Vanhoef and Frank Piessens, "Key Reinstallation Attacks: Forcing Nonce
  Reuse in WPA2" (CCS 2017).
- Jack Copeland (ed.), *Colossus: The Secrets of Bletchley Park's Codebreaking
  Computers* (Oxford, 2006), for Tunny.
- Reference pages: [ChaCha and Salsa20](../04-symmetric-ciphers/ChaCha.md),
  [Retired ciphers: RC4](../04-symmetric-ciphers/Retired.md#rc4),
  [AEAD](../05-modes-aead/AEAD.md), and the history appendix
  [From Shannon to DES](../history/06-Shannon-to-DES.md).
