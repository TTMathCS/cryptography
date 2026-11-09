# 14. The rest of the war: Japan, China, India, the code talkers and Venona

*Chapters 12 and 13 told how Poland and Britain beat the German machines. The other half of the codebreaking war was fought in two competing American offices in Washington, in a basement at Pearl Harbor, in Chongqing and Delhi, over a Marine Corps radio net where the cipher was a language, and over Soviet telegrams that nobody expected to read. This chapter follows the people: the Navy's first woman cryptanalyst, the young mathematician who saw the pattern in Japan's Purple machine, the officer who made a garrison lie about its water, the code talkers, Japan's own codebreakers, Elizebeth Friedman's wartime unit, and the women of Arlington Hall who found that Moscow had printed some of its one-time pads twice. You will see why a cipher that keeps vowels among vowels gives itself away, spell words as a code talker did, and subtract two Soviet-style messages to watch the key disappear.*

!!! abstract "In this chapter"
    **You will learn:**

    - how the US Navy's and Army's codebreaking offices were built between the wars, and who Agnes Meyer Driscoll, Joseph Rochefort, Frank Rowlett, Genevieve Grotjan and Leo Rosen were;
    - how Japan's Red and Purple machines were broken, what the decrypts called Magic did and did not tell Washington, and why they did not warn of Pearl Harbor;
    - how Station HYPO read enough of the Japanese navy's JN-25 code to help win Midway, and where the sources disagree about who deserves the credit;
    - how the Navajo, Comanche, Meskwaki and other code talkers worked, what their codes were and were not, and what is myth;
    - what is known about Japan's own codebreakers, the Chinese black chamber in Chongqing, the Wireless Experimental Centre near Delhi, and Elizebeth Friedman's wartime unit, and how thin the record is;
    - how the Soviet pad factory's duplicate pages of 1942 led to Venona, who read it, and what it did and did not prove;
    - how many women did this work, and how far the figures can be trusted.

    **You need:** [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) (the Friedmans, the Choctaw, the one-time pad), [chapter 12](12-Rotors-and-Enigma.md) and [chapter 13](13-Bletchley-Park.md) (the German side, which this chapter does not retell), and [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) (why a pad must never be reused). The methods are taught in [Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md); this chapter tells the people.

    **Levels:** §14.1, §14.2, §14.5 to §14.8, §14.12 and §14.14 are for beginners; §14.3, §14.4, §14.9 to §14.11 and §14.13 are intermediate; §14.15 is expert.

## 14.1 The problem: a war with no single front

*Level: beginner.*

In the spring of 1941 an American officer in Washington could, on a good day, read the private telegrams of Japan's ambassador and still not know where Japan's fleet was. Both things were true because Japan used different systems for different jobs, and the United States had two codebreaking services that each owned a different part of the problem. The Army's Signal Intelligence Service worked on the Japanese foreign ministry's cipher machine. The Navy's communications intelligence group, known by its office code OP-20-G, worked on the codes of the Japanese navy. They shared little, quarreled over who should do what, and were both short of people, machines and time.

Three organizations in this story are called "SIS", and it is worth sorting them out at once. The **Signal Intelligence Service** was William Friedman's Army codebreaking office, founded in 1930 and told in [chapter 11](11-Radio-War-and-the-One-Time-Pad.md). The **Special Intelligence Service** was the FBI's foreign branch, created in 1940 to watch the Western Hemisphere; it matters in §14.11. The **Secret Intelligence Service**, also called MI6, is the British foreign intelligence service. When this chapter says SIS without a qualifier it means Friedman's Army office.

The pressure was real. Japan had been at war in China since 1937. In September 1940 it signed the Tripartite Pact with Germany and Italy, a week after the break into its diplomatic machine described in §14.4. In July 1941, after Japanese troops moved into southern Indochina, the United States froze Japanese assets and cut off oil. Both countries were now moving toward a confrontation, and Washington wanted to know what Tokyo would do. The answer lay in thousands of intercepted messages, most of which could not be read.

The same pattern repeats through this chapter. A few people, most of them young and many of them women, were handed a problem that their governments had called impossible, and they solved it. The credit then went up the chain, the story stayed secret for decades, and the sources disagree about who did what. Where they do, the disagreement is said in the sentence.

This chapter takes the Allied war in the east and the Soviet traffic. Enigma and Poland are in [chapter 12](12-Rotors-and-Enigma.md); Bletchley Park, Lorenz and Colossus in [chapter 13](13-Bletchley-Park.md); the Friedmans between the wars, the Choctaw and Vernam's pad in [chapter 11](11-Radio-War-and-the-One-Time-Pad.md). Figure 14.1 puts the dates of this chapter in order, and §14.7 draws the network that read Japan's traffic.

<figure class="mars-fig">
<svg viewBox="0 0 640 404" width="640" role="img" aria-label="Timeline of the rest of the war, from 1918 to 1995" fill="currentColor" font-size="14">
<line x1="112" y1="8" x2="112" y2="398" stroke="currentColor" stroke-width="1.6"/>
<text x="98" y="27" font-size="14" text-anchor="end" font-weight="bold">c. 1923</text>
<circle cx="112" cy="22" r="3.5" fill="currentColor"/>
<text x="128" y="27" font-size="14" text-anchor="start">Kowalewski teaches Japanese officers to break codes</text>
<text x="98" y="53" font-size="14" text-anchor="end" font-weight="bold">c. 1936</text>
<circle cx="112" cy="48" r="3.5" fill="currentColor"/>
<text x="128" y="53" font-size="14" text-anchor="start">The Navy reads the Japanese machine called Red</text>
<text x="98" y="79" font-size="14" text-anchor="end" font-weight="bold">1938-40</text>
<circle cx="112" cy="74" r="3.5" fill="currentColor"/>
<text x="128" y="79" font-size="14" text-anchor="start">Yardley trains Chinese codebreakers in Chongqing</text>
<text x="98" y="105" font-size="14" text-anchor="end" font-weight="bold">Feb 1939</text>
<circle cx="112" cy="100" r="3.5" fill="currentColor"/>
<text x="128" y="105" font-size="14" text-anchor="start">Purple replaces Red; JN-25 enters service in June</text>
<text x="98" y="131" font-size="14" text-anchor="end" font-weight="bold">20 Sep 1940</text>
<circle cx="112" cy="126" r="3.5" fill="currentColor"/>
<text x="128" y="131" font-size="14" text-anchor="start">Grotjan sees the pattern in Purple's twenties</text>
<text x="98" y="157" font-size="14" text-anchor="end" font-weight="bold">7 Dec 1941</text>
<circle cx="112" cy="152" r="3.5" fill="currentColor"/>
<text x="128" y="157" font-size="14" text-anchor="start">Pearl Harbor; the 14-part note is read in Washington</text>
<text x="98" y="183" font-size="14" text-anchor="end" font-weight="bold">May 1942</text>
<circle cx="112" cy="178" r="3.5" fill="currentColor"/>
<text x="128" y="183" font-size="14" text-anchor="start">The first 29 Navajo recruits; Midway follows</text>
<text x="98" y="209" font-size="14" text-anchor="end" font-weight="bold">4-7 Jun 1942</text>
<circle cx="112" cy="204" r="3.5" fill="currentColor"/>
<text x="128" y="209" font-size="14" text-anchor="start">Midway: four Japanese carriers sunk</text>
<text x="98" y="235" font-size="14" text-anchor="end" font-weight="bold">1 Feb 1943</text>
<circle cx="112" cy="230" r="3.5" fill="currentColor"/>
<text x="128" y="235" font-size="14" text-anchor="start">Arlington Hall starts the Soviet project (Venona)</text>
<text x="98" y="261" font-size="14" text-anchor="end" font-weight="bold">18 Apr 1943</text>
<circle cx="112" cy="256" r="3.5" fill="currentColor"/>
<text x="128" y="261" font-size="14" text-anchor="start">Yamamoto's flight is read and shot down</text>
<text x="98" y="287" font-size="14" text-anchor="end" font-weight="bold">6 Jun 1944</text>
<circle cx="112" cy="282" r="3.5" fill="currentColor"/>
<text x="128" y="287" font-size="14" text-anchor="start">Comanche code talkers land at Utah Beach</text>
<text x="98" y="313" font-size="14" text-anchor="end" font-weight="bold">1946</text>
<circle cx="112" cy="308" r="3.5" fill="currentColor"/>
<text x="128" y="313" font-size="14" text-anchor="start">Meredith Gardner reads the first Venona messages</text>
<text x="98" y="339" font-size="14" text-anchor="end" font-weight="bold">1968</text>
<circle cx="112" cy="334" r="3.5" fill="currentColor"/>
<text x="128" y="339" font-size="14" text-anchor="start">The Navajo code is declassified</text>
<text x="98" y="365" font-size="14" text-anchor="end" font-weight="bold">1980</text>
<circle cx="112" cy="360" r="3.5" fill="currentColor"/>
<text x="128" y="365" font-size="14" text-anchor="start">The Venona project closes</text>
<text x="98" y="391" font-size="14" text-anchor="end" font-weight="bold">1995</text>
<circle cx="112" cy="386" r="3.5" fill="currentColor"/>
<text x="128" y="391" font-size="14" text-anchor="start">The first Venona decrypts are released</text>
</svg>
<figcaption>Figure 14.1. The events of this chapter in order. The Japanese and Soviet stories overlap from 1943; the code talkers' code stayed secret until 1968, the Soviet traffic until 1995.</figcaption>
</figure>

## 14.2 Agnes Meyer Driscoll and the Navy's first codebreakers

*Level: beginner.*

The Navy's story starts with a woman who enlisted as a clerk. Agnes May Meyer was born in Geneseo, Illinois, in 1889. She studied at Ohio State University and had been a teacher before the United States entered the First World War. In June 1918, at twenty-eight, she joined the Navy as a yeoman (F). The Navy had opened that rating to women in 1917 because it needed clerks, and about eleven thousand women served in it, called "yeomanettes" by the newspapers. Most were sent home in 1919. Meyer was assigned to the Director of Naval Communications, worked on codes, and stayed on as a civilian when the others left.

By the early 1920s she was in the Navy's Code and Signal Section in Washington, and in 1924 a young officer named Laurance Safford became head of a small new unit there, the Research Desk, to read other countries' naval traffic. Safford recruited a few people, and Meyer, who had married and was known afterward as Agnes Meyer Driscoll, became the most prominent of them. Colleagues called her "Miss Aggie" and, by some accounts, "Madame X". She had no formal training in the subject; nobody did. Everything the Navy knew about breaking codes in the 1920s was what a handful of people had worked out for themselves.

Their target was Japan. After the First World War the Japanese navy was the third largest in the world and the only one that could challenge the American fleet in the Pacific. The Washington Naval Conference of 1921 and 1922 fixed the ratio of battleships at 5 to 5 to 3 for Britain, the United States and Japan. As [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) tells, Herbert Yardley's Black Chamber had read Japan's instructions to its delegates and so knew how far Tokyo would bend. That success was in diplomatic messages; the Navy needed to read the navy's own.

At the start it had a copy of the Japanese naval code book. According to the usual account, agents of Naval Intelligence got into the Japanese consulate in New York in the early 1920s, and photographed the code book. The American copy was bound in red, and the code became the **Red Book**. (The accounts of how the book was obtained differ in their details, and the Navy kept no public record of the raid.) A code book alone did not make the traffic readable, because the Japanese disguised their messages with a second layer on top of the code. Recovering such a layer from a stack of intercepts is the real work of cryptanalysis, and it is the sort of work the Research Desk did. Navy accounts give Driscoll much of the credit for the work on the Red Book. What is well documented is that she was, for most of the 1920s and 1930s, the person the Navy trusted with its hardest Japanese problems.

She taught as well as solved. The Navy sent officers to Washington to learn cryptanalysis under her, and among those who joined the office in the 1920s was a young officer named Joseph Rochefort, whom §14.6 follows to Pearl Harbor. He is usually described as having learned the trade there, from her and from others. The Navy still had no school for the subject, so a student learned by sitting next to a working cryptanalyst.

### Machines, and a change of subject

The 1920s also brought the first rotor machines, the subject of [chapter 12](12-Rotors-and-Enigma.md). Edward Hebern of Oakland, California, sold the Navy a few of his electric code machines, and the Navy needed to know whether they were safe. Driscoll's group was among those who tested them. The Army's Friedman did the same for his service and reported that the Hebern could be broken. A commercial Enigma, too, reached Washington in the 1920s. The sources I know say little about what Driscoll herself did with each machine, and I do not guess.

In the 1930s Japan's navy changed its code books on a regular schedule, and Driscoll's section kept up with a succession of them: after the Red Book came a new code, the **Blue Book**, introduced in 1930. At about the same time the Japanese foreign ministry's cipher machine, which the Americans called **Red**, came into use. §14.3 returns to it. The Navy broke Red in the mid-1930s. Driscoll's name is the one usually attached to that break, but the Army's team worked on the same machine, and the sources I know do not settle whose idea came first.

In June 1939 the Japanese navy brought in a new system, a five-digit code with an additive on top, which the Americans called **JN-25** (the twenty-fifth Japanese navy system they had catalogued). Driscoll's group was given JN-25, and she was one of its first attackers. John Tiltman of the British Far East Combined Bureau made first entries into it too, and Eric Nave, an Australian naval officer who had learned Japanese in Tokyo in the 1920s, was among the others who attacked it before Pearl Harbor. JN-25 was long and slow to yield. The usual statement is that her section made the first real inroads into its additive tables in 1939 and 1940, and that the Navy then moved her to German problems. Accounts of what she achieved on JN-25 differ, and I have not seen a source that explains why she was moved.

From about 1940 or 1941 she worked on German naval problems, Enigma among them, at a time when the Americans had neither the wiring of the military rotors nor the methods the Poles and the British had built. She could not do for Enigma what she had done for Japanese codes. Britain's help, the subject of [chapter 13](13-Bletchley-Park.md), did what her group could not. Through the war she stayed in the Navy's cryptanalytic office, which in 1942 moved to the Naval Communications Annex on Nebraska Avenue (§14.12). After the war she worked on the first projects of the Armed Forces Security Agency and, from 1952, its successor the National Security Agency. She retired in 1959 and died in Washington in 1971. NSA's Hall of Honor lists her.

### Who gets the credit

Three names are fought over: Driscoll, Safford and Rochefort. Safford was her superior for much of her career. He built the Navy's section, ran OP-20-G from 1936 to 1941, and later became a central figure in the Pearl Harbor controversy (§14.15). Rochefort's biographers rightly stress his part in 1941 and 1942; the earlier work that made that possible, in the 1920s and 1930s, was done by Driscoll and the others of the Research Desk. Driscoll left, as far as I know, no memoir, and she was a civilian, with a civilian's pay and no rank, in an organization where rank decided who was thanked. The record shows that she was central, and it does not show exactly how central. A reader should treat any sentence that gives the credit entirely to one person, whichever person, as a sentence written by someone who wants a tidy story.

!!! note "Life story: Agnes Meyer Driscoll"
    **Born:** 1889, Geneseo, Illinois; joined the US Navy as a yeoman (F) in June 1918; died 16 September 1971, Washington · **Purpose:** to read Japan's naval codes and cipher machines for the US Navy, from the early 1920s · **Helped:** trained the Navy's first cryptanalysts, worked on the Red Book and Blue Book codes, the Red machine and the first attack on JN-25, and later on German Enigma and early postwar problems · **Status:** a civilian throughout; the extent of her credit against Safford's and Rochefort's is disputed; her name is in NSA's Hall of Honor

## 14.3 Red, sixes and twenties: the Army's Japanese problem

*Level: intermediate.*

While the Navy worked on the Japanese navy, the Army worked on Japan's foreign ministry. Friedman had founded the SIS in 1930 with three young mathematicians he hired from the civil service lists: Frank Rowlett, Abraham Sinkov and Solomon Kullback. They learned the subject from Friedman's own training papers, the same ones that gave the world the index of coincidence, and by 1939 they had been joined by a dozen or more others, among them Genevieve Grotjan, Leo Rosen and Mary Jo Dunning.

The foreign ministry's machine, which came into service about 1931 and which the Americans named **Red**, was a thing of its own. It split the alphabet into two sets: the six vowels A, E, I, O, U and Y, called the **sixes**, and the twenty consonants. The machine enciphered the two sets separately, so that a vowel in the message always came out as a vowel and a consonant as a consonant. One explanation offered for the design is the telegraph tariff, which charged less for text that looked pronounceable; it is plausible, and I know of no document that confirms it. Whatever the reason, the design was the weakness the codebreakers needed.

Japanese, written in Latin letters, is an extreme case of a language in which consonants and vowels alternate. Almost every syllable is a consonant followed by a vowel (KA, TO, MI) or a vowel alone. A cipher that keeps vowels among vowels therefore leaves the skeleton of every word in plain view. Write C for a consonant and V for a vowel and the phrase BEIKOKU TO NO KOUSHOU WA TSUZUKIMASU ("negotiations with America continue") becomes CVVCVCV CV CV CVVCCVV CV CCVCVCVCVCV, and the ciphertext has the same pattern exactly. The analyst can look at the pattern, guess a probable word, and count the places in the traffic where the pattern allows it.

The program below makes that concrete. It enciphers a short Japanese phrase with a toy machine: the six vowels are permuted among themselves and the twenty consonants among themselves, and both permutations step on with each letter. It prints the C and V skeleton of the plaintext and of the ciphertext, then asks where in the ciphertext the word KOUSHOU (negotiations) could sit, using only the skeleton.

```python
import random
random.seed(1931)

VOWELS = "AEIOUY"
CONSONANTS = "BCDFGHJKLMNPQRSTVWXZ"        # the other twenty letters

def skeleton(s):
    return "".join("V" if c in VOWELS else "C" for c in s)

# A toy "Red": vowels stay vowels, consonants stay consonants, and the
# alphabets step on with every letter. Real Red used switches, not this.
def toy_red(text, v_start, c_start):
    out = []
    for i, ch in enumerate(text):
        if ch in VOWELS:
            out.append(VOWELS[(VOWELS.index(ch) + v_start + i) % 6])
        else:
            out.append(CONSONANTS[(CONSONANTS.index(ch) + c_start + 3 * i) % 20])
    return "".join(out)

plain = "BEIKOKUTONOKOUSHOUWATSUZUKIMASU"
secret = toy_red(plain, 2, 7)
print("plain  ", plain)
print("secret ", secret)
print("plain  skeleton", skeleton(plain))
print("secret skeleton", skeleton(secret))

crib = "KOUSHOU"                                # a probable word in these messages
want = skeleton(crib)
fits = [i for i in range(len(secret) - len(crib) + 1) if skeleton(secret[i:i + len(crib)]) == want]
print("places the skeleton", want, "allows:", fits)
print("true place:", plain.index(crib))
```


Output:

```
plain   BEIKOKUTONOKOUSHOUWATSUZUKIMASU
secret  KUAFOMAFEGOKYEFWOYXODGUTAMAWALA
plain  skeleton CVVCVCVCVCVCVVCCVVCVCCVCVCVCVCV
secret skeleton CVVCVCVCVCVCVVCCVVCVCCVCVCVCVCV
places the skeleton CVVCCVV allows: [11]
true place: 11
```

The two skeletons are identical, as they must be, and the skeleton of the probable word fits at one place out of twenty-five, the right one. Real traffic is longer and messier, so a real crib fit at several places; but a test that discards most of the places before any hard work begins is the whole point of a probable word. It is the same trick as the bombe's rule that Enigma never turns a letter into itself, and it is a **structural leak**: a property that every ciphertext obeys, whatever the key. Cryptanalysis [chapter 3](../cryptanalysis/03-Machines-and-the-War.md) lists the family. Once the analysts could place probable words, they recovered the alphabets one at a time and then the wiring.

Red was read from the mid-1930s. The Army and the Navy both worked on it, and for several years the United States read the cables of Japan's ambassadors in Washington and its attachés elsewhere. In February 1939 Japan replaced it, for its most secret traffic, with a new machine. That machine was Purple.

## 14.4 Genevieve Grotjan and the break of Purple

*Level: intermediate.*

The new machine was called by the Japanese the Type 97 Alphabetical Typewriter (*97-shiki ōbun injiki*), the "97" for the year 2597 in the Japanese calendar, 1937 in ours. The Americans called it Purple, continuing the colors they had given to its predecessor. It was not a rotor machine. It used **stepping switches**, the parts that telephone exchanges used to route calls: a wiper moves across a bank of contacts, one step at a time, driven by electrical pulses. A plugboard at the input split the twenty-six letters into a group of six and a group of twenty, and each group went through its own switches (Figure 14.2). The sixes carried over the old weakness of Red: six letters stayed among themselves on a short cycle. The twenties went through three switch banks in series, which stepped in a pattern set by the key.

<figure class="mars-fig">
<svg viewBox="0 0 640 304" width="640" role="img" aria-label="Block diagram of the Purple machine: a plugboard splits letters into a group of six and a group of twenty, each stepped by its own switches" fill="currentColor" font-size="14">
<rect x="10" y="108" width="86" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="53.0" y="129.0" font-size="14" text-anchor="middle">Typed</text>
<text x="53.0" y="147.0" font-size="14" text-anchor="middle">letter</text>
<rect x="126" y="108" width="110" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="181.0" y="129.0" font-size="14" text-anchor="middle">Plugboard</text>
<text x="181.0" y="147.0" font-size="14" text-anchor="middle">(input)</text>
<rect x="276" y="24" width="220" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="386.0" y="42.0" font-size="14" text-anchor="middle">The six letters</text>
<text x="386.0" y="60.0" font-size="14" text-anchor="middle">one switch bank,</text>
<text x="386.0" y="78.0" font-size="14" text-anchor="middle">25 positions</text>
<rect x="276" y="178" width="220" height="80" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="386.0" y="196.0" font-size="14" text-anchor="middle">The twenty letters</text>
<text x="386.0" y="214.0" font-size="14" text-anchor="middle">three switch banks</text>
<text x="386.0" y="232.0" font-size="14" text-anchor="middle">in a row, stepped</text>
<text x="386.0" y="250.0" font-size="14" text-anchor="middle">like an odometer</text>
<rect x="526" y="108" width="104" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="578.0" y="129.0" font-size="14" text-anchor="middle">Plugboard</text>
<text x="578.0" y="147.0" font-size="14" text-anchor="middle">(output)</text>
<line x1="96" y1="133" x2="126" y2="133" stroke="currentColor" stroke-width="1.4"/>
<polygon points="126,133 117.8,136.8 117.8,129.2" fill="currentColor"/>
<line x1="236" y1="120" x2="276" y2="66" stroke="currentColor" stroke-width="1.4"/>
<polygon points="276,66 274.2,74.8 268.1,70.3" fill="currentColor"/>
<line x1="236" y1="146" x2="276" y2="200" stroke="currentColor" stroke-width="1.4"/>
<polygon points="276,200 268.1,195.7 274.2,191.2" fill="currentColor"/>
<line x1="496" y1="66" x2="560" y2="108" stroke="currentColor" stroke-width="1.4"/>
<polygon points="560,108 551.1,106.7 555.3,100.3" fill="currentColor"/>
<line x1="496" y1="218" x2="560" y2="158" stroke="currentColor" stroke-width="1.4"/>
<polygon points="560,158 556.7,166.4 551.4,160.8" fill="currentColor"/>
<text x="320" y="292" font-size="13" text-anchor="middle">The enciphered letter is printed. Which six letters go the short way is part of the key.</text>
</svg>
<figcaption>Figure 14.2. The path of one letter through Purple (the Type 97 typewriter). The sixes went through one short stepping bank and kept a weakness from Red; the twenties took the Army's team eighteen months.</figcaption>
</figure>

The problem was given to a section led by Frank Rowlett, who was thirty-one in 1939, with William Friedman directing the whole of SIS. Rowlett was a Virginia schoolteacher who had joined Friedman in 1930. His team had the sixes within months, since the sixes behaved like Red. The twenties took them eighteen months. For most of 1939 and 1940, the members of the section sat at tables piled with intercepted Purple messages, writing out the letters of the twenties in grids and looking for relations among them. They had no machine, no captured manual, and no clue whether the box had rotors, gears or switches. They knew only what the ciphertext showed.

On 20 September 1940, Genevieve Grotjan found what they needed. She had been born in Buffalo, New York, studied mathematics at the university there, and joined the Army's Signal Intelligence Service in 1939 as a junior cryptanalyst after a civil service examination. According to Rowlett's own account, written down decades later in *The Story of Magic*, she had been working through the grids of letters and noticed that certain pairs of cipher letters recurred at different positions in messages from different days, in a regular relation. That could only happen if the machine's alphabets advanced through a regular series of arrangements. She brought the pattern to Rowlett, and by his account the whole section stopped work to celebrate. The scene comes from Rowlett's memory more than half a century later, so the details are best held lightly. What is not in doubt is the date, the name and the nature of the find: she was the first to see that the twenties were permuted by a regular step.

The pattern did not say how the machine was built. That took a second person. Leo Rosen was an electrical engineer in the Signal Corps who worked with the SIS, and he looked at what the cryptanalysts had drawn out of the ciphertext and realized that it was what stepping switches would produce. The team ordered the parts from ordinary telephone suppliers, and Rosen and others assembled a machine that did what Purple did, a **Purple analog**, an imitation of a device that none of them had ever seen. Within days of the 20 September insight the team was reading messages by hand; the analog, built over the weeks that followed, removed the hand work. More analogs followed; accounts differ on how many were built and by whom.

Friedman, who directed the work, collapsed. He had worked himself hard for years, and at the turn of 1940 to 1941 he was hospitalized for what the doctors called nervous exhaustion. Accounts differ on how long he stayed away (weeks, or several months). Rowlett had led the daily work, and the credit within the Army has been argued ever since. Friedman's admirers, including his biographer Ronald Clark, whose 1977 book was called *The Man Who Broke Purple*, give him the first place; Rowlett, writing in 1998 after Friedman's death, gives most of it to the team. The record supports a division of the credit: Friedman built the organization and chose the people, Rowlett led the attack, Grotjan saw the pattern, Rosen found the mechanism.

In February 1941, under an exchange agreed with Britain, four Americans, Abraham Sinkov and Leo Rosen of the Army and Robert Weeks and Prescott Currier of the Navy, took a Purple analog to Bletchley Park and received in return what the British were willing to show them of their Enigma work. The partnership between the American and British codebreakers, formalized in 1943 and still alive today, began there, with a machine that a young woman's pattern had made possible.

!!! note "Life story: Genevieve Grotjan"
    **Born:** 1913 in Buffalo, New York; later known as Genevieve Grotjan Feinstein; died 2006 · **Purpose:** to find the structure of Purple's twenty-letter side from intercepts alone, as a junior cryptanalyst in the Army's Signal Intelligence Service · **Helped:** on 20 September 1940 saw the recurrence of letter pairs that showed the twenties were permuted by a regular step, which led within days to the first readings and, with Leo Rosen's insight, to the analog · **Status:** remembered for the 20 September insight; her later career is little documented

!!! note "Life story: the Purple machine"
    **Born:** introduced by the Japanese foreign ministry in February 1939 (the Type 97 Alphabetical Typewriter, or Type B) · **Purpose:** to protect Japan's most secret diplomatic traffic, replacing the Red machine · **Helped:** Japanese ambassadors in Berlin, Rome, Washington and elsewhere sent messages that the Allies read as Magic from September 1940 · **Retired:** 1945; no Purple machine was ever captured whole, and fragments were found in the ruins of the embassy in Berlin · **Replaced by:** nothing; Japan never knew it had been broken

### In the real world

The sources are Rowlett's *The Story of Magic* (1998), the NSA's Friedman papers and oral histories, and Kahn's *The Codebreakers*. The date of Grotjan's find, 20 September 1940, appears in all of them. The number of analogs built varies from source to source, and so do the days on which the first complete message was read: a story clear in outline and uncertain in the details people like to repeat.

## 14.5 Magic: what was read and what it changed

*Level: beginner.*

From the autumn of 1940 the decrypts of Japan's diplomatic traffic were called **Magic**. The word first meant Purple, and then everything the Americans read of Japan's foreign ministry. Magic went to a very short list: the President, the Secretaries of War, the Navy and State, the Army and Navy chiefs and a few others. Couriers carried folders to them, waited, and took them back.

Before Pearl Harbor, Magic showed Japan moving toward war. It showed Tokyo setting deadlines for the talks in Washington in November 1941 and refusing to move on them. On 6 December and the morning of 7 December, Magic carried a long note from Tokyo to the embassy, in fourteen parts, rejecting the American position and breaking off the talks, with an instruction to deliver it at one o'clock that afternoon, Washington time. Thirteen parts were read in Washington on the evening of the 6th, and the last the next morning. Officers noticed the odd hour, and George Marshall, the Army chief of staff, drafted a last warning to the Pacific commands; it went by commercial telegram and reached Hawaii after the attack. The Japanese embassy was slow in typing its copy. The attack began at 7:55 in the morning in Hawaii, about 1:25 in the afternoon in Washington, and the ambassadors reached Secretary of State Cordell Hull at about 2:20. Hull had already seen the decrypted text.

What Magic did not say was where the blow would fall. Purple carried diplomacy, and the Japanese navy's plan for Pearl Harbor traveled in naval codes and, for the most part, did not travel by radio at all, since the carriers sailed under radio silence. A message of 24 September 1941 from Tokyo to the consulate in Honolulu, asking for a map of the harbor divided into five areas with the positions of ships, was in a lower-grade consular code. It was read in Washington in early October, after a backlog, and nobody in Washington treated it as an attack order. Whether a better-organized service could have drawn a conclusion from it, and whether Washington should have sent Magic to Hawaii (it did not), is one of the great arguments of American history; §14.15 sketches it.

During the war Magic's chief value was in Europe. General Hiroshi Ōshima, Japan's ambassador in Berlin, was close to Hitler and Ribbentrop, spoke German, and wrote long reports to Tokyo of what they told him. In November 1943 he toured the German defenses in France, and he described them in detail: the strong points, the guns, the beach obstacles. US Army Chief of Staff George Marshall later called Ōshima's messages the main source of information on Hitler's intentions, and they helped the Allies in planning the invasion of Normandy. Ōshima, after the war, was tried in Tokyo as a war criminal, sentenced to life, and released in 1955.

Japan never learned that Purple was broken. Magic became public in the Congressional investigation of Pearl Harbor in 1945 and 1946; the story of the break came out later, in Kahn's *The Codebreakers* (1967) and Rowlett's memoir (1998).

## 14.6 Station Hypo, JN-25 and Midway

*Level: beginner.*

The Japanese navy's own traffic was not in Purple. It was in JN-25, the five-digit code that §14.2 introduced, and the Americans read it in a basement at Pearl Harbor.

Joseph Rochefort was born in Dayton, Ohio, in 1900. He enlisted in the Navy in 1918, was commissioned from the ranks, and in the mid-1920s joined the Navy's cryptanalytic office in Washington, where §14.2 found him. From 1929 he was a Japanese language officer in Tokyo, three years of study that gave him the language and the habits of Japanese naval writing. In June 1941 he took command of the Combat Intelligence Unit of the Fourteenth Naval District, known by its radio call name, Station HYPO, working in a windowless basement of the district headquarters that the staff called the Dungeon. His people included Thomas Dyer, the unit's leading cryptanalyst; Joseph Finnegan and Wesley Wright, linguists and analysts; and Jasper Holmes, a former submarine officer who wrote magazine stories. The fleet intelligence officer, Edwin Layton, carried Rochefort's estimates to Admiral Chester Nimitz. Washington did not send Purple decrypts to Hawaii, so Rochefort worked without Magic.

After Pearl Harbor the target was JN-25B, the edition then in use, and the work was divided among HYPO, OP-20-G in Washington, Station CAST on Corregidor, and a few others. The system is described in [Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md): a code book of five-digit groups with an additive on top, whose reused stretches put messages "in depth" and gave the analysts their opening. By the spring of 1942 the stations could read parts of many messages. The figure most accounts give is that the analysts could recover only about 10 to 15 percent of the code groups in a typical message, some put it higher, and the share varied with the date and with whose count one takes. That was enough for an experienced team to see the shape of Japanese plans.

In May 1942 HYPO found that a large operation was planned against a place the Japanese called "AF". Rochefort believed AF was Midway, the small island at the western end of the Hawaiian chain. Washington was not so sure; some there thought the target lay elsewhere, the Aleutians among the guesses. To test the guess, Midway was told to send a message in plain language saying that its water distillation plant had broken down. A Japanese message soon reported, in JN-25, that AF was short of water. The trick is a **chosen-plaintext attack** on a code book: the codebreakers choose a fact for the enemy to repeat, and then see which code group carries it (Figure 14.3).

<figure class="mars-fig">
<svg viewBox="0 0 640 252" width="640" role="img" aria-label="The Midway water message in four steps" fill="currentColor" font-size="14">
<rect x="10" y="14" width="290" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155.0" y="37.0" font-size="14" text-anchor="middle">1. Pearl Harbor (HYPO)</text>
<text x="155.0" y="55.0" font-size="14" text-anchor="middle">reads JN-25: a big attack is</text>
<text x="155.0" y="73.0" font-size="14" text-anchor="middle">coming on a place called AF</text>
<rect x="340" y="14" width="290" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="485.0" y="37.0" font-size="14" text-anchor="middle">2. Midway is told to radio,</text>
<text x="485.0" y="55.0" font-size="14" text-anchor="middle">in plain language, that its</text>
<text x="485.0" y="73.0" font-size="14" text-anchor="middle">fresh-water plant has failed</text>
<rect x="340" y="136" width="290" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="485.0" y="159.0" font-size="14" text-anchor="middle">3. A Japanese listening post</text>
<text x="485.0" y="177.0" font-size="14" text-anchor="middle">picks it up and reports, in</text>
<text x="485.0" y="195.0" font-size="14" text-anchor="middle">JN-25: AF is short of water</text>
<rect x="10" y="136" width="290" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155.0" y="159.0" font-size="14" text-anchor="middle">4. HYPO reads the report:</text>
<text x="155.0" y="177.0" font-size="14" text-anchor="middle">AF is Midway. Nimitz places</text>
<text x="155.0" y="195.0" font-size="14" text-anchor="middle">his carriers to meet it</text>
<line x1="300" y1="50" x2="340" y2="50" stroke="currentColor" stroke-width="1.4"/>
<polygon points="340,50 331.8,53.8 331.8,46.2" fill="currentColor"/>
<line x1="485" y1="86" x2="485" y2="136" stroke="currentColor" stroke-width="1.4"/>
<polygon points="485,136 481.2,127.8 488.8,127.8" fill="currentColor"/>
<line x1="340" y1="172" x2="300" y2="172" stroke="currentColor" stroke-width="1.4"/>
<polygon points="300,172 308.2,168.2 308.2,175.8" fill="currentColor"/>
<text x="320" y="240" font-size="13" text-anchor="middle">A chosen-plaintext attack on a code book: the codebreakers choose what the enemy will say.</text>
</svg>
<figcaption>Figure 14.3. How Station HYPO tested its guess in May 1942. Accounts differ on who proposed the trick and on the exact date and route of the message (see the section).</figcaption>
</figure>

Who thought of the water message is disputed. Layton's memoir and many accounts credit Rochefort; Holmes, in his own book, claimed the idea; others say it came from Nimitz's staff. The details of the date and the route differ too: some tell of a cable, others of a radio message sent in the open, "about 20 May". The story's outline is the same in all of them, and the sources I know agree that the confirmation of AF came just after.

HYPO's estimate of the Japanese plan was precise. Layton later wrote that on 2 June he told Nimitz the Japanese carriers would be sighted northwest of Midway on a bearing of 325 degrees at about 175 miles at six in the morning on 4 June. A change of Japanese code books planned for 1 April had been postponed twice and took effect only on 28 May (the sources differ by a few days), after most of the Midway orders had gone out. Nimitz put his three carriers northeast of Midway and, on 4 June, American dive-bombers sank the *Akagi*, *Kaga* and *Sōryū* in minutes, and later the *Hiryū*. The Americans lost the *Yorktown* and a destroyer on 6 and 7 June. The battle, 4 to 7 June 1942, is often called the turning point of the Pacific war. Codebreaking did not win it alone; American pilots, luck and Japanese mistakes won it too. The intelligence put the carriers in the right place at the right time, which is why it counts.

The aftermath is a lesson in the politics of credit. Rochefort was outspoken, and he clashed with the staff in Washington, among them, by most accounts, the Redman brothers, Joseph in naval communications and John at OP-20-G. In October 1942 Rochefort was recalled from Pearl Harbor and moved away from cryptanalysis. Nimitz had recommended him for a Distinguished Service Medal for Midway; it was not approved. He received it only in 1986, ten years after his death. The Pearl Harbor station went on to read the itinerary of Admiral Isoroku Yamamoto's inspection tour of the Solomon Islands, and on 18 April 1943 US Army P-38 fighters shot down his plane over Bougainville. §14.15 returns to the arguments over who deserved what.

!!! note "Life story: Joseph Rochefort and Station HYPO"
    **Born:** Rochefort, 12 May 1900, Dayton, Ohio; died 20 July 1976. HYPO, formed in 1941 in the basement of the Fourteenth Naval District headquarters, Pearl Harbor · **Purpose:** to read the Japanese navy's codes, JN-25 above all, for the Pacific Fleet · **Helped:** the estimates that led Nimitz to put his carriers in position at Midway on 4 June 1942, and the Yamamoto intercept of April 1943 · **Status:** HYPO's work continued under others; Rochefort was moved in October 1942 and received his Distinguished Service Medal in 1986, ten years after his death

### In the real world

The best source for Rochefort is Elliot Carlson's *Joe Rochefort's War* (2011). Layton's *"And I Was There"* (1985) is a primary account, and Holmes's *Double-Edged Secrets* (1979) gives the view from the Dungeon; each is the account of a man who was there, with his own part in view, and where they disagree on the water message I have said so. The 325-degree estimate is Layton's; other sources give the figures slightly differently. No source doubts that HYPO read enough of JN-25 in May 1942 to identify the target and the time.

## 14.7 The wider Pacific: Melbourne, Brisbane and the Nisei

*Level: beginner.*

Hawaii was one of several places in the Allied network (Figure 14.4). When the Philippines fell in the spring of 1942, the Navy's team on Corregidor, Station CAST, was evacuated by submarine and reached Melbourne, where it joined an Australian and American Navy group as FRUMEL, the Fleet Radio Unit, Melbourne. In April 1942 General Douglas MacArthur's headquarters set up the **Central Bureau** in Melbourne, later Brisbane, an Australian and American Army group that took the Japanese army's codes. Both depended on intercepts from stations in Australia, New Guinea and the islands.

<figure class="mars-fig">
<svg viewBox="0 0 640 334" width="640" role="img" aria-label="Where the Allied services that read Japanese traffic sat and how they exchanged results" fill="currentColor" font-size="14">
<rect x="10" y="20" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95.0" y="38.0" font-size="14" text-anchor="middle">Tokyo (the target)</text>
<text x="95.0" y="56.0" font-size="14" text-anchor="middle">Army, Navy and</text>
<text x="95.0" y="74.0" font-size="14" text-anchor="middle">Foreign Ministry</text>
<rect x="235" y="20" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="38.0" font-size="14" text-anchor="middle">Washington</text>
<text x="320.0" y="56.0" font-size="14" text-anchor="middle">OP-20-G (Navy)</text>
<text x="320.0" y="74.0" font-size="14" text-anchor="middle">Arlington Hall (Army)</text>
<rect x="460" y="20" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="545.0" y="38.0" font-size="14" text-anchor="middle">Bletchley Park</text>
<text x="545.0" y="56.0" font-size="14" text-anchor="middle">(chapter 13)</text>
<text x="545.0" y="74.0" font-size="14" text-anchor="middle">and the British</text>
<rect x="10" y="128" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95.0" y="146.0" font-size="14" text-anchor="middle">Pearl Harbor</text>
<text x="95.0" y="164.0" font-size="14" text-anchor="middle">Station HYPO</text>
<text x="95.0" y="182.0" font-size="14" text-anchor="middle">(Navy)</text>
<rect x="460" y="128" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="545.0" y="146.0" font-size="14" text-anchor="middle">Delhi</text>
<text x="545.0" y="164.0" font-size="14" text-anchor="middle">Wireless Experimental</text>
<text x="545.0" y="182.0" font-size="14" text-anchor="middle">Centre (1942-45)</text>
<rect x="10" y="236" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="95.0" y="254.0" font-size="14" text-anchor="middle">Melbourne</text>
<text x="95.0" y="272.0" font-size="14" text-anchor="middle">FRUMEL (Navy,</text>
<text x="95.0" y="290.0" font-size="14" text-anchor="middle">Australia and US)</text>
<rect x="235" y="236" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="254.0" font-size="14" text-anchor="middle">Brisbane</text>
<text x="320.0" y="272.0" font-size="14" text-anchor="middle">Central Bureau</text>
<text x="320.0" y="290.0" font-size="14" text-anchor="middle">(Army)</text>
<rect x="460" y="236" width="170" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="545.0" y="254.0" font-size="14" text-anchor="middle">Chongqing</text>
<text x="545.0" y="272.0" font-size="14" text-anchor="middle">Chinese Nationalist</text>
<text x="545.0" y="290.0" font-size="14" text-anchor="middle">cipher bureaus</text>
<line x1="405" y1="51" x2="460" y2="51" stroke="currentColor" stroke-width="1.4"/>
<polygon points="460,51 451.8,54.8 451.8,47.2" fill="currentColor"/>
<line x1="460" y1="51" x2="405" y2="51" stroke="currentColor" stroke-width="1.4"/>
<polygon points="405,51 413.2,47.2 413.2,54.8" fill="currentColor"/>
<line x1="270" y1="82" x2="120" y2="128" stroke="currentColor" stroke-width="1.4"/>
<polygon points="120,128 126.7,122.0 128.9,129.2" fill="currentColor"/>
<line x1="120" y1="128" x2="270" y2="82" stroke="currentColor" stroke-width="1.4"/>
<polygon points="270,82 263.3,88.0 261.1,80.8" fill="currentColor"/>
<line x1="95" y1="190" x2="95" y2="236" stroke="currentColor" stroke-width="1.4"/>
<polygon points="95,236 91.2,227.8 98.8,227.8" fill="currentColor"/>
<line x1="95" y1="236" x2="95" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="95,190 98.8,198.2 91.2,198.2" fill="currentColor"/>
<line x1="180" y1="267" x2="235" y2="267" stroke="currentColor" stroke-width="1.4"/>
<polygon points="235,267 226.8,270.8 226.8,263.2" fill="currentColor"/>
<line x1="235" y1="267" x2="180" y2="267" stroke="currentColor" stroke-width="1.4"/>
<polygon points="180,267 188.2,263.2 188.2,270.8" fill="currentColor"/>
<line x1="320" y1="82" x2="320" y2="236" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320,236 316.2,227.8 323.8,227.8" fill="currentColor"/>
<line x1="320" y1="236" x2="320" y2="82" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320,82 323.8,90.2 316.2,90.2" fill="currentColor"/>
<line x1="545" y1="82" x2="545" y2="128" stroke="currentColor" stroke-width="1.4"/>
<polygon points="545,128 541.2,119.8 548.8,119.8" fill="currentColor"/>
<line x1="545" y1="128" x2="545" y2="82" stroke="currentColor" stroke-width="1.4"/>
<polygon points="545,82 548.8,90.2 541.2,90.2" fill="currentColor"/>
<line x1="545" y1="190" x2="545" y2="236" stroke="currentColor" stroke-width="1.4"/>
<polygon points="545,236 541.2,227.8 548.8,227.8" fill="currentColor"/>
<line x1="545" y1="236" x2="545" y2="190" stroke="currentColor" stroke-width="1.4"/>
<polygon points="545,190 548.8,198.2 541.2,198.2" fill="currentColor"/>
<text x="320" y="322" font-size="13" text-anchor="middle">Arrows show where results were passed. Tokyo is the target, not a partner. Simplified.</text>
</svg>
<figcaption>Figure 14.4. The Allied network against Japan, drawn as boxes, not a map. Washington held the diplomatic machine; the Pacific stations held the naval and army codes; Delhi and Chongqing worked on the army traffic from the west.</figcaption>
</figure>

The Japanese army's codes were harder and better run than the navy's. They were read on a large scale only from early 1944, after a codebook and its additive tables, left behind by the Japanese 20th Division, were captured, by the usual account by Australian troops, at Sio on the New Guinea coast in January 1944 and passed to Central Bureau. The new readings gave MacArthur's staff the Japanese army's order of battle in New Guinea, and by the usual account the landing at Hollandia in April 1944 was made where the garrison was weak. Women of the Australian Women's Army Service and the American Women's Army Corps worked there as typists and analysts; I have no reliable count.

A less noticed part of the story is language. The Allied cryptanalysts in the Pacific were helped by thousands of translators, and the most important group was the Nisei, American-born Japanese. The US Army's Military Intelligence Service trained them from late 1941 at a school that opened in San Francisco, moved to Camp Savage, Minnesota, and later to Fort Snelling. Several thousand served, as interpreters, document translators and interrogators, at Guadalcanal and Burma and at the Japanese surrender. They did so while their families were held behind barbed wire. Executive Order 9066, signed on 19 February 1942, led to the removal of about 120,000 Japanese Americans from the West Coast to camps inland, most of them citizens. Some of the translators were recruited out of those camps, to read captured Japanese documents for the army that held their parents behind wire.

## 14.8 The code talkers

*Level: beginner.*

The Marines in the Pacific had a different problem from Station HYPO. On a beach at night, a platoon's radio operator might have to report a position or call for artillery in seconds. A cipher machine was too big to carry ashore, and enciphering a message by hand, with a code book and a table, took half an hour, sometimes more. Plain speech could be heard by Japanese listeners, some of whom spoke English.

Philip Johnston proposed the answer in the first months of 1942. He was a civil engineer in Los Angeles and a veteran of the First World War, the son of a missionary to the Navajo, who had grown up on the reservation and spoke Navajo as a child. According to his own account, he got the idea from a newspaper story about an army unit looking for a secure way to pass messages, and he thought of the Navajo, whose language was unwritten, difficult, and spoken by almost no one outside the tribe. (The Choctaw of 1918, told in [chapter 11](11-Radio-War-and-the-One-Time-Pad.md), were the precedent, though he does not seem to have started from them.) He demonstrated the idea to a Marine general at Camp Elliott near San Diego in February 1942. As the story is usually told, a message that took half an hour to encipher by machine took the Navajo men about 20 seconds. The Marine Corps approved a pilot group, and in May 1942 the first 29 Navajo recruits, taken mostly from the reservation near Fort Defiance, Arizona, were trained in San Diego and then devised their code at Camp Pendleton.

Their first task was to build the code. They did not use plain Navajo, which any speaker could have understood; they made a **code in Navajo**. Terms the language had no word for were given a Navajo word that stood for them: a battleship was a whale (*lo-tso*), a destroyer a shark (*ca-lo*), a submarine an iron fish (*besh-lo*), a dive-bomber a chicken hawk (*gini*), a fighter plane a hummingbird (*da-he-tih-hi*), and the United States "our mother". The first list had 211 terms; by 1945 the list had grown to 411. Anything outside it was spelled. Each letter had a Navajo word for an animal or object whose English name began with it, and A was *wol-la-chee*, ant. Figure 14.5 shows the English meanings. The most frequent letters had two or three words to choose from, so that no single word stood out in a count.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The Navajo code talkers' spelling alphabet and a few of their words for military things" fill="currentColor" font-size="14">
<text x="20" y="22" font-size="14" text-anchor="start" font-weight="bold">Spelling words (the English meaning of the Navajo word spoken):</text>
<text x="30" y="50" font-size="14" text-anchor="start" font-weight="bold">A</text>
<text x="54" y="50" font-size="14" text-anchor="start">ant</text>
<text x="30" y="72" font-size="14" text-anchor="start" font-weight="bold">B</text>
<text x="54" y="72" font-size="14" text-anchor="start">bear</text>
<text x="30" y="94" font-size="14" text-anchor="start" font-weight="bold">C</text>
<text x="54" y="94" font-size="14" text-anchor="start">cat</text>
<text x="30" y="116" font-size="14" text-anchor="start" font-weight="bold">D</text>
<text x="54" y="116" font-size="14" text-anchor="start">deer</text>
<text x="30" y="138" font-size="14" text-anchor="start" font-weight="bold">E</text>
<text x="54" y="138" font-size="14" text-anchor="start">elk</text>
<text x="30" y="160" font-size="14" text-anchor="start" font-weight="bold">F</text>
<text x="54" y="160" font-size="14" text-anchor="start">fox</text>
<text x="30" y="182" font-size="14" text-anchor="start" font-weight="bold">G</text>
<text x="54" y="182" font-size="14" text-anchor="start">goat</text>
<text x="180" y="50" font-size="14" text-anchor="start" font-weight="bold">H</text>
<text x="204" y="50" font-size="14" text-anchor="start">horse</text>
<text x="180" y="72" font-size="14" text-anchor="start" font-weight="bold">I</text>
<text x="204" y="72" font-size="14" text-anchor="start">ice</text>
<text x="180" y="94" font-size="14" text-anchor="start" font-weight="bold">J</text>
<text x="204" y="94" font-size="14" text-anchor="start">jackass</text>
<text x="180" y="116" font-size="14" text-anchor="start" font-weight="bold">K</text>
<text x="204" y="116" font-size="14" text-anchor="start">kid</text>
<text x="180" y="138" font-size="14" text-anchor="start" font-weight="bold">L</text>
<text x="204" y="138" font-size="14" text-anchor="start">lamb</text>
<text x="180" y="160" font-size="14" text-anchor="start" font-weight="bold">M</text>
<text x="204" y="160" font-size="14" text-anchor="start">mouse</text>
<text x="180" y="182" font-size="14" text-anchor="start" font-weight="bold">N</text>
<text x="204" y="182" font-size="14" text-anchor="start">nut</text>
<text x="330" y="50" font-size="14" text-anchor="start" font-weight="bold">O</text>
<text x="354" y="50" font-size="14" text-anchor="start">owl</text>
<text x="330" y="72" font-size="14" text-anchor="start" font-weight="bold">P</text>
<text x="354" y="72" font-size="14" text-anchor="start">pig</text>
<text x="330" y="94" font-size="14" text-anchor="start" font-weight="bold">Q</text>
<text x="354" y="94" font-size="14" text-anchor="start">quiver</text>
<text x="330" y="116" font-size="14" text-anchor="start" font-weight="bold">R</text>
<text x="354" y="116" font-size="14" text-anchor="start">rabbit</text>
<text x="330" y="138" font-size="14" text-anchor="start" font-weight="bold">S</text>
<text x="354" y="138" font-size="14" text-anchor="start">sheep</text>
<text x="330" y="160" font-size="14" text-anchor="start" font-weight="bold">T</text>
<text x="354" y="160" font-size="14" text-anchor="start">turkey</text>
<text x="330" y="182" font-size="14" text-anchor="start" font-weight="bold">U</text>
<text x="354" y="182" font-size="14" text-anchor="start">Ute</text>
<text x="480" y="50" font-size="14" text-anchor="start" font-weight="bold">V</text>
<text x="504" y="50" font-size="14" text-anchor="start">victor</text>
<text x="480" y="72" font-size="14" text-anchor="start" font-weight="bold">W</text>
<text x="504" y="72" font-size="14" text-anchor="start">weasel</text>
<text x="480" y="94" font-size="14" text-anchor="start" font-weight="bold">X</text>
<text x="504" y="94" font-size="14" text-anchor="start">cross</text>
<text x="480" y="116" font-size="14" text-anchor="start" font-weight="bold">Y</text>
<text x="504" y="116" font-size="14" text-anchor="start">yucca</text>
<text x="480" y="138" font-size="14" text-anchor="start" font-weight="bold">Z</text>
<text x="504" y="138" font-size="14" text-anchor="start">zinc</text>
<text x="20" y="226" font-size="14" text-anchor="start" font-weight="bold">Words for things (English meaning on the left):</text>
<text x="30" y="250" font-size="14" text-anchor="start">battleship = whale</text>
<text x="30" y="272" font-size="14" text-anchor="start">destroyer = shark</text>
<text x="30" y="294" font-size="14" text-anchor="start">submarine = iron fish</text>
<text x="330" y="250" font-size="14" text-anchor="start">dive-bomber = chicken hawk</text>
<text x="330" y="272" font-size="14" text-anchor="start">fighter plane = hummingbird</text>
<text x="330" y="294" font-size="14" text-anchor="start">America = our mother</text>
</svg>
<figcaption>Figure 14.5. The core of the Navajo code. A word with no code term was spelled by saying the Navajo word for an animal or object whose English name began with each letter. The common letters had extra words (A could also be apple or axe).</figcaption>
</figure>

That is the old idea of the homophone ([chapter 6](06-Italy-Ambassadors-and-Nomenclators.md)) applied to speech. The program spells a 131-letter message with one word per letter, then with three words for the commonest letters, and counts which word is spoken most. It uses the English meanings of the real spelling words; the extra words for A are real, and the others are mine.

```python
import random
from collections import Counter
random.seed(1942)

# One word for each letter: the English meanings of the words the Navajo said.
single = dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "ant bear cat deer elk fox goat horse ice jackass kid lamb mouse nut owl "
    "pig quiver rabbit sheep turkey ute victor weasel cross yucca zinc".split()))

# The real code gave the commonest letters extra words. A's extras (apple, axe)
# are real; the other extras here are my own, to show the effect.
extra = {"A": ["apple", "axe"], "E": ["eye", "ear"], "T": ["tree", "tea"],
         "O": ["oil", "ox"], "I": ["ink", "iron"], "N": ["net", "nose"],
         "S": ["snake", "salt"], "H": ["hat", "hawk"], "R": ["rope", "ram"]}

def spell(text, many):
    words = []
    for ch in text:
        if ch not in single:
            continue
        choices = [single[ch]] + (extra.get(ch, []) if many else [])
        words.append(random.choice(choices))
    return words

message = ("THE TWO COMPANIES LANDED ON THE SOUTH BEACH AT DAWN AND ARE HOLDING "
           "THE RIDGE ABOVE THE AIRFIELD SEND MORE AMMUNITION AND TWO STRETCHER "
           "TEAMS TO THE NORTH SIDE")

for many in (False, True):
    stream = spell(message, many)
    top = Counter(stream).most_common(3)
    label = "three words for common letters" if many else "one word per letter"
    print(label + ":", len(stream), "words spoken")
    print("  commonest:", ", ".join(f"{w} {100 * n / len(stream):.0f}%" for w, n in top))
```

Output:

```
one word per letter: 131 words spoken
  commonest: elk 14%, turkey 11%, ant 9%
three words for common letters: 131 words spoken
  commonest: deer 8%, eye 5%, net 5%
```

With one word per letter, *elk* (E) stands out at 14 percent, and an enemy who could record the traffic could tell the commonest word from the rest, just as al-Kindi's method of [chapter 4](04-Baghdad-and-Cairo.md) finds E in a substitution. With the extra words the peak drops to 8 percent, and the word at the top is *deer*, a letter with no extras. It is a toy, since an enemy who did not know the language could not match words to letters at all, but it shows why the designers gave the busiest letters more than one word.

### Where and how many

Navajo code talkers served with the Marines from Guadalcanal in August 1942 through Tarawa, Saipan, Guam, Peleliu and Iwo Jima to Okinawa. Marine Corps sources and the Navajo Nation give the number who served as about 400, with sources running from the high 300s to 420; the total trained is argued. At Iwo Jima, in February 1945, Major Howard Connor, the signal officer of the 5th Marine Division, is reported to have said that in the two days after the landings six Navajo networks worked around the clock and sent and received more than 800 messages without error (some sources give 600 to 800), and that without the Navajos the Marines would never have taken the island. The quotation is widely printed; treat it as a witness's verdict, not a measurement.

The Japanese heard the traffic and could not read it. A Navajo soldier of the US Army, Joe Kieyoomia, captured on Bataan, was made to listen to intercepted Navajo transmissions and translate them; he could not, because he did not know the code, and was beaten for it. The story is told in several books on the code talkers; I have not checked the primary record. There are also stories that code talkers were assigned bodyguards, and that the bodyguards had orders to kill them rather than let them be captured; the Marine Corps has treated that as unproven.

### The others

The Navajo were the largest group, not the only one. Native American soldiers from more than a dozen nations served as code talkers in the two world wars; the Choctaw of 1918 are in [chapter 11](11-Radio-War-and-the-One-Time-Pad.md).

- **Comanche.** Seventeen Comanche men were recruited into the US Army's 4th Signal Company; fourteen took part in the Normandy campaign, and thirteen, by the usual count, landed at Utah Beach on 6 June 1944. They made their own words where the language had none: a tank was a "turtle", and Hitler "the crazy white man". Charles Chibitty, the last survivor, died in 2005.
- **Meskwaki.** Twenty-seven Meskwaki men from Iowa enlisted together in January 1941, about a sixth of the tribe. Eight were trained to pass messages in their language and served with the army in North Africa in 1942 and 1943. They were honored with the Congressional Gold Medal in 2013, as part of the recognition of code talkers from 33 tribes. The numbers differ between sources.
- **Basque.** A few accounts, mostly from Basque American communities, say that US forces used Basque speakers on the radio in the Pacific in 1942. I could not find a primary record, and the Navajo program is the documented one.

The Navajo code stayed secret until 1968. The US government recognized the code talkers late: President Reagan declared a National Code Talkers Day in 1982, Congress gave the original 29 Navajo recruits a Gold Medal in 2001, and the Code Talkers Recognition Act of 2008 extended the honor to other tribes.

### In the real world

These systems worked because the languages were unwritten or little studied outside their communities, not because of any mathematics. The Navajo code was a **code**, not a cipher: words for things, with a spelling alphabet. Its security rested on a single fact, that the Japanese had nobody who spoke Navajo, and it would have failed if they had. There is a claim, repeated since Johnston's own account, that German and Japanese students had studied Native American languages before the war; I know of no document that proves it. The code's real military virtue was speed and fit: it worked on a beach, with a field radio, at night. Its limit was the number of speakers, and that is why other nations' languages were used for other units.

!!! note "Life story: the Navajo code"
    **Born:** proposed by Philip Johnston in early 1942; the first 29 Navajo recruits built it at Camp Pendleton in May 1942 · **Purpose:** to pass battlefield radio messages for the US Marine Corps that the Japanese could hear and not read · **Helped:** the Marines in the Pacific from Guadalcanal to Okinawa; at Iwo Jima six networks ran day and night · **Retired:** after 1945; the code was declassified in 1968

!!! note "Life story: the Comanche and Meskwaki code talkers"
    **Born:** the Meskwaki group enlisted in January 1941; the Comanche group was recruited into the 4th Signal Company of the US 4th Infantry Division in 1941 · **Purpose:** to pass messages in their own languages for the US Army, in North Africa (Meskwaki) and in Normandy (Comanche) · **Helped:** the army's campaigns in North Africa, and the landing at Utah Beach on 6 June 1944 · **Status:** honored with the Congressional Gold Medal (2013); Charles Chibitty, the last Comanche code talker, died in 2005

## 14.9 Japan's own codebreakers

*Level: intermediate.*

Japan's organized cryptanalysis began late. When its army intervened in Siberia in 1918 to 1922, it could not read Soviet messages, and it asked for help from Poland, which had read Soviet traffic in the war of 1919 to 1920. A Polish officer, Jan Kowalewski, who had broken Soviet ciphers for the Polish general staff, went to Japan and taught a course to Japanese officers. The date is uncertain: Polish sources I found give 1923, and some English accounts say 1924 (with a day of 7 September 1924 for his arrival at Yokohama, from a weak source that I do not trust). I give it as about 1923 to 1924. [Chapter 12](12-Rotors-and-Enigma.md) picks up the Polish story.

By the Second World War Japan had three services. The Army General Staff had a cipher section, the Navy a special section, and the Foreign Ministry its own office, and like their American counterparts they did not share much. Much of the record was burned in August 1945. The main sources are interrogations of former members by American teams (the TICOM project, which questioned German and Japanese cryptologists after the surrender), and summaries of them, which describe work on Chinese government and warlord systems, Soviet and low-grade British, Dutch and American traffic, and the diplomatic codes of the United States, Britain, China and France. How much they read, and when, is far less well documented in English than the Allied story. As far as I can tell, Japan read Chinese ciphers well, read some of the enemy's lower-grade systems, and never broke the American machine systems.

The sharpest asymmetry is in how each side judged its own security. The Americans read Purple for five years. Japanese officials, according to the American postwar interrogations and the histories built on them, looked into the safety of their machine more than once and concluded it was secure, and put the signs of leakage, such as signs that the Allies knew too much, down to spies and careless staff. The same pattern, in which the owner of a system cannot imagine it broken, is told of Germany and Enigma in [chapter 12](12-Rotors-and-Enigma.md) and [chapter 13](13-Bletchley-Park.md).

!!! note "Life story: Jan Kowalewski"
    **Born:** 1892, in Poland; died 1965 · **Purpose:** to break Soviet ciphers for the Polish general staff in 1919 and 1920, and then, in Tokyo, to teach Japanese officers · **Helped:** the Polish army in the war of 1920; about 1923 to 1924 gave Japanese officers a course in codebreaking · **Status:** the Tokyo course is poorly documented; his work for Poland is better known

## 14.10 China and India: Chongqing and Delhi

*Level: intermediate.*

China had fought Japan since 1937, and Japan read China's ciphers with ease. In 1938 Chiang Kai-shek's Nationalist government hired Herbert Yardley, the American who had run the Black Chamber in New York ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)) and then published a book that told the world about it. Yardley worked in Chongqing, the wartime capital, until 1940, teaching Chinese staff the methods of the American office and attacking Japanese army traffic. His memoir of the job, *The Chinese Black Chamber*, was published only in 1983, long after his death in 1958. It is a lively and one-sided witness, as his earlier books were.

The Chinese side is poorly covered in English, and I have not seen the Chinese documents. Chinese accounts describe several competing offices on the Nationalist side, in the Military Affairs Commission and the Military Statistics Bureau, and popular histories say that radio intelligence warned Chongqing of some air raids. The Communists have their own origin story. Chinese popular accounts, repeated in some English-language press, say that in 1930 and 1931 the Red Army captured Nationalist radios and operators, that Li Qiang built its first radio network, and that Zeng Xisheng's team read Nationalist army telegrams during the encirclement campaigns. I could not check these against primary documents. Names that circulate for other Chinese codebreakers I leave out, because I am not sure of them.

India's part is better recorded. When Japan overran Malaya and Singapore in early 1942, the British codebreakers of the Far East Combined Bureau were scattered, and much of the work on Japanese army codes was done at the **Wireless Experimental Centre** at Anand Parbat, outside Delhi. It was one of Bletchley Park's overseas outposts, with outstations at Abbottabad, Bangalore and Barrackpore, and by one count it grew to about a thousand people from the Intelligence Corps, the RAF, the Indian Army and West African units. In 1943 the mountaineer and poet Wilfrid Noyce, working there, broke the Japanese army's water transport code together with Maurice Allen, the first high-level army code the centre broke. (He was later on the 1953 Everest expedition and died in the Pamirs in 1962.) Delhi carried on the work that Bletchley's Far East section had begun on Japanese army and diplomatic traffic, in step with Central Bureau and with the army's campaign in Burma. The sources I know say much about the British staff and little about the Indians who served there as clerks, linguists and operators; that is a gap in the records, not in the work.

!!! note "Life story: the Wireless Experimental Centre, Delhi"
    **Born:** in Delhi in the early 1940s (accounts differ on the date); at Anand Parbat after the fall of Malaya and Singapore in 1942 · **Purpose:** to read Japanese army and air codes for the British and Indian armies · **Helped:** the Burma campaign, with outstations at Abbottabad, Bangalore and Barrackpore; about a thousand staff · **Status:** closed or absorbed after 1945; its Indian staff are little documented

## 14.11 Elizebeth Friedman and the spy rings of South America

*Level: intermediate.*

[Chapter 11](11-Radio-War-and-the-One-Time-Pad.md) told how Elizebeth Smith Friedman, born in Huntington, Indiana, in 1892, left Riverbank with her husband William, and in the 1920s and 1930s broke the ciphers of the rum-runners for the Coast Guard and the Treasury. By 1941 she led a Coast Guard cryptanalytic unit in Washington. On 1 November 1941 the Coast Guard passed to the Navy, by executive order, and her unit went with it, working on German traffic.

The target was the **Abwehr**, German military intelligence, and its agents in South America. In 1940 President Roosevelt gave the FBI the job of watching the Western Hemisphere, and the Bureau created the Special Intelligence Service (the second SIS; §14.1) to put agents in Latin America. Abwehr agents there sent reports to Germany by radio, and the Federal Communications Commission's radio intelligence division recorded the signals. The messages needed breaking. Some were hand ciphers. Others came from a machine of the Enigma family; Bletchley's Dilly Knox had broken the Abwehr's version in December 1941, and the British shared what they read. Friedman's unit solved what came its way, read the traffic of the networks, and passed the names and meeting places to the FBI and the British. One of the networks, called Bolívar in some secondary accounts, ran from Buenos Aires. I take that name from secondary accounts and have not seen the file.

How much of the unit's work was independent of Bletchley's I cannot say from what I have read. The main source is Jason Fagone's *The Woman Who Smashed Codes* (2017), which draws on Elizebeth's papers at the Marshall Foundation and on files the NSA released, and gives her unit a large independent part in the machine traffic; I hold that as probable, not proved. What is clear is that her group read the traffic of several Abwehr networks, that the networks were rolled up in 1943 and 1944 as Argentina, under American pressure, broke relations with Germany and Japan in January 1944, and that the FBI's director, J. Edgar Hoover, told the story as a triumph of his own agents. The Coast Guard unit had no way to answer, since its work was secret.

She was not allowed to talk about it, and she published nothing about it after the war; with her husband she wrote a book on the Shakespeare ciphers (1957). She died in 1980. Her part came out slowly, as the Friedman papers at the Marshall Foundation and NSA files were opened.

!!! note "Life story: Elizebeth Friedman's wartime unit"
    **Born:** Elizebeth Smith, 26 August 1892, Huntington, Indiana; died 31 October 1980. Her Coast Guard unit passed to the Navy on 1 November 1941 · **Purpose:** to break the radio traffic of German spy networks in Latin America · **Helped:** the FBI and British services close several Abwehr rings in 1943 and 1944 · **Status:** the unit's work stayed secret; the FBI took the public credit; her part came out slowly, in Fagone's 2017 biography among other places

## 14.12 Arlington Hall, Nebraska Avenue and the women who did the work

*Level: beginner.*

The Army and the Navy needed thousands of analysts, clerks and machine operators, and found them among women. Arlington Hall was a girls' junior college in Arlington, Virginia, that the Army took over in June 1942 for the Signal Intelligence Service, which in 1943 became the Signal Security Agency. The Navy took the campus of Mount Vernon Seminary on Nebraska Avenue in northwest Washington, the Naval Communications Annex. The Army recruited many of its analysts from the schoolteachers of Virginia and the South, the Navy by Liza Mundy's account from the women's colleges, the Seven Sisters among them, through letters to their deans. The Navy's women joined the WAVES, founded in July 1942; the Army's the Women's Army Corps (first the WAAC).

The numbers are uncertain because the records are scattered. Mundy, in *Code Girls* (2017), counts more than ten thousand women who worked in Army and Navy codebreaking during the war; Arlington Hall and the Annex each held several thousand at their peaks, and by most accounts women were the majority at both. The WAVES also ran the Navy's own bombes at the National Cash Register plant in Dayton, Ohio, which Joseph Desch built, about six hundred WAVES in Mundy's count ([chapter 13](13-Bletchley-Park.md) describes the bombe). The jobs ran from keypunch to cryptanalysis, and some women rose far: Ann Caracristi, who joined Arlington Hall in 1942, became in 1980 the first woman to be NSA's deputy director. Black women worked at Arlington Hall too, in segregated conditions. They signed oaths of secrecy that most kept for life, and many told their families nothing. After the war most were released as men came home; a few, like Caracristi, stayed and rose, but for years the senior jobs went to men.

!!! note "Life story: Arlington Hall and the Naval Communications Annex"
    **Born:** Arlington Hall, requisitioned by the Army in June 1942; the Annex, taken by the Navy in 1942 · **Purpose:** to house the Army's and the Navy's codebreakers for Japanese, German and Soviet traffic · **Helped:** Purple, JN-25, the Japanese army codes, the Navy's bombes, Venona · **Status:** Arlington Hall became the Army Security Agency's base; the Annex is now the headquarters of the Department of Homeland Security; the wartime workforce was mostly women, and counts vary

## 14.13 Venona I: the pad printed twice

*Level: intermediate.*

The Soviet Union protected its most secret messages with the one cipher that has a proof. [Book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) shows why a one-time pad is perfect if its key is random, as long as the message, and used once. Soviet intelligence, the NKVD and its successors, the military's GRU, the naval GRU, the diplomats and the trade missions all used a two-step scheme. A code book turned each word or phrase into a group of digits, and each group was then disguised by adding the digits of a pad page, by false addition, the same way JN-25's additive was applied. The sender had one copy of each page and the receiver the other.

The flaw was in the factory. In 1941 and 1942, with the German army at the gates of Moscow, the office that produced the pads was under heavy pressure, and some pages were printed twice. By the usual account, some tens of thousands of duplicate pages went into the pads of different users, in different cities, sometimes years apart. Why it happened is inferred, not documented; no Soviet record that I know of explains it. The evidence is in the messages, which show pages used twice. Two messages enciphered with the same page are a **two-time pad** (Figure 14.6): subtract one from the other and the page cancels, leaving the difference of two code groups.

<figure class="mars-fig">
<svg viewBox="0 0 640 324" width="640" role="img" aria-label="A pad page printed twice leads to two messages enciphered with the same key, so subtracting them removes the key" fill="currentColor" font-size="14">
<rect x="200" y="12" width="240" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="34.0" font-size="14" text-anchor="middle">One pad page,</text>
<text x="320.0" y="52.0" font-size="14" text-anchor="middle">printed twice in 1942</text>
<rect x="20" y="112" width="270" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="155.0" y="130.0" font-size="14" text-anchor="middle">Copy 1: used by one office</text>
<text x="155.0" y="148.0" font-size="14" text-anchor="middle">for message A</text>
<text x="155.0" y="166.0" font-size="14" text-anchor="middle">(say, New York, 1944)</text>
<rect x="350" y="112" width="270" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="485.0" y="130.0" font-size="14" text-anchor="middle">Copy 2: used by another</text>
<text x="485.0" y="148.0" font-size="14" text-anchor="middle">office for message B</text>
<text x="485.0" y="166.0" font-size="14" text-anchor="middle">(say, Washington, 1943)</text>
<line x1="260" y1="64" x2="155" y2="112" stroke="currentColor" stroke-width="1.4"/>
<polygon points="155,112 160.8,105.1 164.0,112.1" fill="currentColor"/>
<line x1="380" y1="64" x2="485" y2="112" stroke="currentColor" stroke-width="1.4"/>
<polygon points="485,112 476.0,112.1 479.2,105.1" fill="currentColor"/>
<rect x="150" y="224" width="340" height="62" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="242.0" font-size="14" text-anchor="middle">Cipher A minus cipher B</text>
<text x="320.0" y="260.0" font-size="14" text-anchor="middle">= code A minus code B</text>
<text x="320.0" y="278.0" font-size="14" text-anchor="middle">The page has cancelled out</text>
<line x1="155" y1="174" x2="250" y2="224" stroke="currentColor" stroke-width="1.4"/>
<polygon points="250,224 241.0,223.6 244.6,216.8" fill="currentColor"/>
<line x1="485" y1="174" x2="390" y2="224" stroke="currentColor" stroke-width="1.4"/>
<polygon points="390,224 395.4,216.8 399.0,223.6" fill="currentColor"/>
<text x="320" y="312" font-size="13" text-anchor="middle">Neither message alone reveals anything. Two with the same page reveal each other.</text>
</svg>
<figcaption>Figure 14.6. The Venona flaw. The one-time pad is perfect only if every page is used once. A press that printed some pages twice gave American analysts pairs of messages in depth.</figcaption>
</figure>

On 1 February 1943 the Army's Signal Intelligence Service began a small project at Arlington Hall on Soviet messages that American cable companies had copied and handed over. Colonel Carter Clarke, who headed the Army's special branch, feared that Stalin might make a separate peace with Germany and wanted to know. The first analyst was Gene Grabeel, a Virginia home-economics teacher recruited in 1942. The project's first evidence of reuse is credited, in the NSA's own history by Robert Benson, to Lieutenant Richard Hallock, who found it in 1943 in the trade traffic. Hallock was an archaeologist in civilian life, who had worked on the clay tablets of Persepolis. (Some popular accounts give Grabeel the discovery as well; I follow Benson.) In 1944 a young analyst, Cecil Phillips, found how the NKVD's messages indicated which pad page they used, which let analysts match duplicates across services. From 1946 the linguist Meredith Gardner rebuilt the code book from the matched pairs, helped by a partly burned Soviet code book that had reached Arlington Hall late in the war, and by guesses at stereotyped phrases. The project had several cover names over its life, including Bride and Drug, and was called **Venona** from 1961.

The program below is the first step in miniature. A forty-word code book gives each word a four-digit group. One pad page is used for two messages by mistake. The analyst has only the two ciphertexts. For each position the program subtracts them, which cancels the page, and then, for every word that could stand at that place in message A, asks whether the corresponding group in message B is also a real code group. Most guesses fail, because only 40 of the 10,000 four-digit groups are valid.

```python
import random
random.seed(1942)

def add(a, b):                        # false addition: digit by digit, no carrying
    return "".join(str((int(x) + int(y)) % 10) for x, y in zip(a, b))

def sub(a, b):
    return "".join(str((int(x) - int(y)) % 10) for x, y in zip(a, b))

# A toy code book: forty words, each given a random four-digit group.
words = ("AGENT ARRIVE BOMB CONTACT COURIER DOCUMENT ENGINEER FACTORY FUEL GROUP "
         "HARBOR HEAD INFORM INVENT JOIN KEY LAB LONDON MEET MONEY NAME NEW OFFICE "
         "ORDER PHOTO PLAN RADIO REPORT SECRET SEND TARGET TEST TOMORROW TRAIN "
         "URANIUM VISIT WASHINGTON YORK SHIP").split()
code = {}
for w in words:
    while True:
        g = "%04d" % random.randrange(10000)
        if g not in code.values():
            code[w] = g
            break
valid = {g: w for w, g in code.items()}

# One pad page, used (by mistake) for two different messages.
page = ["%04d" % random.randrange(10000) for _ in range(5)]
msg_a = "AGENT SEND NEW URANIUM REPORT".split()
msg_b = "ENGINEER MEET COURIER WASHINGTON OFFICE".split()
cipher_a = [add(code[w], p) for w, p in zip(msg_a, page)]
cipher_b = [add(code[w], p) for w, p in zip(msg_b, page)]
print("A on the wire:", " ".join(cipher_a))
print("B on the wire:", " ".join(cipher_b))

# The analyst never sees the page. Subtracting the two messages cancels it,
# leaving (code group of A) minus (code group of B). Now guess a word for A:
# the matching word for B must also be a real code group, which is rare.
for i, (ca, cb) in enumerate(zip(cipher_a, cipher_b), 1):
    diff = sub(ca, cb)
    fits = [(w, valid[sub(g, diff)]) for w, g in code.items() if sub(g, diff) in valid]
    print(i, diff, "->", len(fits), "pairs fit:", ", ".join(f"{a}/{b}" for a, b in fits))
```

Output:

```
A on the wire: 3881 6262 8486 3443 3307
B on the wire: 7621 2637 7312 9873 7752
1 6260 -> 1 pairs fit: AGENT/ENGINEER
2 4635 -> 1 pairs fit: SEND/MEET
3 1174 -> 1 pairs fit: NEW/COURIER
4 4670 -> 1 pairs fit: URANIUM/WASHINGTON
5 6655 -> 1 pairs fit: REPORT/OFFICE
```

Each position has exactly one pair that fits: the two true words, found without the page. The chance that a wrong pair also fits is about $40 \times 39 / 10{,}000 \approx 0.16$ per position, so over five positions a false pair turns up more often than not; this run happened to show none. A real code book was far larger, so the test alone was weak, and the analysts used everything else: the stereotyped forms of messages, the known names of places, the dates, the pattern of which words follow which. It was slow work, done mostly by hand.

!!! note "Life story: Venona"
    **Born:** 1 February 1943, at Arlington Hall, with Gene Grabeel as its first analyst; later Richard Hallock, Cecil Phillips, Meredith Gardner and colleagues · **Purpose:** to read Soviet messages enciphered with one-time pad pages that had been printed twice in 1942 · **Helped:** exposed Soviet espionage in the United States, Britain and Australia, the atomic spies among it · **Status:** closed in 1980; the first decrypts were released in 1995

## 14.14 Venona II: what it showed and what it did not

*Level: beginner.*

By the end of 1946 Gardner had read a message listing scientists who worked on the atomic bomb. Later decrypts used the Soviet cover word **ENORMOZ** for the Manhattan Project, and in 1949 a decrypt of a 1944 message about a physicist at Los Alamos with a sister in the United States led British and American investigators to Klaus Fuchs, who confessed in January 1950 and was sentenced to fourteen years. The trail led from Fuchs to Harry Gold and David Greenglass, and from Greenglass to his brother-in-law Julius Rosenberg, arrested in July 1950; Julius and Ethel Rosenberg were executed on 19 June 1953. Other decrypts pointed to Theodore Hall, a young physicist at Los Alamos, who was never prosecuted because the evidence was secret, and to Donald Maclean of the British Foreign Office, one of the Cambridge group, who fled to Moscow with Guy Burgess in May 1951. Haynes and Klehr count 349 Americans with some covert tie to Soviet intelligence in the decrypts.

The Soviets learned of the project early. William Weisband, a linguist at Arlington Hall, was their agent and told them in 1948; Kim Philby, as British liaison in Washington from 1949, saw the material as well. On 29 October 1948, the day known afterward as Black Friday, Soviet traffic changed and new messages could no longer be read. Venona went on reading the old ones until 1980. Estimates of the messages read, in whole or in part, run from about 2,200 to about 3,000, depending on whether fragments count; it was a small fraction of what had been collected. The decrypts were released from July 1995.

The decrypts must be read with care. Venona's messages used cover names, and the FBI's investigations, not the decryption, matched them to people; some matches are firm and some are not. The most famous is ALES, whom some historians identify as Alger Hiss; others dispute it. The Rosenberg case is another. Most historians now hold that Julius was a Soviet spy; Ethel's role is smaller and still argued. And a name in Venona is not proof of espionage in itself, since contacts and sources are not agents. Venona's secret was kept from the courts, which is why the Rosenberg trial of 1951 did not use it.

The point of Venona for this book is the clean lesson. The cipher was perfect, and the key distribution, a factory under wartime pressure, was not. It is the mirror image of Enigma, where a flawed machine was made worse by its operators; here a flawless method was undone before any operator touched it. It was also a story about people: a schoolteacher, an archaeologist, a linguist and a young analyst, none of them senior, who stayed with a problem for thirty-seven years.

!!! note "Life story: Meredith Gardner"
    **Born:** 1912, Okolona, Mississippi; died 2002 · **Purpose:** a linguist who rebuilt the Soviet code book from the matched pairs, from 1946 · **Helped:** read the Manhattan Project message of 1946 and the decrypts that led to Fuchs and the Rosenberg case · **Status:** continued on Venona until his retirement in 1972

## 14.15 Going deeper

*Level: expert.*

**The sources, and what they cannot give.** Nearly everything in this chapter was secret for decades, so the first accounts were memoirs: Layton on Midway, Rowlett on Purple, Lamphere on the FBI side of Venona, Yardley on Chongqing. A memoir is the best witness to what the author saw and the worst to what he did not, and every one of them presents its author well. The official histories, those of the NSA's Center for Cryptologic History and the Navy's, credit leadership. The Navy's own histories credit its leadership, and I know of no document that apportions the credit between Driscoll and Safford. For the Japanese and Chinese sides the problem is worse; the language barrier and burned archives mean that nearly all the English-language record is the Allied one.

**Pearl Harbor.** Laurance Safford, among others, argued from 1945 that a "winds execute" message announcing war had been intercepted and hidden, and that Washington let the attack happen. Investigations from 1941 to 1946 found no such order, and the best-known analysis, Roberta Wohlstetter's *Pearl Harbor: Warning and Decision* (1962), argues that the signals were there and were lost in noise, an analytic failure and not a cryptologic one. That reading is the consensus among historians; the revisionist reading survives in the literature. The case also shows what a decrypt is: a message, not a plan.

**Why a two-time pad fails.** If $c_1 = m_1 + k$ and $c_2 = m_2 + k$ (digitwise, mod 10), then $c_1 - c_2 = m_1 - m_2$, whatever the key. That alone does not tell the messages apart: for every possible $m_1$ there is an $m_2$. What breaks it is redundancy. With a code book of $N$ valid groups among $10^4$ possible, a wrong guess for $m_1$ gives a valid $m_2$ with probability about $N/10^4$, and the expected number of false pairs at one position is $N(N-1)/10^4$, which is 0.16 for the forty-word toy. Real books had thousands of groups, so one position says almost nothing; but many positions together, constrained by grammar, message form and known names, leave one consistent reading. In Shannon's terms the key hides nothing about the difference, so the question is whether the plaintext pair is the only plausible pair consistent with it, and the redundancy of the plaintext decides. [Chapter 15](15-Shannon-and-the-Agencies.md) takes up Shannon's formal version.

**Open questions.** How many Venona messages were read, and how many of them were useful, depends on how one counts fragments. David Greenglass said in 2001 that he had lied at the trial about his sister's role; Ethel Rosenberg's part is still argued. The identity of ALES is not settled. For Elizebeth Friedman's unit and the Chinese services I would not trust a firm statement. For the women of Arlington Hall and the Annex the best history is oral, and oral histories are collected from those who lived to be asked.

## Check yourself

??? question "1. The Red machine kept vowels as vowels and consonants as consonants. Why is that a leak, and why was it worse for Japanese?"
    The pattern of consonants and vowels in the plaintext is exactly the pattern in the ciphertext, so an analyst can test where a probable word could sit by its skeleton alone. Japanese written in Latin letters alternates consonants and vowels almost without exception, so its skeletons are regular and short words fit very few places. In the program of §14.3 the skeleton of KOUSHOU fitted one place out of twenty-five.

??? question "2. Who found what in the break of Purple, and on what date?"
    Genevieve Grotjan saw, on 20 September 1940, that letter pairs recurred at different positions in a regular way, showing that the twenty letters were permuted by a regular step. Leo Rosen realized that the mechanism was a stepping switch like those in telephone exchanges, and the team built an analog. Frank Rowlett led the daily work and William Friedman directed the Signal Intelligence Service.

??? question "3. Why did Magic not warn Washington of the attack on Pearl Harbor?"
    Purple carried diplomacy. The naval plan traveled in naval codes, and for the most part not by radio, as the carriers kept radio silence. The 14-part note said that talks were ending but not where Japan would strike, and the message of 24 September 1941 about Honolulu was in a lower-grade code and was read after a backlog. Washington also did not send Magic to Hawaii. Historians such as Wohlstetter see an analytic failure, not a failure to decrypt.

??? question "4. What was the water message, and what kind of attack was it?"
    Station HYPO guessed that the Japanese target "AF" was Midway. Midway was told to report in plain language that its water plant had failed, and a Japanese message soon reported that AF was short of water. It is a chosen-plaintext attack on a code book: the codebreakers choose a fact for the enemy to send, and see which code group carries it. Accounts differ on who proposed it and on the details.

??? question "5. The Navajo code was a code, not a cipher. What does that mean, and what did extra spelling words for common letters do?"
    A code replaces whole words and phrases with other words; a cipher replaces letters. The Navajo code gave Navajo words to military terms (whale for battleship) and spelled out the rest with a word for each letter. Extra words for the commonest letters flattened the frequency count, as homophones do, so that no single word stood out. In the toy of §14.8 the commonest word fell from 14 percent to 8.

??? question "6. Two Soviet-style messages use the same pad page. At one position the ciphertext groups are 5821 and 3947. What is their difference, digit by digit mod 10? If the first plaintext group is 7305, what is the second?"
    $5-3=2$, $8-9=-1\equiv 9$, $2-4=-2\equiv 8$, $1-7=-6\equiv 4$, so the difference is 2984. It equals (plain A) minus (plain B), so plain B is 7305 minus 2984: $7-2=5$, $3-9\equiv 4$, $0-8\equiv 2$, $5-4=1$, giving 5421. The pad page was never needed.

??? question "7. In the toy of §14.13 the chance that a wrong pair fits at a position is about 0.16. Where does that number come from, and why was Venona harder than the toy?"
    There are 40 valid groups out of 10,000. For each of the 40 guesses at message A, the chance that the matching B group is one of the other 39 valid groups is about $39/10{,}000$, so the expected number of false pairs is $40 \times 39/10{,}000 \approx 0.16$. A real code book was far larger, so one position gave many false pairs, and the analysts needed the context of many positions, known names and message forms.

??? question "8. Who found the first evidence that the Soviet pads had been reused, and what does the disagreement in the sources tell you?"
    The NSA's own history credits Richard Hallock, in 1943, working on the trade traffic; Gene Grabeel was the project's first analyst; some popular accounts give her the discovery. The disagreement tells you that a small team's roles blur in memory and in retelling, and that the official history and the popular one do not always agree.

??? question "9. Why can't one say simply that Agnes Meyer Driscoll broke JN-25?"
    JN-25 was a team effort over years among HYPO, OP-20-G, CAST, the British and others; Tiltman made first entries in 1939, and Driscoll's group made early inroads into the additive tables. Which of those counts as breaking it depends on the definition, and the records do not separate the contributions. A sentence that gives it all to one person is telling a tidy story.

??? question "10. Why does this chapter use the letters SIS for three different organizations, and which one ran Venona?"
    The Army's Signal Intelligence Service (Friedman's office), the FBI's Special Intelligence Service (Latin America from 1940) and Britain's Secret Intelligence Service (MI6) all have the initials. The Army's Signal Intelligence Service, at Arlington Hall, ran Venona. The FBI's SIS is the one that worked with Elizebeth Friedman's unit on the spy rings of South America.

## What you learned

- The US Navy's cryptanalytic office was built in the 1920s by Laurance Safford and Agnes Meyer Driscoll, who read Japanese naval codes for twenty years; her exact credit against Safford's and Rochefort's is disputed.
- Red's design, vowels kept apart from consonants, left a skeleton that Japanese made easy to read. Purple's twenties fell on 20 September 1940 to Genevieve Grotjan's pattern and Leo Rosen's stepping-switch idea, within an Army team led by Frank Rowlett.
- Magic read Japan's diplomatic traffic for five years; it showed the road to war and did not name Pearl Harbor. Ōshima's reports from Berlin helped plan the invasion of Normandy.
- Station HYPO, under Joseph Rochefort, read enough of JN-25 in May 1942 to find Midway as the target, with a water message as a chosen-plaintext test; the carriers were in position on 4 June.
- The Navajo code talkers built a code of Navajo words with a spelling alphabet, and Comanche, Meskwaki and others served too. Their codes were secure because no Japanese spoke the languages, not because of mathematics.
- Japan's own services got training from a Polish officer's course in the early 1920s and misjudged their own security. China's black chamber, with Yardley, and Delhi's Wireless Experimental Centre worked on Japanese army traffic with records that are thin.
- Elizebeth Friedman's wartime unit read German spy traffic in South America, and the FBI took the public credit.
- Thousands of women worked at Arlington Hall and on Nebraska Avenue; counts vary.
- Venona read Soviet traffic because pad pages were printed twice in 1942; it identified spies but was not used in court.

**Next:** [Chapter 15](15-Shannon-and-the-Agencies.md), when the war's codebreakers become permanent agencies and Shannon turns secrecy into mathematics.

## Further reading

- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev. ed., Scribner, 1996): Purple, JN-25, Midway, the Japanese services and Venona in outline.
- Frank B. Rowlett, *The Story of Magic: Memoirs of an American Cryptologic Pioneer* (Aegean Park Press, 1998): the Purple break, from the leader of the team.
- Liza Mundy, *Code Girls: The Untold Story of the American Women Code Breakers of World War II* (Hachette, 2017): Arlington Hall, the Annex, the WAVES and Agnes Meyer Driscoll's place in the Navy.
- Elliot Carlson, *Joe Rochefort's War: The Odyssey of the Codebreaker Who Outwitted Yamamoto at Midway* (Naval Institute Press, 2011); Edwin T. Layton, with Roger Pineau and John Costello, *"And I Was There": Pearl Harbor and Midway, Breaking the Secrets* (Morrow, 1985); Jasper Holmes, *Double-Edged Secrets* (Naval Institute Press, 1979).
- Roberta Wohlstetter, *Pearl Harbor: Warning and Decision* (Stanford University Press, 1962).
- Robert L. Benson, *The Venona Story* (NSA Center for Cryptologic History, 2001); John Earl Haynes and Harvey Klehr, *Venona: Decoding Soviet Espionage in America* (Yale University Press, 1999); Robert J. Lamphere and Tom Shachtman, *The FBI-KGB War* (Random House, 1986).
- Jason Fagone, *The Woman Who Smashed Codes: A True Story of Love, Spies, and the Unlikely Heroine Who Outwitted America's Enemies* (Dey Street, 2017): Elizebeth Friedman, including her wartime unit.
- Herbert O. Yardley, *The Chinese Black Chamber: An Adventure in Espionage* (Houghton Mifflin, 1983).
- William C. Meadows, *The Comanche Code Talkers of World War II* (University of Texas Press, 2002); Doris Atkinson Paul, *The Navajo Code Talkers* (Dorrance, 1973); Chester Nez with Judith Schiess Avila, *Code Talker* (Berkley, 2011).
- Stephen Budiansky, *Battle of Wits: The Complete Story of Codebreaking in World War II* (Free Press, 2000).
- *Weaker sources behind particular statements:* summaries of Wikipedia articles on the Wireless Experimental Centre and on Japanese cryptology (Noyce, the staff numbers, outstations, the date of the Kowalewski course); news and museum summaries on the Meskwaki code talkers, whose numbers differ between sources; the *South China Morning Post* for Chongqing. From memory and not checked here: the birth and death years of Driscoll, Grotjan, Grabeel and Gardner, the Basque radio-operator claim, and the Chinese Communist radio stories.
