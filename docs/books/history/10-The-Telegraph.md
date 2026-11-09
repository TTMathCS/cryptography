# 10. The telegraph: codes by the word, and the keyword falls

*In 1844 a message crossed forty miles in an instant, and within a generation every business, army and ministry in the industrial world was sending its secrets through the hands of strangers. This chapter tells what they did about it, from the 1830s to the summer of 1914: the printed code books that cut the bill and hid a little, the cryptogram craze that Edgar Allan Poe started, the two men, an Englishman and a Prussian, who broke the cipher that had been called unbreakable for three centuries, Wheatstone's pair cipher and Jefferson's wheel, the telegraph war in America, the Chinese and Japanese codes for scripts that Morse's alphabet could not carry, the Tsar's mail readers, the talking drums of Africa, and the Dutch-born professor whose six rules of 1883 still govern every cipher in this book. You will break a Poe-style cryptogram, find a key length with Kasiski's repeats, encrypt with Playfair, read a stack of telegrams sent under one key, and run a wheel cipher.*

!!! abstract "In this chapter"
    **You will learn:**

    - why the telegraph made secrecy both harder and more valuable, and why a price per word gave the world its first mass market in codes;
    - who Francis Smith, Edgar Allan Poe, Charles Babbage, Friedrich Kasiski, Charles Wheatstone, Lyon Playfair, Anson Stager, Hans Schjellerup, Étienne Bazeries and Auguste Kerckhoffs were, and what each did;
    - how the keyword cipher fell, told as the story of two men who never met, and what the Kasiski test looks like on a real message;
    - how the Union and the Confederacy used (and misused) ciphers on the wire, and what the first telegraph war taught;
    - how Chinese, Japanese and Russian telegraph and police practice shaped what was sent and who read it, and what the talking drums of Central and West Africa show about codes and noise;
    - what Kerckhoffs's six rules said in 1883, why the second one lasted, and what the sources do and do not show about all of these stories.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) (code, cipher and key), [chapter 7](07-Printed-Ciphers.md) (the keyword cipher's origin, which this chapter does not retell) and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) (substitution and the keyword cipher). The attack methods are taught in full in [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md); here you meet them as the people who found them did.

    **Levels:** §10.1 to §10.4, §10.6 and §10.10 are for beginners, §10.5, §10.7 to §10.9 and §10.11 to §10.13 are intermediate, §10.14 is expert.

## 10.1 The problem: a wire that every clerk can read

*Level: beginner.*

Until the 1790s a message went as fast as a rider, a ship or a signal fire could take it. Then France built the first national signaling network, the optical telegraph of the Chappe brothers: towers on hilltops a few miles apart, each with a tall post and movable arms, and an operator at each who copied the pattern he saw from the last tower and set the same pattern for the next. The first line, from Paris to Lille, opened in 1794. The system had a built-in security feature, and it is worth noticing because the electric telegraph lost it. The operators in the middle did not know what they were relaying. The arms showed one of 92 signs, and the meaning came from a code book of 92 pages of 92 entries each, 8,464 words and phrases in all, which only the two ends of the line held. A man in a tower could see every message and read none.

The system was not safe from a determined inside job, as two bankers from Bordeaux, François and Joseph Blanc, showed. By the usual account, between 1834 and 1836 they paid a telegraph operator at Tours to add a deliberate, harmless-looking error to government messages passing south. A second man watching the tower at Bordeaux read the error as a signal: the Paris stock market had gone up, or down. The brothers got market news a day before the mail did. They were caught in 1836, tried, and let go, because no French law yet covered the crime. It is the first recorded attack on a telecommunications network, and it was done by corrupting the people, not the code.

The electric telegraph arrived a few years later, and it put the whole message into the hands of everyone on the path. William Fothergill Cooke and Charles Wheatstone patented their telegraph in England in 1837. Its first commercial line ran beside the Great Western Railway out of London, opened in stages from 1838, and it had its first public sensation on New Year's Day 1845, when a message went from Slough to Paddington describing a murderer who had just boarded a London train. The needle telegraph had no letter Q, so the clerk spelled the man's description "KWAKER", and the police were waiting when he got off. Samuel Morse, an American painter turned inventor, sent "What hath God wrought" from Washington to Baltimore on 24 May 1844 on a line paid for by Congress. Within a decade there were thousands of miles of wire in Britain and the United States, and in 1851 a cable under the Channel from Dover to Calais that lasted. In 1858 Queen Victoria and President Buchanan exchanged greetings over the first Atlantic cable; the Queen's message of 98 words took more than sixteen hours to get through, and the cable failed within weeks. A lasting cable was laid in 1866. By 1870 a London merchant could send a telegram to Bombay. Figure 10.1 sets these dates beside the ones in this chapter.

<figure class="mars-fig">
<svg viewBox="0 0 640 419" width="640" role="img" aria-label="Timeline of the telegraph age from 1794 to August 1914" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="402" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1794</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">Chappe's optical telegraph opens, Paris to Lille</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">1837</text>
<circle cx="102" cy="48" r="3.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start">Cooke and Wheatstone patent the British telegraph</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">1844</text>
<circle cx="102" cy="74" r="3.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start">Morse's line, Washington to Baltimore</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">1845</text>
<circle cx="102" cy="100" r="3.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start">Smith publishes the first telegraph code book</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">1854</text>
<circle cx="102" cy="126" r="4.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start" font-weight="bold">Babbage solves the keyword cipher; Playfair cipher</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">1861-65</text>
<circle cx="102" cy="152" r="3.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start">The American Civil War: the first telegraph war</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">1863</text>
<circle cx="102" cy="178" r="4.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start" font-weight="bold">Kasiski publishes the attack on the keyword cipher</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">1866</text>
<circle cx="102" cy="204" r="3.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start">The first lasting Atlantic cable</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">1871-72</text>
<circle cx="102" cy="230" r="3.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start">Chinese telegraph code; Japan's cipher charts follow</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">1878</text>
<circle cx="102" cy="256" r="3.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start">The New York Tribune prints Tilden's cipher telegrams</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">1881</text>
<circle cx="102" cy="282" r="3.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start">The Okhrana is founded</text>
<text x="88" y="313" font-size="14" text-anchor="end" font-weight="bold">1883</text>
<circle cx="102" cy="308" r="4.5" fill="currentColor"/>
<text x="118" y="313" font-size="14" text-anchor="start" font-weight="bold">Kerckhoffs publishes his six rules</text>
<text x="88" y="339" font-size="14" text-anchor="end" font-weight="bold">1891</text>
<circle cx="102" cy="334" r="3.5" fill="currentColor"/>
<text x="118" y="339" font-size="14" text-anchor="start">Bazeries reinvents the wheel cipher</text>
<text x="88" y="365" font-size="14" text-anchor="end" font-weight="bold">1901</text>
<circle cx="102" cy="360" r="3.5" fill="currentColor"/>
<text x="118" y="365" font-size="14" text-anchor="start">Marconi's signal crosses the Atlantic</text>
<text x="88" y="391" font-size="14" text-anchor="end" font-weight="bold">Aug 1914</text>
<circle cx="102" cy="386" r="3.5" fill="currentColor"/>
<text x="118" y="391" font-size="14" text-anchor="start">Cables cut; radio carries the war</text>
</svg>
<figcaption>Figure 10.1. The telegraph age. Bold dates mark the three events that changed what a cipher had to be: the fall of the keyword cipher (1854 and 1863) and Kerckhoffs's rules (1883).</figcaption>
</figure>

Look at what a telegram went through. You wrote the message on a form and handed it to a clerk at a counter, who read it to count the words and name the price. An operator at the first office tapped it out. On a long route it reached a relay office, where another operator copied it down and sent it on, sometimes more than once. At the last office a clerk wrote it out, and a messenger boy carried the paper to the door. Figure 10.2 draws the path. Every person on it could read the text, some of them twice, and some of them wrote it down in a book that stayed in the office. By law and by company rule they were bound to secrecy. In practice the rule rested on their honesty, and they were poorly paid.

<figure class="mars-fig">
<svg viewBox="0 0 640 366" width="640" role="img" aria-label="The path of a telegram through seven pairs of hands, five of which could read it" fill="currentColor" font-size="14">
<rect x="20" y="10" width="190" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="32" font-size="14" text-anchor="middle" font-weight="bold">Sender</text>
<text x="226" y="32" font-size="14" text-anchor="start">writes the message on a form</text>
<line x1="115" y1="44" x2="115" y2="60" stroke="currentColor" stroke-width="1.4"/>
<path d="M110 55 L115 62 L120 55" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="62" width="190" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="84" font-size="14" text-anchor="middle" font-weight="bold">Counter clerk</text>
<text x="226" y="84" font-size="14" text-anchor="start">reads it, counts the words, names the price</text>
<line x1="115" y1="96" x2="115" y2="112" stroke="currentColor" stroke-width="1.4"/>
<path d="M110 107 L115 114 L120 107" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="114" width="190" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="136" font-size="14" text-anchor="middle" font-weight="bold">First operator</text>
<text x="226" y="136" font-size="14" text-anchor="start">taps it out; may log it in a book</text>
<line x1="115" y1="148" x2="115" y2="164" stroke="currentColor" stroke-width="1.4"/>
<path d="M110 159 L115 166 L120 159" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="166" width="190" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="188" font-size="14" text-anchor="middle" font-weight="bold">Relay office</text>
<text x="226" y="188" font-size="14" text-anchor="start">copies it down and sends it again, once or more</text>
<line x1="115" y1="200" x2="115" y2="216" stroke="currentColor" stroke-width="1.4"/>
<path d="M110 211 L115 218 L120 211" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="218" width="190" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="240" font-size="14" text-anchor="middle" font-weight="bold">Receiving clerk</text>
<text x="226" y="240" font-size="14" text-anchor="start">writes it out on the delivery form</text>
<line x1="115" y1="252" x2="115" y2="268" stroke="currentColor" stroke-width="1.4"/>
<path d="M110 263 L115 270 L120 263" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="270" width="190" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="292" font-size="14" text-anchor="middle" font-weight="bold">Messenger boy</text>
<text x="226" y="292" font-size="14" text-anchor="start">carries the paper to the door</text>
<line x1="115" y1="304" x2="115" y2="320" stroke="currentColor" stroke-width="1.4"/>
<path d="M110 315 L115 322 L120 315" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="20" y="322" width="190" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="115" y="344" font-size="14" text-anchor="middle" font-weight="bold">Addressee</text>
<text x="226" y="344" font-size="14" text-anchor="start">reads it</text>
</svg>
<figcaption>Figure 10.2. The path of a telegram, about 1860. Everyone from the counter to the messenger could read the text, and the offices kept copies.</figcaption>
</figure>

Four problems came with the wire, and the rest of this chapter answers them in turn.

1. **Cost.** Telegrams were charged by the word. On the first lasting Atlantic cable of 1866 the price was reported at £20 for a message of up to twenty words, a pound a word, a sum few firms could spend lightly. Even inland, where a word cost a few pence, a firm that sent hundreds of telegrams a year watched every word.
2. **Secrecy from the clerks, the rivals and the police.** A merchant telling his agent how much to bid on a cargo of cotton did not want the clerk at the counter, or the clerk's friend at the cotton exchange, to know.
3. **Accuracy.** A wrong letter in a telegram could change its meaning from "buy" to "sell", and wires, relays and tired operators made wrong letters common. A firm needed to know when a word had been garbled.
4. **Authenticity.** The man at the other end of a wire could not be seen. On 13 July 1870 King Wilhelm I of Prussia, taking the waters at Ems, had his secretary telegraph Bismarck an account of a polite meeting with the French ambassador. Bismarck cut the telegram down to a few curt lines that made it read like an insult, gave it to the press, and the French public demanded war, which came six days later. The text had not been enciphered at all. The point is how much weight a text on a wire could carry and how little there was to say it was the original.

The first two problems are the subject of the next three sections, and they produced two very different answers: a code book, which saves money and hides a little, and a cipher, which hides a lot and saves nothing. The third and fourth problems are older than the telegraph and are still with us. The fix for the third, a check built into the word, appears in the Python of §10.2. The fourth, knowing that a message is the one that was sent, is the problem of the message authentication codes and signatures in [book 1](../../book/10-Message-Authentication.md), and the telegraph is where it first hurt.

!!! note "Life story: the electric telegraph"
    **Born:** 1837, England (Cooke and Wheatstone's patent); 1844, United States (Morse's Washington to Baltimore line) · **Purpose:** to send written messages across distances faster than a rider, over wire, in a code of short and long signals · **Helped:** railways, newspapers, markets, armies, diplomats, and the demand for private codes and ciphers that this chapter is about · **Status:** replaced by telephone, telex and e-mail; Western Union sent its last telegram in 2006 and India's state telegraph service stopped in 2013

## 10.2 Codes by the price of a word

*Level: beginner.*

The telegraph clerk counted words, so the first answer to the cost problem was to put more into a word. The people who sent the most telegrams, shipping agents, cotton and grain dealers, bankers, mining companies, newspaper correspondents, wrote down the phrases they used again and again ("offer accepted", "ship by next steamer", "market firm, prices unchanged") and gave each a single short word. A telegram of twelve words shrank to one. The idea was old (chapter 1 told it as the difference between a code and a cipher, and chapter 3 met it in the torches of Polybius), but this was the first time that the price list rewarded it.

The first printed code book for the telegraph appeared in 1845, one year after Morse's first line. Its author, Francis Ormand Jonathan Smith of Portland, Maine, was a lawyer, a congressman, and Morse's partner: he owned a quarter share of Morse's patent, and he had chaired the House committee that voted the money for the Washington to Baltimore line. His book, *The Secret Corresponding Vocabulary; adapted for use to Morse's Electro-Magnetic Telegraph*, gave a long list of words and a meaning for each, so that a short message made of ordinary words could say something quite different from what it seemed to say. The title says what Smith was selling. Cheapness was the second selling point; the first, in 1845, was that the clerks could not understand it.

Hundreds of books followed over the next sixty years. The ABC Telegraphic Code (1873) went through many editions. Lieber's Standard Telegraphic Code (1896) and Bentley's Complete Phrase Code (1906) were among the most widely used; there were codes for cotton, for shipping, for mining, for banking and for many other trades. A firm bought the book of its trade and so did its rivals, so a code of this kind hid a telegram from a curious clerk and nothing else. The clerk who knew the book, or who simply learned that GLOXA always came before a price, read it as easily as plain English. Figure 10.3 shows what a page of such a book does.

<figure class="mars-fig">
<svg viewBox="0 0 640 228" width="640" role="img" aria-label="Four code words, each standing for a sentence, with the number of words saved" fill="currentColor" font-size="14">
<rect x="20" y="10" width="600" height="198" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<line x1="20" y1="44" x2="620" y2="44" stroke="currentColor" stroke-width="1"/>
<line x1="160" y1="10" x2="160" y2="198" stroke="currentColor" stroke-width="1"/>
<line x1="540" y1="10" x2="540" y2="198" stroke="currentColor" stroke-width="1"/>
<text x="36" y="33" font-weight="bold">Code word</text>
<text x="176" y="33" font-weight="bold">Means</text>
<text x="556" y="33" font-weight="bold">Words</text>
<text x="36" y="70" style="font-family:var(--md-code-font-family,monospace)">BAKLOMESXL</text>
<text x="176" y="70" font-size="13">Offer accepted. Ship by next steamer. Draw on us at ninety days.</text>
<text x="556" y="70" font-size="13">12 to 1</text>
<text x="36" y="108" style="font-family:var(--md-code-font-family,monospace)">GLOXAPENDP</text>
<text x="176" y="108" font-size="13">Market firm, prices unchanged.</text>
<text x="556" y="108" font-size="13">4 to 1</text>
<text x="36" y="146" style="font-family:var(--md-code-font-family,monospace)">TUVAMREDOU</text>
<text x="176" y="146" font-size="13">Cannot accept. Await our letter.</text>
<text x="556" y="146" font-size="13">5 to 1</text>
<text x="36" y="184" style="font-family:var(--md-code-font-family,monospace)">FIRZUQOLIG</text>
<text x="176" y="184" font-size="13">Cargo delayed by weather.</text>
<text x="556" y="184" font-size="13">4 to 1</text>
<text x="20" y="216" font-size="12" opacity="0.8">Invented examples in the style of the commercial books; the last letter of each word is a check letter.</text>
</svg>
<figcaption>Figure 10.3. One word for a sentence. A page from an invented commercial code in the style of the 1870s to 1900s books. The telegraph charged by the word, so a firm that sent the first sentence once a week saved eleven words a time.</figcaption>
</figure>

The rules about what counted as a word shaped the books. A clerk could not count "ShipByNextSteamerDrawAtNinetyDays" as one word without an argument, so the companies and, from 1865, the International Telegraph Union (founded at Paris that year by twenty European states) wrote rules. Over the following decades the rules came to allow an artificial "code word" of up to ten letters, pronounceable in one of a list of European languages, to count as a single word. That ten-letter limit explains the look of the later code books: rows of invented words like BAKLOMESXL, each made to be said aloud by a clerk who did not know the language, and each standing for a sentence. The same rules show the second use of code words in this period. Governments had not agreed that private ciphers should be sent at all. The 1865 convention left each state free to stop telegrams in "secret language" when it chose, and in wartime governments did. A code word that looked like a real word in a real language was less likely to be stopped than a block of random letters.

### Code on top of code

A firm that wanted real secrecy could not buy it from a book on sale in a shop, so it did one of two things. It had its own private code book printed, for the use of its own offices and agents. Or it took a public book and put a second step on top: a **superencipherment**, in which the code words or numbers from the book were themselves scrambled by a secret rule. The simplest rule is to add a secret number, digit by digit, to each code number. The recipient subtracts it. This combination of a code book plus a cipher on top became the standard system of armies and ministries for the next hundred years, and its weakness is the one that §10.8 shows in the Chinese telegraph code: if the secret number is reused, subtracting two messages cancels it.

### Errors and the check letter

A telegram that arrived with one wrong letter was a real problem for a firm that wrote "BAKLOMESXL" and meant a whole sentence: if the clerk garbled one letter, the word might turn into a different valid word, and a different sentence. The better books were built so that this could not happen. By the early 1900s many of them were designed so that no two code words differed in only one letter. Then a single garbled letter always produced a word that was not in the book, and the receiver knew to ask for a repeat. (Richard Hamming turned this idea into mathematics in 1950, as the distance of an error-correcting code; the telegraph books had the idea half a century earlier and no theory for it.) The program below does the same job with a check letter chosen so that all the letters of a word add up to a multiple of 26.

```python
# What a telegram cost, and one way to catch a garbled code word.
RATE = 1.00   # pounds per word on an early Atlantic cable (rounded)

plain = "OFFER ACCEPTED SHIP BY NEXT STEAMER DRAW ON US AT NINETY DAYS"
n_plain = len(plain.split())
print(n_plain, "words in plain, 1 word in code")
print("cost: pounds", n_plain * RATE, "against pounds", 1 * RATE)

# The last letter is chosen so that the letters (A=0 ... Z=25) add up to 0 mod 26.
def add_check(word):
    total = sum(ord(c) - 65 for c in word)
    return word + chr(65 + (-total) % 26)

def looks_valid(word):
    return sum(ord(c) - 65 for c in word) % 26 == 0

word = add_check("BAKLOMESX")
print(word, looks_valid(word))

# Garble each letter in turn, to every other letter: does the clerk always notice?
missed = 0
for i in range(len(word)):
    for new in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        if new != word[i] and looks_valid(word[:i] + new + word[i + 1:]):
            missed += 1
print("single-letter garbles that slip through:", missed)

# Two errors can hide: raise one letter by 1 and lower another by 1.
two = word[:3] + chr(ord(word[3]) + 1) + word[4:5] + chr(ord(word[5]) - 1) + word[6:]
print(two, looks_valid(two))
```

Output:

```
12 words in plain, 1 word in code
cost: pounds 12.0 against pounds 1.0
BAKLOMESXL True
single-letter garbles that slip through: 0
BAKMOLESXL True
```

Every one of the 9 × 25 single-letter garbles of the word is caught, but two errors that cancel pass the test. That is the usual trade: a cheap check catches the likely mistakes and misses the unlikely ones, and a stronger check costs more letters. The telegraph companies' own remedy was to repeat the whole message back, which cost twice as much.

!!! note "Life story: the commercial code book"
    **Born:** 1845, Portland, Maine (Francis O. J. Smith's *Secret Corresponding Vocabulary*); the ABC Code, 1873, and many others after · **Purpose:** to cut the cost of a telegram by putting a phrase in a word, and to hide a little from the clerks · **Helped:** the cable trade, shipping and commodity markets until about 1950, when telex and the telephone made short words less valuable; also the model of a code book plus a secret cipher on top · **Status:** obsolete; its descendants are the shorthand of any system that pays by the byte

## 10.3 Poe and the cryptogram craze

*Level: beginner.*

While the wires were going up, ciphers became a pastime. The man most responsible was a magazine writer who was short of money. In the winter of 1839 to 1840 Edgar Allan Poe, then working for a Philadelphia weekly, *Alexander's Weekly Messenger*, announced that he could solve any substitution cipher a reader sent in. He printed the challenge, readers wrote, and over the weeks he published his solutions. In 1841 he returned to the subject in *Graham's Magazine*, where he was an editor, in an article called "A Few Words on Secret Writing", and he wrote that "human ingenuity cannot concoct a cipher which human ingenuity cannot resolve." Poe said later that he had solved around a hundred of the ciphers readers sent. Two ciphers sent under the name "W. B. Tyler" were different. Poe printed them and, by his own account, could not solve them. They were real ciphers and not gibberish: the first, a substitution, turned out to hide lines from Joseph Addison's play *Cato* (1713) and was solved in 1992 by Terence Whalen, and the second, a polyalphabetic cipher, was not solved until 2000, by the software engineer Gil Broza. No W. B. Tyler turns up in the city directories, and since a 1985 essay by Louis Renza a number of scholars have suggested that Poe wrote the ciphers himself. The question is still argued.

In June 1843 the *Dollar Newspaper* of Philadelphia printed Poe's story "The Gold-Bug", which won its $100 prize and became the most widely read thing he published in his lifetime. A man named William Legrand finds a scrap of parchment with a cryptogram that leads to Captain Kidd's treasure, and the middle of the story is a lesson in codebreaking told in plain language to a mass audience. It is worth a look at the steps, because they are the steps of al-Kindi's method of [chapter 4](04-Baghdad-and-Cairo.md), found again. Legrand notes first that there are no word divisions, so he cannot start from short words. He counts the symbols and finds that the commonest, the figure 8, appears 33 times, and the next, the semicolon, 26. In English, he says, the commonest letter is e, and then (in Poe's order) *a o i d h n r s t u y c f g l m w b k p q x z*. So 8 is e. He then looks for the commonest word, *the*, and finds that the group ";48" occurs seven times in the cryptogram, which makes semicolon t, 4 h and confirms 8 as e. From there each new letter comes from a word that the known ones almost complete. The symbols were digits, a dagger, a double dagger, a pilcrow and punctuation. The solution, read out in the story, gave directions to the spot.

Poe was wrong about one thing, as he was bound to be: a cipher that cannot be resolved by human ingenuity does exist (see chapter 11, and [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md)) but it is not the sort of thing a magazine writer could make from a table of symbols. He was right about the sort of cipher that he saw in his mail. A simple substitution leaves the letter counts untouched, and so a patient reader can undo it. William Friedman, whose own career is told in [chapter 11](11-Radio-War-and-the-One-Time-Pad.md), published an essay on Poe as a cryptographer in 1936, and other codebreakers of the twentieth century have said that the story was where their interest began. The story brought ordinary readers into the subject at the moment the wires were making it matter.

!!! note "Life story: Poe's cryptogram challenge and \"The Gold-Bug\""
    **Born:** 1839 to 1841 (the challenge in *Alexander's Weekly Messenger* and *Graham's Magazine*); June 1843 (the story in the *Dollar Newspaper*) · **Purpose:** to sell magazines; the cryptograms were a game for readers, and the story a prize entry · **Helped:** made simple substitution and frequency counting familiar to a mass audience in the United States and Britain; later codebreakers, William Friedman among them, say they started there · **Status:** the story is still in print and still the first place many readers meet a cipher

### Break it: a cryptogram in Poe's style

Poe's cipher used symbols in place of letters. Here is one in the same style, made for this chapter. The message is in plain English, with no word breaks. The program builds it from a table of symbols, prints it, and counts the symbols. Break it as Legrand did: assume the commonest symbol is E, look for a three-symbol group that repeats and could be THE, and work outward from there. The plaintext is in the answer to question 4 of "Check yourself", so do not look until you have tried.

```python
# A substitution cipher in Poe's style: one symbol per letter, no word breaks.
table = dict(zip("ABCDEFGHIKLMNOPRSTUVWY",
                 "5†8%3;4‡)(61*9:?¶0+2=7"))
message = ("THE WIRE CARRIES THE NEWS BUT THE CLERK AT EACH END READS IT FIRST "
           "AND EVERY WORD COSTS MONEY SO THE MERCHANT WRITES HIS ORDER IN A "
           "SINGLE WORD AND HOPES THE CLERK WILL NOT UNDERSTAND IT")
plain = message.replace(" ", "")
secret = "".join(table[c] for c in plain)
print(secret)
print()

counts = {}
for ch in secret:
    counts[ch] = counts.get(ch, 0) + 1
ranked = sorted(counts.items(), key=lambda kv: -kv[1])
print(len(plain), "symbols; the commonest five:")
for ch, n in ranked[:5]:
    print(" ", ch, n)
```

The commonest symbol stands out, as E should. After it, two symbols tie for second place, and a counter cannot say which is T. That is the real problem Legrand has, and the reason al-Kindi's method has a second half: counts first, then the language. Look for a group of three symbols that repeats, test whether it could be THE, and let the words it makes tell you which guesses to keep.

### In the real world

The sources for Poe's challenge are his own articles, so what is known about how many ciphers he solved comes from Poe. The cryptograms he printed were simple substitutions, many of them with word divisions left in, and a determined solver could crack them in an evening. His claim that no cipher could resist ingenuity was a boast and a salesman's line, and it was wrong in principle. The Tyler ciphers need care, because the story is often told with more certainty than the sources give. What is certain is that the two ciphers were printed in 1841, that the first was not solved until 1992 and the second until 2000, and that both turned out to be real, if flawed, ciphers: the second, solved by Broza, had more than two dozen typesetting mistakes in it. That "Tyler" was Poe is a theory. It rests on the absence of any Tyler from the city records and on the style of the accompanying notes, and it has not been proved.


## 10.4 Babbage and the dentist's challenge

*Level: beginner.*

By the 1850s the keyword cipher had been in print for three centuries. [Chapter 7](07-Printed-Ciphers.md) tells how it got there, through Bellaso's keyword of 1553 and Vigenère's book of 1586, and why it came to be called *le chiffre indéchiffrable*, the cipher that cannot be deciphered. Here it meets the two men who ended that.

The first was Charles Babbage (1791 to 1871), and he is better known for something else. He held the Lucasian chair of mathematics at Cambridge from 1828 to 1839, designed the Difference Engine in the 1820s and the Analytical Engine in the 1830s, and finished neither. He was also a man who could not leave a puzzle alone. In his memoir *Passages from the Life of a Philosopher* (1864) he wrote a short chapter "Of Deciphering", in which he said that deciphering was in his opinion one of the most fascinating of arts, and that he feared he had wasted more time on it than it deserved. He had solved ciphers for pleasure since boyhood. He was neither shy nor quiet: he wrote a book in 1830 on the decline of science in England, he fought a public campaign against street musicians, and he published his quarrels. That is part of what makes the next part of the story odd.

In 1854 a man named John Hall Brock Thwaites, described in most accounts as a dentist from Bristol, sent the *Journal of the Society of Arts* a cipher that he presented as new. Babbage wrote to say that it was an old keyword cipher in a new coat. Thwaites, stung, challenged him to break a message. By the retellings, which come from Babbage's papers and the accounts of later historians and not from the *Journal*, Babbage did, and found that the passage came from Shakespeare's *The Tempest* and that the two keys Thwaites had used were "two" and "combined". Another tale, told often and sourced only to the secondary books, has him reading a stanza of Tennyson's "The Vision of Sin" enciphered with the keyword EMILY. Some accounts date the Thwaites affair to 1853. The details of both stories differ from one retelling to the next, and the tidy version of either should be held loosely.

What is not in doubt is that Babbage solved the cipher and that he worked out a general method, because the method is in his notebooks. Those papers, now divided between the British Library and the Science Museum, were looked at by cryptologic historians in the 1980s, among them Ole Franksen, whose 1985 book *Mr. Babbage's Secret* told the tale of the cipher and of the computing language APL. What the papers show is the idea that a repeated group of letters in the ciphertext points to the length of the key. That is the idea Kasiski published nine years later.

Babbage never published it. Why? There are three explanations, and they are guesses. Franksen suggested that British intelligence asked him to keep quiet during the Crimean War (1853 to 1856), and Kahn, in *The Codebreakers*, treated that as a possibility and no more; no document has turned up that shows such a request. The second guess is Babbage's temperament. He left many things unfinished, and a method that he had found for his own amusement may never have seemed to him to need a paper. The third is that nobody knew its value. An army or foreign ministry using a keyword cipher would have wanted to know, but Babbage was a man of science who had little reason to talk to them.

The fact remains that the method that killed the keyword cipher was found in England in 1854 and printed in Prussia in 1863, and that Babbage's silence cost him the credit. In most books the method is named after Kasiski.

!!! note "Life story: Charles Babbage"
    **Born:** 26 December 1791, London; died 18 October 1871, London · **Purpose:** to build engines that would compute mathematical tables without error; deciphering was a lifelong hobby · **Helped:** designed the Difference Engine and the Analytical Engine, the plan of a general computer; in 1854 solved the keyword cipher and left the method in his notes · **Status:** the computer designs were never completed in his life (a Difference Engine was built from his drawings and finished in 1991 at the Science Museum, London); the cipher notes were unpublished until the twentieth century

## 10.5 Kasiski and the fall of the keyword

*Level: intermediate.*

The second man was Friedrich Wilhelm Kasiski, born in 1805 at Schlochau in West Prussia (today Człuchów, in Poland) and died in 1881. He joined the Prussian infantry as a young man and retired in 1852 with the rank of major. He then wrote a book of 95 pages, *Die Geheimschriften und die Dechiffrir-Kunst* ("Secret writing and the art of deciphering"), which was printed in Berlin in 1863. It sets out how to solve a cipher that uses a repeating keyword, whatever the keyword is, and it does it without the luck of a probable word or the genius of a Babbage. It describes a method that any patient officer could carry out with pencil and paper.

The usual account says that the book was ignored. Kasiski went back to a different interest, archaeology, and the book was noticed slowly over the next decades. That account fits what is known: no army that adopted the method did so with a ceremony, and the book's later importance is plain from how the method spread through the textbooks of the following decades, not from any first reaction. Nothing suggests that Kasiski knew of Babbage's work.

### The idea

Take a short key, KEY, and a short message with a repeated word in it: THE BIG THE END, run together as THEBIGTHEEND. The key repeats under it as KEYKEYKEYKEY, and the ciphertext is DLCLMEDLCORB. Look at it: the group DLC turns up twice, six letters apart. The first THE sat under KEY and so did the second, because six is a multiple of 3, the length of the key. The same plaintext under the same part of the key gives the same ciphertext. Reverse that. When a group of three or more letters repeats in the ciphertext, then probably it is a repeated word in the plaintext that fell under the same part of the key both times, and so the distance between the two copies is a multiple of the key length. A real message has dozens of such repeats. Write down all the distances and look for the number that divides most of them. Figure 10.4 shows a strip with three repeats, 18 and 6 letters apart.

<figure class="mars-fig">
<svg viewBox="0 0 640 232" width="640" role="img" aria-label="A strip of 30 cipher letters with the same three-letter group at three places, 18 and 6 letters apart, and marks every 6 letters showing the key length" fill="currentColor" font-size="14">
<rect x="20" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="30.0" y="58" font-size="13" text-anchor="middle">M</text>
<rect x="40" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="50.0" y="58" font-size="13" text-anchor="middle">U</text>
<rect x="60" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="70.0" y="58" font-size="13" text-anchor="middle">Q</text>
<rect x="80" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="90.0" y="58" font-size="13" text-anchor="middle">Z</text>
<rect x="100" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="110.0" y="58" font-size="13" text-anchor="middle">K</text>
<rect x="120" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="130.0" y="58" font-size="13" text-anchor="middle">B</text>
<rect x="140" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="150.0" y="58" font-size="13" text-anchor="middle">W</text>
<rect x="160" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="170.0" y="58" font-size="13" text-anchor="middle">L</text>
<rect x="180" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="190.0" y="58" font-size="13" text-anchor="middle">H</text>
<rect x="200" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="210.0" y="58" font-size="13" text-anchor="middle">A</text>
<rect x="220" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="230.0" y="58" font-size="13" text-anchor="middle">S</text>
<rect x="240" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="250.0" y="58" font-size="13" text-anchor="middle">D</text>
<rect x="260" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="270.0" y="58" font-size="13" text-anchor="middle">R</text>
<rect x="280" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="290.0" y="58" font-size="13" text-anchor="middle">P</text>
<rect x="300" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="310.0" y="58" font-size="13" text-anchor="middle">Y</text>
<rect x="320" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="330.0" y="58" font-size="13" text-anchor="middle">N</text>
<rect x="340" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="350.0" y="58" font-size="13" text-anchor="middle">C</text>
<rect x="360" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="370.0" y="58" font-size="13" text-anchor="middle">E</text>
<rect x="380" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="390.0" y="58" font-size="13" text-anchor="middle">X</text>
<rect x="400" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="410.0" y="58" font-size="13" text-anchor="middle">I</text>
<rect x="420" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="430.0" y="58" font-size="13" text-anchor="middle">Q</text>
<rect x="440" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="450.0" y="58" font-size="13" text-anchor="middle">Z</text>
<rect x="460" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="470.0" y="58" font-size="13" text-anchor="middle">K</text>
<rect x="480" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="490.0" y="58" font-size="13" text-anchor="middle">K</text>
<rect x="500" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="510.0" y="58" font-size="13" text-anchor="middle">Z</text>
<rect x="520" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="530.0" y="58" font-size="13" text-anchor="middle">Q</text>
<rect x="540" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="550.0" y="58" font-size="13" text-anchor="middle">Q</text>
<rect x="560" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="570.0" y="58" font-size="13" text-anchor="middle">Z</text>
<rect x="580" y="40" width="20" height="26" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1"/>
<text x="590.0" y="58" font-size="13" text-anchor="middle">K</text>
<rect x="600" y="40" width="20" height="26" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="610.0" y="58" font-size="13" text-anchor="middle">O</text>
<line x1="60" y1="30" x2="60" y2="76" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"/>
<line x1="180" y1="30" x2="180" y2="76" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"/>
<line x1="300" y1="30" x2="300" y2="76" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"/>
<line x1="420" y1="30" x2="420" y2="76" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"/>
<line x1="540" y1="30" x2="540" y2="76" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 3"/>
<path d="M90 76 Q270.0 136 450 76" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="270.0" y="126" text-anchor="middle" font-size="13">18 letters apart</text>
<path d="M456 76 Q513.0 116 576 76" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="516.0" y="116" text-anchor="middle" font-size="13">6</text>
<text x="20" y="170" font-size="13">The group QZK turns up three times. 18 and 6 are both multiples of 6, so the keyword is</text>
<text x="20" y="190" font-size="13">probably 6 letters long (dashed lines every 6). Every sixth letter was shifted by the same key letter,</text>
<text x="20" y="210" font-size="13">so each of the 6 columns is a plain Caesar shift that counting letters will solve.</text>
</svg>
<figcaption>Figure 10.4. Kasiski's test on a made-up strip of ciphertext. The repeated group QZK is a repeated piece of plaintext that happened to fall under the same part of the key each time.</figcaption>
</figure>

When the key length is known, the second step is routine. If the key has five letters, the 1st, 6th, 11th and every fifth letter after were all shifted by the first key letter. They make a Caesar cipher, and counting the letters in them solves it. Do the same for the other four columns, and the key falls out. The method needs no luck, only a message long enough to have repeats and long enough that each column has some letters in it. For a 5-letter key, a few hundred letters will do. For a 20-letter key you need a few thousand, and a longer key is the only defense, which is why the keyword cipher survived as a pretty idea and not as a safe one. [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) teaches the method and the statistical test that Friedman found in 1920 to do without the repeats; this chapter keeps to the people and the program.

### Code it

The program below makes a message with the key EMILY (the Tennyson story's key) and with the 8-letter key THOMPSON, finds the repeated three-letter groups, takes the factor shared by most of the distances, and solves each column. It does not know either key.

```python
from collections import Counter

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
# How often each letter appears in English, per 1,000 letters
EN = [82, 15, 28, 43, 127, 22, 20, 61, 70, 2, 8, 40, 24,
      67, 75, 19, 1, 60, 63, 91, 28, 10, 24, 2, 20, 1]

def vigenere(text, key, sign=1):
    return "".join(A[(A.index(c) + sign * A.index(key[i % len(key)])) % 26]
                   for i, c in enumerate(text))

def solve(secret):
    # Step 1 (Kasiski): find repeated three-letter groups and how far apart they are
    spots = {}
    for i in range(len(secret) - 2):
        spots.setdefault(secret[i:i + 3], []).append(i)
    gaps = [b - a for p in spots.values() for a, b in zip(p, p[1:])]
    counts = Counter(f for g in gaps for f in range(2, 13) if g % f == 0)
    top = max(counts.values())
    # a key of length 10 also makes every gap a multiple of 2 and 5,
    # so take the largest factor that is nearly as common as the best one
    n = max(f for f in counts if counts[f] >= 0.9 * top)
    # Step 2: each n-th letter was shifted by the same key letter, so it is a
    # Caesar cipher. Pick the shift whose letter counts look most like English.
    key = ""
    for col in range(n):
        column = secret[col::n]
        c = Counter(column)
        score = lambda s: sum(c[A[(i + s) % 26]] * EN[i] for i in range(26))
        key += A[max(range(26), key=score)]
    return len(gaps), counts.most_common(4), key

plain = ("THE TELEGRAPH CARRIED THE NEWS OF THE WAR FASTER THAN ANY RIDER "
         "COULD AND THE GENERALS SOON LEARNED THAT THE ENEMY COULD READ "
         "THE WIRES AS EASILY AS THEIR OWN CLERKS SO THEY TURNED TO THE "
         "CIPHER THAT EVERY BOOK CALLED UNBREAKABLE AND THE ENEMY SOON "
         "LEARNED TO BREAK THE CIPHER BY LOOKING FOR THE PLACES WHERE THE "
         "SAME WORDS FELL UNDER THE SAME LETTERS OF THE KEY").replace(" ", "")

for keyword in ("EMILY", "THOMPSON"):
    secret = vigenere(plain, keyword)
    print(keyword, secret[:40])
    ngaps, top, key = solve(secret)
    print(" ", ngaps, "gaps; most shared factors:", top)
    print("  key found:", key, "->", vigenere(secret, key, -1)[:30])
```

Output:

```
EMILY XTMECPQOCYTTKLPVUMORLQVPUWANEFIIICDEEBPP
  27 gaps; most shared factors: [(5, 26), (7, 11), (3, 9), (2, 6)]
  key found: EMILY -> THETELEGRAPHCARRIEDTHENEWSOFTH
THOMPSON MOSFTDSTKHDTRSFEBLRFWWBRPZCRIZSJTYTMHLSE
  23 gaps; most shared factors: [(2, 23), (4, 23), (8, 22), (3, 2)]
  key found: THOMPSON -> THETELEGRAPHCARRIEDTHENEWSOFTH
```

Of the 27 gaps for EMILY, 26 are multiples of 5; the odd one out is a chance repeat. The 8-letter key shows the trap in the method: factors 2, 4 and 8 all divide nearly every gap, because anything divisible by 8 is divisible by 2 and 4. The right answer is the largest factor that is almost as common as the best, which is why the program takes the largest within 10 percent. Kasiski's book, and Babbage's notes, were written for readers who could think of that for themselves.

### What the fall meant

Armies moved on. Where the keyword cipher had been the standard answer to "what is stronger than a simple substitution?", the answer after the 1860s was a book of codes, a transposition, a pair cipher like Playfair's, or all three. The Confederate States had used the keyword cipher through the war without Kasiski's help to their enemies, as §10.7 tells, and by the 1880s no serious ministry trusted a short repeating key. The idea itself did not die. A key that does not repeat cannot be found by looking for repeats, and that thought runs through the story to the rotor machines of [chapter 12](12-Rotors-and-Enigma.md) and the one-time pad of [chapter 11](11-Radio-War-and-the-One-Time-Pad.md): each is an answer to Kasiski.

!!! note "Life story: Kasiski's examination"
    **Born:** 1854 in Babbage's unpublished notes; 1863, Berlin, in Friedrich Kasiski's *Die Geheimschriften und die Dechiffrir-Kunst* · **Purpose:** to find the length of a repeating key from the distances between repeated groups in the ciphertext · **Helped:** ended the keyword cipher's reputation for being unbreakable; every army and foreign ministry that had trusted it had to move to codes, machines or longer keys · **Status:** still the first test on a polyalphabetic ciphertext, and the first lesson in Cryptanalysis

### In the real world

What do the sources say? For Babbage: the notebooks exist, they show the repeated-groups idea, and secondary accounts built from them tell the Thwaites and Tennyson stories with differences of detail. They do not say why he kept the method to himself, and the Crimean War story is a conjecture, put forward in 1985 and not documented. For Kasiski: the book is printed and has been read for a century and a half, and its contents are not in dispute. How it was received is told in broad terms and from later writers, and who read it in 1863 is unknown. What neither man knew is how the other's work would be remembered: the name on the method is Kasiski's because he printed it.

## 10.6 Wheatstone, Playfair and the pair cipher

*Level: beginner.*

Charles Wheatstone (1802 to 1875) is the same Wheatstone as the telegraph's. He was a London instrument maker's son, a professor of experimental philosophy at King's College London, the inventor of the concertina and the stereoscope, and, with Cooke, the patentee of the British telegraph. He took an interest in codes and ciphers, which is natural in a man whose invention was carrying other people's secrets along the wires of the country. In 1854 he put forward a cipher that is the best-known pair cipher in history.

It does not carry his name. His friend Lyon Playfair (1818 to 1898), a chemist and Liberal member of Parliament who held a number of public offices and was Postmaster General for a few months in 1873 and 1874, took up the cipher and pressed it on the government, and the name stuck to him. According to Playfair's biographer, Wemyss Reid, writing in 1899, the Foreign Office complained that it was too complicated for diplomats. Wheatstone offered to teach it to boys from a nearby school in a quarter of an hour, and an official replied that this was likely enough, but that no one could teach it to attachés. The story is known through later retellings of Reid's book, so it is told here as an anecdote and not as a record.

### How it works

The cipher uses a $5 \times 5$ square of letters, with J and I sharing a cell. The key is a word written into the square first, with the rest of the alphabet following, so there are 25 cells and 25 letters. The message is cut into pairs, with an X put between doubled letters (so BALLOON becomes BA LX LO ON). Each pair is then replaced by another pair by one of three rules. If the two letters lie in the same row, each is replaced by the letter to its right. If they lie in the same column, each is replaced by the letter below. Otherwise they sit at opposite corners of a rectangle, and each is replaced by the letter at the corner in its own row: ME becomes PH in Figure 10.5.

<figure class="mars-fig">
<svg viewBox="0 0 640 264" width="640" role="img" aria-label="A five-by-five Playfair square for the keyword WHEATSTONE with the pair ME marked as a rectangle whose other corners are P and H" fill="currentColor" font-size="14">
<rect x="40" y="24" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="62.0" y="52" font-size="18" text-anchor="middle">W</text>
<rect x="84" y="24" width="44" height="44" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1"/>
<text x="106.0" y="52" font-size="18" text-anchor="middle">H</text>
<rect x="128" y="24" width="44" height="44" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1"/>
<text x="150.0" y="52" font-size="18" text-anchor="middle">E</text>
<rect x="172" y="24" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="194.0" y="52" font-size="18" text-anchor="middle">A</text>
<rect x="216" y="24" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="238.0" y="52" font-size="18" text-anchor="middle">T</text>
<rect x="40" y="68" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="62.0" y="96" font-size="18" text-anchor="middle">S</text>
<rect x="84" y="68" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="106.0" y="96" font-size="18" text-anchor="middle">O</text>
<rect x="128" y="68" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="150.0" y="96" font-size="18" text-anchor="middle">N</text>
<rect x="172" y="68" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="194.0" y="96" font-size="18" text-anchor="middle">B</text>
<rect x="216" y="68" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="238.0" y="96" font-size="18" text-anchor="middle">C</text>
<rect x="40" y="112" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="62.0" y="140" font-size="18" text-anchor="middle">D</text>
<rect x="84" y="112" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="106.0" y="140" font-size="18" text-anchor="middle">F</text>
<rect x="128" y="112" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="150.0" y="140" font-size="18" text-anchor="middle">G</text>
<rect x="172" y="112" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="194.0" y="140" font-size="18" text-anchor="middle">I</text>
<rect x="216" y="112" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="238.0" y="140" font-size="18" text-anchor="middle">K</text>
<rect x="40" y="156" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="62.0" y="184" font-size="18" text-anchor="middle">L</text>
<rect x="84" y="156" width="44" height="44" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="1"/>
<text x="106.0" y="184" font-size="18" text-anchor="middle">M</text>
<rect x="128" y="156" width="44" height="44" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="1"/>
<text x="150.0" y="184" font-size="18" text-anchor="middle">P</text>
<rect x="172" y="156" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="194.0" y="184" font-size="18" text-anchor="middle">Q</text>
<rect x="216" y="156" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="238.0" y="184" font-size="18" text-anchor="middle">R</text>
<rect x="40" y="200" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="62.0" y="228" font-size="18" text-anchor="middle">U</text>
<rect x="84" y="200" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="106.0" y="228" font-size="18" text-anchor="middle">V</text>
<rect x="128" y="200" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="150.0" y="228" font-size="18" text-anchor="middle">X</text>
<rect x="172" y="200" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="194.0" y="228" font-size="18" text-anchor="middle">Y</text>
<rect x="216" y="200" width="44" height="44" fill="currentColor" fill-opacity="0" stroke="currentColor" stroke-width="1"/>
<text x="238.0" y="228" font-size="18" text-anchor="middle">Z</text>
<text x="290" y="36" font-size="13">Keyword WHEATSTONE, then the rest of</text>
<text x="290" y="58" font-size="13">the alphabet (I and J share a cell).</text>
<text x="290" y="102" font-size="13">The pair ME makes a rectangle: M is at</text>
<text x="290" y="124" font-size="13">row 4, column 2, E at row 1, column 3.</text>
<text x="290" y="146" font-size="13">Each letter takes the corner in its own</text>
<text x="290" y="168" font-size="13">row: M becomes P, E becomes H.</text>
<text x="290" y="190" font-weight="bold" font-size="16">ME  becomes  PH</text>
<text x="290" y="234" font-size="13">Same row: take the letter to the right.</text>
<text x="290" y="256" font-size="13">Same column: take the letter below.</text>
</svg>
<figcaption>Figure 10.5. A Playfair square. The darker cells are the answer, the lighter ones the pair being enciphered.</figcaption>
</figure>

The point of working on pairs is that single-letter counts disappear. Instead of 26 letters to count there are about 600 pairs, and the commonest pair in English, TH, is only about 3 percent of the pairs, so counting is much slower. The cost of that is a weakness: the same pair always becomes the same pair, so with enough text the pair frequencies still show through, and TH becomes the commonest ciphertext pair, mapped to the same two letters every time. The program below uses the keyword WHEATSTONE, and the same message gives the same output in the old demonstration of this site. Note that the pair ME becomes PH both times it occurs.

```python
def square(keyword):
    seen = ""
    for ch in keyword + "ABCDEFGHIKLMNOPQRSTUVWXYZ":   # no J: it shares I's cell
        if ch not in seen:
            seen += ch
    return [seen[i:i + 5] for i in range(0, 25, 5)]

def pairs_of(text):
    text = text.replace("J", "I")
    pairs, i = [], 0
    while i < len(text):
        a = text[i]
        b = text[i + 1] if i + 1 < len(text) else "X"
        if a == b:                        # a doubled letter gets an X between
            b, i = "X", i + 1
        else:
            i += 2
        pairs.append(a + b)
    return pairs

def move(pairs, keyword, step):
    rows = square(keyword)
    where = {ch: (r, c) for r, row in enumerate(rows) for c, ch in enumerate(row)}
    out = []
    for a, b in pairs:
        (ra, ca), (rb, cb) = where[a], where[b]
        if ra == rb:                      # same row: right to encrypt, left to decrypt
            out.append(rows[ra][(ca + step) % 5] + rows[rb][(cb + step) % 5])
        elif ca == cb:                    # same column: below to encrypt, above to decrypt
            out.append(rows[(ra + step) % 5][ca] + rows[(rb + step) % 5][cb])
        else:                             # rectangle: swap the columns, both ways
            out.append(rows[ra][cb] + rows[rb][ca])
    return out

for row in square("WHEATSTONE"):
    print(" ".join(row))
pairs = pairs_of("MEETMEATTHEBRIDGEATNOON")
print(" ".join(pairs))
secret = move(pairs, "WHEATSTONE", 1)
print(" ".join(secret))
print(" ".join(move(secret, "WHEATSTONE", -1)))
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
ME ET ME AT TH EB RI DG EA TN OX ON
```

!!! tip "Try it"
    Here is a message sent with the keyword TELEGRAPH. The square is `T E L G R / A P H B C / D F I K M / N O Q S U / V W X Y Z`. Decrypt it by hand with the three rules, going left instead of right and up instead of down (the rectangle rule is the same both ways). The ciphertext is `LA RP GL GM TL DN OG WT GZ EW TM`. The answer is in question 6 of "Check yourself".

### Where it was used

The British Army used Playfair as a field cipher in the Boer War (1899 to 1902) and again in the First World War, where its virtue was speed and its weakness did not much matter: a message about where to meet at noon was stale by evening. That was a sound use of a weak cipher, and the sort of use [chapter 3](03-Greece-and-Rome.md) found in the Roman camp. It was never a diplomat's cipher. Its attraction was that a keyword is easy to remember (Kerckhoffs's third rule, §10.11) and that the work is short.

!!! note "Life story: the Playfair cipher"
    **Born:** 1854, London (Charles Wheatstone's invention, pressed on the government by Lyon Playfair) · **Purpose:** a hand cipher for the telegraph age that hides single-letter counts by working on pairs · **Helped:** British field ciphers from the Boer War into the First World War; the idea of working on blocks of letters returns in the Hill cipher of 1929 and, much later, in block ciphers · **Status:** broken by hand with enough text and by computer in seconds; still a classroom and puzzle cipher

## 10.7 The first telegraph war

*Level: intermediate.*

The American Civil War (1861 to 1865) was the first war to run through the telegraph. The British and French had used the wire in the Crimea a few years before, but in the United States both sides built thousands of miles of military line behind their armies, and the transcontinental telegraph, finished in October 1861, tied California to Washington. The wires carried orders, reports and every politician's worry. They could also be tapped. By the usual account George Ellsworth, a Confederate telegrapher known as "Lightning", rode with John Hunt Morgan's raiders in 1862, cut into Union wires, read what he heard, and sent false orders in the Union's own name to confuse its commanders. Whatever the details, both sides believed it could be done. That is why both used ciphers.

### The Union's route ciphers

The Union's Military Telegraph was run by former commercial telegraphers, and the cipher that served it was designed by one of them, Anson Stager, a Western Union executive who headed the Military Telegraph in the West and later more widely. It was a **route transposition on words**. The clerk wrote the message in rows of a fixed width, say four words to a row. He then copied it out by columns, in a route that the two ends had agreed: this column downward, that column upward, and so on. Words that could not be sent in the open, the names of people and places, were replaced by arbitrary code words, and a few meaningless words were put at the beginning and the end. The route was the key, and it was changed from time to time.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="A twelve-word message written in four columns and read off by column in the order 3 down, 1 up, 4 down, 2 up" fill="currentColor" font-size="14">
<rect x="30" y="50" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="86.0" y="77" font-size="13" text-anchor="middle">SEND</text>
<rect x="142" y="50" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="198.0" y="77" font-size="13" text-anchor="middle">TWO</text>
<rect x="254" y="50" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="310.0" y="77" font-size="13" text-anchor="middle">REGIMENTS</text>
<rect x="366" y="50" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="422.0" y="77" font-size="13" text-anchor="middle">BY</text>
<rect x="30" y="94" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="86.0" y="121" font-size="13" text-anchor="middle">RAIL</text>
<rect x="142" y="94" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="198.0" y="121" font-size="13" text-anchor="middle">TONIGHT</text>
<rect x="254" y="94" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="310.0" y="121" font-size="13" text-anchor="middle">TO</text>
<rect x="366" y="94" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="422.0" y="121" font-size="13" text-anchor="middle">THE</text>
<rect x="30" y="138" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="86.0" y="165" font-size="13" text-anchor="middle">BRIDGE</text>
<rect x="142" y="138" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="198.0" y="165" font-size="13" text-anchor="middle">AT</text>
<rect x="254" y="138" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="310.0" y="165" font-size="13" text-anchor="middle">RIVERTON</text>
<rect x="366" y="138" width="112" height="44" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="422.0" y="165" font-size="13" text-anchor="middle">NOW</text>
<text x="310.0" y="36" font-size="14" text-anchor="middle" font-weight="bold">1 ↓</text>
<text x="86.0" y="204" font-size="14" text-anchor="middle" font-weight="bold">2 ↑</text>
<text x="422.0" y="36" font-size="14" text-anchor="middle" font-weight="bold">3 ↓</text>
<text x="198.0" y="204" font-size="14" text-anchor="middle" font-weight="bold">4 ↑</text>
<text x="30" y="236" font-size="13">Wire order: REGIMENTS TO RIVERTON | BRIDGE RAIL SEND | BY THE NOW | AT TONIGHT TWO,</text>
<text x="30" y="256" font-size="13">with a few meaningless words added at each end. The key is the column order and directions.</text>
</svg>
<figcaption>Figure 10.6. A route transposition in the style of the Union telegraph ciphers (an invented message). The words are only moved, never changed, so the cipher hides the order and leaves the words.</figcaption>
</figure>

The cipher moves the words and never changes them, so a reader who sees a telegram sees the words that the message contains, in the wrong order. That is a real weakness, as the program below shows. It tries all 384 ways of reading four columns in some order and some direction (24 orders times 16 sets of directions) and keeps the one that makes a likely phrase. The Union's answer to this weakness was the names: with the names replaced and the nulls in, there was nothing for a clerk to read the message by. And the Confederates, by the accounts, never broke it.

```python
# A route transposition in the style of the Union telegraph ciphers.
def grid_of(words, ncols):
    return [words[i:i + ncols] for i in range(0, len(words), ncols)]

def encrypt(words, ncols, route):
    rows = grid_of(words, ncols)
    out = []
    for col, direction in route:
        column = [row[col] for row in rows]
        out += column if direction == "down" else column[::-1]
    return out

def decrypt(wire, ncols, route):
    nrows = len(wire) // ncols
    rows = [[None] * ncols for _ in range(nrows)]
    k = 0
    for col, direction in route:
        order = range(nrows) if direction == "down" else range(nrows - 1, -1, -1)
        for r in order:
            rows[r][col] = wire[k]
            k += 1
    return [w for row in rows for w in row]

message = "SEND TWO REGIMENTS BY RAIL TONIGHT TO THE BRIDGE AT RIVERTON NOW".split()
route = [(2, "down"), (0, "up"), (3, "down"), (1, "up")]   # the key: 3 down, 1 up, 4 down, 2 up
wire = encrypt(message, 4, route)
print(" ".join(wire))
print(" ".join(["ARTHUR"] + wire + ["TEN"]))     # nulls at each end hide where the text starts
print(" ".join(decrypt(wire, 4, route)))

# The weakness: the words are all still there. Try every key and keep the ones
# where a likely phrase comes out whole.
from itertools import permutations, product
found = 0
for order in permutations(range(4)):
    for dirs in product(("down", "up"), repeat=4):
        guess = decrypt(wire, 4, list(zip(order, dirs)))
        text = " ".join(guess)
        if "SEND TWO REGIMENTS BY RAIL" in text:
            found += 1
print("keys tried:", 24 * 16, " keys that read like a telegram:", found)
```

Output:

```
REGIMENTS TO RIVERTON BRIDGE RAIL SEND BY THE NOW AT TONIGHT TWO
ARTHUR REGIMENTS TO RIVERTON BRIDGE RAIL SEND BY THE NOW AT TONIGHT TWO TEN
SEND TWO REGIMENTS BY RAIL TONIGHT TO THE BRIDGE AT RIVERTON NOW
keys tried: 384  keys that read like a telegram: 1
```

(The message is invented. The real Union tables used more columns and rows and many more routes, which is what made trying them all slow by hand.)

### The Confederate keyword

The Confederacy used the keyword cipher. Its high-level messages went in a Vigenère cipher, worked with a brass disk or a printed square, and the keys on record are three short phrases: MANCHESTER BLUFF, COMPLETE VICTORY, and, at the very end, COME RETRIBUTION. That is the mistake the telegraph age taught. A key that is a phrase from a patriotic phrase book, used for months, with word breaks sometimes left in, falls to anyone who has the patience. Kasiski's book, printed in Berlin in the middle of the war, did not matter: a few keys used for years and words left unenciphered were enough.

Three young telegraphers in the War Department's telegraph office in Washington solved the intercepts and captured messages: David Homer Bates, Charles Tinker and Albert Chandler. Bates described them in *Lincoln in the Telegraph Office* (1907), a book that also describes how Lincoln spent hours in that office waiting for news from the front, and, by Bates's account, wrote the first draft of the Emancipation Proclamation there in the summer of 1862. The solution of the Confederate cipher was routine work done by clerks in an office the President walked into, and nothing like the codebreaking bureaus of the next century.

!!! note "Life story: the Civil War telegraph ciphers"
    **Born:** 1861, with the first military telegraph lines of the Union and the Confederacy · **Purpose:** to keep orders and reports from enemy wire-tappers and from the clerks along the line · **Helped:** the Union's word-transposition cipher was not solved by the Confederacy; the Confederate keyword cipher was read regularly by Bates, Tinker and Chandler · **Status:** ended in 1865; its lessons (never reuse a key, never leave word breaks, never trust a phrase from a book) were taught again in every later war

### The cipher telegrams of 1876

The telegraph's weakness as a keeper of secrets came out in public after the war. In the disputed presidential election of 1876, between Samuel Tilden and Rutherford Hayes, agents of the Democratic side sent cipher telegrams to Tilden's nephew, William Pelton, at Tilden's house in New York. They concerned the electoral votes of South Carolina, Florida, Louisiana and Oregon. A congressional committee obtained copies from the Western Union offices. In October 1878 the *New York Tribune* printed a series of the telegrams with their solutions, produced by a small team of its own staff (Kahn names William M. Grosvenor among them), and the solved messages were read as evidence that the Democratic side had considered buying electoral votes. The ciphers were word ciphers of the sort the Union had used, with code words for names, and they fell to people with time, a stack of messages and some knowledge of the people involved. The episode shows what a telegraph company's files were: a record of every message, which any legislature could demand.


## 10.8 China and Japan: a number for every character

*Level: intermediate.*

Morse's code was built for an alphabet. A telegraph clerk in London or New York had 26 letters, ten digits and a handful of marks. A clerk in Shanghai or Nagasaki had a language written with thousands of characters (in Japan, a mix of Chinese characters and two syllabaries). The telegraph reached East Asia in the early 1870s, carried by a European company, and it had to be made to work for scripts it was not designed for. How that was done decided who could read what was sent.

### China, 1871 to 1872

The Great Northern Telegraph Company, a Danish firm founded in 1869 under Carl Frederik Tietgen, opened a cable between Shanghai and Hong Kong in 1871, and cables to Nagasaki and Vladivostok the same year. To send Chinese over it, the company needed a way to turn characters into something a clerk who did not read Chinese could tap out. The Danish astronomer Hans Schjellerup drew up a first list, and in 1872 a Frenchman in the Chinese customs service, Septime Auguste Viguier, published the book that replaced it, *Dianbao xinshu* (電報新書, "A new book for the telegraph"). It took a selection of common characters and gave each a four-digit number, from 0001 to 9999. The sender looked up each character and wrote the digits. The clerk sent the digits in Morse. At the other end another clerk looked the digits up again. Zheng Guanying, a Chinese reformer connected with the telegraph administration, brought out an expanded and reordered edition in 1881. The code's descendants are still used: police in many places record Chinese names by the numbers.

This is the same arrangement as the commercial code books of §10.2, with one difference that mattered. A European firm chose a code book and paid for the privilege. For a Chinese sender, the code book was the alphabet. There was no way to send anything without it, so every clerk had one, and every clerk could read every message. The historian Thomas Mullaney, who has written the fullest account of the system, makes the point that the numbers were never a secret code. They were a way of writing.

Numbers do make secrecy easy to add. The NSA's short history of the code gives the character for rice, 米, as 4149. Add a secret key number, say 5555, digit by digit and drop any carry, and 9694 goes on the wire. The receiver subtracts the same key digit by digit. The same trick, adding a secret number to every group of a code book, is how armies and navies of the next seventy years protected their code books, including the Japanese navy's JN-25 of the Second World War ([chapter 14](14-The-Rest-of-the-War.md)). It has one fatal habit. If the same key numbers are used for two messages, subtracting the two ciphertexts cancels the key, and what is left is the difference of the two plaintexts. The program below shows it, using invented numbers except for the 4149 example.

```python
# A four-digit telegraph code with a secret number added on top.
def add(groups, key):                # digit by digit, dropping the carries
    return ["".join(str((int(a) + int(b)) % 10) for a, b in zip(g, k))
            for g, k in zip(groups, key)]

def sub(groups, key):
    return ["".join(str((int(a) - int(b)) % 10) for a, b in zip(g, k))
            for g, k in zip(groups, key)]

# The NSA's example: the character for rice is 4149; add the key 5555.
print(add(["4149"], ["5555"]))

# Two telegrams sent with the same list of key groups (the numbers are invented).
key = ["5555", "9021", "3846"]
first = ["1234", "4149", "7731"]
second = ["1234", "2210", "0678"]
c1, c2 = add(first, key), add(second, key)
print(c1, c2)

# The key cancels when you subtract one telegram from the other.
print("difference of the ciphertexts:", sub(c1, c2))
print("difference of the plaintexts: ", sub(first, second))

# If the clerk learns the plain text of the first, the key is his, and so is the second.
stolen_key = sub(c1, first)
print("key recovered:", stolen_key)
print("second telegram:", sub(c2, stolen_key))
```

Output:

```
['9694']
['6789', '3160', '0577'] ['6789', '1231', '3414']
difference of the ciphertexts: ['0000', '2939', '7163']
difference of the plaintexts:  ['0000', '2939', '7163']
key recovered: ['5555', '9021', '3846']
second telegram: ['1234', '2210', '0678']
```

Look at the first group of each ciphertext. They are identical, 6789, and their difference is 0000. An eavesdropper does not need to know the key to see that both messages begin with the same plain group. That is the first step of every attack on reused keys, and [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) returns to it when the key is a one-time pad.

!!! note "Life story: the Chinese telegraph code"
    **Born:** 1871 to 1872, Shanghai (Hans Schjellerup's list for the Great Northern Telegraph Company; Septime Auguste Viguier's *Dianbao xinshu*, 1872) · **Purpose:** to let clerks who did not read Chinese send Chinese text over a Morse line, by giving each character a four-digit number · **Helped:** Chinese commerce, government and press on the wire; the model of a number code that a secret added key can protect · **Status:** the numbers are still used for names and in some records; with an added key it has the same weakness as any reused key

### Japan, 1869 to 1879

Japan's first telegraph line, from Tokyo to Yokohama, opened in 1869, and by the early 1880s the network reached every large part of the country. Messages went in *Wabun* code, Morse's idea adapted for the kana syllables. The worry, as an essay of Japan's National Diet Library puts it, was that the telegraph operator could read everything, and coded telegrams were allowed soon after the service began.

Government offices used code charts from about 1875. The papers of an official, Mishima Michitsune, include charts for messages between the Home Ministry, the Finance Ministry and the governors of the prefectures. They were simple substitutions, such as running the *iroha* syllabary from its last syllable and not its first. From March 1879 the tables were scrambled irregularly, and in November 1879 the government adopted a cipher wheel: a small disk on a larger one, with a window that picked one of five code charts. The notice of the change, from the finance minister Ōkuma Shigenobu to the prefectures, dated 12 November 1879, survives in the same papers. It is the same kind of device as [Alberti's disk](06-Italy-Ambassadors-and-Nomenclators.md) of four centuries earlier, but each setting was still one simple substitution, and there were only five settings. A modern solver breaks it instantly, and a patient clerk of the 1880s with a few messages could have, too.

!!! note "Life story: the Meiji cipher wheel"
    **Born:** November 1879, Tokyo (adopted by the Meiji government for telegrams between the ministries and the prefectures) · **Purpose:** to keep the content of government telegrams from the operators and from anyone with access to the lines · **Helped:** the early cipher practice of the Japanese state, which went on to build far more elaborate systems · **Status:** replaced in the following decades; only the papers of Mishima Michitsune and a few charts survive

### In the real world

The 4149 example, the addition of 5555 and the 9694 come from the NSA's short history of the code. They are offered as an illustration of how such a cipher works, not as a record of a real intercepted telegram. What is solid is Viguier's book of 1872, Zheng Guanying's edition of 1881 and the whole structure of the system, which Mullaney's 2024 book describes from the sources. What is missing is any account of which Chinese ministries, if any, put a key over the numbers in the 1870s. For Japan the documents are real and are in the National Diet Library, and they show a government moving, within ten years of its first telegraph line, from the plain text of the early service to a cipher device. They say nothing about whether anyone ever tried to read the telegrams.

## 10.9 Russia: the Okhrana and the Nihilist cipher

*Level: intermediate.*

Tsarist Russia read mail on a large scale, and it did so before the telegraph. The "black cabinets" of the post offices, secret rooms where letters were opened, copied and resealed, go back to the eighteenth century in Russia as in Austria and France ([chapter 9](09-Queens-Spies-and-Black-Chambers.md)). The telegraph gave them a second job: telegrams went through the hands of state-run offices and could be copied as they passed.

On 13 March 1881 revolutionaries of the People's Will threw a bomb that killed Tsar Alexander II. The government set up, that year, a new political police, the Okhrana, whose job was to find the plotters. Its offices and its sections in the capital and, later, in Paris, where many revolutionaries lived, read the letters of known suspects. The revolutionaries wrote in ciphers. One that Russian radicals of the 1880s used is still called the **Nihilist cipher**, and it is a clever answer to a real problem: the revolutionaries had no machines and no codebooks they could safely keep, and they had to carry the key in their heads.

### The Nihilist cipher

It starts from the Polybius square of [chapter 3](03-Greece-and-Rome.md), here with a keyword, so each letter has a two-digit number from its row and column. The message is turned into these numbers. A second keyword is turned into numbers the same way, and the two lists are added, the key repeating under the message. The sum goes out as the ciphertext. The receiver subtracts. It is a keyword cipher, a Vigenère in numbers, and so it falls to the same two steps as the cipher of §10.5, with the extra work that the sums are numbers and not letters. For people with nothing but paper and a memory it was a real step beyond a simple substitution.

```python
# The Nihilist cipher: a Polybius square, then add a repeating number key.
def make_square(word):
    letters = "".join(dict.fromkeys(word + "ABCDEFGHIKLMNOPQRSTUVWXYZ"))
    return {ch: 10 * (i // 5 + 1) + (i % 5 + 1) for i, ch in enumerate(letters)}

def nihilist(text, square_word, key_word, sign=1):
    num = make_square(square_word)
    back = {v: k for k, v in num.items()}
    key = [num[c] for c in key_word]
    if sign == 1:
        return [num[c] + key[i % len(key)] for i, c in enumerate(text)]
    return "".join(back[n - key[i % len(key)]] for i, n in enumerate(text))

text = "THEPOLICEREADTHELETTERS"
secret = nihilist(text, "FREEDOM", "SONG")
print(secret)
print(nihilist(secret, "FREEDOM", "SONG", -1))
```

Output:

```
[87, 46, 48, 66, 58, 49, 67, 49, 56, 27, 48, 47, 57, 59, 66, 38, 77, 28, 79, 69, 56, 27, 78]
THEPOLICEREADTHELETTERS
```

### The police side

The Okhrana's decipherers were a part of its work, though it is hard to find out how large a part. The revolutionary Victor Serge, who saw the Okhrana's files after the revolution of 1917, wrote that its best decipherer, a man named Zybin, had such a reputation that he was kept on after the March revolution. Serge's account is partisan, and nothing else is known about Zybin. The Okhrana also read foreign traffic. One of its agents, Ivan Manasevich-Manuilov, described in notes found in its files intercepting and decoding the messages of the Japanese military attaché. These are pieces of a picture, not a picture: they show that the Okhrana had people who could solve ciphers, but not how many, how well or how often.

### In the real world

Where do we stand? That the black cabinets existed, and that the Okhrana was founded in 1881, are not in doubt. That Russian radicals used a Polybius-square cipher with an added key is recorded in the standard histories (Kahn gives it), and the name "Nihilist cipher" is the one cryptographers use for it, but no surviving intercepted message in it is cited here, and the connection between the cipher and particular people comes from later accounts. The Zybin story comes from one hostile witness. The sources for Russian cryptography in the late empire are thinner than for any other great power of the time, because the Russian archives were closed for most of the twentieth century and many files were destroyed in 1917. A book written today can say what the Okhrana was for. It cannot say how well it solved ciphers.

!!! note "Life story: the Okhrana's black cabinets"
    **Born:** the post-office black cabinets in the 1700s; the Okhrana as a political police in 1881 · **Purpose:** to find revolutionaries by reading their mail, their telegrams and their ciphers · **Helped:** the arrest of many plotters; Russia read foreign attachés too · **Status:** the Okhrana was closed after the revolution of March 1917; its files went to the Bolsheviks and in part to the Hoover Institution in the United States

## 10.10 Africa: drums that talk

*Level: beginner.*

The telegraph was not the first machine that sent a sentence faster than a man could run. In the forest regions of Central and West Africa people had talked over distances by drum for as long as anyone could say. In languages where a word's meaning depends on the pitch of its syllables, a drum or a hollowed log with two or three tones can copy the tune and the rhythm of a sentence. The Yoruba of Nigeria use the hourglass drum known as the *dùndún*, whose pitch the drummer changes by squeezing the cords. The Akan of Ghana use a pair of drums, the *atumpan*. In the Congo basin, communities such as the Kele used wooden slit gongs, and carried messages on them over distances that European visitors put at several miles.

The best-known account is a book by John Carrington, a missionary of the Baptist Missionary Society who lived for many years among the Kele in what was then the Belgian Congo. In *The Talking Drums of Africa* (1949), Carrington reported that a well-made message carried three to seven miles, and that a village could pass a message on to the next, so that news could cover a long distance faster than a runner. He described how the drum language worked, and it is the part of the story that matters here.

### Why a drum message is long

The trouble with the drum is that it has only a few tones. In Kele, most words are one of a small number of tone patterns, and many words share the same pattern. By Carrington's account the words for "manioc", "plantain", "above" and "forest" all sound alike on the drum. A drummer who sent just the one word would not be understood. So each word is sent inside a longer stock phrase. Manioc becomes, as Carrington gives it, "the manioc which remains in the fallow ground", and the phrase for another word is another phrase, which makes the context so plain that the listener cannot mistake it. James Gleick, retelling the story in *The Information* (2011), notes that the drummed version of a sentence is several times longer than the spoken one.

That extra length is not waste. It is **redundancy**, extra signal that lets a listener recover the message from a noisy channel, and it is the same trade that engineers made on the wire. A telegram of the best code words was as short as it could be and the least forgiving of errors, and §10.2 added a check letter to put some of that margin back. The drummer put it in a stock phrase. Shannon's theory of information (1948), which [chapter 15](15-Shannon-and-the-Agencies.md) tells, gave both trades one name and a number.

### Not a secret, but private

Drum language was not secret. Anyone who knew the language and the phrases could follow the simpler messages, although the full art belonged to trained drummers, and a stranger who did not know the language heard only a beat. It could be used to hide a message, all the same. In her study *Oral Literature in Africa*, Ruth Finnegan notes that during the Nigerian civil war (1967 to 1970) drum language was sent out over the radio to reach some listeners and not others. It is a case of a language doing the work of a cipher, the same idea as the Choctaw soldiers of 1918 whom [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) will meet. What kept it from being a cipher was that nobody had to learn a method: a native speaker needed only the language.

!!! note "Life story: the talking drums"
    **Born:** unknown; in use long before the first European accounts, which date from the nineteenth century and before; the best-known study is John Carrington's of 1949 · **Purpose:** to send a message over miles faster than a runner, in tonal languages, by copying the tune and rhythm of speech on a drum or slit gong · **Helped:** news, warnings, announcements and ceremony in Central and West Africa; in modern times, a case study of redundancy in communication theory · **Status:** still played, as an art and in ceremony; no longer the way news travels

### In the real world

The sources deserve care. Carrington's account is the work of one missionary working with one people, the Kele, in one region, and the distances and speeds in it are his estimates. Drum languages differ from one language to another and from one region to another, and they have been studied by linguists and ethnomusicologists since, so the Kele are an example and not the rule. The claim that drums outran runners is in the sources and believable; the claim that some message crossed a continent in a night is a story, not a measurement. What the case shows for this chapter is what a coder of the time could not see: that a message's length and its reliability are two sides of one design.

## 10.11 The wheel cipher: Jefferson, Bazeries and de Viaris

*Level: intermediate.*

The wheel cipher is the one hand device of the telegraph age that was really new, and it was invented twice. Thomas Jefferson described a "wheel cypher" in his papers, probably in the 1790s: 36 wooden disks, each with the alphabet around its edge in a different scrambled order, threaded on an iron axle. The sender turns the disks until the message reads along one row, then copies any other row as the ciphertext. The receiver, with the same disks in the same order, sets the ciphertext along one row and looks around the cylinder for the row that makes sense. The order of the disks is the key. The description was found among Jefferson's papers in 1922, and there is no sign he used it much.

The French cryptologist Étienne Bazeries (1846 to 1931), who later made his name by breaking the Rossignols' Great Cipher ([chapter 9](09-Queens-Spies-and-Black-Chambers.md)), reinvented it in 1891 with 20 disks, and offered it to the French army. Jefferson's description was not found until 1922, so Bazeries could not have known of it. The device is easy to carry, needs no table and gives a different cipher for every order of the disks: 20 disks can be put in $20! \approx 2.4 \times 10^{18}$ orders, a very large key.

Size is not strength, as the Marquis Gaëtan de Viaris showed in 1893. He was a French cryptologist and a nobleman who wrote on ciphers, and he broke Bazeries's cylinder with a guess. If a solver can guess a word of the message, say its opening, then on each disk the cipher letter must sit exactly the same number of places from the plain letter, and that distance, $k$, is the same on every disk. For each guessed letter only a few disks fit a given $k$. A wrong $k$ leaves some position with no disk at all, and the right one leaves a few candidates for each position. The program below builds a 16-disk wheel from 16 keywords, encrypts a message, shows how the receiver finds it and then runs the de Viaris test.

```python
# A wheel cipher: each disk carries the alphabet in its own scrambled order.
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
words = ["TELEGRAPH", "MERCHANT", "STEAMSHIP", "BANKRUPTCY", "LIGHTHOUSE", "QUARTERMASTER",
         "WESTERN", "RAILWAY", "COTTONFIELD", "MORSEKEY", "FRONTIER", "PARLIAMENT",
         "SIGNALMAN", "HARBOR", "JUNCTION", "VICTORY"]
disks = []
for i, w in enumerate(words):
    d = "".join(dict.fromkeys(w + A))          # keyword first, then the rest of the alphabet
    turn = (7 * i) % 26                        # start each disk at a different place
    disks.append(d[turn:] + d[:turn])
print("disk 0:", disks[0])
print("disk 1:", disks[1])

def row(text, k):
    # with the message set along one row of the wheel, read the row k places on
    return "".join(disks[i][(disks[i].index(c) + k) % 26] for i, c in enumerate(text))

secret = row("MEETATTHEBRIDGE", 7)
print("sent:", secret)

# The receiver sets the ciphertext along a row and looks at the other 25 rows.
for k in (6, 7, 8):
    print("row", k, row(secret, -k))

# De Viaris's trick: guess that the message opens MEETAT. On the right disk the cipher
# letter sits exactly k places from the plain letter, and k is the same on every disk.
guess = "MEETAT"
for k in range(1, 26):
    fits = [[d for d in range(16) if (disks[d].index(p) + k) % 26 == disks[d].index(c)]
            for p, c in zip(guess, secret)]
    if all(fits):
        print("k =", k, "disks that fit each position:", [len(f) for f in fits])
```

Output:

```
disk 0: TELGRAPHBCDFIJKMNOQSUVWXYZ
disk 1: TBDFGIJKLOPQSUVWXYZMERCHAN
sent: WBCHMFFQJJBDPPP
row 6 NRACBERJLCOMEIF
row 7 MEETATTHEBRIDGE
row 8 KMTPERSGIAFLCFD
k = 7 disks that fit each position: [2, 2, 2, 3, 1, 3]
```

Of the 25 possible values of $k$, only the right one survives the guess, and the same test narrows each position to two or three disks, which the solver then sorts out by trial. A longer guess leaves nothing to doubt. The wheel is only as secret as the disks, and an army's disks are in many hands. The lesson is Kerckhoffs's, and the date, 1893, is ten years after his rules.

The idea lasted. The US Army adopted a version with 25 aluminium disks as the M-94 in 1922 and used it into the Second World War, along with a flat-strip version, the M-138-A, used by the State Department, the Army and the Navy. The rotor machines of [chapter 12](12-Rotors-and-Enigma.md), which also turn scrambled alphabets one against another, are cousins of the wheel. The Jefferson and Bazeries devices also show how often a good idea is found twice.

!!! note "Life story: the wheel cipher"
    **Born:** probably the 1790s, Jefferson (36 disks, described in his papers and found in 1922); 1891, Bazeries (20 disks) · **Purpose:** a portable device that gives a new alphabet to every letter of the message, with the order of the disks as the key · **Helped:** the US Army and Navy's M-94 (1922 to the Second World War); a model for later cipher devices · **Status:** broken in 1893 by de Viaris with a guessed word; obsolete

## 10.12 Kerckhoffs and the six rules

*Level: intermediate.*

Auguste Kerckhoffs was born in 1835 in Nuth, in the Dutch province of Limburg, and died in Paris in 1903. He spent his working life in France as a professor of German, at the École des Hautes Études Commerciales in Paris, and in his spare time he took up two causes. One was the artificial language Volapük, which he promoted in the 1880s. The other was the problem of how an army should keep its telegrams secret. In January and February 1883 he published a long article, *La cryptographie militaire*, in the *Journal des sciences militaires*, which was read by officers. It ran to some sixty pages across the two issues. It is the most influential thing ever written on the subject by a man who never worked for a government's cipher service.

### The situation

France had lost the war of 1870 to 1871 against Prussia, and its army was rebuilding itself. The ciphers on offer to it were of the kinds this chapter has described: codes, transpositions, keyword ciphers. Kerckhoffs looked at them as an outsider with a professor's habit of analysis, and he saw three things. The telegraph put messages in the hands of many clerks, so ciphers must be simple enough for the clerks to use. A whole army would use the same system, in the hands of thousands of men, so some of its equipment would certainly be captured. And a cipher with a short repeating key was, since Kasiski, breakable by anyone who took the trouble.

### The six rules

From these he drew six requirements, which he gave in French. Here they are in close translation.

1. The system must be practically, if not mathematically, unbreakable (*matériellement, sinon mathématiquement, indéchiffrable*).
2. It must not require secrecy, and it must be able to fall into the enemy's hands without causing trouble (*il faut qu'il n'exige pas le secret, et qu'il puisse sans inconvénient tomber entre les mains de l'ennemi*).
3. The key must be communicable and retainable without the help of written notes, and must be changeable at the will of the correspondents.
4. It must be applicable to telegraphic correspondence.
5. It must be portable, and its handling or operation must not require the help of several people.
6. Finally, given the circumstances in which it is used, it must be easy to use, requiring neither mental strain nor knowledge of a long series of rules to observe.

It is worth reading the list as Kerckhoffs meant it, as a list for a field officer in the 1880s. Rule 1 says "practically" because he did not think a perfect cipher possible; the unbreakable cipher of [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) was about 35 years away. Rule 3 asks for a key that can be held in the head and changed at will, and it is the one the Confederacy ignored when it kept three phrases in use for years. Rule 4 is the telegraph rule: the ciphertext must be something a clerk can tap out, letters or digits, not special signs. Rules 5 and 6 say that a field cipher is used by a tired man with one hand free. The second rule is the one that lasted, and it says what it says because of what the others assume: a cipher in every unit's hands will be captured.

### Superimposition

Kerckhoffs also showed how to attack a keyword cipher when the messages are too short for Kasiski's method. A telegram is short, and a key of six letters repeating over a message of twenty gives each key letter three or four letters to work on. But a busy line sends hundreds of telegrams under the same key. Line them up with their first letters one above the other. The first letter of every telegram was shifted by the first letter of the key, so that column is a Caesar cipher with hundreds of letters in it, and counting solves it. The same holds for the second column, and so on. Kerckhoffs called this *superposition*, and the method returns in every later war: it is the attack on messages sent "in depth", under the same key. The program below does it with 40 invented telegrams of 18 letters, cut from a longer text so the demonstration repeats. A real stack would be different messages and would need more of them.

```python
# Kerckhoffs's superimposition: many short telegrams, one key, all starting together.
from collections import Counter

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
EN = [82, 15, 28, 43, 127, 22, 20, 61, 70, 2, 8, 40, 24,
      67, 75, 19, 1, 60, 63, 91, 28, 10, 24, 2, 20, 1]

def vigenere(text, key, sign=1):
    return "".join(A[(A.index(c) + sign * A.index(key[i % len(key)])) % 26]
                   for i, c in enumerate(text))

source = ("THE COLUMN HAS REACHED THE RIVER AND THE BRIDGE IS HELD BUT THE ENEMY "
          "GUNS COMMAND THE FAR BANK SEND AMMUNITION AND MEN BY THE NIGHT TRAIN "
          "AND TELL THE GENERAL THAT THE ORDERS ARE UNDERSTOOD AND WILL BE "
          "CARRIED OUT AT FIRST LIGHT UNLESS THE WIRE IS CUT AGAIN").replace(" ", "")

# Forty short telegrams, each 18 letters, each enciphered afresh with the same key.
key = "TARIFF"
telegrams = [vigenere(source[s:s + 18], key) for s in range(0, 40 * 3, 3)]
print(len(telegrams), "telegrams, for example:", telegrams[0], telegrams[1])

# Line them up. Column 1 (every telegram's first letter) is one Caesar shift, and so on.
found = ""
for col in range(6):
    letters = Counter(t[col] for t in telegrams)
    score = lambda s: sum(letters[A[(i + s) % 26]] * EN[i] for i in range(26))
    found += A[max(range(26), key=score)]
print("key found:", found)
print(vigenere(telegrams[0], found, -1))
```

Output:

```
40 telegrams, for example: MHVKTQNMEPFXKERKMJ VOCCRSAAJZJFVHVLYM
key found: TARIFF
THECOLUMNHASREACHE
```

### The second rule

Why did the second rule outlast the others? Rules 4, 5 and 6 describe a cipher for the telegraph and the field of 1883, and the machines of the next century had demands of their own. The second is a statement about secrecy, not about a technology. It says to count the method as known to the enemy and put all of the security in a key that can be changed. A method is hard to change: it has to be redesigned, printed and sent to every unit, and the enemy needs only one captured copy. A key is easy to change. That reasoning is as true of a laptop's encryption as of a telegraph cipher, and it is the reason the algorithms in the other books of this shelf, AES, RSA and ML-KEM, are published in full and attacked in public. Shannon put it more bluntly in 1949: "the enemy knows the system." [Book 1, chapter 1](../../book/01-What-Cryptography-Is-For.md#15-the-method-is-not-the-secret) sets out the argument, and [Cryptanalysis, chapter 1](../cryptanalysis/01-What-Cryptanalysis-Is.md) puts it into the modern definitions of an attacker.

The name "Kerckhoffs's principle" for the second rule is later than 1883, and the claim that all the secrecy goes in the key is a compression of what he wrote. He did not say that the design of a cipher must be published, only that its safety must not depend on its not being published.

!!! note "Life story: Auguste Kerckhoffs"
    **Born:** 19 January 1835, Nuth, Netherlands; died 9 August 1903, Paris · **Purpose:** to say what a military cipher must be if it is to be used in the field in the age of the telegraph · **Helped:** *La cryptographie militaire* (1883) set out six requirements, of which the second is the rule that all cipher design now follows; he also showed how to attack a keyword cipher by superimposing short messages · **Status:** the principle that bears his name is the one rule of this chapter that every cryptographer still repeats


## 10.13 The eve of 1914

*Level: intermediate.*

By the first years of the twentieth century the picture looked like this. A merchant sent his telegrams in a commercial code, with a private book if he could afford one and a secret number added if he wanted more. A ministry sent its telegrams in a code book of numbers with a cipher on top, and kept the book in a safe and changed it when it could. An army had the keyword cipher in its manuals as a thing to avoid, Playfair or a wheel for the field, and a growing number of officers who knew Kasiski's test and Kerckhoffs's rules. A revolutionary had a Polybius square and a memorized word. In China and Japan, scripts that Morse had not been made for were sent as numbers. In Africa, drums were still sending messages to villages out of range of the wire. Everyone knew that a telegram could be read by the clerks, by the telegraph company and by the government of any country the wire crossed, and every well-run office acted as if it did.

What changed it was the radio. Guglielmo Marconi took out his first British patent in 1896 and sent a signal across the English Channel in 1899. On 12 December 1901, by the account that he and his assistants gave, a faint signal, the three dots of the letter S, was heard at Signal Hill in Newfoundland, sent from Cornwall, 2,000 miles away. (The claim was doubted at the time and has been argued over since; the signal was weak and was heard by ear, through a kite-borne aerial.) By the middle of the decade the world's navies had radio. In the war between Russia and Japan in 1904 and 1905 both fleets used it, and the Japanese scouts reported the Russian fleet's position by wireless before the battle of Tsushima. A wire can be tapped only where it can be reached. A radio signal goes out in every direction at once, and anyone with a receiver in range hears it. The telegraph's problem, that everyone on the path can read, had become everyone in the air.

On the first full day of Britain's war, 5 August 1914, British cable ships cut Germany's undersea telegraph cables, and the German government had to send its overseas messages through cables that other countries controlled, or by radio. Both were read. The next chapter, [chapter 11](11-Radio-War-and-the-One-Time-Pad.md), begins there, with the Russian orders at Tannenberg sent in plain language, the room in the Admiralty Old Building where the British began to read German signals, and a cipher so strong that it needed no cleverness to defend it, only discipline. This chapter stops here.

### Can these be broken today?

Every cipher in this chapter falls to a computer in seconds, except one that this chapter did not meet, the one-time pad, and one that is not a cipher, the drum.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Commercial codebooks | at once, with the book | The books were sold openly. Without the book, the same code word for the same phrase repeats, and context fills it in, as Room 40 did with the Zimmermann telegram in 1917 ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)). |
| Poe-style substitution | in a second | Count the symbols, guess the commonest as E, fill in the words. The program of §10.3 prints the counts. |
| Keyword ("Vigenère") cipher | in a fraction of a second | Kasiski's repeats give the key length, then each column is a Caesar shift. The program of §10.5 does it. |
| Superimposed telegrams under one key | at once | Line up the first letters; each column is one Caesar shift. The program of §10.12 does it. |
| Playfair | in seconds | The same pair always gives the same pair. A computer changes the square a little and keeps the change if the text looks more like English. A few hundred letters are enough. |
| Wheel cipher (Jefferson, Bazeries, M-94) | easily, with a guessed word | The disk order is the key, and the disks are often captured. A guessed word rules out almost every order (§10.11). De Viaris did it in 1893. |
| Union route transposition | easily | The words are all still there. Try the likely grids and routes until sentences appear; the code words for names need context. |
| Chinese telegraph code with an added key | easily, with enough traffic | The book is public, so only the added digits are secret. If the key is reused, subtracting two messages cancels it (§10.8). |
| Nihilist cipher | easily | It is a keyword cipher in numbers. Subtract guesses of the key from the sums. |
| Meiji code charts and the cipher wheel | instantly | One substitution per setting, and only five settings. |
| Talking drums | not by codebreaking | A language, not a cipher. Only a speaker could follow it. |

### What the telegraph age left behind

- **The keyword cipher was dead.** After Babbage and Kasiski no repeating-key cipher could be trusted, and the search began for keys that do not repeat.
- **Kerckhoffs's principle**: assume the enemy knows the method, and put the secret in a key that can be changed.
- **Codes as an industry.** The price per word made the world's first mass market for codes, and the books it printed are the first large body of code-making in history.
- **The wire as a risk.** Clerks, companies and governments could read the traffic, and the courts and legislatures could demand it. Secrecy from the carrier became a design goal.
- **The step to machines.** A hand cipher that a tired clerk can use correctly is a hand cipher that a machine can use faster. The next chapters go there.

### In the real world

Pulling the chapter together, here is what the sources show and what they do not. The commercial code books survive in libraries by the thousand, and the history of the telegraph companies, from the Victorian Internet to the Western Union records, is well documented. What is poorly documented is who used which code for what: the books themselves say little about their users. For Babbage the notebooks exist and are read, and the reasons for his silence are guesses. For Kasiski the book exists, and its reception is told from later writers. For the American Civil War the main witness for the Union side's cipher work is David Bates, a participant writing 44 years later. For the Okhrana and for Chinese and Japanese government practice the surviving evidence is thin or hostile, as the sections said. For Kerckhoffs the primary source is two articles in a journal, and every statement of his "principle" in a later book is a paraphrase. Where an account in this chapter rests on a single retelling, such as Playfair's Foreign Office story, the Tennyson cipher or the Zybin story, the sentence says so.

## 10.14 Going deeper

*Level: expert.*

### The arithmetic of Kasiski's test

Kasiski's test is a hypothesis test. A repeated group of three letters in a ciphertext of $n$ letters has two possible origins: a real repeat of plaintext under the same part of the key, or a coincidence. If the ciphertext were uniformly random letters, a given pair of positions would match in all three places with probability $1/26^3 = 1/17{,}576$, and since there are $\binom{n-2}{2}$ pairs of positions, the expected number of chance repeats is about

$$\frac{1}{26^3}\binom{n-2}{2}.$$

For $n = 295$, the length of the message in §10.5, that is about 2.4. The program found 27 repeats, so at most a handful were chance, and 26 of the 27 gaps were multiples of 5. A chance gap is a multiple of 5 with probability about $1/5$, so of 2.4 chance gaps you expect about half of one. The excess of multiples is the evidence for the key length. The same count says why Kasiski's method needs text: both the real repeats and the chance repeats grow with the square of the length, but the real ones are more numerous per pair, so the signal rises out of the noise as the message lengthens. The §10.5 message is unusually repetitive (it says "THE" thirteen times), and an ordinary prose message gives a thinner margin and needs more letters. [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) develops this and the index of coincidence, which replaces counting repeats with a single statistic.

### A code book is a compressor

The commercial code book solved, by trade custom, a problem that information theory would name decades later. A code book is a dictionary of phrases that a business expected to repeat, and sending a phrase's number or word instead of the phrase is what a dictionary compressor does. The price per word is the cost function. The check letter is the redundancy put back to detect errors, and the ten-letter limit is the size of the code word. The program below puts numbers to it.

```python
# Two numbers behind the chapter: chance repeats in Kasiski's test, and what a code word saves.
from math import comb, log2

# 1. How many three-letter groups repeat by pure chance in n random letters?
def lcg(seed):
    x = seed
    while True:
        x = (1103515245 * x + 12345) % 2**31       # a small fixed generator, so the output repeats
        yield (x >> 16) % 26

def chance_repeats(n, trials, seed=1):
    g, total = lcg(seed), 0
    for _ in range(trials):
        text = [next(g) for _ in range(n)]
        seen = {}
        for i in range(n - 2):
            t = tuple(text[i:i + 3])
            seen[t] = seen.get(t, 0) + 1
        total += sum(c * (c - 1) // 2 for c in seen.values())    # pairs of equal groups
    return total / trials

for n in (100, 290, 400):
    expected = comb(n - 2, 2) / 26**3
    print(n, "letters: expected", round(expected, 2), " simulated", round(chance_repeats(n, 300), 2))

# 2. What an English letter costs, and what a code word costs, in bits.
EN = [82, 15, 28, 43, 127, 22, 20, 61, 70, 2, 8, 40, 24,
      67, 75, 19, 1, 60, 63, 91, 28, 10, 24, 2, 20, 1]
total = sum(EN)
h = -sum(c / total * log2(c / total) for c in EN)
print("English letters with no context:", round(h, 2), "bits each")
sentence = "OFFERACCEPTEDSHIPBYNEXTSTEAMERDRAWONUSATNINETYDAYS"
print(len(sentence), "letters of plain text: about", round(len(sentence) * h), "bits")
print("one 10-letter code word, at most", round(10 * log2(26)), "bits; one entry in a book of a million phrases:", round(log2(1_000_000)), "bits")
```

Output:

```
100 letters: expected 0.27  simulated 0.24
290 letters: expected 2.35  simulated 2.23
400 letters: expected 4.49  simulated 4.43
English letters with no context: 4.18 bits each
50 letters of plain text: about 209 bits
one 10-letter code word, at most 47 bits; one entry in a book of a million phrases: 20 bits
```

The sentence of §10.2, 50 letters, is about 209 bits if you count each letter at its single-letter entropy of 4.18 bits. English has far more structure than that. In 1951 Shannon estimated, by asking people to guess the next letter of a passage, that a letter in context carries only about 0.6 to 1.3 bits, which would put the sentence at 30 to 65 bits. A ten-letter code word holds at most 47 bits, and a book of a million phrases needs 20. So a good code book is not just short: it takes a typical business sentence to well below what a compressor with no shared dictionary could reach, and it gets there by knowing in advance what the firm will say. Its price is the one every dictionary compressor pays: it can say only what is in the book.

### Reading Kerckhoffs

The second rule is short, and it has been quoted for 140 years in forms that move away from the original. Three points of reading are worth making.

First, the word *système* in the rule meant the whole of the apparatus and procedure, the "material" of a cipher: tables, devices, instructions, drill. It was not the abstract algorithm of a modern text. His point was practical, that an army cannot keep its equipment from being captured. The modern principle, that the algorithm is public and the key is secret, is the same idea applied to a world in which the equipment is software, and it was put into those words by later writers, Shannon among them in 1949.

Second, he asks that a system *not require* secrecy; he does not demand that it be published. A government that classifies an algorithm and also designs it to survive capture is following the rule. A government that classifies it because the design could not survive capture is not. Some governments still keep some algorithms unpublished, and the argument is over which of the two they are doing.

Third, the rule is advice about design and an observation about how systems fail, and it is supported by history more than by proof. Every cipher in this chapter that was broken was broken because the method, or enough of it, became known: Kasiski's examination works on any keyword cipher because it assumes the method and not the key; de Viaris's attack on the wheel assumes the disks are known and not their order. Where the rule is ignored, the pattern repeats in later chapters, from rotor machines to the secret designs of the 1990s that [book 1](../../book/01-What-Cryptography-Is-For.md#15-the-method-is-not-the-secret) lists.

### Open questions

- **Babbage's notes.** The papers have been read in part and summarized by several historians. A complete, annotated edition of his cipher notes, with dates, would settle how far he went in 1854 and whether he found the key-length idea or only the repeats.
- **Who read Kasiski in the 1860s and 1870s?** The reception is known from later writers. Military libraries, reviews and the correspondence of cipher users in Prussia, France and Britain may hold direct evidence.
- **The users of commercial codes.** The books survive in thousands. How much telegraph traffic used a superencipherment on top, and how often it was broken by rivals or clerks, is a question for business archives, which are less studied than the books.
- **Chinese and Japanese government practice.** Whether Qing ministries put a key over the four-digit numbers in the 1870s and 1880s, and how well it was kept, is unclear from what has been published. The Japanese papers of the 1870s are real and little read outside Japan.
- **The Okhrana's deciphering section.** Its size, its method and its successes are known from a few hostile witnesses. The archives in Moscow and the Hoover Institution may say more.
- **Was the second rule new?** Kerckhoffs wrote it as if it were a plain truth. Whether an earlier writer said the same, in an unread book or an official instruction, is not known; no one has produced one as clear.

## Check yourself

??? question "1. Name five people who could read an ordinary telegram of 1860 between sending and delivery. Why did that make codes and ciphers worth having?"
    The sender's counter clerk, the first operator, the clerk at any relay office, the receiving clerk, and the messenger boy. Each could read the text, and the offices kept copies. A merchant, a politician or a general could not rely on the honesty of all of them, so he wanted a message that a clerk could carry without understanding. (A rival's friend among the clerks, or a government's request to the company, make the list longer.)

??? question "2. A firm sends a 12-word message on an Atlantic cable at about a pound a word. A ten-letter code word stands for the whole message. What does the firm save, and what does it not get?"
    It pays £1 instead of £12 and saves £11 on that message. It does not get secrecy, because the code book was on sale and a rival could buy the same book, and the clerk who sees the same word every Monday soon learns what it means. For secrecy the firm needed a private book or a secret number added on top.

??? question "3. Using the check letter of §10.2 (all letters add to a multiple of 26, with A = 0), what letter must be added to CAFE? Which kinds of garbling does it catch, and which does it miss?"
    C + A + F + E = 2 + 0 + 5 + 4 = 11, and $-11 \bmod 26 = 15$, which is P, so the word is CAFEP. Any single wrong letter changes the sum and is caught. Two errors that cancel each other (one letter up by 1, another down by 1), and a swap of two letters, are missed.

??? question "4. Break the cryptogram printed by the program of §10.3. (Hint: the commonest symbol is E; the group 0‡3 occurs five times.)"
    The plaintext is THE WIRE CARRIES THE NEWS BUT THE CLERK AT EACH END READS IT FIRST AND EVERY WORD COSTS MONEY SO THE MERCHANT WRITES HIS ORDER IN A SINGLE WORD AND HOPES THE CLERK WILL NOT UNDERSTAND IT. The symbol 3 is E (22 of 150 symbols); the group 0‡3 is THE, which fixes 0 as T and ‡ as H. After that the words complete each other, as they did for Legrand: with E, T and H known, the short words AT, IT and THE appear and give A, I and others. T and R tie for second place in the counts, so the repeated group, not the ranking, gives the way in.

??? question "5. Kasiski's test on a ciphertext finds repeats at distances 60, 84, 36 and 48. What key length do you guess, and what else could it be?"
    All four are multiples of 12 ($60 = 5 \times 12$, $84 = 7 \times 12$, $36 = 3 \times 12$, $48 = 4 \times 12$), so the key is probably 12 letters. It could also be a divisor of 12, namely 2, 3, 4 or 6, since the distances are multiples of those too. Take the largest unless the columns do not solve; with a 12-letter key each column is a Caesar shift, and with a key of 6 each column would be two shifts mixed together and would fail to give English.

??? question "6. Decrypt the Playfair message of §10.6: LA RP GL GM TL DN OG WT GZ EW TM, with the keyword TELEGRAPH."
    THE CLERK READS EVERY WORD. The square is TELGR / APHBC / DFIKM / NOQSU / VWXYZ. LA: L is row 1 col 3, A is row 2 col 1, a rectangle, so the corners in their own rows, T and H: TH. RP: R is row 1 col 5, P is row 2 col 2, giving E and C: EC. The same-row and same-column pairs go left and up.

??? question "7. The Confederacy used a keyword cipher and the Union a route transposition of words. Why did one fall to Union clerks while the other held?"
    The Confederate cipher reused a few short phrases (MANCHESTER BLUFF, COMPLETE VICTORY, COME RETRIBUTION) for years and sometimes left word breaks in, so a patient solver with many messages had everything he needed. The Union's route cipher moved the words, replaced names with arbitrary code words and padded the ends with nulls, so a reader had no names to start from and the route changed from time to time. Neither was strong against an expert, but one was used carelessly.

??? question "8. A clerk adds the key 5555 to the code number 7302 digit by digit, dropping carries. What goes on the wire? What does he learn if two messages with the same key start with the same ciphertext group?"
    $7+5=12 \to 2$, $3+5=8$, $0+5=5$, $2+5=7$: the wire carries 2857. If the first groups of two ciphertexts are the same, then their difference is 0000, which says the first plaintext groups are the same too, without any knowledge of the key. If he also knows one plain group, he subtracts it from the cipher group and gets the key group.

??? question "9. State Kerckhoffs's second rule. Does it say that a cipher's design must be published? Give one reason it has outlasted the other five rules."
    The system must not require secrecy, and it must be able to fall into enemy hands without harm. It does not say the design must be published, only that its safety must not depend on its not being published. It lasted because it is about secrecy and not about 1883's technology: a method is hard to change and easy to capture, and a key is easy to change. The other rules are about portability, telegraph use and ease of use, which depend on the machines of the day.

??? question "10. In a ciphertext of 400 letters, how many repeated three-letter groups would you expect by chance if the letters were uniformly random? Why does this matter for Kasiski's test?"
    $\binom{398}{2} / 26^3 = 79{,}003 / 17{,}576 \approx 4.5$. A message will thus show a few repeats that mean nothing, and their gaps are multiples of the true key length no more often than chance. The test works because real repeats are more numerous and cluster on multiples of the key length; with only a few repeats a stray one can mislead, which is why you collect all the gaps and look at the factor that divides most of them.

## What you learned

- The telegraph put every message into the hands of clerks and carriers, and a price per word made codes worth buying: from Francis Smith's *Secret Corresponding Vocabulary* of 1845 to the code books of the 1870s to 1900s, a firm could send a sentence as one word, hiding a little and saving a lot.
- Edgar Allan Poe's challenges of 1839 to 1841 and "The Gold-Bug" (1843) made substitution ciphers a public pastime, and Legrand's solution in the story is al-Kindi's method told again.
- Charles Babbage solved the keyword cipher in 1854 and published nothing; Friedrich Kasiski published the general method in 1863. After them no repeating-key cipher could be trusted.
- Wheatstone and Playfair's pair cipher (1854) worked on 625 pairs of letters instead of 26 letters, and the British Army used it in the field from the Boer War to the First World War.
- The American Civil War was the first telegraph war: the Union's route transposition of words held, the Confederacy's keyword cipher was read by Bates, Tinker and Chandler in Washington, and in 1876 to 1878 the cipher telegrams of a presidential election were solved and printed.
- Chinese telegrams went as four-digit numbers (1871 to 1872), and a secret number added on top has the weakness of every reused key. Japan moved within ten years from plain text to a cipher wheel (1879).
- The Okhrana read the mail and the ciphers of Russian revolutionaries from 1881, and the Nihilist cipher shows how far a Polybius square and a memorized word could go.
- Talking drums show that a message's length and reliability are two sides of one design.
- The wheel cipher was invented by Jefferson in the 1790s and again by Bazeries in 1891, and de Viaris broke Bazeries's in 1893 with a guessed word.
- Auguste Kerckhoffs's *La cryptographie militaire* (1883) set out six rules for a field cipher. The second, that the system must not require secrecy and may fall into the enemy's hands without harm, is the rule that all of modern cryptography follows.

**Next:** [Chapter 11](11-Radio-War-and-the-One-Time-Pad.md), when the telegraph's problem becomes everyone in the air, and a cipher appears that cannot be broken.

## Further reading

- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev. ed., Scribner, 1996): the telegraph codes, Poe, Babbage, Kasiski, the Civil War, the Tilden telegrams, Kerckhoffs and Bazeries.
- Friedrich W. Kasiski, *Die Geheimschriften und die Dechiffrir-Kunst* (Berlin, 1863).
- Auguste Kerckhoffs, "La cryptographie militaire", *Journal des sciences militaires* 9 (January and February 1883), pp. 5 to 38 and 161 to 191. A text with an English translation is kept online by Fabien Petitcolas.
- Charles Babbage, *Passages from the Life of a Philosopher* (Longman, 1864), the chapter "Of Deciphering".
- Ole I. Franksen, *Mr. Babbage's Secret: The Tale of a Cypher and APL* (Prentice Hall, 1985).
- Francis O. J. Smith, *The Secret Corresponding Vocabulary; adapted for use to Morse's Electro-Magnetic Telegraph* (Portland, Maine, 1845).
- Tom Standage, *The Victorian Internet* (Walker, 1998), on the telegraph's first decades; Alexander J. Field, "French Optical Telegraphy, 1793 to 1855", *Technology and Culture* 35 (1994), on the Chappe system and the Blanc brothers.
- Edgar Allan Poe, "A Few Words on Secret Writing", *Graham's Magazine* (July 1841), and "The Gold-Bug", *Dollar Newspaper* (June 1843); William F. Friedman, "Edgar Allan Poe, Cryptographer", *American Literature* 8 (1936).
- David Homer Bates, *Lincoln in the Telegraph Office* (Century, 1907).
- Wemyss Reid, *Memoirs and Correspondence of Lyon Playfair* (Cassell, 1899).
- Septime Auguste Viguier, *Dianbao xinshu* (電報新書) (Shanghai, 1872); Thomas S. Mullaney, *The Chinese Computer: A Global History of the Information Age* (MIT Press, 2024).
- National Diet Library (Japan), "Cipher Wheel of the Meiji Era", *Modern Japan in Archives*, with Ōkuma Shigenobu's notice of 12 November 1879 (Papers of Mishima Michitsune).
- Victor Serge, *What Everyone Should Know About State Repression* (1926); the CIA's *Studies in Intelligence* review of works on the Okhrana, for Manasevich-Manuilov's notes.
- John F. Carrington, *The Talking Drums of Africa* (Carey Kingsgate Press, 1949); Ruth Finnegan, *Oral Literature in Africa* (1970; Open Book Publishers, 2012), chapter 17; James Gleick, *The Information* (Pantheon, 2011), chapter 1.
- C. E. Shannon, "Prediction and Entropy of Printed English", *Bell System Technical Journal* 30 (1951).
- Étienne Bazeries, *Les chiffres secrets dévoilés* (Paris, 1901).
- *Weaker sources behind particular statements:* summaries of the Wikipedia articles on the Vigenère cipher and on Charles Babbage's cipher work (Thwaites, *The Tempest*, the keys "two" and "combined", the 1854 date) and Simon Singh's *The Code Book* (1999) for the Tennyson and EMILY story; Science News ("Poe's Secret") and Scientific American ("A Cipher from Poe Solved at Last") and the Knowing Poe site for the Tyler cryptograms; the NSA's "History Today" article on the Chinese telegraph code (15 February 2018) for the 4149 and 5555 example; the NSA-hosted *Cryptologic Quarterly* article "Before Bourbon" for the Okhrana's black cabinets; Wemyss Reid's anecdote about the Foreign Office, known through retellings; the Ellsworth story of 1862, the Blanc brothers and the details of who solved the Tilden telegrams, known from Kahn and from popular accounts; the dates of the first Atlantic cable messages and tariffs, from general histories. The code word BAKLOMESXL and all the telegram texts in the programs are invented examples.
