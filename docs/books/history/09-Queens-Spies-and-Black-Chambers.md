# 9. Queens, Spies and Black Chambers

*In 1586 a queen in prison wrote a letter in cipher and a clerk in her enemies' pay read it within a day. Over the next two
centuries the same thing happened again and again, in London, Paris, Vienna, Saint Petersburg and a house on Long
Island: a government learned that the cheapest way to know what its rivals were planning was to open their mail. This
chapter tells those cases, the people on both sides of them, and what each one cost. You will build a nomenclator like
Mary Stuart's and use it to forge a postscript, a syllable table like Louis XIV's Great Cipher and the counting that
cracks it, a Culper-style code book, and a book code of the kind Benedict Arnold used, and you will see what each one
gives away.*

!!! abstract "In this chapter"
    **You will learn:**

    - how Mary, Queen of Scots, was caught by her own cipher, who did the catching, and what the evidence against her was
      and was not;
    - how a nomenclator is built, how a reader like Thomas Phelippes opens one, and why knowing the key also lets you forge;
    - how a mathematician, François Viète, read the king of Spain's letters, and how France's Rossignol family made and
      broke ciphers for two centuries;
    - how a black chamber worked as a daily routine (seal, copy, reseal, forward), in England, France, Vienna and Russia;
    - how George Washington's spies and a traitor's go-between used number codes, book codes and invisible ink, and which
      famous stories about them (the petticoat on the clothesline, "Agent 355") rest on no document;
    - where the women in these stories appear in the record, and where later writers put them in without evidence.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) of this book (code and cipher told apart),
    [Chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) (the nomenclator and the permanent embassy; this chapter does
    not retell them) and [Chapter 7](07-Printed-Ciphers.md) (the keyword ciphers that were available and mostly not
    used). The attack on a simple substitution is in [Chapter 2 of the cryptography book](../../book/02-Classical-Ciphers.md)
    and in [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md).

    **Levels:** §9.1 to §9.3, §9.6 and §9.9 are for beginners, §9.4, §9.5, §9.7, §9.8, §9.10 and §9.11 are intermediate,
    §9.12 is expert.

## 9.1 The problem

*Level: beginner.*

In the 1580s a letter from London to Madrid, or from a prisoner in Staffordshire to an ambassador in Paris, passed through
at least six pairs of hands: a clerk who closed it with a lump of wax, a rider, a post master, a ship, another rider, a
servant at the far door. At every step someone could have opened it, and opening was easy. A knife blade warmed in a
candle slid under the wax and lifted it whole; the letter could be read, copied and closed again, and the seal pressed
back where it had been. A skilled hand left nothing to see.

Regular posts were new in that century and growing. France's Louis XI had set up a relay of royal riders in 1464. The
Habsburg emperors used a private post run by the Taxis family from about 1490, which later became the Thurn und Taxis
postal system and lasted into the nineteenth century. England had a Master of the Posts who ran the royal relays. These
systems were built to carry the government's own letters, but once a state owned the road it could stop the traffic of
others on it. Every state with a post could read what passed through its own hands, and could often get at what passed
through a neighbor's.

The sender's answer had been the one [Chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) described: a
nomenclator, a table of signs for letters and common words and names, with a few nulls to confuse a counter. It was
quick to use, it was easy to carry, and a clerk could be trained in an afternoon. What the sender did not see was that
this was a contest between a hundred clerks and one reader who could spend years on a single table. The reader who
chose to work at it, with a stack of letters and a good guess at what they were about, usually won.

So the sixteenth and seventeenth centuries produced a new kind of office. It had three jobs, and each job was a skill.
The first was **opening**: lifting seals, copying them, closing the letter so that no one could tell. The second was
**copying**: writing out the whole letter fast and accurately, because the original had to go back into the post that
same morning. The third was **deciphering**: making sense of what had been copied. The first two took practice. The
third took a particular sort of mind, one that liked puzzles, knew several languages and could stay with a hopeless
page for days. A government that put the three together had a **black chamber**, as the French called it, a *cabinet
noir*, and the name outlived the rooms.

This chapter is about that office and the people who worked in it, and about the people whose letters it read. It
runs from Elizabethan England to the American Revolution, and Figure 9.1 shows the dates. Three themes come up again
and again, and they are worth stating now.

First, **the weak point was seldom the cipher**. Mary's letters were read because her courier was Walsingham's man. The
Spanish king's cipher fell to a mathematician who had a stack of intercepted letters. The French Great Cipher, the
strongest system of its century, held for two hundred years and fell when an army officer gave it about three years of
his spare time. In none of these did a clever new attack carry the day; what carried it was access
and patience.

Second, **reading was power, and it was used**. A decipherment sent a queen to the block, let a town be taken without a
fight, got an ambassador thrown out of a country in twenty-four hours, and exposed an American general who had been
selling his army. The reader's skill was one half of each story; the other half was a ruler who knew what to do with
what was read.

Third, **secrecy needed a second layer**. In the American cases, the people who survived added things that a decipherer
could not reach: a stain that was invisible until a second chemical touched it, a chain of messengers who each knew one
link, a letter that read like a note about merchandise.

<figure class="mars-fig">
<svg viewBox="0 0 640 326" width="640" role="img" aria-label="Timeline of the chapter from 1586 to 1893" fill="currentColor" font-size="14">
<line x1="72" y1="8" x2="72" y2="320" stroke="currentColor" stroke-width="1.6"/>
<text x="58" y="27" text-anchor="end" font-weight="bold">1586</text>
<circle cx="72" cy="22" r="3.5" fill="currentColor"/>
<text x="88" y="27">Phelippes reads Mary's letters; the Babington plot</text>
<text x="58" y="53" text-anchor="end" font-weight="bold">1587</text>
<circle cx="72" cy="48" r="3.5" fill="currentColor"/>
<text x="88" y="53">Mary, Queen of Scots, is executed</text>
<text x="58" y="79" text-anchor="end" font-weight="bold">1590</text>
<circle cx="72" cy="74" r="3.5" fill="currentColor"/>
<text x="88" y="79">Viète reads Philip II's cipher for Henri IV</text>
<text x="58" y="105" text-anchor="end" font-weight="bold">1626</text>
<circle cx="72" cy="100" r="3.5" fill="currentColor"/>
<text x="88" y="105">Rossignol reads the letter from Réalmont</text>
<text x="58" y="131" text-anchor="end" font-weight="bold">1691</text>
<circle cx="72" cy="126" r="3.5" fill="currentColor"/>
<text x="88" y="131">Louvois writes the “Bulonde” letter in the Great Cipher</text>
<text x="58" y="157" text-anchor="end" font-weight="bold">1716</text>
<circle cx="72" cy="152" r="3.5" fill="currentColor"/>
<text x="88" y="157">Edward Willes becomes England's Decipherer</text>
<text x="58" y="183" text-anchor="end" font-weight="bold">1744</text>
<circle cx="72" cy="178" r="3.5" fill="currentColor"/>
<text x="88" y="183">Russia expels the French envoy La Chétardie</text>
<text x="58" y="209" text-anchor="end" font-weight="bold">1775</text>
<circle cx="72" cy="204" r="3.5" fill="currentColor"/>
<text x="88" y="209">Church's cipher letter is read at Cambridge, Mass.</text>
<text x="58" y="235" text-anchor="end" font-weight="bold">1778</text>
<circle cx="72" cy="230" r="3.5" fill="currentColor"/>
<text x="88" y="235">The Culper Ring begins to report from New York</text>
<text x="58" y="261" text-anchor="end" font-weight="bold">1780</text>
<circle cx="72" cy="256" r="3.5" fill="currentColor"/>
<text x="88" y="261">André is caught; Arnold's plot to sell West Point fails</text>
<text x="58" y="287" text-anchor="end" font-weight="bold">1844</text>
<circle cx="72" cy="282" r="3.5" fill="currentColor"/>
<text x="88" y="287">The Mazzini scandal ends the English Secret Office</text>
<text x="58" y="313" text-anchor="end" font-weight="bold">1893</text>
<circle cx="72" cy="308" r="3.5" fill="currentColor"/>
<text x="88" y="313">Bazeries reads the Great Cipher</text>
</svg>
<figcaption>Figure 9.1. The dates of this chapter, from the Babington plot to the reading, in 1893, of a letter written in 1691.</figcaption>
</figure>

Women appear in these stories more often than the histories usually say, and the sources for them differ widely in
quality. Mary Stuart is the best documented woman in this chapter: she chose the cipher, wrote the letters, was tried on
their strength, and spoke in her own defense. Two empresses stand behind black chambers: Elizabeth of Russia, to whom her
chancellor brought a French envoy's intercepted letters, and Maria Theresa of Austria, whose chancery ran the
best-organized chamber in Europe. In the American war a young Philadelphia woman, Peggy Shippen, is named in the surviving
papers as a go-between for a traitor, and the evidence is real but thin. Two others, the woman said to have hung a petticoat
on a clothesline for Washington's spies and the woman a code number calls "lady", are far less firm than their fame
suggests, and §9.9 says why. Each is named below where the source supports it and flagged where the source stops.

## 9.2 Mary, Queen of Scots, and the barrel at Chartley

*Level: beginner.*

Mary Stuart was born on 8 December 1542, and six days later her father, James V of Scotland, died and she became queen.
She grew up in France, married the heir to its throne, and was queen of France for about a year and a half, until her husband
Francis II died in December 1560. She came home to Scotland in 1561 as a widow of eighteen. Her second marriage, to
Lord Darnley, ended in the murder of Darnley in February 1567; her third, to the Earl of Bothwell, three months later,
turned the Scottish nobles against her. She was imprisoned, forced to give up her crown in July 1567 in favor of her
infant son James, escaped in May 1568, was defeated at Langside, and crossed the Solway Firth into England on 16 May
1568, believing her cousin Elizabeth would help her.

Elizabeth did not. Mary was Elizabeth's cousin, and a Catholic in a Protestant kingdom, and many Catholics held that
Elizabeth, as the daughter of Henry VIII's second marriage, was not the lawful queen at all, and that Mary was. That made
Mary a danger simply by being alive, and Elizabeth would neither free her, which was risky, nor try her, which was
unprecedented, nor kill her. She kept her for nineteen years in a succession of country houses. For fifteen of them her
keepers were George Talbot, Earl of Shrewsbury, and his wife Bess of Hardwick, a woman who built Hardwick Hall and was
one of the richest in England. Bess and Mary spent months sewing together, and then fell out. In 1585 Mary's custody passed to Sir Amias Paulet, a
strict Puritan who allowed her little. He moved her to
Chartley Manor in Staffordshire in the winter of 1585.

There had been plots in her name: the Ridolfi plot of 1571, which cost the Duke of Norfolk his head, and the
Throckmorton plot of 1583, which was to bring in a Spanish-backed army. Parliament answered with an Act of 1585 for the safety of the queen's person, which set up a commission to
examine anyone who claimed the throne if a plot was made for that person's sake. The Act is the legal frame for what
follows. Most historians read it as meaning that Mary could now be put on trial in England, and that the case against her
would turn on what she had known and agreed to. Walsingham needed her words.

Sir Francis Walsingham (about 1532 to 1590) was Elizabeth's principal secretary from 1573, a hard-working Protestant
who believed that the Catholic powers meant to destroy her and that only information would save her. He had built a
network of agents, informers and priests turned to his side, in France, Spain, Italy and the Low Countries. For Mary his
long game was a letter-box.

The letter-box was built in late 1585 and early 1586. Mary had been cut off from the world by Paulet. Her letters from
France, where her friends Thomas Morgan and Charles Paget kept her cause alive, were not getting through. Into this
silence came a young man called Gilbert Gifford, born about 1560 into a Staffordshire Catholic family and trained as a
priest at the English college at Rheims. He landed at Rye in December 1585, was stopped, and by the end of that month was
working for Walsingham. He offered Mary's friends in Paris a route into Chartley, and they believed him.

The route was a brewer who delivered beer to the house. A watertight case, a hollow made for the purpose, was slid
through the bung of the empty barrel when it left, and Mary's letters came out in it. Letters to Mary went into the
same case on the way in. From January 1586, according to the accounts, nothing reached Mary and
nothing left her except through Gifford. The brewer, Paulet and Walsingham's men all knew what the barrel carried.
Mary did not, and she answered the new route with joy, writing more freely than she had in years.

Every letter went first to Phelippes. Thomas Phelippes was born about 1556 and had studied at Cambridge; he spoke
French, Italian, Spanish, Latin and German and had been in Walsingham's service since the late 1570s. A description
written in the 1590s calls him slight, short-sighted and pitted by smallpox. He is the best documented of Elizabeth's decipherers. He read Mary's letters, copied them, and passed them back to
the packet, and a man named Arthur Gregory, whom the accounts name as the expert on seals, opened and closed them without
trace. Figure 9.2 shows the whole arrangement.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The route of Mary's letters at Chartley: Babington to Gifford to the brewer to Mary, with Gifford passing every letter through Phelippes's office" fill="currentColor" font-size="14">
<defs><marker id="arr92" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="8" y="20" width="132" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="74" y="46" text-anchor="middle">Babington and</text>
<text x="74" y="66" text-anchor="middle">his friends</text>
<rect x="178" y="20" width="104" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="230" y="46" text-anchor="middle">Gilbert</text>
<text x="230" y="66" text-anchor="middle">Gifford</text>
<rect x="320" y="20" width="132" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="386" y="46" text-anchor="middle">The brewer and</text>
<text x="386" y="66" text-anchor="middle">the beer barrel</text>
<rect x="490" y="20" width="142" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="561" y="46" text-anchor="middle">Mary at Chartley</text>
<text x="561" y="66" text-anchor="middle">(Sir Amias Paulet)</text>
<line x1="142" y1="51" x2="176" y2="51" stroke="currentColor" stroke-width="1.5" marker-start="url(#arr92)" marker-end="url(#arr92)"/>
<line x1="284" y1="51" x2="318" y2="51" stroke="currentColor" stroke-width="1.5" marker-start="url(#arr92)" marker-end="url(#arr92)"/>
<line x1="454" y1="51" x2="488" y2="51" stroke="currentColor" stroke-width="1.5" marker-start="url(#arr92)" marker-end="url(#arr92)"/>
<line x1="230" y1="84" x2="230" y2="158" stroke="currentColor" stroke-width="1.5" marker-start="url(#arr92)" marker-end="url(#arr92)"/>
<rect x="100" y="160" width="260" height="84" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.5"/>
<text x="230" y="184" text-anchor="middle" font-weight="bold">Thomas Phelippes</text>
<text x="230" y="205" text-anchor="middle" font-size="13">in Walsingham's office:</text>
<text x="230" y="225" text-anchor="middle" font-size="13">open, copy, read, reseal</text>
<text x="400" y="190" font-size="13">Every letter, both ways,</text>
<text x="400" y="210" font-size="13">went down this arrow first.</text>
</svg>
<figcaption>Figure 9.2. How Mary's letters travelled in 1586. The people at both ends believed the route was secret; the man in the middle worked for Walsingham.</figcaption>
</figure>

!!! note "Life story: Mary Stuart, Queen of Scots (1542 to 1587)"
    **Born:** 8 December 1542, Linlithgow; queen of Scots at six days, queen of France 1559 to 1560, a prisoner in
    England from 1568 · **Purpose:** to keep her claim to the English throne alive and to be freed, which she tried by
    letters to the French and Spanish courts and to English Catholics · **Helped:** pushed Elizabeth's government to find a legal way to deal with a rival claimant; her
    ciphered letters of the 1570s and 1580s survive in archives in London and Paris · **Retired:** beheaded at Fotheringhay Castle on 8 February 1587, in old style
    dating, after the English commission found her guilty of consenting to a plot against Elizabeth

The people who made this trap did not need Mary's cipher to be bad. They needed it to be used. A courier they controlled
gave them every message, in the cipher the sender chose. If Phelippes failed to read a letter he could still copy it,
send it on and wait for the next. The cipher was a lock on a door whose hinges Walsingham already held.

## 9.3 Inside Mary's cipher

*Level: beginner.*

Mary's system was a nomenclator of the kind [Chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) described, and it was
ordinary for its time. The key found among Walsingham's papers is usually described as having 23 signs for letters (no
j, v or w), 35 signs for common words and
names, four nulls that meant nothing and one sign, which the English clerks called "dowbleth", that told the reader to
double the next letter. Figure 9.3 draws these to scale. The counts are the ones usually quoted for the key (I have not seen
the key itself, and a different count may turn up in a catalogue); the signs were small drawn marks, and nothing about
them is hard to copy.

<figure class="mars-fig">
<svg viewBox="0 0 640 190" width="640" role="img" aria-label="The parts of Mary's nomenclator drawn to scale: 23 signs for letters, 35 for words, 4 nulls and 1 sign for a doubled letter" fill="currentColor" font-size="14">
<rect x="14" y="50" width="223" height="46" fill="currentColor" fill-opacity="0.10" stroke="currentColor" stroke-width="1.5"/>
<rect x="237" y="50" width="339" height="46" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5"/>
<rect x="576" y="50" width="39" height="46" fill="currentColor" fill-opacity="0.45" stroke="currentColor" stroke-width="1.5"/>
<rect x="615" y="50" width="10" height="46" fill="currentColor" stroke="currentColor" stroke-width="1.5"/>
<text x="125" y="78" text-anchor="middle">23 for letters</text>
<text x="406" y="78" text-anchor="middle">35 for words and names</text>
<text x="125" y="30" text-anchor="middle" font-size="13">(no j, v or w)</text>
<line x1="596" y1="98" x2="560" y2="130" stroke="currentColor"/>
<text x="556" y="146" text-anchor="end" font-size="13">4 nulls: mean nothing</text>
<line x1="620" y1="98" x2="620" y2="165" stroke="currentColor"/>
<text x="612" y="178" text-anchor="end" font-size="13">1 sign, “dowbleth”: the next letter is doubled</text>
<text x="14" y="146" font-size="13">The widths show the counts, 23 + 35 + 4 + 1.</text>
</svg>
<figcaption>Figure 9.3. Mary's nomenclator as the key preserved in the English archives is usually described. The counts are the ones commonly quoted; the signs themselves were drawn symbols.</figcaption>
</figure>

A reader who has a hundred letters in this cipher has a good chance of opening it without the key, as the figure
shows. The 23 letter signs are a single alphabet, so each sign stands for one letter every time. The commonest sign
will be *e*, the next most common *t* or *a* or *o*. The word signs are the second leak, because common words repeat:
a sign that appears at the head of every letter is "my" or "right trusty", and a sign that appears after "your" is
"majesty". The nulls are the third, and weakest, defense: they appear at random, so a counter who sees a sign that
never has a pattern can set it aside. The doubler marks double letters, which gives away the places where a word
like *letter* or *address* has its pair. [Chapter 2 of the cryptography book](../../book/02-Classical-Ciphers.md)
teaches this attack on a plain substitution in full, and [Cryptanalysis, chapter
2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) does the harder one with homophones and nulls on a computer.

What no source tells us is how Phelippes got in. The story as usually told has him count signs and guess, as he might
have with any cipher. Some writers add that Gifford brought him a copy of the key. Both are possible, and the record
supports neither exactly: the key that survives in the papers may be his own reconstruction or a copy of the original.
Mary's friends in France probably used the same system for some time, and Walsingham may have had earlier
intercepts from their circle to work from. What is certain is that by the middle of 1586 he was reading her letters without delay.

**Code it.** The program below is a toy with the same parts: 23 signs for letters, 35 for words, four nulls and a
doubler, and a sign for the gap between words. (Whether Mary's clerks marked the gaps with a sign or left spaces by
habit, the sources do not say.) Every sign is a two-digit number, shuffled by a fixed seed so that the output is the
same each time. The program then adds a forged postscript, which is the interesting part, and ends with the counting a
reader would do first.

```python
import random

# A toy nomenclator built like the one Mary's secretaries used: one sign for each
# letter, one sign for each of a few common words, some nulls, and a sign that means
# "the next letter is doubled". Every sign here is a two-digit number.
LETTERS = "abcdefghiklmnopqrstuxyz"               # no j, v or w, as in the key
WORDS = ("and the of to you your letter six gentlemen names queen money ships spain "
         "france england design men day by with for from my lord sir will are is "
         "that this as at have be").split()
rnd = random.Random(1586)
signs = list(range(10, 100))
rnd.shuffle(signs)
LETTER = {c: signs.pop() for c in LETTERS}
WORD = {w: signs.pop() for w in WORDS}
NULLS = [signs.pop() for _ in range(4)]
DOUBLE = signs.pop()
GAP = signs.pop()                                  # the toy marks word breaks with a sign
print(len(LETTER), "letter signs,", len(WORD), "word signs,", len(NULLS), "nulls")

def encipher(text):
    out = []
    for word in text.lower().split():
        if word in WORD:
            out.append(WORD[word])
        else:
            prev = ""
            for ch in word:
                if ch == prev:
                    out.append(DOUBLE)
                    out.append(LETTER[ch])
                    prev = ""
                else:
                    out.append(LETTER[ch])
                    prev = ch
        out.append(GAP)
        if rnd.random() < 0.15:
            out.append(rnd.choice(NULLS))          # a null, to spoil the counting
    return out

def decipher(groups):
    back = {v: k for k, v in LETTER.items()}
    back.update({v: " " + k + " " for k, v in WORD.items()})
    text, double = "", False
    for g in groups:
        if g in NULLS:
            continue
        if g == DOUBLE:
            double = True
        elif g == GAP:
            text += " "
        else:
            part = back[g]
            text += part * 2 if double and len(part) == 1 else part
            double = False
    return " ".join(text.split())

letter = encipher("I am glad to learn the names of the six gentlemen and the ships")
print(" ".join(map(str, letter)))
print(decipher(letter))

# The forger's step: with the key in hand, a new line can be added in the same cipher.
forged = letter + encipher("send me the names of the six gentlemen")
print(decipher(forged))

# Break it, step one: count the signs in a longer letter and see who comes first.
from collections import Counter
long_text = ("the queen is held at the house and the six gentlemen are ready the money "
             "is with me and the ships are at the port my lord the letters are safe and "
             "the men are ready at the hour the queen is held at the house and the six "
             "gentlemen are ready the money is with me")
meaning = {v: k for k, v in LETTER.items()}
meaning.update({v: k for k, v in WORD.items()})
meaning[GAP] = "(gap)"
for sign, n in Counter(encipher(long_text)).most_common(6):
    print(sign, n, meaning.get(sign, "(null)"))
```

Output:

```
23 letter signs, 35 word signs, 4 nulls
22 95 57 26 95 66 89 57 54 95 91 95 89 59 57 99 80 95 83 95 93 95 64 95 83 95 84 95 15 95 21 95 85 83 95 76 95
i am glad to learn the names of the six gentlemen and the ships
i am glad to learn the names of the six gentlemen and the ships send me the names of the six gentlemen
95 57 (gap)
83 13 the
59 12 e
99 6 r
38 5 h
54 5 d
```

The fourth line of the output is the lesson of the whole chapter. A cipher gives two protections: nobody can read the message, and
nobody can write one that the receiver will take for yours. Both rest on the same key. A reader who can open the
cipher can also add to it, and the receiver, who sees only the right signs in the right system, has nothing to tell
the difference. A secret cipher does not prove who wrote a message, only that the writer knew the key.

**Break it.** The last six lines of the output are what a reader sees first: the commonest sign is the gap, the next is the word
"the", and the third is *e*. A reader who guesses those three has a foothold, and the rest follows as it does for any
substitution: the signs that often stand next to *e* are *h*, *r* and *t*, a short group between two gaps that
repeats is "of" or "to", and so on. This is the method al-Kindi taught in
[Chapter 4](04-Baghdad-and-Cairo.md), with a few more shortcuts for the word signs. In real letters the counts are
rougher, because the key's 58 signs are spread over a much shorter text; but the shape is the same. A nomenclator is a
substitution cipher with a short dictionary added, and a short dictionary does not change what counting does to it.

## 9.4 The gallows letter and the trial

*Level: intermediate.*

Anthony Babington was twenty-five in the summer of 1586. He came from Dethick in Derbyshire, was rich and Catholic, and
had been a page in the Shrewsbury household where Mary was then held, which is how he came to know her and to admire
her. In 1586 he was the center of a circle of young Catholic gentlemen in London, among them Chidiock Tichborne and
Edward Abington, who had begun to talk about rescue. A priest, John Ballard, came back from France with the news that
Spain would invade if England's Catholics rose. What Babington's friends did not know was that Robert Poley, who had made himself Babington's friend, was Walsingham's
man, and that the letters Babington would write to Mary would go through Gifford's barrel.

On 6 July 1586 Babington wrote to Mary in cipher. The letter laid out a plan in three parts: a foreign army would land,
Mary would be freed by a party of gentlemen, and "six noble gentlemen, all my private friends" would carry out what he
called "that tragical execution", the killing of Elizabeth. It was delivered the same way as the others. Phelippes read
it within a day or so, and Walsingham saw it. He did not move. He wanted Mary's reply.

Mary's answer is dated 17 July. She dictated it, as she dictated most of her letters, to one of her two secretaries, Claude
Nau and Gilbert Curle, who put it into cipher; the two later said so in their depositions, under pressure. The letter does
not hide that she knew the whole plan. It discusses how she was to be taken out of Chartley, which gentlemen should
come, what foreign support she expected, and how the English Catholics should be prepared. On the matter of the killing,
the English copy of her reply says that when all was ready within and without the realm, "then shall it be time to set the
six gentlemen to work", on condition that she be taken away at the same moment. That is the sentence her accusers used,
and it is the one her defenders have argued about since.

Phelippes read the cipher and wrote out the clear text. On the address sheet of the copy he drew a small gallows, which
is why the document is known as the gallows letter. The copy is in The National Archives (reference SP 53/18/53), and
the British Library's web page on it is the best short account of what it shows. Walsingham then did the other thing
that makes this story an early and well-documented case of forgery in a broken cipher. He had Phelippes add a
postscript, in the same cipher, in Mary's voice, asking Babington for the names of the six gentlemen. Names would have
let Walsingham arrest the right men without a mistake. Whether the postscript was sent on to Babington, and whether he
answered it, the record does not make clear. The British Library notes that other passages
of the copy may also have been altered. This is a possibility, and in the nature of the case it cannot be ruled out,
because the originals of Mary's letters, in the cipher as she sent them, do not survive. What survives is a copy,
made in Walsingham's office, of what Phelippes said was inside.

Walsingham's men struck in August. Ballard was arrested on 4 August. Mary herself was taken while out riding on
11 August, and her secretaries, her papers and her money were seized and carried off. Babington ran, hid for days in
barns north of London, and was caught in mid-August. Fourteen men were tried and found guilty. Seven were executed on
20 September and seven on 21 September, by the full penalty for treason: hanged, cut down alive, disemboweled and
quartered. The accounts say the first group suffered so terribly that Elizabeth ordered the second to be hanged until
they were dead. Babington's confession and the confessions of the others were read at Mary's trial, because by then
none of them could be called.

| Date (old style) | What happened |
|---|---|
| 6 July 1586 | Babington's cipher letter to Mary; Phelippes reads it |
| 17 July | Mary's reply; the copy with the gallows; a forged postscript is added to the copy |
| 4 August | Ballard arrested |
| 11 August | Mary seized while riding; her secretaries and papers taken |
| mid-August | Babington taken |
| 20 and 21 September | The fourteen conspirators executed |
| 14 and 15 October | Mary tried at Fotheringhay Castle |
| 25 October | The commissioners meet at Westminster and pronounce sentence |
| 1 February 1587 | Elizabeth signs the death warrant |
| 8 February 1587 | Mary is beheaded at Fotheringhay |

The trial is the part that matters for this book. Mary was tried at Fotheringhay Castle on 14 and 15 October before a
commission of peers, privy councillors and judges. She began by refusing the commission's right to try her, since she
was a queen and not an English subject, and gave way only when told that her refusal would be taken as confession. She
had no lawyers, no access to her papers and no secretary, and the case against her was a prepared one. She denied
writing the 17 July letter. According to the record of the trial as printed in the State Trials, she said in substance that she had
never heard of Babington's plan, that Babington's confession was not evidence against her, that she could not be shown
to have written the letter, and that ciphers could be counterfeited, so that anyone could write in the signs she
used. She asked to see the originals, and asked that Nau and Curle be brought in to face her. They were not.

What the commission had were copies of the letters, Babington's confession and statements by Nau and Curle, who had
said in the weeks after their arrest that the letters were hers. Mary's supporters then and since have argued that those
statements were not freely given; the two men were in the hands of people who wanted that answer. Mary's point about the
cipher was the strongest she had, and it was about **authenticity**: a message in a code that other people knew could
not prove who wrote it. She was right in principle, and Phelippes's postscript, which she never saw, shows it. What the
original letter said, we cannot now know. Many historians, including some sympathetic to her, think Mary knew of and
welcomed the plan to free her, and that the 17 July letter matches what she had been writing for years. Whether she
consented to the killing in so many words cannot be answered from the evidence that survives.

The commission pronounced her guilty of "compassing and imagining" the queen's death on 25 October, and Parliament
petitioned Elizabeth to carry out the sentence. She hesitated for three months, for reasons the sources do not give
clearly: fear of setting a precedent against an anointed queen, fear of France and Spain, reluctance to be seen to do it.
She signed the warrant on 1 February 1587 and then said she had not meant it to go further; her secretary William
Davison, who had taken it to the Council, was sent to the Tower. Mary was beheaded in the great hall at Fotheringhay on
8 February. Two women of her household, Jane Kennedy and Elizabeth Curle (Gilbert Curle's sister), went with her to the
scaffold, and the contemporary accounts name them, with her steward and her physician, as the people who served her to
the last.

!!! note "Life story: the gallows letter (1586)"
    **Born:** 17 July 1586, Chartley Manor, Staffordshire, as Mary's cipher reply to Babington; the copy and the
    gallows are in Phelippes's office, probably within a day or two of the letter's passing through · **Purpose:** to
    give Walsingham written proof that Mary knew of and approved a plot against Elizabeth · **Helped:** convict Mary and
    the fourteen men, and fix in the English mind the idea that a state could, without breaking a seal, read and write
    in an enemy's cipher · **Status:** the original letter is lost; the copy survives, and the question of how much
    Phelippes altered is still argued

!!! note "Life story: Thomas Phelippes (about 1556 to 1625)"
    **Born:** about 1556, London; studied at Cambridge; in Walsingham's service from the late 1570s · **Purpose:**
    to read, copy and, when told, forge letters for the principal secretary · **Helped:** made the Babington plot
    provable; went on to serve Walsingham's successors, and read the ciphers of other plots · **Retired:** not
    cleanly. After Walsingham's death in 1590 his later career went badly: he was imprisoned more than once, for
    dealings with Catholic exiles and for debt, and died about 1625

## 9.5 Her lost letters, read in 2023

*Level: intermediate.*

The ciphers of 1586 are not all there is. Scholars had long known that Mary wrote through the early 1580s to the French
ambassador in London, Michel de Castelnau de la Mauvissière, who was sympathetic and carried her letters out. Where the
ciphered ones had gone, no one knew.

In early 2023 a team of three, George Lasry (an Israeli computer scientist), Norbert Biermann (a German researcher) and
Satoshi Tomokiyo (a Japanese researcher), announced that they had found and read 57 of them. The letters were in the
Bibliothèque nationale de France, catalogued as Italian documents of the early 1500s, and so had lain unread for more than
four hundred years. They date from 1578 to 1584, the long years of captivity under the Shrewsburys, before the Chartley
trap. They are in French, in a cipher that, as the team describes it, is homophonic: several signs for each of the
commoner letters, with a nomenclator of signs for words and names. The team recovered it, as they reported in a paper in
*Cryptologia* that year, with a computer search of the kind [Cryptanalysis, chapter
2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) teaches, followed by a great deal of hand work to read what the
search found and fix the places where it had guessed wrong.

As the finders describe them, the letters concern Mary's life as a prisoner, her health, her money and her treatment, and
the fortunes of her son James and her friends in France and Scotland. They give no new account of the Babington plot,
which came later. What they give is six years of the private mail of a woman who was watched constantly and still found
ways to write.

The find shows something this book returns to in every century: **a cipher has a date.** The letters of 1578 to 1584 stayed
unread, as far as anyone knows, for the whole of their own century, while the Chartley letters of 1586 were read within a
day. The difference was less the system than who held the courier. And in 2023 a computer search and three people with a
shared interest read the earlier ones in the end.

!!! note "Life story: Mary's lost letters (1578 to 1584, read in 2023)"
    **Born:** 1578 to 1584, in letters from Mary, Queen of Scots, mostly to Michel de Castelnau, the French ambassador
    in London; 57 survive · **Purpose:** to carry Mary's business out of English custody; the ciphers were more elaborate
    than the Chartley key · **Helped:** show that the system was unbroken in its own century and breakable in ours · **Status:**
    read by George Lasry, Norbert Biermann and Satoshi Tomokiyo; published in *Cryptologia* in 2023

## 9.6 A king who trusted his cipher: Spain and Viète

*Level: beginner.*

The most powerful ruler of the 1580s trusted his cipher as completely as Mary did, and with less reason. Philip II of
Spain governed Spain, Portugal, much of Italy, the Netherlands and a vast empire overseas. His letters went to
ambassadors, governors and generals across Europe, and by the 1580s a large part of the correspondence was in cipher.
Spain's state archive at Simancas still holds many of his cipher tables, which gives us a clear picture of what his
clerks used: a table of signs for letters, syllables and common words, with several signs for the commonest and some
nulls, a nomenclator on a bigger scale than Mary's. A table was supposed to be replaced from time to time, but replacing one meant sending a new copy to every
correspondent, and that was slow.

In France, in the years after the murder of Henri III in August 1589, Philip's agents were at work for the Catholic
League against Henri of Navarre, the Protestant claimant who became Henri IV. Spanish money paid the League's armies,
and in 1590 Spanish troops moved into Brittany and Picardy to support it. For Henri IV the war depended on knowing what
Spain would do and when. He had, among his councillors, a man who could read it.

François Viète (1540 to 1603) was a lawyer from Fontenay-le-Comte in western France, and he was the best mathematician
in France. He sat in the parliament of Brittany at Rennes, served as a *maître des requêtes* to Henri III and Henri IV,
and in his spare hours worked out a way of writing algebra with letters for the known and unknown quantities, the notation
that every school pupil now uses. His book *In artem analyticem isagoge* appeared in 1591. In the same years, from 1589,
he read the Spanish letters that French couriers and soldiers intercepted, and he read them, as far as we can
tell, without a key. The decipherment dated 15 March 1590 is the one usually cited.

How Viète did it is not recorded. He left no account of his method, and what we have comes from writers a generation or more
later. Spanish ciphers of the time had several hundred signs and were of the same family as Mary's, so the method must have
been the usual one: counting, matching repeated groups, guessing the names and titles that had to be in the letters (the
king, the pope, the Duke of Parma), and building the table up from the guesses. A mathematician had patience and a habit of
working from the particular case to the general rule, and Spain's clerks were not ready for it.

Spain did not learn of this right away. When it did, the story told by the French writer Tallemant des Réaux in the next
century, and repeated by David Kahn, is that Philip II was so sure his cipher was unreadable that he concluded the French
had used black magic, and complained of it to the pope. Kahn adds that the pope's own cipher clerks had been reading Spanish
ciphers for years and could say how it was done. Tallemant was writing about seventy years after the event, so treat the
details as lore. But the belief in magic fits the age: people then thought of cipher as one step from the black arts, and
the book that had made that link in print, Trithemius's *Steganographia*, is the subject of
[Chapter 7](07-Printed-Ciphers.md).

Viète's work leaves two lessons. Spain's loss was not a battle but its secrecy, for most of a war, and no one could measure
it. And the reader's cleverness was not the main thing. Mary lost to a linguist who had the courier; Philip lost to a
mathematician who had the letters. In both, the reader's master gave him the time and the material.

!!! note "Life story: François Viète (1540 to 1603)"
    **Born:** 1540, Fontenay-le-Comte, France; a lawyer, then a councillor to Henri III and Henri IV · **Purpose:**
    to read the intercepted letters of Philip II's agents in France for Henri IV · **Helped:** gave Henri IV a clear view
    of Spanish plans in 1589 to 1590; in mathematics, introduced letters for unknowns and constants in algebra (1591) ·
    **Status:** died in 1603; no account of his method survives

## 9.7 France: the Rossignols and the Great Cipher

*Level: intermediate.*

In 1626 the royal army of Louis XIII was besieging Réalmont, a Huguenot town in the south of France, under Henri II de
Bourbon, Prince de Condé. A message from the town was intercepted, and no one in the camp could read it until it came to
Antoine Rossignol (born 1600), a young man from Albi who was known locally for a taste for ciphers. He read it almost
at once. The defenders were short of powder and desperate for help. The besiegers sent the clear text back into the
town, with a demand for surrender, and Réalmont gave in. Some retellings give
the year 1628; the sources I could check agree on 1626, and I follow them.

Cardinal Richelieu, who was then building the machinery of the French state, heard of the young man and took him into
service. Rossignol served Louis XIII, then Cardinal Mazarin, then Louis XIV for the rest of a long life, and died in 1682.
His son Bonaventure (1648 to 1705) and a grandson followed him, so that the *cabinet du chiffre*, the cipher office of
the French crown, was for most of a century a family business. The sources I know name only men in the office. Whether
the wives and daughters of the Rossignols took part in the work, as the wives of other craft families commonly did, the
records do not say.

The family did two kinds of work. They read other people's ciphers, which kept them in favor, and they made the French
king's own. The ordinary cipher of the French court, the *Petit Chiffre*, was a simpler one, used for everyday business.
For the most secret letters Antoine and Bonaventure made the **Great Cipher** (*Grand Chiffre*), which Louis XIV and his
ministers used from the 1670s, as far as the record shows, for letters to ambassadors and generals. It was a book of 587
numbers. A reader who knew only that it was a nomenclator would expect numbers for letters and a few common words, as in
Mary's key. The Great Cipher was different: most of the numbers stood for **syllables**, a few for single letters and
words, and some were traps. A trap number meant "cross out the number just before me". Figure 9.4
shows the idea on a toy table, which also gives the commonest syllables several numbers each, as many nomenclators did.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="A toy Great Cipher: a sentence cut into syllables, each syllable a number, and a trap number that cancels the number before it" fill="currentColor" font-size="14">
<text x="14" y="20" font-size="13">The sentence, cut into syllables, then written as numbers (toy table):</text>
<rect x="14" y="32" width="96" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="62" y="52" text-anchor="middle">the</text>
<line x1="62" y1="63" x2="62" y2="82" stroke="currentColor"/>
<rect x="14" y="84" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="62" y="104" text-anchor="middle" font-weight="bold">137</text>
<rect x="118" y="32" width="96" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="166" y="52" text-anchor="middle">sol</text>
<line x1="166" y1="63" x2="166" y2="82" stroke="currentColor"/>
<rect x="118" y="84" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="166" y="104" text-anchor="middle" font-weight="bold">369</text>
<rect x="222" y="32" width="96" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="270" y="52" text-anchor="middle">diers</text>
<line x1="270" y1="63" x2="270" y2="82" stroke="currentColor"/>
<rect x="222" y="84" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="270" y="104" text-anchor="middle" font-weight="bold">190</text>
<rect x="326" y="32" width="96" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="374" y="52" text-anchor="middle">will</text>
<line x1="374" y1="63" x2="374" y2="82" stroke="currentColor"/>
<rect x="326" y="84" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="374" y="104" text-anchor="middle" font-weight="bold">178</text>
<rect x="430" y="32" width="96" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="478" y="52" text-anchor="middle">ar</text>
<line x1="478" y1="63" x2="478" y2="82" stroke="currentColor"/>
<rect x="430" y="84" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="478" y="104" text-anchor="middle" font-weight="bold">245</text>
<rect x="534" y="32" width="96" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="582" y="52" text-anchor="middle">rive</text>
<line x1="582" y1="63" x2="582" y2="82" stroke="currentColor"/>
<rect x="534" y="84" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="582" y="104" text-anchor="middle" font-weight="bold">364</text>
<text x="14" y="150" font-size="13">A trap: a junk number, then 217, which means “cross out the number before me”:</text>
<rect x="14" y="162" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1.4"/>
<text x="62" y="182" text-anchor="middle">190</text>
<rect x="118" y="162" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1.4"/>
<text x="166" y="182" text-anchor="middle">301</text>
<line x1="126" y1="177" x2="206" y2="177" stroke="currentColor" stroke-width="1.8"/>
<rect x="222" y="162" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="270" y="182" text-anchor="middle">217</text>
<rect x="326" y="162" width="96" height="30" rx="3" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1.4"/>
<text x="374" y="182" text-anchor="middle">178</text>
<text x="440" y="182" font-size="13">reads: diers, will</text>
<text x="14" y="228" font-size="13">The commonest syllable has several numbers: “the” is 137, 115 or 145.</text>
<text x="14" y="250" font-size="13">The real Great Cipher had 587 numbers, mostly for syllables.</text>
</svg>
<figcaption>Figure 9.4. The idea of the Great Cipher in a toy table: syllables for numbers, several numbers for the commonest, and a trap number.</figcaption>
</figure>

Each of these features cost the reader something. Counting numbers gave flat results, because syllables are far more
numerous than letters and no single syllable, even the commonest, is nearly as frequent as *e*. The traps broke up the
runs of numbers a reader would look for to find a repeated word. And the whole thing was in the hands of a family that kept its secrets.
The result held, as far as anyone knows, for two hundred years. When the Rossignols were gone and the keys were lost,
the letters in the archives could not be read by anyone, French or foreign.

Étienne Bazeries (1846 to 1931) was an army officer who made codebreaking his work, and in the 1890s he took up the
unreadable letters of the Great Cipher. He spent about three years on them, and announced the result in 1893; his own
account is in his book *Les chiffres secrets dévoilés* (1901). Kahn's account of his thinking runs like this. He began
with the idea that each number stood for a letter or a pair of digits stood for a letter, and found that there were far
too many different numbers for that. There were a few hundred of them, too few for whole words and too many for letters.
The next idea was that they were syllables, two or three letters each. He then looked for repeated groups of numbers
that could be a short frequent word in a letter of the period, tried "les ennemis" ("the enemies") as the likeliest
phrase, and found that it fitted a repeated run. From there the syllables followed, a few at a time, and he found the
traps by seeing numbers that made nonsense unless crossed out. 

The reward was a set of letters from the heart of Louis XIV's government. One, written in 1691 by the minister of war,
the marquis de Louvois, ordered the arrest of General Vivien de Bulonde, who had abandoned the siege of Cuneo, and said
he was to be held at Pignerol and allowed on the ramparts of the fortress, with a pair of code groups, 330 and 309, that
appear nowhere else. Bazeries read the two groups as the syllables of *masque* ("mask") and decided that Bulonde was the
famous prisoner in the iron mask. The theory had a short life. The reading of the groups is a guess, Bulonde was
released and went on living, and the dates do not fit the prisoner who died in the Bastille in 1703. The identity of the
man in the iron mask is still argued, but Bulonde is out of it.

**Code it.** The program below builds a toy of the Great Cipher: about 70 syllables and letters, three numbers each for
the six commonest syllables, one number for the others, and a trap number. It cuts a message into syllables, enciphers it,
deciphers it, and then does the first thing Bazeries might have done, which is to count. The words of the message are
run together, as in the ciphers of the time; a real one would be much longer.

```python
import random
from collections import Counter

# A toy in the style of the Great Cipher: numbers stand for syllables, the commonest
# syllables get several numbers, and one number is a trap meaning "cross out the
# number before me". This table is invented; the real one had 587 numbers.
SYLLABLES = ("the re con ment tion ing er an de on in ver pro to of ed es le ma se "
             "sol diers will ar rive at the cam bell ford and for ty be fore night "
             "ships sail from port ex pect aid ne ces sa ry").split()
LETTERS = "abcdefghijklmnopqrstuvwxyz"
rnd = random.Random(1691)
numbers = list(range(100, 400))
rnd.shuffle(numbers)
TABLE = {}
for s in SYLLABLES + list(LETTERS):
    count = 3 if s in ("the", "re", "ment", "ing", "er", "de") else 1
    TABLE[s] = [numbers.pop() for _ in range(count)]
TRAP = numbers.pop()
print(len(TABLE), "syllables and letters,", sum(map(len, TABLE.values())), "numbers, trap =", TRAP)

def split(word):                          # cut a word into the longest syllables we have
    out = []
    while word:
        for n in range(min(5, len(word)), 0, -1):
            if word[:n] in TABLE:
                out.append(word[:n])
                word = word[n:]
                break
    return out

def encipher(text):
    out, turn = [], 0
    for word in text.split():
        for syl in split(word):
            options = TABLE[syl]
            out.append(options[turn % len(options)])
            turn += 1
            if rnd.random() < 0.08:       # a trap: a junk number, then the trap number
                out.append(rnd.choice(numbers))
                out.append(TRAP)
    return out

def decipher(groups):
    back = {n: s for s, ns in TABLE.items() for n in ns}
    kept = []
    for g in groups:
        if g == TRAP:
            kept.pop()                    # cross out the number before it
        else:
            kept.append(g)
    return "".join(back.get(g, "?") for g in kept)

message = ("the soldiers will arrive at the camp before night and the ships "
           "sail from port the soldiers expect aid before the ships sail "
           "the soldiers will arrive before the night")
cipher = encipher(message)
print(" ".join(map(str, cipher[:14])), "...")
print(decipher(cipher)[:60], "...")

# Break it, step one: count pairs of numbers. A word that comes back shows up as a
# pair (or a run) that comes back, even when single numbers have several meanings.
back = {n: s for s, ns in TABLE.items() for n in ns}
pairs = Counter(zip(cipher, cipher[1:]))
for pair, times in pairs.most_common(3):
    print(pair, times, "times, really", "-".join(back.get(g, "?") for g in pair))
```

Output:

```
72 syllables and letters, 84 numbers, trap = 217
137 369 190 178 245 364 140 115 386 235 272 393 279 309 ...
thesoldierswillarriveatthecampbeforenightandtheshipssailfrom ...
(369, 190) 3 times, really sol-diers
(272, 393) 3 times, really be-fore
(137, 369) 2 times, really the-sol
```

**Break it.** Look at the last three lines. Single numbers tell the reader little, since "the" is split three ways and every
other syllable is rare. But a *pair* of numbers that comes back, 369 then 190, is a word that comes back, and a reader who
can guess what the letter is about ("soldiers" in a war letter, "before" in an order) gets two syllables at once. This is the
whole of the attack in small, and it is the reason Bazeries's "les ennemis" worked: in a French military letter, some
phrases were certain to come back. Beyond that point the real work was the slow filling-in of the table, and the toy is
too short and clean to show how slow. The traps are cheap to remove once you see them: the number just before 217 is always junk. What protected the Great
Cipher for two centuries was less the table than the fact that few people had both the letters and the years to spend.

!!! note "Life story: the Great Cipher (Louis XIV, 1670s to the 1700s)"
    **Born:** France, in the 1670s as far as the record shows, devised by Antoine Rossignol and his son Bonaventure ·
    **Purpose:** to protect the most secret letters of Louis XIV to his ambassadors and generals · **Helped:** held,
    as far as is known, against every foreign reader of its day · **Retired:** after the Rossignols and the loss of
    the key, it went unreadable in the archives · **Replaced by:** other nomenclators; read in 1893 by Étienne
    Bazeries, who published his method in 1901

!!! note "Life story: Antoine Rossignol (1600 to 1682)"
    **Born:** 1600, Albi, France · **Purpose:** to read the enemy's letters and make the king's · **Helped:** took
    Réalmont in 1626 by reading a letter, founded a family cipher office that served the French crown for a century
    · **Retired:** he died in 1682, after nearly sixty years of service, and his son Bonaventure took the office

## 9.8 The black chambers

*Level: intermediate.*

A black chamber was less a room than a routine. Letters for a foreign embassy, or from a suspect, were taken out of the
post at the sorting stage, opened, copied, resealed and put back, and the ones in cipher went to the decipherers. The
routine had to be fast, because a letter that arrived a day late told its recipient that someone had read it. It also
had to be quiet, because the whole value lay in the other side not knowing. Each country's version shows what that
asked of its people.

**England.** The state's right to read the mail grew out of the Civil War. Parliament's intelligence chief in the
1650s, John Thurloe, ran the post for Oliver Cromwell, and the Post Office Act of 1657, which gave the government a
monopoly of the carrying of letters, speaks in its own wording of uncovering plots against the Commonwealth. After the Restoration the practice
continued, under the Secretaries of State, who signed warrants for particular letters to be opened.

John Wallis (1616 to 1703), the mathematician who later introduced the sign ∞, was the first great English decipherer.
He was a clergyman and a Parliament man in the Civil War, and by his own later account he read a royalist cipher at a
dinner table in 1642 in a couple of hours, after which Parliament put him to work on intercepted letters. He was
appointed Savilian professor of geometry at Oxford in 1649 and read ciphers for the government off and on for the rest of
his life, under Charles II and William III. He seems to have guarded the method closely. The story told, again by Kahn,
is that when Leibniz, on behalf of the Elector of Hanover, asked him in the 1690s to teach his art to Hanoverian clerks,
Wallis put him off. He trained his grandson William Blencowe to follow him. The line passed to
others and then, in 1716, to Edward Willes, a clergyman who in time became Bishop of Bath and Wells. He held the post
until he died in 1773, and the Willes family, with its sons and then its relations, supplied the English Decipherer
for more than a century, until the office ended in the 1840s.

The English office sat within the Post Office as the Secret Department, which was paid out of secret service money, and
under the first two Georges it had real work to do. The Jacobite plots of 1715, 1722 and 1745 sent letters in cipher
between Paris, Rome and English supporters, and the decipherers read them. Their evidence has a place in English law:
accounts of the Atterbury case of 1722 and 1723 have Edward Willes explaining to Parliament how the cipher letters
had been read, which is an early case of a decipherer giving evidence of what a letter said.

The end came from a small thing. In 1844 the Italian exile Giuseppe Mazzini, who lived in London, found out that his
letters were being opened. His friends, it was said, laid small traps in the folds to see (accounts differ on whether it
was a hair or a seed), and the traps showed that the letters had been tampered with. The Home Secretary, Sir James Graham,
had signed the warrant and the news had gone to Austria, which was hostile to Mazzini's cause. In the same summer, a
small band of Mazzini's supporters, the Bandiera brothers, landed in Calabria and were caught and shot. The affair came
before the House of Commons in June 1844, public opinion turned, and a committee inquired. The Secret Department was
wound up, and the next standing office of the kind in Britain was Room 40, in 1914.

**France.** The French *cabinet noir* was the best known of these offices by name. The royal post office opened letters
on the orders of the king's ministers, the practice was systematic in the 1700s, and the Rossignols' cipher office stood
beside it. Writers and diplomats of the century often wrote knowing that their mail might be read.

**Vienna.** The best of them, by Kahn's account, was the *Geheime Kabinets-Kanzlei* of the Habsburgs, the Secret
Chancery of the Cabinet, in the eighteenth century. Figure 9.5 shows the daily round he describes. Mail for the foreign
embassies came in to the office at seven in the morning. Clerks warmed the seals over candles, opened the letters, copied
those that mattered and closed them with copies of the seals, and by half past nine they were back in the post. The
decipherers worked in shifts and earned bonuses for each key they solved. Austria could read the diplomatic traffic of
most of Europe, and sometimes sold what it read: one reported case, from 1774, has a French embassy secretary paying
a thousand ducats for a regular parcel of copied letters. The sovereigns of the century, among them Maria Theresa, who
reigned from 1740 to 1780, were the readers of what it brought in.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="A morning in Vienna's black chamber: mail arrives at 7, is opened, copied and resealed, and goes back into the post by half past nine" fill="currentColor" font-size="14">
<line x1="30" y1="52" x2="610" y2="52" stroke="currentColor" stroke-width="1.5"/>
<line x1="30" y1="46" x2="30" y2="58" stroke="currentColor" stroke-width="1.5"/>
<line x1="610" y1="46" x2="610" y2="58" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="34" text-anchor="middle" font-weight="bold">7:00</text>
<text x="610" y="34" text-anchor="middle" font-weight="bold">9:30</text>
<text x="30" y="76" text-anchor="middle" font-size="13">mail for the</text>
<text x="30" y="92" text-anchor="middle" font-size="13">embassies arrives</text>
<text x="610" y="76" text-anchor="middle" font-size="13">letters back</text>
<text x="610" y="92" text-anchor="middle" font-size="13">in the post</text>
<rect x="110" y="112" width="130" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="175" y="131" text-anchor="middle">1. Open</text>
<text x="175" y="148" text-anchor="middle" font-size="12">warm the wax</text>
<rect x="250" y="112" width="130" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="131" text-anchor="middle">2. Copy</text>
<text x="315" y="148" text-anchor="middle" font-size="12">the useful letters</text>
<rect x="390" y="112" width="130" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="455" y="131" text-anchor="middle">3. Reseal</text>
<text x="455" y="148" text-anchor="middle" font-size="12">with a copied seal</text>
<line x1="315" y1="158" x2="315" y2="184" stroke="currentColor"/>
<rect x="195" y="186" width="240" height="32" rx="4" fill="currentColor" fill-opacity="0.14" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="207" text-anchor="middle" font-size="13">ciphered copies go to the decipherers</text>
</svg>
<figcaption>Figure 9.5. A morning in Vienna's black chamber, as David Kahn tells it. The two times are Kahn's; the order of the steps is the order any such office had to follow.</figcaption>
</figure>

**Russia.** Russia learned the trade in the eighteenth century, and the case everyone tells is from 1744. The
chancellor, Alexei Bestuzhev-Ryumin, had the letters of the French envoy, the marquis de La Chétardie, intercepted,
deciphered and copied. La Chétardie was working to bring Bestuzhev down and wrote about the empress, Elizabeth,
without respect. Bestuzhev kept the letters until he had about fifty, then showed them to her, and on 6 June 1744
La Chétardie was ordered to leave Russia within twenty-four hours. The Russian empress thus read, in a French
diplomat's cipher, what he thought of her; and the speed of the expulsion shows how well the point of the
whole machine was understood. A popular story names the mathematician Christian Goldbach, who joined the foreign
ministry in 1742, as one of the decipherers. Goldbach did work in the ministry, but I could find no source that
settles his part in the deciphering, and I give the claim as a story, not a fact.

**Countermeasures.** A diplomat who knew his letters were read might send them by his own courier, past the post office
altogether. He might use a stronger cipher, at the cost of speed ([Chapter 7](07-Printed-Ciphers.md) comes back to the
trade-off). He might write in a cipher he knew the other side could read, and tell it what he wanted it to believe. Or he
might simply say less, which was the commonest course; much of the reserve of eighteenth-century diplomatic letters was the
habit of a man who knew who else was reading.

!!! note "Life story: John Wallis (1616 to 1703)"
    **Born:** 23 November 1616 (old style), Ashford, Kent · **Purpose:** to read intercepted letters for Parliament and
    the crown · **Helped:** made English decipherment a profession with a successor, his grandson William Blencowe;
    elsewhere in mathematics, introduced the sign ∞ in 1655 · **Retired:** died at Oxford on 28 October 1703

!!! note "Life story: the Willes family and the English Secret Department (1716 to 1844)"
    **Born:** 1716, when Edward Willes became the government's Decipherer · **Purpose:** to read the ciphers of
    Jacobite and foreign letters taken from the post · **Helped:** exposed plots from the Atterbury case of 1722
    onward; kept the office in one family for about a century · **Retired:** the Secret Department closed in 1844,
    after the Mazzini scandal · **Replaced by:** ciphers handled in the Foreign Office

!!! note "Life story: Vienna's Secret Chancery of the Cabinet (eighteenth century)"
    **Born:** the Habsburg court's mail-opening office, at work by the early 1700s (the date of its founding is given
    variously) · **Purpose:** to read the foreign ambassadors' letters each morning and have them back in the post by
    half past nine · **Helped:** gave the court a view of most of Europe's diplomacy, and a product to sell ·
    **Status:** the old Habsburg practice faded in the nineteenth century

## 9.9 The American Revolution: learning the trade, and the Culper Ring

*Level: beginner.*

The Americans of 1775 had nothing like a black chamber, and they learned quickly. The first lesson came in the fall of
1775, outside Boston. A letter in cipher, addressed to a British officer in the town, had come into American hands. It had
been sent in July by a woman who was the mistress of Dr. Benjamin Church, the surgeon-general of the Continental Army,
and she had been asked to carry it to the British lines. Another man who had known her passed it to Washington in
September. Washington could not read it, and it went to two decipherers. The Reverend Samuel West, a clergyman of
Dartmouth, Massachusetts, who was serving as an army chaplain, saw that the symbols fell in the same frequency pattern as
the letters of ordinary prose and so were a simple substitution, and read it. Elisha Porter, helped by Elbridge Gerry,
made a second reading on their own. The letter gave Church away. By one account Washington had the woman brought to camp and
used his authority to make her name Church. Church was court-martialed and held in prison, and in 1778 was allowed to
leave for the West Indies; his ship was never heard from again. The woman's name is not recorded in the sources I know. She is the first of several women in this
part of the story whose part is clear from the record and whose identity is not.

A cipher that a country clergyman could break was a poor one, as a few Americans knew. James Lovell, a
Massachusetts delegate to the Continental Congress who had himself been a prisoner of the British, is credited by Kahn
with breaking some British ciphers in 1780 and 1781 and with devising a keyword cipher for American envoys abroad, which
the envoys found too clumsy to use. The American war was fought largely without strong ciphers. What it had instead were
the older skills of the spy, and a few good ideas about hiding a message.

The best-known of these was the **Culper Ring**. After the British took New York in the fall of 1776, Washington had almost
no view of what happened there. He had lost Nathan Hale, an amateur caught and hanged in September 1776, and he learned
from it that spying was a craft. In 1778 he put an officer in charge of intelligence, Major Benjamin Tallmadge (1754 to
1835), a Connecticut dragoon officer who had grown up in Setauket on the north shore of Long Island and knew who his
neighbors were. Tallmadge set up a ring of people he had known since boyhood. Abraham Woodhull, a Setauket farmer, was
the first agent in the city and later the link between New York and the Sound, working under the cover name Samuel
Culper, later "Culper Senior". A merchant named Robert Townsend, who kept a shop in New York and wrote for the
loyalist newspaper of James Rivington, became the main source in the city, as "Culper Junior". Austin Roe, a tavern keeper,
rode between the city and Setauket. Caleb Brewster, a whaleboat captain, took the packets across Long Island Sound to
Connecticut, where Tallmadge's dragoons took them on to Washington. Figure 9.6 shows the chain.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="The Culper Ring's route: New York to Setauket on Long Island, by whaleboat across Long Island Sound to Connecticut, then to Washington's headquarters" fill="currentColor" font-size="14">
<defs><marker id="arr96" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="14" y="22" font-size="13" font-weight="bold">Long Island (British)</text>
<rect x="14" y="34" width="190" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="109" y="58" text-anchor="middle">New York City</text>
<text x="109" y="78" text-anchor="middle" font-size="13">Robert Townsend (Culper Jr.)</text>
<rect x="394" y="34" width="232" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="58" text-anchor="middle">Setauket</text>
<text x="510" y="78" text-anchor="middle" font-size="13">Abraham Woodhull (Culper Sr.)</text>
<line x1="206" y1="65" x2="392" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr96)"/>
<text x="299" y="56" text-anchor="middle" font-size="13">Austin Roe rides</text>
<line x1="510" y1="98" x2="510" y2="152" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr96)"/>
<text x="520" y="126" font-size="13">dead drop; Caleb</text>
<text x="520" y="142" font-size="13">Brewster's whaleboat</text>
<line x1="14" y1="122" x2="380" y2="122" stroke="currentColor" stroke-dasharray="6 5" opacity="0.6"/>
<text x="14" y="140" font-size="13" opacity="0.8">Long Island Sound</text>
<text x="14" y="176" font-size="13" font-weight="bold">Connecticut (American)</text>
<rect x="394" y="156" width="232" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="184" text-anchor="middle">Fairfield: Major Tallmadge</text>
<line x1="392" y1="179" x2="206" y2="179" stroke="currentColor" stroke-width="1.5" marker-end="url(#arr96)"/>
<text x="299" y="170" text-anchor="middle" font-size="13">rider</text>
<rect x="14" y="156" width="190" height="46" rx="4" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.5"/>
<text x="109" y="184" text-anchor="middle">Washington</text>
<text x="14" y="236" font-size="13">Washington sat in New Jersey or on the Hudson; the rider came to him.</text>
<text x="14" y="256" font-size="13">The real message was in invisible stain; the visible text was a cover letter.</text>
</svg>
<figcaption>Figure 9.6. The Culper Ring's chain from New York to Washington's headquarters. Each person knew the next link, and few knew more.</figcaption>
</figure>

Three ideas made the ring work. The first was the **chain**: no one in it knew more than the next link. The second was
the **code book**. Tallmadge made a book of numbered entries (the number is usually given as 763), with numbers for the words and names that mattered, such as "army", "New York" and
"Washington", and a way to spell the rest. A letter could be written mostly in numbers, so that a reader who had only the
letter could tell little. The third was **sympathetic stain**, an invisible ink made by James Jay (1732 to 1815), a
physician and the brother of John Jay. The message went on a blank sheet in the stain and could be read only by brushing
on a second chemical, the reagent. The visible letter, in ordinary ink, was a cover. Washington was writing to Tallmadge
about getting the stain by July 1779. A letter that fell into British hands read as a dull note about business, unless the finder knew to brush it with the
reagent.

**Code it.** The program below is a toy in the style of Tallmadge's: a few words and names with numbers, and a number for
each letter, so that anything not in the book can be spelled. The numbers are invented; they are not the ones he used.
The last lines show the weakness of any fixed code book: the same word is the same number in every note.

```python
# A toy codebook in the style of the Culper Ring's: numbers for common words and
# names, and a number for each letter to spell anything the book lacks.
# All the numbers here are invented; they are not the numbers Tallmadge used.
BOOK = ["army", "arrive", "boat", "british", "cannon", "fleet", "french", "letter",
        "york", "powder", "ships", "sail", "ten", "troops", "washington", "wait"]
CODE = {w: 700 + 3 * i for i, w in enumerate(BOOK)}          # 700, 703, 706, ...
ALPHA = {c: 100 + i for i, c in enumerate("abcdefghijklmnopqrstuvwxyz")}
BACK = {n: w for w, n in CODE.items()}
BACK.update({n: c for c, n in ALPHA.items()})

def encode(text):
    out = []
    for word in text.split(" "):
        out.append(CODE[word] if word in CODE else "-".join(str(ALPHA[c]) for c in word))
    return out

def decode(parts):
    words = []
    for p in parts:
        if isinstance(p, int):
            words.append(BACK[p])
        else:
            words.append("".join(BACK[int(n)] for n in p.split("-")))
    return " ".join(words)

note = encode("ten british ships sail from york")
print(note)
print(decode(note))

# Two notes a week apart: the same word is the same number every time, so a reader
# who knows what happened in the week can guess what 718 and 715 mean.
week1 = encode("french fleet arrive")
week2 = encode("french fleet wait")
print(week1, week2)
```

Output:

```
[736, 709, 730, 733, '105-117-114-112', 724]
ten british ships sail from york
[718, 715, 703] [718, 715, 745]
```

The two notes in the last line begin with the same two numbers. A reader of the first, who knows that a French fleet
was expected, can guess that 718 and 715 are "french" and "fleet", and then the third number is the news. The ring's
real defense was not the numbers. It was the chain and the stain: a note was meant never to be seen by a British reader
at all, and if it was, the visible text said nothing.

What did it produce? As usually told, Culper reports in 1780 warned Washington that the British in New York were planning
to attack the French army and fleet that had just landed at Newport, Rhode Island, and Washington's move toward New York
discouraged them. Townsend learned from his acquaintance with British officers, at the coffee house and in the
newspaper office, which regiments were moving and when. Townsend kept his role secret all his life. He died, unmarried,
in 1838, and the Culper Junior of the letters was not tied to him until 1930, when the historian Morton Pennypacker
matched the handwriting of the letters to Townsend's own.

!!! note "Life story: the Culper Ring (1778 to 1783)"
    **Born:** 1778, Setauket and New York, organized by Major Benjamin Tallmadge for George Washington · **Purpose:**
    to bring Washington reliable news of the British in New York · **Helped:** reports on British troop movements and
    plans, including (as usually told) the plan to strike the French at Newport in 1780 · **Retired:** the war ended in
    1783; Townsend's role was not known until 1930

**Two women, and what the sources say.** A story every account of the ring tells is that Anna Smith Strong (1740 to 1812),
a Setauket neighbor of Woodhull, signaled to Caleb Brewster by hanging a black petticoat on her clothesline when he
was ready to take a packet across the Sound, and put out a number of handkerchiefs to tell him which of six coves to use.
It is a good story, and there is no wartime document that mentions it. It first appears in print in Pennypacker's book of
1939, from local tradition in Setauket. Anna Strong was a real person who lived on the shore, and her husband, Selah,
had been held on a British prison ship; those facts are documented. The signal is not.

The other woman has no name at all. In a letter of 15 August 1779, Woodhull told Tallmadge that he would visit New York,
and that a "355" of his acquaintance would help him outwit the British. In the code book the number 355 means "lady". That
is all the record contains, one letter and one number, and it does not say who she was, whether she was a Culper agent at
all, or whether she did anything. "Agent 355", with a name, a life and a death on a British prison ship, is a figure
of later books. The best known name offered for her is Anna Strong, whom some historians accept and others reject for want of
any document. A careful reader should hold the line that the ring included at least one woman Woodhull trusted, and stop
there.

## 9.10 Arnold, André and Peggy Shippen

*Level: intermediate.*

Benedict Arnold (1741 to 1801), a Connecticut apothecary and merchant, was the most capable fighting general the
Americans had in the first years of the war, and he knew it. He took part in the march to Quebec in 1775, was wounded in
the leg at Saratoga in October 1777, and then watched other officers be promoted over him by a Congress he thought
stingy and ungrateful. After the British left Philadelphia in June 1778, Washington made him military governor of the
city. There, in April 1779, he married Margaret Shippen, called Peggy, then eighteen, the daughter of Edward Shippen, a
Philadelphia judge whose family had been unenthusiastic about the Revolution. Arnold was thirty-eight.

During the British occupation of Philadelphia in the winter of 1777 to 1778, Peggy had known a young British officer,
John André, adjutant general to Sir Henry Clinton and a man who had taken charge of British intelligence in New York.
In May 1779, a Philadelphia merchant named Joseph Stansbury crossed the lines to carry an offer from Arnold to
André: Arnold would change sides for money, and for a command where he could be of use. The correspondence that followed
went on for sixteen months. Arnold wrote as "Gustavus", André as "John Anderson".

The letters were hidden in two ways. The first was a **book code**. Each word was a set of three numbers, a page, a
line and the position of the word in the line, in a printed book that both men owned. The Clements Library, which holds
the letters, names the book as either Blackstone's *Commentaries on the Laws of England* or Nathan Bailey's
*Dictionary*, and sources differ on which; a Clements curator's article describes a more complicated system on Bailey's
Dictionary, 21st edition, of 1775. Part of each letter was left in plain words so that the whole could pass as a
merchant's business. The second was **invisible ink**: the Clements exhibit says that Stansbury wrote hidden messages
between the lines of letters intended for André. The Reverend Jonathan Odell, a Loyalist clergyman who served as
André's assistant, did the decoding in New York.

**Code it.** The program below is a toy book code. The "book" is a tiny dictionary of about fifty words with eight lines
to a page, and a word is written as page and line. The toy uses two numbers, where Arnold's used three. The last lines
show the weakness that a dictionary has and a novel does not.

```python
# A toy book code in the style of Arnold's: each word is written as page and line of a
# dictionary that both men own. This tiny "dictionary" has 8 lines to a page.
ENTRIES = sorted("""army arrive attack boat bridge british camp cannon captain colonel
command corps council danger detach enemy fleet force fort french general guard hudson
infantry king letter militia money news night orders passage plan point post powder
prisoner river salt scout ships signal spy stores summer supply surprise troops west
winter""".split())
PLACE = {w: (i // 8 + 1, i % 8 + 1) for i, w in enumerate(ENTRIES)}
BACK = {v: k for k, v in PLACE.items()}

def encode(text):
    return [PLACE[w] for w in text.split()]

secret = encode("fleet arrive night attack west")
print(" ".join(f"{p}.{l}" for p, l in secret))

# Without the book the numbers still talk: the dictionary is in alphabetical order, so
# a low page number means a word near the start of the alphabet.
pages = PLACE[ENTRIES[-1]][0]
for (p, l), real in zip(secret, "fleet arrive night attack west".split()):
    guess = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[int((p - 1) / pages * 26)]
    print(f"page {p:2d} of {pages}: starts near {guess}   (really {real})")
```

Output:

```
3.1 1.2 4.6 1.3 7.1
page  3 of 7: starts near H   (really fleet)
page  1 of 7: starts near A   (really arrive)
page  4 of 7: starts near L   (really night)
page  1 of 7: starts near A   (really attack)
page  7 of 7: starts near W   (really west)
```

**Break it.** With the book, every message reads at once, since each group is an address. Without it, the numbers are not
random, because a dictionary is in alphabetical order and so the first number of each group points roughly to the first
letter of the word. Page 7 of 7 is a word near the end of the alphabet, page 1 of 7 one near the start. The guesses are
rough, off by a few letters, but they narrow the choices, and if a reader can guess two or three words in a message, the
rest of the pattern falls into place. So a book code is strong while the book stays secret, and a plain dictionary is a worse book than a novel, because its
order leaks; and if the enemy guesses the book, every message falls at once.

Peggy Shippen's part in all this is where the evidence is thinnest and the arguments are hottest. What the Clements
exhibit says is that André suggested that Peggy write letters to a friend as cover for the correspondence, and that
Stansbury put invisible writing into the letters sent for André. At least one letter in her hand is described in library resources as carrying invisible writing by
Arnold. Some historians, among them Clare Brandt in her life of Arnold (1994), have read
this as showing that Peggy was an active partner who had helped to start the whole affair; others read it as showing only
that she was used as a cover by a husband and a British officer who had known her. The British crown later gave her a
pension, which some take as payment for services of her own. What is missing is any document in her own words that says
what she knew and when. On the day the plot failed, she is said to have behaved with such evident madness that
Washington and his officers, among them Alexander Hamilton, believed her innocent and sent her to her family. Whether
that was grief, fear or a performance has been argued ever since, and the record does not settle it.

The plot ended in the way that most such plots did, and not through the cipher. In August 1780 Arnold took command of
West Point, the fortress that held the Hudson River. On the night of 21 September, André came ashore from the British ship
*Vulture* to meet him near Haverstraw. The ship was driven off by American fire before the meeting was over, and André
had to go back overland, in plain clothes, with a pass in the name of John Anderson signed by Arnold. In his boot he
carried papers on West Point, in Arnold's own handwriting, not in cipher. On 23 September three New York militiamen,
John Paulding, Isaac Van Wart and David Williams, stopped him near Tarrytown, searched him and found the papers.
The commander of the outpost, Lieutenant Colonel John Jameson, sent the papers to Washington, but also, not believing
that Arnold could be involved, told him that a man called Anderson had been taken, and Arnold escaped down the Hudson to the *Vulture* on
25 September, before Washington arrived. André was tried by a board of American generals and hanged at Tappan on
2 October. Tallmadge, who had guarded him, is said to have been shaken by it. Arnold became a brigadier general in the
British army, and Peggy joined him in New York.

!!! note "Life story: the Arnold-André book code (1779 to 1780)"
    **Born:** May 1779, between Benedict Arnold and John André, through Joseph Stansbury · **Purpose:** to arrange the
    sale of West Point, with the words hidden in a printed book's page numbers and, in places, in invisible ink ·
    **Helped:** kept the letters from American readers for sixteen months · **Retired:** the plot failed on
    23 September 1780, when André was caught with plain papers; the cipher was not broken

!!! note "Life story: Peggy Shippen Arnold (1760 to 1804)"
    **Born:** 1760, Philadelphia; married Benedict Arnold in April 1779 · **Purpose:** the sources do not say, which is
    the problem · **Helped:** carried, or was a cover for, letters between her husband and John André; a British pension
    followed · **Retired:** left America for England with her husband in 1781, died in London in 1804

## 9.11 In the real world: what the sources say and do not say

*Level: intermediate.*

The cases of this chapter rest on very different evidence. A copy made in a spy's office, a book written seventy years
after the event, a tradition collected in 1939 and a letter in a library are not the same kind of fact.

| Case | What survives | What it shows | What it does not show |
|---|---|---|---|
| Babington plot (1586) | Phelippes's copy of Mary's letter, with the gallows (SP 53/18/53); trial record; confessions | Mary knew of and welcomed a rescue plan; Walsingham read her mail and forged a postscript | what Mary's original said; whether she agreed to the killing in words |
| Mary's lost letters (1578 to 1584) | 57 ciphered letters in the BnF | a good cipher stayed unread for 440 years | that no one at the time read them |
| Viète and Philip II (1589 to 1590) | Tallemant's later story, repeated by Kahn | a French mathematician read Spanish letters | his method; whether Philip really blamed magic |
| Réalmont (1626) | accounts in later books | Rossignol's reputation began with a siege letter | the letter's text |
| Great Cipher | letters in the archives, read from the 1890s; Bazeries's own book | syllable numbers and traps defeated readers for 200 years | the real table's design, beyond Bazeries's account |
| Wallis and the Willes family | Wallis's own papers; the Post Office's Secret Department | a family of decipherers served England for a century | how many letters they read |
| Vienna's chamber | Kahn's account; later studies | a daily routine and a price list | exact dates and the size of the staff |
| La Chétardie (1744) | the expulsion; Bestuzhev's use of the letters | an envoy was expelled over deciphered letters | who the decipherers were |
| Culper Ring (1778 to 1783) | the letters, the code book, Washington's orders | a working chain from New York to Washington | the petticoat signal; the name of "355" |
| Arnold and André (1779 to 1780) | the letters at the Clements Library, coded and decoded | a book code and invisible ink hid a treason for sixteen months | how far Peggy Shippen took part |

### Can these be broken today?

Yes, all of them that have a text to break, and mostly in seconds.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Mary's nomenclators | easily, by computer | One sign per letter, plus a short word list. Count the signs, guess the commonest, and a program climbs to the rest; with homophones it takes more text, as in 2023. |
| Viète's Spanish cipher | easily, with enough letters | The same family: signs for letters, syllables and words, with many repeats. |
| The Great Cipher | with work | A big table of 587 numbers needs many letters, as §9.12 shows; a computer does the counting and pair-matching fast, and a person must still read the names in context. |
| The Culper code book | at once | A fixed list of numbers for words: common words repeat, and a captured copy of the book ends it. |
| Arnold's book code | instantly with the book | Find the book and every group is an address. Without it, a dictionary's alphabetical order leaks the first letters. |

## 9.12 Going deeper

*Level: expert.*

**Why a large code table resists.** Suppose a table has $k$ numbers and a reader sees $n$ groups, each number used with
equal chance. A given number is missed by one group with probability $1 - 1/k$, so by all $n$ with $(1 - 1/k)^n \approx
e^{-n/k}$. The fraction of the table the reader has seen at least once is therefore about
$$1 - e^{-n/k}.$$
For the Great Cipher, $k = 587$, and a letter of 300 groups shows about $1 - e^{-0.51} \approx 40\%$ of the table. To see
95 percent takes $n = k \ln 20 \approx 1{,}760$ groups, six letters of that length. Real use is far from equal: a few
syllables carry most of the text and most numbers are rare, so the unseen tail is longer than the formula says. A reader
can guess a number seen two or three times from context; one seen once is nearly a blank. This is why Bazeries needed a
pile of letters, and why a short intercept of the Great Cipher gave almost nothing. It is also the economics of the black
chamber: its power came from volume, which is a function of the post and not of any one cipher.

**The Babington evidence.** The argument about the 17 July letter has a long history. John Hungerford Pollen, a Jesuit
historian, argued in 1922 that the copies were altered well beyond the postscript. Most later accounts, among them John Guy's
life of Mary (2004) and Stephen Alford's study of Walsingham's service (2012), accept that Mary took part in a plan to free
herself and that Walsingham let the plot run to draw out her words, while leaving open how far the surviving text was
shaped by Phelippes. That is a disagreement about the original letter, which is lost. No source can settle it, because the
only witnesses to the original were the people who handled it.

**Tracing a story.** The test used in [Chapter 5](05-The-Medieval-World.md) for the Templar cipher works here. Ask when the
anecdote first appears in print, and whether any document from the time mentions it. The petticoat first appears in 1939. The
number 355 appears once in 1779. Anna Strong as 355 is a suggestion of recent historians, with no document behind it. Each step is a later writer turning a
possibility into a statement, and the sources never made it.

**Open questions.** How long Phelippes took to open Mary's cipher, and whether he had a copy of the key. How much of the
gallows letter's text is his. Whether the Great Cipher's real table gave its commonest syllables more than one number. What
the 1580s letters in the BnF say in detail. Whether Peggy Shippen began the Arnold correspondence or joined it.

## Check yourself

??? question "1. Why did Walsingham wait for Mary's reply instead of arresting Babington at once?"

    The Act of 1585 made the case against Mary turn on what she had known and agreed to. Babington's letter alone proved
    nothing about her, so Walsingham needed her words, in her cipher, approving the plan.

??? question "2. A cipher gives its users two protections. What are they, and which did Phelippes's postscript attack?"

    Secrecy (no one else can read it) and authenticity (no one else can write in it). The postscript attacked
    authenticity: with the key, a reader can add text that the receiver takes as the sender's.

??? question "3. In the toy nomenclator, which sign came first in the count, and why?"

    The gap sign, because it follows every word; then the word sign for "the", then the letter *e*. A short word list
    and a single alphabet leave the usual frequencies in place.

??? question "4. Why do single numbers of the Great Cipher tell a reader little while pairs tell more?"

    Syllables are many and each is rare, so no single number stands out, and the commonest syllables have several numbers
    in the toy. But a word that returns, like "soldiers", returns as the same pair of numbers.

??? question "5. A table has 300 signs, each used with equal chance. About how many groups must a reader see to have met 86 percent of them?"

    $1 - e^{-n/k} = 0.86$ gives $n/k \approx 2$, so $n \approx 600$ groups.

??? question "6. What year was Réalmont besieged, and what did Rossignol read?"

    1626, by the sources checked here (some retellings say 1628). He read a defenders' letter that said they were short of
    powder, and the town surrendered when the clear text was sent back.

??? question "7. What did Bazeries decide the Great Cipher's numbers stood for, and what was wrong with his Bulonde reading?"

    Mostly syllables. He read the pair 330 and 309 in a 1691 letter as *masque* and concluded that General Bulonde was
    the man in the iron mask; that is a guess, Bulonde was released, and the dates do not fit.

??? question "8. Name the three jobs of a black chamber and the two times in Vienna's morning."

    Opening, copying and deciphering (resealing is part of opening). Mail arrived at 7:00 and was back in the post by
    9:30, on Kahn's account.

??? question "9. What is the evidence for the petticoat signal, and for \"Agent 355\"?"

    For the petticoat, no wartime document: it first appears in a book of 1939, from local tradition. For 355, one
    letter of 15 August 1779, in which Woodhull mentions a "355" of his acquaintance, and a code book where 355 means
    "lady". Neither gives a name.

??? question "10. John André was caught in 1780 with Arnold's papers. Did anyone have to break the book code to expose the plot?"

    No. The papers in his boot were in Arnold's own hand, in plain words. The cipher hid the letters for sixteen months,
    and the plot fell because a messenger had to carry plain documents.

## What you learned

- Governments with a post could open mail; a black chamber was a routine of opening, copying, resealing and deciphering.
- Mary, Queen of Scots, was caught because her courier was Walsingham's man; Phelippes read her cipher, forged a postscript,
  and the 17 July 1586 letter was the center of her trial. The original is lost, and how far the copy was altered is argued.
- A cipher proves secrecy only while the key is secret, and with the key a reader can also forge.
- Viète read Philip II's letters for Henri IV in 1589 and 1590; the Rossignols made France's Great Cipher, which held for
  two centuries until Bazeries read it in 1893.
- England's Willes family, Vienna's Secret Chancery and Russia's Bestuzhev show the black chamber as a routine; the Mazzini
  scandal of 1844 ended England's.
- The Culper Ring used a chain, a code book and invisible stain; Arnold and André used a book code and invisible ink, and the plot
  fell because of plain papers, not a broken cipher.
- Women in the record: Mary, her household, two empresses, Peggy Shippen, with the petticoat and "355" flagged as unproved.

**Next:** Chapter 10, the telegraph, where codes are priced by the word and the keyword cipher falls. For the terms, see
the [Glossary](Glossary.md).

## Further reading

- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996): the chapters on Renaissance ciphers, the black chambers and
  the American Revolution.
- John Guy, *My Heart Is My Own: The Life of Mary Queen of Scots* (Fourth Estate, 2004).
- Stephen Alford, *The Watchers: A Secret History of the Reign of Elizabeth I* (Allen Lane, 2012).
- Alan Haynes, *Invisible Power: The Elizabethan Secret Services, 1570-1603* (Alan Sutton, 1992).
- John Hungerford Pollen, *Mary Queen of Scots and the Babington Plot* (Scottish History Society, 1922).
- George Lasry, Norbert Biermann and Satoshi Tomokiyo, "Deciphering Mary Stuart's Lost Letters from 1578-1584",
  *Cryptologia* 47, no. 2 (2023).
- The National Archives, SP 53/18/53 (the copy of Mary's letter of 17 July 1586), and the British Library's "The gallows
  letter".
- Étienne Bazeries, *Les chiffres secrets dévoilés* (Paris, 1901).
- Alexander Rose, *Washington's Spies: The Story of America's First Spy Ring* (Bantam, 2006).
- Kenneth Daigler, *Spies, Patriots, and Traitors: American Intelligence in the Revolutionary War* (Georgetown University
  Press, 2014).
- Morton Pennypacker, *General Washington's Spies on Long Island and in New York* (1939): the source of the petticoat
  tradition, to be read with care.
- Clare Brandt, *The Man in the Mirror: A Life of Benedict Arnold* (Random House, 1994).
- The Clements Library, University of Michigan, "Spy Letters of the American Revolution" (online exhibit).
- Samuel West to George Washington, 11 October 1775, in *The Papers of George Washington* (Founders Online): the Church
  decipherment.

*Weaker sources used:* the date 1626 for Réalmont follows an aggregate of web accounts and Wikipedia; the Vienna 1774 price,
the Atterbury testimony of Willes and the Mazzini traps follow general histories and Wikipedia and are not traced to a first
source; the counts for Mary's key (23, 35, 4, 1) are from commonly quoted descriptions, and the key itself was not seen; the
Culper code book's 763 entries are from general accounts.
