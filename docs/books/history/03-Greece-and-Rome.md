# 3. Greece and Rome

*A Persian prisoner shaves a slave's head and writes on the skin. A Spartan general wraps a strip of leather around a rod. A Greek engineer lets water run out of a jar to tell a city that cavalry are coming. A Roman general moves every letter three places along the alphabet. This chapter tells how the Greek and Roman worlds, from about 500 BC to about AD 200, sent messages across hostile ground, who the people were, what the surviving writers say they did, and how much of it was ever a cipher at all. You will hide a message in a book the way Aeneas Tacticus suggested, signal a word with torches in Polybius's grid, unwind a skytale without knowing the rod, and break Caesar's shift on the alphabet Caesar actually used.*

!!! abstract "In this chapter"
    **You will learn:**

    - why the Greeks and Romans mostly hid messages, or agreed their meaning beforehand, instead of scrambling them;
    - who told us about each method (Herodotus, Thucydides, Aeneas Tacticus, Polybius, Plutarch, Suetonius, Aulus Gellius), when they wrote, and how far to trust them;
    - how Polybius's square turns a letter into two small numbers, and why that idea outlived Greece by 2,000 years;
    - what the skytale was, why a classicist called it a myth, and why that argument is still open;
    - how Caesar's and Augustus's shifts work on the Latin alphabet of their day, and why nobody is known to have broken either;
    - why weak methods protected messages anyway, and what that tells us about the later history.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) for the words steganography, code and cipher, and the idea of a key; [book 1, chapter 2](../../book/02-Classical-Ciphers.md) for the shift cipher in modern terms. Ancient Greek is not needed; the Greek letters in the code are only labels.

    **Levels:** §3.1 to §3.4, §3.7 and §3.8 are for beginners, §3.5, §3.6 and §3.9 are intermediate, §3.10 is expert.

## 3.1 The problem
*Level: beginner.*

In the winter of 54 BC, at the edge of the Roman world in what is now Belgium, a legion sat inside a camp that was running out of time. Quintus Cicero, the younger brother of the orator, commanded it. The Nervii, a Gallic people, had surrounded the camp with a very large force, and they had learned something useful in the first days of the siege: every messenger who left the camp could be caught. Julius Caesar, writing about it later, says the captured men were tortured in full view of the walls. Quintus Cicero could not get a word out. Caesar, a few days' march away with his own legions, could not get a word in.

When Caesar finally wrote a reply, he did what every commander in that position wanted to do. He wrote it in Greek letters, so that the Gauls, if they caught the courier, could not read it. Then he told the messenger what to do if he could not get close: tie the letter to a javelin and throw it over the wall. The man did exactly that. The javelin stuck in a tower of the camp, and for two days nobody noticed it.

That is the problem of this chapter, and of the first twenty-five hundred years of secret writing. A message has to cross ground that someone else controls. The courier may be stopped, searched, bribed, or tortured. The writing may be read in the middle. The man who carries it is often the weakest link: he may not understand it, he may lose it, he may sell it. The people who did the sending were generals, kings, city councils and a few worried individuals, and they had four ways to protect a message, which this chapter meets one after another.

- **Hide it.** If the courier is searched and nothing is found, nothing is lost. Herodotus tells four stories of this kind (§3.2), and Aeneas Tacticus collects a whole list (§3.3).
- **Agree its meaning in advance.** A torch, a mark on a rod, a watchword. This is a code, and it needs no secret writing at all (§3.4, §3.5, §3.8).
- **Scramble the letters.** The skytale and the shifts of Caesar and Augustus (§3.6, §3.7). Of everything in the chapter this is the smallest part, and the part we know least about.
- **Seal it and trust the carrier.** Most real letters in the ancient world were protected by none of the above. They were rolled, tied, sealed with wax and a signet ring, and put in the hands of a slave or a friend (§3.7, §3.8).

### Who tells us

We know all this because later writers put it on paper, and they are not equal witnesses. Figure 3.1 puts the events and the writers on one line. **Herodotus**, writing about 430 BC, gives us the oldest hidden-message stories, but he heard most of them second-hand and he loves a good tale. **Thucydides**, a generation later, is a harder historian and a better source for what ordinary military practice was. **Aeneas Tacticus** wrote a manual around the 350s BC for the commander of a besieged city. It is the first book we have that collects methods of secret communication on purpose, and it is the one text in this chapter that was written by a person who actually thought about the problem.

**Polybius**, in the 100s BC, describes the best signaling system of the Greek world and a Roman camp's watchword routine. The skytale and Caesar's shift reach us from **Plutarch**, **Aulus Gellius** and **Suetonius**, who wrote between about AD 100 and AD 180, five and six hundred years after the Spartan staff and a century and a half after Caesar's death. Their reports are what we have, and whenever one of them tells a detail that no earlier writer mentions, the right response is interest, not belief.

<figure class="mars-fig">
<svg viewBox="0 0 640 316" width="640" role="img" aria-label="Timeline of the Greek and Roman material in this chapter from the 600s BC to about AD 120" fill="currentColor" font-size="14">
<line x1="104" y1="8" x2="104" y2="308" stroke="currentColor" stroke-width="1.6"/>
<text x="92" y="31" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="0.6">600s BC</text>
<circle cx="104" cy="26" r="3.5" fill="currentColor" fill-opacity="0.6"/>
<text x="120" y="31" font-size="14" text-anchor="start" fill-opacity="0.6">Archilochus uses the word skytale (no cipher in it)</text>
<text x="92" y="57" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="1">499 BC</text>
<circle cx="104" cy="52" r="4.5" fill="currentColor" fill-opacity="1"/>
<text x="120" y="57" font-size="14" text-anchor="start" fill-opacity="1">Histiaeus's slave carries a message on his scalp</text>
<text x="92" y="83" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="1">480 BC</text>
<circle cx="104" cy="78" r="4.5" fill="currentColor" fill-opacity="1"/>
<text x="120" y="83" font-size="14" text-anchor="start" fill-opacity="1">Demaratus's blank wax tablet; Gorgo reads it</text>
<text x="92" y="109" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="1">c. 470 BC</text>
<circle cx="104" cy="104" r="4.5" fill="currentColor" fill-opacity="1"/>
<text x="120" y="109" font-size="14" text-anchor="start" fill-opacity="1">Sparta recalls Pausanias with a skytale (Thucydides)</text>
<text x="92" y="135" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="0.6">c. 430 BC</text>
<circle cx="104" cy="130" r="3.5" fill="currentColor" fill-opacity="0.6"/>
<text x="120" y="135" font-size="14" text-anchor="start" fill-opacity="0.6">Herodotus writes down these stories</text>
<text x="92" y="161" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="1">413 BC</text>
<circle cx="104" cy="156" r="4.5" fill="currentColor" fill-opacity="1"/>
<text x="120" y="161" font-size="14" text-anchor="start" fill-opacity="1">Night battle at Syracuse: the watchword fails</text>
<text x="92" y="187" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="0.6">350s BC</text>
<circle cx="104" cy="182" r="3.5" fill="currentColor" fill-opacity="0.6"/>
<text x="120" y="187" font-size="14" text-anchor="start" fill-opacity="0.6">Aeneas Tacticus writes the siege manual</text>
<text x="92" y="213" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="0.6">c. 150 BC</text>
<circle cx="104" cy="208" r="3.5" fill="currentColor" fill-opacity="0.6"/>
<text x="120" y="213" font-size="14" text-anchor="start" fill-opacity="0.6">Polybius describes torches, jars and the camp watchword</text>
<text x="92" y="239" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="1">63 BC</text>
<circle cx="104" cy="234" r="4.5" fill="currentColor" fill-opacity="1"/>
<text x="120" y="239" font-size="14" text-anchor="start" fill-opacity="1">Catiline's letters seized; the seals give them away</text>
<text x="92" y="265" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="1">54 BC</text>
<circle cx="104" cy="260" r="4.5" fill="currentColor" fill-opacity="1"/>
<text x="120" y="265" font-size="14" text-anchor="start" fill-opacity="1">Caesar's letter in Greek letters, thrown on a spear</text>
<text x="92" y="291" font-size="14" text-anchor="end" font-weight="bold" fill-opacity="0.6">AD 100-120</text>
<circle cx="104" cy="286" r="3.5" fill="currentColor" fill-opacity="0.6"/>
<text x="120" y="291" font-size="14" text-anchor="start" fill-opacity="0.6">Plutarch and Suetonius write down skytale and shift</text>
</svg>
<figcaption>Figure 3.1. The chapter in order. Bold dots are events; pale dots are the dates when a surviving writer put the story on paper, which is how almost everything here reaches us.</figcaption>
</figure>

Two more limits matter. First, the sources are in Greek and Latin, written by educated men, mostly about war and politics. Women, slaves and the unlettered appear only when a man needed them: the slave with the tattooed scalp has no name in Herodotus, and the woman who solves the wax tablet is named only because she was a king's wife. Second, there is no ancient book on breaking secret writing. The word "cryptanalysis" has no ancient Greek or Latin ancestor, and the first written method for breaking a cipher comes from [Baghdad in the ninth century](04-Baghdad-and-Cairo.md). Everything in this chapter is about people who made messages hard to find or read, not people who tried to read them. When someone does read a message in these pages, it is because they found it, caught the courier, or recognized a seal.

### The roads and the couriers

It helps to picture how messages moved. The Persian Empire, which touches most of this chapter, had the best system in the world. Herodotus (5.52 to 54) describes the Royal Road from Sardis, near the Aegean coast, to the capital Susa: 111 relay stations and, he says, 450 parasangs, which a traveler on foot needed ninety days to cover. Faster messages went by a relay of mounted couriers (8.98), the passage from which the post office slogan about snow and rain is distantly descended. Greek cities, much smaller, relied on trained runners, heralds protected by custom, and slaves or friends.

Rome, much later, had no state post until Augustus set one up in the last decades BC. Suetonius (*Augustus* 49) says he first stationed young men at short intervals along the military roads, then switched to carriages, because a single carrier who traveled the whole way could be questioned about the situation on the spot. That is a security argument: the same man, start to finish, has a story to tell. Under the Republic, letters traveled with private slaves and friends. Cicero's letters to his friend Atticus are full of remarks that he will not say more because he does not trust the man carrying the letter. He and Atticus used nicknames and Greek words, which is as far as a worried Roman senator went in the way of secret writing, except for a few special cases that this chapter will get to.

## 3.2 Hidden messages: the stories in Herodotus
*Level: beginner.*

Herodotus was born in Halicarnassus on the coast of what is now Turkey, about 484 BC, a subject of the Persian king. He traveled through the eastern Mediterranean and the Black Sea, lived for a time in Athens, and, according to tradition, later joined a Greek colony in southern Italy. He wrote his *Histories*, the account of the wars between the Greeks and Persia, in the decades after 450 BC. He worked mostly from what people told him, and he says so when he is repeating what he was told. Four of the people in his book send hidden messages. In each case the secret is a trick, and it works until somebody thinks to look.

!!! note "Life story: Herodotus"
    **Born:** about 484 BC, Halicarnassus (now Bodrum, Turkey); died probably in the 420s BC · **Purpose:** to write down, as he put it, what people did, so that it would not be forgotten · **Helped:** history as a prose form; for this book, the oldest surviving stories of hidden messages (*Histories* 1.123, 5.35, 7.239, 8.128) · **Status:** read for 2,400 years; his stories about secret messages are taken as evidence that the practice was known, not as proof that each event happened exactly as told

### The tattooed slave

The first story belongs to the year 499 BC, at the start of the Ionian Revolt, the rising of the Greek cities of the Asian coast against Persia. Histiaeus had been tyrant of Miletus, one of the greatest of those cities. Darius, the Persian king, had called him to the court at Susa and kept him there, as an adviser and, in practice, as a hostage. His deputy at Miletus was his son-in-law Aristagoras.

Herodotus (5.35) says Histiaeus wanted a revolt in Ionia, because he thought the king would then send him down to the coast to put it out, and he would be free. But the roads were watched. He took his most trusted slave, shaved the man's head, tattooed the message on the scalp, and waited until the hair grew back. Then he sent the slave to Miletus with one spoken instruction: tell Aristagoras to shave your head and look at it. The revolt began and lasted six years. Histiaeus did get to the coast, and neither side trusted him afterward. The Persians killed him in 493 BC.

Nothing here is scrambled. The message was in plain Greek, on a part of the body no guard thought to check. This is **steganography**, and its strength and weakness are the same thing: the secret is that the message exists. It also cost months, since a man's hair takes that long to grow, which is why the method suits one letter, once, and never a conversation. The slave, who ran the risk, has no name in Herodotus.

### The blank tablet and Gorgo

The second story belongs to about 480 BC. Demaratus had been one of the two kings of Sparta, was deposed about ten years earlier, and had gone to live at the Persian court, where the Persian kings gave him land and honor. When Xerxes began to prepare the invasion of Greece, Demaratus decided that Sparta should know. Herodotus (7.239) tells it this way. Demaratus took a folding tablet of the kind Greeks used for notes, two wooden leaves with a layer of wax poured into each. He scraped the wax off, wrote the king's plan on the bare wood, and covered it again with fresh wax. A blank tablet drew no attention from the guards along the road. It arrived in Sparta, and nobody there could see what it was for.

The solution came from **Gorgo**, the daughter of King Cleomenes and the wife of King Leonidas. She told them to scrape the wax off, and they found the writing. The Spartans read it and passed it on to the other Greeks. Herodotus knows Gorgo from other stories: earlier he has her, as a girl of eight or nine, advise her father not to listen to a bribe (5.51). She is one of the very few women named in the Greek stories of hidden messages, and she is named for working out how a message was hidden.

!!! note "Life story: Demaratus's tablet and Gorgo"
    **Born:** the tablet, about 480 BC; Gorgo, about 508 BC (Herodotus gives her age as eight or nine in 499 BC), Sparta · **Purpose:** to warn Sparta of Xerxes's invasion without the guards finding out · **Helped:** the earliest well-known case of writing hidden under a surface; Gorgo is the first named person in the record to find a hidden message · **Status:** a story, not a document: some editors have thought 7.239 a later addition to the *Histories*, and Herodotus himself wonders whether Demaratus sent the warning out of goodwill or to gloat

### The hare and the arrows

Two shorter stories complete Herodotus's list. In 1.123 a Median nobleman named Harpagus plots with the young Cyrus against the Median king, and has to get a letter to him through a country watched at every road. He cuts open a hare, puts the letter inside, sews the animal up, and sends it with a trusted servant in the clothes of a hunter, carrying nets. Cyrus cuts the hare open and reads the letter.

In 8.128 the Persian general Artabazus is besieging Potidaea (480 to 479 BC), and a man inside the city, Timoxenus of Scione, is in secret contact with him. They wrap letters around the notched end of an arrow, put the feathers on over them, and shoot the arrow to a spot they have agreed. One day an arrow misses its mark and hits a man in the shoulder. A crowd gathers, finds the letter, and takes it to the generals of the defense. Herodotus adds that they read it, saw who the traitor was, and decided, out of regard for the good name of his city, not to accuse him.

The arrow story is the only one of the four that is a failure, and it fails for a reason that every later chapter repeats: the channel was fine and the process was careless. Nobody read the letter by breaking anything. An arrow fell in the wrong place.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Map drawn as boxes: two hidden messages leave Susa, one to Miletus in 499 BC and one to Sparta in 480 BC; the Royal Road joins Susa and Sardis" fill="currentColor" font-size="14">
<rect x="480" y="110" width="130" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="545" y="132" font-size="14" text-anchor="middle" font-weight="bold">Susa</text>
<text x="545" y="150" font-size="12" text-anchor="middle" fill-opacity="0.85">Persian court</text>
<rect x="30" y="30" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="52" font-size="14" text-anchor="middle" font-weight="bold">Sparta</text>
<text x="105" y="70" font-size="12" text-anchor="middle" fill-opacity="0.85">the ephors, Gorgo</text>
<rect x="30" y="200" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="105" y="222" font-size="14" text-anchor="middle" font-weight="bold">Miletus</text>
<text x="105" y="240" font-size="12" text-anchor="middle" fill-opacity="0.85">Aristagoras, Ionia</text>
<rect x="480" y="212" width="130" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="545" y="234" font-size="14" text-anchor="middle" font-weight="bold">Sardis</text>
<text x="545" y="252" font-size="12" text-anchor="middle" fill-opacity="0.85">Persian satrap</text>
<line x1="480" y1="125" x2="188.8" y2="61.9" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180.0,60.0 187.8,66.3 189.7,57.5" fill="currentColor"/>
<text x="400" y="52" font-size="12" text-anchor="middle">480 BC: blank wax tablet</text>
<text x="400" y="68" font-size="12" text-anchor="middle" fill-opacity="0.85">Demaratus warns Sparta of Xerxes</text>
<line x1="480" y1="160" x2="188.8" y2="223.1" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180.0,225.0 189.7,227.5 187.8,218.7" fill="currentColor"/>
<text x="340" y="262" font-size="12" text-anchor="middle">499 BC: shaved head, message on the scalp</text>
<text x="340" y="278" font-size="12" text-anchor="middle" fill-opacity="0.85">Histiaeus tells Aristagoras to revolt</text>
<line x1="545" y1="166" x2="545" y2="212" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="553" y="188" font-size="12" text-anchor="start">Royal Road,</text>
<text x="553" y="202" font-size="12" text-anchor="start" fill-opacity="0.85">111 stages</text>
<text x="30" y="312" font-size="12" text-anchor="start" fill-opacity="0.85">Boxes show who is who, not a scale map. Herodotus 5.35, 5.52-54 and 7.239.</text>
</svg>
<figcaption>Figure 3.2. Two famous hidden messages, both starting at the Persian court. Neither needed a cipher: the point was that nobody searching the courier knew what to look for.</figcaption>
</figure>

### What the four stories have in common

Look at Figure 3.2 and then back at the four stories.

1. **The carrier knows nothing, or less than he could.** The slave does not know what is on his own head. The messenger with the tablet does not know the wood is written on. A trusted man is useful, but a carrier who cannot tell what he carries cannot be forced to say. That idea comes back in every century.
2. **The cost is time, or a living animal.** None of the methods scales. A head, a tablet, a hare: one message each.
3. **The secret is the trick.** Everyone who knows the trick can look for it. After the Persians have caught one tattooed head, they shave every head.
4. **None of the four needs reading skills in the middle.** Nobody on the road has to be able to read Greek. They only need to be told where to look.

!!! tip "Try it"
    Tell a friend you have hidden a short message somewhere on a sheet of paper, with nothing visible on it. How many things do they try before they hold it to the light, tilt it, or look at the back? Each of those is the wax-scraping step of Gorgo. Steganography is only as good as the observer's imagination, and the first person to have the idea wins.

### In the real world

What do we know? We know that Herodotus, writing about 430 BC, wrote these four stories as things people believed had happened. We know that two of the people involved (Histiaeus, Demaratus) are well attested as historical figures, and that the Ionian Revolt and the invasion of Xerxes are certain events. We do not know that the tattoo was ever applied, that a tablet reached Sparta as described, or that the arrow was real. Some scholars (Detlev Fehling, in 1971, was the sharpest critic) have argued that Herodotus invented many of his sources; most historians today take a middle view: he reports what he was told, and a story told in his time about hidden letters shows how a Greek of 430 BC imagined a hidden letter. That is also what a historian of secret writing needs from it. The practical conclusion is that hiding writing was a familiar idea in the Greek world by the 400s BC, not that a particular head was tattooed.

## 3.3 Aeneas Tacticus: the first book on the subject
*Level: beginner.*

The first book we have that collects methods of secret communication on purpose was written by a Greek soldier. His name was Aeneas, and the Greeks called him *Tacticus*, the tactician. He wrote around the 350s BC a manual on how a city could survive a siege, and the work we have is only one of several he is said to have written; the rest are lost. Scholars think he may be the Aeneas of Stymphalos, a general of the Arcadian League whom Xenophon mentions in 367 BC, but the identification is a guess, a good one. The manual is short, practical, and written for a man who has a wall, a few hundred soldiers, and an enemy outside. It tells him how to post sentries and set watchwords, how to find traitors, how to keep a rumor from starting, and in chapter 31, the longest chapter in the book, how to get a message out of a besieged city or into one.

!!! note "Life story: Aeneas Tacticus"
    **Born:** about 400 BC (a guess from his command in 367 BC); perhaps Stymphalos in Arcadia · **Purpose:** to write a manual of defense for a city under siege (*How to Survive Under Siege*, about 350 BC) · **Helped:** commanders under siege, and every later list of hidden-message methods; Polybius says he also worked on a signaling system (§3.4) · **Status:** one work survives, in Greek, through Byzantine manuscripts; the standard modern translation and commentary is David Whitehead's (1990)

### Chapter 31

Aeneas's chapter 31 gives some twenty ways, by most counts, to get a message through. He does not say which he has tried, and some read like one man's wish list, but most are specific and practical. Among them, as Whitehead translates it:

- **Prick letters in a book or a letter.** Mark tiny holes beneath or above the letters of an ordinary page. The recipient copies the marked letters in order. The page looks like any other.
- **Hide it on the body.** Write on a leaf and bind it under a bandage on a wound, or sew the letter into the sole of a sandal.
- **Write on lead.** A thin sheet of lead, rolled into a coil, can be worn in the ear as an earring.
- **Hide it in a bladder.** Write on a bladder, deflate it, put it in a flask, then fill the bladder with air so it presses against the walls of the flask and looks like part of it. Fill the flask with oil.
- **Use the knucklebone.** An astragal, a knucklebone used as a die, has 24 holes bored in it, one for each letter of the Greek alphabet. To send a word the sender passes a thread through the holes in the order of the letters. The receiver pulls the thread out and reads off the letters in the order the thread crossed the bone. To anyone else it is a knucklebone with a string through it.

The knucklebone is the most interesting, because it is a lookup table the size of a die: 24 holes for 24 letters, and the thread is the message. It is also, if anyone but the receiver takes a close look at it, completely transparent. Anyone who counts 24 holes in a bone has found out what it is for.

The first idea on the list, pricking letters, lasted two thousand years. In the 1800s, when British newspapers could go through the post at a fraction of a letter's price, people are said to have pricked holes beneath the letters of a newspaper to send a message for the cost of the paper. That story rests on secondary retellings, and I have not seen a contemporary source for it, but the method is exactly Aeneas's.

### Code it: pricked letters

The program below does for a cover text what Aeneas describes. It takes a message, finds each of its letters in the cover text in order, and returns the positions to prick. The reader takes the marked letters in order.

```python
# Aeneas's pricked letters: pick a message out of a cover text, letter by letter.
cover = ("Aeneas to the council of Stymphalos. We have counted the grain in the "
         "stores and the cisterns are full. Send word by the northern road if the "
         "enemy camps near the gate; the watch is strong at night and the walls "
         "are sound, so no one need fear the siege.")

def prick(cover, message):
    # For each letter of the message, find the next matching letter in the cover.
    marks, pos = [], 0
    for ch in message:
        pos = cover.upper().index(ch, pos)
        marks.append(pos)
        pos += 1
    return marks

def read(cover, marks):
    return "".join(cover[i].upper() for i in marks)

marks = prick(cover, "SENDHELP")
print(marks)
print(read(cover, marks))
```

Output:

```
[5, 12, 17, 51, 54, 55, 100, 151]
SENDHELP
```

The cover text is a plausible letter about nothing. The message hides in eight pinpricks. Notice what the method needs: a cover text long enough to contain the message's letters in order, and a way to mark them that does not show. Notice also what it does not need: any key. Anyone who finds the holes reads the message.

!!! tip "Try it"
    Take any paragraph of a book and the message GOODBYE. Find the first G, then the first O after it, the next O after that, and so on. If the paragraph is too short and you run out, you have discovered the method's main limit: the cover has to be several times longer than the message. How long is the shortest paragraph that works for GOODBYE? Compare it with the cover text above.

### The sources and what they leave out

Chapter 31 is the earliest surviving list of this kind in Greek, and it is mostly steganography. It does contain one cipher-like idea, the knucklebone, which turns letters into positions. Some modern summaries also credit Aeneas with a scheme that replaces each vowel of a message by a number of dots; I have not been able to check that against a translation, so I do not rely on it. Apart from that doubtful case, nothing in the chapter scrambles or replaces letters. This is a general fact about the Greek and Roman material and one of the main points of the chapter: **in the 400s to 300s BC the Greeks, when they wanted a message to be safe, hid it. They did not yet scramble it.** There is one exception, the skytale, and the argument about whether it is an exception is the subject of §3.6.

The manuscript tradition matters here as well. Aeneas's text comes to us through Byzantine copies, with gaps, and the book was printed and read again in the Renaissance, the age of the Italian writers on secret writing that [chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) tells about. A later writer who wanted ancient authority for a trick could find it here, or in Polybius. That does not mean the ancient Greeks used any of these methods much. It means a few lists happened to survive, and later centuries leaned on them.

## 3.4 Signals: torches, jars and an agreed meaning
*Level: beginner.*

A besieged city has another problem that a hidden letter does not solve: speed. A runner takes hours; a horseman, less; but neither can cross enemy lines in daylight. What a Greek commander wanted was a message that could cross a valley in an instant, and the only thing that did was light.

Fire signals are older than the historians. In 458 BC Aeschylus opens his tragedy *Agamemnon* with a watchman on a roof in Argos, waiting a year for a light to tell him that Troy has fallen. The play then describes a chain of beacons, a mountaintop fire lit when the one before it is seen, running across the islands of the Aegean and down the Greek mainland to the roof where he stands. Thucydides, writing a few decades later, mentions fire signals in his accounts of war on land and sea more than once. A fire can say one thing, once: "the enemy is coming", "the fleet has arrived", "the city has fallen".

That is also the weakness, and Polybius, in the 100s BC, states it more clearly than anyone. In Book 10 of his *Histories* (10.43) he argues that a signal system is useful only if it can say what nobody expected. If every message must be agreed in advance, the commander can only learn what he already knew to ask, and the news he needs most is often just the kind nobody foresaw: a detachment has gone over to the enemy, the grain has been burned. The Greek answer to that problem came in two parts. The first, by Aeneas the tactician, widened the list of what a signal could say. The second, credited to others and improved by Polybius himself, got rid of the list.

### Aeneas's jar

Polybius credits Aeneas (10.44) with an improvement that used water. Each of the two sites, the sender's and the receiver's, has an identical jar, of the same size and with a plug of the same width in the bottom. In each jar floats a cork carrying an upright rod, and the rod is marked off in sections. Each section carries a message that has been agreed in advance: "cavalry have entered the country", "heavy infantry", "light infantry", "ships", "grain" and so on.

To send, the sender raises a torch. The receiver, seeing it, raises one back to show he is ready. Both pull the plug at the same moment, and the water in each jar runs out at the same rate, so the cork and the rod sink together. When the sender sees that the section with the message he wants is level with the rim of his jar, he raises the torch again, and both plug the jars. The receiver looks at the rim of his own jar and reads the section there. Figure 3.3 shows the whole sequence.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Aeneas's signal jars: two identical jars with a float and a marked rod, one at the sender and one at the receiver, with torches raised twice" fill="currentColor" font-size="14">
<text x="130" y="22" font-size="14" text-anchor="middle" font-weight="bold">sender's jar</text>
<rect x="60" y="140" width="140" height="150" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<rect x="60" y="200" width="140" height="90" fill="currentColor" fill-opacity="0.15"/>
<line x1="60" y1="200" x2="200" y2="200" stroke="currentColor" stroke-width="1.2"/>
<line x1="130" y1="40" x2="130" y2="200" stroke="currentColor" stroke-width="2"/>
<rect x="110" y="192" width="40" height="8" fill="currentColor"/>
<line x1="120" y1="52" x2="140" y2="52" stroke="currentColor" stroke-width="1.2"/>
<text x="146" y="56" font-size="12" text-anchor="start">cavalry have come</text>
<line x1="120" y1="80" x2="140" y2="80" stroke="currentColor" stroke-width="1.2"/>
<text x="146" y="84" font-size="12" text-anchor="start">heavy infantry</text>
<line x1="120" y1="108" x2="140" y2="108" stroke="currentColor" stroke-width="1.2"/>
<text x="146" y="112" font-size="12" text-anchor="start">light infantry</text>
<line x1="120" y1="136" x2="140" y2="136" stroke="currentColor" stroke-width="1.2"/>
<text x="146" y="140" font-size="12" text-anchor="start">ships</text>
<line x1="120" y1="164" x2="140" y2="164" stroke="currentColor" stroke-width="1.2"/>
<text x="146" y="168" font-size="12" text-anchor="start">grain</text>
<rect x="110" y="284" width="40" height="10" fill="currentColor"/>
<text x="130" y="312" font-size="12" text-anchor="middle" fill-opacity="0.85">plug in the bottom</text>
<text x="510" y="22" font-size="14" text-anchor="middle" font-weight="bold">receiver's jar</text>
<rect x="440" y="140" width="140" height="150" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<rect x="440" y="200" width="140" height="90" fill="currentColor" fill-opacity="0.15"/>
<line x1="440" y1="200" x2="580" y2="200" stroke="currentColor" stroke-width="1.2"/>
<line x1="510" y1="40" x2="510" y2="200" stroke="currentColor" stroke-width="2"/>
<rect x="490" y="192" width="40" height="8" fill="currentColor"/>
<line x1="500" y1="52" x2="520" y2="52" stroke="currentColor" stroke-width="1.2"/>
<text x="526" y="56" font-size="12" text-anchor="start">cavalry have come</text>
<line x1="500" y1="80" x2="520" y2="80" stroke="currentColor" stroke-width="1.2"/>
<text x="526" y="84" font-size="12" text-anchor="start">heavy infantry</text>
<line x1="500" y1="108" x2="520" y2="108" stroke="currentColor" stroke-width="1.2"/>
<text x="526" y="112" font-size="12" text-anchor="start">light infantry</text>
<line x1="500" y1="136" x2="520" y2="136" stroke="currentColor" stroke-width="1.2"/>
<text x="526" y="140" font-size="12" text-anchor="start">ships</text>
<line x1="500" y1="164" x2="520" y2="164" stroke="currentColor" stroke-width="1.2"/>
<text x="526" y="168" font-size="12" text-anchor="start">grain</text>
<rect x="490" y="284" width="40" height="10" fill="currentColor"/>
<text x="510" y="312" font-size="12" text-anchor="middle" fill-opacity="0.85">plug in the bottom</text>
<text x="320" y="110" font-size="13" text-anchor="middle">torch up: both pull the plug</text>
<text x="320" y="170" font-size="13" text-anchor="middle">water falls at the same speed</text>
<text x="320" y="230" font-size="13" text-anchor="middle">torch up again: both plug</text>
<text x="320" y="250" font-size="13" text-anchor="middle">the mark at the rim is the message</text>
<line x1="240" y1="120" x2="391.0" y2="120.0" stroke="currentColor" stroke-width="1.1" stroke-dasharray="4 3"/>
<polygon points="400.0,120.0 391.0,115.5 391.0,124.5" fill="currentColor"/>
<line x1="240" y1="240" x2="391.0" y2="240.0" stroke="currentColor" stroke-width="1.1" stroke-dasharray="4 3"/>
<polygon points="400.0,240.0 391.0,235.5 391.0,244.5" fill="currentColor"/>
</svg>
<figcaption>Figure 3.3. The signal jars Polybius credits to Aeneas (10.44). The rod is the code book: only what someone marked on it before the war can be sent.</figcaption>
</figure>

!!! note "Life story: the water-jar signal"
    **Born:** about the 350s BC, as described by Polybius (10.44) and credited to Aeneas · **Purpose:** to send one of a fixed set of messages across a distance faster than a runner · **Helped:** the idea of two sites keeping matching clocks, and of a numbered list of messages shared in advance · **Status:** retired; Polybius thought it too narrow, and replaced it in his own account with the letter-by-letter system of §3.5

### Code it: the code book on the rod

The program below keeps the rod as a list of messages and models the water running out of the jar, one centimeter a minute. The sender chooses how long to wait between the torches, and the receiver reads the rod at that time. Look at what happens to a message that is not on the list.

```python
# Aeneas's jar: both sides drain at the same speed, so the water level is a clock.
# The code book is the list of marks on the rod: a message is only what is on it.
rod = [
    "cavalry have entered the country",
    "heavy infantry",
    "light infantry",
    "ships",
    "grain",
]
top, per_mark = 50, 10          # starting level and the height of one mark (cm)

def stop_time(message):
    # How long after the first torch must the sender wait before the second?
    i = rod.index(message)       # a message not on the rod raises an error
    return i * per_mark          # minutes, if the level drops 1 cm a minute

def read_rod(minutes):
    level = top - minutes        # level after draining for that long
    return rod[(top - level) // per_mark]

for message in ("heavy infantry", "ships"):
    t = stop_time(message)
    print(message, "-> second torch after", t, "minutes ->", read_rod(t))

try:
    stop_time("they have burned the bridge")
except ValueError:
    print("they have burned the bridge -> not on the rod, cannot be sent")
```

Output:

```
heavy infantry -> second torch after 10 minutes -> heavy infantry
ships -> second torch after 30 minutes -> ships
they have burned the bridge -> not on the rod, cannot be sent
```

This is a **code**, in the sense of [chapter 1](01-Why-People-Hid-Writing.md): meanings agreed beforehand, with no letters scrambled. It is secure only as long as the enemy does not see which section the sender waits for. An observer who watches a jar empty and then sees cavalry arrive has half the code book. The method also has the limit that Polybius named. The rod holds five messages, and the world sends more than five.

### In the real world

Polybius describes the jars, but he does not say that anyone used them in a battle, and no other source reports it. The two-jar system is easiest to read as a design sketch that a handbook preserved. That is also how the handbooks of Vitruvius and of Hero of Alexandria (first century AD) treat many water devices: as ingenious machines described, not necessarily built. Whether a Greek commander ever lowered a rod to tell a city that grain had arrived, we do not know.

The idea does not need the jar to matter. A closed list of agreed messages is the oldest form of code, and it runs unbroken through the centuries: the lantern in the Old North Church in 1775 ("one if by land, two if by sea"), naval signal flags, the telegraph codebooks of [chapter 10](10-The-Telegraph.md), and the "code words" of a modern bank's alarm system. Each has Polybius's problem and each has the same fix: add letters.

## 3.5 Polybius's square
*Level: intermediate.*

Polybius, the man who pointed out the problem, was a good person to solve it. He was born in Megalopolis in Arcadia, about 200 BC, the son of a leader of the Achaean League, the confederation of Greek cities that was the last to oppose Rome. He became a cavalry commander in it himself. In 167 BC, after Rome crushed Macedon at Pydna, the Romans took a thousand Achaean leaders to Italy as hostages, and Polybius was one of them. He was kept in Italy for some seventeen years. He was taken into the household of Aemilius Paullus, the victor of Pydna, and became the tutor and close friend of Paullus's son, the young Scipio Aemilianus, beside whom he stood at the destruction of Carthage in 146 BC. He spent his life writing the *Histories* in forty books, an account of how Rome rose to rule the Mediterranean between 264 and 146 BC.

!!! note "Life story: Polybius"
    **Born:** about 200 BC, Megalopolis, Arcadia; died about 118 BC · **Purpose:** to explain to Greeks how and why Rome had come to rule them · **Helped:** military history and political theory; for this book, a clear account of Greek signaling (10.43 to 47) and of the Roman camp (6.34) · **Status:** Books 1 to 5 of the *Histories* survive whole and the rest in extracts; Book 10, where the signals are, is one of the extracted books

### Torches on a wall

In Book 10 (10.45 to 47) he describes a system that can send any message at all. He says it was first thought out by two men, Cleoxenus and Democleitus, and that he improved it himself; he gives no dates for them. The 24 letters of the Greek alphabet are written in five rows of five, the last row lacking one. Each row is a tablet. The signaller stands behind a wall, with five torches on each hand. To send a letter he first raises torches on his left hand, as many as the number of the tablet, one to five. Then he raises torches on his right, as many as the position of the letter on that tablet. The receiver watches through an instrument with two sighting tubes, one aimed at each hand, so he cannot mistake which side shows which number. He writes down the letter. Figure 3.4 shows the grid.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Polybius's square: 24 Greek letters in five rows of five, rows numbered by the left torches and columns by the right torches, with the letter Pi at left 4, right 1" fill="currentColor" font-size="14">
<text x="330" y="30" font-size="13" text-anchor="middle">right torches: which letter on the tablet</text>
<text x="218" y="60" font-size="14" text-anchor="middle" font-weight="bold">1</text>
<text x="274" y="60" font-size="14" text-anchor="middle" font-weight="bold">2</text>
<text x="330" y="60" font-size="14" text-anchor="middle" font-weight="bold">3</text>
<text x="386" y="60" font-size="14" text-anchor="middle" font-weight="bold">4</text>
<text x="442" y="60" font-size="14" text-anchor="middle" font-weight="bold">5</text>
<text x="176" y="103" font-size="14" text-anchor="end" font-weight="bold">1</text>
<rect x="190" y="70" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="218" y="105" font-size="20" text-anchor="middle">Α</text>
<rect x="246" y="70" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="274" y="105" font-size="20" text-anchor="middle">Β</text>
<rect x="302" y="70" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="105" font-size="20" text-anchor="middle">Γ</text>
<rect x="358" y="70" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="386" y="105" font-size="20" text-anchor="middle">Δ</text>
<rect x="414" y="70" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="442" y="105" font-size="20" text-anchor="middle">Ε</text>
<text x="176" y="159" font-size="14" text-anchor="end" font-weight="bold">2</text>
<rect x="190" y="126" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="218" y="161" font-size="20" text-anchor="middle">Ζ</text>
<rect x="246" y="126" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="274" y="161" font-size="20" text-anchor="middle">Η</text>
<rect x="302" y="126" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="161" font-size="20" text-anchor="middle">Θ</text>
<rect x="358" y="126" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="386" y="161" font-size="20" text-anchor="middle">Ι</text>
<rect x="414" y="126" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="442" y="161" font-size="20" text-anchor="middle">Κ</text>
<text x="176" y="215" font-size="14" text-anchor="end" font-weight="bold">3</text>
<rect x="190" y="182" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="218" y="217" font-size="20" text-anchor="middle">Λ</text>
<rect x="246" y="182" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="274" y="217" font-size="20" text-anchor="middle">Μ</text>
<rect x="302" y="182" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="217" font-size="20" text-anchor="middle">Ν</text>
<rect x="358" y="182" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="386" y="217" font-size="20" text-anchor="middle">Ξ</text>
<rect x="414" y="182" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="442" y="217" font-size="20" text-anchor="middle">Ο</text>
<text x="176" y="271" font-size="14" text-anchor="end" font-weight="bold">4</text>
<rect x="190" y="238" width="56" height="56" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1.3"/>
<text x="218" y="273" font-size="20" text-anchor="middle">Π</text>
<rect x="246" y="238" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="274" y="273" font-size="20" text-anchor="middle">Ρ</text>
<rect x="302" y="238" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="273" font-size="20" text-anchor="middle">Σ</text>
<rect x="358" y="238" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="386" y="273" font-size="20" text-anchor="middle">Τ</text>
<rect x="414" y="238" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="442" y="273" font-size="20" text-anchor="middle">Υ</text>
<text x="176" y="327" font-size="14" text-anchor="end" font-weight="bold">5</text>
<rect x="190" y="294" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="218" y="329" font-size="20" text-anchor="middle">Φ</text>
<rect x="246" y="294" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="274" y="329" font-size="20" text-anchor="middle">Χ</text>
<rect x="302" y="294" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="330" y="329" font-size="20" text-anchor="middle">Ψ</text>
<rect x="358" y="294" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="386" y="329" font-size="20" text-anchor="middle">Ω</text>
<rect x="414" y="294" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="30" y="170" font-size="13" text-anchor="start">left torches:</text>
<text x="30" y="188" font-size="13" text-anchor="start">which tablet</text>
<text x="490" y="262" font-size="13" text-anchor="start">Π is four on the left,</text>
<text x="490" y="280" font-size="13" text-anchor="start">one on the right.</text>
<text x="320" y="374" font-size="12" text-anchor="middle" fill-opacity="0.85">The fifth tablet has only four letters, because Greek had 24.</text>
</svg>
<figcaption>Figure 3.4. Polybius's signal square (Histories 10.45-47). Every letter becomes a pair of numbers from one to five; the shaded cell is Π, the first letter of Polybius's own name.</figcaption>
</figure>

!!! note "Life story: Polybius's square"
    **Born:** described about 150 BC (*Histories* 10.45 to 47), credited to Cleoxenus and Democleitus and improved by Polybius · **Purpose:** to signal any message, letter by letter, across a distance with torches · **Helped:** tap codes, the Nihilist cipher, Playfair, ADFGVX and every later cipher that turns a letter into two numbers · **Status:** retired as a signal; alive as a building block

### By hand

The first letter of Polybius's own name, Π, is the first letter of the fourth row. So the sender raises four torches on the left, then one on the right. The next letter of his name, Ο, is in row 3, fifth place: three torches on the left, five on the right. The whole word, ΠΟΛΥΒΙΟΣ, takes eight pairs: (4,1), (3,5), (3,1), (4,5), (1,2), (2,4), (3,5), (4,3). Sixteen counts of torches send the word, where Aeneas's rod could send one of five stock messages.

A little arithmetic shows why the system works. If each hand can show any of $m$ numbers, two hands can name $m^2$ different letters, so an alphabet of $N$ letters needs $m \ge \sqrt{N}$. For the 24 Greek letters, $\lceil\sqrt{24}\rceil = 5$, which is why the grid is five by five. The Latin alphabet's 26 letters would need a $6 \times 5$ grid, or two letters sharing a cell. Reducing a letter to two small numbers is what later cryptographers call **fractionation**, and it is the idea that carries the square into the history of secret writing: any scheme that turns one symbol into two can then do something to the pair.

### Code it: the grid, in both directions

```python
greek = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"     # Polybius's 24 letters
square = [greek[i:i + 5] for i in range(0, 24, 5)]
for n, tablet in enumerate(square, 1):
    print(n, " ".join(tablet))

def torches(word):
    out = []
    for ch in word:
        i = greek.index(ch)
        out.append((i // 5 + 1, i % 5 + 1))     # (which tablet, which letter)
    return out

signal = torches("ΠΟΛΥΒΙΟΣ")
print(signal)
for left, right in signal[:3]:
    print("left", "*" * left, "  right", "*" * right)
print("".join(square[t - 1][p - 1] for t, p in signal))
```

Output:

```
1 Α Β Γ Δ Ε
2 Ζ Η Θ Ι Κ
3 Λ Μ Ν Ξ Ο
4 Π Ρ Σ Τ Υ
5 Φ Χ Ψ Ω
[(4, 1), (3, 5), (3, 1), (4, 5), (1, 2), (2, 4), (3, 5), (4, 3)]
left ****   right *
left ***   right *****
left ***   right *
ΠΟΛΥΒΙΟΣ
```

!!! tip "Try it"
    A watcher writes down these pairs of torch counts, left then right: (4,3), (4,1), (1,1), (4,2), (4,4), (2,2). Use the grid in Figure 3.4 to read the word.

    ??? note "Answer"
        ΣΠΑΡΤΗ, Sparta. Row 4, place 3 is Σ; row 4, place 1 is Π; row 1, place 1 is Α; row 4, place 2 is Ρ; row 4, place 4 is Τ; row 2, place 2 is Η.

### The square after Greece

Polybius meant his grid for speed and distance, not for secrecy. Anyone who knew the tablets could read the torches, and he does not suggest otherwise. Nobody in the ancient world, so far as we know, scrambled the numbers. Yet his grid is probably the most reused idea in this chapter, because it makes a letter into a pair of numbers that someone can then tap, flash, shuffle or add to.

- **Tap codes.** Russian political prisoners in the 1800s are said to have knocked out the row and then the column of each letter on their cell walls, on a grid like Polybius's. American prisoners of war in Hanoi did the same from about 1965, on a $5 \times 5$ Latin grid with C standing in for K. That is the program below. Dates and details for both come from memoirs and later retellings, not from documents.
- **Ciphers.** The German army's ADFGVX cipher of 1918 started by turning each letter into grid coordinates and then shuffled them (chapter 11); Playfair's cipher of 1854 works inside a $5 \times 5$ square ([chapter 10](10-The-Telegraph.md)); and Russian revolutionaries of the 1880s used a number cipher built on the square, which cryptographers still call the Nihilist cipher.

```python
# The same square on the Latin alphabet, as the Hanoi prisoners used it:
# 25 letters, with K left out and C doing its work.
latin = "ABCDEFGHIJLMNOPQRSTUVWXYZ"     # no K
def taps(word):
    word = word.upper().replace("K", "C")
    return [(latin.index(c) // 5 + 1, latin.index(c) % 5 + 1) for c in word]

def listen(pairs):
    return "".join(latin[(r - 1) * 5 + (c - 1)] for r, c in pairs)

pairs = taps("WATER")
print(pairs)
print(" ".join("." * r + " " + "." * c + " /" for r, c in pairs))
print(listen(pairs))
print(listen(taps("KEEP")))        # K comes back as C: CEEP
```

Output:

```
[(5, 2), (1, 1), (4, 4), (1, 5), (4, 2)]
..... .. / . . / .... .... / . ..... / .... .. /
WATER
CEEP
```

### In the real world

Polybius describes the system and claims the improvement as his own. He does not report a battle in which it was used, and no other writer does either; we have a design, set down by a man who knew the problem well. The "Polybius square" of the cryptography books is a name given long after, by later writers who read him. When you meet it in a cipher chapter, remember that it was invented, as far as anyone can tell, so that a man behind a wall could say anything at all at a distance, and that the first cipher built on it came more than two thousand years later.

## 3.6 Sparta and the skytale
*Level: intermediate.*

No device in the history of secret writing is more famous, or less certain, than the Spartan staff. Sparta in the 400s BC was a city built to keep secrets. A small class of citizens ruled a much larger population of serfs, the helots, and the Spartan state treated its own business as private. Thucydides makes the point himself (5.68). When he wants to say how many Spartans fought at Mantinea in 418 BC, he says that nobody can tell, because the secrecy of the Spartan government hides it. Messages from Sparta went out from five officials called ephors, who held real power over the kings. Such a state would plausibly have wanted a way to write orders that a captured messenger could not read. The skytale is said to be what it used.

### What Plutarch says

The fullest account comes from Plutarch, writing about AD 100 in his *Life of Lysander* (19). Plutarch brings it in while telling how the Spartan authorities called Lysander home, the admiral who had won the war against Athens, after complaints from the Persian governor Pharnabazus; I take the date as the years just after the Athenian surrender of 404 BC, and that is a guess. When the ephors sent out a general or an admiral, Plutarch says, they made two round staffs of exactly the same length and thickness, kept one, and gave the other to the man going abroad. A staff of this kind was called a skytale. To send an order, they wound a long, narrow strip of leather or parchment around their staff in a tight spiral, without gaps, and wrote the message along the length of the staff. Then they unwound the strip and sent it. Off the staff, the letters ran in no order. The general wound the strip around his own staff, the letters lined up, and he could read.

Aulus Gellius, in the second century AD, describes the same thing (*Attic Nights* 17.9), and so do later Greek and Latin writers. In modern terms this is a **transposition cipher**: every letter stays itself, and only the order changes. The key is the thickness of the staff, which sets how many letters fit around one turn of the strip.

### By hand

Take the order SENDMOREMENTOTHEPASS, 20 letters, and a staff with four sides, so that four letters fit around each turn of the strip. Write the message along the staff, one side after another, five letters to a side: SENDM, OREME, NTOTH, EPASS. The strip goes around the staff five times, and each turn carries one letter from each side. Read column by column, top to bottom, and the strip bears SONE ERTP NEOA DMTS MEHS. Figure 3.5 shows the table.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="A skytale with four letters around and five turns: the message written along the rod in four rows, and the strip read off column by column as SONEERTPNEOADMTSMEHS" fill="currentColor" font-size="14">
<text x="270" y="30" font-size="13" text-anchor="middle">turns of the strip (left to right along the rod)</text>
<text x="158" y="62" font-size="12" text-anchor="middle" fill-opacity="0.85">turn 1</text>
<text x="214" y="62" font-size="12" text-anchor="middle" fill-opacity="0.85">turn 2</text>
<text x="270" y="62" font-size="12" text-anchor="middle" fill-opacity="0.85">turn 3</text>
<text x="326" y="62" font-size="12" text-anchor="middle" fill-opacity="0.85">turn 4</text>
<text x="382" y="62" font-size="12" text-anchor="middle" fill-opacity="0.85">turn 5</text>
<text x="120" y="93" font-size="12" text-anchor="end" fill-opacity="0.85">side 1</text>
<rect x="130" y="70" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="158" y="94" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="186" y="70" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="214" y="94" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="242" y="70" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="270" y="94" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<rect x="298" y="70" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="326" y="94" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<rect x="354" y="70" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="382" y="94" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<text x="120" y="129" font-size="12" text-anchor="end" fill-opacity="0.85">side 2</text>
<rect x="130" y="106" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="158" y="130" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="186" y="106" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="214" y="130" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="242" y="106" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="270" y="130" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="298" y="106" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="326" y="130" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="354" y="106" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="382" y="130" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<text x="120" y="165" font-size="12" text-anchor="end" fill-opacity="0.85">side 3</text>
<rect x="130" y="142" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="158" y="166" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<rect x="186" y="142" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="214" y="166" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="242" y="142" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="270" y="166" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="298" y="142" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="326" y="166" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="354" y="142" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="382" y="166" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<text x="120" y="201" font-size="12" text-anchor="end" fill-opacity="0.85">side 4</text>
<rect x="130" y="178" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="158" y="202" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="186" y="178" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="214" y="202" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<rect x="242" y="178" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="270" y="202" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="298" y="178" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="326" y="202" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="354" y="178" width="56" height="36" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="382" y="202" font-size="18" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="30" y="242" font-size="13" text-anchor="start">The message is written along the rod, one side after another.</text>
<text x="30" y="264" font-size="13" text-anchor="start">Unwound, the strip carries each column in turn, top to bottom:</text>
<text x="30" y="294" font-size="18" text-anchor="start" style="font-family:var(--md-code-font-family,monospace)">SONE ERTP NEOA DMTS MEHS</text>
<text x="30" y="318" font-size="12" text-anchor="start" fill-opacity="0.85">A rod of another thickness lines the letters up differently.</text>
</svg>
<figcaption>Figure 3.5. The skytale as a table. Writing along the rod fills the rows; the strip is read column by column. That is a transposition, and the rod's thickness (here, four letters around) is the key.</figcaption>
</figure>

The man with a staff of the same thickness winds the strip, the columns reappear as turns, and the rows are the message. With a staff of three sides the same strip gives SETEDSHOEPOMMSNRNATE, which is gibberish. That is the whole security of the method.

### Code it and break it

```python
def wrap(text, around):
    # Write along the rod, one row per side, then unwind: each turn of the
    # strip carries one letter from every row.
    row = -(-len(text) // around)               # letters per row, rounded up
    text = text.ljust(around * row, "X")         # pad the last row
    return "".join(text[i::row] for i in range(row))

def unwrap(strip, around):
    return "".join(strip[i::around] for i in range(around))

message = "SENDMOREMENTOTHEPASS"
strip = wrap(message, 4)
print(strip)
print(unwrap(strip, 4))

# Breaking it: try rods of every thickness
for around in range(2, 7):
    print(around, unwrap(strip, around))
```

Output:

```
SONEERTPNEOADMTSMEHS
SENDMOREMENTOTHEPASS
2 SNETNODTMHOERPEAMSES
3 SETEDSHOEPOMMSNRNATE
4 SENDMOREMENTOTHEPASS
5 SROSOTAMNPDEENMHEETS
6 STDHOPMSNNTEESEOMRAE
```

Only one rod thickness gives words. An enemy who captured a strip needed no theory, only the patience to wind it on staffs of every size. For a long message the right answer stands out so sharply that a computer can pick it without a human reader. The program below does it for a 75-letter order by counting common English letter triples; it finds the 7-sided staff with a score of 9, against 2 for the runner-up.

```python
def wrap(text, around):
    row = -(-len(text) // around)
    text = text.ljust(around * row, "X")
    return "".join(text[i::row] for i in range(row))

def unwrap(strip, around):
    return "".join(strip[i::around] for i in range(around))

order = "THEEPHORSORDERYOUHOMEATONCELEAVETHEFLEETWITHTHESHIPSANDCOMEBYTHEFASTESTROAD"
strip = wrap(order, 7)
print(len(order), strip)

# No spaces, so score each guess by common English triples.
triples = ["THE", "AND", "ING", "ENT", "ION", "HOM", "ORD", "ONC", "OUR", "EET"]
def score(text):
    return sum(text.count(t) for t in triples)

results = sorted(((score(unwrap(strip, n)), n) for n in range(2, 21)), reverse=True)
print(results[:4])
best = results[0][1]
print(best, unwrap(strip, best))
```

Output:

```
75 TDTHTCSHEOEHOTERNFEMEEYCLSESPOEEHBTHULEIYROHETPTOROAWSHASMVIAEDOEETNFXRATHDAX
[(9, 7), (2, 4), (1, 13), (1, 11)]
7 THEEPHORSORDERYOUHOMEATONCELEAVETHEFLEETWITHTHESHIPSANDCOMEBYTHEFASTESTROADXX
```

(The program pads the last row with X, which is why the answer ends in two X's. The strip is 77 letters long, not 75.) The scoring idea is the one that [Cryptanalysis chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) develops for every classical cipher.

!!! tip "Try it"
    This strip was wound on a staff with between two and eight sides. Find the staff and read the order, then say who it is addressed to: SOOYEAMNSRIECAXLAENXHTLDX

    ??? note "Answer"
        Five sides. Unwrap in groups of five: SAILHOMEATONCELYSANDERXXX, a recall order for Lysander, with three padding X's at the end.

### Was it a cipher at all?

The word is much older than Plutarch's description. The poet Archilochus, in the 600s BC, already uses it in a fragment about unwelcome news, and Thucydides (1.131) uses it in the story of Pausanias, the Spartan regent and victor of Plataea, who in the 470s BC was suspected of plotting with Persia. The ephors, Thucydides says, sent a herald with a skytale and told him that if Pausanias did not follow the herald home Sparta would declare war on him. Nothing in the sentence says the strip was wound, or that its contents were secret. A herald carrying a staff is a herald carrying a credential.

In 1998 the classicist Thomas Kelly published a paper in *Cryptologia* titled "The Myth of the Skytale". He argued that the early sources describe the skytale only as an official dispatch, a staff that carried the authority of the Spartan state, and that the cipher story appears in writers living hundreds of years afterward. As Kelly reads the evidence, the first clear description of the wound strip belongs to the Hellenistic age, some centuries after Sparta's great days. Several historians have proposed that the staff worked as a **token**, proof that a message really came from the authorities, which is authentication, not secrecy, and Kelly's paper pushes that line. In other words: a stick that proved who sent a message, which later writers, living in a world that had read more about ciphers, remembered as a stick that hid one.

Some historians accept the cipher reading anyway. Plutarch's account is detailed and consistent, two staffs of identical thickness is not a thing one invents idly, and the Hellenistic and Roman writers may have had older sources that are lost. The safe summary: the skytale was real, a Spartan state staff of some kind; its use as a transposition cipher is possible but not proved, and the evidence for it is a thousand years late for the evidence we would like. The Spartan staff is one of the first cases in this book of a problem that returns: a famous method with a single late witness.

!!! note "Life story: the skytale"
    **Born:** before the 600s BC as a word (Archilochus); the wound-strip cipher is first described by writers of the Hellenistic and Roman ages · **Purpose:** an official Spartan message staff; possibly a transposition cipher, possibly only a token of authority · **Helped:** the idea of a mechanical key (a rod of a certain thickness) shared between two parties; the name of the transposition cipher in every later textbook · **Status:** a cipher in the textbooks, disputed in the sources; solved at once by trying every rod

### In the real world

A plain fact that is easy to forget: nobody has ever found a skytale. No staff and no strip with writing on it survives from ancient Sparta, and the Spartans themselves left almost no writing about their government. Leather strips rot, and a wooden staff is not distinctive enough to pick out of a dig. The evidence is words in books written by outsiders.

One more story from Plutarch shows what Spartan commanders could expect from letters. According to him (*Lysander* 20), Lysander, summoned home after Pharnabazus's complaints, asked the satrap to write to the ephors in his favor. Pharnabazus wrote one letter in front of him, then sealed a different one, which looked the same, and handed that to Lysander. Lysander carried it home himself and gave it to the ephors, and found it accused him. I tell this from memory of Plutarch, and a letter swapped under the same seal is a convenient story. It points at the real security of ancient letters: a seal on wax, not a scrambled text.

## 3.7 Rome: letters, seals and Caesar's shift
*Level: beginner.*

Rome ran on letters. A senator in Rome wrote to a governor in Gaul, a banker to his agent in Greece, a mother to a son at school, and each letter passed from hand to hand across hundreds of miles. Most of them were never meant to be secret, and a Roman who wanted privacy did not scramble letters. He chose his carrier, sealed the roll with wax and a signet, and hoped. The seal was the Roman answer to the problem of this chapter, and its limits show in the best-documented case of intercepted letters in Roman history.

### The seals at the Mulvian Bridge

In 63 BC the consul Marcus Tullius Cicero uncovered a conspiracy by the senator Catiline to overthrow the Republic. The plotters had approached envoys of the Allobroges, a Gallic people in Rome on business, and given them letters to carry home, promising the Allobroges help. The envoys, uneasy, told their Roman patron, who told Cicero, and Cicero had them stopped with the plotters' agent at the Mulvian Bridge outside Rome on the night of 2 December. The letters were still sealed. In the Senate the next day each conspirator was shown the seal on his own letter, recognized it, and admitted it was his (the accounts are Cicero's speech of that week and Sallust's monograph, written about twenty years later). Nobody had enciphered anything. The plotters had put their signet rings on plain letters, and the rings convicted them.

That is the Roman situation in one scene. Interception was easy, and a seal made it tamper-evident, but it could not make it unreadable. The security of the system was in the carrier and the wax.

### Caesar's cipher

The cipher everyone knows comes to us from the biographer Suetonius, writing about AD 120 in his *Life of Julius Caesar* (56). He says that when Caesar had confidential things to say in his letters, he wrote them *per notas*, "by marks", with the order of the letters changed so that no word could be made out. Whoever wanted to read them had to put the fourth letter of the alphabet, D, for A, and likewise for the rest. Every letter moves three places along the alphabet. Cassius Dio, a century later still, tells much the same of the war in Gaul (*Roman History* 40.9).

Aulus Gellius adds a detail (*Attic Nights* 17.9). Caesar wrote to his agents Oppius and Balbus, who managed his affairs in Rome while he was abroad, in letters that looked like nonsense, and the grammarian Probus wrote a whole commentary on the secret meanings of the letters in Caesar's correspondence. That commentary is lost, which is a pity: it would tell us what Caesar's ciphers were, from someone who had studied them. That Probus needed a whole book hints that there was more to Caesar's secret writing than one fixed shift, though that is a guess.

Suetonius records a habit of Caesar's heir as well. Augustus (*Life of Augustus* 88) wrote B for A, C for B, and so on, a shift of one, but where Caesar's alphabet would wrap around, Augustus wrote a doubled A for X. Figure 3.6 shows both on the alphabet they used. Why a doubled A? Because X was the last letter of the Latin alphabet of Augustus's day. Y and Z had been borrowed from Greek for Greek words and were not part of the native alphabet. The cipher is evidence of what an educated Roman counted as "the alphabet".

!!! note "Life story: Augustus's shift"
    **Born:** before AD 14 (the year Augustus died), reported by Suetonius about AD 120 (*Augustus* 88) · **Purpose:** private letters, as Caesar's shift was · **Helped:** nothing we know of; it shows what an educated Roman counted as the alphabet · **Status:** retired; the doubled A is the only novelty

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="The Latin alphabet of 21 letters written over the same alphabet moved three places, so A becomes D and X becomes C; below, Augustus's shift of one with X becoming AA" fill="currentColor" font-size="14">
<text x="26" y="26" font-size="13" text-anchor="start" font-weight="bold">Caesar: plain letter above, cipher letter below</text>
<rect x="26" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="40" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="26" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="40" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<rect x="54" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="68" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="54" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="68" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="82" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="96" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="82" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="96" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">F</text>
<rect x="110" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="124" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<rect x="110" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="124" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">G</text>
<rect x="138" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="152" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="138" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="152" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<rect x="166" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="180" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">F</text>
<rect x="166" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="180" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">I</text>
<rect x="194" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="208" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">G</text>
<rect x="194" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="208" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">K</text>
<rect x="222" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="236" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<rect x="222" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="236" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L</text>
<rect x="250" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="264" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">I</text>
<rect x="250" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="264" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="278" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="292" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">K</text>
<rect x="278" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="292" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<rect x="306" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="320" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L</text>
<rect x="306" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="320" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="334" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="348" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="334" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="348" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<rect x="362" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="376" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<rect x="362" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="376" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<rect x="390" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="404" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="390" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="404" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="418" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="432" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<rect x="418" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="432" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="446" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="460" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<rect x="446" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="460" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="474" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="488" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="474" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="488" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<rect x="502" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="516" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="502" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="516" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<rect x="530" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="544" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="530" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="544" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="558" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="572" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<rect x="558" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="572" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="586" y="40" width="28" height="30" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="600" y="61" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<rect x="586" y="70" width="28" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="600" y="91" font-size="15" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<text x="26" y="128" font-size="12" text-anchor="start" fill-opacity="0.85">Suetonius: the fourth letter, D, stands for A. Past the end the alphabet wraps (X becomes C).</text>
<text x="26" y="162" font-size="13" text-anchor="start" font-weight="bold">Augustus: one place on, and a doubled A for X</text>
<rect x="26" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="40" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">A</text>
<rect x="26" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="40" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="54" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="68" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">B</text>
<rect x="54" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="68" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="82" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="96" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">C</text>
<rect x="82" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="96" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<rect x="110" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="124" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">D</text>
<rect x="110" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="124" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="138" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="152" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">E</text>
<rect x="138" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="152" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">F</text>
<rect x="166" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="180" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">F</text>
<rect x="166" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="180" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">G</text>
<rect x="194" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="208" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">G</text>
<rect x="194" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="208" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<rect x="222" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="236" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">H</text>
<rect x="222" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="236" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">I</text>
<rect x="250" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="264" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">I</text>
<rect x="250" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="264" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">K</text>
<rect x="278" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="292" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">K</text>
<rect x="278" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="292" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L</text>
<rect x="306" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="320" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">L</text>
<rect x="306" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="320" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="334" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="348" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">M</text>
<rect x="334" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="348" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<rect x="362" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="376" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">N</text>
<rect x="362" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="376" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="390" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="404" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">O</text>
<rect x="390" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="404" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<rect x="418" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="432" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">P</text>
<rect x="418" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="432" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<rect x="446" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="460" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">Q</text>
<rect x="446" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="460" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="474" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="488" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">R</text>
<rect x="474" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="488" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="502" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="516" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">S</text>
<rect x="502" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="516" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="530" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="544" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">T</text>
<rect x="530" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="544" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<rect x="558" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="572" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">V</text>
<rect x="558" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="572" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<rect x="586" y="176" width="28" height="26" fill="none" stroke="currentColor" stroke-width="1.1"/>
<text x="600" y="194" font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">X</text>
<rect x="586" y="202" width="28" height="26" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="1.1"/>
<text x="600" y="220" font-size="13" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">AA</text>
<text x="26" y="244" font-size="12" text-anchor="start" fill-opacity="0.85">Suetonius, Augustus 88. Latin had no letter after X yet: Y and Z were later loans from Greek.</text>
</svg>
<figcaption>Figure 3.6. The two Roman shifts, drawn on the 21-letter alphabet of Caesar's day. The modern 26-letter version appears in book 1, chapter 2.</figcaption>
</figure>

!!! note "Life story: Caesar's shift"
    **Born:** before AD 120 as a report by Suetonius about Caesar (died 44 BC); in use in Caesar's letters by the 50s BC, according to Gellius and Suetonius · **Purpose:** to keep the contents of a letter from a casual reader · **Helped:** every textbook example of a substitution cipher; the shift ciphers of the 1800s and the ROT13 joke of the internet · **Status:** retired; broken at once by trying every shift

### The mathematics, small

Number the 21 letters of Caesar's alphabet from 0 (A) to 20 (X). A shift by $k$ turns the letter with number $x$ into the letter with number

$$E_k(x) = (x + k) \bmod 21,$$

and to decrypt you subtract. Caesar's own key was $k = 3$; Augustus's was $k = 1$, with a special rule for the last letter. The number of keys is the number of letters, minus the shift that changes nothing: with 21 letters there are 20 useful shifts. This is the Roman alphabet as the Romans had it, shorter than the 26-letter version in [book 1, chapter 2](../../book/02-Classical-Ciphers.md), where the arithmetic is done mod 26.

### Code it: Caesar's alphabet

```python
# Caesar's alphabet had no J, U, W, Y or Z in the old days: 21 letters, ending at X.
latin = "ABCDEFGHIKLMNOPQRSTVX"

def shift(text, k):
    out = ""
    for ch in text:
        if ch in latin:
            out += latin[(latin.index(ch) + k) % 21]   # wrap X back to A
        else:
            out += ch
    return out

line = "GALLIA EST OMNIS DIVISA IN PARTES TRES"
secret = shift(line, 3)
print(secret)
print(shift(secret, -3))

# Augustus: one place on, and X becomes AA instead of wrapping.
def augustus(text):
    return "".join("AA" if ch == "X" else latin[(latin.index(ch) + 1) % 21]
                   if ch in latin else ch for ch in text)
print(augustus("ROMA"))
print(augustus("MAXIMVS"))

# Breaking it: only 20 shifts. Keep the ones that contain a common Latin word.
for k in range(1, 21):
    guess = shift(secret, -k)
    hits = [w for w in ("EST", "IN", "ET") if w in guess.split()]
    print(k, guess, "<-" if hits else "")
```

Output:

```
KDOOMD HXA RPQMX GMBMXD MQ SDVAHX AVHX
GALLIA EST OMNIS DIVISA IN PARTES TRES
SPNB
NBAAKNXT
1 ICNNLC GVX QOPLV FLALVC LP RCTXGV XTGV 
2 HBMMKB FTV PNOKT EKXKTB KO QBSVFT VSFT 
3 GALLIA EST OMNIS DIVISA IN PARTES TRES <-
4 FXKKHX DRS NLMHR CHTHRX HM OXQSDR SQDR 
5 EVIIGV CQR MKLGQ BGSGQV GL NVPRCQ RPCQ 
6 DTHHFT BPQ LIKFP AFRFPT FK MTOQBP QOBP 
7 CSGGES AOP KHIEO XEQEOS EI LSNPAO PNAO 
8 BRFFDR XNO IGHDN VDPDNR DH KRMOXN OMXN 
9 AQEECQ VMN HFGCM TCOCMQ CG IQLNVM NLVM 
10 XPDDBP TLM GEFBL SBNBLP BF HPKMTL MKTL 
11 VOCCAO SKL FDEAK RAMAKO AE GOILSK LISK 
12 TNBBXN RIK ECDXI QXLXIN XD FNHKRI KHRI 
13 SMAAVM QHI DBCVH PVKVHM VC EMGIQH IGQH 
14 RLXXTL PGH CABTG OTITGL TB DLFHPG HFPG 
15 QKVVSK OFG BXASF NSHSFK SA CKEGOF GEOF 
16 PITTRI NEF AVXRE MRGREI RX BIDFNE FDNE 
17 OHSSQH MDE XTVQD LQFQDH QV AHCEMD ECMD 
18 NGRRPG LCD VSTPC KPEPCG PT XGBDLC DBLC 
19 MFQQOF KBC TRSOB IODOBF OS VFACKB CAKB 
20 LEPPNE IAB SQRNA HNCNAE NR TEXBIA BXIA
```

The sentence is the opening of Caesar's *Gallic War*. Line 3 is the only one that is Latin. This is a **ciphertext-only attack by exhaustive search**, and it is still the first question asked of any cipher: how many keys are there? A 128-bit key has about $3.4 \times 10^{38}$, so nobody searches them one by one. A message of this length has exactly one reading among twenty candidates, which is the first glimpse of what Shannon later called the unicity distance; [Cryptanalysis chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) explains it.

!!! tip "Try it"
    Decrypt, by hand and with the 21-letter alphabet in Figure 3.6, the words Caesar is said to have sent to Rome after his victory at Zela in 47 BC: BHQM BMGM BMFM. (Suetonius, *Julius* 37.)

    ??? note "Answer"
        VENI VIDI VICI. Each letter moves three places back along the alphabet of Figure 3.6, and B wraps round to V (back one is A, back two is X, back three is V).

### Greek letters on a spear

Caesar's own account of the siege that opened this chapter (*Gallic War* 5.48) shows a different kind of secret writing. He wrote his message to Quintus Cicero in Greek letters. The Latin can mean the Greek alphabet or the Greek language; Dio, who tells the same story, understood the Greek language. Either way, the point is that few Gauls could read it. Caesar did not trust a cipher with a short key. He trusted the fact that his enemy did not have a Greek scribe. The horseman, who could not get close to the camp, threw the letter on a javelin. It stuck in a tower for two days, and then a soldier saw it, took it down, and Cicero read it aloud to his men.

### In the real world

Suetonius is our only detailed witness for Caesar's cipher, with Gellius and Dio repeating it or adding to it. Caesar's own books mention Greek letters but say nothing of a shift. No report says that anyone read a letter of his without his consent, or tried to; that tells us about what our writers chose to record, not about how strong the cipher was, and nobody in the ancient world, so far as we know, had a general method for attacking one. No letter in the shift survives either. What we have is a description, written about 160 years after Caesar's death, of how he wrote, and a commentary on it that is lost.

## 3.8 The camp, the watchword and the broken token
*Level: beginner.*

So far the question has been how to hide what a message says. A soldier at a gate has the other problem: how to know who is speaking. The ancient world solved that problem earlier, and better, than the first one.

### Polybius and the tablet

In Book 6 of the *Histories* (6.34), where he describes the Roman army as a Greek visitor would, Polybius explains how a Roman camp passed its watchword at night. Each class of troops, the three kinds of infantry and the cavalry, had a company at the far end of the camp street. At sunset a man from the tenth company of each class went to the tribune's tent and received a wooden tablet, the *tessera*, with the word written on it. He carried it back to his own company and handed it, before witnesses, to the commander of the next, and so up the line, from company to company, until the first companies, who were camped nearest the tribunes, brought it back before dark. If all the tablets came back, the tribune knew the word had gone through every company. If one was missing, he knew from the marks it carried which class had failed to return it, and he looked for the man at once. The one responsible was punished.

The routine does two things. It delivers a secret to every unit without announcing it, and it produces a receipt: a tablet that returns proves that the chain was whole. The program below runs it.

```python
# Polybius 6.34: each class gets its own marked tablet with the watchword. A man
# from the tenth company carries it up the line, company by company, to the
# first, which brings it back to the tribunes before dark.
classes = ["hastati", "principes", "triarii", "cavalry"]

def pass_up(cls, stuck_at=None):
    for company in range(10, 0, -1):      # tenth company first, first company last
        if (cls, company) == stuck_at:
            return company                # the tablet goes no further
    return 0                              # 0: it came back

for stuck in (None, ("principes", 4)):
    missing = [(c, pass_up(c, stuck)) for c in classes if pass_up(c, stuck)]
    if not missing:
        print("all four tablets are back: every company has the word")
    for cls, company in missing:
        print("the", cls, "tablet is missing; it stopped at company", company)
```

Output:

```
all four tablets are back: every company has the word
the principes tablet is missing; it stopped at company 4
```

!!! note "Life story: the tessera and the watchword"
    **Born:** long before 150 BC; described for the Roman army by Polybius (6.34) · **Purpose:** to let sentries and patrols tell friends from enemies at night · **Helped:** every army's password and countersign system, and the idea of a delivery receipt for a secret · **Status:** current in spirit: a password with a check that everyone received it

### When the word fails: Syracuse, 413 BC

A watchword is only as good as the speed at which it is learned. Thucydides tells the best-known failure (7.44). During the Athenian siege of Syracuse in 413 BC, the Athenian commander Demosthenes attacked the ridge of Epipolae at night, and at first took it. The Syracusans counterattacked in the dark. In the confusion, Thucydides says, the Athenians could no longer tell friend from enemy. Because they had to ask for the watchword so often, the enemy learned theirs, while they never learned the enemy's, since the Syracusans kept close together. And the battle hymn the Athenians sang to steady themselves, a paean, sounded almost the same as the Syracusan one, so that Athenians took fright at their own allies and fought each other. The night attack ended in a rout.

It is a useful story for a history of secret writing because nothing in it is broken. Every rule of the system is followed, and the system collapses under the one condition it was not built for: a night fight in which the word has to be spoken out loud, again and again, to people you cannot see. The lesson recurs in every later chapter that has a password in it. The secret leaks through use.

### The broken token

The Greeks had a second, older tool for proving identity, and the word still survives in English. A *symbolon* was a small object, a knucklebone, a pottery shard or a piece of metal, broken in two. Each of two parties kept a half, and years later, when a messenger or a guest-friend turned up with one, the halves were fitted together to prove he came from the right person. The word became "symbol", because the halves stand for each other. The Romans used the same thing and called it *tessera hospitalis*, the token of hospitality.

The principle is the one that the skytale may have served: a staff cut to a particular size, two copies, one at each end. When Thucydides says a herald carried a skytale, the ephors may have meant that the staff was the herald's proof, and that nobody was meant to read anything on it. We cannot tell whether the staff scrambled a message or only authenticated it. But the question the Greeks and Romans answered carefully, with tokens, seals, watchwords and signet rings, was who the writer was, and they put far less effort into what the writing said.

### In the real world

Both descriptions are Greek writers describing practice, and neither is a manual. Polybius's account of the camp is one of the best sources we have on how the Roman army worked, written by an educated outsider who was careful to say what he saw. Thucydides's account of Epipolae is one of his set battle pieces, vivid, and may be tidied. The Romans relied on trumpets and standards for signals in the day, and the watchword for the night; neither is a cipher, and both depend on the enemy not being close enough to learn them. The people involved are, as usual, the men with the tablets, and nobody names one.

## 3.9 Why weak methods worked, and what breaks them today
*Level: intermediate.*

From a modern view, every method in this chapter is easy to break. Caesar's shift has twenty keys, the skytale a handful, and Polybius's square and Atbash none at all. Yet the evidence is that they worked, in the sense that nobody is known to have reported reading a message sent that way. The reasons have little to do with mathematics.

### Why they worked

- **Few people could read.** William Harris, in his 1989 book *Ancient Literacy*, argued that in the Greek and Roman worlds perhaps one adult in ten, and often fewer, could read and write at more than a basic level. That is an estimate built from indirect evidence, not a count. A captured messenger carrying a strip of apparently random letters, or a letter in Greek, was in little danger of being read on the spot. Even educated senders often relied on the carrier to add what mattered by mouth. Thucydides (7.8) says the Athenian general Nicias wrote down his report to Athens in 413 BC because he feared that messengers, from lack of skill, bad memory or a wish to please, would not say it right. Writing was the exception, not the rule.
- **Nobody had a theory of breaking.** An enemy could guess, steal the key or torture the courier, as the Nervii did, but nobody knew a general method for attacking a substitution. That method, counting how often each letter appears, was first written down in Baghdad in the ninth century ([chapter 4](04-Baghdad-and-Cairo.md)). No ancient Greek or Roman text I know of tells of a cipher being broken.
- **The method was the secret.** If the enemy did not know you used a rod, the rod's thickness hardly mattered. Modern cryptography rejects this completely: the method is assumed public, and only the key is secret. The rule was stated clearly in 1883 by Auguste Kerckhoffs, a Dutch-born Frenchman, in the story told in [chapter 10](10-The-Telegraph.md).
- **A message did not have to last.** Most military messages about the next day's attack were stale within the week. The cipher had to hold for a night, not for ten years. A siege, a march, a night watch: each of these puts a short life on a secret.
- **The carrier and the seal did most of the work.** The security of a Roman letter was in the courier's loyalty and the wax. A cipher was an extra, used on top.

### Can these be broken today?

Yes, every one, most of them by hand in minutes. The table gives each method on this page and the attack in plain words.

| Method | Broken today? | The attack in plain words |
|---|---|---|
| Hidden messages (shaved head, wax tablet, hare, arrows) | as soon as you look | Nothing is scrambled. Search the courier, scrape the wax, cut open the hare. Modern versions hide data in pictures or files, and statistical tests can often spot it. |
| Aeneas's pricked letters | as soon as you look | Hold the page to the light and copy out the marked letters. |
| Aeneas's knucklebone | at once | Count the holes and unthread the string; the order of the holes is the message. |
| Code by agreed signs (water jars, torch lists, watchwords) | only with captured examples | Without the list, a mark means nothing. But every use is the same sign for the same message, so an enemy who sees signs and then sees what happens learns the code. |
| Polybius's square | instantly | There is no key to find: anyone who knows the usual square reads it. If the square were scrambled, letter counting would break it as it breaks any substitution. |
| Skytale | easily | Try every row length; only one gives words. For a message of $n$ letters there are at most about $n/2$ rods. |
| Caesar's and Augustus's shifts | instantly | Try all 20 shifts of the Latin alphabet (25 on a modern one) and keep the one in the language. |
| Caesar's Greek letters | as soon as the enemy has a reader | Needs a Greek scribe, and no more. |
| Seals and tokens | by forgery or theft | A seal can be copied, a letter swapped under the same seal (as in the story of Pharnabazus), or a courier made to talk. |

### What the three ideas became

The Greek and Roman worlds left three ideas that every later chapter builds on: hiding a message, replacing whole meanings with agreed signs, and scrambling letters under a small secret. They also left a fourth, which is less obvious: that the right question is often who sent a message, not what it says. In this chapter all four are in their simplest forms. The Polybius grid will be built into ciphers by 1918. The skytale's transposition is one of the two basic moves inside every modern block cipher, the subject of [book 1, chapter 6](../../book/06-Block-Ciphers.md), and the shift's substitution is the other. Caesar's name is attached to a method he may have used only a little. None of these ideas was a theory of secrecy. That theory came in 1949, from Shannon, in the story told in chapter 15.

Greece and Rome are also where the record is mostly silent about the other half of the story. There are no breakers here. They begin in the next chapter, a thousand years later, with a philosopher in Baghdad.

## 3.10 Going deeper
*Level: expert.*

### The skytale is multiplication

The skytale has a clean description in arithmetic. Number the letters of the message $0, 1, \dots, n-1$ with $n = rc$, where $c$ is the number of sides of the staff and $r$ the number of turns of the strip. Write the message along the staff one side after another, so the letter with index $i$ sits on side $s$ at turn $t$ with $i = sr + t$, where $0 \le s < c$ and $0 \le t < r$. The strip is read turn by turn, and within a turn side by side, so this letter lands at strip position $p = tc + s$. Now multiply: $ic = s(rc) + tc \equiv s + tc \pmod{rc - 1}$, because $rc \equiv 1$. So

$$p \equiv ic \pmod{n-1} \quad (0 \le i < n-1), \qquad p = n-1 \text{ when } i = n-1.$$

The last letter never moves, and every other letter is multiplied by $c$ in the integers mod $n - 1$. Decryption multiplies by $r$, since $cr \equiv 1$. It follows that winding the same message twice on the same staff is the same as one winding on a staff of $c^2$ sides, and that the strip returns to the original order after $k$ windings exactly when $c^k \equiv 1 \pmod{n-1}$. The program checks the formula on four staffs, checks the doubling, and then uses a two-sided staff on a 52-card deck: a skytale with two sides is a perfect shuffle, where the deck is split in half and interleaved. The old card-trick result that eight such shuffles restore the deck is the statement that $2^8 \equiv 1 \pmod{51}$.

```python
# A skytale with c letters around and r turns moves letter i to i*c mod (r*c - 1).
def wrap(text, around):
    row = -(-len(text) // around)
    text = text.ljust(around * row, "X")
    return "".join(text[i::row] for i in range(row))

def distinct(n):
    return "".join(chr(33 + i) for i in range(n))     # n different symbols

for r, c in [(5, 4), (7, 3), (6, 6), (11, 7)]:
    n = r * c
    text = distinct(n)
    strip = wrap(text, c)
    where = [strip.index(text[i]) for i in range(n)]
    formula = [i * c % (n - 1) if i < n - 1 else n - 1 for i in range(n)]
    print(r, c, where == formula)

# Doing it twice on the same rod is the same as a rod of c*c: i -> i*c*c mod (n-1)
n, c = 20, 4
text = distinct(n)
twice = wrap(wrap(text, c), c)
print(all(twice.index(text[i]) == i * c * c % (n - 1) for i in range(n - 1)))

# A skytale with two sides is a perfect shuffle of a 52-card deck.
deck = "".join(chr(65 + i) for i in range(52))     # 52 different "cards"
d, shuffles = wrap(deck, 2), 1
while d != deck:
    d, shuffles = wrap(d, 2), shuffles + 1
print("shuffles to restore the deck:", shuffles)
```

Output:

```
5 4 True
7 3 True
6 6 True
11 7 True
True
shuffles to restore the deck: 8
```

For attacks, only $c$ matters, and for a message that fills the staff exactly, $c$ is a divisor of $n$ between 2 and $n/2$. A 24-letter strip has six candidate staffs, namely 2, 3, 4, 6, 8 and 12 sides. With padding the count is a little larger, and it is never more than about $n/2$. The ancient method has fewer keys than the message has letters.

### Shifts form a group

A shift by $a$ followed by a shift by $b$ is a shift by $a + b$: $E_b(E_a(x)) = x + a + b \bmod 21$. The shifts of the Latin alphabet are a copy of the integers mod 21 under addition, and so encrypting twice, or ten times, with different keys gives nothing a single key does not. The key space does not grow. This is the simplest case of a fact that matters again in the DES chapters, where a doubled cipher is attacked by a meet-in-the-middle precisely because its keys do not compose into a stronger one. Augustus's variant is slightly different. Ciphertext A can only arise from X, which he writes AA, so in his cipher the letter A appears only doubled, never alone. A reader who knows the rule reads each AA as X and every other letter by subtracting one. The doubling also makes the ciphertext slightly longer than the plaintext, which is unusual among simple ciphers.

### How much does a torch carry?

Each pair of torch counts has $5 \times 5 = 25$ states, so $\log_2 25 \approx 4.64$ bits, against $\log_2 24 \approx 4.58$ bits for a letter of the Greek alphabet. The grid wastes almost nothing; it is close to the best two-part scheme for 24 symbols. The cost lies in time: sixteen torch movements per eight-letter word, plus the receiver's acknowledgment of each. It also shows why a modern signaller prefers a binary code and a single light: a code with two states per signal tolerates a bad channel far better than Polybius's grid, in which one miscounted torch changes the letter completely.

### Historiography: how far to trust the late witnesses

Three habits help in reading this chapter's sources. First, ask how far a writer stood from the event. Herodotus on the Ionian Revolt is about seventy years after; Plutarch on the skytale is about five hundred years after, and Suetonius on Caesar's cipher about a hundred and sixty. Second, ask whether another source, independent of the first, says the same. For the hidden messages there is a general convergence (Aeneas, Herodotus and the military writers who came after them share the genre); for the skytale there is only one chain, with Gellius quite possibly drawing on the same tradition as Plutarch. Third, ask what the writer wanted. Herodotus wants a good story and an illustration of the Greek habit of cleverness against Persian power; Plutarch wants to show Spartan character; Suetonius wants to show Caesar's care for his affairs. None of them wants to teach cryptography.

Detlev Fehling's *Die Quellenangaben bei Herodot* (1971; English translation 1989) argued that Herodotus's stated sources are, to a large extent, inventions. The majority of later historians have rejected the strongest form of the claim while keeping the caution. For this chapter the cautious reading is the right one: the stories show what a Greek of about 430 BC thought a hidden letter would be, even where the individual cases cannot be proved. Aeneas is a different type of source. He wrote a practical manual, and the methods in it, though some may be wishful, are presented as things a commander might do next week. David Whitehead's commentary (1990) dates the work from internal evidence to the middle of the fourth century BC and treats chapter 31 as a collection of ideas already in circulation. Polybius, the best witness for the signal systems, is a contemporary of the Roman camp he describes in Book 6, and the standard commentary is F. W. Walbank's (three volumes, 1957 to 1979).

Thomas Kelly's 1998 paper is the case in point. The standard cryptographic histories (David Kahn's, first published in 1967 and revised in 1996, before Kelly's paper) treat the cipher reading as settled. Kelly's paper argues against that, and I have not been able to check how widely later writers have accepted his case. The question is open in the sense that nobody has found a document that would close it.

### What is still open

- **Was the skytale a cipher?** The question needs a source earlier than Plutarch that describes the wound strip, or a well-attested use of the staff to carry a long message. Neither exists today.
- **How much cipher did the Romans use?** Suetonius says Caesar and Augustus used a shift. Probus's commentary on Caesar's letters is lost, and if it turned up, it would tell us how many alphabets, how many keys, and whether the cipher was applied to whole letters or to a few names. Nothing else on Roman secret writing is as specific.
- **Did anyone break a cipher in antiquity?** I know of no surviving report that anyone did. The silence may mean that nobody tried, that nobody succeeded, or that the writers who recorded such a thing are lost.
- **Are there ciphers in the Greek papyri?** Papyri and ostraca from Egypt, the Greek-speaking world's best source of ordinary writing, include a few cipher alphabets and letter swaps, most of them late; the Coptic examples are in [chapter 2](02-Egypt-Mesopotamia-and-the-Bible.md). Greek and Roman cases in the record are rare, and each new find changes the picture of how widely the idea was known.

## Check yourself

??? question "1. Name the four ways of protecting a message in this chapter, and say which one each of Herodotus's four stories uses."

    Hide it, agree its meaning in advance, scramble the letters, and seal it and trust the carrier. All four of Herodotus's stories (the tattooed head, the blank tablet, the hare, the arrows) use the first: hiding. None of them scrambles anything.

??? question "2. Why could Histiaeus's method not be used for a conversation?"

    The message had to be written on the scalp and the hair allowed to grow back, which took months. One message could be sent per head. A hidden message that costs a living courier and weeks of delay is a method for one letter, once.

??? question "3. A watcher records these pairs of torch counts, left then right: (1,1), (1,3), (1,1), (4,1), (2,2). Use Polybius's grid to read the word."

    ΑΓΑΠΗ. Row 1, place 1 is Α; row 1, place 3 is Γ; then Α again; row 4, place 1 is Π; row 2, place 2 is Η. (It means "love" in Greek.)

??? question "4. How many torches per hand does a 26-letter alphabet need in Polybius's scheme, and what is the usual way to fit it on a $5 \times 5$ grid?"

    Two hands with $m$ torch positions each name $m^2$ letters, so $m \ge \sqrt{26}$, which means $m = 6$ (and a $6 \times 5$ grid would also do, 30 cells). The usual fix is to share a cell: I and J go in one cell, giving 25 letters on a $5 \times 5$ grid, as in the tap code and in Playfair's cipher.

??? question "5. Encrypt ROMA with Caesar's shift of 3 on the 21-letter Latin alphabet ABCDEFGHIKLMNOPQRSTVX."

    VRPD. R is letter 16 and 16 + 3 = 19, which is V; O (13) becomes R (16); M (11) becomes P (14); A (0) becomes D (3).

??? question "6. Polybius thought that a fixed list of agreed messages, like the marks on Aeneas's rod, was a poor signal system. Why, and what did his own system do about it?"

    A list can only say what someone foresaw, and the news a commander most needs is often unforeseen. Polybius's grid signals letters, so any message at all can be spelled out, at the price of many more torch movements per message.

??? question "7. A strip of 24 letters was made on a staff that it filled exactly. How many staffs must an enemy try, at most?"

    Six. The number of sides must divide 24 and be between 2 and 12: 2, 3, 4, 6, 8 and 12. (A single side gives no transposition, and a staff with 24 or more sides is not a staff.)

??? question "8. In Augustus's cipher, a shift of one with a doubled A for X, why does the letter A never appear alone in the ciphertext, and what does that give away?"

    The only plain letter that would produce a cipher A is X (20 + 1 wraps to 0), and Augustus writes AA for it. So every A in the ciphertext sits in a pair. That marks the cipher as Augustus's variant and not a plain shift, and it shows exactly where every X was.

??? question "9. Use $p \equiv ic \pmod{rc-1}$ for a staff with $c = 4$ sides and $r = 5$ turns. Where in the strip does the letter with index 7 (the eighth letter of the message) end up?"

    $7 \times 4 = 28$, and $28 \bmod 19 = 9$, so it lands at position 9 (counting from 0). Check against Figure 3.5: in SENDMOREMENTOTHEPASS the letter with index 7 is E, the third letter of the second row (turn 3), and in the strip SONE ERTP NEOA DMTS MEHS position 9 is E.

??? question "10. Suppose someone finds a lead strip in a Spartan grave, scratched with 40 letters in no order and no rod. Say what would and would not follow for the skytale question, and what else you would want."

    Not much, by itself. A strip of scrambled letters would be the first physical evidence, but a scrambled strip could be a practice text or a puzzle, and without a matching staff nobody could show the order. To say it was a cipher you would want a staff of a plausible thickness, a dated context in the 400s BC or earlier, and ideally a second strip that unwinds on the same staff into sensible Greek. Even then it would show that a skytale could be a cipher, not that Sparta's usual one was. The point is how little the surviving texts constrain the question.

## What you learned

- The Greeks mostly hid messages (tattooed scalps, wax over a writing, a hare, an arrow) or agreed their meaning in advance (torches, jars, watchwords). Almost nothing in the record scrambles letters, and the exceptions rest on late witnesses.
- Our sources are Herodotus (about 430 BC), Thucydides, Aeneas Tacticus (about 350 BC), Polybius (about 150 BC), and, for Sparta and Rome, Plutarch, Gellius and Suetonius, writing five or six hundred years after the Spartans and about 160 years after Caesar.
- Polybius's square turns a letter into two numbers from one to five. It was built for torch signals, not secrecy, and is the root of tap codes, Playfair, ADFGVX and the Nihilist cipher.
- The skytale is a transposition cipher if it was a cipher at all. Thomas Kelly's 1998 paper argues that early sources show only an official staff, and the question is open. Arithmetically it is multiplication by the number of sides, modulo one less than the strip's length.
- Caesar's shift of three and Augustus's shift of one worked on a 21-letter alphabet, and the Roman world mostly relied on seals, trusted couriers and watchwords. A shift has about twenty keys, a skytale about half the message's length, and neither stops an enemy who tries them all.
- Weak methods worked because few could read, nobody had a theory of breaking, most messages went stale in days, and the carrier and the seal did more than the cipher.

**Next:** [Chapter 4](04-Baghdad-and-Cairo.md), where someone finally writes down how to break a cipher, a thousand years after Caesar.

## Further reading

- Herodotus, *Histories* 1.123, 5.35, 5.51 to 54, 7.239, 8.98, 8.128 (about 430 BC); Penguin and Oxford translations exist, and the Loeb edition gives the Greek facing the English.
- Thucydides, *History of the Peloponnesian War* 1.128 to 134 (Pausanias and the Argilian), 5.68, 7.8 and 7.44 (about 400 BC).
- Aeneas Tacticus, *How to Survive Under Siege*, translated with introduction and commentary by David Whitehead (Oxford: Clarendon Press, 1990; 2nd ed. Bristol Classical Press, 2001): chapter 31 on secret messages.
- Polybius, *The Histories*, 6 vols., Loeb Classical Library (translation by W. R. Paton, revised by F. W. Walbank and C. Habicht, 2010 to 2012): 6.34 and 10.43 to 47; F. W. Walbank, *A Historical Commentary on Polybius*, 3 vols. (Oxford, 1957 to 1979).
- Plutarch, *Life of Lysander* 19 and 20; Aulus Gellius, *Attic Nights* 17.9; Suetonius, *Life of Julius Caesar* 37 and 56, and *Life of Augustus* 49 and 88; Cassius Dio, *Roman History* 40.9; Caesar, *Gallic War* 5.40 to 49 (all in the Loeb Classical Library).
- Sallust, *The Conspiracy of Catiline* 44 to 47; Cicero, *Fourth Catilinarian*, with the *Third* for the seals (63 BC).
- Aeschylus, *Agamemnon* (458 BC), the opening and the beacon speech.
- Thomas Kelly, "The Myth of the Skytale", *Cryptologia* 22, no. 3 (1998), pp. 244 to 260.
- William V. Harris, *Ancient Literacy* (Harvard University Press, 1989).
- Detlev Fehling, *Herodotus and His "Sources": Citation, Invention and Narrative Art* (Leeds: Francis Cairns, 1989; German original 1971).
- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev. ed., Scribner, 1996), chapter 2 for the Greek and Roman material.
- Related chapters: [Chapter 2](02-Egypt-Mesopotamia-and-the-Bible.md) for Atbash and the earlier tradition, [Cryptanalysis chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) for breaking shifts and transpositions, and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) for how they work.
- *Weaker sources, named so you can check them:* Archilochus fragment 185 West for the word *skytale*, and the Hanoi tap code date (1965), taken from prisoner memoirs as retold in later accounts; the newspaper-pricking story, which rests on secondary retellings; the claim that Pharnabazus swapped Lysander's letter, which I give from memory of Plutarch.
