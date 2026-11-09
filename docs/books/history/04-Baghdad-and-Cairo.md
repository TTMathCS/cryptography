# 4. Baghdad and Cairo: the first codebreakers

*In ninth-century Baghdad a philosopher wrote down how to read a secret message without being told the key. This chapter tells how a city of paper, clerks and grammarians produced the first codebreakers we can name: who they were, what their surviving books say and what they leave out, how those books came back from the manuscript shelves in the twentieth century, and why no one can say whether Europe ever read them. You will count the words of Arabic the way al-Khalil did, break two secret letters with al-Kindi's method, and test Ibn 'Adlan's answer to the question every codebreaker asks: how much ciphertext is enough?*

!!! abstract "In this chapter"
    **You will learn:**

    - why the Abbasid empire, its post roads and its chanceries needed ciphers, and why the people who broke them were grammarians and mathematicians, not spies;
    - who al-Khalil, al-Kindi, Ibn Wahshiyya, Ibn Dunaynir, Ibn 'Adlan, Ibn ad-Durayhim and al-Qalqashandi were, and what each book contributed;
    - how al-Kindi's method works step by step, including the part that does the real work, the guessing of probable words;
    - how the abjad number system turned letters into arithmetic, and why ciphers built on sums fall to the same method;
    - how a lost book, a quoted book and a manuscript in Istanbul together made up our picture, and where that picture has gaps (Byzantium above all);
    - what the evidence says about whether Europe learned the method from the Arabic books.

    **You need:** [Chapter 1](01-Why-People-Hid-Writing.md) (code, cipher and steganography) and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) (the substitution cipher and its alphabet). The method itself is taught in full in [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md); here you meet it as the people who found it did.

    **Levels:** §4.1 to §4.5 and §4.9 are for beginners, §4.6 to §4.8, §4.10 and §4.11 are intermediate, §4.12 is expert.

## 4.1 The problem: a caliphate's mail

*Level: beginner.*

The Abbasid family took the caliphate in 750. In 762 the second Abbasid caliph, al-Mansur, laid out a new capital on the Tigris and named it Baghdad. At its widest the empire the caliphs claimed stretched from North Africa to the Indus and Central Asia, though by the middle of the ninth century governors from Egypt to Khurasan were already running their provinces much as they liked. What held the place together, loosely, was paper. A governor wrote to the capital about taxes and rebellions. The capital wrote back with orders and appointments. Rulers on the borders, Byzantine, Khazar, Indian, Frankish, were sent letters with gifts and answers. Every one of these letters crossed hundreds or thousands of miles of country that someone else might be holding.

The state carried its mail by the *barid*, a post of relay stations where couriers changed horses or mules. The official in each province who ran the post, the *sahib al-barid*, also wrote reports on the governor himself, so that the post carried both the caliph's orders out and his intelligence in. The letters were folded, tied and closed with a seal of clay or wax pressed by a signet ring. The Bureau of the Seal (*Diwan al-Khatam*) is traditionally said to date from the Umayyad caliph Mu'awiya (ruled 661 to 680), after a forged order drew money from the treasury. The story is told by later chroniclers and should be read as one, but the bureau itself was real, and it shows what the seal was for: it proved who had written a letter and that the letter had not been changed. It did not make a letter secret. A man who broke the clay and pressed a fresh seal over it might be caught, or might not. A man who captured the courier read the letter and kept it.

For ordinary business that did not matter. For news of an army, a plan to remove a governor, or the terms offered to an enemy, it did. The answer was the one the ancient world had already found ([chapter 2](02-Egypt-Mesopotamia-and-the-Bible.md) and [chapter 3](03-Greece-and-Rome.md)): write the letter so that only the person who knows the method can read it. Arabic books that teach such methods survive, and the ciphers they describe are simple: replace each letter with another letter or an invented sign, rearrange the letters by a rule, or turn the letters into numbers and do sums on them.

This chapter is about the problem on the other side of the table. A cipher that is safe only while nobody knows the method has no way of surviving the first reader who works the method out. In Baghdad, within about a century of its founding, someone did. The question is not why the clerks wanted ciphers. It is why the first people to write down how to break one were a grammarian in Basra and a philosopher in Baghdad, and what exactly they wrote.

### The people, and the shelf they left

Seven names carry the story: al-Khalil, al-Kindi, Ibn Wahshiyya (in whose name a book of old alphabets circulated), Ibn Dunaynir, Ibn 'Adlan, Ibn ad-Durayhim and al-Qalqashandi. Figure 4.1 puts them on one line.

Here is what the shelf looks like. One book is lost (al-Khalil's). One survives in a single manuscript copy that scholars did not publish until 1987 (al-Kindi's). One is not about breaking at all, and not certainly by its named author (Ibn Wahshiyya's). Three survive because Arab Academy editors searched manuscript libraries from about 1979 on (Ibn Dunaynir's, Ibn 'Adlan's and Ibn ad-Durayhim's). And one was in print from 1913 to 1919, which is why, when David Kahn wrote *The Codebreakers* in 1967, al-Qalqashandi was the main source anyone outside the Arabic-reading world had. The oldest and most important text was the last to be found. "The first codebreakers" in this chapter means the first we have texts for.

<figure class="mars-fig">
<svg viewBox="0 0 640 410" width="640" role="img" aria-label="Timeline from the founding of Baghdad in 762 to the English edition of al-Kindi's treatise in 2003" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="402" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">762</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">Baghdad founded by al-Mansur</text>
<text x="88" y="55" font-size="14" text-anchor="end" font-weight="bold">786/91</text>
<circle cx="102" cy="50" r="3.5" fill="currentColor"/>
<text x="118" y="55" font-size="14" text-anchor="start">al-Khalil dies; his book on cryptograms is lost</text>
<text x="88" y="83" font-size="14" text-anchor="end" font-weight="bold">c. 794</text>
<circle cx="102" cy="78" r="3.5" fill="currentColor"/>
<text x="118" y="83" font-size="14" text-anchor="start">First paper mill in Baghdad (traditional date)</text>
<text x="88" y="111" font-size="14" text-anchor="end" font-weight="bold">813-33</text>
<circle cx="102" cy="106" r="3.5" fill="currentColor"/>
<text x="118" y="111" font-size="14" text-anchor="start">al-Ma'mun; the translation movement at its height</text>
<text x="88" y="139" font-size="14" text-anchor="end" font-weight="bold">c. 850</text>
<circle cx="102" cy="134" r="4.5" fill="currentColor"/>
<text x="118" y="139" font-size="14" text-anchor="start" font-weight="bold">al-Kindi writes the treatise on deciphering</text>
<text x="88" y="167" font-size="14" text-anchor="end" font-weight="bold">800s-900s</text>
<circle cx="102" cy="162" r="3.5" fill="currentColor"/>
<text x="118" y="167" font-size="14" text-anchor="start">Book of old alphabets, attributed to Ibn Wahshiyya</text>
<text x="88" y="195" font-size="14" text-anchor="end" font-weight="bold">1200s</text>
<circle cx="102" cy="190" r="3.5" fill="currentColor"/>
<text x="118" y="195" font-size="14" text-anchor="start">Ibn Dunaynir; Ibn 'Adlan writes for al-Ashraf of Damascus</text>
<text x="88" y="223" font-size="14" text-anchor="end" font-weight="bold">1312-61</text>
<circle cx="102" cy="218" r="3.5" fill="currentColor"/>
<text x="118" y="223" font-size="14" text-anchor="start">Ibn ad-Durayhim, author of the Keys to the Treasures</text>
<text x="88" y="251" font-size="14" text-anchor="end" font-weight="bold">1412</text>
<circle cx="102" cy="246" r="4.5" fill="currentColor"/>
<text x="118" y="251" font-size="14" text-anchor="start" font-weight="bold">al-Qalqashandi finishes his manual for secretaries</text>
<text x="88" y="279" font-size="14" text-anchor="end" font-weight="bold">1913-19</text>
<circle cx="102" cy="274" r="3.5" fill="currentColor"/>
<text x="118" y="279" font-size="14" text-anchor="start">His fourteen volumes printed in Cairo</text>
<text x="88" y="307" font-size="14" text-anchor="end" font-weight="bold">1967</text>
<circle cx="102" cy="302" r="3.5" fill="currentColor"/>
<text x="118" y="307" font-size="14" text-anchor="start">Kahn's The Codebreakers draws on al-Qalqashandi</text>
<text x="88" y="335" font-size="14" text-anchor="end" font-weight="bold">1987</text>
<circle cx="102" cy="330" r="4.5" fill="currentColor"/>
<text x="118" y="335" font-size="14" text-anchor="start" font-weight="bold">al-Kindi's treatise published in Damascus</text>
<text x="88" y="363" font-size="14" text-anchor="end" font-weight="bold">1992</text>
<circle cx="102" cy="358" r="3.5" fill="currentColor"/>
<text x="118" y="363" font-size="14" text-anchor="start">Al-Kadi's paper brings it to Western readers</text>
<text x="88" y="391" font-size="14" text-anchor="end" font-weight="bold">2003</text>
<circle cx="102" cy="386" r="3.5" fill="currentColor"/>
<text x="118" y="391" font-size="14" text-anchor="start">English translation of the Arabic series begins</text>
</svg>
<figcaption>Figure 4.1. The first codebreakers and the way their books came back. The bold entries matter most: when al-Kindi wrote, when al-Qalqashandi preserved the tradition, and when al-Kindi was first published.</figcaption>
</figure>

## 4.2 Baghdad: paper, clerks and counters

*Level: beginner.*

A skill needs a place where enough people have time to practice it. Three things in ninth-century Baghdad made it that place for breaking ciphers.

### Paper

Before paper, the Mediterranean world wrote on papyrus, which was cheap in Egypt and costly elsewhere, and on parchment, which meant a flayed animal for every few pages. Paper made from rags and plant fiber came to the Islamic world from China by way of Central Asia. A popular story ties its arrival to the battle at Talas in 751, but historians treat it with care, since paper was already made in Samarkand and probably came by trade too. What is not in doubt is that a paper mill was working in Baghdad by the 790s, traditionally dated to about 794 in the reign of Harun al-Rashid, and that the price of writing fell. Booksellers and copyists (*warraqin*, "paper men") set up shops in a market of their own in Baghdad. A book could be copied and sold. A secretary could keep a draft of every letter, and a government could write down what it used to say aloud.

That matters here because a cipher is a written thing. Where letters are rare and read by a few men, a secret letter is mostly kept secret by who touches it. Where letters are daily and read by hundreds of clerks, a cipher has to be explained to many people, and one of those people can get curious about how to undo it.

### Clerks

The empire's letters were written by a class of professional secretaries, the *kuttab* (singular *katib*). The caliphate inherited this class and its habits from the Sasanian Persian state that the early caliphs absorbed, and many leading secretaries were Persians or of Persian families. The model of the learned secretary in Arabic is Abd al-Hamid al-Katib (died about 750), who wrote letters for the last Umayyad caliph; his younger contemporary Ibn al-Muqaffa' translated the Middle Persian book of fables *Kalila wa Dimna* into Arabic prose. The Barmakids, an Iranian family from Balkh, supplied viziers to Harun al-Rashid until 803.

The chancery was divided into bureaus (*diwans*): one for letters and orders (*Diwan al-Rasa'il*), one for the seal, one for the post, one for the army, one for taxes. A secretary was expected to be learned in more than writing. A secretary's education, called *adab*, took in grammar, poetry, rhetoric, arithmetic and the lore of the court. Guides for secretaries were a recognized kind of book, from Ibn Qutayba's *Adab al-katib* in the ninth century to al-Qalqashandi's enormous one in 1412. Secrets were part of the job. A secretary who knew the king's business also knew how to keep the letters about it safe, and how to read someone else's.

### Counters

The third thing was a habit of counting. Arabic grammar was among the first sciences the new Muslim world built. It grew out of the need to fix the Arabic of the Qur'an, and it quickly became a discipline of counting and sorting. The grammarians of Basra and Kufa described how Arabic words are built from roots, usually of three consonants, and which consonants can and cannot sit together in a root. Sibawayh (died about 796), a Persian who learned Arabic as a second language and wrote the great grammar called simply *al-Kitab*, "the Book", worked in the same Basran circle as al-Khalil. Later traditions credit scholars of the Qur'an with counting its words and letters. Whether or not each of those stories is accurate, the habit is real: a literate Baghdadi of the ninth century knew that a language has statistics.

The mathematics came from three sources at once. Greek geometry and astronomy were translated in great quantity. Indian arithmetic, with its nine digits and its symbol for zero, was taught in Baghdad by al-Khwarizmi (about 780 to about 850), whose name gave English the word *algorithm* and whose book on restoring and balancing gave it *algebra*. Al-Kindi himself is credited, in lists of his works, with several books on Indian calculation. And the practice of working out arrangements, how many ways a set of objects can be ordered, was in the air from al-Khalil's dictionary onward (§4.3).

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Three skills of ninth-century Baghdad, administration, language study and mathematics, feed into one skill, cryptanalysis" fill="currentColor" font-size="14">
<rect x="20" y="20" width="180" height="84" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110" y="44" font-size="14" text-anchor="middle" font-weight="bold">Administration</text>
<text x="110" y="64" font-size="12" text-anchor="middle">chanceries, post roads,</text>
<text x="110" y="80" font-size="12" text-anchor="middle">seals, letters in cipher</text>
<rect x="230" y="20" width="180" height="84" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="44" font-size="14" text-anchor="middle" font-weight="bold">Language study</text>
<text x="320" y="64" font-size="12" text-anchor="middle">roots of three consonants,</text>
<text x="320" y="80" font-size="12" text-anchor="middle">letters that can and cannot meet</text>
<rect x="440" y="20" width="180" height="84" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="530" y="44" font-size="14" text-anchor="middle" font-weight="bold">Mathematics</text>
<text x="530" y="64" font-size="12" text-anchor="middle">Greek and Indian sources,</text>
<text x="530" y="80" font-size="12" text-anchor="middle">counting arrangements</text>
<line x1="110" y1="104" x2="250" y2="162" stroke="currentColor" stroke-width="1.3"/>
<polygon points="250,162 242.6,161.2 245.3,154.7" fill="currentColor"/>
<line x1="320" y1="104" x2="320" y2="160" stroke="currentColor" stroke-width="1.3"/>
<polygon points="320,162 316,155 324,155" fill="currentColor"/>
<line x1="530" y1="104" x2="390" y2="162" stroke="currentColor" stroke-width="1.3"/>
<polygon points="390,162 394.7,156.3 397.4,162.8" fill="currentColor"/>
<rect x="120" y="164" width="400" height="76" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="320" y="190" font-size="14" text-anchor="middle" font-weight="bold">Cryptanalysis</text>
<text x="320" y="211" font-size="12" text-anchor="middle">count what a cipher fails to hide, know what the language</text>
<text x="320" y="227" font-size="12" text-anchor="middle">allows, guess a word, try the arrangements</text>
</svg>
<figcaption>Figure 4.2. Why Baghdad. The skills the method needs were each cultivated for another reason, and were found together in the same few hundred men.</figcaption>
</figure>

### Words that came out of it

The English word *cipher* comes from the Arabic *sifr*, "empty", which was the Arabic name for the Indian zero. It passed into Latin as *cifra* and into Italian, and by the Renaissance one word meant both a numeral and a secret writing. The Arabic writers called a cryptogram a *mu'amma*, from a root meaning to blind or obscure. The same word named a literary game in Arabic and later Persian and Ottoman Turkish poetry: a riddle in verse that hides a name. The overlap is worth noticing: secret writing sat close to word play and the enjoyment of a clever concealment. The Arabic title of al-Kindi's treatise uses *mu'amma*, and so does al-Khalil's lost book. A related word, *tarjama*, "translation" or "interpretation", appears in the title of Ibn Dunaynir's book (the usual English rendering is "Expositive Chapters on Cryptanalysis"), where "solving the *tarjama*" means solving the cipher.

### Where the women are

The sources give no woman's name in connection with ciphers in this period, and the chapter should say so rather than imply otherwise. Secretaries and grammarians were men. But women worked in the same world of books. Shuhda al-Katiba, "Shuhda the Scribe" (died 1178), was a celebrated calligrapher and teacher in Baghdad, whom later biographers praised for the beauty of her hand. In Córdoba, Lubna (died about 984), a woman who had come to the palace as a slave and risen to be a secretary to the caliph al-Hakam II, wrote his letters and, as the biographers have it, helped to manage the great library he gathered. Lubna's work and the chancery manuals show that women were inside the machinery of correspondence. They do not show that any wrote on ciphers, and nothing in the cryptological texts mentions one.

## 4.3 Al-Khalil and the first book

*Level: beginner.*

The oldest Arabic book on the subject belongs to al-Khalil ibn Ahmad al-Farahidi, born in Oman or in Basra about 718 and dead in 786 or 791 (the sources disagree). He was a grammarian, and the stories about him are the stories one tells of a man whose mind ran on structure. He worked out the rules of the meters of Arabic poetry, a system of fifteen patterns that scholars have used ever since and that is, in effect, a small piece of applied mathematics. He is credited with improving the way Arabic is written, by devising vowel marks and dots that tell similar letters apart. And he began the first Arabic dictionary, the *Kitab al-'Ayn*, "The Book of the 'Ayn".

The dictionary's plan is the reason he appears in a history of codebreaking. Instead of ordering words alphabetically, al-Khalil ordered the letters by where in the mouth and throat they are made, starting with the deepest sound, the guttural 'ayn, which gives the book its name. Then, because Arabic words are built from roots, he reasoned that the full list of possible roots was a matter of counting. Take the 28 letters. Roots of two letters, three, four and five. The later writers who report the calculation give the count of strings of distinct letters at each length, and a grand total of 12,305,412. Most of these strings are not words. His job was to find out which ones were. The dictionary gives each root together with all its rearrangements, so that a reader looking for the root of a word can find it by trying the permutations and seeing which one the book lists. That is a method for an exhaustive search through arrangements of letters, the same shape of thinking a codebreaker uses to go through possible keys or possible rearrangements of a transposed message.

Here is the counting, which a reader can check in a few lines.

```python
# al-Khalil's count: how many letter strings of 2 to 5 distinct letters from 28?
from math import perm

total = 0
for k in range(2, 6):
    n = perm(28, k)
    total += n
    print(k, "letters:", f"{n:,}")
print("all together:", f"{total:,}")
```

Output:

```
2 letters: 756
3 letters: 19,656
4 letters: 491,400
5 letters: 11,793,600
all together: 12,305,412
```

The total matches the figure the later writers give, a good sign that the report goes back to a real calculation. For five letters the arithmetic is $28 \times 27 \times 26 \times 25 \times 24$: the first place can be any of 28 letters, the second any of the remaining 27, and so on, a count written $P(28,5)$. What matters is not the size of the number but that someone in the eighth century was working out such numbers on purpose. The skytale and the Polybius square of [chapter 3](03-Greece-and-Rome.md) were devices; this is the first time in the story that the arrangements of an alphabet are treated as a subject of calculation.

!!! note "Life story: al-Khalil ibn Ahmad"
    **Born:** about 718, Oman or Basra; died 786 or 791 in Basra · **Purpose:** to fix the rules of Arabic verse and compile its first dictionary, by counting and ordering the letters · **Helped:** founded Arabic lexicography and metrics; taught Sibawayh, the grammarian; later writers credit him with a *Book of Cryptographic Messages* (*Kitab al-Mu'amma*), the first on the subject · **Status:** the cryptographic book is lost, and its contents are unknown; the dictionary survives (in a form edited by later hands) and is still studied

### The story of the first crib

A story that comes down in later writers says the book grew out of a challenge. Someone brought the caliph a cryptogram in Greek (in some tellings a letter from the Byzantine emperor) that nobody at court could read. Al-Khalil was asked. He reasoned that a letter of that kind would open with the usual formula, "In the name of God", worked out which Greek letters must stand where, and read the rest from that. David Kahn tells the story in *The Codebreakers*.

If it is true, it is the first recorded use of a **probable word**: a guess about part of the plaintext, made from knowing what sort of message it is, that gives the attacker a foothold. Codebreakers call such a guess a **crib**. The Polish and British solvers of Enigma in the Second World War used cribs such as "weather report" and "Heil Hitler", more than twelve centuries later. Al-Kindi's treatise gives the same advice (§4.5). The trouble is that the book that supposedly records the incident is lost, and the story reaches us at second or third hand, from authors writing generations later. It is a good story, and it is a plausible one, since any chancery clerk knew how letters opened. It cannot be checked. This chapter treats it as what it is: a tradition that al-Khalil was connected with codebreaking, preserved by people who believed it.

One more caution. A good deal of what the later tradition says about al-Khalil is legend, and he became the kind of figure to whom Arabic scholarship credited every first. That does not make the cryptographic book fictional: later writers credit him with a *Kitab al-Mu'amma*. What it contained, whether it taught breaking or only making ciphers, and whether he wrote it, no one can now say.

## 4.4 Al-Kindi, the philosopher of the Arabs

*Level: beginner.*

Abu Yusuf Ya'qub ibn Ishaq al-Kindi was born about 801, probably in Kufa. His father, Ishaq, was governor of that city under the caliphs al-Mahdi and Harun al-Rashid, and the family belonged to the old Arab tribe of Kinda, which is where the name comes from. That makes him unusual in Baghdad's learned circles, where many were Persians, Syriac-speaking Christians or Sabians (the star-worshippers of Harran): an Arab of the aristocracy who made his career as a thinker. Later writers called him "the philosopher of the Arabs".

He rose under al-Ma'mun (ruled 813 to 833), the caliph who threw the weight of the state behind the translation of Greek science and philosophy. A group of translators worked for al-Kindi, among them Ibn Na'ima al-Himsi, who rendered the text that circulated as the *Theology of Aristotle* (in fact a digest of Plotinus). Al-Kindi wrote a work *On First Philosophy* for al-Ma'mun's successor, al-Mu'tasim (833 to 842), and tutored the caliph's son Ahmad. The lists of his writings, which the Baghdad bookseller Ibn al-Nadim recorded in his catalog of 987 and which later biographers added to, run to more than 250 titles. They cover logic, arithmetic and Indian calculation, geometry, astronomy, medicine and drug doses, music, optics, meteorology, swords and steel, and the making of perfumes. A book on ciphers fits that company.

His later life was not smooth. The caliph al-Mutawakkil (847 to 861) ended the official favor for the rationalist theologians whom al-Ma'mun had backed, and al-Kindi's thought was in their camp. Later biographers say that rivals, the three Banu Musa brothers among them, denounced him to the new caliph, who confiscated his library and later returned it. The sources are long after the event and vary in detail; what is clear is that his last decades were less secure than his first. He died about 873, though some sources give an earlier year.

Al-Kindi's name was known in Latin Europe as Alkindus. Gerard of Cremona and others translated several of his works in the twelfth century, among them his optics, which was read by medieval scholars including Roger Bacon. The Renaissance physician and mathematician Girolamo Cardano is said to have ranked him, in *De subtilitate* (1550), among the twelve most acute minds of all time. Remember this for §4.10: the man was famous in Europe, and his book on codebreaking is another matter.

### How the treatise came back

His *Risala fi istikhraj al-mu'amma*, "Treatise on the Extraction of Cryptograms" (often rendered "on deciphering cryptographic messages"), is one of those titles. For most of a thousand years it was a title and nothing more. Then a copy was found in the Süleymaniye Library in Istanbul, a collection of Ottoman-era manuscripts that holds many thousands of unread volumes. In 1987 a team at the Arab Academy of Damascus, Mohammed Mrayati, Yahya Meer Alam and Hassan al-Tayyan, published the Arabic text together with other Arabic writings on cryptology. The mathematician Ibrahim Al-Kadi described it to Western readers in a 1992 paper in the journal *Cryptologia*, and an English translation, by Said al-Asaad, appeared in 2003 as the first volume of a Riyadh series, *Arabic Origins of Cryptology*.

One caution about the date. The surviving manuscript is a later copy, and there is only one that scholars have used. Nothing in the treatise dates it. It can only be placed within al-Kindi's life, which makes "about 850" a convenient round figure for a book written some time between about 830 and 870. The attribution to al-Kindi is not seriously disputed by the editors, who note that the style and the contents fit his other works.

!!! note "Life story: al-Kindi"
    **Born:** about 801, probably Kufa; died about 873, Baghdad · **Purpose:** to bring Greek philosophy and science into Arabic thought and to add to it, in more than 250 works · **Helped:** Arabic philosophy and optics (a Latin Europe that called him Alkindus read him), and, through one short book, the whole later practice of codebreaking · **Status:** a figure of the history of philosophy first, and of cryptology only since the 1980s, when the treatise surfaced

## 4.5 The treatise: counting letters

*Level: beginner.*

Al-Kindi's book is short and practical. It begins by sorting ciphers into kinds: those that move the letters of a message around (we would call this transposition) and those that replace them, with several subtypes of each. Then comes the method for solving. The editors of the Arabic text divide it into a quantitative part, which is counting, and a qualitative part, which is everything the solver knows about the language. Here is the central passage in paraphrase.

> If you know the language of the cryptogram, take a different text in that language, long enough to fill a sheet or so, and count how often each letter occurs. Call the commonest letter the first, the next the second, and so on. Then look at the cryptogram and count its symbols the same way. Put the first letter in place of the commonest symbol, the second in place of the next, and carry on until all the symbols are used up.

The reason this works is something that, as far as surviving texts show, he was the first to write down: a substitution cipher changes how each letter looks but not how often it appears. If the plain E is written as W everywhere, W will turn up as often as E would have. The cipher hides every letter and leaks every count.

<div class="mars-steps" markdown>

1. **Count a reference text** in the same language, about a page long, and rank the letters.
2. **Count the cryptogram** and rank its symbols.
3. **Match the ranks:** the commonest symbol is probably the commonest letter, the next the next.
4. **Correct with what the language allows.** Which letters never stand together, which begin or end words, which words are likely in this kind of letter, how the letter opens.

</div>

Step 3 alone is only a start. Al-Kindi knew it, and step 4 is where the real work happens. The editors report that he gave lists of which letters may and may not stand next to each other in Arabic, drawing on the grammarians' work on roots, and that he advised using the customary opening of a letter as a probable word. That last piece of advice is the same trick as al-Khalil's. A chancery letter began with a formula. If you know the formula, you know part of the plaintext.

### Why Arabic suits the method

Arabic is written with a consonant skeleton. The short vowels are usually left out, and a reader supplies them from knowledge of the language. That means an Arabic text of a given length has fewer distinct letters in play and each one carries more of the meaning, which makes a count less noisy than it would be in a script that writes every vowel. Two letters dominate all counts. The long vowel *alif* is the commonest letter, and *lam* comes close, helped by the definite article *al-*, which is attached to the front of a very large number of nouns. Some letters, by contrast, are rare in running text: *zah* and *dhal* among them. Here is a count on a very short sample, to show what one looks like. It is the opening chapter of the Qur'an, which is a text every Arabic reader knows by heart and so a fair, if tiny, sample of written Arabic.

```python
# Count the consonant skeleton of the opening chapter (sura) of the Qur'an.
from collections import Counter

text = """بسم الله الرحمن الرحيم
الحمد لله رب العالمين
الرحمن الرحيم
مالك يوم الدين
إياك نعبد وإياك نستعين
اهدنا الصراط المستقيم
صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين"""

names = {"ا": "alif", "ب": "ba", "ت": "ta", "ث": "tha", "ج": "jim", "ح": "hah", "خ": "kha",
         "د": "dal", "ذ": "dhal", "ر": "ra", "ز": "zay", "س": "sin", "ش": "shin", "ص": "sad",
         "ض": "dad", "ط": "tah", "ظ": "zah", "ع": "ayn", "غ": "ghayn", "ف": "fa",
         "ق": "qaf", "ك": "kaf", "ل": "lam", "م": "mim", "ن": "nun", "ه": "ha",
         "و": "waw", "ي": "ya"}

text = text.replace("أ", "ا").replace("إ", "ا")       # hamza seats count as alif
letters = [c for c in text if c in names]
print(len(letters), "letters")
for c, n in Counter(letters).most_common(8):
    print(f"{names[c]:6} {n:3}  {100 * n / len(letters):4.1f}%")
```

Output:

```
143 letters
alif    26  18.2%
lam     22  15.4%
mim     15  10.5%
ya      14   9.8%
nun     11   7.7%
ra       8   5.6%
ayn      6   4.2%
ha       5   3.5%
```

Alif and lam are at the top, together a third of the 143 letters. A sample this small and this particular (a prayer, full of the article) cannot be trusted for the lower places, and its percentages are not the frequencies of Arabic. What it shows is the shape: a few letters carry much of the text. English is the same, with E, T, A, O and N making up more than two-fifths of the letters.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Rank matching: the six commonest letters of English, E T A O I N, are matched to the six commonest symbols of a cryptogram, W D Z R X E, and the true letters are shown below" fill="currentColor" font-size="14">
<text x="150" y="24" font-size="14" text-anchor="middle" font-weight="bold">ordinary English</text>
<text x="490" y="24" font-size="14" text-anchor="middle" font-weight="bold">the cryptogram</text>
<text x="320" y="24" font-size="12" text-anchor="middle">rank</text>
<text x="320" y="62" font-size="13" text-anchor="middle">1st</text>
<text x="320" y="102" font-size="13" text-anchor="middle">2nd</text>
<text x="320" y="142" font-size="13" text-anchor="middle">3rd</text>
<text x="320" y="182" font-size="13" text-anchor="middle">4th</text>
<text x="320" y="222" font-size="13" text-anchor="middle">5th</text>
<text x="320" y="262" font-size="13" text-anchor="middle">6th</text>
<rect x="60" y="44" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="72" y="62" font-size="14" text-anchor="start" font-weight="bold">E</text>
<rect x="400" y="44" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="412" y="62" font-size="14" text-anchor="start" font-weight="bold">W</text><text x="572" y="62" font-size="12" text-anchor="end">27 times</text>
<line x1="242" y1="57" x2="300" y2="57" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<line x1="340" y1="57" x2="398" y2="57" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<rect x="60" y="84" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="72" y="102" font-size="14" text-anchor="start" font-weight="bold">T</text>
<rect x="400" y="84" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="412" y="102" font-size="14" text-anchor="start" font-weight="bold">D</text><text x="572" y="102" font-size="12" text-anchor="end">18 times</text>
<line x1="242" y1="97" x2="300" y2="97" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<line x1="340" y1="97" x2="398" y2="97" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<rect x="60" y="124" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="72" y="142" font-size="14" text-anchor="start" font-weight="bold">A</text>
<rect x="400" y="124" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="412" y="142" font-size="14" text-anchor="start" font-weight="bold">Z</text><text x="572" y="142" font-size="12" text-anchor="end">17 times</text>
<line x1="242" y1="137" x2="300" y2="137" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<line x1="340" y1="137" x2="398" y2="137" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<rect x="60" y="164" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="72" y="182" font-size="14" text-anchor="start" font-weight="bold">O</text>
<rect x="400" y="164" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="412" y="182" font-size="14" text-anchor="start" font-weight="bold">R</text><text x="572" y="182" font-size="12" text-anchor="end">16 times</text>
<line x1="242" y1="177" x2="300" y2="177" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<line x1="340" y1="177" x2="398" y2="177" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<rect x="60" y="204" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="72" y="222" font-size="14" text-anchor="start" font-weight="bold">I</text>
<rect x="400" y="204" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="412" y="222" font-size="14" text-anchor="start" font-weight="bold">X</text><text x="572" y="222" font-size="12" text-anchor="end">14 times</text>
<line x1="242" y1="217" x2="300" y2="217" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<line x1="340" y1="217" x2="398" y2="217" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<rect x="60" y="244" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="72" y="262" font-size="14" text-anchor="start" font-weight="bold">N</text>
<rect x="400" y="244" width="180" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="412" y="262" font-size="14" text-anchor="start" font-weight="bold">E</text><text x="572" y="262" font-size="12" text-anchor="end">13 times</text>
<line x1="242" y1="257" x2="300" y2="257" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<line x1="340" y1="257" x2="398" y2="257" stroke="currentColor" stroke-width="1.1" opacity="0.5"/>
<text x="320" y="296" font-size="13" text-anchor="middle">what the symbols really stand for: E, T, H, A, R, O</text>
<text x="320" y="316" font-size="12" text-anchor="middle">the top two ranks match; after that the ranks drift, and the other steps do the rest</text>
</svg>
<figcaption>Figure 4.3. Al-Kindi's third step, run on the chancery letter below. Ranking by count puts the first two symbols right; third place goes to the wrong letter because this short text has more H than an average page of English.</figcaption>
</figure>

### Try it: a letter from the chancery

The ciphertext below is an English letter, in the style of an Abbasid chancery note, enciphered by a simple substitution with a scrambled alphabet. Word breaks are kept. Before running anything, try the method on paper. Count which symbol is commonest. Look for a three-letter word that repeats. Then ask what a letter from a secretary would say first.

```
VS DZW SRTW EA IEH DZW TWXMVAYG DZW METLRJJVESRDW DE DZW JWMXWDRXO EA
DZW HVQRS DZW IXRVS JZVLJ ZRUW XWRMZWH KRJXR RSH DZW XVUWX VJ ZVIZ DZW
IEUWXSEX QVGG JWSH DZW DRC KO DZW LEJD XERH GWD SE ESW GWRXS DZW HRO EA
ZVJ HWLRXDYXW
```

The program does exactly what you would do by hand. It counts, then uses a probable word.

```python
from collections import Counter

cipher = ("VS DZW SRTW EA IEH DZW TWXMVAYG DZW METLRJJVESRDW DE DZW JWMXWDRXO EA DZW HVQRS "
          "DZW IXRVS JZVLJ ZRUW XWRMZWH KRJXR RSH DZW XVUWX VJ ZVIZ DZW IEUWXSEX QVGG JWSH "
          "DZW DRC KO DZW LEJD XERH GWD SE ESW GWRXS DZW HRO EA ZVJ HWLRXDYXW")

# Step 1: count, the way al-Kindi says
print(Counter(c for c in cipher if c != " ").most_common(6))
print(Counter(cipher.split()).most_common(2))

# Step 2: a letter from a chancery begins with a fixed phrase. Lay it over the start.
crib = "IN THE NAME OF GOD THE MERCIFUL THE COMPASSIONATE"
guess = {}
for c, p in zip(cipher, crib):
    if c != " ":
        assert guess.setdefault(c, p) == p        # a clash would mean the guess is wrong
print(len(guess), "of 26 letters from the opening alone")

def show():
    return "".join(guess.get(c, "-") if c != " " else " " for c in cipher)

print(show())

# Step 3: read the half-words. SECRETAR- is SECRETARY, DI-AN is DIWAN, HA-E is HAVE,
# -ASRA is BASRA, TA- is TAX, and the next word is BY.
guess.update({"O": "Y", "Q": "W", "U": "V", "K": "B", "C": "X"})
print(show())
print(len(guess), "of 26 letters found")
```

Output:

```
[('W', 27), ('D', 18), ('Z', 17), ('R', 16), ('X', 14), ('E', 13)]
[('DZW', 11), ('EA', 3)]
17 of 26 letters from the opening alone
IN THE NAME OF GOD THE MERCIFUL THE COMPASSIONATE TO THE SECRETAR- OF THE DI-AN THE GRAIN SHIPS HA-E REACHED -ASRA AND THE RI-ER IS HIGH THE GO-ERNOR -ILL SEND THE TA- -- THE POST ROAD LET NO ONE LEARN THE DA- OF HIS DEPARTURE
IN THE NAME OF GOD THE MERCIFUL THE COMPASSIONATE TO THE SECRETARY OF THE DIWAN THE GRAIN SHIPS HAVE REACHED BASRA AND THE RIVER IS HIGH THE GOVERNOR WILL SEND THE TAX BY THE POST ROAD LET NO ONE LEARN THE DAY OF HIS DEPARTURE
22 of 26 letters found
```

Look at what happened. The count on its own tells you W is probably E (27 times in 182 letters, about 15 percent) and D is probably T. The repeated three-letter word DZW, eleven times, is almost certainly THE. Those are al-Kindi's steps one to three. The probable word does far more: it hands over seventeen of the twenty-six letters at once, because a formula that long uses most of the alphabet. The half-words that are left read themselves. That is why a fixed opening formula, the kind every chancery letter began with, was a codebreaker's best friend, and why al-Khalil's story, true or not, rings right.

### Break it: a second cryptogram

The second cryptogram has no formula at the start, so you have to rely on counting and word shapes. It is 148 letters long. Use the count of symbols, the four-times repeated three-letter word, and the little words that follow it. The answer is in the exercise at the end of the chapter.

```
QZC NPNCW HMUU PQ XPJZRPR HPRC XIIDS GZCPN PBR QZC SCGWCQPWMCS KWIQC
HIWC UCQQCWS QZPB CFCW SI QZC GPUMNZ PSDCR ZIK P UCQQCW GITUR QWPFCU
QZC WIPRS KMQZITQ XCMBJ WCPR XL SQWPBJCWS
```

A sample this short makes the ranking noisy after the first two or three letters (Ibn 'Adlan's warning, §4.7), so the guessing of words has to do most of the work.

### Why a huge number of keys did not help

A scrambled alphabet of 26 letters can be arranged in $26! \approx 4 \times 10^{26}$ ways, far more than anyone could try. Al-Kindi's method tries none of them. It reads the key off the ciphertext a few letters at a time, because the cipher fails to hide the counts. This is the most durable lesson of the chapter: the size of the key space is necessary for security and not sufficient. A cipher is as strong as the best attack on it, and the best attack almost never tries every key. [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) runs the method on a longer English text and goes on to the ciphers built to stop it.

!!! note "Life story: al-Kindi's treatise on deciphering"
    **Born:** between about 830 and 870 (usually given as about 850), Baghdad; one manuscript copy survives, found in Istanbul and published in 1987 · **Purpose:** to teach a reader who knows the language how to recover the plaintext of a substitution or transposition cryptogram, by counting the symbols, comparing them with a count of ordinary text, and correcting with letter combinations and probable words · **Helped:** set out the idea behind every statistical attack in this book: count what the cipher fails to hide; the line of later Arabic writers on cryptanalysis worked from it or beside it · **Status:** still the first step on any classical cipher; unknown in the West until the 1990s

## 4.6 Ibn Wahshiyya and the old alphabets

*Level: intermediate.*

Not every Arabic book about secret writing teaches how to break anything. One that circulated widely, and that matters for how the Islamic world thought about scripts, carries the title *Kitab shawq al-mustaham fi ma'rifat rumuz al-aqlam*, "The Book of the Frenzied Devotee's Desire to Learn the Riddles of Ancient Scripts". It goes under the name of Ibn Wahshiyya, a writer from Iraq who is better known for a very different work, the *Nabatean Agriculture* (*al-Filaha al-Nabatiyya*), which says in its preface that it translates ancient Nabatean (that is, Babylonian) books on farming and magic, and which gives the year 904. The alphabets book lists dozens of scripts. As the summaries have it, some are real, some are magical (scripts credited to the planets or to sages such as Hermes), and some look invented. It includes a table of Egyptian hieroglyphs with an Arabic letter set against each.

The book matters to this chapter for three reasons.

**It is a witness to a secret-script culture.** A reader of Arabic in the ninth and tenth centuries knew that scripts could be hidden, and that learned men collected them, as they collected recipes and spells. The alphabets in such a book work the way [book 1, chapter 2](../../book/02-Classical-Ciphers.md) describes for any substituted alphabet: each symbol stands for one letter, so a message in one is a simple substitution under a new set of shapes. Al-Kindi's counting breaks it exactly as it breaks a scrambled alphabet in the ordinary letters, because the invented shapes do not change how often each letter occurs. The only thing the new shapes hide is the writing system itself, from a reader who does not have the table. That is a real protection against an enemy who has never seen the shapes. It is none against a codebreaker who has a page of them and counts.

**It has a disputed link to the decipherment of Egyptian.** Joseph von Hammer, the Austrian orientalist, published an English translation in London in 1806, sixteen years before Jean-François Champollion announced his reading of hieroglyphs. In 2005 the Egyptologist Okasha El-Daly argued in *Egyptology: The Missing Millennium* that some Arabic authors of the Middle Ages, among them the author of this table, had correctly understood that many hieroglyphs stand for sounds, centuries before Europe did. Other scholars, among them Elliott Colla, find the evidence too thin: the table's values are partly right and partly wrong, the signs may have been copied without being understood, and a few right guesses do not make a decipherment. The question stays open, and it is one about Egyptology more than cryptography.

**Its author is uncertain.** Jaakko Hämeen-Anttila, who studied Ibn Wahshiyya and his *Nabatean Agriculture* in detail, doubts that Ibn Wahshiyya wrote the alphabets book. It may be a later work that took his name because the name carried authority for things ancient and strange, and it cannot be dated with confidence, which is why Figure 4.1 gives it a range.

!!! note "Life story: the Book of the Frenzied Devotee (attributed to Ibn Wahshiyya)"
    **Born:** the ninth or tenth century, Iraq (the attribution and date are doubted); first translated into a European language by Joseph von Hammer, London, 1806 · **Purpose:** to list and explain old, magical and invented scripts, among them Egyptian hieroglyphs, for readers who collected the lore of the ancients · **Helped:** kept the idea of secret and foreign scripts alive in Arabic learning; probably a source for later chancery writers' lists of "pens" (the source link is not firmly established) · **Status:** read today by historians of Egyptology and of magic; not a cipher manual

## 4.7 Numbers, and how much text is enough

*Level: intermediate.*

Two of the writers between al-Kindi and the Mamluks add something he did not. Ibn Dunaynir put numbers into ciphers. Ibn 'Adlan asked how much ciphertext the counting needs. Both questions turn out to matter more than they sound.

### The abjad

Arabic had two orders for its alphabet. One groups letters by shape (alif, ba, ta, tha, jim, hah, kha, and so on), the order a schoolchild learns today. The other is the *abjad* order, named from its first four letters and kept by eight mnemonic words (*abjad, hawwaz, hutti, kalaman, sa'fas, qarashat, thakhadh, dazagh*) that every learner memorized. It is the old Semitic alphabet order, inherited from the Phoenician letters through Aramaic. In it every letter has a number: alif is 1, ba is 2, jim is 3, and so on to 10, then in tens to 100 (qaf), then in hundreds to 1000 (ghayn). Hebrew and Greek letters carry number values too, and the abjad let Arabic writers turn any word into a number. Figure 4.4 shows the table.

<figure class="mars-fig">
<svg viewBox="0 0 640 296" width="640" role="img" aria-label="The 28 Arabic letters in abjad order with their number values, 1 to 10, then 20 to 90, then 100 to 1000" fill="currentColor" font-size="14">
<rect x="12" y="8" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="36" font-size="26" text-anchor="middle">ا</text>
<text x="20" y="63" font-size="12" text-anchor="start">alif</text>
<text x="86" y="63" font-size="14" text-anchor="end" font-weight="bold">1</text>
<rect x="100" y="8" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="141" y="36" font-size="26" text-anchor="middle">ب</text>
<text x="108" y="63" font-size="12" text-anchor="start">ba</text>
<text x="174" y="63" font-size="14" text-anchor="end" font-weight="bold">2</text>
<rect x="188" y="8" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="229" y="36" font-size="26" text-anchor="middle">ج</text>
<text x="196" y="63" font-size="12" text-anchor="start">jim</text>
<text x="262" y="63" font-size="14" text-anchor="end" font-weight="bold">3</text>
<rect x="276" y="8" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="317" y="36" font-size="26" text-anchor="middle">د</text>
<text x="284" y="63" font-size="12" text-anchor="start">dal</text>
<text x="350" y="63" font-size="14" text-anchor="end" font-weight="bold">4</text>
<rect x="364" y="8" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="405" y="36" font-size="26" text-anchor="middle">ه</text>
<text x="372" y="63" font-size="12" text-anchor="start">ha</text>
<text x="438" y="63" font-size="14" text-anchor="end" font-weight="bold">5</text>
<rect x="452" y="8" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="493" y="36" font-size="26" text-anchor="middle">و</text>
<text x="460" y="63" font-size="12" text-anchor="start">waw</text>
<text x="526" y="63" font-size="14" text-anchor="end" font-weight="bold">6</text>
<rect x="540" y="8" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="36" font-size="26" text-anchor="middle">ز</text>
<text x="548" y="63" font-size="12" text-anchor="start">zay</text>
<text x="614" y="63" font-size="14" text-anchor="end" font-weight="bold">7</text>
<rect x="12" y="80" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="108" font-size="26" text-anchor="middle">ح</text>
<text x="20" y="135" font-size="12" text-anchor="start">hah</text>
<text x="86" y="135" font-size="14" text-anchor="end" font-weight="bold">8</text>
<rect x="100" y="80" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="141" y="108" font-size="26" text-anchor="middle">ط</text>
<text x="108" y="135" font-size="12" text-anchor="start">tah</text>
<text x="174" y="135" font-size="14" text-anchor="end" font-weight="bold">9</text>
<rect x="188" y="80" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="229" y="108" font-size="26" text-anchor="middle">ي</text>
<text x="196" y="135" font-size="12" text-anchor="start">ya</text>
<text x="262" y="135" font-size="14" text-anchor="end" font-weight="bold">10</text>
<rect x="276" y="80" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="317" y="108" font-size="26" text-anchor="middle">ك</text>
<text x="284" y="135" font-size="12" text-anchor="start">kaf</text>
<text x="350" y="135" font-size="14" text-anchor="end" font-weight="bold">20</text>
<rect x="364" y="80" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="405" y="108" font-size="26" text-anchor="middle">ل</text>
<text x="372" y="135" font-size="12" text-anchor="start">lam</text>
<text x="438" y="135" font-size="14" text-anchor="end" font-weight="bold">30</text>
<rect x="452" y="80" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="493" y="108" font-size="26" text-anchor="middle">م</text>
<text x="460" y="135" font-size="12" text-anchor="start">mim</text>
<text x="526" y="135" font-size="14" text-anchor="end" font-weight="bold">40</text>
<rect x="540" y="80" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="108" font-size="26" text-anchor="middle">ن</text>
<text x="548" y="135" font-size="12" text-anchor="start">nun</text>
<text x="614" y="135" font-size="14" text-anchor="end" font-weight="bold">50</text>
<rect x="12" y="152" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="180" font-size="26" text-anchor="middle">س</text>
<text x="20" y="207" font-size="12" text-anchor="start">sin</text>
<text x="86" y="207" font-size="14" text-anchor="end" font-weight="bold">60</text>
<rect x="100" y="152" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="141" y="180" font-size="26" text-anchor="middle">ع</text>
<text x="108" y="207" font-size="12" text-anchor="start">ayn</text>
<text x="174" y="207" font-size="14" text-anchor="end" font-weight="bold">70</text>
<rect x="188" y="152" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="229" y="180" font-size="26" text-anchor="middle">ف</text>
<text x="196" y="207" font-size="12" text-anchor="start">fa</text>
<text x="262" y="207" font-size="14" text-anchor="end" font-weight="bold">80</text>
<rect x="276" y="152" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="317" y="180" font-size="26" text-anchor="middle">ص</text>
<text x="284" y="207" font-size="12" text-anchor="start">sad</text>
<text x="350" y="207" font-size="14" text-anchor="end" font-weight="bold">90</text>
<rect x="364" y="152" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="405" y="180" font-size="26" text-anchor="middle">ق</text>
<text x="372" y="207" font-size="12" text-anchor="start">qaf</text>
<text x="438" y="207" font-size="14" text-anchor="end" font-weight="bold">100</text>
<rect x="452" y="152" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="493" y="180" font-size="26" text-anchor="middle">ر</text>
<text x="460" y="207" font-size="12" text-anchor="start">ra</text>
<text x="526" y="207" font-size="14" text-anchor="end" font-weight="bold">200</text>
<rect x="540" y="152" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="180" font-size="26" text-anchor="middle">ش</text>
<text x="548" y="207" font-size="12" text-anchor="start">shin</text>
<text x="614" y="207" font-size="14" text-anchor="end" font-weight="bold">300</text>
<rect x="12" y="224" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="53" y="252" font-size="26" text-anchor="middle">ت</text>
<text x="20" y="279" font-size="12" text-anchor="start">ta</text>
<text x="86" y="279" font-size="14" text-anchor="end" font-weight="bold">400</text>
<rect x="100" y="224" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="141" y="252" font-size="26" text-anchor="middle">ث</text>
<text x="108" y="279" font-size="12" text-anchor="start">tha</text>
<text x="174" y="279" font-size="14" text-anchor="end" font-weight="bold">500</text>
<rect x="188" y="224" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="229" y="252" font-size="26" text-anchor="middle">خ</text>
<text x="196" y="279" font-size="12" text-anchor="start">kha</text>
<text x="262" y="279" font-size="14" text-anchor="end" font-weight="bold">600</text>
<rect x="276" y="224" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="317" y="252" font-size="26" text-anchor="middle">ذ</text>
<text x="284" y="279" font-size="12" text-anchor="start">dhal</text>
<text x="350" y="279" font-size="14" text-anchor="end" font-weight="bold">700</text>
<rect x="364" y="224" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="405" y="252" font-size="26" text-anchor="middle">ض</text>
<text x="372" y="279" font-size="12" text-anchor="start">dad</text>
<text x="438" y="279" font-size="14" text-anchor="end" font-weight="bold">800</text>
<rect x="452" y="224" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="493" y="252" font-size="26" text-anchor="middle">ظ</text>
<text x="460" y="279" font-size="12" text-anchor="start">zah</text>
<text x="526" y="279" font-size="14" text-anchor="end" font-weight="bold">900</text>
<rect x="540" y="224" width="82" height="64" rx="4" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="581" y="252" font-size="26" text-anchor="middle">غ</text>
<text x="548" y="279" font-size="12" text-anchor="start">ghayn</text>
<text x="614" y="279" font-size="14" text-anchor="end" font-weight="bold">1000</text>
</svg>
<figcaption>Figure 4.4. The abjad numerals, read left to right and top to bottom in abjad order: the 28 letters of Arabic with the number each carries. Every word has a value, the sum of its letters.</figcaption>
</figure>

The values were used for chronograms (*tarikh*): a line of verse, or a phrase on a building, whose letters add up to the year in which it was made. They were also the basis of letter magic, as practiced by al-Buni of Cairo (died 1225) and others. Here is the arithmetic on the phrase that opened chancery letters.

```python
# Abjad numerals: each Arabic letter has a number, 1 to 1000.
abjad = dict(zip("ابجدهوزحطيكلمنسعفصقرشتثخذضظغ",
                 [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90,
                  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]))

def value(word):
    return sum(abjad.get(c, 0) for c in word)

for w in ["بسم", "الله", "الرحمن", "الرحيم"]:
    print(value(w))
print("all four words:", value("بسم الله الرحمن الرحيم"))
```

Output:

```
102
66
329
289
all four words: 786
```

The four words of the opening formula, "In the name of God, the Merciful, the Compassionate", add up to 786, a number that is still written in South Asia as a shorthand for the whole phrase. The same arithmetic is what a cipher builder could use. A number is easy to hide in and easy to compute with.

### Ibn Dunaynir

Ibn Dunaynir lived in the first half of the thirteenth century (reference works tie him to Mosul). His *Maqasid al-fusul al-mutarjima 'an hall al-tarjama* is credited with the first description of an arithmetical cipher, one in which letters become abjad numbers and the numbers are then added, subtracted or otherwise worked on before sending. That credit comes to us through the series editors and the papers that summarize them, and the details of his schemes are not in the secondary sources this chapter rests on. The principle is plain enough, and so is what happens to such a cipher when the table is public. If every letter is just replaced by its abjad number, the cipher is a simple substitution, and the attacker counts numbers instead of letters. If the numbers are added to a secret quantity, the cipher is a shift of numbers, which falls the same way. Arithmetic does not make a cipher stronger by itself. It makes the key harder to write down, and what the attacker counts is still there.

### Ibn 'Adlan and the question of length

Ibn 'Adlan (1187 to 1268) wrote his treatise for the Ayyubid ruler al-Ashraf Musa, who held Damascus from 1229 to 1237 and was a nephew of Saladin. It is called *al-Mu'allaf lil-Malik al-Ashraf*, "The Book Composed for King al-Ashraf". The editors and the summaries credit it with several things: tables of the commonest two-letter and three-letter words in Arabic, a way of dealing with cryptograms in which the spaces between words have been taken out (the clerks' answer to the telltale short word), and a rule of thumb about length. A cryptogram, he said, needs to be about 90 letters long before counting can be trusted. With 28 letters in the Arabic alphabet, that is about three occurrences of each. Below that the counts stop matching the language.

Nobody in the thirteenth century had a theory of sampling, yet the question is the right one and the answer is of the right size. Here is a test. The program takes a page of English prose (1,378 letters, written for the purpose), counts it to find its true commonest letters, and then draws random windows of different lengths from the page, as if each were a short cryptogram. For each length it reports how often the window's commonest letter is also the page's commonest, and how many of the page's five commonest letters the window finds among its own top five.

```python
import random
from collections import Counter

page = """The caliphs of Baghdad ruled from the Atlantic coast of Africa to the borders of
India, and an empire of that size ran on letters. Every governor wrote to the capital,
and the capital wrote back. Orders about taxes, reports of rebellions, requests for
grain and gifts to foreign kings all travelled by horse along the post roads, folded,
tied and closed with a seal of wet clay. A seal told the reader that no one had opened
the letter on the road, but it could not hide what the letter said from a man who broke
it and pressed it again. For ordinary business that was enough. For news of an army, or
a plan to remove a governor, the secretaries sometimes wrote in a cipher, replacing each
letter with a sign that only the receiver knew. The method was old and simple, and the
clerks trusted it because no one had shown them how to break it. Then a scholar in
Baghdad sat down and thought about how a language is built. He saw that a language does
not use its letters evenly. Some letters appear again and again and others hardly ever,
and a cipher that only changes the look of each letter leaves the count of each letter
untouched. To read such a message, he said, take a long page of ordinary writing, count
the letters in it, count the signs in the secret message, and then give the commonest
sign the name of the commonest letter, the next sign the name of the next letter, and so
on down the list. The method was cheap, it needed no machine, and it worked on every
simple substitution cipher ever made. It did not matter how many ways the alphabet could
be mixed. It mattered only that the message was long enough for the counts to settle
down, and that the reader knew the language well enough to finish the job by guessing
the words."""

text = "".join(c for c in page.upper() if c.isalpha())
whole = [c for c, n in Counter(text).most_common()]
print(len(text), "letters; the page's top five:", " ".join(whole[:5]))

random.seed(1)
print("sample  top letter right  top five right (average of 5)")
for n in (30, 60, 90, 150, 300):
    first = five = 0
    for _ in range(2000):
        start = random.randrange(len(text) - n)
        top = [c for c, k in Counter(text[start:start + n]).most_common(5)]
        first += top[0] == whole[0]
        five += len(set(top) & set(whole[:5]))
    print(f"{n:6}  {first / 2000:9.0%}  {five / 2000:18.2f}")
```

Output:

```
1378 letters; the page's top five: E T A O N
sample  top letter right  top five right (average of 5)
    30        43%                3.03
    60        60%                3.42
    90        69%                3.71
   150        82%                3.92
   300        95%                4.09
```

There is no cliff at 90, and Ibn 'Adlan did not say there was. At 30 letters the window's commonest letter is right less than half the time. At 90 it is right about two times in three, and the window finds between three and four of the five commonest. At 300 it is almost always right. (The large windows flatter the result, since a 300-letter window is a fifth of the page.) What 90 buys is a usable start: the commonest two or three letters placed with some confidence, after which probable words do the rest. §4.12 gives the mathematics.

!!! note "Life story: Ibn 'Adlan's treatise for al-Ashraf"
    **Born:** written before 1237, probably in Damascus (the author lived 1187 to 1268); published as one volume of the Riyadh series *Arabic Origins of Cryptology* · **Purpose:** to teach the ruler's secretaries how to solve ciphers, with tables of common short words and an estimate of how long a cryptogram must be · **Helped:** the first surviving statement of the sample-size question, and a method for cryptograms written without spaces · **Status:** known only since the Arab Academy's search of the 1980s; the 90-letter figure is the one most often quoted

## 4.8 Damascus and Cairo: the Mamluk chanceries

*Level: intermediate.*

After 1250 the Mamluks, soldiers of slave origin who had taken power from the Ayyubid dynasty, ruled Egypt from Cairo, and after their victory over the Mongols at Ayn Jalut in 1260 they ruled Syria too, with Damascus as its second capital. Their sultanate lasted until the Ottoman conquest in 1517. It was a state of horsemen and clerks. The sultan Baybars (ruled 1260 to 1277) rebuilt the post. A system of horse relays and, famously, of carrier pigeons let news of the Mongol and Frankish frontiers reach Cairo in a few days by horse relay and, by some reports, in about a day by pigeon, if the chroniclers are to be believed. Earlier rulers had kept pigeons too, but Baybars made the pigeon post a branch of government. The slips were small, so there was no room for long letters, and whether they were commonly enciphered the manuals do not make plain.

The head of the chancery, the *Diwan al-Insha'*, had one of the best titles in the empire. He was the *katib al-sirr*, the "secretary of the secret". A clerk who rose to it knew the sultan's correspondence with every court from the Ilkhans of Persia to the kings of Aragon and the Venetian doges. That is the setting in which two of the writers on ciphers worked.

### Ibn ad-Durayhim

Ibn ad-Durayhim (1312 to about 1361) was born in Mosul and worked under the Mamluks in Syria and Egypt (the older summaries put him in Damascus). In the fourteenth century he wrote *Miftah al-kunuz fi idah al-marmuz*, "Keys to the Treasures in Clarifying Ciphers". The editors of the Riyadh series have published it as its third volume. It surveys many kinds of cipher and works through the solving of an actual cryptogram, step by step, a rarity: a text that shows an attack at work. Among its systems, in the summaries we have, is one in which each plaintext letter is replaced by a pair of letters whose number values add up to the original's. The same sum can be reached in many ways, so each letter has many spellings. Such a cipher is called **homophonic**, and it was invented for one reason: to defeat the count. If E is written five or six different ways, no one symbol is as common as E.

There is a problem with that description. Taken literally, the pair rule cannot work for the smallest abjad values: no two letters have values adding up to 1, which is alif's. So the real system must have an extra rule, or the summary leaves something out, and the secondary sources do not say which. Rather than guess at his exact scheme, here is a small cipher of the same family, built on a clean version of the idea. Number the alphabet 0 to 25 in a secret order. To send a letter, pick any first symbol at random and let the second be whatever brings the pair's sum (mod 26) to the letter's number. Every letter then has 26 spellings, and single symbols come out almost flat.

```python
import random
from collections import Counter

ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
rng = random.Random(1361)
order = list(range(26))
rng.shuffle(order)                       # the secret: each plain letter gets a number 0 to 25
num = dict(zip(ABC, order))              # plain letter -> secret number
back = {n: p for p, n in num.items()}    # secret number -> plain letter

def encipher(text):
    out = []
    for p in text:
        a = rng.randrange(26)            # any first symbol will do
        b = (num[p] - a) % 26            # the second makes the pair add up to the letter's number
        out.append((ABC[a], ABC[b]))
    return out

text = "".join(c for c in ("THE LETTERS OF THE CHANCERY WERE CARRIED BY HORSE AND BY PIGEON AND THE "
               "SECRETARY WHO SEALED THEM KNEW THAT A LETTER IN CIPHER COULD STILL BE READ BY "
               "ANYONE WHO COUNTED") if c != " ")
pairs = encipher(text)
print(" ".join(a + b for a, b in pairs[:12]))

singles = Counter(s for pair in pairs for s in pair)
print("commonest single symbol:", f"{max(singles.values()) / (2 * len(pairs)):.1%}", "of all symbols")

# the attacker adds the two symbols of each pair and counts the totals
totals = Counter((ABC.index(a) + ABC.index(b)) % 26 for a, b in pairs)
print("commonest total:", f"{max(totals.values()) / len(pairs):.1%}", "of all pairs")
top = totals.most_common(1)[0][0]
print("that total is the letter", back[top])
```

Output:

```
EV QC TI ZQ MP OL YB BA JN CO VH CH
commonest single symbol: 5.8% of all symbols
commonest total: 17.5% of all pairs
that total is the letter E
```

The cipher does what its inventors wanted: no symbol makes up more than about 6 percent of the text, so counting single symbols finds nothing. But the attacker can add the two symbols of each pair. The totals fall into 26 classes, one per plaintext letter, with the English counts intact: the commonest total is 17.5 percent of the pairs, and it is E. Homophones that follow a rule give the rule away.

### Al-Qalqashandi and what survived

Shihab al-Din Ahmad ibn 'Ali al-Qalqashandi was born in 1355 (some catalogs say 1356) in Qalqashanda, in the Nile delta, trained in Alexandria as a jurist of the Shafi'i school, and entered the chancery in Cairo late in the fourteenth century. He died there in 1418. In 1412 he finished the book that has kept his name alive, *Subh al-a'sha fi sina'at al-insha*, "The Dawn for the Night-Blind in the Craft of Composition", fourteen volumes in the Cairo printing of 1913 to 1919. It was a manual for secretaries and it left nothing out: the geography of the lands the sultan wrote to, the forms of address for every ruler and rank, the grammar and the calligraphy, the paper and ink, how the post and the pigeons were run, the formulas of treaties and appointments, and, in one section, secret writing.

The cryptology section is what made him matter to historians. It gives a list of cipher systems, which Kahn singles out: transposition, several kinds of substitution, and ciphers with more than one substitute for each letter, with instructions for solving them. In Kahn's summary, the method for solving is counting, in the line of al-Kindi and Ibn ad-Durayhim. And al-Qalqashandi quotes Ibn ad-Durayhim at length. For a long time that quotation was the only way anyone knew his book.

That is the second thing al-Qalqashandi did. He was a compiler, and compilers keep what original writers lose; without his encyclopedia the West in 1967 would have had nothing to read. Figure 4.5 shows the two roads by which the Arabic work reached us.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Two chains by which Arabic cryptology reached modern readers: one through al-Qalqashandi's encyclopedia, one through the manuscript of al-Kindi found in Istanbul" fill="currentColor" font-size="14">
<text x="160" y="20" font-size="14" text-anchor="middle" font-weight="bold">the encyclopedia road</text>
<text x="480" y="20" font-size="14" text-anchor="middle" font-weight="bold">the manuscript road</text>
<rect x="20" y="34" width="280" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="58" font-size="13" text-anchor="middle">al-Qalqashandi, Cairo, 1412</text>
<line x1="160" y1="74" x2="160" y2="104" stroke="currentColor" stroke-width="1.3"/>
<polygon points="160,106 156,99 164,99" fill="currentColor"/>
<rect x="20" y="106" width="280" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="130" font-size="13" text-anchor="middle">copied for 500 years; printed in Cairo, 1913-19</text>
<line x1="160" y1="146" x2="160" y2="176" stroke="currentColor" stroke-width="1.3"/>
<polygon points="160,178 156,171 164,171" fill="currentColor"/>
<rect x="20" y="178" width="280" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="160" y="202" font-size="13" text-anchor="middle">Kahn, The Codebreakers, 1967</text>
<rect x="340" y="34" width="280" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="480" y="58" font-size="13" text-anchor="middle">al-Kindi writes the treatise, about 850</text>
<line x1="480" y1="74" x2="480" y2="104" stroke="currentColor" stroke-width="1.3"/>
<polygon points="480,106 476,99 484,99" fill="currentColor"/>
<rect x="340" y="106" width="280" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="480" y="130" font-size="13" text-anchor="middle">one copy, unread, in an Istanbul library</text>
<line x1="480" y1="146" x2="480" y2="176" stroke="currentColor" stroke-width="1.3"/>
<polygon points="480,178 476,171 484,171" fill="currentColor"/>
<rect x="340" y="178" width="280" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="480" y="202" font-size="13" text-anchor="middle">Damascus edition 1987; Al-Kadi 1992</text>
<line x1="160" y1="218" x2="160" y2="248" stroke="currentColor" stroke-width="1.3"/>
<line x1="480" y1="218" x2="480" y2="248" stroke="currentColor" stroke-width="1.3"/>
<line x1="160" y1="248" x2="480" y2="248" stroke="currentColor" stroke-width="1.3"/>
<line x1="320" y1="248" x2="320" y2="268" stroke="currentColor" stroke-width="1.3"/>
<polygon points="320,270 316,263 324,263" fill="currentColor"/>
<rect x="150" y="270" width="340" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="320" y="289" font-size="13" text-anchor="middle" font-weight="bold">what historians now say</text>
<text x="320" y="306" font-size="12" text-anchor="middle">English series, 2003: al-Kindi, Ibn 'Adlan, Ibn ad-Durayhim, Ibn Dunaynir</text>
</svg>
<figcaption>Figure 4.5. How we know. Before 1979 the West knew Arabic cryptology only through a Cairo encyclopedia. Since then the older sources have been found one by one, and the picture has moved back more than five centuries.</figcaption>
</figure>

The Arab Academy's team began its search of manuscript libraries in about 1979. They found the treatises of al-Kindi, Ibn 'Adlan, Ibn ad-Durayhim and Ibn Dunaynir, edited them and published them in Arabic. Said al-Asaad's English translations began to appear in 2003 in the series *Arabic Origins of Cryptology*. The manuscripts of the Islamic world are far from all catalogued, so it would be unwise to assume the list is complete.

!!! note "Life story: Ibn ad-Durayhim's Keys to the Treasures"
    **Born:** the middle of the fourteenth century, in the Mamluk lands of Syria and Egypt; the author lived 1312 to 1361 and was born in Mosul · **Purpose:** to describe many systems of cipher, among them letter pairs by sums and so with several spellings per letter, and to show the solving of a real cryptogram · **Helped:** carried the homophone idea, and the worked example, down to al-Qalqashandi, who quotes it · **Status:** for centuries known only from al-Qalqashandi's extracts; edited and translated since the 1980s

!!! note "Life story: al-Qalqashandi and the Dawn for the Night-Blind"
    **Born:** finished in Cairo in 1412, by a chancery secretary who lived 1355 to 1418; fourteen printed volumes · **Purpose:** to teach every skill a Mamluk secretary needed, secret writing among them · **Helped:** preserved much Arabic writing on ciphers (Ibn ad-Durayhim above all) and was the one source Western historians had until the 1980s · **Status:** a standard source for Mamluk administration; the cipher section is read as a digest of earlier work

## 4.9 Byzantium: a gap in the record

*Level: beginner.*

The Greek-speaking Byzantine Empire was Baghdad's neighbor and rival for the whole period. Its armies met the caliphs' along a frontier in the Taurus mountains and Cilicia for centuries, its emperors and the caliphs swapped ambassadors and prisoners, and al-Khalil's story, as it is told, begins with a Greek cryptogram. One would expect a rich Byzantine literature on secret writing. There is hardly any, and nobody knows why.

What the record does contain is thin and scattered. Greek manuscripts of the period sometimes carry scribes' signatures and notes in disguised letters, simple substitutions of one Greek letter for another; the German paleographer Victor Gardthausen listed some in his handbook of 1913. The ancient Greek writers on signals and secret messages, such as Aeneas Tacticus ([chapter 3](03-Greece-and-Rome.md)), reached us because Byzantine scholars and soldiers kept copying them, which is to say that Byzantium was a library of ancient military knowledge even if we have no new cipher treatise written in it. The empire ran a sophisticated diplomacy, with an office that handled the foreign envoys (the *skrinion ton barbaron*, the "bureau of the barbarians") and an emperor, Constantine VII Porphyrogennetos (ruled 913 to 959), who set out advice on managing neighbors in a book for his son. Later Greek chroniclers say that Leo the Mathematician, in the reign of Theophilos (829 to 842), set up a chain of beacon fires and matched clocks from the Cilician frontier to the capital, so that a pre-arranged set of messages could cross hundreds of miles in a few hours, and that a later emperor ended the system because the alarms spoiled his entertainments. That is signaling, not ciphering, in the manner of Aeneas, and the details come from chroniclers writing after the fact. It shows the empire thought about long-distance messages, and tells us nothing about ciphers.

A recent paper on how the Byzantines protected documents and secret communications between the fourth and fifteenth centuries opens by saying that the subject has hardly been studied (only the abstract could be seen, so nothing follows from the rest). That sentence is the best guide. The gap is largely one of scholarship: many Greek texts in Mount Athos, the Vatican and other libraries are unedited, and a tradition of secret writing may be sitting in them. It may equally be that Byzantine clerks used little, or passed on what they used by example, not in written manuals. Baghdad's professional secretaries wrote guides and a few survive. The difference between the two cities may lie in what was written, what was kept or what has been read. This chapter can give Byzantium no more than a page and says so.

## 4.10 Did Europe learn it from the Arabs?

*Level: intermediate.*

Europe's own breaking of ciphers shows up in the Italian city-states around 1400, about five centuries after al-Kindi. A cipher key from Mantua dated 1401 already gives the vowels several substitutes each, which is the homophone idea. In the 1460s Leon Battista Alberti, secretary in the papal chancery, discussed letter frequencies in his treatise on ciphers. In 1474 Cicco Simonetta, the secretary to the dukes of Milan, wrote down *Regule ad extrahendum litteras ziferatas sine exemplo*, "rules for extracting ciphered letters without a key". [Chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) tells that story. The question for this chapter is whether the Arabic books lie behind it.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A map as labeled boxes: Baghdad, Damascus and Cairo joined by the Arabic cryptology tradition; Toledo, Palermo and Venice on the western side; Constantinople between; dashed arrows from east to west marking possible but undocumented routes" fill="currentColor" font-size="14">
<rect x="20" y="40" width="110" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="75" y="66" font-size="13" text-anchor="middle" font-weight="bold">Toledo</text>
<rect x="20" y="150" width="110" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="75" y="176" font-size="13" text-anchor="middle" font-weight="bold">Palermo</text>
<rect x="190" y="40" width="110" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="245" y="66" font-size="13" text-anchor="middle" font-weight="bold">Venice, Milan</text>
<rect x="340" y="90" width="120" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="400" y="116" font-size="13" text-anchor="middle" font-weight="bold">Constantinople</text>
<rect x="340" y="200" width="100" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="390" y="226" font-size="13" text-anchor="middle" font-weight="bold">Cairo</text>
<rect x="500" y="150" width="120" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="560" y="176" font-size="13" text-anchor="middle" font-weight="bold">Damascus</text>
<rect x="500" y="40" width="120" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="560" y="66" font-size="13" text-anchor="middle" font-weight="bold">Baghdad</text>
<line x1="560" y1="84" x2="560" y2="148" stroke="currentColor" stroke-width="1.5"/>
<polygon points="560,150 556,143 564,143" fill="currentColor"/>
<line x1="500" y1="180" x2="442" y2="216" stroke="currentColor" stroke-width="1.5"/>
<polygon points="442,216 449,214.4 445,208" fill="currentColor"/>
<text x="470" y="262" font-size="12" text-anchor="middle">al-Kindi, Ibn 'Adlan, Ibn ad-Durayhim,</text>
<text x="470" y="278" font-size="12" text-anchor="middle">al-Qalqashandi: the written tradition</text>
<line x1="338" y1="222" x2="132" y2="176" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 5" opacity="0.6"/>
<polygon points="132,176 139,173.5 138,180" fill="currentColor" opacity="0.6"/>
<text x="232" y="214" font-size="11" text-anchor="middle" opacity="0.8">trade, envoys: no cipher text known</text>
<line x1="198" y1="86" x2="132" y2="62" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 5" opacity="0.6"/>
<line x1="78" y1="150" x2="78" y2="86" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 5" opacity="0.6"/>
<text x="30" y="30" font-size="12" text-anchor="start">Latin books translated from Arabic: other works of al-Kindi, not this one</text>
<line x1="342" y1="116" x2="302" y2="70" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 5" opacity="0.6"/>
<line x1="400" y1="200" x2="400" y2="136" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 5" opacity="0.6"/>
<text x="196" y="132" font-size="12" text-anchor="middle">Italian ciphers from about 1400</text>
</svg>
<figcaption>Figure 4.6. The possible roads. Solid arrows mark where the Arabic writing on ciphers is documented. Dashed lines mark routes along which other Arabic knowledge did pass to Latin Europe, but along which no cipher text has been found to travel.</figcaption>
</figure>

**The case for.** The channels existed. Arabic learning reached Latin Europe on a large scale through Spain and Sicily. In Toledo, after its reconquest by Castile in 1085, translators including Gerard of Cremona (about 1114 to 1187) turned Arabic works on science and philosophy into Latin, some of them al-Kindi's. Norman Palermo had a chancery that wrote in Arabic, Greek and Latin. Venetian and Genoese merchants traded in Alexandria, Cairo and Damascus. The Indian numerals came this way: Fibonacci learned them in North Africa and put them in the *Liber Abaci* of 1202, with the word *zephirum* from the Arabic *sifr*, and in Italy the word *cifra* went on to mean both numeral and secret writing. If the word came, why not the idea?

**The case against.** Nothing has been found that connects the two. No European cipher text cites an Arabic one. No Latin or Italian translation of al-Kindi's treatise on deciphering, or of any of the later Arabic books on it, is known; the works of his that crossed were on other subjects. The European writers describe frequency analysis as if they had worked it out themselves. Alberti in particular presents it as the observation of a man who had counted the letters of his own language. And the method is the kind that arises when enough clerks have to read each other's mail. The need arose in Baghdad, and again in the Italian chanceries of the fifteenth century, with their permanent embassies and many cipher secretaries. Independent invention is quite likely.

**What would settle it.** A European manuscript that quotes an Arabic cryptological book. A Latin or Italian translation, or even a title in a library catalog of a cipher secretary. A traveler's report. A cipher key whose structure copies a Mamluk one in detail. None has turned up, and the Arabic manuscripts themselves have only been edited for forty years, so the search is young. A fair summary: the channels existed, borrowing is possible, and there is no positive evidence. The honest word is "unknown". Anyone who says the Arabs "taught" Europe, or plainly did not, goes further than the sources allow.

One more point. Alkindus was a famous name in Latin Europe, and Cardano, who also wrote on ciphers ([chapter 7](07-Printed-Ciphers.md)), praised him. If Cardano or Alberti had known the book on ciphers, one might expect some sign of it. There is none.

## 4.11 In the real world: what the sources show, and what they do not

*Level: intermediate.*

**We have manuals, not cases.** Every text in this chapter teaches or describes. None records a particular enemy letter read by a particular named solver, except the story of al-Khalil's Greek cryptogram, which comes from late writers about a lost book. The sources tell us that clerks could solve a substitution cipher on paper and had written down how. They do not tell us how often anybody did it, or what difference it made to a battle or a treaty. That is a very different thing from Room 40 in 1917, and the two should be held apart.

**We do not know how widely ciphers were used.** A chancery manual lists every skill a secretary might want, whether used daily or once a decade. That a cipher is described in al-Qalqashandi's fourteen volumes does not mean the sultan's court used it often.

**"First" means "first that survives".** Kahn wrote in 1967 that cryptology was born among the Arabs. The 1987 edition of al-Kindi sharpened the claim by moving the surviving evidence back by centuries, but it is still a claim about surviving texts. A Greek, Persian or Indian writer may have set it down earlier in a book that was lost, and al-Khalil's lost book is a reminder that the shelf has holes.

**The editors have a stake.** The series *Arabic Origins of Cryptology* was produced by institutions in Damascus and Riyadh and frames its subject as one of origins and heritage. The manuscripts are real and the editions are not thereby unreliable, but the introductions are the work of people proud of what they found, and their claims should be checked against the texts.

### Can these be broken today?

Yes, all of them, and easily.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Simple substitution, one scrambled alphabet | in seconds | Count the symbols, as al-Kindi says, then correct with common words and a probable word. A computer does the same by climbing: swap two letters of the key, keep the swap if the text looks more like the language. |
| Invented or secret alphabets | in seconds, once transcribed | New shapes are one shape per letter, which is simple substitution under another name. |
| Letters turned into abjad numbers | instantly | The numbers follow a public order, so undoing them gives the letters back. With a secret table it is a substitution again. |
| Letter pairs that add up to the plaintext letter (§4.8) | easily | Add the pair; count the totals. The totals have the language's frequencies. |
| Transposition | easily | Counts are untouched, so the text is plainly in the language. Try rearrangements until words appear. |

Ibn 'Adlan's warning stands: a very short message, a few dozen letters, may have more than one sensible reading, and no count can choose between them. A modern cipher such as AES gives an attacker nothing to count, however much ciphertext there is.

### What changed

After al-Kindi, a single scrambled alphabet could not be trusted against a skilled reader. Every cipher improvement of the next eight centuries was a reply to counting. Homophones spread a common letter over several symbols (Ibn ad-Durayhim, the Mantuan key of 1401). Nulls, meaningless symbols, threw the counts off. Codes replaced words and names with symbols. The great reply, a different alphabet for each letter, is the subject of [chapter 7](07-Printed-Ciphers.md), and the generation of ciphers that followed [chapter 6](06-Italy-Ambassadors-and-Nomenclators.md) is the history of the contest that al-Kindi began.

## 4.12 Going deeper

*Level: expert.*

**The surviving record.** Our knowledge of Arabic cryptology rests on five legs of unequal weight: one lost title (al-Khalil), one early treatise in a single manuscript (al-Kindi), one text of uncertain authorship (the alphabets book), three thirteenth- and fourteenth-century treatises recovered from libraries, and one encyclopedia. The corpus is perhaps a few hundred pages, so conclusions about "the Arab tradition of cryptanalysis" should be drawn lightly. There was a tradition, since each later writer cites or rebuilds on the earlier ones. How far it matches the practice of the chanceries, about which almost nothing survives, is the open question. The al-Kindi manuscript is a copy with no date of composition, so "about 850" comes from the author's life. Ibn Dunaynir's priority as the first to describe an arithmetical cipher rests on the editors' judgment as repeated in secondary papers, and Ibn ad-Durayhim's pair-of-sums scheme does not work for the smallest values if taken literally (§4.8). 

**The sampling mathematics behind 90 letters.** Suppose a letter has probability $p$ of appearing at each position. In a message of $n$ letters its count is close to a binomial with mean $np$ and variance $np(1-p)$. Two letters with probabilities $p_1 > p_2$ can be put in the right order if the gap between their expected counts, $n(p_1 - p_2)$, is a few times the noise in the difference, which for small shares is about $\sqrt{n(p_1 + p_2)}$. Asking for two standard errors gives

$$
n \;\ge\; \frac{4\,(p_1 + p_2)}{(p_1 - p_2)^2}.
$$

The consequence is that how much text you need depends on which pair of letters you want to separate. Telling E from T in English (shares 12.7 and 9.1 percent) needs about 670 letters. Telling E from a middling letter at 4 percent needs about 90. The separation of the rare letters from the common is what a short sample gives and the ranking of the common letters among themselves is what takes a long one. Ibn 'Adlan's 90 is thus the right size for a different job: it is enough to find the top of the table and to know it is the top. A second way to reach the same size is to ask when a sample has seen every letter. If all 28 letters were equally likely, the expected number still missing after $n$ letters is $28\,(27/28)^n$. That is what "about three times each" means at 90. The program below does both sums.

```python
from math import exp, lgamma, log, sqrt

# if all 28 letters were equally likely, how many would still be missing after n letters?
for n in (28, 56, 90, 140):
    print(n, "letters:", round(28 * (27 / 28) ** n, 2), "of 28 letters expected missing")

# to tell a letter of share p1 from one of share p2 you want the gap in counts
# to be about twice the noise: n*(p1-p2) = 2*sqrt(n*(p1+p2))
p1, p2 = 0.127, 0.091        # E and T in English
print("E against T:", round(4 * (p1 + p2) / (p1 - p2) ** 2), "letters")
p1, p2 = 0.127, 0.040        # E against a middling letter
print("E against a 4% letter:", round(4 * (p1 + p2) / (p1 - p2) ** 2), "letters")
print("log2(28!) =", round(lgamma(29) / log(2), 1), "bits")
```

Output:

```
28 letters: 10.11 of 28 letters expected missing
56 letters: 3.65 of 28 letters expected missing
90 letters: 1.06 of 28 letters expected missing
140 letters: 0.17 of 28 letters expected missing
E against T: 673 letters
E against a 4% letter: 88 letters
log2(28!) = 97.9 bits
```

At 90 letters about one letter of the 28 is still unseen even in the best case of equal frequencies, and real frequencies are unequal, so more will be missing. Nothing suggests Ibn 'Adlan did this arithmetic; the agreement shows only that his figure was a sound rule of thumb.

**Unicity distance.** The last line of the output is the key size in bits for a scrambled alphabet of 28 letters, about 97.9 against about 88.4 for 26. Shannon's unicity distance divides the key's entropy by the language's redundancy per letter, and [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) works it for English. No figure for Arabic is given here, because none is at hand that can be trusted. The consonant skeleton cuts both ways: with short vowels unwritten, each letter carries more information, which lengthens the distance, while the root structure forbids many consonant combinations, which shortens it. Nothing here says Arabic was easier or harder to break than English.

**Open questions.**

- Did the Abbasid, Fatimid or Mamluk chanceries use ciphers routinely? The manuals describe them, and the surviving chancery letters would show it, but a systematic search of those letters for enciphered ones is not known to have been made.
- Did al-Kindi's treatise have Persian or Turkish readers who carried it east? The later Persian and Ottoman tradition ([chapter 8](08-The-World-Beyond-Europe.md)) is the place to look.

## Check yourself

??? question "1. A Baghdad secretary seals a letter with clay and a ring. What does that guarantee, and what does it not?"
    It shows who wrote the letter and that nobody has changed it since the seal was pressed. It does not stop anyone from reading it: a man who captures the courier, or who breaks the clay and presses a new seal, reads the letter. Secrecy needs a cipher.

??? question "2. Al-Kindi's third step matches ranks: the commonest symbol is the commonest letter, and so on. Why does he need a fourth step?"
    A text is only an imperfect sample of the language, so ranks drift after the first few places: in the chancery letter, E and T are right and the third symbol is H, not the A that English suggests. The fourth step uses what the language allows (which letters can stand together, which words are likely, how a letter opens) to correct the guesses. There, the opening formula alone gave 17 of the 26 letters.

??? question "3. How many strings of three different letters can be made from the 28 letters of Arabic? Why does al-Khalil's dictionary need to know?"
    $28 \times 27 \times 26 = 19{,}656$. Only a small part are roots that occur in the language, and al-Khalil's task was to find which. Listing all the arrangements and checking each against the language is the same shape of work as trying arrangements of a transposition.

??? question "4. Using Figure 4.4, find the abjad value of the word محمد (mim, hah, mim, dal)."
    $40 + 8 + 40 + 4 = 92$.

??? question "5. Ibn 'Adlan said a cryptogram must be about 90 letters long. Where does the number come from, and what does it buy?"
    Arabic has 28 letters, and 90 is about three times 28: enough, if letters were equally likely, for almost every letter to have appeared (about one is expected unseen). Real shares are unequal, so it is a rule of thumb, not a threshold. In §4.7 a 90-letter window found the commonest letter two times in three. It buys a usable start, not a finished reading.

??? question "6. Decrypt the second cryptogram of §4.5. (Hint: QZC is the commonest word.)"
    Plaintext: THE PAPER MILL AT BAGHDAD MADE BOOKS CHEAP AND THE SECRETARIES WROTE MORE LETTERS THAN EVER SO THE CALIPH ASKED HOW A LETTER COULD TRAVEL THE ROADS WITHOUT BEING READ BY STRANGERS. Start from QZC = THE (four times) and the commonest symbol C = E; then QZ gives T and H, PQ is AT, and PBR is AND.

??? question "7. In the pair-sum toy of §4.8, no single symbol exceeds 6 percent of the text. Why does the cipher still fall?"
    The attacker adds the two symbols of each pair. The sum is the plaintext letter's number, so counting sums is counting plaintext letters under a relabeling. The commonest sum was 17.5 percent of the pairs and was E. Spreading a letter over many spellings flattens single-symbol counts only if the spellings carry no structure the attacker can undo.

??? question "8. Give two pieces of evidence that Europe might have learned frequency analysis from the Arabs, and two that it did not."
    For: Arabic learning, al-Kindi's other works among it, reached Latin Europe through Toledo and Sicily, and the word *cifra* came from the Arabic *sifr*. Against: no European cipher text cites an Arabic one, no translation of an Arabic book on deciphering is known, and the method arises naturally wherever many clerks read each other's mail. The honest verdict is that nobody knows.

??? question "9. Why is the lack of Byzantine cipher manuals not evidence that Byzantium had no ciphers?"
    Because the lack is of surviving or studied texts. Greek manuscripts do contain disguised-letter notes, the empire's diplomacy and signaling were advanced, and the subject has hardly been examined. A gap can come from what was written, kept or read, and we cannot tell which.

??? question "10. Two letters have shares of 12 percent and 9 percent. Roughly how many letters of ciphertext do you need to tell them apart reliably, using the rule $n \ge 4(p_1+p_2)/(p_1-p_2)^2$?"
    $4 \times 0.21 / 0.03^2 = 0.84 / 0.0009 \approx 930$ letters. Ranking the commonest letters among themselves takes far more text than finding which letters are common at all.

## What you learned

- A seal proved who wrote a letter without hiding what it said, so important letters in the Abbasid empire went in cipher.
- Baghdad's grammarians, secretaries and mathematicians had the habit of counting, the knowledge of how a language is built and the need to read hidden writing: the three things cryptanalysis needs.
- Al-Khalil (died 786 or 791) counted the possible words of Arabic and, by a later report, solved a Greek cryptogram with a probable word; his book on the subject is lost.
- Al-Kindi (about 801 to about 873) wrote the oldest surviving manual of codebreaking: count the symbols, compare them with a count of the language, and correct with letter combinations and probable words. His book was found in Istanbul and published in 1987.
- Ibn 'Adlan's 90 letters is a sound rule of thumb for how much ciphertext counting needs; ranking the commonest letters among themselves takes several hundred.
- The abjad gave every Arabic letter a number, and ciphers built on sums, like Ibn ad-Durayhim's letter pairs, fall to counting the sums.
- Al-Qalqashandi's encyclopedia of 1412 kept much of the earlier work alive, and until the 1980s it was the West's only source.
- Byzantium's silence is a gap in the record. Whether Europe learned the method from the Arabs is unknown: the channels existed, the evidence is missing.
- Every cipher improvement of the next eight centuries was a reply to counting.

**Next:** [Chapter 5](05-The-Medieval-World.md), the ciphers of monks, runes and friars in Latin Europe while Baghdad was counting.

## Further reading

- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev. ed., Scribner, 1996), chapter 2, on al-Khalil, al-Qalqashandi and Ibn ad-Durayhim.
- Mohammed Mrayati, Yahya Meer Alam and M. Hassan at-Tayyan (eds.), *Series on Arabic Origins of Cryptology*, translated by Said M. al-Asaad (KFCRIS and KACST, Riyadh, 2003 on): vol. 1, *al-Kindi's Treatise on Cryptanalysis*; vol. 2, *Ibn 'Adlan's Treatise al-Mu'allaf lil-Malik al-Ashraf*; vol. 3, *Ibn ad-Durayhim's Treatise on Cryptanalysis*; vol. 4, *Ibn Dunaynir's Book: Expositive Chapters on Cryptanalysis*.
- Ibrahim A. Al-Kadi, "Origins of Cryptology: The Arab Contributions", *Cryptologia* 16, no. 2 (1992), pp. 97 to 126.
- Dimitri Gutas, *Greek Thought, Arabic Culture: The Graeco-Arabic Translation Movement in Baghdad and Early 'Abbasid Society* (Routledge, 1998), on the House of Wisdom and the translation movement.
- Peter Adamson, *Al-Kindi* (Oxford University Press, 2007), on his life and philosophy.
- Jonathan M. Bloom, *Paper Before Print* (Yale University Press, 2001), on paper in the Islamic world.
- Ibn al-Nadim, *The Fihrist: A Tenth-Century Survey of Muslim Culture*, translated by Bayard Dodge (Columbia University Press, 1970), the catalog of 987 that lists al-Kindi's works.
- al-Qalqashandi, *Subh al-a'sha fi sina'at al-insha* (1412; printed Cairo, 1913 to 1919).
- Ibn Wahshiyya (attributed), *Ancient Alphabets and Hieroglyphic Characters Explained*, translated by Joseph Hammer (London, 1806); Okasha El-Daly, *Egyptology: The Missing Millennium* (UCL Press, 2005); Jaakko Hämeen-Anttila, *The Last Pagans of Iraq: Ibn Wahshiyya and His Nabatean Agriculture* (Brill, 2006); Elliott Colla, *Conflicted Antiquities* (Duke University Press, 2007).
- Simon Singh, *The Code Book* (Fourth Estate, 1999), the popular account that brought al-Kindi to a wide audience.
- Weaker sources behind particular statements: the abstract of a paper on documents and secret communications in Byzantium (author and journal not seen); encyclopedia summaries of Ibn 'Adlan's and Ibn ad-Durayhim's books, and the Muslim Heritage article "Arab Origins of Cryptology" (the 90-letter rule, dates, the 1979 manuscript search); and the attribution of the first arithmetical cipher to Ibn Dunaynir, which rests on the series editors as summarized in papers.
