# 3. Machines and the War

*Between 1920 and 1945 cipher work moved from paper to machines, and
codebreaking moved from linguists to mathematicians. This chapter follows the
great breaks of that time from the attacker's side: how Marian Rejewski turned
Enigma into a problem about permutations, how Alan Turing and Gordon Welchman
turned a guessed word into a machine search, how Bill Tutte rebuilt a German
teleprinter cipher he had never seen and Tommy Flowers built Colossus to work
his statistics, how American teams broke Japan's Purple machine and naval code,
and how reused one-time pads exposed Soviet spies. You will build a working
3-rotor Enigma, check Rejewski's theorem on it, drag a crib, run a small bombe
that finds the rotor setting and part of the plugboard, recover two Lorenz wheel
settings from ciphertext alone, and strip an additive from a Japanese-style code.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Enigma's rotors, reflector and plugboard combine into one permutation
      per letter, and why that permutation can never fix a letter;
    - Rejewski's theorem, that the cycle structure of the products he built from
      doubled message keys does not depend on the plugboard, and how the Poles
      used it with a catalog, sheets and the *bomba*;
    - how cribs, menus and the Turing-Welchman Bombe found daily keys, and why
      the diagonal board mattered;
    - how Tutte reconstructed the Lorenz SZ40/42 from one key stream, and how
      his "double delta" statistic let Colossus find wheel settings;
    - how Purple, JN-25 and the Soviet one-time pads were broken, and what the
      German, Italian, Japanese, Soviet, Finnish and Swedish codebreakers did;
    - the lesson of the whole period: structure leaks, and operators leak more.

    **You need:** [Chapter 2](02-Breaking-Classical-Ciphers.md) (frequency
    counts, the index of coincidence, depth), book 1's
    [Chapter 2](../../book/02-Classical-Ciphers.md) (how Enigma works) and
    [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) (XOR and the
    two-time pad). A little about permutations helps; §3.2 explains what is used.

    **Levels:** the stories in §3.1, §3.5, §3.6, §3.8, §3.9 and §3.11 are for
    beginners; the permutation theory and the Bombe in §3.2 to §3.4, Venona in
    §3.10 and the lessons in §3.12 are intermediate; Tutte's statistical method
    in §3.7 and §3.13 are expert.

## 3.1 The problem

*Level: beginner.*

In the First World War, armies and navies sent their orders by radio, and
radio can be heard by anyone. Codebreaking became a large and permanent
business. Britain's Room 40 read the Zimmermann telegram in 1917, and
France's Georges Painvin broke the German field cipher ADFGVX in 1918. The
ciphers of 1914 to 1918 were done by hand, and a team of clever people could
often break them, as [Chapter 2](02-Breaking-Classical-Ciphers.md) showed.

After the war every major power wanted something better: a cipher that a
soldier could use quickly, that never repeated its alphabets, and that would
stay safe even if the enemy captured a machine. The answer of the 1920s was the
**rotor machine** (book 1, [§2.9](../../book/02-Classical-Ciphers.md#29-machines-enigma)).
Germany adopted Arthur Scherbius's Enigma; Japan built its own machines; the
United States built SIGABA; Britain built Typex. At the same time teleprinters
arrived, and with them machines that added a key stream to a 5-bit telegraph
code: the Lorenz SZ40/42 and the Siemens T52 in Germany. For messages too
important for any machine, the Soviet Union used one-time pads.

To an attacker these were a new kind of problem. A rotor machine's key space
was far too large to try by hand: book 1 counts about $2^{67}$ daily keys for
the wartime army Enigma. Frequency analysis alone gets nowhere, because the
alphabet changes at every letter and does not come back for 16,900 letters. The
machines were not broken by trying keys. They were broken by finding
**structure**, properties that held for every key and could be tested without
knowing it, and by using the **operators**, who repeated themselves, chose easy
keys and sent the same text twice.

This chapter takes the great breaks one at a time and does each one in code.
Figure 3.1 lays out the period.

<figure class="mars-fig">
<svg viewBox="0 0 640 460" width="640" role="img" aria-label="Timeline from Scherbius's 1918 rotor patent to the release of Venona in 1995" fill="currentColor" font-size="14">
<line x1="92" y1="10" x2="92" y2="450" stroke="currentColor" stroke-width="1.6"/>
<text x="78" y="29" text-anchor="end" font-weight="bold">1918</text>
<circle cx="92" cy="24" r="3.5"/>
<text x="108" y="29">Scherbius patents a rotor machine (Enigma)</text>
<text x="78" y="59" text-anchor="end" font-weight="bold">1932</text>
<circle cx="92" cy="54" r="3.5"/>
<text x="108" y="59">Rejewski recovers the army Enigma's wiring in Warsaw</text>
<text x="78" y="89" text-anchor="end" font-weight="bold">1938</text>
<circle cx="92" cy="84" r="3.5"/>
<text x="108" y="89">Polish bomba and Zygalski sheets</text>
<text x="78" y="119" text-anchor="end" font-weight="bold">1939</text>
<circle cx="92" cy="114" r="3.5"/>
<text x="108" y="119">Pyry: the Poles hand Enigma to Britain and France</text>
<text x="78" y="149" text-anchor="end" font-weight="bold">1940</text>
<circle cx="92" cy="144" r="3.5"/>
<text x="108" y="149">First Turing-Welchman Bombe; US team breaks Purple</text>
<text x="78" y="179" text-anchor="end" font-weight="bold">1941</text>
<circle cx="92" cy="174" r="3.5"/>
<text x="108" y="179">U-110 captured; Tunny depth of 30 August</text>
<text x="78" y="209" text-anchor="end" font-weight="bold">1942</text>
<circle cx="92" cy="204" r="3.5"/>
<text x="108" y="209">Tutte rebuilds Lorenz on paper; Midway; Shark broken</text>
<text x="78" y="239" text-anchor="end" font-weight="bold">1943</text>
<circle cx="92" cy="234" r="3.5"/>
<text x="108" y="239">Heath Robinson; US Navy bombes; Venona work begins</text>
<text x="78" y="269" text-anchor="end" font-weight="bold">1944</text>
<circle cx="92" cy="264" r="3.5"/>
<text x="108" y="269">Colossus reads Tunny settings before D-Day</text>
<text x="78" y="299" text-anchor="end" font-weight="bold">1946</text>
<circle cx="92" cy="294" r="3.5"/>
<text x="108" y="299">Gardner reads the first Venona fragments</text>
<text x="78" y="329" text-anchor="end" font-weight="bold">1974</text>
<circle cx="92" cy="324" r="3.5"/>
<text x="108" y="329">The Ultra Secret: the Enigma break becomes public</text>
<text x="78" y="359" text-anchor="end" font-weight="bold">1980</text>
<circle cx="92" cy="354" r="3.5"/>
<text x="108" y="359">Venona closes; Rejewski publishes his method</text>
<text x="78" y="389" text-anchor="end" font-weight="bold">1995</text>
<circle cx="92" cy="384" r="3.5"/>
<text x="108" y="389">Venona decrypts released</text>
<text x="78" y="419" text-anchor="end" font-weight="bold">2000</text>
<circle cx="92" cy="414" r="3.5"/>
<text x="108" y="419">General Report on Tunny declassified</text>
</svg>
<figcaption>Figure 3.1. The machine war, 1918 to 2000. Many of the breaks stayed secret for thirty to fifty years, so the history was written late and is still being corrected.</figcaption>
</figure>

One warning before the details. Almost everything in this chapter was secret
for decades. The British break of Enigma became public only in 1973 and 1974
(through Gustave Bertrand's book in French and then Frederick Winterbotham's
*The Ultra Secret*); Rejewski's own account of the mathematics appeared in
1980; the British report on the Lorenz break was declassified in 2000; Venona
was released from 1995. Early books got things wrong, and memoirs written from
memory disagree with each other. Where historians still disagree, about who
knew what and when, or how many machines were built, this chapter says so.

## 3.2 Enigma as a product of permutations

*Level: intermediate.*

A **permutation** of the alphabet is a rule that sends each letter to a letter,
with no two letters sent to the same place: a simple substitution. Two
permutations can be done one after the other; the result is again a
permutation, called their **product**. We write products the way Rejewski did,
from left to right: $XY$ means "first $X$, then $Y$", and $aX$ is the letter
that $X$ sends $a$ to. The inverse $X^{-1}$ undoes $X$. A permutation that is
its own inverse, $XX = 1$, is an **involution**: it swaps letters in pairs and
leaves the rest fixed.

Every permutation splits into **cycles**. Start at a letter, apply the
permutation again and again, and you come back to where you began. The
permutation $a \to c \to e \to a$, $b \to d \to b$, $f \to f$ is written
$(ace)(bd)(f)$. The list of cycle lengths, here 3, 2, 1, is its **cycle
structure**. An involution has only cycles of length 2 and 1.

### One key press as one permutation

Write $S$ for the plugboard (Steckerbrett), $N$, $M$ and $L$ for the right,
middle and left rotors at their present positions, and $R$ for the reflector
(Umkehrwalze). Pressing a key sends current through $S$, then $N$, $M$, $L$,
then $R$, then back through $L$, $M$, $N$ and $S$, the other way. The letter
that lights is therefore given by the product

$$
E = S\,N\,M\,L\;R\;L^{-1} M^{-1} N^{-1} S^{-1} .
$$

A rotor at an offset of $k$ steps is the same wiring with the alphabet turned
under it: if $P$ is the shift $a \to b \to c \to \dots \to z \to a$, the right
rotor at offset $k$ is $P^{k} N P^{-k}$. So every press uses the same fixed
wirings, only conjugated by different powers of $P$. Figure 3.2 shows the path.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Enigma's signal path drawn as a product of permutations: S, N, M, L, the reflector R, then the inverses back to the lamp" fill="currentColor" font-size="14">
<rect x="20" y="40" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="55" y="67" text-anchor="middle">key</text>
<rect x="110" y="40" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="67" text-anchor="middle">S</text>
<rect x="200" y="40" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="235" y="67" text-anchor="middle">N</text>
<rect x="290" y="40" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="325" y="67" text-anchor="middle">M</text>
<rect x="380" y="40" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="415" y="67" text-anchor="middle">L</text>
<rect x="490" y="40" width="70" height="140" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.4"/>
<text x="525" y="115" text-anchor="middle" font-weight="bold">R</text>
<line x1="90" y1="62" x2="110" y2="62" stroke="currentColor" stroke-width="1.4"/>
<line x1="180" y1="62" x2="200" y2="62" stroke="currentColor" stroke-width="1.4"/>
<line x1="270" y1="62" x2="290" y2="62" stroke="currentColor" stroke-width="1.4"/>
<line x1="360" y1="62" x2="380" y2="62" stroke="currentColor" stroke-width="1.4"/>
<line x1="450" y1="62" x2="490" y2="62" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="136" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="55" y="163" text-anchor="middle">lamp</text>
<rect x="110" y="136" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="145" y="163" text-anchor="middle">S⁻¹</text>
<rect x="200" y="136" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="235" y="163" text-anchor="middle">N⁻¹</text>
<rect x="290" y="136" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="325" y="163" text-anchor="middle">M⁻¹</text>
<rect x="380" y="136" width="70" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="415" y="163" text-anchor="middle">L⁻¹</text>
<line x1="90" y1="158" x2="110" y2="158" stroke="currentColor" stroke-width="1.4"/>
<line x1="180" y1="158" x2="200" y2="158" stroke="currentColor" stroke-width="1.4"/>
<line x1="270" y1="158" x2="290" y2="158" stroke="currentColor" stroke-width="1.4"/>
<line x1="360" y1="158" x2="380" y2="158" stroke="currentColor" stroke-width="1.4"/>
<line x1="450" y1="158" x2="490" y2="158" stroke="currentColor" stroke-width="1.4"/>
<text x="270" y="25" text-anchor="middle">T = S N M L (in)</text>
<text x="270" y="210" text-anchor="middle">T⁻¹ (out)</text>
<text x="320" y="240" text-anchor="middle" font-weight="bold">E = T R T⁻¹: a conjugate of the reflector</text>
</svg>
<figcaption>Figure 3.2. One key press as a product of permutations, read left to right. Whatever the settings, the press is the reflector R seen through the change of labels T, so it inherits R's shape: only swaps, and no letter left in place.</figcaption>
</figure>

### Two facts that hold for every key

Put $T = S N M L$. Then $E = T R T^{-1}$: the press is the reflector,
**conjugated** by $T$. Two facts follow at once, whatever the key.

**$E$ is an involution.** $EE = T R T^{-1} T R T^{-1} = T R R T^{-1} = 1$,
because the reflector swaps letters in pairs, $RR = 1$. So the same setting
that encrypts also decrypts. That was the point: one machine, no separate
decrypt mode.

**$E$ has no fixed letter.** Suppose $aE = a$. Then $a T R T^{-1} = a$, so
$(aT) R = aT$: the reflector would fix the letter $aT$. The reflector was wired
as 13 swaps with no letter left alone, so this cannot happen. **No letter ever
encrypts to itself.**

Both facts are bought with the same piece of wire, and the second one cost
Germany dearly (§3.4 and §3.5). It is worth seeing how small the loss looks at
first: the machine can produce only fixed-point-free involutions, of which
there are $25 \times 23 \times 21 \times \dots \times 1 = 7{,}905{,}853{,}580{,}625$,
about $2^{43}$, at each position. That is a vast number. The damage is not in
how many permutations remain but in a rule that every ciphertext obeys and
anyone can test.

### Code it: a 3-rotor Enigma

Here is an Enigma I with five rotors to choose from, reflector B, ring
settings and a plugboard. Book 1 builds a smaller one; this version keeps the
rotor positions in an object, so later code can read the permutation at any
position. Letters are numbers 0 to 25 inside the machine.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
ROTORS = {"I": ("EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q"),   # wiring, and the letter showing when it turns the next
          "II": ("AJDKSIRUXBLHWTMCQGZNPYFVOE", "E"),
          "III": ("BDFHJLCPRTXVZNYEIWGAKMUSQO", "V"),
          "IV": ("ESOVPZJAYQUIRHXLNFTGKDCMWB", "J"),
          "V": ("VZBRGITYUPSDNHLXAWMJQOFECK", "Z")}
REFLECTOR = "YRUHQSLDPXNGOKMIEBFZCWVJAT"                 # reflector B

class Enigma:
    def __init__(self, order, rings, start, plugs=""):
        self.wire = [[A.index(c) for c in ROTORS[r][0]] for r in order]
        self.back = [[w.index(i) for i in range(26)] for w in self.wire]
        self.notch = [A.index(ROTORS[r][1]) for r in order]
        self.ring = [A.index(c) for c in rings]
        self.pos = [A.index(c) for c in start]
        self.plug = list(range(26))
        for a, b in plugs.split():
            self.plug[A.index(a)], self.plug[A.index(b)] = A.index(b), A.index(a)

    def step(self):
        p, n = self.pos, self.notch
        if p[1] == n[1]:                          # middle rotor at its notch: it and the left one turn
            p[0], p[1] = (p[0] + 1) % 26, (p[1] + 1) % 26
        elif p[2] == n[2]:                        # right rotor at its notch: the middle one turns
            p[1] = (p[1] + 1) % 26
        p[2] = (p[2] + 1) % 26

    def through(self, x, table, i):               # one rotor, allowing for position and ring
        s = self.pos[i] - self.ring[i]
        return (table[(x + s) % 26] - s) % 26

    def scramble(self, x):                        # one letter, 0..25, at the present position
        x = self.plug[x]
        for i in (2, 1, 0):
            x = self.through(x, self.wire[i], i)
        x = A.index(REFLECTOR[x])
        for i in (0, 1, 2):
            x = self.through(x, self.back[i], i)
        return self.plug[x]

    def press(self, x):                           # the rotors turn before the current flows
        self.step()
        return self.scramble(x)

    def crypt(self, text):
        return "".join(A[self.press(A.index(c))] for c in text)

print(Enigma(("I", "II", "III"), "AAA", "AAA").crypt("AAAAA"))     # the standard test: BDZGO

key = (("II", "IV", "I"), "CMR", "QFX", "BZ DK EM GR JT LV NS OW PY QX")
msg = "KEINEBESONDERENEREIGNISSE"
c = Enigma(*key).crypt(msg)
print(c)
print(Enigma(*key).crypt(c))
```

It prints

```
BDZGO
MSOYFQUTEPSDCZINZWGWYYJQF
KEINEBESONDERENEREIGNISSE
```

The first line is the standard test for rotors I, II, III at AAA with rings at
A. (With rings at BBB the same test gives EWTYX, the other published check
value, which this model also produces.) The plaintext, *keine besonderen
Ereignisse*, "nothing special to report", was one of the commonest messages of
the war, which is exactly why it matters in §3.4. Encrypting the ciphertext
again at the same settings returns the plaintext: $E$ is an involution. Look
along the second and third lines: no letter stands over itself.

The `step` method also reproduces Enigma's **double step**: from ADU the
rotors go to ADV, AEW, BFX, so the middle rotor moves twice in a row.

The daily key set the rotor order, the ring settings and the plugboard pairs;
each operator then chose a **message key**, the three letters at which the
rotors started for his message, and sent it encrypted at the start. How he
sent it is the whole story of the Polish break.

## 3.3 Rejewski's theorem and the Polish break

*Level: intermediate.*

In 1928 Polish monitoring stations began to pick up German army messages that
no longer looked like any hand cipher. Poland had won its 1920 war with Soviet
Russia partly because its codebreakers read the Red Army's radio traffic, and
it took codebreaking seriously. The Polish Cipher Bureau (Biuro Szyfrów) tried
linguists on the new traffic and got nowhere. In 1929 it ran a cryptology course for mathematics students at the University of
Poznań, a city that had been German until 1919, so many students spoke German.
Three of them joined the Bureau: Marian Rejewski, Jerzy Różycki and Henryk
Zygalski. Rejewski was given the army Enigma in the autumn of 1932.

### The doubled message key

Until September 1938 the procedure was this. The daily key sheet gave the rotor
order, the rings, the plugs and a **ground setting** (Grundstellung) shared by
every operator that day. Each operator chose a three-letter message key, say
`WTF`, set the rotors to the ground setting, and typed it twice, `WTFWTF`. The
six letters that came out were sent at the start of the message. He then set
the rotors to `WTF` and encrypted the text. Typing the key twice was meant to
catch radio errors.

Write $A, B, C, D, E, F$ for the machine's permutations at positions 1 to 6 of
the ground setting. If the key is $k_1 k_2 k_3$ and the six letters sent are
$c_1 \dots c_6$, then $c_1 = k_1 A$ and $c_4 = k_1 D$. Since $A$ is an
involution, $k_1 = c_1 A$, and so

$$
c_4 = c_1 A D .
$$

The attacker does not know $A$ or $D$, but every intercepted message gives one
letter of their **product** $AD$: the first letter of the indicator goes to the
fourth. Likewise $c_5 = c_2 BE$ and $c_6 = c_3 CF$. With enough messages from
one day, all three products are known completely, from ciphertext alone.

### The theorem

Rejewski's question was what $AD$ says about the key. Write $A = S\,\bar A\,S$,
where $\bar A$ is the plugless part (rotors and reflector at position 1), and
the same for $D$; the plugboard $S$ is an involution, so $S^{-1} = S$. Then

$$
AD = S \bar A S \, S \bar D S = S\,(\bar A \bar D)\,S .
$$

The product $AD$ is the plugless product $\bar A \bar D$ **conjugated** by $S$.
Conjugation only renames letters. If $\bar A \bar D$ has a cycle
$(x_1 x_2 \dots x_k)$, then

$$
(x_i S)\,(S \,\bar A \bar D\, S) = x_i \bar A \bar D S = x_{i+1} S ,
$$

so $AD$ has the cycle $(x_1 S \;\, x_2 S \dots x_k S)$, of the same length.

> **Theorem (Rejewski).** The cycle structure of $AD$, $BE$ and $CF$ does not
> depend on the plugboard. It depends only on the rotor order and the rotor
> positions.

The plugboard, which supplied almost all of Enigma's key space (about $2^{47}$
of the $2^{67}$), disappears from the problem. What is left is $6 \times
17{,}576 = 105{,}456$ rotor orders and positions in the three-rotor army
machine of the early 1930s. Rejewski called the three cycle structures the
**characteristic** of the day.

### By hand on six letters

Take an alphabet of six letters and two fixed-point-free involutions:

$$
A = (ab)(cd)(ef), \qquad D = (ac)(be)(df).
$$

Follow $a$: $A$ sends it to $b$, then $D$ sends $b$ to $e$; so $a \to e$. Then
$e \to f \to d$, and $d \to c \to a$, back to the start. That is the cycle
$(aed)$. From $b$: $b \to a \to c$, $c \to d \to f$, $f \to e \to b$, the cycle
$(bcf)$. So $AD = (aed)(bcf)$, two cycles of length 3.

Now put in a plugboard that swaps $a$ and $b$, $S = (ab)$. The new
permutations are $SAS = (ab)(cd)(ef)$ (unchanged, since it already swapped $a$
and $b$) and $SDS = (bc)(ae)(df)$. Their product is $(acf)(bed)$: the old
cycles with $a$ and $b$ swapped, and still two cycles of length 3. Figure 3.3
draws it.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The product AD drawn as two 3-cycles, aed and bcf, and the same product after a plugboard swapping a and b: acf and bed, the same shape with two labels exchanged" fill="currentColor" font-size="14">
<text x="160" y="24" text-anchor="middle" font-weight="bold">AD without plugs</text>
<text x="480" y="24" text-anchor="middle" font-weight="bold">AD with S = (ab)</text>
<circle cx="90" cy="90" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="90" y="95" text-anchor="middle">a</text>
<circle cx="150" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="150" y="195" text-anchor="middle">e</text>
<circle cx="30" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="30" y="195" text-anchor="middle">d</text>
<line x1="98" y1="104" x2="142" y2="176" stroke="currentColor" stroke-width="1.4"/>
<line x1="134" y1="190" x2="46" y2="190" stroke="currentColor" stroke-width="1.4"/>
<line x1="38" y1="176" x2="82" y2="104" stroke="currentColor" stroke-width="1.4"/>
<circle cx="230" cy="90" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="230" y="95" text-anchor="middle">b</text>
<circle cx="290" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="290" y="195" text-anchor="middle">c</text>
<circle cx="170" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="170" y="195" text-anchor="middle">f</text>
<line x1="238" y1="104" x2="282" y2="176" stroke="currentColor" stroke-width="1.4"/>
<line x1="274" y1="190" x2="186" y2="190" stroke="currentColor" stroke-width="1.4"/>
<line x1="178" y1="176" x2="222" y2="104" stroke="currentColor" stroke-width="1.4"/>
<circle cx="410" cy="90" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="410" y="95" text-anchor="middle" font-weight="bold">b</text>
<circle cx="470" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="470" y="195" text-anchor="middle">e</text>
<circle cx="350" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="350" y="195" text-anchor="middle">d</text>
<line x1="418" y1="104" x2="462" y2="176" stroke="currentColor" stroke-width="1.4"/>
<line x1="454" y1="190" x2="366" y2="190" stroke="currentColor" stroke-width="1.4"/>
<line x1="358" y1="176" x2="402" y2="104" stroke="currentColor" stroke-width="1.4"/>
<circle cx="550" cy="90" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="550" y="95" text-anchor="middle" font-weight="bold">a</text>
<circle cx="610" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="610" y="195" text-anchor="middle">c</text>
<circle cx="490" cy="190" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="490" y="195" text-anchor="middle">f</text>
<line x1="558" y1="104" x2="602" y2="176" stroke="currentColor" stroke-width="1.4"/>
<line x1="594" y1="190" x2="506" y2="190" stroke="currentColor" stroke-width="1.4"/>
<line x1="498" y1="176" x2="542" y2="104" stroke="currentColor" stroke-width="1.4"/>
<line x1="320" y1="40" x2="320" y2="220" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/>
<text x="320" y="250" text-anchor="middle">cycle lengths 3, 3 on both sides: the plugboard only relabels</text>
</svg>
<figcaption>Figure 3.3. Rejewski's theorem on six letters. Each cycle is read clockwise from the top. The plugboard swaps the labels a and b (bold), but the shape, two cycles of three, is the same, so the shape can be looked up in a catalog without knowing the plugs.</figcaption>
</figure>

The code checks the example, and then checks the theorem on the full machine
of §3.2. It simulates one day of traffic: operators pick random message keys,
type them twice at the day's ground setting, and the attacker collects only
the six-letter indicators.

```python
def cycles(perm):                          # perm is a dict; returns its cycles, longest first
    seen, out = set(), []
    for start in sorted(perm):
        if start not in seen:
            cyc, x = [], start
            while x not in seen:
                seen.add(x)
                cyc.append(x)
                x = perm[x]
            out.append("".join(cyc))
    return sorted(out, key=len, reverse=True)

def then(p, q):                            # first p, then q
    return {x: q[p[x]] for x in p}

PA = {"a": "b", "b": "a", "c": "d", "d": "c", "e": "f", "f": "e"}
PD = {"a": "c", "c": "a", "b": "e", "e": "b", "d": "f", "f": "d"}
print("AD      ", cycles(then(PA, PD)))

S = {"a": "b", "b": "a", "c": "c", "d": "d", "e": "e", "f": "f"}    # a plugboard that swaps a and b
PA2 = then(then(S, PA), S)
PD2 = then(then(S, PD), S)
print("with S  ", cycles(then(PA2, PD2)))
```

```
AD       ['aed', 'bcf']
with S   ['acf', 'bed']
```

Now the real machine, using the `Enigma` class from §3.2:

```python
import random
random.seed(1932)

day = (("III", "I", "II"), "KTL", "WXK", "AP BL CK DF EI GJ HO MQ NU RS")   # order, rings, ground, plugs

def characteristic(order, rings, ground, plugs, show=False):
    e = Enigma(order, rings, ground, plugs)
    pairs = [{}, {}, {}]                       # first letter -> fourth, second -> fifth, third -> sixth
    count = 0
    while min(len(p) for p in pairs) < 26:
        k = "".join(random.choice(A) for _ in range(3))      # an operator's message key
        e.pos = [A.index(c) for c in ground]
        c = e.crypt(k + k)                                   # sent twice at the ground setting
        for i in range(3):
            pairs[i][c[i]] = c[i + 3]
        count += 1
    if show:
        print("indicators needed:", count)
        for p in pairs:
            print(" ".join(cycles(p)))
    return [sorted((len(x) for x in cycles(p)), reverse=True) for p in pairs]

print(characteristic(*day, show=True))
print(characteristic(*day[:3], ""))             # the same day without any plugs
```

```
indicators needed: 140
ADJWESCHB IZYLRTMVU FN GQ KO PX
AHXVMKTCGJOZD BNYSPLQFREWUI
AROLEDNSU BPKQGXHZW CV IM F J T Y
[[9, 9, 2, 2, 2, 2], [13, 13], [9, 9, 2, 2, 1, 1, 1, 1]]
[[9, 9, 2, 2, 2, 2], [13, 13], [9, 9, 2, 2, 1, 1, 1, 1]]
```

The three lines of letters are $AD$, $BE$ and $CF$ as the attacker sees them.
With the plugs removed, a second day of random keys gives different letters but
the same lengths: 9, 9, 2, 2, 2, 2 and 13, 13 and 9, 9, 2, 2, 1, 1, 1, 1.
Notice that every length comes **in pairs**. That is a second theorem, also
Rejewski's: the product of two fixed-point-free involutions always has its
cycles in pairs of equal length (§3.13). It is a free check on the data, and it
is what lets you go back from $AD$ to $A$ and $D$ themselves.

Here 140 random keys were needed before every letter had appeared. Real
operators did not choose random keys. They typed `AAA`, `ABC`, their
girlfriend's initials, or three letters in a row along the keyboard, and
Rejewski used those habits to choose among the possible $A$ and $D$ that fit
$AD$.

### From the theorem to the wiring and the daily keys

Rejewski first used the products to **recover the wiring** of the rotors,
which no one in Poland had seen. Here he had help. French intelligence, through
Captain Gustave Bertrand, had bought documents from Hans-Thilo Schmidt, a
German cipher office employee code-named Asché, including the daily keys for
September and October 1932. Bertrand passed them to the Poles in December
1932. With the plugboard known for those days, Rejewski could strip it off and
write equations in which the only unknowns were the right rotor's wiring and
the fixed combination of the other two with the reflector. One last unknown
held him up: the wiring of the entry wheel between the keyboard and the
rotors. He tried the keyboard's own order, QWERTZU..., without success, then
guessed that the Germans had simply wired A to A, B to B, and so on. They had.
By the end of December 1932 Rejewski had the wiring, and early in 1933 the
first Polish Enigma doubles were built. (How much the
Schmidt documents mattered has been argued over since; Rejewski himself said
they were decisive for the wiring, and that the daily-key methods that followed
used only mathematics and intercepts.)

For daily keys the theorem gave the **catalog**. Rejewski's **cyclometer**,
two linked sets of rotors with lamps, showed the cycle lengths of $AD$ at a
given setting directly; filing all 105,456 settings by characteristic took
about a year. Each day the team measured the characteristic, looked it up,
and got the rotor order and position among a handful of candidates; the plugs
followed from the cycles. When Germany changed the
reflector in November 1937, the catalog had to be rebuilt.

### September 1938 and the bomba

On 15 September 1938 the procedure changed. The operator now chose his own
ground setting for each message, sent it in clear, and encrypted the doubled
message key at that setting. The day no longer had one $AD$, and the catalog
was dead. The Poles answered within weeks with two methods built on the
**females** (samiczki): indicators in which the same letter appears in places 1
and 4, 2 and 5, or 3 and 6. A female means that $AD$ (or $BE$, $CF$) has a
fixed point at that rotor position, and whether a position allows fixed points
is again a property of the rotors, not the plugs.

**Zygalski sheets** were perforated cards, one for each rotor order and
left-rotor position, a 26-by-26 grid with a hole wherever a female was
possible. Stacking a day's sheets, shifted by the clear ground settings, let
light through only at settings consistent with every female. The **bomba**
(plural *bomby*), designed by Rejewski in October 1938, joined six Enigma
doubles in pairs and ran through all 17,576 positions in about two hours,
stopping where the female letters appeared. Six were built, one for each rotor
order. The bomba assumed the female letter was not plugged, which was true
often enough with five to eight plug pairs.

Then the arithmetic turned against Poland. On 15 December 1938 the army
introduced rotors IV and V: three from five gave 60 orders instead of 6, which
needed ten times the sheets and sixty bomby. From January 1939 seven to ten
plug pairs were used, so the bomba's assumption failed more often. The Bureau
did not have the money or the staff.

With war close, the Poles gave everything away. At Pyry, in the Kabaty forest
south of Warsaw, on 26 July 1939 (some accounts give 25 July), they showed
British and French codebreakers their methods, their bomba and their Enigma
doubles, and promised each country a double. Alastair Denniston and Dilly Knox
came from Britain, Bertrand from France. Five weeks later Germany invaded.
Rejewski, Różycki and Zygalski escaped to France and worked with Bertrand
(§3.11). Różycki died in January 1942 when the ship *Lamoricière* sank in the
Mediterranean; Rejewski and Zygalski reached Britain in 1943 but were kept away
from Bletchley Park.

!!! note "Life story: the Polish Enigma break"
    **Born:** autumn 1932, Marian Rejewski at the Polish Cipher Bureau in
    Warsaw, with Jerzy Różycki and Henryk Zygalski · **Purpose:** read the
    German army's machine traffic using the permutation theory of the doubled
    message key · **Helped:** the Poles read army Enigma for most of 1933 to
    1939, with the cyclometer catalog, the clock method, Zygalski sheets and
    the bomba; the Pyry meeting of July 1939 gave Britain and France the
    methods and a working double · **Status:** finished when Germany stopped
    doubling message keys (from May 1940); the mathematics was published by
    Rejewski in 1980, and Poland honors the three as the first to break
    Enigma

## 3.4 Cribs, menus and the Turing-Welchman Bombe

*Level: intermediate.*

Britain's Government Code and Cypher School moved to Bletchley Park, a country
house fifty miles north of London, in August 1939. Its head, Alastair
Denniston, had recruited mathematicians as well as linguists, among them Alan
Turing, Gordon Welchman and John Jeffreys. Jeffreys's section punched the full
sets of Zygalski sheets that the Poles could not, and with them the first
wartime Enigma keys were broken in January 1940, by the Polish team in France
and by Bletchley within days of each other (accounts differ on who was first).

Turing saw early that the doubled indicator would not last, and on 1 May 1940
the Germans did stop doubling the message key. The road in became the
**crib**: plaintext the attacker expects. Weather reports began with WETTER,
units reported KEINE BESONDEREN EREIGNISSE, and messages were addressed and
signed the same way every day.

### Dragging the crib

First the crib has to be placed. Because no letter encrypts to itself, the
crib cannot sit anywhere one of its letters falls on the same ciphertext
letter. Slide it along the ciphertext and strike out every such place. This is
**crib dragging**, and it costs nothing but a pencil. Here is a 52-letter
weather message, encrypted on the §3.2 model with a key the attacker does not
know, with the crib WETTERVORHERSAGE (weather forecast):

```python
secret = (("II", "V", "III"), "AAA", "LEK", "AR BY CT DK EJ FW GU HO IS LQ")
plain = "ANXOBERKOMMANDOXWETTERVORHERSAGEBISKAYAXSTURMAUSWEST"
cipher = Enigma(*secret).crypt(plain)
print(cipher)

crib = "WETTERVORHERSAGE"
fits = [i for i in range(len(cipher) - len(crib) + 1)
        if all(c != p for c, p in zip(cipher[i:], crib))]
print(len(fits), "of", len(cipher) - len(crib) + 1, "places survive:", fits)
```

```
BEIRXKQYGWUUSOJQJWPMIVBGQEULYUBUKJKGHWPSVIYOZECIYNXC
24 of 37 places survive: [1, 2, 3, 4, 5, 7, 8, 11, 12, 13, 14, 16, 18, 19, 20, 22, 23, 25, 26, 28, 29, 31, 32, 33]
```

The true place, 16, survives, as it must; 13 of the 37 are ruled out. A wrong
place survives with probability $(25/26)^{16} \approx 0.53$, so dragging
narrows the search without ending it. In practice a crib clerk chose the place
from what he knew of the traffic, and the bombe tested it.

### The menu

Put the crib at its place. At crib position $j$ the machine's permutation is
$E_j = S\,\bar E_j\,S$, where $\bar E_j$ is the plugless scrambler at that
position. If plaintext $p$ sits over ciphertext $c$ there, then $p E_j = c$,
that is,

$$
(pS)\,\bar E_j = cS .
$$

The plugboard is still unknown, but the equation links the plugboard partners
of two letters through a scrambler whose setting depends only on the rotors.
Draw a graph: one node per letter, and an edge labeled $j$ between $p$ and $c$
for each crib position. This graph is the **menu**. Here it is for our crib,
as the next block prints it:

```
menu: 0:WJ 1:EW 2:TP 3:TM 4:EI 5:RV 6:VB 7:OG 8:RQ 9:HE 10:EU 11:RL 12:SY 13:AU 14:GB 15:EU
```

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The menu of the crib WETTERVORHERSAGE: E is joined to W, I, H and twice to U; W to J; U to A. A second piece joins R to V, Q and L, V to B, B to G and G to O" fill="currentColor" font-size="14">
<text x="170" y="24" text-anchor="middle" font-weight="bold">the part the bombe tests</text>
<circle cx="170" cy="150" r="18" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.6"/><text x="170" y="155" text-anchor="middle" font-weight="bold">E</text>
<circle cx="70" cy="80" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="70" y="85" text-anchor="middle">W</text>
<circle cx="30" cy="160" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="30" y="165" text-anchor="middle">J</text>
<circle cx="170" cy="60" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="170" y="65" text-anchor="middle">I</text>
<circle cx="80" cy="240" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="80" y="245" text-anchor="middle">H</text>
<circle cx="270" cy="150" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="270" y="155" text-anchor="middle">U</text>
<circle cx="270" cy="250" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="270" y="255" text-anchor="middle">A</text>
<line x1="157" y1="137" x2="81" y2="92" stroke="currentColor" stroke-width="1.4"/><text x="108" y="104">1</text>
<line x1="57" y1="91" x2="38" y2="146" stroke="currentColor" stroke-width="1.4"/><text x="36" y="115">0</text>
<line x1="170" y1="132" x2="170" y2="76" stroke="currentColor" stroke-width="1.4"/><text x="176" y="106">4</text>
<line x1="157" y1="163" x2="92" y2="229" stroke="currentColor" stroke-width="1.4"/><text x="110" y="208">9</text>
<path d="M 186 141 Q 220 120 255 142" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="216" y="122">10</text>
<path d="M 186 159 Q 220 180 255 158" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="216" y="190">15</text>
<line x1="270" y1="166" x2="270" y2="234" stroke="currentColor" stroke-width="1.4"/><text x="278" y="205">13</text>
<text x="490" y="24" text-anchor="middle" font-weight="bold">the rest of the menu</text>
<circle cx="420" cy="150" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="420" y="155" text-anchor="middle">R</text>
<circle cx="360" cy="80" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="360" y="85" text-anchor="middle">Q</text>
<circle cx="360" cy="220" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="360" y="225" text-anchor="middle">L</text>
<circle cx="500" cy="150" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="500" y="155" text-anchor="middle">V</text>
<circle cx="580" cy="150" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="580" y="155" text-anchor="middle">B</text>
<circle cx="580" cy="230" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="580" y="235" text-anchor="middle">G</text>
<circle cx="500" cy="230" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="500" y="235" text-anchor="middle">O</text>
<line x1="409" y1="138" x2="371" y2="92" stroke="currentColor" stroke-width="1.4"/><text x="395" y="106">8</text>
<line x1="409" y1="162" x2="371" y2="208" stroke="currentColor" stroke-width="1.4"/><text x="395" y="200">11</text>
<line x1="436" y1="150" x2="484" y2="150" stroke="currentColor" stroke-width="1.4"/><text x="460" y="143" text-anchor="middle">5</text>
<line x1="516" y1="150" x2="564" y2="150" stroke="currentColor" stroke-width="1.4"/><text x="540" y="143" text-anchor="middle">6</text>
<line x1="580" y1="166" x2="580" y2="214" stroke="currentColor" stroke-width="1.4"/><text x="590" y="195">14</text>
<line x1="564" y1="230" x2="516" y2="230" stroke="currentColor" stroke-width="1.4"/><text x="540" y="250" text-anchor="middle">7</text>
<text x="320" y="290" text-anchor="middle">(plus T–P at 2, T–M at 3, S–Y at 12)</text>
</svg>
<figcaption>Figure 3.4. The menu of WETTERVORHERSAGE at place 16. Each edge is one crib letter over its ciphertext letter, labeled with its position. E and U are joined twice, at 10 and 15: a closed loop, which is what lets a wrong guess contradict itself.</figcaption>
</figure>

### Turing's idea: follow a guess until it breaks

Pick a letter on the menu, here E, and **guess** its plugboard partner, say
$ES = x$. At a trial rotor position the scramblers are known, so the edge at
position 1 gives $WS = x\,\bar E_1$; the edge at 0 then gives $JS$; and so on
around the menu. Each guess forces the partners of every letter it can reach.
If the forced values ever contradict each other, the guess is wrong; if every
guess for E is wrong, the rotor position is wrong. Where the guesses do not
contradict themselves, the machine **stops**, and a person tests the stop by
hand on a real Enigma.

The trick that made it fast is in the loop. At the right position with the
right guess, going around a loop E, U, E brings you back to the value you
started with. At a wrong position, the loop sends you somewhere else, and that
is a contradiction. Each closed loop cuts the number of false stops by a
factor of about 26, so Turing's bombe wanted menus with three or more loops.

### Welchman's diagonal board

Gordon Welchman added one observation, in late 1939. The plugboard is a set of
**swaps**: if $ES = x$ then also $xS = E$. A guess about E's partner is also a
guess about $x$'s partner, and implications that reach letter $x$ on the menu
can contradict it. Wired into the machine, this cross-connection, called the
**diagonal board** because it linked wire $j$ of cable $i$ to wire $i$ of cable
$j$, multiplied the implications from each guess. Menus with one loop, or none,
became usable.

The code below is a small bombe. It knows the rotor order (a real bombe ran
each order in turn), assumes rings at A and no middle-rotor turnover inside the
crib (as the real bombe did), and for each of the 17,576 positions tests all 26
guesses for E's partner, with the diagonal board as one extra line.

```python
at = 16                                           # the crib's place, from the dragging above
pairs = list(zip(crib, cipher[at:at + len(crib)]))
print("menu:", " ".join(f"{j}:{p}{c}" for j, (p, c) in enumerate(pairs)))

order = secret[0]                                 # a real bombe tried every wheel order in turn
table = {}                                        # the plugless scrambler at every rotor position
for n in range(26 ** 3):
    e = Enigma(order, "AAA", "AAA")
    e.pos = [n // 676, n // 26 % 26, n % 26]
    table[n] = [e.scramble(x) for x in range(26)]

def test(n, t, guess):                            # follow one stecker guess S(t) = guess around the menu
    S = {t: guess, guess: t}
    todo = [t]
    while todo:
        x = todo.pop()
        for j, (p, c) in enumerate(pairs):
            if x in (A.index(p), A.index(c)):
                other = A.index(c) if x == A.index(p) else A.index(p)
                pos = n - n % 26 + (n % 26 + j + 1) % 26     # the right rotor steps, no turnover
                y = table[pos][S[x]]                          # S(other) = E_j(S(x))
                for a, b in ((other, y), (y, other)):         # the diagonal board: S is a swap
                    if S.get(a, b) != b:
                        return None
                    if a not in S:
                        S[a] = b
                        todo.append(a)
    return S

t = A.index("E")                                  # the letter with the most links in the menu
stops = []
for n in range(26 ** 3):
    for guess in range(26):
        S = test(n, t, guess)
        if S:
            stops.append((n, S))
print(len(stops), "stops")
for n, S in stops:
    pos = A[n // 676] + A[n // 26 % 26] + A[n % 26]
    print(pos, " ".join(sorted(A[a] + A[b] for a, b in S.items() if a < b)))
```

```
menu: 0:WJ 1:EW 2:TP 3:TM 4:EI 5:RV 6:VB 7:OG 8:RQ 9:HE 10:EU 11:RL 12:SY 13:AU 14:GB 15:EU
4 stops
CVL AC BE DP FI HT KU MZ WX
LFA AR BY EJ FW GU HO IS LQ
OPK AK CU DI EN FW HZ JS XY
SYN DW EY FH IX JN UZ
```

Of 456,976 position-and-guess pairs, four survive. The second is right. LFA is
where the rotors stood just before the crib (the message started at LEK, and
the middle rotor turned once on the way), and the eight pairs it reports, AR,
BY, EJ, FW, GU, HO, IS and LQ, are eight of the ten real plugs. The other two,
CT and DK, touch no letter the menu reached; they come out when the message is
decrypted and a few letters look wrong. The three false stops each contain a
contradiction a person finds in a minute with a real machine.

Delete the diagonal board (the `(y, other)` half of the loop and the second
entry of the starting dictionary) and run it again: the count goes from 4 to
17,962 stops. This menu has only one loop, and without Welchman's board one
loop barely filters at all. That is the board's value in one number.

### The machines

The first British Bombe, built by the British Tabulating Machine Company at
Letchworth under Harold "Doc" Keen, was installed at Bletchley on 18 March
1940 and named *Victory*; it had no diagonal board and found little. *Agnus
Dei*, with the board, followed in August 1940. Each machine carried 36 Enigma
equivalents and was run by members of the Women's Royal Naval Service, at
Bletchley and at outstations. By the end of the war there were about 210
British Bombes; the exact count depends on how the various models are counted,
and sources give figures from about 200 to 211.

In the United States, Joseph Desch at the National Cash Register Company in
Dayton, Ohio, designed a faster four-rotor bombe for the US Navy. It ran from
mid-1943, and about 120 were built (121 is the figure most often given); the
US Army had Bell Laboratories build a different, relay-based design. These
totals vary between sources, depending on how prototypes and late deliveries
are counted.

!!! note "Life story: the Turing-Welchman Bombe"
    **Born:** designed by Alan Turing in late 1939, with Gordon Welchman's
    diagonal board added in 1940; built by the British Tabulating Machine
    Company (first machine 18 March 1940) · **Purpose:** find Enigma rotor
    orders, positions and part of the plugboard from a crib, by following
    plugboard guesses around the menu until they contradict · **Helped:**
    most of the Enigma keys read by Britain and the United States from 1940
    to 1945; at its height Bletchley read thousands of messages a day ·
    **Status:** retired in 1945; most machines were destroyed after the war;
    a working rebuild, finished in 2006, runs at Bletchley Park

## 3.5 Why "no letter to itself" was fatal, and how the operators helped

*Level: beginner.*

It is tempting to say Enigma lost because its key space was too small. It did
not: $2^{67}$ keys was beyond any machine of the time. It lost because the
attack never had to search the key space. Two properties of the design
reduced the search to the rotor positions alone, and both came from the
reflector.

**It let the attacker place a crib.** A good cipher gives no hint where a crib
sits. Enigma ruled out about a third of the places for a 10-letter crib, and
more for longer ones. In longer messages it also told clerks which of their
guesses were impossible, cheaply and without any machine.

**It made every press an involution.** Because $E_j$ is its own inverse, the
equation $(pS)\bar E_j = cS$ holds in both directions, so a menu edge can be
followed either way. A machine without the reflector could still be attacked
from cribs, but the menus would be directed graphs, with fewer loops and fewer
implications.

**And the plugboard was a set of swaps.** That is what the diagonal board
exploited. A plugboard that was an arbitrary permutation would have given the
bombe less to go on. (The German air force's later *Uhr* attachment, which made
the plugboard not a set of swaps, came into use only in 1944, and only on some
networks.)

None of these were secret weaknesses. They were visible in the wiring. Of all
the lessons of the war, this is the one modern cryptography adopted most
completely: a cipher should be indistinguishable from a random permutation, so
that **no** rule like "no letter to itself" holds for its ciphertexts.

### The operators

The machine's weaknesses explain how a crib could be used. The operators
explain why there were cribs to use, and many other gifts.

- **Routine texts.** Weather reports, "nothing to report", daily situation
  reports and stereotyped addresses gave Bletchley its cribs. Some stations
  sent the same text every day at the same time.
- **Lazy message keys.** Operators chose keys like `AAA` or the letters on
  the rotor windows where the last message had ended. Bletchley called such
  keys **cillies**; the name is usually traced to one operator's `CIL`,
  though some say it is just "silly".
- **The Herivel tip.** In February 1940 John Herivel, a young mathematician
  in Welchman's hut, guessed that a tired operator setting the rings in the
  morning would leave the rotors near the ring setting when he sent his first
  message. The tip worked from May 1940 and gave the ring settings of the
  air force key called Red for weeks during the battle of France.
- **Re-encipherments.** A message sent in a low-grade cipher that Bletchley
  could read was often re-sent in Enigma on another network: a crib of the
  whole message. Bletchley called these **kisses**.
- **Gardening.** The RAF laid mines at chosen places so that the German navy
  would report them, with a known place name.

A well-known story shows how far one habit could go. Mavis Lever, working
for
Dilly Knox, noticed an Italian naval Enigma message with no letter L in it at
all. Since Enigma never encrypts a letter to itself, a long message with no L
is unlikely unless the plaintext was all L: an operator had sent a test
message by pressing one key. That gave a crib of the whole message. Knox's
section went on to read Italian naval traffic before the battle of Cape
Matapan in March 1941.

### The naval Enigma and the pinches

The German navy was the hardest target: stricter procedures, message keys
encrypted again with bigram tables, and eight rotors to choose from. Bletchley read it only after material was
captured, in what were called **pinches**: the weather ship *München* on 7 May
1941, the U-boat *U-110* on 9 May 1941, the weather ship *Lauenburg* in June.
Turing devised **Banburismus**, a statistical method that compared pairs of
messages to find the right-hand rotors and saved bombe time (§3.13).

On 1 February 1942 the U-boats switched to a four-rotor machine, the M4, on a
network Bletchley called **Shark**. For ten months Bletchley could read almost
none of it, and Allied shipping losses rose. On 30 October 1942 the destroyer
*Petard* forced *U-559* to the surface in the eastern Mediterranean;
Lieutenant Anthony Fasson and Able Seaman Colin Grazier swam to the sinking
boat and passed out its short weather cipher book, with the help of a canteen
assistant, Tommy Brown. Fasson and Grazier drowned. The book gave cribs for the fourth
rotor, and on 13 December 1942 Shark was read again.

!!! note "Life story: the M4 blackout"
    **Born:** 1 February 1942, when the U-boat command switched to the
    four-rotor Enigma (the Shark network) · **Purpose (German):** add a fourth
    rotor, with its own thin reflector, to multiply the work of the bombes by
    26 · **Helped:** Germany's U-boats, which sank far more Allied shipping in
    1942 while Shark could not be read · **Status:** ended 13 December 1942,
    after the short weather cipher captured from *U-559*; from mid-1943 the
    American four-rotor bombes carried the load

## 3.6 Lorenz and Tutte's reconstruction

*Level: beginner.*

Enigma carried the traffic of units in the field. For messages between Hitler's
high command and the army groups, Germany used teleprinters linked by radio,
and a machine that encrypted them automatically: the Lorenz
**Schlüsselzusatz** ("cipher attachment") SZ40, later SZ42. Bletchley called
the machine **Tunny** and the traffic **Fish**, and named each radio link after
a fish: Jellyfish, Bream, Codfish. A second German teleprinter cipher, the
Siemens T52, was called Sturgeon.

A teleprinter sends each character as five bits, called **impulses**, in the
international teleprinter code (ITA2). Bletchley wrote a 0 as a dot and a 1 as
a cross. The Lorenz machine added a key character to each plaintext character,
bit by bit, with XOR: the cipher of book 1's
[Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) and of
[Chapter 8](08-Attacks-on-Stream-Ciphers.md) of this book, a stream cipher
built from wheels. Twelve wheels made the key, each with a pattern of cams set
up or down around its rim:

- five **chi** wheels, one per impulse, with 41, 31, 29, 26 and 23 cams, which
  stepped once for every character;
- five **psi** wheels, with 43, 47, 51, 53 and 59 cams, which stepped together,
  but only when the motor allowed;
- two **motor** wheels (Bletchley's mu wheels), with 61 and 37 cams, which
  decided whether the psis moved.

The key for impulse $i$ was $\chi_i \oplus \psi'_i$, where $\psi'$ is the psi
stream with its irregular pauses. Figure 3.5 shows the arrangement. The cam
patterns were changed from time to time, more often as the war went on, and
the start positions for each message.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The Lorenz SZ40/42: five chi wheels stepping every character, five psi wheels stepping only when the two motor wheels allow, their outputs XORed with each of the five plaintext impulses" fill="currentColor" font-size="14">
<text x="20" y="30" font-weight="bold">chi wheels (step every character)</text>
<rect x="20" y="42" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="60" y="64" text-anchor="middle">χ1  41</text>
<rect x="120" y="42" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="160" y="64" text-anchor="middle">χ2  31</text>
<rect x="220" y="42" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="260" y="64" text-anchor="middle">χ3  29</text>
<rect x="320" y="42" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="360" y="64" text-anchor="middle">χ4  26</text>
<rect x="420" y="42" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="460" y="64" text-anchor="middle">χ5  23</text>
<text x="20" y="114" font-weight="bold">psi wheels (step together, when the motor says)</text>
<rect x="20" y="126" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="60" y="148" text-anchor="middle">ψ1  43</text>
<rect x="120" y="126" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="160" y="148" text-anchor="middle">ψ2  47</text>
<rect x="220" y="126" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="260" y="148" text-anchor="middle">ψ3  51</text>
<rect x="320" y="126" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="360" y="148" text-anchor="middle">ψ4  53</text>
<rect x="420" y="126" width="80" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="460" y="148" text-anchor="middle">ψ5  59</text>
<rect x="530" y="126" width="90" height="34" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.4"/><text x="575" y="148" text-anchor="middle">μ 61, 37</text>
<line x1="530" y1="143" x2="500" y2="143" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>
<text x="575" y="182" text-anchor="middle" font-size="12">motor: stop or go</text>
<line x1="60" y1="76" x2="60" y2="210" stroke="currentColor" stroke-width="1"/>
<line x1="160" y1="76" x2="160" y2="210" stroke="currentColor" stroke-width="1"/>
<line x1="260" y1="76" x2="260" y2="210" stroke="currentColor" stroke-width="1"/>
<line x1="360" y1="76" x2="360" y2="210" stroke="currentColor" stroke-width="1"/>
<line x1="460" y1="76" x2="460" y2="210" stroke="currentColor" stroke-width="1"/>
<circle cx="60" cy="222" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="60" y="227" text-anchor="middle">⊕</text>
<circle cx="160" cy="222" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="160" y="227" text-anchor="middle">⊕</text>
<circle cx="260" cy="222" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="260" y="227" text-anchor="middle">⊕</text>
<circle cx="360" cy="222" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="360" y="227" text-anchor="middle">⊕</text>
<circle cx="460" cy="222" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="460" y="227" text-anchor="middle">⊕</text>
<text x="20" y="270">plaintext impulse i  ⊕  χi  ⊕  ψ'i  =  ciphertext impulse i</text>
<text x="20" y="292" font-size="12">501 cams in all; the numbers are the wheel periods</text>
</svg>
<figcaption>Figure 3.5. The Lorenz SZ40/42 as Bletchley reconstructed it, without ever seeing one. Each of the five impulses has its own chi and psi wheel; the two motor wheels make the psi wheels pause.</figcaption>
</figure>

### The depth of 30 August 1941

Bletchley could hear Tunny from mid-1941 but had no idea how it worked. Then on
30 August 1941 an operator in Athens sent a message of about 4,000 characters
to Vienna. The receiving operator asked for it again, and the sender, against
every rule, sent it again **with the same wheel settings**, abbreviating words
the second time. Two different texts encrypted with the same key stream are a
**depth**: XOR the two ciphertexts and the key cancels, leaving the XOR of the
two plaintexts. John Tiltman, Bletchley's senior codebreaker, spent about ten
days teasing the two texts apart, guessing words in one and checking the other.
At the end he had both plaintexts, and so the key stream, about 4,000
characters of it.

The key stream was handed to the research section. Bill Tutte, a 24-year-old
chemistry graduate from Cambridge who had joined Bletchley in 1941, worked on
it. He wrote out the first impulse of the key and looked for a period. A
pattern seemed to recur at an interval of 574 characters; $574 = 2 \times 7
\times 41$, so he tried rows of 41, and the rows lined up. That was the first
chi wheel. Removing it showed the irregular part, and from there, over the
next months, Tutte and colleagues worked out the whole machine: two kinds of
wheels, their periods, the motor. By January 1942 Bletchley knew the logical
structure of a machine it would not see until the end of the war.

Knowing the machine was not reading the traffic. From July 1942 a section
under Major Ralph Tester, the **Testery**, recovered settings by hand, from
depths and with Turing's method for wheel patterns (**Turingery**). Hand
methods depended on operator errors, which grew rarer. A method was needed
that worked from a single message.

!!! note "Life story: the Tunny break"
    **Born:** 30 August 1941, a 4,000-character message sent twice from Athens
    with the same settings; John Tiltman recovered the key stream and Bill
    Tutte the machine's structure, by January 1942 · **Purpose:** read the
    German high command's teleprinter traffic, the Lorenz SZ40/42 · **Helped:**
    from 1942 the Testery read Tunny by hand; from 1944 Colossus made it
    routine, in time for the Normandy landings · **Status:** one of the great
    reconstructions in cryptanalysis; the British *General Report on Tunny*
    (1945) describing it was declassified in 2000

## 3.7 The double delta and Colossus

*Level: expert.*

Tutte's second contribution, in late 1942, was a statistical way to find the
chi wheel settings from ciphertext alone. It rests on a property of the psi
wheels that the Germans thought made the machine stronger.

### Differences

Bletchley wrote $\Delta X$ for the **delta** of a stream: each character XORed
with the one before, $\Delta X_k = X_k \oplus X_{k-1}$. Delta is linear, so
from $Z = P \oplus \chi \oplus \psi'$,

$$
\Delta Z = \Delta P \oplus \Delta\chi \oplus \Delta\psi' .
$$

Now look at two things. First, when the psi wheels **do not move**, $\psi'_k =
\psi'_{k-1}$ and $\Delta\psi' = 0$ in all five impulses. The motor held them
still a large fraction of the time. Second, **plaintext deltas are not
random**: German teleprinter text repeated characters (doubled shifts, doubled
spaces, the "55M889" that spelled a full stop), and consecutive characters
were alike in some impulses more often than not. Neither bias is large in a
single impulse. Tutte's idea was to add two impulses together:

$$
\Delta Z_1 \oplus \Delta Z_2 \oplus \Delta\chi_1 \oplus \Delta\chi_2
  \;=\; (\Delta P_1 \oplus \Delta P_2) \oplus (\Delta\psi'_1 \oplus \Delta\psi'_2) .
$$

The right side is a dot (0) more often than a cross. If $\Pr[\Delta P_1 \oplus
\Delta P_2 = 0] = \tfrac12 + \varepsilon_P$ and $\Pr[\Delta\psi'_1 \oplus
\Delta\psi'_2 = 0] = \tfrac12 + \varepsilon_\psi$, the two being nearly
independent, then the piling-up rule (the same rule that drives
[linear cryptanalysis](06-Linear-Cryptanalysis.md)) gives

$$
\Pr[\text{right side} = 0] = \tfrac12 + 2\,\varepsilon_P\,\varepsilon_\psi .
$$

In real traffic Bletchley found the left side a dot about 55 percent of the
time when the chi settings were right. When they are wrong, $\Delta\chi_1
\oplus \Delta\chi_2$ is unrelated to the ciphertext and the count sits at
about 50 percent. So: for each of the $41 \times 31 = 1271$ start positions
of the first two chi wheels, generate their stream, combine it with the
ciphertext, and **count the dots**. The right setting has the highest count.
That is the **double delta** or "1+2 break-in", and it needs only one
ciphertext of a few thousand characters and the wheel patterns.

### Code it

The simulation builds a Lorenz-like machine with random cam patterns and a
simplified motor (the psis move when the 37-wheel shows a cross; the 37 moves
when the 61 does), encrypts 4,000 characters of German-style teleprinter text,
and then forgets the start positions and tries all 1,271.

```python
import random
random.seed(1944)

# ITA2 teleprinter code, impulses 1 to 5, written as Bletchley wrote it: "9" is the space,
# "5" and "8" the figure and letter shifts, "3" and "4" line feed and carriage return
CODE = dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ95834",
    "11000 10011 01110 10010 10000 10110 01011 00101 01100 11010 11110 01001 00111 00110 00011 "
    "01101 11101 01010 10100 00001 11100 01111 11001 10111 10101 10001 00100 11011 11111 01000 00010".split()))
WORDS = ("AN OKH FEINDLICHE PANZER IM RAUM NORDWESTLICH ANGRIFF ABGEWIESEN EIGENE VERLUSTE GERING "
         "MUNITION UND BETRIEBSSTOFF DRINGEND ERBETEN LAGE UNVERAENDERT ARTILLERIE STELLUNGEN "
         "DIVISION REGIMENT BATAILLON MELDUNG 5QW88 5RT88 55M889 55M889 34 34").split()

def wheel(period):                          # a random cam pattern, about half crosses
    return [random.randint(0, 1) for _ in range(period)]

CHI = [wheel(p) for p in (41, 31, 29, 26, 23)]
PSI = [wheel(p) for p in (43, 47, 51, 53, 59)]
MU61, MU37 = wheel(61), [1] * 25 + [0] * 12           # motor wheels; the 37 has more crosses
random.shuffle(MU37)

def encipher(plain, start):                 # start: the twelve wheel positions
    c, s, m61, m37 = start[:5], start[5:10], start[10], start[11]
    out = []
    for ch in plain:
        p = CODE[ch]
        key = [CHI[i][c[i] % len(CHI[i])] ^ PSI[i][s[i] % len(PSI[i])] for i in range(5)]
        out.append([int(p[i]) ^ key[i] for i in range(5)])
        c = [x + 1 for x in c]               # the chis step every time
        if MU37[m37 % 37]:                   # the psis step only when the motor says so
            s = [x + 1 for x in s]
        if MU61[m61 % 61]:
            m37 += 1
        m61 += 1
    return out

text = "9".join(random.choice(WORDS) for _ in range(900))[:4000]
start = [random.randrange(60) for _ in range(12)]
Z = encipher(text, start)
print("true chi 1 and chi 2 settings:", start[0] % 41, start[1] % 31)

# Tutte's statistic, worked from the ciphertext alone: try all 41 x 31 settings of chi 1 and chi 2
n = len(Z)
dz = [Z[k][0] ^ Z[k - 1][0] ^ Z[k][1] ^ Z[k - 1][1] for k in range(1, n)]
scores = []
for a in range(41):
    for b in range(31):
        dots = 0
        for k in range(1, n):
            dx = CHI[0][(a + k) % 41] ^ CHI[0][(a + k - 1) % 41] ^ CHI[1][(b + k) % 31] ^ CHI[1][(b + k - 1) % 31]
            dots += dz[k - 1] == dx
        scores.append((dots, a, b))
scores.sort(reverse=True)
sigma = (n - 1) ** 0.5 / 2
for dots, a, b in scores[:4]:
    print(a, b, dots, round((dots - (n - 1) / 2) / sigma, 1))
```

```
true chi 1 and chi 2 settings: 22 20
22 20 2151 4.8
5 21 2102 3.2
5 1 2102 3.2
29 22 2100 3.2
```

The right setting, 22 and 20, scores 2,151 dots out of 3,999, or 53.8 percent,
which is 4.8 standard deviations above the 50 percent of a wrong guess. The
best wrong guess reaches 3.2. In this simulated text $\Delta P_1 \oplus \Delta
P_2$ is a dot about 58 percent of the time and the psis stand still about a
third of the time, so the excess is smaller than in real traffic and the
margin is modest. Bletchley used the same measure, counting in **sigmas**,
and set a threshold before trusting a score. Figure 3.6 shows all 1,271
scores.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="Histogram of the 1271 chi settings by score in standard deviations: 12 at minus 3, 70 at minus 2, 284 at minus 1, 493 at 0, 320 at 1, 76 at 2, 15 at 3, none at 4, and one, the right setting, at 5" fill="currentColor" font-size="14">
<line x1="60" y1="230" x2="610" y2="230" stroke="currentColor" stroke-width="1.4"/>
<line x1="60" y1="230" x2="60" y2="30" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="234" text-anchor="end" font-size="12">0</text>
<text x="50" y="146" text-anchor="end" font-size="12">250</text>
<line x1="55" y1="142" x2="60" y2="142" stroke="currentColor" stroke-width="1.4"/>
<text x="50" y="58" text-anchor="end" font-size="12">500</text>
<line x1="55" y1="54" x2="60" y2="54" stroke="currentColor" stroke-width="1.4"/>
<rect x="75" y="225.8" width="44" height="4.2" fill="currentColor" fill-opacity="0.5"/><text x="97" y="219" text-anchor="middle" font-size="12">12</text><text x="97" y="248" text-anchor="middle">−3</text>
<rect x="135" y="205.4" width="44" height="24.6" fill="currentColor" fill-opacity="0.5"/><text x="157" y="199" text-anchor="middle" font-size="12">70</text><text x="157" y="248" text-anchor="middle">−2</text>
<rect x="195" y="130" width="44" height="100" fill="currentColor" fill-opacity="0.5"/><text x="217" y="124" text-anchor="middle" font-size="12">284</text><text x="217" y="248" text-anchor="middle">−1</text>
<rect x="255" y="56.5" width="44" height="173.5" fill="currentColor" fill-opacity="0.5"/><text x="277" y="50" text-anchor="middle" font-size="12">493</text><text x="277" y="248" text-anchor="middle">0</text>
<rect x="315" y="117.4" width="44" height="112.6" fill="currentColor" fill-opacity="0.5"/><text x="337" y="111" text-anchor="middle" font-size="12">320</text><text x="337" y="248" text-anchor="middle">1</text>
<rect x="375" y="203.2" width="44" height="26.8" fill="currentColor" fill-opacity="0.5"/><text x="397" y="197" text-anchor="middle" font-size="12">76</text><text x="397" y="248" text-anchor="middle">2</text>
<rect x="435" y="224.7" width="44" height="5.3" fill="currentColor" fill-opacity="0.5"/><text x="457" y="218" text-anchor="middle" font-size="12">15</text><text x="457" y="248" text-anchor="middle">3</text>
<text x="517" y="248" text-anchor="middle">4</text>
<rect x="555" y="222" width="44" height="8" fill="currentColor" fill-opacity="0.9"/><text x="577" y="214" text-anchor="middle" font-size="12" font-weight="bold">1: right</text><text x="577" y="248" text-anchor="middle">5</text>
<text x="335" y="272" text-anchor="middle">score in standard deviations above 50 percent dots (rounded)</text>
</svg>
<figcaption>Figure 3.6. All 1,271 settings of the first two chi wheels, by score. The wrong ones form a bell curve around zero; the right one stands alone at about five sigma. With a longer message it would stand further out, since the excess grows with the length n and the noise only with its square root.</figcaption>
</figure>

### Heath Robinson and Colossus

Counting 1,271 settings over a few thousand characters is about five million
comparisons per message, too many by hand. Max Newman, a Cambridge
mathematician, proposed doing it by machine, and his section, the
**Newmanry**, began work in early 1943. The first machine, **Heath Robinson**
(named after a cartoonist of absurd contraptions), ran from June 1943. It read
two paper tapes, one with the ciphertext and one with the chi patterns, and
keeping two tapes in step at high speed was its weakness: the tapes stretched
and tore.

Tommy Flowers, an engineer at the Post Office research station at Dollis Hill,
proposed generating the wheel patterns electronically instead, with vacuum
tubes (valves), so that only the ciphertext tape had to move. Many doubted
that 1,500 valves could run reliably. Flowers had built telephone exchanges
with valves and knew that they failed mostly when switched on and off, so he
left them on. **Colossus** Mark 1, with about 1,600 valves, was delivered to
Bletchley in January 1944 and worked its first message in early February. It
read the tape at 5,000 characters a second and did the counts in parallel. The
Mark 2, with about 2,400 valves and five-fold parallel processing, worked from
1 June 1944, five days before D-Day. Ten Colossi were working by the end of
the war.

Colossus was not a general-purpose computer, but it was electronic, digital
and programmable within its task, and it came before ENIAC. Its existence was
kept secret until the 1970s.

The double delta set the chi wheels; other Colossus runs set the remaining
chis. Then the de-chi'd text, $Z \oplus \chi = P \oplus \psi'$, went to the
Testery, where the psi and motor settings were found by hand, since $\psi'$
repeated characters whenever the psis stood still and the German text showed
through. By the end of the war the Newmanry and Testery had read tens of
thousands of messages, many of them from Hitler's headquarters to his
commanders.

!!! note "Life story: Colossus"
    **Born:** designed by Tommy Flowers at the Post Office Research Station,
    Dollis Hill; Mark 1 delivered to Bletchley in January 1944, Mark 2 from 1
    June 1944 · **Purpose:** run Tutte's statistical tests on Lorenz
    ciphertext at 5,000 characters a second, to find chi wheel settings ·
    **Helped:** the Newmanry under Max Newman, with Jack Good, Donald Michie
    and many members of the WRNS; Tunny traffic read before and after D-Day ·
    **Retired:** most of the ten machines were broken up in 1945; two went to
    GCHQ and were used into the late 1950s · **Replaced by:** general-purpose
    computers; a working rebuild by Tony Sale has run at Bletchley since the
    2000s

## 3.8 Purple and the American codebreakers

*Level: beginner.*

The United States came to the war with two codebreaking services that
competed more than they cooperated: the Navy's OP-20-G and the Army's Signal
Intelligence Service (SIS). The SIS had been built from 1930 by William
Friedman, who had written the founding texts of the subject, including the
index of coincidence ([Chapter 2](02-Breaking-Classical-Ciphers.md)), and who
hired mathematicians: Frank Rowlett, Abraham Sinkov and Solomon Kullback,
soon joined by others, among them Genevieve Grotjan, Leo Rosen and Mary Jo
Dunning. In the Navy, Agnes Meyer Driscoll had broken Japanese naval codes
and machines since the 1920s.

Japan's Foreign Ministry used cipher machines for its diplomatic traffic. The
first, which the Americans called **Red**, was broken in the mid-1930s; it
encrypted vowels and consonants separately, so a vowel always became a vowel,
a structural leak of the purest kind. In February 1939 it was replaced by the
**Type B** machine (*97-shiki ōbun injiki*), which the SIS called **Purple**.

Purple was not a rotor machine. It used **stepping switches**, the telephone
exchange part that moves a wiper across a bank of contacts. A plugboard at
the input split the 26 letters into a group of six, the **sixes**, and a
group of twenty, the **twenties**. The sixes went through one 25-position
switch bank; the twenties through three banks in series, which stepped in an
odometer-like pattern controlled by the key. The sixes carried over the Red
weakness: the six letters stayed among themselves, with a short period. Rowlett's team recovered them within months. The
twenties took eighteen months.

The break came on 20 September 1940, when Genevieve Grotjan found relations
between letters at different positions that showed how the twenties were
being permuted from one position to the next. Leo Rosen, an engineer,
realized that the mechanism must be stepping switches, and the team built a
**Purple analog**, an imitation of a machine none of them had seen, from
standard telephone parts. It decrypted its first full message at the end of
September 1940. Friedman, who directed the effort, collapsed from exhaustion
early in 1941 and spent months in hospital; Rowlett had led the daily work.
The decrypts were called **Magic**.

In February 1941 four Americans, Abraham Sinkov, Leo Rosen, Robert Weeks and
Prescott Currier, brought Bletchley a Purple analog in exchange for what
Britain knew of Enigma: the start of a partnership that still exists.

### What Magic told, and what it did not

Purple carried diplomacy, not war plans. Before Pearl Harbor it showed Japan
moving towards war: the deadlines in the instructions to the embassy in
Washington, and on 6 and 7 December 1941 a fourteen-part message breaking off
negotiations, with an order to deliver it at 1 p.m. Washington time. It never
said "Pearl Harbor"; the attack plan travelled in navy codes that were barely
readable then, and largely not by radio. What Washington could have known has
been argued since 1941; most historians conclude that the decrypts showed war
was coming, but not where.

During the war Purple's greatest value was in Europe. Japan's ambassador in
Berlin, General Hiroshi Ōshima, was close to Hitler and Ribbentrop and sent
long, detailed reports home: on German plans, on the eastern front, and in
late 1943 on a tour of the Atlantic Wall defenses in France. US Army Chief of
Staff George Marshall later called Ōshima's messages a main source of
information on Hitler's intentions. Japan never learned that Purple was
broken. No Purple machine was ever captured whole; fragments of one were found
in the ruins of the Japanese embassy in Berlin in 1945.

!!! note "Life story: the Purple break"
    **Born:** 1939 to 1940, the US Army's Signal Intelligence Service:
    William Friedman, Frank Rowlett, Genevieve Grotjan (the key insight, 20
    September 1940) and Leo Rosen (the analog) · **Purpose:** read Japan's
    Type B diplomatic cipher machine · **Helped:** Magic decrypts from
    September 1940 to 1945, including Ōshima's reports from Berlin; analogs
    given to Britain in February 1941 · **Status:** never detected by Japan;
    a model of rebuilding a machine from its output alone

## 3.9 JN-25 and Midway

*Level: beginner.*

Japan's navy used a code, not a machine, for its operational traffic. The
Americans called it **JN-25**, for the twenty-fifth Japanese naval system they
had catalogued. It came into use in June 1939, and a new edition, JN-25B,
from December 1940.

It was an **enciphered code**, in two layers. First, each word or phrase was
replaced by a five-digit **code group** from a codebook of tens of thousands
of entries. Then each code group was **enciphered** by adding a five-digit
**additive** from a long additive book, digit by digit without carrying
("false addition": $7 + 5 = 2$). The message's indicator said where in the
additive book to begin. A codebook alone falls to frequency analysis, since
common words give common groups; the additive was meant to hide those
frequencies.

The structure leaked in two ways.

**Depth.** The additive book was long but finite, and many messages started at
the same place. Two messages enciphered with the same stretch of additive are
in depth: subtract one cipher group from the other and the additive cancels,
leaving the difference of the two code groups.

**The check digit.** Every valid JN-25 code group was **divisible by three**
(its digits summed to a multiple of 3), so that garbled groups could be
spotted. It also let a codebreaker test a guessed additive: subtract it from
every cipher group that used it, and see whether all the results are divisible
by three. A wrong additive passes for one group a third of the time, and for
several groups almost never.

```python
import random
random.seed(1942)

def add(a, b):                    # false addition: digit by digit, no carrying
    return "".join(str((int(x) + int(y)) % 10) for x, y in zip(a, b))

def sub(a, b):
    return "".join(str((int(x) - int(y)) % 10) for x, y in zip(a, b))

def codegroup():                  # every JN-25 group's digits add up to a multiple of 3
    while True:
        g = "%05d" % random.randrange(100000)
        if sum(map(int, g)) % 3 == 0:
            return g

additive = "%05d" % random.randrange(100000)
depth = [add(codegroup(), additive) for _ in range(8)]   # 8 messages that used the same additive
print("cipher groups in depth:", " ".join(depth))

for k in (3, 5, 8):               # how many additives survive the test with k groups?
    alive = ["%05d" % a for a in range(100000)
             if all(sum(map(int, sub(c, "%05d" % a))) % 3 == 0 for c in depth[:k])]
    print(k, "groups:", len(alive), "additives left", "(true one among them)" if additive in alive else "")
print("true additive:", additive)
```

```
cipher groups in depth: 36118 16464 94147 20635 69614 26239 72562 10179
3 groups: 3728 additives left (true one among them)
5 groups: 605 additives left (true one among them)
8 groups: 93 additives left (true one among them)
true additive: 37215
```

Three groups cut 100,000 possible additives to 3,728, close to the
$100{,}000/27 \approx 3{,}700$ the "one in three" rule predicts. More groups
cut further, though more slowly than $3^{-k}$, because borrowing in the
digit-wise subtraction makes the tests on different groups not quite
independent. The codebreakers combined the test with the frequencies of known
code groups to choose among the survivors, and then used each recovered
additive to strip more groups and rebuild more of the codebook. It was slow,
cooperative work, shared between Station HYPO at Pearl Harbor, OP-20-G in
Washington, FRUMEL in Melbourne (evacuated from Corregidor), and Britain's Far
East Combined Bureau. John Tiltman had made the first entries into JN-25 in
1939.

### Midway

By May 1942 HYPO, under Commander Joseph Rochefort, with the linguists and
cryptanalysts Thomas Dyer, Wesley Wright and Joseph Finnegan among them, could
read only parts of each message, but enough to see that Japan was preparing a
large operation against a target called "AF". Rochefort was convinced AF was
Midway; Washington was not sure. As book 1's
[Chapter 1](../../book/01-What-Cryptography-Is-For.md) tells, the base at
Midway was asked to report in plain language, around 20 May, that its water
plant had broken down, and a Japanese message soon reported that AF was short
of water: a chosen-plaintext attack on a codebook. HYPO's estimates of the date
and the direction of approach let Admiral Chester Nimitz place his three
carriers north-east of Midway. On 4 June 1942 they sank four Japanese
carriers, *Akagi*, *Kaga*, *Sōryū* and *Hiryū*, for the loss of the
*Yorktown*.

Two details show how narrow it was. Japan had planned to replace JN-25B's
codebook on 1 April 1942; the change was delayed twice and came into force
only on 28 May, after most of the Midway orders had gone out. And on 7 June
the *Chicago Tribune* printed a story by Stanley Johnston, a correspondent
who had seen a signal on board ship, saying the Navy had known the Japanese
order of battle in advance. A grand jury declined to indict, to avoid drawing
attention; Japan apparently never noticed.

JN-25 was read, with gaps, until the end of the war. In April 1943 it gave
the itinerary of Admiral Isoroku Yamamoto's inspection flight, and US fighters
shot down his plane on 18 April. The Japanese army's codes, harder and
better run, held out longer; they were read on a large scale only from early
1944, after codebooks were captured at Sio in New Guinea and passed to
Central Bureau in Brisbane.

!!! note "Life story: the JN-25 break and Midway"
    **Born:** from 1939, the British FECB and John Tiltman, then the US
    Navy's stations HYPO (Pearl Harbor), Negat (Washington) and CAST/FRUMEL
    (Corregidor, then Melbourne) · **Purpose:** strip the additive from
    Japan's enciphered naval code and rebuild the codebook · **Helped:** the
    victory at Midway on 4 June 1942, the Yamamoto shootdown of 18 April 1943,
    and the submarine war against Japanese shipping · **Status:** a model of
    depth, a check digit and a chosen plaintext working together; Rochefort,
    moved aside in 1942, received the Distinguished Service Medal only in 1986,
    after his death

## 3.10 Venona: the one-time pad used twice

*Level: intermediate.*

The one-time pad is the one cipher with a proof: a truly random key, as long
as the message and **never reused**, leaks nothing (book 1,
[Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)). Soviet
intelligence and diplomatic services used it for their most secret traffic: a
codebook turned words into four-digit groups, written as five-digit groups,
and each group was enciphered by false addition of a group from a pad page
that existed in two copies, one for the sender and one for the receiver.

Early in 1942, under the strain of the German invasion, the Soviet office that
made the pads printed some pages twice, apparently tens of thousands of them.
The duplicates went into different pads for different users: trade
officials, diplomats, the NKVD and the GRU. Two messages enciphered with the same page are a **two-time
pad**, and subtracting them cancels the key exactly as in JN-25's depths.

On 1 February 1943 the US Army's Signal Intelligence Service, at Arlington
Hall in Virginia, set up a small project on stored Soviet cables, with Gene
Grabeel as its first analyst. In October 1943 Richard Hallock found the first
evidence of reuse in trade traffic, and in 1944 Cecil Phillips found how the
NKVD messages showed which pad page they used, which made matching duplicates
across services possible. Finding a pair is a statistical test of the kind in
[Chapter 2](02-Breaking-Classical-Ciphers.md): line up two messages, subtract,
and see whether the differences look like differences of code groups (which
have a skewed distribution) or like random digits.

From 1946 the linguist Meredith Gardner began to rebuild the codebook from the
matched pairs, helped by a partly burned Soviet codebook that had been
captured in Finland and reached Arlington Hall late in the war, and by guesses
of stereotyped phrases. By the end of 1946 he had read a message listing
scientists working on the atomic bomb. The FBI's Robert Lamphere took the results
into counter-intelligence. The decrypts identified or helped identify Klaus
Fuchs, Julius Rosenberg, Theodore Hall, Donald Maclean and many others. The
Soviets learned of the project by about 1948, through William Weisband, an
Arlington Hall linguist who was their agent, and later through Kim Philby, but
the messages were already sent and nothing could be done about them.

The project, given the cover name **Venona** late in its life, ran until 1980.
About 2,900 messages were read, most only in part, out of the hundreds of
thousands collected; only the duplicated pages were ever breakable. The
decrypts were released to the public in 1995 and 1996.

The lesson is the clean one. The cipher was perfect. The key distribution, a
factory under wartime pressure, was not. Every modern stream cipher and every
nonce-based mode (GCM, ChaCha20-Poly1305) inherits the same rule and the same
failure, as [Chapter 8](08-Attacks-on-Stream-Ciphers.md) and
[Chapter 10](10-Attacks-on-Modes-and-MACs.md) show.

!!! note "Life story: Venona"
    **Born:** 1 February 1943, Arlington Hall; Gene Grabeel, Richard Hallock,
    Cecil Phillips, Meredith Gardner and colleagues · **Purpose:** read Soviet
    traffic enciphered with one-time pad pages that had been printed twice in
    1942 · **Helped:** exposed Soviet espionage in the United States, Britain
    and Australia, including the atomic spies · **Status:** closed in 1980;
    about 2,900 messages released in 1995 and 1996; the standard example of a
    two-time pad

## 3.11 The other side of the war

*Level: beginner.*

The Allied breaks are well known because Britain and the United States
eventually published them. The Axis services and the neutral countries also
broke codes, and their record is patchier, partly because their archives were
lost or destroyed.

**Germany** had several codebreaking services that rarely shared: the navy's
**B-Dienst**, the high command's cipher branch (OKW/Chi), the Foreign Office's
Pers Z, the army's own units, and Göring's Forschungsamt. The B-Dienst, with
Wilhelm Tranow, had the greatest success. It read the Royal Navy's codes in
the first years of the war and, from 1942 until June 1943, **Naval Cypher No.
3**, used for Atlantic convoys, which helped the U-boats find convoys at the
height of the battle. German units broke the American M-209 field cipher
machine at the tactical level. Germany never broke the British Typex or the
American SIGABA, and never accepted that Enigma had been broken: its
investigations kept concluding that losses were due to spies or radar.

**Italy**'s Servizio Informazioni Militare (SIM) worked as much by theft as by
analysis. In 1941 it copied the US State Department's "Black Code" from the
American embassy in Rome. From late 1941 to June 1942 Italy and Germany read
the detailed reports that the US military attaché in Cairo, Colonel Bonner
Fellers, sent home, and Rommel had them within hours as his "good source".
The Italian navy's codebreakers had successes against British naval codes
that are less well documented.

**Japan**'s army and navy broke Chinese government codes and some low-grade
Allied traffic, and there are reports of success against American and British
diplomatic systems before the war. Much of the record was burned in August
1945, and historians give it far less weight than the Allied effort; how much
Japan read is still uncertain.

**The Soviet Union** broke German and Japanese hand systems, and its foreign
intelligence had something better than cryptanalysis: agents. John
Cairncross, who worked at Bletchley in 1942 and 1943, passed decrypts to
Moscow, including material relevant to the battle of Kursk. How much Soviet
codebreakers read of Enigma itself is still argued; the Soviet archives are
only partly open.

**Finland**'s small radio intelligence service read much Soviet military
traffic. In 1944 it moved its staff and files to Sweden (Operation Stella
Polaris) rather than let them fall to the Soviet Union.

**Sweden**, neutral, had the most elegant break of the war on the Axis side's
machines. In May 1940 the mathematician **Arne Beurling** worked out the
Siemens T52 teleprinter cipher, the machine Bletchley called Sturgeon, from
intercepted traffic on German lines that ran through Sweden, in about two
weeks, with pencil and paper. Sweden read German traffic to and from Norway
for much of the war.

**France** and **Poland** worked together after 1939, first at Bruno and then
at Cadix, until the German occupation of the south in November 1942; Bertrand's
team then went underground, and the Germans never learned what the Poles knew.

!!! note "Life story: the B-Dienst and Naval Cypher No. 3"
    **Born:** the German navy's radio intelligence service, with Wilhelm
    Tranow; Naval Cypher No. 3 read from early 1942 · **Purpose:** find
    Allied convoys for the U-boat packs · **Helped:** the U-boat successes of
    1942 and early 1943 · **Status:** ended in June 1943, when the Allies
    replaced the cipher after their own decrypts of U-boat traffic showed it
    was being read: one side's break exposed the other's

## 3.12 Structure leaks, operators leak more

*Level: intermediate.*

Put the breaks side by side and a pattern appears.

| Target | Structural leak | Human leak | Who broke it |
|---|---|---|---|
| Enigma, 1932 to 1938 | conjugation by the plugboard keeps cycle structure | doubled message key, keys like AAA | Rejewski, Różycki, Zygalski |
| Enigma, 1940 to 1945 | no letter to itself; involution; plugboard swaps | routine texts, cillies, re-encipherments | Turing, Welchman, Bletchley, US Navy |
| Lorenz SZ40/42 | psi wheels stand still; key is $\chi \oplus \psi'$ | one message sent twice on 30 August 1941 | Tiltman, Tutte, Flowers, Newman |
| Purple | the sixes separate from the twenties | stereotyped diplomatic forms | Rowlett, Grotjan, Rosen |
| JN-25 | every code group divisible by 3 | additive reuse; delayed book change | HYPO, FRUMEL, FECB |
| Soviet one-time pads | none in the cipher | pages printed twice | Grabeel, Phillips, Gardner |
| Naval Cypher No. 3 | a long-lived additive code | convoys signalled on routine schedules | B-Dienst |

Three lessons carried over into modern cryptography.

**Any rule that every ciphertext obeys is a lever.** "No letter to itself",
"vowels stay vowels", "the sum of the digits is divisible by three", "the
psis often stand still": each looks harmless and each cut a search space by a
large factor. A modern cipher is required to be indistinguishable from random,
because no one can predict which harmless-looking rule will become the lever.
The distinguishers of Part II are exactly this.

**The key space is not the security.** Enigma had $2^{67}$ daily keys and was
broken by searching $2^{14}$ rotor positions at a time. The real cost of an
attack is the cost of the cheapest path through the structure, which is how
[Chapter 1](01-What-Cryptanalysis-Is.md) measures a break.

**Procedures are part of the cipher.** The doubled indicator, the repeated
message, the reused pad and the delayed codebook were not flaws of the
machines. A design that is secure only if every operator is careful every day
is not secure. Today: let the protocol, not people, choose nonces, keys and
formats. The cost of getting it wrong is the subject of
Chapter 18 and
Chapter 19.

## 3.13 Going deeper

*Level: expert.*

**Rejewski's second theorem.** If $X$ and $Y$ are involutions with no fixed
points, the cycles of $XY$ come in pairs of equal length, and the letters of
each pair interleave: if $(a_1 a_2 \dots a_k)$ is a cycle, there is another
cycle $(b_1 b_2 \dots b_k)$ with $a_i X = b_{k+1-i}$ for a suitable starting
point, and conversely any such pairing gives a valid $X$. So from $AD$ alone,
$A$ is determined up to $k$ choices per pair of $k$-cycles (and, when several
cycles share a length, a choice of how to pair them). One known message
key (a cilly) fixes the choice for every cycle it touches. Rejewski used this
to get $A$ to $F$, then the equation $A = S\,P N P^{-1}\,Q\,P N^{-1} P^{-1}\,S$
(with $Q$ the fixed middle-left-reflector part) for the wiring.

**The bombe as constraint propagation.** In today's terms, the bombe is
unit propagation over a constraint graph: variables are the plugboard partners,
each menu edge is a constraint, a guess is a decision, and a contradiction
prunes. Each loop in the menu closes with probability about $1/26$ at a wrong
position, so with $L$ independent loops the expected false stops per wheel
order are about $17{,}576 \times 26^{\,1-L}$; the diagonal board adds
implications that behave like extra loops. Modern SAT-based attacks on ciphers
([Chapter 7](07-Algebraic-Integral-and-Structural-Attacks.md)) do the same with
more general clauses.

**Banburismus and the deciban.** For the naval Enigma, Turing compared pairs of
messages offset against each other and counted repeats. Two messages in depth
(the same rotor positions) repeat letters at the plaintext rate, about $0.076$
for German, against $1/26 \approx 0.038$ for unrelated text. Turing scored evidence in
**bans** and **decibans**, units of $\log_{10}$ of a Bayes factor, so that
evidence from independent observations simply added. The sheets were printed
in Banbury, hence the name. Jack Good, who worked with Turing, went on to
publish the Good-Turing estimator for the probability of unseen events, a
direct descendant.

**Tutte's statistics, with numbers.** For $n$ characters and a true bias
$\tfrac12 + \varepsilon$, the right setting's count exceeds $n/2$ by about
$n\varepsilon$, while wrong counts have standard deviation $\sqrt n/2$. Among
1,271 candidates the largest wrong score is about $\sqrt{2 \ln 1271} \approx
3.8$ sigma (3.2 in the run of §3.7), so reliable setting needs
$2\varepsilon\sqrt n$ well above 4, that is, $n \gtrsim 4/\varepsilon^2$.
With $\varepsilon = 0.05$ that is about 1,600 characters, matching the message
lengths Colossus worked on. The same $1/\varepsilon^2$ law governs Matsui's
linear cryptanalysis 50 years later. Bletchley also recovered the chi
**patterns** themselves by **rectangling**, a statistical iteration on a
$41 \times 31$ table of $\Delta Z_1 \oplus \Delta Z_2$ counts that converges to
the two wheel patterns, essentially an early alternating maximization.

**Modern ciphertext-only attacks on Enigma.** With computers no crib is
needed. In 1995 James Gillogly recovered rotor positions and then plugs by
hill climbing on the index of coincidence, the method of
[Chapter 2](02-Breaking-Classical-Ciphers.md); Geoff Sullivan and Frode Weierud
(2005) and the distributed M4 Project (from 2006) broke wartime messages that
had never been read.

## Check yourself

??? question "1. Why can the same Enigma setting both encrypt and decrypt?"

    Each key press is $E = T R T^{-1}$ with $R$ an involution, so $EE = 1$:
    $E$ is its own inverse.

??? question "2. A 20-letter crib is dragged along a 200-letter Enigma message. About how many places survive?"

    There are 181 places, and a wrong one survives with probability
    $(25/26)^{20} \approx 0.456$, so about 82 wrong places survive, plus the
    true one.

??? question "3. Compute $AD$ for $A = (ab)(cd)(ef)$ and $D = (af)(bc)(de)$, first $A$ then $D$."

    $a \to b \to c$, $c \to d \to e$, $e \to f \to a$: $(ace)$. And
    $b \to a \to f$, $f \to e \to d$, $d \to c \to b$: $(bfd)$. Two 3-cycles, as
    the pairing theorem requires.

??? question "4. Why does the plugboard not change the cycle structure of $AD$?"

    $AD = S(\bar A \bar D)S$, a conjugate of the plugless product, and
    conjugation only relabels the letters in each cycle.

??? question "5. Why did the change of 15 September 1938 defeat the catalog but not the Zygalski sheets?"

    The catalog needed one ground setting per day, so that all indicators
    shared the same $A$ to $F$. The sheets used only females, a property of
    each indicator's own (clear) ground setting.

??? question "6. What does the diagonal board add to the bombe?"

    The plugboard is a set of swaps: $xS = y$ implies $yS = x$. The board
    feeds every deduction back as its mirror, so a wrong guess meets a
    contradiction much sooner, even with menus that have few loops.

??? question "7. Why does Tutte's statistic add impulses 1 and 2 instead of using impulse 1 alone?"

    $\Delta\psi'$ is zero in all impulses at once when the psis stand still,
    and plaintext deltas are correlated between impulses. Adding two impulses
    keeps that common bias while the single-impulse bias of the plaintext is
    much weaker. (Other pairs, such as 4 and 5, were used for other wheels.)

??? question "8. A JN-25 additive is tested against 6 groups. If the tests were independent, how many of 100,000 wrong additives would survive?"

    $100{,}000 / 3^6 \approx 137$. The code in §3.9 finds somewhat more, because
    the tests are not independent.

??? question "9. Why did Venona read only a small fraction of Soviet traffic?"

    Only messages enciphered with the duplicated pages had a partner to cancel
    against; every other message was a proper one-time pad and leaked nothing.

??? question "10. Estimate the message length the double delta needs if the bias is $\varepsilon = 0.04$."

    $n \gtrsim 4/\varepsilon^2 = 2{,}500$ characters for a margin of about 4
    sigma; more for safety, since the largest of 1,271 wrong scores is near 3.8
    sigma.

## What you learned

- An Enigma key press is the reflector conjugated by the plugboard and rotors:
  an involution with no fixed letter, whatever the key.
- Rejewski's theorem made the plugboard vanish: the cycle structure of $AD$,
  $BE$, $CF$ depends only on the rotors, which gave the catalog, the sheets and
  the bomba.
- A crib becomes a menu; the bombe follows plugboard guesses around its loops
  until they contradict, and Welchman's diagonal board made that fast.
- Tutte rebuilt the Lorenz machine from one key stream, and his double delta
  found chi settings from ciphertext alone; Colossus did the counting.
- Purple, JN-25 and the Soviet pads fell to structure (sixes, check digits) and
  to reuse (depths, duplicated pages); every side, Allied, Axis and neutral,
  had codebreakers.
- Structure leaks, operators leak more: the modern rules of indistinguishable
  ciphers and misuse-resistant protocols come from this period.

**Next:** [Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md), the attacks
that ignore structure altogether: exhaustive search, birthdays and trade-offs.

## Further reading

- Marian Rejewski, "An Application of the Theory of Permutations in Breaking
  the Enigma Cipher", *Applicationes Mathematicae* 16 (1980), and "How Polish
  Mathematicians Deciphered the Enigma", *Annals of the History of Computing*
  3 (1981).
- Władysław Kozaczuk, *Enigma: How the German Machine Cipher Was Broken*
  (1984), with appendices by Rejewski.
- Alan Turing, *Treatise on the Enigma* ("Prof's Book", 1940; released 1996).
- Gordon Welchman, *The Hut Six Story* (1982).
- F. H. Hinsley and Alan Stripp (eds.), *Codebreakers: The Inside Story of
  Bletchley Park* (1993).
- David Kahn, *Seizing the Enigma* (1991) and *The Codebreakers* (1967,
  revised 1996).
- Hugh Sebag-Montefiore, *Enigma: The Battle for the Code* (2000).
- I. J. Good, D. Michie and G. Timms, *General Report on Tunny* (1945;
  declassified 2000; published 2015, ed. James Reeds, Whitfield Diffie and
  J. V. Field).
- W. T. Tutte, "Fish and I" (1998), his own account of the Lorenz break.
- B. Jack Copeland (ed.), *Colossus: The Secrets of Bletchley Park's
  Codebreaking Computers* (2006).
- Stephen Budiansky, *Battle of Wits* (2000), for the American and British
  sides together.
- John Prados, *Combined Fleet Decoded* (1995); Jonathan Parshall and Anthony
  Tully, *Shattered Sword* (2005), on Midway.
- Robert Louis Benson, *The Venona Story* (NSA, 2001); John Earl Haynes and
  Harvey Klehr, *Venona* (1999).
- Bengt Beckman, *Codebreakers: Arne Beurling and the Swedish Crypto Program
  during World War II* (2002).
- James Gillogly, "Ciphertext-only Cryptanalysis of Enigma", *Cryptologia* 19
  (1995); Geoff Sullivan and Frode Weierud, "Breaking German Army Ciphers",
  *Cryptologia* 29 (2005).
- Book 1: [Chapter 2](../../book/02-Classical-Ciphers.md) and
  [Chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md); the history
  page [Machines and World War II](../../history/05-Machines-and-WWII.md).
