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

**Codes and ciphers.** A **cipher** works on letters (or bits) and can encrypt
anything. A **code** replaces whole words or phrases by code groups from a
book: "ATTACK" might be 3172. Codes were the main tool of diplomats for
centuries. Europe's **nomenclators**, from 1379 on, combined a cipher alphabet
with a code list for common names; the Zimmermann telegram of 1917 was in a
German diplomatic codebook, and China's telegraph code of 1871 gave each
character a four-digit number that clerks could then encrypt. Codes are broken
much like ciphers (by counting and guessing), but this book is about ciphers,
because that is what computers use.

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

**By hand.** ATTACK AT DAWN with $k = 3$: A (0) becomes 3, D; T (19) becomes
22, W; C (2) becomes F; K (10) becomes N; W (22) becomes 25, Z; N (13) becomes
Q. The ciphertext is DWWDFN DW GDZQ.

**Atbash** is a reflection instead of a shift: $x \to 25 - x$, so $A \leftrightarrow Z$,
$B \leftrightarrow Y$. Applying it twice gives back the original. It has no
key at all.

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
the true length works too. Put it all together: find $L$, then break each
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
