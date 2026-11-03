# 18. Side Channels

*A cipher can be mathematically sound and still give its key away through the
machine that runs it: through how long it takes, how much power it draws, which
memory it touches, what happens when it is glitched, or which error message it
returns. This chapter shows each of these channels with a small attack you can
run, explains the incidents that made them famous, and teaches the defenses,
above all constant-time code.*

!!! abstract "In this chapter"
    **You will learn:**

    - what a side channel is, and why security proofs say nothing about it
    - how timing leaks a password check and an RSA exponent, and how to write code that doesn't leak
    - how power analysis and cache attacks recover AES keys, and how hardware and masking stop them
    - how one fault in an RSA-CRT signature reveals the private key (the Bellcore attack)
    - padding oracles and Bleichenbacher's attack: implementation errors that decrypt everything
    - what Spectre-class attacks changed

    **You need:** [Chapter 7](07-AES.md) (the S-box), [Chapter 8](08-Modes-of-Operation.md) (CBC and padding),
    [Chapter 13](13-RSA.md) (RSA, square and multiply, CRT) and [Chapter 17](17-Defining-Security.md)
    (what the definitions cover).

    **Levels:** 18.1 to 18.3 are for beginners, 18.4 to 18.9 intermediate, 18.10 and 18.11 expert.

## 18.1 The problem

[Chapter 17](17-Defining-Security.md) defined security as a game in which the
attacker sees inputs and outputs and nothing else. Real attackers are not so
polite. A computer is a physical object: it takes time, draws current, gets
warm, makes radio noise and sometimes even sound. A **side channel** is any
such signal that depends on secret data. The math can be perfect and the key
can still walk out through the side.

<figure class="mars-fig" id="fig-18-channels">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="A chip running a cipher in the middle, with arrows for the side channels that leak from it"><rect x="230" y="110" width="180" height="110" rx="10" class="soft-acc" stroke="none"/><rect x="230" y="110" width="180" height="110" rx="10" class="acc" fill="none" stroke-width="2.5"/><line x1="245" y1="110" x2="245" y2="99" stroke="currentColor" stroke-width="2"/><line x1="245" y1="220" x2="245" y2="231" stroke="currentColor" stroke-width="2"/><line x1="275" y1="110" x2="275" y2="99" stroke="currentColor" stroke-width="2"/><line x1="275" y1="220" x2="275" y2="231" stroke="currentColor" stroke-width="2"/><line x1="305" y1="110" x2="305" y2="99" stroke="currentColor" stroke-width="2"/><line x1="305" y1="220" x2="305" y2="231" stroke="currentColor" stroke-width="2"/><line x1="335" y1="110" x2="335" y2="99" stroke="currentColor" stroke-width="2"/><line x1="335" y1="220" x2="335" y2="231" stroke="currentColor" stroke-width="2"/><line x1="365" y1="110" x2="365" y2="99" stroke="currentColor" stroke-width="2"/><line x1="365" y1="220" x2="365" y2="231" stroke="currentColor" stroke-width="2"/><line x1="395" y1="110" x2="395" y2="99" stroke="currentColor" stroke-width="2"/><line x1="395" y1="220" x2="395" y2="231" stroke="currentColor" stroke-width="2"/><text x="320" y="161.5" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">chip computing</text><text x="320" y="178.5" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">with secret key k</text><line x1="260" y1="125" x2="200" y2="61" stroke="currentColor" stroke-width="1.5"/><polygon points="200,61 207.4,64.1 202.6,68.6" fill="currentColor" stroke="none"/><text x="170" y="43" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">time</text><text x="170" y="60" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">how long it takes</text><line x1="380" y1="125" x2="440" y2="61" stroke="currentColor" stroke-width="1.5"/><polygon points="440,61 437.4,68.6 432.6,64.1" fill="currentColor" stroke="none"/><text x="470" y="43" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">power</text><text x="470" y="60" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">current it draws</text><line x1="230" y1="165" x2="140" y2="165" stroke="currentColor" stroke-width="1.5"/><polygon points="140,165 147.3,161.7 147.3,168.3" fill="currentColor" stroke="none"/><text x="85" y="163" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">EM and sound</text><text x="85" y="180" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">radio, coil whine</text><line x1="410" y1="165" x2="500" y2="165" stroke="currentColor" stroke-width="1.5"/><polygon points="500,165 492.7,168.3 492.7,161.7" fill="currentColor" stroke="none"/><text x="555" y="163" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">cache</text><text x="555" y="180" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">which memory it used</text><line x1="260" y1="205" x2="200" y2="269" stroke="currentColor" stroke-width="1.5"/><polygon points="200,269 202.6,261.4 207.4,265.9" fill="currentColor" stroke="none"/><text x="170" y="283" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">errors</text><text x="170" y="300" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">which message it returns</text><line x1="430" y1="265" x2="390" y2="205" class="acc" stroke-width="1.5"/><polygon points="390,205 396.8,209.3 391.3,212.9" class="acc-fill" stroke="none"/><text x="470" y="283" font-size="14" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">faults</text><text x="470" y="300" font-size="12" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">glitches pushed in</text></svg>
<figcaption>Figure 18.1. A side channel is anything the attacker can measure or disturb besides the inputs and outputs that the security games of Chapter 17 talk about.</figcaption>
</figure>

The idea is older than computers. In 1943 an engineer at Bell Telephone noticed
that whenever the US Army's 131-B2 encryption device, used for teleprinter
traffic, stepped, a spike appeared on an oscilloscope across the lab, and from
the spikes he could read the plaintext. The US government's long study of such
leaks became the program later code-named **TEMPEST**: rules for shielding and
spacing equipment so its emissions carry nothing. According to the memoir of
the MI5 officer Peter Wright (*Spycatcher*, 1987), British intelligence used a
related trick in 1956, during the Suez crisis: a microphone hidden near the
Hagelin cipher machine in the Egyptian embassy in London let them work out the
machine's settings from the sound of its rotors (operation ENGULF). In 1985 the
Dutch researcher Wim van Eck showed that a modified TV set could rebuild the
image on a computer screen from its radio emissions, so this was not a problem
for governments only.

!!! note "Life story: TEMPEST"
    **Born:** 1943, at Bell Telephone, when an engineer saw a cipher machine's plaintext on an oscilloscope; the
    code name TEMPEST came later, in the US government's Cold War studies · **Purpose:** to stop secret data
    leaking through emissions · **Helped:** shielding and separation rules for government equipment, and a whole
    field of emission security · **Status:** current; the standards remain largely classified, while van Eck's
    1985 work brought the problem into the open

The modern field began in 1996, when Paul Kocher, a young cryptography
consultant in California who had studied biology at Stanford, published "Timing Attacks on Implementations of Diffie-Hellman,
RSA, DSS, and Other Systems". He showed that the small differences in how long
a private-key operation takes reveal the key bit by bit. The same year,
researchers at Bellcore showed that a single computing fault in an RSA
signature hands over the key. In 1998 Kocher, with Joshua Jaffe and Benjamin
Jun, announced **differential power analysis**, which pulled keys out of
almost every smart card of the time from a few hundred power measurements. Each
of these attacks is the subject of a section below. The common lesson: the
security of a system is the security of its implementation, and
implementations leak.

<figure class="mars-fig" id="fig-18-timeline">
<svg viewBox="0 0 620 604" width="620" role="img" aria-label="Timeline of side-channel attacks from 1943 to 2023"><line x1="86" y1="16" x2="86" y2="566" stroke="currentColor" stroke-width="2" stroke-opacity="0.7"/><text x="70" y="29" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1943</text><circle cx="86" cy="24" r="6" fill="currentColor" stroke="none"/><text x="104" y="25" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Bell Telephone: 131-B2 spikes</text><text x="104" y="41" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">plaintext read off an oscilloscope; later TEMPEST</text><text x="70" y="67" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1956</text><circle cx="86" cy="62" r="6" fill="currentColor" stroke="none"/><text x="104" y="63" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">ENGULF (per Peter Wright)</text><text x="104" y="79" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">a Hagelin machine's settings from its sound</text><text x="70" y="105" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">1985</text><circle cx="86" cy="100" r="6" fill="currentColor" stroke="none"/><text x="104" y="101" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">van Eck</text><text x="104" y="117" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">a screen rebuilt from its radio emissions</text><text x="70" y="143" font-size="14" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">1996</text><circle cx="86" cy="138" r="6" class="acc-fill" stroke="none"/><text x="104" y="139" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">Kocher: timing; Bellcore: faults</text><text x="104" y="155" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">RSA keys from time, and from one glitch</text><text x="70" y="181" font-size="14" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">1998</text><circle cx="86" cy="176" r="6" class="acc-fill" stroke="none"/><text x="104" y="177" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">Differential power analysis; Bleichenbacher</text><text x="104" y="193" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">smart cards; SSL's RSA padding</text><text x="70" y="219" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2002</text><circle cx="86" cy="214" r="6" fill="currentColor" stroke="none"/><text x="104" y="215" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Vaudenay: padding oracles</text><text x="104" y="231" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">CBC decrypted from yes/no answers</text><text x="70" y="257" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2003</text><circle cx="86" cy="252" r="6" fill="currentColor" stroke="none"/><text x="104" y="253" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Brumley and Boneh</text><text x="104" y="269" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">remote timing against OpenSSL</text><text x="70" y="295" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2005</text><circle cx="86" cy="290" r="6" fill="currentColor" stroke="none"/><text x="104" y="291" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Cache attacks on AES and RSA</text><text x="104" y="307" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">Bernstein; Osvik, Shamir, Tromer; Percival</text><text x="70" y="333" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2013</text><circle cx="86" cy="328" r="6" fill="currentColor" stroke="none"/><text x="104" y="329" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Acoustic RSA; Lucky Thirteen</text><text x="104" y="345" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">a laptop's sound; TLS MAC timing</text><text x="70" y="371" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2014</text><circle cx="86" cy="366" r="6" fill="currentColor" stroke="none"/><text x="104" y="367" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Flush+Reload; Rowhammer; POODLE</text><text x="104" y="383" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">shared libraries, DRAM bit flips, SSL 3.0</text><text x="70" y="409" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2016</text><circle cx="86" cy="404" r="6" fill="currentColor" stroke="none"/><text x="104" y="405" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">DROWN; Flip Feng Shui</text><text x="104" y="421" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">SSL 2.0 as oracle; Rowhammer on RSA keys</text><text x="70" y="447" font-size="14" text-anchor="end" font-weight="600" class="acc-fill" stroke="none">2018</text><circle cx="86" cy="442" r="6" class="acc-fill" stroke="none"/><text x="104" y="443" font-size="14" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">Spectre and Meltdown</text><text x="104" y="459" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">speculative execution leaks any memory</text><text x="70" y="485" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2019</text><circle cx="86" cy="480" r="6" fill="currentColor" stroke="none"/><text x="104" y="481" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Minerva, TPM-Fail; Plundervolt</text><text x="104" y="497" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">ECDSA nonce timing; undervolting SGX</text><text x="70" y="523" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2022</text><circle cx="86" cy="518" r="6" fill="currentColor" stroke="none"/><text x="104" y="519" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Hertzbleed</text><text x="104" y="535" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">CPU frequency depends on data</text><text x="70" y="561" font-size="14" text-anchor="end" font-weight="600" fill="currentColor" stroke="none">2023</text><circle cx="86" cy="556" r="6" fill="currentColor" stroke="none"/><text x="104" y="557" font-size="14" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">KyberSlash; Marvin</text><text x="104" y="573" font-size="12" text-anchor="start" fill-opacity="0.8" fill="currentColor" stroke="none">division timing; RSA timing, again</text></svg>
<figcaption>Figure 18.2. Eighty years of side channels. The attacks moved from radio and sound to clocks, power lines, caches and finally the processor's own guesses.</figcaption>
</figure>

## 18.2 Timing: the simplest leak

Here is the obvious way to check a password, a MAC tag or any secret string:
compare byte by byte and stop at the first difference.

```python
def check(tag, good):           # leaks: returns at the first wrong byte
    if len(tag) != len(good):
        return False
    for a, b in zip(tag, good):
        if a != b:
            return False
    return True
```

It is correct, and it leaks. The more leading bytes of the guess are right, the
longer it runs. An attacker who can time it does not need to guess the whole
8-byte tag at once ($2^{64}$ tries). It can try all 256 values of the first
byte, keep the one that takes slightly longer, then move to the second byte:
at most $8 \times 256 = 2048$ tries.

**By hand.** Say the secret is `9e 4a 1f ...`. Guesses `00 00 ...`, `01 00 ...`,
... all stop after comparing 1 byte, except `9e 00 ...`, which compares 2 bytes
before failing. The attacker keeps `9e` and continues with the second byte: now
`9e 4a ...` is the only guess that compares 3 bytes. And so on.

**Code it.** Real timing is noisy, and an attacker repeats each measurement many
times and averages. To keep the idea clear, this simulation counts compared
bytes as the "time":

```python
SECRET = bytes.fromhex("9e4a1fc2770b35d8")     # the tag the server expects

def check(tag):                  # returns (time, accepted); time = bytes compared
    t = 0
    for a, b in zip(tag, SECRET):
        t += 1
        if a != b:
            return t, False
    return t, True

guess = bytearray(8)
for i in range(8):               # the slowest answer (or the accepted one) wins
    guess[i] = max(range(256), key=lambda v: check(guess[:i] + bytes([v]) + guess[i + 1:]))
print(guess.hex(), check(guess))
print("tries:", 8 * 256, "instead of", 2 ** 64)
```

Output:

```
9e4a1fc2770b35d8 (8, True)
tries: 2048 instead of 18446744073709551616
```

This is not a classroom curiosity. In 2007 hackers used exactly this kind of
leak, in a `memcmp` that checked an HMAC, to load unsigned code on the Xbox 360.
In 2009 Nate Lawson found the same mistake in Google's Keyczar crypto library.
The attack works over a network too, given enough repetitions: in 2009 Scott
Crosby, Dan Wallach and Rudolf Riedi measured differences of a few tens of
microseconds across the internet and as small as 100 nanoseconds on a local network.

<figure class="mars-fig" id="fig-18-timing">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Bar chart of comparison time for all 256 first-byte guesses; only 0x9e takes longer"><rect x="60" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="62.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="64.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="66.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="68.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="70.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="72.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="74.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="76.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="78.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="81" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="83.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="85.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="87.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="89.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="91.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="93.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="95.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="97.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="99.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="102" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="104.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="106.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="108.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="110.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="112.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="114.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="116.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="118.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="120.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="123" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="125.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="127.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="129.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="131.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="133.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="135.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="137.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="139.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="141.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="144" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="146.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="148.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="150.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="152.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="154.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="156.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="158.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="160.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="162.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="165" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="167.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="169.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="171.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="173.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="175.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="177.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="179.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="181.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="183.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="186" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="188.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="190.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="192.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="194.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="196.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="198.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="200.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="202.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="204.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="207" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="209.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="211.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="213.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="215.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="217.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="219.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="221.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="223.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="225.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="228" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="230.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="232.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="234.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="236.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="238.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="240.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="242.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="244.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="246.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="249" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="251.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="253.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="255.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="257.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="259.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="261.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="263.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="265.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="267.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="270" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="272.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="274.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="276.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="278.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="280.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="282.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="284.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="286.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="288.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="291" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="293.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="295.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="297.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="299.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="301.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="303.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="305.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="307.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="309.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="312" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="314.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="316.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="318.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="320.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="322.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="324.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="326.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="328.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="330.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="333" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="335.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="337.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="339.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="341.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="343.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="345.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="347.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="349.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="351.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="354" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="356.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="358.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="360.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="362.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="364.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="366.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="368.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="370.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="372.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="375" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="377.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="379.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="381.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="383.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="385.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="387.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="389.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="391.8" y="50" width="1.6" height="100" rx="0" class="acc-fill" stroke="none"/><rect x="393.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="396" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="398.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="400.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="402.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="404.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="406.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="408.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="410.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="412.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="414.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="417" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="419.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="421.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="423.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="425.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="427.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="429.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="431.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="433.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="435.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="438" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="440.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="442.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="444.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="446.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="448.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="450.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="452.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="454.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="456.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="459" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="461.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="463.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="465.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="467.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="469.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="471.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="473.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="475.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="477.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="480" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="482.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="484.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="486.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="488.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="490.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="492.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="494.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="496.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="498.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="501" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="503.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="505.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="507.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="509.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="511.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="513.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="515.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="517.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="519.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="522" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="524.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="526.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="528.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="530.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="532.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="534.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="536.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="538.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="540.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="543" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="545.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="547.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="549.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="551.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="553.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="555.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="557.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="559.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="561.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="564" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="566.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="568.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="570.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="572.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="574.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="576.6" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="578.7" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="580.8" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="582.9" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="585" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="587.1" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="589.2" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="591.3" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="593.4" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><rect x="595.5" y="100" width="1.6" height="50" rx="0" fill="currentColor" stroke="none"/><line x1="56" y1="150" x2="601.6" y2="150" stroke="currentColor" stroke-width="1"/><text x="61" y="166" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0x00</text><text x="195.4" y="166" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0x40</text><text x="329.8" y="166" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0x80</text><text x="464.2" y="166" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0xc0</text><text x="596.5" y="166" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0xff</text><text x="391.8" y="42" font-size="12" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">0x9e: 2 bytes compared</text><text x="50" y="104" font-size="12" text-anchor="end" fill="currentColor" stroke="none">1</text><text x="50" y="54" font-size="12" text-anchor="end" fill="currentColor" stroke="none">2</text><text x="320" y="188" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">first-byte guess (the other 7 bytes are 00); height = time</text></svg>
<figcaption>Figure 18.3. The first round of the timing attack on the simulated check. Every guess fails after one byte except the right one, which survives one byte longer and so takes longer.</figcaption>
</figure>

**The fix: compare everything, every time.** Combine the differences with OR
and decide only at the end, so the running time depends on the length only:

```python
import hmac

def check_ct(tag, good):        # the same time whatever the bytes are
    if len(tag) != len(good):
        return False
    d = 0
    for a, b in zip(tag, good):
        d |= a ^ b
    return d == 0

print(check_ct(b"abc", b"abd"), hmac.compare_digest(b"abc", b"abc"))   # False True
```

In real code use the library's function: `hmac.compare_digest` in Python,
`CRYPTO_memcmp` in OpenSSL, `subtle.ConstantTimeCompare` in Go. Python itself
promises nothing about timing (its integers and loops have data-dependent
speed), so the code above illustrates the idea; constant-time code that
matters is written in C, assembly or Rust and checked with tools (section 18.9).

## 18.3 Timing in exponentiation

RSA, Diffie-Hellman and DSA all compute $x^d \bmod n$ with a secret $d$.
The fast way, **square and multiply** ([Chapter 3](03-The-Arithmetic-of-Secrets.md)),
reads the bits of $d$ from the top: for every bit it squares, and for every 1
bit it also multiplies. The work done, and so the time and the power, depends
on the bits of the key.

Take the toy RSA key from [Chapter 13](13-RSA.md): $n = 3233$, $d = 2753$, and
decrypt $c = 2790$. In binary, $d = 101011000001_2$: 12 bits, five of them 1.
Press Step and watch where the extra multiplications fall:

<div class="mars-modexp" data-base="2790" data-exp="2753" data-mod="3233" data-label="Decrypting c = 2790: m = 2790²⁷⁵³ mod 3233"></div>

If an attacker can see the sequence of operations, the key is simply written
in it. Record S for square and M for multiply:

```python
def power_trace(c, d, n):         # square and multiply, logging each operation
    r, trace = 1, ""
    for bit in bin(d)[2:]:
        r = r * r % n; trace += "S"
        if bit == "1":
            r = r * c % n; trace += "M"
    return r, trace

m, trace = power_trace(2790, 2753, 3233)
print(m, trace)
bits = trace.replace("SM", "1").replace("S", "0")
print(bits, int(bits, 2))
```

Output:

```
65 SMSSMSSMSMSSSSSSM
101011000001 2753
```

An "SM" is a 1 bit and a lone "S" is a 0 bit. On a smart card, a single power
trace often shows the two operations as visibly different shapes; reading them
off is **simple power analysis**.

<figure class="mars-fig" id="fig-18-sqm">
<svg viewBox="0 0 660 190" width="660" role="img" aria-label="Simulated power trace of square and multiply for exponent 2753, with the bits read off"><text x="20" y="22" font-size="13" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">square and multiply, d = 2753</text><path d="M45.0 120.0 L55.0 120.0 L57.5 117.5 L60.0 110.5 L62.5 101.0 L65.0 91.5 L67.5 84.5 L70.0 82.0 L72.5 84.5 L75.0 91.5 L77.5 101.0 L80.0 110.5 L82.5 117.5 L85.0 120.0 L85.0 120.0 L88.2 116.5 L91.3 104.5 L94.5 93.7 L97.7 87.5 L100.8 70.8 L104.0 58.0 L107.2 70.8 L110.3 87.4 L113.5 93.7 L116.7 104.5 L119.8 116.5 L123.0 120.0 L123.0 120.0 L125.5 117.5 L128.0 110.5 L130.5 101.0 L133.0 91.5 L135.5 84.5 L138.0 82.0 L140.5 84.5 L143.0 91.5 L145.5 101.0 L148.0 110.5 L150.5 117.5 L153.0 120.0 L153.0 120.0 L155.5 117.5 L158.0 110.5 L160.5 101.0 L163.0 91.5 L165.5 84.5 L168.0 82.0 L170.5 84.5 L173.0 91.5 L175.5 101.0 L178.0 110.5 L180.5 117.5 L183.0 120.0 L183.0 120.0 L186.2 116.5 L189.3 104.5 L192.5 93.7 L195.7 87.5 L198.8 70.8 L202.0 58.0 L205.2 70.8 L208.3 87.4 L211.5 93.7 L214.7 104.5 L217.8 116.5 L221.0 120.0 L221.0 120.0 L223.5 117.5 L226.0 110.5 L228.5 101.0 L231.0 91.5 L233.5 84.5 L236.0 82.0 L238.5 84.5 L241.0 91.5 L243.5 101.0 L246.0 110.5 L248.5 117.5 L251.0 120.0 L251.0 120.0 L253.5 117.5 L256.0 110.5 L258.5 101.0 L261.0 91.5 L263.5 84.5 L266.0 82.0 L268.5 84.5 L271.0 91.5 L273.5 101.0 L276.0 110.5 L278.5 117.5 L281.0 120.0 L281.0 120.0 L284.2 116.5 L287.3 104.5 L290.5 93.7 L293.7 87.5 L296.8 70.8 L300.0 58.0 L303.2 70.8 L306.3 87.4 L309.5 93.7 L312.7 104.5 L315.8 116.5 L319.0 120.0 L319.0 120.0 L321.5 117.5 L324.0 110.5 L326.5 101.0 L329.0 91.5 L331.5 84.5 L334.0 82.0 L336.5 84.5 L339.0 91.5 L341.5 101.0 L344.0 110.5 L346.5 117.5 L349.0 120.0 L349.0 120.0 L352.2 116.5 L355.3 104.5 L358.5 93.7 L361.7 87.5 L364.8 70.8 L368.0 58.0 L371.2 70.8 L374.3 87.4 L377.5 93.7 L380.7 104.5 L383.8 116.5 L387.0 120.0 L387.0 120.0 L389.5 117.5 L392.0 110.5 L394.5 101.0 L397.0 91.5 L399.5 84.5 L402.0 82.0 L404.5 84.5 L407.0 91.5 L409.5 101.0 L412.0 110.5 L414.5 117.5 L417.0 120.0 L417.0 120.0 L419.5 117.5 L422.0 110.5 L424.5 101.0 L427.0 91.5 L429.5 84.5 L432.0 82.0 L434.5 84.5 L437.0 91.5 L439.5 101.0 L442.0 110.5 L444.5 117.5 L447.0 120.0 L447.0 120.0 L449.5 117.5 L452.0 110.5 L454.5 101.0 L457.0 91.5 L459.5 84.5 L462.0 82.0 L464.5 84.5 L467.0 91.5 L469.5 101.0 L472.0 110.5 L474.5 117.5 L477.0 120.0 L477.0 120.0 L479.5 117.5 L482.0 110.5 L484.5 101.0 L487.0 91.5 L489.5 84.5 L492.0 82.0 L494.5 84.5 L497.0 91.5 L499.5 101.0 L502.0 110.5 L504.5 117.5 L507.0 120.0 L507.0 120.0 L509.5 117.5 L512.0 110.5 L514.5 101.0 L517.0 91.5 L519.5 84.5 L522.0 82.0 L524.5 84.5 L527.0 91.5 L529.5 101.0 L532.0 110.5 L534.5 117.5 L537.0 120.0 L537.0 120.0 L539.5 117.5 L542.0 110.5 L544.5 101.0 L547.0 91.5 L549.5 84.5 L552.0 82.0 L554.5 84.5 L557.0 91.5 L559.5 101.0 L562.0 110.5 L564.5 117.5 L567.0 120.0 L567.0 120.0 L570.2 116.5 L573.3 104.5 L576.5 93.7 L579.7 87.5 L582.8 70.8 L586.0 58.0 L589.2 70.8 L592.3 87.4 L595.5 93.7 L598.7 104.5 L601.8 116.5 L605.0 120.0 L615.0 120.0" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="70" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="104" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="138" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="168" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="202" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="236" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="266" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="300" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="334" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="368" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="402" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="432" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="462" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="492" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="522" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="552" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="586" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><line x1="57" y1="148" x2="121" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="89" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">1</text><line x1="125" y1="148" x2="151" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="138" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">0</text><line x1="155" y1="148" x2="219" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="187" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">1</text><line x1="223" y1="148" x2="249" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="236" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">0</text><line x1="253" y1="148" x2="317" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="285" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">1</text><line x1="321" y1="148" x2="385" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="353" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">1</text><line x1="389" y1="148" x2="415" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="402" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">0</text><line x1="419" y1="148" x2="445" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="432" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">0</text><line x1="449" y1="148" x2="475" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="462" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">0</text><line x1="479" y1="148" x2="505" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="492" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">0</text><line x1="509" y1="148" x2="535" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="522" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">0</text><line x1="539" y1="148" x2="603" y2="148" stroke="currentColor" stroke-width="1" stroke-opacity="0.6"/><text x="571" y="166" font-size="14" text-anchor="middle" font-weight="700" fill="currentColor" stroke="none">1</text><text x="330" y="186" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">1 0 1 0 1 1 0 0 0 0 0 1  =  2753</text></svg>
<figcaption>Figure 18.4. What simple power analysis sees (a drawn model of a trace, not a measurement). Squarings (S) and multiplications (M) have different shapes, so the sequence, and with it the exponent 2753, can be read straight off the trace.</figcaption>
</figure>

**Kocher's statistical attack.** Timing gives only the *total* time, not the
sequence. Kocher's insight was statistical. The time of each multiplication
depends a little on the numbers involved (for example, whether a final
subtraction is needed in Montgomery multiplication). The attacker knows the top
bits of $d$ already found and guesses the next one. For each of many inputs it
simulates the computation under both guesses and predicts how long the next
step would take. Under the right guess, the predicted times correlate with the
measured totals; under the wrong guess they do not. One bit at a time, the whole
exponent falls out. In 2003 David Brumley and Dan Boneh made it work against an
OpenSSL web server over a local network, recovering a 1024-bit RSA key from
about a million queries.

!!! note "Life story: the timing attack"
    **Born:** 1995 to 1996, Paul Kocher, then an independent consultant (CRYPTO 1996) · **Purpose:** to show that
    private-key operations leak their keys through running time · **Helped:** RSA blinding became standard,
    and "constant-time" became a requirement for every cryptographic library; Brumley and Boneh's 2003 remote
    attack made it urgent for servers · **Status:** current; new timing leaks (Minerva 2019, KyberSlash and
    Marvin 2023) are still found every year

**Defense 1: the Montgomery ladder.** Do the same operations for every bit: one
multiplication and one squaring, always. The ladder keeps two values,
$r_0 = x^k$ and $r_1 = x^{k+1}$ for the bits $k$ read so far, and for each new bit
updates both. To avoid an `if` on the secret bit, it swaps the two registers
with arithmetic:

```python
def cswap(bit, a, b):            # swap a and b when bit is 1, with no branch
    mask = -bit                  # 0 or ...1111 (all ones)
    t = mask & (a ^ b)
    return a ^ t, b ^ t

def ladder(c, d, n, bits=12):    # Montgomery ladder: one multiply and one square per bit
    r0, r1, trace = 1, c, ""
    for i in reversed(range(bits)):
        bit = d >> i & 1
        r0, r1 = cswap(bit, r0, r1)
        r1 = r0 * r1 % n
        r0 = r0 * r0 % n
        r0, r1 = cswap(bit, r0, r1)
        trace += "MS"
    return r0, trace

print(ladder(2790, 2753, 3233))
print(ladder(2790, 4095, 3233)[1] == ladder(2790, 1, 3233)[1])
```

Output:

```
(65, 'MSMSMSMSMSMSMSMSMSMSMSMS')
True
```

The trace is the same for every key. The ladder is older than the attacks it
now stops: Peter Montgomery described it in 1987, in a paper on speeding up
factoring with elliptic curves, because its fixed rhythm suited his curve
formulas. Only after Kocher did its regularity become its main selling point.
X25519 ([Chapter 15](15-Elliptic-Curves.md)) is specified with exactly this
ladder and conditional swap, which is one reason it is easy to implement safely.

<figure class="mars-fig" id="fig-18-ladder">
<svg viewBox="0 0 660 190" width="660" role="img" aria-label="Simulated power trace of the Montgomery ladder: the same pair of operations for every bit"><text x="20" y="22" font-size="13" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">Montgomery ladder, any 12-bit d</text><path d="M-88.0 120.0 L-78.0 120.0 L-74.8 116.5 L-71.7 104.5 L-68.5 93.7 L-65.3 87.5 L-62.2 70.8 L-59.0 58.0 L-55.8 70.8 L-52.7 87.4 L-49.5 93.7 L-46.3 104.5 L-43.2 116.5 L-40.0 120.0 L-40.0 120.0 L-37.5 117.5 L-35.0 110.5 L-32.5 101.0 L-30.0 91.5 L-27.5 84.5 L-25.0 82.0 L-22.5 84.5 L-20.0 91.5 L-17.5 101.0 L-15.0 110.5 L-12.5 117.5 L-10.0 120.0 L-10.0 120.0 L-6.8 116.5 L-3.7 104.5 L-0.5 93.7 L2.7 87.5 L5.8 70.8 L9.0 58.0 L12.2 70.8 L15.3 87.4 L18.5 93.7 L21.7 104.5 L24.8 116.5 L28.0 120.0 L28.0 120.0 L30.5 117.5 L33.0 110.5 L35.5 101.0 L38.0 91.5 L40.5 84.5 L43.0 82.0 L45.5 84.5 L48.0 91.5 L50.5 101.0 L53.0 110.5 L55.5 117.5 L58.0 120.0 L58.0 120.0 L61.2 116.5 L64.3 104.5 L67.5 93.7 L70.7 87.5 L73.8 70.8 L77.0 58.0 L80.2 70.8 L83.3 87.4 L86.5 93.7 L89.7 104.5 L92.8 116.5 L96.0 120.0 L96.0 120.0 L98.5 117.5 L101.0 110.5 L103.5 101.0 L106.0 91.5 L108.5 84.5 L111.0 82.0 L113.5 84.5 L116.0 91.5 L118.5 101.0 L121.0 110.5 L123.5 117.5 L126.0 120.0 L126.0 120.0 L129.2 116.5 L132.3 104.5 L135.5 93.7 L138.7 87.5 L141.8 70.8 L145.0 58.0 L148.2 70.8 L151.3 87.4 L154.5 93.7 L157.7 104.5 L160.8 116.5 L164.0 120.0 L164.0 120.0 L166.5 117.5 L169.0 110.5 L171.5 101.0 L174.0 91.5 L176.5 84.5 L179.0 82.0 L181.5 84.5 L184.0 91.5 L186.5 101.0 L189.0 110.5 L191.5 117.5 L194.0 120.0 L194.0 120.0 L197.2 116.5 L200.3 104.5 L203.5 93.7 L206.7 87.5 L209.8 70.8 L213.0 58.0 L216.2 70.8 L219.3 87.4 L222.5 93.7 L225.7 104.5 L228.8 116.5 L232.0 120.0 L232.0 120.0 L234.5 117.5 L237.0 110.5 L239.5 101.0 L242.0 91.5 L244.5 84.5 L247.0 82.0 L249.5 84.5 L252.0 91.5 L254.5 101.0 L257.0 110.5 L259.5 117.5 L262.0 120.0 L262.0 120.0 L265.2 116.5 L268.3 104.5 L271.5 93.7 L274.7 87.5 L277.8 70.8 L281.0 58.0 L284.2 70.8 L287.3 87.4 L290.5 93.7 L293.7 104.5 L296.8 116.5 L300.0 120.0 L300.0 120.0 L302.5 117.5 L305.0 110.5 L307.5 101.0 L310.0 91.5 L312.5 84.5 L315.0 82.0 L317.5 84.5 L320.0 91.5 L322.5 101.0 L325.0 110.5 L327.5 117.5 L330.0 120.0 L330.0 120.0 L333.2 116.5 L336.3 104.5 L339.5 93.7 L342.7 87.5 L345.8 70.8 L349.0 58.0 L352.2 70.8 L355.3 87.4 L358.5 93.7 L361.7 104.5 L364.8 116.5 L368.0 120.0 L368.0 120.0 L370.5 117.5 L373.0 110.5 L375.5 101.0 L378.0 91.5 L380.5 84.5 L383.0 82.0 L385.5 84.5 L388.0 91.5 L390.5 101.0 L393.0 110.5 L395.5 117.5 L398.0 120.0 L398.0 120.0 L401.2 116.5 L404.3 104.5 L407.5 93.7 L410.7 87.5 L413.8 70.8 L417.0 58.0 L420.2 70.8 L423.3 87.4 L426.5 93.7 L429.7 104.5 L432.8 116.5 L436.0 120.0 L436.0 120.0 L438.5 117.5 L441.0 110.5 L443.5 101.0 L446.0 91.5 L448.5 84.5 L451.0 82.0 L453.5 84.5 L456.0 91.5 L458.5 101.0 L461.0 110.5 L463.5 117.5 L466.0 120.0 L466.0 120.0 L469.2 116.5 L472.3 104.5 L475.5 93.7 L478.7 87.5 L481.8 70.8 L485.0 58.0 L488.2 70.8 L491.3 87.4 L494.5 93.7 L497.7 104.5 L500.8 116.5 L504.0 120.0 L504.0 120.0 L506.5 117.5 L509.0 110.5 L511.5 101.0 L514.0 91.5 L516.5 84.5 L519.0 82.0 L521.5 84.5 L524.0 91.5 L526.5 101.0 L529.0 110.5 L531.5 117.5 L534.0 120.0 L534.0 120.0 L537.2 116.5 L540.3 104.5 L543.5 93.7 L546.7 87.5 L549.8 70.8 L553.0 58.0 L556.2 70.8 L559.3 87.4 L562.5 93.7 L565.7 104.5 L568.8 116.5 L572.0 120.0 L572.0 120.0 L574.5 117.5 L577.0 110.5 L579.5 101.0 L582.0 91.5 L584.5 84.5 L587.0 82.0 L589.5 84.5 L592.0 91.5 L594.5 101.0 L597.0 110.5 L599.5 117.5 L602.0 120.0 L602.0 120.0 L605.2 116.5 L608.3 104.5 L611.5 93.7 L614.7 87.5 L617.8 70.8 L621.0 58.0 L624.2 70.8 L627.3 87.4 L630.5 93.7 L633.7 104.5 L636.8 116.5 L640.0 120.0 L640.0 120.0 L642.5 117.5 L645.0 110.5 L647.5 101.0 L650.0 91.5 L652.5 84.5 L655.0 82.0 L657.5 84.5 L660.0 91.5 L662.5 101.0 L665.0 110.5 L667.5 117.5 L670.0 120.0 L670.0 120.0 L673.2 116.5 L676.3 104.5 L679.5 93.7 L682.7 87.5 L685.8 70.8 L689.0 58.0 L692.2 70.8 L695.3 87.4 L698.5 93.7 L701.7 104.5 L704.8 116.5 L708.0 120.0 L708.0 120.0 L710.5 117.5 L713.0 110.5 L715.5 101.0 L718.0 91.5 L720.5 84.5 L723.0 82.0 L725.5 84.5 L728.0 91.5 L730.5 101.0 L733.0 110.5 L735.5 117.5 L738.0 120.0 L748.0 120.0" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="-59" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="-25" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="9" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="43" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="77" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="111" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="145" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="179" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="213" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="247" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="281" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="315" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="349" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="383" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="417" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="451" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="485" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="519" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="553" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="587" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="621" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="655" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text><text x="689" y="138" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">M</text><text x="723" y="138" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">S</text></svg>
<figcaption>Figure 18.5. The Montgomery ladder on the same exponent: one multiplication and one squaring per bit, whatever the bit is. The trace shape no longer depends on the key.</figcaption>
</figure>

!!! note "Life story: the Montgomery ladder"
    **Born:** 1987, Peter Montgomery, in "Speeding the Pollard and Elliptic Curve Methods of Factorization" ·
    **Purpose:** fast arithmetic on his curves, for factoring · **Helped:** became the standard defense against
    timing and simple power analysis, with one multiply and one square per bit · **Status:** current; X25519
    and X448 (RFC 7748, 2016) are specified with it

**Defense 2: blinding.** Randomize the input so the attacker cannot predict the
intermediate values. For RSA decryption, pick a random $r$, decrypt
$c' = c \cdot r^e$ instead of $c$, and divide out $r$ at the end, since
$(c \, r^e)^d = m \cdot r$. With the toy key and $r = 7$:

$$
\begin{aligned}
c' &= 2790 \cdot 7^{17} \bmod 3233 = 2790 \cdot 2369 \bmod 3233 = 1258 \\
m' &= 1258^{2753} \bmod 3233 = 455 = 65 \times 7 \\
m &= 455 \cdot 7^{-1} \bmod 3233 = 455 \cdot 462 \bmod 3233 = 65 .
\end{aligned}
$$

Each decryption now works on a different, random-looking number, so timing
statistics have nothing to correlate with. The trick was borrowed from David
Chaum's blind signatures (1982), invented for anonymous digital cash, and Kocher
suggested it as a timing defense in his 1996 paper. After Brumley and Boneh's paper,
OpenSSL turned blinding on by default. Libraries also blind the exponent,
using $d + k\,\varphi(n)$ for a random $k$.

<figure class="mars-fig" id="fig-18-blinding">
<svg viewBox="0 0 660 170" width="660" role="img" aria-label="RSA blinding: multiply by r to the e, decrypt, divide by r"><rect x="10" y="50" width="120" height="42" rx="6" class="soft" stroke="none"/><rect x="10" y="50" width="120" height="42" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="70" y="75.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">c = 2790</text><line x1="130" y1="71" x2="180" y2="71" stroke="currentColor" stroke-width="1.5"/><polygon points="180,71 172.7,74.3 172.7,67.7" fill="currentColor" stroke="none"/><text x="155" y="62" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">× 7¹⁷</text><rect x="180" y="50" width="120" height="42" rx="6" class="soft-acc" stroke="none"/><rect x="180" y="50" width="120" height="42" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="240" y="75.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">c′ = 1258</text><line x1="300" y1="71" x2="350" y2="71" stroke="currentColor" stroke-width="1.5"/><polygon points="350,71 342.7,74.3 342.7,67.7" fill="currentColor" stroke="none"/><text x="325" y="62" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">^ d</text><rect x="350" y="50" width="120" height="42" rx="6" class="soft-acc" stroke="none"/><rect x="350" y="50" width="120" height="42" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="410" y="75.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">m′ = 455</text><line x1="470" y1="71" x2="520" y2="71" stroke="currentColor" stroke-width="1.5"/><polygon points="520,71 512.7,74.3 512.7,67.7" fill="currentColor" stroke="none"/><text x="495" y="62" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">× 7⁻¹</text><rect x="520" y="50" width="120" height="42" rx="6" class="soft" stroke="none"/><rect x="520" y="50" width="120" height="42" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="580" y="75.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">m = 65</text><text x="330" y="26" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">what the attacker would like to correlate with is hidden by a random r = 7</text><text x="265" y="124" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">the exponentiation only ever sees random-looking values</text><text x="330" y="150" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">(c·r<tspan dy="-5" font-size="9">e</tspan><tspan dy="5">&#8203;</tspan>)<tspan dy="-5" font-size="9">d</tspan><tspan dy="5">&#8203;</tspan> = m·r,  so dividing by r gives m back</text></svg>
<figcaption>Figure 18.6. Blinding with the toy key and r = 7. The secret exponent works on 1258, not on the attacker's 2790, so timing statistics have nothing to line up with.</figcaption>
</figure>

!!! note "Life story: RSA blinding"
    **Born:** 1982, David Chaum's blind signatures for anonymous digital cash; proposed against timing by Kocher
    in 1996 · **Purpose:** randomize what the secret exponent works on · **Helped:** OpenSSL turned it on by
    default in 2003 after Brumley and Boneh's attack; every major RSA library blinds today · **Status:** current

## 18.4 Power and electromagnetic analysis

*Level: intermediate.*

A chip's power draw changes with every bit that flips inside it. With a small
resistor in the power line and an oscilloscope, an attacker records a
**trace**: thousands of samples per operation. Electromagnetic probes held near
the chip give similar traces without touching it.

<figure class="mars-fig" id="fig-18-setup">
<svg viewBox="0 0 660 200" width="660" role="img" aria-label="Power analysis setup: smart card, small resistor in the power line, oscilloscope and computer"><rect x="20" y="70" width="130" height="70" rx="6" class="soft-acc" stroke="none"/><rect x="20" y="70" width="130" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="85" y="101.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">smart card</text><text x="85" y="117.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">running AES</text><line x1="85" y1="70" x2="85" y2="40" stroke="currentColor" stroke-width="1.5"/><line x1="85" y1="40" x2="200" y2="40" stroke="currentColor" stroke-width="1.5"/><rect x="200" y="30" width="60" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="230" y="22" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">1–50 Ω resistor</text><line x1="260" y1="40" x2="330" y2="40" stroke="currentColor" stroke-width="1.5"/><text x="360" y="44" font-size="13" text-anchor="start" fill="currentColor" stroke="none">Vcc</text><line x1="230" y1="50" x2="400" y2="100" stroke="currentColor" stroke-width="1.5"/><polygon points="400,100 392.1,101.1 393.9,94.8" fill="currentColor" stroke="none"/><rect x="400" y="60" width="120" height="90" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="460" y="80" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">oscilloscope</text><path d="M410 135 L428 135 L434 108 L440 138 L448 116 L456 135 L468 100 L476 135 L510 135" class="acc" fill="none" stroke-width="1.5"/><line x1="520" y1="105" x2="560" y2="105" stroke="currentColor" stroke-width="1.5"/><polygon points="560,105 552.7,108.3 552.7,101.7" fill="currentColor" stroke="none"/><rect x="560" y="70" width="90" height="70" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="605" y="101.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">PC:</text><text x="605" y="117.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">statistics</text><text x="330" y="180" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">the voltage across the resistor follows the chip's current, sample by sample</text></svg>
<figcaption>Figure 18.7. A power-analysis bench needs little more than a resistor and an oscilloscope. Electromagnetic probes give similar traces without touching the circuit.</figcaption>
</figure>

**Differential and correlation power analysis.** Kocher, Jaffe and Jun's 1998
attack (published at CRYPTO 1999) does not need to read operations off a trace.
It uses statistics over many traces, and it attacks one key byte at a time,
which turns a $2^{128}$ search into sixteen searches of 256. The version used
most today, **correlation power analysis** (Éric Brier, Christophe Clavier and
Francis Olivier, 2004), works like this for the first round of AES
([Chapter 7](07-AES.md)):

<div class="mars-steps" markdown>

1. Record the power during $N$ encryptions with known, varied plaintext bytes $p_1, \ldots, p_N$.
2. For a guess $g$ of the key byte, predict an intermediate value for each trace: the S-box output $S(p_i \oplus g)$.
3. Turn each prediction into predicted power with a simple model: the **Hamming weight**, the number of 1 bits, since each 1 bit costs a little current.
4. Compute the correlation between the predicted power and the measured power over all traces.
5. Repeat for all 256 guesses. The right guess correlates clearly; wrong guesses give values near zero, because the S-box scrambles them.

</div>

**Code it.** This simulation builds the AES S-box (inverse in $\mathrm{GF}(2^8)$
followed by the affine map, as in [Chapter 7](07-AES.md)), makes 300 "traces"
whose power is the Hamming weight of the S-box output plus Gaussian noise
larger than the signal, and recovers the key byte:

```python
import random

def gmul(a, b):                    # multiply in GF(2^8), the AES field
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = (a << 1) ^ (0x11B if a & 0x80 else 0)
        b >>= 1
    return r

def sbox(x):                       # the AES S-box: inverse, then an affine map
    inv = next((y for y in range(256) if gmul(x, y) == 1), 0)
    s = inv
    for i in range(1, 5):
        s ^= (inv << i | inv >> (8 - i)) & 0xFF
    return s ^ 0x63

S = [sbox(x) for x in range(256)]
HW = [bin(x).count("1") for x in range(256)]

rng = random.Random(1998)          # simulated measurements, repeatable
KEY = 0x3C
plain = [rng.randrange(256) for _ in range(300)]
power = [HW[S[p ^ KEY]] + rng.gauss(0, 2.0) for p in plain]   # leak plus noise

def corr(xs, ys):
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return sxy / (sxx * syy) ** 0.5

scores = sorted(((corr([HW[S[p ^ k]] for p in plain], power), k) for k in range(256)), reverse=True)
for c, k in scores[:3]:
    print(hex(k), round(c, 2))
```

Output:

```
0x3c 0.56
0x92 0.21
0x36 0.21
```

The right byte, `0x3c`, stands out. Its correlation is close to what theory
predicts: the Hamming weight of a random byte has variance 2, the noise has
variance 4, so the best possible correlation is $\sqrt{2/(2+4)} \approx 0.58$.
Real traces have thousands of samples, and the attacker computes the correlation
at every sample to find *when* the S-box is computed, too.

<figure class="mars-fig" id="fig-18-cpa">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="Correlation for each of the 256 key-byte guesses; 0x3c stands out at 0.56"><rect x="60" y="160" width="1.6" height="27.7" rx="0" fill="currentColor" stroke="none"/><rect x="62.2" y="132.6" width="1.6" height="27.4" rx="0" fill="currentColor" stroke="none"/><rect x="64.4" y="145.8" width="1.6" height="14.2" rx="0" fill="currentColor" stroke="none"/><rect x="66.6" y="160" width="1.6" height="29.2" rx="0" fill="currentColor" stroke="none"/><rect x="68.8" y="154.9" width="1.6" height="5.1" rx="0" fill="currentColor" stroke="none"/><rect x="71" y="160" width="1.6" height="9.8" rx="0" fill="currentColor" stroke="none"/><rect x="73.2" y="160" width="1.6" height="14.2" rx="0" fill="currentColor" stroke="none"/><rect x="75.4" y="160" width="1.6" height="14.5" rx="0" fill="currentColor" stroke="none"/><rect x="77.6" y="154.2" width="1.6" height="5.8" rx="0" fill="currentColor" stroke="none"/><rect x="79.8" y="160" width="1.6" height="26.6" rx="0" fill="currentColor" stroke="none"/><rect x="82" y="160" width="1.6" height="22.2" rx="0" fill="currentColor" stroke="none"/><rect x="84.2" y="160" width="1.6" height="12.3" rx="0" fill="currentColor" stroke="none"/><rect x="86.4" y="149.7" width="1.6" height="10.3" rx="0" fill="currentColor" stroke="none"/><rect x="88.6" y="160" width="1.6" height="39.6" rx="0" fill="currentColor" stroke="none"/><rect x="90.8" y="157.1" width="1.6" height="2.9" rx="0" fill="currentColor" stroke="none"/><rect x="93" y="116" width="1.6" height="44" rx="0" fill="currentColor" stroke="none"/><rect x="95.2" y="154.5" width="1.6" height="5.5" rx="0" fill="currentColor" stroke="none"/><rect x="97.4" y="152.5" width="1.6" height="7.5" rx="0" fill="currentColor" stroke="none"/><rect x="99.6" y="160" width="1.6" height="14.9" rx="0" fill="currentColor" stroke="none"/><rect x="101.8" y="158.5" width="1.6" height="1.5" rx="0" fill="currentColor" stroke="none"/><rect x="104" y="128.2" width="1.6" height="31.8" rx="0" fill="currentColor" stroke="none"/><rect x="106.2" y="160" width="1.6" height="12.8" rx="0" fill="currentColor" stroke="none"/><rect x="108.4" y="160" width="1.6" height="0.8" rx="0" fill="currentColor" stroke="none"/><rect x="110.6" y="157.5" width="1.6" height="2.5" rx="0" fill="currentColor" stroke="none"/><rect x="112.8" y="155.1" width="1.6" height="4.9" rx="0" fill="currentColor" stroke="none"/><rect x="115" y="148.2" width="1.6" height="11.8" rx="0" fill="currentColor" stroke="none"/><rect x="117.2" y="160" width="1.6" height="3.4" rx="0" fill="currentColor" stroke="none"/><rect x="119.4" y="155.7" width="1.6" height="4.3" rx="0" fill="currentColor" stroke="none"/><rect x="121.6" y="133.1" width="1.6" height="26.9" rx="0" fill="currentColor" stroke="none"/><rect x="123.8" y="160" width="1.6" height="17.9" rx="0" fill="currentColor" stroke="none"/><rect x="126" y="145.5" width="1.6" height="14.5" rx="0" fill="currentColor" stroke="none"/><rect x="128.2" y="160" width="1.6" height="13" rx="0" fill="currentColor" stroke="none"/><rect x="130.4" y="160" width="1.6" height="27.5" rx="0" fill="currentColor" stroke="none"/><rect x="132.6" y="160" width="1.6" height="9.1" rx="0" fill="currentColor" stroke="none"/><rect x="134.8" y="148.8" width="1.6" height="11.2" rx="0" fill="currentColor" stroke="none"/><rect x="137" y="160" width="1.6" height="2.1" rx="0" fill="currentColor" stroke="none"/><rect x="139.2" y="148.4" width="1.6" height="11.6" rx="0" fill="currentColor" stroke="none"/><rect x="141.4" y="160" width="1.6" height="8.3" rx="0" fill="currentColor" stroke="none"/><rect x="143.6" y="156.3" width="1.6" height="3.7" rx="0" fill="currentColor" stroke="none"/><rect x="145.8" y="160" width="1.6" height="17.6" rx="0" fill="currentColor" stroke="none"/><rect x="148" y="160" width="1.6" height="2.8" rx="0" fill="currentColor" stroke="none"/><rect x="150.2" y="160" width="1.6" height="16.2" rx="0" fill="currentColor" stroke="none"/><rect x="152.4" y="140.3" width="1.6" height="19.7" rx="0" fill="currentColor" stroke="none"/><rect x="154.6" y="160" width="1.6" height="14.7" rx="0" fill="currentColor" stroke="none"/><rect x="156.8" y="160" width="1.6" height="2.1" rx="0" fill="currentColor" stroke="none"/><rect x="159" y="160" width="1.6" height="29" rx="0" fill="currentColor" stroke="none"/><rect x="161.2" y="160" width="1.6" height="1.5" rx="0" fill="currentColor" stroke="none"/><rect x="163.4" y="160" width="1.6" height="13.8" rx="0" fill="currentColor" stroke="none"/><rect x="165.6" y="160" width="1.6" height="2.8" rx="0" fill="currentColor" stroke="none"/><rect x="167.8" y="140.4" width="1.6" height="19.6" rx="0" fill="currentColor" stroke="none"/><rect x="170" y="146.5" width="1.6" height="13.5" rx="0" fill="currentColor" stroke="none"/><rect x="172.2" y="160" width="1.6" height="12.3" rx="0" fill="currentColor" stroke="none"/><rect x="174.4" y="158.2" width="1.6" height="1.8" rx="0" fill="currentColor" stroke="none"/><rect x="176.6" y="160" width="1.6" height="17.7" rx="0" fill="currentColor" stroke="none"/><rect x="178.8" y="114.5" width="1.6" height="45.5" rx="0" fill="currentColor" stroke="none"/><rect x="181" y="160" width="1.6" height="23.9" rx="0" fill="currentColor" stroke="none"/><rect x="183.2" y="160" width="1.6" height="3.6" rx="0" fill="currentColor" stroke="none"/><rect x="185.4" y="160" width="1.6" height="2.1" rx="0" fill="currentColor" stroke="none"/><rect x="187.6" y="158.4" width="1.6" height="1.6" rx="0" fill="currentColor" stroke="none"/><rect x="189.8" y="152.4" width="1.6" height="7.6" rx="0" fill="currentColor" stroke="none"/><rect x="192" y="36.4" width="1.6" height="123.6" rx="0" class="acc-fill" stroke="none"/><rect x="194.2" y="160" width="1.6" height="26.6" rx="0" fill="currentColor" stroke="none"/><rect x="196.4" y="160" width="1.6" height="12.2" rx="0" fill="currentColor" stroke="none"/><rect x="198.6" y="142.9" width="1.6" height="17.1" rx="0" fill="currentColor" stroke="none"/><rect x="200.8" y="160" width="1.6" height="4.6" rx="0" fill="currentColor" stroke="none"/><rect x="203" y="146.5" width="1.6" height="13.5" rx="0" fill="currentColor" stroke="none"/><rect x="205.2" y="160" width="1.6" height="9.7" rx="0" fill="currentColor" stroke="none"/><rect x="207.4" y="160" width="1.6" height="24.3" rx="0" fill="currentColor" stroke="none"/><rect x="209.6" y="149.8" width="1.6" height="10.2" rx="0" fill="currentColor" stroke="none"/><rect x="211.8" y="155.2" width="1.6" height="4.8" rx="0" fill="currentColor" stroke="none"/><rect x="214" y="146.3" width="1.6" height="13.7" rx="0" fill="currentColor" stroke="none"/><rect x="216.2" y="152.9" width="1.6" height="7.1" rx="0" fill="currentColor" stroke="none"/><rect x="218.4" y="160" width="1.6" height="22.4" rx="0" fill="currentColor" stroke="none"/><rect x="220.6" y="137.7" width="1.6" height="22.3" rx="0" fill="currentColor" stroke="none"/><rect x="222.8" y="146.6" width="1.6" height="13.4" rx="0" fill="currentColor" stroke="none"/><rect x="225" y="160" width="1.6" height="11.3" rx="0" fill="currentColor" stroke="none"/><rect x="227.2" y="159.1" width="1.6" height="0.9" rx="0" fill="currentColor" stroke="none"/><rect x="229.4" y="160" width="1.6" height="11.2" rx="0" fill="currentColor" stroke="none"/><rect x="231.6" y="153.5" width="1.6" height="6.5" rx="0" fill="currentColor" stroke="none"/><rect x="233.8" y="160" width="1.6" height="6.9" rx="0" fill="currentColor" stroke="none"/><rect x="236" y="157.5" width="1.6" height="2.5" rx="0" fill="currentColor" stroke="none"/><rect x="238.2" y="155.1" width="1.6" height="4.9" rx="0" fill="currentColor" stroke="none"/><rect x="240.4" y="153.3" width="1.6" height="6.7" rx="0" fill="currentColor" stroke="none"/><rect x="242.6" y="160" width="1.6" height="17.2" rx="0" fill="currentColor" stroke="none"/><rect x="244.8" y="137.6" width="1.6" height="22.4" rx="0" fill="currentColor" stroke="none"/><rect x="247" y="160" width="1.6" height="29.2" rx="0" fill="currentColor" stroke="none"/><rect x="249.2" y="160" width="1.6" height="10.8" rx="0" fill="currentColor" stroke="none"/><rect x="251.4" y="160" width="1.6" height="1.3" rx="0" fill="currentColor" stroke="none"/><rect x="253.6" y="155.3" width="1.6" height="4.7" rx="0" fill="currentColor" stroke="none"/><rect x="255.8" y="160" width="1.6" height="23.2" rx="0" fill="currentColor" stroke="none"/><rect x="258" y="147" width="1.6" height="13" rx="0" fill="currentColor" stroke="none"/><rect x="260.2" y="160" width="1.6" height="4.9" rx="0" fill="currentColor" stroke="none"/><rect x="262.4" y="160" width="1.6" height="13.9" rx="0" fill="currentColor" stroke="none"/><rect x="264.6" y="160" width="1.6" height="2.5" rx="0" fill="currentColor" stroke="none"/><rect x="266.8" y="143.8" width="1.6" height="16.2" rx="0" fill="currentColor" stroke="none"/><rect x="269" y="160" width="1.6" height="6.6" rx="0" fill="currentColor" stroke="none"/><rect x="271.2" y="139.2" width="1.6" height="20.8" rx="0" fill="currentColor" stroke="none"/><rect x="273.4" y="160" width="1.6" height="23.8" rx="0" fill="currentColor" stroke="none"/><rect x="275.6" y="157.8" width="1.6" height="2.2" rx="0" fill="currentColor" stroke="none"/><rect x="277.8" y="148.4" width="1.6" height="11.6" rx="0" fill="currentColor" stroke="none"/><rect x="280" y="141.6" width="1.6" height="18.4" rx="0" fill="currentColor" stroke="none"/><rect x="282.2" y="160" width="1.6" height="16.4" rx="0" fill="currentColor" stroke="none"/><rect x="284.4" y="149.3" width="1.6" height="10.7" rx="0" fill="currentColor" stroke="none"/><rect x="286.6" y="160" width="1.6" height="10" rx="0" fill="currentColor" stroke="none"/><rect x="288.8" y="155.4" width="1.6" height="4.6" rx="0" fill="currentColor" stroke="none"/><rect x="291" y="146.9" width="1.6" height="13.1" rx="0" fill="currentColor" stroke="none"/><rect x="293.2" y="154.3" width="1.6" height="5.7" rx="0" fill="currentColor" stroke="none"/><rect x="295.4" y="160" width="1.6" height="30.8" rx="0" fill="currentColor" stroke="none"/><rect x="297.6" y="128.3" width="1.6" height="31.7" rx="0" fill="currentColor" stroke="none"/><rect x="299.8" y="160" width="1.6" height="13.1" rx="0" fill="currentColor" stroke="none"/><rect x="302" y="160" width="1.6" height="7.4" rx="0" fill="currentColor" stroke="none"/><rect x="304.2" y="160" width="1.6" height="30.6" rx="0" fill="currentColor" stroke="none"/><rect x="306.4" y="160" width="1.6" height="7.7" rx="0" fill="currentColor" stroke="none"/><rect x="308.6" y="160" width="1.6" height="24.7" rx="0" fill="currentColor" stroke="none"/><rect x="310.8" y="141.2" width="1.6" height="18.8" rx="0" fill="currentColor" stroke="none"/><rect x="313" y="160" width="1.6" height="8.5" rx="0" fill="currentColor" stroke="none"/><rect x="315.2" y="127.4" width="1.6" height="32.6" rx="0" fill="currentColor" stroke="none"/><rect x="317.4" y="160" width="1.6" height="18.9" rx="0" fill="currentColor" stroke="none"/><rect x="319.6" y="160" width="1.6" height="9.1" rx="0" fill="currentColor" stroke="none"/><rect x="321.8" y="159.7" width="1.6" height="0.3" rx="0" fill="currentColor" stroke="none"/><rect x="324" y="149.9" width="1.6" height="10.1" rx="0" fill="currentColor" stroke="none"/><rect x="326.2" y="149.9" width="1.6" height="10.1" rx="0" fill="currentColor" stroke="none"/><rect x="328.4" y="124.5" width="1.6" height="35.5" rx="0" fill="currentColor" stroke="none"/><rect x="330.6" y="160" width="1.6" height="25.4" rx="0" fill="currentColor" stroke="none"/><rect x="332.8" y="160" width="1.6" height="8.7" rx="0" fill="currentColor" stroke="none"/><rect x="335" y="160" width="1.6" height="17" rx="0" fill="currentColor" stroke="none"/><rect x="337.2" y="123.6" width="1.6" height="36.4" rx="0" fill="currentColor" stroke="none"/><rect x="339.4" y="160" width="1.6" height="2.9" rx="0" fill="currentColor" stroke="none"/><rect x="341.6" y="117.5" width="1.6" height="42.5" rx="0" fill="currentColor" stroke="none"/><rect x="343.8" y="160" width="1.6" height="10.2" rx="0" fill="currentColor" stroke="none"/><rect x="346" y="160" width="1.6" height="9.7" rx="0" fill="currentColor" stroke="none"/><rect x="348.2" y="140" width="1.6" height="20" rx="0" fill="currentColor" stroke="none"/><rect x="350.4" y="120.7" width="1.6" height="39.3" rx="0" fill="currentColor" stroke="none"/><rect x="352.6" y="160" width="1.6" height="2.6" rx="0" fill="currentColor" stroke="none"/><rect x="354.8" y="154.5" width="1.6" height="5.5" rx="0" fill="currentColor" stroke="none"/><rect x="357" y="154.9" width="1.6" height="5.1" rx="0" fill="currentColor" stroke="none"/><rect x="359.2" y="122.1" width="1.6" height="37.9" rx="0" fill="currentColor" stroke="none"/><rect x="361.4" y="160" width="1.6" height="0.1" rx="0" fill="currentColor" stroke="none"/><rect x="363.6" y="157.1" width="1.6" height="2.9" rx="0" fill="currentColor" stroke="none"/><rect x="365.8" y="160" width="1.6" height="10.8" rx="0" fill="currentColor" stroke="none"/><rect x="368" y="156.6" width="1.6" height="3.4" rx="0" fill="currentColor" stroke="none"/><rect x="370.2" y="160" width="1.6" height="16.2" rx="0" fill="currentColor" stroke="none"/><rect x="372.4" y="148.8" width="1.6" height="11.2" rx="0" fill="currentColor" stroke="none"/><rect x="374.6" y="157.4" width="1.6" height="2.6" rx="0" fill="currentColor" stroke="none"/><rect x="376.8" y="129.2" width="1.6" height="30.8" rx="0" fill="currentColor" stroke="none"/><rect x="379" y="160" width="1.6" height="8.8" rx="0" fill="currentColor" stroke="none"/><rect x="381.2" y="113.3" width="1.6" height="46.7" rx="0" fill="currentColor" stroke="none"/><rect x="383.4" y="160" width="1.6" height="2" rx="0" fill="currentColor" stroke="none"/><rect x="385.6" y="151.8" width="1.6" height="8.2" rx="0" fill="currentColor" stroke="none"/><rect x="387.8" y="160" width="1.6" height="20.4" rx="0" fill="currentColor" stroke="none"/><rect x="390" y="160" width="1.6" height="12.4" rx="0" fill="currentColor" stroke="none"/><rect x="392.2" y="145.3" width="1.6" height="14.7" rx="0" fill="currentColor" stroke="none"/><rect x="394.4" y="160" width="1.6" height="1.3" rx="0" fill="currentColor" stroke="none"/><rect x="396.6" y="160" width="1.6" height="19.8" rx="0" fill="currentColor" stroke="none"/><rect x="398.8" y="160" width="1.6" height="1.8" rx="0" fill="currentColor" stroke="none"/><rect x="401" y="160" width="1.6" height="21.5" rx="0" fill="currentColor" stroke="none"/><rect x="403.2" y="160" width="1.6" height="28.4" rx="0" fill="currentColor" stroke="none"/><rect x="405.4" y="144.7" width="1.6" height="15.3" rx="0" fill="currentColor" stroke="none"/><rect x="407.6" y="146.7" width="1.6" height="13.3" rx="0" fill="currentColor" stroke="none"/><rect x="409.8" y="160" width="1.6" height="23.2" rx="0" fill="currentColor" stroke="none"/><rect x="412" y="122.4" width="1.6" height="37.6" rx="0" fill="currentColor" stroke="none"/><rect x="414.2" y="160" width="1.6" height="23.6" rx="0" fill="currentColor" stroke="none"/><rect x="416.4" y="160" width="1.6" height="5.8" rx="0" fill="currentColor" stroke="none"/><rect x="418.6" y="155.1" width="1.6" height="4.9" rx="0" fill="currentColor" stroke="none"/><rect x="420.8" y="156.8" width="1.6" height="3.2" rx="0" fill="currentColor" stroke="none"/><rect x="423" y="160" width="1.6" height="16.6" rx="0" fill="currentColor" stroke="none"/><rect x="425.2" y="160" width="1.6" height="7.9" rx="0" fill="currentColor" stroke="none"/><rect x="427.4" y="160" width="1.6" height="10.8" rx="0" fill="currentColor" stroke="none"/><rect x="429.6" y="160" width="1.6" height="22.9" rx="0" fill="currentColor" stroke="none"/><rect x="431.8" y="160" width="1.6" height="9.8" rx="0" fill="currentColor" stroke="none"/><rect x="434" y="138.2" width="1.6" height="21.8" rx="0" fill="currentColor" stroke="none"/><rect x="436.2" y="160" width="1.6" height="8.2" rx="0" fill="currentColor" stroke="none"/><rect x="438.4" y="160" width="1.6" height="9" rx="0" fill="currentColor" stroke="none"/><rect x="440.6" y="148.7" width="1.6" height="11.3" rx="0" fill="currentColor" stroke="none"/><rect x="442.8" y="160" width="1.6" height="2.5" rx="0" fill="currentColor" stroke="none"/><rect x="445" y="160" width="1.6" height="18" rx="0" fill="currentColor" stroke="none"/><rect x="447.2" y="139.2" width="1.6" height="20.8" rx="0" fill="currentColor" stroke="none"/><rect x="449.4" y="160" width="1.6" height="21.9" rx="0" fill="currentColor" stroke="none"/><rect x="451.6" y="149.2" width="1.6" height="10.8" rx="0" fill="currentColor" stroke="none"/><rect x="453.8" y="152.1" width="1.6" height="7.9" rx="0" fill="currentColor" stroke="none"/><rect x="456" y="160" width="1.6" height="6.8" rx="0" fill="currentColor" stroke="none"/><rect x="458.2" y="150.6" width="1.6" height="9.4" rx="0" fill="currentColor" stroke="none"/><rect x="460.4" y="159" width="1.6" height="1" rx="0" fill="currentColor" stroke="none"/><rect x="462.6" y="135.3" width="1.6" height="24.7" rx="0" fill="currentColor" stroke="none"/><rect x="464.8" y="149.5" width="1.6" height="10.5" rx="0" fill="currentColor" stroke="none"/><rect x="467" y="160" width="1.6" height="15.1" rx="0" fill="currentColor" stroke="none"/><rect x="469.2" y="160" width="1.6" height="5.3" rx="0" fill="currentColor" stroke="none"/><rect x="471.4" y="160" width="1.6" height="4.3" rx="0" fill="currentColor" stroke="none"/><rect x="473.6" y="160" width="1.6" height="10.3" rx="0" fill="currentColor" stroke="none"/><rect x="475.8" y="150.7" width="1.6" height="9.3" rx="0" fill="currentColor" stroke="none"/><rect x="478" y="160" width="1.6" height="26.7" rx="0" fill="currentColor" stroke="none"/><rect x="480.2" y="160" width="1.6" height="6.7" rx="0" fill="currentColor" stroke="none"/><rect x="482.4" y="155.9" width="1.6" height="4.1" rx="0" fill="currentColor" stroke="none"/><rect x="484.6" y="160" width="1.6" height="12.5" rx="0" fill="currentColor" stroke="none"/><rect x="486.8" y="160" width="1.6" height="6.7" rx="0" fill="currentColor" stroke="none"/><rect x="489" y="160" width="1.6" height="26.1" rx="0" fill="currentColor" stroke="none"/><rect x="491.2" y="160" width="1.6" height="19" rx="0" fill="currentColor" stroke="none"/><rect x="493.4" y="160" width="1.6" height="17.6" rx="0" fill="currentColor" stroke="none"/><rect x="495.6" y="160" width="1.6" height="4.3" rx="0" fill="currentColor" stroke="none"/><rect x="497.8" y="160" width="1.6" height="6.3" rx="0" fill="currentColor" stroke="none"/><rect x="500" y="147.1" width="1.6" height="12.9" rx="0" fill="currentColor" stroke="none"/><rect x="502.2" y="160" width="1.6" height="32.6" rx="0" fill="currentColor" stroke="none"/><rect x="504.4" y="160" width="1.6" height="31.7" rx="0" fill="currentColor" stroke="none"/><rect x="506.6" y="160" width="1.6" height="13" rx="0" fill="currentColor" stroke="none"/><rect x="508.8" y="160" width="1.6" height="18.9" rx="0" fill="currentColor" stroke="none"/><rect x="511" y="160" width="1.6" height="4.7" rx="0" fill="currentColor" stroke="none"/><rect x="513.2" y="160" width="1.6" height="1.5" rx="0" fill="currentColor" stroke="none"/><rect x="515.4" y="160" width="1.6" height="41.5" rx="0" fill="currentColor" stroke="none"/><rect x="517.6" y="144.1" width="1.6" height="15.9" rx="0" fill="currentColor" stroke="none"/><rect x="519.8" y="146.5" width="1.6" height="13.5" rx="0" fill="currentColor" stroke="none"/><rect x="522" y="158.5" width="1.6" height="1.5" rx="0" fill="currentColor" stroke="none"/><rect x="524.2" y="160" width="1.6" height="14.1" rx="0" fill="currentColor" stroke="none"/><rect x="526.4" y="160" width="1.6" height="8.7" rx="0" fill="currentColor" stroke="none"/><rect x="528.6" y="131.1" width="1.6" height="28.9" rx="0" fill="currentColor" stroke="none"/><rect x="530.8" y="126" width="1.6" height="34" rx="0" fill="currentColor" stroke="none"/><rect x="533" y="160" width="1.6" height="7.1" rx="0" fill="currentColor" stroke="none"/><rect x="535.2" y="137.9" width="1.6" height="22.1" rx="0" fill="currentColor" stroke="none"/><rect x="537.4" y="160" width="1.6" height="23.3" rx="0" fill="currentColor" stroke="none"/><rect x="539.6" y="155.9" width="1.6" height="4.1" rx="0" fill="currentColor" stroke="none"/><rect x="541.8" y="121.9" width="1.6" height="38.1" rx="0" fill="currentColor" stroke="none"/><rect x="544" y="160" width="1.6" height="12.8" rx="0" fill="currentColor" stroke="none"/><rect x="546.2" y="160" width="1.6" height="8" rx="0" fill="currentColor" stroke="none"/><rect x="548.4" y="160" width="1.6" height="13" rx="0" fill="currentColor" stroke="none"/><rect x="550.6" y="156.1" width="1.6" height="3.9" rx="0" fill="currentColor" stroke="none"/><rect x="552.8" y="160" width="1.6" height="2.4" rx="0" fill="currentColor" stroke="none"/><rect x="555" y="160" width="1.6" height="4" rx="0" fill="currentColor" stroke="none"/><rect x="557.2" y="154.2" width="1.6" height="5.8" rx="0" fill="currentColor" stroke="none"/><rect x="559.4" y="149.9" width="1.6" height="10.1" rx="0" fill="currentColor" stroke="none"/><rect x="561.6" y="160" width="1.6" height="13" rx="0" fill="currentColor" stroke="none"/><rect x="563.8" y="127.1" width="1.6" height="32.9" rx="0" fill="currentColor" stroke="none"/><rect x="566" y="160" width="1.6" height="11.3" rx="0" fill="currentColor" stroke="none"/><rect x="568.2" y="160" width="1.6" height="10.6" rx="0" fill="currentColor" stroke="none"/><rect x="570.4" y="118.2" width="1.6" height="41.8" rx="0" fill="currentColor" stroke="none"/><rect x="572.6" y="160" width="1.6" height="12.6" rx="0" fill="currentColor" stroke="none"/><rect x="574.8" y="160" width="1.6" height="24.6" rx="0" fill="currentColor" stroke="none"/><rect x="577" y="137.3" width="1.6" height="22.7" rx="0" fill="currentColor" stroke="none"/><rect x="579.2" y="137.7" width="1.6" height="22.3" rx="0" fill="currentColor" stroke="none"/><rect x="581.4" y="160" width="1.6" height="6.1" rx="0" fill="currentColor" stroke="none"/><rect x="583.6" y="147.9" width="1.6" height="12.1" rx="0" fill="currentColor" stroke="none"/><rect x="585.8" y="141.8" width="1.6" height="18.2" rx="0" fill="currentColor" stroke="none"/><rect x="588" y="134.4" width="1.6" height="25.6" rx="0" fill="currentColor" stroke="none"/><rect x="590.2" y="158.6" width="1.6" height="1.4" rx="0" fill="currentColor" stroke="none"/><rect x="592.4" y="160" width="1.6" height="15.7" rx="0" fill="currentColor" stroke="none"/><rect x="594.6" y="143.9" width="1.6" height="16.1" rx="0" fill="currentColor" stroke="none"/><rect x="596.8" y="160" width="1.6" height="4.9" rx="0" fill="currentColor" stroke="none"/><rect x="599" y="142.3" width="1.6" height="17.7" rx="0" fill="currentColor" stroke="none"/><rect x="601.2" y="127.8" width="1.6" height="32.2" rx="0" fill="currentColor" stroke="none"/><rect x="603.4" y="159.9" width="1.6" height="0.1" rx="0" fill="currentColor" stroke="none"/><rect x="605.6" y="160" width="1.6" height="13.5" rx="0" fill="currentColor" stroke="none"/><rect x="607.8" y="156.8" width="1.6" height="3.2" rx="0" fill="currentColor" stroke="none"/><rect x="610" y="160" width="1.6" height="8" rx="0" fill="currentColor" stroke="none"/><rect x="612.2" y="154.1" width="1.6" height="5.9" rx="0" fill="currentColor" stroke="none"/><rect x="614.4" y="160" width="1.6" height="18.8" rx="0" fill="currentColor" stroke="none"/><rect x="616.6" y="157.1" width="1.6" height="2.9" rx="0" fill="currentColor" stroke="none"/><rect x="618.8" y="160" width="1.6" height="16.9" rx="0" fill="currentColor" stroke="none"/><rect x="621" y="140.1" width="1.6" height="19.9" rx="0" fill="currentColor" stroke="none"/><line x1="56" y1="160" x2="627.2" y2="160" stroke="currentColor" stroke-width="1"/><line x1="56" y1="204" x2="627.2" y2="204" stroke="currentColor" stroke-width="0.6" stroke-dasharray="3 3" stroke-opacity="0.25"/><text x="52" y="208" font-size="11" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">-0.2</text><line x1="56" y1="116" x2="627.2" y2="116" stroke="currentColor" stroke-width="0.6" stroke-dasharray="3 3" stroke-opacity="0.25"/><text x="52" y="120" font-size="11" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">0.2</text><line x1="56" y1="72" x2="627.2" y2="72" stroke="currentColor" stroke-width="0.6" stroke-dasharray="3 3" stroke-opacity="0.25"/><text x="52" y="76" font-size="11" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">0.4</text><line x1="56" y1="28" x2="627.2" y2="28" stroke="currentColor" stroke-width="0.6" stroke-dasharray="3 3" stroke-opacity="0.25"/><text x="52" y="32" font-size="11" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">0.6</text><text x="52" y="164" font-size="11" text-anchor="end" fill-opacity="0.8" fill="currentColor" stroke="none">0</text><text x="200" y="40.8" font-size="12" text-anchor="start" font-weight="600" class="acc-fill" stroke="none">0x3c: 0.56 (the key)</text><text x="387.2" y="107.8" font-size="11" text-anchor="start" fill-opacity="0.85" fill="currentColor" stroke="none">next best 0.21</text><text x="61" y="222" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0x00</text><text x="201.8" y="222" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0x40</text><text x="342.6" y="222" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0x80</text><text x="483.4" y="222" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0xc0</text><text x="622" y="222" font-size="11" text-anchor="middle" fill-opacity="0.75" fill="currentColor" stroke="none">0xff</text><text x="340" y="242" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">key-byte guess g</text></svg>
<figcaption>Figure 18.8. The output of the correlation power analysis program above, for all 256 guesses. With noise larger than the signal and only 300 traces, the right key byte still towers over the rest.</figcaption>
</figure>

**Defenses.**

- **Masking** splits every secret value into random shares: instead of $x$, the
  chip handles $x \oplus r$ and $r$ for a fresh random $r$, and computes on the
  shares so that no single wire or instruction ever depends on $x$ alone. Then
  each measurement is independent of the key, and the attacker has to combine
  several points of a trace, which multiplies the noise. Masking is cheap for
  XOR and costly for the S-box, which is not linear.
- **Hiding**: random delays, shuffled order of S-box operations, and circuits
  built so every operation draws the same power.
- **Protected hardware**: smart cards, secure elements and HSMs combine all of
  these, and certification labs attack them as part of evaluation.

Masking post-quantum schemes such as ML-KEM and ML-DSA ([Chapter 21](21-Lattice-Cryptography.md))
is harder than masking AES, because they mix arithmetic modulo $q$ with bit
operations, and it is an active research area.

!!! note "Life story: differential power analysis"
    **Born:** 1998, Paul Kocher, Joshua Jaffe and Benjamin Jun at Cryptography Research in San Francisco,
    published at CRYPTO 1999; the correlation form by Brier, Clavier and Olivier in 2004 · **Purpose:** extract
    keys from smart cards with statistics instead of a clear view of each operation · **Helped:** forced the
    smart card industry to add masking and hiding, and made power analysis part of Common Criteria testing ·
    **Status:** current; masking is the standard defense, now being extended to ML-KEM and ML-DSA

## 18.5 Cache attacks

*Level: intermediate.*

A program does not need a probe on the power line to measure another program.
On a shared CPU, it can measure the **cache**, the small fast memory that holds
recently used data. If the victim has just read a memory line, that line is in
the cache, and reading it again is fast; if not, it is slow. The difference is
about a hundred processor cycles, easy to time.

Fast software AES used **T-tables**: four tables of 256 four-byte entries that
combine SubBytes and MixColumns, indexed by bytes of state. In the first round
the index is $p_i \oplus k_i$, plaintext byte XOR key byte. Which part of the
table gets loaded into cache therefore depends on the key. In 2005 Daniel
Bernstein recovered a full AES key from the timing of a server running
OpenSSL's AES, and Dag Arne Osvik, Adi Shamir and Eran Tromer showed attacks in
which a spy process on the same machine **primes** the cache with its own data,
lets the victim encrypt, then **probes** which of its lines were evicted. They
recovered the AES key of Linux disk encryption in 65 milliseconds of
measurement. Colin Percival showed the same year that a process on one
hyperthread could watch OpenSSL's RSA through the cache.

In 2014 Yuval Yarom and Katrina Falkner made the attack precise with
**Flush+Reload**: when two programs share a library in memory (as programs
using the same OpenSSL do), the spy flushes a line of the victim's code from
the cache, waits, and times reloading it. A fast reload means the victim ran
that code. Applied to the square-and-multiply loop in GnuPG, it reads the
exponent's bits directly, like the trace in 18.3. Cloud servers, where strangers
share hardware, made this a practical threat.

<figure class="mars-fig" id="fig-18-flush">
<svg viewBox="0 0 660 250" width="660" role="img" aria-label="Flush+Reload: spy flushes a shared line, victim may use it, spy times the reload"><rect x="15" y="20" width="195" height="80" rx="6" class="soft" stroke="none"/><rect x="15" y="20" width="195" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="112.5" y="48.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">1. flush</text><text x="112.5" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">spy evicts a line of</text><text x="112.5" y="80.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">shared library code</text><line x1="210" y1="60" x2="230" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="230,60 222.7,63.3 222.7,56.7" fill="currentColor" stroke="none"/><rect x="230" y="20" width="195" height="80" rx="6" class="soft" stroke="none"/><rect x="230" y="20" width="195" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="327.5" y="48.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">2. wait</text><text x="327.5" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">victim runs; if it uses</text><text x="327.5" y="80.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">that code, it is cached again</text><line x1="425" y1="60" x2="445" y2="60" stroke="currentColor" stroke-width="1.5"/><polygon points="445,60 437.7,63.3 437.7,56.7" fill="currentColor" stroke="none"/><rect x="445" y="20" width="195" height="80" rx="6" class="soft" stroke="none"/><rect x="445" y="20" width="195" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="542.5" y="48.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">3. reload</text><text x="542.5" y="64.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">spy reads the line</text><text x="542.5" y="80.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">and times it</text><text x="120" y="135" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">reload time</text><rect x="200" y="120" width="60" height="22" rx="3" class="soft-acc" stroke="none"/><text x="270" y="136" font-size="12" text-anchor="start" class="acc-fill" stroke="none">≈ 50 cycles: fast → victim used it</text><rect x="200" y="154" width="250" height="22" rx="3" class="soft" stroke="none"/><text x="460" y="170" font-size="12" text-anchor="start" fill="currentColor" stroke="none">≈ 250+ cycles: slow → it did not</text><text x="330" y="215" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">On the square-and-multiply loop: watch the multiply routine; each hit is a 1 bit.</text><text x="330" y="235" font-size="11" text-anchor="middle" fill-opacity="0.7" fill="currentColor" stroke="none">(cycle counts are typical orders of magnitude, not measurements)</text></svg>
<figcaption>Figure 18.9. Flush+Reload in three steps. The spy never reads the victim's data, only the time it takes to read shared code, and that time says whether the victim just ran it.</figcaption>
</figure>

**Defenses.**

- **No secret-dependent memory addresses.** Never index a table with a secret.
- **AES in hardware**: AES-NI instructions on Intel and AMD processors (shipping
  from 2010) and Arm's cryptography extensions take the same time for every
  input and touch no tables.
- **Bitsliced** software AES computes the S-box as a fixed circuit of AND, XOR and
  NOT on many blocks at once, with no lookups.
- **Ciphers without tables.** ChaCha20 ([Chapter 5](05-Stream-Ciphers.md)) uses
  only addition, rotation and XOR, which is part of why Google chose it for
  phones without AES instructions.

!!! note "Life story: table-based (T-table) AES"
    **Born:** 1998 to 1999, in Joan Daemen and Vincent Rijmen's Rijndael submission, as the fast way to run AES
    on 32-bit processors · **Helped:** made AES the fastest software cipher of its day · **Broken:** 2005, cache
    timing (Bernstein; Osvik, Shamir and Tromer) · **Replaced by:** AES-NI instructions (from 2010), bitsliced code
    (Emilia Käsper and Peter Schwabe, 2009) and table-free designs such as ChaCha20

## 18.6 Speculative execution: Spectre and Meltdown

*Level: intermediate.*

On 3 January 2018 two classes of attack were disclosed together, found
independently by several teams, among them Jann Horn of Google Project Zero,
Paul Kocher, and researchers at Graz University of Technology. They showed that
the cache could leak not just *which* data the victim used, but data the victim
**never meant to use at all**.

Modern processors guess. When they reach a branch whose condition is not yet
known, they predict the outcome and run ahead **speculatively**; if the guess
was wrong, they throw the results away. But the cache lines loaded during the
wrong guess stay loaded.

- **Spectre (variant 1)** trains the branch predictor so that a bounds check
  like `if (i < len) y = table[secret_array[i] * 64]` is predicted true for an
  out-of-bounds `i`. During speculation the processor reads a secret byte and
  uses it as an index, loading one cache line that depends on it. The attacker
  then finds that line with Flush+Reload. Variant 2 poisons the prediction of
  indirect jumps instead.
- **Meltdown** exploited the fact that some processors, mainly Intel's, checked
  permissions on a kernel memory read only after speculatively using the value,
  so user programs could read kernel memory.

For cryptography, the shock was that **constant-time code is not enough**:
code that has no secret-dependent branches can still be made to access a
secret speculatively by *other* code. Meltdown was fixed by separating kernel
and user page tables (KPTI) and in later hardware. Spectre is a family that
keeps growing; the defenses are compiler barriers and "retpolines", hardware
changes, and isolation: browsers moved each site into its own process (Chrome's
site isolation, 2018) and made timers coarser, so JavaScript cannot keep secrets
of another site in its own address space.

<figure class="mars-fig" id="fig-18-spectre">
<svg viewBox="0 0 660 260" width="660" role="img" aria-label="Spectre variant 1: the predictor guesses the bounds check is true and the CPU reads out of bounds speculatively"><rect x="20" y="20" width="250" height="44" rx="6" class="soft" stroke="none"/><rect x="20" y="20" width="250" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="145" y="46.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">if (i &lt; len)  …  i is out of bounds</text><line x1="145" y1="64" x2="145" y2="96" stroke="currentColor" stroke-width="1.5"/><polygon points="145,96 141.7,88.7 148.3,88.7" fill="currentColor" stroke="none"/><text x="152" y="80" font-size="12" text-anchor="start" class="acc-fill" stroke="none">guessed "true"</text><rect x="20" y="96" width="250" height="44" rx="6" class="soft-acc" stroke="none"/><rect x="20" y="96" width="250" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="145" y="122.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">s = secret_array[i]   (secret byte)</text><line x1="145" y1="140" x2="145" y2="172" stroke="currentColor" stroke-width="1.5"/><polygon points="145,172 141.7,164.7 148.3,164.7" fill="currentColor" stroke="none"/><rect x="20" y="172" width="250" height="44" rx="6" class="soft-acc" stroke="none"/><rect x="20" y="172" width="250" height="44" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="145" y="198.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">y = table[s * 64]  → loads line s</text><rect x="10" y="88" width="270" height="136" rx="8" class="acc" fill="none" stroke-width="1.5" stroke-dasharray="6 4"/><text x="145" y="242" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">speculative: results thrown away</text><line x1="280" y1="194" x2="380" y2="194" stroke="currentColor" stroke-width="1.5"/><polygon points="380,194 372.7,197.3 372.7,190.7" fill="currentColor" stroke="none"/><text x="330" y="186" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">but the</text><text x="330" y="214" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">cache keeps it</text><text x="520" y="30" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">cache lines of table</text><rect x="420" y="44" width="200" height="18" rx="2" class="soft" stroke="none"/><text x="430" y="58" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 0</text><rect x="420" y="66" width="200" height="18" rx="2" class="soft" stroke="none"/><text x="430" y="80" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 1</text><rect x="420" y="88" width="200" height="18" rx="2" class="soft" stroke="none"/><text x="430" y="102" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 2</text><rect x="420" y="110" width="200" height="18" rx="2" class="soft" stroke="none"/><text x="430" y="124" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 3</text><rect x="420" y="132" width="200" height="18" rx="2" class="soft" stroke="none"/><text x="430" y="146" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 4</text><rect x="420" y="154" width="200" height="18" rx="2" class="soft-acc" stroke="none"/><text x="430" y="168" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 5</text><rect x="420" y="176" width="200" height="18" rx="2" class="soft" stroke="none"/><text x="430" y="190" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 6</text><rect x="420" y="198" width="200" height="18" rx="2" class="soft" stroke="none"/><text x="430" y="212" font-size="11" text-anchor="start" fill="currentColor" stroke="none">line 255</text><text x="520" y="168" font-size="11" text-anchor="middle" class="acc-fill" stroke="none">← fast to reload</text><text x="520" y="236" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">Flush+Reload finds the fast line → s</text></svg>
<figcaption>Figure 18.10. Spectre variant 1. The processor runs ahead on a wrong guess, reads a secret it was never allowed to read, and leaves a footprint in the cache that outlives the discarded work.</figcaption>
</figure>

!!! note "Life story: Spectre and Meltdown"
    **Born:** found independently in 2017 by Jann Horn (Google Project Zero), Paul Kocher, and teams at Graz
    University of Technology and elsewhere; disclosed on 3 January 2018 · **Purpose:** to show that the CPU's
    speculation leaks data across every software boundary · **Helped:** KPTI in every operating system, browser
    site isolation, and a new field of speculative-execution research · **Status:** Meltdown is fixed in
    hardware and software; Spectre variants are still being found

In 2022 **Hertzbleed** added another twist: modern CPUs change their clock
frequency with power draw, and power draw depends on the data. So even
constant-*cycle* code can take different wall-clock time. Its authors used it to
recover keys from an implementation of the post-quantum scheme SIKE, remotely.

## 18.7 Fault attacks

*Level: intermediate.*

Instead of watching the computation, an attacker can **disturb** it: a brief
drop in supply voltage, a glitch on the clock, a laser flash on the chip, or an
electromagnetic pulse. A well-timed fault changes one value, and the wrong
answer can reveal more than the right one.

**The Bellcore attack on RSA-CRT.** RSA implementations sign with the Chinese
remainder theorem ([Chapter 13](13-RSA.md)): they compute $s_p = m^{d_p} \bmod p$
and $s_q = m^{d_q} \bmod q$ separately and combine them, which is about four
times faster. In September 1996 Dan Boneh, Richard DeMillo and Richard Lipton,
at Bellcore (Bell Communications Research), announced that a fault in one of
the two halves breaks the key. Their paper needed a correct and a faulty
signature on the same message; Arjen Lenstra observed in a note soon after that
a single faulty signature on a known message is enough.

Why it works: suppose the fault hits only the mod-$q$ half. Then the faulty
signature $s'$ is still correct modulo $p$, so $s'^e \equiv m \pmod p$, but
$s'^e \not\equiv m \pmod q$. So $s'^e - m$ is a multiple of $p$ but not of $q$,
and

$$
\gcd(s'^e - m,\; n) = p .
$$

**By hand** with $p = 61$, $q = 53$, $n = 3233$, $e = 17$, $d = 2753$, and
message $m = 65$. The CRT exponents are $d_p = 2753 \bmod 60 = 53$ and
$d_q = 2753 \bmod 52 = 49$, and $q^{-1} \bmod p = 38$.

$$
\begin{aligned}
s_p &= 65^{53} \bmod 61 = 39, \qquad s_q = 65^{49} \bmod 53 = 5 \\
s &= s_q + q \cdot \big(q^{-1} (s_p - s_q) \bmod p\big) = 588 \qquad \text{(correct)} \\
s_q' &= 4 \qquad \text{(a fault flips the lowest bit)} \\
s' &= 4 + 53 \cdot \big(38 \cdot (39 - 4) \bmod 61\big) = 2601 \\
s'^{17} \bmod 3233 &= 2871 \ne 65 \\
\gcd(2871 - 65,\; 3233) &= \gcd(2806,\; 3233) = 61 = p .
\end{aligned}
$$

**Code it** at a more realistic size, with two known Mersenne primes of 521 and
607 bits standing in for random ones:

```python
from math import gcd

p, q = 2 ** 521 - 1, 2 ** 607 - 1        # two known primes, for a quick demo
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))
dp, dq, qinv = d % (p - 1), d % (q - 1), pow(q, -1, p)

def sign_crt(m, glitch=False):
    sp, sq = pow(m, dp, p), pow(m, dq, q)
    if glitch:
        sq ^= 1 << 100                    # one flipped bit in the mod-q half
    return sq + q * (qinv * (sp - sq) % p)

m = 0x5EED
s = sign_crt(m, glitch=True)
print(pow(s, e, n) == m)                  # the signature is wrong...
f = gcd(pow(s, e, n) - m, n)
print(f == p, n % f == 0)                 # ...and it hands over a prime factor

def sign_safe(m):                         # the fix: check before releasing
    s = sign_crt(m)
    if pow(s, e, n) != m:
        raise ValueError("fault detected")
    return s
print(pow(sign_safe(m), e, n) == m)
```

Output:

```
False
True True
True
```

The fix is in the last function: **verify every signature before releasing
it**. Verification with $e = 65537$ is cheap. Randomized padding (PSS) also
helps, because the attacker no longer knows the exact $m$ that was signed.

<figure class="mars-fig" id="fig-18-bellcore">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="Bellcore attack on RSA-CRT with the toy key: a fault in the mod q half lets gcd find p = 61"><rect x="250" y="10" width="160" height="36" rx="6" class="soft" stroke="none"/><rect x="250" y="10" width="160" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="32.9" font-size="14" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">m = 65</text><line x1="300" y1="46" x2="160" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="160,80 166.3,75.1 167.9,81.4" fill="currentColor" stroke="none"/><line x1="360" y1="46" x2="500" y2="80" stroke="currentColor" stroke-width="1.5"/><polygon points="500,80 492.1,81.4 493.7,75.1" fill="currentColor" stroke="none"/><rect x="60" y="80" width="200" height="50" rx="6" class="soft" stroke="none"/><rect x="60" y="80" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="160" y="101.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">s<tspan dy="4" font-size="9">p</tspan><tspan dy="-4">&#8203;</tspan> = 65⁵³ mod 61 = 39</text><text x="160" y="117.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">correct</text><rect x="400" y="80" width="200" height="50" rx="6" class="soft-acc" stroke="none"/><rect x="400" y="80" width="200" height="50" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="500" y="101.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">s<tspan dy="4" font-size="9">q</tspan><tspan dy="-4">&#8203;</tspan> = 5 → 4</text><text x="500" y="117.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">a glitch flips a bit</text><rect x="400" y="80" width="200" height="50" rx="6" class="acc" fill="none" stroke-width="2"/><line x1="160" y1="130" x2="300" y2="170" stroke="currentColor" stroke-width="1.5"/><polygon points="300,170 292.1,171.1 293.9,164.9" fill="currentColor" stroke="none"/><line x1="500" y1="130" x2="360" y2="170" stroke="currentColor" stroke-width="1.5"/><polygon points="360,170 366.1,164.9 367.9,171.1" fill="currentColor" stroke="none"/><rect x="210" y="170" width="240" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="192.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">combine (CRT): s′ = 2601</text><line x1="330" y1="206" x2="330" y2="230" stroke="currentColor" stroke-width="1.5"/><polygon points="330,230 326.7,222.7 333.3,222.7" fill="currentColor" stroke="none"/><rect x="130" y="230" width="400" height="56" rx="6" class="soft-acc" stroke="none"/><rect x="130" y="230" width="400" height="56" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="254.6" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">s′¹⁷ mod 3233 = 2871: right mod 61, wrong mod 53</text><text x="330" y="270.6" font-size="13" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">gcd(2871 − 65, 3233) = 61 = p</text></svg>
<figcaption>Figure 18.11. The Bellcore attack, with the numbers from the hand calculation. One wrong half-signature leaves the result correct modulo p and wrong modulo q, and a gcd separates the two.</figcaption>
</figure>

!!! note "Life story: the Bellcore fault attack"
    **Born:** September 1996, Dan Boneh, Richard DeMillo and Richard Lipton at Bellcore (Bell Communications
    Research); Arjen Lenstra's one-signature version followed weeks later · **Purpose:** to show that hardware
    errors, natural or induced, can break correct cryptography · **Helped:** "verify before you release" became
    a rule for every RSA-CRT implementation; it opened the field of fault attacks (Biham and Shamir's DFA,
    1997) · **Status:** current threat to unprotected hardware; the defense is cheap

**Other faults.**

- **Differential fault analysis** (Eli Biham and Adi Shamir, 1997) extends the
  idea to symmetric ciphers: compare correct and faulty encryptions of the same
  block. For AES, a single byte fault before the last MixColumns, with two
  faulty ciphertexts, is enough to cut the key search to something trivial
  (Gilles Piret and Jean-Jacques Quisquater, 2003).
- **Rowhammer** (Yoongu Kim and colleagues, 2014) showed that software alone can
  cause faults: reading two rows of DRAM over and over flips bits in the row
  between them. In 2016 the "Flip Feng Shui" attack used it to corrupt an RSA
  public key held in another virtual machine's memory, making it factorable.
- **Plundervolt** (2019) used the software interface for undervolting Intel
  processors to fault computations inside SGX enclaves and extract RSA and AES keys.
- **Deterministic signatures** like Ed25519 sign the same message with the same
  nonce every time. A fault that changes the computation once then gives two
  different signatures with one nonce, which reveals the key. Libraries for
  exposed hardware add fresh randomness to the nonce ("hedged" signatures).

<figure class="mars-fig" id="fig-18-rowhammer">
<svg viewBox="0 0 640 222" width="640" role="img" aria-label="Rowhammer: two aggressor DRAM rows read repeatedly flip bits in the victim row between them"><rect x="20" y="12" width="600" height="30" rx="3" class="soft" stroke="none"/><text x="30" y="32" font-size="13" text-anchor="start" fill="currentColor" stroke="none">row 41</text><text x="600" y="32" font-size="13" text-anchor="end" fill="currentColor" stroke="none"></text><rect x="20" y="48" width="600" height="30" rx="3" class="soft-acc" stroke="none"/><text x="30" y="68" font-size="13" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">row 42: aggressor</text><text x="600" y="68" font-size="13" text-anchor="end" fill="currentColor" stroke="none">read, read, read …</text><rect x="20" y="84" width="600" height="30" rx="3" class="soft" stroke="none"/><text x="30" y="104" font-size="13" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">row 43: victim</text><text x="600" y="104" font-size="13" text-anchor="end" class="acc-fill" stroke="none">0 1 1 0 1 0 0 1 → 0 1 1 0 0 0 0 1</text><rect x="20" y="120" width="600" height="30" rx="3" class="soft-acc" stroke="none"/><text x="30" y="140" font-size="13" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">row 44: aggressor</text><text x="600" y="140" font-size="13" text-anchor="end" fill="currentColor" stroke="none">read, read, read …</text><rect x="20" y="156" width="600" height="30" rx="3" class="soft" stroke="none"/><text x="30" y="176" font-size="13" text-anchor="start" fill="currentColor" stroke="none">row 45</text><text x="600" y="176" font-size="13" text-anchor="end" fill="currentColor" stroke="none"></text><text x="320" y="214" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">hundreds of thousands of reads within one refresh interval leak charge into the neighbor</text></svg>
<figcaption>Figure 18.12. Rowhammer is a fault attack from software. Hammering two rows disturbs the row between them; Flip Feng Shui steered such a flip into another virtual machine's RSA public key.</figcaption>
</figure>

**Defenses.** Verify results, compute twice and compare, add integrity checks
on keys, and in secure chips use sensors that wipe keys when voltage, clock,
light or temperature look wrong.

## 18.8 Error messages as oracles

*Level: intermediate.*

Some of the most damaging "side channels" are not physical at all. They are a
server telling the attacker, through an error code or a slightly different
response time, one fact about a decryption it should not have revealed. In the
language of [Chapter 17](17-Defining-Security.md), the server becomes a partial
decryption oracle, and the scheme was never secure against chosen-ciphertext
attack in the first place.

### Padding oracles in CBC

CBC mode ([Chapter 8](08-Modes-of-Operation.md)) encrypts whole 16-byte blocks,
so messages are **padded**. In PKCS#7 padding, if $k$ bytes are missing, $k$
bytes each of value $k$ are added: `...01`, `...02 02`, up to 16 bytes of `10`.
On decryption the receiver checks the padding and strips it.

In 2002 Serge Vaudenay showed that if the receiver reveals whether the padding
was valid, an attacker can decrypt anything. Recall how CBC decrypts:
$P_i = D_k(C_i) \oplus C_{i-1}$. The attacker sends a fake previous block $X$
followed by the target block $C_i$. The receiver computes $D_k(C_i) \oplus X$
and checks its padding.

<div class="mars-steps" markdown>

1. Try all 256 values for the last byte of $X$. One of them makes the last plaintext byte `01`, which is valid padding. Call it $g$.
2. Then $D_k(C_i)$ ends in $g \oplus \texttt{01}$: one byte of the block cipher's output, learned without the key.
3. Set the last byte of $X$ so the last plaintext byte becomes `02`, and search the second-last byte for valid `02 02` padding.
4. Continue to the first byte: at most $16 \times 256 = 4096$ queries give all of $D_k(C_i)$.
5. XOR with the real previous block $C_{i-1}$ to get the plaintext $P_i$. Repeat for every block.

</div>

<figure class="mars-fig" id="fig-18-padding">
<svg viewBox="0 0 660 300" width="660" role="img" aria-label="CBC padding oracle: the attacker sends a fake previous block X and the target block; the server reports only whether padding is valid"><rect x="60" y="20" width="200" height="40" rx="6" class="soft-acc" stroke="none"/><rect x="60" y="20" width="200" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="160" y="44.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">fake block X (attacker)</text><rect x="400" y="20" width="200" height="40" rx="6" class="soft" stroke="none"/><rect x="400" y="20" width="200" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="500" y="44.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">target block C<tspan dy="4" font-size="9">i</tspan><tspan dy="-4">&#8203;</tspan></text><line x1="500" y1="60" x2="500" y2="90" stroke="currentColor" stroke-width="1.5"/><polygon points="500,90 496.7,82.7 503.3,82.7" fill="currentColor" stroke="none"/><rect x="430" y="90" width="140" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="500" y="114.5" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">AES decrypt Dₖ</text><line x1="500" y1="130" x2="500" y2="160" stroke="currentColor" stroke-width="1.5"/><polygon points="500,160 496.7,152.7 503.3,152.7" fill="currentColor" stroke="none"/><text x="510" y="150" font-size="12" text-anchor="start" fill="currentColor" stroke="none">Dₖ(C<tspan dy="4" font-size="9">i</tspan><tspan dy="-4">&#8203;</tspan>)  (unknown)</text><circle cx="330" cy="175" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="180" font-size="18" text-anchor="middle" fill="currentColor" stroke="none">⊕</text><path d="M160 60 L160 175 L316 175" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="316,175 308.7,178.3 308.7,171.7" fill="currentColor" stroke="none"/><path d="M500 160 L500 175 L344 175" fill="none" stroke="currentColor" stroke-width="1.5"/><polygon points="344,175 351.3,171.7 351.3,178.3" fill="currentColor" stroke="none"/><line x1="330" y1="189" x2="330" y2="215" stroke="currentColor" stroke-width="1.5"/><polygon points="330,215 326.7,207.7 333.3,207.7" fill="currentColor" stroke="none"/><rect x="200" y="215" width="260" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="330" y="237.6" font-size="13" text-anchor="middle" fill="currentColor" stroke="none">P′ = Dₖ(C<tspan dy="4" font-size="9">i</tspan><tspan dy="-4">&#8203;</tspan>) ⊕ X : padding ok?</text><line x1="460" y1="233" x2="540" y2="233" class="acc" stroke-width="1.5"/><polygon points="540,233 532.7,236.3 532.7,229.7" class="acc-fill" stroke="none"/><text x="590" y="238" font-size="14" text-anchor="middle" font-weight="700" class="acc-fill" stroke="none">yes / no</text><text x="330" y="280" font-size="12" text-anchor="middle" fill-opacity="0.85" fill="currentColor" stroke="none">valid when P′ ends in 01: then the last byte of Dₖ(C<tspan dy="4" font-size="9">i</tspan><tspan dy="-4">&#8203;</tspan>) is X's last byte ⊕ 01</text></svg>
<figcaption>Figure 18.13. The padding oracle attack. The attacker controls X, so each yes reveals a byte of the block cipher's output; at most 256 tries per byte, 4096 per block.</figcaption>
</figure>

**Code it.** This needs a real block cipher, so it uses the `cryptography`
package for AES. The server never reveals anything but "padding valid or not":

```python
# pip install cryptography
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

KEY = os.urandom(16)

def encrypt(m):                          # AES-CBC with PKCS#7 padding, no MAC
    pad = 16 - len(m) % 16
    m += bytes([pad]) * pad
    iv = os.urandom(16)
    e = Cipher(algorithms.AES(KEY), modes.CBC(iv)).encryptor()
    return iv + e.update(m) + e.finalize()

def oracle(c):                           # the server: "is the padding valid?"
    d = Cipher(algorithms.AES(KEY), modes.CBC(c[:16])).decryptor()
    m = d.update(c[16:]) + d.finalize()
    pad = m[-1]
    return 1 <= pad <= 16 and m[-pad:] == bytes([pad]) * pad

def attack_block(prev, block):           # find D(block), byte by byte from the end
    inter = bytearray(16)
    for pos in range(15, -1, -1):
        pad = 16 - pos
        for g in range(256):
            fake = bytearray(16)
            fake[pos] = g
            for j in range(pos + 1, 16):
                fake[j] = inter[j] ^ pad
            if oracle(bytes(fake) + block):
                if pos == 15:            # rule out a lucky 0x02 0x02 ending
                    fake[14] ^= 1
                    if not oracle(bytes(fake) + block):
                        continue
                inter[pos] = g ^ pad
                break
    return bytes(a ^ b for a, b in zip(inter, prev))

c = encrypt(b"PIN 4071, send to account 22-9182")
blocks = [c[i:i + 16] for i in range(0, len(c), 16)]
plain = b"".join(attack_block(blocks[i], blocks[i + 1]) for i in range(len(blocks) - 1))
print(plain[:-plain[-1]])
```

Output:

```
b'PIN 4071, send to account 22-9182'
```

The attack never touches AES itself. The history of TLS shows how hard it was to
close this hole while keeping MAC-then-encrypt:

- TLS checked the MAC *after* the padding, so different error messages, or
  different timing, told the attacker which check failed. Brice Canvel and
  colleagues stole an email password this way in 2003, using timing.
- **Lucky Thirteen** (Nadhem AlFardan and Kenneth Paterson, 2013): even with
  identical errors, the MAC computation took slightly longer or shorter
  depending on how much padding was removed, because HMAC's work changes with
  the message length. The name comes from the 13 bytes of record header that
  go into the MAC, which made the timing difference just big enough.
- **POODLE** (Bodo Möller, Thai Duong and Krzysztof Kotowicz, 2014): SSL 3.0 did
  not check padding bytes at all, only the length byte, so about one tampered
  record in 256 was accepted, and each acceptance leaked a byte of a cookie.
  POODLE ended SSL 3.0 (RFC 7568).

The real fix is **encrypt-then-MAC** or an AEAD mode: check the MAC over the
ciphertext first, and never look at padding or plaintext of a forged message.
TLS 1.3 removed CBC entirely.

!!! note "Life story: the CBC padding oracle"
    **Born:** 2002, Serge Vaudenay at EPFL, Lausanne (EUROCRYPT 2002) · **Purpose:** to show that one bit of error
    information decrypts CBC · **Came back as:** the 2003 timing attack on TLS mail logins, Lucky Thirteen (2013)
    and POODLE (2014) · **Retired:** SSL 3.0 deprecated in 2015 (RFC 7568); TLS 1.3 (2018) has no CBC ·
    **Replaced by:** encrypt-then-MAC (RFC 7366 for TLS, 2014) and AEAD modes

### Bleichenbacher's attack on RSA padding

The same idea works on RSA. PKCS#1 v1.5 encryption pads a message $M$ to the
size of $n$ as

$$
\texttt{00} \;\Vert\; \texttt{02} \;\Vert\; \text{at least 8 random nonzero bytes} \;\Vert\; \texttt{00} \;\Vert\; M .
$$

A decrypted value that starts with `00 02` is called **conforming**. In SSL, the
client encrypted the session's premaster secret this way to the server's RSA
key, and servers answered differently when the padding was wrong.

In 1998 Daniel Bleichenbacher, at Bell Labs, showed how to use that one bit.
Textbook RSA is malleable ([Chapter 17](17-Defining-Security.md)): multiplying
the target ciphertext $c$ by $s^e$ multiplies the hidden plaintext by $s$. With
$k$ the length of $n$ in bytes and $B = 2^{8(k-2)}$, "conforming" means
$2B \le m \cdot s \bmod n < 3B$. Each conforming answer for some $s$ narrows
the interval where $m$ can lie, and after enough answers only one value is left.
It took about a million queries in 1998, hence its nickname, the "million
message attack".

The idea is easiest to see with an even more generous oracle, one that reveals
only whether the plaintext is odd. Doubling the plaintext ($c \cdot 2^e$) either
keeps $2m$ below $n$ (then $2m$ is even) or wraps past $n$ (then $2m - n$ is
odd, since $n$ is odd). So each answer tells whether $m$ is in the lower or
upper half of its range, and $\log_2 n$ answers find $m$ exactly:

```python
from fractions import Fraction

p, q = 2 ** 127 - 1, 2 ** 521 - 1       # two known primes, for a quick demo
n, e = p * q, 65537
d = pow(e, -1, (p - 1) * (q - 1))

def parity_oracle(c):                   # the leak: "was the plaintext odd?"
    return pow(c, d, n) & 1

m = int.from_bytes(b"one bit at a time", "big")
c = pow(m, e, n)

lo, hi = Fraction(0), Fraction(n)       # m is somewhere in [lo, hi)
two = pow(2, e, n)
for _ in range(n.bit_length()):
    c = c * two % n                     # doubles the hidden plaintext
    if parity_oracle(c):                # odd means 2m wrapped past n
        lo = (lo + hi) / 2
    else:
        hi = (lo + hi) / 2
print(int(hi).to_bytes(17, "big"), n.bit_length(), "queries")
```

Output:

```
b'one bit at a time' 648 queries
```

Bleichenbacher's oracle is weaker (it answers "yes" rarely), so it needs more
queries, but the principle is the same: **one bit of leakage per query is
enough to decrypt everything**.

<figure class="mars-fig" id="fig-18-parity">
<svg viewBox="0 0 660 380" width="660" role="img" aria-label="Parity oracle on the toy RSA key: twelve answers shrink the interval for m from 0 to 3233 down to 1234"><text x="20" y="20" font-size="12" text-anchor="start" font-weight="600" fill="currentColor" stroke="none">query</text><text x="80" y="20" font-size="12" text-anchor="middle" font-weight="600" fill="currentColor" stroke="none">odd?</text><rect x="120" y="28" width="500" height="14" rx="2" class="soft" stroke="none"/><text x="120" y="22" font-size="11" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">0</text><text x="620" y="22" font-size="11" text-anchor="middle" fill-opacity="0.8" fill="currentColor" stroke="none">n = 3233</text><text x="20" y="62" font-size="12" text-anchor="start" fill="currentColor" stroke="none">1</text><text x="80" y="62" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">no</text><rect x="120" y="50" width="250" height="16" rx="2" class="soft-acc" stroke="none"/><text x="20" y="87" font-size="12" text-anchor="start" fill="currentColor" stroke="none">2</text><text x="80" y="87" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">yes</text><rect x="245" y="75" width="125" height="16" rx="2" class="soft-acc" stroke="none"/><text x="20" y="112" font-size="12" text-anchor="start" fill="currentColor" stroke="none">3</text><text x="80" y="112" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">yes</text><rect x="307.5" y="100" width="62.5" height="16" rx="2" class="soft-acc" stroke="none"/><text x="20" y="137" font-size="12" text-anchor="start" fill="currentColor" stroke="none">4</text><text x="80" y="137" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">no</text><rect x="307.5" y="125" width="31.2" height="16" rx="2" class="soft-acc" stroke="none"/><text x="20" y="162" font-size="12" text-anchor="start" fill="currentColor" stroke="none">5</text><text x="80" y="162" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">no</text><rect x="307.5" y="150" width="15.6" height="16" rx="2" class="soft-acc" stroke="none"/><text x="20" y="187" font-size="12" text-anchor="start" fill="currentColor" stroke="none">6</text><text x="80" y="187" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">no</text><rect x="307.5" y="175" width="7.8" height="16" rx="2" class="soft-acc" stroke="none"/><text x="20" y="212" font-size="12" text-anchor="start" fill="currentColor" stroke="none">7</text><text x="80" y="212" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">no</text><rect x="307.5" y="200" width="3.9" height="16" rx="2" class="soft-acc" stroke="none"/><text x="301.5" y="212" font-size="11" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">[1212.4, 1237.6)</text><text x="20" y="237" font-size="12" text-anchor="start" fill="currentColor" stroke="none">8</text><text x="80" y="237" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">yes</text><rect x="309.5" y="225" width="2" height="16" rx="2" class="soft-acc" stroke="none"/><text x="303.5" y="237" font-size="11" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">[1225, 1237.6)</text><text x="20" y="262" font-size="12" text-anchor="start" fill="currentColor" stroke="none">9</text><text x="80" y="262" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">yes</text><rect x="310.4" y="250" width="1.5" height="16" rx="2" class="soft-acc" stroke="none"/><text x="304.4" y="262" font-size="11" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">[1231.3, 1237.6)</text><text x="20" y="287" font-size="12" text-anchor="start" fill="currentColor" stroke="none">10</text><text x="80" y="287" font-size="12" text-anchor="middle" fill="currentColor" stroke="none">no</text><rect x="310.4" y="275" width="1.5" height="16" rx="2" class="soft-acc" stroke="none"/><text x="304.4" y="287" font-size="11" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">[1231.3, 1234.5)</text><text x="20" y="312" font-size="12" text-anchor="start" fill="currentColor" stroke="none">11</text><text x="80" y="312" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">yes</text><rect x="310.7" y="300" width="1.5" height="16" rx="2" class="soft-acc" stroke="none"/><text x="304.7" y="312" font-size="11" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">[1232.9, 1234.5)</text><text x="20" y="337" font-size="12" text-anchor="start" fill="currentColor" stroke="none">12</text><text x="80" y="337" font-size="12" text-anchor="middle" class="acc-fill" stroke="none">yes</text><rect x="310.8" y="325" width="1.5" height="16" rx="2" class="soft-acc" stroke="none"/><text x="304.8" y="337" font-size="11" text-anchor="end" fill-opacity="0.85" fill="currentColor" stroke="none">[1233.7, 1234.5)</text><line x1="310.8" y1="26" x2="310.8" y2="350" class="acc" stroke-width="1.5" stroke-dasharray="4 3"/><text x="310.8" y="366" font-size="13" text-anchor="middle" font-weight="600" class="acc-fill" stroke="none">m = 1234</text></svg>
<figcaption>Figure 18.14. The parity oracle on the toy key n = 3233, decrypting m = 1234 (computed with the same loop as the program above). Each yes/no halves the interval; log₂ n ≈ 12 answers pin m down exactly.</figcaption>
</figure>

The TLS fix was to hide the error: if the padding is bad, continue with a random
premaster secret, so the handshake fails later in exactly the same way (RFC
5246 §7.4.7.1). Implementations kept getting it wrong:

- **DROWN** (Nimrod Aviram and colleagues, 2016): servers that still supported
  SSL 2.0 with the same RSA key as their TLS servers served as a Bleichenbacher
  oracle against the modern TLS connections.
- **ROBOT** ("Return Of Bleichenbacher's Oracle Threat", Hanno Böck, Juraj
  Somorovsky and Craig Young, 2017): products from several major vendors, and
  sites including Facebook and PayPal, still leaked through different error
  behavior. The researchers signed a message with Facebook's private key to
  prove it.
- **Marvin** (Hubert Kario, 2023): tiny timing differences in many libraries'
  RSA decryption still leaked conformance.

TLS 1.3 removed RSA key transport altogether. For new designs, RSA-OAEP or a KEM
with **implicit rejection** (ML-KEM returns a pseudorandom key for an invalid
ciphertext instead of an error, [Chapter 21](21-Lattice-Cryptography.md)) is the
answer.

!!! note "Life story: Bleichenbacher's attack"
    **Born:** 1998, Daniel Bleichenbacher at Bell Labs (CRYPTO 1998), against SSL's RSA key transport ·
    **Purpose:** to show that PKCS#1 v1.5 padding plus an error message is a decryption oracle · **Helped:** made
    chosen-ciphertext security (Chapter 17) a practical requirement and pushed RSA-OAEP · **Came back as:**
    DROWN (2016), ROBOT (2017), Marvin (2023) · **Retired:** TLS 1.3 (2018) removed RSA key transport ·
    **Replaced by:** ephemeral (EC)DH, and KEMs with implicit rejection

## 18.9 Writing constant-time code

*Level: intermediate.*

"Constant-time" does not literally mean that every call takes the same time. It
means that **the sequence of instructions executed and the memory addresses
accessed do not depend on secret data**. Then timing, cache state and branch
prediction carry no information about secrets. The rules:

1. **No secret-dependent branches.** No `if`, loop exit or early return that
   depends on a secret.
2. **No secret-dependent memory addresses.** No table lookup indexed by a secret.
3. **No variable-time instructions on secrets.** On many CPUs, division and
   sometimes multiplication take a time that depends on the operands. In
   December 2023, **KyberSlash** showed that reference code for Kyber (the
   basis of ML-KEM) divided a secret-dependent value by a constant, and some
   compilers and CPUs turned that into a variable-time division; key recovery
   was demonstrated.
4. **Compare secrets in constant time** and fail the same way for every error:
   same message, same code path, same time.

Rule 1 needs a way to choose between two values without `if`. The standard
trick builds a mask of all ones or all zeros from the secret bit:

```python
def select(bit, a, b):             # returns a if bit == 1 else b, without branching
    mask = -bit & 0xFFFFFFFF       # 0xFFFFFFFF or 0
    return (a & mask) | (b & ~mask & 0xFFFFFFFF)

def is_zero(x):                    # 1 if a 32-bit x is 0, else 0, without comparing
    return 1 ^ (((x | -x) & 0xFFFFFFFF) >> 31)

print(select(1, 7, 9), select(0, 7, 9), is_zero(0), is_zero(5), is_zero(0x80000000))
# 7 9 1 0 0
```

This is how the conditional swap in the Montgomery ladder (18.3) and
`compare_digest` are written in C. Python is only a sketch: its integers grow
and its interpreter branches internally.

**The compiler is not your friend.** An optimizing compiler may see that
`select` is a choice and turn it back into a branch. Constant-time C code is
therefore checked on the compiled machine code. Tools include Adam Langley's
**ctgrind** (2010), which uses Valgrind to flag branches on "secret" memory;
**dudect** (Oscar Reparaz, Josep Balasch and Ingrid Verbauwhede, 2017), which
runs the code on two classes of inputs and tests the timing distributions
statistically; and formally verified code generators such as HACL\* and
Fiat-Crypto, whose output ships in Firefox, Chrome and the Linux kernel.

**The practical rules for everyone else:**

1. Use a well-reviewed library. Almost every attack in this chapter was found in
   code written by experts.
2. Prefer primitives that are easy to implement safely: ChaCha20 or AES with
   hardware support, X25519 and Ed25519, AEAD modes.
3. Check every input (lengths, ranges, points on the curve) before using it.
4. Verify signatures before releasing them.
5. Keys that face physical attackers belong in protected hardware (smart cards,
   secure elements, HSMs).

## 18.10 In the real world

*Level: expert.*

**A timeline of the main results.**

| Year | Attack | What leaked |
|---|---|---|
| 1943 | Bell Telephone, 131-B2 | plaintext, from electromagnetic spikes |
| 1985 | van Eck | screen contents, from radio emissions |
| 1996 | Kocher | RSA and DH exponents, from timing |
| 1996 | Boneh, DeMillo, Lipton | RSA-CRT key, from one fault |
| 1998 | Kocher, Jaffe, Jun (DPA) | smart card keys, from power |
| 1998 | Bleichenbacher | RSA-encrypted session keys, from padding errors |
| 2002 | Vaudenay | CBC plaintext, from padding errors |
| 2003 | Brumley and Boneh | OpenSSL RSA key, over a network |
| 2005 | Bernstein; Osvik, Shamir, Tromer; Percival | AES and RSA keys, from the cache |
| 2008 | Halderman and colleagues (cold boot) | disk keys, from RAM that keeps data for seconds after power-off |
| 2013 | Genkin, Shamir, Tromer | GnuPG RSA keys, from the sound of a laptop, within an hour |
| 2013 | Lucky Thirteen | TLS CBC plaintext, from MAC timing |
| 2014 | Flush+Reload; POODLE | GnuPG keys; SSL 3.0 cookies |
| 2016 | DROWN; Flip Feng Shui | TLS sessions via SSL 2.0; RSA keys via Rowhammer |
| 2017 | ROBOT | TLS RSA keys at major sites |
| 2018 | Spectre, Meltdown | any memory in the same process or kernel |
| 2019 | Minerva, TPM-Fail; Plundervolt | ECDSA keys from nonce-length timing; SGX keys from undervolting |
| 2022 | Hertzbleed | SIKE keys, from CPU frequency |
| 2023 | KyberSlash; Marvin | Kyber keys from division timing; RSA conformance from timing |

**Certification.** Smart cards and secure elements are evaluated under Common
Criteria, where labs mount power, electromagnetic and fault attacks as part of
the test. FIPS 140-3 asks modules at its higher security levels to address
non-invasive attacks such as timing and power analysis. Payment cards, SIM cards
and passports are all built to survive these tests.

**Where you meet the defenses.** OpenSSL and BoringSSL use blinding for RSA,
constant-time code for elliptic curves, and AES-NI where present. Every
mainstream TLS library has removed or hardened its CBC and RSA-decryption code.
X25519 and Ed25519 were designed by Daniel Bernstein and colleagues with
constant-time implementation in mind. ML-KEM's implicit rejection exists so the
decapsulation step returns no error to leak. Browsers changed their timers and
process model after Spectre.

Full details and more incidents: [RSA reference](../02-signatures/RSA.md), [AES reference](../04-symmetric-ciphers/AES.md),
[Classic modes reference](../05-modes-aead/Classic-Modes.md).

## 18.11 Going deeper

*Level: expert.*

### How many traces?

For correlation power analysis, the number of traces needed grows with the
inverse square of the correlation $\rho$ of the right guess: to separate
a correlation of $\rho$ from 0 with confidence, the standard error
$1/\sqrt{N}$ must be several times smaller than $\rho$, so

$$
N \approx \frac{c}{\rho^2}
$$

for a small constant $c$ that depends on the confidence wanted. Halving the
signal-to-noise ratio roughly quadruples the traces. With masking of order $d$
(each secret split into $d + 1$ shares), the attacker must combine $d + 1$
points of the trace, and under enough noise the number of traces grows like
$\sigma^{2(d+1)}$ for noise standard deviation $\sigma$: exponentially in the
masking order. Suresh Chari, Charanjit Jutla, Josyula Rao and Pankaj Rohatgi
gave the first analysis of this in 1999, and later work on "probing security"
(Yuval Ishai, Amit Sahai and David Wagner, 2003) gave masking a proper security
definition, bringing [Chapter 17](17-Defining-Security.md)'s methods to side channels.

### Partial nonce leaks and lattices

ECDSA and DSA need a fresh secret nonce $k$ per signature
([Chapter 14](14-Discrete-Log-Systems.md)). Repeating it reveals the key; less
obviously, leaking **a few bits** of it does too. Each signature gives a linear
equation $s \, k \equiv h + x\,r \pmod q$ with unknown key $x$ and nonce $k$.
If the top few bits of each $k$ are known to be zero, the equations become an
instance of Dan Boneh and Ramarathnam Venkatesan's **hidden number problem**
(1996), and lattice reduction ([Chapter 21](21-Lattice-Cryptography.md)) solves
it with a few hundred to a few thousand signatures. Minerva and TPM-Fail
(2019) did exactly this: scalar multiplication took slightly less time for
nonces with leading zero bits, so timing told the attacker which signatures had
short nonces. The defense is a scalar multiplication whose time does not depend
on the bit length of $k$, such as a ladder over a fixed number of bits.

### Fault attacks against verification

Faults can also skip instructions. A glitch timed to skip the comparison at the
end of signature verification makes a secure boot loader accept unsigned code.
This is how many game consoles and phones have been opened, and it is why
secure boot code checks results twice, in different ways, and uses values that
are unlikely to arise from a single glitch (for example, `0x3CA5965A` instead
of 1 for "true").

### Constant time after Spectre

Spectre broke the assumption that only the instructions a program *commits*
matter. Research since 2018 defines "speculative constant time", in which
secrets must not reach memory addresses or branches even on mis-speculated paths,
and builds compilers and checkers for it. Cryptographic libraries also avoid
holding secrets in the same address space as untrusted code where they can:
browsers isolate sites, and servers keep long-term keys in a separate process or
an HSM, which can sign or decrypt but never hands out the key.

## Check yourself

??? question "1. A server compares a 16-byte token with an early-exit loop. How many guesses does the timing attack need at most, compared with brute force?"

    $16 \times 256 = 4096$ guesses (times the repetitions needed to average out noise), against
    $2^{128}$ for brute force.

??? question "2. Write the square-and-multiply trace (S and M) for the exponent $d = 13$, and read it back."

    $13 = 1101_2$. For each bit: S, then M if the bit is 1: SM SM S SM, so the trace is `SMSMSSM`.
    Reading "SM" as 1 and a lone "S" as 0 gives 1101, which is 13.

??? question "3. Why does the Montgomery ladder use a conditional swap instead of `if bit: ...`?"

    The `if` makes the instructions executed depend on the secret bit, which shows up in timing and
    in the branch predictor. The masked swap runs exactly the same instructions for 0 and 1; only
    the values change.

??? question "4. With the toy key ($n = 3233$, $e = 17$), a faulty CRT signature on $m = 65$ is $s' = 2601$. Show how to factor $n$."

    $s'^{17} \bmod 3233 = 2871$, and $\gcd(2871 - 65, 3233) = \gcd(2806, 3233) = 61$. So $p = 61$ and
    $q = 3233 / 61 = 53$.

??? question "5. A server returns \"bad MAC\" in 2 ms but \"bad padding\" in 1 ms, with the same error text. What is wrong, and how should it be fixed?"

    It is a padding oracle by timing: the attacker learns whether the padding was valid, which is all
    Vaudenay's attack needs. The fix is encrypt-then-MAC or an AEAD: verify the MAC over the ciphertext
    first and reject forgeries before padding is ever looked at.

??? question "6. In the padding oracle attack, why does the code double-check when the last byte gives valid padding?"

    Valid padding ending in `01` is what we want, but if the second-last decrypted byte happens to be
    `02`, the guess that makes the last byte `02` is valid too (`02 02`). Changing the second-last byte
    of the fake block and asking again tells the two cases apart: only `01` padding stays valid.

??? question "7. Why does an AES implementation with T-tables leak through the cache, and why doesn't AES-NI?"

    The first-round table index is plaintext byte XOR key byte, so which cache line is loaded depends
    on the key. AES-NI computes the round in a hardware unit with no memory lookups and fixed timing.

??? question "8. In correlation power analysis with signal variance 2 and noise variance 4, the best correlation is about 0.58. If the noise variance grows to 16, what is it, and roughly how many more traces are needed?"

    $\rho = \sqrt{2/(2 + 16)} = \sqrt{1/9} \approx 0.33$. Traces grow like $1/\rho^2$: from $3$ to $9$, so about three
    times as many.

??? question "9. Ed25519 signatures are deterministic. Why is that good against bad random generators but a risk against fault attacks?"

    No random nonce means no nonce reuse from a broken RNG. But the same message always uses the same
    nonce, so if a fault corrupts one signing of a message, the attacker has a correct and a faulty
    signature with the same nonce and can solve for the key. Hedged signing mixes in fresh randomness
    to get both protections.

??? question "10. Explain in one sentence why constant-time code was not enough after Spectre."

    Spectre makes the processor run, speculatively, code paths that the program never commits to,
    including other code that can be steered into touching the secret, so the secret can reach the
    cache even though the constant-time code itself never branches on it.

## What you learned

- A side channel is any measurable effect of secret data: time, power,
  radiation, sound, cache state, faults, and error behavior. Security proofs do
  not cover them.
- Early-exit comparisons and square and multiply leak their secrets through
  timing; constant-time comparison, the Montgomery ladder and blinding fix them.
- Power analysis and cache attacks recover AES keys from S-box and table
  lookups; masking, hardware AES and table-free designs are the answers.
- One fault in an RSA-CRT signature reveals a prime factor; verify before you release.
- Padding oracles and Bleichenbacher's attack turn one bit of error information
  into full decryption; authenticated encryption and implicit rejection end them.
- Constant-time code means no secret-dependent branches, addresses or
  variable-time instructions, checked on the compiled code; and since Spectre,
  isolation matters too.

**Next:** [Chapter 19](19-Protocols.md), where everything in the book comes
together in TLS, SSH, Signal and Wi-Fi, and where many of these attacks happened.

## Further reading

- Paul Kocher, "Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS,
  and Other Systems", CRYPTO 1996.
- Paul Kocher, Joshua Jaffe and Benjamin Jun, "Differential Power Analysis",
  CRYPTO 1999.
- Dan Boneh, Richard DeMillo and Richard Lipton, "On the Importance of Checking
  Cryptographic Protocols for Faults", EUROCRYPT 1997.
- Stefan Mangard, Elisabeth Oswald and Thomas Popp, *Power Analysis Attacks:
  Revealing the Secrets of Smart Cards* (Springer, 2007).
- Serge Vaudenay, "Security Flaws Induced by CBC Padding: Applications to SSL,
  IPSEC, WTLS...", EUROCRYPT 2002.
- Daniel Bleichenbacher, "Chosen Ciphertext Attacks Against Protocols Based on
  the RSA Encryption Standard PKCS #1", CRYPTO 1998.
- Yuval Yarom and Katrina Falkner, "FLUSH+RELOAD: a High Resolution, Low Noise,
  L3 Cache Side-Channel Attack", USENIX Security 2014.
- Paul Kocher and colleagues, "Spectre Attacks: Exploiting Speculative
  Execution", IEEE Symposium on Security and Privacy 2019.
- Ross Anderson, *Security Engineering* (3rd edition, Wiley, 2020), the chapters
  on emission security and physical tamper resistance.
