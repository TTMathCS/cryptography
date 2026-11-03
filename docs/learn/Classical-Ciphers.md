# Classical ciphers and how to break them

*Shift, substitution, many alphabets and transposition: the ciphers people used
by hand for two thousand years. Each one is built here and then broken, because
every break taught cryptographers what a good cipher needs.*

All the examples work on the 26 letters A to Z, numbered $A = 0$ to $Z = 25$,
and do arithmetic **mod 26**: count round the alphabet like the hours on a
clock, so that after $Z$ comes $A$ again. ([Modular arithmetic](Modular-Arithmetic.md)
covers this properly.)

## The shift cipher

**The story.** Suetonius, writing about AD 120, says Julius Caesar wrote to
friends by moving each letter three places along the alphabet, and that
Augustus used a shift of one. The Hebrew Atbash (A for the last letter, B for
the second last) is older still. See [The ancient world](../history/01-Ancient.md).

**How it works.** Pick a key $k$ from 1 to 25. Encrypt each letter $x$ to
$x + k \bmod 26$, decrypt with $x - k \bmod 26$.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def caesar(s, k):
    return "".join(A[(A.index(c) + k) % 26] if c in A else c for c in s.upper())

c = caesar("ATTACK AT DAWN", 3)
print(c)                                  # DWWDFN DW GDZQ
for k in range(26):                       # the whole attack
    print(k, caesar(c, -k))
```

**Breaking it.** There are only 25 keys, so try them all and read the one line
that makes sense (line 3 above). This is **brute force**, or exhaustive key
search. It is the first lesson of the subject: *the key space must be too big
to search.*

## The affine cipher

A step up: $E(x) = a x + b \bmod 26$. To undo it you need a number $a^{-1}$ with
$a \cdot a^{-1} \equiv 1 \pmod{26}$, which exists only when $a$ shares no factor
with 26. So $a$ can be 1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23 or 25: twelve
choices, times 26 for $b$, is only 312 keys.

```python
def affine(s, a, b):
    return "".join(A[(a * A.index(c) + b) % 26] if c in A else c for c in s.upper())

def unaffine(s, a, b):
    ai = pow(a, -1, 26)                   # needs gcd(a, 26) = 1
    return "".join(A[ai * (A.index(c) - b) % 26] if c in A else c for c in s)

c = affine("ATTACK AT DAWN", 5, 8)
print(c, unaffine(c, 5, 8))               # IZZISG IZ XIOV ATTACK AT DAWN
```

The inverse mod $n$ is the same tool [RSA](../02-signatures/RSA.md) uses to make
its private key. You'll meet it again in [Modular arithmetic](Modular-Arithmetic.md).

## Simple substitution

**How it works.** The key is any shuffle of the alphabet: A might become Q,
B become X, and so on. There are $26! \approx 4 \times 10^{26}$ keys, about
$2^{88}$. That is far too many to try, even for a computer.

**The story.** The *Kama Sutra* (India, about the 3rd century AD) lists
*mlecchita vikalpa*, secret writing by swapping paired letters, among the 64 arts
a cultured person should know. Substitution ciphers were used across the world
for the next 1,500 years: Arab chancelleries, Italian city-states, Mary Queen of
Scots, whose substitution cipher was read by Elizabeth I's codebreaker Thomas
Phelippes and cost her her life in 1587.

**Breaking it.** Around 850 the philosopher Abu Yusuf al-Kindi, in Baghdad,
wrote *A Manuscript on Deciphering Cryptographic Messages*. It is the oldest
known description of **frequency analysis**: count how often each symbol occurs
in the ciphertext and match the counts to the language. In English, E is about
12.7% of letters, T 9.1%, A 8.2%; in Arabic it is alif, then lam. Al-Kindi's
book was lost for a thousand years and found in an Istanbul library in 1987.
Later Arab scholars took the method further: Ibn 'Adlan (1187 to 1268) worked
out how long a message must be for the counts to be reliable. See
[Arab cryptanalysis](../history/02-Arab-Cryptanalysis.md).

```python
from collections import Counter

def freq(s):
    s = [c for c in s.upper() if c in A]
    return [(c, round(100 * n / len(s), 1)) for c, n in Counter(s).most_common()]

print(freq("Cryptography is the art of writing so that only the right reader can understand")[:5])
# [('T', 13.6), ('R', 12.1), ('A', 9.1), ('H', 7.6), ('E', 7.6)]
```

That is plain English, and E is only fifth: in a short text the counts wobble,
which is exactly Ibn 'Adlan's point. Over a few hundred letters they settle
down. Then the most common ciphertext letter is probably E, the next probably
T, and so on. Common pairs (TH, HE, IN), short words (THE, AND) and guesses
fill in the rest. A newspaper cryptogram is exactly this puzzle.

The lesson: **a huge key space is not enough.** The cipher leaks the statistics
of the language straight through, and no number of keys hides that.

## Many alphabets: the Vigenère cipher

**The story.** To flatten the counts, change the alphabet as you go. Leon
Battista Alberti built a cipher disk in Florence in 1467 that did this. The
German abbot Johannes Trithemius drew the full table of 26 shifted alphabets in
1508. Giovan Battista Bellaso, in 1553, had the idea that made it practical: a
keyword says which shift to use for each letter. The method was later named
after Blaise de Vigenère, who published a stronger version in 1586. For three
centuries it was called *le chiffre indéchiffrable*, the cipher that can't be
broken, and the Confederacy still used it in the American Civil War.

**How it works.** Write the keyword over the message, repeating it. Each
message letter is shifted by the keyword letter above it:

| Message | A | T | T | A | C | K | A | T | D | A | W | N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Key | L | E | M | O | N | L | E | M | O | N | L | E |
| Cipher | L | X | F | O | P | V | E | F | R | N | H | R |

The two Ts of ATTACK became X and F, so plain frequency counts fail.

**Breaking it.** Charles Babbage broke it in the 1850s but never published.
Friedrich Kasiski, a retired Prussian infantry officer, did publish, in 1863:

1. Find the **key length** $L$. Kasiski looked for repeated groups of letters
   in the ciphertext; their distances tend to be multiples of $L$. In 1922
   William Friedman found a cleaner measure, the **index of coincidence**: the
   chance that two letters picked at random are the same. It is about 0.066 for
   English and 0.038 for random letters.
2. Split the ciphertext into $L$ columns (letters $1, L+1, 2L+1, \ldots$ and so
   on). Each column was encrypted by **one** shift.
3. Break each column as a shift cipher with frequency analysis.

```python
F = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.15, 0.77, 4.0, 2.4,
     6.7, 7.5, 1.9, 0.095, 6.0, 6.3, 9.1, 2.8, 0.98, 2.4, 0.15, 2.0, 0.074]  # English, per cent

def vig(s, key, sign=1):
    s = [c for c in s.upper() if c in A]
    return "".join(A[(A.index(c) + sign * A.index(key[i % len(key)])) % 26] for i, c in enumerate(s))

def ic(s):                                 # chance two random letters match
    n = len(s)
    return sum(s.count(c) * (s.count(c) - 1) for c in A) / (n * (n - 1))

def best_shift(col):                       # the shift that makes the column look most like English
    def chi(k):
        t = [A[(A.index(c) - k) % 26] for c in col]
        return sum((t.count(A[i]) - F[i] * len(t) / 100) ** 2 / (F[i] * len(t) / 100) for i in range(26))
    return min(range(26), key=chi)

def crack(c):
    L = max(range(1, 13), key=lambda L: sum(ic(c[i::L]) for i in range(L)) / L - 0.002 * L)
    return "".join(A[best_shift(c[i::L])] for i in range(L))
```

Run `crack(vig(text, "LEMON"))` on a paragraph of English (the more letters the
better; 600 is plenty) and it prints `LEMON`. The small `- 0.002 * L` term
stops it choosing 10 when the key length is 5, since every multiple of the
true length also scores well.

The lesson: **any pattern that repeats can be found.** A short key used over and
over leaks just as a single alphabet does, only more slowly. The cure, a key as
long as the message and never reused, is the [one-time pad](One-Time-Pad.md).

## Transposition

Substitution changes letters; transposition keeps them and moves them. The
Spartan skytale wound a strip round a rod. A columnar transposition writes the
message in rows under a keyword and reads it out by columns in the keyword's
alphabetical order:

| C | I | P | H | E | R |
|---|---|---|---|---|---|
| 1 | 4 | 5 | 3 | 2 | 6 |
| A | T | T | A | C | K |
| A | T | D | A | W | N |

Reading columns 1 to 6: `AA CW AA TT TD KN`, so the ciphertext is
`AACWAATTTDKN`. Letter counts are unchanged (they give transposition away at
once) but the order is hidden. Anagramming by hand, or by computer, finds it.

The strongest field ciphers of the First World War combined the two ideas.
Germany's ADFGVX (Fritz Nebel, 1918) substituted each letter by a pair of
symbols and then transposed them; the French officer Georges Painvin broke it in
June 1918 in time to warn of an offensive on Paris. In 1949 Shannon gave the
general rule behind this: good ciphers mix **confusion** (substitution) and
**diffusion** (spreading), which is exactly what [AES](../04-symmetric-ciphers/AES.md)
does in every round. See [Block cipher design](Block-Cipher-Design.md).

## What the breaks teach

| Cipher | How it fell | What a modern cipher must do |
|---|---|---|
| Shift, affine | too few keys | have at least $2^{128}$ keys |
| Substitution | letter statistics show through | hide all patterns of the plaintext |
| Vigenère | the key repeats | never let structure repeat in a usable way |
| Transposition | letter counts unchanged | change the symbols as well as their order |
| All of them | known plaintext gives the key away | stay safe even when the attacker knows or chooses plaintext |

## Try it

??? question "1. Decrypt `WKH HQHPB NQRZV WKH VBVWHP` (a shift cipher)."

    Shift back by 3: **THE ENEMY KNOWS THE SYSTEM**, Shannon's maxim.

??? question "2. Why can't the affine cipher use $a = 13$?"

    13 shares the factor 13 with 26, so $13x \bmod 26$ is only ever 0 or 13. Half
    the alphabet would map to A and half to N, and nothing could be decrypted.

??? question "3. A Vigenère ciphertext has index of coincidence 0.066. What does that suggest?"

    That it is about the value for English plaintext, so the key length is
    probably 1: it is really just a shift cipher (or a transposition, which also
    keeps the counts).

??? question "4. How many keys does a simple substitution have, in bits?"

    $\log_2 26! \approx 88.4$ bits. Far more than DES's 56, and still broken by hand,
    which is why key length alone proves nothing.
