# 2. Classical Ciphers

*For two thousand years people protected messages by hand: shifting letters,
swapping them for others, changing alphabets as they went, and shuffling their
order. In this chapter you build each of those ciphers in a few lines of
Python and then break every one of them, the way al-Kindi, Kasiski, Friedman
and the codebreakers of Warsaw and Bletchley Park did. Each break taught
cryptographers something a good cipher must do, and those lessons are still
the design rules of the ciphers in your phone.*

!!! abstract "In this chapter"

    **You will learn:**

    - the two basic moves, substitution and transposition, and the difference between a code and a cipher
    - Caesar, Atbash, affine and simple substitution ciphers, and how to break them by brute force, known plaintext and frequency analysis
    - the Vigenère cipher, and how Kasiski's repeats and Friedman's index of coincidence break it
    - columnar transposition and how the First World War combined both moves
    - how the Enigma machine worked, how big its key space was, and why it lost
    - unicity distance: how much ciphertext an attacker needs

    **You need:** [Chapter 1](01-What-Cryptography-Is-For.md). The only math is
    counting round the alphabet, explained in [§2.2](#22-letters-as-numbers).

    **Levels:** sections 2.1 to 2.6 are for beginners, 2.7 to 2.10 are
    intermediate, and 2.12 is expert.

## 2.1 The problem

A cipher has two parts: a **method**, known to everyone (by Kerckhoffs's
principle, [§1.5](01-What-Cryptography-Is-For.md#15-the-method-is-not-the-secret)), and a **key**, known only to the sender and receiver. Before
machines, the method had to be something a clerk could do with pen and paper,
quickly and without mistakes, often under fire. That left two basic moves:

- **Substitution:** replace each letter by another letter or symbol. The
  letters change; their order stays.
- **Transposition:** keep the letters but shuffle their order.

<figure class="mars-fig">
<svg viewBox="0 0 600 230" width="600" role="img" aria-label="Left: ATTACK becomes DWWDFN letter by letter. Right: the letters of ATTACK are shuffled into TCAKAT" xmlns="http://www.w3.org/2000/svg">
<text x="150" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Substitution</text>
<text x="150" y="40" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">letters change, order stays</text>
<rect x="84" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="95" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="106" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="117" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="128" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="139" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="150" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="161" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="172" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="183" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="194" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="205" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="84" y="156" width="22" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="84" y="156" width="22" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="95" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="106" y="156" width="22" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="106" y="156" width="22" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="117" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="128" y="156" width="22" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="128" y="156" width="22" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="139" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="150" y="156" width="22" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="150" y="156" width="22" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="161" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="172" y="156" width="22" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="172" y="156" width="22" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="183" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="194" y="156" width="22" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="194" y="156" width="22" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="205" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<line x1="95" y1="84" x2="95" y2="147" stroke="currentColor" stroke-width="1.5"/>
<polygon points="95,154 91.4,146 98.6,146" fill="currentColor"/>
<text x="450" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Transposition</text>
<line x1="117" y1="84" x2="117" y2="147" stroke="currentColor" stroke-width="1.5"/>
<polygon points="117,154 113.4,146 120.6,146" fill="currentColor"/>
<text x="450" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Transposition</text>
<line x1="139" y1="84" x2="139" y2="147" stroke="currentColor" stroke-width="1.5"/>
<polygon points="139,154 135.4,146 142.6,146" fill="currentColor"/>
<text x="450" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Transposition</text>
<line x1="161" y1="84" x2="161" y2="147" stroke="currentColor" stroke-width="1.5"/>
<polygon points="161,154 157.4,146 164.6,146" fill="currentColor"/>
<text x="450" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Transposition</text>
<line x1="183" y1="84" x2="183" y2="147" stroke="currentColor" stroke-width="1.5"/>
<polygon points="183,154 179.4,146 186.6,146" fill="currentColor"/>
<text x="450" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Transposition</text>
<line x1="205" y1="84" x2="205" y2="147" stroke="currentColor" stroke-width="1.5"/>
<polygon points="205,154 201.4,146 208.6,146" fill="currentColor"/>
<text x="450" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Transposition</text>
<text x="450" y="40" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">letters stay, order changes</text>
<rect x="384" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="395" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="406" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="417" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="428" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="439" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="450" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="461" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="472" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="483" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="494" y="56" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="505" y="73.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="384" y="156" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="395" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="406" y="156" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="417" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="428" y="156" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="439" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="450" y="156" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="461" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="472" y="156" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="483" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="494" y="156" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="505" y="173.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<line x1="417" y1="84" x2="397.1" y2="147.3" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="395,154 394,145.3 400.8,147.4" fill="currentColor" class="acc-fill"/>
<line x1="483" y1="84" x2="421.8" y2="148.9" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="417,154 419.9,145.7 425.1,150.6" fill="currentColor" class="acc-fill"/>
<line x1="395" y1="84" x2="435.3" y2="148.1" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="439,154 431.7,149.1 437.8,145.3" fill="currentColor" class="acc-fill"/>
<line x1="505" y1="84" x2="464.7" y2="148.1" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="461,154 462.2,145.3 468.3,149.1" fill="currentColor" class="acc-fill"/>
<line x1="461" y1="84" x2="480.9" y2="147.3" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="483,154 477.2,147.4 484,145.3" fill="currentColor" class="acc-fill"/>
<line x1="439" y1="84" x2="500.2" y2="148.9" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="505,154 496.9,150.6 502.1,145.7" fill="currentColor" class="acc-fill"/>
<text x="150" y="212" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">Caesar, k = 3</text>
<text x="450" y="212" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">one fixed shuffle of six places</text>
</svg>
<figcaption>Figure 2.1. The two basic moves. Every hand cipher in this chapter is one of them or a mix of both, and so is every round of a modern cipher.</figcaption>
</figure>

Both are very old. Around 1900 BC an Egyptian scribe at Beni Hasan swapped
ordinary hieroglyphs for rare ones in the tomb of Khnumhotep II, though to
impress rather than to hide. The Book of Jeremiah writes "Sheshach" for
"Babel" using **Atbash**, which swaps the Hebrew alphabet end to end. Greek
and Roman writers describe the Spartan **skytale**, a strip of parchment wound
round a rod and written along it, so that unwound it is a jumble: a
transposition, if the story is true (historians now doubt that it was used to
hide anything). Suetonius, writing around AD 120, says Julius Caesar wrote
confidential letters by moving each letter three places along the alphabet.
In India the *Kama Sutra* (around the 3rd century AD) lists secret writing,
*mlecchita vikalpa*, among the 64 arts; a later commentary describes it as
swapping letters in fixed pairs, a substitution. Chinese military writers,
whose script has thousands of characters, used codes instead: tallies whose
length stood for a fixed message, and letters cut into three parts carried by
three messengers. See [The ancient world](../history/01-Ancient.md).

<figure class="mars-fig">
<svg viewBox="0 0 620 260" width="620" role="img" aria-label="A rod with a strip wound round it shows ATTA along the front; unwound, the strip reads ACDTKATAWATN" xmlns="http://www.w3.org/2000/svg">
<text x="310" y="20" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Written along the rod: ATTA / CKAT / DAWN</text>
<rect x="110" y="40" width="400" height="70" rx="30" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<path d="M140 40 L185 110" stroke="currentColor" stroke-width="1.2" fill="none"/>
<path d="M225 40 L270 110" stroke="currentColor" stroke-width="1.2" fill="none"/>
<path d="M310 40 L355 110" stroke="currentColor" stroke-width="1.2" fill="none"/>
<path d="M395 40 L440 110" stroke="currentColor" stroke-width="1.2" fill="none"/>
<text x="180" y="83" font-size="18" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<text x="265" y="83" font-size="18" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<text x="350" y="83" font-size="18" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<text x="435" y="83" font-size="18" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<text x="310" y="132" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">a strip wound round a rod; rows 2 and 3 run round the back</text>
<rect x="130" y="160" width="30" height="32" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="130" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="145" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="160" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="175" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="190" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="205" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="220" y="160" width="30" height="32" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="220" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="235" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="250" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="265" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="280" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="295" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="310" y="160" width="30" height="32" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="310" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="325" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="340" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="355" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="370" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="385" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="400" y="160" width="30" height="32" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="400" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="415" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="430" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="445" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="460" y="160" width="30" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="475" y="181.4" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<text x="310" y="216" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">unwound: ACDTKATAWATN</text>
<text x="310" y="236" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">the highlighted letters are the front row, now three places apart</text>
</svg>
<figcaption>Figure 2.2. The skytale as Greek writers describe it. Writing along the rod and unwinding the strip is a transposition: the rod's thickness is the key, since only a rod of the same size lines the letters up again.</figcaption>
</figure>

**Codes and ciphers.** A **cipher** works on letters (or bits) and can encrypt
anything. A **code** replaces whole words or phrases by code groups from a
book: "ATTACK" might be 3172. Codes were the main tool of diplomats for
centuries. Europe's **nomenclators**, from 1379 on, combined a cipher alphabet
with a code list for common names; the Zimmermann telegram of 1917 was in a
German diplomatic codebook, and China's telegraph code of 1871 gave each
character a four-digit number that clerks could then encrypt. Codes are broken
much like ciphers (by counting and guessing), but this book is about ciphers,
because that is what computers use.

The rest of the chapter follows the history in order: each cipher below was
built to fix the weakness of the one before, and each fell in its turn.

<figure class="mars-fig">
<svg viewBox="0 0 540 530" width="540" role="img" aria-label="Timeline from Caesar around 50 BC to the decipherment of Mary, Queen of Scots's letters in 2023" xmlns="http://www.w3.org/2000/svg">
<text x="270" y="22" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">Making and breaking hand ciphers</text>
<line x1="104" y1="36" x2="104" y2="498" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="49" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c. 50 BC</text>
<circle cx="104" cy="44" r="4" fill="currentColor"/>
<text x="118" y="49" font-size="13" text-anchor="start" fill="currentColor">Caesar's shift of three (Suetonius)</text>
<text x="90" y="79" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">9th c.</text>
<circle cx="104" cy="74" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="79" font-size="13" text-anchor="start" fill="currentColor">al-Kindi's treatise on frequency analysis</text>
<text x="90" y="109" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">c. 1467</text>
<circle cx="104" cy="104" r="4" fill="currentColor"/>
<text x="118" y="109" font-size="13" text-anchor="start" fill="currentColor">Alberti's cipher disk</text>
<text x="90" y="139" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1518</text>
<circle cx="104" cy="134" r="4" fill="currentColor"/>
<text x="118" y="139" font-size="13" text-anchor="start" fill="currentColor">Trithemius prints the tabula recta</text>
<text x="90" y="169" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1553</text>
<circle cx="104" cy="164" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="169" font-size="13" text-anchor="start" fill="currentColor">Bellaso's keyword cipher</text>
<text x="90" y="199" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1586</text>
<circle cx="104" cy="194" r="4" fill="currentColor"/>
<text x="118" y="199" font-size="13" text-anchor="start" fill="currentColor">Phelippes reads Mary's letters</text>
<text x="90" y="229" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1854</text>
<circle cx="104" cy="224" r="4" fill="currentColor"/>
<text x="118" y="229" font-size="13" text-anchor="start" fill="currentColor">Babbage breaks Vigenère, unpublished</text>
<text x="90" y="259" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1863</text>
<circle cx="104" cy="254" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="259" font-size="13" text-anchor="start" fill="currentColor">Kasiski publishes the break</text>
<text x="90" y="289" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1893</text>
<circle cx="104" cy="284" r="4" fill="currentColor"/>
<text x="118" y="289" font-size="13" text-anchor="start" fill="currentColor">Bazeries reads the Great Cipher</text>
<text x="90" y="319" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1918</text>
<circle cx="104" cy="314" r="4" fill="currentColor"/>
<text x="118" y="319" font-size="13" text-anchor="start" fill="currentColor">Painvin breaks ADFGVX</text>
<text x="90" y="349" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1920</text>
<circle cx="104" cy="344" r="4" fill="currentColor"/>
<text x="118" y="349" font-size="13" text-anchor="start" fill="currentColor">Friedman's index of coincidence</text>
<text x="90" y="379" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1929</text>
<circle cx="104" cy="374" r="4" fill="currentColor"/>
<text x="118" y="379" font-size="13" text-anchor="start" fill="currentColor">Hill's matrix cipher</text>
<text x="90" y="409" font-size="13" text-anchor="end" fill="currentColor" class="acc-fill" font-weight="bold">1932</text>
<circle cx="104" cy="404" r="5" fill="currentColor" class="acc-fill"/>
<text x="118" y="409" font-size="13" text-anchor="start" fill="currentColor">Rejewski reconstructs Enigma</text>
<text x="90" y="439" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1940</text>
<circle cx="104" cy="434" r="4" fill="currentColor"/>
<text x="118" y="439" font-size="13" text-anchor="start" fill="currentColor">first Turing–Welchman bombe</text>
<text x="90" y="469" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">1949</text>
<circle cx="104" cy="464" r="4" fill="currentColor"/>
<text x="118" y="469" font-size="13" text-anchor="start" fill="currentColor">Shannon: confusion, diffusion, unicity</text>
<text x="90" y="499" font-size="13" text-anchor="end" fill="currentColor" font-weight="bold">2023</text>
<circle cx="104" cy="494" r="4" fill="currentColor"/>
<text x="118" y="499" font-size="13" text-anchor="start" fill="currentColor">Mary's lost letters read by computer</text>
</svg>
<figcaption>Figure 2.3. The chapter's story in dates. Each cipher held until someone found the pattern it let through; the highlighted dates are the big turns.</figcaption>
</figure>

## 2.2 Letters as numbers

All the examples work on the 26 letters A to Z, numbered $A = 0$, $B = 1$, up
to $Z = 25$. Arithmetic is done **mod 26**: count round the alphabet like the
hours on a clock, so that after $Z$ comes $A$ again. $X + 5$ is
$23 + 5 = 28$, and $28 \bmod 26 = 2$, which is $C$.

In Python, `A.index(c)` turns a letter into its number and `A[n % 26]` turns a
number back into a letter. [Chapter 3](03-The-Arithmetic-of-Secrets.md)
studies this arithmetic properly; here you need only the clock picture.

## 2.3 Shift ciphers: Caesar and Atbash

**How it works.** Pick a key $k$ from 1 to 25. Encrypt each letter $x$ to
$x + k \bmod 26$; decrypt with $x - k \bmod 26$. Caesar used $k = 3$, so
$A \to D$, $B \to E$, and $X \to A$. ROT13, used on the internet to hide puzzle
answers and spoilers, is the shift with $k = 13$, which is its own inverse
since $13 + 13 = 26$.

<figure class="mars-fig">
<svg viewBox="0 0 380 380" width="380" role="img" aria-label="A cipher wheel: outer ring A to Z, inner ring shifted three places so that A sits over D" xmlns="http://www.w3.org/2000/svg">
<circle cx="190" cy="190" r="175" fill="none" stroke="currentColor" stroke-width="1.2"/>
<circle cx="190" cy="190" r="140" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.2"/>
<circle cx="190" cy="190" r="105" fill="none" stroke="currentColor" stroke-width="1.2"/>
<line x1="202.7" y1="85.8" x2="211.1" y2="16.3" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="37.5" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold">A</text>
<text x="190" y="72.5" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">D</text>
<line x1="227.2" y1="91.8" x2="252.1" y2="26.4" stroke="currentColor" stroke-width="0.6"/>
<text x="227.7" y="42.1" font-size="14" text-anchor="middle" fill="currentColor">B</text>
<text x="219.3" y="76.1" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">E</text>
<line x1="249.6" y1="103.6" x2="289.4" y2="46" stroke="currentColor" stroke-width="0.6"/>
<text x="263.2" y="55.5" font-size="14" text-anchor="middle" fill="currentColor">C</text>
<text x="246.9" y="86.5" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">F</text>
<line x1="268.6" y1="120.4" x2="321" y2="74" stroke="currentColor" stroke-width="0.6"/>
<text x="294.4" y="77.1" font-size="14" text-anchor="middle" fill="currentColor">D</text>
<text x="271.2" y="103.3" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">G</text>
<line x1="283" y1="141.2" x2="345" y2="108.7" stroke="currentColor" stroke-width="0.6"/>
<text x="319.6" y="105.5" font-size="14" text-anchor="middle" fill="currentColor">E</text>
<text x="290.8" y="125.4" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">H</text>
<line x1="291.9" y1="164.9" x2="359.9" y2="148.1" stroke="currentColor" stroke-width="0.6"/>
<text x="337.3" y="139.1" font-size="14" text-anchor="middle" fill="currentColor">F</text>
<text x="304.5" y="151.6" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">I</text>
<line x1="295" y1="190" x2="365" y2="190" stroke="currentColor" stroke-width="0.6"/>
<text x="346.4" y="176" font-size="14" text-anchor="middle" fill="currentColor">G</text>
<text x="311.6" y="180.2" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">J</text>
<line x1="291.9" y1="215.1" x2="359.9" y2="231.9" stroke="currentColor" stroke-width="0.6"/>
<text x="346.4" y="214" font-size="14" text-anchor="middle" fill="currentColor">H</text>
<text x="311.6" y="209.8" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">K</text>
<line x1="283" y1="238.8" x2="345" y2="271.3" stroke="currentColor" stroke-width="0.6"/>
<text x="337.3" y="250.9" font-size="14" text-anchor="middle" fill="currentColor">I</text>
<text x="304.5" y="238.4" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">L</text>
<line x1="268.6" y1="259.6" x2="321" y2="306" stroke="currentColor" stroke-width="0.6"/>
<text x="319.6" y="284.5" font-size="14" text-anchor="middle" fill="currentColor">J</text>
<text x="290.8" y="264.6" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">M</text>
<line x1="249.6" y1="276.4" x2="289.4" y2="334" stroke="currentColor" stroke-width="0.6"/>
<text x="294.4" y="312.9" font-size="14" text-anchor="middle" fill="currentColor">K</text>
<text x="271.2" y="286.7" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">N</text>
<line x1="227.2" y1="288.2" x2="252.1" y2="353.6" stroke="currentColor" stroke-width="0.6"/>
<text x="263.2" y="334.5" font-size="14" text-anchor="middle" fill="currentColor">L</text>
<text x="246.9" y="303.5" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">O</text>
<line x1="202.7" y1="294.2" x2="211.1" y2="363.7" stroke="currentColor" stroke-width="0.6"/>
<text x="227.7" y="347.9" font-size="14" text-anchor="middle" fill="currentColor">M</text>
<text x="219.3" y="313.9" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">P</text>
<line x1="177.3" y1="294.2" x2="168.9" y2="363.7" stroke="currentColor" stroke-width="0.6"/>
<text x="190" y="352.5" font-size="14" text-anchor="middle" fill="currentColor">N</text>
<text x="190" y="317.5" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">Q</text>
<line x1="152.8" y1="288.2" x2="127.9" y2="353.6" stroke="currentColor" stroke-width="0.6"/>
<text x="152.3" y="347.9" font-size="14" text-anchor="middle" fill="currentColor">O</text>
<text x="160.7" y="313.9" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">R</text>
<line x1="130.4" y1="276.4" x2="90.6" y2="334" stroke="currentColor" stroke-width="0.6"/>
<text x="116.8" y="334.5" font-size="14" text-anchor="middle" fill="currentColor">P</text>
<text x="133.1" y="303.5" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">S</text>
<line x1="111.4" y1="259.6" x2="59" y2="306" stroke="currentColor" stroke-width="0.6"/>
<text x="85.6" y="312.9" font-size="14" text-anchor="middle" fill="currentColor">Q</text>
<text x="108.8" y="286.7" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">T</text>
<line x1="97" y1="238.8" x2="35" y2="271.3" stroke="currentColor" stroke-width="0.6"/>
<text x="60.4" y="284.5" font-size="14" text-anchor="middle" fill="currentColor">R</text>
<text x="89.2" y="264.6" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">U</text>
<line x1="88.1" y1="215.1" x2="20.1" y2="231.9" stroke="currentColor" stroke-width="0.6"/>
<text x="42.7" y="250.9" font-size="14" text-anchor="middle" fill="currentColor">S</text>
<text x="75.5" y="238.4" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">V</text>
<line x1="85" y1="190" x2="15" y2="190" stroke="currentColor" stroke-width="0.6"/>
<text x="33.6" y="214" font-size="14" text-anchor="middle" fill="currentColor">T</text>
<text x="68.4" y="209.8" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">W</text>
<line x1="88.1" y1="164.9" x2="20.1" y2="148.1" stroke="currentColor" stroke-width="0.6"/>
<text x="33.6" y="176" font-size="14" text-anchor="middle" fill="currentColor">U</text>
<text x="68.4" y="180.2" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">X</text>
<line x1="97" y1="141.2" x2="35" y2="108.7" stroke="currentColor" stroke-width="0.6"/>
<text x="42.7" y="139.1" font-size="14" text-anchor="middle" fill="currentColor">V</text>
<text x="75.5" y="151.6" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">Y</text>
<line x1="111.4" y1="120.4" x2="59" y2="74" stroke="currentColor" stroke-width="0.6"/>
<text x="60.4" y="105.5" font-size="14" text-anchor="middle" fill="currentColor">W</text>
<text x="89.2" y="125.4" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">Z</text>
<line x1="130.4" y1="103.6" x2="90.6" y2="46" stroke="currentColor" stroke-width="0.6"/>
<text x="85.6" y="77.1" font-size="14" text-anchor="middle" fill="currentColor">X</text>
<text x="108.8" y="103.3" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">A</text>
<line x1="152.8" y1="91.8" x2="127.9" y2="26.4" stroke="currentColor" stroke-width="0.6"/>
<text x="116.8" y="55.5" font-size="14" text-anchor="middle" fill="currentColor">Y</text>
<text x="133.1" y="86.5" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">B</text>
<line x1="177.3" y1="85.8" x2="168.9" y2="16.3" stroke="currentColor" stroke-width="0.6"/>
<text x="152.3" y="42.1" font-size="14" text-anchor="middle" fill="currentColor">Z</text>
<text x="160.7" y="76.1" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">C</text>
<text x="190" y="178" font-size="13" text-anchor="middle" fill="currentColor">outer: plain</text>
<text x="190" y="198" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill">inner: cipher</text>
<text x="190" y="218" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">k = 3</text>
</svg>
<figcaption>Figure 2.4. A shift cipher as a wheel. Read a plaintext letter on the outer ring and the ciphertext letter just inside it: A becomes D, X becomes A. Turning the inner ring changes the key, and there are only 25 useful positions.</figcaption>
</figure>

**By hand.** ATTACK AT DAWN with $k = 3$: A (0) becomes 3, D; T (19) becomes
22, W; C (2) becomes F; K (10) becomes N; W (22) becomes 25, Z; N (13) becomes
Q. The ciphertext is DWWDFN DW GDZQ.

**Atbash** is a reflection instead of a shift: $x \to 25 - x$, so $A \leftrightarrow Z$,
$B \leftrightarrow Y$. Applying it twice gives back the original. It has no
key at all.

<figure class="mars-fig">
<svg viewBox="0 0 680 270" width="680" role="img" aria-label="Three alphabet maps: Caesar shifts by three, ROT13 by thirteen, Atbash reverses the alphabet" xmlns="http://www.w3.org/2000/svg">
<text x="92" y="28" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">plain</text>
<text x="92" y="54" font-size="12" text-anchor="end" fill="currentColor" font-weight="bold">Caesar, k = 3</text>
<rect x="100" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="111" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="122" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="133" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="144" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="155" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="166" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="188" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="199" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="210" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="221" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="232" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="243" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="254" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="265" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="276" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="287" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="298" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="309" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">J</text>
<rect x="320" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="331" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="342" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="353" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="364" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="375" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="386" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="397" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="408" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="419" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="430" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="441" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="452" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="463" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="474" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="485" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="496" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="518" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="529" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="540" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="551" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">U</text>
<rect x="562" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="573" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="584" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="595" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="606" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="617" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">X</text>
<rect x="628" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="639" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="650" y="10" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="661" y="27.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<rect x="100" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="111" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="122" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="133" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="144" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="155" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="166" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="188" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="199" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="210" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="221" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="232" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="243" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">J</text>
<rect x="254" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="265" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="276" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="287" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="298" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="309" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="320" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="331" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="342" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="353" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="364" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="375" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="386" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="397" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="408" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="419" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="430" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="441" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="452" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="463" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="474" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="485" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">U</text>
<rect x="496" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="518" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="529" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="540" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="551" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">X</text>
<rect x="562" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="573" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="584" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="595" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<rect x="606" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="617" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="628" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="639" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="650" y="36" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="661" y="53.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<text x="92" y="114" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">plain</text>
<text x="92" y="140" font-size="12" text-anchor="end" fill="currentColor" font-weight="bold">ROT13</text>
<rect x="100" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="111" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="122" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="133" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="144" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="155" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="166" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="188" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="199" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="210" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="221" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="232" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="243" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="254" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="265" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="276" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="287" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="298" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="309" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">J</text>
<rect x="320" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="331" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="342" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="353" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="364" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="375" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="386" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="397" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="408" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="419" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="430" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="441" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="452" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="463" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="474" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="485" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="496" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="518" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="529" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="540" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="551" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">U</text>
<rect x="562" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="573" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="584" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="595" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="606" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="617" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">X</text>
<rect x="628" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="639" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="650" y="96" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="661" y="113.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<rect x="100" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="111" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="122" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="133" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="144" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="155" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="166" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="188" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="199" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="210" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="221" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="232" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="243" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="254" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="265" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">U</text>
<rect x="276" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="287" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="298" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="309" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="320" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="331" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">X</text>
<rect x="342" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="353" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="364" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="375" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<rect x="386" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="397" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="408" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="419" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="430" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="441" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="452" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="463" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="474" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="485" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="496" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="518" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="529" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="540" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="551" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="562" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="573" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="584" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="595" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">J</text>
<rect x="606" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="617" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="628" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="639" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="650" y="122" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="661" y="139.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<text x="92" y="200" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">plain</text>
<text x="92" y="226" font-size="12" text-anchor="end" fill="currentColor" font-weight="bold">Atbash</text>
<rect x="100" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="111" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="122" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="133" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="144" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="155" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="166" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="188" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="199" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="210" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="221" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="232" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="243" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="254" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="265" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="276" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="287" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="298" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="309" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">J</text>
<rect x="320" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="331" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="342" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="353" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="364" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="375" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="386" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="397" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="408" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="419" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="430" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="441" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="452" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="463" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="474" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="485" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="496" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="518" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="529" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="540" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="551" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">U</text>
<rect x="562" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="573" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="584" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="595" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="606" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="617" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">X</text>
<rect x="628" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="639" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="650" y="182" width="22" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="661" y="199.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<rect x="100" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="111" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<rect x="122" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="133" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="144" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="155" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">X</text>
<rect x="166" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="188" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="199" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="210" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="221" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">U</text>
<rect x="232" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="243" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="254" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="265" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="276" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="287" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="298" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="309" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="320" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="331" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="342" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="353" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="364" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="375" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="386" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="397" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="408" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="419" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="430" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="441" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="452" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="463" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">J</text>
<rect x="474" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="485" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="496" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="518" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="529" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="540" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="551" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="562" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="573" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="584" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="595" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="606" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="617" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="628" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="639" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="650" y="208" width="22" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="661" y="225.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
</svg>
<figcaption>Figure 2.5. Three keyless or nearly keyless maps. ROT13 and Atbash are their own inverses: apply them twice and you are back where you started.</figcaption>
</figure>

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def shift(s, k):
    return "".join(A[(A.index(c) + k) % 26] if c in A else c for c in s.upper())

def atbash(s):
    return "".join(A[25 - A.index(c)] if c in A else c for c in s.upper())

c = shift("ATTACK AT DAWN", 3)
print(c)                                   # DWWDFN DW GDZQ
print(atbash("WIZARD"), shift("HELLO", 13))  # DRAZIW URYYB
for k in range(1, 26):                     # the whole attack: try every key
    print(k, shift(c, -k))
```

**Breaking it.** There are only 25 keys, so try them all and read the line that
makes sense. The loop prints 25 lines, and line 3 is `3 ATTACK AT DAWN`. This
is **brute force**, or exhaustive key search, and it is the first lesson of
the subject: **the key space must be too big to search.**

A computer can even pick the right line itself. English has a known letter
distribution: E is about 12.7% of letters, T 9.1%, A 8.2%, down to Z at
0.07%. The **chi-squared** statistic measures how far a text's counts are from
those percentages; the true decryption scores lowest.

```python
F = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
     6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074]   # English, per cent

def chi(t):                                # how far t's letter counts are from English; small is good
    t = [c for c in t if c in A]
    return sum((t.count(A[i]) - F[i] * len(t) / 100) ** 2 / (F[i] * len(t) / 100) for i in range(26))

c = shift("THE ENEMY KNOWS THE SYSTEM AND WILL TRY EVERY KEY", 11)
k = min(range(26), key=lambda k: chi(shift(c, -k)))
print(c)               # ESP PYPXJ VYZHD ESP DJDEPX LYO HTWW ECJ PGPCJ VPJ
print(k, shift(c, -k)) # 11 THE ENEMY KNOWS THE SYSTEM AND WILL TRY EVERY KEY
```

We'll use `chi` again to break the Vigenère cipher.

<figure class="mars-fig">
<svg viewBox="0 0 620 280" width="620" role="img" aria-label="Bar chart of chi-squared scores for the 26 trial keys; key 11 is far lower than the rest" xmlns="http://www.w3.org/2000/svg">
<line x1="60" y1="230" x2="600" y2="230" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="234" font-size="12" text-anchor="end" fill="currentColor">0</text>
<line x1="60" y1="187.1" x2="600" y2="187.1" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="191.1" font-size="12" text-anchor="end" fill="currentColor">500</text>
<line x1="60" y1="144.2" x2="600" y2="144.2" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="148.2" font-size="12" text-anchor="end" fill="currentColor">1000</text>
<line x1="60" y1="101.2" x2="600" y2="101.2" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="105.2" font-size="12" text-anchor="end" fill="currentColor">1500</text>
<line x1="60" y1="58.3" x2="600" y2="58.3" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="62.3" font-size="12" text-anchor="end" fill="currentColor">2000</text>
<rect x="63.1" y="178.1" width="14.5" height="51.9" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="70.4" y="246" font-size="11" text-anchor="middle" fill="currentColor">0</text>
<rect x="83.9" y="213.2" width="14.5" height="16.8" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="91.2" y="246" font-size="11" text-anchor="middle" fill="currentColor">1</text>
<rect x="104.7" y="213.4" width="14.5" height="16.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="111.9" y="246" font-size="11" text-anchor="middle" fill="currentColor">2</text>
<rect x="125.4" y="205.4" width="14.5" height="24.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="132.7" y="246" font-size="11" text-anchor="middle" fill="currentColor">3</text>
<rect x="146.2" y="198.5" width="14.5" height="31.5" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="153.5" y="246" font-size="11" text-anchor="middle" fill="currentColor">4</text>
<rect x="167" y="150.3" width="14.5" height="79.7" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="174.2" y="246" font-size="11" text-anchor="middle" fill="currentColor">5</text>
<rect x="187.7" y="114.6" width="14.5" height="115.4" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="195" y="246" font-size="11" text-anchor="middle" fill="currentColor">6</text>
<rect x="208.5" y="191.7" width="14.5" height="38.3" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="215.8" y="246" font-size="11" text-anchor="middle" fill="currentColor">7</text>
<rect x="229.3" y="189.8" width="14.5" height="40.2" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="236.5" y="246" font-size="11" text-anchor="middle" fill="currentColor">8</text>
<rect x="250" y="209.7" width="14.5" height="20.3" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="257.3" y="246" font-size="11" text-anchor="middle" fill="currentColor">9</text>
<rect x="270.8" y="144.5" width="14.5" height="85.5" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="278.1" y="246" font-size="11" text-anchor="middle" fill="currentColor">10</text>
<rect x="291.6" y="226" width="14.5" height="4" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="298.8" y="246" font-size="11" text-anchor="middle" fill="currentColor">11</text>
<rect x="312.3" y="172.3" width="14.5" height="57.7" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="319.6" y="246" font-size="11" text-anchor="middle" fill="currentColor">12</text>
<rect x="333.1" y="196.3" width="14.5" height="33.7" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="340.4" y="246" font-size="11" text-anchor="middle" fill="currentColor">13</text>
<rect x="353.9" y="171.2" width="14.5" height="58.8" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="361.2" y="246" font-size="11" text-anchor="middle" fill="currentColor">14</text>
<rect x="374.7" y="210.4" width="14.5" height="19.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="381.9" y="246" font-size="11" text-anchor="middle" fill="currentColor">15</text>
<rect x="395.4" y="40.4" width="14.5" height="189.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="402.7" y="246" font-size="11" text-anchor="middle" fill="currentColor">16</text>
<rect x="416.2" y="211.6" width="14.5" height="18.4" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="423.5" y="246" font-size="11" text-anchor="middle" fill="currentColor">17</text>
<rect x="437" y="135.5" width="14.5" height="94.5" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="444.2" y="246" font-size="11" text-anchor="middle" fill="currentColor">18</text>
<rect x="457.7" y="148.6" width="14.5" height="81.4" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="465" y="246" font-size="11" text-anchor="middle" fill="currentColor">19</text>
<rect x="478.5" y="194.1" width="14.5" height="35.9" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="485.8" y="246" font-size="11" text-anchor="middle" fill="currentColor">20</text>
<rect x="499.3" y="194.5" width="14.5" height="35.5" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="506.5" y="246" font-size="11" text-anchor="middle" fill="currentColor">21</text>
<rect x="520" y="214.4" width="14.5" height="15.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="527.3" y="246" font-size="11" text-anchor="middle" fill="currentColor">22</text>
<rect x="540.8" y="210" width="14.5" height="20" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="548.1" y="246" font-size="11" text-anchor="middle" fill="currentColor">23</text>
<rect x="561.6" y="200.4" width="14.5" height="29.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="568.8" y="246" font-size="11" text-anchor="middle" fill="currentColor">24</text>
<rect x="582.3" y="46.8" width="14.5" height="183.2" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="589.6" y="246" font-size="11" text-anchor="middle" fill="currentColor">25</text>
<line x1="60" y1="230" x2="600" y2="230" stroke="currentColor" stroke-width="1.5"/>
<text x="16" y="127" font-size="12" text-anchor="middle" fill="currentColor" transform="rotate(-90 16 127)">chi-squared</text>
<text x="330" y="270" font-size="12" text-anchor="middle" fill="currentColor">trial key k</text>
<rect x="272.4" y="27.6" width="52.8" height="16.9" style="fill: var(--md-default-bg-color)"/>
<text x="298.8" y="40" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">k = 11</text>
<line x1="298.8" y1="46" x2="298.8" y2="215" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="298.8,222 295.2,214 302.4,214" fill="currentColor" class="acc-fill"/>
</svg>
<figcaption>Figure 2.6. Letting the computer read the 25 lines. The chi-squared score for each trial key, for the ciphertext in the code above; the true key, 11, gives a decryption whose letter counts are far closer to English than any other.</figcaption>
</figure>

**The story.** Our source for Caesar's cipher is Suetonius, writing his *Lives
of the Caesars* more than a century and a half later. He says that Julius Caesar, when he had
something confidential to say, wrote it so that each letter stood for the
third letter after it, and that his nephew Augustus used a shift of one (and
wrote AA for X instead of wrapping round). It worked because few of Caesar's
enemies could read Latin, let alone guess the trick. The idea refused to die.
ROT13 spread on Usenet discussion groups in the early 1980s to hide punch lines
and spoilers, never to keep a secret. And in April 2006 Italian police caught
the Mafia boss Bernardo Provenzano, in hiding for 43 years, partly by reading
his *pizzini*, notes in which names were written as numbers shifted by three.

!!! note "Life story: the Caesar cipher"
    **Born:** Rome, 1st century BC; described by Suetonius (around AD 120) · **Purpose:** keep Caesar's
    confidential letters from casual readers · **Helped:** fine in a world where few could read; it lives on as
    ROT13 and in every cipher wheel in a cereal box · **Broken:** by anyone who tries the 25 keys; al-Kindi's
    counting (9th century) breaks any single alphabet · **Replaced by:** many-alphabet ciphers (Alberti,
    Bellaso), and in the end by machines and computers

## 2.4 The affine cipher

A step up: multiply as well as add. $E(x) = a x + b \bmod 26$. To decrypt you
must undo the multiplication, which needs a number $a^{-1}$ with
$a \cdot a^{-1} \equiv 1 \pmod{26}$. That exists only when $a$ shares no factor
with 26, so $a$ must be odd and not 13: one of 1, 3, 5, 7, 9, 11, 15, 17, 19,
21, 23, 25. Twelve choices of $a$ times 26 of $b$ is 312 keys, still nothing
for a computer.

**By hand.** With $a = 5$, $b = 8$: A (0) becomes $5 \cdot 0 + 8 = 8$, I. T (19)
becomes $95 + 8 = 103$, and $103 = 3 \cdot 26 + 25$, so Z. The inverse of 5 is
21, because $5 \cdot 21 = 105 = 4 \cdot 26 + 1$; decrypting multiplies
$(y - 8)$ by 21.

```python
def affine(s, a, b):
    return "".join(A[(a * A.index(c) + b) % 26] if c in A else c for c in s.upper())

def unaffine(s, a, b):
    ai = pow(a, -1, 26)                    # the inverse of a mod 26 (Chapter 3)
    return "".join(A[ai * (A.index(c) - b) % 26] if c in A else c for c in s)

c = affine("ATTACK AT DAWN", 5, 8)
print(c, unaffine(c, 5, 8))                # IZZISG IZ XIOV ATTACK AT DAWN
```

<figure class="mars-fig">
<svg viewBox="0 0 620 300" width="620" role="img" aria-label="Two scatter plots of ciphertext against plaintext: a = 5 hits every row once, a = 13 only two rows" xmlns="http://www.w3.org/2000/svg">
<text x="160" y="22" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">a = 5, b = 8: a shuffle</text>
<rect x="40" y="40" width="239.2" height="239.2" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<circle cx="44.6" cy="201" r="3.4" fill="currentColor" class="acc-fill"/>
<circle cx="53.8" cy="155" r="3.4" fill="currentColor"/>
<circle cx="63" cy="109" r="3.4" fill="currentColor"/>
<circle cx="72.2" cy="63" r="3.4" fill="currentColor"/>
<circle cx="81.4" cy="256.2" r="3.4" fill="currentColor"/>
<circle cx="90.6" cy="210.2" r="3.4" fill="currentColor"/>
<circle cx="99.8" cy="164.2" r="3.4" fill="currentColor"/>
<circle cx="109" cy="118.2" r="3.4" fill="currentColor"/>
<circle cx="118.2" cy="72.2" r="3.4" fill="currentColor"/>
<circle cx="127.4" cy="265.4" r="3.4" fill="currentColor"/>
<circle cx="136.6" cy="219.4" r="3.4" fill="currentColor"/>
<circle cx="145.8" cy="173.4" r="3.4" fill="currentColor"/>
<circle cx="155" cy="127.4" r="3.4" fill="currentColor"/>
<circle cx="164.2" cy="81.4" r="3.4" fill="currentColor"/>
<circle cx="173.4" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="182.6" cy="228.6" r="3.4" fill="currentColor"/>
<circle cx="191.8" cy="182.6" r="3.4" fill="currentColor"/>
<circle cx="201" cy="136.6" r="3.4" fill="currentColor"/>
<circle cx="210.2" cy="90.6" r="3.4" fill="currentColor"/>
<circle cx="219.4" cy="44.6" r="3.4" fill="currentColor" class="acc-fill"/>
<circle cx="228.6" cy="237.8" r="3.4" fill="currentColor"/>
<circle cx="237.8" cy="191.8" r="3.4" fill="currentColor"/>
<circle cx="247" cy="145.8" r="3.4" fill="currentColor"/>
<circle cx="256.2" cy="99.8" r="3.4" fill="currentColor"/>
<circle cx="265.4" cy="53.8" r="3.4" fill="currentColor"/>
<circle cx="274.6" cy="247" r="3.4" fill="currentColor"/>
<text x="159.6" y="297.2" font-size="12" text-anchor="middle" fill="currentColor">plaintext x (A…Z)</text>
<text x="30" y="159.6" font-size="12" text-anchor="middle" fill="currentColor" transform="rotate(-90 30 159.6)">ciphertext</text>
<text x="470" y="22" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">a = 13, b = 0: two letters only</text>
<rect x="350" y="40" width="239.2" height="239.2" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.8"/>
<circle cx="354.6" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="363.8" cy="155" r="3.4" fill="currentColor"/>
<circle cx="373" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="382.2" cy="155" r="3.4" fill="currentColor"/>
<circle cx="391.4" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="400.6" cy="155" r="3.4" fill="currentColor"/>
<circle cx="409.8" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="419" cy="155" r="3.4" fill="currentColor"/>
<circle cx="428.2" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="437.4" cy="155" r="3.4" fill="currentColor"/>
<circle cx="446.6" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="455.8" cy="155" r="3.4" fill="currentColor"/>
<circle cx="465" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="474.2" cy="155" r="3.4" fill="currentColor"/>
<circle cx="483.4" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="492.6" cy="155" r="3.4" fill="currentColor"/>
<circle cx="501.8" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="511" cy="155" r="3.4" fill="currentColor"/>
<circle cx="520.2" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="529.4" cy="155" r="3.4" fill="currentColor"/>
<circle cx="538.6" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="547.8" cy="155" r="3.4" fill="currentColor"/>
<circle cx="557" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="566.2" cy="155" r="3.4" fill="currentColor"/>
<circle cx="575.4" cy="274.6" r="3.4" fill="currentColor"/>
<circle cx="584.6" cy="155" r="3.4" fill="currentColor"/>
<text x="469.6" y="297.2" font-size="12" text-anchor="middle" fill="currentColor">plaintext x (A…Z)</text>
<text x="340" y="159.6" font-size="12" text-anchor="middle" fill="currentColor" transform="rotate(-90 340 159.6)">ciphertext</text>
</svg>
<figcaption>Figure 2.7. Why <em>a</em> must be coprime to 26. With <em>a</em> = 5 every ciphertext letter is used exactly once (the highlighted dots are A to I and T to Z from the worked example). With <em>a</em> = 13 the whole alphabet lands on A and N, and the message can't be decrypted.</figcaption>
</figure>

**Breaking it with known plaintext.** Suppose the attacker knows, or guesses,
that the message starts with AT, and sees that it became IZ. That gives two
equations, $a \cdot 0 + b \equiv 8$ and $a \cdot 19 + b \equiv 25$. Subtract
them: $19a \equiv 17 \pmod{26}$, so $a = 17 \cdot 19^{-1} \bmod 26$. Two
letters of known plaintext give the whole key, without trying a single wrong
one:

```python
x1, y1, x2, y2 = A.index("A"), A.index("I"), A.index("T"), A.index("Z")
a = (y1 - y2) * pow(x1 - x2, -1, 26) % 26
b = (y1 - a * x1) % 26
print(a, b)                                # 5 8
```

(This works whenever $x_1 - x_2$ has an inverse mod 26; otherwise pick another
pair.) It is a small example of an idea that reaches far: any cipher whose
encryption is **linear**, made of additions and multiplications, can be
solved like a system of equations from known plaintext. Modern ciphers put a
non-linear step in every round for exactly this reason
([Chapter 6](06-Block-Ciphers.md)).

!!! note "Life story: the affine cipher"
    **Born:** a teaching cipher of modern textbooks; there is no good evidence that anyone used it in earnest ·
    **Purpose:** the simplest cipher built from arithmetic mod 26, a bridge from Caesar to the number theory of
    [Chapter 3](03-The-Arithmetic-of-Secrets.md) · **Helped:** it shows why inverses matter and why linear
    ciphers fall to known plaintext · **Status:** a classroom and puzzle cipher, never secure

## 2.5 Simple substitution and frequency analysis

**How it works.** The key is any shuffle of the alphabet: A might become Q, B
become W, and so on, with no rule at all. There are $26! \approx 4 \times 10^{26}$
keys, about $2^{88}$, far more than DES's $2^{56}$. By [§1.7](01-What-Cryptography-Is-For.md#17-how-strong-is-strong) no computer could
try them all.

Substitution ciphers were used across the world for a thousand years: by Arab
chancelleries, Italian city-states, and Mary, Queen of Scots, whose
nomenclator was read by Elizabeth I's decipherer Thomas Phelippes in 1586. The
letters it exposed sent her to the block in February 1587.

**The break.** Abu Yusuf Ya'qub al-Kindi (about 801 to 873) worked in Baghdad
under the Abbasid caliphs. Among his more than 250 works is *A Treatise on
Deciphering Cryptographic Messages*, known only by its title until a copy
turned up in the Süleymaniye Library in Istanbul and was published in 1987.
It is the oldest surviving text that explains how to break a cipher. In
paraphrase:

> Find a different text in the same language, long enough to fill a sheet or
> so, and count how often each letter appears. Call the commonest letter the
> "first", the next the "second", and so on. Then count the symbols in the
> cipher the same way, and replace the commonest symbol with the "first"
> letter, the next with the "second", until all are accounted for.

That is **frequency analysis**. A substitution changes what each letter looks
like, but not how often it appears. Al-Kindi knew counts alone aren't enough,
so he also used which letters can stand next to each other and which words are
likely. Three and a half centuries later Ibn 'Adlan (1187 to 1268), in
Damascus, asked how long a message must be for the counts to be trusted, and
answered about 90 letters. The question "how much ciphertext does the attack
need?" is still at the center of cryptanalysis ([§2.12](#212-going-deeper)).

**Try it.** Here is a paragraph encrypted with a simple substitution. (The key
is the keyboard's top row first, QWERTYUIOP..., a bad key but no easier to
break than a random one; frequency analysis never uses the key's pattern.)

```python
from collections import Counter

TEXT = """For most of history a secret message was protected by hiding the method.
A general and his officers agreed on a way to scramble letters, and they
hoped the enemy would never guess it. The enemy usually did. Patient clerks
counted letters, noticed which ones appeared most often, and matched them to
the language of the writer. In English the letter E is the most common,
followed by T, A, O, I and N. Once a few letters are known, short words like
THE and AND appear, and the rest of the message falls into place one word at
a time. This is why every cipher in this chapter was broken in the end. Each
break taught the people who built the next cipher what they had to avoid,
and the lessons they learned are still the rules that modern ciphers follow
when they protect the messages that travel across the internet today."""

KEY = "QWERTYUIOPASDFGHJKLZXCVBNM"            # A->Q, B->W, ...
c = TEXT.upper().translate(str.maketrans(A, KEY))
print(c[:72])
# YGK DGLZ GY IOLZGKN Q LTEKTZ DTLLQUT VQL HKGZTEZTR WN IOROFU ZIT DTZIGR.

print(Counter(x for x in c if x in A).most_common(6))
# [('T', 102), ('Z', 74), ('Q', 50), ('I', 47), ('G', 44), ('L', 42)]
words = c.replace(".", " ").replace(",", " ").split()
print(Counter(w for w in words if len(w) <= 3).most_common(5))
# [('ZIT', 17), ('QFR', 8), ('Q', 6), ('GY', 3), ('ZG', 3)]
```

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Bars of the twelve commonest cipher symbols with the letter English frequency order predicts and the true letter underneath" xmlns="http://www.w3.org/2000/svg">
<line x1="110" y1="170" x2="630" y2="170" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="104" y="174" font-size="12" text-anchor="end" fill="currentColor">0</text>
<line x1="110" y1="101.8" x2="630" y2="101.8" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="104" y="105.8" font-size="12" text-anchor="end" fill="currentColor">50</text>
<line x1="110" y1="33.6" x2="630" y2="33.6" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="104" y="37.6" font-size="12" text-anchor="end" fill="currentColor">100</text>
<rect x="115" y="30.9" width="33.3" height="139.1" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="131.7" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<text x="131.7" y="218" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<text x="131.7" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="158.3" y="69.1" width="33.3" height="100.9" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="175" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<text x="175" y="218" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<text x="175" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="201.7" y="101.8" width="33.3" height="68.2" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="218.3" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<text x="218.3" y="218" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<text x="218.3" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="245" y="105.9" width="33.3" height="64.1" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="261.7" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<text x="261.7" y="218" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<text x="261.7" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="288.3" y="110" width="33.3" height="60" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="305" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<text x="305" y="218" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<text x="305" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="331.7" y="112.7" width="33.3" height="57.3" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="348.3" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<text x="348.3" y="218" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<text x="348.3" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="375" y="115.5" width="33.3" height="54.5" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="391.7" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<text x="391.7" y="218" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<text x="391.7" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="418.3" y="118.2" width="33.3" height="51.8" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="435" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<text x="435" y="218" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<text x="435" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="461.7" y="129.1" width="33.3" height="40.9" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="478.3" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<text x="478.3" y="218" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<text x="478.3" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="505" y="130.5" width="33.3" height="39.5" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="521.7" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<text x="521.7" y="218" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<text x="521.7" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="548.3" y="131.8" width="33.3" height="38.2" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="565" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<text x="565" y="218" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<text x="565" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="591.7" y="144.1" width="33.3" height="25.9" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="608.3" y="190" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<text x="608.3" y="218" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<text x="608.3" y="246" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<text x="102" y="190" font-size="12" text-anchor="end" fill="currentColor">cipher symbol</text>
<text x="102" y="218" font-size="12" text-anchor="end" fill="currentColor">English order</text>
<text x="102" y="246" font-size="12" text-anchor="end" fill="currentColor">truth</text>
<text x="320" y="290" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">highlighted: where pure counting guesses right</text>
</svg>
<figcaption>Figure 2.8. Al-Kindi's first step on the paragraph above. Matching the commonest symbols to English's commonest letters gets E, T and A right at once, then goes wrong for a few places (this text has more H and S than average), which is why the next steps use words and context.</figcaption>
</figure>

Now think like al-Kindi.

<div class="mars-steps" markdown>

1. T is by far the commonest symbol (102 of 651 letters, 15.7%): probably E. Z comes next: probably T.
2. The commonest short word is ZIT, 17 times. With Z = T and T = E, it reads T?E: surely THE, so I = H.
3. Q stands alone 6 times: A (or I). The three-letter word QFR, 8 times, starting with A: AND. So F = N and R = D.
4. Apply those six guesses and look at what appears.

</div>

```python
def show(guess):                            # apply the guesses so far; '-' for unknown letters
    return "".join(guess.get(x, "-") if x in A else x for x in c)

g = {"T": "E", "Z": "T", "I": "H", "Q": "A", "F": "N", "R": "D"}
print("\n".join(show(g).splitlines()[:2]))
```

```
--- ---T -- H--T--- A -E--ET -E--A-E -A- ---TE-TED -- H-D-N- THE -ETH-D.
A -ENE-A- AND H-- -----E-- A--EED -N A -A- T- ---A---E -ETTE--, AND THE-
```

Words start to show through. THE -ETH-D at the end of a sentence looks like
THE METHOD, giving D = M and G = O. A -ENE-A- AND H-- -----E-- could be A
GENERAL AND HIS OFFICERS; -ETTE-- is probably LETTERS. Each guess is checked
against every other place the letter appears. Six more:

```python
g.update({"G": "O", "Y": "F", "D": "M", "L": "S", "O": "I", "K": "R"})
print("\n".join(show(g).splitlines()[:2]))
```

```
FOR MOST OF HISTOR- A SE-RET MESSA-E -AS -ROTE-TED -- HIDIN- THE METHOD.
A -ENERA- AND HIS OFFI-ERS A-REED ON A -A- TO S-RAM--E -ETTERS, AND THE-
```

The rest falls out in a minute: HISTOR- is HISTORY, SE-RET is SECRET,
MESSA-E is MESSAGE. Twelve letters of key were enough to read the text, and
the remaining ones follow. That is the whole attack, and a newspaper
cryptogram is the same puzzle.

The lesson: **a huge key space is not enough.** The cipher lets the
statistics of the language through, and no number of keys hides that.

!!! note "Life story: simple substitution"
    **Born:** antiquity (the *Kama Sutra*'s letter pairs, Atbash); the standard cipher of Arab, Italian and
    French chancelleries for centuries · **Purpose:** turn letters into symbols with no rule an outsider could
    guess · **Helped:** with codewords added, as the nomenclator, it carried Europe's diplomatic secrets from
    1379 into the 19th century · **Broken:** by al-Kindi's frequency analysis in the 9th century, and routinely
    by Europe's black chambers · **Status:** newspaper cryptograms; the idea survives as the S-box inside
    every modern block cipher

!!! note "Life story: frequency analysis"
    **Born:** 9th-century Baghdad, in al-Kindi's *Treatise on Deciphering Cryptographic Messages* ·
    **Purpose:** read enemy and rival letters without the key · **Helped:** carried forward by Ibn 'Adlan and Ibn
    ad-Durayhim in Damascus and summed up by al-Qalqashandi in 1412; Europe's codebreakers relearned it in the
    Renaissance and used it for 400 years · **Status:** current in spirit: every statistical attack, from
    Friedman's index of coincidence to modern linear cryptanalysis, counts something the cipher failed to hide

**Counter-measures, and why they failed.** Cipher clerks fought back.
They dropped the spaces between words, which hides THE and AND (Ibn 'Adlan
already dealt with that). They added **nulls**, meaningless symbols. And they
used **homophones**: several symbols for each common letter, so that E's count
is spread over five or six symbols. Ibn ad-Durayhim (1312 to 1361) in Damascus
described homophonic ciphers; a Mantuan key of 1401 gives the vowels several
substitutes each. Homophones flatten single-letter counts, but pairs and
common words still show through, and Europe's black chambers read such
ciphers routinely for three centuries. The Rossignols' "Great Cipher" for
Louis XIV, a nomenclator of 587 numbers standing mostly for syllables, held out
longest: Étienne Bazeries read it only in 1893, after about three years' work.

## 2.6 Many alphabets: the Vigenère cipher

**The story.** To flatten the counts properly, change the alphabet as you go.
Leon Battista Alberti, the Florentine architect, built a cipher disk around
1467 whose inner ring could be turned in mid-message. The German abbot
Johannes Trithemius printed the full table of 26 shifted alphabets, the
*tabula recta*, in his *Polygraphia* (1518). Giovan Battista Bellaso, in 1553,
supplied the missing piece: a short **keyword** that says which alphabet to use
for each letter, easy to change and easy to remember. The method was later
named after Blaise de Vigenère, who in 1586 described a stronger variant (an
autokey, where the message itself extends the key). For three centuries it was
called *le chiffre indéchiffrable*, the indecipherable cipher. The
Confederacy still used it in the American Civil War, and the Union read it.

**How it works.** Write the keyword above the message, repeating it. Shift each
message letter by the keyword letter above it ($A = 0$, $B = 1$, ...):

| Message | A | T | T | A | C | K | A | T | D | A | W | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Key | L | E | M | O | N | L | E | M | O | N | L | E |
| Cipher | L | X | F | O | P | V | E | F | R | N | H | R |

<figure class="mars-fig">
<svg viewBox="0 0 602 602" width="602" role="img" aria-label="The 26 by 26 tabula recta; row L meets column A at L, and row E meets column T at X" xmlns="http://www.w3.org/2000/svg">
<rect x="46" y="277" width="546" height="21" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="46" y="46" width="21" height="546" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="46" y="130" width="546" height="21" rx="0" class="soft" fill="currentColor"/>
<rect x="445" y="46" width="21" height="546" rx="0" class="soft" fill="currentColor"/>
<text x="319" y="16" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">plaintext letter</text>
<text x="14" y="319" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic" transform="rotate(-90 14 319)">key letter</text>
<text x="56.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">A</text>
<text x="36" y="60.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">A</text>
<text x="56.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="77.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="98.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="119.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="140.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="161.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="182.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="203.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="224.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="245.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="266.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="287.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="308.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="329.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="350.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="371.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="392.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="413.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="434.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="455.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="476.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="497.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="518.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="539.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="560.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="581.5" y="60.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="77.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">B</text>
<text x="36" y="81.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">B</text>
<text x="56.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="77.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="98.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="119.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="140.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="161.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="182.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="203.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="224.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="245.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="266.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="287.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="308.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="329.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="350.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="371.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="392.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="413.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="434.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="455.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="476.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="497.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="518.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="539.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="560.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="581.5" y="81.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="98.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">C</text>
<text x="36" y="102.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">C</text>
<text x="56.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="77.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="98.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="119.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="140.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="161.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="182.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="203.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="224.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="245.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="266.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="287.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="308.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="329.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="350.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="371.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="392.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="413.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="434.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="455.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="476.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="497.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="518.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="539.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="560.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="581.5" y="102.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="119.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">D</text>
<text x="36" y="123.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">D</text>
<text x="56.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="77.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="98.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="119.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="140.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="161.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="182.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="203.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="224.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="245.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="266.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="287.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="308.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="329.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="350.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="371.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="392.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="413.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="434.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="455.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="476.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="497.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="518.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="539.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="560.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="581.5" y="123.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="140.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">E</text>
<text x="36" y="144.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">E</text>
<text x="56.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="77.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="98.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="119.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="140.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="161.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="182.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="203.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="224.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="245.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="266.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="287.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="308.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="329.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="350.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="371.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="392.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="413.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="434.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<rect x="445" y="130" width="21" height="21" rx="0" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<text x="455.5" y="144.5" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">X</text>
<text x="476.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="497.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="518.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="539.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="560.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="581.5" y="144.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="161.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">F</text>
<text x="36" y="165.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">F</text>
<text x="56.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="77.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="98.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="119.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="140.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="161.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="182.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="203.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="224.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="245.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="266.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="287.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="308.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="329.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="350.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="371.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="392.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="413.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="434.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="455.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="476.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="497.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="518.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="539.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="560.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="581.5" y="165.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="182.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">G</text>
<text x="36" y="186.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">G</text>
<text x="56.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="77.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="98.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="119.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="140.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="161.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="182.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="203.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="224.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="245.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="266.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="287.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="308.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="329.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="350.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="371.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="392.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="413.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="434.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="455.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="476.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="497.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="518.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="539.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="560.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="581.5" y="186.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="203.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">H</text>
<text x="36" y="207.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">H</text>
<text x="56.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="77.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="98.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="119.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="140.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="161.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="182.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="203.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="224.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="245.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="266.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="287.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="308.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="329.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="350.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="371.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="392.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="413.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="434.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="455.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="476.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="497.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="518.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="539.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="560.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="581.5" y="207.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="224.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">I</text>
<text x="36" y="228.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">I</text>
<text x="56.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="77.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="98.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="119.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="140.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="161.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="182.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="203.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="224.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="245.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="266.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="287.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="308.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="329.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="350.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="371.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="392.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="413.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="434.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="455.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="476.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="497.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="518.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="539.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="560.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="581.5" y="228.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="245.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">J</text>
<text x="36" y="249.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">J</text>
<text x="56.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="77.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="98.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="119.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="140.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="161.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="182.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="203.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="224.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="245.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="266.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="287.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="308.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="329.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="350.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="371.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="392.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="413.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="434.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="455.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="476.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="497.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="518.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="539.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="560.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="581.5" y="249.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="266.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">K</text>
<text x="36" y="270.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">K</text>
<text x="56.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="77.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="98.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="119.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="140.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="161.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="182.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="203.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="224.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="245.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="266.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="287.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="308.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="329.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="350.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="371.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="392.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="413.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="434.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="455.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="476.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="497.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="518.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="539.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="560.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="581.5" y="270.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="287.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">L</text>
<text x="36" y="291.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">L</text>
<rect x="46" y="277" width="21" height="21" rx="0" fill="none" stroke="currentColor" stroke-width="2" class="acc"/>
<text x="56.5" y="291.5" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">L</text>
<text x="77.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="98.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="119.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="140.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="161.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="182.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="203.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="224.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="245.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="266.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="287.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="308.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="329.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="350.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="371.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="392.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="413.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="434.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="455.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="476.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="497.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="518.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="539.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="560.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="581.5" y="291.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="308.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">M</text>
<text x="36" y="312.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">M</text>
<text x="56.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="77.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="98.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="119.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="140.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="161.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="182.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="203.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="224.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="245.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="266.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="287.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="308.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="329.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="350.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="371.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="392.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="413.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="434.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="455.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="476.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="497.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="518.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="539.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="560.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="581.5" y="312.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="329.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">N</text>
<text x="36" y="333.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">N</text>
<text x="56.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="77.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="98.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="119.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="140.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="161.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="182.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="203.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="224.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="245.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="266.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="287.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="308.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="329.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="350.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="371.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="392.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="413.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="434.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="455.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="476.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="497.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="518.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="539.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="560.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="581.5" y="333.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="350.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">O</text>
<text x="36" y="354.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">O</text>
<text x="56.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="77.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="98.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="119.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="140.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="161.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="182.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="203.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="224.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="245.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="266.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="287.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="308.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="329.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="350.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="371.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="392.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="413.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="434.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="455.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="476.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="497.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="518.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="539.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="560.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="581.5" y="354.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="371.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">P</text>
<text x="36" y="375.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">P</text>
<text x="56.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="77.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="98.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="119.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="140.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="161.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="182.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="203.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="224.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="245.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="266.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="287.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="308.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="329.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="350.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="371.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="392.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="413.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="434.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="455.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="476.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="497.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="518.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="539.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="560.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="581.5" y="375.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="392.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">Q</text>
<text x="36" y="396.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">Q</text>
<text x="56.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="77.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="98.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="119.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="140.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="161.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="182.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="203.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="224.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="245.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="266.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="287.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="308.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="329.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="350.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="371.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="392.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="413.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="434.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="455.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="476.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="497.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="518.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="539.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="560.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="581.5" y="396.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="413.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">R</text>
<text x="36" y="417.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">R</text>
<text x="56.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="77.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="98.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="119.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="140.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="161.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="182.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="203.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="224.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="245.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="266.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="287.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="308.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="329.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="350.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="371.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="392.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="413.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="434.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="455.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="476.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="497.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="518.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="539.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="560.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="581.5" y="417.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="434.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">S</text>
<text x="36" y="438.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">S</text>
<text x="56.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="77.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="98.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="119.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="140.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="161.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="182.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="203.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="224.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="245.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="266.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="287.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="308.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="329.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="350.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="371.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="392.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="413.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="434.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="455.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="476.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="497.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="518.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="539.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="560.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="581.5" y="438.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="455.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">T</text>
<text x="36" y="459.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">T</text>
<text x="56.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="77.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="98.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="119.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="140.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="161.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="182.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="203.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="224.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="245.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="266.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="287.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="308.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="329.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="350.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="371.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="392.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="413.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="434.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="455.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="476.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="497.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="518.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="539.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="560.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="581.5" y="459.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="476.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">U</text>
<text x="36" y="480.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">U</text>
<text x="56.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="77.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="98.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="119.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="140.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="161.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="182.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="203.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="224.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="245.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="266.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="287.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="308.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="329.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="350.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="371.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="392.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="413.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="434.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="455.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="476.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="497.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="518.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="539.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="560.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="581.5" y="480.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="497.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">V</text>
<text x="36" y="501.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">V</text>
<text x="56.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="77.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="98.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="119.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="140.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="161.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="182.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="203.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="224.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="245.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="266.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="287.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="308.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="329.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="350.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="371.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="392.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="413.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="434.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="455.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="476.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="497.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="518.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="539.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="560.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="581.5" y="501.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="518.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">W</text>
<text x="36" y="522.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">W</text>
<text x="56.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="77.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="98.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="119.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="140.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="161.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="182.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="203.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="224.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="245.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="266.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="287.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="308.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="329.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="350.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="371.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="392.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="413.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="434.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="455.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="476.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="497.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="518.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="539.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="560.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="581.5" y="522.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="539.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">X</text>
<text x="36" y="543.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">X</text>
<text x="56.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="77.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="98.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="119.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="140.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="161.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="182.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="203.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="224.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="245.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="266.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="287.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="308.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="329.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="350.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="371.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="392.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="413.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="434.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="455.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="476.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="497.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="518.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="539.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="560.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="581.5" y="543.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="560.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">Y</text>
<text x="36" y="564.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">Y</text>
<text x="56.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
<text x="77.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="98.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="119.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="140.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="161.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="182.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="203.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="224.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="245.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="266.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="287.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="308.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="329.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="350.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="371.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="392.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="413.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="434.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="455.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="476.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="497.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="518.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="539.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="560.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="581.5" y="564.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="581.5" y="38" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">Z</text>
<text x="36" y="585.5" font-size="12" text-anchor="middle" fill="currentColor" font-weight="bold">Z</text>
<text x="56.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">Z</text>
<text x="77.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">A</text>
<text x="98.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">B</text>
<text x="119.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">C</text>
<text x="140.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">D</text>
<text x="161.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">E</text>
<text x="182.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">F</text>
<text x="203.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">G</text>
<text x="224.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">H</text>
<text x="245.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">I</text>
<text x="266.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">J</text>
<text x="287.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">K</text>
<text x="308.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">L</text>
<text x="329.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">M</text>
<text x="350.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">N</text>
<text x="371.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">O</text>
<text x="392.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">P</text>
<text x="413.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">Q</text>
<text x="434.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">R</text>
<text x="455.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">S</text>
<text x="476.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">T</text>
<text x="497.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">U</text>
<text x="518.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">V</text>
<text x="539.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">W</text>
<text x="560.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">X</text>
<text x="581.5" y="585.5" font-size="11" text-anchor="middle" fill="currentColor">Y</text>
</svg>
<figcaption>Figure 2.9. Trithemius's <em>tabula recta</em>. Each row is a Caesar alphabet. To encrypt with Vigenère, find the key letter's row and the plaintext letter's column: key L over plaintext A gives L, key E over T gives X, the first two letters of LXFOPVEFRNHR.</figcaption>
</figure>

The two Ts of ATTACK became X and F, and the two As of ATTACK became L and O.
Single-letter counts now look nearly flat.

```python
def vig(s, key, sign=1):                   # sign=-1 decrypts
    s = [c for c in s.upper() if c in A]
    return "".join(A[(A.index(c) + sign * A.index(key[i % len(key)])) % 26] for i, c in enumerate(s))

print(vig("ATTACK AT DAWN", "LEMON"))      # LXFOPVEFRNHR
```

In formulas, with key letters $k_0, \ldots, k_{L-1}$ of a key of length $L$:

$$
c_i = m_i + k_{i \bmod L} \bmod 26, \qquad m_i = c_i - k_{i \bmod L} \bmod 26 .
$$

!!! note "Life story: the Vigenère cipher"
    **Born:** 1553, Giovan Battista Bellaso, building on Alberti's disk (about 1467) and Trithemius's table
    (1518); named after Blaise de Vigenère (1586) · **Purpose:** flatten letter counts with a key that is easy to
    remember and change · **Helped:** "the indecipherable cipher" for three centuries; still used by the
    Confederacy in the 1860s · **Broken:** by Babbage (1854, unpublished) and Kasiski (1863) · **Replaced by:**
    rotor machines; its unbreakable limit, a random key as long as the message, is the one-time pad

## 2.7 Breaking Vigenère: Kasiski and Friedman

*Level: intermediate.* The weakness is in the formula: the key repeats. With a
5-letter key, letters 0, 5, 10, 15 and so on are all shifted by the same
amount. If we knew $L$, we could split the ciphertext into $L$ columns, each a
plain shift cipher, and break each one with `chi` from [§2.3](#23-shift-ciphers-caesar-and-atbash).

Charles Babbage broke the cipher in 1854 but never published. Friedrich
Kasiski, a retired Prussian infantry major, published the attack in 1863 in a
95-page book, *Secret Writing and the Art of Deciphering*.

**Kasiski's method: repeats.** When the same plaintext, say THE, falls under the
same part of the keyword twice, it gives the same ciphertext twice. The distance
between the two copies is then a multiple of $L$. Collect the distances between
repeated groups of three letters and see which number divides most of them:

```python
from math import gcd

c = vig(TEXT, "LEMON")
seen, gaps = {}, []
for i in range(len(c) - 2):
    t = c[i:i + 3]
    if t in seen:
        gaps.append(i - seen[t])
    seen[t] = i
print(len(c), gaps[:12])
# 651 [47, 27, 25, 25, 25, 25, 25, 25, 115, 185, 185, 21]
print(Counter(g for d in gaps for g in range(2, 13) if d % g == 0).most_common(5))
# [(5, 73), (2, 41), (10, 39), (3, 24), (4, 19)]
```

Some repeats are accidents (47, 27, 21), but 5 divides far more distances than
anything else. The key has 5 letters.

<figure class="mars-fig">
<svg viewBox="0 0 660 230" width="660" role="img" aria-label="THE ENEMY appears twice in the plaintext, 25 letters apart, both times under MONLEMON, and both times becomes FVRPRQAL" xmlns="http://www.w3.org/2000/svg">
<text x="165" y="22" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">letters 122 to 129</text>
<rect x="60" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="73" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="86" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="99" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="112" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="125" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="138" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="151" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="164" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="190" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="203" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="216" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="229" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="242" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="255" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<text x="54" y="53" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">plain</text>
<rect x="60" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="73" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="86" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="99" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="112" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="125" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="138" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="151" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="164" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="177" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="190" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="203" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="216" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="229" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="242" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="255" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<text x="54" y="85" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">key</text>
<rect x="60" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="60" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="73" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="86" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="86" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="99" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="112" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="112" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="125" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="138" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="138" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="151" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="164" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="164" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="177" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="190" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="190" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="203" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="216" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="216" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="229" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="242" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="242" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="255" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<text x="54" y="117" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">cipher</text>
<text x="495" y="22" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">letters 147 to 154</text>
<rect x="390" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="403" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="416" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="429" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="442" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="455" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="468" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="481" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="494" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="520" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="533" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="546" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="559" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="572" y="34" width="26" height="28" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="585" y="53" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="390" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="403" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="416" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="429" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="442" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="455" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="468" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="481" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="494" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="507" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="520" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="533" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="546" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="559" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="572" y="66" width="26" height="28" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="585" y="85" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<rect x="390" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="390" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="403" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="416" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="416" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="429" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="442" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="442" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="455" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="468" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="468" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="481" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="494" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="494" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="507" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="520" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="520" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="533" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="546" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="546" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="559" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="572" y="98" width="26" height="28" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="572" y="98" width="26" height="28" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="585" y="117" font-size="14" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<line x1="87" y1="150" x2="393" y2="150" stroke="currentColor" stroke-width="1.5" class="acc"/>
<polygon points="400,150 392,153.6 392,146.4" fill="currentColor" class="acc-fill"/>
<polygon points="80,150 88,146.4 88,153.6" fill="currentColor" class="acc-fill"/>
<text x="240" y="170" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">25 letters apart, and 25 = 5 × 5</text>
<text x="330" y="200" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">Same plaintext under the same stretch of key gives the same ciphertext,</text>
<text x="330" y="218" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">so the distance between repeats is a multiple of the key length.</text>
</svg>
<figcaption>Figure 2.10. A real repeat from the LEMON ciphertext above. The phrase THE ENEMY occurs twice, 25 letters apart; both times it falls under the same part of the key, so the eight-letter group FVRPRQAL appears twice. Kasiski's method collects such distances.</figcaption>
</figure>

**Friedman's method: the index of coincidence.** In 1920 William Friedman, at
Riverbank Laboratories near Chicago, found a cleaner measure that needs no
repeats at all (it was printed in 1922). The **index of coincidence** of a text
is the chance that two letters picked at random from it are the same:

$$
\mathrm{IC} = \sum_{x = A}^{Z} \frac{n_x (n_x - 1)}{N (N - 1)},
$$

where $n_x$ is the count of letter $x$ and $N$ the length. For English it is
about 0.066, because some letters are very common. For uniformly random letters
it is $1/26 \approx 0.038$. A shift or substitution doesn't change it (it only
renames letters), but a Vigenère cipher mixes several alphabets and pulls it
toward 0.038. So: for each guess of $L$, split into columns and average their
IC. The right $L$ gives English-like columns.

```python
def ic(s):                                 # chance that two letters picked at random match
    n = len(s)
    return sum(s.count(x) * (s.count(x) - 1) for x in A) / (n * (n - 1))

print(round(ic([x for x in TEXT.upper() if x in A]), 4), round(ic(c), 4))   # 0.073 0.0444
for L in range(1, 11):
    print(L, round(sum(ic(c[i::L]) for i in range(L)) / L, 4))
```

```
1 0.0444
2 0.0449
3 0.0434
4 0.0453
5 0.0725
6 0.0431
7 0.0445
8 0.0439
9 0.0443
10 0.0741
```

At $L = 5$ and $L = 10$ the columns jump to English values; every multiple of
the true length works too.

<figure class="mars-fig">
<svg viewBox="0 0 560 280" width="560" role="img" aria-label="Bar chart of average column index of coincidence for key lengths 1 to 10; lengths 5 and 10 jump to about 0.073" xmlns="http://www.w3.org/2000/svg">
<line x1="70" y1="230" x2="540" y2="230" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="64" y="234" font-size="12" text-anchor="end" fill="currentColor">0.00</text>
<line x1="70" y1="178.5" x2="540" y2="178.5" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="64" y="182.5" font-size="12" text-anchor="end" fill="currentColor">0.02</text>
<line x1="70" y1="127" x2="540" y2="127" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="64" y="131" font-size="12" text-anchor="end" fill="currentColor">0.04</text>
<line x1="70" y1="75.5" x2="540" y2="75.5" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="64" y="79.5" font-size="12" text-anchor="end" fill="currentColor">0.06</text>
<line x1="70" y1="24" x2="540" y2="24" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="64" y="28" font-size="12" text-anchor="end" fill="currentColor">0.08</text>
<rect x="77" y="115.7" width="32.9" height="114.3" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="93.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">1</text>
<rect x="124" y="114.4" width="32.9" height="115.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="140.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">2</text>
<rect x="171.1" y="118.2" width="32.9" height="111.8" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="187.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">3</text>
<rect x="218.1" y="113.4" width="32.9" height="116.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="234.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">4</text>
<rect x="265.1" y="43.3" width="32.9" height="186.7" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="281.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">5</text>
<rect x="312.1" y="119" width="32.9" height="111" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="328.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">6</text>
<rect x="359.1" y="115.4" width="32.9" height="114.6" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="375.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">7</text>
<rect x="406.1" y="117" width="32.9" height="113" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="422.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">8</text>
<rect x="453.1" y="115.9" width="32.9" height="114.1" rx="1" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="469.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">9</text>
<rect x="500.1" y="39.2" width="32.9" height="190.8" rx="1" class="acc-fill" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="516.5" y="246" font-size="12" text-anchor="middle" fill="currentColor">10</text>
<line x1="70" y1="230" x2="540" y2="230" stroke="currentColor" stroke-width="1.5"/>
<line x1="70" y1="60.1" x2="540" y2="60.1" stroke="currentColor" stroke-width="1.5" class="acc" stroke-dasharray="6 4"/>
<rect x="73" y="43.7" width="91.8" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="76" y="55.1" font-size="12" text-anchor="start" fill="currentColor" class="acc-fill">English 0.066</text>
<line x1="70" y1="130.9" x2="540" y2="130.9" stroke="currentColor" stroke-width="1.5" class="acc" stroke-dasharray="6 4"/>
<rect x="73" y="114.5" width="85.2" height="15.6" style="fill: var(--md-default-bg-color)"/>
<text x="76" y="125.9" font-size="12" text-anchor="start" fill="currentColor" class="acc-fill">random 0.038</text>
<text x="16" y="127" font-size="12" text-anchor="middle" fill="currentColor" transform="rotate(-90 16 127)">average IC of columns</text>
<text x="305" y="270" font-size="12" text-anchor="middle" fill="currentColor">guessed key length L</text>
</svg>
<figcaption>Figure 2.11. Friedman's test on the LEMON ciphertext. Only when the guessed length is right (5) or a multiple of it (10) are the columns single Caesar alphabets, and their index of coincidence jumps to English's level.</figcaption>
</figure>

Put it all together Put it all together: find $L$, then break each
column as a shift cipher.

```python
def crack(c):
    L = max(range(1, 13), key=lambda L: sum(ic(c[i::L]) for i in range(L)) / L - 0.002 * L)
    return "".join(A[min(range(26), key=lambda k: chi(shift(c[i::L], -k)))] for i in range(L))

for key in ("LEMON", "BELLASO"):
    print(key, crack(vig(TEXT, key)))      # LEMON LEMON, then BELLASO BELLASO
```

The small `- 0.002 * L` term stops it choosing 10 when the key length is 5,
since multiples of the true length score just as well. With 651 letters a
5-letter key leaves about 130 letters per column, plenty for frequency
analysis. A longer key leaves fewer letters per column and needs more
ciphertext; a key as long as the message leaves one letter per column and
defeats the method entirely. That is the idea of the one-time pad
([Chapter 4](04-Randomness-and-Perfect-Secrecy.md)).

The lesson: **any pattern that repeats can be found.** A short key used over and
over leaks, only more slowly than a single alphabet does.

**The breakers.** Kasiski spent his career as an infantry officer and had
studied ciphers on the side; his book was barely noticed in his lifetime, and he
turned to archaeology. Friedman's path was stranger. He trained as a geneticist
and was hired by George Fabyan, a rich textile merchant who ran a private
research estate at Riverbank, to work on plant breeding. Fabyan also employed
people searching Shakespeare for hidden ciphers, and there Friedman met the
codebreaker Elizebeth Smith, whom he married. He went on to lead the US Army's
Signal Intelligence Service, whose team broke Japan's Purple machine in 1940,
and he coined the word "cryptanalysis".

!!! note "Life story: Kasiski's method and the index of coincidence"
    **Born:** Kasiski's test in 1863 (Babbage had found it in 1854); Friedman's index of coincidence in 1920 at
    Riverbank Laboratories, printed 1922 · **Purpose:** find the key length of a many-alphabet cipher · **Helped:**
    ended the Vigenère cipher; the index of coincidence turned codebreaking into statistics and was used
    against machine ciphers through the Second World War · **Status:** still the first thing a solver computes
    on a classical ciphertext

## 2.8 Transposition

*Level: intermediate.* Substitution changes letters; transposition keeps them
and moves them. A **columnar transposition** writes the message in rows under a
keyword and reads it out column by column, in the alphabetical order of the
keyword's letters:

| C | I | P | H | E | R |
|---|---|---|---|---|---|
| 1 | 4 | 5 | 3 | 2 | 6 |
| A | T | T | A | C | K |
| A | T | D | A | W | N |

Reading columns 1 to 6 gives AA CW AA TT TD KN, so the ciphertext is
AACWAATTTDKN.

<figure class="mars-fig">
<svg viewBox="0 0 600 250" width="600" role="img" aria-label="A grid with key CIPHER numbered 1 4 5 3 2 6 over ATTACK and ATDAWN; reading columns in number order gives AACWAATTTDKN" xmlns="http://www.w3.org/2000/svg">
<rect x="40" y="20" width="40" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="60" y="41" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">C</text>
<text x="60" y="70" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">1</text>
<rect x="80" y="20" width="40" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="100" y="41" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">I</text>
<text x="100" y="70" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">4</text>
<rect x="120" y="20" width="40" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="140" y="41" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">P</text>
<text x="140" y="70" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">5</text>
<rect x="160" y="20" width="40" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="180" y="41" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">H</text>
<text x="180" y="70" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">3</text>
<rect x="200" y="20" width="40" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="220" y="41" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">E</text>
<text x="220" y="70" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">2</text>
<rect x="240" y="20" width="40" height="30" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="260" y="41" font-size="15" text-anchor="middle" fill="currentColor" font-weight="bold">R</text>
<text x="260" y="70" font-size="14" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">6</text>
<rect x="40" y="80" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="102" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="80" y="80" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="102" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="120" y="80" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="102" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="160" y="80" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="102" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="200" y="80" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="220" y="102" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="240" y="80" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="260" y="102" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="40" y="112" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="60" y="134" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="80" y="112" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="100" y="134" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="120" y="112" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="140" y="134" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="160" y="112" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="180" y="134" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="200" y="112" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="220" y="134" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="240" y="112" width="40" height="32" rx="0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="260" y="134" font-size="15" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<line x1="60" y1="148" x2="60" y2="161" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="60,166 57.3,160 62.7,160" fill="currentColor" class="acc-fill"/>
<line x1="100" y1="148" x2="100" y2="161" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="100,166 97.3,160 102.7,160" fill="currentColor" class="acc-fill"/>
<line x1="140" y1="148" x2="140" y2="161" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="140,166 137.3,160 142.7,160" fill="currentColor" class="acc-fill"/>
<line x1="180" y1="148" x2="180" y2="161" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="180,166 177.3,160 182.7,160" fill="currentColor" class="acc-fill"/>
<line x1="220" y1="148" x2="220" y2="161" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="220,166 217.3,160 222.7,160" fill="currentColor" class="acc-fill"/>
<line x1="260" y1="148" x2="260" y2="161" stroke="currentColor" stroke-width="1.2" class="acc"/>
<polygon points="260,166 257.3,160 262.7,160" fill="currentColor" class="acc-fill"/>
<text x="160" y="192" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">write in rows, read columns</text>
<text x="160" y="210" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">in the order 1, 2, … 6</text>
<text x="450" y="41" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">read out</text>
<text x="340" y="74" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">column 1</text>
<rect x="420" y="56" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="432" y="73" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="444" y="56" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="456" y="73" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<text x="340" y="100" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">column 2</text>
<rect x="420" y="82" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="432" y="99" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="444" y="82" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="456" y="99" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<text x="340" y="126" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">column 3</text>
<rect x="420" y="108" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="432" y="125" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<rect x="444" y="108" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="456" y="125" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">A</text>
<text x="340" y="152" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">column 4</text>
<rect x="420" y="134" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="432" y="151" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="444" y="134" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="456" y="151" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<text x="340" y="178" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">column 5</text>
<rect x="420" y="160" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="432" y="177" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="444" y="160" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="456" y="177" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<text x="340" y="204" font-size="12" text-anchor="start" fill="currentColor" font-style="italic">column 6</text>
<rect x="420" y="186" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="432" y="203" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="444" y="186" width="24" height="24" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="456" y="203" font-size="14" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">N</text>
<text x="460" y="228" font-size="15" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">AACWAATTTDKN</text>
</svg>
<figcaption>Figure 2.12. Columnar transposition with the key CIPHER. The key's letters in alphabetical order (C, E, H, I, P, R) set the order in which the columns are read.</figcaption>
</figure>

```python
def columnar(s, key):
    s = [c for c in s.upper() if c in A]
    order = sorted(range(len(key)), key=lambda i: (key[i], i))   # columns in alphabetical order of the key
    return "".join("".join(s[i::len(key)]) for i in order)

def uncolumnar(c, key):
    cols, n = len(key), len(c)
    order = sorted(range(cols), key=lambda i: (key[i], i))
    out, pos = [""] * n, 0
    for i in order:
        size = len(range(i, n, cols))       # how many letters this column holds
        out[i::cols] = c[pos:pos + size]
        pos += size
    return "".join(out)

c = columnar("ATTACK AT DAWN", "CIPHER")
print(c, uncolumnar(c, "CIPHER"))          # AACWAATTTDKN ATTACKATDAWN
```

**Breaking it.** Letter counts are unchanged, which gives transposition away at
once: the ciphertext has English frequencies (an IC near 0.066) but doesn't
read as English. The attacker guesses the number of columns, cuts the
ciphertext into columns, and slides them against each other looking for
common pairs like TH, HE and QU: **anagramming**. Two messages of the same
length under the same key can be anagrammed together, which makes it much
easier.

**Both moves together.** The strongest hand ciphers combined the two. Germany's
ADFGVX cipher (Fritz Nebel, 1918) replaced each letter by a pair of the letters
A, D, F, G, V, X from a 6 by 6 square, then transposed the result. On 2 June
1918 the French cryptanalyst Georges Painvin, working himself into exhaustion,
read a message that pointed to where the next German attack would fall; the
French called it the "radiogram of victory". In 1949 Claude
Shannon named the principle behind such ciphers: **confusion** (make the
relation between key and ciphertext complicated, as substitution does) and
**diffusion** (spread each plaintext letter's influence over much of the
ciphertext, as transposition does). Every round of AES does both
([Chapter 7](07-AES.md)).

**Transposition's long life.** In the American Civil War the Union's
telegraph ciphers, organized by Anson Stager, transposed whole words along
agreed "routes" through a grid, and the Confederates never read them. Armies
and spies used **double transposition**, two columnar transpositions with
different keys, well into the Second World War: Britain's Special Operations
Executive gave its agents keys taken from poems they knew by heart, until its
code chief Leo Marks replaced the poems with keys printed on silk, because a
captured agent could be made to reveal a poem.

!!! note "Life story: columnar transposition"
    **Born:** antiquity in spirit (the skytale); the keyword form was a staple of 19th-century military
    ciphers · **Purpose:** hide a message using nothing but pencil and paper · **Helped:** Union route ciphers in
    the 1860s; double transposition for armies and resistance agents into the 1940s · **Broken:** by
    anagramming, especially with two messages of the same length · **Status:** retired; lives on as the
    "permute" half of every modern cipher round

!!! note "Life story: ADFGVX"
    **Born:** March 1918, Fritz Nebel, for the German army's spring offensive (ADFGX, with V added in June) ·
    **Purpose:** a field cipher strong enough for radio, mixing substitution and transposition · **Helped:**
    hid German orders for a few weeks · **Broken:** by Georges Painvin, whose "radiogram of victory" of June
    1918 warned of the attack near Compiègne · **Retired:** with the end of the war

## 2.9 Machines: Enigma

*Level: intermediate.* A Vigenère cipher with a 5-letter key cycles through 5
alphabets. What if the alphabets never repeated, or only after thousands of
letters? Doing that by hand is hopeless; a machine can. Between 1917 and 1919
four inventors, Edward Hebern in the US, Arthur Scherbius in Germany, Hugo Koch
in the Netherlands and Arvid Damm in Sweden, came up with the **rotor**: a
wheel with 26 contacts on each side, wired inside as a scrambled alphabet,
which turns one step after each letter. Scherbius's machine became
**Enigma**, adopted by the German navy in 1926 and the army in 1928.

**How it works.** Pressing a key sends current through:

1. the **plugboard**, which swaps up to 13 pairs of letters (10 pairs in the
   war years);
2. three rotors, right to left, each a substitution that shifts as the rotors
   turn;
3. a **reflector**, which pairs letters and sends the current back;
4. the three rotors again, left to right, and the plugboard again,

and a lamp lights under the ciphertext letter. The right rotor steps before
every letter; at a notch it carries the middle one forward, like an odometer.
Because of the reflector, the same settings encrypt and decrypt, and **no letter
can ever encrypt to itself**.

<figure class="mars-fig">
<svg viewBox="0 0 680 260" width="680" role="img" aria-label="Enigma's signal path: from the key through plugboard and three rotors to the reflector, and back by another path to a lamp" xmlns="http://www.w3.org/2000/svg">
<rect x="10" y="60" width="92" height="130" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="10" y="60" width="92" height="130" rx="6" class="soft-acc" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="56" y="129.6" font-size="13" text-anchor="middle" fill="currentColor"></text>
<text x="56" y="88" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Reflector</text>
<text x="56" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">B</text>
<rect x="124" y="60" width="92" height="130" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="124" y="60" width="92" height="130" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="170" y="129.6" font-size="13" text-anchor="middle" fill="currentColor"></text>
<text x="170" y="88" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Rotor I</text>
<text x="170" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">left</text>
<rect x="238" y="60" width="92" height="130" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="238" y="60" width="92" height="130" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="284" y="129.6" font-size="13" text-anchor="middle" fill="currentColor"></text>
<text x="284" y="88" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Rotor II</text>
<text x="284" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">middle</text>
<rect x="352" y="60" width="92" height="130" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="352" y="60" width="92" height="130" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="398" y="129.6" font-size="13" text-anchor="middle" fill="currentColor"></text>
<text x="398" y="88" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Rotor III</text>
<text x="398" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">right, steps</text>
<rect x="466" y="60" width="92" height="130" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="466" y="60" width="92" height="130" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="512" y="129.6" font-size="13" text-anchor="middle" fill="currentColor"></text>
<text x="512" y="88" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Plugboard</text>
<text x="512" y="104" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">pairs swap</text>
<rect x="580" y="60" width="92" height="130" rx="6" style="fill: var(--md-default-bg-color)"/>
<rect x="580" y="60" width="92" height="130" rx="6" class="soft" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="626" y="129.6" font-size="13" text-anchor="middle" fill="currentColor"></text>
<text x="626" y="88" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">Keys / lamps</text>
<line x1="586" y1="135" x2="559" y2="135" stroke="currentColor" stroke-width="1.6"/>
<polygon points="552,135 560,131.4 560,138.6" fill="currentColor"/>
<line x1="472" y1="135" x2="445" y2="135" stroke="currentColor" stroke-width="1.6"/>
<polygon points="438,135 446,131.4 446,138.6" fill="currentColor"/>
<line x1="358" y1="135" x2="331" y2="135" stroke="currentColor" stroke-width="1.6"/>
<polygon points="324,135 332,131.4 332,138.6" fill="currentColor"/>
<line x1="244" y1="135" x2="217" y2="135" stroke="currentColor" stroke-width="1.6"/>
<polygon points="210,135 218,131.4 218,138.6" fill="currentColor"/>
<line x1="130" y1="135" x2="103" y2="135" stroke="currentColor" stroke-width="1.6"/>
<polygon points="96,135 104,131.4 104,138.6" fill="currentColor"/>
<line x1="96" y1="170" x2="123" y2="170" stroke="currentColor" stroke-width="1.8" class="acc"/>
<polygon points="130,170 122,173.6 122,166.4" fill="currentColor" class="acc-fill"/>
<line x1="210" y1="170" x2="237" y2="170" stroke="currentColor" stroke-width="1.8" class="acc"/>
<polygon points="244,170 236,173.6 236,166.4" fill="currentColor" class="acc-fill"/>
<line x1="324" y1="170" x2="351" y2="170" stroke="currentColor" stroke-width="1.8" class="acc"/>
<polygon points="358,170 350,173.6 350,166.4" fill="currentColor" class="acc-fill"/>
<line x1="438" y1="170" x2="465" y2="170" stroke="currentColor" stroke-width="1.8" class="acc"/>
<polygon points="472,170 464,173.6 464,166.4" fill="currentColor" class="acc-fill"/>
<line x1="552" y1="170" x2="579" y2="170" stroke="currentColor" stroke-width="1.8" class="acc"/>
<polygon points="586,170 578,173.6 578,166.4" fill="currentColor" class="acc-fill"/>
<path d="M96 135 H50 V170 H96" stroke="currentColor" stroke-width="1.6" fill="none"/>
<text x="626" y="40" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold">press A</text>
<text x="626" y="214" font-size="13" text-anchor="middle" fill="currentColor" class="acc-fill" font-weight="bold">lamp B lights</text>
<text x="340" y="236" font-size="12" text-anchor="middle" fill="currentColor" font-style="italic">in from the right, back out by a different path</text>
<text x="340" y="254" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill" font-style="italic">the reflector is why no letter can encrypt to itself</text>
</svg>
<figcaption>Figure 2.13. One key press on Enigma I with rotors I, II, III at AAA and no plugs: A goes in, lights B, the first letter of the standard test BDZGO. The right rotor steps before every letter, so the next A takes a different path.</figcaption>
</figure>

Here is a working Enigma I with rotors I, II and III and reflector B. (Real
machines also had ring settings, left out here: they shift each rotor's wiring
against its letters.)

```python
ROTORS = {"I": ("EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q"),      # wiring, and the letter where it carries
          "II": ("AJDKSIRUXBLHWTMCQGZNPYFVOE", "E"),
          "III": ("BDFHJLCPRTXVZNYEIWGAKMUSQO", "V")}
REFLECTOR_B = "YRUHQSLDPXNGOKMIEBFZCWVJAT"

def enigma(text, order=("I", "II", "III"), start="AAA", plugs=""):
    wire = [ROTORS[r][0] for r in order]
    notch = [ROTORS[r][1] for r in order]
    pos = [A.index(c) for c in start]
    swap = {}
    for pair in plugs.split():
        swap[pair[0]], swap[pair[1]] = pair[1], pair[0]
    out = ""
    for ch in text:
        if A[pos[1]] == notch[1]:                 # middle rotor at its notch: it and the left one step
            pos[0] = (pos[0] + 1) % 26
            pos[1] = (pos[1] + 1) % 26
        elif A[pos[2]] == notch[2]:               # right rotor at its notch: the middle one steps
            pos[1] = (pos[1] + 1) % 26
        pos[2] = (pos[2] + 1) % 26                # the right rotor always steps
        x = A.index(swap.get(ch, ch))
        for i in (2, 1, 0):                       # in through the rotors, right to left
            x = (A.index(wire[i][(x + pos[i]) % 26]) - pos[i]) % 26
        x = A.index(REFLECTOR_B[x])               # bounce off the reflector
        for i in (0, 1, 2):                       # back out, left to right
            x = (wire[i].index(A[(x + pos[i]) % 26]) - pos[i]) % 26
        out += swap.get(A[x], A[x])
    return out

print(enigma("AAAAA"))                            # BDZGO, the standard test
c = enigma("WETTERBERICHTFUERDIENACHT", start="KDO", plugs="AQ EP TZ")
print(c)                                          # GGQVAKVKPLXCPMNPEQVIBRAYP
print(enigma(c, start="KDO", plugs="AQ EP TZ"))   # WETTERBERICHTFUERDIENACHT
```

**The key space.** The daily key was the choice and order of three rotors out
of five (60 ways, from December 1938), the starting positions ($26^3 = 17{,}576$),
the ring settings, and the plugboard. The number of ways to choose 10
plugboard pairs from 26 letters is

$$
\frac{26!}{6! \cdot 10! \cdot 2^{10}} = 150{,}738{,}274{,}937{,}250 ,
$$

so rotors, positions and plugs together give
$60 \times 17{,}576 \times 150{,}738{,}274{,}937{,}250 \approx 1.59 \times 10^{20}$,
about $2^{67}$, before ring settings. No one could search that by hand, and
the Germans trusted it.

**How it was broken.** In December 1932 Marian Rejewski of the Polish Cipher
Bureau, a mathematician, reconstructed the army Enigma's rotor wiring. The
operators sent each message's three-letter starting position twice at the
start of the message, and Rejewski wrote the resulting relations as
permutations; their cycle structure did not depend on the plugboard at all. He
used some key sheets bought by French intelligence from a German clerk, but
the core of it was mathematics. The Poles built machines (*bomby*) to find
daily keys and, in July 1939, five weeks before Germany invaded, gave
everything to Britain and France.

At Bletchley Park, Alan Turing and Gordon Welchman designed the **bombe**,
which worked from a **crib**: a guessed piece of plaintext, such as WETTER
(weather) or KEINE BESONDEREN EREIGNISSE (nothing special to report). The
"no letter to itself" rule tells you where a crib *can't* be: slide it along
the ciphertext and rule out every position where any letter lines up with
itself.

```python
msg = enigma("XXKEINEBESONDERENEREIGNISSEWETTERBERICHTFOLGT", start="VQB", plugs="AQ EP TZ")
crib = "WETTERBERICHT"
print([i for i in range(len(msg) - len(crib) + 1)
       if all(m != p for m, p in zip(msg[i:], crib))])
# [0, 1, 3, 4, 7, 8, 9, 10, 14, 15, 16, 17, 18, 20, 21, 25, 26, 27, 30, 31]
```

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="WETTERBERICHT slid under the ciphertext: at position 2 an I sits over an I, so that place is ruled out; at 27 no letter matches itself" xmlns="http://www.w3.org/2000/svg">
<text x="20" y="22" font-size="13" text-anchor="start" fill="currentColor" font-weight="bold">crib at position 2: rejected</text>
<text x="102" y="48" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">ciphertext</text>
<text x="102" y="76" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">crib</text>
<rect x="110" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="122.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="135" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="147.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">L</text>
<rect x="160" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="172.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="185" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="197.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">X</text>
<rect x="210" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="222.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="235" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="247.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="260" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="272.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="285" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="297.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="310" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="322.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="335" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="347.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">P</text>
<rect x="360" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="372.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="385" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="397.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="410" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="422.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="435" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="447.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="460" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="472.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="485" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="497.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="510" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="522.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="535" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="547.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">G</text>
<rect x="560" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="572.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="585" y="30" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="597.5" y="47.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">U</text>
<rect x="160" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="172.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="185" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="197.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="210" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="222.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="235" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="247.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="260" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="272.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="285" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="297.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="310" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="322.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="335" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="347.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="360" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="372.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="385" y="60" width="25" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="385" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="397.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="410" y="60" width="25" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="410" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="422.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="435" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="447.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="460" y="60" width="25" height="26" rx="0" class="soft-acc" fill="currentColor"/>
<rect x="460" y="60" width="25" height="26" rx="0" fill="none" stroke="currentColor" class="acc" stroke-width="1"/>
<text x="472.5" y="77.7" font-size="13" text-anchor="middle" fill="currentColor" font-weight="bold" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="385" y="30" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="2.5" class="acc"/>
<rect x="410" y="30" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="2.5" class="acc"/>
<rect x="460" y="30" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="2.5" class="acc"/>
<text x="397" y="106" font-size="12" text-anchor="middle" fill="currentColor" class="acc-fill">I, C and T each sit over themselves: impossible</text>
<text x="20" y="137" font-size="13" text-anchor="start" fill="currentColor" class="acc-fill" font-weight="bold">crib at position 27: survives (the true place)</text>
<text x="102" y="163" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">ciphertext</text>
<text x="102" y="191" font-size="12" text-anchor="end" fill="currentColor" font-style="italic">crib</text>
<rect x="110" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="122.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="135" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="147.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="160" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="172.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">J</text>
<rect x="185" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="197.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">D</text>
<rect x="210" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="222.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="235" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="247.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="260" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="272.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">F</text>
<rect x="285" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="297.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="310" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="322.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="335" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="347.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">M</text>
<rect x="360" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="372.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Y</text>
<rect x="385" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="397.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="410" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="422.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">S</text>
<rect x="435" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="447.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">O</text>
<rect x="460" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="472.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="485" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="497.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">K</text>
<rect x="510" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="522.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">V</text>
<rect x="535" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="547.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="560" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="572.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Q</text>
<rect x="585" y="145" width="25" height="26" rx="0" class="soft" fill="currentColor" stroke="currentColor" stroke-width="0.6"/>
<text x="597.5" y="162.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">Z</text>
<rect x="160" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="172.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">W</text>
<rect x="185" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="197.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="210" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="222.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="235" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="247.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
<rect x="260" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="272.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="285" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="297.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="310" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="322.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">B</text>
<rect x="335" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="347.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">E</text>
<rect x="360" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="372.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">R</text>
<rect x="385" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="397.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">I</text>
<rect x="410" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="422.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">C</text>
<rect x="435" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="447.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">H</text>
<rect x="460" y="175" width="25" height="26" rx="0" fill="none" stroke="currentColor" stroke-width="0.6"/>
<text x="472.5" y="192.7" font-size="13" text-anchor="middle" fill="currentColor" font-family="ui-monospace, Menlo, Consolas, monospace">T</text>
</svg>
<figcaption>Figure 2.14. Using Enigma's flaw. A crib can only sit where none of its letters lies over the same ciphertext letter. At position 2 three letters of the crib (I, C and T) lie over themselves, so that place is impossible; at 27, the true place, none does.</figcaption>
</figure>

Thirteen of the 33 positions are ruled out at once; the true one, 27, is
among the survivors. For each surviving position the bombe tested all rotor
orders and positions electrically, rejecting any that led to a contradiction in
the plugboard. About 210 British bombes were running by the end of the war,
and more than a hundred American ones.

Enigma was not a bad machine. It lost to a design flaw (no letter to
itself), to habits (doubled message keys, routine messages, lazy key choices
like ABC), to captured key sheets, and to the scale of the effort against it.
See [Machines and World War II](../history/05-Machines-and-WWII.md) for the
whole story, including Japan's Purple machine, the Lorenz cipher and Colossus.

The secret outlived the war. Britain kept the Enigma break hidden for almost
thirty years; the world learned of it only in 1974, from F. W. Winterbotham's
book *The Ultra Secret*, and the Polish part of the story was told in full
later still.

!!! note "Life story: Enigma"
    **Born:** 1918, Arthur Scherbius's patent; adopted by the German navy (1926) and army (1928) ·
    **Purpose:** automate a many-alphabet cipher so that alphabets don't repeat for thousands of letters ·
    **Helped:** gave Germany fast, portable encryption for every unit · **Broken:** by Rejewski, Różycki and
    Zygalski in Warsaw (1932 onward), then by Turing, Welchman and thousands of staff at Bletchley Park
    (1939 to 1945), through the no-self-encryption flaw, cribs and operator habits · **Retired:** with
    Germany's defeat in 1945; the break stayed secret until 1974 · **Replaced by:** electronic ciphers, and
    then the computer ciphers of Part II

## 2.10 What the breaks teach

*Level: intermediate.* Each classical cipher fell for a reason, and each
reason became a requirement for modern ciphers:

| Cipher | How it fell | What a modern cipher must do |
|---|---|---|
| Shift, affine | too few keys | have at least $2^{128}$ keys |
| Affine, Hill ([§2.12](#212-going-deeper)) | linear: known plaintext solves equations | include non-linear steps |
| Substitution | letter statistics show through | hide every statistical pattern of the plaintext |
| Vigenère | the key repeats | never let structure repeat in a usable way |
| Transposition | letter counts unchanged | change the symbols as well as their order |
| Enigma | a structural quirk plus cribs | stay safe even when the attacker knows or chooses plaintext |

The modern ciphers in Part II meet all of these. A good block cipher looks,
to anyone without the key, like a completely random permutation of all possible
128-bit blocks, so that frequency, repeats, linearity and cribs give nothing
away.

**Where classical ciphers live on.** ROT13 still hides spoilers; puzzle
columns print substitution cryptograms; Capture-the-Flag contests start with
Vigenère. And the ideas live inside modern designs: AES's S-box is a
substitution, its ShiftRows step is a transposition, and a stream cipher is a
Vigenère cipher whose key never repeats.

**The world's codebreakers.** The breaks above came from Baghdad, Prussia,
Chicago, Warsaw and Bletchley, but the craft was everywhere. Japan built
government code charts and a cipher wheel for its telegraph in the 1870s;
Russia's Okhrana read the empire's mail; Choctaw soldiers in 1918 and Navajo,
Comanche and Meskwaki soldiers in the Second World War carried messages in
languages the enemy didn't know, which were never broken. The
[history appendix](../history/index.md) tells all of it.

## 2.11 Practice: what to do with a classical ciphertext

If you meet a hand cipher in a puzzle, an archive or a contest, the classical
order of attack is:

1. **Count.** Letter frequencies and the index of coincidence. IC near 0.066 with
   English-looking frequencies: transposition. IC near 0.066 but scrambled
   frequencies: a single substitution. IC well below: polyalphabetic or
   homophonic.
2. **Look for structure.** Repeats and their distances (Kasiski), word
   lengths if spaces were kept, doubled letters.
3. **Guess the key length**, then split into columns.
4. **Use cribs.** Greetings, names, dates, "STOP", the sender's habits.
5. **Let a computer search.** Modern solvers do **hill climbing**: start from a
   random key, swap two letters of it, keep the swap if the decryption looks
   more like English (scored with statistics of letter pairs, triples or
   fours from a large body of text), and repeat thousands of times.

In 2023 George Lasry, Norbert Biermann and Satoshi Tomokiyo used exactly this
kind of computer search to read 57 lost letters from Mary, Queen of Scots,
written between 1578 and 1584 and filed in the French national library as
Italian documents. Old ciphers are still being broken.

## 2.12 Going deeper

*Level: expert.* Three tools that turn the craft above into mathematics.

**Why the index of coincidence works.** Let $p_x$ be the probability of letter
$x$ in English. Two letters drawn independently from English match with
probability $\kappa_p = \sum_x p_x^2 \approx 0.066$; two uniformly random letters
match with probability $\kappa_r = 26 \cdot (1/26)^2 = 1/26 \approx 0.0385$.
Shifting by a fixed amount permutes the $p_x$ and leaves the sum unchanged.
In a Vigenère ciphertext with key length $L$, two random positions fall in the
same column with probability about $1/L$, and then they match like English;
otherwise they come from different shifts and match roughly like random text.
So

$$
\mathrm{IC} \approx \frac{1}{L}\,\kappa_p + \frac{L - 1}{L}\,\kappa_r ,
$$

which for $L = 5$ predicts 0.044, matching the 0.0444 measured above. Solving
for $L$ gives Friedman's estimate of the key length from one number:

$$
L \approx \frac{\kappa_p - \kappa_r}{\mathrm{IC} - \kappa_r} .
$$

**Unicity distance: how much ciphertext is enough?** Shannon (1949) asked how
long a ciphertext must be before only one key gives a sensible plaintext. If the
key has $H(K)$ bits of entropy and the language has **redundancy** $D$ bits per
letter (the gap between the $\log_2 26 \approx 4.7$ bits a letter could carry
and the roughly 1 to 1.5 bits English actually carries), then each ciphertext
letter rules out about $D$ bits' worth of keys, and the **unicity distance** is

$$
U \approx \frac{H(K)}{D} .
$$

For a simple substitution, $H(K) = \log_2 26! \approx 88.4$ bits; with
$D \approx 3.2$, $U \approx 28$ letters. Below about 28 letters, several
different keys give readable English and no attack can be sure; above it, the
answer is unique in principle (finding it is another matter). For a Caesar
cipher, $U \approx \log_2 26 / 3.2 \approx 1.5$ letters. Shannon's point was that
every cipher with a finite key has a finite unicity distance, except one that
keeps adding key as fast as it adds message: the one-time pad.

**The Hill cipher and linear algebra.** In 1929 the American mathematician
Lester Hill published a cipher that encrypts letters in blocks with a matrix
mod 26: for blocks of two, $\binom{c_1}{c_2} = K \binom{m_1}{m_2} \bmod 26$. It
hides single-letter frequencies, and with larger matrices it diffuses each
letter over the whole block, the first cipher to do so by algebra. But it is
linear, like the affine cipher, so known plaintext breaks it: two known pairs
of plaintext and ciphertext blocks, arranged as columns of matrices $P$ and $C$,
give $C = K P$, so $K = C P^{-1} \bmod 26$.

```python
def hill(s, K):                            # each pair (x, y) becomes K times (x, y), mod 26
    v = [A.index(c) for c in s]
    out = ""
    for x, y in zip(v[0::2], v[1::2]):
        out += A[(K[0][0] * x + K[0][1] * y) % 26] + A[(K[1][0] * x + K[1][1] * y) % 26]
    return out

def inv2(M):                               # inverse of a 2x2 matrix mod 26
    d = pow((M[0][0] * M[1][1] - M[0][1] * M[1][0]) % 26, -1, 26)
    return [[M[1][1] * d % 26, -M[0][1] * d % 26], [-M[1][0] * d % 26, M[0][0] * d % 26]]

def mul(X, Y):
    return [[sum(X[i][k] * Y[k][j] for k in range(2)) % 26 for j in range(2)] for i in range(2)]

K = [[3, 3], [2, 5]]
c = hill("HELPMEIAMTRAPPED", K)
print(c, hill(c, inv2(K)))                 # HIATWSYQPPZIMBVX HELPMEIAMTRAPPED

P = [[A.index("H"), A.index("L")], [A.index("E"), A.index("P")]]     # known: HELP, as two columns
C = [[A.index(c[0]), A.index(c[2])], [A.index(c[1]), A.index(c[3])]]
print(mul(C, inv2(P)))                     # [[3, 3], [2, 5]]: the key
```

Four letters of known plaintext gave the whole key. Hill's cipher saw little
use, but its idea, mixing blocks with matrices, came back in AES's MixColumns
step, this time paired with a non-linear S-box ([Chapter 7](07-AES.md)).

!!! note "Life story: the Hill cipher"
    **Born:** 1929, Lester S. Hill, a mathematician at Hunter College in New York, in "Cryptography in an
    Algebraic Alphabet" (*American Mathematical Monthly*) · **Purpose:** use algebra to encrypt several letters
    at once, so that single-letter counts disappear · **Helped:** the first cipher designed from mathematics;
    Hill and Louis Weisner patented a mechanical version · **Broken:** by known plaintext, because it is linear ·
    **Status:** a classroom cipher; its matrix step lives on in AES's MixColumns

**Hill climbing, in numbers.** A good automatic solver for simple substitution
scores candidate decryptions by the sum of $\log$ probabilities of their
four-letter groups, trained on millions of letters of real text. Because the
score is smooth (fixing one letter improves many groups at once), random
swaps climb steadily toward the true key, and a few hundred letters are
usually enough. The same principle, searching a huge key space guided by a
statistical score, is how modern solvers attack homophonic ciphers and even
Enigma messages without a bombe.

## Exercises

??? question "1. Decrypt WKH HQHPB NQRZV WKH VBVWHP (a shift cipher)."

    Shift back by 3: **THE ENEMY KNOWS THE SYSTEM**, Shannon's maxim from [§1.5](01-What-Cryptography-Is-For.md#15-the-method-is-not-the-secret).

??? question "2. Encrypt HELLO with Atbash, then apply Atbash again. What do you get, and why?"

    SVOOL, then HELLO again. Atbash maps $x$ to $25 - x$, and $25 - (25 - x) = x$, so
    it is its own inverse.

??? question "3. Why can't the affine cipher use $a = 13$?"

    13 shares the factor 13 with 26, so $13x \bmod 26$ is only ever 0 or 13. Half
    the alphabet would map to one letter and half to another, and nothing could
    be decrypted. There is no $13^{-1}$ mod 26.

??? question "4. How many keys does a simple substitution have, in bits? Why isn't that enough?"

    $\log_2 26! \approx 88.4$ bits, far more than DES's 56. But frequency analysis
    never searches the keys: it reads the key off the letter statistics one letter
    at a time. Key length alone proves nothing.

??? question "5. A ciphertext has index of coincidence 0.066 and its most common letter is X. What kind of cipher is it probably?"

    A single (monoalphabetic) substitution: the IC is English-like, so only one
    alphabet is in use, but E has been replaced. A transposition would also have IC
    0.066, but its commonest letter would be E.

??? question "6. Repeated trigrams in a Vigenère ciphertext are 18, 30, 42 and 54 letters apart. What is the likely key length?"

    The greatest common divisor of the distances is 6, so 6 (or possibly 3 or 2,
    its divisors). Check with the index of coincidence of the columns.

??? question "7. A Vigenère ciphertext has IC 0.047. Estimate the key length with Friedman's formula."

    $L \approx (0.066 - 0.0385) / (0.047 - 0.0385) = 0.0275 / 0.0085 \approx 3.2$, so about 3.
    The estimate is rough; use it to choose which lengths to test first.

??? question "8. Why does no letter encrypting to itself help an attacker? Isn't it more scrambled?"

    It is less random. A truly random substitution would map a letter to itself
    1 time in 26. Ruling it out lets an attacker eliminate crib positions for free
    ([§2.9](#29-machines-enigma)), and in general any rule that the ciphertext must obey is information.

??? question "9. With a Hill cipher on pairs of letters, why does the attacker need two known pairs and not one?"

    The key matrix has four unknown entries. Each known pair of letters gives two
    equations (one per ciphertext letter), so two pairs give four equations. The
    plaintext matrix $P$ must also be invertible mod 26; if it isn't, take another pair.

??? question "10. Estimate the unicity distance of a Vigenère cipher with a random 10-letter key."

    $H(K) = 10 \log_2 26 \approx 47$ bits, and $47 / 3.2 \approx 15$ letters. Below about 15
    letters many keys give plausible English. In practice the statistical attack in
    [§2.7](#27-breaking-vigenere-kasiski-and-friedman) needs far more, roughly 50 to 100 letters per column, so several hundred
    letters for this key.

## What you learned

- Classical ciphers use two moves: substitution (change the letters) and
  transposition (change their order). A code replaces whole words instead.
- Shift and affine ciphers fall to brute force; the affine cipher also falls to
  two letters of known plaintext because it is linear.
- Simple substitution has $2^{88}$ keys and still falls to al-Kindi's
  frequency analysis: the language's statistics show through.
- Vigenère's repeating key falls to Kasiski's repeats and Friedman's index of
  coincidence, which reduce it to several shift ciphers.
- Transposition keeps letter counts; the best hand ciphers combined both moves,
  which Shannon later called confusion and diffusion.
- Enigma had about $2^{67}$ keys before ring settings, but a structural quirk,
  cribs and operator habits broke it.
- Every break became a design rule: big key spaces, no visible statistics, no
  repeating structure, non-linearity, and safety against known and chosen
  plaintext.

**Next:** [Chapter 3](03-The-Arithmetic-of-Secrets.md) gives you the arithmetic
these ciphers hinted at, mod $n$ and inverses, and builds it up to the number
theory that public-key cryptography stands on.

## Further reading

- David Kahn, *The Codebreakers* (1967; revised 1996), chapters 2 to 10.
- Simon Singh, *The Code Book* (1999), chapters 1 to 4.
- Mohammed Mrayati, Yahya Meer Alam and Hassan al-Tayyan (eds.), *Arabic
  Origins of Cryptology*, volume 1: al-Kindi's treatise (Arabic edition 1987,
  English translation 2003).
- Friedrich Kasiski, *Die Geheimschriften und die Dechiffrir-Kunst* (1863).
- William F. Friedman, *The Index of Coincidence and Its Applications in
  Cryptography*, Riverbank Publication 22 (1922).
- Marian Rejewski, "An Application of the Theory of Permutations in Breaking
  the Enigma Cipher", *Applicationes Mathematicae* 16 (1980).
- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949): unicity distance.
- George Lasry, Norbert Biermann and Satoshi Tomokiyo, "Deciphering Mary
  Stuart's Lost Letters from 1578–1584", *Cryptologia* 47 (2023).
- On this site: [The ancient world](../history/01-Ancient.md),
  [Arab cryptanalysis](../history/02-Arab-Cryptanalysis.md),
  [The Renaissance](../history/03-Renaissance.md),
  [The telegraph age](../history/04-Telegraph-Age.md) and
  [Machines and World War II](../history/05-Machines-and-WWII.md).
