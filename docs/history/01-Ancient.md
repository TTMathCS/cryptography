# The ancient world

*From about 1900 BC to AD 500: scribes who bent their scripts, Greeks who hid
messages under wax and hair, a Spartan rod, a Greek signal grid and
Caesar's shift of three.*

People in the ancient world kept secrets in three ways, and all three are
still in use:

- **Hide the message.** If nobody knows a message exists, nobody tries to read
  it. This is *steganography*, from the Greek for "covered writing".
- **Replace the words.** Agree in advance that a sign or phrase stands for a
  whole meaning: "the lamp is lit" means "attack at dawn". This is a *code*.
- **Scramble the letters.** Swap each letter for another (*substitution*) or
  keep the letters but shuffle their order (*transposition*). This is a
  *cipher*.

The readable message is the *plaintext*, the scrambled one the *ciphertext*,
and the small secret that says how to scramble it (which rod, which shift) is
the *key*. Nearly everything on this page is weak by modern standards. What
matters is that each of these ideas appears here first.

| When | Where | What | Kind |
|---|---|---|---|
| c. 1900 BC | Beni Hasan, Egypt | odd hieroglyphs in the tomb of Khnumhotep II | changed script, not secret |
| 1600s–1200s BC (disputed) | Babylonia | a glaze or glass recipe in rare sign values | trade secret |
| 600s BC on | Sparta | the *skytale* message staff | transposition (disputed) |
| 600s–500s BC or later | Judah | Atbash names in Jeremiah | substitution |
| c. 499 BC | Persia to Miletus | Histiaeus's tattooed slave | steganography |
| 480s BC | Persia to Sparta | Demaratus's blank wax tablet | steganography |
| 350s BC | Greece | Aeneas Tacticus's chapter on secret messages | steganography, codes |
| 100s BC | Greece | Polybius's torch-signal square | letters as numbers |
| 50s BC | Rome | Caesar's shift of three | substitution |
| 400s–200s BC | China | secret tallies and split letters | codes |
| c. AD 300 | India | secret writing among the Kama Sutra's 64 arts | substitution |

## Egypt: the scribe who changed the signs

### Khnumhotep II, about 1900 BC

David Kahn begins the historical part of *The Codebreakers*, still the
standard history of the subject, in a tomb at Beni Hasan on the Nile, near the old town of Menet
Khufu. Khnumhotep II was a regional governor under the 12th Dynasty
pharaohs Amenemhat II and Senusret II, around 1900 BC. The scribe who laid
out the long inscription of his life swapped some ordinary hieroglyphs for
rarer, unexpected forms.

Nobody was meant to be kept out. The text sits on a tomb wall for anyone to
read, and the odd signs most likely added dignity and a touch of
learnedness. Kahn's point is that it is the first known *deliberate change*
to a script, one of the two ingredients of cryptography. The other,
secrecy, came later.

### Enigmatic writing

In the New Kingdom (c. 1550–1070 BC), Egyptian priests went much further.
Funerary books in the tombs of Ramesses VI and Ramesses IX, and on one of
the gilded shrines that enclosed Tutankhamun's sarcophagus, are written in
*enigmatic* hieroglyphs: familiar signs used for unusual sounds, and new
signs invented for the occasion. The Egyptologist John Darnell has argued
that these texts were meant to be puzzled out, which made reading them a
kind of religious act, not just a matter of keeping outsiders away.

The most extreme examples are from the Roman period, when Egypt was a
Roman province. In the temple of the ram-headed god Khnum at Esna, two
hymns stand side by side. One is written almost entirely with ram signs and
the other almost entirely with crocodile signs, both animals sacred to
Khnum. Serge Sauneron published them, and Christian Leitz offered a
reading in 2001. The ram hymn can now be translated reasonably well; the
damaged crocodile hymn is still only partly understood.

These are not ciphers in the modern sense. There is no key, and a trained
priest could read them. But they show a script being bent on purpose so
that only the initiated can follow it, which is close to the heart of the
idea.

## Mesopotamia: a potter's recipe

The oldest known writing hidden for a practical reason is a small clay
tablet in the British Museum (BM 120960). It was bought from a dealer and
is said to come from Tell Umar, the site of Seleucia on the Tigris, in
modern Iraq. C. J. Gadd and Reginald Campbell Thompson published it in
1936 as "A Middle-Babylonian Chemical Text" and read it as recipes for
glazing pottery, the earliest such formulas known. The British Museum now
follows a later reading, by Leo Oppenheim and colleagues in 1970, as a
recipe for red glass.

Kahn describes how the writer chose uncommon readings of the cuneiform
signs and spelled words in unusual ways, so that the recipe would mean
little to anyone outside the trade. The motive looks familiar: a craftsman
guarding a commercial secret.

Its date is uncertain. Gadd and Thompson linked a royal name on the
tablet to King Gulkishar and dated it no later than the 17th century BC;
Kahn gives about 1500 BC; the British Museum's catalogue says 1400–1200 BC.

In the last centuries of cuneiform, around the Seleucid period (after 312
BC), scribes also wrote some signs as numbers. Tablets survive that pair
each number with a syllable, a ready-made table for a number cipher.
Laurie Pearce studied this practice in her 1982 Yale thesis,
*Cuneiform Cryptography: Numerical Substitutions for Syllabic and
Logographic Signs*.

## The Hebrew Bible: Atbash

### Swapping the alphabet end to end

*Atbash* swaps the first letter of the Hebrew alphabet with the last, the
second with the second-to-last, and so on. The name is its own example:
**a**lef ↔ **t**av, **b**et ↔ **sh**in. Applying it twice gives back the
original, so the same table encrypts and decrypts.

The Book of Jeremiah uses it at least twice:

- **Sheshach** (ששך) in Jeremiah 25:26 and 51:41 is Atbash for **Babel**
  (בבל), Babylon.
- **Leb-kamai** (לב קמי) in Jeremiah 51:1 is Atbash for **Kasdim** (כשדים),
  the Chaldeans.

Ancient readers knew this. The Aramaic Targum puts "Babel" where the Hebrew
has Sheshach, and the Greek Septuagint translates Leb-kamai simply as
"Chaldeans". The swap can't have been for secrecy: Jeremiah 51:41 names
Babylon openly in the same verse. It reads more like wordplay, a way of
saying "Babylon" with a sneer, and some scholars think the forms were added
by later copyists. The book's core goes back to the late 7th and early 6th
centuries BC, but its exact editing history is debated.

Two relatives use the same idea with different pairings. *Albam* splits the
alphabet in half and pairs alef with lamed, the first letter of the second
half. *Atbah* uses yet another fixed pairing. All three are *monoalphabetic*:
each letter always becomes the same other letter.

This little program does Atbash on the Latin alphabet, then on Hebrew. Hebrew
has five letters with a different shape at the end of a word, so the code
turns those back into normal letters first and gives the last letter its
final form afterwards.

```python
latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
hebrew = "אבגדהוזחטיכלמנסעפצקרשת"        # the 22 letters, alef to tav
to_plain = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
to_final = {v: k for k, v in to_plain.items()}

def atbash(word, alphabet):
    word = "".join(to_plain.get(ch, ch) for ch in word)   # final forms count as normal letters
    out = "".join(alphabet[-1 - alphabet.index(ch)] for ch in word)
    return out[:-1] + to_final.get(out[-1], out[-1])     # a Hebrew word ends in a final form

print(atbash("SECRET", latin), atbash(atbash("SECRET", latin), latin))
print("Babel", "בבל", "becomes", atbash("בבל", hebrew), "Sheshach")
print("Kasdim", "כשדים", "becomes", atbash("כשדים", hebrew), "Leb-kamai")
```

Output:

```
HVXIVG SECRET
Babel בבל becomes ששך Sheshach
Kasdim כשדים becomes לבקמי Leb-kamai
```

### The Dead Sea Scrolls

Centuries later, the community at Qumran, by the Dead Sea, wrote some of
its scrolls, probably in the 2nd or 1st century BC, in a substitute
alphabet scholars call *Cryptic A*. Each Hebrew letter has its own invented
sign. Scholars learned to read it in the 1950s. How many scrolls use it is
disputed: Stephen Pfann's 2000 edition counted 36 manuscripts, most of them
tiny fragments, while Jonathan Ben-Dov argued in 2024 that only eight or
nine are really in the script. In 2017 Eshbal Ratzon and Ben-Dov pieced
one of them, a calendar, back together from 42 tiny fragments. Nothing in
the cryptic scrolls is especially secret; the script seems to have marked
texts meant for the community's teachers, a badge of rank more than a lock.

## Greece: hidden messages

### Herodotus's stories

Herodotus, writing around 430 BC, tells the oldest stories of hidden
messages. They are good stories, and he heard most of them second-hand, so
treat the details with care.

- **The tattooed slave (Histories 5.35).** Histiaeus, the former ruler of
  Miletus, was being kept at the Persian court in Susa. Around 499 BC he
  wanted to tell his son-in-law Aristagoras, now running Miletus, to revolt
  against Persia. He shaved the head of his most trusted slave, marked the
  message on his scalp, waited for the hair to grow back, and sent him with
  one instruction: tell Aristagoras to shave my head. The Ionian Revolt
  followed.
- **The blank tablet (7.239).** Demaratus, an exiled king of Sparta living
  in Persia, learned that Xerxes was planning to invade Greece. He took a
  folding wooden writing tablet, scraped off the wax, wrote his warning on
  the bare wood, and covered it with fresh wax. The blank tablet passed the
  guards. In Sparta nobody could work out what it meant until Gorgo, the
  wife of King Leonidas, suggested scraping off the wax. Herodotus himself
  wonders whether Demaratus sent it out of goodwill or to gloat, and some
  editors have suspected the whole chapter is a later addition.
- **The hare (1.123).** Harpagus, a Median noble, sewed a letter into the
  belly of a freshly killed hare and sent it to Cyrus in Persia with a
  servant dressed as a hunter.
- **The arrows (8.128).** During the Persian siege of Potidaea in 480–479
  BC, the traitor Timoxenus and the Persian general Artabazus wrapped
  letters around the notched ends of arrows and shot them to an agreed
  spot. The plot came out when one arrow missed and hit a man in the
  shoulder.

Every one of these methods fails the moment someone knows where to look:
shave the head, scrape the wax, cut open the hare. That weakness never goes
away. Steganography is only as safe as the trick is unknown.

### Aeneas Tacticus: a chapter on secret messages

The first known writer to collect methods on purpose is Aeneas, called
Tacticus, who wrote a manual around the 350s BC on how a city could survive
a siege. Chapter 31 is about sending messages unseen. Among his ideas:

- prick tiny holes above or below letters in a book or an ordinary letter;
  the receiver copies out the marked letters in order;
- write on a leaf and bind it under a bandage on a wound;
- write on thin sheets of lead and wear them as earrings;
- sew a letter into the sole of a sandal;
- write on a bladder, then inflate it inside an oil flask so it presses
  against the walls and looks like part of the flask;
- bore 24 holes in a knucklebone (an *astragal*) for the 24 letters and
  pass a thread through them in the order of the message. The receiver
  pulls the thread out and reads the letters off the holes.

The pricked-letter trick had a long life. In 19th-century England, where a
newspaper went through the post far more cheaply than a letter, people are
said to have pricked holes over letters in newspapers to send messages for
the price of the paper.

Ovid, the Roman poet, gives lovers the invisible-ink version in the *Art of
Love* (Book 3): write in fresh milk, and the reader makes it appear with
coal dust.

### Aeneas's water clocks: a code book in a jar

Polybius, in the 2nd century BC, describes a signal system he credits to
Aeneas (Histories 10.44). Each side had an identical jar of water with a
cork float carrying an upright rod. The rod was marked in sections, each
with an agreed message: "cavalry have entered the country", "heavy
infantry", "ships", "grain". The sender raised a torch, both sides pulled
their plugs at once, and when the water had fallen to the right section
the sender raised a torch again and both closed their jars. The section
level with the jar's rim was the message.

This is a *code*: a short list of agreed meanings. Polybius's complaint is
the classic complaint about codes. It can only send what someone thought to
write on the rod in advance.

## Greece: the skytale

### What Plutarch says

The Spartan *skytale* (Latin *scytale*) is the most famous ancient cipher
device, and the most doubtful. The fullest description comes from Plutarch,
writing around AD 100, in his *Life of Lysander* (19). When the Spartan
authorities sent a general abroad, they made two wooden rods of exactly the
same length and thickness, kept one, and gave him the other. To send an
order they wound a long, narrow strip of parchment around their rod in a
tight spiral, wrote the message along the length of the rod, and unwound
the strip. Off the rod, the letters were a jumble. The general wound the
strip around his own rod and read it. The Roman writer Aulus Gellius, in
the 2nd century AD, describes the same thing (*Attic Nights* 17.9).

In modern terms this is a *transposition cipher*. Every letter stays
itself; only the order changes. The key is the thickness of the rod, which
sets how many letters fit around one turn.

### Was it a cipher at all?

The word is much older than these descriptions. The poet Archilochus, in
the 7th century BC, already calls a bad piece of news "a grieving
skytale", and Thucydides (1.131) tells how the Spartans recalled their
general Pausanias around 470 BC by sending a herald with a skytale. Neither
says anything about winding a strip or hiding the text.

In 1998 the classicist Thomas Kelly argued in *Cryptologia*, in a paper
titled "The Myth of the Skytale", that the early sources treat the skytale
as nothing more than an official dispatch, and that the cipher story only
appears in writers living hundreds of years later. Some historians think the
staff served to prove that a message really came from the Spartan
authorities, which is authentication rather than secrecy. Others still
accept the cipher reading. The safe summary: the skytale was real, and its
use as a transposition cipher is possible but not proved.

### Trying it

Either way, it would have been a weak cipher. An enemy who knew the method
only had to try rods of different thickness, or, on paper, try every row
length.

```python
def wrap(text, around):
    # Write along the rod, one row per side, then unwind: each turn of the
    # strip carries one letter from every row.
    row = -(-len(text) // around)               # letters per row, rounded up
    text = text.ljust(around * row, "X")         # pad the last row
    return "".join(text[i::row] for i in range(row))

def unwrap(strip, around):
    return "".join(strip[i::around] for i in range(around))

message = "SENDMOREMENTOTHEPASS"
strip = wrap(message, 4)
print(strip)
print(unwrap(strip, 4))

# Breaking it: try rods of every thickness
for around in range(2, 7):
    print(around, unwrap(strip, around))
```

Output:

```
SONEERTPNEOADMTSMEHS
SENDMOREMENTOTHEPASS
2 SNETNODTMHOERPEAMSES
3 SETEDSHOEPOMMSNRNATE
4 SENDMOREMENTOTHEPASS
5 SROSOTAMNPDEENMHEETS
6 STDHOPMSNNTEESEOMRAE
```

Only one row length gives Greek, or here English. Transposition did not
die with Sparta: shuffling the order of bits is one of the two basic moves
inside every modern block cipher, including [AES](../04-symmetric-ciphers/AES.md).

## Greece: Polybius and his square

### Torches on a wall

Polybius, a Greek statesman who lived as a hostage and later a friend of
the Romans (c. 200–118 BC), complained that fire signals could only say
what had been agreed in advance. In Book 10 of his *Histories* (10.45–47)
he describes a better system, which he credits to two men named Cleoxenus
and Democleitus and says he improved himself.

The 24 letters of the Greek alphabet are split into five tablets of five
letters (the last has only four). The signaller stands behind a wall with
torches. First he raises torches on the left, one to five, to say which
tablet. Then he raises torches on the right to say which letter on that
tablet. The receiver watches through an instrument with two sighting
tubes, one for each side, so he can tell left from right, and writes the
letters down. Every letter
becomes a pair of small numbers.

It was built for speed and distance, not secrecy. Anyone who knew the
tablets could read the torches. But the idea of turning a letter into a
pair of coordinates turns out to be one of the most reused ideas in
cryptography. Russian political prisoners in the 19th century knocked out
the row and column of each letter on their cell walls. American prisoners
of war in Hanoi used the same tap code from 1965, on a 5 × 5 Latin grid with
C standing in for K. And in 1918 the German army's ADFGVX cipher started by
turning each letter into grid coordinates, then shuffled them.

```python
greek = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"     # Polybius's 24 letters
square = [greek[i:i + 5] for i in range(0, 24, 5)]
for n, tablet in enumerate(square, 1):
    print(n, " ".join(tablet))

def torches(word):
    out = []
    for ch in word:
        i = greek.index(ch)
        out.append((i // 5 + 1, i % 5 + 1))     # (which tablet, which letter)
    return out

signal = torches("ΠΟΛΥΒΙΟΣ")
print(signal)
for left, right in signal[:3]:
    print("left", "*" * left, "  right", "*" * right)
print("".join(square[t - 1][p - 1] for t, p in signal))
```

Output:

```
1 Α Β Γ Δ Ε
2 Ζ Η Θ Ι Κ
3 Λ Μ Ν Ξ Ο
4 Π Ρ Σ Τ Υ
5 Φ Χ Ψ Ω
[(4, 1), (3, 5), (3, 1), (4, 5), (1, 2), (2, 4), (3, 5), (4, 3)]
left ****   right *
left ***   right *****
left ***   right *
ΠΟΛΥΒΙΟΣ
```

## Rome: Caesar and Augustus

### The shift of three

The cipher everyone knows comes from the Roman biographer Suetonius, writing
around AD 120. In his *Life of Julius Caesar* (56) he says that when Caesar
had something confidential to say in his letters, he wrote it so that the
order of the letters was changed and no word could be made out: to read
it, substitute the fourth letter of the alphabet, D, for A, and so on with
the others. In other words, every letter moves three places down the
alphabet. Cassius Dio, writing a century later, describes the same method
in his account of the war in Gaul (*Roman History* 40.9).

Aulus Gellius adds (*Attic Nights* 17.9) that Caesar wrote to his agents
Oppius and Balbus in letters that looked like nonsense, and that the
grammarian Probus wrote a whole commentary on the secret letters in
Caesar's correspondence. That commentary is lost, which is a pity: it
would tell us how Caesar's ciphers worked, from someone who had studied
them.

Suetonius also records the habit of Caesar's heir. Augustus, he says (*Life
of Augustus* 88), wrote B for A, C for B and so on, a shift of one, but
instead of wrapping around he wrote AA for X, the last letter of the native
Latin alphabet (Y and Z were extras, borrowed for Greek words).

### Greek letters on a spear

Caesar's own account of the Gallic War shows a different trick. In 54 BC
his legate Quintus Cicero (the orator's brother) was besieged by the
Nervii. Caesar sent a Gallic horseman with a letter "written in Greek
letters" so that the enemy could not read it if they caught him (*Gallic
War* 5.48). The rider could not get through, so he tied the letter to a
throwing spear and hurled it over the wall. It stuck in a tower and nobody
noticed it for two days. The Latin can mean Greek script or Greek
language; Dio understood it as Greek.

### How strong is a shift?

A shift cipher has as many keys as the alphabet has letters, minus one. The
Latin alphabet of Caesar's day had about 21 to 23 letters (no J, U or W),
so a patient enemy could try every key in a few minutes. The program below
uses the modern 26-letter alphabet and then simply tries all 25 shifts.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def caesar(text, shift):
    out = ""
    for ch in text:
        if ch in A:
            out += A[(A.index(ch) + shift) % 26]   # move along, wrap Z to A
        else:
            out += ch                              # leave spaces alone
    return out

secret = caesar("VENI VIDI VICI", 3)
print(secret)
print(caesar(secret, -3))

# Breaking it: there are only 25 shifts, so try them all
for shift in range(1, 26):
    print(shift, caesar(secret, -shift))
```

Output:

```
YHQL YLGL YLFL
VENI VIDI VICI
1 XGPK XKFK XKEK
2 WFOJ WJEJ WJDJ
3 VENI VIDI VICI
4 UDMH UHCH UHBH
5 TCLG TGBG TGAG
6 SBKF SFAF SFZF
7 RAJE REZE REYE
8 QZID QDYD QDXD
9 PYHC PCXC PCWC
10 OXGB OBWB OBVB
11 NWFA NAVA NAUA
12 MVEZ MZUZ MZTZ
13 LUDY LYTY LYSY
14 KTCX KXSX KXRX
15 JSBW JWRW JWQW
16 IRAV IVQV IVPV
17 HQZU HUPU HUOU
18 GPYT GTOT GTNT
19 FOXS FSNS FSMS
20 ENWR ERMR ERLR
21 DMVQ DQLQ DQKQ
22 CLUP CPKP CPJP
23 BKTO BOJO BOIO
24 AJSN ANIN ANHN
25 ZIRM ZMHM ZMGM
```

Line 3 is the only one in Latin. This attack, trying every key, is called
*brute force*, and it is still the first question asked of any cipher:
how many keys are there? A modern 128-bit key has about 3.4 × 10³⁸ of
them, which is why nobody brute-forces [AES](../04-symmetric-ciphers/AES.md).
The [FAQ](../FAQ.md#can-an-attacker-just-pre-calculate-everything-and-look-up-the-answer)
puts numbers on how far out of reach that is.

There is no record that anyone broke Caesar's letters. That says less
about the cipher than about his enemies. Few of them could read Latin, and
nobody yet had a method for attacking ciphers in general.

### Watchwords in the camp

Polybius also describes how a Roman army camp passed its nightly watchword
(*Histories* 6.34). At sunset a soldier from the tenth maniple (company)
of each class of infantry and cavalry collected a wooden tablet
(*tessera*) with the word on it from the tribune. It was passed from
maniple to maniple, and the first maniples brought it back to the tribunes
before dark. The tribunes checked that every tablet came back, so if one
went missing they could trace exactly where. It is a
password system with a delivery receipt, an early cousin of the
authentication problems that network protocols still solve.

## China: tallies and split letters

Chinese writing has thousands of characters, which makes letter ciphers
awkward. Chinese military writers relied on codes and on dividing secrets
instead.

The *Six Secret Teachings* (*Liu Tao*), a military text traditionally
credited to the Zhou-dynasty strategist Jiang Taigong but probably put
together in the Warring States period (c. 400–220 BC), has two chapters on
the subject:

- **Secret tallies.** The ruler and his general shared a set of eight
  tallies of different lengths. Each length meant a fixed message, from
  the longest (a great victory) down to the shortest (a defeat with heavy
  losses). Only the ruler and the general knew the meanings; a messenger
  who let one leak was to be executed.
- **Secret letters.** For anything a tally couldn't say, a letter was cut
  into three parts and sent by three different messengers. No one
  messenger could read it, and only the receiver could put it together.

Much later, the *Wujing Zongyao*, a military encyclopedia compiled for the
Song court between 1040 and 1044, describes a code built on a poem. The two
sides agreed on a 40-character poem with no repeated characters and a
list of 40 standard messages, one for each character. To send a message, an
officer marked the matching character of the poem with his seal.

## India: secret writing as an art

The *Kama Sutra*, compiled by Vatsyayana around the 3rd century AD, lists
64 arts a cultivated person should know. One is *mlecchita-vikalpa*, the
art of secret writing, recommended so that lovers could keep their
correspondence private. A 13th-century commentary by Yashodhara describes
two methods. In *kautiliya*, letters are swapped according to the way
they sound, using the order of the Sanskrit alphabet. *Muladeviya* swaps
a smaller set of letters in fixed pairs. Both are simple substitutions.

Kahn also notes that the *Arthashastra*, the old Indian manual of
statecraft attributed to Kautilya, describes a spy service whose agents
received their instructions in secret writing.

## Why weak ciphers worked

From a modern view, everything on this page is easy to break. Caesar's
shift has a couple of dozen keys, the skytale a handful, Atbash and
Polybius none at all. They worked
anyway, for reasons that had little to do with mathematics:

- **Few people could read.** A captured messenger carrying a jumble of
  letters in a foreign script was not much of a risk.
- **Nobody had a theory of breaking ciphers.** An enemy could guess, or
  torture the courier, but there was no general method for attacking a
  substitution. That method, counting how often each letter appears, was
  first written down by [al-Kindi](02-Arab-Cryptanalysis.md), in
  9th-century Baghdad.
- **Secrecy of method did most of the work.** If the enemy didn't know you
  used a rod, the rod's thickness hardly mattered. Modern cryptography
  rejects this idea completely: the method is assumed public and only the
  key is secret. See the
  [FAQ on keeping the algorithm secret](../FAQ.md#can-i-keep-the-algorithm-secret-instead-of-the-key).

The ancient world left three ideas that every later page builds on: hiding
a message, replacing whole meanings with agreed signs, and scrambling
letters under a small secret key.

## See also

- [History overview](index.md): the full timeline
- [AES](../04-symmetric-ciphers/AES.md): substitution and transposition,
  2,000 years later
- [FAQ](../FAQ.md): why the key, not the method, has to carry the secret

## References

- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev. ed., Scribner, 1996), chapter 2: Khnumhotep II, the glaze tablet, Atbash, the Greek and Roman material, India
- C. J. Gadd and R. Campbell Thompson, "A Middle-Babylonian Chemical Text", *Iraq* 3 (1936), pp. 87–96 / A. Leo Oppenheim and others, *Glass and Glassmaking in Ancient Mesopotamia* (Corning Museum of Glass, 1970) / Laurie E. Pearce, *Cuneiform Cryptography: Numerical Substitutions for Syllabic and Logographic Signs* (PhD thesis, Yale, 1982), and "Cuneiform Number-Syllabaries", *Iraq* (1983)
- John C. Darnell, *The Enigmatic Netherworld Books of the Solar-Osirian Unity* (Orbis Biblicus et Orientalis 198, 2004) / Serge Sauneron, *Esna* (IFAO, 1959–2009) / Christian Leitz, "Die beiden kryptographischen Inschriften aus Esna mit den Widdern und Krokodilen", *Studien zur Altägyptischen Kultur* 29 (2001)
- Jeremiah 25:26, 51:1, 51:41 (Masoretic text, the Septuagint and Targum Jonathan) / Eshbal Ratzon and Jonathan Ben-Dov, "A Newly Reconstructed Calendrical Scroll from Qumran in Cryptic Script", *Journal of Biblical Literature* 136, no. 4 (2017), pp. 905–936 / Stephen J. Pfann, "Cryptic Texts", in *Discoveries in the Judaean Desert* 36 (Oxford, 2000)
- Herodotus, *Histories* 1.123, 5.35, 7.239, 8.128 / Aeneas Tacticus, *How to Survive Under Siege* 31 / Polybius, *Histories* 6.34, 10.44–47 / Ovid, *Ars Amatoria* 3
- Plutarch, *Life of Lysander* 19 / Aulus Gellius, *Attic Nights* 17.9 / Thucydides 1.131 / Archilochus, fragment 185 (West) / Thomas Kelly, "The Myth of the Skytale", *Cryptologia* 22, no. 3 (1998), pp. 244–260
- Suetonius, *Life of Julius Caesar* 56 and *Life of Augustus* 88 / Caesar, *Gallic War* 5.48 / Cassius Dio, *Roman History* 40.9
- Ralph D. Sawyer (trans.), *The Six Secret Teachings on the Way of Strategy* (Shambhala, 1997), "Secret Tallies" and "Secret Letters" / *Wujing Zongyao* (1044)
- Vatsyayana, *Kama Sutra* 1.3 (the 64 arts), with Yashodhara's *Jayamangala* commentary

*Weaker sources:* search summaries of the British Museum and Science Museum catalogue entries for BM 120960 (date and findspot); the Esna hymns' dating and present state of decipherment from online commentaries (attalus.org and the Esna text editions on bookdown.org), not from Sauneron or Leitz directly; Wolfgang Behr's conference slides on the *Wujing Zongyao* poem code; G. C. Macaulay's translation note on doubts about Herodotus 7.239; the Hanoi tap code date (1965) from POW memoirs as retold in news features;
the newspaper-pricking story, which rests on secondary retellings; the 1950s
date for reading Cryptic A, from news reports of the 2017 scroll.
