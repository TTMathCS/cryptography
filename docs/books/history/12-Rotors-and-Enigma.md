# 12. Rotors and Enigma, and the Poles who broke it

*In 1918 a German engineer filed a patent for a typewriter that scrambled its own letters, and within five years three other men in three other countries had the same idea. This chapter tells where the rotor came from and who made it, how a business machine that hardly sold became the cipher of the German armed forces, and how three young mathematicians in Warsaw, helped by a bought secret and a French officer, read it, on and off, for nearly seven years before the war began. It follows them to a forest outside Warsaw in July 1939, where they handed everything to Britain and France, and then to what became of them. You will run a working Enigma, watch Rejewski's central fact appear in a program, build the Poles' catalog of rotor settings, and see how the operators' habits gave the codebreakers their start.*

!!! abstract "In this chapter"
    **You will learn:**

    - why a machine that changes its alphabet at every letter was the answer to the problem that the hand ciphers of chapters 7 and 10 could not solve;
    - who Edward Hebern, Arthur Scherbius, Hugo Koch with Theo van Hengel and R. P. C. Spengler, and Arvid Damm were, what each built, and what became of their companies;
    - how Enigma went from a commercial product to the cipher of the army, navy and air force, what the daily key was, and how an operator sent a message in 1935;
    - who Marian Rejewski, Jerzy Różycki, Henryk Zygalski, Gwido Langer, Gustave Bertrand and Hans-Thilo Schmidt were, and why Poland hired mathematicians;
    - how Rejewski turned the doubled message key against the machine (the idea in one worked example, with the full theory in Cryptanalysis), and how the cyclometer, the catalog, the grill, the clock method, Zygalski's sheets and the *bomba* kept the Bureau reading Enigma until 1939;
    - what happened at Pyry in July 1939 and to the three mathematicians afterward;
    - how the operators' habits helped the attackers, how the commercial machine and its variants (Swiss, Italian, Spanish and others) fit the story, and what the sources do and do not show.

    **You need:** [Chapter 10](10-The-Telegraph.md) (Kerckhoffs's rules, and why a repeating key fails), [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) (radio, the First World War and the one-time pad) and, for the machine itself, [book 1, section 2.9](../../book/02-Classical-Ciphers.md#29-machines-enigma). The theory of Rejewski's break is taught in full in [Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md); here you meet it as the people who found it did.

    **Levels:** §12.1 to §12.3, §12.5 to §12.7 and §12.10 to §12.13 are for beginners, §12.4, §12.8, §12.9 and §12.14 are intermediate, §12.15 is expert.

## 12.1 The problem: a cipher that does not repeat

*Level: beginner.*

Picture a cipher clerk in the spring of 1918, in a German army headquarters or a British one, it makes no difference. He has a table of letters, a pencil and a message of two hundred words that must be on the wire within the hour. Every cipher he can use by hand has a flaw that the previous chapters have taught you to look for. If the key is short and repeats, Kasiski's test finds its length ([chapter 10](10-The-Telegraph.md)). A double transposition or the ADFGVX system is slow, one slip ruins the message, and a team of experts will have it open in days. The only cipher that cannot be broken, the one-time pad of [chapter 11](11-Radio-War-and-the-One-Time-Pad.md), needs a key as long as the message, and every key sheet has to be made, printed, carried to the front and used once.

The war had shown that radio could not be hidden. Everything an army sent was heard by the enemy, so every message that mattered had to be enciphered, thousands a day, by men who were not mathematicians and were often cold, tired and under fire. A cipher for that world needed three things: a key that does not repeat in any stretch the enemy is likely to capture; speed, and few mistakes, in clumsy hands; and a *setting* that a clerk could read off a card and change every day, so that a single secret chose among an enormous number of possibilities. A hand cipher cannot give the first cheaply, because a key that does not repeat takes work to make. The answer people found was a machine that makes it.

There was a second market besides the armies: bankers, shipping firms and trading houses, who had paid by the word for telegrams since the 1840s ([chapter 10](10-The-Telegraph.md)) and wanted their cables unreadable by a clerk or a rival. A machine that enciphered at typing speed could be sold to both.

The device that four inventors in four countries arrived at, between 1915 and 1919, was the **rotor**: a wheel wired inside as a scrambled alphabet, which turns a little after every letter. Three rotors in a row give a key that does not repeat for about seventeen thousand letters, set by a handful of numbers. The most famous machine built from rotors was the German Enigma. This chapter tells the invention (§12.2 to §12.4), the daily practice of using Enigma (§12.5), and the Polish mathematicians who found a way into it (§12.6 to §12.11), then the operators' mistakes (§12.12) and the machine's relatives (§12.13). Chapter 13 takes the story from Pyry to Bletchley Park.

Figure 12.1 sets out the dates of the whole chapter. Where the sources disagree about one of them, the text says so.

<figure class="mars-fig">
<svg viewBox="0 0 640 464" width="640" role="img" aria-label="Timeline of rotor machines, Enigma and the Polish break from 1915 to 1980" fill="currentColor" font-size="14">
<line x1="112" y1="8" x2="112" y2="456" stroke="currentColor" stroke-width="1.6"/>
<text x="98" y="29" text-anchor="end">1915</text>
<circle cx="112" cy="24" r="3.5"/>
<text x="128" y="29">Two Dutch naval officers sketch a rotor machine</text>
<text x="98" y="55" text-anchor="end">1918</text>
<circle cx="112" cy="50" r="3.5"/>
<text x="128" y="55">Scherbius files his patent (23 February)</text>
<text x="98" y="81" text-anchor="end">1919</text>
<circle cx="112" cy="76" r="3.5"/>
<text x="128" y="81">Koch (Dutch) and Damm (Swedish) file rotor patents</text>
<text x="98" y="107" text-anchor="end">1921</text>
<circle cx="112" cy="102" r="3.5"/>
<text x="128" y="107">Hebern files his US patent</text>
<text x="98" y="133" text-anchor="end">1926-28</text>
<circle cx="112" cy="128" r="3.5"/>
<text x="128" y="133">German navy, then army, adopt Enigma</text>
<text x="98" y="159" text-anchor="end">1929</text>
<circle cx="112" cy="154" r="3.5"/>
<text x="128" y="159">Poznań course for Polish mathematicians</text>
<text x="98" y="185" text-anchor="end">Dec 1931</text>
<circle cx="112" cy="180" r="3.5"/>
<text x="128" y="185">Schmidt's papers reach the Poles through Bertrand</text>
<text x="98" y="211" text-anchor="end" font-weight="bold">Dec 1932</text>
<circle cx="112" cy="206" r="4.5"/>
<text x="128" y="211" font-weight="bold">Rejewski has the rotor wiring</text>
<text x="98" y="237" text-anchor="end">1934-35</text>
<circle cx="112" cy="232" r="3.5"/>
<text x="128" y="237">Cyclometer and the card catalog</text>
<text x="98" y="263" text-anchor="end">Nov 1937</text>
<circle cx="112" cy="258" r="3.5"/>
<text x="128" y="263">Germans change the reflector</text>
<text x="98" y="289" text-anchor="end">Sep 1938</text>
<circle cx="112" cy="284" r="3.5"/>
<text x="128" y="289">New indicator rule; sheets and the bomba</text>
<text x="98" y="315" text-anchor="end">Dec 1938</text>
<circle cx="112" cy="310" r="3.5"/>
<text x="128" y="315">Two more rotors: 60 rotor orders, not 6</text>
<text x="98" y="341" text-anchor="end" font-weight="bold">Jul 1939</text>
<circle cx="112" cy="336" r="4.5"/>
<text x="128" y="341" font-weight="bold">Pyry: the Poles hand over everything</text>
<text x="98" y="367" text-anchor="end">May 1940</text>
<circle cx="112" cy="362" r="3.5"/>
<text x="128" y="367">Germans stop doubling the message key</text>
<text x="98" y="393" text-anchor="end">Jan 1942</text>
<circle cx="112" cy="388" r="3.5"/>
<text x="128" y="393">Różycki dies when the Lamoricière sinks</text>
<text x="98" y="419" text-anchor="end">1943</text>
<circle cx="112" cy="414" r="3.5"/>
<text x="128" y="419">Rejewski and Zygalski reach Britain</text>
<text x="98" y="445" text-anchor="end">1973-80</text>
<circle cx="112" cy="440" r="3.5"/>
<text x="128" y="445">Bertrand's book; Rejewski's own account</text>
</svg>
<figcaption>Figure 12.1. From the first rotor patents to the Polish break and what followed. Dates for the Dutch sketch and for the first German army use are the ones the sources give; see the chapter for where they disagree.</figcaption>
</figure>


## 12.2 Four inventors in four countries

*Level: beginner.*

### What a rotor is

A rotor is a disc about the size of a hockey puck, with 26 brass contacts on each face. Inside, 26 insulated wires join each contact on one face to a different contact on the other. Current that enters at contact A on the left may come out at contact K on the right. On its own the disc is a substitution alphabet, the kind al-Kindi broke in [chapter 4](04-Baghdad-and-Cairo.md).

The idea that makes it a cipher is to let the disc turn. After each letter the wheel advances one place, and the same wires now join different letters, as Figure 12.2 shows. Typing the same letter again gives a different output.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="A six-contact rotor drawn twice: before the first letter and after one step, with the wire from A shown thick" fill="currentColor" font-size="14">
<text x="20" y="26" font-weight="bold">turned 0 places</text>
<rect x="72" y="46" width="156" height="196" fill="none" stroke="currentColor" stroke-width="1.2" rx="6"/>
<text x="46" y="75" text-anchor="end">A</text>
<text x="256" y="75">A</text>
<circle cx="72" cy="70" r="3"/><circle cx="228" cy="70" r="3"/>
<text x="46" y="107" text-anchor="end">B</text>
<text x="256" y="107">B</text>
<circle cx="72" cy="102" r="3"/><circle cx="228" cy="102" r="3"/>
<text x="46" y="139" text-anchor="end">C</text>
<text x="256" y="139">C</text>
<circle cx="72" cy="134" r="3"/><circle cx="228" cy="134" r="3"/>
<text x="46" y="171" text-anchor="end">D</text>
<text x="256" y="171">D</text>
<circle cx="72" cy="166" r="3"/><circle cx="228" cy="166" r="3"/>
<text x="46" y="203" text-anchor="end">E</text>
<text x="256" y="203">E</text>
<circle cx="72" cy="198" r="3"/><circle cx="228" cy="198" r="3"/>
<text x="46" y="235" text-anchor="end">F</text>
<text x="256" y="235">F</text>
<circle cx="72" cy="230" r="3"/><circle cx="228" cy="230" r="3"/>
<line x1="72" y1="70" x2="228" y2="166" stroke="currentColor" stroke-width="2.6"/>
<line x1="72" y1="102" x2="228" y2="230" stroke="currentColor" stroke-width="1.1"/>
<line x1="72" y1="134" x2="228" y2="70" stroke="currentColor" stroke-width="1.1"/>
<line x1="72" y1="166" x2="228" y2="198" stroke="currentColor" stroke-width="1.1"/>
<line x1="72" y1="198" x2="228" y2="102" stroke="currentColor" stroke-width="1.1"/>
<line x1="72" y1="230" x2="228" y2="134" stroke="currentColor" stroke-width="1.1"/>
<text x="20" y="270" font-size="13">A goes in, D comes out</text>
<text x="350" y="26" font-weight="bold">turned 1 place</text>
<rect x="402" y="46" width="156" height="196" fill="none" stroke="currentColor" stroke-width="1.2" rx="6"/>
<text x="376" y="75" text-anchor="end">A</text>
<text x="586" y="75">A</text>
<circle cx="402" cy="70" r="3"/><circle cx="558" cy="70" r="3"/>
<text x="376" y="107" text-anchor="end">B</text>
<text x="586" y="107">B</text>
<circle cx="402" cy="102" r="3"/><circle cx="558" cy="102" r="3"/>
<text x="376" y="139" text-anchor="end">C</text>
<text x="586" y="139">C</text>
<circle cx="402" cy="134" r="3"/><circle cx="558" cy="134" r="3"/>
<text x="376" y="171" text-anchor="end">D</text>
<text x="586" y="171">D</text>
<circle cx="402" cy="166" r="3"/><circle cx="558" cy="166" r="3"/>
<text x="376" y="203" text-anchor="end">E</text>
<text x="586" y="203">E</text>
<circle cx="402" cy="198" r="3"/><circle cx="558" cy="198" r="3"/>
<text x="376" y="235" text-anchor="end">F</text>
<text x="586" y="235">F</text>
<circle cx="402" cy="230" r="3"/><circle cx="558" cy="230" r="3"/>
<line x1="402" y1="70" x2="558" y2="198" stroke="currentColor" stroke-width="2.6"/>
<line x1="402" y1="102" x2="558" y2="230" stroke="currentColor" stroke-width="1.1"/>
<line x1="402" y1="134" x2="558" y2="166" stroke="currentColor" stroke-width="1.1"/>
<line x1="402" y1="166" x2="558" y2="70" stroke="currentColor" stroke-width="1.1"/>
<line x1="402" y1="198" x2="558" y2="102" stroke="currentColor" stroke-width="1.1"/>
<line x1="402" y1="230" x2="558" y2="134" stroke="currentColor" stroke-width="1.1"/>
<text x="350" y="270" font-size="13">A goes in, E comes out</text>
<text x="320" y="292" text-anchor="middle" font-size="13">Same wires, but the wheel has moved: the alphabet is a different one</text>
</svg>
<figcaption>Figure 12.2. A toy rotor with six contacts. The wires inside never change, but after each letter the wheel turns one place, so the same letter takes a new path. Real rotors have 26 contacts a side.</figcaption>
</figure>


One rotor alone gives only 26 alphabets, and they are all shifts of the same mixed alphabet. That is a polyalphabetic cipher with a period of 26, hardly better than a Vigenère with a 26-letter key, and it falls to a similar attack. The program below uses the wiring of Enigma's first rotor to show both facts: a new alphabet at each press, and a return to the start after 26.

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
ROTOR = "EKMFLGDQVZNTOWYHXUSPAIBRCJ"        # the wiring of Enigma's rotor I

def one_rotor(text, start=0):
    out = ""
    for i, ch in enumerate(text):
        turn = (start + i) % 26              # how far the rotor has turned so far
        contact = (A.index(ch) + turn) % 26  # the letter enters at a shifted contact
        out += A[(A.index(ROTOR[contact]) - turn) % 26]
    return out

# The same letter, typed 52 times: a new alphabet each time, back to the start after 26
row = one_rotor("A" * 52)
print(row[:26])
print(row[26:] == row[:26])

# A message that repeats itself after 26 letters gives a repeated ciphertext
msg = "ATTACKATDAWNTHENEXTMORNING" * 2
print(one_rotor(msg)[:26] == one_rotor(msg)[26:])
```

Output:

```
EJKCHBXJNQDICJKSHDAWGNFUEK
True
True
```

The fix is to chain wheels. Put a second rotor beside the first and let it advance one place each time the first completes a turn, and a third beside that, like the digits of a car's mileage counter. Three rotors give $26 \times 26 \times 26 = 17{,}576$ settings before the pattern returns; Enigma's real stepping, which has a quirk described in §12.4, gives 16,900. Each setting is a different alphabet, so a message of a few hundred letters never uses the same one twice. With more rotors, or a choice of rotors from a box, the number of possible daily settings grows into the billions of billions.

!!! note "Life story: the rotor"
    **Born:** between 1915 and 1919, in the Netherlands, Germany, Sweden and the United States, more or less independently · **Purpose:** make a key that does not repeat for thousands of letters out of a setting a clerk can read off a card · **Helped:** Enigma, Britain's Typex, America's SIGABA, Hebern's own machines and, much later, the Soviet Fialka · **Status:** replaced by electronic key generators from the 1950s on (chapter 15), though some rotor machines stayed in service for decades

### Four inventors

The rotor was invented, as far as anyone has shown, four times within about five years, by men who did not know of each other.

**Edward Hebern** was an American inventor who worked in California. By his own later account he had a rotor machine working by about 1917; the dated record is his patent application of 1921, and his company, the Hebern Electric Code Company, was formed in the same years. His machine was built around an electric typewriter: you typed the plain text, and the cipher letter came out on paper. He sold shares to the public, built an impressive headquarters in Oakland, and sold some machines to the US Navy, but he could not turn the idea into a lasting business, and by the mid-1920s the company was gone. The Army's cryptologists, William Friedman among them, studied the machine in the 1920s and judged it weaker than its maker claimed; the lessons Friedman drew from its weaknesses show up in the American SIGABA of chapter 13. [Chapter 11](11-Radio-War-and-the-One-Time-Pad.md) gives his early patents a sentence; this chapter follows what his idea became.

!!! note "Life story: Edward Hebern and his Electric Code machine"
    **Born:** the idea about 1912 to 1917 by Hebern's own account; US patent application in 1921; he died in 1952 · **Purpose:** an electric typewriter that enciphers as you type, with wired rotors in place of a hand table · **Helped:** the US Navy bought some machines; the idea reached every later rotor machine · **Status:** his company failed in the mid-1920s; the lessons Friedman drew from it fed SIGABA (chapter 13)

**Arthur Scherbius** was a German electrical engineer, born in Frankfurt in 1878, who had his own firm in Berlin. He filed his patent for a ciphering machine with rotors on 23 February 1918. By the usual account he offered the machine to the German navy at first, without success. In 1923 he and his partners set up a company, *Chiffriermaschinen Aktiengesellschaft* ("cipher machines corporation") in Berlin, to sell it to businesses under the name **Enigma**. Scherbius died in Berlin in May 1929 after an accident with a horse-drawn carriage, at fifty, a few years before his machine became the cipher of a rearming Germany. His engineer Willi Korn patented the reflector, the part that made the Enigma the machine we know (§12.4).

!!! note "Life story: Arthur Scherbius"
    **Born:** 1878, Frankfurt; patent filed 23 February 1918 · **Purpose:** a cipher machine for business, sold as Enigma from 1923 · **Helped:** gave Germany its main field cipher of 1926 to 1945, and gave the Poles and the British their most famous target · **Status:** died May 1929; his company continued under other owners and the German military became its main customer

**Hugo Koch**, a Dutch engineer, filed a Dutch patent for a rotor machine in 1919 through a company in The Hague, but he does not seem to have built or sold many. Dutch accounts say the idea came from two naval officers, Theo van Hengel and R. P. C. Spengler, who are said to have designed a rotor machine as early as 1915; if so, they were first. The details are thin, and the Dutch navy did not adopt it. In 1927 Koch sold his rights to Scherbius, which settled any argument over who owned the patents.

**Arvid Damm** was a Swedish engineer whose company, AB Cryptograph in Stockholm, also took out rotor patents in 1919. Damm died in 1927. His company then passed into the hands of **Boris Hagelin**, whose family had invested in it. Hagelin, born in 1892 in what was then the Russian Empire, turned the firm into something much larger, but not with rotors: he built pin-wheel machines, such as the M-209 that the US Army used by the tens of thousands, and in 1952 he set up Crypto AG in Switzerland. The later history of that company, and a scandal, is in chapter 15.

### In the real world

What the four patents prove is limited. A patent records the day an application was filed, not the day an idea was had, and the earlier claims, Hebern's and the Dutch officers', rest on later recollections. Scherbius's filing of 23 February 1918 is the earliest dated application of the four that scholars usually give. The rotor was a *convergent* invention, the kind that arrives when the pieces are lying about: electric typewriters, cheap contacts and a world that suddenly needed secrecy in bulk. David Kahn's *The Codebreakers* tells the story of the four, and Louis Kruh and Cipher Deavours wrote a standard study of the commercial Enigma (see Further reading). Dates for the first Enigma models differ by a year or so between sources; this chapter uses the ones most often given.

## 12.3 Enigma: from a postal congress to the Wehrmacht

*Level: beginner.*

### A machine without customers

Scherbius's company had a good machine and a poor market. The commercial Enigma of the early 1920s was heavy, costly and new to its buyers, and the businesses it was aimed at did not want to carry a cipher machine about when a code book was cheaper. By the usual account the company showed it at the Universal Postal Union congress in Bern in 1923, and sold it through the decade to a scatter of customers, mostly small. A few governments bought machines to study or to use. The commercial machine, with lamps in place of a printer in its later models, was sold openly, advertised in trade magazines, and anyone with the money could buy one. That fact matters for the rest of this chapter, as it did for Kerckhoffs in 1883 ([chapter 10](10-The-Telegraph.md)): the Germans never pretended that the *design* of Enigma was secret.

### The navy first, then the army

The German armed forces turned out to be the customers. Germany's navy and army had been left small by the Treaty of Versailles, and each had learned in the First World War how many of its messages the enemy had read. German naval officers read, in British books of the 1920s such as Winston Churchill's *The World Crisis*, how thoroughly Room 40 had read their codes ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)), and it is usually said that this turned the navy toward a machine. The navy adopted a version of the Enigma in 1926 (called *Funkschlüssel C*) and the army began using a military Enigma from 1928. The air force, founded in secret and acknowledged in 1935, took it up too, and so did the SS, the German intelligence service (the *Abwehr*) and other bodies, each with its own settings and its own key sheets.

The military machine was not the commercial one. Two changes defined it:

- A **reflector** (*Umkehrwalze*) at the far end of the rotors, which sends the current back through them by a different path. Willi Korn patented it in 1926, and it was already in the commercial models of the mid-1920s. It made the machine its own inverse: the same settings encrypt and decrypt. It also meant that **no letter can ever encrypt to itself**, a flaw that turned out to matter a great deal.
- A **plugboard** (*Steckerbrett*) at the front, the true military addition, introduced for the army about 1930. Cables swap pairs of letters before and after the rotors.

The army's machine, called the **Enigma I**, was the one the Poles first met. The wiring inside its rotors was not the wiring of the commercial machine; it was a secret, and it was the one thing the Poles would have to discover.

The German forces used Enigma in many versions, down to divisional headquarters in the army (smaller units used hand ciphers) and aboard every ship and U-boat. How many were built is uncertain; estimates run from about 35,000 to about 100,000. The Germans trusted it, because the numbers were large (§12.4) and because they did not imagine that a mathematician could take the plugboard out of the problem. That trust lasted to the end of the war: German investigations kept putting their losses down to spies, bad luck and radar, and never concluded that the machine was read.

!!! note "Life story: the army Enigma I"
    **Born:** the military machine from about 1928, with the plugboard added about 1930 · **Purpose:** an easy-to-use machine for the army's field and staff traffic, with a key that changed every day · **Helped:** carried the German army's and air force's radio traffic from the early 1930s to 1945 · **Status:** read by Poland from 1933 to 1939, then by Britain and its allies to the end of the war; used until Germany's defeat in 1945

## 12.4 Inside the machine

*Level: intermediate.*

An operator pressed a key. Current ran through the plugboard, which swapped some letters in pairs, then through the three rotors from right to left, then into the reflector, which sent it back through the three rotors from left to right by a different route, then through the plugboard again, and finally lit one of 26 lamps. A second man wrote down the letter that lit. Nothing was printed. Figure 12.3 shows the path; [book 1, section 2.9](../../book/02-Classical-Ciphers.md#29-machines-enigma) walks it with real numbers.

<figure class="mars-fig">
<svg viewBox="0 0 640 280" width="640" role="img" aria-label="The path of one key press through Enigma: plugboard, three rotors, reflector, and back to a lamp" fill="currentColor" font-size="14">
<rect x="10" y="64" width="80" height="50" fill="none" stroke="currentColor" stroke-width="1.2" rx="4"/>
<text x="50" y="94" text-anchor="middle">Keyboard</text>
<rect x="10" y="134" width="80" height="50" fill="none" stroke="currentColor" stroke-width="1.2" rx="4"/>
<text x="50" y="164" text-anchor="middle">Lamps</text>
<rect x="110" y="40" width="80" height="170" fill="none" stroke="currentColor" stroke-width="1.2" rx="4"/>
<text x="150" y="60" text-anchor="middle" font-size="13" font-weight="bold">Plugboard</text>
<text x="150" y="200" text-anchor="middle" font-size="11">swaps pairs</text>
<rect x="210" y="40" width="80" height="170" fill="none" stroke="currentColor" stroke-width="1.2" rx="4"/>
<text x="250" y="60" text-anchor="middle" font-size="13" font-weight="bold">Right rotor</text>
<text x="250" y="200" text-anchor="middle" font-size="11">turns each letter</text>
<rect x="310" y="40" width="80" height="170" fill="none" stroke="currentColor" stroke-width="1.2" rx="4"/>
<text x="350" y="60" text-anchor="middle" font-size="13" font-weight="bold">Middle rotor</text>
<text x="350" y="200" text-anchor="middle" font-size="11">turns sometimes</text>
<rect x="410" y="40" width="80" height="170" fill="none" stroke="currentColor" stroke-width="1.2" rx="4"/>
<text x="450" y="60" text-anchor="middle" font-size="13" font-weight="bold">Left rotor</text>
<text x="450" y="200" text-anchor="middle" font-size="11">turns rarely</text>
<rect x="510" y="40" width="80" height="170" fill="none" stroke="currentColor" stroke-width="1.2" rx="4"/>
<text x="550" y="60" text-anchor="middle" font-size="13" font-weight="bold">Reflector</text>
<text x="550" y="200" text-anchor="middle" font-size="11">never moves</text>
<defs><marker id="a3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<line x1="90" y1="89" x2="508" y2="89" stroke="currentColor" stroke-width="1.8" marker-end="url(#a3)"/>
<path d="M590 89 L606 89 L606 159 L590 159" fill="none" stroke="currentColor" stroke-width="1.8"/>
<line x1="606" y1="89" x2="590" y2="89" stroke="currentColor" stroke-width="1.8"/>
<line x1="590" y1="159" x2="92" y2="159" stroke="currentColor" stroke-width="1.8" marker-end="url(#a3)"/>
<text x="40" y="236" font-size="13">Top line: the way in. Bottom line: the way back, by a different path.</text>
<text x="40" y="256" font-size="13">The reflector turns the current round, so a letter can never light its own lamp.</text>
</svg>
<figcaption>Figure 12.3. One key press. Three rotors, a reflector that sends the current back through them, and a plugboard at both ends of the trip.</figcaption>
</figure>


Three details of the real machine matter to the story.

**The stepping.** The right rotor stepped before every letter. At a certain position (its *notch*), the right rotor carried the middle one forward with it. In the same way, when the middle rotor reached *its* notch it carried the left rotor. But the mechanism had a quirk: a middle rotor at its own notch stepped again on the next key press, along with the left rotor, so it moved twice in a row. The result is that the three rotors do not return to the start after $26^3 = 17{,}576$ letters but after $26 \times 25 \times 26 = 16{,}900$.

**The ring.** Each rotor carried an alphabet ring that could be turned against the wiring, so that the letter shown in the window did not name the core's true position. For the history in this chapter the ring is a detail: it shifts the notch against the wiring, so it changes *when* a neighbor steps. Only the rings of the middle and right rotors matter for that, which multiplies the key count by 26 × 26 = 676; the count below leaves it out.

**The plugboard.** Pairs of letters were swapped before and after the rotors. With zero cables the machine is a pure rotor cipher; with ten, the number of ways to choose the cables is 150,738,274,937,250, and almost the whole key space lives there. The Poles' great discovery, §12.8, was that the plugboard could be taken out of the problem.

### Code it: Enigma I

The program below simulates the army's Enigma I with rotors I, II and III and reflector B, using the real wiring. It leaves out the ring settings, which is the same as setting every ring to A, to keep it short. The first test is the standard check every Enigma simulator is held against: five A's with rotors I, II, III and no plugs must give BDZGO.

```python
from math import factorial

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
# Wiring of the Enigma I rotors and reflector B, and where each rotor
# kicks its left-hand neighbour on (the turnover letter)
ROTORS = {"I": ("EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q"),
          "II": ("AJDKSIRUXBLHWTMCQGZNPYFVOE", "E"),
          "III": ("BDFHJLCPRTXVZNYEIWGAKMUSQO", "V")}
REFLECTOR = "YRUHQSLDPXNGOKMIEBFZCWVJAT"

def enigma(text, order=("I", "II", "III"), start="AAA", plugs=""):
    wiring = [ROTORS[r][0] for r in order]
    notch = [ROTORS[r][1] for r in order]
    pos = [A.index(c) for c in start]            # left, middle, right
    swap = {c: c for c in A}
    for pair in plugs.split():                    # the plugboard swaps letter pairs
        swap[pair[0]], swap[pair[1]] = pair[1], pair[0]
    out = ""
    for ch in text:
        # step before each letter: the right rotor always moves; a rotor at
        # its notch moves its neighbour (the middle one moves itself too)
        if A[pos[1]] == notch[1]:
            pos[0] = (pos[0] + 1) % 26
            pos[1] = (pos[1] + 1) % 26
        elif A[pos[2]] == notch[2]:
            pos[1] = (pos[1] + 1) % 26
        pos[2] = (pos[2] + 1) % 26
        c = A.index(swap[ch])
        for i in (2, 1, 0):                       # in through the rotors, right to left
            c = (A.index(wiring[i][(c + pos[i]) % 26]) - pos[i]) % 26
        c = A.index(REFLECTOR[c])                 # bounce off the reflector
        for i in (0, 1, 2):                       # and back out, left to right
            c = (wiring[i].index(A[(c + pos[i]) % 26]) - pos[i]) % 26
        out += swap[A[c]]
    return out, "".join(A[p] for p in pos)

PLUGS = "AV BS CG DL FU HZ IN KM OW RX"           # ten cables, as from 1939
print(enigma("AAAAA")[0])                         # the textbook test: BDZGO
secret = enigma("WETTERVORHERSAGE", start="BLA", plugs=PLUGS)[0]
print(secret)
print(enigma(secret, start="BLA", plugs=PLUGS)[0]) # same settings undo it

# The rotor windows letter by letter: the middle rotor steps twice in a row
print(" ".join(enigma("A" * k, start="ADU")[1] for k in range(5)))

# No letter ever turns into itself
long = "".join(A[i % 26] for i in range(10000))
print(any(p == c for p, c in zip(long, enigma(long)[0])))

# Daily keys: 3 of 5 rotors in order, 26^3 starting positions, 10 plug pairs
plug = factorial(26) // (factorial(6) * factorial(10) * 2 ** 10)
print(f"{5 * 4 * 3 * 26 ** 3 * plug:,}")
```

Output:

```
BDZGO
PBJGOLOLQZIAPPNC
WETTERVORHERSAGE
ADU ADV AEW BFX BFY
False
158,962,555,217,826,360,000
```

Typing AAAAA gives five different letters: the alphabet changes with every key press. The weather report (*Wettervorhersage*) comes back when the same settings are used again, which is the reflector at work. The rotor windows show the stepping quirk: when the middle rotor reaches its own notch it steps again on the next key press, so it moves twice in a row (AEW, then BFX). The line that prints `False` runs ten thousand letters through and finds no letter that comes out as itself. The last number, about $1.6 \times 10^{20}$ or roughly $2^{67}$ daily keys, is why the Germans trusted Enigma. A machine testing a million keys a second would need five million years to try them all. But as in the story of [Baghdad](04-Baghdad-and-Cairo.md), nobody broke Enigma by trying every key. They broke it by finding ways to ignore most of the key.

**Try it:** change `start` or one plug pair in the program and decrypt with the old settings: the weather report turns to nonsense. The machine is public; the key is everything. That is Kerckhoffs's second rule ([chapter 10](10-The-Telegraph.md)), and the wiring of the military rotors was the only part of the design the Germans hoped to keep from an enemy.

### Break it: where the guess cannot be

The reflector's flaw can be used with nothing but a pencil. Suppose you know, or guess, that a message contains a certain word, a **crib**, and you know nothing else. Slide the guess along the ciphertext. At any position where a guessed letter lines up with the *same* letter in the ciphertext, the guess is impossible, because Enigma never turns a letter into itself. The program below does it for a made-up weather message, enciphered with the simulator above (rotors II, I, III, start QEV, ten cables). The codebreaker guesses it contains WETTERVORHERSAGE ("weather forecast") somewhere.

```python
secret = "TMZLIZMVFAIWQEEGAGJPZEGGUTZHEQUTKMHBTFJHGENXFUSDDIIOWFGTNZHPEQN"
crib = "WETTERVORHERSAGE"                 # "weather forecast": a good guess

places = range(len(secret) - len(crib) + 1)
kept = [at for at in places               # Enigma never turns a letter into itself,
        if all(p != c for p, c in zip(crib, secret[at:]))]   # so any match rules a place out
print("ruled out", len(places) - len(kept), "of", len(places))
print("left for the bombe:", kept)
```

Output:

```
ruled out 29 of 48
left for the bombe: [0, 2, 5, 7, 14, 15, 16, 19, 21, 32, 35, 36, 38, 39, 41, 42, 43, 46, 47]
```

Twenty-nine of the 48 places go at once. The real one, 16, is among the 19 that remain. If you set the simulator to the true settings you can check it: the plaintext is `ANXOBERKOMMANDOXWETTERVORHERSAGEXBISKAYAXNEBELXWINDNORDWESTDREI`, "to X high command X weather forecast X Biscay X fog X wind northwest three", with an X for each space, as German operators typed it. The British used this trick as the first step of a machine search, told in chapter 13. The Poles, as the next sections show, never needed cribs: the German procedure handed them something better.


## 12.5 The daily key and the message

*Level: beginner.*

A key space of $10^{20}$ is only as good as the way the settings are chosen and handed out. The German forces used one plan for all three services, with details that differed. I give it as the Poles saw it in the early 1930s, and then the changes.

Every unit on a radio net held a **key sheet**, printed in Berlin and kept under guard. Each day's line told the operator four things (Figure 12.4): which rotors to put in the machine and in what order (*Walzenlage*); the ring setting for each (*Ringstellung*); which pairs of letters to join with plugboard cables (*Steckerverbindungen*), six pairs at first and more later; and, in the early years, a three-letter *ground setting* (*Grundstellung*) at which to start. Later sheets also gave identification groups. The Germans changed the sheet more and more often: by the Polish accounts every quarter at first, then every month, and from the autumn of 1936 every day.

<figure class="mars-fig">
<svg viewBox="0 0 640 250" width="640" role="img" aria-label="A made-up page from a daily key sheet: day, rotor order, ring settings, plugboard pairs, identification group" fill="currentColor" font-size="14">
<text x="14" y="26" font-weight="bold" font-size="13">Day</text>
<text x="56" y="26" font-weight="bold" font-size="13">Rotors</text>
<text x="150" y="26" font-weight="bold" font-size="13">Rings</text>
<text x="240" y="26" font-weight="bold" font-size="13">Plugboard pairs</text>
<text x="556" y="26" font-weight="bold" font-size="13">Group</text>
<text x="14" y="44" font-size="11" font-style="italic">Tag</text>
<text x="56" y="44" font-size="11" font-style="italic">Walzenlage</text>
<text x="150" y="44" font-size="11" font-style="italic">Ringstellung</text>
<text x="240" y="44" font-size="11" font-style="italic">Steckerverbindungen</text>
<text x="556" y="44" font-size="11" font-style="italic">Kenngruppe</text>
<line x1="8" y1="52" x2="632" y2="52" stroke="currentColor" stroke-width="1.2"/>
<text x="14" y="78" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">31</text>
<text x="56" y="78" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">II  I  III</text>
<text x="150" y="78" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">07 21 03</text>
<text x="240" y="78" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">GV BN PT KX EM QZ OU CJ FY AD</text>
<text x="556" y="78" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">KDL</text>
<line x1="8" y1="90" x2="632" y2="90" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="108" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">30</text>
<text x="56" y="108" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">V  III  I</text>
<text x="150" y="108" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">15 02 18</text>
<text x="240" y="108" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">EJ KN MU BI RW TZ CG HV AL DP</text>
<text x="556" y="108" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">WRB</text>
<line x1="8" y1="120" x2="632" y2="120" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="138" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">29</text>
<text x="56" y="138" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">I  IV  II</text>
<text x="150" y="138" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">24 11 09</text>
<text x="240" y="138" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">BU GH JL MX EI CD QY SZ FN PT</text>
<text x="556" y="138" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="12.5" xml:space="preserve">GNT</text>
<line x1="8" y1="150" x2="632" y2="150" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="190" font-size="13">The operator also made up a message key of three letters for every message.</text>
<text x="14" y="212" font-size="13">The sheet gave the same settings to every station on the net for that day.</text>
<text x="14" y="234" font-size="13">All the values on this page are invented.</text>
</svg>
<figcaption>Figure 12.4. The shape of a daily key sheet. A real sheet listed a month of days, and the German signals units kept the sheets under guard.</figcaption>
</figure>


If every operator began every message at the same ground setting, all the messages of one day would run through the same stretch of the key, the same alphabets in the same order, and anyone holding a stack of them could subtract one from another and strip the key out (the "depth" of [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) and chapter 13). So each message got its own **message key**: three letters picked by the operator, telling the receiver where in the 17,576 positions to start. This is how a message was sent in the early 1930s:

<div class="mars-steps" markdown>

1. The operator set up the machine from today's sheet: rotors in order, rings, plug cables.
2. He turned the rotors to today's ground setting, the same for everyone on the net.
3. He made up a three-letter message key, say LUF.
4. He typed the key twice, LUFLUF. Six lamps lit in turn, and he wrote the six letters down. This was the **indicator**.
5. He turned the rotors to LUF and typed the message, copying each lamp letter and grouping them in fives.
6. A second man sent a header (call signs, time, number of letters), then the indicator, then the groups.

</div>

The receiver set the same day's settings and ground setting, typed in the six indicator letters and saw LUFLUF appear, the repeat being a check against radio garbling. He turned the rotors to LUF, typed the ciphertext, and the plain text lit up. Messages were typed without spaces, with X for a space or a stop, and a long one was split into parts of about 250 letters, each with its own message key, so that no single key enciphered much.

Notice what the procedure gave away. The six letters of the indicator hide the same three letters twice. The first and the fourth are the same plain letter enciphered at two positions of the machine three steps apart; the second and the fifth, and the third and the sixth, likewise. The Germans doubled the key to catch errors. In §12.8 you will see what it gave a mathematician who could see the pattern.

On 15 September 1938 the army changed the procedure: each operator now picked his own ground setting for the message and sent it in the clear, though the doubled message key was still typed at that setting. In May 1940 the army and air force stopped doubling the key. The navy ran a stricter procedure, with message keys taken from a code book and disguised with tables; it was harder, and chapter 13 tells how it was broken.

Two ideas lie under all this, and every later cipher system kept them: a **long-term key** (the day's sheet) shared by everyone on the net, and a **per-message key** chosen fresh by the sender, so that the long-term key is never used the same way twice. The failure was not in the idea but in the details of sending the per-message key.

## 12.6 Poland's Cipher Bureau and the mathematicians

*Level: beginner.*

Poland came back onto the map in November 1918 after 123 years of partition among Russia, Prussia and Austria. The new state had enemies on both sides, Germany and a Soviet Russia that invaded in 1920, and little money. What it could do cheaply was listen.

In the war with Soviet Russia of 1919 to 1921, Polish radio intelligence read Soviet army messages. Polish accounts credit an officer, Jan Kowalewski, and three university mathematicians, Stanisław Leśniewski, Stefan Mazurkiewicz and Wacław Sierpiński, with breaking a series of Russian ciphers in 1919 and 1920, and credit the intelligence with a part in the Polish victory at Warsaw in August 1920. How large that part was is argued, but the lesson the Polish General Staff took was practical: mathematicians could break ciphers, and Poland had very good ones.

From about 1928 German army radio traffic began to sound different. The Polish stations that listened to it picked up messages that no longer looked like a hand cipher: Enigma. The Bureau's German section, under Captain Maksymilian Ciężki, had a commercial Enigma to study (accounts differ on when and how it got one; a popular story, told by Polish authors and not independently confirmed, has a package of "radio equipment" held at the Warsaw customs office in 1929 and opened by Bureau staff before it was sent on). The military machine, though, had different rotor wiring, and the linguists and officers who had read hand ciphers got nowhere. Reading a machine was not a matter of knowing German.

So in 1929 the Bureau tried something new. With the help of the mathematics professor Zdzisław Krygowski it ran a secret cryptology course at the University of Poznań for about twenty mathematics students. Poznań was chosen because the city had been Prussian until 1919, so many of its students spoke German. Three stood out, and all three were hired:

- **Marian Rejewski**, born in 1905 in Bydgoszcz, studied mathematics at Poznań and then insurance mathematics at Göttingen in 1929 and 1930.
- **Jerzy Różycki**, born in 1909 in what is now Ukraine, studied mathematics at Poznań and was the youngest of the three.
- **Henryk Zygalski**, born in 1908 in Poznań, also studied mathematics there.

By the usual account they worked from 1930 for the Bureau's branch in Poznań on German ciphers. The Poznań branch closed in the summer of 1932, and in September the three men moved to the Bureau in Warsaw. Rejewski was given Enigma to work on, alone at first by his own later account; Różycki and Zygalski joined the work soon after. The Bureau's chief was Major Gwido Langer, and its German section was run by Ciężki. A small radio firm in Warsaw, AVA, whose directors Antoni Palluth and Edward Fokczyński had worked for the Bureau, built the machines the mathematicians designed.

!!! note "Life story: the Polish Cipher Bureau (Biuro Szyfrów)"
    **Born:** 1919, in the Polish General Staff's intelligence department, out of the war with Soviet Russia; the Poznań course was in 1929 · **Purpose:** read the signals of Poland's neighbors · **Helped:** read German army Enigma from 1933 to 1939 with a team that never numbered more than a few dozen people, and gave Britain and France the method in July 1939 · **Status:** evacuated in September 1939; its people worked on in France and Britain (§12.11)

Why mathematicians? The problem of a machine cipher is not one of language. A letter's identity at one moment says little about the next, and frequencies are flat. What does persist is structure: the machine is a fixed device with fixed wiring, and its behavior at each step is a *permutation* of the alphabet. People who had learned to think about permutations, their products and the shapes of their cycles, had an advantage that guessing at German words did not give.

## 12.7 The spy, the French officer and the papers

*Level: beginner.*

The break would have been harder, and might have been much later, without a man in Berlin whose reasons were the usual ones.

**Hans-Thilo Schmidt**, born in 1888, had fought in the First World War and had trouble finding his place afterward. By the usual account a soap factory he ran failed in the postwar hard times and left him in debt. His brother Rudolf, a rising officer in the army's signals branch and later a general, helped him to a post in the Reichswehr's cipher office, the *Chiffrierstelle*, in Berlin, where he handled documents on the Enigma. In 1931 he offered them to France. The sources give money, and resentment toward a more successful brother, as his reasons.

He approached the French and was passed to an officer of French military intelligence, Rodolphe Lemoine, who is known in the files as "Rex". The French gave Schmidt the cover name *Asché*. They met in a hotel in Verviers, in Belgium, in November 1931 (the day usually given is 8 November), and Schmidt handed over the operating instructions and the key instructions for the Enigma. By the usual account he was paid ten thousand marks. He went on meeting Rex over the next years and selling more, including daily key lists for some months.

The papers reached Captain **Gustave Bertrand**, head of the French army's cipher and radio-intelligence section. French cryptologists studied them and judged the machine unbreakable, even with these. Bertrand knew the Poles through the Franco-Polish military alliance and a shared interest in Soviet ciphers, and he took copies to Warsaw. By the usual account he met Langer there in December 1931, and the Bureau began to receive photographs of the documents. A year later, in December 1932, Bertrand supplied the daily keys for September and October 1932, and Langer gave them to Rejewski.

What the papers did *not* contain was the wiring of the rotors. They gave the structure of the machine, the instructions to operators, and, for two months, the plug cables and the rotor order of each day. That mattered: with a day's plugboard known, Rejewski could take it off the problem and write equations for what remained (§12.8).

!!! note "Life story: Hans-Thilo Schmidt (Asché)"
    **Born:** 1888, Berlin; a clerk of the Reichswehr cipher office · **Purpose:** money, and a grudge against a more successful brother · **Helped:** sold France the Enigma papers from 1931, which France passed to the Poles and, later, to Britain · **Status:** arrested in 1943 and died in custody that September; the usual account says suicide

!!! note "Life story: Gustave Bertrand"
    **Born:** 1896; head of the radio-intelligence and cipher section of French military intelligence from the early 1930s · **Purpose:** use Schmidt's papers, and the Polish alliance, to read what France could not · **Helped:** carried the papers to Warsaw, attended the Pyry meeting and later ran the Franco-Polish teams at Bruno and Cadix (§12.11) · **Status:** died in 1976; his book *Enigma* (1973) was the first to describe the Polish break to a wide public

### In the real world

Almost everything about Schmidt comes from the French side, and the main French account, Bertrand's book of 1973, was written long afterward. The Polish side is told by Rejewski, by Władysław Kozaczuk (whose 1967 book, in Polish, first described the Polish break) and by later historians such as David Kahn and Dermot Turing. They agree on the outline and differ over how much the papers mattered. Rejewski's view was that the permutation method was his own and that the papers were needed for the first step, the rotor wiring, and for little after. Few historians now argue that the Poles would never have solved it without Schmidt, and few that they would have solved it that soon. What the Germans learned of Schmidt's work is unclear; the sources show him arrested in 1943, and none shows the German authorities concluding that Enigma had been read.

## 12.8 Rejewski's break

*Level: intermediate.*

In September 1932 Rejewski was 27. He had a stack of intercepted army messages, a commercial Enigma that did not match them, and, soon, the operating instructions that told him how the army used its own. What he did not have was the wiring of the three rotors and the reflector, or the settings of any day.

His first move was to forget the plugboard and look at the indicator. Call the machine's scrambling at its first press $A$, at the second $B$, up to $F$ at the sixth; each of these is a permutation of the 26 letters, plugboard included, and each is its own inverse. An operator typed his key $k_1k_2k_3$ twice, so the first indicator letter is $c_1 = k_1A$ and the fourth is $c_4 = k_1D$. Since $A$ undoes itself, $k_1 = c_1A$, and so

$$
c_4 = c_1 A D .
$$

The interceptor knows neither $A$ nor $D$, but every message gives one pair $(c_1, c_4)$, one letter of the product $AD$. Likewise the second and fifth letters give $BE$, and the third and sixth give $CF$. With enough messages from one day, the three products can be written out in full, from ciphertext alone.

Here is the idea on an alphabet of six letters. Suppose, unknown to the interceptor, $A = (ab)(cd)(ef)$ and $D = (ab)(ce)(df)$. An operator who types the key letter $c$ sends the first letter $cA = d$ and the fourth letter $cD = e$. The interceptor sees the pair $d \to e$ without knowing $c$. Six messages, one for each key letter, give six pairs: $b \to b$, $a \to a$, $d \to e$, $c \to f$, $f \to c$, $e \to d$. Write them as arrows and follow them (Figure 12.5): $a$ goes to itself, $b$ goes to itself, $c$ and $f$ swap, $d$ and $e$ swap. The product $AD$ is $(a)(b)(cf)(de)$, with cycle lengths 1, 1, 2, 2.

<figure class="mars-fig">
<svg viewBox="0 0 640 310" width="640" role="img" aria-label="Six observed first-to-fourth letter pairs and the four cycles they form: a, b, c f and d e" fill="currentColor" font-size="14">
<defs><marker id="a5" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="20" y="26" font-weight="bold">What the interceptor sees</text>
<text x="20" y="48" font-size="13">first letter of the indicator, fourth letter</text>
<text x="40" y="80" font-family="ui-monospace, Menlo, Consolas, monospace">b</text>
<line x1="62" y1="75" x2="112" y2="75" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<text x="124" y="80" font-family="ui-monospace, Menlo, Consolas, monospace">b</text>
<text x="40" y="110" font-family="ui-monospace, Menlo, Consolas, monospace">a</text>
<line x1="62" y1="105" x2="112" y2="105" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<text x="124" y="110" font-family="ui-monospace, Menlo, Consolas, monospace">a</text>
<text x="40" y="140" font-family="ui-monospace, Menlo, Consolas, monospace">d</text>
<line x1="62" y1="135" x2="112" y2="135" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<text x="124" y="140" font-family="ui-monospace, Menlo, Consolas, monospace">e</text>
<text x="40" y="170" font-family="ui-monospace, Menlo, Consolas, monospace">c</text>
<line x1="62" y1="165" x2="112" y2="165" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<text x="124" y="170" font-family="ui-monospace, Menlo, Consolas, monospace">f</text>
<text x="40" y="200" font-family="ui-monospace, Menlo, Consolas, monospace">f</text>
<line x1="62" y1="195" x2="112" y2="195" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<text x="124" y="200" font-family="ui-monospace, Menlo, Consolas, monospace">c</text>
<text x="40" y="230" font-family="ui-monospace, Menlo, Consolas, monospace">e</text>
<line x1="62" y1="225" x2="112" y2="225" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<text x="124" y="230" font-family="ui-monospace, Menlo, Consolas, monospace">d</text>
<text x="260" y="26" font-weight="bold">Follow the arrows: four cycles</text>
<circle cx="300" cy="90" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="300" y="95" text-anchor="middle">a</text>
<circle cx="300" cy="170" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="300" y="175" text-anchor="middle">b</text>
<text x="330" y="95" font-size="12">maps to itself</text><text x="330" y="175" font-size="12">maps to itself</text>
<circle cx="300" cy="250" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="300" y="255" text-anchor="middle">c</text>
<circle cx="400" cy="250" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="400" y="255" text-anchor="middle">f</text>
<circle cx="500" cy="250" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="500" y="255" text-anchor="middle">d</text>
<circle cx="590" cy="250" r="16" fill="none" stroke="currentColor" stroke-width="1.4"/><text x="590" y="255" text-anchor="middle">e</text>
<line x1="318" y1="244" x2="380" y2="244" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<line x1="382" y1="256" x2="320" y2="256" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<line x1="518" y1="244" x2="572" y2="244" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<line x1="574" y1="256" x2="520" y2="256" stroke="currentColor" stroke-width="1.4" marker-end="url(#a5)"/>
<text x="20" y="290" font-size="13">Cycle lengths 1, 1, 2, 2. Change the plugboard and the letters change, but not these lengths.</text>
</svg>
<figcaption>Figure 12.5. The toy alphabet of the worked example. Each observed pair is one arrow; the pairs close into cycles. The fixed points a and b are what the Poles later called females.</figcaption>
</figure>


Now Rejewski's central fact. The plugboard $S$ is one more permutation, and the real machine's scrambling is $A = S\bar A S$, where $\bar A$ is the machine without plugs. So the product the interceptor sees is $AD = S(\bar A\bar D)S$, the plugless product with its letters *renamed* by $S$. Renaming cannot change how many letters lie in a cycle. **The cycle lengths of $AD$, $BE$ and $CF$ depend only on the rotor order and the starting position, not on the plugs.** The plugboard supplied almost all the key space (§12.4), and it vanished from the problem. What was left was the six rotor orders times 17,576 positions, a number a person can attack. Rejewski called the three lists of cycle lengths the **characteristic** of the day. In the toy example, a plug that swaps $a$ and $c$ turns $(a)(b)(cf)(de)$ into $(c)(b)(af)(de)$: other letters, the same lengths 1, 1, 2, 2.

The program below shows it on the real machine. It plays the operators of one day, who all type their keys twice at the day's ground setting, and it uses keys of the form `xAA`, `AxA` and `AAx` for every letter $x$ to collect the three products. It does this for a day with ten plug cables and for the same day with none (reflector A, which by the Polish accounts was the army's until November 1937).

```python
A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
ROTORS = {"I": ("EKMFLGDQVZNTOWYHXUSPAIBRCJ", "Q"),
          "II": ("AJDKSIRUXBLHWTMCQGZNPYFVOE", "E"),
          "III": ("BDFHJLCPRTXVZNYEIWGAKMUSQO", "V")}
REFLECTOR_A = "EJMZALYXVBWFCRQUONTSPIKHGD"      # the reflector of the early 1930s

def enigma(text, order, start, plugs=""):
    wiring = [ROTORS[r][0] for r in order]
    notch = [ROTORS[r][1] for r in order]
    pos = [A.index(c) for c in start]
    swap = {c: c for c in A}
    for pair in plugs.split():
        swap[pair[0]], swap[pair[1]] = pair[1], pair[0]
    out = ""
    for ch in text:
        if A[pos[1]] == notch[1]:
            pos[0] = (pos[0] + 1) % 26
            pos[1] = (pos[1] + 1) % 26
        elif A[pos[2]] == notch[2]:
            pos[1] = (pos[1] + 1) % 26
        pos[2] = (pos[2] + 1) % 26
        c = A.index(swap[ch])
        for i in (2, 1, 0):
            c = (A.index(wiring[i][(c + pos[i]) % 26]) - pos[i]) % 26
        c = A.index(REFLECTOR_A[c])
        for i in (0, 1, 2):
            c = (wiring[i].index(A[(c + pos[i]) % 26]) - pos[i]) % 26
        out += swap[A[c]]
    return out

def cycles(link):                          # link maps a letter to a letter; returns its cycles
    seen, found = set(), []
    for s in A:
        if s not in seen:
            cyc, x = "", s
            while x not in seen:
                seen.add(x)
                cyc += x
                x = link[x]
            found.append(cyc)
    return sorted(found, key=len, reverse=True)

def day(order, ground, plugs):
    # Each operator types his key twice at the day's ground setting. Using the keys
    # xAA, AxA and AAx for every letter x collects first->fourth, second->fifth
    # and third->sixth letter pairs: the products AD, BE and CF.
    links = [{}, {}, {}]
    for x in A:
        for slot in range(3):
            key = ["A", "A", "A"]
            key[slot] = x
            sent = enigma("".join(key) * 2, order, ground, plugs)
            links[slot][sent[slot]] = sent[slot + 3]
    return links

order, ground = ("II", "I", "III"), "KDO"
with_plugs = day(order, ground, "AV BS CG DL FU HZ IN KM OW RX")
no_plugs = day(order, ground, "")
print("AD with ten plugs:", " ".join(cycles(with_plugs[0])))
print("AD with no plugs: ", " ".join(cycles(no_plugs[0])))
for name, d in (("with plugs", with_plugs), ("no plugs  ", no_plugs)):
    print(name, [[len(c) for c in cycles(link)] for link in d])
```

Output:

```
AD with ten plugs: CPUNEVZLM JQTSROKYW AFBX DGHI
AD with no plugs:  AHDKGPFIE BXWMYOJQT CZNL RVUS
with plugs [[9, 9, 4, 4], [13, 13], [11, 11, 1, 1, 1, 1]]
no plugs   [[9, 9, 4, 4], [13, 13], [11, 11, 1, 1, 1, 1]]
```

The letters in the cycles differ, since the plugboard renamed them, but the lengths are the same: 9, 9, 4, 4 for $AD$, then 13, 13 for $BE$, then 11, 11, 1, 1, 1, 1 for $CF$. Notice that the lengths come in equal *pairs*, which is a second fact Rejewski proved (§12.15). The four fixed points in $CF$ are letters whose third and sixth indicator letters coincide. The Poles called an indicator with such a match a *female* (*samiczka*), and they would put it to work in 1938.

The proof, the six-letter example done the long way, and the step from the product to the wiring are in [Cryptanalysis, chapter 3, section 3.3](../cryptanalysis/03-Machines-and-the-War.md). Here is the outline of that step. With the daily keys of September and October 1932 from Schmidt, Rejewski knew the plugboard $S$ for those days and could strip it from each product. What was left was a set of equations whose unknowns were the wiring of the right-hand rotor and the fixed combination of the other two rotors with the reflector. Rejewski solved them. Then there was one more unknown: how the keyboard letters were joined to the first rotor's contacts (the *entry wheel*). The commercial machine joined them in keyboard order, Q to the first contact, W to the second, and so on. Rejewski tried that and it failed. He then guessed that the army had simply wired A to A, B to B, and so on, and the guess was right. By the end of December 1932 he had the wiring of all three rotors and the reflector, and in January 1933 the Bureau began reading army Enigma. David Kahn and others have called it one of the great achievements of cryptanalysis: a machine rebuilt from its ciphertext, a few papers from a spy and some group theory.

!!! note "Life story: Marian Rejewski"
    **Born:** 1905, Bydgoszcz; died 13 February 1980, Warsaw · **Purpose:** find the wiring and the daily keys of the army Enigma · **Helped:** read German army Enigma for most of 1933 to 1939, and gave Britain and France the method in 1939 · **Status:** after the war he returned to Poland (1946) and held ordinary jobs; his Enigma work was unknown to the Polish public until 1967, and his own accounts of the mathematics appeared in 1980 and 1981

## 12.9 The race: grill, cyclometer, catalog, sheets and bomba

*Level: intermediate.*

The wiring let the Bureau build copies of the machine, and AVA built "Enigma doubles" for it. But the settings changed every day, and finding them was the daily work. The Poles built a sequence of methods, each answering what the Germans changed next.

**The grill.** Rejewski's first daily method, from 1933, was a paper one, called the grill (*metoda rusztu*). It found the rotor order and the start by testing the products from the indicators against what the machine could do, and it relied on the plugboard's having few cables: with six pairs, 14 letters pass the plugboard unchanged, and those letters give a footing. (I give only the outline; the sources describe it differently in detail.) It worked, but slowly, and it got harder as the number of cables grew.

**The cyclometer and the catalog.** Rejewski's answer, in 1934 to 1935, was a device and a file. The *cyclometer* was a pair of linked Enigma-like rotor sets with a board of lamps; set to one starting position, it showed the cycle lengths of the product $AD$ directly. The Bureau ran every setting of every rotor order through it and filed each by its characteristic, a card catalog that took, by Rejewski's account, about a year to make. After that each day's work began by finding the day's characteristic from the intercepts, looking it up and getting a short list of possible settings. Różycki's *clock method*, which helped find which rotor stood on the right, was used alongside it.

How useful a catalog is depends on how many settings share a characteristic. The next program builds the whole catalog the way the cyclometer would: all six orders of rotors I, II and III, all 17,576 starting positions, six presses each, with the stepping done properly. It takes about ten seconds.

```python
from itertools import permutations
from collections import Counter

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
WIRES = {"I": "EKMFLGDQVZNTOWYHXUSPAIBRCJ",
         "II": "AJDKSIRUXBLHWTMCQGZNPYFVOE",
         "III": "BDFHJLCPRTXVZNYEIWGAKMUSQO"}
NOTCH = {"I": A.index("Q"), "II": A.index("E"), "III": A.index("V")}
REFLECTOR = [A.index(c) for c in "EJMZALYXVBWFCRQUONTSPIKHGD"]    # reflector A

# fwd[name][k][c]: a rotor turned k places, letter c going in; bwd is the way back
fwd = {n: [[(A.index(w[(c + k) % 26]) - k) % 26 for c in range(26)] for k in range(26)]
       for n, w in WIRES.items()}
bwd = {n: [[fwd[n][k].index(c) for c in range(26)] for k in range(26)] for n in WIRES}

def press(order, pos, c):                 # one key press, no plugs
    for i in (2, 1, 0):
        c = fwd[order[i]][pos[i]][c]
    c = REFLECTOR[c]
    for i in (0, 1, 2):
        c = bwd[order[i]][pos[i]][c]
    return c

def shape(perm):                          # the cycle lengths of a permutation
    seen, lengths = set(), []
    for s in range(26):
        n, x = 0, s
        while x not in seen:
            seen.add(x)
            x = perm[x]
            n += 1
        if n:
            lengths.append(n)
    return tuple(sorted(lengths, reverse=True))

catalog = Counter()
for order in permutations(WIRES):                         # six orders of the three rotors
    for ground in range(26 ** 3):                         # 17,576 ground settings
        pos = [ground // 676, ground // 26 % 26, ground % 26]
        perms = []
        for _ in range(6):                                # the six letters of a doubled key
            if pos[1] == NOTCH[order[1]]:
                pos[0], pos[1] = (pos[0] + 1) % 26, (pos[1] + 1) % 26
            elif pos[2] == NOTCH[order[2]]:
                pos[1] = (pos[1] + 1) % 26
            pos[2] = (pos[2] + 1) % 26
            perms.append([press(order, pos, c) for c in range(26)])
        products = [[perms[b][perms[a][c]] for c in range(26)] for a, b in ((0, 3), (1, 4), (2, 5))]
        catalog[tuple(shape(p) for p in products)] += 1

total = sum(catalog.values())
print(total, "settings,", len(catalog), "different characteristics")
print(sum(1 for n in catalog.values() if n == 1), "characteristics name exactly one setting")
print("the commonest one fits", max(catalog.values()), "settings")
print(round(100 * sum(n for n in catalog.values() if n <= 10) / total), "percent of settings sit in a group of 10 or fewer")
print("a typical day leaves about", round(sum(n * n for n in catalog.values()) / total), "settings to try")
```

Output:

```
105456 settings, 20882 different characteristics
11059 characteristics name exactly one setting
the commonest one fits 1727 settings
39 percent of settings sit in a group of 10 or fewer
a typical day leaves about 113 settings to try
```

So the 105,456 settings fall into about 20,900 different characteristics. For a random day the catalog leaves about a hundred candidates on average, and for about two days in five ten or fewer. That is a list a team can check by hand against the rest of the day's traffic, and that is what the Bureau did. (The numbers above are this program's, not the Bureau's own.)

The Germans kept raising the price, and Poland kept paying until it could not. Figure 12.6 lines up their changes with the Polish answers.

<figure class="mars-fig">
<svg viewBox="0 0 640 384" width="640" role="img" aria-label="A table of German changes to Enigma procedure on the left and the Polish answers on the right" fill="currentColor" font-size="14">
<text x="14" y="26" font-weight="bold">Germany changes</text><text x="330" y="26" font-weight="bold">Poland answers</text>
<line x1="8" y1="38" x2="632" y2="38" stroke="currentColor" stroke-width="1.2"/>
<text x="14" y="60" font-size="13" font-weight="bold">1930</text>
<text x="14" y="78" font-size="13">Plugboard added to the army machine</text>
<text x="330" y="62" font-size="13">Rejewski's theorem: the plugs drop out of the</text>
<text x="330" y="78" font-size="13">cycle lengths</text>
<line x1="8" y1="98" x2="632" y2="98" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="114" font-size="13" font-weight="bold">2 Nov 1937</text>
<text x="14" y="132" font-size="13">New reflector</text>
<text x="330" y="116" font-size="13">Rejewski works out its wiring; the catalog is</text>
<text x="330" y="132" font-size="13">rebuilt</text>
<line x1="8" y1="152" x2="632" y2="152" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="168" font-size="13" font-weight="bold">15 Sep 1938</text>
<text x="14" y="186" font-size="13">Each operator picks his own ground setting</text>
<text x="330" y="170" font-size="13">Females, Zygalski's sheets, and the bomba</text>
<line x1="8" y1="206" x2="632" y2="206" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="222" font-size="13" font-weight="bold">15 Dec 1938</text>
<text x="14" y="240" font-size="13">Rotors IV and V: 60 rotor orders, not 6</text>
<text x="330" y="224" font-size="13">Ten times the sheets and bombs; too many for</text>
<text x="330" y="240" font-size="13">the Bureau</text>
<line x1="8" y1="260" x2="632" y2="260" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="276" font-size="13" font-weight="bold">Early 1939</text>
<text x="14" y="294" font-size="13">Up to ten plug cables (was five to eight)</text>
<text x="330" y="278" font-size="13">The bomba's unplugged-letter test fails more</text>
<text x="330" y="294" font-size="13">often</text>
<line x1="8" y1="314" x2="632" y2="314" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
<text x="14" y="330" font-size="13" font-weight="bold">May 1940</text>
<text x="14" y="348" font-size="13">The message key is no longer typed twice</text>
<text x="330" y="332" font-size="13">The Polish methods end; Turing's bombe takes</text>
<text x="330" y="348" font-size="13">over (ch. 13)</text>
<line x1="8" y1="368" x2="632" y2="368" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
</svg>
<figcaption>Figure 12.6. Six German changes and what the Polish Bureau did about each. The first four show a small team keeping pace; the fifth and sixth show it falling behind.</figcaption>
</figure>


On 2 November 1937 (some sources say the 1st) the army changed the reflector. Rejewski recovered the new reflector's wiring from the traffic, and the catalog was rebuilt. On 15 September 1938 came the change that ended the catalog: each operator now picked his own ground setting, and a day no longer had one set of products $AD$, $BE$, $CF$. The Bureau answered within weeks with two methods built on the *females* of §12.8, indicators where the same letter stands at places one and four (or two and five, or three and six). A female means the product has a fixed point at that rotor position, and whether a position can have one depends on the rotors, not on the plugs.

**Zygalski's sheets**, devised by Henryk Zygalski, were perforated cards, a 26-by-26 grid for each rotor order and each position of the left-hand rotor, with a hole wherever a female could occur. Stack a day's sheets, each shifted by the clear ground setting of one message, and light shows through only at settings that fit every female. **The bomba** (plural *bomby*), designed by Rejewski in October 1938 and built by AVA, joined six Enigma doubles in pairs, and ran through all 17,576 positions of one rotor order in about two hours, stopping where the females lined up. Six were made, one for each order, by November 1938. (Nobody is sure where the name came from; one story says the round ice-cream dessert, another the ticking of the device.) It assumed that the female letter was not on a plug cable, which was true often enough with five to eight cables.

!!! note "Life story: the bomba (1938)"
    **Born:** October 1938, designed by Rejewski and built by AVA in Warsaw; six machines by November · **Purpose:** find a day's rotor setting from three messages whose indicators contain females · **Helped:** kept the Bureau reading after the procedure change of 15 September 1938 · **Status:** made useless in practice by the extra rotors of 15 December 1938 and the extra plug cables of early 1939; the British bombe of 1940 (chapter 13) was a different machine with the same name

!!! note "Life story: Jerzy Różycki"
    **Born:** 1909, in what is now Ukraine; died 9 January 1942 · **Purpose:** the clock method for finding the right-hand rotor, and a large share of the daily work on Enigma · **Helped:** the Bureau's daily break in the mid-1930s and the work in France (§12.11) · **Status:** drowned at 32 when the ship *Lamoricière* sank in the Mediterranean

!!! note "Life story: Henryk Zygalski"
    **Born:** 1908, Poznań; died 1978, in Hampshire · **Purpose:** the perforated sheets of 1938 · **Helped:** kept the break alive through the autumn of 1938, and in France in 1939 and 1940 · **Status:** reached Britain in 1943, taught mathematics after the war, and died in 1978, two years before Rejewski's own account of the method appeared

Then the arithmetic turned. On 15 December 1938 the army issued two more rotors. The machine still held three, but chosen from five: $5 \times 4 \times 3 = 60$ orders, not 6. The Poles worked out the wiring of the two new rotors in a few weeks (by some accounts with fresh key lists from Schmidt), but the number of sheets needed rose tenfold and the number of bomby to sixty. By January 1939 the army was using up to ten plug cables, and the bomba's assumption about unplugged females failed more often. The Bureau had neither the money nor the people. A method that had kept pace for six years was now behind, and in the spring of 1939, with war near, Poland's General Staff decided, by the usual account, to give everything away.


## 12.10 Pyry, July 1939

*Level: beginner.*

By 1939 the Poles could see what was coming, and what they could not do alone. When the three allies' cipher services met in Paris in January, the Poles by the usual account said little. In the spring Britain and France guaranteed Poland's frontiers, and the Polish General Staff decided to share the whole Enigma work with its allies. At the end of July Langer invited them to Warsaw.

The French sent Bertrand and a cipher officer, Captain Henri Braquenié. Britain sent Alastair Denniston, head of the Government Code and Cypher School; Dilly Knox, its leading Enigma expert, who had spent years stuck on the very question of how the keyboard was wired to the rotors; and Commander Humphrey Sandwith of the Admiralty. On 25 and 26 July 1939 (some accounts say 26 and 27) the Bureau took them to its secret center at Pyry, in the Kabaty forest south of Warsaw. There the Poles showed them everything: the wiring of the rotors, the Enigma doubles AVA had built, the cyclometer and catalog, Zygalski's sheets and a bomba at work. The British were told what they could not have worked out for themselves, including that the entry wheel was wired in the order of the alphabet. In the telling that has come down, Knox was irritated at how simple the answer had been.

The Poles promised each ally a replica Enigma and the drawings of the sheets and the bomba. By the usual account a replica reached London by diplomatic bag in August 1939 and was met at Victoria station by officers of the Secret Intelligence Service. Within five weeks Germany had invaded.

!!! note "Life story: the Pyry meeting, 25 and 26 July 1939"
    **Born:** a decision of the Polish General Staff in the spring of 1939 · **Purpose:** hand the Polish break of Enigma to Britain and France before Poland could no longer use it · **Helped:** gave Bletchley Park the wiring, the method and a replica machine weeks before the war; the British made their own sheets and read their first wartime Enigma messages in January 1940 · **Status:** the Polish methods ended in May 1940 when the doubled key was dropped, but the mathematics lived on in the British bombe (chapter 13)

Why give it all away? The Bureau had run out of room (§12.9). It could not build sixty bomby, and it knew that in a war it might not survive. Britain and France had factories, money and radio networks; Poland had an idea that would be wasted if it fell with Warsaw.

### In the real world

The accounts of Pyry differ in small ways: the dates (25 and 26 July, or 26 and 27), who stood where, what was said. The main sources are Bertrand's book of 1973, Rejewski's later writings, Kozaczuk's studies and the British official history and memoirs, all written decades afterward; I know of no minutes. They agree on who came, on the main things shown, and on the promise of the replicas. The story that Knox was angry rests on later retelling, and the arrival of the replica at Victoria station deserves a better source than "the usual account".

## 12.11 What became of them

*Level: beginner.*

Germany invaded Poland on 1 September 1939. By the usual account the Bureau destroyed its equipment and papers at Pyry and left Warsaw in the first week of the war, and when the Soviet Union invaded from the east on 17 September its staff crossed into Romania. With Bertrand's help most of them reached France within weeks. There they worked with the French, first at a château east of Paris (code-named Bruno), where the Poles went on reading Enigma into the spring of 1940 and exchanged results with Bletchley, and after the fall of France in June 1940 at a country house near Uzès, in the part of France that Vichy ran (code-named Cadix), from late 1940 to November 1942. When Germany occupied the south that month, the team dispersed.

**Różycki** did not survive. On 9 January 1942 he sailed on the ship *Lamoricière* from Algiers to Marseille; it sank in a storm in the Mediterranean, and he and the others from the Bureau on board were lost. He was thirty-two.

**Rejewski and Zygalski** crossed the Pyrenees into Spain in early 1943, were held for some weeks by the Spanish police, and reached Britain in the summer of 1943. They were not taken to Bletchley Park. The usual explanation is security: they knew too much of how Enigma had been read, and Britain did not want to risk their capture. They worked instead for the Polish Army's signals unit in Hertfordshire, on German hand ciphers used by the SS and police, which they solved. Rejewski returned to Poland in 1946 to a wife and two children he had not seen for nearly seven years. He worked at ordinary jobs, and the Polish authorities of the time, wary of a man who had served in the West, did not tell his story. Zygalski stayed in England and taught mathematics. **Langer and Ciężki**, the Bureau's chiefs, were caught in March 1943 trying to cross into Spain and spent the rest of the war in German hands; so far as the sources show, their captors never learned who they were. Both died in Britain, Langer in 1948 and Ciężki in 1951. **Antoni Palluth**, who built the machines, was by the sources I know arrested by the Germans and died in a concentration camp in 1944.

For thirty years the Polish part of the story was nearly unknown. Britain kept the Enigma break secret until the 1970s, and the Polish authorities did not speak of men who had stayed in the West. The first account of the Polish break was Kozaczuk's book of 1967, in Polish. Bertrand's *Enigma* appeared in 1973, and Winterbotham's *The Ultra Secret* in 1974. The British official history, by Hinsley and others, set out the Polish role in 1979. Rejewski died on 13 February 1980, and his own accounts of the mathematics appeared in print in 1980 and 1981.

### Women in the story

I looked for the women who worked on the Polish side and found less than the story deserves. Irena Rejewska, Marian's wife, kept the family in occupied Warsaw while he was abroad, but she was not a codebreaker. The Bureau's typists, clerks, copyists and radio-intercept operators did work that cannot be done without, and the histories I could check do not name them; I could not find a woman among the Bureau's cryptologists or engineers named in any source. That silence is in the record, not proof of absence: the Bureau's papers were destroyed in 1939, and the memoirs we have are by its officers and mathematicians. The women who did the matching work for the Allies are named in chapter 13 (Mavis Lever, Margaret Rock, Joan Clarke and others). On the German side, women of the signals auxiliary corps, the *Nachrichtenhelferinnen*, worked the radio and cipher rooms of headquarters by the middle of the war, and appear in memoirs more than in histories. A historian with access to the Polish archives could close the gap.

## 12.12 The operators

*Level: beginner.*

The Germans told their operators to pick message keys at random. They often did not. The three-letter key was a small choice, made many times a day by a tired man with no one checking, and he reached for what was handy: the same letter three times (AAA), letters in alphabet order (ABC), keys side by side on the keyboard (QWE, ASD, PYX), a girl's initials, the letters left showing in the windows from the last message. Bletchley called such keys *cillies*, a word usually traced to one operator's use of CIL. Rejewski used these habits to choose among the answers that the mathematics allowed, and they stayed useful for years.

The Enigma keyboard had three rows: QWERTZUIO, ASDFGHJK and PYXCVBNML. The program below lists every three-letter key that fits one of the habits, marks a made-up day's traffic, and puts a number on how much a habit gives away.

```python
from itertools import product

A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
ROWS = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"]       # the Enigma keyboard, row by row

def lazy(key):
    if len(set(key)) == 1:
        return "one letter three times"
    if key in A or key[::-1] in A:
        return "three letters in alphabet order"
    if any(key in r or key[::-1] in r for r in ROWS):
        return "three keys side by side"
    return ""

keys = ["".join(k) for k in product(A, repeat=3)]
habits = [k for k in keys if lazy(k)]
print(len(keys), "possible keys;", len(habits), "of them are habits")

# One day's traffic from one radio net (made up for this page)
day = ["QWE", "KRM", "AAA", "TZB", "ABC", "JHD", "EEE", "PYX", "WLN", "CBA", "OVG", "SDF"]
for k in day:
    print(k, lazy(k) or "-")

# If 1 operator in 20 reached for a habit, how much likelier is each habit than a random key?
chance = 1 / len(keys)
habit_chance = (1 / 20) / len(habits)
print("a habit key is about", round(habit_chance / chance), "times likelier than a random one")
```

Output:

```
17576 possible keys; 110 of them are habits
QWE three keys side by side
KRM -
AAA one letter three times
TZB -
ABC three letters in alphabet order
JHD -
EEE one letter three times
PYX three keys side by side
WLN -
CBA three letters in alphabet order
OVG -
SDF three keys side by side
a habit key is about 8 times likelier than a random one
```


Seven of the twelve keys are habits, a higher share than any real net showed; the last line assumes that one operator in twenty reached for one, a figure made up for the arithmetic and not a measurement. Even so small a share makes each habit key about eight times likelier than a random one, and the analyst only needs the odds to lean his way. A message sent with AAA hands him six cipher letters that are all the same plain letter enciphered at six successive positions of the machine, which is a great deal of structure to test a guess against. To try the exercise yourself, add the keyboard's *columns* (QAP, WSY, EDX and so on, up and down) to the program: the count of habits rises from 110 to 126.

The habits were not only in the keys. Operators sent the same stereotyped texts day after day: a weather report, the word AN ("to") at the start, X for every space, KEINE BESONDEREN EREIGNISSE ("nothing special to report"), HEIL HITLER at the end. Each is a crib, and the next chapter shows how Bletchley Park turned them into a machine search. The navy added a code book on top of the machine, a short-signal book and a weather book for the shortest and most routine reports, and the books gave cribs too: it was a captured weather book that let Bletchley read the four-rotor U-boat key again in December 1942 (chapter 13). The pattern is the one the telegraph age taught: a good lock, and a key under the mat. Kerckhoffs's second rule ([chapter 10](10-The-Telegraph.md)) asks that a system be safe even if the enemy has the machine; it must also be safe from the people who use it.

## 12.13 Enigma's relatives

*Level: beginner.*

Enigma was not one machine but a family, and the difference between its members is part of the story. Years below are approximate, and for the early models the sources disagree by a year or two.

| Model | About | Who used it | What was different |
|---|---|---|---|
| Enigma A to D | 1923 to 1926 | businesses and governments that bought one | the commercial machines; the first printed on paper, the later ones had lamps |
| *Funkschlüssel C* | 1926 | German navy | a version of the commercial Enigma C |
| Enigma D, K | late 1920s on | Spain, Italy, Switzerland and others | commercial pattern, with rotor wiring unlike the military machine |
| Enigma G (G-31, G-312) | about 1928 to 1931 | the *Abwehr* (German military intelligence) | no plugboard; a counter and a different stepping |
| Enigma I | 1930 | army, then air force | the plugboard model; rotors I to III, then I to V from December 1938 |
| M3 | 1934 | navy | three rotors chosen from up to eight by 1939 |
| M4 | February 1942 | U-boats | a fourth, thin rotor beside the reflector (chapter 13) |
| Enigma T | 1942 | Japan | built for Japan, only a few made |
| Uhr | 1944 | some navy and air force nets | a switch box in place of the plugboard's fixed pairs; few made |

The **Swiss** army and air force used the commercial Enigma K, with wiring of their own, from the late 1930s, and later replaced it with a Swiss-designed machine, the NEMA. A neutral country could simply buy what Germany's army had to keep secret, which is why the military machine's secrecy rested on its wiring and keys, not on its design.

The **Italian navy** used a machine of the commercial pattern with wiring of its own. Dilly Knox's section at Bletchley Park, in which Mavis Lever (later Batey), then nineteen, and Margaret Rock worked, solved it in 1940 and 1941, and the decrypts gave the Royal Navy advance warning before the battle of Cape Matapan in March 1941. How one stray habit, an Italian operator's message with no letter L in it, gave the opening is told in [Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md), and the people are in chapter 13.

In the **Spanish Civil War** (1936 to 1939) Franco's side, helped by Germany, used commercial Enigmas, and by the usual account Knox had solved their messages by 1937. It was Britain's first success against an Enigma and it trained the people who would go on to the military machine two years later.

The rotor idea went far beyond Enigma. Britain's Typex of the 1930s grew out of the commercial Enigma; the United States built SIGABA; Japan built machines of its own, among them the diplomatic Purple (chapter 14); and the Soviet Union's Fialka of the 1950s was a rotor machine too. Chapter 13 tells why Typex and SIGABA held when Enigma did not.

## 12.14 Can these be broken today?

*Level: intermediate.*

Yes, and fast. A rotor machine's key space, even $2^{67}$, is small beside modern work, and the machine's own structure gives the attacker a footing.

| System | Broken today? | In plain words |
|---|---|---|
| A single rotor | yes, instantly | 26 alphabets that are shifts of one; a statistical attack on a few hundred letters |
| Enigma I with the doubled key | yes, in seconds | the products of §12.8 give the characteristic, and a computer can run the catalog in seconds |
| Enigma I or M3, no doubled key, no crib | yes, in minutes | a program tries rotor orders and positions, then improves the plugboard a swap at a time while the text looks more like German; James Gillogly published the first such ciphertext-only attack in 1995; volunteers' computers have since read wartime naval messages that were never solved (news reports of a project begun in 2006) |

A laptop now does what took the bombes and the people of Bletchley Park. The lesson is the one the Poles and the British both learned: a machine cipher is a structure, and a structure leaks.

## 12.15 Going deeper

*Level: expert.*

**The mathematics.** The "pairs" in the Output of §12.8 are a theorem: the product of two permutations that are each their own inverse and fix no letter has its cycles in equal-length pairs. Rejewski proved it, and the proof is short (an involution that mapped a cycle of $AD$ onto itself would force a fixed letter on $A$ or on $D$); it is in [Cryptanalysis, section 3.13](../cryptanalysis/03-Machines-and-the-War.md). The pairing limits the characteristics: each product has the shape of a partition of 13 (each cycle length used twice), and 13 has 101 partitions, so there are $101^3 = 1{,}030{,}301$ possible characteristics. Only 20,882 of them occur among the 105,456 settings of the program in §12.9, so a catalog sorted by characteristic is small, and a day's characteristic points to a short list.

**What is disputed.** The record of the Polish break is thinner than the fame of it. The Bureau's papers were destroyed in 1939, and the early history depends on Rejewski's later writings, on memoirs by Bertrand and others, and on Kozaczuk's interviews with survivors. The date of the cyclometer (1934 or 1935), the dates and attendees of the Pyry meeting, how decisive the Schmidt papers were, the customs-office story of 1929, and the role of Professor Krygowski in the Poznań course are all argued, and this chapter gives the versions that most authors accept. The sources are better on the mathematics, which Rejewski published himself, than on the institution around it.

**Open questions.** What the German side suspected before 1939 is not settled, though everything shows it never concluded that Enigma was read. The size of the Bureau's staff, and how many were women, is not in any source I know. And the part that Polish work in France played after 1940 is still being worked out from archives in Poland, France and Britain.

## Check yourself

??? question "1. Why is a single rotor, even one wired at random, not a safe cipher?"
    It gives only 26 alphabets, which are all shifts of one mixed alphabet. A message that repeats after 26 letters gives a repeated ciphertext, as the program in §12.2 shows, and the 26 related alphabets can be recovered statistically from a few hundred letters.

??? question "2. Three rotors stepping like an odometer would return to the start after $26^3 = 17{,}576$ letters. Enigma's real period is 16,900. Where does the 16,900 come from?"
    The middle rotor steps twice in a row when it is at its notch: once because the right rotor carries it, and once more, with the left rotor, on the next press. So the middle rotor goes through its 26 positions in 25 turns of the right rotor, not 26, and the whole period is $26 \times 25 \times 26 = 16{,}900$.

??? question "3. Name two consequences of the reflector, one a gain and one a flaw."
    The gain is that the machine is its own inverse, so the same settings encrypt and decrypt and one machine does both jobs. The flaw is that no letter can ever encrypt to itself, which lets an attacker rule out places where a guessed word cannot sit.

??? question "4. Rotors in order (3 of 5), start positions and ten plug pairs give about $1.59 \times 10^{20}$ keys. Which of these three parts is the largest, and by roughly how much more than the other two together?"
    The plugs: 150,738,274,937,250 ways, against $60 \times 17{,}576 = 1{,}054{,}560$ for the rotor orders and starts together. The plugs are about 143 million times as large. That is why the discovery that the plugboard drops out of the cycle lengths (§12.8) mattered more than any other single step.

??? question "5. Why did every message get its own message key, rather than starting at the day's ground setting?"
    If every message of a day started at the same place, they would all use the same alphabets in the same order, and stacks of them could be subtracted to strip the key out (a depth). A fresh three-letter key spreads the starts over the 17,576 positions.

??? question "6. With $A = (ad)(be)(cf)$ and $D = (ab)(cd)(ef)$, find the cycles of $AD$ (apply $A$ first). Then swap the letters $a$ and $b$ by a plugboard and find the new cycles."
    $a \to d$ under $A$ and then $c$ under $D$, so $a \to c$; $c \to f \to e$; $e \to b \to a$: the cycle $(ace)$. In the same way $b \to e \to f$, $f \to c \to d$, $d \to a \to b$: $(bfd)$. So $AD = (ace)(bfd)$. Swapping $a$ and $b$ renames the letters: $(bce)(afd)$. The cycles are different but the lengths, 3 and 3, are the same.

??? question "7. The first six letters of an indicator read PUZPQM. Where is the female, and what does it say about $AD$?"
    The first and fourth letters are both P, so this is a female at positions one and four. It means that the product $AD$ maps P to itself: P is a fixed point, a cycle of length 1. Whether such a fixed point can occur at a given rotor position depends on the rotors and not on the plugs, which is what made the sheets and the bomba possible.

??? question "8. What did Hans-Thilo Schmidt's papers give the Poles, what did they not give, and why did that matter?"
    They gave the structure of the machine, the instructions for operators and the daily keys for two months of 1932, but not the wiring of the rotors. With the plugboard known for those days, Rejewski could remove it from his equations and solve for the wiring; without it the two would have had to be found together. He still had to guess the entry wheel's order, and the daily work afterward used only his own mathematics.

??? question "9. On 15 December 1938 the army went from 6 rotor orders to 60. Each bomba searched one order in about two hours, and the Bureau had six. How long would a day's search take, and why did that defeat the Poles?"
    Sixty orders at two hours each is 120 machine-hours, and six machines share it: 20 hours. The key changed every day, so nearly the whole of each day would go on finding that day's key, and the extra plug cables from January 1939 made the bomba's test fail more often.

??? question "10. If one operator in twenty chose one of the 110 habit keys of §12.12, how many times likelier is each habit key than a key chosen at random? How large a share of operators would have to use habits for each to be 100 times likelier?"
    Each habit key has chance $(1/20)/110$ against $1/17{,}576$ for a random key: $17{,}576 / (20 \times 110) \approx 8$ times. For 100 times, the share $f$ satisfies $f/110 = 100/17{,}576$, so $f \approx 0.63$: about 63 percent of operators, far more than any net showed. A small share was enough.

## What you learned

- The rotor, a wheel wired as a scrambled alphabet that turns after each letter, was invented four times in five years (Scherbius in Germany, Koch and the Dutch naval officers in the Netherlands, Damm in Sweden, Hebern in the United States). Three rotors give a key that does not repeat for 16,900 letters.
- Enigma was a business failure that became the German forces' cipher: the navy adopted it in 1926, the army in 1928, the air force after 1935, with a reflector (no letter encrypts to itself) and a plugboard (almost all of the $10^{20}$ keys).
- The daily key and the message key were a good idea; typing the message key twice, to catch errors, gave the enemy a relation between the first and fourth letters, the second and fifth, and the third and sixth.
- Poland's Cipher Bureau, with experience from the war of 1920, hired mathematicians in 1929. Rejewski, Różycki and Zygalski were its answer; Schmidt's papers, bought by France and passed on by Bertrand, gave them the plugboard of two months.
- Rejewski's central fact: the cycle lengths of the products $AD$, $BE$, $CF$ do not depend on the plugboard. With it, and an inspired guess about the entry wheel, he had the wiring by December 1932.
- The cyclometer and catalog, the clock method, Zygalski's sheets and the bomba kept the Bureau ahead until the extra rotors of December 1938; at Pyry in July 1939 the Poles gave their methods to Britain and France.
- Różycki died in 1942, Rejewski and Zygalski worked on lesser ciphers in Britain, and the Polish part of the story was told only from 1967. The women of the Polish side are largely missing from the sources, and this chapter says so.
- Operators' habits (AAA, ABC, QWE, stereotyped texts) gave the attackers their start in every war; a machine cipher is a structure, and a structure leaks.

**Next:** [Chapter 13](13-Bletchley-Park.md), where the Poles' method meets Turing's bombe, Welchman's diagonal board and thousands of people in a country house.

## Further reading

- Marian Rejewski, "An Application of the Theory of Permutations in Breaking the Enigma Cipher", *Applicationes Mathematicae* 16, no. 4 (1980); and "How Polish Mathematicians Deciphered the Enigma", *Annals of the History of Computing* 3, no. 3 (1981), pp. 213 to 234. His own accounts.
- Władysław Kozaczuk, *Bitwa o tajemnice* (Książka i Wiedza, 1967) and *W kręgu Enigmy* (1979), in English as *Enigma: How the German Machine Cipher Was Broken, and How It Was Read by the Allies in World War Two*, ed. and trans. Christopher Kasparek (University Publications of America, 1984).
- Gustave Bertrand, *Enigma ou la plus grande énigme de la guerre 1939-1945* (Plon, 1973).
- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996), on the four inventors, Hebern and Enigma; and *Seizing the Enigma: The Race to Break the German U-Boat Codes, 1939-1943* (Houghton Mifflin, 1991).
- Dermot Turing, *X, Y & Z: The Real Story of How Enigma Was Broken* (The History Press, 2018), on the Polish, French and British stories together.
- Louis Kruh and Cipher Deavours, "The Commercial Enigma: Beginnings of Machine Cryptography", *Cryptologia* 26, no. 1 (2002), pp. 1 to 16; Cipher A. Deavours and Louis Kruh, *Machine Cryptography and Modern Cryptanalysis* (Artech House, 1985).
- F. H. Hinsley and others, *British Intelligence in the Second World War*, vol. 1 (HMSO, 1979); Gordon Welchman, *The Hut Six Story* (McGraw-Hill, 1982).
- James J. Gillogly, "Ciphertext-only cryptanalysis of Enigma", *Cryptologia* 19, no. 4 (1995), pp. 405 to 413.
- F. W. Winterbotham, *The Ultra Secret* (Weidenfeld and Nicolson, 1974).

*Weaker sources:* the Wikipedia articles on Hebern, Scherbius, Koch, van Hengel, Damm, Hagelin, Schmidt, Palluth and the Pyry meeting, for patent dates, the deaths of Schmidt and Palluth, and the Kabaty site; the Crypto Museum pages on the Enigma models and the reflector wirings; the GCHQ and Poznań Enigma Cipher Centre pages on Pyry; and news summaries of the volunteer naval Enigma project (2006 on).
