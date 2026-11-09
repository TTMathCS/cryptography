# 11. Radio, the First World War and the one-time pad

*Radio has no wire to tap: every message goes out in all directions, and every enemy with a receiver hears it. This chapter follows the people who had to live with that, from Marconi's patent of 1896 to the eve of the Second World War: Room 40 and the Zimmermann telegram, the French engineer who solved ADFGVX, the Choctaw telephone squads, Riverbank and the Friedmans, the one-time pad and the ways it was broken, Yardley's American Black Chamber, and Elizebeth Friedman, who read the rum-runners' radio and gave evidence in court. You will use ADFGVX, hide a message with Bacon's cipher and read two messages from one reused pad.*

!!! abstract "In this chapter"
    **You will learn:**

    - why radio made codebreaking a large organized business, and what Room 40, the Bureau du Chiffre and MI-8 did;
    - how the Zimmermann telegram was read and shown to the Americans without giving away how;
    - how ADFGVX worked and how Painvin broke it;
    - who the Choctaw telephone squads were, and why a language is not a cipher;
    - what Riverbank was, who the Friedmans and the Gallup sisters were, and why the Bacon-Shakespeare cipher claims could not be tested;
    - how the one-time pad came about, and the one rule (never reuse the key) behind every break of it;
    - what Yardley's American Black Chamber read and why it closed in 1929;
    - how Elizebeth Friedman and the Coast Guard's code unit read the rum-runners and gave evidence in court;
    - what William Friedman's index of coincidence was.

    **You need:** [Chapter 10](10-The-Telegraph.md) (codes, ciphers, Kasiski and Kerckhoffs, which this chapter does not retell) and [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) (the one-time pad and why it is perfect). The methods are taught in [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md) and [chapter 3](../cryptanalysis/03-Machines-and-the-War.md); here you meet them as the people who needed them.

    **Levels:** §11.1 to §11.3, §11.5, §11.6, §11.8 and §11.9 are for beginners, §11.4, §11.7 and §11.10 are intermediate, §11.11 is expert.

## 11.1 The problem: everyone in the air

*Level: beginner.*

A wire can be tapped only where someone can reach it. In 1914 the European powers had spent seventy years learning that lesson, and the first thing Britain did on 5 August, the day after it declared war, was to send the cable ship *Alert* to dredge up and cut Germany's undersea telegraph cables out of the North Sea (the number usually given is five). Germany was left with cables that passed through other countries' hands and with radio. Radio could not be cut. It could be listened to.

Guglielmo Marconi, a young Italian working in England, took out his first British patent for wireless telegraphy in 1896, and by the middle of the next decade every large navy had sets on its ships. The new thing about radio was not speed; the telegraph had been fast. It was that the sender could no longer choose who received. A fleet at sea could talk to its admiral only by radio, so every order went into the air for the other side to copy. So did the orders of an army corps ten miles from headquarters, with no wire laid and no time to lay one.

This turned a small trade into a large one. Until 1914 a government's cipher office was a handful of clerks. From 1914 the traffic ran to thousands of messages a day, and someone had to listen, sort, copy, break and read them, and decide whom to tell. The listening stations, the direction finders, the breaking offices and the staff officers who learned to use the result became permanent institutions, and the ones that survived the peace are the foundation of chapters 12 to 15.

The first lesson came in East Prussia. In August 1914 two Russian armies, Alexander Samsonov's Second and Paul von Rennenkampf's First, moved into German territory, and their radio traffic was careless: the units in the field lacked the right cipher books or the habit of using them, and many orders went out in plain language. The German Eighth Army (Hindenburg, Ludendorff, and Max Hoffmann as chief of operations) picked them up, knew where each corps would be, and between 26 and 30 August, at Tannenberg, surrounded most of the Second Army. The Germans claimed about 92,000 prisoners; Samsonov shot himself. The sources I know disagree on how much of the traffic was in clear and how much in a cipher too weak or too badly used, and on how much the intercepts mattered beside the railways and the Russian generals' quarrel. They agree on the lesson: an army that talks on the radio in the open tells the enemy what it will do.

Figure 11.1 sets the chapter's dates on one line. Read down it once now; each date has its own section.

<figure class="mars-fig">
<svg viewBox="0 0 640 328" width="640" role="img" aria-label="Timeline from Marconi's patent in 1896 to 1931, with the events of this chapter" fill="currentColor" font-size="14">
<line x1="82" y1="8" x2="82" y2="320" stroke="currentColor" stroke-width="1.6"/>
<text x="68" y="27" text-anchor="end" font-weight="bold">1896</text>
<circle cx="82" cy="22" r="3.5" fill="currentColor"/>
<text x="98" y="27">Marconi's first British patent for wireless</text>
<text x="68" y="53" text-anchor="end" font-weight="bold">1914</text>
<circle cx="82" cy="48" r="3.5" fill="currentColor"/>
<text x="98" y="53">Tannenberg; cables cut; Room 40 begins</text>
<text x="68" y="79" text-anchor="end" font-weight="bold">1917</text>
<circle cx="82" cy="74" r="4.5" class="acc-fill"/>
<text x="98" y="79" class="acc-fill">16 Jan: Zimmermann telegram; 6 Apr: US at war</text>
<text x="68" y="105" text-anchor="end" font-weight="bold">1918</text>
<circle cx="82" cy="100" r="4.5" class="acc-fill"/>
<text x="98" y="105" class="acc-fill">ADFGX (Mar); Painvin's "radiogram of victory" (2 Jun)</text>
<text x="68" y="131" text-anchor="end" font-weight="bold">1918</text>
<circle cx="82" cy="126" r="3.5" fill="currentColor"/>
<text x="98" y="131">Choctaw telephone squads (Oct); armistice (11 Nov)</text>
<text x="68" y="157" text-anchor="end" font-weight="bold">1919</text>
<circle cx="82" cy="152" r="3.5" fill="currentColor"/>
<text x="98" y="157">Vernam's patent granted; Yardley's Cipher Bureau</text>
<text x="68" y="183" text-anchor="end" font-weight="bold">1920</text>
<circle cx="82" cy="178" r="4.5" class="acc-fill"/>
<text x="98" y="183" class="acc-fill">Friedman finds the index of coincidence</text>
<text x="68" y="209" text-anchor="end" font-weight="bold">1921</text>
<circle cx="82" cy="204" r="4.5" class="acc-fill"/>
<text x="98" y="209" class="acc-fill">Washington Naval Conference: Japan's instructions read</text>
<text x="68" y="235" text-anchor="end" font-weight="bold">1925-33</text>
<circle cx="82" cy="230" r="4.5" class="acc-fill"/>
<text x="98" y="235" class="acc-fill">Elizebeth Friedman and the Coast Guard vs the rum-runners</text>
<text x="68" y="261" text-anchor="end" font-weight="bold">1929</text>
<circle cx="82" cy="256" r="4.5" class="acc-fill"/>
<text x="98" y="261" class="acc-fill">I'm Alone sunk (22 Mar); Black Chamber closed (Oct)</text>
<text x="68" y="287" text-anchor="end" font-weight="bold">1930</text>
<circle cx="82" cy="282" r="3.5" fill="currentColor"/>
<text x="98" y="287">Army Signal Intelligence Service founded</text>
<text x="68" y="313" text-anchor="end" font-weight="bold">1931</text>
<circle cx="82" cy="308" r="3.5" fill="currentColor"/>
<text x="98" y="313">Yardley publishes The American Black Chamber</text>
</svg>
<figcaption>Figure 11.1. Radio, the First World War and the interwar years. Accent marks the breaks and the discoveries; the plain dates are the institutions and inventions around them.</figcaption>
</figure>

The chapter follows the problems, not the dates. First the war: what a state does when everything it says can be heard (§11.2 to §11.5). Then the estate where American codebreaking began (§11.6), the cipher that cannot be broken (§11.7), the interwar black chamber (§11.8), the woman who read the rum-runners (§11.9), and Friedman's mathematics (§11.10).

## 11.2 Room 40

*Level: beginner.*

On the first day of the war the Royal Navy had a cipher office of a kind. It had no one who could read what the German fleet was sending. Sir Alfred Ewing, a Scottish engineer who was Director of Naval Education, offered to start a group, and in the first weeks of August 1914 he gathered mathematicians, linguists, classicists and schoolmasters from his own naval colleges and from the universities. The Admiralty put them in an office in its Old Building, Room 40, and the name stuck to the whole organization long after it had moved to larger rooms. Ewing ran it until 1917. Its military head from the autumn of 1914 was Captain William Reginald "Blinker" Hall, who became Director of Naval Intelligence in October, and who knew what intelligence was for.

The first luck was a book. Three German naval books fell into Allied hands in the first months of the war; the stories differ a little from book to book, so I give the usual accounts. The *Signalbuch der Kaiserlichen Marine* (SKM) came from the light cruiser *Magdeburg*, which ran aground in the Gulf of Finland on 26 August 1914; the Russians passed a copy to London in October. The *Handelsverkehrsbuch* (HVB), used by the navy and merchant ships, was taken from the steamer *Hobart*, stopped off Melbourne in August. The *Verkehrsbuch* (VB) was hauled up by a British trawler in the autumn, in a lead-weighted chest thrown from a sunk German destroyer. With them Room 40 could read much of the fleet's traffic, though not at once: a code book has to be turned into sentences, and the Germans added a changing table that scrambled the code groups.

What turned the books into readable signals was a collection of small skills. The staff included a medievalist, a student of German philosophy, an expert on Greek papyri, a publisher and a clergyman. Alastair Denniston, who taught German and later led the interwar Government Code and Cypher School, was there from the start; so was Dillwyn "Dilly" Knox, a Cambridge classicist who reappears in chapters 12 and 13; and Nigel de Grey, a publisher, and the Reverend William Montgomery, a translator of theology, will return with the Zimmermann telegram. Women worked in Room 40 as clerks, typists and indexers, and by the end of the war some did analytic work. The staff lists name few of them. One whose name survives is Olive Roddam, who worked there and married Knox in 1920 (from the biographies of Knox). That the women of the First World War offices are so little known is part of the record, and Bletchley Park (chapter 13), where about three-quarters of the staff were women, shows the same pattern.

The second source of power was geography. A transmitter can be located if two or three receiving stations take its bearing at once. From early 1915 the British built a chain of direction-finding stations along the coast, and with bearings and call signs Room 40 could say where each German ship was even when it could not read the message. A rise in signals from the shore stations at Wilhelmshaven meant the fleet was about to sail. So the Admiralty knew in time of the sorties that led to Dogger Bank (January 1915) and Jutland (31 May 1916).

Jutland also shows the limit. Asked on 31 May where the German commander's call sign was, Room 40 answered, truthfully, that it was in Wilhelmshaven. By the usual account (Beesly) the call sign belonged to the shore station and the admiral had switched to another when he put to sea; the Admiralty passed on that the High Seas Fleet was still in harbor, and Jellicoe was told so. Room 40 had answered the question it was asked. Nobody had asked the one that mattered.

!!! note "Life story: Room 40"
    **Born:** August 1914, the Admiralty Old Building, London (Sir Alfred Ewing; run by Captain W. R. Hall from the autumn) · **Purpose:** read the German navy's and the German foreign ministry's wireless and cable traffic · **Helped:** Dogger Bank (1915), the Zimmermann telegram (1917), the later formation of the Government Code and Cypher School (1919) · **Retired:** merged in 1919 with the army's codebreaking office (MI1(b)) to form the Government Code and Cypher School; the name Room 40 stayed as a legend

The Admiralty kept the work secret for about sixty years. Its files came out in stages in the 1970s and 1980s, and Patrick Beesly's *Room 40* (1982) was one of the first full accounts. Captain Hall did not publish one of his own.

## 11.3 The Zimmermann telegram

*Level: beginner.*

By the end of 1916 the German government had made up its mind. The army's leaders, Hindenburg and Ludendorff, wanted to win the war before the Allies' blockade starved Germany, and the navy's answer was to sink every ship that approached Britain, neutral or not, from 1 February 1917. The Foreign Secretary, Arthur Zimmermann, who had held the post only since November 1916, knew what this might mean. The sinking of the *Lusitania* in 1915 had already brought the United States near to war, and in May 1916 Germany had promised Wilson to restrict its submarines. If the new campaign brought in the United States, Germany needed to keep it busy. Zimmermann thought of Mexico.

On 16 January 1917 he sent a telegram to the German minister in Mexico City, Heinrich von Eckardt, by way of the embassy in Washington, where Ambassador Johann von Bernstorff was to pass it on. The English translation that Room 40 produced, as it is usually printed, runs:

> We intend to begin on the first of February unrestricted submarine warfare. We shall endeavor in spite of this to keep the United States of America neutral. In the event of this not succeeding, we make Mexico a proposal of alliance on the following basis: make war together, make peace together, generous financial support and an understanding on our part that Mexico is to reconquer the lost territory in Texas, New Mexico, and Arizona. The settlement in detail is left to you.

The message went on to tell Eckardt to inform the Mexican president, Venustiano Carranza, in strict secrecy as soon as war with the United States was certain, and to invite Mexico to ask Japan to join. It ended by saying that the use of submarines might force England to make peace within a few months.

The telegram went by more than one road, which is why the British got it. Germany had no cable to America, because of what Britain had done in 1914. Wilson had let the German embassy send some messages over the State Department's own cable, which ran through Copenhagen and London, for the peace talks he was trying to start. The foreign ministry also used the Swedish diplomatic route and radio. The American cable ran through British hands, Room 40 copied everything that passed, and the German diplomatic messages on it were in the code the British knew as 0075.

That code was a codebook of several thousand groups, each a four-digit number for a word or phrase, used with a changing table. Room 40 had been working on it for months. On 17 January, within a day of the message's passing, Nigel de Grey and William Montgomery read the opening of the text, with gaps, and saw that it concerned an alliance and Mexico. Much of the code book was known to them; some groups were not. De Grey took what they had to Hall, who understood at once what it was and what to do with it, which was nothing, for the moment.

Hall's problem was that the telegram could not be used. Handing it to the Americans would tell Germany that code 0075 was broken and tell the Americans that Britain read their cables. He needed a second route to the same text. In Washington, Bernstorff had to send the message on to Eckardt, and since Germany's own cable to Mexico was cut he used the commercial telegraph and an older code, 13040, which Room 40 had largely reconstructed. A British agent in Mexico City, known only as "Mr H", obtained the copy as it reached the Mexican telegraph office. Britain could now say that the text had been stolen in Mexico, with no hint that the original had been read in London.

Figure 11.2 shows the routes. Do not read it as a map of places. It shows who held a copy of what.

<figure class="mars-fig">
<svg viewBox="0 0 640 330" width="640" role="img" aria-label="The Zimmermann telegram's routes from Berlin to Washington and Mexico City, and where London intercepted it" fill="currentColor" font-size="14">
<rect x="20" y="20" width="130" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="45" text-anchor="middle">Berlin</text>
<rect x="255" y="20" width="130" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="45" text-anchor="middle">Washington</text>
<rect x="490" y="20" width="130" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="45" text-anchor="middle">Mexico City</text>
<line x1="150" y1="40" x2="255" y2="40" stroke="currentColor" stroke-width="1.4"/>
<polygon points="255,40 247,36 247,44" fill="currentColor"/>
<line x1="385" y1="40" x2="490" y2="40" stroke="currentColor" stroke-width="1.4"/>
<polygon points="490,40 482,36 482,44" fill="currentColor"/>
<text x="202" y="32" text-anchor="middle" font-size="12">code 0075</text>
<text x="438" y="32" text-anchor="middle" font-size="12">code 13040</text>
<text x="202" y="78" text-anchor="middle" font-size="12">16 Jan 1917</text>
<text x="438" y="78" text-anchor="middle" font-size="12">about 19 Jan</text>
<rect x="20" y="130" width="130" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="155" text-anchor="middle">Copenhagen</text>
<rect x="255" y="130" width="130" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="320" y="155" text-anchor="middle">London, cable office</text>
<line x1="85" y1="60" x2="85" y2="130" stroke="currentColor" stroke-width="1.2"/>
<line x1="150" y1="150" x2="255" y2="150" stroke="currentColor" stroke-width="1.2"/>
<line x1="320" y1="130" x2="320" y2="60" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="95" y="102" font-size="12">US State Dept cable</text>
<rect x="255" y="230" width="130" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="320" y="252" text-anchor="middle" font-weight="bold">Room 40</text>
<text x="320" y="270" text-anchor="middle" font-size="12">copies, reads 0075</text>
<line x1="320" y1="170" x2="320" y2="230" stroke="currentColor" stroke-width="1.4"/>
<polygon points="320,230 316,222 324,222" fill="currentColor"/>
<rect x="490" y="230" width="130" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="555" y="252" text-anchor="middle">"Mr H"</text>
<text x="555" y="270" text-anchor="middle" font-size="12">copy of the 13040 text</text>
<line x1="555" y1="60" x2="555" y2="230" stroke="currentColor" stroke-width="1.2" stroke-dasharray="5 4"/>
<line x1="490" y1="255" x2="385" y2="255" stroke="currentColor" stroke-width="1.4"/>
<polygon points="385,255 393,251 393,259" fill="currentColor"/>
<text x="438" y="247" text-anchor="middle" font-size="12">to London</text>
<text x="20" y="215" font-size="12">Dashed lines: copies taken by the British. Solid: the German routes.</text>
</svg>
<figcaption>Figure 11.2. Who held a copy of the Zimmermann telegram. Britain read the Berlin-to-Washington text from the cable that passed through London, and obtained the Washington-to-Mexico text, in an older code, from Mexico City. Only the second could be shown to the Americans.</figcaption>
</figure>

Once Hall had the second copy he waited, and the German decision made the moment. On 1 February Germany began unrestricted submarine warfare, and on 3 February Wilson broke off relations. On 19 February Hall took the decoded text to the Foreign Office, and on 23 February the Foreign Secretary, Arthur Balfour, gave it to the American ambassador, Walter Hines Page, with the account of the Mexico City copy. It reached Wilson the next day and was released to the Associated Press, which published it on 1 March 1917.

Many Americans did not believe it, and peace newspapers, German-Americans and pacifists called it a British forgery. Then on 3 March Zimmermann said at a press conference in Berlin that it was true, and on 29 March he said so again in the Reichstag. By the usual reading he did not suppose it had been read in London and thought it had leaked in Washington or Mexico, and he thought the truth defensible. The words "Texas, New Mexico, and Arizona" did the rest. On 2 April Wilson asked Congress for war, and Congress voted it on 6 April 1917.

What the telegram changed is still argued. The main cause of the American entry was the submarine campaign, which was already sinking American ships, and war would very likely have come within weeks or months without it. The telegram shifted opinion in the West and Southwest and gave Wilson's government a charge to put before the public. Barbara Tuchman's *The Zimmermann Telegram* (1958) told it as a hinge of history, and Kahn judged that no other single decrypt had such consequences. Thomas Boghardt (2012) is more careful: Hall's secrecy and timing were skilled but also lucky, Mexico never took the offer seriously (its military told Carranza it was impossible, and it declined in April), and the telegram's effect on the vote is easier to assert than to measure.

!!! note "Life story: the Zimmermann telegram"
    **Born:** 16 January 1917, Berlin (German Foreign Office, Arthur Zimmermann), enciphered in code 0075 · **Purpose:** to offer Mexico an alliance against the United States if the United States entered the war over unrestricted submarine warfare · **Helped:** the British Admiralty (Room 40, Captain Hall, Nigel de Grey and William Montgomery) to show the United States that Germany was a danger to it; published 1 March 1917, confirmed by Zimmermann 3 March · **Status:** the standard example of an intercept used without giving away the source; Boghardt (2012) is the best current study

### In the real world

What the sources show: the telegram's text in the German archives and in Room 40's translations, Hall's and de Grey's later accounts, and the American diplomatic papers. What they do not show: the "Mr H" route in detail (the agent's name and how he got the copy have been argued for a century), or how much of Hall's wait was cleverness and how much ordinary delay. The numbers 0075 and 13040 are from Room 40's files, and the days come from Kahn, Tuchman and Boghardt, who agree.

## 11.4 ADFGVX, and the man who broke it in a week

*Level: intermediate.*

In March 1918 Germany had one last chance. Russia had signed the treaty of Brest-Litovsk on 3 March, and the German army moved about fifty divisions west for an offensive to end the war before American troops arrived in strength. It would move fast, with its field telephones left behind, and it needed a field cipher every radio operator could use with a pencil, one the French and British could not read in the days that mattered. The signals service chose a hand cipher designed by an officer named Fritz Nebel. It appeared on or about 5 March 1918 (some sources say the 1st), using only the letters A, D, F, G and X, and in June a sixth, V. They were chosen because they sound different in Morse: A is dot-dash, D dash-dot-dot, F dot-dot-dash-dot, G dash-dash-dot, V dot-dot-dot-dash, X dash-dot-dot-dash.

### How ADFGVX works

The cipher does two things to the message, one after the other, and each hides what the other leaves visible.

**Step 1: a square turns each character into two letters.** The sender and receiver share a $6 \times 6$ square holding the 26 letters and the 10 digits in an order they have agreed on (the key to the first step). The rows and the columns are labeled A, D, F, G, V, X. Each plaintext character is replaced by the label of its row followed by the label of its column. This is Polybius's square (chapter 3), with one change: the row and the column come out as letters instead of digits. Figure 11.3 shows a square.

**Step 2: a keyed transposition shuffles the letters.** Write the letters in rows under a keyword, one per column, and number the columns by the alphabetical order of the keyword's letters. Read the columns off in that order. The letters are the same, but the two that came from one character now sit in different columns.

Take the message ATTACK with the square of Figure 11.3 and the keyword PRIVACY. In the square, A is in row A, column D, so it becomes AD; T is in row D, column D (DD); C is AG; K is VG. The twelve letters are

$$\texttt{AD DD DD AD AG VG} \;\to\; \texttt{ADDDDDADAGVG}.$$

Write them in rows of seven under PRIVACY. The keyword's letters in alphabetical order are A, C, I, P, R, V, Y, so the columns are numbered 4, 5, 3, 6, 1, 2, 7 from left to right. The first row is ADDDDDA, the second DAGVG, and the last two cells are empty:

$$
\begin{array}{ccccccc}
\text{P} & \text{R} & \text{I} & \text{V} & \text{A} & \text{C} & \text{Y}\\
4 & 5 & 3 & 6 & 1 & 2 & 7\\ \hline
\text{A} & \text{D} & \text{D} & \text{D} & \text{D} & \text{D} & \text{A}\\
\text{D} & \text{A} & \text{G} & \text{V} & \text{G} & & \\
\end{array}
$$

Read column 1 first (under A: D, G), then 2 (under C: D), 3 (I: D, G), 4 (P: A, D), 5 (R: D, A), 6 (V: D, V) and 7 (Y: A). The ciphertext is DG D DG AD DA DV A. The receiver knows the keyword and the message length, so he knows each column's length, refills the columns and reads the rows.

<figure class="mars-fig">
<svg viewBox="0 0 640 300" width="640" role="img" aria-label="The ADFGVX square with row and column labels, and the column transposition under the keyword PRIVACY" fill="currentColor" font-size="14">
<text x="20" y="22" font-size="13" font-weight="bold">Step 1: the square</text>
<text x="76 110 144 178 212 246" y="48" text-anchor="middle" font-size="13">ADFGVX</text>
<text x="42 42 42 42 42 42" y="78 112 146 180 214 248" text-anchor="middle" font-size="13">ADFGVX</text>
<rect x="59" y="56" width="204" height="204" fill="none" stroke="currentColor" stroke-width="1.4"/>
<path d="M93 56V260M127 56V260M161 56V260M195 56V260M229 56V260M59 90H263M59 124H263M59 158H263M59 192H263M59 226H263" stroke="currentColor" stroke-width="0.6" fill="none"/>
<g font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">
<text x="76 110 144 178 212 246" y="78">NA1C3H</text>
<text x="76 110 144 178 212 246" y="112">8TB2OM</text>
<text x="76 110 144 178 212 246" y="146">E5WRPD</text>
<text x="76 110 144 178 212 246" y="180">4F6G7I</text>
<text x="76 110 144 178 212 246" y="214">9J0KLQ</text>
<text x="76 110 144 178 212 246" y="248">SUVXYZ</text>
</g>
<text x="300" y="22" font-size="13" font-weight="bold">Step 2: the transposition (message ATTACK, key PRIVACY)</text>
<text x="300" y="52" font-size="12">pairs: AD DD DD AD AG VG</text>
<g font-size="14" text-anchor="middle" style="font-family:var(--md-code-font-family,monospace)">
<text x="322 362 402 442 482 522 562" y="88">PRIVACY</text>
<text x="322 362 402 442 482 522 562" y="112" font-size="12">4536127</text>
<text x="322 362 402 442 482 522 562" y="144">ADDDDDA</text>
<text x="322 362 402 442 482 522 562" y="172">DAGVG</text>
</g>
<line x1="300" y1="120" x2="585" y2="120" stroke="currentColor" stroke-width="0.8"/>
<text x="300" y="212" font-size="12">read column 1, 2, 3 ... 7 down:</text>
<text x="300" y="236" font-size="14" style="font-family:var(--md-code-font-family,monospace)">DG  D  DG  AD  DA  DV  A</text>
<text x="300" y="262" font-size="12">Letters that came from one character now sit far apart.</text>
</svg>
<figcaption>Figure 11.3. The two steps of ADFGVX. The square makes each character two letters (fractionation); the keyed transposition then separates the two halves.</figcaption>
</figure>

Here is the same cipher as a program. It encrypts, decrypts, and checks that the square has 36 different characters.

```python
# ADFGVX: a 6x6 square turns each character into two letters, then a keyed
# column transposition shuffles those letters.
SQUARE = "NA1C3H8TB2OME5WRPD4F6G7I9J0KLQSUVXYZ"
HEAD = "ADFGVX"

def column_order(key):
    # columns are read out in the alphabetical order of the key letters
    return sorted(range(len(key)), key=lambda i: key[i])

def encipher(plain, key):
    pairs = "".join(HEAD[SQUARE.index(c) // 6] + HEAD[SQUARE.index(c) % 6] for c in plain)
    cols = {i: pairs[i::len(key)] for i in range(len(key))}
    return " ".join(cols[i] for i in column_order(key))

def decipher(cipher, key):
    parts = cipher.split()
    n, order = len(key), column_order(key)
    total = sum(len(p) for p in parts)
    cols = {i: parts[k] for k, i in enumerate(order)}
    pairs = "".join(cols[i % n][i // n] for i in range(total))
    return "".join(SQUARE[HEAD.index(pairs[j]) * 6 + HEAD.index(pairs[j + 1])]
                   for j in range(0, total, 2))

message = "ATTACKCOMPIEGNE9JUNE"
secret = encipher(message, "PRIVACY")
print(secret)
print(decipher(secret, "PRIVACY"))
print(len(set(SQUARE)), len(SQUARE))
```

Output:

```
DGFGVA DAVAD DGDAVA ADDXFD DAVFAA DVXGAF AGGAX
ATTACKCOMPIEGNE9JUNE
36 36
```

**Try it.** With the same square and the keyword KEY, the groups `AGX AXAD GGD` hide a five-letter word. The ten letters sit in columns of 4, 3 and 3. Work out which group is which column from the alphabetical order of K, E, Y, put them back and read the pairs (answer in Check yourself 3).

### Why it was hard to break

Two old weaknesses are removed. A simple substitution fails because letter frequencies show through; here the unit substituted is a pair, so a count sees six letters, roughly equally common, and 36 pair values. A simple transposition fails because the letters are still the letters; here they are halves of letters. A solver cannot take one step at a time, because each layer hides the other. The key space is large too: the square is one of $36! \approx 3.7 \times 10^{41}$ arrangements, about $2^{138}$, and a seven-letter transposition key multiplies that by $7! = 5040$. No one tries those. The cipher falls to structure, as every cipher in this book has fallen, not to counting keys.

### Georges Painvin

The man who found the structure was Georges Painvin, born in 1886, a professor of paleontology at the École des Mines in Paris. He had no training in cryptography when the war began; he was brought into the army's cipher bureau, the Bureau du Chiffre, early in the war, at the request, by the usual account, of the officers who ran it, and he made his name first on a German double-transposition cipher, the *Übchi*, in 1916 or 1917 (the date is given differently in different tellings). When the new cipher appeared in March 1918 it was Painvin who was given it.

What he did is known from his own later account and from Kahn, and the details are thin. The Germans changed the transposition key every day at midnight, but sent so much traffic that Painvin had many messages in each key. Messages of the same length fill the same columns, so he could line them up; messages that began alike (a salutation, a unit number) gave him the start of a column pattern; and once enough of the transposition was recovered, what remained was a substitution of pairs, which fell to frequency analysis because the 36 pairs are used as unequally as the letters of German. In early April he solved the five-letter ADFGX, and for some weeks the Allies read it. When the sixth letter arrived around 1 June, the grid grew from 25 to 36 cells and his workload rose sharply.

On 2 June 1918 he solved a message ordering ammunition to be hurried forward to a point near Compiègne, and to be moved by night (the sources give different wordings, and I have not seen a text I trust). The French called it the *radiogramme de la victoire*. It told them where the next German attack would fall, in the sector between Montdidier and Noyon, and they prepared the ground. The attack that began on the night of 8 to 9 June, the Gneisenau offensive or battle of the Matz, advanced a few miles and was halted within days. How much one message did, beside the French general sense of where the Germans must strike, is argued. Painvin was worn out: by his own account he lost about 15 kilograms. He returned to industry, spoke little of the work, and lived until 1980.

!!! note "Life story: ADFGVX"
    **Born:** early March 1918 (ADFGX) and 1 June 1918 (ADFGVX), the German army's signal service, designed by Fritz Nebel · **Purpose:** a hand cipher for the field that could be sent by Morse without mistakes and that the French could not read in days · **Helped:** the German offensives of spring and summer 1918, for a few weeks · **Retired:** broken by Georges Painvin in April and June 1918; dropped by the Germans at the end of the war · **Replaced by:** the double transposition and other hand ciphers, then Enigma

!!! note "Life story: Georges Painvin"
    **Born:** 1886, Paris; died 1980 · **Purpose:** a paleontologist who became a cryptanalyst of the French army's Bureau du Chiffre (1914-1918) · **Helped:** broke the German ADFGX and ADFGVX ciphers in 1918, and with the "radiogram of victory" of 2 June helped the French meet the German attack on Compiègne · **Status:** later an industrialist; honored by the French state after the war and widely, but late, by historians

## 11.5 The Choctaw telephone squads

*Level: beginner.*

The telephone was the other half of the problem. Armies laid thousands of miles of field wire, shells cut it, and the Germans tapped it. In the Meuse-Argonne offensive of October 1918, where the American 36th Division (National Guardsmen from Texas and Oklahoma) was fighting, the Germans seemed to know where American attacks were coming and where the runners were going. Messages sent by runner were captured, and messages sent by telephone were tapped.

In the 142nd Infantry Regiment, which had many men from Oklahoma, some soldiers were Choctaw. By the usual account an officer, Captain Lawrence, overheard two of them talking in Choctaw on a field phone (Solomon Louis and Mitchell Bobb in some tellings) and saw that no German was likely to know the language. He put Choctaw speakers at the telephones, and the first Choctaw messages went out between 26 and 28 October 1918. About twenty men served, fourteen of them named in the usual lists. Colonel A. W. Bloor wrote in 1919 that it had been a success, and some accounts say German artillery stopped hitting the American positions within a day or two. That comes from the American side; the German records have not been matched to it.

There was a problem a cipher does not have: the language had no words for the things being talked about. There is no Choctaw word for a machine gun or a battalion. The soldiers had to make them up, with phrases like "little gun shoot fast" for a machine gun, "big gun" for artillery, and a count in "grains of corn" for the battalions, as the usual accounts tell it (the exact words vary by source). The code was not in the language. It was in the improvised vocabulary on top of it.

It was a language, not a cipher, and the difference matters. A cipher can be taught to anyone in an hour, and kept secret by a key. A language cannot be taught in a day and has no key, so everything depends on the enemy's not knowing it. As long as no German could speak Choctaw the messages were safe, and the moment one could, they would be an open book, with no way to change the key. The code talkers' history is a series of cases of this, and the Second World War brought it back with the Navajo and others (chapter 14).

The Choctaw were not the only ones. William Meadows, in *The First Code Talkers* (2021), found men from a dozen or more Native nations, among them Cherokee, Osage, Comanche and Sioux, doing similar work in 1918; the count is still growing. They were not citizens: Congress did not grant citizenship to all Native Americans until 1924. Many had been punished as children in boarding schools for speaking their languages, the languages the army now needed. Recognition came late: the French government honored the Choctaw code talkers in 1989, and Congress passed the Code Talkers Recognition Act in 2008 (medals followed in 2013).

!!! note "Life story: the Choctaw telephone squads"
    **Born:** 26-28 October 1918, the 142nd Infantry, 36th Division, American Expeditionary Forces (Captain Lawrence's idea; about twenty Choctaw soldiers) · **Purpose:** to send field telephone messages in a language the Germans could not understand · **Helped:** the 36th Division in the last weeks of the Meuse-Argonne offensive, by the American officers' accounts · **Retired:** at the Armistice, 11 November 1918 · **Replaced by:** the Second World War code talkers (Navajo, Comanche and others)

## 11.6 Riverbank, the Friedmans and the Bacon-Shakespeare ciphers

*Level: beginner.*

### The colonel

George Fabyan was born in 1867 into the family that owned the Bliss Fabyan textile company of Boston, ran its Chicago office, made a great deal of money and, in 1905, settled on a large estate on the Fox River at Geneva, Illinois, which he called Riverbank. The house had been remodeled by the young Frank Lloyd Wright; the grounds held a Japanese garden, a Roman-style pool, a lighthouse and a Dutch windmill. He was "Colonel" Fabyan by a governor's courtesy, and he liked to pay for experiments. One laboratory, begun about 1918 under the physicist Paul Sabine, became Riverbank Acoustical Laboratories and tested building materials for sound for the rest of the century. Another was a laboratory of genetics. A third was a cipher department.

### The sisters who found Bacon in Shakespeare

The cipher department was there because of a belief. From the 1850s some people said that William Shakespeare of Stratford could not have written the plays, and many named Francis Bacon, the philosopher and Lord Chancellor. Some looked for proof in the text, as a cipher. Bacon had in fact described one in *De Augmentis Scientiarum* (1623), the **biliteral cipher**: each letter of the secret message becomes a group of five marks, each of two kinds, a and b, so 24 letters use 24 of the 32 possible groups. It is in effect a five-bit binary code, three centuries early; Bacon wrote that he devised it in his youth, in Paris. His example hides the message in two typefaces of a cover text, which can say anything. It works if the sender controls the typefaces and the receiver can tell them apart.

The program below uses capitals and lowercase in place of two typefaces: first FLEE hidden in a cover sentence and read back, then the reader's side of the problem. Take any 25 letters of any text and let the reader decide which count as b; any five-letter word can be found.

```python
# Bacon's biliteral cipher: each letter becomes five a/b marks. Here a "b" is a
# capital letter in an innocent cover text (Bacon used two typefaces).
ALPHA = "ABCDEFGHIKLMNOPQRSTUWXYZ"          # 24 letters: I=J, U=V

def marks_for(word):
    return "".join(format(ALPHA.index(c), "05b") for c in word)   # 0 is a, 1 is b

def hide(secret, cover):
    marks, out, k = marks_for(secret), [], 0
    for c in cover:
        if c.isalpha():
            is_b = k < len(marks) and marks[k] == "1"
            out.append(c.upper() if is_b else c.lower())
            k += 1
        else:
            out.append(c)
    return "".join(out)

def reveal(text, count):
    marks = "".join("1" if c.isupper() else "0" for c in text if c.isalpha())
    return "".join(ALPHA[int(marks[5 * i:5 * i + 5], 2)] for i in range(count))

cover = "the cipher is in the type, says the reader, if you look for it"
hidden = hide("FLEE", cover)
print(hidden)
print(reveal(hidden, 4))

# Now the reader's side. Take the first 25 letters of any text and decide
# which ones count as "b". Whatever word you want, some choice spells it.
text = "to be or not to be that is the question"
letters = [c for c in text if c.isalpha()]
for wanted in ("BACON", "NOTSO"):
    picks = [i + 1 for i, m in enumerate(marks_for(wanted)) if m == "1"]
    print(wanted, "- call letters", picks, "of", "".join(letters[:25]), "'b'")
```

Output:

```
thE cIpHeR is iN the tYpe, says the reader, if you look for it
FLEE
BACON - call letters [5, 14, 17, 18, 20, 22, 23] of tobeornottobethatistheque 'b'
NOTSO - call letters [2, 3, 7, 8, 10, 11, 14, 16, 20, 22, 23, 25] of tobeornottobethatistheque 'b'
```

That second part is the case against the Baconian claims in six lines. A hidden message needs a check built in: any reader who knows the rule must get the same text. The Baconian reader had to decide by eye, from worn Elizabethan type, which of two forms a letter had, and when the reader is free to decide, the message is whatever he hopes to find.

The reader was Elizabeth Wells Gallup, born in 1848, a Michigan school principal who had assisted a Detroit physician, Orville Ward Owen, in his search for a "word cipher" in Bacon's and Shakespeare's works. She broke with him and took up the biliteral cipher, which she said she saw in the italic type of the 1623 First Folio and other Elizabethan books. From 1899 she published the results in *The Biliteral Cypher of Sir Francis Bacon*: Bacon was the son of Queen Elizabeth, the true author of Shakespeare's plays and of Marlowe's and Spenser's, and had reasons to hide. George Fabyan took up her work by about 1912 (the date varies) and brought her, with her sister Kate Wells, to Riverbank, where he paid them to continue and built a team with a library and photographic equipment to enlarge the type, and no way of checking what it found.

In 1916, the Friedmans later wrote, Fabyan went to law. He sued the film producer William Selig, who meant to treat the theory with scorn, and in a Chicago court Judge Richard Tuthill ruled that Francis Bacon was the author of the plays and awarded Fabyan \$5,000. A court can say what it likes, and the plays are the same. I know the story as the Friedmans told it, and give it with that caution.

### The two who found each other

Two young people came to Riverbank because of Fabyan's wish for proof. William Friedman was born Wolfe Friedman on 24 September 1891 in Kishinev, then in the Russian Empire (today Chișinău, Moldova), and reached Pittsburgh with his family the next year. A genetics student at Cornell, he was hired by Fabyan in 1915 to head a genetics department, and was asked to photograph Gallup's material. A skeptic by temperament, he soon saw, the Friedmans' accounts say, that there was nothing in it, and Fabyan did not want to be told so.

Elizebeth Smith, born on 26 August 1892 in Huntington, Indiana, the youngest of nine children of a Quaker family, had studied English literature at Hillsdale College in Michigan. Her mother chose the unusual spelling of her first name, and she kept it and corrected anyone who changed it. In 1916 she was in Chicago, hoping to find something in the Newberry Library's Shakespeare folios that others had missed. A librarian who knew Fabyan sent her to Geneva, and he hired her at once. She was twenty-three.

They married on 21 May 1917. When the United States declared war in April it had no school of codebreaking and no trained officer. Fabyan offered Riverbank to the government, and the cipher department began to teach Army officers and to work on messages for the Justice Department, the Army and the Navy. William was the main teacher and writer; Elizebeth worked on the ciphers and helped. The American army's first lessons in modern codebreaking were given by two young people hired to prove that Francis Bacon wrote Hamlet. Fabyan printed the lessons. The Riverbank Publications, 1917 to the early 1920s, written mostly by William, deal with reconstructing the alphabets of polyalphabetic ciphers, running-key ciphers, transposition and machine ciphers, and were reprinted for decades; I call them the Riverbank classics. The best known, Number 22, *The Index of Coincidence and Its Applications in Cryptography* (1922), is the subject of §11.10.

William was commissioned in 1917 and served in France with the American Expeditionary Forces, in the codebreaking section at Chaumont. He came home in 1919, and in 1921 the Signal Corps offered him a post in Washington as its chief cryptanalyst, and the couple moved. Fabyan died in 1936; by then his cipher department was long closed.

The Friedmans did not forget the sisters. In 1957 they published *The Shakespearean Ciphers Examined* (Cambridge University Press), which took each claim of a cipher in Shakespeare's works and tested it by the rule above: could a second reader, given only the rule, find the same message? The Baconian ciphers failed, and so did the others, which proved Marlowe, or the Earl of Oxford, or the Earl of Derby. It is a model of what cryptanalysis can do besides war: say that something is not there.

!!! note "Life story: Riverbank Laboratories"
    **Born:** 1912-1916, Geneva, Illinois (Colonel George Fabyan's estate; the cipher department began around 1912-1915 with Elizabeth Wells Gallup and the genetics department with William Friedman in 1915) · **Purpose:** first, to prove that Bacon wrote Shakespeare; in the war, to teach the Army cryptanalysis · **Helped:** the first American cryptanalysts, the Riverbank Publications, the Friedmans' careers · **Retired:** after the war and Fabyan's death in 1936; the acoustical laboratory continued

!!! note "Life story: Elizebeth Smith Friedman"
    **Born:** 26 August 1892, Huntington, Indiana; died 31 October 1980 · **Purpose:** hired in 1916 to look for ciphers in Shakespeare, became a codebreaker at Riverbank (1916-1920s) and then for the Coast Guard and the Treasury · **Helped:** trained Army officers in 1917, broke the ciphers of rum-runners and smugglers from the 1920s, led the Coast Guard's cryptanalytic unit; in the Second World War ran a Coast Guard and Navy unit against German spy rings in South America (chapter 14) · **Status:** for decades known as William's wife; her own work was told in full only after her death, most of all in Jason Fagone's biography of 2017

!!! note "Life story: William F. Friedman"
    **Born:** 24 September 1891, Kishinev; died 12 November 1969 · **Purpose:** a geneticist who became the United States' chief cryptanalyst (Riverbank 1915-1920, the Signal Corps from 1921) · **Helped:** the index of coincidence (1920), the Riverbank Publications, the Army's Signal Intelligence Service (1930), the break of the Japanese Purple machine (1940) · **Status:** called the father of American cryptology; the NSA keeps the Friedman collection

### In the real world

What the sources show: the Gallups' books and the Friedmans' reply of 1957 are in print; Riverbank survives as a place (the Fabyan Villa and the Japanese garden are a public preserve); the Friedman papers are at the George C. Marshall Foundation in Lexington, Virginia. What they do not show: exactly when the cipher department began (accounts say 1912 to 1915), its size, and how far Fabyan believed or enjoyed the argument. The Friedmans' own accounts, written decades later, are the main witnesses for what was said in his study.

## 11.7 Vernam, Mauborgne and the cipher that cannot be broken

*Level: intermediate.*

### A cipher for machines

By 1917 AT&T's teleprinters, which typed a message on a roll of paper at the far end of a line, were beginning to replace the Morse key, and some customers did not want the clerks of the telegraph company to read what they sent. A teleprinter does not send letters but **Baudot characters**: five pulses, each on or off, for each letter. The message could be punched on a paper tape as five rows of holes, and the machine read the tape.

Gilbert Sandford Vernam, an AT&T engineer (1890 to 1960), saw in 1917 that the machine could encipher as it sent. Take a second paper tape, the **key tape**, punched with a pattern of holes, and read the two tapes together, pulse by pulse. Where they agree, send "off"; where they differ, send "on". That rule is **exclusive or**, XOR, and doing it twice with the same key tape gives back the message. The sending machine enciphers as fast as the line carries, the receiving machine deciphers as fast, and no clerk reads anything. Figure 11.4 shows it. Vernam's patent (US 1,310,719) was granted on 22 July 1919.

<figure class="mars-fig">
<svg viewBox="0 0 640 270" width="640" role="img" aria-label="Vernam's machine: a message tape and a key tape are combined by XOR to give a cipher tape; the receiver does the same with a copy of the key tape" fill="currentColor" font-size="14">
<text x="20" y="22" font-size="13" font-weight="bold">Sender</text>
<rect x="20" y="36" width="120" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80" y="54" text-anchor="middle" font-size="13">message tape</text>
<text x="80" y="72" text-anchor="middle" font-size="12" style="font-family:var(--md-code-font-family,monospace)">0 1 1 0 1</text>
<rect x="20" y="110" width="120" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="80" y="128" text-anchor="middle" font-size="13">key tape</text>
<text x="80" y="146" text-anchor="middle" font-size="12" style="font-family:var(--md-code-font-family,monospace)">1 1 0 0 1</text>
<circle cx="230" cy="95" r="26" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="230" y="101" text-anchor="middle" font-size="16">⊕</text>
<line x1="140" y1="58" x2="212" y2="85" stroke="currentColor" stroke-width="1.3"/>
<line x1="140" y1="132" x2="212" y2="106" stroke="currentColor" stroke-width="1.3"/>
<line x1="256" y1="95" x2="330" y2="95" stroke="currentColor" stroke-width="1.3"/>
<polygon points="330,95 322,91 322,99" fill="currentColor"/>
<rect x="330" y="73" width="120" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="91" text-anchor="middle" font-size="13">cipher tape</text>
<text x="390" y="109" text-anchor="middle" font-size="12" style="font-family:var(--md-code-font-family,monospace)">1 0 1 0 0</text>
<line x1="450" y1="95" x2="500" y2="95" stroke="currentColor" stroke-width="1.3"/>
<text x="475" y="86" text-anchor="middle" font-size="11">wire</text>
<text x="20" y="196" font-size="13" font-weight="bold">Receiver</text>
<rect x="500" y="73" width="120" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="560" y="91" text-anchor="middle" font-size="13">cipher tape</text>
<text x="560" y="109" text-anchor="middle" font-size="12" style="font-family:var(--md-code-font-family,monospace)">1 0 1 0 0</text>
<rect x="330" y="180" width="120" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="198" text-anchor="middle" font-size="13">key tape (copy)</text>
<text x="390" y="216" text-anchor="middle" font-size="12" style="font-family:var(--md-code-font-family,monospace)">1 1 0 0 1</text>
<circle cx="230" cy="202" r="26" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="230" y="208" text-anchor="middle" font-size="16">⊕</text>
<line x1="330" y1="202" x2="256" y2="202" stroke="currentColor" stroke-width="1.3"/>
<line x1="560" y1="117" x2="560" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="560" y1="160" x2="230" y2="160" stroke="currentColor" stroke-width="1.3"/>
<line x1="230" y1="160" x2="230" y2="176" stroke="currentColor" stroke-width="1.3"/>
<line x1="204" y1="202" x2="150" y2="202" stroke="currentColor" stroke-width="1.3"/>
<polygon points="150,202 158,198 158,206" fill="currentColor"/>
<rect x="20" y="180" width="130" height="44" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="85" y="198" text-anchor="middle" font-size="13">message again</text>
<text x="85" y="216" text-anchor="middle" font-size="12" style="font-family:var(--md-code-font-family,monospace)">0 1 1 0 1</text>
<text x="20" y="256" font-size="12">Same rule both ways: off if the pulses agree, on if they differ.</text>
</svg>
<figcaption>Figure 11.4. Vernam's teleprinter cipher, one Baudot character. The key tape is read with the message tape, pulse by pulse; the receiver does the same thing with a copy of the key tape and the message comes back.</figcaption>
</figure>

### The tape that repeats, and the tape that does not

The first key tape was short and glued into a loop, so that it repeated. The tests were made with the Army Signal Corps in 1918, where Captain (later Major General) Joseph Mauborgne led research. A repeating key tape is a repeating-key cipher, and chapter 10 told what happens to those. A colleague of Vernam's, Lyman Morehouse, suggested two loops of different lengths, 999 and 1,000 characters, giving a key almost a million characters long before it repeated. It was still a pattern.

The decisive step was to make the key tape random, as long as the message and never used again. Who took it is disputed. Kahn credits Mauborgne, who saw that a random, non-repeating key gives a cipher no method can solve, and insisted on it. Steven Bellovin, studying the patents and papers, argued in 2016 that Vernam already understood the need for a key that did not repeat. I do not see the evidence settling it. The cipher is the Vernam cipher when the key tape is any key, and the **one-time pad** or tape when the key is random and used once.

The idea has a forerunner. In 2011 Bellovin found an 1882 telegraph code book by Frank Miller, a banker in Sacramento, California, which describes adding to each code number a number from a list of random numbers, each used once and crossed out. That is a one-time pad, thirty-five years before Vernam. Bellovin found no proof that Vernam or Mauborgne knew of it. The pad was invented once without being used, and then again.

### Why it cannot be broken

If the key is random and as long as the message, then for any ciphertext and any message of the same length exactly one key would turn one into the other, and every key is as likely as any other. The ciphertext tells the listener nothing about the message except its length. [Book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) proves it; C. E. Shannon gave the first formal proof in a secret report of 1945, published in 1949, and showed that no cipher with a shorter key can match it (chapter 15 tells that story).

The price is the key. Each message needs fresh random key material as long as itself, delivered ahead of time by a safe route to the other end and to no one else. That suits a diplomatic bag or a spy's pad and no army of a million men. And the whole security rests on one rule that must be obeyed every time: **never use the key twice.**

### The German Foreign Office

The first government to use one-time pads for diplomatic traffic was, by Kahn's account, Germany's. Room 40 had read its telegrams, and the Foreign Office's cipher bureau knew it. Three of its cryptographers, Werner Kunze, Rudolf Schauffler and Erich Langlotz, understood that a key that did not repeat could not be solved by Kasiski's method or any other, and about 1921 (Kahn's date) the Foreign Office began to issue pads of numbers, each sheet used once and destroyed. It was a code with a pad added: a code book turned words into numbers, and pad numbers were added digit by digit without carrying, like the Chinese telegraph code of chapter 10 with a key as long as the message.

It worked, so far as the sources say, for a long time. The old page I started from says some of it was broken later, but I have found no source that says how. The ways a pad system fails are well known: a pad used twice, a pad that is not random, a pad that is stolen, and a code book underneath that gives the enemy words to guess. The weak point of the one-time pad has never been the mathematics but the pad. The best-known failure, the Soviet pads printed twice in 1942 and read in the Venona project, belongs to [chapter 14](14-The-Rest-of-the-War.md); the method is in [Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md#310-venona-the-one-time-pad-used-twice).

### Code it: the pad, and the reuse

This program uses Vernam's arithmetic: letters as numbers from 0 to 25 (five bits), combined by XOR. It encrypts two messages with the same tape, then does what an eavesdropper does: combines the two ciphertexts, so the tape drops out, and guesses a word in the first message to read the second.

```python
# Vernam's idea on 5-bit teleprinter characters: A=0 ... Z=25, combined by XOR.
import random

def to5(text):
    return [ord(c) - 65 for c in text]

def from5(nums):
    return "".join(chr(n + 65) if n < 26 else "?" for n in nums)

def vernam(text_nums, key_nums):
    return [t ^ k for t, k in zip(text_nums, key_nums)]

random.seed(1917)
pad = [random.randrange(32) for _ in range(40)]       # a stand-in for a real random tape

m1 = to5("ATTACKATDAWNONTHEEASTBANK")
m2 = to5("SENDMOREAMMUNITIONTONIGHT")
c1 = vernam(m1, pad)
c2 = vernam(m2, pad)                                  # the mistake: the same tape twice
print(c1[:8], "...")
print(from5(vernam(c1, pad)))                         # the right key undoes it

# An eavesdropper XORs the two ciphertexts. The tape cancels out.
mix = vernam(c1, c2)
print(mix == vernam(m1, m2))
# Guess a word in message 1, and message 2 shows through at the same place.
for guess, pos in (("ATTACK", 0), ("BANK", 21), ("THE", 12)):
    seen = from5(vernam(mix[pos:pos + len(guess)], to5(guess)))
    print(guess, "at", pos, "->", seen)
```

Output:

```
[14, 23, 26, 10, 3, 3, 7, 21] ...
ATTACKATDAWNONTHEEASTBANK
True
ATTACK at 0 -> SENDMO
BANK at 21 -> IGHT
THE at 12 -> QCE
```

The eavesdropper never sees the tape, only $c_1 \oplus c_2 = m_1 \oplus m_2$, and a right guess shows itself at once: ATTACK at the start reads SENDMO, and BANK at position 21 reads IGHT. A wrong guess gives nonsense (QCE). In real traffic the guesses are the stereotyped phrases of the trade, and the eavesdropper extends one word into the next until both messages are read. [Cryptanalysis, chapter 3](../cryptanalysis/03-Machines-and-the-War.md) does it at scale, and [book 1, chapter 4](../../book/04-Randomness-and-Perfect-Secrecy.md) calls it crib dragging.

!!! note "Life story: the one-time pad"
    **Born:** 1917-1919, AT&T and the US Army Signal Corps (Gilbert Vernam, Joseph Mauborgne), with a forerunner in Frank Miller's code book of 1882 and an independent German invention about 1921 (Kunze, Schauffler, Langlotz) · **Purpose:** a cipher that cannot be solved, because the key is random, as long as the message and used once · **Helped:** German diplomatic traffic from the 1920s, spies and diplomats of every power in the twentieth century; proved perfect by Shannon in 1945 (published 1949) · **Status:** still in use for a few of the most secret messages; every break of a pad traffic since has come from reuse, a poor random source, or a stolen pad

!!! note "Life story: Gilbert Vernam"
    **Born:** 1890; died 1960 · **Purpose:** an AT&T engineer who made the teleprinter cipher of 1917 (US patent 1,310,719, granted 22 July 1919) · **Helped:** the idea that encryption could be a machine's job, and the one-time tape · **Status:** remembered in the name of the Vernam cipher, the XOR stream cipher, in every cipher text book

### Hebern and the early rotor patents

At the same moment another American was making a key that does not repeat for a long time with a wheel instead of a tape. Edward Hebern, a Californian, wired a typewriter's keys through a rotating disk of contacts, so that each letter met a different substitution as the disk turned. He took out patents from about 1917 to 1921, opened Hebern Electric Code in Oakland in 1921, and sold a few machines to the Navy; the company failed in the mid-1920s, and William Friedman found that the first design could be solved. The idea was patented independently in the Netherlands, Sweden and Germany between 1915 and 1919, and one of the German inventors, Arthur Scherbius, called his machine Enigma. [Chapter 12](12-Rotors-and-Enigma.md) tells that story, and I stop here.

## 11.8 Yardley and the American Black Chamber

*Level: beginner.*

### A telegraph clerk with a poker face

Herbert Osborne Yardley was born in Worthington, Indiana, on 13 April 1889, the son of a railway telegrapher. At twenty-three he was a code clerk in the State Department, with a habit of working out how the codes he handled were built. In 1912 he is said to have solved the code the Department used for its cables with President Wilson's confidant, Colonel Edward House, and to have written a long paper showing that American diplomatic codes could be read by a clerk with a pencil. Nobody paid much attention.

The war gave him his chance. When the United States entered it in April 1917 the Army had no cipher bureau. Yardley, twenty-eight, got himself commissioned as a captain and set up a section of Military Intelligence called MI-8, which within a year grew from a few people to over a hundred and sixty. Its leading cryptographers were not soldiers. John Matthews Manly, a University of Chicago professor of English and Chaucer scholar, led its codebreaking, and his colleague and later co-editor Edith Rickert was one of its best analysts. The record of Rickert's wartime work is thin, but her presence is firm. Many of the section's other staff were women recruited from the universities, as clerks and translators, whose work was little recorded.

### The Black Chamber

At the Armistice the Army and the State Department did not want to lose what MI-8 had built. In 1919 they agreed to fund a joint office, officially a private firm, in a New York brownstone, with Yardley in charge, for about \$100,000 a year shared between them. It was the Cipher Bureau; Yardley called it the Black Chamber, after the cabinets noirs of chapter 9. A staff of about twenty worked behind the cover of a commercial code company, and received copies of foreign governments' cables, which telegraph companies then handed over for the asking. Yardley's own figure, which others repeat, is more than 45,000 cryptograms from twenty countries in ten years. I have not seen that checked.

### The Washington Naval Conference

Its greatest achievement came early. From 12 November 1921 to 6 February 1922, delegations of the United States, Britain, Japan, France and Italy met in Washington to limit their battleships. Secretary of State Charles Evans Hughes proposed a ratio of fleet strength: the United States and Britain 5, Japan 3, France and Italy 1.75 each. Japan wanted 7, which was 70 percent of the American fleet, and its delegates, among them Admiral Katō Tomosaburō, argued for it.

The Black Chamber was reading Japan's diplomatic code. Messages from Tokyo to its delegation went by commercial cable, the American government had copies, and Yardley's cryptanalysts had solved the code earlier. As Yardley told it in 1931, and Kahn retold it, the instructions Tokyo sent on 28 November 1921 showed how far Japan would give way: it would accept the lower ratio in return for an agreement on fortifications in the Pacific. The American negotiators knew their opponents' bottom line and could stand firm. In December the Japanese gave in. The Five-Power Treaty of 6 February 1922 fixed the ratio at 5:5:3:1.75:1.75 for capital ships, and the powers agreed not to build new bases in the western Pacific.

Figure 11.5 puts the numbers in one picture.

<figure class="mars-fig">
<svg viewBox="0 0 640 240" width="640" role="img" aria-label="Bars comparing the proposed and agreed ratios of capital ship tonnage at the Washington Naval Conference" fill="currentColor" font-size="14">
<text x="20" y="22" font-size="13" font-weight="bold">Capital ships, Five-Power Treaty (6 Feb 1922). United States and Britain = 5.</text>
<text x="120" y="56" text-anchor="end">United States</text>
<rect x="130" y="40" width="250" height="22" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="56" font-size="13">5</text>
<text x="120" y="88" text-anchor="end">Britain</text>
<rect x="130" y="72" width="250" height="22" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="390" y="88" font-size="13">5</text>
<text x="120" y="120" text-anchor="end">Japan (agreed)</text>
<rect x="130" y="104" width="150" height="22" fill="currentColor" opacity="0.6"/>
<text x="290" y="120" font-size="13">3</text>
<text x="120" y="152" text-anchor="end">Japan (asked)</text>
<rect x="130" y="136" width="175" height="22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="5 4"/>
<text x="315" y="152" font-size="13">3.5</text>
<text x="120" y="184" text-anchor="end">France, Italy</text>
<rect x="130" y="168" width="87.5" height="22" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="227" y="184" font-size="13">1.75 each</text>
<text x="20" y="224" font-size="12">Japan wanted 70 percent of the American fleet and settled for 60 percent, with a pledge on Pacific bases.</text>
</svg>
<figcaption>Figure 11.5. The ratios of the Washington Naval Treaty. The American delegation, reading Tokyo's instructions, knew how far Japan would go before it said no.</figcaption>
</figure>

How much the telegrams changed the result is not clear. The Americans had good reasons to hold their ground without them, and Japan had reasons of its own to settle. Kahn thought the intercepts stiffened the American position, and Yardley said so in a book written for effect; later historians claim less. What can be said is that the American side knew its opponents' last position and that the treaty ended where Tokyo's instructions allowed.

!!! note "Life story: the Washington Naval Conference break"
    **Born:** 12 November 1921, Washington · **Purpose:** to read the instructions the Japanese Foreign Ministry sent its delegates, in a diplomatic code the Black Chamber had solved · **Helped:** the American negotiators, who knew that Japan would accept 60 percent of the American fleet in exchange for the Pacific fortifications · **Retired:** the treaty of 6 February 1922; Japan changed its codes in the years after, and the Black Chamber's work against Japan was told in Yardley's book of 1931

### The end

On 31 October 1929 it was shut. Henry Stimson, Secretary of State since March, was told of the New York office and refused to pay for it. His memoir, written with McGeorge Bundy (1948), says he thought it improper: "Gentlemen do not read each other's mail." The phrase is in print only from 1948, so I cannot say how he put it in 1929, though the sense is not in doubt. Nineteen years on, as Secretary of War, Stimson depended every day on reading enemy messages, and he is quoted as having changed his mind.

Yardley was out of work in the first year of the Depression. In 1931 he published *The American Black Chamber* (Bobbs-Merrill), a lively account of the Bureau with the text of Japanese telegrams and the details of how they were read. It sold well in the United States and was a sensation in Japan, where a translation is said to have sold 33,000 copies (I could not check the figure). Many say the book led Japan to improve its codes; Japan had its own reasons for moving to machines, and the effect is argued. The American government was angry. A second manuscript on Japanese diplomatic secrets was seized in 1933 and not released until the 1970s, and in 1933 Congress made it a crime to publish foreign diplomatic codes or messages obtained by reading them (from Kahn; I cannot give the act's number). Yardley later wrote on poker, worked as a codebreaker for the Chinese government in Chongqing in 1938 to 1940 (chapter 14), and died in 1958.

The closing of the Black Chamber did not end American codebreaking. The Army's work moved to the Signal Corps in Washington, where William Friedman had been working since 1921, and in 1930 it became the Signal Intelligence Service. The Navy had its own cipher section from the early 1920s. The 1930s are the subject of chapters 12 to 14.

!!! note "Life story: the American Black Chamber"
    **Born:** 1917 as MI-8 (Washington), 1919 as the Cipher Bureau in New York (Herbert Yardley, with John Manly and Edith Rickert in the war) · **Purpose:** to read the diplomatic codes of other governments for the State Department and the Army · **Helped:** the American side at the Washington Naval Conference, 1921-1922; it solved, by Yardley's count, tens of thousands of cryptograms of about twenty countries · **Retired:** closed 31 October 1929 by order of Secretary of State Stimson · **Replaced by:** the Army's Signal Intelligence Service (1930) and the Navy's cipher section

!!! note "Life story: Herbert O. Yardley"
    **Born:** 13 April 1889, Worthington, Indiana; died 7 August 1958 · **Purpose:** led the US Army's first cipher section (MI-8, 1917) and the Cipher Bureau in New York (1919-1929) · **Helped:** showed that the United States needed a permanent codebreaking office, and told the public what one did; his book of 1931 is the first full account by a practitioner · **Status:** criticized for revealing secrets and for the uneven quality of his work, praised for founding the American tradition

## 11.9 Elizebeth Friedman and the rum-runners

*Level: beginner.*

### The war off the coast

The Eighteenth Amendment came into force on 17 January 1920, and until its repeal on 5 December 1933 it was illegal in the United States to make, sell or carry alcoholic drink. Buying it outside American waters was not illegal, and a trade grew up to bring it in. Ships loaded with whisky in Canada, the Caribbean and Europe anchored beyond the three-mile limit, a line of them off New York and New England called Rum Row, and fast launches ran the cases ashore at night. Behind them stood companies with owners, bankers and agents ashore, who ran the trade by radio: where to stand off, when, which beach, and where the Coast Guard's cutters were that week.

The Coast Guard, then part of the Treasury Department, had to stop them, with a few old cutters against an enemy who could change his plans by the hour. In 1924 it received twenty old Navy destroyers and a flotilla of fast patrol boats, and it began to listen. Its operators copied the rum-runners' messages. They were in code, and the Coast Guard had no one who could read them.

### A freelance codebreaker

By the middle of the 1920s Elizebeth Friedman was in Washington, where her husband had been the Signal Corps's chief cryptanalyst since 1921. She had two young children and did codebreaking on contract for the Navy and other offices. The sources I have differ on when she began with the Coast Guard: 1925 for her first cases and 1927 for a formal post are the dates I have. What is not in doubt is the first thing she did. She asked for the messages in bulk.

Her method was Room 40's and Riverbank's. Sort the messages by station, call sign and date. Look for the code groups that repeat, especially those that stand at the start of every message from one station, and for the groups that must be names, places or numbers. Match the traffic to what is known from outside: the Coast Guard knew when its own cutters had been on patrol, so a message sent that night was likely to hold the group for a cutter. Build the code book a page at a time. Room 40 sometimes had the book. Elizebeth never did.

The rum-runners' codes were not simple. They used commercial codebooks of the kind described in chapter 10, with the words rearranged, sometimes with a cipher on top, and as the Coast Guard read more the rings changed systems more often, so she had to solve one set and, weeks later, another. By the early 1930s the work had outgrown one person. The Coast Guard formed a small cryptanalytic unit, in 1930 by the accounts I have, with Elizebeth at its head, a handful of staff and intercept stations along the coast sending their copies to it. Her staff's names are in Fagone's book and her papers, and I will not guess at them.

### The I'm Alone

The *I'm Alone* was a Canadian schooner of about ninety tons, registered in Lunenburg, Nova Scotia, and commanded by a Newfoundland captain, John Thomas "Jack" Randell. She carried liquor to the Louisiana coast. On 20 March 1929 the Coast Guard cutter *Wolcott* sighted her about ten and a half miles from shore, outside the three-mile limit but within the distance a treaty of 1924 between the United States and Britain allowed a vessel to be pursued, if pursuit began at once. Randell refused to heave to. The chase ran two days and some two hundred miles into the Gulf of Mexico. On 22 March a second cutter, the *Dexter*, came up and sank her with gunfire. One crew member, Leon Mainguy, a French sailor, was killed; the rest, including Randell, were taken to New Orleans.

It became an incident between the United States and Canada, by way of Britain, and went to arbitration under the treaty. Canada said that sinking a ship on the high seas was unlawful whatever she carried. The United States said that the pursuit began inside the treaty limit and that the ship was not really Canadian: she was an American-owned smuggler under a Canadian flag, and a ship whose true owners are American cannot claim a foreign government's protection as if Canadians owned her. To prove it the United States had to show who owned her, and that was a matter of codes.

Her unit had the radio traffic of the ring behind the *I'm Alone*, and among the messages were ones that told the ship's story: where the cargo was to land, who gave the orders and who paid. They showed the vessel to be owned and directed by Americans behind a Canadian front. Here I must be careful. The accounts I know agree that her decrypts were put in evidence for the American side and were the means of showing American control. They do not give me the hearing's details, the dates she appeared or the number of messages. Fagone's biography gives the fullest account and I follow its sense, not its words.

The arbitrators were two senior jurists, Willis Van Devanter of the United States Supreme Court and Lyman Duff of the Supreme Court of Canada. They reported in 1933 (interim) and January 1935 (final). As I have it, they found the pursuit lawful, since the *Wolcott* had acted within the treaty, but the sinking not. The ship and cargo were in fact owned by Americans, so Canada could claim nothing for them. But the United States must apologize, pay \$25,000 to the Canadian government and compensate the captain and crew (about \$50,000, the sources differ). On ownership, the American case had been proved.

!!! note "Life story: the I'm Alone case"
    **Born:** 20-22 March 1929, the Gulf of Mexico (Canadian schooner *I'm Alone*, Captain Jack Randell; US Coast Guard cutters *Wolcott* and *Dexter*) · **Purpose:** a test of how far a state can pursue and sink a foreign-flagged smuggler on the high seas, and whose ship she really was · **Helped:** the United States and Canada to fix the law of hot pursuit; the Coast Guard to see what a code unit was worth · **Status:** settled by arbitration (interim report 1933, final January 1935): the sinking was unlawful, an apology and money were owed, but the owners were Americans and had no claim

### The Consolidated Exporters ring

The largest case with her name attached was that of the Consolidated Exporters Corporation, a syndicate in Vancouver, British Columbia, which bought liquor in Canada and Europe and shipped it by a fleet of freighters to the American West Coast, directed by radio from offices ashore. The orders were in code. Elizebeth's unit broke it and read thousands of the ring's messages (popular accounts say tens of thousands; I cannot confirm that). The decrypts gave the Treasury the ring's organization: the men who gave the orders, the ships and the money. The case against the principals went to court in the early 1930s, and the decrypts were its heart.

### The witness

A decrypt is not a fact that speaks for itself. A judge or jury cannot read a code; they must be told what the groups mean and why the codebreaker may say so, and a defense lawyer has every reason to attack it. The Treasury's cases put Elizebeth on the witness stand in what were among the first American trials to offer cryptanalysis as expert evidence. She had to explain to people who had never seen a code book how a message is solved: that a group appears at the start of every message from the same ring, that it must stand for the same thing, that the words around it fit, and that the solution rests on a check in hundreds of cases, not a guess. She used charts and blackboards, which Room 40 never had to. Defense lawyers argued she should not be heard as an expert, since there was no school of cryptanalysis; judges, as I have it, let her speak. Fagone says her evidence was one reason the rum-runners could not escape.

After repeal in 1933 the unit worked on other smugglers, notably of narcotics, and in 1941 it passed into the Navy's wartime organization, where it faced the German spy rings of South America ([chapter 14](14-The-Rest-of-the-War.md)). Her name was seldom in print. The Treasury preferred it so, and so did she, and the newspapers called her "Mrs. Friedman" and wrote more of her husband's work than of hers.

<figure class="mars-fig">
<svg viewBox="0 0 640 230" width="640" role="img" aria-label="From a rum-running ring's radio message to evidence in a courtroom" fill="currentColor" font-size="14">
<rect x="10" y="30" width="100" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="60" y="54" text-anchor="middle" font-size="13">Ring ashore</text>
<text x="60" y="72" text-anchor="middle" font-size="11">orders by radio</text>
<rect x="135" y="30" width="100" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="185" y="54" text-anchor="middle" font-size="13">Ship at sea</text>
<text x="185" y="72" text-anchor="middle" font-size="11">code groups</text>
<rect x="260" y="30" width="110" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="315" y="54" text-anchor="middle" font-size="13">Coast Guard</text>
<text x="315" y="72" text-anchor="middle" font-size="11">intercept stations</text>
<rect x="395" y="30" width="110" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="450" y="54" text-anchor="middle" font-size="13" font-weight="bold">Code unit</text>
<text x="450" y="72" text-anchor="middle" font-size="11">sort, compare, solve</text>
<rect x="530" y="30" width="100" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="580" y="54" text-anchor="middle" font-size="13">Courtroom</text>
<text x="580" y="72" text-anchor="middle" font-size="11">expert witness</text>
<line x1="110" y1="58" x2="135" y2="58" stroke="currentColor" stroke-width="1.3"/><polygon points="135,58 127,54 127,62" fill="currentColor"/>
<line x1="235" y1="58" x2="260" y2="58" stroke="currentColor" stroke-width="1.3"/><polygon points="260,58 252,54 252,62" fill="currentColor"/>
<line x1="370" y1="58" x2="395" y2="58" stroke="currentColor" stroke-width="1.3"/><polygon points="395,58 387,54 387,62" fill="currentColor"/>
<line x1="505" y1="58" x2="530" y2="58" stroke="currentColor" stroke-width="1.3"/><polygon points="530,58 522,54 522,62" fill="currentColor"/>
<text x="20" y="130" font-size="13" font-weight="bold">What the unit did with the same pile of messages</text>
<text x="20" y="154" font-size="13">1. sort by station, call sign and date</text>
<text x="20" y="174" font-size="13">2. find the groups that repeat, especially at the start of a message</text>
<text x="20" y="194" font-size="13">3. match the traffic with what the Coast Guard knew (patrols, seizures)</text>
<text x="20" y="214" font-size="13">4. write the code book page by page, then show a court that it fits hundreds of messages</text>
</svg>
<figcaption>Figure 11.6. The chain from a ring's radio message to evidence. The new link was the last: the codebreaker as a witness who had to be believed.</figcaption>
</figure>

!!! note "Life story: the Coast Guard's code unit"
    **Born:** 1925-1930, the Treasury Department's Coast Guard, Washington (Elizebeth Smith Friedman, first on contract and then as head; the year of its formal founding is given as 1930 in the accounts I have) · **Purpose:** to read the radio messages of the rum-running rings and give the Treasury evidence · **Helped:** the prosecutions of the Consolidated Exporters ring and others, and the American side in the *I'm Alone* arbitration · **Retired:** after repeal (1933) it turned to narcotics and smuggling; in 1941 it passed into the wartime Navy organization · **Replaced by:** the wartime units of chapter 14

### In the real world

What the sources show: her papers and her husband's (at the George C. Marshall Foundation), the Coast Guard's records, the arbitral report on the *I'm Alone*, and one full biography, Jason Fagone's *The Woman Who Smashed Codes* (2017). What they do not show, in what I have read, is a day-by-day account of the cases. The numbers of messages and convictions in popular accounts come from her recollections and the Coast Guard's publicity, and I treat them as approximate. That she was the first American to give cryptanalytic evidence in a federal court is a common claim; I would say among the first, since the earliest cases are not well recorded. For years her name was kept out of print by the people she worked for, and Kahn's *The Codebreakers* (1967) mentions her only in passing. The record has since been repaired.

## 11.10 William Friedman's index of coincidence

*Level: intermediate.*

While his wife read the rum-runners' codes, William Friedman was building the American school. At Riverbank in 1920 he had found a test, printed in 1922 as Riverbank Publication No. 22, that turned cryptanalysis from recognizing patterns into statistics. Pick two letters at random from a text; the chance they are the same letter is the **index of coincidence**,

$$\mathrm{IC} = \frac{\sum_x n_x(n_x-1)}{N(N-1)},$$

where $n_x$ is the number of times letter $x$ appears in a text of $N$ letters. For ordinary English the value is about 0.066; for letters chosen at random it is $1/26 \approx 0.0385$. A simple substitution leaves it unchanged, because it only renames letters. A polyalphabetic cipher such as Vigenère's mixes several alphabets and pulls the value toward the random one, and the more alphabets there are, the nearer it gets. So one number, with no repeats to look for, says whether a cipher text is monoalphabetic or polyalphabetic and roughly how many alphabets it uses, which was what Kasiski's method could do only when repeats happened to exist. The calculation, and the formula for the key length, are in [Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md#25-friedmans-index-of-coincidence), and [book 1, chapter 2](../../book/02-Classical-Ciphers.md) works the expected values.

The index is Friedman's best-known idea, and it is the tool you would turn on the machine ciphers of the next chapter. It also separates a random key from a non-random one, which is why Bellovin tied it, in 2016, to the story of the one-time pad. Friedman is usually credited with introducing the word *cryptanalysis*, and he wrote the Army's training texts: *Elements of Cryptanalysis* (1923) and the four-volume *Military Cryptanalysis* (1938 to 1941). When the Black Chamber closed in 1929 the Army had him, and in 1930 he started the Signal Intelligence Service with three junior cryptanalysts, Frank Rowlett, Abraham Sinkov and Solomon Kullback, picked from civil service lists of mathematicians. With others they broke the Japanese Purple machine ten years later ([chapter 14](14-The-Rest-of-the-War.md)).

## 11.11 Going deeper

*Level: expert.*

**Why a reused pad leaks, in numbers.** The eavesdropper sees $c_1 \oplus c_2 = m_1 \oplus m_2$. English text carries, by Shannon's estimates, roughly 1 bit of information per letter once redundancy is counted (his 1951 figures run from about 0.6 to 1.3). Two messages together have about 2 bits of freedom per position, while the sum constrains each position by up to 5 bits. The constraint beats the freedom by a wide margin, so with enough text the pair is determined, and the only difficulty is finding it quickly. That is why a guessed word is enough to start: it is a small search in a nearly empty space. A reused pad is not slightly weaker than a one-time pad. It has none of its security.

**Credit for the pad.** The attribution among Miller (1882), Vernam (1917 to 1919), Mauborgne (1918 or 1919) and the German cryptographers (about 1921) turns on documents: Miller's book, Vernam's patent and his 1926 paper in the *Journal of the American Institute of Electrical Engineers*, Mauborgne's recollections as given to Kahn, and the Signal Corps's test records. Bellovin reads them as showing that Vernam had the non-repeating key and that Mauborgne saw what it meant for security. The disagreement is about who understood the security argument, and no document before Shannon proves it; the early papers assert that the tape cannot be solved.

**The key space of ADFGVX and what Painvin avoided.** The square is one of $36!$ arrangements ($2^{138}$) and a $k$-column transposition key one of $k!$ ($2^{12.3}$ for $k=7$), so the key space is about $2^{150}$. A search is impossible, but the design has a known weakness: one transposition. Once the column lengths of several messages in one key are known, the transposition can be undone, leaving a substitution on pairs. A modern attacker climbs the transposition with a score for how much the result looks like a 36-symbol substitution ([Cryptanalysis, chapter 2](../cryptanalysis/02-Breaking-Classical-Ciphers.md)), and it takes seconds. What was extraordinary in 1918 was to do it by hand, in days. Painvin's exact path is known only from his own account and from Kahn.

**The Zimmermann telegram and its sources.** Boghardt's study rests on British, German and American archives and puts the British in a less heroic light than Tuchman did. What remains unknown is who "Mr H" was and how he got the copy, and whether the Germans ever suspected their code. How much the telegram moved Congress is a question for political historians.

**Who is left out.** The women of this chapter are named where the evidence names them: Elizabeth Wells Gallup and Kate Wells, who spent their lives on a claim that could not be tested; Edith Rickert in the Army's first cipher section; Elizebeth Smith Friedman, who read the rum-runners and stood in the witness box. The women who worked as clerks and analysts in Room 40, the Bureau du Chiffre and MI-8 are mostly nameless. That is a fact about the sources: the staff lists, honors and books were written by the men they promoted.

**Open questions.** How the German Foreign Office's pads were made, and why some were broken. How many Native nations supplied code talkers in 1918. What exactly the Tokyo telegrams of 28 November 1921 said. What the *I'm Alone* hearings contained.

## Check yourself

??? question "1. Why did radio make codebreaking a large organized business in a way the telegraph had not?"
    A wire can be tapped only where someone can reach it, and a government can guard or cut it. Radio goes out in all directions and a fleet or army in the field has to use it, so thousands of intercepts a day needed listening stations, direction finders and offices to sort and break them (Room 40, the Bureau du Chiffre, MI-8).

??? question "2. Why did Admiral Hall not simply give the Zimmermann telegram to the Americans as soon as Room 40 had read it?"
    The version read in London was in code 0075, from the State Department's own cable. Showing it would tell Germany that 0075 was broken and tell the Americans that Britain read their cables. Hall waited for a second copy, in the older code 13040 that Bernstorff used from Washington to Mexico City, taken in Mexico, so he could say it had been stolen there.

??? question "3. Decipher AGX AXAD GGD with the square of Figure 11.3 and the key KEY."
    The 10 letters fall in 3 columns of 4, 3 and 3 (the first column is the longest). In alphabetical order the key letters are E, K, Y, so the groups are the columns for E (AGX), K (AXAD) and Y (GGD). Fill the rows: A A G, then X G G, then A X D, then D. Read by rows: AA GX GG AX DD. In the square, AA is N, GX is I, GG is G, AX is H and DD is T: NIGHT.

??? question "4. About how many keys does ADFGVX have with a 7-letter transposition key, and why does that not make it unbreakable?"
    $36! \times 7! \approx 2^{138.1} \times 2^{12.3} \approx 2^{150}$. No one searches that. The cipher falls because of structure: with several messages in one day's key, the lengths of the columns can be found and the transposition undone, which leaves a substitution of pairs that frequency counts solve.

??? question "5. Why is the Choctaw telephone code not a cipher, and what is the weakness that follows?"
    It is a language with some invented words, not a method with a key. Nobody can learn it in an hour, so it holds while the enemy has no speaker, but it cannot be changed (there is no key to change), and one German who knew Choctaw would have had every message.

??? question "6. In the Bacon program, how many letters of cover text do you need to hide a 12-letter message, and what is the flaw that the Friedmans found in the claims about Shakespeare?"
    Five marks per letter, so 60 letters. The flaw is on the reader's side: a cipher must give the same text to every reader who follows the rule. The Baconian readers had to judge by eye which of two shapes a worn letter had, and with that freedom any message can be found in any text, as the second half of the program shows.

??? question "7. A teleprinter letter H is the number 7 (00111 in binary). It is enciphered with key number 12 (01100). What is the cipher number and letter? Two ciphertexts made with the same key give 11 and 5 at one position. If the first plain letter is H, what is the second?"
    $7 \oplus 12 = 11$, which is L. For the second part, $11 \oplus 5 = 14$ is $m_1 \oplus m_2$; with $m_1 = 7$, $m_2 = 14 \oplus 7 = 9$, which is J. (The key at that position was $11 \oplus 7 = 12$, and $5 \oplus 12 = 9$ agrees.)

??? question "8. Why did the closing of the Black Chamber in 1929 not end American codebreaking, and what is uncertain about Stimson's famous sentence?"
    The Army's work was in the Signal Corps by then, where William Friedman had been since 1921, and in 1930 it became the Signal Intelligence Service; the Navy had its own section. The sentence "Gentlemen do not read each other's mail" is known from Stimson's memoir of 1948, so we cannot be sure of his wording in 1929.

??? question "9. A court is shown a list of decoded messages from a rum-running ring. Why is that not enough, and who has to supply the rest?"
    A judge and jury cannot read the code, and the defense can say the decoding is a guess. The codebreaker must appear as an expert witness and show how the groups were solved and why the solution fits hundreds of messages, not one. That was Elizebeth Friedman's role.

??? question "10. Compute the index of coincidence of MISSISSIPPI. Is it more like English (0.066) or like random letters (0.0385)? Why is the value for so short a text not reliable?"
    The counts are M 1, I 4, S 4, P 2, so the numerator is $0 + 12 + 12 + 2 = 26$, and the denominator is $11 \times 10 = 110$, which gives 0.236. It is far above English, because the word uses so few distinct letters. With a text this short one repeated letter changes the answer a great deal, and the value of English (0.066) is an average over long texts.

## What you learned

- Radio put every message in the air, which is why the first large codebreaking offices were built in 1914 to 1918: Room 40 in London, the Bureau du Chiffre in Paris, MI-8 in Washington.
- Room 40 read the German navy from captured code books and the Zimmermann telegram of 16 January 1917 from the cable through London. Admiral Hall showed the Americans a second copy, taken in Mexico, to hide the first. The telegram was published on 1 March and confirmed by Zimmermann on 3 March; the United States declared war on 6 April. How much it changed the vote is argued.
- ADFGVX, a square followed by a keyed transposition, was a German field cipher of 1918. Georges Painvin broke it, and his solution of 2 June helped the French meet the attack at Compiègne.
- The Choctaw telephone squads of October 1918 used a language, not a cipher; it held as long as no German could speak it.
- At Riverbank the Gallup sisters sought a Baconian cipher in Shakespeare, and William Friedman and Elizebeth Smith became the founders of American codebreaking. Their 1957 book showed that the Baconian claims fail the test that a second reader following the rule must get the same message.
- Vernam's teleprinter cipher of 1917 became the one-time pad when the key was random, as long as the message and used once. Credit is shared among Vernam, Mauborgne and, earlier, Frank Miller; every real break of a pad has come from reuse or a poor source of randomness.
- Yardley's Black Chamber read Japan's instructions at the Washington Naval Conference of 1921 to 1922; Stimson closed it in 1929.
- Elizebeth Friedman and the Coast Guard's code unit read the rum-runners' radio, supplied evidence in the *I'm Alone* arbitration and the Consolidated Exporters prosecutions, and made the codebreaker a witness in court.
- William Friedman's index of coincidence (1920) turned letter statistics into a tool for measuring polyalphabetic ciphers.

**Next:** [Chapter 12](12-Rotors-and-Enigma.md), the machines that make a key that never quite repeats, and the Poles who solved the best of them.

## Further reading

- David Kahn, *The Codebreakers: The Comprehensive History of Secret Communication from Ancient Times to the Internet* (rev. ed., Scribner, 1996): Tannenberg, Room 40, Zimmermann, ADFGVX, Vernam and Mauborgne, the German one-time pad, Yardley and the Washington conference.
- Patrick Beesly, *Room 40: British Naval Intelligence 1914-1918* (Hamish Hamilton, 1982).
- Thomas Boghardt, *The Zimmermann Telegram: Intelligence, Diplomacy, and America's Entry into World War I* (Naval Institute Press, 2012); Barbara Tuchman, *The Zimmermann Telegram* (Viking, 1958).
- Herbert O. Yardley, *The American Black Chamber* (Bobbs-Merrill, 1931); Henry L. Stimson and McGeorge Bundy, *On Active Service in Peace and War* (Harper, 1948).
- Jason Fagone, *The Woman Who Smashed Codes: A True Story of Love, Spies, and the Unlikely Heroine Who Outwitted America's Enemies* (Dey Street, 2017): Riverbank, the rum-runners, the *I'm Alone*, the Consolidated Exporters case.
- William F. Friedman and Elizebeth S. Friedman, *The Shakespearean Ciphers Examined* (Cambridge University Press, 1957).
- William F. Friedman, *The Index of Coincidence and Its Applications in Cryptography*, Riverbank Publication 22 (1922); *Elements of Cryptanalysis* (1923); *Military Cryptanalysis* (1938 to 1941).
- Elizabeth Wells Gallup, *The Biliteral Cypher of Sir Francis Bacon* (Detroit, 1899 and later parts); Francis Bacon, *De Augmentis Scientiarum* (1623), book 6, chapter 1.
- Gilbert S. Vernam, "Secret Signaling System", US Patent 1,310,719 (1919); Vernam, "Cipher Printing Telegraph Systems for Secret Wire and Radio Telegraphic Communications", *Journal of the AIEE* 45 (1926), pp. 109 to 115.
- Steven M. Bellovin, "Frank Miller: Inventor of the One-Time Pad", *Cryptologia* 35, no. 3 (2011), pp. 203 to 222; Bellovin, "Vernam, Mauborgne, and Friedman: The One-Time Pad and the Index of Coincidence", in *The New Codebreakers* (Springer LNCS 9100, 2016).
- C. E. Shannon, "Communication Theory of Secrecy Systems", *Bell System Technical Journal* 28 (1949); "Prediction and Entropy of Printed English", *Bell System Technical Journal* 30 (1951).
- William C. Meadows, *The First Code Talkers: Native American Communicators in World War I* (University of Oklahoma Press, 2021).
- Arbitral report in the case of the *I'm Alone* (Canada v. United States), 1933 and 1935, reproduced in the *Reports of International Arbitral Awards*, volume 3.
- *Weaker sources behind particular statements:* my memory of Kahn, Fagone and Painvin's account for Painvin's method and the "radiogram of victory"; the stories of the *Hobart*, the *Magdeburg* and the trawler; Olive Roddam; the amounts in the *I'm Alone* award; the Consolidated Exporters numbers; the 33,000 copies of Yardley's book in Japan; the Tuthill ruling, as the Friedmans told it; the French honor of 1989. The web could not be reached while this chapter was written, so none of these was checked against a page.
