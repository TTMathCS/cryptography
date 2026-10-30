# Arab cryptanalysis

*From about 750 to 1450, scholars in Baghdad, Damascus and Cairo wrote the
first books on breaking ciphers without the key. Their central idea,
counting letters, is still the first thing anyone tries on an unknown
cipher.*

Every cipher on the [previous page](01-Ancient.md) was safe only as long as
the enemy didn't know the method or couldn't be bothered to try every key.
The scholars on this page found something much stronger: a method that
breaks *any* simple substitution cipher, however its alphabet was mixed,
using nothing but the statistics of the language. This is *cryptanalysis*,
the science of reading a secret message without being given the key. As far
as surviving texts show, it was born in the Arabic-speaking world.

| When | Who | What |
|---|---|---|
| 700s | al-Khalil ibn Ahmad (718–786), Basra | *Book of Cryptographic Messages* (lost) |
| c. 850 | al-Kindi (c. 801–873), Baghdad | the oldest surviving description of frequency analysis |
| 900s | Ibn Wahshiyya | a book of old and secret alphabets |
| 1200s | Ibn Dunaynir | ciphers built on arithmetic with letter values |
| 1200s | Ibn 'Adlan (1187–1268) | how long a message must be for counting to work |
| 1300s | Ibn ad-Durayhim (1312–1361), Damascus | worked solutions; letters with several substitutes |
| 1412 | al-Qalqashandi (1355–1418), Cairo | an encyclopedia for secretaries that preserved it all |

## Why Baghdad

### A city of scholars and clerks

The Abbasid caliphs founded Baghdad in 762, and for the next two centuries
it was one of the richest and most learned cities in the world. The caliphs
and wealthy families paid translators to turn Greek, Persian and Syriac
books on medicine, mathematics, astronomy and philosophy into Arabic. Later
tradition credits much of this to a "House of Wisdom" (*Bayt al-Hikma*)
under the caliph al-Ma'mun (ruled 813–833). Historians such as Dimitri
Gutas think it was mainly a palace library, not the great academy of
popular accounts, but the translation movement around it was real and
large.

Three kinds of expertise came together:

- **Administration.** The caliphate ran on paper. Its chanceries (*diwan*)
  wrote letters to governors and generals across an empire stretching from
  Spain to Central Asia, and some of those letters were sent in cipher.
- **Language study.** Arab grammarians studied Arabic in great detail:
  how words are built from roots of three consonants, which letters can
  follow which, how poetry scans. To read the Qur'an correctly, scholars
  also counted its words and letters.
- **Mathematics.** The same scholars who translated Greek mathematics were
  used to counting, sorting and working with arrangements of symbols.

Counting letters, knowing which ones combine, and thinking about all the
ways a set of symbols can be arranged are exactly the skills cryptanalysis
needs.

### Words that came out of it

The English word *cipher* comes from the Arabic *sifr*, "empty", which was
the name for zero. It passed into Latin as *cifra* and into Italian, where
by the Renaissance *cifra* had come to mean both a numeral and secret
writing. The Arabic writers themselves called a cryptogram *mu'amma*,
"blinded" or "obscured", and encryption *tarjama*, a word that also means
translation.

## Al-Khalil and the first book

The oldest known Arabic book on the subject belongs to al-Khalil ibn Ahmad
al-Farahidi (718–786), a grammarian from Basra. He worked out the rules of
Arabic poetic meter and began the first Arabic dictionary, the *Kitab
al-'Ayn*. To make sure the dictionary missed nothing, he listed every
possible arrangement of letters that could form a root and then checked
which ones were real words. That systematic listing of permutations is
the kind of thinking a codebreaker uses to go through possible keys.

He also wrote a *Book of Cryptographic Messages* (*Kitab al-Mu'amma*),
which is lost. A story told by later writers, and retold by Kahn, says it
grew out of a Greek cryptogram he solved by guessing that it began with the
standard opening "In the name of God". If the story is true, it is the
first recorded use of a *probable word*, or *crib*: a guess about part of
the plaintext that lets the rest unravel. Cribs broke Enigma 1,200 years
later. But with the book lost, the story can't be checked.

## Al-Kindi: counting letters

### The philosopher of the Arabs

Abu Yusuf Ya'qub ibn Ishaq al-Kindi was born around 801, probably in Kufa,
and worked in Baghdad under the caliphs al-Ma'mun and al-Mu'tasim, whose
son he tutored. He died around 873. Later writers called him "the
philosopher of the Arabs", and lists of his works name more than two
hundred and fifty titles on medicine, music, optics, astronomy, mathematics
and philosophy.

One of them is *Risala fi istikhraj al-mu'amma*, "A Treatise on
Deciphering Cryptographic Messages". It was long known only by its title.
A copy turned up in the Süleymaniye Library in Istanbul, and in 1987 a team
from the Arab Academy of Damascus (Mohammed Mrayati, Yahya Meer Alam and
Hassan al-Tayyan) published it in an Arabic edition. Ibrahim Al-Kadi
brought it to Western readers in a 1992 paper in *Cryptologia*, and an
English translation followed in 2003. Al-Kindi's treatise is the oldest
surviving text that explains how to break a cipher.

### What the treatise says

Al-Kindi first sorts ciphers into kinds: those that move letters around
(transposition) and those that replace them (substitution), with
subtypes. Then he gives methods for attacking them. The best known is
this one, in paraphrase:

> If you know the language of the message, find a different text in that
> language, long enough to fill a sheet or so, and count how often each
> letter appears. Call the commonest letter the "first", the next the
> "second", and so on. Then count the symbols in the cipher the same way.
> Replace the commonest symbol with the "first" letter, the next with the
> "second", and so on, until all the symbols are accounted for.

That is *frequency analysis*. It works because a substitution cipher
changes what each letter looks like but not how often it appears. In
Arabic the commonest letters are alif and lam, helped by the article
*al-*; in English they are E, T and A.

Al-Kindi knew that counting alone isn't enough. Two letters can have
similar counts, and a short message can be unrepresentative. So he also
used which letters can and can't stand next to each other in Arabic, how
often letters double, and which words are likely to appear. A real
codebreaker uses the counts to get a foothold, then guesses words.

### Trying it

This program encrypts an English paragraph with a scrambled alphabet,
then attacks it the way al-Kindi describes. Step 1 matches the cipher's
commonest symbols to the usual order of English letters. Step 2 uses the
fact that the commonest three-letter words in English are THE and AND.
Step 3 is what a person does next: look at half-readable words and guess
them.

```python
from collections import Counter

plain = ("THE CALIPHS OF BAGHDAD PAID SCHOLARS TO TRANSLATE THE BOOKS OF THE "
         "GREEKS AND THE PERSIANS INTO ARABIC AMONG THEM WAS A PHILOSOPHER "
         "NAMED AL KINDI WHO WROTE ON MEDICINE MUSIC AND MATHEMATICS IN A SHORT "
         "BOOK ON SECRET MESSAGES HE EXPLAINED THAT EVERY LANGUAGE USES SOME "
         "LETTERS MORE OFTEN THAN OTHERS COUNT THE LETTERS IN A LONG SAMPLE OF "
         "THE LANGUAGE AND THEN COUNT THE SIGNS IN THE SECRET MESSAGE THE MOST "
         "COMMON SIGN PROBABLY STANDS FOR THE MOST COMMON LETTER AND SO ON")

ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
KEY = "QWERTYUIOPASDFGHJKLZXCVBNM"            # the secret mixed alphabet
cipher = plain.translate(str.maketrans(ABC, KEY))
print(cipher[:62])

# Step 1: count the signs and line them up with the usual order of English
counts = Counter(ch for ch in cipher if ch != " ")
print(counts.most_common(6))
ENGLISH = "ETAOINSHRDLCUMWFGYPBVKJXQZ"
guess = dict(zip((ch for ch, n in counts.most_common()), ENGLISH))

def show():
    return "".join(guess.get(ch, ch) for ch in cipher[:62])

print(show())

# Step 2: the commonest three-letter word is almost always THE, the next AND
def fix(cword, pword):
    for c, p in zip(cword, pword):
        other = next(k for k, v in guess.items() if v == p)
        guess[c], guess[other] = p, guess[c]          # swap the two guesses

words = Counter(w for w in cipher.split() if len(w) == 3).most_common(2)
print(words)
fix(words[0][0], "THE")
print(show())
fix(words[1][0], "AND")
print(show())

# Step 3: now the words almost read themselves
fix("ZKQFLSQZT", "TRANSLATE")
fix("WGGAL", "BOOKS")
fix("GY", "OF")
print(show())
print(sum(guess[c] == p for c, p in zip(KEY, ABC) if c in counts), "of", len(counts), "signs right")
```

Output:

```
ZIT EQSOHIL GY WQUIRQR HQOR LEIGSQKL ZG ZKQFLSQZT ZIT WGGAL GY
[('T', 49), ('Z', 38), ('Q', 35), ('L', 35), ('G', 35), ('F', 31)]
TSE CALHWSO IY FAUSMAM WAHM OCSILARO TI TRANOLATE TSE FIIPO IY
[('ZIT', 10), ('QFR', 4)]
THE CALSWHO IY FAUHMAM WASM OCHILARO TI TRANOLATE THE FIIPO IY
THE CALSWHO IY FAUHDAD WASD OCHILARO TI TRANOLATE THE FIIPO IY
THE CALIWHS OF BAUHDAD WAID SCHOLARS TO TRANSLATE THE BOOKS OF
16 of 23 signs right
```

Counting alone already gets 7 letters right, among them E, T and A, and
turns "TRANSLATE" into "TRANOLATE". Three word guesses later, a reader can
finish CALIPHS, BAGHDAD and PAID by eye, and each new word fixes letters
elsewhere. The paragraph is 387 letters long; on a much shorter message the
counts are less reliable and the guessing has to do more of the work.

### Why a huge key space didn't help

A mixed alphabet like the one above has 26 × 25 × 24 × … × 1 possible
keys, written 26! and equal to about 4 × 10²⁶. Trying them all is out of
the question even for a modern computer working one key at a time. Yet
frequency analysis breaks it in minutes by hand, because it never tries
keys. It reads the key off the ciphertext, a few letters at a time.

This is one of the most important lessons in the whole history. A big key
space is necessary but not enough. A cipher is only as strong as the best
attack on it, and the best attack is almost never trying every key. Modern
ciphers are judged the same way: the *Security (bits)* column in the
[main table](../index.md) gives the cost of the best known attack, not the
key length.

## After al-Kindi

### Ibn Wahshiyya's alphabets

Ibn Wahshiyya, an author of the 9th or 10th century from Iraq, compiled a
book of old and secret alphabets, *Kitab shawq al-mustaham* ("The Book of
the Frenzied Devotee's Desire to Learn the Riddles of Ancient Scripts").
It lists dozens of scripts, some real, some magical, some apparently
invented, and includes Egyptian hieroglyphs. Joseph Hammer, the Austrian
orientalist, published an English translation in London in 1806. In 2005
the Egyptologist Okasha El-Daly argued that Ibn Wahshiyya correctly
understood that some hieroglyphs stand for sounds, centuries before
Champollion; other scholars think that claim goes too far.

### Ibn Dunaynir and Ibn 'Adlan: the 13th century

Two writers of the early 13th century pushed the ideas further.

- **Ibn Dunaynir** wrote *Maqasid al-fusul al-mutarjima 'an hall
  al-tarjama* ("Expositive Chapters on Cryptanalysis"). It is credited with
  the first description of an *arithmetical* cipher. Arabic letters each
  had a number value (the *abjad* order: alif 1, ba 2, jim 3 and so on), so
  a writer could turn letters into numbers, do sums on them, and send the
  results.
- **Ibn 'Adlan** (1187–1268) wrote a treatise for the Ayyubid ruler
  al-Ashraf of Damascus, *al-Mu'allaf lil-Malik al-Ashraf*. He gave tables
  of the commonest two- and three-letter words and dealt with cryptograms
  written without spaces between words. He also asked how long a message
  must be before letter counts can be trusted, and answered about 90
  letters, enough for each of the 28 Arabic letters to appear about three
  times. Below that, he warned, the counts stop matching the language. The
  question of how much ciphertext an attack needs is still central to
  cryptanalysis.

### Ibn ad-Durayhim and al-Qalqashandi

Ibn ad-Durayhim (1312–1361), born in Mosul and active in Damascus under the
Mamluk sultans, wrote *Miftah al-kunuz fi idah al-marmuz* ("Keys to the
Treasures in Clarifying Ciphers"). It describes many cipher systems,
including one that replaces each letter with a pair of letters whose
number values add up to the original's. Since many pairs add up to the
same total, each letter can be written in several ways. A cipher with
several substitutes for one letter is called *homophonic*, and it blunts
frequency analysis by spreading a common letter's count over many
symbols. The book also works through the solution of an actual
cryptogram, step by step.

For a long time Ibn ad-Durayhim's work was known only because
al-Qalqashandi (1355–1418) quoted it. Al-Qalqashandi was a secretary in
the Mamluk chancery in Cairo, and he wrote a 14-volume manual for
secretaries, *Subh al-a'sha fi sina'at al-insha* ("Dawn for the
Night-Blind in the Craft of Composition"), finished in 1412. It covers
everything a chancery clerk might need: geography, forms of address,
paper and ink, and in one section, secret writing. Kahn singles out its
list of cipher systems, which includes transposition, several kinds of
substitution, and ciphers with more than one substitute for each letter,
together with instructions for breaking them. When Kahn wrote in 1967,
al-Qalqashandi was the main source for Arab cryptology. The earlier
treatises, al-Kindi's among them, came to light only after a team from the
Arab Academy of Damascus began searching manuscript libraries, from
around 1979; the published series, *Arabic Origins of Cryptology*, now
covers al-Kindi, Ibn 'Adlan, Ibn ad-Durayhim, Ibn Dunaynir and others.

## Did Europe learn it from the Arabs?

Europe's own codebreaking appears in the Italian city-states around 1400,
five centuries after al-Kindi. A Mantuan cipher key of 1401 already gives
the vowels several substitutes each, Leon Battista Alberti discussed letter
frequencies in the 1460s, and the Milanese secretary Cicco Simonetta wrote
down rules for solving ciphers without a key in 1474. The [next
page](03-Renaissance.md) tells that story.

Whether any of this came from Arabic books is an open question. Ideas
moved between the Islamic world and Europe through Spain, Sicily and
Mediterranean trade, and Arabic mathematics certainly reached Italy. But
no one has found a European cipher text that cites an Arabic one, and
European writers of the time describe frequency analysis as if they had
worked it out themselves. Independent discovery is quite possible: the
method follows naturally once enough literate people try to read each
other's secret letters.

## What changed

After al-Kindi, a monoalphabetic substitution, however cleverly mixed, could
no longer be trusted against a skilled opponent. Everything that came next
was a response to frequency analysis:

- **Homophones** spread common letters over several symbols.
- **Nulls**, meaningless symbols scattered through the text, threw the
  counts off.
- **Codes** replaced common words and names with symbols, removing them
  from the statistics.
- **Polyalphabetic ciphers** changed the substitution alphabet from letter
  to letter, so that the same symbol meant different letters at different
  points. This was Europe's great contribution, and its story starts on
  the next page.

## See also

- [The ancient world](01-Ancient.md): the ciphers frequency analysis broke
- [The Renaissance](03-Renaissance.md): Europe's answer, the polyalphabetic
  cipher
- [Main table](../index.md): security levels measured by the best known
  attack

## References

- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996), chapter 2, on al-Khalil, al-Qalqashandi and Ibn ad-Durayhim
- M. Mrayati, Y. Meer Alam and M. H. at-Tayyan (eds.), *Series on Arabic Origins of Cryptology*, trans. Said M. al-Asaad (KFCRIS and KACST, Riyadh, 2003–): vol. 1, *al-Kindi's Treatise on Cryptanalysis*; vol. 2, *Ibn 'Adlan's Treatise al-Mu'allaf lil-Malik al-Ashraf*; vol. 3, *Ibn ad-Durayhim's Treatise on Cryptanalysis*; vol. 4, *Ibn Dunaynir's Book: Expositive Chapters on Cryptanalysis*
- Ibrahim A. Al-Kadi, "Origins of Cryptology: The Arab Contributions", *Cryptologia* 16, no. 2 (1992), pp. 97–126
- Dimitri Gutas, *Greek Thought, Arabic Culture: The Graeco-Arabic Translation Movement in Baghdad and Early 'Abbasid Society* (Routledge, 1998)
- al-Qalqashandi, *Subh al-a'sha fi sina'at al-insha* (1412; printed Cairo, 1913–1919)
- Ibn Wahshiyya, trans. Joseph Hammer, *Ancient Alphabets and Hieroglyphic Characters Explained* (London, 1806) / Okasha El-Daly, *Egyptology: The Missing Millennium: Ancient Egypt in Medieval Arabic Writings* (UCL Press, 2005)

*Weaker sources:* search summaries of the Wikipedia articles on Ibn 'Adlan and Ibn al-Durayhim (the 90-letter rule, no-space cryptograms, dates) and of the Muslim Heritage article "Arab Origins of Cryptology" (the 1979 manuscript search, the Süleymaniye find); the attribution of the first arithmetical cipher to Ibn Dunaynir, which rests on the series' editors as summarized in secondary papers; Simon Singh, *The Code Book* (1999), for the wording of the al-Kindi passage paraphrased above.
