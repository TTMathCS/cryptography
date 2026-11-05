# The telegraph age

*From the 1840s to 1920: messages that travel by wire and radio, the fall
of the "indecipherable" cipher, Africa's talking drums, telegraph codes
for Chinese and Japanese, Kerckhoffs's rules, the Okhrana's mail readers,
a telegram that helped pull America into a world war, the first code
talkers, and the one cipher that can't be broken.*

The electric telegraph made it possible to send a message across a
continent in minutes, but every message passed through the hands of
clerks, and later radio put every military order into the air for anyone
with an aerial. At the same time the most trusted cipher of the
[Renaissance](03-Renaissance.md), the keyword cipher wrongly named after
Vigenère, was broken by two men who never met. The period ends with a
discovery that no later invention has bettered: a cipher that is
mathematically unbreakable, if you can live with its rules.

| When | Who | What |
|---|---|---|
| 1837–1844 | Cooke and Wheatstone; Morse | electric telegraphs in Britain and the US |
| 1845 | Francis O. J. Smith | the first code book for telegraph messages |
| 1843 | Edgar Allan Poe | "The Gold-Bug" makes ciphers popular reading |
| 1854 | Charles Babbage | breaks the keyword cipher, but doesn't publish |
| 1854 | Charles Wheatstone | the Playfair cipher |
| 1861–1865 | US Civil War | the first war to lean heavily on telegraph ciphers |
| 1800s–1900s (described) | Central and West Africa | drum and gong languages carry messages for miles |
| 1869–1879 | Japan | the telegraph arrives; government code charts, then a cipher wheel |
| 1871–1872 | Schjellerup, Viguier | the Chinese telegraph code: four digits per character |
| 1881–1917 | the Okhrana | black chambers in Russian post offices |
| 1863 | Friedrich Kasiski | publishes the general attack on keyword ciphers |
| 1883 | Auguste Kerckhoffs | *La cryptographie militaire*: only the key is secret |
| 1882 | Frank Miller | a one-time pad in a banker's telegraph code |
| 1914 | Russian army at Tannenberg | orders sent by radio in clear; a catastrophe |
| 1914–1918 | Room 40, London | reads German naval and diplomatic codes |
| 1917 | Nigel de Grey and William Montgomery | read the Zimmermann telegram |
| 1917–1919 | Gilbert Vernam, Joseph Mauborgne | the teleprinter cipher and the one-time tape |
| 1918 | Georges Painvin | breaks Germany's ADFGVX field cipher |
| 1918 | Choctaw soldiers, 142nd Infantry | the first code talkers |

## Wires change everything

### Codes for a price per word

William Fothergill Cooke and Charles Wheatstone patented their electric
telegraph in 1837, and their first commercial line, along the Great
Western Railway out of London, went into service in 1839. Samuel Morse
sent "What hath God wrought" from Washington to Baltimore in 1844. Within a
decade, wires linked the big cities of Europe and North America; the
first lasting transatlantic cable opened in 1866.

Two problems came with them. Telegrams were charged by the word, so
businesses wanted to say more in fewer words. And every telegram was read
by at least two clerks, one at each end, so anything private was exposed.
The answer to both was the *commercial code*: a printed book that assigns
a short code word to each common phrase. Francis O. J. Smith, Morse's
business partner, published the first one for the telegraph in 1845.
Hundreds followed. A single invented word like "BAFUZ" might stand for "we
accept your offer at the price named, shipment to follow".

These codes kept out a curious clerk but not a determined rival: the books
were on sale. Firms that wanted real secrecy bought private codes or added
secret arithmetic to the code numbers. That combination, a code book plus
encryption on top, became the standard military and diplomatic system of
the next hundred years.

### Ciphers as entertainment

In 1841 Edgar Allan Poe challenged readers of *Graham's Magazine* to send
him substitution ciphers and claimed to solve almost all of them. In 1843
his story "The Gold-Bug", in which a cryptogram leads to buried treasure,
explained frequency analysis to a mass audience. Many later cryptologists,
including William Friedman, traced their interest back to it.

## The keyword cipher falls

For three centuries the keyword cipher (see [Bellaso and the
keyword](03-Renaissance.md#bellaso-and-the-keyword)) had a reputation as
*le chiffre indéchiffrable*. Its flat letter counts defeat simple frequency
analysis. Its weakness is the repeating keyword: with a 5-letter key,
letters 1, 6, 11, 16 and so on are all shifted by the same amount.

### Babbage, 1854

Charles Babbage (1791–1871), the inventor of the Difference Engine and the
Analytical Engine, was an enthusiastic codebreaker. In 1854 (some
accounts say 1853) a Bristol dentist, John Hall Brock Thwaites, presented
a "new" cipher in the *Journal of the Society of Arts*. Babbage pointed
out that it was an old keyword cipher. Thwaites challenged him to find the
keys he had used on a passage of Shakespeare's *The Tempest*, and Babbage
found them: "two" and "combined". Popular accounts also tell of Babbage
solving Tennyson's poem "The Vision of Sin" enciphered with the keyword
EMILY; the details of both stories come from secondary retellings of his
papers and differ between them.

He never published his method; it was found in his notebooks after his
death. Ole Franksen suggested in 1985 that British intelligence kept it
quiet during the Crimean War. That is a guess, and an equally likely
explanation is that Babbage left many projects unfinished.

### Kasiski, 1863

Friedrich Wilhelm Kasiski (1805–1881), a retired major of the Prussian
infantry, published the same attack in a small book of 95 pages, *Die
Geheimschriften und die Dechiffrir-Kunst* ("Secret Writing and the Art of
Deciphering"), in 1863. It attracted little notice; Kasiski turned to
archaeology. But it is the method that made the keyword cipher a solved
problem.

The *Kasiski examination* has two steps:

1. **Find the key length.** When the same piece of plaintext, such as
   THE, happens to fall under the same part of the keyword twice, it
   produces the same ciphertext twice. The distance between the two copies
   is then a multiple of the key length. Collect the distances between
   repeated groups; the number that divides most of them is the key length.
2. **Split and solve.** Once you know the key is 5 letters, take every
   fifth letter starting at the first. All of those were shifted by the
   same key letter, so that column is just a Caesar cipher, and frequency
   analysis solves it. Do the same for the other four columns.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 262" role="img" aria-labelledby="sk-c-kasiski-t"><title id="sk-c-kasiski-t">A strip of 30 cipher letters with the same three-letter group at three places, 18 and 6 letters apart, and marks every 6 letters showing the key length</title><defs><filter id="sk-c-kasiski-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-kasiski-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-kasiski-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-kasiski-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-kasiski-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="262" filter="url(#sk-c-kasiski-paper)"/><g filter="url(#sk-c-kasiski-pen)"><text x="30" y="44" text-anchor="start" class="h">Repeats give away the key length</text><path class="p room" d="M30 80 L49 80 L49 110 L30 110Z"/><path class="p room" d="M49 80 L68 80 L68 110 L49 110Z"/><path class="p gold" d="M68 80 L87 80 L87 110 L68 110Z"/><path class="p gold" d="M87 80 L106 80 L106 110 L87 110Z"/><path class="p gold" d="M106 80 L125 80 L125 110 L106 110Z"/><path class="p room" d="M125 80 L144 80 L144 110 L125 110Z"/><path class="p room" d="M144 80 L163 80 L163 110 L144 110Z"/><path class="p room" d="M163 80 L182 80 L182 110 L163 110Z"/><path class="p room" d="M182 80 L201 80 L201 110 L182 110Z"/><path class="p room" d="M201 80 L220 80 L220 110 L201 110Z"/><path class="p room" d="M220 80 L239 80 L239 110 L220 110Z"/><path class="p room" d="M239 80 L258 80 L258 110 L239 110Z"/><path class="p room" d="M258 80 L277 80 L277 110 L258 110Z"/><path class="p room" d="M277 80 L296 80 L296 110 L277 110Z"/><path class="p room" d="M296 80 L315 80 L315 110 L296 110Z"/><path class="p room" d="M315 80 L334 80 L334 110 L315 110Z"/><path class="p room" d="M334 80 L353 80 L353 110 L334 110Z"/><path class="p room" d="M353 80 L372 80 L372 110 L353 110Z"/><path class="p room" d="M372 80 L391 80 L391 110 L372 110Z"/><path class="p room" d="M391 80 L410 80 L410 110 L391 110Z"/><path class="p gold" d="M410 80 L429 80 L429 110 L410 110Z"/><path class="p gold" d="M429 80 L448 80 L448 110 L429 110Z"/><path class="p gold" d="M448 80 L467 80 L467 110 L448 110Z"/><path class="p room" d="M467 80 L486 80 L486 110 L467 110Z"/><path class="p room" d="M486 80 L505 80 L505 110 L486 110Z"/><path class="p room" d="M505 80 L524 80 L524 110 L505 110Z"/><path class="p gold" d="M524 80 L543 80 L543 110 L524 110Z"/><path class="p gold" d="M543 80 L562 80 L562 110 L543 110Z"/><path class="p gold" d="M562 80 L581 80 L581 110 L562 110Z"/><path class="p room" d="M581 80 L600 80 L600 110 L581 110Z"/><path class="p red" d="M30 70 L30 120"/><path class="p red" d="M144 70 L144 120"/><path class="p red" d="M258 70 L258 120"/><path class="p red" d="M372 70 L372 120"/><path class="p red" d="M486 70 L486 120"/><path class="p" d="M96 120 Q239 170 438 120"/><text x="267" y="162" text-anchor="middle" class="s">18 letters apart</text><path class="p" d="M438 120 Q495 150 552 120"/><text x="495" y="158" text-anchor="middle" class="s">6</text><text x="30" y="206" text-anchor="start" class="s">The same three cipher letters turn up three times. 18 and 6 are both multiples of 6, so the</text><text x="30" y="226" text-anchor="start" class="s">keyword is probably 6 letters long (red marks). Split the text into 6 columns, and each</text><text x="30" y="246" text-anchor="start" class="s">column is a plain Caesar shift that letter counting breaks.</text></g></svg><figcaption>Sketched for this page. A made-up example.</figcaption></figure>

### Trying it

The keyword here is EMILY, from the Tennyson story. The program doesn't
know it: it finds the key length from the repeats, then picks for each
column the shift whose letter counts best match English.

```python
from collections import Counter

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
# How often each letter appears in English, per 1,000 letters
EN = [82, 15, 28, 43, 127, 22, 20, 61, 70, 2, 8, 40, 24,
      67, 75, 19, 1, 60, 63, 91, 28, 10, 24, 2, 20, 1]

def vigenere(text, key, sign=1):
    return "".join(A[(A.index(c) + sign * A.index(key[i % len(key)])) % 26]
                   for i, c in enumerate(text))

plain = ("THE TELEGRAPH CARRIED THE NEWS OF THE WAR FASTER THAN ANY RIDER "
         "COULD AND THE GENERALS SOON LEARNED THAT THE ENEMY COULD READ "
         "THE WIRES AS EASILY AS THEIR OWN CLERKS SO THEY TURNED TO THE "
         "CIPHER THAT EVERY BOOK CALLED UNBREAKABLE AND THE ENEMY SOON "
         "LEARNED TO BREAK THE CIPHER BY LOOKING FOR THE PLACES WHERE THE "
         "SAME WORDS FELL UNDER THE SAME LETTERS OF THE KEY").replace(" ", "")
secret = vigenere(plain, "EMILY")
print(secret[:50])

# Step 1 (Kasiski): find repeated three-letter groups and how far apart they are
spots = {}
for i in range(len(secret) - 2):
    spots.setdefault(secret[i:i + 3], []).append(i)
gaps = [b - a for p in spots.values() for a, b in zip(p, p[1:])]
print(len(gaps), "gaps:", sorted(gaps)[:12], "...")
factors = Counter(f for g in gaps for f in range(2, 13) if g % f == 0)
print(factors.most_common(4))
n = factors.most_common(1)[0][0]       # the factor shared by most gaps

# Step 2: each n-th letter was shifted by the same key letter, so it is a
# Caesar cipher. Pick the shift whose letter counts look most like English.
key = ""
for col in range(n):
    column = secret[col::n]
    counts = Counter(column)
    score = lambda s: sum(counts[A[(i + s) % 26]] * EN[i] for i in range(26))
    key += A[max(range(26), key=score)]
print(key)
print(vigenere(secret, key, -1)[:50])
```

Output:

```
XTMECPQOCYTTKLPVUMORLQVPUWANEFIIICDEEBPPXTIYYRKZTB
27 gaps: [25, 25, 35, 35, 35, 35, 47, 60, 65, 65, 65, 70] ...
[(5, 26), (7, 11), (3, 9), (2, 6)]
EMILY
THETELEGRAPHCARRIEDTHENEWSOFTHEWARFASTERTHANANYRID
```

Of 27 gaps between repeats, 26 are multiples of 5; the odd one, 47, is a
chance repeat. Once the key length is known, five small Caesar ciphers
fall in an instant. A longer keyword only means more columns, each with
fewer letters, so it needs a longer message. In 1920 William Friedman
found a purely statistical way to measure key length, the *index of
coincidence*, which needs no repeats at all.

## New hand ciphers

### Playfair, 1854

Charles Wheatstone, the same Wheatstone of the telegraph, invented a
cipher in 1854 that encrypts letters in pairs. His friend Lyon Playfair,
a scientist and politician, promoted it to the British government, so it
carries his name. According to Playfair's biographer, the Foreign Office
complained it was too complicated; Wheatstone offered to teach it to boys
from a nearby school in a quarter of an hour, and an official replied that
he could never teach it to attachés.

The key is a word written into a $5 \times 5$ square, followed by the rest of the
alphabet (I and J share a cell). The plaintext is split into pairs, with an
X between doubled letters. Each pair is then replaced by the two letters at
the other corners of the rectangle it forms in the square, or by the
letters to the right if both are in the same row, or below if both are in
the same column.

```python
def square(keyword):
    seen = ""
    for ch in keyword + "ABCDEFGHIKLMNOPQRSTUVWXYZ":   # no J: it shares I's cell
        if ch not in seen:
            seen += ch
    return [seen[i:i + 5] for i in range(0, 25, 5)]

def playfair(text, keyword):
    rows = square(keyword)
    where = {ch: (r, c) for r, row in enumerate(rows) for c, ch in enumerate(row)}
    text = text.replace("J", "I")
    pairs, i = [], 0
    while i < len(text):                  # split into pairs
        a = text[i]
        b = text[i + 1] if i + 1 < len(text) else "X"
        if a == b:                        # a doubled letter gets an X between
            b, i = "X", i + 1
        else:
            i += 2
        pairs.append(a + b)
    out = []
    for a, b in pairs:
        (ra, ca), (rb, cb) = where[a], where[b]
        if ra == rb:                      # same row: take the letters to the right
            out.append(rows[ra][(ca + 1) % 5] + rows[rb][(cb + 1) % 5])
        elif ca == cb:                    # same column: take the letters below
            out.append(rows[(ra + 1) % 5][ca] + rows[(rb + 1) % 5][cb])
        else:                             # rectangle: swap the columns
            out.append(rows[ra][cb] + rows[rb][ca])
    return " ".join(pairs), " ".join(out)

for row in square("WHEATSTONE"):
    print(" ".join(row))
pairs, secret = playfair("MEETMEATTHEBRIDGEATNOON", "WHEATSTONE")
print(pairs)
print(secret)
```

Output:

```
W H E A T
S O N B C
D F G I K
L M P Q R
U V X Y Z
ME ET ME AT TH EB RI DG EA TN OX ON
PH AW PH TW WE AN QK FI AT EC NV NB
```

Working on pairs hides single-letter frequencies, and there are 600
possible pairs to count instead of 26 letters. But the same pair always
encrypts the same way (ME becomes PH both times above), so with enough
text, pair frequencies break it. The British army used Playfair as a field
cipher in the Boer War and the First World War, where speed mattered more
than strength; a message only had to stay secret for a few hours.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 304" role="img" aria-labelledby="sk-c-playfair-t"><title id="sk-c-playfair-t">A five-by-five Playfair square for the keyword MARS; the pair T and E mark two corners of a rectangle, and the other two corners, Q and F, are sent</title><defs><filter id="sk-c-playfair-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-playfair-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-playfair-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-playfair-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-playfair-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="304" filter="url(#sk-c-playfair-paper)"/><g filter="url(#sk-c-playfair-pen)"><text x="30" y="44" text-anchor="start" class="h">Pairs of letters, swapped at the corners</text><path class="p room" d="M40 70 L84 70 L84 114 L40 114Z"/><text x="62.0" y="99.0" text-anchor="middle" class="l">M</text><path class="p room" d="M84 70 L128 70 L128 114 L84 114Z"/><text x="106.0" y="99.0" text-anchor="middle" class="l">A</text><path class="p room" d="M128 70 L172 70 L172 114 L128 114Z"/><text x="150.0" y="99.0" text-anchor="middle" class="l">R</text><path class="p room" d="M172 70 L216 70 L216 114 L172 114Z"/><text x="194.0" y="99.0" text-anchor="middle" class="l">S</text><path class="p room" d="M216 70 L260 70 L260 114 L216 114Z"/><text x="238.0" y="99.0" text-anchor="middle" class="l">B</text><path class="p room" d="M40 114 L84 114 L84 158 L40 158Z"/><text x="62.0" y="143.0" text-anchor="middle" class="l">C</text><path class="p room" d="M84 114 L128 114 L128 158 L84 158Z"/><text x="106.0" y="143.0" text-anchor="middle" class="l">D</text><path class="p rust" d="M128 114 L172 114 L172 158 L128 158Z"/><text x="150.0" y="143.0" text-anchor="middle" class="l">E</text><path class="p gold" d="M172 114 L216 114 L216 158 L172 158Z"/><text x="194.0" y="143.0" text-anchor="middle" class="l">F</text><path class="p room" d="M216 114 L260 114 L260 158 L216 158Z"/><text x="238.0" y="143.0" text-anchor="middle" class="l">G</text><path class="p room" d="M40 158 L84 158 L84 202 L40 202Z"/><text x="62.0" y="187.0" text-anchor="middle" class="l">H</text><path class="p room" d="M84 158 L128 158 L128 202 L84 202Z"/><text x="106.0" y="187.0" text-anchor="middle" class="l">I</text><path class="p room" d="M128 158 L172 158 L172 202 L128 202Z"/><text x="150.0" y="187.0" text-anchor="middle" class="l">K</text><path class="p room" d="M172 158 L216 158 L216 202 L172 202Z"/><text x="194.0" y="187.0" text-anchor="middle" class="l">L</text><path class="p room" d="M216 158 L260 158 L260 202 L216 202Z"/><text x="238.0" y="187.0" text-anchor="middle" class="l">N</text><path class="p room" d="M40 202 L84 202 L84 246 L40 246Z"/><text x="62.0" y="231.0" text-anchor="middle" class="l">O</text><path class="p room" d="M84 202 L128 202 L128 246 L84 246Z"/><text x="106.0" y="231.0" text-anchor="middle" class="l">P</text><path class="p gold" d="M128 202 L172 202 L172 246 L128 246Z"/><text x="150.0" y="231.0" text-anchor="middle" class="l">Q</text><path class="p rust" d="M172 202 L216 202 L216 246 L172 246Z"/><text x="194.0" y="231.0" text-anchor="middle" class="l">T</text><path class="p room" d="M216 202 L260 202 L260 246 L216 246Z"/><text x="238.0" y="231.0" text-anchor="middle" class="l">U</text><path class="p room" d="M40 246 L84 246 L84 290 L40 290Z"/><text x="62.0" y="275.0" text-anchor="middle" class="l">V</text><path class="p room" d="M84 246 L128 246 L128 290 L84 290Z"/><text x="106.0" y="275.0" text-anchor="middle" class="l">W</text><path class="p room" d="M128 246 L172 246 L172 290 L128 290Z"/><text x="150.0" y="275.0" text-anchor="middle" class="l">X</text><path class="p room" d="M172 246 L216 246 L216 290 L172 290Z"/><text x="194.0" y="275.0" text-anchor="middle" class="l">Y</text><path class="p room" d="M216 246 L260 246 L260 290 L216 290Z"/><text x="238.0" y="275.0" text-anchor="middle" class="l">Z</text><path class="p dash" d="M150 136 L194 136 L194 224 L150 224Z"/><text x="300" y="96" text-anchor="start" class="s">keyword MARS, then the rest of the</text><text x="300" y="116" text-anchor="start" class="s">alphabet (I and J share a cell)</text><text x="300" y="160" text-anchor="start" class="s">TE is a rectangle: each letter takes</text><text x="300" y="180" text-anchor="start" class="s">the corner in its own row, so</text><text x="300" y="214" text-anchor="start" class="l">TE → QF</text><text x="300" y="254" text-anchor="start" class="s">same row: take the letters to the right;</text><text x="300" y="274" text-anchor="start" class="s">same column: take the letters below.</text></g></svg><figcaption>Sketched for this page with a made-up keyword.</figcaption></figure>

### The wheel cipher: Jefferson, Bazeries and the M-94

Thomas Jefferson described a "wheel cypher" in his papers, probably in the
1790s: 36 wooden disks, each with the alphabet around its edge in a
different scrambled order, threaded on an iron axle. Turn the disks until
the message reads along one row, then copy any other row as the
ciphertext. The receiver, with the same disks in the same order, sets the
ciphertext on one row and looks around the cylinder for the row that makes
sense. The order of the disks is the key. The description was found among
his papers in 1922; there is no sign he used it much.

The French cryptologist Étienne Bazeries, who later broke the Rossignols'
[Great Cipher](03-Renaissance.md#france-the-rossignols-and-the-great-cipher),
reinvented it in 1891 with 20 disks. The US Army adopted a version with 25
aluminium disks as the M-94 in 1922 and used it into the Second World War,
along with a flat strip version, the M-138-A, used by the State
Department, the Army and the Navy.

### The US Civil War: the first telegraph war

The American Civil War (1861–1865) was the first war in which armies
relied heavily on the telegraph; the British and French had used it in
the Crimea a few years before. The Union's military telegraph, run by former
Western Union men, used *route transpositions*: the words of a message
were written in a grid and read off along a prearranged path, with code
words standing in for names and places and dummy words added at the ends.
The Confederates never broke them and even printed intercepted messages
in newspapers in the hope that a reader could.

The Confederacy used the keyword cipher, often with brass cipher disks,
but kept the same few keywords for years ("Manchester Bluff", "Complete
Victory" and "Come Retribution" are the ones on record) and sometimes left
word spaces in. Three young Union telegraphers in the War Department in
Washington solved their messages regularly. One of them, David Homer
Bates, later described the work, and Lincoln's frequent visits to the
telegraph office, in *Lincoln in the Telegraph Office* (1907).

### China: a number for every character, 1871–1872

Morse code was built for alphabets, and Chinese is written with thousands
of characters. When the Great Northern Telegraph Company, a Danish firm,
opened a cable between Shanghai and Hong Kong in 1871, it needed a way
round that. The Danish astronomer Hans Schjellerup drew up a first list,
and in 1872 Septime Auguste Viguier published the codebook that replaced
it, *Dianbao xinshu* (電報新書, "New book for the telegraph"). It gave a
selection of common characters four-digit numbers from 0001 to 9999, and
the clerk sent the digits. Telegraph clerks soon knew the commonest
numbers by heart. Zheng Guanying brought out an expanded, reorganised
edition in 1881. The code's descendants are still in use; police forces,
for example, use the numbers to record Chinese names.

The codebook itself hid nothing, since anyone could buy it. But numbers
make secrecy easy to add. The NSA's short history of the code gives
米 (rice) as 4149: add a secret 5555 digit by digit, dropping the carries,
and 9694 goes on the wire, and the receiver subtracts the same key. That
is the same additive trick the Japanese navy later used on top of its
[JN-25](05-Machines-and-WWII.md#jn-25-and-midway) code book.

### Japan: ciphers for the new telegraph

Japan's first telegraph line, from Tokyo to Yokohama, opened in 1869, and
by the early 1880s the network reached every major part of the country.
Messages went in *Wabun* code, a Morse code for the kana syllables. The
worry, as a National Diet Library essay puts it, was that the telegraph
operator could read everything, and coded telegrams were allowed soon
after the service began.

Government offices used code charts from about 1875. The papers of the
official Mishima Michitsune include charts for messages between the Home
Ministry, the Finance Ministry and the prefectural governors. They were
simple substitutions, such as running the iroha syllabary from its last
syllable instead of its first. From March 1879 the tables were scrambled
irregularly, and in November 1879 the government adopted a cipher wheel:
a small disk on a larger one, with a window that picked one of five code
charts. The notice about the change, from the finance minister Ōkuma
Shigenobu to the prefectures, survives in the same papers. It is the same
kind of device as [Alberti's disk](03-Renaissance.md#albertis-cipher-disk)
of four centuries earlier, but each setting was still one simple
substitution.

### Russia: the Okhrana's black chambers

Tsarist Russia read mail on a large scale. Under the Okhrana, the
political police set up in 1881, black chambers in post offices across
the empire opened letters, and ciphered ones went to decipherers. The
revolutionary Victor Serge, who saw the Okhrana's files after 1917, wrote
that its best decipherer, a man named Zybin, had such a reputation that
he was kept on after the revolution of March 1917. Serge's account is
partisan, and little else is known about Zybin. The Okhrana read foreign
traffic too: one of its officers, Ivan Manasevich-Manuilov, described
intercepting and decoding the messages of the Japanese military attaché.
Russia's own military ciphers were another matter, as
[Tannenberg](#everyone-is-listening) showed in 1914.

### Africa: drums that talk

In Central and West Africa, people sent messages over miles by drum. In tonal languages, where a word's
meaning depends on the pitch of its syllables, a drum or a hollowed log
"slit-gong" with two or more tones can copy the tune and rhythm of a
sentence. The missionary John Carrington, who lived among the Kele people
of the Congo, described the system in *The Talking Drums of Africa*
(1949) and reckoned the messages carried three to seven miles.

The trouble is that many words share the same tones. In Kele, "manioc",
"plantain", "above" and "forest" all sound alike on the drum, so each is
drummed inside a longer stock phrase: manioc is "the manioc which remains
in the fallow ground". The extra words make the message longer but
remove the ambiguity, the same trade-off between length and reliability
that later engineers would call redundancy. Drum language was not
secret: anyone who knew the language and the phrases could follow the
simpler messages, though the full art belonged to trained drummers. But
it could be used to hide things. Ruth Finnegan notes that during the
Nigerian civil war (1967–1970) drum language went out over the radio to
reach some listeners and not others.

## Kerckhoffs's rules

In 1883 Auguste Kerckhoffs (1835–1903), a Dutch-born professor of
languages working in France, published *La cryptographie militaire* in the
*Journal des sciences militaires*. He argued that the telegraph had
changed what a military cipher must do. A cipher used by a whole army, with
equipment in the hands of thousands of soldiers, would certainly fall into
enemy hands. So it had to stay safe even then. He set out six
requirements, here in paraphrase:

1. The system must be practically, if not mathematically, unbreakable.
2. It must not need to be secret; it must be able to fall into the
   enemy's hands without harm.
3. The key must be easy to remember without writing it down, and easy to
   change.
4. It must work for telegraph messages.
5. It must be portable and usable by one person.
6. It must be easy to use, without strain or a long list of rules.

The second rule is now called **Kerckhoffs's principle**: the security of
a cipher must depend only on the secrecy of the key, never on the secrecy
of the method. Claude Shannon put it more bluntly in 1949: "the enemy
knows the system". Every algorithm on this site follows it. AES, RSA and
ML-KEM are published in full, and anyone may study them. See the
[FAQ](../FAQ.md#can-i-keep-the-algorithm-secret-instead-of-the-key) for why
secret algorithms tend to fail.

Kerckhoffs also showed how to attack a polyalphabetic cipher by lining up
several messages sent with the same key, a method called
*superimposition*. It comes back in the one-time pad story below.

## Radio and the First World War

### Everyone is listening

By 1914 armies and navies used Marconi's radio, and radio has no wire to
tap: anyone with a receiver in range hears every message. The first great
disaster came in the opening weeks. At Tannenberg in August 1914, two
Russian armies invading East Prussia were short of code books and sent
many orders by radio in plain language. German listeners read them, knew
where each Russian corps would be, and destroyed the Second Army. Its
commander, Alexander Samsonov, shot himself.

From then on, every major power built signals-intelligence services. The
war produced enormous volumes of intercepted traffic, and codebreaking
became a large organized profession.

### Room 40

In August 1914 Sir Alfred Ewing, the Admiralty's director of naval
education, began gathering mathematicians, linguists and classicists to
read German naval signals. The group, known as Room 40 after its office in
the Admiralty Old Building, worked closely with Captain William Reginald
"Blinker" Hall, who became Director of Naval Intelligence that autumn;
Ewing ran it until 1917, when it passed fully to Hall's division.

Luck gave it a start. In the first months of the war the Allies captured
all three main German naval code books: the *SKM* from the cruiser
*Magdeburg*, which ran aground in the Baltic and whose book the Russians
passed to Britain; the *HVB* from a German merchant ship seized in
Australia; and the *VB*, dragged up in a fishing trawl from a chest thrown
off a sunken German destroyer. With them Room 40 could follow the German
fleet, and it warned of the sorties that led to the battles of Dogger Bank
(1915) and Jutland (1916).

### The Zimmermann telegram

On 16 January 1917, the German foreign secretary Arthur Zimmermann sent a
coded telegram to his ambassador in Mexico, Heinrich von Eckardt, by way
of the German embassy in Washington. It said that Germany would resume
unrestricted submarine warfare on 1 February, and that if this brought the
United States into the war, Eckardt should offer Mexico an alliance:
Germany would provide money, and Mexico would "reconquer the lost
territory in Texas, New Mexico, and Arizona". Mexico should also invite
Japan to join.

Germany sent it over the American State Department's own cable, which
President Wilson had let Germany use for peace talks (by the usual
account it went by other routes as well). The cable ran
through Britain, and Room 40 copied everything on it. Two of its
codebreakers, Nigel de Grey and the Reverend William Montgomery, read the
message in German code 0075 within hours, at first with gaps.

Hall now had a problem. Publishing the telegram would tell Germany its
code was broken and tell the Americans that Britain read their cables.
He solved it by obtaining the copy the Washington embassy had forwarded
to Mexico City by ordinary commercial telegraph, in an older code Room 40
could read fully. That copy could plausibly have been stolen in Mexico.
Britain gave the text to the American ambassador on 23 February, and it
was published in American newspapers on 1 March. Many Americans assumed it
was a British forgery, until Zimmermann himself confirmed it was genuine
on 3 March.

The United States declared war on Germany on 6 April 1917. The submarine
campaign, which was sinking American ships, was the main cause, but the
telegram turned much of the public, especially in the West and Southwest,
toward war. Kahn judged that no other single cryptanalysis has had such
enormous consequences. Historians since have argued about how much it
changed, but it is the classic case of codebreaking shaping events.

### ADFGVX and the radiogram of victory

In early March 1918 (sources give the 1st or the 5th), during its great
spring offensive, the German army
introduced a new field cipher designed by Fritz Nebel. It used only the
letters A, D, F, G and X, chosen because they sound very different in
Morse code. Each plaintext letter was replaced by its row and column in a
$5 \times 5$ grid (the [Polybius square](01-Ancient.md#greece-polybius-and-his-square)
again), and the resulting letters were then shuffled by a keyed column
transposition. Around the start of June a sixth letter, V, extended the
grid to $6 \times 6$ so that digits could be sent too.

The French cryptanalyst Georges Painvin, working himself into exhaustion,
found a way in. On 2 June 1918 he read a message ordering ammunition to be
hurried forward, which pointed to where the next German attack would
fall. It became known in France as the *radiogramme de la victoire*. How
much it changed the battle that followed is still debated, but the French
were ready.

### The Choctaw telephone squads, 1918

In October 1918, during the Meuse-Argonne offensive, American field
telephone messages were being intercepted by the Germans. An officer of
the 142nd Infantry, in the US 36th Division, overheard two Choctaw
soldiers talking in their own language and saw the answer. The regiment
put Choctaw speakers on the telephones, and their first messages, on 26
to 28 October 1918, went by in a language no German listener knew. The
group grew to about twenty men. They were the first *code talkers*, and
the idea came back on a larger scale in the
[Second World War](05-Machines-and-WWII.md#more-code-talkers).

### The American Black Chamber

In 1917 the United States Army set up a cipher section, MI-8, under
Herbert Yardley, a former State Department telegraph clerk. After the war
it continued in New York as the Cipher Bureau, known as the American Black
Chamber, funded jointly by the Army and the State Department. Its best
moment came at the Washington Naval Conference of 1921–22, when it read
Japan's instructions to its delegates and the American side knew how far
Japan would give way. In 1929 the new Secretary of State, Henry Stimson,
cut off its money. Years later he summed up his view as "gentlemen do not
read each other's mail". Yardley, out of a job, published *The American
Black Chamber* in 1931 and caused a scandal.

## Vernam and the one-time pad

### A cipher for machines

Telegraph and teleprinter networks sent letters as electrical codes. In
the Baudot code a teleprinter used, every character is five on-or-off
pulses, holes or no holes across a paper tape. In 1917 Gilbert Vernam, an
engineer at AT&T, saw that a machine could encrypt such a tape by
combining it, pulse by pulse, with a second *key tape*: where the two
match, send "off"; where they differ, send "on". Today that rule is called
*exclusive or* (XOR). Doing it again with the same key tape gives back the
original. The machine encrypted as fast as the line could carry text, with
no clerk involved. Vernam's patent, US 1,310,719, was granted on 22 July
1919.

The first version used a loop of key tape, which repeated, and a repeating
key falls to the same tricks as a repeating keyword. A colleague, Lyman
Morehouse, combined two loops of slightly different lengths, 999 and 1,000
characters, to make a key nearly a million characters long before it
repeated. But it was still a
pattern.

### Never use the key twice

The decisive idea was that the key tape should be *random* and *as long
as the message*, and should *never be used again*. Kahn credits Major
Joseph Mauborgne of the Army Signal Corps (later its chief) with insisting
on the never-reuse rule; Steven Bellovin argued in 2016 that Vernam saw the
need for a non-repeating key himself. Either way, the result was the
*one-time tape*, and its paper form, the *one-time pad*: a pad of random
letters or numbers, each sheet used once and destroyed.

Even this had a forerunner. In 2011 Bellovin found an 1882 telegraph code
book by Frank Miller, a Sacramento banker, which describes adding random
numbers from a list to the code numbers and crossing each one out once
used. That is a one-time pad, 35 years before Vernam. Bellovin found no
proof that Vernam or Mauborgne knew of it, though he suggested Mauborgne
might have heard of it through his colleague Parker Hitt.

### Why it can't be broken

A one-time pad isn't just hard to break; it is impossible, because the
ciphertext contains no information about the message. For any ciphertext,
every message of the same length is equally possible: for each candidate
there is some pad that turns it into that ciphertext, and a truly random
pad is as likely to be one as another. Claude Shannon proved this formally
in the 1940s and showed that no cipher with a shorter key can do as well.

The rules are strict. The pad must be truly random, at least as long as all
the messages it protects, kept secret, and never reused. If it is reused,
two messages encrypted with the same pad can be combined so that the pad
cancels out, leaving the two plaintexts mixed together, and a guessed word
in one reveals the other. That is exactly how the Soviet one-time pads were
broken in the Venona project, on the
[next page](05-Machines-and-WWII.md#venona).

This program uses letters and addition modulo 26, the paper-pad version.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def add(text, pad, sign=1):
    return "".join(A[(A.index(t) + sign * A.index(p)) % 26] for t, p in zip(text, pad))

pad = "XQJRMWZBKTUE"                      # truly random, used once, then burned
secret = add("ATTACKATDAWN", pad)
print(secret, add(secret, pad, -1))

# Without the pad, every 12-letter message is equally possible:
for guess in ("HOLDPOSITION", "RETREATTONOW"):
    fake_pad = add(secret, guess, -1)    # the pad that would turn guess into secret
    print(guess, "needs pad", fake_pad, "->", add(guess, fake_pad))

# Reuse the pad once and the two messages leak into each other
other = add("SENDMOREMENX", pad)
diff = add(secret, other, -1)            # the pad cancels out
print(diff, add("ATTACK", diff[:6], -1)) # a guessed word reveals the other message
```

Output:

```
XJCROGZUNTQR ATTACKATDAWN
HOLDPOSITION needs pad QVROZSHMULCE -> XJCROGZUNTQR
RETREATTONOW needs pad GFJAKGGBZGCV -> XJCROGZUNTQR
IPGXQWJPRWJQ SENDMO
```

The catch is the key. Every message needs fresh key material as long as
itself, delivered in advance by a trusted route. That is fine for a spy
with a pad hidden in a cigarette lighter, or for the Washington–Moscow
hotline, which ran on one-time tapes after 1963, but impossible for a
whole army, let alone the internet. In the early 1920s the German Foreign
Office adopted one-time pads for its diplomatic code, which made its
traffic far harder to read, although its pads came from a machine rather
than true chance, and American codebreakers attacked them in the Second
World War. Most of the rest of cryptographic history is about
getting close to one-time-pad security with a short key. The modern
answer is a *stream cipher* such as [ChaCha20](../04-symmetric-ciphers/ChaCha.md),
which stretches a 256-bit key into a long pseudo-random pad, and a key
exchange such as [Diffie–Hellman](../01-key-exchange/Diffie-Hellman.md) to
agree on that key.

## Can these be broken today?

Every cipher on this page except one falls to a computer in seconds. The
exception is the one-time pad, used correctly.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Commercial codebooks | at once, with the book | Codes were sold openly. Without the book, the same code word for the same phrase repeats, and context fills it in, as Room 40 did with the Zimmermann telegram. |
| Keyword ("Vigenère") cipher | in a fraction of a second | Kasiski's repeats give the key length; then each column is a Caesar shift. The program above does it. |
| Playfair | in seconds | The same pair always gives the same pair. A computer climbs: change the $5 \times 5$ square a little, keep the change if the text looks more like English. A few hundred letters are enough. |
| Wheel cipher (Jefferson, Bazeries, M-94) | easily, with a guessed word | The disk order is the key, and the disks themselves are often captured. Guess a likely word: each plain letter and its cipher letter must sit the same distance apart on their disk, which rules out almost every order. The Marquis de Viaris broke Bazeries's cylinder this way in 1893. |
| The Chinese telegraph code with an added key | easily, with enough traffic | The book is public, so only the added digits are secret. If the key is reused, subtracting two messages cancels it, and the common characters' numbers show through. |
| Meiji code charts and the cipher wheel | instantly | One substitution per setting, and only five settings. |
| Choctaw on the telephone | not by codebreaking | A language, not a cipher. Only a speaker could follow it. |
| Route transposition (Union army) | easily | Letters and words are only moved, so they are all still there. Try the likely grids and paths until sentences appear; the code words for names need context. |
| ADFGVX | easily, by computer | Painvin needed weeks of work and messages with matching beginnings. Today a program tries column orders and checks whether the resulting pairs behave like letters of a substitution. |
| One-time pad, used once with a truly random pad | never | No attack exists: every message of that length fits. Shannon proved it. |
| One-time pad, reused | easily | Subtract two messages and the pad drops out, as the program above shows. Guess a word in one, read the other. That is how Venona worked. |

The rule that came out of this age, Kerckhoffs's, is the one these
attacks prove: assume the enemy knows the method, because sooner or later
the enemy will.

## What the telegraph age left behind

- **The keyword cipher was dead.** After Kasiski, no repeating-key cipher
  could be trusted.
- **Kerckhoffs's principle**: assume the enemy knows the method.
- **Codebreaking as an institution**, from Room 40 to Yardley's Black
  Chamber, built on the flood of intercepted radio.
- **The one-time pad**: perfect secrecy, at the price of a key as long as
  the message.
- **Encryption by machine.** Vernam's teleprinter showed that a machine
  could encrypt faster and more reliably than any clerk. The next step was
  machines that generated their own key.

## See also

- [The Renaissance](03-Renaissance.md): the keyword cipher before it fell
- [Machines and World War II](05-Machines-and-WWII.md): rotor machines,
  Enigma and Venona
- [ChaCha20](../04-symmetric-ciphers/ChaCha.md): a modern stream cipher, a
  one-time pad from a short key
- [FAQ](../FAQ.md#can-i-keep-the-algorithm-secret-instead-of-the-key):
  Kerckhoffs's principle today

## References

- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996): Smith's code, Poe, Babbage, Kasiski, the Civil War, Kerckhoffs, Tannenberg, Room 40, Zimmermann, ADFGVX, Yardley, Vernam and Mauborgne
- Friedrich W. Kasiski, *Die Geheimschriften und die Dechiffrir-Kunst* (Berlin, 1863)
- Auguste Kerckhoffs, "La cryptographie militaire", *Journal des sciences militaires* 9 (January and February 1883), pp. 5–38 and 161–191
- Ole I. Franksen, *Mr. Babbage's Secret: The Tale of a Cypher and APL* (Prentice Hall, 1985)
- David Homer Bates, *Lincoln in the Telegraph Office* (Century, 1907)
- Barbara Tuchman, *The Zimmermann Telegram* (Viking, 1958) / Thomas Boghardt, *The Zimmermann Telegram: Intelligence, Diplomacy, and America's Entry into World War I* (Naval Institute Press, 2012)
- Patrick Beesly, *Room 40: British Naval Intelligence 1914–1918* (Hamish Hamilton, 1982)
- Herbert O. Yardley, *The American Black Chamber* (Bobbs-Merrill, 1931) / Henry L. Stimson and McGeorge Bundy, *On Active Service in Peace and War* (Harper, 1948)
- Gilbert S. Vernam, "Secret Signaling System", US Patent 1,310,719 (1919) / Vernam, "Cipher Printing Telegraph Systems for Secret Wire and Radio Telegraphic Communications", *Journal of the AIEE* 45 (1926), pp. 109–115
- Steven M. Bellovin, "Frank Miller: Inventor of the One-Time Pad", *Cryptologia* 35, no. 3 (2011), pp. 203–222 / Bellovin, "Vernam, Mauborgne, and Friedman: The One-Time Pad and the Index of Coincidence", in *The New Codebreakers* (Springer LNCS 9100, 2016)
- William F. Friedman, *The Index of Coincidence and Its Applications in Cryptography* (Riverbank Publication 22, 1922)
- Ruth Finnegan, *Oral Literature in Africa* (Open Book Publishers, 2012), chapter 17, "Drum Language and Literature" / John F. Carrington, *The Talking Drums of Africa* (Carey Kingsgate Press, 1949)
- Septime Auguste Viguier, *Dianbao xinshu* (電報新書) (Shanghai, 1872) / Thomas S. Mullaney, *The Chinese Computer: A Global History of the Information Age* (MIT Press, 2024), on the 1871–1872 code
- National Diet Library (Japan), "Cipher Wheel of the Meiji Era", Modern Japan in Archives, column 2, with Ōkuma Shigenobu's notice of 12 November 1879 (Papers of Mishima Michitsune, #474-10)
- Victor Serge, *What Everyone Should Know About State Repression* (1926), on Zybin / Ivan Manasevich-Manuilov's notes in the Okhrana files, Hoover Institution, as described in a CIA *Studies in Intelligence* review of works on the Okhrana
- William C. Meadows, *The First Code Talkers: Native American Communicators in World War I* (University of Oklahoma Press, 2021), as summarized by RealClearDefense

*Weaker sources:* a search summary of the NSA's "History Today" article on the Chinese telegraph code (15 February 2018), for the 4149 and 5555 example; the Wikipedia articles on the Chinese telegraph code and on Wabun code; a search summary of the NSA-hosted *Cryptologic Quarterly* article "Before Bourbon", for the Okhrana's black chambers in post offices; the National Cryptologic Foundation's "World War I: The Original Code Talkers" (2014), for the overheard conversation; search summaries of the Wikipedia articles on the Vigenère cipher (Thwaites, *The Tempest*, the keys "two" and "combined", the 1854 date) and Simon Singh's *The Code Book* (1999) for the Tennyson and EMILY story, Georges Painvin and the ADFGVX cipher (1 March and 2 June 1918, the V added around the start of June); Wemyss Reid's *Memoirs of Lyon Playfair* (1899) for the Foreign Office anecdote, known to me through retellings; the "BAFUZ" code word, a made-up example of the style rather than a quotation from a real code book.
