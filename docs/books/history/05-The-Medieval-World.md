# 5. The Medieval World

*For about nine hundred years, from the fall of Rome in the West to the Italian courts of the 1400s, almost nobody in
Europe wrote about hiding messages from an enemy, and almost nobody wrote about reading them. What survives is small and
strange: a nun who hides her name in her own book, a stone in Sweden that is partly in cipher, an abbess with a private
alphabet and a private language, Irish scholars who list a hundred ways to write ogham, a friar who thinks a secret
should be written so the crowd cannot read it, and one book that no one has read in six hundred years. This chapter tells
those cases, says what each one proves and does not prove, and has you decode a scribe's vowels, a twig rune and an ogham
number by hand and then by program.*

!!! abstract "In this chapter"
    **You will learn:**

    - why medieval Europe, with so much writing done by so few people, produced so little cryptography, and how we know;
    - the three vowel tricks of the monastic scribes, who used them, and why they were a signature more than a secret;
    - how cipher runes and secret ogham work, as arithmetic you can run, and what they were probably for;
    - who Hygeburg, Hildegard of Bingen, Roger Bacon and Cynewulf were, and what each hid and from whom;
    - what the Voynich manuscript is, what is known about it, and what a cryptanalyst can say about it without reading it;
    - how to tell a documented case from a legend, with the Templar cipher as the test.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) of this book (code, cipher and steganography told apart),
    and for the last two sections [Chapter 2 of the cryptography book](../../book/02-Classical-Ciphers.md) (substitution
    and why counting letters breaks it). No other background.

    **Levels:** §5.1, §5.2, §5.4 and §5.6 are for beginners, §5.3, §5.5, §5.7, §5.8 and §5.10 are intermediate, §5.11 is expert.

## 5.1 The problem

*Level: beginner.*

Suppose you are a bishop in the year 750 and you need to tell another bishop, three weeks' ride away, that the king's
brother is ill and that you will not support his claim. There is no post. A servant you trust will carry the letter. The
road is long, the servant sleeps in strange houses, and anyone who wants to know what you said has several chances.

The medieval answers to that problem were not ciphers. They were three cheaper things. The first was the **seal**: the
letter was folded and closed with a lump of wax pressed with your ring, so that opening it left a mark. English royal
chancery later kept the distinction in its records. *Letters patent* were open and meant to be shown to everyone;
*letters close* were sealed shut and meant for one reader, and the Close Rolls, which begin in the early 1200s, are the
chancery's copies of the second kind. The second was **the messenger's mouth**: the letter said little, often only
"believe the bearer," and the servant carried the real message in his head. The third was **the reader's rarity**. A
letter in Latin could be read by perhaps one person in a hundred, and in some places by far fewer. Most of the people who
might intercept a letter could not have read it if they had held it open in front of them.

That third protection is easy to miss, and it explains much of what follows. Writing in the early Middle Ages was already
a kind of secret. It was done in a language, Latin, that few people spoke at home, in a script that took years to learn,
by men and women who mostly lived inside monasteries and cathedral schools, on parchment made from animal skins that a
monastery had to raise and flay. The scribes, who copied the Bible, the lives of saints and the works of Augustine, Jerome
and Gregory, were a small group working for a small audience. When secrecy mattered, the threat was a courier's tongue or
a broken seal. It was not an enemy codebreaker, because no such person existed in the West.

So where did secret writing appear? Not in the letters of state, as far as anyone has found, and not for several
centuries. It appeared in the margins and at the ends of books, in the hands of the scribes themselves, and it was
usually a signature, a joke or a puzzle. A scribe finishes a long copy and writes, in a code that his fellow monks can
read at a glance: *Deo gratias*, thanks be to God. A nun finishes a saint's life and hides her own name in a line of odd
letters. A poet spells his name out in runes in the middle of a poem. An abbess invents an alphabet for what she calls
her unknown language and uses it to head a letter. These people had a problem, but it was not the problem of a general or
an ambassador. It was the problem of wanting to be present in a book without being loud about it, of wanting an
in-group's mark on a page, or of wanting to say something to God and to a few friends that was not for everyone.

That is a different problem from the one the later chapters of this book are about, and the techniques are different in a
matching way. The scribes' tricks leave the consonants alone and move only the vowels, or they replace letters by other
letters in a fixed order that any trained reader can learn, or they use an alphabet that has a public chart in a school
text. None of them survives a determined attack for a minute. They were never meant to. Their authors were not afraid of
an attacker; they were pleased with a trick.

!!! note "How we know, and how little"
    The record for this period is thin, and the thinness is part of the story. Three kinds of source give us nearly
    everything. **The manuscripts themselves**, where a cipher passage sits in a copy of a longer text: the nun's
    line at Munich, a blessing in an English copy of Aldhelm, the end of a copy of Augustine at Cambridge. **Catalogs
    and surveys** by scholars who read through thousands of manuscripts looking for odd writing: Bernhard Bischoff's
    survey of the non-diplomatic secret scripts of the Middle Ages (1954) is the standard one, and Benjamin Saltzman's
    2018 article in the journal *Speculum* reopens the whole question of what the scribes were doing. **Later
    treatises**, such as the Irish ogham tract copied in 1390, which list methods but do not say who used them. David
    Kahn's *The Codebreakers* gives this whole period only a few pages, and he is right to: there is not much to say. I
    count about a dozen cases in this chapter, and a scholar who spent a career in the manuscript libraries could add some
    more, but not thousands. Where a case rests on one document or on a late retelling, I say so on the page.

Figure 5.1 puts the cases of this chapter on one line. The accent entries (bold) are the cases outside Europe or outside
the Latin tradition that the next sections use for contrast. Everything else is a European case, and most of the entries
are from the places we would expect: monasteries, an Irish scholarly tradition, an English poet, a German abbess.

<figure class="mars-fig">
<svg viewBox="0 0 640 410" width="640" role="img" aria-label="Timeline of the cases in this chapter, from a nun's vowel cipher about 780 to the Voynich vellum of 1404 to 1438" fill="currentColor" font-size="14">
<line x1="112" y1="8" x2="112" y2="402" stroke="currentColor" stroke-width="1.6"/>
<text x="98" y="29" font-size="14" text-anchor="end" font-weight="bold">c. 780</text>
<circle cx="112" cy="24" r="3.5" fill="currentColor"/>
<text x="128" y="29" font-size="14" text-anchor="start">Hygeburg hides her name in a vowel cipher (Heidenheim)</text>
<text x="98" y="65" font-size="14" text-anchor="end" font-weight="bold">800s</text>
<circle cx="112" cy="60" r="3.5" fill="currentColor"/>
<text x="128" y="65" font-size="14" text-anchor="start">Rök stone, Sweden: runes written in runes</text>
<text x="98" y="101" font-size="14" text-anchor="end" font-weight="bold">900s-1000s</text>
<circle cx="112" cy="96" r="3.5" fill="currentColor"/>
<text x="128" y="101" font-size="14" text-anchor="start">English scribes: dots or the next consonant for vowels</text>
<text x="98" y="137" font-size="14" text-anchor="end" font-weight="bold">late 900s</text>
<circle cx="112" cy="132" r="3.5" fill="currentColor"/>
<text x="128" y="137" font-size="14" text-anchor="start">Cynewulf's rune signatures copied into Exeter and Vercelli books</text>
<text x="98" y="173" font-size="14" text-anchor="end" font-weight="bold">1040-1044</text>
<circle cx="112" cy="168" r="3.5" fill="currentColor" opacity="0.5"/>
<text x="128" y="173" font-size="14" text-anchor="start" font-weight="bold" opacity="0.7">China: Wujing Zongyao poem code (for contrast)</text>
<text x="98" y="209" font-size="14" text-anchor="end" font-weight="bold">1153-1154</text>
<circle cx="112" cy="204" r="3.5" fill="currentColor"/>
<text x="128" y="209" font-size="14" text-anchor="start">Hildegard writes in her unknown letters</text>
<text x="98" y="245" font-size="14" text-anchor="end" font-weight="bold">1200s</text>
<circle cx="112" cy="240" r="3.5" fill="currentColor"/>
<text x="128" y="245" font-size="14" text-anchor="start">Roger Bacon lists seven ways to hide a secret in writing</text>
<text x="98" y="281" font-size="14" text-anchor="end" font-weight="bold">c. 1390</text>
<circle cx="112" cy="276" r="3.5" fill="currentColor"/>
<text x="128" y="281" font-size="14" text-anchor="start">Book of Ballymote copies the Irish list of secret ogham</text>
<text x="98" y="317" font-size="14" text-anchor="end" font-weight="bold">c. 1392</text>
<circle cx="112" cy="312" r="3.5" fill="currentColor"/>
<text x="128" y="317" font-size="14" text-anchor="start">Equatorie of the Planetis: a few words in a symbol cipher</text>
<text x="98" y="353" font-size="14" text-anchor="end" font-weight="bold">1404-1438</text>
<circle cx="112" cy="348" r="3.5" fill="currentColor"/>
<text x="128" y="353" font-size="14" text-anchor="start">Vellum of the Voynich manuscript made (radiocarbon)</text>
<text x="98" y="389" font-size="14" text-anchor="end" font-weight="bold">1412</text>
<circle cx="112" cy="384" r="3.5" fill="currentColor" opacity="0.5"/>
<text x="128" y="389" font-size="14" text-anchor="start" font-weight="bold" opacity="0.7">Cairo: al-Qalqashandi's encyclopedia (for contrast)</text>
</svg>
<figcaption>Figure 5.1. The medieval cases of this chapter on one line. Bold, faded entries are outside Europe and are here for contrast; the Cairo and Chinese traditions are told in Chapters 4 and 8.</figcaption>
</figure>

## 5.2 The scribe signs his name

*Level: beginner.*

Scribes finished books. A copy of a long text, such as the Gospels or the *Confessions* of Augustine, could take a person
a year or more, and a scribe's reward was often a short note at the end, called a **colophon**, that said so. Many
colophons are plain: *Explicit liber, Deo gratias* ("the book ends, thanks be to God"). Some are heartfelt. A line found
in the colophons of many manuscripts reads *Tres digiti scribunt, totum corpus laborat*, "three fingers write, but the
whole body labors." Some add a curse on anyone who steals the book. A few of them hide the plain words in a simple cipher
that any other reader of Latin in the house could undo.

The three tricks most often found are all about the **vowels**. Latin has five written vowels, *a, e, i, o, u*, and
about 46 percent of the letters in a Latin sentence are vowels (Section 5.3 counts them). Replace them with something else
and the consonants stay in place, so the text still looks like it has the right shape. Three ways to do it are found in
manuscripts from England and the Continent between the 700s and the 1000s:

- **Dots for vowels.** One dot for *a*, two for *e*, three for *i*, four for *o*, five for *u*. A tenth-century English
  copy of Aldhelm's *De Virginitate* ("On Virginity") has a short blessing written this way.
- **The next consonant.** Each vowel becomes the letter that follows it in the alphabet: *a* becomes *b*, *e* becomes
  *f*, *i* becomes *k* and *o* becomes *p*. The scribes' alphabet had no separate *j* or *v*, which is the usual
  explanation for *i* skipping to *k*, and for *u* going to *x*. An eleventh-century copy of Augustine's *Confessions*,
  now at Trinity College, Cambridge, ends with the scribe's thanks to Christ for finishing the book, written in this
  code.
- **The vowel's place as a number word.** Each vowel is written as a Latin ordinal for its position among the five
  vowels: first, second, third, fourth, fifth. This is the one Hygeburg used, as described below.

Figure 5.2 shows the three side by side, on the word *deo* ("God," in the ablative).

<figure class="mars-fig">
<svg viewBox="0 0 640 232" width="640" role="img" aria-label="Table of three vowel ciphers applied to the Latin word deo" fill="currentColor" font-size="14">
<rect x="20" y="12" width="600" height="208" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="20" y1="48" x2="620" y2="48" stroke="currentColor" stroke-width="1"/>
<line x1="20" y1="94" x2="620" y2="94" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<line x1="20" y1="140" x2="620" y2="140" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<line x1="20" y1="186" x2="620" y2="186" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<line x1="206" y1="12" x2="206" y2="220" stroke="currentColor" stroke-width="1"/>
<line x1="372" y1="12" x2="372" y2="220" stroke="currentColor" stroke-width="1"/>
<text x="36" y="36" font-size="14" font-weight="bold">Scheme</text>
<text x="222" y="36" font-size="14" font-weight="bold">deo becomes</text>
<text x="388" y="36" font-size="14" font-weight="bold">Where it turns up</text>
<text x="36" y="76" font-size="14">Dots for vowels</text>
<text x="222" y="76" font-size="14" style="font-family:var(--md-code-font-family,monospace)">d..'....</text>
<text x="388" y="76" font-size="13">English Aldhelm, 900s</text>
<text x="36" y="122" font-size="14">Next consonant</text>
<text x="222" y="122" font-size="14" style="font-family:var(--md-code-font-family,monospace)">dfp</text>
<text x="388" y="122" font-size="13">Augustine at Cambridge, 1000s</text>
<text x="36" y="168" font-size="14">Number word</text>
<text x="222" y="168" font-size="14" style="font-family:var(--md-code-font-family,monospace)">d(secundum)(quartum)</text>
<text x="388" y="168" font-size="13">Hygeburg's line, c. 780 (shortened)</text>
<text x="36" y="209" font-size="14">Plain</text>
<text x="222" y="209" font-size="14" style="font-family:var(--md-code-font-family,monospace)">deo</text>
<text x="388" y="209" font-size="13">consonants never move</text>
</svg>
<figcaption>Figure 5.2. Three vowel schemes on one word. In every one the consonants stay where they were, so a reader who knows Latin sees the shape of the sentence.</figcaption>
</figure>

### Hygeburg's line

The oldest and most interesting use has a woman's name in it. **Hygeburg**, an English nun at the double monastery of
Heidenheim in what is now Bavaria, wrote the life of two brothers who had come from England to work with their kinsman
Boniface: Willibald, who became bishop of Eichstätt, and Wynnebald, who founded the monastery. The *Life of Willibald*
includes an account of Willibald's pilgrimage through Italy, Cyprus, Syria and Palestine in the 720s, which Hygeburg says
she took from his own telling, and which is among the earliest travel narratives written by anyone from the British Isles.
She wrote it by about 780. The oldest copy, now in Munich (Bayerische Staatsbibliothek, Clm 1086) and made around the year
800, has a line of odd letters in which each vowel is written as a short form of a Latin number word. *Secd*, from
*secundum*, "second," stands for *e*. In 1931 Bernhard Bischoff solved it. It reads, roughly, that Hugeburc, a Saxon
woman, wrote this. It is the only place her name is recorded, and until Bischoff the book was credited to "the nun of
Heidenheim."

Why would she hide it? The sources do not say. The usual guess is humility. Medieval authors, especially women, often
protested their unworthiness at the start of a work, and a name that is written but not easy to read lets the author be
both anonymous and on record. That is a guess about a person eleven centuries gone, and I give it as one. What the
manuscript does show is simpler: a woman at a monastery in Bavaria knew a letter trick, wrote in a language she had
learned as a second tongue, and chose to put her name into a book where only a reader who knew the trick would find it.

!!! note "Life story: Hygeburg"
    **Born:** England, probably in the early to mid 700s (no date is known); a nun at Heidenheim, Bavaria, from a
    monastery founded in the 750s · **Purpose:** to write the lives of Willibald and Wynnebald, kinsmen of Boniface, as
    a record for the community · **Helped:** preserved Willibald's travel account of the 720s, and left the one known
    signature of her name, in a vowel cipher, in the Munich copy of about 800 · **Status:** the book survives; her cipher
    was read by Bernhard Bischoff in 1931, which is when the "nun of Heidenheim" got a name

### Other signatures: Cynewulf and the riddle-makers

The same habit of hiding a name in the text is older than the vowel tricks and is stronger in Old English poetry than
anywhere else. **Cynewulf** is the name of an Old English poet whom we know about only because he signed four poems in
runes: *Christ II*, *Juliana*, *Elene* and *The Fates of the Apostles*. In each, near the end, a run of runic letters
spells out his name inside the verse, and the poet asks the reader to pray for him. The poems are copied in two famous
books of the late 900s, the Exeter Book and the Vercelli Book. When Cynewulf lived is argued: the language points to
the late 700s or the 800s, and no document names him. Some riddles of the Exeter Book also hide their answer in runes
or in a word written backwards. These are not secrets to be kept. A riddle that no one could solve would be a poor
riddle. They are a game that depends on the reader's knowing the alphabet and the trick, and the game and the signature
share a method.

So the first European cryptography is a literary habit, played by people who are not hiding from anyone. That is not a
small thing. It shows that the idea of writing that looks like writing but means something else was well understood in
the monasteries of the 700s to the 1000s, long before anyone in Europe had a reason to fear a codebreaker.

### Code it

Here are the three schemes as short programs. The dots need one extra mark: two vowels that touch, like the *i* and *a*
in *gratias*, would run their dots together, so the program puts a `'` between the groups.

```python
# Three ways medieval scribes hid the vowels of a Latin sentence.
VOWELS = "aeiou"

def dots(text):
    # one dot for a, two for e, three for i, four for o, five for u.
    # A ' keeps two vowel groups that touch from running together.
    out, prev_vowel = "", False
    for ch in text:
        if ch in VOWELS:
            out += ("'" if prev_vowel else "") + "." * (VOWELS.index(ch) + 1)
            prev_vowel = True
        else:
            out += ch
            prev_vowel = False
    return out

def next_consonant(text):
    # each vowel becomes the letter after it: a>b e>f i>k o>p u>x
    # (no j or v in the scribe's alphabet, so i skips to k and u to x)
    table = {"a": "b", "e": "f", "i": "k", "o": "p", "u": "x"}
    return "".join(table.get(ch, ch) for ch in text)

ORDINALS = ["primum", "secundum", "tertium", "quartum", "quintum"]

def ordinal(text):
    # each vowel becomes the word for its place among the vowels
    return "".join("(" + ORDINALS[VOWELS.index(ch)] + ")" if ch in VOWELS else ch for ch in text)

line = "explicit liber deo gratias"
print(dots(line))
print(next_consonant(line))
print(ordinal("deo"))
```

Output:

```
..xpl...c...t l...b..r d..'.... gr.t...'.s
fxplkckt lkbfr dfp grbtkbs
d(secundum)(quartum)
```

Hygeburg's real forms were shortened (*secd*) and not all of them are in the sources I have seen, so the third function
spells the numbers out in full. Treat it as a picture of the idea, and the first two as the scribes' actual schemes.

**Try it.** Decode `dfp grbtkbs` by hand. Every `b`, `f`, `k`, `p` and `x` is either itself or the vowel behind it, so
read it as Latin and see which choice makes words. Then try `fxplkckt lkbfr`. You will find that you are solving it with
your knowledge of Latin and not with a key, and that is the next section's point.

## 5.3 Break it: a cipher the reader solves in his head

*Level: intermediate.*

A cipher is a promise about what an enemy cannot do. The promise of the vowel tricks is small: a casual reader will not
see the name. To see how small, count what the trick leaves behind.

In a short Latin sample (the first lines of Genesis in the Vulgate, the Latin Bible of Jerome) 71 of 154 letters are
vowels, 46 percent. If we blank them, the skeleton still shows the shape of every word:

```python
# How much of a Latin text do the consonants keep?
text = ("In principio creavit Deus caelum et terram. Terra autem erat inanis et vacua, "
        "et tenebrae super faciem abyssi: et spiritus Dei ferebatur super aquas. "
        "Dixitque Deus: Fiat lux. Et facta est lux.").lower()
letters = [ch for ch in text if ch.isalpha()]
vowels = [ch for ch in letters if ch in "aeiou"]
print(len(letters), "letters,", len(vowels), "vowels,", round(100 * len(vowels) / len(letters)), "percent")
skeleton = "".join("_" if ch in "aeiou" else ch for ch in text)
print(skeleton[:60])
```

Output:

```
154 letters, 71 vowels, 46 percent
_n pr_nc_p__ cr__v_t d__s c__l_m _t t_rr_m. t_rr_ __t_m _r_t
```

Anyone who reads Latin fills in "In principio creavit Deus caelum et terram" from that skeleton with little effort. The
cipher hides the vowels, but the language puts them back. The next-consonant scheme is a little harder than a blank,
because a letter in the ciphertext might be the vowel or a plain consonant: a `b` is a hidden *a* or a real *b*. A
reader, or a program with a word list, tries both:

```python
# Reading a next-consonant cipher without the key.
from itertools import product

SWAP = {"b": "a", "f": "e", "k": "i", "p": "o", "x": "u"}   # cipher letter -> the vowel it may hide
LATIN = {"explicit", "liber", "deo", "gratias", "amen", "finis", "hic", "est", "scriptor", "vale"}

def readings(word):
    # a b, f, k, p or x in the cipher is either itself or the vowel behind it
    choices = [(ch, SWAP[ch]) if ch in SWAP else (ch,) for ch in word]
    return ["".join(c) for c in product(*choices)]

for word in "fxplkckt lkbfr dfp grbtkbs hxgfbxrc".split():
    found = [r for r in readings(word) if r in LATIN]
    print(word, "->", found if found else "%d readings, none in my list" % len(readings(word)))

print(sorted(readings("hxgfbxrc")))
```

Output:

```
fxplkckt -> ['explicit']
lkbfr -> ['liber']
dfp -> ['deo']
grbtkbs -> ['gratias']
hxgfbxrc -> 16 readings, none in my list
['hugeaurc', 'hugeaxrc', 'hugeburc', 'hugebxrc', 'hugfaurc', 'hugfaxrc', 'hugfburc', 'hugfbxrc', 'hxgeaurc', 'hxgeaxrc', 'hxgeburc', 'hxgebxrc', 'hxgfaurc', 'hxgfaxrc', 'hxgfburc', 'hxgfbxrc']
```

The four stock words of a colophon fall out at once, and each has exactly one reading in the list. The name does not.
`hxgfbxrc` has sixteen possible readings and none is in a list of ordinary Latin words, so the program does not know
which is right. A person who sees *hugeburc* among the sixteen knows it is a name, and that is the important point: a
name is a thing a word list will never contain, and it was the name that these scribes were hiding. A name could be read
by a person who was told to look for one, or who had a reason to suspect there was a name there, and by nobody else.

Cryptanalysis was a long way off. Chapter 4 tells how al-Kindi, in Baghdad around 850, showed that counting letters
breaks any substitution, however the alphabet is shuffled, and
[Chapter 2 of the Cryptanalysis book](../cryptanalysis/02-Breaking-Classical-Ciphers.md) teaches the method. The vowel
schemes fall to something much weaker than that. They fall to a reader who knows the language, and the monks counted on
exactly such readers.

!!! note "Life story: the vowel ciphers of the scribes"
    **Born:** the 700s, in English and Continental monasteries; the surviving examples run from about 780 (Hygeburg) to
    the 1000s · **Purpose:** to sign a book, to mark a blessing, to set a friendly puzzle for another reader of Latin;
    never to hide a message from an enemy · **Helped:** left the earliest hints that writers of the early Middle Ages
    understood a letter-for-letter code, and gave Bernhard Bischoff and Benjamin Saltzman something to study ·
    **Retired:** gradually, as monastic copying gave way to universities and printing; no medieval text describes how
    to break them

## 5.4 Runes that hide inside runes

*Level: beginner.*

In the north the writing was runic. **Runes** are the angular letters of the Germanic peoples, cut with a knife or chisel
into wood, bone, metal and stone because their straight strokes follow the grain and are easy to carve. The oldest
alphabet, the older *futhark* (named for its first six letters, *f u th a r k*), had 24 runes and was used from about the
2nd century. By about the year 800 Scandinavian carvers had cut it to 16, the *younger futhark*, which is the one in the
Viking Age stones. Runes were used for names, for memorials, for charms and for the plain business of marking owners, and
by the 800s some carvers had learned to hide runes inside other runes.

### The Rök stone

The most famous example stands in Östergötland, in Sweden. The **Rök runestone** was carved in the 800s, probably early in
the century. It is covered on five sides by some 700 runes (counts run from about 700 to 760, depending on how they are
read), which makes it the longest inscription of the Viking Age. It begins as a memorial: the usual reading is that the
stone stands in memory of Vämod, and that Varin, who made it, set it up for his dead son. Then it turns to riddles about
the heroes and tribes of the past, among them the Gothic king Theodoric, whose name Scandinavian poetry knew. Part of the
text is written in cipher. Some runes are replaced by other runes, further along the rune row, in a shift like Caesar's;
others are written in special cipher runes. Henrik Williams of Uppsala University, who has studied the stone for years,
counts four different ciphers on it. Scholars agree on how most of the runes read, but they have argued for more than a
century over what the text means, and proposals from the last few years change the reading again.

I stress that last point because it is a good example of the thinness of the evidence. The stone is physically there, and
you can stand next to it. Its date rests on the form of the runes and the language, not on a document, and its meaning
rests on a reading that scholars still revise. The cipher is real. What it was for is not known.

!!! note "Life story: the Rök runestone"
    **Born:** the 800s, probably early in the century, at Rök in Östergötland, Sweden; carved by or for a man named Varin
    in memory of his son Vämod · **Purpose:** a memorial that doubles as a display of learning: a long text of riddles
    about the heroes of the past, partly in cipher runes · **Helped:** shows that runic carvers in the early 800s already
    knew how to replace one rune by another along the row, and are not known to have written down the rule · **Status:**
    standing by Rök church; the longest runic inscription of the Viking Age, with its meaning still argued

### Twig runes: arithmetic on the rune row

The method the Rök carver used was, in part, a shift, which is a Caesar cipher on the rune row. A second method, found in
Scandinavian inscriptions of the 1100s and later and described in medieval Icelandic rune lists, is more interesting
because it is arithmetic. The 16 runes of the younger futhark were taught in three groups, called *aettir*, "families":
six runes in the first, five in the second, five in the third. A rune can then be written as two numbers: its family and
its place in the family. So *r*, the fifth rune of the first family, is the pair (1, 5), and *h*, the first of the second
family, is (2, 1).

The cipher draws those numbers. Each cipher rune is a vertical stem with short branches, like a twig: some number of
branches on one side for the family, some number on the other side for the place. For that reason these are called **twig
runes**, or **branch runes**; later Scandinavian writers called one form *hahalruna*, "Hagal's runes," after the first
rune of the second family. Figure 5.3 shows the three families, and two twig runes drawn from pairs.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The three families of the younger futhark, and two twig runes drawn as a stem with branches" fill="currentColor" font-size="14">
<text x="24" y="28" font-size="14" font-weight="bold">Family 1</text>
<text x="24" y="78" font-size="14" font-weight="bold">Family 2</text>
<text x="24" y="128" font-size="14" font-weight="bold">Family 3</text>
<g font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">
<rect x="116" y="8" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="138" y="28">f</text>
<rect x="166" y="8" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="188" y="28">u</text>
<rect x="216" y="8" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="238" y="28">þ</text>
<rect x="266" y="8" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="288" y="28">o</text>
<rect x="316" y="8" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="338" y="28">r</text>
<rect x="366" y="8" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="388" y="28">k</text>
<rect x="116" y="58" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="138" y="78">h</text>
<rect x="166" y="58" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="188" y="78">n</text>
<rect x="216" y="58" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="238" y="78">i</text>
<rect x="266" y="58" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="288" y="78">a</text>
<rect x="316" y="58" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="338" y="78">s</text>
<rect x="116" y="108" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="138" y="128">t</text>
<rect x="166" y="108" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="188" y="128">b</text>
<rect x="216" y="108" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="238" y="128">m</text>
<rect x="266" y="108" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="288" y="128">l</text>
<rect x="316" y="108" width="44" height="28" rx="3" fill="none" stroke="currentColor"/><text x="338" y="128">R</text>
</g>
<g font-size="12" text-anchor="middle">
<text x="138" y="48" opacity="0.7">1</text><text x="188" y="48" opacity="0.7">2</text><text x="238" y="48" opacity="0.7">3</text>
<text x="288" y="48" opacity="0.7">4</text><text x="338" y="48" opacity="0.7">5</text><text x="388" y="48" opacity="0.7">6</text>
<text x="138" y="98" opacity="0.7">1</text><text x="188" y="98" opacity="0.7">2</text><text x="238" y="98" opacity="0.7">3</text>
<text x="288" y="98" opacity="0.7">4</text><text x="338" y="98" opacity="0.7">5</text>
<text x="138" y="148" opacity="0.7">1</text><text x="188" y="148" opacity="0.7">2</text><text x="238" y="148" opacity="0.7">3</text>
<text x="288" y="148" opacity="0.7">4</text><text x="338" y="148" opacity="0.7">5</text>
</g>
<text x="440" y="28" font-size="13">branches on one side</text>
<text x="440" y="46" font-size="13">give the family,</text>
<text x="440" y="64" font-size="13">on the other side</text>
<text x="440" y="82" font-size="13">the place</text>
<line x1="150" y1="170" x2="150" y2="290" stroke="currentColor" stroke-width="2.4"/>
<line x1="150" y1="190" x2="132" y2="180" stroke="currentColor" stroke-width="2"/>
<line x1="150" y1="190" x2="168" y2="180" stroke="currentColor" stroke-width="2"/>
<line x1="150" y1="206" x2="168" y2="196" stroke="currentColor" stroke-width="2"/>
<line x1="150" y1="222" x2="168" y2="212" stroke="currentColor" stroke-width="2"/>
<line x1="150" y1="238" x2="168" y2="228" stroke="currentColor" stroke-width="2"/>
<text x="150" y="160" font-size="13" text-anchor="middle">(1, 5) = r</text>
<line x1="340" y1="170" x2="340" y2="290" stroke="currentColor" stroke-width="2.4"/>
<line x1="340" y1="190" x2="322" y2="180" stroke="currentColor" stroke-width="2"/>
<line x1="340" y1="206" x2="322" y2="196" stroke="currentColor" stroke-width="2"/>
<line x1="340" y1="190" x2="358" y2="180" stroke="currentColor" stroke-width="2"/>
<line x1="340" y1="206" x2="358" y2="196" stroke="currentColor" stroke-width="2"/>
<text x="340" y="160" font-size="13" text-anchor="middle">(2, 2) = n</text>
<text x="450" y="200" font-size="13">Which side counts the family,</text>
<text x="450" y="218" font-size="13">and where counting starts,</text>
<text x="450" y="236" font-size="13">differs between inscriptions.</text>
</svg>
<figcaption>Figure 5.3. The 16 runes of the younger futhark in their three families, and two twig runes. Each twig rune is a stem; the left branches count the family and the right branches count the place, in the convention drawn here. Inscriptions differ on the convention.</figcaption>
</figure>

That is a real cipher with a real key: the grouping of the runes. But everyone who learned runes learned the grouping, so the secret was the idea, not a number, and a reader who had met a twig rune once could read every other. The carvers were showing a skill. In the Maeshowe tomb on Orkney, which Norse visitors broke into in the middle of the 1100s and filled with carved graffiti, some inscriptions are described as being in cipher runes, and one of the carvers boasts that the runes were cut "by the man most skilled in runes in the western ocean." I take that boast as the best evidence for what the cipher runes were for: not to keep a secret from a king, but to prove the carver knew more than the next man. That is my inference from one sentence, not a finding, and I have not checked the Maeshowe inscriptions against a modern edition.

### Code it

The cipher is a table lookup, so the program is short. The family strings spell the runes in the order of the rune row, with
*þ* for th, *o* for the rune that stands for o, and *R* for the rune used for a final r.

```python
# Twig runes: write each rune as (family, place), counting in the 16-rune futhark.
FAMILIES = ["fuþork", "hnias", "tbmlR"]   # Freyr's, Hagal's and Tyr's families (aettir)
# þ is th, o is the rune that stood for o and nasal o, R is the rune for a final r.

def to_pairs(word):
    pairs = []
    for ch in word:
        for f, family in enumerate(FAMILIES, 1):
            if ch in family:
                pairs.append((f, family.index(ch) + 1))
    return pairs

def from_pairs(pairs):
    return "".join(FAMILIES[f - 1][p - 1] for f, p in pairs)

pairs = to_pairs("runaR")          # the word for "runes"
print(pairs)
print(from_pairs(pairs))
print(from_pairs([(3, 1), (2, 1), (1, 4), (1, 5)]))
```

Output:

```
[(1, 5), (1, 2), (2, 2), (2, 4), (3, 5)]
runaR
thor
```

**Try it.** Decode these pairs by hand using Figure 5.3: (1, 2), (3, 4), (1, 1), (3, 5). The answer is the Norse word for
a wolf. Then write your own first name in pairs. Notice what you cannot do: the younger futhark has no letters for *c*,
*d*, *e*, *g*, *j*, *p*, *v* or *w*, so a name has to be respelled, and a respelled name is a second small puzzle on top of
the cipher.

!!! note "Life story: twig runes and cipher runes"
    **Born:** the 800s for runes replaced by other runes (the Rök stone); the family-and-place system of twig runes is
    recorded in Scandinavian inscriptions of the 1100s and in later Icelandic rune lists · **Purpose:** to show skill in
    the rune row and to hide a name or a phrase from a reader who did not know the trick, probably not from enemies ·
    **Helped:** nothing lasting; no document shows a state or a merchant using them · **Retired:** with the end of runic
    writing in everyday use in Scandinavia in the later Middle Ages

## 5.5 Ogham and the Irish love of the hidden

*Level: intermediate.*

Ireland had its own alphabet. **Ogham** is a script of short strokes cut along the edge of a standing stone: the edge of
the stone is the stem line, and the letters are strokes on one side or the other, across it, or notched into it. About
four hundred ogham stones stand in Ireland, most in the south-west, and a hundred or so more in Wales, Scotland, the Isle
of Man and southwest England (the counts vary by source). They were carved from the 4th to the 7th centuries, and they
are mostly memorials of a few words, a name and a father's name, in an early form of Irish. The best-supported account of
how ogham began is that someone who knew Latin grammar, and the way grammarians sorted the Latin alphabet into vowels and
consonants, designed a script for Irish on the same plan. That is Damian McManus's argument in his *Guide to Ogam*
(1991), and it is the view most specialists hold today. It is an argument from the script's structure, since no
document records its invention.

The script has twenty letters in four groups of five, called *aicmí* (singular *aicme*, "family"). The first group runs
B, L, F, S, N; the second H, D, T, C, Q; the third M, G, NG, Z, R; and the fourth is the vowels A, O, U, E, I. Within a
group the letter is set by the number of strokes, from one to five. The strokes of the first group sit on one side of the
stem line, those of the second on the other, those of the third cross it, and the vowels are notches. Figure 5.4 sets the
groups out, with each letter's place in the whole alphabet, from 1 to 20.

<figure class="mars-fig">
<svg viewBox="0 0 640 262" width="640" role="img" aria-label="The twenty ogham letters in four groups of five, with each letter's number from 1 to 20 and its traditional name" fill="currentColor" font-size="14">
<g font-size="13" font-weight="bold">
<text x="20" y="34">Group 1</text><text x="20" y="34" dy="14" font-weight="normal" font-size="12" opacity="0.7">one side</text>
<text x="20" y="100">Group 2</text><text x="20" y="100" dy="14" font-weight="normal" font-size="12" opacity="0.7">other side</text>
<text x="20" y="166">Group 3</text><text x="20" y="166" dy="14" font-weight="normal" font-size="12" opacity="0.7">across</text>
<text x="20" y="232">Vowels</text><text x="20" y="232" dy="14" font-weight="normal" font-size="12" opacity="0.7">notches</text>
</g>
<g text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">
<rect x="116" y="8" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="164" y="30" font-size="16">B  1</text><text x="164" y="48" font-size="12">beith</text>
<rect x="218" y="8" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="266" y="30" font-size="16">L  2</text><text x="266" y="48" font-size="12">luis</text>
<rect x="320" y="8" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="368" y="30" font-size="16">F  3</text><text x="368" y="48" font-size="12">fern</text>
<rect x="422" y="8" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="470" y="30" font-size="16">S  4</text><text x="470" y="48" font-size="12">sail</text>
<rect x="524" y="8" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="572" y="30" font-size="16">N  5</text><text x="572" y="48" font-size="12">nin</text>
<rect x="116" y="74" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="164" y="96" font-size="16">H  6</text><text x="164" y="114" font-size="12">uath</text>
<rect x="218" y="74" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="266" y="96" font-size="16">D  7</text><text x="266" y="114" font-size="12">dair</text>
<rect x="320" y="74" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="368" y="96" font-size="16">T  8</text><text x="368" y="114" font-size="12">tinne</text>
<rect x="422" y="74" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="470" y="96" font-size="16">C  9</text><text x="470" y="114" font-size="12">coll</text>
<rect x="524" y="74" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="572" y="96" font-size="16">Q 10</text><text x="572" y="114" font-size="12">cert</text>
<rect x="116" y="140" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="164" y="162" font-size="16">M 11</text><text x="164" y="180" font-size="12">muin</text>
<rect x="218" y="140" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="266" y="162" font-size="16">G 12</text><text x="266" y="180" font-size="12">gort</text>
<rect x="320" y="140" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="368" y="162" font-size="16">NG 13</text><text x="368" y="180" font-size="12">ngetal</text>
<rect x="422" y="140" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="470" y="162" font-size="16">Z 14</text><text x="470" y="180" font-size="12">straif</text>
<rect x="524" y="140" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="572" y="162" font-size="16">R 15</text><text x="572" y="180" font-size="12">ruis</text>
<rect x="116" y="206" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="164" y="228" font-size="16">A 16</text><text x="164" y="246" font-size="12">ailm</text>
<rect x="218" y="206" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="266" y="228" font-size="16">O 17</text><text x="266" y="246" font-size="12">onn</text>
<rect x="320" y="206" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="368" y="228" font-size="16">U 18</text><text x="368" y="246" font-size="12">ur</text>
<rect x="422" y="206" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="470" y="228" font-size="16">E 19</text><text x="470" y="246" font-size="12">edad</text>
<rect x="524" y="206" width="96" height="48" rx="3" fill="none" stroke="currentColor"/><text x="572" y="228" font-size="16">I 20</text><text x="572" y="246" font-size="12">idad</text>
</g>
</svg>
<figcaption>Figure 5.4. The twenty ogham letters, with each letter's number in the alphabet and its name as usually normalized. Manuscripts spell the names in many ways.</figcaption>
</figure>

### The tract and its hundred forms

By the time anyone wrote ogham in a manuscript the script was no longer carved on stones for the living. Irish scholars
of the Christian centuries kept it as a learned subject. A treatise called *In Lebor Ogaim*, "The Book of Ogams," often
called the Ogam Tract, survives in the **Book of Ballymote**, a large manuscript copied about 1390 for a chieftain of
Sligo, and in later manuscripts. The tract is older than the copy, and how much older is argued. It lists about a
hundred variants and secret ways of writing ogham: ninety-two of them in the Book of Ballymote and a few more elsewhere.
It also gives the letters their traditional names, many of them the names of trees, and sets out riddling phrases for
each letter. Two of the secret forms are easy to state:

- **Ogam Bricrenn** turns each letter into a count of dots: one dot for B, two for L, three for F, and so on up to twenty
  for I. This is the letter's number in Figure 5.4.
- **"Final" ogham** writes each letter as the last letter of its own name, apparently meant for use as a code.

Some of the hundred forms are easier than that and some are harder, and a few look like plain playfulness, the habit of
an educated class that liked to make a thing difficult to read to show it could. The same habit shows in the Irish
learned writing of those centuries: a Latin so full of rare and invented words that it is called *hermeneutic*, and a
poets' language, *bélre na filed*, full of obscure vocabulary. In that setting a hundred ways to write ogham look less like
a cipher office and more like a school of poets working a puzzle.

### Code it, then break it

```python
# Ogham: the twenty letters in their four groups, and two of the secret forms.
GROUPS = [("B", "beith"), ("L", "luis"), ("F", "fern"), ("S", "sail"), ("N", "nin"),
          ("H", "uath"), ("D", "dair"), ("T", "tinne"), ("C", "coll"), ("Q", "cert"),
          ("M", "muin"), ("G", "gort"), ("NG", "ngetal"), ("Z", "straif"), ("R", "ruis"),
          ("A", "ailm"), ("O", "onn"), ("U", "ur"), ("E", "edad"), ("I", "idad")]
NUMBER = {letter: i + 1 for i, (letter, name) in enumerate(GROUPS)}
FINAL = {letter: name[-1].upper() for letter, name in GROUPS}

# Ogam Bricrenn: every letter is a number of dots, counted along the alphabet.
word = ["O", "G", "A", "M"]
print([NUMBER[x] for x in word])

# "Final" ogham: every letter is written as the last letter of its own name.
print([FINAL[x] for x in word])

# But the last letters collide, so the message cannot be read back without guessing.
back = {}
for letter, last in FINAL.items():
    back.setdefault(last, []).append(letter)
print(sorted((k, v) for k, v in back.items() if len(v) > 1))
```

Output:

```
[17, 12, 16, 11]
['N', 'T', 'M', 'N']
[('D', ['E', 'I']), ('H', ['B', 'H']), ('L', ['S', 'C', 'NG']), ('N', ['F', 'N', 'M', 'O']), ('R', ['D', 'U']), ('S', ['L', 'R']), ('T', ['Q', 'G'])]
```

**Break it.** The first scheme is a plain number code with a public table: anyone who has the alphabet can undo it, as a
program does in one line. The second is worse than it looks. With the letter names spelled as in Figure 5.4, seven
different last letters are each shared by two to four ogham letters. A final-ogham message therefore has several readings,
as the vowel schemes of Section 5.3 had, and only a reader who knows the language can choose among them. The names are
spelled in many ways in the manuscripts and I have not checked these against the tract, so the exact collisions may
differ. The point survives any spelling: a scheme that maps several letters to one is not a cipher in the strict sense,
because decryption is not unique. It is a game, and a pleasant one.

!!! note "Life story: In Lebor Ogaim, the Ogam Tract"
    **Born:** a tract of uncertain date, older than the Book of Ballymote, which copied it about 1390 in Sligo; the
    ogham script itself is carved on stones from the 4th to the 7th centuries · **Purpose:** a school text for Irish
    poets and scholars, setting out the letters, their names and their variant forms · **Helped:** kept the only
    detailed record of how ogham letters were named and re-coded, which later scholars used to read the script's structure ·
    **Status:** survives in the Book of Ballymote, in the Royal Irish Academy, Dublin, and in later manuscripts

## 5.6 Hildegard's unknown letters

*Level: beginner.*

Hildegard of Bingen was born in 1098 at Bermersheim, in the Rhineland, and was given to the Church as a child. She
entered the hermitage attached to the monastery of Disibodenberg, was chosen abbess of a group of nuns there in 1136, and
in about 1150 moved them to a new house of her own, the Rupertsberg near Bingen. She died on 17 September 1179. In those
years she wrote a book of visions, *Scivias* (finished about 1151), two more theological works, books on medicine and
natural history, about seventy poems and chants that she set to music, and hundreds of letters, to popes, emperors,
bishops and nuns. She preached, which for a woman in the 1100s was extraordinary, and she was named a Doctor of the Church
in 2012, more than eight centuries later.

She also invented an alphabet and a language. The alphabet is the *litterae ignotae*, "unknown letters": 23 letters, one
for each letter of the Latin alphabet except *j*, *v* and *w*, plus two signs for *et* and *est* taken from Roman
shorthand. The language is the *Lingua ignota*, "unknown language," a glossary of about a thousand invented words, arranged
by subject, beginning with God, angels, saints and people and running down through body parts, plants and tools. It was
written down in the great manuscript of her works made at the Rupertsberg shortly after her death, the *Riesencodex*, now
in Wiesbaden, under the heading, in Latin, "the unknown language brought forth by the simple woman Hildegard." Each entry
gives the new word and its Latin meaning, and sometimes a German one: the first entries begin with *aigonz*, glossed as
"God." The glossary gives no grammar. As far as the surviving record shows, the words were used singly, inserted into
Latin sentences, and the only places where they appear are her letters and, according to scholars of the music, a chant
in which a few of the words stand among Latin ones (*O orzchis Ecclesia*).

Her earliest known use of the unknown letters is in a letter to the monks of Zwiefalten, in Swabia, written in 1153 or
1154, in which she spelled out the address in them. She was criticizing the monks, and a hidden address may have been
tact, or may have been a way of saying that the matter was between her and the monks and God. That is a modern guess.

What was it for? The sources do not say, and the question has been argued for as long as scholars have looked at the
glossary. Four explanations are proposed. A **private language of devotion** suits her visions: she heard a heavenly
speech and wrote it down. A **language for her community**, a sign of belonging to the Rupertsberg and not to the world
outside, suits the small, enclosed house of women. Sarah Higley, whose 2007 edition and discussion of the *Lingua* is the
standard one, takes such readings seriously. A **cipher** is the third, and in a loose way the words are one: a word code
with a thousand entries, in which one word of Latin is replaced by one invented word. It is not a good one, because there
is no grammar, no key that changes, and the alphabet is a plain substitution under new shapes. A fourth view calls it a
**game or an exercise of the mind**, in the Irish way, an exercise in making something new. All four agree on this: it was
not a way of keeping a message from a stranger. The Rupertsberg had a scriptorium, and a visiting monk could read the
glossary at the end of her works for the asking.

For this book's purposes, Hildegard marks two things. One is that a woman wrote her own alphabet down and had it copied
into the main manuscript of her works, which tells us she and her nuns thought it worth keeping. The other is the point
this chapter keeps returning to. In the Middle Ages, secret writing in Europe belonged to people who were not afraid of
anyone. It was a pleasure of the educated, and it served the community that held it.

!!! note "Life story: Hildegard of Bingen"
    **Born:** 1098, Bermersheim, Rhineland; abbess of Disibodenberg from 1136, of the Rupertsberg near Bingen from about
    1150; died 17 September 1179 · **Purpose:** her *litterae ignotae* and *Lingua ignota* are of uncertain purpose:
    devotion, community, play, or a mix · **Helped:** her letters, chants, visions and medical books are among the great
    writings of the century, and the alphabet is one of the earliest named invented scripts in Europe · **Status:** the
    alphabet and glossary survive in the Wiesbaden *Riesencodex*, with copies made later; she was named a Doctor of the
    Church in 2012

## 5.7 Secrets of the schools: Bacon, the alchemists and a book about the stars

*Level: intermediate.*

By 1200 the picture was changing. Universities opened at Bologna, Paris and Oxford. Arabic and Greek books on astronomy,
medicine, mathematics and the natural world were translated into Latin in Spain, at Toledo above all, and in Sicily, and
a class of scholars arrived who were interested in how things worked and who sometimes had good reasons to be careful
about saying so. The Church could, and did, condemn a book. A man who wrote about the stars could be accused of magic; a
man who wrote about the transformation of metals could be accused of fraud or worse. Secrecy in this setting had a new
motive. It was not about keeping a message from an enemy. It was about keeping a thing from the wrong readers.

### The alchemists and their cover names

The Latin West got alchemy from the Arabic one, and the name shows it: *alchemy* is from the Arabic *al-kimiya*. The great
body of Arabic alchemical writing is credited to a Jabir ibn Hayyan, said to have lived in the 700s, though it was written
over the following two centuries and many scholars think by a school and not one man. A principle of those writings, called
*tabdid* ("scattering"), was to spread the key facts of the art across many books so that no single book gave the whole.
The Latin alchemists inherited the habit and added their own. Their texts are full of **cover names**: the green lion, the
red man and the white woman, the philosophers' egg, the dragon that eats its own tail. For many of these names modern
scholars of alchemy agree on what was meant. For others they have long disagreed, and one reason is that the writers
meant them to be hard.

This is a **code**, not a cipher, in the sense of Chapter 1: whole words stand for other whole words, by a list the writer
and the initiate share, and the list was never written down in one place. To read it, a modern scholar does what a
codebreaker does with a code: finds a second source in which the same name appears in a clearer sentence, and works out
the meaning from the contexts. There is no attack by counting, because there is nothing to count; there is only
comparing texts. That was the real protection, and it lasted as long as the tradition of oral teaching did.

### Roger Bacon: write it so the crowd cannot read it

The English friar **Roger Bacon** (c. 1220-1292) studied at Oxford and Paris, joined the Franciscans, and spent much of
his life arguing that experiment and mathematics were the way to know nature. In 1267 he sent Pope Clement IV, who had
asked for it, a long work, the *Opus maius*. He was not always free to write. As it is usually told, the order's rules
of 1260 forbade its members to publish without approval, and Bacon complained of the difficulty.

His short *Letter on the Secret Works of Art and Nature* (the Latin title adds "and on the Nullity of Magic"), usually
dated to the later 1200s, lists seven ways of concealing secrets in writing. It says that a man is out of his mind who
writes a secret in any way other than one that hides it from the common crowd, a line I know through David Kahn's
account and not from the Latin. Bacon's seven ways are not a manual of ciphers, and I have not seen the full
list in the original, so I do not set it out. For Bacon the question was not who might steal a message. It was whether wisdom should be written in a form that
anyone could read, and his answer, an old one in the tradition of the philosophers, was no.

Bacon is the origin of a long-lived mistake, and it is worth naming. In 1912 a book dealer bought a manuscript that no
one could read and, partly because a seventeenth-century letter said it had been thought to be Bacon's, spent years
trying to show that Bacon wrote it. That is the book of Section 5.8, and Bacon did not write it. The English statesman
**Francis Bacon** (1561-1626), who has nothing to do with the friar, described a different cipher of his own, the
*biliteral*, in 1605 and 1623; it belongs to the printed ciphers of the next chapters.

!!! note "Life story: Roger Bacon"
    **Born:** c. 1220, England; studied at Oxford and Paris, became a Franciscan, and died about 1292 · **Purpose:** to
    argue for experiment and mathematics, and to keep what he thought of as secrets of nature from the crowd by writing
    them in a hidden form · **Helped:** the *Opus maius* (1267) and the *Letter on the Secret Works of Art and Nature*
    kept the question of "who should be able to read this" in front of later scholars; he did not invent a cipher
    system · **Status:** a figure of the 1200s; he is credited with several things (gunpowder recipes, cipher systems, the
    Voynich manuscript) that his surviving works do not show

### The Equatorie of the Planetis

A smaller case sits in Cambridge. *The Equatorie of the Planetis* (Peterhouse, Cambridge, MS 75.I) is a Middle English
manual, from about 1392, for an *equatorium*, a device of brass and thread for finding where the planets are without
long arithmetic. A few short passages in it are written in a cipher of symbols, which Derek Price solved when he edited
the text in 1955. In that edition he argued that the manuscript was written in the hand of Geoffrey Chaucer, which would
have made Chaucer an amateur cryptographer. Later work disputed the attribution, and the handwriting has been identified
as that of John Westwyk, a Benedictine monk of St Albans. The Chaucer attribution is now generally doubted. What stays
is the plain fact: a scholarly author, writing a technical manual in English in the 1390s, hid a few words in symbols.

!!! note "Life story: the Equatorie of the Planetis"
    **Born:** about 1392, in England; Peterhouse, Cambridge, MS 75.I · **Purpose:** a manual for an astronomical
    instrument, with a few words in a symbol cipher, probably to keep a detail from casual readers · **Helped:** gives a
    dated example of a scholar's cipher in English at the very end of the century; Derek Price's 1955 edition solved it and
    started the argument about Chaucer · **Status:** survives at Peterhouse; the Chaucer attribution is doubted and the
    handwriting is assigned to Westwyk

### The Templar test

One more case belongs here, not because it is real, but because it is not. Many readers have seen a cipher alphabet drawn
as pieces of a Maltese cross and labeled the Templar cipher. The Knights Templar, founded about 1119 and suppressed in 1312,
were the greatest financial organization of their day. The legend says they used that alphabet for their letters of
credit and their secrets. I know of no medieval Templar document written in it, and the histories of the order that I have
seen do not describe one. The alphabet is a simple substitution, and it is usually traced to Masonic and occult writing of
the 1700s and 1800s, though I have not traced its first appearance myself. The Templar cipher is a good test for the way
this chapter judges a case. There are three questions. Is there a medieval document in it? Does a contemporary source
mention it? Who first prints it, and when? A case that passes none of the three is a legend. Hygeburg's line passes the
first, since the document exists; the Rök stone passes it too, since you can visit it. The Templars' cipher passes none.

## 5.8 The book nobody can read

*Level: intermediate.*

Every period has its own unsolved secret, and the early 1400s has one that is famous enough to have a crowd of amateurs
around it. The **Voynich manuscript**, kept as MS 408 at the Beinecke Library of Yale University, is a codex of about 240
surviving pages of vellum, written in an unknown script, illustrated with drawings that match no known tradition. It is
roughly 15 centimeters by 23. The text runs in neat lines, with no corrections that anyone can agree on, in a script of
about two dozen to thirty distinct characters (the count depends on how you split ligatures), and the whole runs to
something like 35,000 words, about eight thousand of them different, by the usual transcriptions. The drawings fall into
sections. A **herbal** pictures hundreds of plants, most of which no botanist has matched to a real species. An
**astronomical** section has suns, moons and stars in circles, and a zodiac with the usual signs. A **bath** section shows
small nude figures in pools and tubes. A **cosmological** section has large circular diagrams, a **pharmaceutical**
section has jars and roots, and a final section is a run of short paragraphs, each with a star in the margin, which look
like recipes.

### What is known

The vellum was tested by radiocarbon at the University of Arizona in 2009, and the result put its making between 1404 and
1438, with 95 percent confidence. That dates the animal skin, not the ink, though other tests of the ink found it
consistent with the period. So the manuscript is a product of about the same decades as Alberti's youth and the first
Italian cipher keys of the 1400s. It is not the work of Roger Bacon, who had been dead for
more than a century. Where it was made is not known; guesses run from Italy to central Europe.

Its history after that is a chain of people and hearsay. Figure 5.5 sets out the links, with the shaky ones marked.

<figure class="mars-fig">
<svg viewBox="0 0 640 392" width="640" role="img" aria-label="The ownership chain of the Voynich manuscript from its vellum in 1404 to 1438 to Yale in 1969, with documented and hearsay links marked" fill="currentColor" font-size="14">
<g font-size="13">
<rect x="20" y="8" width="360" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="32" y="26" font-weight="bold">1404-1438</text><text x="32" y="42" font-size="12">vellum made (radiocarbon, 2009)</text>
<rect x="20" y="62" width="360" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4" opacity="0.7"/>
<text x="32" y="80" font-weight="bold" opacity="0.8">?</text><text x="32" y="96" font-size="12" opacity="0.8">Rudolf II, Prague: bought it for 600 ducats?</text>
<rect x="20" y="116" width="360" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="32" y="134" font-weight="bold">before 1622</text><text x="32" y="150" font-size="12">Jakub Horcicky de Tepenec: signature read on the first page</text>
<rect x="20" y="170" width="360" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="32" y="188" font-weight="bold">1639</text><text x="32" y="204" font-size="12">Georg Baresch, Prague, writes to Kircher about it</text>
<rect x="20" y="224" width="360" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="32" y="242" font-weight="bold">1665 or 1666</text><text x="32" y="258" font-size="12">Johannes Marcus Marci sends it to Kircher, Rome, with a letter</text>
<rect x="20" y="278" width="360" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="32" y="296" font-weight="bold">1912</text><text x="32" y="312" font-size="12">Wilfrid Voynich buys it from a Jesuit college near Rome</text>
<rect x="20" y="332" width="360" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="32" y="350" font-weight="bold">1969</text><text x="32" y="366" font-size="12">given to Yale; the Beinecke Library holds it</text>
</g>
<g stroke="currentColor" stroke-width="1.4">
<line x1="200" y1="48" x2="200" y2="62" stroke-dasharray="3 3"/><line x1="200" y1="102" x2="200" y2="116" stroke-dasharray="3 3"/>
<line x1="200" y1="156" x2="200" y2="170"/><line x1="200" y1="210" x2="200" y2="224"/><line x1="200" y1="264" x2="200" y2="278"/><line x1="200" y1="318" x2="200" y2="332"/>
</g>
<g font-size="13">
<text x="400" y="36" opacity="0.8">origin: not known</text>
<text x="400" y="84" opacity="0.8">hearsay in Marci's letter,</text><text x="400" y="100" opacity="0.8">no document</text>
<text x="400" y="138">documented (faint signature)</text>
<text x="400" y="192">documented (letter)</text>
<text x="400" y="246">documented (letter)</text>
<text x="400" y="300">documented (sale)</text>
<text x="400" y="354">documented (gift)</text>
</g>
</svg>
<figcaption>Figure 5.5. The documented and undocumented links in the history of the Voynich manuscript. Dashed boxes are hearsay or gaps.</figcaption>
</figure>

A faint signature on the first page has been read as that of Jakub Horčický of Tepenec, a Prague apothecary and botanist
to the emperor Rudolf II who died in 1622. In 1639 an alchemist in Prague, Georg Baresch, wrote to the Jesuit scholar
Athanasius Kircher, in Rome, about a book he owned and could not read; Kircher was a famous decoder of other people's
scripts, and no answer from him is known. In 1665 or 1666 Baresch's heir, Johannes Marcus Marci, sent the book itself
to Kircher, with a letter in which Marci passed on a story: that the emperor Rudolf had paid 600 ducats for it believing
it to be by Roger Bacon. It is hearsay, and no document shows Rudolf owning it. The manuscript then vanishes in the
Jesuits' hands until the Polish-born dealer Wilfrid Voynich bought it, with other books, from the Jesuit college at Villa
Mondragone near Rome, in 1912. After Voynich's death it passed through dealers, and Yale's Beinecke Library has held it
since 1969.

### What the codebreakers did

The twentieth century treated it as a challenge to the best cryptanalysts. William Romaine Newbold, a professor at
Pennsylvania, announced in 1921 that he had read it as Roger Bacon's, finding a shorthand in microscopic marks in the
strokes of the letters; John Manly of Chicago took the claim apart the same year, arguing that the "microscopic
shorthand" was cracks and flaking in the ink. In the 1940s, William Friedman, the great cryptanalyst of Chapter 11, led a group of
army and navy codebreakers who gave it their spare hours, and both Friedmans looked at it throughout their lives. None
produced a reading others accepted. Friedman came to suspect that it was not a cipher at all but an early attempt at an
artificial language, and that view, from a man who broke Purple, has had its followers since. Prescott Currier, an
American cryptanalyst, noticed in the 1970s that the text seems to fall into two "languages," called A and B, which differ
in their word frequencies, and in 2020 Lisa Fagin Davis, a manuscript scholar, used a study of the handwriting to argue
for five scribes. Other work has treated the text as statistics: letter-to-letter predictability that is unusually high
for a European language, word frequencies in a pattern like that of real language, and clusters of words that vary with
the picture on the page, which Marcelo Montemurro and Damián Zanette reported in 2013. Gordon Rugg answered in 2004 that
a table of prefixes, stems and suffixes, read through a cardboard grille, can make text with some of those features,
which would make the book a hoax. No claimed solution has held. Claims of a solution appear every few years, and as of my
reading they have been rejected by specialists, including the claims of an unusual reading as a proto-Romance language
in 2019.

### What a cryptanalyst can say without reading a word

Even with no reading, the length of the text lets us rule something out. The idea of **unicity distance**, from
[Chapter 2 of the cryptography book](../../book/02-Classical-Ciphers.md), says how much ciphertext is needed before
only one key gives sensible text. For a simple substitution of 26 letters the key space has $26!$ elements, which is
about $2^{88.4}$. If the language has about 3.2 bits of redundancy per letter, a few dozen letters should settle the
key:

$$U \approx \frac{H(K)}{D} = \frac{\log_2 26!}{3.2} \approx 28 \text{ letters.}$$

```python
import math
keys = math.log2(math.factorial(26))          # bits in a free choice of substitution alphabet
for name, redundancy in [("English", 3.2), ("Latin, about the same", 3.2)]:
    print(name, round(keys, 1), "bits of key,", round(keys / redundancy), "letters to settle it")
```

Output:

```
English 88.4 bits of key, 28 letters to settle it
Latin, about the same 88.4 bits of key, 28 letters to settle it
```

Twenty-eight is the threshold at which a unique answer exists, not the number needed to find it by hand, which is
several hundred. The Voynich text has about 35,000 words, or well over 100,000 characters. If it were a one-to-one
substitution of Latin, Italian, German or any other known European language, it would have been read by now. That rules
out the simplest explanations, and leaves the rest: a more complex cipher (several alphabets, a syllabary, a code book),
a natural language in an invented script that nobody has identified, an artificial or philosophical language, a
meaningless text that someone made on purpose (glossolalia, or a hoax), and some mix of these. The rest of the
Middle Ages gives you a model of at least two of them: Hildegard's invented script for a made-up vocabulary, and the
scribes' tricks of Section 5.2. It does not tell which, if any, applies here. I make no claim to know.

The Voynich manuscript is in this chapter because it is the one medieval secret the Middle Ages left that a modern
cryptanalyst cannot read, and because it shows how thin the record can be. Nothing in it, or in any document about it,
says it was meant as a secret.

!!! note "Life story: the Voynich manuscript"
    **Born:** the vellum between 1404 and 1438 (radiocarbon, 2009); the place and the author are unknown · **Purpose:**
    unknown; a herbal, an astronomy, a book of baths and recipes in an unread script, possibly a cipher, an invented
    language, or a hoax · **Helped:** drew the attention of Friedman, Currier and many others, and a literature on
    how to tell language from non-language by statistics · **Status:** unread; held at Yale's Beinecke Library, MS 408,
    since 1969, and digitized for the public

## 5.9 Meanwhile, elsewhere: Baghdad, Cairo and the Song court

*Level: beginner.*

All of this was going on while, in other parts of the world, cipher was a working tool with books written about it. A
reader of this chapter in isolation would think the Middle Ages had no cryptanalysis. That is true of Europe, as far as
the record shows. It was not true of the world.

Around 850, in Baghdad, al-Kindi wrote the oldest surviving description of frequency analysis, and in the centuries
after, writers in Baghdad, Damascus and Cairo set down how long a message must be for counting to work and how to break
ciphers in which a letter has several substitutes. In 1412 the Cairo secretary al-Qalqashandi put all of it in an
encyclopedia for the clerks of the Mamluk chancery. [Chapter 4](04-Baghdad-and-Cairo.md) tells that story at length.
In China the military encyclopedia *Wujing Zongyao*, compiled for the Song court between 1040 and 1044, describes a code
built on a poem: the two sides agreed on a poem of 40 characters, none repeated, and a list of 40 standard messages, one
per character, and an officer sent a message by marking the matching character with his seal. The Chinese traditions get
their own treatment in Chapter 8. Figure 5.6 puts the two worlds on the same time line.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="Two timelines from 700 to 1450: Europe's few cipher cases and the working cipher traditions of the Islamic world and China" fill="currentColor" font-size="14">
<text x="20" y="34" font-size="14" font-weight="bold">Europe</text>
<line x1="20" y1="60" x2="620" y2="60" stroke="currentColor" stroke-width="1.6"/>
<text x="20" y="130" font-size="14" font-weight="bold">Islamic world</text>
<text x="20" y="148" font-size="14" font-weight="bold">and China</text>
<line x1="20" y1="170" x2="620" y2="170" stroke="currentColor" stroke-width="1.6"/>
<g stroke="currentColor" stroke-width="1" opacity="0.5">
<line x1="40" y1="56" x2="40" y2="64"/><line x1="184" y1="56" x2="184" y2="64"/><line x1="328" y1="56" x2="328" y2="64"/><line x1="472" y1="56" x2="472" y2="64"/><line x1="580" y1="56" x2="580" y2="64"/>
<line x1="40" y1="166" x2="40" y2="174"/><line x1="184" y1="166" x2="184" y2="174"/><line x1="328" y1="166" x2="328" y2="174"/><line x1="472" y1="166" x2="472" y2="174"/><line x1="580" y1="166" x2="580" y2="174"/>
</g>
<g font-size="12" text-anchor="middle" opacity="0.8">
<text x="40" y="200">700</text><text x="184" y="200">900</text><text x="328" y="200">1100</text><text x="472" y="200">1300</text><text x="580" y="200">1450</text>
</g>
<g fill="currentColor">
<circle cx="98" cy="60" r="4"/><circle cx="126" cy="60" r="4"/><circle cx="234" cy="60" r="4"/><circle cx="366" cy="60" r="4"/><circle cx="537" cy="60" r="4"/><circle cx="559" cy="60" r="4"/>
</g>
<g font-size="11" text-anchor="middle">
<text x="98" y="46">Hygeburg</text><text x="126" y="82">Rök</text><text x="234" y="46">dots, Cynewulf</text><text x="366" y="46">Hildegard</text><text x="537" y="82">Ballymote</text><text x="559" y="46">Voynich</text>
</g>
<g fill="currentColor">
<circle cx="148" cy="170" r="5"/><circle cx="286" cy="170" r="5"/><circle cx="494" cy="170" r="5"/><circle cx="553" cy="170" r="5"/>
</g>
<g font-size="11" text-anchor="middle">
<text x="148" y="156">al-Kindi</text><text x="286" y="156">Wujing Zongyao</text><text x="494" y="156">ad-Durayhim</text><text x="553" y="134">al-Qalqashandi</text>
</g>
</svg>
<figcaption>Figure 5.6. Europe's medieval cases and the working traditions elsewhere. The lower line shows works on ciphers and codes; Latin Europe has no counterpart before the 1400s.</figcaption>
</figure>

Did Europe learn the art from the Arabic books? Ideas passed between the Islamic world and Latin Europe through Spain and
Sicily, and Arabic mathematics certainly reached Italy. But no one has found a European cipher text that cites an Arabic
one, and the European writers of the 1400s describe frequency analysis as if they had worked it out themselves. Chapter 4
gives the evidence on both sides.

What is the difference, then? I do not think it is cleverness. The difference is demand. The Abbasid caliphate and the
Mamluk sultanate ran empires through chanceries that wrote to governors by the week; the Song court had armies in the
field. Latin Europe, in the same centuries, had kings who traveled with their courts, bishops with small staffs, and a
reading class of a few thousand. There was no permanent diplomatic service. Letters were few and mostly carried by
people who could be trusted. In the 1200s paper mills began to spread through Italy, and a letter became cheap enough
that merchants, notaries and chanceries wrote far more of them. Francesco Datini, a merchant of Prato who died in 1410,
left a business archive of well over a hundred thousand letters. That is the kind of change that makes a message worth
reading and a cipher worth having, and the next chapters of this book are about it. This explanation is mine, an
inference from the pattern of the evidence, and I give it as that.

## 5.10 In the real world: what the sources say and do not say

*Level: intermediate.*

The cases of this chapter rest on very different kinds of evidence, and a reader who treats them alike will be misled. A
runestone in a field, a page in a Munich library, a tract copied six centuries after the script it describes, and a
letter that mentions an emperor's purchase are not the same kind of fact. Here is each case, with what the source
shows and what it does not.

| Case | What is there | What it shows | What it does not show |
|---|---|---|---|
| Hygeburg's line (c. 780, copy c. 800) | a line of cipher in Munich, Clm 1086, solved by Bischoff in 1931 | an English nun at Heidenheim used a vowel cipher to sign a book | why she hid her name, or whether other nuns did |
| Dots and next-consonant vowels (900s to 1000s) | passages in an English Aldhelm and a Cambridge Augustine | scribes in several houses knew the tricks | that any message was ever hidden from an enemy |
| Cynewulf (late 700s or 800s; copies late 900s) | rune signatures in four poems | an Old English poet signed in runes | who he was, or when he lived |
| Rök stone (800s) | the stone, about 700 runes | runes written with shift and cipher runes by the early 800s | what the text means, or who knew the cipher |
| Twig runes (1100s on) | inscriptions and later rune lists | a family-and-place cipher in use in Scandinavia | a use in war, trade or politics |
| Hildegard (1153 to 1180s) | the alphabet, the glossary, a letter | a named woman made an alphabet and a vocabulary | what they were for |
| Ogam Tract (copy c. 1390) | about 100 forms in manuscripts | Irish scholars enjoyed secret variants | when the forms were made, or that any were used to send a message |
| Roger Bacon (1200s) | a letter listing seven ways | a scholar argued for hiding knowledge from the crowd | that he used or invented a cipher |
| Equatorie (c. 1392) | a few words in symbols, solved by Price | a scholarly author used a cipher in English | who the author was |
| Voynich manuscript (1404 to 1438) | the codex, with a dated vellum | a text in an unknown script exists | what it says, or that it says anything |
| "Templar cipher" | an alphabet in modern books | nothing about the Templars | a single medieval use |

The table's last column is the important one, and it repeats itself. Across eleven cases, not one source says the cipher
was meant to hide a message from an opponent and was then used for that. The medieval case for secrecy by cipher
is weak as a story of states. It is strong, though, as a story of scholars, scribes and communities, and that is the story
the sources can bear.

### Can these be broken today?

Yes, every one that has a text to break, and mostly by a person with the text and no tools.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Vowel schemes (dots, next consonant, number words) | instantly | The consonants are untouched, so a reader fills the vowels in from the language. A program tries both readings of each `b`, `f`, `k`, `p`, `x` against a word list. |
| Rök-type shifts along the rune row | at once | A shift along a fixed row has a few dozen possible keys; try them all. |
| Twig runes | at once | Two small numbers per rune; the table is public. |
| Ogam Bricrenn | instantly | A number for each letter in alphabet order. |
| "Final" ogham | to several readings | Several letters share a last letter, so the language must choose. |
| Hildegard's *litterae ignotae* | in seconds | One new shape for each Latin letter: simple substitution under another name. Count the signs. |
| Hildegard's *Lingua ignota* | at once, with the glossary | It is a word list with Latin meanings beside it. Without the list it is a code, and a code is read by cross-referencing texts. |
| Alchemists' cover names | by scholarship, not by counting | Each name is a code word; the meaning comes from comparing many texts. |
| The *Equatorie*'s symbols | solved in 1955 | A few passages of simple substitution. |
| The Voynich manuscript | no one knows | If it is a cipher it is not a simple one, and it may not be one. |

### What the Middle Ages teach

Four things from the evidence of this chapter carry forward. First, **secrecy follows need**. A society with few letters,
a small reading class and trusted couriers does not build ciphers, and one with chanceries and armies does; the wait for
Europe was a wait for demand, not for an idea. Second, **a secret writing can be a signature, a game or a badge of
belonging**, and then it need not be strong, because it is aimed at a friend who knows the trick and not at an enemy who
does not. Third, **the best-attested people in this chapter are women**: a nun at Heidenheim, an abbess at the Rupertsberg
and the community of nuns around her, who read and wrote Latin when most men could not and who left the clearest marks of
secret writing in the period. The sources let us name Hygeburg and Hildegard; they do not let us say more than that about
the many scribes who stayed anonymous. Fourth, **a legend is cheaper than a document**. The Templar alphabet, the
supposed Bacon cipher and the "microscopic shorthand" of the Voynich manuscript all spread because they were interesting,
and each fails the test of Section 5.7.

## 5.11 Going deeper

*Level: expert.*

**The historiography.** The standard story of Europe's cryptographic beginnings, in Kahn and the books that follow him,
runs from Rome to the Italian courts of the 1300s and 1400s with very little between. That is mostly accurate about what
survives, but "what survives" is a filter, and it should not be mistaken for what happened. A secret key is the kind of
document that people destroy, and the oldest surviving European diplomatic cipher key (Gabriele de Lavinde's set for the
Avignon pope Clement VII, 1379, told in Chapter 6) is oldest surviving, not oldest made. The Arab and Chinese record
looks richer in part because those cultures kept compendia, such as al-Qalqashandi's, that quote their predecessors, and
Latin Europe in this period did not. Bernhard Bischoff's 1954 survey is a typology of the cipher passages found in
manuscripts: vowel replacement, letter replacement by another letter or number, foreign or invented alphabets, shorthand,
and others. Benjamin Saltzman's 2018 article, from its abstract, treats the same passages as evidence of scribal agency,
the evidence that scribes were active interpreters and not machines, and reads what look like textual errors inside cipher
passages as part of that evidence. I have worked from the abstract and the older secondary accounts, not from the full
article, and I do not claim to give its argument beyond that.

**The mathematics of ambiguity.** The vowel schemes of Section 5.2 are not ciphers in the sense of [Chapter 2 of the cryptography book](../../book/02-Classical-Ciphers.md), because they
have no key beyond the method, and the method belongs to the school. That is Kerckhoffs's point turned upside down: here
the system is public and nothing else is secret. They are also not uniquely decodable. In the next-consonant scheme the
letters $b, f, k, p, x$ in the ciphertext each stand for either themselves or a vowel, so a word with $k$ such letters
has $2^k$ readings. `hxgfbxrc` has four of them ($x, f, b, x$) and so sixteen, as Section 5.3 shows. A natural language
does the filtering: among those sixteen strings of letters, one is a Latin-looking name. The number of readings grows
exponentially in the number of ambiguous letters, which is why this works for a short signature and would be a poor way to
send a long letter that must be read by someone who does not already know the words.

For a substitution on a known language the right quantity is Shannon's unicity distance, $U = H(K)/D$, where $H(K)$ is the
entropy of the key and $D$ the redundancy per letter of the language. With $H(K) = \log_2 26! \approx 88.4$ bits and
$D \approx 3.2$ bits, $U \approx 28$ letters; Section 5.8 uses it on the Voynich text. The figure is a lower bound for
existence of a unique answer, not for the cost of finding it. It also assumes the language is known. A text in an unknown
language, in an invented script, is a harder problem than a cipher in a known one, because there is no model of the
plaintext to score the guesses against. That is the difficulty most often overlooked in claims about the Voynich
manuscript, and it is why one cannot say that "it would have been broken" without saying "if it were a simple substitution
of a known language."

**Dating.** Each date in this chapter comes from a different kind of evidence. The Munich manuscript is dated by its
script, to about 800, and the text it carries, by its own contents, to about 780. The Rök stone is dated by the form of
its runes, its ornament and its language, to the 800s, and "early in the century" is the common view, not a measurement.
The Book of Ballymote has a date from the circumstances of its copying, about 1390; the Ogam Tract inside it is older, by
an amount that depends on arguments about its language. The Voynich vellum is dated by radiocarbon, 1404 to 1438, which
dates the skin of the animal, not the writing; the writing could be later, though ink tests and the style of the
drawings are taken to agree. A careful reader asks, for each date in a book on this period, what kind of date it is.

**Open questions.**

- Was Hygeburg's line one scribe's trick or a habit of the Heidenheim school? One surviving example cannot say.
- Did the family-and-place twig runes grow out of the older shifts of the Rök carver, by a continuous tradition, or were
  they invented again? The gap in the evidence is three centuries.
- Were there European diplomatic ciphers before 1379 that were lost, or did they begin then? The wait of Chapter 6 is
  partly an argument about survival.
- What is the Voynich manuscript? A cipher, a language, a game, or a fraud; and if it is a cipher, which system?
- How much cipher practice, among nuns and scribes, went unrecorded because its users were not expected to be
  interesting? We know two names, and we should not assume that two is the count.

## Check yourself

??? question "1. Why did a medieval bishop trust a seal and a messenger more than a cipher?"

    The threat was a courier's tongue or a broken seal, and a letter in Latin was already unreadable to most people who
    might have taken it. A seal showed tampering, and the letter could say little and leave the real message to a
    trusted bearer. No enemy codebreaker existed in the West, so a cipher answered a problem nobody had.

??? question "2. About 46 percent of the letters in the Latin Genesis sample were vowels. Why does that make vowel schemes weak?"

    Blanking or replacing nearly half of the letters still leaves every consonant in its place, so each word keeps its
    shape, and a reader who knows Latin restores the vowels. The scheme hides the letters but not the language.

??? question "3. Decode `hkc fst lkbfr` (next-consonant cipher)."

    Read each `b`, `f`, `k`, `p`, `x` as itself or the vowel behind it: *hic est liber*, "this is the book."

??? question "4. Using the three families of Figure 5.3, what word is written by the pairs (1, 6), (2, 3), (2, 2)?"

    (1, 6) is *k*, (2, 3) is *i* and (2, 2) is *n*: *kin*.

??? question "5. Write the word *bad* in Ogam Bricrenn, as numbers of dots."

    B is the first letter, A the sixteenth and D the seventh: 1, 16, 7.

??? question "6. Why is \"final\" ogham not a true cipher?"

    Several letters have names that end in the same letter, so one ciphertext letter can stand for two to four plaintext
    letters (with the spellings of Figure 5.4, seven last letters are shared). Decryption is not unique, and the language
    must choose. A cipher must decrypt to one plaintext.

??? question "7. Hygeburg hid her name. Give a reason to call that a signature and not a secret."

    The cipher is a simple vowel trick that any Latin reader in a monastery could undo, it sits at the end of the book
    where a reader expects a colophon, and it records the author's name for later readers. A secret is hidden from
    someone, and nothing shows that anyone was meant to be kept from reading it.

??? question "8. The Voynich text has more than 100,000 characters. Why does that rule out a simple substitution of Latin, but not a cipher?"

    A simple substitution of a known language needs only about 28 letters in theory (unicity distance) and a few hundred
    in practice, so 100,000 characters would have solved it long ago. A more complex cipher, a code book, an invented
    script for an unknown language or a meaningless text is not excluded by length. The same length also makes it harder
    for a complex system to hide, which is part of why the question is open.

??? question "9. Why did Baghdad have books on breaking ciphers by 850 while Latin Europe had none before the 1400s?"

    The record suggests demand and not cleverness. The caliphate and later the Mamluk state ran empires through
    chanceries that wrote to governors constantly, so ciphers were used and broken, and the scholars who counted letters
    wrote it down. Latin Europe in those centuries had small courts, few letters and trusted couriers. A test: the first
    European breakers (Chapter 6) appear in the Italian states, where permanent embassies created the volume. This is an
    inference and not a settled finding.

??? question "10. A scholar says the Rök stone's cipher runes were a military code. What would you want to see before you agreed?"

    A document or a second inscription in which the cipher carries something tactical, a source saying it was used to
    send a message to anyone, and a reason for secrecy: an enemy. The stone is a memorial with riddles, and the carver
    boasting of skill (as at Maeshowe) is a simpler explanation. Apply the three questions of Section 5.7: is there a
    document, does a contemporary source say so, and who first made the claim?

## What you learned

- Medieval Europe had little cryptography because it had little need: few letters, a small reading class, trusted
  messengers and seals. The secret writing that survives is mostly the scribes' own.
- Scribes hid vowels with dots, the next consonant, or number words. Hygeburg, a nun at Heidenheim, signed her life of
  Willibald and Wynnebald that way, and Bernhard Bischoff read her name in 1931. These are signatures and puzzles.
- Cipher runes replace runes along the row (the Rök stone, 800s) or write each rune as a pair of numbers, family and
  place (twig runes). Ogham had about a hundred secret forms in the tract copied in 1390, such as Ogam Bricrenn, which
  gives each letter a count of dots.
- Hildegard of Bingen made an alphabet and a thousand-word invented vocabulary; why, no source says.
- Roger Bacon argued that secrets should be hidden from the crowd; he did not invent a cipher. The Voynich manuscript
  (vellum of 1404 to 1438) is unread, and its length rules out a simple substitution of a known language.
- Test a legend with three questions: is there a medieval document, does a contemporary source mention it, and who first
  printed it? The Templar cipher fails all three.
- Elsewhere, ciphers were working tools with books about them (al-Kindi, c. 850; the *Wujing Zongyao*, 1040 to 1044), and
  the difference with Europe looks like demand.

**Next:** Chapter 6, where permanent embassies create the demand, and the first
European codebreakers appear. For the terms, see the Glossary.

## Further reading

- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996): the early chapters on the Middle Ages and the Italian
  beginnings.
- Bernhard Bischoff, "Übersicht über die nichtdiplomatischen Geheimschriften des Mittelalters", *Mitteilungen des
  Instituts für Österreichische Geschichtsforschung* 62 (1954).
- Bernhard Bischoff, "Wer ist die Nonne von Heidenheim?", *Studien und Mitteilungen zur Geschichte des
  Benediktinerordens* 49 (1931).
- Benjamin A. Saltzman, "Vt hkskdkxt: Early Medieval Cryptography, Textual Errors, and Scribal Agency", *Speculum* 93, no.
  4 (2018), pp. 975-1009 (read from the abstract).
- Damian McManus, *A Guide to Ogam* (An Sagart, 1991).
- Sarah L. Higley, *Hildegard of Bingen's Unknown Language: An Edition, Translation, and Discussion* (Palgrave Macmillan,
  2007).
- Derek J. de Solla Price (ed.), *The Equatorie of the Planetis* (Cambridge University Press, 1955); Kari Anne Rand, "The
  Authorship of *The Equatorie of the Planetis* Revisited", *Studia Neophilologica* 87 (2015).
- Mary E. D'Imperio, *The Voynich Manuscript: An Elegant Enigma* (National Security Agency, 1978).
- Raymond Clemens (ed.), *The Voynich Manuscript* (Yale University Press, 2016).
- Gordon Rugg, "An Elegant Hoax? A Possible Solution to the Voynich Manuscript", *Cryptologia* 28, no. 1 (2004).
- Marcelo A. Montemurro and Damián H. Zanette, "Keywords and Co-Occurrence Patterns in the Voynich Manuscript: An
  Information-Theoretic Analysis", *PLOS ONE* 8 (2013).
- Lisa Fagin Davis, "How Many Glyphs and How Many Scribes? Digital Paleography and the Voynich Manuscript", *Manuscript
  Studies* 5 (2020).
- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System Technical Journal* 28 (1949): the unicity
  distance.
- The Beinecke Rare Book and Manuscript Library, Yale, MS 408 (digitized, with the 2009 radiocarbon report).

*Weaker sources used:* the dot and next-consonant examples and the wording of Hygeburg's cipher follow Thijs Porck's blog
post "Anglo-Saxon cryptography" (2017) and the Wikipedia article on Hygeburg; the Rök stone's date, rune count and four
ciphers follow Wikipedia and a 2022 Uppsala University news item on Henrik Williams's work; the ogham forms follow the
Wikipedia article on *In Lebor Ogaim*; the account of Hildegard's alphabet follows Garry J. Shaw's 2025 article in *World
History Encyclopedia*; the Wujing Zongyao poem code follows Ralph Sawyer's translation note and a conference summary; the
Datini figure and the Templar cipher's later origin are from general accounts and not traced to a first source.
