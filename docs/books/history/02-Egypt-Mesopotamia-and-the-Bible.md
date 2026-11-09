# 2. Egypt, Mesopotamia and the Bible

*Long before anyone sent an enciphered letter, scribes along the Nile, the Tigris and the Jordan bent their own scripts on purpose: to show learning, to make a sacred text a puzzle, to guard a recipe, to name an enemy without naming him, to mark who belonged to a group. This chapter follows those scribes from a tomb at Beni Hasan (about 1900 BC) to the potsherds of Christian Egypt (about AD 700), and then to the nineteenth-century scholars who read their scripts again. You will swap the Hebrew alphabet end to end the way Jeremiah's scribe did, turn names into numbers, write a text in rare sign values and read it back, tell three letter tables apart by what they produce, and use two royal names as a crib to read hieroglyphs, the way Young and Champollion did.*

!!! abstract "In this chapter"
    **You will learn:**

    - why people altered a script long before they had ciphers, and the five different reasons the evidence shows;
    - what Khnumhotep II's tomb, enigmatic hieroglyphs, a Babylonian glass recipe, Atbash in Jeremiah, the cryptic scripts of the Dead Sea Scrolls and the Coptic letter ciphers each show, and what the sources do not show;
    - how Atbash, Albam, Atbah, sign-value writing and gematria work, by building each one in Python;
    - why a script that nobody can read any more is, for the next age, a cipher, and how Young, Champollion and the cuneiform scholars broke them with cribs;
    - where scholars disagree: dates, motives, and whether to call any of this cryptography at all.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) (the difference between a code, a cipher and hidden writing) and, from book 1, [Chapter 1](../../book/01-What-Cryptography-Is-For.md). [Chapter 2 of the cryptography book](../../book/02-Classical-Ciphers.md) teaches Caesar and Atbash as mathematics; here they are told as people's choices.

    **Levels:** §2.1, §2.2 and §2.5 are for beginners, §2.3, §2.4 and §2.6 to §2.10 are intermediate, §2.11 is expert.

## 2.1 The situation

*Level: beginner.*

Around 1900 BC two kinds of people were writing, and they never met. In the Egyptian Middle Kingdom, scribes trained for years to cut hieroglyphs into the walls of tombs and temples for the gods and the dead to read. About 1,300 kilometers (800 miles) to the north-east, in the Anatolian highlands, merchants from the city of Assur pressed reeds into wet clay in a trading town called Kanesh, today the mound of Kültepe in Turkey, and sent letters home about tin, textiles and silver. In both places writing was more than thirteen hundred years old. In both, only a few people could do it. Most estimates put the literate at a few percent of the population or less, and in Egypt the scribe was a profession, with its own schools, its own tools and a Middle Kingdom text, the *Satire of the Trades*, that told boys to choose it over every other job.

That fact changes what "secret" means. A message written in a script that almost nobody can read is already hidden from almost everybody. The ordinary Egyptian who walked past the wall of a tomb could not read it, and neither could the ordinary Babylonian who watched a courier ride by. Where only a handful of people can read at all, a writer has little reason to scramble the letters further, and mostly did not. What a scribe could do, and sometimes did, was to alter the script itself: use a rare sign where a common one would do, give a sign a value it did not usually have, replace a word with a number. That is the first thing this chapter has to say. Before there were ciphers, there were **scribes who played with the signs**, and what they played for changed from case to case.

<figure class="mars-fig">
<svg viewBox="0 0 640 430" width="640" role="img" aria-label="Timeline from about 1900 BC to AD 1857: tombs, a recipe, Jeremiah, the scrolls, Coptic ciphers, and the decipherments" fill="currentColor" font-size="14">
<line x1="130" y1="8" x2="130" y2="420" stroke="currentColor" stroke-width="1.6"/>
<text x="116" y="27" font-size="14" text-anchor="end" font-weight="bold">c. 1900 BC</text>
<circle cx="130" cy="22" r="3.5" fill="currentColor"/>
<text x="146" y="27" font-size="14" text-anchor="start">Beni Hasan tomb of Khnumhotep II; letters at Kanesh</text>
<text x="116" y="53" font-size="14" text-anchor="end" font-weight="bold">1400-1200 BC</text>
<circle cx="130" cy="48" r="3.5" fill="currentColor"/>
<text x="146" y="53" font-size="14" text-anchor="start">Tablet BM 120960, a glaze or glass recipe (date disputed)</text>
<text x="116" y="79" font-size="14" text-anchor="end" font-weight="bold">1100s BC</text>
<circle cx="130" cy="74" r="3.5" fill="currentColor"/>
<text x="146" y="79" font-size="14" text-anchor="start">Enigmatic hieroglyphs in the royal tombs at Thebes</text>
<text x="116" y="105" font-size="14" text-anchor="end" font-weight="bold">late 700s BC</text>
<circle cx="130" cy="100" r="3.5" fill="currentColor"/>
<text x="146" y="105" font-size="14" text-anchor="start">Sargon II's wall measures "the number of my name"</text>
<text x="116" y="131" font-size="14" text-anchor="end" font-weight="bold">600s-500s BC</text>
<circle cx="130" cy="126" r="3.5" fill="currentColor"/>
<text x="146" y="131" font-size="14" text-anchor="start">Jeremiah: Sheshach and Leb-kamai (editing date debated)</text>
<text x="116" y="157" font-size="14" text-anchor="end" font-weight="bold">2nd-1st c. BC</text>
<circle cx="130" cy="152" r="3.5" fill="currentColor"/>
<text x="146" y="157" font-size="14" text-anchor="start">Qumran scribes write some scrolls in a cryptic script</text>
<text x="116" y="183" font-size="14" text-anchor="end" font-weight="bold">1st c. AD</text>
<circle cx="130" cy="178" r="3.5" fill="currentColor"/>
<text x="146" y="183" font-size="14" text-anchor="start">Revelation's number 666, most often read as Nero</text>
<text x="116" y="209" font-size="14" text-anchor="end" font-weight="bold">Roman Egypt</text>
<circle cx="130" cy="204" r="3.5" fill="currentColor"/>
<text x="146" y="209" font-size="14" text-anchor="start">Esna temple: hymns in ram and crocodile signs</text>
<text x="116" y="235" font-size="14" text-anchor="end" font-weight="bold">AD 394</text>
<circle cx="130" cy="230" r="3.5" fill="currentColor"/>
<text x="146" y="235" font-size="14" text-anchor="start">Last dated hieroglyphic inscription, at Philae</text>
<text x="116" y="261" font-size="14" text-anchor="end" font-weight="bold">AD 300s-700s</text>
<circle cx="130" cy="256" r="3.5" fill="currentColor"/>
<text x="146" y="261" font-size="14" text-anchor="start">Coptic scribes use letter swaps; Djeme potsherd</text>
<text x="116" y="287" font-size="14" text-anchor="end" font-weight="bold">1799</text>
<circle cx="130" cy="282" r="3.5" fill="currentColor"/>
<text x="146" y="287" font-size="14" text-anchor="start">The Rosetta Stone is found</text>
<text x="116" y="313" font-size="14" text-anchor="end" font-weight="bold">1802</text>
<circle cx="130" cy="308" r="4.5" fill="currentColor"/>
<text x="146" y="313" font-size="14" text-anchor="start" font-weight="bold">Grotefend reads names in Old Persian cuneiform</text>
<text x="116" y="339" font-size="14" text-anchor="end" font-weight="bold">1822</text>
<circle cx="130" cy="334" r="4.5" fill="currentColor"/>
<text x="146" y="339" font-size="14" text-anchor="start" font-weight="bold">Champollion's letter on the hieroglyphic alphabet</text>
<text x="116" y="365" font-size="14" text-anchor="end" font-weight="bold">1857</text>
<circle cx="130" cy="360" r="4.5" fill="currentColor"/>
<text x="146" y="365" font-size="14" text-anchor="start" font-weight="bold">Four scholars translate one tablet in sealed envelopes</text>
<text x="146" y="400" font-size="12" text-anchor="start" opacity="0.7">Bold marks the readings of lost scripts (not to scale; see §2.9)</text>
</svg>
<figcaption>Figure 2.1. The story of this chapter in one column. The first ten rows are scribes bending their scripts, ending with the last hieroglyphs and the Coptic ciphers; the last four are the scholars who found and read the lost scripts again.</figcaption>
</figure>

Three things make the evidence of this chapter unusual, and they apply to every case below.

**The survivors are not a fair sample.** What lasts for four thousand years is stone, baked or sun-dried clay, and a little papyrus that happened to sit in a dry place. So we have the words cut on tomb walls and temple gateways, which were meant to be seen, and clay records of trade and law. A private letter on papyrus that a courier carried in his belt, the kind of thing that would most need hiding, mostly did not survive. Everything in this chapter is therefore a case where the altered writing was put on a durable object, usually in public. That is the opposite of a secret, and the sources must be read with that in mind.

**The word "cryptography" means something else here.** Egyptologists use it for any intentional, systematic departure from the standard spelling of hieroglyphic texts; Assyriologists use it for any deliberate rare or numeric writing of cuneiform. Neither means a message made unreadable to an enemy under a key. The two senses overlap, and the overlap is the subject, but a reader who sees "cryptographic inscription" in an Egyptology book should not picture a code room. Chapter 1 drew the line between a code, a cipher and hidden writing; this chapter shows how much of the ancient evidence sits on the fuzzy side of it.

**Much of the "history" was written later.** Some of the best-known claims in the story of secret writing were made by authors who lived centuries after the events, or by modern scholars trying to explain an odd spelling. Where that matters, the text says so in the sentence.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Schematic map: Kanesh in Anatolia, Babylon and Seleucia in Mesopotamia, Judah and Qumran in the Levant, Beni Hasan, Thebes, Esna and Philae in Egypt" fill="currentColor" font-size="14">
<rect x="30" y="20" width="200" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="130" y="43" text-anchor="middle" font-weight="bold">Anatolia</text>
<text x="130" y="63" text-anchor="middle" font-size="13">Kanesh: Assyrian merchants</text>
<rect x="400" y="110" width="210" height="76" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="505" y="133" text-anchor="middle" font-weight="bold">Mesopotamia</text>
<text x="505" y="153" text-anchor="middle" font-size="13">Babylon, Uruk, Nineveh</text>
<text x="505" y="172" text-anchor="middle" font-size="13">Seleucia (Tell Umar?)</text>
<rect x="200" y="125" width="150" height="76" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="275" y="148" text-anchor="middle" font-weight="bold">Judah</text>
<text x="275" y="168" text-anchor="middle" font-size="13">Jerusalem, Lachish</text>
<text x="275" y="187" text-anchor="middle" font-size="13">Qumran (Dead Sea)</text>
<rect x="30" y="228" width="240" height="78" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="150" y="250" text-anchor="middle" font-weight="bold">Egypt</text>
<text x="150" y="269" text-anchor="middle" font-size="13">Beni Hasan, Thebes, Djeme</text>
<text x="150" y="288" text-anchor="middle" font-size="13">Esna, Philae</text>
<line x1="230" y1="60" x2="400" y2="120" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="350" y1="160" x2="400" y2="152" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="230" y1="228" x2="250" y2="201" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="130" y1="82" x2="215" y2="125" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<text x="318" y="82" font-size="12" opacity="0.8">tin, silver, letters</text>
<text x="352" y="180" font-size="12" opacity="0.8" text-anchor="start">exile, empire</text>
<text x="300" y="228" font-size="12" opacity="0.8">Amarna letters, trade</text>
<text x="560" y="30" font-size="12" text-anchor="end" opacity="0.8">north is up; not to scale</text>
<text x="395" y="300" font-size="13" text-anchor="start">Every place on this map used a script that only</text>
<text x="395" y="318" font-size="13" text-anchor="start">trained scribes could read.</text>
</svg>
<figcaption>Figure 2.2. The places of this chapter, drawn as boxes. Egypt, Judah and Mesopotamia were close enough for caravans and armies to cross in weeks, which is why a recipe, a name or a script style could travel.</figcaption>
</figure>

The Near East of 1900 BC was not shut off. Armies, caravans and diplomats crossed it constantly. Some five and a half centuries later, around 1350 BC, the pharaoh Akhenaten's court at Amarna kept about 380 clay tablets that survive today: letters from the kings of Babylon, Assyria, Mitanni, Hatti and the small cities of Canaan, all in Akkadian cuneiform, the diplomatic language of the age. None is enciphered. A script that only a few trained men can read, carried by an envoy chosen for his loyalty, who usually spoke the message aloud as well, was security enough. That is how most secrecy worked in the first thousand years of writing, and the chapter's cases are the exceptions.

## 2.2 Khnumhotep II and the scribe who changed the signs

*Level: beginner.*

Beni Hasan is a line of rock-cut tombs high on the east bank of the Nile, about 250 kilometers south of Cairo. The tomb known as number 3 belonged to Khnumhotep II, governor of the Oryx nome, the province whose capital was Menat-Khufu, in the reigns of Amenemhat II and Senusret II (the 12th Dynasty, around 1900 BC). He held the title of a great chief of his province and, among his offices, overseer of the Eastern Desert. His tomb is famous for two things. On one wall a line of Asiatic visitors, thirty-seven men, women and children led by a man the text calls Abisha, comes to Egypt bringing eye paint; the painting is a favorite of Egyptology textbooks. On another stretch of wall runs a long autobiographical inscription, in which Khnumhotep tells how his family came to hold the province, what offices he held, and what he did for the people of his nome.

David Kahn opens the story of secret writing here. In *The Codebreakers* (1967) he describes the scribe who cut the inscription as having replaced some ordinary hieroglyphs with unusual ones, and he treats it as the earliest known example of written cryptography, because it is the first time anyone we know of deliberately changed the signs. The claim has been repeated in nearly every popular history since, including the old pages of this site. It is worth saying exactly what it is and is not.

It is a claim about a script. Hieroglyphic writing offered a scribe many choices to begin with. The script has several hundred signs in common use in the Middle Kingdom (Alan Gardiner's standard list has about 750), and a single sound could be written by several different signs, a single word by several different spellings. A scribe who wanted to show off knew these alternatives, and a patron who commissioned a long, carefully carved inscription for the walls of his eternal house would be pleased by variety, by rare forms, by signs that recalled the ancient writing of the Pyramid Age. Egyptologists describe this as visual variation and a taste for the archaic, and they find it throughout Egyptian monumental writing, not only at Beni Hasan.

It is not a claim that anyone was kept out. The inscription is carved on a tomb wall for visitors to read, and the signs, although uncommon, are still ordinary hieroglyphs that any trained reader could recognize. Kahn himself, as I read him, says as much: the change most likely gave the text dignity and authority, and it cannot have been meant to hide anything. His point is narrower and sounder. Cryptography needs two ingredients, a deliberate change in writing and a reason to keep it from someone, and here is the first sign of the first one.

!!! note "Life story: Khnumhotep II"
    **Born:** nome governor in the Egyptian 12th Dynasty, serving under Amenemhat II and Senusret II, around 1900 BC; his tomb (Beni Hasan tomb 3) was recorded by Percy Newberry in 1893 · **Purpose:** the long autobiography was cut to keep his name and deeds alive in the next world · **Helped:** gave Kahn's *Codebreakers* its first page, and gave historians their oldest example of a scribe altering a script on purpose · **Status:** the inscription survives; whether the altered signs mean anything more than scribal pride is a matter of reading, not of record

### How a sign can be a sound, a thing, or a puzzle

To see what a scribe had to play with, you need the basic trick of the script. A hieroglyph can stand for the thing it pictures (a **logogram**: the sign of a house, *pr*, can mean "house"). It can stand for the sounds of its name, not for the thing (a **phonogram**: the same house sign can be one part of a longer word that contains the sounds *p* and *r*). And it can be added, silent, to a word to say what kind of thing the word is (a **determinative**: a little pair of legs after a verb of walking). This is the rebus principle, the same as drawing an eye, a heart and a ewe to mean "I love you." The script worked like this from about 3200 BC to its end, and it gave scribes three ways to play: choose a rare sign for a sound, choose a sign whose picture suggests a hidden meaning, or read a sign by a value it normally does not have.

Here is a worked example. Egyptian had two common signs for the *s* sounds, the folded cloth and the door bolt. In the Old Kingdom they stood for two different sounds, and by the later Middle Kingdom they had merged, so a scribe could choose either one, and a scribe who knew an older or rarer sign could choose that. Suppose a name has seven sounds and each can be written with any of three signs. Then it can be written $3^7 = 2{,}187$ ways, and every one of them is correct. A reader who has learned the standard spelling stumbles, a reader who knows the whole sign list reads it without trouble, and a scribe who writes it all for a patron shows what he knows. Nothing here needs a key. It needs only more knowledge than the reader has, and that is exactly what an Egyptian priest, or a medieval monk, had to offer.

### Try it: count the spellings

Take a word of five sounds in which each sound has three possible signs. How many spellings are there, and what fraction would a reader who knows only one sign per sound recognize? Work it out before reading on.

??? note "Answer"

    Each of the five sounds can be written in 3 ways, so there are $3^5 = 243$ spellings. A reader who knows only one sign per sound recognizes exactly one of them, $1/243$, about 0.4 percent. A reader who knows two of the three recognizes $2^5 = 32$ of the 243, about 13 percent. The reader's knowledge is the key, and it comes in degrees, not all or nothing.

## 2.3 Enigmatic writing: the priests' puzzle

*Level: intermediate.*

About 750 years after Khnumhotep, Egyptian priests went much further. In the New Kingdom (about 1550 to 1070 BC), the long religious books that told the dead how to cross the underworld were carved on the walls of the royal tombs at Thebes. In some of them, in the tomb of Ramesses VI (about 1140 BC) and Ramesses IX, and on one of the gilded shrines around Tutankhamun's sarcophagus, whole passages are written in a script modern scholars call **enigmatic** or **cryptographic**. The signs are familiar hieroglyphs used for unusual sounds, and new signs were invented as needed. A snake sign might stand for a sound that has nothing to do with snakes.

The question is why. The French Egyptologist Étienne Drioton, who cataloged these systems in the 1930s, read them as a kind of private cryptography, writing meant to keep something from the uninitiated. John Darnell, in the study cited at the end of this chapter (2004), argued for something different. As I read him, the enigmatic books are not locks. They are puzzles meant to be solved, and working out the signs was itself part of the religion, a way for a priest to take part in the mystery the book described, the night journey of the sun god. On this account the altered writing did not exclude outsiders, since outsiders could not have read the plain version either. It set learned priests apart from the rest, and it made reading an act of devotion, not only a way to keep a text private.

That is an interpretation, and it is not the only one. What the sources show is certain enough: the substitutions follow rules that Egyptologists have been able to work out, which is why the texts can be read at all, and the people who made them knew the standard writing well. What the sources do not show is any statement by an Egyptian about why. No priest left a note saying that the unusual signs were to keep out the profane, or to invite the learned in. Everything about purpose is inference.

### Mutilated signs, and a third use of altered writing

A different kind of change is much older and has nothing to do with secrecy. In the burial chambers of the Old Kingdom pyramids, in the Pyramid Texts (the oldest religious texts in the world, from the end of the Fifth Dynasty, about 2350 BC), the hieroglyphs that picture a dangerous creature are often drawn with the creature cut in half, or with its legs removed. A snake is cut across, a bird has no feet. The usual explanation is magical: in a place where writing was thought to be alive, a picture of a viper could come alive and bite the dead king, so the scribe disabled it. The change is deliberate, systematic and a departure from the standard form of the sign, which makes it a sort of "cryptography" in the Egyptologist's sense. Yet no one's aim was to hide anything. It is a reminder that the Egyptians believed in the power of the written word as a thing, not only as a message, and that altered writing could protect as well as conceal.

### The temple at Esna

The most extreme examples come from the Roman period, when Egypt was a province of the Roman empire and the old temples were still being built and decorated, with texts cut in hieroglyphs by priests who read a script that no one else in the Mediterranean world could. In the temple of the ram-headed god Khnum at Esna, about 55 kilometers south of Luxor, two hymns to Khnum stand side by side on a wall. One is written almost entirely in signs of rams, the other almost entirely in signs of crocodiles, both animals sacred to the god. A normal hieroglyphic text draws on hundreds of different signs; these two take almost all of theirs from a single animal, so what a sign meant depended on how the animal was drawn and on the scribe's rules. The text was a performance, and it demanded a reader who knew them.

Serge Sauneron published the Esna inscriptions in the long series of volumes that began in 1959, and Christian Leitz offered a reading of the two cryptographic hymns in 2001. The ram hymn can now be translated reasonably well. The crocodile hymn is damaged and is still only partly understood. Much of that is the state of the stone, so the gap says little about secrecy either way.

The scale of this late writing is also worth knowing. The number of signs in use grew enormously. From the few hundred of the Middle Kingdom, the temples of the Ptolemaic and Roman periods drew on a repertory that counts are often given at more than five thousand signs, many with several readings. Some of the growth was play, some was a deliberate widening of what a sign could mean, and scholars of the period describe the late script as a learned game, played by a priestly class that no longer had a political audience and wrote for the gods and for each other. Clement of Alexandria, writing around AD 200, already described three kinds of Egyptian writing, and said that the sacred kind worked symbolically, partly by imitation, partly by figures of speech and partly by what he calls enigmas. That is where the modern word comes from, and Clement's report is our best direct outside witness to what a Greek reader thought the priests were doing. §2.9 comes back to what he started.

!!! note "Life story: enigmatic hieroglyphs"
    **Born:** scattered earlier examples, then systematically in the New Kingdom royal tombs (about 1300 to 1100 BC), with a second flowering in the temples of the Ptolemaic and Roman periods · **Purpose:** to turn sacred texts into puzzles for the learned, according to Darnell; to keep the profane out, according to Drioton's older view; both are inference · **Helped:** the Netherworld books of the royal tombs, the Esna hymns in ram and crocodile signs, and a priestly pride in knowing the sign list · **Retired:** with the last hieroglyphic inscription, at Philae in AD 394 · **Replaced by:** nothing; the script died, and for fourteen centuries its remains were taken for a cipher (§2.9)

## 2.4 Mesopotamia: sealed tablets, sign values and a glassmaker's recipe

*Level: intermediate.*

Cuneiform is the script of the Tigris and Euphrates. It began around 3400 to 3000 BC as accounting marks on clay, grew into a full writing system for Sumerian and then for Akkadian (the language of Babylon and Assyria), and was used for about three thousand years; the last dated tablets come from around AD 75. A scribe pressed a cut reed into wet clay, and each press made a wedge. Wedges combined into signs, and a trained scribe in the first millennium BC worked with roughly six hundred of them.

The thing to understand about cuneiform is that a sign is not a letter. A sign can be a **word sign**, a logogram, borrowed from Sumerian and read aloud in Akkadian. It can be a **syllable sign**, standing for a sound such as *ka* or *lu*. It can be a **determinative**, a silent marker that says "this next word is a god", "a city", "a wooden thing". And most signs can be all three, with a half-dozen or more readings each. The sign KA, which pictures a mouth, is read *ka*, but it also means "tooth" (read *zu₂*), "word" (*inim*), "voice" (*gu₃*) and "to speak" (*dug₄*), among other readings. Figure 2.3 draws the idea. A reader has to decide, sign by sign, which reading the writer meant, and does it by context, as you decide whether *lead* is a metal or a verb. A school taught this for years: pupils copied long **sign lists**, the Mesopotamian equivalent of a dictionary and a spelling book in one, until the readings were second nature.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The cuneiform sign KA drawn as one box with four arrows to four different readings" fill="currentColor" font-size="14">
<rect x="40" y="112" width="120" height="76" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="100" y="146" text-anchor="middle" font-size="26" font-weight="bold">KA</text>
<text x="100" y="170" text-anchor="middle" font-size="13">the sign for "mouth"</text>
<line x1="160" y1="150" x2="300" y2="46" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
<rect x="300" y="24" width="150" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="375" y="51" text-anchor="middle" font-size="16" font-weight="bold">ka</text>
<text x="470" y="51" text-anchor="start" font-size="13">mouth</text>
<line x1="160" y1="150" x2="300" y2="112" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
<rect x="300" y="90" width="150" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="375" y="117" text-anchor="middle" font-size="16" font-weight="bold">zu₂</text>
<text x="470" y="117" text-anchor="start" font-size="13">tooth</text>
<line x1="160" y1="150" x2="300" y2="178" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
<rect x="300" y="156" width="150" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="375" y="183" text-anchor="middle" font-size="16" font-weight="bold">inim</text>
<text x="470" y="183" text-anchor="start" font-size="13">word</text>
<line x1="160" y1="150" x2="300" y2="244" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>
<rect x="300" y="222" width="150" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="375" y="249" text-anchor="middle" font-size="16" font-weight="bold">gu₃</text>
<text x="470" y="249" text-anchor="start" font-size="13">voice</text>
<text x="40" y="290" font-size="12" opacity="0.8">Sumerian readings of one sign (after the usual sign lists). A writer may also choose, among several signs for one syllable, the one nobody expects.</text>
</svg>
<figcaption>Figure 2.3. Why cuneiform could hide things without a key. One sign has many values, so a reader has to choose among them by context, and a scribe can pick the reading a stranger would not think of.</figcaption>
</figure>

This is the raw material for a hidden writing, because a scribe who chose a rare reading, or a rare sign for a common syllable, produced a text that a poorly trained reader could not read and a well trained one could. It needs no key beyond education. The cases below all use it, and each has a different motive.

### The sealed envelope

The oldest practical protection of a message is not in the script at all. At Kanesh, the merchants of Assur around 1900 BC wrote their letters in a simple syllabary that the traders themselves could manage, with far fewer signs than the scribal schools taught (commonly put at around 150). More than twenty thousand of their tablets have been dug up at Kültepe. A letter or contract was often sealed inside a **clay envelope**, a thin shell of clay molded around the tablet and rolled with the cylinder seals of the sender and of witnesses, so the contents could not be read or changed without breaking the shell. A merchant who received an envelope with its seals intact knew that no one had opened it; if the seals were broken, he knew that too. This is a **confidentiality and integrity device made of clay**, and it works on the same principle as a modern tamper-evident envelope or a signed hash: the proof is physical, not mathematical. It gives no protection from a courier who could copy the seal, which is why cylinder seals were prized and guarded.

Two more habits of Mesopotamian scribes matter here, both from later centuries. One is that Babylonian scholarly texts often end with a **colophon**, a note by the scribe, and some colophons mark the tablet as restricted. The phrase "the secret of the experts" (*niṣirti ummâni*) turns up, and a formula that says, in effect, that the one who knows may show it to the one who knows, and the one who does not know may not see it. Alan Lenzi's 2008 book *Secrecy and the Gods* collects this evidence and argues that such secrecy was largely about status and the control of expert knowledge (divination, medicine, astrology, ritual) by a scribal elite. It was not hidden writing. The tablets that carry these notices are in the standard script and can be read by any scribe trained in the field.

The other is that scribes liked to hide a name in a poem. The *Babylonian Theodicy*, a long dialogue between a sufferer and his friend (about 1000 BC, as usually dated), is an **acrostic**: every line of a stanza begins with the same syllable, and the syllables of the stanzas, read down, spell a sentence which says, in translation, "I, Saggil-kinam-ubbib, the incantation priest, am adorant of the god and the king." The author signed his poem in a way that does not interfere with reading it and that most readers would miss. That is hidden writing at its mildest, a signature in the structure, and it is close kin to the Hebrew alphabetic acrostics of Psalm 119 and the book of Lamentations, which hide nothing but make the poem's shape part of its meaning.

### The recipe on BM 120960

The oldest known text hidden for a practical reason is a small clay tablet in the British Museum, registration number BM 120960. It was bought from a dealer and is said to come from Tell Umar, the site of the Hellenistic city of Seleucia on the Tigris in what is now Iraq. C. J. Gadd and Reginald Campbell Thompson published it in 1936 as "A Middle-Babylonian Chemical Text" and read it as a set of recipes for glazing pottery, the earliest such formulas known. The British Museum now follows a later reading, by A. Leo Oppenheim and his colleagues in 1970, as a recipe for red glass.

Kahn describes the writer as having chosen uncommon readings of the cuneiform signs and unusual spellings, so that the recipe would mean little to anyone outside the trade. The motive looks familiar: a craftsman guarding a commercial secret, in a trade (glass and glaze, like dyes and perfumes) where a recipe was worth money and was passed from master to apprentice by word of mouth. A perfume text of about the same period names a woman, Tapputi, as an overseer of the work; popular accounts call her the first chemist, which claims more than the tablet says.

Three cautions apply. The date is uncertain: Gadd and Thompson linked a royal name on the tablet to King Gulkishar and dated it no later than the seventeenth century BC, Kahn gives about 1500 BC, and the British Museum's catalog entry says 1400 to 1200 BC. The findspot is a dealer's word. And the claim that the unusual writing was meant to conceal comes from the kind of text it is, a trade recipe, and from the fact that the writer picked uncommon values, not from any note on the tablet. A craft's vocabulary is technical and obscure for ordinary reasons, and the tablet may be partly that.

!!! note "Life story: tablet BM 120960"
    **Born:** a Middle-Babylonian clay tablet, said to come from Tell Umar (Seleucia on the Tigris); the date is given as before 1600 BC, about 1500 BC, or 1400 to 1200 BC depending on the source · **Purpose:** a recipe for glaze (Gadd and Thompson, 1936) or red glass (Oppenheim and others, 1970), written with uncommon sign values, apparently to keep a trade secret · **Helped:** historians of chemistry, and Kahn's argument that cryptography begins with commerce · **Status:** in the British Museum; the date and the proof of secrecy are inferences

### Numbers for syllables, numbers for gods

In the last centuries of cuneiform, from the Seleucid period (after 312 BC), scribes went further. They wrote some signs as numbers. Tablets survive that pair each number with a syllable, a ready-made table for a number cipher. Laurie Pearce studied this practice in her 1982 Yale dissertation, *Cuneiform Cryptography: Numerical Substitutions for Syllabic and Logographic Signs*, which is the study I know of. Scholars of the late period also used a much older habit, that of writing a god's name as a number. In the system of the scribal schools Anu, the sky god, is 60, Enlil is 50, Ea is 40, Sin the moon god is 30, Shamash the sun god is 20 and Ishtar is 15. The numbers come from the sexagesimal counting of Babylon, and a scribe who wanted to be obscure, or who simply wanted to be learned, could write a number where the reader expected a name.

The best-known use is also the earliest. An inscription of Sargon II of Assyria (ruled 721 to 705 BC) says that the wall of his new capital, Khorsabad, measured 16,283 cubits, and says that this was "the number of my name". How a number comes out of a name is not settled, but the inscription itself says that it does, and that is the earliest case I know of **gematria**, the turning of a name into a sum. A number that appears on a king's wall as a measurement and is also, privately, a name, is an early hidden message in plain sight. §2.6 takes the idea to Hebrew and Greek.

Two women belong here, because writing was not wholly a male craft. The first author in world history whose name we know is Enheduanna, high priestess of the moon god at Ur around 2300 BC, daughter of Sargon of Akkad, to whom Sumerian hymns to Inanna are credited. And in Old Babylonian Sippar (about 1800 to 1600 BC), a community of women called the *naditu* lived in a walled precinct dedicated to the sun god, managed property and sealed their own records; a few women scribes are named in the documents from that city.

### Code it: a sign list with rare readings

Here is a toy that models the idea. The sign list is invented: five signs, four readings each, the first reading the common one. The writer picks, for each syllable of a secret word, a sign that reads as that syllable only by a rare value. A reader who knows only the common values sees nonsense. A reader with the whole table can try every combination, and a list of words from the trade picks out the real one.

```python
# A toy sign list in the style of cuneiform: one sign, several readings.
# The first reading is the common one. The signs and values are invented.
from itertools import product

signs = {
    "A": ["ka", "zu", "gu", "dug"],
    "B": ["lu", "me", "sar", "ba"],
    "C": ["da", "ki", "an", "us"],
    "D": ["ni", "ra", "bu", "ti"],
    "E": ["sa", "ge", "mu", "ud"],
}

def write(syllables):
    # for each syllable pick a sign that reads it by a rare value, never the common one
    out = []
    for syl in syllables:
        out.append(next(s for s, vals in signs.items() if syl in vals[1:]))
    return out

word = ["zu", "me", "ki"]                  # a made-up word of three syllables
text = write(word)
print("written:", " ".join(text))
print("common values only:", "".join(signs[s][0] for s in text))

# someone holding the full table tries every combination of readings
trade_words = {"zumeki", "kadani", "luzuan", "baragu"}   # words a glassmaker would use
tries = ["".join(c) for c in product(*(signs[s] for s in text))]
print(len(tries), "readings in all; those that are trade words:",
      [t for t in tries if t in trade_words])
```

Output:

```
written: A B C
common values only: kaluda
64 readings in all; those that are trade words: ['zumeki']
```

Three signs with four readings each give $4^3 = 64$ readings. Without a table, a reader sees only `kaluda`. With the table, the reader has 64 candidates and one of them is a word from the trade. That is the whole defense: it lasts exactly as long as the reader lacks the sign list or the trade's vocabulary. Once he has both, nothing is left. The next section shows the same thing in a more famous form.

!!! note "Life story: number and sign-value writing in cuneiform"
    **Born:** rare sign values and number signs appear in scholarly and craft texts in the later second and first millennia BC, with numeric substitutions studied mainly in the Seleucid period (after 312 BC) · **Purpose:** to guard trade recipes, to show learning, and to write sacred names in a scholarly shorthand; hiding a message from an enemy is not the evidence · **Helped:** the scribal elite's control of expert knowledge, and, much later, modern decipherment, since the sign lists that taught scribes also taught Assyriologists · **Retired:** with cuneiform itself, in the first centuries AD · **Replaced by:** alphabets; the knowledge was lost and had to be recovered in the nineteenth century (§2.9)

## 2.5 Atbash in the book of Jeremiah

*Level: beginner.*

Judah in the years around 600 BC was a small kingdom caught between two empires. Egypt was in decline in the south, and Babylon, rising in the east, was on the way to conquering the Near East. In 597 BC Nebuchadnezzar took Jerusalem and exiled its king; in 586 BC he destroyed the city and the Temple. Through those years the prophet Jeremiah warned his countrymen to submit to Babylon, and his words were written down by a scribe, Baruch son of Neriah. The book of Jeremiah itself tells how, in 605 or 604 BC, Baruch wrote the first scroll of the prophet's oracles, how it was read in the Temple, and how King Jehoiakim cut it up piece by piece and threw it on the fire (Jeremiah 36). The book is partly about the writing and burning of a text.

The book contains two puzzles, both in passages about Babylon. In 25:26 and 51:41 the prophet speaks of "Sheshach" (ששך), a word that means nothing in Hebrew. In 51:1 he speaks of "Leb-kamai" (לב קמי), which can be read as "the heart of those who rise against me" but sits oddly where the text expects the name of a people. Readers noticed the pattern a long time ago.

### How Atbash works

*Atbash* swaps the first letter of the Hebrew alphabet with the last, the second with the second-to-last, and so on. The name is its own example: **a**lef ↔ **t**av, **b**et ↔ **sh**in. Apply it to "Babel" (בבל), spelled bet-bet-lamed, and you get shin-shin-kaf, which is "Sheshach" (ששך). Apply it to "Kasdim" (כשדים), the Chaldeans, and you get "Leb-kamai" (לבקמי). Applying Atbash twice gives back the original, so the same table encrypts and decrypts.

Two relatives use the same idea with different pairings. *Albam* splits the alphabet in half and pairs alef with lamed, the first letter of the second half, bet with mem, and so on. *Atbah* is built from the numerical order of the letters: the Hebrew alphabet is also a number system (§2.6), with nine letters for the units (alef to tet), nine for the tens (yod to tsade) and four for the hundreds (qof to tav), and Atbah reverses each of the three groups, pairing alef with tet, bet with het, and so on. All three are monoalphabetic: each letter always becomes the same other letter. Figure 2.4 shows Atbash and Albam.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="Two Hebrew letter tables: Atbash pairs the first letter with the last, Albam pairs the first half with the second half" fill="currentColor" font-size="14">
<text x="320" y="22" text-anchor="middle" font-weight="bold">Atbash: first with last (alef with tav, bet with shin)</text>
<rect x="34" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="57.0" y="60.0" font-size="22" text-anchor="middle">א</text>
<rect x="34" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="57.0" y="114.0" font-size="22" text-anchor="middle">ת</text>
<line x1="57" y1="70" x2="57" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="86" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="109.0" y="60.0" font-size="22" text-anchor="middle">ב</text>
<rect x="86" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="109.0" y="114.0" font-size="22" text-anchor="middle">ש</text>
<line x1="109" y1="70" x2="109" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="138" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="161.0" y="60.0" font-size="22" text-anchor="middle">ג</text>
<rect x="138" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="161.0" y="114.0" font-size="22" text-anchor="middle">ר</text>
<line x1="161" y1="70" x2="161" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="190" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="213.0" y="60.0" font-size="22" text-anchor="middle">ד</text>
<rect x="190" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="213.0" y="114.0" font-size="22" text-anchor="middle">ק</text>
<line x1="213" y1="70" x2="213" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="242" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="265.0" y="60.0" font-size="22" text-anchor="middle">ה</text>
<rect x="242" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="265.0" y="114.0" font-size="22" text-anchor="middle">צ</text>
<line x1="265" y1="70" x2="265" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="294" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="317.0" y="60.0" font-size="22" text-anchor="middle">ו</text>
<rect x="294" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="317.0" y="114.0" font-size="22" text-anchor="middle">פ</text>
<line x1="317" y1="70" x2="317" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="346" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="369.0" y="60.0" font-size="22" text-anchor="middle">ז</text>
<rect x="346" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="369.0" y="114.0" font-size="22" text-anchor="middle">ע</text>
<line x1="369" y1="70" x2="369" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="398" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="421.0" y="60.0" font-size="22" text-anchor="middle">ח</text>
<rect x="398" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="421.0" y="114.0" font-size="22" text-anchor="middle">ס</text>
<line x1="421" y1="70" x2="421" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="450" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="473.0" y="60.0" font-size="22" text-anchor="middle">ט</text>
<rect x="450" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="473.0" y="114.0" font-size="22" text-anchor="middle">נ</text>
<line x1="473" y1="70" x2="473" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="502" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525.0" y="60.0" font-size="22" text-anchor="middle">י</text>
<rect x="502" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525.0" y="114.0" font-size="22" text-anchor="middle">מ</text>
<line x1="525" y1="70" x2="525" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="554" y="34" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="577.0" y="60.0" font-size="22" text-anchor="middle">כ</text>
<rect x="554" y="88" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="577.0" y="114.0" font-size="22" text-anchor="middle">ל</text>
<line x1="577" y1="70" x2="577" y2="88" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<text x="320" y="152" text-anchor="middle" font-weight="bold">Albam: first half with second half (alef with lamed, bet with mem)</text>
<rect x="34" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="57.0" y="190.0" font-size="22" text-anchor="middle">א</text>
<rect x="34" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="57.0" y="244.0" font-size="22" text-anchor="middle">ל</text>
<line x1="57" y1="200" x2="57" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="86" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="109.0" y="190.0" font-size="22" text-anchor="middle">ב</text>
<rect x="86" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="109.0" y="244.0" font-size="22" text-anchor="middle">מ</text>
<line x1="109" y1="200" x2="109" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="138" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="161.0" y="190.0" font-size="22" text-anchor="middle">ג</text>
<rect x="138" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="161.0" y="244.0" font-size="22" text-anchor="middle">נ</text>
<line x1="161" y1="200" x2="161" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="190" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="213.0" y="190.0" font-size="22" text-anchor="middle">ד</text>
<rect x="190" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="213.0" y="244.0" font-size="22" text-anchor="middle">ס</text>
<line x1="213" y1="200" x2="213" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="242" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="265.0" y="190.0" font-size="22" text-anchor="middle">ה</text>
<rect x="242" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="265.0" y="244.0" font-size="22" text-anchor="middle">ע</text>
<line x1="265" y1="200" x2="265" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="294" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="317.0" y="190.0" font-size="22" text-anchor="middle">ו</text>
<rect x="294" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="317.0" y="244.0" font-size="22" text-anchor="middle">פ</text>
<line x1="317" y1="200" x2="317" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="346" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="369.0" y="190.0" font-size="22" text-anchor="middle">ז</text>
<rect x="346" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="369.0" y="244.0" font-size="22" text-anchor="middle">צ</text>
<line x1="369" y1="200" x2="369" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="398" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="421.0" y="190.0" font-size="22" text-anchor="middle">ח</text>
<rect x="398" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="421.0" y="244.0" font-size="22" text-anchor="middle">ק</text>
<line x1="421" y1="200" x2="421" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="450" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="473.0" y="190.0" font-size="22" text-anchor="middle">ט</text>
<rect x="450" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="473.0" y="244.0" font-size="22" text-anchor="middle">ר</text>
<line x1="473" y1="200" x2="473" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="502" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525.0" y="190.0" font-size="22" text-anchor="middle">י</text>
<rect x="502" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="525.0" y="244.0" font-size="22" text-anchor="middle">ש</text>
<line x1="525" y1="200" x2="525" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="554" y="164" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="577.0" y="190.0" font-size="22" text-anchor="middle">כ</text>
<rect x="554" y="218" width="46" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="577.0" y="244.0" font-size="22" text-anchor="middle">ת</text>
<line x1="577" y1="200" x2="577" y2="218" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<text x="320" y="282" text-anchor="middle" font-size="12" opacity="0.8">Written left to right here, like the Latin tables of book 1; Hebrew itself runs right to left. Each pair swaps both ways.</text>
</svg>
<figcaption>Figure 2.4. Two of the three Hebrew letter-pairing schemes. In Atbash the pairs add up to 23 when the letters are numbered 1 to 22; in Albam the lower letter is always 11 places on. Both are their own inverse.</figcaption>
</figure>

### What the sources do and do not say

The key fact about Jeremiah's Atbash is that it hid nothing. The Aramaic Targum, an ancient translation, puts "Babel" where the Hebrew has "Sheshach", and the Greek Septuagint renders "Leb-kamai" simply as "Chaldeans". Jeremiah 51:41 puts "Sheshach" in one half of the verse and "Babylon" in the parallel half, so the reader is told directly what the strange word means. If the aim was secrecy, it failed in the next breath.

Medieval Jewish scholars recognized the device. Rashi in the eleventh century says that Sheshach is Babel, by Atbash, and the Church Father Jerome, who translated the Bible into Latin around AD 400, comments on it in his own commentary on Jeremiah (I give both from the usual retellings, not from the texts). So the knowledge was never lost, and the readers of the verse never needed to break it.

What was it for, then? Scholars offer three answers. The first is the traditional one: a prophet speaking in a land under Babylonian eyes, or writing a scroll that would be carried to Babylon and read there (Jeremiah 51:59 to 64 tells of such a scroll), used a veiled name to protect himself or his scribe. The second is that it was wordplay, a way of saying "Babylon" with a sneer, a literary flourish of the kind Hebrew poetry liked. The third is that the Atbash forms were added later by a learned copyist, and are not Jeremiah's at all. The book's core goes back to the late seventh and early sixth centuries BC, but its editing history is debated. The Greek version of Jeremiah is about an eighth shorter than the Hebrew text we use and arranges the oracles in a different order, so there were at least two forms of the book, and the Atbash names may have entered one of them late.

There is a fourth possibility that is the most interesting for a history of writing: that "Sheshach" is not Atbash at all. In Babylonian scholarly writing the city could be written with a learned logogram, ŠEŠ.KI. Several commentaries propose that Hebrew "Sheshach" is a transcription of that, and that the Atbash reading was found afterward, by readers who noticed that the pattern worked. If so, Atbash would be a later learned explanation of a name that was already there. It is still a reading, not a proof. For "Leb-kamai", though, no such alternative exists, and the Atbash reading stands.

The sources do not say which of these is right. They show a device, a handful of verses where it applies, and a long history of readers recognizing it.

### Other ways Judah's scribes protected a text

Jeremiah's book shows other methods of protecting a document, none of them a cipher. When the prophet buys a field at Anathoth in the year before Jerusalem fell, the deed is made in two copies, one sealed and one open, and both are put in an earthenware jar to last (Jeremiah 32:10 to 14). Double documents of this kind, a sealed text that is the legal one and an open text for reading, are known from the Aramaic papyri of Elephantine and the Judean desert, and the idea is the same as that of the clay envelope at Kanesh. The open copy is the readable one; the sealed copy is the proof.

And in one of the Hebrew letters written in ink on potsherds at Lachish, one of the last fortified towns of Judah (Jeremiah 34:7 names it), about 588 BC, an officer at an outpost writes to the commander that they are watching for the fire signals of Lachish according to every sign his lord has given, since they cannot see another town, Azekah. That is an **agreed code of signs**, like the lamps and torches that Greek military writers describe ([Chapter 3](03-Greece-and-Rome.md)), and an early one. Nothing is known of the signs beyond that.

!!! note "Life story: Atbash"
    **Born:** the pairing scheme is known from the Hebrew Bible (Jeremiah 25:26, 51:1, 51:41), whose core dates to the seventh and sixth centuries BC; whether the forms are Jeremiah's own or a later scribe's is debated · **Purpose:** a veiled or sneering way to write "Babylon" and "Chaldeans"; no evidence that it kept anyone from reading · **Helped:** commentators from the Targum to Rashi and Jerome, medieval Jewish mysticism, and the first lesson in every history of ciphers · **Status:** a toy by modern standards, with no key at all: the table is the method

### Try it: two by hand

First, decrypt this Atbash message in the Latin alphabet (A swaps with Z, B with Y, and so on): `XLNV ZMW HVV`.

??? note "Answer"

    Swap each letter with its mirror image in the alphabet. X to C, L to O, N to M and V to E give COME. Z to A, M to N and W to D give AND. H to S, V to E and V to E give SEE. The message is COME AND SEE.

Second, apply Atbash to the Hebrew word מצרים (Mitzrayim, "Egypt"), treating the final mem as an ordinary mem.

??? note "Answer"

    Mem swaps with yod, tsade with he, resh with gimel, yod with mem, mem with yod, giving yod-he-gimel-mem-yod (יהגמי). That is not a word. Most words do not turn into other words under Atbash, which is why Jeremiah's two cases are noticed at all.

### Code it: Atbash first, then all three

This program does Atbash on the Latin alphabet, then on Hebrew. Hebrew has five letters with a different shape at the end of a word, so the code turns those back into normal letters first and gives the last letter its final form afterward.

```python
# Atbash on the Latin alphabet, then on Hebrew.
latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
hebrew = "אבגדהוזחטיכלמנסעפצקרשת"        # the 22 letters, alef to tav
to_plain = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
to_final = {v: k for k, v in to_plain.items()}

def atbash(word, alphabet):
    word = "".join(to_plain.get(ch, ch) for ch in word)   # a final form counts as the normal letter
    out = "".join(alphabet[-1 - alphabet.index(ch)] for ch in word)
    return out[:-1] + to_final.get(out[-1], out[-1]) if alphabet is hebrew else out

print(atbash("SECRET", latin), atbash(atbash("SECRET", latin), latin))
print("Babel", "בבל", "becomes", atbash("בבל", hebrew), "Sheshach")
print("Kasdim", "כשדים", "becomes", atbash("כשדים", hebrew), "Leb-kamai")
```

Output:

```
HVXIVG SECRET
Babel בבל becomes ששך Sheshach
Kasdim כשדים becomes לבקמי Leb-kamai
```

The second program builds all three Hebrew tables, Atbash, Albam and Atbah, as lookup tables, and checks that each one is its own inverse. Note how short each table is: a line each.

```python
# Three Hebrew letter-pairing ciphers, built as lookup tables.
hebrew = "אבגדהוזחטיכלמנסעפצקרשת"
to_plain = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
to_final = {v: k for k, v in to_plain.items()}

atbash = {a: b for a, b in zip(hebrew, hebrew[::-1])}          # first with last
albam = {hebrew[i]: hebrew[(i + 11) % 22] for i in range(22)}  # first half with second half
groups = ["אבגדהוזחט", "יכלמנסעפצ", "קרשת"]                    # ones, tens, hundreds
atbah = {}
for g in groups:
    atbah.update(zip(g, g[::-1]))                              # reverse inside each group

def apply(table, word):
    word = "".join(to_plain.get(c, c) for c in word)
    out = "".join(table[c] for c in word)
    return out[:-1] + to_final.get(out[-1], out[-1])

for name, table in (("Atbash", atbash), ("Albam", albam), ("Atbah", atbah)):
    twice = all(table[table[c]] == c for c in hebrew)
    print(name, apply(table, "בבל"), "own inverse:", twice)
```

Output:

```
Atbash ששך own inverse: True
Albam ממא own inverse: True
Atbah חחע own inverse: True
```

Only Atbash turns Babel into Sheshach. That is how you test an old claim: build every candidate table and see which one gives the word in the text.

## 2.6 Letters that are numbers: gematria, cover names and a code that was not

*Level: intermediate.*

Hebrew has no separate numerals. Like Greek, it writes numbers with its letters: alef is 1, bet is 2, and so on to tet, 9; then yod is 10, kaf is 20, and on by tens to tsade, 90; then qof is 100, resh 200, shin 300 and tav 400. Every word is therefore also a number, the sum of its letters, and the habit of looking at that number is called **gematria**, a word that is usually derived from Greek *geometria*, though the derivation is debated. Sargon II's wall of 16,283 cubits (§2.4) shows that Mesopotamians already played the game with names. In Hebrew and Greek texts it appears from about the first century AD, and from then on it never stops.

Gematria is more often a way of finding hidden links between words than a way of hiding them. A famous example is Genesis 14:14, where Abram arms 318 trained men to rescue his nephew Lot. A rabbinic tradition (it is in the Talmud and in the midrash Genesis Rabbah) notices that the name of Abraham's servant, Eliezer (אליעזר), adds up to 318, and read the verse as saying that Eliezer alone was worth an army. In Pompeii, a graffito scratched in Greek before AD 79 says "I love her whose number is 545": a lover wrote a girl's name as a number, so that anyone passing could add it up and nobody who did not bother would know. A line of the *Sibylline Oracles* (a Jewish and Christian collection from the Roman period) gives the name of Jesus in Greek as 888, since $10 + 8 + 200 + 70 + 400 + 200 = 888$. In every case the "key" is the alphabet's number values, which every educated reader knew. The text is a riddle, not a lock: anyone who thinks to add can read it, and the cover is only that most people did not think to.

### The number of the beast

The best-known gematria puzzle in history is in the last book of the Christian Bible. Revelation 13:18 says: "Here is wisdom: let the one who has understanding calculate the number of the beast, for it is the number of a man, and his number is 666." The book was written in Greek in Roman Asia Minor, probably in the last decades of the first century, though some scholars date parts of it to the reign of Nero (AD 54 to 68). Its readers were a small minority who, in the author's view, were facing persecution, and who would have risked arrest if the book had named the emperor.

The most widely accepted solution, proposed by German scholars in the 1830s, is that the name is **Nero Caesar**, written in Hebrew letters. The words נרון קסר (*Nron Qsr*) add up as nun 50, resh 200, vav 6, nun 50, qof 100, samekh 60, resh 200, which is 666. What makes the solution convincing, to those who accept it, is the variant. Some of the oldest surviving manuscripts of Revelation, and a reading that the second-century bishop Irenaeus knew and rejected, give the number as 616. With Nero's name spelled without the last *n* (the Latin form "Nero" and not the Greek "Neron"), the sum is $50 + 200 + 6 + 100 + 60 + 200 = 616$. One name with two spellings explains both numbers at once, though a copyist's slip could also account for a variant, so even this is not proof.

It is a solution, not a proof. Other names have been proposed in every century, and a solution that needs a Greek book to be read in Hebrew letters requires that some readers knew both. Nobody can say whether the author meant Nero or a later emperor. What is clear is the method. A writer in a hostile empire wanted to name the ruler without naming him, and chose a puzzle that a Jewish reader could solve and a Roman officer would not think to try.

The same book calls Rome "Babylon", and so does the first letter of Peter, whose author sends greetings from "she who is in Babylon" (1 Peter 5:13). Babylon had destroyed the first Temple in Jerusalem in 586 BC; Rome destroyed the second in AD 70. To call the city by the name of the earlier destroyer is a **cover name**, and the Atbash of Jeremiah may be a distant ancestor of it. Whether Jeremiah's "Sheshach" was ever meant to protect anyone from a Babylonian officer is not known (§2.5). Whether Revelation's "Babylon" protected anyone from Rome is not either; most scholars think the name works as a code only to those who already know the Old Testament, and that is just the point.

A different story shows the failure of the experts, not the use of a cipher. In the book of Daniel, written most likely in the second century BC but set in Babylon in 539 BC, a hand writes four words on the wall at a royal banquet, and the Babylonian wise men cannot read them. Daniel can. The Aramaic words are plain ones, naming weights, and Daniel reads them as a verdict on the king. The mystery was not the letters but the meaning. It is a codebreaking story in the shape of the later ones: experts fail, an outsider succeeds, and the message is about power.

### Code it: gematria

```python
# Gematria: every Hebrew letter is also a number, so every word is a sum.
values = dict(zip("אבגדהוזחטיכלמנסעפצקרשת",
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400]))
finals = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}   # a final form has its plain letter's value

def gematria(word):
    return sum(values[finals.get(c, c)] for c in word if c != " ")

print("Nero Caesar, long spelling :", gematria("נרון קסר"))
print("Nero Caesar, short spelling:", gematria("נרו קסר"))
print("Babel:", gematria("בבל"), " Sheshach:", gematria("ששך"))
```

Output:

```
Nero Caesar, long spelling : 666
Nero Caesar, short spelling: 616
Babel: 34  Sheshach: 620
```

The last line makes a point about Atbash and gematria. They are different games. The sum of Babel is 34 and of Sheshach 620, and nobody has ever suggested that the two numbers are related. Atbash changes the letters; gematria changes them into numbers; and a scribe could do either, or both.

### Break it: the Bible code that was not

The oldest trick of reading a hidden message into a text has a modern form that deserves a section, because it is the best case study in how to test a claim of hidden writing. In 1994 three Israeli researchers, Doron Witztum, Eliyahu Rips and Yoav Rosenberg, published a paper in the journal *Statistical Science* claiming that the Hebrew text of Genesis contains the names of famous rabbis close to their dates of birth and death, in what are called **equidistant letter sequences** (ELS). To find one, strip out the spaces, pick a starting letter and a skip, say every 50th letter, and read forward or backward. In 1997 a journalist, Michael Drosnin, turned the idea into a best seller, *The Bible Code*, claiming predictions of modern events.

The test of such a claim is the one the code below runs. Letters hide words by chance. In a text of $n$ letters, a word of length $L$ starting at a given place with a given skip matches with probability about $26^{-L}$ (about $22^{-L}$ in Hebrew), and there are roughly $n$ starts and hundreds of skips. A four-letter word turns up dozens of times in a text of 20,000 letters, even if the skip is limited to 500, and a longer word turns up rarely. The question is whether the claimed finds are more than chance. The program below counts words in 20,000 *random* letters and compares what it finds with what chance predicts.

```python
# Equidistant letter sequences: how often does a word hide in random letters?
import random

rng = random.Random(1994)
text = "".join(chr(65 + rng.randrange(26)) for _ in range(20000))   # 20,000 random capital letters
MAX_SKIP = 500                                                    # look at skips 1 to 500

def count(word, text):
    n, total = len(word), 0
    for skip in range(1, MAX_SKIP + 1):
        for start in range(skip):
            line = text[start::skip]                 # every skip-th letter from this start
            i = line.find(word)
            while i != -1:
                total += 1
                i = line.find(word, i + 1)
    return total

for word in ("MARS", "MOSES", "TOMB", "NILE"):
    found = count(word, text) + count(word[::-1], text)              # forward and backward
    tries = sum(len(text) - (len(word) - 1) * s for s in range(1, MAX_SKIP + 1))
    print(f"{word:6} found {found:4} times; chance alone predicts about {2 * tries / 26 ** len(word):.1f}")
```

Output:

```
MARS   found   49 times; chance alone predicts about 42.1
MOSES  found    1 times; chance alone predicts about 1.6
TOMB   found   45 times; chance alone predicts about 42.1
NILE   found   39 times; chance alone predicts about 42.1
```

Random letters, with no author and no message, hide "MARS" forty-nine times and "TOMB" forty-five. The counts match chance, as they should. The remarkable result of the Bible-code claim would have been a count far above chance for a list chosen in advance. In 1999 Brendan McKay, Dror Bar-Natan, Maya Bar-Hillel and Gil Kalai published "Solving the Bible Code Puzzle" in the same journal. They showed that the rabbis' results depended on many unforced choices (how the names were spelled, which dates, which of several forms), and that with equal freedom the same methods found "predictions" in other texts, including the Hebrew translation of *War and Peace*. McKay also found "predictions" of the deaths of public figures in *Moby-Dick*. The lesson, which every historian of secret writing needs, is the same as the lesson of the sign-value toy in §2.4: a reader who is free to try every reading will find a word, and the question is always how many readings he tried.

## 2.7 Qumran: a script as a badge, and a scroll of treasure

*Level: intermediate.*

In the winter of 1946 to 1947, a Bedouin shepherd looking for a stray animal near the northwestern shore of the Dead Sea found a cave with clay jars in it, and in the jars, scrolls. Over the next decade, eleven caves around the ruins of Qumran yielded the remains of roughly nine hundred manuscripts, most of them in thousands of fragments. They range from the third century BC to the first century AD, and the settlement was destroyed by the Romans around AD 68. Many scholars link the site and the scrolls to a Jewish group called the Essenes, whom Pliny the Elder, Josephus and Philo describe; others dispute that link, and the debate is not settled. For this chapter the scrolls matter because a small number of them are written in scripts that nobody uses for ordinary Hebrew.

### Cryptic A

The best-attested of these is called **Cryptic A**: an alphabet of invented signs, one for each Hebrew letter, some of which, as the editors describe them, resemble older Hebrew forms or Greek letters. The substitution was worked out in the 1950s, because it is a plain one-to-one letter table, and the texts could be read. John Allegro, one of the first editors, published one of them in the 1960s, a short text that describes a person's character according to the zodiac sign under which he was born (it is cataloged as 4Q186). Other texts in Cryptic A include a legal commentary on the Mosaic law, a text of teachings addressed to "the sons of dawn", and calendars, such as one that follows the phases of the moon.

How many scrolls use Cryptic A is disputed. Stephen Pfann's 2000 edition in the *Discoveries in the Judaean Desert* series counted 36 manuscripts, most of them tiny fragments. In 2024 Jonathan Ben-Dov argued that only eight or nine of them are really in the script. In 2017 Eshbal Ratzon and Ben-Dov pieced one calendar back together from 42 small fragments, a reconstruction that shows what the work is like: a script with a few lines of text on each scrap, read from a table.

What was it for? The usual first thought is secrecy, and the second thought is that this cannot be right. The script is a plain letter substitution, easy to break; nothing in the cryptic scrolls is especially secret, the texts are on several different subjects, and the people who wrote them evidently expected someone to read them. Pfann suggested that the script marked texts for the community's leaders and teachers. Another suggestion ties the script to the content of the calendars: the community followed a 364-day solar calendar that differed from the one used at the Temple in Jerusalem, and a text about the true calendar was one that the Temple authorities might not have welcomed. All three are proposals. None has a statement by a Qumran scribe to support it. The most one can say is that the script worked as a **badge of membership**: a reader of Cryptic A had been taught it, and that meant something about who he was.

!!! note "Life story: Cryptic A"
    **Born:** the second or first century BC, at Qumran (several scripts, A, B and C, but A is the main one; B and C survive in only a few small fragments) · **Purpose:** unknown; proposals are a badge for teachers and leaders, or a cover for calendar texts that differed from the Temple's · **Helped:** the community's sense of who was inside; the first editors read it in the 1950s because it is a plain substitution · **Status:** broken at once and still partly argued over: how many scrolls use it (36, or eight or nine) and why

### Names that are not names

The Qumran scrolls also show the older trick of the cover name, at scale. In the commentaries the group wrote on biblical prophets, called **pesharim**, a verse about an ancient enemy is read as a prophecy about the group's own time, and the people of that time are not named. They are the "Teacher of Righteousness", the "Wicked Priest", the "Man of the Lie", and the "Kittim", who in the Habakkuk commentary are a fierce and distant power from across the sea, most likely the Romans. These are **descriptions used as names**. Anyone who knew the Bible and the group's story could follow them, so they hid no one from the community's own readers, and part of their effect may have been to give the story a timeless shape. Who these people were is debated, and scholars have proposed several candidates for the Wicked Priest, none certain.

### The Copper Scroll: a code nobody has solved

One object from Qumran is different from all the others, and it may contain a real, unsolved code. In 1952 Cave 3 yielded two rolls of copper, so corroded that they could not be unrolled. They were cut into strips, at Manchester in 1955 and 1956, and read. The text is a list of about sixty hiding places, in Judea and around Jerusalem, with quantities of silver, gold and other precious things at each. It is written in a rough, late form of Hebrew with some odd letter shapes, and it is dated, loosely, to the first century AD. John Allegro, who published it in 1960, thought the treasure real. Other scholars think the list is a literary invention, or the temple's property hidden before the Romans arrived. No place on the list has been found.

What makes it relevant here is a detail that no one has explained. After many of the entries come two or three Greek letters, with no relation to the Hebrew text before them. Several explanations have been offered, and none has convinced the field. This is the nearest thing in this chapter to an unsolved cipher, and nobody knows whether it is one, and if it is whether the key lay in the scribe's head or in a document that went with the scroll.

!!! note "Life story: the Copper Scroll (3Q15)"
    **Born:** found in Cave 3 at Qumran in 1952, opened by cutting it into strips in 1955 and 1956; the text is dated, loosely, to the first century AD · **Purpose:** a list of about sixty hiding places for treasure; whether the treasure was real, and whose, is unsettled · **Helped:** nothing in practice, since none of the places has been found; the Greek letter groups after the entries are unexplained · **Status:** an open puzzle; whether it hides a code, or only a list, is not known

### The sources and what they do not say

The Qumran evidence is real, large and unusually well published, and it shows less than the word "cryptic" suggests. A script of invented signs that is a one-to-one letter substitution can be read by anyone who has the table, and the table was cracked within a few years of discovery. A cave full of scrolls is, by its nature, a place where somebody meant them to last. What the scrolls show is a community that cared about who could read what, and that marked some texts in a way that said so. They do not show a secret anyone was in danger of losing.

## 2.8 Egypt after the pharaohs: Coptic ciphers

*Level: intermediate.*

By the fourth century AD, Egypt had been ruled by Persians, Macedonian Greeks and Romans, and it was turning Christian. The old script had not died yet, but it was surviving only in a few temples. Everyday Egyptian was written in a new way: **Coptic**, the Egyptian language written with the Greek alphabet plus half a dozen letters borrowed from the Demotic script for sounds Greek lacked. Coptic became the language of the Egyptian church and of a large literature, and it went on being spoken for centuries after the Arab conquest of Egypt in AD 640 to 642. It is the last stage of the language of the pharaohs, which matters for what follows.

In late antique and early Islamic Egypt, roughly the 300s to the 700s, Christian scribes writing Coptic and Greek used several small ciphers. Alain Delattre's survey of them, in a 2023 volume, centers on one called *αθβη* ("athbē"), a fixed swapping of letters that, like Atbash, is named after its first letters. Scribes also used codes built on the number values of letters, Caesar-style shifts, and deliberately distorted letter shapes. They turn up in manuscripts and on **ostraca**, the potsherds and flakes of limestone that Egyptians used as scrap paper. One ostracon from Djeme, the Coptic village built among the ruins of the temple of Ramesses III at Medinet Habu, near Thebes, dated between about 500 and 750, lists cipher alphabets, and Delattre has published another that combines two ciphers in one system. I know the Delattre survey only from a summary of it and from the library record of the ostracon, so what follows rests on those, not on the full text.

### What "athbē" probably is

The name gives it away, if it follows the same pattern as Atbash. Atbash pairs alef with tav and bet with shin. "Athbē" would pair alpha with theta (α, θ) and beta with eta (β, η), and those are the first and last of the first eight letters of the Greek alphabet, and the second and the seventh. So a plausible reading is that the alphabet was cut into runs and each run was reversed. It is the Greek cousin of the Hebrew **Atbah** of §2.5, which reverses each of the three number-groups of the alphabet (nine, nine and four letters). This is my reading of the name, not Delattre's published description, and it could be wrong in detail: the groups might be eight letters or nine (the Greek number system had signs for 6, 90 and 900 that are missing from the 24-letter alphabet), and the Coptic alphabet has extra letters. I use eight in the code below, which gives the right first two pairs. Treat the table as a worked example of what the name suggests, not as the scribes' table.

The scribes' motives are also unclear, but the context helps. Monks wrote in the margins of manuscripts and signed their work with their names, and a name in cipher is a signature that only a reader who cares would solve, in the spirit of the Babylonian acrostic of §2.4. Magical spell books of the same Egypt, in Greek and Demotic, are full of strings of letters designed to be strange. And a fixed swap of letters kept a casual reader out of a note, which is as much protection as a monk's marginal comment needed. Like the European monks' tricks of a few centuries later ([Chapter 5](05-The-Medieval-World.md)), these hid a name or a note from a casual reader, not from a determined one.

### Break it: which table did the scribe use?

Delattre's evidence suggests a short list of known tables. That is how an attacker would work today, and it is the right way to break an unknown ancient swap: write down every table you know of, undo each one, and see which gives words. The program below builds three tables on the 24 Greek letters (sigma is written without a final form to keep the alphabet at 24), encrypts a phrase with the third, and then tries all three on the ciphertext.

```python
# Three simple letter tables on the 24 Greek letters, and a way to tell which one a scribe used.
greek = "αβγδεζηθικλμνξοπρστυφχψω"

atbash = {a: b for a, b in zip(greek, greek[::-1])}               # first with last
shift3 = {greek[i]: greek[(i + 3) % 24] for i in range(24)}       # Caesar-style
blocks = {}                                                       # reverse inside each run of eight
for i in range(0, 24, 8):
    blocks.update(zip(greek[i:i + 8], greek[i:i + 8][::-1]))

def apply(table, text):
    return "".join(table.get(c, c) for c in text)

words = {"θεοσ", "αγαπη", "κυριοσ", "σοφια", "φωσ", "ζωη", "πιστισ"}   # a few Greek words to look for
secret = apply(blocks, "σοφια ζωη")          # what a scribe would have written
print("ciphertext:", secret)
for name, table in (("Atbash", atbash), ("shift by 3", shift3), ("blocks of eight", blocks)):
    # undo the table, then count how many known words come out
    inverse = {v: k for k, v in table.items()}
    plain = apply(inverse, secret)
    hits = [w for w in plain.split() if w in words]
    print(f"{name:16} gives {plain!r:16} words found: {len(hits)}")
```

Output:

```
ciphertext: ψκυπθ γρβ
Atbash           gives 'βοειρ χθψ'      words found: 0
shift by 3       gives 'υηρνε ωξψ'      words found: 0
blocks of eight  gives 'σοφια ζωη'      words found: 2
```

The words are *sophia* ("wisdom") and *zoe* ("life"). Only one table produces real words, and with the right table the two words come out at once. The method needs no frequency count. It needs only a list of the tables people used and a list of words they might have written. That is how a modern reader approaches any short table cipher: list the candidates and let the language choose.

!!! note "Life story: the Coptic letter ciphers"
    **Born:** Egypt, about the 300s to 700s AD, among Christian scribes writing Coptic and Greek; the Djeme ostracon (about 500 to 750) lists cipher alphabets · **Purpose:** signatures and notes hidden from a casual reader, spell texts, scribal play; no evidence of military or state use · **Helped:** monks' signatures and marginal notes · **Status:** each table is a fixed swap, broken by trying the known ones; the survey (Delattre, 2023) is recent and I have not seen it in full

One thread connects this chapter to the next. Medieval Arabic writers in Egypt took a great interest in the old scripts. Dhul-Nun al-Misri (died in the 860s, by the usual dating) was said to have read the hieroglyphs, and Ibn Wahshiyya, around 900, wrote a book that claims to explain the alphabets of ancient peoples, including Egyptian, though the keys he gives for hieroglyphs do not work. [Chapter 4](04-Baghdad-and-Cairo.md) tells that story and the first written method for breaking a cipher.

## 2.9 When the script itself is the cipher: from Horapollo to Champollion

*Level: intermediate.*

The last datable hieroglyphic inscription is a graffito at the temple of Isis on the island of Philae, cut on 24 August 394 by a priest named Esmet-Akhom. The last datable Demotic inscription, also from Philae, is from 452. The temple was closed under the emperor Justinian in the 530s. After that nobody could read the sacred script, and it stayed unreadable for almost fourteen hundred years. From then on, the signs on every temple wall were, to anyone who looked at them, a **cipher with no key and no clue**, and everything the Greeks, the Arabs and the Europeans said about hieroglyphs for the next fourteen centuries was a guess.

The guesses were mostly wrong in one direction. Clement of Alexandria had said, around AD 200, that the Egyptian sacred writing was symbolic. In the fifth century a text called the *Hieroglyphica* appeared under the name of Horapollo, a writer from the Egyptian town of Nilopolis, giving the meaning of nearly two hundred signs. A few of its entries are right (the vulture does stand for "mother", the hare for "open"), but most explain a sign as a moral emblem: the hawk, say, stands for the soul and for the sun. A copy was bought in 1419 on the Greek island of Andros, and printed by Aldus Manutius in Venice in 1505, and it shaped how the Renaissance read hieroglyphs: as a wise, hidden picture-language, a code of ideas, not of sounds. The Jesuit scholar Athanasius Kircher (1602 to 1680), who published a vast book on Egypt in the 1650s, built on that idea and produced readings that are charming and entirely wrong. He did one thing right: in 1636 he showed that Coptic was the last form of the ancient language of Egypt.

That one thing was the crib. Everything else is the story of a stone.

### The Rosetta Stone and a cartouche

In July 1799, French soldiers rebuilding a fort at Rashid (Rosetta) on the Nile delta found a slab of dark stone with three kinds of writing on it. The top is in hieroglyphs (14 lines, damaged), the middle in Demotic (32 lines) and the bottom in Greek (54 lines). The Greek says that it is a decree of the priests of Egypt, issued at Memphis in 196 BC in honor of the young king Ptolemy V, and that it is to be written in three scripts: "sacred", "native" and Greek. Britain took the stone after the French surrender in 1801, and it has been in the British Museum since 1802.

Here was a text with a known translation in the same document. In cryptanalysis this is called a **crib**, a piece of plaintext known or guessed to be in the message. It is the same weapon that the Poles and Bletchley would use against Enigma ([Chapter 12](12-Rotors-and-Enigma.md) and [Chapter 13](13-Bletchley-Park.md)). Two men used it. Thomas Young, an English physician and physicist who read widely in everything, worked out in the late 1810s that the Demotic and hieroglyphic texts matched the Greek word for word in places, that signs inside the oval rings called **cartouches** were royal names, and that some of those signs stood for sounds. He read Ptolemy's name. He did not get further, because he believed that the phonetic signs were only for foreign names.

Jean-François Champollion, a French scholar who had learned Coptic as a young man, took the next step. A second text helped him: an obelisk found at Philae, which carried a Greek inscription naming both Ptolemy and Cleopatra, and whose hieroglyphic part had a cartouche that William Bankes, who brought it to England, guessed to be Cleopatra's. The two names share several letters, so the signs for those letters should be the same in both cartouches. Figure 2.5 shows what the check looks like.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two royal names, Ptolemy and Cleopatra, written as rows of signs; lines join the signs they share" fill="currentColor" font-size="14">
<text x="320" y="20" text-anchor="middle" font-weight="bold">Ptolemy (from the Rosetta Stone)</text>
<rect x="60" y="32" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="89.0" y="54.0" font-size="14" text-anchor="middle">Q3</text>
<text x="89" y="84" text-anchor="middle" font-size="13">P</text>
<rect x="134" y="32" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="163.0" y="54.0" font-size="14" text-anchor="middle">X1</text>
<text x="163" y="84" text-anchor="middle" font-size="13">T</text>
<rect x="208" y="32" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="237.0" y="54.0" font-size="14" text-anchor="middle">V4</text>
<text x="237" y="84" text-anchor="middle" font-size="13">O</text>
<rect x="282" y="32" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="311.0" y="54.0" font-size="14" text-anchor="middle">E23</text>
<text x="311" y="84" text-anchor="middle" font-size="13">L</text>
<rect x="356" y="32" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="385.0" y="54.0" font-size="14" text-anchor="middle">G17</text>
<text x="385" y="84" text-anchor="middle" font-size="13">M</text>
<rect x="430" y="32" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="459.0" y="54.0" font-size="14" text-anchor="middle">M17</text>
<text x="459" y="84" text-anchor="middle" font-size="13">I</text>
<rect x="504" y="32" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="533.0" y="54.0" font-size="14" text-anchor="middle">S29</text>
<text x="533" y="84" text-anchor="middle" font-size="13">S</text>
<text x="320" y="268" text-anchor="middle" font-weight="bold">Cleopatra (from the Philae obelisk)</text>
<rect x="24" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="53.0" y="218.0" font-size="14" text-anchor="middle">V31</text>
<text x="53" y="188" text-anchor="middle" font-size="13">K</text>
<rect x="90" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="119.0" y="218.0" font-size="14" text-anchor="middle">E23</text>
<text x="119" y="188" text-anchor="middle" font-size="13">L</text>
<rect x="156" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="185.0" y="218.0" font-size="14" text-anchor="middle">M17</text>
<text x="185" y="188" text-anchor="middle" font-size="13">E</text>
<rect x="222" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="251.0" y="218.0" font-size="14" text-anchor="middle">V4</text>
<text x="251" y="188" text-anchor="middle" font-size="13">O</text>
<rect x="288" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="317.0" y="218.0" font-size="14" text-anchor="middle">Q3</text>
<text x="317" y="188" text-anchor="middle" font-size="13">P</text>
<rect x="354" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="383.0" y="218.0" font-size="14" text-anchor="middle">G1</text>
<text x="383" y="188" text-anchor="middle" font-size="13">A</text>
<rect x="420" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="449.0" y="218.0" font-size="14" text-anchor="middle">X1</text>
<text x="449" y="188" text-anchor="middle" font-size="13">T</text>
<rect x="486" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="515.0" y="218.0" font-size="14" text-anchor="middle">D21</text>
<text x="515" y="188" text-anchor="middle" font-size="13">R</text>
<rect x="552" y="196" width="58" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="581.0" y="218.0" font-size="14" text-anchor="middle">G1</text>
<text x="581" y="188" text-anchor="middle" font-size="13">A</text>
<line x1="89" y1="92" x2="317" y2="174" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="163" y1="92" x2="449" y2="174" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="237" y1="92" x2="251" y2="174" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="311" y1="92" x2="119" y2="174" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<line x1="459" y1="92" x2="185" y2="174" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<text x="620" y="130" text-anchor="end" font-size="12" opacity="0.8">M17 reads I in one name, E in the other</text>
<text x="620" y="148" text-anchor="end" font-size="12" opacity="0.8">The vulture G1 repeats: A, A</text>
</svg>
<figcaption>Figure 2.5. The crib. Four of the five shared signs stand for the same Greek letter in both names (P, T, O, L); the fifth stands for I in one and E in the other, which is a clue about how Egyptian signs map onto Greek sounds. Signs are named by their numbers in Gardiner's sign list.</figcaption>
</figure>

Here is the same check in code. It takes the two sign sequences, with the signs identified by their numbers in Gardiner's list, and the two Greek spellings of the names, and asks of every sign they share: do the Greek letters at that sign's two positions agree?

```python
# Young and Champollion's crib: two names, written in Greek, both in cartouches.
# Signs are given by their Gardiner list numbers. The two reed leaves that end
# Ptolemy's name are counted as one sign here.
ptolemy = ["Q3", "X1", "V4", "E23", "G17", "M17", "S29"]     # read: P T O L M I S
cleopatra = ["V31", "E23", "M17", "V4", "Q3", "G1", "X1", "D21", "G1"]   # K L E O P A T R A
greek = {"ptolemy": "PTOLMIS", "cleopatra": "KLEOPATRA"}

shared = [s for s in ptolemy if s in cleopatra]
for s in shared:
    a = greek["ptolemy"][ptolemy.index(s)]
    b = greek["cleopatra"][cleopatra.index(s)]
    print(s, "stands for", a, "in Ptolemy and", b, "in Cleopatra:", "agree" if a == b else "differ")
print("the vulture G1 appears twice in Cleopatra:",
      [greek["cleopatra"][i] for i, s in enumerate(cleopatra) if s == "G1"])
```

Output:

```
Q3 stands for P in Ptolemy and P in Cleopatra: agree
X1 stands for T in Ptolemy and T in Cleopatra: agree
V4 stands for O in Ptolemy and O in Cleopatra: agree
E23 stands for L in Ptolemy and L in Cleopatra: agree
M17 stands for I in Ptolemy and E in Cleopatra: differ
the vulture G1 appears twice in Cleopatra: ['A', 'A']
```

Four of the five shared signs agree, which would not happen by chance: the square is *p*, the loaf is *t*, the lasso is *o*, the lion is *l*. The one that differs is the reed leaf, *i* in Ptolemy and *e* in Cleopatra, and that is itself informative, because it shows that the Egyptian sign stood for a vowel that Greek ears heard as either. The vulture, which appears twice in Cleopatra, is *a* both times, as it must be. This is a simplified version: the real cartouche of Ptolemy has two reed leaves where the code has one, and the names have more detail than a table can show. The logic is what matters. A sign that recurs must stand for a recurring sound.

Champollion's decisive step was in September 1822. Young and others had assumed that phonetic signs were a trick for writing foreign names. Champollion looked at cartouches from earlier temples, with native pharaohs' names, and found that the same method read them. A cartouche at Abu Simbel had a sun disc, then a sign he had not yet placed, then two signs for *s*. The Coptic word for the sun is *re*, so the disc was Ra, and the Coptic verb *mise*, "to give birth", suggested that the middle sign was *ms*. That gives Ra-ms-s, Ramesses, "born of Ra". A cartouche with an ibis, the bird of Thoth, and the same middle sign then read as Thutmose, "born of Thoth". Two kings, one sign, one Coptic word. A story told by his brother's family, and often repeated, is that he ran to his brother's study with a roll of papers, cried that he had it, and fainted. He announced his result in his *Letter to M. Dacier*, dated 27 September 1822. The script was a mix of sound signs and meaning signs, and the language it wrote was Coptic's ancestor. Because he knew Coptic, he could do what Young could not: guess what the words were.

!!! note "Life story: the Rosetta Stone and Champollion's key"
    **Born:** the stone carved in 196 BC at Memphis (a decree of Ptolemy V, in hieroglyphs, Demotic and Greek); found in July 1799 near Rashid, in the Nile delta; Jean-François Champollion (1790 to 1832) announced the reading of hieroglyphs on 27 September 1822 · **Purpose:** the decree, to honor a king; the decipherment, to read the ancient Egyptian record · **Helped:** the whole of Egyptology, with Young's partial work, the Philae obelisk and a knowledge of Coptic as the crib · **Status:** in the British Museum since 1802; the Philae obelisk is at Kingston Lacy in England; the story of the rivalry between Young and Champollion is still argued

### Cuneiform: names, a cliff and sealed envelopes

Cuneiform was read by the same means, a generation later and in the opposite order. The Old Persian cuneiform of the Persian kings was easier than Babylonian, because it was nearly an alphabet, about 36 signs. In 1802 a German schoolteacher in Göttingen, Georg Friedrich Grotefend, guessed that the inscriptions at Persepolis followed a royal formula ("X, great king, king of kings, son of Y, king") and, using the known names of Persian kings from Greek writers, read the names of Darius, Xerxes and Hystaspes. His guess about the formula was the crib. The bigger problem was Babylonian, which has six hundred signs, and for which the key was the great trilingual inscription of Darius I (about 520 BC) cut on a cliff at Behistun in what is now Iran, in Old Persian, Elamite and Babylonian. The British officer Henry Rawlinson copied it between 1835 and 1847, hanging from ropes and ladders above the drop, and used the Old Persian text, which he could now read, to get into the Babylonian. The Irish clergyman Edward Hincks, working independently, saw in 1850 that Babylonian signs were syllables with several values each (the polyvalence of §2.4) and that the language was Semitic.

Was it right? That was the question, and in 1857 the Royal Asiatic Society tested it. A long cuneiform inscription on a newly found cylinder of the Assyrian king Tiglath-Pileser I was copied and sent to four scholars: Rawlinson, Hincks, William Henry Fox Talbot and Julius Oppert. Each translated it alone and sent the result in a sealed envelope. A committee of the Society opened the envelopes together and compared the texts. Apart from details, they agreed. A reading that four people reach independently, without comparing notes, does not come from their imaginations. That is **how a decipherment is proved**, and it is the same standard as a codebreaker's: not that the text sounds plausible, but that independent hands arrive at the same plaintext.

!!! note "Life story: the 1857 test of cuneiform decipherment"
    **Born:** 1857, Royal Asiatic Society, London; four translators (Rawlinson, Hincks, Talbot, Oppert) each worked on the same Tiglath-Pileser I inscription and sent sealed translations to a committee · **Purpose:** to show that Assyriology was a method and not a guess · **Helped:** settled the standing of Akkadian and of cuneiform decipherment, and made the whole record of Mesopotamia readable · **Status:** still cited as the model of a blind test; the sealed envelope, like the clay one at Kanesh, was the proof

## 2.10 In the real world: what the sources say and do not say

*Level: intermediate.*

A table is the easiest way to keep the cases straight. The first column is what is physically there. The second is what scholars infer. The third is how confident to be.

| Case | On the object | Inferred | Confidence |
|---|---|---|---|
| Khnumhotep II's inscription | unusual hieroglyphs, on a public tomb wall | dignity, learning, not secrecy | the signs are certain; the motive is a reading |
| Enigmatic hieroglyphs | rule-governed substitutions in tombs and temples | a puzzle for the learned (Darnell), or privacy (Drioton) | the texts are certain; no ancient statement of purpose |
| BM 120960 | rare sign values in a recipe | a trade secret | the writing is certain; the date (1700 to 1200 BC) and findspot are not |
| Number and sign-value writing | tables pairing numbers with syllables; Sargon's wall | scribal play and learning | well attested; the motive is a reading |
| Atbash in Jeremiah | two or three names, one clear case | a veiled name, wordplay, or a later gloss | the device is certain; the reason is debated |
| Cryptic A | a letter-substitution script on 8 to 36 manuscripts | a badge for teachers or leaders | the script is certain; the count and the reason are not |
| Copper Scroll Greek letters | letter groups after entries | unknown | nobody knows |
| Coptic letter ciphers | cipher alphabets on ostraca and in manuscripts | signatures and casual privacy | recent survey; evidence thin |

Five reasons to alter a script show up across the table (Figure 2.6), and only two of them keep anything from anyone. A scribe wanting to show dignity or learning, to turn a sacred text into a puzzle, or to mark who belonged to a group wrote for a reader, and the reader was meant to see the text and be impressed. A craftsman guarding a recipe, and an author who named an enemy by a cover name, wanted to be unreadable to someone, and they are the closest ancient relatives of the cipher. Even for them, the writing is a poor lock: it needs education, not a key, and it fails as soon as the reader has the sign list or the context.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Five reasons to alter a script, each with its main example from this chapter" fill="currentColor" font-size="14">
<rect x="200" y="14" width="240" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="41.0" font-size="14" text-anchor="middle" font-weight="bold">a script is deliberately altered</text>
<line x1="320" y1="58" x2="66" y2="120" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="10" y="120" width="112" height="64" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="66" y="144" text-anchor="middle" font-weight="bold" font-size="13">Dignity</text>
<text x="66" y="162" text-anchor="middle" font-size="12">Khnumhotep II</text>
<text x="66" y="177" text-anchor="middle" font-size="11" opacity="0.8">Beni Hasan</text>
<line x1="320" y1="58" x2="192" y2="120" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="136" y="120" width="112" height="64" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="192" y="144" text-anchor="middle" font-weight="bold" font-size="13">Sacred puzzle</text>
<text x="192" y="162" text-anchor="middle" font-size="12">enigmatic signs</text>
<text x="192" y="177" text-anchor="middle" font-size="11" opacity="0.8">Thebes, Esna</text>
<line x1="320" y1="58" x2="318" y2="120" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="262" y="120" width="112" height="64" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="318" y="144" text-anchor="middle" font-weight="bold" font-size="13">Trade secret</text>
<text x="318" y="162" text-anchor="middle" font-size="12">glass recipe</text>
<text x="318" y="177" text-anchor="middle" font-size="11" opacity="0.8">BM 120960</text>
<line x1="320" y1="58" x2="444" y2="120" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="388" y="120" width="112" height="64" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="444" y="144" text-anchor="middle" font-weight="bold" font-size="13">Cover name</text>
<text x="444" y="162" text-anchor="middle" font-size="12">Sheshach, 666</text>
<text x="444" y="177" text-anchor="middle" font-size="11" opacity="0.8">Jeremiah, Revelation</text>
<line x1="320" y1="58" x2="570" y2="120" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>
<rect x="514" y="120" width="112" height="64" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="570" y="144" text-anchor="middle" font-weight="bold" font-size="13">Group badge</text>
<text x="570" y="162" text-anchor="middle" font-size="12">Cryptic A</text>
<text x="570" y="177" text-anchor="middle" font-size="11" opacity="0.8">Qumran</text>
<text x="320" y="224" text-anchor="middle" font-size="13">Only the cover name and the trade secret keep anyone out. Dignity, a puzzle and a badge</text>
<text x="320" y="244" text-anchor="middle" font-size="13">let everyone see the text and show only who can read it.</text>
<text x="320" y="276" text-anchor="middle" font-size="12" opacity="0.8">The reason is inferred from the texts in each case; no writer states it.</text>
</svg>
<figcaption>Figure 2.6. Five reasons a script was changed in the ancient Near East. In none of them is there a key shared between two people and withheld from a third, which is what a cipher needs.</figcaption>
</figure>

The two threads that run through this book ([Chapter 1](01-Why-People-Hid-Writing.md)) show up here in their earliest form. **Makers are trusted, breakers are proved.** No scribe in this chapter tells us how well his scheme worked, and the evidence that anything worked is the same as the evidence that nothing did: a text survives, so it was copied or buried, and a reader years later could read it. The breakers, in contrast, leave proof: the 1857 envelopes, Champollion's *Letter*, the pages of Gadd and Thompson. And **the weak point is rarely the mathematics.** The Atbash table has no key to find; the sign-value text needs only a sign list; the athbē table is a short list. In every case the secret was that the reader did not know a convention, and the end of the secret was the reader learning it.

### Can these be broken today?

Yes, every one, most by hand in minutes, except where there is too little text or too little context to say. Here is each method in this chapter.

| Method | Broken today? | The attack in plain words |
|---|---|---|
| Altered signs at Beni Hasan | not a cipher | No key. A reader who knows the sign list reads it. |
| Enigmatic hieroglyphs | read, with effort | The substitution rules have been worked out from the many texts; the Esna crocodile hymn is only partly read because the stone is damaged. |
| Rare sign values (BM 120960) | with the sign list | Try each value of each sign and test against known recipe words (the toy of §2.4). |
| Number-for-syllable tables | at once, with the table | One fixed table: look it up. |
| Atbash, Albam, Atbah | instantly | No key at all. Build the three tables and see which gives a word (§2.5). |
| Gematria | as a riddle only | Add the letters. The only difficulty is guessing which name to test. |
| Cryptic A | broken in the 1950s | A one-to-one letter table, readable once a few words are matched. |
| Copper Scroll Greek letters | unknown | Too few examples, no known plaintext; may not be a code at all. |
| Coptic letter swaps | instantly | Try the known tables and check for words (§2.8). |

## 2.11 Going deeper

*Level: expert.*

**What counts as cryptography?** Kahn's second chapter treats Khnumhotep as the first cryptography, and the Egyptologists' use of the word has made the claim sound stronger than it is. A definition that fits all the cases needs three tests: the writing is a deliberate departure from the standard form (a), the departure follows rules (b), and a particular reader is meant to be excluded or selected by it (c). Almost every case in this chapter passes (a) and (b). Few pass (c), and the ones that do are weak: a recipe, a cover name. The honest conclusion is that the Near East before Greece had **cryptography as an element of scribal culture** (a taste for rare forms, number play, sign puzzles), and no **cryptography as a secure channel** between two parties against a third. That second idea belongs to the military and diplomatic world that [Chapters 3](03-Greece-and-Rome.md) and [6](06-Italy-Ambassadors-and-Nomenclators.md) describe, and it needs an enemy who is reading and a messenger who might be caught. The scribes of this chapter wrote for gods, for the dead, for patrons, and for each other.

**The mathematics of the three pairings.** Number the 22 Hebrew letters 0 to 21. Atbash is the map $x \mapsto 21 - x$, Albam is $x \mapsto x + 11 \pmod{22}$, and both are involutions, since applying either twice gives $x$. Neither has a fixed point: $21 - x = x$ would need $2x = 21$, impossible in integers, and $x + 11 = x$ is impossible too. Atbah reverses each of the three number groups of nine, nine and four letters, so it leaves two letters fixed, he (the middle of the units) and nun (the middle of the tens). The three are a tiny part of the space of all letter-pairing ciphers. The number of ways to pair 22 letters into 11 swapping pairs is $21!! = 21 \cdot 19 \cdot 17 \cdots 3 \cdot 1 = 13{,}749{,}310{,}575$, a key space of about $2^{33.7}$, against $22! \approx 1.1 \times 10^{21}$ possible one-to-one substitutions. A scribe who used one of them in secret would have had a key space of 13.7 billion, which is no help against a reader who tries the three known tables first. The point is the one [book 1](../../book/01-What-Cryptography-Is-For.md) makes about Kerckhoffs: a table that is part of the culture is not a key.

**Decipherment as cryptanalysis, and its limits.** A decipherment is a cryptanalysis in which the cipher is a script, the key is unknown and the plaintext is a language you may not know. The attacks used in this chapter are the standard ones. A **crib** gives you known plaintext (the Greek of the Rosetta Stone; the royal formula of Persepolis). **Frequency and recurrence** give you the sign inventory: Young and Champollion's reading of the repeating vulture, and Grotefend's identification of a repeated word as "king". **Related languages** give you the plaintext's grammar (Coptic for Egyptian, Hebrew and Arabic for Akkadian). And a **blind test** gives you proof (1857). When one of these is missing, decipherment stalls. The Indus script has no bilingual and very short texts, and Linear A has the sign values (from Linear B) but not the language. The mathematics behind this is the idea of **unicity distance** ([Chapter 2 of the cryptography book](../../book/02-Classical-Ciphers.md), and [Cryptanalysis, chapter 1](../cryptanalysis/01-What-Cryptanalysis-Is.md)): below a certain amount of text, the number of readings consistent with the evidence is more than one, and no amount of cleverness can pick among them.

**Linear B and a woman who was nearly forgotten.** The best demonstration of a decipherment with no bilingual is Linear B, the script of Bronze Age Crete and Mycenaean Greece, read in 1952 by the English architect Michael Ventris. His work rested on that of the American classicist Alice Kober (1906 to 1950), who died at 43 before the result. Kober worked with no language to start from. She copied the tablets' words onto thousands of index cards she cut by hand, and noticed that some words came in sets that differed only in their endings, which she called "triplets". Since a language with inflection changes its endings systematically, signs in the same position of related words must share a consonant or a vowel, and she could build a grid of relations among the signs without knowing what any sign sounded like. Ventris filled in the grid and in 1952 guessed, against his own earlier expectation, that the language was Greek, and it worked. Kober's method, a pure structural attack on a script, is a close relative of the Kasiski and Friedman methods of [Chapter 10](10-The-Telegraph.md) and [Chapter 11](11-Radio-War-and-the-One-Time-Pad.md): you find the pattern in the repetitions before you know the key.

**Open questions.** Four of the questions in this chapter are still open. Was the rare-sign writing of BM 120960 meant to hide the recipe, or is it the ordinary jargon of a craft? Did the priests of Esna regard their ram and crocodile hymns as secret? Why did Qumran scribes use Cryptic A for some texts and not others, and how many of them did? And what are the Greek letters in the Copper Scroll? A new fragment, a new dated text or a new table could settle any of them. Until then they are the best test of how much a historian of secret writing is willing to say with only the objects in hand.

## Check yourself

??? question "1. Why can Khnumhotep II's inscription not be called a cipher, even though the scribe altered the script?"

    A cipher needs a key and a reader who is meant to be kept out. The inscription is cut on a tomb wall for visitors, and the unusual signs are ordinary hieroglyphs that a trained reader could recognize. The scribe altered the script on purpose, one ingredient of cryptography. The other, a reason to keep someone from reading, is absent.

??? question "2. A word of six sounds can be written with any of four signs for each sound. How many spellings are there?"

    $4^6 = 4{,}096$. A reader who knows only one sign per sound recognizes one spelling in 4,096, about 0.02 percent. A reader who knows all four recognizes every spelling.

??? question "3. Decrypt the Atbash message `NZIH` in the Latin alphabet."

    N becomes M, Z becomes A, I becomes R and H becomes S: MARS. Atbash is its own inverse, so applying it to MARS gives back NZIH.

??? question "4. Albam pairs alef with lamed. What does it pair with bet, and why is Albam its own inverse?"

    Bet (letter 2) pairs with mem (letter 13), because the lower letter is always 11 places on. Albam is $x \mapsto x + 11 \pmod{22}$, and $(x + 11) + 11 = x + 22 \equiv x \pmod{22}$, so applying it twice returns the original letter.

??? question "5. Show that אהבה (love) and אחד (one) have the same gematria."

    Alef 1, he 5, bet 2, he 5 sum to 13. Alef 1, het 8, dalet 4 sum to 13. Tradition reads the coincidence as a link between love and the oneness of God. Anyone can check it once they know the number values, which is why gematria is a riddle and not a cipher.

??? question "6. In §2.9 four of five shared signs agree between the names and one does not. Is that a problem for the decipherment?"

    No. The Egyptian sign M17 stood for a vowel that Greek ears heard as either *i* or *e*. The agreement of the other four would be a freak accident if the signs were not alphabetic, so it supports the reading, and the mismatch tells you something about the sound system. A decipherment with no exceptions at all would be suspicious.

??? question "7. Why does the 1857 test of cuneiform count as evidence, when a single scholar's translation does not?"

    One scholar can find a plausible reading in almost any set of signs, as the letter-sequence search of §2.6 finds words in random letters. Four scholars who work separately and still agree would not do so if the readings were guesses. The sealed envelopes ruled out copying.

??? question "8. In the random-letter program of §2.6 the chance of one fixed place and skip matching a word of length $L$ is $26^{-L}$. About how many matches should a seven-letter word give, if there are about 9.25 million places and skips tried, in both directions?"

    $2 \times 9{,}248{,}500 / 26^7 \approx 18{,}497{,}000 / 8{,}031{,}810{,}176 \approx 0.0023$. The word almost never appears by chance. A four-letter word, with $26^4 = 456{,}976$, gives about 42, as the program found. The length of the word decides whether a find means anything.

??? question "9. How many ways are there to pair the 22 Hebrew letters into 11 swapping pairs, and are the three scribal tables a meaningful share of that?"

    $21!! = 13{,}749{,}310{,}575$, about $2^{33.7}$. Atbash and Albam are two of them (Atbah leaves two letters unpaired). The number does not make either stronger, because nobody chose among the 13.7 billion: the table was a convention that everyone in the trade knew.

??? question "10. Argue for and against calling Jeremiah's Atbash a cipher."

    For: it is a deliberate, rule-governed alteration of letters that replaces a name the author could have written. Against: it has no key, the text names Babylon openly in the same verse, ancient translators understood it, and some scholars think a later copyist added it. A fair summary is a **cipher-like device used as wordplay or a veil**; the evidence does not say which. A better answer adds the Akkadian ŠEŠ.KI explanation of "Sheshach", which would make the Atbash reading a later coincidence.

## What you learned

- Before ciphers there was **altered writing**: scribes bent scripts for dignity (Khnumhotep II), for sacred puzzles (enigmatic hieroglyphs), for trade secrets (BM 120960), for cover names (Sheshach, 666) and as a badge of a group (Cryptic A). Only the trade secret and the cover name keep anyone out.
- Hieroglyphic and cuneiform signs have many readings, so a scribe could hide a text in rare readings and number values. The protection lasts only until the reader has the sign list and some context.
- Atbash, Albam and Atbah are fixed letter pairings with no key. Jeremiah's Atbash hid nothing, since the text names Babylon beside it, and scholars still argue over why it is there.
- Gematria turns a name into a number; it is a riddle, not a lock. Revelation's 666, read as Nero Caesar, is the best-known case, and the equidistant-letter "Bible code" is the best case study in how to test a claim of hidden writing.
- The Dead Sea scrolls' Cryptic A is a plain letter substitution, probably a badge, and the Copper Scroll's Greek letter groups are an unsolved puzzle.
- When a script is forgotten it becomes a cipher to the next age. Hieroglyphs and cuneiform were read again by cribs (the Rosetta Stone, royal names, Old Persian names, Coptic), and the proof of a decipherment is independent readers arriving at the same text.
- The evidence for this period is thin, mostly public, and often interpreted by scholars centuries later; where a date or a motive is a reading, this chapter says so.

**Next:** [Chapter 3](03-Greece-and-Rome.md), where hidden writing gets an enemy: Herodotus's hidden messages, the Spartan skytale, Polybius's square and Caesar's shift.

## Further reading

- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev. ed., Scribner, 1996; first ed. 1967), chapter 2: Khnumhotep II, the glaze tablet, Atbash.
- Percy E. Newberry, *Beni Hasan*, part 1 (Archaeological Survey of Egypt, 1893): the tomb of Khnumhotep II.
- John C. Darnell, *The Enigmatic Netherworld Books of the Solar-Osirian Unity* (Orbis Biblicus et Orientalis 198, 2004).
- Serge Sauneron, *Esna* (Institut français d'archéologie orientale, 1959 onward) / Christian Leitz, "Die beiden kryptographischen Inschriften aus Esna mit den Widdern und Krokodilen", *Studien zur Altägyptischen Kultur* 29 (2001).
- Alan H. Gardiner, *Egyptian Grammar* (3rd ed., Oxford, 1957): the sign list used in §2.9.
- C. J. Gadd and R. Campbell Thompson, "A Middle-Babylonian Chemical Text", *Iraq* 3 (1936), pp. 87 to 96 / A. Leo Oppenheim and others, *Glass and Glassmaking in Ancient Mesopotamia* (Corning Museum of Glass, 1970).
- Laurie E. Pearce, *Cuneiform Cryptography: Numerical Substitutions for Syllabic and Logographic Signs* (PhD thesis, Yale, 1982).
- Alan Lenzi, *Secrecy and the Gods: Secret Knowledge in Ancient Mesopotamia and Biblical Israel* (State Archives of Assyria Studies 19, 2008).
- Klaas R. Veenhof and Jesper Eidem, *Mesopotamia: The Old Assyrian Period* (Orbis Biblicus et Orientalis 160/5, 2008): Kanesh and its sealed tablets.
- Jeremiah 25:26, 32:10 to 14, 36, 51:1, 51:41, 51:59 to 64 (Masoretic text, the Septuagint and Targum Jonathan); Revelation 13:18; Daniel 5.
- Stephen J. Pfann, "Cryptic Texts", in *Discoveries in the Judaean Desert* 36 (Oxford, 2000) / Eshbal Ratzon and Jonathan Ben-Dov, "A Newly Reconstructed Calendrical Scroll from Qumran in Cryptic Script", *Journal of Biblical Literature* 136, no. 4 (2017), pp. 905 to 936 / John M. Allegro, *The Treasure of the Copper Scroll* (1960).
- Alain Delattre, on cryptography in late antique Egypt, in S. Holvoet and R. Veymiers (eds.), *Les écritures orientales, inventées, cryptées, détournées, oubliées, redécouvertes...* (2023), pp. 185 to 204 / Duke Collaboratory for Classics Computing, Digital Corpus of Literary Papyri, record 128462 (the Djeme ostracon).
- Clement of Alexandria, *Stromata* 5.4 / Horapollo, *Hieroglyphica* (fifth century; printed 1505).
- Richard Parkinson, *Cracking Codes: The Rosetta Stone and Decipherment* (British Museum Press, 1999) / Lesley and Roy Adkins, *The Keys of Egypt* (2000) / Andrew Robinson, *Cracking the Egyptian Code: The Revolutionary Life of Jean-François Champollion* (2012).
- Maurice Pope, *The Story of Decipherment* (rev. ed., Thames and Hudson, 1999) / Margalit Fox, *The Riddle of the Labyrinth* (2013): Alice Kober and Michael Ventris.
- Doron Witztum, Eliyahu Rips and Yoav Rosenberg, "Equidistant Letter Sequences in the Book of Genesis", *Statistical Science* 9 (1994) / Brendan McKay, Dror Bar-Natan, Maya Bar-Hillel and Gil Kalai, "Solving the Bible Code Puzzle", *Statistical Science* 14 (1999).

*Weaker sources:* Delattre's survey and the Djeme ostracon record, from a library abstract and catalog entry; the British Museum and Science Museum entries for BM 120960 (date, findspot), from search summaries; the Esna hymns' dating and present state of decipherment, from online commentaries, not from Sauneron or Leitz directly; Ben-Dov's 2024 count of the cryptic scrolls; the Rashi and Jerome comments on Sheshach, from usual retellings; the Talmud and Genesis Rabbah on Eliezer and 318, from secondary accounts.
