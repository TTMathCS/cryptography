# 1. Why People Hid Writing

*Before there was a science of ciphers there was a plain problem: a message had to get from one person to another across ground where other people could read it, and some of those people meant harm. This chapter sets out that problem and the old answers to it: hiding the message, replacing its words with agreed signs, scrambling its letters, and, more often than any of these, sealing it, writing it in a script or a language the enemy could not read, or trusting the courier. You will build a hidden message, a code and a cipher side by side, break each of them by hand, check a four-hundred-year-old scientist's scrambled claim to a discovery, and learn how the evidence for all of this reaches us, and why so much of it is missing.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a message crossing hostile ground has four weak points, and what people did about each;
    - the difference between steganography, a code and a cipher, with one real example of each;
    - why most secrecy in history was done by seals, scripts, languages and trusted people, not by ciphers;
    - who hid writing and why: states, merchants, priests, scholars, lovers and diarists;
    - how Galileo, Hooke and Huygens used scrambled letters to claim a discovery without revealing it;
    - what "secret writing" meant before Kerckhoffs wrote down the rule that only the key may be secret;
    - how we know anything about ciphers from before 1400, what is lost, and how to tell a cipher from a text we cannot read;
    - the two threads that run through the rest of the book.

    **You need:** nothing. School arithmetic is enough. If you have not read it, the first chapter of
    [the cryptography book](../../book/01-What-Cryptography-Is-For.md) sets out the vocabulary this book uses
    (plaintext, ciphertext, key), and the first chapter of the
    [Cryptanalysis book](../cryptanalysis/01-What-Cryptanalysis-Is.md) says how attackers think. This chapter
    does not retell either.

    **Levels:** §1.1 to §1.4 and §1.8 are for beginners, §1.5 to §1.7 are intermediate, §1.9 is expert.

## 1.1 The problem

*Level: beginner.*

Start with a letter that kills the man who carries it.

In the sixth book of the *Iliad*, a Lycian prince named Glaucus tells the story of his grandfather Bellerophon.
Proetus, the king of Argos, had been told by his wife that the young guest in his house had tried to seduce her. It
was a lie, but Proetus believed it. He could not kill a guest, so he sent the young man to his own father-in-law,
the king of Lycia, with a folded tablet on which he had scratched "many deadly signs". The king of Lycia read it,
and spent the next years setting Bellerophon tasks that should have ended him. Homer was working about 700 BC. The
passage is often called the first mention of writing in Greek literature, and he does not say what the signs looked
like, or whether he had in mind a script, a picture or a poet's guess at one.

The Bible has a second version. In the eleventh chapter of the second book of Samuel, King David has taken the wife
of one of his officers, Uriah, and wants Uriah dead. He writes to his general, Joab, and sends the letter "by the
hand of Uriah". It orders Joab to put Uriah at the front of the hardest fighting and then pull back from him. Uriah
carries his own death sentence to the front and is killed there. The text does not say the letter was sealed.

Look at what both stories rest on. The message is hidden from exactly one person, the courier, and he never looks.
Bellerophon is a guest, Uriah a loyal soldier, and neither thinks to doubt the hand that gave him the letter. That
is a security system, and a common one: a carrier who is trusted to carry and not to read. It fails the first time
the carrier is curious, or disloyal, or caught. Hamlet, in Shakespeare's play, breaks it exactly that way when he
opens the letter Rosencrantz and Guildenstern are carrying to England and rewrites it.

Now widen the picture. Any message that has to travel has four places where it can be read.

1. **At the writer's end.** A secretary, a servant or a scribe handles the draft. In the ancient world most people
   who wrote were scribes, and the person who wanted the letter written was often not the one holding the pen.
2. **With the courier.** He can be searched, questioned, bribed, robbed or killed. Someone can also simply open the
   bag.
3. **On the road.** Border posts, relay stations, inns, ports and rivers each add more hands. The longer the road,
   the more people have a chance at the message.
4. **At the far end, and afterward.** The recipient's household, a rival who gets into the file room, an enemy who
   captures the archive. A message that was safe in transit can be read years later.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A message travels from writer to reader along a road; four numbered places where it can be read: the draft, the courier, the road and the arrival" fill="currentColor" font-size="14">
<rect x="20" y="110" width="110" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="140" text-anchor="middle" font-size="14">Writer</text>
<rect x="510" y="110" width="110" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="565" y="140" text-anchor="middle" font-size="14">Reader</text>
<line x1="130" y1="135" x2="500" y2="135" stroke="currentColor" stroke-width="1.6" stroke-dasharray="6 4"/>
<polygon points="509,135 499,130 499,140" fill="currentColor"/>
<text x="315" y="124" text-anchor="middle" font-size="12" fill-opacity="0.85">days or months, many hands</text>
<circle cx="75" cy="85" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="75" y="90" text-anchor="middle" font-size="14" font-weight="bold">1</text>
<line x1="75" y1="97" x2="75" y2="110" stroke="currentColor" stroke-width="1"/>
<text x="75" y="42" text-anchor="middle" font-size="12">The draft:</text>
<text x="75" y="58" text-anchor="middle" font-size="12">scribe, clerk, servant</text>
<circle cx="225" cy="135" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="225" y="140" text-anchor="middle" font-size="14" font-weight="bold">2</text>
<line x1="225" y1="147" x2="225" y2="180" stroke="currentColor" stroke-width="1"/>
<text x="225" y="196" text-anchor="middle" font-size="12">The courier:</text>
<text x="225" y="212" text-anchor="middle" font-size="12">searched, bribed, robbed</text>
<circle cx="405" cy="135" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="405" y="140" text-anchor="middle" font-size="14" font-weight="bold">3</text>
<line x1="405" y1="147" x2="405" y2="180" stroke="currentColor" stroke-width="1"/>
<text x="405" y="196" text-anchor="middle" font-size="12">The road:</text>
<text x="405" y="212" text-anchor="middle" font-size="12">guards, stations, ports</text>
<circle cx="565" cy="85" r="12" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="565" y="90" text-anchor="middle" font-size="14" font-weight="bold">4</text>
<line x1="565" y1="97" x2="565" y2="110" stroke="currentColor" stroke-width="1"/>
<text x="565" y="42" text-anchor="middle" font-size="12">The arrival:</text>
<text x="565" y="58" text-anchor="middle" font-size="12">household, archive, years later</text>
<line x1="20" y1="248" x2="620" y2="248" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="320" y="274" text-anchor="middle" font-size="13">Four old answers: say it by heart, hide it, seal it, scramble it</text>
</svg>
<figcaption>Figure 1.1. A message has four places where it can be read between the writer's hand and the reader's. Secret writing is the set of answers people found, none of which covers all four.</figcaption>
</figure>

Large states made the problem worse by solving a different one. A king who wants to rule a territory that takes
months to cross needs a road and a relay. The Persian kings built one, and Herodotus describes it with admiration.
The Royal Road ran from Sardis, near the Aegean coast, to Susa, and he counts 111 stations along it. At each station
a fresh rider took the dispatch and carried it to the next. He writes that neither snow, rain, heat nor darkness
kept these riders from finishing their stage as fast as they could, which is where the American postal service's
informal motto comes from, though the Greek says nothing about a post office. Augustus, according to Suetonius,
set up a relay of young men and later carriages along the Roman roads, the *cursus publicus*. The Inca ran relay
runners, the *chaskis*, along their mountain roads, with way stations a short run apart. The Mongols did it with
horses and stations called the *yam*, and gave officials metal or wooden passes (the *paiza*) that opened every
station to them. The Abbasid caliphs' *barid*, a relay post, doubled as an intelligence service: the postmaster in
each province was also expected to report on the governor.

That last detail is the point. A relay post is a machine for moving messages quickly, and every station on it is a
place where a message can be stopped and read. The system that made big states possible also made reading other
people's mail possible, and the people who ran it knew exactly what it was worth. The history of secret writing is
partly the history of what writers did about that.

They had four answers, and the chapter's job is to tell them apart.

- **Say it by heart.** The message is not written at all. The courier learns it and speaks it to the reader. This is
  the oldest method and in much of the ancient world it was the normal one: the messenger was the message, and the
  tablet or letter he carried was a support for his memory and a proof of who sent him. It leaves no evidence, which
  is part of why we know so little about it.
- **Hide that there is a message.** The writing is concealed in something else: under wax, on a scalp, between the
  lines in invisible ink. This is **steganography**.
- **Replace the words with agreed signs.** A page of ordinary words can stand for something else, if the two sides
  agree what. This is a **code**.
- **Scramble the writing itself.** The letters are changed or moved by a rule, so that anyone can see there is a
  message and nobody who lacks the rule can read it. This is a **cipher**.

A fifth answer, older than the cipher and used much more often, is not on the list because it is not about the
writing at all: close the message in something the enemy cannot open without leaving a mark. It gets §1.3.

## 1.2 Hiding, coding and scrambling

*Level: beginner.*

The three technical answers have names, and the names matter, because people have mixed them up for centuries. The
mix-up hides what each one can and cannot do. Here is each with a real example, then all three on the same message.

### Steganography: hide that it exists

The word is Greek, from *steganos*, "covered", and *graphein*, "to write". It was made popular by Johannes Trithemius,
a German abbot whose book on the subject, written around 1500, comes up in Chapter 7. The ancient world had the
practice without the word. The oldest stories belong to Herodotus (a shaved and tattooed slave, a scraped wax
tablet), and they get their own chapter, Chapter 3, because they belong to Greek warfare. Here are three others that
are easier to try.

*Invisible ink.* The Roman poet Ovid, writing his *Art of Love* around 2 AD, gives lovers a tip: a note written in
fresh milk is invisible when dry and shows up when you dust it with fine charcoal. The elder Pliny, in his *Natural
History*, says the same of the milky sap of a plant he calls *tithymallus*, which is spurge. Milk, lemon juice and
urine all work on the same principle: they leave a trace on paper that reacts to heat or to a powder faster than the
paper does, so the writing turns brown or shows dark while the page is still blank to the eye. Kristie Macrakis, who
wrote the best recent history of invisible ink, tells how the secret services of the twentieth century spent
heavily on better inks and on the chemists who could find them.

*The egg.* In the sixteenth century Giambattista della Porta, a Neapolitan polymath who wrote on everything from
optics to ciphers, described how to write on a hard-boiled egg with an ink made of alum dissolved in vinegar. The
solution soaks through the porous shell without leaving a mark on the outside, and when the shell is peeled the
writing is on the white. Nobody searching a basket of eggs would find it. It is steganography at its most
convincing, and also a good example of its limits: it works exactly once on a given searcher. Nobody can use the
trick after the guards have heard of it.

*The null cipher.* An innocent letter in which a few letters, or the first letter of each word or line, spell the
real message. The name is a bit unfortunate (it is not a cipher), but it is in every old textbook. It survives in
puzzles, in prison letters, and in the acrostic poems of the ancient and medieval world. The reader will build one
in a moment.

The weak point of every form of steganography is the same. Its security is the secrecy of the *method*. It protects
against a guard who does not know that the trick exists, and against nobody else. Once the guard knows that there
may be milk on the page, every page is suspect; once he knows that the first letters might spell something, he
checks them. Steganography also fails badly: when it fails, everything is lost at once, and the reader of the cover
text learns the message with no further work.

### Code: agree what the words mean

A **code** replaces whole units of meaning, words or phrases or whole sentences, with other words, numbers or
symbols that the two sides have agreed on in advance. The agreement is the key. Where it is written down, it is a
codebook; where it is not, it is a memory, a prearranged phrase, a list of names.

The most famous prearranged phrases of the twentieth century were broadcast by the BBC in June 1944. The French
Resistance had been told that two lines of a poem by Paul Verlaine, "Chanson d'automne", would announce the Allied
landings. The first, *Les sanglots longs des violons de l'automne* ("The long sobs of autumn's violins"), broadcast
on 1 June, meant that the invasion would come within two weeks. The second, *Blessent mon cœur d'une langueur
monotone* ("wound my heart with a monotonous languor"), broadcast on 5 June, meant that it was now less than two days
away, and that the sabotage plans for railways and telephone lines should start. The words meant nothing in
themselves. A listener who caught them and did not know the arrangement learned only that the BBC broadcast some
poetry. German listening posts are reported to have noticed the lines, though the sources disagree on how far the
warning traveled up the German command. The Japanese fleet used the same device on 2 December 1941: the order
*Niitakayama nobore*, "climb Mount Niitaka", followed by a date, meant that the attack on Pearl Harbor was to go
ahead on 8 December (Japanese time).

!!! note "Life story: the Verlaine lines, June 1944"
    **Born:** 1944, in London, among the Allied planners' arrangements with the French Resistance; the lines were
    read out among hundreds of other coded phrases in the BBC's nightly *messages personnels* · **Purpose:** tell
    the Resistance, in public and by radio, that the invasion was near without telling anyone else · **Helped:**
    set off the planned railway and telephone-line sabotage in the days before 6 June · **Status:** one-off; a
    prearranged phrase can be used once, because a second use tells the enemy it means something

A code has two properties that make it different from a cipher, and both matter later in the book. First, it is
fast: one group stands for a whole word or phrase, so a message is short, and in the age of paid telegrams, short
meant cheap (Chapter 10). Second, it is **brittle**. A code can only say what is in the book. If the book has no
entry for "bridge", you cannot send "meet at the bridge", and if the book is captured, every message ever sent in
it can be read. A code is also hard to change: a new book has to be printed and carried to every user, and nobody
does that every month.

### Cipher: scramble the letters

A **cipher** works on smaller things than meaning: letters, pairs of letters, syllables, bits. A rule, the
**method**, and a small piece of private information, the **key**, turn the plaintext into a ciphertext that looks
like noise. The oldest named cipher in the West is a shift of the alphabet: write each letter as the letter three
places on, so A becomes D and B becomes E. Suetonius says Julius Caesar used it; Chapter 3 tells what the sources do
and do not show. With a shift of five instead of three, "MEET" becomes "RJJY".

A cipher is slower than a code and, in exchange, far more flexible. It can say anything, including words nobody
planned for. It is also easier to rekey: change the number and you have a different cipher. But it does one thing a
code never does: it hands the enemy a long stream of text with all the statistical habits of the language still
showing through it, and an enemy who has enough of it can use those habits. That is the lesson of
Chapter 4 and the whole Cryptanalysis book.

A name for a cipher that never changes its key is a *method*, and that is how most of history used them: one fixed
shift, one fixed table. The idea that a method could be public while a short key stays private, which looks like
the center of cryptography today, is a nineteenth-century invention. §1.6 comes back to it.

### All three on one message

Take the plaintext **MEET AT DUSK**. Figure 1.2 shows it three ways.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="The message MEET AT DUSK as steganography (a cover sentence whose first letters spell it), as a code (three four-digit groups) and as a cipher (each letter moved five places)" fill="currentColor" font-size="14">
<text x="320" y="24" text-anchor="middle" font-size="15" font-weight="bold">MEET AT DUSK</text>
<line x1="320" y1="32" x2="320" y2="46" stroke="currentColor" stroke-width="1"/>
<line x1="107" y1="46" x2="533" y2="46" stroke="currentColor" stroke-width="1"/>
<line x1="107" y1="46" x2="107" y2="62" stroke="currentColor" stroke-width="1"/>
<line x1="320" y1="46" x2="320" y2="62" stroke="currentColor" stroke-width="1"/>
<line x1="533" y1="46" x2="533" y2="62" stroke="currentColor" stroke-width="1"/>
<polygon points="107,64 102,56 112,56" fill="currentColor"/>
<polygon points="320,64 315,56 325,56" fill="currentColor"/>
<polygon points="533,64 528,56 538,56" fill="currentColor"/>
<rect x="5" y="66" width="204" height="130" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="218" y="66" width="204" height="130" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<rect x="431" y="66" width="204" height="130" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="107" y="88" text-anchor="middle" font-size="14" font-weight="bold">Hide it</text>
<text x="320" y="88" text-anchor="middle" font-size="14" font-weight="bold">Code it</text>
<text x="533" y="88" text-anchor="middle" font-size="14" font-weight="bold">Scramble it</text>
<text x="107" y="116" text-anchor="middle" font-size="11">Make every effort to attend</text>
<text x="107" y="132" text-anchor="middle" font-size="11">the dinner; unless someone knocks.</text>
<text x="320" y="124" text-anchor="middle" font-size="18" style="font-family:var(--md-code-font-family,monospace)">4417 0290 7731</text>
<text x="533" y="124" text-anchor="middle" font-size="18" style="font-family:var(--md-code-font-family,monospace)">RJJY FY IZXP</text>
<text x="107" y="160" text-anchor="middle" font-size="12">first letter of each word</text>
<text x="107" y="178" text-anchor="middle" font-size="12">gives the message</text>
<text x="320" y="160" text-anchor="middle" font-size="12">a book says MEET = 4417,</text>
<text x="320" y="178" text-anchor="middle" font-size="12">AT = 0290, DUSK = 7731</text>
<text x="533" y="160" text-anchor="middle" font-size="12">every letter moved</text>
<text x="533" y="178" text-anchor="middle" font-size="12">five places on</text>
<text x="107" y="222" text-anchor="middle" font-size="12">secret: the method</text>
<text x="320" y="222" text-anchor="middle" font-size="12">secret: the book</text>
<text x="533" y="222" text-anchor="middle" font-size="12">secret: the method and the number</text>
<text x="107" y="250" text-anchor="middle" font-size="12" fill-opacity="0.85">fails: once the guard knows</text>
<text x="320" y="250" text-anchor="middle" font-size="12" fill-opacity="0.85">fails: no word in the book</text>
<text x="533" y="250" text-anchor="middle" font-size="12" fill-opacity="0.85">fails: letter counts show through</text>
</svg>
<figcaption>Figure 1.2. One message, three kinds of protection, and what each one depends on and how each one fails. The cipher shown has a key of 5; a real one would have a larger table of keys and still fail the third way if it were a simple shift.</figcaption>
</figure>

The program below does all three, and then tries each on a new message to show where each one breaks. It uses only
the standard library.

```python
# Three ways to protect "MEET AT DUSK", side by side.

# 1. Steganography: the message hides in an innocent cover sentence.
cover = "Make every effort to attend the dinner; unless someone knocks."
print("hidden message:", "".join(word[0] for word in cover.split()).upper())

# 2. A code: whole words are swapped for groups from an agreed book.
codebook = {"MEET": "4417", "AT": "0290", "DUSK": "7731", "DAWN": "5086"}

def encode(text):
    groups = []
    for word in text.split():
        if word not in codebook:
            return "the book has no group for " + word
        groups.append(codebook[word])
    return " ".join(groups)

print("code:", encode("MEET AT DUSK"))
print("code, new word:", encode("MEET AT NOON"))

# 3. A cipher: every letter moves "key" places along the alphabet.
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def shift(text, key):
    out = ""
    for letter in text:
        if letter in ALPHABET:
            out += ALPHABET[(ALPHABET.index(letter) + key) % 26]
        else:
            out += letter          # spaces stay as they are
    return out

print("cipher:", shift("MEET AT DUSK", 5))
print("cipher, new word:", shift("MEET AT NOON", 5))
print("cipher, new key:", shift("MEET AT DUSK", 9))
```

Run it and the results are what Figure 1.2 shows. The code refuses "NOON", because the book has no word for it, and
the cipher does not care. The cipher can be rekeyed by changing one number, and the code cannot be rekeyed without
a new book. Those two facts drove much of what people built next.

### Try it and break it

Three short exercises, one for each tool. Do them on paper before you run anything.

1. **Steganography.** Here is a letter: *We are all well here. All the news is good. Is your cough better? Take care
   on the road.* Is there a message in it? Where would you look first? (Look at the first letter of each sentence.
   The answer is a single four-letter word.)
2. **Cipher.** This was written with a shift cipher: `AOL NBHYKZ MVBUK UVAOPUN VU AOL TLZZLUNLY`. The key is a number
   between 1 and 25. You have no other clue. How many keys do you have to try at most? Write the shifts in a table
   and look for the one that reads as English. (Twenty-five. The answer is a short sentence about guards.)
3. **Code.** With the codebook above and a ciphertext `7731 4417 0290`, what does the message say? What does the
   enemy learn if he captures only the ciphertext? What if he captures the book?

The next block checks the second exercise by trying every key. It prints just the line that reads as English.

```python
ciphertext = "AOL NBHYKZ MVBUK UVAOPUN VU AOL TLZZLUNLY"
ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def shift(text, key):
    return "".join(ALPHABET[(ALPHABET.index(c) + key) % 26] if c in ALPHABET else c
                   for c in text)

for key in range(1, 26):
    guess = shift(ciphertext, -key)         # undo a shift of "key"
    if "THE" in guess.split():              # crude test: does it contain the word THE?
        print("key", key, ":", guess)
```

The point of the exercise is the second question under each: how many tries, and what the enemy learns. A shift
cipher has 25 usable keys, which a clerk can try in an hour. The code has no keys to try at all; it can only be
read by someone who has the book, or by someone who works out the book from many messages, a much slower job.
Each tool is weak in a different place. People who built
real systems learned to put them together, as Chapter 6 shows with the nomenclator, which is a cipher for ordinary
words and a code for the names that mattered.

Two last remarks before the sources. The word **cipher** comes, by a roundabout road, from the Arabic *sifr*, which
means "empty" and gave English both "zero" and "cipher". When Arabic numerals reached Europe in the Middle Ages,
the zero looked like a mystery, and later the word was applied to anything written in odd symbols. That is the
usual explanation. It is fitting that the Arab world gave the word, because, as Chapter 4 shows, it also gave the
first systematic method for breaking such writing. And **code** comes from the Latin *codex*, a
bound book or a set of wooden writing tablets, which is where the older sense, a code of laws, comes from. The sense of
a secret system of signs is nineteenth century.

**In real life the lines blur.** A twentieth-century "code" was usually an enciphered code: first the words were
turned into numbers from a book, and then the numbers were scrambled again by a second table, so that a captured book
alone was no help. Japan's naval code JN-25, which gets its own chapter, worked this way. A cipher that works on whole
words is a code. A code with a large enough book is a cipher with a very big alphabet (§1.9 makes that precise). The
terms are useful as long as you keep in mind what each does well, and a historian who uses them loosely will
misread what a source says.

## 1.3 Locks that are not mathematics

*Level: beginner.*

Pick a letter at random from the last four thousand years and the odds are that nobody tried to put it in cipher.
The textbook picture, in which every secret message was a puzzle, is wrong. Most of the work of keeping a message
private was done by plainer things: a seal, a language the enemy did not read, the fact that most people could not
read at all, and a courier who could be trusted. A history of ciphers that left these out would make ciphers look
more important than they were, and would make it hard to see why people invented ciphers when they did.

### The seal and the envelope

The best-documented case is also one of the oldest. In the twentieth to eighteenth centuries BC merchants from the
city of Assur, on the Tigris in northern Iraq, ran a trading colony at Kanesh, now the mound of Kültepe in central
Turkey. They sold tin and textiles to the Anatolians for silver and wrote everything down on clay: loans, partnership
contracts, shipping accounts and letters. More than twenty thousand of these tablets have been found. Many
were wrapped in a thin layer of clay, an **envelope**, which carried the names of the sender and the recipient on the
outside and was rolled over with the cylinder seals of the people involved. A cylinder seal is a small stone
cylinder carved with a scene; rolled over wet clay, it leaves the scene as a continuous relief. Each owner had his
or her own, and an impression was as good as a signature.

The recipient could see at once whether the envelope was whole. To read the letter he had to break it, and anyone
else who did so before him left a broken seal. So the clay envelope did not hide the writing; it hid it *unless
somebody broke the lock*, and made the breaking obvious. A modern reader will recognize two of the jobs from
Chapter 1 of [the cryptography book](../../book/01-What-Cryptography-Is-For.md) at once. The seal protected
integrity (the contents are as written) and authenticity (it came from the person whose seal this is), and it gave
a limited kind of confidentiality, the kind that depends on nobody being willing to be caught breaking it. The
ancient world did not split these three; it did not need to.

!!! note "Life story: the Old Assyrian clay envelope"
    **Born:** about 1900 BC (the Kanesh archives run roughly 1950 to 1750 BC), in the Assyrian merchants' quarter at
    Kanesh in Anatolia, with roots in the sealed clay of earlier Mesopotamia · **Purpose:** keep a letter or
    contract whole between Assur and Kanesh, and show who sent it · **Helped:** a trade network that lasted about two
    centuries and left a business archive of tens of thousands of tablets; a model for sealed documents in later
    Near Eastern and Mediterranean states · **Status:** retired as a medium, but the idea lives on in every
    tamper-evident seal and every message authentication code

Women were part of this correspondence in ways the later history of secrecy usually forgets. Cécile Michel, who has
spent much of her career on the Kanesh texts, has shown how many of the letters were written by women in Assur,
who wove the textiles that went to Anatolia, ran the family houses and wrote to husbands and brothers abroad about
money, cloth and quarrels. Their business was real business, and they sealed it.

One influential theory runs the idea back much further. Denise Schmandt-Besserat argued from the 1970s that clay
tokens of various shapes, used in the Near East from about 8000 BC to count goods, were put into hollow clay balls,
the *bullae*, sealed, and impressed on the outside with the tokens inside, and that this habit led to writing. The
theory is much discussed and not accepted by everyone, but it makes a point worth keeping in mind. For much of
the early history of writing, protecting a record and making a record were the same act.

The same arrangement turns up around the world. In China, before paper, documents were written on strips of
bamboo or wood, tied with a cord, and the knot was covered with a lump of clay stamped with a seal; the clay
sealings (*fengni*) are found by the thousand in excavations. In Rome, a letter was written on a wooden tablet with a
wax surface, tied with thread, and the wax on the knot was stamped with a signet ring. With paper came the folded
and sealed letter, and with it a craft of its own.

### Letterlocking

A research group led by Jana Dambrogio, a conservator at the libraries of the Massachusetts Institute of Technology,
named that craft **letterlocking**: the art of folding, cutting, slitting and sealing a sheet of paper so that it
becomes its own envelope and cannot be opened without visible damage. Letterlockers of the sixteenth and
seventeenth centuries had a large repertoire. Some locks only closed the letter; some were built to show that it
had been opened; some were hard to reseal even for a skilled forger. The best collection is a trunk of undelivered
mail kept in The Hague, the Brienne Collection, left over from the postal service of the late 1600s; it holds about
2,600 letters, and about 600 have never been opened. In 2021 the group published a method, using X-ray
microtomography and software, for virtually unfolding such a letter without touching it. They read one dated 1697,
sent to a merchant in Lille, which asked for a legal document. The letter was ordinary; the point was that for the first
time a modern reader could see how its writer had locked it.

!!! note "Life story: letterlocking"
    **Born:** the craft is old and widespread; the name and the research date from the 2010s, when Jana Dambrogio
    and Daniel Starza Smith began cataloguing the techniques · **Purpose:** make a
    sheet of paper its own envelope and its own tamper alarm · **Helped:** diplomatic and private mail from the 1400s
    to the 1800s; the 2021 virtual unfolding of a sealed 1697 letter from the Brienne trunk · **Status:** retired as a
    working craft after the gummed envelope came in (1840s and 1850s), now a field of study

The seal has a limit, and the limit explains why it was never enough. A seal shows that a letter has been opened. It
does not stop the reader reading. A clerk with a hot knife, wax and a copy of the signet could open a letter and reseal it, and
the professional mail-openers of the 1600s and 1700s did exactly that every morning (Chapter 9). Once a state could
open any seal undetected, the writer was left with nothing but the writing itself to stop the reader. The cipher
was the answer to a failing lock.

### A language, a script, a society

Another lock was the language. In the winter of 54 to 53 BC, according to Caesar's own account, one of his
lieutenants, Quintus Cicero (the orator's younger brother), was besieged in his winter camp by the Nervii and their allies
in northern Gaul. Caesar was some days away with a relief force and needed to say so. A Nervian named Vertico,
who had gone over to the Romans, offered to get through. Caesar wrote the letter in Greek characters, "so that the enemy, if they intercepted it,
would not learn our plans", and told the man, if he could not get close, to tie it to the thong of a javelin and
throw it over the rampart. The messenger lost his nerve and threw the javelin; it stuck in a tower and nobody saw
it for two days. A soldier finally pulled it out and brought it to Cicero, who read it to the assembled troops, and
soon afterward the smoke of the villages burned by Caesar's marching army confirmed it.

The lock was a script. It is not a cipher, and Caesar does not call it one. (His better-known shift cipher gets its
account in Chapter 3.) And it was a gamble. Caesar himself remarks elsewhere that the Helvetii, a Gaulish people, had
kept their records in Greek letters (*Gallic War* 1.29), and that the Druids used Greek letters for public and private
accounts (6.14), so it is not obvious that Greek was unreadable to the enemy. The letter got through anyway, by a
lucky throw. Look at what the method relied on: it was cheap, it worked once, and nothing about it could be
rekeyed.

!!! note "Life story: Caesar's Greek letter, 54 BC"
    **Born:** winter 54/53 BC, in Gaul, Caesar's letter to Quintus Cicero, recorded in *Gallic War* 5.48 ·
    **Purpose:** get an order through enemy lines in a script the besiegers might not read · **Helped:** the relief
    of Cicero's camp · **Status:** one-off; a language or script is a lock only against readers who lack it, and it
    cannot be changed

The same lock exists wherever people have wanted to talk in front of strangers. Sixteenth-century English vagrants
spoke a slang called *cant*, which Thomas Harman wrote down in the 1560s in a book meant to warn the public against
them. In 1918 Choctaw soldiers, and in the Second World War Navajo and other Native American soldiers, used their own
languages on the field telephone and the radio; Chapters 11 and 14 tell those stories, and what they do and do not
share with codes.

### Writing itself

Under all of these sits a plainer fact: for most of history, most people could not read. Writing arose independently
in at least three places, Mesopotamia (by about 3300 BC), China (the oldest surviving mature script is on the oracle
bones of the Shang kings, about 1250 BC) and Mesoamerica (by the middle of the first millennium BC), and probably in
Egypt a little after Mesopotamia; the script of the Indus cities, about 2600 to 1900 BC, has never been read. In every
one of these places writing began in the hands of a small class of trained specialists. Scholars guess that
literacy in pharaonic Egypt was one person in a hundred, or a few more. William Harris, in his study *Ancient
Literacy* (1989), argued that in the Roman empire, at its most schooled and urban, it probably did not exceed one in
seven, and was lower in most places. Egyptian schoolbooks praise the scribe's life over every other trade, and the
praise is partly a reminder of what the skill was worth.

That has a consequence for everything else in this chapter. A plain letter in cuneiform or hieratic was already a locked box to
nearly everyone. The danger was not the crowd. It was the few who could read, the scribes, and in many societies the
scribe also read the letter aloud to the person it was meant for, which meant that the reader and the writer's
secrets were always shared with a professional. A king who wanted a letter kept from his scribes needed either a
scribe he trusted completely or a lock the scribe could not pick. That is not an exercise in cryptography. It is
a problem of personnel, and it was often solved by sending the message by mouth.

### Private scripts

Two cases show how a society can lock writing without a king or a general. In the Jiangyong district of Hunan, in
southern China, women wrote and sang in a script called **nüshu**, "women's writing". It is a phonetic script of
a few hundred thin, slanted characters, many of them derived from standard Chinese characters, used to write the local
dialect. Girls learned it from older women and from sworn "sisters". They wrote in it on folded paper books and
fans, in embroidery and in the "third-day letters" that a bride's family sent after a wedding. Men did not learn it,
and in most accounts did not care to read it. Nobody can say how old it is; claims range from the Qing dynasty back
to the Song, and the best-supported accounts put it at several centuries. Whether it was "secret" is a modern
question. The women do not seem to have hidden it, and men were free to read it if they chose. What kept it
private was the plain lack of interest of the people who held power, and the fact that it was a script for women's
speech and women's business. It became known outside Hunan in the early 1980s, when a researcher reported it
to the world. The last woman who had used it all her life, Yang Huanyi (1909 to 2004), died in her nineties, and by
then it was being studied and taught as heritage. Scholars such as Cathy Silber and William Chiang wrote about it in the 1990s.

The second case is **nsibidi**, a system of signs used in the southeast of Nigeria and the nearby Cameroon
borderland, by the Ejagham and neighboring peoples, among them the Efik and the Igbo. It has no single date of origin; European
observers recorded it in the early 1900s, and it is probably much older. It uses abstract
and pictorial signs, cut into calabashes, painted on walls, worked into cloth, or made by hand gestures, and it has
levels. Some signs were openly known; others were reserved to members of the men's **Ekpe** (Leopard) society and
meant nothing to anyone outside it. Enslaved Africans from the region carried it across the Atlantic, and the
Abakuá society in Cuba still uses related signs. It is the nearest thing in this chapter to a restricted script,
and it is a reminder that access to writing was often controlled by membership, not by a mathematical key.

Neither case is a cipher. Both are locks, and both put the point of this section as plainly as it can be put:
secrecy needs a boundary, and for most of history the boundary was a group of people, not a table of letters.

## 1.4 Who wanted to hide what

*Level: beginner.*

Keep asking what people wanted to hide and the answers sort into five groups. They are not equal in the record.

**States and armies.** This is where the surviving ciphers come from, and the chapters that follow are crowded with
them. A king, a general or a council has things to say that an enemy would pay for (where the army is, what it can
afford, who is about to change sides) and has clerks, couriers and money. The Abbasid *barid*, the Roman post and the
Persian Royal Road are all states' machinery. §1.7 comes back to why this skews the evidence.

**Merchants and craftsmen.** The Kanesh archive is a merchant's archive, and what it shows is a business that kept its
letters sealed. The great commercial secrets were not letters but methods, and those were kept by guards and law more
than by writing. The Byzantine historian Procopius tells how in the 550s two monks brought silkworm eggs from the east to the
emperor Justinian hidden in hollow canes, after generations in which the Chinese silk makers had kept their art to
themselves. The glassmakers of Venice were moved to the island of Murano in 1291, and later, according to
tradition, a glassmaker who left the republic risked being hunted down. In 1708 Johann Friedrich Böttger and
Ehrenfried Walther von Tschirnhaus made the first European hard-paste porcelain for Augustus the Strong of Saxony,
and the manufactory at Meissen, founded two years later, kept its recipe under guard; its name for it was the
*arcanum*. The lesson is not that nobody used ciphers for recipes. Somebody did: the oldest known case, a Babylonian
glaze recipe written partly in unusual signs, is in Chapter 2, and later alchemists and craftsmen filled their notebooks with
them. The lesson is that a recipe on paper is a liability. The safest place for a trade secret was a trusted
craftsman's head, a family, or a locked room.

**Priests and scholars.** In Mesopotamia a good deal of learned lore was marked as restricted. Alan Lenzi, in his
study *Secrecy and the Gods* (2008), describes the colophons, the closing notes on cuneiform tablets, that say
the text may be shown to the initiate and not to the uninitiate. Nothing was scrambled; the rule was social. When
learned groups did also scramble their texts, as the Hebrew scribes seem to have done in Jeremiah and the Egyptian priests in
their temples, that is Chapter 2. The Islamic tradition of the "science of letters" (*'ilm al-huruf*), which treated
letters and their numerical values as keys to hidden meaning, is part of the story of Chapter 4, because the first
Arabic writers on codebreaking came out of the same world of language scholarship. Monks and nuns in medieval Europe
who played with ciphers are Chapter 5. In all these cases the difference between *private*, *restricted* and
*secret* is real and worth keeping: a text that only the initiated may read is not a ciphertext.

**Lovers.** Ovid's advice, quoted in §1.2, comes from the third book of the *Art of Love*, which is addressed to
women. The watcher he has in mind is a husband or a guardian. That is not a coincidence. People who most need a
lock are often the people with least power: wives under watch, servants, subjects of a ruler who reads the mail,
minorities. Their records are poor, because they had no archive to keep them in, and the little that survives
tends to have been preserved by accident, as evidence, or by an enemy. The *Kama Sutra*, which lists secret writing
among the arts a woman should know, comes up in Chapter 8, along with the doubts about its date.

**The private person.** Samuel Pepys kept a diary in London from 1660 to 1669. He wrote it in a system of shorthand
by Thomas Shelton, published in the 1620s, and put the most private entries, the ones about his affairs, into a
mixture of French, Spanish, Latin and Italian, to make them harder for his wife, who could glance at the page, or a
servant. The diary was kept among his books at Magdalene College, Cambridge. Nobody read it for over a century
after he died. A Cambridge student named John Smith worked out the shorthand between 1819 and 1822,
and a selection was printed in 1825. A complete text with the cut passages restored had to wait for Robert Latham
and William Matthews's edition of 1970 to 1983. It is a good picture of the weakest kind of lock and how long it can
last: a diary protected by a rare handwriting and a fear of a spouse lasted 150 years, because nobody had a reason
to look.

!!! note "Life story: Pepys's diary"
    **Born:** 1660 to 1669, London, written by Samuel Pepys in Thomas Shelton's shorthand with private passages in
    several languages · **Purpose:** a record for himself, kept from servants and family · **Helped:** historians'
    best eyewitness account of the Restoration, the plague and the Great Fire · **Status:** read since 1822 (John
    Smith's transcription) and complete since the Latham and Matthews edition (1970 to 1983)

## 1.5 The anagram: a secret that proves you were first

*Level: intermediate.*

One more motive, and it is the oddest. In the early seventeenth century, scientists were competing and they wrote
to each other. A man who found something had two bad choices. If he announced it at once, a rival could take the
idea and publish first with a better telescope or a faster pen. If he waited until he was sure, the rival might find
it himself and get the credit. Galileo, Hooke and Huygens each found a third way: announce the discovery in a
sentence of scrambled letters. The letters could be checked once the sentence was revealed, which proved he had
known it at the time, and until then nobody could read it.

Galileo used it first. In the summer of 1610, with a new telescope, he looked at Saturn and saw not one disc but
what looked like three bodies, a central one with a smaller one on each side. He did not want to publish before
checking. In July 1610 he sent Johannes Kepler, in Prague, a string of 37 letters through the Tuscan ambassador:

> SMAISMRMILMEPOETALEUMIBUNENUGTTAUIRAS

Kepler worked at it and, in his own mind, solved it: *Salve umbistineum geminatum Martia proles*, roughly "Hail,
twin companionship, children of Mars". He took it to mean that Galileo had found two moons of Mars. He was wrong
about the meaning, though the letters fit, and his guess about Mars was oddly right: Mars has two small moons, found
in 1877. In mid-November Galileo told him the real sentence: *Altissimum planetam tergeminum observavi*, "I have
observed the highest planet to be triple". (Saturn was the outermost planet then known, hence "highest".)
He did the same in December 1610 for the phases of Venus. The scrambled sentence, *Haec immatura a me iam frustra
leguntur oy*, "these things not yet ripe are now read by me in vain", hid *Cynthiae figuras aemulatur mater amorum*,
"the mother of the loves imitates the shapes of Cynthia" (Venus shows phases like the moon), and he gave the
solution weeks later.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Galileo's scrambled Saturn sentence of 37 letters, its Latin solution, and the letter counts, which are the same" fill="currentColor" font-size="14">
<text x="320" y="24" text-anchor="middle" font-size="13" font-weight="bold">What Galileo sent, 1610 (37 letters)</text>
<text x="34" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="50" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">M</text>
<text x="66" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">A</text>
<text x="82" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">I</text>
<text x="98" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">S</text>
<text x="114" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">M</text>
<text x="130" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="146" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">M</text>
<text x="162" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">I</text>
<text x="178" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">L</text>
<text x="194" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">M</text>
<text x="210" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">E</text>
<text x="226" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">P</text>
<text x="242" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">O</text>
<text x="258" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">E</text>
<text x="274" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="290" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">A</text>
<text x="306" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">L</text>
<text x="322" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">E</text>
<text x="338" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="354" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">M</text>
<text x="370" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">I</text>
<text x="386" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">B</text>
<text x="402" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="418" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="434" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">E</text>
<text x="450" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">N</text>
<text x="466" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="482" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">G</text>
<text x="498" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="514" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">T</text>
<text x="530" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">A</text>
<text x="546" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">U</text>
<text x="562" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">I</text>
<text x="578" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">R</text>
<text x="594" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">A</text>
<text x="610" y="58" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">S</text>
<line x1="26" y1="72" x2="614" y2="72" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="320" y="96" text-anchor="middle" font-size="12" fill-opacity="0.85">same letters, rearranged</text>
<polygon points="320,108 314,98 326,98" fill="currentColor"/>
<text x="320" y="128" text-anchor="middle" font-size="13" font-weight="bold">What he kept</text>
<text x="320" y="152" text-anchor="middle" font-size="15" style="font-family:var(--md-code-font-family,monospace)">ALTISSIMUM PLANETAM TERGEMINUM OBSERVAVI</text>
<text x="320" y="172" text-anchor="middle" font-size="12" fill-opacity="0.85">"I have observed the highest planet to be triple"</text>
<line x1="26" y1="188" x2="614" y2="188" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="40" y="210" text-anchor="middle" font-size="14" font-weight="bold">A</text>
<text x="40" y="230" text-anchor="middle" font-size="14">4</text>
<text x="83" y="210" text-anchor="middle" font-size="14" font-weight="bold">B</text>
<text x="83" y="230" text-anchor="middle" font-size="14">1</text>
<text x="126" y="210" text-anchor="middle" font-size="14" font-weight="bold">E</text>
<text x="126" y="230" text-anchor="middle" font-size="14">4</text>
<text x="169" y="210" text-anchor="middle" font-size="14" font-weight="bold">G</text>
<text x="169" y="230" text-anchor="middle" font-size="14">1</text>
<text x="212" y="210" text-anchor="middle" font-size="14" font-weight="bold">I</text>
<text x="212" y="230" text-anchor="middle" font-size="14">4</text>
<text x="255" y="210" text-anchor="middle" font-size="14" font-weight="bold">L</text>
<text x="255" y="230" text-anchor="middle" font-size="14">2</text>
<text x="298" y="210" text-anchor="middle" font-size="14" font-weight="bold">M</text>
<text x="298" y="230" text-anchor="middle" font-size="14">5</text>
<text x="342" y="210" text-anchor="middle" font-size="14" font-weight="bold">N</text>
<text x="342" y="230" text-anchor="middle" font-size="14">2</text>
<text x="385" y="210" text-anchor="middle" font-size="14" font-weight="bold">O</text>
<text x="385" y="230" text-anchor="middle" font-size="14">1</text>
<text x="428" y="210" text-anchor="middle" font-size="14" font-weight="bold">P</text>
<text x="428" y="230" text-anchor="middle" font-size="14">1</text>
<text x="471" y="210" text-anchor="middle" font-size="14" font-weight="bold">R</text>
<text x="471" y="230" text-anchor="middle" font-size="14">2</text>
<text x="514" y="210" text-anchor="middle" font-size="14" font-weight="bold">S</text>
<text x="514" y="230" text-anchor="middle" font-size="14">3</text>
<text x="557" y="210" text-anchor="middle" font-size="14" font-weight="bold">T</text>
<text x="557" y="230" text-anchor="middle" font-size="14">3</text>
<text x="600" y="210" text-anchor="middle" font-size="14" font-weight="bold">U</text>
<text x="600" y="230" text-anchor="middle" font-size="14">4</text>
</svg>
<figcaption>Figure 1.3. Galileo's Saturn anagram of 1610 and its solution have the same letter counts, with U and V counted together, as Latin of the time did. Anyone given the solution can check it against the scrambled string; nobody could read the string without the solution.</figcaption>
</figure>

The check can be done by anyone with a pencil, or with ten lines of Python. Count the letters in the scrambled string, count
the letters in the claimed solution, and compare. Because Latin in 1610 used one letter for both U and V and one for
I and J, the program folds them together.

```python
from collections import Counter

def letters(text):
    # u and v were one letter in 1610 Latin, and so were i and j
    text = text.lower().replace("v", "u").replace("j", "i")
    return Counter(c for c in text if c.isalpha())

claims = [
    ("Galileo, Saturn, 1610", "smaismrmilmepoetaleumibunenugttauiras",
     "Altissimum planetam tergeminum observavi"),
    ("Kepler's reading of it", "smaismrmilmepoetaleumibunenugttauiras",
     "Salve umbistineum geminatum Martia proles"),
    ("Galileo, Venus, 1610", "Haec immatura a me iam frustra leguntur oy",
     "Cynthiae figuras aemulatur mater amorum"),
    ("Hooke, springs, 1676", "ceiiinosssttuv", "Ut tensio sic vis"),
    ("Huygens, Saturn, 1656",
     "aaaaaaa ccccc d eeeee g h iiiiiii llll mm nnnnnnnnn oooo pp q rr s ttttt uuuuu",
     "Annulo cingitur tenui plano nusquam cohaerente ad eclipticam inclinato"),
    ("a wrong solution", "ceiiinosssttuv", "Ut tensio sic vires"),
]
for name, scrambled, solution in claims:
    print(name, "->", letters(scrambled) == letters(solution))
```

Everything prints `True` except the last line, which is a solution that does not fit. Two things stand out. Kepler's
reading fits the same letters as Galileo's, which shows the weakness of the method: the scrambled string does not
tie the author to one sentence. A dishonest author, or an honest one who had changed his mind, could pick any
sentence with the right letters, and the 37 letters of the Saturn anagram have more than one. It binds the author
loosely, and it hides the message loosely, since a clever reader can guess. A modern scheme for the same job, a
**commitment** built from a hash function ([Chapter 9](../../book/09-Hash-Functions.md) of the cryptography book), does
both properly: it is practically impossible to find a different sentence with the same fingerprint, and the
fingerprint tells you nothing about the sentence. A letter count is a fingerprint too, only a very weak one.

Hooke did it in 1676. At the end of his *Description of Helioscopes* he printed *ceiiinosssttuv* and said it contained
the true theory of elasticity. He gave the answer in 1678: *ut tensio, sic vis*, "as the extension, so the force",
which we know as Hooke's law. Christiaan Huygens, who in 1655 discovered Saturn's large moon, put the shape of the
planet's mysterious companions in an anagram in 1656 and gave the solution in 1659: *Annulo cingitur, tenui, plano,
nusquam cohaerente, ad eclipticam inclinato*, "it is girdled by a thin, flat ring, nowhere touching it, inclined to
the ecliptic". The ring was what Galileo's telescope had shown him as two handles, and Galileo's "triple" had described what he saw and misread what it was. Isaac Newton, in a letter of 1676 to Leibniz sent through
Henry Oldenburg of the Royal Society, put the heart of his method of fluxions into the same sort of scrambled
string of letters and numbers, and the question of who had the calculus first became, a generation later, one of the
most bitter priority fights in the history of science.

!!! note "Life story: Galileo's anagram of Saturn, 1610"
    **Born:** July 1610, Galileo Galilei in Florence, sent to Kepler in Prague through the Tuscan ambassador, with
    the solution given in November · **Purpose:** claim a discovery (Saturn's "triple" form) without revealing it
    and without handing a rival the chance to publish first · **Helped:** priority in the discovery of Saturn's
    appendages, and, with the Venus anagram of December 1610, in the phases of Venus; Hooke and Huygens used the
    same device afterwards · **Status:** retired; replaced by dated letters, sealed packets and, later, journals
    that print the date of receipt

A more formal form of the same idea lasted much longer. From the 1700s, the Paris Academy of Sciences accepted
**sealed packets** (*plis cachetés*): an author would deposit a sealed envelope with a note of a result, which the
academy kept unopened until the author asked for it, or until a court asked. The practice went on into the twentieth
century. The most famous packet belongs to Wolfgang Doeblin, a young French probabilist, the son of the German
novelist Alfred Döblin, who left Germany with his family in 1933 and served as a telephone operator in the French army in 1940.
In February 1940, at the front, he wrote a long paper on the theory of diffusion processes and mailed it, sealed,
to the Academy. In June, with German troops about to capture his unit, he took his own life. The envelope sat in the
Academy's archive for sixty years. It was opened in May 2000, and what was in it turned out to be an important
piece of work, years ahead of its time in the mathematics of random processes.

!!! note "Life story: Doeblin's sealed packet"
    **Born:** February 1940, Wolfgang Doeblin, a French army telephone operator and mathematician, sent a sealed
    paper to the Paris Academy of Sciences · **Purpose:** put on record, safely, a result that might be lost with
    its author · **Helped:** after it was opened in May 2000, the work was recognized as an early and original
    contribution to the theory of diffusion · **Status:** the sealed-packet practice is rare today, replaced by
    timestamped preprints

Why does this belong in a history of secret writing? Because it shows that secrecy has more than one purpose. These
scientists were not hiding from an enemy. They wanted to say something, and hold back the content, and have a way
later to prove when they said it. The same three problems, hide the message, bind the author, prove the time, come
back in the book in the chapters on public-key signatures, hash functions and certificates, and the modern commitment
schemes and timestamps descend from the anagram and the sealed packet more than from any military cipher.

## 1.6 What "secret writing" meant before Kerckhoffs

*Level: intermediate.*

The modern rule is simple to state. Assume the enemy knows how your system works and has some of your traffic; let
the strength rest on a short key that you can change. Almost nothing before the middle of the nineteenth century was
built that way, and the gap says a lot about what people thought they were doing.

### Who is the enemy?

Ask of any old lock: against whom? Figure 1.4 sorts four kinds of reader against four of the locks in this chapter.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A grid of four kinds of reader against four old locks: plain writing, an odd script or other tongue, a seal, and a simple cipher; only a state office reads all four" fill="currentColor" font-size="14">
<text x="10" y="30" font-size="13" font-weight="bold">Reader</text>
<text x="330" y="22" text-anchor="middle" font-size="12" font-weight="bold">Plain</text>
<text x="330" y="38" text-anchor="middle" font-size="12" font-weight="bold">writing</text>
<text x="420" y="22" text-anchor="middle" font-size="12" font-weight="bold">Odd script,</text>
<text x="420" y="38" text-anchor="middle" font-size="12" font-weight="bold">other tongue</text>
<text x="510" y="22" text-anchor="middle" font-size="12" font-weight="bold">Seal or</text>
<text x="510" y="38" text-anchor="middle" font-size="12" font-weight="bold">envelope</text>
<text x="600" y="22" text-anchor="middle" font-size="12" font-weight="bold">Simple</text>
<text x="600" y="38" text-anchor="middle" font-size="12" font-weight="bold">cipher</text>
<line x1="10" y1="48" x2="630" y2="48" stroke="currentColor" stroke-width="1.2"/>
<text x="10" y="86" font-size="13">Cannot read at all</text>
<circle cx="330" cy="82" r="8" fill="currentColor"/>
<circle cx="420" cy="82" r="8" fill="currentColor"/>
<circle cx="510" cy="82" r="8" fill="currentColor"/>
<circle cx="600" cy="82" r="8" fill="currentColor"/>
<line x1="10" y1="107" x2="630" y2="107" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="136" font-size="13">Literate, no training in tricks</text>
<circle cx="330" cy="132" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="420" cy="132" r="8" fill="currentColor"/>
<circle cx="510" cy="132" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M 510 124 A 8 8 0 0 0 510 140 Z" fill="currentColor"/>
<circle cx="600" cy="132" r="8" fill="currentColor"/>
<line x1="10" y1="157" x2="630" y2="157" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="186" font-size="13">A trained decipherer</text>
<circle cx="330" cy="182" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="420" cy="182" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="510" cy="182" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M 510 174 A 8 8 0 0 0 510 190 Z" fill="currentColor"/>
<circle cx="600" cy="182" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<line x1="10" y1="207" x2="630" y2="207" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="236" font-size="13">A state office with clerks and time</text>
<circle cx="330" cy="232" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="420" cy="232" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="510" cy="232" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="600" cy="232" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<line x1="10" y1="257" x2="630" y2="257" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<circle cx="30" cy="272" r="8" fill="currentColor"/>
<text x="46" y="276" font-size="12">stopped</text>
<circle cx="150" cy="272" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M 150 264 A 8 8 0 0 0 150 280 Z" fill="currentColor"/>
<text x="166" y="276" font-size="12">gets in, leaves a trace</text>
<circle cx="350" cy="272" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="366" y="276" font-size="12">reads it</text>
</svg>
<figcaption>Figure 1.4. Four kinds of reader against four old locks. Filled circle: the lock stops this reader. Half-filled: the reader gets in but leaves a trace. Open circle: the reader gets in with no trouble. A state office with time and clerks reads everything on the list.</figcaption>
</figure>

The figure shows why weak locks lasted. In rows one and two, which is nearly everyone who ever handled a letter,
every lock but plain writing works. A servant who cannot read is stopped by the plain writing itself. A clerk who can read, but has
never seen a cipher and has no reason to spend an evening on a page of nonsense, is stopped by a scrambled
alphabet. For centuries the realistic enemy was one of those two, so a simple substitution held, and the man who
used it was not foolish.

The picture changes in rows three and four, and the date it changes is different in different places. In Baghdad it
was by the ninth century, when al-Kindi wrote down how to count letters (Chapter 4). In Italy it was the fifteenth
century, when the permanent embassy of one city in another created a profession of reading other people's
dispatches (Chapter 6). In the Habsburg and French courts it came in the 1600s and 1700s with the black chambers,
which opened every foreign embassy's letters each morning and put the copies in the hands of trained
decipherers (Chapter 9). A state office, row four, has a decipherer, time and a copy of the seal. Against it a simple
cipher gives nothing at all. The cipher's whole history after 1500 is an attempt to build a lock for row four.

### How long must it hold?

A second question matters as much: for how long? Secrets differ in shelf life. The cipher on an order for tomorrow's
march only has to hold until tomorrow, and a cipher that takes the enemy a week to solve is perfectly good for it.
A siege dispatch has to hold for days. An ambassador's report on a king's illness has to hold for months. The terms of a
marriage treaty hold for years, and the name of a long-term agent for the agent's lifetime, perhaps longer. A
craftsman's recipe is meant to hold for generations. A good cipher costs a good deal of effort to write and read,
and a sensible user paid only for the time he needed. Much of what looks to a modern eye like carelessness was a
choice. The mistake came when a message that needed to hold for decades was written in a system that held for days,
and the enemy filed it away until the key fell. That mistake is as old as ciphers and as new as the question
about quantum computers in Chapter 19.

### Method and key were one thing

The second gap is that for most of this history nobody separated the method from the key. Suetonius says that Julius
Caesar shifted each letter three places and that Augustus shifted by one. Each had a *method* and no key to speak of:
the shift was the whole system, it never changed, and anyone who learned the shift read everything. The nomenclators
of the fifteenth-century chanceries, and the great cipher tables of the seventeenth century, were bigger, but they
too were fixed objects, copied by hand and carried by courier, and the tables stayed in force for years because
replacing them meant sending a new table to every ambassador.

The idea that this was a flaw, and that a system should be built to survive its method being known, comes late.
Francis Bacon in 1623 listed three properties of a good cipher: that it be easy to write and to read; that it be
safe against decipherment; and, if possible, that it raise no suspicion. The third is steganography's
requirement, and the first is a user's. The second needs a definition of safe, and Bacon does not give one. In his
own cipher, the *bilateral* cipher, each letter is written as a group of five A's and B's and then hidden in a text
set in two slightly different typefaces, so it is a cipher and steganography at once, and that is exactly the
blurring §1.2 warned about.

The rule was written down in 1883 by Auguste Kerckhoffs, a Dutch-born professor of languages teaching in Paris, in
*La cryptographie militaire*, at a time when armies had begun to use ciphers in the field and had to assume their
equipment would be captured. The chapter on it in [the cryptography book](../../book/01-What-Cryptography-Is-For.md)
sets out the six requirements; Chapter 10 of this book tells where they came from. The one thing to carry forward
from here is the contrast. Before Kerckhoffs, a cipher was a method you hoped the enemy would not learn. After him, it
was a method the enemy was assumed to know, with a key small enough to change.

### By hand: what a lock is worth

A shift cipher has 25 usable keys, so a clerk who tries each key at a minute apiece is done by lunch. That is what "a weak lock" means: not that it has no strength, but that
the enemy's work is counted in minutes. A random substitution, in which every letter has its own substitute, has
$26! \approx 4 \times 10^{26}$ keys; nobody can try them all. But the Baghdad scholar, and any child with a pencil, breaks
it in an afternoon by counting letters, because each plain letter always becomes the same cipher letter, and
English has an *e* at its heart. The number of keys told the clerks nothing about how hard the job was, and it
still tells beginners nothing today. Chapter 2 of the Cryptanalysis book teaches how the counting works; §1.9 does
the arithmetic.

## 1.7 How we know anything

*Level: intermediate.*

Everything in the book after this chapter rests on evidence, and evidence for secret writing has a built-in problem:
the people who wrote it did not want it found. The chapters that follow flag where the sources are thin. This
section says in general what kinds there are, how far each can be trusted, and what is missing.

### A ladder of sources

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Five rungs of evidence for old secret writing, from the object itself to a modern theory, each with examples and what it can and cannot tell" fill="currentColor" font-size="14">
<rect x="8" y="8" width="624" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="20" y="29" font-size="13" font-weight="bold">1  The object itself</text>
<text x="250" y="29" font-size="12">clay envelopes at Kanesh, the Djeme potsherd, a ciphered letter in an archive</text>
<text x="250" y="48" font-size="12" fill-opacity="0.85">tells that it was done; cannot tell why or how</text>
<rect x="8" y="68" width="624" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="20" y="89" font-size="13" font-weight="bold">2  A witness</text>
<text x="250" y="89" font-size="12">Herodotus, Caesar, Pepys</text>
<text x="250" y="108" font-size="12" fill-opacity="0.85">tells why, in his own words; may be told wrongly, or telling a story</text>
<rect x="8" y="128" width="624" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="20" y="149" font-size="13" font-weight="bold">3  A manual by a practitioner</text>
<text x="250" y="149" font-size="12">Aeneas Tacticus, al-Kindi, Alberti, al-Qalqashandi</text>
<text x="250" y="168" font-size="12" fill-opacity="0.85">tells the method; may describe what ought to be done, not what was</text>
<rect x="8" y="188" width="624" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="20" y="209" font-size="13" font-weight="bold">4  A later writer about earlier days</text>
<text x="250" y="209" font-size="12">Plutarch on the skytale; Arabic authors on the Sasanian kings</text>
<text x="250" y="228" font-size="12" fill-opacity="0.85">tells that a tradition was remembered; cannot be checked</text>
<rect x="8" y="248" width="624" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="20" y="269" font-size="13" font-weight="bold">5  A modern theory</text>
<text x="250" y="269" font-size="12">the date of the Kama Sutra; what the Voynich manuscript says</text>
<text x="250" y="288" font-size="12" fill-opacity="0.85">tells what fits the evidence; cannot be proved</text>
</svg>
<figcaption>Figure 1.5. Five kinds of evidence for old secret writing, from the object itself to a modern guess. Each one tells something the next cannot, and each has a blind spot.</figcaption>
</figure>

1. **The thing itself.** A clay envelope with its seals, a tablet from Kanesh, an inscription carved in cipher, a
   potsherd with a cipher alphabet scratched on it, a letter in an archive with its ciphered passages. This is the
   best evidence that something was done, and the worst on why: an object does not explain itself, and a cipher
   is, by design, an object that does not.
2. **A witness.** Herodotus on the scalp, Caesar on the javelin, Pepys on his own diary. A witness tells you why, in
   his own words. He may have it from a friend, may be telling a story, or may be defending himself. Herodotus is the
   standing example: he wrote down what he was told, was not always told the truth, and wrote the first account that
   survives of many things.
3. **A manual by someone who did it.** Aeneas Tacticus on siege signals, al-Kindi on breaking ciphers, Alberti on his disk,
   al-Qalqashandi on the ciphers of the Mamluk chancery. This tells you the method and what the writer thought mattered.
   It does not tell you what was used in practice. A manual can describe what ought to be done, and a treatise
   can be a work of scholarship that nobody ever applied.
4. **A later writer about an earlier time.** Plutarch, writing centuries later, on the Spartan skytale; Arabic
   authors, centuries after the Sasanian kings, on the secret script of the Sasanian chancery. This shows that a tradition
   was remembered, and sometimes that it was wanted. It cannot be checked, and it may be wrong.
5. **A modern theory.** When the *Kama Sutra* was written, whether a certain plan of a Japanese general was ever
   used, what the Voynich manuscript says. A modern account that is honest about its guesses is worth reading. One that
   is not is a story.

The ladder shows what to ask of any claim in this book: which rung does it stand on? The chapters mark the claims
that stand on rungs four and five, and the sentence usually says so.

### What survives and what does not

Four things bend the record, and all four are systematic.

**We know ciphers because someone broke them.** A cipher that was never read leaves nothing but ciphertext, which
nobody keeps. The cipher keys, tables and letters that survive for the period before 1800 are mostly in the files of the
people who intercepted them. Mary, Queen of Scots, has left a key to her cipher because her enemies copied it, and
her letters because her enemies filed them. Many surviving Venetian ciphers are in the state archive in Venice, where the
republic kept its own. The record is of use and, still more, of abuse.

**Secrecy destroyed its own evidence.** A cipher office that wanted its tables safe burned the old ones.
When a state fell, the first thing its successors did was often to seize and read the archive of its ciphers, or to
destroy it. Where we have a rich record, it is usually because an office was captured intact, or because a
long-lived republic, church or empire had a habit of keeping everything.

**Texts live only if people copy them.** Before printing, a text was copied by hand, and a text on a technical
subject was copied only while someone cared. The Arabic scholar al-Khalil is said to have written a book on
cryptograms in the 700s; it is lost, and we know of it only because later writers refer to it. A great deal of
what we know about the Arab cryptologic tradition was, until the 1980s, known to Western historians only in
excerpts, because the manuscripts were in libraries in Istanbul and elsewhere that few cryptologic historians could
read (Chapter 4).

**The historians have their own limits.** A history of secret writing is made by people who can read the
sources, and for most of the twentieth century those were mostly people who read Greek, Latin and the major
European languages. Where the record is in Arabic, Persian, Ottoman Turkish, classical Chinese, Sanskrit, Japanese or
Korean, it has been read by far fewer people with an interest in ciphers. The effect is that the history of
Europe's ciphers is better known than the evidence strictly warrants, and the history of everyone else's less well
known than it is. When a chapter of this book says "the sources are thin", it often means *thinly read*.

There is a fifth bend that belongs to the whole subject and not to any period. The history of breaking is made of
secrets kept after the war was over. The British broke the German Enigma during the Second World War and kept the
fact secret until 1974. A history published before that date, even a very good one, got the war wrong. David
Kahn's *The Codebreakers* (1967) is the foundation of everything here and appeared seven years before Ultra
became public.

!!! note "Life story: *The Codebreakers*, 1967"
    **Born:** 1967, Macmillan, New York; the author, David Kahn (1930 to 2024), a journalist and later a historian,
    had been interested in ciphers since childhood · **Purpose:** to tell the whole history of secret writing from
    ancient Egypt to the NSA · **Helped:** made the history of cryptology a field of its own, and pulled into the open
    a great deal of material that governments had not wanted discussed; the NSA is reported to have considered
    trying to stop its publication · **Status:** still the standard reference, revised in 1996; its account of the
    Second World War and the Cold War has been overtaken by declassified documents, and its coverage of
    the world outside Europe and the United States was thin

### Is it a cipher at all?

The last problem is a sorting problem. A text that nobody can read might be a cipher, a rare script, a private
shorthand, a game, a forgery, or a text in a language we have lost. Three tests, asked in order, help.

1. *Is there a text?* A sequence of signs that behaves like writing: it repeats, it is not random.
2. *Did the writer mean to hide it?* There needs to be evidence of intent: a source that says so, a context where a
   secret was wanted, a method that is unnecessary for any other purpose.
3. *Is there a rule that turns it into something readable?* If so, and a reader can verify it, it is a cipher or a
   code. If there is a rule but no evidence of intent, it may be a convention, a pun or a display of learning.

The test mostly shows how few cases pass all three. The most famous failure is the **Voynich manuscript**, a book of
about 240 vellum pages in a script nobody knows, with drawings of plants, many of which match no known species, charts of stars
and bathing women. It is in the Beinecke Library at Yale (MS 408), and the antiquarian bookdealer Wilfrid Voynich bought it
in 1912. In 2009 radiocarbon dating at the University of Arizona put the vellum at 1404 to 1438. Test one: it
looks like text. Test two: nobody knows whether the writer meant to hide anything; the drawings may suggest a
herbal or a medical book, and a person who writes such a book may not want to hide it. Test three: no rule has ever been
found that a second reader could verify. Every few years someone announces a solution, and each one has failed the
third test. It remains a good reminder that "cannot read" does not mean "cipher", and that a long run of failed
attempts is also evidence.

## 1.8 Two threads

*Level: beginner.*

The rest of the book keeps coming back to two ideas. They are simple to say and they explain most of what follows.

**Makers trusted; breakers proved.** Nobody has ever been able to prove a practical cipher secure by looking at it. What
we have always had instead is a reputation, and a reputation is made only by failure to break. For three centuries the
keyword cipher that now carries Vigenère's name was called *le chiffre indéchiffrable*, the indecipherable cipher,
because nobody who tried it in print had cracked it; then Babbage and Kasiski did (Chapter 10). The Germans believed in
Enigma for the same reason, and for the same reason were wrong (Chapter 12). When the Data Encryption Standard
appeared in 1977, the argument over whether it was strong went on for twenty years, and what ended it was a machine
(Chapter 16). In each case the breakers are the ones who made the knowledge. A cipher is as strong as the best
attack on it that anyone has published, or that someone has not.

**The weak point is rarely the mathematics.** Cipher histories are mostly stories of locks that worked and doors
that did not. A short table, to be read as a preview and not a summary:

| The story | What was meant to protect it | What actually failed | Where |
|---|---|---|---|
| Mary, Queen of Scots, 1586 | a nomenclator cipher | the courier route, which her enemies controlled | Chapter 9 |
| The Zimmermann telegram, 1917 | a diplomatic code | a code book already partly known to the readers, and a message sent over a channel the enemy tapped | Chapter 11 |
| Enigma, 1930s to 1945 | a machine with an astronomical key space | the way operators chose and sent their daily settings | Chapter 12 |
| Soviet spy traffic, 1940s | one-time pads, which cannot be broken | pad pages printed twice, then used twice | Chapter 14 |
| DES, 1977 to 1998 | a well-designed cipher | a key of only 56 bits | Chapter 16 |
| Dual_EC_DRBG, 2000s | a standard random number generator | a suspected back door in its constants | Chapter 18 |

Each row will be told fully in its own place. The point here is the pattern. In six very different cases, the fault was
at the courier, the clerk, the key length or the random numbers. It was almost never at the cipher's heart.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="The book in four parts with chapters, a famous break and a recurring weak point for each" fill="currentColor" font-size="14">
<rect x="6" y="8" width="150" height="274" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="81" y="32" text-anchor="middle" font-size="14" font-weight="bold">Part I</text>
<text x="81" y="50" text-anchor="middle" font-size="12">to about 1400</text>
<text x="81" y="68" text-anchor="middle" font-size="12" fill-opacity="0.85">Chapters 1 to 4</text>
<line x1="16" y1="78" x2="146" y2="78" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="81" y="98" text-anchor="middle" font-size="12">Egypt, Greece,</text>
<text x="81" y="114" text-anchor="middle" font-size="12">Rome, Baghdad</text>
<text x="81" y="150" text-anchor="middle" font-size="12" font-weight="bold">A break</text>
<text x="81" y="168" text-anchor="middle" font-size="12">al-Kindi counts</text>
<text x="81" y="184" text-anchor="middle" font-size="12">letters, c. 850</text>
<text x="81" y="222" text-anchor="middle" font-size="12" font-weight="bold">The weak point</text>
<text x="81" y="240" text-anchor="middle" font-size="12">a method that</text>
<text x="81" y="256" text-anchor="middle" font-size="12">never changed</text>
<rect x="164" y="8" width="150" height="274" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="239" y="32" text-anchor="middle" font-size="14" font-weight="bold">Part II</text>
<text x="239" y="50" text-anchor="middle" font-size="12">800 to 1800</text>
<text x="239" y="68" text-anchor="middle" font-size="12" fill-opacity="0.85">Chapters 5 to 9</text>
<line x1="174" y1="78" x2="304" y2="78" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="239" y="98" text-anchor="middle" font-size="12">Europe's courts and</text>
<text x="239" y="114" text-anchor="middle" font-size="12">the wider world</text>
<text x="239" y="150" text-anchor="middle" font-size="12" font-weight="bold">A break</text>
<text x="239" y="168" text-anchor="middle" font-size="12">Phelippes reads</text>
<text x="239" y="184" text-anchor="middle" font-size="12">Mary's letters, 1586</text>
<text x="239" y="222" text-anchor="middle" font-size="12" font-weight="bold">The weak point</text>
<text x="239" y="240" text-anchor="middle" font-size="12">couriers, and</text>
<text x="239" y="256" text-anchor="middle" font-size="12">keys kept too long</text>
<rect x="322" y="8" width="150" height="274" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="397" y="32" text-anchor="middle" font-size="14" font-weight="bold">Part III</text>
<text x="397" y="50" text-anchor="middle" font-size="12">1800 to 1945</text>
<text x="397" y="68" text-anchor="middle" font-size="12" fill-opacity="0.85">Chapters 10 to 14</text>
<line x1="332" y1="78" x2="462" y2="78" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="397" y="98" text-anchor="middle" font-size="12">Wires, radio,</text>
<text x="397" y="114" text-anchor="middle" font-size="12">machines</text>
<text x="397" y="150" text-anchor="middle" font-size="12" font-weight="bold">A break</text>
<text x="397" y="168" text-anchor="middle" font-size="12">Rejewski and</text>
<text x="397" y="184" text-anchor="middle" font-size="12">Bletchley Park</text>
<text x="397" y="222" text-anchor="middle" font-size="12" font-weight="bold">The weak point</text>
<text x="397" y="240" text-anchor="middle" font-size="12">operators' habits,</text>
<text x="397" y="256" text-anchor="middle" font-size="12">reused pads</text>
<rect x="480" y="8" width="150" height="274" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="32" text-anchor="middle" font-size="14" font-weight="bold">Part IV</text>
<text x="555" y="50" text-anchor="middle" font-size="12">1945 to today</text>
<text x="555" y="68" text-anchor="middle" font-size="12" fill-opacity="0.85">Chapters 15 to 19</text>
<line x1="490" y1="78" x2="620" y2="78" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
<text x="555" y="98" text-anchor="middle" font-size="12">Mathematics, open</text>
<text x="555" y="114" text-anchor="middle" font-size="12">research, internet</text>
<text x="555" y="150" text-anchor="middle" font-size="12" font-weight="bold">A break</text>
<text x="555" y="168" text-anchor="middle" font-size="12">Deep Crack finds a</text>
<text x="555" y="184" text-anchor="middle" font-size="12">DES key, 1998</text>
<text x="555" y="222" text-anchor="middle" font-size="12" font-weight="bold">The weak point</text>
<text x="555" y="240" text-anchor="middle" font-size="12">short keys, bugs,</text>
<text x="555" y="256" text-anchor="middle" font-size="12">bad random numbers</text>
</svg>
<figcaption>Figure 1.6. The book in four parts. Each part has a famous break and a recurring weak point. The dates overlap because the stories do.</figcaption>
</figure>

### How to read the rest

The chapters run in order, and each stands alone. They are not all the same length of story: Chapters 5 and 8 are
thinner than the rest because the sources are, and they say so. The **Try it** and **Break it** boxes ask you to
decrypt something with a pencil, so that you feel the work the historical breaker did; the Python in each chapter does
the same job faster, and uses only the standard library. The **In the real world** boxes say what the sources show
and what they do not. The **Life story** cards give, for a person, a cipher, a machine or an event, when it started, what it
was for, what it made possible and how it ended. For words you do not know, there is the glossary; for the
technical side of breaking, [the Cryptanalysis book](../cryptanalysis/01-What-Cryptanalysis-Is.md) is the companion.

A last note on method. Where this book says a date or an attribution is disputed, it says so in the same sentence, not in a footnote.
Where it names a person who did the work, including the many women whose names the older histories dropped, it
tries to use the name the record gives. You will meet them at Kanesh in the clay, at Bletchley in the huts, and in
the Coast Guard's offices in the 1920s.

## 1.9 Going deeper

*Level: expert.*

**Shannon's three kinds of system.** The three-way split of §1.2 is old, but there is a more careful one in the
paper that founded the mathematics of the subject. In "Communication Theory of Secrecy Systems" (1949), Claude
Shannon divides secrecy systems into three. *Concealment systems* hide that a message exists: invisible ink, a
message inside an innocent text. *Privacy systems* need special equipment to recover the message, such as speech
inversion. *True secrecy systems* hide the meaning, by cipher or code, although the existence of the message is not
hidden. He then sets the first two aside, the first as mostly a matter of psychology and the second as mostly one of
technology, and builds his mathematics only on the third. That is the line this book draws too, but this chapter has had to cross it, because
the history of the first two is where most of the real secrecy was. Shannon also treats code and cipher together as
the same kind of object, and he is right to, as the next point shows.

**A code is a cipher on a big alphabet.** Think of a cipher as an invertible map from units of plaintext to units of
ciphertext, chosen by a key. For a substitution cipher the units are letters, there are 26 of them, and the key is a
permutation of 26 symbols. A code is the same thing with the units made larger: 100,000 words and phrases, each
standing for a five-digit group, and the key is a permutation of 100,000 symbols. Mathematically there is no
difference; the *practical* differences come from what the key is. A permutation of 26 symbols fits in a head; a
permutation of 100,000 is a book. The first can be changed in a moment, the second takes a printing. The first is
attacked by counting letters, the second by counting words and phrases and reasoning about what they mean, which is slower
but, with enough text, just as certain. The program below puts numbers on all of this.

```python
import math

# How many keys? The key is a permutation of the units.
print("shift cipher keys:", 25)
print("substitution keys:", math.factorial(26))
print("  that is about 2 to the", round(math.log2(math.factorial(26)), 1))

# A codebook of 100,000 entries: any entry could have any five-digit group.
n = 100000
bits = math.lgamma(n + 1) / math.log(2)        # log2 of n!, without building n!
print("codebook keys: about 2 to the", round(bits))
print("  a book of that many bits is about", round(bits / 8 / 1000), "kilobytes")
```

The output says that a shift cipher has 25 keys, a random substitution has $26! = 403{,}291{,}461{,}126{,}605{,}635{,}584{,}000{,}000$
keys (about $2^{88}$), and a codebook of 100,000 entries has about $2^{1{,}516{,}704}$ keys. The numbers are of
different kinds. The first is something a person can try. The second is not, and yet it falls to a pencil. The third is so
large that it is not a number anyone can use, and what matters is not its size but how easily it is lost: the key is
a stack of paper that has to be stored, printed, carried and not captured. A cipher's strength is one thing, and its key's logistics are another. Most
of the history of codes is a history of logistics.

**What counts as a cipher? The historian's problem.** The three tests of §1.7 are easy to state and hard to apply.
Here is a hard case. The Book of Revelation gives the number of the beast as 666. A reading proposed in the
nineteenth century takes it as a cryptic way of writing "Nero Caesar", the emperor who persecuted Christians, in Hebrew letters, which
carry numerical values. Add them:

```python
# Hebrew letter values (gematria): the letters of "Nero Caesar" in Hebrew spelling.
value = {"נ": 50, "ן": 50, "ר": 200, "ו": 6, "ק": 100, "ס": 60}
nero_caesar = "נרון קסר"          # NRWN QSR, with the final nun of Nero
nero_short = "נרו קסר"            # the same without the final nun, as in Latin "Nero"
print(sum(value[c] for c in nero_caesar if c in value))
print(sum(value[c] for c in nero_short if c in value))
```

The program prints `666` and then `616`. That second number matters: some early manuscripts of Revelation read
616, not 666, and that is the figure you get from the Latin spelling of the name. A variant like that would be
natural if the number was a name that readers were supposed to work out. It is the standard explanation among
historians, but it is not proved. It passes test one, and fits tests two and three only if John meant to
conceal the name from the Roman authorities rather than pose a riddle to his readers, and the text does not say which.
It is a cipher only if a reader was supposed to be unable to see it. That is a fact about a
mind, and the evidence for it is one sentence. The problem recurs through the book: the Spartan skytale (Chapter 3),
where Thomas Kelly argued in 1985 that it was a token of authority and not a cipher; Egyptian "cryptographic" writing,
which may have been display more than secrecy (Chapter 2); the *Kama Sutra*'s secret writing (Chapter 8). In
each case we have a rule and are asking about intent.

**Open questions.** Four are worth carrying. *Why did cultures with long literate traditions, Greece and Rome
among them, build ciphers and not a cryptanalysis?* The answer in Chapters 3 and 4 is probably that nobody needed
one, and that the Arab world did, because a large literate bureaucracy that wrote in a language of scholars gave
people both the means and the motive. *How far did the Arab method travel?* Whether Italy's first breakers learned from Arabic
sources, or found it again, is disputed (Chapters 4 and 6). *What is missing from the record?* Byzantium, Persia
before Islam, Mughal India, Korea before modern times and much of Africa have almost no direct evidence for ciphers,
and it is an open question whether they used them little or whether the record is empty. *Where does writing stop and secret
writing begin?* The Inca *khipu*, knotted cords that carried records, were not a cipher, but they are the best
example of a record that its makers could read and nobody now can. Chapter 19 returns to them.

## Check yourself

??? question "1. Name the four places where a message can be read between writer and reader, and one old defense for each."

    The draft (a scribe, clerk or servant sees it; defense: write it yourself, or use a scribe you trust completely),
    the courier (searched or bribed; defense: have him learn it by heart, or hide it on him), the road (guards,
    stations, ports; defense: seal it, or scramble it) and the arrival and the archive afterward (a rival in the
    file room, or an enemy who captures the papers; defense: burn old copies and old keys).

??? question "2. Classify each as steganography, code or cipher: (a) the BBC's Verlaine lines of June 1944; (b) a note written in milk; (c) every letter moved five places on; (d) Caesar's letter to Quintus Cicero in Greek characters."

    (a) A code: a prearranged phrase with an agreed meaning. (b) Steganography: it hides that anything is written.
    (c) A cipher. (d) None of the three exactly: a lock that depends on a script the enemy might not read. It is closest to
    steganography, because its security rests on the enemy not knowing how to read it, but the enemy can see that
    it is a letter.

??? question "3. Why can a codebook refuse to send MEET AT NOON when a shift cipher sends it without trouble?"

    A code only has groups for what is in the book; there is no entry for "NOON". A cipher works on letters,
    so it can carry any word, planned or not. That flexibility is what a cipher buys at the cost of speed and of
    letting the language's letter habits show through.

??? question "4. Decrypt `WKLV LV D WHVW`, given that the key of this shift cipher is 3."

    Move each letter back three places: W to T, K to H, L to I, V to S. The message is `THIS IS A TEST`.

??? question "5. A Kanesh clay envelope gives integrity and authenticity, and only a weak kind of confidentiality. Explain."

    The seals show that the envelope is whole and whose they are, so it proves nobody changed or replaced the tablet and
    who sent it. But it does not scramble anything: anyone willing to break it can read the tablet, and the only thing
    stopping them is that the break would be seen. That is confidentiality that depends on nobody being willing to be
    caught.

??? question "6. Kepler's reading of Galileo's anagram used the same 37 letters as Galileo's own. What does that tell you about anagrams as a way to claim a discovery, and what property do hash-based commitments have that anagrams lack?"

    It shows that an anagram does not bind the author to one sentence: several sentences have the same letters, so
    the author could in principle choose among them after the fact, and a reader could guess a wrong one that
    fits. A commitment built from a hash function is **binding** (practically impossible to find a second message with
    the same fingerprint) and **hiding** (the fingerprint reveals nothing about the message). A letter count is a
    fingerprint, but a very weak one.

??? question "7. If only one person in ten could read at all, how does that change what an ordinary plain letter is, and who is the real enemy?"

    A plain letter in the common script is already a locked box to nine people in ten. The real enemy is the
    small group who can read: the scribes, clerks and officials, and in many societies the scribe also read the letter
    aloud to its recipient. Keeping a letter from the scribe class needed either a scribe you trusted completely or a
    lock the scribe could not pick, and that is a question about people before it is a question about ciphers.

??? question "8. Apply the three tests of §1.7 (is there a text, did the writer mean to hide it, is there a rule that reads it) to Pepys's diary, to the Voynich manuscript and to the Nero Caesar reading of 666."

    Pepys's diary: text yes, rule yes (Shelton's shorthand), intent partly yes (the foreign-language passages were meant
    to be hard for his household to read), so it is a private writing with some concealment, not a cipher in the strict sense. Voynich:
    text yes, intent unknown, no rule that anyone can verify, so it fails the third test and may not be a cipher at all. Nero Caesar:
    there is a rule (Hebrew letter values) and a reading that fits (666, and 616 for the Latin spelling), but nothing
    shows the author wanted the name hidden from anyone, so it passes the third test and leaves the second open.

??? question "9. A simple substitution cipher held for centuries and then stopped being enough. What changed, in terms of Figure 1.4?"

    The enemy changed. While the likely reader was a servant or an untrained clerk (rows one and two), almost any
    scramble worked. Once states kept offices of trained decipherers with time and a copy of the seal (row four),
    a simple cipher gave nothing, and ciphers had to be built for that kind of reader.

??? question "10. A field order has to stay secret for twelve hours. The name of a long-term agent has to stay secret for forty years. Why is it reasonable to use different ciphers for the two, and what goes wrong if you mix them up?"

    A cipher costs effort to write, read and carry, so a sensible user pays only for the time he needs. A cipher that takes an enemy
    a week to solve is fine for a twelve-hour order and a poor choice for a name that must hold for a lifetime. The usual
    failure is the second: a message that needed to hold for decades is sent in a system that holds for days, and the
    enemy files it away until the key falls. The same logic returns in Chapter 19, in the worry about records kept
    today and read with quantum computers later.

## What you learned

- A message has four places where it can be read: the draft, the courier, the road, and the arrival and archive.
  Secret writing is the set of answers to that, and none of them covers all four.
- Steganography hides that a message exists, a code swaps meanings for agreed signs, and a cipher scrambles the letters
  themselves. Each depends on something different and fails in a different way; real systems blend them.
- Most secrecy in history was done by seals, scripts, languages, trusted couriers and the fact that few could read.
  The clay envelopes of Kanesh, letterlocking, Caesar's Greek letter, nüshu and nsibidi are locks that are not
  mathematics.
- States, merchants, priests and scholars, lovers and private people all hid writing, and the record is lopsided toward states
  because states had archives.
- Galileo, Hooke and Huygens used scrambled sentences to claim discoveries; the sealed packets of the Paris Academy
  did the same job. The idea survives in hash commitments and timestamps.
- Before Kerckhoffs, method and key were not separated and most ciphers were meant to stop an amateur. Figure 1.4 shows
  why that worked, and when it stopped.
- Evidence for old ciphers sits on a ladder from the object itself to a modern theory, and four things bend it: we know
  ciphers because someone broke them, secrecy destroyed its own record, texts survive only when copied, and the
  historians' reading is lopsided.
- Two threads run through the rest of the book: makers are trusted until breakers prove otherwise, and the weak point
  is rarely the mathematics.

**Next:** [Chapter 2](02-Egypt-Mesopotamia-and-the-Bible.md), the oldest cases: a scribe's unusual signs in an Egyptian
tomb, a Babylonian potter's recipe, and a prophet's reversed alphabet.

## Further reading

- David Kahn, *The Codebreakers: The Story of Secret Writing* (Macmillan, 1967; revised edition, Scribner, 1996).
- Claude Shannon, "Communication Theory of Secrecy Systems", *Bell System Technical Journal* 28 (1949).
- Herodotus, *Histories*, 5.52 to 5.54 (the Royal Road) and 8.98 (the couriers); Homer, *Iliad* 6.155 to 6.211;
  2 Samuel 11; Julius Caesar, *Gallic War* 1.29, 5.48 and 6.14; Ovid, *Art of Love*, book 3; Pliny the Elder, *Natural
  History*; Suetonius, *Augustus* 49 and *Julius* 56; Procopius, *Wars* 8.17.
- Cécile Michel, *Women of Assur and Kanesh: Texts from the Archives of Assyrian Merchants* (SBL Press, 2020).
- Klaas Veenhof and Jesper Eidem, *Mesopotamia: The Old Assyrian Period* (Academic Press Fribourg, 2008).
- Denise Schmandt-Besserat, *Before Writing* (University of Texas Press, 1992): the token theory, contested.
- Alan Lenzi, *Secrecy and the Gods: Secret Knowledge in Ancient Mesopotamia and Biblical Israel* (Neo-Assyrian Text
  Corpus Project, 2008).
- William V. Harris, *Ancient Literacy* (Harvard University Press, 1989).
- Jana Dambrogio and colleagues, "Unlocking history through automated virtual unfolding of sealed documents imaged by
  X-ray microtomography", *Nature Communications* 12 (2021).
- Nadine Akkerman, *Invisible Agents: Women and Espionage in Seventeenth-Century Britain* (Oxford University Press, 2018).
- Kristie Macrakis, *Prisoners, Lovers, and Spies: The Story of Invisible Ink from Herodotus to al-Qaeda* (Yale
  University Press, 2014).
- Samuel Pepys, *The Diary of Samuel Pepys*, ed. Robert Latham and William Matthews, 11 vols. (University of California
  Press, 1970 to 1983).
- Cathy Silber, "From Daughter to Daughter-in-Law in the Women's Script of Southern Hunan", in *Engendering China*
  (Harvard University Press, 1994); William Chiang, *"We Two Know the Script; We Have Become Good Friends"* (University
  Press of America, 1995).
- Ivor Miller, *Voice of the Leopard: African Secret Societies and Cuba* (University Press of Mississippi, 2009), on
  Ekpe and nsibidi.
- Albert Van Helden, "'Annulo cingitur': the solution of the problem of Saturn", *Journal for the History of Astronomy* 5
  (1974); Mario Biagioli, *Galileo's Instruments of Credit* (University of Chicago Press, 2006).
- Robert Hooke, *A Description of Helioscopes* (1676) and *Lectures de Potentia Restitutiva* (1678).
- Bernard Bru and Marc Yor, "Comments on the life and mathematical legacy of Wolfgang Doeblin", *Finance and
  Stochastics* 6 (2002).
- Raymond Clemens, ed., *The Voynich Manuscript* (Yale University Press, 2016).
- Francis Bacon, *De Augmentis Scientiarum* (1623), book 6, chapter 1.
- Thomas Harman, *A Caveat or Warening for Commen Cursetors* (1566, 1567).
- Thomas Kelly, "The Spartan Scytale", in J. W. Eadie and J. Ober (eds.), *The Craft of the Ancient Historian* (1985).
- *Weaker sources.* The origin date of nüshu, the age of nsibidi, the details of the 1697 letter from the Brienne
  trunk, the number of letters in that trunk, the Venetian and Meissen secrecy traditions, and the reports that German
  listeners noticed the Verlaine lines rest on museum notes, news reports, encyclopedia articles and later secondary
  accounts, not on the primary sources. Treat them as reports.
