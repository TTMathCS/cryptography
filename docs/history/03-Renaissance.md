# The Renaissance

*From the 1300s to the 1700s: diplomats with cipher secretaries, the
invention of the polyalphabetic cipher, a queen undone by her own letters,
and the "black chambers" that quietly read the mail of Europe.*

When Italian city-states began keeping ambassadors at each other's courts,
secret letters became a daily need, and so did reading other people's.
Europe rediscovered the codebreaking that [Arab scholars](02-Arab-Cryptanalysis.md)
had written down centuries earlier, and then went further, inventing
ciphers that changed their alphabet as they went. Those ciphers were
stronger than anything before, but slow by hand, so for three centuries
the people who mattered kept using something weaker: big lists of code
symbols called nomenclators. Governments built offices whose whole job was
to open, copy and decipher foreign letters.

| When | Who | What |
|---|---|---|
| 1379 | Gabriele de Lavinde, for the Avignon pope Clement VII | the oldest surviving European set of cipher keys |
| 1401 | a Mantuan secretary | several substitutes for each vowel: homophones |
| c. 1467 | Leon Battista Alberti | the cipher disk, the first polyalphabetic cipher |
| 1474 | Cicco Simonetta, Milan | rules for solving ciphers without the key |
| 1506 | Giovanni Soro, Venice | the first known full-time state codebreaker |
| 1518 | Johannes Trithemius (d. 1516) | the first printed book on cryptography, the tabula recta |
| 1553 | Giovan Battista Bellaso | the keyword: the cipher later called "Vigenère" |
| 1563 | Giambattista della Porta | ciphers for pairs of letters; a manual of codebreaking |
| 1586 | Blaise de Vigenère | the autokey cipher, stronger than the one named after him |
| 1586–87 | Thomas Phelippes | reads Mary, Queen of Scots's letters; she is executed |
| 1590 | François Viète | reads Philip II's cipher for Henri IV |
| 1628 | Antoine Rossignol | breaks a Huguenot cipher; France's cipher office begins |
| 1600s–1800s | France, England, Austria | the black chambers |
| 1893 | Étienne Bazeries | finally reads Louis XIV's Great Cipher |

## Medieval Europe: a quiet start

For most of the Middle Ages, European cryptography was a minor curiosity.
Scribes in monasteries sometimes swapped vowels for dots or for the next
consonant, wrote words backwards, or used foreign alphabets to hide a name,
much as the ancient world had done.

A few writers took more interest. The English friar Roger Bacon (c.
1220–1292) listed seven ways of concealing secrets in writing in his
*Letter on the Secret Works of Art and Nature*. A 1390s English treatise on
an astronomical instrument, *The Equatorie of the Planetis*, has short
passages in a symbol cipher. In 1952 Derek Price argued that Geoffrey
Chaucer wrote it, which would make Chaucer an amateur cryptographer. Later
work by Kari Anne Rand disputed that, and in 2014 she identified the
handwriting as that of John Westwyk, a Benedictine monk of St Albans. The
Chaucer attribution is now generally doubted.

## Italy: diplomats and their ciphers

### Permanent embassies

In the 1400s the Italian states (Venice, Milan, Florence, Naples, the
Papal States and smaller courts such as Mantua) began keeping permanent
ambassadors at each other's courts. Those ambassadors sent home a steady
stream of reports, and couriers could be robbed, bribed or arrested. Every
court soon had a *cipher secretary*, and the best of them learned to read
other courts' ciphers too.

### The nomenclator

The standard tool for the next four centuries was the *nomenclator*. It
combined two things:

- a **cipher alphabet**, a symbol or number for each letter, used to spell
  out ordinary words;
- a **code list**, a symbol for each of the names, titles and words that
  came up all the time: the pope, the king of France, Milan, the fleet,
  money, army.

The oldest surviving European set of cipher keys, in the Vatican archives,
was put together in 1379 by Gabriele de Lavinde of Parma for Clement VII,
the pope at Avignon during the Great Schism. Its keys pair a simple
substitution alphabet with a short list of code symbols for common names.
Later nomenclators grew enormous. By the 1600s the biggest held thousands
of entries.

### Homophones and nulls

A cipher key from the Gonzaga chancery in Mantua, dated 1401, gives each
vowel several different symbols. Kahn takes this as the first sign in the West that
someone knew about frequency analysis: if E can be written four different
ways, no single symbol in the ciphertext stands out as "the common one".
Symbols that stand for the same letter are called *homophones* ("same
sound").

Keys also added *nulls*, symbols that meant nothing and were scattered
through the text to upset counts and word lengths.

This program gives the commonest English letters several two-digit
symbols each and uses them in turn. In the plaintext, E is nearly twice as
common as the next letter; in the ciphertext, no symbol stands out.

```python
from collections import Counter

plain = ("THE QUEEN AGREES TO THE PLAN AND THE SIX GENTLEMEN WILL ACT WHEN "
         "THE FOREIGN TROOPS HAVE LANDED SEND THE NAMES OF THE SIX")

# Common letters get several symbols, rare ones get one. The numbers
# 00-99 are handed out in a scrambled order so they give nothing away.
share = {"E": 4, "T": 3, "A": 3, "O": 2, "N": 2, "H": 2, "S": 2, "R": 2, "I": 2}
symbols, n = {}, 0
for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    symbols[ch] = []
    for _ in range(share.get(ch, 1)):
        symbols[ch].append(f"{(n * 37 + 11) % 100:02d}")
        n += 1

used = Counter()
secret = []
for ch in plain.replace(" ", ""):
    options = symbols[ch]
    secret.append(options[used[ch] % len(options)])   # take the next one in turn
    used[ch] += 1

print(symbols["E"], symbols["T"], symbols["Q"])
print(" ".join(secret[:15]))
print("plain ", Counter(plain.replace(" ", "")).most_common(4))
print("cipher", Counter(secret).most_common(4))
```

Output:

```
['33', '70', '07', '44'] ['21', '58', '95'] ['36']
21 55 33 36 32 70 07 51 11 18 73 44 33 47 58
plain  [('E', 19), ('T', 10), ('N', 10), ('H', 8)]
cipher [('33', 5), ('70', 5), ('07', 5), ('51', 5)]
```

Homophones flatten the single-letter counts but don't hide everything. Pairs
of letters (TH, HE) still leave traces, and a code group for "the king"
that appears in every letter is a gift to a codebreaker. Real nomenclators
were broken all the time.

### The first European codebreakers

The earliest European writing on breaking ciphers comes from Milan. On
4 July 1474, in Pavia, Cicco Simonetta, the long-serving chancellor of the
Sforza dukes, wrote out thirteen short rules for solving ciphers "without
a key". They cover simple substitutions in Latin or Italian with the
spaces between words left in: look at word endings, at one-letter words,
at which letters can double. They would not have touched a good
nomenclator, and there is no evidence anyone used them in the field, but
they show the craft being written down.

Venice took it furthest. Its Council of Ten employed cipher secretaries in
the Doge's Palace, trained apprentices, and kept ciphers and solutions
under lock. Giovanni Soro, appointed around 1506, read the ciphers of
many states and became famous enough that the Medici pope Clement VII
reportedly sent him papal ciphers to see whether they could be broken.
Kahn calls Soro the West's first great cryptanalyst. He was not
infallible: there are records of papal despatches he could not read.

In Rome, the Argenti family served the popes as cipher secretaries in the
late 1500s. Giovanni Battista Argenti and his nephew Matteo introduced a
practical improvement: alphabets mixed by a memorable keyword, so a key
could be rebuilt from memory instead of copied from a table.

## Alberti's cipher disk

### The architect who reinvented cryptography

Leon Battista Alberti (1404–1472) is better known as an architect and
theorist of art: he designed the façade of Santa Maria Novella in Florence
and wrote the first Renaissance treatise on architecture. Around 1466–67,
after a conversation about ciphers in the Vatican gardens with his friend
Leonardo Dati, a papal secretary, he wrote a short Latin treatise, *De
componendis cifris* ("On composing ciphers").

It begins with frequency analysis: Alberti counted how often vowels and
consonants appear in Latin and Italian verse and showed how that lets a
reader break a simple substitution. Then he offered a cipher that defeats
the method.

### How the disk works

Alberti's device is two copper disks, one smaller and turning on top of
the other.

- The **outer, fixed ring** has 24 cells: 20 capital letters (Latin needs
  no H, K or Y, and J, U and W were not separate letters) and the digits 1
  to 4.
- The **inner, movable ring** has 24 symbols in a scrambled order: 23
  lowercase letters and *&* for "et".

The two correspondents have identical disks and agree on one letter of the
inner ring as the *index*. To encrypt, the sender turns the inner ring so
the index sits under some capital letter, and writes that capital into the
message as a signal. Each plaintext letter, found on the outer ring, is
replaced by the lowercase letter beneath it. After a few words the sender
turns the disk to a new position and writes the new capital. The receiver
sees the capital, sets his disk the same way, and reads the letters back.

Because the alphabet changes every few words, the same plaintext letter
turns into different cipher letters across the message. This is a
*polyalphabetic* cipher, and it is the decisive answer to frequency
analysis: no single letter count describes the whole text. Kahn calls
Alberti "the Father of Western Cryptology" for it.

The digits add a second idea. Alberti numbered 336 phrases in a small
codebook, using every group of two to four digits from 1 to 4 (16 + 64 +
256 = 336). A writer put the code number into the plaintext and enciphered
it with the disk like any other symbol. *Enciphered code*, a codebook
whose numbers are then encrypted, became standard practice only in the
late 1800s.

### Trying it

The inner ring here is a made-up mixed order, with `&` standing for the
24th symbol. The disk turns before each word.

```python
outer = "ABCDEFGILMNOPQRSTVXZ1234"     # fixed ring: 20 capitals and 4 digits
inner = "dlgazenbrchqtxkfvpiysmo&"     # movable ring, mixed (Alberti used 24 symbols)

def encrypt(words, settings):
    out = []
    for word, start in zip(words, settings):
        shift = outer.index(start)                # inner 'd' turned to sit under `start`
        table = {outer[(i + shift) % 24]: inner[i] for i in range(24)}
        out.append(start + "".join(table[ch] for ch in word))
    return " ".join(out)

def decrypt(text):
    out = []
    for group in text.split():
        shift = outer.index(group[0])             # the capital says where to turn the disk
        back = {inner[i]: outer[(i + shift) % 24] for i in range(24)}
        out.append("".join(back[ch] for ch in group[1:]))
    return " ".join(out)

secret = encrypt(["LA", "FLOTTA", "PARTE", "DOMANI"], "DQBM")
print(secret)
print(decrypt(secret))
```

Output:

```
Dem Qvyoaaq Bq&xfa Migdflo
LA FLOTTA PARTE DOMANI
```

"The fleet leaves tomorrow": the letter A comes out as `m`, `q`, `&` and
`f` in the four words. A real sender would also drop the spaces and turn
the disk at irregular points.

## Trithemius: the first printed book

### The abbot and his table

Johannes Trithemius (1462–1516) was abbot of the Benedictine monastery of
Sponheim, in Germany, and later of St James's in Würzburg, a famous scholar
with a library of some two thousand books. His *Polygraphiae libri sex*
("Six Books of Polygraphy"), finished in 1508 and printed in 1518, two
years after his death, is the first printed book on cryptography.

Two of its ideas lasted:

- **The tabula recta**, a square table in which each row is the alphabet
  shifted one more place than the row above. Every later polyalphabetic
  table descends from it.
- **The progressive cipher**: encrypt the first letter with the first row,
  the second with the second row, and so on. The alphabet changes with
  every single letter, not every few words.

The book also has the "Ave Maria" cipher: long tables that replace each
letter with a Latin word, chosen so that a secret message reads like a
devout prayer. That is steganography and code at once.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
for row in range(5):
    print(A[row:] + A[:row])                  # the first rows of the tabula recta

def progressive(text):
    # letter 1 uses row 0 (unchanged), letter 2 row 1, letter 3 row 2, ...
    return "".join(A[(A.index(ch) + i) % 26] for i, ch in enumerate(text))

print(progressive("HOLDHOLDHOLD"))
```

Output:

```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
BCDEFGHIJKLMNOPQRSTUVWXYZA
CDEFGHIJKLMNOPQRSTUVWXYZAB
DEFGHIJKLMNOPQRSTUVWXYZABC
EFGHIJKLMNOPQRSTUVWXYZABCD
HPNGLTRKPXVO
```

"HOLD" three times comes out three different ways. But there is no key:
anyone who knows the method can decrypt. Trithemius's cipher hides the
pattern of the letters but keeps nothing secret from a reader who has
seen the book.

### The book that looked like magic

Trithemius's earlier work, *Steganographia*, written around 1499, gave the
word *steganography* its modern sense. It seemed to be about summoning
spirits to carry messages over long distances, with long incantations and
lists of angels. It circulated in manuscript, earned him a reputation as a
sorcerer, was printed in 1606 and was put on the Catholic Church's Index
of Prohibited Books in 1609.

The first two books turned out to be cryptography in disguise: the
"incantations" are cover texts, and the hidden message is in, say, the
first letters of alternate words. The third book, full of tables of
planetary numbers, resisted for five centuries and was taken as genuine
magic. Thomas Ernst, a German graduate student, solved it and published
his solution in 1996; Jim Reeds, a mathematician at AT&T Labs, solved it
independently in 1998 before finding Ernst's paper. The numbers hide
ordinary test messages, among them a warning that the bearer of the letter
is a rogue and a thief.

## Bellaso and the keyword

### A secret that's easy to change

Trithemius changed the alphabet with every letter but always in the same
order. The missing piece was a *key*: a short secret that decides which
alphabet to use for each letter. Giovan Battista Bellaso, a secretary from
Brescia, supplied it in a small book printed in 1553, *La cifra del Sig.
Giovan Battista Bellaso*. (Vigenère says Bellaso served Cardinal Rodolfo
Pio da Carpi; Bellaso himself mentions serving Cardinal Duranti.)

Bellaso's idea: agree on a keyword, which he called a *countersign*. Write
it above the message, repeating it as needed. Each keyword letter picks
the alphabet for the plaintext letter beneath it. A keyword can be changed
at will, written down nowhere, and memorized as a phrase. Bellaso used a
set of reciprocal alphabets (each swaps letters in pairs), not
Trithemius's shifted rows, but the principle is the one now called the
*Vigenère cipher*: Trithemius's table plus Bellaso's keyword.

With the keyword BRESCIA, the first letter shifts by 1 (B), the second by
17 (R), the third by 4 (E), and so on, then the pattern repeats.

```python
from collections import Counter

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def vigenere(text, key, sign=1):
    out, k = "", 0
    for ch in text:
        if ch in A:                          # each letter gets the shift of the next key letter
            out += A[(A.index(ch) + sign * A.index(key[k % len(key)])) % 26]
            k += 1
    return out

plain = ("THE AMBASSADOR OF SPAIN LEAVES ROME ON MONDAY WITH LETTERS FOR THE "
         "KING HE WILL TAKE THE ROAD BY FLORENCE AND BOLOGNA AND HE WILL "
         "STAY THREE NIGHTS IN THE HOUSE OF THE BISHOP AT PARMA")
secret = vigenere(plain, "BRESCIA")
print(secret[:40])
print(vigenere(secret, "BRESCIA", -1)[:40])

for name, text in (("plain ", plain), ("cipher", secret)):
    print(name, Counter(ch for ch in text if ch in A).most_common(5))
```

Output:

```
UYISOJATJEVQZOGJTSKVLFRZWUZONVSFOWNERCOK
THEAMBASSADOROFSPAINLEAVESROMEONMONDAYWI
plain  [('E', 18), ('A', 15), ('T', 13), ('O', 13), ('H', 12)]
cipher [('V', 11), ('T', 9), ('F', 9), ('M', 9), ('O', 8)]
```

The counts are much flatter, and the commonest cipher letter has nothing
to do with E. Against al-Kindi's method alone this cipher holds. It became
known as *le chiffre indéchiffrable*, the indecipherable cipher. Babbage
broke it privately around 1854 and Kasiski published a general attack in
1863, but the reputation outlived them both: the repeating keyword leaves
a pattern, as the [telegraph age](04-Telegraph-Age.md#the-keyword-cipher-falls)
page shows.

### Porta, Cardano and Vigenère

Three other writers shaped what people knew.

- **Giambattista della Porta** (1535–1615) of Naples published *De
  furtivis literarum notis* ("On secret marks in writing") in 1563. It
  sums up the ciphers of the day and gives real advice on breaking them,
  including guessing probable words. It also has the first known
  *digraphic* cipher: a 20 × 20 table giving a single symbol for each pair
  of letters, which hides the single-letter counts completely. Porta also
  wrote about invisible inks, and claimed you could write on a hard-boiled
  egg's shell so the message appears on the white inside.
- **Girolamo Cardano** (1501–1576), the mathematician, described in 1550 a
  stencil cut with holes (the *Cardan grille*): write the secret through
  the holes, then fill the rest of the page with an innocent letter around
  it. He also proposed using the message itself as the key, but his
  version restarted the key with every word, a flaw that made it
  unworkable.
- **Blaise de Vigenère** (1523–1596), a French diplomat who had served in
  Rome, published his *Traicté des chiffres* in 1586. He described the
  keyword cipher and, more importantly, a true *autokey*: start with one
  secret letter, then use the plaintext itself as the key from the second
  letter on. That has no repeating pattern and is much harder to break
  than the cipher that carries his name. The 19th century gave the
  simpler keyword cipher his name, and the mistake stuck.

### Why the strong ciphers sat on the shelf

Kahn makes a point that is easy to miss: for three hundred years after
Alberti, governments mostly did *not* use polyalphabetic ciphers. Enciphering
by hand letter by letter with a table is slow, and a single slip can garble
the rest of a message. A clerk handling dozens of despatches a day wanted
something faster, and the nomenclator, with its quick code symbols for
whole words, was faster. Strong ciphers stayed in books while diplomats
used weaker systems, and the black chambers took full advantage.

## Mary, Queen of Scots

### A prisoner's secret post

Mary Stuart (1542–1587), queen of Scotland until she was forced to give up
her throne, fled to England in 1568. Her cousin Elizabeth I kept her a
prisoner for nineteen years. Mary was Catholic and had a strong claim to
the English throne, which made her the focus of every Catholic plot against
Elizabeth.

In 1585 Mary was moved to Chartley Hall in Staffordshire, cut off from the
outside world. Then a young Catholic, Gilbert Gifford, arranged a secret
post: letters went in and out of the house in a watertight case pushed
through the bung of the beer barrels a local brewer delivered. What Mary
didn't know was that Gifford was a double agent working for Sir Francis
Walsingham, Elizabeth's principal secretary and spymaster. Every letter
went to Walsingham first, was copied, resealed and sent on.

### Phelippes reads the letters

Mary's letters were in a nomenclator of about two dozen symbols for letters
and a few dozen more for common words and names, plus some nulls.
Walsingham's decipherer, Thomas Phelippes, a gifted linguist, broke it
with frequency analysis and the usual guesswork.

In July 1586 Anthony Babington, a young gentleman, wrote to Mary about a
plan: foreign troops would invade, Mary would be freed, and six
gentlemen would kill Elizabeth. On 17 July Mary replied. Her original
letter does not survive; what survives is a copy made by Walsingham's
office, which reads as approving the plan, and Phelippes is said to have
drawn a gallows on it. Walsingham had Phelippes add a forged postscript in
the same cipher asking Babington for the names of the six, and the British
Library notes that other passages may have been altered too. Babington and
his friends were arrested in August and executed in September.

Mary was tried at Fotheringhay Castle in October 1586. The deciphered
letter was the core of the case against her. She denied consenting to
Elizabeth's death, and historians still debate how far the copy reflects
what she wrote. She was beheaded at Fotheringhay on 8 February 1587.

The lesson is about trust in a cipher. Mary wrote about the plot at all
because she believed her cipher hid it. A weak cipher is worse than none:
it makes people say things they otherwise would not write down, and it
gives the reader a chance to change them.

### Her lost letters, read in 2023

The story has a modern footnote. In February 2023 George Lasry, Norbert
Biermann and Satoshi Tomokiyo announced that they had found and
deciphered 57 letters from Mary, written between 1578 and 1584, mostly to
the French ambassador Michel de Castelnau. They had sat in the
Bibliothèque nationale de France, filed as Italian documents of the early
1500s. The team broke the cipher with computer search plus a great deal
of hand work and published the results in *Cryptologia*.

## The black chambers

### France: the Rossignols and the Great Cipher

In 1628 the royal army of Louis XIII was besieging Réalmont, a Huguenot
(French Protestant) town in the south. A message from the town was
intercepted, and nobody could read it until it reached Antoine Rossignol
(1600–1682), a young man from Albi known for his skill with ciphers. He
read it almost at once: the defenders were short of ammunition and
desperate for help. The deciphered letter was sent back into the town, and
Réalmont surrendered. Cardinal Richelieu hired Rossignol, and he served
Louis XIII and then Louis XIV for the rest of his life, followed by his
son Bonaventure and grandson.

The Rossignols also made ciphers. Their *Great Cipher* (*Grand Chiffre*),
used for Louis XIV's most secret correspondence, was a nomenclator of 587
numbers that stood mostly for syllables, not letters, with traps such as
numbers that meant "ignore the previous number". After the last Rossignol
died, nobody could read it, and letters in it sat in the archives for two
centuries.

Commandant Étienne Bazeries, the French army's best cryptanalyst, finally
broke it in 1893 after about three years of work. His key insight was that
the numbers stood for syllables. One letter, from the war minister Louvois
in 1691, ordered the arrest of General Vivien de Bulonde for retreating
at the siege of Cuneo, and said he was to be held at the fortress of
Pignerol and allowed onto the ramparts with "330 309". Bazeries guessed
that this pair of code groups, which appears nowhere else, meant *masque*,
and suggested Bulonde was the famous Man in the Iron Mask. That theory is
rejected now: the reading is a guess, Bulonde was released and lived on,
and the dates don't fit.

France also ran a *cabinet noir* ("black cabinet") at the post office,
where letters were opened, read and resealed. The name stuck for every
office like it.

### Spain and François Viète

Philip II of Spain, the most powerful king in Europe, trusted his cipher
completely. In 1590 the French mathematician François Viète, better
known for his work on algebra, read intercepted Spanish letters for Henri
IV of France, sending him a full decipherment on 15 March 1590. When
Philip learned that the French knew what his letters said, he concluded
that only black magic could explain it and complained to the pope. Kahn
notes that the papal cipher office had been reading Spanish ciphers for
years, so the complaint went nowhere.

### England: Wallis and the Willes family

In England, the mathematician John Wallis (1616–1703), a founder of the
Royal Society and professor of geometry at Oxford, deciphered intercepted
royalist letters for Parliament during the Civil War and kept working for
the crown under William III. He guarded his methods jealously and is said
to have refused to teach them to agents of the Elector of Hanover, whose
request came via Leibniz. He trained his grandson to succeed him.

In 1716 the job passed to Edward Willes, a clergyman who rose to be Bishop
of Bath and Wells, and his family held the post of *Decipherer* for more
than a century. Letters were opened by a "Secret Office" in the Post
Office and the cipher ones passed to the decipherers. The arrangement
ended in 1844, after a public scandal when it came out that the
government had been opening the letters of the Italian exile Giuseppe
Mazzini and passing their contents to Austria.

### Vienna: the best of them all

The most efficient black chamber, by Kahn's account, was Vienna's
*Geheime Kabinets-Kanzlei* in the 18th century. Mail for the foreign
embassies arrived at the office at 7 in the morning. Clerks softened the
seals over candles, opened the letters, copied the important ones,
resealed them with forged seals and had them back in the post by 9:30. Codebreakers worked shifts and earned
bonuses for each solved key. Austria could read the diplomatic traffic of
most of Europe and sometimes sold the results to friendly courts.

## What the Renaissance left behind

- **The polyalphabetic cipher**, from Alberti, Trithemius and Bellaso: the
  first serious answer to frequency analysis.
- **The key as a separate, changeable secret**: Bellaso's keyword. It is
  the ancestor of every modern key.
- **Enciphered code**, from Alberti's numbered phrases, which came back as
  standard practice in the telegraph and machine age.
- **Organized codebreaking by the state.** From Venice to Vienna,
  governments learned that reading other people's letters was worth paying
  for, a lesson they never forgot.
- **A warning about trust.** Mary Stuart's nomenclator and Philip II's
  cipher were both read by experts their owners didn't believe existed.

The black chambers closed in the 1840s. A new machine, the telegraph, was
about to change what ciphers had to do.

## See also

- [Arab cryptanalysis](02-Arab-Cryptanalysis.md): the frequency analysis
  these ciphers were built to resist
- [The ancient world](01-Ancient.md): the substitution and transposition
  ciphers they grew from
- [AES](../04-symmetric-ciphers/AES.md): a modern cipher, whose key is a
  direct descendant of Bellaso's keyword

## References

- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996), chapters 3–5: Lavinde, Mantua 1401, Simonetta, Soro, the Argentis, Alberti, Trithemius, Bellaso, Porta, Cardano, Vigenère, the Rossignols, Viète, Wallis and Willes, Vienna's black chamber
- Leon Battista Alberti, *De componendis cifris* (c. 1466–67): *Dello scrivere in cifra* (Galimberti, Turin, 1994) and *A Treatise on Ciphers*, trans. A. Zaccagnini, foreword by David Kahn (Galimberti, Turin, 1997)
- Johannes Trithemius, *Polygraphiae libri sex* (for Johann Haselberg; printed at Basel or Oppenheim, 1518) and *Steganographia* (Frankfurt, 1606) / Jim Reeds, "Solved: The Ciphers in Book III of Trithemius's Steganographia", *Cryptologia* 22, no. 4 (1998) / Thomas Ernst, "Schwarzweiße Magie: Der Schlüssel zum dritten Buch der Steganographia des Trithemius", *Daphnis* 25 (1996)
- Giovan Battista Bellaso, *La cifra del Sig. Giovan Battista Bellaso* (Venice, 1553) / Giambattista della Porta, *De furtivis literarum notis* (Naples, 1563) / Blaise de Vigenère, *Traicté des chiffres, ou secrètes manières d'escrire* (Paris, 1586)
- Paul-M. Perret, "Les règles de Cicco Simonetta pour le déchiffrement des écritures secrètes", *Bibliothèque de l'École des chartes* 51 (1890) / Augusto Buonafalce, "Cicco Simonetta's Cipher-Breaking Rules", *Cryptologia* 32, no. 1 (2008)
- George Lasry, Norbert Biermann and Satoshi Tomokiyo, "Deciphering Mary Stuart's Lost Letters from 1578–1584", *Cryptologia* 47, no. 2 (2023) / The National Archives, SP 53/18/53 (the copy of Mary's letter of 17 July 1586), described in the British Library's "The gallows letter"
- John Guy, *My Heart Is My Own: The Life of Mary Queen of Scots* (Fourth Estate, 2004), on Chartley, Gifford, Phelippes and the trial
- Kari Anne Rand, "The Authorship of *The Equatorie of the Planetis* Revisited", *Studia Neophilologica* 87 (2015)
- Étienne Bazeries, *Les chiffres secrets dévoilés* (Paris, 1901)

*Weaker sources:* search summaries of the Wikipedia articles on Giovanni Soro (his 1506 appointment and the papal test ciphers), Gabriele de Lavinde, the Great Cipher (the 587 numbers) and the Equatorie (Price, Westwyk); MacTutor's biography of Viète for the 15 March 1590 date; news coverage of the 2023 Mary Stuart letters (57 letters, Castelnau, BnF misfiling); the Bellaso article on Wikipedia for his patrons; the gallows sketch on Phelippes's copy and Porta's egg trick, which rest on retellings.
