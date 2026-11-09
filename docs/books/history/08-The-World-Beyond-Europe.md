# 8. The World Beyond Europe

*Most of the people who ever kept a message secret did not live in Europe, and most of what they used was not an alphabet cipher. A Chinese general measured out eight sticks of wood to say "send grain." A Song officer stamped a seal beside one character of a poem. An Inca runner carried a knotted cord and said the rest aloud. A Korean king wrote letters and asked that they be burned. This chapter tells those cases from China, India, Persia, the Andes, West Africa, Ethiopia, Japan, Korea and the Ottoman Empire, says in each sentence how good the evidence is (it is often thin), and uses the space for what each case teaches about why a state keeps a cipher, loses it, or never needed one. You will cut a letter among three messengers, mark a poem the way a Song officer did, write a number on a khipu cord, and use a reciprocal swap from the* Kama Sutra.

!!! abstract "In this chapter"
    **You will learn:**

    - why the Chinese script, with thousands of signs, led to codes, tallies and split letters, and not to Caesar shifts;
    - what the *Six Secret Teachings* (about 400 to 220 BC) and the *Wujing Zongyao* (1044) say, with the actual lists of messages;
    - what the *Kama Sutra* and the *Arthashastra* say about secret writing, what a thirteenth-century commentator added, and what nobody can prove;
    - how the Persian world turned secret writing into a poetry of riddles and number games, and when it wrote its first books on ciphers;
    - why the Inca *khipu* and Maya writing are not ciphers, and why people keep asking;
    - what Nsibidi in West Africa and "wax and gold" poetry in Ethiopia show about secrecy kept by membership and by double meaning;
    - what survives from Japan, Joseon Korea and the Ottoman Empire, and where the record is empty.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) of this book (code, cipher and steganography told apart), [Chapter 4](04-Baghdad-and-Cairo.md) (the abjad, used in §8.6) and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) (the substitution cipher). Nothing else; no reading of Chinese, Sanskrit or Persian is needed, and the few characters in the code are labels.

    **Levels:** §8.1, §8.2, §8.5 and §8.7 are for beginners; §8.3, §8.4, §8.6, §8.8, §8.9, §8.10 and §8.11 are intermediate; §8.12 is expert.

## 8.1 The problem: no alphabet, no cipher

*Level: beginner.*

Picture an officer of the Song dynasty posted on the northwest frontier in the early 1040s. The Tangut state of Xia had broken with the Song court in 1038 and had beaten Song armies in the field, and the officer's job is to send reports back to the capital: the enemy is advancing, the garrison is short of grain, the siege has been lifted. A courier carrying the report can be ambushed. If the courier is captured, the enemy learns the army's condition from a letter written in plain Chinese.

The officer cannot do what a Roman general might. Caesar shifted his letters three places along the alphabet ([chapter 3](03-Greece-and-Rome.md)), and the trick needs an alphabet of twenty or thirty letters. Chinese is written with characters, each standing for a word or a syllable of a word, and a literate person needs some three thousand of them. There is no "next letter" to move to. A substitution cipher on characters is possible in principle, but it would need a table of thousands of entries, and the sender and receiver would have to keep it. The officer needs something else, and the thing he gets, as we will see in §8.3, is a list of forty stock messages and a poem to point at them.

That is the first lesson of this chapter, and it goes against the habit of thinking of cryptography as a long march from Caesar to the computer. Different societies faced different problems. The problem was never just "hide the words." It was one of these:

- **Say a few important things safely.** A general far away needs to report victory or defeat, and a handful of agreed signs will do. This is a code, not a cipher, and it needs no alphabet at all (China, §8.2 and §8.3; the Joseon beacons, §8.9).
- **Prove that a message is real.** A tally cut in two proves that the person holding one half is sent by the person holding the other. This is authentication, and it is older than secrecy as a written art (China, §8.2).
- **Keep a message from the carrier.** If the courier may be captured, give him only part of it (China, §8.2), or give him something he cannot read, or give him a spoken message and a cord to jog the memory (the Andes, §8.7).
- **Keep a message from the neighbors.** A love letter, a lodge's business, a poet's comment on a king, all aimed at a reader who knows a trick that outsiders do not (India, §8.5; Persia, §8.6; West Africa and Ethiopia, §8.8).
- **Keep a state's mail from other states.** A permanent embassy that writes home needs a cipher, and the Ottomans needed one only when they set up embassies late in the eighteenth century (§8.10).

Each of these problems has an answer that is not a Caesar shift. The shift, as the first four chapters of this book show, came from the lands around the Mediterranean and the Arabic-speaking world, where alphabets made it easy. This chapter is about the rest.

### What the sources are, and are not

Before the cases, a warning, and it shapes how every section below is written. The record outside Europe and the Arabic world is thin, and it is thin in particular ways.

For China there is a good deal of text, some of it early and exact: the *Liu Tao*'s chapters on tallies and secret letters, and the *Wujing Zongyao* of 1044 with its list of forty messages. What is missing is any record of how often these were used, or whether they worked. For India there is a list in the *Kama Sutra* and a commentary written many centuries later. For Sasanian Persia there is almost nothing written by the people themselves, and a good deal written about them, later. For the Americas and West Africa we have objects and records made by outsiders. For Korea we have a handful of letters, and for the Ottomans archives that a few scholars are only now reading.

So this chapter makes more use than the others of a ladder you met in [chapter 1](01-Why-People-Hid-Writing.md#17-how-we-know-anything): an object (a khipu, a tally, a letter), a witness, a manual, a later writer about earlier days, a modern theory. Figure 8.1 puts the cases on one line, with the rung each one stands on. Read the right-hand marks before you read anything else.

<figure class="mars-fig">
<svg viewBox="0 0 640 470" width="640" role="img" aria-label="Timeline of the cases in this chapter from the Six Secret Teachings, about 400 to 220 BC, to Nsibidi in the early 1900s, each marked by the kind of evidence it rests on" fill="currentColor" font-size="14">
<line x1="150" y1="8" x2="150" y2="462" stroke="currentColor" stroke-width="1.6"/>
<text x="136" y="27" font-size="13" text-anchor="end" font-weight="bold">400-220 BC</text>
<circle cx="150" cy="22" r="3.5" fill="currentColor"/>
<text x="166" y="27" font-size="13">China: Liu Tao, secret tallies and letters</text><text x="624" y="27" font-size="12" text-anchor="end" opacity="0.7">a book, date argued</text>
<text x="136" y="61" font-size="13" text-anchor="end" font-weight="bold">221 BC on</text>
<circle cx="150" cy="56" r="3.5" fill="currentColor"/>
<text x="166" y="61" font-size="13">China: bronze tiger tallies, matched halves</text><text x="624" y="61" font-size="12" text-anchor="end" opacity="0.7">objects</text>
<text x="136" y="95" font-size="13" text-anchor="end" font-weight="bold">AD 224-651</text>
<circle cx="150" cy="90" r="3.5" fill="currentColor"/>
<text x="166" y="95" font-size="13">Persia: Sasanian "secret script"</text><text x="624" y="95" font-size="12" text-anchor="end" opacity="0.7">later writers only</text>
<text x="136" y="129" font-size="13" text-anchor="end" font-weight="bold">2nd-4th c.</text>
<circle cx="150" cy="124" r="3.5" fill="currentColor"/>
<text x="166" y="129" font-size="13">India: Kama Sutra lists secret writing</text><text x="624" y="129" font-size="12" text-anchor="end" opacity="0.7">date argued</text>
<text x="136" y="163" font-size="13" text-anchor="end" font-weight="bold">1044</text>
<circle cx="150" cy="158" r="4.5" fill="currentColor"/>
<text x="166" y="163" font-size="13" font-weight="bold">China: Wujing Zongyao, 40-message poem code</text><text x="624" y="163" font-size="12" text-anchor="end" opacity="0.7">a printed book</text>
<text x="136" y="197" font-size="13" text-anchor="end" font-weight="bold">1200s</text>
<circle cx="150" cy="192" r="3.5" fill="currentColor"/>
<text x="166" y="197" font-size="13">India: Yashodhara's commentary on the swaps</text><text x="624" y="197" font-size="12" text-anchor="end" opacity="0.7">a late commentary</text>
<text x="136" y="231" font-size="13" text-anchor="end" font-weight="bold">1400s-1532</text>
<circle cx="150" cy="226" r="3.5" fill="currentColor"/>
<text x="166" y="231" font-size="13">Andes: Inca khipu (not a cipher)</text><text x="624" y="231" font-size="12" text-anchor="end" opacity="0.7">objects, chroniclers</text>
<text x="136" y="265" font-size="13" text-anchor="end" font-weight="bold">1555-1568</text>
<circle cx="150" cy="260" r="3.5" fill="currentColor"/>
<text x="166" y="265" font-size="13">China: Qi Jiguang's sound code (ascribed)</text><text x="624" y="265" font-size="12" text-anchor="end" opacity="0.7">attribution doubted</text>
<text x="136" y="299" font-size="13" text-anchor="end" font-weight="bold">1500s</text>
<circle cx="150" cy="294" r="3.5" fill="currentColor"/>
<text x="166" y="299" font-size="13">Japan: the iroha square, said of Uesugi Kenshin</text><text x="624" y="299" font-size="12" text-anchor="end" opacity="0.7">unproved</text>
<text x="136" y="333" font-size="13" text-anchor="end" font-weight="bold">1796-1800</text>
<circle cx="150" cy="328" r="3.5" fill="currentColor"/>
<text x="166" y="333" font-size="13">Korea: King Jeongjo's secret letters</text><text x="624" y="333" font-size="12" text-anchor="end" opacity="0.7">letters, press reports</text>
<text x="136" y="367" font-size="13" text-anchor="end" font-weight="bold">1797</text>
<circle cx="150" cy="362" r="3.5" fill="currentColor"/>
<text x="166" y="367" font-size="13">Ottoman Empire: first ambassadors' ciphers</text><text x="624" y="367" font-size="12" text-anchor="end" opacity="0.7">archives</text>
<text x="136" y="401" font-size="13" text-anchor="end" font-weight="bold">1865</text>
<circle cx="150" cy="396" r="3.5" fill="currentColor"/>
<text x="166" y="401" font-size="13">Persia: first printed book on ciphers</text><text x="624" y="401" font-size="12" text-anchor="end" opacity="0.7">a book</text>
<text x="136" y="435" font-size="13" text-anchor="end" font-weight="bold">1900s</text>
<circle cx="150" cy="430" r="3.5" fill="currentColor"/>
<text x="166" y="435" font-size="13">West Africa: Nsibidi first described by outsiders</text><text x="624" y="435" font-size="12" text-anchor="end" opacity="0.7">outside witnesses</text>
</svg>
<figcaption>Figure 8.1. The cases of this chapter, with the kind of evidence under each, at the right. The Chinese telegraph code of 1871, which belongs to Chapter 10, is left out here.</figcaption>
</figure>

Two cases are told elsewhere and are only pointed to here. The Arabic-language tradition of codebreaking, from al-Kindi about 850 to al-Qalqashandi in 1412, is the whole of [chapter 4](04-Baghdad-and-Cairo.md), and nothing in this chapter repeats it. The Chinese telegraph code of 1871, the first fixed numbering of Chinese characters, and the use of drums and telegraphs in Africa and Japan in the 1870s belong to [chapter 10](10-The-Telegraph.md), because they were answers to the telegraph and not to what came before.

## 8.2 China: tallies, split letters and matching halves

*Level: beginner.*

The oldest Chinese text on keeping a military message secret is in the *Liu Tao*, usually translated *Six Secret Teachings* or *Six Strategies*. It is a book of dialogues in which King Wu, who founded the Zhou dynasty, asks his adviser Tai Gong (Jiang Taigong, also called Lü Shang) how to win wars. By tradition the adviser was a real man of the eleventh century BC and the book is his. Modern scholars do not believe that. The studies Wolfgang Behr cites (Volker Strätz in 1979, Tong Xigang in 2000, Xie Wenchao and Cui Hongyan in 2005) put the text together late in the Warring States period, about 400 to 220 BC. Bamboo-slip fragments of a book of this name turned up in Han-dynasty tombs in the 1970s, which shows that the work existed by the second or first century BC. I do not know whether the passages below are among the fragments, and the date of these two chapters is therefore the date of the book: argued, and not fixed.

!!! note "Life story: the Liu Tao (Six Secret Teachings)"
    **Born:** a military book of the late Warring States period (about 400 to 220 BC), credited by tradition to Jiang Taigong of the eleventh century BC · **Purpose:** to advise a ruler how to fight, in sixty or so short chapters in dialogue; two of them, "Secret Tallies" and "Secret Writing", deal with secret communication · **Helped:** later Chinese military writers, who quote and rework it; it was one of the "Seven Military Classics" of the Song court · **Status:** survives complete in transmitted editions; the standard English translation is Ralph Sawyer's (in *The Seven Military Classics of Ancient China*, 1993, and as a separate book in 1997), and Behr gives the text in Chinese and English in a lecture of 2009

### The problem the book states

The question King Wu puts to his adviser is one every commander faced. An army is deep in another lord's territory. Something urgent happens, good or bad, and the ruler and the general need to speak across a distance, "to respond to the outside from within," without anyone in between learning what was said. How can he do it? The reply, in Behr's translation, is that ruler and general have **secret tallies**.

There are eight of them. They are rods of different lengths, and a rod's length is its meaning. The text assigns them like this:

| Length | What it tells the ruler |
|---|---|
| 1 *chi* (10 *cun*) | great victory, the enemy annihilated |
| 9 *cun* | the enemy army destroyed and its general killed |
| 8 *cun* | an enemy city fallen and taken |
| 7 *cun* | the enemy repulsed and driven far off |
| 6 *cun* | the city's people alerted and the guard strengthened |
| 5 *cun* | a request for grain and more troops |
| 4 *cun* | the army defeated and the general lost |
| 3 *cun* | a desperate situation, soldiers lost |

A *chi* is a foot and a *cun* an inch, one tenth of a *chi*; in the Warring States a *chi* was about 23 centimeters, a figure I give from standard measurement tables and not from this text. The messenger who carries the rod is not told what it means. The text adds a penalty: any courier who is careless or slow, and anyone who hears the contents and repeats them, is to be executed. Then it says that the eight tallies are "the device through which sovereign and general secretly communicate," and that "even if the enemies had the knowledge of a sage, there is none among them who could thoroughly penetrate into this."

Figure 8.2 draws the eight rods. The bar for each is to scale.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Eight bars of different lengths from 10 cun down to 3 cun, each labeled with the message it stands for in the Liu Tao" fill="currentColor" font-size="14">
<text x="20" y="22" font-size="13" font-weight="bold">Length</text>
<text x="170" y="22" font-size="13" font-weight="bold">The tally (to scale)</text>
<text x="400" y="22" font-size="13" font-weight="bold">What it says</text>
<text x="20" y="52" font-size="13">10 cun</text><rect x="110" y="38" width="250" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="52" font-size="12">great victory</text>
<text x="20" y="90" font-size="13">9 cun</text><rect x="110" y="76" width="225" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="90" font-size="12">army destroyed, general killed</text>
<text x="20" y="128" font-size="13">8 cun</text><rect x="110" y="114" width="200" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="128" font-size="12">city taken</text>
<text x="20" y="166" font-size="13">7 cun</text><rect x="110" y="152" width="175" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="166" font-size="12">enemy driven far off</text>
<text x="20" y="204" font-size="13">6 cun</text><rect x="110" y="190" width="150" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="204" font-size="12">alert the city, guard it</text>
<text x="20" y="242" font-size="13">5 cun</text><rect x="110" y="228" width="125" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="242" font-size="12">send grain and troops</text>
<text x="20" y="280" font-size="13">4 cun</text><rect x="110" y="266" width="100" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="280" font-size="12">army beaten, general lost</text>
<text x="20" y="318" font-size="13">3 cun</text><rect x="110" y="304" width="75" height="16" rx="2" fill="currentColor" opacity="0.8"/><text x="400" y="318" font-size="12">desperate, soldiers lost</text>
</svg>
<figcaption>Figure 8.2. The eight secret tallies of the Liu Tao. One tally per message, and the length is the only thing that distinguishes them. The meanings are those in Behr's translation of the text.</figcaption>
</figure>

### Code it: the tallies

The program below is the whole system. It is a lookup table with eight entries.

```python
# The eight secret tallies of the Liu Tao. The meaning belongs to the length (in cun).
# One chi is ten cun, so the longest tally is 10 cun.
TALLIES = {
    10: "great victory, enemy destroyed",
    9:  "enemy army destroyed, general killed",
    8:  "city taken",
    7:  "enemy driven far off",
    6:  "alert the city, strengthen the guard",
    5:  "send grain and more troops",
    4:  "army beaten, general lost",
    3:  "desperate, soldiers lost",
}

def send(meaning):
    for cun, text in TALLIES.items():
        if text == meaning:
            return cun
    raise ValueError("no tally for that")

stick = send("send grain and more troops")
print("what the courier carries:", stick, "cun of wood")
print("what the general reads :", TALLIES[stick])
print("messages the system can say:", len(TALLIES))
```

Output:

```
what the courier carries: 5 cun of wood
what the general reads : send grain and more troops
messages the system can say: 8
```

Three things about this system are worth saying plainly. First, it is a **code**, the kind chapter 1 separated from ciphers: a set of meanings agreed in advance, with nothing scrambled. Second, it can only say eight things. The text knows this. It has no tally for "the enemy has changed his plans," or "send three thousand men," and the following chapter exists because of that limit. Third, it has a strange property for a secret: the meanings are written down in a book. Anyone who has read the *Liu Tao* knows what a five-inch rod means. That does not make the passage foolish. A book that circulates among scholars is not a book in an enemy sergeant's hands, and the text says the general and the ruler arrange their own use; a correspondent could shift the meanings. But it is the first appearance in this chapter of an idea that [chapter 1](01-Why-People-Hid-Writing.md#16-what-secret-writing-meant-before-kerckhoffs) set out and the nineteenth century stated as a rule: the strength of a system is what survives when the method is known. The *Liu Tao* seems to hope the enemy does not know the method, and relies for the rest on the death penalty for couriers who talk.

### The secret letter in three parts

The next chapter of the book answers the limit of the tallies. King Wu asks what to do "when matters are too multifarious to be clarified by tallies," and the two men are far apart. Tai Gong's answer, in Behr's translation:

> Whenever dealing with secret affairs or great plots, writing has to be used, not tallies. ... All writings are assembled once and then divided again, issued thrice but known only by one. Divided again means that the writing is divided into three pieces; issued thrice but known only by one means that three persons handle one part each, mutually establishing a trinity without knowing the intelligence. This is called secret writing.

So a letter is cut into three parts, and three messengers each carry one. None of the three can read the whole, and the recipient, who receives all three, puts the pieces together. The text does not say how the letter is cut. Behr, in his lecture, shows one way by dealing the words out in turn, like cards, and I follow his illustration below. It is an illustration, and not a quotation from the text.

```python
# The Liu Tao's secret letter: cut in three, one piece for each of three messengers.
# This follows Wolfgang Behr's illustration, which deals the words out in turn.
text = "Even if the enemies had the knowledge of a sage there is none among them who could penetrate into this"
words = text.split()
pieces = [words[0::3], words[1::3], words[2::3]]
for i, p in enumerate(pieces, 1):
    print("messenger", i, "carries:", " ".join(p))

# The general puts the pieces back together by dealing the words in the same order.
back = []
for i in range(len(words)):
    back.append(pieces[i % 3][i // 3])
print("joined:", " ".join(back) == text)
```

Output:

```
messenger 1 carries: Even enemies knowledge sage none who into
messenger 2 carries: if had of there among could this
messenger 3 carries: the the a is them penetrate
joined: True
```

!!! tip "Break it"
    Read the three lines above one at a time. Messenger 1's piece, "Even enemies knowledge sage none who into", already tells a reader that the letter is about enemies, knowledge and a sage. A third of the words came free. Now suppose the enemy catches two messengers and holds two thirds of the words. How much of the letter does a reader recover? Try deleting one piece from the output and reading what is left. The Liu Tao's method hides the letter from a messenger who is caught alone, and only from him. It is a secret shared among three people, but it is **not** a secret in the strict sense, because each share, on its own, still leaks part of the plaintext.

That last point is where the oldest Chinese design differs from the modern one. A modern secret-sharing scheme ([Advanced protocols, chapter 2](../advanced/02-Secret-Sharing.md)) makes every share individually worthless, like the random shares in the program below. The Liu Tao's pieces are fragments of a plaintext, and a fragment of plain text leaks.

```python
# The same idea done with random bytes: three shares, and any two show nothing.
import random
random.seed(1044)
message = b"EVEN A SAGE CANNOT READ THIS"
a = bytes(random.randrange(256) for _ in message)
b = bytes(random.randrange(256) for _ in message)
c = bytes(m ^ x ^ y for m, x, y in zip(message, a, b))   # the third share
print("share 1:", a[:8].hex(), "...")
print("share 2:", b[:8].hex(), "...")
print("share 3:", c[:8].hex(), "...")
joined = bytes(x ^ y ^ z for x, y, z in zip(a, b, c))
print("all three:", joined.decode())
print("two only :", bytes(x ^ y for x, y in zip(a, b))[:8].hex(), "(noise)")
```

Output:

```
share 1: 72b6e5e4136b4a45 ...
share 2: 8c6d7cbc75b6d7fb ...
share 3: bb8ddc16469cbded ...
all three: EVEN A SAGE CANNOT READ THIS
two only : fedb995866dd9dbe (noise)
```

The two designs also share one weakness, and the Chinese text has it too: it needs all three pieces. If one messenger is killed, the letter is lost. A scheme that lets any two of three shares recover the secret was not found until Adi Shamir's in 1979, and the Advanced book teaches it.

### Halves that fit: tallies as proof

There is another kind of tally in China, and it is older than the book. The Chinese word *fu* (符) names a token split in two, so that the halves fit together only with each other. A ruler gives one half to a commander and keeps the other, and an order to move troops is honored only if the messenger carries the other half. Bronze tallies cast in the shape of a crouching tiger survive from the Warring States and the Qin and Han empires, and they carry inscriptions. As I recall the Qin-period examples (such as the Yangling and Du tallies; the Xinqi tally is sometimes dated to the Han instead), the inscription says the right half is with the ruler and the left half with the commander, that an army may be moved only when the halves match, and that there is an exception for a signal fire. I give this from memory of the standard descriptions and have not checked it against an edition, so treat the wording as approximate.

A matching tally does a job the secret tallies cannot: it proves who sent the order. It hides nothing, because the order can be written on the paper beside it. What it checks is that the sender holds the other half. In modern terms it is closer to a message authentication code ([book 1, chapter 10](../../book/10-Message-Authentication.md)) than to encryption. It also shares the weakness of any token: whoever steals the half has the authority. The Chinese state seems to have understood the difference between the two jobs, secrecy and proof, long before a Western writer separated them, and that is why §8.1 lists them separately.

## 8.3 Song China: the poem code of 1044

*Level: intermediate.*

By the eleventh century the Chinese state wrote more than it ever had, and fought more. The Song dynasty (960 to 1279) ruled a rich, literate, bureaucratic country, with printing, paper money and a large professional army, and it spent much of its time losing wars with its northern and northwestern neighbors. The Tangut state of Xia was declared an empire in 1038, and a war that lasted until a settlement in 1044 gave the court a good reason to ask for a handbook. The result was the *Wujing Zongyao*, "Essential Compendium of the Five Military Classics" (the title is often rendered "Collection of the Most Important Military Techniques"), compiled by order of the emperor between 1040 and 1044. Behr gives the compiler as Zeng Gongliang; most accounts name Zeng, Ding Du and the astronomer Yang Weide together. It is a big, practical, illustrated book on fortifications, siege machines, ships, and weapons, with some of the earliest printed recipes for gunpowder. One short section in it, called *zi yan*, "character verification," concerns messages.

!!! note "Life story: the Wujing Zongyao"
    **Born:** compiled 1040 to 1044 at the Song court, under the compilers Zeng Gongliang (999 to 1078) and Ding Du, by order of Emperor Renzong · **Purpose:** to give officers a reference on the whole business of war, in the middle of the Song-Xia war · **Helped:** military writers of the Song, Yuan and Ming; historians of technology (gunpowder weapons, the compass); and historians of cryptography, for one page · **Status:** survives in later printings; the poem code is known to cryptologic readers mostly through summaries by Wolfgang Behr and Klaus Flessel, and I have not seen the Song text itself

### Forty messages

The section gives a numbered list of forty standard messages, for the use of an officer in the field. Behr's translation gives them in order. They are the vocabulary of a frontier. Here they are, in English, from Behr's list.

| No. | Message | No. | Message |
|---|---|---|---|
| 1 | request bows | 21 | enemy numerous |
| 2 | request arrows | 22 | enemy few |
| 3 | request halberds | 23 | enemy divided against itself |
| 4 | request suits of armor | 24 | enemy adds troops |
| 5 | request javelin flags | 25 | enemy moves camp |
| 6 | request pots and tents | 26 | enemy advances |
| 7 | request horses | 27 | enemy withdraws |
| 8 | request clothing | 28 | enemy holds firm |
| 9 | request grain | 29 | enemy city besieged and taken |
| 10 | request forage | 30 | siege of enemy city lifted |
| 11 | request carts and oxen | 31 | besieged by the enemy |
| 12 | request ships | 32 | enemy siege lifted |
| 13 | request gear against attack on the walls | 33 | battle not won |
| 14 | request more troops | 34 | battle greatly won |
| 15 | request camp moved | 35 | battle won with great booty |
| 16 | request army to advance | 36 | officers and men surrender |
| 17 | request army to fall back | 37 | officers and men mutiny |
| 18 | request firm defense | 38 | soldiers sick |
| 19 | enemy army not in sight | 39 | commander sick |
| 20 | enemy in sight, clear | 40 | battle won, small victory |

The first eighteen are requests, the next two are about sight lines, then come the enemy's state, sieges, battles, surrender and sickness. It is a list of what a garrison commander needs to say, in the order a clerk would think of it, and it shows what the court thought a frontier report was: supplies, the enemy's movements, and the outcome of a fight. Nothing on it says why, or how many.

### The poem

Behr summarizes the method like this. The two correspondents choose a poem of five-character lines and eight lines long, which makes forty characters, and which must not repeat any character. They learn it by heart. The forty characters, in order, name the forty messages, so the first character of the poem is "request bows" and the ninth is "request grain." To send a message, the officer marks the corresponding character with an agreed seal, and the recipient finds the marked character and looks up its number.

Behr's example uses a famous poem, Du Fu's "Spring View" (*Chun wang*), a regulated verse of eight lines of five characters that Du Fu wrote in 757, while the An Lushan rebellion held Chang'an. The match between the poem's length and the list's is exact: a regulated pentasyllabic poem has forty characters, and the list has forty entries. I think that is not chance, though the sources I have do not say so. (Whether the Song text names a particular poem or leaves the choice to the correspondents, I do not know. Du Fu's poem is Behr's example.) Figure 8.3 shows Behr's example, which sends messages 9 and 31: "request grain" and "besieged by the enemy."

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The forty characters of Du Fu's poem Spring View in four rows of ten, numbered 1 to 40, with the ninth character and the thirty-first marked with a seal" fill="currentColor" font-size="14">
<text x="20" y="20" font-size="13" font-weight="bold">The poem is the index: the nth character names the nth message.</text>
<g font-size="22" text-anchor="middle">
<text x="75" y="64">國</text><text x="127" y="64">破</text><text x="179" y="64">山</text><text x="231" y="64">河</text><text x="283" y="64">在</text><text x="335" y="64">春</text><text x="387" y="64">城</text><text x="439" y="64">草</text><text x="491" y="64" font-weight="bold">木</text><text x="543" y="64">深</text>
<text x="75" y="120">感</text><text x="127" y="120">時</text><text x="179" y="120">花</text><text x="231" y="120">濺</text><text x="283" y="120">淚</text><text x="335" y="120">恨</text><text x="387" y="120">別</text><text x="439" y="120">鳥</text><text x="491" y="120">驚</text><text x="543" y="120">心</text>
<text x="75" y="176">烽</text><text x="127" y="176">火</text><text x="179" y="176">連</text><text x="231" y="176">三</text><text x="283" y="176">月</text><text x="335" y="176">家</text><text x="387" y="176">書</text><text x="439" y="176">抵</text><text x="491" y="176">萬</text><text x="543" y="176">金</text>
<text x="75" y="232" font-weight="bold">白</text><text x="127" y="232">頭</text><text x="179" y="232">搔</text><text x="231" y="232">更</text><text x="283" y="232">短</text><text x="335" y="232">渾</text><text x="387" y="232">欲</text><text x="439" y="232">不</text><text x="491" y="232">勝</text><text x="543" y="232">簪</text>
</g>
<g font-size="10" text-anchor="middle" opacity="0.7">
<text x="75" y="78">1</text><text x="127" y="78">2</text><text x="179" y="78">3</text><text x="231" y="78">4</text><text x="283" y="78">5</text><text x="335" y="78">6</text><text x="387" y="78">7</text><text x="439" y="78">8</text><text x="491" y="78">9</text><text x="543" y="78">10</text>
<text x="75" y="134">11</text><text x="127" y="134">12</text><text x="179" y="134">13</text><text x="231" y="134">14</text><text x="283" y="134">15</text><text x="335" y="134">16</text><text x="387" y="134">17</text><text x="439" y="134">18</text><text x="491" y="134">19</text><text x="543" y="134">20</text>
<text x="75" y="190">21</text><text x="127" y="190">22</text><text x="179" y="190">23</text><text x="231" y="190">24</text><text x="283" y="190">25</text><text x="335" y="190">26</text><text x="387" y="190">27</text><text x="439" y="190">28</text><text x="491" y="190">29</text><text x="543" y="190">30</text>
<text x="75" y="246">31</text><text x="127" y="246">32</text><text x="179" y="246">33</text><text x="231" y="246">34</text><text x="283" y="246">35</text><text x="335" y="246">36</text><text x="387" y="246">37</text><text x="439" y="246">38</text><text x="491" y="246">39</text><text x="543" y="246">40</text>
</g>
<circle cx="491" cy="56" r="22" fill="none" stroke="currentColor" stroke-width="2.4"/>
<circle cx="75" cy="224" r="22" fill="none" stroke="currentColor" stroke-width="2.4"/>
<text x="20" y="288" font-size="13">Seal on 木 (no. 9): "request grain"</text>
<text x="20" y="310" font-size="13">Seal on 白 (no. 31): "besieged by the enemy"</text>
</svg>
<figcaption>Figure 8.3. Behr's example of the poem code: Du Fu's "Spring View," forty characters in four rows of ten, none repeated. A seal beside a character sends the message with the same number in the list.</figcaption>
</figure>

### Code it: the poem code

```python
# The poem code of the Wujing Zongyao (1044), as Wolfgang Behr outlines it.
# The 40 characters of Du Fu's "Spring View" name the 40 stock messages by position.
poem = "國破山河在春城草木深感時花濺淚恨別鳥驚心烽火連三月家書抵萬金白頭搔更短渾欲不勝簪"
print("characters:", len(poem), " all different:", len(set(poem)) == len(poem))

roster = [
    "request bows", "request arrows", "request halberds", "request suits of armor",
    "request javelin flags", "request pots and tents", "request horses", "request clothing",
    "request grain", "request forage", "request carts and oxen", "request ships",
    "request gear against attack on the walls", "request more troops", "request camp moved",
    "request army to advance", "request army to fall back", "request firm defense",
    "enemy army not in sight", "enemy in sight, clear",
    "enemy numerous", "enemy few", "enemy divided against itself", "enemy adds troops",
    "enemy moves camp", "enemy advances", "enemy withdraws", "enemy holds firm",
    "enemy city besieged and taken", "siege of enemy city lifted", "besieged by the enemy",
    "enemy siege lifted", "battle not won", "battle greatly won", "battle won with great booty",
    "officers and men surrender", "officers and men mutiny", "soldiers sick",
    "commander sick", "battle won, small victory",
]

def mark(numbers):
    # Put a seal, shown here as brackets, around the poem character for each message.
    chars = set(poem[n - 1] for n in numbers)
    return "".join("[" + c + "]" if c in chars else c for c in poem)

def read(marked):
    out = []
    for i, ch in enumerate(poem):
        if "[" + ch + "]" in marked:
            out.append(roster[i])
    return out

letter = mark([9, 31])
print(letter)
print(read(letter))
```

Output:

```
characters: 40  all different: True
國破山河在春城草[木]深感時花濺淚恨別鳥驚心烽火連三月家書抵萬金[白]頭搔更短渾欲不勝簪
['request grain', 'besieged by the enemy']
```

The check that no character repeats matters, and it is the reason for the rule. If a character appeared twice, a seal beside it would be ambiguous, and the recipient could not tell message 9 from message 31. A poem with forty different characters is a table of forty unambiguous labels that two people can carry in their heads. That is its point. The poem is a **memory aid**, not a lock.

### What is the secret, and who knows it?

The summaries I have say the poem is sent with the seal stamped next to the character. They also describe an answer: the receiver sends the character back with a stamp to say yes, and marks the blank space beside it for no. I have seen the mechanics only in outline, and I do not know the exact wording of the Song page.

Two readings of the scheme are possible, and my sources do not decide between them. In the first, the whole poem goes in the letter with seals on it, and the secret lies in the list. That works only while the list is private, and it is not: it is printed in an encyclopedia the whole court owned, so an enemy who has read the *Wujing Zongyao* reads the marks. In the second, the officer writes an ordinary letter and the seal falls on one of the forty characters inside its text. Then the enemy does not even know which characters are code characters unless he knows the poem, though an enemy who captures a few letters and sees the seals always fall on the same forty characters has found them without trying.

Either way the real secret is small: **a short list of what you are allowed to say, indexed by something you can remember**. It is easy to use under a siege lamp, needs no table of thousands of characters, and says forty things. It has the strengths and limits of every code: it cannot say a new thing, and it says the same thing the same way every time.

!!! tip "Break it"
    You are the enemy. Over a month you capture twelve letters sent from the same garrison. Each has one or two seals beside characters you can see. What can you learn without knowing the list? Count how often each character is marked. Note which letters came before a sortie, and which before a supply train. Within a few weeks you know that the commonest mark comes before the grain wagons and that another comes before a retreat, without ever reading the poem. That is how every code falls to an observer who watches what happens next: the code book is rebuilt from the world, not from mathematics. The Song officers had no defense against this except to change the poem, and the list's order, often.

A thousand years later, British Special Operations Executive agents in the Second World War keyed their ciphers from memorized poems, and the poem there too was a memory aid that failed when agents chose famous ones. That story belongs to [chapter 14](14-The-Rest-of-the-War.md); the likeness is only the poem as a human-sized key.

!!! note "Life story: the poem code of 1044"
    **Born:** in the *zi yan* ("character verification") section of the *Wujing Zongyao*, 1044, as summarized by Behr and Flessel · **Purpose:** to let a field officer send one of forty stock messages by marking one character of a memorized forty-character poem with a seal · **Helped:** the Song army's frontier reports, if it was used, and any later system that uses a text as a memory aid · **Status:** the list and the outline survive; how often it was used, and whether the poem or the list was the secret, are not known to me



## 8.4 China after the Song: sounds, split characters and legends

*Level: intermediate.*

The Song poem code was a code. Later Chinese writers found ways to make something closer to a cipher, and the interesting thing is how each one works around the script. The script has no letters, so a substitution cipher has nothing to substitute. But spoken Chinese has parts, and written Chinese has parts too, and both can be used as the alphabet that the writing lacks. Wolfgang Behr's 2009 lecture "Ciphering Classical Chinese" collects the cases, with references to the Chinese-language studies behind them, and the rest of this section follows it. I have seen the lecture's slides, not the works they cite, and I say so where it matters.

### A cipher on the sounds of Chinese

Every Chinese syllable can be split into an **initial** (the consonant it starts with, which may be none), a **final** or rhyme (the vowel part and what follows), and a **tone**. Chinese scholars had analyzed syllables this way for a thousand years, because rhyming poetry needs it, and dictionaries of rhyme taught students the parts. That analysis is an alphabet of a kind: a few dozen initials and finals, from which every syllable of a dialect can be built.

A rhyme dictionary of the early Qing, the *Qi-Lin bayin* ("The Eight Tones of Qi and Lin"), incorporated an older text, the *Bayin ziyi bianlan* ("Handy Survey of the Meanings of the Characters Arranged by the Eight Tones"), which is ascribed to the Ming general Qi Jiguang (1528 to 1588), who fought coastal pirates on the southeast coast in the 1550s and 1560s. Behr describes an encryption method based on the book's phonology. The attribution to Qi is doubtful; Behr notes that an alternative attribution, to the phonologist Chen Di, is itself thought dubious, which leaves the authorship open. The system reads like this:

- A four-line verse, whose first fifteen characters name the fifteen **initials** of the Fuzhou dialect in order, so that the first character is initial 1, and so on (the last five characters just finish the poem). Behr gives it with the translation "Next to a willow, seeking a hideout from the damp." Initial 8, for example, is the sound *ts*, and initial 11 is "no consonant."
- A longer poem fixes the order of the dialect's thirty-three **finals**.
- A syllable is written as the number of its final, the number of its initial, and a mark for its tone.

Behr's example turns the stock phrase "enemy relocates camp" (the same words as message 25 in the *Wujing Zongyao*'s list) into three number pairs: 14-8, 26-11, 8-11, one per character, with tone marks that I cannot show. Each pair is final then initial. In the first syllable, *tsei* (a checked tone), the final is number 14 and the initial *ts* is number 8, and the other two syllables work the same way. The slide adds that "no further transposition or substitution" is attested, which means the numbers are not scrambled any further. The system is a spelling, and the rest of the secret is knowing the two verses and the dialect. The same syllable always gets the same numbers, so a counter of repeated pairs can attack it like any substitution, once enough ciphertext exists.

This is a cipher on an alphabet the script lacks, made of two poems learned by heart and hiding in a school dictionary. Chinese was not immune to letter ciphers; they had to be built on sound and not on the written sign. Whether any commander ever sent a message this way I do not know: the sources give a method, an ascription and one example, and no use.

### Secret languages of the south

Behr lists a different tradition, and it is the best documented in the chapter, for a plain reason: linguists wrote it down while it was alive. In the Min and Yue speaking regions of the south coast, and among neighbors who speak Hmong-Mien and Tai-Kadai languages, secret societies, triads and guilds used a family of spoken languages called *fanqie* codes or *qieyu*, after the old practice of spelling a syllable with two others. The rule is simple. Each syllable becomes two. The first keeps the original syllable's rhyme and takes the initial *l*; the second keeps the original initial and takes the rhyme *i*. Behr's example is the Fuzhou syllable *ho*, which becomes *lo* and *hi*, written "老喜." The linguist Zhao Yuanren (Y. R. Chao) published "Eight Kinds of Fanqie Languages" in 1931. Behr says these codes were "never used for premodern language stages and/or in writing": they are known only from the living speech of the nineteenth and twentieth centuries.

```python
# A fanqie-style language game. Each syllable becomes two: one that keeps its
# vowel part and starts with "l", and one that keeps its first sound and ends in "i".
# This is the rule Wolfgang Behr gives for the Min secret languages, in Latin spelling.
def split(syllable):
    for i, ch in enumerate(syllable):
        if ch in "aeiou":
            return syllable[:i], syllable[i:]
    return syllable, ""

def fanqie(syllable):
    onset, rhyme = split(syllable)
    return "l" + rhyme + " " + onset + "i"

for s in ["hao", "gu", "mei", "tong"]:
    print(s, "->", fanqie(s))
```

Output:

```
hao -> lao hi
gu -> lu gi
mei -> lei mi
tong -> long ti
```

It is Pig Latin. The point of the comparison is not that it is a joke. Pig Latin, thieves' cant, and the secret languages of guilds all share a feature that no letter cipher has: the rule is **learned by speaking**, so it needs no paper and leaves no document. Its price is that anyone who learns the rule can understand everyone, so it is an in-group badge much more than a lock, as the vowel tricks of the medieval scribes were ([chapter 5](05-The-Medieval-World.md)). It also explains why the record is thin. A secret that was never written down cannot be found in an archive.

### Split characters

A third family works on the shape of the character. Chinese characters are built from parts, and a character can be taken apart and described by its pieces. A poem can then be a riddle whose lines name the pieces and whose solution is the characters they make. The genre has a name, *li he shi*, "poems of splitting and joining." Behr shows a late-Tang stone slab from a Daoist sanctuary in northwest Hunan with such a poem that has to be read in a spiral, and a verse from the collections of secret-society documents, which he connects through Zhou Xinguo's study of 1997 to the Heaven and Earth Society and the Taiping.

| Line of the poem | The parts it names | The character |
|---|---|---|
| 人王腳下兩堆沙 "beneath the king of people's feet, two heaps of sand" | 人 over 王, with two small strokes below | 金 |
| 東門頭上草生花 "above the eastern gate, vegetation sprouts" | 東 and 門, with grass 艹 on top | 蘭 |
| 絲線穿針十一口 "a silken string threads eleven mouths" | 糸 with 十, 一 and 口 | 結 |
| 羊羔美酒是我家 "lamb and fine wine, that is my home" | 羊 over 我 | 義 |

Read down the right-hand column and the four lines spell 金蘭結義, "the golden orchid bond," a phrase for sworn brotherhood. A reader who has not been told to take the lines apart sees four lines about a house and a drink. That is steganography in the old sense of chapter 1, and it depends on a feature that no alphabet has: a Chinese character is a picture that can be cut. The method cannot be moved to English, and that is why it matters. A script's design decides what kind of secret is easy.

### Secrecy by route, not by writing

Another strand of Chinese practice hid the channel, not the text. Wang Jian published a study in 2004 on the secrecy system of the Ming dynasty's secret memorials (*mishu*), which I know only by its title. For the Qing, I rely on the standard account: from the reign of the Kangxi emperor, officials chosen by the throne sent "palace memorials" straight to the emperor in locked boxes carried by couriers, with the emperor writing his answer by hand and the memorial returned to the court, so that neither the ministers nor the clerks of the ordinary post saw them. The memorials were written in plain language. What was secret was who could send one and how it traveled. This is the Roman and medieval answer of the seal and the trusted carrier ([chapter 3](03-Greece-and-Rome.md), [chapter 5](05-The-Medieval-World.md)), pushed as far as a state can push it. A state that controls the post does not need a cipher.

The Mongol empire shows the same thing at a larger scale: relay stations (*yam*) and authority tablets (*paiza*) carried by couriers made its mail fast and authentic across Asia, and I know of no cipher used by its court.

### Two stories to leave on the shelf

Two stories turn up wherever Chinese secret writing is discussed, and I could find no document for either. One is that rebels against the Mongol Yuan dynasty passed the date of an uprising inside mooncakes at the Mid-Autumn festival; I know of no fourteenth-century source, and the tellings I have seen are much later. The other comes from a historical novel by Gao Yang about the merchant Hu Xueyan, which Behr quotes under a heading that ends in a question mark: a character recalls that a rebellious prince's household in the early eighteenth century, which included a Russian Orthodox priest, wrote Manchu in Russian letters so that the Yongzheng emperor's men could not read the intercepted notes. A novelist's memory is not an archive, and Behr does not offer it as one. Both are cases for the rule of §8.11: a legend is cheaper than a document.

One last point belongs to another chapter. The Chinese system of numbering characters for the telegraph, a table of about 7,000 characters (6,899 in Behr's count) drawn up around 1871 for the Great Northern Telegraph Company in Shanghai, turned the whole script into four-figure numbers, and the numbers were then scrambled. That is the story of [chapter 10](10-The-Telegraph.md), and it is the moment when the Chinese problem and the Western one finally became the same one.

!!! note "Life story: the sound code ascribed to Qi Jiguang"
    **Born:** a Ming text on rhyme for Fuzhou-dialect speakers, the *Bayin ziyi bianlan*, ascribed to the general Qi Jiguang (1528 to 1588) and later part of the early Qing *Qi-Lin bayin* · **Purpose:** the text is a school aid to the sounds of the dialect; Behr reads one use of its two mnemonic poems as a cipher that writes each syllable as final, initial and tone · **Helped:** nobody that I can show; no use of it is on record in my sources · **Status:** a method and one example survive; the ascription to Qi is doubted

## 8.5 India: secret writing as one of the sixty-four arts

*Level: beginner.*

The *Kama Sutra* is a manual of the art of living, from courtship to household management, attributed to Vatsyayana (Mallanaga Vatsyayana). Its date is argued. Estimates run from the second to the fourth century AD, and the text may have been put together over some time. Its first book, in the third chapter, lists **sixty-four arts** that a cultivated person should know: singing, dancing, painting, perfumery, tying garlands, chess, carpentry, mimicry, and more. The chapter is addressed to the education of women. The list includes one art that matters here, *mlecchita-vikalpa*, which is usually translated "the art of secret writing." In Richard Burton's 1883 English version, as I recall it, the art is described as understanding writing in cipher and writing words in a peculiar way; the Sanskrit name means something like "a variation in the manner of foreigners" (*mleccha* is the Sanskrit word for a foreigner or outsider), and the interpretation of the term is itself debated. I have not seen the Sanskrit, and I give the English as a paraphrase.

The *Kama Sutra* does not say how the art works. It names it, among dozens of others, and moves on. Whether the art was widespread or one of the items on an ideal curriculum is a fair question, since many of the sixty-four are skills no one person ever had. It is in the book because someone thought a woman of the household might want to send a private letter. That fits what [chapter 1](01-Why-People-Hid-Writing.md#14-who-wanted-to-hide-what) said about who most needs a lock: the people who are watched. And the *Kama Sutra* shows a culture in which secret writing was a refinement of a cultivated life, much as in the courts of Herat that §8.6 describes, and not a tool of the camp.

### The commentary that names the methods

The methods come from a commentary. Yashodhara wrote the *Jayamangala* on the *Kama Sutra*. Scholars date it to the thirteenth century; one summary I saw gives a range from the tenth to the thirteenth. Yashodhara says there are two kinds of secret writing, and names them.

- ***Kautiliya***, named for Kautilya, swaps letters according to their sounds. In the modern summaries I have seen, the vowels and certain other sounds are replaced by consonants and the reverse, following the phonetic classes of the Sanskrit alphabet. A simpler variant is called *durbodha*, "hard to understand."
- ***Muladeviya*** swaps letters in **pairs**. The pairing is reciprocal: if *a* is written for *kh*, then *kh* is written for *a*. Modern summaries give nine pairs from Yashodhara's table: *a* and *kh*, *gh* and *ṅ*, *c* and *ṭ*, *t* and *p*, *ñ* and *ṇ*, *n* and *m*, *r* and *ṣ*, *l* and *s*, *y* and *ś*. Every other letter stays as it is. A written form of this swapping is called *gudhalekhya*, "hidden writing."

I take the nine pairs from a modern summary of the commentary and have not checked them against the text. Two other summaries I found list ten pairs, with *a* swapped with *k* and *kh* with *g* and the other eight as above, so the first pair here is uncertain; the program below is a toy on the nine. A version practiced in Travancore under the name *Mulabhadra* differs in details, which fits a craft taught by teachers and not fixed by a standard. Neither method has a key in the sense of chapter 1: the table is the method, and anyone who knows it reads the message.

### Code it: a reciprocal swap

```python
# A reciprocal swap in the manner of the Muladeviya cipher. The nine pairs are those
# modern summaries give for Yashodhara's table; every other letter stays as it is.
# Letters are in the usual scholarly transliteration, and kh and gh are one letter each.
pairs = [("a", "kh"), ("gh", "ṅ"), ("c", "ṭ"), ("t", "p"), ("ñ", "ṇ"),
         ("n", "m"), ("r", "ṣ"), ("l", "s"), ("y", "ś")]
swap = {}
for x, y in pairs:
    swap[x] = y
    swap[y] = x

def tokens(word):
    out, i = [], 0
    while i < len(word):
        if word[i:i + 2] in ("kh", "gh"):
            out.append(word[i:i + 2]); i += 2
        else:
            out.append(word[i]); i += 1
    return out

def muladeviya(word):
    return "".join(swap.get(t, t) for t in tokens(word))

word = "nagara"                      # "city"
secret = muladeviya(word)
print(word, "->", secret)
print(secret, "->", muladeviya(secret))   # the same table undoes it
```

Output:

```
nagara -> mkhgkhṣkh
mkhgkhṣkh -> nagara
```

The second line is the interesting one. The same function encrypts and decrypts, because swapping a pair twice puts it back. A cipher with that property is called **reciprocal** (the mathematician's word is an *involution*), and it is convenient: one table, one procedure. Atbash ([chapter 2](02-Egypt-Mesopotamia-and-the-Bible.md)) is reciprocal. So is the rotor machine's reflector in Enigma ([chapter 12](12-Rotors-and-Enigma.md)), which gave the machine the same convenience and, as that chapter tells, a fatal weakness: a letter can never be enciphered as itself.

!!! tip "Break it"
    Decipher "mkhgkhṣkh" without the table, knowing only that it is Sanskrit. Here is where you start: count. In ordinary Sanskrit text the short vowel *a* is by far the commonest letter, and in this scheme it turns into *kh*, so *kh* will be the commonest letter of the ciphertext. That one guess hands you a pair. Because the cipher is reciprocal, it also hands you the pair's other half: wherever the ciphertext has an *a*, the plaintext had a *kh*. This is the same counting of letters that al-Kindi described in Baghdad ([chapter 4](04-Baghdad-and-Cairo.md)). A reciprocal pairing of 26 letters has 7,905,853,580,625 possible tables, about 7.9 trillion; the program in §8.12 counts them. That sounds like a lot and is a small fraction of the 403 septillion substitutions in general, and neither number matters, because the attack is counting.

### Kautilya's spies

The name *kautiliya* points at a second text. Kautilya, also called Chanakya or Vishnugupta, is the minister traditionally said to have helped Chandragupta Maurya win the throne of Magadha about 321 BC, and the *Arthashastra*, "The Science of Material Gain," a long manual of kingship, law, spying and war, goes under his name. Its date is argued: Patrick Olivelle's 2013 translation holds that it took its present form in the first centuries AD, from earlier materials. That puts it near the *Kama Sutra* and about a thousand years before Yashodhara, so when a thirteenth-century scholar called a cipher *kautiliya* he was naming it after a tradition of statecraft, not recording that the fourth-century-BC minister used it.

What does the *Arthashastra* say about secret writing? Here my knowledge is secondhand and I will be careful. The text describes a state that runs on spies, with several kinds of agent in disguise (the wandering ascetic, the merchant, the householder, the fellow student, and others), and David Kahn, in *The Codebreakers*, cites it for agents who are given their instructions in secret writing. I could not trace the passage to a chapter and verse, and I am passing on Kahn's summary and not my own reading. What I can say with more confidence is the shape of the book's concern. It spends far more attention on keeping *counsel* secret, on who may be in the room, what a talkative minister or a servant who overhears may leak, and how the king may be betrayed by a careless word, than on any script. That emphasis is the point. In a court where the main leak is a person, secret writing is a small piece of a larger discipline of secrecy.

!!! note "Life story: the Kama Sutra's secret writing (mlecchita-vikalpa)"
    **Born:** named in the *Kama Sutra* (compiled between about the 2nd and 4th centuries AD, the date disputed); the two methods are described in Yashodhara's commentary, the *Jayamangala*, of about the 13th century · **Purpose:** a private writing for the cultivated, in particular for women's correspondence, according to the book's own list of arts · **Helped:** historians of cryptography, from Kahn on, who cite it as proof that India knew secret writing; no letter in it survives · **Status:** the methods are simple substitutions; they are not known to have been used against an enemy

!!! note "Life story: the Arthashastra"
    **Born:** a Sanskrit manual of statecraft attributed to Kautilya, minister of Chandragupta Maurya (about 321 BC); Olivelle dates its main recension to about 50 to 125 AD, built on earlier sources and revised by about the third century AD (the date is argued) · **Purpose:** to teach a king how to rule, with chapters on law, taxes, war, diplomacy and spies · **Helped:** historians of Indian politics; cited by Kahn for spies and secret writing; its attention to counsel and its leaks is the useful part for this book · **Status:** survives in manuscripts; a manuscript came to light in 1905, and R. Shamasastry published the text in 1909 and an English translation in 1915; later translations are by R. P. Kangle (1960 to 1965) and Patrick Olivelle (2013)

## 8.6 Persia: a secret script, a poetry of riddles and a late handbook

*Level: intermediate.*

Persia is the case where the gap is widest. For the greatest empire of its region, ruled by the Sasanian dynasty from AD 224 to 651, we have almost no writing by its officials about anything like a cipher, and a great deal of Arabic and Persian writing about the Persians, composed centuries later. The chapter began with a warning about the ladder of evidence, and this is the rung at the bottom.

### The kings' secret script

Arabic writers of the tenth century, drawing on earlier Persian sources, describe the scripts of the Sasanian chancery. Ibn al-Nadim's catalog, the *Fihrist* (987), counts seven Persian scripts (he gives nine names, which the *Encyclopaedia Iranica* reads as some being variants). One of them, *raz-dabireh* ("secret script"), was by these accounts the script the kings used for their secret letters. Hamza al-Isfahani gives a similar description. That is nearly all anyone knows. The *Encyclopaedia Iranica* warns that these descriptions of the scripts are vague and often fanciful, so it is hard to say what the secret script really was: a cipher, a special alphabet, a chancery shorthand, or a name. I have not seen the Fihrist itself, and I rely on the old page of this site for the count of seven.

!!! note "Life story: the Sasanian raz-dabireh"
    **Born:** said to be a script of the Sasanian chancery (AD 224 to 651), known from Arabic writers of the tenth century and later; no example is known to me · **Purpose:** the kings' secret letters, according to those writers · **Helped:** nobody that can be shown; the report is repeated by historians of cryptography as a possible Persian source · **Status:** a tradition on the fourth rung of the ladder (a later writer about earlier days); what the script was is unknown

What happened next is better known. Much of the secretarial class of the Abbasid caliphate came from Persian families, as the historians of the period tell it, and the habits of the Persian chancery passed into Arabic administration. [Chapter 4](04-Baghdad-and-Cairo.md) tells how Baghdad's clerks became its codebreakers. It is reasonable to ask whether Persian practice fed that line. Nobody has shown that it did, and I would not claim it.

### The riddle that hides a name

Arabic called a cryptogram a *mu'amma*, "a blinded thing," and the word passed into Persian and Ottoman Turkish. There it took on another life, as a literary genre ([chapter 4](04-Baghdad-and-Cairo.md) noted the overlap). A **mu'amma** in Persian poetry is a riddle in verse whose answer is a name, usually a person's, hidden by manipulating the letters: take the first letter of one word, the last of another, drop one, turn another upside down, or add the number values of letters. The poet and the educated reader enjoyed the solving. The genre was given its standard form, according to a study of an elaborate fifteenth-century Persian letter, by Sharaf al-Din 'Ali Yazdi (died 1454) in a book called *Hulal-i mutarraz*. In the fifteenth century it was a refined art at the Timurid court of Herat; Jami (1414 to 1492), the great poet of that court, is said to have written several short treatises on it. It was in use, in Persian and Ottoman, for centuries after.

A *mu'amma* is not a cipher in the sense of an attacker and a defender. Everyone expects to solve it, the solution is a name already known to the audience, and it is meant to flatter or to amuse. But it uses the same material as the cipher: letters, their shapes, their positions, their number values. It shows what the people of the Persianate world thought secret writing was *for*. In their literature it was a courtly game, which suits the *Kama Sutra*'s view of the same art.

Its cousin is the **chronogram**, the *tarikh*: a phrase whose letters, added by their abjad values, give a year. Persian takes over the Arabic number values and gives the four extra Persian letters the values of the Arabic letters they are made from. The program below uses that table. [Chapter 4](04-Baghdad-and-Cairo.md) set out the abjad table and its mnemonic words, and the figure there shows the values.

```python
# Abjad values for Persian: the extra Persian letters take the value of the Arabic
# letter they were made from.
values = {}
for letters, v in [("ا", 1), ("بپ", 2), ("جچ", 3), ("د", 4), ("ه", 5), ("و", 6), ("زژ", 7),
                   ("ح", 8), ("ط", 9), ("یي", 10), ("کكگ", 20), ("ل", 30), ("م", 40),
                   ("ن", 50), ("س", 60), ("ع", 70), ("ف", 80), ("ص", 90), ("ق", 100),
                   ("ر", 200), ("ش", 300), ("ت", 400), ("ث", 500), ("خ", 600), ("ذ", 700),
                   ("ض", 800), ("ظ", 900), ("غ", 1000)]:
    for ch in letters:
        values[ch] = v

def jummal(text):
    return sum(values.get(ch, 0) for ch in text)

print("Allah  :", jummal("الله"))
print("Ali    :", jummal("علی"))
print("khak-e mosalla:", jummal("خاک مصلی"))
```

Output:

```
Allah  : 66
Ali    : 110
khak-e mosalla: 791
```

The last line is a famous one. The poet Hafez of Shiraz died about 1390, in the Muslim year 791 or 792 depending on the account (the chronogram on his tomb gives 791; most scholars prefer 792). The phrase *khak-e mosalla*, "the dust of the Musalla" (the Musalla is the garden in Shiraz where he is buried), adds up to 791, and it is quoted as the chronogram of his death. I give it as the standard citation, without having checked a primary source for it. It is a good example of the genre. Nothing is hidden: every educated reader added the letters. The pleasure is that the date is inside the phrase.

### The first Persian book on ciphers

If the Persian record is thin before the nineteenth century, it grows after. The *Encyclopaedia Iranica* entry "Codes," by C. E. Bosworth (1992), which I know only from a search summary, says that early Persian states probably used codes, since nearly identical versions were still in use under the Qajars. It divides them in two: **letter ciphers** (*ramz-e horufi*), written with an alphabet table, and **word codes** (*ramz-e kalameh*), written with a code book. The earliest published Persian work on cryptography seems to have been *Ramz-e Yusufi* ("Yusuf's Cipher") by the reforming diplomat Yusuf Khan Mostashar al-Dawla, printed in 1865. The most detailed account of Qajar practice, including instructions on solving by letter frequency, is in the writings of Mirza Mahmud Meftah al-Molk. I would expect a diplomatic service built on the European model to have brought European cipher practice with it, but the summary I saw does not say. The tradition that al-Kindi began in Baghdad about 850, and that the entry cites al-Qalqashandi's encyclopedia for, reached Persian print a little over a thousand years later.

!!! note "Life story: the Persian riddle poem (mu'amma)"
    **Born:** from the Arabic word for a cryptogram; a literary genre in Persian, Turkish and Arabic by the 15th century, given its standard form by Sharaf al-Din 'Ali Yazdi (died 1454) · **Purpose:** to hide a name in verse, by letter play and abjad sums, for an audience that enjoys the solving · **Helped:** court poetry for centuries; the habit of counting letters and number values · **Status:** a literary genre, still known in the Persian and Turkish traditions; not a cipher

### Safavids and Mughals: what I cannot tell you

I looked for ciphers of Safavid Iran (1501 to 1736) and Mughal India (1526 to 1857) and cannot give you a system for either. What exists is a large literature on Persianate diplomacy, in which Persian was the court language of both empires and the envoys' letters were works of art in a prescribed style (*insha*), judged on form. A dissertation on the diplomacy of the Mughal, Deccan and Safavid courts from 1580 to 1630, as far as I could learn from its summary, centers on the envoys' performance and the composition of letters, not on codes. The Mughals had runners on relays and "news-writers" reporting from the provinces, which I believe Abu'l-Fazl describes in the *Ain-i Akbari* of the 1590s, though I have not checked it. That is an intelligence system protecting the channel, as in China.

So two great Persian-speaking empires ran for centuries without, as far as I can show, a documented cipher system, and in the nineteenth century a Persian diplomat printed a book on ciphers. Whether the gap reflects the use or the record, I cannot say. [Chapter 1](01-Why-People-Hid-Writing.md) listed it among the open questions, and I have not closed it.

## 8.7 The Andes and the Maya: writing that is not secret

*Level: beginner.*

Whenever a book on secret writing reaches the Americas, someone asks about the Inca knots. The answer is no, the *khipu* is not a cipher, and the reason is worth working out, because the same reason applies to a great deal of "unreadable" writing.

The Inca state (the Tawantinsuyu, about 1438 to the Spanish conquest of 1532 and 1533) ran a large empire without a script that anyone has shown to be writing in our sense. It had roads, storehouses, a census, labor service and tribute, and it kept its records on **khipu** (also spelled *quipu*): a main cord from which hang many thinner cords, some with further cords hanging from them, made of cotton or the hair of llamas and alpacas, dyed in many colors, spun and plied in either direction, and knotted. The men who made and read them were the *khipukamayuq*, "keepers of the knots." The Spanish chroniclers describe a relay of runners, the *chaski*, who carried messages along the roads. As they tell it, a runner took a khipu with him and recited the words that went with it. The cord did not carry the whole message. It carried the figures and the memory aids, and the runner's voice carried the rest.

That arrangement protects a message in a way that has nothing to do with a code. A captured khipu is useless to a soldier who cannot read cords, and the spoken part lives in the runner's head. It is the medieval European arrangement of the reader's rarity ([chapter 5](05-The-Medieval-World.md)), with knots in place of Latin. It does not need to be a cipher, because very few people could have read it in any case.

### How a khipu counts

What we can read is the numbers. In 1912 the American anthropologist Leland Locke showed that the knots on most khipus record numbers in base ten, and published a book on it in 1923. (Accounts differ on whether to date his work 1912 or 1923.) The rule is the one in the program below:

- A cord is read by place. Knots at one height are the units, a higher cluster is the tens, a higher one the hundreds, and so on.
- In the higher places, the digit is the number of **single knots** in the cluster.
- In the units place, a **long knot** with *n* turns, from 2 to 9, stands for *n*, and a **figure-eight knot** stands for 1.
- A place with no knots means zero. The gap itself is the zero, which is how the Inca system had a zero without a symbol for it.

In the 1970s Marcia and Robert Ascher, in *Code of the Quipu* (1981), added a further discovery: on many khipus a cord at the top carries the sum of a group of cords beside it, so that a khipu can check itself. Figure 8.4 draws one.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="A khipu with a top cord and four hanging cords. Three of the hanging cords read 324, 107 and 45 and the fourth, with 4 hundreds, 7 tens and a long knot of 6 turns, reads 476, their sum" fill="currentColor" font-size="14">
<line x1="40" y1="40" x2="600" y2="40" stroke="currentColor" stroke-width="3"/>
<g stroke="currentColor" stroke-width="1" opacity="0.35" stroke-dasharray="3 4">
<line x1="14" y1="86" x2="600" y2="86"/><line x1="14" y1="156" x2="600" y2="156"/><line x1="14" y1="254" x2="600" y2="254"/><line x1="14" y1="316" x2="600" y2="316"/>
</g>
<text x="14" y="104" font-size="12" opacity="0.8">hundreds</text>
<text x="14" y="174" font-size="12" opacity="0.8">tens</text>
<text x="14" y="272" font-size="12" opacity="0.8">units</text>
<g stroke="currentColor" stroke-width="1.8">
<line x1="140" y1="40" x2="140" y2="316"/><line x1="260" y1="40" x2="260" y2="316"/><line x1="380" y1="40" x2="380" y2="316"/><line x1="520" y1="40" x2="520" y2="316"/>
</g>
<g fill="currentColor">
<circle cx="140" cy="100" r="6"/><circle cx="140" cy="114" r="6"/><circle cx="140" cy="128" r="6"/>
<circle cx="140" cy="170" r="6"/><circle cx="140" cy="184" r="6"/>
<ellipse cx="140" cy="276" rx="6" ry="11"/>
<circle cx="260" cy="100" r="6"/>
<ellipse cx="260" cy="276" rx="6" ry="11"/>
<circle cx="380" cy="170" r="6"/><circle cx="380" cy="184" r="6"/><circle cx="380" cy="198" r="6"/><circle cx="380" cy="212" r="6"/>
<ellipse cx="380" cy="276" rx="6" ry="11"/>
<circle cx="520" cy="100" r="6"/><circle cx="520" cy="114" r="6"/><circle cx="520" cy="128" r="6"/><circle cx="520" cy="142" r="6"/>
<circle cx="520" cy="170" r="6"/><circle cx="520" cy="182" r="6"/><circle cx="520" cy="194" r="6"/><circle cx="520" cy="206" r="6"/><circle cx="520" cy="218" r="6"/><circle cx="520" cy="230" r="6"/><circle cx="520" cy="242" r="6"/>
<ellipse cx="520" cy="276" rx="6" ry="11"/>
</g>
<g font-size="11" opacity="0.85">
<text x="152" y="280">4 turns</text><text x="272" y="280">7 turns</text><text x="392" y="280">5 turns</text><text x="532" y="280">6 turns</text>
</g>
<g font-size="15" font-weight="bold" text-anchor="middle">
<text x="140" y="340">324</text><text x="260" y="340">107</text><text x="380" y="340">45</text><text x="520" y="340">476</text>
</g>
<text x="450" y="58" font-size="12" text-anchor="middle" opacity="0.85">= sum of the three</text>
</svg>
<figcaption>Figure 8.4. A decimal khipu in the manner of Locke and the Aschers. Circles are single knots, ovals are long knots with the turns marked. The fourth cord carries the sum of the first three. This is a drawing made for this page, not a copy of a surviving khipu.</figcaption>
</figure>

### Code it: tying and reading a cord

```python
# Reading and writing a decimal khipu cord, after Leland Locke's account.
# Each place (hundreds, tens, units) is a cluster of knots at its own height.
# Higher places: that many single knots. Units: a long knot with n turns (2 to 9),
# or a figure-eight knot for 1. An empty place means 0.
def tie(n):
    cord = []
    for place, name in ((100, "hundreds"), (10, "tens")):
        count = n // place % 10
        if count:
            cord.append((name, "single knots", count))
    units = n % 10
    if units == 1:
        cord.append(("units", "figure-eight knot", 1))
    elif units:
        cord.append(("units", "long knot", units))
    return cord

def untie(cord):
    total = 0
    for place, kind, count in cord:
        total += count * {"hundreds": 100, "tens": 10, "units": 1}[place]
    return total

pendants = [324, 107, 45]
for n in pendants:
    print(n, tie(n))
top = sum(pendants)
print("top cord should read", top, "and carries", tie(top))
print("check:", untie(tie(top)) == top)
```

Output:

```
324 [('hundreds', 'single knots', 3), ('tens', 'single knots', 2), ('units', 'long knot', 4)]
107 [('hundreds', 'single knots', 1), ('units', 'long knot', 7)]
45 [('tens', 'single knots', 4), ('units', 'long knot', 5)]
top cord should read 476 and carries [('hundreds', 'single knots', 4), ('tens', 'single knots', 7), ('units', 'long knot', 6)]
check: True
```

### What nobody can read

The numbers are the easy part. About a third of the surviving khipus, in the estimate Gary Urton has given (I could not check the figure), do not follow the decimal pattern at all, and nobody knows what even the readable numbers count: people, llamas, days of labor, jars of maize. A reader needs the context, which the khipukamayuq carried in his head. Two scholars have pushed further. Urton, in *Signs of the Inka Khipu* (2003), has argued that color, fiber, the direction of the knots and the way a cord is attached could together carry far more than numbers, on the order of seven yes-or-no choices per cord, which would give 128 distinct signs. And in 2017 the anthropologist Sabine Hyland, in the journal *Current Anthropology*, reported on two khipus kept in the Andean village of Collata. She argued that combinations of color, fiber and ply direction there form about 95 distinct signs, and that the signs at the ends of the cords spell the names of the village's family lines in a phonetic way. Her reading is still contested, and one outside scholar called it groundbreaking if it holds and said that the challenge was to find more khipus that can be tested. I take both claims as proposals.

Harvard's Khipu Database Project, set up under Urton with Carrie Brezine, records the physical details of several hundred khipus so that others can look for patterns, which is the only way a decipherment will be tested. Colonial history made the problem harder: the Spanish at first used khipu readers as record-keepers, and then the Church turned against them. The Third Council of Lima in 1583 declared khipus that carried the testimony of old beliefs to be idolatrous and ordered them destroyed, and also recommended khipus as aids to confession. Which reading of the decree is right, a ban on all khipus or only on idolatrous ones, is debated. The newer accounts say the narrower one. Frank Salomon's *The Cord Keepers* (2004) follows the tradition into a village that kept its khipus into the twentieth century.

### Three tests, and the Maya

[Chapter 1](01-Why-People-Hid-Writing.md#17-how-we-know-anything) gave three tests for secret writing: is there a text, did the writer mean to hide it, and is there a rule that reads it? A khipu passes the first and the third, as far as the numbers go, and fails the second. Its makers were not hiding anything from the Spanish. They were keeping accounts for each other. That is why the khipu is a problem of **decipherment**, recovering a script whose readers are gone, and not of **decryption**, reading what a writer hid on purpose. The two get confused because both end in a person staring at marks, and both use the same habits of counting, comparing and guessing. They are not the same problem, and the history of secret writing is clearer when they are kept apart.

The Maya of Mexico and Central America are the other well-known case, and the story belongs here because it shows both sides. In 1562, at Maní in Yucatán, the Franciscan Diego de Landa burned a large number of Maya books, which he called works of the devil. A few years later he wrote a description of Yucatán in which he set down what he took to be a Maya "alphabet," after asking a Maya man to write out each Spanish letter. The man wrote the sounds of the letters' names in Maya signs, which were syllables and not letters, and Landa's list is a record of that misunderstanding, though parts of it later helped. In 1952 the Soviet scholar Yuri Knorozov argued that the script was a mixture of word signs and syllable signs. And in 1960 Tatiana Proskouriakoff, a Russian-born American who had trained as an architect and drew the buildings of Piedras Negras for the Carnegie Institution, showed that the dates and signs on the monuments there were not about gods and the calendar, as had been believed, but about the births, accessions and deaths of rulers. That was the break. It came from counting and sorting, the same method as cryptanalysis, applied to a script with no secret in it.

!!! note "Life story: the khipu"
    **Born:** in the Andes, long before the Inca state (the oldest known examples are older than the empire; the Inca used them from about 1438 to 1532) · **Purpose:** to keep accounts, counts and perhaps other records in knotted cord, and to give a runner a prompt for a spoken message · **Helped:** a state of millions, without a known script; later, Spanish colonial administrators · **Status:** about a thousand survive, in museums and a few villages; the numbers can mostly be read; whether any cords record words is argued

!!! note "Life story: Tatiana Proskouriakoff"
    **Born:** 1909, Tomsk, Russia; died 1985, Cambridge, Massachusetts · **Purpose:** trained as an architect, she drew reconstructions of Maya buildings for the Carnegie Institution and then studied the inscriptions on their monuments · **Helped:** showed in 1960 that Maya inscriptions at Piedras Negras record the histories of rulers, which opened the way to reading the script · **Status:** her 1960 paper is a landmark of Maya studies; the script was largely read by the 1990s

## 8.8 West Africa and Ethiopia: membership and double meaning

*Level: intermediate.*

Two African cases show kinds of secrecy that no alphabet cipher could provide. In one, the secret is kept by *who* you are. In the other, it is kept by what the words can mean to different listeners. [Chapter 10](10-The-Telegraph.md) tells the story of talking drums and the colonial telegraph, so they are not repeated here.

### Nsibidi: signs for the initiated

In the Cross River region of southeastern Nigeria and the neighboring part of Cameroon, the Ejagham, Efik, Ibibio and other peoples developed a system of signs called **Nsibidi**. The signs are drawn on the ground and on walls, cut into calabashes, painted on cloth and the body, and made as hand signals. They are not a script for a language, in the sense that a letter stands for a sound. Many signs are ideograms: a picture of lovers, of a court case, of a path. The signs are best known as the property of the **Ekpe** society (also called Ngbe or Egbo), the men's leopard society of the region, which had its own grades of rank and its own judicial and political power. Different signs belonged to different grades.

The earliest accounts that outsiders published are from the first years of the twentieth century. The missionary J. K. Macgregor wrote about Nsibidi in 1909, Elphinstone Dayrell copied signs in articles of 1910 and 1911, and P. Amaury Talbot described them in his books of 1912 and later. Talbot thought Nsibidi was a kind of "primitive secret writing." Macgregor held that its use was that of ordinary writing, and the two differed on whether it was a secret at all. Both may be describing different signs. Many signs concern love affairs and are public in the sense that anyone who knew them could read them, and the signs that concern war and sacred matters were kept inside the society. How old the system is, nobody knows. The first notices are about 1900, and the claims that it is far older rest on arguments I cannot assess. I take these dates and quotations from summaries, not from the papers.

What makes Nsibidi unusual among the cases of this chapter is that it carried over the Atlantic. Men from the Cross River were taken to Cuba as slaves, and in Havana in the 1830s some of them founded a mutual-aid society, the **Abakuá**, modeled on Ekpe. The Abakuá write sacred signs, called *anaforuana*, that descend from Nsibidi. Lydia Cabrera, the Cuban ethnologist, recorded the society and its signs in *La sociedad secreta Abakuá* (1958), working with its members. The signs are in use today.

!!! note "Life story: Nsibidi"
    **Born:** among the peoples of the Cross River region (southeastern Nigeria and western Cameroon); age unknown, first described by outsiders about 1900 to 1912 · **Purpose:** to let initiates, and sometimes lovers, send messages that others cannot read, in signs drawn, cut, painted or made with the hands · **Helped:** the Ekpe society's authority; in Cuba, the Abakuá society, which carried the signs across the Atlantic · **Status:** alive in the Cross River region and in Cuba; the largest part of its record was written by outsiders, and some signs remain secret

### What membership does and does not do

The secret in Nsibidi is **who may know**, not **what is hidden**. A sign is no stronger than a Caesar shift as a lock: anyone who learns the signs can read them. What keeps it secret is that learning them requires initiation, with its fees and oaths and grades. Its protection is social, as the *Liu Tao*'s protection was a penalty and the Inca khipu's was a trained reader. A system like this cannot be written down in a manual without losing its protection, so the historian depends on outsiders' accounts, and it cannot scale beyond the society that holds it. Modern cryptography is the reverse: the method is public and the key is a small number anyone can hold.

### Ethiopia: wax and gold

In Ethiopia, the rest of the evidence is different. Here is the honest statement first: I know of no documented cipher system of the Ethiopian state before the telegraph and telephone reached the court of Menelik II (who reigned from 1889 to 1913), and I do not know what ciphers, if any, came with them. The case in the outline of this book for Ethiopia is better told as a case about language than about writing.

The Ethiopian Orthodox church schools teach a poetic art called **qene**, verses in Ge'ez (and later Amharic) that are built to carry two meanings. The surface meaning is called the **wax** (*sem*) and the inner meaning the **gold** (*werq*), from the image of a lost-wax casting, where the wax model is melted away to leave the gold. A good qene reads properly in both senses. The American sociologist Donald Levine, in *Wax and Gold* (1965), argued that the tradition shapes Amhara culture well beyond poetry: a person who speaks in a way that lets a listener take the surface meaning, while a clever listener takes the other, has said something he can later deny. The practical use is plain. Speech before a ruler, a judge or a rival is safe when its dangerous reading can be left unclaimed.

It is the oldest and simplest form of **deniable communication**, and it is the opposite of a cipher. A cipher marks a message as secret and relies on the key. Wax and gold leaves the message in plain view and relies on the listener to hear two things. It is steganography of meaning. [Chapter 1](01-Why-People-Hid-Writing.md) met an early form in the number 666 of the book of Revelation, a message to the initiated inside a text that an inspector could read as harmless.

!!! note "Life story: qene and the wax and gold tradition"
    **Born:** in the Ethiopian Orthodox church schools, in verse in Ge'ez and later Amharic; the age of the form is not fixed in my sources · **Purpose:** to teach poets and speakers to say one thing on the surface and another beneath, so that a dangerous meaning can be left unclaimed · **Helped:** court and village speech for centuries; described for outsiders by Donald Levine in *Wax and Gold* (1965) · **Status:** alive in Ethiopian poetry and speech; not a cipher

## 8.9 Japan and Korea: a square, a king and a fire on a hill

*Level: intermediate.*

### Japan: the iroha square, if it was used

Japan's one famous cipher story comes from the sixteenth century, and the first thing to say about it is that no key and no message survive. The story is that the warlord Uesugi Kenshin (1530 to 1578), who held Echigo province on the sea of Japan, or an adviser of his named in later tales as Usami Sadayuki, used a **cipher square** built on the *iroha*. The *iroha* is a Japanese poem that uses each of the forty-seven kana syllables exactly once, and it was for centuries the standard order in which Japanese children learned them, as ABC is for ours. By tradition the monk Kukai (774 to 835) wrote it. Scholars doubt that, and the earliest written copies are from the late eleventh century. Its words, a Buddhist verse on the passing of all things, run "Though the flowers are bright, they scatter..." in the usual rendering.

Because the poem uses every syllable once, it makes a table with no repeats for free, exactly as Du Fu's poem did in §8.3. Write the forty-seven syllables in a seven-by-seven grid and each one can be sent as its row and its column. It is **Polybius's square** ([chapter 3](03-Greece-and-Rome.md)) with a different alphabet. Figure 8.5 draws it.

<figure class="mars-fig">
<svg viewBox="0 0 640 340" width="640" role="img" aria-label="A seven by seven grid holding the forty-seven kana of the iroha poem in order, with row and column numbers, and the four cells for the message kefu asa marked" fill="currentColor" font-size="14">
<g font-size="12" text-anchor="middle" opacity="0.8">
<text x="150" y="30">1</text><text x="210" y="30">2</text><text x="270" y="30">3</text><text x="330" y="30">4</text><text x="390" y="30">5</text><text x="450" y="30">6</text><text x="510" y="30">7</text>
<text x="100" y="62">1</text><text x="100" y="106">2</text><text x="100" y="150">3</text><text x="100" y="194">4</text><text x="100" y="238">5</text><text x="100" y="282">6</text><text x="100" y="326">7</text>
</g>
<g fill="none" stroke="currentColor" stroke-width="1.2">
<rect x="120" y="40" width="420" height="294"/>
<line x1="180" y1="40" x2="180" y2="334"/><line x1="240" y1="40" x2="240" y2="334"/><line x1="300" y1="40" x2="300" y2="334"/><line x1="360" y1="40" x2="360" y2="334"/><line x1="420" y1="40" x2="420" y2="334"/><line x1="480" y1="40" x2="480" y2="334"/>
<line x1="120" y1="84" x2="540" y2="84"/><line x1="120" y1="128" x2="540" y2="128"/><line x1="120" y1="172" x2="540" y2="172"/><line x1="120" y1="216" x2="540" y2="216"/><line x1="120" y1="260" x2="540" y2="260"/><line x1="120" y1="304" x2="540" y2="304"/>
</g>
<g font-size="22" text-anchor="middle">
<text x="150" y="72">い</text><text x="210" y="72">ろ</text><text x="270" y="72">は</text><text x="330" y="72">に</text><text x="390" y="72">ほ</text><text x="450" y="72">へ</text><text x="510" y="72">と</text>
<text x="150" y="116">ち</text><text x="210" y="116">り</text><text x="270" y="116">ぬ</text><text x="330" y="116">る</text><text x="390" y="116">を</text><text x="450" y="116">わ</text><text x="510" y="116">か</text>
<text x="150" y="160">よ</text><text x="210" y="160">た</text><text x="270" y="160">れ</text><text x="330" y="160">そ</text><text x="390" y="160">つ</text><text x="450" y="160">ね</text><text x="510" y="160">な</text>
<text x="150" y="204">ら</text><text x="210" y="204">む</text><text x="270" y="204">う</text><text x="330" y="204">ゐ</text><text x="390" y="204">の</text><text x="450" y="204">お</text><text x="510" y="204">く</text>
<text x="150" y="248">や</text><text x="210" y="248">ま</text><text x="270" y="248" font-weight="bold">け</text><text x="330" y="248" font-weight="bold">ふ</text><text x="390" y="248">こ</text><text x="450" y="248">え</text><text x="510" y="248">て</text>
<text x="150" y="292" font-weight="bold">あ</text><text x="210" y="292" font-weight="bold">さ</text><text x="270" y="292">き</text><text x="330" y="292">ゆ</text><text x="390" y="292">め</text><text x="450" y="292">み</text><text x="510" y="292">し</text>
<text x="150" y="336" font-size="22" dy="-8">ゑ</text><text x="210" y="336" dy="-8">ひ</text><text x="270" y="336" dy="-8">も</text><text x="330" y="336" dy="-8">せ</text><text x="390" y="336" dy="-8">す</text>
</g>
<g fill="none" stroke="currentColor" stroke-width="2.4">
<rect x="242" y="218" width="56" height="40" rx="3"/><rect x="302" y="218" width="56" height="40" rx="3"/><rect x="122" y="262" width="56" height="40" rx="3"/><rect x="182" y="262" width="56" height="40" rx="3"/>
</g>
<text x="560" y="236" font-size="12">け 5-3, ふ 5-4</text>
<text x="560" y="280" font-size="12">あ 6-1, さ 6-2</text>
</svg>
<figcaption>Figure 8.5. The iroha poem written row by row into a seven-by-seven grid, 47 kana in 49 cells. The marked cells send "kefu asa" ("today, morning") as the pairs 5-3, 5-4, 6-1, 6-2. Drawn for this page: it is a reconstruction of the idea, not a surviving key.</figcaption>
</figure>

```python
# A cipher square on the iroha poem: 47 kana, each used once, in a 7 by 7 grid.
# Each kana is sent as its row and column. This is a sketch of the idea the sources
# attribute to Uesugi Kenshin's camp; no real key survives.
poem = "いろはにほへとちりぬるをわかよたれそつねならむうゐのおくやまけふこえてあさきゆめみしゑひもせす"
grid = [poem[i:i + 7] for i in range(0, len(poem), 7)]
for row in grid:
    print(" ".join(row))
print("kana:", len(poem), "all different:", len(set(poem)) == len(poem))

where = {}
for r, row in enumerate(grid, 1):
    for c, kana in enumerate(row, 1):
        where[kana] = (r, c)

def encode(text):
    return [where[k] for k in text]

def decode(pairs):
    return "".join(grid[r - 1][c - 1] for r, c in pairs)

secret = encode("けふあさ")           # "kefu asa": today, morning
print(secret)
print(decode(secret))
```

Output:

```
い ろ は に ほ へ と
ち り ぬ る を わ か
よ た れ そ つ ね な
ら む う ゐ の お く
や ま け ふ こ え て
あ さ き ゆ め み し
ゑ ひ も せ す
kana: 47 all different: True
[(5, 3), (5, 4), (6, 1), (6, 2)]
けふあさ
```

What are the grounds for the Kenshin story? Thin. The tale is told in later military writing, and I could not find a source near his own time. One survey of Japanese cryptology finds no sign of codebreaking in Japan before the late nineteenth century, and the story is a leading example of a method attributed to a famous man because the method fits his reputation. Accounts of the grid differ (one fills the row and column headers with the last fourteen letters of the poem), so the square in Figure 8.5 is only one way to build it. What we can say is that a square is as easy to build in Japanese as in Greek, and that nobody doubts a clever warlord could have thought of it. Computer scientists Sujith Ravi and Kevin Knight, in a paper of 2009, treated a Japanese syllable cipher as a machine-solving problem. The real start of Japanese codes and ciphers as a state affair came with the telegraph and the navy, which is [chapter 10](10-The-Telegraph.md) and [chapter 14](14-The-Rest-of-the-War.md).

!!! note "Life story: the iroha square"
    **Born:** the *iroha* poem is first recorded in the late 11th century and tradition credits the monk Kukai (774 to 835); the cipher square is said to have been used in the 1500s by the camp of Uesugi Kenshin (1530 to 1578) · **Purpose:** to send each of 47 syllables as a row and a column, if it was used at all · **Helped:** nobody that can be shown; a popular example of Japanese cryptography · **Status:** a reconstruction; no surviving key or ciphered message is known to me

### Korea: letters the king wanted burned

King Jeongjo of Joseon (reigned 1776 to 1800) is remembered as a reformer who founded a royal library, the Gyujanggak, and as a king whose father, Crown Prince Sado, had died in 1762 in a quarrel with the court. In the last years of his life he ran part of his politics through private letters. About three hundred of them were sent between August 1796 and June 1800 to Sim Hwan-ji, the head of the Byeokpa faction, a group that had been on the other side in the old quarrel. They were published in 2009 by the Academy of East Asian Studies at Sungkyunkwan University; reports give 295 or 297 letters, and I use "about three hundred." Jeongjo asked more than once that the letters be burned. Sim did not burn them, and he kept a book of his own answers.

According to Korean press reports of the publication, the king "sometimes used secret codes" in them. I looked for a description of the codes and found none. What the letters show is a king working around his own court. He needed a faction leader's help and could not ask for it through the official record, and he trusted a rival to destroy what he wrote. Historians differ on what the letters mean: one reading is of a reformer smoothing the work of government, the other of a schemer. The cryptographic lesson is the old one. The weak point in a secret correspondence is the recipient, who may keep what he is told to destroy and keep it as insurance. The letters survive because Sim Hwan-ji did not trust the king as much as the king trusted him.

The Joseon state had other answers to the problem of secure messages, and they were institutions. Its **beacon system** (*bongsu*) ran hilltop fires from the coast and the northern border to a station on Namsan in Seoul, with fire by night and smoke by day. The usual account gives five levels, from one beacon for quiet to five for the start of a battle: Polybius's torches in a different country, a fixed list of messages and no letters. The **secret royal inspector** (*amhaeng eosa*), who toured the provinces in disguise, is described, as I understand it, as carrying a sealed order opened only at a set place and a horse tablet that proved his rank, a seal and a token like the Chinese tally. I give both from general accounts and have not checked them against a source on Joseon administration.

!!! note "Life story: King Jeongjo's secret letters"
    **Born:** written between August 1796 and June 1800 by King Jeongjo (1752 to 1800) to Sim Hwan-ji (1730 to 1802), a minister and faction leader · **Purpose:** to manage factional politics outside the official record, with the request that the letters be burned · **Helped:** historians of Joseon politics, when about three hundred letters were published in 2009; the codes the press mentions are not described in any source I found · **Status:** the letters survive because the recipient kept them; whether the "codes" were ciphers or private nicknames is unknown to me

## 8.10 The Ottoman Empire: a cipher follows the embassy

*Level: intermediate.*

The Ottoman Empire, for most of its history the neighbor and rival of every European power from Venice to Russia, took up ciphers late and for a reason that [chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) already told about Italy. Permanent embassies breed ciphers. The Italian states had resident ambassadors from the fifteenth century on, and the ambassadors' dispatches created the demand for the nomenclator. The Ottomans did not keep resident ambassadors in European capitals until Sultan Selim III (reigned 1789 to 1807) began to send them in the 1790s. The sultan's envoys before that traveled for a purpose and came home.

The scholar who has opened this subject is Sedat Bingöl, working in the Ottoman archives. His article in *Cryptologia* in 2022, "Methods for encryption in early 19th-century Ottoman diplomatic correspondence," traces the effort from 1797, when the new embassies began sending ciphered reports home. An abstract of the article states, in a sentence that is a good summary of the whole case, that Ottoman cryptography "did not officially exist in the Ottoman State" and emerged with the growth of a diplomatic bureaucracy in the nineteenth century. The effort faltered after 1811, when ambassadors were recalled and lower-ranking chargés d'affaires carried on, and picked up again after 1834, when ambassadors went back to the European capitals. For about half a century the ciphers were simple substitutions with one alphabet, which Bingöl's keywords call "ambassador ciphers," and by the second half of the nineteenth century, large nomenclators (code books) had grown up and **special-purpose** codes were assigned to particular tasks. A second article in *Cryptologia* follows the changes from 1811 to 1877, and a Turkish study of a pasha from Serez, Yusuf Pasha, describes a system with two keys and a fractional code, from an abstract that is all I have seen. The telegraph, which reached the empire in the 1850s, made the question urgent.

This is what the Italian story did three hundred years earlier, with the same steps in the same order: the embassy, the one-alphabet cipher that any clerk can learn, the break by the other side's secretaries, the nomenclator, the code book. The Ottomans did not lack the idea. For most of their history they lacked the institution that gives the idea a use, and when it came, the idea followed.

A last note on Ottoman writing that is not cipher. Ottoman clerks used scripts that were hard to read on purpose or by habit. *Siyakat*, as I understand it, was a shorthand of the finance offices, built from abbreviated Persian number words, in which the clerk's skill made a ledger hard to alter and hard to read for a stranger. *Divani* was the ornate hand of the imperial council, whose flourishes were hard to forge and hard to copy. These are best understood as guild skills and defenses against forgery, which is **authentication**, the job the Chinese tally did. They are not secrecy in the sense of §8.1. I give them as a general account, and a reader who needs precise dates should go to a history of Ottoman paleography.

!!! note "Life story: Ottoman diplomatic ciphers"
    **Born:** 1797, in the reports of Selim III's new permanent embassies, as traced by Sedat Bingöl in the Ottoman archives · **Purpose:** to protect ambassadors' reports to Istanbul · **Helped:** the empire's diplomacy through the 19th century; one-alphabet ciphers for about fifty years, then nomenclators and special-purpose codes · **Status:** studied from archives since the 2020s; the records are in Istanbul, and much is still to be read

## 8.11 In the real world: what each case teaches

*Level: intermediate.*

Here is each method of the chapter with the attack on it, in the manner of the earlier chapters. The word "broken" has to be read carefully, because for several of these there is nothing to break.

| Method | Broken today? | The attack in plain words |
|---|---|---|
| Liu Tao tallies | at once, by anyone with the book | A code of eight rods. The meanings are printed in the text, so the only protection is that an enemy has not read it, or that the correspondents changed the table. |
| Three-part letter | by capturing any piece, in part | Each piece is a third of the plain words and leaks. All three pieces together give the whole. |
| Tiger tallies | not a secrecy method | They prove who sent an order. The attack is theft or forgery of a half. |
| Song poem code | with the list, at once; without it, by watching events | Forty stock messages. The list was printed in an encyclopedia, and the marks repeat. |
| Ascribed sound code | with the two poems and the dialect, at once | A spelling in numbers: the same syllable always gets the same pair. Count the pairs. |
| *Fanqie* languages | by anyone who learns the rule | A fixed rule applied to each syllable. They kept out outsiders, not insiders. |
| Split-character poems | by anyone who thinks to take the characters apart | A riddle; the solving is the game. |
| *Kama Sutra* swaps | in minutes | A fixed reciprocal table, or a pairing of letters; count letters. |
| Persian *mu'amma* and chronograms | not attacks at all | A riddle, a sum. The reader is meant to solve it. |
| Khipu | not a cipher | Unread, but not hidden: the numbers can be read, and the rest is a decipherment problem. |
| Nsibidi | by initiation | The signs can be learned; the protection is who is allowed to learn. |
| Wax and gold | not an attack | The listener is meant to hear two meanings. |
| *Iroha* square | at once | Polybius's square with kana: count the number pairs. |
| Ottoman one-alphabet ciphers | in hours | A simple substitution. Count letters. |
| Ottoman nomenclators | with captured traffic | A code book with signs for names and common words; read them in context. |

The table makes the chapter's main point from the other side. Ten of these fifteen are not attacks on a cipher in any ordinary sense: they are codes, riddles, tokens, memberships or double meanings. A history that follows only the alphabet ciphers has little to say about most of the world, because most people were solving different problems.

### Six things the cases teach

**The script shapes the secret.** Chinese had no alphabet to shift, so Chinese secrecy was built from other things: lengths of wood, a poem as an index, the sounds of syllables, the parts of characters. Sanskrit and Arabic and Persian, with letters that double as numbers, produced riddles and sums. Japanese, with a syllabary in which one poem uses each sign once, produced a square. The method that fits the writing is the method that grows. This is also why the shift cipher, so easy in Latin, shows up in Greece, Rome and Baghdad and hardly anywhere else.

**A state that needs to say a few things uses a code.** The tallies, the poem code and the Joseon beacons all handle the same situation: a small, known set of urgent messages that must cross a hostile distance. A code is the right tool, because it is fast, simple and needs no scripts. Its limit is that it can only say what someone foresaw, which Polybius had noticed about the rod of Aeneas ([chapter 3](03-Greece-and-Rome.md)).

**An institution can replace a cipher.** The Chinese locked boxes, the Mongol relays and tablets, the Inca runner and the Korean sealed orders all protect a message by controlling who handles it. When a state owns the road, it can skip the cipher. When it does not, as the Ottomans found when they put embassies in other people's cities, the cipher comes.

**A secret kept by membership cannot be a document.** Nsibidi, the *fanqie* languages, the initiated reader of a mu'amma and the khipu-keeper all depend on people. They leave thin records, because the people did not write the secret down, and what exists was written by outsiders, later, or by linguists who happened to be there. This is why the thin record of §8.1 is a feature of the subject, not only of the sources.

**The weak point is a person.** The *Liu Tao* prescribes death for a courier who leaks, the *Arthashastra* worries more about counsel than about script, and King Jeongjo's letters survive because the man who received them kept them. This is the second thread of the whole book, in a different century each time.

**A legend is cheaper than a document.** The mooncake plot, the Russian-letter code of the Qing princes, the Kenshin square, the "Templar cipher" of chapter 5 all spread because they are good stories. They fail the same test, which is to ask which rung of the ladder in §8.1 each stands on, and what the earliest source is.

### The people the record keeps

[Chapter 1](01-Why-People-Hid-Writing.md#14-who-wanted-to-hide-what) said that the people who most need a lock are the ones with least power, and that their records are thin. This chapter finds a few of them by name. The *Kama Sutra*'s list of arts is addressed to women, and secret writing is on it. Lady Hyegyeong wrote her memoirs in hangul. The record of the khipu owes a great deal to Marcia Ascher, who with Robert Ascher found that cords sum, and to Sabine Hyland and Carrie Brezine in our own century. Tatiana Proskouriakoff broke the Maya inscriptions by counting. Lydia Cabrera sat with the Abakuá and recorded their signs when almost no one else would. They are not codebreakers in the old military sense. They are the people who did the work of reading what others kept, and the history is shorter without them.

## 8.12 Going deeper

*Level: expert.*

**The historiography.** David Kahn's *The Codebreakers* (1967; revised 1996) gave the non-Western world a few pages, as it gave the medieval West: the *Kama Sutra*, a mention of Kautilya and the Sasanian script, a paragraph on China and the telegraph. It was a book from its time and could not have used what had not been published. Since then the picture has changed in two ways, and both are visible in this chapter. First, scholars working in Chinese, Turkish and Persian have found texts and archives that the earlier books did not use: Klaus Flessel's studies of Chinese secret codes (1979, 1982), David August's two articles on Chinese manual cryptosystems in *Cryptologia* (1989, 1990), Behr's survey, Bingöl's work on Ottoman archives, Bosworth's entry on Persian codes. Second, the questions have changed: not only *who first invented a cipher* but *what problem was this people solving*. Much of the best work is in languages most English readers cannot use, and I cannot check most of it, so this chapter's footing is lower than the others'. When a figure comes from a summary, the sentence says so.

**What the small codes can say, in numbers.** A code has a **message space**, the set of things it can say. Eight tallies carry $\log_2 8 = 3$ bits each; the forty messages of the poem code carry $\log_2 40 \approx 5.32$ bits. A key for a code is a choice of which meaning goes with which token. If the correspondents may reorder the eight tallies, there are $8! = 40{,}320$ tables, a key of about 15 bits. If they may reorder the forty messages against the poem's characters, there are $40!$ tables, about $2^{159}$, a number that cannot be searched. But nobody can remember a random permutation of forty things, which is why the poem is there: it supplies the order from memory and thereby fixes the table. A key a person can remember is a key a person can lose, and the usual tradeoff of all cipher design is here at its plainest. The numbers below also give the pairings of a reciprocal alphabet.

```python
# What the small codes of this chapter can say, in bits, and how many keys they could have.
import math
print("8 tallies carry", math.log2(8), "bits each")
print("40 poem-code messages carry", round(math.log2(40), 2), "bits each")
print("ways to reorder the 8 tallies:", math.factorial(8))
print("ways to reorder the 40 messages:", math.factorial(40))
print("bits in that key:", round(math.log2(math.factorial(40)), 1))
# Pairing up 26 letters so each swaps with a partner: 25 x 23 x 21 x ... x 1.
pairings = math.prod(range(25, 0, -2))
print("reciprocal pairings of 26 letters:", pairings)
print("all substitutions of 26 letters  :", math.factorial(26))
print("seven yes/no choices make", 2 ** 7, "signs")
```

Output:

```
8 tallies carry 3.0 bits each
40 poem-code messages carry 5.32 bits each
ways to reorder the 8 tallies: 40320
ways to reorder the 40 messages: 815915283247897734345611269596115894272000000000
bits in that key: 159.2
reciprocal pairings of 26 letters: 7905853580625
all substitutions of 26 letters  : 403291461126605635584000000
seven yes/no choices make 128 signs
```

The last line is Urton's count of khipu signs from seven binary features, $2^7 = 128$, set against Hyland's 95 signs observed at Collata. The two numbers are in the same range, which is what you would expect if both are describing a script-like system and not an accident, but that is a hint, not a proof. A khipu with only 95 observed signs is also too small a sample to decide.

**Sharing and leaking.** The *Liu Tao*'s three pieces and the random split of §8.2 are both "3-of-3" schemes, but they differ in what a partial set reveals. With random shares, any two parts are independent of the message, which is the perfect-secrecy property of [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md). With plaintext fragments, two thirds of the words are two thirds of the message, and because language is redundant even one third narrows the guesses a great deal ([Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) works the unicity distance).

**Reciprocity.** A reciprocal substitution is a permutation $\pi$ with $\pi\circ\pi = \mathrm{id}$, built only of fixed points and two-element swaps. The number with no fixed point on 26 letters is $25!! = 25 \cdot 23 \cdots 3 \cdot 1$, the 7,905,853,580,625 above. Yashodhara's table has fixed points, so it is a smaller family still, and any reciprocal cipher carries a structure the attacker may use, as Enigma's did.

**Dating.** The dates in this chapter come from very different kinds of evidence. The *Wujing Zongyao*'s 1044 is a printed compilation date; the *Liu Tao*'s "400 to 220 BC" is an argued range for a text that was probably built up, with the 1970s tomb fragments putting a floor under it; the *Kama Sutra*'s second to fourth century is an estimate from the text's references; Yashodhara's "thirteenth century" is itself disputed, with some summaries giving the tenth to the thirteenth; Nsibidi's "about 1900" is the date of the first outside notice and says nothing about when the signs began. A careful reader asks, for each date, what kind of date it is.

**Open questions.**

- Did Song officers use the poem code, and was the secret the poem, the list's order, or both? The sources I have are summaries; a reading of the 1044 text, and of any later Song or Ming discussion, would settle part of this.
- Did anyone ever send a message in the sound code ascribed to Qi Jiguang? A message, in the dialect, in numbers, would be a considerable find.
- Were there Safavid or Mughal ciphers before the nineteenth century, or only riddles and relays? A search of the chancery archives for ciphered letters, of the kind suggested for the Mamluks in [chapter 4](04-Baghdad-and-Cairo.md), has not, as far as I know, been made.
- What are the "secret codes" in King Jeongjo's letters? The letters are published; a study of their wording would say whether they are nicknames or something more.
- Do the Collata khipus record names phonetically? More khipus that can be tested against documents are needed.
- Is there an Ethiopian or East African tradition of secret writing that the record does not show? I do not know of one.

## Check yourself

??? question "1. A Qin tiger tally was split in two, one half with the ruler and one with a commander. Which job did it do: hide a message, prove who sent it, or carry it? What is its weak point?"

    It proved who sent the order, which is authentication. It hid nothing, and it carried nothing. Its weak point is theft: whoever holds the other half has the authority, which is the weakness of any bearer token.

??? question "2. The *Liu Tao* says the secret letter is divided into three pieces and carried by three people. Why is that not a secret in the modern sense, and what is its second weakness?"

    Each piece is a third of the actual words, so each piece leaks part of the plain text. Modern secret sharing makes every share individually worthless. The second weakness is that all three pieces are needed, so if one messenger is killed the letter is lost.

??? question "3. How many different messages can the Liu Tao's eight tallies send, and how many bits is that per tally?"

    Eight messages, which is $\log_2 8 = 3$ bits per tally. A courier can carry several tallies, but each one says only one of eight things.

??? question "4. Using the poem in Figure 8.3, which characters would an officer mark to send message 14, \"request more troops,\" and message 26, \"enemy advances\"?"

    The fourteenth character is 濺 (the fifth character of the second line's first half: 感, 時, 花, 濺 are 11 to 14), and the twenty-sixth is 家 (line three: 烽 21, 火 22, 連 23, 三 24, 月 25, 家 26).

??? question "5. Why must the poem in the poem code contain no repeated character?"

    A seal beside a repeated character would be ambiguous: the receiver could not tell which of two positions, and so which of two messages, was meant. A poem of forty different characters gives forty unambiguous labels that two people can hold in memory.

??? question "6. The Muladeviya swap turns *nagara* into *mkhgkhṣkh*. How do you get *nagara* back, and why does that work?"

    Apply the same swap again. A reciprocal cipher pairs letters so that each swaps with a partner, and swapping twice restores the original; it is an involution, $\pi\circ\pi = \mathrm{id}$.

??? question "7. A khipu cord has three single knots in the hundreds cluster, no knots in the tens, and a figure-eight knot in the units. What number does it read? And what does an empty place mean?"

    301. Three hundreds, no tens, and the figure-eight knot stands for 1 in the units. An empty place means zero: the gap is the zero, which is how the Inca system had a zero without a sign for it.

??? question "8. Why is the khipu not a cipher, even though most of it cannot be read today? Use the three tests of Chapter 1."

    The tests ask whether there is a text, whether the writer meant to hide it, and whether there is a rule that reads it. The khipu has records and, for the numbers, a rule that reads them, but its makers were keeping accounts for each other, not hiding anything from an enemy, so it fails the second test. Reading it is a decipherment problem, the recovery of a lost script, and not decryption.

??? question "9. The chronogram *khak-e mosalla* adds up to 791 in abjad. Add it yourself: خ = 600, ا = 1, ک = 20, م = 40, ص = 90, ل = 30, ی = 10."

    خاک is 600 + 1 + 20 = 621, and مصلی is 40 + 90 + 30 + 10 = 170. Together 621 + 170 = 791, the Muslim year given for the death of the poet Hafez of Shiraz.

??? question "10. The Ottomans began to use ciphers in their diplomatic mail in 1797 and not much earlier. Using Chapter 6's account of Italy as a guide, say why."

    Ciphers followed permanent embassies. The Italian states had resident ambassadors from the fifteenth century and their dispatches created the demand for nomenclators. The Ottomans sent envoys for a purpose and brought them home, and did not keep resident ambassadors in Europe until Selim III's embassies of the 1790s. The institution that gives a cipher a use came first, and the cipher followed.

## What you learned

- Where the script has no alphabet to shift, secrecy takes other forms. In China these were codes (the eight tallies of the *Liu Tao*, about 400 to 220 BC; the forty-message poem code of the *Wujing Zongyao*, 1044), splitting (the three-part letter), proof by matching halves (tiger tallies), a spelling by sounds (the code ascribed to Qi Jiguang) and riddles on the parts of characters.
- A code can say only what was foreseen, and a list of meanings printed in a book is a weak secret. The three-part letter leaks because each piece is part of the plain text; modern secret sharing fixes that.
- The *Kama Sutra* names secret writing among sixty-four arts, and a commentary of the thirteenth century describes two simple methods, one of them a reciprocal swap. The *Arthashastra* is more concerned with leaks of counsel than with scripts.
- Persia has a late-written "secret script" of the Sasanians, a poetry of riddles that hide names and a chronogram habit built on abjad sums, and a first printed book on ciphers in 1865. Safavid and Mughal ciphers are not shown by anything I could find.
- The khipu and Maya writing are decipherment problems and not ciphers: their makers were not hiding anything. Proskouriakoff's 1960 paper broke the Maya inscriptions by counting.
- Nsibidi in West Africa is kept secret by initiation, and travelled to Cuba in the Abakuá society; Ethiopian wax-and-gold poetry keeps a message deniable by giving it two meanings.
- Japan's iroha square is a reconstruction with no surviving key, King Jeongjo's letters were saved by the man who was told to burn them, and the Ottomans took up ciphers when they set up embassies, three centuries after the Italians.
- A legend is cheaper than a document; each case is worth testing by asking which rung of the evidence it stands on.

**Next:** [Chapter 9](09-Queens-Spies-and-Black-Chambers.md), where Europe's courts, and a queen's last letters, come back into view.

## Further reading

- Wolfgang Behr, "Ciphering Classical Chinese" (lecture slides, CQT Colloquium, National University of Singapore, 5 February 2009): the texts of the *Liu Tao* chapters 24 and 25 in Chinese and English, the forty-message list of the *Wujing Zongyao*, the sound code ascribed to Qi Jiguang, the split-character poems and the *fanqie* codes. Most of the Chinese material in this chapter comes from here.
- Ralph D. Sawyer (trans.), *The Seven Military Classics of Ancient China* (Westview, 1993) and *The Six Secret Teachings on the Way of Strategy* (Shambhala, 1997). Volker Strätz, *Luh-t'ao: ein spätantiker Text zur Kriegskunst* (Bock und Herchen, 1979).
- Klaus Flessel, "Geheimkodes bei der Nachrichtenübermittlung im historischen China", in *Ch'en-yüeh-chi: Tilemann Grimm zum 60. Geburtstag* (Attempto, 1982). David A. August, "Cryptography and Exploitation of Chinese Manual Cryptosystems", *Cryptologia* 13, no. 4 (1989) and 14, no. 1 (1990).
- Zhao Yuanren (Y. R. Chao), "Fanqieyu ba zhong" (eight kinds of fanqie languages), *Bulletin of the Institute of History and Philology* 2, no. 3 (1931), pp. 312 to 354 (Behr's slides give 1934; the Institute's own catalogue gives 1931).
- Vatsyayana, *Kama Sutra*, translated by Richard Burton and F. F. Arbuthnot (Kama Shastra Society, 1883) and by Wendy Doniger and Sudhir Kakar (Oxford World's Classics, 2002), book 1, chapter 3; Yashodhara's *Jayamangala* on the same passage.
- Kautilya, *Arthashastra*: R. Shamasastry (1915), R. P. Kangle (1960 to 1965), Patrick Olivelle, *King, Governance, and Law in Ancient India* (Oxford, 2013), the last with the case for a first-centuries-AD date.
- C. E. Bosworth, "Codes", *Encyclopaedia Iranica* (1992). Ibn al-Nadim, *Fihrist* (987), on the Persian scripts, and the *Encyclopaedia Iranica* on Sasanian scripts.
- Leland L. Locke, *The Ancient Quipu or Peruvian Knot Record* (American Museum of Natural History, 1923). Marcia and Robert Ascher, *Code of the Quipu* (University of Michigan Press, 1981). Gary Urton, *Signs of the Inka Khipu* (University of Texas Press, 2003). Frank Salomon, *The Cord Keepers* (Duke University Press, 2004). Sabine Hyland, "Writing with Twisted Cords: The Inscriptive Capacity of Andean Khipus", *Current Anthropology* 58, no. 3 (2017).
- Tatiana Proskouriakoff, "Historical Implications of a Pattern of Dates at Piedras Negras, Guatemala", *American Antiquity* 25 (1960). Michael D. Coe, *Breaking the Maya Code* (Thames and Hudson, 1992).
- P. Amaury Talbot, *In the Shadow of the Bush* (1912), and J. K. Macgregor, "Some Notes on Nsibidi", *Journal of the Royal Anthropological Institute* 39 (1909); Elphinstone Dayrell's articles on Nsibidi signs (1910 and 1911). Lydia Cabrera, *La sociedad secreta Abakuá* (Havana, 1958). Donald N. Levine, *Wax and Gold: Tradition and Innovation in Ethiopian Culture* (University of Chicago Press, 1965).
- Sujith Ravi and Kevin Knight, "Probabilistic Methods for a Japanese Syllable Cipher" (2009). The Academy of East Asian Studies, Sungkyunkwan University, edition of King Jeongjo's letters to Sim Hwan-ji (2009). *The Memoirs of Lady Hyegyŏng*, translated by JaHyun Kim Haboush (University of California Press, 1996).
- Sedat Bingöl, "Methods for encryption in early 19th-century Ottoman diplomatic correspondence", *Cryptologia* 46, no. 6 (2022), pp. 498 to 524, and "The changes in Ottoman diplomatic cryptography and its methods during the 19th century (1811 to 1877)", *Cryptologia* (2022 or 2023, by different listings).
- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996), for the survey the newer work corrects. Related chapters: [Chapter 3](03-Greece-and-Rome.md) for Polybius's square and the torches, [Chapter 4](04-Baghdad-and-Cairo.md) for the abjad and the Arabic tradition, [Chapter 10](10-The-Telegraph.md) for the Chinese telegraph code, [Advanced protocols, chapter 2](../advanced/02-Secret-Sharing.md) for secret sharing.
- *Weaker sources, named so you can check them:* summaries and slides, not the full texts, for the *Wujing Zongyao* list (Behr's slides; I have not seen the 1044 text), for Bosworth's Iranica entry (a search summary), for the Persian riddle genre and Sharaf al-Din 'Ali Yazdi (a summary of an article on a fifteenth-century Persian letter), for Yashodhara's nine pairs (a modern summary of the commentary), for Hyland's reading of the Collata khipus (university news and magazine reports), for the Third Council of Lima decree (summaries of the text), for Nsibidi (summaries of Macgregor, Dayrell and Talbot, and popular articles), for King Jeongjo's letters (*Korea Times* and *Korea JoongAng Daily* reports), and for Bingöl's articles (abstracts only). From memory, without a checked source: the Warring States length of a *chi* (about 23 cm), the wording of the Qin tiger-tally inscriptions, the Qing palace-memorial boxes, the Mongol *yam* and *paiza*, the Joseon beacon levels and the sealed orders of the secret royal inspector, the *siyakat* and *divani* scripts, Burton's phrasing of the sixty-fourth art, Abu'l-Fazl's account of the Mughal runners, and Urton's "one third" of non-decimal khipus.
