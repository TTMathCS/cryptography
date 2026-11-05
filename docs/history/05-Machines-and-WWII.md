# Machines and World War II

*From about 1915 to 1980: rotor machines that changed their alphabet with
every key press, the Polish mathematicians who first read Enigma, the
codebreaking factory at Bletchley Park, the first electronic computers,
China's black chamber, Japan's Purple machine, codebreakers in Delhi,
Native American code talkers, and the Soviet pads that were used twice.*

[Vernam's teleprinter](04-Telegraph-Age.md#vernam-and-the-one-time-pad)
showed that a machine could encrypt faster than any clerk. The next step
was a machine that made its own ever-changing key. Rotor machines did
that, and by the 1930s every major power used one. Germany's Enigma was
the most famous, and its defeat, first by Poland and then by Britain, is
the best-known codebreaking story there is. The war also produced
machines that were never broken, the first electronic computers, and a
reminder that even a perfect cipher fails when people cut corners.

| When | Who | What |
|---|---|---|
| 1917–1919 | Hebern, Scherbius, Koch, Damm | rotor machines invented in four countries |
| 1924 | Jan Kowalewski | a Polish officer teaches Japan's army and navy codebreaking |
| 1926–1930 | German navy, army and air force | adopt Enigma; plugboard added |
| 1932 | Marian Rejewski | reconstructs the wiring of the military Enigma |
| 1938 | Polish Cipher Bureau | the *bomba* and the perforated sheets |
| 1938–1940 | Herbert Yardley, Chongqing | breaks Japanese army codes for Chiang Kai-shek |
| July 1939 | Pyry, near Warsaw | the Poles share everything with Britain and France |
| 1940 | Turing, Welchman, Keen | the British bombe |
| Sept 1940 | US Army Signal Intelligence Service | breaks Japan's Purple machine |
| 1941–1942 | Tiltman, Tutte | work out the Lorenz teleprinter cipher unseen |
| 1942 | Station HYPO, Pearl Harbor | Japanese naval code read before Midway |
| 1942–1945 | Wireless Experimental Centre, Delhi | Japanese army codes |
| 1944 | Comanche code talkers | at Normandy with the US 4th Infantry Division |
| Feb 1944 | Tommy Flowers | Colossus, the first large electronic digital computer |
| 1943–1980 | Venona, Arlington Hall | reads Soviet messages sent with reused pads |
| 1974–2000 | British and US governments | the secrets are slowly released |

## Rotor machines

### A spinning alphabet

A *rotor* is a small wheel, a few centimetres across, with 26 electrical
contacts on each face. Inside, wires connect each contact on one side to a
different contact on the other in a scrambled pattern. Current entering at
"A" might come out at "K". On its own, a rotor is just a substitution
alphabet, the same kind al-Kindi broke.

The trick is to turn it. After each letter the rotor steps one place, so
the next letter goes through a different substitution. Stack three rotors
and let them step like a car's odometer (the right one every letter, the
middle one when the right completes a turn, and so on) and the machine
runs through roughly 17,000 different alphabets before repeating. It is
the [Renaissance](03-Renaissance.md) polyalphabetic cipher again, but with
a key thousands of letters long, applied by electricity at typing speed.

### Four inventors

The idea occurred to several people at almost the same time:

- **Edward Hebern**, in California, built a rotor machine around 1917 and
  sold machines to the US Navy in the 1920s. William Friedman showed that
  its design could be broken, and Hebern's company failed.
- **Arthur Scherbius**, a German electrical engineer, filed his patent on
  23 February 1918. His company sold the machine as *Enigma*.
- **Hugo Koch** in the Netherlands patented a rotor machine in 1919,
  based on work by two Dutch naval officers.
- **Arvid Damm** in Sweden filed a patent in 1919. His company was later
  taken over by Boris Hagelin, who built a business on pin-wheel machines
  and in 1952 founded Crypto AG in Switzerland, whose
  [later story](06-Shannon-to-DES.md#crypto-ag) is a scandal of its own.

## Enigma

### From business machine to Wehrmacht

The commercial Enigma, sold from 1923, was meant for banks and companies
and sold poorly. The German navy adopted a version in 1926 and the army in
1928. Two features defined the machine the Germans used:

- A **reflector** (*Umkehrwalze*) at the far end of the rotors, which
  sends the current back through them by a different path. Willi Korn
  patented it in 1926, and it was already in the commercial models of the
  mid-1920s. It made the machine *self-reciprocal*: the same settings
  encrypt and decrypt. It also meant that **no letter could ever encrypt
  to itself**, a small flaw that turned out to matter a great deal.
- A **plugboard** (*Steckerbrett*) at the front, the true military
  addition, introduced for the army in 1930. Cables swap pairs of letters
  before and after the rotors.

An operator typed a letter, current ran through the plugboard, the three
rotors, the reflector, back through the rotors and plugboard, and a lamp
lit under the cipher letter. A second operator wrote it down. The machine
printed nothing.

### The key

Each day's settings came from a printed key sheet:

- which three rotors, in which order (from 1938 the army chose three of
  five);
- each rotor's ring setting, which moved its wiring relative to its
  letters and turnover point;
- the plugboard pairs (ten pairs from 1939);
- a basic starting position for the rotors.

For each message, the operator also picked three letters as the starting
position for that message alone, the *message key*, and sent them
enciphered at the day's basic position. Until 1940 the army had operators
type the message key *twice*, to catch errors. That repetition was the
first crack.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 338" role="img" aria-labelledby="sk-c-enigma-t"><title id="sk-c-enigma-t">The current from one key goes through the plugboard and three rotors to a reflector, then back through the rotors and plugboard to light a different letter</title><defs><filter id="sk-c-enigma-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-enigma-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-enigma-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-enigma-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-enigma-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="338" filter="url(#sk-c-enigma-paper)"/><g filter="url(#sk-c-enigma-pen)"><text x="30" y="44" text-anchor="start" class="h">One key press, there and back</text><path class="p room" d="M30 90 L120 90 L120 240 L30 240Z"/><text x="75.0" y="171.0" text-anchor="middle" class="s">keyboard</text><path class="p room" d="M130 90 L220 90 L220 240 L130 240Z"/><text x="175.0" y="171.0" text-anchor="middle" class="s">plugboard</text><path class="p gold" d="M240 90 L310 90 L310 240 L240 240Z"/><text x="275.0" y="171.0" text-anchor="middle" class="s">rotor 3</text><path class="p gold" d="M320 90 L390 90 L390 240 L320 240Z"/><text x="355.0" y="171.0" text-anchor="middle" class="s">rotor 2</text><path class="p gold" d="M400 90 L470 90 L470 240 L400 240Z"/><text x="435.0" y="171.0" text-anchor="middle" class="s">rotor 1</text><path class="p room" d="M490 90 L580 90 L580 240 L490 240Z"/><text x="535.0" y="171.0" text-anchor="middle" class="s">reflector</text><path class="p" d="M80 110 L560 110" marker-end="url(#sk-c-enigma-ah)"/><text x="40" y="80" text-anchor="start" class="s">A pressed</text><path class="p red" d="M560 110 L570 110 L570 220 L560 220 M560 220 L80 220" marker-end="url(#sk-c-enigma-ah)"/><text x="70" y="260" text-anchor="start" class="s">lamp G lights</text><text x="30" y="300" text-anchor="start" class="s">The right-hand rotor steps before every letter, so the wiring is different each time. The</text><text x="30" y="320" text-anchor="start" class="s">reflector makes the machine its own inverse, and means no letter can ever come out as itself.</text></g></svg><figcaption>Sketched for this page. The letters are made up.</figcaption></figure>

### Trying it

This simulates the army's Enigma I with rotors I, II and III and reflector
B, using the real wiring. It leaves out the ring settings to keep it
short. The first line is the standard check every Enigma simulator is
tested against.

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

Typing AAAAA gives five different letters: the alphabet changes with every
key press. The weather report (*Wettervorhersage*) comes back when the
same settings are used again. The rotor windows show a quirk of the
mechanism: when the middle rotor reaches its own turnover point it steps
again on the next key press, so it moves twice in a row (AEW, then BFX).

The last number, about $1.6 \times 10^{20}$ daily keys, is why the Germans trusted
Enigma. Even a machine testing a million keys a second would need five
million years to try them all. But as on the
[Arab cryptanalysis](02-Arab-Cryptanalysis.md#why-a-huge-key-space-didnt-help)
page, nobody broke Enigma by trying every key. They broke it by finding
ways to ignore most of the key.

## Poland: the first break

### Mathematicians, not linguists

Poland, squeezed between Germany and the Soviet Union, had every reason to
read German signals. In 1929 the Polish Cipher Bureau (*Biuro Szyfrów*)
ran a secret cryptology course at the University of Poznań, in a region
that had been German until 1919, for mathematics students who knew
German. Three of them joined the Bureau in Warsaw in 1932: Marian Rejewski,
Jerzy Różycki and Henryk Zygalski.

### A spy's documents

Meanwhile a German, Hans-Thilo Schmidt, who worked in his army's cipher
office, was selling secrets to French intelligence. In 1931 and 1932 he
handed Captain Gustave Bertrand operating instructions for Enigma and the
daily keys for some months, including September and October 1932. French
codebreakers judged the machine unbreakable even with these. Bertrand
passed the material to the Poles, starting in December 1931, and in
December 1932 the Bureau's chief, Gwido Langer, gave Rejewski the keys
for September and October 1932.

### Rejewski's equations

Rejewski had already started without them. He looked at the first six
letters of each day's messages, the doubled message key. The first and
fourth letters were the same unknown letter enciphered at two positions
three steps apart, and likewise the second and fifth, and the third and
sixth. With enough messages from one day, these pairs fix three
permutations that Rejewski could write down, and he found that the
structure of their cycles did not depend on the plugboard at all. He then
wrote equations for the rotor wiring and used Schmidt's daily keys to
remove most of the unknowns. One more guess was needed: how the keyboard
was wired to the rotors. The commercial machine used the order of the
keys, QWERTZU. Rejewski tried the plain alphabet, ABCDEF..., and it was
right. By the end of December 1932 he had the wiring of all three rotors,
and in January 1933 the Bureau began reading Enigma messages.

Kahn and others have called it one of the great achievements of
cryptanalysis: a machine reconstructed from its ciphertext and a little
help, using group theory.

### Keeping up

Reading the wiring was the start; finding each day's key was the daily
work. The Poles built a *cyclometer* and used it to catalogue the cycle
patterns of every rotor position, so a day's pattern could be looked up.
Różycki devised a "clock" method for finding which rotor was on the right.
When the Germans changed their procedures in 1938, Zygalski designed
stacks of perforated sheets that could be laid over each other until light
shone through a single hole, and Rejewski designed the *bomba*, an
electromechanical device that combined six Enigma copies to search rotor
positions automatically. Six were built by November 1938.

On 15 December 1938 the army added two more rotors, so the three in the
machine came from a set of five. That multiplied the work tenfold, beyond
what the Bureau could afford.

### The Pyry meeting

On 25 and 26 July 1939 (some accounts say 26 and 27), five weeks before
Germany invaded Poland, the
Polish Bureau hosted British and French codebreakers at its secret centre
in the Kabaty forest at Pyry, outside Warsaw. The British were Alastair
Denniston, head of the Government Code and Cypher School; Dilly Knox, its
leading Enigma expert, who had been stuck on the very keyboard-wiring
question Rejewski had guessed; and Commander Humphrey Sandwith of the
Admiralty's interception service. The Poles explained everything and promised
each country a replica Enigma, with the designs of the sheets and the
bomba.

After the invasion the three mathematicians escaped through Romania to
France and kept working on Enigma there with the French until 1942.
Różycki died that year when his ship sank in the Mediterranean. Rejewski
and Zygalski reached Britain in 1943 but were never brought into Bletchley
Park; they worked on lesser ciphers for the Polish army. Rejewski's part
became widely known only after Bertrand's book appeared in 1973.

## Bletchley Park

### A country house full of codebreakers

The Government Code and Cypher School, formed in 1919 from Room 40 and
the army's codebreakers, moved in August 1939 to Bletchley Park, a
Victorian house in Buckinghamshire with good railway links. It began with
a few hundred people. By early 1945 nearly nine thousand worked there,
about three quarters of them women, many of them in the Women's Royal
Naval Service operating the machines.

Recruits came from everywhere: mathematicians such as Alan Turing and
Gordon Welchman, chess champions such as Hugh Alexander and Stuart
Milner-Barry, linguists, classicists, and in 1942 people who had done well
in a crossword competition in the *Daily Telegraph*. Work was organized
in wooden huts by subject: Hut 6 broke army and air force Enigma, Hut 8
naval Enigma, and Huts 3 and 4 turned the decrypts into intelligence.

### The bombe

The Polish bomba relied on the doubled message key, and the Germans
dropped that habit in May 1940. Turing designed a more general machine in
late 1939. It used a *crib*: a guess at a stretch of plaintext, such as
WETTER ("weather") at the start of a weather report or KEINE BESONDEREN
EREIGNISSE ("nothing special to report"). Because Enigma never encrypts a
letter to itself, the crib can be slid along the ciphertext and every
position where any letter matches its partner is ruled out.

For a crib in a possible position, the letters form a network of links:
plain E became cipher Q at step 3, Q became T at step 7, and so on. The
bombe tested every rotor order and starting position against that network.
For each one it assumed a plugboard partner for one letter and followed
the consequences electrically; if they contradicted each other, the
setting was wrong and the bombe moved on, far faster than any team of
people could.
When it stopped, the operators tested the setting by hand. Welchman added
the *diagonal board*, which used the fact that plugboard swaps work both
ways, and made the bombe far more powerful.

The British Tabulating Machine Company at Letchworth, under the engineer
Harold "Doc" Keen, built the machines. The first, named *Victory*, was
installed in March 1940; the second, *Agnus*, with Welchman's diagonal
board, in August 1940. By the end of the war about 210 British bombes were
running, and the US Navy had built more than a hundred of its own at the
National Cash Register company in Dayton, Ohio.

Cribs were the fuel, and the codebreakers went to great lengths to get
them. The RAF sometimes laid mines in particular places, a practice called
"gardening", so that German warnings would name a known location. German
operators helped too: they chose message keys like ABC or their
girlfriends' initials ("cillies"), sent the same weather reports every
morning, and re-sent messages in different keys.

### The naval Enigma

The German navy was more careful. Its operators chose rotors from a set of
eight and enciphered message keys with separate tables. Turing, in Hut 8,
developed a statistical method called *Banburismus* (after the town where
its long paper sheets were printed) to cut down the bombe work. But much
of the progress came from captures, called "pinches". In May 1941 the
Royal Navy seized key tables and documents from the weather ship
*München* and from the submarine *U-110* before it sank.

On 1 February 1942 the U-boats switched to a four-rotor machine, and
Bletchley lost their traffic for ten months, at the height of the Battle
of the Atlantic. On 30 October 1942 a boarding party from HMS *Petard*
took the current weather short-signal book from the sinking *U-559*. Two
of the sailors, Lieutenant Anthony Fasson and Able Seaman Colin Grazier,
drowned when the boat went down. The book gave Bletchley the cribs it
needed, and the four-rotor key was broken again in December 1942.

### Ultra

The intelligence from these decrypts was called *Ultra*, and its users
were few and closely watched. To hide its source, the Allies often staged
cover stories, such as sending a reconnaissance plane to "spot" a convoy
whose route was already known from a decrypt.

Ultra helped route Atlantic convoys around U-boat packs, sink Axis supply
ships to North Africa, and confirm before D-Day that the Germans had
believed the deception about where the landings would fall. Harry
Hinsley, a Bletchley veteran and later the official historian of British
intelligence in the war, judged that it shortened the war in Europe by
at least two years. That is a judgment about what would have happened
otherwise, and historians still argue about the number, but nobody
doubts that the effect was large.

### Why Enigma lost

Enigma was not a bad machine. Used perfectly, with no cribs and no
repeated message keys, it would have been far harder to break. It lost to
a combination of a design flaw (no letter encrypts to itself), habits
(doubled keys, predictable messages, lazy key choices), captured
documents, and the scale of the effort against it. That is the usual
pattern: a cipher is broken through its weakest use, not its strongest
theory.

<figure class="sketch"><span class="ai-tag">AI-created</span><svg viewBox="0 0 640 328" role="img" aria-labelledby="sk-c-crib-t"><title id="sk-c-crib-t">A line of cipher letters with the guessed word WETTERBERICHT slid under it at two places; where a letter would match itself the position is ruled out</title><defs><filter id="sk-c-crib-pen"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter><filter id="sk-c-crib-paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 .10 0"/></filter><pattern id="sk-c-crib-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#8a4a2a" stroke-width="1.1" opacity=".55"/></pattern><pattern id="sk-c-crib-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r="1" fill="#8a4a2a" opacity=".5"/><circle cx="6.5" cy="7" r=".8" fill="#8a4a2a" opacity=".4"/></pattern><marker id="sk-c-crib-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="#3a2a1e" stroke-width="1.6" stroke-linecap="round"/></marker></defs><rect width="640" height="328" filter="url(#sk-c-crib-paper)"/><g filter="url(#sk-c-crib-pen)"><text x="30" y="44" text-anchor="start" class="h">No letter can be itself: sliding a guess</text><path class="p room" d="M30 80 L51 80 L51 110 L30 110Z"/><text x="40.5" y="102.0" text-anchor="middle" class="s">Q</text><path class="p room" d="M51 80 L72 80 L72 110 L51 110Z"/><text x="61.5" y="102.0" text-anchor="middle" class="s">F</text><path class="p room" d="M72 80 L93 80 L93 110 L72 110Z"/><text x="82.5" y="102.0" text-anchor="middle" class="s">Z</text><path class="p room" d="M93 80 L114 80 L114 110 L93 110Z"/><text x="103.5" y="102.0" text-anchor="middle" class="s">W</text><path class="p room" d="M114 80 L135 80 L135 110 L114 110Z"/><text x="124.5" y="102.0" text-anchor="middle" class="s">R</text><path class="p room" d="M135 80 L156 80 L156 110 L135 110Z"/><text x="145.5" y="102.0" text-anchor="middle" class="s">W</text><path class="p room" d="M156 80 L177 80 L177 110 L156 110Z"/><text x="166.5" y="102.0" text-anchor="middle" class="s">I</text><path class="p room" d="M177 80 L198 80 L198 110 L177 110Z"/><text x="187.5" y="102.0" text-anchor="middle" class="s">V</text><path class="p room" d="M198 80 L219 80 L219 110 L198 110Z"/><text x="208.5" y="102.0" text-anchor="middle" class="s">T</text><path class="p room" d="M219 80 L240 80 L240 110 L219 110Z"/><text x="229.5" y="102.0" text-anchor="middle" class="s">Y</text><path class="p room" d="M240 80 L261 80 L261 110 L240 110Z"/><text x="250.5" y="102.0" text-anchor="middle" class="s">R</text><path class="p room" d="M261 80 L282 80 L282 110 L261 110Z"/><text x="271.5" y="102.0" text-anchor="middle" class="s">E</text><path class="p room" d="M282 80 L303 80 L303 110 L282 110Z"/><text x="292.5" y="102.0" text-anchor="middle" class="s">S</text><path class="p room" d="M303 80 L324 80 L324 110 L303 110Z"/><text x="313.5" y="102.0" text-anchor="middle" class="s">X</text><path class="p room" d="M324 80 L345 80 L345 110 L324 110Z"/><text x="334.5" y="102.0" text-anchor="middle" class="s">B</text><path class="p room" d="M345 80 L366 80 L366 110 L345 110Z"/><text x="355.5" y="102.0" text-anchor="middle" class="s">F</text><path class="p room" d="M366 80 L387 80 L387 110 L366 110Z"/><text x="376.5" y="102.0" text-anchor="middle" class="s">O</text><path class="p room" d="M387 80 L408 80 L408 110 L387 110Z"/><text x="397.5" y="102.0" text-anchor="middle" class="s">G</text><path class="p room" d="M408 80 L429 80 L429 110 L408 110Z"/><text x="418.5" y="102.0" text-anchor="middle" class="s">K</text><path class="p room" d="M429 80 L450 80 L450 110 L429 110Z"/><text x="439.5" y="102.0" text-anchor="middle" class="s">U</text><path class="p room" d="M450 80 L471 80 L471 110 L450 110Z"/><text x="460.5" y="102.0" text-anchor="middle" class="s">H</text><path class="p room" d="M471 80 L492 80 L492 110 L471 110Z"/><text x="481.5" y="102.0" text-anchor="middle" class="s">Q</text><path class="p room" d="M492 80 L513 80 L513 110 L492 110Z"/><text x="502.5" y="102.0" text-anchor="middle" class="s">B</text><path class="p room" d="M513 80 L534 80 L534 110 L513 110Z"/><text x="523.5" y="102.0" text-anchor="middle" class="s">A</text><path class="p room" d="M534 80 L555 80 L555 110 L534 110Z"/><text x="544.5" y="102.0" text-anchor="middle" class="s">I</text><path class="p room" d="M555 80 L576 80 L576 110 L555 110Z"/><text x="565.5" y="102.0" text-anchor="middle" class="s">S</text><path class="p room" d="M576 80 L597 80 L597 110 L576 110Z"/><text x="586.5" y="102.0" text-anchor="middle" class="s">E</text><path class="p gold" d="M72 130 L93 130 L93 160 L72 160Z"/><text x="82.5" y="152.0" text-anchor="middle" class="s">W</text><path class="p gold" d="M93 130 L114 130 L114 160 L93 160Z"/><text x="103.5" y="152.0" text-anchor="middle" class="s">E</text><path class="p gold" d="M114 130 L135 130 L135 160 L114 160Z"/><text x="124.5" y="152.0" text-anchor="middle" class="s">T</text><path class="p gold" d="M135 130 L156 130 L156 160 L135 160Z"/><text x="145.5" y="152.0" text-anchor="middle" class="s">T</text><path class="p gold" d="M156 130 L177 130 L177 160 L156 160Z"/><text x="166.5" y="152.0" text-anchor="middle" class="s">E</text><path class="p gold" d="M177 130 L198 130 L198 160 L177 160Z"/><text x="187.5" y="152.0" text-anchor="middle" class="s">R</text><path class="p gold" d="M198 130 L219 130 L219 160 L198 160Z"/><text x="208.5" y="152.0" text-anchor="middle" class="s">B</text><path class="p gold" d="M219 130 L240 130 L240 160 L219 160Z"/><text x="229.5" y="152.0" text-anchor="middle" class="s">E</text><path class="p rust red" d="M240 130 L261 130 L261 160 L240 160Z"/><text x="250.5" y="152.0" text-anchor="middle" class="s">R</text><path class="p gold" d="M261 130 L282 130 L282 160 L261 160Z"/><text x="271.5" y="152.0" text-anchor="middle" class="s">I</text><path class="p gold" d="M282 130 L303 130 L303 160 L282 160Z"/><text x="292.5" y="152.0" text-anchor="middle" class="s">C</text><path class="p gold" d="M303 130 L324 130 L324 160 L303 160Z"/><text x="313.5" y="152.0" text-anchor="middle" class="s">H</text><path class="p gold" d="M324 130 L345 130 L345 160 L324 160Z"/><text x="334.5" y="152.0" text-anchor="middle" class="s">T</text><text x="355" y="151" text-anchor="start" class="s">clash: impossible here</text><path class="p gold" d="M30 200 L51 200 L51 230 L30 230Z"/><text x="40.5" y="222.0" text-anchor="middle" class="s">W</text><path class="p gold" d="M51 200 L72 200 L72 230 L51 230Z"/><text x="61.5" y="222.0" text-anchor="middle" class="s">E</text><path class="p gold" d="M72 200 L93 200 L93 230 L72 230Z"/><text x="82.5" y="222.0" text-anchor="middle" class="s">T</text><path class="p gold" d="M93 200 L114 200 L114 230 L93 230Z"/><text x="103.5" y="222.0" text-anchor="middle" class="s">T</text><path class="p gold" d="M114 200 L135 200 L135 230 L114 230Z"/><text x="124.5" y="222.0" text-anchor="middle" class="s">E</text><path class="p gold" d="M135 200 L156 200 L156 230 L135 230Z"/><text x="145.5" y="222.0" text-anchor="middle" class="s">R</text><path class="p gold" d="M156 200 L177 200 L177 230 L156 230Z"/><text x="166.5" y="222.0" text-anchor="middle" class="s">B</text><path class="p gold" d="M177 200 L198 200 L198 230 L177 230Z"/><text x="187.5" y="222.0" text-anchor="middle" class="s">E</text><path class="p gold" d="M198 200 L219 200 L219 230 L198 230Z"/><text x="208.5" y="222.0" text-anchor="middle" class="s">R</text><path class="p gold" d="M219 200 L240 200 L240 230 L219 230Z"/><text x="229.5" y="222.0" text-anchor="middle" class="s">I</text><path class="p gold" d="M240 200 L261 200 L261 230 L240 230Z"/><text x="250.5" y="222.0" text-anchor="middle" class="s">C</text><path class="p gold" d="M261 200 L282 200 L282 230 L261 230Z"/><text x="271.5" y="222.0" text-anchor="middle" class="s">H</text><path class="p gold" d="M282 200 L303 200 L303 230 L282 230Z"/><text x="292.5" y="222.0" text-anchor="middle" class="s">T</text><text x="313" y="221" text-anchor="start" class="s">no clash: test this one</text><text x="30" y="290" text-anchor="start" class="s">WETTERBERICHT ("weather report") opened many messages. Wherever a guessed letter sits on the</text><text x="30" y="310" text-anchor="start" class="s">same cipher letter, that position is ruled out; the bombes tested the positions that were left.</text></g></svg><figcaption>Sketched for this page. The cipher letters are made up.</figcaption></figure>

## Lorenz and Colossus

### Tunny

The German high command used a different machine for its most important
links: the Lorenz SZ40 and SZ42, an attachment that encrypted teleprinter
traffic by radio between Berlin and the army group headquarters.
Bletchley called it *Tunny*. It worked like Vernam's teleprinter cipher,
combining each five-bit character with a key character, but it made its
key from twelve pinwheels: five that stepped regularly, five that stepped
irregularly under the control of two more. The wheels had 41, 31, 29, 26
and 23 pins, 43, 47, 51, 53 and 59 pins, and 61 and 37, for 501 in all.

### A mistake and a feat

On 30 August 1941 a German operator sent a message of about 4,000
characters from Athens to Vienna. The receiver asked for it again. The
operator re-sent it with the same key settings but, being tired, with
abbreviations and small changes. Two messages on the same key are a
*depth*, the same mistake as reusing a one-time pad. John Tiltman, a
senior Bletchley codebreaker, worked out both texts and with them about
4,000 characters of the key.

Bill Tutte, a 24-year-old chemistry graduate, then studied that key. By
writing it out in rows of different lengths he found a repeat every 41
characters, and over the next few months, with help from colleagues in
the Research Section, he deduced the whole logical structure of the
machine, all twelve wheels and how they moved, without
ever seeing one. It is often called one of the greatest intellectual
feats of the war.

### The first electronic computers

Knowing the machine was not the same as reading each day's messages. Max
Newman's section built a machine, *Heath Robinson*, to run Tutte's
statistical method by comparing two punched tapes, but keeping the tapes in
step was unreliable. Tommy Flowers, an engineer at the Post Office
research station at Dollis Hill in London, proposed doing the work with
vacuum tubes (valves) instead, holding the wheel patterns electronically.
Many thought so many valves could never run reliably. Flowers built it
anyway, in about ten months.

*Colossus* was delivered to Bletchley in January 1944 and was working by
February, with about 1,600 valves. It read the message tape by light at
5,000 characters a second and counted statistics for wheel settings. The
first improved Mark 2, with about 2,400 valves, came into service on 1 June
1944, five days before D-Day. By the end of the war ten were running. They
could be set up for different tasks with switches and plugs, which makes
them the first large programmable electronic digital computers, though
they did not store programs in memory like later computers.

After the war, most were dismantled and the rest kept secret, and two
continued in use at GCHQ until about 1960. Their existence became public in
the 1970s, and the codebreakers' own technical history, the *General
Report on Tunny*, was released in 2000. For decades, histories of
computing began with the American ENIAC of 1945 because Colossus could not
be mentioned. A working rebuild, led by Tony Sale and completed in 2007,
is at the National Museum of Computing at Bletchley Park.

## The machines that held

Not every machine was broken.

- **Typex**, the British machine adopted in 1937, was based on the
  commercial Enigma with extra rotors and other changes. There is no
  evidence the Germans ever read it.
- **SIGABA**, the American machine designed by William Friedman and Frank
  Rowlett and built with the US Navy, had fifteen rotors: five encrypted,
  and ten more decided, irregularly, which of those five stepped. That
  irregular stepping removed the odometer pattern that helped break
  Enigma. About ten thousand were built, kept under guard, and none is
  known to have been broken. It stayed in use into the 1950s.
- **The M-209**, a Hagelin pin-wheel machine the size of a lunch box,
  was the American tactical cipher; about 140,000 were made. The Germans
  could break it with enough traffic, but its messages only had to stay
  secret for a few hours.

The Navajo code talkers of the US Marine Corps, several hundred men by
1945, passed messages in the Pacific in their own language, with code
words for military terms. It was a *code* rather than a cipher, it was
fast, and the Japanese never broke it.

On the other side, Germany's naval codebreaking service, the *B-Dienst*,
read the Allied convoy cipher (Naval Cypher No. 3) for much of 1942 and
early 1943, and U-boats used it to find convoys until the cipher was
replaced in June 1943.

## China: a black chamber in Chongqing

China fought Japan from 1937, and its Nationalist government needed to
read Japanese army traffic. In 1938 Chiang Kai-shek hired Herbert Yardley,
the American who had run the [Black Chamber](04-Telegraph-Age.md#the-american-black-chamber)
in New York and then exposed it in a book. Yardley worked in Chongqing,
the wartime capital, until 1940, training Chinese staff and attacking
Japanese army codes. Chinese accounts say
the government then built up a much larger codebreaking bureau of its
own. Yardley's memoir of those years, *The Chinese Black Chamber*, was
published only in 1983, long after his death. The Chinese side of this
work is still poorly covered in English.

## Japan: Purple and the Pacific

### Purple

In 1939 Japan's foreign ministry adopted a new machine for its
diplomatic traffic, the *Type 97 Alphabetical Typewriter*, which the
Americans called *Purple*. Instead of rotors it used telephone stepping
switches, and it split the alphabet into a group of six letters and a
group of twenty, enciphered separately.

The US Army's Signal Intelligence Service, led by William Friedman,
attacked it for eighteen months. Its codebreakers, among them Frank
Rowlett and Genevieve Grotjan, worked out its behaviour from the
ciphertext alone. On 20 September 1940 Grotjan found the pattern that
unlocked it, and within days the team read its first complete message.
They then built working copies, called "Purple analogs", from parts
including stepping switches, without ever having seen a Japanese machine.
In early 1941 the US gave one to Britain.

The decrypts, code-named *Magic*, gave Washington Japan's diplomatic
thinking. They did not reveal the attack on Pearl Harbor: Purple carried
diplomatic traffic, and the navy's attack plans were never sent in it. The long Japanese note breaking off negotiations on 7
December 1941 was decrypted in Washington before the embassy could
deliver it, but it said nothing about where Japan would strike. Later,
Purple messages from the Japanese ambassador in Berlin, General Hiroshi
Ōshima, who toured German defences in France and reported them in detail,
helped the Allies plan D-Day.

### JN-25 and Midway

The Imperial Japanese Navy's main operational system, which the Americans
called JN-25, was a code, not a machine: a book of five-digit groups for
words and phrases, with random numbers from a second book added on top to
disguise them. US Navy codebreakers at Station HYPO in Pearl Harbor, led
by Commander Joseph Rochefort, together with teams in Washington,
Melbourne and elsewhere, recovered enough of it by spring 1942 to follow
Japan's plans.

In May 1942 they knew a major attack was coming on a target the
Japanese called "AF", and suspected it was Midway Island. To check, Midway
was told, by undersea cable, to send a fake radio message saying its
water plant had broken down. Soon a Japanese message reported that AF was short
of water. Admiral Nimitz placed his three carriers in position, and at
the Battle of Midway on 4–7 June 1942 the US Navy sank four Japanese
carriers. It was the turning point of the Pacific war.

In April 1943 the same codebreakers read the travel plans of Admiral
Isoroku Yamamoto, who had planned the Pearl Harbor attack, and American
fighters shot down his plane over Bougainville on 18 April.

### Japan's own codebreakers

Japan's services started late. After failing to read Soviet diplomatic
messages during its intervention in Siberia (1918–1922), the Japanese
army asked Poland for help, and a Polish officer, Captain Jan
Kowalewski, arrived in Yokohama on 7 September 1924 to teach a
three-month course to army and navy officers. In the war, Japan's foreign
ministry had its own cryptanalytic section; American interrogations of
its former members after the surrender say it worked on the diplomatic
systems of the United States, Britain, China and France. How much it and
the army and navy sections actually read is much less well documented in
English than the Allied side of the story.

### Delhi: the Wireless Experimental Centre

Much of the work on Japanese army codes was done in India. When Japan
overran Malaya and Singapore in early 1942, British codebreakers there
moved to the Wireless Experimental Centre at Anand Parbat, outside Delhi,
one of Bletchley Park's two overseas outposts. It grew to about a
thousand people from the Intelligence Corps, the RAF, the Indian Army and
West African units, with outstations at Abbottabad, Bangalore and
Barrackpore. In 1943 the mountaineer Wilfrid Noyce, working there,
spotted the patterns that helped break a Japanese army code. Delhi
carried on the work that Bletchley Park's air section had begun on
Japanese army and diplomatic codes.

## More code talkers

The Navajo were the largest group, but not the only one. Speakers of
more than a dozen Native American languages served as code talkers in
the two world wars, following the
[Choctaw of 1918](04-Telegraph-Age.md#the-choctaw-telephone-squads-1918).

- **Comanche.** Seventeen Comanche men were recruited into the US Army's
  4th Signal Company. Fourteen took part in the Normandy invasion, and
  thirteen landed on Utah Beach on 6 June 1944. They made up their own
  words for things their language had no name for: a tank was a
  "turtle", and Hitler "the crazy white man".
- **Meskwaki.** Twenty-seven Meskwaki men from Iowa enlisted together in
  January 1941, about a sixth of the tribe's population. Eight of them
  were trained to pass messages in their language and served with the
  army in North Africa; the eight were awarded the Congressional Gold
  Medal in 2013.

These systems worked because the languages were unwritten or little
studied outside their communities, not because of any mathematics. That
is also why they couldn't be used everywhere: there were only so many
speakers.

## Venona

### Pads used twice

The Soviet Union protected its spy messages with a code book and
[one-time pads](04-Telegraph-Age.md#why-it-cant-be-broken), which should
have been unbreakable. But in early 1942, with Germany deep inside the
country, the office that produced the pads was under heavy pressure, and it
printed some tens of thousands of pages twice. The duplicate pages went
to different users, so the same key was used for two unrelated messages
in different places, sometimes years apart.

On 1 February 1943 the US Army's Signal Intelligence Service at Arlington
Hall, Virginia, started a small project on Soviet diplomatic messages
copied from the cable companies. Its first member was Gene Grabeel, a
former home-economics teacher. The project, later called *Venona*, found
the duplicated pages by spotting messages with matching key, then
stripped the key out as in the example on the telegraph page and attacked
the underlying code. From 1946 the linguist Meredith Gardner recovered
large parts of the code book and began reading KGB messages.

### What it showed

Venona exposed Soviet espionage inside the Manhattan Project, including
Klaus Fuchs and Theodore Hall, the network around Julius Rosenberg, and
Donald Maclean of the British Foreign Office, one of the Cambridge spies.
The decrypts name some 350 Americans with a covert link to Soviet
intelligence. Some identifications remain disputed, most famously whether
the agent called ALES was Alger Hiss.

The work went on until 1980. In the end fewer than 3,000 messages were
read, in whole or in part, out of hundreds of thousands. The Soviets knew
about it early, through Kim Philby and an Arlington Hall employee, William
Weisband, but could not recall messages already sent. The decrypts were
made public from 1995.

Venona is the clearest lesson in the whole history: a mathematically
perfect cipher, broken because of how its keys were made and handled.

## Can these be broken today?

Most of them, yes, and the machines that took rooms of bombes now take a
laptop. The secret was never the machine: once it is known, the key is
all that's left, and these keys are small by modern standards.

| System | Broken today? | The attack in plain words |
|---|---|---|
| Enigma | yes, by computer | With a crib, a modern version of Turing's bombe search runs in minutes. Without one, a program climbs: try rotor settings, then improve the plugboard a swap at a time while the text looks more like German. In 2006 the Enigma@home project used volunteers' computers to read naval messages that had stayed unbroken since 1942. |
| Lorenz (Tunny) | yes, by computer | Colossus counted how often bits agreed, to find the wheel settings one group at a time. In 2007, at a rebuilt Colossus's challenge, Joachim Schüth read a Lorenz message on a laptop in 46 seconds. |
| Purple | yes | It was solved by hand from the ciphertext alone in 1940. The stepping switches follow a pattern; find it and the machine can be rebuilt on paper. |
| M-209 | yes, by computer | Short pin-wheels repeat. Published programs (Lasry, Kopal and Wacker, 2016) recover the key from ciphertext alone. |
| Typex and SIGABA | not easily | Neither was broken in its day. SIGABA's irregular stepping removed the patterns that sank Enigma. Later academic studies describe attacks that need known plaintext and a great deal of computing. |
| Codebooks with additives (JN-25, Naval Cypher No. 3) | yes, with enough traffic | Messages that used the same stretch of the additive book line up; subtract them and the additive drops out, then rebuild the code meanings one group at a time from context. |
| Comanche and Meskwaki code talkers | not by codebreaking | Like the Navajo: a spoken language with code words added. Only a speaker could follow it. |
| Navajo code talkers | not by codebreaking | A language and code words, not a cipher. Only a fluent speaker who learned the code words could read it. |
| Venona one-time pads, printed twice | yes | Matching pages cancel out when subtracted, as on the [telegraph page](04-Telegraph-Age.md#why-it-cant-be-broken). |

Here is the first step of the bombe in a few lines. This made-up
weather message was encrypted with the simulator above (rotors II, I,
III, start QEV, ten plugs). The codebreaker guesses it contains
WETTERVORHERSAGE somewhere, and uses the rule that Enigma never turns a
letter into itself to rule out every place where the guess and the
ciphertext share a letter:

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

The right place, 16, is one of the 19 left. The bombe then took each
place in turn and tested rotor orders and starts against the letter
links the crib makes there.

## What the war left behind

- **Codebreaking as industry.** Bletchley Park, Arlington Hall and their
  partners employed tens of thousands of people and built machines by the
  hundred. The postwar agencies, NSA and GCHQ, grew straight out of them.
- **The electronic computer**, born partly as a codebreaking machine.
- **Machines that held**, like SIGABA, showing that careful design and
  careful use together could defeat even an enemy as skilled as
  Bletchley.
- **The weakest link is the operator.** Doubled keys, cribs and reused
  pads did more to break ciphers than mathematics alone.
- **Decades of silence.** Enigma's breaking was first described by the
  Polish historian Władysław Kozaczuk in 1967 and by Bertrand in 1973;
  Ultra reached English readers with F. W. Winterbotham's *The Ultra
  Secret* in 1974, and much of the detail stayed secret until the 2000s, so the history of computing and of the war was written for years
  without it.

## See also

- [The telegraph age](04-Telegraph-Age.md): Vernam, the one-time pad and
  the dangers of reusing it
- [From Shannon to DES](06-Shannon-to-DES.md): the theory and the
  agencies that came after the war
- [AES](../04-symmetric-ciphers/AES.md): a modern cipher built so that
  knowing some plaintext, Bletchley's favourite tool, doesn't help

## References

- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996), on rotor machines, Purple, Midway and Enigma / Kahn, *Seizing the Enigma: The Race to Break the German U-Boat Codes, 1939–1943* (Houghton Mifflin, 1991)
- Marian Rejewski, "How Polish Mathematicians Deciphered the Enigma", *Annals of the History of Computing* 3, no. 3 (1981), pp. 213–234 / Rejewski, "An Application of the Theory of Permutations in Breaking the Enigma Cipher", *Applicationes Mathematicae* 16, no. 4 (1980)
- Gustave Bertrand, *Enigma ou la plus grande énigme de la guerre 1939–1945* (Plon, 1973)
- F. H. Hinsley and others, *British Intelligence in the Second World War* (HMSO, 1979–1990) / Hinsley and Alan Stripp (eds.), *Codebreakers: The Inside Story of Bletchley Park* (Oxford University Press, 1993)
- Gordon Welchman, *The Hut Six Story* (McGraw-Hill, 1982) / Alan Turing, *Treatise on the Enigma* ("Prof's Book", c. 1940; declassified, US National Archives)
- *General Report on Tunny, with Emphasis on Statistical Methods* (GC&CS, 1945; released to the UK National Archives, HW 25/4 and 25/5, in 2000) / B. Jack Copeland (ed.), *Colossus: The Secrets of Bletchley Park's Codebreaking Computers* (Oxford University Press, 2006) / W. T. Tutte, "Fish and I" (lecture, University of Waterloo, 1998)
- Stephen Budiansky, *Battle of Wits: The Complete Story of Codebreaking in World War II* (Free Press, 2000)
- NSA Center for Cryptologic History, *The Friedman Legacy* (1992) and Frank B. Rowlett, *The Story of Magic* (Aegean Park Press, 1998) / Edwin T. Layton with Roger Pineau and John Costello, *"And I Was There": Pearl Harbor and Midway—Breaking the Secrets* (Morrow, 1985)
- Robert L. Benson, *The Venona Story* (NSA Center for Cryptologic History, 2001; reprinted 2019) / John Earl Haynes and Harvey Klehr, *Venona: Decoding Soviet Espionage in America* (Yale University Press, 1999)
- F. W. Winterbotham, *The Ultra Secret* (Weidenfeld & Nicolson, 1974)
- George Lasry, Nils Kopal and Arno Wacker, "Ciphertext-only cryptanalysis of Hagelin M-209 pins and lugs", *Cryptologia* 40, no. 2 (2016)
- Herbert O. Yardley, *The Chinese Black Chamber: An Adventure in Espionage* (Houghton Mifflin, 1983) / *Encyclopaedia Britannica*, "Herbert Osborne Yardley"
- US Army, "Charles Chibitty: Comanche code-talker" (army.mil) / William C. Meadows, *The Comanche Code Talkers of World War II* (University of Texas Press, 2002)

*Weaker sources:* the Wikipedia article "Japanese cryptology from the 1500s to Meiji" (flagged by its editors) for Kowalewski's 1924 course; a declassified December 1945 US Army report on interrogations of Japanese Foreign Office cryptanalysts (archive.org, TICOM collection), as a search summary; the *South China Morning Post*'s article on Chinese codebreakers in Chongqing; the Wikipedia articles on the Wireless Experimental Centre and on Japanese army and diplomatic codes (Noyce, staff numbers, outstations); news and museum summaries on the Meskwaki code talkers (27 enlisted, 8 trained, the 2013 medals), whose numbers differ between sources; search summaries of the National Museum of Computing and bombe.org.uk pages (the March and August 1940 bombe dates, 211 British bombes), of Colossus histories (delivery in January, working on 5 February 1944, valve counts of 1,500–1,600 and 2,400–2,500), of the GCHQ page on the Pyry meeting, and of Wikipedia's Venona article (about 2,200–3,000 messages; the 349 names, as counted by Haynes and Klehr); the US Navy bombe count, which secondary sources give variously; news reports of the M4 Message Breaking Project (Stefan Krah, 2006) and of Joachim Schüth's 46-second laptop break at the 2007 Cipher Event; for Typex and SIGABA, the general shape of later academic attacks (Mark Stamp and colleagues), not checked in detail.
