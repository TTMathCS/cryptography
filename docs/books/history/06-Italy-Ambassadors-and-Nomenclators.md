# 6. Italy: ambassadors, nomenclators and the disk

*In the fifteenth century the city-states of Italy began to keep ambassadors permanently at each other's courts, and every one of those ambassadors wrote home every week. A letter that crosses a rival's territory is a letter someone will open, so Italy became the first place in Europe where secret writing was a daily office job, with clerks, apprentices and keys that had to be replaced when they leaked. This chapter tells how that happened: the pope's secretary who made the oldest surviving European key in 1379, the Mantuan key of 1401 that gave the vowels several symbols each, the Milanese chancellor who wrote down the first European rules for breaking ciphers in 1474, and the architect who invented a cipher disk that changed its alphabet under the writer's hand. You will code a nomenclator, measure what homophones do to a letter count, read a message by Simonetta's rules, and recover the secret ring of an Alberti disk from a single opening phrase.*

!!! abstract "In this chapter"
    **You will learn:**

    - why permanent ambassadors turned secret writing from a rare tool into a daily routine, and how a dispatch got from one capital to another;
    - what a nomenclator is (a cipher for letters plus a code for names), who made the oldest surviving European key, and why the design looked the way it did;
    - how homophones and nulls answer the counting of letters, with the Mantuan key of 1401, and how much they really hide (measured with a short program);
    - how the first European rules for solving ciphers without the key (Cicco Simonetta, 1474) work, by solving a message with them;
    - how Alberti's cipher disk (about 1467) works, why it was a break with every cipher before it, and why a fixed opening phrase gives away its secret ring;
    - who the people were, which parts of the story rest on one source, and where the record is thin.

    **You need:** [Chapter 5](05-The-Medieval-World.md) of this book (why Europe had so little before this chapter), [Chapter 4](04-Baghdad-and-Cairo.md) (al-Kindi's counting and the question whether Europe learned it), and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) (substitution and frequency counting). The methods are taught in full in [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md); here you meet them as the people who needed them did.

    **Levels:** §6.1 to §6.3 and §6.7 are for beginners, §6.4 to §6.6 and §6.8 to §6.10 are intermediate, §6.11 is expert.

## 6.1 The problem

*Level: beginner.*

In April 1378 the cardinals of the Roman Church, meeting in Rome with a crowd outside shouting for an Italian pope, elected Bartolomeo Prignano, the archbishop of Bari, who took the name Urban VI. By September a majority of the same cardinals had left Rome, declared that the election had been made under threat, and elected Robert of Geneva at Fondi. He called himself Clement VII. Each man claimed to be the only true pope, and neither would give way. In 1379 Clement settled in Avignon and Urban stayed in Rome. The Great Schism, as it came to be called, split the Church until the Council of Constance ended it in 1417.

Every ruler in Europe had to take a side. France and Scotland, and for a time Naples, chose Clement. England, most of the German lands and most of Italy chose Urban. Think of Clement's desk. He needed to write to the king of France about money, to bishops about appointments, to his friends in Italy about which cardinals could be trusted, and many of those letters had to cross lands whose rulers belonged to his rival. A courier can be stopped at a bridge or searched in an inn. If the letter says in plain Latin that the pope will send two thousand florins, whoever opens it holds a weapon.

In the Vatican archives there is a set of cipher keys dated 1379. It was made by a man named Gabriele de Lavinde, from Parma, who served Clement VII, and it is the oldest set of European diplomatic cipher keys that has survived. We will look at it in §6.3. The date is not an accident of the filing. A pope with two rivals and a courier problem is exactly the kind of customer who pays a clerk to invent a cipher.

The Schism was a rare event. The same need became ordinary in the following century, and not because of a pope but because of a habit. Picture an ambassador in an Italian city in the 1470s. His master, a duke or a council, has sent him to live at a foreign court, not for an errand but for years. His job is to see and to write: who visited the ruler this week, what the ruler said about the war, what the bankers are lending, whether the ruler's health is failing. He writes home every few days. He knows that the court he lives at keeps an ambassador of its own in his master's city and would like very much to know how his master reads things, and that the road home passes through territory whose lords may not love his master. He cannot send word of a bribe, a plot or an illness in plain Italian and expect it to stay private.

What he needs is a method with five properties.

1. **A clerk can use it by hand**, at a desk, in an hour, with no device and no special training beyond a lesson.
2. **It works on any sentence**, including names nobody planned for.
3. **It holds for as long as the secret matters**, which for an ambassador's report is weeks or months, not years.
4. **A reader cannot get in by counting.** In 1378 nobody in Italy is known to have written down how to count letters, but any clever secretary could think of it, and the ambassador's host had clever secretaries.
5. **If a copy is stolen it can be replaced**, because the key is a table that can be redrawn and sent by courier.

This chapter tells how Italians met those five requirements. They did it in steps over about a century and a half, and the steps are the plan of the chapter. First came the **nomenclator**, a table that spells words in a cipher and writes common names with a single sign (§6.3). Then came **homophones** and **nulls**, to hide the letter counts (§6.4). Then came the cipher office itself, with its apprentices and its rules (§6.5), and the first written rules for breaking such ciphers (§6.6). Last came a mechanical idea of a quite different kind: **Alberti's disk**, a cipher whose alphabet changes in the middle of the message (§6.7 to §6.9).

Two warnings before we start. First, the sources for this chapter are fewer than its famous names suggest. Almost everything in English about the earliest Italian ciphers comes from David Kahn's *The Codebreakers*, which in turn rests on German and French archival scholarship of the years around 1900; I say which claims rest on one source as we go. Second, I will not say that any of the people below were the first in the world. They were the first *whose work survives and is dated*, in the part of the world this chapter is about. Chapter 4 showed that Baghdad and Cairo had written down counting centuries before, and several signs for one letter some decades before.

## 6.2 The resident ambassador

*Level: beginner.*

For most of the Middle Ages a ruler who wanted to speak to another sent an envoy with one task, a speech to make or a treaty to sign, and the envoy came home when it was done. The Italian city-states had used such envoys for centuries. The change that matters here is an envoy who *stays*. The historian Garrett Mattingly, in *Renaissance Diplomacy* (1955), traced how the resident ambassador grew in Italy through the 1400s. The first residents are usually dated to the 1440s and 1450s, and the Milan of Francesco Sforza is the state most often named. Sforza had been a mercenary captain who made himself duke of Milan in 1450, and a man in his position had to know at all times what the bankers of Florence, the Venetian Senate and the king of Naples were planning. Mattingly's account is that the idea spread because it worked: a state that kept a man on the spot heard first.

The event that turned the habit into a system was the Peace of Lodi, signed in April 1454, and the Italic League that followed in 1455. After a long run of wars, the five big powers of Italy (Milan, Venice, Florence, the Papacy and the Kingdom of Naples) agreed to a rough balance, each one watching the other four to see that nobody grew too strong. The year before, in 1453, Constantinople had fallen to the Ottomans, and Venice, which traded with the Ottoman world and kept an official called the *bailo* at Constantinople, had new reasons to want eyes everywhere. Keeping that balance needed information all the time. Five powers make ten pairs, and each pair, in the fully developed system, meant a resident ambassador in each capital: twenty desks, each sending letters home (Figure 6.1). Smaller courts such as Mantua, Ferrara and Urbino joined in on the same roads, and by the end of the century the practice had begun to spread north to France, Spain and England.

<figure class="mars-fig">
<svg viewBox="0 0 640 360" width="640" role="img" aria-label="Five Italian powers, Milan, Venice, Florence, Rome and Naples, drawn as boxes with a line between every pair, ten lines in all, each line a pair of resident ambassadors" fill="currentColor" font-size="14">
<line x1="184" y1="60" x2="456" y2="60" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="156" y1="79" x2="244" y2="146" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="152" y1="80" x2="318" y2="230" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="160" y1="79" x2="490" y2="291" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="467" y1="79" x2="313" y2="146" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="492" y1="80" x2="358" y2="230" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="511" y1="81" x2="519" y2="289" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="287" y1="185" x2="323" y2="230" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="303" y1="184" x2="487" y2="291" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<line x1="394" y1="268" x2="466" y2="292" stroke="currentColor" stroke-width="1.1" opacity="0.6"/>
<rect x="80" y="43" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="65" font-size="14" text-anchor="middle" font-weight="bold">Milan</text>
<rect x="460" y="43" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="65" font-size="14" text-anchor="middle" font-weight="bold">Venice</text>
<rect x="220" y="148" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="170" font-size="14" text-anchor="middle" font-weight="bold">Florence</text>
<rect x="290" y="233" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="255" font-size="14" text-anchor="middle" font-weight="bold">Rome</text>
<rect x="470" y="293" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="520" y="315" font-size="14" text-anchor="middle" font-weight="bold">Naples</text>
<rect x="238" y="100" width="64" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-dasharray="4 3" opacity="0.7"/>
<text x="270" y="116" font-size="12" text-anchor="middle">Mantua</text>
<rect x="20" y="296" width="116" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-dasharray="4 3" opacity="0.7"/>
<text x="78" y="314" font-size="12" text-anchor="middle">Avignon, 1379:</text>
<text x="78" y="330" font-size="12" text-anchor="middle">the second pope</text>
<text x="20" y="196" font-size="12" text-anchor="start">5 powers, 10 pairs,</text>
<text x="20" y="213" font-size="12" text-anchor="start">20 resident ambassadors</text>
</svg>
<figcaption>Figure 6.1. The Italian system after the Peace of Lodi (1454), not to scale. Every line is a pair of ambassadors, one in each capital, writing home. Small courts such as Mantua sent and received letters on the same roads.</figcaption>
</figure>

### What an ambassador wrote

An ambassador's work was letters. The surviving files, above all the huge Sforza correspondence in the state archive of Milan and the Venetian dispatches, show an ordinary pattern. A letter (a *dispaccio* in Venice) reported conversations, rumors, troop movements, the price of grain and the ruler's mood. At home it was read to the council or the duke's secretary, who answered with instructions. At the end of his posting a Venetian ambassador also gave a formal report, a *relazione*, summing up the state he had watched. The Venetian diarist Marin Sanudo (1466 to 1536), who sat in the Great Council, filled a long diary from 1496 to 1533, in fifty-odd printed volumes, partly with summaries of the ambassadors' letters read to the council. Between them these records show a steady flow of letters, not an occasional one.

Not all of every letter was in cipher. As the surviving dispatches are usually described, writers enciphered the parts that could do harm, a name, a sum, a plan or an insult, and left the rest in plain Italian or Latin. The reason is cost. Enciphering by hand is slow and error-prone, and deciphering is slower. A clerk at the receiving end had to find each group in a table, write down the letter, and fix any slip by guessing. So a dispatch was often a mixed text: plain narrative, then a stretch of numbers, then plain again. As the archives are usually described, many surviving dispatches carry the deciphered text beside the numbers, written by the secretary who read them, or on a separate sheet kept with the letter, which is the best proof that the system was used daily.

### The road

A letter could go wrong in four places (Figure 6.2). The courier could be robbed, since couriers carried money as well as paper. He could be stopped and searched by a lord or a city that wanted to read the post. A servant at an inn could be paid to open and reseal the packet. And the host court could read what its guest sent by opening the post it controlled, which ambassadors assumed as a matter of course. Many hosts at first saw the resident as a spy with a title, and not entirely unfairly; the quip attributed to the English diplomat Henry Wotton in 1604, that an ambassador is an honest man sent to lie abroad for the good of his country, is still quoted for a reason.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The route of a dispatch: ambassador dictates, secretary enciphers, courier crosses the road where four dangers wait, home chancery deciphers, council reads; a dashed arrow shows a rival's reader copying the packet on the road" fill="currentColor" font-size="14">
<rect x="14" y="40" width="104" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="66" y="62" font-size="13" text-anchor="middle" font-weight="bold">Ambassador</text>
<text x="66" y="80" font-size="12" text-anchor="middle">dictates</text>
<rect x="142" y="40" width="104" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="194" y="62" font-size="13" text-anchor="middle" font-weight="bold">Secretary</text>
<text x="194" y="80" font-size="12" text-anchor="middle">enciphers</text>
<rect x="270" y="40" width="104" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="322" y="62" font-size="13" text-anchor="middle" font-weight="bold">Courier</text>
<text x="322" y="80" font-size="12" text-anchor="middle">rides, days</text>
<rect x="398" y="40" width="104" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="450" y="62" font-size="13" text-anchor="middle" font-weight="bold">Chancery</text>
<text x="450" y="80" font-size="12" text-anchor="middle">deciphers</text>
<rect x="526" y="40" width="100" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="576" y="62" font-size="13" text-anchor="middle" font-weight="bold">Council</text>
<text x="576" y="80" font-size="12" text-anchor="middle">reads, replies</text>
<line x1="118" y1="66" x2="140" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="142,66 135,62 135,70" fill="currentColor"/>
<line x1="246" y1="66" x2="268" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="270,66 263,62 263,70" fill="currentColor"/>
<line x1="374" y1="66" x2="396" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="398,66 391,62 391,70" fill="currentColor"/>
<line x1="502" y1="66" x2="524" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="526,66 519,62 519,70" fill="currentColor"/>
<rect x="270" y="130" width="232" height="104" rx="4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="386" y="152" font-size="13" text-anchor="middle" font-weight="bold">On the road</text>
<text x="386" y="173" font-size="12" text-anchor="middle">1. robbers take the courier's purse</text>
<text x="386" y="190" font-size="12" text-anchor="middle">2. a lord stops and searches him</text>
<text x="386" y="207" font-size="12" text-anchor="middle">3. an innkeeper's servant opens the packet</text>
<text x="386" y="224" font-size="12" text-anchor="middle">4. the host court copied it before it left</text>
<line x1="322" y1="94" x2="322" y2="128" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<text x="20" y="150" font-size="12" text-anchor="start">A rival's cipher secretary</text>
<text x="20" y="167" font-size="12" text-anchor="start">gets a copy, and starts to</text>
<text x="20" y="184" font-size="12" text-anchor="start">count and guess.</text>
<line x1="170" y1="178" x2="268" y2="178" stroke="currentColor" stroke-width="1.1" stroke-dasharray="4 3"/>
<polygon points="270,178 263,174 263,182" fill="currentColor"/>
<text x="20" y="272" font-size="12" text-anchor="start">Only the part inside the cipher stays private, so the secretary ciphers the dangerous words and leaves the rest plain.</text>
</svg>
<figcaption>Figure 6.2. The route of a dispatch. Every box after the courier is a place where a reader can enter. Cipher is the one protection that travels with the paper.</figcaption>
</figure>

### Why Italy

Chapter 5 closed with a claim of mine: that Baghdad had books on breaking ciphers by 850 and Europe had none before the 1400s because of demand, not cleverness. Italy is the test. The caliphate and the Mamluk state ran empires through chanceries that wrote to their governors by the week, and Italy in the 1450s did something new for Europe: it built a diplomatic system with twenty regular writers. When every desk expects to be read, a cipher is not a curiosity but a tool, and tools get improved. Whether the Arabic books were read in Italy is a question §6.10 takes up.

## 6.3 The nomenclator: a cipher with a list of names

*Level: beginner.*

Start with the word. A **nomenclator** in ancient Rome was a slave who walked beside a politician in the street and told him, quietly, the name of each person who approached, so that the great man could greet a voter as an old friend. The word means "name-caller". Fifteenth-century Italians borrowed it for a cipher key whose most useful feature was a list of names. The idea is easy to state. A sentence in a diplomatic letter is mostly ordinary words, but a few words come up in every letter and matter more than the rest: *the pope*, *the king of France*, *Milan*, *money*, *the army*, *the fleet*. A cipher that spells these out letter by letter wastes effort on the words that betray most. So the key had two parts:

- a **cipher alphabet**, a symbol or a number for each letter, used to spell out the ordinary words;
- a **code list**, a symbol or a short group for each name, title or word that came up all the time, so that "the pope" was one sign, not seven.

The combination is what historians call a nomenclator. The reason it worked so well is that it covers both ways in which a cipher can leak. The letters are hidden by the cipher alphabet. The words that a reader would guess from context (the name of the enemy, the thing he is sending) are hidden by the code, with no letters to count at all. This is Chapter 1's point that codes and ciphers are weak in different places, and that people who built real systems put them together.

### Lavinde's key, 1379

The oldest surviving European diplomatic key of this kind is the one that opened this chapter. According to Kahn, who drew on the German scholar Aloys Meister's studies of the papal ciphers (published in 1902 and 1906), a set of keys in the Vatican archives was drawn up in 1379 by Gabriele de Lavinde of Parma for Pope Clement VII. The keys pair a simple substitution alphabet with a short list of code symbols for the names that mattered most to a pope in the middle of a schism. I have not seen the key itself, and neither have most readers; what we know of it is Meister's description as passed on by Kahn.

What can be said safely? That in 1379 a papal secretary built a table with the two parts described above, and that it survives. That it is *the oldest surviving* European key and not necessarily the oldest made: a key is exactly the sort of paper a chancery burns when it is out of date, and Chapter 5 made the same point. And that it does not look primitive. A cipher alphabet plus a few code symbols for names is already the whole design that later nomenclators only enlarged. It looks like the work of a man who had done it before, or been taught by someone who had. No source I know says where Lavinde learned it.

!!! note "Life story: Gabriele de Lavinde's key (1379)"
    **Born:** 1379, in the chancery of Pope Clement VII at Avignon, made by Gabriele de Lavinde of Parma; now in the Vatican archives · **Purpose:** private letters for a pope whose rival held Rome and most of Italy, and whose couriers crossed hostile ground · **Helped:** shows the nomenclator, a cipher alphabet plus code symbols for common names, already complete in 1379; gave Meister and later Kahn the date from which the surviving European record begins · **Status:** the oldest surviving European diplomatic key (not necessarily the oldest made); known to most readers only through Meister's 1902 and 1906 descriptions and Kahn's retelling

### A nomenclator by hand

Figure 6.3 shows a small nomenclator of my own, built the way the old ones were. It is a toy. The numbers are invented, and a real key had more entries. Study it before the example.

<figure class="mars-fig">
<svg viewBox="0 0 640 290" width="640" role="img" aria-label="A nomenclator drawn as a table: twenty letters each with one to four numbers, a code list of eight names and words, and two null numbers" fill="currentColor" font-size="14">
<text x="50" y="34" font-size="16" text-anchor="middle" font-weight="bold">A</text>
<text x="50" y="54" font-size="13" text-anchor="middle">23 61</text>
<text x="50" y="70" font-size="13" text-anchor="middle">08</text>
<text x="110" y="34" font-size="16" text-anchor="middle" font-weight="bold">B</text>
<text x="110" y="54" font-size="13" text-anchor="middle">40</text>
<text x="170" y="34" font-size="16" text-anchor="middle" font-weight="bold">C</text>
<text x="170" y="54" font-size="13" text-anchor="middle">17 52</text>
<text x="230" y="34" font-size="16" text-anchor="middle" font-weight="bold">D</text>
<text x="230" y="54" font-size="13" text-anchor="middle">71 05</text>
<text x="290" y="34" font-size="16" text-anchor="middle" font-weight="bold">E</text>
<text x="290" y="54" font-size="13" text-anchor="middle">34 88</text>
<text x="290" y="70" font-size="13" text-anchor="middle">12 47</text>
<text x="350" y="34" font-size="16" text-anchor="middle" font-weight="bold">F</text>
<text x="350" y="54" font-size="13" text-anchor="middle">29</text>
<text x="410" y="34" font-size="16" text-anchor="middle" font-weight="bold">G</text>
<text x="410" y="54" font-size="13" text-anchor="middle">64</text>
<text x="470" y="34" font-size="16" text-anchor="middle" font-weight="bold">I</text>
<text x="470" y="54" font-size="13" text-anchor="middle">56 03</text>
<text x="470" y="70" font-size="13" text-anchor="middle">91</text>
<text x="530" y="34" font-size="16" text-anchor="middle" font-weight="bold">L</text>
<text x="530" y="54" font-size="13" text-anchor="middle">38 70</text>
<text x="590" y="34" font-size="16" text-anchor="middle" font-weight="bold">M</text>
<text x="590" y="54" font-size="13" text-anchor="middle">15 82</text>
<text x="50" y="112" font-size="16" text-anchor="middle" font-weight="bold">N</text>
<text x="50" y="132" font-size="13" text-anchor="middle">44 26</text>
<text x="110" y="112" font-size="16" text-anchor="middle" font-weight="bold">O</text>
<text x="110" y="132" font-size="13" text-anchor="middle">67 09</text>
<text x="110" y="148" font-size="13" text-anchor="middle">73</text>
<text x="170" y="112" font-size="16" text-anchor="middle" font-weight="bold">P</text>
<text x="170" y="132" font-size="13" text-anchor="middle">50 31</text>
<text x="230" y="112" font-size="16" text-anchor="middle" font-weight="bold">Q</text>
<text x="230" y="132" font-size="13" text-anchor="middle">85</text>
<text x="290" y="112" font-size="16" text-anchor="middle" font-weight="bold">R</text>
<text x="290" y="132" font-size="13" text-anchor="middle">20 93</text>
<text x="350" y="112" font-size="16" text-anchor="middle" font-weight="bold">S</text>
<text x="350" y="132" font-size="13" text-anchor="middle">14 58</text>
<text x="410" y="112" font-size="16" text-anchor="middle" font-weight="bold">T</text>
<text x="410" y="132" font-size="13" text-anchor="middle">79 42</text>
<text x="470" y="112" font-size="16" text-anchor="middle" font-weight="bold">U</text>
<text x="470" y="132" font-size="13" text-anchor="middle">06</text>
<text x="530" y="112" font-size="16" text-anchor="middle" font-weight="bold">V</text>
<text x="530" y="132" font-size="13" text-anchor="middle">65</text>
<text x="590" y="112" font-size="16" text-anchor="middle" font-weight="bold">Z</text>
<text x="590" y="132" font-size="13" text-anchor="middle">37</text>
<line x1="20" y1="8" x2="620" y2="8" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<line x1="20" y1="86" x2="620" y2="86" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<line x1="20" y1="164" x2="620" y2="164" stroke="currentColor" stroke-width="1" opacity="0.4"/>
<line x1="20" y1="180" x2="620" y2="180" stroke="currentColor" stroke-width="1" opacity="0.5"/>
<text x="20" y="200" font-size="13" font-weight="bold">Code list: one group for a whole word</text>
<text x="20" y="224" font-size="13">papa = A1</text>
<text x="170" y="224" font-size="13">re = B2</text>
<text x="320" y="224" font-size="13">milano = C3</text>
<text x="470" y="224" font-size="13">venetia = D4</text>
<text x="20" y="246" font-size="13">fiorenza = E5</text>
<text x="170" y="246" font-size="13">napoli = F6</text>
<text x="320" y="246" font-size="13">denari = G7</text>
<text x="470" y="246" font-size="13">turco = H8</text>
<text x="20" y="276" font-size="13" font-weight="bold">Nulls: 00, 99, to be skipped</text>
</svg>
<figcaption>Figure 6.3. The toy nomenclator used in this chapter: a cipher alphabet with homophones for the common letters, a short code list, and two nulls. Real keys were longer, but they had the same three parts.</figcaption>
</figure>

Now encipher the three words `IL RE MANDA` ("the king sends"):

1. `I` is written with the first number listed for I, **56**. `L` is **38**.
2. `RE` is on the code list: one group, **B2**. The whole word is hidden in two characters.
3. `M` is **15**. `A` is **23**, `N` is **44**, `D` is **71**. The second `A` is written with the next number listed for A, **61**, and not 23 again.
4. After every third word we drop in a null. This one is **99**.

The ciphertext is `56 38 B2 15 23 44 71 61 99`. The reader at the other end looks each group up backward, skips the null, and gets `IL`, `RE`, `MANDA`. Notice two things. The two A's of MANDA came out as different numbers, which is a first step against counting (§6.4 gives it its proper name). And `RE`, the most revealing word in the letter, has no letters to count at all.

### Code it

Here is the whole nomenclator as a short program. It uses each homophone in turn and drops a null after every third word.

```python
# A toy nomenclator in the style of a fifteenth-century chancery: a cipher alphabet with
# several numbers for the common letters (homophones), two nulls, and a short code list.
letters = {
    "A": ["23", "61", "08"], "B": ["40"], "C": ["17", "52"], "D": ["71", "05"],
    "E": ["34", "88", "12", "47"], "F": ["29"], "G": ["64"], "I": ["56", "03", "91"],
    "L": ["38", "70"], "M": ["15", "82"], "N": ["44", "26"], "O": ["67", "09", "73"],
    "P": ["50", "31"], "Q": ["85"], "R": ["20", "93"], "S": ["14", "58"],
    "T": ["79", "42"], "U": ["06"], "V": ["65"], "Z": ["37"],
}
codes = {"PAPA": "A1", "RE": "B2", "MILANO": "C3", "VENETIA": "D4", "FIORENZA": "E5",
         "NAPOLI": "F6", "DENARI": "G7", "TURCO": "H8"}
nulls = ["00", "99"]

def encipher(text):
    used = {ch: 0 for ch in letters}          # which homophone to use next, per letter
    out = []
    for n, word in enumerate(text.split(), 1):
        if word in codes:
            out.append(codes[word])           # a whole name becomes one group
        else:
            for ch in word:
                symbols = letters[ch]
                out.append(symbols[used[ch] % len(symbols)])
                used[ch] += 1
        if n % 3 == 0:
            out.append(nulls[n % 2])          # a null now and then, to spoil word lengths
    return " ".join(out)

def decipher(text):
    back = {s: ch for ch, ss in letters.items() for s in ss}
    name = {v: "[" + k + "]" for k, v in codes.items()}
    return "".join("" if g in nulls else name.get(g) or back[g] for g in text.split())

msg = "IL RE MANDA DENARI A NAPOLI"
secret = encipher(msg)
print(secret)
print(decipher(secret))
```

Output:

```
56 38 B2 15 23 44 71 61 99 G7 08 F6 00
IL[RE]MANDA[DENARI]A[NAPOLI]
```

The first nine groups are the ones you made by hand. Three more words followed: `DENARI` ("money") became the single group `G7`, `A` took the third number listed for A (08), and `NAPOLI` became `F6`. Nothing in the output shows where one word ends and the next begins, and that was the usual way: real keys had no space symbol, and the reader found the word breaks as he read.

### Why it grew

The code list is where a nomenclator gains, and where it costs. Each entry is one more thing for a clerk to look up, and one more line to redraw and send by courier when the key is replaced. The lists grew from a handful of names to hundreds of entries, and by the 1600s the biggest held thousands. Chapter 9 follows them to their extreme, the Great Cipher of Louis XIV's France.

!!! note "Life story: the nomenclator"
    **Born:** before 1379 (the oldest surviving key is Lavinde's), in the chanceries of the popes and the Italian states · **Purpose:** to hide the letters of ordinary words with a cipher alphabet and the names that mattered most with single code symbols · **Helped:** carried the diplomatic secrets of Europe for about four hundred years, from Avignon in 1379 to the end of the black chambers around 1800, and gave the cipher secretary his profession · **Retired:** replaced by the telegraph codebooks and then by machines (Chapters 10 to 12); the idea of a code list on top of a cipher lives on in every military codebook

## 6.4 Homophones and nulls: the Mantuan key of 1401

*Level: intermediate.*

A nomenclator's cipher alphabet has a weakness that every secretary could in principle find. Each letter of the plain text is always written with the same sign, so the signs that come up most often are the commonest letters. Chapter 4 told how al-Kindi turned that into a method around 850, and the question of whether Europe knew it before the 1400s is one we come back to in §6.10. A clerk in Italy did not need a treatise. He needed only to count the signs on a stolen letter and see which one came up most.

The remedy that Italian secretaries are first recorded using is simple. If E is the commonest letter, give it not one sign but several, and write each E with the next sign in turn. The signs that stand for the same letter are called **homophones**, from the Greek for "same sound". Add a few **nulls**, signs that mean nothing and are scattered through the text to break up word lengths and repeats, and the count of single signs goes flat.

The oldest surviving case that historians cite is a key from the chancery of the Gonzaga, the lords of Mantua, dated 1401. David Kahn describes it as giving each vowel several different signs and treats it as the first sign in the West that someone understood frequency analysis: if E can be written four ways, no single sign in a letter stands out as "the common one". Kahn's account names the Mantuan secretary as Simeone de Crema. I have not been able to check that name against a second source, so I give it as his. Chapter 4 mentioned the same key when it asked whether Europe learned the idea from the Arabic books, and noted that Ibn ad-Durayhim had written about several signs for one letter in the 1300s. The Mantuan key says nothing about where its maker got the idea.

Why the vowels? Because in Italian, as in Latin, the vowels are the commonest letters by a wide margin: in the 454-letter Italian text used below they make up 45 percent. Someone who counts finds them first. (Chapter 5's scribes had also played with vowels, as dots and as the next consonant. Nothing connects the two, and I do not claim it.)

### A homophonic cipher by hand

Use the toy table of Figure 6.3. The word `SERENISSIMO` ("most serene") has three S's, two E's and two I's. Enciphering letter by letter, taking each letter's numbers in turn:

| Plain | S | E | R | E | N | I | S | S | I | M | O |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Cipher | 14 | 34 | 20 | 88 | 44 | 56 | 58 | 14 | 03 | 15 | 67 |

The two E's came out as 34 and 88, and the two I's as 56 and 03, so a counter who sees `34` and `88` has no way to know they are the same letter. The third S went back to 14, because S has only two numbers in this table and the cycle repeated. That is the limit of the method: a letter with *k* signs shows up as *k* different signs, and each one is used about 1/*k* as often. The more signs you give a letter, the better its count is hidden, and the longer your table.

### Code it: how much does it hide?

How flat does the count get? One honest way to measure is the **index of coincidence**, a number from [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md): the chance that two letters picked at random from the text are the same. For Italian it is near 0.074 in the usual tables. For a text where every sign is equally likely, with *s* signs, it is 1/*s*. The closer a cipher's number is to 1/*s*, the less its single-sign counts tell. The program below takes an invented Italian paragraph (the words of a worried dispatch), drops the H and writes U as V because Alberti's ring in §6.7 has no H and no U, and compares four things: the plain text, a single mixed alphabet, a homophonic cipher with 100 signs spread over the letters in proportion to how common they are, and Alberti's disk turned every four words.

```python
import random
from collections import Counter

text = ("il nostro ambasciatore a firenze scrive che il signor lorenzo riceve ogni giorno lettere da napoli "
        "e da roma e che la citta e inquieta perche si teme la guerra il duca di milano manda denari e uomini "
        "ma la notizia piu grave e che il papa non vuole piu trattare con i fiorentini e domanda che la lega "
        "si sciolga chi potra fidarsi dei corrieri che attraversano le strade in questi giorni di sospetto "
        "ogni lettera deve essere scritta in cifra e ogni cifra cambiata spesso perche i segretari degli altri "
        "principi leggono con pazienza quello che noi scriviamo con paura").upper()
words = [w.replace("H", "").replace("U", "V") for w in text.split()]   # Alberti's ring has no H and no U
plain = "".join(words)

def ic(symbols):
    # chance that two different positions hold the same symbol
    c = Counter(symbols)
    n = len(symbols)
    return sum(v * (v - 1) for v in c.values()) / (n * (n - 1))

random.seed(6)
alphabet = "ABCDEFGILMNOPQRSTVZ"
shuffled = list(alphabet)
random.shuffle(shuffled)
one = dict(zip(alphabet, shuffled))                     # one mixed alphabet

share = {"E": 12, "A": 12, "I": 11, "O": 10, "N": 7, "L": 6, "R": 6, "T": 6, "S": 5, "C": 4,
         "D": 4, "P": 3, "V": 5, "M": 3, "G": 2, "Z": 1, "F": 1, "B": 1, "Q": 1}
homo, n = {}, 0
for ch in alphabet:
    homo[ch] = [n + k for k in range(share[ch])]
    n += share[ch]
turn = Counter()
homo_text = []
for ch in plain:
    homo_text.append(homo[ch][turn[ch] % len(homo[ch])])  # use each letter's symbols in turn
    turn[ch] += 1

outer = "ABCDEFGILMNOPQRSTVXZ1234"
inner = list("abcdefgilmnopqrstvxz&hky")                 # the 23 letters and & in a mixed order
random.shuffle(inner)
alberti = []
for i, w in enumerate(words):
    if i % 4 == 0:
        shift = random.randrange(24)                      # new setting every four words
    for ch in w:
        alberti.append(inner[(outer.index(ch) - shift) % 24])

print("letters in the text:", len(plain))
print("plain text             ", round(ic(plain), 4))
print("one mixed alphabet     ", round(ic([one[c] for c in plain]), 4))
print("homophones, %d symbols  " % n, round(ic(homo_text), 4))
print("Alberti, turned often  ", round(ic(alberti), 4))
print("all symbols equally likely, 24:", round(1 / 24, 4), " 100:", round(1 / 100, 4))
```

Output:

```
letters in the text: 454
plain text              0.0788
one mixed alphabet      0.0788
homophones, 100 symbols   0.0084
Alberti, turned often   0.0437
all symbols equally likely, 24: 0.0417  100: 0.01
```

Read the numbers. A single mixed alphabet leaves the figure exactly where the plain text had it, 0.0788, because it only renames the letters; al-Kindi's counting works as well on it as on the text. The homophonic cipher falls to 0.0084, below even the 0.01 of a perfectly flat 100-sign alphabet, which is a small-sample effect: only 454 letters were enciphered and each sign was used in turn, so each sign appears four or five times, almost exactly evenly, and the measure comes out a hair below 1/100 for so even a spread. Alberti's disk, in this run, lands near 0.0437, close to the 0.0417 of a flat 24-letter alphabet. Both ideas beat the counting attack on single letters by a wide margin. Figure 6.4 shows the same thing as a picture.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="Two bar charts on the same scale: the eight commonest letters of a 454-letter Italian text, tall and uneven, and the eight commonest symbols of its homophonic cipher, short and nearly level" fill="currentColor" font-size="14">
<text x="150" y="22" font-size="14" text-anchor="middle" font-weight="bold">The text: commonest letters</text>
<text x="480" y="22" font-size="14" text-anchor="middle" font-weight="bold">The cipher: commonest symbols</text>
<line x1="20" y1="200" x2="300" y2="200" stroke="currentColor" stroke-width="1.2"/>
<line x1="350" y1="200" x2="630" y2="200" stroke="currentColor" stroke-width="1.2"/>
<rect x="40" y="50.0" width="22" height="150.0" fill="currentColor" opacity="0.75"/>
<text x="51" y="46.0" font-size="12" text-anchor="middle">60</text>
<text x="51" y="218" font-size="12" text-anchor="middle">I</text>
<rect x="74" y="55.0" width="22" height="145.0" fill="currentColor" opacity="0.75"/>
<text x="85" y="51.0" font-size="12" text-anchor="middle">58</text>
<text x="85" y="218" font-size="12" text-anchor="middle">E</text>
<rect x="108" y="72.5" width="22" height="127.5" fill="currentColor" opacity="0.75"/>
<text x="119" y="68.5" font-size="12" text-anchor="middle">51</text>
<text x="119" y="218" font-size="12" text-anchor="middle">A</text>
<rect x="142" y="102.5" width="22" height="97.5" fill="currentColor" opacity="0.75"/>
<text x="153" y="98.5" font-size="12" text-anchor="middle">39</text>
<text x="153" y="218" font-size="12" text-anchor="middle">R</text>
<rect x="176" y="110.0" width="22" height="90.0" fill="currentColor" opacity="0.75"/>
<text x="187" y="106.0" font-size="12" text-anchor="middle">36</text>
<text x="187" y="218" font-size="12" text-anchor="middle">O</text>
<rect x="210" y="122.5" width="22" height="77.5" fill="currentColor" opacity="0.75"/>
<text x="221" y="118.5" font-size="12" text-anchor="middle">31</text>
<text x="221" y="218" font-size="12" text-anchor="middle">N</text>
<rect x="244" y="132.5" width="22" height="67.5" fill="currentColor" opacity="0.75"/>
<text x="255" y="128.5" font-size="12" text-anchor="middle">27</text>
<text x="255" y="218" font-size="12" text-anchor="middle">T</text>
<rect x="278" y="137.5" width="22" height="62.5" fill="currentColor" opacity="0.75"/>
<text x="289" y="133.5" font-size="12" text-anchor="middle">25</text>
<text x="289" y="218" font-size="12" text-anchor="middle">C</text>
<rect x="370" y="182.5" width="22" height="17.5" fill="currentColor" opacity="0.75"/>
<text x="381" y="178.5" font-size="12" text-anchor="middle">7</text>
<text x="381" y="218" font-size="12" text-anchor="middle">77</text>
<rect x="404" y="182.5" width="22" height="17.5" fill="currentColor" opacity="0.75"/>
<text x="415" y="178.5" font-size="12" text-anchor="middle">7</text>
<text x="415" y="218" font-size="12" text-anchor="middle">13</text>
<rect x="438" y="182.5" width="22" height="17.5" fill="currentColor" opacity="0.75"/>
<text x="449" y="178.5" font-size="12" text-anchor="middle">7</text>
<text x="449" y="218" font-size="12" text-anchor="middle">78</text>
<rect x="472" y="182.5" width="22" height="17.5" fill="currentColor" opacity="0.75"/>
<text x="483" y="178.5" font-size="12" text-anchor="middle">7</text>
<text x="483" y="218" font-size="12" text-anchor="middle">79</text>
<rect x="506" y="182.5" width="22" height="17.5" fill="currentColor" opacity="0.75"/>
<text x="517" y="178.5" font-size="12" text-anchor="middle">7</text>
<text x="517" y="218" font-size="12" text-anchor="middle">34</text>
<rect x="540" y="182.5" width="22" height="17.5" fill="currentColor" opacity="0.75"/>
<text x="551" y="178.5" font-size="12" text-anchor="middle">7</text>
<text x="551" y="218" font-size="12" text-anchor="middle">35</text>
<rect x="574" y="185.0" width="22" height="15.0" fill="currentColor" opacity="0.75"/>
<text x="585" y="181.0" font-size="12" text-anchor="middle">6</text>
<text x="585" y="218" font-size="12" text-anchor="middle">36</text>
<rect x="608" y="185.0" width="22" height="15.0" fill="currentColor" opacity="0.75"/>
<text x="619" y="181.0" font-size="12" text-anchor="middle">6</text>
<text x="619" y="218" font-size="12" text-anchor="middle">37</text>
<text x="320" y="242" font-size="12" text-anchor="middle">Same vertical scale. Symbols are numbers 0 to 99; the labels are the numbers.</text>
</svg>
<figcaption>Figure 6.4. What homophones do to a count. The left chart is the plain text (454 letters); the right is the same text with every common letter spread over several numbers, each used in turn.</figcaption>
</figure>

### What homophones do not hide

A flat count of single signs is not a safe cipher. Homophones hide letter frequencies and nothing else. Pairs of letters survive: `Q` is followed by `U` whatever its sign, and the signs of one letter keep much the same neighbors, so signs that share their neighbors are probably the same letter. Word endings survive, as §6.6 shows. The fixed openings and closings of a dispatch survive. And the code groups are a gift: if `B2` appears in every letter, it is a very common word, and the commonest word in a diplomatic letter may well be *the king*.

Modern solvers use the pairs. A program guesses a meaning for each sign, scores how much the result looks like Italian, swaps one sign's meaning at random and keeps the swap if the score improves, and repeats thousands of times. That is how a letter with 100 signs falls in seconds, and how Mary Stuart's lost letters were read in 2023 (Chapter 9). For the 1400s the threat was not a program. It was a clerk with a good eye and a pile of letters, and against a clerk the homophones were a real gain.

!!! note "Life story: the Mantuan key of 1401"
    **Born:** 1401, in the chancery of the Gonzaga lords of Mantua; Kahn names the secretary as Simeone de Crema (one source) · **Purpose:** to hide the commonest letters of a nomenclator by giving the vowels several signs each · **Helped:** the earliest surviving European case of homophones, the first answer in the record to letter counting; gave Kahn his argument that someone in Italy understood frequency analysis around 1400 · **Status:** surviving key known through Kahn's description; the same idea, with more signs and with nulls, runs through every nomenclator that follows

## 6.5 The cipher office

*Level: intermediate.*

A key is paper. A cipher system is a set of people. By the late 1400s the Italian states that used ciphers every day had begun to organize them into offices, and the best-known office is Venice's.

Venice was governed through councils, and the one that mattered for secrets was the **Council of Ten**, set up in 1310 after a failed coup and entrusted with the safety of the state. The Ten kept spies, read intercepted letters and employed cipher secretaries in the Doge's Palace, men who made keys, trained apprentices and kept the work under lock. The post that tied it together was the secretary of ciphers. The first holder whose name history keeps is **Giovanni Soro**, appointed about 1506 (the date comes from a short biography I could not check against the Venetian archives). Soro read the ciphers of many states, and the stories about him are the ones Kahn repeats: that the Medici pope Clement VII, who sat from 1523 to 1534, sent him ciphers in a test to see whether they could be broken. Kahn calls Soro the West's first great cryptanalyst. He was not infallible. There are records of papal dispatches he could not read.

Venice's office is the best known partly because its sources are good: its archive survived the centuries, and so did the Sforza archive in Milan. When historians call the Italian cipher offices the first of their kind, part of what they mean is that these are the first for which the paper survives.

### Rome, Milan and the others

The papal chancery ran its own office. By the late 1500s the post of cipher secretary to the popes was held by members of one family, the **Argenti**. Giovanni Battista Argenti and his nephew Matteo wrote manuals for the office; the standard accounts credit them with alphabets *mixed by a keyword*, so that a cipher alphabet could be rebuilt from a word that fits in the head and not copied out of a table. That detail rests on Kahn. It matters because a key a clerk carries in his memory cannot be lost on the road.

Milan's chancery, where Cicco Simonetta served, kept keys by correspondent. That is the natural way to run twenty desks (Figure 6.1): each ambassador needs his own key, so that if one is captured the others hold. The point is an inference from the situation and from the large collections of keys that survive, and I do not have a source that says Milan did it in exactly this way. Each key meant a table to be drawn, copied, sent by a safe courier and kept in a locked place. When an ambassador was recalled or a courier lost, replacing the key was the only safe thing to do, and every replacement meant a new table to copy by hand.

### A trade with its risks

The cipher secretary was in a strange position. He held, in one head, the keys of every desk, which made him the single most valuable person in the chancery for an enemy to buy. States must have known it, though I know no source that says how Venice or Milan guarded the man. He was also in a small trade where the skills were passed on by apprenticeship, from one person to the next, and where nothing was published. Venice trained apprentices, in the standard accounts, so that the office would outlive its secretary. The first printed book on secret writing came only in 1518 (Chapter 7), and until then a secretary's craft was something he learned from the man he worked for. That is why so little of the craft was written down, and why Simonetta's rules (§6.6) and Alberti's treatise (§6.7) are rare.

### Where are the women?

I looked for women who made or broke ciphers in the Italian chanceries of these years and found none named. The keys and the dispatches were produced by men, as far as the surviving record tells, and the offices were part of states in which women held no office. That is a fact about who got into the archive, and it is not a proof that no woman ever helped. Women do appear as the people the work was done for and against. Bona of Savoy, who governed Milan after her husband Galeazzo Maria Sforza was murdered in December 1476, ruled with the chancellor Simonetta until a coup in 1479 removed Simonetta and pushed her aside (§6.6). Isabella d'Este, marchioness of Mantua from 1490, who governed in her husband's absences, left a very large correspondence in the Gonzaga archive, the same one that holds the key of 1401. I know of no study that says she or Bona enciphered letters with her own hand, and I will not suggest it. The question, who in a court was in the room when the key was used, is an open one for the archives of this period. In later chapters, when the record allows it, I name the women who did the work.

!!! note "Life story: Giovanni Soro"
    **Born:** a Venetian; appointed secretary of ciphers to the Council of Ten about 1506 (one source) · **Purpose:** to make Venice's keys, and to read the ciphers of other states and of the pope · **Helped:** made the Venetian office the model that other states copied; Kahn calls him the West's first great cryptanalyst, and says Clement VII sent him papal ciphers to test · **Status:** records of papal dispatches he could not read survive; no manual of his is known

## 6.6 Simonetta's rules, 1474

*Level: intermediate.*

On 4 July 1474, in Pavia, a man wrote thirteen short rules in Latin, under the title *Regule ad extrahendum litteras ziferatas sine exemplo*, "Rules for extracting ciphered letters without a key". The man was **Cicco Simonetta**, and the paper is the oldest European text we have that explains how to read a cipher without being told the key.

Francesco Simonetta, called Cicco, was born about 1410 at Caccuri (some accounts say Policastro) in Calabria, in the south of Italy, and came north to serve the soldier Francesco Sforza. When Sforza took Milan and became duke in 1450 Simonetta became the chief secretary of the state, and he stayed at the center of Milan's government for almost thirty years. He worked for the first Sforza duke and then for his son Galeazzo Maria, who was murdered in the church of Santo Stefano in Milan on 26 December 1476. Galeazzo's widow, Bona of Savoy, ruled for her young son Gian Galeazzo, and Simonetta stood at her side until Ludovico Sforza, the boy's uncle, seized power in 1479. Simonetta was arrested, held at Pavia and executed there in October 1480. The man who knew the state's secrets best was beheaded by the family he had served all his life.

The rules were written in the middle of that career, while Milan had one of the busiest chanceries in Italy. Perret published the text in 1890 and Augusto Buonafalce published a study in 2008. As they describe it, the rules cover simple substitutions in Latin or Italian with the spaces between words left in, and they teach a reader what to look at: word endings, one-letter words, which letters can be doubled. They would not have helped against a good nomenclator, and nobody has found evidence that anyone used them in the field. I have not reproduced the thirteen rules one by one here. My purpose is to show the *kind* of reasoning they set down, with the facts of Italian, and the reader can compare with Perret and Buonafalce.

Why did Simonetta write them? The sources do not say. My guess, from the setting, is that Milan's secretaries had to read other states' letters that fell into their hands, and that apprentices had to be taught.

### What Italian gives away

Three facts about the language let a reader into a simple substitution when the word breaks are shown.

1. **The vowels are the commonest letters, and words end in them.** Almost every Italian word ends in a vowel: *signore*, *città*, *guerra*, *pace*, *vedo*. The few that end in a consonant are short function words such as *il*, *in*, *con*, *per*, *non*. So the sign that ends the most words is a vowel, and the most frequent signs overall are likely to be vowels too.
2. **One-letter words are few.** In Italian they are *e* ("and"), *a* ("to"), *o* ("or") and, as the article of the plural, *i*. A sign that stands alone is one of these, and the one that stands alone most often is E.
3. **Doubled letters are consonants.** Italian doubles *t*, *s*, *r*, *l*, *n*, *c*, *z* all the time (*lettera*, *guerra*, *nessuno*, *illustrissimo*), but doubled vowels are rare. A sign that appears twice in a row is a consonant.

Add the fact that Q is always followed by U, and the starting set of guesses is already large.

### Try it: solve a message by the rules

Below is an invented letter in Italian, enciphered with one mixed alphabet, word breaks left in, as Simonetta's rules assume. The cipher letters are lowercase so that you do not confuse them with the plain letters. First count.

```python
from collections import Counter

cipher = ("gqqivlegvvgrn vgzunec qf sgllf c oigclf rf g rcesfulg bfeqfun pg ziceef c ucvviun vf pgec "
          "vc gq bfbf tnzqgf qf bfsc n qf qczf gn vsegtn oifuln tcpn c fllcupn qf tnvlef egvbnvlf")
words = cipher.split()
letters = cipher.replace(" ", "")

print("length:", len(letters), "letters in", len(words), "words")
print("commonest letters:", Counter(letters).most_common(6))
print("one-letter words:", dict(Counter(w for w in words if len(w) == 1)))
print("doubled letters:", sorted(set(w[i] for w in words for i in range(len(w) - 1) if w[i] == w[i + 1])))
print("last letters of words:", Counter(w[-1] for w in words).most_common(5))
print("commonest two-letter words:", Counter(w for w in words if len(w) == 2).most_common(3))
```

Output:

```
length: 143 letters in 34 words
commonest letters: [('f', 21), ('g', 15), ('c', 14), ('n', 13), ('v', 12), ('q', 10)]
one-letter words: {'c': 3, 'g': 1, 'n': 1}
doubled letters: ['e', 'l', 'q', 'v']
last letters of words: [('f', 14), ('n', 9), ('c', 7), ('g', 3), ('q', 1)]
commonest two-letter words: [('qf', 4), ('rf', 1), ('pg', 1)]
```

Now apply the three facts. The one-letter word that stands alone three times is `c`, so **c is E**. The sign that ends the most words is `f` (14 of 34), then `n` (9), then `c` again, so `f` and `n` are vowels, and since `f` is also the commonest letter, call it A, and since `n` is the other one-letter word, O. The other one-letter word, `g`, is the article *i* or the word *e*; the vowel left over is I. The doubled signs `e`, `l`, `q`, `v` must be consonants. The two-letter word `qf` appears four times, and the word that Italian uses four times in a short letter and that ends in A is *la*. So `q` is L. Then `vc`, a two-letter word ending in E, is *se* (V is S), `rf` is *ma* (R is M) and `gq` is *il*. The program does that much and shows the message with dots for the letters not yet solved:

```python
cipher = ("gqqivlegvvgrn vgzunec qf sgllf c oigclf rf g rcesfulg bfeqfun pg ziceef c ucvviun vf pgec "
          "vc gq bfbf tnzqgf qf bfsc n qf qczf gn vsegtn oifuln tcpn c fllcupn qf tnvlef egvbnvlf")

def show(guess):
    # print the message with a dot for every letter we have not solved yet
    print(" ".join("".join(guess.get(ch, ".") for ch in word) for word in cipher.split()))

# Step 1: the one-letter word that comes up three times is E; words end in vowels, and the
# commonest last letters are f, n, c, g. Try f = A, n = O, c = E, g = I.
guess = {"c": "E", "n": "O", "f": "A", "g": "I"}
show(guess)

# Step 2: a doubled letter (e, l, q, v) is a consonant. 'qf' turns up four times and the only
# word of that shape Italian needs so often is LA; 'vc' is then SE, 'rf' is MA, and 'gq' is IL.
guess.update({"q": "L", "v": "S", "r": "M"})
show(guess)

# Step 3: read the half-words. ILL.S..ISSIMO SI..O.E is the address a secretary expects on any
# letter, ILLUSTRISSIMO SIGNORE; '..IE.A' is QUIETA, because Q is always followed by U.
guess.update({"l": "T", "e": "R", "i": "U", "o": "Q", "u": "N", "s": "C", "b": "P", "p": "D", "z": "G", "t": "V"})
show(guess)
```

Output:

```
I......I..I.O .I..O.E .A .I..A E ..IE.A .A I .E..A..I .A..A.O .I ..E..A E .E....O .A .I.E .E I. .A.A .O..IA .A .A.E O .A .E.A IO ...I.O ..A..O .E.O E A..E..O .A .O...A .I..O..A
ILL.S..ISSIMO SI..O.E LA .I..A E ..IE.A MA I ME..A..I .A.LA.O .I ..E..A E .ESS..O SA .I.E SE IL .A.A .O.LIA LA .A.E O LA LE.A IO S..I.O ..A..O .E.O E A..E..O LA .OS..A .IS.OS.A
ILLUSTRISSIMO SIGNORE LA CITTA E QUIETA MA I MERCANTI PARLANO DI GUERRA E NESSUNO SA DIRE SE IL PAPA VOGLIA LA PACE O LA LEGA IO SCRIVO QUANTO VEDO E ATTENDO LA VOSTRA RISPOSTA
```

Output:

```
I......I..I.O .I..O.E .A .I..A E ..IE.A .A I .E..A..I .A..A.O .I ..E..A E .E....O .A .I.E .E I. .A.A .O.LIA .A .A.E O .A .E.A IO ...I.O ..A..O .E.O E A..E..O .A .O...A .I..O..A
ILL.S..ISSIMO SI..O.E LA .I..A E ..IE.A MA I ME..A..I .A.LA.O .I ..E..A E .ESS..O SA .I.E SE IL .A.A .O.LIA LA .A.E O LA LE.A IO S..I.O ..A..O .E.O E A..E..O LA .OS..A .IS.OS.A
ILLUSTRISSIMO SIGNORE LA CITTA E QUIETA MA I MERCANTI PARLANO DI GUERRA E NESSUNO SA DIRE SE IL PAPA VOGLIA LA PACE O LA LEGA IO SCRIVO QUANTO VEDO E ATTENDO LA VOSTRA RISPOSTA
```

The letter reads: *Most illustrious lord, the city is quiet but the merchants talk of war, and nobody can say whether the pope wants peace or the league. I write what I see and await your reply.* In step three the break-in came from the address itself, which any reader of a Milanese dispatch could predict. That is the oldest trick of the reader of ciphers, and chapter 4 showed al-Kindi using it on a letter of a different language. A fixed opening is a gift, and §6.8 gives it a second life.

Simonetta's rules, in a small and sensible way, let a reader do what the program just did. They do not make a codebreaker, since they fail on a nomenclator with homophones and code groups (the reader has no vowels to find). But they show that by 1474 a Milanese chancellor understood that a cipher is attacked through the shape of the language, not through the cleverness of the key.

!!! note "Life story: Cicco Simonetta and his rules (1474)"
    **Born:** Francesco "Cicco" Simonetta, about 1410, at Caccuri in Calabria; chief secretary of the Sforza dukes of Milan from 1450; the thirteen rules are dated Pavia, 4 July 1474 · **Purpose:** to teach how to read a simple substitution in Latin or Italian without the key, by word endings, one-letter words and doubled letters · **Helped:** the oldest known European writing on breaking ciphers, and a rare record of what a cipher secretary taught; published by Perret (1890) and studied by Buonafalce (2008) · **Status:** he was arrested in 1479 and executed at Pavia in October 1480; no evidence the rules were used in the field, and they do not touch a nomenclator

## 6.7 Alberti and the disk

*Level: beginner.*

Every cipher in this chapter so far has the same property. Once the message begins, each letter of the plain text is written the same way every time, apart from the homophone cycle. The table is the key and the table does not change. Chapter 4 showed what a reader does to that: he counts. The best answer so far, homophones, flattens the count but leaves the alphabet fixed.

Leon Battista Alberti saw a different answer. He changed the alphabet *while the message was being written*.

Alberti was born in Genoa in 1404, into a Florentine banking family exiled from its own city. He studied law at Bologna and became a humanist, one of the scholars who rebuilt the learning of Rome out of Latin books. From about 1432 he worked in the papal chancery as an *abbreviator*, one of the clerks who drafted the pope's letters, so he spent his working life among the people who wrote and read the most important correspondence in Italy. He wrote on painting (*Della pittura*, 1435) and on architecture (*De re aedificatoria*, written in the 1440s and 1450s), and as an architect he designed the front of Santa Maria Novella in Florence and, for the Gonzaga of Mantua, the church of Sant'Andrea, begun in 1472, the year he died in Rome.

Around 1466 or 1467 he wrote a short Latin treatise called *De componendis cifris*, "On composing ciphers". By his own account in its preface, the occasion was a walk in the papal gardens at the Vatican with a friend, Leonardo Dati, a secretary of the pope, who talked about ciphers and about how few people did them well (some retellings add that they also spoke of the new printing press). Alberti wrote the treatise to meet the need. (That preface is the source for the walk, and Kahn is the usual English retelling.)

### What the treatise says

The treatise opens, as the standard accounts describe it, with the problem of the reader. Alberti explains how a cipher can be solved by counting how often each letter comes up, and he lays out how a secretary should defend against it. He then describes his device, a pair of metal disks (the standard accounts say copper). It is the first thing most histories mention, and the part of the treatise people remember.

- The **outer ring is fixed**. It has 24 cells: 20 capital letters (Latin needs no H, K or Y, and J, U and W were not separate letters) and the digits 1 to 4.
- The **inner ring turns**. It has 24 signs in a scrambled order: 23 lowercase letters and the sign &, for *et*.

The two correspondents have identical disks and agree on one sign of the inner ring, the **index**. To write a message the sender turns the inner ring until the index sits under a capital letter of his choosing. He writes that capital into the message, as a signal. Then he writes each plain letter, found on the outer ring, as the lowercase sign that stands under it. After some words he turns the disk again and writes the new capital. The receiver sees the capital, sets his own disk the same way and reads the letters back. Figure 6.5 shows a disk with the toy ring I use in this chapter.

<figure class="mars-fig">
<svg viewBox="0 0 640 380" width="640" role="img" aria-label="Two concentric rings of 24 cells: a fixed outer ring of capital letters and digits, and a turning inner ring of lowercase letters in a mixed order" fill="currentColor" font-size="14">
<circle cx="320" cy="190" r="168" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="320" cy="190" r="116" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="320" cy="190" r="64" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
<text x="320.0" y="53.0" font-size="15" text-anchor="middle" font-weight="bold">A</text>
<text x="320.0" y="105.0" font-size="15" text-anchor="middle">p</text>
<text x="356.8" y="57.8" font-size="15" text-anchor="middle" font-weight="bold">B</text>
<text x="343.3" y="108.1" font-size="15" text-anchor="middle">v</text>
<text x="391.0" y="72.0" font-size="15" text-anchor="middle" font-weight="bold">C</text>
<text x="365.0" y="117.1" font-size="15" text-anchor="middle">l</text>
<text x="420.4" y="94.6" font-size="15" text-anchor="middle" font-weight="bold">D</text>
<text x="383.6" y="131.4" font-size="15" text-anchor="middle">n</text>
<text x="443.0" y="124.0" font-size="15" text-anchor="middle" font-weight="bold">E</text>
<text x="397.9" y="150.0" font-size="15" text-anchor="middle">h</text>
<text x="457.2" y="158.2" font-size="15" text-anchor="middle" font-weight="bold">F</text>
<text x="406.9" y="171.7" font-size="15" text-anchor="middle">q</text>
<text x="462.0" y="195.0" font-size="15" text-anchor="middle" font-weight="bold">G</text>
<text x="410.0" y="195.0" font-size="15" text-anchor="middle">s</text>
<text x="457.2" y="231.8" font-size="15" text-anchor="middle" font-weight="bold">I</text>
<text x="406.9" y="218.3" font-size="15" text-anchor="middle">g</text>
<text x="443.0" y="266.0" font-size="15" text-anchor="middle" font-weight="bold">L</text>
<text x="397.9" y="240.0" font-size="15" text-anchor="middle">y</text>
<text x="420.4" y="295.4" font-size="15" text-anchor="middle" font-weight="bold">M</text>
<text x="383.6" y="258.6" font-size="15" text-anchor="middle">k</text>
<text x="391.0" y="318.0" font-size="15" text-anchor="middle" font-weight="bold">N</text>
<text x="365.0" y="272.9" font-size="15" text-anchor="middle">x</text>
<text x="356.8" y="332.2" font-size="15" text-anchor="middle" font-weight="bold">O</text>
<text x="343.3" y="281.9" font-size="15" text-anchor="middle">f</text>
<text x="320.0" y="337.0" font-size="15" text-anchor="middle" font-weight="bold">P</text>
<text x="320.0" y="285.0" font-size="15" text-anchor="middle">m</text>
<text x="283.2" y="332.2" font-size="15" text-anchor="middle" font-weight="bold">Q</text>
<text x="296.7" y="281.9" font-size="15" text-anchor="middle">z</text>
<text x="249.0" y="318.0" font-size="15" text-anchor="middle" font-weight="bold">R</text>
<text x="275.0" y="272.9" font-size="15" text-anchor="middle">b</text>
<text x="219.6" y="295.4" font-size="15" text-anchor="middle" font-weight="bold">S</text>
<text x="256.4" y="258.6" font-size="15" text-anchor="middle">r</text>
<text x="197.0" y="266.0" font-size="15" text-anchor="middle" font-weight="bold">T</text>
<text x="242.1" y="240.0" font-size="15" text-anchor="middle">c</text>
<text x="182.8" y="231.8" font-size="15" text-anchor="middle" font-weight="bold">V</text>
<text x="233.1" y="218.3" font-size="15" text-anchor="middle">d</text>
<text x="178.0" y="195.0" font-size="15" text-anchor="middle" font-weight="bold">X</text>
<text x="230.0" y="195.0" font-size="15" text-anchor="middle">t</text>
<text x="182.8" y="158.2" font-size="15" text-anchor="middle" font-weight="bold">Z</text>
<text x="233.1" y="171.7" font-size="15" text-anchor="middle">a</text>
<text x="197.0" y="124.0" font-size="15" text-anchor="middle" font-weight="bold">1</text>
<text x="242.1" y="150.0" font-size="15" text-anchor="middle">&</text>
<text x="219.6" y="94.6" font-size="15" text-anchor="middle" font-weight="bold">2</text>
<text x="256.4" y="131.4" font-size="15" text-anchor="middle">e</text>
<text x="249.0" y="72.0" font-size="15" text-anchor="middle" font-weight="bold">3</text>
<text x="275.0" y="117.1" font-size="15" text-anchor="middle">o</text>
<text x="283.2" y="57.8" font-size="15" text-anchor="middle" font-weight="bold">4</text>
<text x="296.7" y="108.1" font-size="15" text-anchor="middle">i</text>
<text x="320" y="182" font-size="13" text-anchor="middle">fixed ring</text>
<text x="320" y="200" font-size="13" text-anchor="middle">turning ring</text>
<text x="40" y="30" font-size="13" text-anchor="start">outer: A B C D E F G I L M N O P</text>
<text x="40" y="48" font-size="13" text-anchor="start">Q R S T V X Z and 1 2 3 4</text>
<text x="600" y="30" font-size="13" text-anchor="end">inner: 23 letters and &amp;,</text>
<text x="600" y="48" font-size="13" text-anchor="end">in an order only the pair know</text>
</svg>
<figcaption>Figure 6.5. Alberti's disk with the toy ring used in this chapter. With the inner ring's first letter, p, turned under D, the plain letter L is written q, and A is written e.</figcaption>
</figure>

### The disk by hand

Take the toy ring of Figure 6.5. Number the outer cells 0 to 23 from A: A 0, B 1, C 2, D 3, E 4, F 5, G 6, I 7, L 8, M 9, N 10, O 11, P 12, Q 13, R 14, S 15, T 16, V 17, X 18, Z 19, then the digits 1 to 4 at 20 to 23. The inner ring, in order from its index, is

`p v l n h q s g y k x f m z b r c d t a & e o i`

with the index `p` first. To write `LA`, the sender chooses the signal `D` (position 3): this puts `p` under D. Each plain letter at position *j* is then written with the inner sign at position *j* minus 3, counting around the ring.

- `L` is at 8, and 8 − 3 = 5. The inner sign at position 5 is `q`.
- `A` is at 0, and 0 − 3 = −3, which is 21 around the ring of 24. The sign at position 21 is `e`.

So `LA` goes out as `Dqe`: the signal, then two signs. For the next word, `FLOTTA`, the sender turns the ring to the signal `Q` (position 13) and subtracts 13 instead of 3: F at 5 gives 5 − 13 = −8, which is 16, sign `c`; L gives 19, `a`; O gives 22, `o`; T gives 3, `n`, and again `n`; A gives 11, `f`. That is `Qcaonnf`. Notice that the two T's of FLOTTA came out the same, `nn`, while the A of LA and the A of FLOTTA came out as `e` and `f`. Inside one stretch the alphabet is steady, and from stretch to stretch it moves. That is what a **polyalphabetic** cipher means: more than one cipher alphabet in one message. To read the message back, the receiver sees `D`, turns the disk to put `p` under D, finds `q` in the inner ring and reads the capital above it, which is L.

The standard accounts add a second idea to the treatise, and it may be the more original one. Alberti numbered 336 phrases in a small codebook, using every group of two, three and four digits made from the digits 1 to 4: 16 + 64 + 256 = 336. A writer put the code number into the message and enciphered it with the disk like any other letters. A code group such as `312` enciphered under the signal `B` becomes `Bea&`. This is **enciphered code**: a codebook whose numbers are then encrypted. It became standard practice only in the late 1800s, and Alberti's is the first description I know of.

!!! note "Life story: Leon Battista Alberti"
    **Born:** Genoa, 1404, to an exiled Florentine family; died Rome, April 1472 · **Purpose:** a scholar of Latin and an architect, he served as a papal abbreviator from about 1432, and wrote *De componendis cifris* about 1466 or 1467 after a talk with the papal secretary Leonardo Dati · **Helped:** described the first European polyalphabetic cipher and a first enciphered code, and set out how a cipher is attacked by counting; Kahn calls him the "Father of Western Cryptology" · **Status:** the treatise survives in manuscript and, according to the usual account, was first printed in an Italian translation in 1568; no document I know of shows a chancery using the disk in his lifetime

### Why it was a break

Look at what changed. In a nomenclator the secret is a **table**, and the table never changes while it is in force. In the disk the table has two parts. The outer ring is public and could be built by anyone who knew the idea. The secret is the **order of the inner ring** and the **sequence of settings** the sender chooses. The first is a long-term key, the second is a short one that changes with the message. That is a different kind of design, and it is the first European one I know of that separates a lasting key from a changing one. We come back to what it did and did not give in §6.9.

## 6.8 Code it and break it: the disk

*Level: intermediate.*

Here is the disk as a short program, with the toy ring of Figure 6.5. The first letter of the inner ring is the index.

```python
# Alberti's disk. The outer ring is fixed and public; the inner ring is the secret key.
outer = "ABCDEFGILMNOPQRSTVXZ1234"     # 20 capitals (no H, K, Y; U is written V) and 4 digits
inner = "pvlnhqsgykxfmzbrcdta&eoi"     # 23 lowercase letters and & in a mixed order (made up)

def encrypt(words, signals):
    out = []
    for word, cap in zip(words, signals):
        turn = outer.index(cap)         # the inner ring is turned so its first letter sits under `cap`
        out.append(cap + "".join(inner[(outer.index(ch) - turn) % 24] for ch in word))
    return " ".join(out)

def decrypt(text):
    out = []
    for group in text.split():
        turn = outer.index(group[0])    # the capital tells the reader how the disk was turned
        out.append("".join(outer[(inner.index(ch) + turn) % 24] for ch in group[1:]))
    return " ".join(out)

secret = encrypt(["LA", "FLOTTA", "PARTE", "DOMANI"], "DQBM")
print(secret)
print(decrypt(secret))
```

Output:

```
Dqe Qcaonnf Bfizrn Mtlprvo
LA FLOTTA PARTE DOMANI
```

The first two groups are the ones you made by hand. The letter A comes out as `e`, `f`, `i` and `r` in the four words, since the alphabet moved each time. A real sender would also drop the spaces and turn the disk at irregular points.

**Try it.** Decipher `Roxmb Ml Tbvmooy` with the same disk. (Take the capital as the signal, find each sign in the inner ring, and read the capital that stands over it.) The answer is three words, and the second is a single letter.

### Break it: the ring from a known opening

Now put yourself in the position of a rival's cipher secretary who has a stolen letter enciphered with this disk. He does not have the ring. He knows how the disk works, since the idea is public, and the outer ring is the Latin alphabet in order. He can see every signal capital, since they stand in the open. And he can guess how the letter begins. A Venetian ambassador's dispatch was addressed to the Doge as *Serenissimo Principe*, and a letter to a duke began in a similar fixed way, so a guess at the opening of a letter is a good one.

Each guessed letter gives the attacker one fact about the ring. A plain letter at outer position *p*, enciphered under a signal at position *s*, is written with the inner sign at place (*p* − *s*) mod 24. If he knows the plain letter, the signal and the cipher sign, he has learned what stands at that place on the ring. Twenty guessed letters teach him up to twenty places. The program below plays this out. The secret ring is used to make the message, then the attacker learns places from the opening words and reads what he can.

```python
outer = "ABCDEFGILMNOPQRSTVXZ1234"
inner = "pvlnhqsgykxfmzbrcdta&eoi"           # the secret ring; the attacker does not have this

words = "SERENISSIMO PRINCIPE LA FLOTTA DEL RE PARTE DA NAPOLI DOMANI CON QVATTRO GALEE".split()
signals = "TCNAZ1MRPBSGE"                     # the capital written in front of each word

def encrypt(words, signals):
    out = []
    for word, cap in zip(words, signals):
        turn = outer.index(cap)
        out.append(cap + "".join(inner[(outer.index(ch) - turn) % 24] for ch in word))
    return out

intercepted = encrypt(words, signals)
print(" ".join(intercepted))

# The attacker knows the outer ring, sees every capital, and guesses that the letter
# starts with the usual address. Each known pair (plain letter, cipher letter, capital)
# gives one place on the secret ring: place = (plain position - turn) mod 24.
ring = {}
def learn(group, plain_word):
    turn = outer.index(group[0])
    for p, c in zip(plain_word, group[1:]):
        ring[(outer.index(p) - turn) % 24] = c

learn(intercepted[0], "SERENISSIMO")
learn(intercepted[1], "PRINCIPE")
print("places of the ring learned:", len(ring), "of 24")

def read(group):
    turn = outer.index(group[0])
    where = {c: place for place, c in ring.items()}
    return "".join(outer[(where[c] + turn) % 24] if c in where else "." for c in group[1:])

print(" ".join(read(g) for g in intercepted))

# The partly read letter gives away more words: FLOTTA, PARTE, DOMANI, QVATTRO and so on.
for number, guess in [(3, "FLOTTA"), (6, "PARTE"), (8, "NAPOLI"), (9, "DOMANI"), (11, "QVATTRO")]:
    learn(intercepted[number], guess)
print("places of the ring learned:", len(ring), "of 24")
print(" ".join(read(g) for g in intercepted))

# What is left is easy: LA, DEL, DA, CON, GALEE.
for number, guess in [(2, "LA"), (4, "DEL"), (7, "DA"), (10, "CON"), (12, "GALEE")]:
    learn(intercepted[number], guess)
print(" ".join(read(g) for g in intercepted))
print("the ring as recovered:", "".join(ring.get(i, "?") for i in range(24)))
```

Output:

```
Timomtriirda Cxmqypqxl Nob Aqyfccp Zykz 1ty Mnrqga Rzx Pompi&a Blxyiks Sf&a Ggftxxyq El&hpp
places of the ring learned: 12 of 24
SERENISSIMO PRINCIPE L. FL...A D.. RE .AR.E .A NAPO.I DOMA.. ..N ..ATTRO G..EE
places of the ring learned: 19 of 24
SERENISSIMO PRINCIPE L. FLOTTA DE. RE PARTE .A NAPOLI DOMANI CON QVATTRO GA.EE
SERENISSIMO PRINCIPE LA FLOTTA DEL RE PARTE DA NAPOLI DOMANI CON QVATTRO GALEE
the ring as recovered: p?lnhqsgykxfmzbrcdta&?oi
```

Read the output. Nineteen guessed letters taught only 12 places of the ring, because a letter that repeats inside a word under one signal points at the same place twice, and one place turned up in both words. That was enough to read most of the short words around them: `L.` is clearly LA, `RE` is complete, `NAPO.I` is NAPOLI. Those guesses taught seven more places. After the last pass the whole message reads, and the recovered ring is `p?lnhqsgykxfmzbrcdta&?oi`, missing two of 24 places, `v` and `e`. Every later letter enciphered with this ring now opens for the same attacker, whatever signals the sender chooses.

That is a lesson about *keys*, not about this cipher. The secret of the disk is the order of the inner ring. It does not change from letter to letter. A fixed opening phrase, which is nothing but good manners in a dispatch, gives a cribbed attacker a piece of it with every message, and the pieces add up. A cipher whose key is a long-term object leaks that key through any text that can be guessed. It also shows why Alberti's idea was strong against counting and weak against *guessing*. (How such attacks are carried out in general belongs to [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md).)

!!! note "Life story: Alberti's cipher disk"
    **Born:** about 1466 or 1467, in Alberti's *De componendis cifris*, two metal disks with 24 cells each, a fixed outer ring and a turning inner one · **Purpose:** a cipher that changes alphabet inside the message under the writer's hand, with the setting written in the clear as a capital letter · **Helped:** the first European polyalphabetic cipher; the idea that a cipher can be a device with a setting; the root of Trithemius's table (1518) and Bellaso's keyword (1553) in Chapter 7, and, much later, of the Confederate cipher disks of the American Civil War · **Retired:** never used, so far as I know, by a chancery in its inventor's time; replaced in practice by the nomenclator, and in theory by Bellaso's keyword, which moves the signal out of the open

## 6.9 A break with the past, and why it waited

*Level: intermediate.*

Alberti's disk did four things that no earlier cipher in the surviving record had done together.

1. **It changed the alphabet inside the message.** Every simple substitution, however mixed, uses one alphabet. A count on enough text finds it. The disk spreads each plain letter over many cipher signs, and unlike homophones it does so without any extra signs: the same 24 signs serve every letter, but the *meaning* of each sign moves. Its index of coincidence in §6.4's run was 0.0437, close to a flat alphabet's.
2. **It put the key in a device.** The ring is a physical object. Two people can carry identical copies and the whole method is in the metal.
3. **It separated a long-term secret from a short-term setting.** The ring is the long-term key. The signal capital is the setting. Chapter 1's point that for most of history method and key were one thing is the standard to hold this against, and Alberti's design is one of the places where it begins to come apart.
4. **It carried a code inside the cipher**, in the 336-phrase codebook.

It also had a visible weakness, the one the previous section used: the setting is written in the open. Anyone who sees the capital knows where the alphabet moved, and the same ring is used for every message until someone replaces it. Bellaso's keyword (Chapter 7) hides the signal in a word that never appears in the text, and that is the repair.

### Why it was not used

I know of no document that shows an Italian chancery using the disk in Alberti's lifetime. The standard accounts say the strong ciphers of the next century and a half sat on the shelf while ambassadors went on using nomenclators, and the reasons are the five requirements of §6.1. The disk is slower than a table: a clerk must turn the ring, write a capital and look up each letter, and a deciphering clerk must do the same backward. A nomenclator, with its code list, is faster and carries names as single signs, which the disk does not. The disk also needs identical rings at both ends, and the ring is a long-term key that a stolen disk reveals whole. Chapter 7 returns to the question of why the cleverest ciphers were the least used, with a count of how long each letter took by hand. The explanation in the standard accounts is cost, and I think it is right, but it is an explanation I am reasoning from the pattern of the evidence, not a document in which anyone says so.

<figure class="mars-fig">
<svg viewBox="0 0 640 320" width="640" role="img" aria-label="Timeline from 1378 to 1568 of the Italian cipher story: the Schism, Lavinde's key, the Mantuan key, the Peace of Lodi, Alberti, Simonetta, Soro, and the printed ciphers of the next chapter" fill="currentColor" font-size="14">
<line x1="108" y1="8" x2="108" y2="308" stroke="currentColor" stroke-width="1.6"/>
<text x="94" y="27" font-size="14" text-anchor="end" font-weight="bold" opacity="1">1378-79</text>
<circle cx="108" cy="22" r="3.8" fill="currentColor" opacity="1"/>
<text x="124" y="27" font-size="14" text-anchor="start" opacity="1">Great Schism; Clement VII settles at Avignon</text>
<text x="94" y="57" font-size="14" text-anchor="end" font-weight="bold" opacity="1">1379</text>
<circle cx="108" cy="52" r="3.8" fill="currentColor" opacity="1"/>
<text x="124" y="57" font-size="14" text-anchor="start" opacity="1">Lavinde's key for Clement VII (oldest surviving)</text>
<text x="94" y="87" font-size="14" text-anchor="end" font-weight="bold" opacity="1">1401</text>
<circle cx="108" cy="82" r="3.8" fill="currentColor" opacity="1"/>
<text x="124" y="87" font-size="14" text-anchor="start" opacity="1">Mantuan key: several signs for each vowel</text>
<text x="94" y="117" font-size="14" text-anchor="end" font-weight="bold" opacity="1">1454-55</text>
<circle cx="108" cy="112" r="3.8" fill="currentColor" opacity="1"/>
<text x="124" y="117" font-size="14" text-anchor="start" opacity="1">Peace of Lodi and the Italic League</text>
<text x="94" y="147" font-size="14" text-anchor="end" font-weight="bold" opacity="1">c. 1467</text>
<circle cx="108" cy="142" r="3.8" fill="currentColor" opacity="1"/>
<text x="124" y="147" font-size="14" text-anchor="start" opacity="1">Alberti writes De componendis cifris</text>
<text x="94" y="177" font-size="14" text-anchor="end" font-weight="bold" opacity="1">1474</text>
<circle cx="108" cy="172" r="3.8" fill="currentColor" opacity="1"/>
<text x="124" y="177" font-size="14" text-anchor="start" opacity="1">Simonetta's thirteen rules, Pavia, 4 July</text>
<text x="94" y="207" font-size="14" text-anchor="end" font-weight="bold" opacity="1">c. 1506</text>
<circle cx="108" cy="202" r="3.8" fill="currentColor" opacity="1"/>
<text x="124" y="207" font-size="14" text-anchor="start" opacity="1">Giovanni Soro, Venice's secretary of ciphers</text>
<text x="94" y="237" font-size="14" text-anchor="end" font-weight="bold" opacity="0.6">1518</text>
<circle cx="108" cy="232" r="3.8" fill="currentColor" opacity="0.6"/>
<text x="124" y="237" font-size="14" text-anchor="start" opacity="0.6">Trithemius's Polygraphia (Chapter 7)</text>
<text x="94" y="267" font-size="14" text-anchor="end" font-weight="bold" opacity="0.6">1553</text>
<circle cx="108" cy="262" r="3.8" fill="currentColor" opacity="0.6"/>
<text x="124" y="267" font-size="14" text-anchor="start" opacity="0.6">Bellaso's keyword cipher (Chapter 7)</text>
<text x="94" y="297" font-size="14" text-anchor="end" font-weight="bold" opacity="0.6">1568</text>
<circle cx="108" cy="292" r="3.8" fill="currentColor" opacity="0.6"/>
<text x="124" y="297" font-size="14" text-anchor="start" opacity="0.6">Alberti's treatise first printed (usual date)</text>
</svg>
<figcaption>Figure 6.6. The Italian story in one line, 1378 to 1568. The faded rows belong to the next chapter. Dates marked c. are approximate.</figcaption>
</figure>

Alberti's disk is the kind of idea that is right before the circumstances are. By the time hand ciphers became too slow, the disk had been reinvented several times, and Chapter 10 follows the wheels and disks of the telegraph age.

## 6.10 In the real world: what the sources say and do not say

*Level: intermediate.*

This chapter rests on fewer sources than its dates suggest. It helps to say plainly what they are, and what they cannot show.

**The keys themselves.** The best evidence for the story is paper that survives in the archives: the Vatican's cipher keys, the large Sforza collection in the state archive of Milan, the Gonzaga papers at Mantua, the Venetian state archive. A key that survives is a fact. Lavinde's set of 1379 and the Mantuan key of 1401 are known to most readers only through descriptions: the German scholar Aloys Meister's *Die Anfänge der modernen diplomatischen Geheimschrift* (1902) and *Die Geheimschrift im Dienste der päpstlichen Kurie* (1906), then David Kahn's *The Codebreakers* (1967; revised 1996) in English. Almost every account of these early keys in English is Kahn, and Kahn is Meister and a few others. I have not seen the keys, and I say so wherever it matters.

**The dispatches and the treatises.** The ambassadors' letters, with their mixed plain and enciphered passages, show that ciphers were in daily use; Mattingly's *Renaissance Diplomacy* (1955) is the best account of the system they served, and Marin Sanudo's diary (1496 to 1533) preserves Venice's dispatches in summary. Simonetta's thirteen rules (Perret 1890, Buonafalce 2008) and Alberti's *De componendis cifris* are the only two texts of their kind from the 1400s. They tell us what two clever men thought. They do not tell us what a clerk at a desk did on a Tuesday.

**What the record does not show.** It does not show how often ciphers were used, since the plain parts of dispatches left no trace of the choice. It does not show how often they were read: we have Kahn's stories about Soro, and not a list of successes. It does not show anyone using Alberti's disk, or learning it. It does not show where Lavinde or the Mantuan secretary learned their craft. And it says almost nothing about the people below the secretary, the copyists, couriers and apprentices, or about which of them were women (§6.5). The record is a record of chanceries that kept their papers, and that is a bias to keep in mind.

### The Italian bias

Why does the story of European cryptography begin in Italy? Because the diplomatic system was densest there, because the archives survive in good order, and because Kahn and Meister, through whom most of us know the story, looked there. France, Aragon, Burgundy, England and the Hanseatic towns also had chanceries, and some of their ciphers surely existed; the record I know for them is thinner, and I cannot say how much of that is loss and how much neglect. The honest statement is that Italy has the earliest *surviving dated* diplomatic keys that scholars have described, not that nobody else made any.

### Did Italy learn it from the Arabs?

Chapter 4 laid out the case for and against. The Italian evidence adds one fact to the case for and none to the case against. Venetian merchants kept trading houses and consuls in Alexandria and Damascus, in the Mamluk lands where al-Qalqashandi wrote in 1412, so there was a real channel between the two worlds. But no Italian text cites an Arabic one, no Latin or Italian translation of the Arabic books on breaking ciphers is known, and, as Chapter 4 noted, the European writers describe counting as if they had worked it out themselves. The Mantuan key of 1401 falls forty years after Ibn ad-Durayhim's death in 1361 and eleven years before al-Qalqashandi's encyclopedia, and it looks like the same idea. Independent invention of the idea (spread the common letter over several signs) is quite possible, since it is the obvious answer to counting. I conclude, as I did in Chapter 4, that the question is open.

### Can these be broken today?

Yes, all of them, and a laptop does it in seconds. The ciphers of this chapter hide the letters but keep the shape of the message, and a computer can test thousands of guesses a second against that shape.

| Cipher | Broken today? | The attack in plain words |
|---|---|---|
| Simple nomenclator | at once | Count the signs, as al-Kindi did, and guess the code groups from context: "the king" turns up in every letter. A captured copy of the table ends it. |
| Homophones and nulls | easily, by computer | Single-sign counts go flat, but letter pairs do not. A program swaps sign meanings at random and keeps any swap that makes the text look more like Italian, until it reads. That search, plus hand work on the code groups, is how Lasry, Biermann and Tomokiyo read Mary Stuart's 57 lost letters in 2023 (Chapter 9). |
| Alberti's disk | easily, by computer | All the stretches share one ring and the signals are in the open, so what is unknown is only the order of 24 signs, which hill climbing handles on a few hundred letters. By hand, with short stretches, it was far harder, and a fixed opening such as *Serenissimo Principe* does it faster (§6.8). |
| Simonetta's rules | they are the attack | The rules were written to read a simple substitution, and a laptop does the same job on every simple substitution in a blink. |

## 6.11 Going deeper

*Level: expert.*

**The historiography.** A thin chain of scholarship stands between us and the earliest Italian keys. Meister worked in the Vatican archives around 1900 and published the first descriptions of the papal ciphers. Perret, in 1890, had published Simonetta's rules from Milan. Mattingly in 1955 supplied the diplomatic setting. Kahn put these, with Alberti, into one narrative in 1967, and most later histories follow his lines, often to the same adjectives: "the first", "the oldest", "the Father of Western Cryptology". Two cautions are in order. The first is that "the oldest" always means "the oldest *surviving that someone described*", which is a statement about archives, and later work in Italian archives could move any date. The second is that Kahn's own tone is that of a storyteller who is also a careful reader of sources, and a student who wants more than a story should go to Meister and Perret directly, as I have not. A fuller modern study of Italian diplomatic ciphers from the 1300s on would be a worthwhile project, and I do not know that one exists in English.

**The mathematics of homophones.** Write $p_i$ for the share of letter $i$ in the plain text. The **index of coincidence** of the plain text, the chance that two letters picked at random are equal, is

$$\mathrm{IC} = \sum_i p_i^2 .$$

Now give letter $i$ exactly $k_i$ signs and use them equally often. Each sign has share $p_i/k_i$, so the cipher's index of coincidence is

$$\mathrm{IC}_{\text{homophonic}} = \sum_i k_i \left(\frac{p_i}{k_i}\right)^2 = \sum_i \frac{p_i^2}{k_i}.$$

If the number of signs is chosen in proportion to the letter's share, $k_i = s\,p_i$ for a total of $s$ signs, then every term becomes $p_i / s$ and the sum is exactly $1/s$: perfectly flat. With whole numbers of signs the match is only approximate. Run on the counts of §6.4 (454 letters) and its 100-sign table, these formulas give 0.0808 for the plain text and 0.0105 for the homophones, a hair above the flat 0.01 because whole numbers of signs cannot match the shares exactly. The measured 0.0788 of §6.4 is a little below 0.0808 because the program's `ic` function counts pairs of *different* positions. And a finite sample of 454 letters spread as evenly as possible over 100 signs has an index of $(n/s - 1)/(n-1) = 0.0078$ ($n$ letters, $s$ signs), which is why the measured 0.0084 sat below 0.01. A flat count is easy to buy. A reader's next step is the pair counts (the *digraph* index of coincidence), and for those the allocation does not help, since signs of the same letter keep the same neighbors.

**The key space of the disk.** The inner ring can be in any of $24!$ orders, and $\log_2 24! \approx 79.0$, so $24! \approx 2^{79}$. That sounds large and is the wrong number to quote for safety. Against a cipher with a known mechanism, the effective question is how much text pins down the key, which is the **unicity distance** $U = H(K)/D$ taught in [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md). With $H(K) = 79$ bits and a redundancy $D$ of roughly three bits per letter for Italian (a rough figure, from memory of the usual tables), $U$ is of the order of 26 letters. In other words, the key is in principle determined by a couple of dozen letters of known text, and §6.8 recovered 22 of its 24 places from a short letter and a fixed opening. The structure, not the size of the space, decides.

**Why the nomenclator held.** A nomenclator is two systems stacked. The cipher alphabet falls to counting. The code groups fall to a different attack: they behave like words, so their counts follow the Zipf pattern of any language, and a reader who knows the topic can place the common ones from context. What kept nomenclators in use for four centuries was their *cost structure*: cheap to use, cheap to replace, and good enough against a reader with two weeks and no machine. Security is a budget, not a property.

**Open questions.**

- Were there Italian diplomatic keys before 1379 that were lost or burned, and how much older is the practice than Lavinde's set? The wait in the record that Chapter 5 asked about is partly an argument about survival.
- Who first gave a letter several signs, and did the idea come from Ibn ad-Durayhim's world or arise on its own?
- Did anyone use Alberti's disk before the 1500s, and was any key on it ever compromised? No document I know of says so.
- Who actually worked in these offices, and which of them were women? No study I know of takes the staff of a 1400s cipher office as its subject.

## Check yourself

??? question "1. Why did permanent ambassadors lead to a daily use of ciphers, when occasional envoys had not?"

    A resident writes home every few days for years, so thousands of letters are on the road, all worth reading to
    the host court and its rivals. A single mission produces one report. When twenty desks write weekly and each
    expects to be read, a cipher turns from a rare tool into routine.

??? question "2. Using the toy table of Figure 6.3 and taking each letter's numbers in turn, encipher `NAPOLI` letter by letter (not as a code group)."

    N is 44, A is 23, P is 50, O is 67, L is 38 and I is 56, so the ciphertext is `44 23 50 67 38 56`. Every letter
    appears once, so the first number listed for each is used. As a code group the same word is just `F6`.

??? question "3. Why does a code-list entry hide a name better than the cipher alphabet does?"

    Spelled out, the name leaves letters for a reader to count, with their lengths and doubled letters. A code group
    has no letters inside it. It can only be found by context or by catching a copy of the table, and it is shorter,
    so there is less to copy and less to get wrong.

??? question "4. A clerk gives E four signs and uses them in turn. Do the four signs look the same to a counting attacker? What does he look at next?"

    He sees four different signs, each a quarter as common as E would be, so none stands out. He looks at pairs and
    neighbors: the four signs of E have similar neighbors, so signs in similar places are probably the same letter.
    He also looks for fixed openings and for code groups, which repeat in every letter.

??? question "5. In a short Italian message, one sign ends 14 of 34 words and is also the most common sign. What is it likely to be, and why?"

    A vowel, most likely A, E or O. Almost every Italian word ends in a vowel (*signore*, *città*, *guerra*), and
    only short words such as *il*, *in*, *con* and *per* end in a consonant.

??? question "6. With the toy ring of §6.7, encipher `AL` under the signal `C`."

    C is at position 2. A is at 0, and 0 − 2 = −2, which is position 22, the sign `o`. L is at 8, and 8 − 2 = 6,
    the sign `s`. The group is `Cos`.

??? question "7. Alberti writes the setting of the disk as a capital letter in the open. What does that give an attacker, and what repair did later cipher-makers use?"

    It tells him where the alphabet changes, and with a guessed opening he can learn places of the ring (§6.8). The
    later repair, Bellaso's keyword (Chapter 7), lets a secret word choose the alphabet so that no signal is
    written at all.

??? question "8. Lavinde's key of 1379 is called 'the oldest surviving' European diplomatic key. Why not 'the oldest'?"

    A key is a document a chancery destroys when it goes out of date. What survives is what an archive kept and a
    scholar described, so an older key may well have existed, or may still lie undescribed in an archive.

??? question "9. In §6.8 nineteen guessed letters gave only 12 places of the ring. What limits the number of places a crib can teach, and how many could a crib of 30 letters give at most?"

    Each guessed letter under a signal points to one place, (position − signal) mod 24. A letter repeated inside a
    stretch points to the same place twice, and different stretches can coincide. A crib teaches at most one place
    per distinct (letter, signal) pair, and the ring has 24 places, so even 30 letters give at most 24.

??? question "10. Give the contribution of the letter E (share 0.12) to the index of coincidence with one sign and with twelve signs used equally often. What does it show?"

    With one sign it contributes $0.12^2 = 0.0144$. With twelve signs it contributes $0.12^2 / 12 = 0.0012$, a
    twelfth as much. The commonest letters contribute most to the index, so giving them the most signs lowers it
    fastest.

## What you learned

- Permanent ambassadors, which grew in Italy in the 1400s and became a system after the Peace of Lodi in 1454, turned
  ciphers into a daily office job: five powers, ten pairs, twenty desks writing home every week, partly in cipher.
- A nomenclator is a cipher alphabet plus a code list for common names. The oldest surviving European key is
  Gabriele de Lavinde's of 1379 for Clement VII, known through Meister and Kahn.
- Homophones, several signs for a common letter, appear in a Gonzaga key of 1401 (the secretary's name, Simeone de
  Crema, rests on Kahn alone). In a 454-letter test they dropped the index of coincidence from 0.0788 to 0.0084.
  They hide single-letter counts and leave pairs, fixed openings and code groups.
- Venice's Council of Ten employed a secretary of ciphers from about 1506 (Giovanni Soro), and the popes' office
  passed to the Argenti family later in the century. The record says almost nothing about women in these offices.
- Cicco Simonetta wrote thirteen rules for reading a simple substitution on 4 July 1474, using word endings,
  one-letter words and doubled letters. In Italian, almost every word ends in a vowel.
- Alberti's disk (about 1467) changed the alphabet inside the message, put the key in a device and separated a
  long-term ring from a short-term setting. Its signal capitals and a fixed opening let a crib recover the ring.
- Nomenclators outlived the disk in practice because they were faster, cheaper and carried names.

**Next:** [Chapter 7](07-Printed-Ciphers.md), where Trithemius prints the first book on secret writing in 1518 and
Bellaso moves Alberti's signal into a keyword. For the terms, see the [Glossary](Glossary.md).

## Further reading

- David Kahn, *The Codebreakers: The Story of Secret Writing* (rev. ed., Scribner, 1996): the chapters on the Italian
  beginnings (Lavinde, the Mantuan key, Simonetta, Soro, the Argentis, Alberti).
- Aloys Meister, *Die Anfänge der modernen diplomatischen Geheimschrift* (Paderborn, 1902), and *Die Geheimschrift im
  Dienste der päpstlichen Kurie von ihren Anfängen bis zum Ende des XVI. Jahrhunderts* (Paderborn, 1906).
- Garrett Mattingly, *Renaissance Diplomacy* (Houghton Mifflin, 1955).
- Leon Battista Alberti, *De componendis cifris* (about 1466-67): *Dello scrivere in cifra* (Galimberti, Turin, 1994)
  and *A Treatise on Ciphers*, trans. A. Zaccagnini, foreword by David Kahn (Galimberti, Turin, 1997).
- Paul-M. Perret, "Les règles de Cicco Simonetta pour le déchiffrement des écritures secrètes", *Bibliothèque de
  l'École des chartes* 51 (1890); Augusto Buonafalce, "Cicco Simonetta's Cipher-Breaking Rules", *Cryptologia* 32, no. 1
  (2008).
- Marin Sanudo, *I diarii*, ed. R. Fulin and others (Venice, 1879 to 1903), for the dispatches read to the council.
- Anthony Grafton, *Leon Battista Alberti: Master Builder of the Italian Renaissance* (Hill and Wang, 2000), for the man.
- George Lasry, Norbert Biermann and Satoshi Tomokiyo, "Deciphering Mary Stuart's Lost Letters from 1578-1584",
  *Cryptologia* 47, no. 2 (2023): the modern attack on homophones.
- John F. Dooley, *History of Cryptography and Cryptanalysis* (Springer, 2018), a short modern survey.

*Facts I could not check against a second source:* Gabriele de Lavinde's key and its contents (Kahn, after Meister);
the name Simeone de Crema and the contents of the 1401 key (Kahn); Soro's appointment about 1506 and the test ciphers
sent by Clement VII (Kahn and short biographies); the Argenti family's keyword alphabets (Kahn); Simonetta's birth
about 1410, his arrest in 1479 and his execution in October 1480; Alberti's disks being of copper and the first print
of his treatise in 1568; the description of Venetian and Milanese dispatches as partly in cipher with the
deciphered text beside them.
