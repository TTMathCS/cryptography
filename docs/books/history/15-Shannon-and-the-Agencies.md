# 15. Shannon and the secret agencies

*In September 1945, a few weeks after the war ended, a Bell Labs mathematician finished a secret report that turned secrecy into a subject with theorems, and the governments that had won the signals war decided to keep their codebreakers rather than send them home. This chapter covers the thirty years from 1945 to about 1975. It tells how a telephone company built the first digital speech scrambler and how Claude Shannon's wartime work on it became the mathematics of secrecy; how the United States and Britain turned their wartime codebreaking into the permanent agencies we now call the NSA and GCHQ, bound together by a treaty; how a Swiss firm sold cipher machines to the world while the CIA and West German intelligence secretly owned it; how the Soviet Union and its allies built their own machines; and which of the people at these agencies were women whose work the histories long left out. You will add a key to digital speech the way SIGSALY did, count how many letters of ciphertext fix the key of Enigma and of DES, break a toy "rigged" machine, and run a shift register.*

!!! abstract "In this chapter"
    **You will learn:**

    - how SIGSALY (1943) turned speech into numbers and hid them under a one-time key, and why the Allies needed it;
    - what Shannon's classified report of 1945 and his paper of 1949 proved (perfect secrecy, redundancy, the unicity distance, confusion and diffusion) and what they left open;
    - how the Armed Forces Security Agency, the NSA, GCHQ and the UKUSA agreement came about, and what the sources show and do not show about how they worked;
    - the story of Boris Hagelin and Crypto AG, what the reports of 2020 say about the CIA and West German intelligence owning it, and which parts rest on a single source;
    - what the Soviet Fialka and the East German machines were, and how little the West knew about them for decades;
    - how shift registers replaced rotors, and how a captured ship and a family spy ring cost the US Navy its keys;
    - who Ann Caracristi, Juanita Moody, Gene Grabeel, Joan Clarke and others were after 1945, and what the record does and does not say about women at the agencies.

    **You need:** [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) (the one-time pad), [chapter 12](12-Rotors-and-Enigma.md) and [chapter 13](13-Bletchley-Park.md) (the wartime machines and the people who broke them), and [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) (perfect secrecy, taught there in full). The mathematics of information is in [the Mathematics book, chapter 17](../mathematics/17-Information-and-Entropy.md); here you meet it as Shannon's readers did.

    **Levels:** §15.1 to §15.3, §15.9 and §15.10 are for beginners, §15.4 to §15.8 are intermediate, §15.11 is expert.

## 15.1 The problem: the war is over and the secret is not

*Level: beginner.*

Germany surrendered on 8 May 1945, and Japan signed its surrender on 2 September on the deck of the battleship *Missouri* in Tokyo Bay. By the end of the year the largest codebreaking organizations in history were being taken apart. Bletchley Park, which had held about ten thousand people at its peak ([chapter 13](13-Bletchley-Park.md)), shrank to a few hundred within a year or two. In the United States the Army's Arlington Hall and the Navy's offices on Nebraska Avenue in Washington had employed, between them, more than ten thousand women, by the count in Liza Mundy's *Code Girls* (2017). Most of the women hired for the length of the war left within a year or two; some stayed, and §15.9 is about them.

Three problems faced the governments that kept the pieces. The first was the secret itself. The Allies had read Enigma, Lorenz, Purple and JN-25 for years and the enemy had not guessed it. To say so would teach every future opponent what to fix. So everyone who had worked at these places had signed an oath, and in Britain the fact that Enigma had been broken stayed hidden until F. W. Winterbotham's book *The Ultra Secret* appeared in 1974 ([chapter 13](13-Bletchley-Park.md) tells that story). A story that is often told and thinly documented says that Britain sold captured Enigma machines to newly independent states after the war and read their traffic; hold it loosely.

The second problem was a new opponent. The alliance with the Soviet Union gave way to the Cold War within two years, and Soviet traffic was hard. The Soviets protected their most important messages with one-time pads. When American codebreakers found a way into part of that traffic by exploiting pads that had been used twice (Venona, told in [chapter 14](14-The-Rest-of-the-War.md)), the other side learned that something was wrong. On 29 October 1948, a day that American cryptologists later called Black Friday, the Soviet Union changed its codes and ciphers across the board and the West lost most of its view of Soviet military traffic, as the NSA's own histories describe it. Whether a spy tipped the Soviets off (William Weisband, a Russian linguist at Arlington Hall, is the name usually given) has been argued for decades, and the argument is not settled.

The third problem was also an opportunity. The war had produced electronic switching, vacuum-tube logic and the first electronic computers (Colossus in 1943 to 1944, ENIAC unveiled in 1946), so a cipher could now be a machine that did arithmetic at a speed no clerk could match, and so could its enemy. And in the one area where no one had made progress, the question of what makes a cipher secure, a single paper was about to give an answer. Until then, the only open books on the subject were handbooks of solving methods, such as Helen Fouché Gaines's *Elementary Cryptanalysis* (1939). There was no theory.

This chapter follows three strands through the thirty years that followed. The first is the theory: Shannon's reports. The second is the institutions: the American and British agencies, and the treaty that tied them. The third is the machines and the companies: SIGSALY, Hagelin's Swiss firm, the Soviet Fialka. One fact binds them. For thirty years nearly all of it was secret, and the public learned about it only by leaks, defectors, court cases and, much later, declassification. A great deal of this chapter is therefore a record of what the sources say and where they stop. Figure 15.1 sets the main dates in order.

<figure class="mars-fig">
<svg viewBox="0 0 640 356" width="640" role="img" aria-label="Timeline of secrecy from 1943 to 1977" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="348" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1943</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">SIGSALY goes into service (15 July); Shannon meets Turing</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">1945</text>
<circle cx="102" cy="48" r="4.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start" font-weight="bold">Shannon's classified report (1 September)</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">1946</text>
<circle cx="102" cy="74" r="3.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start">GCHQ is named; the UKUSA agreement (5 March)</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">1948</text>
<circle cx="102" cy="100" r="3.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start">Black Friday: the Soviets change their ciphers</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">1949</text>
<circle cx="102" cy="126" r="3.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start">AFSA formed; Shannon publishes his paper</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">1952</text>
<circle cx="102" cy="152" r="4.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start" font-weight="bold">The NSA is created (4 November); Crypto AG founded</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">about 1956</text>
<circle cx="102" cy="178" r="3.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start">The Soviet Fialka enters service</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">1960</text>
<circle cx="102" cy="204" r="3.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start">Two NSA analysts defect to Moscow</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">1967</text>
<circle cx="102" cy="230" r="3.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start">Kahn's The Codebreakers is published</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">1968</text>
<circle cx="102" cy="256" r="3.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start">North Korea seizes the USS Pueblo</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">1970</text>
<circle cx="102" cy="282" r="4.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start" font-weight="bold">The CIA and the BND secretly buy Crypto AG</text>
<text x="88" y="313" font-size="14" text-anchor="end" font-weight="bold">1974</text>
<circle cx="102" cy="308" r="3.5" fill="currentColor"/>
<text x="118" y="313" font-size="14" text-anchor="start">The Ultra Secret reveals Bletchley (chapter 13)</text>
<text x="88" y="339" font-size="14" text-anchor="end" font-weight="bold">1977</text>
<circle cx="102" cy="334" r="3.5" fill="currentColor"/>
<text x="118" y="339" font-size="14" text-anchor="start">DES becomes a standard (chapter 16)</text>
</svg>
<figcaption>Figure 15.1. From SIGSALY to DES. Almost everything on this line was secret when it happened and became known later, by leaks, books and declassification.</figcaption>
</figure>

## 15.2 SIGSALY: the voice that went digital

*Level: beginner.*

The story starts before the war ended, with a telephone. One of the practical problems of the alliance was how its leaders could talk. Since 1927 telephone calls had crossed the Atlantic by shortwave radio, and a shortwave signal goes everywhere. Bell Labs built a scrambler for the circuit in the 1930s, called the A-3, which cut the voice into frequency bands and shuffled and inverted them. It stopped casual listeners. Allied reports of the time say it did not stop the engineers of the German post office's research service, who had a listening station at Noordwijk on the Dutch coast and who were said to have found a way to unscramble it by about 1941; accounts differ on how soon and how well. The US Army Signal Corps drew a hard conclusion. Scrambling a voice by moving its parts around could never be safe against an enemy with time and filters, because the shape of the speech stays visible in the scrambled sound. A telephone needed what Gilbert Vernam had given the teleprinter ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)): turn the message into numbers, add a random key, and use the key once.

A telephone call is not numbers, but Bell Labs had a tool for turning it into some. Homer Dudley (1896 to 1980), a Bell Labs engineer, had worked since 1928 on the idea that speech has two parts: a source, which is the buzz of the vocal cords or the hiss of breath, and a filter, which is the shape of the mouth and throat. Measure how loud the speech is in each of ten bands from low pitch to high, add the pitch of the buzz, and you have a description that changes only slowly, about fifty times a second, and needs far less bandwidth than the sound. At the other end a machine with a buzz, a hiss and ten filters could rebuild a voice from the description. Dudley called the analyzer a vocoder, from "voice coder". His purpose was to save bandwidth on costly cables. The result sounded like a robot but could be understood, and with practice the speaker could be recognized. In 1939 Bell Labs showed a keyboard version of the synthesizer half, the Voder, at the New York World's Fair, played by trained women operators.

<figure class="mars-fig">
<svg viewBox="0 0 640 385" width="640" role="img" aria-label="Block diagram of SIGSALY: speech is analyzed by a vocoder, sampled into six levels, a key level from a record is added modulo six, and the result is sent by radio; the far end subtracts the same key from its copy of the record" fill="currentColor" font-size="14">
<text x="320" y="20" font-size="13" text-anchor="middle" font-weight="bold">sending end</text>
<rect x="10" y="30" width="110" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65.0" y="63.0" font-size="13" text-anchor="middle">speech</text>
<rect x="150" y="30" width="120" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="210.0" y="54.5" font-size="13" text-anchor="middle">vocoder</text>
<text x="210.0" y="71.5" font-size="13" text-anchor="middle">12 channels</text>
<rect x="300" y="30" width="130" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="365.0" y="54.5" font-size="13" text-anchor="middle">sample 50 a second</text>
<text x="365.0" y="71.5" font-size="13" text-anchor="middle">6 levels each</text>
<rect x="470" y="30" width="80" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="510.0" y="54.5" font-size="13" text-anchor="middle" font-weight="bold">add</text>
<text x="510.0" y="71.5" font-size="13" text-anchor="middle">mod 6</text>
<line x1="120" y1="58" x2="150" y2="58" stroke="currentColor" stroke-width="1.3"/>
<polygon points="150,58 143.6,60.7 143.6,55.3" fill="currentColor"/>
<line x1="270" y1="58" x2="300" y2="58" stroke="currentColor" stroke-width="1.3"/>
<polygon points="300,58 293.6,60.7 293.6,55.3" fill="currentColor"/>
<line x1="430" y1="58" x2="470" y2="58" stroke="currentColor" stroke-width="1.3"/>
<polygon points="470,58 463.6,60.7 463.6,55.3" fill="currentColor"/>
<rect x="440" y="118" width="140" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="510.0" y="139.5" font-size="13" text-anchor="middle">key record</text>
<text x="510.0" y="156.5" font-size="13" text-anchor="middle">(vinyl, noise)</text>
<line x1="510" y1="118" x2="510" y2="86" stroke="currentColor" stroke-width="1.3"/>
<polygon points="510,86 512.7,92.4 507.3,92.4" fill="currentColor"/>
<line x1="550" y1="58" x2="600" y2="58" stroke="currentColor" stroke-width="1.3"/>
<polygon points="600,58 593.6,60.7 593.6,55.3" fill="currentColor"/>
<text x="590" y="46" font-size="12" text-anchor="middle">radio</text>
<line x1="600" y1="58" x2="600" y2="190" stroke="currentColor" stroke-width="1.3"/>
<text x="320" y="215" font-size="13" text-anchor="middle" font-weight="bold">receiving end</text>
<rect x="470" y="230" width="80" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="510.0" y="254.5" font-size="13" text-anchor="middle" font-weight="bold">subtract</text>
<text x="510.0" y="271.5" font-size="13" text-anchor="middle">mod 6</text>
<rect x="300" y="230" width="130" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="365.0" y="254.5" font-size="13" text-anchor="middle">levels back to</text>
<text x="365.0" y="271.5" font-size="13" text-anchor="middle">channel signals</text>
<rect x="150" y="230" width="120" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="210.0" y="254.5" font-size="13" text-anchor="middle">vocoder</text>
<text x="210.0" y="271.5" font-size="13" text-anchor="middle">synthesizer</text>
<rect x="10" y="230" width="110" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="65.0" y="263.0" font-size="13" text-anchor="middle">speech</text>
<line x1="600" y1="190" x2="600" y2="258" stroke="currentColor" stroke-width="1.3"/>
<polygon points="600,258 597.3,251.6 602.7,251.6" fill="currentColor"/>
<line x1="600" y1="258" x2="550" y2="258" stroke="currentColor" stroke-width="1.3"/>
<polygon points="550,258 556.4,255.3 556.4,260.7" fill="currentColor"/>
<line x1="470" y1="258" x2="430" y2="258" stroke="currentColor" stroke-width="1.3"/>
<polygon points="430,258 436.4,255.3 436.4,260.7" fill="currentColor"/>
<line x1="300" y1="258" x2="270" y2="258" stroke="currentColor" stroke-width="1.3"/>
<polygon points="270,258 276.4,255.3 276.4,260.7" fill="currentColor"/>
<line x1="150" y1="258" x2="120" y2="258" stroke="currentColor" stroke-width="1.3"/>
<polygon points="120,258 126.4,255.3 126.4,260.7" fill="currentColor"/>
<rect x="440" y="318" width="140" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="510.0" y="339.5" font-size="13" text-anchor="middle">identical record</text>
<text x="510.0" y="356.5" font-size="13" text-anchor="middle">(second copy)</text>
<line x1="510" y1="318" x2="510" y2="286" stroke="currentColor" stroke-width="1.3"/>
<polygon points="510,286 512.7,292.4 507.3,292.4" fill="currentColor"/>
<text x="160" y="330" font-size="12" text-anchor="start">Each record plays about 12 minutes, then is destroyed.</text>
<text x="160" y="350" font-size="12" text-anchor="start">Both ends start the records at agreed moments.</text>
</svg>
<figcaption>Figure 15.2. SIGSALY in one picture. The vocoder turns speech into slowly changing numbers; adding a random key level to each number, modulo six, is Vernam's idea applied to speech. Dashed boxes are the two matched records.</figcaption>
</figure>

SIGSALY used Dudley's description as its message. On the usual account it took twelve numbers fifty times a second (ten for the loudness in the bands and two for the pitch information), reduced each to one of six levels, and added to each a random key level between 0 and 5, with the sum taken modulo 6. The key came from noise. Bell Labs sampled the hiss of vacuum tubes (mercury-vapor rectifiers, in the account I have), turned the samples into levels and cut them as sound on sixteen-inch phonograph records. Two identical copies of each record were pressed, one for each end, and sent by courier. A record played for about twelve minutes. The two terminals started their records at an agreed moment and kept them in step to a fraction of a second, which took a team of operators. When a record had played, it was destroyed. This is a one-time pad in exactly the sense of [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md): a random key as long as the message, used once. The only difference is that the "letters" were the six levels of a speech sample and the "alphabet" had six symbols. Adding a uniform random level to a level in a group of six gives a uniform random level, whatever the speech was, and that is Shannon's condition for perfect secrecy.

### Code it: six levels and a key

The program takes one channel of a made-up smooth signal, turns it into the six levels, adds a key from a random-number generator that stands in for the record, and removes it at the other end. It then does what the Americans took care never to do, uses the same key twice.

```python
# A toy of SIGSALY's trick: turn a smooth signal into six levels, then add a random key level mod 6.
import math
import random

LEVELS = 6
# One "channel" of a vocoder: how loud the speech is in one band, read 50 times a second.
# Here a made-up smooth signal between 0 and 1, 20 readings (0.4 second).
signal = [0.5 + 0.5 * math.sin(i / 3) for i in range(20)]
levels = [min(LEVELS - 1, int(x * LEVELS)) for x in signal]    # each reading becomes 0..5

rng = random.Random(1943)                                       # stands in for the noise on the record
key = [rng.randrange(LEVELS) for _ in levels]                   # one key level per reading
sent = [(m + k) % LEVELS for m, k in zip(levels, key)]          # what goes over the radio
back = [(c - k) % LEVELS for c, k in zip(sent, key)]            # the far end plays its copy of the record

print("speech levels:", "".join(map(str, levels)))
print("key levels:   ", "".join(map(str, key)))
print("on the air:   ", "".join(map(str, sent)))
print("recovered:    ", "".join(map(str, back)), back == levels)

# Use the same record twice and the key cancels: the difference of the two
# transmissions is the difference of the two speeches.
pause = [0] * len(levels)                                       # a pause: level 0 everywhere
sent2 = [(m + k) % LEVELS for m, k in zip(pause, key)]
leak = [(a - b) % LEVELS for a, b in zip(sent, sent2)]
print("two-call leak:", "".join(map(str, leak)), leak == levels)

# The bit rate that the 12 channels needed: 12 channels, 50 readings a second, one of 6 levels each.
print(round(12 * 50 * math.log2(LEVELS)), "bits a second")
```

Output:

```text
speech levels: 33455555432100000123
key levels:    55043314245512312435
on the air:    22432203011012312552
recovered:     33455555432100000123 True
two-call leak: 33455555432100000123 True
1551 bits a second
```

The first four lines are the pad working: the line "on the air" looks like noise, and only a person with the key can turn it back into the smooth rise and fall of the line above it. The "two-call leak" line is the pad failing. If one of the two calls is a pause, the other comes out whole. Real speech is not a pause, but the lesson is the one Venona taught the Soviets: the difference of two ciphertexts under one key is the difference of two messages, and differences can be solved ([chapter 14](14-The-Rest-of-the-War.md)). The bit rate is the last line: about 1,550 bits a second, a tiny stream by later standards. It is the reason a voice that sounded like a machine was good enough, and the reason the engineers had to build a vocoder and could not simply digitize the telephone.

### The system and its people

The first SIGSALY link went into service on 15 July 1943, between a terminal in the Pentagon basement and one in the basement of the Selfridges department store in London. By the end of the war there were about a dozen terminals, in Washington and London, in Algiers, Hawaii, Australia, Manila, Guam, Paris, Frankfurt and Tokyo among others (lists differ on the exact set). The sources I have seen put the number of conferences at about three thousand. Each terminal filled a large room: dozens of racks of equipment, tens of tons, and the figures I have seen are about 40 racks and 55 tons. The Allied operators called the sound it made the Green Hornet, after the buzz of the radio show's theme. The name SIGSALY itself was a cover name and not an acronym. The system was never broken, as far as anyone knows. Whatever the German and Japanese listeners recorded, it sounded like noise.

Two men from outside the Bell Labs engineering team mattered to its security. Claude Shannon was consulted on the encryption (§15.3). Alan Turing, who had come to the United States in November 1942 to share the bombe work, spent part of the winter of 1942 to 1943 at Bell Labs checking the system's security for the British government, which had to agree to carry Churchill's voice on it. The reports I know say he was satisfied. He went home in the spring of 1943 and began work on a small speech-scrambling device of his own, called Delilah, with the engineer Donald Bayley, at Hanslope Park, the British communications center north of London (Turing moved there in 1944). A single working prototype existed by the end of the war; the sources I know do not show it in service.

!!! note "Life story: SIGSALY"
    **Born:** 1940 to 1943 at Bell Labs; first working link 15 July 1943 between the Pentagon and London · **Purpose:** to let Allied leaders and commanders talk by voice without an enemy understanding them · **Helped:** about 3,000 conferences in the war, including Washington-London links; it was never known to be broken; it was the first practical use of digital speech and an early practical use of pulse-code modulation · **Retired:** after the war; the date for the last terminal is not clear in the sources I have · **Replaced by:** postwar secure voice systems built on the same idea with transistors, and much later by the digital telephones of the 1980s

!!! note "Life story: Homer Dudley"
    **Born:** 1896; died 1980 · **Purpose:** to cut the bandwidth of speech, first for undersea cables · **Helped:** the vocoder (from 1928), the Voder (1939) and so the idea of describing speech instead of sending it; his work became the base of SIGSALY and, much later, of the speech coders in mobile phones · **Status:** the vocoder lives on in digital speech compression and in music, where it makes the "robot voice"

### In the real world

The best sources for SIGSALY are the NSA's own: J. V. Boone and R. R. Peterson, *The Start of the Digital Revolution* (2000), and a shorter account by Patrick Weadon, both issued by the agency's Center for Cryptologic History. The patents on the system were kept under secrecy orders for about thirty years, and the system itself stayed a secret until 1976, according to an NSA history. That means that for the whole period of this chapter, the first digital voice cipher was a fact known to a few thousand people. What the sources do not give in detail is cost, the exact weight of each terminal, the list of terminals and the date of the last one. The figures in this section are the ones that agree across the accounts I could check, and they are marked where they come from one account.

## 15.3 Shannon at Bell Labs: the report and the paper

*Level: beginner.*

Claude Elwood Shannon was born on 30 April 1916 in Petoskey, Michigan, and died on 24 February 2001 in Medford, Massachusetts. He studied electrical engineering and mathematics at the University of Michigan, and at MIT in 1937 he wrote a master's thesis that showed that the relays and switches in a telephone exchange obey the algebra of George Boole, so that a circuit can do logic. It has been called the most important master's thesis of the century. He took a PhD in 1940 (on the algebra of genetics), spent a year in Princeton, and in 1941 joined Bell Labs in New York, where wartime work on anti-aircraft fire control and then on cryptography took most of his time.

Bell Labs was one of the places where the Allies built their own secure communications, and its mathematicians were asked to check whether the systems were really secure. Shannon was one of them. Later histories say that he was consulted on the security of SIGSALY, and that is the connection to the story above: the question of what happens when you add a random key to a signal is the question the report answers in general. In early 1943 Turing was at the same laboratory. By Shannon's recollection, told to his biographers, the two met over tea in the cafeteria, were forbidden to talk about their secret work, and talked instead about whether machines could think and learn.

On 1 September 1945 Shannon finished a classified Bell Labs memorandum with the title "A Mathematical Theory of Cryptography". The paper that came out of it is the first open work to say precisely what it means for a cipher to be secure and to prove theorems about it. It used ideas he had worked out in the same years for communication: that information can be measured, that a source of messages has an entropy, that the part of a message that is predictable is redundancy. Shannon later said that the two subjects were so close together that he could not separate them. The cryptography report came first, but the public saw the communication paper first: "A Mathematical Theory of Communication" appeared in the *Bell System Technical Journal* in July and October 1948 and founded information theory. The cryptography work followed in the same journal in October 1949 (volume 28, number 4, pages 656 to 715) as "Communication Theory of Secrecy Systems". It was a revised form of the report of 1945, cleared for publication. The sources I know do not say who cleared it or why; it names no machine and no government, and that may be reason enough.

What the paper did was give a language, and the language mattered more for the next thirty years than any particular result. It said what a secrecy system is: a set of ways to turn messages into cryptograms, one for each key, with each key chosen with some probability. It said what the attacker knows: the cryptogram and the system, and not the key. It said how to measure what the attacker gains by seeing the cryptogram: the drop in uncertainty about the message, which Shannon called equivocation. And it distinguished two ways a cipher can be strong. A cipher can be strong because the cryptogram carries no information about the message at all, however much work the attacker does (§15.4, perfect secrecy). Or it can be strong because the information is there but it would take too much work to extract (practical secrecy). Every cipher in the book up to now has been of the second kind except the one-time pad.

<figure class="mars-fig">
<svg viewBox="0 0 640 245" width="640" role="img" aria-label="Shannon's diagram of a secrecy system: a message source, an enciphering step, a cryptogram that an enemy can intercept, a deciphering step, and a key source that reaches both ends by a separate channel" fill="currentColor" font-size="14">
<rect x="10" y="60" width="100" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60.0" y="81.5" font-size="13" text-anchor="middle">message</text>
<text x="60.0" y="98.5" font-size="13" text-anchor="middle">source</text>
<rect x="150" y="60" width="100" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="200.0" y="81.5" font-size="13" text-anchor="middle" font-weight="bold">enciphering</text>
<text x="200.0" y="98.5" font-size="13" text-anchor="middle">step E</text>
<rect x="390" y="60" width="100" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="440.0" y="81.5" font-size="13" text-anchor="middle" font-weight="bold">deciphering</text>
<text x="440.0" y="98.5" font-size="13" text-anchor="middle">step D</text>
<rect x="530" y="60" width="100" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580.0" y="81.5" font-size="13" text-anchor="middle">intended</text>
<text x="580.0" y="98.5" font-size="13" text-anchor="middle">reader</text>
<line x1="110" y1="85" x2="150" y2="85" stroke="currentColor" stroke-width="1.3"/>
<polygon points="150,85 143.6,87.7 143.6,82.3" fill="currentColor"/>
<line x1="250" y1="85" x2="390" y2="85" stroke="currentColor" stroke-width="1.3"/>
<polygon points="390,85 383.6,87.7 383.6,82.3" fill="currentColor"/>
<line x1="490" y1="85" x2="530" y2="85" stroke="currentColor" stroke-width="1.3"/>
<polygon points="530,85 523.6,87.7 523.6,82.3" fill="currentColor"/>
<text x="320" y="106" font-size="13" text-anchor="middle">cryptogram C</text>
<text x="130" y="52" font-size="12" text-anchor="middle">message M</text>
<rect x="270" y="160" width="100" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="320.0" y="178.5" font-size="13" text-anchor="middle">key source</text>
<text x="320.0" y="195.5" font-size="13" text-anchor="middle">K</text>
<line x1="300" y1="160" x2="230" y2="110" stroke="currentColor" stroke-width="1.3"/>
<polygon points="230,110 236.8,111.5 233.7,116.0" fill="currentColor"/>
<line x1="340" y1="160" x2="410" y2="110" stroke="currentColor" stroke-width="1.3"/>
<polygon points="410,110 406.3,116.0 403.2,111.5" fill="currentColor"/>
<text x="320" y="226" font-size="12" text-anchor="middle">the key travels by a separate, safe route</text>
<rect x="270" y="6" width="100" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="29.0" font-size="13" text-anchor="middle">enemy</text>
<line x1="320" y1="85" x2="320" y2="44" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="320,44 322.7,50.4 317.3,50.4" fill="currentColor"/>
<text x="380" y="28" font-size="12" text-anchor="start">sees C, knows the system</text>
</svg>
<figcaption>Figure 15.3. Shannon's model of a secrecy system (after his 1949 paper). The enemy is assumed to see the cryptogram and to know the system; only the key is secret.</figcaption>
</figure>

!!! note "Life story: Claude Shannon"
    **Born:** 30 April 1916, Petoskey, Michigan; died 24 February 2001, Medford, Massachusetts · **Purpose:** to find the laws of communication; in the war, to judge the strength of secrecy systems for Bell Labs and the government · **Helped:** the switching-circuit thesis of 1937, the report of 1945, information theory (1948) and the paper on secrecy (1949); the bit as the unit of information · **Status:** Bell Labs from 1941 to 1956, then MIT; his two papers of 1948 and 1949 are still the base of both subjects

!!! note "Life story: \"A Mathematical Theory of Cryptography\" and \"Communication Theory of Secrecy Systems\""
    **Born:** a classified Bell Labs memorandum finished 1 September 1945; published October 1949 in the *Bell System Technical Journal* 28, pages 656 to 715 · **Purpose:** to give secrecy a mathematical definition and to say how much of a message a cipher can hide · **Helped:** the definition of perfect secrecy, the proof that the one-time pad has it, the unicity distance, the names confusion and diffusion · **Status:** the starting point of every later security definition; the open literature on cryptography after it stayed thin for twenty-five years, until the 1970s (chapters 16 and 17)


## 15.4 What the 1949 paper proved

*Level: intermediate.*

Shannon's paper has three parts, and a reader in 1949 who got through all three could take away four results. Here they are in the order a cryptographer would want them, with the mathematics kept to what the story needs. [Book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) proves the first two in full, and [the Mathematics book, chapter 17](../mathematics/17-Information-and-Entropy.md) builds the tools; this section tells what Shannon claimed and why it was new.

**Result one: perfect secrecy exists.** Call the message $M$, the key $K$ and the cryptogram $C$. Shannon defined a system as perfectly secret if seeing $C$ changes nothing about the odds on $M$:

$$\Pr[M = m \mid C = c] = \Pr[M = m] \quad\text{for every } m \text{ and } c.$$

Whatever the enemy believed before the interception, he believes the same after it. He then showed that Vernam's pad has this property, which Vernam and Mauborgne had claimed in the years after 1917 on the strength of tests and good sense ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)). Shannon turned a claim into a theorem.

**Result two: it costs one key bit per message bit.** In the same terms, a perfectly secret system must have at least as many equally likely keys as there are possible messages, $H(K) \ge H(M)$. A pad's key is as long as its message, and no cleverness can shorten it. This is why perfect secrecy stayed a tool of states and spies: the Soviets' diplomatic pads, SIGSALY's records, the Moscow-Washington hot line of 1963 (which, in the standard accounts, ran on one-time tapes). Venona was the proof of the other half. A pad that is used twice is no longer a pad.

**Result three: everything else is breakable in principle.** Take a cipher with a short key, say a simple substitution with its $26!$ keys. For a short ciphertext, many keys will give sensible-looking plaintexts. For a long one, only one will. The reason is that a language is redundant: not every string of letters is a sentence, so wrong keys give gibberish. Shannon measured the redundancy per letter as $D = \log_2 26 - H_L$, where $H_L$ is the number of bits a letter really carries once you use all the context. His later paper of 1951, "Prediction and Entropy of Printed English", found that people guess the next letter of English text so well that $H_L$ is somewhere around one bit, and a common textbook figure is 1.5. Then the number of letters at which a single key remains, the **unicity distance**, is

$$U \approx \frac{H(K)}{D}.$$

Take the Caesar shift: $H(K) = \log_2 26 = 4.70$ bits, $D = 4.70 - 1.5 = 3.2$ bits, so $U = 4.70 / 3.2 \approx 1.5$ letters. Two letters of ciphertext nearly fix the shift; the rest is checking, which is how every puzzle-solver has always done it. The program below extends the table to the machines of the last few chapters.

### Code it: how many letters does it take?

```python
# Shannon's unicity distance U = H(K) / D: how many letters of ciphertext pin down the key.
from math import log2, factorial

H_L = 1.5                          # bits per letter of English once all context is used (a common estimate)
D = log2(26) - H_L                 # redundancy per letter, about 3.2 bits

# The army Enigma key as counted in 1939: 3 rotors chosen from 5 in any order,
# 26^3 starting positions, and 10 plugboard cables.
rotor_orders = 5 * 4 * 3
starts = 26 ** 3
plugs = factorial(26) // (factorial(6) * factorial(10) * 2 ** 10)
enigma = rotor_orders * starts * plugs

systems = [
    ("Caesar shift", 26),
    ("Vigenere, 8-letter key", 26 ** 8),
    ("simple substitution", factorial(26)),
    ("Playfair", factorial(25)),
    ("army Enigma, 1939", enigma),
    ("DES", 2 ** 56),
    ("AES-128", 2 ** 128),
]
print(f"redundancy D = {D:.2f} bits per letter; Enigma keys = {enigma:,}")
print(f"{'system':26}{'key bits':>10}{'letters':>10}")
for name, keys in systems:
    bits = log2(keys)
    print(f"{name:26}{bits:10.1f}{bits / D:10.1f}")
```

Output:

```text
redundancy D = 3.20 bits per letter; Enigma keys = 158,962,555,217,826,360,000
system                      key bits   letters
Caesar shift                     4.7       1.5
Vigenere, 8-letter key          37.6      11.7
simple substitution             88.4      27.6
Playfair                        83.7      26.1
army Enigma, 1939               67.1      21.0
DES                             56.0      17.5
AES-128                        128.0      40.0
```

Read the last column as Shannon would. About 21 letters of German ciphertext determine the army Enigma key; about 18 letters of English determine a DES key; about 40 letters determine an AES-128 key. The information is there. That is not the same as being able to find the key, and that is the point of the table. Shannon's measure says when a cryptogram *has* a single answer. It says nothing about how much work finding the answer takes. Bletchley needed cribs, bombes and a great many people to do for Enigma what, in principle, 21 letters made possible, and the key space of AES-128 is beyond any machine that can be built ([book 1, chapter 7](../../book/07-AES.md)). Shannon saw the gap. He called the work needed to find the key the **work factor**, and he said plainly that his theory could not compute it.

**Result four: confusion and diffusion.** In his third part, "practical secrecy", Shannon asked how one might build a cipher whose work factor is large. His answer had two named ingredients. *Confusion* makes the relation between the key and the cryptogram so complicated that statistics of the cryptogram say nothing useful about the key. *Diffusion* spreads the influence of each message letter over many letters of the cryptogram, so that the redundancy of the language is smeared away. He proposed building a cipher as a product of simple steps, one that scatters and one that mixes, and to repeat them, an idea that Feistel and the DES designers took up thirty years later ([chapter 16](16-Feistel-Lucifer-and-DES.md); [book 1, chapter 6](../../book/06-Block-Ciphers.md) builds the result). He also observed that finding a key from a cryptogram is like solving a large set of simultaneous equations in many unknowns, and that a good cipher is one whose equations are as awkward as possible. That observation reappears in the algebraic attacks of the 2000s ([Cryptanalysis, chapter 7](../cryptanalysis/07-Algebraic-Integral-and-Structural-Attacks.md)).

### What the paper did not do

A fair reading of 1949 lists what is missing, because the gaps set the agenda of the next fifty years. There is no definition of security for a cipher with a short key that talks about computation: the idea that a cipher is secure if no *feasible* attack distinguishes it from random did not appear until Goldwasser, Micali, Yao and Blum in the early 1980s ([book 1, chapter 17](../../book/17-Defining-Security.md)). There is no treatment of keys that need not travel secretly, which is what Diffie and Hellman supplied in 1976 ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)). There is nothing about authentication, which Gustavus Simmons took up in 1984. And there is no practical cipher with a proof. The 1949 paper left the engineers of the Cold War with a measure of their ignorance and no help in closing it.

!!! note "Life story: the unicity distance"
    **Born:** 1945 (the classified report), published 1949 · **Purpose:** to say how much ciphertext it takes before only one key fits · **Helped:** explained why every short-key classical cipher is breakable given enough text, and why a short message can have several valid readings; it made clear that redundancy in the language is the enemy of a cipher; it is why compressing a message before encrypting it has been recommended ever since · **Status:** still taught; its limit is that it measures information, not work

## 15.5 From the Black Chamber to the NSA, and GCHQ

*Level: intermediate.*

The American organizations that came out of the war had a family tree, and Figure 15.4 draws it. Its oldest root is the Black Chamber of Herbert Yardley, a joint Army and State Department office that read other nations' diplomatic mail from 1919 until Secretary of State Henry Stimson closed it in 1929 ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)). The Army's Signal Intelligence Service, founded in 1930 under William Friedman, inherited the Chamber's files and carried on its work. By 1945 the Army's descendant was the Signal Security Agency at Arlington Hall, renamed the Army Security Agency in September 1945, the Navy's was OP-20-G, and in 1948 the new Air Force made a third, the Air Force Security Service. Three services, three agencies, three sets of habits.

<figure class="mars-fig">
<svg viewBox="0 0 640 355" width="640" role="img" aria-label="Lineage of the American and British signals agencies from 1919 to 1952, joined by the UKUSA agreement of 1946" fill="currentColor" font-size="14">
<text x="110" y="20" font-size="14" text-anchor="middle" font-weight="bold">United States</text>
<text x="530" y="20" font-size="14" text-anchor="middle" font-weight="bold">Britain</text>
<rect x="10" y="30" width="200" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110.0" y="53.0" font-size="13" text-anchor="middle">Black Chamber 1919-29</text>
<rect x="10" y="90" width="200" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110.0" y="111.5" font-size="13" text-anchor="middle">Army SIS 1930; Navy OP-20-G</text>
<text x="110.0" y="128.5" font-size="13" text-anchor="middle">(Friedman; Safford, Driscoll)</text>
<rect x="10" y="164" width="200" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110.0" y="185.5" font-size="13" text-anchor="middle">Army Security Agency 1945;</text>
<text x="110.0" y="202.5" font-size="13" text-anchor="middle">Navy group; Air Force SS 1948</text>
<rect x="10" y="238" width="200" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110.0" y="261.0" font-size="13" text-anchor="middle">AFSA 20 May 1949</text>
<rect x="10" y="298" width="200" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="110.0" y="316.5" font-size="13" text-anchor="middle" font-weight="bold">NSA 4 Nov 1952</text>
<text x="110.0" y="333.5" font-size="13" text-anchor="middle">(Fort Meade from 1957)</text>
<line x1="110" y1="66" x2="110" y2="90" stroke="currentColor" stroke-width="1.3"/>
<polygon points="110,90 107.3,83.6 112.7,83.6" fill="currentColor"/>
<line x1="110" y1="140" x2="110" y2="164" stroke="currentColor" stroke-width="1.3"/>
<polygon points="110,164 107.3,157.6 112.7,157.6" fill="currentColor"/>
<line x1="110" y1="214" x2="110" y2="238" stroke="currentColor" stroke-width="1.3"/>
<polygon points="110,238 107.3,231.6 112.7,231.6" fill="currentColor"/>
<line x1="110" y1="274" x2="110" y2="298" stroke="currentColor" stroke-width="1.3"/>
<polygon points="110,298 107.3,291.6 112.7,291.6" fill="currentColor"/>
<rect x="430" y="30" width="200" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="530.0" y="53.0" font-size="13" text-anchor="middle">Room 40, MI1(b) 1914-19</text>
<rect x="430" y="90" width="200" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="530.0" y="111.5" font-size="13" text-anchor="middle">GC&amp;CS 1919; Bletchley Park</text>
<text x="530.0" y="128.5" font-size="13" text-anchor="middle">1939-45</text>
<rect x="430" y="164" width="200" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="530.0" y="185.5" font-size="13" text-anchor="middle" font-weight="bold">GCHQ, named 1946;</text>
<text x="530.0" y="202.5" font-size="13" text-anchor="middle">Eastcote, then Cheltenham</text>
<line x1="530" y1="66" x2="530" y2="90" stroke="currentColor" stroke-width="1.3"/>
<polygon points="530,90 527.3,83.6 532.7,83.6" fill="currentColor"/>
<line x1="530" y1="140" x2="530" y2="164" stroke="currentColor" stroke-width="1.3"/>
<polygon points="530,164 527.3,157.6 532.7,157.6" fill="currentColor"/>
<rect x="250" y="150" width="140" height="80" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="178.0" font-size="13" text-anchor="middle" font-weight="bold">UKUSA</text>
<text x="320.0" y="195.0" font-size="13" text-anchor="middle">5 March 1946</text>
<text x="320.0" y="212.0" font-size="13" text-anchor="middle">text released 2010</text>
<line x1="210" y1="190" x2="250" y2="190" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="250,190 243.6,192.7 243.6,187.3" fill="currentColor"/>
<line x1="430" y1="190" x2="390" y2="190" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="390,190 396.4,187.3 396.4,192.7" fill="currentColor"/>
<rect x="250" y="262" width="140" height="80" rx="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="320.0" y="290.0" font-size="13" text-anchor="middle">later partners:</text>
<text x="320.0" y="307.0" font-size="13" text-anchor="middle">Canada, Australia,</text>
<text x="320.0" y="324.0" font-size="13" text-anchor="middle">New Zealand</text>
<line x1="320" y1="230" x2="320" y2="262" stroke="currentColor" stroke-width="1.3" stroke-dasharray="5 4"/>
<polygon points="320,262 317.3,255.6 322.7,255.6" fill="currentColor"/>
</svg>
<figcaption>Figure 15.4. Two families of agencies and the agreement between them. The American line runs from the Black Chamber through the Signal Intelligence Service to AFSA and the NSA; the British line from GC&amp;CS to GCHQ.</figcaption>
</figure>

The first attempt to bring them together was the **Armed Forces Security Agency**, created by Secretary of Defense Louis Johnson's directive of 20 May 1949 under the Joint Chiefs of Staff. Its first director was Rear Admiral Earl Stone. It had a title and not much power: the three services kept their own organizations and their own budgets, and AFSA coordinated more than it commanded. The war in Korea, which began on 25 June 1950, was its test. The standard histories say that AFSA, like most of the Western intelligence community, had put almost all its effort on the Soviet Union and had little reading of North Korean traffic when the invasion came, and that the failure was taken to show that the arrangement was not working. A committee chaired by the New York lawyer Herbert Brownell, appointed in late 1951, reported in June 1952 in favor of a single agency under the Secretary of Defense with real authority over the three services. President Truman signed a short Top Secret memorandum, "Communications Intelligence Activities", on 24 October 1952. The **National Security Agency** came into being, by the agency's own count, on 4 November 1952. Its first director was Lieutenant General Ralph Canine, an Army officer, who had run AFSA since 1951. From 1954 to 1957 the agency moved from its Washington-area buildings to a new campus at Fort Meade, Maryland, where it still is.

Two features of the new agency shaped everything in this chapter and the next two. The first was that it had two jobs. It was to break foreign communications (signals intelligence) and also to design and supply the ciphers and keys for the US government (communications security). One organization that makes the codes of one side and breaks the codes of the other has an obvious conflict of interest when it advises the public on codes, and that conflict is the story of DES in 1975 and of the "crypto wars" of the 1990s. The second feature was secrecy by law. Its existence was not acknowledged by the government for years; its employees joked that NSA stood for "No Such Agency" or "Never Say Anything". A law of 1959 (Public Law 86-36) allowed it to withhold even the names, titles, salaries and number of its employees. The Invention Secrecy Act of 1951 let the government put secrecy orders on patents for cipher devices, and it did so; Friedman himself, whose cipher patents had been held under such orders, was awarded \$100,000 by Congress in 1956 for them, by the usual account. William Friedman served as the NSA's special assistant to the director from its founding until 1955; he died in 1969. His wife and partner, Elizebeth Friedman, is in [chapters 11 and 14](14-The-Rest-of-the-War.md).

!!! note "Life story: the National Security Agency (NSA)"
    **Born:** 4 November 1952, by a Top Secret memorandum of President Truman dated 24 October 1952; headquarters at Fort Meade from the mid-1950s · **Purpose:** to read foreign communications and to protect those of the United States government, under the Secretary of Defense · **Helped:** the American share of the UKUSA partnership; a family of cipher machines and, from the 1950s, computers built for cryptanalysis; the public standard that became DES (chapter 16), where its role is still argued · **Status:** active; its public acknowledgment came gradually after the 1960s

### GCHQ and the treaty

In Britain the Government Code and Cypher School, which had run Bletchley Park, was renamed Government Communications Headquarters (GCHQ) in 1946. It moved out of Bletchley that year to Eastcote in west London and, between 1951 and 1954, to Cheltenham in Gloucestershire, where it still is. Its wartime head, Sir Edward Travis, served until 1952, and Sir Eric Jones followed him. The Bletchley people who stayed on went into peacetime work in the same field. Hugh Alexander, the chess champion who had led Hut 8, headed GCHQ's cryptanalysis from about 1949 until 1971 and died in 1974. Brigadier John Tiltman, the veteran of the First World War and of the Japanese and Lorenz breaks, went to the NSA in 1954 and worked there until 1964. Joan Clarke, who had worked beside Turing, stayed at GCHQ until 1977 (§15.9). In 1969 GCHQ's communications-security arm took the name Communications-Electronics Security Group (CESG), and CESG is the arm in which James Ellis, Clifford Cocks and Malcolm Williamson found public-key ideas a few years later ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)). The agency had no basis in statute until the Intelligence Services Act of 1994.

The link between the two countries was written down on 5 March 1946: the **UKUSA Agreement**, a treaty on signals intelligence, built on the wartime BRUSA agreement of May 1943. In outline, the two countries agreed to share raw intercepts, techniques and cryptanalytic results, to divide the world between them for the collecting, and to keep the arrangement itself secret. Canada, Australia and New Zealand joined as junior partners between the late 1940s and the mid-1950s (sources differ on the exact dates: Canada is usually dated 1948, Australia and New Zealand 1956), each through an agency of its own: Canada's Communications Branch of the National Research Council (founded 1946), Australia's Defence Signals Bureau (1947), and New Zealand's Government Communications Security Bureau (formally 1977). These five are what later came to be called the Five Eyes. Other friendly countries joined narrower arrangements as "third parties". The agreement's text was kept secret for sixty-four years. In June 2010 the NSA and the British National Archives released it, with its annexes. [Chapter 14](14-The-Rest-of-the-War.md) tells about Venona, which ran inside these agencies from 1943 until 1980 and was kept from the public until 1995.

!!! note "Life story: the UKUSA Agreement"
    **Born:** 5 March 1946, building on the BRUSA agreement of May 1943; text published 2010 · **Purpose:** to join the American and British signals-intelligence services so that each could draw on the other's collection and codebreaking · **Helped:** the long partnership of the English-speaking states in intercepting and reading the traffic of the Cold War; later Canada, Australia and New Zealand · **Status:** still the basis of the Five Eyes partnership

### The rest of the world's agencies

The two English-speaking agencies were not alone, and the sources for the others are thinner. The Soviet Union divided its cipher and signals work between the KGB, whose Eighth Chief Directorate was responsible for communications security and whose Sixteenth Directorate later did signals intelligence, and the military intelligence service, the GRU; the details come from defectors and later memoirs and are incomplete. France kept its own *Service du Chiffre*. West Germany built a cipher authority in the 1950s, the *Zentralstelle für das Chiffrierwesen*, linked to its foreign intelligence service, the BND; it became the Federal Office for Information Security (BSI) in 1991 (this is how the standard accounts give it, and I am less sure of the early details than of the rest). East Germany's cipher service, the *Zentrales Chiffrierorgan*, worked beside the Stasi (the name and the exact organization changed over the years), and §15.7 returns to it. China built a signals intelligence department inside the People's Liberation Army's general staff in the 1950s, about which few reliable details are public. Sweden's *Försvarets radioanstalt*, founded in 1942, grew from the cipher bureau that had read the German Geheimschreiber teleprinter in 1940 and 1941. The picture is the same in every case. After the war, the states that could afford it made a permanent, secret organization to read other people's messages and to protect their own, and the public learned the outline decades later.

### In the real world

The best sources are the NSA's own histories, above all Thomas R. Johnson's four-volume *American Cryptology during the Cold War, 1945 to 1989*, which was declassified in the 1990s and 2000s with large redactions, and James Bamford's *The Puzzle Palace* (1982), which was the first book-length account from outside and which the agency disliked. For GCHQ the sources are weaker: the official history volumes of British intelligence in the war cover Bletchley, but the postwar story has been told mostly by memoir and by the National Archives' later releases. The UKUSA text is a primary source, and it is the best one in this section. The claims about what the two agencies did to each other's citizens or allies in the Cold War belong to later controversies and are not part of this chapter.


## 15.6 Hagelin and Crypto AG: a Swiss firm with a secret owner

*Level: intermediate.*

Most of the world's governments could not build a good cipher machine in 1950. They had no Bletchley and no Bell Labs, and the countries that did have them kept their best equipment for themselves. A smaller state, a newly independent one, an army or a foreign ministry without a research laboratory, had a simple problem: whom to buy from. For decades one of the answers was a Swiss company near Zug. It sold to well over a hundred countries. It was a neutral firm in a neutral country, and from 1970 it was secretly owned by the American CIA and, until the early 1990s, the West German BND. That, at least, is what the reports of 2020 say, and this section tells it with the evidence marked.

### The man and the machines

Boris Hagelin was born in 1892 in the Caucasus, the son of a Swedish engineer who worked for the Nobel family's oil company in Baku. The family left Russia after the revolution. Boris became an engineer and joined a small Stockholm firm, AB Cryptograph, founded in 1916 by the inventor Arvid Damm, in which his father had invested. He took over its management in the 1920s and built it into a maker of small, portable mechanical cipher machines. The one that made his name was a pin-wheel design, the C-38, a version of which a US Army that needed a rugged machine for the front line adopted as the M-209. After the German invasion of Denmark and Norway in April 1940, Hagelin went to the United States with a prototype, and during the war more than 140,000 M-209s were built there under license. By most accounts, he made a fortune from it. The M-209 was solvable by a good opponent with enough traffic, and it was used as a field machine whose messages had to be safe for hours, not years ([Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md) says what that meant).

After the war Hagelin moved his business to Switzerland, a neutral state with a tradition of banking secrecy, and in 1952 he founded Crypto AG near Zug. His customers were governments that did not want American or Soviet equipment. He was also an old friend of William Friedman, who by then worked at the NSA. By the accounts that surfaced after 2020, the two men reached an understanding in the 1950s. It is described in most places as a "gentleman's agreement" in which Hagelin would tell the Americans which machines went to which customers and, in the accounts that go furthest, would sell weaker variants to customers they named. The dates differ between sources (1951 in some, 1957 in others), and what he was told or asked to do is disputed. What the sources agree on is that the friendship was the start of a relationship between a cipher maker and the agency that read the cipher traffic of the buyers.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="Timeline of Hagelin and Crypto AG from 1916 to 2020" fill="currentColor" font-size="14">
<line x1="102" y1="8" x2="102" y2="322" stroke="currentColor" stroke-width="1.6"/>
<text x="88" y="27" font-size="14" text-anchor="end" font-weight="bold">1916</text>
<circle cx="102" cy="22" r="3.5" fill="currentColor"/>
<text x="118" y="27" font-size="14" text-anchor="start">AB Cryptograph founded in Stockholm (Damm)</text>
<text x="88" y="53" font-size="14" text-anchor="end" font-weight="bold">1940-44</text>
<circle cx="102" cy="48" r="3.5" fill="currentColor"/>
<text x="118" y="53" font-size="14" text-anchor="start">Hagelin in the US; the M-209 is built for the Army</text>
<text x="88" y="79" font-size="14" text-anchor="end" font-weight="bold">about 1948</text>
<circle cx="102" cy="74" r="3.5" fill="currentColor"/>
<text x="118" y="79" font-size="14" text-anchor="start">Hagelin moves his base to Switzerland</text>
<text x="88" y="105" font-size="14" text-anchor="end" font-weight="bold">1952</text>
<circle cx="102" cy="100" r="3.5" fill="currentColor"/>
<text x="118" y="105" font-size="14" text-anchor="start">Crypto AG founded near Zug</text>
<text x="88" y="131" font-size="14" text-anchor="end" font-weight="bold">1950s</text>
<circle cx="102" cy="126" r="3.5" fill="currentColor"/>
<text x="118" y="131" font-size="14" text-anchor="start">Understandings with Friedman and the NSA (dates differ)</text>
<text x="88" y="157" font-size="14" text-anchor="end" font-weight="bold">1970</text>
<circle cx="102" cy="152" r="4.5" fill="currentColor"/>
<text x="118" y="157" font-size="14" text-anchor="start" font-weight="bold">The CIA and the BND buy the company in secret</text>
<text x="88" y="183" font-size="14" text-anchor="end" font-weight="bold">1986</text>
<circle cx="102" cy="178" r="3.5" fill="currentColor"/>
<text x="118" y="183" font-size="14" text-anchor="start">Libyan traffic cited in the Berlin disco bombing case</text>
<text x="88" y="209" font-size="14" text-anchor="end" font-weight="bold">1992</text>
<circle cx="102" cy="204" r="3.5" fill="currentColor"/>
<text x="118" y="209" font-size="14" text-anchor="start">Salesman Hans Bühler arrested in Iran</text>
<text x="88" y="235" font-size="14" text-anchor="end" font-weight="bold">1993</text>
<circle cx="102" cy="230" r="3.5" fill="currentColor"/>
<text x="118" y="235" font-size="14" text-anchor="start">The BND sells its share to the CIA</text>
<text x="88" y="261" font-size="14" text-anchor="end" font-weight="bold">1995</text>
<circle cx="102" cy="256" r="3.5" fill="currentColor"/>
<text x="118" y="261" font-size="14" text-anchor="start">The Baltimore Sun series No Such Agency</text>
<text x="88" y="287" font-size="14" text-anchor="end" font-weight="bold">2018</text>
<circle cx="102" cy="282" r="3.5" fill="currentColor"/>
<text x="118" y="287" font-size="14" text-anchor="start">The CIA sells; the company is split and wound up</text>
<text x="88" y="313" font-size="14" text-anchor="end" font-weight="bold">2020</text>
<circle cx="102" cy="308" r="4.5" fill="currentColor"/>
<text x="118" y="313" font-size="14" text-anchor="start" font-weight="bold">Washington Post, ZDF and SRF publish the CIA history</text>
</svg>
<figcaption>Figure 15.5. Crypto AG from a Stockholm workshop to the 2020 reports. The central fact, secret ownership from 1970, was hidden for fifty years.</figcaption>
</figure>

### 1970 and "Rubicon"

In 1970, by the reports, the CIA and the BND bought Crypto AG from the Hagelin family through a front in Liechtenstein. Boris Hagelin was then 78. The operation went by the code name *Thesaurus*, later *Rubicon* (in German *Rubikon*). I give those names as they are reported. The CIA and BND, in the reports, had a say in the design of the machines: they worked with the company's staff and with cryptomathematicians from the NSA, one of whom the *Washington Post* names as Nora Mackebee, and they arranged that the machines they sold to countries on a target list could be read by the two agencies. When the machines changed from mechanical to electronic in the 1970s, the algorithms inside could be made to look sound to the customer and be readable to the owners. What the weaknesses were, and which models carried them, is not public. Allies and certain others, the reports say, got machines that were not weakened. By the reports, the profits of the firm went to its two owners.

The first leaks were old. In March 1992 the firm's salesman Hans Bühler was arrested in Tehran on suspicion that the machines he sold were compromised. He was held for nine months and released after the company paid bail of one million dollars. By his account he was then dismissed and asked to repay it, and in 1994 a book about his case, by the journalist Res Strehle, appeared in German and accused the company. Journalists at the *Baltimore Sun*, Scott Shane and Tom Bowman, wrote in December 1995 about the NSA's relationship with Hagelin and Crypto AG in a series called "No Such Agency". James Bamford's *The Puzzle Palace* (1982) had already described the understanding between Friedman and Hagelin. The BND, according to the reports of 2020, sold its share to the CIA in 1993 (one source says 1994), because it feared exposure. The CIA kept the firm until 2018, when it sold it and the company was broken up and wound up.

On 11 February 2020 the *Washington Post*, the German broadcaster ZDF and the Swiss broadcaster SRF published a joint investigation, "The Intelligence Coup of the Century", based on what they said was a classified CIA history of the operation and a German one. They reported that the firm's customers had included Iran, Libya, military governments in Latin America, India, Pakistan and the Vatican, that its machines had given the two agencies access to the traffic of dozens of countries, and that American intelligence used the product from the 1970s into the 2010s. One of the reports' episodes falls in 1986, after a bomb killed three people at a Berlin discotheque in April: President Reagan cited intercepted messages from Libya's embassy in East Berlin in public, and the reports of 2020 say those messages had been read through Crypto AG machines and that the disclosure alarmed the operation's managers. Swiss authorities opened inquiries within days, and press accounts of their reports later in 2020 said that Swiss intelligence had known of the American connection. I have not read those reports myself.

### Break it: a machine that looks fine and is not

No published source says exactly how the machines were weakened. What can be shown is how a weakness *can* hide. The toy below has two keystream generators. Both claim a long key. The honest one uses all 256 bits of a hash of the customer's key. The rigged one throws away all but 20 bits of it. A customer who tests the output, by counting bits, sees nothing wrong, because both keystreams look random. A maker who knows the structure can search all $2^{20}$ seeds, about a million, against a guessed opening such as a ministry's usual start of message.

```python
# A toy of a "rigged" machine: it claims a 128-bit key, but the real seed is only 20 bits.
import hashlib

def keystream(seed, n):
    # counter-mode SHA-256: a fine keystream when the seed really is long and secret
    out = b""
    counter = 0
    while len(out) < n:
        out += hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        counter += 1
    return out[:n]

def honest_seed(key):
    return hashlib.sha256(key).digest()                          # all 256 bits count

def rigged_seed(key):
    short = int.from_bytes(hashlib.sha256(key).digest()[:3], "big") & 0xFFFFF
    return short.to_bytes(3, "big")                               # only 20 bits survive

def xor(a, b):
    return bytes(x ^ y for x, y in zip(a, b))

customer_key = b"embassy key, 128 bits of care"
message = b"TO MINISTRY: NEGOTIATING POSITION UNCHANGED. HEADER FOLLOWS."

for name, seed_of in (("honest", honest_seed), ("rigged", rigged_seed)):
    stream = keystream(seed_of(customer_key), 20000)
    ones = sum(bin(b).count("1") for b in stream) / (8 * len(stream))
    print(f"{name}: share of one-bits in 20,000 keystream bytes = {ones:.4f}")

cipher = xor(message, keystream(rigged_seed(customer_key), len(message)))

# The maker knows the design and that messages begin "TO MINISTRY". Try every 20-bit seed.
crib = b"TO MINISTRY"
for guess in range(2 ** 20):
    seed = guess.to_bytes(3, "big")
    if xor(cipher[:len(crib)], keystream(seed, len(crib))) == crib:
        print(f"seed found after {guess + 1:,} tries")
        print(xor(cipher, keystream(seed, len(cipher))).decode())
        break
```

Output:

```text
honest: share of one-bits in 20,000 keystream bytes = 0.5006
rigged: share of one-bits in 20,000 keystream bytes = 0.5010
seed found after 627,996 tries
TO MINISTRY: NEGOTIATING POSITION UNCHANGED. HEADER FOLLOWS.
```

The two shares are both near one half, and no test that looks only at the output tells them apart. The search took about a second on a laptop. This is a toy, and it is not a claim about what Crypto AG's engineers did. The point is the position of the customer. Kerckhoffs's second rule ([chapter 10](10-The-Telegraph.md)) says that a cipher must be safe if the enemy knows everything about it except the key, and a cipher that its buyer is not allowed to see cannot be checked against it. The buyer has to trust the seller. A design that is public, and that the buyer's own experts can read and attack, takes the seller out of the question. That is the argument for open standards, and for the public competitions that NIST ran for AES and later standards ([chapter 18](18-The-Internet-Era.md)).

!!! note "Life story: Boris Hagelin"
    **Born:** 2 July 1892 in the Caucasus; died 7 September 1983, Zug, Switzerland (dates from standard biographies) · **Purpose:** to build small, reliable cipher machines that armies and governments could afford · **Helped:** the C-38 and its American form, the M-209 (more than 140,000 built); the machines of Crypto AG; friendships with Friedman and others in the agencies · **Status:** his firm was sold in 1970 and, from the reports of 2020, was found to have been secretly owned by two intelligence agencies for the rest of its life

!!! note "Life story: Crypto AG"
    **Born:** 1952, near Zug, from Hagelin's earlier firms (AB Cryptograph of 1916) · **Purpose:** to sell cipher machines to governments that wanted neither American nor Soviet equipment · **Helped:** secured communications for customers in well over a hundred countries, and, from 1970, the CIA and the BND, who owned it in secret and could read the traffic of customers on their lists · **Retired:** 2018, when the CIA sold it, and the company was split and wound up · **Replaced by:** the firms that took over parts of its business

### In the real world

The evidence for the second half of this story is a classified history that the *Post* and ZDF say they obtained, interviews with former employees and officials, and documents that were not published whole. The CIA has not, to my knowledge, confirmed the history in public; the BND's history exists only through the broadcasters' reports. Some parts are older and independent: Bühler's arrest in Iran, which is in the press of 1992 and 1993; the *Baltimore Sun* series of 1995; the earlier accounts in Bamford. Some claims rest on one source: the specific customer lists, the precise dates of the 1950s understandings, the NSA's role in algorithm design, the role of any one person such as Nora Mackebee. Some are disputed or unclear: what the Hagelin family knew of the buyers in 1970, and what Swiss intelligence knew and when. What is certain is that the firm was real, large and Swiss, that it sold in over a hundred countries, and that the Swiss government took the reports seriously enough to open inquiries. A caution that the sources themselves give: the CIA history speaks in the voice of the people who ran the operation, and it would be in their interest to call it a coup.

## 15.7 The Soviet side: Fialka and the East German machines

*Level: intermediate.*

On the other side of the line, the Soviet Union and its allies had the opposite problem: they had every reason to build everything themselves. After the war the Soviet cipher services protected the highest messages with one-time pads on paper and the rest of their traffic with machines. The machine that came to stand for the Warsaw Pact is the **Fialka**, "violet", designated M-125, in service from about 1956. It was an electromechanical rotor machine in the family of Enigma: a keyboard, a stack of wired rotors that turn after each keystroke, a printer that writes the result on paper tape. It had ten rotors, each with 30 contacts, enough for the Cyrillic letters in use and for control symbols (sources differ on how the thirty were assigned), and pins on the rotors that controlled how they stepped. The usual public account, which comes from the Crypto Museum, says that its design drew on Enigma, the Swiss NEMA and the American KL-7. A later model, the M-125-3M, followed in 1965, and the machine remained in service until the early 1990s.

Every Warsaw Pact country got the same base machine, each with its own rotor wiring: there were Polish, East German, Hungarian and Czechoslovak versions (Figure 15.6). The usual explanation is that this prevented one satellite from reading another's secrets without Moscow's help, and that Moscow could read them all. I have not seen a document that says so. A consequence is that for decades the Fialka was a secret even to the West's collectors. Almost nothing about it was public until about 2005; after the end of the Warsaw Pact in 1989 to 1991 the machines came onto the market and were studied.

<figure class="mars-fig">
<svg viewBox="0 0 640 272" width="640" role="img" aria-label="Family tree of the Fialka: one Soviet design, with national versions for Poland, East Germany, Hungary and Czechoslovakia" fill="currentColor" font-size="14">
<rect x="190" y="10" width="260" height="66" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="31.0" font-size="13" text-anchor="middle" font-weight="bold">M-125 Fialka ("violet")</text>
<text x="320.0" y="48.0" font-size="13" text-anchor="middle">Soviet Union, about 1956</text>
<text x="320.0" y="65.0" font-size="13" text-anchor="middle">10 rotors, 30 contacts each</text>
<rect x="10" y="150" width="140" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80.0" y="176.5" font-size="13" text-anchor="middle">Poland</text>
<text x="80.0" y="193.5" font-size="13" text-anchor="middle">own rotor wiring</text>
<line x1="320" y1="76" x2="80" y2="150" stroke="currentColor" stroke-width="1.3"/>
<polygon points="80,150 85.4,145.5 87.0,150.7" fill="currentColor"/>
<rect x="170" y="150" width="140" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="240.0" y="176.5" font-size="13" text-anchor="middle">East Germany</text>
<text x="240.0" y="193.5" font-size="13" text-anchor="middle">own rotor wiring</text>
<line x1="320" y1="76" x2="240" y2="150" stroke="currentColor" stroke-width="1.3"/>
<polygon points="240,150 242.9,143.6 246.6,147.6" fill="currentColor"/>
<rect x="330" y="150" width="140" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="400.0" y="176.5" font-size="13" text-anchor="middle">Hungary</text>
<text x="400.0" y="193.5" font-size="13" text-anchor="middle">own rotor wiring</text>
<line x1="320" y1="76" x2="400" y2="150" stroke="currentColor" stroke-width="1.3"/>
<polygon points="400,150 393.4,147.6 397.1,143.6" fill="currentColor"/>
<rect x="490" y="150" width="140" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="560.0" y="176.5" font-size="13" text-anchor="middle">Czechoslovakia</text>
<text x="560.0" y="193.5" font-size="13" text-anchor="middle">own rotor wiring</text>
<line x1="320" y1="76" x2="560" y2="150" stroke="currentColor" stroke-width="1.3"/>
<polygon points="560,150 553.0,150.7 554.6,145.5" fill="currentColor"/>
<text x="320" y="236" font-size="13" text-anchor="middle">same machine, different rotor wirings</text>
<text x="320" y="256" font-size="12" text-anchor="middle">M-125-3M followed in 1965; in service until the early 1990s</text>
</svg>
<figcaption>Figure 15.6. The Fialka family. A common design with national rotor wirings meant that a Warsaw Pact partner could not read another partner's traffic without its wirings.</figcaption>
</figure>

### Try it: counting a Fialka-like key

How big was the key space of a machine with ten rotors? Suppose, as an approximation, that the ten rotors can be placed in any order and started at any of their 30 positions. The count is a floor, because the pins add more. The program compares it with the army Enigma of §15.4.

```python
# Counting a Fialka-like key: ten rotors of 30 contacts, any order, any start.
from math import factorial, log2

orders = factorial(10)
starts = 30 ** 10
total = orders * starts
print(f"rotor orders {orders:,}; starting positions {starts:,}")
print(f"together {total:,} = 2^{log2(total):.1f}")

enigma = 60 * 26 ** 3 * (factorial(26) // (factorial(6) * factorial(10) * 2 ** 10))
print(f"army Enigma, 1939: 2^{log2(enigma):.1f}")
```

Output:

```text
rotor orders 3,628,800; starting positions 590,490,000,000,000
together 2,142,770,112,000,000,000,000 = 2^70.9
army Enigma, 1939: 2^67.1
```

By this count the Fialka has about 13 times as many keys as the army Enigma: $2^{70.9}$ against $2^{67.1}$. It is not a large difference, and the lesson of the Enigma story ([chapter 13](13-Bletchley-Park.md)) is that the size of the key space was never the weak point. Weaknesses in machines like these come from the structure: how regularly the rotors step, how the wiring is arranged, and the habits of the operators. How well the West read the Fialka in service, no public source says. Methods that climb on the structure instead of searching keys in order have broken Enigma messages on ordinary computers ([Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md) covers the wartime theory), but I could not find a published break of the full Fialka in its real use, and I do not claim one.

### East Germany and the T-310

East Germany's cipher service developed its own machines, among them the **T-310**, an online teleprinter encryptor that went into service in the 1970s and carried the highest-level traffic of the party, the state, the Stasi and the army, by the accounts I know. It had no rotors. It was electronic, and the key was produced by an electronic circuit. After 1990 the machines and their documents fell into German hands, and the algorithm has been studied in public by researchers in the 2000s and 2010s. I do not describe it here, because what I know of its structure is from a few papers I cannot check against the original design documents. What is sure is the setting: a state with a very large security apparatus that made its own ciphers, and a Cold War in which every state of this kind tried to avoid buying a machine from anyone else.

!!! note "Life story: the Fialka (M-125)"
    **Born:** about 1956, Soviet Union · **Purpose:** to protect the military and diplomatic messages of the USSR and the Warsaw Pact with a rotor machine larger and less regular than Enigma · **Helped:** common practice in the Pact, with one design and national rotor wirings for Poland, East Germany, Hungary and Czechoslovakia · **Retired:** in service until the early 1990s · **Replaced by:** later electronic equipment

!!! note "Life story: the T-310"
    **Born:** 1970s, East Germany (the cipher service that worked with the Stasi) · **Purpose:** to encrypt teleprinter lines of the state, party and security services · **Helped:** secured East German government traffic; its algorithm became known to outsiders only after 1990 · **Status:** out of service after 1990; the machines and documents fell into German hands

### In the real world

Sources on the Soviet side are poor, and they are poor for the same reason: the Soviet Union and its allies classified everything and published nothing. The main public sources are the Crypto Museum's pages, the catalog entries of museums that hold Fialka machines (the Science Museum Group among them), and a few papers on the T-310. Dates for Fialka (1956, 1965, the early 1990s) are from those, and any one of them could move by a year. Defectors' accounts, the Mitrokhin Archive and the Venona material cover the pad system and the agents' side much better than the machines. The question that most readers will ask, whether Western agencies could read Fialka traffic, is not answered in any source I know.


## 15.8 From rotors to shift registers, and the people who lost the keys

*Level: intermediate.*

A rotor machine is a heavy, slow, mechanical thing, and by the early 1950s the armed services wanted to send teleprinter traffic, which runs at a steady rate and does not wait for an operator. They wanted a cipher that ran on the line itself: characters went in clear at one end and came out enciphered at the other, with no person in between. That is an electronic job. The NSA's answer, from the middle 1950s, was a family of electronic encryptors. The best known of the early ones was the **KW-26**, code-named ROMULUS, an on-line teleprinter encryptor in service from the late 1950s that took its daily key from a punched card and was used by the US and its allies for a quarter century. For messages typed offline the services had machines in the older style, among them the eight-rotor **KL-7** (ADONIS was the name of its high-level key procedure) of 1952, used in NATO as well as in the US forces. The newer equipment of the 1960s included the **KW-7** (ORESTES), a fleet teleprinter encryptor, and the receiver KWR-37 for the Navy's broadcasts. The years are approximate; they come from the Crypto Museum's pages and the NSA's museum accounts.

What the new machines used instead of rotors was a **shift register**: a row of memory cells, one bit each, that shifts along on every clock tick, with the new bit at one end computed from the others by exclusive-OR. A shift register is cheap in transistors, it is as fast as the clock, and its output is a stream of bits with a long period and good statistics. The mathematics that makes it attractive came partly out of the open world. Solomon Golomb, who worked on the problem from the 1950s and gathered the results in *Shift Register Sequences* (1967), gave three tests for a good-looking bit stream: it should have about as many ones as zeros, about half its runs of equal bits should be of length one, a quarter of length two and so on, and the stream should correlate with a shifted copy of itself in only one pattern. A maximal-length register of $n$ cells passes all three and repeats only after $2^n - 1$ steps.

### Code it: a five-cell register

```python
# A shift register, the heart of the electronic ciphers: 5 cells, feedback from cells 5 and 3.
def lfsr(state, taps, n):
    out = []
    for _ in range(n):
        out.append(state[-1])                    # the last cell is the output bit
        fb = 0
        for t in taps:
            fb ^= state[t - 1]                   # XOR of the tapped cells
        state = [fb] + state[:-1]                # shift right, feedback enters on the left
    return out

taps = (5, 3)
bits = lfsr([1, 0, 0, 0, 0], taps, 62)
print("62 output bits:", "".join(map(str, bits)))
print("period 31:", bits[:31] == bits[31:], "  ones in a period:", sum(bits[:31]), " zeros:", 31 - sum(bits[:31]))

# Golomb's run property: runs of equal bits, counted round the cycle.
cycle = bits[:31]
start = next(i for i in range(31) if cycle[i] != cycle[i - 1])     # begin at a change
rolled = cycle[start:] + cycle[:start]
runs, length = {}, 1
for a, b in zip(rolled, rolled[1:] + rolled[:1]):
    if a == b:
        length += 1
    else:
        runs[length] = runs.get(length, 0) + 1
        length = 1
print("runs by length:", dict(sorted(runs.items())))

# The weakness: five output bits ARE the register, so the rest of the stream follows.
state = bits[:5][::-1]                           # the first output is the last cell, and so on back
predicted = lfsr(state, taps, 62)
print("whole stream rebuilt from its first 5 bits:", predicted == bits)
```

Output:

```text
62 output bits: 00001001011001111100011011101010000100101100111110001101110101
period 31: True   ones in a period: 16  zeros: 15
runs by length: {1: 8, 2: 4, 3: 2, 4: 1, 5: 1}
whole stream rebuilt from its first 5 bits: True
```

The first three lines are Golomb's tests passing: the period is $2^5 - 1 = 31$, there are 16 ones against 15 zeros, and the runs halve in number as they double in length. The last line is the problem. The register is linear, so the output is not a cipher by itself. An attacker who knows the five-cell design reads the state from five output bits and has everything that follows. If the attacker does not know the feedback taps, $2n$ bits are enough: in 1968 and 1969 Elwyn Berlekamp and James Massey, working on error-correcting codes and not on ciphers, published a fast method for finding the shortest register that produces a given sequence ([Cryptanalysis, chapter 8](../cryptanalysis/08-Attacks-on-Stream-Ciphers.md) teaches it). A real encryptor therefore combines several registers through a nonlinear function, with irregular clocking, and a design has to be analyzed against the Berlekamp-Massey attack and its descendants ([book 1, chapter 5](../../book/05-Stream-Ciphers.md) says how stream ciphers are built from these parts). What the sources show about the NSA's equipment is its existence and its use, not its internals; those were secret.

!!! note "Life story: the KW-26 (ROMULUS)"
    **Born:** designed by the NSA in the mid-1950s; in service from the late 1950s · **Purpose:** to encrypt teleprinter lines automatically, bit by bit, so that no operator saw the plain text · **Helped:** secured US and allied military and diplomatic teleprinter links for about a quarter century; its card-keyed design was copied in spirit by later devices · **Retired:** the 1980s · **Replaced by:** later electronic encryptors (dates from museum and agency sources)

### The hot line and the one-time tape

The most important wire of the Cold War was a teleprinter circuit. After the Cuban missile crisis of October 1962, in which messages between Washington and Moscow took hours, the two governments agreed on 20 June 1963 to set up a direct link, and it began to work on 30 August. The "hot line" was never a telephone. It was a teleprinter circuit through Europe, and the standard accounts of it say that it was protected by one-time tapes, each side making its own and delivering them by courier. That makes it the heir of Vernam and Mauborgne: the plainest, oldest cipher was kept for the one line on which it counted most. In the same years, and for the same reason, many services began to send one-time-pad messages to agents abroad by shortwave radio, in broadcasts of groups of numbers read by a voice, which listeners called numbers stations. The governments have almost never confirmed them, and the usual explanation, that they carried pad-enciphered orders, is an inference from the form of the messages. It is also a good one: a broadcast to anyone who might listen, enciphered with a pad, reveals nothing except that a message was sent.

### The ship and the family

The weakest part of such systems was seldom the machine. On 23 January 1968 North Korean patrol boats seized the USS *Pueblo*, a US Navy intelligence ship, off the port of Wonsan. One of the crew was killed and 82 were held for eleven months, until 23 December. The ship carried cipher equipment, among it the KW-7 and KWR-37, and the crew had too little time and too few tools to destroy it all. American assessments, parts of which are declassified, called the loss serious; the sources do not agree on how serious.

A few months before, in October 1967, a US Navy warrant officer named John Walker had walked into the Soviet embassy in Washington and offered to sell the Navy's key lists, the first for the KL-47 and in time those for the KW-7. By his own account the motive was money. He recruited a friend, Jerry Whitworth, in the 1970s, and later drew in his brother Arthur and his son Michael. For nearly eighteen years, until the FBI arrested him on 20 May 1985, the Soviet Union received the monthly key lists for the Navy's machines. Later American accounts say that a Soviet service that held both the captured equipment and Walker's keys could read large volumes of US Navy traffic. This is the best-documented case in the chapter of an agency that lost its secrets not to cryptanalysis but to a man with a briefcase. Walker died in prison in 2014. The *Pueblo* is a museum ship in Pyongyang. Another American intelligence ship, the USS *Liberty*, was attacked off Sinai by Israeli aircraft and torpedo boats on 8 June 1967, in the Six-Day War, and 34 Americans were killed. Israel called it a case of mistaken identity, and some survivors and former officials dispute that. The argument is about identification and not about ciphers, and I do not take it up.

!!! note "Life story: the USS Pueblo and the Walker ring"
    **Born:** 23 January 1968 (the capture); late 1967 to 1985 (the Walker spy ring) · **Purpose:** the ship collected signals for the Navy and the NSA; Walker sold keys to the Soviet Union for money · **Helped:** showed that the strength of a cipher system lies in its keys and its custody; led to tighter key handling and the end of old machines · **Status:** Walker was arrested in 1985 and died in prison in 2014; the *Pueblo* is held in North Korea

### Where the cipher stops

Not every secret was taken from a cipher. In 1945 a carved wooden Great Seal of the United States was given to the American ambassador in Moscow, and it hung in his residence for seven years before it was found to contain a hollow cavity and no battery: a passive device that a beam of radio waves from outside could make into a microphone. It is a distant ancestor of the side-channel attacks, and [chapter 19](19-Hardware-Quantum-and-the-Long-View.md) tells that story, with the Bell Labs engineer who in 1943 saw spikes on an oscilloscope whenever a cipher machine stepped and the shielding rules called TEMPEST that followed. And in 1954 to 1956 the CIA and British MI6 dug a tunnel into East Berlin to tap Soviet telephone and teleprinter cables, a plain wiretap of about 450 meters (some accounts say 500); it ran for about a year and the Soviets, who had been told of it from the start by the MI6 officer George Blake, let it run. By the accounts, some of what it took was enciphered traffic, kept for later reading. A cipher system covers a message from one threat. The rest of the system, the room it is read in, the cable it crosses and the people who carry the keys, is open to the others.

## 15.9 The women of the agencies

*Level: beginner.*

At the end of the war the American agencies were a women's workplace, and the people who ran them were mostly men. By Liza Mundy's count, more than ten thousand women had worked in Army and Navy codebreaking, many of them recruited from teachers' colleges and women's colleges with the promise of a war job that would end with the war. Bletchley's workforce was also mostly women, as [chapter 13](13-Bletchley-Park.md) says. After 1945 most of these women left, some by choice and some because the jobs went to returning men. The record of those who stayed is scattered, and the NSA's own histories are less attentive to them than to the men of the same period. This section names the ones the sources name, with their limits.

**Ann Caracristi** (1921 to 2016) joined the Army's Signal Intelligence Service at Arlington Hall in 1942, after Russell Sage College, and worked on Japanese Army ciphers. She stayed on after the war and spent most of her career on Soviet and other hard targets. In 1980 she became the NSA's Deputy Director, the first woman to hold that place, and she retired in 1982. She was later a member of a presidential commission on the intelligence community (I take this from her biographies and give the details with less certainty).

**Juanita Moody** led the NSA's work on Cuba in 1962. The agency credits her group with the signals reports that built the picture of the Soviet military build-up on the island in the summer and autumn of that year, and with pressing the intelligence community to take them seriously. The agency's own short biographies say she retired in 1976 after 33 years of service. She was born in 1924 and died in 2015.

**Gene Grabeel** (1920 to 2015) was a Virginia schoolteacher recruited by the Army's codebreakers at the end of 1942, weeks before she began at Arlington Hall. In February 1943, on the orders of Colonel Carter Clarke, a small program began there to study Soviet diplomatic traffic, and she is usually named as the first analyst assigned to it. The program became, under the name that came later, Venona ([chapter 14](14-The-Rest-of-the-War.md)). She stayed in government cryptologic work for decades; she retired in the 1970s (1973 by an NSA account, 1978 by others).

**Agnes Meyer Driscoll** (1889 to 1971), the Navy's chief cryptanalyst of the 1920s and 1930s ([chapter 14](14-The-Rest-of-the-War.md)), went on to the AFSA and then the NSA and retired in 1959 (the dates are from the agency's biography).

**Joan Clarke** (later Joan Murray, 1917 to 1996), the Bletchley mathematician who had worked in Hut 8 beside Turing and been briefly engaged to him, worked for GCHQ until she retired in 1977.

**Elizebeth Friedman** (1892 to 1980), after her wartime work, consulted for the International Monetary Fund in the late 1940s, by her biographer's account, and with William Friedman wrote *The Shakespearean Ciphers Examined* (1957), which showed that the ciphers some people claimed to find in Shakespeare's plays were not there ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md) and [chapter 14](14-The-Rest-of-the-War.md) tell her codebreaking).

**Nora Mackebee** appears in the 2020 reports as an NSA cryptomathematician who dealt with Crypto AG's engineers. The *Post* names her and little else, and §15.6 gives the claim with the caution it needs.

!!! note "Life story: Ann Caracristi"
    **Born:** 1921; died 2016 · **Purpose:** codebreaker at Arlington Hall from 1942, then analyst and manager at the NSA · **Helped:** work on Japanese Army ciphers in the war and on Soviet targets after it; in 1980 the first woman to be the NSA's Deputy Director · **Status:** retired 1982; honored in the NSA's Hall of Honor

!!! note "Life story: Gene Grabeel"
    **Born:** 1920; died 2015 · **Purpose:** began the study of Soviet diplomatic traffic at Arlington Hall in February 1943 · **Helped:** the start of the project later named Venona, which ran until 1980 and was made public in 1995 · **Status:** stayed in government cryptology for about thirty years, retiring in the 1970s (1973 by an NSA account, 1978 by others)

What the record does not give is as telling as what it gives. The proportion of women at each rank at the NSA in 1952, how many left in 1946 and why, the pay of women against men in the same grade, the number who were promoted to run sections: I found no source with these numbers. What the sources do show is that the women who made careers in the agencies often did so in a narrow band of fields and had to work longer to reach the posts their male colleagues reached, and that their own accounts tend to come late, from oral histories and obituaries.

## 15.10 How the public found out

*Level: beginner.*

For a generation the work of these agencies was a secret kept by law, and most of what the public learned about it came out by accident or against the will of the agency. The order of the revelations is itself part of the story.

In September 1960 two NSA analysts, William Martin and Bernon Mitchell, appeared at a press conference in Moscow. They had left the United States in June. They said that the NSA read the communications of America's own allies. It was the first time the agency's name was widely in the news, and the agency, by most accounts, tightened its security checks afterward. In 1967 the journalist David Kahn published *The Codebreakers*, a history of secret writing of more than 1,100 pages, the first book to show a general reader that the subject existed. By the accounts that have come out since, the NSA reviewed the manuscript, tried to have parts of it removed and weighed trying to stop it; Kahn agreed to a few cuts and the book appeared. It sold well, and Whitfield Diffie has said that reading it started him on the subject ([chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)). In 1974 Winterbotham's *The Ultra Secret* told the world that Enigma had been broken. In 1976 a British magazine, *Time Out*, carried an article on GCHQ by Duncan Campbell and Mark Hosenball called "The Eavesdroppers", and in 1977 and 1978 a prosecution under the Official Secrets Act, known by its defendants' initials as the ABC case, made GCHQ's work a matter of public argument. In 1982 James Bamford's *The Puzzle Palace* gave the first book-length picture of the NSA. In 1995 the NSA and the CIA released the Venona decrypts. The Crypto AG history surfaced in 1992, 1995 and 2020. The text of the UKUSA agreement was released in 2010. In 2013 a contractor, Edward Snowden, took a large number of the agency's documents, and [chapter 18](18-The-Internet-Era.md) is shaped by what they showed.

One more effect was less visible. In the 1970s the secrecy that had held for thirty years began to give way to something new: academics and companies had started to do cryptography in the open, for banks and computers, and the NSA, which had had a near monopoly on the knowledge, found that it no longer did. The conflict that followed, over the data encryption standard, over public keys and over the right to publish, is the subject of the next two chapters ([chapter 16](16-Feistel-Lucifer-and-DES.md) and [chapter 17](17-Public-Keys-and-the-Crypto-Wars.md)).

## 15.11 Going deeper

*Level: expert.*

### The random cipher and the limits of the unicity distance

Shannon's unicity result comes from a model, and the model is worth stating. Take a cipher with $|K|$ equally likely keys, and suppose that every key maps the set of meaningful messages of length $n$ into the set of cryptograms in a way that looks random. A message of length $n$ in a language of redundancy $D$ per letter has about $2^{H_L n}$ meaningful strings among $2^{n\log_2 26}$ possible strings, so a wrong key produces a meaningful string with probability about $2^{-Dn}$. The expected number of wrong keys that survive a ciphertext of $n$ letters is then about

$$\bar{s}_n \approx \frac{|K|}{2^{Dn}} - 1,$$

which is Shannon's estimate. It falls to about zero near $n = \log_2 |K| / D$, the unicity distance. Three cautions apply. The model assumes the cipher behaves like a random assignment, which real ciphers do not: for a Vigenère cipher of a given period or for a rotor machine, the true number of surviving keys at a given length depends on the structure, and the estimate is a guide. The redundancy $D$ is for natural language, and a text that is compressed first has far smaller $D$, which is why the advice to compress before encrypting follows from the theory. And the estimate is an *average* over messages and keys, which tells nothing about a particular unlucky pair. Martin Hellman extended the analysis in 1977 ("An Extension of the Shannon Theory Approach to Cryptography", *IEEE Transactions on Information Theory*) by studying the random cipher as a model and showing how the spurious-key count behaves, and the result is the form in which most textbooks give it ([the Mathematics book, chapter 17](../mathematics/17-Information-and-Entropy.md) works it in full).

The deeper gap is the one between information and computation, and the history in this chapter has several examples. The unicity distance of the army Enigma is about 21 letters, and no one in 1940 could find the key from 21 letters. A one-time pad has an unbounded unicity distance, and a pad used twice has a very short one. SIGSALY's six-level mod-6 sum is perfectly secret in Shannon's sense *if* the key levels are uniform and independent, which depends on the quality of the noise source and of the recording, not on the theory. The standard modern response is the definition of security in terms of feasible attackers ([book 1, chapter 17](../../book/17-Defining-Security.md)), which Shannon's measure of information cannot express.

### Priority: Kotelnikov and the Soviet side

The proof that the one-time pad is unbreakable and needs a key as long as the message is credited to Shannon. Soviet sources, which became accessible after 1991, credit it to Vladimir Kotelnikov (1908 to 2005), the radio engineer whose sampling theorem of 1933 is also in Shannon's work and is now called the Whittaker-Kotelnikov-Shannon theorem. By these accounts Kotelnikov wrote a classified report on the theory of automatic encryption in 1941 (a recent review cites it as dated 19 June 1941 and titled "Basic provisions of automatic encryption") that contains the same result. I have this from later Russian accounts and could not read the original, and I do not know of an independent confirmation of its contents. If the report says what it is said to say, it is a clear case of an idea found twice in secret, a pattern that returns in chapter 17 with GCHQ's public-key work, and it shows how much of the theory of secrecy in 1945 was available to people who could not publish it.

### Reading the Crypto AG evidence

The Crypto AG story is the most important recent change in the history of this period, and it has a particular evidentiary shape. The central claim, that the CIA and the BND owned the firm from 1970 and could read its customers, rests on two classified histories that the journalists say they saw. Its independent supports are partial: the arrest of Bühler in 1992, the earlier suspicions in Bamford and the Baltimore *Sun*, and the later Swiss inquiries. A historian would want three more kinds of evidence. The first is the machines: no analysis that I know of publishes a break of a unit shown to have been rigged, and a break would show the mechanism, its date and which models were affected. The second is the Swiss and German archives. The third is the consumer side: whether the customers' own records show they were surprised. Until then the story should be told as a well-supported report, with the parts that rest on one source marked, and §15.6 tries to do that. The lesson that does not depend on the details is the one of Kerckhoffs: a cipher that cannot be examined is trusted at the buyer's risk. A second, less comfortable lesson concerns the agencies. The same agencies that told their own governments how to protect messages were, on the reports, selling other countries ciphers they could read. The same dual mission, protecting and breaking, was built into the NSA from the start, and the next chapters show what it did to the public standards that the American government set: the data encryption standard (FIPS 46) of 1977, and later, for good reasons, the process that produced the Advanced Encryption Standard (FIPS 197) in public.

### Open questions

The record leaves several questions that a better archive would settle. How much of the Soviet and Warsaw Pact traffic of the 1950s to 1970s was readable by the West, and by what means? The answer is partly in Venona, which was a failure of pad management and not a break of a cipher. How good were the T-310 and the Fialka, and did anyone outside read them in service? How many women held which positions in the agencies in the 1950s and 1960s, and how did the agencies' employment practices shape what they could do? And what was the cost of the secrecy itself: for thirty years the best cryptographers in the English-speaking world could not publish, and so the open field, when it began, started from almost nothing, while the closed one did not benefit from outside criticism. Whether that cost more than the secrecy gained is a question the record cannot settle.

## Check yourself

??? question "1. SIGSALY sampled 12 channels 50 times a second and reduced each sample to one of six levels. How many bits a second of information is that, and why is it so small?"
    $12 \times 50 \times \log_2 6 = 600 \times 2.585 \approx 1{,}551$ bits a second. It is small because the vocoder describes the speech (ten band loudnesses and the pitch information) and does not send the sound; the description changes only slowly, so about fifty readings a second are enough to rebuild an understandable, robot-like voice.

??? question "2. A speech level $m$ in $\{0,\dots,5\}$ is enciphered as $c = (m + k) \bmod 6$, where $k$ is uniform on $\{0,\dots,5\}$ and independent of $m$. Why does $c$ tell the listener nothing about $m$?"
    For every $m$ and every $c$ there is exactly one key $k = (c - m) \bmod 6$, and each key has probability $1/6$. So $\Pr[C = c \mid M = m] = 1/6$ for all $m$ and $c$: the ciphertext is uniform whatever the speech was. That is Shannon's definition of perfect secrecy, with the group of integers modulo 6 in place of bits.

??? question "3. Two different calls are enciphered with the same key record, producing $c_1$ and $c_2$. What does an eavesdropper who subtracts them get, and why is that dangerous?"
    $c_1 - c_2 = (m_1 + k) - (m_2 + k) = m_1 - m_2 \pmod 6$. The key cancels and the eavesdropper has the difference of the two speeches. If one of the two is predictable (a pause, a tone, a known opening) the other can be read, and with patience both can. This is the Venona mistake in the form of speech levels, and the reason SIGSALY's records were destroyed after one use.

??? question "4. A cipher has $2^{40}$ equally likely keys and is used on English with redundancy $D = 3.2$ bits per letter. About how many letters of ciphertext does Shannon's formula say fix the key? What does the number not tell you?"
    $U = 40 / 3.2 = 12.5$ letters. After about 13 letters of ciphertext only one key, on average, produces a meaningful reading. The number says nothing about how long it takes to find that key. Here a $2^{40}$ search is easy on a modern computer, but the same calculation applied to a 128-bit key (40 letters) gives a key that is determined in principle and impossible to find.

??? question "5. Why did the unicity distance not make Enigma easy to break, though it is only about 21 letters?"
    It measures how much ciphertext makes the key unique, not how much work finding it takes. For Enigma the work was about $1.6 \times 10^{20}$ keys with no obvious way to test them one at a time; Bletchley's bombes, cribs and the operators' mistakes were the means of finding the key, and they took a large organization. Information and effort are different quantities, and Shannon's theory gives only the first.

??? question "6. Name the agency formed on 20 May 1949, the date and body that replaced it, and one reason the first one was judged to have failed."
    The Armed Forces Security Agency (AFSA) was created under the Joint Chiefs of Staff. It was replaced by the National Security Agency, formed from a presidential memorandum of 24 October 1952 and counted from 4 November 1952. AFSA had little authority over the three services' own agencies, and, by the standard histories, the Korean War showed that it had not coordinated collection against targets other than the Soviet Union.

??? question "7. The NSA had two jobs, one of them making ciphers for the US government and the other reading foreign traffic. Why does that create a conflict when the agency advises on a public standard?"
    An agency that profits from weak foreign ciphers has a reason to want public standards that it can read, and an agency that protects American communications has a reason to want strong ones. The public cannot see which interest is speaking, and cannot check unless the design is open. That is the question behind the key length and S-box suspicions about DES in chapter 16 and the "crypto wars" of chapter 17.

??? question "8. In the toy generator of §15.6, a customer counts the share of one-bits in the keystream and finds 0.5010. What can the customer conclude, and what cannot be concluded?"
    That the stream is balanced, as a random stream would be. Nothing else: the rigged generator passes the test as well as the honest one, because the weakness lies in the size of the seed (20 bits) and not in the look of the output. Statistical tests on the output cannot reveal a short hidden seed; only knowledge of the design can, which is why Kerckhoffs's second rule asks for designs that can be inspected.

??? question "9. By the counting of §15.7, a ten-rotor machine with 30 contacts per rotor has $10! \times 30^{10}$ rotor settings. How many bits is that, how does it compare with the army Enigma, and why is the comparison not a good measure of strength?"
    About 70.9 bits, against about 67.1 bits for the army Enigma: a ratio of about 13.5. The comparison does not measure strength because Enigma's loss came from its structure (the reflector, the operators, the guessable text), not from a search of its key space; a machine with more keys but a similar structure has the same kind of weaknesses.

??? question "10. A shift register has 8 cells and a maximal-length feedback. What is its period, how many output bits does an attacker who knows the design need to predict the rest, and how many if the feedback taps are unknown?"
    The period is $2^8 - 1 = 255$. If the attacker knows the design, 8 consecutive output bits are the state, so 8 bits suffice. If the taps are unknown, $2 \times 8 = 16$ bits suffice by the Berlekamp-Massey algorithm (1968 to 1969). That is why designers combine several registers through a nonlinear function.

## What you learned

- SIGSALY (1943) was the first digital voice cipher: a vocoder turned speech into twelve numbers fifty times a second, each reduced to six levels, and a random key level from a pressed record was added modulo 6 and the record destroyed. It was never known to be broken, and it needed a room of equipment.
- Shannon's classified report of 1 September 1945 and his paper of October 1949 defined perfect secrecy, proved that the one-time pad has it and that any system that has it needs a key as long as the message, introduced redundancy and the unicity distance, and named confusion and diffusion. They measure information, not the work of finding the key.
- The AFSA (1949) did not work; the NSA, created by Truman's memorandum of 24 October 1952 and counted from 4 November, combined signals intelligence and communications security under the Secretary of Defense. GCHQ took its name in 1946. The UKUSA Agreement of 5 March 1946 tied the two together, with Canada, Australia and New Zealand later; its text was released in 2010.
- Boris Hagelin's machines, including the M-209, made him rich; his Swiss firm Crypto AG, founded in 1952, sold to well over a hundred countries. By the reports of 2020 the CIA and the BND secretly owned it from 1970. Some of those claims rest on single sources, and no published analysis shows a rigged machine.
- The Soviet Fialka (about 1956) had ten rotors of 30 contacts and national wirings for the Warsaw Pact; East Germany's cipher service made the electronic T-310. The Western public knew almost nothing of either until after 1989.
- Rotors gave way to shift registers in the 1950s; Golomb's tests describe their good statistics and Berlekamp and Massey's algorithm their weakness. The hot line of 1963 reportedly ran on one-time tapes.
- Keys were lost to people more often than to cryptanalysis: the USS *Pueblo* in 1968 and the Walker spy ring from 1967 to 1985.
- Ann Caracristi, Juanita Moody, Gene Grabeel, Joan Clarke and others carried careers across 1945 in the agencies; the records of their work are thinner than the records of the men's.
- The public learned of the agencies by defection (1960), a book (Kahn, 1967), a magazine (1976), a trial (1978), a leak (2013) and a newspaper investigation (2020).

**Next:** [Chapter 16](16-Feistel-Lucifer-and-DES.md), when the government has to say in public what cipher a bank may use, and the argument over its key begins.

## Further reading

- C. E. Shannon, "Communication Theory of Secrecy Systems", *Bell System Technical Journal* 28, no. 4 (October 1949), pp. 656 to 715; "A Mathematical Theory of Communication", *Bell System Technical Journal* 27 (1948); "Prediction and Entropy of Printed English", *Bell System Technical Journal* 30 (1951), pp. 50 to 64. The first and third are in N. J. A. Sloane and A. D. Wyner (eds.), *Claude Elwood Shannon: Collected Papers* (IEEE Press, 1993).
- Jimmy Soni and Rob Goodman, *A Mind at Play: How Claude Shannon Invented the Information Age* (Simon & Schuster, 2017), for Shannon's life, the tea with Turing and the war years.
- J. V. Boone and R. R. Peterson, *The Start of the Digital Revolution: SIGSALY Secure Digital Voice Communications in World War II* (NSA Center for Cryptologic History, 2000); Patrick D. Weadon, "The SIGSALY Story" (NSA).
- Andrew Hodges, *Alan Turing: The Enigma* (Burnett Books, 1983), for Turing's visit to the United States and Delilah.
- David Kahn, *The Codebreakers* (Macmillan, 1967; revised ed., Scribner, 1996).
- Thomas R. Johnson, *American Cryptology during the Cold War, 1945 to 1989*, four books (NSA Center for Cryptologic History, 1995 to 1999; declassified with redactions).
- James Bamford, *The Puzzle Palace: A Report on America's Most Secret Agency* (Houghton Mifflin, 1982); Richard J. Aldrich, *GCHQ: The Uncensored Story of Britain's Most Secret Intelligence Agency* (HarperPress, 2010).
- The UKUSA Agreement and its annexes, released by the NSA and the UK National Archives (June 2010).
- Greg Miller, "The Intelligence Coup of the Century", *Washington Post*, 11 February 2020, with the joint ZDF and SRF broadcasts of the same date; Scott Shane and Tom Bowman, "No Such Agency", *Baltimore Sun*, December 1995; Res Strehle, *Verschlüsselt: Der Fall Hans Bühler* (Werd Verlag, 1994).
- The Crypto Museum (cryptomuseum.com), pages on Hagelin, Crypto AG, the Fialka and the T-310, for the machines.
- Solomon W. Golomb, *Shift Register Sequences* (Holden-Day, 1967); James L. Massey, "Shift-Register Synthesis and BCH Decoding", *IEEE Transactions on Information Theory* 15 (1969), pp. 122 to 127; Martin E. Hellman, "An Extension of the Shannon Theory Approach to Cryptography", *IEEE Transactions on Information Theory* 23 (1977), pp. 289 to 294.
- Liza Mundy, *Code Girls: The Untold Story of the American Women Code Breakers of World War II* (Hachette, 2017); Jason Fagone, *The Woman Who Smashed Codes* (Dey Street, 2017); the NSA's Hall of Honor biographies of Ann Caracristi, Juanita Moody and Gene Grabeel.
- *Weaker sources behind particular statements:* the Wikipedia articles and the NSA's SIGSALY pages for the number of terminals, conferences and the racks and tons (40 and 55); search summaries for the dates of Black Friday, the AFSA's creation and the Brownell Committee, the hot line and the dates of KL-7 and KW-26; the Washington Post's account, as reprinted, for the Crypto AG customers, codenames, the 1993 and 2018 dates and Nora Mackebee; press summaries of the Swiss inquiries of 2020; the Crypto Museum for Fialka and T-310 dates; Wikipedia and the agency's own pages for the dates of Caracristi, Grabeel and Moody; the account of Kotelnikov's 1941 report as given in Russian-language summaries, which I could not read in the original.
