# 7. Printed Ciphers: Trithemius to Vigenère

*For a thousand years a cipher was a thing a clerk kept in a drawer. In 1518 it became a thing a stranger could buy in a bookshop. This chapter follows the century and a half in which the first printed books on secret writing appeared, and the six or seven people who wrote them: an abbot accused of calling up spirits, a secretary from Brescia, a Neapolitan who wrote on magic, a physician who solved the cubic equation, a French diplomat, and an English lord chancellor. Each one added a single idea, and the ideas add up to the cipher that carries Vigenère's name, which was not his. You will put a message through each of their methods by hand and by program, break two of them yourself, and find out why the strongest of them were hardly used for three hundred years.*

!!! abstract "In this chapter"
    **You will learn:**

    - why printing changed what a cipher could assume, and why every cipher in this chapter moves the secret out of the method and into something small that the user picks;
    - who Johannes Trithemius was, why a book of spirit names was taken for magic for two centuries, and how a clever hand solved its third book in the 1990s;
    - what the *tabula recta* and the progressive cipher are, and why Trithemius's version has no key at all;
    - who Giovan Battista Bellaso was and how his printed keyword turned Trithemius's table into a cipher you can change at will;
    - what Porta's reciprocal table, Cardano's grille, Vigenère's autokey and Bacon's two-letter alphabet added, and how each works;
    - why the strongest ciphers of the century sat on the shelf, with a model of the clerk's work you can run;
    - what the sources show about who invented what, and where the name "Vigenère cipher" went wrong.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) of this book (code, cipher and steganography told apart),
    [Chapter 4](04-Baghdad-and-Cairo.md) (counting letters as the breaker's tool) and
    [Chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) (nomenclators and Alberti's disk). The Vigenère table is taught in
    [book 1, section 2.6](../../book/02-Classical-Ciphers.md); how it is broken is taught in
    [the Cryptanalysis book, Chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md). This chapter does not repeat
    either: it tells who made each piece, and why.

    **Levels:** §7.1 to §7.5 are for beginners, §7.6 to §7.13 are intermediate, §7.14 is expert.

## 7.1 The problem

*Level: beginner.*

Suppose you are a secretary in an Italian chancery around the year 1500 and you must send a dispatch that your master's
rivals would pay to read. You have three tools, and none of them is good.

The first is a plain **substitution**: every letter of the alphabet gets a symbol, the same symbol every time. A clerk
can do it in his head. It is also the cipher that, as [Chapter 4](04-Baghdad-and-Cairo.md) showed, anyone who can count
can read, and by the 1470s there were clerks in Italy who could count: the rules that Cicco Simonetta wrote for the
Sforza court in 1474 are a list of ways to read a substitution without the key ([Chapter 6](06-Italy-Ambassadors-and-Nomenclators.md)).

The second is the **nomenclator**, the tool the Italian courts really used. It is a substitution with extras: several
symbols for each vowel, a few symbols that mean nothing, and a list of symbols for names and common words such as
*pope*, *Venice* and *money*. It beats a simple count. It also needs a table, the table must be copied, carried and kept
in step at both ends, and the day a courier loses it everything written under it is open.

The third is **Alberti's disk**, a ring of letters you turn in the middle of a message so that the alphabet changes. It is
the right idea, and it is a manuscript treatise of the 1460s that very few people had read.

What was missing was a cipher with two properties. It should not fall to counting letters, which means changing the
alphabet as you go. And it should be something you can *teach*, in a few pages, to a correspondent who lives three weeks'
ride away and has never met you.

The people in this chapter worked on that problem, and they had something no earlier cipher maker had: the printing
press. Johannes Gutenberg's Bible was printed in the 1450s, and within two generations there were presses in most
European cities that mattered. A book printed in Basel could be on a shelf in Naples within a year or two. This helps the
person who wants to teach a method and hurts the person who wants to keep one. A printed method is public.
Anyone who buys the book, including the enemy's chancery, knows exactly how your cipher works.

So the ciphers of this chapter all have to answer a question that Alberti, writing for one friend, could ignore: *if the
enemy has the book, what is left that he does not have?* The answers come one after another, and they make a short story:

- **Trithemius** (printed 1518) gives a table that changes the alphabet at every letter, and nothing else is secret.
  Anyone with the book reads the message. Nothing is left.
- **Bellaso** (1553) adds a **keyword**: a short word or phrase that tells you which alphabet to use at each letter. The
  method is public and the key is the secret, and the key can be changed in a moment.
- **Porta** (1563) gives a table in which encrypting and decrypting are the same act, and a square of 400 symbols for
  pairs of letters.
- **Vigenère** (1586) lets the message itself serve as the key, so that the key never repeats.

Alongside them come two ideas that are not about changing the alphabet. **Cardano** (1550) describes a card with holes
that you lay over a page, a way to hide that a message exists. **Bacon** (1623) shows how to write any letter with two
marks, and so to hide a message in anything that can be seen in two forms.

Figure 7.1 puts the dates on one line. The faded entries are not in this chapter. Alberti is on the line because
everything starts with his disk, and Kasiski is on it because he is where the story of these ciphers ends.

<figure class="mars-fig">
<svg viewBox="0 0 640 432" width="640" role="img" aria-label="Timeline of printed ciphers from Trithemius in 1499 to Wilkins in 1641, with Alberti before and Kasiski after" fill="currentColor" font-size="14">
<line x1="112" y1="8" x2="112" y2="424" stroke="currentColor" stroke-width="1.6"/>
<text x="98" y="33" font-size="14" text-anchor="end" font-weight="bold" opacity="0.6">c. 1467</text>
<circle cx="112" cy="28" r="3.5" fill="currentColor" opacity="0.6"/>
<text x="128" y="33" font-size="14" text-anchor="start" opacity="0.6">Alberti writes his cipher treatise (Chapter 6)</text>
<text x="98" y="67" font-size="14" text-anchor="end" font-weight="bold">c. 1499</text>
<circle cx="112" cy="62" r="3.5" fill="currentColor"/>
<text x="128" y="67" font-size="14" text-anchor="start">Trithemius writes the Steganographia</text>
<text x="98" y="101" font-size="14" text-anchor="end" font-weight="bold">1508</text>
<circle cx="112" cy="96" r="3.5" fill="currentColor"/>
<text x="128" y="101" font-size="14" text-anchor="start">Trithemius finishes the Polygraphia</text>
<text x="98" y="135" font-size="14" text-anchor="end" font-weight="bold">1518</text>
<circle cx="112" cy="130" r="3.5" fill="currentColor"/>
<text x="128" y="135" font-size="14" text-anchor="start">Polygraphia printed, two years after his death</text>
<text x="98" y="169" font-size="14" text-anchor="end" font-weight="bold">1550</text>
<circle cx="112" cy="164" r="3.5" fill="currentColor"/>
<text x="128" y="169" font-size="14" text-anchor="start">Cardano: the grille and an autokey</text>
<text x="98" y="203" font-size="14" text-anchor="end" font-weight="bold">1553</text>
<circle cx="112" cy="198" r="3.5" fill="currentColor"/>
<text x="128" y="203" font-size="14" text-anchor="start">Bellaso prints the keyword</text>
<text x="98" y="237" font-size="14" text-anchor="end" font-weight="bold">1563</text>
<circle cx="112" cy="232" r="3.5" fill="currentColor"/>
<text x="128" y="237" font-size="14" text-anchor="start">Porta: reciprocal table and a 400-symbol pair square</text>
<text x="98" y="271" font-size="14" text-anchor="end" font-weight="bold">1586</text>
<circle cx="112" cy="266" r="3.5" fill="currentColor"/>
<text x="128" y="271" font-size="14" text-anchor="start">Vigenère's Traicté des chiffres, with a true autokey</text>
<text x="98" y="305" font-size="14" text-anchor="end" font-weight="bold">1623</text>
<circle cx="112" cy="300" r="3.5" fill="currentColor"/>
<text x="128" y="305" font-size="14" text-anchor="start">Bacon describes the two-letter (biliteral) cipher</text>
<text x="98" y="339" font-size="14" text-anchor="end" font-weight="bold">1624</text>
<circle cx="112" cy="334" r="3.5" fill="currentColor"/>
<text x="128" y="339" font-size="14" text-anchor="start">Duke August prints the first great handbook</text>
<text x="98" y="373" font-size="14" text-anchor="end" font-weight="bold">1641</text>
<circle cx="112" cy="368" r="3.5" fill="currentColor"/>
<text x="128" y="373" font-size="14" text-anchor="start">Wilkins's Mercury, the first in English</text>
<text x="98" y="407" font-size="14" text-anchor="end" font-weight="bold" opacity="0.6">1854-63</text>
<circle cx="112" cy="402" r="3.5" fill="currentColor" opacity="0.6"/>
<text x="128" y="407" font-size="14" text-anchor="start" opacity="0.6">Babbage and Kasiski break the keyword (Chapter 10)</text>
</svg>
<figcaption>Figure 7.1. The printed ciphers on one line. The faded entries belong to other chapters: Alberti's disk before, and the breaking of the keyword cipher after.</figcaption>
</figure>

Three things the chapter does not do. It does not teach the Vigenère table, which book 1 does, and it does not teach
how a keyword cipher is broken, which the Cryptanalysis book does. And it does not pretend the record is better than it
is. Much of what is told about these people comes from one book, David Kahn's *The Codebreakers*, and from a few printed
treatises that survive in libraries; where a date, a name or a claim rests on little, the sentence says so.

## 7.2 The abbot of Sponheim

*Level: beginner.*

The first of them is the hardest to place, because he was three or four people at once: a monk, a scholar, a collector of
books, and a man whose enemies said he talked to demons.

**Johannes Trithemius** was born on 1 February 1462 in Trittenheim, a village on the Moselle, and took his name from it.
His family name was Heidenberg. His father died when he was young, and he taught himself to read Latin against the wishes
of a stepfather who wanted him in the fields. The story of how he became a monk is too good to leave out, though it rests on later retelling. As it is
usually told, in 1482, on his way home from university, he was caught by a snowstorm and took shelter in the Benedictine abbey of Sponheim, near Bad Kreuznach. He stayed. In 1483, at the age of
twenty-one, the monks elected him abbot.

The abbey he inherited was poor and, by his account, slack. He spent twenty-three years making it a place that scholars
visited. His great project was the library. By his own count it grew from a few dozen volumes to about two thousand, which
in a German monastery of the 1490s was a great collection, and he welcomed scholars to read in it. Some of the great names
of the German humanist circle came to Sponheim.

It is easy to miss the irony in this. In 1492 Trithemius wrote a short treatise, *De laudibus scriptorum* ("In Praise of
Scribes"), arguing that monks must go on copying books by hand. His reasons were practical as well as pious. Parchment
lasts a thousand years, he said, and paper not even two hundred, and a monk who copies a text learns it by heart in a way
that a man who buys it does not. Then he had the treatise printed, in 1494, because a press was the way to reach readers.
He seems to have seen that printing was both a threat to his order's old work
and the only way to spread a new one. That is the man who wrote the first printed book on cryptography.

By 1506 Trithemius was in trouble at Sponheim. His discipline was
resented, and he left after a long quarrel with the monks (the accounts differ on its causes). He became abbot of the Scottish monastery of
St James at Würzburg, in Franconia, and held the post until his death on 13 December 1516. He wrote histories, lives of
saints, lists of famous Benedictines and a catalog of ecclesiastical writers. He also wrote the two books that matter
here, the *Steganographia* and the *Polygraphia*, and he kept up a correspondence with half the educated men of Germany.

Two small pieces of that correspondence show the kind of company he kept, and the kind of reputation he had.

In a letter of 20 August 1507 to the astronomer and astrologer Johannes Virdung, Trithemius complains about a vagabond who
has been going round the towns of southern Germany calling himself "Georgius Sabellicus, Faustus junior, the fountain of
necromancers" and boasting that he could repeat all the works of Plato and Aristotle if they were lost. Trithemius calls
him a fool and a rogue. It is the oldest surviving mention of a man named Faust, and it is a mention by a man who was
himself, in some people's eyes, no better.

In 1510 a young man named Heinrich Cornelius Agrippa, who was writing a long book on magic, wrote to Trithemius about it
and asked his opinion. The reply that survives is an abbot's advice to a friend, and it is a good summary of the
secrecy of the age. Tell no one what you have written, Trithemius says; the common must be given common things, and in the
usual English rendering of the saying, hay for oxen and sugar for parrots. Do not give the crowd what is meant for the
learned. It is the same thought Roger Bacon had put forward in the thirteenth century ([Chapter 5](05-The-Medieval-World.md)),
that a secret should be written so that the crowd cannot read it, and it is the habit of mind that produced the
*Steganographia*.

One more fact about the man should be on the page, because a book about hidden writing owes its readers the warning.
Trithemius was not above forgery. His history of the Franks, finished in 1514, rests on the testimony of an ancient
chronicler named Hunibald, and no manuscript of any such chronicler has ever been found. Modern historians generally
judge that Hunibald, and some other authorities that Trithemius cited, were his invention, produced to give the German
nobility an older and nobler past than the sources allowed. I put this here because it bears on how much weight to give
to anything he says about his own books, such as the claim, which comes up in the next section, that the *Steganographia*
is not about magic.

!!! note "Life story: Johannes Trithemius"
    **Born:** 1 February 1462, Trittenheim on the Moselle; abbot of Sponheim from 1483, of St James at Würzburg from 1506;
    died at Würzburg on 13 December 1516 · **Purpose:** to build a great library, to restore monastic learning, and to
    write a method of sending a secret to an absent person · **Helped:** the *Steganographia* (about 1499), the
    *Polygraphia* (finished 1508, printed 1518), the word *steganography*, a library of some two thousand books by his own
    count, and a generation of German humanists who came to read in it · **Status:** the first author of a printed book on
    cryptography; also the author of a forged chronicle and the subject of a reputation for magic he never lost.

## 7.3 The book that looked like magic

*Level: beginner.*

The *Steganographia* is a strange book to have come from a monastery. Its full Latin title, as it is usually given,
promises "the sure art of opening one's mind to the absent through hidden writing." It is a Latin work in three books,
written about 1499 or 1500, and from the first page it reads as a manual for conjuring spirits.

The first book is about messengers. It names a long list of spirits, each with a rank, a direction of the compass, a
planetary hour at which he can be called, and a number of lesser spirits under him, and it gives for each the form of
words by which he is to be invoked. You write a message on a sheet of paper, call the spirit by the proper words, and
the spirit carries the message to the person you want, wherever he is, faster than a courier could ride. The second book
has more of the same. The third is a book of tables of numbers and the names of spirits connected with the planets, with
the hours and the signs of the zodiac.

It is easy to see why readers who opened the book took it for what it looked like. The prayers are in Latin, the names
are in a made-up language (the first spirit of the first book is called, in the manuscripts, something like Pamersiel),
and the claims are enormous. Trithemius lent copies, and readers who borrowed them took the book for black magic and said so. It
circulated in manuscript for a century. It was printed at Frankfurt in 1606 and placed on the Catholic Church's Index of
Prohibited Books in 1609.

But the book is not about spirits. In the first two books the "invocations" are cover texts, and the real message is
hidden inside them by a rule: you take certain letters of certain words, discard the rest and read what is left. The
spirits are the cover story, and they are a very good one. A letter that opened with an invocation of a spirit would
not be read by a nervous clerk twice, and a reader who thought it was an incantation would be quite certain that
nothing in it could be a cipher. The key to the first two books was published in the seventeenth century; the usual credit goes to Duke August
of Brunswick-Lüneburg, writing as Gustavus Selenus in 1624, and to Wolfgang Ernst Heidel in 1676. After that the
spirits fell away for anyone who read the keys. What had been taken for conjuring was a handbook of steganography, which is the word that Trithemius
made popular and which means, as [Chapter 1](01-Why-People-Hid-Writing.md) explained, hiding that a message exists.

The third book resisted. Its pages of numbers did not give up their meaning to the key that opened the first two, and for
centuries it was taken to be what it claimed to be, a book of real planetary magic. Then, in the
1990s, two people solved it separately. A German student named Thomas Ernst published a solution in 1996 in a German
journal, and Jim Reeds, a mathematician at AT&T Labs who had not seen the German paper, published a solution in the
journal *Cryptologia* in 1998. They agreed. The numbers are a cipher: working them out gives plain Latin, among it, in
one case, a warning that the bearer of the letter is a rogue and a thief. The third book was cryptography in the same
disguise as the other two, and it had taken until the 1990s to see through it.

What does the book show? Four things, and they are worth keeping apart.

First, that Trithemius was a real steganographer and a very clever one. A message hidden under a prayer is safer
than one hidden in something that looks like a trick, because nobody searches a prayer.

Second, that his reputation as a magician may have been partly his own work. It is possible that he meant the cover story
to be believed by some readers, since a book of magic is exactly what a nervous reader will not search for a cipher. It is
also possible that he meant it as a joke on the credulous, or that he half believed it. The sources do not tell us. He
defended the book later, but, as the end of §7.2 warned, a man who forged Hunibald is not the best witness to his own
intentions.

Third, that the book which gave the subject its name was read by many people for centuries as a book of magic. The word
"cryptography" was not yet in use; it appears in print in the title of Selenus's treatise of 1624. Readers saw angels and
did not look for the method.

Fourth, and this is the point I would most like a reader to carry away: the reception is part of the story. A cover story
protects a message by changing what the reader expects to find. Whether or not Trithemius planned it, readers who met a
list of spirits did not go looking for a cipher, and it took more than a century, and the printing of a key, to
make them. It is an early case of a lesson that comes back in every chapter of this book: what protects a message, or
fails to, is often the people around the cipher and what they expect, not the cipher itself.

!!! note "Life story: the Steganographia"
    **Born:** about 1499, at Sponheim; in manuscript for a century, printed at Frankfurt in 1606 and placed on the Index in
    1609 · **Purpose:** to show how to send a hidden message to an absent person under the cover of invocations to spirits
    · **Helped:** the modern word *steganography*, a long argument about magic and cryptography, and the Renaissance habit of
    dressing a technical book as occult wisdom · **Status:** Books I and II explained in print by Selenus (1624) and Heidel
    (1676); Book III solved by Thomas Ernst (1996) and Jim Reeds (1998); read today as an early work of steganography.

## 7.4 The *Polygraphia*: ciphers that read like prayers

*Level: beginner.*

The *Steganographia* circulated in manuscript and alarmed some of its readers. The *Polygraphia* ("many
writings") was written to be used. Trithemius finished it in 1508, and as far as I know it is dedicated to the Emperor
Maximilian I, but it was not printed until 1518, two years after the author's death, by the publisher Johann Haselberg of Constance.
Library catalogs give the place as Oppenheim, and some older lists give Basel; I do not know which is right. It is in six
books and it was a success. It went through several editions, and a French translation by Gabriel de Collange appeared in
Paris in 1561, which is a sign that readers outside Germany wanted it. It is the first printed book on cryptography.

What a reader found inside were tables. The first books are not tables of the kind we draw today. For each letter of the
Latin alphabet Trithemius gives a list of Latin words, and a message is written by putting a word where each letter was.
The words are chosen, in the best-known of these tables, so that the finished text reads as a Latin prayer: a string of
*Deus*, *Creator*, *Clemens* and *Maria*, which a bishop's censor would pass without a second look. One of these is
often called the "Ave Maria" cipher.

Here is a cipher in the strict sense of [Chapter 1](01-Why-People-Hid-Writing.md), because each word stands for a *letter*,
not for a meaning. It is also steganography, because the whole point is that the page looks like a prayer. A table that
does both is unusual. It also costs a great deal. Every letter of the message becomes a whole word of the prayer, so a
dispatch of a thousand letters becomes a thousand words, perhaps seven or eight times as long on the page. Nobody was going to
send the ambassador's reports to Rome that way, and I do not think Trithemius meant anyone to. The tables are for the
message that has to look like something else.

The code below builds a table of this kind. The words are my own, not his, and I have only the 22 letters Latin used in
Trithemius's time (no J, K, U or W). Each letter has two words, and the program takes them in turn, so that a repeated
letter is sometimes written with a different word.

```python
# a prayer cipher in the spirit of Trithemius: each letter has two words, used in turn
table = {
 "A": ("Deus", "Domine"),     "B": ("Pater", "Creator"),   "C": ("Rex", "Lux"),
 "D": ("Sanctus", "Clemens"), "E": ("Amen", "Gloria"),     "F": ("Fides", "Pax"),
 "G": ("Agnus", "Gratia"),    "H": ("Spes", "Caritas"),    "I": ("Christe", "Iesu"),
 "L": ("Maria", "Mater"),     "M": ("Angelus", "Martyr"),  "N": ("Nomen", "Nox"),
 "O": ("Omnipotens", "Opus"), "P": ("Populus", "Preces"),  "Q": ("Quaesumus", "Qui"),
 "R": ("Regnum", "Redemptor"),"S": ("Salus", "Spiritus"),  "T": ("Tibi", "Tuus"),
 "V": ("Virgo", "Verbum"),    "X": ("Xristus", "Exaudi"),  "Y": ("Ymnus", "Ymago"),
 "Z": ("Zelus", "Zephyrus"),
}
back = {word: letter for letter, words in table.items() for word in words}

def to_prayer(message):
    out = []
    for i, ch in enumerate(message):
        if ch in table:
            out.append(table[ch][i % 2])     # take the two words in turn
    return " ".join(out)

def from_prayer(text):
    return "".join(back[word] for word in text.split())

secret = to_prayer("SENDSILVERTOBRESCIA")
print(secret)
print(from_prayer(secret))
```

Output:

```
Salus Gloria Nomen Clemens Salus Iesu Maria Verbum Amen Redemptor Tibi Opus Pater Redemptor Amen Spiritus Rex Iesu Deus
SENDSILVERTOBRESCIA
```

*Try it.* Use the table to write HELP as a prayer, and then read the result back by hand without the program. Then
notice what the exercise already tells you: the reader must have the table. Trithemius printed the table. Anyone who
owned the book, a spy, a bishop, a customs officer who had read it, read the message. That is the print problem of §7.1
in its plainest form, and the *Polygraphia* has a second half that tries to answer it.

## 7.5 A table with no key

*Level: beginner.*

The rest of the *Polygraphia*, and the part that mattered, is a square. Trithemius writes the alphabet in a row. Under it
he writes the alphabet again, moved one place to the left, so that A is replaced by B, B by C and the last letter wraps
round to the front. Under that he writes it moved two places, and so on until each letter has been the first. As I
understand it his Latin alphabet had 24 letters, and so the square has 24 rows. The one we draw today has 26. The result is
the **tabula recta**, "the straight table." Every row is an ordinary Caesar shift, and the table is a catalog of all the
shifts there are.

Here is how he uses it. He does not choose a row and stay in it, which would be a Caesar cipher and as weak. He moves down
one row at every letter. The first letter of the message is written with the first row, the second with the second row, the
third with the third, and when the rows run out he starts again from the top. This is the **progressive cipher**, and it
changes the alphabet with every single letter, not every few words as Alberti's disk did.

<div class="mars-steps" markdown>

1. Write the message with its places numbered from 0: H is 0, O is 1, L is 2, D is 3.
2. The number is the row. Row 0 is the plain alphabet, row 1 is the alphabet moved one place, row 2 two places.
3. Find the plain letter at the top of the table and read down to its row. H in row 0 is H.
4. O in row 1 is P. L in row 2 is N. D in row 3 is G.
5. Keep going. After the 26th letter the rows begin again at row 0.

</div>

Figure 7.2 shows the first eight rows with the cells for HOLDHOLD picked out. The message says the same four letters
twice, and the cipher says something different each time: HPNGLTRK.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The first eight rows of the tabula recta. Plain letters H, O, L, D, H, O, L, D are looked up in rows 0 to 7 and come out as H, P, N, G, L, T, R, K" fill="currentColor" font-size="14">
<text x="329" y="16" font-size="13" text-anchor="middle" font-style="italic">plain letter (column)</text>
<text x="66.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">A</text>
<text x="87.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">B</text>
<text x="108.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">C</text>
<text x="129.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">D</text>
<text x="150.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">E</text>
<text x="171.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">F</text>
<text x="192.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">G</text>
<text x="213.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">H</text>
<text x="234.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">I</text>
<text x="255.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">J</text>
<text x="276.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">K</text>
<text x="297.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">L</text>
<text x="318.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">M</text>
<text x="339.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">N</text>
<text x="360.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">O</text>
<text x="381.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">P</text>
<text x="402.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">Q</text>
<text x="423.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">R</text>
<text x="444.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">S</text>
<text x="465.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">T</text>
<text x="486.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">U</text>
<text x="507.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">V</text>
<text x="528.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">W</text>
<text x="549.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">X</text>
<text x="570.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">Y</text>
<text x="591.5" y="34" font-size="11" text-anchor="middle" font-weight="bold">Z</text>
<text x="48" y="55" font-size="11" text-anchor="end" font-weight="bold">0</text>
<text x="66.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="87.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="108.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="129.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="150.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="171.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="192.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<text x="213.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="234.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="255.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="276.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="297.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="318.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="339.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="360.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="381.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="402.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="423.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="444.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="465.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="486.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="507.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="528.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="549.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="570.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="591.5" y="55" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="48" y="77" font-size="11" text-anchor="end" font-weight="bold">1</text>
<text x="66.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="87.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="108.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="129.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="150.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="171.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<text x="192.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="213.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="234.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="255.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="276.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="297.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="318.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="339.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="360.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="381.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="402.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="423.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="444.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="465.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="486.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="507.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="528.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="549.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="570.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="591.5" y="77" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="48" y="99" font-size="11" text-anchor="end" font-weight="bold">2</text>
<text x="66.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="87.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="108.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="129.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="150.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<text x="171.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="192.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="213.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="234.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="255.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="276.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="297.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="318.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="339.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="360.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="381.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="402.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="423.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="444.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="465.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="486.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="507.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="528.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="549.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="570.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="591.5" y="99" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="48" y="121" font-size="11" text-anchor="end" font-weight="bold">3</text>
<text x="66.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="87.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="108.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="129.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<text x="150.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="171.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="192.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="213.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="234.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="255.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="276.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="297.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="318.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="339.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="360.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="381.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="402.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="423.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="444.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="465.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="486.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="507.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="528.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="549.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="570.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="591.5" y="121" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="48" y="143" font-size="11" text-anchor="end" font-weight="bold">4</text>
<text x="66.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="87.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="108.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<text x="129.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="150.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="171.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="192.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="213.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="234.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="255.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="276.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="297.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="318.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="339.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="360.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="381.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="402.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="423.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="444.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="465.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="486.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="507.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="528.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="549.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="570.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="591.5" y="143" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="48" y="165" font-size="11" text-anchor="end" font-weight="bold">5</text>
<text x="66.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="87.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<text x="108.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="129.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="150.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="171.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="192.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="213.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="234.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="255.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="276.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="297.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="318.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="339.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="360.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="381.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="402.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="423.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="444.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="465.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="486.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="507.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="528.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="549.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="570.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="591.5" y="165" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="48" y="187" font-size="11" text-anchor="end" font-weight="bold">6</text>
<text x="66.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<text x="87.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="108.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="129.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="150.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="171.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="192.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="213.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="234.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="255.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="276.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="297.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="318.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="339.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="360.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="381.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="402.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="423.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="444.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="465.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="486.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="507.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="528.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="549.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="570.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="591.5" y="187" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="48" y="209" font-size="11" text-anchor="end" font-weight="bold">7</text>
<text x="66.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">H</text>
<text x="87.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">I</text>
<text x="108.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">J</text>
<text x="129.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">K</text>
<text x="150.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">L</text>
<text x="171.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">M</text>
<text x="192.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">N</text>
<text x="213.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">O</text>
<text x="234.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">P</text>
<text x="255.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">Q</text>
<text x="276.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">R</text>
<text x="297.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">S</text>
<text x="318.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">T</text>
<text x="339.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">U</text>
<text x="360.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">V</text>
<text x="381.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">W</text>
<text x="402.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">X</text>
<text x="423.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">Y</text>
<text x="444.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">Z</text>
<text x="465.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">A</text>
<text x="486.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">B</text>
<text x="507.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">C</text>
<text x="528.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">D</text>
<text x="549.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">E</text>
<text x="570.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">F</text>
<text x="591.5" y="209" font-size="11" text-anchor="middle" opacity="0.8">G</text>
<rect x="204" y="42" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<rect x="351" y="64" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<rect x="288" y="86" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<rect x="120" y="108" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<rect x="204" y="130" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<rect x="351" y="152" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<rect x="288" y="174" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<rect x="120" y="196" width="19" height="19" rx="3" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.6"/>
<text x="22" y="128" font-size="12" text-anchor="middle" font-style="italic" transform="rotate(-90 22 128)">row = place in the message</text>
<text x="56" y="250" font-size="13" text-anchor="start">plain</text>
<text x="56" y="276" font-size="13" text-anchor="start">cipher</text>
<text x="136" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<line x1="136" y1="254" x2="136" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="136" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">H</text>
<text x="180" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<line x1="180" y1="254" x2="180" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="180" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="224" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L</text>
<line x1="224" y1="254" x2="224" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="224" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="268" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<line x1="268" y1="254" x2="268" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="268" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">G</text>
<text x="312" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<line x1="312" y1="254" x2="312" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="312" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">L</text>
<text x="356" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<line x1="356" y1="254" x2="356" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="356" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="400" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L</text>
<line x1="400" y1="254" x2="400" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="400" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="444" y="250" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<line x1="444" y1="254" x2="444" y2="262" stroke="currentColor" stroke-width="1.1"/>
<text x="444" y="276" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">K</text>
</svg>
<figcaption>Figure 7.2. The first eight rows of the tabula recta (the full table has 26). The boxed cells are the ones used to write HOLDHOLD, one per row. The same four letters come out as HPNG the first time and LTRK the second.</figcaption>
</figure>

The code does the same thing for a whole message and checks that going back the other way recovers it.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def row(n):
    return A[n:] + A[:n]                     # row n of the tabula recta: the alphabet turned n places

for n in range(4):
    print(row(n))

def progressive(text, sign=1):
    # letter 1 uses row 0, letter 2 row 1, letter 3 row 2 ... and after row 25 it starts again
    return "".join(row(sign * i % 26)[A.index(ch)] for i, ch in enumerate(text))

secret = progressive("HOLDTHEBRIDGE")
print(secret)
print(progressive(secret, -1))
```

Output:

```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
BCDEFGHIJKLMNOPQRSTUVWXYZA
CDEFGHIJKLMNOPQRSTUVWXYZAB
DEFGHIJKLMNOPQRSTUVWXYZABC
HPNGXMKIZRNRQ
HOLDTHEBRIDGE
```

The cipher does flatten the letter counts, which the next section measures. What it lacks is a key. Look at the steps
again: there is nothing in them that two people have to agree on beforehand except the table, and the table is in the
book. A clerk who writes a message this way hides the letters from a reader who counts and hides nothing from a reader
who owns the *Polygraphia* or has been told its name. Trithemius, as far as I can tell from the descriptions of his
book, never says the table keeps a secret. He presents it as a handy and orderly way of writing. Whether he saw it as a
defense against counting letters I cannot say from the sources I have used, and I have not found a historian who can.

A user could have turned it into a keyed cipher with one change: start at row 5 instead of row 0, and agree on 5. That
gives 26 starting points and no more, which a patient reader would try in a quarter of an hour. Nothing in the book
suggests it, as far as I know. The next step in the story is a better one.

*Break it.* The ciphertext below was written with Trithemius's progressive cipher and no key. Decrypt the first six letters
by hand with the steps above, going the other way (row 0, row 1, row 2 ... backward), then check it with `progressive("SFPGXMKZQUFPDGCCYXZM", -1)`.

```
SFPGXMKZQUFPDGCCYXZM
```

The first six letters are SENDTH. It is the instruction a courier would not want a customs officer to read.

!!! note "Life story: the tabula recta"
    **Born:** the *Polygraphia* of Johannes Trithemius, finished in 1508 and printed in 1518; its rows are Caesar's shifts,
    gathered into a square, and Alberti's disk (about 1467) already changed the alphabet in the middle of a message ·
    **Purpose:** to give a clerk an orderly table in which the alphabet changes at every letter · **Helped:** every later
    polyalphabetic cipher: Bellaso's, Vigenère's and Beaufort's are all this table with a different way of choosing the
    row · **Status:** still the standard picture of the keyword cipher in textbooks, including
    [book 1](../../book/02-Classical-Ciphers.md); as a cipher it has no key, so it is broken by anyone who knows the method.

## 7.6 Bellaso and the countersign

*Level: intermediate.*

The step from Trithemius to a real cipher was made by a man most people have never heard of, and for most of the
following four centuries the credit went to someone else.

**Giovan Battista Bellaso** (sometimes spelled Belaso) was a gentleman of Brescia, which in his day belonged to the
Republic of Venice. He worked as a secretary, which is to say he spent his days writing and enciphering the letters of
great men, and the little we know of his patrons comes from the title pages and prefaces of his own books. Vigenère, who
read him, says Bellaso served Cardinal Rodolfo Pio da Carpi. Bellaso himself names a Cardinal Duranti (a cardinal of that name was bishop of Brescia
in the 1550s). He has left no portrait, no birth date that I have found and no letters. What he left
was a short series of printed booklets. In 1553 came *La cifra del Sig. Giovan Battista Bellaso*, printed at Venice. In
1555 came *Novi et singolari modi di cifrare*, "new and singular ways of ciphering," and in 1564 a longer one, *Il vero
modo di scrivere in cifra con facilità, prestezza et securezza*, "the true way of writing in cipher with ease, speed and
security."

Read that last title again. Ease, speed, security: three properties, written by a working secretary in 1564, who put the
user's convenience first and the breaker last. Francis Bacon will list three properties of a good cipher in 1623, and
[Chapter 1](01-Why-People-Hid-Writing.md) quotes them. Ease and safety are on Bacon's list, and Bellaso put them on his
title page sixty years before, with speed beside them, which was the clerk's own worry.

His idea, in the 1553 booklet, was the one thing Trithemius had left out. Bellaso called it the **contrasegno**, the
countersign. It is a word or a phrase that the two correspondents agree on beforehand. You write it above the message,
repeating it as often as the message needs, and each letter of the countersign tells you which alphabet to use for the
letter beneath it. A word of four letters gives four alphabets, used in turn. That is all.

Now look at what has changed. The method is as public as Trithemius's, since it is in a printed book. The key is a few
letters. It can be agreed in a sentence at the dinner table, memorized, never written down, changed when a courier is
captured and changed again next week. A nomenclator had to be copied out on paper and carried. A countersign could be
carried in a man's head. The method can be public, because the secret has moved into the key, and that is the principle
that Kerckhoffs will state in 1883 ([Chapter 10](10-The-Telegraph.md)) and every modern cipher follows.

One detail of Bellaso's version differs from the cipher we know. His alphabets in the 1553 booklet were *reciprocal*: they
swapped letters in pairs, so that the same table both enciphers and deciphers. The cipher that is called Vigenère's today
uses Trithemius's shifted rows instead, with the row picked by the keyword letter. The two are cousins. The Vigenère
cipher of the textbooks is Trithemius's table driven by Bellaso's countersign.

The working is easy to see. Take the countersign ROME and the message THEDUKEHASSENT. Write ROME under it, repeating, and
shift each letter by its countersign letter, counting A as 0: T (19) shifted by R (17) is 36, which is 10 after taking away
26, and 10 is K. H (7) shifted by O (14) is 21, which is V. E by M gives Q, and D by E gives H. Then the countersign starts
again with R. Figure 7.3 shows the whole row.

<figure class="mars-fig">
<svg viewBox="0 0 640 200" width="640" role="img" aria-label="The message THEDUKEHASSENT over the repeating keyword ROME and the cipher letters; every fourth column shares one key letter and is a plain Caesar shift" fill="currentColor" font-size="14">
<text x="8" y="58" font-size="13" text-anchor="start" font-style="italic">message</text>
<text x="8" y="108" font-size="13" text-anchor="start" font-style="italic">keyword</text>
<text x="8" y="158" font-size="13" text-anchor="start" font-style="italic">cipher</text>
<rect x="76" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="92.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="76" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="92.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="76" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="92.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">K</text>
<line x1="92.0" y1="68" x2="92.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="92.0" y1="118" x2="92.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="112" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="128.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<rect x="112" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="128.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="112" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="128.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">V</text>
<line x1="128.0" y1="68" x2="128.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="128.0" y1="118" x2="128.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="148" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="164.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="148" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="164.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="148" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="164.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<line x1="164.0" y1="68" x2="164.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="164.0" y1="118" x2="164.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="184" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="200.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<rect x="184" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="200.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="184" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="200.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">H</text>
<line x1="200.0" y1="68" x2="200.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="200.0" y1="118" x2="200.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="220" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="236.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<rect x="220" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="236.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="220" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="236.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">L</text>
<line x1="236.0" y1="68" x2="236.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="236.0" y1="118" x2="236.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="256" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="272.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">K</text>
<rect x="256" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="272.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="256" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="272.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<line x1="272.0" y1="68" x2="272.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="272.0" y1="118" x2="272.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="292" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="308.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="292" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="308.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="292" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="308.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<line x1="308.0" y1="68" x2="308.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="308.0" y1="118" x2="308.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="328" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="344.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<rect x="328" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="344.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="328" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="344.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">L</text>
<line x1="344.0" y1="68" x2="344.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="344.0" y1="118" x2="344.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="364" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="380.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="364" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="380.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="364" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="380.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">R</text>
<line x1="380.0" y1="68" x2="380.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="380.0" y1="118" x2="380.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="400" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="416.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="400" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="416.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="400" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="416.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">G</text>
<line x1="416.0" y1="68" x2="416.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="416.0" y1="118" x2="416.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="436" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="452.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="436" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="452.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="436" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="452.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">E</text>
<line x1="452.0" y1="68" x2="452.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="452.0" y1="118" x2="452.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="472" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="488.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="472" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="488.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="472" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="488.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">I</text>
<line x1="488.0" y1="68" x2="488.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="488.0" y1="118" x2="488.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="508" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="524.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<rect x="508" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="524.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="508" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="524.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">E</text>
<line x1="524.0" y1="68" x2="524.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="524.0" y1="118" x2="524.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<rect x="544" y="40" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="560.0" y="59" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="544" y="90" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="560.0" y="109" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="544" y="140" width="32" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="560.0" y="159" font-size="15" text-anchor="middle" font-weight="bold" style="font-family:var(--md-code-font-family,monospace)">H</text>
<line x1="560.0" y1="68" x2="560.0" y2="88" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<line x1="560.0" y1="118" x2="560.0" y2="138" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="320" y="190" font-size="13" text-anchor="middle">Heavy boxes: every fourth letter uses key letter R, so those letters form one ordinary shift cipher.</text>
</svg>
<figcaption>Figure 7.3. THEDUKEHASSENT enciphered with the countersign ROME. The letters in heavy boxes all use R, so they form one ordinary shift cipher; a keyword of m letters is m shift ciphers taken in turn.</figcaption>
</figure>

The picture shows what the cipher is, and what is wrong with it. A keyword of four letters cuts the message into four
interleaved columns, each of which is a plain Caesar shift. Counting the letters of the whole message sees all four
alphabets at once and finds nothing; counting the letters of one column sees one shift and finds it at once. That is the
whole of the attack, and Cryptanalysis teaches it ([Chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md)).
It was not made for another three hundred years.

The next program measures the flattening. It uses the **index of coincidence**, a single number: the chance that two
letters picked from the text are the same. Ordinary English gives a high number, because E and T turn up so often. A text
with every letter equally likely gives about $1/26$, or 0.0385. The sample is a made-up dispatch of my own, 342 letters
long, in the style of the period.

```python
from collections import Counter
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def keyword_cipher(text, key, sign=1):
    # each letter is shifted by the next letter of the keyword, which repeats
    return "".join(A[(A.index(ch) + sign * A.index(key[i % len(key)])) % 26]
                   for i, ch in enumerate(text))

def progressive(text):
    return "".join(A[(A.index(ch) + i) % 26] for i, ch in enumerate(text))

def ic(text):
    # chance that two letters picked from the text are the same letter
    n = len(text)
    return sum(c * (c - 1) for c in Counter(text).values()) / (n * (n - 1))

plain = ("THEDUKEHASSENTHISSECRETARYTOVENICEWITHLETTERSFORTHESENATEANDHEASKSTHATTHEENVOYOFFRANCE"
         "BERECEIVEDBEFORETHEFEASTOFSAINTMARKTHESECRETARYWILLCARRYALSOASMALLCHESTOFSILVERWHICHISTO"
         "BEPAIDTOTHECAPTAINSATBRESCIAANDIPRAYYOURLORDSHIPTOSEETHATNOONEATTHEPOSTHOUSEOPENSTHELETTERS"
         "THEROADTHROUGHTHEMOUNTAINSISNOTSAFEANDTHEMULETEERSAREKNOWNTOSELLWHATTHEYCARRY")
print(len(plain), "letters")
for name, text in (("plain text", plain),
                   ("one alphabet (shift 3)", keyword_cipher(plain, "D")),
                   ("Trithemius, no key", progressive(plain)),
                   ("Bellaso, key BRESCIA", keyword_cipher(plain, "BRESCIA"))):
    print(f"{name:24s} IC = {ic(text):.4f}   top letters {Counter(text).most_common(3)}")
print("first 30:", keyword_cipher(plain, "BRESCIA")[:30])
print("random text would give about", round(1 / 26, 4))
```

Output:

```
342 letters
plain text               IC = 0.0759   top letters [('E', 51), ('T', 42), ('A', 31)]
one alphabet (shift 3)   IC = 0.0759   top letters [('H', 51), ('W', 42), ('D', 31)]
Trithemius, no key       IC = 0.0374   top letters [('W', 19), ('T', 18), ('Z', 18)]
Bellaso, key BRESCIA     IC = 0.0449   top letters [('I', 30), ('W', 26), ('T', 24)]
first 30: UYIVWSEIRWKGVTIZWKGKRFKEJABOWV
random text would give about 0.0385
```

A single alphabet changes the letters and leaves the number exactly where it was (0.0759): that is why a simple
substitution falls to counting. Trithemius's progressive cipher is flat. A keyword leaves the text with a small amount of
its old shape (0.0449, a little above random), and that residue, which grows as the keyword gets shorter, is what a
breaker uses. In 1553 nobody had written that sentence down, and Bellaso's cipher looked like a cure.

Bellaso's name faded. A 1586 book by a famous diplomat described much the same cipher in better Latin and French, and
three hundred years later the cipher was named after the diplomat. In the twentieth century the historians who went back
to the printed booklets, David Kahn among them, restored Bellaso's priority. That is the story of §7.9 and §7.14.

!!! note "Life story: Giovan Battista Bellaso"
    **Born:** in Brescia, in the early 1500s (the sources I know give no exact year); a secretary to cardinals, and a
    gentleman of Brescia by his own account · **Purpose:** to give a clerk a cipher with ease, speed and security ·
    **Helped:** the first printed keyword, the *contrasegno*, in *La cifra* (Venice, 1553); two more booklets in 1555 and
    1564; the idea that the method can be public and the key private · **Status:** forgotten for centuries; the cipher built
    on his key has carried Vigenère's name since the 1800s.

## 7.7 Porta: a table that undoes itself

*Level: intermediate.*

Ten years after Bellaso's booklet a Neapolitan gentleman published a book that became the fullest survey of the
subject, and the "Porta cipher" of the puzzle books comes from it.

**Giambattista della Porta** was born about 1535 at Vico Equense, on the bay of Naples, into a rich family, and died in
Naples on 4 February 1615. He seems never to have needed a profession. He wrote on everything: *Magiae naturalis*
("Natural Magic"), a collection of recipes, marvels and experiments that he first published in 1558, when he was in his
early twenties, and that made him famous across Europe; a study of faces and character, *De humana physiognomonia*
(1586); books on optics, on gardening, on distillation; and a long run of plays. In Naples he gathered a circle of
friends who tried experiments together, the Academy of the Secrets of Nature. The Church did not like it. As the usual
account has it, church authorities closed the Academy and called Porta to Rome to answer questions about magic. The
dates in the books I know are not the same, and I do not give one. What is not in doubt is that in Naples in the 1560s
a gentleman who wrote about secrets of nature had every reason to know a good deal about secrets of another kind.

The book was *De furtivis literarum notis*, "On the secret marks of letters," printed at Naples in 1563 and enlarged in a
later edition of 1602. It is not a thin booklet like Bellaso's. It is a survey of the whole art as Porta knew it. It sets
out the ciphers of the ancients, which he took from Greek and Latin writers, and the ciphers of his contemporaries, and it
adds ideas of his own. It also does something no earlier printed book did in such detail: it tells the reader how to
*break* ciphers. Porta describes how to guess a word that must occur in the message, such as a name or a title, and
then use it to find the rest. That advice is the subject of §7.12. [Chapter 1](01-Why-People-Hid-Writing.md) has his trick of
writing on a hard-boiled egg, from the same book.

Two of his ideas matter here.

The first is a **reciprocal table**. Split the alphabet into two halves, A to M and N to Z. For each pair of key letters
(A and B, C and D, and so on up to Y and Z) there is one alphabet in which the first half is written as letters of the
second half, and the second half goes back to the first. His alphabet was the Latin one of 22 letters, so he needed eleven
rows. In the 26-letter alphabet it takes thirteen. Figure 7.4 shows the table in the form I use here. The rows are not in
exactly his order, and other books number them the other way round.

<figure class="mars-fig">
<svg viewBox="0 0 640 352" width="640" role="img" aria-label="Porta table: thirteen rows, one for each pair of key letters, giving the cipher letter for plain letters A to M; letters N to Z are looked up the other way" fill="currentColor" font-size="14">
<text x="259.0" y="16" font-size="13" text-anchor="middle" font-style="italic">plain letter A to M (N to Z read upward)</text>
<text x="79.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">A</text>
<text x="109.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">B</text>
<text x="139.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">C</text>
<text x="169.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">D</text>
<text x="199.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">E</text>
<text x="229.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">F</text>
<text x="259.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">G</text>
<text x="289.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">H</text>
<text x="319.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">I</text>
<text x="349.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">J</text>
<text x="379.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">K</text>
<text x="409.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">L</text>
<text x="439.0" y="38" font-size="12" text-anchor="middle" font-weight="bold">M</text>
<text x="54" y="61" font-size="12" text-anchor="end" font-weight="bold">AB</text>
<text x="79.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="109.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="139.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="169.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="199.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="229.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="259.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="289.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="319.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="349.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="379.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="409.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="439.0" y="61" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="54" y="82" font-size="12" text-anchor="end" font-weight="bold">CD</text>
<text x="79.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="109.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="139.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="169.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="199.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="229.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="259.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="289.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="319.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="349.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="379.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="409.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="439.0" y="82" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="54" y="103" font-size="12" text-anchor="end" font-weight="bold">EF</text>
<text x="79.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="109.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="139.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="169.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="199.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="229.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="259.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="289.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="319.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="349.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="379.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="409.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="439.0" y="103" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="54" y="124" font-size="12" text-anchor="end" font-weight="bold">GH</text>
<text x="79.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="109.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="139.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="169.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="199.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="229.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="259.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="289.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="319.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="349.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="379.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="409.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="439.0" y="124" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="54" y="145" font-size="12" text-anchor="end" font-weight="bold">IJ</text>
<text x="79.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="109.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="139.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="169.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="199.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="229.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="259.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="289.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="319.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="349.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="379.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="409.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="439.0" y="145" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="54" y="166" font-size="12" text-anchor="end" font-weight="bold">KL</text>
<text x="79.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="109.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="139.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="169.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="199.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="229.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="259.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="289.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="319.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="349.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="379.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="409.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="439.0" y="166" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="54" y="187" font-size="12" text-anchor="end" font-weight="bold">MN</text>
<text x="79.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="109.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="139.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="169.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="199.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="229.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="259.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="289.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="319.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="349.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="379.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="409.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="439.0" y="187" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="54" y="208" font-size="12" text-anchor="end" font-weight="bold">OP</text>
<text x="79.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="109.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="139.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="169.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="199.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="229.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="259.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="289.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="319.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="349.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="379.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="409.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="439.0" y="208" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="54" y="229" font-size="12" text-anchor="end" font-weight="bold">QR</text>
<text x="79.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="109.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="139.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="169.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="199.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="229.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="259.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="289.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="319.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="349.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="379.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="409.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="439.0" y="229" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="54" y="250" font-size="12" text-anchor="end" font-weight="bold">ST</text>
<text x="79.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="109.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="139.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="169.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="199.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="229.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="259.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="289.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="319.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="349.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="379.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="409.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="439.0" y="250" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="54" y="271" font-size="12" text-anchor="end" font-weight="bold">UV</text>
<text x="79.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="109.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="139.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="169.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="199.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="229.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="259.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="289.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="319.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="349.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="379.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="409.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="439.0" y="271" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="54" y="292" font-size="12" text-anchor="end" font-weight="bold">WX</text>
<text x="79.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="109.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="139.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="169.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="199.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="229.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="259.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="289.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="319.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="349.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="379.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="409.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="439.0" y="292" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="54" y="313" font-size="12" text-anchor="end" font-weight="bold">YZ</text>
<text x="79.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Z</text>
<text x="109.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="139.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="169.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="199.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<text x="229.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="259.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="289.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="319.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="349.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<text x="379.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">W</text>
<text x="409.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<text x="439.0" y="313" font-size="12" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Y</text>
<text x="259.0" y="339" font-size="13" text-anchor="middle">key pair (left) picks the row; the same row also turns N to Z back into A to M</text>
</svg>
<figcaption>Figure 7.4. A Porta table of thirteen alphabets. The pair of key letters on the left picks a row. To write a plain letter from A to M, find it at the top and read down to the row; to write one from N to Z, find it in the row and read up. The same table undoes what it did.</figcaption>
</figure>

What this buys is that **encrypting and decrypting are the same act**. If A becomes N, then N becomes A. A clerk needs one table and one procedure, and cannot make the mistake of going the wrong way. With a keyword he walks along it as in Bellaso's cipher, taking the row for each key letter in turn. The code below does it, and runs the same function on the result to prove the point.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def porta_letter(ch, key_letter):
    # the key letters come in pairs (A B, C D, ...), thirteen alphabets in all
    turn = A.index(key_letter) // 2
    i = A.index(ch)
    if i < 13:
        return A[13 + (i + turn) % 13]       # first half of the alphabet goes to the second half
    return A[(i - 13 - turn) % 13]           # and the second half goes back to the first

def porta(text, key):
    return "".join(porta_letter(ch, key[i % len(key)]) for i, ch in enumerate(text))

for k in "ACE":
    print(k, "".join(porta_letter(c, k) for c in A[:13]), "<-", A[:13])

secret = porta("MEETATTHEBRIDGE", "ROME")
print(secret)
print(porta(secret, "ROME"))                 # the same table and the same key undo it
```

Output:

```
A NOPQRSTUVWXYZ <- ABCDEFGHIJKLM
C OPQRSTUVWXYZN <- ABCDEFGHIJKLM
E PQRSTUVWXYZNO <- ABCDEFGHIJKLM
UYXEVMAWZVLXYNX
MEETATTHEBRIDGE
```

The convenience has a price, and the output shows it. Look at the ciphertext UYXEVMAWZVLXYNX against the plaintext
MEETATTHEBRIDGE: every plaintext letter from A to M becomes a letter from N to Z, and every one from N to Z becomes a letter
from A to M. So the cipher gives away, for every letter, which half of the alphabet the plaintext letter came from, and it
can never write a letter as itself. A breaker with a probable word can use both facts at once. The second of these faults, a cipher that
can never write a letter as itself, comes back nearly four centuries later in a rotor machine, in
[Chapter 12](12-Rotors-and-Enigma.md), where the breakers made much of it. A key letter of A or B
turns Porta's table into the simple shift of thirteen places that programmers call ROT13.

The second idea is a **digraphic square**. Instead of one symbol for each letter, Porta gives one symbol for each *pair* of
letters. With twenty letters there are $20 \times 20 = 400$ pairs, and he supplies a table with 400 strange symbols, one for
each. Single-letter counts disappear, because the unit is now the pair, and a breaker who counts pairs still wins in time
but needs several times as much ciphertext, which a short dispatch does not supply. It is the first known cipher on this
principle. Charles Wheatstone's Playfair cipher of 1854, which works on pairs of letters, is its descendant
([Chapter 10](10-The-Telegraph.md)).

!!! note "Life story: Giambattista della Porta"
    **Born:** about 1535, at Vico Equense near Naples; died in Naples on 4 February 1615 · **Purpose:** to collect the
    secrets of nature and of writing in one book, and to say how to break a cipher as well as how to make one ·
    **Helped:** *De furtivis literarum notis* (1563, enlarged 1602): a reciprocal table of eleven alphabets for the Latin
    alphabet, the first digraphic cipher of 400 symbols, and an early printed advice on guessing words in a
    cipher · **Status:** the table survives as the "Porta cipher" of the puzzle books; later writers cite
    the book often.

## 7.8 Cardano: a card with holes

*Level: intermediate.*

**Girolamo Cardano** (Gerolamo, or Jerome, in English) was born in Pavia on 24 September 1501, the illegitimate son of a
lawyer who knew Leonardo da Vinci. That birth kept him out of the College of Physicians in Milan for years, and he was
admitted only in 1539. By then he had been a gambler, a doctor in a small town and a lecturer in mathematics. In 1545 he
published the *Ars magna*, the first book to print the solution of the cubic equation, which he had learned from Niccolò
Tartaglia on a promise of secrecy and then printed with a credit that Tartaglia thought was not enough. The quarrel was
famous, bitter and public. He also wrote a short book on dice, *Liber de ludo aleae*, which has the first clear
treatment of chances, though it was not printed until 1663. In 1570 the Inquisition arrested him in Bologna, apparently
because he had cast the horoscope of Christ, and he gave up his post. He moved to Rome, where he was given a papal
pension, and he died there on 21 September 1576.

His cipher ideas are in an encyclopedia, *De subtilitate* ("On Subtlety"), of 1550. It is a huge book on natural
philosophy. In it he lists the twelve most subtle minds in history, and names al-Kindi, under the Latin name
Alchindus, among them, the man whose book on breaking ciphers [Chapter 4](04-Baghdad-and-Cairo.md) tells about. It tells us
that Cardano knew al-Kindi's name, and, as that chapter said, it gives no sign that he knew the cipher book.

Cardano has two ideas about secret writing in this book, and they are very different.

The first is the **grille**, which now bears his name: a card with holes. Cut windows in a sheet of stiff paper, here in
the shape of words, there of single letters. Lay it on a blank page and write the secret message in the windows, one
word or letter in each. Take the card away and fill in the space around the message with a harmless letter, composed so
that the words of the secret fit in at the places where the holes were. The receiver, who holds a card cut the same way,
lays it on the page and reads what shows through.

This is steganography, not a cipher: the message is not changed, only hidden. The code below does it with whole words. The
cover is a letter about a summer visit, and the card has seven windows.

```python
cover = ("Come, if you can, to see us this summer. The orchard is heavy and the old well "
         "has been mended. We walk down to the bridge each evening at dusk, and sometimes "
         "stay out until night.")
words = cover.split()
holes = [0, 4, 14, 15, 25, 28, 35]           # the cut-out windows, counted from 0

print("the card, laid over the letter (dots are card):")
line = ""
for i, w in enumerate(words):
    line += (w if i in holes else "." * len(w)) + " "
    if len(line) > 50:
        print(line)
        line = ""
print(line)
print()
print("read through the holes:", " ".join(words[i].strip(",.").upper() for i in holes))
```

Output:

```
the card, laid over the letter (dots are card):
Come, .. ... .... to ... .. .... ....... ... ....... 
.. ..... ... the old .... ... .... ....... .. .... 
.... .. ... bridge .... ....... at ..... ... ......... 
.... ... ..... night. 

read through the holes: COME TO THE OLD BRIDGE AT NIGHT
```

The hard part is not the card, it is the letter. Writing a natural letter that has the words COME, TO, THE, OLD, BRIDGE, AT and
NIGHT at seven fixed places takes some skill, and my cover is only passable. A cover that is too stiff is itself the
tell, and the person who sees a letter that is slightly odd and finds a card in the sender's desk has the whole message.
The grille's security rests on the card, which is a physical key, and on the sender's ability to write. It has no
mathematics in it at all. It came back, turning, in the nineteenth century: an Austrian officer, Eduard Fleissner von
Wostrowitz, described a grille that is rotated through four positions in 1881.

The second idea is an **autokey**, Cardano's attempt to use the message itself as the key. A key that is also the message
cannot be lost, cannot be stolen from the correspondent's desk and need not be agreed in advance. Cardano's version, as
David Kahn describes it, started the key afresh at every word of the message. It is the weakness that §7.9 shows with a
program: because the key restarts, the same word is enciphered the same way every time it occurs. The flaw was not
fatal, but it threw away much of the point. The idea had to wait thirty-six years for a man who made it work.

!!! note "Life story: Girolamo Cardano"
    **Born:** 24 September 1501, Pavia; physician and mathematician at Milan and Bologna; died at Rome on 21 September
    1576 · **Purpose:** a natural philosopher's catalog of the subtle things of the world, of which secret writing was
    one · **Helped:** the grille, a physical stencil for hiding a message (*De subtilitate*, 1550); the first sketch of an
    autokey; the *Ars magna* (1545) and the first work on chance · **Status:** the grille survives in the rotating forms of
    the 1880s and in puzzle books; his autokey was superseded by Vigenère's.

## 7.9 Vigenère, and a name that stuck to the wrong cipher

*Level: intermediate.*

The man whose name the keyword cipher carries was a diplomat who wrote books, not a cipher secretary who wrote about
ciphers, and he came to the subject late.

**Blaise de Vigenère** was born on 5 April 1523 at Saint-Pourçain, in the Bourbonnais, in central France, and died in
Paris on 19 February 1596. He entered the service of the Duke of Nevers as a young man and went on missions for him and
for the French crown. In 1549 he was sent to Rome, and Rome was where he learned of the Italian writers on ciphers: it was
the place, as [Chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) showed, where most of them were to be found. In
1570, at the age of forty-seven, he retired from public service and spent the last twenty-five years of his life writing. He
translated Julius Caesar's *Commentaries* (1576), Livy, and the *Images* of Philostratus into French, and wrote on the
chemistry of fire and salt. He published the *Traicté des chiffres, ou secrètes manières d'escrire* ("Treatise on ciphers,
or secret ways of writing") in Paris in 1586.

That book is a work of scholarship, not a pamphlet. It is long, it is full of learning from Greek and Latin writers, and it
sets out the history of secret writing from the ancients down to Vigenère's own day, which makes it one of the first
histories of the subject in print. It describes the skytale and Caesar's shift
([Chapter 3](03-Greece-and-Rome.md)) and then moves on to Trithemius, Alberti, Porta, Cardano and the rest. The table of
shifted alphabets that bears his name, the *carré* or square, is there, and it is not new. What is new is the part that is
his own: a **true autokey**.

Vigenère's autokey is easy to state. The two correspondents agree on one letter, the **primer**. The first letter of
the message is enciphered with the primer as the key. Every later letter is enciphered with the *previous letter of the
message* as its key. The key is the message, delayed by one place, and it starts with a secret letter. For example, the
message MEETHERE and the primer D: M shifted by D (3) is P. E shifted by M (12) is Q. E shifted by E (4) is I. T by E is X.
H by T is A. E by H is L. R by E is V. E by R is V. The ciphertext is PQIXALVV. To read it, the receiver takes P, subtracts
D to get M, and then uses the M he has just read as the key for the next letter, and so on.

The key never repeats, so the attack that finds a repeating key has nothing to work with. That is the real improvement,
and on paper it made Vigenère's cipher the strongest in the printed books of its day. The code below does what the example
does, and then runs Cardano's version beside it so that you can see what restarting the key at each word costs.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def autokey(words, primer, restart):
    out, key = [], primer
    for w in words:
        if restart:
            key = primer                     # Cardano's way, as Kahn describes it: start over at each word
        cw = ""
        for ch in w:
            cw += A[(A.index(ch) + A.index(key)) % 26]
            key = ch                         # the plaintext letter becomes the next key letter
        out.append(cw)
    return " ".join(out)

words = "THE DUKE SENDS THE SECRETARY TO THE SENATE".split()
print("restart at each word :", autokey(words, "Q", True))
print("run straight through :", autokey(words, "Q", False))
```

Output:

```
restart at each word : JAL TXEO IWRQV JAL IWGTVXTRP JH JAL IWRNTX
run straight through : JAL HXEO WWRQV LAL WWGTVXTRP RH HAL WWRNTX
```

Cardano's way writes THE as JAL all three times, so the repeated word shows plainly. Vigenère's way writes it JAL, LAL
and HAL: the first letter changes, because it depends on the letter before. The improvement is real, but notice what it
is not. The last two letters of THE still come out the same each time, because the key inside a word is just the word. An
autokey hides the *period* of the key, which is what Kasiski's method needs, and keeps the key's *language*. The key is
the message, and the message is English. Section 7.12 uses that fact to break it.

Now the name. The cipher that textbooks call the Vigenère cipher is not his autokey. It is the keyword cipher, Trithemius's
table driven by a repeating key, which Bellaso had printed thirty-three years earlier. Somewhere in the nineteenth century
the name of the better-known man, who had written the bigger book, was attached to the simpler cipher, and it has stayed.
Kahn tells it as a mistake without a clear first culprit, and I have not found who made it. The phrase *le chiffre indéchiffrable*, the indecipherable cipher, which this book's first chapter
attaches to the same cipher, is also a later one in the sources I know. I have not found who first wrote it, and it does not
come from Vigenère's own book.

Why did the keyword cipher earn the title "indecipherable"? There are three reasons, and none is a proof. It really does
beat the one attack that every educated breaker knew, which is counting letters; §7.6 measured that. No break was
published, as far as I know, until Kasiski's in 1863 ([Chapter 10](10-The-Telegraph.md)). And it was little used, so few
breakers ever met it in the wild. A cipher that nobody has broken, partly because few have tried, looks like a cipher
that nobody can break. That is the first of this book's two threads, *makers trusted, breakers proved*, in its plainest
form.

I use "Bellaso's keyword cipher" for the 1553 cipher and "Vigenère's autokey" for the 1586 one when the history
matters, and "the Vigenère cipher" for the textbook cipher when I mean the table with the repeating key, because that is
the name every reader will meet. The history is plain enough: Trithemius made the table, Bellaso made the key, Porta made
the table reciprocal, and Vigenère made the key out of the message.

!!! note "Life story: Blaise de Vigenère"
    **Born:** 5 April 1523, Saint-Pourçain in the Bourbonnais; diplomat in Rome and elsewhere; retired in 1570; died in
    Paris on 19 February 1596 · **Purpose:** to set out the whole learning of secret writing, ancient and modern, in one
    book, and to improve on what was in it · **Helped:** the *Traicté des chiffres* (Paris, 1586); the autokey, whose key
    is the message; the table that was named after him · **Status:** his name is on a cipher he did not invent, and his own
    cipher is little known.

## 7.10 Bacon's two letters

*Level: intermediate.*

The last idea of the century is not about the alphabet at all. **Francis Bacon** (1561 to 1626), the English statesman and
philosopher who became Lord Chancellor in 1618, tells us in his Latin *De augmentis scientiarum* of 1623 that he devised
it as a young man in Paris, where he had gone in 1576 in the household of the English ambassador, Sir Amias Paulet. The
same Paulet was later Mary, Queen of Scots's last jailer ([Chapter 9](09-Queens-Spies-and-Black-Chambers.md)). Bacon had
touched on ciphers already in the English *Advancement of Learning* of 1605, but the full account of this one is the Latin
text of 1623, which is the one usually quoted. He called it the **biliteral** cipher, because it uses two forms of letter. [Chapter 1](01-Why-People-Hid-Writing.md)
gave his three properties of a good cipher, from the same book.

The idea is simple, and it is a deep one. Write each letter of the secret with five marks, each mark being either *a* or
*b*. Bacon's alphabet has 24 letters (I and J are one, U and V are one) and counts upward the way a modern binary
counter does: *a* is aaaaa, *b* is aaaab, *c* is aaaba, and so on. Five two-way marks make 32 combinations, more than
enough for 24 letters. Then you hide the *a*s and *b*s in an innocent text by giving each of its letters one of two forms:
an ordinary face for *a* and an italic for *b*, say. Anyone who looks at the page sees a harmless letter in a slightly
mixed type. The one who knows the rule reads the faces five letters at a time.

Bacon saw how far the idea went. Anything that can be told in two ways will do, he says: his phrase is *omnia per omnia*,
"anything through anything." The two forms can be two typefaces, or the ring of a bell and its silence, or a trumpet or a
torch or the report of a musket. He gives an example of his own: the message *Fuge*, "flee," hidden in a cover that reads
*Manere te volo donec venero*, "I want you to stay until I come." Four letters need twenty marks, and the cover has
twenty-three letters, so three are left over.

```python
# Bacon's alphabet of 24 letters (I and J are one letter, U and V are one letter), five a/b marks each
letters = "ABCDEFGHIKLMNOPQRSTUWXYZ"          # 24 letters; V is written as U, J as I
code = {ch: format(n, "05b").replace("0", "a").replace("1", "b") for n, ch in enumerate(letters)}
back = {v: k for k, v in code.items()}

print("A =", code["A"], "  B =", code["B"], "  Z =", code["Z"])

secret = "FUGE"                               # "Flee", the example Bacon himself gives
marks = "".join(code[ch] for ch in secret)
print(secret, "->", marks, f"({len(marks)} marks)")

# hide the marks in an innocent sentence: an 'a' leaves a letter plain, a 'b' makes it italic
cover = "MANERETEVOLODONECVENERO"             # "I want you to stay until I come"
print(len(cover), "letters in the cover; need", len(marks))
shown = ""
for i, ch in enumerate(cover):
    shown += ch.lower() if i >= len(marks) or marks[i] == "a" else ch.upper()
print(shown)                                  # capitals stand in for italics here

# the reader takes five letters at a time and asks, italic or not?
bits = "".join("b" if ch.isupper() else "a" for ch in shown)
print("".join(back[bits[i:i + 5]] for i in range(0, len(marks), 5)))
```

Output:

```
A = aaaaa   B = aaaab   Z = babbb
FUGE -> aababbaabbaabbaaabaa (20 marks)
23 letters in the cover; need 20
maNeREteVOloDOnecVenero
FUGE
```

The price is the same as the price of the prayer ciphers of §7.4: the cover must be five times as long as the secret. It
is also a cipher in the loosest sense: the five marks are a code for each letter, and anyone who knows the code reads the
text. Bacon's real contribution is the binary alphabet. It is, as far as I know, the first time anyone printed the
idea that the whole alphabet can be written with two symbols and five places, the arithmetic behind the five-unit
codes of teleprinters ([Chapter 10](10-The-Telegraph.md) and [Chapter 11](11-Radio-War-and-the-One-Time-Pad.md)).

There is a footnote to Bacon's cipher that belongs in this book, because it involves one of the great codebreaking couples.
In the 1890s Elizabeth Wells Gallup, a schoolteacher from Michigan, announced that she had found Bacon's biliteral cipher
in the first printed edition of Shakespeare's plays, the First Folio of 1623. She read the two forms of letter in the old
type as *a* and *b*, and what she decoded said that Bacon wrote the plays. She published it in 1899 as *The Bi-literal
Cypher of Francis Bacon*. In the 1910s the wealthy Illinois eccentric George Fabyan paid for such work at his Riverbank
estate, and the young Elizebeth Smith, hired to help with it, met William Friedman there. Both of them became two of the most important
American codebreakers of their century ([Chapter 11](11-Radio-War-and-the-One-Time-Pad.md)). In 1957 William and Elizebeth
Friedman published *The Shakespearean Ciphers Examined*, which argued that the printed type of the period has far
more varieties than two, because the printers' type was worn and mixed, and that Gallup could not say which letters were *a*
and which were *b* without already knowing what she wanted to find. The cipher Bacon described is real. The one in the
First Folio is not.

!!! note "Life story: Bacon's biliteral cipher"
    **Born:** devised in Paris in the 1570s by Francis Bacon, as he says; mentioned in English in 1605 and described in Latin in
    1623, *De augmentis scientiarum*, book 6, chapter 1 · **Purpose:** to hide that a message exists inside any text whose
    letters can take two forms, five letters of cover to one of secret · **Helped:** the idea of a two-symbol code for the
    alphabet; a long and mistaken search for secret messages in Shakespeare · **Status:** a steganographic curiosity; the
    Friedmans' 1957 book ended the case for a cipher in the First Folio.

## 7.11 Why the strong ciphers sat on the shelf

*Level: intermediate.*

By 1600 the printed books held everything a clerk needed for a cipher that counting letters could not break. Bellaso's
keyword, Porta's table and Vigenère's autokey were in print, and anyone with a few hundred pages could learn them. The
puzzle, which Kahn states and which the old histories repeat, is that most governments did not use them. For another
two hundred and fifty years the ciphers that diplomats and generals used were still, in the main, nomenclators and simple
substitutions with a few extras. It is the strangest fact in this chapter, and it is worth asking why.

First, look at who was writing the books and who was buying them. Selenus's *Cryptomenytices et Cryptographiae*, the great
handbook of 1624, was written by Duke August the Younger of Brunswick-Lüneburg, who founded the library at Wolfenbüttel
that still bears his name. The same author, under the same pen name, wrote the first German book on chess (1616). The
first book on cryptography in English, John Wilkins's *Mercury, or the Secret and Swift Messenger* (London, 1641), was
written by a clergyman and natural philosopher who later helped found the Royal Society. These are the readers the
printed books found: scholars, collectors and princes with libraries. Did they find the clerks of the chanceries? The
sources do not say, and I have seen no list of who bought which book.

Second, look at what the clerk had to do. A nomenclator, even a big one, works at the level of words and syllables: a
clerk finds *Venice* in the table and writes one symbol. A polyalphabetic cipher works letter by letter. The clerk finds
the key letter, finds the row, finds the plain letter in the row, and copies the cipher letter, a thousand times for a
page, with the place in the key to be kept in the head the whole while. It is slow. And, much worse, it is *fragile*.

Fragility is easy to measure, and the program below is a model of it, not a record. Take a 45-letter message and let one thing
go wrong at the tenth letter: the clerk copies a cipher letter wrongly, or drops one. Count how many letters of the
message the receiver then reads wrongly.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def vig(text, key, sign=1):
    return "".join(A[(A.index(c) + sign * A.index(key[i % len(key)])) % 26]
                   for i, c in enumerate(text))

def auto_encrypt(plain, primer):
    out, key = "", primer
    for ch in plain:
        out += A[(A.index(ch) + A.index(key)) % 26]
        key = ch
    return out

def auto_decrypt(secret, primer):
    out, key = "", primer
    for ch in secret:
        key = A[(A.index(ch) - A.index(key)) % 26]   # the letter just read is the next key
        out += key
    return out

def wrong(want, got):
    # letters that differ, position by position
    return sum(1 for a, b in zip(want, got) if a != b) + abs(len(want) - len(got))

plain = "THEDUKEHASSENTHISSECRETARYTOVENICEWITHLETTERS"
slip = 10                                    # something goes wrong at the tenth letter

def copy_error(text):                        # the clerk writes a different letter there
    return text[:slip] + ("A" if text[slip] != "A" else "B") + text[slip + 1:]

def drop(text):                              # the clerk misses a letter altogether
    return text[:slip] + text[slip + 1:]

lost = plain[:slip] + plain[slip + 1:]       # what the reader should still see after a drop
one = vig(plain, "D")
print("one alphabet, a letter dropped:", vig(drop(one), "D", -1))
kw = vig(plain, "BRESCIA")
print("keyword, a letter copied wrong:", wrong(plain, vig(copy_error(kw), "BRESCIA", -1)), "of", len(plain), "wrong")
print("keyword, a letter dropped     :", wrong(lost, vig(drop(kw), "BRESCIA", -1)), "of", len(lost), "wrong")
au = auto_encrypt(plain, "Q")
print("autokey, a letter copied wrong:", wrong(plain, auto_decrypt(copy_error(au), "Q")), "of", len(plain), "wrong")
```

Output:

```
one alphabet, a letter dropped: THEDUKEHASENTHISSECRETARYTOVENICEWITHLETTERS
keyword, a letter copied wrong: 1 of 45 wrong
keyword, a letter dropped     : 34 of 44 wrong
autokey, a letter copied wrong: 35 of 45 wrong
```

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Four rows of small squares, one per letter of a 45-letter message. A dropped letter costs one letter in a one-alphabet cipher, a wrong copy costs one letter in a keyword cipher, a dropped letter ruins 34 of 44 in a keyword cipher, and a wrong copy ruins 35 of 45 in an autokey" fill="currentColor" font-size="14">
<text x="60" y="22" font-size="13" text-anchor="start" font-weight="bold">One alphabet, one letter dropped</text>
<text x="555" y="22" font-size="12" text-anchor="end">1 letter lost, the rest reads</text>
<rect x="60" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="71" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="82" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="93" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="104" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="115" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="126" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="137" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="148" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="159" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="170" y="30" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="181" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="192" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="203" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="214" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="225" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="236" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="247" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="258" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="269" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="280" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="291" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="302" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="313" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="324" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="335" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="346" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="357" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="368" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="379" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="390" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="401" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="412" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="423" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="434" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="445" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="456" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="467" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="478" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="489" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="500" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="511" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="522" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="533" y="30" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<text x="174.5" y="66" font-size="11" text-anchor="middle">slip</text>
<line x1="174.5" y1="53" x2="174.5" y2="57" stroke="currentColor" stroke-width="1"/>
<text x="60" y="88" font-size="13" text-anchor="start" font-weight="bold">Keyword, one letter copied wrong</text>
<text x="555" y="88" font-size="12" text-anchor="end">1 wrong</text>
<rect x="60" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="71" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="82" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="93" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="104" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="115" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="126" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="137" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="148" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="159" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="170" y="96" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="181" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="192" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="203" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="214" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="225" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="236" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="247" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="258" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="269" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="280" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="291" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="302" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="313" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="324" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="335" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="346" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="357" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="368" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="379" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="390" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="401" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="412" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="423" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="434" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="445" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="456" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="467" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="478" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="489" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="500" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="511" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="522" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="533" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="544" y="96" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<text x="174.5" y="132" font-size="11" text-anchor="middle">slip</text>
<line x1="174.5" y1="119" x2="174.5" y2="123" stroke="currentColor" stroke-width="1"/>
<text x="60" y="154" font-size="13" text-anchor="start" font-weight="bold">Keyword, one letter dropped</text>
<text x="555" y="154" font-size="12" text-anchor="end">34 of 44 wrong</text>
<rect x="60" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="71" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="82" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="93" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="104" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="115" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="126" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="137" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="148" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="159" y="162" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="170" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="181" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="192" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="203" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="214" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="225" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="236" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="247" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="258" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="269" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="280" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="291" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="302" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="313" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="324" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="335" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="346" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="357" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="368" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="379" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="390" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="401" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="412" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="423" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="434" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="445" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="456" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="467" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="478" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="489" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="500" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="511" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="522" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="533" y="162" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="174.5" y="198" font-size="11" text-anchor="middle">slip</text>
<line x1="174.5" y1="185" x2="174.5" y2="189" stroke="currentColor" stroke-width="1"/>
<text x="60" y="220" font-size="13" text-anchor="start" font-weight="bold">Autokey, one letter copied wrong</text>
<text x="555" y="220" font-size="12" text-anchor="end">35 of 45 wrong</text>
<rect x="60" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="71" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="82" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="93" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="104" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="115" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="126" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="137" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="148" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="159" y="228" width="9" height="22" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>
<rect x="170" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="181" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="192" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="203" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="214" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="225" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="236" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="247" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="258" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="269" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="280" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="291" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="302" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="313" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="324" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="335" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="346" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="357" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="368" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="379" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="390" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="401" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="412" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="423" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="434" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="445" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="456" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="467" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="478" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="489" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="500" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="511" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="522" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="533" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<rect x="544" y="228" width="9" height="22" fill="currentColor" stroke="currentColor" stroke-width="1"/>
<text x="174.5" y="264" font-size="11" text-anchor="middle">slip</text>
<line x1="174.5" y1="251" x2="174.5" y2="255" stroke="currentColor" stroke-width="1"/>
</svg>
<figcaption>Figure 7.5. How far one slip spreads, from the model above: a 45-letter message and a slip at the tenth letter. Filled squares are letters the reader gets wrong. The one-alphabet cipher loses one letter; a keyword cipher loses one letter to a wrong copy but the whole tail to a dropped letter; an autokey loses the whole tail even to a wrong copy.</figcaption>
</figure>

The figures tell the story. A plain substitution forgives a dropped letter: the reader sees *DUKEHASENT* and knows what it
means. A keyword cipher forgives a wrongly copied letter, which is a local error, but it is ruined by a *dropped* one, because
from then on the receiver's place in the key is one step wrong and everything after is nonsense. And the autokey, which was
the strongest, is the most fragile of the three: one wrongly copied letter damages everything that follows, because the
receiver's key is built from the letters he has just read. A clerk who copies two hundred letters at night by candlelight,
for a master who needs the letter in the morning, will make a mistake. An ambassador who received a garbled
dispatch had good reason to ask for something simpler.

This is a model, and it should not be read for more than it is. I know of no count of how often real clerks slipped. The
claim that polyalphabetic ciphers were rare in diplomatic practice before the nineteenth century is Kahn's, from reading
more cipher correspondence than anyone, and I know of no census that tests it. The archives are also a biased sample: what
survives is what a breaker kept, or what a state chose to file. And there is a second reason the strong ciphers were not
needed, which is that the weak ones were good enough. A large nomenclator with homophones and nulls was a real
obstacle to the ordinary reader, even though the best breakers of the age, such as Viète and Phelippes, read them
([Chapter 9](09-Queens-Spies-and-Black-Chambers.md)), and it was the black chambers, reading them as a matter of routine,
that changed the balance. By the time
states needed something stronger, the telegraph had made the clerk's work a matter of machines and codebooks
([Chapter 10](10-The-Telegraph.md)). So the shelf was a rational choice for most, and a pity for a few.

## 7.12 Break it: two tools from the century itself

*Level: intermediate.*

Here are two ways into the ciphers of this chapter. Both are older than the methods that finally cracked them. The
systematic ones are in the Cryptanalysis book ([Chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md)).

**A probable word.** Porta's advice to the reader of a cipher was to guess a word the letter must contain, a name or a title or a place. Subtract
it from the cipher, letter by letter, at each place in the message, and see what key it would take to write it. At the wrong
places the "key" is nonsense. At the right place, it is a piece of the keyword, and since the keyword repeats, you can
tell. The program below has the keyword cipher with the key BRESCIA, and a breaker who guesses the word ENVOY and has a
short list of likely keywords (here, place names).

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def vig(text, key, sign=1):
    return "".join(A[(A.index(c) + sign * A.index(key[i % len(key)])) % 26]
                   for i, c in enumerate(text))

plain = ("THEDUKEHASSENTHISSECRETARYTOVENICEWITHLETTERSFORTHESENATEANDHEASKSTHATTHEENVOYOFFRANCE"
         "BERECEIVEDBEFORETHEFEASTOFSAINTMARK")
cipher = vig(plain, "BRESCIA")                # the clerk's key is a place name

crib = "ENVOY"                                # Porta's advice: guess a word the letter must contain
guesses = ["VENICE", "MILAN", "BRESCIA", "FLORENCE", "NAPLES", "ROME", "SAVOY", "GENOA"]

for start in range(len(cipher) - len(crib) + 1):
    # subtract the guessed word from the cipher to see what key letters it would need
    implied = "".join(A[(A.index(cipher[start + j]) - A.index(crib[j])) % 26] for j in range(len(crib)))
    for g in guesses:
        if implied in g * 3:                  # the key repeats, so look through three copies
            where = (g * 3).index(implied)
            turn = (where - start) % len(g)   # turn the guess so that it lines up with the start
            key = g[turn:] + g[:turn]
            print(f"crib at {start}: needs key letters {implied}, which sit inside {g}")
            print("  so try the key", key, "->", vig(cipher, key, -1)[:40])
```

Output:

```
crib at 73: needs key letters SCIAB, which sit inside BRESCIA
  so try the key BRESCIA -> THEDUKEHASSENTHISSECRETARYTOVENICEWITHLE
```

Five letters of a guessed word and a short list of names were enough. A real breaker has no list so short, and the clean
method is the one in the Cryptanalysis book, which finds the length of the key without guessing the word. But the
principle is Porta's, and it is the one that every codebreaker in the rest of this book will use: guess something about the
plaintext, and let the cipher check it.

**The primer.** The second tool is for Vigenère's autokey, and it needs no guess about the message. If the primer is a single letter there
are only 26 of them, so try each one, decrypt, and keep the one that gives English. The program scores each try by how many of
its letters are among the twelve commonest in English.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
COMMON = "ETAOINSHRDLU"                       # the twelve commonest letters of English

def auto_encrypt(plain, primer):
    out, key = "", primer
    for ch in plain:
        out += A[(A.index(ch) + A.index(key)) % 26]
        key = ch                             # from the second letter on, the message is its own key
    return out

def auto_decrypt(secret, primer):
    out, key = "", primer
    for ch in secret:
        key = A[(A.index(ch) - A.index(key)) % 26]
        out += key
    return out

secret = auto_encrypt("THEDUKEWILLRECEIVETHEENVOYONTHEFEASTOFSAINTMARK", "Q")
print("intercepted:", secret)

def score(text):
    return sum(ch in COMMON for ch in text)  # how much of the text is common letters

best = sorted(A, key=lambda p: -score(auto_decrypt(secret, p)))[:3]
for p in best:
    print(p, score(auto_decrypt(secret, p)), auto_decrypt(secret, p))
print("keys to try with a one-letter primer:", 26, "; with a seven-letter primer:", 26 ** 7)
```

Output:

```
intercepted: JALHXEOAETWCVGGMDZXALIRIJMMBGALJJESLHTXSIVGFMRB
Q 37 THEDUKEWILLRECEIVETHEENVOYONTHEFEASTOFSAINTMARK
R 32 SIDETLDXHMKSDDDJUFSIDFMWNZNOSIDGDBRUNGRBHOSNZSJ
B 27 ISTOJVTHXWACTNTTKPISTPCGDJDYISTQTLHEDQHLXYIXPCZ
keys to try with a one-letter primer: 26 ; with a seven-letter primer: 8031810176
```

The right primer, Q, stands out by a mile. A longer primer makes the blind search larger, and a seven-letter one has over eight billion
possibilities. That is a barrier to a clerk with a pen, not to a breaker who knows even a short stretch of the message, as the
expert section of this chapter shows. Try changing the primer, and try a message with no common words in it.

## 7.13 In the real world: what the sources say, and what they do not

*Level: intermediate.*

Almost every statement in this chapter comes from one of three places: the printed treatises themselves, which survive in
libraries and are now mostly digitized; modern editions and articles about them; and David Kahn's *The Codebreakers*, which
tells the whole story in a few chapters. The facts about the authors' lives, such as how Trithemius came to Sponheim, the
Faust letter, Porta's Academy and Cardano's trial, are the ones I have taken from standard encyclopedia accounts and not
traced to a first source. The table says what the sources show, and what they do not, for six common claims.

| Claim | What the sources show | What they do not show |
|---|---|---|
| Trithemius invented the polyalphabetic cipher | His *Polygraphia* (printed 1518) prints the *tabula recta* and the progressive cipher. | Alberti's disk, about 1467, changes the alphabet already, and nothing tells us whether Trithemius had seen Alberti's manuscript. |
| Bellaso invented the keyword | His 1553 booklet prints a countersign, a key word or phrase, to choose the alphabets. | Nothing shows that nobody had used a written key before; handwritten keys leave little trace. |
| Vigenère invented the Vigenère cipher | His 1586 book prints the table and a true autokey. | He did not make the keyword cipher, which Bellaso printed thirty-three years earlier; who gave it his name is not known. |
| The Vigenère cipher was "indecipherable" for three centuries | No published break appears before Kasiski in 1863, and Babbage's private break dates to about 1854. | That nobody broke one earlier. A break in a black chamber would not have been published, and the cipher was not much used. |
| The *Steganographia* is a book of magic | It was read as one, printed in 1606 and put on the Index in 1609. | What Trithemius meant. Books I and II were shown to be steganography in the 1600s and book III in the 1990s. |
| Strong ciphers sat on the shelf for 300 years | Kahn, reading many diplomatic ciphers, found polyalphabetics rare before the 1800s. | There is no census of the surviving keys, and the surviving record is biased toward what was kept. |

A second question is whether anyone could still read these ciphers today. The answer is that a laptop reads every one of them
in a fraction of a second. The table gives the reason for each. The methods are in the Cryptanalysis book.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Trithemius's prayer tables | instantly | Each letter has only a few words. Count the words, or just read the table in the book. |
| Trithemius's progressive cipher | instantly | There is no key. Try the table. |
| Bellaso's keyword, a short keyword | in a fraction of a second | Repeated stretches in the ciphertext reveal the key length (Kasiski). Then each column is a Caesar shift. |
| Porta's reciprocal table | easily | The halves leak and no letter is itself. A probable word finds the key, or counting finds each column. |
| Porta's 400-symbol pairs | easily with a few hundred letters | Count pairs of letters instead of letters. A computer climbs the search quickly. |
| Cardano's grille | when the card is found | There is no cipher. The cover letter looks odd, and a card that fits it gives the message. |
| Vigenère's autokey, one-letter primer | at once | Try all 26 primers and keep the one that reads. |
| Vigenère's autokey, a primer word | easily | One guessed word anywhere in the message unlocks the text around it (§7.14). |
| Bacon's biliteral cipher | easily if two forms of letter are visible | Read the two forms as *a* and *b*. The cover must be five times as long as the secret. |

One more thing the record cannot tell us is who did the daily work. The authors of this chapter are all men, as far as the
sources go. The printed record for the sixteenth century does not name a cipher secretary who was a woman, and I do not
conclude that there were none: queens and noblewomen wrote and read ciphers themselves ([Chapter 9](09-Queens-Spies-and-Black-Chambers.md)),
and the clerks of the chanceries are mostly nameless. The two women of this chapter are the schoolteacher Elizabeth Wells Gallup
and Elizebeth Friedman, and they are on opposite sides of the page: one found a cipher that was not there, and the other
helped to show it.

## 7.14 Going deeper

*Level: expert.*

**The algebra.** Number the letters from 0 to 25. All four ciphers of the middle of this chapter are the same sum with a different
choice of the key at each place:

| Cipher | The key for letter $i$ | The cipher letter |
|---|---|---|
| Caesar | a fixed number $k$ | $c_i = p_i + k$ |
| Trithemius | the place, $i$ | $c_i = p_i + i \pmod{26}$ |
| Bellaso (shifted form) | $k_{i \bmod m}$, a repeating key of length $m$ | $c_i = p_i + k_{i \bmod m}$ |
| Vigenère autokey, primer length $m$ | $k_i$ for $i<m$, then $p_{i-m}$ | $c_i = p_i + p_{i-m}$ |

The tabula recta is the addition table of the integers modulo 26: the entry in row $r$ and column $q$ is $(r + q) \bmod 26$, and
since each letter occurs once in every row and every column the table is a Latin square. Trithemius's cipher has a key space
of exactly one, and its period is 26 in the form shown here and 24 in his own Latin alphabet. Bellaso's cipher has $26^m$ keys,
which looks large and is not the measure of its strength. The next program prints the gap. A breaker who finds the key length
solves each key letter on its own, with 26 tries, so the work is $26m$ and not $26^m$.

```python
# keyword of length m: a blind search needs 26**m tries, but once the key length is known
# (or guessed) each key letter can be found on its own, 26 tries per letter
for m in (4, 7, 10):
    print(f"keyword of {m:2d} letters: {26 ** m:>18,} keys in all, {26 * m:>3} tries letter by letter")
```

Output:

```
keyword of  4 letters:            456,976 keys in all, 104 tries letter by letter
keyword of  7 letters:      8,031,810,176 keys in all, 182 tries letter by letter
keyword of 10 letters: 141,167,095,653,376 keys in all, 260 tries letter by letter
```

**Porta's table is an involution.** Write the table for key pair number $t$ ($0$ to $12$) as a map $\pi_t$ on the 26 letters.
For a plain letter $x$ with $0 \le x \le 12$, $\pi_t(x) = 13 + ((x + t) \bmod 13)$. For $13 \le x \le 25$,
$\pi_t(x) = (x - 13 - t) \bmod 13$. If $0 \le x \le 12$ and $y = \pi_t(x)$, then $y \ge 13$ and $\pi_t(y) = (y - 13 - t) \bmod 13 =
((x + t) \bmod 13 - t) \bmod 13 = x$. The other half is the same calculation. So $\pi_t \circ \pi_t$ is the identity, which is why
one table both writes and reads. It is also why $\pi_t$ has no fixed points, and, in this form, always changes the half. A cipher that can never write a
letter as itself is the same flaw that Enigma's reflector would give its machine nearly four centuries later.

**The autokey is a digraph cipher, and it falls to one letter.** In the plaintext autokey with a one-letter primer each
cipher letter is $c_i = p_i + p_{i-1}$, so it depends on two neighboring plaintext letters and on nothing else. That means two
things. First, the cipher is not a sum with a secret key at all after the first letter: it is a *fixed*, public function of the
message, with the primer as the only secret. Second, from $p_i = c_i - p_{i-1}$ and $p_{i-1} = c_i - p_i$, a single plaintext
letter known at *any* position gives the next letter, and then the one after it, to the end, and the one before it, back to the
start. With the ciphertext PQIXALVV from §7.9 and the knowledge that the fourth letter is T, the program in your head
produces MEETHERE in both directions and then the primer by $c_0 - p_0$. With a primer of $m$ letters the same
reasoning needs $m$ consecutive plaintext letters, and a guessed word of that length anywhere unlocks the message in steps of
$m$ letters. So a long primer does not rescue the cipher: the work grows with the primer only for a breaker who guesses
nothing. Vigenère's book presents the autokey as the stronger cipher; I know of no published break of it before the nineteenth century,
which, as with the keyword cipher, shows only that none was published.

**Errors.** If the ciphertext letter $c_j$ has an error $e$, then the receiver gets $p_j + e$, and then $p_{j+1} - e$, then
$p_{j+2} + e$, and so on: the error alternates in sign and never dies, which is the 35 of 45 in Figure 7.5. A ciphertext
autokey, where the key is the previous *cipher* letter, damages only two letters. I do not know whether any printed book
of the century gave that variant, which would have been the practical one.

**Four ways to choose the alphabet.** The history of the chapter can be put in one table: who decides which alphabet writes
the next letter.

| Who chooses the alphabet | System | What the enemy needs |
|---|---|---|
| The sender, at will, and says so in the text | Alberti's disk (about 1467) | The disk, and the capital letters in the message |
| The position in the message | Trithemius (1518) | The book |
| A secret repeating word | Bellaso (1553), Porta (1563) | The book and the word |
| The message itself, from a secret start | Vigenère (1586) | The book and the primer |

Two further rows come later in this book. A key as long as the message, never used twice, is the one-time pad
([Chapter 11](11-Radio-War-and-the-One-Time-Pad.md)). A machine that steps the choice through a huge cycle is a rotor
machine ([Chapter 12](12-Rotors-and-Enigma.md)). It is interesting that Alberti, the earliest, *sent the key in the open*, as
a capital letter in the text.

**Historiography.** Three things make this chapter's priorities unsafe. The first is that printing creates a priority that
handwriting hides. We can say that Bellaso printed a keyword in 1553, and nobody can say that nobody wrote one down before.
Priority claims in this chapter are claims about the *first printed* instance, and they should be read that way. The second is
the attribution: the keyword cipher that the textbooks name for Vigenère is Bellaso's, and the misnaming is a nineteenth-century
mistake whose first instance I have not found. A good small research project would be to find it. The third is the
dependence on Kahn. His chapters set the standard account, and most later popular accounts repeat them; the Italian
archival work on the Renaissance chanceries is where corrections may come from.

**Open questions.**

- Did anyone read a keyword cipher before Babbage in about 1854? A break in a black chamber would have left, at most, a note
  in an archive. Nobody has looked systematically.
- Did Bellaso know Trithemius's table or Alberti's disk? Did Porta know Bellaso's booklet? The ciphers are cousins, and the
  sources do not say how the families met.
- How common were polyalphabetic ciphers in real correspondence before 1800? A census of the keys in the state archives of
  Venice, Florence, Milan, Paris and the Vatican would answer it, and, as far as I know, none has been made.
- What did Trithemius intend by the cover of the *Steganographia*? The author of the Hunibald forgery cannot be taken at his
  own word.

## Check yourself

??? question "1. Encrypt BRIDGE with Trithemius's progressive cipher (row 0 for the first letter)."

    B stays B (row 0). R moves 1 to S. I moves 2 to K. D moves 3 to G. G moves 4 to K. E moves 5 to J. The ciphertext is
    BSKGKJ.

??? question "2. Why does Trithemius's progressive cipher have no key, and why does that matter?"

    The row for each letter is fixed by its place in the message, so nothing is chosen by the correspondents beyond the
    method. The method was printed in a book, so anyone who knew the book could read the message. A cipher is only a secret
    as far as its key is, and this one had none.

??? question "3. Decrypt JSZHYSXT with the keyword ROME, by hand."

    Subtract the key letters in turn: J minus R is S; S minus O is E; Z minus M is N; H minus E is D; then the key repeats: Y
    minus R is H; S minus O is E; X minus M is L; T minus E is P. The plaintext is SENDHELP.

??? question "4. Encrypt HELLO with Porta's table and the key letter A (or B). What is the result, and what does it become if you run it through again?"

    H, E, L, L go to U, R, Y, Y, because each moves from the first half of the alphabet to the second, 13 places on. O is in
    the second half and goes back to B. The result is URYYB, which is HELLO in ROT13. Running it through again gives
    HELLO, because Porta's table is its own inverse.

??? question "5. Look at the Porta ciphertext UYXEVMAWZVLXYNX for MEETATTHEBRIDGE. What two facts about the plaintext does it leak?"

    No letter is ever written as itself, and every ciphertext letter comes from the opposite half of the alphabet to its
    plaintext letter. So U (second half) tells you the plaintext letter was from A to M, and so on for every letter.

??? question "6. Decrypt PQIXALVV with Vigenère's autokey and the primer D."

    P minus D is M. E is Q minus M. E is I minus E. T is X minus E. H is A minus T. E is L minus H. R is V minus E. E is V
    minus R. The plaintext is MEETHERE, and each letter read becomes the key for the next.

??? question "7. A clerk copies one cipher letter wrongly. What does the receiver see with a keyword cipher, and what with an autokey?"

    With a keyword cipher the receiver gets one wrong letter at that place and everything else right. With the autokey the
    wrong letter is used as the key for the next, which is wrong, and so on, so every letter after it is wrong, with the error
    changing sign each time. That is why the strongest cipher of the century was the hardest for a clerk to use.

??? question "8. Match each person to what he added: Trithemius, Bellaso, Porta, Cardano, Vigenère, Bacon."

    Trithemius: the tabula recta and a progressive choice of alphabet, printed 1518. Bellaso: the keyword, or *contrasegno*,
    printed 1553. Porta: the reciprocal table and the 400-symbol square for pairs, 1563. Cardano: the grille, a card with holes,
    and an early autokey, 1550. Vigenère: the true autokey, the key being the message, 1586. Bacon: a two-symbol, five-place
    alphabet for hiding a message in a text with two forms of letter, 1623.

??? question "9. How many letters of cover text does Bacon's biliteral cipher need to hide a 12-letter secret? Why five?"

    Five marks per letter, so 60. Five two-way marks make 32 combinations, enough for an alphabet of 24 letters, and four marks would make only 16.

??? question "10. In an autokey message with a one-letter primer, you learn that the fifth plaintext letter is R. Show that you can read the whole message."

    Each cipher letter is the sum of the plaintext letter and the one before it. So the sixth plaintext letter is the sixth
    cipher letter minus R, then the seventh is the seventh cipher letter minus the sixth plaintext letter, and so on to the
    end. Going back, the fourth plaintext letter is the fifth cipher letter minus R, and so on to the first. The primer
    follows from the first cipher letter minus the first plaintext letter. One known letter anywhere is enough.

## What you learned

- Printing changed what a cipher could assume. A printed method is public, so the strong ciphers of this chapter move the
  secret out of the method and into something small and changeable: a keyword, a primer, a card.
- Johannes Trithemius (1462 to 1516) wrote the *Steganographia* (about 1499), a book of steganography dressed as magic, with
  its third book solved only in 1996 to 1998, and the *Polygraphia* (finished 1508, printed 1518), the first printed book on
  cryptography. It has the tabula recta and a progressive cipher with no key.
- Giovan Battista Bellaso added the keyword in 1553. Giambattista della Porta (1563) gave a reciprocal table, which leaks
  the half of the alphabet each letter came from, and a 400-symbol pair square. Girolamo Cardano (1550) described the grille
  and an autokey that restarted at every word.
- Blaise de Vigenère (1586) printed a true autokey, in which the message is its own key. The cipher with the repeating
  keyword that bears his name is Bellaso's. A single known plaintext letter breaks the autokey with a one-letter primer, and a
  guessed word the length of the primer breaks a longer one.
- Francis Bacon (1623) showed that an alphabet can be written with two symbols in five places, so that a message
  can hide in any text with two forms of letter. The claim that Bacon's cipher is in Shakespeare was ended by William and
  Elizebeth Friedman in 1957.
- The strong ciphers were rarely used for 250 years, probably because by hand they are slow and fragile: one dropped letter
  ruins a keyword message and one wrong letter ruins an autokey. The claim rests on Kahn and no census.
- The history of the polyalphabetic cipher is a history of four answers to one question: who chooses the alphabet for the next
  letter, the sender, the position, a repeating key or the message itself.

**Next:** [Chapter 8](08-The-World-Beyond-Europe.md) leaves Europe for the traditions of China, India, Persia, the Americas, Japan, Korea
and the Ottoman Empire. For the terms, see the [Glossary](Glossary.md).

## Further reading

- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev.
  ed., Scribner, 1996), chapters 3 to 5: Alberti, Trithemius, Bellaso, Porta, Cardano, Vigenère and the early printed books.
- Johannes Trithemius, *Polygraphiae libri sex* (1518) and *Steganographia* (Frankfurt, 1606).
- Thomas Ernst, "Schwarzweiße Magie: Der Schlüssel zum dritten Buch der Steganographia des Trithemius", *Daphnis* 25 (1996);
  Jim Reeds, "Solved: The Ciphers in Book III of Trithemius's Steganographia", *Cryptologia* 22, no. 4 (1998).
- Noel L. Brann, *The Abbot Trithemius (1462-1516): The Renaissance of Monastic Humanism* (Brill, 1981), and *Trithemius and
  Magical Theology* (SUNY Press, 1999).
- Giovan Battista Bellaso, *La cifra del Sig. Giovan Battista Bellaso* (Venice, 1553), *Novi et singolari modi di cifrare*
  (1555) and *Il vero modo di scrivere in cifra* (1564).
- Giambattista della Porta, *De furtivis literarum notis* (Naples, 1563; enlarged 1602) and *Magiae naturalis* (1558).
- Girolamo Cardano, *De subtilitate* (Nuremberg, 1550).
- Blaise de Vigenère, *Traicté des chiffres, ou secrètes manières d'escrire* (Paris, 1586).
- Francis Bacon, *The Advancement of Learning* (1605) and *De augmentis scientiarum* (1623), book 6, chapter 1.
- Gustavus Selenus (Duke August the Younger of Brunswick-Lüneburg), *Cryptomenytices et Cryptographiae libri IX* (Lüneburg,
  1624); John Wilkins, *Mercury, or the Secret and Swift Messenger* (London, 1641).
- Elizabeth Wells Gallup, *The Bi-literal Cypher of Francis Bacon* (Detroit, 1899); William F. Friedman and Elizebeth S.
  Friedman, *The Shakespearean Ciphers Examined* (Cambridge University Press, 1957).
- Eduard Fleissner von Wostrowitz, *Handbuch der Kryptographie* (Vienna, 1881); Friedrich W. Kasiski, *Die Geheimschriften und
  die Dechiffrir-Kunst* (Berlin, 1863).

*Weaker sources used:* the biographical details of Trithemius (Sponheim and the snowstorm, the Faust and Agrippa letters, the
Hunibald forgery), Porta (the Academy of Secrets and its closing), Cardano (his birth, his trial and the papal pension),
Vigenère (the mission to Rome in 1549, the retirement in 1570) and Bacon (the Paris stay with Paulet) are from standard
encyclopedia and reference articles and the old pages of this site, and not traced to first sources; so are the details of the
printing of the *Polygraphia* and the credit for the keys to the *Steganographia*. The titles and dates of Bellaso's booklets,
the number of rows in Porta's table and the example *Fuge* in Bacon's cipher are from Kahn's account and library catalog
summaries.
