# 7. AES

*DES's key was too short and triple DES was slow, so in 1997 the US government
did something no government had done before: it asked the whole world to design
its next cipher, in public. The winner, Rijndael from Belgium, became the
Advanced Encryption Standard, and today it encrypts most of the data on Earth.
This chapter builds AES completely. First you learn the arithmetic it runs on,
the finite field $\mathrm{GF}(2^8)$, then each of its four steps by hand, then
one full round with the numbers from the standard, then the whole cipher in
Python, checked against FIPS 197. Last, you break a 4-round version with 768
chosen plaintexts, and see why the full 10 rounds stand after 25 years.*

!!! abstract "In this chapter"
    **You will learn:**

    - how the AES competition worked and why its openness mattered;
    - arithmetic in $\mathrm{GF}(2^8)$: adding and multiplying bytes as polynomials,
      and finding inverses;
    - the four steps of an AES round (SubBytes, ShiftRows, MixColumns,
      AddRoundKey) and the key schedule, each worked by hand;
    - how to code AES-128, -192 and -256 from scratch and test it;
    - the square attack on reduced AES, the best attacks on full AES, and why its
      real-world failures were side channels.

    **You need:** [Chapter 6](06-Block-Ciphers.md) (block ciphers, SPNs,
    differential and linear cryptanalysis) and modular arithmetic from
    [Chapter 3](03-The-Arithmetic-of-Secrets.md).

    **Levels:** §7.1 and §7.2 are for beginners, §7.3 to §7.10 are intermediate,
    §7.11 is expert.

## 7.1 The problem: replacing DES

By the mid-1990s DES was finished. Its 56-bit key was within reach of a
purpose-built machine (Deep Crack would prove it in 1998), and triple DES, the
stopgap, ran three times slower and still had DES's 64-bit block. The world needed
a new standard cipher, and it had learned something from DES: a cipher designed
behind closed doors, with an intelligence agency's unexplained changes, would be
suspected for decades whatever its merits.

So in January 1997 the US National Institute of Standards and Technology (NIST)
announced a different process. Anyone, anywhere, could submit a cipher. The rules
were a 128-bit block and keys of 128, 192 and 256 bits, free worldwide use if
chosen, and full publication. Every submission would be attacked in public, at
open conferences, by anyone who wanted to try.

Fifteen candidates from twelve countries arrived in August 1998: from Korea
(CRYPTON), Japan (E2, from NTT), France (DFC), Germany (MAGENTA), Australia
(LOKI97), Costa Rica (FROG), Canada (CAST-256), the US and Europe. Some fell
quickly to public cryptanalysis, which was the point. In August 1999 NIST named
five finalists:

| Finalist | Designers | Structure |
|---|---|---|
| MARS | IBM | heterogeneous Feistel |
| RC6 | Ron Rivest and colleagues, RSA Laboratories | Feistel with data-dependent rotations |
| Rijndael | Joan Daemen and Vincent Rijmen, Belgium | substitution-permutation network |
| Serpent | Ross Anderson, Eli Biham and Lars Knudsen (UK, Israel, Norway) | substitution-permutation network |
| Twofish | Bruce Schneier and colleagues, Counterpane | Feistel |

None of the five was broken. On 2 October 2000 NIST chose **Rijndael** (a blend of
its designers' names) for its speed on everything from 8-bit smart cards to
servers, its simple structure, and its comfortable security margin. FIPS 197 was
published on 26 November 2001. Rijndael itself allows blocks of 128, 192 and 256
bits; AES is Rijndael with the 128-bit block only.

<figure class="mars-fig">
<svg viewBox="0 0 680 300" width="680" role="img" aria-label="Fifteen candidates in 1998, five finalists in 1999, one winner in 2000" fill="currentColor" font-size="13">
<text x="110" y="20" font-size="13" text-anchor="middle" font-weight="bold">August 1998: 15</text>
<text x="110" y="44" font-size="12.5" text-anchor="middle" fill-opacity="0.6">CAST-256</text>
<text x="110" y="61.5" font-size="12.5" text-anchor="middle" fill-opacity="0.6">CRYPTON</text>
<text x="110" y="79" font-size="12.5" text-anchor="middle" fill-opacity="0.6">DEAL</text>
<text x="110" y="96.5" font-size="12.5" text-anchor="middle" fill-opacity="0.6">DFC</text>
<text x="110" y="114" font-size="12.5" text-anchor="middle" fill-opacity="0.6">E2</text>
<text x="110" y="131.5" font-size="12.5" text-anchor="middle" fill-opacity="0.6">FROG</text>
<text x="110" y="149" font-size="12.5" text-anchor="middle" fill-opacity="0.6">HPC</text>
<text x="110" y="166.5" font-size="12.5" text-anchor="middle" fill-opacity="0.6">LOKI97</text>
<text x="110" y="184" font-size="12.5" text-anchor="middle" fill-opacity="0.6">MAGENTA</text>
<text x="110" y="201.5" font-size="12.5" text-anchor="middle" font-weight="bold">MARS</text>
<text x="110" y="219" font-size="12.5" text-anchor="middle" font-weight="bold">RC6</text>
<text x="110" y="236.5" font-size="12.5" text-anchor="middle" font-weight="bold" class="acc-fill">Rijndael</text>
<text x="110" y="254" font-size="12.5" text-anchor="middle" fill-opacity="0.6">SAFER+</text>
<text x="110" y="271.5" font-size="12.5" text-anchor="middle" font-weight="bold">Serpent</text>
<text x="110" y="289" font-size="12.5" text-anchor="middle" font-weight="bold">Twofish</text>
<text x="360" y="20" font-size="13" text-anchor="middle" font-weight="bold">August 1999: 5</text>
<rect x="300" y="70" width="120" height="28" rx="4" class="soft"/>
<rect x="300" y="70" width="120" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="88.5" font-size="13" text-anchor="middle">MARS</text>
<line x1="165" y1="197.5" x2="298" y2="84" stroke="currentColor" stroke-width="1"/>
<polygon points="298,84 294.9,90.3 291.3,86.1" fill="currentColor"/>
<rect x="300" y="110" width="120" height="28" rx="4" class="soft"/>
<rect x="300" y="110" width="120" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="128.6" font-size="13" text-anchor="middle">RC6</text>
<line x1="165" y1="215" x2="298" y2="124" stroke="currentColor" stroke-width="1"/>
<polygon points="298,124 294.2,129.9 291.1,125.4" fill="currentColor"/>
<rect x="300" y="150" width="120" height="28" rx="4" class="soft-acc"/>
<rect x="300" y="150" width="120" height="28" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="360" y="168.6" font-size="13" text-anchor="middle">Rijndael</text>
<line x1="165" y1="232.5" x2="298" y2="164" class="acc" stroke-width="1"/>
<polygon points="298,164 293.5,169.4 291,164.5" class="acc-fill"/>
<rect x="300" y="190" width="120" height="28" rx="4" class="soft"/>
<rect x="300" y="190" width="120" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="208.6" font-size="13" text-anchor="middle">Serpent</text>
<line x1="165" y1="267.5" x2="298" y2="204" stroke="currentColor" stroke-width="1"/>
<polygon points="298,204 293.4,209.2 291,204.3" fill="currentColor"/>
<rect x="300" y="230" width="120" height="28" rx="4" class="soft"/>
<rect x="300" y="230" width="120" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="360" y="248.6" font-size="13" text-anchor="middle">Twofish</text>
<line x1="165" y1="285" x2="298" y2="244" stroke="currentColor" stroke-width="1"/>
<polygon points="298,244 292.6,248.5 291,243.3" fill="currentColor"/>
<text x="580" y="20" font-size="13" text-anchor="middle" font-weight="bold">October 2000: 1</text>
<rect x="510" y="140" width="140" height="34" rx="4" class="soft-acc"/>
<rect x="510" y="140" width="140" height="34" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="580" y="161.6" font-size="13" text-anchor="middle" font-weight="bold">Rijndael → AES</text>
<line x1="420" y1="164" x2="508" y2="157" class="acc" stroke-width="1.4"/>
<polygon points="508,157 501.8,160.2 501.4,154.8" class="acc-fill"/>
<text x="580" y="200" font-size="12.5" text-anchor="middle">Joan Daemen and</text>
<text x="580" y="216" font-size="12.5" text-anchor="middle">Vincent Rijmen, Belgium</text>
</svg>
<figcaption>Figure 7.1. The AES competition. All fifteen designs were attacked in public at three conferences; the five finalists all survived, and Rijndael won on speed across every kind of processor, simplicity and margin.</figcaption>
</figure>

The winners were two young Belgian cryptographers. Joan Daemen and Vincent
Rijmen had both done their doctorates in the COSIC group of the Katholieke
Universiteit Leuven; by the time of the competition Daemen worked for Proton
World, a smart-card company, and Rijmen was a researcher at Leuven. Daemen's
doctoral thesis of 1995 had set out a way to design ciphers whose resistance to
differential and linear cryptanalysis could be proved, the **wide trail
strategy** of §7.11, and the two had already built ciphers on it, among them
Square in 1997. Rijndael was that idea scaled up to a standard. The candidates
were examined at three open conferences, in Ventura, California (August 1998),
Rome (March 1999) and New York (April 2000), where the attendees were asked
which ciphers they preferred, and Rijndael came out on top.

The open process worked. In 2003 the NSA approved AES for classified information
(128-bit keys up to SECRET, 192 and 256 up to TOP SECRET), the first time a public
cipher was trusted that way, and NIST has run its big choices since (SHA-3, the
post-quantum standards) the same way.

!!! note "Life story: AES (Rijndael)"
    **Born:** 1997 to 1998, Rijndael by Joan Daemen and Vincent Rijmen in
    Belgium; chosen by NIST on 2 October 2000; FIPS 197 on 26 November 2001 ·
    **Purpose:** to replace DES with a public, royalty-free cipher that was fast
    on everything from smart cards to servers · **Helped:** TLS, Wi-Fi, disk
    and phone encryption, VPNs and archives; the first public cipher approved
    for TOP SECRET information (2003); built into nearly every processor sold
    since about 2010 · **Status:** current and recommended; AES-256 for data
    that must stay secret for decades

Figure 7.2 collects the dates of the story so far and of the attacks this
chapter will show.

<figure class="mars-fig">
<svg viewBox="0 0 640 368" width="640" role="img" aria-label="Timeline of AES from the 1997 call for candidates to the 2023 update of FIPS 197" fill="currentColor" font-size="14">
<line x1="92" y1="8" x2="92" y2="360" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="27" font-size="14" text-anchor="end" font-weight="bold">1997</text>
<circle cx="92" cy="22" r="3.5" fill="currentColor"/>
<text x="108" y="27" font-size="14" text-anchor="start">January: NIST asks the world for a new cipher</text>
<text x="78" y="53" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">1997</text>
<circle cx="92" cy="48" r="4.5" class="acc-fill"/>
<text x="108" y="53" font-size="14" text-anchor="start" class="acc-fill">Daemen, Knudsen, Rijmen: Square and its attack</text>
<text x="78" y="79" font-size="14" text-anchor="end" font-weight="bold">1998</text>
<circle cx="92" cy="74" r="3.5" fill="currentColor"/>
<text x="108" y="79" font-size="14" text-anchor="start">August: 15 candidates presented at AES1, California</text>
<text x="78" y="105" font-size="14" text-anchor="end" font-weight="bold">1999</text>
<circle cx="92" cy="100" r="3.5" fill="currentColor"/>
<text x="108" y="105" font-size="14" text-anchor="start">March: AES2 in Rome; August: five finalists</text>
<text x="78" y="131" font-size="14" text-anchor="end" font-weight="bold">2000</text>
<circle cx="92" cy="126" r="3.5" fill="currentColor"/>
<text x="108" y="131" font-size="14" text-anchor="start">October 2: Rijndael chosen</text>
<text x="78" y="157" font-size="14" text-anchor="end" font-weight="bold">2001</text>
<circle cx="92" cy="152" r="3.5" fill="currentColor"/>
<text x="108" y="157" font-size="14" text-anchor="start">November 26: FIPS 197 published</text>
<text x="78" y="183" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2002</text>
<circle cx="92" cy="178" r="4.5" class="acc-fill"/>
<text x="108" y="183" font-size="14" text-anchor="start" class="acc-fill">XSL algebraic attack claimed (does not work)</text>
<text x="78" y="209" font-size="14" text-anchor="end" font-weight="bold">2003</text>
<circle cx="92" cy="204" r="3.5" fill="currentColor"/>
<text x="108" y="209" font-size="14" text-anchor="start">NSA approves AES for classified information</text>
<text x="78" y="235" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2005</text>
<circle cx="92" cy="230" r="4.5" class="acc-fill"/>
<text x="108" y="235" font-size="14" text-anchor="start" class="acc-fill">Bernstein; Osvik, Shamir, Tromer: cache-timing attacks</text>
<text x="78" y="261" font-size="14" text-anchor="end" font-weight="bold">2008</text>
<circle cx="92" cy="256" r="3.5" fill="currentColor"/>
<text x="108" y="261" font-size="14" text-anchor="start">Intel announces AES-NI (shipped 2010)</text>
<text x="78" y="287" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2009</text>
<circle cx="92" cy="282" r="4.5" class="acc-fill"/>
<text x="108" y="287" font-size="14" text-anchor="start" class="acc-fill">Related-key attacks on AES-256</text>
<text x="78" y="313" font-size="14" text-anchor="end" font-weight="bold" class="acc-fill">2011</text>
<circle cx="92" cy="308" r="4.5" class="acc-fill"/>
<text x="108" y="313" font-size="14" text-anchor="start" class="acc-fill">Biclique attack: 2¹²⁶·¹ for AES-128</text>
<text x="78" y="339" font-size="14" text-anchor="end" font-weight="bold">2023</text>
<circle cx="92" cy="334" r="3.5" fill="currentColor"/>
<text x="108" y="339" font-size="14" text-anchor="start">FIPS 197 updated, editorial changes</text>
</svg>
<figcaption>Figure 7.2. The life of AES so far. Accent marks the attacks; none of them threatens the full cipher in practice.</figcaption>
</figure>

## 7.2 The plan of AES

AES is a substitution-permutation network
([§6.3](06-Block-Ciphers.md#63-two-ways-to-build-a-round)). It holds the 16-byte block as a $4 \times 4$ grid
of bytes, the **state**, filled column by column:

$$
\begin{bmatrix}
s_{0} & s_{4} & s_{8} & s_{12} \\
s_{1} & s_{5} & s_{9} & s_{13} \\
s_{2} & s_{6} & s_{10} & s_{14} \\
s_{3} & s_{7} & s_{11} & s_{15}
\end{bmatrix}
$$

<figure class="mars-fig">
<svg viewBox="0 0 560 200" width="560" role="img" aria-label="The 16 input bytes fill the 4 by 4 state column by column" fill="currentColor" font-size="13">
<rect x="20" y="20" width="30" height="26" rx="4" class="soft-acc"/>
<rect x="20" y="20" width="30" height="26" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="35" y="37.4" font-size="12.5" text-anchor="middle">0</text>
<rect x="52" y="20" width="30" height="26" rx="4" class="soft-acc"/>
<rect x="52" y="20" width="30" height="26" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="67" y="37.4" font-size="12.5" text-anchor="middle">1</text>
<rect x="84" y="20" width="30" height="26" rx="4" class="soft-acc"/>
<rect x="84" y="20" width="30" height="26" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="99" y="37.4" font-size="12.5" text-anchor="middle">2</text>
<rect x="116" y="20" width="30" height="26" rx="4" class="soft-acc"/>
<rect x="116" y="20" width="30" height="26" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="131" y="37.4" font-size="12.5" text-anchor="middle">3</text>
<rect x="148" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="163" y="37.4" font-size="12.5" text-anchor="middle">4</text>
<rect x="180" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="195" y="37.4" font-size="12.5" text-anchor="middle">5</text>
<rect x="212" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="227" y="37.4" font-size="12.5" text-anchor="middle">6</text>
<rect x="244" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="259" y="37.4" font-size="12.5" text-anchor="middle">7</text>
<rect x="276" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="291" y="37.4" font-size="12.5" text-anchor="middle">8</text>
<rect x="308" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="323" y="37.4" font-size="12.5" text-anchor="middle">9</text>
<rect x="340" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="355" y="37.4" font-size="12.5" text-anchor="middle">10</text>
<rect x="372" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="387" y="37.4" font-size="12.5" text-anchor="middle">11</text>
<rect x="404" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="419" y="37.4" font-size="12.5" text-anchor="middle">12</text>
<rect x="436" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="451" y="37.4" font-size="12.5" text-anchor="middle">13</text>
<rect x="468" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="483" y="37.4" font-size="12.5" text-anchor="middle">14</text>
<rect x="500" y="20" width="30" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515" y="37.4" font-size="12.5" text-anchor="middle">15</text>
<text x="280" y="14" font-size="1" text-anchor="middle"></text>
<rect x="200" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="200" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="215" y="89.2" font-size="12" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s0</text>
<rect x="200" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="200" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="215" y="119.2" font-size="12" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s1</text>
<rect x="200" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="200" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="215" y="149.2" font-size="12" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s2</text>
<rect x="200" y="160" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="200" y="160" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="215" y="179.2" font-size="12" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s3</text>
<rect x="230" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="245" y="89.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s4</text>
<rect x="230" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="245" y="119.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s5</text>
<rect x="230" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="245" y="149.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s6</text>
<rect x="230" y="160" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="245" y="179.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s7</text>
<rect x="260" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="275" y="89.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s8</text>
<rect x="260" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="275" y="119.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s9</text>
<rect x="260" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="275" y="149.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s10</text>
<rect x="260" y="160" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="275" y="179.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s11</text>
<rect x="290" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="305" y="89.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s12</text>
<rect x="290" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="305" y="119.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s13</text>
<rect x="290" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="305" y="149.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s14</text>
<rect x="290" y="160" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="305" y="179.2" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s15</text>
<polyline points="84,46 84,60 215,60 215,68" fill="none" class="acc" stroke-width="1.2"/>
<polygon points="215,68 212.3,61.6 217.7,61.6" class="acc-fill"/>
<text x="340" y="92" font-size="12.5" text-anchor="start" fill-opacity="0.8">row 0</text>
<text x="340" y="182" font-size="12.5" text-anchor="start" fill-opacity="0.8">row 3</text>
<text x="152" y="190" font-size="12.5" text-anchor="middle" fill-opacity="0.8">column 0</text>
</svg>
<figcaption>Figure 7.3. Bytes 0 to 3 of the input (accent) become column 0 of the state, bytes 4 to 7 column 1, and so on. Every step of AES works on this grid.</figcaption>
</figure>

It first XORs the key into the state, then runs 10 rounds (for a 128-bit key; 12
for 192 bits, 14 for 256). Each round has four steps:

1. **SubBytes:** replace each byte with its entry in a fixed 256-entry table, the
   S-box. This is the confusion.
2. **ShiftRows:** rotate row $r$ of the grid left by $r$ places.
3. **MixColumns:** replace each column by a fixed mixture of its four bytes, so
   every output byte depends on every input byte of the column.
4. **AddRoundKey:** XOR a 16-byte round key, made from the key by the key schedule.

The last round skips MixColumns (§7.6 explains why that costs nothing). ShiftRows
spreads bytes across columns, and MixColumns spreads them within a column, so
after two rounds every output byte depends on every input byte. That is the
diffusion.

<figure class="mars-fig">
<svg viewBox="0 0 680 250" width="680" role="img" aria-label="AES-128: an initial AddRoundKey, nine full rounds, and a last round without MixColumns" fill="currentColor" font-size="13">
<rect x="20" y="20" width="110" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="41.5" font-size="13" text-anchor="middle">plaintext</text>
<line x1="130" y1="37" x2="160" y2="37" stroke="currentColor" stroke-width="1.4"/>
<polygon points="160,37 153.6,39.7 153.6,34.3" fill="currentColor"/>
<rect x="160" y="20" width="120" height="34" rx="4" class="soft-acc"/>
<rect x="160" y="20" width="120" height="34" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="220" y="41.5" font-size="13" text-anchor="middle">AddRoundKey</text>
<text x="220" y="70" font-size="12.5" text-anchor="middle">key K₀</text>
<line x1="280" y1="37" x2="315" y2="37" stroke="currentColor" stroke-width="1.4"/>
<polygon points="315,37 308.6,39.7 308.6,34.3" fill="currentColor"/>
<rect x="315" y="8" width="350" height="140" rx="3" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="490" y="140" font-size="13" text-anchor="middle" font-weight="bold">rounds 1 to 9</text>
<rect x="330" y="16" width="130" height="24" rx="4" class="soft"/>
<rect x="330" y="16" width="130" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="395" y="32.5" font-size="13" text-anchor="middle">SubBytes</text>
<text x="470" y="33" font-size="12.5" text-anchor="start" fill-opacity="0.85">confusion</text>
<rect x="330" y="44" width="130" height="24" rx="4" class="soft"/>
<rect x="330" y="44" width="130" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="395" y="60.5" font-size="13" text-anchor="middle">ShiftRows</text>
<text x="470" y="61" font-size="12.5" text-anchor="start" fill-opacity="0.85">spread across columns</text>
<line x1="395" y1="40" x2="395" y2="44" stroke="currentColor" stroke-width="1.4"/>
<polygon points="395,44 392.3,37.6 397.7,37.6" fill="currentColor"/>
<rect x="330" y="72" width="130" height="24" rx="4" class="soft"/>
<rect x="330" y="72" width="130" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="395" y="88.5" font-size="13" text-anchor="middle">MixColumns</text>
<text x="470" y="89" font-size="12.5" text-anchor="start" fill-opacity="0.85">spread within a column</text>
<line x1="395" y1="68" x2="395" y2="72" stroke="currentColor" stroke-width="1.4"/>
<polygon points="395,72 392.3,65.6 397.7,65.6" fill="currentColor"/>
<rect x="330" y="100" width="130" height="24" rx="4" class="soft-acc"/>
<rect x="330" y="100" width="130" height="24" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="395" y="116.5" font-size="13" text-anchor="middle">AddRoundKey</text>
<text x="470" y="117" font-size="12.5" text-anchor="start" fill-opacity="0.85">mix in round key</text>
<line x1="395" y1="96" x2="395" y2="100" stroke="currentColor" stroke-width="1.4"/>
<polygon points="395,100 392.3,93.6 397.7,93.6" fill="currentColor"/>
<line x1="395" y1="128" x2="395" y2="165" stroke="currentColor" stroke-width="1.4"/>
<polygon points="395,165 392.3,158.6 397.7,158.6" fill="currentColor"/>
<text x="405" y="160" font-size="13" text-anchor="start" font-weight="bold">round 10</text>
<rect x="150" y="175" width="130" height="26" rx="4" class="soft"/>
<rect x="150" y="175" width="130" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="215" y="192.6" font-size="13" text-anchor="middle">SubBytes</text>
<rect x="300" y="175" width="130" height="26" rx="4" class="soft"/>
<rect x="300" y="175" width="130" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="365" y="192.6" font-size="13" text-anchor="middle">ShiftRows</text>
<line x1="280" y1="188" x2="300" y2="188" stroke="currentColor" stroke-width="1.4"/>
<polygon points="300,188 293.6,190.7 293.6,185.3" fill="currentColor"/>
<rect x="450" y="175" width="130" height="26" rx="4" class="soft-acc"/>
<rect x="450" y="175" width="130" height="26" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="515" y="192.6" font-size="13" text-anchor="middle">AddRoundKey</text>
<line x1="430" y1="188" x2="450" y2="188" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,188 443.6,190.7 443.6,185.3" fill="currentColor"/>
<polyline points="395,165 215,165 215,175" fill="none" stroke="currentColor" stroke-width="1.4"/>
<polygon points="215,175 212.3,168.6 217.7,168.6" fill="currentColor"/>
<line x1="580" y1="188" x2="600" y2="188" stroke="currentColor" stroke-width="1.4"/>
<polygon points="600,188 593.6,190.7 593.6,185.3" fill="currentColor"/>
<text x="640" y="193" font-size="13" text-anchor="middle">ciphertext</text>
<text x="340" y="236" font-size="13" text-anchor="middle">AES-192 runs 12 rounds and AES-256 14, with the same steps</text>
</svg>
<figcaption>Figure 7.4. The shape of AES-128. Eleven round keys are used: one before the first round and one at the end of each of the ten rounds.</figcaption>
</figure>

Three of the four steps are easy. SubBytes and MixColumns need arithmetic on
bytes that is not ordinary arithmetic, and that is the next section.

## 7.3 Arithmetic on bytes: the field $\mathrm{GF}(2^8)$

*Level: intermediate.* AES treats a byte as an element of a **finite field**: a
set with addition, subtraction, multiplication and division (except by zero)
that obey the usual rules. In [Chapter 3](03-The-Arithmetic-of-Secrets.md) you
met the integers mod a prime $p$, which form a field with $p$ elements. A field
with 256 elements cannot be the integers mod 256: there $2 \times 128 = 0$, so 2
has no inverse. It has to be built another way.

### Bytes as polynomials

Read the eight bits of a byte $b_7 b_6 \ldots b_0$ as the coefficients of a
polynomial in $x$:

$$
b_7 x^7 + b_6 x^6 + \cdots + b_1 x + b_0 .
$$

The byte `57` is `0101 0111` in binary, so it is $x^6 + x^4 + x^2 + x + 1$. The
coefficients are bits, and bits are added mod 2: $1 + 1 = 0$.

**Adding** two bytes adds the polynomials coefficient by coefficient, mod 2. That
is XOR, bit by bit:

$$
\mathtt{57} + \mathtt{83} = (x^6 + x^4 + x^2 + x + 1) + (x^7 + x + 1) = x^7 + x^6 + x^4 + x^2 = \mathtt{d4}.
$$

Check: `0101 0111` XOR `1000 0011` = `1101 0100` = `d4`. Subtraction is the same
as addition, since $-1 = 1$ mod 2.

**Multiplying** two bytes multiplies the polynomials. The product can reach degree
14, too big for a byte, so it is reduced **modulo** a fixed polynomial of degree 8,
just as integers are reduced mod $n$. AES uses

$$
m(x) = x^8 + x^4 + x^3 + x + 1 \qquad (\text{the 9-bit number } \mathtt{11b}).
$$

$m(x)$ is **irreducible**: it is not the product of two smaller polynomials with
bit coefficients, the polynomial version of a prime. That is what makes every
nonzero byte invertible, exactly as a prime modulus does for integers.

**By hand: $\mathtt{57} \cdot \mathtt{83}$.** This is the example in FIPS 197.

$$
(x^6 + x^4 + x^2 + x + 1)(x^7 + x + 1) = x^{13} + x^{11} + x^9 + x^8 + x^6 + x^5 + x^4 + x^3 + 1
$$

(multiply out, and every term that appears twice cancels). Dividing by $m(x)$
leaves the remainder

$$
x^{13} + x^{11} + x^9 + x^8 + x^6 + x^5 + x^4 + x^3 + 1 \equiv x^7 + x^6 + 1 \pmod{m(x)},
$$

so $\mathtt{57} \cdot \mathtt{83} = \mathtt{c1}$.

### The fast way: multiply by $x$, again and again

Long division of polynomials is slow. There is a better route. Multiplying by $x$
(the byte `02`) shifts every bit up one place. If a bit falls off the top (a term
$x^8$ appears), replace $x^8$ by $x^4 + x^3 + x + 1$, since $x^8 \equiv x^4 + x^3 + x + 1$
modulo $m(x)$: that is, XOR with `1b`. This operation is called **xtime**:

$$
\mathtt{xtime}(b) = \begin{cases} b \ll 1 & \text{if the top bit of } b \text{ is } 0 \\ (b \ll 1) \oplus \mathtt{1b} & \text{if it is } 1 \end{cases}
$$

(keeping 8 bits). Any product is then a sum of doublings, exactly like
multiplying integers by shifting and adding. Again from FIPS 197,
$\mathtt{57} \cdot \mathtt{13}$:

| | Value | How |
|---|---|---|
| $\mathtt{57} \cdot \mathtt{01}$ | `57` | |
| $\mathtt{57} \cdot \mathtt{02}$ | `ae` | shift; top bit was 0 |
| $\mathtt{57} \cdot \mathtt{04}$ | `47` | shift `ae` to `15c`; drop the top bit, XOR `1b` |
| $\mathtt{57} \cdot \mathtt{08}$ | `8e` | shift; top bit was 0 |
| $\mathtt{57} \cdot \mathtt{10}$ | `07` | shift `8e` to `11c`; drop the top bit, XOR `1b` |

Since $\mathtt{13} = \mathtt{10} + \mathtt{02} + \mathtt{01}$,

$$
\mathtt{57} \cdot \mathtt{13} = \mathtt{07} \oplus \mathtt{ae} \oplus \mathtt{57} = \mathtt{fe}.
$$

<figure class="mars-fig">
<svg viewBox="0 0 680 270" width="680" role="img" aria-label="A byte as a polynomial, and xtime: shift left, and if a bit falls off the top, XOR 1b" fill="currentColor" font-size="13">
<text x="140" y="20" font-size="13" text-anchor="middle" font-style="italic">x⁷</text>
<text x="182" y="20" font-size="13" text-anchor="middle" font-style="italic">x⁶</text>
<text x="224" y="20" font-size="13" text-anchor="middle" font-style="italic">x⁵</text>
<text x="266" y="20" font-size="13" text-anchor="middle" font-style="italic">x⁴</text>
<text x="308" y="20" font-size="13" text-anchor="middle" font-style="italic">x³</text>
<text x="350" y="20" font-size="13" text-anchor="middle" font-style="italic">x²</text>
<text x="392" y="20" font-size="13" text-anchor="middle" font-style="italic">x</text>
<text x="434" y="20" font-size="13" text-anchor="middle" font-style="italic">1</text>
<text x="110" y="50" font-size="13" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">57</text>
<rect x="120" y="28" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="162" y="28" width="40" height="32" rx="4" class="soft-acc"/>
<rect x="162" y="28" width="40" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="182" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="204" y="28" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="224" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="246" y="28" width="40" height="32" rx="4" class="soft-acc"/>
<rect x="246" y="28" width="40" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="266" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="288" y="28" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="308" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="330" y="28" width="40" height="32" rx="4" class="soft-acc"/>
<rect x="330" y="28" width="40" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="350" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="372" y="28" width="40" height="32" rx="4" class="soft-acc"/>
<rect x="372" y="28" width="40" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="392" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="414" y="28" width="40" height="32" rx="4" class="soft-acc"/>
<rect x="414" y="28" width="40" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="434" y="49.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="470" y="50" font-size="13" text-anchor="start">= x⁶ + x⁴ + x² + x + 1</text>
<text x="340" y="92" font-size="13" text-anchor="middle">xtime(ae): shift left one place</text>
<text x="110" y="124" font-size="13" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">ae</text>
<rect x="120" y="102" width="40" height="32" rx="4" class="soft-acc"/>
<rect x="120" y="102" width="40" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="140" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="162" y="102" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="182" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="204" y="102" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="224" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="246" y="102" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="266" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="288" y="102" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="308" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="330" y="102" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="350" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="372" y="102" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="392" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="414" y="102" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="434" y="123.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="70" y="152" width="40" height="32" rx="4" class="soft-acc"/>
<rect x="70" y="152" width="40" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="90" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="90" y="200" font-size="12.5" text-anchor="middle" class="acc-fill">falls off</text>
<text x="130" y="210" font-size="1" text-anchor="middle"></text>
<rect x="120" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="162" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="182" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="204" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="224" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="246" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="266" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="288" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="308" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="330" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="350" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="372" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="392" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="414" y="152" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="434" y="173.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="470" y="174" font-size="13" text-anchor="start">shifted (x⁸ dropped)</text>
<text x="110" y="218" font-size="13" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">⊕ 1b</text>
<rect x="120" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="162" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="182" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="204" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="224" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="246" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="266" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="288" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="308" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="330" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="350" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">0</text>
<rect x="372" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="392" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<rect x="414" y="196" width="40" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="434" y="217.6" font-size="16" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="470" y="218" font-size="13" text-anchor="start">x⁸ = x⁴ + x³ + x + 1</text>
<line x1="120" y1="234" x2="456" y2="234" stroke="currentColor" stroke-width="1.4"/>
<text x="140" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="182" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="224" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="266" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="308" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">0</text>
<text x="350" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="392" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="434" y="256" font-size="16" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">1</text>
<text x="110" y="256" font-size="13" text-anchor="end" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">47</text>
<text x="470" y="256" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">= 57 · 04</text>
</svg>
<figcaption>Figure 7.5. Top: the byte 57 read as a polynomial. Bottom: one xtime step from the table, doubling ae. The top bit falls off as x⁸, and since x⁸ ≡ x⁴ + x³ + x + 1 modulo m(x), it comes back as an XOR with 1b.</figcaption>
</figure>

### Inverses

Every nonzero byte $a$ has an inverse $a^{-1}$ with $a \cdot a^{-1} = \mathtt{01}$.
The 255 nonzero bytes form a group under multiplication, so, as in Fermat's little
theorem, $a^{255} = 1$, and therefore

$$
a^{-1} = a^{254}.
$$

The extended Euclidean algorithm on polynomials works too, and is faster by hand.
For example $\mathtt{53}^{-1} = \mathtt{ca}$: multiply them with xtime and you get
`01`. By convention, AES maps `00` to `00`.

In code, all of this is a few lines:

```python
def xtime(a):                           # multiply by x (that is, by 02) in GF(2^8)
    a <<= 1
    return a ^ 0x11b if a & 0x100 else a

def gmul(a, b):                         # multiply two bytes: shift and add
    r = 0
    while b:
        if b & 1:
            r ^= a
        a, b = xtime(a), b >> 1
    return r

def ginv(a):                            # inverse: a^254, since a^255 = 1 for a != 0
    r = 1
    for _ in range(254):
        r = gmul(r, a)
    return r

print(hex(gmul(0x57, 0x83)), hex(gmul(0x57, 0x13)), hex(ginv(0x53)), hex(gmul(0x53, 0xca)))
# 0xc1 0xfe 0xca 0x1
```

## 7.4 SubBytes: the S-box

*Level: intermediate.* The S-box is the only nonlinear step in AES, and unlike
the DES S-boxes it is not a table of mysterious numbers. It is defined by a
formula in two parts:

1. **Invert** the byte in $\mathrm{GF}(2^8)$: $b = a^{-1}$ (with `00` going to `00`).
2. Apply a fixed **affine** transformation over bits: XOR $b$ with four left
   rotations of itself and with the constant `63`:

$$
S(a) = b \oplus (b \lll 1) \oplus (b \lll 2) \oplus (b \lll 3) \oplus (b \lll 4) \oplus \mathtt{63}, \qquad b = a^{-1}.
$$

<figure class="mars-fig">
<svg viewBox="0 0 660 150" width="660" role="img" aria-label="The AES S-box: invert in GF(2^8), then apply a fixed affine map; 53 goes to ca, then to ed" fill="currentColor" font-size="13">
<rect x="20" y="40" width="90" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65" y="68.3" font-size="18" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">53</text>
<line x1="110" y1="62" x2="170" y2="62" stroke="currentColor" stroke-width="1.4"/>
<polygon points="170,62 163.6,64.7 163.6,59.3" fill="currentColor"/>
<rect x="170" y="30" width="150" height="64" rx="4" class="soft-acc"/>
<rect x="170" y="30" width="150" height="64" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="245" y="58.5" font-size="13" text-anchor="middle">invert in</text>
<text x="245" y="74.5" font-size="13" text-anchor="middle">GF(2⁸)</text>
<line x1="320" y1="62" x2="360" y2="62" stroke="currentColor" stroke-width="1.4"/>
<polygon points="360,62 353.6,64.7 353.6,59.3" fill="currentColor"/>
<rect x="360" y="40" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="395" y="68.3" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">ca</text>
<line x1="430" y1="62" x2="470" y2="62" stroke="currentColor" stroke-width="1.4"/>
<polygon points="470,62 463.6,64.7 463.6,59.3" fill="currentColor"/>
<rect x="470" y="30" width="110" height="64" rx="4" class="soft"/>
<rect x="470" y="30" width="110" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525" y="58.5" font-size="13" text-anchor="middle">affine:</text>
<text x="525" y="74.5" font-size="13" text-anchor="middle">rotate, XOR 63</text>
<line x1="580" y1="62" x2="600" y2="62" stroke="currentColor" stroke-width="1.4"/>
<polygon points="600,62 593.6,64.7 593.6,59.3" fill="currentColor"/>
<text x="630" y="68" font-size="18" text-anchor="middle" font-weight="bold" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">ed</text>
<text x="245" y="122" font-size="12.5" text-anchor="middle">the only nonlinear step</text>
<text x="525" y="122" font-size="12.5" text-anchor="middle">breaks the clean algebra</text>
</svg>
<figcaption>Figure 7.6. How SubBytes is defined, on the worked example: S(53) = ed. Because it is a formula, anyone can check that nothing is hidden in the table.</figcaption>
</figure>

**By hand: $S(\mathtt{53})$.** The inverse of `53` is `ca` = `11001010`. Write
the rotations under each other and XOR the columns:

| | Bits |
|---|---|
| $b$ | `11001010` |
| $b \lll 1$ | `10010101` |
| $b \lll 2$ | `00101011` |
| $b \lll 3$ | `01010110` |
| $b \lll 4$ | `10101100` |
| `63` | `01100011` |
| XOR of all six | `11101101` = `ed` |

So $S(\mathtt{53}) = \mathtt{ed}$, which is what the table in FIPS 197 says.

**Why the inverse?** In 1993 Kaisa Nyberg, in Finland, showed that the inversion
map in a finite field is about as nonlinear as a function on bytes can be. For
the AES S-box, the measures of [Chapter 6](06-Block-Ciphers.md) come out as:

- **Differential:** for any nonzero input difference, no output difference occurs
  for more than 4 of the 256 inputs, a probability of at most $2^{-6}$.
- **Linear:** no linear approximation holds with a bias of more than
  $16/256 = 2^{-4}$, a correlation of at most $2^{-3}$.

Both are the best possible for an invertible 8-bit S-box, as far as anyone knows.

**Why the affine step?** Inversion alone is a clean algebraic function, and clean
algebra is what attackers exploit. The affine step breaks that structure. It also
makes sure the S-box has no fixed points ($S(a) \ne a$ for every $a$) and no
"opposite" fixed points ($S(a) \ne \bar a$), both checked easily by computer.

Because the S-box has a formula, nobody has to trust that its designers hid
nothing in it. That openness is a direct answer to the DES S-box controversy.

<figure class="mars-fig">
<svg viewBox="0 0 560 330" width="560" role="img" aria-label="Scatter plot of S(x) against x for the 256 bytes: no visible structure" fill="currentColor" font-size="13">
<line x1="58" y1="290" x2="524" y2="290" stroke="currentColor" stroke-width="1.4"/>
<line x1="58" y1="290" x2="58" y2="18" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="308" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">00</text>
<text x="50" y="294" font-size="12.5" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">00</text>
<text x="175.2" y="308" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">40</text>
<text x="50" y="226.8" font-size="12.5" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">40</text>
<text x="290.4" y="308" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">80</text>
<text x="50" y="159.6" font-size="12.5" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">80</text>
<text x="405.6" y="308" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">c0</text>
<text x="50" y="92.4" font-size="12.5" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">c0</text>
<text x="519" y="308" font-size="12.5" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">ff</text>
<text x="50" y="26.2" font-size="12.5" text-anchor="end" style="font-family:var(--md-code-font-family,monospace)">ff</text>
<circle cx="60" cy="186.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="61.8" cy="159.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="63.6" cy="165.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="65.4" cy="160.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="67.2" cy="35.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="69" cy="177.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="70.8" cy="173.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="72.6" cy="83.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="74.4" cy="239.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="76.2" cy="288.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="78" cy="181.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="79.8" cy="244.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="81.6" cy="23.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="83.4" cy="64.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="85.2" cy="110.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="87" cy="166.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="88.8" cy="77.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="90.6" cy="153.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="92.4" cy="78.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="94.2" cy="158.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="96" cy="27.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="97.8" cy="196.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="99.6" cy="215.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="101.4" cy="38" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="103.2" cy="108.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="105" cy="67.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="106.8" cy="119.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="108.6" cy="106.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="110.4" cy="126.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="112.2" cy="117.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="114" cy="170.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="115.8" cy="88.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="117.6" cy="97.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="119.4" cy="24.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="121.2" cy="135.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="123" cy="250.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="124.8" cy="233.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="126.6" cy="223.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="128.4" cy="30.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="130.2" cy="75.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="132" cy="235.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="133.8" cy="116.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="135.6" cy="49.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="137.4" cy="36.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="139.2" cy="171.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="141" cy="63.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="142.8" cy="238.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="144.6" cy="267.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="146.4" cy="285.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="148.2" cy="81" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="150" cy="253.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="151.8" cy="85.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="153.6" cy="264.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="155.4" cy="132.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="157.2" cy="284.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="159" cy="128.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="160.8" cy="282.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="162.6" cy="271.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="164.4" cy="155.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="166.2" cy="52.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="168" cy="43.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="169.8" cy="249.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="171.6" cy="103.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="173.4" cy="167.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="175.2" cy="280.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="177" cy="152.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="178.8" cy="243.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="180.6" cy="262.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="182.4" cy="261.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="184.2" cy="174.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="186" cy="195.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="187.8" cy="122" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="189.6" cy="203.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="191.4" cy="228.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="193.2" cy="65.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="195" cy="102" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="196.8" cy="246.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="198.6" cy="51.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="200.4" cy="240.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="202.2" cy="151.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="204" cy="202.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="205.8" cy="70.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="207.6" cy="290" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="209.4" cy="41.1" r="4.5" class="acc-fill"/>
<circle cx="211.2" cy="256.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="213" cy="25.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="214.8" cy="104.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="216.6" cy="194.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="218.4" cy="178.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="220.2" cy="76.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="222" cy="90.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="223.8" cy="230.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="225.6" cy="212.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="227.4" cy="210.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="229.2" cy="197.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="231" cy="72.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="232.8" cy="71.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="234.6" cy="39" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="236.4" cy="111.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="238.2" cy="26.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="240" cy="219.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="241.8" cy="209.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="243.6" cy="236.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="245.4" cy="150.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="247.2" cy="217.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="249" cy="28.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="250.8" cy="287.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="252.6" cy="156.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="254.4" cy="206" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="256.2" cy="227" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="258" cy="123" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="259.8" cy="113.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="261.6" cy="204.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="263.4" cy="118.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="265.2" cy="222.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="267" cy="139.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="268.8" cy="136.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="270.6" cy="125.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="272.4" cy="231.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="274.2" cy="32.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="276" cy="92.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="277.8" cy="98.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="279.6" cy="61.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="281.4" cy="255.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="283.2" cy="273.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="285" cy="22.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="286.8" cy="34.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="288.6" cy="69.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="290.4" cy="74.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="292.2" cy="277.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="294" cy="270.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="295.8" cy="42.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="297.6" cy="190.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="299.4" cy="131.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="301.2" cy="218.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="303" cy="265.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="304.8" cy="84.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="306.6" cy="114.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="308.4" cy="157.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="310.2" cy="225.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="312" cy="185" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="313.8" cy="192.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="315.6" cy="263.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="317.4" cy="169.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="319.2" cy="189.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="321" cy="154.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="322.8" cy="207.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="324.6" cy="59" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="326.4" cy="254.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="328.2" cy="245.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="330" cy="138.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="331.8" cy="147.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="333.6" cy="216.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="335.4" cy="40.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="337.2" cy="96.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="339" cy="269" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="340.8" cy="56.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="342.6" cy="191.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="344.4" cy="278.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="346.2" cy="60" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="348" cy="54.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="349.8" cy="237.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="351.6" cy="229.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="353.4" cy="279.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="355.2" cy="213.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="357" cy="283.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="358.8" cy="252.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="360.6" cy="193.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="362.4" cy="86.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="364.2" cy="68.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="366" cy="109.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="367.8" cy="187.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="369.6" cy="137.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="371.4" cy="133.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="373.2" cy="50.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="375" cy="162.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="376.8" cy="47.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="378.6" cy="80" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="380.4" cy="232.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="382.2" cy="175.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="384" cy="141.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="385.8" cy="66.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="387.6" cy="208.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="389.4" cy="112.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="391.2" cy="176.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="393" cy="199.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="394.8" cy="33.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="396.6" cy="44.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="398.4" cy="183.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="400.2" cy="161.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="402" cy="107.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="403.8" cy="281.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="405.6" cy="94.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="407.4" cy="164" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="409.2" cy="251.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="411" cy="241.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="412.8" cy="260.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="414.6" cy="115.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="416.4" cy="101" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="418.2" cy="82.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="420" cy="46.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="421.8" cy="57.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="423.6" cy="168.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="425.4" cy="257.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="427.2" cy="211.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="429" cy="91.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="430.8" cy="144" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="432.6" cy="145.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="434.4" cy="172.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="436.2" cy="224.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="438" cy="99.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="439.8" cy="182.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="441.6" cy="214.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="443.4" cy="286.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="445.2" cy="31.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="447" cy="275.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="448.8" cy="188.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="450.6" cy="234.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="452.4" cy="198.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="454.2" cy="95.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="456" cy="149.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="457.8" cy="87.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="459.6" cy="259.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="461.4" cy="124.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="463.2" cy="53.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="465" cy="29.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="466.8" cy="130.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="468.6" cy="272.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="470.4" cy="179.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="472.2" cy="62.1" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="474" cy="140.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="475.8" cy="134.6" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="477.6" cy="127.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="479.4" cy="258.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="481.2" cy="148.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="483" cy="45.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="484.8" cy="73.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="486.6" cy="200.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="488.4" cy="248" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="490.2" cy="55.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="492" cy="143" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="493.8" cy="120.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="495.6" cy="146.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="497.4" cy="276.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="499.2" cy="89.4" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="501" cy="48.5" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="502.8" cy="220.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="504.6" cy="180.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="506.4" cy="221.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="508.2" cy="129.3" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="510" cy="242.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="511.8" cy="274.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="513.6" cy="105.2" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="515.4" cy="201.8" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="517.2" cy="93.7" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<circle cx="519" cy="266.9" r="1.8" fill="currentColor" fill-opacity="0.75"/>
<text x="217.4" y="35.1" font-size="13" text-anchor="start" font-weight="bold" class="acc-fill">S(53) = ed</text>
<text x="68" y="182.1" font-size="12.5" text-anchor="start" fill-opacity="0.85">S(00) = 63</text>
<text x="290" y="326" font-size="13" text-anchor="middle">input byte x</text>
<text x="18" y="150" font-size="13" text-anchor="middle" font-style="italic">S(x)</text>
</svg>
<figcaption>Figure 7.7. Every byte and its S-box value, computed from the formula. The points look scattered at random, which is what nonlinearity looks like: no line, curve or pattern lets an attacker predict one value from another.</figcaption>
</figure>

## 7.5 ShiftRows and MixColumns

*Level: intermediate.*

### ShiftRows

Row 0 stays, row 1 moves one place left, row 2 two places, row 3 three, wrapping
around:

$$
\begin{bmatrix}
s_{0} & s_{4} & s_{8} & s_{12} \\
s_{1} & s_{5} & s_{9} & s_{13} \\
s_{2} & s_{6} & s_{10} & s_{14} \\
s_{3} & s_{7} & s_{11} & s_{15}
\end{bmatrix}
\longrightarrow
\begin{bmatrix}
s_{0} & s_{4} & s_{8} & s_{12} \\
s_{5} & s_{9} & s_{13} & s_{1} \\
s_{10} & s_{14} & s_{2} & s_{6} \\
s_{15} & s_{3} & s_{7} & s_{11}
\end{bmatrix}
$$

After it, the four bytes of each column came from four different columns.

<figure class="mars-fig">
<svg viewBox="0 0 620 200" width="620" role="img" aria-label="ShiftRows: row r rotates left by r places, so each column receives one byte from each of the four columns" fill="currentColor" font-size="13">
<text x="120" y="20" font-size="13" text-anchor="middle" font-weight="bold">before</text>
<rect x="40" y="30" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="40" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="55" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s0</text>
<rect x="40" y="70" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="40" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="95" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s1</text>
<rect x="40" y="110" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="40" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="135" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s2</text>
<rect x="40" y="150" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="40" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="175" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s3</text>
<rect x="80" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="55" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s4</text>
<rect x="80" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="95" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s5</text>
<rect x="80" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="135" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s6</text>
<rect x="80" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="175" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s7</text>
<rect x="120" y="30" width="40" height="40" rx="0" class="soft"/>
<rect x="120" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="55" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s8</text>
<rect x="120" y="70" width="40" height="40" rx="0" class="soft"/>
<rect x="120" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="95" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s9</text>
<rect x="120" y="110" width="40" height="40" rx="0" class="soft"/>
<rect x="120" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="135" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s10</text>
<rect x="120" y="150" width="40" height="40" rx="0" class="soft"/>
<rect x="120" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="175" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s11</text>
<rect x="160" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="55" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s12</text>
<rect x="160" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="95" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s13</text>
<rect x="160" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="135" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s14</text>
<rect x="160" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="175" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s15</text>
<text x="480" y="20" font-size="13" text-anchor="middle" font-weight="bold">after</text>
<rect x="400" y="30" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="400" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="420" y="55" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s0</text>
<rect x="400" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="420" y="95" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s5</text>
<rect x="400" y="110" width="40" height="40" rx="0" class="soft"/>
<rect x="400" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="420" y="135" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s10</text>
<rect x="400" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="420" y="175" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s15</text>
<rect x="440" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="460" y="55" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s4</text>
<rect x="440" y="70" width="40" height="40" rx="0" class="soft"/>
<rect x="440" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="460" y="95" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s9</text>
<rect x="440" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="460" y="135" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s14</text>
<rect x="440" y="150" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="440" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="460" y="175" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s3</text>
<rect x="480" y="30" width="40" height="40" rx="0" class="soft"/>
<rect x="480" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="500" y="55" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s8</text>
<rect x="480" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="500" y="95" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s13</text>
<rect x="480" y="110" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="480" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="500" y="135" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s2</text>
<rect x="480" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="500" y="175" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s7</text>
<rect x="520" y="30" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="540" y="55" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s12</text>
<rect x="520" y="70" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="520" y="70" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="540" y="95" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">s1</text>
<rect x="520" y="110" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="540" y="135" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s6</text>
<rect x="520" y="150" width="40" height="40" rx="0" class="soft"/>
<rect x="520" y="150" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="540" y="175" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">s11</text>
<text x="300" y="55" font-size="13" text-anchor="middle">no shift</text>
<text x="300" y="95" font-size="13" text-anchor="middle">← 1</text>
<text x="300" y="135" font-size="13" text-anchor="middle">← 2</text>
<text x="300" y="175" font-size="13" text-anchor="middle">← 3</text>
</svg>
<figcaption>Figure 7.8. ShiftRows on the state. The accent bytes start in column 0; afterwards they sit in four different columns, so the next MixColumns mixes each of them with bytes from three other columns.</figcaption>
</figure>

### MixColumns

Each column $(a_0, a_1, a_2, a_3)$ is multiplied by a fixed matrix, with all
arithmetic in $\mathrm{GF}(2^8)$:

$$
\begin{bmatrix} b_0 \\ b_1 \\ b_2 \\ b_3 \end{bmatrix}
=
\begin{bmatrix}
\mathtt{02} & \mathtt{03} & \mathtt{01} & \mathtt{01} \\
\mathtt{01} & \mathtt{02} & \mathtt{03} & \mathtt{01} \\
\mathtt{01} & \mathtt{01} & \mathtt{02} & \mathtt{03} \\
\mathtt{03} & \mathtt{01} & \mathtt{01} & \mathtt{02}
\end{bmatrix}
\begin{bmatrix} a_0 \\ a_1 \\ a_2 \\ a_3 \end{bmatrix}.
$$

Multiplying by `01` is nothing, by `02` is xtime, and by `03` is xtime plus the
byte itself, so the whole step costs a few shifts and XORs.

**By hand: one column.** In the first round of the FIPS 197 example (§7.7), the
first column entering MixColumns is `d4 bf 5d 30`. The first output byte is

$$
b_0 = \mathtt{02} \cdot \mathtt{d4} \oplus \mathtt{03} \cdot \mathtt{bf} \oplus \mathtt{5d} \oplus \mathtt{30}.
$$

- $\mathtt{02} \cdot \mathtt{d4}$: `d4` shifted is `1a8`; the top bit fell off, so
  drop it and XOR `1b`: `a8` $\oplus$ `1b` = `b3`.
- $\mathtt{03} \cdot \mathtt{bf} = \mathtt{02} \cdot \mathtt{bf} \oplus \mathtt{bf}$:
  `bf` shifted is `17e`, so `7e` $\oplus$ `1b` = `65`, and `65` $\oplus$ `bf` = `da`.
- `b3` $\oplus$ `da` $\oplus$ `5d` $\oplus$ `30` = `04`.

The other three rows give `66`, `81` and `e5`, so the column becomes
`04 66 81 e5`.

<figure class="mars-fig">
<svg viewBox="0 0 700 250" width="700" role="img" aria-label="MixColumns multiplies each column by a fixed matrix; one changed input byte changes all four output bytes" fill="currentColor" font-size="13">
<rect x="150" y="40" width="40" height="40" rx="0" class="soft"/>
<rect x="150" y="40" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="170" y="64.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">02</text>
<rect x="190" y="40" width="40" height="40" rx="0" class="soft"/>
<rect x="190" y="40" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="64.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">03</text>
<rect x="230" y="40" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="250" y="64.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="270" y="40" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="290" y="64.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="150" y="80" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="170" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="190" y="80" width="40" height="40" rx="0" class="soft"/>
<rect x="190" y="80" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">02</text>
<rect x="230" y="80" width="40" height="40" rx="0" class="soft"/>
<rect x="230" y="80" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="250" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">03</text>
<rect x="270" y="80" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="290" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="150" y="120" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="170" y="144.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="190" y="120" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="144.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="230" y="120" width="40" height="40" rx="0" class="soft"/>
<rect x="230" y="120" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="250" y="144.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">02</text>
<rect x="270" y="120" width="40" height="40" rx="0" class="soft"/>
<rect x="270" y="120" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="290" y="144.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">03</text>
<rect x="150" y="160" width="40" height="40" rx="0" class="soft"/>
<rect x="150" y="160" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="170" y="184.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">03</text>
<rect x="190" y="160" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="184.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="230" y="160" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="250" y="184.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">01</text>
<rect x="270" y="160" width="40" height="40" rx="0" class="soft"/>
<rect x="270" y="160" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="290" y="184.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">02</text>
<text x="230" y="28" font-size="13" text-anchor="middle" font-weight="bold">fixed matrix</text>
<rect x="345" y="40" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="370" y="64.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">d4</text>
<rect x="455" y="40" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="480" y="64.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">04</text>
<rect x="345" y="80" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="370" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">bf</text>
<rect x="455" y="80" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="480" y="104.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">66</text>
<rect x="345" y="120" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="370" y="144.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">5d</text>
<rect x="455" y="120" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="480" y="144.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">81</text>
<rect x="345" y="160" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="370" y="184.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">30</text>
<rect x="455" y="160" width="50" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="480" y="184.9" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">e5</text>
<text x="328" y="126" font-size="18" text-anchor="middle">×</text>
<text x="425" y="126" font-size="18" text-anchor="middle">=</text>
<text x="370" y="28" font-size="13" text-anchor="middle" font-weight="bold">column</text>
<text x="480" y="28" font-size="13" text-anchor="middle" font-weight="bold">result</text>
<text x="625" y="28" font-size="13" text-anchor="middle" font-weight="bold">change 1 byte</text>
<rect x="560" y="40" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="560" y="40" width="40" height="40" rx="0" fill="none" class="acc" stroke-width="1"/>
<rect x="645" y="40" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="645" y="40" width="40" height="40" rx="0" fill="none" class="acc" stroke-width="1"/>
<rect x="560" y="80" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="645" y="80" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="645" y="80" width="40" height="40" rx="0" fill="none" class="acc" stroke-width="1"/>
<rect x="560" y="120" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="645" y="120" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="645" y="120" width="40" height="40" rx="0" fill="none" class="acc" stroke-width="1"/>
<rect x="560" y="160" width="40" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="645" y="160" width="40" height="40" rx="0" class="soft-acc"/>
<rect x="645" y="160" width="40" height="40" rx="0" fill="none" class="acc" stroke-width="1"/>
<line x1="604" y1="120" x2="641" y2="120" class="acc" stroke-width="1.4"/>
<polygon points="641,120 634.6,122.7 634.6,117.3" class="acc-fill"/>
<text x="622" y="225" font-size="13" text-anchor="middle" class="acc-fill">1 in, 4 out:</text>
<text x="622" y="243" font-size="13" text-anchor="middle" class="acc-fill">branch number 5</text>
<text x="320" y="228" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">02 · d4 ⊕ 03 · bf ⊕ 5d ⊕ 30 = 04</text>
</svg>
<figcaption>Figure 7.9. Left: the column mixed by hand in the text. Right: the property that makes the matrix special. However one input byte changes, all four output bytes change; in general the changed bytes in and out add up to at least 5.</figcaption>
</figure>

**Why this matrix?** Its rows are rotations of one another, so the same small
circuit serves for all four bytes, and its entries are tiny (`01`, `02`, `03`), so
it is cheap. Above all, it is **MDS** (maximum distance separable, a term from
error-correcting codes): if an input column has $k$ nonzero bytes, the output has
at least $5 - k$. Together, at least 5 bytes are nonzero, the most possible for a
4-byte map. This **branch number** of 5 is what lets the designers prove bounds on
attacks (§7.11). Decryption multiplies by the inverse matrix, whose entries are
`0e`, `0b`, `0d` and `09`.

## 7.6 AddRoundKey and the key schedule

*Level: intermediate.* AddRoundKey XORs a 16-byte round key into the state. It is
the only step that involves the key; without it, everything else is public and
could simply be undone.

The **key schedule** stretches the key into $N_r + 1$ round keys (11 for AES-128).
It works in 4-byte words $w_0, w_1, \ldots$. The first $N_k$ words are the key
itself ($N_k = 4$, 6 or 8 for 128, 192 or 256 bits). Each later word is

$$
w_i = w_{i - N_k} \oplus \begin{cases}
\mathrm{SubWord}(\mathrm{RotWord}(w_{i-1})) \oplus \mathrm{Rcon}_{i/N_k} & \text{if } N_k \text{ divides } i \\
\mathrm{SubWord}(w_{i-1}) & \text{if } N_k = 8 \text{ and } i \bmod 8 = 4 \\
w_{i-1} & \text{otherwise.}
\end{cases}
$$

RotWord rotates a word's four bytes left by one, SubWord applies the S-box to each
byte, and $\mathrm{Rcon}_j$ is the word $(x^{j-1}, 0, 0, 0)$: `01`, `02`, `04`,
`08`, `10`, `20`, `40`, `80`, `1b`, `36`. The round constants make every round
different, which stops the slide attacks of [Chapter 6](06-Block-Ciphers.md).

**By hand: the first new word.** FIPS 197 Appendix A uses the key
`2b7e1516 28aed2a6 abf71588 09cf4f3c`, so $w_0$ = `2b7e1516` and $w_3$ = `09cf4f3c`.

<div class="mars-steps" markdown>

1. RotWord($w_3$): `09cf4f3c` becomes `cf4f3c09`.
2. SubWord: the S-box on each byte gives `8a84eb01`.
3. XOR $\mathrm{Rcon}_1$ = `01000000`: `8b84eb01`.
4. XOR $w_0$ = `2b7e1516`: $w_4$ = `a0fafe17`.
5. Then $w_5 = w_1 \oplus w_4$ = `88542cb1`, $w_6$ = `23a33939`, $w_7$ = `2a6c7605`: the round-1 key is `a0fafe17 88542cb1 23a33939 2a6c7605`.

</div>

<figure class="mars-fig">
<svg viewBox="0 0 680 260" width="680" role="img" aria-label="AES-128 key schedule: w4 = w0 XOR g(w3), then each next word is the previous word XOR the word four places back" fill="currentColor" font-size="13">
<rect x="40" y="20" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="100" y="40.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">2b7e1516</text>
<text x="78" y="70" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w0</text>
<rect x="40" y="190" width="120" height="32" rx="4" class="soft-acc"/>
<rect x="40" y="190" width="120" height="32" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="100" y="210.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">a0fafe17</text>
<text x="100" y="240" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w4</text>
<rect x="190" y="20" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="250" y="40.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">28aed2a6</text>
<text x="228" y="70" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w1</text>
<rect x="190" y="190" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="250" y="210.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">88542cb1</text>
<text x="250" y="240" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w5</text>
<rect x="340" y="20" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="400" y="40.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">abf71588</text>
<text x="378" y="70" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w2</text>
<rect x="340" y="190" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="400" y="210.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">23a33939</text>
<text x="400" y="240" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w6</text>
<rect x="490" y="20" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="550" y="40.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">09cf4f3c</text>
<text x="528" y="70" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w3</text>
<rect x="490" y="190" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="550" y="210.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">2a6c7605</text>
<text x="550" y="240" font-size="12.5" text-anchor="middle" fill-opacity="0.8">w7</text>
<rect x="470" y="80" width="200" height="46" rx="4" class="soft-acc"/>
<rect x="470" y="80" width="200" height="46" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="570" y="99.6" font-size="12.5" text-anchor="middle">g: RotWord, SubWord,</text>
<text x="570" y="115.1" font-size="12.5" text-anchor="middle">XOR Rcon₁ = 01</text>
<line x1="600" y1="52" x2="600" y2="80" class="acc" stroke-width="1.4"/>
<polygon points="600,80 597.3,73.6 602.7,73.6" class="acc-fill"/>
<circle cx="100" cy="160" r="9" fill="none" class="acc" stroke-width="1.4"/>
<line x1="91" y1="160" x2="109" y2="160" class="acc" stroke-width="1.4"/>
<line x1="100" y1="151" x2="100" y2="169" class="acc" stroke-width="1.4"/>
<line x1="100" y1="52" x2="100" y2="151" stroke="currentColor" stroke-width="1.4"/>
<polygon points="100,151 97.3,144.6 102.7,144.6" fill="currentColor"/>
<line x1="100" y1="169" x2="100" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="100,190 97.3,183.6 102.7,183.6" fill="currentColor"/>
<circle cx="250" cy="160" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="241" y1="160" x2="259" y2="160" stroke="currentColor" stroke-width="1.4"/>
<line x1="250" y1="151" x2="250" y2="169" stroke="currentColor" stroke-width="1.4"/>
<line x1="250" y1="52" x2="250" y2="151" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,151 247.3,144.6 252.7,144.6" fill="currentColor"/>
<line x1="250" y1="169" x2="250" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,190 247.3,183.6 252.7,183.6" fill="currentColor"/>
<circle cx="400" cy="160" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="391" y1="160" x2="409" y2="160" stroke="currentColor" stroke-width="1.4"/>
<line x1="400" y1="151" x2="400" y2="169" stroke="currentColor" stroke-width="1.4"/>
<line x1="400" y1="52" x2="400" y2="151" stroke="currentColor" stroke-width="1.4"/>
<polygon points="400,151 397.3,144.6 402.7,144.6" fill="currentColor"/>
<line x1="400" y1="169" x2="400" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="400,190 397.3,183.6 402.7,183.6" fill="currentColor"/>
<circle cx="550" cy="160" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="541" y1="160" x2="559" y2="160" stroke="currentColor" stroke-width="1.4"/>
<line x1="550" y1="151" x2="550" y2="169" stroke="currentColor" stroke-width="1.4"/>
<line x1="550" y1="52" x2="550" y2="151" stroke="currentColor" stroke-width="1.4"/>
<polygon points="550,151 547.3,144.6 552.7,144.6" fill="currentColor"/>
<line x1="550" y1="169" x2="550" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="550,190 547.3,183.6 552.7,183.6" fill="currentColor"/>
<polyline points="570,126 570,138 125,138 109,158" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="109,158 110.9,151.3 115.2,154.7" class="acc-fill"/>
<polyline points="160,206 172,206 172,172 242,164" fill="none" stroke="currentColor" stroke-width="1.1"/>
<polygon points="242,164 235.9,167.4 235.3,162" fill="currentColor"/>
<polyline points="310,206 322,206 322,172 392,164" fill="none" stroke="currentColor" stroke-width="1.1"/>
<polygon points="392,164 385.9,167.4 385.3,162" fill="currentColor"/>
<polyline points="460,206 472,206 472,172 542,164" fill="none" stroke="currentColor" stroke-width="1.1"/>
<polygon points="542,164 535.9,167.4 535.3,162" fill="currentColor"/>
</svg>
<figcaption>Figure 7.10. The first step of the key schedule with the FIPS 197 key, as worked in the text. The word g(w3) carries the S-box and a round constant; the other three words are plain XOR chains. Round key 1 is w4 to w7.</figcaption>
</figure>

**Why no MixColumns in the last round?** In the last round, MixColumns would be
followed only by the key XOR. Both are linear, so an attacker could swap their
order (using a modified key) and strip the MixColumns off for free. It adds no
security there, and leaving it out makes decryption mirror encryption.

## 7.7 One round by hand

*Level: intermediate.* FIPS 197 Appendix B encrypts the block
`3243f6a8 885a308d 313198a2 e0370734` with the key of §7.6. Here is the start, as
the 16 bytes column by column. Every value was recomputed with the code in §7.8.

| Step | State |
|---|---|
| Input | `32 43 f6 a8` `88 5a 30 8d` `31 31 98 a2` `e0 37 07 34` |
| AddRoundKey (the key itself) | `19 3d e3 be` `a0 f4 e2 2b` `9a c6 8d 2a` `e9 f8 48 08` |
| Round 1: SubBytes | `d4 27 11 ae` `e0 bf 98 f1` `b8 b4 5d e5` `1e 41 52 30` |
| ShiftRows | `d4 bf 5d 30` `e0 b4 52 ae` `b8 41 11 f1` `1e 27 98 e5` |
| MixColumns | `04 66 81 e5` `e0 cb 19 9a` `48 f8 d3 7a` `28 06 26 4c` |
| AddRoundKey (round-1 key) | `a4 9c 7f f2` `68 9f 35 2b` `6b 5b ea 43` `02 6a 50 49` |
| ... rounds 2 to 10 ... | |
| Ciphertext | `39 25 84 1d` `02 dc 09 fb` `dc 11 85 97` `19 6a 0b 32` |

Trace a few bytes yourself: `32` XOR `2b` = `19`; $S(\mathtt{19}) = \mathtt{d4}$;
row 1 of the grid after SubBytes is `27 bf b4 41`, which ShiftRows turns into
`bf b4 41 27`, so the first column becomes `d4 bf 5d 30`, the column you mixed by
hand in §7.5.

How fast does a change spread? Flip the lowest bit of the first plaintext byte
and run both blocks through the code of §7.8. Figure 7.11 marks the bytes
that differ after each round.

<figure class="mars-fig">
<svg viewBox="0 0 640 190" width="640" role="img" aria-label="Bytes that differ after rounds 0, 1, 2 and 10 when one bit of the plaintext changes" fill="currentColor" font-size="13">
<text x="80" y="30" font-size="13" text-anchor="middle" font-weight="bold">input</text>
<rect x="20" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="20" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="20" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="20" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="20" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="50" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="50" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="50" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="50" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="80" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="80" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="80" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="80" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="110" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="110" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="110" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="110" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="80" y="175" font-size="12.5" text-anchor="middle">1 byte differs</text>
<text x="240" y="30" font-size="13" text-anchor="middle" font-weight="bold">after round 1</text>
<rect x="180" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="180" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="180" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="180" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="210" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="210" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="210" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="210" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="240" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="240" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="240" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="240" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="270" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="270" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="270" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="270" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="240" y="175" font-size="12.5" text-anchor="middle">4 bytes differ</text>
<text x="400" y="30" font-size="13" text-anchor="middle" font-weight="bold">after round 2</text>
<rect x="340" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="340" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="340" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="340" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="370" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="370" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="370" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="370" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="400" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="400" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="400" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="400" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="430" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="430" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="430" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="430" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="400" y="175" font-size="12.5" text-anchor="middle">16 bytes differ</text>
<text x="560" y="30" font-size="13" text-anchor="middle" font-weight="bold">after round 10</text>
<rect x="500" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="500" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="500" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="500" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="500" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="500" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="500" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="500" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="530" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="530" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="530" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="530" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="530" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="530" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="530" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="530" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="560" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="560" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="560" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="560" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="560" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="560" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="560" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="560" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="590" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="590" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="590" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="590" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="590" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="590" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="590" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="590" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="560" y="175" font-size="12.5" text-anchor="middle">16 bytes differ</text>
</svg>
<figcaption>Figure 7.11. Diffusion in AES, computed on the FIPS 197 example with the lowest bit of byte 0 flipped. One round spreads the change through a column; two rounds reach every byte, and the remaining eight rounds keep mixing.</figcaption>
</figure>

## 7.8 Code it

*Level: intermediate.* The whole cipher, for all three key sizes, building on the
field functions of §7.3. The S-box is computed from its formula instead of being
typed in.

```python
def affine(b):                          # the S-box's fixed bit transformation
    r = 0x63
    for s in range(5):
        r ^= (b << s | b >> (8 - s)) & 0xff
    return r

SBOX = [affine(ginv(a)) for a in range(256)]     # ginv(0) = 0, as the standard says
INV = [SBOX.index(i) for i in range(256)]

def expand(key):                        # the key schedule: (rounds + 1) round keys of 16 bytes
    nk = len(key) // 4
    nr = nk + 6
    w = [list(key[4 * i:4 * i + 4]) for i in range(nk)]
    rcon = 1
    for i in range(nk, 4 * (nr + 1)):
        t = w[i - 1][:]
        if i % nk == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]     # RotWord, SubWord
            t[0] ^= rcon
            rcon = xtime(rcon)
        elif nk > 6 and i % nk == 4:
            t = [SBOX[b] for b in t]
        w.append([a ^ b for a, b in zip(w[i - nk], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(nr + 1)]

def shift_rows(s):                      # s[r + 4c] is row r, column c
    return [s[(r + 4 * (c + r)) % 16] for c in range(4) for r in range(4)]

def inv_shift_rows(s):
    return [s[(r + 4 * (c - r)) % 16] for c in range(4) for r in range(4)]

def mix_columns(s, m=(2, 3, 1, 1)):
    out = []
    for c in range(4):
        col = s[4 * c:4 * c + 4]
        for r in range(4):
            x = 0
            for i in range(4):
                x ^= gmul(m[(i - r) % 4], col[i])
            out.append(x)
    return out

def encrypt(block, key):
    ks = expand(key)
    s = [a ^ b for a, b in zip(block, ks[0])]
    for r in range(1, len(ks)):
        s = shift_rows([SBOX[b] for b in s])
        if r < len(ks) - 1:             # the last round has no MixColumns
            s = mix_columns(s)
        s = [a ^ b for a, b in zip(s, ks[r])]
    return bytes(s)

def decrypt(block, key):
    ks = expand(key)
    s = list(block)
    for r in range(len(ks) - 1, 0, -1):
        s = [a ^ b for a, b in zip(s, ks[r])]
        if r < len(ks) - 1:
            s = mix_columns(s, (14, 11, 13, 9))     # the inverse matrix
        s = [INV[b] for b in inv_shift_rows(s)]
    return bytes(a ^ b for a, b in zip(s, ks[0]))

print(hex(SBOX[0x53]), bytes(expand(bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c"))[1]).hex())
# 0xed a0fafe1788542cb123a339392a6c7605

pt = bytes.fromhex("00112233445566778899aabbccddeeff")    # FIPS 197, Appendix C
for n in (16, 24, 32):
    ct = encrypt(pt, bytes(range(n)))
    print(8 * n, ct.hex(), decrypt(ct, bytes(range(n))) == pt)
```

```
128 69c4e0d86a7b0430d8cdb78070b4c55a True
192 dda97ca4864cdfe06eaf70a0ec0d7191 True
256 8ea2b7ca516745bfeafc49904b496089 True
```

All three match Appendix C of FIPS 197, and the code was also checked against the
`cryptography` library on 300 random keys and blocks. ShiftRows here is written
as an index formula: the byte at row $r$, column $c$ comes from column $c + r$.

This is a teaching copy: it is slow and its table lookups leak timing (§7.9). For
real work, use a library, which uses the processor's AES instructions:

```python
# pip install cryptography
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

k = bytes.fromhex("2b7e151628aed2a6abf7158809cf4f3c")
one_block = Cipher(algorithms.AES(k), modes.ECB()).encryptor()   # ECB: one block only, see Chapter 8
print(one_block.update(bytes.fromhex("3243f6a8885a308d313198a2e0370734")).hex())
# 3925841d02dc09fbdc118597196a0b32
```

And never use a block cipher alone on real data: [Chapter 8](08-Modes-of-Operation.md)
shows why, and [Chapter 10](10-Message-Authentication.md) gives the mode to use,
AES-GCM.

## 7.9 Break it

*Level: intermediate.*

### The square attack on 4 rounds

Daemen and Rijmen found the best early attack on their own design while working
on its ancestor, the cipher **Square** (1997, with Lars Knudsen). Take 256
plaintexts that are equal except in one byte, which runs through all 256 values.

- After round 1, that byte has become four bytes of one column (by MixColumns),
  each still running through all 256 values: a permutation of byte values,
  passed through the S-box and a fixed linear map.
- After round 2, each byte of the whole state runs through all 256 values.
- After round 3, the bytes no longer run through all values, but each byte,
  XORed over the 256 texts, still sums to **zero**. Such a set is called
  **balanced**.

<figure class="mars-fig">
<svg viewBox="0 0 640 210" width="640" role="img" aria-label="The square attack: an all-values byte spreads to a column, then the whole state, then becomes balanced" fill="currentColor" font-size="13">
<text x="80" y="30" font-size="13" text-anchor="middle" font-weight="bold">input</text>
<rect x="20" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="20" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="35" y="59.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="20" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="35" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="20" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="35" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="20" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="35" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="50" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="65" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="50" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="65" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="50" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="65" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="50" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="65" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="80" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="95" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="80" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="95" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="80" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="95" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="80" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="95" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="110" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="125" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="110" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="125" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="110" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="125" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="110" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="125" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<text x="240" y="30" font-size="13" text-anchor="middle" font-weight="bold">after round 1</text>
<rect x="180" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="195" y="59.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="180" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="195" y="89.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="180" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="195" y="119.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="180" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="180" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="195" y="149.6" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="210" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="225" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="210" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="225" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="210" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="225" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="210" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="225" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="240" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="255" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="240" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="255" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="240" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="255" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="240" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="255" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="270" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="285" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="270" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="285" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="270" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="285" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="270" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="285" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<text x="400" y="30" font-size="13" text-anchor="middle" font-weight="bold">after round 2</text>
<rect x="340" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="355" y="59.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="340" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="355" y="89.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="340" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="355" y="119.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="340" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="340" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="355" y="149.6" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="370" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="385" y="59.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="370" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="385" y="89.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="370" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="385" y="119.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="370" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="370" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="385" y="149.6" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="400" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="415" y="59.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="400" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="415" y="89.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="400" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="415" y="119.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="400" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="400" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="415" y="149.6" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="430" y="40" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="445" y="59.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="430" y="70" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="445" y="89.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="430" y="100" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="445" y="119.5" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="430" y="130" width="30" height="30" rx="0" class="soft-acc"/>
<rect x="430" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="445" y="149.6" font-size="13" text-anchor="middle" class="acc-fill" style="font-family:var(--md-code-font-family,monospace)">A</text>
<text x="560" y="30" font-size="13" text-anchor="middle" font-weight="bold">after round 3</text>
<rect x="500" y="40" width="30" height="30" rx="0" class="soft"/>
<rect x="500" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="515" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="500" y="70" width="30" height="30" rx="0" class="soft"/>
<rect x="500" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="515" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="500" y="100" width="30" height="30" rx="0" class="soft"/>
<rect x="500" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="515" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="500" y="130" width="30" height="30" rx="0" class="soft"/>
<rect x="500" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="515" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="530" y="40" width="30" height="30" rx="0" class="soft"/>
<rect x="530" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="545" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="530" y="70" width="30" height="30" rx="0" class="soft"/>
<rect x="530" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="545" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="530" y="100" width="30" height="30" rx="0" class="soft"/>
<rect x="530" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="545" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="530" y="130" width="30" height="30" rx="0" class="soft"/>
<rect x="530" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="545" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="560" y="40" width="30" height="30" rx="0" class="soft"/>
<rect x="560" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="575" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="560" y="70" width="30" height="30" rx="0" class="soft"/>
<rect x="560" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="575" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="560" y="100" width="30" height="30" rx="0" class="soft"/>
<rect x="560" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="575" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="560" y="130" width="30" height="30" rx="0" class="soft"/>
<rect x="560" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="575" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="590" y="40" width="30" height="30" rx="0" class="soft"/>
<rect x="590" y="40" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="605" y="59.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="590" y="70" width="30" height="30" rx="0" class="soft"/>
<rect x="590" y="70" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="605" y="89.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="590" y="100" width="30" height="30" rx="0" class="soft"/>
<rect x="590" y="100" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="605" y="119.5" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="590" y="130" width="30" height="30" rx="0" class="soft"/>
<rect x="590" y="130" width="30" height="30" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="605" y="149.6" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<text x="320" y="185" font-size="12.5" text-anchor="middle">A: takes all 256 values   C: constant   B: balanced (XOR of the 256 values is 0)</text>
<text x="320" y="204" font-size="12.5" text-anchor="middle">round 4 is peeled off one byte at a time by guessing its key byte</text>
</svg>
<figcaption>Figure 7.12. What the 256 chosen plaintexts look like after each round. After three rounds no byte takes all values any more, but every byte still XORs to zero over the set, and a random permutation would not do that.</figcaption>
</figure>

So three rounds of AES, under any key, have a property a random permutation does
not. Add a fourth round and guess one byte of its round key: undo that byte's
AddRoundKey and S-box for all 256 ciphertexts and XOR the results. The right
guess always gives zero; a wrong one gives zero by chance, 1 time in 256. Three
sets of 256 plaintexts leave only the right guess. Repeat for each of the 16
bytes, then run the key schedule backwards to the key.

```python
import random

def encrypt4(block, ks):                # AES-128 cut to 4 rounds (the last has no MixColumns)
    s = [a ^ b for a, b in zip(block, ks[0])]
    for r in range(1, 5):
        s = shift_rows([SBOX[b] for b in s])
        if r < 4:
            s = mix_columns(s)
        s = [a ^ b for a, b in zip(s, ks[r])]
    return bytes(s)

random.seed(11)
secret = bytes(random.randrange(256) for _ in range(16))
ks = expand(secret)

sets = []                               # three sets of 256 chosen plaintexts:
for _ in range(3):                      # byte 0 takes every value, the rest stay fixed
    rest = bytes(random.randrange(256) for _ in range(15))
    sets.append([encrypt4(bytes([x]) + rest, ks) for x in range(256)])

def balanced(texts, j, g):              # undo the last S-box on byte j with guess g; XOR is 0?
    x = 0
    for c in texts:
        x ^= INV[c[j] ^ g]
    return x == 0

k4 = [next(g for g in range(256) if all(balanced(t, j, g) for t in sets)) for j in range(16)]

def unexpand(k, rounds):                # run the AES-128 key schedule backwards
    w = [k[i:i + 4] for i in range(0, 16, 4)]
    rcon = [1, 2, 4, 8, 16, 32, 64, 128, 27, 54]
    for r in range(rounds, 0, -1):
        old = [None, *[[a ^ b for a, b in zip(w[i], w[i - 1])] for i in (1, 2, 3)]]
        t = [SBOX[b] for b in old[3][1:] + old[3][:1]]
        t[0] ^= rcon[r - 1]
        old[0] = [a ^ b for a, b in zip(w[0], t)]
        w = old
    return bytes(sum(w, []))

print(unexpand(k4, 4).hex(), secret.hex())
# e7eee7615ef35f30e49b482e15cae750 e7eee7615ef35f30e49b482e15cae750
```

768 chosen plaintexts and a fraction of a second. ShiftRows only moves bytes, so
each ciphertext byte depends on exactly one byte of the state before the last
round, which is why the bytes can be attacked one at a time. With more guessing,
the same idea reaches 6 rounds: the designers described it themselves, and Niels
Ferguson and colleagues improved it in 2000. That is why AES has 10.

!!! note "Life story: the square (integral) attack"
    **Born:** 1997, Joan Daemen, Lars Knudsen and Vincent Rijmen, against their
    own cipher Square; generalized as **integral cryptanalysis** by Lars
    Knudsen and David Wagner in 2002 · **Purpose:** to exploit sets of
    plaintexts that run through all values of some bytes · **Helped:** set the
    number of rounds of AES, and became a standard test for every
    byte-oriented cipher · **Status:** current; it still gives some of the best
    attacks on reduced AES

### How far the attacks reach

Twenty-five years of public attacks on full AES amount to this:

| Attack | Target | Cost | Meaning |
|---|---|---|---|
| Biclique (Bogdanov, Khovratovich, Rechberger, 2011) | full AES-128 | about $2^{126.1}$ operations | 4 times faster than brute force; no practical effect |
| Biclique, same paper | AES-256 | about $2^{254.4}$ | the same |
| Related-key (Biryukov, Khovratovich, 2009) | AES-256 | $2^{99.5}$, with 4 related keys | needs keys with chosen relations, which proper systems never produce |
| Best single-key attacks on reduced AES-128 | 7 of 10 rounds | impractical | a security margin of 3 rounds |

The related-key results do say something: AES-256's key schedule is weaker than
its rounds. It matters only in constructions that use AES with related keys,
such as some hash function designs.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="Security margin of AES-128: attacks reach 6 rounds in 1998 and 7 today, out of 10" fill="currentColor" font-size="13">
<rect x="110" y="50" width="46" height="34" rx="2" class="soft-acc"/>
<rect x="110" y="50" width="46" height="34" rx="2" fill="none" class="acc" stroke-width="1.2"/>
<text x="133" y="72" font-size="13" text-anchor="middle">1</text>
<rect x="160" y="50" width="46" height="34" rx="2" class="soft-acc"/>
<rect x="160" y="50" width="46" height="34" rx="2" fill="none" class="acc" stroke-width="1.2"/>
<text x="183" y="72" font-size="13" text-anchor="middle">2</text>
<rect x="210" y="50" width="46" height="34" rx="2" class="soft-acc"/>
<rect x="210" y="50" width="46" height="34" rx="2" fill="none" class="acc" stroke-width="1.2"/>
<text x="233" y="72" font-size="13" text-anchor="middle">3</text>
<rect x="260" y="50" width="46" height="34" rx="2" class="soft-acc"/>
<rect x="260" y="50" width="46" height="34" rx="2" fill="none" class="acc" stroke-width="1.2"/>
<text x="283" y="72" font-size="13" text-anchor="middle">4</text>
<rect x="310" y="50" width="46" height="34" rx="2" class="soft-acc"/>
<rect x="310" y="50" width="46" height="34" rx="2" fill="none" class="acc" stroke-width="1.2"/>
<text x="333" y="72" font-size="13" text-anchor="middle">5</text>
<rect x="360" y="50" width="46" height="34" rx="2" class="soft-acc"/>
<rect x="360" y="50" width="46" height="34" rx="2" fill="none" class="acc" stroke-width="1.2"/>
<text x="383" y="72" font-size="13" text-anchor="middle">6</text>
<rect x="410" y="50" width="46" height="34" rx="2" class="soft"/>
<rect x="410" y="50" width="46" height="34" rx="2" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="433" y="72" font-size="13" text-anchor="middle">7</text>
<rect x="460" y="50" width="46" height="34" rx="2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<text x="483" y="72" font-size="13" text-anchor="middle">8</text>
<rect x="510" y="50" width="46" height="34" rx="2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<text x="533" y="72" font-size="13" text-anchor="middle">9</text>
<rect x="560" y="50" width="46" height="34" rx="2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<text x="583" y="72" font-size="13" text-anchor="middle">10</text>
<text x="100" y="72" font-size="13" text-anchor="end">rounds</text>
<line x1="110" y1="100" x2="406" y2="100" class="acc" stroke-width="1.6"/>
<text x="258" y="118" font-size="12.5" text-anchor="middle" class="acc-fill">square attack, known when AES was designed</text>
<line x1="110" y1="136" x2="456" y2="136" stroke="currentColor" stroke-width="1.6"/>
<text x="283" y="154" font-size="12.5" text-anchor="middle">best single-key attacks today (impractical)</text>
<text x="533" y="118" font-size="13" text-anchor="middle" font-weight="bold">margin</text>
<text x="533" y="136" font-size="13" text-anchor="middle" font-weight="bold">3 rounds</text>
<text x="320" y="34" font-size="13" text-anchor="middle">full AES-128: best attack, biclique, about 2¹²⁶·¹ instead of 2¹²⁸ work</text>
<text x="320" y="188" font-size="12.5" text-anchor="middle" fill-opacity="0.85">AES-192 and AES-256 add 2 and 4 rounds for the longer keys</text>
</svg>
<figcaption>Figure 7.13. How much of AES the public attacks reach. The designers added four rounds beyond the best attack they knew; twenty-five years of work have used up one of them.</figcaption>
</figure>

!!! note "Life story: the attacks on full AES"
    **Born:** 2009, related-key attacks on AES-192 and AES-256 by Alex
    Biryukov and Dmitry Khovratovich; 2011, the biclique attack by Andrey
    Bogdanov, Dmitry Khovratovich and Christian Rechberger · **Purpose:** to
    find the real security margin of the standard · **Helped:** showed that
    AES-256's key schedule is its weakest part, and that no shortcut gains more
    than a factor of about four over brute force · **Status:** theoretical; no
    practical effect on AES used in the normal way

### Where AES has actually failed: side channels

No real system has lost data because of the mathematics of AES. It has lost keys
through **side channels**, information leaked by the way the computation runs.

Fast software AES uses **T-tables**: four tables of 256 four-byte words that
combine SubBytes and MixColumns into lookups. Which table entry is read depends on
key and data bytes, and the processor's cache remembers which entries were read
recently. In 2005 Daniel J. Bernstein recovered a full AES key from a server
running OpenSSL just by timing its responses over a network, and Dag Arne Osvik,
Adi Shamir and Eran Tromer recovered keys from another process on the same
machine by watching the cache.

<figure class="mars-fig">
<svg viewBox="0 0 660 240" width="660" role="img" aria-label="Cache-timing attack on table-based AES: the table entry read depends on key XOR data, and the cache remembers which lines were touched" fill="currentColor" font-size="13">
<rect x="20" y="30" width="150" height="50" rx="4" class="soft"/>
<rect x="20" y="30" width="150" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95" y="51.5" font-size="13" text-anchor="middle">AES software</text>
<text x="95" y="67.5" font-size="13" text-anchor="middle">reads T[p ⊕ k]</text>
<line x1="170" y1="55" x2="240" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="240,55 233.6,57.7 233.6,52.3" fill="currentColor"/>
<text x="205" y="46" font-size="12.5" text-anchor="middle">index</text>
<text x="345" y="22" font-size="13" text-anchor="middle" font-weight="bold">T-table in memory (cache lines)</text>
<rect x="240" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="240" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="253" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="253" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="266" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="266" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="279" y="36" width="12" height="40" rx="0" class="soft-acc"/>
<rect x="279" y="36" width="12" height="40" rx="0" fill="none" class="acc" stroke-width="0.6"/>
<rect x="292" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="292" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="305" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="305" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="318" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="318" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="331" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="331" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="344" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="344" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="357" y="36" width="12" height="40" rx="0" class="soft-acc"/>
<rect x="357" y="36" width="12" height="40" rx="0" fill="none" class="acc" stroke-width="0.6"/>
<rect x="370" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="370" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="383" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="383" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="396" y="36" width="12" height="40" rx="0" class="soft-acc"/>
<rect x="396" y="36" width="12" height="40" rx="0" fill="none" class="acc" stroke-width="0.6"/>
<rect x="409" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="409" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="422" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="422" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<rect x="435" y="36" width="12" height="40" rx="0" class="soft"/>
<rect x="435" y="36" width="12" height="40" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="345" y="96" font-size="12.5" text-anchor="middle" class="acc-fill">accent: lines now in the cache</text>
<rect x="470" y="30" width="170" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="51.5" font-size="13" text-anchor="middle">attacker: times its own</text>
<text x="555" y="67.5" font-size="13" text-anchor="middle">memory or the server</text>
<line x1="470" y1="55" x2="450" y2="55" stroke="currentColor" stroke-width="1.4"/>
<polygon points="450,55 456.4,52.3 456.4,57.7" fill="currentColor"/>
<polyline points="555,80 555,140 330,140" fill="none" class="acc" stroke-width="1.4"/>
<polygon points="330,140 336.4,137.3 336.4,142.7" class="acc-fill"/>
<rect x="130" y="120" width="200" height="40" rx="4" class="soft-acc"/>
<rect x="130" y="120" width="200" height="40" rx="4" fill="none" class="acc" stroke-width="1.4"/>
<text x="230" y="144.6" font-size="13" text-anchor="middle">fast or slow ⇒ which line</text>
<line x1="230" y1="160" x2="230" y2="185" stroke="currentColor" stroke-width="1.4"/>
<polygon points="230,185 227.3,178.6 232.7,178.6" fill="currentColor"/>
<text x="330" y="205" font-size="13" text-anchor="middle">which line ⇒ bits of p ⊕ k ⇒ bits of k, since p is known</text>
<text x="330" y="228" font-size="12.5" text-anchor="middle" fill-opacity="0.85">fix: AES instructions in hardware, or constant-time code with no secret-indexed tables</text>
</svg>
<figcaption>Figure 7.14. How the 2005 cache-timing attacks worked. Nothing about the mathematics of AES is used; the leak is which memory the program touches.</figcaption>
</figure>

!!! note "Life story: cache-timing attacks on AES"
    **Born:** 2005, Daniel J. Bernstein (over a network) and Dag Arne Osvik, Adi
    Shamir and Eran Tromer (from another process) · **Purpose:** to show that
    table lookups indexed by secret data leak through the processor's cache ·
    **Helped:** led to constant-time AES in software, such as Emilia Käsper and
    Peter Schwabe's bitsliced AES (2009), and pushed processor makers to add AES
    instructions · **Status:** current as a threat to any table-based code;
    the Spectre and Meltdown attacks of 2018 read out their stolen data through
    the same kind of cache timing

The fixes were constant-time software, which computes the S-box without
secret-dependent memory access (bitslicing), and above all **hardware**. Intel
announced the AES-NI instructions in 2008 and shipped them in 2010; ARMv8
processors have equivalent instructions. They run a whole AES round in one
instruction, with no tables, many times faster than software. Power analysis and
fault injection against smart cards and embedded chips are a separate story,
told with the general methods in [Chapter 18](18-Side-Channels.md).

!!! note "Life story: AES instructions in hardware"
    **Born:** announced by Intel in 2008 and shipped in its processors from
    2010 (AES-NI); ARM's version arrived with the ARMv8 architecture, announced
    in 2011 · **Purpose:** AES that is both fast and free of table lookups, so
    of cache leaks · **Helped:** made AES-GCM nearly free on servers, laptops and
    phones, removing the speed argument against encrypting all web
    traffic · **Status:**
    current, in nearly every laptop, server and phone processor

## 7.10 In the real world

*Level: intermediate.*

**Where it runs.** AES encrypts most of the world's protected data: TLS (as
AES-GCM), Wi-Fi (WPA2 and WPA3), disk encryption (BitLocker, FileVault, LUKS,
Android and iOS, in the XTS mode of [Chapter 8](08-Modes-of-Operation.md)), VPNs,
SSH, and ZIP and 7-Zip archives. Nearly every laptop,
server and phone processor sold since about 2010 has AES instructions.

**Which key size.** AES-128 is secure today. AES-256 is the usual choice for data
that must stay secret for decades or against an attacker with a quantum computer:
Grover's algorithm ([Chapter 20](20-Quantum-Computers.md)) would search a 128-bit
key space in about $2^{64}$ quantum steps, though those steps run in series and
are very expensive. The NSA's CNSA 2.0 suite requires AES-256 for classified
systems.

**The standard.** FIPS 197 (2001, updated in 2023 with editorial changes). The
modes are in the NIST SP 800-38 series. In December 2024 NIST proposed
standardizing a wider variant, Rijndael with a 256-bit block, for systems that
encrypt very large amounts of data under one key; it is not a standard yet. Full
details: [AES reference](../04-symmetric-ciphers/AES.md).

**National ciphers.** Several governments certify their own 128-bit block ciphers
for national use, usually alongside AES:

| Cipher | Country | Year | Structure | Notes |
|---|---|---|---|---|
| Camellia | Japan (NTT, Mitsubishi Electric) | 2000 | Feistel | on Japan's CRYPTREC list; RFC 3713 |
| ARIA | Korea | 2003 | SPN, uses the AES S-box | Korean standard KS X 1213; RFC 5794 |
| SM4 | China | 2006 | unbalanced Feistel, 32 rounds | GB/T 32907-2016; mandatory in parts of Chinese commerce |
| Kuznyechik | Russia | 2015 | SPN, 9 rounds | GOST R 34.12-2015; its S-box has an unexplained hidden structure |

None has a known practical attack. Use them when a regulator or partner requires
it; otherwise AES has more review and better tooling. Full details:
[National ciphers](../04-symmetric-ciphers/National-Ciphers.md).

## 7.11 Going deeper

*Level: expert.*

**The wide trail strategy.** Daemen and Rijmen designed AES so that its
resistance to differential and linear cryptanalysis could be **proved**, not just
hoped for. Call an S-box *active* in a trail if its input difference (or mask) is
nonzero. Because MixColumns has branch number 5 and ShiftRows sends the four bytes
of a column to four different columns, any trail through two rounds has at least
5 active S-boxes and any trail through four rounds at least $5 \times 5 = 25$.
With a maximum differential probability of $2^{-6}$ per S-box, any 4-round
characteristic has probability at most $2^{-150}$; with maximum correlation
$2^{-3}$, any 4-round linear trail has correlation at most $2^{-75}$. Both are far
beyond what $2^{128}$ plaintexts could detect, so classical differential and
linear attacks cannot work on 8 rounds, let alone 10. (The bound is on single
trails; clustering of trails into differentials and hulls has been studied
closely and does not change the picture for full AES.)

**Why 10 rounds.** When AES was designed, the best shortcut attacks reached 6
rounds. The designers added 4 rounds of margin, giving 10 for 128-bit keys and one
more for each extra 32 bits of key, since a longer key gives an attacker more
room to guess key bytes at the edges. The best single-key attacks today reach 7
rounds of AES-128, so the margin has shrunk from 4 rounds to 3 in 25 years.

**The S-box's algebra, and the XSL claim.** The S-box is $x \mapsto x^{-1}$ plus an
affine map, so AES can be written as a large system of simple quadratic equations
over $\mathrm{GF}(2)$ or $\mathrm{GF}(2^8)$. In 2002 Nicolas Courtois and Josef
Pieprzyk proposed the XSL method, claiming it might solve such systems faster
than brute force. Later analysis found the method does not work as claimed, and
no algebraic attack threatens AES. The episode is a reminder that the clean
structure that makes AES analyzable could, in principle, be a lever for attack,
and why designers kept the affine step and the round constants.

**The field is a choice, not a necessity.** All irreducible polynomials of degree
8 give isomorphic fields, so the choice of $x^8 + x^4 + x^3 + x + 1$ is about
efficiency. Hardware designers use this freedom: an S-box can be computed in a
**composite field** $\mathrm{GF}((2^4)^2)$, where inversion reduces to arithmetic
on 4-bit pieces, giving the smallest AES circuits (David Canright, 2005) and the
basis of masked, side-channel resistant implementations.

**AES as a building block.** Much modern cryptography uses AES not as a cipher but
as a component. AES-GCM and AES-CCM build authenticated encryption from it
([Chapter 10](10-Message-Authentication.md)); CMAC builds a MAC; CTR_DRBG builds a
random generator (NIST SP 800-90A); and the round function alone, one AES-NI
instruction, is used in fast designs such as AEGIS and in hash functions.

??? info "The equivalent inverse cipher"

    Decryption as written in §7.8 runs the inverse steps in reverse order, a
    different sequence from encryption. FIPS 197 also gives an *equivalent
    inverse cipher*: because InvSubBytes and InvShiftRows commute, and
    InvMixColumns is linear, decryption can be rearranged into the same order of
    steps as encryption, with InvMixColumns applied to the round keys in advance.
    Hardware and table-based software use it so that one structure serves both
    directions.

## Check yourself

??? question "1. Compute $\mathtt{0f} + \mathtt{f0}$ and $\mathtt{0f} + \mathtt{0f}$ in $\mathrm{GF}(2^8)$."

    Addition is XOR: `0f` $\oplus$ `f0` = `ff`, and `0f` $\oplus$ `0f` = `00`.
    Every byte is its own negative.

??? question "2. Compute $\mathtt{02} \cdot \mathtt{80}$ and $\mathtt{03} \cdot \mathtt{80}$."

    `80` shifted is `100`; the top bit fell off, so drop it and XOR `1b`:
    $\mathtt{02} \cdot \mathtt{80} = \mathtt{1b}$. Then
    $\mathtt{03} \cdot \mathtt{80} = \mathtt{1b} \oplus \mathtt{80} = \mathtt{9b}$.

??? question "3. Why can't the field with 256 elements be the integers mod 256?"

    256 is not prime: $2 \times 128 = 256 \equiv 0$, so 2 has no inverse, and
    neither has any even number. A field needs every nonzero element invertible.

??? question "4. What is $S(\mathtt{00})$, and why?"

    `00` has no inverse; AES maps it to `00`, and the affine step then gives
    `00` $\oplus$ `63` = `63`. The S-box table starts with `63`.

??? question "5. Using the matrix of §7.5, compute $b_1$ for the column `d4 bf 5d 30`."

    $b_1 = \mathtt{d4} \oplus \mathtt{02} \cdot \mathtt{bf} \oplus \mathtt{03} \cdot \mathtt{5d} \oplus \mathtt{30}$.
    $\mathtt{02} \cdot \mathtt{bf} = \mathtt{65}$; $\mathtt{03} \cdot \mathtt{5d} = \mathtt{ba} \oplus \mathtt{5d} = \mathtt{e7}$.
    Then `d4` $\oplus$ `65` $\oplus$ `e7` $\oplus$ `30` = `66`, as in §7.5.

??? question "6. A column entering MixColumns has exactly one nonzero byte. How many nonzero bytes can come out?"

    All four: the branch number is 5, so at least $5 - 1 = 4$ output bytes are
    nonzero. One changed byte spreads to the whole column.

??? question "7. Why does the key schedule use round constants?"

    Without them, every round would be identical in structure and a key whose
    words repeat could give identical round keys, opening the cipher to slide
    attacks and to symmetries between rounds. The constants make each round
    different.

??? question "8. In the square attack, a wrong guess passes one set's test with probability $1/256$. With three sets, how many wrong guesses for the 16 key bytes do you expect to survive?"

    $16 \times 255 \times 256^{-3} \approx 0.0002$. Almost surely none. With one
    set, about $16 \times 255 / 256 \approx 16$ would survive.

??? question "9. A 4-round differential characteristic of AES must have at least 25 active S-boxes. Bound its probability, and compare with the number of plaintext pairs available."

    At most $(2^{-6})^{25} = 2^{-150}$. To see it happen once you would need
    about $2^{150}$ pairs with its input difference, but among all $2^{128}$
    plaintexts only $2^{127}$ such pairs exist. The characteristic can't be used.

??? question "10. Why did table-based AES leak keys through the cache, while ChaCha20 (Chapter 5) does not have this problem?"

    T-table AES reads table entries whose addresses depend on key XOR data, and
    the cache's state reveals which addresses were read. ChaCha20 uses only
    additions, rotations and XORs on registers, with no secret-dependent memory
    addresses.

## What you learned

- AES was chosen in an open, worldwide competition (1997 to 2000); Rijndael, by
  Daemen and Rijmen, won on speed, simplicity and margin.
- AES works in $\mathrm{GF}(2^8)$: addition is XOR, multiplication is polynomial
  multiplication modulo $x^8 + x^4 + x^3 + x + 1$, done with xtime.
- A round is SubBytes (inverse plus affine map), ShiftRows, MixColumns (an MDS
  matrix with branch number 5) and AddRoundKey; AES-128 has 10 rounds.
- The wide trail strategy proves that no 4-round differential or linear trail is
  useful, and the best attack on full AES is only 4 times faster than brute force.
- The square attack breaks 4 rounds with 768 chosen plaintexts; the margin of full
  AES over the best attacks is 3 rounds.
- AES's real failures were side channels in table-based software; use hardware
  AES instructions or constant-time code through a tested library.

**Next:** [Chapter 8](08-Modes-of-Operation.md): AES encrypts 16 bytes. How do you
use it for a whole file, a disk, or a credit card number?

## Further reading

- FIPS 197, Advanced Encryption Standard (2001, updated 2023).
- Joan Daemen and Vincent Rijmen, *The Design of Rijndael: AES, the Advanced
  Encryption Standard* (Springer, 2002; second edition 2020).
- NIST, *Report on the Development of the Advanced Encryption Standard (AES)*
  (October 2000).
- Kaisa Nyberg, "Differentially uniform mappings for cryptography" (EUROCRYPT
  1993).
- Joan Daemen, Lars Knudsen and Vincent Rijmen, "The Block Cipher Square" (FSE
  1997).
- Andrey Bogdanov, Dmitry Khovratovich and Christian Rechberger, "Biclique
  Cryptanalysis of the Full AES" (ASIACRYPT 2011).
- Alex Biryukov and Dmitry Khovratovich, "Related-Key Cryptanalysis of the Full
  AES-192 and AES-256" (ASIACRYPT 2009).
- [Daniel J. Bernstein, "Cache-timing attacks on AES" (2005)](https://cr.yp.to/antiforgery/cachetiming-20050414.pdf).
- Dag Arne Osvik, Adi Shamir and Eran Tromer, "Cache Attacks and
  Countermeasures: the Case of AES" (CT-RSA 2006).
- Reference pages: [AES](../04-symmetric-ciphers/AES.md),
  [National ciphers](../04-symmetric-ciphers/National-Ciphers.md), and the history
  appendix [The Internet era](../history/08-Internet-Era.md).
