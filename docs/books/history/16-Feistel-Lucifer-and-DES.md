# 16. Feistel, Lucifer and DES

*In the late 1960s computers began to hold the money and the records of ordinary people, and there was nowhere to buy a cipher to protect them. A German-born engineer at IBM, Horst Feistel, built one. The United States government turned a descendant of it into the first public standard for encryption, and then spent twenty years answering two questions: why was the key so short, and why were the substitution tables the way they were? This chapter covers about 1967 to 2005. It tells the story of Lucifer and the Data Encryption Standard (DES), of the machines that finally found its key, and of the way cryptography came out of the agencies and into the universities while that argument went on. You will run a Feistel network by hand and in Python, test the DES substitution boxes against rules that IBM only published in 1994, break a DES key that has been cut down to fourteen unknown bits, and compute the Windows LAN Manager password hash with a real DES.*

!!! abstract "In this chapter"
    **You will learn:**

    - who Horst Feistel was, what Lucifer was, and how a cipher with a 128-bit block and key became one with a 64-bit block and a 56-bit key;
    - how a Feistel network works and why it is the easiest way to build a cipher that can be undone;
    - how the National Bureau of Standards (now NIST) asked for a standard cipher in 1973 and 1974, and published FIPS 46 in January 1977;
    - the two suspicions, the short key and the unexplained S-boxes, what the Senate's 1978 review said, and how differential cryptanalysis (1990), IBM's own account (1994) and linear cryptanalysis (1993) answered them;
    - how the key fell: the machine Diffie and Hellman drew in 1977, Wiener's design of 1993, the RSA challenges of 1997 to 1999, Deep Crack in July 1998, and COPACOBANA in 2006;
    - how Triple DES kept the standard alive until 2023, where DES lived (cash machines, banks, Unix, Windows) and what NIST publications record it;
    - how cryptography became an open academic field: Cryptologia, the first CRYPTO conference, Eurocrypt, the IACR and the Journal of Cryptology, and the fight over who could publish.

    **You need:** [chapter 15](15-Shannon-and-the-Agencies.md) (Shannon, confusion and diffusion, the NSA and its two jobs) and [book 1, chapter 6](../../book/06-Block-Ciphers.md) (how DES works, which is taught there in full and told only as story here). The attacks have their own chapters: [differential cryptanalysis](../cryptanalysis/05-Differential-Cryptanalysis.md), [linear cryptanalysis](../cryptanalysis/06-Linear-Cryptanalysis.md) and [exhaustive search](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md). This chapter gives the people, the dates and the consequences.

    **Levels:** §16.1 to §16.3, §16.7 and §16.9 to §16.12 are for beginners, §16.4 to §16.6, §16.8 and §16.13 are intermediate, §16.14 is expert.

## 16.1 The problem: banks, computers and no cipher

*Level: beginner.*

By 1968 a bank's customers were a row of numbers in a computer. Their balances were on magnetic tape and disk, their deposits and withdrawals traveled to the center over leased telephone lines, and the first cash dispensers were being installed in the walls of branches in Britain and the United States. The computers were new, the people who ran them were nervous, and a wave of public worry about "data banks" was rising. In the United States it ended in the Privacy Act of 1974. The engineers asked a simple question: how could a record, or a withdrawal order, travel over a line that anyone could tap, and sit on a tape that anyone could steal, without being read or changed?

The honest answer was encryption, and there was almost none to buy. The strong ciphers of the day were the machines of the armies and the diplomatic services, which the agencies built or approved and did not sell to a bank in the open ([chapter 15](15-Shannon-and-the-Agencies.md) told how the NSA held that field). The commercial machines were meant for governments and for firms that could trust a Swiss maker. A bank that wanted to protect a PIN or a funds transfer had, in practice, a vendor's own scrambling method, kept secret by the vendor, and no way for an outsider to say whether it was any good. Two banks that wanted to talk to each other needed to buy equipment from the same maker, or to agree a system from nothing.

Nor was there a body of public knowledge to build on. David Kahn's *The Codebreakers* (1967) was the first long general history of the subject; it taught a general reader that the field existed, and it recruited a generation, as the last chapter said. Shannon's 1949 paper laid out the principles ([chapter 15](15-Shannon-and-the-Agencies.md)), but it did not say how to build a cipher with a key of a few dozen bits that an enemy with a computer could not break. In 1970 there were no university courses on the subject, no journal, no conference, and almost no one outside the agencies who had spent a career on it. The work of an agency stayed in the agency.

Three needs met in the years that follow. Banks and computer makers needed a cipher they could buy and trust and that two firms could share. The United States government needed one for its own unclassified computers, where it could not use the classified ciphers of the NSA. And a few mathematicians and engineers, outside the secret world, wanted to know how such a cipher is built and whether it can be broken. A single standard, if it were public, could serve all three. The man who made the cipher on which the standard rests is the first person in this chapter.

Figure 16.1 sets out the dates the chapter follows. Read it as a story of three speeds. The standard was made in four years, from 1973 to 1977. The arguments about its design took twenty years to settle, from 1975 to 1994. And its key was lost to a machine in about twenty years more.

<figure class="mars-fig">
<svg viewBox="0 0 640 434" width="640" role="img" aria-label="Timeline of the Data Encryption Standard from 1967 to 2005" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="426" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1967</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">Kahn's The Codebreakers: a history for the general reader</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">1968</text>
<circle cx="102" cy="48" r="3.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start">Feistel joins IBM Research at Yorktown Heights</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">1973</text>
<circle cx="102" cy="74" r="3.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start">Feistel in Scientific American (May); NBS first call (15 May)</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">1974</text>
<circle cx="102" cy="100" r="3.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start">NBS second call (August); IBM submits its cipher</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">1975</text>
<circle cx="102" cy="126" r="3.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start">Proposed standard published (17 March)</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">1977</text>
<circle cx="102" cy="152" r="4.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start" font-weight="bold">FIPS 46: the Data Encryption Standard (January)</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">1977</text>
<circle cx="102" cy="178" r="3.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start">Diffie and Hellman's key-search machine (June)</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">1978</text>
<circle cx="102" cy="204" r="3.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start">Senate Intelligence Committee reviews NSA's part</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">1981</text>
<circle cx="102" cy="230" r="3.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start">First CRYPTO conference, Santa Barbara</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">1990</text>
<circle cx="102" cy="256" r="4.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start" font-weight="bold">Biham and Shamir: differential cryptanalysis</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">1993</text>
<circle cx="102" cy="282" r="3.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start">Matsui: linear cryptanalysis; Wiener's key-search design</text>
<text x="88" y="313" font-size="14" text-anchor="end" font-weight="bold">1994</text>
<circle cx="102" cy="308" r="3.5" fill="currentColor"/>
<text x="118" y="313" font-size="14" text-anchor="start">Coppersmith tells IBM's design rules</text>
<text x="88" y="339" font-size="14" text-anchor="end" font-weight="bold">1997</text>
<circle cx="102" cy="334" r="3.5" fill="currentColor"/>
<text x="118" y="339" font-size="14" text-anchor="start">Volunteers find a DES key in 96 days (June)</text>
<text x="88" y="365" font-size="14" text-anchor="end" font-weight="bold">1998</text>
<circle cx="102" cy="360" r="4.5" fill="currentColor"/>
<text x="118" y="365" font-size="14" text-anchor="start" font-weight="bold">Deep Crack finds a key in 56 hours (July)</text>
<text x="88" y="391" font-size="14" text-anchor="end" font-weight="bold">1999</text>
<circle cx="102" cy="386" r="3.5" fill="currentColor"/>
<text x="118" y="391" font-size="14" text-anchor="start">Key found in 22 hours 15 minutes; FIPS 46-3 (3DES)</text>
<text x="88" y="417" font-size="14" text-anchor="end" font-weight="bold">2005</text>
<circle cx="102" cy="412" r="3.5" fill="currentColor"/>
<text x="118" y="417" font-size="14" text-anchor="start">NIST withdraws single DES (19 May)</text>
</svg>
<figcaption>Figure 16.1. The life of DES, 1967 to 2005. The cipher took five years to approve and about twenty years to lose, and the arguments about its design lasted longer than either.</figcaption>
</figure>

## 16.2 Horst Feistel and Lucifer

*Level: beginner.*

Horst Feistel was born in Berlin on 30 January 1915 and went to the United States in 1934, when he was nineteen. By the accounts of his biographers he studied physics at the Massachusetts Institute of Technology and Harvard. The details are thin and I give them as they come: he was a German citizen in the United States when the war began, and could not do secret work until he became a citizen in January 1944. After the war he worked for the US Air Force at its Cambridge Research Center, in Massachusetts, on systems that let a radar tell friendly aircraft from enemy ones, the identification-friend-or-foe equipment of the 1950s. The work is a short step from cryptography, because a friendly aircraft must answer a challenge in a way that the enemy cannot copy, and Feistel turned to the cipher problem itself.

Cryptography brought him into contact with the NSA, and the accounts that survive, in Kahn and in Steven Levy's *Crypto*, say that the contact went badly. The agency regarded the field as its own. His cryptographic work at the Air Force and then at MITRE, the research company near Boston where he moved in the 1960s, was reported to have been stopped or discouraged by NSA, and the story is told as a case of the agency protecting its monopoly. I have not seen a primary source for it, and it should be taken as a well-known account and not as a documented fact. What is certain is that in 1968 Feistel moved to IBM's Thomas J. Watson Research Center at Yorktown Heights, New York, and that there he was allowed to work on exactly this subject. IBM had a reason. It was selling computers and cash dispensers to banks, and its customers wanted a cipher.

### The first Lucifers

At Yorktown Feistel led a small group. The names recorded in IBM's papers and in later accounts include Edna Grossman, Bryant Tuckerman, William Notz, Lynn Smith and, from 1972, a young mathematician named Don Coppersmith, who had been a Putnam Fellow, one of the five top scorers in the American undergraduate mathematics competition, more than once. In March 1970 Feistel wrote an internal research report with the title "Cryptographic coding for data-bank privacy". In May 1973 *Scientific American* published his article "Cryptography and Computer Privacy", and for many readers it was the first description they could read of how a modern cipher is put together. It explained the principle of mixing a message with a key through many rounds of substitution and permutation, with small examples that a reader could follow by hand. In 1975 Feistel, Notz and Smith published a longer technical paper in the *Proceedings of the IEEE*.

The cipher that his group designed was called **Lucifer**. A story that I have seen told in several places says that the name was a joke on the name of an earlier file: the project began as "Demonstration", was shortened by the file-name limits of the day to "Demon", and then became Lucifer. I give it as the usual account and not as a documented one. There was no single Lucifer. The name covers several designs that the group made between about 1969 and 1974, and the descriptions differ. The earlier ones, such as the one in the 1973 article, were substitution-permutation networks, in which the whole block is passed through small substitution boxes and then a permutation of bits, round after round. A later variant, which Arthur Sorkin of IBM described in the journal *Cryptologia* in 1984, has a block of 128 bits, a key of 128 bits and 16 rounds, and a structure of the Feistel type. Where I write "Lucifer" below without more, I mean the later 128-bit design, the one best documented in print.

Lucifer was used. It went into the cash dispensing system that IBM built at its laboratory at Hursley in England for Lloyds Bank, the IBM 2984, which began to be installed about 1971 or 1972 (accounts differ), and so it was one of the first block ciphers in commercial service. The machines of the 1970s were slow and small, and encryption in those years was done in hardware or in a few hundred bytes of program. These limits shaped the design. They are the reason that the final standard has a block of 64 bits, not 128, and S-boxes that take six bits in and give four out: those were the sizes that fit on a chip of 1974.

!!! note "Life story: Horst Feistel"
    **Born:** 30 January 1915, Berlin; went to the United States in 1934; died 14 November 1990 · **Purpose:** to build a cipher a computer could run, for banks and other firms that wanted to protect data and had nothing to buy · **Helped:** led the IBM group that made Lucifer from 1968; his 1973 *Scientific American* article taught the principle to the public; the structure called the Feistel network is named for him and is in many later ciphers · **Status:** in his own time his work was overtaken by the standard his group's design became; the network that bears his name is still how many ciphers are built

!!! note "Life story: Lucifer"
    **Born:** early 1970s at IBM Research, Yorktown Heights, in several versions; one early use was a cash dispenser system for Lloyds Bank in Britain, about 1971 or 1972 · **Purpose:** to protect data in banks and computer networks with a cipher that a computer or a small chip could run · **Helped:** was the base of DES, taught the field the form of the substitution-permutation and Feistel designs, and was the first block cipher many people read about · **Retired:** its name faded after DES was published; the variants are broken by differential cryptanalysis faster than by trying all keys · **Replaced by:** DES (1977)

### The network that carries his name

The structure that Feistel's later designs used is called the **Feistel network**, though it is a little unfair to call it his alone. Its idea is so simple that it is easy to see why it spread, and the next section shows it. It matters to the story for one reason: it made a cipher out of a function that did not have to be undone. That removed the main difficulty of making a block cipher in 1970, which was that every step of a substitution-permutation design must be an invertible one, and the designers had to work hard to make it so.

### In the real world

What do the sources say, and what do they not? The public record of the early Lucifers is Feistel's two papers of 1973 and 1975, a few IBM research reports that circulated in print later (Grossman and Tuckerman's 1977 report, which analyzed a Feistel-like cipher with its rotating key taken out, is an early example of an attack on that family), and Sorkin's article, which appeared ten years after the work. The IBM records of the design decisions in 1973 and 1974 are not public. The account in the rest of the chapter rests on what Walter Tuchman and Carl Meyer, who led the IBM development group at Kingston, New York, said in interviews in the late 1970s, on what Alan Konheim and Don Coppersmith wrote later, and on the NSA's own historical writing. They are honest accounts, and they are accounts by the people who were there. They agree on most of the facts and differ on the one that matters most: how much the NSA changed.

## 16.3 The Feistel network

*Level: beginner.*

A **block cipher** turns a block of bits, say 64 of them, into another block of the same size, under a key. A good one behaves, to anyone without the key, like a random shuffle of all the possible blocks. The shuffle must be one that can be undone, since the receiver has to get the message back. That is the problem a Feistel network solves in a way that is hard to improve on.

Write the block as two halves, a left half $L$ and a right half $R$. A **round** does this:

$$L' = R, \qquad R' = L \oplus F(R, k).$$

The right half moves across unchanged. The old left half is combined, by XOR, with the output of a function $F$ that takes the right half and a round key $k$. Then the halves have changed places, and the next round repeats the step with a new round key. Figure 16.2 shows one round.

<figure class="mars-fig">
<svg viewBox="0 0 640 352" width="640" role="img" aria-label="Diagram of one Feistel round: the right half goes through the function F with a round key and is XORed into the left half, then the halves swap" fill="currentColor" font-size="14">
<text x="320" y="16" font-size="13" text-anchor="middle" font-weight="bold">one round of a Feistel network</text>
<rect x="120" y="28" width="110" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="175.0" y="50.0" font-size="13" text-anchor="middle">L (left half)</text>
<rect x="410" y="28" width="110" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="465.0" y="50.0" font-size="13" text-anchor="middle">R (right half)</text>
<line x1="465" y1="62" x2="465" y2="100" stroke="currentColor" stroke-width="1.3"/>
<line x1="465" y1="100" x2="465" y2="118" stroke="currentColor" stroke-width="1.3"/>
<polygon points="465,118 462.3,111.6 467.7,111.6" fill="currentColor"/>
<rect x="415" y="118" width="100" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="465.0" y="132.5" font-size="13" text-anchor="middle" font-weight="bold">F</text>
<text x="465.0" y="149.5" font-size="13" text-anchor="middle">(round key k)</text>
<text x="562" y="132" font-size="12" text-anchor="start">key</text>
<line x1="556" y1="136" x2="515" y2="136" stroke="currentColor" stroke-width="1.3"/>
<polygon points="515,136 521.4,133.3 521.4,138.7" fill="currentColor"/>
<line x1="415" y1="136" x2="175" y2="136" stroke="currentColor" stroke-width="1.3"/>
<line x1="175" y1="136" x2="175" y2="150" stroke="currentColor" stroke-width="1.3"/>
<polygon points="175,150 172.3,143.6 177.7,143.6" fill="currentColor"/>
<line x1="175" y1="62" x2="175" y2="136" stroke="currentColor" stroke-width="1.3"/>
<circle cx="175" cy="168" r="15" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="164" y1="168" x2="186" y2="168" stroke="currentColor" stroke-width="1.4"/><line x1="175" y1="157" x2="175" y2="179" stroke="currentColor" stroke-width="1.4"/>
<text x="206" y="172" font-size="12" text-anchor="start">XOR</text>
<line x1="175" y1="183" x2="175" y2="205" stroke="currentColor" stroke-width="1.3"/>
<line x1="175" y1="205" x2="465" y2="240" stroke="currentColor" stroke-width="1.3"/>
<line x1="465" y1="62" x2="560" y2="62" stroke="currentColor" stroke-width="1.3" opacity="0"/>
<line x1="520" y1="45" x2="600" y2="45" stroke="currentColor" stroke-width="1.3" opacity="0"/>
<line x1="395" y1="96" x2="395" y2="205" stroke="currentColor" stroke-width="1.3"/>
<line x1="395" y1="96" x2="465" y2="96" stroke="currentColor" stroke-width="1.3"/>
<line x1="395" y1="205" x2="175" y2="240" stroke="currentColor" stroke-width="1.3"/>
<line x1="175" y1="240" x2="175" y2="252" stroke="currentColor" stroke-width="1.3"/>
<polygon points="175,252 172.3,245.6 177.7,245.6" fill="currentColor"/>
<line x1="465" y1="240" x2="465" y2="252" stroke="currentColor" stroke-width="1.3"/>
<polygon points="465,252 462.3,245.6 467.7,245.6" fill="currentColor"/>
<rect x="120" y="252" width="110" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="175.0" y="274.0" font-size="13" text-anchor="middle">new L = R</text>
<rect x="410" y="252" width="110" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="465.0" y="274.0" font-size="13" text-anchor="middle">new R = L xor F</text>
<text x="320" y="316" font-size="13" text-anchor="middle">To undo a round: swap the halves, run F on the new left half, XOR again.</text>
<text x="320" y="336" font-size="13" text-anchor="middle">F is only ever run forward, so it never has to be reversible.</text>
</svg>
<figcaption>Figure 16.2. One round of a Feistel network. The right half passes unchanged to the left; the old left half is XORed with F of the right half and becomes the new right half. Sixteen of these make DES.</figcaption>
</figure>

The whole point is how the round is undone. Suppose you hold $(L', R')$ and know the round key $k$. The old right half is $R = L'$. Then $F(R, k)$ can be computed again, because you know $R$ and $k$. And the old left half is $L = R' \oplus F(R, k)$, because XORing the same value twice cancels it. So the round can be undone *without ever running $F$ backward*. $F$ can be any function at all: it may squash many inputs to one output, it may throw information away, it may be a table of random numbers. The network is invertible whatever $F$ does. Decryption is the same machine with the round keys used in the reverse order.

### A round by hand

Take an 8-bit block, `A7` in hexadecimal, so $L = \text{A}$ and $R = 7$. Let the function be $F(R, k) = (R^2 + k) \bmod 16$. This $F$ cannot be undone: the squares of the sixteen numbers $0$ to $15$, taken mod 16, are only $0, 1, 4$ and $9$, so most outputs have several inputs. Use two rounds, with round keys $3$ and $9$.

- Round 1. $F(7, 3) = 49 + 3 = 52 \bmod 16 = 4$. New halves: $L = 7$, $R = \text{A} \oplus 4 = \text{E}$.
- Round 2. $F(\text{E}, 9) = 196 + 9 = 205 \bmod 16 = 13 = \text{D}$. New halves: $L = \text{E}$, $R = 7 \oplus \text{D} = \text{A}$.
- Undo the last swap: the output is the right half then the left half, `AE`.

To decrypt `AE`, run the same two rounds with the keys in the other order, $9$ and then $3$. Start with $L = \text{A}$, $R = \text{E}$. Round 1 (key $9$): $F(\text{E}, 9) = \text{D}$, so the halves become $L = \text{E}$, $R = \text{A} \oplus \text{D} = 7$. Round 2 (key $3$): $F(7, 3) = 4$, so $L = 7$, $R = \text{E} \oplus 4 = \text{A}$. Undo the last swap and the output is `A7`, the plaintext, though $F$ itself could never be run backward. The code below does exactly this, and also runs a sixteen-round version at the size of DES.

### Code it: the network, and diffusion

The first block is a toy Feistel cipher. It uses SHA-256 as the round function, a hash that nobody can run backward, and it still decrypts. It also shows diffusion, which Shannon asked for ([chapter 15](15-Shannon-and-the-Agencies.md)): flip one bit of the plaintext and see how many bits of the output change as the rounds go on.

```python
import hashlib

def F(half, key, rnd):
    # The round function can be anything at all; here, a hash of the inputs
    data = key + bytes([rnd]) + half.to_bytes(4, "big")
    return int.from_bytes(hashlib.sha256(data).digest()[:4], "big")

def feistel(block, key, rounds=16, decrypt=False):
    L, R = block >> 32, block & 0xFFFFFFFF          # split 64 bits into two halves
    order = range(rounds - 1, -1, -1) if decrypt else range(rounds)
    for rnd in order:
        L, R = R, L ^ F(R, key, rnd)                # one round: swap, mix in F
    return (R << 32) | L                            # undo the last swap

key = b"lucifer"
plain = 0x0123456789ABCDEF
secret = feistel(plain, key)
print(f"{secret:016X}")
print(f"{feistel(secret, key, decrypt=True):016X}")   # same steps, keys reversed

# Diffusion: flip one plaintext bit and about half the output bits change
other = feistel(plain ^ 1, key)
print(f"{other:016X}", bin(secret ^ other).count("1"), "of 64 bits differ")
for rounds in (1, 2, 3, 4, 16):
    a, b = feistel(plain, key, rounds), feistel(plain ^ 1, key, rounds)
    print(rounds, "rounds:", bin(a ^ b).count("1"), "bits differ")
```

```
ABD29F83FE220067
0123456789ABCDEF
2898C7E42582A3A8 32 of 64 bits differ
1 rounds: 19 bits differ
2 rounds: 33 bits differ
3 rounds: 29 bits differ
4 rounds: 36 bits differ
16 rounds: 32 bits differ
```

After one round only one half has been touched; from the second round on, a one-bit change has spread across the block, as Shannon wanted. A toy like this has no security analysis behind it. In a real design all the difficulty lies in $F$ and the key schedule.

The second block is the by-hand example. It prints the halves after each round, so you can check the arithmetic above, and shows that the same function with the keys reversed gives the plaintext back, though $F$ maps many inputs to the same output.

```python
def F(half, k):
    return (half * half + k) % 16      # not reversible: only 0, 1, 4 and 9 come out for k = 0

print("outputs of F with key 0:", sorted(set(F(x, 0) for x in range(16))))

def run(block, keys):
    L, R = block >> 4, block & 15
    for k in keys:
        print(f"  L={L:X} R={R:X}  F(R,{k})={F(R, k):X}")
        L, R = R, L ^ F(R, k)
    print(f"  L={L:X} R={R:X}")
    return R << 4 | L                  # undo the last swap

c = run(0xA7, [3, 9])
print("ciphertext", f"{c:02X}")
p = run(c, [9, 3])                     # the same machine, keys in the reverse order
print("plaintext ", f"{p:02X}")
```

```
outputs of F with key 0: [0, 1, 4, 9]
  L=A R=7  F(R,3)=4
  L=7 R=E  F(R,9)=D
  L=E R=A
ciphertext AE
  L=A R=E  F(R,9)=D
  L=E R=7  F(R,3)=4
  L=7 R=A
plaintext  A7
```

### Why this shape, and what it costs

A Feistel network is not the only design, and its weakness is that only half the block is changed in a round, so more rounds are needed for the effect to spread. AES, which replaced DES, is not a Feistel cipher ([chapter 18](18-The-Internet-Era.md) tells how it was chosen). But for the people who built DES the network had three advantages. It made decryption a matter of reading the keys backward, so one chip could do both. It put no condition on $F$, so the designers could spend their effort on making $F$ strong. And it could be made small enough for the electronics of the time. Michael Luby and Charles Rackoff proved in 1988 that three rounds with truly random round functions give a cipher that no one can tell from a random shuffle, which explained why the shape works; [book 1, chapter 6](../../book/06-Block-Ciphers.md) states the theorem and what it does not say about DES.

## 16.4 The government asks for a cipher

*Level: intermediate.*

The United States government had a problem of its own. Under the Brooks Act of 1965 the National Bureau of Standards (NBS) was the body that set standards for the federal government's computers, and by the early 1970s those computers held tax records, benefit payments and personnel files that were sensitive and not classified. The NSA's ciphers were for classified traffic and were not given to civil departments; an agency that wanted to protect its data had to buy a vendor's scheme, with all the trouble the banks had. In 1972 NBS began a program on computer security. By the accounts I have, its first step was a survey of what federal agencies needed, and the result was a finding that a single, public cryptographic standard was wanted. The NBS institute that ran it was led in those years by Ruth M. Davis, and the staff who carried the work included Dennis Branstad (the detail of who did what at NBS is from NIST's own later histories, and I give the names as the ones those accounts use).

### The first call, and the second

On 15 May 1973 NBS published a notice in the *Federal Register* asking for proposals for an encryption algorithm that could become a federal standard. The notice listed what it wanted. As it is usually summarized, the algorithm had to give a high level of security; be completely specified and easy to understand; put its security in the key and not in the secrecy of the algorithm; be available to all users and suppliers; adapt to many uses; be economical to build in electronic devices; be efficient; and be exportable. The third requirement is Kerckhoffs's rule of 1883 ([chapter 10](10-The-Telegraph.md)) written into a government notice, ninety years later. It was a break with the agencies' habit of keeping algorithms secret.

Very little came in, and nothing that would do. A second notice followed in the *Federal Register* of 27 August 1974 (one NIST publication prints the 17th, which looks like a misprint). This time IBM answered with a cipher developed from Lucifer by the Yorktown and Kingston groups, with Feistel's design at its core and the work of Walter Tuchman, Carl Meyer, Don Coppersmith and Alan Konheim among others. NBS had also asked the NSA for help in judging submissions, and the NSA had agreed; by the second call the agency's director was Lieutenant General Lew Allen, Jr., who held the post from 1973 to 1977.

### From Lucifer to DES

The cipher that IBM submitted was not the 128-bit Lucifer. It was a block cipher of 64 bits with a key of 64 bits, of which 8 are parity bits, so the working key is 56 bits. (The parity bits let a machine check a key for errors; they add no secrecy.) The block was cut in half and the key more than halved. The reason given for the smaller block, by IBM's people, was that it had to fit on one chip with the memory then available, and the eight S-boxes, each taking six bits in and giving four out, were the largest tables that would fit. The reason for the key is the subject of the next section, and it is disputed. Figure 16.3 sets the two designs side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Table comparing Lucifer and DES: block size 128 and 64 bits, key size 128 and 56 bits, 16 rounds each, S-box sizes, and how each was published" fill="currentColor" font-size="14">
<text x="160" y="18" font-size="14" text-anchor="middle" font-weight="bold">Lucifer (a later variant)</text>
<text x="480" y="18" font-size="14" text-anchor="middle" font-weight="bold">DES (FIPS 46, 1977)</text>
<text x="318" y="58" font-size="12" text-anchor="middle" font-weight="bold">block</text>
<rect x="10" y="38" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125.0" y="60.0" font-size="13" text-anchor="middle">128 bits</text>
<rect x="400" y="38" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515.0" y="60.0" font-size="13" text-anchor="middle">64 bits</text>
<text x="318" y="102" font-size="12" text-anchor="middle" font-weight="bold">key</text>
<rect x="10" y="82" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125.0" y="104.0" font-size="13" text-anchor="middle">128 bits</text>
<rect x="400" y="82" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515.0" y="104.0" font-size="13" text-anchor="middle">56 bits (64 with parity)</text>
<text x="318" y="146" font-size="12" text-anchor="middle" font-weight="bold">rounds</text>
<rect x="10" y="126" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125.0" y="148.0" font-size="13" text-anchor="middle">16</text>
<rect x="400" y="126" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515.0" y="148.0" font-size="13" text-anchor="middle">16</text>
<text x="318" y="190" font-size="12" text-anchor="middle" font-weight="bold">S-boxes</text>
<rect x="10" y="170" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125.0" y="192.0" font-size="13" text-anchor="middle">4-bit, several designs</text>
<rect x="400" y="170" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515.0" y="192.0" font-size="13" text-anchor="middle">eight 6-bit-in, 4-bit-out</text>
<text x="318" y="234" font-size="12" text-anchor="middle" font-weight="bold">published by</text>
<rect x="10" y="214" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125.0" y="236.0" font-size="13" text-anchor="middle">IBM papers, 1973 to 1984</text>
<rect x="400" y="214" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515.0" y="236.0" font-size="13" text-anchor="middle">NBS, as a federal standard</text>
<text x="318" y="278" font-size="12" text-anchor="middle" font-weight="bold">design rules</text>
<rect x="10" y="258" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="125.0" y="280.0" font-size="13" text-anchor="middle">never fully published</text>
<rect x="400" y="258" width="230" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515.0" y="280.0" font-size="13" text-anchor="middle">told by IBM in 1994</text>
<text x="320" y="312" font-size="13" text-anchor="middle">The block shrank to fit a single chip; the key shrank after talks with NSA.</text>
</svg>
<figcaption>Figure 16.3. From Lucifer to DES. Sizes are from Sorkin's 1984 description of one Lucifer variant and from FIPS 46; there were several Lucifers.</figcaption>
</figure>

### The standard

NBS published the proposed standard in the *Federal Register* on 17 March 1975, with a statement from IBM that it would grant licenses to the patents on a nonexclusive, royalty-free basis. It asked for comments, and it got them: from banks, from computer makers, and from a few academics who had had to learn the subject to say anything. In the late summer of 1976 NBS held two workshops, one on the technology of key search and one on the cryptographic questions, at which people from IBM, the NSA, the banks and the universities sat in a room and argued. The Secretary of Commerce approved the standard late in 1976, and NBS issued it in January 1977 as Federal Information Processing Standard 46, the **Data Encryption Standard**, effective in the summer. It named the algorithm DES, and the cipher itself the Data Encryption Algorithm.

FIPS 46 required that the standard be reviewed every five years. It was reaffirmed in 1983, reissued as FIPS 46-1 in January 1988 and as FIPS 46-2 in December 1993. The 1993 edition added that, at the next review, NIST (as NBS had been renamed in 1988) would consider alternatives that gave a higher level of security. In October 1999 it appeared as FIPS 46-3, which made Triple DES the standard and allowed single DES only in old systems. The original text envisaged hardware: software implementations were allowed from 1993. The modes in which a block cipher is used to encrypt long messages, which are not part of the cipher itself, came in FIPS 81 (December 1980), and the American National Standards Institute took DES into its own standard X3.92 in 1981. [Book 1, chapter 8](../../book/08-Modes-of-Operation.md) teaches the modes.

The first time a government published a cipher that strong for anyone to use and study, and to ask for design reasons, was a novelty. By the formal record the decision was NBS's and the NSA's part was to advise. How far that was the whole truth is the subject of the next section.

!!! note "Life story: the Data Encryption Standard"
    **Born:** designed 1973 to 1974 at IBM from Lucifer; proposed by NBS on 17 March 1975; issued as FIPS 46 in January 1977, effective that summer · **Purpose:** a public, federal standard cipher for sensitive but unclassified data, for banks as much as for agencies · **Helped:** cash machines, banking networks, Unix and Windows passwords, smart cards; taught a generation how a block cipher is built and attacked · **Retired:** reaffirmed in 1983, 1988, 1993 and 1999; NIST withdrew FIPS 46-3 on 19 May 2005 · **Replaced by:** Triple DES (to 2023), then AES (FIPS 197, 2001)

!!! note "Life story: Don Coppersmith"
    **Born:** 1950; mathematician at IBM Research from 1972 · **Purpose:** to design and check the cipher that became DES, with the Yorktown and Kingston groups · **Helped:** worked on the S-box design; his 1994 paper in the *IBM Journal of Research and Development* told the design rules and the secret of 1974; he also found the attacks on RSA that carry his name (1996) · **Status:** continued as a researcher in mathematics and cryptography

### In the real world

What is the record of 1973 to 1977? The public documents are the two *Federal Register* notices, the standard itself, and the proceedings of the two workshops of 1976. The private ones are IBM's design records, which are not public, and the NSA's evaluation, which was classified and has been seen only in part. The account of who asked for what rests on interviews given at the time, on Johnson's history of the NSA, written in the 1990s and declassified in part, and on the Senate committee's unclassified summary of 1978. The dates in this section are the ones in those documents and in NIST's own account; where one source prints 17 August and the rest 27 August, I give 27 August, the date of the notice itself.

## 16.5 Two suspicions

*Level: intermediate.*

From the day the proposal appeared, critics raised two questions. They were fair questions, and they were not answered for years. Both turned on one fact: the people who knew most about the cipher's strength worked for an agency whose job included reading other people's messages.

### The short key

Lucifer's key had been 128 bits. The key of DES was 56. Every extra bit of key doubles the work of searching for it, so the loss of 72 bits was a loss of a factor of $2^{72}$ in the work of a search, and even the 56 that were left were 256 times too few to match a 64-bit key. It was the first thing the critics saw. In 1975 Whitfield Diffie and Martin Hellman at Stanford argued to NBS that the key should be longer, and in June 1977 they published a design for a machine that would find a key by trying every one. They imagined a million chips, each testing a million keys every second, which would search all $2^{56}$ keys in about a day. They put its cost at about \$20 million, and they estimated that if the cost of building it were spread over several years of use, a key would cost a few thousand dollars to find. This was an amount a government could pay and a bank could not.

The obvious suspicion was that the NSA had wanted a key it could search and its rivals could not. What do the sources say? The NSA's own history of the Cold War, Thomas Johnson's *American Cryptology during the Cold War*, written for the agency in the 1990s and released with redactions, says that the NSA tried to persuade IBM to use a key of 48 bits, that IBM wanted 64, and that they settled on 56. The Senate's summary of 1978 says that the NSA "convinced IBM that a reduced key size was sufficient". IBM's own people said that the choice was a compromise to fit on a chip, and that 56 bits was ample for the banks, who were the customers. None of the accounts says that the NSA wanted a *breakable* key, and none rules it out. It is fair to say that the NSA preferred a key it could reach, that it reached its aim in part, and that the engineering excuse is true as far as it goes.

Hellman went on saying so. In 1979 the magazine *IEEE Spectrum* published his article "DES will be totally insecure within ten years", and Tuchman wrote an answer in the same issue, in which, in reply to the concern about the key, he proposed encrypting three times (the idea behind Triple DES, §16.8).

### The unexplained S-boxes

The second suspicion was about the eight substitution tables. They are the heart of the round function: each takes six bits and returns four, and together they are what makes DES a hard nonlinear function and not a linear one. They were printed in the standard, so everyone could see them, but IBM did not say why they were chosen. They looked random, and they were not. A group at Stanford led by Hellman studied them in 1976 and reported regularities they could not explain, without finding a hidden weakness. A hidden weakness, a *trapdoor* that would let the designer decrypt and no one else, was what the critics feared, and the NSA had looked at the tables.

What happened to the tables is also disputed. Alan Konheim of IBM later recalled that the S-boxes were sent to Washington and came back different. Walter Tuchman, who led the design at Kingston, said in an interview published in 1978 that IBM developed the algorithm entirely within IBM, using IBM people, and that the NSA "did not dictate a single wire". These two statements can both be true: the NSA might have suggested tests or changes, and IBM might have made them. Carl Meyer and Tuchman both said that IBM chose the S-boxes. The reader who wants to take sides has no way to settle it from this evidence, and I do not.

### The Senate looks

In 1977 and 1978 the Senate Select Committee on Intelligence reviewed the NSA's part. Its report is classified, and an unclassified summary was published in 1978. It said, as the summary is quoted in many places, that in the development of DES the NSA had convinced IBM that a reduced key size was sufficient; had indirectly assisted in the development of the S-box structures; and had certified that the final algorithm was, to the best of the agency's knowledge, free of any statistical or mathematical weakness. It said that the NSA did not tamper with the design in any way: IBM invented the algorithm, made the relevant decisions, and agreed that the key size was adequate for the uses intended. Read together, the summary tells that the NSA had a hand in two things, the key and the S-boxes, and denies that it changed the cipher in secret. A reader may find that both comforting and unsatisfying, and the critics did.

Figure 16.4 sets out who dealt with whom. The two suspicions stayed open for a long time. The answer to the second came from outside, in 1990.

<figure class="mars-fig">
<svg viewBox="0 0 640 276" width="640" role="img" aria-label="Diagram of the parties in the making of DES: IBM, the National Bureau of Standards, the NSA, Stanford critics, the Senate committee and bank users, with arrows for submissions and reviews" fill="currentColor" font-size="14">
<rect x="10" y="20" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85.0" y="44.5" font-size="13" text-anchor="middle" font-weight="bold">IBM</text>
<text x="85.0" y="61.5" font-size="13" text-anchor="middle">Yorktown and Kingston</text>
<rect x="245" y="20" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="44.5" font-size="13" text-anchor="middle" font-weight="bold">NBS</text>
<text x="320.0" y="61.5" font-size="13" text-anchor="middle">(now NIST)</text>
<rect x="480" y="20" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555.0" y="44.5" font-size="13" text-anchor="middle" font-weight="bold">NSA</text>
<text x="555.0" y="61.5" font-size="13" text-anchor="middle">Fort Meade</text>
<rect x="10" y="170" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85.0" y="194.5" font-size="13" text-anchor="middle">Stanford</text>
<text x="85.0" y="211.5" font-size="13" text-anchor="middle">Diffie and Hellman</text>
<rect x="245" y="170" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="194.5" font-size="13" text-anchor="middle">Senate Select</text>
<text x="320.0" y="211.5" font-size="13" text-anchor="middle">Committee on Intelligence</text>
<rect x="480" y="170" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555.0" y="194.5" font-size="13" text-anchor="middle">Bankers and</text>
<text x="555.0" y="211.5" font-size="13" text-anchor="middle">other users</text>
<line x1="160" y1="40" x2="245" y2="40" stroke="currentColor" stroke-width="1.3"/>
<polygon points="245,40 238.6,42.7 238.6,37.3" fill="currentColor"/>
<text x="202" y="32" font-size="11" text-anchor="middle">1974 submits</text>
<line x1="245" y1="62" x2="160" y2="62" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="160,62 166.4,59.3 166.4,64.7" fill="currentColor"/>
<text x="202" y="78" font-size="11" text-anchor="middle">licence</text>
<line x1="395" y1="40" x2="480" y2="40" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="480,40 473.6,42.7 473.6,37.3" fill="currentColor"/>
<text x="437" y="32" font-size="11" text-anchor="middle">asks to review</text>
<line x1="480" y1="62" x2="395" y2="62" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="395,62 401.4,59.3 401.4,64.7" fill="currentColor"/>
<text x="437" y="78" font-size="11" text-anchor="middle">opinion (secret)</text>
<text x="320" y="262" font-size="12" text-anchor="middle">NSA also talked to IBM about key size and S-boxes; the accounts of Johnson, Konheim and Tuchman differ.</text>
<line x1="160" y1="180" x2="245" y2="80" stroke="currentColor" stroke-width="1.3"/>
<polygon points="245,80 242.9,86.7 238.7,83.1" fill="currentColor"/>
<text x="60" y="130" font-size="11" text-anchor="start">1975 to 1977 objections</text>
<line x1="320" y1="170" x2="320" y2="80" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="320,80 322.7,86.4 317.3,86.4" fill="currentColor"/>
<text x="330" y="130" font-size="11" text-anchor="start">1977 to 1978 review</text>
<line x1="480" y1="198" x2="395" y2="198" stroke="currentColor" stroke-width="1.3"/>
<polygon points="395,198 401.4,195.3 401.4,200.7" fill="currentColor"/>
<text x="437" y="190" font-size="11" text-anchor="middle">needs</text>
<line x1="395" y1="214" x2="480" y2="214" stroke="currentColor" stroke-width="1.3"/>
<polygon points="480,214 473.6,216.7 473.6,211.3" fill="currentColor"/>
<text x="437" y="234" font-size="11" text-anchor="middle">standard</text>
</svg>
<figcaption>Figure 16.4. Who dealt with whom, 1974 to 1978. Solid arrows are public acts; dashed arrows were done in private or only partly reported.</figcaption>
</figure>

!!! note "Life story: the 1977 key-search machine"
    **Born:** designed by Whitfield Diffie and Martin Hellman at Stanford and published as "Exhaustive Cryptanalysis of the NBS Data Encryption Standard" (*Computer*, June 1977) · **Purpose:** to show that a 56-bit key could be found by a government-sized machine, and so to argue for a longer key · **Helped:** about $10^{12}$ keys a second and a cost of about \$20 million were its numbers; later machines came close to these on both counts · **Status:** never built, as far as is known; the design framed the argument for twenty years

## 16.6 The S-boxes were stronger, not weaker

*Level: intermediate.*

In the 1980s the open attacks on DES were few and weak. Hellman published a method, in 1980, that traded memory for time in a key search ([the Cryptanalysis book](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md) covers it). The British mathematician Donald Davies, known as one of the inventors of packet switching, noted a statistical weakness in the pairs of S-boxes that was later improved by others. But the cipher stood. Then came a surprise from Israel.

### Biham and Shamir, 1990

Eli Biham, a graduate student, and his adviser Adi Shamir, the S of RSA, at the Weizmann Institute in Israel, were looking at DES-like ciphers in the late 1980s. They found a new general method of attack, which they presented at CRYPTO in August 1990: **differential cryptanalysis**. The idea, in plain words, is to look at pairs of plaintexts that differ in a chosen way, and to follow how that difference spreads through the rounds. Some differences in the input of a round are more likely than others to turn into particular differences in the output, and a cipher whose rounds have a skewed table of these chances leaks information about the last round key. It is a *chosen-plaintext* attack: the attacker must get many pairs encrypted. The method was first used against the Japanese cipher FEAL, which it broke with a handful of plaintexts, and against several other ciphers of the time. [The Cryptanalysis book](../cryptanalysis/05-Differential-Cryptanalysis.md) teaches it from the start; here it matters for what it said about DES.

Against DES it did less. Biham and Shamir's first paper beat a plain key search only on DES cut down to 15 rounds or fewer. In 1992 they reached the full 16 rounds, but it took $2^{47}$ chosen plaintexts, which is about 140 trillion blocks encrypted under one key. No real attacker could get that. And they noticed something stranger. When they changed the S-boxes a little, or changed the order of the boxes, or used random boxes, the cipher became much weaker against their method. DES, as it stood, was stronger against the method than almost every variant they tried. Whoever had designed it had known about this attack.

### Coppersmith, 1994

They were right. In 1994 Don Coppersmith published "The Data Encryption Standard (DES) and its strength against attacks" in the *IBM Journal of Research and Development*. He wrote that IBM's team had known the technique in 1974, that they called it the "T-attack", and that they had designed the S-boxes and the rest of the round function to resist it. He listed the rules for the S-boxes that IBM had applied. And he said why they had stayed silent. After discussions with the NSA, he wrote, it was decided that to disclose the design rules would reveal differential cryptanalysis, "a powerful technique that can be used against many ciphers", and so would weaken the advantage the United States had in cryptography. The secret had lasted sixteen years, from 1974 to 1990, and there was a further four before the account came out in print.

Among the rules in his list, as book 1 and the Cryptanalysis book give them: no output bit of an S-box should be close to a linear function of the input bits; changing one input bit should change at least two output bits; two inputs that differ in the two middle bits should give outputs that differ in at least two bits; and for any nonzero difference in the input, no one output difference should occur too often. The code below tests the first three of these rules, on the real tables and on random ones.

### Code it: were the S-boxes special?

The table below is the one from FIPS 46: eight S-boxes, four rows of sixteen entries each, written out row by row in hexadecimal. The program tests three of Coppersmith's rules on each of the eight, and then on thousands of random S-boxes of the same shape (each row a shuffle of the numbers 0 to 15, which is how the real tables are laid out). It also finds the largest entry of the difference table for each box, which is what differential cryptanalysis cares about most.

```python
import random

S = ["e4d12fb83a6c5907" "0f74e2d1a6cb9538" "41e8d62bfc973a50" "fc8249175b3ea06d",
     "f18e6b34972dc05a" "3d47f28ec01a69b5" "0e7ba4d158c6932f" "d8a13f42b67c05e9",
     "a09e63f51dc7b428" "d709346a285ecbf1" "d6498f30b12c5ae7" "1ad069874fe3b52c",
     "7de3069a1285bc4f" "d8b56f03472c1ae9" "a690cb7df13e5284" "3f06a1d8945bc72e",
     "2c417ab6853fd0e9" "eb2c47d150fa3986" "421bad78f9c5630e" "b8c71e2d6f09a453",
     "c1af92680d34e75b" "af427c9561de0b38" "9ef528c3704a1db6" "432c95fabe17608d",
     "4b2ef08d3c975a61" "d0b7491ae35c2f86" "14bdc37eaf680592" "6bd814a7950fe23c",
     "d2846fb1a93e50c7" "1fd8a374c56b0e92" "7b419ce206adf358" "21e74a8dfc90356b"]

def make(table):                 # an S-box as a function of 6 bits; rows picked by the outer bits
    return lambda x: table[(x >> 4 & 2 | x & 1) * 16 + (x >> 1 & 15)]

def bits(n):
    return bin(n).count("1")

def rule1(s):                    # one input bit changed: at least two output bits change
    return all(bits(s(x) ^ s(x ^ (1 << i))) >= 2 for x in range(64) for i in range(6))

def rule2(s):                    # the two middle input bits changed (001100): at least two output bits change
    return all(bits(s(x) ^ s(x ^ 0b001100)) >= 2 for x in range(64))

def rule3(s):                    # S(x) never equals S(x xor 11ef00), for any e and f
    return all(s(x) != s(x ^ (0b110000 | e << 2)) for x in range(64) for e in range(4))

def worst(s):                    # biggest entry of the difference table, of 64 pairs
    best = 0
    for d in range(1, 64):
        seen = [0] * 16
        for x in range(64):
            seen[s(x) ^ s(x ^ d)] += 1
        best = max(best, max(seen))
    return best

des = [make([int(c, 16) for c in row]) for row in S]       # the eight real boxes

print("DES boxes passing rules 1, 2, 3:", [sum(r(s) for s in des) for r in (rule1, rule2, rule3)])
print("DES largest difference-table entry, box by box:", [worst(s) for s in des])

random.seed(1974)
def random_box():
    rows = [random.sample(range(16), 16) for _ in range(4)]
    return make([v for row in rows for v in row])

tests = [random_box() for _ in range(3000)]
print("3000 random boxes passing rules 1, 2, 3:", [sum(r(s) for s in tests) for r in (rule1, rule2, rule3)])
print("all three at once:", sum(rule1(s) and rule2(s) and rule3(s) for s in tests))
print("random boxes, mean largest entry:", round(sum(worst(s) for s in tests[:300]) / 300, 1))
```

```
DES boxes passing rules 1, 2, 3: [8, 8, 8]
DES largest difference-table entry, box by box: [16, 16, 16, 16, 16, 16, 16, 16]
3000 random boxes passing rules 1, 2, 3: [0, 1, 0]
all three at once: 0
random boxes, mean largest entry: 15.8
```

The real tables pass all three rules, in all eight boxes. Almost no random table passes even one: the first rule alone fails for every random box in this sample, because a random table sends some one-bit change of the input to a one-bit change of the output about once in four tries. The tables of DES were not random, and they were chosen on purpose. The last line is a caution. The largest entry of the difference table is 16 for every DES box, and for random boxes it is about the same, so that number alone does not make DES special. What does is the whole set of rules together, and the way the boxes sit with the expansion and the bit permutation around them. That is the argument of [chapter 5 of the Cryptanalysis book](../cryptanalysis/05-Differential-Cryptanalysis.md), and I do not repeat it here.

### Matsui, 1993

One more attack was not in IBM's rules. In 1993 Mitsuru Matsui of Mitsubishi Electric published **linear cryptanalysis**, a second general method, at EUROCRYPT. It looks for a linear relation between some plaintext bits, some ciphertext bits and some key bits that holds a little more often than half the time, and uses many known plaintexts to find the key bits. His first version of the attack on DES needed $2^{47}$ known plaintexts. An improved version needed $2^{43}$, and at CRYPTO in August 1994 he reported that he had run it, on twelve workstations for about fifty days, and recovered a real DES key, the first time anyone had broken the full cipher by a method that was faster than a key search. This is a *known*-plaintext attack, and so easier to mount than a chosen-plaintext one, though $2^{43}$ blocks is still about 70 terabytes of traffic under one key. DES had not been designed against it, and Coppersmith's paper does not claim it was. [The Cryptanalysis book](../cryptanalysis/06-Linear-Cryptanalysis.md) has the method.

!!! note "Life story: differential cryptanalysis"
    **Born:** presented by Eli Biham and Adi Shamir at CRYPTO in August 1990 (full paper in the *Journal of Cryptology*, 1991), after IBM's team had found the same method in 1974 and kept it secret at the NSA's request · **Purpose:** to break block ciphers by following how differences between plaintext pairs spread through the rounds · **Helped:** broke FEAL and many others; showed that DES's S-boxes were built to resist it; shaped every block cipher design after it, AES included · **Status:** a standard test that every new block cipher must pass

!!! note "Life story: Mitsuru Matsui and linear cryptanalysis"
    **Born:** 1993, Matsui at Mitsubishi Electric; first experimental break of full DES by this method in 1994 · **Purpose:** to find a linear relation between bits of plaintext, ciphertext and key that holds with a bias, and use it to recover key bits · **Helped:** the fastest attack on DES that needs no chosen plaintext; the second standard test for ciphers; Matsui went on to design the cipher MISTY1 · **Status:** a standard test, and a tool for the cryptanalysts of every block cipher since

### What this shows, and what it does not

The usual reading is that the history answered both suspicions, though not in the way critics expected. The S-boxes were no trapdoor. They were stronger than random ones against an attack the public did not know for sixteen years, and the people who made them had kept that secret on purpose. The short key was the weakness, and it was a weakness in the simplest attack there is. That reading is probably right, and it should be held with two cautions. First, it does not tell what the NSA knew. The NSA may have known differential cryptanalysis before IBM, as Coppersmith's wording suggests, and may have known linear cryptanalysis, about which the public record says nothing. Second, it does not tell what the NSA intended. An agency that made one part of a cipher stronger and another part weaker, and said nothing, had not been honest with those who used the cipher, whatever its reasons. The story of the next section is how the weak part was found.

## 16.7 The key falls

*Level: beginner.*

The key of DES had 56 bits, and a key search is only arithmetic. The first block of code below does the arithmetic, and adds the key sizes that the argument of §16.5 was about. It uses two rates: the million chips of Diffie and Hellman's paper of 1977, at $10^{12}$ keys a second, and the 90 billion keys a second that the Electronic Frontier Foundation's machine reached in 1998.

```python
keys = 2 ** 56
print(f"{keys:,} DES keys")

# Diffie and Hellman's 1977 design: a million chips, a million keys a second each
print(f"{keys / 10 ** 12 / 3600:.0f} hours to try them all")

# The EFF's Deep Crack (1998) tested about 90 billion keys a second
print(f"{keys / 90e9 / 86400:.1f} days to try them all")

# AES-128 at the same speed
print(f"{2 ** 128 / 90e9 / 86400 / 365.25:.1e} years")

# What the argument of 1975 was about: 48, 56 and 64 bits at the 1977 design's speed
for bits in (48, 56, 64):
    print(f"{bits} bits: {2 ** bits / 10 ** 12 / 3600:,.2f} hours at 10^12 keys a second")
```

```
72,057,594,037,927,936 DES keys
20 hours to try them all
9.3 days to try them all
1.2e+20 years
48 bits: 0.08 hours at 10^12 keys a second
56 bits: 20.02 hours at 10^12 keys a second
64 bits: 5,124.10 hours at 10^12 keys a second
```

A 48-bit key, which the NSA is said to have wanted, falls in under five minutes to that machine. A 64-bit key, which IBM wanted, would have kept it busy for about 213 days, 256 times as long as 56 bits. The difference is only a factor of 256 either way, and it is the difference between a machine a government could build in 1977 and a machine that a hobbyist could not.

### 1977 to 1993: designs on paper

For fifteen years nobody built the machine. Diffie and Hellman's was a design, and the number that mattered, \$20 million, was real money. The NSA, of course, could afford it, and so could a few other governments. In 1993 Michael Wiener of Bell-Northern Research, in Ottawa, gave a talk at CRYPTO that made the point sharper. He had worked out a custom chip that did one DES encryption every clock tick and was organized so that every part was always busy, and he costed the whole machine, down to the racks: 57,600 chips, about \$1 million, a DES key found in 3.5 hours on average. It was still a design, and it was detailed enough that nobody could say it was fantasy. The argument moved from whether a government could to whether a large company could. [The Cryptanalysis book](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md) follows the prices of search machines through the whole period and on to the graphics cards of today; this section keeps to the people and the contests.

### 1997 to 1999: the contests

On 28 January 1997 RSA Data Security, the firm that sold the RSA algorithm, announced a series of public challenges with prizes. A message had been encrypted under a secret key, and the first to recover the key would win; the first prize, for a DES key, was \$10,000. The challenges ran in three rounds, I to III, and each of them had a known beginning of the plaintext so that a searcher could recognize a hit. The point, for RSA, was a public one: US export rules at that time limited the strength of the cryptography that could be sold abroad, and the company wanted to show what a key of the permitted length was worth.

The first challenge fell to volunteers. A programmer named Rocke Verser of Loveland, Colorado, wrote a search program, and Matt Curtin and Justin Dolske helped organize it as the DESCHALL project. They asked people with spare computers to run it, and tens of thousands of ordinary machines on the internet did. The key was found on 17 June 1997, after 96 days and after the volunteers had covered about a quarter of the key space. The secret message read "Strong cryptography makes the world a safer place". It was the first time a DES key had been found by search in a public contest. In the winter of 1998 a second challenge was solved, by the group that took the name distributed.net, in about forty days. A pattern was clear: each time the same task took less time, and the prize was never the interesting part.

### July 1998: Deep Crack

The Electronic Frontier Foundation, founded in 1990 by, among others, John Gilmore, Mitch Kapor and John Perry Barlow to defend civil liberties in the new networks, decided to answer the question with a machine, not a call for volunteers. The US government had said, in public, that DES was strong enough for export and that cracking it would need an agency's budget. The EFF built a machine to show the opposite.

It worked with the cryptographer Paul Kocher and his firm, Cryptography Research, who did the architecture, and with Advanced Wireless Technologies, who built the custom chips. The machine was called *Deep Crack* (a play on the chess computer Deep Blue). It had 1,856 custom chips on 29 circuit boards (some accounts give 1,536 chips), in a few chassis, and cost, by the EFF's accounts, under \$250,000. It tried about 90 billion keys a second. In July 1998 it won RSA's second challenge in 56 hours, and the EFF announced it in a press release from San Francisco on 17 July. The decoded message was "It's time to move to a new standard than DES." In January 1999, joined with distributed.net's volunteers, it found the key of the third challenge in 22 hours and 15 minutes. That message read "See you in Rome (second AES Conference, March 22-23, 1999)". The conference was where the candidates to replace DES were compared ([chapter 18](18-The-Internet-Era.md)).

Figure 16.5 sets the machines on one scale. Compare Deep Crack with the 1977 design. It was about eighty times cheaper and only about eleven times slower. The EFF also did something that was not about speed. It published the whole design, with the chip layout and the software, as a book, *Cracking DES* (O'Reilly, 1998), printed in a form that could be scanned back into a computer. Books were protected by the First Amendment and could be exported, and software, under the rules then in force, could not. The fight over that rule is told in [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md).

<figure class="mars-fig">
<svg viewBox="0 0 640 362" width="640" role="img" aria-label="Bar chart on a log scale of the time to find one DES key, from a 1977 design (20 hours) to Deep Crack in 1998 (56 hours)" fill="currentColor" font-size="14">
<text x="210" y="16" font-size="12" text-anchor="start" font-weight="bold">hours to find one DES key (log scale)</text>
<text x="200" y="47" font-size="12" text-anchor="end">1977  Diffie-Hellman design</text>
<rect x="210" y="30" width="130.1" height="24" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="346.1029995663981" y="47" font-size="12" text-anchor="start">20 h</text>
<text x="200" y="81" font-size="12" text-anchor="end">1993  Wiener design</text>
<rect x="210" y="64" width="54.4" height="24" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="270.40680443502754" y="81" font-size="12" text-anchor="start">3.5 h</text>
<text x="200" y="115" font-size="12" text-anchor="end">1997  DESCHALL volunteers</text>
<rect x="210" y="98" width="336.2" height="24" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>
<text x="552.2482474751174" y="115" font-size="12" text-anchor="start">96 days</text>
<text x="200" y="149" font-size="12" text-anchor="end">1998  distributed.net</text>
<rect x="210" y="132" width="297.1" height="24" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>
<text x="513.1275848738105" y="149" font-size="12" text-anchor="start">39 days</text>
<text x="200" y="183" font-size="12" text-anchor="end">1998  Deep Crack (EFF)</text>
<rect x="210" y="166" width="174.8" height="24" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>
<text x="390.81880270062004" y="183" font-size="12" text-anchor="start">56 h</text>
<text x="200" y="217" font-size="12" text-anchor="end">1999  Deep Crack + volunteers</text>
<rect x="210" y="200" width="134.7" height="24" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>
<text x="350.73300153169504" y="217" font-size="12" text-anchor="start">22.25 h</text>
<text x="200" y="251" font-size="12" text-anchor="end">2006  COPACOBANA (average)</text>
<rect x="210" y="234" width="232.0" height="24" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>
<text x="448.0" y="251" font-size="12" text-anchor="start">8.7 days</text>
<text x="200" y="285" font-size="12" text-anchor="end">2012  crack.sh (whole space)</text>
<rect x="210" y="268" width="141.5" height="24" fill="currentColor" fill-opacity="0.35" stroke="currentColor" stroke-width="1.2"/>
<text x="357.4973347970818" y="285" font-size="12" text-anchor="start">26 h</text>
<line x1="210" y1="306" x2="610" y2="306" stroke="currentColor" stroke-width="1.2"/>
<line x1="210.0" y1="306" x2="210.0" y2="312" stroke="currentColor" stroke-width="1.2"/>
<text x="210.0" y="326" font-size="11" text-anchor="middle">1 h</text>
<line x1="310.0" y1="306" x2="310.0" y2="312" stroke="currentColor" stroke-width="1.2"/>
<text x="310.0" y="326" font-size="11" text-anchor="middle">10 h</text>
<line x1="410.0" y1="306" x2="410.0" y2="312" stroke="currentColor" stroke-width="1.2"/>
<text x="410.0" y="326" font-size="11" text-anchor="middle">100 h</text>
<line x1="510.0" y1="306" x2="510.0" y2="312" stroke="currentColor" stroke-width="1.2"/>
<text x="510.0" y="326" font-size="11" text-anchor="middle">1,000 h</text>
<line x1="610.0" y1="306" x2="610.0" y2="312" stroke="currentColor" stroke-width="1.2"/>
<text x="610.0" y="326" font-size="11" text-anchor="middle">10,000 h</text>
<text x="320" y="350" font-size="12" text-anchor="middle">Dashed bars are designs on paper; solid bars are machines that ran. Figures are as reported.</text>
</svg>
<figcaption>Figure 16.5. The time to find a DES key, 1977 to 2012. Averages and full-space times are mixed, so compare the order of magnitude, not the digits.</figcaption>
</figure>

!!! note "Life story: Deep Crack"
    **Born:** July 1998; built by the Electronic Frontier Foundation (John Gilmore) with Cryptography Research (Paul Kocher) and Advanced Wireless Technologies · **Purpose:** to show, with a real machine, that a DES key can be found in days and for less than a government's budget, to settle an argument about export policy · **Helped:** 1,856 custom chips on 29 boards, about 90 billion keys a second, under \$250,000; won the second RSA challenge in 56 hours (July 1998) and, with distributed.net, the third in 22 hours 15 minutes (January 1999) · **Retired:** the design was published and the machine itself was displaced by cheaper programmable-chip machines · **Replaced by:** COPACOBANA (2006), then other programmable-chip machines and services

### After Deep Crack

The next machine did away with custom chips. In 2006 a group at the universities of Bochum and Kiel in Germany built COPACOBANA, from 120 ordinary programmable chips (FPGAs) on 20 plug-in cards, for under €10,000 in parts. It found a DES key in under nine days on average (8.7 days in the 2006 paper, at a clock of 100 MHz; about 6.4 days at a higher clock rate in later reports). The argument of its builders was that a chip a university could buy at retail could now do what had needed a custom chip, and could be reloaded for other ciphers. A later model did the job in under a day, and in 2012 a service called crack.sh, built by David Hulton and publicized by Moxie Marlinspike at DEF CON, offered a DES key in about a day to anyone with a captured Microsoft network handshake. The full account of the machines is in [the Cryptanalysis book](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md), with the Life story card of COPACOBANA.

### Break it: a DES key with fourteen unknown bits

The simplest attack on DES needs one known block of plaintext and its ciphertext, and tries keys until one fits. The program below does this with a real DES (the tables are the ones in FIPS 46; [book 1, chapter 6](../../book/06-Block-Ciphers.md) explains the code). It plays the part of one of the RSA contests: the plaintext block begins with the same words that all the challenges used, `The unkn`, and the searcher knows all of the key except fourteen bits. Python does a few thousand blocks a second, so it can try $2^{14} = 16{,}384$ keys in seconds. Deep Crack's chips tried that many in about two tenths of a microsecond.

```python
IP = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
      62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
      57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
      61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
FP = [IP.index(i) + 1 for i in range(1, 65)]            # the inverse of IP
E = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
     16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1]
P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
     2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25]
PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3,
       60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37,
       29, 21, 13, 5, 28, 20, 12, 4]
PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
       41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32]
SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
S = [[int(c, 16) for c in s] for s in (               # the eight S-boxes, row by row
    "e4d12fb83a6c5907" "0f74e2d1a6cb9538" "41e8d62bfc973a50" "fc8249175b3ea06d",
    "f18e6b34972dc05a" "3d47f28ec01a69b5" "0e7ba4d158c6932f" "d8a13f42b67c05e9",
    "a09e63f51dc7b428" "d709346a285ecbf1" "d6498f30b12c5ae7" "1ad069874fe3b52c",
    "7de3069a1285bc4f" "d8b56f03472c1ae9" "a690cb7df13e5284" "3f06a1d8945bc72e",
    "2c417ab6853fd0e9" "eb2c47d150fa3986" "421bad78f9c5630e" "b8c71e2d6f09a453",
    "c1af92680d34e75b" "af427c9561de0b38" "9ef528c3704a1db6" "432c95fabe17608d",
    "4b2ef08d3c975a61" "d0b7491ae35c2f86" "14bdc37eaf680592" "6bd814a7950fe23c",
    "d2846fb1a93e50c7" "1fd8a374c56b0e92" "7b419ce206adf358" "21e74a8dfc90356b")]

def perm(x, table, n):                  # output bit i is bit table[i] of the n-bit input
    return sum((x >> (n - t) & 1) << (len(table) - 1 - i) for i, t in enumerate(table))

def subkeys(key):                       # 16 round keys of 48 bits
    k = perm(key, PC1, 64)              # drop the 8 parity bits: 56 left
    c, d, out = k >> 28, k & 0xfffffff, []
    for s in SHIFTS:
        c = (c << s | c >> (28 - s)) & 0xfffffff
        d = (d << s | d >> (28 - s)) & 0xfffffff
        out.append(perm(c << 28 | d, PC2, 56))
    return out

def f(r, k):                            # the round function
    x = perm(r, E, 32) ^ k
    y = 0
    for i in range(8):
        b = x >> (42 - 6 * i) & 63
        y = y << 4 | S[i][(b >> 4 & 2 | b & 1) * 16 + (b >> 1 & 15)]
    return perm(y, P, 32)

def des(block, key, decrypt=False):
    ks = subkeys(key)
    if decrypt:
        ks = ks[::-1]
    x = perm(block, IP, 64)
    L, R = x >> 32, x & 0xffffffff
    for k in ks:
        L, R = R, L ^ f(R, k)
    return perm(R << 32 | L, FP, 64)

# The check value from the standard: key 133457799BBCDFF1 turns 0123456789ABCDEF into 85E813540F0AB405
print("%016X" % des(0x0123456789ABCDEF, 0x133457799BBCDFF1))

# The contest: six key bytes are known, the last two hold 14 secret bits (the 8th bit of each byte is parity)
def make_key(g):
    return int.from_bytes(bytes.fromhex("133457799bbc") + bytes([(g >> 7) << 1, (g & 127) << 1]), "big")

plain = int.from_bytes(b"The unkn", "big")
cipher = des(plain, make_key(9000))           # the "secret" is g = 9000

for guess in range(2 ** 14):
    if des(plain, make_key(guess)) == cipher:
        print(f"key {make_key(guess):016X} found after {guess + 1:,} of {2 ** 14:,} tries")
        break

# Scale it up: this program does about 2,000 keys a second; Deep Crack did 90 billion
years = 2 ** 56 / 2000 / (365.25 * 86400)
print(f"56 bits at 2,000 a second: {years:,.0f} years; at 90 billion a second: {2 ** 56 / 90e9 / 86400:.1f} days")
```

```
85E813540F0AB405
key 133457799BBC8C50 found after 9,001 of 16,384 tries
56 bits at 2,000 a second: 1,141,684 years; at 90 billion a second: 9.3 days
```

The search finds the key after exactly 9,001 tries, which is the number the code gave it. Nothing about the attack is clever, and that was Diffie and Hellman's whole argument: the cost is only the cost of one DES encryption, times $2^{56}$, divided by how many chips you can afford. To find a key on average, which means searching half the space, this program would need about 570,000 years. Deep Crack's chips needed 9.3 days to try every key, so about 4.6 days on average, and the contest key turned up after 56 hours, about a quarter of the way through.

### In the real world

What did the contests prove? They proved that the number $2^{56}$ was within reach of a small group with a small budget, and they did so in public, with a message that anyone could check. They did not prove anything about how many secret machines already existed, and they could not. The argument that the EFF set out to answer was that cracking DES took a government's budget. Deep Crack showed that it took about a quarter of a million dollars and a few engineers who had published a design. After July 1998 there was no argument that single DES was safe against a determined opponent, and NIST's decision, in 1997, to open a competition for a replacement, was already under way. The chapter that tells that competition is [chapter 18](18-The-Internet-Era.md).

## 16.8 Triple DES and the long retirement

*Level: intermediate.*

The cipher did not die when its key fell. The banks had billions of dollars' worth of equipment and software that spoke DES, and they could not replace it overnight. The answer was to run DES more than once.

The obvious plan is to encrypt twice with two different keys. It gives much less than it seems to. In 1981 Ralph Merkle and Martin Hellman showed, in a short paper called "On the Security of Multiple Encryption", that a *meet-in-the-middle* attack beats double encryption. If you know a plaintext and its ciphertext, you encrypt the plaintext under every possible first key and decrypt the ciphertext under every possible second key, and look for a match in the middle. This costs about $2^{57}$ operations, though a lot of memory, and not $2^{112}$. So double DES is hardly stronger than the single cipher. [The Cryptanalysis book](../cryptanalysis/04-Brute-Force-Birthdays-and-Trade-offs.md) works through it.

Three encryptions are enough to push the cost out of reach. The form that became standard is *encrypt-decrypt-encrypt* (EDE): encrypt with a first key, decrypt with a second and encrypt with a third. The middle step is a decryption so that, when all three keys are the same, the result is single DES, and an old machine could talk to a new one. Walter Tuchman of IBM proposed the idea, with two keys, in his reply to Hellman in 1979, and the American banking standard ANSI X9.17 (1985, for the management of keys between financial institutions) included it. The ANSI standard X9.52 (1998) and FIPS 46-3 (October 1999) made it official. With three independent keys the key is 168 bits long, and the security against the best attacks is about 112 bits; with two keys, which was common, it is 112 bits long and about 80 bits are left against the best known attacks, as book 1 shows.

Triple DES was three times slower than DES, and DES was already slow in software. It kept the 64-bit block, and that turned out to be its second weakness. When two blocks of a long message under one key come out equal, an attacker learns something about the plaintext. By the birthday bound that begins to be likely after about $2^{32}$ blocks, which is 32 gigabytes. Hardly anyone worried in 1999, when a few gigabytes was a large transfer. In 2016 Karthikeyan Bhargavan and Gaëtan Leurent of Inria showed, in an attack called **Sweet32**, that it could be done against HTTPS and OpenVPN connections that still used a 64-bit block cipher, with traffic that a busy web session could produce in a day or two. The attack belongs to the Cryptanalysis book, and the numbers are in the code below.

```python
# The birthday bound: with n-bit blocks, about 1.18 * 2**(n/2) blocks under one key
# give a repeated ciphertext block with probability one half
for n in (64, 128):
    blocks = 1.1774 * 2 ** (n / 2)
    print(f"{n}-bit blocks: {blocks:.2e} blocks, about {blocks * n / 8 / 1e9:.2e} gigabytes")

# Double encryption by meet in the middle, against triple with three independent keys
print("double DES:", f"{2 ** 57:.2e}", "operations; triple DES, three keys:", f"{2 ** 112:.2e}")
```

```
64-bit blocks: 5.06e+09 blocks, about 4.05e+01 gigabytes
128-bit blocks: 2.17e+19 blocks, about 3.48e+11 gigabytes
double DES: 1.44e+17 operations; triple DES, three keys: 5.19e+33
```

### The long retirement

The standards bodies moved slowly. NIST published the Advanced Encryption Standard as FIPS 197 in November 2001 and withdrew single DES, FIPS 46-3, on 19 May 2005. Triple DES stayed. Its specification moved into a special publication, SP 800-67 (first issued in 2004, revised in 2012 and again in November 2017), which called it the Triple Data Encryption Algorithm, TDEA. After the Sweet32 paper, the 2017 revision limited the amount of data that could be encrypted under one key, to about $2^{20}$ blocks, as I read it. NIST's transition document, SP 800-131A (first issued in 2011, revised in 2015 and 2019), set the end: Triple DES could be used for encryption until the end of 2023, and after that only to decrypt old data. In June 2023 NIST announced that SP 800-67 would be withdrawn, and it was withdrawn on 1 January 2024. Payment systems and some old equipment kept using it, and a lot of Triple DES is still running, mostly inside systems that nobody has opened in a long time. The last of those dates comes nearly forty-seven years after FIPS 46 was issued.

!!! note "Life story: Triple DES"
    **Born:** proposed by Walter Tuchman of IBM in 1979, analyzed by Merkle and Hellman in 1981, put in ANSI X9.17 (1985) and ANSI X9.52 (1998), and in FIPS 46-3 (October 1999) · **Purpose:** to keep a DES-compatible cipher with a key long enough to be safe, without replacing the machines · **Helped:** banks, payment cards, and electronic funds transfer for twenty years · **Retired:** encryption disallowed by NIST after 31 December 2023 (SP 800-131A); SP 800-67 withdrawn · **Replaced by:** AES (FIPS 197, 2001)

## 16.9 DES in the world

*Level: beginner.*

A standard is measured by where it ended up. DES ended up in nearly everything that handled money in the 1980s and 1990s, and in a few places where nobody planned for it.

### Money and PINs

The first big customer was the cash machine. When a customer typed a PIN, the machine needed to send it to the bank's computer without exposing it on the line, and the bank needed to check it without keeping a list of PINs. The method that IBM's 3624 machine used, in the late 1970s, was one that many banks followed. The PIN was never stored. It was derived: the bank encrypted the customer's account number with DES under a secret PIN key, turned some of the resulting hexadecimal digits into decimal digits with a fixed table, and the result was the PIN (or the PIN plus a small offset that the customer's own choice made up). When the machine wanted a check, it encrypted the PIN, sent it over a link under another DES key, and the host did the same arithmetic. A web of keys, one for each link and each machine, was held in tamper-resistant boxes, which the later chapters of this book call hardware security modules. The American banking standard X9.17 (1985) described how to distribute and renew these keys, with a DES-based key hierarchy and a random number generator built on Triple DES that was used well beyond banking. The standards for the PIN block format and for message authentication codes built on DES were written by the same committees. [Chapter 19](19-Hardware-Quantum-and-the-Long-View.md) tells the story of the boxes.

This system was good, and it failed in the places that were not DES. The attacks on bank PIN systems that came out in the early 2000s, by Mike Bond and Piotr Zieliński and others at Cambridge, did not break DES. They abused the table that turned hexadecimal digits into decimal ones, and the interface by which the host answered queries. Ross Anderson's *Security Engineering* has the accounts. The lesson, which is the one the historians of cryptography keep finding, is that the weak point was rarely the cipher.

### Passwords: Unix crypt

In 1979 Robert Morris and Ken Thompson of Bell Labs wrote "Password Security: A Case History", about how Unix stored passwords. The system could not keep the passwords themselves in a file that every user could read. They kept the result of enciphering a fixed block with the password as key, so that someone who read the file saw only a scrambled value, and a login was checked by doing the same thing to what the user typed. The scheme used a changed DES. The password, up to eight characters, was used as a 56-bit key, with seven bits taken from each character, and the all-zero block was enciphered with it 25 times. A 12-bit *salt*, picked at random for each user, was used to change the expansion table inside DES, so that two users with the same password had different entries, and a DES chip bought for the job could not be used on it. The salt and the 25 rounds were there to make a search slow. The scheme lasted, in one form or another, for twenty years, and it is the ancestor of the password hashing in [book 1, chapter 11](../../book/11-Passwords-and-Key-Derivation.md).

### Windows: the LAN Manager hash

Microsoft's LAN Manager, in the late 1980s, used DES in a much poorer way, and it is a good example of what an old standard can do to a newer system. A password of up to 14 characters was changed to upper case, padded with zeros to 14 characters, and cut into two halves of seven. Each half was used as a 56-bit DES key to encrypt the fixed eight-byte text `KGS!@#$%`, and the two results, joined, made the stored hash. There was no salt. The result is that a 14-character password is two separate passwords of 7 characters, each of which can be attacked alone, with no case. Windows kept making this hash for years, and Windows Vista (2007) stopped storing it by default. The code below makes the hash with a real DES, the same DES as in §16.7, repeated here so the block runs by itself.

```python
IP = [58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4,
      62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
      57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3,
      61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7]
FP = [IP.index(i) + 1 for i in range(1, 65)]
E = [32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17,
     16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24, 25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1]
P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10,
     2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25]
PC1 = [57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3,
       60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37,
       29, 21, 13, 5, 28, 20, 12, 4]
PC2 = [14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2,
       41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32]
SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1]
S = [[int(c, 16) for c in s] for s in (
    "e4d12fb83a6c5907" "0f74e2d1a6cb9538" "41e8d62bfc973a50" "fc8249175b3ea06d",
    "f18e6b34972dc05a" "3d47f28ec01a69b5" "0e7ba4d158c6932f" "d8a13f42b67c05e9",
    "a09e63f51dc7b428" "d709346a285ecbf1" "d6498f30b12c5ae7" "1ad069874fe3b52c",
    "7de3069a1285bc4f" "d8b56f03472c1ae9" "a690cb7df13e5284" "3f06a1d8945bc72e",
    "2c417ab6853fd0e9" "eb2c47d150fa3986" "421bad78f9c5630e" "b8c71e2d6f09a453",
    "c1af92680d34e75b" "af427c9561de0b38" "9ef528c3704a1db6" "432c95fabe17608d",
    "4b2ef08d3c975a61" "d0b7491ae35c2f86" "14bdc37eaf680592" "6bd814a7950fe23c",
    "d2846fb1a93e50c7" "1fd8a374c56b0e92" "7b419ce206adf358" "21e74a8dfc90356b")]

def perm(x, table, n):
    return sum((x >> (n - t) & 1) << (len(table) - 1 - i) for i, t in enumerate(table))

def subkeys(key):
    k = perm(key, PC1, 64)
    c, d, out = k >> 28, k & 0xfffffff, []
    for s in SHIFTS:
        c = (c << s | c >> (28 - s)) & 0xfffffff
        d = (d << s | d >> (28 - s)) & 0xfffffff
        out.append(perm(c << 28 | d, PC2, 56))
    return out

def f(r, k):
    x = perm(r, E, 32) ^ k
    y = 0
    for i in range(8):
        b = x >> (42 - 6 * i) & 63
        y = y << 4 | S[i][(b >> 4 & 2 | b & 1) * 16 + (b >> 1 & 15)]
    return perm(y, P, 32)

def des(block, key):
    L, R = perm(block, IP, 64) >> 32, perm(block, IP, 64) & 0xffffffff
    for k in subkeys(key):
        L, R = R, L ^ f(R, k)
    return perm(R << 32 | L, FP, 64)

def key_from_7_bytes(seven):          # 7 bytes -> a DES key: 7 bits in each byte, the last bit left for parity
    bits = int.from_bytes(seven, "big")
    out = 0
    for i in range(8):
        out = out << 8 | ((bits >> (49 - 7 * i)) & 127) << 1
    return out

def lm_hash(password):
    pw = password.upper().encode("ascii")[:14].ljust(14, b"\0")     # upper case, padded to 14
    magic = int.from_bytes(b"KGS!@#$%", "big")
    return "%016X%016X" % (des(magic, key_from_7_bytes(pw[:7])), des(magic, key_from_7_bytes(pw[7:])))

for pw in ("password", "Passw0rd", "abc", ""):
    print(f"{pw!r:12} {lm_hash(pw)}")

# Each half is searched alone: 69 possible characters (upper case, digits and symbols), 7 places
print(f"{69 ** 7:,} possible halves, against {2 ** 56:,} keys for the whole 14-character form")
```

```
'password'   E52CAC67419A9A224A3B108F3FA6CB6D
'Passw0rd'   B34CE522C3E4C8774A3B108F3FA6CB6D
'abc'        8C6F5D02DEB21501AAD3B435B51404EE
''           AAD3B435B51404EEAAD3B435B51404EE
7,446,353,252,589 possible halves, against 72,057,594,037,927,936 keys for the whole 14-character form
```

Every hash for a password of seven characters or fewer ends in the same sixteen hexadecimal digits, `AAD3B435B51404EE`, which is the encryption of the magic text under an all-zero key. That constant, in a dump of a password file, is a mark that the second half was empty. The hash of `password` that this program prints is the well-known one. A 14-character password gives no more security than the harder of its two halves, and each half can be found by a search of $69^7$, about $7 \times 10^{12}$, which a single modern graphics card does in under an hour. In 2012 DES turned up again in a different place: the MS-CHAPv2 authentication that many corporate VPNs used was shown to reduce to a single DES key search, as the Cryptanalysis book tells.

### Other places

DES was also the cipher of MIT's Kerberos system, designed for the Athena project in the 1980s and used for years in version 4; of Sun's secure remote procedure calls; of early versions of several secure protocols of the 1990s, among them Netscape's SSL, which offered DES and Triple DES suites; and of a huge number of smart cards and payment terminals. The long life was not an accident. A cipher that has a standard number, a validated chip and a bank's approval is a cipher that engineers can specify without arguing, and that, as it turned out, outlasted the confidence of the people who made it.

!!! note "Life story: the Windows LAN Manager hash"
    **Born:** late 1980s, in Microsoft's LAN Manager network system, which used DES to hash passwords of up to 14 characters in two halves of seven · **Purpose:** to store a password so that the system could check it without keeping it · **Helped:** early Windows file sharing and logins; its flaws (no salt, no lower case, two halves) became the textbook case of what to avoid · **Retired:** Windows Vista (2007) stopped storing it by default; it still appears in old systems and in the files of attackers · **Replaced by:** the NT hash and, later, salted and slow password hashes

## 16.10 Cryptography comes out in the open

*Level: beginner.*

Until the 1970s the subject had two kinds of people: those who worked for an agency, and a small band of amateurs, historians and puzzle-solvers. The amateurs had a place of their own, the American Cryptogram Association, founded around 1929, whose magazine *The Cryptogram* printed hand ciphers to solve. The professionals published nothing. There was no university course on how a modern cipher works, no journal devoted to it, and no meeting at which two people who had worked on the same problem could compare notes. Kahn's *The Codebreakers* of 1967, a long history for general readers, told the public that the field existed ([chapter 15](15-Shannon-and-the-Agencies.md) tells how the NSA reacted). It did not make the field a profession.

DES did. A published, standard cipher with unexplained tables gave academics something concrete to study, and the argument about it gave them a reason to do so in public. Within a few years of the standard the subject had a journal, a conference, a learned society and the beginnings of a literature. Figure 16.6 sets out the dates of the opening, from the first public arguments over the key to the publication of differential cryptanalysis.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Timeline of cryptography becoming an open academic field, 1967 to 1990" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="322" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1967</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">Kahn, The Codebreakers</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">1973</text>
<circle cx="102" cy="48" r="3.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start">Feistel in Scientific American</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">1975-77</text>
<circle cx="102" cy="74" r="3.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start">Public argument over the DES key</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">1977</text>
<circle cx="102" cy="100" r="3.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start">Cryptologia begins (Albion College)</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">1977</text>
<circle cx="102" cy="126" r="3.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start">An NSA employee's letter warns that publishing may break export law</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">1978</text>
<circle cx="102" cy="152" r="3.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start">A patent secrecy order on a professor's cipher is lifted</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">1980</text>
<circle cx="102" cy="178" r="3.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start">Public Cryptography Study Group formed</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">1981</text>
<circle cx="102" cy="204" r="4.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start" font-weight="bold">First CRYPTO, Santa Barbara; study group reports</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">1982</text>
<circle cx="102" cy="230" r="4.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start" font-weight="bold">Eurocrypt at Burg Feuerstein; IACR founded</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">1987</text>
<circle cx="102" cy="256" r="3.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start">Computer Security Act: civilian side to NBS</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">1988</text>
<circle cx="102" cy="282" r="3.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start">Journal of Cryptology; NBS becomes NIST</text>
<text x="88" y="313" font-size="14" text-anchor="end" font-weight="bold">1990</text>
<circle cx="102" cy="308" r="4.5" fill="currentColor"/>
<text x="118" y="313" font-size="14" text-anchor="start" font-weight="bold">Differential cryptanalysis published, 16 years after IBM saw it</text>
</svg>
<figcaption>Figure 16.6. How cryptography left the agencies, 1967 to 1990. Each step was small; together they made a field that publishes, reviews and argues in public.</figcaption>
</figure>

### Cryptologia, 1977

The first of the new institutions was a journal. *Cryptologia* appeared in January 1977 from Albion College in Michigan, under Brian Winkel, a mathematician, with Cipher Deavours, David Kahn, Louis Kruh and Greg Mellen among its founders. It was a quarterly for the history and the practice of the subject, in English, and for the first time it printed things that a student could use: the solution of a historical cipher, a review of a machine, the description of a modern one. Sorkin's account of Lucifer appeared there in 1984, and Tuchman's and Meyer's interview in 1978. It is still published, and its back issues are one of the main sources for this chapter.

### 1977: the year of three arguments

The year of the standard was also the year in which most of what follows was decided. The DES critique by Diffie and Hellman was published in June. In 1976 the same two men had published "New Directions in Cryptography", and in 1977 a team at MIT (Rivest, Shamir and Adleman) invented RSA; [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md) tells that story. An academic was now doing, in public and with a blackboard, the work that the agencies had done in secret, and with ideas that the agencies had not published. The reaction was swift.

In July 1977 a letter arrived at the offices of the Institute of Electrical and Electronics Engineers. It was written by Joseph A. Meyer, who worked for the NSA, and it said that the publication of certain papers on cryptography might break the law that controlled the export of arms, the International Traffic in Arms Regulations, and that the IEEE and the authors might be liable. Meyer said, in later accounts, that he wrote on his own initiative, not for the agency. The accounts, in Levy's *Crypto* and in Hellman's own recollections, agree that the letter caused alarm. The IEEE's lawyers said, in effect, that the question was open, and Hellman and his graduate students, who were due to present papers at the information theory symposium at Cornell that autumn, were told by Stanford's counsel that the law was unclear and that the university would defend them. The papers were given in October, as planned, and nothing happened.

The agency's concern did not go away. The NSA's directors argued that the unrestricted publication of cryptographic research might damage national security, that a few people in universities might, by accident, publish what the agency had spent years learning, and that rivals would read it. The academics argued that a field cannot be studied in secret, that secret ciphers are not trusted for good reason, and that the agency's claim to control what a professor wrote was a claim on the First Amendment. Both arguments had force, and neither side was acting in bad faith. Bobby Ray Inman, who directed the NSA from 1977 to 1981 and who was unusually willing to speak in public, said in 1978 and after that he thought some form of control over such publication might be needed, and floated the idea of legislation. None was passed.

Then came a case that put a face on the dispute. George Davida, a professor of computer science at the University of Wisconsin-Milwaukee, applied for a patent in 1977 on a cipher device. In 1978 the Patent Office, acting under the Invention Secrecy Act of 1951 and at the request, as the accounts say, of the NSA, put a *secrecy order* on his application, which would have made it a crime for him to discuss his own invention. There was a public protest, in which a number of universities and the press joined, and within a few months the order was lifted. The patent route had failed as a means of control, and the agency looked for another.

### The Public Cryptography Study Group

In 1980 the American Council on Education, the body that speaks for the American universities, set up a **Public Cryptography Study Group** to consider the problem. It was formed, by most accounts, at the NSA's urging, and it included academics (George Davida among them), lawyers and an NSA representative. It reported in early 1981. It did not recommend a law. It recommended a voluntary arrangement: authors of papers on cryptography would send them to the NSA before they were published, in confidence, and the NSA would say whether it had a national-security objection, and the authors could then do as they liked. The scheme was voluntary, and it began in that year. How much use it saw is hard to say from the record; the accounts by Landau and by Kahn suggest that it touched few papers. What it did was to establish the idea that the two sides could talk.

!!! note "Life story: Cryptologia"
    **Born:** January 1977, Albion College, Michigan; founded by Brian Winkel, Cipher Deavours, David Kahn, Louis Kruh and Greg Mellen · **Purpose:** to be a journal in English for the history, technique and practice of cryptology, when there was none · **Helped:** printed Tuchman and Meyer's interview (1978), Sorkin on Lucifer (1984), historical solutions and machine reviews; gave academics and amateurs a place to publish · **Status:** still published; its back issues are a main source for the history of cryptology

## 16.11 Crypto, Eurocrypt and the voluntary review

*Level: beginner.*

### The first CRYPTO, 1981

In August 1981 about a hundred people met at the University of California, Santa Barbara, for what was named the CRYPTO conference. It is usually credited to David Chaum, then finishing a doctorate at Berkeley, who worked with Allen Gersho of the university at Santa Barbara; I have taken that from Levy and from the accounts of the participants and have not seen the program itself. The people in the room were a mix of mathematicians, electrical engineers, computer scientists and a few officials from the agencies who attended as listeners. The accounts describe people who had worked alone, or in one laboratory, meeting for the first time others who had worked on the same questions. It has been held every August since, in the same city, and is the main meeting of the field.

The people. David Chaum, born in 1955, was to become the inventor of digital cash and of the *mix*, the idea behind anonymous remailers and, later, Tor. His 1981 paper "Untraceable electronic mail, return addresses, and digital pseudonyms" had been published in the *Communications of the ACM* in February of that year. Gus Simmons of Sandia National Laboratories, a mathematician who wrote on the theory of authentication and who showed at CRYPTO in 1983 how a message can carry a hidden second message, the "prisoners' problem", later edited a large collection of survey articles on the field (1992). The names that recur in the early proceedings are those of the next chapter, Diffie, Hellman, Merkle, Rivest, Shamir and Adleman, and a younger generation that includes Shafi Goldwasser and Silvio Micali, who in 1982 wrote the paper that began the modern definition of what it means for a cipher to be secure.

### Eurocrypt and the IACR, 1982

The next year had two events. In March and April 1982, at Burg Feuerstein, a castle near Erlangen in Germany, a workshop on cryptography took place, organized by the mathematician Thomas Beth. It is counted as the first Eurocrypt, and its proceedings, edited by Beth, appeared as volume 149 of Springer's *Lecture Notes in Computer Science*. And at the CRYPTO meeting in August 1982 the participants agreed to form a learned society. It became the **International Association for Cryptologic Research (IACR)**, which runs the two meetings and, since the 1990s, several others, and publishes the proceedings. (Accounts differ on the date at which the association was formally constituted; "1982" is the date it gives itself.) The proceedings of CRYPTO have been published by Springer since 1984; they carry the series title *Advances in Cryptology*.

In 1988 the IACR began the *Journal of Cryptology*, the field's own refereed journal. A subject has a journal, a conference and a society, and now it had all three. The first volume of a refereed journal is a mark of a profession, because it means someone other than the author will say whether a result is right.

The textbooks came with them. Alan Konheim of IBM, who had been on the DES design team, wrote *Cryptography: A Primer* (1981). Carl Meyer and Stephen Matyas of IBM wrote *Cryptography: A New Dimension in Computer Data Security* (1982), a book from inside the DES project. And Dorothy Denning of Purdue wrote *Cryptography and Data Security* (1982), which for a decade was the standard university text. In 1993 to 1994 Bruce Schneier's *Applied Cryptography* became the book that the next generation learned from; it belongs to the next chapter's story.

!!! note "Life story: the CRYPTO conference"
    **Born:** August 1981, University of California, Santa Barbara; usually credited to David Chaum with Allen Gersho · **Purpose:** to be a meeting in which cryptographers could compare work in the open · **Helped:** about a hundred people at the first one; the meeting where many of the central papers of the next decades were first given, including Simmons's prisoners' problem (1983); its proceedings carry the title *Advances in Cryptology* · **Status:** held every August in Santa Barbara; the IACR's main meeting

!!! note "Life story: the IACR"
    **Born:** 1982, founded by the participants at and after the first CRYPTO and Eurocrypt meetings · **Purpose:** to hold the meetings, publish the proceedings and, from 1988, the *Journal of Cryptology* · **Helped:** gave the field a society that no government or company owns; it also runs the ePrint archive, where most results now appear first · **Status:** still the field's main body, with several meetings a year

### The agency, the Act and the standard

The agency did not accept the opening quietly, and it did not lose on every point. In 1984 President Reagan signed a directive, NSDD-145, that made the NSA responsible for the security of sensitive but unclassified government communications and computers, including those of private firms in some cases. That cut across the arrangement under which NBS ran civilian standards, and Congress and the computer industry objected. The answer was the Computer Security Act of 1987, which gave NBS the responsibility for standards for sensitive unclassified information and required the NSA to advise and not to lead. The next year, in 1988, NBS was renamed the National Institute of Standards and Technology. The dividing line was drawn again, not very sharply, and it was to be argued over for as long as there have been standards.

In the same years the NSA had a plan for DES. In 1986 it announced a *Commercial COMSEC Endorsement Program* under which it would supply, or endorse, its own secret algorithms for industry's use, and said it would not recertify DES when its term came up. The banks, who had built their whole systems on DES, protested, and so did the computer firms. The NSA backed down, and NBS reissued DES in January 1988 as FIPS 46-1. It was an early case of an industry standing up in public to an agency's judgment about a cipher, and it won.

### In the real world

What is on the record? The documents are the Public Cryptography Study Group's report of 1981, the Computer Security Act and NSDD-145, the NSA director's speeches, and the memoirs of the people involved. What is thin is the working of the voluntary review: how many papers were sent, what was said to the authors, and whether any was changed. The agency has not published a list, and the academic accounts are by people who, for the most part, did not use it. I have not found a count. That the system existed is certain; that it was important is not.

## 16.12 Who was in the room

*Level: beginner.*

The chapters on the war told of women who made up much of the workforce at Bletchley Park and Arlington Hall ([chapter 13](13-Bletchley-Park.md), [chapter 14](14-The-Rest-of-the-War.md), [chapter 15](15-Shannon-and-the-Agencies.md)). In this chapter the record names fewer of them. The designers of Lucifer and DES, the founders of the first conferences and the authors of the papers that the 1970s argument was about were, as far as the sources show, mostly men: Feistel, Tuchman, Meyer, Coppersmith, Konheim, Diffie, Hellman, Merkle, Rivest, Shamir, Adleman, Biham, Matsui. That is a fact about the field at the time, and it is also a fact about what the sources record. The women who were there are named in the places where they are named, and the sources are thin; I give the ones I am sure of.

**Ruth M. Davis** directed the computer science institute at the National Bureau of Standards in the early 1970s, when the program that led to DES began, and NIST's own histories credit her with starting it. She was a mathematician and a government scientist in a field where the most important decisions were made by a few officials. I have given the part she is credited with and no more, because the sources I have for it are secondhand.

**Edna Grossman** of IBM Research worked with Feistel on the Lucifer designs and wrote, with Bryant Tuckerman, one of the first papers that analyzed a Feistel-like cipher (1977). Her name appears in the IBM reports and in the acknowledgments of other people's papers; I have found very little else about her, and that is itself a record of how thinly the early work is documented.

**Dorothy Denning** was a computer scientist at Purdue when she wrote *Cryptography and Data Security* (1982), and her book taught the subject to the students of the 1980s. With Giovanni Sacco she found a weakness in a famous key-distribution protocol (1981), the Denning-Sacco attack, and she later wrote one of the first models of intrusion detection (1987). In 1993 she was one of five outside reviewers of the NSA's Skipjack cipher, along with Ernest Brickell, Stephen Kent, David Maher and Walter Tuchman, and she took a public part, on the government's side, in the debate over the Clipper chip; [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md) tells that story.

**Shafi Goldwasser**, with Silvio Micali, wrote "Probabilistic Encryption" (1982, with the full paper in 1984), which gave the first rigorous definition of what it means for an encryption to be secure against an attacker who knows a great deal. The definition is the one in use today ([book 1, chapter 17](../../book/17-Defining-Security.md)). With Micali and Charles Rackoff she also introduced the interactive proof. She shared the Turing Award with Micali in 2012.

**Ann Caracristi**, whom [chapter 15](15-Shannon-and-the-Agencies.md) introduced, became the NSA's deputy director in 1980, the agency's first woman in that post, and held it until 1982, by the NSA's own biography of her. In that role she was part of the agency's side of the argument of §16.10, though what she said or did in it is not on the public record that I have seen.

**Susan Landau**, a mathematician and computer scientist, wrote a short history of DES, "Standing the Test of Time: The Data Encryption Standard" (*Notices of the American Mathematical Society*, 2000), and with Whitfield Diffie the book *Privacy on the Line* (1998), about wiretapping and cryptography policy.

!!! note "Life story: the government and academic divide"
    **Born:** the divide opened in the 1970s, when work on ciphers began to be done outside the agencies; its marks are the Meyer letter (July 1977), the Davida secrecy order (1978) and the Public Cryptography Study Group (1980 to 1981) · **Purpose:** to say who may publish, who may export and who may set a standard for ciphers · **Helped:** led to the voluntary review (1981), the Computer Security Act (1987) and, in the 1990s, the crypto wars of the next chapter · **Status:** never settled; each generation of the argument has been about a different technology, and the same two questions, whether openness helps the enemy and whether secrecy can be trusted

!!! note "Life story: Dorothy Denning"
    **Born:** 1945; computer scientist, Purdue, SRI International, Georgetown, and the Naval Postgraduate School · **Purpose:** to teach the field and to work on its security problems · **Helped:** *Cryptography and Data Security* (1982); the Denning-Sacco attack (1981); an intrusion-detection model (1987); one of five outside reviewers of Skipjack in 1993 · **Status:** a leading figure in both computer security education and the debate on government access to encrypted data

## 16.13 After DES: other ciphers of the era

*Level: intermediate.*

DES was not alone for long. A standard cipher with a short key and a 64-bit block invited alternatives, and the open field of the 1980s and 1990s produced a good many. A few of them are worth knowing because they show what the designers had learned, and what they had not yet.

**FEAL** came from the Japanese telephone company NTT. Akihiro Shimizu and Shoji Miyaguchi published it in 1987 as a faster alternative to DES that could run in software on the small processors of the time, a Feistel cipher with four rounds, later extended to eight and to $N$ rounds. It fell at once. The first attacks came in 1988, and by 1990 and 1991 the new methods did the rest: differential cryptanalysis, which Biham and Shamir first tried on FEAL, and linear cryptanalysis, which Matsui and Atsuhiro Yamagishi used on it in 1992, before Matsui turned to DES. FEAL is the cipher that the new attacks were first tuned on.

**IDEA** was designed by Xuejia Lai and James Massey at the Swiss Federal Institute of Technology in Zurich and published in 1990 and 1991. It had a 64-bit block like DES, but a 128-bit key, and it did not use S-boxes at all: it mixed three kinds of arithmetic that do not fit together, XOR, addition modulo $2^{16}$ and multiplication modulo $2^{16} + 1$, which is how it resisted the new attacks. Phil Zimmermann chose it for the second version of PGP (1992), and so for some years it protected much of the world's private email ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)). It was patented, and the patents expired about 2011 and 2012.

**RC2 and RC4** were designed by Ron Rivest for RSA Data Security in 1987. They were trade secrets. RC4 is a stream cipher, very small and fast, and it spread because it was easy to put in software. Its source code appeared anonymously on a mailing list in September 1994, and it was found to match the licensed product. In its 40-bit export form it was used in the early web, and in a longer form in the WEP security of Wi-Fi (1997) and in TLS, where RFC 7465 banned it in 2015.

**Blowfish** was Bruce Schneier's cipher, published in 1993 in the first of the Fast Software Encryption workshops, a Feistel cipher with a 64-bit block, a key of up to 448 bits and large key-dependent S-boxes. It was free, which counted for much, and it was fast. It shares the 64-bit block limit with DES, and so the Sweet32 limit of §16.8.

**GOST 28147-89** was the Soviet standard of 1989, a Feistel cipher with a 64-bit block, 32 rounds and a 256-bit key. Its S-boxes were not part of the standard but were supplied separately, and the cipher became known in the West in the early 1990s. [Book 1, chapter 6](../../book/06-Block-Ciphers.md) says more of it and of the other national ciphers built on the Feistel plan.

**Skipjack** was the NSA's own. It was designed for the Clipper chip of 1993 ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)) and for the Fortezza card, with a 64-bit block, an 80-bit key and 32 rounds. It was classified until June 1998, when the NSA released the description. It was among the first chances anyone outside had to see how the agency built a block cipher. In 1999 Eli Biham, Alex Biryukov and Adi Shamir broke 31 of its 32 rounds with a method called impossible differentials.

### Can these be broken today?

This is where the answers begin to change. The old ciphers fell to counting, to the methods of the first half of the book. These fall, if at all, to a key that is too short or a block that is too small, or to the two methods of §16.6.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Lucifer | yes, in its published forms | Biham and Shamir's differential cryptanalysis breaks the Lucifer variants faster than trying every key. |
| DES | yes, in hours | Try every one of the $2^{56}$ keys against one known block. Deep Crack did it in 56 hours in 1998; a rack of programmable chips, like the public crack.sh service of 2012, takes about a day. |
| Triple DES | not by key search | Two or three keys put trying every key out of reach. Its 64-bit block is the problem: after about 32 GB under one key, repeated blocks leak data (Sweet32, 2016). NIST disallowed it for new encryption after 2023. |
| FEAL | yes, easily | Differential and linear cryptanalysis need only a handful of chosen or known plaintexts for the 4-round version. |
| RC4 | yes, in practice | Its keystream is slightly biased, and with enough encryptions of the same secret the biases reveal it. WEP fell this way, and TLS banned RC4 in 2015 (RFC 7465). |
| RC2, at its 40-bit export size | yes, instantly | The key is short enough to try them all on one computer. |
| IDEA, Blowfish | no practical break | No attack on the full cipher is much faster than trying every key, but their 64-bit blocks hit the same Sweet32 limit as Triple DES. |
| Skipjack | not the full cipher | Biham, Biryukov and Shamir broke 31 of its 32 rounds in 1999. Its 80-bit key is too short for new use. |

DES's weakness is the simplest attack of all: know one block of plaintext and its ciphertext, then try keys until one fits. The toy Feistel cipher below has a 16-bit key, so the search is instant. Every extra key bit doubles the work, and the last lines print how many times harder some real key sizes are.

```python
import hashlib

def F(half, key, rnd):
    data = key.to_bytes(2, "big") + bytes([rnd]) + half.to_bytes(4, "big")
    return int.from_bytes(hashlib.sha256(data).digest()[:4], "big")

def feistel(block, key, rounds=8):
    L, R = block >> 32, block & 0xFFFFFFFF
    for rnd in range(rounds):
        L, R = R, L ^ F(R, key, rnd)
    return (R << 32) | L

secret_key = 0xBEEF                       # a 16-bit key: 65,536 possibilities
known_plain = 0x0123456789ABCDEF          # a block the attacker knows, e.g. a fixed header
known_cipher = feistel(known_plain, secret_key)

for guess in range(2 ** 16):              # try every key in turn
    if feistel(known_plain, guess) == known_cipher:
        print(f"key found: {guess:04X} after {guess + 1:,} tries")
        break

for bits in (16, 40, 56, 128):
    print(f"{bits:3}-bit key: {2 ** bits:.1e} keys, {2 ** (bits - 16):.1e} times this search")
```

```
key found: BEEF after 48,880 tries
 16-bit key: 6.6e+04 keys, 1.0e+00 times this search
 40-bit key: 1.1e+12 keys, 1.7e+07 times this search
 56-bit key: 7.2e+16 keys, 1.1e+12 times this search
128-bit key: 3.4e+38 keys, 5.2e+33 times this search
```

A 40-bit export key is about seventeen million of these searches, an afternoon on one modern computer with a fast cipher. DES's 56 bits is a trillion: too much for a laptop, easy for special hardware. A 128-bit key is out of reach for any machine that could be built.

### What the new ciphers learned

The ciphers of the 1980s and 1990s show a field that had learned, from the DES story, three things. They were designed with the two new attacks in mind, which is how a design came to be checked: the claim became "no differential or linear attack faster than key search", not "the designers are careful". They were published, with their reasons, because a design nobody could check had been the lesson of the S-boxes. And the ones that failed, FEAL most of all, failed in public and quickly, where the DES attacks had taken twenty years. That last difference is the real change. A published cipher is attacked by many people with new tools, and it is the speed of the attack, not any single result, that tells how sound a design is. In 1997 NIST asked the world to submit ciphers for a new standard and to attack each other's, and the way the next chapter tells it is the answer to the story of this one.

## 16.14 Going deeper

*Level: expert.*

### What the evidence is

The account of DES in §16.4 to §16.6 stands on a small number of sources, and it helps to line them up by what they are.

- **Documents of the time.** The two *Federal Register* notices (1973 and 1974), the proposed standard (1975), FIPS 46 (1977), the proceedings of the 1976 workshops, and the Senate committee's unclassified summary (1978). These are authentic and mostly dry. The Senate's full report remains classified, as far as I know.
- **Statements by participants made in the late 1970s.** Tuchman's and Meyer's interview in *Cryptologia* (1978), Konheim's recollections, and the Stanford group's reports. They are contemporary and partisan: IBM's people had reasons to say that IBM alone designed the cipher, and the Stanford group had reasons to doubt it.
- **Later accounts by participants.** Coppersmith's paper (1994), written after the secret was out and thus the only one that tells why IBM said nothing; Biham and Shamir's book (1993); and the memoirs of Diffie and Hellman.
- **The agency's own history.** Johnson's *American Cryptology during the Cold War* (written in the 1990s for the NSA, released with redactions). It is the only source from the NSA's side for the claim that the agency pressed for a 48-bit key. I have not been able to open the declassified text myself, and I take the wording from later quotation, so that claim is, for me, single-sourced and secondhand.
- **Journalism and histories.** Kolata's reports in *Science* (1977), Levy's *Crypto* (2001), Landau's article (2000) and the EFF's book (1998). They are good, and they depend on interviews that the authors did a long time after the events.

What is not public is the heart of the matter: IBM's design notes of 1973 and 1974, the NSA's evaluation, and the full Senate report. Until they are, the question of how much the NSA changed rests on the word of the people who were there.

### What the attack costs suggest

Coppersmith's paper and Matsui's attack allow a comparison that is a little more informative than either alone. Against the full 16 rounds, differential cryptanalysis needs $2^{47}$ chosen plaintexts, and linear cryptanalysis needs $2^{43}$ known plaintexts, a lower number, and an easier kind of data to get. If the designers had optimized against both methods equally, one would expect the costs to be about even. They are not, and the linear attack, which was published last, is the cheaper. This is the usual argument for believing that IBM designed against the differential attack and did not know of the linear one; the S-boxes were chosen to a list of rules about differences, and the list does not contain a rule against the linear relations that Matsui found (as I recall, his own account notes that one S-box, the fifth, has the property that his attack uses most). It is evidence, not proof. It is also an argument only about IBM. It says nothing about what the NSA knew in 1974, and the public record says nothing either.

### The price of speed

The machines of §16.7 can be put on one scale. The code below gives the rate and the price of each, as stated in the sources, and works out how many keys a second each bought for one dollar. Two of the machines were designs and two were built. The price of COPACOBANA is in euros, treated here as dollars, a small error for this purpose.

```python
# (name, keys a second, price in dollars as stated)
machines = [
    ("Diffie-Hellman 1977, design", 1e12, 20e6),
    ("Wiener 1993, design", 57600 * 50e6, 1e6),         # 57,600 chips, one key per tick at 50 MHz
    ("Deep Crack 1998, built", 90e9, 250e3),
    ("COPACOBANA 2006, built", 2 ** 55 / (8.7 * 86400), 10e3),   # 8.7 days to cover half the keys
]
for name, rate, price in machines:
    avg_hours = 2 ** 55 / rate / 3600                       # on average half the keys are tried
    print(f"{name:29} {rate:8.1e} keys/s  {rate / price:8.1e} keys/s per dollar  {avg_hours:7.1f} h on average")
```

```
Diffie-Hellman 1977, design    1.0e+12 keys/s   5.0e+04 keys/s per dollar     10.0 h on average
Wiener 1993, design            2.9e+12 keys/s   2.9e+06 keys/s per dollar      3.5 h on average
Deep Crack 1998, built         9.0e+10 keys/s   3.6e+05 keys/s per dollar    111.2 h on average
COPACOBANA 2006, built         4.8e+10 keys/s   4.8e+06 keys/s per dollar    208.8 h on average
```

The comparison is not a smooth line. The 1977 design buys only $5 \times 10^4$ keys a second per dollar, which is less than any later machine, so Diffie and Hellman's estimate was cautious, not rosy. Wiener's design of 1993 is about eight times better than the machine that was actually built five years after it, and COPACOBANA is better than either. A likely reading, and it is mine and not a finding of the sources, is that the paper designs counted chips at volume prices and the built machines paid for small production runs and for design time, and that COPACOBANA won because it used chips that were made by the million for other purposes. If that is so, the lesson for a key length is that the best attacker's price depends on mass-produced hardware that does not yet exist, and a designer should reckon for the price of the commodity machine a decade ahead, and not for the price of the machine of today.

### Open questions

- **What did the NSA know, and when?** Coppersmith's sentence says that the technique was kept secret after discussions with the agency, which fits an agency that knew it, or one that was told about it by IBM and asked for silence. Nothing public decides between them. The same is true of linear cryptanalysis.
- **Was 56 a ceiling or a choice?** IBM's engineers said that a 64-bit key, with 8 bits for parity, was what would fit; the NSA is said to have wanted 48. The cost of one more byte on a 1974 chip is a fact about the technology that could be checked by a historian of semiconductors, and as far as I know it has not been.
- **How much of the standard was NBS's?** The formal record gives the decisions to NBS. How far the institute's staff, or the NSA, drove the details is not in the public documents.
- **What was in the voluntary review?** The papers it saw and the changes it asked for have never been published.

### What it left behind

The story set a pattern that the rest of the book keeps meeting. A standard is proposed, with a secret reason for part of it. Outsiders suspect the reason. In time the reason is found, and it is either harmless or harmful; DES's was a protection against an attack, and the later case of a random-number generator in [chapter 18](18-The-Internet-Era.md) is the reverse. The institutional answer, from the AES competition of 1997 to 2000 to the hash and post-quantum competitions that followed, has been to do the design in public from the start. What DES left behind, beyond a cipher, was the idea that a cipher can be a public thing which anyone may study and nobody owns.

## Check yourself

??? question "1. In a Feistel round $L' = R$ and $R' = L \oplus F(R, k)$. Why can the round be undone even if $F$ maps two different inputs to the same output?"
    Because undoing the round never runs $F$ backward. The old right half is $L'$, so $F(L', k)$ can be computed forward again, and XORing it into $R'$ cancels it and leaves the old left half: $L = R' \oplus F(L', k)$. In the toy of §16.3, $F(x) = x^2 + k \bmod 16$ has only four different outputs for sixteen inputs, and the cipher still decrypts.

??? question "2. Lucifer's key was 128 bits and DES's is 56. By what factor did the work of an exhaustive search shrink, and how long would a machine at $10^{12}$ keys a second need for a 48-, a 56- and a 64-bit key?"
    By $2^{72}$. At $10^{12}$ keys a second: a 48-bit key needs $2^{48}/10^{12} \approx 281$ seconds, a bit under five minutes; a 56-bit key about 20 hours; a 64-bit key about 5,124 hours, or 213 days. Each step of 8 bits multiplies the time by 256.

??? question "3. Name the two suspicions about DES, and say what evidence answered each and what it left open."
    The key was short (56 bits): the machines of 1998 and 2006 showed that a small group could afford to find a key, so the suspicion was right about the weakness. The reasons behind the S-boxes were never explained: Biham and Shamir (1990) and Coppersmith (1994) showed that the S-boxes were built to resist differential cryptanalysis, so they were not a trapdoor. What stays open is how much the NSA changed the design and what it knew in 1974; Tuchman and Konheim disagree, and the full evidence is not public.

??? question "4. What did Coppersmith's 1994 paper say that was new, and why had IBM kept it secret for twenty years?"
    That IBM's team knew the technique, which it called the T-attack, in 1974, and designed the S-boxes and the round function to resist it. After discussions with the NSA, IBM decided not to publish the design rules, since publishing them would reveal a powerful method that could be used against many ciphers and would weaken the advantage the United States had in cryptography. The method became public in 1990, sixteen years later, through Biham and Shamir.

??? question "5. Why does a random S-box almost never pass the rules in §16.6, and does that prove the DES boxes were chosen with differential cryptanalysis in mind?"
    A random 6-to-4 table sends some single-bit change of the input to a single-bit change of the output about once in four tries, so the chance that none of 192 such pairs does it is tiny (the sample in the chapter found none in 3,000). The DES boxes pass all three rules in all eight boxes, so they were chosen. That is consistent with Coppersmith's account, but the test does not prove which attack the designers had in mind; it shows only that the boxes follow rules that make a difference between inputs spread to the output.

??? question "6. Put in order and say which were built: Wiener's design, Deep Crack, the Diffie-Hellman machine, DESCHALL, COPACOBANA."
    Diffie and Hellman (1977, design only); Wiener (1993, design only); DESCHALL (1997, software on volunteers' computers, 96 days); Deep Crack (July 1998, built, 56 hours); COPACOBANA (2006, built, about 8.7 days on average). The two designs were never built as described; the three others were real.

??? question "7. Why does double DES give about 57 bits of security and not 112, and what did the EDE form of triple DES add?"
    A meet-in-the-middle attack encrypts a known plaintext under every first key and decrypts the ciphertext under every second key and looks for a match, which takes about $2 \times 2^{56} = 2^{57}$ operations, though it needs a very large memory. Three encryptions with independent keys push the attack to about $2^{112}$. The EDE order (encrypt, decrypt, encrypt) makes the result equal to single DES when the three keys are equal, so old and new machines could talk to each other.

??? question "8. A bank encrypts a long stream with Triple DES under one key. After about how many blocks and how many gigabytes does the birthday bound make a repeated block likely, and what did Sweet32 (2016) show?"
    About $1.18 \times 2^{32} \approx 5 \times 10^9$ blocks, about 40 gigabytes with 8-byte blocks (the round figure is $2^{32}$ blocks, 32 GB). Bhargavan and Leurent showed that this amount of traffic could be collected in a day or two from a busy HTTPS or OpenVPN connection that used a 64-bit block cipher, and that repeated blocks could reveal a secret such as a session cookie.

??? question "9. Why is the Windows LAN Manager hash of a 14-character password weaker than a single DES key search suggests?"
    The password is changed to upper case, padded to 14 characters and cut into two halves of seven, and each half is used as a separate key, with no salt. So the two halves can be attacked independently, each from about $69^7 \approx 7 \times 10^{12}$ possibilities and with no lower case, and a password of seven characters or fewer gives a second half that is always the same value, `AAD3B435B51404EE`.

??? question "10. The 1978 Senate summary says the NSA \"did not tamper\" with the design and also that it \"indirectly assisted\" with the S-box structures. Are these contradictory, and what evidence would settle what the NSA did?"
    Not necessarily. "Assisted indirectly" can mean that the agency suggested tests, criteria or a review, and that IBM made the changes itself; "did not tamper" can mean that the NSA did not alter the tables on its own. They would be settled only by documents that are not public: IBM's design notes of 1973 to 1974, the NSA's evaluation, and the full classified Senate report. Konheim's memory that the S-boxes came back different, and Tuchman's statement that the NSA did not dictate a single wire, can both be true.

## What you learned

- Horst Feistel (born Berlin, 30 January 1915; died 1990) led the IBM group that made Lucifer from 1968; Lucifer was in service in a cash dispenser system by about 1971 or 1972, and his 1973 article taught the principle to the public.
- A Feistel network sends the right half across and XORs $F$ of it into the left half; it can be undone whatever $F$ is, by running the same rounds with the keys reversed.
- The National Bureau of Standards asked for a cipher on 15 May 1973 and again in August 1974; IBM answered with a 64-bit block, 56-bit-key descendant of Lucifer; FIPS 46 was issued in January 1977 and reaffirmed in 1983, 1988, 1993 and 1999 (FIPS 46-3), and withdrawn on 19 May 2005.
- The two suspicions were the short key and the unexplained S-boxes. The Senate's summary (1978) says the NSA convinced IBM that a reduced key was enough and indirectly helped with the S-boxes but did not tamper. Biham and Shamir (1990), Coppersmith (1994) and Matsui (1993 to 1994) showed that the S-boxes resisted differential cryptanalysis by design, that IBM had kept the method secret from 1974, and that DES was less well protected against linear cryptanalysis.
- The key fell in public: Diffie and Hellman's machine (1977, \$20 million, a design), Wiener's (1993, \$1 million, a design), the RSA challenges (96 days in 1997, 56 hours for Deep Crack in July 1998, 22 hours 15 minutes in January 1999) and COPACOBANA (2006).
- Triple DES (Tuchman 1979; ANSI X9.17 1985; FIPS 46-3 1999; SP 800-67) kept the standard alive; Sweet32 (2016) showed the 64-bit block as its limit, and NIST disallowed it for encryption after 2023. AES (FIPS 197) replaced DES.
- DES lived in cash machines and bank key systems, in Unix and Windows password hashes and in Kerberos; its weak points in practice were often the systems around it.
- Cryptography became an open field between 1977 and 1990: *Cryptologia* (1977), the first CRYPTO (1981), Eurocrypt (1982), the IACR (1982) and the *Journal of Cryptology* (1988), against the NSA's attempts at control (the Meyer letter, the Davida order, the voluntary review of 1981) and the Computer Security Act of 1987.
- The women whose names are on the record in this period include Ruth M. Davis at NBS, Edna Grossman at IBM, Dorothy Denning, Shafi Goldwasser, Ann Caracristi and Susan Landau; the sources name fewer women than for the war years.

**Next:** [Chapter 17](17-Public-Keys-and-the-Crypto-Wars.md), where two Stanford researchers and an MIT trio solve the oldest problem in the subject, how two people who have never met agree on a key, and the government tries to control what follows.

## Further reading

- Horst Feistel, "Cryptography and Computer Privacy", *Scientific American* 228, no. 5 (May 1973), pp. 15 to 23; Horst Feistel, William A. Notz and J. Lynn Smith, "Some Cryptographic Techniques for Machine-to-Machine Data Communications", *Proceedings of the IEEE* 63, no. 11 (1975); Arthur Sorkin, "Lucifer, a Cryptographic Algorithm", *Cryptologia* 8, no. 1 (1984).
- National Bureau of Standards, *Data Encryption Standard*, FIPS PUB 46 (January 1977), with FIPS 46-1 (1988), FIPS 46-2 (1993) and FIPS 46-3 (1999); FIPS PUB 81, *DES Modes of Operation* (December 1980); NIST, SP 800-67, *Recommendation for the Triple Data Encryption Algorithm (TDEA) Block Cipher* (2004; Revision 1, 2012; Revision 2, 2017); SP 800-131A, *Transitioning the Use of Cryptographic Algorithms and Key Lengths* (2011; Revision 1, 2015; Revision 2, 2019); FIPS 197, *Advanced Encryption Standard* (2001).
- Whitfield Diffie and Martin E. Hellman, "Exhaustive Cryptanalysis of the NBS Data Encryption Standard", *Computer* 10, no. 6 (June 1977), pp. 74 to 84; Martin E. Hellman, "DES Will Be Totally Insecure within Ten Years" and Walter Tuchman, "Hellman Presents No Shortcut Solutions to DES", *IEEE Spectrum* 16, no. 7 (July 1979); Ralph C. Merkle and Martin E. Hellman, "On the Security of Multiple Encryption", *Communications of the ACM* 24, no. 7 (1981).
- US Senate Select Committee on Intelligence, *Unclassified Summary: Involvement of NSA in the Development of the Data Encryption Standard* (95th Congress, 1978; reprinted in *IEEE Communications Magazine*, November 1978); Paul Kinnucan, "Data Encryption Gurus: Tuchman and Meyer", *Cryptologia* 2, no. 4 (1978); Gina Kolata, "Computer Encryption and the National Security Agency Connection", *Science* 197 (1977).
- Eli Biham and Adi Shamir, "Differential Cryptanalysis of DES-like Cryptosystems", *Journal of Cryptology* 4 (1991), pp. 3 to 72 (CRYPTO 1990), and *Differential Cryptanalysis of the Data Encryption Standard* (Springer, 1993); Mitsuru Matsui, "Linear Cryptanalysis Method for DES Cipher" (EUROCRYPT 1993) and "The First Experimental Cryptanalysis of the Data Encryption Standard" (CRYPTO 1994); Don Coppersmith, "The Data Encryption Standard (DES) and Its Strength against Attacks", *IBM Journal of Research and Development* 38, no. 3 (1994), pp. 243 to 250.
- Michael J. Wiener, "Efficient DES Key Search" (CRYPTO 1993 rump session; Bell-Northern Research technical report, 1994); Electronic Frontier Foundation, *Cracking DES: Secrets of Encryption Research, Wiretap Politics and Chip Design* (O'Reilly, 1998); Matt Curtin, *Brute Force: Cracking the Data Encryption Standard* (Copernicus, 2005); Sandeep Kumar, Christof Paar, Jan Pelzl, Gerd Pfeiffer and Manfred Schimmler, "Breaking Ciphers with COPACOBANA" (CHES 2006).
- Karthikeyan Bhargavan and Gaetan Leurent, "On the Practical (In-)Security of 64-bit Block Ciphers" (Sweet32), ACM CCS 2016; RFC 7465 (2015).
- Robert Morris and Ken Thompson, "Password Security: A Case History", *Communications of the ACM* 22, no. 11 (1979); Ross Anderson, *Security Engineering* (Wiley; 3rd ed., 2020), for ATM and PIN systems.
- Susan Landau, "Standing the Test of Time: The Data Encryption Standard", *Notices of the American Mathematical Society* 47, no. 3 (2000); Whitfield Diffie and Susan Landau, *Privacy on the Line* (MIT Press, 1998); Steven Levy, *Crypto: How the Code Rebels Beat the Government, Saving Privacy in the Digital Age* (Viking, 2001); David Kahn, *The Codebreakers* (Macmillan, 1967; revised ed., Scribner, 1996).
- Thomas R. Johnson, *American Cryptology during the Cold War, 1945 to 1989*, Book III (NSA Center for Cryptologic History, 1998; declassified with redactions); Dorothy E. Denning, *Cryptography and Data Security* (Addison-Wesley, 1982); Alan G. Konheim, *Cryptography: A Primer* (Wiley, 1981); Carl H. Meyer and Stephen M. Matyas, *Cryptography: A New Dimension in Computer Data Security* (Wiley, 1982); Gustavus J. Simmons, ed., *Contemporary Cryptology: The Science of Information Integrity* (IEEE Press, 1992).
- Shafi Goldwasser and Silvio Micali, "Probabilistic Encryption", *Journal of Computer and System Sciences* 28 (1984); David Chaum, "Untraceable Electronic Mail, Return Addresses, and Digital Pseudonyms", *Communications of the ACM* 24, no. 2 (1981).
- Eli Biham, Alex Biryukov and Adi Shamir, "Cryptanalysis of Skipjack Reduced to 31 Rounds Using Impossible Differentials", EUROCRYPT 1999.
- *Weaker sources behind particular statements:* encyclopedia and search summaries for Feistel's early life and the date of his citizenship, the "Demonstration, Demon, Lucifer" name story, the Lloyds Bank dispenser dates, the second NBS notice's day (27 August 1974; one NIST publication prints 17), the two 1976 workshops' dates, Ruth M. Davis's role at NBS, the Meyer letter and the Davida secrecy order (taken from Levy and from accounts of Hellman's), the Public Cryptography Study Group's membership, the first CRYPTO's organizers and attendance, the founding date of the IACR, the contents of NIST's 2023 notice on SP 800-67, the press conference of the Deep Crack announcement, and the 2017 limit on Triple DES data.
