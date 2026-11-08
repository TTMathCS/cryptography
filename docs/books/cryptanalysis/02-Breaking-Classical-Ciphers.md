# 2. Breaking Classical Ciphers

*Every hand cipher in history let something through: how often each letter
occurs, which letters stand together, where the key starts over. This chapter
is the attacker's side of [book 1, chapter 2](../../book/02-Classical-Ciphers.md),
which shows how the ciphers work. Here you take one real English text, the
Gettysburg Address, encrypt it five different ways, and break every one: a
substitution by counting the way al-Kindi described in the ninth century, a
Vigenère cipher by Kasiski's repeats and Friedman's index of coincidence, a
substitution and a columnar transposition by a computer search that needs
nothing but Python's standard library, and Playfair and Hill from a few words
of known plaintext. The chapter ends with Shannon's answer to the question
behind all of it: how much ciphertext is enough?*

!!! abstract "In this chapter"
    **You will learn:**

    - how to count letters, pairs and repeated words in a ciphertext, and what
      the counts say about the cipher;
    - al-Kindi's method of frequency analysis, as he described it, and the
      probable-word attack that goes with it;
    - how to find the length of a Vigenère key by Kasiski's repeated trigrams
      and by Friedman's index of coincidence, by hand and in code, and how to
      read off each key letter;
    - how hill climbing breaks a substitution and a columnar transposition
      automatically, with a score built from Python's own help text;
    - how a few known words give away a Playfair square and a Hill matrix,
      including the matrix inverse mod 26 by hand;
    - what unicity distance is, with Shannon's numbers for the shift,
      substitution and Vigenère ciphers, and how they compare with real attacks.

    **You need:** [Chapter 1](01-What-Cryptanalysis-Is.md) for attack models,
    and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) for how the
    shift, substitution, Vigenère, columnar transposition and Hill ciphers work.
    The arithmetic mod 26 is in [book 1, chapter 3](../../book/03-The-Arithmetic-of-Secrets.md).

    **Levels:** §2.1 to §2.4 are for beginners, §2.5 to §2.9 and §2.11 are
    intermediate, §2.10 and §2.12 are expert.

## 2.1 The problem

*Level: beginner.*

You have a page of letters. You know, or guess, that it is English, and that a
person encrypted it by hand with pencil and paper. You don't have the key. You
may not even know which cipher was used. This is the oldest problem in
cryptanalysis, a **ciphertext-only attack** in the language of
[Chapter 1](01-What-Cryptanalysis-Is.md), and for about a thousand years it
was the only kind of codebreaking there was.

The defender's hope was that a big key space would protect the message. A
simple substitution has $26! \approx 4 \times 10^{26}$ keys, more than a
56-bit block cipher. Nobody can try them all. The attacker's answer, found in
Baghdad in the ninth century and rediscovered in every chancellery in Europe,
is that nobody needs to. A classical cipher hides what the letters look like,
but not how the language behaves: E is still the commonest letter in any
English text, Q is still followed by U, THE is still the commonest word, and a
key that repeats leaves repeats in the ciphertext. The attacker measures those
things and works backwards to the key, one piece at a time, never touching the
size of the key space at all.

That is the main idea of this whole book, and classical ciphers show it in its
plainest form. **An attack does not search the key space; it uses a structure
the cipher lets through, and pays only for the part of the key that structure
does not reveal.** Frequency analysis gets a substitution key letter by letter.
Kasiski's method gets a Vigenère key's length, then each letter separately, so
a 7-letter key costs $7 \times 26$ trials, not $26^7$. The differential and
linear attacks of Chapter 5 and
Chapter 6 do the same thing to modern ciphers,
with XOR differences and parities in place of letter counts.

Book 1 showed each of these ciphers being built and then broken in a short
"Break it" passage. This chapter is the method itself, done thoroughly, on one
text, with every number real. Figure 2.1 is the plan of attack a classical
codebreaker follows, and the sections of this chapter follow it.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The order of attack: count the letters and the index of coincidence first; the result points to transposition, single substitution or several alphabets; Playfair, Hill and the question of how much text is enough come after" fill="currentColor" font-size="14">
<rect x="220" y="8" width="200" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="31" text-anchor="middle" font-weight="bold">a ciphertext</text>
<line x1="320" y1="44" x2="320" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320.0,66.0 316.9,58.6 323.1,58.6" fill="currentColor"/>
<rect x="170" y="66" width="300" height="52" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="88" text-anchor="middle">count the letters,</text>
<text x="320" y="106" text-anchor="middle">compute the index of coincidence</text>
<rect x="10" y="150" width="196" height="74" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="108" y="174" text-anchor="middle">IC near 0.066,</text>
<text x="108" y="192" text-anchor="middle">counts look like English:</text>
<text x="108" y="210" text-anchor="middle">transposition, §2.7</text>
<rect x="222" y="150" width="196" height="74" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="174" text-anchor="middle">IC near 0.066,</text>
<text x="320" y="192" text-anchor="middle">counts scrambled:</text>
<text x="320" y="210" text-anchor="middle">substitution, §2.2 to §2.6</text>
<rect x="434" y="150" width="196" height="74" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="532" y="174" text-anchor="middle">IC near 0.04:</text>
<text x="532" y="192" text-anchor="middle">several alphabets,</text>
<text x="532" y="210" text-anchor="middle">§2.4 and §2.5</text>
<line x1="250" y1="118" x2="108" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="108.0,150.0 114.5,145.3 115.9,151.4" fill="currentColor"/>
<line x1="320" y1="118" x2="320" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320.0,150.0 316.9,142.6 323.1,142.6" fill="currentColor"/>
<line x1="390" y1="118" x2="532" y2="150" stroke="currentColor" stroke-width="1.4"/>
<polygon points="532.0,150.0 524.1,151.4 525.5,145.3" fill="currentColor"/>
<rect x="10" y="250" width="300" height="72" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="160" y="273" text-anchor="middle">pairs, 25 letters, no doubles</text>
<text x="160" y="291" text-anchor="middle">inside a pair: Playfair, §2.8;</text>
<text x="160" y="309" text-anchor="middle">known plaintext, linear: Hill, §2.9</text>
<rect x="330" y="250" width="300" height="72" rx="6" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="480" y="273" text-anchor="middle">how much ciphertext</text>
<text x="480" y="291" text-anchor="middle">is enough for any of them:</text>
<text x="480" y="309" text-anchor="middle">unicity distance, §2.10</text>
</svg>
<figcaption>Figure 2.1. The classical order of attack. One count, the index of coincidence, sorts most hand ciphers into three families before any key is guessed; the sections of this chapter follow the arrows.</figcaption>
</figure>

**The text.** All the attacks in this chapter run on the same plaintext, the
Gettysburg Address, which Abraham Lincoln gave on 19 November 1863 at the
dedication of the soldiers' cemetery at Gettysburg, Pennsylvania. Five copies
in his hand survive; the text below is the last of them, the Bliss copy, which
is the version usually printed. It is in the public domain, it is short enough
to read in two minutes, and it has 1,149 letters, enough for every attack here
to work and few enough that some of them only just work. That is useful:
the places where an attack struggles teach as much as the places where it
succeeds.

A note on the code: the Python in this chapter is one program in pieces. Run
the blocks in order, in one file or one Python session, since later blocks use
names defined earlier. It needs Python 3.8 or later and nothing outside the
standard library. The longest block takes about fifteen seconds.

What does "breaking" mean here? For a classical cipher it usually means
reading the message, and with it the key, since the key is what lets the
attacker read the next message too. A modern break ([Chapter 1](01-What-Cryptanalysis-Is.md))
can be far weaker than that, a way to tell ciphertext from random, and still
count. Classical ciphers fail much more completely.

## 2.2 Counting letters

*Level: beginner.*

The first thing a codebreaker does with any ciphertext is count. Before you
count a ciphertext, though, you need to know what the counts of the plaintext
language look like, and how far a single real text strays from the average.
Here is the plaintext, and the count:

```python
from collections import Counter

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

GETTYSBURG = """Four score and seven years ago our fathers brought forth on this
continent, a new nation, conceived in Liberty, and dedicated to the
proposition that all men are created equal. Now we are engaged in a great
civil war, testing whether that nation, or any nation so conceived and so
dedicated, can long endure. We are met on a great battle-field of that war.
We have come to dedicate a portion of that field, as a final resting place
for those who here gave their lives that that nation might live. It is
altogether fitting and proper that we should do this. But, in a larger
sense, we can not dedicate -- we can not consecrate -- we can not hallow --
this ground. The brave men, living and dead, who struggled here, have
consecrated it, far above our poor power to add or detract. The world will
little note, nor long remember what we say here, but it can never forget
what they did here. It is for us the living, rather, to be dedicated here
to the unfinished work which they who fought here have thus far so nobly
advanced. It is rather for us to be here dedicated to the great task
remaining before us -- that from these honored dead we take increased
devotion to that cause for which they gave the last full measure of
devotion -- that we here highly resolve that these dead shall not have
died in vain -- that this nation, under God, shall have a new birth of
freedom -- and that government of the people, by the people, for the
people, shall not perish from the earth."""

# Beker and Piper's table: percent of each letter in ordinary English
ENGLISH = [8.2, 1.5, 2.8, 4.3, 12.7, 2.2, 2.0, 6.1, 7.0, 0.2, 0.8, 4.0, 2.4,
           6.7, 7.5, 1.9, 0.1, 6.0, 6.3, 9.1, 2.8, 1.0, 2.4, 0.2, 2.0, 0.1]

def letters(s):                        # keep A to Z only, in capitals
    return "".join(c for c in s.upper() if c in A)

P = letters(GETTYSBURG)
n = Counter(P)
print(len(P), "letters")
for x, k in n.most_common(12):
    print(x, k, "%.1f%%" % (100 * k / len(P)), "English %.1f%%" % ENGLISH[A.index(x)])
```

```
1149 letters
E 165 14.4% English 12.7%
T 126 11.0% English 9.1%
A 102 8.9% English 8.2%
O 93 8.1% English 7.5%
H 80 7.0% English 6.1%
R 79 6.9% English 6.0%
N 77 6.7% English 6.7%
I 68 5.9% English 7.0%
D 58 5.0% English 4.3%
S 44 3.8% English 6.3%
L 42 3.7% English 4.0%
C 31 2.7% English 2.8%
```

The table `ENGLISH` is the classic one compiled by Henry Beker and Fred Piper
from a large sample of English text (their *Cipher Systems*, 1982). Lincoln's
speech follows it closely at the top: E, T, A and O are the four commonest
letters in both, in that order. Lower down the order wobbles. S is rarer than
usual (3.8% against 6.3%), and D is commoner, partly because Lincoln said
"dedicate" six times. J, X
and Z don't occur at all. Figure 2.2 shows every letter.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Bar chart of the percentage of each letter A to Z in the Gettysburg Address, with a mark for ordinary English on each bar; E, T and A lead, J, X and Z do not occur" fill="currentColor" font-size="14">
<line x1="60" y1="240" x2="620" y2="240" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="245" text-anchor="end">0%</text>
<line x1="60" y1="178" x2="620" y2="178" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="182" text-anchor="end">5%</text>
<line x1="60" y1="115" x2="620" y2="115" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="120" text-anchor="end">10%</text>
<line x1="60" y1="52" x2="620" y2="52" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="58" text-anchor="end">15%</text>
<rect x="64.0" y="129.0" width="15" height="111.0" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="61.0" y1="137.5" x2="82.0" y2="137.5" stroke="currentColor" stroke-width="2.5"/>
<text x="71.5" y="260" text-anchor="middle">A</text>
<rect x="85.5" y="224.8" width="15" height="15.2" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="82.5" y1="221.2" x2="103.5" y2="221.2" stroke="currentColor" stroke-width="2.5"/>
<text x="93.0" y="260" text-anchor="middle">B</text>
<rect x="107.0" y="206.3" width="15" height="33.7" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="104.0" y1="205.0" x2="125.0" y2="205.0" stroke="currentColor" stroke-width="2.5"/>
<text x="114.5" y="260" text-anchor="middle">C</text>
<rect x="128.5" y="176.9" width="15" height="63.1" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="125.5" y1="186.2" x2="146.5" y2="186.2" stroke="currentColor" stroke-width="2.5"/>
<text x="136.0" y="260" text-anchor="middle">D</text>
<rect x="150.0" y="60.5" width="15" height="179.5" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="147.0" y1="81.2" x2="168.0" y2="81.2" stroke="currentColor" stroke-width="2.5"/>
<text x="157.5" y="260" text-anchor="middle">E</text>
<rect x="171.5" y="210.6" width="15" height="29.4" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="168.5" y1="212.5" x2="189.5" y2="212.5" stroke="currentColor" stroke-width="2.5"/>
<text x="179.0" y="260" text-anchor="middle">F</text>
<rect x="193.0" y="209.5" width="15" height="30.5" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="190.0" y1="215.0" x2="211.0" y2="215.0" stroke="currentColor" stroke-width="2.5"/>
<text x="200.5" y="260" text-anchor="middle">G</text>
<rect x="214.5" y="153.0" width="15" height="87.0" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="211.5" y1="163.8" x2="232.5" y2="163.8" stroke="currentColor" stroke-width="2.5"/>
<text x="222.0" y="260" text-anchor="middle">H</text>
<rect x="236.0" y="166.0" width="15" height="74.0" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="233.0" y1="152.5" x2="254.0" y2="152.5" stroke="currentColor" stroke-width="2.5"/>
<text x="243.5" y="260" text-anchor="middle">I</text>
<line x1="254.5" y1="237.5" x2="275.5" y2="237.5" stroke="currentColor" stroke-width="2.5"/>
<text x="265.0" y="260" text-anchor="middle">J</text>
<rect x="279.0" y="236.7" width="15" height="3.3" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="276.0" y1="230.0" x2="297.0" y2="230.0" stroke="currentColor" stroke-width="2.5"/>
<text x="286.5" y="260" text-anchor="middle">K</text>
<rect x="300.5" y="194.3" width="15" height="45.7" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="297.5" y1="190.0" x2="318.5" y2="190.0" stroke="currentColor" stroke-width="2.5"/>
<text x="308.0" y="260" text-anchor="middle">L</text>
<rect x="322.0" y="225.9" width="15" height="14.1" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="319.0" y1="210.0" x2="340.0" y2="210.0" stroke="currentColor" stroke-width="2.5"/>
<text x="329.5" y="260" text-anchor="middle">M</text>
<rect x="343.5" y="156.2" width="15" height="83.8" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="340.5" y1="156.2" x2="361.5" y2="156.2" stroke="currentColor" stroke-width="2.5"/>
<text x="351.0" y="260" text-anchor="middle">N</text>
<rect x="365.0" y="138.8" width="15" height="101.2" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="362.0" y1="146.2" x2="383.0" y2="146.2" stroke="currentColor" stroke-width="2.5"/>
<text x="372.5" y="260" text-anchor="middle">O</text>
<rect x="386.5" y="223.7" width="15" height="16.3" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="383.5" y1="216.2" x2="404.5" y2="216.2" stroke="currentColor" stroke-width="2.5"/>
<text x="394.0" y="260" text-anchor="middle">P</text>
<rect x="408.0" y="238.9" width="15" height="1.1" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="405.0" y1="238.8" x2="426.0" y2="238.8" stroke="currentColor" stroke-width="2.5"/>
<text x="415.5" y="260" text-anchor="middle">Q</text>
<rect x="429.5" y="154.1" width="15" height="85.9" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="426.5" y1="165.0" x2="447.5" y2="165.0" stroke="currentColor" stroke-width="2.5"/>
<text x="437.0" y="260" text-anchor="middle">R</text>
<rect x="451.0" y="192.1" width="15" height="47.9" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="448.0" y1="161.2" x2="469.0" y2="161.2" stroke="currentColor" stroke-width="2.5"/>
<text x="458.5" y="260" text-anchor="middle">S</text>
<rect x="472.5" y="102.9" width="15" height="137.1" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="469.5" y1="126.2" x2="490.5" y2="126.2" stroke="currentColor" stroke-width="2.5"/>
<text x="480.0" y="260" text-anchor="middle">T</text>
<rect x="494.0" y="217.2" width="15" height="22.8" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="491.0" y1="205.0" x2="512.0" y2="205.0" stroke="currentColor" stroke-width="2.5"/>
<text x="501.5" y="260" text-anchor="middle">U</text>
<rect x="515.5" y="213.9" width="15" height="26.1" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="512.5" y1="227.5" x2="533.5" y2="227.5" stroke="currentColor" stroke-width="2.5"/>
<text x="523.0" y="260" text-anchor="middle">V</text>
<rect x="537.0" y="209.5" width="15" height="30.5" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="534.0" y1="210.0" x2="555.0" y2="210.0" stroke="currentColor" stroke-width="2.5"/>
<text x="544.5" y="260" text-anchor="middle">W</text>
<line x1="555.5" y1="237.5" x2="576.5" y2="237.5" stroke="currentColor" stroke-width="2.5"/>
<text x="566.0" y="260" text-anchor="middle">X</text>
<rect x="580.0" y="229.1" width="15" height="10.9" opacity="0.45" stroke="currentColor" stroke-width="1"/>
<line x1="577.0" y1="215.0" x2="598.0" y2="215.0" stroke="currentColor" stroke-width="2.5"/>
<text x="587.5" y="260" text-anchor="middle">Y</text>
<line x1="598.5" y1="238.8" x2="619.5" y2="238.8" stroke="currentColor" stroke-width="2.5"/>
<text x="609.0" y="260" text-anchor="middle">Z</text>
<line x1="60" y1="240" x2="620" y2="240" stroke="currentColor" stroke-width="1.2"/>
<rect x="380" y="6" width="15" height="12" opacity="0.45" stroke="currentColor" stroke-width="1"/><text x="402" y="17">Gettysburg Address</text>
<line x1="377" y1="31" x2="398" y2="31" stroke="currentColor" stroke-width="2.5"/><text x="402" y="36">ordinary English</text>
<text x="340" y="282" text-anchor="middle">1,149 letters; percent of each letter</text>
</svg>
<figcaption>Figure 2.2. The letters of the Gettysburg Address (bars) against Beker and Piper's table for ordinary English (marks). The commonest letters agree closely; rare letters such as K, Q and Y wander, and J, X and Z don't occur at all.</figcaption>
</figure>

Two lessons sit in that figure, and both matter for everything that follows.

**The top of the order is reliable; the bottom is not.** With 1,149 letters,
the counts of E, T and A are each in the hundreds, and a few dozen more or less
can't change their order. The counts of rare letters such as K (3) and Q (1)
are so small that chance decides them. Any method that leans on the order of
rare letters will make mistakes, and the attacks below always settle the common
letters first and leave the rare ones to context.

**One number sums up the shape.** The **index of coincidence** (IC) is the
chance that two letters picked at random from a text are the same, defined in
[book 1, §2.7](../../book/02-Classical-Ciphers.md#27-breaking-vigenere-kasiski-and-friedman).
For the Gettysburg Address it is 0.0730, close to the 0.066 of average English
and far above the $1/26 \approx 0.0385$ of random letters. You will use it in
§2.5; for now, note that it measures how lumpy the counts are without caring
which letter is which.

**Now encrypt it.** Take a random simple substitution (the key below was
shuffled by a computer, so it has no pattern for an attacker to guess) and
write the result the way a nineteenth-century telegraph clerk would have sent
it: no spaces, no punctuation, in groups of five. Hiding the word breaks makes
the attacker's job much harder than the newspaper cryptogram of
[book 1, §2.5](../../book/02-Classical-Ciphers.md#25-simple-substitution-and-frequency-analysis),
where THE and AND stand out as words.

```python
KEY = "PMHERZTDLXOQYSICJVGBKAUNFW"            # A->P, B->M, C->H, ...
C = P.translate(str.maketrans(A, KEY))

def groups(s, per_line=10):                # five-letter groups, as a telegraph clerk sent them
    g = [s[i:i + 5] for i in range(0, len(s), 5)]
    return "\n".join(" ".join(g[i:i + per_line]) for i in range(0, len(g), per_line))

print(groups(C[:150]))
print(Counter(C).most_common(10))
```

```
ZIKVG HIVRP SEGRA RSFRP VGPTI IKVZP BDRVG MVIKT DBZIV BDISB
DLGHI SBLSR SBPSR USPBL ISHIS HRLAR ELSQL MRVBF PSEER ELHPB
REBIB DRCVI CIGLB LISBD PBPQQ YRSPV RHVRP BRERJ KPQSI UURPV
[('R', 165), ('B', 126), ('P', 102), ('I', 93), ('D', 80), ('V', 79), ('S', 77), ('L', 68), ('E', 58), ('G', 44)]
```

The letters are different, but the counts are not: R occurs 165 times, exactly
as often as E did, B 126 times like T, and so on down the list. A substitution
renames the bars of Figure 2.2 and shuffles their order along the axis, but it
can't change their heights. That single fact is the whole weakness, and the
next section is the method that exploits it.

**Why the heights survive.** If the key maps plaintext letter $x$ to
ciphertext letter $\pi(x)$, then every $x$ in the plaintext becomes a
$\pi(x)$ in the ciphertext and nothing else does, so

$$
n_{\text{cipher}}(\pi(x)) = n_{\text{plain}}(x) \quad \text{for every letter } x.
$$

Any statistic that doesn't care about the names of the letters, such as the
sorted list of counts or the index of coincidence, is the same for the
plaintext and the ciphertext. Cryptanalysts call such a statistic an
**invariant** of the cipher. Finding an invariant that the cipher's designer
forgot is still how most breaks begin.

## 2.3 Al-Kindi's method

*Level: beginner.*

The method of counting letters to break a substitution is first written down
in a short book by Abu Yusuf Ya'qub ibn Ishaq al-Kindi, a philosopher and
scientist who worked in Baghdad in the ninth century (he lived from about 801
to about 873). Al-Kindi wrote on almost everything: medicine, music, optics,
mathematics, logic. His *Risala fi istikhraj al-mu'amma*, "A treatise on
extracting obscured messages", was known for centuries only as a title in lists
of his works. A manuscript copy came to light in the 1980s in the Süleymaniye
Library in Istanbul, and Mohammed Mrayati, Yahya Meer Alam and Hassan
al-Tayyan published it in Damascus in 1987, with an English translation
following in 2003. It is the oldest surviving text that teaches
cryptanalysis.

The treatise is short and practical. Al-Kindi first sorts ciphers into kinds:
those that move letters around (transposition) and those that replace them
(substitution), and their combinations. Then he gives the attack, which the
modern editors divide into a quantitative part and a qualitative part. As he
lays it out, in paraphrase:

<div class="mars-steps" markdown>

1. **Get a reference count.** Take a different text in the same language, about
   a sheet long, and count each letter in it. Call the commonest letter "the
   first", the next "the second", and so on. (For Arabic he gives such an
   order, counted from his own sample.)
2. **Count the cryptogram the same way.** Rank its symbols by how often they
   occur.
3. **Match the ranks.** Put the first letter in place of the commonest symbol,
   the second in place of the next, and so on through the whole cryptogram.
4. **Correct with the qualitative rules.** Use what the language allows:
   which letters often stand together, which never stand next to each other,
   which letters begin and end words, and which words are likely in the
   message, such as the customary opening formula of a letter.

</div>

Step 3 alone would be a mechanical method and would fail, and al-Kindi knew it;
step 4 is where the real work happens. Let us do all four steps to the
ciphertext of §2.2.

**Steps 1 to 3: rank and match.** Our reference count is the `ENGLISH` table.
Matching ranks blindly, with no correction at all:

```python
# Al-Kindi's first step: the commonest symbol is the "first" letter, and so on
order = "".join(sorted(A, key=lambda x: -ENGLISH[A.index(x)]))
ranked = "".join(x for x, _ in Counter(C).most_common())
guess = C.translate(str.maketrans(ranked, order[:len(ranked)]))
print(order)
print(guess[:60])
print(sum(g == p for g, p in zip(guess, P)), "of", len(P), "letters right")
```

```
ETAOINSHRDLCUMWFGYPBVKJXQZ
WOGNDCONEASRDEFESVEANDAUOOGNWATIENDPNOGUITWONTIOSTIHDCOSTHSE
562 of 1149 letters right
```

The top line is the order al-Kindi's "first, second, third" gives for
English. The result is not readable, but half the letters (562 of 1,149) are
already right. The four commonest symbols, R, B, P and I, really are E, T, A
and O, because the top of the order is reliable, as Figure 2.2 showed. After
those, the match goes wrong: the fifth symbol is H, not I, because this text
has more H and less I than average. Only seven of the 23 symbols land on the
right letter (the other three are L, C and K), but they are the common ones,
so they cover half the text.

**Step 4: combinations.** Now use which letters stand together. Count pairs
and triples of symbols, and doubled symbols:

```python
print(Counter(C[i:i + 2] for i in range(len(C) - 1)).most_common(6))
print(Counter(C[i:i + 3] for i in range(len(C) - 2)).most_common(6))
print(Counter(x for x, y in zip(C, C[1:]) if x == y).most_common(4))
```

```
[('BD', 47), ('PB', 36), ('DR', 32), ('VR', 26), ('RE', 26), ('DP', 24)]
[('BDR', 23), ('BDP', 15), ('DPB', 15), ('DRV', 13), ('REL', 12), ('BLI', 9)]
[('B', 9), ('Q', 8), ('E', 6), ('S', 4)]
```

The commonest triple is BDR, 23 times, and we already believe B is T and R is
E. A three-letter group T?E that turns up 23 times in English is THE, so D is
H. Then BDP (T H ?) and DPB (H ? T), 15 times each, read THA and HAT, which
confirms P as A: the word THAT, which Lincoln used 13 times. Of the doubled
symbols, Q (8 times) has to be a letter that English doubles often but that is
not among the commonest four: L, as in ALL, SHALL, WILL and FULL, is a good
guess. Al-Kindi's rules on letter combinations are exactly this kind of
reasoning, with Arabic's rules in place of English ones.

**Step 4 again: probable words.** The attacker of a political speech can guess
some of its words. A word like DEDICATED has a shape that survives
substitution: its first, third and ninth letters are the same, and its second
and eighth are the same. Any place in the ciphertext with that same pattern of
repeats is a candidate. This is the **probable-word** method, and it doesn't
need the spaces between words:

```python
def pattern(w):                     # DEDICATED -> 0.1.0.2.3.4.5.1.0
    return ".".join(str(w.index(x)) for x in w)

def find_word(c, word):             # every place the ciphertext has the word's pattern
    n, p = len(word), pattern(word)
    return Counter(c[i:i + n] for i in range(len(c) - n + 1) if pattern(c[i:i + n]) == p)

print(find_word(C, "DEDICATED"))
print(find_word(C, "NATION").most_common(3))
```

```
Counter({'ERELHPBRE': 4, 'TPTRELSPT': 1})
[('SPBLIS', 5), ('HISGRH', 2), ('RHVPBR', 2)]
```

ERELHPBRE appears four times. It fits what we know already (R is E in the
second and eighth places, and P and B are A and T in the sixth and seventh),
so it is DEDICATED, and it gives three new letters: E is D, L is I, H is C. The
other match, TPTRELSPT, can't be DEDICATED, because it would need P to be E,
and P is A. (It is a real piece of the plaintext, "enGAGED IN A Great", whose
letters happen to repeat in the same places: probable words always throw up a
few false matches, and the known letters weed them out.) NATION, pattern
0.1.2.3.4.0, gives SPBLIS five times, consistent again, so S is N.

Put the ten guesses together and look:

```python
def show(c, guess):                 # known letters in place, '-' for the rest
    return "".join(guess.get(x, "-") for x in c)

g = {"R": "E", "B": "T", "P": "A", "I": "O", "D": "H",           # counts, then THE
     "E": "D", "L": "I", "H": "C", "S": "N", "Q": "L"}           # DEDICATED, NATION, doubled L
print(show(C[:60], g))
print(show(C[60:120], g))
```

```
-O---CO-EAND-E-EN-EA--A-OO---ATHE----O--HT-O-THONTHI-CONTINE
NTANE-NATIONCONCEI-EDINLI-E-T-ANDDEDICATEDTOTHE--O-O-ITIONTH
```

Anyone who has heard the speech reads the first line at once: FOUR SCORE AND
SEVEN YEARS AGO OUR FATHERS BROUGHT FORTH ON THIS CONTINENT. Each word read
gives more letters (F, U, S, V, Y, G, R, B), and each new letter is checked
against every other place it occurs. The last few rare letters, such as Q and
K, come from single words. The whole break took two counts, two probable words
and some reading.

**Why it works, and how much text it needs.** The method rests on two facts:
a substitution preserves counts (§2.2), and the language's counts are stable
enough that a sample predicts them. The second fact needs enough text. Ibn
'Adlan in thirteenth-century Damascus put the minimum at about 90 letters for
counts to be trusted, and his estimate is in the right range; §2.10 gives
Shannon's modern version of the question. With fewer letters the order of even
the common letters becomes uncertain, and a short message, such as a
three-word telegram, can't be broken by counting alone.

!!! note "Life story: al-Kindi's treatise"
    **Born:** 9th century, Baghdad: Abu Yusuf Ya'qub al-Kindi's *Risala fi
    istikhraj al-mu'amma*, the oldest surviving manual of cryptanalysis;
    rediscovered in Istanbul and published in 1987 · **Purpose:** to read
    letters written in substitution and transposition ciphers, by counting
    letters against a sample of the language and correcting with letter
    combinations and probable words · **Helped:** founded a tradition carried
    on by Ibn 'Adlan, Ibn ad-Durayhim and al-Qalqashandi, whose encyclopedia
    of 1412 preserved it; Europe's black chambers relearned the same method in
    the Renaissance · **Status:** frequency analysis is still the first step
    against any classical cipher, and its idea, count what the cipher fails
    to hide, is the root of every statistical attack in this book

The arms race that followed is told in [book 1, §2.5](../../book/02-Classical-Ciphers.md#25-simple-substitution-and-frequency-analysis):
cipher clerks dropped word spaces (which we did here, and it didn't help),
added nulls and homophones, and the codebreakers adapted each time. The
decisive defense was not to hide the counts of one alphabet better, but to use
many alphabets. That is the Vigenère cipher, and it is next.

## 2.4 Kasiski's repeats

*Level: beginner.*

The Vigenère cipher ([book 1, §2.6](../../book/02-Classical-Ciphers.md#26-many-alphabets-the-vigenere-cipher))
shifts each letter by the matching letter of a repeating keyword. With the key
LINCOLN, the 1st, 8th, 15th, ... letters are shifted by L (11 places), the 2nd,
9th, 16th, ... by I (8 places), and so on. Each letter of the plaintext can
become several different ciphertext letters, so the counts flatten out, and
the attack of §2.3 has nothing to grab: the commonest symbol is no longer
obviously E.

For three centuries this was called *le chiffre indéchiffrable*, the cipher
that can't be deciphered. Its weakness is that the key repeats. Charles
Babbage found how to exploit that in 1854, while answering a challenge cipher
published in the *Journal of the Society of Arts*, but he never published his
method, and it is known only from his papers. Friedrich Wilhelm Kasiski, a
retired major of the Prussian infantry, found it independently and published
it in 1863 in a slim book, *Die Geheimschriften und die Dechiffrir-Kunst*
("Secret writing and the art of deciphering"). It is called Kasiski's
examination, or the Kasiski test, after him.

**The idea.** Suppose the same piece of plaintext, say NATION, occurs twice in
the message. If the two copies are a multiple of 7 letters apart, they sit
under the same letters of LINCOLN, get the same shifts, and come out as the
same ciphertext. So a repeated group in the ciphertext is likely to be a
repeated word that happened to fall at the same point of the key, and its
distance is likely to be a multiple of the key length. Collect several such
distances, and the key length divides most of them.

**By hand.** Here are the first 200 letters of the Gettysburg Address,
encrypted with the key LINCOLN, in groups of five. Look for any group of three
letters or more that occurs twice. (Position 0 is the first letter; each line
holds 50.)

```
QWHTG NBCMN PRDRG MAASL EDITQ CFEQI GJSCF MZBWU SGQWE VVZAE
PVUQZ AEQAG BENYM JPOEV ZVPQB NRTDR FWYYT JRTHJ NYLQG RTPLB
RFHZG SMCTC ABDQG KCYGS IGCZW ZPVNT SNEPI GGRPD FIYPC HJPIE
GSYTL ORFWY NRZRC HNVGQ YYOCG PAGKB RJSMG JSCGS IGPOE VZVBT
```

The longest repeat is easy to spot once you look for it: POEVZV appears in the
second line and again at the end of the last. A careful search finds five
repeated groups in all:

| Repeat | Positions | Distance | Factors | Plaintext underneath |
|---|---|---|---|---|
| GJSC | 30, 184 | 154 | $2 \times 7 \times 11$ | fa**THER**s, whe**THER** |
| ZAE | 47, 54 | 7 | $7$ | **ON T**his, c**ONT**inent |
| POEVZV | 66, 192 | 126 | $2 \times 3^2 \times 7$ | **NATION**, **NATION** |
| RFWY | 79, 156 | 77 | $7 \times 11$ | conceiv**ED IN**, engag**ED IN** |
| GSIG | 118, 188 | 70 | $2 \times 5 \times 7$ | **THAT** all, **THAT** nation |

The only factor common to all five distances is 7, so the key has 7 letters
(or, much less likely, 1). The plaintext column, which the attacker can't see
yet, shows why: every repeat is a real repeat of the plaintext. Note also the
repeat that is not a word at all: "on this continent" puts ONT twice, 7 letters
apart, across a word break. Kasiski's method doesn't care about words, only
about repeated letter groups. Figure 2.3 draws the five repeats.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Five repeated groups in the first 200 letters of the LINCOLN ciphertext, drawn as brackets between their two positions; the distances 154, 7, 126, 77 and 70 are all multiples of 7" fill="currentColor" font-size="14">
<line x1="40" y1="270" x2="600" y2="270" stroke="currentColor" stroke-width="1.2"/>
<line x1="40" y1="270" x2="40" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="40" y="290" text-anchor="middle" font-size="12">0</text>
<line x1="110" y1="270" x2="110" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="110" y="290" text-anchor="middle" font-size="12">25</text>
<line x1="180" y1="270" x2="180" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="180" y="290" text-anchor="middle" font-size="12">50</text>
<line x1="250" y1="270" x2="250" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="250" y="290" text-anchor="middle" font-size="12">75</text>
<line x1="320" y1="270" x2="320" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="320" y="290" text-anchor="middle" font-size="12">100</text>
<line x1="390" y1="270" x2="390" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="390" y="290" text-anchor="middle" font-size="12">125</text>
<line x1="460" y1="270" x2="460" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="460" y="290" text-anchor="middle" font-size="12">150</text>
<line x1="530" y1="270" x2="530" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="530" y="290" text-anchor="middle" font-size="12">175</text>
<line x1="600" y1="270" x2="600" y2="275" stroke="currentColor" stroke-width="1"/>
<text x="600" y="290" text-anchor="middle" font-size="12">200</text>
<line x1="124" y1="200" x2="124" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="555" y1="200" x2="555" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="124" y1="200" x2="555" y2="200" stroke="currentColor" stroke-width="1.6"/>
<text x="340" y="193" text-anchor="middle">GJSC (THER): 154 = 2 × 7 × 11</text>
<line x1="172" y1="240" x2="172" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="191" y1="240" x2="191" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="172" y1="240" x2="191" y2="240" stroke="currentColor" stroke-width="1.6"/>
<text x="199" y="245">ZAE (ONT): 7</text>
<line x1="225" y1="150" x2="225" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="578" y1="150" x2="578" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="225" y1="150" x2="578" y2="150" stroke="currentColor" stroke-width="1.6"/>
<text x="401" y="143" text-anchor="middle">POEVZV (NATION): 126 = 2 × 3 × 3 × 7</text>
<line x1="261" y1="100" x2="261" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="477" y1="100" x2="477" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="261" y1="100" x2="477" y2="100" stroke="currentColor" stroke-width="1.6"/>
<text x="369" y="93" text-anchor="middle">RFWY (EDIN): 77 = 7 × 11</text>
<line x1="370" y1="50" x2="370" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="566" y1="50" x2="566" y2="270" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<line x1="370" y1="50" x2="566" y2="50" stroke="currentColor" stroke-width="1.6"/>
<text x="468" y="43" text-anchor="middle">GSIG (THAT): 70 = 2 × 5 × 7</text>
<text x="320" y="312" text-anchor="middle">position in the ciphertext</text>
</svg>
<figcaption>Figure 2.3. Kasiski's examination of the first 200 letters of the LINCOLN ciphertext. Each bracket joins the two copies of a repeated group, with the plaintext underneath in brackets; every distance is a multiple of 7, the key length.</figcaption>
</figure>

The same search in code, printing every repeated group of three:

```python
from math import gcd

def vigenere(p, key, sign=1):        # sign=-1 decrypts
    return "".join(A[(A.index(x) + sign * A.index(key[i % len(key)])) % 26]
                   for i, x in enumerate(p))

V = vigenere(P, "LINCOLN")
print(groups(V[:200]))

def repeats(c, n=3):                 # every group of n letters seen more than once
    seen = {}
    for i in range(len(c) - n + 1):
        seen.setdefault(c[i:i + n], []).append(i)
    return {g: pos for g, pos in seen.items() if len(pos) > 1}

g = 0
for group, pos in repeats(V[:200]).items():
    g = gcd(g, pos[1] - pos[0])
    print(group, pos, pos[1] - pos[0])
print("gcd of the distances:", g)
```

```
QWHTG NBCMN PRDRG MAASL EDITQ CFEQI GJSCF MZBWU SGQWE VVZAE
PVUQZ AEQAG BENYM JPOEV ZVPQB NRTDR FWYYT JRTHJ NYLQG RTPLB
RFHZG SMCTC ABDQG KCYGS IGCZW ZPVNT SNEPI GGRPD FIYPC HJPIE
GSYTL ORFWY NRZRC HNVGQ YYOCG PAGKB RJSMG JSCGS IGPOE VZVBT
GJS [30, 184] 154
JSC [31, 185] 154
ZAE [47, 54] 7
POE [66, 192] 126
OEV [67, 193] 126
EVZ [68, 194] 126
VZV [69, 195] 126
RFW [79, 156] 77
FWY [80, 157] 77
GSI [118, 188] 70
SIG [119, 189] 70
gcd of the distances: 7
```

Each four-letter repeat shows up as two overlapping three-letter repeats, and
POEVZV as four; that is why the list is longer than the table. The gcd is
taken step by step: $\gcd(154, 7) = 7$, and 7 divides each later distance, so
it stays 7.

**Accidents.** These 200 letters are unusually clean. In the whole 1,149-letter
ciphertext there are 123 repeated groups of three, giving 155 distances between
neighboring copies, and 23 of those distances are *not* multiples of 7, such as
10, 53 and 62. Those are accidents: two different pieces of plaintext that
happened to encrypt to the same three letters. So the gcd of all the distances
is 1, and the attacker counts instead which small numbers divide the most
distances. Over the whole text, 7 divides 132 of the 155, 2 divides 73 and 14
divides 59. The key length is the number that wins by a wide margin, and its
multiples (14 here) come second, because a distance that is a multiple of 14
is also a multiple of 7.

How often do accidents happen? Two given positions match in three letters by
chance with probability about $(1/26)^3 \approx 1/17{,}576$, if the ciphertext
looks random. A text of $N$ letters has about $N^2/2$ pairs of positions,
which for $N = 1{,}149$ is about 660,000 pairs, so we should expect about
660,000 / 17,576, roughly 38, accidental pairs of matching trigrams. The real
ciphertext has 203 matching pairs, of which 28 are at a distance that is not a
multiple of 7: the same order as the estimate, which is all such a rough count
can promise. The estimate also shows why longer repeats are worth more: a chance repeat of four letters is 26
times rarer, and of six letters, like POEVZV, is all but impossible.

**Then what?** Once the length is known, the ciphertext splits into 7 columns,
letters 0, 7, 14, ..., then 1, 8, 15, ..., and so on. Each column was encrypted
with a single shift, so each is a shift cipher and gives up its key letter to
the counting of §2.3, as §2.5 shows. The 7-letter key costs $7 \times 26 = 182$
trials, not $26^7 \approx 8 \times 10^9$. A long key only helps the defender by
leaving fewer letters in each column.

!!! note "Life story: Kasiski's examination"
    **Born:** 1854 in Charles Babbage's unpublished notes; published in 1863 by
    Friedrich Wilhelm Kasiski (1805 to 1881) in *Die Geheimschriften und die
    Dechiffrir-Kunst*, Berlin · **Purpose:** find the period of a repeating-key
    cipher from the distances between repeated groups in the ciphertext ·
    **Helped:** ended the Vigenère cipher's reputation as unbreakable; armies
    moved to codebooks, transposition and, by the 1920s, machines · **Status:**
    still the first test on a polyalphabetic ciphertext; its idea, that a
    repeat in the key shows as a repeat in the ciphertext, returns in the
    keystream-reuse attacks of Chapter 8

Kasiski's book made little noise when it appeared. Its author went back to his
other interest, archaeology, and the method spread slowly through military
manuals over the following decades. By the First World War every army's
codebreakers knew it, and no serious army trusted a Vigenère cipher.

## 2.5 Friedman's index of coincidence

*Level: intermediate.*

Kasiski's method needs repeats, and a short message may have none. In 1920,
William Friedman, then at Riverbank Laboratories near Chicago, found a test
that needs no repeats at all, only counts. He printed it in 1922 as
*The Index of Coincidence and Its Applications in Cryptography*, and it changed
codebreaking from a craft of patterns into a branch of statistics.

**The index by hand.** Recall the definition: if letter $x$ occurs $n_x$ times
in a text of $N$ letters,

$$
\mathrm{IC} = \frac{\sum_x n_x (n_x - 1)}{N (N - 1)}.
$$

The top counts the ordered pairs of positions that hold the same letter; the
bottom counts all ordered pairs. Take TOBEORNOTTOBE: 13 letters, with O four
times, T three times, B and E twice each, R and N once. The top is
$4 \cdot 3 + 3 \cdot 2 + 2 \cdot 1 + 2 \cdot 1 = 22$, the bottom
$13 \cdot 12 = 156$, so $\mathrm{IC} = 22/156 = 0.141$, very high, because
that phrase reuses so few letters. Real English sits near 0.066, random letters
at $1/26 = 0.0385$.

**What it tells us.** A substitution doesn't change the IC (§2.2). A Vigenère
cipher mixes several alphabets and pulls it towards random. In
[book 1, §2.12](../../book/02-Classical-Ciphers.md#212-going-deeper) the
expected value is worked out: with key length $L$,

$$
\mathrm{IC} \approx \frac{1}{L}\kappa_p + \frac{L-1}{L}\kappa_r, \qquad
L \approx \frac{\kappa_p - \kappa_r}{\mathrm{IC} - \kappa_r},
$$

where $\kappa_p \approx 0.066$ is English's value and $\kappa_r = 1/26$ the
random one. The second formula is **Friedman's estimate** of the key length
from a single number. Try it on the LINCOLN ciphertext:

```python
def ic(s):                           # chance that two letters drawn from s match
    n, N = Counter(s), len(s)
    return sum(k * (k - 1) for k in n.values()) / (N * (N - 1))

KP, KR = 0.0667, 1 / 26              # English, and uniformly random letters
print("IC plain %.4f  cipher %.4f" % (ic(P), ic(V)))
print("Friedman's estimate of L: %.1f" % ((KP - KR) / (ic(V) - KR)))
for L in range(1, 11):
    print(L, "%.4f" % (sum(ic(V[i::L]) for i in range(L)) / L))
```

```
IC plain 0.0730  cipher 0.0438
Friedman's estimate of L: 5.3
1 0.0438
2 0.0437
3 0.0436
4 0.0435
5 0.0436
6 0.0434
7 0.0717
8 0.0425
9 0.0437
10 0.0432
```

The estimate says 5.3, and the key has 7 letters. That is typical: the formula
divides by $\mathrm{IC} - \kappa_r$, a small difference (here 0.0053) that a
little noise changes a lot. Using the speech's own IC of 0.0730 in place of
0.0667 gives $0.0345 / 0.0053 \approx 6.5$, much closer. Friedman's estimate
says "a short key, five to eight letters", which is useful for deciding where
to look, but not exact.

The **column test** below it is exact. For each guess $L$, cut the ciphertext
into $L$ columns and average their ICs. If the guess is wrong, each column
mixes several shifts and looks random (0.043 or so). If it is right, each
column is one shift of English, and its IC jumps to English's value: 0.0717 at
$L = 7$, against at most 0.0438 anywhere else in the range. (A multiple of the
true length, 14, would also score high; the smallest high one is the answer.)

**How much text the column test needs.** With 200 letters each column holds
only 28 or 29. By hand, the first column of the 200-letter ciphertext of §2.4,
QCGDQMQEEYZTTYLSDSPPFPLRGPSSZ, has S and P four times each, Q three times, and
seven letters twice, so its top is
$2(4 \cdot 3) + 3 \cdot 2 + 7(2 \cdot 1) = 44$, and its IC is
$44 / (29 \cdot 28) = 0.054$. That is closer to random than to English, and a
wrong guess can do as well by luck: with $L = 6$, the first column of those 200
letters happens to score 0.062. One column is too noisy to trust; the average
over all the columns is not. On the 200 letters, the seven columns of $L = 7$
average 0.0719, and no other $L$ from 1 to 10 gets above 0.047.

**Reading each key letter.** Each column is a shift cipher with an unknown
shift. The quickest hand method is al-Kindi's: the commonest letter of the
column is probably E. In the full first column (165 letters) P occurs 23 times,
far more than anything else. If P is E, the shift is $P - E = 15 - 4 = 11$,
which is L, the first letter of the key. Doing this for each column usually
gives most of the key, and reading the result fixes the rest.

A more reliable method uses every letter of the column, not just the top one.
For each trial shift $s$, undo the shift and measure how well the column's
letter frequencies $q$ line up with English's $p$:

$$
F(s) = \sum_{i=0}^{25} q_{i+s}\, p_i ,
$$

with indices mod 26. If $s$ is the true shift, $q_{i+s}$ is roughly $p_i$ and
$F(s) \approx \sum_i p_i^2 \approx 0.066$, the chance that two English letters
match. If $s$ is wrong by $k$, $F(s) \approx \sum_i p_{i+k}\, p_i$, which
is smaller, about 0.038 on average. In fact the right shift always wins in the
limit: by the Cauchy-Schwarz inequality,
$\sum_i p_{i+k} p_i \le \sqrt{\sum_i p_{i+k}^2}\sqrt{\sum_i p_i^2} = \sum_i p_i^2$,
with equality only when the shifted profile equals the original, which for
English happens only at $k = 0$. Figure 2.4 shows $F$ for the first column.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="For each of the 26 shifts, how well the first column of the LINCOLN ciphertext matches English; shift 11, the key letter L, scores 6.65, every other shift between 2.95 and 4.74" fill="currentColor" font-size="14">
<line x1="60" y1="230" x2="620" y2="230" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="235" text-anchor="end">0</text>
<line x1="60" y1="176" x2="620" y2="176" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="181" text-anchor="end">2</text>
<line x1="60" y1="121" x2="620" y2="121" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="126" text-anchor="end">4</text>
<line x1="60" y1="67" x2="620" y2="67" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="54" y="72" text-anchor="end">6</text>
<rect x="64.0" y="114.4" width="15" height="115.6" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="71.5" y="250" text-anchor="middle">A</text>
<rect x="85.5" y="128.3" width="15" height="101.7" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="93.0" y="250" text-anchor="middle">B</text>
<rect x="107.0" y="129.3" width="15" height="100.7" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="114.5" y="250" text-anchor="middle">C</text>
<rect x="128.5" y="140.8" width="15" height="89.2" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="136.0" y="250" text-anchor="middle">D</text>
<rect x="150.0" y="116.4" width="15" height="113.6" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="157.5" y="250" text-anchor="middle">E</text>
<rect x="171.5" y="136.9" width="15" height="93.1" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="179.0" y="250" text-anchor="middle">F</text>
<rect x="193.0" y="139.6" width="15" height="90.4" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="200.5" y="250" text-anchor="middle">G</text>
<rect x="214.5" y="118.1" width="15" height="111.9" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="222.0" y="250" text-anchor="middle">H</text>
<rect x="236.0" y="139.0" width="15" height="91.0" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="243.5" y="250" text-anchor="middle">I</text>
<rect x="257.5" y="150.1" width="15" height="79.9" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="265.0" y="250" text-anchor="middle">J</text>
<rect x="279.0" y="124.8" width="15" height="105.2" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="286.5" y="250" text-anchor="middle">K</text>
<rect x="300.5" y="49.4" width="15" height="180.6" opacity="0.9" stroke="currentColor" stroke-width="1"/>
<text x="308.0" y="250" text-anchor="middle" font-weight="bold">L</text>
<rect x="322.0" y="125.1" width="15" height="104.9" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="329.5" y="250" text-anchor="middle">M</text>
<rect x="343.5" y="139.8" width="15" height="90.2" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="351.0" y="250" text-anchor="middle">N</text>
<rect x="365.0" y="121.9" width="15" height="108.1" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="372.5" y="250" text-anchor="middle">O</text>
<rect x="386.5" y="106.7" width="15" height="123.3" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="394.0" y="250" text-anchor="middle">P</text>
<rect x="408.0" y="143.0" width="15" height="87.0" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="415.5" y="250" text-anchor="middle">Q</text>
<rect x="429.5" y="132.6" width="15" height="97.4" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="437.0" y="250" text-anchor="middle">R</text>
<rect x="451.0" y="125.3" width="15" height="104.7" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="458.5" y="250" text-anchor="middle">S</text>
<rect x="472.5" y="140.8" width="15" height="89.2" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="480.0" y="250" text-anchor="middle">T</text>
<rect x="494.0" y="138.5" width="15" height="91.5" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="501.5" y="250" text-anchor="middle">U</text>
<rect x="515.5" y="132.4" width="15" height="97.6" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="523.0" y="250" text-anchor="middle">V</text>
<rect x="537.0" y="115.8" width="15" height="114.2" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="544.5" y="250" text-anchor="middle">W</text>
<rect x="558.5" y="126.1" width="15" height="103.9" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="566.0" y="250" text-anchor="middle">X</text>
<rect x="580.0" y="101.4" width="15" height="128.6" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="587.5" y="250" text-anchor="middle">Y</text>
<rect x="601.5" y="121.1" width="15" height="108.9" opacity="0.35" stroke="currentColor" stroke-width="1"/>
<text x="609.0" y="250" text-anchor="middle">Z</text>
<line x1="60" y1="51.7" x2="620" y2="51.7" stroke="currentColor" stroke-width="1" stroke-dasharray="6 4" opacity="0.7"/>
<line x1="60" y1="125.5" x2="620" y2="125.5" stroke="currentColor" stroke-width="1" stroke-dasharray="6 4" opacity="0.7"/>
<text x="340" y="16" text-anchor="middle">dashed lines: English against itself (6.57), random letters (3.85)</text>
<line x1="60" y1="230" x2="620" y2="230" stroke="currentColor" stroke-width="1.2"/>
<text x="340" y="278" text-anchor="middle">trial key letter for column 1 (165 letters)</text>
</svg>
<figcaption>Figure 2.4. Finding the first key letter. For each trial shift, how well the column's letter counts match English's, in percent. The true shift, L, scores 6.65, close to English matched against itself; every other shift stays near the random level.</figcaption>
</figure>

In code, for every column, then the decryption:

```python
def best_shift(col):                 # slide English's profile along the column's counts
    n = Counter(col)
    def fit(s):
        return sum(n[A[(i + s) % 26]] * ENGLISH[i] for i in range(26))
    return max(range(26), key=fit)

def solve_vigenere(c, L):
    return "".join(A[best_shift(c[i::L])] for i in range(L))

print(solve_vigenere(V, 7), solve_vigenere(V[:200], 7), solve_vigenere(V[:100], 7))
print(vigenere(V, solve_vigenere(V, 7), -1)[:40])
```

```
LINCOLN LINCOLN MINCOLN
FOURSCOREANDSEVENYEARSAGOOURFATHERSBROUG
```

With all 1,149 letters, or only the first 200, the key comes out exactly. With
100 letters, 14 or 15 per column, one column out of seven goes wrong (M in
place of L), and the decryption reads EOURSCOQEANDSEUEN..., one letter in
seven off by one place, which a reader fixes at a glance. Friedman's two tests together, the
column IC for the length and the profile match for each letter, break a
Vigenère cipher with about 15 to 20 letters per column of key.

**Two columns against each other.** Friedman went further. Two columns
encrypted with shifts $a$ and $b$ are the same English shifted by $b - a$
relative to each other. So the attacker can line up any two columns by sliding
one against the other and computing the **mutual index of coincidence**,
$\sum_x q_x q'_{x+k}$, which peaks at $k = b - a$. This finds the key up to
one unknown overall shift without using any table of English frequencies at
all, leaving 26 candidate keys to read. It works for any language, even one
the attacker doesn't know, which is why it mattered against messages in code
or in unfamiliar languages.

!!! note "Life story: the index of coincidence"
    **Born:** 1920, William F. Friedman at Riverbank Laboratories, Geneva,
    Illinois; printed in 1922 as Riverbank Publication No. 22 · **Purpose:**
    tell from counts alone whether a text is one alphabet or many, find the
    period of a polyalphabetic cipher, and line up alphabets against each
    other · **Helped:** made cryptanalysis statistical; Friedman's US Army
    team, with Solomon Kullback, Abraham Sinkov and Frank Rowlett, used such
    tests against machine ciphers, and counting coincidences between
    overlapped messages was the heart of Bletchley Park's Banburismus ·
    **Status:** in every solver's toolkit;
    the idea of a statistic that separates "right key" from "wrong key" is the
    basis of the scores in §2.6 and of the correlation attacks of
    Chapter 8

Friedman had trained as a geneticist, and he came to ciphers through a
millionaire's private research estate, where he also met the codebreaker
Elizebeth Smith, who became his wife and his equal in the field; book 1 tells
their story. The machine-age work of his team, including the break of Japan's
Purple cipher in 1940, is in [Chapter 3](03-Machines-and-the-War.md).

## 2.6 Hill climbing a substitution

*Level: intermediate.*

Al-Kindi's method in §2.3 worked, but a human did the hard part: seeing that
-O---CO-EAND-E-EN reads FOUR SCORE AND SEVEN. Codebreakers with thousands of
messages, or a computer and no patience, want a method that runs by itself.
The modern answer has two pieces: a **score** that says how much a text looks
like English, and a **search** that changes the key a little at a time and
keeps each change that raises the score. The search is called **hill
climbing**, because the score is a landscape over the set of keys and the
search walks uphill.

**The score.** Think of English as a source that produces letters with known
probabilities. A crude but useful model says the probability of a text is the
product of the probabilities of its overlapping groups of three letters, its
**trigrams**:

$$
\Pr(t_1 t_2 \ldots t_N) \approx \prod_{i=1}^{N-2} \Pr(t_i t_{i+1} t_{i+2}).
$$

Products of thousands of small numbers underflow, so take logarithms and add
instead. The **fitness** of a candidate decryption is

$$
f(t) = \sum_{i=1}^{N-2} \log_{10} \Pr(t_i t_{i+1} t_{i+2}).
$$

A decryption that is real English contains common trigrams such as THE, AND,
ING and ION, and scores high (less negative). A wrong decryption is full of
trigrams such as QXK that English almost never produces, each of which costs a
lot. The right key maximizes $f$, or comes very close to it, and §2.10 says
how close.

**Where do the probabilities come from?** Serious solvers count groups of four
letters (quadgrams) in hundreds of millions of letters of text and ship the
table as a data file. We have neither the file nor the text, but Python ships
with a few hundred thousand letters of English already: the text of the
built-in `help()` system, in the module `pydoc_data.topics`. It is technical
English (it says "function" and "object" more than Lincoln did), but its
trigram counts are close enough to ordinary English to score with:

```python
import math, random
from pydoc_data.topics import topics          # the text of Python's help(), shipped with Python

TRAIN = letters(" ".join(topics.values()))     # about 368,000 letters of English
TRI = Counter(TRAIN[i:i + 3] for i in range(len(TRAIN) - 2))
TOTAL = sum(TRI.values())
LOGP = {t: math.log10(k / TOTAL) for t, k in TRI.items()}
FLOOR = math.log10(0.01 / TOTAL)               # for triples the training text never shows

def fitness(s):                                # log10 of how likely s is as English
    return sum(LOGP.get(s[i:i + 3], FLOOR) for i in range(len(s) - 2))

print(len(TRAIN), len(TRI))
print("English %.2f, cipher %.2f per letter" % (fitness(P) / len(P), fitness(C) / len(C)))
```

```
367837 5948
English -3.43, cipher -6.19 per letter
```

The help text of Python 3.13 gives 367,837 letters and 5,948 different
trigrams out of the $26^3 = 17{,}576$ possible. (Other versions of Python
have slightly different help text, so your counts and the scores below may
differ a little; the attacks still work.) The `FLOOR` gives a trigram the
training text never shows a small probability instead of zero, since
$\log 0$ would make any text containing it infinitely unlikely. On this scale
the true plaintext scores $-3.43$ per letter and the ciphertext $-6.19$; a
random key's decryption lands near the ciphertext's value.

**The search.** A key for a substitution is a shuffle of the alphabet. Start
from a random one. Swap two of its letters, decrypt, and score. If the score
went up, keep the swap; if not, undo it. Stop when 2,000 swaps in a row have
failed, which means the search has reached a key that no single swap improves,
a **local maximum**:

```python
def decrypt(c, key):                           # key[i] is the cipher letter for plain A[i]
    return c.translate(str.maketrans(key, A))

def climb(c, rng, patience=2000):
    key = list(A)
    rng.shuffle(key)                           # start anywhere
    best = fitness(decrypt(c, "".join(key)))
    tries = 0
    while tries < patience:                    # stop after 2,000 swaps in a row fail
        i, j = rng.sample(range(26), 2)
        key[i], key[j] = key[j], key[i]        # swap two letters of the key
        f = fitness(decrypt(c, "".join(key)))
        if f > best:
            best, tries = f, 0                 # better: keep it
        else:
            key[i], key[j] = key[j], key[i]    # worse: put it back
            tries += 1
    return best, "".join(key)

rng = random.Random(1)
for run in range(5):
    f, key = climb(C, rng)
    print(run, round(f), decrypt(C, key)[:44])
```

```
0 -4786 BAYLDFALETCRDEHECPETLDTUAAYLBTISELDGLAYUSIBA
1 -4090 FOURCMOREANDCEVENYEARCAGOOURFATHERCBROUGHTFO
2 -4772 FAYLDPALETCRDEHECWETLDTUAAYLFTISELDBLAYUSIFA
3 -3944 FOURSCOREANDSEVENYEARSAGOOURFATHERSBROUGHTFO
4 -5117 DTWOAUTORSHEARPRHXRSOASMTTWODSINROAYOTWMNIDT
```

Each climb takes about half a second. Run 3 found the key: its decryption is
the speech, and its score, $-3{,}944$, is exactly the true key's. The others
stopped on lower hills. Run 1 is the instructive one: FOURCMORE ... CEVEN, a
nearly right key in which five letters are passed round a cycle (S shows as C,
C as M, M as P, P as L and L as S). To fix it, the search would need four swaps
in a row, and the first of them, on its own, makes the score worse, so a
climber that only goes uphill can never take it. Runs 0,
2 and 4 got stuck much further down. Figure 2.5 follows three of the climbs.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Score per letter against swaps tried, on a log scale, for three hill climbs on the substitution ciphertext; one reaches the true key at minus 3.43, two stop on lower peaks" fill="currentColor" font-size="14">
<line x1="80" y1="30" x2="560" y2="30" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="74" y="35" text-anchor="end">-3</text>
<line x1="80" y1="79" x2="560" y2="79" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="74" y="84" text-anchor="end">-4</text>
<line x1="80" y1="128" x2="560" y2="128" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="74" y="133" text-anchor="end">-5</text>
<line x1="80" y1="177" x2="560" y2="177" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="74" y="182" text-anchor="end">-6</text>
<line x1="80" y1="226" x2="560" y2="226" stroke="currentColor" stroke-width="0.5" stroke-dasharray="2 3"/>
<text x="74" y="231" text-anchor="end">-7</text>
<line x1="80" y1="250" x2="80" y2="255" stroke="currentColor" stroke-width="1"/>
<text x="80" y="272" text-anchor="middle">0</text>
<line x1="200" y1="250" x2="200" y2="255" stroke="currentColor" stroke-width="1"/>
<text x="200" y="272" text-anchor="middle">10</text>
<line x1="320" y1="250" x2="320" y2="255" stroke="currentColor" stroke-width="1"/>
<text x="320" y="272" text-anchor="middle">100</text>
<line x1="440" y1="250" x2="440" y2="255" stroke="currentColor" stroke-width="1"/>
<text x="440" y="272" text-anchor="middle">1,000</text>
<line x1="560" y1="250" x2="560" y2="255" stroke="currentColor" stroke-width="1"/>
<text x="560" y="272" text-anchor="middle">10,000</text>
<line x1="80" y1="250" x2="560" y2="250" stroke="currentColor" stroke-width="1.2"/>
<line x1="80" y1="20" x2="80" y2="250" stroke="currentColor" stroke-width="1.2"/>
<text x="320" y="298" text-anchor="middle">swaps tried (log scale)</text>
<text x="20" y="140" text-anchor="middle" transform="rotate(-90 20 140)">score per letter</text>
<line x1="80" y1="51.1" x2="560" y2="51.1" stroke="currentColor" stroke-width="1" stroke-dasharray="6 4" opacity="0.6"/>
<polyline points="80,208.6 137,208.6 137,195.7 152,195.7 152,191.3 164,191.3 164,191.1 188,191.1 188,187.6 195,187.6 195,179.6 200,179.6 200,179.4 248,179.4 248,178.7 257,178.7 257,178.5 261,178.5 261,176.3 262,176.3 262,176.1 274,176.1 274,171.9 278,171.9 278,169.7 281,169.7 281,159.7 292,159.7 292,153.0 293,153.0 293,147.6 295,147.6 295,145.1 298,145.1 298,140.3 302,140.3 302,139.6 304,139.6 304,132.5 306,132.5 306,131.3 308,131.3 308,131.1 312,131.1 312,130.6 317,130.6 317,130.2 319,130.2 319,128.4 319,125.0 326,125.0 326,123.9 330,123.9 330,118.5 333,118.5 333,118.2 334,118.2 334,117.9 337,117.9 337,117.6 338,117.6 338,116.5 341,116.5 341,114.6 346,114.6 346,114.3 347,114.3 347,113.6 351,113.6 351,113.5 356,113.5 356,111.0 358,111.0 358,110.0 372,110.0 372,109.6 377,109.6 377,109.1 377,109.0 380,109.0 380,108.3 390,108.3 390,108.0 391,108.0 391,107.5 406,107.5 406,107.0 407,107.0 407,106.9 415,106.9 415,106.2 417,106.2 417,105.7 418,105.7 418,103.9 423,103.9 423,103.8 423,102.8 426,102.8 426,102.5 455,102.5 455,102.4 460,102.4 460,101.0 505,101.0" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.45"/>
<line x1="330" y1="224" x2="360" y2="224" stroke="currentColor" stroke-width="1.4" opacity="0.45"/>
<text x="368" y="229">run 4: stuck at -4.45</text>
<polyline points="80,158.6 152,158.6 152,153.0 173,153.0 173,149.2 195,149.2 195,145.6 205,145.6 205,138.4 218,138.4 254,138.4 254,132.3 262,132.3 262,132.2 264,132.2 264,126.3 272,126.3 272,125.5 275,125.5 275,124.7 280,124.7 280,120.3 281,120.3 281,117.7 288,117.7 288,116.0 292,116.0 292,114.1 295,114.1 295,113.7 300,113.7 300,113.1 303,113.1 303,112.0 312,112.0 312,111.7 317,111.7 317,111.0 322,111.0 322,103.9 323,103.9 323,103.1 324,103.1 324,102.8 329,102.8 329,102.7 334,102.7 334,102.5 339,102.5 339,96.5 349,96.5 349,94.1 350,94.1 350,92.7 356,92.7 356,92.3 357,92.3 357,92.2 360,92.2 360,92.1 363,92.1 363,89.6 363,88.6 365,88.6 365,88.4 368,88.4 368,88.3 372,88.3 372,88.0 375,88.0 375,87.6 375,85.5 376,85.5 376,83.8 380,83.8 380,83.7 382,83.7 382,80.9 385,80.9 385,79.4 386,79.4 386,78.9 386,76.5 388,76.5 388,75.7 390,75.7 390,75.2 391,75.2 391,74.5 394,74.5 394,74.2 395,74.2 395,73.4 396,73.4 396,71.9 398,71.9 398,70.9 400,70.9 400,67.3 405,67.3 405,67.1 407,67.1 407,67.0 410,67.0 410,65.6 414,65.6 414,65.2 420,65.2 420,65.0 423,65.0 423,62.8 429,62.8 429,62.1 433,62.1 433,60.6 435,60.6 435,60.1 440,60.1 440,59.9 442,59.9 442,59.7 443,59.7 443,59.3 471,59.3 471,57.3 510,57.3" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>
<line x1="330" y1="202" x2="360" y2="202" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>
<text x="368" y="207">run 1: FOURCMORE..., -3.56</text>
<polyline points="80,237.4 116,237.4 116,236.9 152,236.9 152,236.0 164,236.0 164,232.2 195,232.2 195,231.4 200,231.4 200,226.8 205,226.8 205,225.9 214,225.9 214,225.1 221,225.1 221,219.1 231,219.1 231,214.7 233,214.7 233,213.3 241,213.3 241,210.8 243,210.8 243,209.9 252,209.9 252,190.7 254,190.7 257,190.7 257,188.0 261,188.0 261,175.9 271,175.9 271,175.7 272,175.7 272,174.3 278,174.3 278,161.5 280,161.5 280,151.9 282,151.9 282,149.4 288,149.4 288,148.3 289,148.3 293,148.3 293,145.4 298,145.4 298,133.3 315,133.3 315,127.9 316,127.9 316,125.8 319,125.8 319,125.7 321,125.7 321,124.2 322,124.2 322,124.0 324,124.0 324,123.8 328,123.8 328,123.5 329,123.5 329,122.7 331,122.7 331,121.6 340,121.6 340,120.8 341,120.8 343,120.8 343,114.7 346,114.7 346,110.9 354,110.9 354,108.8 365,108.8 365,108.4 379,108.4 379,107.6 384,107.6 384,107.0 387,107.0 387,104.9 387,99.0 392,99.0 392,98.8 394,98.8 394,98.4 395,98.4 398,98.4 398,95.3 401,95.3 401,95.0 401,86.3 404,86.3 404,85.2 404,84.9 406,84.9 406,84.5 411,84.5 411,83.7 411,82.8 414,82.8 414,82.6 414,79.0 421,79.0 421,78.7 422,78.7 422,73.8 427,73.8 427,73.4 434,73.4 434,72.4 440,72.4 440,72.2 441,72.2 441,71.5 444,71.5 453,71.5 453,66.7 453,65.6 458,65.6 458,60.7 459,60.7 459,58.0 467,58.0 467,55.4 471,55.4 471,53.7 479,53.7 479,52.1 486,52.1 486,51.9 500,51.9 500,51.1 526,51.1" fill="none" stroke="currentColor" stroke-width="2" opacity="1.0"/>
<line x1="330" y1="180" x2="360" y2="180" stroke="currentColor" stroke-width="2" opacity="1.0"/>
<text x="368" y="185">run 3: the true key, -3.43</text>
</svg>
<figcaption>Figure 2.5. Three of the five climbs of the code: score per letter against swaps tried. All three rise fast at first. Run 3 reaches the true key's score (dashed line); run 1 stops just below it, with five letters passed round a cycle; run 4 stalls far down.</figcaption>
</figure>

**Restarts.** The cure for local maxima is to climb many times from different
random keys and keep the best result. With five restarts on this ciphertext,
one success is enough; on a harder one, a solver may run hundreds. Better
moves and better scores raise the success rate of each climb. A solver can
start from al-Kindi's frequency-matched key instead of a random one, or sometimes
accept a step down, as simulated annealing does (§2.12). It can also use
quadgrams, which make the landscape smoother, because fixing one letter then
improves many four-letter groups at once.

**Why the landscape is climbable.** A substitution key has 26 independent
parts, and the score of a decryption depends on each part mostly through the
trigrams that contain that letter. A swap that puts E in the right place
improves hundreds of trigrams at once, whatever the rest of the key is. So
the landscape has long uphill slopes towards the right answer, broken by a few
ridges like run 1's cycle. A cipher designed so that changing one bit of the
key changes the whole output, as every modern block cipher is
([book 1, chapter 6](../../book/06-Block-Ciphers.md)), has no such slopes: a
key that is right in 127 of 128 bits decrypts to noise, and a score gives no
hint of how close it is. That property is the real reason computers can break
every classical cipher and no modern one.

!!! note "Life story: hill climbing in cryptanalysis"
    **Born:** with computers: Shmuel Peleg and Azriel Rosenfeld's relaxation
    method for substitution (1979); simulated annealing by W. S. Forsyth and
    Reihaneh Safavi-Naini (1993); the fast swap-and-score climber of Thomas
    Jakobsen (1995) · **Purpose:** break classical ciphers automatically by
    searching the key space guided by a statistical score of the plaintext ·
    **Helped:** made substitution, transposition, Playfair and even Enigma
    message keys solvable by a laptop; in George Lasry's hands, solved
    long-standing challenge ciphers, and helped read Mary, Queen of Scots's
    lost letters (2023) and the Zodiac killer's 340-character cipher (2020) ·
    **Status:** the standard tool for classical ciphers; useless against modern
    ciphers, whose keys have no partial credit

## 2.7 Hill climbing a transposition

*Level: intermediate.*

A transposition keeps the letters and moves them. The **columnar
transposition** of [book 1, §2.8](../../book/02-Classical-Ciphers.md#28-transposition)
writes the message in rows under a keyword and reads it out column by column,
in the alphabetical order of the keyword's letters. Encrypt the speech with the
keyword BATTLEFIELD, 11 columns:

```python
def columnar(p, key):                 # book 1's columnar transposition
    order = sorted(range(len(key)), key=lambda i: (key[i], i))
    return "".join(p[i::len(key)] for i in order)

def uncolumnar(c, order):             # order: the columns, in the order they were read out
    w, n = len(order), len(c)
    out, pos = [""] * n, 0
    for i in order:
        size = len(range(i, n, w))    # columns on the left hold one letter more
        out[i::w] = c[pos:pos + size]
        pos += size
    return "".join(out)

T = columnar(P, "BATTLEFIELD")
print(groups(T[:100]))
print("IC %.4f" % ic(T))
```

```
OSGST TAVYE OAEOG CTTRO NEDTT TVIOL EFHIT ISFRS SENEN ATHID
EOTRO CITME IOEII TEUOY EFDRT IGMRM EEEAH ELEWY THDHO HWEGF
IC 0.0730
```

The first test of Figure 2.1 identifies the cipher at once. The IC is 0.0730,
exactly the plaintext's, and the letter counts are exactly the plaintext's
too, with E commonest and T next. A ciphertext whose letters have English
frequencies but don't read as English has been transposed. It also tells the
attacker that letter counts are useless from here on: every column order gives
the same counts. Only the order of letters carries information, so the score
must look at groups of letters, and the trigram fitness of §2.6 does.

**The key, as the attacker sees it.** The attacker needs two things: the
number of columns $w$, and the order in which they were read out, a
permutation of $w$ items. For $w = 11$ there are $11! \approx 4 \times 10^7$
orders, few enough to try them all on a fast computer, but each extra column
multiplies the count, and $w = 20$ gives $2.4 \times 10^{18}$. Hill climbing
doesn't care about the size.

There is a complication. 1,149 letters in 11 columns make 104 full rows and 5
letters left over, so the first five columns of the grid hold 105 letters and
the other six hold 104. The attacker has to cut the ciphertext into columns of
the right lengths, and the lengths depend on the order: if the order is wrong,
the cuts fall in the wrong places, and even a column that is in the right spot
comes out shifted by a letter. This **irregular** case is much harder than a
message that fills the grid exactly, and it is what hand solvers dreaded; the
`uncolumnar` function of the code handles it by computing each column's length
from its position.

**The climb.** Start from a random order and try two kinds of move: swap two
columns, or lift a run of neighboring columns out and put it back elsewhere.
The second move matters, because once a few columns are in the right order
relative to each other, a swap would break them apart, while a block move
carries them together. Keep any move that raises the fitness. Since $w$ is
unknown, climb for every width from 2 to 14, four times each, and compare:

```python
def climb_order(c, w, rng, patience=1500):
    order = list(range(w))
    rng.shuffle(order)
    best = fitness(uncolumnar(c, order))
    tries = 0
    while tries < patience:
        new = order[:]
        if rng.random() < 0.5:                    # swap two columns
            i, j = rng.sample(range(w), 2)
            new[i], new[j] = new[j], new[i]
        else:                                     # or move a run of columns elsewhere
            i, j = sorted(rng.sample(range(w + 1), 2))
            run = new[i:j]
            del new[i:j]
            k = rng.randrange(len(new) + 1)
            new[k:k] = run
        f = fitness(uncolumnar(c, new))
        if f > best:
            best, order, tries = f, new, 0
        else:
            tries += 1
    return best, order

rng = random.Random(1)
for w in range(2, 15):
    f, order = max(climb_order(T, w, rng) for _ in range(4))
    print(w, "%.2f" % (f / len(T)), uncolumnar(T, order)[:36])
```

```
2 -5.07 OPSRGWSTTLTRAEVNYWEHOUAREEOEGICITOTV
3 -4.94 FTOATSOEGCUSETTHETETATCVICYTOESSOARA
4 -4.95 DFOBRRSPFOGRAASWADTTWTTLTRARHAVEOUYN
5 -4.88 GSDWOFAAISODEOGHTMESGSBLTTCOUTAUHMAA
6 -4.88 ALFTPOCDATRSDTOEWGDLCUTSUAETLTOSHERT
7 -4.85 NNWEOEPHLTLSOSEWFDGSVVNHTSBSWNTNTTTD
8 -4.85 VRBRUPNOSFPFEERSRRRARIWGVOWARGRSOATW
9 -4.79 AOOTBQFETNSDTEEAAIGGNETGOFTESEUEACAM
10 -4.79 WSBDNAEGTOIAPAHBTFPSODREGDAOTGETWMVO
11 -3.92 FOURSOREANCDSEVEYEARSNAGOOUFATHERRSB
12 -4.80 ARPATOADWRATROROISCTEFOETAWELGDLGACU
13 -4.77 GODLHNEAIAHNYVSNWOEISNNGETEGRONEWSDO
14 -4.76 ENTLOHOOLSEAPWDLHDSETSWVARRTWAHTBVMG
```

Width 11 stands far above the rest: $-3.92$ per letter, against $-4.76$ or
worse for every other width, and its decryption already reads FOURSOREANCDSEVE
YEARS, almost English. Wrong widths stay near $-4.8$ whatever the order,
because no order of the wrong columns can make English. But even at width 11,
the four climbs stopped short of the top. The irregular columns make the
landscape rough: near the right order, one wrong column misplaces the cut
points of its neighbors.

So the attacker does what every solver does: having found the width, spend more
effort on it. Ten more climbs at width 11, each allowed 3,000 failed moves
before giving up:

```python
results = sorted(climb_order(T, 11, rng, patience=3000) for _ in range(10))
for f, order in results[-3:]:
    print("%.3f" % (f / len(T)), order, uncolumnar(T, order)[:30])
```

```
-3.878 [2, 1, 10, 5, 8, 6, 7, 4, 9, 3, 0] RFOUSCOREANVDSEENYEARSOAGOURFA
-3.875 [4, 0, 10, 5, 8, 6, 7, 3, 9, 1, 2] FURSOCOREANDEVESNYEARSAOOUGRFA
-3.432 [1, 0, 10, 5, 8, 6, 7, 4, 9, 2, 3] FOURSCOREANDSEVENYEARSAGOOURFA
```

The best climb reaches $-3.432$ per letter, the plaintext's own score, and its
decryption is the speech. The two runners-up are a few columns off and read
almost as well, which is typical: the right answer is a narrow peak with a
few nearly right orders around it. The order found, columns 1, 0, 10, 5, 8, 6,
7, 4, 9, 2, 3, is the alphabetical order of the letters of BATTLEFIELD (A in
column 1, then B in column 0, D in column 10, the two Es in columns 5 and 8,
and so on). The attacker never learns the keyword itself, and doesn't need it:
the order is the key.

**How the craft did it by hand.** Before computers, transposition was attacked
by **anagramming**: cut the ciphertext into columns on a guess of the width,
write them on strips of paper, and slide pairs of strips against each other
looking for common pairs of letters, TH, HE, IN, ER. Two columns that make many
good pairs side by side are probably neighbors. That is hill climbing by hand,
scored with bigrams instead of trigrams. The strongest attack of the hand era
used two messages of the same length sent with the same key: written one above
the other, both had to make sense under the same rearrangement, which made
false fits rare. Armies countered with **double transposition** (transposing
twice with different keys) and with keys changed daily, and double
transposition was used by armies and agents into the Second World War.

The computer attack has kept pace. In 2007 the German writer Klaus Schmeh
published a double-transposition challenge, with two keys of more than 20
letters each and a ciphertext of about 600 letters, that he believed might
never be solved. George Lasry, Nils Kopal and Arno Wacker solved it in 2013
with a divide-and-conquer hill climb, and they and others have since attacked
single columnar transpositions with keys far longer than any hand solver could
manage.

## 2.8 Playfair by known plaintext

*Level: intermediate.*

Every cipher so far encrypted one letter at a time, so single-letter counts
always leaked something. The **Playfair cipher** encrypts letters in pairs,
which hides single-letter counts and breaks up the commonest trigrams. Charles
Wheatstone, the physicist of the Wheatstone bridge and the electric telegraph,
invented it and demonstrated it in 1854. It is named for his friend Lyon
Playfair, who promoted it to the British government. The British Army used it
as a field cipher in the Boer War and the First World War, and it was still in
use in the Pacific in the Second.

Book 1 doesn't describe it, so here is the whole cipher. The key is a 5 by 5
square holding 25 letters (I and J share a cell): the letters of a keyword,
without repeats, then the rest of the alphabet in order. The plaintext is split
into pairs; a pair of two equal letters is split by inserting X, and an X is
added at the end if needed. Each pair is then encrypted by one of three rules:

- **Rectangle:** if the two letters are in different rows and columns, each is
  replaced by the letter in its own row and the other letter's column. EA, with
  E at the top and A in the second row, becomes YU.
- **Same row:** each letter is replaced by the one to its right, wrapping round
  at the end of the row. UR becomes RA.
- **Same column:** each letter is replaced by the one below it, wrapping round
  at the bottom. VE becomes EU.

With the keyword GETTYSBURG:

```python
SQ = "ABCDEFGHIKLMNOPQRSTUVWXYZ"           # 25 letters: I and J share a cell

def square(keyword):                       # keyword letters first, then the rest
    s = ""
    for x in letters(keyword).replace("J", "I") + SQ:
        if x not in s:
            s += x
    return s

def pairs(p):                              # split into pairs; X between doubled letters
    p, out, i = letters(p).replace("J", "I"), [], 0
    while i < len(p):
        a = p[i]
        b = p[i + 1] if i + 1 < len(p) else "X"
        if a == b:
            out.append(a + "X")
            i += 1
        else:
            out.append(a + b)
            i += 2
    return out

def playfair(digraphs, sq, step=1):        # step=-1 decrypts
    out = ""
    for a, b in digraphs:
        ra, ca = divmod(sq.index(a), 5)
        rb, cb = divmod(sq.index(b), 5)
        if ra == rb:                       # same row: the letter to the right
            out += sq[ra * 5 + (ca + step) % 5] + sq[rb * 5 + (cb + step) % 5]
        elif ca == cb:                     # same column: the letter below
            out += sq[(ra + step) % 5 * 5 + ca] + sq[(rb + step) % 5 * 5 + cb]
        else:                              # rectangle: same row, the other's column
            out += sq[ra * 5 + cb] + sq[rb * 5 + ca]
    return out

KSQ = square("GETTYSBURG")
for r in range(5):
    print(" ".join(KSQ[5 * r:5 * r + 5]))
known = pairs(GETTYSBURG[:200])
cipher = playfair(known, KSQ)
print(" ".join(known[:10]))
print(" ".join(cipher[i:i + 2] for i in range(0, 20, 2)))
```

```
G E T Y S
B U R A C
D F H I K
L M N O P
Q V W X Z
FO UR SC OR EA ND SE VE NY EA
IM RA CK NA YU LH GT EU OT YU
```

Playfair resists the attacks of this chapter better than anything before it.
Its pairs follow a distribution of about 600 possible digraphs instead of 26
letters, so frequency analysis needs far more text. Yet it was never strong.
Joseph Mauborgne, a US Army lieutenant who later became Chief Signal Officer,
published a general solution in 1914, in a pamphlet titled *An Advanced Problem
in Cryptography and Its Solution*. The weaknesses he used are visible in the
three rules. A pair of letters never encrypts to itself, and no letter
encrypts to itself in either position. The rectangle rule works both ways: if
EA becomes YU, then YU becomes EA. If a pair AB becomes CD, the reversed pair
BA becomes DC. And every rule is a statement about rows and columns of a small
square, so each known pair tells the attacker something definite about where
letters sit.

**By hand.** Suppose the attacker knows that the message begins FOUR SCORE AND
SEVEN YEARS AGO, and sees the ciphertext above. Line up the pairs:

| Plain | FO | UR | SC | OR | EA | ND | SE | VE | NY | EA |
|---|---|---|---|---|---|---|---|---|---|---|
| Cipher | IM | RA | CK | NA | YU | LH | GT | EU | OT | YU |

Take three of them and see what each says:

<div class="mars-steps" markdown>

1. **UR becomes RA.** R appears on both sides, so this is not a rectangle,
   whose outputs are always the other two corners. So U, R and A are
   neighbors in that order, either along a row or down a column.
2. **VE becomes EU.** In the same way, V, E and U are neighbors in that
   order, along a row or down a column.
3. **They cross.** Both lines run through U. If both were rows, or both
   columns, they would be the same line, V E U R A, and then E and A would
   share it: EA would encrypt to UV. It encrypts to YU, so one line is a row,
   the other a column, and they cross at U.
4. **EA becomes YU.** E and A are now in different rows and columns, so this
   is a rectangle: U is in A's row and E's column, which says that V E U is
   the column and U R A the row, and Y sits at the fourth corner, in E's row
   and A's column.

</div>

Three pairs fixed six letters' relative positions, as Figure 2.6 shows. Each
further pair either places a new letter next to known ones or confirms what is
known, and with 10 to 20 pairs a patient person rebuilds the whole square.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Left: the GETTYSBURG Playfair square with the rectangle that turns EA into YU, the row step that turns UR into RA, and the column step that turns VE into EU. Right: the piece of the square an attacker rebuilds from those three pairs alone" fill="currentColor" font-size="14">
<text x="130" y="24" text-anchor="middle" font-weight="bold">the key square</text>
<rect x="30" y="40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="50" y="66" text-anchor="middle" font-size="16">G</text>
<rect x="70" y="40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="70" y="40" width="40" height="40" opacity="0.18"/>
<text x="90" y="66" text-anchor="middle" font-size="16">E</text>
<rect x="110" y="40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="130" y="66" text-anchor="middle" font-size="16">T</text>
<rect x="150" y="40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="150" y="40" width="40" height="40" opacity="0.18"/>
<text x="170" y="66" text-anchor="middle" font-size="16">Y</text>
<rect x="190" y="40" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="66" text-anchor="middle" font-size="16">S</text>
<rect x="30" y="80" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="50" y="106" text-anchor="middle" font-size="16">B</text>
<rect x="70" y="80" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="70" y="80" width="40" height="40" opacity="0.18"/>
<text x="90" y="106" text-anchor="middle" font-size="16">U</text>
<rect x="110" y="80" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="110" y="80" width="40" height="40" opacity="0.18"/>
<text x="130" y="106" text-anchor="middle" font-size="16">R</text>
<rect x="150" y="80" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="150" y="80" width="40" height="40" opacity="0.18"/>
<text x="170" y="106" text-anchor="middle" font-size="16">A</text>
<rect x="190" y="80" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="106" text-anchor="middle" font-size="16">C</text>
<rect x="30" y="120" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="50" y="146" text-anchor="middle" font-size="16">D</text>
<rect x="70" y="120" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="90" y="146" text-anchor="middle" font-size="16">F</text>
<rect x="110" y="120" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="130" y="146" text-anchor="middle" font-size="16">H</text>
<rect x="150" y="120" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="170" y="146" text-anchor="middle" font-size="16">I</text>
<rect x="190" y="120" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="146" text-anchor="middle" font-size="16">K</text>
<rect x="30" y="160" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="50" y="186" text-anchor="middle" font-size="16">L</text>
<rect x="70" y="160" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="90" y="186" text-anchor="middle" font-size="16">M</text>
<rect x="110" y="160" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="130" y="186" text-anchor="middle" font-size="16">N</text>
<rect x="150" y="160" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="170" y="186" text-anchor="middle" font-size="16">O</text>
<rect x="190" y="160" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="186" text-anchor="middle" font-size="16">P</text>
<rect x="30" y="200" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="50" y="226" text-anchor="middle" font-size="16">Q</text>
<rect x="70" y="200" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<rect x="70" y="200" width="40" height="40" opacity="0.18"/>
<text x="90" y="226" text-anchor="middle" font-size="16">V</text>
<rect x="110" y="200" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="130" y="226" text-anchor="middle" font-size="16">W</text>
<rect x="150" y="200" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="170" y="226" text-anchor="middle" font-size="16">X</text>
<rect x="190" y="200" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="210" y="226" text-anchor="middle" font-size="16">Z</text>
<rect x="74" y="44" width="112" height="72" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="5 3"/>
<text x="242" y="70">EA → YU: corners</text>
<text x="242" y="110">UR → RA: one step right</text>
<text x="242" y="150">VE → EU: one step down</text>
<text x="242" y="168" font-size="13">(down from V wraps to E)</text>
<text x="540" y="24" text-anchor="middle" font-weight="bold">what three pairs give</text>
<rect x="480" y="60" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="500" y="86" text-anchor="middle" font-size="16">V</text>
<rect x="480" y="100" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="500" y="126" text-anchor="middle" font-size="16">E</text>
<rect x="560" y="100" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="126" text-anchor="middle" font-size="16">Y</text>
<rect x="480" y="140" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="500" y="166" text-anchor="middle" font-size="16">U</text>
<rect x="520" y="140" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="540" y="166" text-anchor="middle" font-size="16">R</text>
<rect x="560" y="140" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="166" text-anchor="middle" font-size="16">A</text>
<text x="540" y="210" text-anchor="middle" font-size="13">rows and columns wrap,</text>
<text x="540" y="228" text-anchor="middle" font-size="13">so the piece can sit anywhere</text>
</svg>
<figcaption>Figure 2.6. Left: the Playfair square for the keyword GETTYSBURG, and the three rules on the pairs of the worked example. Right: what an attacker knows after those three known pairs, a piece of the square with six letters in place.</figcaption>
</figure>

There is one thing the attacker can never learn: where the square "starts".
Moving the top row to the bottom, or the left column to the right, changes
which letters are neighbors of nothing at all, since rows and columns wrap. So
there are 25 squares, the cyclic shifts of each other, that encrypt every pair
identically, and any one of them is as good as the key.

**In code.** Rebuilding the square by hand is a satisfying puzzle; a computer
does it by hill climbing, scoring a candidate square by how many of the known
ciphertext letters it reproduces. The moves are a swap of two letters, a swap
of two rows, or a swap of two columns, and the climb also accepts sideways
moves that keep the score equal, because many squares tie:

```python
def matches(sq):                           # cipher letters this square gets right
    return sum(x == y for x, y in zip(playfair(known, sq), cipher))

def tweak(sq, rng):                        # swap two letters, two rows or two columns
    sq, r = list(sq), rng.random()
    if r < 0.8:
        i, j = rng.sample(range(25), 2)
        sq[i], sq[j] = sq[j], sq[i]
    elif r < 0.9:
        a, b = rng.sample(range(5), 2)
        sq[5 * a:5 * a + 5], sq[5 * b:5 * b + 5] = sq[5 * b:5 * b + 5], sq[5 * a:5 * a + 5]
    else:
        a, b = rng.sample(range(5), 2)
        sq[a::5], sq[b::5] = sq[b::5], sq[a::5]
    return "".join(sq)

def climb_square(rng, patience=5000):
    sq = "".join(rng.sample(SQ, 25))
    best, tries = matches(sq), 0
    while tries < patience and best < len(cipher):
        new = tweak(sq, rng)
        m = matches(new)
        if m >= best:                      # sideways steps allowed: many squares tie
            tries = 0 if m > best else tries + 1
            sq, best = new, m
        else:
            tries += 1
    return best, sq

rng = random.Random(1)
for run in range(6):
    m, sq = climb_square(rng)
    print(run, m, "of", len(cipher), sq)
```

```
0 164 of 164 GETYSBURACDFHIKLMNOPQVWXZ
1 164 of 164 OPLMNXZQVWYSGETACBURIKDFH
2 164 of 164 RACBUHIKDFNOPLMWXZQVTYSGE
3 152 of 164 YSGETACBURXZQVWIKDFHOPLMN
4 154 of 164 IKDFHYSGETACBUROPLMNXZQVW
5 164 of 164 SGETYCBURAKDFHIPLMNOZQVWX
```

The known plaintext is the first 200 characters of the speech, 82 pairs. Run 0
found the key square itself; runs 1, 2 and 5 found three of its cyclic shifts
(run 1's square starts at O, but its rows are the true rows turned round).
Runs 3 and 4 got stuck with the right rows in the wrong order, which breaks
the column rule for a few pairs. Any of the perfect squares reads a new message
sent with the same key:

```python
new_message = playfair(pairs("The world will little note, nor long remember what we say here"), KSQ)
found = climb_square(random.Random(2))[1]                    # one of the shifted squares
print(new_message)
print(playfair([new_message[i:i + 2] for i in range(0, len(new_message), 2)], found, -1))
```

```
RNTVNAQLXHOQOQODYWGNTMNYTMNAMPLTUTVULUTUTNRYVTYCTITUYV
THEWORLDWILXLXLITXTLENOTENORLONGREMEMBERWHATWESAYHEREX
```

The Xs are Playfair's fillers. WILL LITTLE has three Ls in a row and a doubled
T, which the rules turn into the pairs LX LX LI TX TL, and a final X makes the
length even. The reader drops them by eye.

**Without known plaintext.** Ciphertext-only attacks on Playfair use the same
hill climbing as §2.6, scoring the decryption by fitness instead of by matched
letters. They need more text, a few hundred letters with today's solvers, and
much more computing, since the landscape over squares is rougher than over
substitution keys. Before computers, solvers worked from cribs: a likely word,
dragged along the ciphertext and tested against Playfair's rules, often gave
the first foothold, and the square followed as it did above.

!!! note "Life story: the Playfair cipher"
    **Born:** 1854, invented by Charles Wheatstone and promoted by Lyon
    Playfair · **Purpose:** a hand cipher strong enough for the field, hiding
    single-letter counts by encrypting pairs · **Helped:** British Army field
    cipher in the Boer War and the First World War; still used for
    low-level traffic in the Second World War · **Broken:** Joseph Mauborgne's
    published solution of 1914; known plaintext gives the square in minutes;
    ciphertext-only by computer search · **Status:** a puzzle and a teaching
    cipher; the lesson, that a bigger alphabet of pairs is still a substitution,
    holds for any cipher with a small block

A story often told about Playfair concerns John F. Kennedy. When his patrol
boat, PT-109, was sunk in the Solomon Islands in August 1943, the message
reporting that he and his crew were alive is said to have gone through an
Australian coastwatcher's network in Playfair. Whatever the details, the
cipher's use there fits its purpose: protecting a message for the few hours in
which its contents mattered, against an enemy who would need longer than that
to break it.

## 2.9 The Hill cipher by known plaintext

*Level: intermediate.*

The Hill cipher ([book 1, §2.12](../../book/02-Classical-Ciphers.md#212-going-deeper))
encrypts blocks of $n$ letters at once by multiplying them by an $n \times n$
key matrix $K$ mod 26. With $n = 2$ and plaintext pair $(p_1, p_2)$,

$$
\begin{pmatrix} c_1 \\ c_2 \end{pmatrix} = K \begin{pmatrix} p_1 \\ p_2 \end{pmatrix} \bmod 26 .
$$

Lester Hill published it in 1929, and it was the first cipher built from
algebra rather than tables. It hides single-letter counts, and with a large
matrix each ciphertext letter depends on every letter of its block. But it is
**linear**: encrypting two blocks and adding them gives the encryption of their
sum. A linear map is fixed by what it does to a basis, so a few known blocks
fix the whole key. That makes it the cleanest example in this chapter of a
known-plaintext attack.

**The attack in one line.** Put $n$ known plaintext blocks side by side as the
columns of a matrix $P$, and their ciphertext blocks as the columns of $C$.
Then $C = K P$, and if $P$ is invertible mod 26,

$$
K = C P^{-1} \bmod 26 .
$$

The only subtle part is "if $P$ is invertible mod 26". A matrix has an inverse
mod 26 exactly when its determinant has one, which means the determinant must
share no factor with 26: it must be odd and not a multiple of 13. That rules
out 13 of the 26 possible values.

**By hand, with a 2 by 2 key.** The attacker knows the message begins FOUR
SCORE and sees the ciphertext XTOLOAMH. With A = 0, ..., Z = 25, the plaintext
pairs are FO = (5, 14), UR = (20, 17), SC = (18, 2), OR = (14, 17).

<div class="mars-steps" markdown>

1. **Pick two pairs whose matrix is invertible.** FO and UR give
   $P = \begin{pmatrix} 5 & 20 \\ 14 & 17 \end{pmatrix}$, determinant
   $5 \cdot 17 - 20 \cdot 14 = -195 \equiv 13$: a multiple of 13, no inverse.
   FO and SC give determinant $5 \cdot 2 - 18 \cdot 14 = -242 \equiv 18$: even,
   no inverse. FO and OR give
   $P = \begin{pmatrix} 5 & 14 \\ 14 & 17 \end{pmatrix}$, determinant
   $85 - 196 = -111 \equiv 19 \pmod{26}$, which is odd and not 13. Use these.
2. **Invert the determinant.** Find $19^{-1} \bmod 26$ by the extended Euclidean
   algorithm ([book 1, chapter 3](../../book/03-The-Arithmetic-of-Secrets.md)):
   $26 = 19 + 7$, $19 = 2 \cdot 7 + 5$, $7 = 5 + 2$, $5 = 2 \cdot 2 + 1$.
   Working back, $1 = 5 - 2 \cdot 2 = 3 \cdot 5 - 2 \cdot 7 = 3 \cdot 19 - 8 \cdot 7
   = 11 \cdot 19 - 8 \cdot 26$, so $19^{-1} \equiv 11$. Check:
   $19 \cdot 11 = 209 = 8 \cdot 26 + 1$.
3. **Invert the matrix.** For a 2 by 2 matrix,
   $\begin{pmatrix} a & b \\ c & d \end{pmatrix}^{-1} = (ad - bc)^{-1}\begin{pmatrix} d & -b \\ -c & a \end{pmatrix}$.
   So $P^{-1} = 11 \begin{pmatrix} 17 & -14 \\ -14 & 5 \end{pmatrix}
   = \begin{pmatrix} 187 & -154 \\ -154 & 55 \end{pmatrix}
   \equiv \begin{pmatrix} 5 & 2 \\ 2 & 3 \end{pmatrix} \pmod{26}$.
   Check: $P P^{-1} = \begin{pmatrix} 53 & 52 \\ 104 & 79 \end{pmatrix}
   \equiv \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}$.
4. **Multiply.** The ciphertext pairs for FO and OR are XT = (23, 19) and
   MH = (12, 7), so $C = \begin{pmatrix} 23 & 12 \\ 19 & 7 \end{pmatrix}$ and
   $K = C P^{-1} = \begin{pmatrix} 115 + 24 & 46 + 36 \\ 95 + 14 & 38 + 21 \end{pmatrix}
   = \begin{pmatrix} 139 & 82 \\ 109 & 59 \end{pmatrix}
   \equiv \begin{pmatrix} 9 & 4 \\ 5 & 7 \end{pmatrix} \pmod{26}$.
5. **Decrypt.** $\det K = 63 - 20 = 43 \equiv 17$, and $17^{-1} \equiv 23$
   (since $17 \cdot 23 = 391 = 15 \cdot 26 + 1$), so
   $K^{-1} = 23\begin{pmatrix} 7 & -4 \\ -5 & 9 \end{pmatrix}
   \equiv \begin{pmatrix} 5 & 12 \\ 15 & 25 \end{pmatrix}$. Multiplying each
   ciphertext pair by $K^{-1}$ reads the rest of the message.

</div>

Eight known letters gave the whole key, and the attacker never had to look at
a frequency. The check in step 4 is worth doing with the other known pairs:
$K$ must also turn UR into OL and SC into OA, and it does.

**In code, for any block size.** The inverse of an $n \times n$ matrix mod 26
is its adjugate (the transposed matrix of cofactors) times the inverse of its
determinant. Ordinary Gaussian elimination can stall mod 26, where a pivot
like 2 or 13 has no inverse even though the matrix does; the adjugate formula
never stalls, and for the small matrices of a hand cipher it is quick:

```python
def det(M):                                # determinant, by expanding along the top row
    if len(M) == 1:
        return M[0][0]
    return sum((-1) ** j * M[0][j] * det([r[:j] + r[j + 1:] for r in M[1:]])
               for j in range(len(M)))

def inverse(M, m=26):                      # adjugate over determinant, mod m
    n, d = len(M), pow(det(M) % m, -1, m)  # pow fails if det shares a factor with 26
    minor = lambda i, j: [r[:j] + r[j + 1:] for k, r in enumerate(M) if k != i]
    return [[(-1) ** (i + j) * det(minor(j, i)) * d % m for j in range(n)] for i in range(n)]

def matmul(X, Y, m=26):
    return [[sum(X[i][k] * Y[k][j] for k in range(len(Y))) % m for j in range(len(Y[0]))]
            for i in range(len(X))]

def blocks(s, n):                          # text -> matrix whose columns are blocks of n
    v = [A.index(x) for x in s]
    return [v[i::n][:len(v) // n] for i in range(n)]

def hill(s, K):
    n = len(K)
    out = matmul(K, blocks(s, n))
    return "".join(A[out[i][j]] for j in range(len(out[0])) for i in range(n))

K2 = [[9, 4], [5, 7]]                      # the 2x2 example worked by hand
print(hill("FOURSCOR", K2), inverse([[5, 14], [14, 17]]), inverse(K2))
K3 = [[6, 24, 1], [13, 16, 10], [20, 17, 15]]
H = hill(P[:300], K3)
print(H[:30])
```

```
XTOLOAMH [[5, 2], [2, 3]] [[5, 12], [15, 25]]
WVOQJACAFDEGROPWGLPOXKIIYIMOPJ
```

The first line checks the hand work: FOURSCOR encrypts to XTOLOAMH, and the two
inverses are the ones found above. Now a 3 by 3 key and 300 letters of
ciphertext. The attacker needs three known blocks of three letters whose matrix
is invertible:

```python
for start in range(0, 30, 3):              # nine known letters; find a block of three blocks
    Pm, Cm = blocks(P[start:start + 9], 3), blocks(H[start:start + 9], 3)
    if gcd(det(Pm) % 26, 26) == 1:
        break
    print("letters", start, "to", start + 8, "no good: det", det(Pm) % 26)
K = matmul(Cm, inverse(Pm))
print("letters", start, "to", start + 8, "give K =", K)
print(hill(H[:30], inverse(K)))
```

```
letters 0 to 8 no good: det 6
letters 3 to 11 give K = [[6, 24, 1], [13, 16, 10], [20, 17, 15]]
FOURSCOREANDSEVENYEARSAGOOURFA
```

The first nine letters, FOU RSC ORE, give a matrix with determinant 6, which
is even and has no inverse mod 26, so the attacker slides on by one block. The
next nine, RSC ORE AND, work, and the key comes out exactly. In general an
$n \times n$ Hill key falls to about $n^2$ letters of known plaintext, a little
more when some blocks have to be skipped, and the work is a matrix inversion,
which takes a fraction of a second even for $n = 10$. A bigger matrix makes the
key space larger (there are $26^9 \approx 5.4 \times 10^{12}$ 3 by 3 matrices
mod 26, and about $1.6 \times 10^{12}$ of them are invertible) but makes the
attack only slightly longer. Size without non-linearity buys nothing.

That is the lesson Hill's cipher left to modern design. Its matrix step
returned in the MixColumns step of AES ([book 1, chapter 7](../../book/07-AES.md)),
but there it alternates with a non-linear S-box, so the linear equations an
attacker would write down are never true for the whole cipher.

!!! note "Life story: the known-plaintext attack on Hill's cipher"
    **Born:** 1929, with the cipher itself: Lester S. Hill, at Hunter College in
    New York, pointed out in "Cryptography in an Algebraic Alphabet" (*American
    Mathematical Monthly*) that the key is a linear map · **Purpose:** recover
    the key matrix from $n$ known blocks by solving $C = KP$ mod 26 ·
    **Helped:** kept the Hill cipher out of serious use; it became the textbook
    example of why linearity is fatal · **Status:** current as a principle:
    every modern cipher includes a non-linear step, and the algebraic attacks
    of Chapter 7 are this
    attack's descendants, trying to solve the much harder non-linear equations

## 2.10 Unicity distance

*Level: expert.*

Every attack in this chapter needed some minimum amount of text. Al-Kindi's
method failed on a few words; Friedman's tests went wrong with 14 letters a
column; the hill climber of §2.6 needs a few hundred letters. Are those limits
of the methods, or of the problem? Is there a length below which *no* method,
however clever, can be sure of the answer?

Claude Shannon answered this in 1949, in "Communication Theory of Secrecy
Systems", the paper that turned cryptography into mathematics. He asked: given
$n$ letters of ciphertext, how many keys decrypt it to something that could be
a real message? If more than one, the attacker can't decide between them, no
matter how much computing power is spent. The length at which the expected
number of such **spurious keys** falls to about zero he called the **unicity
distance**.

**The argument.** Let the key have $H(K)$ bits of entropy; for a key chosen
uniformly from $|K|$ keys, $H(K) = \log_2 |K|$. A letter could carry
$R = \log_2 26 \approx 4.70$ bits, but English carries only $r$ bits per letter,
because it is predictable: after Q comes U, after TH probably E. The difference
$D = R - r$ is the **redundancy** of the language, the bits per letter that
the language wastes and the attacker can use. Of the $26^n = 2^{nR}$ strings
of $n$ letters, only about $2^{nr}$ are meaningful English, a fraction
$2^{-nD}$.

Now treat the cipher as random: decrypting the ciphertext under a wrong key
gives a string that is, as far as the language is concerned, random, so it
is meaningful with probability about $2^{-nD}$. With $2^{H(K)} - 1$ wrong keys,
the expected number of spurious keys is

$$
s_n \approx \left(2^{H(K)} - 1\right) 2^{-nD} \approx 2^{H(K) - nD}.
$$

This falls below 1 when $n > H(K)/D$, so

$$
U = \frac{H(K)}{D}.
$$

Below $U$ letters, many keys give sensible text, and the true message is one of
many. Above it, the true key is very likely the only one that gives sense,
and the problem has a unique answer, in principle.

**The redundancy of English.** Everything depends on $D$, so on $r$. Shannon
measured it himself in 1951, in "Prediction and Entropy of Printed English",
by asking people to guess texts letter by letter: with long contexts, $r$ fell
to between 0.6 and 1.3 bits per letter. The usual working value in textbooks
is $r \approx 1.5$, giving $D \approx 3.2$ bits per letter, a redundancy of
about 68%. With that:

| Cipher | Keys | $H(K)$, bits | $U = H(K)/3.2$, letters |
|---|---|---|---|
| Shift | 26 | 4.7 | 1.5 |
| Affine | 312 | 8.3 | 2.6 |
| Hill, 2 by 2 | 157,248 invertible matrices | 17.3 | 5.4 |
| Columnar, 11 columns | $11!$ | 25.3 | 7.9 |
| Vigenère, 7 letters | $26^7$ | 32.9 | 10.3 |
| Vigenère, 20 letters | $26^{20}$ | 94.0 | 29.4 |
| Playfair | $25!/25$ squares (cyclic shifts are equal) | 79.0 | 24.7 |
| Simple substitution | $26!$ | 88.4 | 27.6 |
| One-time pad | $26^n$ for $n$ letters | $4.70\,n$ | never |

A Vigenère key costs 1.47 letters of unicity per key letter, since
$\log_2 26 / 3.2 \approx 1.47$. A simple substitution, with its $2^{88}$ keys,
is determined by fewer than 30 letters, which is shorter than this paragraph's
first sentence. And the one-time pad is the exception that proves the rule:
its key grows as fast as the message, $H(K) = nR$, so $H(K) - nD = nr$ grows
with $n$, and there are always about $2^{nr}$ keys giving sensible text, every
sensible message of that length. That is Shannon's proof of its perfect
secrecy in other words ([book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)).

The formula is an estimate, rough at small $n$: it says a shift cipher is
determined by 1.5 letters, but two letters of a shift cipher can easily have
several sensible readings (a two-letter ciphertext has many shifts that give
real two-letter words). The model of a random cipher fits big key spaces best.
Taking $D = 3.5$ instead of 3.2, which some books do, gives 25 letters for
substitution instead of 28. The order of magnitude is what matters.

**Theory against practice.** Unicity distance is a lower bound on what any
attack needs; real attacks need more, because they don't have a perfect model
of English. The experiment below runs the hill climber of §2.6 on the first
$n$ letters of the substitution ciphertext, 20 restarts each, and compares the
best score found with the true key's score:

```python
rng = random.Random(1)
for n in (25, 50, 100, 200, 400):
    f, key = max(climb(C[:n], rng) for _ in range(20))
    right = sum(x == y for x, y in zip(decrypt(C[:n], key), P))
    print("%3d letters: best %5d, true key %5d, %3d right  %s"
          % (n, f, fitness(P[:n]), right, decrypt(C[:n], key)[:25]))
```

```
 25 letters: best   -69, true key   -82,   0 right  PLEINGLIATCONARACHATINTSL
 50 letters: best  -158, true key  -180,   3 right  FTHERYTEILSCRIGISUILERLAT
100 letters: best  -360, true key  -339,  25 right  REXPLUEPIONSLIGINDIOPLOCE
200 letters: best  -660, true key  -667, 192 right  MOURSCOREANDSEVENBEARSAGO
400 letters: best -1347, true key -1352, 385 right  FOURSCOREANDSEMENYEARSAGO
```

Read the columns carefully, because they show three different things.

- At **25 and 50 letters** the climber found keys that score *higher* than the
  true key, and their decryptions are nonsense. These are spurious keys, but
  spurious for our score, not for English: PLEINGLIATCONARACHATINTSL is not
  English, but it is full of trigrams the score likes. No amount of searching
  can fix this; the score itself prefers the wrong answer.
- At **100 letters** the true key scores higher than anything the climber
  found. Here the score is good enough, and the search failed: 20 restarts
  weren't enough to reach the top. A better search fixes this (§2.12).
- At **200 and 400 letters** the climber found the plaintext, apart from a few
  rare letters (B and Y, F and M swapped) that occur too seldom to be pinned
  down, and its key scores slightly better than the true one for the same
  reason.

Why does our score need so much more than 28 letters? Because a trigram model
sees only part of English's redundancy. Shannon's 1951 paper also measured how
much a model that knows the previous $N - 1$ letters captures: about 4.14 bits
per letter for single letters, 3.56 for pairs, 3.3 for trigrams. So a trigram
score works with $D \approx 4.70 - 3.3 = 1.4$ bits per letter, and its own
unicity distance for a substitution is about $88.4 / 1.4 \approx 63$ letters,
which matches the experiment: 50 letters are not enough, 100 are, given a good
enough search. (On Python's help text, the same counts come out at 4.15, 3.54
and 2.83 bits, the last one lower because a model measured on its own training
text always looks better than it is.) A reader who knows English, with its
grammar and its meaning, works with a $D$ near 3.2, and can solve a
substitution cryptogram of 40 or 50 letters, which newspaper puzzle solvers do
every day.

**What the number is for.** Unicity distance tells a designer how much
ciphertext an attacker can't use. Below it, even unlimited computing leaves
the message ambiguous. For a classical cipher that line is tens of letters,
and every real message is far longer, so classical ciphers are breakable in
principle as well as in practice. For a modern cipher the line is also short:
a 128-bit key and 8 bits per byte of ASCII text with $D \approx 6.5$ bits per
byte of redundancy give $U \approx 20$ bytes. Modern ciphers are therefore not
protected by unicity at all, but by the cost of finding the unique key. Shannon
named this the difference between **unconditional** (information-theoretic)
security and **computational** security, and every cipher in use today
depends on the second.

!!! note "Life story: unicity distance"
    **Born:** 1949, Claude Shannon's "Communication Theory of Secrecy Systems"
    (*Bell System Technical Journal*), written up from his wartime report of
    1945 · **Purpose:** measure how much ciphertext determines the key, from
    the key's entropy and the redundancy of the language · **Helped:** explained
    why every classical cipher fell and why the one-time pad cannot; gave
    designers the idea of compressing plaintext before encryption to lower its
    redundancy · **Status:** a standard concept in every textbook; for modern
    ciphers, where the unicity distance is a few blocks, it says that security
    must be computational

## 2.11 In the real world

*Level: intermediate.*

Classical ciphers were the real thing for most of history, and their breaks
decided real events. In the American Civil War the Confederacy used the
Vigenère cipher for its high-level messages, with a brass cipher disk and a
handful of keys, among them MANCHESTER BLUFF, COMPLETE VICTORY and, near the
end, COME RETRIBUTION. Union telegraph clerks in Washington read many of them.
Kasiski's book, published in German in the middle of the war, played no part:
a few keys used for years, and words left unencrypted in the middle of
messages, did the job.

The hand ciphers in this chapter still turn up in four places.

**Old archives.** Libraries and archives hold thousands of encrypted letters and
diaries. In 2011 Kevin Knight of the University of Southern California, with
Beáta Megyesi and Christiane Schaefer of Uppsala University, read the *Copiale
cipher*, a 105-page manuscript in invented symbols and Roman letters from the
eighteenth century. They found by statistics that the unaccented Roman letters
were nulls, that the rest was a homophonic substitution of German, and that
the text described the rituals of a German secret society, the Oculists. In 2023
George Lasry, Norbert Biermann and Satoshi Tomokiyo read 57 letters of Mary,
Queen of Scots, written in captivity between 1578 and 1584 and filed in the
French national library among Italian documents. Both breaks used the methods
of this chapter: counting, a probable language, and hill climbing over the
key.

**Unsolved and famous ciphers.** In November 1969 a murderer who called
himself the Zodiac mailed a 340-symbol cipher to the *San Francisco Chronicle*.
It resisted fifty years of attempts. In December 2020 David Oranchak, a
software developer in the United States, Sam Blake, a mathematician in
Australia, and Jarl Van Eycke, a programmer in Belgium, announced the
solution, and the FBI confirmed it. The cipher was a homophonic substitution
combined with a transposition that read the symbols along diagonals, and the
key step was running Van Eycke's hill-climbing solver, AZdecrypt, over a
huge number of candidate transpositions, each followed by a climb over the
homophonic key.

**Bad modern code.** A surprising amount of software has reinvented classical
ciphers. "Encryption" that XORs data with a short repeating key is a Vigenère
cipher on bytes, and it falls to exactly the two steps of §2.4 and §2.5: find
the key length by the index of coincidence or by repeats, then find each key
byte by frequency, with byte frequencies of the likely file type in place of
English letters. Malware analysts break the configuration files of malicious
software this way routinely, and it is an early exercise in most
cryptanalysis courses. A homemade substitution or transposition, however many
times it is applied, is no better.

**Puzzles and teaching.** Newspaper cryptograms are simple substitutions with
word breaks, and the probable-word method of §2.3 is how solvers do them.
Capture-the-flag contests, puzzle hunts and geocaches use Vigenère, Playfair
and columnar transposition. They are a good place to learn exactly what this
chapter teaches: that an attack measures a structure the cipher leaves, and
that the key space is irrelevant once the structure is found.

!!! note "Life story: the Zodiac 340 solution"
    **Born:** cipher mailed in November 1969; solved by David Oranchak, Sam
    Blake and Jarl Van Eycke, announced in December 2020 · **Purpose:** read a
    340-symbol homophonic cipher that had resisted amateurs and professionals
    for half a century · **Helped:** showed that hill climbing and annealing,
    run over a large family of transpositions, can untangle a cipher mixing
    both of the basic moves · **Status:** solved and confirmed by the FBI; the
    message named no one, and the case remains open

## 2.12 Going deeper

*Level: expert.*

**Simulated annealing.** The climber of §2.6 never steps downhill, which is
why it got stuck in run 1's cycle. **Simulated annealing**, borrowed from the
physics of cooling metals, sometimes accepts a worse key: a move that lowers
the fitness by $\Delta$ is accepted with probability $e^{-\Delta/T}$, where
the "temperature" $T$ starts high and falls slowly. Early on, the search
wanders over the whole landscape; as $T$ falls it settles on the highest peak
it can find. On the 100- and 150-letter ciphertexts where plain climbing
struggled:

```python
def anneal(c, rng, t=2.0, cooling=0.9998, steps=30000):
    key = list(A)
    rng.shuffle(key)
    f = fitness(decrypt(c, "".join(key)))
    best = (f, "".join(key))
    for _ in range(steps):
        i, j = rng.sample(range(26), 2)
        key[i], key[j] = key[j], key[i]
        g = fitness(decrypt(c, "".join(key)))
        if g > f or rng.random() < math.exp((g - f) / t):
            f = g                                    # accept, even a step down
            best = max(best, (f, "".join(key)))
        else:
            key[i], key[j] = key[j], key[i]
        t *= cooling                                 # cool slowly
    return best

rng = random.Random(1)
for n in (100, 150):
    f, key = max(anneal(C[:n], rng) for _ in range(4))
    right = sum(x == y for x, y in zip(decrypt(C[:n], key), P))
    print(n, round(f), round(fitness(P[:n])), right, decrypt(C[:n], key)[:30])
```

```
100 -329 -339 86 MOPRSCOREANDSEVENBEARSALOOPRMA
150 -490 -497 142 MOURSCOREANDSEVENBEARSAGOOURMA
```

With 100 letters, annealing found a key that scores better than the true one
($-329$ against $-339$) with 86 letters right, and with 150 letters a key that
reads MOURSCOREANDSEVENBEARS, 142 right. Both mistakes are rare letters (B and
Y, F and M, P and U, G and L), and both decryptions are better English by the
trigram score than the truth is. So annealing pushes the search all the way to
the limit of the score, and from there only a better score, quadgrams from
more text, or a human reader, can go further. W. S. Forsyth and Reihaneh
Safavi-Naini applied annealing to substitution ciphers in 1993. The choice of
starting temperature and cooling rate matters (both were tuned by trial here),
and solvers like AZdecrypt use tuned schedules and many restarts.

**What the score really is.** The fitness is a log-likelihood, and hill climbing
is a search for the **maximum-likelihood key**: the key under which the
observed ciphertext is most probable, given a model of the plaintext. A
proper Markov model would use conditional probabilities,
$\log \Pr(t_{i+2} \mid t_i t_{i+1})$, and differs from the sum of joint
trigram log-probabilities used here by a sum of bigram terms; both work in
practice. A Bayesian adds a prior over keys (for instance, that a key is likely
a keyword-mixed alphabet) and searches for the most probable key given the
ciphertext. In this view the unicity distance is the length at which the
likelihood of the true key separates from all others, and the limits seen in
§2.10 are the limits of the model.

**Homophonic ciphers.** A homophonic substitution gives a common letter
several symbols (E might have six), so that every symbol occurs about equally
often and al-Kindi's counts flatten out. The cipher still leaks pairs and
contexts: the symbols of E all behave like E in their neighbors. Hill climbing
attacks it by assigning each cipher symbol to a plaintext letter and moving one
symbol at a time; a cipher with 60 symbols has $26^{60}$ possible assignments,
but the landscape is smooth. This is how the Zodiac 340, the Copiale cipher
and Mary Stuart's letters were read. A homophonic cipher's unicity distance is
larger, because its key holds more entropy, but still only a few hundred
symbols.

**Hill, ciphertext only.** The known-plaintext attack of §2.9 needs cribs. In
2007 Craig Bauer and Katherine Millward showed how to break a Hill cipher from
ciphertext alone, row by row. Each row of the decryption matrix $K^{-1}$
produces one letter of every plaintext block (the first row gives the first
letter of each block, and so on), so each row can be found separately by trying
all $26^n$ candidates and scoring the letters it produces by their frequency
distribution. The cost is $n \cdot 26^n$ trials instead of $26^{n^2}$:
for $n = 3$, about 53,000 instead of $5 \times 10^{12}$. It is the same
divide-and-conquer that broke Vigenère, applied to a linear cipher: whenever
part of the key decides part of the output on its own, that part can be
attacked on its own. The differential and linear attacks of Part II find such
parts inside modern ciphers.

**Running keys.** If the Vigenère key is as long as the message but is itself
English text, say a page of a novel, there is no period to find, and Kasiski
and Friedman's column test both fail. But the key has only about 1.3 to 1.5
bits of entropy per letter, so the plaintext and key together carry about 3
bits per letter, less than the 4.7 bits a ciphertext letter can hold. The
redundancy left over, about 1.7 bits per letter, means the cipher is breakable
in principle, and Friedman broke running-key ciphers in practice, starting
from probable words in either text. A running key made of truly random letters
is a one-time pad, and then nothing is left.

**Equivocation.** Shannon's precise tool is the **key equivocation**
$H(K \mid C_1 \ldots C_n)$, the uncertainty about the key that remains after
$n$ ciphertext letters. It starts at $H(K)$ and falls by about $D$ bits per
letter until it reaches zero near the unicity distance, where the curve flattens
out. A more careful version of the argument of §2.10 (it is in Stinson's
textbook) shows that for *any* cipher, random or not, the expected number of
spurious keys after $n$ letters is at least about $2^{H(K) - nD} - 1$. So no
cipher can do better than the unicity estimate for the attacker, and the
estimate is fair to use even for ciphers that are far from random. For modern
ciphers the equivocation hits zero after a block or
two, and every bit of security comes from computational cost, the subject of
[Chapter 4](04-Brute-Force-Birthdays-and-Trade-offs.md).

## Check yourself

??? question "1. A ciphertext of 800 letters has an index of coincidence of 0.067 and its commonest letter is E. Which cipher was most likely used, and why?"

    A transposition. The IC is English's, so a single alphabet was used, and the
    commonest letter is still E, so the letters themselves weren't changed;
    only their order was. A simple substitution would keep the IC but move E's
    count to another letter.

??? question "2. In a substitution ciphertext, the commonest triple is KQW and the commonest single letter is W. What is your first guess for K and Q, and why?"

    K is T and Q is H, since W is probably E and the commonest English trigram
    is THE. Check it against the triples KQZ and QZK, which should then read
    THA and HAT if Z is A.

??? question "3. Kasiski's examination of a Vigenère ciphertext finds repeats at distances 60, 84, 36 and 50. What key length do you guess?"

    The gcd of 60, 84 and 36 is 12, and 50 is not a multiple of 12, 6, 4 or 3.
    Treat 50 as an accident: the key length is probably 12, or a divisor of it
    (6, 4, 3 or 2). Test each with the column IC; the right one is the
    smallest that gives English values in its columns.

??? question "4. Compute the index of coincidence of the word MISSISSIPPI."

    11 letters: S four times, I four times, P twice, M once. The top is
    $4 \cdot 3 + 4 \cdot 3 + 2 \cdot 1 = 26$, the bottom $11 \cdot 10 = 110$, so
    $\mathrm{IC} = 26/110 \approx 0.236$.

??? question "5. Why does the column test of §2.5 also score high at twice the true key length?"

    With $2L$ columns, each column takes every $2L$-th letter, which is a subset
    of one of the $L$ true columns, so it is still encrypted with a single
    shift and has English's IC. Any multiple of $L$ works for the same reason.
    The true length is the smallest one that scores high.

??? question "6. A hill climber on a substitution finds a decryption that scores better than the true plaintext. Is the climber broken?"

    Not necessarily. If the ciphertext is short (below the score's own unicity
    distance) or the differences are in rare letters, the score genuinely
    prefers a wrong key, and no search can fix that; only a better score or a
    human reader can. If the ciphertext is long and the decryption is
    nonsense, the score model is too weak for the text.

??? question "7. The Playfair pair HE encrypts to RU. What do you know about the pair EH, and about RU?"

    EH encrypts to UR, by the reversal property of all three rules. If H and E
    are in a rectangle, RU decrypts to HE and also encrypts to HE, since the
    rectangle rule is its own inverse; if they are in a row or column, RU
    encrypts to something else.

??? question "8. A Hill cipher with a 2 by 2 key has known plaintext pairs whose matrix $P$ has determinant 13. What goes wrong, and what do you do?"

    13 has no inverse mod 26, so $P$ has none and $K = CP^{-1}$ can't be
    computed. Choose another pair of known blocks whose matrix has a
    determinant that is odd and not 13. Any two blocks whose matrix is
    invertible will do, and with a few more known letters there is always a
    choice.

??? question "9. Using $D = 3.2$ bits per letter, what is the unicity distance of a Vigenère cipher with a 12-letter key, and why do real attacks need more?"

    $H(K) = 12 \log_2 26 \approx 56.4$ bits, so $U \approx 56.4/3.2 \approx 17.6$
    letters. Real attacks split the ciphertext into 12 columns and need 15 to
    20 letters in each to find the shifts by frequency, about 200 letters in
    all, because they use only single-letter statistics within each column, a
    small part of English's redundancy.

??? question "10. Why does compressing a message before encrypting it with a classical cipher make the cipher harder to break?"

    Compression removes redundancy, so $D$ falls and the unicity distance
    $H(K)/D$ grows. Perfect compression would make $D$ zero and leave every key
    equally plausible. In practice it also removes the letter statistics that
    frequency analysis, Friedman's tests and fitness scores rely on. (Modern
    systems don't rely on this; a modern cipher must be secure even on highly
    redundant input.)

## What you learned

- A classical cipher is broken by measuring what it lets through: letter
  counts under substitution, repeats and column statistics under Vigenère,
  pairs and trigrams under transposition, linear equations under Hill. The size
  of the key space never matters once such a structure is found.
- Al-Kindi's method ranks the cipher's symbols against a sample of the
  language, then corrects with letter combinations and probable words; on a
  1,149-letter text, ranking alone got half the letters right.
- Kasiski's repeats and Friedman's index of coincidence find a Vigenère key's
  length; each column is then a shift cipher, found by matching its counts
  against English. The cost is $L \times 26$ trials, not $26^L$.
- Hill climbing with a trigram score from Python's own help text breaks a
  substitution and a columnar transposition automatically, with restarts to
  escape local maxima; simulated annealing goes further on short texts.
- A few known pairs rebuild a Playfair square, and $n$ known blocks give a Hill
  key as $K = CP^{-1}$ mod 26, once the plaintext matrix is invertible.
- Unicity distance, $U = H(K)/D$, is the ciphertext length at which the key
  becomes unique: 1.5 letters for a shift, 28 for a substitution, 1.5 per key
  letter for Vigenère, never for a one-time pad. Real attacks need several
  times more, because their models of English are weaker than English.

**Next:** [Chapter 3](03-Machines-and-the-War.md), where the same ideas,
counting, repeats, cribs and search, meet the rotor machines of the Second World
War.

## Further reading

- Mohammed Mrayati, Yahya Meer Alam and M. Hassan at-Tayyan (eds.),
  *Al-Kindi's Treatise on Cryptanalysis*, Series on Arabic Origins of
  Cryptology, vol. 1 (KFCRIS and KACST, Riyadh, 2003): the Arabic text with an
  English translation.
- Ibrahim A. Al-Kadi, "The Origins of Cryptology: The Arab Contributions",
  *Cryptologia* 16 (1992).
- Friedrich W. Kasiski, *Die Geheimschriften und die Dechiffrir-Kunst*
  (Mittler, Berlin, 1863).
- William F. Friedman, *The Index of Coincidence and Its Applications in
  Cryptography*, Riverbank Publication No. 22 (1922).
- Joseph O. Mauborgne, *An Advanced Problem in Cryptography and Its Solution*
  (Fort Leavenworth, 1914).
- Lester S. Hill, "Cryptography in an Algebraic Alphabet", *American
  Mathematical Monthly* 36 (1929).
- Claude E. Shannon, "Communication Theory of Secrecy Systems", *Bell System
  Technical Journal* 28 (1949), and "Prediction and Entropy of Printed
  English", *Bell System Technical Journal* 30 (1951).
- Douglas R. Stinson and Maura B. Paterson, *Cryptography: Theory and
  Practice*, fourth edition (CRC Press, 2018): unicity distance and spurious
  keys, chapter 2.
- Henry Beker and Fred Piper, *Cipher Systems: The Protection of
  Communications* (Northwood, 1982): the letter frequencies of §2.2.
- Abraham Sinkov, *Elementary Cryptanalysis: A Mathematical Approach*
  (Mathematical Association of America, 1966; second edition revised by Todd
  Feil, 2009): Kasiski, Friedman and Hill by hand.
- W. S. Forsyth and R. Safavi-Naini, "Automated Cryptanalysis of Substitution
  Ciphers", *Cryptologia* 17 (1993); Thomas Jakobsen, "A Fast Method for
  Cryptanalysis of Substitution Ciphers", *Cryptologia* 19 (1995).
- Craig Bauer and Katherine Millward, "Cracking Matrix Encryption Row by Row",
  *Cryptologia* 31 (2007).
- George Lasry, Nils Kopal and Arno Wacker, "Solving the Double Transposition
  Challenge with a Divide-and-Conquer Approach", *Cryptologia* 38 (2014), and
  "Cryptanalysis of Columnar Transposition Cipher with Long Keys",
  *Cryptologia* 40 (2016).
- Kevin Knight, Beáta Megyesi and Christiane Schaefer, "The Copiale Cipher",
  Proceedings of the 4th Workshop on Building and Using Comparable Corpora
  (ACL, 2011).
- George Lasry, Norbert Biermann and Satoshi Tomokiyo, "Deciphering Mary
  Stuart's Lost Letters from 1578-1584", *Cryptologia* 47 (2023).
- David Kahn, *The Codebreakers* (Macmillan, 1967; revised 1996): the history
  of every cipher in this chapter, from al-Kindi to Friedman.
- Craig P. Bauer, *Secret History: The Story of Cryptology* (CRC Press, 2013;
  second edition 2021): classical cryptanalysis with worked examples.
