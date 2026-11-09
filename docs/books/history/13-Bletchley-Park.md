# 13. Bletchley Park, Lorenz and Colossus

*In August 1939 a few hundred people moved into a Victorian country house fifty miles from London, and by 1945 about ten thousand were working there and at its outstations, most of them women, reading the radio traffic of the German army, air force and navy. This chapter tells how that was done, who did it, and what it cost to keep it secret: the huts, the bombe, the stolen codebooks of the U-boats, Ultra, the two reasons Enigma lost, the teleprinter cipher the British called Tunny and the man who rebuilt its machine on paper, and the room full of valves, Colossus, that was run by Wrens. You will drag a crib along a ciphertext, build a menu from it, score a Banburismus comparison in decibans, tear two messages apart that were sent on the same key, and watch a period of 41 appear in a stream that looks random.*

!!! abstract "In this chapter"
    **You will learn:**

    - how the Government Code and Cypher School came to a country house, how it was staffed and run, and what the hut system and the Foreign Office cover were for;
    - who the people were, men and women, and why the usual figure of "three quarters women" needs careful reading;
    - how Dilly Knox's team, Alan Turing, Gordon Welchman and Harold "Doc" Keen turned a guessed word into a machine search, the bombe, and what the Wrens at Eastcote and Stanmore did with it;
    - what Banburismus was, how naval Enigma was broken, what the "pinches" of U-110 and U-559 really were, and what the films get wrong;
    - what Ultra was, how its secret was kept, how it came out in 1974, and why Enigma lost;
    - how John Tiltman and Bill Tutte broke the Lorenz cipher without ever seeing the machine, how the Testery and the Newmanry worked, and how Tommy Flowers built Colossus;
    - what was destroyed, what stayed secret, what Colossus does and does not tell us about the first computers, and which machines held.

    **You need:** [Chapter 12](12-Rotors-and-Enigma.md) (how Enigma works and how the Poles broke it, which this chapter does not retell), [Chapter 11](11-Radio-War-and-the-One-Time-Pad.md) (Room 40 and the Friedmans, the roots of Bletchley's methods) and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) (rotor machines). The methods are taught in full in [Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md); here you meet them as the people who found them did, with one small example of each.

    **Levels:** §13.1 to §13.3 are for beginners, §13.4 to §13.13 are intermediate, §13.14 is expert.

## 13.1 The problem: a war that is sent by radio

*Level: beginner.*

By 1939 every large army in Europe depended on radio, and radio can be heard by anyone with a receiver. The Germans knew this and sent almost everything enciphered, on a machine that the army, navy and air force had adopted in the late 1920s and early 1930s and that their own experts thought could not be read. The story of that machine, the commercial Enigma that became a military one, and of the Polish mathematicians who solved it in 1932, is told in [chapter 12](12-Rotors-and-Enigma.md). When Poland fell, the Poles had already handed their knowledge to the British and French at Pyry, in July 1939. This chapter starts with what the British did with it.

It is easy to read that as a story about a clever idea. It was mostly a story about volume and time. A German army signals unit sent perhaps a few dozen messages a day; the whole of the German armed forces sent many thousands. Each message was a few hundred letters of five-letter groups, taken down by an operator listening to Morse in a draughty hut, and each was enciphered under a key that changed every day (in the case of the navy and parts of the air force, more often). A broken key was worth a day. The next midnight the settings changed and the work began again. A message that took three days to read told a general where an enemy division had been, not where it was going. So the problem was never only mathematical. It was how to find, every day, the key of every important network, quickly enough that the result could still change what a ship or a squadron did, and without the enemy ever learning that anyone could.

Britain had been in this business since the First World War. [Chapter 11](11-Radio-War-and-the-One-Time-Pad.md) told how the Admiralty's Room 40 read the German navy's codes and the Zimmermann telegram. When the war ended the Admiralty's and the army's codebreakers were merged into one small peacetime body, the Government Code and Cypher School (GC&CS), in 1919. It was led by Alastair Denniston, a Scottish naval officer who had been in Room 40, and from 1922 it was under the Foreign Office. It had a few dozen staff, and it made a bargain with the future: it would keep a core of linguists and puzzle-solvers on the payroll, and in an emergency hire many more. Denniston's emergency list, drawn up in the late 1930s, was a set of names of dons, schoolmasters and chess players, built by asking people he knew who else would be good at the work. That is how the Park got its first recruits, and also how it came to have a particular social look.

The Munich crisis of September 1938 showed the Foreign Office that its code staff could not stay in London, where they would be bombed, and the head of the Secret Intelligence Service, Admiral Sir Hugh Sinclair, looked for a place. He found Bletchley Park, an estate of about 58 acres with a large red-brick-and-stone Victorian mansion, on the edge of a small town in Buckinghamshire whose main importance was its railway junction. Trains from London to the north passed through it, and the Oxford to Cambridge line crossed it, which put both universities within an hour or two. The estate had been put up for sale to a builder who meant to knock down the house and build on the land. By the usual account, Sinclair bought it in 1938 for about £6,000 and paid part of the price out of his own pocket. I give that as the usual account because the sums come from memoirs and later histories, not from a receipt I have seen. The house was a poor building and the grounds were pleasant: a lake, a few lawns, a maze, a stable yard, and room for huts.

In the Munich scare the staff went there for a trial run under a cover story. By the story the codebreakers were a shooting party, the guests of a "Captain Ridley", and the name was used again for the real move on 15 August 1939 and the days after, two and a half weeks before the war began. The cover is repeated in nearly every book on the Park and I have not seen the document that records it; it is the kind of detail that is easy to improve in the telling, and I would hold it loosely. The mail address was not a shooting lodge but "Room 47, Foreign Office", a room that did exist in Whitehall. The point of all this was simple. A large group of civilians arriving in a small town was something the neighbors would notice, so they were given a reason to be there, and a name that said nothing.

<figure class="mars-fig">
<svg viewBox="0 0 640 432" width="640" role="img" aria-label="Timeline of Bletchley Park from 1938 to 2013" fill="currentColor" font-size="14">
<line x1="100" y1="8" x2="100" y2="424" stroke="currentColor" stroke-width="1.6"/>
<text x="86" y="27" text-anchor="end" font-weight="bold">1938</text><circle cx="100" cy="22" r="3.5"/><text x="116" y="27">Admiral Sinclair buys Bletchley Park; Munich crisis trial move</text>
<text x="86" y="53" text-anchor="end" font-weight="bold">Aug 1939</text><circle cx="100" cy="48" r="3.5"/><text x="116" y="53">GC&CS moves to the Park</text>
<text x="86" y="79" text-anchor="end" font-weight="bold">Jan 1940</text><circle cx="100" cy="74" r="3.5"/><text x="116" y="79">first wartime Enigma break (Zygalski sheets)</text>
<text x="86" y="105" text-anchor="end" font-weight="bold">Mar 1940</text><circle cx="100" cy="100" r="3.5"/><text x="116" y="105">first bombe, Victory, installed</text>
<text x="86" y="131" text-anchor="end" font-weight="bold">May 1941</text><circle cx="100" cy="126" r="3.5"/><text x="116" y="131">U-110 pinch; Mavis Lever's Matapan break (Mar)</text>
<text x="86" y="157" text-anchor="end" font-weight="bold">Aug 1941</text><circle cx="100" cy="152" r="3.5"/><text x="116" y="157">Tunny depth, Athens to Vienna</text>
<text x="86" y="183" text-anchor="end" font-weight="bold">Jan 1942</text><circle cx="100" cy="178" r="3.5"/><text x="116" y="183">Tutte's structure of the Lorenz machine</text>
<text x="86" y="209" text-anchor="end" font-weight="bold">Feb 1942</text><circle cx="100" cy="204" r="3.5"/><text x="116" y="209">U-boats go to four rotors: ten months dark</text>
<text x="86" y="235" text-anchor="end" font-weight="bold">Dec 1942</text><circle cx="100" cy="230" r="3.5"/><text x="116" y="235">Shark (four-rotor) key broken again</text>
<text x="86" y="261" text-anchor="end" font-weight="bold">Jun 1943</text><circle cx="100" cy="256" r="3.5"/><text x="116" y="261">Heath Robinson working in the Newmanry</text>
<text x="86" y="287" text-anchor="end" font-weight="bold">Feb 1944</text><circle cx="100" cy="282" r="3.5"/><text x="116" y="287">Colossus Mark 1 at work</text>
<text x="86" y="313" text-anchor="end" font-weight="bold">1 Jun 1944</text><circle cx="100" cy="308" r="3.5"/><text x="116" y="313">first Colossus Mark 2, five days before D-Day</text>
<text x="86" y="339" text-anchor="end" font-weight="bold">1946</text><circle cx="100" cy="334" r="3.5"/><text x="116" y="339">GC&CS becomes GCHQ; Colossi broken up</text>
<text x="86" y="365" text-anchor="end" font-weight="bold">1974</text><circle cx="100" cy="360" r="3.5"/><text x="116" y="365">Winterbotham, The Ultra Secret</text>
<text x="86" y="391" text-anchor="end" font-weight="bold">2000</text><circle cx="100" cy="386" r="3.5"/><text x="116" y="391">General Report on Tunny released</text>
<text x="86" y="417" text-anchor="end" font-weight="bold">2013</text><circle cx="100" cy="412" r="3.5"/><text x="116" y="417">royal pardon for Alan Turing</text>
</svg>
<figcaption>Figure 13.1. Bletchley Park in dates. The first half is Enigma; from 1941 a second, harder cipher, Lorenz, runs beside it. The last three rows are about secrecy.</figcaption></figure>

Figure 13.1 shows the range of the story. Notice how the dates fall into three runs. The first, to the end of 1941, is Enigma, the Poles' gift put to work and the first bombes. The second, from 1941 to 1944, is a harder cipher, Lorenz, and the people and machines made to read it. The last is secrecy: the 1946 break-up of the machines, the book that began to let the secret out in 1974, the release of the technical report on Tunny in 2000, and the pardon of 2013.

!!! note "Life story: the Government Code and Cypher School"
    **Born:** 1919, London, from the Admiralty's Room 40 and the army's MI1(b); moved to Bletchley Park in August 1939 · **Purpose:** to read the diplomatic and then the military ciphers of other states, and to advise on Britain's own · **Helped:** read German Enigma and Lorenz traffic, Italian and Japanese codes, and worked with the Americans, Poles and French; by January 1945 it had about 10,000 people at the Park and its outstations · **Status:** renamed the Government Communications Headquarters (GCHQ) in 1946; its descendant still works from Cheltenham, England

## 13.2 A country house and a hut for everything

*Level: beginner.*

Alastair Denniston ran GC&CS until February 1942. He was born in 1881, played hockey for Scotland, had worked on German naval codes in Room 40, and spent the interwar years keeping a tiny office alive. The accounts of his character are mixed. His staff admired his loyalty and thought him a poor fighter in Whitehall committees. In 1942 he was replaced as head by his deputy, Commander Edward Travis, and sent to London to run the diplomatic side. The usual explanation is that the codebreakers had gone over his head to Churchill (the letter below), that the Foreign Office wanted a firmer administrator, and that the change was made without any scandal. I have seen no document that makes Denniston's removal a punishment for that letter, and the film *The Imitation Game* (2014) is wrong to show him as an enemy of Alan Turing's work: the surviving record shows him backing it.

!!! note "Life story: Alastair Denniston"
    **Born:** 1 December 1881, Greenock, Scotland; died 1961 · **Purpose:** to keep a codebreaking body alive after 1919 and build it up in 1938 and 1939 · **Helped:** drew up the emergency list of recruits; led the delegation to the Pyry meeting in July 1939; hired the mathematicians as well as the linguists · **Status:** head of GC&CS until February 1942, then head of its diplomatic section in London; retired in 1945

Edward Travis, a Royal Navy officer who had been Denniston's deputy since the late 1930s, directed the Park and then GCHQ until 1952. He is little known and is usually described, even by those who disliked the change, as someone who understood the work and trusted the specialists.

The Park's structure explains much about its secrecy. The first thing a visitor would have seen was the mansion, which housed the director, the main offices and, in a wing, the committee rooms. The work was done in single-story wooden **huts** put up on the lawns from 1939 and, from 1942, in brick **blocks**. The huts were known by number. Hut 6 broke the German army and air force Enigma keys. Hut 8 broke the naval Enigma. Hut 3 took the decoded army and air force messages and turned them into intelligence, and Hut 4 did the same for the navy. The numbers were chosen so that a person who said "I work in Hut 6" gave nothing away. Nobody, from the cleaner to the director, was told more than the job required. A Hut 6 clerk did not know what Hut 8 was doing, and a bombe operator might not know what the machine she attended was for.

Messages arrived by a chain that Figure 13.2 shows.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="From radio operator to commander: intercept stations, the registration and decoding rooms, the bombe or hand break, translation and evaluation in Hut 3 or Hut 4, and the Special Liaison Unit with the commander" fill="currentColor" font-size="14">
<rect x="10" y="20" width="140" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="80.0" y="42" text-anchor="middle" font-weight="bold">Y stations</text><text x="80.0" y="60" text-anchor="middle" font-size="12">radio operators</text><text x="80.0" y="78" text-anchor="middle" font-size="12">copy the Morse</text>
<rect x="180" y="20" width="140" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250.0" y="42" text-anchor="middle" font-weight="bold">Registration</text><text x="250.0" y="60" text-anchor="middle" font-size="12">traffic sorted by</text><text x="250.0" y="78" text-anchor="middle" font-size="12">call sign and net</text>
<rect x="350" y="20" width="140" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="420.0" y="42" text-anchor="middle" font-weight="bold">Break the key</text><text x="420.0" y="60" text-anchor="middle" font-size="12">Hut 6, Hut 8:</text><text x="420.0" y="78" text-anchor="middle" font-size="12">cribs, bombes</text>
<rect x="500" y="20" width="130" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="565.0" y="42" text-anchor="middle" font-weight="bold">Decode</text><text x="565.0" y="60" text-anchor="middle" font-size="12">Typex set to</text><text x="565.0" y="78" text-anchor="middle" font-size="12">the day's key</text>
<line x1="150" y1="52" x2="174.0" y2="52.0" stroke="currentColor" stroke-width="1.5"/><polygon points="180.0,52.0 172.6,55.1 172.6,48.9"/><line x1="320" y1="52" x2="344.0" y2="52.0" stroke="currentColor" stroke-width="1.5"/><polygon points="350.0,52.0 342.6,55.1 342.6,48.9"/><line x1="490" y1="52" x2="494.0" y2="52.0" stroke="currentColor" stroke-width="1.5"/><polygon points="500.0,52.0 492.6,55.1 492.6,48.9"/>
<rect x="180" y="150" width="140" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250.0" y="172" text-anchor="middle" font-weight="bold">Hut 3 and Hut 4</text><text x="250.0" y="190" text-anchor="middle" font-size="12">translate, judge,</text><text x="250.0" y="208" text-anchor="middle" font-size="12">add background</text>
<rect x="350" y="150" width="140" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="420.0" y="172" text-anchor="middle" font-weight="bold">Special Liaison</text><text x="420.0" y="190" text-anchor="middle" font-size="12">Unit at the</text><text x="420.0" y="208" text-anchor="middle" font-size="12">commander's HQ</text>
<rect x="500" y="150" width="130" height="64" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="565.0" y="172" text-anchor="middle" font-weight="bold">The commander</text><text x="565.0" y="190" text-anchor="middle" font-size="12">reads, burns,</text><text x="565.0" y="208" text-anchor="middle" font-size="12">acts under cover</text>
<line x1="565" y1="84" x2="335.77650586482673" y2="148.3776621826444" stroke="currentColor" stroke-width="1.5"/><polygon points="330.0,150.0 336.3,145.0 337.9,151.0"/><line x1="320" y1="182" x2="344.0" y2="182.0" stroke="currentColor" stroke-width="1.5"/><polygon points="350.0,182.0 342.6,185.1 342.6,178.9"/><line x1="490" y1="182" x2="494.0" y2="182.0" stroke="currentColor" stroke-width="1.5"/><polygon points="500.0,182.0 492.6,185.1 492.6,178.9"/>
<text x="320" y="252" text-anchor="middle" font-size="13">One interception, many hands: before the message reached a general it had passed through</text>
<text x="320" y="270" text-anchor="middle" font-size="13">operators, registrars, codebreakers, decoders, translators and signallers, most of them women.</text>
<text x="320" y="300" text-anchor="middle" font-size="12" opacity="0.8">The cover rule: never act on an Ultra message unless an ordinary source could explain it.</text>
</svg>
<figcaption>Figure 13.2. The path of one Enigma message at Bletchley Park, simplified. Each box was a separate hut or room, and a person in one did not need to know what the next one did.</figcaption></figure>

At the start were the **Y stations**, listening posts run by the three services and the Foreign Office, where radio operators, many of them women of the ATS, the WAAF and the WRNS, took down German Morse, one letter group after another, at speeds that left no room for a misheard letter. Their work came to the Park by teleprinter or by motorcycle dispatch rider. In the Registration Room the traffic was sorted by call sign and network, and the sorting itself was a kind of analysis, because the way a station called another gave away its place in the German order of battle. If the day's key had been broken, a message went to the Decoding Room, where operators typed it into a **Typex** (the British cipher machine described in §13.13), fitted with Enigma rotors and set to that day's key. If not, the message waited for the codebreakers.

The output of that room was German text, often garbled and abbreviated, and the next stage was the one the Park was built for. In Hut 3 and Hut 4 the translators, who were mostly linguists, put the text into English; the watch officers added what was known from earlier messages, and an analyst judged how much to trust it. The result went out as a numbered report to the few people entitled to see it, in the earliest period with a cover name, "Boniface", which hinted at a secret agent with a network, and later under the name that stuck, **Ultra**.

Nobody was told how Bletchley had come by what it knew. The reports went by a separate channel, the Special Liaison Units, small teams of Air Force and army signalers attached to the headquarters of commanders in the field, with their own cipher machines. An SLU officer handed his commander a message and took it back, and the paper was burned. The rule, repeated in every account, was that nobody should act on an Ultra message unless some ordinary source, a reconnaissance flight or a spy's report, could be offered as the reason. That rule is why convoys were sometimes steered on a hunch, why a plane would be sent to "find" a ship already known to be at sea, and why many of the best results of the war looked like luck.

Recruitment was a story in itself. The earliest staff were mostly men from Oxford and Cambridge, picked by Denniston's list: mathematicians, classicists, chess masters such as Hugh Alexander and Stuart Milner-Barry, and, after 1940, a stream of undergraduate women, recruited by dons and by friends and often by a single interview. In 1942 the *Daily Telegraph* ran a crossword competition and some of those who did it fast were approached by the War Office; the story is usually told as though that were how the Park found its brains, but the numbers involved were small. From late 1941 a woman aged 20 to 30 could be conscripted, and the three women's services brought in the thousands who came to Bletchley. There was no way to tell the staff what they were joining. The recruiting interview said only that the work was secret and important, and the new arrival signed the Official Secrets Act.

The worry that the work would stop for lack of people produced the best-known letter of the Park's history. On 21 October 1941 four of its leading men, Alan Turing, Gordon Welchman, Hugh Alexander and Stuart Milner-Barry, wrote to Winston Churchill directly. They said that the work was held up by shortages of staff and equipment, listed what they needed (clerks, typists, a few more men, more machines), and said that their requests had gone unanswered. Milner-Barry took it by train to London and handed it in at Downing Street. Churchill's reply, dated 22 October, was a memorandum to his chief of staff, General Ismay, marked "Action this day": "Make sure they have all they want on extreme priority and report to me that this has been done." The shortages were fixed within weeks. The letter shows two things: the codebreakers' impatience with the administration, and a Prime Minister who read intelligence closely and understood the value of the source. Churchill had visited the Park in September 1941 and addressed the staff; the remark, often attributed to him in the following years, that the codebreakers were "the geese that laid the golden eggs and never cackled" was reported by people close to the head of the Secret Intelligence Service, and I have not seen it in a primary source.

!!! note "Life story: the hut system"
    **Born:** autumn 1939, the lawns of Bletchley Park, from the first wooden huts · **Purpose:** to give every section a number instead of a name, so that the building said nothing about the work, and to keep the people in one hut from knowing about the next · **Helped:** Hut 6 (army and air force Enigma), Hut 8 (naval Enigma), Hut 3 and Hut 4 (turning decrypts into intelligence), the later blocks (Tunny and Colossus) · **Status:** most huts were demolished or altered after the war; the Park was nearly lost to housing in 1991 and opened as a museum, run by the Bletchley Park Trust (founded 1992), in 1994

## 13.3 Three quarters of the staff

*Level: beginner.*

Look at a photograph of the Park's staff in 1944 and most of the faces are women's. The figure given in the Bletchley Park Trust's own material and repeated in nearly every popular history is that about three quarters of the people who worked there were women. The headcount often given for the peak, January 1945, is about 10,000 at the Park and its outstations. Some counts for the Park alone give nearer 9,000, and the Trust's Roll of Honour, the list of people known to have served, runs past 10,000 names and is not complete, because the wartime records of the lower grades were thin and many people left no trace. So the safe statement is this: at the peak the staff numbered somewhere from 9,000 to 10,000, and roughly three quarters, which is some 7,000 or more, were women. I have not found a count by sex from a primary document, and I would not quote a smaller number as if it were exact.

What that figure does and does not say matters. It counts everyone: the clerks, typists and filing staff, the teleprinter operators, the machine minders, the telephonists, the canteen and the drivers, as well as the linguists and the cryptanalysts. Women filled most of the machine and clerical jobs that kept the intelligence moving. They made up the large majority of the bombe operators, the card-index staff, the typists who prepared reports, and the Y-service operators who first heard the messages. Among the people who actually solved the ciphers the share of women was much lower, though I have found no count I trust, and the senior posts were held mostly by men. The Civil Service paid women less than men for the same grade (equal pay in the Civil Service was agreed only in the 1950s), so the war's women were often at the bottom of the scale whatever they did. The Wrens, WAAF and ATS who came to the Park were paid service rates, which were also lower for women.

The three-quarters figure tells us something real, though. The Park depended on a workforce that was young, clever, mostly female, and trained on the job. The best accounts, among them Michael Smith's histories of the Park and the oral histories collected by the Trust and by Tessa Dunlop in *The Bletchley Girls* (2015), describe women in their late teens and early twenties, often with a good school behind them and a university degree or half of one, who were asked to learn German, to run a punched-card machine, to keep a complicated index, or to sit beside a bombe for an eight-hour night shift. The first wave, in 1939 and 1940, was drawn in large part by personal connection, and some of them were later nicknamed "the debs"; after 1941 the women's services brought in a far wider range of people. Jane Fawcett, born Jane Hughes, was one of the first: she was interviewed in 1940 by Stuart Milner-Barry at the age of 18 or 19 and put to work on Hut 6's decoding desks. By her own account, given in interviews and repeated in her obituaries in 2016, she decoded the message in May 1941 that said the *Bismarck* was heading for a French port, a message the Admiralty had been unwilling to believe. I give that as her account: it is told in many places, and the log of that watch would be needed to say more.

Ann Mitchell, born Ann Williamson, joined from Oxford in 1943 and worked in Hut 6 on army and air force Enigma until May 1945. Like thousands of others she said nothing for decades. She told her husband about her work in the early 1970s and said she felt able to talk freely only after the film *Enigma* in 2001. That one sentence is worth pausing on, because it is the common pattern. A woman who had spent two years reading German signals, and had been told that her work was vital, went home in 1945 and told her family she had been a secretary at the Foreign Office. Joan Clarke, Mavis Batey and the Wrens of the Colossus room, whom you will meet below, did the same. The silence is part of why the women who did the work were left out of the first histories, which were written by the men who had been allowed, or who allowed themselves, to speak.

!!! note "Life story: the women of Bletchley Park"
    **Born:** 1939 to 1945, in every hut and outstation · **Purpose:** to staff the intercept, decoding, machine-minding, indexing, translating and (in smaller numbers) codebreaking work of the Park · **Helped:** about three quarters of roughly 10,000 staff at the peak were women, by the Trust's figures; they ran the bombes and the Colossus room, and a few were among the cryptanalysts · **Status:** barred from speaking by the Official Secrets Act until the 1970s or later; the first official badge for veterans was issued by the British government in 2009

## 13.4 Dilly Knox and his young women

*Level: intermediate.*

The first codebreakers at the Park were not the mathematicians. They were a small group of linguists and scholars, and the man at the center was Alfred Dillwyn "Dilly" Knox. Knox was born in 1884, the son of a bishop and the brother of the writer Ronald Knox. He was a fellow of King's College, Cambridge, a classical scholar who made his name editing a papyrus of the Greek poet Herodas, and a codebreaker of the first rank in Room 40 in the First World War. In 1937, during the Spanish Civil War, he broke the version of the commercial Enigma used by Franco's side. That was the commercial machine, without the German army's plugboard, and not a problem that the other services had managed. His method was not statistical. It was the habit of a classicist who guesses a word in a text and tests what follows, and he worked with a team of just two or three people in a stable-yard cottage by the Park's main gate.

In 1939 and 1940 his small section was joined by a handful of young women. They were taken on as "junior assistants" at a few pounds a week, and in the Park's slang they became "Dilly's girls". The best known are Mavis Lever, who married a fellow codebreaker, Keith Batey, in 1942 and is therefore usually called Mavis Batey; Margaret Rock, who was born in 1903 and was already in her thirties; and Jean Perrin. They worked in the Cottage on the systems that the main hut system left alone: the commercial-type Enigma machines of the Italian navy, the Spanish and the Abwehr, the German intelligence service.

Mavis Lever was nineteen. She had been reading German at University College London when she left her course in 1940 to join, and she described later how little she was told: she was taken on without any explanation of what the job was. In March 1941 she made a break that helped the Royal Navy win at Cape Matapan. The Italian navy used a version of Enigma without a plugboard, and Knox's section was working on it. I will not repeat the anecdotes about exactly how Mavis got in, because the retellings differ and I have not seen the cryptanalytic record that settles them. What is not in doubt is that decrypts from this traffic told Admiral Cunningham, the British commander in the Mediterranean, that the Italian fleet was coming out to attack the convoys to Greece. On the night of 28 to 29 March 1941 his ships sank three Italian heavy cruisers, the *Zara*, the *Fiume* and the *Pola*, and two destroyers, with the loss of over 2,000 Italian sailors. Cunningham came to Bletchley afterward to thank the people responsible, and Mavis remembered being thanked by him in the Cottage.

The second success was the Abwehr. The German intelligence service used its own Enigma variant, the Enigma G, which had no plugboard but had irregular stepping of the rotors, which made it a different problem again. Knox took the problem over from Hut 6 and worked on it with Mavis Lever and Margaret Rock. In December 1941 Mavis broke a message sent from Belgrade, and the section could work out the machine's wiring. (Sources differ over which link it was, and some give the date as 8 December.) Within days Knox was reading the Abwehr's traffic, and the decrypts were passed to the people who ran counterintelligence, the ISOS series, named for Oliver Strachey, who ran the section that handled them. The Abwehr's messages told MI5 whether the Germans believed what their agents in Britain reported. It was the sort of information that made the Double Cross system possible: a group of German agents in Britain, all of them under British control, who fed false stories back to Berlin. In the spring of 1944, as the invasion approached, Abwehr traffic between its stations showed that the German headquarters believed the Allied landing would fall in the Pas de Calais, and that it believed in a non-existent army group in southeast England. A senior intelligence officer, Brigadier Bill Williams, is reported to have said the Double Cross could not have been mounted without these decrypts. I give that as his reported opinion.

Dilly Knox fell ill with cancer in 1943 and died on 27 February that year, aged 58. His method, which he called "rodding", used strips of paper carrying the alphabets of the rotors, and it was close to the work of a papyrologist who lines up fragments until a word appears. It is the opposite of Turing's statistical machine search, and it was the right method for the small machines of the Italians and Spanish and Abwehr, where there was little traffic and a good guess had to do the work of a hundred messages. The two methods ran side by side at the Park, and the interplay between them is part of what made the place work.

Margaret Rock died in 1983. Mavis Batey went on to make a second career in the conservation of historic gardens. In the 1970s she led the campaign to save Painshill Park in Surrey, an 18th-century landscape garden, from being broken up for development, and she became a leading figure in the Garden History Society. She was awarded the MBE for her work in conservation, and she died in November 2013. She kept her wartime work to herself for most of that time.

!!! note "Life story: Dilly Knox"
    **Born:** 23 July 1884; died 27 February 1943 · **Purpose:** to break the Enigma variants that the main hut system could not, by hand, from a stable cottage · **Helped:** broke the Spanish Civil War Enigma (1937); trained Peter Twinn and his young women; his section broke the Italian naval Enigma (1941) and the Abwehr Enigma (December 1941) · **Status:** died of cancer in 1943; his method, rodding, was not used again, but his team's work fed Matapan and the Double Cross system

!!! note "Life story: Mavis Batey (née Lever)"
    **Born:** 5 May 1921; died 12 November 2013 · **Purpose:** joined GC&CS in 1940 at nineteen from a degree course in German; worked in Knox's Cottage · **Helped:** broke the Italian naval Enigma in March 1941, which gave Admiral Cunningham the Italian fleet's plan before Matapan; broke the first Abwehr Enigma message in December 1941 · **Status:** after the war a historian of gardens and campaigner for their conservation, with an MBE; wrote *Dilly: The Man Who Broke Enigmas* (2009)

## 13.5 The crib, the menu and the bombe

*Level: intermediate.*

Alan Turing was twenty-seven in 1939 and already famous among mathematicians. Born in London in 1912, a fellow of King's College, Cambridge since 1935, he had published "On Computable Numbers" in 1936, the paper that defined what a computing machine is and proved that some questions can never be settled by one, and had spent 1936 to 1938 at Princeton. He had also, since 1938, been going part-time to GC&CS for training. On 4 September 1939, the day after war was declared, he reported to Bletchley Park for good. He first learned the work in Dilly Knox's Cottage, then set up on his own, because the problem looked to him like a different kind.

What he faced was the loss of the Poles' method. The Polish *bomba* and the perforated Zygalski sheets worked because German operators, until 1 May 1940, typed each message key twice (see [chapter 12](12-Rotors-and-Enigma.md)). When the doubling stopped the method stopped with it. Turing's answer was to stop looking for a weakness in the German procedure and look instead for one in the German **text**. If you can guess a stretch of what a message says, you know part of what the machine turned into ciphertext. Weather reports began with the word WETTER. Units sent "nothing special to report" (KEINE BESONDEREN EREIGNISSE) when there was nothing to report. Messages ended with the same greeting. A guess like this is a **crib**. It does not give you the key, but it gives you a rule that the key must obey, and a machine can test a rule far faster than a person.

The first problem is where the crib goes. An Enigma never turns a letter into itself: the reflector forbids it (the reason is in chapter 12). So if the crib is slid along the ciphertext, every position where a crib letter lies directly above the same ciphertext letter is impossible. This is **crib dragging**, done at first with pencil and paper. Here it is on a 63-letter message enciphered on an army Enigma (rotors II, I, III, start position QEV, ten plugboard pairs), with the crib WETTERVORHERSAGE ("weather forecast"). After ruling places out, the program also writes down the crib at its true place, position 16, as a **menu**: each plain letter is joined to the ciphertext letter under it, with the crib position as the label.

```python
secret = "TMZLIZMVFAIWQEEGAGJPZEGGUTZHEQUTKMHBTFJHGENXFUSDDIIOWFGTNZHPEQN"
crib = "WETTERVORHERSAGE"                 # "weather forecast": a good guess

places = range(len(secret) - len(crib) + 1)
kept = [at for at in places               # Enigma never turns a letter into itself,
        if all(p != c for p, c in zip(crib, secret[at:]))]   # so any match rules a place out
print("ruled out", len(places) - len(kept), "of", len(places))
print("left for the bombe:", kept)

# The menu: at the true place (16) each crib letter is linked to the cipher letter above it.
at = 16
edges = [(p, c, i) for i, (p, c) in enumerate(zip(crib, secret[at:]))]
print(" ".join(f"{i}:{p}{c}" for p, c, i in edges))

# Group the letters into pieces; a piece with more links than letters has loops.
group = {}
def find(x):
    while group.setdefault(x, x) != x:
        x = group[x]
    return x
for p, c, i in edges:
    group[find(p)] = find(c)
pieces = {}
for letter in list(group):
    pieces.setdefault(find(letter), []).append(letter)
for letters in pieces.values():
    links = sum(1 for p, c, i in edges if p in letters)
    print("".join(sorted(letters)), "letters:", len(letters), "links:", links,
          "loops:", links - len(letters) + 1)
```

Output:

```
ruled out 29 of 48
left for the bombe: [0, 2, 5, 7, 14, 15, 16, 19, 21, 32, 35, 36, 38, 39, 41, 42, 43, 46, 47]
0:WA 1:EG 2:TJ 3:TP 4:EZ 5:RE 6:VG 7:OG 8:RU 9:HT 10:EZ 11:RH 12:SE 13:AQ 14:GU 15:ET
AQW letters: 3 links: 2 loops: 0
EGHJOPRSTUVZ letters: 12 links: 14 loops: 3
```

Dragging ruled out 29 of the 48 places, and the true place, 16, is one of the 19 that survive. A wrong place survives with probability $(25/26)^{16}$, about 0.53, so the drag narrows the search without ending it. The bombe takes each surviving place in turn. Figure 13.3 draws the menu for place 16. One piece is a chain of three letters. The other joins twelve letters by fourteen links, so it holds three closed **loops**.

<figure class="mars-fig">
<svg viewBox="0 0 640 350" width="640" role="img" aria-label="The menu of the crib WETTERVORHERSAGE: a small piece joining W, A and Q in a chain, and a large piece of twelve letters joined by fourteen links, so that it contains three loops" fill="currentColor" font-size="14">
<text x="90" y="24" text-anchor="middle" font-weight="bold">a chain, no loop</text>
<text x="400" y="24" text-anchor="middle" font-weight="bold">the main piece: 12 letters, 14 links, 3 loops</text>
<line x1="71.1" y1="132.9" x2="108.9" y2="177.1" stroke="currentColor" stroke-width="1.3"/>
<text x="83.2" y="164.9" text-anchor="middle" font-size="12" opacity="0.75">0</text>
<line x1="108.9" y1="202.9" x2="71.1" y2="247.1" stroke="currentColor" stroke-width="1.3"/>
<text x="83.2" y="223.1" text-anchor="middle" font-size="12" opacity="0.75">13</text>
<line x1="391.5" y1="69.7" x2="304.6" y2="220.3" stroke="currentColor" stroke-width="1.3"/>
<text x="340.2" y="144.5" text-anchor="middle" font-size="12" opacity="0.75">1</text>
<line x1="508.3" y1="131.4" x2="515.6" y2="158.6" stroke="currentColor" stroke-width="1.3"/>
<text x="503.3" y="151.3" text-anchor="middle" font-size="12" opacity="0.75">2</text>
<line x1="503.9" y1="132.0" x2="503.9" y2="218.0" stroke="currentColor" stroke-width="1.3"/>
<text x="494.9" y="179.0" text-anchor="middle" font-size="12" opacity="0.75">3</text>
<line x1="416.4" y1="59.4" x2="443.6" y2="66.7" stroke="currentColor" stroke-width="1.3"/>
<text x="427.7" y="75.7" text-anchor="middle" font-size="12" opacity="0.75">4</text>
<line x1="400.0" y1="278.0" x2="400.0" y2="72.0" stroke="currentColor" stroke-width="1.3"/>
<text x="409.0" y="179.0" text-anchor="middle" font-size="12" opacity="0.75">5</text>
<line x1="284.4" y1="191.4" x2="291.7" y2="218.6" stroke="currentColor" stroke-width="1.3"/>
<text x="279.3" y="211.3" text-anchor="middle" font-size="12" opacity="0.75">6</text>
<line x1="296.1" y1="132.0" x2="296.1" y2="218.0" stroke="currentColor" stroke-width="1.3"/>
<text x="287.1" y="179.0" text-anchor="middle" font-size="12" opacity="0.75">7</text>
<line x1="383.6" y1="290.6" x2="356.4" y2="283.3" stroke="currentColor" stroke-width="1.3"/>
<text x="372.3" y="282.3" text-anchor="middle" font-size="12" opacity="0.75">8</text>
<line x1="464.4" y1="262.5" x2="499.5" y2="131.4" stroke="currentColor" stroke-width="1.3"/>
<text x="490.7" y="203.3" text-anchor="middle" font-size="12" opacity="0.75">9</text>
<path d="M 416.4 59.4 Q 422.8 90.1 443.6 66.7" fill="none" stroke="currentColor" stroke-width="1.3"/>
<text x="424.8" y="86.4" text-anchor="middle" font-size="12" opacity="0.75">10</text>
<line x1="416.4" y1="290.6" x2="443.6" y2="283.3" stroke="currentColor" stroke-width="1.3"/>
<text x="432.3" y="299.7" text-anchor="middle" font-size="12" opacity="0.75">11</text>
<line x1="356.4" y1="66.7" x2="383.6" y2="59.4" stroke="currentColor" stroke-width="1.3"/>
<text x="372.3" y="75.7" text-anchor="middle" font-size="12" opacity="0.75">12</text>
<line x1="308.1" y1="247.0" x2="328.0" y2="266.9" stroke="currentColor" stroke-width="1.3"/>
<text x="311.7" y="267.3" text-anchor="middle" font-size="12" opacity="0.75">14</text>
<line x1="414.7" y1="63.5" x2="489.2" y2="106.5" stroke="currentColor" stroke-width="1.3"/>
<text x="447.5" y="96.8" text-anchor="middle" font-size="12" opacity="0.75">15</text>
<circle cx="400.0" cy="55.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="400.0" y="60.0" text-anchor="middle" font-weight="bold">E</text>
<circle cx="460.0" cy="71.1" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="460.0" y="76.1" text-anchor="middle" font-weight="bold">Z</text>
<circle cx="503.9" cy="115.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="503.9" y="120.0" text-anchor="middle" font-weight="bold">T</text>
<circle cx="520.0" cy="175.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="520.0" y="180.0" text-anchor="middle" font-weight="bold">J</text>
<circle cx="503.9" cy="235.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="503.9" y="240.0" text-anchor="middle" font-weight="bold">P</text>
<circle cx="460.0" cy="278.9" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="460.0" y="283.9" text-anchor="middle" font-weight="bold">H</text>
<circle cx="400.0" cy="295.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="400.0" y="300.0" text-anchor="middle" font-weight="bold">R</text>
<circle cx="340.0" cy="278.9" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340.0" y="283.9" text-anchor="middle" font-weight="bold">U</text>
<circle cx="296.1" cy="235.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="296.1" y="240.0" text-anchor="middle" font-weight="bold">G</text>
<circle cx="280.0" cy="175.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="280.0" y="180.0" text-anchor="middle" font-weight="bold">V</text>
<circle cx="296.1" cy="115.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="296.1" y="120.0" text-anchor="middle" font-weight="bold">O</text>
<circle cx="340.0" cy="71.1" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340.0" y="76.1" text-anchor="middle" font-weight="bold">S</text>
<circle cx="60.0" cy="120.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60.0" y="125.0" text-anchor="middle" font-weight="bold">W</text>
<circle cx="120.0" cy="190.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120.0" y="195.0" text-anchor="middle" font-weight="bold">A</text>
<circle cx="60.0" cy="260.0" r="15" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60.0" y="265.0" text-anchor="middle" font-weight="bold">Q</text>
<text x="320" y="338" text-anchor="middle" font-size="12">Each link is one crib position (numbered 0 to 15): plain letter above, cipher letter below. The links are the wires between scramblers.</text>
<figcaption>Figure 13.3. The menu made from the crib WETTERVORHERSAGE laid over the ciphertext of the Python example at position 16. Numbers are crib positions. The loops are what let a bombe throw out wrong settings quickly.</figcaption>
</figure>

What does a menu mean? At crib position $j$ the machine was in some rotor position, which is unknown but fixed by the rotor order and the starting position. Link number $j$ says: with the plugboard in front and behind, the letter $p$ went in and the letter $c$ came out. Take away the plugboard and the equation links the *plugboard partners* of $p$ and of $c$ through a scrambler (three rotors and the reflector) at position $j$. A bombe was a bank of such scramblers, wired together exactly as the menu is, each one stepped to its own position in the crib, so that the whole bank stood for the machine at 16 consecutive moments. Turing's trick was to make the machine hunt for a **contradiction**. Guess that one letter, say E, is plugged to some letter, say A. Current flows through the wired scramblers and implies that other letters are plugged to others, and so on around the menu. If the guess is wrong, sooner or later the implications contradict one another: a letter would have to be plugged to two letters, which a plugboard cannot do. A wrong rotor setting is thrown out when every guess contradicts. A right setting is the one where the current finds a consistent answer, and the bombe **stops**. The loops matter, because a loop brings the implications back to where they began and lets them clash; a menu with no loop gives the machine almost nothing to test, and one with three loops is a good job. The Cryptanalysis book works this out with a small bombe of your own in [chapter 3](../cryptanalysis/03-Machines-and-the-War.md).

The first design, drawn up in the autumn of 1939, had a weakness that Gordon Welchman fixed. Welchman, born in 1906, was a Cambridge mathematician, a fellow of Sidney Sussex, and the head of Hut 6. He saw that the plugboard is symmetric: if A is plugged to B then B is plugged to A. A bombe that did not use this threw information away. His **diagonal board**, a 26-by-26 plug field wired so that a guess about A and B was automatically a guess about B and A, cut the false stops by a large factor and made it possible to use menus with few loops. (Welchman himself worked on traffic analysis too: the habit of reading call signs and routes to find cribs, an art that grew into the whole discipline.) The first machine, delivered without the diagonal board in March 1940, was called *Victory*. The second, *Agnus Dei* ("Agnes"), with Welchman's board, followed in August 1940. These are the dates usually given; accounts differ by a few days.

The machine itself was built not at the Park but at Letchworth, by the British Tabulating Machine Company, the makers of punched-card equipment, and the engineer who made Turing's logic into steel and brass was the company's chief engineer, Harold "Doc" Keen. A British bombe stood about two meters high and wide and weighed about a ton. Inside, three banks of twelve columns held 36 Enigma equivalents made of 108 coded drums, and the drums turned at 120 revolutions a minute. At the back a plug field took the menu, wired by hand. At the front the operator read the stops. By the end of the war Britain had just over 200 bombes (the figures usually given are 210 or 211), at the Park and at outstations in Buckinghamshire and, from 1943, at Eastcote and Stanmore in northwest London. The Americans built their own, designed by Joseph Desch at the National Cash Register Company in Dayton, Ohio, and the US Navy's bombes, which numbered about 120, were run in Washington by the WAVES, the Navy's women's reserve.

The bombe hall was run by women. The Wrens, from 1941, took over the machines as operators, and by the middle of the war they were the great majority of the workforce at the bombe stations. Their job was a routine that left no room for error. A menu arrived from Hut 6 or Hut 8 by teleprinter. The operator and her assistant took the right drums from a rack, set each to its start letter, plugged the menu into the back of the bombe, and started it. Over some minutes the drums spun with a noise that survivors compare, in several accounts, to a room full of knitting needles, and the air smelled of hot oil. When the machine stopped, the operator wrote down the rotor positions, passed them to a checker, and restarted. The stop might be right or it might be false; a check on a Typex adapted to Enigma said which, in minutes. Shifts of eight hours ran day and night, and the Wrens were forbidden to tell anyone what the machines did. I do not have a figure I trust for the number of Wren bombe operators over the whole war; the Park's own material speaks of "thousands" of Wrens in all, which would include other duties.

**Try it.** Change the crib to KEINEBESONDERENEREIGNISSE ("nothing special to report", 25 letters, though this message does not contain it) and drag it along the same ciphertext with the first part of the program: it leaves 7 of 39 places. Then try WETT, four letters, which leaves 45 of 60. A short crib is easy to guess and tells you almost nothing; a long one tells you a great deal and is easy to get wrong. Choosing the crib was a skill, and the Park's crib clerks were good at it.

!!! note "Life story: Alan Turing"
    **Born:** 23 June 1912, London; died 7 June 1954, Wilmslow, Cheshire · **Purpose:** to find the daily settings of the German naval Enigma, then lead the section that did it · **Helped:** designed the logic of the bombe (1939), invented Banburismus (1940), headed Hut 8, visited the US in late 1942 and early 1943 to advise on US bombes and on speech secrecy, and worked on the Lorenz cipher ("Turingery") · **Status:** after the war designed the Automatic Computing Engine (1945) and worked at Manchester; convicted in 1952 of "gross indecency"; died of cyanide poisoning in 1954; pardoned by royal prerogative in 2013

!!! note "Life story: Gordon Welchman"
    **Born:** 15 June 1906, Fishponds, Bristol; died 8 October 1985, Newburyport, Massachusetts · **Purpose:** to run Hut 6 and turn Enigma breaking into an organized flow of work · **Helped:** the diagonal board (1939 to 1940), traffic analysis, the Hut 6 organization, and the letter of October 1941 to Churchill · **Status:** emigrated to the United States in 1948; his book *The Hut Six Story* (1982) revealed much of the Park's method and, reportedly, led to his losing his US security clearance

!!! note "Life story: the bombe"
    **Born:** designed late 1939 by Turing and Welchman; the first, *Victory*, installed at Bletchley in March 1940; built at Letchworth by the British Tabulating Machine Company under Harold "Doc" Keen · **Purpose:** to test every rotor order and position against a menu from a crib, and stop at the few that were consistent · **Helped:** just over 200 British bombes and about 120 US Navy ones, run chiefly by Wrens and WAVES, found the daily keys of Enigma networks for the whole war from 1940 · **Status:** retired in 1945 and broken up; one has been rebuilt at the Park by volunteers (working by 2007) as a museum piece

## 13.6 Naval Enigma: Banburismus, the pinches and the Atlantic

*Level: intermediate.*

The German navy's Enigma was the hardest of the lot. The navy chose its three rotors from a set of eight, where the army used five, so a day's rotor order could be any of 336 (eight things chosen three at a time, in order) instead of 60. It used a different method of sending the message key, a **bigram table** that turned each pair of letters of the key into another pair under a code book, and a code book, the Kenngruppenbuch, to disguise it. All of this meant that the machine's key could not be read from the way messages began. Almost everything depended on the codebooks. And the traffic was the most urgent of the war. The U-boats, working in "wolf packs" against the convoys that fed Britain, were the one German force that could cut the island off, and a convoy's course could be changed if the Admiralty knew where the packs were.

Turing took the naval problem in 1939, when most of his colleagues considered it hopeless. In the 1940 spring the section moved into Hut 8, and Turing led it until late 1942, when Hugh Alexander took over the day-to-day running. Turing saw two things. A bombe would be needed, but with 336 rotor orders to test, bombe time would be the scarcest resource in the Park, so some way to narrow the orders was essential. And no mathematical trick would get round the codebooks; they would have to be captured.

The first was **Banburismus**, a method that worked on the ciphertexts alone, without cribs, and gave the likely rotor order from statistics. It is named for the town of Banbury in Oxfordshire, where, by the usual account, the long sheets of paper it needed were printed. The idea is a use of the index of coincidence, which was old, but with a new twist: the *weight of evidence*. Two messages enciphered under the same rotor setting but with starting positions a few places apart will, if you slide one against the other by exactly the right offset, line up so that the same machine position is used on both. Where the machine position matches, a letter that is the same in the two ciphertexts is a letter that was the same in the plaintexts. German text repeats a letter in the same place about 7.6 percent of the time, while two unrelated random texts do it 1 time in 26, about 3.8 percent. So at the right offset you will see about twice as many repeats as at a wrong one. Each repeat is a small piece of evidence that the offset is right, and each non-repeat is a very small piece against it. Turing's idea was to add these pieces up in a unit he called the **ban**, after the town. A ban is a factor of ten in the odds; a **deciban** is a tenth of that, and Turing's colleague I. J. Good wrote that it is about the smallest change in the weight of evidence that a person can sense. Evidence counted in decibans can be added up as it comes, and stopped when it is enough. Here is the arithmetic with the values for German:

```python
from math import log10

# Chance that two letters drawn from German text match, versus two random letters.
german = 0.0762        # index of coincidence of German (Friedman's measure)
random_ = 1 / 26

# Evidence in decibans (tenths of a ban) that two texts really line up
per_repeat = 10 * log10(german / random_)
per_miss = 10 * log10((1 - german) / (1 - random_))
print(f"a repeated letter adds {per_repeat:+.2f} db, a miss adds {per_miss:+.2f} db")

for overlap, repeats in [(100, 4), (100, 8), (200, 8), (200, 15)]:
    score = repeats * per_repeat + (overlap - repeats) * per_miss
    odds = 10 ** (score / 10)
    print(f"{repeats:2d} repeats in {overlap} letters: {score:+5.1f} db, odds {odds:6.1f} to 1")
```

Output:

```
a repeated letter adds +2.97 db, a miss adds -0.17 db
 4 repeats in 100 letters:  -4.8 db, odds    0.3 to 1
 8 repeats in 100 letters:  +7.8 db, odds    6.0 to 1
 8 repeats in 200 letters:  -9.6 db, odds    0.1 to 1
15 repeats in 200 letters: +12.4 db, odds   17.3 to 1
```

The numbers are mine, from the index of coincidence of German, not Turing's. His tables were built from real naval traffic, whose heavy use of abbreviations changes the odds, and the real procedure also had to deal with the way the naval indicators and the middle rotor's turnover cut the overlap short. But the shape is right. A handful of repeats means nothing; the same handful in a shorter overlap means a lot; and Banburismus was the art of stacking up messages until the sums said which rotor order was most likely, so that the bombes could try the likeliest first. It was work for patient mathematicians, among them Turing, Good, Hugh Alexander, Rolf Noskwith, and a young woman from Cambridge who became one of its best, Joan Clarke.

!!! note "Life story: Joan Clarke"
    **Born:** 24 June 1917, London; died 4 September 1996 · **Purpose:** a Cambridge mathematics graduate (Newnham), recruited to Bletchley Park in June 1940 on the advice of her supervisor Gordon Welchman, and posted to Hut 8 · **Helped:** became one of the Banburismus experts; was paid as a "linguist", since the Civil Service had no grade to pay a woman as a cryptanalyst; by her post-war accounts and the Park's records rose to deputy head of a section of Hut 8 in 1944; engaged briefly to Turing in 1941 · **Status:** stayed in the service of GCHQ until 1977; made an MBE in 1947; married Lieutenant-Colonel John Murray in 1952

Turing's second point, that codebooks must be captured, produced the **pinches**. They are the best-known stories of the naval war, and I will tell the true ones. On 12 September 1940 a naval intelligence officer, Ian Fleming (later the author of the James Bond novels), put forward "Operation Ruthless", a plan to crash a captured German bomber into the Channel and capture the German vessel that came to rescue its crew, with Enigma papers on board. It was never carried out. What did happen came from real raids.

On 4 March 1941, in a British raid on the Lofoten Islands off Norway, the destroyer HMS *Somali* captured the German armed trawler *Krebs* and took rotors and key lists for the month of February. In May the Navy took the weather ship *München* (7 May) and, in June, the *Lauenburg*, and with them the keys for the next months. And on 9 May 1941 came the capture of *U-110*. The U-boat had attacked a convoy and been driven to the surface by depth charges from the destroyer HMS *Bulldog* and the corvette HMS *Aubrietia*; its captain, Fritz-Julius Lemp, who had sunk the liner *Athenia* on the first day of the war, died, and the crew abandoned ship. Bulldog's commander, Joe Baker-Cresswell, ordered a boarding party led by a young officer, Sub-Lieutenant David Balme, to go aboard. Balme and his men took the Enigma machine, the current keys, the bigram tables and the short-signal books. The boat sank under tow the next day, and the survivors, who were kept apart from everyone else, were never told that the Enigma had been taken. With its haul Hut 8 could read the U-boat traffic almost currently for much of the rest of 1941.

On 1 February 1942 the U-boats went dark. The navy introduced a fourth rotor, the *Triton* system (Bletchley called it *Shark*), and the settings Hut 8 had solved no longer applied. For ten months the British could not read the U-boats' signals, and these were the months of the worst losses of shipping of the war, in the Atlantic and off the American coast. (Bletchley's readers had a further blow from the other side: the German navy's own codebreakers, the B-Dienst, were reading the Admiralty's Naval Cypher No. 3 through most of 1942 and until June 1943, as §13.13 explains.) On 30 October 1942 the destroyer HMS *Petard* and other ships forced *U-559* to the surface in the Mediterranean. Lieutenant Tony Fasson and Able Seaman Colin Grazier swam to the sinking boat, with a canteen assistant of the NAAFI, Tommy Brown, whom the sources give as 15 or 16, and took out the weather short-signal book and other papers. The boat went down with Fasson and Grazier inside. Brown was pulled out. Fasson and Grazier were awarded the George Cross after their deaths; Brown, as a civilian, received the George Medal, and died in a house fire in 1945. The book gave Hut 8 the cribs it needed for the four-rotor machine, and it broke Shark again on 13 December 1942.

The Atlantic war turned in the spring of 1943. In March, two connected convoy battles cost about 20 ships; in May the Allies sank about 40 U-boats and the Germans withdrew the wolf packs. Bletchley's readings were one reason. The others were long-range aircraft, escort carriers, a new radar, and shipboard direction finding, and no honest account separates them with a number. The Admiralty's Operational Intelligence Centre, where Rodger Winn's Submarine Tracking Room kept a plot of every U-boat it knew of, turned the decrypts into convoy routes.

**In the real world.** The films have not been kind to the facts. *U-571* (2000) shows American sailors capturing an Enigma from a U-boat in 1942, which the real record does not allow: the machines were taken by the Royal Navy, and the first of the great pinches, *U-110*, happened in May 1941, seven months before the United States entered the war. British politicians protested. The only American capture of an Enigma-equipped U-boat was *U-505*, seized off West Africa on 4 June 1944 by a hunter-killer group built around the escort carrier *Guadalcanal*; the boat is now in a museum in Chicago. *Enigma* (2001) is a thriller with an invented plot. *The Imitation Game* (2014) is the best known and the least reliable on detail: it shows Turing building the machine alone and calling it "Christopher" (the first real bombe was *Victory*, designed by Turing and Welchman and built by Keen's company), makes Denniston Turing's enemy, shows Joan Clarke recruited by a crossword test (she was brought in by Welchman), puts the Soviet agent John Cairncross in Hut 8 when he worked in Hut 3, and invents a scene in which the team decides which attacks to allow to protect the secret. That decision belonged to the highest levels of command, not to a hut. The film also makes the Park one man's genius when the record is of thousands of hands.

## 13.7 Ultra: using a secret and keeping it

*Level: intermediate.*

A broken cipher is worth only as much as the use made of it, and the use has a price. If an enemy sees you act on what he thought was secret, he changes the cipher, and you lose it. The history of Ultra is partly a history of how Britain and the United States used the information without giving the secret away, and the answer was rules.

The first rule was to limit who knew. The British name for the product of the Enigma break was Ultra (the US took the name too, and used *Magic* for the Japanese diplomatic decrypts). It was held to be above Top Secret. Reports went to the Prime Minister, the service chiefs and the commanders in the field, and no further; a general received them through his Special Liaison Unit, read them, and gave them back to be burned. The man who built the system of those units for the Air Ministry was Group Captain Frederick W. Winterbotham, a First World War pilot and an officer of the Secret Intelligence Service, who becomes important to this chapter for another reason. The second rule was cover. Every action based on Ultra had to have a possible ordinary cause. A convoy altered course on a hunch; a reconnaissance plane was sent to "find" a supply ship that was already known to be at sea, and sometimes did, and sometimes the plane flew over a harbor the Germans had no reason to look at twice. The third rule was that the decrypts should not be used to stop all losses, only the ones that mattered, and this one is the hardest to apply. Churchill is said to have accepted, in the dreadful early-war cases, that some ships and some men would be lost for the secret's sake. The record that bears it out is thin, and the best-known version, the story of Coventry, is false.

**In the real world.** The Coventry story runs as follows. In November 1940 the Luftwaffe bombed Coventry, killing over 550 people. Winterbotham's book of 1974 said that Ultra had warned Churchill the raid was coming, that Churchill had chosen not to evacuate the city in order to protect the secret, and that the bombers were thus left alone. The official historian of British intelligence, Harry Hinsley, in the first volume of his history (1979), went through the surviving record and concluded that, as far as the record shows, the decrypts named no city, that the target was taken to be London until the afternoon of the raid itself, and that there was no decision of the kind Winterbotham described. R. V. Jones, who ran scientific intelligence at the Air Ministry and had worked on the German radio beams, wrote against it too. Winterbotham wrote from memory and without documents; the Coventry error is the best-known of several.

Ultra's secret was kept for almost thirty years, and the manner of its keeping is itself a story. Everyone who worked at the Park signed the Official Secrets Act on arrival and was reminded of it in 1945. No one was told that the silence had an end date. A few Britons knew the broad outline. Some publications leaked pieces: in 1967 the Polish historian Władysław Kozaczuk published a book about the Polish Enigma break, and in 1973 Gustave Bertrand, the French officer who had run the link to the Poles, published *Enigma*, and neither told the story from the British side. In 1974 the British Government let a book go to press that did: Winterbotham's *The Ultra Secret*. It was the first public account in English that Enigma had been read throughout the war. The government allowed it, and by most accounts did so partly because the Polish and French books had made the secret hard to hold; the author had not been a codebreaker and wrote without documents. It made Ultra widely known and spread several mistakes, including Coventry, that historians have since had to undo. Many Bletchley veterans were shocked. Some learned for the first time from the book what the huts next to theirs had done. Official releases of the wartime records followed slowly from the later 1970s, and each fresh release moved the story on: Welchman's *The Hut Six Story* in 1982 (to which, reportedly, American and British security authorities objected), Hinsley's five volumes between 1979 and 1990, Hinsley and Alan Stripp's *Codebreakers* in 1993, and the memoirs of the women who had been silent.

One more story is often told, and I give it as a story. It is that after the war Britain gave or sold captured Enigma machines to other states, which went on to use them in the belief that the cipher was safe, while Britain read the traffic. Some books state this as fact. I have not seen a document that settles it, and I would treat it as unproved.

How much did Ultra matter? The question is tangled up with the others that could have mattered (the radar, the aircraft and the industrial strength of the Allies), and it is counterfactual. Hinsley, whose view carries weight because he worked at the Park and wrote the official history, said in a lecture in 1993 that the war would have been something like two years longer, perhaps three, perhaps four, without Ultra. Not everyone agrees, and Hinsley himself said that Ultra did not change the outcome, only its date. Section §13.14 returns to this.

!!! note "Life story: Ultra"
    **Born:** the name was in use by 1941 (an earlier cover name for the reports was "Boniface"); the product dates from the first Enigma break, January 1940 · **Purpose:** to give the Allied leaders the contents of German signals without telling the Germans · **Helped:** Atlantic convoys, the Mediterranean supply war, the defeat of Rommel's supplies, the Normandy deception and the campaign in Europe; its secrecy was protected by the SLUs, cover stories, and the Official Secrets Act · **Status:** secret until 1974, when Winterbotham's *The Ultra Secret* appeared; documents released from the later 1970s; the technical history of the Lorenz work in 2000

## 13.8 Why Enigma lost

*Level: intermediate.*

Enigma was a good machine. Used as its designers meant it to be used, it would have been a far harder problem. The Germans were not stupid. They tested it, found it sound, and ran inquiries into whether it had been compromised. The answer to the question of why it lost is a list, and none of the items is a flaw that a mathematician could have fixed by tidying a diagram.

**First, the design rule that no letter can be itself.** This came from the reflector, the part that made one machine both encipher and decipher, and it is the reason a crib can be slid and tested at all. Without it, a crib in a wrong place would never be ruled out by a clash; every position would have to be tested by the whole bombe. With it, a free pencil test removes up to half the places for a long crib. The Poles used the rule too. The table below is the program for it, with a second small calculation that belongs to the next point.

```python
# If no letter can be itself, a wrong place for a crib is ruled out whenever any letter clashes.
# How many places are left for a crib of n letters in a 250-letter message?
places = 250
for n in (4, 8, 16, 24):
    keep = (25 / 26) ** n            # chance that a wrong place survives every letter
    left = (places - n + 1) * keep
    print(f"crib of {n:2d} letters: {keep:5.1%} of wrong places survive, about {left:5.0f} of {places - n + 1} left")

# Message keys that are 'cillies': the same letter three times, or three neighbors on the keyboard.
rows = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"]   # the keys of an Enigma, row by row
easy = {c * 3 for r in rows for c in r}
easy |= {r[i:i + 3] for r in rows for i in range(len(r) - 2)}
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
easy |= {alphabet[i:i + 3] for i in range(24)}
print(len(easy), "lazy message keys out of", 26 ** 3, "possible")
```

Output:

```
crib of  4 letters: 85.5% of wrong places survive, about   211 of 247 left
crib of  8 letters: 73.1% of wrong places survive, about   178 of 243 left
crib of 16 letters: 53.4% of wrong places survive, about   125 of 235 left
crib of 24 letters: 39.0% of wrong places survive, about    89 of 227 left
69 lazy message keys out of 17576 possible
```

**Second, cribs.** The rule is only worth something if there are cribs, and the German forces supplied them in great numbers. Every garrison and every air-force weather station sent a morning report in nearly the same words. "Nothing special to report" was sent day after day. Messages began with the same forms of address and ended with the same greeting. The codebreakers also made cribs: the RAF dropped mines in a named patch of sea so that the German warning, sent on the next day, would contain the known name, a practice called "gardening". The same news item, sent on two networks under two different keys, gave a crib in one network from the other.

**Third, operators.** A key is only as good as the habits of the people who choose it. The army's operators chose their own three-letter message keys and sent them in, and many chose lazily: the same letter three times, three letters in a row on the keyboard, a girlfriend's initials. Hut 6 called such predictable keys **cillies**, from a name (the common story says an operator who used "CIL" for a girl called Cillie, though I have not seen the origin documented). The program above counts how few such keys there are: 69 of 17,576, a fraction of one percent, so that a codebreaker who tried them first would be right far more often than chance. Another kind of habit gave the **Herivel tip**. John Herivel, a young Cambridge mathematician, saw in early 1940 that a hurried operator setting up the first message of the day might leave the rotors where the key sheet put them, so that the first message's indicator showed the day's ring setting. The idea was tried in May 1940 and it is often credited with giving the break into the Luftwaffe's general key, called *Red*, which Hut 6 then read, with few gaps, until the end of the war.

**Fourth, the network.** The deepest weakness was one of organization. Enigma was a **network cipher**: a single key, changed each day, covered every message of a whole command or arm. That gave the British thousands of messages in the same key. Once a day's key was found, every message of that network for the day could be read, and the sheer volume made traffic analysis possible. Welchman's call-sign work, the habit of studying who talked to whom and how long, and the cross-reference of nets, were in this way an attack on the organization and not on the machine.

**Fifth, a belief about scale.** This is the one that is easiest to forget. Germany's own experts judged Enigma by the cost of attacking it by hand, and by that standard it was safe. They could not imagine an opponent who would build several hundred electromechanical machines, run them with thousands of women in shifts, and add thousands more people to feed them. Bletchley was an industrial attack, and the cipher was designed against a craft attack. Germany did look into the matter more than once. The German naval records show reviews of the navy's signal security in 1941 and 1943 which concluded that the Enigma was sound, and sought other reasons for U-boat losses: radar, direction finding, spies, and the carelessness of the crews. The Germans did make changes, such as the fourth rotor in 1942 and the *Uhr*, a switch box that changed the plugboard pairs in a regular way, in 1944, but they came late and were not widely fitted.

Put them together and the verdict is the same as in earlier chapters. The cipher was not beaten by cleverness at the level of the diagram. It was beaten by the places where a real organization departed from the ideal: stereotyped messages, a lazy habit, the volume of traffic under one key, and the confidence of those who relied on it. A reader of [chapter 11](11-Radio-War-and-the-One-Time-Pad.md) will have seen the same pattern in the one-time pad, which is perfect on paper, and a reader who goes on to [chapter 14](14-The-Rest-of-the-War.md) will see it again in Venona.

## 13.9 Tunny: a depth, a rectangle and a machine nobody had seen

*Level: intermediate.*

Enigma carried the war in the field. For the orders that passed between Hitler's headquarters and the army groups, the German high command used something else: a teleprinter attached to a cipher machine, the Lorenz **Schlüsselzusatz** ("cipher attachment") SZ40, from 1942 the SZ42, made by the firm of C. Lorenz in Berlin. The operator typed on a keyboard; the machine added a key character to each five-bit teleprinter character by XOR, the stream-cipher operation of [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md); a radio sent the result; and at the far end a twin machine took the key off again and printed the German. Because it ran by wires and wheels and not by an operator's fingers, it was fast, and it was used for the longest messages. Bletchley called the machine **Tunny** (tunny is a fish), and the whole family of German teleprinter ciphers **Fish**, with each radio link named for a fish of its own.

The key came from twelve wheels, with a pattern of pins set up or down around each rim: five **chi** wheels with 41, 31, 29, 26 and 23 pins, which stepped once for every character; five **psi** wheels with 43, 47, 51, 53 and 59 pins, which stepped only when two **motor** wheels, with 61 and 37 pins, allowed it. That makes 501 pins in all. The wheel diagram is Figure 3.5 of the Cryptanalysis book and I will not redraw it. What matters here is how the British came to know it.

On 30 August 1941 a German operator at a station in Athens sent a message of about four thousand characters to Vienna. The receiving operator did not get it clean, and asked for it again. The sender, against every rule, sent it again with the same wheel settings, but, being tired, abbreviated words as he went and made small changes. Two different messages enciphered under the same key stream are a **depth**, the mistake of reusing a one-time pad ([chapter 11](11-Radio-War-and-the-One-Time-Pad.md)). A British monitoring station had taken down both. John Tiltman, a senior Bletchley codebreaker who had made his name on Japanese and Soviet ciphers and could pick apart a text from small clues, was given them. By the usual account he spent about ten days on the pair and ended with both messages in German, and, as a bonus, with the four thousand characters of key that had enciphered them. Here is the mechanism on a toy machine, with two short messages. The second is the first with an abbreviation:

```python
import random

# The five-bit teleprinter code (ITA2): letters, space, carriage return, line feed.
CODE = {"A": 3, "B": 25, "C": 14, "D": 9, "E": 1, "F": 13, "G": 26, "H": 20, "I": 6,
        "J": 11, "K": 15, "L": 18, "M": 28, "N": 12, "O": 24, "P": 22, "Q": 23,
        "R": 10, "S": 5, "T": 16, "U": 7, "V": 30, "W": 19, "X": 29, "Y": 21,
        "Z": 17, " ": 4, "\r": 8, "\n": 2}
CHAR = {v: k for k, v in CODE.items()}

def toy_key(n, seed=1941):
    """A toy Lorenz: 5 chi wheels step every time, 5 psi wheels only when the motor says."""
    rng = random.Random(seed)
    chi = [[rng.randint(0, 1) for _ in range(p)] for p in (41, 31, 29, 26, 23)]
    psi = [[rng.randint(0, 1) for _ in range(p)] for p in (43, 47, 51, 53, 59)]
    mu61 = [rng.randint(0, 1) for _ in range(61)]
    mu37 = [rng.randint(0, 1) for _ in range(37)]
    c = [0] * 5; p = [0] * 5; m61 = m37 = 0
    out = []
    for _ in range(n):
        out.append(sum((chi[i][c[i]] ^ psi[i][p[i]]) << (4 - i) for i in range(5)))
        c = [(c[i] + 1) % len(chi[i]) for i in range(5)]
        if mu37[m37]:                          # the second motor wheel says "move the psis"
            p = [(p[i] + 1) % len(psi[i]) for i in range(5)]
        if mu61[m61]:                          # the first motor wheel says "move the second"
            m37 = (m37 + 1) % 37
        m61 = (m61 + 1) % 61
    return out

def encrypt(text, key):
    return [CODE[ch] ^ k for ch, k in zip(text, key)]

key = toy_key(200)
first = "SPRUCHNUMMER NULL ANGRIFF BEGINNT MORGEN FRUEH UM SECHS UHR VON DER BRUECKE AUS"
again = "SPRUCHNR NULL ANGRIFF BEGINNT MORGEN FRUEH UM SECHS UHR VON DER BRUECKE AUS"
a, b = encrypt(first, key), encrypt(again, key)  # same settings twice: a depth

z = [x ^ y for x, y in zip(a, b)]                # the key drops out
print("identical for", next(i for i, v in enumerate(z) if v), "characters, then they differ")

# Tiltman's move: guess a word, put it in one message, and see what it makes of the other.
guess = "ANGRIFF"
for at in range(7, len(z) - len(guess) + 1):
    seen = "".join(CHAR.get(z[at + i] ^ CODE[guess[i]], "?") for i in range(len(guess)))
    if all(ch.isalpha() or ch == " " for ch in seen) and seen.count(" ") < 2:
        print(f"guess at {at:2d}: the other message reads {seen!r}")
```

Output:

```
identical for 7 characters, then they differ
guess at 14: the other message reads 'ULL ANG'
guess at 15: the other message reads 'X HKUGA'
guess at 18: the other message reads 'IFF BEG'
guess at 24: the other message reads 'HCKUNKX'
guess at 27: the other message reads 'CIOGLQW'
guess at 28: the other message reads 'DCRVMWT'
guess at 29: the other message reads 'EMCTOTB'
guess at 31: the other message reads 'QP QLAG'
guess at 33: the other message reads 'XZC ZII'
guess at 47: the other message reads 'SVRRA F'
guess at 50: the other message reads 'ADWRDFH'
guess at 51: the other message reads 'ISGSIHE'
guess at 53: the other message reads 'AAGWRJF'
guess at 55: the other message reads 'AYPNIGH'
guess at 68: the other message reads 'HDMKJSD'
```

The first signature of a depth is a run where the two ciphertexts agree character for character: the operator copied the first words exactly, so the key cancels to nothing. The run ends at the first abbreviation (here after seven characters), and from then on the second message is the first one shifted by four places. That shift is why the guess ANGRIFF ("attack") finds two readable places and not one: placed in the first message at 18 it makes the second read IFF BEG, and placed in the second message at 14 it makes the first read ULL ANG. The two pieces overlap in the text, and each confirms the other. A skilled reader extends from there, a word at a time, which is what Tiltman did with a human guess at every step, and with no machine but his head.

Tiltman's key stream went to the Research Section. There a young man who had joined Bletchley in 1941, William Tutte, spent the autumn and winter on it. Bill Tutte was born in 1917 in Suffolk, the son of an estate gardener, and had won scholarships to Trinity College, Cambridge, where he read natural sciences (chemistry) and then turned to mathematics. His task was to find out what machine could have made that key. He wrote the first impulse of the key stream out in rows and tried different row lengths, looking for the point at which the columns lined up. By his own later account, and the usual retelling, he first noticed a repeat in the pattern at an interval of 574 characters; since $574 = 2 \times 7 \times 41$, he tried rows 41 wide, and the columns began to lean. That was the first chi wheel. The reason it works is a little more subtle than a repeat of the pattern itself. If you take each character of the key against the next (the **delta**), the psi wheels contribute nothing whenever they do not move, and the motor made them stand still a good part of the time, so the delta of the key is mostly the delta of the chi wheel plus a bias. Written in rows as wide as that wheel's period, the same column of the rectangle always contains the same chi bit, and so leans toward dot or cross. The toy machine shows it. The program measures how far the columns lean for each width from 20 to 60:

```python
import random

def toy_key(n, seed=1941):
    """The same toy Lorenz as before: five chi wheels, five psi wheels, two motor wheels."""
    rng = random.Random(seed)
    chi = [[rng.randint(0, 1) for _ in range(p)] for p in (41, 31, 29, 26, 23)]
    psi = [[rng.randint(0, 1) for _ in range(p)] for p in (43, 47, 51, 53, 59)]
    mu61 = [rng.randint(0, 1) for _ in range(61)]
    mu37 = [rng.randint(0, 1) for _ in range(37)]
    c = [0] * 5; p = [0] * 5; m61 = m37 = 0
    out = []
    for _ in range(n):
        out.append(sum((chi[i][c[i]] ^ psi[i][p[i]]) << (4 - i) for i in range(5)))
        c = [(c[i] + 1) % len(chi[i]) for i in range(5)]
        if mu37[m37]:
            p = [(p[i] + 1) % len(psi[i]) for i in range(5)]
        if mu61[m61]:
            m37 = (m37 + 1) % 37
        m61 = (m61 + 1) % 61
    return out

key = toy_key(4000)
first = [(k >> 4) & 1 for k in key]                    # the first impulse of the key
delta = [first[t] ^ first[t + 1] for t in range(len(first) - 1)]   # each bit against the next

def lean(width):
    """How far the columns of a rectangle this wide lean to all dots or all crosses."""
    rows = len(delta) // width
    total = 0
    for col in range(width):
        crosses = sum(delta[r * width + col] for r in range(rows))
        total += abs(crosses / rows - 0.5)
    return total / width

scores = {w: lean(w) for w in range(20, 61)}
best = sorted(scores, key=scores.get, reverse=True)[:3]
for w in best:
    print(f"width {w}: average lean {scores[w]:.3f}")
others = [s for w, s in scores.items() if w not in best]
print(f"all the other widths: at most {max(others):.3f}")
```

Output:

```
width 41: average lean 0.101
width 54: average lean 0.052
width 46: average lean 0.049
all the other widths: at most 0.048
```

Width 41 stands at twice the lean of anything else. That is the toy; the real stream is noisier, and Tutte had four thousand characters and no computer. Figure 13.4 draws the two rectangles side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="Two rectangles of dots and crosses made from the same stream, one 41 columns wide where vertical streaks appear and one 40 columns wide where none do" fill="currentColor" font-size="14">
<text x="158" y="20" text-anchor="middle" font-weight="bold">written 41 wide</text>
<text x="478" y="20" text-anchor="middle" font-weight="bold">written 40 wide</text>
<path d="M20,32h6v6h-6zM62,32h6v6h-6zM83,32h6v6h-6zM111,32h6v6h-6zM118,32h6v6h-6zM139,32h6v6h-6zM146,32h6v6h-6zM153,32h6v6h-6zM167,32h6v6h-6zM174,32h6v6h-6zM181,32h6v6h-6zM195,32h6v6h-6zM216,32h6v6h-6zM223,32h6v6h-6zM230,32h6v6h-6zM237,32h6v6h-6zM244,32h6v6h-6zM258,32h6v6h-6zM265,32h6v6h-6zM293,32h6v6h-6zM300,32h6v6h-6zM27,39h6v6h-6zM34,39h6v6h-6zM41,39h6v6h-6zM69,39h6v6h-6zM76,39h6v6h-6zM97,39h6v6h-6zM104,39h6v6h-6zM118,39h6v6h-6zM125,39h6v6h-6zM132,39h6v6h-6zM139,39h6v6h-6zM153,39h6v6h-6zM181,39h6v6h-6zM188,39h6v6h-6zM202,39h6v6h-6zM216,39h6v6h-6zM223,39h6v6h-6zM230,39h6v6h-6zM237,39h6v6h-6zM258,39h6v6h-6zM265,39h6v6h-6zM279,39h6v6h-6zM286,39h6v6h-6zM20,46h6v6h-6zM41,46h6v6h-6zM48,46h6v6h-6zM55,46h6v6h-6zM62,46h6v6h-6zM83,46h6v6h-6zM104,46h6v6h-6zM125,46h6v6h-6zM139,46h6v6h-6zM153,46h6v6h-6zM167,46h6v6h-6zM181,46h6v6h-6zM195,46h6v6h-6zM202,46h6v6h-6zM223,46h6v6h-6zM230,46h6v6h-6zM237,46h6v6h-6zM244,46h6v6h-6zM258,46h6v6h-6zM272,46h6v6h-6zM286,46h6v6h-6zM293,46h6v6h-6zM300,46h6v6h-6zM27,53h6v6h-6zM34,53h6v6h-6zM48,53h6v6h-6zM55,53h6v6h-6zM62,53h6v6h-6zM69,53h6v6h-6zM76,53h6v6h-6zM97,53h6v6h-6zM104,53h6v6h-6zM125,53h6v6h-6zM132,53h6v6h-6zM139,53h6v6h-6zM146,53h6v6h-6zM153,53h6v6h-6zM174,53h6v6h-6zM188,53h6v6h-6zM195,53h6v6h-6zM202,53h6v6h-6zM209,53h6v6h-6zM258,53h6v6h-6zM279,53h6v6h-6zM286,53h6v6h-6zM20,60h6v6h-6zM27,60h6v6h-6zM41,60h6v6h-6zM55,60h6v6h-6zM62,60h6v6h-6zM69,60h6v6h-6zM76,60h6v6h-6zM83,60h6v6h-6zM90,60h6v6h-6zM125,60h6v6h-6zM132,60h6v6h-6zM139,60h6v6h-6zM146,60h6v6h-6zM153,60h6v6h-6zM174,60h6v6h-6zM188,60h6v6h-6zM202,60h6v6h-6zM216,60h6v6h-6zM223,60h6v6h-6zM230,60h6v6h-6zM237,60h6v6h-6zM244,60h6v6h-6zM272,60h6v6h-6zM279,60h6v6h-6zM286,60h6v6h-6zM293,60h6v6h-6zM300,60h6v6h-6zM27,67h6v6h-6zM34,67h6v6h-6zM41,67h6v6h-6zM83,67h6v6h-6zM97,67h6v6h-6zM111,67h6v6h-6zM125,67h6v6h-6zM132,67h6v6h-6zM139,67h6v6h-6zM146,67h6v6h-6zM153,67h6v6h-6zM174,67h6v6h-6zM195,67h6v6h-6zM202,67h6v6h-6zM209,67h6v6h-6zM237,67h6v6h-6zM251,67h6v6h-6zM265,67h6v6h-6zM286,67h6v6h-6zM293,67h6v6h-6zM300,67h6v6h-6zM20,74h6v6h-6zM41,74h6v6h-6zM48,74h6v6h-6zM62,74h6v6h-6zM69,74h6v6h-6zM76,74h6v6h-6zM83,74h6v6h-6zM97,74h6v6h-6zM104,74h6v6h-6zM111,74h6v6h-6zM125,74h6v6h-6zM132,74h6v6h-6zM139,74h6v6h-6zM153,74h6v6h-6zM174,74h6v6h-6zM188,74h6v6h-6zM216,74h6v6h-6zM223,74h6v6h-6zM230,74h6v6h-6zM237,74h6v6h-6zM251,74h6v6h-6zM272,74h6v6h-6zM279,74h6v6h-6zM20,81h6v6h-6zM34,81h6v6h-6zM48,81h6v6h-6zM76,81h6v6h-6zM97,81h6v6h-6zM111,81h6v6h-6zM125,81h6v6h-6zM132,81h6v6h-6zM160,81h6v6h-6zM167,81h6v6h-6zM174,81h6v6h-6zM188,81h6v6h-6zM195,81h6v6h-6zM202,81h6v6h-6zM209,81h6v6h-6zM223,81h6v6h-6zM230,81h6v6h-6zM258,81h6v6h-6zM265,81h6v6h-6zM272,81h6v6h-6zM279,81h6v6h-6zM286,81h6v6h-6zM34,88h6v6h-6zM41,88h6v6h-6zM62,88h6v6h-6zM69,88h6v6h-6zM76,88h6v6h-6zM97,88h6v6h-6zM111,88h6v6h-6zM125,88h6v6h-6zM132,88h6v6h-6zM139,88h6v6h-6zM153,88h6v6h-6zM160,88h6v6h-6zM167,88h6v6h-6zM181,88h6v6h-6zM188,88h6v6h-6zM209,88h6v6h-6zM237,88h6v6h-6zM272,88h6v6h-6zM279,88h6v6h-6zM300,88h6v6h-6zM27,95h6v6h-6zM34,95h6v6h-6zM62,95h6v6h-6zM69,95h6v6h-6zM90,95h6v6h-6zM118,95h6v6h-6zM125,95h6v6h-6zM153,95h6v6h-6zM174,95h6v6h-6zM188,95h6v6h-6zM195,95h6v6h-6zM202,95h6v6h-6zM230,95h6v6h-6zM258,95h6v6h-6zM272,95h6v6h-6zM286,95h6v6h-6zM293,95h6v6h-6zM300,95h6v6h-6zM27,102h6v6h-6zM34,102h6v6h-6zM41,102h6v6h-6zM62,102h6v6h-6zM76,102h6v6h-6zM83,102h6v6h-6zM97,102h6v6h-6zM104,102h6v6h-6zM111,102h6v6h-6zM125,102h6v6h-6zM132,102h6v6h-6zM139,102h6v6h-6zM146,102h6v6h-6zM160,102h6v6h-6zM167,102h6v6h-6zM181,102h6v6h-6zM223,102h6v6h-6zM230,102h6v6h-6zM237,102h6v6h-6zM244,102h6v6h-6zM265,102h6v6h-6zM279,102h6v6h-6zM293,102h6v6h-6zM300,102h6v6h-6zM20,109h6v6h-6zM27,109h6v6h-6zM34,109h6v6h-6zM41,109h6v6h-6zM55,109h6v6h-6zM62,109h6v6h-6zM83,109h6v6h-6zM111,109h6v6h-6zM146,109h6v6h-6zM153,109h6v6h-6zM160,109h6v6h-6zM167,109h6v6h-6zM174,109h6v6h-6zM216,109h6v6h-6zM230,109h6v6h-6zM237,109h6v6h-6zM244,109h6v6h-6zM272,109h6v6h-6zM286,109h6v6h-6zM300,109h6v6h-6zM20,116h6v6h-6zM27,116h6v6h-6zM41,116h6v6h-6zM62,116h6v6h-6zM69,116h6v6h-6zM76,116h6v6h-6zM83,116h6v6h-6zM90,116h6v6h-6zM118,116h6v6h-6zM132,116h6v6h-6zM160,116h6v6h-6zM167,116h6v6h-6zM188,116h6v6h-6zM216,116h6v6h-6zM223,116h6v6h-6zM230,116h6v6h-6zM244,116h6v6h-6zM286,116h6v6h-6zM293,116h6v6h-6zM300,116h6v6h-6zM41,123h6v6h-6zM55,123h6v6h-6zM125,123h6v6h-6zM132,123h6v6h-6zM139,123h6v6h-6zM153,123h6v6h-6zM160,123h6v6h-6zM167,123h6v6h-6zM174,123h6v6h-6zM188,123h6v6h-6zM216,123h6v6h-6zM244,123h6v6h-6zM251,123h6v6h-6zM272,123h6v6h-6zM286,123h6v6h-6zM293,123h6v6h-6zM300,123h6v6h-6zM34,130h6v6h-6zM48,130h6v6h-6zM55,130h6v6h-6zM83,130h6v6h-6zM90,130h6v6h-6zM97,130h6v6h-6zM104,130h6v6h-6zM125,130h6v6h-6zM132,130h6v6h-6zM146,130h6v6h-6zM188,130h6v6h-6zM216,130h6v6h-6zM230,130h6v6h-6zM237,130h6v6h-6zM244,130h6v6h-6zM279,130h6v6h-6zM20,137h6v6h-6zM34,137h6v6h-6zM48,137h6v6h-6zM62,137h6v6h-6zM69,137h6v6h-6zM76,137h6v6h-6zM97,137h6v6h-6zM104,137h6v6h-6zM125,137h6v6h-6zM132,137h6v6h-6zM139,137h6v6h-6zM153,137h6v6h-6zM174,137h6v6h-6zM181,137h6v6h-6zM188,137h6v6h-6zM195,137h6v6h-6zM202,137h6v6h-6zM209,137h6v6h-6zM216,137h6v6h-6zM230,137h6v6h-6zM237,137h6v6h-6zM244,137h6v6h-6zM258,137h6v6h-6zM279,137h6v6h-6zM20,144h6v6h-6zM27,144h6v6h-6zM83,144h6v6h-6zM97,144h6v6h-6zM111,144h6v6h-6zM125,144h6v6h-6zM132,144h6v6h-6zM139,144h6v6h-6zM167,144h6v6h-6zM188,144h6v6h-6zM209,144h6v6h-6zM251,144h6v6h-6zM272,144h6v6h-6zM286,144h6v6h-6zM293,144h6v6h-6zM300,144h6v6h-6zM27,151h6v6h-6zM34,151h6v6h-6zM41,151h6v6h-6zM62,151h6v6h-6zM69,151h6v6h-6zM97,151h6v6h-6zM104,151h6v6h-6zM174,151h6v6h-6zM202,151h6v6h-6zM209,151h6v6h-6zM216,151h6v6h-6zM223,151h6v6h-6zM251,151h6v6h-6zM258,151h6v6h-6zM272,151h6v6h-6zM279,151h6v6h-6zM286,151h6v6h-6zM20,158h6v6h-6zM34,158h6v6h-6zM41,158h6v6h-6zM48,158h6v6h-6zM62,158h6v6h-6zM69,158h6v6h-6zM76,158h6v6h-6zM97,158h6v6h-6zM104,158h6v6h-6zM111,158h6v6h-6zM125,158h6v6h-6zM132,158h6v6h-6zM139,158h6v6h-6zM153,158h6v6h-6zM160,158h6v6h-6zM181,158h6v6h-6zM195,158h6v6h-6zM202,158h6v6h-6zM209,158h6v6h-6zM223,158h6v6h-6zM237,158h6v6h-6zM244,158h6v6h-6zM300,158h6v6h-6zM27,165h6v6h-6zM34,165h6v6h-6zM41,165h6v6h-6zM48,165h6v6h-6zM55,165h6v6h-6zM62,165h6v6h-6zM69,165h6v6h-6zM76,165h6v6h-6zM97,165h6v6h-6zM104,165h6v6h-6zM132,165h6v6h-6zM160,165h6v6h-6zM181,165h6v6h-6zM195,165h6v6h-6zM209,165h6v6h-6zM223,165h6v6h-6zM251,165h6v6h-6zM286,165h6v6h-6zM293,165h6v6h-6zM300,165h6v6h-6zM20,172h6v6h-6zM27,172h6v6h-6zM34,172h6v6h-6zM41,172h6v6h-6zM62,172h6v6h-6zM69,172h6v6h-6zM118,172h6v6h-6zM146,172h6v6h-6zM153,172h6v6h-6zM174,172h6v6h-6zM195,172h6v6h-6zM216,172h6v6h-6zM223,172h6v6h-6zM230,172h6v6h-6zM237,172h6v6h-6zM244,172h6v6h-6zM265,172h6v6h-6zM279,172h6v6h-6zM286,172h6v6h-6zM293,172h6v6h-6zM300,172h6v6h-6zM27,179h6v6h-6zM34,179h6v6h-6zM41,179h6v6h-6zM55,179h6v6h-6zM62,179h6v6h-6zM76,179h6v6h-6zM83,179h6v6h-6zM90,179h6v6h-6zM104,179h6v6h-6zM118,179h6v6h-6zM153,179h6v6h-6zM167,179h6v6h-6zM181,179h6v6h-6zM209,179h6v6h-6zM216,179h6v6h-6zM223,179h6v6h-6zM230,179h6v6h-6zM237,179h6v6h-6zM244,179h6v6h-6zM265,179h6v6h-6zM272,179h6v6h-6zM279,179h6v6h-6zM300,179h6v6h-6zM48,186h6v6h-6zM76,186h6v6h-6zM97,186h6v6h-6zM104,186h6v6h-6zM111,186h6v6h-6zM125,186h6v6h-6zM139,186h6v6h-6zM153,186h6v6h-6zM174,186h6v6h-6zM188,186h6v6h-6zM195,186h6v6h-6zM209,186h6v6h-6zM230,186h6v6h-6zM237,186h6v6h-6zM244,186h6v6h-6zM258,186h6v6h-6zM20,193h6v6h-6zM48,193h6v6h-6zM69,193h6v6h-6zM83,193h6v6h-6zM104,193h6v6h-6zM111,193h6v6h-6zM118,193h6v6h-6zM125,193h6v6h-6zM132,193h6v6h-6zM139,193h6v6h-6zM167,193h6v6h-6zM174,193h6v6h-6zM181,193h6v6h-6zM195,193h6v6h-6zM216,193h6v6h-6zM223,193h6v6h-6zM230,193h6v6h-6zM237,193h6v6h-6zM251,193h6v6h-6zM258,193h6v6h-6zM265,193h6v6h-6zM286,193h6v6h-6zM293,193h6v6h-6zM300,193h6v6h-6zM27,200h6v6h-6zM34,200h6v6h-6zM41,200h6v6h-6zM55,200h6v6h-6zM69,200h6v6h-6zM83,200h6v6h-6zM97,200h6v6h-6zM104,200h6v6h-6zM111,200h6v6h-6zM125,200h6v6h-6zM132,200h6v6h-6zM139,200h6v6h-6zM146,200h6v6h-6zM153,200h6v6h-6zM160,200h6v6h-6zM195,200h6v6h-6zM216,200h6v6h-6zM251,200h6v6h-6zM258,200h6v6h-6zM279,200h6v6h-6zM286,200h6v6h-6zM27,207h6v6h-6zM34,207h6v6h-6zM62,207h6v6h-6zM69,207h6v6h-6zM90,207h6v6h-6zM104,207h6v6h-6zM111,207h6v6h-6zM118,207h6v6h-6zM146,207h6v6h-6zM153,207h6v6h-6zM174,207h6v6h-6zM181,207h6v6h-6zM202,207h6v6h-6zM209,207h6v6h-6zM216,207h6v6h-6zM230,207h6v6h-6zM244,207h6v6h-6zM272,207h6v6h-6zM286,207h6v6h-6zM293,207h6v6h-6zM34,214h6v6h-6zM62,214h6v6h-6zM69,214h6v6h-6zM76,214h6v6h-6zM83,214h6v6h-6zM90,214h6v6h-6zM111,214h6v6h-6zM125,214h6v6h-6zM132,214h6v6h-6zM139,214h6v6h-6zM160,214h6v6h-6zM167,214h6v6h-6zM188,214h6v6h-6zM195,214h6v6h-6zM202,214h6v6h-6zM209,214h6v6h-6zM223,214h6v6h-6zM230,214h6v6h-6zM237,214h6v6h-6zM272,214h6v6h-6zM279,214h6v6h-6zM286,214h6v6h-6zM20,221h6v6h-6zM41,221h6v6h-6zM48,221h6v6h-6zM55,221h6v6h-6zM76,221h6v6h-6zM83,221h6v6h-6zM97,221h6v6h-6zM111,221h6v6h-6zM118,221h6v6h-6zM139,221h6v6h-6zM146,221h6v6h-6zM153,221h6v6h-6zM160,221h6v6h-6zM181,221h6v6h-6zM202,221h6v6h-6zM216,221h6v6h-6zM223,221h6v6h-6zM272,221h6v6h-6zM286,221h6v6h-6zM293,221h6v6h-6zM27,228h6v6h-6zM34,228h6v6h-6zM41,228h6v6h-6zM83,228h6v6h-6zM97,228h6v6h-6zM111,228h6v6h-6zM125,228h6v6h-6zM132,228h6v6h-6zM139,228h6v6h-6zM153,228h6v6h-6zM160,228h6v6h-6zM174,228h6v6h-6zM181,228h6v6h-6zM195,228h6v6h-6zM202,228h6v6h-6zM209,228h6v6h-6zM244,228h6v6h-6zM251,228h6v6h-6zM258,228h6v6h-6zM286,228h6v6h-6zM34,235h6v6h-6zM62,235h6v6h-6zM83,235h6v6h-6zM90,235h6v6h-6zM104,235h6v6h-6zM111,235h6v6h-6zM125,235h6v6h-6zM139,235h6v6h-6zM153,235h6v6h-6zM160,235h6v6h-6zM174,235h6v6h-6zM188,235h6v6h-6zM216,235h6v6h-6zM223,235h6v6h-6zM237,235h6v6h-6zM272,235h6v6h-6zM286,235h6v6h-6zM20,242h6v6h-6zM27,242h6v6h-6zM34,242h6v6h-6zM62,242h6v6h-6zM69,242h6v6h-6zM76,242h6v6h-6zM83,242h6v6h-6zM97,242h6v6h-6zM104,242h6v6h-6zM111,242h6v6h-6zM125,242h6v6h-6zM146,242h6v6h-6zM160,242h6v6h-6zM167,242h6v6h-6zM181,242h6v6h-6zM202,242h6v6h-6zM209,242h6v6h-6zM216,242h6v6h-6zM223,242h6v6h-6zM258,242h6v6h-6zM272,242h6v6h-6zM293,242h6v6h-6zM27,249h6v6h-6zM41,249h6v6h-6zM62,249h6v6h-6zM69,249h6v6h-6zM76,249h6v6h-6zM90,249h6v6h-6zM104,249h6v6h-6zM111,249h6v6h-6zM125,249h6v6h-6zM132,249h6v6h-6zM139,249h6v6h-6zM153,249h6v6h-6zM167,249h6v6h-6zM188,249h6v6h-6zM216,249h6v6h-6zM223,249h6v6h-6zM244,249h6v6h-6zM251,249h6v6h-6zM258,249h6v6h-6zM265,249h6v6h-6zM286,249h6v6h-6zM300,249h6v6h-6z"/>
<rect x="19" y="31" width="288" height="225" fill="none" stroke="currentColor" stroke-width="1"/>
<path d="M340,32h6v6h-6zM382,32h6v6h-6zM403,32h6v6h-6zM431,32h6v6h-6zM438,32h6v6h-6zM459,32h6v6h-6zM466,32h6v6h-6zM473,32h6v6h-6zM487,32h6v6h-6zM494,32h6v6h-6zM501,32h6v6h-6zM515,32h6v6h-6zM536,32h6v6h-6zM543,32h6v6h-6zM550,32h6v6h-6zM557,32h6v6h-6zM564,32h6v6h-6zM578,32h6v6h-6zM585,32h6v6h-6zM613,32h6v6h-6zM340,39h6v6h-6zM354,39h6v6h-6zM361,39h6v6h-6zM368,39h6v6h-6zM396,39h6v6h-6zM403,39h6v6h-6zM424,39h6v6h-6zM431,39h6v6h-6zM445,39h6v6h-6zM452,39h6v6h-6zM459,39h6v6h-6zM466,39h6v6h-6zM480,39h6v6h-6zM508,39h6v6h-6zM515,39h6v6h-6zM529,39h6v6h-6zM543,39h6v6h-6zM550,39h6v6h-6zM557,39h6v6h-6zM564,39h6v6h-6zM585,39h6v6h-6zM592,39h6v6h-6zM606,39h6v6h-6zM613,39h6v6h-6zM354,46h6v6h-6zM375,46h6v6h-6zM382,46h6v6h-6zM389,46h6v6h-6zM396,46h6v6h-6zM417,46h6v6h-6zM438,46h6v6h-6zM459,46h6v6h-6zM473,46h6v6h-6zM487,46h6v6h-6zM501,46h6v6h-6zM515,46h6v6h-6zM529,46h6v6h-6zM536,46h6v6h-6zM557,46h6v6h-6zM564,46h6v6h-6zM571,46h6v6h-6zM578,46h6v6h-6zM592,46h6v6h-6zM606,46h6v6h-6zM340,53h6v6h-6zM347,53h6v6h-6zM354,53h6v6h-6zM368,53h6v6h-6zM375,53h6v6h-6zM389,53h6v6h-6zM396,53h6v6h-6zM403,53h6v6h-6zM410,53h6v6h-6zM417,53h6v6h-6zM438,53h6v6h-6zM445,53h6v6h-6zM466,53h6v6h-6zM473,53h6v6h-6zM480,53h6v6h-6zM487,53h6v6h-6zM494,53h6v6h-6zM515,53h6v6h-6zM529,53h6v6h-6zM536,53h6v6h-6zM543,53h6v6h-6zM550,53h6v6h-6zM599,53h6v6h-6zM340,60h6v6h-6zM347,60h6v6h-6zM368,60h6v6h-6zM375,60h6v6h-6zM389,60h6v6h-6zM403,60h6v6h-6zM410,60h6v6h-6zM417,60h6v6h-6zM424,60h6v6h-6zM431,60h6v6h-6zM438,60h6v6h-6zM473,60h6v6h-6zM480,60h6v6h-6zM487,60h6v6h-6zM494,60h6v6h-6zM501,60h6v6h-6zM522,60h6v6h-6zM536,60h6v6h-6zM550,60h6v6h-6zM564,60h6v6h-6zM571,60h6v6h-6zM578,60h6v6h-6zM585,60h6v6h-6zM592,60h6v6h-6zM340,67h6v6h-6zM347,67h6v6h-6zM354,67h6v6h-6zM361,67h6v6h-6zM368,67h6v6h-6zM382,67h6v6h-6zM389,67h6v6h-6zM396,67h6v6h-6zM438,67h6v6h-6zM452,67h6v6h-6zM466,67h6v6h-6zM480,67h6v6h-6zM487,67h6v6h-6zM494,67h6v6h-6zM501,67h6v6h-6zM508,67h6v6h-6zM529,67h6v6h-6zM550,67h6v6h-6zM557,67h6v6h-6zM564,67h6v6h-6zM592,67h6v6h-6zM606,67h6v6h-6zM340,74h6v6h-6zM361,74h6v6h-6zM368,74h6v6h-6zM375,74h6v6h-6zM382,74h6v6h-6zM403,74h6v6h-6zM410,74h6v6h-6zM424,74h6v6h-6zM431,74h6v6h-6zM438,74h6v6h-6zM445,74h6v6h-6zM459,74h6v6h-6zM466,74h6v6h-6zM473,74h6v6h-6zM487,74h6v6h-6zM494,74h6v6h-6zM501,74h6v6h-6zM515,74h6v6h-6zM536,74h6v6h-6zM550,74h6v6h-6zM578,74h6v6h-6zM585,74h6v6h-6zM592,74h6v6h-6zM599,74h6v6h-6zM613,74h6v6h-6zM354,81h6v6h-6zM361,81h6v6h-6zM389,81h6v6h-6zM403,81h6v6h-6zM417,81h6v6h-6zM445,81h6v6h-6zM466,81h6v6h-6zM480,81h6v6h-6zM494,81h6v6h-6zM501,81h6v6h-6zM529,81h6v6h-6zM536,81h6v6h-6zM543,81h6v6h-6zM557,81h6v6h-6zM564,81h6v6h-6zM571,81h6v6h-6zM578,81h6v6h-6zM592,81h6v6h-6zM599,81h6v6h-6zM347,88h6v6h-6zM354,88h6v6h-6zM361,88h6v6h-6zM368,88h6v6h-6zM375,88h6v6h-6zM410,88h6v6h-6zM417,88h6v6h-6zM438,88h6v6h-6zM445,88h6v6h-6zM452,88h6v6h-6zM473,88h6v6h-6zM487,88h6v6h-6zM501,88h6v6h-6zM508,88h6v6h-6zM515,88h6v6h-6zM529,88h6v6h-6zM536,88h6v6h-6zM543,88h6v6h-6zM557,88h6v6h-6zM564,88h6v6h-6zM585,88h6v6h-6zM613,88h6v6h-6zM368,95h6v6h-6zM375,95h6v6h-6zM396,95h6v6h-6zM410,95h6v6h-6zM417,95h6v6h-6zM445,95h6v6h-6zM452,95h6v6h-6zM473,95h6v6h-6zM501,95h6v6h-6zM508,95h6v6h-6zM536,95h6v6h-6zM557,95h6v6h-6zM571,95h6v6h-6zM578,95h6v6h-6zM585,95h6v6h-6zM613,95h6v6h-6zM361,102h6v6h-6zM375,102h6v6h-6zM389,102h6v6h-6zM396,102h6v6h-6zM403,102h6v6h-6zM417,102h6v6h-6zM424,102h6v6h-6zM431,102h6v6h-6zM452,102h6v6h-6zM466,102h6v6h-6zM473,102h6v6h-6zM487,102h6v6h-6zM494,102h6v6h-6zM501,102h6v6h-6zM515,102h6v6h-6zM522,102h6v6h-6zM529,102h6v6h-6zM536,102h6v6h-6zM550,102h6v6h-6zM557,102h6v6h-6zM571,102h6v6h-6zM613,102h6v6h-6zM340,109h6v6h-6zM347,109h6v6h-6zM354,109h6v6h-6zM375,109h6v6h-6zM389,109h6v6h-6zM403,109h6v6h-6zM410,109h6v6h-6zM417,109h6v6h-6zM424,109h6v6h-6zM431,109h6v6h-6zM438,109h6v6h-6zM452,109h6v6h-6zM459,109h6v6h-6zM480,109h6v6h-6zM508,109h6v6h-6zM543,109h6v6h-6zM550,109h6v6h-6zM557,109h6v6h-6zM564,109h6v6h-6zM571,109h6v6h-6zM613,109h6v6h-6zM347,116h6v6h-6zM354,116h6v6h-6zM361,116h6v6h-6zM389,116h6v6h-6zM403,116h6v6h-6zM417,116h6v6h-6zM424,116h6v6h-6zM431,116h6v6h-6zM445,116h6v6h-6zM466,116h6v6h-6zM473,116h6v6h-6zM480,116h6v6h-6zM487,116h6v6h-6zM494,116h6v6h-6zM522,116h6v6h-6zM536,116h6v6h-6zM564,116h6v6h-6zM571,116h6v6h-6zM592,116h6v6h-6zM340,123h6v6h-6zM347,123h6v6h-6zM354,123h6v6h-6zM368,123h6v6h-6zM410,123h6v6h-6zM417,123h6v6h-6zM424,123h6v6h-6zM452,123h6v6h-6zM466,123h6v6h-6zM536,123h6v6h-6zM543,123h6v6h-6zM550,123h6v6h-6zM564,123h6v6h-6zM571,123h6v6h-6zM578,123h6v6h-6zM585,123h6v6h-6zM599,123h6v6h-6zM347,130h6v6h-6zM375,130h6v6h-6zM382,130h6v6h-6zM403,130h6v6h-6zM417,130h6v6h-6zM424,130h6v6h-6zM431,130h6v6h-6zM452,130h6v6h-6zM466,130h6v6h-6zM473,130h6v6h-6zM501,130h6v6h-6zM508,130h6v6h-6zM515,130h6v6h-6zM522,130h6v6h-6zM543,130h6v6h-6zM550,130h6v6h-6zM564,130h6v6h-6zM606,130h6v6h-6zM354,137h6v6h-6zM368,137h6v6h-6zM375,137h6v6h-6zM382,137h6v6h-6zM417,137h6v6h-6zM445,137h6v6h-6zM459,137h6v6h-6zM473,137h6v6h-6zM487,137h6v6h-6zM494,137h6v6h-6zM501,137h6v6h-6zM522,137h6v6h-6zM529,137h6v6h-6zM550,137h6v6h-6zM557,137h6v6h-6zM564,137h6v6h-6zM578,137h6v6h-6zM599,137h6v6h-6zM606,137h6v6h-6zM613,137h6v6h-6zM340,144h6v6h-6zM347,144h6v6h-6zM354,144h6v6h-6zM361,144h6v6h-6zM375,144h6v6h-6zM382,144h6v6h-6zM389,144h6v6h-6zM403,144h6v6h-6zM424,144h6v6h-6zM452,144h6v6h-6zM459,144h6v6h-6zM515,144h6v6h-6zM529,144h6v6h-6zM543,144h6v6h-6zM557,144h6v6h-6zM564,144h6v6h-6zM571,144h6v6h-6zM599,144h6v6h-6zM340,151h6v6h-6zM361,151h6v6h-6zM403,151h6v6h-6zM424,151h6v6h-6zM438,151h6v6h-6zM445,151h6v6h-6zM452,151h6v6h-6zM466,151h6v6h-6zM473,151h6v6h-6zM480,151h6v6h-6zM501,151h6v6h-6zM508,151h6v6h-6zM536,151h6v6h-6zM543,151h6v6h-6zM613,151h6v6h-6zM361,158h6v6h-6zM368,158h6v6h-6zM375,158h6v6h-6zM382,158h6v6h-6zM410,158h6v6h-6zM417,158h6v6h-6zM431,158h6v6h-6zM438,158h6v6h-6zM445,158h6v6h-6zM466,158h6v6h-6zM480,158h6v6h-6zM487,158h6v6h-6zM494,158h6v6h-6zM508,158h6v6h-6zM515,158h6v6h-6zM522,158h6v6h-6zM543,158h6v6h-6zM550,158h6v6h-6zM557,158h6v6h-6zM571,158h6v6h-6zM578,158h6v6h-6zM585,158h6v6h-6zM599,158h6v6h-6zM606,158h6v6h-6zM347,165h6v6h-6zM361,165h6v6h-6zM368,165h6v6h-6zM375,165h6v6h-6zM389,165h6v6h-6zM403,165h6v6h-6zM410,165h6v6h-6zM466,165h6v6h-6zM480,165h6v6h-6zM487,165h6v6h-6zM494,165h6v6h-6zM501,165h6v6h-6zM508,165h6v6h-6zM515,165h6v6h-6zM522,165h6v6h-6zM529,165h6v6h-6zM550,165h6v6h-6zM557,165h6v6h-6zM585,165h6v6h-6zM613,165h6v6h-6zM354,172h6v6h-6zM368,172h6v6h-6zM382,172h6v6h-6zM396,172h6v6h-6zM424,172h6v6h-6zM459,172h6v6h-6zM466,172h6v6h-6zM473,172h6v6h-6zM480,172h6v6h-6zM487,172h6v6h-6zM494,172h6v6h-6zM501,172h6v6h-6zM522,172h6v6h-6zM529,172h6v6h-6zM578,172h6v6h-6zM606,172h6v6h-6zM613,172h6v6h-6zM354,179h6v6h-6zM375,179h6v6h-6zM396,179h6v6h-6zM403,179h6v6h-6zM410,179h6v6h-6zM417,179h6v6h-6zM424,179h6v6h-6zM445,179h6v6h-6zM459,179h6v6h-6zM466,179h6v6h-6zM473,179h6v6h-6zM480,179h6v6h-6zM494,179h6v6h-6zM501,179h6v6h-6zM508,179h6v6h-6zM522,179h6v6h-6zM529,179h6v6h-6zM543,179h6v6h-6zM550,179h6v6h-6zM557,179h6v6h-6zM571,179h6v6h-6zM585,179h6v6h-6zM340,186h6v6h-6zM354,186h6v6h-6zM368,186h6v6h-6zM396,186h6v6h-6zM403,186h6v6h-6zM410,186h6v6h-6zM417,186h6v6h-6zM424,186h6v6h-6zM431,186h6v6h-6zM452,186h6v6h-6zM459,186h6v6h-6zM466,186h6v6h-6zM487,186h6v6h-6zM522,186h6v6h-6zM550,186h6v6h-6zM571,186h6v6h-6zM578,186h6v6h-6zM585,186h6v6h-6zM599,186h6v6h-6zM613,186h6v6h-6zM347,193h6v6h-6zM368,193h6v6h-6zM382,193h6v6h-6zM389,193h6v6h-6zM403,193h6v6h-6zM424,193h6v6h-6zM431,193h6v6h-6zM438,193h6v6h-6zM452,193h6v6h-6zM501,193h6v6h-6zM529,193h6v6h-6zM550,193h6v6h-6zM564,193h6v6h-6zM585,193h6v6h-6zM592,193h6v6h-6zM599,193h6v6h-6zM606,193h6v6h-6zM613,193h6v6h-6zM340,200h6v6h-6zM368,200h6v6h-6zM375,200h6v6h-6zM382,200h6v6h-6zM396,200h6v6h-6zM417,200h6v6h-6zM424,200h6v6h-6zM431,200h6v6h-6zM438,200h6v6h-6zM452,200h6v6h-6zM459,200h6v6h-6zM466,200h6v6h-6zM487,200h6v6h-6zM494,200h6v6h-6zM501,200h6v6h-6zM515,200h6v6h-6zM522,200h6v6h-6zM529,200h6v6h-6zM543,200h6v6h-6zM557,200h6v6h-6zM571,200h6v6h-6zM585,200h6v6h-6zM592,200h6v6h-6zM599,200h6v6h-6zM613,200h6v6h-6zM340,207h6v6h-6zM347,207h6v6h-6zM354,207h6v6h-6zM361,207h6v6h-6zM368,207h6v6h-6zM403,207h6v6h-6zM424,207h6v6h-6zM459,207h6v6h-6zM466,207h6v6h-6zM487,207h6v6h-6zM494,207h6v6h-6zM522,207h6v6h-6zM529,207h6v6h-6zM557,207h6v6h-6zM564,207h6v6h-6zM585,207h6v6h-6zM599,207h6v6h-6zM606,207h6v6h-6zM613,207h6v6h-6zM361,214h6v6h-6zM368,214h6v6h-6zM389,214h6v6h-6zM396,214h6v6h-6zM417,214h6v6h-6zM424,214h6v6h-6zM431,214h6v6h-6zM445,214h6v6h-6zM459,214h6v6h-6zM487,214h6v6h-6zM501,214h6v6h-6zM508,214h6v6h-6zM536,214h6v6h-6zM564,214h6v6h-6zM571,214h6v6h-6zM578,214h6v6h-6zM585,214h6v6h-6zM592,214h6v6h-6zM613,214h6v6h-6zM347,221h6v6h-6zM354,221h6v6h-6zM361,221h6v6h-6zM382,221h6v6h-6zM389,221h6v6h-6zM410,221h6v6h-6zM417,221h6v6h-6zM424,221h6v6h-6zM431,221h6v6h-6zM445,221h6v6h-6zM452,221h6v6h-6zM459,221h6v6h-6zM494,221h6v6h-6zM501,221h6v6h-6zM508,221h6v6h-6zM529,221h6v6h-6zM550,221h6v6h-6zM557,221h6v6h-6zM564,221h6v6h-6zM585,221h6v6h-6zM592,221h6v6h-6zM606,221h6v6h-6zM340,228h6v6h-6zM347,228h6v6h-6zM368,228h6v6h-6zM375,228h6v6h-6zM382,228h6v6h-6zM389,228h6v6h-6zM410,228h6v6h-6zM431,228h6v6h-6zM445,228h6v6h-6zM452,228h6v6h-6zM501,228h6v6h-6zM515,228h6v6h-6zM522,228h6v6h-6zM543,228h6v6h-6zM550,228h6v6h-6zM557,228h6v6h-6zM599,228h6v6h-6zM613,228h6v6h-6zM347,235h6v6h-6zM361,235h6v6h-6zM368,235h6v6h-6zM375,235h6v6h-6zM389,235h6v6h-6zM396,235h6v6h-6zM410,235h6v6h-6zM417,235h6v6h-6zM431,235h6v6h-6zM438,235h6v6h-6zM445,235h6v6h-6zM480,235h6v6h-6zM487,235h6v6h-6zM494,235h6v6h-6zM522,235h6v6h-6zM557,235h6v6h-6zM585,235h6v6h-6zM606,235h6v6h-6zM613,235h6v6h-6zM347,242h6v6h-6zM354,242h6v6h-6zM368,242h6v6h-6zM382,242h6v6h-6zM396,242h6v6h-6zM403,242h6v6h-6zM417,242h6v6h-6zM431,242h6v6h-6zM459,242h6v6h-6zM466,242h6v6h-6zM480,242h6v6h-6zM515,242h6v6h-6zM529,242h6v6h-6zM550,242h6v6h-6zM557,242h6v6h-6zM564,242h6v6h-6zM592,242h6v6h-6zM599,242h6v6h-6zM606,242h6v6h-6zM613,242h6v6h-6zM347,249h6v6h-6zM354,249h6v6h-6zM361,249h6v6h-6zM375,249h6v6h-6zM396,249h6v6h-6zM410,249h6v6h-6zM417,249h6v6h-6zM431,249h6v6h-6zM452,249h6v6h-6zM459,249h6v6h-6zM466,249h6v6h-6zM473,249h6v6h-6zM508,249h6v6h-6zM522,249h6v6h-6zM543,249h6v6h-6zM564,249h6v6h-6zM578,249h6v6h-6zM599,249h6v6h-6zM606,249h6v6h-6zM613,249h6v6h-6z"/>
<rect x="339" y="31" width="281" height="225" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="320" y="290" text-anchor="middle" font-size="12">filled square = cross (1), empty = dot (0): the first impulse of a toy key stream, each character against the next</text>
<figcaption>Figure 13.4. Tutte's rectangle, on a toy machine of my own. Written at the width of the first chi wheel the columns lean, some mostly empty and some mostly filled; at any other width the picture is noise.</figcaption>
</figure>

Once the first chi wheel was known, the same step was repeated at 31, 29, 26 and 23 for the other four impulses, and the chi wheels were stripped from the key. What remained was the psi contribution, and that showed the motor's irregular stepping. Over the next weeks Tutte and colleagues worked out the five psi wheels, 43 to 59 in length, and the two motor wheels, 61 and 37, and how they controlled each other. By January 1942 the logical structure of the whole machine was known: twelve wheels, their lengths, and the rules that moved them. It was done from one stolen key stream, by a man who had never seen a Lorenz machine. No German machine was in British hands until the end of the war. Of all the feats of the Park, it is the one the codebreakers themselves seem to have thought best.

!!! note "Life story: the Lorenz SZ40/42 (Tunny)"
    **Born:** the SZ40 about 1940, the SZ42 in 1942, by the firm of C. Lorenz, Berlin · **Purpose:** to encipher the teleprinter traffic of the German high command, by XOR with the key of twelve wheels (501 pins) · **Helped:** carried the orders between Hitler's headquarters and the army group commanders; first heard by the British in 1941 · **Status:** read from 1942 and routinely from 1944; no machine was in British hands until the end of the war; the *General Report on Tunny* describing the break was released in 2000

!!! note "Life story: John Tiltman"
    **Born:** 25 May 1894, London; died 10 August 1982 · **Purpose:** a British Army officer and self-taught codebreaker who broke Russian, Japanese and German ciphers from the 1920s · **Helped:** recovered both texts and four thousand characters of key from the Athens-Vienna depth of 30 August 1941; trained and led the Research Section in which Tutte worked · **Status:** after the war stayed in signals intelligence and later worked for the US National Security Agency, into the 1960s

!!! note "Life story: Bill Tutte"
    **Born:** 14 May 1917, Newmarket, Suffolk; died 2 May 2002, Kitchener, Ontario · **Purpose:** a Cambridge chemist-turned-mathematician who in 1941 was asked to find the structure of the key stream that Tiltman had recovered · **Helped:** worked out the Lorenz machine's wheels and motor (by January 1942), then devised the statistical method of 1942 that Colossus later ran · **Status:** after the war a mathematician in Canada, known for graph theory (the Tutte polynomial); the secrecy kept his Bletchley work from the world until the 1990s

## 13.10 The Testery, the Newmanry and the Wrens at the Colossus

*Level: intermediate.*

Knowing the machine is not the same as reading the traffic. The Germans changed the wheel pin patterns at intervals, and each message began from its own wheel start positions. In the first months, those positions were sent in the clear at the head of the message, as twelve letters that stood for them, and a depth, which carried the same twelve letters twice, was easy to spot. A section for reading Tunny was formed in July 1942 under Major Ralph Tester, and became known as the **Testery**. Its members were linguists and classicists and the occasional mathematician. The best known, from the accounts by Jerry Roberts (who published a memoir in 2017), include Roberts himself, Peter Ericsson, Denys Page, Shaun Wylie, Donald Michie and the future politician Roy Jenkins. In the Testery a hand method known as **Turingery**, which Turing had invented in the summer of 1942, was used to work out the wheel patterns when a depth came in. The Testery also had help from machines: the British built copies of the Lorenz that could decipher a message once the wheel settings were known, and the women who worked them, many of them from the ATS, put cipher in at one end and German out at the other. I am sure that women did much of this routine; I have not found a full list of the Testery's staff by name.

In October 1942 the Germans stopped sending the wheel starts as twelve letters in the clear and used a book of numbers instead. Depths became rarer. The hand methods depended on the operators' mistakes, and mistakes were now less frequent. Something else was needed: a way to find the start positions from a single message.

Tutte's answer, in late 1942, was a statistical method (the "double delta", taught in the Cryptanalysis book) that took the ciphertext, subtracted a guessed setting for the chi wheels, and counted. The right setting gave a slightly larger count of dots than a wrong one, enough to see among a few thousand characters. It was not hard mathematics. It was a great deal of counting. A message of ten thousand characters, with the first two chi wheels to try, needs 41 × 31 = 1,271 settings, each scored over the whole message. By hand that is far too slow to keep up with the traffic.

The man who built the section to run it was Max Newman, a Cambridge topologist, a fellow of St John's College and, as it happens, the man who had taught Turing the problem that led to "On Computable Numbers". Newman was brought to the Park in 1942, took charge of a new section at the end of that year, and the section was named for him, the **Newmanry**. It began in a hut with mathematicians and a staff of Wrens. Its first machine, built to Newman's specification from parts supplied by the Telecommunications Research Establishment and the Post Office, was working in June 1943. It was called *Heath Robinson*, after the cartoonist who drew absurd machines, and it deserved the name. It read two paper tapes at once, one holding the message and one holding the wheel pattern being tested, both as loops running through optical readers at about two thousand characters a second. The two had to stay exactly in step, and they did not. Tapes stretched, stuck and tore, and a slip of a single hole ruined a run. The Newmanry had a handful of Robinsons, named after department stores, *Peter Robinson*, *Robinson and Cleaver*, and later larger ones, and it ran them through 1943 and into 1944.

The people who kept them going were the Wrens. By the end of the war the Newmanry's staff numbered 272 Wrens and 27 men, as the figures are usually given (the Institute of Electrical and Electronics Engineers's milestone entry on Colossus is a source). The Wrens loaded the tapes, set the switches and plugs, watched the counters, wrote down the scores, and carried the results to the cryptanalysts who chose the next job. They worked in three shifts, in halls hot from valves, forbidden to talk about it. Two of them are known to us by name because of a photograph and many recorded recollections: Dorothy Du Boisson, who joined the WRNS in 1943 and was posted to the Newmanry, where she worked first on *Heath Robinson* and then on Colossus, and Elsie Booker, who stands with her at a Colossus in the best-known picture. Irene Dixon, another Wren of the Newmanry, died in 2021. Their testimony is the main evidence for what it was like to sit beside the machine. Like most of the staff, they were told nothing of what the machine was for.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The Tunny chain: intercepted Lorenz tape goes to the Newmanry where Colossus finds the chi wheel settings, then to the Testery where the remaining wheel settings are found and the message is decoded, then on to translation" fill="currentColor" font-size="14">
<rect x="10" y="20" width="130" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="75.0" y="42" text-anchor="middle" font-weight="bold">Intercept</text><text x="75.0" y="60" text-anchor="middle" font-size="12">teleprinter tape</text><text x="75.0" y="78" text-anchor="middle" font-size="12">from the radio link</text>
<rect x="175" y="20" width="150" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="250.0" y="42" text-anchor="middle" font-weight="bold">Newmanry</text><text x="250.0" y="60" text-anchor="middle" font-size="12">Wrens run Colossus:</text><text x="250.0" y="78" text-anchor="middle" font-size="12">count to find chi</text>
<rect x="360" y="20" width="130" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="425.0" y="42" text-anchor="middle" font-weight="bold">Testery</text><text x="425.0" y="60" text-anchor="middle" font-size="12">find psi and motor;</text><text x="425.0" y="78" text-anchor="middle" font-size="12">decipher by hand</text>
<rect x="520" y="20" width="110" height="70" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="575.0" y="42" text-anchor="middle" font-weight="bold">Translation</text><text x="575.0" y="60" text-anchor="middle" font-size="12">and reports</text><text x="575.0" y="78" text-anchor="middle" font-size="12">to Hut 3 chain</text>
<line x1="140" y1="55" x2="169.0" y2="55.0" stroke="currentColor" stroke-width="1.5"/><polygon points="175.0,55.0 167.6,58.1 167.6,51.9"/><line x1="325" y1="55" x2="354.0" y2="55.0" stroke="currentColor" stroke-width="1.5"/><polygon points="360.0,55.0 352.6,58.1 352.6,51.9"/><line x1="490" y1="55" x2="514.0" y2="55.0" stroke="currentColor" stroke-width="1.5"/><polygon points="520.0,55.0 512.6,58.1 512.6,51.9"/>
<rect x="10" y="150" width="300" height="76" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="160.0" y="172" text-anchor="middle" font-weight="bold">Before 1943: the Testery alone</text><text x="160.0" y="190" text-anchor="middle" font-size="12">Tiltman's depth, Tutte's wheels, Turing's methods;</text><text x="160.0" y="208" text-anchor="middle" font-size="12">only works when operators make mistakes</text>
<rect x="340" y="150" width="290" height="76" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="485.0" y="172" text-anchor="middle" font-weight="bold">After 1943: machines do the counting</text><text x="485.0" y="190" text-anchor="middle" font-size="12">Heath Robinson (1943), Colossus (1944):</text><text x="485.0" y="208" text-anchor="middle" font-size="12">a message tape alone is enough</text>
<text x="320" y="262" text-anchor="middle" font-size="13">Colossus found only part of the key. People and a copy of the Lorenz machine finished the job.</text>
</svg>
<figcaption>Figure 13.5. The Tunny chain as it stood in 1944. The division of labor is the usual account; the sections shared tasks as the work changed.</figcaption></figure>

Figure 13.5 shows the chain as it stood in 1944. The Newmanry's machines did not read the message. They found the setting of the chi wheels, the part of the key that could be found by counting, and passed the result to the Testery, where the remaining work, the psi wheels and the motor, was done by people and then the message was deciphered on a copy of the Lorenz. As the war went on, more and more of this was taken over by machines, but I will say again that division of labor is the usual account, and the sections shared jobs as the work changed.

## 13.11 Flowers and Colossus

*Level: intermediate.*

*Heath Robinson* worked, but it was slow, and the tape synchronization was a constant cause of lost runs. The way out was suggested by an engineer from the Post Office Research Station at Dollis Hill in north London, Thomas Harold Flowers. Tommy Flowers was born in 1905 in the East End of London, trained as an apprentice at the Royal Arsenal, Woolwich, and had joined the Post Office in 1930, where he spent his career on telephone exchanges. In the late 1930s he had worked on using vacuum tubes ("valves" in Britain) for switching, against the general view of engineers that valves were too unreliable to use in large numbers. His experience, built from an experimental exchange, was that most valve failures came when the valves were switched on and off, and that a set left running, with the filaments underrun a little, could last for months. Turing had put Flowers in touch with Newman in 1942 or 1943, and Flowers saw the real fault in the Robinson: it relied on a tape of the wheel patterns that had to be kept in step with the message tape. His idea was to produce the wheel patterns *electronically*, inside the machine, from valves wired to imitate the wheels. Then only the message tape need be read, and the synchronization problem would vanish.

He proposed a machine with about 1,500 valves. Many at the Park and at Dollis Hill doubted that so many valves could be made to work together; Flowers went ahead on the strength of his own conviction and, by his own later account, put some of his own money in. (The sums quoted for that vary.) His team included Sidney Broadhurst, William Chandler and Allen Coombs. They built *Colossus* in about ten months at Dollis Hill in 1943 and the winter of 1943 to 1944; it was tested there in December, moved to Bletchley in January 1944, and by 5 February 1944 it was working on real traffic. The numbers, as they are usually given: about 1,500 to 1,600 valves; a tape read by photoelectric cells at 5,000 characters a second, which, at the standard 10 holes to the inch of five-hole paper tape, means the tape rushed through at about 28 miles an hour; wheel patterns set by plugs and switches; counters that tallied dots; and an electric typewriter to print the counts.

The improved **Mark 2**, with about 2,400 valves, processed five characters at once, using shift registers, and so ran about five times as fast. The first went into service on 1 June 1944, five days before D-Day. By the end of the war there were ten. Colossus did not store a program in memory; it was set up for each job with switches and plugs, which is why the term "programmable" fits it only in that limited way. It was an electronic digital machine that counted fast and could be switched to perform different Boolean tests, and it was the first such machine in the world that did useful work every day.

What it did on 6 June is told in popular accounts as a decrypt that reached Eisenhower on the eve of D-Day and showed that Hitler was not moving his divisions. I have seen several versions of this story, and they disagree on which message and which day, so I give it as a story and not a fact. What the record supports is that Tunny decrypts in the weeks around the landings showed the Allies where German divisions stood and what Hitler and the High Command believed about where the main blow would fall, and that the Colossi had by then made that traffic routine to read, in hours.

!!! note "Life story: Tommy Flowers"
    **Born:** 22 December 1905, London; died 28 October 1998 · **Purpose:** a Post Office telephone engineer who believed a large machine could be built from thousands of valves and kept running · **Helped:** designed and built Colossus (Mark 1 in 1943 to 1944, Mark 2 in 1944) at Dollis Hill, with Broadhurst, Chandler and Coombs · **Status:** bound by the Official Secrets Act until the 1970s; after the war worked on electronic telephone exchanges and, with colleagues, on the Premium Bonds random-number machine ERNIE (1957)

!!! note "Life story: Colossus"
    **Born:** Mark 1 working at Bletchley Park by 5 February 1944; Mark 2 in service on 1 June 1944; built at the Post Office Research Station, Dollis Hill · **Purpose:** to count the matches that revealed the chi wheel settings of the Lorenz cipher · **Helped:** ten Colossi were running by April 1945; run by the Wrens of the Newmanry; the world's first large electronic digital machine in daily use · **Status:** most were broken up in 1945 and 1946; two went to GCHQ and were used until about 1960; a working rebuild, led by Tony Sale and finished in 2007, is at The National Museum of Computing at Bletchley Park

## 13.12 Silence, destruction and what Colossus left

*Level: intermediate.*

When the war ended, the order was to forget. In 1945 the Park's staff were reminded, again, of the Official Secrets Act. The Colossi, bombes and Robinsons were taken apart; the working papers were burned or locked away; and all but two Colossi, which went to GCHQ, were destroyed. The usual account, which comes from the engineers themselves, is that Flowers was told to burn the Colossus drawings and design notes and did so, and that the machines' parts were reused or scrapped. The usual explanation is that the methods were still secret and might be needed again. GC&CS was renamed GCHQ in 1946. The staff moved first to Eastcote in north London and in 1951 to 1954 to Cheltenham. At the Park the huts were taken over by the Post Office, a teacher-training college and the police. In 1991 a plan to knock the place down for housing was met with a campaign, the Bletchley Park Trust was founded in 1992 to save it, and in 1994 the Park opened to the public.

The silence worked on people as well as machines. A woman who had worked at a bombe, or the Colossus room, and gone home to marry, found that she had no way to say what she had done. Many told even their husbands nothing for thirty years. A man who had been a section head found that he could not describe his wartime work in an application for a job. After Winterbotham's book the rules were relaxed little by little, and in 1976 the first accounts of Colossus began to appear, among them a paper by Brian Randell of Newcastle University. But the Tunny work stayed under closer wraps for much longer; the Park's own technical history, the *General Report on Tunny*, was released to the UK National Archives only in 2000. Tommy Flowers could not mention Colossus in print until the 1970s. In 2009 the British government issued, for the first time, an official badge to the veterans.

Within that silence there is one case that shows its cost most plainly, and I give it a paragraph. On 31 March 1952 Alan Turing pleaded guilty to "gross indecency" under the law that then made sex between men a crime, after a burglary at his house in Wilmslow had led the police to learn of a relationship with a young man. He was given a choice between prison and a year of probation with a course of hormone injections, intended to reduce his desire, and took the second. He lost his security clearance and his consultancy with GCHQ, and the man who had broken the naval Enigma could no longer be trusted by the service that had used him. He died on 7 June 1954, aged 41, of cyanide poisoning; the inquest returned a verdict of suicide, which most of his biographers accept, though his mother and a later scholar, Jack Copeland, have argued that an accident cannot be excluded. In 2009 the prime minister, Gordon Brown, apologized for the way he was treated, and on 24 December 2013 he was given a royal pardon. In 2017 a law, informally called Turing's Law, pardoned some 49,000 men posthumously for convictions of the same kind and allowed living men to have theirs set aside.

The legacy for computing is real but needs care. Histories of computing long began with ENIAC, the machine built at the University of Pennsylvania by John Presper Eckert and John Mauchly and presented to the public in February 1946, with about 17,500 valves and a programming crew of six women (Kay McNulty, Betty Jennings, Betty Snyder, Marlyn Wescoff, Fran Bilas and Ruth Lichterman). That is because Colossus could not be mentioned. What the record shows is that ENIAC and Colossus were built independently, and as far as I know no American designer saw Colossus. Colossus was earlier, smaller in purpose and far more secret; ENIAC was more general, with decimal arithmetic and a plugboard of its own. Neither stored its program in memory. That step, the stored-program computer, was taken at Manchester in June 1948 by Frederic Williams and Tom Kilburn, in Newman's university department, and Turing's own plan for a stored-program machine (the ACE, 1945) came from his own mind and not from Colossus. The effect of Colossus on computing was through people: Newman, Turing, Good, Michie and Flowers carried what they had learned about electronic counting, tapes and fast logic into the machines that followed. Whether Colossus counts as "the first computer" depends on what the word means; that argument is the subject of §13.14.

## 13.13 The machines that held

*Level: intermediate.*

Not every machine fell, and the ones that held are as instructive as the ones that did not. Figure 13.6 sets the main wartime systems side by side.

<figure class="mars-fig">
<svg viewBox="0 0 640 260" width="640" role="img" aria-label="Table of wartime cipher machines and systems and whether they were broken" fill="currentColor" font-size="13">
<text x="10" y="22" font-weight="bold">system</text><text x="240" y="22" font-weight="bold">side</text><text x="330" y="22" font-weight="bold">what it was</text><text x="480" y="22" font-weight="bold">result</text>
<line x1="10" y1="30" x2="630" y2="30" stroke="currentColor" stroke-width="1.4"/>
<text x="10" y="54">Enigma (army, air force, navy)</text><text x="240" y="54">Germany</text><text x="330" y="54">3 to 4 rotors, plugboard</text><text x="480" y="54">read from 1940</text>
<line x1="10" y1="63" x2="630" y2="63" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="84">Lorenz SZ40/42 (Tunny)</text><text x="240" y="84">Germany</text><text x="330" y="84">12 wheels, XOR</text><text x="480" y="84">read from 1942, routine 1944</text>
<line x1="10" y1="93" x2="630" y2="93" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="114">Siemens T52 (Sturgeon)</text><text x="240" y="114">Germany</text><text x="330" y="114">teleprinter, wheels</text><text x="480" y="114">broken in Sweden 1940</text>
<line x1="10" y1="123" x2="630" y2="123" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="144">Naval Cypher No. 3</text><text x="240" y="144">Britain, USA</text><text x="330" y="144">code book, additive</text><text x="480" y="144">read by German B-Dienst 1942-43</text>
<line x1="10" y1="153" x2="630" y2="153" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="174">M-209</text><text x="240" y="174">USA</text><text x="330" y="174">pin wheels, field</text><text x="480" y="174">readable with enough traffic</text>
<line x1="10" y1="183" x2="630" y2="183" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="204">Typex</text><text x="240" y="204">Britain</text><text x="330" y="204">5 rotors, printing</text><text x="480" y="204">no known break</text>
<line x1="10" y1="213" x2="630" y2="213" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
<text x="10" y="234">SIGABA (ECM Mark II)</text><text x="240" y="234">USA</text><text x="330" y="234">15 rotors, irregular</text><text x="480" y="234">no known break</text>
<line x1="10" y1="243" x2="630" y2="243" stroke="currentColor" stroke-width="0.6" opacity="0.4"/>
</svg>
<figcaption>Figure 13.6. Machines and systems that fell, and the two rotor machines that, as far as anyone knows, did not. The dividing line was irregular stepping and good discipline, not a bigger key.</figcaption></figure>

**Typex** was the British answer to Enigma. The Air Ministry and the services worked on it in the early 1930s, and it was adopted in 1937. Its makers began from the commercial Enigma and changed what had made the German machine easy to attack: it had five rotors, of which two did not move, rotors with several turnover notches so that the stepping did not follow a clean odometer, and a printer that put the result on a gummed paper tape, so that a clerk did not copy letters by eye and miscopy them. The Park used Typex machines, fitted with Enigma rotors, to do the routine decoding of broken Enigma traffic, as described in §13.2. Some Typex machines are said to have fallen into German hands in 1940. I have seen no evidence in the German records that they ever read Typex traffic in quantity.

**SIGABA** (the Army and Navy called it ECM Mark II) was the American machine. William Friedman, who led the US Army's Signal Intelligence Service, filed a patent application for the basic design in 1935, and his colleague Frank Rowlett contributed the idea that made it unlike any other: fifteen rotors in three banks. Five of them, the cipher rotors, did the enciphering. Five more, the control rotors, decided by their own wiring which of the cipher rotors would step at each key press. A last five, the index rotors, were fed by the control rotors and fixed the final choice of which cipher rotors moved. The stepping of the cipher rotors was therefore irregular and key-dependent, and the neat odometer pattern that helped break Enigma was gone. About ten thousand were built, kept under guard, and used from 1941 into the 1950s. No Axis breaks are known, and later academic studies describe attacks that need known plaintext and a great deal of computing, which is not the same as a wartime break.

**The M-209**, a Hagelin pin-wheel machine the size of a lunch box and made by the thousand by the L. C. Smith and Corona typewriter company (about 140,000 were built), was the American field cipher. The Germans could break it with enough traffic, but its messages only had to stay secret for a few hours.

On the other side, two stories show that the Germans could break things too, and that a machine is not the only thing that can be weak. The Siemens T52 (*Geheimschreiber*, "secret writer"), a teleprinter cipher machine that Bletchley called Sturgeon, was used by the Germans over wires, including the cables through neutral Sweden. In the summer of 1940 a Swedish mathematician, Arne Beurling, from Uppsala, worked out its structure in a few weeks from the intercepted traffic, by the accounts I have seen with no machine in front of him, and Swedish signals intelligence read it for some time. And the German navy's codebreaking service, the B-Dienst, read the Admiralty's Naval Cypher No. 3, the code that the British and Americans used for convoy traffic, through most of 1942 and into 1943, until it was replaced in June 1943. It was not a machine at all but a code book with an additive table, and the weakness was in its use. A reader of [chapter 14](14-The-Rest-of-the-War.md) will find the same pattern with Japanese naval codes and Soviet one-time pads.

What made the difference? Not key length. Typex and SIGABA held because the stepping of their rotors was irregular and not predictable from the rotors' positions, because SIGABA, at least, had no reflector and so no rule that a letter never encrypts to itself, and because the services using them held to strict discipline about keys and the loss of machines. These are the same ingredients that this chapter has listed on the losing side, turned round.

**Can these be broken today?** Most of them, yes.

| System | Broken today? | The attack in plain words |
|---|---|---|
| Enigma | yes, by computer | With a crib, a modern bombe search runs in minutes. Without one, a program climbs: try rotor settings, then improve the plugboard a swap at a time while the text looks more like German. Beginning in 2006, volunteers' computers (Stefan Krah's M4 project) read several original 1942 naval messages that Bletchley never solved. |
| Lorenz (Tunny) | yes, by computer | Colossus counted how often bits agreed to find the wheel settings. In November 2007, in a challenge against the rebuilt Colossus, Joachim Schüth's laptop program found the wheel settings of a Lorenz message in 46 seconds; reports give Colossus about three hours. |
| M-209 | yes, by computer | Short pin-wheels repeat. Published programs (Lasry, Kopal and Wacker, 2016) recover the key from ciphertext alone. |
| Typex and SIGABA | not easily | Neither was broken in its day. Later academic studies describe attacks that need known plaintext and a great deal of computing. |
| Naval Cypher No. 3 | yes, with enough traffic | Messages that used the same stretch of the additive book line up; subtract them and the additive drops out, then rebuild the code meanings one group at a time from context. |

!!! note "Life story: Typex"
    **Born:** developed in the early 1930s; adopted by the RAF and the other British services in 1937 · **Purpose:** to give Britain a rotor machine without the Enigma's weaknesses, with printing output · **Helped:** carried British and Commonwealth secrets through the war and, adapted, did the Park's decoding of Enigma · **Status:** no known wartime break; replaced by other machines after the war

!!! note "Life story: SIGABA"
    **Born:** designed by William Friedman and Frank Rowlett from 1935; in service from 1941 · **Purpose:** an American rotor machine whose rotors stepped irregularly under the control of other rotors · **Helped:** high-level Army and Navy traffic, about ten thousand machines; none known to have been read by the Axis · **Status:** used into the 1950s; replaced by electronic systems

## 13.14 Going deeper

*Level: expert.*

### Banburismus as a sequential test

The arithmetic of §13.6 is a likelihood-ratio test. Let $H_1$ be "these two messages are lined up at this offset" and $H_0$ "they are not". For one pair of letters at the offset, a match has probability $p_1$ under $H_1$ (the chance that two letters of German text are equal, about $0.076$) and $p_0 = 1/26$ under $H_0$. The log of the likelihood ratio is added over the overlap, so that with $r$ matches in $n$ letters the weight of evidence is

$$W = 10\left[r\log_{10}\frac{p_1}{p_0} + (n-r)\log_{10}\frac{1-p_1}{1-p_0}\right]\ \text{decibans}.$$

Because the weights add, one can keep a running total and stop as soon as it passes a threshold, instead of fixing the number of letters in advance. That is the **sequential probability ratio test**, which Abraham Wald developed in the United States in 1943 (published in 1945) and which, by Good's account, Turing and his colleagues had been using in Hut 8 in 1940 and 1941; Good's essay "Turing's statistical work in World War II" (*Biometrika*, 1979) is the account. The real procedure was messier than the formula. The repeats had to be judged on the basis of the bigram tables of the naval indicator system, the overlap was shortened when the middle rotor turned over, and the aim was not a yes or no but a ranking of 336 rotor orders.

### The bias behind Tutte's rectangle

Let $q$ be the probability that the psi wheels step at a given character. If they do not step, $\Delta\psi' = 0$. If they step, $\Delta\psi'$ is the difference of two adjacent pins of a wheel, and for a wheel whose neighboring pins differ half the time it is $0$ with probability $1/2$. So

$$P(\Delta\psi' = 0) = (1-q) + \frac{q}{2} = 1 - \frac{q}{2},$$

which is $3/4$ at $q = 1/2$. The delta of the key on one impulse is $\Delta\chi \oplus \Delta\psi'$, so it equals $\Delta\chi$ three times in four. Written in rows as wide as the chi wheel's period, a column holds one chi bit, and the column's mean is $1/4$ or $3/4$, a lean of $1/4$ from one half. My toy machine leans less, $0.10$, for two reasons that I checked: its motor lets the psi wheels step 57 percent of the time, and its first psi wheel happens to change between neighboring pins 70 percent of the time, not 50, so the agreement is $1 - 0.57 \times 0.70 \approx 0.60$. The right width is still the only one at which the average lean rises above noise. With a message and not a key, the plaintext's own delta adds a further bias, since teleprinter text repeats characters (spaces, the shift codes) more than random text would; it is that extra tilt that Colossus's counters looked for at the right chi setting.

### How much did Ultra matter, and who decides?

Hinsley's remark, in a lecture of 1993, that Ultra shortened the war by two years, perhaps three or four, is the most quoted figure, and it is a statement of opinion by a man who had every reason to know. It cannot be tested. Ultra operated alongside radar, long-range aircraft, high-frequency direction finding, industrial output and the Soviet army, each of which has its own champions, and the question "what if Bletchley had failed" needs a history with other things changed. The sharpest sub-questions can be answered in part. In the Atlantic, the record of convoys routed round wolf packs when Hut 8 could read the signals, and of losses in the ten months when it could not, is evidence, though a messy one. In the Mediterranean, the supply war against Rommel is cleaner, because the convoys were few and the Italian traffic was read early, by Mavis Batey's section among others. Frederick Winterbotham's book and Ronald Lewin's *Ultra Goes to War* (1978) made the strongest claims, and later historians have been more careful. A sober summary: Ultra was a large multiplier of Allied capacity that did not alone decide any campaign.

The same care applies to credit. The bombe was Turing's logic, Welchman's diagonal board and Keen's engineering, with Polish methods behind it. The break of Lorenz was Tiltman's and Tutte's, and the machines that read it were Newman's and Flowers's, run by Wrens. A film or a book that sets one man at the center misdescribes the work, and so does a count that puts women at three quarters of the staff without saying what the three quarters did. The figure rests on the Bletchley Park Trust's figures, on Hinsley and Stripp's *Codebreakers* (1993) and on Michael Smith's histories. The Roll of Honour is the only list by name, and it is incomplete.

### Is Colossus the first computer?

It depends on the definition, and the definitions are the argument. If "computer" means an electronic digital machine that does useful calculation, Colossus (1944) is earlier than ENIAC (1945). If it means a machine that can be told what to do by a program held in its own memory, neither qualifies, and the first is the Manchester Baby of June 1948. If it means a general-purpose machine, ENIAC is nearer than Colossus, since Colossus was built for one kind of problem, though its Boolean function unit could be set up for others. Some authors have argued that Colossus, by clever use of its switches and plugs, could be shown to be capable of universal computation in principle; others reply that this proves little about a machine designed to count. I have seen no argument that a historian can settle with documents, since what is at issue is how to use the word.

### What is still open

Three questions are open. The first is what the Axis knew. The German inquiries of 1941 to 1943 are well documented on the naval side, and less so for the army and the air force. The second is what the Soviet Union learned. John Cairncross, a Soviet agent, worked in Hut 3 in 1942, and he passed Ultra-derived material to Moscow; how much Moscow knew of the Enigma break itself, and when, is argued. The third is the record itself. Much of the Park's paper was burned in 1945, the Colossus drawings with it, and the survivors who could speak without fear of the Official Secrets Act did so in their seventies and eighties. The oral histories now being collected are therefore the last source for the daily life of the bombe halls and the Colossus room, and they are where the women's side of this story will have to be written.

## Check yourself

??? question "1. Why were the Park's buildings numbered huts, and why did a Hut 6 clerk not know what Hut 8 did?"
    So that a building's name said nothing about its work, and so that anyone who was captured, indiscreet or overheard could give away only a small piece. The rule was need to know: a person was told what the job required and no more. It is also why the women who ran the bombes often did not know what the machines were for.

??? question "2. About how many people worked at the Park and outstations at the peak, and about what fraction were women? What does the fraction include and not include?"
    About 9,000 to 10,000, with roughly three quarters women (some 7,000 or more). The fraction counts all staff: clerks, typists, indexers, teleprinter and machine operators, Wren bombe operators, and Y-station staff, as well as the cryptanalysts. Among the people who solved ciphers the share of women was much lower, and the senior posts were mostly held by men. I have found no count by sex from a primary document.

??? question "3. A crib of 16 letters is dragged along a 250-letter message. About what fraction of wrong places survives the \"no letter is itself\" test? Roughly how many places are left?"
    $(25/26)^{16} \approx 0.53$, so about half the wrong places survive. The program of §13.8 gives about 125 places left out of 235 for a message of 250 letters (the true place is among them). The test narrows the search and does not end it, which is why the bombe still has work to do.

??? question "4. In the menu of Figure 13.3 the main piece has 12 letters and 14 links. How many loops does it have, and why do loops matter to a bombe?"
    $14 - 12 + 1 = 3$ loops. A loop brings the implications of a guess back to the letter where they started, so that a wrong guess contradicts itself and the current dies. A chain with no loop gives the machine almost nothing to test. Welchman's diagonal board made menus with few loops usable.

??? question "5. A Banburismus comparison finds 10 repeats in an overlap of 120 letters. Using the values of §13.6 (+2.97 db per repeat, -0.17 db per miss), what is the weight of evidence, and what are the odds?"
    $10 \times 2.97 + 110 \times (-0.17) \approx 29.7 - 19.0 \approx +10.6$ decibans, which is odds of about 11 to 1 that the two messages are lined up. (Turing's real tables used values built from naval traffic, so his figures differ.)

??? question "6. Why did the Atlantic go dark for U-boat signals from February to December 1942, and what ended it?"
    The U-boats' machine gained a fourth rotor on 1 February 1942 (the Triton, or Shark, system), so the settings and tricks Hut 8 had used no longer worked. On 30 October 1942 a boarding party from HMS Petard took the weather short-signal book from the sinking U-559, and Fasson and Grazier drowned doing it. The book supplied cribs, and Hut 8 broke Shark again on 13 December 1942.

??? question "7. Two Lorenz messages are sent with the same wheel settings. What is the first sign in the ciphertexts, and what does XORing them give? Why did the operator's abbreviation matter?"
    The two ciphertexts agree character for character as long as the plaintexts agree, because the key cancels. XORing them gives the XOR of the two plaintexts, with no key left. The abbreviation made the plaintexts differ and shift, and it is the shift that lets a guessed word placed in one message read as German in the other, so that the whole text can be rebuilt from guesses.

??? question "8. Tutte found a pattern at an interval of 574. Why did that suggest rows of 41, and which wheel was it?"
    $574 = 2 \times 7 \times 41$, so 41 is a factor of 574; rows of 41 put the repeating pattern of one wheel into columns. It was the first chi wheel, with 41 pins. The same step with 31, 29, 26 and 23 then found the other four chi wheels.

??? question "9. Colossus read its tape at 5,000 characters a second. At the standard 10 holes to the inch of five-hole tape, how fast did the paper travel? Why was that near the limit?"
    $5{,}000 \times 0.1 = 500$ inches a second, about 12.7 meters a second or 28 miles an hour. At that speed a loop of paper stretches, tears and slips, which is why the tape was the limit of the machine, and why Mark 2 gained speed by processing five characters at once rather than by running the tape faster.

??? question "10. Give two reasons why Typex and SIGABA are not known to have been broken in the war, and one reason \"the machine held\" is not the same as \"the machine was secure today\"."
    Their rotors stepped irregularly, so the odometer pattern that helped break Enigma was missing; and they were used under strict discipline, without the flood of traffic under one key that Enigma gave its attackers. Not being broken in the war means only that the enemy did not break them with the means of the time. Later academic studies describe attacks that need known plaintext and a great deal of computing, and a machine whose key space is small by modern standards can be searched by a computer.

## What you learned

- The Government Code and Cypher School moved to a country house in August 1939; by 1945 about 9,000 to 10,000 people worked at the Park and its outstations, roughly three quarters of them women, in huts known only by number and under a Foreign Office cover.
- Dilly Knox's team, with Mavis Lever (Batey) and Margaret Rock, broke the Italian naval Enigma (Matapan, March 1941) and the Abwehr Enigma (December 1941); Joan Clarke, Jane Fawcett, Ann Mitchell and thousands of others did the work of Hut 6 and Hut 8.
- Turing's bombe turned a guessed word, a crib, into a menu and a machine search; Welchman's diagonal board and Keen's engineering made it work; the Wrens at the bombe stations ran it.
- Banburismus scored evidence in decibans; the pinches of Krebs, München, U-110 and U-559 gave the codebooks; the four-rotor blackout lasted from February to December 1942.
- Ultra was kept secret by rules (SLUs, cover stories, the Official Secrets Act) until 1974; the Coventry story is a myth.
- Enigma lost because of the rule that no letter is itself, stereotyped messages, lazy operators, the network of one key for thousands of messages, and a belief that the attack would be a craft and not an industry.
- Tiltman's break of a depth (30 August 1941) and Tutte's reconstruction of the Lorenz machine from one key stream (January 1942) are the two great feats; the Testery and the Newmanry read Tunny, and Tommy Flowers's Colossus, run by 272 Wrens and 27 men, made it routine from 1944.
- After the war the machines were broken up, the drawings burned and the people silent; the secret came out from 1974, and Colossus was released in the 1970s and 2000. Turing was convicted in 1952, died in 1954 and was pardoned in 2013.
- Typex and SIGABA, which stepped their rotors irregularly, are not known to have been broken in the war; the German navy's B-Dienst read the Allies' Naval Cypher No. 3.

**Next:** [Chapter 14](14-The-Rest-of-the-War.md), the rest of the war: Japan's Purple and JN-25, the code talkers, and Venona.

## Further reading

- F. H. Hinsley and Alan Stripp (eds.), *Codebreakers: The Inside Story of Bletchley Park* (Oxford University Press, 1993): first-hand accounts by the people who worked there.
- F. H. Hinsley and others, *British Intelligence in the Second World War* (HMSO, 1979 to 1990); Hinsley, "The Influence of ULTRA in the Second World War" (lecture, 1993).
- Gordon Welchman, *The Hut Six Story* (McGraw-Hill, 1982); Alan Turing, *Treatise on the Enigma* ("Prof's Book", c. 1940; declassified, US National Archives); C. H. O'D. Alexander, *Cryptographic History of Work on the German Naval Enigma* (1945; released by the UK National Archives).
- Andrew Hodges, *Alan Turing: The Enigma* (Burnett Books, 1983); I. J. Good, "Studies in the History of Probability and Statistics XXXVII: A. M. Turing's statistical work in World War II", *Biometrika* 66 (1979).
- Michael Smith, *Station X: The Codebreakers of Bletchley Park* (Channel 4 Books, 1998) and *The Secrets of Station X* (Biteback, 2011); Tessa Dunlop, *The Bletchley Girls* (Hodder & Stoughton, 2015).
- Mavis Batey, *Dilly: The Man Who Broke Enigmas* (Biteback, 2009); Mavis Batey, *From Bletchley with Love* (Bletchley Park Trust, 2008).
- *General Report on Tunny, with Emphasis on Statistical Methods* (GC&CS, 1945; UK National Archives HW 25/4 and 25/5, released 2000); B. Jack Copeland (ed.), *Colossus: The Secrets of Bletchley Park's Codebreaking Computers* (Oxford University Press, 2006); W. T. Tutte, "Fish and I" (lecture, University of Waterloo, 1998).
- Jerry Roberts, *Lorenz: Breaking Hitler's Top Secret Code at Bletchley Park* (The History Press, 2017).
- David Kahn, *The Codebreakers* (rev. ed., Scribner, 1996) and *Seizing the Enigma* (Houghton Mifflin, 1991); Stephen Budiansky, *Battle of Wits* (Free Press, 2000).
- F. W. Winterbotham, *The Ultra Secret* (Weidenfeld & Nicolson, 1974); Ronald Lewin, *Ultra Goes to War* (Hutchinson, 1978); R. V. Jones, *Most Secret War* (Hamish Hamilton, 1978).
- IEEE Milestone, "The Colossus Computers, 1944-1945" (Engineering and Technology History Wiki), for the Wren and valve figures; The National Museum of Computing, Bletchley Park, for the rebuilt Colossus.
- Marian Rejewski, "How Polish Mathematicians Deciphered the Enigma", *Annals of the History of Computing* 3 (1981); the Polish background is the subject of [chapter 12](12-Rotors-and-Enigma.md).
- George Lasry, Nils Kopal and Arno Wacker, "Ciphertext-only cryptanalysis of Hagelin M-209 pins and lugs", *Cryptologia* 40 (2016).
